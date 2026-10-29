from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer

from apps.accounts.permissions import get_subadmin_flags

from .constants import (
    ADMIN_GROUP,
    CATALOG_GROUP,
    CUSTOMER_GROUP,
    INVENTORY_GROUP,
    TRANSPORT_GROUP,
    USERS_GROUP,
    agent_group,
)


@database_sync_to_async
def _groups_for_user(user):
    if not getattr(user, "is_authenticated", False):
        return []

    if user.role == "ADMIN":
        return [
            ADMIN_GROUP,
            INVENTORY_GROUP,
            CUSTOMER_GROUP,
            CATALOG_GROUP,
            TRANSPORT_GROUP,
            USERS_GROUP,
        ]

    if user.role == "SUBADMIN" and get_subadmin_flags(user)["orders_view"]:
        flags = get_subadmin_flags(user)
        groups = []
        if flags["orders_view"]:
            groups.append(ADMIN_GROUP)
        if flags["items_view"]:
            groups.extend([INVENTORY_GROUP, CATALOG_GROUP])
        if flags["agents_view"]:
            groups.extend([CUSTOMER_GROUP, USERS_GROUP])
        return groups

    if user.role == "AGENT":
        return [
            agent_group(user.pk),
            INVENTORY_GROUP,
            CATALOG_GROUP,
            CUSTOMER_GROUP,
            TRANSPORT_GROUP,
        ]

    return []


class OrderConsumer(AsyncJsonWebsocketConsumer):
    groups_to_join = ()

    async def connect(self):
        user = self.scope.get("user")
        groups = await _groups_for_user(user)
        if not groups:
            await self.close(code=4403)
            return

        self.groups_to_join = groups
        for group in groups:
            await self.channel_layer.group_add(group, self.channel_name)

        await self.accept()

    async def disconnect(self, close_code):
        for group in self.groups_to_join:
            await self.channel_layer.group_discard(group, self.channel_name)

    async def receive_json(self, content, **kwargs):
        if content.get("type") == "ping":
            await self.send_json({"type": "pong"})

    async def order_event(self, event):
        await self.send_json(event["payload"])

    async def resource_event(self, event):
        await self.send_json(event["payload"])
