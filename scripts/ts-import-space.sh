#!/bin/sh

USAGE="Usage: `basename $0` <src_space_url> <src_space> <src_user>
<src_pwd> <dest_space_url> <dest_space> <dest_user> <dest_pwd>

Overwrite SRC_TS_CHALLENGER and/or DEST_TS_CHALLENGER
to use a custom authentication method.
The default is tiddlywebplugins.tiddlyspace.cookie_form
"

if [ $# -ne 8 ]; then
    echo "$USAGE" >&2
    exit 1
fi

if [ "$SRC_TS_CHALLENGER" = "" ]; then
    SRC_TS_CHALLENGER="tiddlywebplugins.tiddlyspace.cookie_form"
fi
if [ "$DEST_TS_CHALLENGER" = "" ]; then
    DEST_TS_CHALLENGER="tiddlywebplugins.tiddlyspace.cookie_form"
fi

SRC_SPACE_URL=$1
SRC_SPACE=$2
SRC_USER=$3
SRC_PASSWORD=$4

SRC_COOKIE="src_cookie.txt"
SRC_PUBLIC_BAG=$SRC_SPACE_URL/bags/"$SRC_SPACE"_public/tiddlers
SRC_PRIVATE_BAG=$SRC_SPACE_URL/bags/"$SRC_SPACE"_private/tiddlers

DEST_SPACE_URL=$5
DEST_SPACE=$6
DEST_USER=$7
DEST_PASSWORD=$8

DEST_COOKIE="dest_cookie.txt"
DEST_PUBLIC_BAG=$DEST_SPACE_URL/bags/"$DEST_SPACE"_public/tiddlers
DEST_PRIVATE_BAG=$DEST_SPACE_URL/bags/"$DEST_SPACE"_private/tiddlers

IFS='
'

move() {
    SRCBAG=$1
    SRCUSER=$2
    SRCPASS=$3
    DESTBAG=$4
    DESTUSER=$5
    DESTPASS=$6
    for TIDDLER in `curl --cookie $SRC_COOKIE -s $SRCBAG.txt`
    do
        ENCODED_TIDDLER=$(python -c "import urllib; print urllib.quote('''$TIDDLER''', safe='')")
        echo "Importing $ENCODED_TIDDLER from source..."
        curl --cookie $SRC_COOKIE -s $SRCBAG/$ENCODED_TIDDLER.json \
            | curl -X PUT -H "Content-Type:application/json" --cookie \
            $DEST_COOKIE $DESTBAG/$ENCODED_TIDDLER -d @-
    done
}

del() {
    DESTBAG=$1
    for TIDDLER in `curl --cookie $DEST_COOKIE -s $DESTBAG.txt`
    do
        ENCODED_TIDDLER=$(python -c "import urllib; print urllib.quote('''$TIDDLER''', safe='')")
        echo "Deleting $ENCODED_TIDDLER from target..."
        curl -s -X DELETE --cookie $DEST_COOKIE $DESTBAG/$ENCODED_TIDDLER
    done
}

create_dest_space() {
    curl -s -X PUT -H "Content-Type:application/json" --cookie $DEST_COOKIE $DEST_SPACE_URL/spaces/$DEST_SPACE
}

authenticate() {
    URL=$1
    USER=$2
    PASS=$3
    COOKIE_FILE=$4
    TS_CHALLENGER=$5
    if [ -f "$COOKIE_FILE" ]; then
        echo "Cookie present, skipping authentication"
        STATUS=0
    else
        curl -f --cookie-jar $COOKIE_FILE -d \
        "user=$USER&password=$PASS&submit=submit" \
        "$URL/challenge/$TS_CHALLENGER"
        STATUS=$?

    fi
    return "$STATUS"
}

exit_on_fail() {
    RESULT=$1
    if [ $RESULT -ne 0 ]; then
        echo "Previous command failed, cannot continue"
        exit 1
    fi
}

echo "***Authenticating against $SRC_SPACE***"
authenticate $SRC_SPACE_URL $SRC_USER $SRC_PASSWORD $SRC_COOKIE $SRC_TS_CHALLENGER
exit_on_fail $?
echo "***Authenticating against $DEST_SPACE***"
authenticate $DEST_SPACE_URL $DEST_USER $DEST_PASSWORD $DEST_COOKIE $DEST_TS_CHALLENGER
exit_on_fail $?
echo "***Creating target space $DEST_SPACE***"
create_dest_space
echo "***Importing public tiddlers into $DEST_SPACE***"
del $DEST_PUBLIC_BAG
move $SRC_PUBLIC_BAG $SRC_USER $SRC_PASSWORD $DEST_PUBLIC_BAG \
    $DEST_USER $DEST_PASSWORD
echo "***Importing private tiddlers into $DEST_SPACE***"
del $DEST_PRIVATE_BAG
move $SRC_PRIVATE_BAG $SRC_USER $SRC_PASSWORD $DEST_PRIVATE_BAG \
    $DEST_USER $DEST_PASSWORD
echo "***Done***"