"""
Base configuration for TiddlySpace.

This provides the basics which may be changed in tidlywebconfig.py.
"""
from tiddlywebplugins.instancer.util import get_tiddler_locations

from tiddlywebplugins.tiddlyspace.instance import store_contents


PACKAGE_NAME = 'tiddlywebplugins.tiddlyspace'


config = {
    'instance_tiddlers': get_tiddler_locations(store_contents, PACKAGE_NAME),
    'atom.default_filter': 'select=tag:!excludeLists;sort=-modified;limit=20',
    'auth_systems': ['cookie_form', 'tiddlywebplugins.tiddlyspace.openid'],
    'bag_create_policy': 'ANY',
    'recipe_create_policy': 'ANY',
    'css_uri': 'http://peermore.com/tiddlyweb.css',
    'socialusers.reserved_names': ['www', 'about', 'help', 'announcements',
        'info', 'api'],
    'cookie_age': '2592000', # 1 month
}
