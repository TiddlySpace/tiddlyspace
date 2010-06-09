/***
|TableViewPlugin|
|Version|0.1|
|Author|Ben Gillies|
***/
//{{{
(function($) {

// override Scroller to ensure that the screen scrolls to a desired height
// in this case, we want it to scroll almost (but not quite) 1 entire screen
_Scroller = Scroller; // keep original, just in case...
Scroller = function(targetElement) {
	var offset = 50;
	var endPoint = ensureVisible(targetElement);
	var minScroll = $("#footer").offset().top - offset;
	if (endPoint < minScroll) {
		endPoint = minScroll;
	}
	// make sure the page has enough space to scroll into
	var tiddlerDisplay = $("#tiddlerDisplay");
	if ($(tiddlerDisplay).height() < (screen.height - offset)) {
		$(tiddlerDisplay).height(screen.height - offset);
	}

	var p = [{ style: "-tw-vertScroll", start: findScrollY(), end: endPoint }];

	return new Morpher(targetElement, config.animDuration, p);
};

})(jQuery);
//}}}
