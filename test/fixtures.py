import os
import sys
import shutil

from tiddlyweb.model.bag import Bag
from tiddlyweb.model.recipe import Recipe

def make_test_env():
    try:
        shutil.rmtree('test_instance')
    except OSError:
        pass
    exit = os.system('twinstance_dev tiddlywebplugins.tiddlyspace test_instance')
    if exit == 0:
        os.chdir('test_instance')
        sys.path.insert(0, os.getcwd())
    else:
        assert False is True, 'unable to create test env'


def make_fake_space(store, name):
    public_recipe = Recipe('%s_public' % name)
    private_recipe = Recipe('%s_private' % name)
    public_bag = Bag('%s_public' % name)
    private_bag = Bag('%s_private' % name)
    public_recipe.set_recipe([('system', ''), ('%s_public' % name, '')])
    private_recipe.set_recipe([('system', ''), ('%s_public' % name, ''),
        ('%s_private' % name, '')])
    for entity in [public_recipe, private_recipe, public_bag, private_bag]:
        store.put(entity)
