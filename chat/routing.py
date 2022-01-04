from django.urls import re_path
from channels.routing import URLRouter
from .consumers import ChatConsumer


websocket_urlpatterns = URLRouter([
    re_path('', ChatConsumer.as_asgi()),
])