"""
structure and contents of a default TiddlySpace instance
"""

from copy import deepcopy

from tiddlywebwiki.instance import (instance_config, store_contents,
    store_structure)


instance_config['system_plugins'] = ['tiddlywebplugins.tiddlyspace']
instance_config['twanager_plugins'] = ['tiddlywebplugins.tiddlyspace']

store_contents['tiddlyspace'] = [
    'src/controls/index.recipe',
    'src/lib/index.recipe',
    'src/model/index.recipe',
]
store_contents['frontpage_public'] = ['src/frontpage/index.recipe']

store_structure['bags']['tiddlyspace'] = {
    'desc': 'TiddlySpace client',
    'policy': store_structure['bags']['system']['policy'],
}
store_structure['recipes']['default']['recipe'].insert(1, ('tiddlyspace', ''))

store_structure['bags']['frontpage_public'] = {
    'desc': 'TiddlySpace front page',
    'policy': {
        'read': [],
        'write': ['R:ADMIN'],
        'create': ['R:ADMIN'],
        'delete': ['R:ADMIN'],
        'manage': ['R:ADMIN'],
        'accept': ['NONE'],
        'owner': 'administrator',
    },
}
store_structure['bags']['frontpage_private'] = deepcopy(
    store_structure['bags']['frontpage_public'])
store_structure['bags']['frontpage_private']['policy']['read'] = ['R:ADMIN']
store_structure['recipes']['frontpage_public'] = {
    'desc': 'TiddlySpace front page',
    'recipe': [
        ('system', ''),
        ('tiddlyspace', ''),
        ('frontpage_public', ''),
    ],
    'policy': {
        'read': [],
        'write': ['R:ADMIN'],
        'manage': ['R:ADMIN'],
        'delete': ['R:ADMIN'],
        'owner': 'administrator',
    },
}
store_structure['recipes']['frontpage_private'] = deepcopy(
    store_structure['recipes']['frontpage_public'])
store_structure['recipes']['frontpage_private']['policy']['read'] = ['R:ADMIN']
store_structure['recipes']['frontpage_private']['recipe'].append(
    ('frontpage_private', ''))

store_structure['bags']['MAPUSER'] = {
    'desc': 'maps extracted user credentials to canonical username',
    'policy': {
        'read': ['NONE'],
        'write': ['NONE'],
        'create': ['ANY'],
        'delete': ['NONE'],
        'manage': ['NONE'],
        'accept': ['NONE'],
        'owner': 'administrator',
    },
}
