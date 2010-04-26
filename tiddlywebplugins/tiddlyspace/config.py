from tiddlywebplugins.instancer.util import get_tiddler_locations

from tiddlywebplugins.tiddlyspace.instance import store_contents


PACKAGE_NAME = 'tiddlywebplugins.tiddlyspace'


config = {
    'instance_tiddlers': get_tiddler_locations(store_contents, PACKAGE_NAME),
    'auth_systems': ['%s.challenger' % PACKAGE_NAME],
    'bag_create_policy': 'ANY',
    'recipe_create_policy': 'ANY',
    'socialusers.reserved_names': ['www', 'about', 'help', 'announcements', 'info'],
}
