"""
Tests to ensure that POST requests all come from the same domain.

i.e. tests that ensure we are not vulnerable to CSRF
"""

from fixtures import make_test_env, make_fake_space, get_auth

from wsgi_intercept import httplib2_intercept
import wsgi_intercept
import httplib2
import simplejson


from tiddlywebplugins.utils import get_store
from tiddlyweb.config import config
from tiddlyweb.model.tiddler import Tiddler
from tiddlyweb.model.user import User
from tiddlywebplugins.tiddlyspace.validator import CsrfProtector, InvalidNonceError


def setup_module(module):
    make_test_env(module)
    # we have to have a function that returns the callable,
    # Selector just _is_ the callable
    httplib2_intercept.install()
    wsgi_intercept.add_wsgi_intercept('0.0.0.0', 8080, app_fn)
    module.http = httplib2.Http()


def teardown_module(module):
    import os
    os.chdir('..')


def test_validator_no_nonce():
    """
    test the validator directly
    ensure that it fails when the nonce is not present
    """
    store = get_store(config)
    try:
        csrf = CsrfProtector({})
        result = csrf.check_csrf(store, 'foo', None)
        raise AssertionError('check_csrf succeeded when no nonce supplied')
    except InvalidNonceError, exc:
        assert exc.message == 'No nonce supplied'

def test_validator_no_nonce_in_bag():
    """
    test the validator directly
    ensure that it fails when the nonce tiddler does not exist inside the
    private bag
    """
    store = get_store(config)
    try:
        csrf = CsrfProtector({})
        result = csrf.check_csrf(store, 'foo', 'None')
        raise AssertionError('check_csrf succeeded when no nonce in bag')
    except InvalidNonceError, exc:
        assert exc.message == 'No nonce found in foo space'

def test_validator_nonce_success():
    """
    test the validator directly
    ensure that it succeeds when the nonce passed in matches the nonce tiddler
    """
    store = get_store(config)
    nonce = 'dwaoiju277218ywdhdnakas72'
    space = 'foo'
    make_fake_space(store, space)
    tiddler = Tiddler('nonce')
    tiddler.fields['nonce'] = nonce
    tiddler.bag = '%s_private' % space
    store.put(tiddler)

    csrf = CsrfProtector({})
    result = csrf.check_csrf(store, space, nonce)

    assert result == True

def test_validator_nonce_fail():
    """
    test the validator directly
    ensure that it fails when the nonce doesn't match
    """
    store = get_store(config)
    nonce = 'dwaoiju277218ywdhdnakas72'
    space = 'foo'
    make_fake_space(store, space)
    tiddler = Tiddler('nonce')
    tiddler.fields['nonce'] = 'not the real nonce'
    tiddler.bag = '%s_private' % space
    store.put(tiddler)

    try:
        csrf = CsrfProtector({})
        result = csrf.check_csrf(store, space, nonce)
        raise AssertionError('check_csrf succeeded when nonce didn\'t match')
    except InvalidNonceError, exc:
        assert exc.message == 'Nonce doesn\'t match'

def test_post_data_form_urlencoded():
    """
    test that a form POST requires a nonce
    test using application/x-www-form-urlencoded
    """
    store = get_store(config)
    nonce = 'osfsiufn9hf9w3r3njsn ief'
    space = 'foo'
    make_fake_space(store, space)
    tiddler = Tiddler('nonce')
    tiddler.fields['nonce'] = nonce
    tiddler.bag = '%s_private' % space
    store.put(tiddler)
    user = User('foo')
    user.set_password('foobar')
    store.put(user)

    user_cookie = get_auth('foo', 'foobar')
    data = 'title=foobar&text=hello%20world'

    #test success
    response, _ = http.request('http://0.0.0.0:8080/bags/foo_public/tiddlers',
        method='POST',
        headers={
            'Content-type': 'application/x-www-form-urlencoded',
            'Cookie': 'tiddlyweb_user="%s"' % user_cookie
        },
        body='%s&nonce=%s' % (data, nonce))
    assert response['status'] == '204'

    #test failure
    response, _ = http.request('http://0.0.0.0:8080/bags/foo_public/tiddlers',
        method='POST',
        headers={
            'Content-type': 'application/x-www-form-urlencoded',
            'Cookie': 'tiddlyweb_user="%s"' % user_cookie
        },
        body='%s' % data)
    assert response['status'] == '400'


def test_post_data_multipart_form():
    """
    test that a form POST requires a nonce
    test using multipart/form-data
    """
    store = get_store(config)
    nonce = 'osfsiufn9hf9w3r3njsnief'
    space = 'foo'
    make_fake_space(store, space)
    tiddler = Tiddler('nonce')
    tiddler.fields['nonce'] = nonce
    tiddler.bag = '%s_private' % space
    store.put(tiddler)
    user = User('foo')
    user.set_password('foobar')
    store.put(user)

    user_cookie = get_auth('foo', 'foobar')
    data = '''---------------------------168072824752491622650073
Content-Disposition: form-data; name="title"

foobar
---------------------------168072824752491622650073
Content-Disposition: form-data; name="text"

Hello World
---------------------------168072824752491622650073--'''

    #test success
    uri = 'http://0.0.0.0:8080/bags/foo_public/tiddlers?nonce=%s' % nonce
    response, _ = http.request(uri,
        method='POST',
        headers={
            'Content-Type': 'multipart/form-data; ' \
            'boundary=---------------------------168072824752491622650073',
            'Cookie': 'tiddlyweb_user="%s"' % user_cookie,
            'Content-Length': '390'
        },
        body=data)
    assert response['status'] == '204'

    #test failure
    response, _ = http.request('http://0.0.0.0:8080/bags/foo_public/tiddlers',
        method='POST',
        headers={
            'Content-Type': 'multipart/form-data; ' \
            'boundary=---------------------------168072824752491622650073',
            'Cookie': 'tiddlyweb_user="%s"' % user_cookie,
            'Content-Length': '267'
        },
        body=data)
    assert response['status'] == '400'

def test_nonce_not_left_over():
    """
    Test that the nonce is not left over in the tiddler after a POST
    i.e. check that it is removed before the request continues
    """
    store = get_store(config)
    nonce = 'osfsiufn9hf9w3r3njsn ief'
    space = 'foo'
    make_fake_space(store, space)
    tiddler = Tiddler('nonce')
    tiddler.fields['nonce'] = nonce
    tiddler.bag = '%s_private' % space
    store.put(tiddler)
    user = User('foo')
    user.set_password('foobar')
    store.put(user)

    user_cookie = get_auth('foo', 'foobar')
    data = 'title=foobar&text=hello%20world&extra_field=baz'

    #test success
    response, _ = http.request('http://0.0.0.0:8080/bags/foo_public/tiddlers',
        method='POST',
        headers={
            'Content-type': 'application/x-www-form-urlencoded',
            'Cookie': 'tiddlyweb_user="%s"' % user_cookie
        },
        body='%s&nonce=%s' % (data, nonce))
    assert response['status'] == '204'

    new_tiddler = Tiddler('foobar')
    new_tiddler.bag = 'foo_public'
    new_tiddler = store.get(new_tiddler)

    assert new_tiddler.title == 'foobar'
    assert new_tiddler.text == 'hello world'
    assert new_tiddler.fields.get('extra_field') == 'baz'
    assert new_tiddler.fields.get('nonce') == None

