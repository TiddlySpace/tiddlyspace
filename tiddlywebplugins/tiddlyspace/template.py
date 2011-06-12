"""
Send a template with some default data.
"""

from tiddlywebplugins.templates import get_template
from tiddlyweb.web.util import server_base_url

def send_template(environ, template_name, template_data=None):
    if template_data == None:
        template_data = {}
    template = get_template(environ, template_name)

    template_defaults = {
            'css': '/bags/common/tiddlers/profile.css',
            'server_host': server_base_url(environ),
            }
    template_defaults.update(template_data)
    return template.generate(template_defaults)
