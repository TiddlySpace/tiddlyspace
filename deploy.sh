#!/usr/bin/env bash

# Usage:
#   $ ./deploy.sh [nodist] [quick] [logname]

REMOTE_SUDO_ID=tiddlyweb

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
base_dir="/home/tiddlyweb/tiddlywebs/tiddlyspace.com"
instance_dir="$base_dir"
temp_dir="/tmp/tiddlyspace_dev.$$"

package_name="tiddlywebplugins.tiddlyspace"

if $dist; then
    make dist
fi
filename=`ls dist/$package_name*.tar.gz | tail -n1 | sed -e "s/dist\///"` # XXX: brittle!?

ssh $host "mkdir -p $temp_dir"

# build TiddlyWeb nightly
if [ -z $pip_options ]; then # XXX: hacky
	if [ ! -d tiddlyweb-core ]; then
		git clone git://github.com/tiddlyweb/tiddlyweb.git tiddlyweb-core
	fi
	cd tiddlyweb-core
	git pull origin master
	rm -rf dist; python setup.py sdist # avoiding `make clean dist` to skip tests
	scp dist/tiddlyweb-*.tar.gz "$host:$temp_dir/"
	pip_options="$temp_dir/tiddlyweb-*.tar.gz" # XXX: hacky!!!
	cd -
fi

scp "dist/$filename" "$host:$temp_dir/"
ssh $host "sudo pip install --upgrade --timeout=120 $pip_options $temp_dir/$filename && " \
    "cd $instance_dir && sudo -u $REMOTE_SUDO_ID twanager update && rm -rf $temp_dir && " \
    "sudo apache2ctl restart && echo INFO: deployment complete"
