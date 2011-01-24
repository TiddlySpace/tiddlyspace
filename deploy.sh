#!/usr/bin/env bash

# Usage:
#   $ ./deploy.sh [quick] [<logname>]

package_name="tiddlywebplugins.tiddlyspace"
host="tiddlyspace.com"
remote_sudo_id="tiddlyweb"
instance_dir="/home/tiddlyweb/tiddlywebs/tiddlyspace.com"

set -e
set -x

if [ ! -d .git ]; then
    echo "ERROR: script must be executed from repository root"
    exit 1
fi

# TODO: use getopts
if [ "$1" = "quick" ]; then
    pip_options="--no-dependencies"
    shift
fi
if [ -n "$1" ]; then
    log_name="$1@"
fi

host="${log_name}${host}"
sql="DELETE FROM revision WHERE bag_name='system' OR bag_name='tiddlyspace' \
    OR bag_name='system-plugins_public' \
    OR bag_name='system-info_public' \
    OR bag_name='system-images_public' \
    OR bag_name='system-theme_public'; \
    DELETE FROM tiddler WHERE bag_name='system' OR bag_name='tiddlyspace' \
    OR bag_name='system-plugins_public' \
    OR bag_name='system-info_public' \
    OR bag_name='system-images_public' \
    OR bag_name='system-theme_public';"
ssh $host "sudo pip install --upgrade $pip_options $package_name && " \
    "mysql -u tiddlyweb tiddlyspace -e \"${sql}\" && " \
    "cd $instance_dir && sudo -u $remote_sudo_id twanager update && " \
    "sudo apache2ctl restart && echo INFO: deployment complete"
