
from test.fixtures import make_test_env, make_fake_space

from wsgi_intercept import httplib2_intercept
import wsgi_intercept
import httplib2
import simplejson

from tiddlywebplugins.tiddlyspace.profiles import WEBFINGER_TEMPLATE
from tiddlywebplugins.utils import get_store
from tiddlyweb.config import config
from tiddlyweb.model.tiddler import Tiddler
from tiddlyweb.model.user import User

def setup_module(module):
    make_test_env(module)
    httplib2_intercept.install()
    wsgi_intercept.add_wsgi_intercept('0.0.0.0', 8080, app_fn)

    module.http = httplib2.Http()

    make_fake_space(module.store, 'cdent')
    module.store.put(User('cdent'))


HOST_META = """
<?xml version="1.0" encoding="UTF-8"?>
<XRD xmlns="http://docs.oasis-open.org/ns/xri/xrd-1.0" xmlns:hm="http://host-meta.net/xrd/1.0">
<hm:Host xmlns="http://host-meta.net/xrd/1.0">0.0.0.0:8080</hm:Host>
<Link rel="lrdd" template="http://0.0.0.0:8080/webfinger?q={uri}">
<Title>Resource Descriptor</Title>
</Link>
</XRD>
"""


def test_for_meta():
    response, content = http.request('http://0.0.0.0:8080/.well-known/host-meta')
    assert response['status'] == '200'
    assert content == HOST_META


def test_get_webfinger():
    response, content = http.request('http://0.0.0.0:8080/webfinger?q=cdent@0.0.0.0:8080')
    response2, content2 = http.request('http://0.0.0.0:8080/webfinger?q=acct:cdent@0.0.0.0:8080')

    assert response['status'] == response2['status']
    assert content == content2

    assert response['status'] == '200'
    assert content == WEBFINGER_TEMPLATE % {'username': 'cdent',
            'host': '0.0.0.0:8080', 'server_host': 'http://0.0.0.0:8080'}

def test_get_profile():
    response, content = http.request('http://0.0.0.0:8080/profiles/cdent')
    assert response['status'] == '200'

    assert 'No Profile' in content

    tiddler = Tiddler('profile', 'cdent_public')
    tiddler.text = '!Hello There'
    store.put(tiddler)

    response, content = http.request('http://0.0.0.0:8080/profiles/cdent')
    assert response['status'] == '200'

    assert 'Hello There' in content
