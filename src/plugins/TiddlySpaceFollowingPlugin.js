/***
|''Name''|TiddlySpaceFollowingPlugin|
|''Version''|0.4.8|
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
!Code
***/
//{{{
(function($) {

config.annotations.FollowersTemplate = "This tiddler is used in the display of tiddlers from spaces you are following. Use the wildcard $1 for the space name, $2 for the space uri and $3 for the tiddler text.";
config.shadowTiddlers.FollowersTemplate = "[[$1|$2]]";

var tweb = config.extensions.tiddlyweb;
var tiddlyspace = config.extensions.tiddlyspace;
var imageMacro = config.macros.image;

var name = "StyleSheetFollowing";
config.shadowTiddlers[name] = store.getTiddlerText(tiddler.title +
     "##StyleSheet");
store.addNotification(name, refreshStyles);

// provide support for sucking in tiddlers from the server
tiddlyspace.displayServerTiddler = function(src, title, workspace) {
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
		var callback = function(context, userParams) {
			var tiddler = context.tiddler;
			tiddler.fields.doNotSave = "true";
			tiddler.title = "%0 [%1]".format([title, space]);
			store.addTiddler(tiddler); // overriding existing allows updating

			var el = story.displayTiddler(src || null, tiddler.title);
			var refresh = story.getTiddler(tiddler.title);
			if(refresh) {
				story.refreshTiddler(tiddler.title, null, true);
			}
			return el;
		};
		adaptor.getTiddler(title, context, null, callback);
	});
};

var followMacro = config.macros.followTiddlers = {
	locale: {
		followListHeader: "Here are tiddlers from spaces you follow using the follow tag which match this name.",
		noTiddlersFromFollowers: "None of the spaces you follow contain a tiddler with this name.",
		errorMessage: "There was a problem retrieving tiddlers from the server. Please try again later."
	},
	beforeSend: function(xhr) {
		xhr.setRequestHeader("X-ControlView", "false");
	},
	followTag: "follow",
	follower_names_cache: {},
	getHosts: function(callback) {
		tweb.getStatus(function(status) {
			callback(status.host, tiddlyspace.getHost(status.server_host, "%0"));
		});
	},
	handler: function(place, macroName, params, wikifier, paramString, tiddler) {
		var title = params[0] || tiddler.fields["server.title"] || tiddler.title;
		var user = params[1] || false; // allows a user to use the macro on another username
		this.getFollowers(function(followers) {
			var bagQuery = followMacro._constructBagQuery(followers);
			followMacro.getHosts(function(host, tsHost) {
				if(followers.length > 0) { // only run the search if we have a list of followers
					ajaxReq({
						dataType: "json",
						beforeSend: followMacro.beforeSend,
						url: '%0/search.json?q=ftitle:"%1" %2'.
							format([host, encodeURI(title), bagQuery]),
						success: function(tiddlers) {
							followMacro.constructInterface(place, tiddlers, { host: tsHost });
						}
					});
				} else {
					followMacro.constructInterface(place, [], {});
				}
			});
		}, user);
	},
	constructInterface: function(place, tiddlers, options) {
		var ul = $('<ul class="followTiddlersList" />');
		var host = options.host;
		var handler = function(ev) {
			var link = $(ev.target);
			var spaceName = link.attr("space");
			var title = link.attr("title");
			tiddlyspace.displayServerTiddler(null, title, "bags/%0_public".format([spaceName]));
		};
		var tsHost = host.replace("%0.", "");
		for(var i = 0; i < tiddlers.length; i++) {
			var tiddler = tiddlers[i];
			var title = tiddler.title;
			var spaceName = tiddler.bag.replace(/([^_]*)_public/i, "$1");
			var modifier = tiddler.modifier;
			var link = $('<a href="#" title="%0" class="alienTiddlerLink">%0</a>'.format([title])).
				attr("space", spaceName).click(handler);
			var li = $("<li />");
			imageMacro.renderImage(li[0],
				"%0/recipes/%1_public/tiddlers/SiteIcon".format([tsHost, spaceName]),
				{ imageClass: "siteIcon" });
			li.append(link);
			var modifierLink = host.format([modifier]);
			var spaceLink = host.format([spaceName]);
			$('<span>&nbsp;(last modified by <a href="%2">%0</a> in <a href="%3">%1</a>)</span>'.
				format([modifier, spaceName, modifierLink, spaceLink])).
				appendTo(li);
			ul.append(li);
		}
		var txt = tiddlers.length;
		if(tiddlers.length === 0) {
			if(options.error) {
				txt = "?";
				$("<li />").text(followMacro.locale.errorMessage).appendTo(ul);
			} else {
				$("<li />").text(followMacro.locale.noTiddlersFromFollowers).appendTo(ul);
			}
		}
		var container = $('<div class="followButton" />').
		click(function(ev) {
			followMacro.followingOnClick(ev,ul[0]);
		}).appendTo(place)[0];
		$('<a class="followedTiddlers">%0</a>'.format([txt])).
			appendTo('<div class="followedTiddlers" />').appendTo(container);
	},
	followingOnClick: function(ev, list) {
		var target = ev.target;
		var el = $(story.findContainingTiddler(target));
		var place = $(".concertina", el)[0];
		var headerTxt = followMacro.locale.followListHeader;
		var contentEl = $("<div />").
			append('<div class="followHeader">%0</div>'.format([headerTxt])).
			append(list);
		if(!place) {
			var popup = Popup.create(target,"div");
			addClass(popup ,"taggedTiddlerList followList");
			place = popup;
			$(popup).append(contentEl);
			Popup.show();
		} else {
			if($(place).attr("openedby") == "followTiddlers") {
				el.removeClass("concertinaOn");
				$(place).attr("openedby","").empty().append(contentEl).
					slideUp(500);
			} else {
				el.addClass("concertinaOn");
				$(place).empty().append(contentEl).slideDown(500).
					attr("openedby", "followTiddlers");
			}
		}
		ev.stopPropagation();
	},
	_constructBagQuery: function(followers) {
		var querySegments = [];
		var currentSpaceName = tiddlyspace.currentSpace.name;
		for(var i = 0; i < followers.length; i++) {
			var follower = followers[i];
			if(follower != currentSpaceName) {
				querySegments.push("fbag:%0_public".format([encodeURI(follower)]));
			}
		}
		return "(%0)".format([querySegments.join("%20OR%20")]);
	},
	getFollowers: function(callback, username) {
		// returns a list of spaces being followed by the existing space
		var adaptor = store.getTiddlers()[0].getAdaptor();
		var followersCallback = function(user) {
			var followers = [];
			if(!user.anon) {
				var username = user.name;
				if(username == tiddlyspace.currentSpace.name) {
					// just get the tiddlers in the local store
					var followerTiddlers = store.getTaggedTiddlers(followMacro.followTag);
					for(var i = 0; i < followerTiddlers.length; i++) {
						followers.push(followerTiddlers[i].title);
					}
					callback(followers);
				} else {
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
								followers.push(tiddlers[i].title);
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
		var fat = args.fat ? "&fat=y" : "";
		var username = params[0] || false;
		var container = $('<div class="followers" />').text(locale.pleaseWait).
			appendTo(place)[0];
		var followersCallback = function(user) {
			if(user.anon) {
				$("<span />").text(locale.loggedOut).appendTo(container);
			} else {
				followMacro.getHosts(function(host, tsHost) {
					var url = '%0/search.json?q=(title:"%1" AND tag:%2)%3'.
						format([host, user.name,followMacro.followTag, fat]);
					followersMacro.listUsers(container, url, locale,
						{ field: "bag", link: true, host: tsHost });
				});
			}
		};
		if(!username) {
			tweb.getUserInfo(followersCallback);
		} else {
			followersCallback({ name: username });
		}
	},
	listUsers: function(place, url, locale, options) {
		options = options ? options: {};
		options.template = options.template ? options.template : "FollowersTemplate";
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
					for(var i = 0; i < tiddlers.length; i++) {
						var tiddler = tiddlers[i];
						var spaceName = tiddler[field];
						if(field == "bag") {
							spaceName = spaceName.replace("_public", "");
						}
						var spaceURI = host.format([spaceName]);
						var item = $('<li class="spaceName" />').appendTo(list)[0];
						config.macros.tiddler.handler(item,null,null,null,
							'name:%0 with:"%1" with:"%2" with:"%3"'.
								format([options.template, spaceName, spaceURI, tiddler.text]));
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
					var url =  '%0/search.json?q=(bag:"%1_public" AND tag:%2)%3'.
						format([host, user.name,followMacro.followTag, fat]);
					followersMacro.listUsers(container, url, locale,
						{ field: "title", link: true });
				});
			}
		};
		if(!username) {
			tweb.getUserInfo(followingCallback);
		} else {
			followingCallback({ name: username });
		}
	}
};

})(jQuery);
//}}}
