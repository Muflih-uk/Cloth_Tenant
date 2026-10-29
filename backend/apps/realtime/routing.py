from django.urls import path

from .consumers import OrderConsumer

websocket_urlpatterns = [
    path("ws/orders/", OrderConsumer.as_asgi()),
]
