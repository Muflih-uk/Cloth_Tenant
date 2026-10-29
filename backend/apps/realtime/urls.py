from django.urls import path

from .views import WSTicketView

urlpatterns = [
    path("ticket/", WSTicketView.as_view(), name="ws-ticket"),
]
