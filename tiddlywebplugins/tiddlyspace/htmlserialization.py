"""
Enhance the default HTML serialization so that when we display
a single tiddler it includes a link to the tiddler in its space.
"""

import urllib

from tiddlyweb.wikitext import render_wikitext
from tiddlyweb.serializations.html import Serialization as HTMLSerialization
from tiddlyweb.web.util import encode_name


class Serialization(HTMLSerialization):

    def tiddler_as(self, tiddler):
        """
        Transform the provided tiddler into an HTML
        representation of the tiddler packaged in a
        DIV. Render the content using the render_wikitext
        subsystem.
        """
        if tiddler.recipe:
            list_link = 'recipes/%s/tiddlers' % encode_name(tiddler.recipe)
            list_title = 'Tiddlers in Recipe %s' % tiddler.recipe
        else:
            list_link = 'bags/%s/tiddlers' % encode_name(tiddler.bag)
            list_title = 'Tiddlers in Bag %s' % tiddler.bag
        list_html = ('<div class="tiddlerslink"><a href="%s/%s" ' %
                (self._server_prefix(), list_link) +
                'title="tiddler list">%s</a></div>' % list_title)
        space_link = self._space_link(tiddler)
        html = render_wikitext(tiddler, self.environ)
        self.environ['tiddlyweb.title'] = tiddler.title
        return list_html + space_link + self._tiddler_div(tiddler) + html + '</div>'

    def _space_link(self, tiddler):
        """
        Create a link back to this tiddler in its space.
        """
        link = "/#%%5B%%5B%s%%5D%%5D" % encode_name(tiddler.title)
        space_link = """
<div class="tiddlerslink"><a href="%s%s" title="space link">%s in space</a></div>
""" % (self._server_prefix(), link, tiddler.title)
        return space_link

