// depends on underscore.js

Citation = {

	// starting examples - should handle
	// "5 U.S.C. 552" (with or without periods)
	// "section 552 of title 5"
	patterns: {
		usc: [
			[ /(\d+)\s+U\.?S\.?C\.?\s+(\d+)/i, "title", "section"],
			[ /section (\d+) (?:of|\,) title (\d+)/i, "section", "title"]
		]
	},

	// check a block of text for citations of a given type (defaults to USC),
	// return an array of matches, with citation broken out into fields
	find: function(text, type) {
		if (!type) type = "usc";

		// run through every pattern for the citation type, return a list of matches
		return _.compact(_.map(Citation.patterns[type], function(pattern) {
			var match = text.match(pattern[0]);

			if (match) {
				var results = {match: match[0], type: type};

				// pull out each matched group, put them in a subobject by name
				results[type] = {};
				_.each(_.rest(match), function(field, i) {
					results[type][pattern[i+1]] = match[i+1];
				});

				return results;
			}

		}));
	}
}