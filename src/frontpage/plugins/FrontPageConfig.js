//{{{
(function($) {

// override Scroller to ensure that the screen scrolls to a desired height
// in this case, we want it to scroll almost (but not quite) 1 entire screen
_Scroller = Scroller; // keep original, just in case...
Scroller = function(targetElement) {
	var offset = 50;
	var endPoint = ensureVisible(targetElement);
	var minScroll = $("#footer").offset().top - offset;
	if(endPoint < minScroll) {
		endPoint = minScroll;
	}
	// make sure the page has enough space to scroll into
	var tiddlerDisplay = $("#tiddlerDisplay");
	if($(tiddlerDisplay).height() < (screen.height - offset)) {
		$(tiddlerDisplay).height(screen.height - offset);
	}

	var p = [{ style: "-tw-vertScroll", start: findScrollY(), end: endPoint }];

	return new Morpher(targetElement, config.animDuration, p);
};

// add a macro to set the appropriate login form to open by default before
// loading the login tiddler
config.macros.TiddlySpaceLoginLoader = {
	handler: function(place, macro, params, wikifier, paramString, tiddler) {
		var cookie = "taggedTabs";
		createTiddlyButton(place, params[1], params[1], function() {
			var tabbedSignUp = $('.taggedTabs');
			if (tabbedSignUp.length) { // it is already visible
				console.log('in if');
				config.macros.tabs.switchTab(tabbedSignUp[0], params[1]);
			} else {
				console.log('in else');
				config.options[cookie] = params[1];
			}
			story.displayTiddler(place, params[0]);
		}, "tiddlyLinkExisting");
	}
};

})(jQuery);
//}}}
