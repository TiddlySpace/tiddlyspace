"""
Test the JSONP functionality
"""

import os

from fixtures import make_test_env, make_fake_space, get_auth

from wsgi_intercept import httplib2_intercept
import wsgi_intercept
import httplib2

from tiddlyweb.model.user import User
from tiddlyweb.model.tiddler import Tiddler
from tiddlyweb.config import config
from tiddlywebplugins.utils import get_store


base_url = 'http://0.0.0.0:8080'


def setup_module(module):
    make_test_env(module)
    httplib2_intercept.install()
    wsgi_intercept.add_wsgi_intercept('0.0.0.0', 8080, app_fn)
    wsgi_intercept.add_wsgi_intercept('foo.0.0.0.0', 8080, app_fn)

    module.http = httplib2.Http()

    user = User('foo')
    user.set_password('foobar')
    store.put(user)
    make_fake_space(store, 'foo')


def teardown_module(module):
    import os
    os.chdir('..')


def test_call_jsonp():
    """
    test that we can get some stuff as JSONP
    """
    tiddler = Tiddler('public')
    tiddler.bag = 'foo_public'
    tiddler.text = 'some text'
    store.put(tiddler)

    user_cookie = get_auth('foo', 'foobar')
    callback = 'callback'
    response, content = http.request('http://foo.0.0.0.0:8080/bags/'
        'foo_public/tiddlers/public?callback=%s' % callback,
        method='GET',
        headers={
            'Cookie': 'tiddlyweb_user="%s"' % user_cookie,
            'Accept': 'application/json'
        })
    assert response['status'] == '200'
    assert content.startswith('%s(' % callback)
    assert content[-1:] == ')'

    response, content = http.request('http://0.0.0.0:8080/bags/'
        'foo_public/tiddlers/public?callback=%s' % callback,
        method='GET',
        headers={
            'Cookie': 'tiddlyweb_user="%s"' % user_cookie,
            'Accept': 'application/json'
        })
    assert response['status'] == '200'
    assert content.startswith('%s(' % callback)
    assert content[-1:] == ')'


def test_drop_privs():
    """
    test that privileges are dropped when jsonp is requested
    so that we cannot get private data
    """
    tiddler = Tiddler('private')
    tiddler.bag = 'foo_private'
    tiddler.text = 'some text'
    store.put(tiddler)

    user_cookie = get_auth('foo', 'foobar')
    callback = 'callback'

    response, _ = http.request('http://foo.0.0.0.0:8080/bags/'
        'foo_private/tiddlers/private?callback=%s' % callback,
        method='GET',
        headers={
            'Cookie': 'tiddlyweb_user="%s"' % user_cookie,
            'Accept': 'application/json'
        })
    assert response['status'] == '401'

    response, _ = http.request('http://foo.0.0.0.0:8080/recipes/'
        'foo_private/tiddlers/private?callback=%s' % callback,
        method='GET',
        headers={
            'Cookie': 'tiddlyweb_user="%s"' % user_cookie,
            'Accept': 'application/json'
        })
    assert response['status'] == '401'

    response, _ = http.request('http://foo.0.0.0.0:8080/bags/foo_private?'
        'callback=%s' % callback,
        method='GET',
        headers={
            'Cookie': 'tiddlyweb_user="%s"' % user_cookie,
            'Accept': 'application/json'
        })
    assert response['status'] == '401'

    response, _ = http.request('http://foo.0.0.0.0:8080/recipes/foo_private?'
        'callback=%s' % callback,
        method='GET',
        headers={
            'Cookie': 'tiddlyweb_user="%s"' % user_cookie,
            'Accept': 'application/json'
        })
    assert response['status'] == '401'

    response, _ = http.request('http://foo.0.0.0.0:8080/bags/foo_private/'
        'tiddlers?callback=%s' % callback,
        method='GET',
        headers={
            'Cookie': 'tiddlyweb_user="%s"' % user_cookie,
            'Accept': 'application/json'
        })
    assert response['status'] == '401'

    response, _ = http.request('http://foo.0.0.0.0:8080/recipes/foo_private/'
        'tiddlers?callback=%s' % callback,
        method='GET',
        headers={
            'Cookie': 'tiddlyweb_user="%s"' % user_cookie,
            'Accept': 'application/json'
        })
    assert response['status'] == '401'

    response, _ = http.request('http://foo.0.0.0.0:8080/bags/'
        'foo_private/tiddlers/private',
        method='GET',
        headers={
            'Cookie': 'tiddlyweb_user="%s"' % user_cookie,
            'Accept': 'application/json'
        })
    assert response['status'] == '200'


def test_no_subdomain():
    """
    As it's JSONP, we need to protect the tiddlyspace.com domain as well
    (and not just the subdomains).

    This includes bags, recipes and search.
    """
    tiddler = Tiddler('private')
    tiddler.bag = 'foo_private'
    tiddler.text = 'some text'
    store.put(tiddler)

    user_cookie = get_auth('foo', 'foobar')
    callback = 'callback'

    response, _ = http.request('http://0.0.0.0:8080/bags/'
        'foo_private/tiddlers/private?callback=%s' % callback,
        method='GET',
        headers={
            'Cookie': 'tiddlyweb_user="%s"' % user_cookie,
            'Accept': 'application/json'
        })
    assert response['status'] == '401'

    response, _ = http.request('http://0.0.0.0:8080/recipes/'
        'foo_private/tiddlers/private?callback=%s' % callback,
        method='GET',
        headers={
            'Cookie': 'tiddlyweb_user="%s"' % user_cookie,
            'Accept': 'application/json'
        })
    assert response['status'] == '401'

    response, _ = http.request('http://0.0.0.0:8080/bags/foo_private?'
        'callback=%s' % callback,
        method='GET',
        headers={
            'Cookie': 'tiddlyweb_user="%s"' % user_cookie,
            'Accept': 'application/json'
        })
    assert response['status'] == '401'

    response, _ = http.request('http://0.0.0.0:8080/recipes/foo_private?'
        'callback=%s' % callback,
        method='GET',
        headers={
            'Cookie': 'tiddlyweb_user="%s"' % user_cookie,
            'Accept': 'application/json'
        })
    assert response['status'] == '401'

    response, _ = http.request('http://0.0.0.0:8080/bags/foo_private/'
        'tiddlers?callback=%s' % callback,
        method='GET',
        headers={
            'Cookie': 'tiddlyweb_user="%s"' % user_cookie,
            'Accept': 'application/json'
        })
    assert response['status'] == '401'

    response, _ = http.request('http://0.0.0.0:8080/recipes/foo_private/'
        'tiddlers?callback=%s' % callback,
        method='GET',
        headers={
            'Cookie': 'tiddlyweb_user="%s"' % user_cookie,
            'Accept': 'application/json'
        })
    assert response['status'] == '401'

    response, _ = http.request('http://0.0.0.0:8080/bags/'
        'foo_private/tiddlers/private',
        method='GET',
        headers={
            'Cookie': 'tiddlyweb_user="%s"' % user_cookie,
            'Accept': 'application/json'
        })
    assert response['status'] == '200'

    response, content = http.request('http://0.0.0.0:8080/search'
        '?q=bag:foo_private&callback=%s' % callback,
        method='GET',
        headers={
            'Cookie': 'tiddlyweb_user="%s"' % user_cookie,
            'Accept': 'application/json'
        })
    assert response['status'] == '200'
    assert content == 'callback([])'
