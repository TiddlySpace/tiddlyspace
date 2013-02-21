
from test.fixtures import make_test_env

from wsgi_intercept import httplib2_intercept
import wsgi_intercept
import httplib2
import simplejson

def setup_module(module):
    make_test_env(module)
    httplib2_intercept.install()
    wsgi_intercept.add_wsgi_intercept('0.0.0.0', 8080, app_fn)
    module.http = httplib2.Http()


def test_cors_headers_present():
    response, content = http.request(
            'http://0.0.0.0:8080/bags/common/tiddlers/backstage.js')

    assert 'etag' in response
    assert 'access-control-allow-origin' in response
    assert response['access-control-allow-origin'] is '*'
    assert content is not ''

    response, content = http.request(
            'http://0.0.0.0:8080/bags/common/tiddlers/backstage.js',
            headers={'If-None-Match': response['etag']})

    assert 'etag' in response
    assert 'access-control-allow-origin' in response
    assert response['access-control-allow-origin'] is '*'
    assert content is ''
