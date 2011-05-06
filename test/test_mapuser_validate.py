"""
Test creation of tiddlers in the MAPUSER bag.

The name of the tiddler is the external auth usersign.
The PUT tiddler is empty. A validator sets
fields['mapped_user'] to the current usersign.name.

Note: This does not test the way in which the MAPUSER
information is used by the extractor. Just the proper
creation of the tiddlers.
"""

import wsgi_intercept
import httplib2
import Cookie
import simplejson

from wsgi_intercept import httplib2_intercept

from tiddlyweb.model.user import User
from tiddlyweb.model.tiddler import Tiddler
from tiddlyweb.web.util import make_cookie

from test.fixtures import make_test_env


AUTH_COOKIE = None


def setup_module(module):
    make_test_env(module)
    from tiddlyweb.config import config
    module.secret = config['secret']
    httplib2_intercept.install()
    wsgi_intercept.add_wsgi_intercept('0.0.0.0', 8080, app_fn)
    user = User('cdent')
    user.set_password('cow')
    module.store.put(user)
    user = User('fnd')
    module.store.put(user)


def teardown_module(module):
    import os
    os.chdir('..')


def test_create_map_requires_user():
    http = httplib2.Http()
    response, content = http.request(
            'http://0.0.0.0:8080/bags/MAPUSER/tiddlers/x.auth.thing',
            method='PUT',
            headers={'Content-Type': 'application/json'},
            body='{}')

    assert response['status'] == '403'


def test_create_map_uses_user():
    global AUTH_COOKIE
    http = httplib2.Http()
    response, content = http.request(
            'http://0.0.0.0:8080/challenge/tiddlywebplugins.tiddlyspace.cookie_form',
            body='user=cdent&password=cow',
            method='POST',
            headers={'Content-Type': 'application/x-www-form-urlencoded'})
    assert response.previous['status'] == '303'

    user_cookie = response.previous['set-cookie']
    cookie = Cookie.SimpleCookie()
    cookie.load(user_cookie)
    AUTH_COOKIE = cookie['tiddlyweb_user'].value

    bad_second_cookie = make_cookie('tiddlyweb_secondary_user',
            'x.auth.thing', mac_key='slippy')
    mismatch_second_cookie = make_cookie('tiddlyweb_secondary_user',
            'y.auth.thing', mac_key=secret)
    second_cookie = make_cookie('tiddlyweb_secondary_user',
            'x.auth.thing', mac_key=secret)

# we must have the second cookie
    response, content = http.request(
            'http://0.0.0.0:8080/bags/MAPUSER/tiddlers/x.auth.thing',
            method='PUT',
            headers={'Content-Type': 'application/json',
                'Cookie': 'tiddlyweb_user="%s"' % AUTH_COOKIE},
            body='{"text":"house"}')
    assert response['status'] == '409', content
    assert 'secondary cookie not present' in content

    response, content = http.request(
            'http://0.0.0.0:8080/bags/MAPUSER/tiddlers/x.auth.thing',
            method='PUT',
            headers={'Content-Type': 'application/json',
                'Cookie': 'tiddlyweb_user="%s"; %s' % (
                    AUTH_COOKIE, bad_second_cookie)},
            body='{"text":"house"}')
    assert response['status'] == '409', content
    assert 'secondary cookie invalid' in content

    response, content = http.request(
            'http://0.0.0.0:8080/bags/MAPUSER/tiddlers/x.auth.thing',
            method='PUT',
            headers={'Content-Type': 'application/json',
                'Cookie': 'tiddlyweb_user="%s"; %s' % (
                    AUTH_COOKIE, mismatch_second_cookie)},
            body='{"text":"house"}')
    assert response['status'] == '409', content
    assert 'secondary cookie mismatch' in content

    response, content = http.request(
            'http://0.0.0.0:8080/bags/MAPUSER/tiddlers/x.auth.thing',
            method='PUT',
            headers={'Content-Type': 'application/json',
                'Cookie': 'tiddlyweb_user="%s"; %s' % (
                    AUTH_COOKIE, second_cookie)},
            body='{"text":"house"}')
    assert response['status'] == '204'

    response, content = http.request(
            'http://0.0.0.0:8080/bags/MAPUSER/tiddlers/x.auth.thing',
            method='GET',
            headers={'Accept': 'application/json',
                'Cookie': 'tiddlyweb_user="%s"; %s' % (
                    AUTH_COOKIE, second_cookie)})
    assert response['status'] == '403'
    assert 'may not read' in content 

    tiddler = Tiddler('x.auth.thing', 'MAPUSER')
    tiddler = store.get(tiddler)
    assert tiddler.modifier == 'cdent'
    assert tiddler.text == ''
    assert 'mapped_user' in tiddler.fields
    assert tiddler.fields['mapped_user'] == 'cdent'

    response, content = http.request(
            'http://0.0.0.0:8080/bags/MAPUSER/tiddlers/x.auth.thing',
            method='PUT',
            headers={'Content-Type': 'application/json',
                'Cookie': 'tiddlyweb_user="%s"; %s' % (
                    AUTH_COOKIE, second_cookie)},
            body='{}')
    assert response['status'] == '403'
    assert 'may not write' in content


def test_user_may_not_map_user():
    """Make user X can't map user Y to themselves."""
    global AUTH_COOKIE
    second_cookie = make_cookie('tiddlyweb_secondary_user',
            'fnd', mac_key=secret)
    http = httplib2.Http()
    response, content = http.request(
            'http://0.0.0.0:8080/bags/MAPUSER/tiddlers/fnd',
            method='PUT',
            headers={'Content-Type': 'application/json',
                'Cookie': 'tiddlyweb_user="%s"; %s' % (
                    AUTH_COOKIE, second_cookie)},
            body='{}')
    assert response['status'] == '409'
    assert 'username exists' in content


def test_user_may_not_map_self():
    """Make user X can't map user Y to themselves."""
    global AUTH_COOKIE
    second_cookie = make_cookie('tiddlyweb_secondary_user',
            'cdent', mac_key=secret)
    http = httplib2.Http()
    response, content = http.request(
            'http://0.0.0.0:8080/bags/MAPUSER/tiddlers/cdent',
            method='PUT',
            headers={'Content-Type': 'application/json',
                'Cookie': 'tiddlyweb_user="%s"; %s' % (
                    AUTH_COOKIE, second_cookie)},
            body='{}')
    assert response['status'] == '409'
    assert 'username exists' in content


def test_user_maps_info():
    """User can get their own identities at /users/{username}/identities"""
    global AUTH_COOKIE
    http = httplib2.Http()

# auth required
    response, content = http.request(
            'http://0.0.0.0:8080/users/cdent/identities',
            method='GET')
    assert response['status'] == '401'

# user can get own identities
    response, content = http.request(
            'http://0.0.0.0:8080/users/cdent/identities',
            method='GET',
            headers={'Cookie': 'tiddlyweb_user="%s"' % AUTH_COOKIE})
    assert response['status'] == '200', content

    info = simplejson.loads(content)
    assert 'x.auth.thing' in info, info

    tiddler = Tiddler('fnd.example.org', 'MAPUSER')
    tiddler.fields['mapped_user'] = 'fnd'
    tiddler = store.put(tiddler)
    tiddler = Tiddler('cdent.example.com', 'MAPUSER')
    tiddler.fields['mapped_user'] = 'cdent'
    tiddler = store.put(tiddler)

    response, content = http.request(
            'http://0.0.0.0:8080/users/cdent/identities',
            method='GET',
            headers={'Cookie': 'tiddlyweb_user="%s"' % AUTH_COOKIE})
    identities = simplejson.loads(content)
    assert response['status'] == '200', content
    assert len(identities) == 2
    assert 'x.auth.thing' in identities
    assert 'cdent.example.com' in identities
    assert 'fnd.example.org' not in identities

# user can't get other identities
    response, content = http.request(
            'http://0.0.0.0:8080/users/fnd/identities',
            method='GET',
            headers={'Cookie': 'tiddlyweb_user="%s"' % AUTH_COOKIE})
    assert response['status'] == '403'
    assert 'Bad user for action' in content

# admin can get other identities
    user = store.get(User('cdent'))
    user.add_role('ADMIN')
    store.put(user)
    response, content = http.request(
            'http://0.0.0.0:8080/users/fnd/identities',
            method='GET',
            headers={'Cookie': 'tiddlyweb_user="%s"' % AUTH_COOKIE})
    assert response['status'] == '200'
    identities = simplejson.loads(content)
    assert identities == ['fnd.example.org']
