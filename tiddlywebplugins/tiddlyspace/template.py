"""
Send a template with some default data.
"""

from jinja2 import TemplateNotFound

from tiddlywebplugins.virtualhosting import original_server_host_url
from tiddlyweb import control
from tiddlyweb.model.tiddler import Tiddler
from tiddlyweb.model.recipe import Recipe
from tiddlyweb.store import StoreError

from tiddlywebplugins.templates import get_template
from tiddlyweb.web.util import server_base_url, encode_name
from tiddlywebplugins.tiddlyspace.web import (determine_space,
        determine_space_recipe, determine_host)


CUSTOMIZABLES = ['friendlytiddler.html', 'friendlytiddlers.html',
    'search.html']


def send_template(environ, template_name, template_data=None):
    """
    Set some defaults for a template and send the output.
    """
    default_css_tiddler = '/bags/common/tiddlers/profile.css'
    if template_data is None:
        template_data = {}
    html_template_prefix = environ['tiddlyweb.space_settings']['htmltemplate']
    if html_template_prefix:
        default_css_tiddler = ('/bags/common/tiddlers/%s.css' %
                html_template_prefix)
        html_template_prefix += '/'
        try:
            name = html_template_prefix + template_name
            template = get_template(environ, name)
        except TemplateNotFound:
            template = get_template(environ, template_name)
    else:
        template = get_template(environ, template_name)

    store = environ['tiddlyweb.store']

    linked_resources = {
            'HtmlCss': [],
            'HtmlJavascript': []}

    if not html_template_prefix or template_name in CUSTOMIZABLES:
        linked_resources['HtmlCss'] = [default_css_tiddler]
        # Load CSS and JavaScript overrides.
        current_space = determine_space(environ, determine_host(environ)[0])
        if current_space:
            recipe_name = determine_space_recipe(environ, current_space)
            try:
                recipe = store.get(Recipe(recipe_name))
                for title in linked_resources:
                    try:
                        tiddler = Tiddler(title)
                        bag = control.determine_bag_from_recipe(recipe,
                                tiddler, environ)
                        tiddler.bag = bag.name
                        try:
                            tiddler = store.get(tiddler)
                            if 'Javascript' in title:
                                url_content = tiddler.text.strip()
                                if url_content:
                                    urls = url_content.split('\n')
                                    linked_resources[title] = urls
                            else:
                                url = '/bags/%s/tiddlers/%s' % (encode_name(
                                    tiddler.bag), title)
                                linked_resources[title] = [url]
                        except StoreError:
                            continue
                    except StoreError:
                        pass
            except StoreError:
                pass

    template_defaults = {
            'original_server_host': original_server_host_url(environ),
            'css': linked_resources['HtmlCss'],
            'js': linked_resources['HtmlJavascript'],
            'server_host': server_base_url(environ),
    }
    template_defaults.update(template_data)
    return template.generate(template_defaults)
