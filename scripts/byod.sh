#!/bin/sh

# This script is for use on tiddlyspace.com, running behind an Nginx server.
#
# It writes a domain name to the Nginx aliases file
# and adds the corresponding tiddler to the MAPSPACE bag.
# Run ./byod.sh without any arguments for usage.

DOMAIN=$1
TARGET_SPACE=$2
WWW_DOMAIN=$3

if [ "$TS_USER" = "" ]; then
  TS_USER=tiddlyweb
fi

if [ "$NGINX_ALIASES_FILE" = "" ]; then
  NGINX_ALIASES_FILE=/etc/nginx/tiddlyspace-aliases.conf
fi

if [ "$TS_HOME" = "" ]; then
  TS_HOME=/home/tiddlyweb/tiddlywebs/tiddlyspace.com
fi

if [ $# -lt 2 ]; then
    echo "Usage: `basename $0` domain target_space [www_domain]"
    echo "* Override TS_USER to set the tiddlyspace user"
    echo "** default: tiddlyweb"
    echo "* Override NGINX_ALIAS_FILE to set the aliases configuration file"
    echo "** default: /etc/nginx/tiddlyspace-aliases.conf"
    echo "* Override TS_HOME to set the location of the tiddlyspace instance"
    echo "** default: /home/tiddlyweb/tiddlywebs/tiddlyspace.com"
    exit 1
fi

create_tiddler() {
	TITLE=$1
  SPACE=$2
	su $TS_USER -c "twanager tiddler MAPSPACE $TITLE <<EOF
mapped_space: $SPACE

EOF"
}

echo "Adding server alias to Nginx"
if [ "$WWW_DOMAIN" = "" ]; then
  echo "server_name $DOMAIN;" >> $NGINX_ALIASES_FILE
else
  echo "server_name $DOMAIN $WWW_DOMAIN;" >> $NGINX_ALIASES_FILE
fi

echo "Creating domain tiddler"
cd $TS_HOME
create_tiddler $DOMAIN $TARGET_SPACE
echo "Done"
