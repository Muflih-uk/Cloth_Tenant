import logging

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.conf import settings
from django.db import transaction
from django.utils import timezone

from .constants import ADMIN_GROUP, agent_group

logger = logging.getLogger(__name__)


def publish_order_event(
    order_id,
    event_type,
    *,
    status=None,
    agent_user_id=None,
    visible_to_admin=True,
    source="order",
):
    """Broadcast a small order-changed notification after the DB commits.

    The payload is deliberately not a serialized order: the client still reads
    authoritative data through the REST API, and this message only tells it which
    order changed.
    """
    if not settings.REALTIME_ENABLED:
        return

    payload = {
        "type": event_type,
        "order_id": order_id,
        "status": status,
        "source": source,
        "occurred_at": timezone.now().isoformat(),
    }

    groups = []
    if visible_to_admin:
        groups.append(ADMIN_GROUP)
    if agent_user_id:
        groups.append(agent_group(agent_user_id))

    if not groups:
        return

    def _dispatch():
        layer = get_channel_layer()
        if layer is None:
            logger.warning("Realtime event dropped: no channel layer configured")
            return

        for group in groups:
            try:
                async_to_sync(layer.group_send)(
                    group,
                    {"type": "order.event", "payload": payload},
                )
            except Exception:
                logger.exception(
                    "Failed to broadcast order event %s to %s", event_type, group
                )

    transaction.on_commit(_dispatch, robust=True)


def publish_resource_event(event_type, entity_id, *, groups, source):
    """Broadcast an invalidation notice for a non-order resource."""
    if not settings.REALTIME_ENABLED:
        return

    payload = {
        "type": event_type,
        "entity_id": entity_id,
        "source": source,
        "occurred_at": timezone.now().isoformat(),
    }

    def _dispatch():
        layer = get_channel_layer()
        if layer is None:
            logger.warning("Realtime event dropped: no channel layer configured")
            return
        for group in groups:
            try:
                async_to_sync(layer.group_send)(
                    group,
                    {"type": "resource.event", "payload": payload},
                )
            except Exception:
                logger.exception(
                    "Failed to broadcast resource event %s to %s", event_type, group
                )

    transaction.on_commit(_dispatch, robust=True)
