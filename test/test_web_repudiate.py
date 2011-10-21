
from test.fixtures import make_test_env

from wsgi_intercept import httplib2_intercept
import wsgi_intercept
import httplib2
import py.test

from tiddlyweb.model.bag import Bag
from tiddlyweb.model.tiddler import Tiddler

from tiddlywebplugins.tiddlyspace.repudiator import MANIFEST_TYPE, Repudiator

BASE_MANIFEST = """\
/bags/common/tiddlers/chrjs.js
/bags/common/tiddlers/monkeys
"""

def setup_module(module):
    make_test_env(module)
    httplib2_intercept.install()
    wsgi_intercept.add_wsgi_intercept('0.0.0.0', 8080, app_fn)

    module.http = httplib2.Http()

    bag = Bag('place')
    store.put(bag)
    manifest = Tiddler('manifest', 'place')
    manifest.type = MANIFEST_TYPE
    manifest.text = BASE_MANIFEST
    store.put(manifest)

    notmanifest = Tiddler('notmanifest', 'place')
    manifest.text = 'oh hi'
    store.put(notmanifest)


def test_basic_get():
    for i in range(10):
        response, content = http.request(
                'http://0.0.0.0:8080/bags/place/tiddlers/manifest')

        assert response['status'] == '200'
        assert response['content-type'] == MANIFEST_TYPE
        assert 'etag' not in response, response
        assert 'last-modified' not in response
        assert '\n# Repudiation: ' in content

    response, content = http.request(
            'http://0.0.0.0:8080/bags/place/tiddlers/notmanifest')
    assert response['status'] == '200'
    assert 'text/html' in response['content-type']
    assert '\n# Repudiation: ' not in content

def test_json_get():
    response, content = http.request(
            'http://0.0.0.0:8080/bags/place/tiddlers/manifest.json')

    assert response['status'] == '200'
    assert '\n# Repudiation: ' not in content

def test_flush_headers():
    r = Repudiator({}, lambda x: x)
    r.headers = [('Cache-Control', 'no-cache'),
        ('Content-Type', 'text/cache-manifest'), ('Vary', 'Accept'),
        ('Last-Modified', 'Wed, 19 Oct 2011 07:06:18 GMT'),
        ('Etag', '"common/takenote_manifest.appcache/81:e03"')]

    r._flush_headers()
    assert len(r.headers) is 3
