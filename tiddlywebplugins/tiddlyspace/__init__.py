"""
TiddlySpace
A discoursive social model for TiddlyWiki

website: http://tiddlyspace.com
repository: http://github.com/TiddlySpace/tiddlyspace
"""

__version__ = '0.2.0'


from tiddlyweb.util import merge_config

from tiddlywebplugins.tiddlyspace.config import config as space_config


def init(config):
    import tiddlywebwiki
    import tiddlywebplugins.virtualhosting # calling init not required

    merge_config(config, space_config)
    tiddlywebwiki.init(config)
