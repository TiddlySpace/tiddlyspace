import os
import sys
import shutil
import httplib2
import Cookie

from tiddlyweb.model.bag import Bag
from tiddlyweb.model.recipe import Recipe



def get_auth(username, password):
    http = httplib2.Http()
    response, content = http.request(
            'http://0.0.0.0:8080/challenge/cookie_form',
            body='user=%s&password=%s' % (username, password),
            method='POST',
            headers={'Content-Type': 'application/x-www-form-urlencoded'})
    assert response.previous['status'] == '303'

    user_cookie = response.previous['set-cookie']
    cookie = Cookie.SimpleCookie()
    cookie.load(user_cookie)
    return cookie['tiddlyweb_user'].value


def make_test_env():
    try:
        shutil.rmtree('test_instance')
    except OSError:
        pass
    exit = os.system('PYTHONPATH="." twinstance_dev tiddlywebplugins.tiddlyspace test_instance')
    if exit == 0:
        os.chdir('test_instance')
        sys.path.insert(0, os.getcwd())
        f = open('tiddlywebconfig.py', 'a')
        f.write('from devtiddlers import update_config; update_config(config, set_host=False)')
        f.close()
    else:
        assert False is True, 'unable to create test env'


def make_fake_space(store, name):
    public_recipe = Recipe('%s_public' % name)
    private_recipe = Recipe('%s_private' % name)
    public_bag = Bag('%s_public' % name)
    private_bag = Bag('%s_private' % name)
    private_bag.policy.manage = [name]
    public_bag.policy.manage = [name]
    private_recipe.policy.manage = [name]
    public_recipe.policy.manage = [name]
    public_recipe.set_recipe([('system', ''), ('tiddlyspace', ''), ('%s_public' % name, '')])
    private_recipe.set_recipe([('system', ''), ('tiddlyspace', ''), ('%s_public' % name, ''),
        ('%s_private' % name, '')])
    for entity in [public_recipe, private_recipe, public_bag, private_bag]:
        store.put(entity)
