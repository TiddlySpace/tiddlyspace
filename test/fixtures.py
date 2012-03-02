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
from tiddlywebplugins.tiddlyspace.spaces import make_space


SESSION_COUNT = 1


def get_auth(username, password):
    http = httplib2.Http()
    response, _ = http.request(
            'http://0.0.0.0:8080/challenge/tiddlywebplugins.tiddlyspace.cookie_form',
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
        del sys.modules['tiddlywebplugins.mysql2']
        del sys.modules['tiddlywebplugins.sqlalchemy2']
        import tiddlywebplugins.tiddlyspace.store
        import tiddlywebplugins.mysql2
        import tiddlywebplugins.sqlalchemy2
        clear_hooks(HOOKS)
    SESSION_COUNT += 1
    db_config = init_config['server_store'][1]['db_config']
    db_config = db_config.replace('///tiddlyspace?', '///tiddlyspacetest?')
    init_config['server_store'][1]['db_config'] = db_config
    init_config['log_level'] = 'DEBUG'

    if sys.path[0] != os.getcwd():
        sys.path.insert(0, os.getcwd())
    spawn('test_instance', init_config, instance_module)
    os.symlink('../tiddlywebplugins/templates', 'templates')

    from tiddlyweb.web import serve
    module.store = get_store(config)

    app = serve.load_app()

    def app_fn():
        return app
    module.app_fn = app_fn


def make_fake_space(store, name):
    """
    Call the spaces api to create a space.
    """
    make_space(name, store, name)

def clear_hooks(hooks): # XXX: temporary workaround?
    for entity, actions in hooks.items():
        actions['put'] = []
        actions['delete'] = []
        actions['get'] = []
