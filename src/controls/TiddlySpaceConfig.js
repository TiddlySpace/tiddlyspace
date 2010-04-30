/***
|''Requires''|TiddlyWebConfig|
***/
//{{{
config.extensions.tiddlyspace = {
	currentSpace: config.defaultCustomFields["server.workspace"].
		split("recipes/")[1]. // XXX: brittle?
		split("_")[0] // XXX: brittle (space name must not contain underscores)
};
//}}}
