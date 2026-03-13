"""
Custom middleware for security headers.
"""

from django.conf import settings


class CSPMiddleware:
    """Middleware that adds Content-Security-Policy header to responses."""

    def __init__(self, get_response):
        self.get_response = get_response
        self.csp_header = self._build_csp_header()

    def _build_csp_header(self):
        directives = []
        csp_settings = {
            'default-src': getattr(settings, 'CSP_DEFAULT_SRC', ("'self'",)),
            'script-src': getattr(settings, 'CSP_SCRIPT_SRC', ("'self'",)),
            'style-src': getattr(settings, 'CSP_STYLE_SRC', ("'self'",)),
            'img-src': getattr(settings, 'CSP_IMG_SRC', ("'self'",)),
            'font-src': getattr(settings, 'CSP_FONT_SRC', ("'self'",)),
            'connect-src': getattr(settings, 'CSP_CONNECT_SRC', ("'self'",)),
            'frame-ancestors': getattr(settings, 'CSP_FRAME_ANCESTORS', ("'none'",)),
        }
        for directive, sources in csp_settings.items():
            directives.append(f"{directive} {' '.join(sources)}")
        return '; '.join(directives)

    def __call__(self, request):
        response = self.get_response(request)
        response['Content-Security-Policy'] = self.csp_header
        return response
