"""
TiddlySpace
A discoursive social model for TiddlyWiki

website: http://tiddlyspace.com
repository: http://github.com/TiddlySpace/tiddlyspace
"""

__version__ = '0.2.2'


from tiddlyweb.model.tiddler import Tiddler
from tiddlyweb.util import merge_config
from tiddlyweb.web.validator import TIDDLER_VALIDATORS

from tiddlyweb.web.extractor import UserExtract

from tiddlywebplugins.utils import replace_handler
from tiddlywebplugins.tiddlyspace.config import config as space_config
from tiddlywebplugins.tiddlyspace.handler import home, ControlView


def init(config):
    import tiddlywebwiki
    import tiddlywebplugins.logout
    import tiddlywebplugins.virtualhosting # calling init not required
    import tiddlywebplugins.socialusers
    import tiddlywebplugins.mselect

    merge_config(config, space_config)

    tiddlywebwiki.init(config)
    tiddlywebplugins.logout.init(config)
    tiddlywebplugins.socialusers.init(config)
    tiddlywebplugins.mselect.init(config)

    if 'selector' in config: # system plugin
        replace_handler(config['selector'], '/', dict(GET=home))
        if ControlView not in config['server_request_filters']:
            config['server_request_filters'].insert(
                    config['server_request_filters'].
                    index(UserExtract) + 1, ControlView)

def validate_mapuser(tiddler, environ):
    """
    If a tiddler is put to the MAPUSER bag clear
    out the tiddler and set fields['mapped_user']
    to the current username. There will always be
    a current username because the create policy
    for the bag is set to ANY.
    """
    if tiddler.bag == 'MAPUSER':
        tiddler.text = ''
        tiddler.tags = []
        tiddler.fields = {}
        tiddler.fields['mapped_user'] = environ['tiddlyweb.usersign']['name']
    return tiddler

TIDDLER_VALIDATORS.append(validate_mapuser)
