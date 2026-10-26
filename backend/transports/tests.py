from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Transport

User = get_user_model()

LIST_URL = "/api/transports/"


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


class TransportPermissionTests(TestCase):
    """Transports are read by everyone and written by admins with a PIN.

    The list has to be readable unsigned: an order offers the transports a
    customer can pick from, and that is not a privileged fact. Writing it is
    admin work, and a non-superuser admin has to name their PIN like on any
    other admin write.
    """

    def setUp(self):
        self.transport = Transport.objects.create(name="Sri Travels")
        self.url = f"{LIST_URL}{self.transport.id}/"
        self.client = APIClient()

    def test_the_list_is_readable_without_signing_in(self):
        resp = self.client.get(LIST_URL)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data[0]["name"], "Sri Travels")

    def test_the_active_list_is_readable_without_signing_in(self):
        resp = self.client.get(f"{LIST_URL}active/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_an_agent_cannot_create_one(self):
        agent = make_user("tagent", "AGENT")
        self.client.credentials(**auth_header(agent))
        resp = self.client.post(LIST_URL, {"name": "Other"}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(Transport.objects.count(), 1)

    def test_an_admin_without_a_pin_cannot_create_one(self):
        admin = make_user("tadmin", "ADMIN", pin="1234")
        self.client.credentials(**auth_header(admin))
        resp = self.client.post(LIST_URL, {"name": "Other"}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(Transport.objects.count(), 1)

    def test_an_admin_with_the_pin_creates_one(self):
        admin = make_user("tadmin2", "ADMIN", pin="1234")
        self.client.credentials(**auth_header(admin))
        resp = self.client.post(
            LIST_URL, {"name": "Other", "is_active": True, "pin": "1234"}, format="json"
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Transport.objects.count(), 2)

    def test_an_admin_with_the_pin_edits_one(self):
        admin = make_user("tadmin3", "ADMIN", pin="1234")
        self.client.credentials(**auth_header(admin))
        resp = self.client.patch(
            self.url, {"name": "Renamed", "pin": "1234"}, format="json"
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.transport.refresh_from_db()
        self.assertEqual(self.transport.name, "Renamed")

    def test_a_wrong_pin_is_refused(self):
        admin = make_user("tadmin4", "ADMIN", pin="1234")
        self.client.credentials(**auth_header(admin))
        resp = self.client.patch(
            self.url, {"name": "Renamed", "pin": "9999"}, format="json"
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        self.transport.refresh_from_db()
        self.assertEqual(self.transport.name, "Sri Travels")

    def test_an_admin_without_a_pin_cannot_delete_one(self):
        admin = make_user("tadmin5", "ADMIN", pin="1234")
        self.client.credentials(**auth_header(admin))
        resp = self.client.delete(self.url, {"pin": ""}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(Transport.objects.filter(pk=self.transport.pk).exists())

    def test_a_superuser_needs_no_pin(self):
        superuser = make_user("tsuper", "ADMIN", superuser=True)
        self.client.credentials(**auth_header(superuser))
        resp = self.client.post(LIST_URL, {"name": "Other"}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        resp = self.client.delete(self.url)
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Transport.objects.filter(pk=self.transport.pk).exists())
