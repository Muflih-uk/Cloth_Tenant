from django.contrib.auth import get_user_model
from django.core import mail
from django.test import TestCase
from django.utils import timezone
from datetime import timedelta
import re

from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from .models import PinResetCode

User = get_user_model()

URL = "/api/auth/verify-pin/"


def get_auth_header(user):
    refresh = RefreshToken.for_user(user)
    return {"HTTP_AUTHORIZATION": f"Bearer {refresh.access_token}"}


def make_admin(username, pin=None):
    admin = User.objects.create_user(
        username=username,
        email=f"{username}@test.com",
        password="pass1234",
        role="ADMIN",
    )
    if pin is not None:
        admin.set_pin(pin)
        admin.save()
    return admin


class VerifyPinTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_correct_pin_returns_ok(self):
        admin = make_admin("vadmin", pin="1234")
        self.client.credentials(**get_auth_header(admin))
        resp = self.client.post(URL, {"pin": "1234"}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data.get("ok"))

    def test_wrong_pin_rejected(self):
        admin = make_admin("vadmin2", pin="1234")
        self.client.credentials(**get_auth_header(admin))
        resp = self.client.post(URL, {"pin": "9999"}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_missing_pin_rejected(self):
        admin = make_admin("vadmin3")
        self.client.credentials(**get_auth_header(admin))
        resp = self.client.post(URL, {}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_superuser_has_no_pin_shortcut(self):
        admin = User.objects.create_superuser(
            username="vsuper", email="vsuper@test.com", password="pass1234"
        )
        self.client.credentials(**get_auth_header(admin))
        resp = self.client.post(URL, {}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)


class ProfileEditTests(TestCase):
    """PATCH /api/auth/profile/ -- the pencil on the admin's avatar."""

    PROFILE_URL = "/api/auth/profile/"

    def setUp(self):
        self.client = APIClient()
        self.admin = make_admin("profileadmin")
        self.other = make_admin("profileother")
        self.client.credentials(**get_auth_header(self.admin))

    def test_updates_own_details(self):
        resp = self.client.patch(
            self.PROFILE_URL,
            {
                "username": "profileadmin",
                "email": "renamed@test.com",
                "display_name": "Muflih",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.admin.refresh_from_db()
        self.assertEqual(self.admin.display_name, "Muflih")
        self.assertEqual(self.admin.email, "renamed@test.com")
        self.assertEqual(resp.data["display_name"], "Muflih")

    def test_sending_your_own_username_and_email_is_not_a_clash(self):
        # The profile form always posts all three fields, so the uniqueness
        # checks have to ignore the row they are being applied to.
        resp = self.client.patch(
            self.PROFILE_URL,
            {
                "username": self.admin.username,
                "email": self.admin.email,
                "display_name": "Kept",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_email_already_taken_by_someone_else(self):
        resp = self.client.patch(
            self.PROFILE_URL, {"email": self.other.email}, format="json"
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", resp.data)

    def test_username_already_taken_by_someone_else(self):
        resp = self.client.patch(
            self.PROFILE_URL, {"username": self.other.username}, format="json"
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("username", resp.data)

    def test_invalid_email_is_rejected(self):
        resp = self.client.patch(
            self.PROFILE_URL, {"email": "not-an-email"}, format="json"
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cannot_reach_it_unauthenticated(self):
        client = APIClient()
        resp = client.patch(self.PROFILE_URL, {"display_name": "x"}, format="json")
        self.assertIn(
            resp.status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )


class PinManagementTests(TestCase):
    """Creating a first PIN, and changing one behind an emailed code."""

    PROFILE_URL = "/api/auth/profile/"
    CREATE_URL = "/api/auth/create-pin/"
    REQUEST_URL = "/api/auth/request-pin-code/"
    RESET_URL = "/api/auth/reset-pin/"

    def setUp(self):
        self.client = APIClient()
        self.admin = make_admin("pinadmin")
        self.client.credentials(**get_auth_header(self.admin))

    def _emailed_code(self):
        """The 6 digits the last email asked the admin to type in."""
        match = re.search(r"\b(\d{6})\b", mail.outbox[-1].body)
        self.assertIsNotNone(match, "the email should carry a 6-digit code")
        return match.group(1)

    def _give_pin(self, pin="482913"):
        self.admin.set_pin(pin)
        self.admin.save()

    # ── Telling the page what state the account is in ────────────────

    def test_profile_reports_that_no_pin_exists(self):
        resp = self.client.get(self.PROFILE_URL)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertFalse(resp.data["has_pin"])

    def test_profile_reports_a_pin_once_one_is_set(self):
        self._give_pin()
        resp = self.client.get(self.PROFILE_URL)
        self.assertTrue(resp.data["has_pin"])
        # The hash itself must not travel back to the browser.
        self.assertNotIn("pin", resp.data)

    # ── Creating the first one ───────────────────────────────────────

    def test_a_first_pin_can_be_created_here(self):
        resp = self.client.post(self.CREATE_URL, {"pin": "482913"}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data["has_pin"])
        self.admin.refresh_from_db()
        self.assertTrue(self.admin.check_pin("482913"))
        self.assertTrue(self.client.get(self.PROFILE_URL).data["has_pin"])

    def test_a_pin_must_be_six_digits(self):
        for bad in ("12345", "1234567", "abcdef", ""):
            resp = self.client.post(self.CREATE_URL, {"pin": bad}, format="json")
            self.assertEqual(
                resp.status_code, status.HTTP_400_BAD_REQUEST, f"accepted {bad!r}"
            )
        self.admin.refresh_from_db()
        self.assertEqual(self.admin.pin, "")

    def test_a_second_pin_cannot_be_created_out_of_thin_air(self):
        self._give_pin()
        resp = self.client.post(self.CREATE_URL, {"pin": "111222"}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.admin.refresh_from_db()
        self.assertTrue(self.admin.check_pin("482913"))

    # ── Changing one ─────────────────────────────────────────────────

    def test_requesting_a_code_emails_it_and_not_the_response(self):
        self._give_pin()
        resp = self.client.post(self.REQUEST_URL, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, [self.admin.email])
        code = self._emailed_code()
        self.assertNotIn(code, str(resp.data))

    def test_the_emailed_code_trades_for_a_new_pin(self):
        self._give_pin()
        self.client.post(self.REQUEST_URL, format="json")
        code = self._emailed_code()
        resp = self.client.post(
            self.RESET_URL, {"code": code, "pin": "555000"}, format="json"
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.admin.refresh_from_db()
        self.assertTrue(self.admin.check_pin("555000"))
        self.assertFalse(self.admin.check_pin("482913"))

    def test_a_code_can_only_be_used_once(self):
        self._give_pin()
        self.client.post(self.REQUEST_URL, format="json")
        code = self._emailed_code()
        self.client.post(self.RESET_URL, {"code": code, "pin": "555000"}, format="json")
        resp = self.client.post(
            self.RESET_URL, {"code": code, "pin": "777888"}, format="json"
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.admin.refresh_from_db()
        self.assertTrue(self.admin.check_pin("555000"))

    def test_a_wrong_code_is_refused_and_the_pin_survives(self):
        self._give_pin()
        resp = self.client.post(
            self.RESET_URL, {"code": "000000", "pin": "555000"}, format="json"
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.admin.refresh_from_db()
        self.assertTrue(self.admin.check_pin("482913"))

    def test_an_expired_code_is_refused(self):
        self._give_pin()
        PinResetCode.objects.create(
            user=self.admin,
            code="123456",
            expires_at=timezone.now() - timedelta(minutes=1),
        )
        resp = self.client.post(
            self.RESET_URL, {"code": "123456", "pin": "555000"}, format="json"
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.admin.refresh_from_db()
        self.assertTrue(self.admin.check_pin("482913"))

    def test_asking_again_retires_the_first_code(self):
        self._give_pin()
        self.client.post(self.REQUEST_URL, format="json")
        first = self._emailed_code()
        self.client.post(self.REQUEST_URL, format="json")
        second = self._emailed_code()
        self.assertNotEqual(first, second)
        resp = self.client.post(
            self.RESET_URL, {"code": first, "pin": "555000"}, format="json"
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_a_code_is_not_emailed_when_there_is_no_pin_to_change(self):
        resp = self.client.post(self.REQUEST_URL, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(len(mail.outbox), 0)

    # ── Who may do any of this ───────────────────────────────────────

    def test_an_agent_cannot_manage_a_pin(self):
        agent = User.objects.create_user(
            username="pinagent",
            email="pinagent@test.com",
            password="pass1234",
            role="AGENT",
        )
        client = APIClient()
        client.credentials(**get_auth_header(agent))
        for url in (self.CREATE_URL, self.REQUEST_URL, self.RESET_URL):
            resp = client.post(url, {"pin": "123456", "code": "123456"}, format="json")
            self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN, url)

    def test_these_endpoints_need_you_signed_in(self):
        client = APIClient()
        for url in (self.CREATE_URL, self.REQUEST_URL, self.RESET_URL):
            resp = client.post(url, {"pin": "123456", "code": "123456"}, format="json")
            self.assertIn(
                resp.status_code,
                (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
                url,
            )