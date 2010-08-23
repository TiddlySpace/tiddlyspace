
from test.fixtures import make_test_env, make_fake_space, get_auth

from wsgi_intercept import httplib2_intercept
import wsgi_intercept
import httplib2
import simplejson

from tiddlyweb.model.tiddler import Tiddler
from tiddlyweb.model.recipe import Recipe
from tiddlyweb.model.user import User

from tiddlywebplugins.tiddlyspace.spaces import change_space_member


def setup_module(module):
    make_test_env(module)
    httplib2_intercept.install()
    wsgi_intercept.add_wsgi_intercept('0.0.0.0', 8080, app_fn)
    wsgi_intercept.add_wsgi_intercept('thing.0.0.0.0', 8080, app_fn)
    wsgi_intercept.add_wsgi_intercept('foo.0.0.0.0', 8080, app_fn)
    user = User('thingone')
    user.set_password('how')
    store.put(user)
    user = User('thingtwo')
    user.set_password('how')
    store.put(user)
    module.http = httplib2.Http()

def teardown_module(module):
    import os
    os.chdir('..')


def test_create_spaces():
    cookie = get_auth('thingone', 'how')
    response, content = http.request('http://0.0.0.0:8080/spaces/thing',
            method='PUT',
            headers={'Cookie': 'tiddlyweb_user="%s"' % cookie})
    assert response['status'] == '201'

    response, content = http.request(
            'http://thing.0.0.0.0:8080/bags/thing_private/tiddlers/thingone',
            method='PUT',
            headers={'Content-Type': 'application/json',
                'Cookie': 'tiddlyweb_user="%s"' % cookie},
            body='{"text": "thingone"}')
    assert response['status'] == '204'

    cookie = get_auth('thingtwo', 'how')
    response, content = http.request('http://0.0.0.0:8080/spaces/foo',
            method='PUT',
            headers={'Cookie': 'tiddlyweb_user="%s"' % cookie})
    assert response['status'] == '201'

    response, content = http.request(
            'http://foo.0.0.0.0:8080/bags/foo_private/tiddlers/thingtwo',
            method='PUT',
            headers={'Content-Type': 'application/json',
                'Cookie': 'tiddlyweb_user="%s"' % cookie},
            body='{"text": "thingtwo"}')
    assert response['status'] == '204'


def test_foo_tiddlers_guest():
    cookie = get_auth('thingone', 'how')
    response, content = http.request('http://foo.0.0.0.0:8080/',
            method='GET',
            headers={'Accept': 'application/json'})
    guest_content = content

    response, content = http.request('http://foo.0.0.0.0:8080/',
            headers={'Accept': 'application/json',
                'Cookie': 'tiddlyweb_user="%s"' % cookie})
    user_content = content
    assert guest_content == user_content

    response, content = http.request(
            'http://thing.0.0.0.0:8080/bags/thing_private/tiddlers',
            method='GET',
            headers={'Accept': 'application/json',
                'Cookie': 'tiddlyweb_user="%s"' % cookie})
    thing_content = content

    response, content = http.request(
            'http://foo.0.0.0.0:8080/bags/thing_private/tiddlers',
            method='GET',
            headers={'Accept': 'application/json',
                'Cookie': 'tiddlyweb_user="%s"' % cookie})
    assert response['status'] == '404'

    response, content = http.request(
            'http://foo.0.0.0.0:8080/bags/thing_private/tiddlers',
            method='GET',
            headers={'Accept': 'application/json',
                'X-ControlView': 'false',
                'Cookie': 'tiddlyweb_user="%s"' % cookie})
    assert response['status'] == '401'

    response, content = http.request(
            'http://foo.0.0.0.0:8080/bags/thing_private/tiddlers/more',
            method='PUT',
            headers={'Content-Type': 'application/json',
                'X-ControlView': 'false',
                'Cookie': 'tiddlyweb_user="%s"' % cookie},
            body='{"text": "hi"}')
    assert response['status'] == '403'
