/* Citation.js
 *
 * Library for extracting legal citations from text.
 *
 * Open source, public domain license: https://github.com/unitedstates/citation
 * Originally authored by Eric Mill, at the Sunlight Foundation
 */

if (typeof(_) === "undefined" && typeof(require) !== "undefined")
	_ = require("underscore");

(function() {
	Citation = {

		// will be filled in by individual citation types
		types: {},

		// check a block of text for citations of a given type -
		// return an array of matches, with citation broken out into fields
		find: function(text, options) {
			if (!options) options = {};

			// default: all types, no excerpt
			var types = options.type ? [options.type] : _.keys(Citation.types);
			var context = options.context || 0;

			// run through every pattern, accumulate matches
			var results = _.map(types, function(type) {
				return _.map(Citation.types[type].patterns, function(pattern) {
				
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

						// one match can generate one or many citation results (e.g. ranges)
						cites = processor(match);
						if (!_.isArray(cites)) cites = [cites];

						_.each(cites, function(cite) {
							var result = {};

							// match-level info
							_.extend(result, matchInfo) 

							// cite-level info, plus ID standardization
							result[type] = cite;
							_.extend(result[type], Citation.types[type].standardize(result[type]));

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


	if (typeof(require) !== "undefined") {
		require("./citations/usc");
		require("./citations/law");
	}
	

	if (typeof(window) !== "undefined")
		window.Citation = Citation;

	if (typeof(module) !== "undefined" && module.exports)
		module.exports = Citation;
})();