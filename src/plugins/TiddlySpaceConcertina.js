/***
|''Name''|TiddlySpaceConcertinaPlugin|
|''Version''|0.2.0|
|''Status''|@@beta@@|
|''Author''|Jon Robson|
|''Description''|Provides an interface for macros to register interactions with the concertina|
|''Requires''|TiddlySpaceConfig|
!Notes
!Code
***/
//{{{
(function($) {
var macro = config.macros.concertina = {
	_activeMacroClasses: [],
	handler: function(place) {
		$("<div />").addClass("concertina").appendTo(place);
	},
	register: function(place, macroName, buttonClass, append) {
		/*
			macroName: the macro name of the tiddler that is making use of the concertina
			buttonClass: the class(es) to add to the button
			append: an element which the concertina should show when clicked
		*/
		macro._activeMacroClasses.pushUnique("openedBy_%0".format([macroName]));
		var options = {
			buttonClass: buttonClass,
			macro: macroName || "macro_%0".format([Math.random()]),
			append: append
		};
		return macro._createConcertinaButton(place, options);
	},
	_createConcertinaButton: function(place, options) {
		var openerMacro = options.macro;
		var concertinaButton = $("<div />").addClass("concertinaLink").
			addClass(options.buttonClass).
			click(function(ev) {
				var tidEl = $(story.findContainingTiddler(place));
				var concertina = $(".concertina", tidEl).empty().
					append(options.append);

				if(concertina.attr("openedby") == openerMacro) {
					tidEl.removeClass("concertinaOn");
					concertina.removeClass(macro._activeMacroClasses.join(" "))
						.slideUp(500).attr("openedby", "");
				} else {
					tidEl.addClass("concertinaOn");
					concertina.removeClass(macro._activeMacroClasses.join(" ")).
						addClass("openedBy_%0".format([openerMacro]));
					concertina.slideDown(500).
						attr("openedby", openerMacro);
				}
			}).appendTo(place);
			return concertinaButton[0];
	}
};

})(jQuery);