/***
|''Name''|TiddlySpaceFollowingPlugin|
|''Version''|0.6.13|
|''Description''|Provides a following macro|
|''Author''|Jon Robson|
|''Requires''|TiddlySpaceConfig TiddlySpaceTiddlerIconsPlugin|
|''License''|[[BSD|http://www.opensource.org/licenses/bsd-license.php]]|
!Usage
Tag a tiddler with "follow" to express a list of followers.
Using the {{{<<followTiddlers X>>}}}
will reveal the number of tiddlers with name X in the set of spaces the *current* user viewing your space follows.
{{{<<following jon>>}}} will list all the users following Jon.
{{{<<followers jon>>}}} will list all the followers of jon.
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

var tweb = config.extensions.tiddlyweb;
var tiddlyspace = config.extensions.tiddlyspace;
var currentSpace = tiddlyspace.currentSpace.name;

var shadows = config.shadowTiddlers;
config.annotations.ScanTemplate = "This tiddler is a template used in the display of tiddlers from spaces you are following. Use the wildcard {{{$1}}} to access the spaceField. To access attributes use the view macro e.g. {{{<<view title text>>}}}";
shadows.ScanTemplate = "<<view modifier SiteIcon width:24 height:24 spaceLink:yes label:no>> <<view title link>>";
shadows.FollowersTemplate = "<<view server.bag SiteIcon width:24 height:24 spaceLink:yes label:no>> @$1";
shadows.FollowingTemplate = "<<view server.bag SiteIcon width:24 height:24 spaceLink:yes label:no>> @$1";
shadows.FollowTiddlersBlackList = "";
shadows.FollowTiddlersHeading = "There are tiddlers in spaces you follow using the follow tag which use the title <<view title text>>";
shadows.FollowTiddlersTemplate = ["* <<view server.bag SiteIcon width:24 height:24 spaceLink:yes label:no>> ",
	"<<view server.bag spaceLink title external:no>> modified by <<view modifier spaceLink>> ",
	"in the <<view server.bag spaceLink>> space (<<view modified date>> @ <<view modified date 0hh:0mm>>).\n"].join("");

var name = "StyleSheetFollowing";
shadows[name] = "/*{{{*/\n%0\n/*}}}*/".
	format(store.getTiddlerText(tiddler.title + "##StyleSheet"));
store.addNotification(name, refreshStyles);

// provide support for sucking in tiddlers from the server
tiddlyspace.displayServerTiddler = function(src, title, workspace, callback) {
	var endsWith = config.extensions.BinaryTiddlersPlugin.endsWith;
	var adaptor = store.getTiddlers()[0].getAdaptor();
	var isPublic = endsWith(workspace, "_public");
	var space = tiddlyspace.resolveSpaceName(workspace);
	if(currentSpace == space) {
		space = isPublic ? "public" : "private";
	} else {
		space = "@%0".format(space);
	}
	var localTitle = "%0 [%1]".format(title, space);
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
				tiddlyspace.displayReplyButton(src, tiddler);
				callback(src, tiddler);
			}
		};
		adaptor.getTiddler(title, context, null, getCallback);
	});
};
tiddlyspace.displayReplyButton = function(el, tiddler) {
	var replyLink = $(".replyLink", el);
	if(replyLink.length > 0) {
		el = replyLink.unbind("click").empty()[0];
		el.onclick = null;
	} 
	var btn = $("<button />").addClass("reply").appendTo(el);
	var publicBag = "%0_public".format(currentSpace);
	var serverTitle = tiddler.fields["server.title"];
	var yourTiddler = store.getTiddler(serverTitle);
	if(yourTiddler) {
		btn.text("your version");
	} else {
		btn.text("reply");
	}
	btn.click(function(ev) {
		if(!yourTiddler) {
			story.displayTiddler(ev.target, serverTitle, DEFAULT_EDIT_TEMPLATE, false, null, null);
			var tiddlerEl = story.getTiddler(serverTitle);
			var text = yourTiddler ? yourTiddler.text : "";
			var newFields = {};
			merge(newFields, config.defaultCustomFields);
			merge(newFields, { "server.workspace": "bags/%0".format(publicBag) });
			var customFields = String.encodeHashMap(newFields);
			if(customFields) {
				story.addCustomFields(tiddlerEl, customFields);
			}
			var replyTemplate = "in reply to @%0:\n<<<\n%1\n<<<\n\n%2".format(tiddler.modifier, tiddler.text, text);
			$("[edit=text]", tiddlerEl).val(replyTemplate);
			
		} else {
			story.displayTiddler(ev.target, serverTitle, DEFAULT_VIEW_TEMPLATE, false, null, null);
		}
	});
};

var followMacro = config.macros.followTiddlers = {
	locale: {
		followListHeader: "Here are tiddlers from spaces you follow using the follow tag which use this title.",
		noTiddlersFromFollowers: "None of the spaces you follow contain a tiddler with this name.",
		errorMessage: "There was a problem retrieving tiddlers from the server. Please try again later."
	},
	init: function() {
		followMacro.lookup = {};
	},
	beforeSend: function(xhr) {
		xhr.setRequestHeader("X-ControlView", "false");
	},
	followTag: "follow",
	getHosts: function(callback) {
		tweb.getStatus(function(status) {
			callback(tweb.host, tiddlyspace.getHost(status.server_host, "%0"));
		});
	},
	handler: function(place, macroName, params, wikifier, paramString, tiddler) {
		var title = params[0] || tiddler.fields["server.title"] || tiddler.title;
		var blacklisted = store.getTiddlerText("FollowTiddlersBlackList").split("\n");
		var btn = $('<div class="followButton" />').appendTo(place)[0];
		if(blacklisted.contains(title)) {
			$(btn).remove();
			return;
		} else {
			var options = {};
			var user = params[1] || false; // allows a user to use the macro on another username
			this.getFollowers(function(followers) {
				if(!followers) {
					$(btn).remove();
				} else {
					scanMacro.scan(null, { searchFields: "title", searchValues: [title],
						spaceField: "bag", template: null, sort: "-modified",
						showBags: followMacro._getFollowerBags(followers), hideBags: [tiddler.fields["server.bag"]],
						callback: function(tiddlers) {
							followMacro.constructInterface(btn, tiddlers);
						}
					});
				}
			}, user);
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
	_getFollowerBags: function(followers) {
		var x = [];
		for(var i = 0; i < followers.length; i++) {
			var name = followers[i];
			if(name != currentSpace) {
				x.push("%0_public".format(name));
			}
		}
		return x;
	},
	getFollowers: function(callback, username) {
		// returns a list of spaces being followed by the existing space
		var followersCallback = function(user) {
			if(!user.anon) {
				scanMacro.scan(null, { searchField: "bag", searchValues: ["%0_public".format(user.name)],
					spaceField: "title", template: null, tag: "follow", cache: true,
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
		if(!username) {
			tweb.getUserInfo(followersCallback);
		} else {
			followersCallback({ name: username });
		}
	}
};

var scanMacro = config.macros.tsScan = {
	init: function () {
		this.scanned = {};
	},
	_scanCallback: function(place, jsontiddlers, options) {
		var locale = followersMacro.locale;
		var spaceField = options.spaceField || "bag";
		var tiddlers = [];
		for(var i = 0; i < jsontiddlers.length; i++) {
			var t = jsontiddlers[i];
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
		}
		if(options.sort) {
			tiddlers = store.sortTiddlers(tiddlers, options.sort);
		}
		if(options.filter) {
			tiddlers = store.filterTiddlers(options.filter, tiddlers); // note currently not supported in core.
		}
		if(place) {
			$(place).empty();
			var list = $("<ul />").appendTo(place)[0];
			scanMacro.template(list, tiddlers, options.template);
			if(tiddlers.length === 0) {
				$("<li />").text(locale.noone).appendTo(list);
			}
		}
		if(options.callback) {
			options.callback(tiddlers);
		}
	},
	constructSearchUrl: function(host, options) {
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
	scan: function(place, options) {
		var locale = followersMacro.locale;
		options.template = options.template ? options.template : "ScanTemplate";
		followMacro.getHosts(function(host, tsHost) {
			$(place).text(followersMacro.locale.pleaseWait);
			options = options ? options: {};
			var url = scanMacro.constructSearchUrl(host, options);
			if(options.cache && scanMacro.scanned[url]) {
				var tiddlers = scanMacro.scanned[url].tiddlers;
				scanMacro._scanCallback(place, tiddlers, options);
			} else {
				ajaxReq({
					url: url,
					dataType: "json",
					beforeSend: followMacro.beforeSend,
					success: function(tiddlers) {
						scanMacro.scanned[url] = {
							tiddlers: tiddlers
						};
						scanMacro._scanCallback(place, tiddlers, options);
					},
					error: function() {
						$("<span />").text(locale.error).appendTo(place);
					}
				});
			}
		});
	},
	template: function(place, tiddlers, template) {
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
		var tag = args.tag ? args.tag[0] : false;
		var titles = args.title;
		var spaceField = args.spaceField ? args.spaceField[0] : "bag";
		var searchField = args.searchField ? args.searchField[0] : "title";
		// if user has set searchField to modifier, then use the modifiers value if available otherwise use searchValues.
		var searchValues = args[searchField] ? args[searchField] : args.searchValues;
		// if neither of those were used use the first parameter
		var defaultValues = tiddler ? [ tiddler.title ] : [];
		searchValues = searchValues ? searchValues : ( args.name ? [args.name[0]] : defaultValues);
		var fat = args.fat ? true : false;
		var template = args.template ? args.template[0] : false;
		var filter = args.filter ? args.filter[0] : false;
		var query = args.query ? args.query[0] : false;
		var sort = args.sort ? args.sort[0] : false;
		var showBags = args.show ? args.show : false;
		var hideBags = args.hide ? args.hide : false;
		return { searchField: searchField, searchValues: searchValues,
			template: template, filter: filter, sort: sort, hideBags: hideBags, showBags: showBags,
			query: query, tag: tag, fat: fat, spaceField: spaceField };
	},
	handler: function(place, macroName, params, wikifier, paramString, tiddler) {
		var container = $("<div />").addClass("scanResults").appendTo(place)[0];
		var options = scanMacro.getOptions(paramString, tiddler);
		scanMacro.scan(container, options);
	}
};

var followersMacro = config.macros.followers = {
	locale: {
		loggedOut: "Please login to see the list of followers",
		noSupport: "We were unable to retrieve followers as your browser does not support following.",
		pleaseWait: "Please wait while we look this up...",
		error: "Whoops something went wrong. I was unable to find the followers of this user.",
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
				$.extend(options, { searchValues: [user.name, "@%0".format(user.name)],
					spaceField: "bag", tag: followMacro.followTag,
					template: options.template ? options.template : "FollowersTemplate"
				});
				scanMacro.scan(container, options);
			}
		};
		if(!username) {
			followersCallback({ name: currentSpace });
		} else {
			followersCallback({ name: username });
		}
	}
};

var followingMacro = config.macros.following = {
	locale: {
		pleaseWait: followersMacro.locale.pleaseWait,
		loggedOut: "Please login to see who you are following",
		noSupport: followersMacro.locale.noSupport,
		error: "Whoops something went wrong. I was unable to find who this user is following.",
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
				$.extend(options, { searchValues: ["%0_public".format(user.name)],
					tag: followMacro.followTag, searchField: "bag", spaceField: "title",
					template: options.template ? options.template : "FollowingTemplate"
				});
				scanMacro.scan(container, options);
			}
		};
		if(!username) {
			followingCallback({ name: currentSpace });
		} else {
			followingCallback({ name: username });
		}
	}
};

config.macros.view.views.spaceLink = function(value, place, params, wikifier,
		paramString, tiddler) {
		var spaceName = tiddlyspace.resolveSpaceName(value);
		var args = paramString.parseParams("anon")[0];
		var titleField = args.anon[2];
		var labelField = args.labelField ? args.labelField[0] : false;
		var label;
		if(labelField) {
			label = tiddler[labelField] ? tiddler[labelField] : tiddler.fields[labelField];
		} else {
			label = args.label ? args.label[0] : false;
		}
		var title = tiddler[titleField] ? tiddler[titleField] : tiddler.fields[titleField];

		var link = createSpaceLink(place, spaceName, title, label);
		if(args.external && args.external[0] == "no") {
			$(link).click(function(ev) {
				ev.preventDefault();
				var el = $(ev.target);
				tiddlyspace.displayServerTiddler(el[0], el.attr("tiddler"),
					"bags/%0_public".format(el.attr("tiddlyspace")));
				return false;
			});
		}
};

})(jQuery);
//}}}
