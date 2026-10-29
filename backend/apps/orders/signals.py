from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from apps.agents.models import Agent
from apps.realtime.events import publish_order_event

from .models import Order, OrderItem, PackingBundle


def _agent_user_id(agent_id):
    if not agent_id:
        return None
    return (
        Agent.objects.filter(pk=agent_id).values_list("user_id", flat=True).first()
    )


def _order_context(order_id):
    return (
        Order.objects.filter(pk=order_id)
        .values("status", "agent__user_id")
        .first()
    )


def _publish(order_id, event_type, context, source):
    publish_order_event(
        order_id,
        event_type,
        status=context["status"],
        agent_user_id=context["agent__user_id"],
        visible_to_admin=context["status"] != "DRAFT",
        source=source,
    )


@receiver(post_save, sender=Order)
def order_saved(sender, instance, created, raw=False, **kwargs):
    if raw:
        return
    publish_order_event(
        instance.pk,
        "order.created" if created else "order.updated",
        status=instance.status,
        agent_user_id=_agent_user_id(instance.agent_id),
        visible_to_admin=instance.status != "DRAFT",
        source="order",
    )


@receiver(post_delete, sender=Order)
def order_deleted(sender, instance, **kwargs):
    publish_order_event(
        instance.pk,
        "order.deleted",
        status=instance.status,
        agent_user_id=_agent_user_id(instance.agent_id),
        visible_to_admin=instance.status != "DRAFT",
        source="order",
    )


@receiver(post_save, sender=OrderItem)
@receiver(post_delete, sender=OrderItem)
def order_item_changed(sender, instance, **kwargs):
    context = _order_context(instance.order_id)
    if context:
        _publish(instance.order_id, "order.updated", context, "order_item")


@receiver(post_save, sender=PackingBundle)
@receiver(post_delete, sender=PackingBundle)
def packing_bundle_changed(sender, instance, **kwargs):
    context = _order_context(instance.order_id)
    if context:
        _publish(instance.order_id, "order.updated", context, "packing_bundle")
