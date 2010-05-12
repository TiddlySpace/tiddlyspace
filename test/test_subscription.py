import simplejson
import httplib2
import wsgi_intercept

from wsgi_intercept import httplib2_intercept

from tiddlyweb.store import Store
from tiddlyweb.model.recipe import Recipe
from tiddlyweb.model.user import User

from test.fixtures import make_test_env, make_fake_space, get_auth


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
    make_fake_space(module.store, 'fnd')
    make_fake_space(module.store, 'cdent')
    make_fake_space(module.store, 'psd')

    users = {
        'fnd': 'foo',
        'cdent': 'bar',
        'psd': 'baz'
    }
    for username, password in users.items():
        user = User(username)
        user.set_password(password)
        module.store.put(user)


def teardown_module(module):
    import os
    os.chdir('..')


def test_subscription():
    cookie = get_auth('fnd', 'foo')
    http = httplib2.Http()

    def add_subscription(subscribed, subscriber):
        subscriptions = simplejson.dumps({'subscriptions': [subscribed]})
        return http.request('http://0.0.0.0:8080/spaces/%s' % subscriber,
            method='POST', headers={
                'Content-Type': 'application/json',
                'Cookie': 'tiddlyweb_user="%s"' % cookie,
            }, body=subscriptions)

    response, content = add_subscription('cdent', 'fnd')
    assert response['status'] == '204'

    recipe = Recipe('fnd_public')
    recipe = store.get(recipe)
    recipe = recipe.get_recipe()
    assert len(recipe) == 4

    recipe = Recipe('fnd_private')
    recipe = store.get(recipe)
    recipe = recipe.get_recipe()
    assert len(recipe) == 5

    response, content = add_subscription('cdent', 'fnd') # identical to above
    assert response['status'] == '409'

    recipe = Recipe('fnd_public')
    recipe = store.get(recipe)
    recipe = recipe.get_recipe()
    assert len(recipe) == 4

    recipe = Recipe('fnd_private')
    recipe = store.get(recipe)
    recipe = recipe.get_recipe()
    assert len(recipe) == 5

    response, content = add_subscription('psd', 'fnd')
    assert response['status'] == '204'

    recipe = Recipe('fnd_public')
    recipe = store.get(recipe)
    recipe = recipe.get_recipe()
    assert len(recipe) == 5

    recipe = Recipe('fnd_private')
    recipe = store.get(recipe)
    recipe = recipe.get_recipe()
    assert len(recipe) == 6
