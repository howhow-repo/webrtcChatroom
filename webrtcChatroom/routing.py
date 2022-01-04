from channels.routing import URLRouter
from django.urls import path

import chat.routing

websocket_urlpatterns = URLRouter([
    path("", URLRouter([
        path('', chat.routing.websocket_urlpatterns),
    ])),
])