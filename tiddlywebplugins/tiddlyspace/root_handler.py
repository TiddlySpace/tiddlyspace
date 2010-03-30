from tiddlyweb.model.bag import Bag
from tiddlyweb.web.handler.recipe import get_tiddlers
from tiddlyweb.web.handler.tiddler import get as get_tiddler


def home(environ, start_response):
    """
    handles requests at /, serving either the front page or a space (public or
    private) based on whether a subdomain is used and whether a user is auth'd

    relies on tiddlywebplugins.virtualhosting
    """
    server_host = environ['tiddlyweb.config']['server_host']
    port = int(server_host['port'])
    if port == 80 or port == 443:
        host_url = server_host['host']
    else:
        host_url = '%s:%s' % (server_host['host'], port)

    http_host = environ.get('HTTP_HOST', host_url)
    if http_host == host_url:
        return serve_frontpage(environ, start_response)
    else:
        return serve_space(environ, start_response, http_host)


def serve_frontpage(environ, start_response):
    """
    serves front page generated from tiddlers in frontpage bag
    """
    environ['wsgiorg.routing_args'][1]['bag_name'] = 'frontpage'
    environ['wsgiorg.routing_args'][1]['tiddler_name'] = 'index.html'
    return get_tiddler(environ, start_response)


def serve_space(environ, start_response, http_host):
    space = _determine_space(environ, http_host)
    user = environ['tiddlyweb.usersign']['name']

    store = environ['tiddlyweb.store']
    bag = Bag("%s_private" % space)
    bag = store.get(bag)
    members = bag.policy.manage # XXX: authoritative?

    type = 'private' if user in members else 'public'
    recipe_name = '%s_%s' % (space, type)
    environ['wsgiorg.routing_args'][1]['recipe_name'] = recipe_name
    environ['tiddlyweb.type'] = 'text/x-tiddlywiki'
    return get_tiddlers(environ, start_response)


def _determine_space(environ, http_host):
    """
    calculates the space associated with a subdomain
    """
    return http_host.split('.')[0]
