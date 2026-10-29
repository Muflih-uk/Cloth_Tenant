from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from apps.realtime.constants import CATALOG_GROUP
from apps.realtime.events import publish_resource_event

from .models import Brand


@receiver(post_save, sender=Brand)
@receiver(post_delete, sender=Brand)
def brand_changed(sender, instance, **kwargs):
    publish_resource_event(
        "catalog.updated", instance.pk, groups=[CATALOG_GROUP], source="brand"
    )