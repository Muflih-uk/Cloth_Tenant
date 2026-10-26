from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Brand

User = get_user_model()

LIST_URL = "/api/business/"


def auth_header(user):
    refresh = RefreshToken.for_user(user)
    return {"HTTP_AUTHORIZATION": f"Bearer {refresh.access_token}"}


def make_user(username, role, pin=None, superuser=False):
    if superuser:
        user = User.objects.create_superuser(
            username=username, email=f"{username}@test.com", password="pass1234"
        )
    else:
        user = User.objects.create_user(
            username=username,
            email=f"{username}@test.com",
            password="pass1234",
            role=role,
        )
    if pin is not None:
        user.set_pin(pin)
        user.save()
    return user


class BrandPermissionTests(TestCase):
    """The company profile is shared paperwork, so writes are admin-only.

    An admin who is not a superuser has to send their PIN, matching every other
    admin write; superusers are exempt inside ``check_admin_pin``.
    """

    def setUp(self):
        self.brand = Brand.objects.create(name="XL Apparals")
        self.url = f"{LIST_URL}{self.brand.id}/"
        self.client = APIClient()

    def test_any_signed_in_user_can_read_the_profile(self):
        agent = make_user("brandreader", "AGENT")
        self.client.credentials(**auth_header(agent))
        resp = self.client.get(LIST_URL)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data[0]["name"], "XL Apparals")

    def test_agent_cannot_change_the_profile(self):
        agent = make_user("brandagent", "AGENT")
        self.client.credentials(**auth_header(agent))
        resp = self.client.patch(self.url, {"name": "Other"}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        self.brand.refresh_from_db()
        self.assertEqual(self.brand.name, "XL Apparals")

    def test_admin_without_pin_cannot_change_the_profile(self):
        admin = make_user("brandadmin", "ADMIN", pin="1234")
        self.client.credentials(**auth_header(admin))
        resp = self.client.patch(self.url, {"name": "Other"}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        self.brand.refresh_from_db()
        self.assertEqual(self.brand.name, "XL Apparals")

    def test_admin_with_the_right_pin_changes_the_profile(self):
        admin = make_user("brandadmin2", "ADMIN", pin="1234")
        self.client.credentials(**auth_header(admin))
        resp = self.client.patch(
            self.url, {"name": "Other", "pin": "1234"}, format="json"
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.brand.refresh_from_db()
        self.assertEqual(self.brand.name, "Other")

    def test_a_wrong_pin_is_refused(self):
        admin = make_user("brandadmin3", "ADMIN", pin="1234")
        self.client.credentials(**auth_header(admin))
        resp = self.client.patch(
            self.url, {"name": "Other", "pin": "9999"}, format="json"
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        self.brand.refresh_from_db()
        self.assertEqual(self.brand.name, "XL Apparals")

    def test_superuser_needs_no_pin(self):
        superuser = make_user("brandsuper", "ADMIN", superuser=True)
        self.client.credentials(**auth_header(superuser))
        resp = self.client.patch(self.url, {"name": "Renamed"}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.brand.refresh_from_db()
        self.assertEqual(self.brand.name, "Renamed")

    def test_the_profile_stays_a_singleton_on_create(self):
        superuser = make_user("brandsuper2", "ADMIN", superuser=True)
        self.client.credentials(**auth_header(superuser))
        resp = self.client.post(LIST_URL, {"name": "Second"}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(Brand.objects.count(), 1)
        self.brand.refresh_from_db()
        self.assertEqual(self.brand.name, "Second")

    def test_the_profile_cannot_be_deleted(self):
        superuser = make_user("brandsuper3", "ADMIN", superuser=True)
        self.client.credentials(**auth_header(superuser))
        resp = self.client.delete(self.url)
        self.assertEqual(resp.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        self.assertTrue(Brand.objects.filter(pk=self.brand.pk).exists())
