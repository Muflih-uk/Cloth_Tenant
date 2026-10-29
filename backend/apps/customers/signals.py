from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from apps.realtime.constants import CUSTOMER_GROUP
from apps.realtime.events import publish_resource_event

from .models import Customer


@receiver(post_save, sender=Customer)
@receiver(post_delete, sender=Customer)
def customer_changed(sender, instance, **kwargs):
    publish_resource_event(
        "customer.updated", instance.pk, groups=[CUSTOMER_GROUP], source="customer"
    )