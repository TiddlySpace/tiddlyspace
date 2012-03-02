"""
Routine related to web handling of space
listing, creation, subscription, etc.
"""

import urllib
import simplejson

from tiddlyweb.model.bag import Bag
from tiddlyweb.model.recipe import Recipe
from tiddlyweb.model.user import User
from tiddlyweb.model.policy import Policy
from tiddlyweb.store import NoRecipeError, NoBagError, NoUserError
from tiddlyweb.web.http import HTTP403, HTTP404, HTTP409

from tiddlywebplugins.utils import require_any_user

from tiddlywebplugins.tiddlyspace.space import Space
from tiddlywebplugins.tiddlyspace.web import determine_space, determine_host


try:
    JSONDecodeError = simplejson.decoder.JSONDecodeError
except AttributeError:  # Python 2.6+
    JSONDecodeError = ValueError


def add_spaces_routes(selector):
    """
    Set up the routes and handlers used by spaces.
    """
    selector.add('/spaces',  # list all spaces
            GET=list_spaces)
    selector.add('/spaces/{space_name:segment}',
            GET=confirm_space,  # confirm space exists
            PUT=create_space,  # create a new space
            POST=subscribe_space,  # subscribe a space to this space
            )
    selector.add('/spaces/{space_name:segment}/members',  # list space members
            GET=list_space_members)
    selector.add('/spaces/{space_name:segment}/members/{user_name:segment}',
            PUT=add_space_member,  # add member to space
            DELETE=delete_space_member)  # delete from from space


def add_space_member(environ, start_response):
    """
    Add a member to a space if they are not already a member.
    If they are already a member, nothing happens. If the username
    given does not exist, raise 409. If the space does not exist
    raise 404.
    """
    store = environ['tiddlyweb.store']
    space_name = environ['wsgiorg.routing_args'][1]['space_name']
    user_name = environ['wsgiorg.routing_args'][1]['user_name']
    current_user = environ['tiddlyweb.usersign']

    _same_space_required(environ, space_name)

    try:
        change_space_member(store, space_name, add=user_name,
                current_user=current_user)
    except (NoBagError, NoRecipeError):
        raise HTTP404('space %s does not exist' % space_name)
    except NoUserError:
        raise HTTP409('attempt to add non-existent user: %s' % user_name)

    start_response('204 No Content', [])
    return ['']


def change_space_member(store, space_name, add=None, remove=None,
        current_user=None):
    """
    The guts of adding a member to space.
    """
    try:
        space = Space(space_name)
    except ValueError, exc:
        raise HTTP404('Space %s invalid: %s' % (space_name, exc))
    private_bag = store.get(Bag(space.private_bag()))

    if current_user:
        private_bag.policy.allows(current_user, 'manage')

    if remove and len(private_bag.policy.manage) == 1:
        raise HTTP403('must not remove the last member from a space')

    # This will throw NoUserError (to be handled by the caller)
    # if the user does not exist.
    if add:
        store.get(User(add))

    bags = [store.get(Bag(bag)) for bag in space.list_bags()]
    recipes = [store.get(Recipe(bag)) for bag in space.list_recipes()]
    for entity in bags + recipes:
        new_policy = _update_policy(entity.policy, add=add, subtract=remove)
        entity.policy = new_policy
        store.put(entity)


def confirm_space(environ, start_response):
    """
    Confirm a spaces exists. If it does, raise 204. If
    not, raise 404.
    """
    store = environ['tiddlyweb.store']
    space_name = environ['wsgiorg.routing_args'][1]['space_name']
    try:
        space = Space(space_name)
        store.get(Recipe(space.public_recipe()))
        store.get(Recipe(space.private_recipe()))
    except NoRecipeError:
        raise HTTP404('%s does not exist' % space_name)
    start_response('204 No Content', [])
    return ['']


@require_any_user()
def create_space(environ, start_response):
    """
    Create a space if it does not yet exists. If it does
    raise 409.
    """
    space_name = environ['wsgiorg.routing_args'][1]['space_name']
    space_name = urllib.unquote(space_name).decode('UTF-8')
    _validate_space_name(environ, space_name)
    return _create_space(environ, start_response, space_name)


def delete_space_member(environ, start_response):
    """
    Remove a member from a space. If the space does not exist
    raise 404. If the named member is not in the space, do
    nothing.
    """
    store = environ['tiddlyweb.store']
    space_name = environ['wsgiorg.routing_args'][1]['space_name']
    user_name = environ['wsgiorg.routing_args'][1]['user_name']
    current_user = environ['tiddlyweb.usersign']

    _same_space_required(environ, space_name)

    try:
        change_space_member(store, space_name, remove=user_name,
                current_user=current_user)
    except (NoBagError, NoRecipeError):
        raise HTTP404('space %s does not exist' % space_name)
    except NoUserError:
        raise HTTP409('attempt to remove non-member user: %s' % user_name)

    start_response('204 No Content', [])
    return ['']


def list_spaces(environ, start_response):
    """
    List all the spaces on the service, as a JSON list.

    If a "mine" parameter is present, just get the current
    user's spaces.
    """
    store = environ['tiddlyweb.store']
    mine = environ['tiddlyweb.query'].get('mine', [None])[0]
    current_user = environ['tiddlyweb.usersign']['name']
    if mine:
        spaces = []
        try:
            recipe_names = store.storage.cached_storage.user_spaces(
                    current_user)
        except AttributeError:
            recipe_names = store.storage.user_spaces(current_user)
        for recipe in recipe_names:
            spaces.append(Space.name_from_recipe(recipe))
    else:
        spaces = [Space.name_from_recipe(recipe.name) for
                recipe in store.list_recipes() if
                Space.recipe_is_public(recipe.name)]
    start_response('200 OK', [
        ('Cache-Control', 'no-cache'),
        ('Content-Type', 'application/json; charset=UTF-8')])
    return simplejson.dumps([{'name': space, 'uri': space_uri(environ, space)}
        for space in sorted(spaces)])


def list_space_members(environ, start_response):
    """
    List the members of the named space. You must be a member
    to list the members.
    """
    store = environ['tiddlyweb.store']
    space_name = environ['wsgiorg.routing_args'][1]['space_name']
    current_user = environ['tiddlyweb.usersign']
    try:
        space = Space(space_name)
        private_space_bag = store.get(Bag(space.private_bag()))
        private_space_bag.policy.allows(current_user, 'manage')
        members = [member for member in private_space_bag.policy.manage if
                not member.startswith('R:')]
    except (ValueError, NoBagError):
        raise HTTP404('No space for %s' % space_name)
    start_response('200 OK', [
        ('Cache-Control', 'no-cache'),
        ('Content-Type', 'application/json; charset=UTF-8')])
    return simplejson.dumps(members)


def make_space(space_name, store, member):
    """
    The details of creating the bags and recipes that make up a space.
    """
    space = Space(space_name)

    for bag_name in space.list_bags():
        bag = Bag(bag_name)
        bag.policy = _make_policy(member)
        if Space.bag_is_public(bag_name):
            bag.policy.read = []
        store.put(bag)

    public_recipe = Recipe(space.public_recipe())
    public_recipe.set_recipe(space.public_recipe_list())
    private_recipe = Recipe(space.private_recipe())
    private_recipe.set_recipe(space.private_recipe_list())
    private_recipe.policy = _make_policy(member)
    public_recipe.policy = _make_policy(member)
    public_recipe.policy.read = []
    store.put(public_recipe)
    store.put(private_recipe)


def space_uri(environ, space_name):
    """
    Determine the uri of a space based on its name.
    """
    host = environ['tiddlyweb.config']['server_host']['host']
    port = environ['tiddlyweb.config']['server_host']['port']
    scheme = environ['tiddlyweb.config']['server_host']['scheme']
    if not _alien_domain(environ, space_name):
        if port is not '443' and port is not '80':
            uri = '%s://%s.%s:%s/' % (scheme,
                    urllib.quote(space_name.encode('utf-8')),
                    host, port)
        else:
            uri = '%s://%s.%s/' % (scheme,
                    urllib.quote(space_name.encode('utf-8')),
                    host)
    else:
        if space_name == 'frontpage':
            if port is not '443' and port is not '80':
                uri = '%s://%s:%s/' % (scheme, host, port)
            else:
                uri = '%s://%s/' % (scheme, host)
        else:
            uri = '%s://%s/' % (scheme, space_name)
    return uri


def subscribe_space(environ, start_response):
    """
    Subscribe and/or unsubscribe the spaces named in the JSON
    content of the request to the space named in the URI. The current
    user must be a member of the space. Raise 409 if the
    JSON is no good. Raise 404 if the space does not exist.
    Raise 409 if a space in the JSON does not exist.
    """
    store = environ['tiddlyweb.store']
    space_name = environ['wsgiorg.routing_args'][1]['space_name']
    current_user = environ['tiddlyweb.usersign']
    try:
        current_space = Space(space_name)
    except ValueError, exc:
        raise HTTP409('Invalid space name: %s' % exc)
    try:
        # checked for existence, but not used
        store.get(Bag(current_space.public_bag()))
        private_bag = store.get(Bag(current_space.private_bag()))
        public_recipe = store.get(Recipe(current_space.public_recipe()))
        private_recipe = store.get(Recipe(current_space.private_recipe()))
    except (NoBagError, NoRecipeError):
        raise HTTP404('space %s does not exist' % space_name)

    private_bag.policy.allows(current_user, 'manage')
    subscriptions, unsubscriptions = _get_subscription_info(environ)

    public_recipe_list = public_recipe.get_recipe()
    private_recipe_list = private_recipe.get_recipe()

    # operate directly on the recipe lists
    _do_subscriptions(environ, subscriptions, public_recipe_list,
            private_recipe_list, store)
    _do_unsubscriptions(space_name, unsubscriptions, public_recipe_list,
            private_recipe_list, store)

    public_recipe.set_recipe(public_recipe_list)
    store.put(public_recipe)
    private_recipe.set_recipe(private_recipe_list)
    store.put(private_recipe)

    start_response('204 No Content', [])
    return ['']


def _alien_domain(environ, space_name):
    """
    Detect if a space_name is in an alien domain.
    Alien means not in the server_host subdomain or
    _the_ main domain.
    """
    # Some other things will eventually happen here, which
    # is why environ is being passed in.
    if space_name == 'frontpage':
        return True
    return False


def _create_space(environ, start_response, space_name):
    """
    Create the space named by space_name. Raise 201 on success.
    """
    make_space(space_name, environ['tiddlyweb.store'],
            environ['tiddlyweb.usersign']['name'])
    start_response('201 Created', [
        ('Location', space_uri(environ, space_name)),
        ])
    return ['']


def _do_subscriptions(environ, subscriptions, public_recipe_list,
        private_recipe_list, store):
    """
    Add subscriptions to the space represented by public_recipe_list
    and private_recipe_list.
    """
    for space in subscriptions:
        try:
            subscribed_space = _validate_subscription(
                    environ, space, private_recipe_list)
        except ValueError, exc:
            raise HTTP409('Invalid space name: %s' % exc)
        try:
            subscribed_recipe = store.get(
                    Recipe(subscribed_space.public_recipe()))
            for bag, filter_string in subscribed_recipe.get_recipe()[2:]:
                if [bag, filter_string] not in public_recipe_list:
                    public_recipe_list.insert(-1, (bag, filter_string))
                if [bag, filter_string] not in private_recipe_list:
                    private_recipe_list.insert(-2, (bag, filter_string))
        except NoRecipeError, exc:
            raise HTTP409('Invalid content for subscription: %s' % exc)


def _do_unsubscriptions(space_name, unsubscriptions, public_recipe_list,
        private_recipe_list, store):
    """
    Remove unsubscriptions from the space represented by
    public_recipe_list and private_recipe_list.
    """
    for space in unsubscriptions:
        if space == space_name:
            raise HTTP409('Attempt to unsubscribe self')
        try:
            unsubscribed_space = Space(space)
            bag = unsubscribed_space.public_bag()
            public_recipe_list.remove([bag, ""])
            private_recipe_list.remove([bag, ""])
        except ValueError, exc:
            raise HTTP409('Invalid content for unsubscription: %s' % exc)


def _get_subscription_info(environ):
    """
    Extract subscription info from the JSON posted to a space.
    """
    try:
        length = environ['CONTENT_LENGTH']
        content = environ['wsgi.input'].read(int(length))
        info = simplejson.loads(content)
        subscriptions = info.get('subscriptions', [])
        unsubscriptions = info.get('unsubscriptions', [])
    except (JSONDecodeError, KeyError), exc:
        raise HTTP409('Invalid content for subscription: %s' % exc)
    return subscriptions, unsubscriptions


def _make_policy(member):
    """
    Make a new private policy with the named member.
    """
    policy = Policy()
    policy.owner = member
    for constraint in ('read', 'write', 'create', 'delete', 'manage'):
        setattr(policy, constraint, [member])
    policy.accept = ['NONE']
    return policy


def _update_policy(policy, add=None, subtract=None):
    """
    Update the policy adding or subtracting the user named in
    add or subtract.
    """
    for constraint in ('read', 'write', 'create', 'delete', 'manage'):
        constraint_values = getattr(policy, constraint)
        if add and add not in constraint_values:
            if constraint == 'read' and constraint_values == []:
                pass
            else:
                if 'ANY' in constraint_values or 'NONE' in constraint_values:
                    raise HTTP409('Policy contains ANY or NONE.')
                constraint_values.append(add)
        if subtract and subtract in constraint_values:
            constraint_values.remove(subtract)
    return policy


def _same_space_required(environ, space_name):
    """
    Raise 403 unless the current space (http_host) is the same as the
    target space.
    """
    current_space = determine_space(environ, determine_host(environ)[0])
    if current_space != space_name:
        raise HTTP403('space membership changes only allowed from space')


def _validate_space_name(environ, name):
    """
    Determine if space name can be used.
    We've already checked if the space exists.
    """
    store = environ['tiddlyweb.store']
    try:
        space = Space(name)
    except ValueError, exc:
        raise HTTP409(exc)
    # This reserved list should/could be built up from multiple
    # sources.
    reserved_space_names = environ['tiddlyweb.config'].get(
            'socialusers.reserved_names', [])
    if name in reserved_space_names:
        raise HTTP409('Invalid space name: %s' % name)
    try:
        store.get(Recipe(space.private_recipe()))
        raise HTTP409('%s already exists as space' % name)
    except NoRecipeError:
        pass


import tiddlywebplugins.socialusers
original_validate_user = tiddlywebplugins.socialusers._validate_user


def _validate_user_name(environ, user_info):
    """
    Override socialusers _validate_user.
    """
    username = user_info['username']
    _validate_space_name(environ, username)
    return original_validate_user(environ, user_info)


tiddlywebplugins.socialusers._validate_user = _validate_user_name


def _validate_subscription(environ, name, recipe):
    """
    Determine if this space can be subscribed to.

    We know that the space exists, what we want to determine here is if
    it has been blacklisted or already been subscribed.
    """
    space = Space(name)
    if name in environ['tiddlyweb.config'].get('blacklisted_spaces', []):
        raise HTTP409('Subscription not allowed to space: %s' % name)
    elif [space.public_bag(), ''] in recipe:
        raise HTTP409('Space already subscribed: %s' % name)
    return space
