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
TIDDLYWIKI_ALPHA = resource_filename(PACKAGE_NAME, 'resources/alpha.html')
TIDDLYWIKI_BETA = resource_filename(PACKAGE_NAME, 'resources/beta.html')
TIDDLYWIKI_EXTERNAL_ALPHA = resource_filename(PACKAGE_NAME,
        'resources/external_alpha.html')

config = {
    'instance_tiddlers': get_tiddler_locations(store_contents, PACKAGE_NAME),
    'atom.default_filter': 'select=tag:!excludeLists;sort=-modified;limit=20',
    'atom.author_uri_map': '/profiles/%s',
    'atom.hub': 'http://pubsubhubbub.appspot.com/',
    'auth_systems': ['tiddlywebplugins.tiddlyspace.cookie_form',
        'tiddlywebplugins.tiddlyspace.openid'],
    'beanstalk.listeners': ['tiddlywebplugins.dispatcher.listener',
        'tiddlywebplugins.tiddlyspace.profiles'],
    'bag_create_policy': 'ANY',
    'recipe_create_policy': 'ANY',
    'css_uri': '/bags/common/tiddlers/tiddlyweb.css',
    'socialusers.reserved_names': ['www', 'about', 'help', 'announcements',
        'dev', 'info', 'api', 'status', 'login', 'frontpage'],
    'cookie_age': '2592000',  # 1 month
    'server_store': ['tiddlywebplugins.tiddlyspace.store', {
        'db_config': 'mysql:///tiddlyspace?charset=utf8&use_unicode=0'}],
    'indexer': 'tiddlywebplugins.mysql2',
    'tiddlywebwiki.binary_limit': 1048576,  # 1 MB
    'lazy.titles': ['SiteIcon', 'ColorPalette'],
    # TiddlyWiki external, alpha, beta serialization
    'base_tiddlywiki_beta': TIDDLYWIKI_BETA,
    'base_tiddlywiki_alpha': TIDDLYWIKI_ALPHA,
    'base_tiddlywiki_external_alpha': TIDDLYWIKI_EXTERNAL_ALPHA,
    'serializers': {
        'text/x-tiddlywiki': ['tiddlywebplugins.tiddlyspace.betaserialization',
            'text/html; charset=UTF-8']}}
