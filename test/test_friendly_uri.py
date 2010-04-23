"""
Test so-called "friendly" uris: links to tiddlers
in the current space from the root.
"""


from test.fixtures import make_test_env, make_fake_space

from wsgi_intercept import httplib2_intercept
import wsgi_intercept
import httplib2
import Cookie

from tiddlyweb.store import Store
from tiddlyweb.model.user import User
from tiddlyweb.model.tiddler import Tiddler

AUTH_COOKIE = None

def setup_module(module):
    make_test_env()
    from tiddlyweb.config import config
    from tiddlyweb.web import serve
    # we have to have a function that returns the callable,
    # Selector just _is_ the callable
    def app_fn():
        return serve.load_app()
    httplib2_intercept.install()
    wsgi_intercept.add_wsgi_intercept('0.0.0.0', 8080, app_fn)
    wsgi_intercept.add_wsgi_intercept('cdent.0.0.0.0', 8080, app_fn)
    module.store = Store(config['server_store'][0],
            config['server_store'][1], {'tiddlyweb.config': config})
    make_fake_space(module.store, 'cdent')
    user = User('cdent')
    user.set_password('cow')


def teardown_module(module):
    import os
    os.chdir('..')


def get_auth():
    http = httplib2.Http()
    response, content = http.request(
            'http://0.0.0.0:8080/challenge/tiddlywebplugins.tiddlyspace.challenger',
            body='user=cdent&password=cow',
            method='POST',
            headers={'Content-Type': 'application/x-www-form-urlencoded'})
    assert response.previous['status'] == '303'

    user_cookie = response.previous['set-cookie']
    cookie = Cookie.SimpleCookie()
    cookie.load(user_cookie)
    return cookie['tiddlyweb_user'].value


def test_friendly():
    http = httplib2.Http()
    response, content_core = http.request(
            'http://cdent.0.0.0.0:8080/recipes/cdent_public/tiddlers/TiddlyWebConfig',
            method='GET')
        
    assert response['status'] == '200'

    response, content_friendly = http.request(
            'http://cdent.0.0.0.0:8080/TiddlyWebConfig',
            method='GET')
    assert response['status'] == '200'
    assert content_core == content_friendly

    response, content_friendly = http.request(
            'http://0.0.0.0:8080/TiddlyWebConfig',
            method='GET')
    assert response['status'] == '404'
