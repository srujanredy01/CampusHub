"""
ASGI config for CampusHub project.
Supports HTTP + WebSocket protocols via Django Channels.
"""
import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "campushub.settings")
django.setup()

from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
from django.core.asgi import get_asgi_application

from campushub.ws_middleware import JWTAuthMiddleware
from campushub.routing import websocket_urlpatterns

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AllowedHostsOriginValidator(
        JWTAuthMiddleware(
            URLRouter(websocket_urlpatterns)
        )
    ),
})
