/***
TiddlySpace extensions for [[chrjs]]
***/
//{{{
(function($) {

tiddlyweb.routes.spaces = "{host}/spaces";
tiddlyweb.routes.space = "{host}/spaces/{name}";
tiddlyweb.routes.members = "{host}/spaces/{name}/members";
tiddlyweb.routes.member = "{host}/spaces/{name}/members/{username}";

tiddlyweb.Space = function(name, host) {
	tiddlyweb.Resource.apply(this, ["space", host]);
	this.name = name;
};
tiddlyweb.Space.prototype = new tiddlyweb.Resource();
$.extend(tiddlyweb.Space.prototype, {
	create: function(callback, errback) { // API wrapper
		this.put.apply(this, arguments);
	},
	members: function() {
		return new MemberCollection(this);
	}
});

var Member = function(username, space) {
	tiddlyweb.Resource.apply(this, ["member", space.host]);
	this.name = space.name;
	this.username = username;
};
Member.prototype = new tiddlyweb.Resource();

var MemberCollection = function(space) {
	tiddlyweb.Collection.apply(this, ["members", space.host, {
		name: space.name
	}]);
};
MemberCollection.prototype = new tiddlyweb.Collection();
$.extend(MemberCollection.prototype, {
	add: function(username, callback, errback) {
		var member = new Member(username, this);
		member.put(callback, errback);
	},
	remove: function(username, callback, errback) {
		var member = new Member(username, this);
		member["delete"](callback, errback);
	}
});

})(jQuery);
//}}}
