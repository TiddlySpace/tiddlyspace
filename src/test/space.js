(function(module, $) {

var _request, _response;
var _ajax = $.ajax;
var nop = function() {};

var XHR = function(headers) {
	this._headers = headers || {};
};
XHR.prototype.getResponseHeader = function(name) {
	return this._headers[name.toLowerCase()];
};

module("space resource", {
	setup: function() {
		var xhr = new XHR();
		$.ajax = function(options) {
			var data = options.data ? $.evalJSON(options.data) : _response;
			_request = options;
			options.success(data, null, xhr);
			options.error(xhr, null, null);
			if (options.complete) {
				options.complete(data, null, xhr);
			}
		};
	},
	teardown: function() {
		$.ajax = _ajax;
	}
});

test("routes", function() {
	strictEqual(tiddlyweb.routes.spaces.length, 13);
	strictEqual(tiddlyweb.routes.space.length, 20);
	strictEqual(tiddlyweb.routes.members.length, 28);
	strictEqual(tiddlyweb.routes.member.length, 39);
});

test("entity", function() {
	var space;

	space = new tiddlyweb.Space("Foo");
	strictEqual(space.name, "Foo");
	strictEqual(space.host, null);
	strictEqual(space.route(), "{host}/spaces/Foo");

	space.host = "example.org";
	strictEqual(space.route(), "example.org/spaces/Foo");

	space = new tiddlyweb.Space("Bar", "/");
	strictEqual(space.name, "Bar");
	strictEqual(space.route(), "/spaces/Bar");
});

test("creation", function() {
	var space, _data, _orig;

	var callback = function(data, status, xhr) {
		_data = data;
	};
	var errback = function(xhr, error, exc, resource) {
		_orig = resource;
	};

	_data = _orig = null;
	space = new tiddlyweb.Space("Foo", "/");
	space.create(callback, nop);
	strictEqual(_data.name, "Foo");

	_data = _orig = null;
	space = new tiddlyweb.Space("Bar");
	space.create(nop, errback);
	strictEqual(_orig.name, "Bar");
});

test("members collection", function() {
	var space, _data;

	var callback = function(data, status, xhr) {
		_data = data;
	};

	_data = null;
	_response = ["jon", "jane"];
	space = new tiddlyweb.Space("Foo", "example.com");
	space.members().get(callback, nop);
	strictEqual(_data.length, 2);
	strictEqual(_data[0], "jon");
});

test("adding members", function() {
	var space, _data;
	var members = ["jon", "jane"];

	var callback = function(data, status, xhr) {
		var username = _request.url.split("/").pop();
		members.push(username);
		_data = members;
	};

	_data = null;
	space = new tiddlyweb.Space("Foo", "example.org");
	space.members().add("jim", callback, nop);
	strictEqual(_data.length, 3);
	strictEqual(_data[2], "jim");
});

test("removing members", function() {
	var space, _data;
	var members = ["jon", "jane"];

	var callback = function(data, status, xhr) {
		var username = _request.url.split("/").pop();
		var pos = $.inArray(username, members);
		members.splice(pos, 1);
		_data = members;
	};

	_data = null;
	space = new tiddlyweb.Space("Foo", "example.org");
	space.members().remove("jon", callback, nop);
	strictEqual(_data.length, 1);
	strictEqual(_data[0], "jane");
});

})(QUnit.module, jQuery);
