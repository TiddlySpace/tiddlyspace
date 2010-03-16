import os

from tiddlywebwiki.instance import store_structure, store_contents
from tiddlywebwiki.instance import (instance_config, store_contents,
    store_structure)


instance_config['system_plugins'] = ['tiddlywebplugins.tiddlyspace']

store_contents['tiddlyspace'] = [
    'src/controls/index.recipe',
    'src/lib/index.recipe'
]

store_structure['bags']['tiddlyspace'] = {
    'desc': 'TiddlySpace client',
    'policy': store_structure['bags']['system']['policy']
}
store_structure['recipes']['default']['recipe'].insert(1, ('tiddlyspace', ''))
