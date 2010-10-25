"""
Adds a twanager command to upgrade the current store so that each space gains an
*_archive bag
"""

from tiddlyweb.commands import make_command
from tiddlyweb.model.bag import Bag
from tiddlyweb.store import NoBagError

from tiddlywebplugins.utils import get_store

@make_command()
def add_archive(args):
    """add archive bags to the store: twanager add_archive"""
    store = get_store(config)
    bags = store.list_bags()

    for bag in bags:
        if bag.name.endswith('_private'):
            space_name = bag.name.rsplit('_', 1)[0]
            archive = Bag('%s_archive' % space_name)
            try:
                archive = store.get(archive)
            except NoBagError:
                archive.policy = bag.policy
                store.put(archive)

def init(config_in):
    global config
    config = config_in
