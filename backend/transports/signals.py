from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from apps.realtime.constants import TRANSPORT_GROUP
from apps.realtime.events import publish_resource_event

from .models import Transport


@receiver(post_save, sender=Transport)
@receiver(post_delete, sender=Transport)
def transport_changed(sender, instance, **kwargs):
    publish_resource_event(
        "transport.updated", instance.pk, groups=[TRANSPORT_GROUP], source="transport"
    )