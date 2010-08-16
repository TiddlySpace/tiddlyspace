config.defaultCustomFields = {
	"server.workspace": "recipes/foo_private"
};

config.extensions.ServerSideSavingPlugin = {};

config.extensions.tiddlyweb = {
	host: "",
	status: {},

	getStatus: function() {
		return this.status;
	}
};
