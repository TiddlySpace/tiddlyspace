"""
Initialize tiddlyspace as a tiddlyweb plugin.
"""

from tiddlyweb.util import merge_config

from tiddlywebplugins.utils import remove_handler

from tiddlywebplugins.tiddlyspace.commands import establish_commands
from tiddlywebplugins.tiddlyspace.config import config as space_config
from tiddlywebplugins.tiddlyspace.www import establish_www


def init_plugin(config):
    import tiddlywebplugins.whoosher
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

    if config.get('tiddlyspace.enable_profile', False):
        from werkzeug.contrib.profiler import ProfilerMiddleware
        config['server_request_filters'].insert(0, ProfilerMiddleware)

    tiddlywebplugins.whoosher.init(config)
    tiddlywebwiki.init(config)
    tiddlywebplugins.logout.init(config)
    tiddlywebplugins.magicuser.init(config)
    tiddlywebplugins.socialusers.init(config)
    tiddlywebplugins.mselect.init(config)
    tiddlywebplugins.oom.init(config)
    tiddlywebplugins.cookiedomain.init(config)
    tiddlywebplugins.prettyerror.init(config)
    tiddlywebplugins.hashmaker.init(config)
    tiddlywebplugins.form.init(config)
    tiddlywebplugins.reflector.init(config)
    tiddlywebplugins.privateer.init(config)
    tiddlywebplugins.jsonp.init(config)

    if config.get('use_dispatcher', False):
        tiddlywebplugins.dispatcher.init(config)
        tiddlywebplugins.dispatcher.listener.init(config)

    # reset config _again_ to deal with any adjustments from the
    # above init calls
    merge_config(config, space_config)

    # When tiddlyspace.frontpage_installed is True, don't update
    # the frontpage_public bag, thus not overwriting what's there.
    if config.get('tiddlyspace.frontpage_installed', False):
        config['pkgstore.skip_bags'] = ['frontpage_public']

    if 'selector' in config:  # system plugin
        # remove friendlywiki
        remove_handler(config['selector'], '/{recipe_name:segment}')
        establish_www(config)

    # update html serialization
    new_serializer = ['tiddlywebplugins.tiddlyspace.htmlserialization',
            'text/html; charset=UTF-8']
    config['serializers']['text/html'] = new_serializer
