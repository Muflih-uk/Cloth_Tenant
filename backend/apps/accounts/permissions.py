from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import BasePermission
from rest_framework.response import Response


SUBADMIN_FLAGS = (
    "orders_view",
    "orders_edit",
    "orders_delete",
    "items_view",
    "items_edit",
    "items_delete",
    "agents_view",
)


def get_subadmin_flags(user):
    """The effective switches for ``user``.

    Admins implicitly hold every switch; agents and accounts without a
    permission row hold none. The row is read every time rather than copied into
    a JWT, so an admin's change applies to the sub-admin's next request.
    """
    if not getattr(user, "is_authenticated", False):
        return {flag: False for flag in SUBADMIN_FLAGS}
    if user.role == "ADMIN":
        return {flag: True for flag in SUBADMIN_FLAGS}
    if user.role != "SUBADMIN":
        return {flag: False for flag in SUBADMIN_FLAGS}

    profile = getattr(user, "subadmin_permission", None)
    return {
        flag: bool(profile and getattr(profile, flag, False))
        for flag in SUBADMIN_FLAGS
    }


def has_subadmin_flag(user, flag):
    return get_subadmin_flags(user).get(flag, False)


class IsAgent(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "AGENT"


class IsAgentOrAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ("AGENT", "ADMIN")


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "ADMIN"


class CanViewOrders(BasePermission):
    """Read orders: admins, agents (own rows filtered by the view), or a
    sub-admin with the orders-view switch."""

    def has_permission(self, request, view):
        user = request.user
        if not user.is_authenticated:
            return False
        return user.role in ("ADMIN", "AGENT") or (
            user.role == "SUBADMIN" and has_subadmin_flag(user, "orders_view")
        )


class CanEditOrders(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user.is_authenticated:
            return False
        return user.role in ("ADMIN", "AGENT") or (
            user.role == "SUBADMIN" and has_subadmin_flag(user, "orders_edit")
        )


class CanDeleteOrders(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user.is_authenticated:
            return False
        return user.role in ("ADMIN", "AGENT") or (
            user.role == "SUBADMIN" and has_subadmin_flag(user, "orders_delete")
        )


class CanViewPacking(BasePermission):
    """Packing is an order read. Agents are deliberately not included."""

    def has_permission(self, request, view):
        user = request.user
        if not user.is_authenticated:
            return False
        return user.role == "ADMIN" or (
            user.role == "SUBADMIN" and has_subadmin_flag(user, "orders_view")
        )


class CanEditPacking(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user.is_authenticated:
            return False
        return user.role == "ADMIN" or (
            user.role == "SUBADMIN" and has_subadmin_flag(user, "orders_edit")
        )


class CanViewItems(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user.is_authenticated:
            return False
        return user.role in ("ADMIN", "AGENT") or (
            user.role == "SUBADMIN" and has_subadmin_flag(user, "items_view")
        )


class CanEditItems(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user.is_authenticated:
            return False
        return user.role == "ADMIN" or (
            user.role == "SUBADMIN" and has_subadmin_flag(user, "items_edit")
        )


class CanDeleteItems(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user.is_authenticated:
            return False
        return user.role == "ADMIN" or (
            user.role == "SUBADMIN" and has_subadmin_flag(user, "items_delete")
        )


class CanViewAgents(BasePermission):
    """Read agents. An agent only sees their own row via the view queryset."""

    def has_permission(self, request, view):
        user = request.user
        if not user.is_authenticated:
            return False
        return user.role in ("ADMIN", "AGENT") or (
            user.role == "SUBADMIN" and has_subadmin_flag(user, "agents_view")
        )


class CanReadCustomers(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user.is_authenticated:
            return False
        if user.role in ("ADMIN", "AGENT"):
            return True
        if user.role != "SUBADMIN":
            return False
        flags = get_subadmin_flags(user)
        return flags["agents_view"] or flags["orders_view"]


class CanWriteCustomers(BasePermission):
    """Admins may change any customer; agents keep their existing create flow.

    Sub-admins never write customers.
    """

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role in ("ADMIN", "AGENT")
        )


class IsAdminOrSelfAgent(BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        if request.user.role == "ADMIN":
            return True
        if request.user.role != "AGENT":
            return False

        return obj.user == request.user


def check_admin_pin(request, action="delete"):
    """Require a PIN before a destructive admin/sub-admin action.

    Agents stay exempt as before. There is no superuser shortcut any more: the
    app only has admins, sub-admins and agents, and every destructive admin-area
    action has to prove the PIN on the account that is signed in.
    """
    if request.user.role == "AGENT":
        return None
    if request.user.role not in ("ADMIN", "SUBADMIN"):
        return Response({"error": "Forbidden"}, status=403)
    raw_pin = request.data.get("pin")
    if not raw_pin:
        return Response({"error": f"PIN is required to {action}."}, status=403)
    if not request.user.check_pin(raw_pin):
        return Response({"error": "Incorrect PIN."}, status=403)
    return None


class IsAdminWithPin(BasePermission):
    """Write access to shared reference data: admins, PIN in hand."""

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
