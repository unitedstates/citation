// depends on underscore.js

if (typeof(_) === "undefined" && typeof(require) !== "undefined")
	_ = require("underscore");

(function() {
	Citation = {

		patterns: {
			usc: [
				
				// "5 U.S.C. 552"
				// "5 U.S.C. 552(a)(1)(E)"
				// "50 U.S.C. 404o-1(a)"
				[
					"(\\d+)\\s+U\\.?\\s?S\\.?\\s?C\\.?[\\s§]+(\\d+[\\w\\d\-]*)((?:\\([^\\)]+\\))*)", function(match) {
					return {
						title: match[1],
						section: match[2],
						subsections: _.compact(match[3].split(/[\(\)]/))
					}
				}],

				// "section 552 of title 5"
				// "section 552(a)(1)(E) of title 5"
				// "section 404o-1(a) of title 50"
				[
					"section (\\d+[\\w\\d\-]*)((?:\\([^\\)]+\\))*) (?:of|\\,) title (\\d+)", function(match) {
					return {
						title: match[3],
						section: match[1],
						subsections: _.compact(match[2].split(/[\(\)]/))
					}
				}]
			]
		},

		// returns an object with a display name and a slug
		standardize: {
			usc: function(data) {
				return {
				 	id: _.flatten([data.title, "usc", data.section, data.subsections]).join("_"),
				 	section_id: [data.title, "usc", data.section].join("_"),
					display: function(data) {
						var display = "" + data.title + " USC " + data.section;
						return display + _.map(data.subsections, function(s) {return "(" + s + ")"}).join("");
					}(data)
				}
			}
		},

		// check a block of text for citations of a given type (defaults to USC),
		// return an array of matches, with citation broken out into fields
		find: function(text, options) {
			if (!options) options = {};

			// default to US Code
			var type = options.type || "usc";

			// default to no surrounding context
			var context = options.context || 0;

			// run through every pattern for the citation type, return a list of matches
			return _.compact(_.flatten(_.map(Citation.patterns[type], function(pattern) {

				
				var regex;
				if (context > 0)
					regex = ".{0," + context + "}(" + pattern[0] + ").{0," + context + "}";
				else
					regex = pattern[0];

				// dup the pattern because we'll be making use of its internal counter
				regex = new RegExp(regex, "ig");
				var processor = pattern[1];

				// execute the regex repeatedly on the string to get grouped results for each match
				var match, results = [];
				while (match = regex.exec(text)) {
					var result = {type: type};

					if (context > 0)
						result.context = match.shift();

					result.match = match[0];

					// pull out each matched group, put them in a subobject by name
					result[type] = processor(match);

					_.extend(result[type], Citation.standardize[type](result[type]));

					results.push(result);
				}

				return results;
			})));
		}
	}

	if (typeof(window) !== "undefined")
		window.Citation = Citation;

	if (typeof(module) !== "undefined" && module.exports)
		module.exports = Citation;
})();