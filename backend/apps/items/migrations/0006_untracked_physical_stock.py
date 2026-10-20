from decimal import Decimal

import django.core.validators
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("items", "0005_two_quantity_stock"),
    ]

    operations = [
        migrations.AlterField(
            model_name="stockmovement",
            name="reason",
            field=models.CharField(
                choices=[
                    (
                        "opening_figure_discarded",
                        "Legacy opening stock adjustment",
                    )
                ],
                max_length=40,
            ),
        ),
        migrations.AddField(
            model_name="fabricvariant",
            name="untracked_stock_meters",
            field=models.DecimalField(
                decimal_places=3,
                default=0,
                max_digits=14,
                validators=[
                    django.core.validators.MinValueValidator(Decimal("0"))
                ],
            ),
        ),
    ]
