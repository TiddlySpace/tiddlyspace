"""
TiddlySpace
A discoursive social model for TiddlyWiki

website: http://tiddlyspace.com
repository: http://github.com/TiddlySpace/tiddlyspace
"""

from tiddlyweb.web.extractor import UserExtract
from tiddlyweb.util import merge_config

from tiddlywebplugins.utils import replace_handler

from tiddlywebplugins.tiddlyspace.config import config as space_config
from tiddlywebplugins.tiddlyspace.handler import (home,
        friendly_uri, get_identities, ControlView)
from tiddlywebplugins.tiddlyspace.spaces import add_spaces_routes


__version__ = '0.2.2'


def init(config):
    import tiddlywebwiki
    import tiddlywebplugins.logout
    import tiddlywebplugins.virtualhosting # calling init not required
    import tiddlywebplugins.magicuser
    import tiddlywebplugins.socialusers
    import tiddlywebplugins.mselect
    import tiddlywebplugins.cookiedomain
    import tiddlywebplugins.tiddlyspace.validator

    merge_config(config, space_config)

    tiddlywebwiki.init(config)
    tiddlywebplugins.logout.init(config)
    tiddlywebplugins.magicuser.init(config)
    tiddlywebplugins.socialusers.init(config)
    tiddlywebplugins.mselect.init(config)
    tiddlywebplugins.cookiedomain.init(config)

    if 'selector' in config: # system plugin
        replace_handler(config['selector'], '/', dict(GET=home))
        add_spaces_routes(config['selector'])
        config['selector'].add('/{tiddler_name:segment', GET=friendly_uri)
        config['selector'].add('/users/{username}/identities',
                GET=get_identities)
        if ControlView not in config['server_request_filters']:
            config['server_request_filters'].insert(
                    config['server_request_filters'].
                    index(UserExtract) + 1, ControlView)
