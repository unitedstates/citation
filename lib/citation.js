// depends on underscore.js

Citation = {

	// starting examples - should handle
	// "5 U.S.C. 552" (with or without periods)
	// "section 552 of title 5"
	patterns: {
		usc: [
			[ /(\d+)\s+U\.?S\.?C\.?\s+(\d+)/ig, "title", "section"],
			[ /section (\d+) (?:of|\,) title (\d+)/ig, "section", "title"]
		]
	},

	// check a block of text for citations of a given type (defaults to USC),
	// return an array of matches, with citation broken out into fields
	find: function(text, type) {
		if (!type) type = "usc";

		// run through every pattern for the citation type, return a list of matches
		return _.compact(_.flatten(_.map(Citation.patterns[type], function(pattern) {

			// dup the pattern because we'll be making use of its internal counter
			var regex = new RegExp(pattern[0]);

			// execute the regex repeatedly on the string to get grouped results for each match
			var match, results = [];
			while (match = regex.exec(text)) {
				var result = {match: match[0], type: type};

				// pull out each matched group, put them in a subobject by name
				result[type] = {};
				_.each(_.rest(match), function(field, i) {
					result[type][pattern[i+1]] = match[i+1];
				});

				results.push(result);
			}

			return results;
		})));
	}
}