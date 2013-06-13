"""
Middleware to read the ServerSettings for the current space.

The data is put in environ['tiddlyweb.server_settings'] dictionary.
"""

from tiddlyweb.model.tiddler import Tiddler
from tiddlyweb.store import StoreError, NoTiddlerError

from tiddlywebplugins.tiddlyspace.web import determine_space, determine_host
from tiddlywebplugins.tiddlyspace.space import Space

SPACE_SERVER_SETTINGS = 'ServerSettings'
SERVER_SETTINGS_KEYS = ['index', 'editor', 'htmltemplate']
DEFAULT_SERVER_SETTINGS = {
        'index': '',
        'editor': '',
        'htmltemplate': '',
        'extra_query': ''}
DEFAULT_NEWUSER_APP = 'apps'
DEFAULT_SPACE_NAME = 'frontpage'


class ServerSettings(object):
    """
    Middleware to read and process the ServerSettings tiddler for the
    current space.
    """

    def __init__(self, application):
        self.application = application

    def __call__(self, environ, start_response):
        http_host, host_url = determine_host(environ)
        if http_host == host_url:
            space_name = DEFAULT_SPACE_NAME
        else:
            space_name = determine_space(environ, http_host)
        update_space_settings(environ, space_name)
        return self.application(environ, start_response)


def update_space_settings(environ, name):
    """
    Read a tiddler named by SPACE_SERVER_SETTINGS in the current
    space's public bag. Parse each line as a key:value pair which
    is then injected tiddlyweb.query. The goal here is to allow
    a space member to force incoming requests to use specific
    settings, such as beta or externalized.
    """
    store = environ['tiddlyweb.store']
    # double assign to avoid later updates to the defaults
    environ['tiddlyweb.space_settings'] = {}
    environ['tiddlyweb.space_settings'].update(DEFAULT_SERVER_SETTINGS)
    try:
        space = Space(name)
    except ValueError:
        return
    bag_name = space.public_bag()
    tiddler = Tiddler(SPACE_SERVER_SETTINGS, bag_name)
    data_text = ''
    try:
        tiddler = store.get(tiddler)
        data_text = tiddler.text
    except StoreError:
        data_text = ''

    query_strings = []
    for line in data_text.split('\n'):
        try:
            key, value = line.split(':', 1)
            key = key.strip()
            value = value.strip()
            if key in SERVER_SETTINGS_KEYS:
                environ['tiddlyweb.space_settings'][key] = value
            else:
                query_strings.append('%s=%s' % (key, value))
        except ValueError:
            pass

    # XXX: Disable the default new user app switcher temporarily
    # TODO: Turn this back on when the app switcher is more complete
    #_figure_default_index(environ, bag_name, space)

    environ['tiddlyweb.space_settings'][
            'extra_query'] = ';'.join(query_strings)


def _figure_default_index(environ, bag_name, space):
    """
    if an app hasn't been specified, check whether the space is new or old.
    old users should get the old default: TiddlyWiki, new users should get
    the new default: the app switcher. The presence of a spaceSetupFlag
    tiddler is the test for this.

    NOTE: This code is currently unused but is expected to return.
    """
    store = environ['tiddlyweb.store']
    index = environ['tiddlyweb.space_settings']['index']
    if not index and space.name != 'frontpage':
        setup_flag = Tiddler('%sSetupFlag' % space.name, bag_name)
        try:
            setup_flag = store.get(setup_flag)
        except NoTiddlerError:
            setup_flag.bag = space.private_bag()
            try:
                setup_flag = store.get(setup_flag)
            except NoTiddlerError:
                environ['tiddlyweb.space_settings']['index'] \
                        = DEFAULT_NEWUSER_APP
