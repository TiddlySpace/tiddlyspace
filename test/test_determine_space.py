
from tiddlywebplugins.tiddlyspace.handler import _determine_space

config = {
        'server_host': {
            'scheme': 'http',
            'host': '0.0.0.0',
            'port': '8080',
            },
        }
environ = {'tiddlyweb.config': config}

def test_simple_space():
    space = _determine_space(environ, 'foo.0.0.0.0:8080')
    assert space == 'foo'

    space = _determine_space(environ, 'foo.bar.0.0.0.0:8080')
    assert space == 'foo.bar'

    space = _determine_space(environ, 'clamato.com:8080')
    assert space == None
