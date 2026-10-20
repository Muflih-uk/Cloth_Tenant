from decimal import Decimal

import django.core.validators
from django.db import migrations, models
from django.db.models import F, Sum
from django.db.models.functions import Greatest


def backfill_base_opening(apps, schema_editor):
    FabricVariant = apps.get_model("items", "FabricVariant")
    OrderItem = apps.get_model("orders", "OrderItem")
    database = schema_editor.connection.alias

    reservations = {
        row["variant_id"]: (
            row["old_reserved"] or Decimal("0"),
            row["new_reserved"] or Decimal("0"),
        )
        for row in OrderItem.objects.using(database)
        .filter(variant__isnull=False)
        .values("variant_id")
        .annotate(
            old_reserved=Sum(F("ordered_quantity") - F("allocated_quantity")),
            new_reserved=Sum(
                Greatest("ordered_quantity", "allocated_quantity")
            ),
        )
    }

    variants = list(FabricVariant.objects.using(database).all())
    for variant in variants:
        old_reserved, new_reserved = reservations.get(
            variant.pk, (Decimal("0"), Decimal("0"))
        )
        variant.base_opening = (
            variant.stock_meters - old_reserved + new_reserved
        )

    FabricVariant.objects.using(database).bulk_update(
        variants, ["base_opening"], batch_size=500
    )
    print(
        f"Backfilled base_opening for {len(variants)} FabricVariant rows; "
        "the previous available_to_order value is preserved for every row."
    )


class Migration(migrations.Migration):
    dependencies = [
        ("items", "0004_stockmovement"),
        ("orders", "0005_allocation_bundle_and_bundle_dispatch"),
    ]

    operations = [
        migrations.AddField(
            model_name="fabricvariant",
            name="base_opening",
            field=models.DecimalField(
                decimal_places=3,
                default=0,
                max_digits=14,
                validators=[
                    django.core.validators.MinValueValidator(Decimal("0"))
                ],
            ),
        ),
        migrations.RunPython(
            backfill_base_opening,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
