"""
TiddlySpace
A discoursive social model for TiddlyWiki

website: http://tiddlyspace.com
repository: http://github.com/TiddlySpace/tiddlyspace
"""

from tiddlyweb.web.extractor import UserExtract
from tiddlyweb.web.http import HTTPExceptor
from tiddlyweb.manage import make_command
from tiddlyweb.util import merge_config
from tiddlyweb.model.user import User
from tiddlyweb.store import NoUserError

from tiddlywebplugins.utils import replace_handler, get_store

from tiddlywebplugins.instancer.util import get_tiddler_locations
from tiddlywebplugins.tiddlyspace.instance import store_contents

from tiddlywebplugins.tiddlyspace.config import config as space_config
from tiddlywebplugins.tiddlyspace.controlview import (ControlView,
        DropPrivs, AllowOrigin)
from tiddlywebplugins.tiddlyspace.handler import (home, safe_mode,
        friendly_uri, get_identities)
from tiddlywebplugins.tiddlyspace.spaces import (
        add_spaces_routes, change_space_member)
from tiddlywebplugins.tiddlyspace.csrf import CSRFProtector
from tiddlywebplugins.prettyerror import PrettyHTTPExceptor

import tiddlywebplugins.status


__version__ = '0.9.73'


def init(config):
    """
    Establish required plugins and HTTP routes.
    """
    import tiddlywebwiki
    import tiddlywebplugins.logout
    import tiddlywebplugins.virtualhosting  # calling init not required
    import tiddlywebplugins.magicuser
    import tiddlywebplugins.socialusers
    import tiddlywebplugins.mselect
    import tiddlywebplugins.oom
    import tiddlywebplugins.cookiedomain
    import tiddlywebplugins.tiddlyspace.validator
    import tiddlywebplugins.prettyerror
    import tiddlywebplugins.pathinfohack
    import tiddlywebplugins.hashmaker
    import tiddlywebplugins.form
    import tiddlywebplugins.reflector
    import tiddlywebplugins.lazy
    import tiddlywebplugins.privateer
    import tiddlywebplugins.jsonp

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
                        'error deleting tiddler %s from bag %s: %s' % (
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
    tiddlywebplugins.oom.init(config)
    tiddlywebplugins.cookiedomain.init(config)
    tiddlywebplugins.prettyerror.init(config)
    tiddlywebplugins.pathinfohack.init(config)
    tiddlywebplugins.hashmaker.init(config)
    tiddlywebplugins.form.init(config)
    tiddlywebplugins.reflector.init(config)
    tiddlywebplugins.lazy.init(config)
    tiddlywebplugins.privateer.init(config)
    tiddlywebplugins.jsonp.init(config)

    # XXX: The following is required to work around issues with twp.instancer.
    # Without this, config settings from tiddlywebwiki take precedence.
    config['serializers']['text/x-tiddlywiki'] = space_config['serializers']['text/x-tiddlywiki']
    # This only fixes 'twanager update', instance creation still does not have
    # the right information, thus requiring a twanager update after instance
    # creation. Presumably the instance script needs to do something similar.
    config['instance_tiddlers'] = get_tiddler_locations(store_contents,
            'tiddlywebplugins.tiddlyspace')

    if 'selector' in config:  # system plugin
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

        if DropPrivs not in config['server_request_filters']:
            config['server_request_filters'].insert(
                    config['server_request_filters'].
                    index(ControlView) + 1, DropPrivs)

        if CSRFProtector not in config['server_request_filters']:
            config['server_request_filters'].append(CSRFProtector)

        if AllowOrigin not in config['server_response_filters']:
            config['server_response_filters'].insert(
                    config['server_response_filters'].
                    index(PrettyHTTPExceptor) + 1, AllowOrigin)

        new_serializer = ['tiddlywebplugins.tiddlyspace.htmlserialization',
                'text/html; charset=UTF-8']
        config['serializers']['text/html'] = new_serializer
        config['serializers']['default'] = new_serializer


original_gather_data = tiddlywebplugins.status._gather_data


def _status_gather_data(environ):
    data = original_gather_data(environ)
    data['server_host'] = environ['tiddlyweb.config']['server_host']
    data['tiddlyspace_version'] = __version__
    # ensure user is known
    usersign = environ['tiddlyweb.usersign']['name']
    store = environ['tiddlyweb.store']
    try:
        store.get(User(usersign))
    except NoUserError:
        data['username'] = 'GUEST'
        if usersign != 'GUEST':
          data['identity'] = usersign
    return data


tiddlywebplugins.status._gather_data = _status_gather_data
