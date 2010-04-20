"""
TiddlySpace
A discoursive social model for TiddlyWiki

website: http://tiddlyspace.com
repository: http://github.com/TiddlySpace/tiddlyspace
"""

__version__ = '0.2.2'


from tiddlyweb.util import merge_config

from tiddlywebplugins.utils import replace_handler
from tiddlywebplugins.tiddlyspace.config import config as space_config
from tiddlywebplugins.tiddlyspace.root_handler import home


def init(config):
    import tiddlywebwiki
    import tiddlywebplugins.logout
    import tiddlywebplugins.virtualhosting # calling init not required
    import tiddlywebplugins.socialusers

    merge_config(config, space_config)

    tiddlywebwiki.init(config)
    tiddlywebplugins.logout.init(config)
    tiddlywebplugins.socialusers.init(config)

    if 'selector' in config: # system plugin
        replace_handler(config['selector'], '/', dict(GET=home))
