"""
TiddlySpace
A discoursive social model for TiddlyWiki

website: http://tiddlyspace.com
repository: http://github.com/TiddlySpace/tiddlyspace
"""

from tiddlyweb.web.extractor import UserExtract
from tiddlyweb.manage import make_command
from tiddlyweb.util import merge_config

from tiddlywebplugins.utils import replace_handler, get_store

from tiddlywebplugins.tiddlyspace.config import config as space_config
from tiddlywebplugins.tiddlyspace.handler import (home, safe_mode,
        friendly_uri, get_identities, ControlView)
from tiddlywebplugins.tiddlyspace.spaces import (
        add_spaces_routes, change_space_member)


__version__ = '0.5.1'


def init(config):
    """
    Establish required plugins and HTTP routes.
    """
    import tiddlywebwiki
    import tiddlywebplugins.logout
    import tiddlywebplugins.virtualhosting # calling init not required
    import tiddlywebplugins.magicuser
    import tiddlywebplugins.socialusers
    import tiddlywebplugins.mselect
    import tiddlywebplugins.cookiedomain
    import tiddlywebplugins.tiddlyspace.validator
    #import tiddlywebplugins.prettyerror
    import tiddlywebplugins.pathinfohack
    import tiddlywebplugins.form
    import tiddlywebplugins.reflector

    @make_command()
    def addmember(args):
        """Add a member to a space: <space name> <user name>"""
        store = get_store(config)
        space_name, username = args
        change_space_member(store, space_name, add=username)
        return True

    @make_command()
    def delmember(args):
        """Delete a member from a space: <space name> <user name>"""
        store = get_store(config)
        space_name, username = args
        change_space_member(store, space_name, remove=username)
        return True

    @make_command()
    def deltiddler(args):
        """Delete a tiddler from a bag: <bag> <title>"""
        from tiddlyweb.model.tiddler import Tiddler
        from tiddlyweb.store import NoTiddlerError
        from tiddlyweb.util import std_error_message
        bag, title = args
        prompt = 'deleting tiddler %s from bag %s - enter "yes" to confirm' % (
                title, bag)
        if raw_input('%s\n' % prompt) == 'yes':
            store = get_store(config)
            tiddler = Tiddler(title, bag)
            try:
                store.delete(tiddler)
            except NoTiddlerError:
                std_error_message(
                        'error deleting deleting tiddler %s from bag %s: %s' % (
                            title, bag, 'no such tiddler'))
            return True
        else:
            std_error_message('aborted')
            return False

    merge_config(config, space_config)

    tiddlywebwiki.init(config)
    tiddlywebplugins.logout.init(config)
    tiddlywebplugins.magicuser.init(config)
    tiddlywebplugins.socialusers.init(config)
    tiddlywebplugins.mselect.init(config)
    tiddlywebplugins.cookiedomain.init(config)
    #tiddlywebplugins.prettyerror.init(config)
    tiddlywebplugins.pathinfohack.init(config)
    tiddlywebplugins.form.init(config)
    tiddlywebplugins.reflector.init(config)

    if 'selector' in config: # system plugin
        replace_handler(config['selector'], '/', dict(GET=home))
        config['selector'].add('/_safe', GET=safe_mode, POST=safe_mode)
        add_spaces_routes(config['selector'])
        config['selector'].add('/{tiddler_name:segment}', GET=friendly_uri)
        config['selector'].add('/users/{username}/identities',
                GET=get_identities)
        if ControlView not in config['server_request_filters']:
            config['server_request_filters'].insert(
                    config['server_request_filters'].
                    index(UserExtract) + 1, ControlView)
