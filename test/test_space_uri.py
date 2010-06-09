"""
Test that _space_uri generates the correct URI for a space.
This _does_not_ check for a correct space when an alien_domain
is involved, because we don't have support for that yet.
"""

from tiddlywebplugins.tiddlyspace.spaces import _space_uri


def test_space_uri():
    environ = {}
    environ['tiddlyweb.config'] = {}
    environ['tiddlyweb.config']['server_host'] = {
            'host': 'example.com',
            'scheme': 'http',
            'port': '8080',
            }

    server_host = environ['tiddlyweb.config']['server_host']

    space_name = 'howdy'

    assert _space_uri(environ, space_name) == 'http://howdy.example.com:8080/'

    server_host['port'] = '80'
    assert _space_uri(environ, space_name) == 'http://howdy.example.com/'

    server_host['port'] = '443'
    server_host['scheme'] = 'https'
    assert _space_uri(environ, space_name) == 'https://howdy.example.com/'

    server_host['port'] = '9443'
    assert _space_uri(environ, space_name) == 'https://howdy.example.com:9443/'
