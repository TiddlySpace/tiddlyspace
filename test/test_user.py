"""
Test user creation, especially with regard
to validating names. This is important in the
tiddlyspace setting (as opposed to
tiddlywebplugins.socialusers which uses handles
user creation) because usernames are more constrained
there than they are in generic TiddlyWeb. The 
constraints are:

    * the usernames must be valid hostnames
    * the usernames must not conflict with the
      names of existing spaces and users

socialusers checks to see if a user exists after
it has validated the username. TiddlySpace needs
to override socialusers:_validate_user with its
own routines. These routines should check the above
constraints.
"""

import simplejson
import httplib2
import wsgi_intercept

from wsgi_intercept import httplib2_intercept

from test.fixtures import make_test_env, get_auth


def setup_module(module):
    make_test_env(module)

    httplib2_intercept.install()
    wsgi_intercept.add_wsgi_intercept('0.0.0.0', 8080, app_fn)
    wsgi_intercept.add_wsgi_intercept('cdent.0.0.0.0', 8080, app_fn)

    module.http = httplib2.Http()


def teardown_module(module):
    import os
    os.chdir('..')


def test_register_user():
    data = {'username': 'cdent', 'password': 'cowpig'}
    body = simplejson.dumps(data)
    response, content = http.request('http://0.0.0.0:8080/users',
            method='POST',
            headers={'Content-Type': 'application/json'},
            body=body)
    assert response['status'] == '201'

    response, content = http.request('http://0.0.0.0:8080/users',
            method='POST',
            headers={'Content-Type': 'application/json'},
            body=body)
    assert response['status'] == '409'
    assert 'exists' in content

    cookie = get_auth('cdent', 'cowpig')
    response, content = http.request('http://0.0.0.0:8080/spaces/cdent',
            headers={'Cookie': 'tiddlyweb_user="%s"' % cookie},
            method='PUT')
    assert response['status'] == '201'

    response, content = http.request('http://0.0.0.0:8080/spaces/cdent',
            headers={'Cookie': 'tiddlyweb_user="%s"' % cookie},
            method='PUT')
    assert response['status'] == '409'


def test_space_exist_no_user():
    cookie = get_auth('cdent', 'cowpig')
    response, content = http.request('http://0.0.0.0:8080/spaces/monkey',
            headers={'Cookie': 'tiddlyweb_user="%s"' % cookie},
            method='PUT')
    assert response['status'] == '201'

    data = {'username': 'monkey', 'password': 'cowpig'}
    body = simplejson.dumps(data)
    response, content = http.request('http://0.0.0.0:8080/users',
            method='POST',
            headers={'Content-Type': 'application/json'},
            body=body)
    assert response['status'] == '409'
    assert 'monkey already exists as space' in content


def test_username_bad_form():
    data = {'username': 'FatBoy', 'password': 'cowpig'}
    body = simplejson.dumps(data)
    response, content = http.request('http://0.0.0.0:8080/users',
            method='POST',
            headers={'Content-Type': 'application/json'},
            body=body)
    assert response['status'] == '409'
    assert 'must be valid host name' in content

    data = {'username': 'fat.boy', 'password': 'cowpig'}
    body = simplejson.dumps(data)
    response, content = http.request('http://0.0.0.0:8080/users',
            method='POST',
            headers={'Content-Type': 'application/json'},
            body=body)
    assert response['status'] == '409'
    assert 'must be valid host name' in content

    data = {'username': 'fat boy', 'password': 'cowpig'}
    body = simplejson.dumps(data)
    response, content = http.request('http://0.0.0.0:8080/users',
            method='POST',
            headers={'Content-Type': 'application/json'},
            body=body)
    assert response['status'] == '409'
    assert 'must be valid host name' in content
