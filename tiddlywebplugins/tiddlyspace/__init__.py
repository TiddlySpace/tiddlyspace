"""
TiddlySpace
A discoursive social model for TiddlyWiki

website: http://tiddlyspace.com
repository: http://github.com/TiddlySpace/tiddlyspace
"""


import tiddlywebplugins.status
import tiddlyweb.web.util

from tiddlyweb.model.user import User
from tiddlyweb.store import NoUserError
from tiddlyweb.util import merge_config
from tiddlyweb.web.http import HTTPExceptor

from tiddlywebplugins.instancer.util import get_tiddler_locations

from tiddlywebplugins.tiddlyspace.commands import establish_commands
from tiddlywebplugins.tiddlyspace.config import config as space_config
from tiddlywebplugins.tiddlyspace.instance import store_contents
from tiddlywebplugins.tiddlyspace.space import Space
from tiddlywebplugins.tiddlyspace.www import establish_www


__version__ = '1.0.39'


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
    import tiddlywebplugins.privateer
    import tiddlywebplugins.relativetime
    import tiddlywebplugins.jsonp

    # Only load and run dispatcher if we are specifically configured
    # to use it.
    if config.get('use_dispatcher', False):
        import tiddlywebplugins.dispatcher
        import tiddlywebplugins.dispatcher.listener

    establish_commands(config)

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
    tiddlywebplugins.privateer.init(config)
    tiddlywebplugins.jsonp.init(config)

    if config.get('use_dispatcher', False):
        tiddlywebplugins.dispatcher.init(config)
        tiddlywebplugins.dispatcher.listener.init(config)

    # XXX: The following is required to work around issues with twp.instancer.
    # Without this, config settings from tiddlywebwiki take precedence.
    config['serializers']['text/x-tiddlywiki'] = space_config[
            'serializers']['text/x-tiddlywiki']
    # This only fixes 'twanager update', instance creation still does not have
    # the right information, thus requiring a twanager update after instance
    # creation. Presumably the instance script needs to do something similar.
    config['instance_tiddlers'] = get_tiddler_locations(store_contents,
            'tiddlywebplugins.tiddlyspace')

    # inject lazy serialization information
    config['extension_types'].update({'lwiki': 'text/x-ltiddlywiki'})
    config['serializers'].update({'text/x-ltiddlywiki':
        ['tiddlywebplugins.tiddlyspace.betalazyserialization',
            'text/html; charset=UTF-8']})

    if 'selector' in config:  # system plugin
        establish_www(config)

    # update html serialization
    new_serializer = ['tiddlywebplugins.tiddlyspace.htmlserialization',
            'text/html; charset=UTF-8']
    config['serializers']['text/html'] = new_serializer
    config['serializers']['default'] = new_serializer


original_gather_data = tiddlywebplugins.status._gather_data


def _status_gather_data(environ):
    """
    Monkey patch twp.status to add additional information
    specific to TiddlySpace.
    """
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


original_tiddler_url = tiddlyweb.web.util.tiddler_url


def web_tiddler_url(environ, tiddler, container='bags', full=True):
    """
    Override default tiddler_url to be space+host aware.

    If the bag or recipe of the tiddler is of a space, switch to
    that space's host for the duration of uri creation.

    Do this all the time, so that we get the right URIs even
    when working around ControlView.
    """
    saved_host = environ.get('HTTP_HOST', '')
    try:
        if container == 'recipes':
            space_name = Space.name_from_recipe(tiddler.recipe)
        else:
            space_name = Space.name_from_bag(tiddler.bag)

        host = environ['tiddlyweb.config']['server_host']['host']
        port = environ['tiddlyweb.config']['server_host']['port']
        if port is '443' or port is '80':
            port = ''
        else:
            port = ':%s' % port
        environ['HTTP_HOST'] = '%s.%s%s' % (space_name.encode('utf-8'),
            host, port)
    except ValueError:
        pass
    url = original_tiddler_url(environ, tiddler, container, full)
    if saved_host:
        environ['HTTP_HOST'] = saved_host
    elif 'HTTP_HOST' in environ:
        del environ['HTTP_HOST']
    return url


tiddlyweb.web.util.tiddler_url = web_tiddler_url
