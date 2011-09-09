/***
Adds the app switcher to a TiddlySpace app.
***/
(function() {

window.addEventListener("load", function() {
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
			el.style.cssText = "opacity:" + opacity;
			opacity = fadeIn ? opacity + 0.1 : opacity - 0.1;
			if(opacity < 0 || opacity > 1) {
				clearInterval(bubbleFadeInterval);
				el.style.cssText = fadeIn ? "" : "display:none";
			}
		}, 50);
	}

	link.addEventListener("mousedown", function(ev) {
		ev.preventDefault();
	}, false);

	var bubbleOpen = false;
	link.addEventListener("click", function(ev) {
		if(bubbleOpen) {
			fade(bubble, false);
		} else {
			fade(bubble, true);
		}
		bubbleOpen = !bubbleOpen;
	}, false);
}, false);
})();
