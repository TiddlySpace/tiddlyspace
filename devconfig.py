"""
develpment instance configuration
"""

import mangler


def update_config(config, set_host=True):
    config['log_level'] = 'DEBUG'
    if set_host:
        config['server_host'] = {
            'scheme': 'http',
            'host': 'tiddlyspace.org',
            'port': '8080'
        }
