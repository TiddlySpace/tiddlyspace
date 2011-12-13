"""
ControlView is for protecting the pope (PTP).

Jermoelen says:

The PTP issue boiled down to a desire that it should not be possible to
reach tiddler content via a space URI unless that content has been
explicitly stored or included into the space.

The goal was to avoid mischievous people being able to construct URIs
that made it look as though arbitrary content were part of a target
space. Imagine an organisation using the bring your own domain feature
to implement http://mysite.org/ on TiddlySpace. They prepare lots of
content and share it with their community. Then imagine a mischievous
person who wants to make it appear as though http://mysite.org/ were
illegally hosting copyrighted materials. He can upload the material to
his own space, and then, without ControlView, he can construct a URI
that starts with http://mysite.org/ but points to the illegal content.
To a reasonably knowledgeable user, it would look as though the
copyright content were hosted on http://mysite.org/.

The example isn't to suggest that the feature is intended to protect
copyright holders; it's more about protecting groups and individuals
from defamation and fraud.
"""

import urllib

from tiddlyweb.control import recipe_template
from tiddlyweb.filters import parse_for_filters
from tiddlyweb.model.bag import Bag
from tiddlyweb.model.recipe import Recipe
from tiddlyweb.serializer import Serializer
from tiddlyweb.store import NoRecipeError
from tiddlyweb.web.http import HTTP404
from tiddlyweb.web.listentities import list_entities
from tiddlyweb.web.util import get_serialize_type

from tiddlywebplugins.tiddlyspace.space import Space
from tiddlywebplugins.tiddlyspace.web import (determine_host,
        determine_space, determine_space_recipe)


ADMIN_BAGS = ['common', 'MAPUSER', 'MAPSPACE']


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
            response = self._handle_core_request(environ, req_uri,
                    start_response)
            if response:
                return response

        return self.application(environ, start_response)

    # XXX too long!
    def _handle_core_request(self, environ, req_uri, start_response):
        """
        Override a core request, adding filters or sending 404s where
        necessary to limit the view of entities.

        filtering can be disabled with a custom HTTP header X-ControlView set
        to false
        """
        http_host, host_url = determine_host(environ)

        disable_ControlView = environ.get('HTTP_X_CONTROLVIEW') == 'false'
        if http_host != host_url and not disable_ControlView:
            space_name = determine_space(environ, http_host)
            if space_name == None:
                return None
            recipe_name = determine_space_recipe(environ, space_name)
            store = environ['tiddlyweb.store']
            try:
                recipe = store.get(Recipe(recipe_name))
            except NoRecipeError, exc:
                raise HTTP404('No recipe for space: %s', exc)

            space = Space(space_name)

            template = recipe_template(environ)
            bags = space.extra_bags()
            for bag, _ in recipe.get_recipe(template):
                bags.append(bag)
            bags.extend(ADMIN_BAGS)

            search_string = None
            if req_uri.startswith('/recipes') and req_uri.count('/') == 1:
                serialize_type, mime_type = get_serialize_type(environ)
                serializer = Serializer(serialize_type, environ)

                if recipe_name == space.private_recipe():
                    recipes = space.list_recipes()
                else:
                    recipes = [space.public_recipe()]

                def lister():
                    for recipe in recipes:
                        yield Recipe(recipe)

                return list_entities(environ, start_response, mime_type,
                    lister, serializer.list_recipes)

            elif req_uri.startswith('/bags') and req_uri.count('/') == 1:
                serialize_type, mime_type = get_serialize_type(environ)
                serializer = Serializer(serialize_type, environ)

                def lister():
                    for bag in bags:
                        yield Bag(bag)

                return list_entities(environ, start_response, mime_type,
                        lister, serializer.list_bags)

            elif req_uri.startswith('/search') and req_uri.count('/') == 1:
                search_string = ' OR '.join(['bag:%s' % bag
                    for bag in bags])
            else:
                entity_name = urllib.unquote(
                        req_uri.split('/')[2]).decode('utf-8')
                if '/recipes/' in req_uri:
                    valid_recipes = space.list_recipes()
                    if entity_name not in valid_recipes:
                        raise HTTP404('recipe %s not found due to ControlView'
                                % entity_name)
                else:
                    if entity_name not in bags:
                        raise HTTP404('bag %s not found due to ControlView'
                                % entity_name)

            if search_string:
                search_query = environ['tiddlyweb.query'].get('q', [''])[0]
                environ['tiddlyweb.query.original'] = search_query
                if search_query:
                    search_query = '%s AND (%s)' % (search_query,
                            search_string)
                    environ['tiddlyweb.query']['q'][0] = search_query
                else:
                    search_query = '(%s)' % search_string
                    environ['tiddlyweb.query']['q'] = [search_query]


class DropPrivs(object):
    """
    If the incoming request is addressed to some entity not in the
    current space, then drop privileges to GUEST.

    If the incoming request is trying to use JSONP, then drop
    privileges to GUEST
    """

    def __init__(self, application):
        self.application = application
        self.stored_user = None

    def __call__(self, environ, start_response):
        self.stored_user = None
        req_uri = environ.get('SCRIPT_NAME', '') + environ.get('PATH_INFO', '')
        if (req_uri.startswith('/bags/')
                or req_uri.startswith('/recipes/')):
            self._handle_dropping_privs(environ, req_uri)
        self._handle_jsonp(environ)

        output = self.application(environ, start_response)
        if self.stored_user:
            environ['tiddlyweb.usersign'] = self.stored_user
        self.stored_user = None
        return output

    def _handle_dropping_privs(self, environ, req_uri):
        if environ['tiddlyweb.usersign']['name'] == 'GUEST':
            return

        http_host, _ = determine_host(environ)
        space_name = determine_space(environ, http_host)

        if space_name == None:
            return

        space = Space(space_name)

        store = environ['tiddlyweb.store']
        container_name = req_uri.split('/')[2]

        if req_uri.startswith('/bags/'):
            recipe_name = determine_space_recipe(environ, space_name)
            space_recipe = store.get(Recipe(recipe_name))
            template = recipe_template(environ)
            recipe_bags = [bag for bag, _ in space_recipe.get_recipe(template)]
            recipe_bags.extend(space.extra_bags())
            if environ['REQUEST_METHOD'] == 'GET':
                if container_name in recipe_bags:
                    return
                if container_name in ADMIN_BAGS:
                    return
            else:
                base_bags = space.list_bags()
                # add bags in the recipe which may have been added
                # by the recipe mgt. That is: bags which are not
                # included and not core.
                acceptable_bags = [bag for bag in recipe_bags if not (
                    Space.bag_is_public(bag) or Space.bag_is_private(bag)
                    or Space.bag_is_associate(bag))]
                acceptable_bags.extend(base_bags)
                acceptable_bags.extend(ADMIN_BAGS)
                if container_name in acceptable_bags:
                    return

        if (req_uri.startswith('/recipes/')
                and container_name in space.list_recipes()):
            return

        self._drop_privs(environ)
        return

    def _drop_privs(self, environ):
        """
        Drop privileges to GUEST user, and store current user so
        we can replace them after all the work has been done
        """
        self.stored_user = environ['tiddlyweb.usersign']
        environ['tiddlyweb.usersign'] = {'name': 'GUEST', 'roles': []}

    def _handle_jsonp(self, environ):
        """
        If the user is requesting something as JSONP, then we _always_
        want to drop privs
        """
        if environ['tiddlyweb.usersign']['name'] == 'GUEST':
            return

        if environ['tiddlyweb.query'].get('callback'):
            self._drop_privs(environ)

        return


class AllowOrigin(object):
    """
    On every GET request add an Access-Control-Allow-Origin header
    to enable CORS (even though we don't fully use CORS).


    XXX: Note there is a subtle bug in this. The headers is not
    added when an HTTP304 is raised elsewhere in the stack.
    Attempts to fix that directly did not appear to work, more
    effort required.
    """
    def __init__(self, application):
        self.application = application

    def __call__(self, environ, start_response):

        def replacement_start_response(status, headers, exc_info=None):
            if environ['REQUEST_METHOD'] == 'GET':
                headers.append(('Access-Control-Allow-Origin', '*'))
            return start_response(status, headers, exc_info)

        return self.application(environ, replacement_start_response)
