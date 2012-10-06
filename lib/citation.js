/* Citation.js, v0.1.1
 *
 * Library for extracting legal citations from text.
 *
 * Open source, MIT license: https://github.com/sunlightlabs/citation
 * Authored by Eric Mill, at the Sunlight Foundation
 */

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
						subsections: _.compact(match[3].split(/[\(\)]+/))
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
					sections = [];
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
					id: _.flatten([data.type, "law", data.congress, data.number, data.sections]).join("_")
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
						var result = {type: type};

						result.match = match[0];
						result.index = match.index;

						// use index to grab surrounding context
						if (context > 0) {
							var index = result.index;

							var proposedLeft = index - context;
							var left = proposedLeft > 0 ? proposedLeft : 0;

							var proposedRight = index + match[0].length + context;
							var right = (proposedRight <= text.length) ? proposedRight : (text.length - 1);

							result.context = text.substring(left, right);
						}

						// pull out each matched group, put them in a subobject by name
						result[type] = processor(match);

						_.extend(result[type], Citation.standardize[type](result[type]));

						results.push(result);
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