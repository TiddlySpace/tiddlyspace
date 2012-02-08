/***
|''Name''|TiddlySpaceFollowingPlugin|
|''Version''|0.7.1|
|''Description''|Provides a following macro|
|''Author''|Jon Robson|
|''Requires''|TiddlySpaceConfig TiddlySpaceTiddlerIconsPlugin ErrorHandler|
|''License''|[[BSD|http://www.opensource.org/licenses/bsd-license.php]]|
!Usage
Tag a tiddler with "follow" to express a list of followers.
Using the {{{<<followTiddlers X>>}}}
will reveal the number of tiddlers with name X in the set of spaces the *current* user viewing your space follows.
{{{<<following jon>>}}} will list all the users following Jon.
{{{<<followers jon>>}}} will list all the followers of jon.
{{{<linkedTiddlers>>}}} will list all tiddlers across TiddlySpace linked to the current tiddler
{{{<linkedTiddlers follow:yes>>}}} will list all tiddlers across TiddlySpace that come from your list of followers
adds spaceLink view type {{{<<view server.bag spaceLink>>}}} creates a link to the space described in server.bag
{{{<<view server.bag spaceLink title>>}}} makes a link to the tiddler with title expressed in the field title in space server.bag
If no name is given eg. {{{<<following>>}}} or {{{<<follow>>}}} it will default the current user.
!StyleSheet
.followTiddlersList li {
	list-style:none;
}

.followButton {
	width: 2em;
}

.followTiddlersList li .siteIcon {
	height:48px;
	width: 48px;
}

#sidebarTabs .followers li a,
.followers .siteIcon,
.followers .siteIcon div {
	display: inline;
}

.followTiddlersList li .externalImage, .followTiddlersList li .image {
	display: inline;
}

.scanResults li {
	list-style: none;
}
!Code
***/
//{{{
(function($) {
var LIMIT_FOLLOWING = 100;

var tweb = config.extensions.tiddlyweb;
var tiddlyspace = config.extensions.tiddlyspace;
var currentSpace = tiddlyspace.currentSpace.name;

var shadows = config.shadowTiddlers;
config.annotations.ScanTemplate = "This tiddler is the default template used in the display of tiddlers founding using the tsScan macro. To access attributes use the view macro e.g. {{{<<view title text>>}}}";
shadows.ScanTemplate = "<<view modifier SiteIcon width:24 height:24 spaceLink:yes label:no>> <<view title link>>";
shadows.FollowersTemplate = "<<view server.bag SiteIcon width:24 height:24 spaceLink:yes label:no>> <<view server.bag spaceLink>>";
shadows.FollowingTemplate = "<<view title SiteIcon width:24 height:24 spaceLink:yes label:no>> <<view title spaceLink>>";
shadows.FollowTiddlersBlackList = "";
shadows.FollowTiddlersHeading = "There are tiddlers in spaces you follow using the follow tag which use the title <<view title text>>";
shadows.FollowTiddlersTemplate = ["* <<view server.space SiteIcon width:24 height:24 spaceLink:yes label:no>> ",
	"<<view server.space spaceLink title external:no>> modified by <<view modifier spaceLink>> ",
	"in the <<view server.space spaceLink>> space (<<view modified date>> @ <<view modified date 0hh:0mm>>).\n"].join("");

var name = "StyleSheetFollowing";
shadows[name] = "/*{{{*/\n%0\n/*}}}*/".
	format(store.getTiddlerText(tiddler.title + "##StyleSheet"));
store.addNotification(name, refreshStyles);

// provide support for sucking in tiddlers from the server
tiddlyspace.displayServerTiddler = function(src, title, workspace, callback) {
	var adaptor = store.getTiddlers()[0].getAdaptor();
	var localTitle = tiddlyspace.getLocalTitle(title, workspace);
	var tiddler = new Tiddler(localTitle);
	tiddler.text = "Please wait while this tiddler is retrieved...";
	tiddler.fields.doNotSave = "true";
	store.addTiddler(tiddler);
	src = story.displayTiddler(src || null, tiddler.title);
	tweb.getStatus(function(status) {
		var context = {
			host: tweb.host, // TODO: inherit from source tiddler?
			workspace: workspace,
			headers: { "X-ControlView": "false" }
		};
		var getCallback = function(context, userParams) {
			var tiddler = context.tiddler;
			tiddler.title = localTitle;
			store.addTiddler(tiddler);
			story.refreshTiddler(localTitle, null, true); // overriding existing allows updating
			if(callback) {
				callback(src, tiddler);
			}
		};
		adaptor.getTiddler(title, context, null, getCallback);
	});
};

tiddlyspace.scroller = {
	runHandler: function(title, top, bottom, height) {
		var i;
		var handlers = tiddlyspace.scroller.handlers;
		var tidEl = story.getTiddler(title);
		if(tidEl) {
			var topEl = $(tidEl).offset().top + 20;
			if(top === false || (topEl > top && topEl < bottom)) {
				var h = handlers[title];
				for(i = 0; i < h.length; i++) {
					h[i]();
				}
				tiddlyspace.scroller.clearHandlers(title);
			}
		} else {
			tiddlyspace.scroller.clearHandlers(title);
		}
	},
	clearHandlers: function(title) {
		tiddlyspace.scroller.handlers[title] = [];
	},
	registerIsVisibleEvent: function(title, handler) {
		tiddlyspace.scroller.handlers[title] = tiddlyspace.scroller.handlers[title] || [];
		tiddlyspace.scroller.handlers[title].push(handler);
	},
	init: function() {
		this.handlers = {};
		this.interval = window.setInterval(function() {
			var top = $(window).scrollTop();
			var height = $(window).height();
			var bottom = top + height;
			var title;
			for(title in tiddlyspace.scroller.handlers) {
				if(title) {
					tiddlyspace.scroller.runHandler(title, top, bottom, height);
				}
			}
		}, 2000); // every 2 seconds check scroll position
	}
};
tiddlyspace.scroller.init();

var followMacro = config.macros.followTiddlers = {
	locale: {
		followListHeader: "Here are tiddlers from spaces you follow using the follow tag which use this title.",
		noTiddlersFromFollowers: "None of the spaces you follow contain a tiddler with this name.",
		errorMessage: "There was a problem retrieving tiddlers from the server. Please try again later."
	},
	init: function() {
		followMacro.lookup = {};
	},
	followTag: "follow",
	getHosts: function(callback) {
		tweb.getStatus(function(status) {
			callback(tweb.host, tiddlyspace.getHost(status.server_host, "%0"));
		});
	},
	getBlacklist: function() {
		return store.getTiddlerText("FollowTiddlersBlackList").split("\n");
	},
	handler: function(place, macroName, params, wikifier, paramString, tiddler) {
		var args = paramString.parseParams("anon")[0];
		var containingTiddler = story.findContainingTiddler(place).getAttribute('tiddler');
		var title = (args.anon && args.anon[0]) || tiddler.fields["server.title"] || tiddler.title;
		var tid = store.getTiddler(title);
		var user = params[1] || false;
		if(tid) {
			followMacro.makeButton(place, {
				url: "/search?q=title:%22"
                                    + encodeURIComponent(title) + "%22",
				containingTiddler: containingTiddler,
				blacklisted: followMacro.getBlacklist(), title: title, user: user,
				consultFollowRelationship: (args.follow &&
					args.follow[0] === 'false') ? false : true });
		}
	},
	makeButton: function(place, options) { // this is essentially the same code in TiddlySpaceFollowingPlugin
		var title = options.title;
		var blacklisted = options.blacklisted;
		var tiddler = store.getTiddler(title);
		var btn = $('<div class="followButton" />').addClass("notLoaded").appendTo(place)[0];
		if(blacklisted.contains(title)) {
			$(btn).remove();
			return;
		} else {
			var user = options.user;
			window.setTimeout(function() { // prevent multiple calls due to refresh
				tiddlyspace.scroller.registerIsVisibleEvent(options.containingTiddler, function() {
					var mkButton = function(followers, ignore) {
						if(!followers && !ignore) {
							$(btn).remove();
						} else {
							$("<a />").appendTo(btn);
							var scanOptions = { url: options.url,
								spaceField: options.spaceField || "bag", template: null, sort: "-modified",
								callback: function(tiddlers) {
									$(btn).removeClass("notLoaded");
									followMacro.constructInterface(btn, tiddlers);
								}
							};
							if(!ignore) {
								scanOptions.showBags = followMacro._getFollowerBags(followers);
							}
							scanOptions.hideBags = [tiddler.fields["server.bag"]];
							scanMacro.scan(null, scanOptions, user);
						}
					};
					if(options.consultFollowRelationship) {
						followMacro.getFollowers(mkButton);
					} else {
						mkButton([], true);
					}
				});
			}, 1000);
		}
	},
	constructInterface: function(container, tiddlers) {
		var txt = tiddlers.length;
		var className = txt > 0 ? "hasReplies" : "noReplies";
		var el = $(story.findContainingTiddler(container));
		$(container).empty().addClass(className);
		var btn = $("<a />").addClass("followedTiddlers").text(txt).
			click(function(ev) {
				followMacro.followingOnClick(ev);
			}).appendTo('<div class="followedTiddlers" />').appendTo(container)[0];
		$.data(btn, "tiddlers", tiddlers);
	},
	followingOnClick: function(ev) {
		var target = ev.target;
		var locale = followMacro.locale;
		var el = $('<div class="followTiddlersList" />')[0];
		var popup = Popup.create(target,"div");
		$(popup).addClass("taggedTiddlerList followList").click(function(ev) { // make it so only clicking on the document outside the popup removes the popup
			if(ev.target.parentNode != document) {
				ev.stopPropagation();
			}
		}).append(el);
		var tiddlers = $.data(target, "tiddlers") || [];
		scanMacro.template(el, tiddlers.slice(0,1), "FollowTiddlersHeading");
		scanMacro.template(el, tiddlers, "FollowTiddlersTemplate");
		if(tiddlers.length === 0) {
			$("<li />").text(locale.noTiddlersFromFollowers).appendTo(el);
		}
		Popup.show();
		ev.stopPropagation();
		return popup;
	},
	_getFollowerBags: function(followers) { // XXX: private or not?
		return $.map(followers, function(name, i) {
			return name != currentSpace ? "%0_public".format(name) : null;
		});
	},
	getFollowers: function(callback, username) {
		// returns a list of spaces being followed by the existing space
		var followersCallback = function(user) {
			if(!user.anon) {
				scanMacro.scan(null, { 
					url: "/search?q=bag:%0_public tag:%1 _limit:%2".format(user.name, followMacro.followTag, LIMIT_FOLLOWING),
					spaceField: "title", template: null, cache: true,
					callback: function(tiddlers) {
						var followers = [];
						for(var i = 0; i < tiddlers.length; i++) {
							followers.push(tiddlyspace.resolveSpaceName(tiddlers[i].title));
						}
						callback(followers);
					}
				});
			} else {
				callback(false);
			}
		};
		return !username ? tweb.getUserInfo(followersCallback) : followersCallback({ name: username });
	}
};

var scanMacro = config.macros.tsScan = {
	init: function () {
		this.scanned = {};
	},
	_tiddlerfy: function(jsontiddlers, options) {
		var tiddlers = [];
		var spaceField = options.spaceField || "bag"; // TODO: phase out use view types instead
		$.each(jsontiddlers, function(i, t) {
			var use = false;
			if(!options.showBags || (options.showBags && options.showBags.contains(t.bag))) {
				use = true;
			}
			if(options.hideBags && options.hideBags.contains(t.bag)) {
				use = false;
			}
			if(use) {
				var spaceName = t[spaceField];
				var tiddler = config.adaptors.tiddlyweb.toTiddler(t, tweb.host);
				tiddler.fields["server.space"] = tiddlyspace.resolveSpaceName(spaceName);
				tiddlers.push(tiddler);
			}
		});
		return tiddlers;
	},
	_scanCallback: function(place, jsontiddlers, options) {
		var locale = followersMacro.locale;
		var tiddlers = scanMacro._tiddlerfy(jsontiddlers, options);
		
		if(options.sort) {
			tiddlers = store.sortTiddlers(tiddlers, options.sort);
		}
		if(options.filter) {
			var _store = new TiddlyWiki();
			config.lastStore = _store;
			for(var i = 0; i < tiddlers.length; i++) {
				var clone = tiddlers[i];
				clone.title = tiddlyspace.getLocalTitle(clone.title, clone.fields['server.workspace']);
				_store.addTiddler(clone);
			}
			tiddlers = _store.filterTiddlers(options.filter);
		}
		if(place) {
			$(place).empty();
			var list = $("<ul />").appendTo(place)[0];
			scanMacro.template(list, tiddlers, options.template);
			if(tiddlers.length === 0) {
				$("<li />").text(options.emptyMessage || locale.noone).appendTo(list);
				$(list).addClass("emptyList");
			}
		}
		if(options.callback) {
			options.callback(tiddlers);
		}
	},
	constructSearchUrl: function(host, options) {
		if(options.url) {
			return options.url;
		}
		var inputs = options.searchValues;
		var tag = options.tag;
		var searchField = options.searchField || "title";
		var searchQuery = [];
		for(var i = 0; i < inputs.length; i++) {
			searchQuery.push('%0:"%1"'.format(searchField, inputs[i]));
		}
		var query = searchQuery.join(" OR ");
		query = tag ? "(%0) AND tag:%1".format(query, tag) : query;
		query = options.query ? "%0;%1;".format(query, options.query) : query;
		query = options.fat ? "%0&fat=y".format(query) : query;
		return '%0/search?q=%1'.format(host, query);
	},
	scan: function(place, options) { // TODO: make use of list macro with url filter
		var locale = followersMacro.locale;
		options.template = options.template ? options.template : "ScanTemplate";
		followMacro.getHosts(function(host, tsHost) {
			$(place).text(followersMacro.locale.pleaseWait);
			options = options ? options: {};
			var url = scanMacro.constructSearchUrl(host, options);
			if(options.cache && scanMacro.scanned[url]) {
				var tiddlers = scanMacro.scanned[url].tiddlers;
				var run = function(tiddlers) {
					scanMacro._scanCallback(place, tiddlers, options);
				};
				if(tiddlers) {
					run(tiddlers);
				} else {
					scanMacro.scanned[url].callbacks.push(run);
				}
			} else {
				var callback = function(tiddlers) {
					scanMacro._scanCallback(place, tiddlers, options);
				};
				if(scanMacro.scanned[url] && scanMacro.scanned[url].callbacks) {
					scanMacro.scanned[url].callbacks.push(callback)
				} else {
					scanMacro.scanned[url] = {
						callbacks: [callback]
					};
				}
				ajaxReq({
					url: url,
					dataType: "json",
					success: function(tiddlers) {
						scanMacro.scanned[url].tiddlers = tiddlers;
						var callbacks = scanMacro.scanned[url].callbacks;
						while(callbacks.length > 0) {
							callbacks.pop()(tiddlers);
						}
					},
					error: function(xhr) {
						$(place).empty();
						$("<span />").addClass("annotation error").text(locale.error.format(xhr.status)).appendTo(place);
					}
				});
			}
		});
	},
	template: function(place, tiddlers, template) { // TODO: make use of list macro.
		for(var i = 0; i < tiddlers.length; i++) {
			var tiddler = tiddlers[i];
			var item = $('<li class="spaceName" />').appendTo(place)[0];
			var spaceName = tiddler.fields["server.space"] || "";
			var templateText = store.getTiddlerText(template).replace(/\$1/mg, spaceName);
			wikify(templateText, item, null, tiddler);
		}
	},
	getOptions: function(paramString, tiddler) {
		var args = paramString.parseParams("name", null, true, false, true)[0];
		var options = { query: false, sort: false, tag: false, template: false, showBags: args.show || false,
			hideBags: args.hide || false, filter: false, spaceField: "bag", searchField: "title", fat: false,
			emptyMessage: false };
		for(var name in args) {
			if(name != "name") {
				if(name == "fat") {
					options[name] = true;
				} else {
					options[name] = args[name][0];
				}
			}
		}
		// if user has set searchField to modifier, then use the modifiers value if available otherwise use searchValues.
		var searchField = options.searchField;
		var searchValues = args[searchField] ? args[searchField] : args.searchValues;
		// if neither of those were used use the first parameter
		var defaultValues = tiddler ? [ tiddler.title ] : [];
		options.searchValues = searchValues ? searchValues : ( args.name ? [args.name[0]] : defaultValues);
		return options;
	},
	handler: function(place, macroName, params, wikifier, paramString, tiddler) {
		var container = $("<div />").addClass("scanResults resultsArea").appendTo(place)[0];
		var options = scanMacro.getOptions(paramString, tiddler);
		scanMacro.scan(container, options);
	}
};

var followersMacro = config.macros.followers = {
	locale: {
		loggedOut: "Please login to see the list of followers",
		noSupport: "We were unable to retrieve followers as your browser does not support following.",
		pleaseWait: "Please wait while we look this up...",
		error: "Error %0 occurred whilst retrieving data from server",
		noone: "None."
	},
	handler: function(place, macroName, params, wikifier, paramString, tiddler) {
		var locale = followersMacro.locale;
		var args = paramString.parseParams("name", null, true, false, true)[0];
		var username = args.name ? args.name[0] : false;
		var container = $('<div class="followers" />').text(locale.pleaseWait).
			appendTo(place)[0];
		var followersCallback = function(user) {
			if(user.anon) {
				$("<span />").text(locale.loggedOut).appendTo(container);
			} else {
				var options = scanMacro.getOptions(paramString);
				$.extend(options, {
					url: "/search?q=title:@%0 OR title:%0 tag:%1 _limit:%2".
						format(user.name, followMacro.followTag, LIMIT_FOLLOWING),
					spaceField: "bag",
					template: options.template ? options.template : "FollowersTemplate"
				});
				scanMacro.scan(container, options);
			}
		};
		return !username ? followersCallback({ name: currentSpace }) : followersCallback({ name: username });
	}
};

var followingMacro = config.macros.following = {
	locale: {
		pleaseWait: followersMacro.locale.pleaseWait,
		loggedOut: "Please login to see who you are following",
		noSupport: followersMacro.locale.noSupport,
		error: followersMacro.locale.error,
		noone: followersMacro.locale.noone
	},
	handler: function(place, macroName, params, wikifier, paramString, tiddler) {
		var locale = followingMacro.locale;
		var args = paramString.parseParams("name", null, true, false, true)[0];
		var fat = args.fat ? true : false;
		var username = args.name ? args.name[0] : false;
		var container = $('<div class="following" />').text(locale.pleaseWait).
			appendTo(place)[0];
		var followingCallback = function(user) {
			if(user.anon) {
				$("<span />").text(locale.loggedOut).appendTo(container);
			} else {
				var options = scanMacro.getOptions(paramString);
				$.extend(options, {
					url: "/search?q=bag:%0_public tag:%1 _limit:%2".format(user.name, followMacro.followTag, LIMIT_FOLLOWING),
					spaceField: "title",
					template: options.template ? options.template : "FollowingTemplate"
				});
				scanMacro.scan(container, options);
			}
		};
		return !username ? followingCallback({ name: currentSpace }) : followingCallback({ name: username });
	}
};

var linkedMacro = config.macros.linkedTiddlers = {
	handler: function(place, macroName, params, wikifier, paramString, tiddler) {
		var args = paramString.parseParams("anon")[0];
		var title = params[0] || tiddler.fields["server.title"] || tiddler.title;
		var tid = store.getTiddler(title);
		if(tid) {
			followMacro.makeButton(place, {
				spaceField: "recipe",
				url: "/bags/%0/tiddlers/%1/backlinks".format(tid.fields['server.bag'],
					encodeURIComponent(tid.title)),
				blacklisted: followMacro.getBlacklist(), title: title, user: params[1] || false,
				consultFollowRelationship: args.follow ? true : false });
		}
	}
}

if(config.options.chkFollowTiddlersIsLinkedTiddlers) {
	merge(config.macros.followTiddlers, config.macros.linkedTiddlers);
	config.shadowTiddlers.FollowTiddlersHeading = "These are the other tiddlers that link to this tiddler.";
}

})(jQuery);
//}}}
