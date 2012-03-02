"""
Middleware to read the ServerSettings for the current space.

The data is put in environ['tiddlyweb.server_settings'] dictionary.
"""

try:
    from urlparse import parse_qs
except ImportError:
    from cgi import parse_qs

from tiddlyweb.filters import parse_for_filters
from tiddlyweb.model.tiddler import Tiddler
from tiddlyweb.store import StoreError, NoTiddlerError

from tiddlywebplugins.tiddlyspace.web import determine_space, determine_host
from tiddlywebplugins.tiddlyspace.space import Space

SPACE_SERVER_SETTINGS = 'ServerSettings'
SERVER_SETTINGS_KEYS = ['lazy', 'index']
DEFAULT_SERVER_SETTINGS = {
        'index': None,
        'lazy': False}
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
    settings, such as alpha or externalized.
    """
    store = environ['tiddlyweb.store']
    # double assign to avoid later updates to the defaults
    environ['tiddlyweb.space_settings'] = {}
    environ['tiddlyweb.space_settings'].update(DEFAULT_SERVER_SETTINGS)
    space = Space(name)
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
            key = key.rstrip().lstrip()
            value = value.rstrip().lstrip()
            if key in SERVER_SETTINGS_KEYS:
                if key == 'lazy' and value.lower() == 'true':
                    value = True
                environ['tiddlyweb.space_settings'][key] = value
            else:
                query_strings.append('%s=%s' % (key, value))
        except ValueError:
            pass

    _figure_default_index(environ, bag_name, space)

    query_string = ';'.join(query_strings)

    filters, leftovers = parse_for_filters(query_string, environ)
    environ['tiddlyweb.filters'].extend(filters)
    query_data = parse_qs(leftovers, keep_blank_values=True)
    environ['tiddlyweb.query'].update(dict(
        [(key, [value for value in values])
            for key, values in query_data.items()]))


def _figure_default_index(environ, bag_name, space):
    """
    if an app hasn't been specified, check whether the space is new or old.
    old users should get the old default: TiddlyWiki, new users should get
    the new default: the app switcher. The presence of a spaceSetupFlag
    tiddler is the test for this.
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
