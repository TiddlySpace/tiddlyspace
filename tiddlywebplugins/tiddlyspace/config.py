"""
Base configuration for TiddlySpace.

This provides the basics which may be changed in tidlywebconfig.py.
"""

from tiddlywebplugins.instancer.util import get_tiddler_locations

from tiddlywebplugins.tiddlyspace.instance import store_contents

try:
    from pkg_resources import resource_filename
except ImportError:
    from tiddlywebplugins.utils import resource_filename


PACKAGE_NAME = 'tiddlywebplugins.tiddlyspace'
TIDDLYWIKI_BETA = resource_filename(PACKAGE_NAME, 'resources/beta.html')


config = {
    'instance_tiddlers': get_tiddler_locations(store_contents, PACKAGE_NAME),
    'atom.default_filter': 'select=tag:!excludeLists;sort=-modified;limit=20',
    'auth_systems': ['cookie_form', 'tiddlywebplugins.tiddlyspace.openid'],
    'bag_create_policy': 'ANY',
    'recipe_create_policy': 'ANY',
    'css_uri': '/bags/common/tiddlers/tiddlyweb.css',
    'socialusers.reserved_names': ['www', 'about', 'help', 'announcements',
        'dev', 'info', 'api', 'status', 'login', 'frontpage'],
    'cookie_age': '2592000',  # 1 month
    'server_store': ['tiddlywebplugins.tiddlyspace.store', {
        'db_config': 'mysql:///tiddlyspace?charset=utf8&use_unicode=0'}],
    'indexer': 'tiddlywebplugins.mysql',
    'tiddlywebwiki.binary_limit': 1048576,  # 1 MB
    'lazy.titles': ['SiteIcon', 'ColorPalette'],
    # TiddlyWiki beta serialization
    'base_tiddlywiki_beta': TIDDLYWIKI_BETA,
    'serializers': {
        'text/x-tiddlywiki': ['tiddlywebplugins.tiddlyspace.betaserialization',
            'text/html; charset=UTF-8']
    }
}
