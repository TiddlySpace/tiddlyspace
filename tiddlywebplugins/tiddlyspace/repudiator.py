"""
Invalidate cache manifest files every time they are requested.
"""

from time import time


MANIFEST_TYPE = 'text/cache-manifest'


class Repudiator(object):
    """
    Invalidate a cache manifest file when it is loaded by
    including a the tiddlyspace version.
    """

    def __init__(self, application):
        self.application = application
        self.environ = None
        self._init_headers()

    def _init_headers(self):
        self.headers = []
        self.status = '500 Undef'
        self.is_manifest = False

    def __call__(self, environ, start_response):
        self.environ = environ
        self._init_headers()

        def replacement_start_response(status, headers, exc_info=None):
            self.status = status
            self.headers = headers
            try:
                content_type = [value for header, value in headers
                        if header.lower() == 'content-type'][0]
            except IndexError:
                content_type = None
            if (environ['REQUEST_METHOD'] == 'GET'
                and content_type == MANIFEST_TYPE
                and self.status.startswith('200')):
                self.is_manifest = True
                self._flush_headers()

        output_iter = self.application(environ, replacement_start_response)

        start_response(self.status, self.headers)

        for item in output_iter:
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
