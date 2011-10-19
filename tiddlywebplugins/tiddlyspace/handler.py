"""
HTTP route handlers for TiddlySpace.

The extensions and modifications to the default TiddlyWeb routes.
"""

import simplejson

try:
    from urlparse import parse_qs
except ImportError:
    from cgi import parse_qs

from tiddlyweb.filters import parse_for_filters
from tiddlyweb.model.bag import Bag
from tiddlyweb.model.tiddler import Tiddler
from tiddlyweb.store import NoBagError, StoreError, NoTiddlerError
from tiddlyweb import control
from tiddlyweb.web.handler.recipe import get_tiddlers
from tiddlyweb.web.handler.tiddler import get as get_tiddler
from tiddlyweb.web.http import HTTP403
from tiddlyweb.web.util import get_serialize_type

from tiddlywebplugins.utils import require_any_user

from tiddlywebplugins.tiddlyspace.web import (determine_host,
        determine_space, determine_space_recipe)
from tiddlywebplugins.tiddlyspace.space import Space


SPACE_SERVER_SETTINGS = 'ServerSettings'
DEFAULT_NEWUSER_APP = 'apps'


def friendly_uri(environ, start_response):
    """
    Transform a not alread mapped request at the root of a space
    into a request for a tiddler in the public or private recipe
    of the current space.
    """
    _setup_friendly_environ(environ)
    return get_tiddler(environ, start_response)


@require_any_user()
def get_identities(environ, start_response):
    """
    Get a list of the identities associated with the named user.
    That named user must match the current user or the current
    user must be an admin.
    """
    store = environ['tiddlyweb.store']
    username = environ['wsgiorg.routing_args'][1]['username']
    usersign = environ['tiddlyweb.usersign']['name']
    roles = environ['tiddlyweb.usersign']['roles']

    if username != usersign and 'ADMIN' not in roles:
        raise HTTP403('Bad user for action')

    identities = []
    try:
        mapped_bag = store.get(Bag('MAPUSER'))
        tiddlers = store.list_bag_tiddlers(mapped_bag)
        matched_tiddlers = control.filter_tiddlers(tiddlers,
            'select=mapped_user:%s' % username, environ)
        identities = [tiddler.title for tiddler in matched_tiddlers]
    except NoBagError:
        pass

    start_response('200 OK', [
        ('Content-Type', 'application/json; charset=UTF-8')])
    return [simplejson.dumps(identities)]


def get_space_tiddlers(environ, start_response):
    """
    Get the tiddlers that make up the current space in
    whatever the reqeusted representation is. Choose recipe
    based on membership status.
    """
    space_name = _setup_friendly_environ(environ)
    serializer, _ = get_serialize_type(environ)
    # If we are a wiki read ServerSettings, but ignore index
    if ('betaserialization' in serializer
            or 'betalazyserialization' in serializer):
        _, lazy = update_space_settings(environ, space_name)
        if lazy:
            environ['tiddlyweb.type'] = 'text/x-ltiddlywiki'
    return get_tiddlers(environ, start_response)


def home(environ, start_response):
    """
    handles requests at /, serving either the front page or a space (public or
    private) based on whether a subdomain is used.

    relies on tiddlywebplugins.virtualhosting
    """
    http_host, host_url = determine_host(environ)
    if http_host == host_url:
        http_host = 'frontpage.' + http_host
    return serve_space(environ, start_response, http_host)


def serve_space(environ, start_response, http_host):
    """
    Serve a space determined from the current virtual host and user.
    The user determines whether the recipe uses is public or private.
    """
    space_name = determine_space(environ, http_host)
    recipe_name = determine_space_recipe(environ, space_name)
    environ['wsgiorg.routing_args'][1]['recipe_name'] = recipe_name.encode(
            'UTF-8')
    _, mime_type = get_serialize_type(environ)
    index, lazy = update_space_settings(environ, space_name)
    if index:
        environ['wsgiorg.routing_args'][1]['tiddler_name'] = index.encode(
                'UTF-8')
        return get_tiddler(environ, start_response)
    if 'text/html' in mime_type:
        if lazy:
            environ['tiddlyweb.type'] = 'text/x-ltiddlywiki'
        else:
            environ['tiddlyweb.type'] = 'text/x-tiddlywiki'
    return get_tiddlers(environ, start_response)


def _figure_default_index(environ, bag_name, space, index=None):
    """
    if an app hasn't been specified, check whether the space is new or old.
    old users should get the old default: TiddlyWiki, new users should get
    the new default: the app switcher. The presence of a spaceSetupFlag
    tiddler is the test for this.
    """
    store = environ['tiddlyweb.store']
    if not index and space.name != 'frontpage':
        setupFlag = Tiddler('%sSetupFlag' % space.name, bag_name)
        try:
            setupFlag = store.get(setupFlag)
        except NoTiddlerError:
            setupFlag.bag = space.private_bag()
            try:
                setupFlag = store.get(setupFlag)
            except NoTiddlerError:
                index = DEFAULT_NEWUSER_APP

    return index


def update_space_settings(environ, name):
    """
    Read a tiddler named by SPACE_SERVER_SETTINGS in the current
    space's public bag. Parse each line as a key:value pair which
    is then injected tiddlyweb.query. The goal here is to allow
    a space member to force incoming requests to use specific
    settings, such as alpha or externalized.
    """
    store = environ['tiddlyweb.store']
    space = Space(name)
    bag_name = space.public_bag()
    tiddler = Tiddler(SPACE_SERVER_SETTINGS, bag_name)
    data_text = ''
    try:
        tiddler = store.get(tiddler)
        data_text = tiddler.text
    except StoreError:
        return _figure_default_index(environ, bag_name, space), False

    query_strings = []
    index = ''
    lazy = False
    for line in data_text.split('\n'):
        try:
            key, value = line.split(':', 1)
            key = key.rstrip().lstrip()
            value = value.rstrip().lstrip()
            if key == 'index':
                index = value
            elif key == 'lazy':
                if value.lower() == 'true':
                    lazy = True
            else:
                query_strings.append('%s=%s' % (key, value))
        except ValueError:
            pass

    index = _figure_default_index(environ, bag_name, space, index)

    query_string = ';'.join(query_strings)

    filters, leftovers = parse_for_filters(query_string, environ)
    environ['tiddlyweb.filters'].extend(filters)
    query_data = parse_qs(leftovers, keep_blank_values=True)
    environ['tiddlyweb.query'].update(dict(
        [(key, [value for value in values])
            for key, values in query_data.items()]))

    return index, lazy


def _setup_friendly_environ(environ):
    """
    Manipulate the environ so that we appear to be in the context of the
    recipe appropriate for this current space and the current membership
    status. Return space_name to caller.
    """
    http_host, host_url = determine_host(environ)
    if http_host == host_url:
        space_name = "frontpage"
    else:
        space_name = determine_space(environ, http_host)

    recipe_name = determine_space_recipe(environ, space_name)
    environ['wsgiorg.routing_args'][1]['recipe_name'] = recipe_name.encode(
        'UTF-8')
    return space_name
