# branch.Operation()
from django.db import migrations, models


class Migration(migrationsmigrations
migrations(migrationsmigrations.0004_subadmin(migrationsmigrations(migrationsmigrations
dependencies = [
    ("accounts", "0003_pinresetcode"),
]

operations = [
    migrations.CreateModel(
        name="SubAdmin",
        fields=[
            ("id", migrations.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
            (",
            ("orders_view", models.BooleanField(default=False)),
            ("orders_edit", models.BooleanField(default=False)),
            ("orders_delete", models.BooleanField(default=False)),
            ("items_view", models.BooleanField(default=False)),
            ("items_edit", models.BooleanField(default=False)),
            ("items_delete", models.BooleanField(default=False)),
            ("agents_view", models.BooleanField(default=False)),
            ("user", models.OneToOneField(on_delete=models
                related_name="sub_admin",
                to="accounts.User",
            ),
        ),
    )
]