"""
Invalidate cache manifest files every time they are requested.
"""

from time import time


MANIFEST_TYPE = 'text/cache-manifest'


class RepudiatorController(object):
    """
    Invalidate a cache manifest file when it is loaded by
    including a timestamp as a comment.
    """

    def __init__(self, application):
        self.application = application

    def __call__(self, environ, start_response):
        wrapper = Repudiator(environ, start_response)
        app_iter = self.application(environ,
                wrapper.replacement_start_response)
        return (wrapper.finish_response(app_iter))


class Repudiator(object):

    def __init__(self, environ, start_response):
        self.environ = environ
        self.start_response = start_response
        self._init_headers()

    def _init_headers(self):
        self.headers = []
        self.status = '500 Undef'
        self.is_manifest = False

    def replacement_start_response(self, status, headers, exc_info=None):
        self.status = status
        self.headers = headers
        try:
            content_type = [value for header, value in headers
                    if header.lower() == 'content-type'][0]
        except IndexError:
            content_type = None
        if (self.environ['REQUEST_METHOD'] == 'GET'
            and content_type == MANIFEST_TYPE
            and self.status.startswith('200')):
            self.is_manifest = True
            self._flush_headers()

    def finish_response(self, app_iter):
        self.start_response(self.status, self.headers)

        for item in app_iter:
            yield item
        if self.is_manifest:
            yield '\n# Repudiation: ' + self._repudiator() + '\n'

    def _flush_headers(self):
        kept = []
        for header, value in self.headers:
            if header.lower() not in ['etag', 'last-modified']:
                kept.append((header, value))
        self.headers = kept

    def _repudiator(self):
        # fun with integer math!
        return str((int(time()) / 60) * 60)
