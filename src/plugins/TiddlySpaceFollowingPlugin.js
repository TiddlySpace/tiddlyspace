/***
|''Name''|TiddlySpaceFollowingPlugin|
|''Version''|0.5.5|
|''Description''|Provides a following macro|
|''Author''|Jon Robson|
|''Requires''|TiddlySpaceConfig ImageMacroPlugin|
|''License''|[[BSD|http://www.opensource.org/licenses/bsd-license.php]]|
!Usage
Tag a tiddler with "follow" to express a list of followers.
Using the {{{<<followTiddlers X>>}}}
will reveal the number of tiddlers with name X in the set of spaces the *current* user viewing your space follows.
{{{<<following jon>>}}} will list all the users following Jon.
{{{<<followers jon>>}}} will list all the followers of jon.
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

.followTiddlersList li .externalImage, .followTiddlersList li .image {
	display: inline;
}
.scanResults li {
	list-style: none;
}
!To do
mangle external links to work in their new environment.

!Code
***/
//{{{
(function($) {

var tweb = config.extensions.tiddlyweb;
var tiddlyspace = config.extensions.tiddlyspace;
var imageMacro = config.macros.image;

config.annotations.ScanTemplate = "This tiddler is used in the display of tiddlers from spaces you are following. Use the wildcard {{{$1}}} for the space name the tiddler came from and {{{$2}}} for the tiddler text.";
tweb.getStatus(function(status) { // get true avatar
	var avatar = tiddlyspace.getAvatar(status.server_host, "$1");
	config.shadowTiddlers.ScanTemplate = "<<image %0 24 24>> [[$1]] [[visit space|@$1]]".format([avatar]);
});

var name = "StyleSheetFollowing";
tiddler = {title: "TiddlySpaceFollowingPlugin"};
config.shadowTiddlers[name] = store.getTiddlerText(tiddler.title +
     "##StyleSheet");
store.addNotification(name, refreshStyles);

// provide support for sucking in tiddlers from the server
tiddlyspace.displayServerTiddler = function(src, title, workspace, callback) {
	var adaptor = store.getTiddlers()[0].getAdaptor();
	tweb.getStatus(function(status) {
		var context = {
			workspace: workspace,
			headers: { "X-ControlView": "false" }
		};
		var isPublic = workspace.indexOf("_public") > -1;
		var space = workspace.substr(workspace.indexOf("/") + 1).
			replace("_public", "").replace("_private", "");
		if(tiddlyspace.currentSpace.name == space) {
			space = isPublic ? "public" : "private";
		} else {
			space = "@%0".format([space]);
		}
		var getCallback = function(context, userParams) {
			var tiddler = context.tiddler;
			tiddler.fields.doNotSave = "true";
			tiddler.title = "%0 [%1]".format([title, space]);
			store.addTiddler(tiddler); // overriding existing allows updating

			var el = story.displayTiddler(src || null, tiddler.title);
			var refresh = story.getTiddler(tiddler.title);
			if(refresh) {
				story.refreshTiddler(tiddler.title, null, true);
			}
			if(callback) {
				tiddlyspace.displayReplyButton(el, tiddler);
				callback(el, tiddler);
			}
		};
		adaptor.getTiddler(title, context, null, getCallback);
		
	});
};
tiddlyspace.displayReplyButton = function(el, tiddler) {
	var btn = $("<button />").addClass("reply").text("reply").appendTo(el);
	var publicBag = "%0_public".format([tiddlyspace.currentSpace.name]);
	var serverTitle = tiddler.fields["server.title"];
	btn.click(function(ev) {
		story.displayTiddler(ev.target, serverTitle, DEFAULT_EDIT_TEMPLATE, false, null, null);
		var tiddlerEl = story.getTiddler(serverTitle);
		var yourTiddler = store.getTiddler(serverTitle);
		var text = yourTiddler ? yourTiddler.text : "";
		if(!yourTiddler) {
			var newFields = {};
			merge(newFields, config.defaultCustomFields);
			merge(newFields, { "server.workspace": "bags/%0".format([publicBag]) });
			var customFields = String.encodeHashMap(newFields);
			if(customFields) {
				story.addCustomFields(tiddlerEl, customFields);
			}
		}
		var replyTemplate = "in reply to @%0:\n<<<\n%1\n<<<\n\n%2".format([tiddler.modifier, tiddler.text, text]);
		$("[edit=text]", tiddlerEl).val(replyTemplate);

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
	follower_names_cache: {},
	getHosts: function(callback) {
		tweb.getStatus(function(status) {
			callback(tweb.host, tiddlyspace.getHost(status.server_host, "%0"));
		});
	},
	handler: function(place, macroName, params, wikifier, paramString, tiddler) {
		var title = params[0] || tiddler.fields["server.title"] || tiddler.title;
		var btn = $('<div class="followButton" />').appendTo(place)[0];
		var options = {};
		var user = params[1] || false; // allows a user to use the macro on another username
		this.getFollowers(function(followers) {
			var bagQuery = followMacro._constructBagQuery(followers);
			followMacro.getHosts(function(host, tsHost) {
				options.host = tsHost;
				options.ignore = tiddler.fields["server.bag"];
				if(followers.length > 0) { // only run the search if we have a list of followers
					for(var i = 0; i < followers.length; i++) {
						followMacro.makeQuery(btn, title, followers[i], options);
					}
				} else {
					followMacro.constructInterface(btn, [], options);
				}
			});
		}, user);
	},
	makeQuery: function(container, title, bag, options) {
		if(!followMacro.lookup[title]) {
			followMacro.lookup[title] = { tested: [], tiddlers: [] };
		}
		if(followMacro.lookup[title].tested.contains(bag)) {
			followMacro.constructInterface(container, followMacro.lookup[title].tiddlers, options);
		} else {
			followMacro.lookup[title].tested.pushUnique(bag);
			ajaxReq({
				dataType: "json",
				beforeSend: followMacro.beforeSend,
				url: "/bags/%0_public/tiddlers/%1".format([bag, title]),
				success: function(tiddler) {
					followMacro.lookup[title].tiddlers.push(tiddler);
					followMacro.constructInterface(container, followMacro.lookup[title].tiddlers, options);
				},
				error: function() {
					followMacro.constructInterface(container, followMacro.lookup[title].tiddlers, options);
				}
			});
		}
	},
	constructInterface: function(place, tiddlers, options) {
		$(place).empty();
		var ignore = 0;
		var ul = $('<ul class="followTiddlersList" />');
		var host = options.host || "";
		var handler = function(ev) {
			var link = $(ev.target);
			var spaceName = link.attr("space");
			var title = link.attr("title");
			tiddlyspace.displayServerTiddler(null, title, "bags/%0_public".format([spaceName]));
		};
		for(var i = 0; i < tiddlers.length; i++) {
			var tiddler = tiddlers[i];
			var title = tiddler.title;
			if(tiddler.bag != options.ignore) {
				var spaceName = tiddler.bag.replace(/([^_]*)_public/i, "$1");
				var tsHost = host.format([spaceName]);
				var modifier = tiddler.modifier;
				var link = $('<a href="#" title="%0" class="alienTiddlerLink">%0</a>'.format([title])).
					attr("space", spaceName);
				var li = $("<li />");
				imageMacro.renderImage(li[0],
					"%0/bags/%1_public/tiddlers/SiteIcon".format([tsHost, spaceName]),
					{ imageClass: "siteIcon" });
				var label = $("<span />").addClass("label").appendTo(li);
				label.append(link);
				var modifierLink = host.format([modifier]);
				var spaceLink = host.format([spaceName]);
				$('<span>&nbsp;(last modified by <a href="%2">%0</a> in <a href="%3">%1</a>)</span>'.
					format([modifier, spaceName, modifierLink, spaceLink])).
					appendTo(label);
				ul.append(li);
			} else {
				ignore += 1;
			}
		}
		var txt = tiddlers.length - ignore;
		if(tiddlers.length === 0) {
			if(options.error) {
				txt = "?";
				$("<li />").text(followMacro.locale.errorMessage).appendTo(ul);
			} else {
				$("<li />").text(followMacro.locale.noTiddlersFromFollowers).appendTo(ul);
			}
		}
		var headerTxt = followMacro.locale.followListHeader;
		var contentEl = $("<div />").
			append('<div class="followHeader listTitle">%0</div>'.format([headerTxt])).
			prependTo(ul);
		var el = $(story.findContainingTiddler(place));
		var btn = $(place).click(function(ev) {
				var popup = followMacro.followingOnClick(ev, ul[0]);
				$(".alienTiddlerLink", popup).click(handler);
			})[0];
		var className = txt > 0 ? "hasReplies" : "noReplies";
		$(place).addClass(className);
		$('<a class="followedTiddlers">%0</a>'.format([txt])).
			appendTo('<div class="followedTiddlers" />').appendTo(btn);
	},
	followingOnClick: function(ev, list) {
		var target = ev.target;
		var popup = Popup.create(target,"div");
		$(popup).addClass("taggedTiddlerList followList");
		$(popup).append(list);
		Popup.show();
		ev.stopPropagation();
		return popup;
	},
	_constructBagQuery: function(followers) {
		var querySegments = [];
		var currentSpaceName = tiddlyspace.currentSpace.name;
		for(var i = 0; i < followers.length; i++) {
			var follower = followers[i];
			if(follower != currentSpaceName) {
				querySegments.push("bag:%0_public".format([encodeURI(follower)]));
			}
		}
		var searchArg = "(%0)".format([querySegments.join("%20OR%20")]);
		return querySegments.length > 0 ? searchArg : false;
	},
	getFollowerSpaceName: function(title) {
		title = title.toLowerCase();
		return title.indexOf("@") === 0 ? title.substr(1, title.length) : title; 
	},
	getFollowers: function(callback, username) {
		// returns a list of spaces being followed by the existing space
		var followersCallback = function(user) {
			var followers = [];
			if(!user.anon) {
				var username = user.name;
				if(username == tiddlyspace.currentSpace.name) {
					// just get the tiddlers in the local store
					var followerTiddlers = store.getTaggedTiddlers(followMacro.followTag);
					for(var i = 0; i < followerTiddlers.length; i++) {
						followers.push(followMacro.getFollowerSpaceName(followerTiddlers[i].title));
					}
					callback(followers);
				} else {
					var adaptor = store.getTiddlers()[0].getAdaptor();
					if(followMacro.follower_names_cache[username]) {
						// use cached list to save ajax requests
						return callback(followMacro.follower_names_cache[username]);
					}
					followMacro.getHosts(function(host, tsHost) {
						var context = {
							host: host,
							workspace: "bags/%0_public".format([user.name]),
							filters: "select=tag:%0".format([followMacro.followTag]),
							headers: { "X-ControlView": "false" }
						};
						var tiddlerListCallback = function(context){
							var tiddlers = context.tiddlers || [];
							for(var i = 0; i < tiddlers.length; i++) {
								followers.push(followMacro.getFollowerSpaceName(tiddlers[i].title));
							}
							followMacro.follower_names_cache[username] = followers;
							callback(followers);
						};
						adaptor.getTiddlerList(context, null, tiddlerListCallback);
					});
				}
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
	scan: function(place, inputs, tag, options) {
		options = options ? options: {};
		options.template = options.template ? options.template : "ScanTemplate";
		searchField = options.searchField || "title";
		var host = options.host.format([tiddlyspace.currentSpace.name]);
		var locale = followersMacro.locale;
		var titleQuery = [];
		for(var i = 0; i < inputs.length; i++) {
			titleQuery.push('%0:"%1"'.format([searchField, inputs[i]]));
		}
		var query = titleQuery.join(" OR ");
		query = tag ? "(%0) AND tag:%1".format([query, tag]) : query;
		query = options.fat ? "%0&fat=y".format([query]) : query;
		var url = '%0/search?q=%1'.format([host, query]);
		locale = locale ? locale : {};
		var host = options.host || "/";
		var field = options.field;
		try {
			ajaxReq({
				url: url,
				dataType: "json",
				beforeSend: followMacro.beforeSend,
				success: function(tiddlers) {
					$(place).empty();
					var list = $("<ul />").appendTo(place);
					tiddlers = tiddlers.sort(function(a, b) {
						return a.bag < b.bag ? -1 : 1;
					});

					for(var i = 0; i < tiddlers.length; i++) {
						var tiddler = tiddlers[i];
						var spaceName = tiddler[field];
						if(field == "bag") {
							spaceName = spaceName.replace("_public", "");
						}
						spaceName = followMacro.getFollowerSpaceName(spaceName);
						var spaceURI = host.format([spaceName]);
						var item = $('<li class="spaceName" />').appendTo(list)[0];
						var paramString = 'name:%0 with:"%1" with:"%2"'.
							format([options.template, spaceName, tiddler.text]);
						config.macros.tiddler.handler(item, null, null, null,
							paramString);
					}
					if(tiddlers.length === 0) {
						$("<li />").text(locale.noone).appendTo(list);
					}
				},
				error: function() {
					$("<span />").text(locale.error).appendTo(place);
				}
			});
		} catch(e) {
			$('<span class="error"/>').text(locale.noSupport).appendTo(place);
		}
	},
	handler: function(place, macroName, params, wikifier, paramString, tiddler) {
		var args = paramString.parseParams("name", null, true, false, true)[0];
		var tag = args.tag ? args.tag[0] : false;
		var titles = args.title || [params[0]];
		var fat = args.fat;
		var container = $("<div />").addClass("scanResults").appendTo(place)[0];
		followMacro.getHosts(function(host, tsHost) {
			scanMacro.scan(container, titles, tag, { field: "bag", host: tsHost, fat: args.fat });
		});
	}
};

var followersMacro = config.macros.followers = {
	locale: {
		loggedOut: "Please login to see the list of followers",
		noSupport: "We were unable to retrieve followers as your browser does not support following.",
		pleaseWait: "Please wait while we look this up...",
		error: "Whoops something went wrong. I was unable to find the followers of this user.",
		noone: "No-one. :("
	},
	handler: function(place, macroName, params, wikifier, paramString, tiddler) {
		var locale = followersMacro.locale;
		var args = paramString.parseParams("name", null, true, false, true)[0];
		var username = params[0] || false;
		var container = $('<div class="followers" />').text(locale.pleaseWait).
			appendTo(place)[0];
		var followersCallback = function(user) {
			if(user.anon) {
				$("<span />").text(locale.loggedOut).appendTo(container);
			} else {
				followMacro.getHosts(function(host, tsHost) {
					scanMacro.scan(container, [user.name, "@%0".format([user.name])], 
						followMacro.followTag,
						{ field: "bag", host: tsHost, fat: args.fat });
				});
			}
		};
		if(!username) {
			followersCallback({ name: tiddlyspace.currentSpace.name });
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
		var fat = args.fat ? "&fat=y" : "";
		var username = params[0] || false;
		var container = $('<div class="following" />').text(locale.pleaseWait).
			appendTo(place)[0];
		var followingCallback = function(user) {
			if(user.anon) {
				$("<span />").text(locale.loggedOut).appendTo(container);
			} else {
				followMacro.getHosts(function(host) {
					scanMacro.scan(container, [user.name], followMacro.followTag,
						{ field: "bag", searchField: "title", fat: fat, host: host});
				});
			}
		};
		if(!username) {
			followingCallback({ name: tiddlyspace.currentSpace.name });
		} else {
			followingCallback({ name: username });
		}
	}
};

})(jQuery);
//}}}
