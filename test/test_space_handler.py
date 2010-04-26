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


from test.fixtures import make_test_env, make_fake_space, get_auth

from wsgi_intercept import httplib2_intercept
import wsgi_intercept
import httplib2
import simplejson

from tiddlyweb.store import Store
from tiddlyweb.model.bag import Bag
from tiddlyweb.model.recipe import Recipe
from tiddlyweb.model.user import User

def setup_module(module):
    make_test_env()
    from tiddlyweb.config import config
    from tiddlyweb.web import serve
    # we have to have a function that returns the callable,
    # Selector just _is_ the callable
    def app_fn():
        return serve.load_app()
    httplib2_intercept.install()
    config['blacklisted_spaces'] = ['scrappy']
    wsgi_intercept.add_wsgi_intercept('0.0.0.0', 8080, app_fn)
    wsgi_intercept.add_wsgi_intercept('cdent.0.0.0.0', 8080, app_fn)
    module.store = Store(config['server_store'][0],
            config['server_store'][1], {'tiddlyweb.config': config})
    make_fake_space(module.store, 'cdent')
    user = User('cdent')
    user.set_password('cow')
    module.store.put(user)
    user = User('fnd')
    user.set_password('bird')
    module.store.put(user)
    user = User('psd')
    user.set_password('cat')
    module.store.put(user)


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


def test_space_members():
    http = httplib2.Http()
    response, content = http.request('http://0.0.0.0:8080/spaces/cdent/members',
            method='GET')
    assert response['status'] == '401'
    cookie = get_auth('cdent', 'cow')

    response, content = http.request('http://0.0.0.0:8080/spaces/cdent/members',
            headers={'Cookie': 'tiddlyweb_user="%s"' % cookie},
            method='GET')
    assert response['status'] == '200'
    info = simplejson.loads(content)
    assert info == ['cdent']

    response, content = http.request('http://0.0.0.0:8080/spaces/nancy/members',
            headers={'Cookie': 'tiddlyweb_user="%s"' % cookie},
            method='GET')
    response['status'] == '404'


def test_create_space():
    cookie = get_auth('cdent', 'cow')
    http = httplib2.Http()
    response, content = http.request('http://0.0.0.0:8080/spaces/cdent',
            headers={'Cookie': 'tiddlyweb_user="%s"' % cookie},
            method='PUT')
    assert response['status'] == '409'

    response, content = http.request('http://0.0.0.0:8080/spaces/extra',
            method='GET')
    assert response['status'] == '404'

    response, content = http.request('http://0.0.0.0:8080/spaces/extra',
            method='PUT')
    assert response['status'] == '403'

    response, content = http.request('http://0.0.0.0:8080/spaces/extra',
            method='PUT',
            headers={'Cookie': 'tiddlyweb_user="%s"' % cookie},
            )
    assert response['status'] == '201'

    response, content = http.request('http://0.0.0.0:8080/spaces/extra/members',
            headers={'Cookie': 'tiddlyweb_user="%s"' % cookie},
            method='GET')
    response['status'] == '200'
    info = simplejson.loads(content)
    assert info == ['cdent']

    bag = store.get(Bag('extra_public'))
    assert bag.policy.owner == 'cdent'
    assert bag.policy.read == []
    assert bag.policy.accept == ['NONE']
    assert bag.policy.manage == ['cdent']
    assert bag.policy.write == ['cdent']
    assert bag.policy.create == ['cdent']
    assert bag.policy.delete == ['cdent']

    bag = store.get(Bag('extra_private'))
    assert bag.policy.owner == 'cdent'
    assert bag.policy.read == ['cdent']
    assert bag.policy.accept == ['NONE']
    assert bag.policy.manage == ['cdent']
    assert bag.policy.write == ['cdent']
    assert bag.policy.create == ['cdent']
    assert bag.policy.delete == ['cdent']

    recipe = store.get(Recipe('extra_public'))
    assert recipe.policy.owner == 'cdent'
    assert recipe.policy.read == []
    assert recipe.policy.accept == ['NONE']
    assert recipe.policy.manage == ['cdent']
    assert recipe.policy.write == ['cdent']
    assert recipe.policy.create == ['cdent']
    assert recipe.policy.delete == ['cdent']
    recipe_list = recipe.get_recipe()
    assert len(recipe_list) == 3
    assert recipe_list[0][0] == 'system'
    assert recipe_list[1][0] == 'tiddlyspace'
    assert recipe_list[2][0] == 'extra_public'

    recipe = store.get(Recipe('extra_private'))
    recipe_list = recipe.get_recipe()
    assert recipe.policy.owner == 'cdent'
    assert recipe.policy.read == ['cdent']
    assert recipe.policy.accept == ['NONE']
    assert recipe.policy.manage == ['cdent']
    assert recipe.policy.write == ['cdent']
    assert recipe.policy.create == ['cdent']
    assert recipe.policy.delete == ['cdent']
    assert len(recipe_list) == 4
    assert recipe_list[0][0] == 'system'
    assert recipe_list[1][0] == 'tiddlyspace'
    assert recipe_list[2][0] == 'extra_public'
    assert recipe_list[3][0] == 'extra_private'


def test_case_in_space():
    cookie = get_auth('cdent', 'cow')
    http = httplib2.Http()
    response, content = http.request('http://0.0.0.0:8080/spaces/CeXtRa',
            method='PUT',
            headers={'Cookie': 'tiddlyweb_user="%s"' % cookie},
            )
    assert response['status'] == '409'


def test_add_a_member():
    cookie = get_auth('cdent', 'cow')
    http = httplib2.Http()
    response, content = http.request('http://0.0.0.0:8080/spaces/extra/members/fnd',
            method='PUT',
            )
    assert response['status'] == '403'

    http = httplib2.Http()
    response, content = http.request('http://0.0.0.0:8080/spaces/extra/members/fnd',
            headers={'Cookie': 'tiddlyweb_user="%s"' % cookie},
            method='PUT',
            )
    assert response['status'] == '204'

    response, content = http.request('http://0.0.0.0:8080/spaces/extra/members',
            headers={'Cookie': 'tiddlyweb_user="%s"' % cookie},
            method='GET')
    assert response['status'] == '200'
    info = simplejson.loads(content)
    assert info == ['cdent', 'fnd']

    bag = store.get(Bag('extra_private'))
    assert bag.policy.owner == 'cdent'
    assert bag.policy.read == ['cdent', 'fnd']
    assert bag.policy.accept == ['NONE']
    assert bag.policy.manage == ['cdent', 'fnd']
    assert bag.policy.write == ['cdent', 'fnd']
    assert bag.policy.create == ['cdent', 'fnd']
    assert bag.policy.delete == ['cdent', 'fnd']

    # authed user not in space may not add people
    cookie = get_auth('psd', 'cat')
    response, content = http.request('http://0.0.0.0:8080/spaces/extra/members/psd',
            headers={'Cookie': 'tiddlyweb_user="%s"' % cookie},
            method='PUT',
            )
    assert response['status'] == '403'

    cookie = get_auth('fnd', 'bird')
    response, content = http.request('http://0.0.0.0:8080/spaces/extra/members/psd',
            headers={'Cookie': 'tiddlyweb_user="%s"' % cookie},
            method='PUT',
            )
    assert response['status'] == '204'

    cookie = get_auth('fnd', 'bird')
    response, content = http.request('http://0.0.0.0:8080/spaces/extra/members/mary',
            headers={'Cookie': 'tiddlyweb_user="%s"' % cookie},
            method='PUT',
            )
    assert response['status'] == '409'


def test_delete_member():
    cookie = get_auth('fnd', 'bird')
    http = httplib2.Http()
    response, content = http.request('http://0.0.0.0:8080/spaces/extra/members/psd',
            method='DELETE',
            )
    assert response['status'] == '403'

    response, content = http.request('http://0.0.0.0:8080/spaces/extra/members/psd',
            headers={'Cookie': 'tiddlyweb_user="%s"' % cookie},
            method='DELETE',
            )
    assert response['status'] == '204'

    # delete self
    response, content = http.request('http://0.0.0.0:8080/spaces/extra/members/fnd',
            headers={'Cookie': 'tiddlyweb_user="%s"' % cookie},
            method='DELETE',
            )
    assert response['status'] == '204'

    bag = store.get(Bag('extra_private'))
    assert bag.policy.owner == 'cdent'
    assert bag.policy.read == ['cdent']
    assert bag.policy.accept == ['NONE']
    assert bag.policy.manage == ['cdent']
    assert bag.policy.write == ['cdent']
    assert bag.policy.create == ['cdent']
    assert bag.policy.delete == ['cdent']


def test_subscription():
    cookie = get_auth('cdent', 'cow')
    http = httplib2.Http()
    subscriptions = simplejson.dumps({'subscriptions': ['extra']})
    response, content = http.request('http://0.0.0.0:8080/spaces/cdent',
            method='POST',
            headers={
                'Content-Type': 'application/json',
                },
            body=subscriptions)
    assert response['status'] == '403'

    response, content = http.request('http://0.0.0.0:8080/spaces/cdent',
            method='POST',
            headers={
                'Content-Type': 'application/json',
                'Cookie': 'tiddlyweb_user="%s"' % cookie,
                },
            body=subscriptions)
    assert response['status'] == '204'


def test_blacklisted_subscription():
    cookie = get_auth('cdent', 'cow')
    http = httplib2.Http()
    response, content = http.request('http://0.0.0.0:8080/spaces/scrappy',
            method='PUT',
            headers={'Cookie': 'tiddlyweb_user="%s"' % cookie},
            )
    assert response['status'] == '201'

    subscriptions = simplejson.dumps({'subscriptions': ['scrappy']})

    response, content = http.request('http://0.0.0.0:8080/spaces/cdent',
            method='POST',
            headers={
                'Content-Type': 'application/json',
                'Cookie': 'tiddlyweb_user="%s"' % cookie,
                },
            body=subscriptions)
    assert response['status'] == '409'
    assert 'Subscription not allowed to space: scrappy' in content


def test_list_my_spaces():
    http = httplib2.Http()
    response, content = http.request('http://0.0.0.0:8080/spaces?mine=1',
            method='GET')
    assert response['status'] == '200'

    info = simplejson.loads(content)
    assert 'fnd' not in info
