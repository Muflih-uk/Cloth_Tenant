from rest_framework import status
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from apps.accounts.models import User
from apps.accounts.permissions import IsAdmin
from apps.accounts.serializers import SubAdminSerializer

from .serializers import AdminSerializer


class AdminViewSet(ModelViewSet):
    """Every admin can see and manage every other admin.

    Single-tenant, so there is no business scoping left to do.
    """

    serializer_class = AdminSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        return User.objects.filter(role="ADMIN").order_by("username")


class SubAdminViewSet(ModelViewSet):
    """Admin-managed sub-admin accounts and their permission switches."""

    serializer_class = SubAdminSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        return (
            User.objects.filter(role="SUBADMIN")
            .select_related("subadmin_permission")
            .order_by("username")
        )

    def destroy(self, request, *args, **kwargs):
        # Keep the audit trail attached to the account. Deactivation takes effect
        # on the next request because JWTs are authenticated against the user row.
        subadmin = self.get_object()
        subadmin.is_active = False
        subadmin.save(update_fields=["is_active"])
        return Response(status=status.HTTP_204_NO_CONTENT)
