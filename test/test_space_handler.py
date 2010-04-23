"""
Test and flesh a /spaces handler-space.

GET /spaces: list all spaces
GET /spaces/{space_name}: 204 if exist
GET /spaces/{space_name}/members: list all members
PUT /spaces/{space_name}: create a space
PUT /spaces/{space_name}/members/{member_name}: add a member
DELETE /spaces/{space_name}/members/{member_name}: remove a member
POST /spaces/{space_name}: Handle subscription, the data package is
  JSON as {"subscriptions": ["space1", "space2", "space3"]}
"""


from test.fixtures import make_test_env, make_fake_space

from wsgi_intercept import httplib2_intercept
import wsgi_intercept
import httplib2
import Cookie
import simplejson

from tiddlyweb.store import Store
from tiddlyweb.model.user import User

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


def test_spaces_list():
    http = httplib2.Http()
    response, content = http.request('http://0.0.0.0:8080/spaces',
            method='GET')
    assert response['status'] == '200'

    info = simplejson.loads(content)
    assert info == ['cdent']

    make_fake_space(store, 'fnd')
    response, content = http.request('http://0.0.0.0:8080/spaces',
            method='GET')
    assert response['status'] == '200'

    info = simplejson.loads(content)
    assert 'cdent' in info
    assert 'fnd' in info


def test_space_exist():
    http = httplib2.Http()
    response, content = http.request('http://0.0.0.0:8080/spaces/cdent',
            method='GET')
    assert response['status'] == '204'
    assert content == ''

    http = httplib2.Http()
    response, content = http.request('http://0.0.0.0:8080/spaces/nancy',
            method='GET')
    assert response['status'] == '404'
    assert 'nancy does not exist' in content
