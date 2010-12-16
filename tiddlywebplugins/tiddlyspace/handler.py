"""
HTTP route handlers for TiddlySpace.

The extensions and modifications to the default TiddlyWeb routes.
"""

import simplejson
from datetime import datetime

from tiddlyweb.model.bag import Bag
from tiddlyweb.model.recipe import Recipe
from tiddlyweb.model.tiddler import Tiddler
from tiddlyweb.model.user import User
from tiddlyweb.model.collections import Tiddlers
from tiddlyweb.store import (NoBagError, NoRecipeError, NoUserError,
        NoTiddlerError)
from tiddlyweb import control
from tiddlyweb.web.handler.recipe import get_tiddlers
from tiddlyweb.web.handler.tiddler import get as get_tiddler
from tiddlyweb.web.http import HTTP302, HTTP403, HTTP404
from tiddlyweb.web.sendtiddlers import send_tiddlers
from tiddlyweb.web.util import get_serialize_type

from tiddlywebplugins.utils import require_any_user

from tiddlywebplugins.tiddlyspace.csrf import gen_nonce, get_nonce_components
from tiddlywebplugins.tiddlyspace.space import Space
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


def safe_mode(environ, start_response):
    """
    Serve up a space in safe mode. Safe mode means that
    non-required plugins are turned off and plugins that
    duplicate those in the core bags (system and tiddlyspace)
    are deleted from the store of the space in question.
    """

    http_host, _ = determine_host(environ)
    space_name = determine_space(environ, http_host)
    recipe_name = determine_space_recipe(environ, space_name)
    if recipe_name != '%s_private' % space_name:
        raise HTTP403('membership required for safe mode')

    if environ['REQUEST_METHOD'] == 'GET':
        return _send_safe_mode(environ, start_response)

    store = environ['tiddlyweb.store']

    # Get the list of core plugins
    try:
        core_plugin_tiddler_titles = []
        for bag in [recipe_bag for recipe_bag, _ in Space.CORE_RECIPE]:
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
    # in CORE_RECIPE, remove the systemConfig tag.
    try:
        candidate_tiddlers = control.get_tiddlers_from_recipe(recipe, environ)
    except NoBagError, exc:
        raise HTTP404('recipe %s lists an unknown bag: %s' %
                (recipe.name, exc))
    tiddlers_to_send = Tiddlers()
    for tiddler in candidate_tiddlers:
        if not tiddler.store:
            tiddler = store.get(tiddler)
        if tiddler.bag not in [recipe_bag for
                recipe_bag, _ in Space.CORE_RECIPE]:
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
    space_name = determine_space(environ, http_host)
    recipe_name = determine_space_recipe(environ, space_name)
    environ['wsgiorg.routing_args'][1]['recipe_name'] = recipe_name.encode(
            'UTF-8')
    _, mime_type = get_serialize_type(environ)
    if 'text/html' in mime_type:
        environ['tiddlyweb.type'] = 'text/x-tiddlywiki'
    return get_tiddlers(environ, start_response)


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
    now = datetime.now().strftime('%Y%m%d%H')
    user, space, secret = get_nonce_components(environ)
    csrf_token = gen_nonce(user, space, now, secret)
    start_response('200 OK', [('Content-Type', 'text/html; charset=UTF-8')])
    return ["""
<div id='content'><div class='tiddler'>
<form method='POST'>
<p>Are you sure you wish to run safe mode?</p>
<input type="hidden" name="csrf_token" value="%s" />
<input type='submit' value='Yes' />
</form>
<p><a href='/'>Return to my Space.</a></p>
</div></div>
""" % csrf_token]
