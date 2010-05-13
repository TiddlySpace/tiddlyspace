import tiddlywebplugins.tiddlyspace.handler as handler

from py.test import raises

from tiddlyweb.web.http import HTTP302


def setup_module(module):
    module._serve_frontpage = handler.serve_frontpage
    handler.serve_frontpage = lambda environ, start_response: 'frontpage'

    module._serve_space = handler.serve_space
    handler.serve_space = lambda environ, start_response, http_host: 'space'


def teardown_module(module):
    handler.serve_frontpage = module._serve_frontpage
    handler.serve_space = module._serve_space


def test_home():
    start_response = None

    environ = _get_env()
    environ['tiddlyweb.usersign']['name'] = 'GUEST'
    assert handler.home(environ, start_response) == 'frontpage'

    environ = _get_env()
    environ['HTTP_HOST'] = 'http://fnd.localhost:8080'
    assert handler.home(environ, start_response) == 'space'

    environ = _get_env()
    environ['tiddlyweb.usersign']['name'] = 'cdent'
    exc = raises(HTTP302, handler.home, environ, start_response)
    assert exc.value.args[0] == 'http://cdent.localhost:8080'

    environ = _get_env()
    environ['tiddlyweb.config']['server_host']['scheme'] = 'https'
    environ['tiddlyweb.usersign']['name'] = 'psd'
    exc = raises(HTTP302, handler.home, environ, start_response)
    assert exc.value.args[0] == 'https://psd.localhost:8080'


def _get_env():
    return {
        'tiddlyweb.config': {
            'server_host': {
                'scheme': 'http',
                'host': 'localhost',
                'port': '8080',
            }
        },
        'tiddlyweb.usersign': {}
    }
