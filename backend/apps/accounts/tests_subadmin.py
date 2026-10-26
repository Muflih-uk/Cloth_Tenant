from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from django.test import TestCase

from apps.accounts.models import SubAdminPermission
from apps.agents.models import Agent
from apps.customers.models import Customer
from apps.items.models import Fabric, FabricVariant
from apps.orders.models import Order, OrderItem

User = get_user_model()


def auth_header(user):
    refresh = RefreshToken.for_user(user)
    return {"HTTP_AUTHORIZATION": f"Bearer {refresh.access_token}"}


def make_admin(username="admin", pin="123456"):
    admin = User.objects.create_user(
        username=username,
        email=f"{username}@test.com",
        password="pass1234",
        role="ADMIN",
    )
    admin.set_pin(pin)
    admin.save()
    return admin


def make_subadmin(username="sub", flags=None, pin="654321"):
    subadmin = User.objects.create_user(
        username=username,
        email=f"{username}@test.com",
        password="pass1234",
        role="SUBADMIN",
    )
    SubAdminPermission.objects.create(user=subadmin, **(flags or {}))
    if pin:
        subadmin.set_pin(pin)
        subadmin.save()
    return subadmin


class SubAdminManagementTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = make_admin()
        self.client.credentials(**auth_header(self.admin))

    def test_admin_can_create_subadmin_with_flags_and_pin(self):
        response = self.client.post(
            "/api/admins/subadmins/",
            {
                "username": "viewer",
                "email": "viewer@test.com",
                "password": "pass1234",
                "pin": "112233",
                "display_name": "Viewer",
                "orders_view": True,
                "items_view": True,
                "agents_view": True,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["role"], "SUBADMIN")
        self.assertTrue(response.data["orders_view"])
        self.assertTrue(response.data["items_view"])
        self.assertTrue(response.data["agents_view"])
        self.assertFalse(response.data["orders_edit"])
        self.assertTrue(response.data["has_pin"])

        user = User.objects.get(username="viewer")
        self.assertEqual(user.role, "SUBADMIN")
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)
        self.assertTrue(user.check_pin("112233"))

    def test_edit_or_delete_requires_view(self):
        response = self.client.post(
            "/api/admins/subadmins/",
            {
                "username": "broken",
                "email": "broken@test.com",
                "password": "pass1234",
                "orders_edit": True,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("orders_view", response.data)

        response = self.client.post(
            "/api/admins/subadmins/",
            {
                "username": "broken-items",
                "email": "broken-items@test.com",
                "password": "pass1234",
                "items_delete": True,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("items_view", response.data)

    def test_admin_can_update_flags_and_pin(self):
        subadmin = make_subadmin(flags={"orders_view": True})
        response = self.client.patch(
            f"/api/admins/subadmins/{subadmin.id}/",
            {"orders_edit": True, "orders_delete": True, "pin": "999999"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["orders_edit"])
        subadmin.refresh_from_db()
        self.assertTrue(subadmin.check_pin("999999"))

    def test_delete_deactivates_the_account(self):
        subadmin = make_subadmin()
        response = self.client.delete(f"/api/admins/subadmins/{subadmin.id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        subadmin.refresh_from_db()
        self.assertFalse(subadmin.is_active)

    def test_subadmin_cannot_manage_subadmins(self):
        subadmin = make_subadmin(flags={"orders_view": True})
        self.client.credentials(**auth_header(subadmin))
        response = self.client.get("/api/admins/subadmins/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class SubAdminAuthTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_login_and_profile_return_effective_flags(self):
        subadmin = make_subadmin(
            flags={
                "orders_view": True,
                "orders_edit": True,
                "items_view": True,
                "agents_view": True,
            }
        )
        response = self.client.post(
            "/api/auth/login/",
            {"username": subadmin.username, "password": "pass1234"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["role"], "SUBADMIN")
        self.assertTrue(response.data["orders_view"])
        self.assertTrue(response.data["orders_edit"])
        self.assertFalse(response.data["orders_delete"])
        self.assertTrue(response.data["items_view"])
        self.assertFalse(response.data["items_edit"])

        self.client.credentials(**auth_header(subadmin))
        profile = self.client.get("/api/auth/profile/")
        self.assertEqual(profile.status_code, status.HTTP_200_OK)
        self.assertEqual(profile.data["role"], "SUBADMIN")
        self.assertTrue(profile.data["agents_view"])
        self.assertFalse(profile.data["items_delete"])

    def test_permission_change_applies_on_the_next_request(self):
        subadmin = make_subadmin(flags={"orders_view": True})
        self.client.credentials(**auth_header(subadmin))
        self.assertEqual(
            self.client.get("/api/orders/").status_code, status.HTTP_200_OK
        )

        profile = subadmin.subadmin_permission
        profile.orders_view = False
        profile.save()
        response = self.client.get("/api/orders/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_deactivation_applies_on_the_next_request(self):
        subadmin = make_subadmin(flags={"orders_view": True})
        self.client.credentials(**auth_header(subadmin))
        self.assertEqual(
            self.client.get("/api/auth/profile/").status_code, status.HTTP_200_OK
        )

        subadmin.is_active = False
        subadmin.save(update_fields=["is_active"])
        response = self.client.get("/api/auth/profile/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class SubAdminAreaAccessTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = make_admin()
        self.agent_user = User.objects.create_user(
            username="agent",
            email="agent@test.com",
            password="pass1234",
            role="AGENT",
        )
        self.agent = Agent.objects.create(user=self.agent_user, contact="111")
        self.customer = Customer.objects.create(
            name="Customer One", contact="222", agent=self.agent
        )
        self.order = Order.objects.create(
            customer=self.customer, agent=self.agent, status="PENDING"
        )
        self.fabric = Fabric.objects.create(name="Cotton", price_per_meter="100.00")
        self.variant = FabricVariant.objects.create(
            fabric=self.fabric, display_order="Red", stock_meters="10.000"
        )

    def test_orders_require_view_flag(self):
        subadmin = make_subadmin()
        self.client.credentials(**auth_header(subadmin))
        self.assertEqual(
            self.client.get("/api/orders/").status_code,
            status.HTTP_403_FORBIDDEN,
        )

        profile = subadmin.subadmin_permission
        profile.orders_view = True
        profile.save()
        response = self.client.get("/api/orders/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([row["id"] for row in response.data["results"]], [self.order.id])

    def test_view_only_cannot_edit_or_delete_orders(self):
        subadmin = make_subadmin(flags={"orders_view": True})
        self.client.credentials(**auth_header(subadmin))

        edit = self.client.patch(
            f"/api/orders/{self.order.id}/", {"notes": "nope"}, format="json"
        )
        self.assertEqual(edit.status_code, status.HTTP_403_FORBIDDEN)

        delete = self.client.delete(
            f"/api/orders/{self.order.id}/", {"pin": "654321"}, format="json"
        )
        self.assertEqual(delete.status_code, status.HTTP_403_FORBIDDEN)

    def test_delete_requires_the_subadmin_pin(self):
        subadmin = make_subadmin(
            flags={"orders_view": True, "orders_delete": True}
        )
        self.client.credentials(**auth_header(subadmin))

        no_pin = self.client.delete(f"/api/orders/{self.order.id}/")
        self.assertEqual(no_pin.status_code, status.HTTP_403_FORBIDDEN)

        wrong_pin = self.client.delete(
            f"/api/orders/{self.order.id}/", {"pin": "000000"}, format="json"
        )
        self.assertEqual(wrong_pin.status_code, status.HTTP_403_FORBIDDEN)

        ok = self.client.delete(
            f"/api/orders/{self.order.id}/", {"pin": "654321"}, format="json"
        )
        self.assertEqual(ok.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Order.objects.filter(id=self.order.id).exists())

    def test_subadmin_cannot_delete_order_lines(self):
        line = OrderItem.objects.create(
            order=self.order,
            fabric=self.fabric,
            variant=self.variant,
            fabric_name=self.fabric.name,
            rate_per_meter="100.00",
            ordered_quantity="1.000",
        )
        subadmin = make_subadmin(
            flags={"orders_view": True, "orders_edit": True}
        )
        self.client.credentials(**auth_header(subadmin))
        response = self.client.delete(
            f"/api/orders/{self.order.id}/delete-item/{line.id}/"
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("Sub-admins cannot delete order lines", response.data["error"])

    def test_items_require_view_and_write_flags(self):
        subadmin = make_subadmin()
        self.client.credentials(**auth_header(subadmin))
        self.assertEqual(
            self.client.get("/api/items/").status_code,
            status.HTTP_403_FORBIDDEN,
        )

        profile = subadmin.subadmin_permission
        profile.items_view = True
        profile.save()
        self.assertEqual(
            self.client.get("/api/items/").status_code, status.HTTP_200_OK
        )
        self.assertEqual(
            self.client.post(
                "/api/items/",
                {"name": "Blocked", "price_per_meter": "1.00"},
                format="json",
            ).status_code,
            status.HTTP_403_FORBIDDEN,
        )

        profile.items_edit = True
        profile.save()
        response = self.client.post(
            "/api/items/",
            {"name": "Allowed", "price_per_meter": "1.00"},
            format="json",
        )
        self.assertNotEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_stock_sync_stays_admin_only(self):
        subadmin = make_subadmin(flags={"items_view": True, "items_edit": True})
        self.client.credentials(**auth_header(subadmin))
        self.assertEqual(
            self.client.get("/api/items/sync/").status_code,
            status.HTTP_403_FORBIDDEN,
        )

        self.client.credentials(**auth_header(self.admin))
        self.assertEqual(
            self.client.get("/api/items/sync/").status_code, status.HTTP_200_OK
        )

    def test_customers_are_read_only_for_subadmins(self):
        subadmin = make_subadmin(flags={"orders_view": True})
        self.client.credentials(**auth_header(subadmin))
        self.assertEqual(
            self.client.get("/api/customers/").status_code, status.HTTP_200_OK
        )
        self.assertEqual(
            self.client.post(
                "/api/customers/", {"name": "Nope", "contact": "1"}, format="json"
            ).status_code,
            status.HTTP_403_FORBIDDEN,
        )
        self.assertEqual(
            self.client.delete(f"/api/customers/{self.customer.id}/").status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_bulk_import_is_admin_only(self):
        subadmin = make_subadmin(flags={"orders_view": True})
        self.client.credentials(**auth_header(subadmin))
        response = self.client.post(
            "/api/customers/bulk-import/", {"customers": []}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        self.client.credentials(**auth_header(self.admin))
        response = self.client.post(
            "/api/customers/bulk-import/", {"customers": []}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_agents_are_read_only_for_subadmins(self):
        subadmin = make_subadmin(flags={"agents_view": True})
        self.client.credentials(**auth_header(subadmin))
        self.assertEqual(
            self.client.get("/api/agents/").status_code, status.HTTP_200_OK
        )
        self.assertEqual(
            self.client.post(
                "/api/agents/",
                {
                    "username": "newagent",
                    "email": "newagent@test.com",
                    "password": "pass1234",
                    "contact": "1",
                },
                format="json",
            ).status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_admin_order_delete_also_requires_pin(self):
        self.client.credentials(**auth_header(self.admin))
        response = self.client.delete(f"/api/orders/{self.order.id}/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
