/***
|''Name''|ListTiddlerPrivacyPlugin|
|''Description''|provide an async list macro and list public, private and draft tiddlers|
|''Author''|Ben Gillies|
|''Version''|0.3.0|
|''Status''|@@experimental@@|
|''Source''|<...>|
|''CodeRepository''|<...>|
|''License''|[[BSD|http://www.opensource.org/licenses/bsd-license.php]]|
!Usage
{{{
<<tsList Private>>
<<tsList Public>>
<<tsList Draft>>
}}}
!Requires
TiddlySpaceConfig
!Code
***/
//{{{
(function($) {
var ns = config.extensions.tiddlyspace;

var tsList = config.macros.tsList = {
	locale: {
		loadingMsg: "loading..."
	},
	handler: function(place, macroName, params) {
		var type = params[0];
		if ((!type) || (!tsList[type])) {
			return;
		}

		var list = $("<ul />").appendTo(place);
		var loading = $('<li class="listTitle" />').
			text(tsList.locale.loadingMsg).
			appendTo(list);

		if (tsList[type].handler) {
			tsList[type].handler(params, function(tiddlers) {
				loading.remove();
				if (tsList[type].prompt) {
					$('<li class="listTitle" />').
						text(tsList[type].prompt).
						appendTo(list);
				}
				$.each(tiddlers, function(index, tiddler) {
					var li = $("<li />").appendTo(list)[0];
					createTiddlyLink(li, tiddler.title, true);
				});
			});
		}
	}
};

tsList.Private = {
	handler: function(params, callback) {
		var privateTiddlers = [];
		store.forEachTiddler(function(title, tiddler) {
			if (("%0_private".format([ns.currentSpace.name]) ===
					tiddler.fields["server.bag"]) &&
					(!tiddler.fields["publish.name"]) &&
					(!tiddler.tags.contains("excludeLists"))) {
				privateTiddlers.pushUnique(tiddler);
			}
		});

		callback(privateTiddlers);
	}
};

tsList.Public = {
	handler: function(params, callback) {
		var publicTiddlers = [];
		store.forEachTiddler(function(title, tiddler) {
			if (("%0_public".format([ns.currentSpace.name]) ===
					tiddler.fields["server.bag"]) &&
				(!tiddler.tags.contains("excludeLists"))) {
				publicTiddlers.pushUnique(tiddler);
			}
		});

		callback(publicTiddlers);
	}
};

tsList.Draft = {
	handler: function(params, callback) {
		var draftTiddlers = [];
		store.forEachTiddler(function(title, tiddler) {
			if (("%0_private".format([ns.currentSpace.name]) ===
					tiddler.fields["server.bag"]) &&
					(tiddler.fields["publish.name"]) &&
					(!tiddler.tags.contains("excludeLists"))) {
				draftTiddlers.pushUnique(tiddler);
			}
		});

		callback(draftTiddlers);
	}
};

})(jQuery);
//}}}
