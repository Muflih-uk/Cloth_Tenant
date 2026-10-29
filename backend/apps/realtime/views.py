from django.conf import settings
from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .tickets import issue_ticket


class WSTicketView(APIView):
    """Exchange a normal JWT request for a short-lived WebSocket ticket."""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Create a short-lived WebSocket ticket",
        request=None,
        responses={200: None},
        tags=["Realtime"],
    )
    def post(self, request):
        return Response(
            {
                "ticket": issue_ticket(request.user.pk),
                "expires_in": settings.WS_TICKET_MAX_AGE,
            }
        )
