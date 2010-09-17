/***
|''Name''|ListTiddlerPrivacyPlugin|
|''Description''|provide an async list macro and list public, private and draft tiddlers|
|''Author''|Ben Gillies|
|''Version''|0.2.0|
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
TiddlySpaceTiddlerIconsPlugin
TiddlySpaceConfig
!Code
***/
//{{{
(function($) {

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

// return all tiddlers from private and public bags
tsList.getAllSpaceTiddlers = function(space, callback) {
	var bags = ["%0_private", "%0_public"];
	var privateBag = new tiddlyweb.Bag(bags[0].format([space]), "/");
	var publicBag = new tiddlyweb.Bag(bags[1].format([space]), "/");

	privateBag.tiddlers().get(function(privateTiddlers) {
		publicBag.tiddlers().get(function(publicTiddlers) {
			callback(privateTiddlers, publicTiddlers);
		}, function(xhr, error, exc) {
			throw "Failed to load tiddlers";
		}, "fat=1");
	}, function(xhr, error, exc) {
		throw "Failed to load tiddlers";
	}, "fat=1");
};

tsList.isIn = function(title, tiddlerList) {
	for (var i = 0; i < tiddlerList.length; i++) {
		if (title === tiddlerList[i].title) {
			return tiddlerList[i];
		}
	}

	return false;
};

tsList.Private = {
	handler: function(params, callback) {
		var space = config.extensions.tiddlyspace.currentSpace.name;
		tsList.getAllSpaceTiddlers(space, function(Private, Public) {
			var trulyPrivate = $.map(Private, function(tiddler, index) {
				return (tsList.isIn(tiddler.title, Public) ||
					tiddler.fields['server.publish.name']) ? null : tiddler;
			});

			callback(trulyPrivate);
		});
	}
};

tsList.Public = {
	handler: function(params, callback) {
		var space = config.extensions.tiddlyspace.currentSpace.name;
		var areIdentical = config.macros.tiddlerOrigin.areIdentical;
		tsList.getAllSpaceTiddlers(space, function(Private, Public) {
			var trulyPublic = $.map(Public, function(tiddler, index) {
				var privateTiddler = tsList.isIn(tiddler.title, Private);
				if ((!privateTiddler) || (areIdentical(tiddler, privateTiddler))) {
					return tiddler;
				} else {
					return null;
				}
			});

			callback(trulyPublic);
		});
	}
};

tsList.Draft = {
	handler: function(params, callback) {
		var space = config.extensions.tiddlyspace.currentSpace.name;
		var areIdentical = config.macros.tiddlerOrigin.areIdentical;
		tsList.getAllSpaceTiddlers(space, function(Private, Public) {
			var Drafts = $.map(Public, function(tiddler, index) {
				var privateTiddler = tsList.isIn(tiddler.title, Private);
				if ((privateTiddler) && (!areIdentical(tiddler, privateTiddler))) {
					return tiddler;
				} else {
					return null;
				}
			});

			store.forEachTiddler(function(title, tiddler) {
				if (tiddler.fields['server.publish.name']) {
					Drafts.pushUnique(tiddler);
				}
			});

			callback(Drafts);
		});
	}
};

})(jQuery);
//}}}
