from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.core import signing

from .tickets import read_ticket


@database_sync_to_async
def _load_user(user_id):
    User = get_user_model()
    return (
        User.objects.select_related("subadmin_permission")
        .filter(pk=user_id, is_active=True)
        .first()
    )


class TicketAuthMiddleware:
    """Authenticate a WebSocket connection from a short-lived ticket query arg."""

    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        query = parse_qs(scope.get("query_string", b"").decode())
        ticket = query.get("ticket", [None])[0]

        if not ticket:
            await send({"type": "websocket.close", "code": 4401})
            return

        try:
            user_id = read_ticket(ticket)
        except (signing.BadSignature, signing.SignatureExpired):
            await send({"type": "websocket.close", "code": 4401})
            return

        user = await _load_user(user_id)
        if user is None:
            await send({"type": "websocket.close", "code": 4401})
            return

        scope["user"] = user
        return await self.inner(scope, receive, send)
