import os
import sys
import shutil
import httplib2
import Cookie

from tiddlyweb.model.bag import Bag
from tiddlyweb.model.recipe import Recipe
from tiddlyweb.config import config
from tiddlyweb.store import HOOKS

from tiddlywebplugins.utils import get_store
from tiddlywebplugins.instancer.util import spawn
from tiddlywebplugins.tiddlyspace import instance as instance_module
from tiddlywebplugins.tiddlyspace.config import config as init_config


SESSION_COUNT = 1


def get_auth(username, password):
    http = httplib2.Http()
    response, _ = http.request(
            'http://0.0.0.0:8080/challenge/cookie_form',
            body='user=%s&password=%s' % (username, password),
            method='POST',
            headers={'Content-Type': 'application/x-www-form-urlencoded'})
    assert response.previous['status'] == '303'

    user_cookie = response.previous['set-cookie']
    cookie = Cookie.SimpleCookie()
    cookie.load(user_cookie)
    return cookie['tiddlyweb_user'].value


def make_test_env(module):
    global SESSION_COUNT
    try:
        shutil.rmtree('test_instance')
    except:
        pass

    os.system('mysqladmin -f drop tiddlyspacetest create tiddlyspacetest')
    if SESSION_COUNT > 1:
        del sys.modules['tiddlywebplugins.tiddlyspace.store']
        del sys.modules['tiddlywebplugins.mysql']
        del sys.modules['tiddlywebplugins.sqlalchemy']
        import tiddlywebplugins.tiddlyspace.store
        import tiddlywebplugins.mysql
        import tiddlywebplugins.sqlalchemy
        clear_hooks(HOOKS)
    SESSION_COUNT += 1
    db_config = init_config['server_store'][1]['db_config']
    db_config = db_config.replace('///tiddlyspace?', '///tiddlyspacetest?')
    init_config['server_store'][1]['db_config'] = db_config
    init_config['log_level'] = 'DEBUG'

    if sys.path[0] != os.getcwd():
        sys.path.insert(0, os.getcwd())
    spawn('test_instance', init_config, instance_module)

    from tiddlyweb.web import serve
    module.store = get_store(config)

    app = serve.load_app()

    def app_fn():
        return app
    module.app_fn = app_fn


def make_fake_space(store, name):
    def set_policy(policy, private=False):
        for policy_attr in policy.attributes:
            if policy_attr not in ['read', 'owner']:
                setattr(policy, policy_attr, [name])
        if private:
            policy.read = [name]
    public_recipe = Recipe('%s_public' % name)
    private_recipe = Recipe('%s_private' % name)
    public_bag = Bag('%s_public' % name)
    private_bag = Bag('%s_private' % name)
    set_policy(public_recipe.policy)
    set_policy(private_recipe.policy, private=True)
    set_policy(public_bag.policy)
    set_policy(private_bag.policy, private=True)
    public_recipe.set_recipe([('system', ''), ('tiddlyspace', ''), ('%s_public' % name, '')])
    private_recipe.set_recipe([('system', ''), ('tiddlyspace', ''), ('%s_public' % name, ''),
        ('%s_private' % name, '')])
    for entity in [public_recipe, private_recipe, public_bag, private_bag]:
        store.put(entity)


def clear_hooks(hooks): # XXX: temporary workaround?
    for entity, actions in hooks.items():
        actions['put'] = []
        actions['delete'] = []
        actions['get'] = []
