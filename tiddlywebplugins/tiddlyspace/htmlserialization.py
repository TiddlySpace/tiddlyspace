"""
Enhance the default HTML serialization so that when we display
a single tiddler it includes a link to the tiddler in its space.
"""

from tiddlyweb.model.bag import Bag
from tiddlyweb.model.policy import PermissionsError
from tiddlyweb.model.recipe import Recipe
from tiddlyweb.serializations.html import Serialization as HTMLSerialization
from tiddlyweb.wikitext import render_wikitext
from tiddlyweb.web.util import encode_name, tiddler_url, get_route_value

from tiddlywebplugins.tiddlyspace.space import Space
from tiddlywebplugins.tiddlyspace.spaces import space_uri
from tiddlywebplugins.tiddlyspace.template import send_template


class Serialization(HTMLSerialization):
    """
    Subclass of the HTML serialization that adds a "space link"
    linking to the tiddler in the wiki. Uses templates instead of
    HTMLPresenter.
    """

    def __init__(self, environ=None):
        """
        Initialize the serialization. Delete tiddlyweb.title to
        turn off HTMLPresenter.
        """
        HTMLSerialization.__init__(self, environ)
        del self.environ['tiddlyweb.title']

    def list_recipes(self, recipes):
        """
        Send recipes out recipes.html template.
        """
        return send_template(self.environ, 'recipes.html', {
            'meta_keywords': 'recipes, tiddlyspace',
            'meta_description': 'A list of recipes on TiddlySpace',
            'recipes': recipes,
            'title': 'Recipes'})

    def list_bags(self, bags):
        """
        Send bags out bags.html template.
        """
        return send_template(self.environ, 'bags.html', {
            'meta_keywords': 'bags, tiddlyspace',
            'meta_description': 'A list of bags on TiddlySpace',
            'bags': bags,
            'title': 'Bags'})

    def list_tiddlers(self, tiddlers):
        """
        List the tiddlers from a container. Include a link
        to the container if it can be viewed by the current
        user. List the available serializations for the tiddlers.
        """
        tiddlers_url = (self.environ.get('SCRIPT_NAME', '')
                + self.environ.get('PATH_INFO', ''))
        if tiddlers.is_search and 'tiddlyweb.query.original' in self.environ:
            title = 'Search for %s' % self.environ['tiddlyweb.query.original']
        else:
            title = tiddlers.title
        revisions = tiddlers.is_revisions
        routing_args = self.environ.get('wsgiorg.routing_args', ([], {}))[1]
        container_name = ''
        container_type = 'bags'
        container_url = ''
        container_policy = False
        store = self.environ['tiddlyweb.store']
        user = self.environ['tiddlyweb.usersign']
        if routing_args and not tiddlers.is_search:
            if 'recipe_name' in routing_args:
                name = get_route_value(self.environ, 'recipe_name')
                container_name = 'Recipe %s' % name
                container_type = 'recipes'
                try:
                    store.get(Recipe(name)).policy.allows(user, 'read')
                    container_url = '/recipes/%s' % name
                    container_policy = True
                except PermissionsError:
                    pass
            elif 'bag_name' in routing_args:
                name = get_route_value(self.environ, 'bag_name')
                container_url = '/bags/%s' % name
                container_name = 'Bag %s' % name
                try:
                    store.get(Bag(name)).policy.allows(user, 'manage')
                    container_policy = True
                except PermissionsError:
                    pass

            if revisions:
                container_policy = True

        try:
            query_string = self.environ.get('QUERY_STRING', '').decode('utf-8')
        except UnicodeDecodeError:
            query_string = u'invalid+query+string+encoding'

        links = self.environ.get('tiddlyweb.config',
                {}).get('extension_types', {}).keys()

        if query_string:
            query_string = '?%s' % query_string

        # chop off the possible trailing .html
        tiddlers_url = tiddlers_url.rsplit('.html')[0]

        return send_template(self.environ, 'tiddlers.html', {
            'meta_keywords': 'tiddlers, tiddlyspace',
            'meta_description': 'A list of tiddlers on TiddlySpace',
            'title': title,
            'tiddler_url': tiddler_url,
            'environ': self.environ,
            'revisions': revisions,
            'tiddlers_url': tiddlers_url.decode('utf-8', 'replace'),
            'query_string': query_string,
            'container_type': container_type,
            'container_name': container_name,
            'container_url': container_url,
            'container_policy': container_policy,
            'links': links,
            'tiddlers': tiddlers})

    def recipe_as(self, recipe):
        """
        Send a recipe out the recipe.html template.
        """
        return send_template(self.environ, 'recipe.html', {
            'meta_keywords': 'recipe, tiddlyspace',
            'meta_description': 'A recipe on TiddlySpace',
            'recipe': recipe,
            'title': 'Recipe %s' % recipe.name})

    def bag_as(self, bag):
        """
        Send a bag out as HTML via the bag.html template.
        Report on the permissions and policy for this bag
        for the viewing user.
        """
        user = self.environ['tiddlyweb.usersign']
        policy = bag.policy
        policy.owner = [policy.owner]
        user_perms = bag.policy.user_perms(user)

        return send_template(self.environ, 'bag.html', {
            'meta_keywords': 'bag, tiddlyspace',
            'meta_description': 'A bag on TiddlySpace',
            'policy': policy,
            'user_perms': user_perms,
            'bag': bag,
            'title': 'Bag %s' % bag.name})

    def tiddler_as(self, tiddler):
        """
        Transform the provided tiddler into an HTML
        representation of the tiddler packaged in a
        DIV. Render the content using the render_wikitext
        subsystem. Links to the tiddler in the wiki are
        provided.
        """
        user = self.environ['tiddlyweb.usersign']
        store = self.environ['tiddlyweb.store']
        if tiddler.recipe:
            list_link = '/recipes/%s/tiddlers' % encode_name(tiddler.recipe)
            list_title = 'Tiddlers in Recipe %s' % tiddler.recipe
        else:
            list_link = '/bags/%s/tiddlers' % encode_name(tiddler.bag)
            list_title = 'Tiddlers in Bag %s' % tiddler.bag
        try:
            store.get(Bag(tiddler.bag)).policy.allows(user, 'manage')
            container_policy = True
        except PermissionsError:
            container_policy = False
        space_link = self._space_link(tiddler)
        try:
            modifier_link = space_uri(self.environ, tiddler.modifier)
        except AttributeError:
            modifier_link = ""
        try:
            creator_link = space_uri(self.environ, tiddler.creator)
        except AttributeError:
            creator_link = ""

        html = render_wikitext(tiddler, self.environ)
        return send_template(self.environ, 'tiddler.html', {
            'meta_keywords': ', '.join(tiddler.tags),
            'meta_description': tiddler.title,
            'title': '%s' % tiddler.title,
            'tags': tiddler.tags,
            'modifier_link': modifier_link,
            'creator_link': creator_link,
            'fields': tiddler.fields,
            'html': html,
            'list_link': list_link,
            'list_title': list_title,
            'space_link': space_link,
            'tiddler': tiddler,
            'container_policy': container_policy,
            'tiddler_url': tiddler_url(self.environ, tiddler)})

    def _space_link(self, tiddler):
        """
        Create a link back to this tiddler in its space.
        """
        if tiddler.recipe:
            link = _encode_space_link(tiddler)
        elif _space_bag(tiddler.bag):
            space_name = tiddler.bag.split('_', 1)[0]
            space_link_uri = space_uri(self.environ, space_name).rstrip('/')
            link = _encode_space_link(tiddler)
            link = '%s%s' % (space_link_uri, link)
        else:
            return ''

        return '%s%s' % (self._server_prefix(), link)


def _space_bag(bag_name):
    """
    Return true if the bag is a standard space bag. If it is
    there will be a space link.
    """
    return Space.bag_is_public(bag_name) or Space.bag_is_private(bag_name)


def _encode_space_link(tiddler):
    """
    Make the space link form: #[[tiddler.title]]
    """
    return '/#%%5B%%5B%s%%5D%%5D' % encode_name(tiddler.title)
