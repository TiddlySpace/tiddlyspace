"""
An auxbag is a bag that is visible in a space but not
in the recipes that make up the space. This is useful
for apps.

There are security concerns here which need to be fleshed out,
primarily related to what entities can create entries in the
auxbags record.
"""

from test.fixtures import make_test_env, make_fake_space, get_auth

from wsgi_intercept import httplib2_intercept
import wsgi_intercept
import httplib2
import simplejson

from tiddlyweb.model.tiddler import Tiddler
from tiddlyweb.model.recipe import Recipe
from tiddlyweb.model.bag import Bag
from tiddlyweb.model.user import User


def setup_module(module):
    make_test_env(module)
    httplib2_intercept.install()
    wsgi_intercept.add_wsgi_intercept('0.0.0.0', 8080, app_fn)
    wsgi_intercept.add_wsgi_intercept('thing.0.0.0.0', 8080, app_fn)
    wsgi_intercept.add_wsgi_intercept('other.0.0.0.0', 8080, app_fn)
    make_fake_space(store, 'thing')
    make_fake_space(store, 'other')
    user = User('thing')
    user.set_password('monkey')
    store.put(user)
    module.user_cookie = get_auth('thing', 'monkey')
    module.http = httplib2.Http()

def teardown_module(module):
    import os
    os.chdir('..')

def content_check(content, isin=None, notin=None):
    if isin is None:
        isin = []
    if notin is None:
        notin = []
    for fragment in isin:
        assert fragment in content
    for fragment in notin:
        assert fragment not in content

def test_check_default_bags():
    response, content = http.request('http://0.0.0.0:8080/bags.txt')
    assert response['status'] == '200'
    content_check(content, isin=['system', 'thing_public', 'other_public'],
            notin=['thing_private', 'other_private'])

    response, content = http.request('http://0.0.0.0:8080/bags.txt',
            headers={'Cookie': 'tiddlyweb_user="%s"' % user_cookie})
    assert response['status'] == '200'
    content_check(content, isin=['system', 'thing_public', 'other_public',
        'thing_private'], notin=['other_private'])

    response, content = http.request('http://thing.0.0.0.0:8080/bags.txt',
            headers={'Cookie': 'tiddlyweb_user="%s"' % user_cookie})
    assert response['status'] == '200'
    content_check(content, isin=['system', 'thing_public', 'thing_private'],
            notin=['other_public', 'other_private'])

    response, content = http.request('http://thing.0.0.0.0:8080/bags.txt')
    assert response['status'] == '200'
    content_check(content, isin=['system', 'thing_public'],
            notin=['thing_private', 'other_public', 'other_private'])

    response, content = http.request('http://thing.0.0.0.0:8080/bags.txt',
            headers={'Cookie': 'tiddlyweb_user="%s"' % user_cookie,
                'X-ControlView': 'false'})
    content_check(content, isin=['system', 'thing_public', 'thing_private',
        'other_public'], notin=['other_private'])

def test_extra_bag():
    bag = Bag('everybodybag')
    store.put(bag)

    response, content = http.request('http://0.0.0.0:8080/bags.txt')
    assert response['status'] == '200'
    content_check(content, isin=['everybodybag'])

    response, content = http.request('http://thing.0.0.0.0:8080/bags.txt')
    assert response['status'] == '200'
    content_check(content, notin=['everybodybag'])
