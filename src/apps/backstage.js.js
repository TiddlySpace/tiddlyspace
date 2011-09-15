/***
Adds the app switcher to a TiddlySpace app.
***/
(function() {

function addEventListener(node, event, handler) {
	if (node.addEventListener){  
		node.addEventListener(event, handler, false);   
	} else if (node.attachEvent){  
		event = event == "click" ? "onclick" : event;
		event = event == "load" ? "onload" : event;
		node.attachEvent(event, handler);  
	}
};

var loadEvent = function() {
	var link = document.createElement("a");
	link.setAttribute("id", "app-picker");
	link.setAttribute("class", "app-picker");
	link.appendChild(document.createTextNode("tiddlyspace"));

	var body = document.getElementsByTagName("BODY")[0];
	body.appendChild(link);
	var html = [
	'<div class="bubble">',
	    '<iframe src="/bags/common/tiddlers/backstage" width="auto" style="border:none;"></iframe>',
	    '<div class="tail"></div>',
	'</div>'].join("");
	var bubble = document.createElement("div");
	bubble.setAttribute("id", "bs-popup");
	bubble.setAttribute("style", "display:none;");
	bubble.setAttribute("class", "bs-popup");
	bubble.innerHTML = html;
	body.appendChild(bubble);

	// TODO: adding a stylesheet in this manner does not work on older browsers
	var head = document.getElementsByTagName("HEAD")[0];
	var el = document.createElement("link");
	el.setAttribute("rel", "stylesheet");
	el.setAttribute("href", "/bags/common/tiddlers/backstage.css");
	el.setAttribute("type", "text/css");
	head.appendChild(el);

	var bubbleFadeInterval;
	function fade(el, fadeIn) {
		var opacity = fadeIn ? 0 : 1;
		if(bubbleFadeInterval) {
			clearInterval(bubbleFadeInterval);
		}
		bubbleFadeInterval = setInterval(function() {
			// TODO: IE does not support opacity
			el.style.cssText = "opacity:" + opacity;
			opacity = fadeIn ? opacity + 0.1 : opacity - 0.1;
			if(opacity < 0 || opacity > 1) {
				clearInterval(bubbleFadeInterval);
				el.style.cssText = fadeIn ? "" : "display:none";
			}
		}, 50);
	}

	addEventListener(link, "mousedown", function(ev) {
		ev.preventDefault();
	}, false);

	var bubbleOpen = false;
	var toggleBubble = function(ev) {
		if(ev.stopPropagation) {
			ev.stopPropagation();
		} else {
			ev.cancelBubble = false;
		}
		if(bubbleOpen) {
			fade(bubble, false);
		} else {
			fade(bubble, true);
		};
		bubbleOpen = !bubbleOpen;
	}

	addEventListener(link, "click", toggleBubble);

	addEventListener(window, "click",
		function(ev) {
			if(bubbleOpen) {
				toggleBubble(ev);
			}
		}, false);

	addEventListener(bubble, "click", function(ev) {
		if(ev.stopPropagation) {
			ev.stopPropagation();
		} else {
			ev.cancelBubble = false;
		}
	});
};
// TODO: support ie < 9
if(window.addEventListener) {
addEventListener(window, "load", loadEvent);
}
})();
