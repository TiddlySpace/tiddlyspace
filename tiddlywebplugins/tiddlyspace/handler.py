"""
HTTP route handlers for TiddlySpace.

The extensions and modifications to the default TiddlyWeb routes.
"""

import simplejson

from tiddlyweb.model.bag import Bag
from tiddlyweb.model.recipe import Recipe
from tiddlyweb.model.user import User
from tiddlyweb.store import NoBagError, NoRecipeError, NoUserError
from tiddlyweb.filters import parse_for_filters
from tiddlyweb import control
from tiddlyweb.web.handler.recipe import get_tiddlers
from tiddlyweb.web.handler.tiddler import get as get_tiddler
from tiddlyweb.web.http import HTTP302, HTTP403, HTTP404

from tiddlywebplugins.utils import require_any_user

import tiddlywebplugins.status


def home(environ, start_response):
    """
    handles requests at /, serving either the front page or a space (public or
    private) based on whether a subdomain is used and whether a user is auth'd

    relies on tiddlywebplugins.virtualhosting
    """
    http_host, host_url = _determine_host(environ)
    if http_host == host_url:
        usersign = environ['tiddlyweb.usersign']['name']
        try:
            store = environ['tiddlyweb.store']
            user = store.get(User(usersign))
        except NoUserError:
            usersign = 'GUEST'
        if usersign == 'GUEST':
            return serve_frontpage(environ, start_response)
        else: # authenticated user
            scheme = environ['tiddlyweb.config']['server_host']['scheme']
            uri = '%s://%s.%s' % (scheme, usersign, host_url)
            raise HTTP302(uri)
    else: # subdomain
        return serve_space(environ, start_response, http_host)


def friendly_uri(environ, start_response):
    """
    Transform a not alread mapped request at the root of a space
    into a request for a tiddler in the public or private recipe
    of the current space.
    """
    http_host, host_url = _determine_host(environ)
    if http_host == host_url:
        raise HTTP404('No resource found')
    else:
        space_name = _determine_space(environ, http_host)
        recipe_name = _determine_space_recipe(environ, space_name)
        # tiddler_name already in uri
        environ['wsgiorg.routing_args'][1]['recipe_name'] = recipe_name
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
    space_name = _determine_space(environ, http_host)
    recipe_name = _determine_space_recipe(environ, space_name)
    environ['wsgiorg.routing_args'][1]['recipe_name'] = recipe_name
    environ['tiddlyweb.type'] = 'text/x-tiddlywiki'
    return get_tiddlers(environ, start_response)


def _determine_host(environ):
    """
    Extract the current HTTP host from the environment.
    Return that plus the server_host from config. This is
    used to help calculate what space we are in when HTTP
    requests are made.
    """
    server_host = environ['tiddlyweb.config']['server_host']
    port = int(server_host['port'])
    if port == 80 or port == 443:
        host_url = server_host['host']
    else:
        host_url = '%s:%s' % (server_host['host'], port)

    http_host = environ.get('HTTP_HOST', host_url)
    return http_host, host_url


def _determine_space_recipe(environ, space_name):
    """
    Given a space name, check if the current user is a member of that
    named space. If so, use the private recipe.
    """
    store = environ['tiddlyweb.store']
    user = environ['tiddlyweb.usersign']['name']
    bag = Bag("%s_private" % space_name)
    try:
        bag = store.get(bag)
    except NoBagError, exc:
        raise HTTP404('Space for %s does not exist' % space_name)
    members = bag.policy.manage # XXX: authoritative?

    space_type = 'private' if user in members else 'public'
    recipe_name = '%s_%s' % (space_name, space_type)
    return recipe_name


def _determine_space(environ, http_host):
    """
    Calculate the space associated with a subdomain.
    """
    # XXX: This is broken for spaces which are not a subdomain
    # of the main tiddlyspace domain.
    server_host = environ['tiddlyweb.config']['server_host']['host']
    if '.%s' % server_host in http_host:
        return http_host.rsplit('.', server_host.count('.') + 1)[0]
    return None


original_gather_data = tiddlywebplugins.status._gather_data


def _status_gather_data(environ):
    data = original_gather_data(environ)
    data['server_host'] = environ['tiddlyweb.config']['server_host']
    return data


tiddlywebplugins.status._gather_data = _status_gather_data


class ControlView(object):
    """
    WSGI Middleware which adapts an incoming request to restrict what
    entities from the store are visible to the requestor. The effective
    result is that only those bags and recipes contained in the current
    space are visible in the HTTP routes.
    """

    def __init__(self, application):
        self.application = application

    def __call__(self, environ, start_response):
        req_uri = environ.get('SCRIPT_NAME', '') + environ.get('PATH_INFO', '')

        if (req_uri.startswith('/bags') or
                req_uri.startswith('/recipes') or
                req_uri.startswith('/search')):
            self._handle_core_request(environ, start_response, req_uri)

        def replacement_start_response(status, headers, exc_info=None):
            if environ['REQUEST_METHOD'] == 'GET':
                headers.append(('Access-Control-Allow-Origin', '*'))
            return start_response(status, headers, exc_info)

        return self.application(environ, replacement_start_response)

    # XXX too long!
    def _handle_core_request(self, environ, start_response, req_uri):
        """
        Override a core request, adding filters or sending 404s where
        necessary to limit the view of entities.
        """
        http_host, host_url = _determine_host(environ)
        if http_host != host_url:
            space_name = _determine_space(environ, http_host)
            recipe_name = _determine_space_recipe(environ, space_name)
            store = environ['tiddlyweb.store']
            try:
                recipe = store.get(Recipe(recipe_name))
            except NoRecipeError, exc:
                raise HTTP404('No recipe for space: %s', exc)

            template = control.recipe_template(environ)
            bags = [bag for bag, _ in recipe.get_recipe(template)]
            bags.insert(0, "MAPUSER")

            filter_string = None
            if req_uri.startswith('/recipes') and req_uri.count('/') == 1:
                if recipe_name.endswith('_private'):
                    filter_string = (
                            'mselect=name:%s_private,name:%s_public' % (
                            space_name, space_name))
                else:
                    filter_string = 'select=name:%s_public' % space_name
            elif req_uri.startswith('/bags') and req_uri.count('/') == 1:
                filter_string = 'mselect='
                filter_parts = []
                for bag in bags:
                    filter_parts.append('name:%s' % bag)
                filter_string += ','.join(filter_parts)
            elif req_uri.startswith('/search') and req_uri.count('/') == 1:
                filter_string = 'mselect='
                filter_parts = []
                for bag in bags:
                    filter_parts.append('bag:%s' % bag)
                filter_string += ','.join(filter_parts)
            else:
                entity_name = req_uri.split('/')[2]
                if '/recipes/' in req_uri:
                    valid_recipes = ['%s_%s' % (space_name, status)
                            for status in ['private', 'public']]
                    if entity_name not in valid_recipes:
                        raise HTTP404('recipe %s not found' % entity_name)
                else:
                    if entity_name not in bags:
                        raise HTTP404('bag %s not found' % entity_name)

            if filter_string:
                filters, _ = parse_for_filters(filter_string)
                for single_filter in filters:
                    environ['tiddlyweb.filters'].insert(0, single_filter)
