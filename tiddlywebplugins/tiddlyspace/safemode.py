"""
Code for recovering from bad data in a space.
"""

from datetime import datetime

from tiddlyweb import control
from tiddlyweb.model.bag import Bag
from tiddlyweb.model.collections import Tiddlers
from tiddlyweb.model.recipe import Recipe
from tiddlyweb.model.tiddler import Tiddler
from tiddlyweb.store import NoBagError, NoRecipeError, NoTiddlerError
from tiddlyweb.web.http import HTTP403, HTTP404
from tiddlyweb.web.sendtiddlers import send_tiddlers
from tiddlyweb.web.util import get_serialize_type

from tiddlywebplugins.tiddlyspace.csrf import gen_nonce, get_nonce_components
from tiddlywebplugins.tiddlyspace.space import Space
from tiddlywebplugins.tiddlyspace.web import (determine_host,
        determine_space, determine_space_recipe)


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
    core_plugin_tiddler_titles = _get_core_plugins(store)

    # Delete those plugins in the space's recipes which
    # duplicate the core plugins
    recipe = _delete_duplicates(environ, core_plugin_tiddler_titles,
            recipe_name, space_name)

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


def _delete_duplicates(environ, titles, recipe_name, space_name):
    store = environ['tiddlyweb.store']
    try:
        recipe = store.get(Recipe(recipe_name))
        template = control.recipe_template(environ)
        recipe_list = recipe.get_recipe(template)
        space_bags = [bag for bag, _ in recipe_list
                if bag.startswith('%s_' % space_name)]
        for title in titles:
            for bag in space_bags:
                try:
                    tiddler = Tiddler(title, bag)
                    tiddler = store.get(tiddler)
                except NoTiddlerError:
                    continue
                store.delete(tiddler)
    except NoRecipeError, exc:
        raise HTTP404('space recipe not found while trying safe mode: %s'
                % exc)
    return recipe


def _get_core_plugins(store):
    core_plugin_tiddler_titles = []
    try:
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
    return core_plugin_tiddler_titles


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
