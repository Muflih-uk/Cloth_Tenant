from django.db import migrations, models


def release_cancelled_numbers(apps, schema_editor):
    PackingBundle = apps.get_model("orders", "PackingBundle")
    PackingBundle.objects.filter(status="CANCELLED").update(number=None)


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0006_packingscan"),
    ]

    operations = [
        migrations.AlterField(
            model_name="packingbundle",
            name="number",
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.RemoveConstraint(
            model_name="packingbundle",
            name="packingbundle_unique_number_per_order",
        ),
        migrations.RunPython(release_cancelled_numbers, migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name="packingbundle",
            constraint=models.UniqueConstraint(
                condition=models.Q(number__isnull=False),
                fields=("order", "number"),
                name="packingbundle_unique_number_per_order",
            ),
        ),
    ]
