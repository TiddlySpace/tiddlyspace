"""
Note: This tests doesn't do much any more as 
_determine space has become too complex and needs
more environment information to get fully tested.
"""
from tiddlywebplugins.tiddlyspace.handler import determine_space


config = {
        'server_host': {
            'scheme': 'http',
            'host': '0.0.0.0',
            'port': '8080',
            },
        }
environ = {'tiddlyweb.config': config}


def test_simple_space():
    space = determine_space(environ, 'foo.0.0.0.0:8080')
    assert space == 'foo'

    space = determine_space(environ, 'foo.bar.0.0.0.0:8080')
    assert space == 'foo.bar'
