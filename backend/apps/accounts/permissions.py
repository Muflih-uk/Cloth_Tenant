from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import BasePermission
from rest_framework.response import Response


class IsAgent(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "AGENT"


class IsAgentOrAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ("AGENT", "ADMIN")


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "ADMIN"


class IsSuperuser(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_superuser


class IsAdminOrSelfAgent(BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        if request.user.role == "ADMIN":
            return True

        return obj.user == request.user


def check_admin_pin(request, action="delete"):
    """Require a PIN before a destructive admin action.

    Superusers and agents are exempt. There is no business scoping any more --
    the mill is single-tenant -- so this is purely an anti-mistake gate.
    """
    if request.user.is_superuser:
        return None
    if request.user.role == "AGENT":
        return None
    if request.user.role != "ADMIN":
        return Response({"error": "Forbidden"}, status=403)
    raw_pin = request.data.get("pin")
    if not raw_pin:
        return Response({"error": f"PIN is required to {action}."}, status=403)
    if not request.user.check_pin(raw_pin):
        return Response({"error": "Incorrect PIN."}, status=403)
    return None


class IsAdminWithPin(BasePermission):
    """Write access to shared reference data: admins, PIN in hand.

    Same gate as :func:`check_admin_pin`, raised as a permission so a viewset
    does not have to remember to call it -- and so the reason lands in
    ``detail``, which is what the frontend reads for its toast. Superusers are
    exempt, and agents are refused outright because they are not admins.
    """

    # What the PIN message should say for each DRF action.
    VERBS = {
        "create": "create",
        "update": "update",
        "partial_update": "update",
        "destroy": "delete",
    }

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated and user.role == "ADMIN"):
            return False
        error = check_admin_pin(request, action=self.VERBS.get(view.action, "change"))
        if error is not None:
            raise PermissionDenied(error.data["error"])
        return True
