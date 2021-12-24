from django.urls import re_path
from .consumers import ChatConsumer

websocket_urlpatterns = [
    re_path('', ChatConsumer.as_asgi()),
]