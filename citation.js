/* Citation.js - a legal citation extractor.
 *
 * Open source, dedicated to the public domain: https://github.com/unitedstates/citation
 *
 * Originally authored by Eric Mill (@konklone), at the Sunlight Foundation,
 * many contributions by https://github.com/unitedstates/citation/graphs/contributors
 */


/*
 TODO: move this out of the namespace, see #56
 * rework how citators load Citation
 * replace _.contains with indexOf (?)
 * replace _.omit with ?
 * replace _.extend with Object.extend ?
 * replace _.find with ?
 * replace _.flatten with ?
 * replace _.compact with filter (null || undefined)
 * replace _.intersection with ?
 * replace _.isArray with ?
 * move XRegExp into the closure
*/

if (typeof(require) !== "undefined") {
  underscore = require("underscore");
  XRegExp = require('xregexp').XRegExp;
}


(function(Citation) {
Citation = {

  // will be filled in by individual citation types as available
  types: {},

  // filters that can pre-process text and post-process citations
  filters: {},

  // TODO: document this inline
  // check a block of text for citations of a given type -
  // return an array of matches, with citation broken out into fields
  find: function(text, options) {
    if (!options) options = {};

    // client can apply a filter that pre-processes text before extraction,
    // and post-processes citations after extraction
    var results;
    if (options.filter && Citation.filters[options.filter]) {
      results = Citation.filtered(options.filter, text, options);
    }

    // otherwise, do a single pass over the whole text.
    else
      results = Citation.extract(text, options);
      // TODO: move replacement step here

    if (results == null)
      return null;
    else
      return {citations: underscore.compact(results)};
  },

  // return an array of matched and filter-mapped cites
  filtered: function(name, text, options) {
    var results = [];

    var filter = Citation.filters[name];

    // filter can break up the text into pieces with accompanying metadata
    filter.from(text, options[name], function(piece, metadata) {
      var filtered = Citation.extract(piece, options).map(function(result) {
        Object.keys(metadata).forEach(function(key) {
          result[key] = metadata[key];
        });

        return result;
      });

      results = results.concat(filtered);
    });

    return results;
  },

  // return an array of matched cites
  extract: function(text, options) {
    if (!options) options = {};

    // default: no excerpt
    var excerpt = options.excerpt ? parseInt(options.excerpt, 10) : 0;

    // whether to return parent citations
    // default: false
    var parents = options.parents || false;

    // default: all types, can be filtered to one, or an array of them
    var types = Citation.selectedTypes(options);
    if (types.length === 0) return null;


    // caller can provide optional context that can change what patterns individual citators apply
    var context = options.context || {};


    // The caller can provide a replace callback to alter every found citation.
    // this function will be called with each (found and processed) cite object,
    // and should return a string to be put in the cite's place.
    //
    // The resulting transformed string will be in the returned object as a 'text' field.
    // this field will only be present if a replace callback was provided.
    //
    // providing this callback will also cause matched cites not to return the 'index' field,
    // as the replace process will completely screw them up. only use the 'index' field if you
    // plan on doing your own replacing.
    var replace = options.replace;

    // accumulate the results
    var results = [];


    ///////////// prepare citation patterns /////////////

    // figure out which patterns we're going apply, assign each an identifier
    var citators = {};

    // first, handle all regex-based citators
    types.forEach(function(type) {
      if (Citation.types[type].type != "regex") return;

      var patterns = Citation.types[type].patterns;

      // individual parsers can opt to make their parsing context-specific
      if (typeof(patterns) == "function")
        patterns = patterns(context[type] || {});

      patterns.forEach(function(pattern, i) {
        var name = type + "_" + i; // just needs to be unique

        // small pre-process on each regex - prefix named captures to ensure uniqueness.
        // will be un-prefixed before passing to processor.
        var uniquified = pattern.regex
          .replace(new RegExp("\\(\\?<([a-z0-9]+)>", "ig"), "(?<" + name + "_" + "$1>");

        citators[name] = {
          regex: uniquified,
          processor: pattern.processor,  // original processor method per-cite, expects named captures
          type: type // store so we can figure out per-cite what we're talking about
        };
      });
    });

    // if there are any regex-based citators being applied, use them
    var names = Object.keys(citators);

    if (names.length > 0) {

      // now let's merge each pattern's regex into a single regex, using named capture groups
      var regex = names.map(function(name) {
        return "(?<" + name + ">" + citators[name].regex + ")";
      }).join("|");

      regex = new XRegExp(regex, "ig");

      var replaced = XRegExp.replace(text, regex, function() {
        var match = arguments[0];

        // establish which pattern matched - each pattern name must be unique (even among individual named groups)
        var name = underscore.find(names, function(citeName) {if (match[citeName]) return true;});

        var type = citators[name].type;
        var processor = citators[name].processor;

        // extract and de-prefix any captured groups from the individual citator's regex
        var captures = Citation.capturesFrom(name, match);

        // process the matched data into the final object
        var cites = processor(captures);
        if (!underscore.isArray(cites)) cites = [cites]; // one match can generate one or many citation results (e.g. ranges)


        // put together the match-level information
        var matchInfo = {type: type};
        matchInfo.match = match.toString(); // match data can be converted to the plain string

        var index = arguments[arguments.length - 2]; // offset is second-to-last argument

        // store the matched character offset, except if we're replacing
        if (!replace)
          matchInfo.index = index;


        // use index to grab surrounding excerpt
        if (excerpt > 0) {
          var proposedLeft = index - excerpt;
          var left = proposedLeft > 0 ? proposedLeft : 0;

          var proposedRight = index + matchInfo.match.length + excerpt;
          var right = (proposedRight <= text.length) ? proposedRight : text.length;

          matchInfo.excerpt = text.substring(left, right);
        }


        // if we want parent cites too, make those now
        if (parents && Citation.types[type].parents_by) {
          cites = underscore.flatten(cites.map(function(cite) {
            return Citation.citeParents(cite, type);
          }));
        }

        cites = cites.map(function(cite) {
          var result = {};

          // match-level info
          underscore.extend(result, matchInfo);

          // cite-level info, plus ID standardization
          result[type] = cite;
          underscore.extend(result[type], Citation.types[type].standardize(result[type]));

          results.push(result);

          return result;
        });

        // I don't know what to do about ranges yet - but for now, screw it
        var replacedCite;
        if (typeof(replace) === "function")
          replacedCite = replace(cites[0]);
        else if ((typeof(replace) === "object") && (typeof(replace[type]) === "function"))
          replacedCite = replace[type](cites[0]);

        if (replacedCite)
          return replacedCite;
        else
          return matchInfo.match;
      });
    }

    // TODO: do for any external cite types, not just "judicial"
    if (underscore.contains(types, "judicial"))
      results = results.concat(Citation.types.judicial.extract(text));


    return results;
  },

  // for a given set of cite-specific details,
  // return itself and its parent citations
  citeParents: function(citation, type) {
    var field = Citation.types[type].parents_by;
    var results = [];

    for (var i=citation[field].length; i >= 0; i--) {
      var parent = underscore.clone(citation);
      parent[field] = parent[field].slice(0, i);
      results.push(parent);
    }
    return results;
  },

  // internal function - given a XRegExp match object, and a name prefix,
  // return a new object with the de-prefixed captured values
  capturesFrom: function(name, match) {
    var captures = {};
    Object.keys(match).forEach(function(key) {
      if (key.indexOf(name + "_") === 0)
        captures[key.replace(name + "_", "")] = match[key];
    });
    return captures;
  },

  selectedTypes: function(options) {
    var types;
    if (options.types) {
      if (underscore.isArray(options.types)) {
        if (options.types.length > 0)
          types = options.types;
      } else
        types = [options.types];
    }

    // only allow valid types
    if (types)
      types = underscore.intersection(types, Object.keys(Citation.types));
    else
      types = Object.keys(Citation.types);

    return types;
  }

};


// TODO: load only the citation types asked for
if (typeof(require) !== "undefined") {
  Citation.types.usc = require("./citations/usc");
  Citation.types.law = require("./citations/law");
  Citation.types.cfr = require("./citations/cfr");
  Citation.types.va_code = require("./citations/va_code");
  Citation.types.dc_code = require("./citations/dc_code");
  Citation.types.dc_register = require("./citations/dc_register");
  Citation.types.dc_law = require("./citations/dc_law");
  Citation.types.stat = require("./citations/stat");
  Citation.types.judicial = require("./citations/judicial");

  Citation.filters.lines = require("./filters/lines");
}


if (typeof(window) !== "undefined")
  window.Citation = Citation;

if (typeof(module) !== "undefined" && module.exports)
  module.exports = Citation;

})();
