(function($) {

TiddlyWeb.Space = function(name, owner, host) {
	TiddlyWeb.Resource.apply(this, ["space", host]);
	this.name = name;
	this.members = [owner];
};
TiddlyWeb.Space.prototype = new TiddlyWeb.Resource();
$.extend(TiddlyWeb.Space.prototype, {
	put: function(callback, errback) {
		var policies = { bags: {}, recipes: {} };
		policies.bags.private = {
			read: this.members,
			write: this.members,
			create: this.members,
			"delete": this.members,
			manage: this.members,
			accept: this.members,
			owner: this.members[0]
		};
		policies.recipes.private = $.extend({}, policies.bags.private, {
			write: undefined,
			create: undefined,
			"delete": undefined,
			accept: undefined
		});
		policies.bags.public = $.extend({}, policies.bags.private, {
			read: []
		});
		policies.recipes.public = $.extend({}, policies.recipes.private, {
			read: []
		});

		var containers = [];
		var self = this;
		$.each(["bag", "recipe"], function(i, type) {
			$.each(["private", "public"], function(j, visibility) {
				var className = TiddlyWeb._capitalize(type);
				var name = self.name + "_" + visibility;
				var container = new TiddlyWeb[className](name, self.host);
				container.desc = self.name + " space, " + visibility + " " +
					(type == "bag" ? "content" : "document");
				container.policy = policies[type + "s"][visibility];
				if(type == "recipe") {
					container.recipe = [
						["system", ""],
						["tiddlyspace", ""],
						[self.name + "_public", ""]
					];
					if(visibility == "private") {
						container.recipe.push([self.name + "_private", ""]);
					}
				}
				containers.push(container);
			});
		});

		var xhrCount = 0;
		var _callback = function(data, status, xhr) {
			xhrCount++;
			if(xhrCount == 4) {
				callback(data, status, xhr);
			}
		};
		var _errback = function(xhr, error, exc) {
			if(xhrCount >= 0) {
				xhrCount = -5;
				errback(xhr, error, exc);
			}
		};
		for(var i = 0; i < containers.length; i++) {
			containers[i].put(_callback, _errback);
		}
	}
});

})(jQuery);
