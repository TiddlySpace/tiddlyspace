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
from tiddlywebplugins.imaker import spawn
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


def make_test_env(module, hsearch=False):
    """
    If hsearch is False, don't bother updating the whoosh index
    for this test instance. We do this by removing the store HOOK
    used by whoosh.
    """
    global SESSION_COUNT

    # bump up a level if we're already in the test instance
    if os.getcwd().endswith('test_instance'):
        os.chdir('..')

    try:
        shutil.rmtree('test_instance')
    except:
        pass

    os.system('echo "drop database if exists tiddlyspacetest; create database tiddlyspacetest character set = utf8mb4 collate = utf8mb4_bin;" | mysql')
    if SESSION_COUNT > 1:
        del sys.modules['tiddlywebplugins.tiddlyspace.store']
        del sys.modules['tiddlywebplugins.mysql3']
        del sys.modules['tiddlywebplugins.sqlalchemy3']
        import tiddlywebplugins.tiddlyspace.store
        import tiddlywebplugins.mysql3
        import tiddlywebplugins.sqlalchemy3
        tiddlywebplugins.mysql3.Session.remove()
        clear_hooks(HOOKS)
    SESSION_COUNT += 1
    db_config = init_config['server_store'][1]['db_config']
    db_config = db_config.replace('///tiddlyspace?', '///tiddlyspacetest?')
    init_config['server_store'][1]['db_config'] = db_config
    init_config['log_level'] = 'DEBUG'

    if sys.path[0] != os.getcwd():
        sys.path.insert(0, os.getcwd())
    spawn('test_instance', init_config, instance_module)
    os.chdir('test_instance')
    os.symlink('../tiddlywebplugins/templates', 'templates')
    os.symlink('../tiddlywebplugins', 'tiddlywebplugins')

    from tiddlyweb.web import serve
    module.store = get_store(init_config)

    app = serve.load_app()

    if not hsearch:
        from tiddlywebplugins.whoosher import _tiddler_change_handler
        try:
            HOOKS['tiddler']['put'].remove(_tiddler_change_handler)
            HOOKS['tiddler']['delete'].remove(_tiddler_change_handler)
        except ValueError:
            pass

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
