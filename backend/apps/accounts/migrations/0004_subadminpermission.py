import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0003_pinresetcode"),
    ]

    operations = [
        migrations.AlterField(
            model_name="user",
            name="role",
            field=models.CharField(
                blank=True,
                choices=[
                    ("ADMIN", "Admin"),
                    ("SUBADMIN", "Sub Admin"),
                    ("AGENT", "Agent"),
                ],
                max_length=10,
            ),
        ),
        migrations.CreateModel(
            name="SubAdminPermission",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("orders_view", models.BooleanField(default=False)),
                ("orders_edit", models.BooleanField(default=False)),
                ("orders_delete", models.BooleanField(default=False)),
                ("items_view", models.BooleanField(default=False)),
                ("items_edit", models.BooleanField(default=False)),
                ("items_delete", models.BooleanField(default=False)),
                ("agents_view", models.BooleanField(default=False)),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="subadmin_permission",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
        ),
    ]
