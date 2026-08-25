from datetime import datetime
import time
import logging

from requests import Request

middleware_logger = logging.getLogger("django")


class ElapsedMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request: Request):
        now = datetime.now()
        response = self.get_response(request)
        delta = datetime.now() - now
        elapsed = int(delta.total_seconds() * 1000)

        # Assign user to log if it's not an anonymous user
        username = "anonymous"
        if not request.user.is_anonymous:
            username = str(request.user)

        middleware_logger.info(
            f"{username:15}:Statistics {request.path} sc={response.status_code} elapsed={elapsed} ms"
        )
        response["X-Page-Generation-Duration-ms"] = elapsed

        return response
