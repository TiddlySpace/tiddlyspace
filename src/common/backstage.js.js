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

// detect background-size support
// in <IE9 need to fallback to msfilter property
function hasBgSizing() {
	var supported,
		elem = document.createElement('div');

	document.body.appendChild(elem);
	elem.style.cssText = "background-size: cover;";
	supported = (elem.style.backgroundSize === undefined || elem.style.backgroundSize === null) ? false : true;
	// clean up
	elem.parentNode.removeChild(elem);
	return supported;
}

// ms filters as fix for not supporting background-size property
var msfilter_in = "progid:DXImageTransform.Microsoft.AlphaImageLoader(src='/bags/tiddlyspace/tiddlers/privateAndPublicIcon', sizingMethod='scale')",
	msfilter_out = "progid:DXImageTransform.Microsoft.AlphaImageLoader(src='/bags/tiddlyspace/tiddlers/publicIcon', sizingMethod='scale')";

var stylesheet = ["#tsbackstage {",
"	height: 256px; /* default value unless changed */",
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
"	top: 36px;",
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
"	border: solid 1px rgb(200, 200, 200);",
"	border-radius: 4px;",
"	-webkit-box-shadow: 0px 0px 4px rgba(0,0,0,.2);",
"	-moz-box-shadow: 0px 0px 4px rgba(0,0,0,.2);",
"	-o-box-shadow: 0px 0px 4px rgba(0,0,0,.2);",
"	-ms-box-shadow: 0px 0px 4px rgba(0,0,0,.2);",
"	box-shadow: 0px 0px 4px rgba(0,0,0,.2);",
"	background-color: #F0F4F8;",
"}",
"",
".ts-logout {",
"	display: none;",
"}",
".ts-loggedin .ts-logout {",
"	display: block;",
"}",
".arrow {",
"	border-width: 0 10px 10px;",
"	border-style: dashed dashed solid;",
"	width: 0;",
"	height: 0;",
"	border-color: transparent;",
"	display: inline-block;",
"	position: absolute;",
"	top: -10px;",
"	right: 16px;",
"	border-bottom-color: #fff;",
"}",
".bubble div.whitearrow {",
"	top: -11px;",
"	border-bottom-color: rgba(0,0,0,0.25);",
"}"
].join("\n");

function addEventListener(node, event, handler, bubble) {
	if (node.addEventListener){  
		node.addEventListener(event, handler, bubble);   
	} else if (node.attachEvent){  
		event = event == "click" ? "onclick" : event;
		event = event == "load" ? "onload" : event;
		node.attachEvent(event, handler);
	}
}

var loadEvent = function() {
	var link = document.createElement("a");
	link.setAttribute("id", "app-picker");
	link.setAttribute("class", "app-picker");
	link.setAttribute("title", "Click to navigate around tiddlyspace");
	link.appendChild(document.createTextNode("tiddlyspace"));
	var backgroundSizeSupported = hasBgSizing();

        // Quite a hack. GUEST does not have a csrf token.
        if (/csrf_token=\d+:\w+:\w+/.test(document.cookie)) {
			if( backgroundSizeSupported ) {
				link.style.backgroundImage = 'url(/bags/tiddlyspace/tiddlers/privateAndPublicIcon)';
			} else {
				link.style.filter = msfilter_in;
			}
        } else {
			if( backgroundSizeSupported ) {
				link.style.backgroundImage = 'url(/bags/tiddlyspace/tiddlers/publicIcon)';
			} else {
				link.style.filter = msfilter_out;
			}
			stylesheet = stylesheet.replace('height: 180px;', 'height: 156px;');
        }

	var body = document.getElementsByTagName("BODY")[0];
	body.insertBefore(link, body.firstChild);
	var html = [
	'<div class="bubble">',
		'<iframe src="/bags/common/tiddlers/backstage#userpass-login" name="tsbackstage" id="tsbackstage" width="auto" frameborder=0 border=0></iframe>',
		'<div class="arrow whitearrow"></div>',
		'<div class="arrow"></div>',
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
		}, 25);
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
		}
		bubbleOpen = !bubbleOpen;
	};

	addEventListener(link, "click", toggleBubble);

	addEventListener(window.document.body, "click",
		function(ev) {
			var targ,
			ev = ev || window.event;

			if (ev.target) targ = ev.target;
			else if (ev.srcElement) targ = ev.srcElement;
			if(targ == link) {
				return;
			}
			if(bubbleOpen) {
				toggleBubble(ev);
			}
		}, true);

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
	// check if postMessage is supported
	// best test: https://github.com/ternarylabs/porthole/pull/10
	if(!!window.postMessage) {
		addEventListener(window, "message", function(e) {
			var iframe = document.getElementById('tsbackstage');
			if(e.data) {
				iframe.style.height = e.data + "px";
			}
		});
	}
}

})();
