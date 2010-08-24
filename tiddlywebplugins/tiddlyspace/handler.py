"""
HTTP route handlers for TiddlySpace.

The extensions and modifications to the default TiddlyWeb routes.
"""

import simplejson

from tiddlyweb.model.bag import Bag
from tiddlyweb.model.recipe import Recipe
from tiddlyweb.model.tiddler import Tiddler
from tiddlyweb.model.user import User
from tiddlyweb.model.collections import Tiddlers
from tiddlyweb.store import (NoBagError, NoRecipeError, NoUserError,
        NoTiddlerError)
from tiddlyweb.filters import parse_for_filters
from tiddlyweb import control
from tiddlyweb.web.handler.recipe import get_tiddlers
from tiddlyweb.web.handler.tiddler import get as get_tiddler
from tiddlyweb.web.http import HTTP302, HTTP403, HTTP404
from tiddlyweb.web.sendtiddlers import send_tiddlers
from tiddlyweb.web.util import get_serialize_type

from tiddlywebplugins.utils import require_any_user

import tiddlywebplugins.status


CORE_BAGS = ['system', 'common', 'tiddlyspace']
ADMIN_BAGS = ['common', 'MAPUSER', 'MAPSPACE']


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


def safe_mode(environ, start_response):
    """
    Serve up a space in safe mode. Safe mode means that
    non-required plugins are turned off and plugins that
    duplicate those in the core bags (system and tiddlyspace)
    are deleted from the store of the space in question.
    """

    http_host, _ = _determine_host(environ)
    space_name = _determine_space(environ, http_host)
    recipe_name = _determine_space_recipe(environ, space_name)
    if recipe_name != '%s_private' % space_name:
        raise HTTP403('membership required for safe mode')

    if environ['REQUEST_METHOD'] == 'GET':
        return _send_safe_mode(environ, start_response)

    store = environ['tiddlyweb.store']

    # Get the list of core plugins
    try:
        core_plugin_tiddler_titles = []
        for bag in CORE_BAGS:
            bag = store.get(Bag(bag))
            for tiddler in store.list_bag_tiddlers(bag):
                if not tiddler.store:
                    tiddler = store.get(tiddler)
                if 'systemConfig' in tiddler.tags:
                    core_plugin_tiddler_titles.append(tiddler.title)
        core_plugin_tiddler_titles = set(core_plugin_tiddler_titles)
    except NoBagError, exc:
        raise HTTP404('core bag not found while trying safe mode: %s' % exc)

    # Delete those plugins in the space's recipes which
    # duplicate the core plugins
    try:
        recipe = store.get(Recipe(recipe_name))
        template = control.recipe_template(environ)
        recipe_list = recipe.get_recipe(template)
        space_bags = [bag for bag, _ in recipe_list
                if bag.startswith('%s_' % space_name)]
        for title in core_plugin_tiddler_titles:
            for bag in space_bags:
                try:
                    tiddler = Tiddler(title, bag)
                    tiddler = store.get(tiddler)
                except NoTiddlerError:
                    continue
                store.delete(tiddler)
    except NoRecipeError, exc:
        raise HTTP404(
                'space recipe not found while trying safe mode: %s' % exc)

    # Process the recipe. For those tiddlers which do not have a bag
    # in CORE_BAGS, remove the systemConfig tag.
    try:
        candidate_tiddlers = control.get_tiddlers_from_recipe(recipe, environ)
    except NoBagError, exc:
        raise HTTP404('recipe %s lists an unknown bag: %s' %
                (recipe.name, exc))
    tiddlers_to_send = Tiddlers()
    for tiddler in candidate_tiddlers:
        if tiddler.bag not in CORE_BAGS:
            if not tiddler.store:
                tiddler = store.get(tiddler)
            if 'systemConfig' in tiddler.tags:
                tiddler.tags.append('systemConfigDisable')
        tiddler.recipe = recipe.name
        tiddlers_to_send.add(tiddler)

    _, mime_type = get_serialize_type(environ)
    if 'text/html' in mime_type or 'x-www-form' in environ['tiddlyweb.type']:
        environ['tiddlyweb.type'] = 'text/x-tiddlywiki'
    return send_tiddlers(environ, start_response, tiddlers=tiddlers_to_send)


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
    environ['wsgiorg.routing_args'][1]['recipe_name'] = recipe_name.encode(
            'UTF-8')
    _, mime_type = get_serialize_type(environ)
    if 'text/html' in mime_type:
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
    bag = Bag('%s_private' % space_name)
    try:
        bag = store.get(bag)
    except NoBagError:
        raise HTTP404('Space for %s does not exist' % space_name)
    members = bag.policy.manage  # XXX: authoritative?

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
    else:
        if ':' in http_host:
            http_host = http_host.split(':', 1)[0]
        store = environ['tiddlyweb.store']
        tiddler = Tiddler(http_host, 'MAPSPACE')
        try:
            tiddler = store.get(tiddler)
            return tiddler.fields['mapped_space']
        except (KeyError, NoBagError, NoTiddlerError):
            pass
    return None


def _send_safe_mode(environ, start_response):
    """
    Send a form that initiates safe_mode by asking
    the user to confirm that they want it and then
    POSTing back to the same URI.

    XXX: This should maybe be replaced with a tiddler.
    However, then that tiddler will be visible in spaces
    and we don't want that.
    """
    environ['tiddlyweb.title'] = 'Confirm Safe Mode'
    start_response('200 OK', [('Content-Type', 'text/html; charset=UTF-8')])
    return ["""
<div id='content'><div class='tiddler'>
<form method='POST'>
<p>Are you sure you wish to run safe mode?</p>
<input type='submit' value='Yes' />
</form>
<p><a href='/'>Return to my Space.</a></p>
</div></div>
"""]


original_gather_data = tiddlywebplugins.status._gather_data


def _status_gather_data(environ):
    data = original_gather_data(environ)
    data['server_host'] = environ['tiddlyweb.config']['server_host']
    return data


tiddlywebplugins.status._gather_data = _status_gather_data


class DropPrivs(object):
    """
    If the incoming request is addressed to some entity not in the
    current space, then drop privileges to GUEST.
    """

    def __init__(self, application):
        self.application = application
        self.stored_user = None

    def __call__(self, environ, start_response):
        req_uri = environ.get('SCRIPT_NAME', '') + environ.get('PATH_INFO', '')
        if (req_uri.startswith('/bags/')
                or req_uri.startswith('/recipes/')):
            self._handle_dropping_privs(environ, req_uri)

        output = self.application(environ, start_response)
        if self.stored_user:
            environ['tiddlyweb.usersign'] = self.stored_user
        return output

    def _handle_dropping_privs(self, environ, req_uri):
        if environ['tiddlyweb.usersign']['name'] == 'GUEST':
            return

        http_host, host_url = _determine_host(environ)
        space_name = _determine_space(environ, http_host)

        if space_name == None:
            return

        store = environ['tiddlyweb.store']
        container_name = req_uri.split('/')[2]

        if req_uri.startswith('/bags/'):
            recipe_name = _determine_space_recipe(environ, space_name)
            space_recipe = store.get(Recipe(recipe_name))
            template = control.recipe_template(environ)
            recipe_bags = [bag for bag, _ in space_recipe.get_recipe(template)]
            if environ['REQUEST_METHOD'] == 'GET':
                if container_name in recipe_bags:
                    return
                if container_name in ADMIN_BAGS:
                    return
            else:
                base_bags = ['%s_public' % space_name,
                        '%s_private' % space_name]
                acceptable_bags = [bag for bag in recipe_bags if not (
                    bag.endswith('_public') or bag.endswith('_private'))]
                acceptable_bags.extend(base_bags)
                acceptable_bags.extend(ADMIN_BAGS)  # XXX this leaves a big hole
                if container_name in acceptable_bags:
                    return

        if req_uri.startswith('/recipes/'):
            space_public_name = '%s_public' % space_name
            space_private_name = '%s_private' % space_name
            if container_name in [space_public_name, space_private_name]:
                return

        self.stored_user = environ['tiddlyweb.usersign']
        environ['tiddlyweb.usersign'] = {'name': 'GUEST', 'roles': []}
        return


class AllowOrigin(object):

    def __init__(self, application):
        self.application = application

    def __call__(self, environ, start_response):
        def replacement_start_response(status, headers, exc_info=None):
            if environ['REQUEST_METHOD'] == 'GET':
                headers.append(('Access-Control-Allow-Origin', '*'))
            return start_response(status, headers, exc_info)
        return self.application(environ, replacement_start_response)


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

        if (req_uri.startswith('/bags')
                or req_uri.startswith('/search')
                or req_uri.startswith('/recipes')):
            self._handle_core_request(environ, req_uri)

        return self.application(environ, start_response)

    # XXX too long!
    def _handle_core_request(self, environ, req_uri):
        """
        Override a core request, adding filters or sending 404s where
        necessary to limit the view of entities.

        filtering can be disabled with a custom HTTP header X-ControlView set
        to false
        """
        http_host, host_url = _determine_host(environ)

        request_method = environ['REQUEST_METHOD']

        disable_ControlView = environ.get('HTTP_X_CONTROLVIEW') == 'false'
        if http_host != host_url and not disable_ControlView:
            space_name = _determine_space(environ, http_host)
            if space_name == None:
                return
            recipe_name = _determine_space_recipe(environ, space_name)
            store = environ['tiddlyweb.store']
            try:
                recipe = store.get(Recipe(recipe_name))
            except NoRecipeError, exc:
                raise HTTP404('No recipe for space: %s', exc)

            template = control.recipe_template(environ)
            bags = []
            subscriptions = []
            for bag, _ in recipe.get_recipe(template):
                bags.append(bag)
                if (bag.endswith('_public') and
                        not bag.startswith('%s_p' % space_name)):
                    subscriptions.append(bag[:-7])
            bags.extend(ADMIN_BAGS)

            filter_string = None
            if req_uri.startswith('/recipes') and req_uri.count('/') == 1:
                filter_string = 'mselect='
                if recipe_name.endswith('_private'):
                    filter_parts = ['name:%s_%s' % (space_name, status)
                            for status in ('private', 'public')]
                else:
                    filter_parts = ['name:%s_public' % space_name]
                for subscription in subscriptions:
                    filter_parts.append('name:%s_public' % subscription)
                filter_string += ','.join(filter_parts)
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
                            for status in ('private', 'public')]
                    valid_recipes += ['%s_public' % _space_name
                            for _space_name in subscriptions]
                    if entity_name not in valid_recipes:
                        raise HTTP404('recipe %s not found' % entity_name)
                else:
                    if entity_name not in bags:
                        raise HTTP404('bag %s not found' % entity_name)

            if filter_string:
                filters, _ = parse_for_filters(filter_string)
                for single_filter in filters:
                    environ['tiddlyweb.filters'].insert(0, single_filter)
