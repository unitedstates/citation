/* Citation.js
 *
 * Library for extracting legal citations from text.
 *
 * Open source, public domain license: https://github.com/unitedstates/citation
 * Originally authored by Eric Mill, at the Sunlight Foundation
 */

// depends on underscore.js

if (typeof(_) === "undefined" && typeof(require) !== "undefined")
	_ = require("underscore");

(function() {
	Citation = {

		patterns: {
			usc: [
				
				// "5 U.S.C. 552"
				// "5 U.S.C. § 552(a)(1)(E)"
				// "50 U.S.C. 404o-1(a)" - single section
				// "7 U.S.C. 612c note"
				// "50 U.S.C. App. 595"
				// "45 U.S.C. 10a(1)-10c(2)" - range
				[
					"(\\d+)\\s+" +
					"U\\.?\\s?S\\.?\\s?C\\.?" +
					"(?:\\s+(App)\.?)?" +
					"(?:\\s+(§+))?" +
					"\\s+((?:\\d+[\\w\\d\\-]*(?:\\([^\\)]+\\))*\\-?)*)" +
					"(?:\\s+(note))?",
					function(match) {
						// a few titles have distinct appendixes
						var title = match[1];
						if (match[2]) title += "-app";

						var sections = match[4].split("-");

						var range = false;
						if (match[3] == "§§") // 2 section symbols
							range = true;
						else {
							var dash = match[4].indexOf("-");
							var paren = match[4].indexOf("(");
							if (dash > 0 && paren > 0 && paren < dash) // paren before dash
								range = true;
						}

						// if there's a hyphen and the range is ambiguous, 
						// also return the original section string as one
						if ((sections.length > 1) && !range) 
							sections.unshift(match[4]);

						return _.map(sections, function(section) {
							// separate subsections for each section being considered
							var split = _.compact(section.split(/[\(\)]+/));
							section = split[0];
							subsections = split.splice(1);
							if (match[5]) subsections.push(match[5]); // "note"

							return {
								title: title,
								section: section,
								subsections: subsections
							}
						});
					}
				],

				// "section 552 of title 5"
				// "section 552(a)(1)(E) of title 5"
				// "section 404o-1(a) of title 50"
				[
					"section (\\d+[\\w\\d\-]*)((?:\\([^\\)]+\\))*)(?:\\s+of|\\,) title (\\d+)", function(match) {
					return {
						title: match[3],
						section: match[1],
						subsections: _.compact(match[2].split(/[\(\)]+/))
					}
				}]
			],

			law: [
				// "Public Law 111-89"
				// "Pub. L. 112-56"
				// "Pub. L. No. 110-2"
				// "Private Law 111-72"
				// "Priv. L. No. 98-23"
				// "section 552 of Public Law 111-89"
				// "section 4402(e)(1) of Public Law 110-2"
				[
					"(?:section (\\d+[\\w\\d\-]*)((?:\\([^\\)]+\\))*) of )?(pub(?:lic)?|priv(?:ate)?)\\.? +l(?:aw)?\\.?(?: +No\\.?)? +(\\d+)[-–](\\d+)", function(match) {
					var sections = [];
					if (match[1]) sections.push(match[1]);
					if (match[2]) sections = sections.concat(_.compact(match[2].split(/[\(\)]+/)));

					return {
						type: match[3].match(/^priv/i) ? "private" : "public",
						congress: match[4],
						number: match[5],
						sections: sections
					}
				}],

				// "PL 19-4"
				// "P.L. 45-78"
				// "section 552 of PL 19-4"
				// "section 4402(e)(1) of PL 19-4"
				[
					"(?:section (\\d+[\\w\\d\-]*)((?:\\([^\\)]+\\))*) of )?P\\.?L\\.? +(\\d+)[-–](\\d+)", function(match) {
					sections = [];
					if (match[1]) sections.push(match[1]);
					if (match[2]) sections = sections.concat(_.compact(match[2].split(/[\(\)]+/)));

					return {
						type: "public",
						congress: match[3],
						number: match[4],
						sections: sections
					}
				}]
			]
		},

		// returns an object with a slug and any other relevant fields
		standardize: {
			usc: function(data) {
				return {
				 	id: _.flatten([data.title, "usc", data.section, data.subsections]).join("_"),
				 	section_id: [data.title, "usc", data.section].join("_")
				}
			},

			law: function(data) {
				return {
					id: _.flatten([data.type, "law", data.congress, data.number, data.sections]).join("_"),
					law_id: [data.type, "law", data.congress, data.number].join("_")
				}
			}
		},

		// check a block of text for citations of a given type (defaults to USC),
		// return an array of matches, with citation broken out into fields
		find: function(text, options) {
			if (!options) options = {};

			// default to all types
			var types = options.type ? [options.type] : _.keys(Citation.patterns);

			// default to no surrounding context
			var context = options.context || 0;

			// run through every pattern for the citation type, return a list of lists of lists of matches
			var results = _.map(types, function(type) {
				return _.map(Citation.patterns[type], function(pattern) {
				
					var regex = new RegExp(pattern[0], "ig");
					var processor = pattern[1];

					// execute the regex repeatedly on the string to get grouped results for each match
					var match, results = [];
					while (match = regex.exec(text)) {

						// details of the regex match:
						// common to all citations pulled from the match
						var matchInfo = {type: type};

						matchInfo.match = match[0];
						matchInfo.index = match.index;

						// use index to grab surrounding context
						if (context > 0) {
							var index = matchInfo.index;

							var proposedLeft = index - context;
							var left = proposedLeft > 0 ? proposedLeft : 0;

							var proposedRight = index + match[0].length + context;
							var right = (proposedRight <= text.length) ? proposedRight : (text.length - 1);

							matchInfo.context = text.substring(left, right);
						}

						// one match can generate many citation results (e.g. ranges)
						cites = processor(match);
						if (!_.isArray(cites))
							cites = [cites];

						_.each(cites, function(cite) {
							var result = {};

							// regex match-level info
							_.extend(result, matchInfo) 

							// cite-level info
							result[type] = cite;
							_.extend(result[type], Citation.standardize[type](result[type]));

							results.push(result);
						});
					}

					return results;
				});
			});

			// flatten it all and remove nulls
			return _.compact(_.flatten(results));
		}
	}

	if (typeof(window) !== "undefined")
		window.Citation = Citation;

	if (typeof(module) !== "undefined" && module.exports)
		module.exports = Citation;
})();