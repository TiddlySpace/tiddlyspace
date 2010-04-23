"""
Routine related to web handling of space
listing, creation, subscription, etc.
"""

import simplejson

from tiddlyweb.model.bag import Bag
from tiddlyweb.model.policy import Policy
from tiddlyweb.model.recipe import Recipe
from tiddlyweb.store import NoRecipeError, NoBagError
from tiddlyweb.web.http import HTTP404, HTTP409

from tiddlywebplugins.utils import require_any_user


def add_spaces_routes(selector):
    """
    Set up the routes and handlers used by spaces.
    """
    selector.add('/spaces', # list all spaces
            GET=list_spaces)
    selector.add('/spaces/{space_name:segment}',
            GET=confirm_space, # confirm space exists
            PUT=create_space,  # create a new space
            )
    selector.add('/spaces/{space_name:segment}/members', # list space members
            GET=list_space_members)


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


@require_any_user()
def create_space(environ, start_response):
    store = environ['tiddlyweb.store']
    space_name = environ['wsgiorg.routing_args'][1]['space_name']
    try:
        store.get(Recipe('%s_private' % space_name))
    except NoRecipeError:
        return _create_space(environ, start_response, space_name)
    raise HTTP409('%s already exists' % space_name)


def list_spaces(environ, start_response):
    store = environ['tiddlyweb.store']
    spaces = [recipe.name.rstrip('_public') for
            recipe in store.list_recipes() if
            recipe.name.endswith('_public')]
    start_response('200 OK', [
        ('Content-Type', 'application/json; charset=UTF-8')
        ])
    return simplejson.dumps(spaces)


@require_any_user()
def list_space_members(environ, start_response):
    store = environ['tiddlyweb.store']
    space_name = environ['wsgiorg.routing_args'][1]['space_name']
    try:
        private_space_bag = store.get(Bag('%s_private' % space_name))
        members = [member for member in private_space_bag.policy.manage if
                not member.startswith('R:')]
    except NoBagError:
        raise HTTP404('No space for %s' % space_name)
    start_response('200 OK', [
        ('Content-Type', 'application/json; charset=UTF-8')
        ])
    return simplejson.dumps(members)


def _create_space(environ, start_response, space_name):
    _validate_space_name(space_name)
    space = _make_space(environ, space_name)
    start_response('201 Created', [])
    return ['']


def _make_policy(member):
    policy = Policy()
    policy.owner = member
    for constraint in ('read', 'write', 'create', 'delete', 'manage'):
        setattr(policy, constraint, [member])
    policy.accept = ['NONE']
    return policy


def _make_space(environ, space_name):
    store = environ['tiddlyweb.store']
    member = environ['tiddlyweb.usersign']['name']

    # XXX stub out the clumsy way for now
    # can make this much more delcarative

    private_bag = Bag('%s_private' % space_name)
    public_bag = Bag('%s_public' % space_name)
    private_bag.policy = _make_policy(member)
    public_bag.policy = _make_policy(member)
    public_bag.policy.read = []
    store.put(private_bag)
    store.put(public_bag)

    public_recipe = Recipe('%s_public' % space_name)
    public_recipe.set_recipe([
        ('system', ''),
        ('tiddlyspace', ''),
        (public_recipe.name, '')
        ])
    private_recipe = Recipe('%s_private' % space_name)
    private_recipe.set_recipe([
        ('system', ''),
        ('tiddlyspace', ''),
        (public_recipe.name, ''),
        (private_recipe.name, '')
        ])
    store.put(public_recipe)
    store.put(private_recipe)


def _validate_space_name(name):
    """
    Determine if space name can be used.
    We've already checked if the space exists.
    """
    if name.islower(): # just a stub for now
        return
    else:
        raise HTTP409('Invalid space name: %s' % name)
