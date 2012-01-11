/***
|''Name''|TiddlySpaceRevisionView|
|''Description''|Show tiddler revisions in a stack of cards view|
|''Author''|BenGillies|
|''Version''|0.2.0|
|''Status''|beta|
|''Source''|http://github.com/TiddlySpace/tiddlyspace|
|''CodeRepository''|http://github.com/TiddlySpace/tiddlyspace|
|''License''|[[BSD|http://www.opensource.org/licenses/bsd-license.php]]|
|''CoreVersion''|2.6.0|
|''Requires''|TiddlyWebAdaptor|
!Usage
The viewRevisions macro can be attached to any element, which should be passed
in as a parameter.

For example:

&lt;&lt;viewRevisions page:10 link:"<<view modified date>>"&gt;&gt;

would show the revisions "stack of cards" view, 10 at a time, when the modified
date is clicked.
!Code
***/
//{{{
(function($) {

var me = config.macros.viewRevisions = {
	revisionTemplate: "RevisionTemplate",
	revSuffix: " [rev. #%0]", // text to append to each tiddler title
	defaultPageSize: 5, // default number of revisions to show
	defaultLinkText: "View Revisions", // when there's nothing else to use
	offsetTop: 30, // in px
	offsetLeft: 10, // in px
	shiftDownDelay: 50, // in ms
	visibleSlideAmount: 20, // amount of revisions to show on left hand edge after sliding
	zIndex: 100, // default z-index
	handler: function(place, macroName, params, wikifier, paramString, tiddler) {
		params = paramString.parseParams(null, null, true)[0];
		var tiddlerElem = story.findContainingTiddler(place);

		var revButton;
		var pageSize = parseInt(params.page[0], 10) || me.defaultPageSize;
		var linkObj = params.link ? params.link[0] || me.defaultLinkText : false;
		if(linkObj) {
			 revButton = $('<span class="button openRevisions" />')
				.appendTo(place);
			wikify(linkObj, revButton[0], null, tiddler);
		} else {
			revButton = place;
		}

		$(revButton).click(function() {
			if (!$(tiddlerElem).hasClass("revisions")) {
				me.showRevisions(tiddlerElem, tiddler, pageSize);
			} else {
				me.closeRevisions(tiddlerElem);
			}
		});
	},

	// initialisation for revision view
	showRevisions: function(tiddlerElem, tiddler, pageSize) {
		var context = {
			host: tiddler.fields["server.host"],
			workspace: tiddler.fields["server.workspace"]
		};
		$(tiddlerElem).addClass("revisions").attr("revName", tiddler.title);
		// ensure toolbar commands deactivate RevisionsView
		$("a", ".toolbar", tiddlerElem).each(function(index, btn) {
			var _onclick = btn.onclick;
			btn.onclick = function(e) {
				me.closeRevisions(tiddlerElem);
				_onclick.apply(this, arguments);
			};
		});
		// ensure default action deactivates RevisionsView
		var _ondblclick = tiddlerElem.ondblclick;
		tiddlerElem.ondblclick = function(e) {
			me.closeRevisions(tiddlerElem);
			_ondblclick.apply(this, arguments);
		};
		var type = tiddler.fields["server.type"];
		var adaptor = new config.adaptors[type]();
		var userParams = {
			tiddlerElem: tiddlerElem,
			pageSize: pageSize,
			title: tiddler.title
		};
		me.createCloak(tiddlerElem);
		adaptor.getTiddlerRevisionList(tiddler.title, null, context, userParams,
				function(context, userParams) {
					// strip the current revision
					context.revisions.shift();
					me.expandStack(context, userParams);
				});
	},

	// fetch the actual revision and put it in the tiddler div
	showRevision: function(place, revision, callback) {
		var context = {
			host: revision.fields["server.host"],
			workspace: revision.fields["server.workspace"]
		};
		var userParams = {
			revElem: place
		};
		var type = revision.fields["server.type"];
		var adaptor = new config.adaptors[type]();
		var revNo = revision.fields["server.page.revision"];
		adaptor.getTiddlerRevision(revision.title, revNo, context, userParams,
			function(context, userParams) {
				var tiddler = context.tiddler;
				tiddler.title += me.revSuffix
					.format([$(place).attr("revision")]);
				tiddler.fields.doNotSave = true;
				if (store.getTiddler(tiddler.title)) {
					store.deleteTiddler(tiddler.title);
				}
				store.addTiddler(tiddler);

				//now, populate the existing div
				var revElem = userParams.revElem;
				$(revElem).attr("id", story.tiddlerId(tiddler.title));
				$(revElem).attr("refresh", "tiddler");
				var getTemplate = function() {
					var themeName = config.options.txtTheme;
					if (themeName) {
						return store.getTiddlerSlice(themeName,
							me.revisionTemplate) || me.revisionTemplate ||
							"ViewTemplate";
					} else {
						return (store.getTiddler(me.revisionTemplate)) ?
							me.revisionTemplate : "ViewTemplate";
					}
				};
				var template = getTemplate();
				story.refreshTiddler(tiddler.title, template, true);
				callback(tiddler);
			});
	},

	createCloak: function(promoteElem) {
		var el = $(promoteElem);
		// cache styles for resetting later
		el.data({
			top: el.css("top"),
			left: el.css("left"),
			zIndex: el.css("z-index")
		});

		$('<div class="revisionCloak" />').css("z-index", me.zIndex)
			.click(function() {
				me.closeRevisions(promoteElem);
			})
			.appendTo(document.body);

		el.css("z-index", me.zIndex + 1);
	},

	// clean up, removing all evidence of revision view
	closeRevisions: function(promoteElem) {
		var el = $(promoteElem);
		// revert the original tiddler back to its previous state
		el.removeAttr("revName").removeClass("revisions").css({
			top: el.data("top"),
			left: el.data("left"),
			zIndex: el.data("zIndex")
		});

		// remove any revisions still in the store
		var revisions = $(".revisions");
		revisions.each(function(index, revision) {
			var revAttributes = revision.attributes;
			if ((revAttributes.revname) &&
					(revAttributes.revision)) {
				var revName = revAttributes.revname.value;
				var revNo = revAttributes.revision.value;
				var title = revName + me.revSuffix.format([revNo]);

				if (store.getTiddler(title)) {
					store.deleteTiddler(title);
				}
			}
		});

		// delete the previous revisions
		revisions.remove();

		// remove the cloak
		$(".revisionCloak").remove();
	},

	// calback from getting list of revisions
	expandStack: function(context, userParams) {
		var pageSize = userParams.pageSize;

		var from = userParams.from || 0;
		var tiddlerElem = userParams.tiddlerElem;

		userParams.defaultHeight = $(tiddlerElem).height();
		userParams.defaultWidth = $(tiddlerElem).width();
		if (from < context.revisions.length) {
			me.displayNextRevision(tiddlerElem, userParams, context, from,
				from + pageSize - 1);
		}
	},

	// place the next div above and behind the previous one
	displayNextRevision: function(tiddlerElem, userParams, context, from, to) {
		var revision = context.revisions[from];
		var callback = function() {
			var revText = revBtn.getRevisionText(tiddlerElem, revision);
			tiddlerElem = me.createRevisionObject(tiddlerElem, context,
				userParams, revText);
			$(tiddlerElem)
				.attr("revision", (context.revisions.length - from));
			if ((from < to) && ((from + 1) < context.revisions.length)){
				me.displayNextRevision(tiddlerElem, userParams, context,
					from + 1, to);
			} else if ((context.revisions.length - 1) > to) {
				me.showMoreButton(tiddlerElem, context, userParams, to + 1);
			}
		}
		me.shiftVisibleDown(userParams.title, callback);
	},

	createRevisionObject: function(tiddlerElem, context, userParams, text) {
		var newPosition = me.calculatePosition(tiddlerElem, context);
		return $('<div class="revisions tiddler" />')
			.css({
				position: "absolute",
				top: newPosition.top,
				left: newPosition.left,
				"z-index": me.zIndex + 1,
				height: userParams.defaultHeight,
				width: userParams.defaultWidth
			})
			.attr("revName", userParams.title)
			.append(text)
			.insertBefore(tiddlerElem);
	},

	// move the already present revisions down by 1 to fit the next one in
	shiftVisibleDown: function(title, callback) {
		var revisions = $("[revName='%0'].revisions".format([title]));
		var revisionCount = revisions.length;

		$(revisions).animate({top: "+=" + me.offsetTop},
				me.shiftDownDelay, function() {
					revisionCount -= 1;
					if ((callback) && (!revisionCount)) {
						callback();
					}
				});
	},

	// where we put the new revision
	calculatePosition: function(elem, context) {
		var offset = $(elem).offset();
		var currentPosition = $(elem).position();
		var newPosition = {
			top: currentPosition.top - me.offsetTop
		};
		if ((context.restrictLeft) ||
				((offset.left - me.offsetLeft) <
				$("#contentWrapper").offset().left)) {
			newPosition.left = $(elem).position().left;
			context.restrictLeft = true;
		} else {
			newPosition.left = currentPosition.left - me.offsetLeft;
		}
		return newPosition;
	},

	// equivalent of displayNextRevision, but for the more button
	showMoreButton: function(tiddlerElem, context, userParams, moreIndex) {
		userParams.from = moreIndex + 1;
		me.shiftVisibleDown(userParams.title, function() {
			var btn = me.createRevisionObject(tiddlerElem, context, userParams,
				"");

			var more = createTiddlyButton(btn[0], "more...", "show more revisions",
				function() {
					if ($(".viewRevision").length) {
						return;
					}
					userParams.tiddlerElem = btn[0];
					$(btn).text("")
						.append(revBtn
							.getRevisionText(btn[0], context.revisions[moreIndex]))
						.attr("revision", context.revisions.length - moreIndex);
					me.expandStack(context, userParams);
				});
			$(more).css("float", "right");
		});
	},

	stripRevFromTitle: function(revisionTitle) {
		return revisionTitle.split(/ ?\[rev\. #[0-9]+\]$/)[0];
	},

	onClickRevision: function(revElem, revision, callback) {
		// don't do anything if we are still loading
		if ($(".revisions").hasClass("loading")) {
			return null;
		}

		var origTitle = me.stripRevFromTitle(revision.title);
		if ($(revElem).hasClass("viewRevision")) {
			$(".revisions").addClass("loading");
			me.slideIn(revElem, revision, origTitle, function() {
				store.deleteTiddler(revision.title);
				revision.title = origTitle;
				$(revElem).text("").append(revBtn.getRevisionText(revElem,
						revision))
					.removeAttr("tags").removeAttr("tiddler")
					.removeAttr("refresh").removeAttr("template")
					.removeAttr("id");
				$(".revisions").removeClass("loading");
				if (callback) {
					callback();
				}
			});
			$(revElem).removeAttr("prevPos").removeClass("viewRevision");
		} else {
			var viewRevision = function() {
				var prevPos = $(revElem).position().left;
				$(revElem).addClass("viewRevision").attr("prevPos", prevPos);
				$(".revisions").addClass("loading");
				me.showRevision(revElem, revision, function(rev) {
					me.slideOut(revElem, rev, origTitle, function() {
						$(".revisions").removeClass("loading");
					});
				});
			};
			// make sure another revision isn't already out
			if ($(".viewRevision").length) {
				var newRevElem = $(".viewRevision")[0];
				var newRevision = store.getTiddler($(newRevElem)
					.attr("tiddler"));
				me.onClickRevision(newRevElem, newRevision, viewRevision);
			} else {
				viewRevision();
			}
		}
	},

	slideOut: function(revElem, revision, title, callback) {
		var leftMostPos = $("[revName='%0'].revisions".format([title]))
			.offset().left;
		var width = $(revElem).width();
		var originalLeftPos = $(story.getTiddler(title))
			.position().left;

		var slideAmount = leftMostPos + width - me.visibleSlideAmount;
		$("[revName='%0'].revisions:not(.viewRevision)".format([title]))
			.animate({left: "-=" + slideAmount}, 1000);
		$(revElem)
			.attr("baseHeight", $(revElem).css("height"))
			.css("height", "auto")
			.animate({left: originalLeftPos}, 1000, callback);
	},

	slideIn: function(revElem, revision, title, callback) {
		var slideAmount = $(revElem).offset().left -
			$(story.getTiddler(title)).offset().left;
		var origRevPos = $(revElem).attr("prevPos");

		$("[revName='%0'].revisions:not(.viewRevision)".format([title]))
			.animate({left: "+=" + slideAmount}, 1000);
		$(revElem).animate({left: origRevPos}, 1000, function() {
			$(revElem)
				.css("height", $(revElem).attr("baseHeight"))
				.removeAttr("baseHeight");
			callback();
		});
	}
};

var revBtn;
config.macros.slideRevision = revBtn = {
	btnText: "created by %0 at %1 on %2",
	handler: function(place, macroName, params, wikifier, paramString, tiddler) {
		var btn = revBtn.getRevisionText(place, tiddler);
		$(place).append(btn);
	},

	getRevisionText: function(place, revision) {
		var text = revBtn.btnText.format([revision.modifier,
			revision.modified.formatString("0hh:0mm"),
			revision.modified.formatString("0DD MMM YYYY")]);
		var btn = $('<a href="javascript:;" class="button revButton" />')
			.text(text)
			.click(function() {
				var revElem = story.findContainingTiddler(this);
				me.onClickRevision(revElem, revision);
			});
		return btn;
	}
};

})(jQuery);
//}}}
