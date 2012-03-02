"""
Test safe mode which allows a member to recover a space
which has gone pear shaped as a result of the wrong or 
dangerous plugins.
"""

from test.fixtures import make_test_env, make_fake_space

from wsgi_intercept import httplib2_intercept
import wsgi_intercept
import httplib2
import simplejson
import Cookie

from tiddlyweb.model.user import User
from tiddlyweb.model.tiddler import Tiddler

AUTH_COOKIE = None

def setup_module(module):
    make_test_env(module)
    httplib2_intercept.install()
    wsgi_intercept.add_wsgi_intercept('0.0.0.0', 8080, app_fn)
    wsgi_intercept.add_wsgi_intercept('cdent.0.0.0.0', 8080, app_fn)
    make_fake_space(module.store, 'cdent')
    user = User('cdent')
    user.set_password('cow')
    module.store.put(user)
    module.http = httplib2.Http()


def teardown_module(module):
    import os
    os.chdir('..')


def test_safe_403():
    response, content = http.request('http://cdent.0.0.0.0:8080/_safe',
            method='GET',
            headers={'Accept': 'application/json'})

    assert response['status'] == '403'
    assert 'membership required' in content

    response, content = http.request('http://cdent.0.0.0.0:8080/_safe',
            method='POST',
            headers={'Accept': 'application/json'})

    assert response['status'] == '403'
    assert 'membership required' in content

def test_safe_exists():
    global AUTH_COOKIE
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

    response, content = http.request('http://cdent.0.0.0.0:8080/_safe',
            method='GET',
            headers={'Accept': 'application/json',
                'Cookie': 'tiddlyweb_user="%s"' % AUTH_COOKIE})

    assert response['status'] == '200'
    assert 'form' in content
    assert 'Are you sure' in content

    response, content = http.request('http://cdent.0.0.0.0:8080/_safe',
            method='POST',
            headers={'Content-Type': 'application/json',
                'Cookie': 'tiddlyweb_user="%s"' % AUTH_COOKIE})

    assert response['status'] == '200'
    tiddlers = simplejson.loads(content)
    tiddlers_info = [(tiddler['title'], tiddler['bag']) for tiddler in tiddlers]
    bags = set(bag for title, bag in tiddlers_info)
    assert sorted(list(bags)) == ['system', 'system-images_public',
            'system-info_public', 'system-plugins_public',
            'system-theme_public', 'tiddlyspace']

    assert ('TiddlyWebAdaptor', 'system') in tiddlers_info

    tiddler = Tiddler('cdentSetupFlag', 'cdent_private')
    store.put(tiddler)
    response, content = http.request('http://cdent.0.0.0.0:8080/',
            method='GET',
            headers={'Accept': 'application/json',
                'Cookie': 'tiddlyweb_user="%s"' % AUTH_COOKIE})

    assert response['status'] == '200'
    tiddlers = simplejson.loads(content)
    tiddlers_info = [(tiddler['title'], tiddler['bag']) for tiddler in tiddlers]
    bags = set(bag for title, bag in tiddlers_info)
    assert sorted(list(bags)) == ['cdent_private', 'system',
            'system-images_public', 'system-info_public',
            'system-plugins_public', 'system-theme_public', 'tiddlyspace']

    assert ('TiddlyWebAdaptor', 'system') in tiddlers_info


def test_safe_mode_deletes_bad():
    tiddler = {'text': 'oh hai', 'tags': ['fun', 'systemConfig']}
    body = simplejson.dumps(tiddler)

    response, content = http.request(
            'http://cdent.0.0.0.0:8080/recipes/cdent_private/tiddlers/TiddlyWebAdaptor',
            method='PUT',
            body=body,
            headers={'Content-Type': 'application/json',
                'Cookie': 'tiddlyweb_user="%s"' % AUTH_COOKIE})
    assert response['status'] == '204'

    response, content = http.request(
            'http://cdent.0.0.0.0:8080/recipes/cdent_private/tiddlers/helloplugin',
            method='PUT',
            body=body,
            headers={'Content-Type': 'application/json',
                'Cookie': 'tiddlyweb_user="%s"' % AUTH_COOKIE})
    assert response['status'] == '204'

    response, content = http.request('http://cdent.0.0.0.0:8080/',
            method='GET',
            headers={'Accept': 'application/json',
                'Cookie': 'tiddlyweb_user="%s"' % AUTH_COOKIE})

    assert response['status'] == '200'
    tiddlers = simplejson.loads(content)
    tiddlers_info = [(tiddler['title'], tiddler['bag']) for tiddler in tiddlers]
    bags = set(bag for title, bag in tiddlers_info)
    assert sorted(list(bags)) == ['cdent_private', 'system',
            'system-images_public', 'system-info_public',
            'system-plugins_public', 'system-theme_public', 'tiddlyspace']

    assert ('TiddlyWebAdaptor', 'cdent_private') in tiddlers_info
    assert ('helloplugin', 'cdent_private') in tiddlers_info

    response, content = http.request('http://cdent.0.0.0.0:8080/_safe',
            method='POST',
            headers={'Content-Type': 'application/json',
                'Cookie': 'tiddlyweb_user="%s"' % AUTH_COOKIE})

    assert response['status'] == '200'
    tiddlers = simplejson.loads(content)
    tiddlers_info = [(tiddler['title'], tiddler['bag']) for tiddler in tiddlers]
    bags = set(bag for title, bag in tiddlers_info)
    assert sorted(list(bags)) == ['cdent_private', 'system',
            'system-images_public', 'system-info_public',
            'system-plugins_public', 'system-theme_public', 'tiddlyspace']

    assert ('TiddlyWebAdaptor', 'system') in tiddlers_info
    assert ('helloplugin', 'cdent_private') in tiddlers_info

    our_tiddler = [tiddler for tiddler in tiddlers if tiddler['title'] == 'helloplugin'][0]

    assert sorted(our_tiddler['tags']) == ['fun', 'systemConfig', 'systemConfigDisable']
