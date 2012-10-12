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

      // default: no excerpt
      var excerpt = options.excerpt || 0;

      // default: all types, can be filtered to one, or an array of them
      var types;
      if (options.types) {
        if (_.isArray(options.types)) {
          if (options.types.length > 0)
            types = options.types;
        } else
          types = [options.types]
      }

      // only allow valid types
      if (types)
        types = _.intersection(types, _.keys(Citation.types))
      else
        types = _.keys(Citation.types)
      

      // run through every pattern, accumulate matches
      var results = _.map(types, function(type) {
        return _.map(Citation.types[type].patterns, function(pattern) {
        
          var regex = new RegExp(pattern.regex, "ig");
          var processor = pattern.processor;

          // execute the regex repeatedly on the string to get grouped results for each match
          var match, results = [];
          while (match = regex.exec(text)) {

            // details of the regex match:
            // common to all citations pulled from the match
            var matchInfo = {type: type};

            matchInfo.match = match[0];
            matchInfo.index = match.index;

            // use index to grab surrounding excerpt
            if (excerpt > 0) {
              var index = matchInfo.index;

              var proposedLeft = index - excerpt;
              var left = proposedLeft > 0 ? proposedLeft : 0;

              var proposedRight = index + match[0].length + excerpt;
              var right = (proposedRight <= text.length) ? proposedRight : text.length;

              matchInfo.excerpt = text.substring(left, right);
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