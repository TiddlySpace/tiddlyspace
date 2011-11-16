"""
Adds a twanager command to upgrade the current store so that each space
gains an *_archive and *_auxbags bag
"""

from tiddlyweb.commands import make_command
from tiddlyweb.model.bag import Bag
from tiddlyweb.store import NoBagError

from tiddlywebplugins.utils import get_store

@make_command()
def add_extra_bags(args):
    """add bags to the store: twanager add_bags"""
    store = get_store(config)
    bags = store.list_bags()

    for bag in bags:
        if bag.name.endswith('_private'):
            space_name = bag.name.rsplit('_', 1)[0]
            archive = Bag('%s_archive' % space_name)
            auxbags = Bag('%s_auxbags' % space_name)
            for target_bag_name in [archive, auxbags]:
                try:
                    target_bag = store.get(target_bag_name)
                except NoBagError:
                    target_bag.policy = bag.policy
                    store.put(target_bag)

@make_command()
def update_extra_bags(args):
    """update extra bags to have the right perms"""
    store = get_store(config)
    bags = store.list_bags()

    for bag in bags:
        if bag.name.endswith('_archive') or bag.name.endswith('_auxbags'):
            space_name = bag.name.rsplit('_', 1)[0]
            private = Bag('%s_private' % space_name)
            private = store.get(private)
            try:
                extra_bag = store.get(bag)
                extra_bag.policy = private.policy
                store.put(extra_bag)
            except NoBagError:
                pass

def init(config_in):
    global config
    config = config_in
