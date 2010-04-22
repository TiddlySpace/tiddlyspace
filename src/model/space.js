(function($) {

tiddlyweb.Space = function(name, members, host) {
	tiddlyweb.Resource.apply(this, ["space", host]);
	this.name = name;
	this.members = members;
	this.constituents = this.getConstituents();
};
tiddlyweb.Space.prototype = new tiddlyweb.Resource();
$.extend(tiddlyweb.Space.prototype, {
	get: function(callback, errback) {
		var self = this;
		var _callback = function(entities, status, xhr) {
			self.constituents = entities;
			self.members = self.constituents[0].policy.manage; // XXX: authoritative?
			callback(self, status, xhr);
		};
		this.request("get", _callback, errback);
	},
	put: function(callback, errback) {
		var self = this;
		var _callback = function(responseData, status, xhr) {
			callback(self, status, xhr);
		};
		this.request("put", _callback, errback);
	},
	getConstituents: function() {
		var policies = {
			private: {
				read: this.members,
				write: this.members,
				create: this.members,
				"delete": this.members,
				manage: this.members,
				accept: this.members,
				owner: this.members[0] // XXX: ignored by TiddlyWeb
			}
		};
		policies.public = $.extend({}, policies.private, {
			read: []
		});
		var entities = [];
		var self = this;
		$.each(["bag", "recipe"], function(i, type) {
			$.each(["private", "public"], function(j, visibility) {
				var className = tiddlyweb._capitalize(type);
				var name = self.name + "_" + visibility;
				var entity = new tiddlyweb[className](name, self.host);
				entity.desc = self.name + " space, " + visibility + " " +
					(type == "bag" ? "content" : "document");
				entity.policy = policies[visibility];
				if(type == "recipe") {
					entity.recipe = [
						["system", ""],
						["tiddlyspace", ""],
						[self.name + "_public", ""]
					];
					if(visibility == "private") {
						entity.recipe.push([self.name + "_private", ""]);
					}
				}
				entities.push(entity);
			});
		});
		return entities;
	},
	request: function(type, callback, errback) {
		var responseData = [];
		var entityCount = this.constituents.length;
		var xhrCount = 0;
		var _callback = function(data, status, xhr) {
			responseData.push(data);
			xhrCount++;
			if(xhrCount == entityCount) {
				callback(responseData, status, xhr);
			}
		};
		var _errback = function(xhr, error, exc) {
			if(xhrCount >= 0) {
				xhrCount = (entityCount + 1) * -1;
				errback(xhr, error, exc);
			}
		};
		for(var i = 0; i < entityCount; i++) {
			this.constituents[i][type](_callback, _errback);
		}
	}
});

})(jQuery);
