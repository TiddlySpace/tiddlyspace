"""
Instance structure configuration for all tiddlyspace
instances.
"""

from tiddlywebwiki.instance import (instance_config, store_contents,
    store_structure)


instance_config['system_plugins'] = ['tiddlywebplugins.tiddlyspace']
instance_config['twanager_plugins'] = ['tiddlywebplugins.tiddlyspace']

store_contents['tiddlyspace'] = [
    'src/controls/index.recipe',
    'src/lib/index.recipe',
    'src/model/index.recipe'
]

store_structure['bags']['MAPUSER'] = {
    'desc': 'maps extracted user credentials to canonical username',
    'policy': {
        'read': ['NONE'],
        'write': ['NONE'],
        'create': ['ANY'],
        'delete': ['NONE'],
        'manage': ['NONE'],
        'accept': ['NONE'],
        'owner': 'administrator'
    }
}
store_structure['bags']['tiddlyspace'] = {
    'desc': 'TiddlySpace client',
    'policy': store_structure['bags']['system']['policy']
}
store_structure['recipes']['default']['recipe'].insert(1, ('tiddlyspace', ''))
