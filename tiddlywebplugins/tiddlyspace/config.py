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
    'css_uri': '/bags/common/tiddlers/tiddlyweb.css',
    'socialusers.reserved_names': ['www', 'about', 'help', 'announcements',
        'info', 'api', 'status', 'login'],
    'cookie_age': '2592000', # 1 month
    'server_store': ['tiddlywebplugins.mysql', {
        'db_config': 'mysql:///tiddlyspace?charset=utf8&use_unicode=0'}],
    'indexer': 'tiddlywebplugins.mysql',
}
