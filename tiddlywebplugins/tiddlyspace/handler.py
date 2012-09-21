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
from tiddlyweb.store import NoBagError
from tiddlyweb import control
from tiddlyweb.web.handler.recipe import get_tiddlers
from tiddlyweb.web.handler.tiddler import get as get_tiddler
from tiddlyweb.web.http import HTTP403
from tiddlyweb.web.util import get_serialize_type

from tiddlywebplugins.utils import require_any_user

from tiddlywebplugins.tiddlyspace.web import (determine_host,
        determine_space, determine_space_recipe)


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
    _setup_friendly_environ(environ)
    _extra_query_update(environ)

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

    _extra_query_update(environ)

    index = environ['tiddlyweb.space_settings']['index']
    if index:
        environ['wsgiorg.routing_args'][1]['tiddler_name'] = index.encode(
                'UTF-8')
        return get_tiddler(environ, start_response)
    if 'text/html' in mime_type:
        environ['tiddlyweb.type'] = 'text/x-tiddlywiki'
    return get_tiddlers(environ, start_response)


def _extra_query_update(environ):
    """
    If extra_query is set via ServerSettings, then process that
    information as query strings and filters.
    """
    extra_query = environ['tiddlyweb.space_settings']['extra_query']
    if extra_query:
        filters, leftovers = parse_for_filters(extra_query, environ)
        environ['tiddlyweb.filters'].extend(filters)
        query_data = parse_qs(leftovers, keep_blank_values=True)
        environ['tiddlyweb.query'].update(dict(
            [(key, [value for value in values])
                for key, values in query_data.items()]))


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
