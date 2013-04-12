/* Citation.js
 *
 * Library for extracting legal citations from text.
 *
 * Open source, public domain license: https://github.com/unitedstates/citation
 * Originally authored by Eric Mill, at the Sunlight Foundation
 */

if (typeof(_) === "undefined" && typeof(require) !== "undefined") {
  _ = require("underscore");
  XRegExp = require('xregexp').XRegExp;
}

(function() {
  Citation = {

    // will be filled in by individual citation types
    types: {},

    // check a block of text for citations of a given type -
    // return an array of matches, with citation broken out into fields
    find: function(text, options) {
      if (!options) options = {};

      // default: no excerpt
      var excerpt = options.excerpt ? parseInt(options.excerpt) : 0;

      // whether to return parent citations
      // default: false
      var parents = options.parents || false;

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

      // caller can provide optional context that can change what patterns individual citators apply
      var context = options.context || {};


      // caller can provide a replace callback to alter every found citation.
      // this function will be called with each (found and processed) cite object,
      // and should return a string to be put in the cite's place.
      //
      // the resulting transformed string will be in the returned object as a 'text' field.
      // this field will only be present if a replace callback was provided.
      // 
      // providing this callback will also cause matched cites not to return the 'index' field,
      // as the replace process will completely screw them up. only use the 'index' field if you
      // plan on doing your own replacing.

      var replace = options.replace;
      if (typeof(replace) !== "function") replace = null;
      

      // whether we'll return it or not, track replaced text along the way
      var replaced = text;



      // run through every pattern, accumulate matches
      var results = _.map(types, function(type) {
        
        var patterns = Citation.types[type].patterns;

        // individual parsers can opt to make their parsing context-specific
        if (typeof(patterns) == "function")
          patterns = patterns(context);

        return _.map(patterns, function(pattern) {
        
          var regex = new XRegExp(pattern.regex, "ig");
          var processor = pattern.processor;

          // execute the regex repeatedly on the string to get grouped results for each match
          var match, results = [];

          replaced = replaced.replace(regex, function() {

            // details of the regex match:
            // common to all citations pulled from the match
            var matchInfo = {type: type};


            // see the confusing way that replace callbacks arrange arguments here:
            // https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/String/replace#Specifying_a_function_as_a_parameter

            matchInfo.match = arguments[0]; // matched text is first argument
            matchInfo.index = arguments[arguments.length - 2]; // offset is second-to-last argument

            // pull out just the regex-captured matches (will come between first argument and second-to-last argument)
            var captures = Array.prototype.slice.call(arguments, 1, -2);

            // use index to grab surrounding excerpt
            if (excerpt > 0) {
              var index = matchInfo.index;

              var proposedLeft = index - excerpt;
              var left = proposedLeft > 0 ? proposedLeft : 0;

              var proposedRight = index + matchInfo.match.length + excerpt;
              var right = (proposedRight <= text.length) ? proposedRight : text.length;

              matchInfo.excerpt = text.substring(left, right);
            }

            // one match can generate one or many citation results (e.g. ranges)
            cites = processor(captures);
            if (!_.isArray(cites)) cites = [cites];

            // if we want parent cites too, make those now
            if (parents && Citation.types[type].parents_by) {
              cites = _.flatten(_.map(cites, function(cite) {
                return Citation.citeParents(cite, type);
              }));
            }

            _.each(cites, function(cite) {
              var result = {};

              // match-level info
              _.extend(result, matchInfo) 

              // cite-level info, plus ID standardization
              result[type] = cite;
              _.extend(result[type], Citation.types[type].standardize(result[type]));

              results.push(result);
            });

            // return nothing - not supporting replacement
          });

          return results;
        });
      });

      // flatten it all and remove nulls
      results = _.compact(_.flatten(results));

      var output = {
        citations: results
      };

      if (replace) output.text = replaced;

      return output;
    },

    // for a given set of cite-specific details, 
    // return itself and its parent citations
    citeParents: function(citation, type) {
      var field = Citation.types[type].parents_by;
      var results = [];

      for (var i=citation[field].length; i >= 0; i--) {
        var parent = _.clone(citation);
        parent[field] = parent[field].slice(0, i);
        results.push(parent);
      }
      return results;
    }
  }


  // TODO: load only the citation types asked for
  if (typeof(require) !== "undefined") {
    require("./citations/usc");
    require("./citations/law");
    require("./citations/cfr");
    require("./citations/va_code");
    require("./citations/dc_code");
  }
  

  if (typeof(window) !== "undefined")
    window.Citation = Citation;

  if (typeof(module) !== "undefined" && module.exports)
    module.exports = Citation;
})();