#!/usr/bin/env bash

# Usage:
#   $ ./deploy.sh [nodist] [quick] [logname]

set -e
set -x

if [ ! -d .git ]; then
    echo "ERROR: script must be executed from repository root"
    exit 1
fi

dist=true
if [ "$1" = "nodist" ]; then
    dist=false
    shift
fi
if [ "$1" = "quick" ]; then
    pip_options="--no-dependencies"
    shift
fi
if [ -n "$1" ]; then
    log_name="$1@"
fi

host="${log_name}tiddlyspace.com"
base_dir="/data/vhost/tiddlyspace.labs.osmosoft.com"
instance_dir="$base_dir/tiddlyweb"
temp_dir="/tmp/dev"

package_name="tiddlywebplugins.tiddlyspace"

if $dist; then
    make dist
fi
filename=`ls dist/$package_name*.tar.gz | tail -n1 | sed -e "s/dist\///"` # XXX: brittle!?

ssh $host "mkdir -p $temp_dir"
scp "dist/$filename" "$host:$temp_dir/"
ssh $host "sudo pip install -U $pip_options $temp_dir/$filename && " \
    "cd $instance_dir && twanager update && " \
    "echo INFO: deployment complete"
