instance_tiddlers = {
    'tiddlyspace': [
        '../src/controls/index.recipe',
        '../src/lib/index.recipe',
        '../src/model/index.recipe'
    ],
    'frontpage_public': [
        '../src/frontpage/index.recipe'
    ]
}


def update_config(config):
    for bag, uris in instance_tiddlers.items():
        config['local_instance_tiddlers'][bag] = uris
    config['server_host'] = {
        'scheme': 'http',
        'host': 'tiddlyspace.org',
        'port': '8080'
    }
