from django.conf import settings
from django.core import signing

SALT = "stockflow.realtime"


def issue_ticket(user_id):
    return signing.dumps({"user_id": user_id}, salt=SALT, compress=True)


def read_ticket(ticket):
    data = signing.loads(
        ticket,
        salt=SALT,
        max_age=settings.WS_TICKET_MAX_AGE,
    )
    return data.get("user_id")
