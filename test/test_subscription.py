import simplejson
import httplib2
import wsgi_intercept

from wsgi_intercept import httplib2_intercept

from tiddlyweb.model.recipe import Recipe
from tiddlyweb.model.user import User

from test.fixtures import make_test_env, make_fake_space, get_auth


def setup_module(module):
    make_test_env(module)

    httplib2_intercept.install()
    wsgi_intercept.add_wsgi_intercept('0.0.0.0', 8080, app_fn)
    wsgi_intercept.add_wsgi_intercept('cdent.0.0.0.0', 8080, app_fn)

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


def remove_subscription(subscribed, subscriber, cookie=None):
    return add_subscription(subscribed, subscriber, cookie=cookie,
            unsubscribe=True)

def add_subscription(subscribed, subscriber, cookie=None, unsubscribe=False):
    if not cookie:
        cookie = get_auth('fnd', 'foo')
    http = httplib2.Http()
    if unsubscribe:
        subscriptions = simplejson.dumps({'unsubscriptions': [subscribed]})
    else:
        subscriptions = simplejson.dumps({'subscriptions': [subscribed]})
    return http.request('http://0.0.0.0:8080/spaces/%s' % subscriber,
        method='POST', headers={
            'Content-Type': 'application/json',
            'Cookie': 'tiddlyweb_user="%s"' % cookie,
        }, body=subscriptions)


def test_subscription():
    response, content = add_subscription('cdent', 'fnd')
    assert response['status'] == '204'

    recipe = Recipe('fnd_public')
    recipe = store.get(recipe)
    recipe = recipe.get_recipe()
    assert len(recipe) == 8

    recipe = Recipe('fnd_private')
    recipe = store.get(recipe)
    recipe = recipe.get_recipe()
    assert len(recipe) == 9

    response, content = add_subscription('cdent', 'fnd') # identical to above
    assert response['status'] == '409'

    response, content = add_subscription('cdent', 'Fnd') # bad space
    assert response['status'] == '409'

    response, content = add_subscription('cDent', 'fnd') # bad space
    assert response['status'] == '409'

    recipe = Recipe('fnd_public')
    recipe = store.get(recipe)
    recipe = recipe.get_recipe()
    assert len(recipe) == 8

    recipe = Recipe('fnd_private')
    recipe = store.get(recipe)
    recipe = recipe.get_recipe()
    assert len(recipe) == 9

    response, content = add_subscription('psd', 'fnd')
    assert response['status'] == '204'

    recipe = Recipe('fnd_public')
    recipe = store.get(recipe)
    recipe = recipe.get_recipe()
    assert len(recipe) == 9

    recipe = Recipe('fnd_private')
    recipe = store.get(recipe)
    recipe = recipe.get_recipe()
    assert len(recipe) == 10


def test_mutual_subscription():
    """
    Subscription should not result in the same bag showing up more than once.
    """
    response, content = add_subscription('fnd', 'cdent', cookie=get_auth('cdent', 'bar'))
    assert response['status'] == '204'

    recipe = store.get(Recipe('cdent_public'))
    bags = [bag for bag, filter in recipe.get_recipe()]
    unique_bags = list(set(bags))
    assert len(bags) == len(unique_bags)


def test_unsubscribe():
    """
    Remove a space from a subscription list.
    XXX What happens when there's additional bags (other than public
    and private) from the recipe of the subscribed space and the subscribed
    space has changed since we first subscribed. How do we know what to remove
    from the recipe?
    XXX And what happens with subscription in general if a space is subscribed
    to another space that then goes away? (A non-existent bag in a recipe will
    cause an error)
    """
    response, content = remove_subscription('psd', 'fnd')
    assert response['status'] == '204'

    recipe = Recipe('fnd_public')
    recipe = store.get(recipe)
    recipe = recipe.get_recipe()
    assert len(recipe) == 8

    recipe = Recipe('fnd_private')
    recipe = store.get(recipe)
    recipe = recipe.get_recipe()
    assert len(recipe) == 9

    # do it with non-existent space
    response, content = remove_subscription('spanner', 'fnd')
    assert response['status'] == '409'
    assert 'Invalid content for unsubscription' in content

    recipe = Recipe('fnd_public')
    recipe = store.get(recipe)
    recipe = recipe.get_recipe()
    assert len(recipe) == 8

    recipe = Recipe('fnd_private')
    recipe = store.get(recipe)
    recipe = recipe.get_recipe()
    assert len(recipe) == 9

    # unsubscribe self?
    response, content = remove_subscription('fnd', 'fnd')
    assert response['status'] == '409'
    assert 'Attempt to unsubscribe self' in content

    recipe = Recipe('fnd_public')
    recipe = store.get(recipe)
    recipe = recipe.get_recipe()
    assert len(recipe) == 8

    recipe = Recipe('fnd_private')
    recipe = store.get(recipe)
    recipe = recipe.get_recipe()
    assert len(recipe) == 9

    # unsubscribe mutuality
    # We don't want a subscribed-to space which has subscribed to the
    # subscribing space to cause removal of one's own bags
    # In this test cdent is subscribed to fnd and fnd is subscribed
    # to cdent. We only want to remove the cdent bags.
    # The solution in code is not perfect because we only
    # make the match based on bag.name, not [bag, filter].
    response, content = remove_subscription('cdent', 'fnd')
    assert response['status'] == '204'

    recipe = Recipe('fnd_public')
    recipe = store.get(recipe)
    recipe = recipe.get_recipe()
    assert len(recipe) == 7

    recipe = Recipe('fnd_private')
    recipe = store.get(recipe)
    recipe = recipe.get_recipe()
    assert len(recipe) == 8
