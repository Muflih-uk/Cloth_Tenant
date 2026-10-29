from channels.db import database_sync_to_async
from channels.routing import URLRouter
from channels.security.websocket import OriginValidator
from channels.testing import WebsocketCommunicator
from django.contrib.auth import get_user_model
from django.test import TestCase, TransactionTestCase, override_settings
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import SubAdminPermission
from apps.agents.models import Agent
from apps.customers.models import Customer
from apps.items.models import Fabric, FabricVariant
from apps.orders.models import Order

from .middleware import TicketAuthMiddleware
from .routing import websocket_urlpatterns
from .tickets import issue_ticket

User = get_user_model()

TEST_CHANNEL_LAYERS = {
    "default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}
}
TEST_ORIGIN = "http://testserver"


def make_user(username, role):
    return User.objects.create_user(
        username=username,
        email=f"{username}@test.com",
        password="pass1234",
        role=role,
    )


def socket_application():
    return OriginValidator(
        TicketAuthMiddleware(URLRouter(websocket_urlpatterns)),
        [TEST_ORIGIN],
    )


def auth_header(user):
    refresh = RefreshToken.for_user(user)
    return {"HTTP_AUTHORIZATION": f"Bearer {refresh.access_token}"}


class WSTicketViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = make_user("ticket-admin", "ADMIN")

    def test_requires_authentication(self):
        response = self.client.post("/api/ws/ticket/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_returns_short_lived_ticket(self):
        self.client.credentials(**auth_header(self.user))
        response = self.client.post("/api/ws/ticket/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["ticket"])
        self.assertEqual(response.data["expires_in"], 60)


@override_settings(
    CHANNEL_LAYERS=TEST_CHANNEL_LAYERS,
    REALTIME_ENABLED=True,
    WS_ALLOWED_ORIGINS=[TEST_ORIGIN],
)
class OrderSocketTests(TransactionTestCase):
    def setUp(self):
        self.admin = make_user("socket-admin", "ADMIN")
        self.agent_user = make_user("socket-agent", "AGENT")
        self.other_agent_user = make_user("socket-agent-2", "AGENT")
        self.agent = Agent.objects.create(user=self.agent_user, contact="111")
        self.other_agent = Agent.objects.create(
            user=self.other_agent_user, contact="222"
        )
        self.customer = Customer.objects.create(
            name="Socket Customer", contact="9999999999", agent=self.agent
        )

    async def connect(self, user):
        communicator = WebsocketCommunicator(
            socket_application(),
            f"/ws/orders/?ticket={issue_ticket(user.pk)}",
            headers=[(b"origin", TEST_ORIGIN.encode())],
        )
        connected, _ = await communicator.connect()
        self.assertTrue(connected)
        return communicator

    async def test_rejects_connection_without_ticket(self):
        communicator = WebsocketCommunicator(
            socket_application(),
            "/ws/orders/",
            headers=[(b"origin", TEST_ORIGIN.encode())],
        )
        connected, code = await communicator.connect()
        self.assertFalse(connected)
        self.assertEqual(code, 4401)

    async def test_rejects_expired_ticket(self):
        with override_settings(WS_TICKET_MAX_AGE=-1):
            communicator = WebsocketCommunicator(
                socket_application(),
                f"/ws/orders/?ticket={issue_ticket(self.admin.pk)}",
                headers=[(b"origin", TEST_ORIGIN.encode())],
            )
            connected, code = await communicator.connect()
        self.assertFalse(connected)
        self.assertEqual(code, 4401)

    async def test_rejects_untrusted_origin(self):
        communicator = WebsocketCommunicator(
            socket_application(),
            f"/ws/orders/?ticket={issue_ticket(self.admin.pk)}",
            headers=[(b"origin", b"https://evil.example")],
        )
        connected, _ = await communicator.connect()
        self.assertFalse(connected)

    async def test_subadmin_needs_orders_permission(self):
        denied = await database_sync_to_async(make_user)(
            "socket-subadmin-denied", "SUBADMIN"
        )
        allowed = await database_sync_to_async(make_user)(
            "socket-subadmin-allowed", "SUBADMIN"
        )
        await database_sync_to_async(SubAdminPermission.objects.create)(
            user=allowed, orders_view=True
        )

        denied_socket = WebsocketCommunicator(
            socket_application(),
            f"/ws/orders/?ticket={issue_ticket(denied.pk)}",
            headers=[(b"origin", TEST_ORIGIN.encode())],
        )
        connected, code = await denied_socket.connect()
        self.assertFalse(connected)
        self.assertEqual(code, 4403)

        allowed_socket = await self.connect(allowed)
        await allowed_socket.disconnect()

    async def test_admin_receives_order_created_event(self):
        communicator = await self.connect(self.admin)

        order = await database_sync_to_async(Order.objects.create)(
            customer=self.customer,
            agent=self.agent,
            created_by=self.agent_user,
            status="PENDING",
        )

        event = await communicator.receive_json_from()
        self.assertEqual(event["type"], "order.created")
        self.assertEqual(event["order_id"], order.pk)
        self.assertEqual(event["status"], "PENDING")
        await communicator.disconnect()

    async def test_agent_receives_customer_changed_event(self):
        communicator = await self.connect(self.agent_user)

        await database_sync_to_async(self.customer.save)()

        event = await communicator.receive_json_from()
        self.assertEqual(event["type"], "customer.updated")
        self.assertEqual(event["entity_id"], self.customer.pk)
        await communicator.disconnect()

    async def test_agent_receives_inventory_changed_event(self):
        fabric = await database_sync_to_async(Fabric.objects.create)(
            name="Socket Fabric", price_per_meter="12.50"
        )
        communicator = await self.connect(self.agent_user)

        variant = await database_sync_to_async(FabricVariant.objects.create)(
            fabric=fabric, display_order="Blue", stock_meters="25.000"
        )

        event = await communicator.receive_json_from()
        self.assertEqual(event["type"], "inventory.updated")
        self.assertEqual(event["entity_id"], variant.pk)
        await communicator.disconnect()

    async def test_agent_only_receives_own_orders(self):
        agent_socket = await self.connect(self.agent_user)
        other_socket = await self.connect(self.other_agent_user)

        order = await database_sync_to_async(Order.objects.create)(
            customer=self.customer,
            agent=self.agent,
            created_by=self.agent_user,
            status="PENDING",
        )

        event = await agent_socket.receive_json_from()
        self.assertEqual(event["order_id"], order.pk)
        self.assertTrue(await other_socket.receive_nothing(timeout=0.2))

        await agent_socket.disconnect()
        await other_socket.disconnect()

    async def test_draft_is_not_broadcast_to_admins(self):
        admin_socket = await self.connect(self.admin)
        agent_socket = await self.connect(self.agent_user)

        await database_sync_to_async(Order.objects.create)(
            customer=self.customer,
            agent=self.agent,
            created_by=self.agent_user,
            status="DRAFT",
        )

        event = await agent_socket.receive_json_from()
        self.assertEqual(event["type"], "order.created")
        self.assertTrue(await admin_socket.receive_nothing(timeout=0.2))

        await admin_socket.disconnect()
        await agent_socket.disconnect()
