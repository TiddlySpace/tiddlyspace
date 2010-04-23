from tiddlyweb.model.bag import Bag
from tiddlyweb.model.recipe import Recipe
from tiddlyweb.filters import parse_for_filters
from tiddlyweb.store import NoBagError, NoRecipeError
from tiddlyweb import control
from tiddlyweb.web.handler.recipe import get_tiddlers
from tiddlyweb.web.handler.tiddler import get as get_tiddler
from tiddlyweb.web.http import HTTP404


def home(environ, start_response):
    """
    handles requests at /, serving either the front page or a space (public or
    private) based on whether a subdomain is used and whether a user is auth'd

    relies on tiddlywebplugins.virtualhosting
    """
    http_host, host_url = _determine_host(environ)
    if http_host == host_url:
        return serve_frontpage(environ, start_response)
    else:
        return serve_space(environ, start_response, http_host)


def friendly_uri(environ, start_response):
    http_host, host_url = _determine_host(environ)
    if http_host == host_url:
        raise HTTP404('No resource found')
    else:
        space_name = _determine_space(environ, http_host)
        recipe_name = _determine_space_recipe(environ, space_name)
        # tiddler_name already in uri
        environ['wsgiorg.routing_args'][1]['recipe_name'] = recipe_name
        return get_tiddler(environ, start_response)



def serve_frontpage(environ, start_response):
    """
    serves front page generated from tiddlers in frontpage bag
    """
    environ['wsgiorg.routing_args'][1]['bag_name'] = 'frontpage'
    environ['wsgiorg.routing_args'][1]['tiddler_name'] = 'index.html'
    return get_tiddler(environ, start_response)


def serve_space(environ, start_response, http_host):
    space_name = _determine_space(environ, http_host)
    recipe_name = _determine_space_recipe(environ, space_name)
    environ['wsgiorg.routing_args'][1]['recipe_name'] = recipe_name
    environ['tiddlyweb.type'] = 'text/x-tiddlywiki'
    return get_tiddlers(environ, start_response)


def _determine_host(environ):
    server_host = environ['tiddlyweb.config']['server_host']
    port = int(server_host['port'])
    if port == 80 or port == 443:
        host_url = server_host['host']
    else:
        host_url = '%s:%s' % (server_host['host'], port)

    http_host = environ.get('HTTP_HOST', host_url)
    return http_host, host_url


def _determine_space_recipe(environ, space_name):
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
    calculates the space associated with a subdomain
    """
    # XXX: This is broken for spaces which are not a subdomain
    # of the main tiddlyspace domain.
    server_host = environ['tiddlyweb.config']['server_host']['host']
    if '.%s' % server_host in http_host:
        return http_host.rsplit('.', server_host.count('.') + 1)[0]
    return None


class ControlView(object):

    def __init__(self, application):
        self.application = application

    def __call__(self, environ, start_response):
        req_uri = environ.get('SCRIPT_NAME', '') + environ.get('PATH_INFO', '')

        if req_uri.startswith('/bags') or req_uri.startswith('/recipes'):
            return self._handle_core_request(
                    environ, start_response, req_uri)
        else:
            return self.application(environ, start_response)

    def _handle_core_request(self, environ, start_response, req_uri):
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

            filter_string = None
            if req_uri == '/recipes':
                if recipe_name.endswith('_private'):
                    filter_string = 'mselect=name:%s_private,name:%s_public' % (
                            space_name, space_name)
                else:
                    filter_string = 'select=name:%s_public' % space_name
            elif req_uri == '/bags':
                filter_string = 'mselect='
                filter_parts = []
                for bag in bags:
                    filter_parts.append('name:%s' % bag)
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

        return self.application(environ, start_response)
