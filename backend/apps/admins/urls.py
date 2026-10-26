from rest_framework.routers import DefaultRouter

from .views import AdminViewSet, SubAdminViewSet

router = DefaultRouter()
router.register("subadmins", SubAdminViewSet, basename="subadmin")
router.register("", AdminViewSet, basename="admin")

urlpatterns = router.urls
