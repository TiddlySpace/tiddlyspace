"""
Routine related to web handling of space
listing, creation, subscription, etc.
"""

import simplejson

from tiddlyweb.model.recipe import Recipe
from tiddlyweb.store import NoRecipeError
from tiddlyweb.web.http import HTTP404


def add_spaces_routes(selector):
    """
    Set up the routes and handlers used by spaces.
    """
    selector.add('/spaces', GET=list_spaces)
    selector.add('/spaces/{space_name:segment}', GET=confirm_space)


def list_spaces(environ, start_response):
    store = environ['tiddlyweb.store']
    spaces = [recipe.name.rstrip('_public') for
            recipe in store.list_recipes() if
            recipe.name.endswith('_public')]
    start_response('200 OK', [
        ('Content-Type', 'application/json; charset=UTF-8')
        ])
    return simplejson.dumps(spaces)


def confirm_space(environ, start_response):
    store = environ['tiddlyweb.store']
    space_name = environ['wsgiorg.routing_args'][1]['space_name']
    try:
        store.get(Recipe('%s_public' % space_name))
        store.get(Recipe('%s_private' % space_name))
    except NoRecipeError:
        raise HTTP404('%s does not exist' % space_name)
    start_response('204 No Content', [])
    return ['']
