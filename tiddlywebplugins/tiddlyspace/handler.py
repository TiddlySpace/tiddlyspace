"""
HTTP route handlers for TiddlySpace.

The extensions and modifications to the default TiddlyWeb routes.
"""

import simplejson

from tiddlyweb.model.bag import Bag
from tiddlyweb.model.user import User
from tiddlyweb.store import NoBagError, NoUserError
from tiddlyweb import control
from tiddlyweb.web.handler.recipe import get_tiddlers
from tiddlyweb.web.handler.tiddler import get as get_tiddler
from tiddlyweb.web.http import HTTP302, HTTP403, HTTP404
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
    http_host, host_url = determine_host(environ)
    if http_host == host_url:
        raise HTTP404('No resource found')
    else:
        space_name = determine_space(environ, http_host)
        recipe_name = determine_space_recipe(environ, space_name)
        # tiddler_name already in uri
        environ['wsgiorg.routing_args'][1]['recipe_name'] = recipe_name.encode(
            'UTF-8')
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


def home(environ, start_response):
    """
    handles requests at /, serving either the front page or a space (public or
    private) based on whether a subdomain is used and whether a user is auth'd

    relies on tiddlywebplugins.virtualhosting
    """
    http_host, host_url = determine_host(environ)
    if http_host == host_url:
        usersign = environ['tiddlyweb.usersign']['name']
        try:
            store = environ['tiddlyweb.store']
            store.get(User(usersign))
        except NoUserError:
            usersign = 'GUEST'
        if usersign == 'GUEST':
            return serve_frontpage(environ, start_response)
        else:  # authenticated user
            scheme = environ['tiddlyweb.config']['server_host']['scheme']
            uri = '%s://%s.%s' % (scheme, usersign, host_url)
            raise HTTP302(uri)
    else:  # subdomain
        return serve_space(environ, start_response, http_host)


def serve_frontpage(environ, start_response):
    """
    Serve TiddlySpace front page from the special frontpage_public recipe.
    """
    environ['wsgiorg.routing_args'][1]['recipe_name'] = 'frontpage_public'
    environ['tiddlyweb.type'] = 'text/x-tiddlywiki'
    return get_tiddlers(environ, start_response)


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
    if 'text/html' in mime_type:
        environ['tiddlyweb.type'] = 'text/x-tiddlywiki'
    return get_tiddlers(environ, start_response)
