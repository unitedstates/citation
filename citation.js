/* Citation.js - a legal citation extractor.
 *
 * Open source, dedicated to the public domain: https://github.com/unitedstates/citation
 *
 * Originally authored by Eric Mill (@konklone), at the Sunlight Foundation,
 * many contributions by https://github.com/unitedstates/citation/graphs/contributors
 */


module.exports = (function(Citation) {

Citation = {

  // will be filled in by individual citation types as available
  types: {},

  // filters that can pre-process text and post-process citations
  filters: {},

  // link sources that add permalink information to citations
  links: {},

  // TODO: document this inline
  // check a block of text for citations of a given type -
  // return an array of matches, with citation broken out into fields
  find: function(text, options) {
    if (!options) options = {};
    if (typeof(text) !== "string") return;

    // client can apply a filter that pre-processes text before extraction,
    // and post-processes citations after extraction
    var results;
    if (options.filter && Citation.filters[options.filter])
      return Citation.filtered(options.filter, text, options);

    // otherwise, do a single pass over the whole text.
    else
      return Citation.extract(text, options);
  },

  // return an array of matched and filter-mapped cites
  filtered: function(name, text, options) {
    var results = [];

    var filter = Citation.filters[name];

    // filter can break up the text into pieces with accompanying metadata
    filter.from(text, options[name], function(piece, metadata) {
      var response = Citation.extract(piece, options);

      // ignores any replaced text, it falls off the edge of the earth

      var filtered = response.citations.map(function(result) {

        Object.keys(metadata).forEach(function(key) {
          result[key] = metadata[key];
        });

        return result;
      });

      results = results.concat(filtered);
    });

    // doesn't return replaced text
    return {citations: results};
  },


  // run the citators over the text, return an array of matched cites
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


    // will hold the calculated context-specific patterns we are to run
    // over the given text, tracked by index we expect to find them at.
    // nextIndex tracks a running index as we loop through patterns.
    // (citators could just be called indexedPatterns)
    var citators = {};
    var nextIndex = 0;

    // Go through every regex-based citator and prepare a set of patterns,
    // indexed by the order of a matched arguments array.
    types.forEach(function(type) {
      if (Citation.types[type].type != "regex") return;

      // Calculate the patterns this citator will contribute to the parse.
      // (individual parsers can opt to make their parsing context-specific)
      var patterns = Citation.types[type].patterns;
      if (typeof(patterns) == "function")
        patterns = patterns(options[type] || {});

      // add each pattern, keeping a running tally of what we would
      // expect its primary index to be when found in the master regex.
      patterns.forEach(function(pattern) {
        pattern.type = type; // will be needed later
        citators[nextIndex] = pattern;
        nextIndex += pattern.fields.length + 1;
      });
    });

    // If there are any regex-based patterns being applied, combine them
    // and run a find/replace over the string.
    var regexes = Object.keys(citators).map(function(key) {return citators[key].regex});
    if (regexes.length > 0) {

      // merge all regexes into one, so that each pattern will begin at a predictable place
      var regex = new RegExp("(" + regexes.join(")|(") + ")", "ig");

      var replaced = text.replace(regex, function() {
        var match = arguments[0];

        // offset is second-to-last argument
        var index = arguments[arguments.length - 2];

        // pull out just the regex-captured matches
        var captures = Array.prototype.slice.call(arguments, 1, -2);

        // find the first matched index in the captures
        var matchIndex;
        for (matchIndex=0; matchIndex<captures.length; matchIndex++)
          if (captures[matchIndex]) break;

        // look up the citator by the index we expected it at
        var citator = citators[matchIndex];
        if (!citator) return null; // what?
        var type = citator.type;

        // process the matched data into the final object
        var ourCaptures = Array.prototype.slice.call(captures, matchIndex + 1);
        var namedMatch = Citation.matchFor(ourCaptures, citator);
        var cites = citator.processor(namedMatch);

        // one match can generate one or many citation results (e.g. ranges)
        if (!Array.isArray(cites)) cites = [cites];

        // put together the match-level information
        var matchInfo = {type: citator.type};
        matchInfo.match = match.toString(); // match data can be converted to the plain string

        // store the matched character offset (if we're replacing we need it to handle
        // some multiple citations, but the index will be useless to the caller after
        // the replacement) so we wipe it out later.
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
          cites = Citation._.flatten(cites.map(function(cite) {
            return Citation.citeParents(cite, type);
          }));
        }

        cites = cites.map(function(cite) {
          var result = {};

          // match-level info
          Citation._.extend(result, matchInfo);

          // handle _submatch, which lets the user-level citator override the
          // match and index with a sub-part of the whole matched regex
          if (cite._submatch) {
            result.match = cite._submatch.text;
            result.index += cite._submatch.offset;
            delete cite._submatch;
          }

          // since a single text region can match multiple citations, such as when
          // a range is given, clarify what this match represents
          if ('canonical' in Citation.types[type])
            result.citation = Citation.types[type].canonical(cite);

          // cite-level info, plus ID standardization
          result[type] = cite;
          result[type].id = Citation.types[type].id(cite);

          // add permalinks if requested and a link source exists for this citation
          // type
          if (options.links) {
            result[type].links = {};
            for (var link_source in Citation.links) {
              var link_source_module = Citation.links[link_source];
              if (type in link_source_module.citations) {
                // This link source provides link info for this type of citation.
                // The function may return null if it doesn't provide a link for
                // the particular citation.
                var link_info = link_source_module.citations[type](cite);
                if (link_info) {
                  // Add source metadata.
                  link_info.source = {
                    name: link_source_module.name,
                    abbreviation: link_source_module.abbreviation,
                    link: link_source_module.link,
                    authoritative: link_source_module.authoritative
                  };

                  // Add to citation.
                  result[type].links[link_source_module.id] = link_info;
                }
              }
            }
          }

          results.push(result);

          return result;
        });

        // If a replace function is given, replace each matched citation by the
        // result of calling the replace function with the citation passed as its
        // only argument.
        //
        // Most citators return only a single citation match per regex match, but
        // some return multiple citations for strings like "§§ 32-701 through 32-703".

        // Collect the final match string here.
        var finalstring = matchInfo.match;

        // Get the replace function. If options.replace is a function use that,
        // or if it is an object mapping the citator type to a function use that.
        var replace_func = null;
        if (typeof(replace) === "function")
          replace_func = replace;
        else if ((typeof(replace) === "object") && (typeof(replace[type]) === "function"))
          replace_func = replace[type];
        else
          replace_func = null;

        // If there's a replacement function...
        if (replace_func) {
          // Process the citations in the order they are returned. Assume they are
          // ordered from left to right.
          var last_index = 0;
          var dx = 0;
          for (var i = 0; i < cites.length; i++) {
            // Skip citations that overlap with the previous citation (e.g. there
            // may be two citations for the same text range.)
            if (cites[i].index >= last_index) {
              // Execute the replacement function. If the return is truth-y, perform
              // a replacement.
              var replacement = replace_func(cites[i]);
              if (replacement) {
                // Replace the substring.
                finalstring = finalstring.substring(0, cites[i].index-index+dx) + replacement + finalstring.substring(cites[i].index-index+cites[i].match.length+dx);

                // The replacement text may have a different length than the text
                // being replaced. Keep track of the total change in string length
                // as we go because we have to adjust future citation replacements's
                // indexes so that we make the edit to finalstring in the right place.
                dx += replacement.length - cites[i].match.length;

                // And track the end of last citation so we can skip any future citations
                // that overlap with this text range.
                last_index = cites[i].index + cites[i].match.length;
              }
            }

            // Per the citation API, delete the index field when doing a replacement.
            // After replacements, the index will no longer be useful to the caller
            // because the string has been edited.
            delete cites[i].index;
          }
        }
        return finalstring;
      });
    }

    // TODO: do for any external cite types, not just "judicial"
    if (types.indexOf("judicial") != -1)
      results = results.concat(Citation.types.judicial.extract(text));

    var response = {citations: results};
    if (options.replace) response.text = replaced;

    return response;
  },


  // for a given set of cite-specific details,
  // return itself and its parent citations
  citeParents: function(citation, type) {
    var field = Citation.types[type].parents_by;
    var results = [];

    for (var i=citation[field].length; i >= 0; i--) {
      var parent = Citation._.extend({}, citation);
      parent[field] = parent[field].slice(0, i);
      results.push(parent);
    }
    return results;
  },

  // given an array of captures *beginning* with values the pattern
  // knows how to process, turn it into an object with those keys.
  matchFor: function(captures, pattern) {
    var match = {};
    for (var i=0; i<captures.length; i++)
      match[pattern.fields[i]] = captures[i];
    return match;
  },

  selectedTypes: function(options) {
    var types;
    if (options.types) {
      if (Array.isArray(options.types)) {
        if (options.types.length > 0)
          types = options.types;
      } else
        types = [options.types];
    }

    // only allow valid types
    if (types) {
      types = types.filter(function(type) {
        return Object.keys(Citation.types).indexOf(type) != -1;
      });
    } else
      types = Object.keys(Citation.types);

    return types;
  },

  // small replacement for several functions previously served by
  // the `underscore` library.
  _: {
    extend: function(obj) {
      Array.prototype.slice.call(arguments, 1).forEach(function(source) {
        if (source) {
          for (var prop in source)
            obj[prop] = source[prop];
        }
      });
      return obj;
    },

    flatten: function(array) {
      var impl = function(input, output) {
        input.forEach(function(value) {
          if (Array.isArray(value))
            impl(value, output);
          else
            output.push(value);
        });
        return output;
      }

      return impl(array, []);
    }
  }

};


// TODO: load only the citation types, filters, and link sources asked for
if (typeof(require) !== "undefined") {
  Citation.types.usc = require("./citations/usc");
  Citation.types.law = require("./citations/law");
  Citation.types.cfr = require("./citations/cfr");
  Citation.types.va_code = require("./citations/va_code");
  Citation.types.dc_code = require("./citations/dc_code");
  Citation.types.dc_register = require("./citations/dc_register");
  Citation.types.dc_law = require("./citations/dc_law");
  Citation.types.dc_stat = require("./citations/dc_stat");
  Citation.types.stat = require("./citations/stat");
  Citation.types.reporter = require("./citations/reporter");
  Citation.types.fedreg = require("./citations/fedreg");
  Citation.types.usconst = require("./citations/usconst");


  Citation.filters.lines = require("./filters/lines");
  Citation.filters.xpath_html = require("./filters/xpath_html");
  Citation.filters.xpath_xml = require("./filters/xpath_xml");

  Citation.links.cornell_lii = require("./links/cornell_lii");
  Citation.links.courtlistener = require("./links/courtlistener");
  Citation.links.dccode = require("./links/dccode");
  Citation.links.dccodeorg = require("./links/dccodeorg");
  Citation.links.dcdecoded = require("./links/dcdecoded");
  Citation.links.govtrack = require("./links/govtrack");
  Citation.links.gpo = require("./links/gpo");
  Citation.links.house = require("./links/house");
  Citation.links.legislink = require("./links/legislink");
  Citation.links.libraryofcongress = require("./links/libraryofcongress");
  Citation.links.nara = require("./links/nara");
  Citation.links.vadecoded = require("./links/vadecoded");
}

// auto-load in-browser
if (typeof(window) !== "undefined")
  window.Citation = Citation;

return Citation;

})();
