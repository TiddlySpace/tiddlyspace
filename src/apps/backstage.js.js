/***
Adds the app switcher to a TiddlySpace app.

Makes use of tw.Stylesheet
Triple licensed under the BSD, MIT and GPL licenses:
  http://www.opensource.org/licenses/bsd-license.php
  http://www.opensource.org/licenses/mit-license.php
  http://www.gnu.org/licenses/gpl.html
***/
(function() {

// Add or replace a style sheet
// css argument is a string of CSS rule sets
// options.id is an optional name identifying the style sheet
// options.doc is an optional document reference
// N.B.: Uses DOM methods instead of jQuery to ensure cross-browser comaptibility.
var twStylesheet = function(css, options) {
	options = options || {};
	var id = options.id || "backstageStyleSheet";
	var doc = options.doc || document;
	var el = doc.getElementById(id);
	if(doc.createStyleSheet) { // IE-specific handling
		if(el) {
			el.parentNode.removeChild(el);
		}
		doc.getElementsByTagName("head")[0].insertAdjacentHTML("beforeEnd",
			'&nbsp;<style id="' + id + '" type="text/css">' + css + '</style>'); // fails without &nbsp;
	} else { // modern browsers
		if(el) {
			el.replaceChild(doc.createTextNode(css), el.firstChild);
		} else {
			el = doc.createElement("style");
			el.type = "text/css";
			el.id = id;
			el.appendChild(doc.createTextNode(css));
			doc.getElementsByTagName("head")[0].appendChild(el);
		}
	}
};

var stylesheet = ["iframe {",
"	height: 320px;",
"	z-index: 1000;",
"	position: relative;",
"}",
"",
"#app-picker {",
"	cursor: pointer;",
"	position: absolute;",
"	right: 24px;",
"	top: 0px;",
"	width: 24px;",
"	height: 24px;",
"	background-size: 24px 24px;",
"	background-image: url(/bags/common/tiddlers/backstageIcon.png);",
"	text-indent: -999px;",
"	overflow: hidden;",
"	z-index: 2000;",
"	border: none;",
"	opacity: 0.5;",
"}",
"",
"#app-picker:hover {",
"	background-color: none !important;",
"	opacity: 1;",
"}",
"",
".bs-popup {",
"	width: 100%;",
"	position: absolute;",
"	z-index: 1000;",
"	right: 10px;",
"	top: 52px;",
"}",
"",
".bubble .description {",
"	margin-left: 70px;",
"	margin-top: 2px;",
"}",
"",
".bubble {",
"	float: right;",
"	font-size: 0.9em;",
"	font-family: Georgia;",
"	position: relative;",
"	width: 300px;",
"	margin: 0px auto 0px auto;",
"	margin: top right bottom left;",
"	padding: 20px 20px 20px 10px;",
"	border: solid 2px rgb(255, 255, 255);",
"	border-radius: 8px 8px;",
"	-webkit-box-shadow: #F4C4E0 0px 0px 8px;",
"	-moz-box-shadow: #F4C4E0 0px 0px 8px;",
"	-o-box-shadow: #F4C4E0 0px 0px 8px;",
"	-ms-box-shadow: #F4C4E0 0px 0px 8px;",
"	box-shadow: #F4C4E0 0px 0px 8px;",
"	background-color: rgb(220, 231, 241);",
"}",
"",
".bubble .tail:before {",
"	content: \"\";",
"	position:absolute;",
"	border-style:solid;",
"	display:block; ",
"	width:0;",
"	top:-24px;",
"	right:5px;",
"	bottom:auto;",
"	left:auto;",
"	opacity: 0.5;",
"	border-width:0 20px 20px;",
"	border-color: rgba(244, 196, 224, 0.6) transparent;",
"}",
"",
".bubble .tail:after {",
"	content:\"\";",
"	position:absolute;",
"	border-style:solid;",
"	display:block; ",
"	width:0;",
"	top:-15px;",
"	right:10px;",
"	bottom:auto;",
"	left:auto;",
"	border-width:0 15px 15px;",
"	border-color: #DCE7F1 transparent;",
"}",
".ts-logout {",
"	display: none;",
"}",
".ts-loggedin .ts-logout {",
"	display: block;",
"}"
].join("\n");
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
	body.insertBefore(link, body.firstChild);
	var html = [
	'<div class="bubble">',
	    '<iframe src="/bags/common/tiddlers/backstage#userpass-login" width="auto" style="border:none;"></iframe>',
	    '<div class="tail"></div>',
	'</div>'].join("");
	var bubble = document.createElement("div");
	bubble.setAttribute("id", "bs-popup");
	bubble.style.cssText = "visibility:hidden;";
	bubble.className = "bs-popup";
	bubble.innerHTML = html;
	body.insertBefore(bubble, link);

	twStylesheet(stylesheet);

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
				el.style.cssText = fadeIn ? "" : "visibility:hidden;";
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

if(window.top == window) { // only add the backstage when NOT in an iframe (top window)
	addEventListener(window, "load", loadEvent);
}

})();
