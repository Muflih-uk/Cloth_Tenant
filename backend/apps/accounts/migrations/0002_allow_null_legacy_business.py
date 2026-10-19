from django.db import migrations


def allow_null_legacy_business(apps, schema_editor):
    user_model = apps.get_model("accounts", "User")
    table = user_model._meta.db_table
    connection = schema_editor.connection

    with connection.cursor() as cursor:
        columns = {
            column.name
            for column in connection.introspection.get_table_description(
                cursor, table
            )
        }

    if "business" in columns:
        schema_editor.execute(
            f"ALTER TABLE {schema_editor.quote_name(table)} "
            f"ALTER COLUMN {schema_editor.quote_name('business')} DROP NOT NULL"
        )


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(
            allow_null_legacy_business,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
