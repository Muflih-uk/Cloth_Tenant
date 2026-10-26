from rest_framework import viewsets, permissions
from rest_framework.response import Response
from rest_framework.decorators import action

from apps.accounts.permissions import IsAdminWithPin

from .models import Transport
from .serializers import TransportSerializer


class TransportViewSet(viewsets.ModelViewSet):
    queryset = Transport.objects.all()
    serializer_class = TransportSerializer

    def get_permissions(self):
        # Anyone may read the list -- an order has to be able to offer the
        # transports a customer can pick from. Writing it is an admin action and
        # needs the PIN like every other admin write.
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsAdminWithPin()]
        return [permissions.AllowAny()]

    @action(detail=False, methods=["get"])
    def active(self, request):
        transports = Transport.objects.filter(is_active=True)
        serializer = self.get_serializer(transports, many=True)
        return Response(serializer.data)
