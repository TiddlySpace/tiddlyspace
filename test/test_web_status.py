"""
Tests that confirm that the overridden status
returns the right stuff.
"""

from test.fixtures import make_test_env, make_fake_space, get_auth

from wsgi_intercept import httplib2_intercept
import wsgi_intercept
import httplib2
import py.test
import simplejson

from tiddlyweb.model.user import User

from tiddlywebplugins.tiddlyspace import __version__ as VERSION
from tiddlywebplugins.tiddlyspace.spaces import change_space_member

def setup_module(module):
    make_test_env(module)
    httplib2_intercept.install()
    wsgi_intercept.add_wsgi_intercept('0.0.0.0', 8080, app_fn)
    wsgi_intercept.add_wsgi_intercept('thing.0.0.0.0', 8080, app_fn)
    wsgi_intercept.add_wsgi_intercept('unclaimed-space.0.0.0.0', 8080, app_fn)
    module.http = httplib2.Http()
    make_fake_space(store, 'thing')

def teardown_module(module):
    import os
    os.chdir('..')

def test_status_unclaimed_space():
    response, content = http.request('http://unclaimed-space.0.0.0.0:8080/status')
    assert response['status'] == '200'
    info = simplejson.loads(content)

    assert info['username'] == 'GUEST'
    assert info['tiddlyspace_version'] == VERSION
    assert info['server_host']['host'] == '0.0.0.0'
    assert info['server_host']['port'] == '8080'
    assert 'space' not in info

def test_status_base():
    response, content = http.request('http://0.0.0.0:8080/status')
    assert response['status'] == '200'
    info = simplejson.loads(content)

    assert info['username'] == 'GUEST'
    assert info['tiddlyspace_version'] == VERSION
    assert info['server_host']['host'] == '0.0.0.0'
    assert info['server_host']['port'] == '8080'
    assert 'space' not in info

def test_status_space():
    response, content = http.request('http://thing.0.0.0.0:8080/status')
    assert response['status'] == '200'
    info = simplejson.loads(content)

    assert info['username'] == 'GUEST'
    assert info['tiddlyspace_version'] == VERSION
    assert info['server_host']['host'] == '0.0.0.0'
    assert info['server_host']['port'] == '8080'
    assert info['space']['name'] == 'thing'
    assert info['space']['recipe'] == 'thing_public'

def test_status_base_auth():
    user = User('foo')
    user.set_password('foobar')
    store.put(user)
    user_cookie = get_auth('foo', 'foobar')
    change_space_member(store, 'thing', add='foo')

    response, content = http.request('http://0.0.0.0:8080/status',
            headers={'Cookie': 'tiddlyweb_user="%s"' % user_cookie})

    assert response['status'] == '200'
    info = simplejson.loads(content)
    assert info['username'] == 'foo'
    assert 'space' not in info

def test_status_space_auth():
    user_cookie = get_auth('foo', 'foobar')
    response, content = http.request('http://thing.0.0.0.0:8080/status',
            headers={'Cookie': 'tiddlyweb_user="%s"' % user_cookie})

    assert response['status'] == '200'
    info = simplejson.loads(content)
    assert info['username'] == 'foo'
    assert info['space']['name'] == 'thing'
    assert info['space']['recipe'] == 'thing_private'
