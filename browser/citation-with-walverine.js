(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

          // cite-level info, plus ID standardization
          result[type] = cite;
          result[type].id = Citation.types[type].id(cite);

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


// TODO: load only the citation types asked for
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


  Citation.filters.lines = require("./filters/lines");
  Citation.filters.xpath = require("./filters/xpath");
}

// auto-load in-browser
if (typeof(window) !== "undefined")
  window.Citation = Citation;

return Citation;

})();

},{"./citations/cfr":2,"./citations/dc_code":3,"./citations/dc_law":4,"./citations/dc_register":5,"./citations/dc_stat":6,"./citations/fedreg":7,"./citations/law":9,"./citations/reporter":10,"./citations/stat":11,"./citations/usc":12,"./citations/va_code":13,"./filters/lines":15,"./filters/xpath":16}],2:[function(require,module,exports){
module.exports = {
  type: "regex",

  id: function(data) {
    return ["cfr", data.title, (data.section || data.part)]
      .concat(data.subsections || [])
      .join("/")
  },

  patterns: [
    // done:
    // 14 CFR part 25
    // 38 CFR Part 74.2
    // 48 CFR § 9903.201
    // 24 CFR 85.25(h)
    // 5 CFR §531.610(f)
    // 45 C.F.R. 3009.4
    // 47 CFR 54.506 (c)
    //   but not: 47 CFR 54.506 (whatever)
    // 5CFR, part 575

    // maybe:
    // 13 CFR Parts 125 and 134
    // 5CFR, part 575, subpart C
    // 23 CFR 650, Subpart A
    {
      regex:
        "(\\d+)\\s?" +
        "C\\.?\\s?F\\.?\\s?R\\.?" +
        "(?:[\\s,]+(?:§+|parts?))?" +
        "\\s*((?:\\d+\\.?\\d*(?:\\s*\\((?:[a-zA-Z\\d]{1,2}|[ixvIXV]+)\\))*)+)",

      fields: ['title', 'sections'],

      processor: function(captures) {
        var title = captures.title;
        var part, section, subsections;

        // separate subsections for each section being considered
        var split = captures.sections.split(/[\(\)]+/).filter(function(x) {return x;});
        section = split[0].trim();
        subsections = split.splice(1);

        if (section.indexOf(".") > 0)
          part = section.split(".")[0];
        else {
          part = section;
          section = null;
          subsections = null; // don't include empty array
        }

        return {
          title: title,
          part: part,
          section: section,
          subsections: subsections
        };
      }
    }

    // todo:
    // parts 121 and 135 of Title 14 of the Code of Federal Regulations
    // {
    //   regex:
    //     "section (\\d+[\\w\\d\-]*)((?:\\([^\\)]+\\))*)" +
    //     "(?:\\s+of|\\,) title (\\d+)",
    //   fields: ['section', 'subsections', 'title'],
    //   processor: function(captures) {
    //     return {
    //       title: captures.title,
    //       section: captures.section,
    //       subsections: captures.subsections.split(/[\(\)]+/).filter(function(x) {return x;})
    //     };
    //   }
    // }
  ]
};

},{}],3:[function(require,module,exports){
var base_regex =
  "(\\d+A?)" + // title
  "\\s?\\-\\s?" + // dash
  "([\\w\\d]+(?:\\.?[\\w\\d]+)?)" +  // section identifier (letters/numbers/dots)
  "((?:\\([^\\)]+\\))*)"; // subsection (any number of adjacent parenthesized subsections)

module.exports = {
  type: "regex",

  // normalize all cites to an ID, with and without subsections
  id: function(cite) {
    return ["dc-code", cite.title, cite.section]
      .concat(cite.subsections)
      .join("/");
  },

  // field to calculate parents from
  parents_by: "subsections",

  patterns: function(context) {
    // D.C. Official Code 3-1202.04
    // D.C. Official Code § 3-1201.01
    // D.C. Official Code §§ 38-2602(b)(11)
    // D.C. Official Code § 3- 1201.01
    // D.C. Official Code § 3 -1201.01
    //
    // § 32-701
    // § 32-701(4)
    // § 3-101.01
    // § 1-603.01(13)
    // § 1- 1163.33
    // § 1 -1163.33
    // section 16-2326.01

    var prefix_regex = "";
    var section_regex = "(?:sections?|§+)\\s+";
    var sections_regex = "(?:sections|§§)\\s+";
    if (context.source != "dc_code") {
      // Require "DC Official Code" but then make the section symbol optional.
      prefix_regex = "D\\.?C\\.? (?:Official )?Code\\s+";
      section_regex = "(?:" + section_regex + ")?";
      sections_regex = "(?:" + sections_regex + ")?";
    }

    return [
      // multiple citations
      // has precedence over a single citation
      // Unlike the single citation, the matched parts are just the title/section/subsection
      // and omits "DC Code" and the section symbols (if present) from the matched text.
      {
        regex: "(" + prefix_regex + sections_regex + ")(" + base_regex + "(?:(?:,|, and|\\s+and|\\s+through|\\s+to)\\s+" + base_regex + ")+)",

        fields: ["prefix", "multicite", "title1", "section1", "subsections1", "title2", "section2", "subsections2"],

        processor: function(captures) {
          var rx = new RegExp(base_regex, "g");
          var matches = new Array();
          var match;
          while((match = rx.exec(captures.multicite)) !== null) {
            matches.push({
              _submatch: {
                text: match[0],
                offset: captures.prefix.length + match.index,
              },
              title: match[1],
              section: match[2],
              subsections: split_subsections(match[3])
            });
          }
          return matches;
        }
      },

      // a single citation
      {
        regex: prefix_regex + section_regex + base_regex,

        fields: ["title", "section", "subsections"],

        processor: function(captures) {
          var title = captures.title;
          var section = captures.section;
          var subsections = split_subsections(captures.subsections);

          return {
            title: title,
            section: section,
            subsections: subsections
          };
        }
      }
    ];
  }
};

function split_subsections(match) {
  if (match)
    return match.split(/[\(\)]+/).filter(function(x) {return x});
  else
    return [];
}
},{}],4:[function(require,module,exports){
module.exports = {
  type: "regex",

  id: function(cite) {
    return ["dc-law", cite.period, cite.number].join("/");
  },

  patterns: function(context) {
    // If the context for this citation is the DC Code, then Law XX-YYY can be assumed
    // to be a DC law. In other context, require the "DC Law" prefix. In the DC Code
    // context also slurp in the "DC" prefix.
    var context_regex = "D\\.?\\s*C\\.?\\s+";
    if (context.source == "dc_code")
      context_regex = "(?:" + context_regex + ")?"

    return [
      // "D.C. Law 111-89"
      // "DC Law 111-89"
      // "DC Law 18-135A"
      {
        regex:
          context_regex + "Law\\s+(\\d+)\\s?[-–]+\\s?(\\d+\\w?)",
        fields: ["period", "number"],
        processor: function(captures) {
          return {
            period: captures.period,
            number: captures.number
          };
        }
      }
    ];
  }
};

},{}],5:[function(require,module,exports){
module.exports = {
  type: "regex",

  id: function(cite) {
    return ["dc-register", cite.volume, cite.page].join("/");
  },

  patterns: [
    // 54 DCR 8014
    {
      regex:
        "(\\d+)\\s+" +
        "DCR" +
        "\\s+(\\d+)",
      fields: ['volume', 'page'],
      processor: function(match) {
        return {
          volume: match.volume,
          page: match.page,
        };
      }
    }
  ]
};

},{}],6:[function(require,module,exports){
module.exports = {
  type: "regex",

  // normalize all cites to an ID
  id: function(cite) {
    return ["dcstat", cite.volume, cite.page].join("/")
  },

  patterns: [
    // "20 DCSTAT 1952"
    {
      regex:
        "(\\d+)\\s+" +
        "DCSTAT" +
        "\\s+(\\d+)",
      fields: ['volume', 'page'],
      processor: function(match) {
        return {
          volume: match.volume,
          page: match.page,
        };
      }
    }
  ]
};

},{}],7:[function(require,module,exports){
module.exports = {
  type: "regex",

  // normalize all cites to an ID
  id: function(cite) {
    return ["fedreg", cite.volume, cite.page].join("/")
  },

  patterns: [
    // "75 Fed. Reg. 28404"
    // "69 FR 22135"
    {
      regex:
        "(\\d+)\\s+" +
        "(?:Fed\\.?\\sReg?\\.?|F\\.?R\\.?)" +
        "\\s+(\\d+)",
      fields: ['volume', 'page'],
      processor: function(match) {
        return {
          volume: match.volume,
          page: match.page,
        };
      }
    }
  ]
};

},{}],8:[function(require,module,exports){
var walverine = require("walverine");

module.exports = {
  type: "external",

  extract: function(text) {
    return walverine.get_citations(text).map(function(cite) {
      var result = {};
      result.match = cite.match;

      // modify in place
      delete cite.match;

      result.judicial = cite;
      return result;
    });
  }
};
},{"walverine":40}],9:[function(require,module,exports){
module.exports = {
  type: "regex",

  id: function(cite) {
    return ["us-law", cite.type, cite.congress, cite.number]
      .concat(cite.sections || [])
      .join("/");
  },

  // field to calculate parents from
  parents_by: "sections",

  patterns: [
    // "Public Law 111-89"
    // "Pub. L. 112-56"
    // "Pub. L. No. 110-2"
    // "Pub.L. 105-33"
    // "Private Law 111-72"
    // "Priv. L. No. 98-23"
    // "section 552 of Public Law 111-89"
    // "section 4402(e)(1) of Public Law 110-2"
    {
      regex:
        "(?:section (\\d+[\\w\\d\-]*)((?:\\([^\\)]+\\))*) of )?" +
        "(pub(?:lic)?|priv(?:ate)?)\\.?\\s*l(?:aw)?\\.?(?:\\s*No\\.?)?" +
        " +(\\d+)[-–]+(\\d+)",
      fields: ['section', 'subsections', 'type', 'congress', 'number'],
      processor: function(captures) {
        var sections = [];
        if (captures.section) sections.push(captures.section);
        if (captures.subsections) sections = sections.concat(captures.subsections.split(/[\(\)]+/).filter(function(x) {return x}));

        return {
          type: captures.type.match(/^priv/i) ? "private" : "public",
          congress: captures.congress,
          number: captures.number,
          sections: sections
        };
      }
    },

    // "PL 19-4"
    // "P.L. 45-78"
    // "section 552 of PL 19-4"
    // "section 4402(e)(1) of PL 19-4"
    {
      regex:
        "(?:section (\\d+[\\w\\d\-]*)((?:\\([^\\)]+\\))*) of )?" +
        "P\\.?L\\.? +(\\d+)[-–](\\d+)",
      fields: ['section', 'subsections', 'congress', 'number'],
      processor: function(captures) {
        sections = [];
        if (captures.section) sections.push(captures.section);
        if (captures.subsections) sections = sections.concat(captures.subsections.split(/[\(\)]+/).filter(function(x) {return x}));

        return {
          type: "public",
          congress: captures.congress,
          number: captures.number,
          sections: sections
        };
      }
    }
  ]
};

},{}],10:[function(require,module,exports){
module.exports = {
  type: "regex",

  // normalize all cites to an ID
  id: function(cite) {
    return ["reporter", cite.volume, cite.reporter, cite.page].join("/")
  },

  patterns: [
    {
      regex:
        "(\\d{1,3})\\s" +
        "(\\w+(?:\\.\\w+(?:\\.)?)?(?:\\.\\dd)?|U\\.?\\s?S\\.?|F\\. Supp\\.(?:\\s\\dd)?)\\s" +
        "(\\d{1,4})",
      fields: ['volume',  'reporter', 'page'],
      processor: function(match) {
        return {
          volume: match.volume,
          reporter: match.reporter,
          page: match.page,
        };
      }
    }
  ]
};

},{}],11:[function(require,module,exports){
module.exports = {
  type: "regex",

  // normalize all cites to an ID
  id: function(cite) {
    return ["stat", cite.volume, cite.page].join("/")
  },

  patterns: [
    // "117 Stat. 1952"
    // "77 STAT. 77"
    {
      regex:
        "(\\d+[\\w]*)\\s+" +
        "Stat\\.?" +
        "\\s+(\\d+)",
      fields: ['volume', 'page'],
      processor: function(match) {
        return {
          volume: match.volume,
          page: match.page,
        };
      }
    }
  ]
};

},{}],12:[function(require,module,exports){
module.exports = {
  type: "regex",

  id: function(cite) {
    return ["usc", cite.title, cite.section]
      .concat(cite.subsections || [])
      .join("/");
  },


  // field to calculate parents from
  parents_by: "subsections",

  patterns: [
    // "5 USC 552"
    // "5 U.S.C. § 552(a)(1)(E)"
    // "7 U.S.C. 612c note"
    // "29 U.S.C. 1081 et seq"
    // "50 U.S.C. App. 595"
    // "45 U.S.C. 10a-10c"
    // "50 U.S.C. 404o-1(a)" - single section
    // "45 U.S.C. 10a(1)-10c(2)" - range
    // "50 U.S.C. App. §§ 451--473" - range
    {
      regex:
        "(\\d+)\\s+" + // title
        "U\\.?\\s?S\\.?\\s?C\\.?" +
        "(?:\\s+(App)\.?)?" + // appendix
        "(?:\\s+(§+))?" + // symbol
        "\\s+((?:\\-*\\d+[\\w\\d\\-]*(?:\\([^\\)]+\\))*)+)" + // sections
        "(?:\\s+(note|et\\s+seq))?", // note

      fields: [
        'title', 'appendix',
        'symbol', 'sections', 'note'
      ],

      processor: function(match) {
        // a few titles have distinct appendixes
        var title = match.title;
        if (match.appendix) title += "-app";

        var sections = match.sections.split(/-+/);

        var range = false;

        // two section symbols is unambiguous
        if (match.symbol == "§§") // 2 section symbols
          range = true;

        // paren before dash is unambiguous
        else {
          var dash = match.sections.indexOf("-");
          var paren = match.sections.indexOf("(");
          if (dash > 0 && paren > 0 && paren < dash)
            range = true;
        }

        // if there's a hyphen and the range is ambiguous,
        // also return the original section string as one
        if ((sections.length > 1) && !range)
          sections.unshift(match.sections);

        return sections.map(function(section) {
          // separate subsections for each section being considered
          var split = section.split(/[\(\)]+/).filter(function(x) {return x});
          section = split[0];
          subsections = split.splice(1);
          if (match.note)
            subsections.push(match.note.replace(" ", "-")); // "note" or "et seq"

          return {
            title: title,
            section: section,
            subsections: subsections
          };
        });
      }
    },

    // "section 552 of title 5"
    // "section 552, title 5"
    // "section 552(a)(1)(E) of title 5"
    // "section 404o-1(a) of title 50"
    {
      regex:
        "section (\\d+[\\w\\d\-]*)((?:\\([^\\)]+\\))*)" +
        "(?:\\s+of|\\,) title (\\d+)",

      fields: ['section', 'subsections', 'title'],

      processor: function(match) {
        return {
          title: match.title,
          section: match.section,
          subsections: match.subsections.split(/[\(\)]+/).filter(function(x) {return x})
        };
      }
    }
  ]
};

},{}],13:[function(require,module,exports){
module.exports = {
  type: "regex",

  id: function(cite) {
    return ["va-code", data.title, data.section].join("/");
  },

  patterns: [

    // Va. Code Ann. § 19.2-56.2 (2010)
    // Va. Code Ann. § 19.2-56.2 (West 2010)
    // Va. Code Ann. § 57-1
    // Va. Code Ann. § 57-2.02
    // Va. Code Ann. § 63.2-300
    // Va. Code Ann. § 66-25.1:1
    // Va. Code § 66-25.1:1
    // VA Code § 66-25.1:1
    {
      regex:
        "Va\\.? Code\\.?" +
        "(?:\\s+Ann\\.?)?" +
        "(?:\\s+§+)?" +
        "\\s+([\\d\\.]+)\\-([\\d\\.:]+)" +
        "(?:\\s+\\((?:West )?([12]\\d{3})\\))?",
      fields: ['title', 'section', 'year'],
      processor: function (captures) {
        return {
          title: captures.title,
          section: captures.section,
          year: captures.year
        };
      }
    }
  ]
};

},{}],14:[function(require,module,exports){
Citation = require("./citation");
Citation.types.judicial = require("./citations/judicial");
module.exports = Citation;
},{"./citation":1,"./citations/judicial":8}],15:[function(require,module,exports){
module.exports = {

  /*
    Filters receive:
      * text: the entire input text
      * options: any filter-specific options, e.g. delimiter
      * extract: execute this function once with every substring the filter
          breaks the input text into, e.g. each line,
          along with any associated metadata, e.g. the line number.

  */

  // A line-by-line filter.
  //
  // Breaks the text up by line, and feeds each line into the extractor.
  // Attaches the line number (1-indexed) as metadata to each cite,
  // so that any character offsets will be relative to that line.
  //
  // Accepts options:
  //   delimiter: override the default delimiter

  from: function(text, options, extract) {
    // by default, break lines on any combination of \n\r
    var delimiter = (options && options.delimiter) || /[\n\r]+/;

    // split the text into an array of lines
    var lines = text.split(new RegExp(delimiter));

    // for each line, submit it to the extractor along with its line number
    lines.forEach(function(line, i) {
      extract(line, {line: (i+1)});
    });
  }

};

},{}],16:[function(require,module,exports){
var Parser = require("parse5").Parser;

function from_recurse(node, partialXpath, extract) {
  if (node.nodeName == "#text") {
    // Pass contents of text nodes to the extractor
    extract(node.value, {xpath: partialXpath});
  } else if (node.nodeName == "#comment" || node.nodeName == "#documentType") {
    // Skip doctypes and comments
    // (parse5 treats processing instructions, entities, and notations as
    // comments)
    return;
  } else {
    for (var i = 0; i < node.childNodes.length; i++) {
      var next = node.childNodes[i];

      // Incrementally build XPath expressions for each node
      var nextName = next.nodeName;
      var index = 1; // XPath indices are 1-based because reasons
      for (var j = 0; j < i; j++) {
        if (node.childNodes[j].nodeName == nextName) {
          index++;
        }
      }
      var nextXpath;
      if (nextName == "#text") {
        nextXpath = partialXpath + "/text()[" + index + "]";
      } else {
        nextXpath = partialXpath + "/" + nextName + "[" + index + "]";
      }

      // Recurse through each child element node
      from_recurse(next, nextXpath, extract);
    }
  }
}

module.exports = {

  /*
    Filters receive:
      * text: the entire input text
      * options: any filter-specific options
      * extract: execute this function once with every substring the filter
          breaks the input tet into, along with any associated metadata, e.g.
          the XPath expression associated with each text fragment.
   */

  // An HTML/XPath filter.
  //
  // Parses the text as an HTML document, using an HTML5 parser, and feeds
  // each text node into the extractor. Attaches an XPath expression that
  // locates the text node as metadata to each cite. Character offsets will
  // be relative to the beginning of the text node.
  //
  // Accepts options:
  //   no options

  from: function(text, options, extract) {
    // Parse the input text
    var parser = new Parser();
    var doc = parser.parse(text);

    // Hand off to recursive function, which will walk the DOM
    from_recurse(doc, '', extract);
  }

};

},{"parse5":18}],17:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],18:[function(require,module,exports){
'use strict';

exports.Parser = require('./lib/tree_construction/parser');
exports.SimpleApiParser = require('./lib/simple_api/simple_api_parser');
exports.TreeSerializer =
exports.Serializer = require('./lib/serialization/serializer');
exports.JsDomParser = require('./lib/jsdom/jsdom_parser');

exports.TreeAdapters = {
    default: require('./lib/tree_adapters/default'),
    htmlparser2: require('./lib/tree_adapters/htmlparser2')
};

},{"./lib/jsdom/jsdom_parser":24,"./lib/serialization/serializer":26,"./lib/simple_api/simple_api_parser":27,"./lib/tree_adapters/default":33,"./lib/tree_adapters/htmlparser2":34,"./lib/tree_construction/parser":38}],19:[function(require,module,exports){
'use strict';

//Const
var VALID_DOCTYPE_NAME = 'html',
    QUIRKS_MODE_SYSTEM_ID = 'http://www.ibm.com/data/dtd/v11/ibmxhtml1-transitional.dtd',
    QUIRKS_MODE_PUBLIC_ID_PREFIXES = [
        "+//silmaril//dtd html pro v0r11 19970101//en",
        "-//advasoft ltd//dtd html 3.0 aswedit + extensions//en",
        "-//as//dtd html 3.0 aswedit + extensions//en",
        "-//ietf//dtd html 2.0 level 1//en",
        "-//ietf//dtd html 2.0 level 2//en",
        "-//ietf//dtd html 2.0 strict level 1//en",
        "-//ietf//dtd html 2.0 strict level 2//en",
        "-//ietf//dtd html 2.0 strict//en",
        "-//ietf//dtd html 2.0//en",
        "-//ietf//dtd html 2.1e//en",
        "-//ietf//dtd html 3.0//en",
        "-//ietf//dtd html 3.0//en//",
        "-//ietf//dtd html 3.2 final//en",
        "-//ietf//dtd html 3.2//en",
        "-//ietf//dtd html 3//en",
        "-//ietf//dtd html level 0//en",
        "-//ietf//dtd html level 0//en//2.0",
        "-//ietf//dtd html level 1//en",
        "-//ietf//dtd html level 1//en//2.0",
        "-//ietf//dtd html level 2//en",
        "-//ietf//dtd html level 2//en//2.0",
        "-//ietf//dtd html level 3//en",
        "-//ietf//dtd html level 3//en//3.0",
        "-//ietf//dtd html strict level 0//en",
        "-//ietf//dtd html strict level 0//en//2.0",
        "-//ietf//dtd html strict level 1//en",
        "-//ietf//dtd html strict level 1//en//2.0",
        "-//ietf//dtd html strict level 2//en",
        "-//ietf//dtd html strict level 2//en//2.0",
        "-//ietf//dtd html strict level 3//en",
        "-//ietf//dtd html strict level 3//en//3.0",
        "-//ietf//dtd html strict//en",
        "-//ietf//dtd html strict//en//2.0",
        "-//ietf//dtd html strict//en//3.0",
        "-//ietf//dtd html//en",
        "-//ietf//dtd html//en//2.0",
        "-//ietf//dtd html//en//3.0",
        "-//metrius//dtd metrius presentational//en",
        "-//microsoft//dtd internet explorer 2.0 html strict//en",
        "-//microsoft//dtd internet explorer 2.0 html//en",
        "-//microsoft//dtd internet explorer 2.0 tables//en",
        "-//microsoft//dtd internet explorer 3.0 html strict//en",
        "-//microsoft//dtd internet explorer 3.0 html//en",
        "-//microsoft//dtd internet explorer 3.0 tables//en",
        "-//netscape comm. corp.//dtd html//en",
        "-//netscape comm. corp.//dtd strict html//en",
        "-//o'reilly and associates//dtd html 2.0//en",
        "-//o'reilly and associates//dtd html extended 1.0//en",
        "-//spyglass//dtd html 2.0 extended//en",
        "-//sq//dtd html 2.0 hotmetal + extensions//en",
        "-//sun microsystems corp.//dtd hotjava html//en",
        "-//sun microsystems corp.//dtd hotjava strict html//en",
        "-//w3c//dtd html 3 1995-03-24//en",
        "-//w3c//dtd html 3.2 draft//en",
        "-//w3c//dtd html 3.2 final//en",
        "-//w3c//dtd html 3.2//en",
        "-//w3c//dtd html 3.2s draft//en",
        "-//w3c//dtd html 4.0 frameset//en",
        "-//w3c//dtd html 4.0 transitional//en",
        "-//w3c//dtd html experimental 19960712//en",
        "-//w3c//dtd html experimental 970421//en",
        "-//w3c//dtd w3 html//en",
        "-//w3o//dtd w3 html 3.0//en",
        "-//w3o//dtd w3 html 3.0//en//",
        "-//webtechs//dtd mozilla html 2.0//en",
        "-//webtechs//dtd mozilla html//en"
    ],
    QUIRKS_MODE_NO_SYSTEM_ID_PUBLIC_ID_PREFIXES = [
        '-//w3c//dtd html 4.01 frameset//',
        '-//w3c//dtd html 4.01 transitional//'
    ],
    QUIRKS_MODE_PUBLIC_IDS = [
        '-//w3o//dtd w3 html strict 3.0//en//',
        '-/w3c/dtd html 4.0 transitional/en',
        'html'
    ];


//Utils
function enquoteDoctypeId(id) {
    var quote = id.indexOf('"') !== -1 ? '\'' : '"';

    return quote + id + quote;
}


//API
exports.isQuirks = function (name, publicId, systemId) {
    if (name !== VALID_DOCTYPE_NAME)
        return true;

    if (systemId && systemId.toLowerCase() === QUIRKS_MODE_SYSTEM_ID)
        return true;

    if (publicId !== null) {
        publicId = publicId.toLowerCase();

        if (QUIRKS_MODE_PUBLIC_IDS.indexOf(publicId) > -1)
            return true;

        var prefixes = QUIRKS_MODE_PUBLIC_ID_PREFIXES;

        if (systemId === null)
            prefixes = prefixes.concat(QUIRKS_MODE_NO_SYSTEM_ID_PUBLIC_ID_PREFIXES);

        for (var i = 0; i < prefixes.length; i++) {
            if (publicId.indexOf(prefixes[i]) === 0)
                return true;
        }
    }

    return false;
};

exports.serializeContent = function (name, publicId, systemId) {
    var str = '!DOCTYPE ' + name;

    if (publicId !== null)
        str += ' PUBLIC ' + enquoteDoctypeId(publicId);

    else if (systemId !== null)
        str += ' SYSTEM';

    if (systemId !== null)
        str += ' ' + enquoteDoctypeId(systemId);

    return str;
};

},{}],20:[function(require,module,exports){
'use strict';

var Tokenizer = require('../tokenization/tokenizer'),
    HTML = require('./html');

//Aliases
var $ = HTML.TAG_NAMES,
    NS = HTML.NAMESPACES,
    ATTRS = HTML.ATTRS;


//MIME types
var MIME_TYPES = {
    TEXT_HTML: 'text/html',
    APPLICATION_XML: 'application/xhtml+xml'
};

//Attributes
var DEFINITION_URL_ATTR = 'definitionurl',
    ADJUSTED_DEFINITION_URL_ATTR = 'definitionURL',
    SVG_ATTRS_ADJUSTMENT_MAP = {
        'attributename': 'attributeName',
        'attributetype': 'attributeType',
        'basefrequency': 'baseFrequency',
        'baseprofile': 'baseProfile',
        'calcmode': 'calcMode',
        'clippathunits': 'clipPathUnits',
        'contentscripttype': 'contentScriptType',
        'contentstyletype': 'contentStyleType',
        'diffuseconstant': 'diffuseConstant',
        'edgemode': 'edgeMode',
        'externalresourcesrequired': 'externalResourcesRequired',
        'filterres': 'filterRes',
        'filterunits': 'filterUnits',
        'glyphref': 'glyphRef',
        'gradienttransform': 'gradientTransform',
        'gradientunits': 'gradientUnits',
        'kernelmatrix': 'kernelMatrix',
        'kernelunitlength': 'kernelUnitLength',
        'keypoints': 'keyPoints',
        'keysplines': 'keySplines',
        'keytimes': 'keyTimes',
        'lengthadjust': 'lengthAdjust',
        'limitingconeangle': 'limitingConeAngle',
        'markerheight': 'markerHeight',
        'markerunits': 'markerUnits',
        'markerwidth': 'markerWidth',
        'maskcontentunits': 'maskContentUnits',
        'maskunits': 'maskUnits',
        'numoctaves': 'numOctaves',
        'pathlength': 'pathLength',
        'patterncontentunits': 'patternContentUnits',
        'patterntransform': 'patternTransform',
        'patternunits': 'patternUnits',
        'pointsatx': 'pointsAtX',
        'pointsaty': 'pointsAtY',
        'pointsatz': 'pointsAtZ',
        'preservealpha': 'preserveAlpha',
        'preserveaspectratio': 'preserveAspectRatio',
        'primitiveunits': 'primitiveUnits',
        'refx': 'refX',
        'refy': 'refY',
        'repeatcount': 'repeatCount',
        'repeatdur': 'repeatDur',
        'requiredextensions': 'requiredExtensions',
        'requiredfeatures': 'requiredFeatures',
        'specularconstant': 'specularConstant',
        'specularexponent': 'specularExponent',
        'spreadmethod': 'spreadMethod',
        'startoffset': 'startOffset',
        'stddeviation': 'stdDeviation',
        'stitchtiles': 'stitchTiles',
        'surfacescale': 'surfaceScale',
        'systemlanguage': 'systemLanguage',
        'tablevalues': 'tableValues',
        'targetx': 'targetX',
        'targety': 'targetY',
        'textlength': 'textLength',
        'viewbox': 'viewBox',
        'viewtarget': 'viewTarget',
        'xchannelselector': 'xChannelSelector',
        'ychannelselector': 'yChannelSelector',
        'zoomandpan': 'zoomAndPan'
    },
    XML_ATTRS_ADJUSTMENT_MAP = {
        'xlink:actuate': {prefix: 'xlink', name: 'actuate', namespace: NS.XLINK},
        'xlink:arcrole': {prefix: 'xlink', name: 'arcrole', namespace: NS.XLINK},
        'xlink:href': {prefix: 'xlink', name: 'href', namespace: NS.XLINK},
        'xlink:role': {prefix: 'xlink', name: 'role', namespace: NS.XLINK},
        'xlink:show': {prefix: 'xlink', name: 'show', namespace: NS.XLINK},
        'xlink:title': {prefix: 'xlink', name: 'title', namespace: NS.XLINK},
        'xlink:type': {prefix: 'xlink', name: 'type', namespace: NS.XLINK},
        'xml:base': {prefix: 'xml', name: 'base', namespace: NS.XML},
        'xml:lang': {prefix: 'xml', name: 'lang', namespace: NS.XML},
        'xml:space': {prefix: 'xml', name: 'space', namespace: NS.XML},
        'xmlns': {prefix: '', name: 'xmlns', namespace: NS.XMLNS},
        'xmlns:xlink': {prefix: 'xmlns', name: 'xlink', namespace: NS.XMLNS}

    };

//SVG tag names adjustment map
var SVG_TAG_NAMES_ADJUSTMENT_MAP = {
    'altglyph': 'altGlyph',
    'altglyphdef': 'altGlyphDef',
    'altglyphitem': 'altGlyphItem',
    'animatecolor': 'animateColor',
    'animatemotion': 'animateMotion',
    'animatetransform': 'animateTransform',
    'clippath': 'clipPath',
    'feblend': 'feBlend',
    'fecolormatrix': 'feColorMatrix',
    'fecomponenttransfer': 'feComponentTransfer',
    'fecomposite': 'feComposite',
    'feconvolvematrix': 'feConvolveMatrix',
    'fediffuselighting': 'feDiffuseLighting',
    'fedisplacementmap': 'feDisplacementMap',
    'fedistantlight': 'feDistantLight',
    'feflood': 'feFlood',
    'fefunca': 'feFuncA',
    'fefuncb': 'feFuncB',
    'fefuncg': 'feFuncG',
    'fefuncr': 'feFuncR',
    'fegaussianblur': 'feGaussianBlur',
    'feimage': 'feImage',
    'femerge': 'feMerge',
    'femergenode': 'feMergeNode',
    'femorphology': 'feMorphology',
    'feoffset': 'feOffset',
    'fepointlight': 'fePointLight',
    'fespecularlighting': 'feSpecularLighting',
    'fespotlight': 'feSpotLight',
    'fetile': 'feTile',
    'feturbulence': 'feTurbulence',
    'foreignobject': 'foreignObject',
    'glyphref': 'glyphRef',
    'lineargradient': 'linearGradient',
    'radialgradient': 'radialGradient',
    'textpath': 'textPath'
};

//Tags that causes exit from foreign content
var EXITS_FOREIGN_CONTENT = {};

EXITS_FOREIGN_CONTENT[$.B] = true;
EXITS_FOREIGN_CONTENT[$.BIG] = true;
EXITS_FOREIGN_CONTENT[$.BLOCKQUOTE] = true;
EXITS_FOREIGN_CONTENT[$.BODY] = true;
EXITS_FOREIGN_CONTENT[$.BR] = true;
EXITS_FOREIGN_CONTENT[$.CENTER] = true;
EXITS_FOREIGN_CONTENT[$.CODE] = true;
EXITS_FOREIGN_CONTENT[$.DD] = true;
EXITS_FOREIGN_CONTENT[$.DIV] = true;
EXITS_FOREIGN_CONTENT[$.DL] = true;
EXITS_FOREIGN_CONTENT[$.DT] = true;
EXITS_FOREIGN_CONTENT[$.EM] = true;
EXITS_FOREIGN_CONTENT[$.EMBED] = true;
EXITS_FOREIGN_CONTENT[$.H1] = true;
EXITS_FOREIGN_CONTENT[$.H2] = true;
EXITS_FOREIGN_CONTENT[$.H3] = true;
EXITS_FOREIGN_CONTENT[$.H4] = true;
EXITS_FOREIGN_CONTENT[$.H5] = true;
EXITS_FOREIGN_CONTENT[$.H6] = true;
EXITS_FOREIGN_CONTENT[$.HEAD] = true;
EXITS_FOREIGN_CONTENT[$.HR] = true;
EXITS_FOREIGN_CONTENT[$.I] = true;
EXITS_FOREIGN_CONTENT[$.IMG] = true;
EXITS_FOREIGN_CONTENT[$.LI] = true;
EXITS_FOREIGN_CONTENT[$.LISTING] = true;
EXITS_FOREIGN_CONTENT[$.MENU] = true;
EXITS_FOREIGN_CONTENT[$.META] = true;
EXITS_FOREIGN_CONTENT[$.NOBR] = true;
EXITS_FOREIGN_CONTENT[$.OL] = true;
EXITS_FOREIGN_CONTENT[$.P] = true;
EXITS_FOREIGN_CONTENT[$.PRE] = true;
EXITS_FOREIGN_CONTENT[$.RUBY] = true;
EXITS_FOREIGN_CONTENT[$.S] = true;
EXITS_FOREIGN_CONTENT[$.SMALL] = true;
EXITS_FOREIGN_CONTENT[$.SPAN] = true;
EXITS_FOREIGN_CONTENT[$.STRONG] = true;
EXITS_FOREIGN_CONTENT[$.STRIKE] = true;
EXITS_FOREIGN_CONTENT[$.SUB] = true;
EXITS_FOREIGN_CONTENT[$.SUP] = true;
EXITS_FOREIGN_CONTENT[$.TABLE] = true;
EXITS_FOREIGN_CONTENT[$.TT] = true;
EXITS_FOREIGN_CONTENT[$.U] = true;
EXITS_FOREIGN_CONTENT[$.UL] = true;
EXITS_FOREIGN_CONTENT[$.VAR] = true;

//Check exit from foreign content
exports.causesExit = function (startTagToken) {
    var tn = startTagToken.tagName;

    if (tn === $.FONT && (Tokenizer.getTokenAttr(startTagToken, ATTRS.COLOR) !== null ||
        Tokenizer.getTokenAttr(startTagToken, ATTRS.SIZE) !== null ||
        Tokenizer.getTokenAttr(startTagToken, ATTRS.FACE) !== null)) {
        return true;
    }

    return EXITS_FOREIGN_CONTENT[tn];
};

//Token adjustments
exports.adjustTokenMathMLAttrs = function (token) {
    for (var i = 0; i < token.attrs.length; i++) {
        if (token.attrs[i].name === DEFINITION_URL_ATTR) {
            token.attrs[i].name = ADJUSTED_DEFINITION_URL_ATTR;
            break;
        }
    }
};

exports.adjustTokenSVGAttrs = function (token) {
    for (var i = 0; i < token.attrs.length; i++) {
        var adjustedAttrName = SVG_ATTRS_ADJUSTMENT_MAP[token.attrs[i].name];

        if (adjustedAttrName)
            token.attrs[i].name = adjustedAttrName;
    }
};

exports.adjustTokenXMLAttrs = function (token) {
    for (var i = 0; i < token.attrs.length; i++) {
        var adjustedAttrEntry = XML_ATTRS_ADJUSTMENT_MAP[token.attrs[i].name];

        if (adjustedAttrEntry) {
            token.attrs[i].prefix = adjustedAttrEntry.prefix;
            token.attrs[i].name = adjustedAttrEntry.name;
            token.attrs[i].namespace = adjustedAttrEntry.namespace;
        }
    }
};

exports.adjustTokenSVGTagName = function (token) {
    var adjustedTagName = SVG_TAG_NAMES_ADJUSTMENT_MAP[token.tagName];

    if (adjustedTagName)
        token.tagName = adjustedTagName;
};

//Integration points
exports.isMathMLTextIntegrationPoint = function (tn, ns) {
    return ns === NS.MATHML && (tn === $.MI || tn === $.MO || tn === $.MN || tn === $.MS || tn === $.MTEXT);
};

exports.isHtmlIntegrationPoint = function (tn, ns, attrs) {
    if (ns === NS.MATHML && tn === $.ANNOTATION_XML) {
        for (var i = 0; i < attrs.length; i++) {
            if (attrs[i].name === ATTRS.ENCODING) {
                var value = attrs[i].value.toLowerCase();

                return value === MIME_TYPES.TEXT_HTML || value === MIME_TYPES.APPLICATION_XML;
            }
        }
    }

    return ns === NS.SVG && (tn === $.FOREIGN_OBJECT || tn === $.DESC || tn === $.TITLE);
};

},{"../tokenization/tokenizer":32,"./html":21}],21:[function(require,module,exports){
'use strict';

var NS = exports.NAMESPACES = {
    HTML: 'http://www.w3.org/1999/xhtml',
    MATHML: 'http://www.w3.org/1998/Math/MathML',
    SVG: 'http://www.w3.org/2000/svg',
    XLINK: 'http://www.w3.org/1999/xlink',
    XML: 'http://www.w3.org/XML/1998/namespace',
    XMLNS: 'http://www.w3.org/2000/xmlns/'
};

exports.ATTRS = {
    TYPE: 'type',
    ACTION: 'action',
    ENCODING: 'encoding',
    PROMPT: 'prompt',
    NAME: 'name',
    COLOR: 'color',
    FACE: 'face',
    SIZE: 'size'
};

var $ = exports.TAG_NAMES = {
    A: 'a',
    ADDRESS: 'address',
    ANNOTATION_XML: 'annotation-xml',
    APPLET: 'applet',
    AREA: 'area',
    ARTICLE: 'article',
    ASIDE: 'aside',

    B: 'b',
    BASE: 'base',
    BASEFONT: 'basefont',
    BGSOUND: 'bgsound',
    BIG: 'big',
    BLOCKQUOTE: 'blockquote',
    BODY: 'body',
    BR: 'br',
    BUTTON: 'button',

    CAPTION: 'caption',
    CENTER: 'center',
    CODE: 'code',
    COL: 'col',
    COLGROUP: 'colgroup',
    COMMAND: 'command',

    DD: 'dd',
    DESC: 'desc',
    DETAILS: 'details',
    DIALOG: 'dialog',
    DIR: 'dir',
    DIV: 'div',
    DL: 'dl',
    DT: 'dt',

    EM: 'em',
    EMBED: 'embed',

    FIELDSET: 'fieldset',
    FIGCAPTION: 'figcaption',
    FIGURE: 'figure',
    FONT: 'font',
    FOOTER: 'footer',
    FOREIGN_OBJECT: 'foreignObject',
    FORM: 'form',
    FRAME: 'frame',
    FRAMESET: 'frameset',

    H1: 'h1',
    H2: 'h2',
    H3: 'h3',
    H4: 'h4',
    H5: 'h5',
    H6: 'h6',
    HEAD: 'head',
    HEADER: 'header',
    HGROUP: 'hgroup',
    HR: 'hr',
    HTML: 'html',

    I: 'i',
    IMG: 'img',
    IMAGE: 'image',
    INPUT: 'input',
    IFRAME: 'iframe',
    ISINDEX: 'isindex',

    KEYGEN: 'keygen',

    LABEL: 'label',
    LI: 'li',
    LINK: 'link',
    LISTING: 'listing',

    MAIN: 'main',
    MALIGNMARK: 'malignmark',
    MARQUEE: 'marquee',
    MATH: 'math',
    MENU: 'menu',
    MENUITEM: 'menuitem',
    META: 'meta',
    MGLYPH: 'mglyph',
    MI: 'mi',
    MO: 'mo',
    MN: 'mn',
    MS: 'ms',
    MTEXT: 'mtext',

    NAV: 'nav',
    NOBR: 'nobr',
    NOFRAMES: 'noframes',
    NOEMBED: 'noembed',
    NOSCRIPT: 'noscript',

    OBJECT: 'object',
    OL: 'ol',
    OPTGROUP: 'optgroup',
    OPTION: 'option',

    P: 'p',
    PARAM: 'param',
    PLAINTEXT: 'plaintext',
    PRE: 'pre',

    RP: 'rp',
    RT: 'rt',
    RUBY: 'ruby',

    S: 's',
    SCRIPT: 'script',
    SECTION: 'section',
    SELECT: 'select',
    SOURCE: 'source',
    SMALL: 'small',
    SPAN: 'span',
    STRIKE: 'strike',
    STRONG: 'strong',
    STYLE: 'style',
    SUB: 'sub',
    SUMMARY: 'summary',
    SUP: 'sup',

    TABLE: 'table',
    TBODY: 'tbody',
    TEMPLATE: 'template',
    TEXTAREA: 'textarea',
    TFOOT: 'tfoot',
    TD: 'td',
    TH: 'th',
    THEAD: 'thead',
    TITLE: 'title',
    TR: 'tr',
    TRACK: 'track',
    TT: 'tt',

    U: 'u',
    UL: 'ul',

    SVG: 'svg',

    VAR: 'var',

    WBR: 'wbr',

    XMP: 'xmp'
};

var SPECIAL_ELEMENTS = exports.SPECIAL_ELEMENTS = {};

SPECIAL_ELEMENTS[NS.HTML] = {};
SPECIAL_ELEMENTS[NS.HTML][$.ADDRESS] = true;
SPECIAL_ELEMENTS[NS.HTML][$.APPLET] = true;
SPECIAL_ELEMENTS[NS.HTML][$.AREA] = true;
SPECIAL_ELEMENTS[NS.HTML][$.ARTICLE] = true;
SPECIAL_ELEMENTS[NS.HTML][$.ASIDE] = true;
SPECIAL_ELEMENTS[NS.HTML][$.BASE] = true;
SPECIAL_ELEMENTS[NS.HTML][$.BASEFONT] = true;
SPECIAL_ELEMENTS[NS.HTML][$.BGSOUND] = true;
SPECIAL_ELEMENTS[NS.HTML][$.BLOCKQUOTE] = true;
SPECIAL_ELEMENTS[NS.HTML][$.BODY] = true;
SPECIAL_ELEMENTS[NS.HTML][$.BR] = true;
SPECIAL_ELEMENTS[NS.HTML][$.BUTTON] = true;
SPECIAL_ELEMENTS[NS.HTML][$.CAPTION] = true;
SPECIAL_ELEMENTS[NS.HTML][$.CENTER] = true;
SPECIAL_ELEMENTS[NS.HTML][$.COL] = true;
SPECIAL_ELEMENTS[NS.HTML][$.COLGROUP] = true;
SPECIAL_ELEMENTS[NS.HTML][$.DD] = true;
SPECIAL_ELEMENTS[NS.HTML][$.DETAILS] = true;
SPECIAL_ELEMENTS[NS.HTML][$.DIR] = true;
SPECIAL_ELEMENTS[NS.HTML][$.DIV] = true;
SPECIAL_ELEMENTS[NS.HTML][$.DL] = true;
SPECIAL_ELEMENTS[NS.HTML][$.DT] = true;
SPECIAL_ELEMENTS[NS.HTML][$.EMBED] = true;
SPECIAL_ELEMENTS[NS.HTML][$.FIELDSET] = true;
SPECIAL_ELEMENTS[NS.HTML][$.FIGCAPTION] = true;
SPECIAL_ELEMENTS[NS.HTML][$.FIGURE] = true;
SPECIAL_ELEMENTS[NS.HTML][$.FOOTER] = true;
SPECIAL_ELEMENTS[NS.HTML][$.FORM] = true;
SPECIAL_ELEMENTS[NS.HTML][$.FRAME] = true;
SPECIAL_ELEMENTS[NS.HTML][$.FRAMESET] = true;
SPECIAL_ELEMENTS[NS.HTML][$.H1] = true;
SPECIAL_ELEMENTS[NS.HTML][$.H2] = true;
SPECIAL_ELEMENTS[NS.HTML][$.H3] = true;
SPECIAL_ELEMENTS[NS.HTML][$.H4] = true;
SPECIAL_ELEMENTS[NS.HTML][$.H5] = true;
SPECIAL_ELEMENTS[NS.HTML][$.H6] = true;
SPECIAL_ELEMENTS[NS.HTML][$.HEAD] = true;
SPECIAL_ELEMENTS[NS.HTML][$.HEADER] = true;
SPECIAL_ELEMENTS[NS.HTML][$.HGROUP] = true;
SPECIAL_ELEMENTS[NS.HTML][$.HR] = true;
SPECIAL_ELEMENTS[NS.HTML][$.HTML] = true;
SPECIAL_ELEMENTS[NS.HTML][$.IFRAME] = true;
SPECIAL_ELEMENTS[NS.HTML][$.IMG] = true;
SPECIAL_ELEMENTS[NS.HTML][$.INPUT] = true;
SPECIAL_ELEMENTS[NS.HTML][$.ISINDEX] = true;
SPECIAL_ELEMENTS[NS.HTML][$.LI] = true;
SPECIAL_ELEMENTS[NS.HTML][$.LINK] = true;
SPECIAL_ELEMENTS[NS.HTML][$.LISTING] = true;
SPECIAL_ELEMENTS[NS.HTML][$.MAIN] = true;
SPECIAL_ELEMENTS[NS.HTML][$.MARQUEE] = true;
SPECIAL_ELEMENTS[NS.HTML][$.MENU] = true;
SPECIAL_ELEMENTS[NS.HTML][$.MENUITEM] = true;
SPECIAL_ELEMENTS[NS.HTML][$.META] = true;
SPECIAL_ELEMENTS[NS.HTML][$.NAV] = true;
SPECIAL_ELEMENTS[NS.HTML][$.NOEMBED] = true;
SPECIAL_ELEMENTS[NS.HTML][$.NOFRAMES] = true;
SPECIAL_ELEMENTS[NS.HTML][$.NOSCRIPT] = true;
SPECIAL_ELEMENTS[NS.HTML][$.OBJECT] = true;
SPECIAL_ELEMENTS[NS.HTML][$.OL] = true;
SPECIAL_ELEMENTS[NS.HTML][$.P] = true;
SPECIAL_ELEMENTS[NS.HTML][$.PARAM] = true;
SPECIAL_ELEMENTS[NS.HTML][$.PLAINTEXT] = true;
SPECIAL_ELEMENTS[NS.HTML][$.PRE] = true;
SPECIAL_ELEMENTS[NS.HTML][$.SCRIPT] = true;
SPECIAL_ELEMENTS[NS.HTML][$.SECTION] = true;
SPECIAL_ELEMENTS[NS.HTML][$.SELECT] = true;
SPECIAL_ELEMENTS[NS.HTML][$.SOURCE] = true;
SPECIAL_ELEMENTS[NS.HTML][$.STYLE] = true;
SPECIAL_ELEMENTS[NS.HTML][$.SUMMARY] = true;
SPECIAL_ELEMENTS[NS.HTML][$.TABLE] = true;
SPECIAL_ELEMENTS[NS.HTML][$.TBODY] = true;
SPECIAL_ELEMENTS[NS.HTML][$.TD] = true;
SPECIAL_ELEMENTS[NS.HTML][$.TEMPLATE] = true;
SPECIAL_ELEMENTS[NS.HTML][$.TEXTAREA] = true;
SPECIAL_ELEMENTS[NS.HTML][$.TFOOT] = true;
SPECIAL_ELEMENTS[NS.HTML][$.TH] = true;
SPECIAL_ELEMENTS[NS.HTML][$.THEAD] = true;
SPECIAL_ELEMENTS[NS.HTML][$.TITLE] = true;
SPECIAL_ELEMENTS[NS.HTML][$.TR] = true;
SPECIAL_ELEMENTS[NS.HTML][$.TRACK] = true;
SPECIAL_ELEMENTS[NS.HTML][$.UL] = true;
SPECIAL_ELEMENTS[NS.HTML][$.WBR] = true;
SPECIAL_ELEMENTS[NS.HTML][$.XMP] = true;

SPECIAL_ELEMENTS[NS.MATHML] = {};
SPECIAL_ELEMENTS[NS.MATHML][$.MI] = true;
SPECIAL_ELEMENTS[NS.MATHML][$.MO] = true;
SPECIAL_ELEMENTS[NS.MATHML][$.MN] = true;
SPECIAL_ELEMENTS[NS.MATHML][$.MS] = true;
SPECIAL_ELEMENTS[NS.MATHML][$.MTEXT] = true;
SPECIAL_ELEMENTS[NS.MATHML][$.ANNOTATION_XML] = true;

SPECIAL_ELEMENTS[NS.SVG] = {};
SPECIAL_ELEMENTS[NS.SVG][$.TITLE] = true;
SPECIAL_ELEMENTS[NS.SVG][$.FOREIGN_OBJECT] = true;
SPECIAL_ELEMENTS[NS.SVG][$.DESC] = true;

},{}],22:[function(require,module,exports){
'use strict';

exports.REPLACEMENT_CHARACTER = '\uFFFD';

exports.CODE_POINTS = {
    EOF: -1,
    NULL: 0x00,
    TABULATION: 0x09,
    CARRIAGE_RETURN: 0x0D,
    LINE_FEED: 0x0A,
    FORM_FEED: 0x0C,
    SPACE: 0x20,
    EXCLAMATION_MARK: 0x21,
    QUOTATION_MARK: 0x22,
    NUMBER_SIGN: 0x23,
    AMPERSAND: 0x26,
    APOSTROPHE: 0x27,
    HYPHEN_MINUS: 0x2D,
    SOLIDUS: 0x2F,
    DIGIT_0: 0x30,
    DIGIT_9: 0x39,
    SEMICOLON: 0x3B,
    LESS_THAN_SIGN: 0x3C,
    EQUALS_SIGN: 0x3D,
    GREATER_THAN_SIGN: 0x3E,
    QUESTION_MARK: 0x3F,
    LATIN_CAPITAL_A: 0x41,
    LATIN_CAPITAL_F: 0x46,
    LATIN_CAPITAL_X: 0x58,
    LATIN_CAPITAL_Z: 0x5A,
    GRAVE_ACCENT: 0x60,
    LATIN_SMALL_A: 0x61,
    LATIN_SMALL_F: 0x66,
    LATIN_SMALL_X: 0x78,
    LATIN_SMALL_Z: 0x7A,
    BOM: 0xFEFF,
    REPLACEMENT_CHARACTER: 0xFFFD
};

exports.CODE_POINT_SEQUENCES = {
    DASH_DASH_STRING: [0x2D, 0x2D], //--
    DOCTYPE_STRING: [0x44, 0x4F, 0x43, 0x54, 0x59, 0x50, 0x45], //DOCTYPE
    CDATA_START_STRING: [0x5B, 0x43, 0x44, 0x41, 0x54, 0x41, 0x5B], //[CDATA[
    CDATA_END_STRING: [0x5D, 0x5D, 0x3E], //]]>
    SCRIPT_STRING: [0x73, 0x63, 0x72, 0x69, 0x70, 0x74], //script
    PUBLIC_STRING: [0x50, 0x55, 0x42, 0x4C, 0x49, 0x43], //PUBLIC
    SYSTEM_STRING: [0x53, 0x59, 0x53, 0x54, 0x45, 0x4D] //SYSTEM
};

},{}],23:[function(require,module,exports){
'use strict';

exports.mergeOptions = function (defaults, options) {
    options = options || {};

    return [defaults, options].reduce(function (merged, optObj) {
        Object.keys(optObj).forEach(function (key) {
            merged[key] = optObj[key];
        });

        return merged;
    }, {});
};

},{}],24:[function(require,module,exports){
(function (process){
'use strict';

var Parser = require('../tree_construction/parser'),
    ParsingUnit = require('./parsing_unit');

//API
exports.parseDocument = function (html, treeAdapter) {
    //NOTE: this should be reentrant, so we create new parser here
    var parser = new Parser(treeAdapter),
        parsingUnit = new ParsingUnit(parser);

    //NOTE: override parser loop method
    parser._runParsingLoop = function () {
        parsingUnit.parsingLoopLock = true;

        while (!parsingUnit.suspended && !this.stopped)
            this._iterateParsingLoop();

        parsingUnit.parsingLoopLock = false;

        if (this.stopped)
            parsingUnit.callback(this.document);
    };

    //NOTE: wait while parserController will be adopted by calling code, then
    //start parsing
    process.nextTick(function () {
        parser.parse(html);
    });

    return parsingUnit;
};

exports.parseInnerHtml = function (innerHtml, contextElement, treeAdapter) {
    //NOTE: this should be reentrant, so we create new parser here
    var parser = new Parser(treeAdapter);

    return parser.parseFragment(innerHtml, contextElement);
};
}).call(this,require("IrXUsu"))
},{"../tree_construction/parser":38,"./parsing_unit":25,"IrXUsu":17}],25:[function(require,module,exports){
'use strict';

var ParsingUnit = module.exports = function (parser) {
    this.parser = parser;
    this.suspended = false;
    this.parsingLoopLock = false;
    this.callback = null;
};

ParsingUnit.prototype._stateGuard = function (suspend) {
    if (this.suspended && suspend)
        throw new Error('parse5: Parser was already suspended. Please, check your control flow logic.');

    else if (!this.suspended && !suspend)
        throw new Error('parse5: Parser was already resumed. Please, check your control flow logic.');

    return suspend;
};

ParsingUnit.prototype.suspend = function () {
    this.suspended = this._stateGuard(true);

    return this;
};

ParsingUnit.prototype.resume = function () {
    this.suspended = this._stateGuard(false);

    //NOTE: don't enter parsing loop if it is locked. Without this lock _runParsingLoop() may be called
    //while parsing loop is still running. E.g. when suspend() and resume() called synchronously.
    if (!this.parsingLoopLock)
        this.parser._runParsingLoop();

    return this;
};

ParsingUnit.prototype.documentWrite = function (html) {
    this.parser.tokenizer.preprocessor.write(html);

    return this;
};

ParsingUnit.prototype.handleScripts = function (scriptHandler) {
    this.parser.scriptHandler = scriptHandler;

    return this;
};

ParsingUnit.prototype.done = function (callback) {
    this.callback = callback;

    return this;
};

},{}],26:[function(require,module,exports){
'use strict';

var DefaultTreeAdapter = require('../tree_adapters/default'),
    Doctype = require('../common/doctype'),
    Utils = require('../common/utils'),
    HTML = require('../common/html');

//Aliases
var $ = HTML.TAG_NAMES,
    NS = HTML.NAMESPACES;

//Default serializer options
var DEFAULT_OPTIONS = {
    encodeHtmlEntities: true
};

//Escaping regexes
var AMP_REGEX = /&/g,
    NBSP_REGEX = /\u00a0/g,
    DOUBLE_QUOTE_REGEX = /"/g,
    LT_REGEX = /</g,
    GT_REGEX = />/g;

//Escape string
function escapeString(str, attrMode) {
    str = str
        .replace(AMP_REGEX, '&amp;')
        .replace(NBSP_REGEX, '&nbsp;');

    if (attrMode)
        str = str.replace(DOUBLE_QUOTE_REGEX, '&quot;');

    else {
        str = str
            .replace(LT_REGEX, '&lt;')
            .replace(GT_REGEX, '&gt;');
    }

    return str;
}


//Enquote doctype ID



//Serializer
var Serializer = module.exports = function (treeAdapter, options) {
    this.treeAdapter = treeAdapter || DefaultTreeAdapter;
    this.options = Utils.mergeOptions(DEFAULT_OPTIONS, options);
};


//API
Serializer.prototype.serialize = function (node) {
    this.html = '';
    this._serializeChildNodes(node);

    return this.html;
};


//Internals
Serializer.prototype._serializeChildNodes = function (parentNode) {
    var childNodes = this.treeAdapter.getChildNodes(parentNode);

    if (childNodes) {
        for (var i = 0, cnLength = childNodes.length; i < cnLength; i++) {
            var currentNode = childNodes[i];

            if (this.treeAdapter.isElementNode(currentNode))
                this._serializeElement(currentNode);

            else if (this.treeAdapter.isTextNode(currentNode))
                this._serializeTextNode(currentNode);

            else if (this.treeAdapter.isCommentNode(currentNode))
                this._serializeCommentNode(currentNode);

            else if (this.treeAdapter.isDocumentTypeNode(currentNode))
                this._serializeDocumentTypeNode(currentNode);
        }
    }
};

Serializer.prototype._serializeElement = function (node) {
    var tn = this.treeAdapter.getTagName(node),
        ns = this.treeAdapter.getNamespaceURI(node),
        qualifiedTn = (ns === NS.HTML || ns === NS.SVG || ns === NS.MATHML) ? tn : (ns + ':' + tn);

    this.html += '<' + qualifiedTn;
    this._serializeAttributes(node);
    this.html += '>';

    if (tn !== $.AREA && tn !== $.BASE && tn !== $.BASEFONT && tn !== $.BGSOUND && tn !== $.BR && tn !== $.BR &&
        tn !== $.COL && tn !== $.EMBED && tn !== $.FRAME && tn !== $.HR && tn !== $.IMG && tn !== $.INPUT &&
        tn !== $.KEYGEN && tn !== $.LINK && tn !== $.MENUITEM && tn !== $.META && tn !== $.PARAM && tn !== $.SOURCE &&
        tn !== $.TRACK && tn !== $.WBR) {

        if (tn === $.PRE || tn === $.TEXTAREA || tn === $.LISTING) {
            var firstChild = this.treeAdapter.getFirstChild(node);

            if (firstChild && this.treeAdapter.isTextNode(firstChild)) {
                var content = this.treeAdapter.getTextNodeContent(firstChild);

                if (content[0] === '\n')
                    this.html += '\n';
            }
        }

        var childNodesHolder = tn === $.TEMPLATE && ns === NS.HTML ?
                               this.treeAdapter.getChildNodes(node)[0] :
                               node;

        this._serializeChildNodes(childNodesHolder);
        this.html += '</' + qualifiedTn + '>';
    }
};

Serializer.prototype._serializeAttributes = function (node) {
    var attrs = this.treeAdapter.getAttrList(node);

    for (var i = 0, attrsLength = attrs.length; i < attrsLength; i++) {
        var attr = attrs[i],
            value = this.options.encodeHtmlEntities ? escapeString(attr.value, true) : attr.value;

        this.html += ' ';

        if (!attr.namespace)
            this.html += attr.name;

        else if (attr.namespace === NS.XML)
            this.html += 'xml:' + attr.name;

        else if (attr.namespace === NS.XMLNS) {
            if (attr.name !== 'xmlns')
                this.html += 'xmlns:';

            this.html += attr.name;
        }

        else if (attr.namespace === NS.XLINK)
            this.html += 'xlink:' + attr.name;

        else
            this.html += attr.namespace + ':' + attr.name;

        this.html += '="' + value + '"';
    }
};

Serializer.prototype._serializeTextNode = function (node) {
    var content = this.treeAdapter.getTextNodeContent(node),
        parent = this.treeAdapter.getParentNode(node),
        parentTn = void 0;

    if (parent && this.treeAdapter.isElementNode(parent))
        parentTn = this.treeAdapter.getTagName(parent);

    if (parentTn === $.STYLE || parentTn === $.SCRIPT || parentTn === $.XMP || parentTn === $.IFRAME ||
        parentTn === $.NOEMBED || parentTn === $.NOFRAMES || parentTn === $.PLAINTEXT || parentTn === $.NOSCRIPT) {
        this.html += content;
    }

    else
        this.html += this.options.encodeHtmlEntities ? escapeString(content, false) : content;
};

Serializer.prototype._serializeCommentNode = function (node) {
    this.html += '<!--' + this.treeAdapter.getCommentNodeContent(node) + '-->';
};

Serializer.prototype._serializeDocumentTypeNode = function (node) {
    var name = this.treeAdapter.getDocumentTypeNodeName(node),
        publicId = this.treeAdapter.getDocumentTypeNodePublicId(node),
        systemId = this.treeAdapter.getDocumentTypeNodeSystemId(node);

    this.html += '<' + Doctype.serializeContent(name, publicId, systemId) + '>';
};

},{"../common/doctype":19,"../common/html":21,"../common/utils":23,"../tree_adapters/default":33}],27:[function(require,module,exports){
'use strict';

var Tokenizer = require('../tokenization/tokenizer'),
    TokenizerProxy = require('./tokenizer_proxy'),
    Utils = require('../common/utils');

//Default options
var DEFAULT_OPTIONS = {
    decodeHtmlEntities: true,
    locationInfo: false
};

//Skipping handler
function skip() {
    //NOTE: do nothing =)
}

//SimpleApiParser
var SimpleApiParser = module.exports = function (handlers, options) {
    this.options = Utils.mergeOptions(DEFAULT_OPTIONS, options);
    this.handlers = {
        doctype: this._wrapHandler(handlers.doctype),
        startTag: this._wrapHandler(handlers.startTag),
        endTag: this._wrapHandler(handlers.endTag),
        text: this._wrapHandler(handlers.text),
        comment: this._wrapHandler(handlers.comment)
    };
};

SimpleApiParser.prototype._wrapHandler = function (handler) {
    var parser = this;

    handler = handler || skip;

    if (this.options.locationInfo) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            args.push(parser.currentTokenLocation);
            handler.apply(handler, args);
        };
    }

    return handler;
};

//API
SimpleApiParser.prototype.parse = function (html) {
    var token = null;

    this._reset(html);

    do {
        token = this.tokenizerProxy.getNextToken();

        if (token.type === Tokenizer.CHARACTER_TOKEN ||
            token.type === Tokenizer.WHITESPACE_CHARACTER_TOKEN ||
            token.type === Tokenizer.NULL_CHARACTER_TOKEN) {

            if (this.options.locationInfo) {
                if (this.pendingText === null)
                    this.currentTokenLocation = token.location;

                else
                    this.currentTokenLocation.end = token.location.end;
            }

            this.pendingText = (this.pendingText || '') + token.chars;
        }

        else {
            this._emitPendingText();
            this._handleToken(token);
        }
    } while (token.type !== Tokenizer.EOF_TOKEN);
};

//Internals
SimpleApiParser.prototype._handleToken = function (token) {
    if (this.options.locationInfo)
        this.currentTokenLocation = token.location;

    if (token.type === Tokenizer.START_TAG_TOKEN)
        this.handlers.startTag(token.tagName, token.attrs, token.selfClosing);

    else if (token.type === Tokenizer.END_TAG_TOKEN)
        this.handlers.endTag(token.tagName);

    else if (token.type === Tokenizer.COMMENT_TOKEN)
        this.handlers.comment(token.data);

    else if (token.type === Tokenizer.DOCTYPE_TOKEN)
        this.handlers.doctype(token.name, token.publicId, token.systemId);

};

SimpleApiParser.prototype._reset = function (html) {
    this.tokenizerProxy = new TokenizerProxy(html, this.options);
    this.pendingText = null;
    this.currentTokenLocation = null;
};

SimpleApiParser.prototype._emitPendingText = function () {
    if (this.pendingText !== null) {
        this.handlers.text(this.pendingText);
        this.pendingText = null;
    }
};

},{"../common/utils":23,"../tokenization/tokenizer":32,"./tokenizer_proxy":28}],28:[function(require,module,exports){
'use strict';

var Tokenizer = require('../tokenization/tokenizer'),
    ForeignContent = require('../common/foreign_content'),
    UNICODE = require('../common/unicode'),
    HTML = require('../common/html');

//Aliases
var $ = HTML.TAG_NAMES,
    NS = HTML.NAMESPACES;


//Tokenizer proxy
//NOTE: this proxy simulates adjustment of the Tokenizer which performed by standard parser during tree construction.
var TokenizerProxy = module.exports = function (html, options) {
    this.tokenizer = new Tokenizer(html, options);

    this.namespaceStack = [];
    this.namespaceStackTop = -1;
    this.currentNamespace = null;
    this.inForeignContent = false;
};

//API
TokenizerProxy.prototype.getNextToken = function () {
    var token = this.tokenizer.getNextToken();

    if (token.type === Tokenizer.START_TAG_TOKEN)
        this._handleStartTagToken(token);

    else if (token.type === Tokenizer.END_TAG_TOKEN)
        this._handleEndTagToken(token);

    else if (token.type === Tokenizer.NULL_CHARACTER_TOKEN && this.inForeignContent) {
        token.type = Tokenizer.CHARACTER_TOKEN;
        token.chars = UNICODE.REPLACEMENT_CHARACTER;
    }

    return token;
};

//Namespace stack mutations
TokenizerProxy.prototype._enterNamespace = function (namespace) {
    this.namespaceStackTop++;
    this.namespaceStack.push(namespace);

    this.inForeignContent = namespace !== NS.HTML;
    this.currentNamespace = namespace;
    this.tokenizer.allowCDATA = this.inForeignContent;
};

TokenizerProxy.prototype._leaveCurrentNamespace = function () {
    this.namespaceStackTop--;
    this.namespaceStack.pop();

    this.currentNamespace = this.namespaceStack[this.namespaceStackTop];
    this.inForeignContent = this.currentNamespace !== NS.HTML;
    this.tokenizer.allowCDATA = this.inForeignContent;
};

//Token handlers
TokenizerProxy.prototype._ensureTokenizerMode = function (tn) {
    if (tn === $.TEXTAREA || tn === $.TITLE)
        this.tokenizer.state = Tokenizer.MODE.RCDATA;

    else if (tn === $.PLAINTEXT)
        this.tokenizer.state = Tokenizer.MODE.PLAINTEXT;

    else if (tn === $.SCRIPT)
        this.tokenizer.state = Tokenizer.MODE.SCRIPT_DATA;

    else if (tn === $.STYLE || tn === $.IFRAME || tn === $.XMP ||
             tn === $.NOEMBED || tn === $.NOFRAMES || tn === $.NOSCRIPT) {
        this.tokenizer.state = Tokenizer.MODE.RAWTEXT;
    }
};

TokenizerProxy.prototype._handleStartTagToken = function (token) {
    var tn = token.tagName;

    if (tn === $.SVG)
        this._enterNamespace(NS.SVG);

    else if (tn === $.MATH)
        this._enterNamespace(NS.MATHML);

    else {
        if (this.inForeignContent) {
            if (ForeignContent.causesExit(token))
                this._leaveCurrentNamespace();

            else if (ForeignContent.isMathMLTextIntegrationPoint(tn, this.currentNamespace) ||
                     ForeignContent.isHtmlIntegrationPoint(tn, this.currentNamespace, token.attrs)) {
                this._enterNamespace(NS.HTML);
            }
        }

        else
            this._ensureTokenizerMode(tn);
    }
};

TokenizerProxy.prototype._handleEndTagToken = function (token) {
    var tn = token.tagName;

    if (!this.inForeignContent) {
        var previousNs = this.namespaceStack[this.namespaceStackTop - 1];

        //NOTE: check for exit from integration point
        if (ForeignContent.isMathMLTextIntegrationPoint(tn, previousNs) ||
            ForeignContent.isHtmlIntegrationPoint(tn, previousNs, token.attrs)) {
            this._leaveCurrentNamespace();
        }

        else if (tn === $.SCRIPT)
            this.tokenizer.state = Tokenizer.MODE.DATA;
    }

    else if ((tn === $.SVG && this.currentNamespace === NS.SVG) ||
             (tn === $.MATH && this.currentNamespace === NS.MATHML))
        this._leaveCurrentNamespace();
};

},{"../common/foreign_content":20,"../common/html":21,"../common/unicode":22,"../tokenization/tokenizer":32}],29:[function(require,module,exports){
'use strict';

exports.assign = function (tokenizer) {
    //NOTE: obtain Tokenizer proto this way to avoid module circular references
    var tokenizerProto = Object.getPrototypeOf(tokenizer);

    tokenizer.tokenStartLoc = -1;

    //NOTE: add location info builder method
    tokenizer._attachLocationInfo = function (token) {
        token.location = {
            start: this.tokenStartLoc,
            end: -1
        };
    };

    //NOTE: patch token creation methods and attach location objects
    tokenizer._createStartTagToken = function (tagNameFirstCh) {
        tokenizerProto._createStartTagToken.call(this, tagNameFirstCh);
        this._attachLocationInfo(this.currentToken);
    };

    tokenizer._createEndTagToken = function (tagNameFirstCh) {
        tokenizerProto._createEndTagToken.call(this, tagNameFirstCh);
        this._attachLocationInfo(this.currentToken);
    };

    tokenizer._createCommentToken = function () {
        tokenizerProto._createCommentToken.call(this);
        this._attachLocationInfo(this.currentToken);
    };

    tokenizer._createDoctypeToken = function (doctypeNameFirstCh) {
        tokenizerProto._createDoctypeToken.call(this, doctypeNameFirstCh);
        this._attachLocationInfo(this.currentToken);
    };

    tokenizer._createCharacterToken = function (type, ch) {
        tokenizerProto._createCharacterToken.call(this, type, ch);
        this._attachLocationInfo(this.currentCharacterToken);
    };

    //NOTE: patch token emission methods to determine end location
    tokenizer._emitCurrentToken = function () {
        //NOTE: if we have pending character token make it's end location equal to the
        //current token's start location.
        if (this.currentCharacterToken)
            this.currentCharacterToken.location.end = this.currentToken.location.start;

        this.currentToken.location.end = this.preprocessor.pos + 1;
        tokenizerProto._emitCurrentToken.call(this);
    };

    tokenizer._emitCurrentCharacterToken = function () {
        //NOTE: if we have character token and it's location wasn't set in the _emitCurrentToken(),
        //then set it's location at the current preprocessor position
        if (this.currentCharacterToken && this.currentCharacterToken.location.end === -1) {
            //NOTE: we don't need to increment preprocessor position, since character token
            //emission is always forced by the start of the next character token here.
            //So, we already have advanced position.
            this.currentCharacterToken.location.end = this.preprocessor.pos;
        }

        tokenizerProto._emitCurrentCharacterToken.call(this);
    };

    //NOTE: patch initial states for each mode to obtain token start position
    Object.keys(tokenizerProto.MODE)

        .map(function (modeName) {
            return tokenizerProto.MODE[modeName];
        })

        .forEach(function (state) {
            tokenizer[state] = function (cp) {
                this.tokenStartLoc = this.preprocessor.pos;
                tokenizerProto[state].call(this, cp);
            };
        });
};

},{}],30:[function(require,module,exports){
'use strict';

//NOTE: this file contains auto generated trie structure that is used for named entity references consumption
//(see: http://www.whatwg.org/specs/web-apps/current-work/multipage/tokenization.html#tokenizing-character-references and
//http://www.whatwg.org/specs/web-apps/current-work/multipage/named-character-references.html#named-character-references)
module.exports = {
    0x41: {l: {0x61: {l: {0x63: {l: {0x75: {l: {0x74: {l: {0x65: {l: {0x3B: {c: [193]}}, c: [193]}}}}}}}}}, 0x62: {l: {0x72: {l: {0x65: {l: {0x76: {l: {0x65: {l: {0x3B: {c: [258]}}}}}}}}}}}, 0x63: {l: {0x69: {l: {0x72: {l: {0x63: {l: {0x3B: {c: [194]}}, c: [194]}}}}}, 0x79: {l: {0x3B: {c: [1040]}}}}}, 0x45: {l: {0x6C: {l: {0x69: {l: {0x67: {l: {0x3B: {c: [198]}}, c: [198]}}}}}}}, 0x66: {l: {0x72: {l: {0x3B: {c: [120068]}}}}}, 0x67: {l: {0x72: {l: {0x61: {l: {0x76: {l: {0x65: {l: {0x3B: {c: [192]}}, c: [192]}}}}}}}}}, 0x6C: {l: {0x70: {l: {0x68: {l: {0x61: {l: {0x3B: {c: [913]}}}}}}}}}, 0x6D: {l: {0x61: {l: {0x63: {l: {0x72: {l: {0x3B: {c: [256]}}}}}}}}}, 0x4D: {l: {0x50: {l: {0x3B: {c: [38]}}, c: [38]}}}, 0x6E: {l: {0x64: {l: {0x3B: {c: [10835]}}}}}, 0x6F: {l: {0x67: {l: {0x6F: {l: {0x6E: {l: {0x3B: {c: [260]}}}}}}}, 0x70: {l: {0x66: {l: {0x3B: {c: [120120]}}}}}}}, 0x70: {l: {0x70: {l: {0x6C: {l: {0x79: {l: {0x46: {l: {0x75: {l: {0x6E: {l: {0x63: {l: {0x74: {l: {0x69: {l: {0x6F: {l: {0x6E: {l: {0x3B: {c: [8289]}}}}}}}}}}}}}}}}}}}}}}}}}, 0x72: {l: {0x69: {l: {0x6E: {l: {0x67: {l: {0x3B: {c: [197]}}, c: [197]}}}}}}}, 0x73: {l: {0x63: {l: {0x72: {l: {0x3B: {c: [119964]}}}}}, 0x73: {l: {0x69: {l: {0x67: {l: {0x6E: {l: {0x3B: {c: [8788]}}}}}}}}}}}, 0x74: {l: {0x69: {l: {0x6C: {l: {0x64: {l: {0x65: {l: {0x3B: {c: [195]}}, c: [195]}}}}}}}}}, 0x75: {l: {0x6D: {l: {0x6C: {l: {0x3B: {c: [196]}}, c: [196]}}}}}}},
    0x61: {l: {0x61: {l: {0x63: {l: {0x75: {l: {0x74: {l: {0x65: {l: {0x3B: {c: [225]}}, c: [225]}}}}}}}}}, 0x62: {l: {0x72: {l: {0x65: {l: {0x76: {l: {0x65: {l: {0x3B: {c: [259]}}}}}}}}}}}, 0x63: {l: {0x3B: {c: [8766]}, 0x64: {l: {0x3B: {c: [8767]}}}, 0x45: {l: {0x3B: {c: [8766, 819]}}}, 0x69: {l: {0x72: {l: {0x63: {l: {0x3B: {c: [226]}}, c: [226]}}}}}, 0x75: {l: {0x74: {l: {0x65: {l: {0x3B: {c: [180]}}, c: [180]}}}}}, 0x79: {l: {0x3B: {c: [1072]}}}}}, 0x65: {l: {0x6C: {l: {0x69: {l: {0x67: {l: {0x3B: {c: [230]}}, c: [230]}}}}}}}, 0x66: {l: {0x3B: {c: [8289]}, 0x72: {l: {0x3B: {c: [120094]}}}}}, 0x67: {l: {0x72: {l: {0x61: {l: {0x76: {l: {0x65: {l: {0x3B: {c: [224]}}, c: [224]}}}}}}}}}, 0x6C: {l: {0x65: {l: {0x66: {l: {0x73: {l: {0x79: {l: {0x6D: {l: {0x3B: {c: [8501]}}}}}}}}}, 0x70: {l: {0x68: {l: {0x3B: {c: [8501]}}}}}}}, 0x70: {l: {0x68: {l: {0x61: {l: {0x3B: {c: [945]}}}}}}}}}, 0x6D: {l: {0x61: {l: {0x63: {l: {0x72: {l: {0x3B: {c: [257]}}}}}, 0x6C: {l: {0x67: {l: {0x3B: {c: [10815]}}}}}}}, 0x70: {l: {0x3B: {c: [38]}}, c: [38]}}}, 0x6E: {l: {0x64: {l: {0x61: {l: {0x6E: {l: {0x64: {l: {0x3B: {c: [10837]}}}}}}}, 0x3B: {c: [8743]}, 0x64: {l: {0x3B: {c: [10844]}}}, 0x73: {l: {0x6C: {l: {0x6F: {l: {0x70: {l: {0x65: {l: {0x3B: {c: [10840]}}}}}}}}}}}, 0x76: {l: {0x3B: {c: [10842]}}}}}, 0x67: {l: {0x3B: {c: [8736]}, 0x65: {l: {0x3B: {c: [10660]}}}, 0x6C: {l: {0x65: {l: {0x3B: {c: [8736]}}}}}, 0x6D: {l: {0x73: {l: {0x64: {l: {0x61: {l: {0x61: {l: {0x3B: {c: [10664]}}}, 0x62: {l: {0x3B: {c: [10665]}}}, 0x63: {l: {0x3B: {c: [10666]}}}, 0x64: {l: {0x3B: {c: [10667]}}}, 0x65: {l: {0x3B: {c: [10668]}}}, 0x66: {l: {0x3B: {c: [10669]}}}, 0x67: {l: {0x3B: {c: [10670]}}}, 0x68: {l: {0x3B: {c: [10671]}}}}}, 0x3B: {c: [8737]}}}}}}}, 0x72: {l: {0x74: {l: {0x3B: {c: [8735]}, 0x76: {l: {0x62: {l: {0x3B: {c: [8894]}, 0x64: {l: {0x3B: {c: [10653]}}}}}}}}}}}, 0x73: {l: {0x70: {l: {0x68: {l: {0x3B: {c: [8738]}}}}}, 0x74: {l: {0x3B: {c: [197]}}}}}, 0x7A: {l: {0x61: {l: {0x72: {l: {0x72: {l: {0x3B: {c: [9084]}}}}}}}}}}}}}, 0x6F: {l: {0x67: {l: {0x6F: {l: {0x6E: {l: {0x3B: {c: [261]}}}}}}}, 0x70: {l: {0x66: {l: {0x3B: {c: [120146]}}}}}}}, 0x70: {l: {0x61: {l: {0x63: {l: {0x69: {l: {0x72: {l: {0x3B: {c: [10863]}}}}}}}}}, 0x3B: {c: [8776]}, 0x45: {l: {0x3B: {c: [10864]}}}, 0x65: {l: {0x3B: {c: [8778]}}}, 0x69: {l: {0x64: {l: {0x3B: {c: [8779]}}}}}, 0x6F: {l: {0x73: {l: {0x3B: {c: [39]}}}}}, 0x70: {l: {0x72: {l: {0x6F: {l: {0x78: {l: {0x3B: {c: [8776]}, 0x65: {l: {0x71: {l: {0x3B: {c: [8778]}}}}}}}}}}}}}}}, 0x72: {l: {0x69: {l: {0x6E: {l: {0x67: {l: {0x3B: {c: [229]}}, c: [229]}}}}}}}, 0x73: {l: {0x63: {l: {0x72: {l: {0x3B: {c: [119990]}}}}}, 0x74: {l: {0x3B: {c: [42]}}}, 0x79: {l: {0x6D: {l: {0x70: {l: {0x3B: {c: [8776]}, 0x65: {l: {0x71: {l: {0x3B: {c: [8781]}}}}}}}}}}}}}, 0x74: {l: {0x69: {l: {0x6C: {l: {0x64: {l: {0x65: {l: {0x3B: {c: [227]}}, c: [227]}}}}}}}}}, 0x75: {l: {0x6D: {l: {0x6C: {l: {0x3B: {c: [228]}}, c: [228]}}}}}, 0x77: {l: {0x63: {l: {0x6F: {l: {0x6E: {l: {0x69: {l: {0x6E: {l: {0x74: {l: {0x3B: {c: [8755]}}}}}}}}}}}}}, 0x69: {l: {0x6E: {l: {0x74: {l: {0x3B: {c: [10769]}}}}}}}}}}},
    0x62: {l: {0x61: {l: {0x63: {l: {0x6B: {l: {0x63: {l: {0x6F: {l: {0x6E: {l: {0x67: {l: {0x3B: {c: [8780]}}}}}}}}}, 0x65: {l: {0x70: {l: {0x73: {l: {0x69: {l: {0x6C: {l: {0x6F: {l: {0x6E: {l: {0x3B: {c: [1014]}}}}}}}}}}}}}}}, 0x70: {l: {0x72: {l: {0x69: {l: {0x6D: {l: {0x65: {l: {0x3B: {c: [8245]}}}}}}}}}}}, 0x73: {l: {0x69: {l: {0x6D: {l: {0x3B: {c: [8765]}, 0x65: {l: {0x71: {l: {0x3B: {c: [8909]}}}}}}}}}}}}}}}, 0x72: {l: {0x76: {l: {0x65: {l: {0x65: {l: {0x3B: {c: [8893]}}}}}}}, 0x77: {l: {0x65: {l: {0x64: {l: {0x3B: {c: [8965]}, 0x67: {l: {0x65: {l: {0x3B: {c: [8965]}}}}}}}}}}}}}}}, 0x62: {l: {0x72: {l: {0x6B: {l: {0x3B: {c: [9141]}, 0x74: {l: {0x62: {l: {0x72: {l: {0x6B: {l: {0x3B: {c: [9142]}}}}}}}}}}}}}}}, 0x63: {l: {0x6F: {l: {0x6E: {l: {0x67: {l: {0x3B: {c: [8780]}}}}}}}, 0x79: {l: {0x3B: {c: [1073]}}}}}, 0x64: {l: {0x71: {l: {0x75: {l: {0x6F: {l: {0x3B: {c: [8222]}}}}}}}}}, 0x65: {l: {0x63: {l: {0x61: {l: {0x75: {l: {0x73: {l: {0x3B: {c: [8757]}, 0x65: {l: {0x3B: {c: [8757]}}}}}}}}}}}, 0x6D: {l: {0x70: {l: {0x74: {l: {0x79: {l: {0x76: {l: {0x3B: {c: [10672]}}}}}}}}}}}, 0x70: {l: {0x73: {l: {0x69: {l: {0x3B: {c: [1014]}}}}}}}, 0x72: {l: {0x6E: {l: {0x6F: {l: {0x75: {l: {0x3B: {c: [8492]}}}}}}}}}, 0x74: {l: {0x61: {l: {0x3B: {c: [946]}}}, 0x68: {l: {0x3B: {c: [8502]}}}, 0x77: {l: {0x65: {l: {0x65: {l: {0x6E: {l: {0x3B: {c: [8812]}}}}}}}}}}}}}, 0x66: {l: {0x72: {l: {0x3B: {c: [120095]}}}}}, 0x69: {l: {0x67: {l: {0x63: {l: {0x61: {l: {0x70: {l: {0x3B: {c: [8898]}}}}}, 0x69: {l: {0x72: {l: {0x63: {l: {0x3B: {c: [9711]}}}}}}}, 0x75: {l: {0x70: {l: {0x3B: {c: [8899]}}}}}}}, 0x6F: {l: {0x64: {l: {0x6F: {l: {0x74: {l: {0x3B: {c: [10752]}}}}}}}, 0x70: {l: {0x6C: {l: {0x75: {l: {0x73: {l: {0x3B: {c: [10753]}}}}}}}}}, 0x74: {l: {0x69: {l: {0x6D: {l: {0x65: {l: {0x73: {l: {0x3B: {c: [10754]}}}}}}}}}}}}}, 0x73: {l: {0x71: {l: {0x63: {l: {0x75: {l: {0x70: {l: {0x3B: {c: [10758]}}}}}}}}}, 0x74: {l: {0x61: {l: {0x72: {l: {0x3B: {c: [9733]}}}}}}}}}, 0x74: {l: {0x72: {l: {0x69: {l: {0x61: {l: {0x6E: {l: {0x67: {l: {0x6C: {l: {0x65: {l: {0x64: {l: {0x6F: {l: {0x77: {l: {0x6E: {l: {0x3B: {c: [9661]}}}}}}}}}, 0x75: {l: {0x70: {l: {0x3B: {c: [9651]}}}}}}}}}}}}}}}}}}}}}, 0x75: {l: {0x70: {l: {0x6C: {l: {0x75: {l: {0x73: {l: {0x3B: {c: [10756]}}}}}}}}}}}, 0x76: {l: {0x65: {l: {0x65: {l: {0x3B: {c: [8897]}}}}}}}, 0x77: {l: {0x65: {l: {0x64: {l: {0x67: {l: {0x65: {l: {0x3B: {c: [8896]}}}}}}}}}}}}}}}, 0x6B: {l: {0x61: {l: {0x72: {l: {0x6F: {l: {0x77: {l: {0x3B: {c: [10509]}}}}}}}}}}}, 0x6C: {l: {0x61: {l: {0x63: {l: {0x6B: {l: {0x6C: {l: {0x6F: {l: {0x7A: {l: {0x65: {l: {0x6E: {l: {0x67: {l: {0x65: {l: {0x3B: {c: [10731]}}}}}}}}}}}}}}}, 0x73: {l: {0x71: {l: {0x75: {l: {0x61: {l: {0x72: {l: {0x65: {l: {0x3B: {c: [9642]}}}}}}}}}}}}}, 0x74: {l: {0x72: {l: {0x69: {l: {0x61: {l: {0x6E: {l: {0x67: {l: {0x6C: {l: {0x65: {l: {0x3B: {c: [9652]}, 0x64: {l: {0x6F: {l: {0x77: {l: {0x6E: {l: {0x3B: {c: [9662]}}}}}}}}}, 0x6C: {l: {0x65: {l: {0x66: {l: {0x74: {l: {0x3B: {c: [9666]}}}}}}}}}, 0x72: {l: {0x69: {l: {0x67: {l: {0x68: {l: {0x74: {l: {0x3B: {c: [9656]}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}, 0x6E: {l: {0x6B: {l: {0x3B: {c: [9251]}}}}}}}, 0x6B: {l: {0x31: {l: {0x32: {l: {0x3B: {c: [9618]}}}, 0x34: {l: {0x3B: {c: [9617]}}}}}, 0x33: {l: {0x34: {l: {0x3B: {c: [9619]}}}}}}}, 0x6F: {l: {0x63: {l: {0x6B: {l: {0x3B: {c: [9608]}}}}}}}}}, 0x6E: {l: {0x65: {l: {0x3B: {c: [61, 8421]}, 0x71: {l: {0x75: {l: {0x69: {l: {0x76: {l: {0x3B: {c: [8801, 8421]}}}}}}}}}}}, 0x6F: {l: {0x74: {l: {0x3B: {c: [8976]}}}}}}}, 0x4E: {l: {0x6F: {l: {0x74: {l: {0x3B: {c: [10989]}}}}}}}, 0x6F: {l: {0x70: {l: {0x66: {l: {0x3B: {c: [120147]}}}}}, 0x74: {l: {0x3B: {c: [8869]}, 0x74: {l: {0x6F: {l: {0x6D: {l: {0x3B: {c: [8869]}}}}}}}}}, 0x77: {l: {0x74: {l: {0x69: {l: {0x65: {l: {0x3B: {c: [8904]}}}}}}}}}, 0x78: {l: {0x62: {l: {0x6F: {l: {0x78: {l: {0x3B: {c: [10697]}}}}}}}, 0x64: {l: {0x6C: {l: {0x3B: {c: [9488]}}}, 0x4C: {l: {0x3B: {c: [9557]}}}, 0x72: {l: {0x3B: {c: [9484]}}}, 0x52: {l: {0x3B: {c: [9554]}}}}}, 0x44: {l: {0x6C: {l: {0x3B: {c: [9558]}}}, 0x4C: {l: {0x3B: {c: [9559]}}}, 0x72: {l: {0x3B: {c: [9555]}}}, 0x52: {l: {0x3B: {c: [9556]}}}}}, 0x68: {l: {0x3B: {c: [9472]}, 0x64: {l: {0x3B: {c: [9516]}}}, 0x44: {l: {0x3B: {c: [9573]}}}, 0x75: {l: {0x3B: {c: [9524]}}}, 0x55: {l: {0x3B: {c: [9576]}}}}}, 0x48: {l: {0x3B: {c: [9552]}, 0x64: {l: {0x3B: {c: [9572]}}}, 0x44: {l: {0x3B: {c: [9574]}}}, 0x75: {l: {0x3B: {c: [9575]}}}, 0x55: {l: {0x3B: {c: [9577]}}}}}, 0x6D: {l: {0x69: {l: {0x6E: {l: {0x75: {l: {0x73: {l: {0x3B: {c: [8863]}}}}}}}}}}}, 0x70: {l: {0x6C: {l: {0x75: {l: {0x73: {l: {0x3B: {c: [8862]}}}}}}}}}, 0x74: {l: {0x69: {l: {0x6D: {l: {0x65: {l: {0x73: {l: {0x3B: {c: [8864]}}}}}}}}}}}, 0x75: {l: {0x6C: {l: {0x3B: {c: [9496]}}}, 0x4C: {l: {0x3B: {c: [9563]}}}, 0x72: {l: {0x3B: {c: [9492]}}}, 0x52: {l: {0x3B: {c: [9560]}}}}}, 0x55: {l: {0x6C: {l: {0x3B: {c: [9564]}}}, 0x4C: {l: {0x3B: {c: [9565]}}}, 0x72: {l: {0x3B: {c: [9561]}}}, 0x52: {l: {0x3B: {c: [9562]}}}}}, 0x76: {l: {0x3B: {c: [9474]}, 0x68: {l: {0x3B: {c: [9532]}}}, 0x48: {l: {0x3B: {c: [9578]}}}, 0x6C: {l: {0x3B: {c: [9508]}}}, 0x4C: {l: {0x3B: {c: [9569]}}}, 0x72: {l: {0x3B: {c: [9500]}}}, 0x52: {l: {0x3B: {c: [9566]}}}}}, 0x56: {l: {0x3B: {c: [9553]}, 0x68: {l: {0x3B: {c: [9579]}}}, 0x48: {l: {0x3B: {c: [9580]}}}, 0x6C: {l: {0x3B: {c: [9570]}}}, 0x4C: {l: {0x3B: {c: [9571]}}}, 0x72: {l: {0x3B: {c: [9567]}}}, 0x52: {l: {0x3B: {c: [9568]}}}}}}}}}, 0x70: {l: {0x72: {l: {0x69: {l: {0x6D: {l: {0x65: {l: {0x3B: {c: [8245]}}}}}}}}}}}, 0x72: {l: {0x65: {l: {0x76: {l: {0x65: {l: {0x3B: {c: [728]}}}}}}}, 0x76: {l: {0x62: {l: {0x61: {l: {0x72: {l: {0x3B: {c: [166]}}, c: [166]}}}}}}}}}, 0x73: {l: {0x63: {l: {0x72: {l: {0x3B: {c: [119991]}}}}}, 0x65: {l: {0x6D: {l: {0x69: {l: {0x3B: {c: [8271]}}}}}}}, 0x69: {l: {0x6D: {l: {0x3B: {c: [8765]}, 0x65: {l: {0x3B: {c: [8909]}}}}}}}, 0x6F: {l: {0x6C: {l: {0x62: {l: {0x3B: {c: [10693]}}}, 0x3B: {c: [92]}, 0x68: {l: {0x73: {l: {0x75: {l: {0x62: {l: {0x3B: {c: [10184]}}}}}}}}}}}}}}}, 0x75: {l: {0x6C: {l: {0x6C: {l: {0x3B: {c: [8226]}, 0x65: {l: {0x74: {l: {0x3B: {c: [8226]}}}}}}}}}, 0x6D: {l: {0x70: {l: {0x3B: {c: [8782]}, 0x45: {l: {0x3B: {c: [10926]}}}, 0x65: {l: {0x3B: {c: [8783]}, 0x71: {l: {0x3B: {c: [8783]}}}}}}}}}}}}},
    0x42: {l: {0x61: {l: {0x63: {l: {0x6B: {l: {0x73: {l: {0x6C: {l: {0x61: {l: {0x73: {l: {0x68: {l: {0x3B: {c: [8726]}}}}}}}}}}}}}}}, 0x72: {l: {0x76: {l: {0x3B: {c: [10983]}}}, 0x77: {l: {0x65: {l: {0x64: {l: {0x3B: {c: [8966]}}}}}}}}}}}, 0x63: {l: {0x79: {l: {0x3B: {c: [1041]}}}}}, 0x65: {l: {0x63: {l: {0x61: {l: {0x75: {l: {0x73: {l: {0x65: {l: {0x3B: {c: [8757]}}}}}}}}}}}, 0x72: {l: {0x6E: {l: {0x6F: {l: {0x75: {l: {0x6C: {l: {0x6C: {l: {0x69: {l: {0x73: {l: {0x3B: {c: [8492]}}}}}}}}}}}}}}}}}, 0x74: {l: {0x61: {l: {0x3B: {c: [914]}}}}}}}, 0x66: {l: {0x72: {l: {0x3B: {c: [120069]}}}}}, 0x6F: {l: {0x70: {l: {0x66: {l: {0x3B: {c: [120121]}}}}}}}, 0x72: {l: {0x65: {l: {0x76: {l: {0x65: {l: {0x3B: {c: [728]}}}}}}}}}, 0x73: {l: {0x63: {l: {0x72: {l: {0x3B: {c: [8492]}}}}}}}, 0x75: {l: {0x6D: {l: {0x70: {l: {0x65: {l: {0x71: {l: {0x3B: {c: [8782]}}}}}}}}}}}}},
    0x43: {l: {0x61: {l: {0x63: {l: {0x75: {l: {0x74: {l: {0x65: {l: {0x3B: {c: [262]}}}}}}}}}, 0x70: {l: {0x3B: {c: [8914]}, 0x69: {l: {0x74: {l: {0x61: {l: {0x6C: {l: {0x44: {l: {0x69: {l: {0x66: {l: {0x66: {l: {0x65: {l: {0x72: {l: {0x65: {l: {0x6E: {l: {0x74: {l: {0x69: {l: {0x61: {l: {0x6C: {l: {0x44: {l: {0x3B: {c: [8517]}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}, 0x79: {l: {0x6C: {l: {0x65: {l: {0x79: {l: {0x73: {l: {0x3B: {c: [8493]}}}}}}}}}}}}}, 0x63: {l: {0x61: {l: {0x72: {l: {0x6F: {l: {0x6E: {l: {0x3B: {c: [268]}}}}}}}}}, 0x65: {l: {0x64: {l: {0x69: {l: {0x6C: {l: {0x3B: {c: [199]}}, c: [199]}}}}}}}, 0x69: {l: {0x72: {l: {0x63: {l: {0x3B: {c: [264]}}}}}}}, 0x6F: {l: {0x6E: {l: {0x69: {l: {0x6E: {l: {0x74: {l: {0x3B: {c: [8752]}}}}}}}}}}}}}, 0x64: {l: {0x6F: {l: {0x74: {l: {0x3B: {c: [266]}}}}}}}, 0x65: {l: {0x64: {l: {0x69: {l: {0x6C: {l: {0x6C: {l: {0x61: {l: {0x3B: {c: [184]}}}}}}}}}}}, 0x6E: {l: {0x74: {l: {0x65: {l: {0x72: {l: {0x44: {l: {0x6F: {l: {0x74: {l: {0x3B: {c: [183]}}}}}}}}}}}}}}}}}, 0x66: {l: {0x72: {l: {0x3B: {c: [8493]}}}}}, 0x48: {l: {0x63: {l: {0x79: {l: {0x3B: {c: [1063]}}}}}}}, 0x68: {l: {0x69: {l: {0x3B: {c: [935]}}}}}, 0x69: {l: {0x72: {l: {0x63: {l: {0x6C: {l: {0x65: {l: {0x44: {l: {0x6F: {l: {0x74: {l: {0x3B: {c: [8857]}}}}}}}, 0x4D: {l: {0x69: {l: {0x6E: {l: {0x75: {l: {0x73: {l: {0x3B: {c: [8854]}}}}}}}}}}}, 0x50: {l: {0x6C: {l: {0x75: {l: {0x73: {l: {0x3B: {c: [8853]}}}}}}}}}, 0x54: {l: {0x69: {l: {0x6D: {l: {0x65: {l: {0x73: {l: {0x3B: {c: [8855]}}}}}}}}}}}}}}}}}}}}}, 0x6C: {l: {0x6F: {l: {0x63: {l: {0x6B: {l: {0x77: {l: {0x69: {l: {0x73: {l: {0x65: {l: {0x43: {l: {0x6F: {l: {0x6E: {l: {0x74: {l: {0x6F: {l: {0x75: {l: {0x72: {l: {0x49: {l: {0x6E: {l: {0x74: {l: {0x65: {l: {0x67: {l: {0x72: {l: {0x61: {l: {0x6C: {l: {0x3B: {c: [8754]}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}, 0x73: {l: {0x65: {l: {0x43: {l: {0x75: {l: {0x72: {l: {0x6C: {l: {0x79: {l: {0x44: {l: {0x6F: {l: {0x75: {l: {0x62: {l: {0x6C: {l: {0x65: {l: {0x51: {l: {0x75: {l: {0x6F: {l: {0x74: {l: {0x65: {l: {0x3B: {c: [8221]}}}}}}}}}}}}}}}}}}}}}}}, 0x51: {l: {0x75: {l: {0x6F: {l: {0x74: {l: {0x65: {l: {0x3B: {c: [8217]}}}}}}}}}}}}}}}}}}}}}}}}}}}}}, 0x6F: {l: {0x6C: {l: {0x6F: {l: {0x6E: {l: {0x3B: {c: [8759]}, 0x65: {l: {0x3B: {c: [10868]}}}}}}}}}, 0x6E: {l: {0x67: {l: {0x72: {l: {0x75: {l: {0x65: {l: {0x6E: {l: {0x74: {l: {0x3B: {c: [8801]}}}}}}}}}}}}}, 0x69: {l: {0x6E: {l: {0x74: {l: {0x3B: {c: [8751]}}}}}}}, 0x74: {l: {0x6F: {l: {0x75: {l: {0x72: {l: {0x49: {l: {0x6E: {l: {0x74: {l: {0x65: {l: {0x67: {l: {0x72: {l: {0x61: {l: {0x6C: {l: {0x3B: {c: [8750]}}}}}}}}}}}}}}}}}}}}}}}}}}}, 0x70: {l: {0x66: {l: {0x3B: {c: [8450]}}}, 0x72: {l: {0x6F: {l: {0x64: {l: {0x75: {l: {0x63: {l: {0x74: {l: {0x3B: {c: [8720]}}}}}}}}}}}}}}}, 0x75: {l: {0x6E: {l: {0x74: {l: {0x65: {l: {0x72: {l: {0x43: {l: {0x6C: {l: {0x6F: {l: {0x63: {l: {0x6B: {l: {0x77: {l: {0x69: {l: {0x73: {l: {0x65: {l: {0x43: {l: {0x6F: {l: {0x6E: {l: {0x74: {l: {0x6F: {l: {0x75: {l: {0x72: {l: {0x49: {l: {0x6E: {l: {0x74: {l: {0x65: {l: {0x67: {l: {0x72: {l: {0x61: {l: {0x6C: {l: {0x3B: {c: [8755]}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}, 0x4F: {l: {0x50: {l: {0x59: {l: {0x3B: {c: [169]}}, c: [169]}}}}}, 0x72: {l: {0x6F: {l: {0x73: {l: {0x73: {l: {0x3B: {c: [10799]}}}}}}}}}, 0x73: {l: {0x63: {l: {0x72: {l: {0x3B: {c: [119966]}}}}}}}, 0x75: {l: {0x70: {l: {0x43: {l: {0x61: {l: {0x70: {l: {0x3B: {c: [8781]}}}}}}}, 0x3B: {c: [8915]}}}}}}},
    0x63: {l: {0x61: {l: {0x63: {l: {0x75: {l: {0x74: {l: {0x65: {l: {0x3B: {c: [263]}}}}}}}}}, 0x70: {l: {0x61: {l: {0x6E: {l: {0x64: {l: {0x3B: {c: [10820]}}}}}}}, 0x62: {l: {0x72: {l: {0x63: {l: {0x75: {l: {0x70: {l: {0x3B: {c: [10825]}}}}}}}}}}}, 0x63: {l: {0x61: {l: {0x70: {l: {0x3B: {c: [10827]}}}}}, 0x75: {l: {0x70: {l: {0x3B: {c: [10823]}}}}}}}, 0x3B: {c: [8745]}, 0x64: {l: {0x6F: {l: {0x74: {l: {0x3B: {c: [10816]}}}}}}}, 0x73: {l: {0x3B: {c: [8745, 65024]}}}}}, 0x72: {l: {0x65: {l: {0x74: {l: {0x3B: {c: [8257]}}}}}, 0x6F: {l: {0x6E: {l: {0x3B: {c: [711]}}}}}}}}}, 0x63: {l: {0x61: {l: {0x70: {l: {0x73: {l: {0x3B: {c: [10829]}}}}}, 0x72: {l: {0x6F: {l: {0x6E: {l: {0x3B: {c: [269]}}}}}}}}}, 0x65: {l: {0x64: {l: {0x69: {l: {0x6C: {l: {0x3B: {c: [231]}}, c: [231]}}}}}}}, 0x69: {l: {0x72: {l: {0x63: {l: {0x3B: {c: [265]}}}}}}}, 0x75: {l: {0x70: {l: {0x73: {l: {0x3B: {c: [10828]}, 0x73: {l: {0x6D: {l: {0x3B: {c: [10832]}}}}}}}}}}}}}, 0x64: {l: {0x6F: {l: {0x74: {l: {0x3B: {c: [267]}}}}}}}, 0x65: {l: {0x64: {l: {0x69: {l: {0x6C: {l: {0x3B: {c: [184]}}, c: [184]}}}}}, 0x6D: {l: {0x70: {l: {0x74: {l: {0x79: {l: {0x76: {l: {0x3B: {c: [10674]}}}}}}}}}}}, 0x6E: {l: {0x74: {l: {0x3B: {c: [162]}, 0x65: {l: {0x72: {l: {0x64: {l: {0x6F: {l: {0x74: {l: {0x3B: {c: [183]}}}}}}}}}}}}, c: [162]}}}}}, 0x66: {l: {0x72: {l: {0x3B: {c: [120096]}}}}}, 0x68: {l: {0x63: {l: {0x79: {l: {0x3B: {c: [1095]}}}}}, 0x65: {l: {0x63: {l: {0x6B: {l: {0x3B: {c: [10003]}, 0x6D: {l: {0x61: {l: {0x72: {l: {0x6B: {l: {0x3B: {c: [10003]}}}}}}}}}}}}}}}, 0x69: {l: {0x3B: {c: [967]}}}}}, 0x69: {l: {0x72: {l: {0x63: {l: {0x3B: {c: [710]}, 0x65: {l: {0x71: {l: {0x3B: {c: [8791]}}}}}, 0x6C: {l: {0x65: {l: {0x61: {l: {0x72: {l: {0x72: {l: {0x6F: {l: {0x77: {l: {0x6C: {l: {0x65: {l: {0x66: {l: {0x74: {l: {0x3B: {c: [8634]}}}}}}}}}, 0x72: {l: {0x69: {l: {0x67: {l: {0x68: {l: {0x74: {l: {0x3B: {c: [8635]}}}}}}}}}}}}}}}}}}}}}, 0x64: {l: {0x61: {l: {0x73: {l: {0x74: {l: {0x3B: {c: [8859]}}}}}}}, 0x63: {l: {0x69: {l: {0x72: {l: {0x63: {l: {0x3B: {c: [8858]}}}}}}}}}, 0x64: {l: {0x61: {l: {0x73: {l: {0x68: {l: {0x3B: {c: [8861]}}}}}}}}}, 0x52: {l: {0x3B: {c: [174]}}}, 0x53: {l: {0x3B: {c: [9416]}}}}}}}}}}}, 0x3B: {c: [9675]}, 0x45: {l: {0x3B: {c: [10691]}}}, 0x65: {l: {0x3B: {c: [8791]}}}, 0x66: {l: {0x6E: {l: {0x69: {l: {0x6E: {l: {0x74: {l: {0x3B: {c: [10768]}}}}}}}}}}}, 0x6D: {l: {0x69: {l: {0x64: {l: {0x3B: {c: [10991]}}}}}}}, 0x73: {l: {0x63: {l: {0x69: {l: {0x72: {l: {0x3B: {c: [10690]}}}}}}}}}}}}}, 0x6C: {l: {0x75: {l: {0x62: {l: {0x73: {l: {0x3B: {c: [9827]}, 0x75: {l: {0x69: {l: {0x74: {l: {0x3B: {c: [9827]}}}}}}}}}}}}}}}, 0x6F: {l: {0x6C: {l: {0x6F: {l: {0x6E: {l: {0x3B: {c: [58]}, 0x65: {l: {0x3B: {c: [8788]}, 0x71: {l: {0x3B: {c: [8788]}}}}}}}}}}}, 0x6D: {l: {0x6D: {l: {0x61: {l: {0x3B: {c: [44]}, 0x74: {l: {0x3B: {c: [64]}}}}}}}, 0x70: {l: {0x3B: {c: [8705]}, 0x66: {l: {0x6E: {l: {0x3B: {c: [8728]}}}}}, 0x6C: {l: {0x65: {l: {0x6D: {l: {0x65: {l: {0x6E: {l: {0x74: {l: {0x3B: {c: [8705]}}}}}}}}}, 0x78: {l: {0x65: {l: {0x73: {l: {0x3B: {c: [8450]}}}}}}}}}}}}}}}, 0x6E: {l: {0x67: {l: {0x3B: {c: [8773]}, 0x64: {l: {0x6F: {l: {0x74: {l: {0x3B: {c: [10861]}}}}}}}}}, 0x69: {l: {0x6E: {l: {0x74: {l: {0x3B: {c: [8750]}}}}}}}}}, 0x70: {l: {0x66: {l: {0x3B: {c: [120148]}}}, 0x72: {l: {0x6F: {l: {0x64: {l: {0x3B: {c: [8720]}}}}}}}, 0x79: {l: {0x3B: {c: [169]}, 0x73: {l: {0x72: {l: {0x3B: {c: [8471]}}}}}}, c: [169]}}}}}, 0x72: {l: {0x61: {l: {0x72: {l: {0x72: {l: {0x3B: {c: [8629]}}}}}}}, 0x6F: {l: {0x73: {l: {0x73: {l: {0x3B: {c: [10007]}}}}}}}}}, 0x73: {l: {0x63: {l: {0x72: {l: {0x3B: {c: [119992]}}}}}, 0x75: {l: {0x62: {l: {0x3B: {c: [10959]}, 0x65: {l: {0x3B: {c: [10961]}}}}}, 0x70: {l: {0x3B: {c: [10960]}, 0x65: {l: {0x3B: {c: [10962]}}}}}}}}}, 0x74: {l: {0x64: {l: {0x6F: {l: {0x74: {l: {0x3B: {c: [8943]}}}}}}}}}, 0x75: {l: {0x64: {l: {0x61: {l: {0x72: {l: {0x72: {l: {0x6C: {l: {0x3B: {c: [10552]}}}, 0x72: {l: {0x3B: {c: [10549]}}}}}}}}}}}, 0x65: {l: {0x70: {l: {0x72: {l: {0x3B: {c: [8926]}}}}}, 0x73: {l: {0x63: {l: {0x3B: {c: [8927]}}}}}}}, 0x6C: {l: {0x61: {l: {0x72: {l: {0x72: {l: {0x3B: {c: [8630]}, 0x70: {l: {0x3B: {c: [10557]}}}}}}}}}}}, 0x70: {l: {0x62: {l: {0x72: {l: {0x63: {l: {0x61: {l: {0x70: {l: {0x3B: {c: [10824]}}}}}}}}}}}, 0x63: {l: {0x61: {l: {0x70: {l: {0x3B: {c: [10822]}}}}}, 0x75: {l: {0x70: {l: {0x3B: {c: [10826]}}}}}}}, 0x3B: {c: [8746]}, 0x64: {l: {0x6F: {l: {0x74: {l: {0x3B: {c: [8845]}}}}}}}, 0x6F: {l: {0x72: {l: {0x3B: {c: [10821]}}}}}, 0x73: {l: {0x3B: {c: [8746, 65024]}}}}}, 0x72: {l: {0x61: {l: {0x72: {l: {0x72: {l: {0x3B: {c: [8631]}, 0x6D: {l: {0x3B: {c: [10556]}}}}}}}}}, 0x6C: {l: {0x79: {l: {0x65: {l: {0x71: {l: {0x70: {l: {0x72: {l: {0x65: {l: {0x63: {l: {0x3B: {c: [8926]}}}}}}}}}, 0x73: {l: {0x75: {l: {0x63: {l: {0x63: {l: {0x3B: {c: [8927]}}}}}}}}}}}}}, 0x76: {l: {0x65: {l: {0x65: {l: {0x3B: {c: [8910]}}}}}}}, 0x77: {l: {0x65: {l: {0x64: {l: {0x67: {l: {0x65: {l: {0x3B: {c: [8911]}}}}}}}}}}}}}}}, 0x72: {l: {0x65: {l: {0x6E: {l: {0x3B: {c: [164]}}, c: [164]}}}}}, 0x76: {l: {0x65: {l: {0x61: {l: {0x72: {l: {0x72: {l: {0x6F: {l: {0x77: {l: {0x6C: {l: {0x65: {l: {0x66: {l: {0x74: {l: {0x3B: {c: [8630]}}}}}}}}}, 0x72: {l: {0x69: {l: {0x67: {l: {0x68: {l: {0x74: {l: {0x3B: {c: [8631]}}}}}}}}}}}}}}}}}}}}}}}}}}}, 0x76: {l: {0x65: {l: {0x65: {l: {0x3B: {c: [8910]}}}}}}}, 0x77: {l: {0x65: {l: {0x64: {l: {0x3B: {c: [8911]}}}}}}}}}, 0x77: {l: {0x63: {l: {0x6F: {l: {0x6E: {l: {0x69: {l: {0x6E: {l: {0x74: {l: {0x3B: {c: [8754]}}}}}}}}}}}}}, 0x69: {l: {0x6E: {l: {0x74: {l: {0x3B: {c: [8753]}}}}}}}}}, 0x79: {l: {0x6C: {l: {0x63: {l: {0x74: {l: {0x79: {l: {0x3B: {c: [9005]}}}}}}}}}}}}},
    0x64: {l: {0x61: {l: {0x67: {l: {0x67: {l: {0x65: {l: {0x72: {l: {0x3B: {c: [8224]}}}}}}}}}, 0x6C: {l: {0x65: {l: {0x74: {l: {0x68: {l: {0x3B: {c: [8504]}}}}}}}}}, 0x72: {l: {0x72: {l: {0x3B: {c: [8595]}}}}}, 0x73: {l: {0x68: {l: {0x3B: {c: [8208]}, 0x76: {l: {0x3B: {c: [8867]}}}}}}}}}, 0x41: {l: {0x72: {l: {0x72: {l: {0x3B: {c: [8659]}}}}}}}, 0x62: {l: {0x6B: {l: {0x61: {l: {0x72: {l: {0x6F: {l: {0x77: {l: {0x3B: {c: [10511]}}}}}}}}}}}, 0x6C: {l: {0x61: {l: {0x63: {l: {0x3B: {c: [733]}}}}}}}}}, 0x63: {l: {0x61: {l: {0x72: {l: {0x6F: {l: {0x6E: {l: {0x3B: {c: [271]}}}}}}}}}, 0x79: {l: {0x3B: {c: [1076]}}}}}, 0x64: {l: {0x61: {l: {0x67: {l: {0x67: {l: {0x65: {l: {0x72: {l: {0x3B: {c: [8225]}}}}}}}}}, 0x72: {l: {0x72: {l: {0x3B: {c: [8650]}}}}}}}, 0x3B: {c: [8518]}, 0x6F: {l: {0x74: {l: {0x73: {l: {0x65: {l: {0x71: {l: {0x3B: {c: [10871]}}}}}}}}}}}}}, 0x65: {l: {0x67: {l: {0x3B: {c: [176]}}, c: [176]}, 0x6C: {l: {0x74: {l: {0x61: {l: {0x3B: {c: [948]}}}}}}}, 0x6D: {l: {0x70: {l: {0x74: {l: {0x79: {l: {0x76: {l: {0x3B: {c: [10673]}}}}}}}}}}}}}, 0x66: {l: {0x69: {l: {0x73: {l: {0x68: {l: {0x74: {l: {0x3B: {c: [10623]}}}}}}}}}, 0x72: {l: {0x3B: {c: [120097]}}}}}, 0x48: {l: {0x61: {l: {0x72: {l: {0x3B: {c: [10597]}}}}}}}, 0x68: {l: {0x61: {l: {0x72: {l: {0x6C: {l: {0x3B: {c: [8643]}}}, 0x72: {l: {0x3B: {c: [8642]}}}}}}}}}, 0x69: {l: {0x61: {l: {0x6D: {l: {0x3B: {c: [8900]}, 0x6F: {l: {0x6E: {l: {0x64: {l: {0x3B: {c: [8900]}, 0x73: {l: {0x75: {l: {0x69: {l: {0x74: {l: {0x3B: {c: [9830]}}}}}}}}}}}}}}}, 0x73: {l: {0x3B: {c: [9830]}}}}}}}, 0x65: {l: {0x3B: {c: [168]}}}, 0x67: {l: {0x61: {l: {0x6D: {l: {0x6D: {l: {0x61: {l: {0x3B: {c: [989]}}}}}}}}}}}, 0x73: {l: {0x69: {l: {0x6E: {l: {0x3B: {c: [8946]}}}}}}}, 0x76: {l: {0x3B: {c: [247]}, 0x69: {l: {0x64: {l: {0x65: {l: {0x3B: {c: [247]}, 0x6F: {l: {0x6E: {l: {0x74: {l: {0x69: {l: {0x6D: {l: {0x65: {l: {0x73: {l: {0x3B: {c: [8903]}}}}}}}}}}}}}}}}, c: [247]}}}}}, 0x6F: {l: {0x6E: {l: {0x78: {l: {0x3B: {c: [8903]}}}}}}}}}}}, 0x6A: {l: {0x63: {l: {0x79: {l: {0x3B: {c: [1106]}}}}}}}, 0x6C: {l: {0x63: {l: {0x6F: {l: {0x72: {l: {0x6E: {l: {0x3B: {c: [8990]}}}}}}}, 0x72: {l: {0x6F: {l: {0x70: {l: {0x3B: {c: [8973]}}}}}}}}}}}, 0x6F: {l: {0x6C: {l: {0x6C: {l: {0x61: {l: {0x72: {l: {0x3B: {c: [36]}}}}}}}}}, 0x70: {l: {0x66: {l: {0x3B: {c: [120149]}}}}}, 0x74: {l: {0x3B: {c: [729]}, 0x65: {l: {0x71: {l: {0x3B: {c: [8784]}, 0x64: {l: {0x6F: {l: {0x74: {l: {0x3B: {c: [8785]}}}}}}}}}}}, 0x6D: {l: {0x69: {l: {0x6E: {l: {0x75: {l: {0x73: {l: {0x3B: {c: [8760]}}}}}}}}}}}, 0x70: {l: {0x6C: {l: {0x75: {l: {0x73: {l: {0x3B: {c: [8724]}}}}}}}}}, 0x73: {l: {0x71: {l: {0x75: {l: {0x61: {l: {0x72: {l: {0x65: {l: {0x3B: {c: [8865]}}}}}}}}}}}}}}}, 0x75: {l: {0x62: {l: {0x6C: {l: {0x65: {l: {0x62: {l: {0x61: {l: {0x72: {l: {0x77: {l: {0x65: {l: {0x64: {l: {0x67: {l: {0x65: {l: {0x3B: {c: [8966]}}}}}}}}}}}}}}}}}}}}}}}}}, 0x77: {l: {0x6E: {l: {0x61: {l: {0x72: {l: {0x72: {l: {0x6F: {l: {0x77: {l: {0x3B: {c: [8595]}}}}}}}}}}}, 0x64: {l: {0x6F: {l: {0x77: {l: {0x6E: {l: {0x61: {l: {0x72: {l: {0x72: {l: {0x6F: {l: {0x77: {l: {0x73: {l: {0x3B: {c: [8650]}}}}}}}}}}}}}}}}}}}}}, 0x68: {l: {0x61: {l: {0x72: {l: {0x70: {l: {0x6F: {l: {0x6F: {l: {0x6E: {l: {0x6C: {l: {0x65: {l: {0x66: {l: {0x74: {l: {0x3B: {c: [8643]}}}}}}}}}, 0x72: {l: {0x69: {l: {0x67: {l: {0x68: {l: {0x74: {l: {0x3B: {c: [8642]}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}, 0x72: {l: {0x62: {l: {0x6B: {l: {0x61: {l: {0x72: {l: {0x6F: {l: {0x77: {l: {0x3B: {c: [10512]}}}}}}}}}}}}}, 0x63: {l: {0x6F: {l: {0x72: {l: {0x6E: {l: {0x3B: {c: [8991]}}}}}}}, 0x72: {l: {0x6F: {l: {0x70: {l: {0x3B: {c: [8972]}}}}}}}}}}}, 0x73: {l: {0x63: {l: {0x72: {l: {0x3B: {c: [119993]}}}, 0x79: {l: {0x3B: {c: [1109]}}}}}, 0x6F: {l: {0x6C: {l: {0x3B: {c: [10742]}}}}}, 0x74: {l: {0x72: {l: {0x6F: {l: {0x6B: {l: {0x3B: {c: [273]}}}}}}}}}}}, 0x74: {l: {0x64: {l: {0x6F: {l: {0x74: {l: {0x3B: {c: [8945]}}}}}}}, 0x72: {l: {0x69: {l: {0x3B: {c: [9663]}, 0x66: {l: {0x3B: {c: [9662]}}}}}}}}}, 0x75: {l: {0x61: {l: {0x72: {l: {0x72: {l: {0x3B: {c: [8693]}}}}}}}, 0x68: {l: {0x61: {l: {0x72: {l: {0x3B: {c: [10607]}}}}}}}}}, 0x77: {l: {0x61: {l: {0x6E: {l: {0x67: {l: {0x6C: {l: {0x65: {l: {0x3B: {c: [10662]}}}}}}}}}}}}}, 0x7A: {l: {0x63: {l: {0x79: {l: {0x3B: {c: [1119]}}}}}, 0x69: {l: {0x67: {l: {0x72: {l: {0x61: {l: {0x72: {l: {0x72: {l: {0x3B: {c: [10239]}}}}}}}}}}}}}}}}},
    0x44: {l: {0x61: {l: {0x67: {l: {0x67: {l: {0x65: {l: {0x72: {l: {0x3B: {c: [8225]}}}}}}}}}, 0x72: {l: {0x72: {l: {0x3B: {c: [8609]}}}}}, 0x73: {l: {0x68: {l: {0x76: {l: {0x3B: {c: [10980]}}}}}}}}}, 0x63: {l: {0x61: {l: {0x72: {l: {0x6F: {l: {0x6E: {l: {0x3B: {c: [270]}}}}}}}}}, 0x79: {l: {0x3B: {c: [1044]}}}}}, 0x44: {l: {0x3B: {c: [8517]}, 0x6F: {l: {0x74: {l: {0x72: {l: {0x61: {l: {0x68: {l: {0x64: {l: {0x3B: {c: [10513]}}}}}}}}}}}}}}}, 0x65: {l: {0x6C: {l: {0x3B: {c: [8711]}, 0x74: {l: {0x61: {l: {0x3B: {c: [916]}}}}}}}}}, 0x66: {l: {0x72: {l: {0x3B: {c: [120071]}}}}}, 0x69: {l: {0x61: {l: {0x63: {l: {0x72: {l: {0x69: {l: {0x74: {l: {0x69: {l: {0x63: {l: {0x61: {l: {0x6C: {l: {0x41: {l: {0x63: {l: {0x75: {l: {0x74: {l: {0x65: {l: {0x3B: {c: [180]}}}}}}}}}}}, 0x44: {l: {0x6F: {l: {0x74: {l: {0x3B: {c: [729]}}}, 0x75: {l: {0x62: {l: {0x6C: {l: {0x65: {l: {0x41: {l: {0x63: {l: {0x75: {l: {0x74: {l: {0x65: {l: {0x3B: {c: [733]}}}}}}}}}}}}}}}}}}}}}}}, 0x47: {l: {0x72: {l: {0x61: {l: {0x76: {l: {0x65: {l: {0x3B: {c: [96]}}}}}}}}}}}, 0x54: {l: {0x69: {l: {0x6C: {l: {0x64: {l: {0x65: {l: {0x3B: {c: [732]}}}}}}}}}}}}}}}}}}}}}}}}}}}, 0x6D: {l: {0x6F: {l: {0x6E: {l: {0x64: {l: {0x3B: {c: [8900]}}}}}}}}}}}, 0x66: {l: {0x66: {l: {0x65: {l: {0x72: {l: {0x65: {l: {0x6E: {l: {0x74: {l: {0x69: {l: {0x61: {l: {0x6C: {l: {0x44: {l: {0x3B: {c: [8518]}}}}}}}}}}}}}}}}}}}}}}}}}, 0x4A: {l: {0x63: {l: {0x79: {l: {0x3B: {c: [1026]}}}}}}}, 0x6F: {l: {0x70: {l: {0x66: {l: {0x3B: {c: [120123]}}}}}, 0x74: {l: {0x3B: {c: [168]}, 0x44: {l: {0x6F: {l: {0x74: {l: {0x3B: {c: [8412]}}}}}}}, 0x45: {l: {0x71: {l: {0x75: {l: {0x61: {l: {0x6C: {l: {0x3B: {c: [8784]}}}}}}}}}}}}}, 0x75: {l: {0x62: {l: {0x6C: {l: {0x65: {l: {0x43: {l: {0x6F: {l: {0x6E: {l: {0x74: {l: {0x6F: {l: {0x75: {l: {0x72: {l: {0x49: {l: {0x6E: {l: {0x74: {l: {0x65: {l: {0x67: {l: {0x72: {l: {0x61: {l: {0x6C: {l: {0x3B: {c: [8751]}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}, 0x44: {l: {0x6F: {l: {0x74: {l: {0x3B: {c: [168]}}}, 0x77: {l: {0x6E: {l: {0x41: {l: {0x72: {l: {0x72: {l: {0x6F: {l: {0x77: {l: {0x3B: {c: [8659]}}}}}}}}}}}}}}}}}}}, 0x4C: {l: {0x65: {l: {0x66: {l: {0x74: {l: {0x41: {l: {0x72: {l: {0x72: {l: {0x6F: {l: {0x77: {l: {0x3B: {c: [8656]}}}}}}}}}}}, 0x52: {l: {0x69: {l: {0x67: {l: {0x68: {l: {0x74: {l: {0x41: {l: {0x72: {l: {0x72: {l: {0x6F: {l: {0x77: {l: {0x3B: {c: [8660]}}}}}}}}}}}}}}}}}}}}}, 0x54: {l: {0x65: {l: {0x65: {l: {0x3B: {c: [10980]}}}}}}}}}}}}}, 0x6F: {l: {0x6E: {l: {0x67: {l: {0x4C: {l: {0x65: {l: {0x66: {l: {0x74: {l: {0x41: {l: {0x72: {l: {0x72: {l: {0x6F: {l: {0x77: {l: {0x3B: {c: [10232]}}}}}}}}}}}, 0x52: {l: {0x69: {l: {0x67: {l: {0x68: {l: {0x74: {l: {0x41: {l: {0x72: {l: {0x72: {l: {0x6F: {l: {0x77: {l: {0x3B: {c: [10234]}}}}}}}}}}}}}}}}}}}}}}}}}}}}}, 0x52: {l: {0x69: {l: {0x67: {l: {0x68: {l: {0x74: {l: {0x41: {l: {0x72: {l: {0x72: {l: {0x6F: {l: {0x77: {l: {0x3B: {c: [10233]}}}}}}}}}}}}}}}}}}}}}}}}}}}}}, 0x52: {l: {0x69: {l: {0x67: {l: {0x68: {l: {0x74: {l: {0x41: {l: {0x72: {l: {0x72: {l: {0x6F: {l: {0x77: {l: {0x3B: {c: [8658]}}}}}}}}}}}, 0x54: {l: {0x65: {l: {0x65: {l: {0x3B: {c: [8872]}}}}}}}}}}}}}}}}}, 0x55: {l: {0x70: {l: {0x41: {l: {0x72: {l: {0x72: {l: {0x6F: {l: {0x77: {l: {0x3B: {c: [8657]}}}}}}}}}}}, 0x44: {l: {0x6F: {l: {0x77: {l: {0x6E: {l: {0x41: {l: {0x72: {l: {0x72: {l: {0x6F: {l: {0x77: {l: {0x3B: {c: [8661]}}}}}}}}}}}}}}}}}}}}}}}, 0x56: {l: {0x65: {l: {0x72: {l: {0x74: {l: {0x69: {l: {0x63: {l: {0x61: {l: {0x6C: {l: {0x42: {l: {0x61: {l: {0x72: {l: {0x3B: {c: [8741]}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}, 0x77: {l: {0x6E: {l: {0x41: {l: {0x72: {l: {0x72: {l: {0x6F: {l: {0x77: {l: {0x42: {l: {0x61: {l: {0x72: {l: {0x3B: {c: [10515]}}}}}}}, 0x3B: {c: [8595]}, 0x55: {l: {0x70: {l: {0x41: {l: {0x72: {l: {0x72: {l: {0x6F: {l: {0x77: {l: {0x3B: {c: [8693]}}}}}}}}}}}}}}}}}}}}}}}}}, 0x61: {l: {0x72: {l: {0x72: {l: {0x6F: {l: {0x77: {l: {0x3B: {c: [8659]}}}}}}}}}}}, 0x42: {l: {0x72: {l: {0x65: {l: {0x76: {l: {0x65: {l: {0x3B: {c: [785]}}}}}}}}}}}, 0x4C: {l: {0x65: {l: {0x66: {l: {0x74: {l: {0x52: {l: {0x69: {l: {0x67: {l: {0x68: {l: {0x74: {l: {0x56: {l: {0x65: {l: {0x63: {l: {0x74: {l: {0x6F: {l: {0x72: {l: {0x3B: {c: [10576]}}}}}}}}}}}}}}}}}}}}}}}, 0x54: {l: {0x65: {l: {0x65: {l: {0x56: {l: {0x65: {l: {0x63: {l: {0x74: {l: {0x6F: {l: {0x72: {l: {0x3B: {c: [10590]}}}}}}}}}}}}}}}}}}}, 0x56: {l: {0x65: {l: {0x63: {l: {0x74: {l: {0x6F: {l: {0x72: {l: {0x42: {l: {0x61: {l: {0x72: {l: {0x3B: {c: [10582]}}}}}}}, 0x3B: {c: [8637]}}}}}}}}}}}}}}}}}}}}}, 0x52: {l: {0x69: {l: {0x67: {l: {0x68: {l: {0x74: {l: {0x54: {l: {0x65: {l: {0x65: {l: {0x56: {l: {0x65: {l: {0x63: {l: {0x74: {l: {0x6F: {l: {0x72: {l: {0x3B: {c: [10591]}}}}}}}}}}}}}}}}}}}, 0x56: {l: {0x65: {l: {0x63: {l: {0x74: {l: {0x6F: {l: {0x72: {l: {0x42: {l: {0x61: {l: {0x72: {l: {0x3B: {c: [10583]}}}}}}}, 0x3B: {c: [8641]}}}}}}}}}}}}}}}}}}}}}}}, 0x54: {l: {0x65: {l: {0x65: {l: {0x41: {l: {0x72: {l: {0x72: {l: {0x6F: {l: {0x77: {l: {0x3B: {c: [8615]}}}}}}}}}}}, 0x3B: {c: [8868]}}}}}}}}}}}}}, 0x73: {l: {0x63: {l: {0x72: {l: {0x3B: {c: [119967]}}}}}, 0x74: {l: {0x72: {l: {0x6F: {l: {0x6B: {l: {0x3B: {c: [272]}}}}}}}}}}}, 0x53: {l: {0x63: {l: {0x79: {l: {0x3B: {c: [1029]}}}}}}}, 0x5A: {l: {0x63: {l: {0x79: {l: {0x3B: {c: [1039]}}}}}}}}},
    0x45: {l: {0x61: {l: {0x63: {l: {0x75: {l: {0x74: {l: {0x65: {l: {0x3B: {c: [201]}}, c: [201]}}}}}}}}}, 0x63: {l: {0x61: {l: {0x72: {l: {0x6F: {l: {0x6E: {l: {0x3B: {c: [282]}}}}}}}}}, 0x69: {l: {0x72: {l: {0x63: {l: {0x3B: {c: [202]}}, c: [202]}}}}}, 0x79: {l: {0x3B: {c: [1069]}}}}}, 0x64: {l: {0x6F: {l: {0x74: {l: {0x3B: {c: [278]}}}}}}}, 0x66: {l: {0x72: {l: {0x3B: {c: [120072]}}}}}, 0x67: {l: {0x72: {l: {0x61: {l: {0x76: {l: {0x65: {l: {0x3B: {c: [200]}}, c: [200]}}}}}}}}}, 0x6C: {l: {0x65: {l: {0x6D: {l: {0x65: {l: {0x6E: {l: {0x74: {l: {0x3B: {c: [8712]}}}}}}}}}}}}}, 0x6D: {l: {0x61: {l: {0x63: {l: {0x72: {l: {0x3B: {c: [274]}}}}}}}, 0x70: {l: {0x74: {l: {0x79: {l: {0x53: {l: {0x6D: {l: {0x61: {l: {0x6C: {l: {0x6C: {l: {0x53: {l: {0x71: {l: {0x75: {l: {0x61: {l: {0x72: {l: {0x65: {l: {0x3B: {c: [9723]}}}}}}}}}}}}}}}}}}}}}}}, 0x56: {l: {0x65: {l: {0x72: {l: {0x79: {l: {0x53: {l: {0x6D: {l: {0x61: {l: {0x6C: {l: {0x6C: {l: {0x53: {l: {0x71: {l: {0x75: {l: {0x61: {l: {0x72: {l: {0x65: {l: {0x3B: {c: [9643]}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}, 0x4E: {l: {0x47: {l: {0x3B: {c: [330]}}}}}, 0x6F: {l: {0x67: {l: {0x6F: {l: {0x6E: {l: {0x3B: {c: [280]}}}}}}}, 0x70: {l: {0x66: {l: {0x3B: {c: [120124]}}}}}}}, 0x70: {l: {0x73: {l: {0x69: {l: {0x6C: {l: {0x6F: {l: {0x6E: {l: {0x3B: {c: [917]}}}}}}}}}}}}}, 0x71: {l: {0x75: {l: {0x61: {l: {0x6C: {l: {0x3B: {c: [10869]}, 0x54: {l: {0x69: {l: {0x6C: {l: {0x64: {l: {0x65: {l: {0x3B: {c: [8770]}}}}}}}}}}}}}}}, 0x69: {l: {0x6C: {l: {0x69: {l: {0x62: {l: {0x72: {l: {0x69: {l: {0x75: {l: {0x6D: {l: {0x3B: {c: [8652]}}}}}}}}}}}}}}}}}}}}}, 0x73: {l: {0x63: {l: {0x72: {l: {0x3B: {c: [8496]}}}}}, 0x69: {l: {0x6D: {l: {0x3B: {c: [10867]}}}}}}}, 0x74: {l: {0x61: {l: {0x3B: {c: [919]}}}}}, 0x54: {l: {0x48: {l: {0x3B: {c: [208]}}, c: [208]}}}, 0x75: {l: {0x6D: {l: {0x6C: {l: {0x3B: {c: [203]}}, c: [203]}}}}}, 0x78: {l: {0x69: {l: {0x73: {l: {0x74: {l: {0x73: {l: {0x3B: {c: [8707]}}}}}}}}}, 0x70: {l: {0x6F: {l: {0x6E: {l: {0x65: {l: {0x6E: {l: {0x74: {l: {0x69: {l: {0x61: {l: {0x6C: {l: {0x45: {l: {0x3B: {c: [8519]}}}}}}}}}}}}}}}}}}}}}}}}},
    0x65: {l: {0x61: {l: {0x63: {l: {0x75: {l: {0x74: {l: {0x65: {l: {0x3B: {c: [233]}}, c: [233]}}}}}}}, 0x73: {l: {0x74: {l: {0x65: {l: {0x72: {l: {0x3B: {c: [10862]}}}}}}}}}}}, 0x63: {l: {0x61: {l: {0x72: {l: {0x6F: {l: {0x6E: {l: {0x3B: {c: [283]}}}}}}}}}, 0x69: {l: {0x72: {l: {0x63: {l: {0x3B: {c: [234]}}, c: [234]}, 0x3B: {c: [8790]}}}}}, 0x6F: {l: {0x6C: {l: {0x6F: {l: {0x6E: {l: {0x3B: {c: [8789]}}}}}}}}}, 0x79: {l: {0x3B: {c: [1101]}}}}}, 0x44: {l: {0x44: {l: {0x6F: {l: {0x74: {l: {0x3B: {c: [10871]}}}}}}}, 0x6F: {l: {0x74: {l: {0x3B: {c: [8785]}}}}}}}, 0x64: {l: {0x6F: {l: {0x74: {l: {0x3B: {c: [279]}}}}}}}, 0x65: {l: {0x3B: {c: [8519]}}}, 0x66: {l: {0x44: {l: {0x6F: {l: {0x74: {l: {0x3B: {c: [8786]}}}}}}}, 0x72: {l: {0x3B: {c: [120098]}}}}}, 0x67: {l: {0x3B: {c: [10906]}, 0x72: {l: {0x61: {l: {0x76: {l: {0x65: {l: {0x3B: {c: [232]}}, c: [232]}}}}}}}, 0x73: {l: {0x3B: {c: [10902]}, 0x64: {l: {0x6F: {l: {0x74: {l: {0x3B: {c: [10904]}}}}}}}}}}}, 0x6C: {l: {0x3B: {c: [10905]}, 0x69: {l: {0x6E: {l: {0x74: {l: {0x65: {l: {0x72: {l: {0x73: {l: {0x3B: {c: [9191]}}}}}}}}}}}}}, 0x6C: {l: {0x3B: {c: [8467]}}}, 0x73: {l: {0x3B: {c: [10901]}, 0x64: {l: {0x6F: {l: {0x74: {l: {0x3B: {c: [10903]}}}}}}}}}}}, 0x6D: {l: {0x61: {l: {0x63: {l: {0x72: {l: {0x3B: {c: [275]}}}}}}}, 0x70: {l: {0x74: {l: {0x79: {l: {0x3B: {c: [8709]}, 0x73: {l: {0x65: {l: {0x74: {l: {0x3B: {c: [8709]}}}}}}}, 0x76: {l: {0x3B: {c: [8709]}}}}}}}}}, 0x73: {l: {0x70: {l: {0x31: {l: {0x33: {l: {0x3B: {c: [8196]}}}, 0x34: {l: {0x3B: {c: [8197]}}}}}, 0x3B: {c: [8195]}}}}}}}, 0x6E: {l: {0x67: {l: {0x3B: {c: [331]}}}, 0x73: {l: {0x70: {l: {0x3B: {c: [8194]}}}}}}}, 0x6F: {l: {0x67: {l: {0x6F: {l: {0x6E: {l: {0x3B: {c: [281]}}}}}}}, 0x70: {l: {0x66: {l: {0x3B: {c: [120150]}}}}}}}, 0x70: {l: {0x61: {l: {0x72: {l: {0x3B: {c: [8917]}, 0x73: {l: {0x6C: {l: {0x3B: {c: [10723]}}}}}}}}}, 0x6C: {l: {0x75: {l: {0x73: {l: {0x3B: {c: [10865]}}}}}}}, 0x73: {l: {0x69: {l: {0x3B: {c: [949]}, 0x6C: {l: {0x6F: {l: {0x6E: {l: {0x3B: {c: [949]}}}}}}}, 0x76: {l: {0x3B: {c: [1013]}}}}}}}}}, 0x71: {l: {0x63: {l: {0x69: {l: {0x72: {l: {0x63: {l: {0x3B: {c: [8790]}}}}}}}, 0x6F: {l: {0x6C: {l: {0x6F: {l: {0x6E: {l: {0x3B: {c: [8789]}}}}}}}}}}}, 0x73: {l: {0x69: {l: {0x6D: {l: {0x3B: {c: [8770]}}}}}, 0x6C: {l: {0x61: {l: {0x6E: {l: {0x74: {l: {0x67: {l: {0x74: {l: {0x72: {l: {0x3B: {c: [10902]}}}}}}}, 0x6C: {l: {0x65: {l: {0x73: {l: {0x73: {l: {0x3B: {c: [10901]}}}}}}}}}}}}}}}}}}}, 0x75: {l: {0x61: {l: {0x6C: {l: {0x73: {l: {0x3B: {c: [61]}}}}}}}, 0x65: {l: {0x73: {l: {0x74: {l: {0x3B: {c: [8799]}}}}}}}, 0x69: {l: {0x76: {l: {0x3B: {c: [8801]}, 0x44: {l: {0x44: {l: {0x3B: {c: [10872]}}}}}}}}}}}, 0x76: {l: {0x70: {l: {0x61: {l: {0x72: {l: {0x73: {l: {0x6C: {l: {0x3B: {c: [10725]}}}}}}}}}}}}}}}, 0x72: {l: {0x61: {l: {0x72: {l: {0x72: {l: {0x3B: {c: [10609]}}}}}}}, 0x44: {l: {0x6F: {l: {0x74: {l: {0x3B: {c: [8787]}}}}}}}}}, 0x73: {l: {0x63: {l: {0x72: {l: {0x3B: {c: [8495]}}}}}, 0x64: {l: {0x6F: {l: {0x74: {l: {0x3B: {c: [8784]}}}}}}}, 0x69: {l: {0x6D: {l: {0x3B: {c: [8770]}}}}}}}, 0x74: {l: {0x61: {l: {0x3B: {c: [951]}}}, 0x68: {l: {0x3B: {c: [240]}}, c: [240]}}}, 0x75: {l: {0x6D: {l: {0x6C: {l: {0x3B: {c: [235]}}, c: [235]}}}, 0x72: {l: {0x6F: {l: {0x3B: {c: [8364]}}}}}}}, 0x78: {l: {0x63: {l: {0x6C: {l: {0x3B: {c: [33]}}}}}, 0x69: {l: {0x73: {l: {0x74: {l: {0x3B: {c: [8707]}}}}}}}, 0x70: {l: {0x65: {l: {0x63: {l: {0x74: {l: {0x61: {l: {0x74: {l: {0x69: {l: {0x6F: {l: {0x6E: {l: {0x3B: {c: [8496]}}}}}}}}}}}}}}}}}, 0x6F: {l: {0x6E: {l: {0x65: {l: {0x6E: {l: {0x74: {l: {0x69: {l: {0x61: {l: {0x6C: {l: {0x65: {l: {0x3B: {c: [8519]}}}}}}}}}}}}}}}}}}}}}}}}},
    0x66: {l: {0x61: {l: {0x6C: {l: {0x6C: {l: {0x69: {l: {0x6E: {l: {0x67: {l: {0x64: {l: {0x6F: {l: {0x74: {l: {0x73: {l: {0x65: {l: {0x71: {l: {0x3B: {c: [8786]}}}}}}}}}}}}}}}}}}}}}}}}}, 0x63: {l: {0x79: {l: {0x3B: {c: [1092]}}}}}, 0x65: {l: {0x6D: {l: {0x61: {l: {0x6C: {l: {0x65: {l: {0x3B: {c: [9792]}}}}}}}}}}}, 0x66: {l: {0x69: {l: {0x6C: {l: {0x69: {l: {0x67: {l: {0x3B: {c: [64259]}}}}}}}}}, 0x6C: {l: {0x69: {l: {0x67: {l: {0x3B: {c: [64256]}}}}}, 0x6C: {l: {0x69: {l: {0x67: {l: {0x3B: {c: [64260]}}}}}}}}}, 0x72: {l: {0x3B: {c: [120099]}}}}}, 0x69: {l: {0x6C: {l: {0x69: {l: {0x67: {l: {0x3B: {c: [64257]}}}}}}}}}, 0x6A: {l: {0x6C: {l: {0x69: {l: {0x67: {l: {0x3B: {c: [102, 106]}}}}}}}}}, 0x6C: {l: {0x61: {l: {0x74: {l: {0x3B: {c: [9837]}}}}}, 0x6C: {l: {0x69: {l: {0x67: {l: {0x3B: {c: [64258]}}}}}}}, 0x74: {l: {0x6E: {l: {0x73: {l: {0x3B: {c: [9649]}}}}}}}}}, 0x6E: {l: {0x6F: {l: {0x66: {l: {0x3B: {c: [402]}}}}}}}, 0x6F: {l: {0x70: {l: {0x66: {l: {0x3B: {c: [120151]}}}}}, 0x72: {l: {0x61: {l: {0x6C: {l: {0x6C: {l: {0x3B: {c: [8704]}}}}}}}, 0x6B: {l: {0x3B: {c: [8916]}, 0x76: {l: {0x3B: {c: [10969]}}}}}}}}}, 0x70: {l: {0x61: {l: {0x72: {l: {0x74: {l: {0x69: {l: {0x6E: {l: {0x74: {l: {0x3B: {c: [10765]}}}}}}}}}}}}}}}, 0x72: {l: {0x61: {l: {0x63: {l: {0x31: {l: {0x32: {l: {0x3B: {c: [189]}}, c: [189]}, 0x33: {l: {0x3B: {c: [8531]}}}, 0x34: {l: {0x3B: {c: [188]}}, c: [188]}, 0x35: {l: {0x3B: {c: [8533]}}}, 0x36: {l: {0x3B: {c: [8537]}}}, 0x38: {l: {0x3B: {c: [8539]}}}}}, 0x32: {l: {0x33: {l: {0x3B: {c: [8532]}}}, 0x35: {l: {0x3B: {c: [8534]}}}}}, 0x33: {l: {0x34: {l: {0x3B: {c: [190]}}, c: [190]}, 0x35: {l: {0x3B: {c: [8535]}}}, 0x38: {l: {0x3B: {c: [8540]}}}}}, 0x34: {l: {0x35: {l: {0x3B: {c: [8536]}}}}}, 0x35: {l: {0x36: {l: {0x3B: {c: [8538]}}}, 0x38: {l: {0x3B: {c: [8541]}}}}}, 0x37: {l: {0x38: {l: {0x3B: {c: [8542]}}}}}}}, 0x73: {l: {0x6C: {l: {0x3B: {c: [8260]}}}}}}}, 0x6F: {l: {0x77: {l: {0x6E: {l: {0x3B: {c: [8994]}}}}}}}}}, 0x73: {l: {0x63: {l: {0x72: {l: {0x3B: {c: [119995]}}}}}}}}},
    0x46: {l: {0x63: {l: {0x79: {l: {0x3B: {c: [1060]}}}}}, 0x66: {l: {0x72: {l: {0x3B: {c: [120073]}}}}}, 0x69: {l: {0x6C: {l: {0x6C: {l: {0x65: {l: {0x64: {l: {0x53: {l: {0x6D: {l: {0x61: {l: {0x6C: {l: {0x6C: {l: {0x53: {l: {0x71: {l: {0x75: {l: {0x61: {l: {0x72: {l: {0x65: {l: {0x3B: {c: [9724]}}}}}}}}}}}}}}}}}}}}}}}, 0x56: {l: {0x65: {l: {0x72: {l: {0x79: {l: {0x53: {l: {0x6D: {l: {0x61: {l: {0x6C: {l: {0x6C: {l: {0x53: {l: {0x71: {l: {0x75: {l: {0x61: {l: {0x72: {l: {0x65: {l: {0x3B: {c: [9642]}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}, 0x6F: {l: {0x70: {l: {0x66: {l: {0x3B: {c: [120125]}}}}}, 0x72: {l: {0x41: {l: {0x6C: {l: {0x6C: {l: {0x3B: {c: [8704]}}}}}}}}}, 0x75: {l: {0x72: {l: {0x69: {l: {0x65: {l: {0x72: {l: {0x74: {l: {0x72: {l: {0x66: {l: {0x3B: {c: [8497]}}}}}}}}}}}}}}}}}}}, 0x73: {l: {0x63: {l: {0x72: {l: {0x3B: {c: [8497]}}}}}}}}},
    0x67: {l: {0x61: {l: {0x63: {l: {0x75: {l: {0x74: {l: {0x65: {l: {0x3B: {c: [501]}}}}}}}}}, 0x6D: {l: {0x6D: {l: {0x61: {l: {0x3B: {c: [947]}, 0x64: {l: {0x3B: {c: [989]}}}}}}}}}, 0x70: {l: {0x3B: {c: [10886]}}}}}, 0x62: {l: {0x72: {l: {0x65: {l: {0x76: {l: {0x65: {l: {0x3B: {c: [287]}}}}}}}}}}}, 0x63: {l: {0x69: {l: {0x72: {l: {0x63: {l: {0x3B: {c: [285]}}}}}}}, 0x79: {l: {0x3B: {c: [1075]}}}}}, 0x64: {l: {0x6F: {l: {0x74: {l: {0x3B: {c: [289]}}}}}}}, 0x65: {l: {0x3B: {c: [8805]}, 0x6C: {l: {0x3B: {c: [8923]}}}, 0x71: {l: {0x3B: {c: [8805]}, 0x71: {l: {0x3B: {c: [8807]}}}, 0x73: {l: {0x6C: {l: {0x61: {l: {0x6E: {l: {0x74: {l: {0x3B: {c: [10878]}}}}}}}}}}}}}, 0x73: {l: {0x63: {l: {0x63: {l: {0x3B: {c: [10921]}}}}}, 0x3B: {c: [10878]}, 0x64: {l: {0x6F: {l: {0x74: {l: {0x3B: {c: [10880]}, 0x6F: {l: {0x3B: {c: [10882]}, 0x6C: {l: {0x3B: {c: [10884]}}}}}}}}}}}, 0x6C: {l: {0x3B: {c: [8923, 65024]}, 0x65: {l: {0x73: {l: {0x3B: {c: [10900]}}}}}}}}}}}, 0x45: {l: {0x3B: {c: [8807]}, 0x6C: {l: {0x3B: {c: [10892]}}}}}, 0x66: {l: {0x72: {l: {0x3B: {c: [120100]}}}}}, 0x67: {l: {0x3B: {c: [8811]}, 0x67: {l: {0x3B: {c: [8921]}}}}}, 0x69: {l: {0x6D: {l: {0x65: {l: {0x6C: {l: {0x3B: {c: [8503]}}}}}}}}}, 0x6A: {l: {0x63: {l: {0x79: {l: {0x3B: {c: [1107]}}}}}}}, 0x6C: {l: {0x61: {l: {0x3B: {c: [10917]}}}, 0x3B: {c: [8823]}, 0x45: {l: {0x3B: {c: [10898]}}}, 0x6A: {l: {0x3B: {c: [10916]}}}}}, 0x6E: {l: {0x61: {l: {0x70: {l: {0x3B: {c: [10890]}, 0x70: {l: {0x72: {l: {0x6F: {l: {0x78: {l: {0x3B: {c: [10890]}}}}}}}}}}}}}, 0x65: {l: {0x3B: {c: [10888]}, 0x71: {l: {0x3B: {c: [10888]}, 0x71: {l: {0x3B: {c: [8809]}}}}}}}, 0x45: {l: {0x3B: {c: [8809]}}}, 0x73: {l: {0x69: {l: {0x6D: {l: {0x3B: {c: [8935]}}}}}}}}}, 0x6F: {l: {0x70: {l: {0x66: {l: {0x3B: {c: [120152]}}}}}}}, 0x72: {l: {0x61: {l: {0x76: {l: {0x65: {l: {0x3B: {c: [96]}}}}}}}}}, 0x73: {l: {0x63: {l: {0x72: {l: {0x3B: {c: [8458]}}}}}, 0x69: {l: {0x6D: {l: {0x3B: {c: [8819]}, 0x65: {l: {0x3B: {c: [10894]}}}, 0x6C: {l: {0x3B: {c: [10896]}}}}}}}}}, 0x74: {l: {0x63: {l: {0x63: {l: {0x3B: {c: [10919]}}}, 0x69: {l: {0x72: {l: {0x3B: {c: [10874]}}}}}}}, 0x3B: {c: [62]}, 0x64: {l: {0x6F: {l: {0x74: {l: {0x3B: {c: [8919]}}}}}}}, 0x6C: {l: {0x50: {l: {0x61: {l: {0x72: {l: {0x3B: {c: [10645]}}}}}}}}}, 0x71: {l: {0x75: {l: {0x65: {l: {0x73: {l: {0x74: {l: {0x3B: {c: [10876]}}}}}}}}}}}, 0x72: {l: {0x61: {l: {0x70: {l: {0x70: {l: {0x72: {l: {0x6F: {l: {0x78: {l: {0x3B: {c: [10886]}}}}}}}}}}}, 0x72: {l: {0x72: {l: {0x3B: {c: [10616]}}}}}}}, 0x64: {l: {0x6F: {l: {0x74: {l: {0x3B: {c: [8919]}}}}}}}, 0x65: {l: {0x71: {l: {0x6C: {l: {0x65: {l: {0x73: {l: {0x73: {l: {0x3B: {c: [8923]}}}}}}}}}, 0x71: {l: {0x6C: {l: {0x65: {l: {0x73: {l: {0x73: {l: {0x3B: {c: [10892]}}}}}}}}}}}}}}}, 0x6C: {l: {0x65: {l: {0x73: {l: {0x73: {l: {0x3B: {c: [8823]}}}}}}}}}, 0x73: {l: {0x69: {l: {0x6D: {l: {0x3B: {c: [8819]}}}}}}}}}}, c: [62]}, 0x76: {l: {0x65: {l: {0x72: {l: {0x74: {l: {0x6E: {l: {0x65: {l: {0x71: {l: {0x71: {l: {0x3B: {c: [8809, 65024]}}}}}}}}}}}}}}}, 0x6E: {l: {0x45: {l: {0x3B: {c: [8809, 65024]}}}}}}}}},
    0x47: {l: {0x61: {l: {0x6D: {l: {0x6D: {l: {0x61: {l: {0x3B: {c: [915]}, 0x64: {l: {0x3B: {c: [988]}}}}}}}}}}}, 0x62: {l: {0x72: {l: {0x65: {l: {0x76: {l: {0x65: {l: {0x3B: {c: [286]}}}}}}}}}}}, 0x63: {l: {0x65: {l: {0x64: {l: {0x69: {l: {0x6C: {l: {0x3B: {c: [290]}}}}}}}}}, 0x69: {l: {0x72: {l: {0x63: {l: {0x3B: {c: [284]}}}}}}}, 0x79: {l: {0x3B: {c: [1043]}}}}}, 0x64: {l: {0x6F: {l: {0x74: {l: {0x3B: {c: [288]}}}}}}}, 0x66: {l: {0x72: {l: {0x3B: {c: [120074]}}}}}, 0x67: {l: {0x3B: {c: [8921]}}}, 0x4A: {l: {0x63: {l: {0x79: {l: {0x3B: {c: [1027]}}}}}}}, 0x6F: {l: {0x70: {l: {0x66: {l: {0x3B: {c: [120126]}}}}}}}, 0x72: {l: {0x65: {l: {0x61: {l: {0x74: {l: {0x65: {l: {0x72: {l: {0x45: {l: {0x71: {l: {0x75: {l: {0x61: {l: {0x6C: {l: {0x3B: {c: [8805]}, 0x4C: {l: {0x65: {l: {0x73: {l: {0x73: {l: {0x3B: {c: [8923]}}}}}}}}}}}}}}}}}}}, 0x46: {l: {0x75: {l: {0x6C: {l: {0x6C: {l: {0x45: {l: {0x71: {l: {0x75: {l: {0x61: {l: {0x6C: {l: {0x3B: {c: [8807]}}}}}}}}}}}}}}}}}}}, 0x47: {l: {0x72: {l: {0x65: {l: {0x61: {l: {0x74: {l: {0x65: {l: {0x72: {l: {0x3B: {c: [10914]}}}}}}}}}}}}}}}, 0x4C: {l: {0x65: {l: {0x73: {l: {0x73: {l: {0x3B: {c: [8823]}}}}}}}}}, 0x53: {l: {0x6C: {l: {0x61: {l: {0x6E: {l: {0x74: {l: {0x45: {l: {0x71: {l: {0x75: {l: {0x61: {l: {0x6C: {l: {0x3B: {c: [10878]}}}}}}}}}}}}}}}}}}}}}, 0x54: {l: {0x69: {l: {0x6C: {l: {0x64: {l: {0x65: {l: {0x3B: {c: [8819]}}}}}}}}}}}}}}}}}}}}}}}, 0x73: {l: {0x63: {l: {0x72: {l: {0x3B: {c: [119970]}}}}}}}, 0x54: {l: {0x3B: {c: [62]}}, c: [62]}, 0x74: {l: {0x3B: {c: [8811]}}}}},
    0x48: {l: {0x61: {l: {0x63: {l: {0x65: {l: {0x6B: {l: {0x3B: {c: [711]}}}}}}}, 0x74: {l: {0x3B: {c: [94]}}}}}, 0x41: {l: {0x52: {l: {0x44: {l: {0x63: {l: {0x79: {l: {0x3B: {c: [1066]}}}}}}}}}}}, 0x63: {l: {0x69: {l: {0x72: {l: {0x63: {l: {0x3B: {c: [292]}}}}}}}}}, 0x66: {l: {0x72: {l: {0x3B: {c: [8460]}}}}}, 0x69: {l: {0x6C: {l: {0x62: {l: {0x65: {l: {0x72: {l: {0x74: {l: {0x53: {l: {0x70: {l: {0x61: {l: {0x63: {l: {0x65: {l: {0x3B: {c: [8459]}}}}}}}}}}}}}}}}}}}}}}}, 0x6F: {l: {0x70: {l: {0x66: {l: {0x3B: {c: [8461]}}}}}, 0x72: {l: {0x69: {l: {0x7A: {l: {0x6F: {l: {0x6E: {l: {0x74: {l: {0x61: {l: {0x6C: {l: {0x4C: {l: {0x69: {l: {0x6E: {l: {0x65: {l: {0x3B: {c: [9472]}}}}}}}}}}}}}}}}}}}}}}}}}}}, 0x73: {l: {0x63: {l: {0x72: {l: {0x3B: {c: [8459]}}}}}, 0x74: {l: {0x72: {l: {0x6F: {l: {0x6B: {l: {0x3B: {c: [294]}}}}}}}}}}}, 0x75: {l: {0x6D: {l: {0x70: {l: {0x44: {l: {0x6F: {l: {0x77: {l: {0x6E: {l: {0x48: {l: {0x75: {l: {0x6D: {l: {0x70: {l: {0x3B: {c: [8782]}}}}}}}}}}}}}}}}}, 0x45: {l: {0x71: {l: {0x75: {l: {0x61: {l: {0x6C: {l: {0x3B: {c: [8783]}}}}}}}}}}}}}}}}}}},
    0x68: {l: {0x61: {l: {0x69: {l: {0x72: {l: {0x73: {l: {0x70: {l: {0x3B: {c: [8202]}}}}}}}}}, 0x6C: {l: {0x66: {l: {0x3B: {c: [189]}}}}}, 0x6D: {l: {0x69: {l: {0x6C: {l: {0x74: {l: {0x3B: {c: [8459]}}}}}}}}}, 0x72: {l: {0x64: {l: {0x63: {l: {0x79: {l: {0x3B: {c: [1098]}}}}}}}, 0x72: {l: {0x63: {l: {0x69: {l: {0x72: {l: {0x3B: {c: [10568]}}}}}}}, 0x3B: {c: [8596]}, 0x77: {l: {0x3B: {c: [8621]}}}}}}}}}, 0x41: {l: {0x72: {l: {0x72: {l: {0x3B: {c: [8660]}}}}}}}, 0x62: {l: {0x61: {l: {0x72: {l: {0x3B: {c: [8463]}}}}}}}, 0x63: {l: {0x69: {l: {0x72: {l: {0x63: {l: {0x3B: {c: [293]}}}}}}}}}, 0x65: {l: {0x61: {l: {0x72: {l: {0x74: {l: {0x73: {l: {0x3B: {c: [9829]}, 0x75: {l: {0x69: {l: {0x74: {l: {0x3B: {c: [9829]}}}}}}}}}}}}}}}, 0x6C: {l: {0x6C: {l: {0x69: {l: {0x70: {l: {0x3B: {c: [8230]}}}}}}}}}, 0x72: {l: {0x63: {l: {0x6F: {l: {0x6E: {l: {0x3B: {c: [8889]}}}}}}}}}}}, 0x66: {l: {0x72: {l: {0x3B: {c: [120101]}}}}}, 0x6B: {l: {0x73: {l: {0x65: {l: {0x61: {l: {0x72: {l: {0x6F: {l: {0x77: {l: {0x3B: {c: [10533]}}}}}}}}}}}, 0x77: {l: {0x61: {l: {0x72: {l: {0x6F: {l: {0x77: {l: {0x3B: {c: [10534]}}}}}}}}}}}}}}}, 0x6F: {l: {0x61: {l: {0x72: {l: {0x72: {l: {0x3B: {c: [8703]}}}}}}}, 0x6D: {l: {0x74: {l: {0x68: {l: {0x74: {l: {0x3B: {c: [8763]}}}}}}}}}, 0x6F: {l: {0x6B: {l: {0x6C: {l: {0x65: {l: {0x66: {l: {0x74: {l: {0x61: {l: {0x72: {l: {0x72: {l: {0x6F: {l: {0x77: {l: {0x3B: {c: [8617]}}}}}}}}}}}}}}}}}}}, 0x72: {l: {0x69: {l: {0x67: {l: {0x68: {l: {0x74: {l: {0x61: {l: {0x72: {l: {0x72: {l: {0x6F: {l: {0x77: {l: {0x3B: {c: [8618]}}}}}}}}}}}}}}}}}}}}}}}}}, 0x70: {l: {0x66: {l: {0x3B: {c: [120153]}}}}}, 0x72: {l: {0x62: {l: {0x61: {l: {0x72: {l: {0x3B: {c: [8213]}}}}}}}}}}}, 0x73: {l: {0x63: {l: {0x72: {l: {0x3B: {c: [119997]}}}}}, 0x6C: {l: {0x61: {l: {0x73: {l: {0x68: {l: {0x3B: {c: [8463]}}}}}}}}}, 0x74: {l: {0x72: {l: {0x6F: {l: {0x6B: {l: {0x3B: {c: [295]}}}}}}}}}}}, 0x79: {l: {0x62: {l: {0x75: {l: {0x6C: {l: {0x6C: {l: {0x3B: {c: [8259]}}}}}}}}}, 0x70: {l: {0x68: {l: {0x65: {l: {0x6E: {l: {0x3B: {c: [8208]}}}}}}}}}}}}},
    0x49: {l: {0x61: {l: {0x63: {l: {0x75: {l: {0x74: {l: {0x65: {l: {0x3B: {c: [205]}}, c: [205]}}}}}}}}}, 0x63: {l: {0x69: {l: {0x72: {l: {0x63: {l: {0x3B: {c: [206]}}, c: [206]}}}}}, 0x79: {l: {0x3B: {c: [1048]}}}}}, 0x64: {l: {0x6F: {l: {0x74: {l: {0x3B: {c: [304]}}}}}}}, 0x45: {l: {0x63: {l: {0x79: {l: {0x3B: {c: [1045]}}}}}}}, 0x66: {l: {0x72: {l: {0x3B: {c: [8465]}}}}}, 0x67: {l: {0x72: {l: {0x61: {l: {0x76: {l: {0x65: {l: {0x3B: {c: [204]}}, c: [204]}}}}}}}}}, 0x4A: {l: {0x6C: {l: {0x69: {l: {0x67: {l: {0x3B: {c: [306]}}}}}}}}}, 0x6D: {l: {0x61: {l: {0x63: {l: {0x72: {l: {0x3B: {c: [298]}}}}}, 0x67: {l: {0x69: {l: {0x6E: {l: {0x61: {l: {0x72: {l: {0x79: {l: {0x49: {l: {0x3B: {c: [8520]}}}}}}}}}}}}}}}}}, 0x3B: {c: [8465]}, 0x70: {l: {0x6C: {l: {0x69: {l: {0x65: {l: {0x73: {l: {0x3B: {c: [8658]}}}}}}}}}}}}}, 0x6E: {l: {0x74: {l: {0x3B: {c: [8748]}, 0x65: {l: {0x67: {l: {0x72: {l: {0x61: {l: {0x6C: {l: {0x3B: {c: [8747]}}}}}}}}}, 0x72: {l: {0x73: {l: {0x65: {l: {0x63: {l: {0x74: {l: {0x69: {l: {0x6F: {l: {0x6E: {l: {0x3B: {c: [8898]}}}}}}}}}}}}}}}}}}}}}, 0x76: {l: {0x69: {l: {0x73: {l: {0x69: {l: {0x62: {l: {0x6C: {l: {0x65: {l: {0x43: {l: {0x6F: {l: {0x6D: {l: {0x6D: {l: {0x61: {l: {0x3B: {c: [8291]}}}}}}}}}}}, 0x54: {l: {0x69: {l: {0x6D: {l: {0x65: {l: {0x73: {l: {0x3B: {c: [8290]}}}}}}}}}}}}}}}}}}}}}}}}}}}, 0x4F: {l: {0x63: {l: {0x79: {l: {0x3B: {c: [1025]}}}}}}}, 0x6F: {l: {0x67: {l: {0x6F: {l: {0x6E: {l: {0x3B: {c: [302]}}}}}}}, 0x70: {l: {0x66: {l: {0x3B: {c: [120128]}}}}}, 0x74: {l: {0x61: {l: {0x3B: {c: [921]}}}}}}}, 0x73: {l: {0x63: {l: {0x72: {l: {0x3B: {c: [8464]}}}}}}}, 0x74: {l: {0x69: {l: {0x6C: {l: {0x64: {l: {0x65: {l: {0x3B: {c: [296]}}}}}}}}}}}, 0x75: {l: {0x6B: {l: {0x63: {l: {0x79: {l: {0x3B: {c: [1030]}}}}}}}, 0x6D: {l: {0x6C: {l: {0x3B: {c: [207]}}, c: [207]}}}}}}},
    0x69: {l: {0x61: {l: {0x63: {l: {0x75: {l: {0x74: {l: {0x65: {l: {0x3B: {c: [237]}}, c: [237]}}}}}}}}}, 0x63: {l: {0x3B: {c: [8291]}, 0x69: {l: {0x72: {l: {0x63: {l: {0x3B: {c: [238]}}, c: [238]}}}}}, 0x79: {l: {0x3B: {c: [1080]}}}}}, 0x65: {l: {0x63: {l: {0x79: {l: {0x3B: {c: [1077]}}}}}, 0x78: {l: {0x63: {l: {0x6C: {l: {0x3B: {c: [161]}}, c: [161]}}}}}}}, 0x66: {l: {0x66: {l: {0x3B: {c: [8660]}}}, 0x72: {l: {0x3B: {c: [120102]}}}}}, 0x67: {l: {0x72: {l: {0x61: {l: {0x76: {l: {0x65: {l: {0x3B: {c: [236]}}, c: [236]}}}}}}}}}, 0x69: {l: {0x3B: {c: [8520]}, 0x69: {l: {0x69: {l: {0x6E: {l: {0x74: {l: {0x3B: {c: [10764]}}}}}}}, 0x6E: {l: {0x74: {l: {0x3B: {c: [8749]}}}}}}}, 0x6E: {l: {0x66: {l: {0x69: {l: {0x6E: {l: {0x3B: {c: [10716]}}}}}}}}}, 0x6F: {l: {0x74: {l: {0x61: {l: {0x3B: {c: [8489]}}}}}}}}}, 0x6A: {l: {0x6C: {l: {0x69: {l: {0x67: {l: {0x3B: {c: [307]}}}}}}}}}, 0x6D: {l: {0x61: {l: {0x63: {l: {0x72: {l: {0x3B: {c: [299]}}}}}, 0x67: {l: {0x65: {l: {0x3B: {c: [8465]}}}, 0x6C: {l: {0x69: {l: {0x6E: {l: {0x65: {l: {0x3B: {c: [8464]}}}}}}}}}, 0x70: {l: {0x61: {l: {0x72: {l: {0x74: {l: {0x3B: {c: [8465]}}}}}}}}}}}, 0x74: {l: {0x68: {l: {0x3B: {c: [305]}}}}}}}, 0x6F: {l: {0x66: {l: {0x3B: {c: [8887]}}}}}, 0x70: {l: {0x65: {l: {0x64: {l: {0x3B: {c: [437]}}}}}}}}}, 0x6E: {l: {0x63: {l: {0x61: {l: {0x72: {l: {0x65: {l: {0x3B: {c: [8453]}}}}}}}}}, 0x3B: {c: [8712]}, 0x66: {l: {0x69: {l: {0x6E: {l: {0x3B: {c: [8734]}, 0x74: {l: {0x69: {l: {0x65: {l: {0x3B: {c: [10717]}}}}}}}}}}}}}, 0x6F: {l: {0x64: {l: {0x6F: {l: {0x74: {l: {0x3B: {c: [305]}}}}}}}}}, 0x74: {l: {0x63: {l: {0x61: {l: {0x6C: {l: {0x3B: {c: [8890]}}}}}}}, 0x3B: {c: [8747]}, 0x65: {l: {0x67: {l: {0x65: {l: {0x72: {l: {0x73: {l: {0x3B: {c: [8484]}}}}}}}}}, 0x72: {l: {0x63: {l: {0x61: {l: {0x6C: {l: {0x3B: {c: [8890]}}}}}}}}}}}, 0x6C: {l: {0x61: {l: {0x72: {l: {0x68: {l: {0x6B: {l: {0x3B: {c: [10775]}}}}}}}}}}}, 0x70: {l: {0x72: {l: {0x6F: {l: {0x64: {l: {0x3B: {c: [10812]}}}}}}}}}}}}}, 0x6F: {l: {0x63: {l: {0x79: {l: {0x3B: {c: [1105]}}}}}, 0x67: {l: {0x6F: {l: {0x6E: {l: {0x3B: {c: [303]}}}}}}}, 0x70: {l: {0x66: {l: {0x3B: {c: [120154]}}}}}, 0x74: {l: {0x61: {l: {0x3B: {c: [953]}}}}}}}, 0x70: {l: {0x72: {l: {0x6F: {l: {0x64: {l: {0x3B: {c: [10812]}}}}}}}}}, 0x71: {l: {0x75: {l: {0x65: {l: {0x73: {l: {0x74: {l: {0x3B: {c: [191]}}, c: [191]}}}}}}}}}, 0x73: {l: {0x63: {l: {0x72: {l: {0x3B: {c: [119998]}}}}}, 0x69: {l: {0x6E: {l: {0x3B: {c: [8712]}, 0x64: {l: {0x6F: {l: {0x74: {l: {0x3B: {c: [8949]}}}}}}}, 0x45: {l: {0x3B: {c: [8953]}}}, 0x73: {l: {0x3B: {c: [8948]}, 0x76: {l: {0x3B: {c: [8947]}}}}}, 0x76: {l: {0x3B: {c: [8712]}}}}}}}}}, 0x74: {l: {0x3B: {c: [8290]}, 0x69: {l: {0x6C: {l: {0x64: {l: {0x65: {l: {0x3B: {c: [297]}}}}}}}}}}}, 0x75: {l: {0x6B: {l: {0x63: {l: {0x79: {l: {0x3B: {c: [1110]}}}}}}}, 0x6D: {l: {0x6C: {l: {0x3B: {c: [239]}}, c: [239]}}}}}}},
    0x4A: {l: {0x63: {l: {0x69: {l: {0x72: {l: {0x63: {l: {0x3B: {c: [308]}}}}}}}, 0x79: {l: {0x3B: {c: [1049]}}}}}, 0x66: {l: {0x72: {l: {0x3B: {c: [120077]}}}}}, 0x6F: {l: {0x70: {l: {0x66: {l: {0x3B: {c: [120129]}}}}}}}, 0x73: {l: {0x63: {l: {0x72: {l: {0x3B: {c: [119973]}}}}}, 0x65: {l: {0x72: {l: {0x63: {l: {0x79: {l: {0x3B: {c: [1032]}}}}}}}}}}}, 0x75: {l: {0x6B: {l: {0x63: {l: {0x79: {l: {0x3B: {c: [1028]}}}}}}}}}}},
    0x6A: {l: {0x63: {l: {0x69: {l: {0x72: {l: {0x63: {l: {0x3B: {c: [309]}}}}}}}, 0x79: {l: {0x3B: {c: [1081]}}}}}, 0x66: {l: {0x72: {l: {0x3B: {c: [120103]}}}}}, 0x6D: {l: {0x61: {l: {0x74: {l: {0x68: {l: {0x3B: {c: [567]}}}}}}}}}, 0x6F: {l: {0x70: {l: {0x66: {l: {0x3B: {c: [120155]}}}}}}}, 0x73: {l: {0x63: {l: {0x72: {l: {0x3B: {c: [119999]}}}}}, 0x65: {l: {0x72: {l: {0x63: {l: {0x79: {l: {0x3B: {c: [1112]}}}}}}}}}}}, 0x75: {l: {0x6B: {l: {0x63: {l: {0x79: {l: {0x3B: {c: [1108]}}}}}}}}}}},
    0x4B: {l: {0x61: {l: {0x70: {l: {0x70: {l: {0x61: {l: {0x3B: {c: [922]}}}}}}}}}, 0x63: {l: {0x65: {l: {0x64: {l: {0x69: {l: {0x6C: {l: {0x3B: {c: [310]}}}}}}}}}, 0x79: {l: {0x3B: {c: [1050]}}}}}, 0x66: {l: {0x72: {l: {0x3B: {c: [120078]}}}}}, 0x48: {l: {0x63: {l: {0x79: {l: {0x3B: {c: [1061]}}}}}}}, 0x4A: {l: {0x63: {l: {0x79: {l: {0x3B: {c: [1036]}}}}}}}, 0x6F: {l: {0x70: {l: {0x66: {l: {0x3B: {c: [120130]}}}}}}}, 0x73: {l: {0x63: {l: {0x72: {l: {0x3B: {c: [119974]}}}}}}}}},
    0x6B: {l: {0x61: {l: {0x70: {l: {0x70: {l: {0x61: {l: {0x3B: {c: [954]}, 0x76: {l: {0x3B: {c: [1008]}}}}}}}}}}}, 0x63: {l: {0x65: {l: {0x64: {l: {0x69: {l: {0x6C: {l: {0x3B: {c: [311]}}}}}}}}}, 0x79: {l: {0x3B: {c: [1082]}}}}}, 0x66: {l: {0x72: {l: {0x3B: {c: [120104]}}}}}, 0x67: {l: {0x72: {l: {0x65: {l: {0x65: {l: {0x6E: {l: {0x3B: {c: [312]}}}}}}}}}}}, 0x68: {l: {0x63: {l: {0x79: {l: {0x3B: {c: [1093]}}}}}}}, 0x6A: {l: {0x63: {l: {0x79: {l: {0x3B: {c: [1116]}}}}}}}, 0x6F: {l: {0x70: {l: {0x66: {l: {0x3B: {c: [120156]}}}}}}}, 0x73: {l: {0x63: {l: {0x72: {l: {0x3B: {c: [120000]}}}}}}}}},
    0x6C: {l: {0x41: {l: {0x61: {l: {0x72: {l: {0x72: {l: {0x3B: {c: [8666]}}}}}}}, 0x72: {l: {0x72: {l: {0x3B: {c: [8656]}}}}}, 0x74: {l: {0x61: {l: {0x69: {l: {0x6C: {l: {0x3B: {c: [10523]}}}}}}}}}}}, 0x61: {l: {0x63: {l: {0x75: {l: {0x74: {l: {0x65: {l: {0x3B: {c: [314]}}}}}}}}}, 0x65: {l: {0x6D: {l: {0x70: {l: {0x74: {l: {0x79: {l: {0x76: {l: {0x3B: {c: [10676]}}}}}}}}}}}}}, 0x67: {l: {0x72: {l: {0x61: {l: {0x6E: {l: {0x3B: {c: [8466]}}}}}}}}}, 0x6D: {l: {0x62: {l: {0x64: {l: {0x61: {l: {0x3B: {c: [955]}}}}}}}}}, 0x6E: {l: {0x67: {l: {0x3B: {c: [10216]}, 0x64: {l: {0x3B: {c: [10641]}}}, 0x6C: {l: {0x65: {l: {0x3B: {c: [10216]}}}}}}}}}, 0x70: {l: {0x3B: {c: [10885]}}}, 0x71: {l: {0x75: {l: {0x6F: {l: {0x3B: {c: [171]}}, c: [171]}}}}}, 0x72: {l: {0x72: {l: {0x62: {l: {0x3B: {c: [8676]}, 0x66: {l: {0x73: {l: {0x3B: {c: [10527]}}}}}}}, 0x3B: {c: [8592]}, 0x66: {l: {0x73: {l: {0x3B: {c: [10525]}}}}}, 0x68: {l: {0x6B: {l: {0x3B: {c: [8617]}}}}}, 0x6C: {l: {0x70: {l: {0x3B: {c: [8619]}}}}}, 0x70: {l: {0x6C: {l: {0x3B: {c: [10553]}}}}}, 0x73: {l: {0x69: {l: {0x6D: {l: {0x3B: {c: [10611]}}}}}}}, 0x74: {l: {0x6C: {l: {0x3B: {c: [8610]}}}}}}}}}, 0x74: {l: {0x61: {l: {0x69: {l: {0x6C: {l: {0x3B: {c: [10521]}}}}}}}, 0x3B: {c: [10923]}, 0x65: {l: {0x3B: {c: [10925]}, 0x73: {l: {0x3B: {c: [10925, 65024]}}}}}}}}}, 0x62: {l: {0x61: {l: {0x72: {l: {0x72: {l: {0x3B: {c: [10508]}}}}}}}, 0x62: {l: {0x72: {l: {0x6B: {l: {0x3B: {c: [10098]}}}}}}}, 0x72: {l: {0x61: {l: {0x63: {l: {0x65: {l: {0x3B: {c: [123]}}}, 0x6B: {l: {0x3B: {c: [91]}}}}}}}, 0x6B: {l: {0x65: {l: {0x3B: {c: [10635]}}}, 0x73: {l: {0x6C: {l: {0x64: {l: {0x3B: {c: [10639]}}}, 0x75: {l: {0x3B: {c: [10637]}}}}}}}}}}}}}, 0x42: {l: {0x61: {l: {0x72: {l: {0x72: {l: {0x3B: {c: [10510]}}}}}}}}}, 0x63: {l: {0x61: {l: {0x72: {l: {0x6F: {l: {0x6E: {l: {0x3B: {c: [318]}}}}}}}}}, 0x65: {l: {0x64: {l: {0x69: {l: {0x6C: {l: {0x3B: {c: [316]}}}}}}}, 0x69: {l: {0x6C: {l: {0x3B: {c: [8968]}}}}}}}, 0x75: {l: {0x62: {l: {0x3B: {c: [123]}}}}}, 0x79: {l: {0x3B: {c: [1083]}}}}}, 0x64: {l: {0x63: {l: {0x61: {l: {0x3B: {c: [10550]}}}}}, 0x71: {l: {0x75: {l: {0x6F: {l: {0x3B: {c: [8220]}, 0x72: {l: {0x3B: {c: [8222]}}}}}}}}}, 0x72: {l: {0x64: {l: {0x68: {l: {0x61: {l: {0x72: {l: {0x3B: {c: [10599]}}}}}}}}}, 0x75: {l: {0x73: {l: {0x68: {l: {0x61: {l: {0x72: {l: {0x3B: {c: [10571]}}}}}}}}}}}}}, 0x73: {l: {0x68: {l: {0x3B: {c: [8626]}}}}}}}, 0x65: {l: {0x3B: {c: [8804]}, 0x66: {l: {0x74: {l: {0x61: {l: {0x72: {l: {0x72: {l: {0x6F: {l: {0x77: {l: {0x3B: {c: [8592]}, 0x74: {l: {0x61: {l: {0x69: {l: {0x6C: {l: {0x3B: {c: [8610]}}}}}}}}}}}}}}}}}}}, 0x68: {l: {0x61: {l: {0x72: {l: {0x70: {l: {0x6F: {l: {0x6F: {l: {0x6E: {l: {0x64: {l: {0x6F: {l: {0x77: {l: {0x6E: {l: {0x3B: {c: [8637]}}}}}}}}}, 0x75: {l: {0x70: {l: {0x3B: {c: [8636]}}}}}}}}}}}}}}}}}}}, 0x6C: {l: {0x65: {l: {0x66: {l: {0x74: {l: {0x61: {l: {0x72: {l: {0x72: {l: {0x6F: {l: {0x77: {l: {0x73: {l: {0x3B: {c: [8647]}}}}}}}}}}}}}}}}}}}}}, 0x72: {l: {0x69: {l: {0x67: {l: {0x68: {l: {0x74: {l: {0x61: {l: {0x72: {l: {0x72: {l: {0x6F: {l: {0x77: {l: {0x3B: {c: [8596]}, 0x73: {l: {0x3B: {c: [8646]}}}}}}}}}}}}}, 0x68: {l: {0x61: {l: {0x72: {l: {0x70: {l: {0x6F: {l: {0x6F: {l: {0x6E: {l: {0x73: {l: {0x3B: {c: [8651]}}}}}}}}}}}}}}}}}, 0x73: {l: {0x71: {l: {0x75: {l: {0x69: {l: {0x67: {l: {0x61: {l: {0x72: {l: {0x72: {l: {0x6F: {l: {0x77: {l: {0x3B: {c: [8621]}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}, 0x74: {l: {0x68: {l: {0x72: {l: {0x65: {l: {0x65: {l: {0x74: {l: {0x69: {l: {0x6D: {l: {0x65: {l: {0x73: {l: {0x3B: {c: [8907]}}}}}}}}}}}}}}}}}}}}}}}}}, 0x67: {l: {0x3B: {c: [8922]}}}, 0x71: {l: {0x3B: {c: [8804]}, 0x71: {l: {0x3B: {c: [8806]}}}, 0x73: {l: {0x6C: {l: {0x61: {l: {0x6E: {l: {0x74: {l: {0x3B: {c: [10877]}}}}}}}}}}}}}, 0x73: {l: {0x63: {l: {0x63: {l: {0x3B: {c: [10920]}}}}}, 0x3B: {c: [10877]}, 0x64: {l: {0x6F: {l: {0x74: {l: {0x3B: {c: [10879]}, 0x6F: {l: {0x3B: {c: [10881]}, 0x72: {l: {0x3B: {c: [10883]}}}}}}}}}}}, 0x67: {l: {0x3B: {c: [8922, 65024]}, 0x65: {l: {0x73: {l: {0x3B: {c: [10899]}}}}}}}, 0x73: {l: {0x61: {l: {0x70: {l: {0x70: {l: {0x72: {l: {0x6F: {l: {0x78: {l: {0x3B: {c: [10885]}}}}}}}}}}}}}, 0x64: {l: {0x6F: {l: {0x74: {l: {0x3B: {c: [8918]}}}}}}}, 0x65: {l: {0x71: {l: {0x67: {l: {0x74: {l: {0x72: {l: {0x3B: {c: [8922]}}}}}}}, 0x71: {l: {0x67: {l: {0x74: {l: {0x72: {l: {0x3B: {c: [10891]}}}}}}}}}}}}}, 0x67: {l: {0x74: {l: {0x72: {l: {0x3B: {c: [8822]}}}}}}}, 0x73: {l: {0x69: {l: {0x6D: {l: {0x3B: {c: [8818]}}}}}}}}}}}}}, 0x45: {l: {0x3B: {c: [8806]}, 0x67: {l: {0x3B: {c: [10891]}}}}}, 0x66: {l: {0x69: {l: {0x73: {l: {0x68: {l: {0x74: {l: {0x3B: {c: [10620]}}}}}}}}}, 0x6C: {l: {0x6F: {l: {0x6F: {l: {0x72: {l: {0x3B: {c: [8970]}}}}}}}}}, 0x72: {l: {0x3B: {c: [120105]}}}}}, 0x67: {l: {0x3B: {c: [8822]}, 0x45: {l: {0x3B: {c: [10897]}}}}}, 0x48: {l: {0x61: {l: {0x72: {l: {0x3B: {c: [10594]}}}}}}}, 0x68: {l: {0x61: {l: {0x72: {l: {0x64: {l: {0x3B: {c: [8637]}}}, 0x75: {l: {0x3B: {c: [8636]}, 0x6C: {l: {0x3B: {c: [10602]}}}}}}}}}, 0x62: {l: {0x6C: {l: {0x6B: {l: {0x3B: {c: [9604]}}}}}}}}}, 0x6A: {l: {0x63: {l: {0x79: {l: {0x3B: {c: [1113]}}}}}}}, 0x6C: {l: {0x61: {l: {0x72: {l: {0x72: {l: {0x3B: {c: [8647]}}}}}}}, 0x3B: {c: [8810]}, 0x63: {l: {0x6F: {l: {0x72: {l: {0x6E: {l: {0x65: {l: {0x72: {l: {0x3B: {c: [8990]}}}}}}}}}}}}}, 0x68: {l: {0x61: {l: {0x72: {l: {0x64: {l: {0x3B: {c: [10603]}}}}}}}}}, 0x74: {l: {0x72: {l: {0x69: {l: {0x3B: {c: [9722]}}}}}}}}}, 0x6D: {l: {0x69: {l: {0x64: {l: {0x6F: {l: {0x74: {l: {0x3B: {c: [320]}}}}}}}}}, 0x6F: {l: {0x75: {l: {0x73: {l: {0x74: {l: {0x61: {l: {0x63: {l: {0x68: {l: {0x65: {l: {0x3B: {c: [9136]}}}}}}}}}, 0x3B: {c: [9136]}}}}}}}}}}}, 0x6E: {l: {0x61: {l: {0x70: {l: {0x3B: {c: [10889]}, 0x70: {l: {0x72: {l: {0x6F: {l: {0x78: {l: {0x3B: {c: [10889]}}}}}}}}}}}}}, 0x65: {l: {0x3B: {c: [10887]}, 0x71: {l: {0x3B: {c: [10887]}, 0x71: {l: {0x3B: {c: [8808]}}}}}}}, 0x45: {l: {0x3B: {c: [8808]}}}, 0x73: {l: {0x69: {l: {0x6D: {l: {0x3B: {c: [8934]}}}}}}}}}, 0x6F: {l: {0x61: {l: {0x6E: {l: {0x67: {l: {0x3B: {c: [10220]}}}}}, 0x72: {l: {0x72: {l: {0x3B: {c: [8701]}}}}}}}, 0x62: {l: {0x72: {l: {0x6B: {l: {0x3B: {c: [10214]}}}}}}}, 0x6E: {l: {0x67: {l: {0x6C: {l: {0x65: {l: {0x66: {l: {0x74: {l: {0x61: {l: {0x72: {l: {0x72: {l: {0x6F: {l: {0x77: {l: {0x3B: {c: [10229]}}}}}}}}}}}, 0x72: {l: {0x69: {l: {0x67: {l: {0x68: {l: {0x74: {l: {0x61: {l: {0x72: {l: {0x72: {l: {0x6F: {l: {0x77: {l: {0x3B: {c: [10231]}}}}}}}}}}}}}}}}}}}}}}}}}}}}}, 0x6D: {l: {0x61: {l: {0x70: {l: {0x73: {l: {0x74: {l: {0x6F: {l: {0x3B: {c: [10236]}}}}}}}}}}}}}, 0x72: {l: {0x69: {l: {0x67: {l: {0x68: {l: {0x74: {l: {0x61: {l: {0x72: {l: {0x72: {l: {0x6F: {l: {0x77: {l: {0x3B: {c: [10230]}}}}}}}}}}}}}}}}}}}}}}}}}, 0x6F: {l: {0x70: {l: {0x61: {l: {0x72: {l: {0x72: {l: {0x6F: {l: {0x77: {l: {0x6C: {l: {0x65: {l: {0x66: {l: {0x74: {l: {0x3B: {c: [8619]}}}}}}}}}, 0x72: {l: {0x69: {l: {0x67: {l: {0x68: {l: {0x74: {l: {0x3B: {c: [8620]}}}}}}}}}}}}}}}}}}}}}}}}}, 0x70: {l: {0x61: {l: {0x72: {l: {0x3B: {c: [10629]}}}}}, 0x66: {l: {0x3B: {c: [120157]}}}, 0x6C: {l: {0x75: {l: {0x73: {l: {0x3B: {c: [10797]}}}}}}}}}, 0x74: {l: {0x69: {l: {0x6D: {l: {0x65: {l: {0x73: {l: {0x3B: {c: [10804]}}}}}}}}}}}, 0x77: {l: {0x61: {l: {0x73: {l: {0x74: {l: {0x3B: {c: [8727]}}}}}}}, 0x62: {l: {0x61: {l: {0x72: {l: {0x3B: {c: [95]}}}}}}}}}, 0x7A: {l: {0x3B: {c: [9674]}, 0x65: {l: {0x6E: {l: {0x67: {l: {0x65: {l: {0x3B: {c: [9674]}}}}}}}}}, 0x66: {l: {0x3B: {c: [10731]}}}}}}}, 0x70: {l: {0x61: {l: {0x72: {l: {0x3B: {c: [40]}, 0x6C: {l: {0x74: {l: {0x3B: {c: [10643]}}}}}}}}}}}, 0x72: {l: {0x61: {l: {0x72: {l: {0x72: {l: {0x3B: {c: [8646]}}}}}}}, 0x63: {l: {0x6F: {l: {0x72: {l: {0x6E: {l: {0x65: {l: {0x72: {l: {0x3B: {c: [8991]}}}}}}}}}}}}}, 0x68: {l: {0x61: {l: {0x72: {l: {0x3B: {c: [8651]}, 0x64: {l: {0x3B: {c: [10605]}}}}}}}}}, 0x6D: {l: {0x3B: {c: [8206]}}}, 0x74: {l: {0x72: {l: {0x69: {l: {0x3B: {c: [8895]}}}}}}}}}, 0x73: {l: {0x61: {l: {0x71: {l: {0x75: {l: {0x6F: {l: {0x3B: {c: [8249]}}}}}}}}}, 0x63: {l: {0x72: {l: {0x3B: {c: [120001]}}}}}, 0x68: {l: {0x3B: {c: [8624]}}}, 0x69: {l: {0x6D: {l: {0x3B: {c: [8818]}, 0x65: {l: {0x3B: {c: [10893]}}}, 0x67: {l: {0x3B: {c: [10895]}}}}}}}, 0x71: {l: {0x62: {l: {0x3B: {c: [91]}}}, 0x75: {l: {0x6F: {l: {0x3B: {c: [8216]}, 0x72: {l: {0x3B: {c: [8218]}}}}}}}}}, 0x74: {l: {0x72: {l: {0x6F: {l: {0x6B: {l: {0x3B: {c: [322]}}}}}}}}}}}, 0x74: {l: {0x63: {l: {0x63: {l: {0x3B: {c: [10918]}}}, 0x69: {l: {0x72: {l: {0x3B: {c: [10873]}}}}}}}, 0x3B: {c: [60]}, 0x64: {l: {0x6F: {l: {0x74: {l: {0x3B: {c: [8918]}}}}}}}, 0x68: {l: {0x72: {l: {0x65: {l: {0x65: {l: {0x3B: {c: [8907]}}}}}}}}}, 0x69: {l: {0x6D: {l: {0x65: {l: {0x73: {l: {0x3B: {c: [8905]}}}}}}}}}, 0x6C: {l: {0x61: {l: {0x72: {l: {0x72: {l: {0x3B: {c: [10614]}}}}}}}}}, 0x71: {l: {0x75: {l: {0x65: {l: {0x73: {l: {0x74: {l: {0x3B: {c: [10875]}}}}}}}}}}}, 0x72: {l: {0x69: {l: {0x3B: {c: [9667]}, 0x65: {l: {0x3B: {c: [8884]}}}, 0x66: {l: {0x3B: {c: [9666]}}}}}, 0x50: {l: {0x61: {l: {0x72: {l: {0x3B: {c: [10646]}}}}}}}}}}, c: [60]}, 0x75: {l: {0x72: {l: {0x64: {l: {0x73: {l: {0x68: {l: {0x61: {l: {0x72: {l: {0x3B: {c: [10570]}}}}}}}}}}}, 0x75: {l: {0x68: {l: {0x61: {l: {0x72: {l: {0x3B: {c: [10598]}}}}}}}}}}}}}, 0x76: {l: {0x65: {l: {0x72: {l: {0x74: {l: {0x6E: {l: {0x65: {l: {0x71: {l: {0x71: {l: {0x3B: {c: [8808, 65024]}}}}}}}}}}}}}}}, 0x6E: {l: {0x45: {l: {0x3B: {c: [8808, 65024]}}}}}}}}},
    0x4C: {l: {0x61: {l: {0x63: {l: {0x75: {l: {0x74: {l: {0x65: {l: {0x3B: {c: [313]}}}}}}}}}, 0x6D: {l: {0x62: {l: {0x64: {l: {0x61: {l: {0x3B: {c: [923]}}}}}}}}}, 0x6E: {l: {0x67: {l: {0x3B: {c: [10218]}}}}}, 0x70: {l: {0x6C: {l: {0x61: {l: {0x63: {l: {0x65: {l: {0x74: {l: {0x72: {l: {0x66: {l: {0x3B: {c: [8466]}}}}}}}}}}}}}}}}}, 0x72: {l: {0x72: {l: {0x3B: {c: [8606]}}}}}}}, 0x63: {l: {0x61: {l: {0x72: {l: {0x6F: {l: {0x6E: {l: {0x3B: {c: [317]}}}}}}}}}, 0x65: {l: {0x64: {l: {0x69: {l: {0x6C: {l: {0x3B: {c: [315]}}}}}}}}}, 0x79: {l: {0x3B: {c: [1051]}}}}}, 0x65: {l: {0x66: {l: {0x74: {l: {0x41: {l: {0x6E: {l: {0x67: {l: {0x6C: {l: {0x65: {l: {0x42: {l: {0x72: {l: {0x61: {l: {0x63: {l: {0x6B: {l: {0x65: {l: {0x74: {l: {0x3B: {c: [10216]}}}}}}}}}}}}}}}}}}}}}}}, 0x72: {l: {0x72: {l: {0x6F: {l: {0x77: {l: {0x42: {l: {0x61: {l: {0x72: {l: {0x3B: {c: [8676]}}}}}}}, 0x3B: {c: [8592]}, 0x52: {l: {0x69: {l: {0x67: {l: {0x68: {l: {0x74: {l: {0x41: {l: {0x72: {l: {0x72: {l: {0x6F: {l: {0x77: {l: {0x3B: {c: [8646]}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}, 0x61: {l: {0x72: {l: {0x72: {l: {0x6F: {l: {0x77: {l: {0x3B: {c: [8656]}}}}}}}}}}}, 0x43: {l: {0x65: {l: {0x69: {l: {0x6C: {l: {0x69: {l: {0x6E: {l: {0x67: {l: {0x3B: {c: [8968]}}}}}}}}}}}}}}}, 0x44: {l: {0x6F: {l: {0x75: {l: {0x62: {l: {0x6C: {l: {0x65: {l: {0x42: {l: {0x72: {l: {0x61: {l: {0x63: {l: {0x6B: {l: {0x65: {l: {0x74: {l: {0x3B: {c: [10214]}}}}}}}}}}}}}}}}}}}}}}}, 0x77: {l: {0x6E: {l: {0x54: {l: {0x65: {l: {0x65: {l: {0x56: {l: {0x65: {l: {0x63: {l: {0x74: {l: {0x6F: {l: {0x72: {l: {0x3B: {c: [10593]}}}}}}}}}}}}}}}}}}}, 0x56: {l: {0x65: {l: {0x63: {l: {0x74: {l: {0x6F: {l: {0x72: {l: {0x42: {l: {0x61: {l: {0x72: {l: {0x3B: {c: [10585]}}}}}}}, 0x3B: {c: [8643]}}}}}}}}}}}}}}}}}}}}}, 0x46: {l: {0x6C: {l: {0x6F: {l: {0x6F: {l: {0x72: {l: {0x3B: {c: [8970]}}}}}}}}}}}, 0x52: {l: {0x69: {l: {0x67: {l: {0x68: {l: {0x74: {l: {0x41: {l: {0x72: {l: {0x72: {l: {0x6F: {l: {0x77: {l: {0x3B: {c: [8596]}}}}}}}}}}}, 0x56: {l: {0x65: {l: {0x63: {l: {0x74: {l: {0x6F: {l: {0x72: {l: {0x3B: {c: [10574]}}}}}}}}}}}}}}}}}}}}}}}, 0x72: {l: {0x69: {l: {0x67: {l: {0x68: {l: {0x74: {l: {0x61: {l: {0x72: {l: {0x72: {l: {0x6F: {l: {0x77: {l: {0x3B: {c: [8660]}}}}}}}}}}}}}}}}}}}}}, 0x54: {l: {0x65: {l: {0x65: {l: {0x41: {l: {0x72: {l: {0x72: {l: {0x6F: {l: {0x77: {l: {0x3B: {c: [8612]}}}}}}}}}}}, 0x3B: {c: [8867]}, 0x56: {l: {0x65: {l: {0x63: {l: {0x74: {l: {0x6F: {l: {0x72: {l: {0x3B: {c: [10586]}}}}}}}}}}}}}}}}}, 0x72: {l: {0x69: {l: {0x61: {l: {0x6E: {l: {0x67: {l: {0x6C: {l: {0x65: {l: {0x42: {l: {0x61: {l: {0x72: {l: {0x3B: {c: [10703]}}}}}}}, 0x3B: {c: [8882]}, 0x45: {l: {0x71: {l: {0x75: {l: {0x61: {l: {0x6C: {l: {0x3B: {c: [8884]}}}}}}}}}}}}}}}}}}}}}}}}}}}, 0x55: {l: {0x70: {l: {0x44: {l: {0x6F: {l: {0x77: {l: {0x6E: {l: {0x56: {l: {0x65: {l: {0x63: {l: {0x74: {l: {0x6F: {l: {0x72: {l: {0x3B: {c: [10577]}}}}}}}}}}}}}}}}}}}}}, 0x54: {l: {0x65: {l: {0x65: {l: {0x56: {l: {0x65: {l: {0x63: {l: {0x74: {l: {0x6F: {l: {0x72: {l: {0x3B: {c: [10592]}}}}}}}}}}}}}}}}}}}, 0x56: {l: {0x65: {l: {0x63: {l: {0x74: {l: {0x6F: {l: {0x72: {l: {0x42: {l: {0x61: {l: {0x72: {l: {0x3B: {c: [10584]}}}}}}}, 0x3B: {c: [8639]}}}}}}}}}}}}}}}}}, 0x56: {l: {0x65: {l: {0x63: {l: {0x74: {l: {0x6F: {l: {0x72: {l: {0x42: {l: {0x61: {l: {0x72: {l: {0x3B: {c: [10578]}}}}}}}, 0x3B: {c: [8636]}}}}}}}}}}}}}}}}}, 0x73: {l: {0x73: {l: {0x45: {l: {0x71: {l: {0x75: {l: {0x61: {l: {0x6C: {l: {0x47: {l: {0x72: {l: {0x65: {l: {0x61: {l: {0x74: {l: {0x65: {l: {0x72: {l: {0x3B: {c: [8922]}}}}}}}}}}}}}}}}}}}}}}}}}, 0x46: {l: {0x75: {l: {0x6C: {l: {0x6C: {l: {0x45: {l: {0x71: {l: {0x75: {l: {0x61: {l: {0x6C: {l: {0x3B: {c: [8806]}}}}}}}}}}}}}}}}}}}, 0x47: {l: {0x72: {l: {0x65: {l: {0x61: {l: {0x74: {l: {0x65: {l: {0x72: {l: {0x3B: {c: [8822]}}}}}}}}}}}}}}}, 0x4C: {l: {0x65: {l: {0x73: {l: {0x73: {l: {0x3B: {c: [10913]}}}}}}}}}, 0x53: {l: {0x6C: {l: {0x61: {l: {0x6E: {l: {0x74: {l: {0x45: {l: {0x71: {l: {0x75: {l: {0x61: {l: {0x6C: {l: {0x3B: {c: [10877]}}}}}}}}}}}}}}}}}}}}}, 0x54: {l: {0x69: {l: {0x6C: {l: {0x64: {l: {0x65: {l: {0x3B: {c: [8818]}}}}}}}}}}}}}}}}}, 0x66: {l: {0x72: {l: {0x3B: {c: [120079]}}}}}, 0x4A: {l: {0x63: {l: {0x79: {l: {0x3B: {c: [1033]}}}}}}}, 0x6C: {l: {0x3B: {c: [8920]}, 0x65: {l: {0x66: {l: {0x74: {l: {0x61: {l: {0x72: {l: {0x72: {l: {0x6F: {l: {0x77: {l: {0x3B: {c: [8666]}}}}}}}}}}}}}}}}}}}, 0x6D: {l: {0x69: {l: {0x64: {l: {0x6F: {l: {0x74: {l: {0x3B: {c: [319]}}}}}}}}}}}, 0x6F: {l: {0x6E: {l: {0x67: {l: {0x4C: {l: {0x65: {l: {0x66: {l: {0x74: {l: {0x41: {l: {0x72: {l: {0x72: {l: {0x6F: {l: {0x77: {l: {0x3B: {c: [10229]}}}}}}}}}}}, 0x52: {l: {0x69: {l: {0x67: {l: {0x68: {l: {0x74: {l: {0x41: {l: {0x72: {l: {0x72: {l: {0x6F: {l: {0x77: {l: {0x3B: {c: [10231]}}}}}}}}}}}}}}}}}}}}}}}}}}}}}, 0x6C: {l: {0x65: {l: {0x66: {l: {0x74: {l: {0x61: {l: {0x72: {l: {0x72: {l: {0x6F: {l: {0x77: {l: {0x3B: {c: [10232]}}}}}}}}}}}, 0x72: {l: {0x69: {l: {0x67: {l: {0x68: {l: {0x74: {l: {0x61: {l: {0x72: {l: {0x72: {l: {0x6F: {l: {0x77: {l: {0x3B: {c: [10234]}}}}}}}}}}}}}}}}}}}}}}}}}}}}}, 0x52: {l: {0x69: {l: {0x67: {l: {0x68: {l: {0x74: {l: {0x41: {l: {0x72: {l: {0x72: {l: {0x6F: {l: {0x77: {l: {0x3B: {c: [10230]}}}}}}}}}}}}}}}}}}}}}, 0x72: {l: {0x69: {l: {0x67: {l: {0x68: {l: {0x74: {l: {0x61: {l: {0x72: {l: {0x72: {l: {0x6F: {l: {0x77: {l: {0x3B: {c: [10233]}}}}}}}}}}}}}}}}}}}}}}}}}, 0x70: {l: {0x66: {l: {0x3B: {c: [120131]}}}}}, 0x77: {l: {0x65: {l: {0x72: {l: {0x4C: {l: {0x65: {l: {0x66: {l: {0x74: {l: {0x41: {l: {0x72: {l: {0x72: {l: {0x6F: {l: {0x77: {l: {0x3B: {c: [8601]}}}}}}}}}}}}}}}}}}}, 0x52: {l: {0x69: {l: {0x67: {l: {0x68: {l: {0x74: {l: {0x41: {l: {0x72: {l: {0x72: {l: {0x6F: {l: {0x77: {l: {0x3B: {c: [8600]}}}}}}}}}}}}}}}}}}}}}}}}}}}}}, 0x73: {l: {0x63: {l: {0x72: {l: {0x3B: {c: [8466]}}}}}, 0x68: {l: {0x3B: {c: [8624]}}}, 0x74: {l: {0x72: {l: {0x6F: {l: {0x6B: {l: {0x3B: {c: [321]}}}}}}}}}}}, 0x54: {l: {0x3B: {c: [60]}}, c: [60]}, 0x74: {l: {0x3B: {c: [8810]}}}}},
    0x6D: {l: {0x61: {l: {0x63: {l: {0x72: {l: {0x3B: {c: [175]}}, c: [175]}}}, 0x6C: {l: {0x65: {l: {0x3B: {c: [9794]}}}, 0x74: {l: {0x3B: {c: [10016]}, 0x65: {l: {0x73: {l: {0x65: {l: {0x3B: {c: [10016]}}}}}}}}}}}, 0x70: {l: {0x3B: {c: [8614]}, 0x73: {l: {0x74: {l: {0x6F: {l: {0x3B: {c: [8614]}, 0x64: {l: {0x6F: {l: {0x77: {l: {0x6E: {l: {0x3B: {c: [8615]}}}}}}}}}, 0x6C: {l: {0x65: {l: {0x66: {l: {0x74: {l: {0x3B: {c: [8612]}}}}}}}}}, 0x75: {l: {0x70: {l: {0x3B: {c: [8613]}}}}}}}}}}}}}, 0x72: {l: {0x6B: {l: {0x65: {l: {0x72: {l: {0x3B: {c: [9646]}}}}}}}}}}}, 0x63: {l: {0x6F: {l: {0x6D: {l: {0x6D: {l: {0x61: {l: {0x3B: {c: [10793]}}}}}}}}}, 0x79: {l: {0x3B: {c: [1084]}}}}}, 0x64: {l: {0x61: {l: {0x73: {l: {0x68: {l: {0x3B: {c: [8212]}}}}}}}}}, 0x44: {l: {0x44: {l: {0x6F: {l: {0x74: {l: {0x3B: {c: [8762]}}}}}}}}}, 0x65: {l: {0x61: {l: {0x73: {l: {0x75: {l: {0x72: {l: {0x65: {l: {0x64: {l: {0x61: {l: {0x6E: {l: {0x67: {l: {0x6C: {l: {0x65: {l: {0x3B: {c: [8737]}}}}}}}}}}}}}}}}}}}}}}}}}, 0x66: {l: {0x72: {l: {0x3B: {c: [120106]}}}}}, 0x68: {l: {0x6F: {l: {0x3B: {c: [8487]}}}}}, 0x69: {l: {0x63: {l: {0x72: {l: {0x6F: {l: {0x3B: {c: [181]}}, c: [181]}}}}}, 0x64: {l: {0x61: {l: {0x73: {l: {0x74: {l: {0x3B: {c: [42]}}}}}}}, 0x63: {l: {0x69: {l: {0x72: {l: {0x3B: {c: [10992]}}}}}}}, 0x3B: {c: [8739]}, 0x64: {l: {0x6F: {l: {0x74: {l: {0x3B: {c: [183]}}, c: [183]}}}}}}}, 0x6E: {l: {0x75: {l: {0x73: {l: {0x62: {l: {0x3B: {c: [8863]}}}, 0x3B: {c: [8722]}, 0x64: {l: {0x3B: {c: [8760]}, 0x75: {l: {0x3B: {c: [10794]}}}}}}}}}}}}}, 0x6C: {l: {0x63: {l: {0x70: {l: {0x3B: {c: [10971]}}}}}, 0x64: {l: {0x72: {l: {0x3B: {c: [8230]}}}}}}}, 0x6E: {l: {0x70: {l: {0x6C: {l: {0x75: {l: {0x73: {l: {0x3B: {c: [8723]}}}}}}}}}}}, 0x6F: {l: {0x64: {l: {0x65: {l: {0x6C: {l: {0x73: {l: {0x3B: {c: [8871]}}}}}}}}}, 0x70: {l: {0x66: {l: {0x3B: {c: [120158]}}}}}}}, 0x70: {l: {0x3B: {c: [8723]}}}, 0x73: {l: {0x63: {l: {0x72: {l: {0x3B: {c: [120002]}}}}}, 0x74: {l: {0x70: {l: {0x6F: {l: {0x73: {l: {0x3B: {c: [8766]}}}}}}}}}}}, 0x75: {l: {0x3B: {c: [956]}, 0x6C: {l: {0x74: {l: {0x69: {l: {0x6D: {l: {0x61: {l: {0x70: {l: {0x3B: {c: [8888]}}}}}}}}}}}}}, 0x6D: {l: {0x61: {l: {0x70: {l: {0x3B: {c: [8888]}}}}}}}}}}},
    0x4D: {l: {0x61: {l: {0x70: {l: {0x3B: {c: [10501]}}}}}, 0x63: {l: {0x79: {l: {0x3B: {c: [1052]}}}}}, 0x65: {l: {0x64: {l: {0x69: {l: {0x75: {l: {0x6D: {l: {0x53: {l: {0x70: {l: {0x61: {l: {0x63: {l: {0x65: {l: {0x3B: {c: [8287]}}}}}}}}}}}}}}}}}}}, 0x6C: {l: {0x6C: {l: {0x69: {l: {0x6E: {l: {0x74: {l: {0x72: {l: {0x66: {l: {0x3B: {c: [8499]}}}}}}}}}}}}}}}}}, 0x66: {l: {0x72: {l: {0x3B: {c: [120080]}}}}}, 0x69: {l: {0x6E: {l: {0x75: {l: {0x73: {l: {0x50: {l: {0x6C: {l: {0x75: {l: {0x73: {l: {0x3B: {c: [8723]}}}}}}}}}}}}}}}}}, 0x6F: {l: {0x70: {l: {0x66: {l: {0x3B: {c: [120132]}}}}}}}, 0x73: {l: {0x63: {l: {0x72: {l: {0x3B: {c: [8499]}}}}}}}, 0x75: {l: {0x3B: {c: [924]}}}}},
    0x6E: {l: {0x61: {l: {0x62: {l: {0x6C: {l: {0x61: {l: {0x3B: {c: [8711]}}}}}}}, 0x63: {l: {0x75: {l: {0x74: {l: {0x65: {l: {0x3B: {c: [324]}}}}}}}}}, 0x6E: {l: {0x67: {l: {0x3B: {c: [8736, 8402]}}}}}, 0x70: {l: {0x3B: {c: [8777]}, 0x45: {l: {0x3B: {c: [10864, 824]}}}, 0x69: {l: {0x64: {l: {0x3B: {c: [8779, 824]}}}}}, 0x6F: {l: {0x73: {l: {0x3B: {c: [329]}}}}}, 0x70: {l: {0x72: {l: {0x6F: {l: {0x78: {l: {0x3B: {c: [8777]}}}}}}}}}}}, 0x74: {l: {0x75: {l: {0x72: {l: {0x61: {l: {0x6C: {l: {0x3B: {c: [9838]}, 0x73: {l: {0x3B: {c: [8469]}}}}}}}, 0x3B: {c: [9838]}}}}}}}}}, 0x62: {l: {0x73: {l: {0x70: {l: {0x3B: {c: [160]}}, c: [160]}}}, 0x75: {l: {0x6D: {l: {0x70: {l: {0x3B: {c: [8782, 824]}, 0x65: {l: {0x3B: {c: [8783, 824]}}}}}}}}}}}, 0x63: {l: {0x61: {l: {0x70: {l: {0x3B: {c: [10819]}}}, 0x72: {l: {0x6F: {l: {0x6E: {l: {0x3B: {c: [328]}}}}}}}}}, 0x65: {l: {0x64: {l: {0x69: {l: {0x6C: {l: {0x3B: {c: [326]}}}}}}}}}, 0x6F: {l: {0x6E: {l: {0x67: {l: {0x3B: {c: [8775]}, 0x64: {l: {0x6F: {l: {0x74: {l: {0x3B: {c: [10861, 824]}}}}}}}}}}}}}, 0x75: {l: {0x70: {l: {0x3B: {c: [10818]}}}}}, 0x79: {l: {0x3B: {c: [1085]}}}}}, 0x64: {l: {0x61: {l: {0x73: {l: {0x68: {l: {0x3B: {c: [8211]}}}}}}}}}, 0x65: {l: {0x61: {l: {0x72: {l: {0x68: {l: {0x6B: {l: {0x3B: {c: [10532]}}}}}, 0x72: {l: {0x3B: {c: [8599]}, 0x6F: {l: {0x77: {l: {0x3B: {c: [8599]}}}}}}}}}}}, 0x41: {l: {0x72: {l: {0x72: {l: {0x3B: {c: [8663]}}}}}}}, 0x3B: {c: [8800]}, 0x64: {l: {0x6F: {l: {0x74: {l: {0x3B: {c: [8784, 824]}}}}}}}, 0x71: {l: {0x75: {l: {0x69: {l: {0x76: {l: {0x3B: {c: [8802]}}}}}}}}}, 0x73: {l: {0x65: {l: {0x61: {l: {0x72: {l: {0x3B: {c: [10536]}}}}}}}, 0x69: {l: {0x6D: {l: {0x3B: {c: [8770, 824]}}}}}}}, 0x78: {l: {0x69: {l: {0x73: {l: {0x74: {l: {0x3B: {c: [8708]}, 0x73: {l: {0x3B: {c: [8708]}}}}}}}}}}}}}, 0x66: {l: {0x72: {l: {0x3B: {c: [120107]}}}}}, 0x67: {l: {0x45: {l: {0x3B: {c: [8807, 824]}}}, 0x65: {l: {0x3B: {c: [8817]}, 0x71: {l: {0x3B: {c: [8817]}, 0x71: {l: {0x3B: {c: [8807, 824]}}}, 0x73: {l: {0x6C: {l: {0x61: {l: {0x6E: {l: {0x74: {l: {0x3B: {c: [10878, 824]}}}}}}}}}}}}}, 0x73: {l: {0x3B: {c: [10878, 824]}}}}}, 0x73: {l: {0x69: {l: {0x6D: {l: {0x3B: {c: [8821]}}}}}}}, 0x74: {l: {0x3B: {c: [8815]}, 0x72: {l: {0x3B: {c: [8815]}}}}}}}, 0x47: {l: {0x67: {l: {0x3B: {c: [8921, 824]}}}, 0x74: {l: {0x3B: {c: [8811, 8402]}, 0x76: {l: {0x3B: {c: [8811, 824]}}}}}}}, 0x68: {l: {0x61: {l: {0x72: {l: {0x72: {l: {0x3B: {c: [8622]}}}}}}}, 0x41: {l: {0x72: {l: {0x72: {l: {0x3B: {c: [8654]}}}}}}}, 0x70: {l: {0x61: {l: {0x72: {l: {0x3B: {c: [10994]}}}}}}}}}, 0x69: {l: {0x3B: {c: [8715]}, 0x73: {l: {0x3B: {c: [8956]}, 0x64: {l: {0x3B: {c: [8954]}}}}}, 0x76: {l: {0x3B: {c: [8715]}}}}}, 0x6A: {l: {0x63: {l: {0x79: {l: {0x3B: {c: [1114]}}}}}}}, 0x6C: {l: {0x61: {l: {0x72: {l: {0x72: {l: {0x3B: {c: [8602]}}}}}}}, 0x41: {l: {0x72: {l: {0x72: {l: {0x3B: {c: [8653]}}}}}}}, 0x64: {l: {0x72: {l: {0x3B: {c: [8229]}}}}}, 0x45: {l: {0x3B: {c: [8806, 824]}}}, 0x65: {l: {0x3B: {c: [8816]}, 0x66: {l: {0x74: {l: {0x61: {l: {0x72: {l: {0x72: {l: {0x6F: {l: {0x77: {l: {0x3B: {c: [8602]}}}}}}}}}}}, 0x72: {l: {0x69: {l: {0x67: {l: {0x68: {l: {0x74: {l: {0x61: {l: {0x72: {l: {0x72: {l: {0x6F: {l: {0x77: {l: {0x3B: {c: [8622]}}}}}}}}}}}}}}}}}}}}}}}}}, 0x71: {l: {0x3B: {c: [8816]}, 0x71: {l: {0x3B: {c: [8806, 824]}}}, 0x73: {l: {0x6C: {l: {0x61: {l: {0x6E: {l: {0x74: {l: {0x3B: {c: [10877, 824]}}}}}}}}}}}}}, 0x73: {l: {0x3B: {c: [10877, 824]}, 0x73: {l: {0x3B: {c: [8814]}}}}}}}, 0x73: {l: {0x69: {l: {0x6D: {l: {0x3B: {c: [8820]}}}}}}}, 0x74: {l: {0x3B: {c: [8814]}, 0x72: {l: {0x69: {l: {0x3B: {c: [8938]}, 0x65: {l: {0x3B: {c: [8940]}}}}}}}}}}}, 0x4C: {l: {0x65: {l: {0x66: {l: {0x74: {l: {0x61: {l: {0x72: {l: {0x72: {l: {0x6F: {l: {0x77: {l: {0x3B: {c: [8653]}}}}}}}}}}}, 0x72: {l: {0x69: {l: {0x67: {l: {0x68: {l: {0x74: {l: {0x61: {l: {0x72: {l: {0x72: {l: {0x6F: {l: {0x77: {l: {0x3B: {c: [8654]}}}}}}}}}}}}}}}}}}}}}}}}}}}, 0x6C: {l: {0x3B: {c: [8920, 824]}}}, 0x74: {l: {0x3B: {c: [8810, 8402]}, 0x76: {l: {0x3B: {c: [8810, 824]}}}}}}}, 0x6D: {l: {0x69: {l: {0x64: {l: {0x3B: {c: [8740]}}}}}}}, 0x6F: {l: {0x70: {l: {0x66: {l: {0x3B: {c: [120159]}}}}}, 0x74: {l: {0x3B: {c: [172]}, 0x69: {l: {0x6E: {l: {0x3B: {c: [8713]}, 0x64: {l: {0x6F: {l: {0x74: {l: {0x3B: {c: [8949, 824]}}}}}}}, 0x45: {l: {0x3B: {c: [8953, 824]}}}, 0x76: {l: {0x61: {l: {0x3B: {c: [8713]}}}, 0x62: {l: {0x3B: {c: [8951]}}}, 0x63: {l: {0x3B: {c: [8950]}}}}}}}}}, 0x6E: {l: {0x69: {l: {0x3B: {c: [8716]}, 0x76: {l: {0x61: {l: {0x3B: {c: [8716]}}}, 0x62: {l: {0x3B: {c: [8958]}}}, 0x63: {l: {0x3B: {c: [8957]}}}}}}}}}}, c: [172]}}}, 0x70: {l: {0x61: {l: {0x72: {l: {0x61: {l: {0x6C: {l: {0x6C: {l: {0x65: {l: {0x6C: {l: {0x3B: {c: [8742]}}}}}}}}}}}, 0x3B: {c: [8742]}, 0x73: {l: {0x6C: {l: {0x3B: {c: [11005, 8421]}}}}}, 0x74: {l: {0x3B: {c: [8706, 824]}}}}}}}, 0x6F: {l: {0x6C: {l: {0x69: {l: {0x6E: {l: {0x74: {l: {0x3B: {c: [10772]}}}}}}}}}}}, 0x72: {l: {0x3B: {c: [8832]}, 0x63: {l: {0x75: {l: {0x65: {l: {0x3B: {c: [8928]}}}}}}}, 0x65: {l: {0x63: {l: {0x3B: {c: [8832]}, 0x65: {l: {0x71: {l: {0x3B: {c: [10927, 824]}}}}}}}, 0x3B: {c: [10927, 824]}}}}}}}, 0x72: {l: {0x61: {l: {0x72: {l: {0x72: {l: {0x63: {l: {0x3B: {c: [10547, 824]}}}, 0x3B: {c: [8603]}, 0x77: {l: {0x3B: {c: [8605, 824]}}}}}}}}}, 0x41: {l: {0x72: {l: {0x72: {l: {0x3B: {c: [8655]}}}}}}}, 0x69: {l: {0x67: {l: {0x68: {l: {0x74: {l: {0x61: {l: {0x72: {l: {0x72: {l: {0x6F: {l: {0x77: {l: {0x3B: {c: [8603]}}}}}}}}}}}}}}}}}}}, 0x74: {l: {0x72: {l: {0x69: {l: {0x3B: {c: [8939]}, 0x65: {l: {0x3B: {c: [8941]}}}}}}}}}}}, 0x52: {l: {0x69: {l: {0x67: {l: {0x68: {l: {0x74: {l: {0x61: {l: {0x72: {l: {0x72: {l: {0x6F: {l: {0x77: {l: {0x3B: {c: [8655]}}}}}}}}}}}}}}}}}}}}}, 0x73: {l: {0x63: {l: {0x3B: {c: [8833]}, 0x63: {l: {0x75: {l: {0x65: {l: {0x3B: {c: [8929]}}}}}}}, 0x65: {l: {0x3B: {c: [10928, 824]}}}, 0x72: {l: {0x3B: {c: [120003]}}}}}, 0x68: {l: {0x6F: {l: {0x72: {l: {0x74: {l: {0x6D: {l: {0x69: {l: {0x64: {l: {0x3B: {c: [8740]}}}}}}}, 0x70: {l: {0x61: {l: {0x72: {l: {0x61: {l: {0x6C: {l: {0x6C: {l: {0x65: {l: {0x6C: {l: {0x3B: {c: [8742]}}}}}}}}}}}}}}}}}}}}}}}}}, 0x69: {l: {0x6D: {l: {0x3B: {c: [8769]}, 0x65: {l: {0x3B: {c: [8772]}, 0x71: {l: {0x3B: {c: [8772]}}}}}}}}}, 0x6D: {l: {0x69: {l: {0x64: {l: {0x3B: {c: [8740]}}}}}}}, 0x70: {l: {0x61: {l: {0x72: {l: {0x3B: {c: [8742]}}}}}}}, 0x71: {l: {0x73: {l: {0x75: {l: {0x62: {l: {0x65: {l: {0x3B: {c: [8930]}}}}}, 0x70: {l: {0x65: {l: {0x3B: {c: [8931]}}}}}}}}}}}, 0x75: {l: {0x62: {l: {0x3B: {c: [8836]}, 0x45: {l: {0x3B: {c: [10949, 824]}}}, 0x65: {l: {0x3B: {c: [8840]}}}, 0x73: {l: {0x65: {l: {0x74: {l: {0x3B: {c: [8834, 8402]}, 0x65: {l: {0x71: {l: {0x3B: {c: [8840]}, 0x71: {l: {0x3B: {c: [10949, 824]}}}}}}}}}}}}}}}, 0x63: {l: {0x63: {l: {0x3B: {c: [8833]}, 0x65: {l: {0x71: {l: {0x3B: {c: [10928, 824]}}}}}}}}}, 0x70: {l: {0x3B: {c: [8837]}, 0x45: {l: {0x3B: {c: [10950, 824]}}}, 0x65: {l: {0x3B: {c: [8841]}}}, 0x73: {l: {0x65: {l: {0x74: {l: {0x3B: {c: [8835, 8402]}, 0x65: {l: {0x71: {l: {0x3B: {c: [8841]}, 0x71: {l: {0x3B: {c: [10950, 824]}}}}}}}}}}}}}}}}}}}, 0x74: {l: {0x67: {l: {0x6C: {l: {0x3B: {c: [8825]}}}}}, 0x69: {l: {0x6C: {l: {0x64: {l: {0x65: {l: {0x3B: {c: [241]}}, c: [241]}}}}}}}, 0x6C: {l: {0x67: {l: {0x3B: {c: [8824]}}}}}, 0x72: {l: {0x69: {l: {0x61: {l: {0x6E: {l: {0x67: {l: {0x6C: {l: {0x65: {l: {0x6C: {l: {0x65: {l: {0x66: {l: {0x74: {l: {0x3B: {c: [8938]}, 0x65: {l: {0x71: {l: {0x3B: {c: [8940]}}}}}}}}}}}}}, 0x72: {l: {0x69: {l: {0x67: {l: {0x68: {l: {0x74: {l: {0x3B: {c: [8939]}, 0x65: {l: {0x71: {l: {0x3B: {c: [8941]}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}, 0x75: {l: {0x3B: {c: [957]}, 0x6D: {l: {0x3B: {c: [35]}, 0x65: {l: {0x72: {l: {0x6F: {l: {0x3B: {c: [8470]}}}}}}}, 0x73: {l: {0x70: {l: {0x3B: {c: [8199]}}}}}}}}}, 0x76: {l: {0x61: {l: {0x70: {l: {0x3B: {c: [8781, 8402]}}}}}, 0x64: {l: {0x61: {l: {0x73: {l: {0x68: {l: {0x3B: {c: [8876]}}}}}}}}}, 0x44: {l: {0x61: {l: {0x73: {l: {0x68: {l: {0x3B: {c: [8877]}}}}}}}}}, 0x67: {l: {0x65: {l: {0x3B: {c: [8805, 8402]}}}, 0x74: {l: {0x3B: {c: [62, 8402]}}}}}, 0x48: {l: {0x61: {l: {0x72: {l: {0x72: {l: {0x3B: {c: [10500]}}}}}}}}}, 0x69: {l: {0x6E: {l: {0x66: {l: {0x69: {l: {0x6E: {l: {0x3B: {c: [10718]}}}}}}}}}}}, 0x6C: {l: {0x41: {l: {0x72: {l: {0x72: {l: {0x3B: {c: [10498]}}}}}}}, 0x65: {l: {0x3B: {c: [8804, 8402]}}}, 0x74: {l: {0x3B: {c: [60, 8402]}, 0x72: {l: {0x69: {l: {0x65: {l: {0x3B: {c: [8884, 8402]}}}}}}}}}}}, 0x72: {l: {0x41: {l: {0x72: {l: {0x72: {l: {0x3B: {c: [10499]}}}}}}}, 0x74: {l: {0x72: {l: {0x69: {l: {0x65: {l: {0x3B: {c: [8885, 8402]}}}}}}}}}}}, 0x73: {l: {0x69: {l: {0x6D: {l: {0x3B: {c: [8764, 8402]}}}}}}}}}, 0x56: {l: {0x64: {l: {0x61: {l: {0x73: {l: {0x68: {l: {0x3B: {c: [8878]}}}}}}}}}, 0x44: {l: {0x61: {l: {0x73: {l: {0x68: {l: {0x3B: {c: [8879]}}}}}}}}}}}, 0x77: {l: {0x61: {l: {0x72: {l: {0x68: {l: {0x6B: {l: {0x3B: {c: [10531]}}}}}, 0x72: {l: {0x3B: {c: [8598]}, 0x6F: {l: {0x77: {l: {0x3B: {c: [8598]}}}}}}}}}}}, 0x41: {l: {0x72: {l: {0x72: {l: {0x3B: {c: [8662]}}}}}}}, 0x6E: {l: {0x65: {l: {0x61: {l: {0x72: {l: {0x3B: {c: [10535]}}}}}}}}}}}}},
    0x4E: {l: {0x61: {l: {0x63: {l: {0x75: {l: {0x74: {l: {0x65: {l: {0x3B: {c: [323]}}}}}}}}}}}, 0x63: {l: {0x61: {l: {0x72: {l: {0x6F: {l: {0x6E: {l: {0x3B: {c: [327]}}}}}}}}}, 0x65: {l: {0x64: {l: {0x69: {l: {0x6C: {l: {0x3B: {c: [325]}}}}}}}}}, 0x79: {l: {0x3B: {c: [1053]}}}}}, 0x65: {l: {0x67: {l: {0x61: {l: {0x74: {l: {0x69: {l: {0x76: {l: {0x65: {l: {0x4D: {l: {0x65: {l: {0x64: {l: {0x69: {l: {0x75: {l: {0x6D: {l: {0x53: {l: {0x70: {l: {0x61: {l: {0x63: {l: {0x65: {l: {0x3B: {c: [8203]}}}}}}}}}}}}}}}}}}}}}}}, 0x54: {l: {0x68: {l: {0x69: {l: {0x63: {l: {0x6B: {l: {0x53: {l: {0x70: {l: {0x61: {l: {0x63: {l: {0x65: {l: {0x3B: {c: [8203]}}}}}}}}}}}}}}}, 0x6E: {l: {0x53: {l: {0x70: {l: {0x61: {l: {0x63: {l: {0x65: {l: {0x3B: {c: [8203]}}}}}}}}}}}}}}}}}}}, 0x56: {l: {0x65: {l: {0x72: {l: {0x79: {l: {0x54: {l: {0x68: {l: {0x69: {l: {0x6E: {l: {0x53: {l: {0x70: {l: {0x61: {l: {0x63: {l: {0x65: {l: {0x3B: {c: [8203]}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}, 0x73: {l: {0x74: {l: {0x65: {l: {0x64: {l: {0x47: {l: {0x72: {l: {0x65: {l: {0x61: {l: {0x74: {l: {0x65: {l: {0x72: {l: {0x47: {l: {0x72: {l: {0x65: {l: {0x61: {l: {0x74: {l: {0x65: {l: {0x72: {l: {0x3B: {c: [8811]}}}}}}}}}}}}}}}}}}}}}}}}}}}}}, 0x4C: {l: {0x65: {l: {0x73: {l: {0x73: {l: {0x4C: {l: {0x65: {l: {0x73: {l: {0x73: {l: {0x3B: {c: [8810]}}}}}}}}}}}}}}}}}}}}}}}}}, 0x77: {l: {0x4C: {l: {0x69: {l: {0x6E: {l: {0x65: {l: {0x3B: {c: [10]}}}}}}}}}}}}}, 0x66: {l: {0x72: {l: {0x3B: {c: [120081]}}}}}, 0x4A: {l: {0x63: {l: {0x79: {l: {0x3B: {c: [1034]}}}}}}}, 0x6F: {l: {0x42: {l: {0x72: {l: {0x65: {l: {0x61: {l: {0x6B: {l: {0x3B: {c: [8288]}}}}}}}}}}}, 0x6E: {l: {0x42: {l: {0x72: {l: {0x65: {l: {0x61: {l: {0x6B: {l: {0x69: {l: {0x6E: {l: {0x67: {l: {0x53: {l: {0x70: {l: {0x61: {l: {0x63: {l: {0x65: {l: {0x3B: {c: [160]}}}}}}}}}}}}}}}}}}}}}}}}}}}}}, 0x70: {l: {0x66: {l: {0x3B: {c: [8469]}}}}}, 0x74: {l: {0x3B: {c: [10988]}, 0x43: {l: {0x6F: {l: {0x6E: {l: {0x67: {l: {0x72: {l: {0x75: {l: {0x65: {l: {0x6E: {l: {0x74: {l: {0x3B: {c: [8802]}}}}}}}}}}}}}}}}}, 0x75: {l: {0x70: {l: {0x43: {l: {0x61: {l: {0x70: {l: {0x3B: {c: [8813]}}}}}}}}}}}}}, 0x44: {l: {0x6F: {l: {0x75: {l: {0x62: {l: {0x6C: {l: {0x65: {l: {0x56: {l: {0x65: {l: {0x72: {l: {0x74: {l: {0x69: {l: {0x63: {l: {0x61: {l: {0x6C: {l: {0x42: {l: {0x61: {l: {0x72: {l: {0x3B: {c: [8742]}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}, 0x45: {l: {0x6C: {l: {0x65: {l: {0x6D: {l: {0x65: {l: {0x6E: {l: {0x74: {l: {0x3B: {c: [8713]}}}}}}}}}}}}}, 0x71: {l: {0x75: {l: {0x61: {l: {0x6C: {l: {0x3B: {c: [8800]}, 0x54: {l: {0x69: {l: {0x6C: {l: {0x64: {l: {0x65: {l: {0x3B: {c: [8770, 824]}}}}}}}}}}}}}}}}}}}, 0x78: {l: {0x69: {l: {0x73: {l: {0x74: {l: {0x73: {l: {0x3B: {c: [8708]}}}}}}}}}}}}}, 0x47: {l: {0x72: {l: {0x65: {l: {0x61: {l: {0x74: {l: {0x65: {l: {0x72: {l: {0x3B: {c: [8815]}, 0x45: {l: {0x71: {l: {0x75: {l: {0x61: {l: {0x6C: {l: {0x3B: {c: [8817]}}}}}}}}}}}, 0x46: {l: {0x75: {l: {0x6C: {l: {0x6C: {l: {0x45: {l: {0x71: {l: {0x75: {l: {0x61: {l: {0x6C: {l: {0x3B: {c: [8807, 824]}}}}}}}}}}}}}}}}}}}, 0x47: {l: {0x72: {l: {0x65: {l: {0x61: {l: {0x74: {l: {0x65: {l: {0x72: {l: {0x3B: {c: [8811, 824]}}}}}}}}}}}}}}}, 0x4C: {l: {0x65: {l: {0x73: {l: {0x73: {l: {0x3B: {c: [8825]}}}}}}}}}, 0x53: {l: {0x6C: {l: {0x61: {l: {0x6E: {l: {0x74: {l: {0x45: {l: {0x71: {l: {0x75: {l: {0x61: {l: {0x6C: {l: {0x3B: {c: [10878, 824]}}}}}}}}}}}}}}}}}}}}}, 0x54: {l: {0x69: {l: {0x6C: {l: {0x64: {l: {0x65: {l: {0x3B: {c: [8821]}}}}}}}}}}}}}}}}}}}}}}}}}, 0x48: {l: {0x75: {l: {0x6D: {l: {0x70: {l: {0x44: {l: {0x6F: {l: {0x77: {l: {0x6E: {l: {0x48: {l: {0x75: {l: {0x6D: {l: {0x70: {l: {0x3B: {c: [8782, 824]}}}}}}}}}}}}}}}}}, 0x45: {l: {0x71: {l: {0x75: {l: {0x61: {l: {0x6C: {l: {0x3B: {c: [8783, 824]}}}}}}}}}}}}}}}}}}}, 0x4C: {l: {0x65: {l: {0x66: {l: {0x74: {l: {0x54: {l: {0x72: {l: {0x69: {l: {0x61: {l: {0x6E: {l: {0x67: {l: {0x6C: {l: {0x65: {l: {0x42: {l: {0x61: {l: {0x72: {l: {0x3B: {c: [10703, 824]}}}}}}}, 0x3B: {c: [8938]}, 0x45: {l: {0x71: {l: {0x75: {l: {0x61: {l: {0x6C: {l: {0x3B: {c: [8940]}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}, 0x73: {l: {0x73: {l: {0x3B: {c: [8814]}, 0x45: {l: {0x71: {l: {0x75: {l: {0x61: {l: {0x6C: {l: {0x3B: {c: [8816]}}}}}}}}}}}, 0x47: {l: {0x72: {l: {0x65: {l: {0x61: {l: {0x74: {l: {0x65: {l: {0x72: {l: {0x3B: {c: [8824]}}}}}}}}}}}}}}}, 0x4C: {l: {0x65: {l: {0x73: {l: {0x73: {l: {0x3B: {c: [8810, 824]}}}}}}}}}, 0x53: {l: {0x6C: {l: {0x61: {l: {0x6E: {l: {0x74: {l: {0x45: {l: {0x71: {l: {0x75: {l: {0x61: {l: {0x6C: {l: {0x3B: {c: [10877, 824]}}}}}}}}}}}}}}}}}}}}}, 0x54: {l: {0x69: {l: {0x6C: {l: {0x64: {l: {0x65: {l: {0x3B: {c: [8820]}}}}}}}}}}}}}}}}}}}, 0x4E: {l: {0x65: {l: {0x73: {l: {0x74: {l: {0x65: {l: {0x64: {l: {0x47: {l: {0x72: {l: {0x65: {l: {0x61: {l: {0x74: {l: {0x65: {l: {0x72: {l: {0x47: {l: {0x72: {l: {0x65: {l: {0x61: {l: {0x74: {l: {0x65: {l: {0x72: {l: {0x3B: {c: [10914, 824]}}}}}}}}}}}}}}}}}}}}}}}}}}}}}, 0x4C: {l: {0x65: {l: {0x73: {l: {0x73: {l: {0x4C: {l: {0x65: {l: {0x73: {l: {0x73: {l: {0x3B: {c: [10913, 824]}}}}}}}}}}}}}}}}}}}}}}}}}}}}}, 0x50: {l: {0x72: {l: {0x65: {l: {0x63: {l: {0x65: {l: {0x64: {l: {0x65: {l: {0x73: {l: {0x3B: {c: [8832]}, 0x45: {l: {0x71: {l: {0x75: {l: {0x61: {l: {0x6C: {l: {0x3B: {c: [10927, 824]}}}}}}}}}}}, 0x53: {l: {0x6C: {l: {0x61: {l: {0x6E: {l: {0x74: {l: {0x45: {l: {0x71: {l: {0x75: {l: {0x61: {l: {0x6C: {l: {0x3B: {c: [8928]}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}, 0x52: {l: {0x65: {l: {0x76: {l: {0x65: {l: {0x72: {l: {0x73: {l: {0x65: {l: {0x45: {l: {0x6C: {l: {0x65: {l: {0x6D: {l: {0x65: {l: {0x6E: {l: {0x74: {l: {0x3B: {c: [8716]}}}}}}}}}}}}}}}}}}}}}}}}}}}, 0x69: {l: {0x67: {l: {0x68: {l: {0x74: {l: {0x54: {l: {0x72: {l: {0x69: {l: {0x61: {l: {0x6E: {l: {0x67: {l: {0x6C: {l: {0x65: {l: {0x42: {l: {0x61: {l: {0x72: {l: {0x3B: {c: [10704, 824]}}}}}}}, 0x3B: {c: [8939]}, 0x45: {l: {0x71: {l: {0x75: {l: {0x61: {l: {0x6C: {l: {0x3B: {c: [8941]}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}, 0x53: {l: {0x71: {l: {0x75: {l: {0x61: {l: {0x72: {l: {0x65: {l: {0x53: {l: {0x75: {l: {0x62: {l: {0x73: {l: {0x65: {l: {0x74: {l: {0x3B: {c: [8847, 824]}, 0x45: {l: {0x71: {l: {0x75: {l: {0x61: {l: {0x6C: {l: {0x3B: {c: [8930]}}}}}}}}}}}}}}}}}}}, 0x70: {l: {0x65: {l: {0x72: {l: {0x73: {l: {0x65: {l: {0x74: {l: {0x3B: {c: [8848, 824]}, 0x45: {l: {0x71: {l: {0x75: {l: {0x61: {l: {0x6C: {l: {0x3B: {c: [8931]}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}, 0x75: {l: {0x62: {l: {0x73: {l: {0x65: {l: {0x74: {l: {0x3B: {c: [8834, 8402]}, 0x45: {l: {0x71: {l: {0x75: {l: {0x61: {l: {0x6C: {l: {0x3B: {c: [8840]}}}}}}}}}}}}}}}}}}}, 0x63: {l: {0x63: {l: {0x65: {l: {0x65: {l: {0x64: {l: {0x73: {l: {0x3B: {c: [8833]}, 0x45: {l: {0x71: {l: {0x75: {l: {0x61: {l: {0x6C: {l: {0x3B: {c: [10928, 824]}}}}}}}}}}}, 0x53: {l: {0x6C: {l: {0x61: {l: {0x6E: {l: {0x74: {l: {0x45: {l: {0x71: {l: {0x75: {l: {0x61: {l: {0x6C: {l: {0x3B: {c: [8929]}}}}}}}}}}}}}}}}}}}}}, 0x54: {l: {0x69: {l: {0x6C: {l: {0x64: {l: {0x65: {l: {0x3B: {c: [8831, 824]}}}}}}}}}}}}}}}}}}}}}}}, 0x70: {l: {0x65: {l: {0x72: {l: {0x73: {l: {0x65: {l: {0x74: {l: {0x3B: {c: [8835, 8402]}, 0x45: {l: {0x71: {l: {0x75: {l: {0x61: {l: {0x6C: {l: {0x3B: {c: [8841]}}}}}}}}}}}}}}}}}}}}}}}}}}}, 0x54: {l: {0x69: {l: {0x6C: {l: {0x64: {l: {0x65: {l: {0x3B: {c: [8769]}, 0x45: {l: {0x71: {l: {0x75: {l: {0x61: {l: {0x6C: {l: {0x3B: {c: [8772]}}}}}}}}}}}, 0x46: {l: {0x75: {l: {0x6C: {l: {0x6C: {l: {0x45: {l: {0x71: {l: {0x75: {l: {0x61: {l: {0x6C: {l: {0x3B: {c: [8775]}}}}}}}}}}}}}}}}}}}, 0x54: {l: {0x69: {l: {0x6C: {l: {0x64: {l: {0x65: {l: {0x3B: {c: [8777]}}}}}}}}}}}}}}}}}}}}}, 0x56: {l: {0x65: {l: {0x72: {l: {0x74: {l: {0x69: {l: {0x63: {l: {0x61: {l: {0x6C: {l: {0x42: {l: {0x61: {l: {0x72: {l: {0x3B: {c: [8740]}}}}}}}}}}}}}}}}}}}}}}}}}}}, 0x73: {l: {0x63: {l: {0x72: {l: {0x3B: {c: [119977]}}}}}}}, 0x74: {l: {0x69: {l: {0x6C: {l: {0x64: {l: {0x65: {l: {0x3B: {c: [209]}}, c: [209]}}}}}}}}}, 0x75: {l: {0x3B: {c: [925]}}}}},
    0x4F: {l: {0x61: {l: {0x63: {l: {0x75: {l: {0x74: {l: {0x65: {l: {0x3B: {c: [211]}}, c: [211]}}}}}}}}}, 0x63: {l: {0x69: {l: {0x72: {l: {0x63: {l: {0x3B: {c: [212]}}, c: [212]}}}}}, 0x79: {l: {0x3B: {c: [1054]}}}}}, 0x64: {l: {0x62: {l: {0x6C: {l: {0x61: {l: {0x63: {l: {0x3B: {c: [336]}}}}}}}}}}}, 0x45: {l: {0x6C: {l: {0x69: {l: {0x67: {l: {0x3B: {c: [338]}}}}}}}}}, 0x66: {l: {0x72: {l: {0x3B: {c: [120082]}}}}}, 0x67: {l: {0x72: {l: {0x61: {l: {0x76: {l: {0x65: {l: {0x3B: {c: [210]}}, c: [210]}}}}}}}}}, 0x6D: {l: {0x61: {l: {0x63: {l: {0x72: {l: {0x3B: {c: [332]}}}}}}}, 0x65: {l: {0x67: {l: {0x61: {l: {0x3B: {c: [937]}}}}}}}, 0x69: {l: {0x63: {l: {0x72: {l: {0x6F: {l: {0x6E: {l: {0x3B: {c: [927]}}}}}}}}}}}}}, 0x6F: {l: {0x70: {l: {0x66: {l: {0x3B: {c: [120134]}}}}}}}, 0x70: {l: {0x65: {l: {0x6E: {l: {0x43: {l: {0x75: {l: {0x72: {l: {0x6C: {l: {0x79: {l: {0x44: {l: {0x6F: {l: {0x75: {l: {0x62: {l: {0x6C: {l: {0x65: {l: {0x51: {l: {0x75: {l: {0x6F: {l: {0x74: {l: {0x65: {l: {0x3B: {c: [8220]}}}}}}}}}}}}}}}}}}}}}}}, 0x51: {l: {0x75: {l: {0x6F: {l: {0x74: {l: {0x65: {l: {0x3B: {c: [8216]}}}}}}}}}}}}}}}}}}}}}}}}}}}, 0x72: {l: {0x3B: {c: [10836]}}}, 0x73: {l: {0x63: {l: {0x72: {l: {0x3B: {c: [119978]}}}}}, 0x6C: {l: {0x61: {l: {0x73: {l: {0x68: {l: {0x3B: {c: [216]}}, c: [216]}}}}}}}}}, 0x74: {l: {0x69: {l: {0x6C: {l: {0x64: {l: {0x65: {l: {0x3B: {c: [213]}}, c: [213]}}}}}, 0x6D: {l: {0x65: {l: {0x73: {l: {0x3B: {c: [10807]}}}}}}}}}}}, 0x75: {l: {0x6D: {l: {0x6C: {l: {0x3B: {c: [214]}}, c: [214]}}}}}, 0x76: {l: {0x65: {l: {0x72: {l: {0x42: {l: {0x61: {l: {0x72: {l: {0x3B: {c: [8254]}}}}}, 0x72: {l: {0x61: {l: {0x63: {l: {0x65: {l: {0x3B: {c: [9182]}}}, 0x6B: {l: {0x65: {l: {0x74: {l: {0x3B: {c: [9140]}}}}}}}}}}}}}}}, 0x50: {l: {0x61: {l: {0x72: {l: {0x65: {l: {0x6E: {l: {0x74: {l: {0x68: {l: {0x65: {l: {0x73: {l: {0x69: {l: {0x73: {l: {0x3B: {c: [9180]}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}},
    0x6F: {l: {0x61: {l: {0x63: {l: {0x75: {l: {0x74: {l: {0x65: {l: {0x3B: {c: [243]}}, c: [243]}}}}}}}, 0x73: {l: {0x74: {l: {0x3B: {c: [8859]}}}}}}}, 0x63: {l: {0x69: {l: {0x72: {l: {0x63: {l: {0x3B: {c: [244]}}, c: [244]}, 0x3B: {c: [8858]}}}}}, 0x79: {l: {0x3B: {c: [1086]}}}}}, 0x64: {l: {0x61: {l: {0x73: {l: {0x68: {l: {0x3B: {c: [8861]}}}}}}}, 0x62: {l: {0x6C: {l: {0x61: {l: {0x63: {l: {0x3B: {c: [337]}}}}}}}}}, 0x69: {l: {0x76: {l: {0x3B: {c: [10808]}}}}}, 0x6F: {l: {0x74: {l: {0x3B: {c: [8857]}}}}}, 0x73: {l: {0x6F: {l: {0x6C: {l: {0x64: {l: {0x3B: {c: [10684]}}}}}}}}}}}, 0x65: {l: {0x6C: {l: {0x69: {l: {0x67: {l: {0x3B: {c: [339]}}}}}}}}}, 0x66: {l: {0x63: {l: {0x69: {l: {0x72: {l: {0x3B: {c: [10687]}}}}}}}, 0x72: {l: {0x3B: {c: [120108]}}}}}, 0x67: {l: {0x6F: {l: {0x6E: {l: {0x3B: {c: [731]}}}}}, 0x72: {l: {0x61: {l: {0x76: {l: {0x65: {l: {0x3B: {c: [242]}}, c: [242]}}}}}}}, 0x74: {l: {0x3B: {c: [10689]}}}}}, 0x68: {l: {0x62: {l: {0x61: {l: {0x72: {l: {0x3B: {c: [10677]}}}}}}}, 0x6D: {l: {0x3B: {c: [937]}}}}}, 0x69: {l: {0x6E: {l: {0x74: {l: {0x3B: {c: [8750]}}}}}}}, 0x6C: {l: {0x61: {l: {0x72: {l: {0x72: {l: {0x3B: {c: [8634]}}}}}}}, 0x63: {l: {0x69: {l: {0x72: {l: {0x3B: {c: [10686]}}}}}, 0x72: {l: {0x6F: {l: {0x73: {l: {0x73: {l: {0x3B: {c: [10683]}}}}}}}}}}}, 0x69: {l: {0x6E: {l: {0x65: {l: {0x3B: {c: [8254]}}}}}}}, 0x74: {l: {0x3B: {c: [10688]}}}}}, 0x6D: {l: {0x61: {l: {0x63: {l: {0x72: {l: {0x3B: {c: [333]}}}}}}}, 0x65: {l: {0x67: {l: {0x61: {l: {0x3B: {c: [969]}}}}}}}, 0x69: {l: {0x63: {l: {0x72: {l: {0x6F: {l: {0x6E: {l: {0x3B: {c: [959]}}}}}}}}}, 0x64: {l: {0x3B: {c: [10678]}}}, 0x6E: {l: {0x75: {l: {0x73: {l: {0x3B: {c: [8854]}}}}}}}}}}}, 0x6F: {l: {0x70: {l: {0x66: {l: {0x3B: {c: [120160]}}}}}}}, 0x70: {l: {0x61: {l: {0x72: {l: {0x3B: {c: [10679]}}}}}, 0x65: {l: {0x72: {l: {0x70: {l: {0x3B: {c: [10681]}}}}}}}, 0x6C: {l: {0x75: {l: {0x73: {l: {0x3B: {c: [8853]}}}}}}}}}, 0x72: {l: {0x61: {l: {0x72: {l: {0x72: {l: {0x3B: {c: [8635]}}}}}}}, 0x3B: {c: [8744]}, 0x64: {l: {0x3B: {c: [10845]}, 0x65: {l: {0x72: {l: {0x3B: {c: [8500]}, 0x6F: {l: {0x66: {l: {0x3B: {c: [8500]}}}}}}}}}, 0x66: {l: {0x3B: {c: [170]}}, c: [170]}, 0x6D: {l: {0x3B: {c: [186]}}, c: [186]}}}, 0x69: {l: {0x67: {l: {0x6F: {l: {0x66: {l: {0x3B: {c: [8886]}}}}}}}}}, 0x6F: {l: {0x72: {l: {0x3B: {c: [10838]}}}}}, 0x73: {l: {0x6C: {l: {0x6F: {l: {0x70: {l: {0x65: {l: {0x3B: {c: [10839]}}}}}}}}}}}, 0x76: {l: {0x3B: {c: [10843]}}}}}, 0x53: {l: {0x3B: {c: [9416]}}}, 0x73: {l: {0x63: {l: {0x72: {l: {0x3B: {c: [8500]}}}}}, 0x6C: {l: {0x61: {l: {0x73: {l: {0x68: {l: {0x3B: {c: [248]}}, c: [248]}}}}}}}, 0x6F: {l: {0x6C: {l: {0x3B: {c: [8856]}}}}}}}, 0x74: {l: {0x69: {l: {0x6C: {l: {0x64: {l: {0x65: {l: {0x3B: {c: [245]}}, c: [245]}}}}}, 0x6D: {l: {0x65: {l: {0x73: {l: {0x61: {l: {0x73: {l: {0x3B: {c: [10806]}}}}}, 0x3B: {c: [8855]}}}}}}}}}}}, 0x75: {l: {0x6D: {l: {0x6C: {l: {0x3B: {c: [246]}}, c: [246]}}}}}, 0x76: {l: {0x62: {l: {0x61: {l: {0x72: {l: {0x3B: {c: [9021]}}}}}}}}}}},
    0x70: {l: {0x61: {l: {0x72: {l: {0x61: {l: {0x3B: {c: [182]}, 0x6C: {l: {0x6C: {l: {0x65: {l: {0x6C: {l: {0x3B: {c: [8741]}}}}}}}}}}, c: [182]}, 0x3B: {c: [8741]}, 0x73: {l: {0x69: {l: {0x6D: {l: {0x3B: {c: [10995]}}}}}, 0x6C: {l: {0x3B: {c: [11005]}}}}}, 0x74: {l: {0x3B: {c: [8706]}}}}}}}, 0x63: {l: {0x79: {l: {0x3B: {c: [1087]}}}}}, 0x65: {l: {0x72: {l: {0x63: {l: {0x6E: {l: {0x74: {l: {0x3B: {c: [37]}}}}}}}, 0x69: {l: {0x6F: {l: {0x64: {l: {0x3B: {c: [46]}}}}}}}, 0x6D: {l: {0x69: {l: {0x6C: {l: {0x3B: {c: [8240]}}}}}}}, 0x70: {l: {0x3B: {c: [8869]}}}, 0x74: {l: {0x65: {l: {0x6E: {l: {0x6B: {l: {0x3B: {c: [8241]}}}}}}}}}}}}}, 0x66: {l: {0x72: {l: {0x3B: {c: [120109]}}}}}, 0x68: {l: {0x69: {l: {0x3B: {c: [966]}, 0x76: {l: {0x3B: {c: [981]}}}}}, 0x6D: {l: {0x6D: {l: {0x61: {l: {0x74: {l: {0x3B: {c: [8499]}}}}}}}}}, 0x6F: {l: {0x6E: {l: {0x65: {l: {0x3B: {c: [9742]}}}}}}}}}, 0x69: {l: {0x3B: {c: [960]}, 0x74: {l: {0x63: {l: {0x68: {l: {0x66: {l: {0x6F: {l: {0x72: {l: {0x6B: {l: {0x3B: {c: [8916]}}}}}}}}}}}}}}}, 0x76: {l: {0x3B: {c: [982]}}}}}, 0x6C: {l: {0x61: {l: {0x6E: {l: {0x63: {l: {0x6B: {l: {0x3B: {c: [8463]}, 0x68: {l: {0x3B: {c: [8462]}}}}}}}, 0x6B: {l: {0x76: {l: {0x3B: {c: [8463]}}}}}}}}}, 0x75: {l: {0x73: {l: {0x61: {l: {0x63: {l: {0x69: {l: {0x72: {l: {0x3B: {c: [10787]}}}}}}}}}, 0x62: {l: {0x3B: {c: [8862]}}}, 0x63: {l: {0x69: {l: {0x72: {l: {0x3B: {c: [10786]}}}}}}}, 0x3B: {c: [43]}, 0x64: {l: {0x6F: {l: {0x3B: {c: [8724]}}}, 0x75: {l: {0x3B: {c: [10789]}}}}}, 0x65: {l: {0x3B: {c: [10866]}}}, 0x6D: {l: {0x6E: {l: {0x3B: {c: [177]}}, c: [177]}}}, 0x73: {l: {0x69: {l: {0x6D: {l: {0x3B: {c: [10790]}}}}}}}, 0x74: {l: {0x77: {l: {0x6F: {l: {0x3B: {c: [10791]}}}}}}}}}}}}}, 0x6D: {l: {0x3B: {c: [177]}}}, 0x6F: {l: {0x69: {l: {0x6E: {l: {0x74: {l: {0x69: {l: {0x6E: {l: {0x74: {l: {0x3B: {c: [10773]}}}}}}}}}}}}}, 0x70: {l: {0x66: {l: {0x3B: {c: [120161]}}}}}, 0x75: {l: {0x6E: {l: {0x64: {l: {0x3B: {c: [163]}}, c: [163]}}}}}}}, 0x72: {l: {0x61: {l: {0x70: {l: {0x3B: {c: [10935]}}}}}, 0x3B: {c: [8826]}, 0x63: {l: {0x75: {l: {0x65: {l: {0x3B: {c: [8828]}}}}}}}, 0x65: {l: {0x63: {l: {0x61: {l: {0x70: {l: {0x70: {l: {0x72: {l: {0x6F: {l: {0x78: {l: {0x3B: {c: [10935]}}}}}}}}}}}}}, 0x3B: {c: [8826]}, 0x63: {l: {0x75: {l: {0x72: {l: {0x6C: {l: {0x79: {l: {0x65: {l: {0x71: {l: {0x3B: {c: [8828]}}}}}}}}}}}}}}}, 0x65: {l: {0x71: {l: {0x3B: {c: [10927]}}}}}, 0x6E: {l: {0x61: {l: {0x70: {l: {0x70: {l: {0x72: {l: {0x6F: {l: {0x78: {l: {0x3B: {c: [10937]}}}}}}}}}}}}}, 0x65: {l: {0x71: {l: {0x71: {l: {0x3B: {c: [10933]}}}}}}}, 0x73: {l: {0x69: {l: {0x6D: {l: {0x3B: {c: [8936]}}}}}}}}}, 0x73: {l: {0x69: {l: {0x6D: {l: {0x3B: {c: [8830]}}}}}}}}}, 0x3B: {c: [10927]}}}, 0x45: {l: {0x3B: {c: [10931]}}}, 0x69: {l: {0x6D: {l: {0x65: {l: {0x3B: {c: [8242]}, 0x73: {l: {0x3B: {c: [8473]}}}}}}}}}, 0x6E: {l: {0x61: {l: {0x70: {l: {0x3B: {c: [10937]}}}}}, 0x45: {l: {0x3B: {c: [10933]}}}, 0x73: {l: {0x69: {l: {0x6D: {l: {0x3B: {c: [8936]}}}}}}}}}, 0x6F: {l: {0x64: {l: {0x3B: {c: [8719]}}}, 0x66: {l: {0x61: {l: {0x6C: {l: {0x61: {l: {0x72: {l: {0x3B: {c: [9006]}}}}}}}}}, 0x6C: {l: {0x69: {l: {0x6E: {l: {0x65: {l: {0x3B: {c: [8978]}}}}}}}}}, 0x73: {l: {0x75: {l: {0x72: {l: {0x66: {l: {0x3B: {c: [8979]}}}}}}}}}}}, 0x70: {l: {0x3B: {c: [8733]}, 0x74: {l: {0x6F: {l: {0x3B: {c: [8733]}}}}}}}}}, 0x73: {l: {0x69: {l: {0x6D: {l: {0x3B: {c: [8830]}}}}}}}, 0x75: {l: {0x72: {l: {0x65: {l: {0x6C: {l: {0x3B: {c: [8880]}}}}}}}}}}}, 0x73: {l: {0x63: {l: {0x72: {l: {0x3B: {c: [120005]}}}}}, 0x69: {l: {0x3B: {c: [968]}}}}}, 0x75: {l: {0x6E: {l: {0x63: {l: {0x73: {l: {0x70: {l: {0x3B: {c: [8200]}}}}}}}}}}}}},
    0x50: {l: {0x61: {l: {0x72: {l: {0x74: {l: {0x69: {l: {0x61: {l: {0x6C: {l: {0x44: {l: {0x3B: {c: [8706]}}}}}}}}}}}}}}}, 0x63: {l: {0x79: {l: {0x3B: {c: [1055]}}}}}, 0x66: {l: {0x72: {l: {0x3B: {c: [120083]}}}}}, 0x68: {l: {0x69: {l: {0x3B: {c: [934]}}}}}, 0x69: {l: {0x3B: {c: [928]}}}, 0x6C: {l: {0x75: {l: {0x73: {l: {0x4D: {l: {0x69: {l: {0x6E: {l: {0x75: {l: {0x73: {l: {0x3B: {c: [177]}}}}}}}}}}}}}}}}}, 0x6F: {l: {0x69: {l: {0x6E: {l: {0x63: {l: {0x61: {l: {0x72: {l: {0x65: {l: {0x70: {l: {0x6C: {l: {0x61: {l: {0x6E: {l: {0x65: {l: {0x3B: {c: [8460]}}}}}}}}}}}}}}}}}}}}}}}, 0x70: {l: {0x66: {l: {0x3B: {c: [8473]}}}}}}}, 0x72: {l: {0x3B: {c: [10939]}, 0x65: {l: {0x63: {l: {0x65: {l: {0x64: {l: {0x65: {l: {0x73: {l: {0x3B: {c: [8826]}, 0x45: {l: {0x71: {l: {0x75: {l: {0x61: {l: {0x6C: {l: {0x3B: {c: [10927]}}}}}}}}}}}, 0x53: {l: {0x6C: {l: {0x61: {l: {0x6E: {l: {0x74: {l: {0x45: {l: {0x71: {l: {0x75: {l: {0x61: {l: {0x6C: {l: {0x3B: {c: [8828]}}}}}}}}}}}}}}}}}}}}}, 0x54: {l: {0x69: {l: {0x6C: {l: {0x64: {l: {0x65: {l: {0x3B: {c: [8830]}}}}}}}}}}}}}}}}}}}}}}}, 0x69: {l: {0x6D: {l: {0x65: {l: {0x3B: {c: [8243]}}}}}}}, 0x6F: {l: {0x64: {l: {0x75: {l: {0x63: {l: {0x74: {l: {0x3B: {c: [8719]}}}}}}}}}, 0x70: {l: {0x6F: {l: {0x72: {l: {0x74: {l: {0x69: {l: {0x6F: {l: {0x6E: {l: {0x61: {l: {0x6C: {l: {0x3B: {c: [8733]}}}}}, 0x3B: {c: [8759]}}}}}}}}}}}}}}}}}}}, 0x73: {l: {0x63: {l: {0x72: {l: {0x3B: {c: [119979]}}}}}, 0x69: {l: {0x3B: {c: [936]}}}}}}},
    0x51: {l: {0x66: {l: {0x72: {l: {0x3B: {c: [120084]}}}}}, 0x6F: {l: {0x70: {l: {0x66: {l: {0x3B: {c: [8474]}}}}}}}, 0x73: {l: {0x63: {l: {0x72: {l: {0x3B: {c: [119980]}}}}}}}, 0x55: {l: {0x4F: {l: {0x54: {l: {0x3B: {c: [34]}}, c: [34]}}}}}}},
    0x71: {l: {0x66: {l: {0x72: {l: {0x3B: {c: [120110]}}}}}, 0x69: {l: {0x6E: {l: {0x74: {l: {0x3B: {c: [10764]}}}}}}}, 0x6F: {l: {0x70: {l: {0x66: {l: {0x3B: {c: [120162]}}}}}}}, 0x70: {l: {0x72: {l: {0x69: {l: {0x6D: {l: {0x65: {l: {0x3B: {c: [8279]}}}}}}}}}}}, 0x73: {l: {0x63: {l: {0x72: {l: {0x3B: {c: [120006]}}}}}}}, 0x75: {l: {0x61: {l: {0x74: {l: {0x65: {l: {0x72: {l: {0x6E: {l: {0x69: {l: {0x6F: {l: {0x6E: {l: {0x73: {l: {0x3B: {c: [8461]}}}}}}}}}}}}}}}, 0x69: {l: {0x6E: {l: {0x74: {l: {0x3B: {c: [10774]}}}}}}}}}}}, 0x65: {l: {0x73: {l: {0x74: {l: {0x3B: {c: [63]}, 0x65: {l: {0x71: {l: {0x3B: {c: [8799]}}}}}}}}}}}, 0x6F: {l: {0x74: {l: {0x3B: {c: [34]}}, c: [34]}}}}}}},
    0x72: {l: {0x41: {l: {0x61: {l: {0x72: {l: {0x72: {l: {0x3B: {c: [8667]}}}}}}}, 0x72: {l: {0x72: {l: {0x3B: {c: [8658]}}}}}, 0x74: {l: {0x61: {l: {0x69: {l: {0x6C: {l: {0x3B: {c: [10524]}}}}}}}}}}}, 0x61: {l: {0x63: {l: {0x65: {l: {0x3B: {c: [8765, 817]}}}, 0x75: {l: {0x74: {l: {0x65: {l: {0x3B: {c: [341]}}}}}}}}}, 0x64: {l: {0x69: {l: {0x63: {l: {0x3B: {c: [8730]}}}}}}}, 0x65: {l: {0x6D: {l: {0x70: {l: {0x74: {l: {0x79: {l: {0x76: {l: {0x3B: {c: [10675]}}}}}}}}}}}}}, 0x6E: {l: {0x67: {l: {0x3B: {c: [10217]}, 0x64: {l: {0x3B: {c: [10642]}}}, 0x65: {l: {0x3B: {c: [10661]}}}, 0x6C: {l: {0x65: {l: {0x3B: {c: [10217]}}}}}}}}}, 0x71: {l: {0x75: {l: {0x6F: {l: {0x3B: {c: [187]}}, c: [187]}}}}}, 0x72: {l: {0x72: {l: {0x61: {l: {0x70: {l: {0x3B: {c: [10613]}}}}}, 0x62: {l: {0x3B: {c: [8677]}, 0x66: {l: {0x73: {l: {0x3B: {c: [10528]}}}}}}}, 0x63: {l: {0x3B: {c: [10547]}}}, 0x3B: {c: [8594]}, 0x66: {l: {0x73: {l: {0x3B: {c: [10526]}}}}}, 0x68: {l: {0x6B: {l: {0x3B: {c: [8618]}}}}}, 0x6C: {l: {0x70: {l: {0x3B: {c: [8620]}}}}}, 0x70: {l: {0x6C: {l: {0x3B: {c: [10565]}}}}}, 0x73: {l: {0x69: {l: {0x6D: {l: {0x3B: {c: [10612]}}}}}}}, 0x74: {l: {0x6C: {l: {0x3B: {c: [8611]}}}}}, 0x77: {l: {0x3B: {c: [8605]}}}}}}}, 0x74: {l: {0x61: {l: {0x69: {l: {0x6C: {l: {0x3B: {c: [10522]}}}}}}}, 0x69: {l: {0x6F: {l: {0x3B: {c: [8758]}, 0x6E: {l: {0x61: {l: {0x6C: {l: {0x73: {l: {0x3B: {c: [8474]}}}}}}}}}}}}}}}}}, 0x62: {l: {0x61: {l: {0x72: {l: {0x72: {l: {0x3B: {c: [10509]}}}}}}}, 0x62: {l: {0x72: {l: {0x6B: {l: {0x3B: {c: [10099]}}}}}}}, 0x72: {l: {0x61: {l: {0x63: {l: {0x65: {l: {0x3B: {c: [125]}}}, 0x6B: {l: {0x3B: {c: [93]}}}}}}}, 0x6B: {l: {0x65: {l: {0x3B: {c: [10636]}}}, 0x73: {l: {0x6C: {l: {0x64: {l: {0x3B: {c: [10638]}}}, 0x75: {l: {0x3B: {c: [10640]}}}}}}}}}}}}}, 0x42: {l: {0x61: {l: {0x72: {l: {0x72: {l: {0x3B: {c: [10511]}}}}}}}}}, 0x63: {l: {0x61: {l: {0x72: {l: {0x6F: {l: {0x6E: {l: {0x3B: {c: [345]}}}}}}}}}, 0x65: {l: {0x64: {l: {0x69: {l: {0x6C: {l: {0x3B: {c: [343]}}}}}}}, 0x69: {l: {0x6C: {l: {0x3B: {c: [8969]}}}}}}}, 0x75: {l: {0x62: {l: {0x3B: {c: [125]}}}}}, 0x79: {l: {0x3B: {c: [1088]}}}}}, 0x64: {l: {0x63: {l: {0x61: {l: {0x3B: {c: [10551]}}}}}, 0x6C: {l: {0x64: {l: {0x68: {l: {0x61: {l: {0x72: {l: {0x3B: {c: [10601]}}}}}}}}}}}, 0x71: {l: {0x75: {l: {0x6F: {l: {0x3B: {c: [8221]}, 0x72: {l: {0x3B: {c: [8221]}}}}}}}}}, 0x73: {l: {0x68: {l: {0x3B: {c: [8627]}}}}}}}, 0x65: {l: {0x61: {l: {0x6C: {l: {0x3B: {c: [8476]}, 0x69: {l: {0x6E: {l: {0x65: {l: {0x3B: {c: [8475]}}}}}}}, 0x70: {l: {0x61: {l: {0x72: {l: {0x74: {l: {0x3B: {c: [8476]}}}}}}}}}, 0x73: {l: {0x3B: {c: [8477]}}}}}}}, 0x63: {l: {0x74: {l: {0x3B: {c: [9645]}}}}}, 0x67: {l: {0x3B: {c: [174]}}, c: [174]}}}, 0x66: {l: {0x69: {l: {0x73: {l: {0x68: {l: {0x74: {l: {0x3B: {c: [10621]}}}}}}}}}, 0x6C: {l: {0x6F: {l: {0x6F: {l: {0x72: {l: {0x3B: {c: [8971]}}}}}}}}}, 0x72: {l: {0x3B: {c: [120111]}}}}}, 0x48: {l: {0x61: {l: {0x72: {l: {0x3B: {c: [10596]}}}}}}}, 0x68: {l: {0x61: {l: {0x72: {l: {0x64: {l: {0x3B: {c: [8641]}}}, 0x75: {l: {0x3B: {c: [8640]}, 0x6C: {l: {0x3B: {c: [10604]}}}}}}}}}, 0x6F: {l: {0x3B: {c: [961]}, 0x76: {l: {0x3B: {c: [1009]}}}}}}}, 0x69: {l: {0x67: {l: {0x68: {l: {0x74: {l: {0x61: {l: {0x72: {l: {0x72: {l: {0x6F: {l: {0x77: {l: {0x3B: {c: [8594]}, 0x74: {l: {0x61: {l: {0x69: {l: {0x6C: {l: {0x3B: {c: [8611]}}}}}}}}}}}}}}}}}}}, 0x68: {l: {0x61: {l: {0x72: {l: {0x70: {l: {0x6F: {l: {0x6F: {l: {0x6E: {l: {0x64: {l: {0x6F: {l: {0x77: {l: {0x6E: {l: {0x3B: {c: [8641]}}}}}}}}}, 0x75: {l: {0x70: {l: {0x3B: {c: [8640]}}}}}}}}}}}}}}}}}}}, 0x6C: {l: {0x65: {l: {0x66: {l: {0x74: {l: {0x61: {l: {0x72: {l: {0x72: {l: {0x6F: {l: {0x77: {l: {0x73: {l: {0x3B: {c: [8644]}}}}}}}}}}}}}, 0x68: {l: {0x61: {l: {0x72: {l: {0x70: {l: {0x6F: {l: {0x6F: {l: {0x6E: {l: {0x73: {l: {0x3B: {c: [8652]}}}}}}}}}}}}}}}}}}}}}}}}}, 0x72: {l: {0x69: {l: {0x67: {l: {0x68: {l: {0x74: {l: {0x61: {l: {0x72: {l: {0x72: {l: {0x6F: {l: {0x77: {l: {0x73: {l: {0x3B: {c: [8649]}}}}}}}}}}}}}}}}}}}}}}}, 0x73: {l: {0x71: {l: {0x75: {l: {0x69: {l: {0x67: {l: {0x61: {l: {0x72: {l: {0x72: {l: {0x6F: {l: {0x77: {l: {0x3B: {c: [8605]}}}}}}}}}}}}}}}}}}}}}, 0x74: {l: {0x68: {l: {0x72: {l: {0x65: {l: {0x65: {l: {0x74: {l: {0x69: {l: {0x6D: {l: {0x65: {l: {0x73: {l: {0x3B: {c: [8908]}}}}}}}}}}}}}}}}}}}}}}}}}}}, 0x6E: {l: {0x67: {l: {0x3B: {c: [730]}}}}}, 0x73: {l: {0x69: {l: {0x6E: {l: {0x67: {l: {0x64: {l: {0x6F: {l: {0x74: {l: {0x73: {l: {0x65: {l: {0x71: {l: {0x3B: {c: [8787]}}}}}}}}}}}}}}}}}}}}}}}, 0x6C: {l: {0x61: {l: {0x72: {l: {0x72: {l: {0x3B: {c: [8644]}}}}}}}, 0x68: {l: {0x61: {l: {0x72: {l: {0x3B: {c: [8652]}}}}}}}, 0x6D: {l: {0x3B: {c: [8207]}}}}}, 0x6D: {l: {0x6F: {l: {0x75: {l: {0x73: {l: {0x74: {l: {0x61: {l: {0x63: {l: {0x68: {l: {0x65: {l: {0x3B: {c: [9137]}}}}}}}}}, 0x3B: {c: [9137]}}}}}}}}}}}, 0x6E: {l: {0x6D: {l: {0x69: {l: {0x64: {l: {0x3B: {c: [10990]}}}}}}}}}, 0x6F: {l: {0x61: {l: {0x6E: {l: {0x67: {l: {0x3B: {c: [10221]}}}}}, 0x72: {l: {0x72: {l: {0x3B: {c: [8702]}}}}}}}, 0x62: {l: {0x72: {l: {0x6B: {l: {0x3B: {c: [10215]}}}}}}}, 0x70: {l: {0x61: {l: {0x72: {l: {0x3B: {c: [10630]}}}}}, 0x66: {l: {0x3B: {c: [120163]}}}, 0x6C: {l: {0x75: {l: {0x73: {l: {0x3B: {c: [10798]}}}}}}}}}, 0x74: {l: {0x69: {l: {0x6D: {l: {0x65: {l: {0x73: {l: {0x3B: {c: [10805]}}}}}}}}}}}}}, 0x70: {l: {0x61: {l: {0x72: {l: {0x3B: {c: [41]}, 0x67: {l: {0x74: {l: {0x3B: {c: [10644]}}}}}}}}}, 0x70: {l: {0x6F: {l: {0x6C: {l: {0x69: {l: {0x6E: {l: {0x74: {l: {0x3B: {c: [10770]}}}}}}}}}}}}}}}, 0x72: {l: {0x61: {l: {0x72: {l: {0x72: {l: {0x3B: {c: [8649]}}}}}}}}}, 0x73: {l: {0x61: {l: {0x71: {l: {0x75: {l: {0x6F: {l: {0x3B: {c: [8250]}}}}}}}}}, 0x63: {l: {0x72: {l: {0x3B: {c: [120007]}}}}}, 0x68: {l: {0x3B: {c: [8625]}}}, 0x71: {l: {0x62: {l: {0x3B: {c: [93]}}}, 0x75: {l: {0x6F: {l: {0x3B: {c: [8217]}, 0x72: {l: {0x3B: {c: [8217]}}}}}}}}}}}, 0x74: {l: {0x68: {l: {0x72: {l: {0x65: {l: {0x65: {l: {0x3B: {c: [8908]}}}}}}}}}, 0x69: {l: {0x6D: {l: {0x65: {l: {0x73: {l: {0x3B: {c: [8906]}}}}}}}}}, 0x72: {l: {0x69: {l: {0x3B: {c: [9657]}, 0x65: {l: {0x3B: {c: [8885]}}}, 0x66: {l: {0x3B: {c: [9656]}}}, 0x6C: {l: {0x74: {l: {0x72: {l: {0x69: {l: {0x3B: {c: [10702]}}}}}}}}}}}}}}}, 0x75: {l: {0x6C: {l: {0x75: {l: {0x68: {l: {0x61: {l: {0x72: {l: {0x3B: {c: [10600]}}}}}}}}}}}}}, 0x78: {l: {0x3B: {c: [8478]}}}}},
    0x52: {l: {0x61: {l: {0x63: {l: {0x75: {l: {0x74: {l: {0x65: {l: {0x3B: {c: [340]}}}}}}}}}, 0x6E: {l: {0x67: {l: {0x3B: {c: [10219]}}}}}, 0x72: {l: {0x72: {l: {0x3B: {c: [8608]}, 0x74: {l: {0x6C: {l: {0x3B: {c: [10518]}}}}}}}}}}}, 0x42: {l: {0x61: {l: {0x72: {l: {0x72: {l: {0x3B: {c: [10512]}}}}}}}}}, 0x63: {l: {0x61: {l: {0x72: {l: {0x6F: {l: {0x6E: {l: {0x3B: {c: [344]}}}}}}}}}, 0x65: {l: {0x64: {l: {0x69: {l: {0x6C: {l: {0x3B: {c: [342]}}}}}}}}}, 0x79: {l: {0x3B: {c: [1056]}}}}}, 0x65: {l: {0x3B: {c: [8476]}, 0x76: {l: {0x65: {l: {0x72: {l: {0x73: {l: {0x65: {l: {0x45: {l: {0x6C: {l: {0x65: {l: {0x6D: {l: {0x65: {l: {0x6E: {l: {0x74: {l: {0x3B: {c: [8715]}}}}}}}}}}}}}, 0x71: {l: {0x75: {l: {0x69: {l: {0x6C: {l: {0x69: {l: {0x62: {l: {0x72: {l: {0x69: {l: {0x75: {l: {0x6D: {l: {0x3B: {c: [8651]}}}}}}}}}}}}}}}}}}}}}}}, 0x55: {l: {0x70: {l: {0x45: {l: {0x71: {l: {0x75: {l: {0x69: {l: {0x6C: {l: {0x69: {l: {0x62: {l: {0x72: {l: {0x69: {l: {0x75: {l: {0x6D: {l: {0x3B: {c: [10607]}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}, 0x45: {l: {0x47: {l: {0x3B: {c: [174]}}, c: [174]}}}, 0x66: {l: {0x72: {l: {0x3B: {c: [8476]}}}}}, 0x68: {l: {0x6F: {l: {0x3B: {c: [929]}}}}}, 0x69: {l: {0x67: {l: {0x68: {l: {0x74: {l: {0x41: {l: {0x6E: {l: {0x67: {l: {0x6C: {l: {0x65: {l: {0x42: {l: {0x72: {l: {0x61: {l: {0x63: {l: {0x6B: {l: {0x65: {l: {0x74: {l: {0x3B: {c: [10217]}}}}}}}}}}}}}}}}}}}}}}}, 0x72: {l: {0x72: {l: {0x6F: {l: {0x77: {l: {0x42: {l: {0x61: {l: {0x72: {l: {0x3B: {c: [8677]}}}}}}}, 0x3B: {c: [8594]}, 0x4C: {l: {0x65: {l: {0x66: {l: {0x74: {l: {0x41: {l: {0x72: {l: {0x72: {l: {0x6F: {l: {0x77: {l: {0x3B: {c: [8644]}}}}}}}}}}}}}}}}}}}}}}}}}}}}}, 0x61: {l: {0x72: {l: {0x72: {l: {0x6F: {l: {0x77: {l: {0x3B: {c: [8658]}}}}}}}}}}}, 0x43: {l: {0x65: {l: {0x69: {l: {0x6C: {l: {0x69: {l: {0x6E: {l: {0x67: {l: {0x3B: {c: [8969]}}}}}}}}}}}}}}}, 0x44: {l: {0x6F: {l: {0x75: {l: {0x62: {l: {0x6C: {l: {0x65: {l: {0x42: {l: {0x72: {l: {0x61: {l: {0x63: {l: {0x6B: {l: {0x65: {l: {0x74: {l: {0x3B: {c: [10215]}}}}}}}}}}}}}}}}}}}}}}}, 0x77: {l: {0x6E: {l: {0x54: {l: {0x65: {l: {0x65: {l: {0x56: {l: {0x65: {l: {0x63: {l: {0x74: {l: {0x6F: {l: {0x72: {l: {0x3B: {c: [10589]}}}}}}}}}}}}}}}}}}}, 0x56: {l: {0x65: {l: {0x63: {l: {0x74: {l: {0x6F: {l: {0x72: {l: {0x42: {l: {0x61: {l: {0x72: {l: {0x3B: {c: [10581]}}}}}}}, 0x3B: {c: [8642]}}}}}}}}}}}}}}}}}}}}}, 0x46: {l: {0x6C: {l: {0x6F: {l: {0x6F: {l: {0x72: {l: {0x3B: {c: [8971]}}}}}}}}}}}, 0x54: {l: {0x65: {l: {0x65: {l: {0x41: {l: {0x72: {l: {0x72: {l: {0x6F: {l: {0x77: {l: {0x3B: {c: [8614]}}}}}}}}}}}, 0x3B: {c: [8866]}, 0x56: {l: {0x65: {l: {0x63: {l: {0x74: {l: {0x6F: {l: {0x72: {l: {0x3B: {c: [10587]}}}}}}}}}}}}}}}}}, 0x72: {l: {0x69: {l: {0x61: {l: {0x6E: {l: {0x67: {l: {0x6C: {l: {0x65: {l: {0x42: {l: {0x61: {l: {0x72: {l: {0x3B: {c: [10704]}}}}}}}, 0x3B: {c: [8883]}, 0x45: {l: {0x71: {l: {0x75: {l: {0x61: {l: {0x6C: {l: {0x3B: {c: [8885]}}}}}}}}}}}}}}}}}}}}}}}}}}}, 0x55: {l: {0x70: {l: {0x44: {l: {0x6F: {l: {0x77: {l: {0x6E: {l: {0x56: {l: {0x65: {l: {0x63: {l: {0x74: {l: {0x6F: {l: {0x72: {l: {0x3B: {c: [10575]}}}}}}}}}}}}}}}}}}}}}, 0x54: {l: {0x65: {l: {0x65: {l: {0x56: {l: {0x65: {l: {0x63: {l: {0x74: {l: {0x6F: {l: {0x72: {l: {0x3B: {c: [10588]}}}}}}}}}}}}}}}}}}}, 0x56: {l: {0x65: {l: {0x63: {l: {0x74: {l: {0x6F: {l: {0x72: {l: {0x42: {l: {0x61: {l: {0x72: {l: {0x3B: {c: [10580]}}}}}}}, 0x3B: {c: [8638]}}}}}}}}}}}}}}}}}, 0x56: {l: {0x65: {l: {0x63: {l: {0x74: {l: {0x6F: {l: {0x72: {l: {0x42: {l: {0x61: {l: {0x72: {l: {0x3B: {c: [10579]}}}}}}}, 0x3B: {c: [8640]}}}}}}}}}}}}}}}}}}}}}, 0x6F: {l: {0x70: {l: {0x66: {l: {0x3B: {c: [8477]}}}}}, 0x75: {l: {0x6E: {l: {0x64: {l: {0x49: {l: {0x6D: {l: {0x70: {l: {0x6C: {l: {0x69: {l: {0x65: {l: {0x73: {l: {0x3B: {c: [10608]}}}}}}}}}}}}}}}}}}}}}}}, 0x72: {l: {0x69: {l: {0x67: {l: {0x68: {l: {0x74: {l: {0x61: {l: {0x72: {l: {0x72: {l: {0x6F: {l: {0x77: {l: {0x3B: {c: [8667]}}}}}}}}}}}}}}}}}}}}}, 0x73: {l: {0x63: {l: {0x72: {l: {0x3B: {c: [8475]}}}}}, 0x68: {l: {0x3B: {c: [8625]}}}}}, 0x75: {l: {0x6C: {l: {0x65: {l: {0x44: {l: {0x65: {l: {0x6C: {l: {0x61: {l: {0x79: {l: {0x65: {l: {0x64: {l: {0x3B: {c: [10740]}}}}}}}}}}}}}}}}}}}}}}},
    0x53: {l: {0x61: {l: {0x63: {l: {0x75: {l: {0x74: {l: {0x65: {l: {0x3B: {c: [346]}}}}}}}}}}}, 0x63: {l: {0x61: {l: {0x72: {l: {0x6F: {l: {0x6E: {l: {0x3B: {c: [352]}}}}}}}}}, 0x3B: {c: [10940]}, 0x65: {l: {0x64: {l: {0x69: {l: {0x6C: {l: {0x3B: {c: [350]}}}}}}}}}, 0x69: {l: {0x72: {l: {0x63: {l: {0x3B: {c: [348]}}}}}}}, 0x79: {l: {0x3B: {c: [1057]}}}}}, 0x66: {l: {0x72: {l: {0x3B: {c: [120086]}}}}}, 0x48: {l: {0x43: {l: {0x48: {l: {0x63: {l: {0x79: {l: {0x3B: {c: [1065]}}}}}}}}}, 0x63: {l: {0x79: {l: {0x3B: {c: [1064]}}}}}}}, 0x68: {l: {0x6F: {l: {0x72: {l: {0x74: {l: {0x44: {l: {0x6F: {l: {0x77: {l: {0x6E: {l: {0x41: {l: {0x72: {l: {0x72: {l: {0x6F: {l: {0x77: {l: {0x3B: {c: [8595]}}}}}}}}}}}}}}}}}}}, 0x4C: {l: {0x65: {l: {0x66: {l: {0x74: {l: {0x41: {l: {0x72: {l: {0x72: {l: {0x6F: {l: {0x77: {l: {0x3B: {c: [8592]}}}}}}}}}}}}}}}}}}}, 0x52: {l: {0x69: {l: {0x67: {l: {0x68: {l: {0x74: {l: {0x41: {l: {0x72: {l: {0x72: {l: {0x6F: {l: {0x77: {l: {0x3B: {c: [8594]}}}}}}}}}}}}}}}}}}}}}, 0x55: {l: {0x70: {l: {0x41: {l: {0x72: {l: {0x72: {l: {0x6F: {l: {0x77: {l: {0x3B: {c: [8593]}}}}}}}}}}}}}}}}}}}}}}}, 0x69: {l: {0x67: {l: {0x6D: {l: {0x61: {l: {0x3B: {c: [931]}}}}}}}}}, 0x6D: {l: {0x61: {l: {0x6C: {l: {0x6C: {l: {0x43: {l: {0x69: {l: {0x72: {l: {0x63: {l: {0x6C: {l: {0x65: {l: {0x3B: {c: [8728]}}}}}}}}}}}}}}}}}}}}}, 0x4F: {l: {0x46: {l: {0x54: {l: {0x63: {l: {0x79: {l: {0x3B: {c: [1068]}}}}}}}}}}}, 0x6F: {l: {0x70: {l: {0x66: {l: {0x3B: {c: [120138]}}}}}}}, 0x71: {l: {0x72: {l: {0x74: {l: {0x3B: {c: [8730]}}}}}, 0x75: {l: {0x61: {l: {0x72: {l: {0x65: {l: {0x3B: {c: [9633]}, 0x49: {l: {0x6E: {l: {0x74: {l: {0x65: {l: {0x72: {l: {0x73: {l: {0x65: {l: {0x63: {l: {0x74: {l: {0x69: {l: {0x6F: {l: {0x6E: {l: {0x3B: {c: [8851]}}}}}}}}}}}}}}}}}}}}}}}}}, 0x53: {l: {0x75: {l: {0x62: {l: {0x73: {l: {0x65: {l: {0x74: {l: {0x3B: {c: [8847]}, 0x45: {l: {0x71: {l: {0x75: {l: {0x61: {l: {0x6C: {l: {0x3B: {c: [8849]}}}}}}}}}}}}}}}}}}}, 0x70: {l: {0x65: {l: {0x72: {l: {0x73: {l: {0x65: {l: {0x74: {l: {0x3B: {c: [8848]}, 0x45: {l: {0x71: {l: {0x75: {l: {0x61: {l: {0x6C: {l: {0x3B: {c: [8850]}}}}}}}}}}}}}}}}}}}}}}}}}}}, 0x55: {l: {0x6E: {l: {0x69: {l: {0x6F: {l: {0x6E: {l: {0x3B: {c: [8852]}}}}}}}}}}}}}}}}}}}}}, 0x73: {l: {0x63: {l: {0x72: {l: {0x3B: {c: [119982]}}}}}}}, 0x74: {l: {0x61: {l: {0x72: {l: {0x3B: {c: [8902]}}}}}}}, 0x75: {l: {0x62: {l: {0x3B: {c: [8912]}, 0x73: {l: {0x65: {l: {0x74: {l: {0x3B: {c: [8912]}, 0x45: {l: {0x71: {l: {0x75: {l: {0x61: {l: {0x6C: {l: {0x3B: {c: [8838]}}}}}}}}}}}}}}}}}}}, 0x63: {l: {0x63: {l: {0x65: {l: {0x65: {l: {0x64: {l: {0x73: {l: {0x3B: {c: [8827]}, 0x45: {l: {0x71: {l: {0x75: {l: {0x61: {l: {0x6C: {l: {0x3B: {c: [10928]}}}}}}}}}}}, 0x53: {l: {0x6C: {l: {0x61: {l: {0x6E: {l: {0x74: {l: {0x45: {l: {0x71: {l: {0x75: {l: {0x61: {l: {0x6C: {l: {0x3B: {c: [8829]}}}}}}}}}}}}}}}}}}}}}, 0x54: {l: {0x69: {l: {0x6C: {l: {0x64: {l: {0x65: {l: {0x3B: {c: [8831]}}}}}}}}}}}}}}}}}}}}}, 0x68: {l: {0x54: {l: {0x68: {l: {0x61: {l: {0x74: {l: {0x3B: {c: [8715]}}}}}}}}}}}}}, 0x6D: {l: {0x3B: {c: [8721]}}}, 0x70: {l: {0x3B: {c: [8913]}, 0x65: {l: {0x72: {l: {0x73: {l: {0x65: {l: {0x74: {l: {0x3B: {c: [8835]}, 0x45: {l: {0x71: {l: {0x75: {l: {0x61: {l: {0x6C: {l: {0x3B: {c: [8839]}}}}}}}}}}}}}}}}}}}}}, 0x73: {l: {0x65: {l: {0x74: {l: {0x3B: {c: [8913]}}}}}}}}}}}}},
    0x73: {l: {0x61: {l: {0x63: {l: {0x75: {l: {0x74: {l: {0x65: {l: {0x3B: {c: [347]}}}}}}}}}}}, 0x62: {l: {0x71: {l: {0x75: {l: {0x6F: {l: {0x3B: {c: [8218]}}}}}}}}}, 0x63: {l: {0x61: {l: {0x70: {l: {0x3B: {c: [10936]}}}, 0x72: {l: {0x6F: {l: {0x6E: {l: {0x3B: {c: [353]}}}}}}}}}, 0x3B: {c: [8827]}, 0x63: {l: {0x75: {l: {0x65: {l: {0x3B: {c: [8829]}}}}}}}, 0x65: {l: {0x3B: {c: [10928]}, 0x64: {l: {0x69: {l: {0x6C: {l: {0x3B: {c: [351]}}}}}}}}}, 0x45: {l: {0x3B: {c: [10932]}}}, 0x69: {l: {0x72: {l: {0x63: {l: {0x3B: {c: [349]}}}}}}}, 0x6E: {l: {0x61: {l: {0x70: {l: {0x3B: {c: [10938]}}}}}, 0x45: {l: {0x3B: {c: [10934]}}}, 0x73: {l: {0x69: {l: {0x6D: {l: {0x3B: {c: [8937]}}}}}}}}}, 0x70: {l: {0x6F: {l: {0x6C: {l: {0x69: {l: {0x6E: {l: {0x74: {l: {0x3B: {c: [10771]}}}}}}}}}}}}}, 0x73: {l: {0x69: {l: {0x6D: {l: {0x3B: {c: [8831]}}}}}}}, 0x79: {l: {0x3B: {c: [1089]}}}}}, 0x64: {l: {0x6F: {l: {0x74: {l: {0x62: {l: {0x3B: {c: [8865]}}}, 0x3B: {c: [8901]}, 0x65: {l: {0x3B: {c: [10854]}}}}}}}}}, 0x65: {l: {0x61: {l: {0x72: {l: {0x68: {l: {0x6B: {l: {0x3B: {c: [10533]}}}}}, 0x72: {l: {0x3B: {c: [8600]}, 0x6F: {l: {0x77: {l: {0x3B: {c: [8600]}}}}}}}}}}}, 0x41: {l: {0x72: {l: {0x72: {l: {0x3B: {c: [8664]}}}}}}}, 0x63: {l: {0x74: {l: {0x3B: {c: [167]}}, c: [167]}}}, 0x6D: {l: {0x69: {l: {0x3B: {c: [59]}}}}}, 0x73: {l: {0x77: {l: {0x61: {l: {0x72: {l: {0x3B: {c: [10537]}}}}}}}}}, 0x74: {l: {0x6D: {l: {0x69: {l: {0x6E: {l: {0x75: {l: {0x73: {l: {0x3B: {c: [8726]}}}}}}}}}, 0x6E: {l: {0x3B: {c: [8726]}}}}}}}, 0x78: {l: {0x74: {l: {0x3B: {c: [10038]}}}}}}}, 0x66: {l: {0x72: {l: {0x3B: {c: [120112]}, 0x6F: {l: {0x77: {l: {0x6E: {l: {0x3B: {c: [8994]}}}}}}}}}}}, 0x68: {l: {0x61: {l: {0x72: {l: {0x70: {l: {0x3B: {c: [9839]}}}}}}}, 0x63: {l: {0x68: {l: {0x63: {l: {0x79: {l: {0x3B: {c: [1097]}}}}}}}, 0x79: {l: {0x3B: {c: [1096]}}}}}, 0x6F: {l: {0x72: {l: {0x74: {l: {0x6D: {l: {0x69: {l: {0x64: {l: {0x3B: {c: [8739]}}}}}}}, 0x70: {l: {0x61: {l: {0x72: {l: {0x61: {l: {0x6C: {l: {0x6C: {l: {0x65: {l: {0x6C: {l: {0x3B: {c: [8741]}}}}}}}}}}}}}}}}}}}}}}}, 0x79: {l: {0x3B: {c: [173]}}, c: [173]}}}, 0x69: {l: {0x67: {l: {0x6D: {l: {0x61: {l: {0x3B: {c: [963]}, 0x66: {l: {0x3B: {c: [962]}}}, 0x76: {l: {0x3B: {c: [962]}}}}}}}}}, 0x6D: {l: {0x3B: {c: [8764]}, 0x64: {l: {0x6F: {l: {0x74: {l: {0x3B: {c: [10858]}}}}}}}, 0x65: {l: {0x3B: {c: [8771]}, 0x71: {l: {0x3B: {c: [8771]}}}}}, 0x67: {l: {0x3B: {c: [10910]}, 0x45: {l: {0x3B: {c: [10912]}}}}}, 0x6C: {l: {0x3B: {c: [10909]}, 0x45: {l: {0x3B: {c: [10911]}}}}}, 0x6E: {l: {0x65: {l: {0x3B: {c: [8774]}}}}}, 0x70: {l: {0x6C: {l: {0x75: {l: {0x73: {l: {0x3B: {c: [10788]}}}}}}}}}, 0x72: {l: {0x61: {l: {0x72: {l: {0x72: {l: {0x3B: {c: [10610]}}}}}}}}}}}}}, 0x6C: {l: {0x61: {l: {0x72: {l: {0x72: {l: {0x3B: {c: [8592]}}}}}}}}}, 0x6D: {l: {0x61: {l: {0x6C: {l: {0x6C: {l: {0x73: {l: {0x65: {l: {0x74: {l: {0x6D: {l: {0x69: {l: {0x6E: {l: {0x75: {l: {0x73: {l: {0x3B: {c: [8726]}}}}}}}}}}}}}}}}}}}}}, 0x73: {l: {0x68: {l: {0x70: {l: {0x3B: {c: [10803]}}}}}}}}}, 0x65: {l: {0x70: {l: {0x61: {l: {0x72: {l: {0x73: {l: {0x6C: {l: {0x3B: {c: [10724]}}}}}}}}}}}}}, 0x69: {l: {0x64: {l: {0x3B: {c: [8739]}}}, 0x6C: {l: {0x65: {l: {0x3B: {c: [8995]}}}}}}}, 0x74: {l: {0x3B: {c: [10922]}, 0x65: {l: {0x3B: {c: [10924]}, 0x73: {l: {0x3B: {c: [10924, 65024]}}}}}}}}}, 0x6F: {l: {0x66: {l: {0x74: {l: {0x63: {l: {0x79: {l: {0x3B: {c: [1100]}}}}}}}}}, 0x6C: {l: {0x62: {l: {0x61: {l: {0x72: {l: {0x3B: {c: [9023]}}}}}, 0x3B: {c: [10692]}}}, 0x3B: {c: [47]}}}, 0x70: {l: {0x66: {l: {0x3B: {c: [120164]}}}}}}}, 0x70: {l: {0x61: {l: {0x64: {l: {0x65: {l: {0x73: {l: {0x3B: {c: [9824]}, 0x75: {l: {0x69: {l: {0x74: {l: {0x3B: {c: [9824]}}}}}}}}}}}}}, 0x72: {l: {0x3B: {c: [8741]}}}}}}}, 0x71: {l: {0x63: {l: {0x61: {l: {0x70: {l: {0x3B: {c: [8851]}, 0x73: {l: {0x3B: {c: [8851, 65024]}}}}}}}, 0x75: {l: {0x70: {l: {0x3B: {c: [8852]}, 0x73: {l: {0x3B: {c: [8852, 65024]}}}}}}}}}, 0x73: {l: {0x75: {l: {0x62: {l: {0x3B: {c: [8847]}, 0x65: {l: {0x3B: {c: [8849]}}}, 0x73: {l: {0x65: {l: {0x74: {l: {0x3B: {c: [8847]}, 0x65: {l: {0x71: {l: {0x3B: {c: [8849]}}}}}}}}}}}}}, 0x70: {l: {0x3B: {c: [8848]}, 0x65: {l: {0x3B: {c: [8850]}}}, 0x73: {l: {0x65: {l: {0x74: {l: {0x3B: {c: [8848]}, 0x65: {l: {0x71: {l: {0x3B: {c: [8850]}}}}}}}}}}}}}}}}}, 0x75: {l: {0x61: {l: {0x72: {l: {0x65: {l: {0x3B: {c: [9633]}}}, 0x66: {l: {0x3B: {c: [9642]}}}}}}}, 0x3B: {c: [9633]}, 0x66: {l: {0x3B: {c: [9642]}}}}}}}, 0x72: {l: {0x61: {l: {0x72: {l: {0x72: {l: {0x3B: {c: [8594]}}}}}}}}}, 0x73: {l: {0x63: {l: {0x72: {l: {0x3B: {c: [120008]}}}}}, 0x65: {l: {0x74: {l: {0x6D: {l: {0x6E: {l: {0x3B: {c: [8726]}}}}}}}}}, 0x6D: {l: {0x69: {l: {0x6C: {l: {0x65: {l: {0x3B: {c: [8995]}}}}}}}}}, 0x74: {l: {0x61: {l: {0x72: {l: {0x66: {l: {0x3B: {c: [8902]}}}}}}}}}}}, 0x74: {l: {0x61: {l: {0x72: {l: {0x3B: {c: [9734]}, 0x66: {l: {0x3B: {c: [9733]}}}}}}}, 0x72: {l: {0x61: {l: {0x69: {l: {0x67: {l: {0x68: {l: {0x74: {l: {0x65: {l: {0x70: {l: {0x73: {l: {0x69: {l: {0x6C: {l: {0x6F: {l: {0x6E: {l: {0x3B: {c: [1013]}}}}}}}}}}}}}}}, 0x70: {l: {0x68: {l: {0x69: {l: {0x3B: {c: [981]}}}}}}}}}}}}}}}}}, 0x6E: {l: {0x73: {l: {0x3B: {c: [175]}}}}}}}}}, 0x75: {l: {0x62: {l: {0x3B: {c: [8834]}, 0x64: {l: {0x6F: {l: {0x74: {l: {0x3B: {c: [10941]}}}}}}}, 0x45: {l: {0x3B: {c: [10949]}}}, 0x65: {l: {0x3B: {c: [8838]}, 0x64: {l: {0x6F: {l: {0x74: {l: {0x3B: {c: [10947]}}}}}}}}}, 0x6D: {l: {0x75: {l: {0x6C: {l: {0x74: {l: {0x3B: {c: [10945]}}}}}}}}}, 0x6E: {l: {0x45: {l: {0x3B: {c: [10955]}}}, 0x65: {l: {0x3B: {c: [8842]}}}}}, 0x70: {l: {0x6C: {l: {0x75: {l: {0x73: {l: {0x3B: {c: [10943]}}}}}}}}}, 0x72: {l: {0x61: {l: {0x72: {l: {0x72: {l: {0x3B: {c: [10617]}}}}}}}}}, 0x73: {l: {0x65: {l: {0x74: {l: {0x3B: {c: [8834]}, 0x65: {l: {0x71: {l: {0x3B: {c: [8838]}, 0x71: {l: {0x3B: {c: [10949]}}}}}}}, 0x6E: {l: {0x65: {l: {0x71: {l: {0x3B: {c: [8842]}, 0x71: {l: {0x3B: {c: [10955]}}}}}}}}}}}}}, 0x69: {l: {0x6D: {l: {0x3B: {c: [10951]}}}}}, 0x75: {l: {0x62: {l: {0x3B: {c: [10965]}}}, 0x70: {l: {0x3B: {c: [10963]}}}}}}}}}, 0x63: {l: {0x63: {l: {0x61: {l: {0x70: {l: {0x70: {l: {0x72: {l: {0x6F: {l: {0x78: {l: {0x3B: {c: [10936]}}}}}}}}}}}}}, 0x3B: {c: [8827]}, 0x63: {l: {0x75: {l: {0x72: {l: {0x6C: {l: {0x79: {l: {0x65: {l: {0x71: {l: {0x3B: {c: [8829]}}}}}}}}}}}}}}}, 0x65: {l: {0x71: {l: {0x3B: {c: [10928]}}}}}, 0x6E: {l: {0x61: {l: {0x70: {l: {0x70: {l: {0x72: {l: {0x6F: {l: {0x78: {l: {0x3B: {c: [10938]}}}}}}}}}}}}}, 0x65: {l: {0x71: {l: {0x71: {l: {0x3B: {c: [10934]}}}}}}}, 0x73: {l: {0x69: {l: {0x6D: {l: {0x3B: {c: [8937]}}}}}}}}}, 0x73: {l: {0x69: {l: {0x6D: {l: {0x3B: {c: [8831]}}}}}}}}}}}, 0x6D: {l: {0x3B: {c: [8721]}}}, 0x6E: {l: {0x67: {l: {0x3B: {c: [9834]}}}}}, 0x70: {l: {0x31: {l: {0x3B: {c: [185]}}, c: [185]}, 0x32: {l: {0x3B: {c: [178]}}, c: [178]}, 0x33: {l: {0x3B: {c: [179]}}, c: [179]}, 0x3B: {c: [8835]}, 0x64: {l: {0x6F: {l: {0x74: {l: {0x3B: {c: [10942]}}}}}, 0x73: {l: {0x75: {l: {0x62: {l: {0x3B: {c: [10968]}}}}}}}}}, 0x45: {l: {0x3B: {c: [10950]}}}, 0x65: {l: {0x3B: {c: [8839]}, 0x64: {l: {0x6F: {l: {0x74: {l: {0x3B: {c: [10948]}}}}}}}}}, 0x68: {l: {0x73: {l: {0x6F: {l: {0x6C: {l: {0x3B: {c: [10185]}}}}}, 0x75: {l: {0x62: {l: {0x3B: {c: [10967]}}}}}}}}}, 0x6C: {l: {0x61: {l: {0x72: {l: {0x72: {l: {0x3B: {c: [10619]}}}}}}}}}, 0x6D: {l: {0x75: {l: {0x6C: {l: {0x74: {l: {0x3B: {c: [10946]}}}}}}}}}, 0x6E: {l: {0x45: {l: {0x3B: {c: [10956]}}}, 0x65: {l: {0x3B: {c: [8843]}}}}}, 0x70: {l: {0x6C: {l: {0x75: {l: {0x73: {l: {0x3B: {c: [10944]}}}}}}}}}, 0x73: {l: {0x65: {l: {0x74: {l: {0x3B: {c: [8835]}, 0x65: {l: {0x71: {l: {0x3B: {c: [8839]}, 0x71: {l: {0x3B: {c: [10950]}}}}}}}, 0x6E: {l: {0x65: {l: {0x71: {l: {0x3B: {c: [8843]}, 0x71: {l: {0x3B: {c: [10956]}}}}}}}}}}}}}, 0x69: {l: {0x6D: {l: {0x3B: {c: [10952]}}}}}, 0x75: {l: {0x62: {l: {0x3B: {c: [10964]}}}, 0x70: {l: {0x3B: {c: [10966]}}}}}}}}}}}, 0x77: {l: {0x61: {l: {0x72: {l: {0x68: {l: {0x6B: {l: {0x3B: {c: [10534]}}}}}, 0x72: {l: {0x3B: {c: [8601]}, 0x6F: {l: {0x77: {l: {0x3B: {c: [8601]}}}}}}}}}}}, 0x41: {l: {0x72: {l: {0x72: {l: {0x3B: {c: [8665]}}}}}}}, 0x6E: {l: {0x77: {l: {0x61: {l: {0x72: {l: {0x3B: {c: [10538]}}}}}}}}}}}, 0x7A: {l: {0x6C: {l: {0x69: {l: {0x67: {l: {0x3B: {c: [223]}}, c: [223]}}}}}}}}},
    0x54: {l: {0x61: {l: {0x62: {l: {0x3B: {c: [9]}}}, 0x75: {l: {0x3B: {c: [932]}}}}}, 0x63: {l: {0x61: {l: {0x72: {l: {0x6F: {l: {0x6E: {l: {0x3B: {c: [356]}}}}}}}}}, 0x65: {l: {0x64: {l: {0x69: {l: {0x6C: {l: {0x3B: {c: [354]}}}}}}}}}, 0x79: {l: {0x3B: {c: [1058]}}}}}, 0x66: {l: {0x72: {l: {0x3B: {c: [120087]}}}}}, 0x68: {l: {0x65: {l: {0x72: {l: {0x65: {l: {0x66: {l: {0x6F: {l: {0x72: {l: {0x65: {l: {0x3B: {c: [8756]}}}}}}}}}}}}}, 0x74: {l: {0x61: {l: {0x3B: {c: [920]}}}}}}}, 0x69: {l: {0x63: {l: {0x6B: {l: {0x53: {l: {0x70: {l: {0x61: {l: {0x63: {l: {0x65: {l: {0x3B: {c: [8287, 8202]}}}}}}}}}}}}}}}, 0x6E: {l: {0x53: {l: {0x70: {l: {0x61: {l: {0x63: {l: {0x65: {l: {0x3B: {c: [8201]}}}}}}}}}}}}}}}}}, 0x48: {l: {0x4F: {l: {0x52: {l: {0x4E: {l: {0x3B: {c: [222]}}, c: [222]}}}}}}}, 0x69: {l: {0x6C: {l: {0x64: {l: {0x65: {l: {0x3B: {c: [8764]}, 0x45: {l: {0x71: {l: {0x75: {l: {0x61: {l: {0x6C: {l: {0x3B: {c: [8771]}}}}}}}}}}}, 0x46: {l: {0x75: {l: {0x6C: {l: {0x6C: {l: {0x45: {l: {0x71: {l: {0x75: {l: {0x61: {l: {0x6C: {l: {0x3B: {c: [8773]}}}}}}}}}}}}}}}}}}}, 0x54: {l: {0x69: {l: {0x6C: {l: {0x64: {l: {0x65: {l: {0x3B: {c: [8776]}}}}}}}}}}}}}}}}}}}, 0x6F: {l: {0x70: {l: {0x66: {l: {0x3B: {c: [120139]}}}}}}}, 0x52: {l: {0x41: {l: {0x44: {l: {0x45: {l: {0x3B: {c: [8482]}}}}}}}}}, 0x72: {l: {0x69: {l: {0x70: {l: {0x6C: {l: {0x65: {l: {0x44: {l: {0x6F: {l: {0x74: {l: {0x3B: {c: [8411]}}}}}}}}}}}}}}}}}, 0x73: {l: {0x63: {l: {0x72: {l: {0x3B: {c: [119983]}}}}}, 0x74: {l: {0x72: {l: {0x6F: {l: {0x6B: {l: {0x3B: {c: [358]}}}}}}}}}}}, 0x53: {l: {0x63: {l: {0x79: {l: {0x3B: {c: [1062]}}}}}, 0x48: {l: {0x63: {l: {0x79: {l: {0x3B: {c: [1035]}}}}}}}}}}},
    0x74: {l: {0x61: {l: {0x72: {l: {0x67: {l: {0x65: {l: {0x74: {l: {0x3B: {c: [8982]}}}}}}}}}, 0x75: {l: {0x3B: {c: [964]}}}}}, 0x62: {l: {0x72: {l: {0x6B: {l: {0x3B: {c: [9140]}}}}}}}, 0x63: {l: {0x61: {l: {0x72: {l: {0x6F: {l: {0x6E: {l: {0x3B: {c: [357]}}}}}}}}}, 0x65: {l: {0x64: {l: {0x69: {l: {0x6C: {l: {0x3B: {c: [355]}}}}}}}}}, 0x79: {l: {0x3B: {c: [1090]}}}}}, 0x64: {l: {0x6F: {l: {0x74: {l: {0x3B: {c: [8411]}}}}}}}, 0x65: {l: {0x6C: {l: {0x72: {l: {0x65: {l: {0x63: {l: {0x3B: {c: [8981]}}}}}}}}}}}, 0x66: {l: {0x72: {l: {0x3B: {c: [120113]}}}}}, 0x68: {l: {0x65: {l: {0x72: {l: {0x65: {l: {0x34: {l: {0x3B: {c: [8756]}}}, 0x66: {l: {0x6F: {l: {0x72: {l: {0x65: {l: {0x3B: {c: [8756]}}}}}}}}}}}}}, 0x74: {l: {0x61: {l: {0x3B: {c: [952]}, 0x73: {l: {0x79: {l: {0x6D: {l: {0x3B: {c: [977]}}}}}}}, 0x76: {l: {0x3B: {c: [977]}}}}}}}}}, 0x69: {l: {0x63: {l: {0x6B: {l: {0x61: {l: {0x70: {l: {0x70: {l: {0x72: {l: {0x6F: {l: {0x78: {l: {0x3B: {c: [8776]}}}}}}}}}}}}}, 0x73: {l: {0x69: {l: {0x6D: {l: {0x3B: {c: [8764]}}}}}}}}}}}, 0x6E: {l: {0x73: {l: {0x70: {l: {0x3B: {c: [8201]}}}}}}}}}, 0x6B: {l: {0x61: {l: {0x70: {l: {0x3B: {c: [8776]}}}}}, 0x73: {l: {0x69: {l: {0x6D: {l: {0x3B: {c: [8764]}}}}}}}}}, 0x6F: {l: {0x72: {l: {0x6E: {l: {0x3B: {c: [254]}}, c: [254]}}}}}}}, 0x69: {l: {0x6C: {l: {0x64: {l: {0x65: {l: {0x3B: {c: [732]}}}}}}}, 0x6D: {l: {0x65: {l: {0x73: {l: {0x62: {l: {0x61: {l: {0x72: {l: {0x3B: {c: [10801]}}}}}, 0x3B: {c: [8864]}}}, 0x3B: {c: [215]}, 0x64: {l: {0x3B: {c: [10800]}}}}, c: [215]}}}}}, 0x6E: {l: {0x74: {l: {0x3B: {c: [8749]}}}}}}}, 0x6F: {l: {0x65: {l: {0x61: {l: {0x3B: {c: [10536]}}}}}, 0x70: {l: {0x62: {l: {0x6F: {l: {0x74: {l: {0x3B: {c: [9014]}}}}}}}, 0x63: {l: {0x69: {l: {0x72: {l: {0x3B: {c: [10993]}}}}}}}, 0x3B: {c: [8868]}, 0x66: {l: {0x3B: {c: [120165]}, 0x6F: {l: {0x72: {l: {0x6B: {l: {0x3B: {c: [10970]}}}}}}}}}}}, 0x73: {l: {0x61: {l: {0x3B: {c: [10537]}}}}}}}, 0x70: {l: {0x72: {l: {0x69: {l: {0x6D: {l: {0x65: {l: {0x3B: {c: [8244]}}}}}}}}}}}, 0x72: {l: {0x61: {l: {0x64: {l: {0x65: {l: {0x3B: {c: [8482]}}}}}}}, 0x69: {l: {0x61: {l: {0x6E: {l: {0x67: {l: {0x6C: {l: {0x65: {l: {0x3B: {c: [9653]}, 0x64: {l: {0x6F: {l: {0x77: {l: {0x6E: {l: {0x3B: {c: [9663]}}}}}}}}}, 0x6C: {l: {0x65: {l: {0x66: {l: {0x74: {l: {0x3B: {c: [9667]}, 0x65: {l: {0x71: {l: {0x3B: {c: [8884]}}}}}}}}}}}}}, 0x71: {l: {0x3B: {c: [8796]}}}, 0x72: {l: {0x69: {l: {0x67: {l: {0x68: {l: {0x74: {l: {0x3B: {c: [9657]}, 0x65: {l: {0x71: {l: {0x3B: {c: [8885]}}}}}}}}}}}}}}}}}}}}}}}}}, 0x64: {l: {0x6F: {l: {0x74: {l: {0x3B: {c: [9708]}}}}}}}, 0x65: {l: {0x3B: {c: [8796]}}}, 0x6D: {l: {0x69: {l: {0x6E: {l: {0x75: {l: {0x73: {l: {0x3B: {c: [10810]}}}}}}}}}}}, 0x70: {l: {0x6C: {l: {0x75: {l: {0x73: {l: {0x3B: {c: [10809]}}}}}}}}}, 0x73: {l: {0x62: {l: {0x3B: {c: [10701]}}}}}, 0x74: {l: {0x69: {l: {0x6D: {l: {0x65: {l: {0x3B: {c: [10811]}}}}}}}}}}}, 0x70: {l: {0x65: {l: {0x7A: {l: {0x69: {l: {0x75: {l: {0x6D: {l: {0x3B: {c: [9186]}}}}}}}}}}}}}}}, 0x73: {l: {0x63: {l: {0x72: {l: {0x3B: {c: [120009]}}}, 0x79: {l: {0x3B: {c: [1094]}}}}}, 0x68: {l: {0x63: {l: {0x79: {l: {0x3B: {c: [1115]}}}}}}}, 0x74: {l: {0x72: {l: {0x6F: {l: {0x6B: {l: {0x3B: {c: [359]}}}}}}}}}}}, 0x77: {l: {0x69: {l: {0x78: {l: {0x74: {l: {0x3B: {c: [8812]}}}}}}}, 0x6F: {l: {0x68: {l: {0x65: {l: {0x61: {l: {0x64: {l: {0x6C: {l: {0x65: {l: {0x66: {l: {0x74: {l: {0x61: {l: {0x72: {l: {0x72: {l: {0x6F: {l: {0x77: {l: {0x3B: {c: [8606]}}}}}}}}}}}}}}}}}}}, 0x72: {l: {0x69: {l: {0x67: {l: {0x68: {l: {0x74: {l: {0x61: {l: {0x72: {l: {0x72: {l: {0x6F: {l: {0x77: {l: {0x3B: {c: [8608]}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}},
    0x55: {l: {0x61: {l: {0x63: {l: {0x75: {l: {0x74: {l: {0x65: {l: {0x3B: {c: [218]}}, c: [218]}}}}}}}, 0x72: {l: {0x72: {l: {0x3B: {c: [8607]}, 0x6F: {l: {0x63: {l: {0x69: {l: {0x72: {l: {0x3B: {c: [10569]}}}}}}}}}}}}}}}, 0x62: {l: {0x72: {l: {0x63: {l: {0x79: {l: {0x3B: {c: [1038]}}}}}, 0x65: {l: {0x76: {l: {0x65: {l: {0x3B: {c: [364]}}}}}}}}}}}, 0x63: {l: {0x69: {l: {0x72: {l: {0x63: {l: {0x3B: {c: [219]}}, c: [219]}}}}}, 0x79: {l: {0x3B: {c: [1059]}}}}}, 0x64: {l: {0x62: {l: {0x6C: {l: {0x61: {l: {0x63: {l: {0x3B: {c: [368]}}}}}}}}}}}, 0x66: {l: {0x72: {l: {0x3B: {c: [120088]}}}}}, 0x67: {l: {0x72: {l: {0x61: {l: {0x76: {l: {0x65: {l: {0x3B: {c: [217]}}, c: [217]}}}}}}}}}, 0x6D: {l: {0x61: {l: {0x63: {l: {0x72: {l: {0x3B: {c: [362]}}}}}}}}}, 0x6E: {l: {0x64: {l: {0x65: {l: {0x72: {l: {0x42: {l: {0x61: {l: {0x72: {l: {0x3B: {c: [95]}}}}}, 0x72: {l: {0x61: {l: {0x63: {l: {0x65: {l: {0x3B: {c: [9183]}}}, 0x6B: {l: {0x65: {l: {0x74: {l: {0x3B: {c: [9141]}}}}}}}}}}}}}}}, 0x50: {l: {0x61: {l: {0x72: {l: {0x65: {l: {0x6E: {l: {0x74: {l: {0x68: {l: {0x65: {l: {0x73: {l: {0x69: {l: {0x73: {l: {0x3B: {c: [9181]}}}}}}}}}}}}}}}}}}}}}}}}}}}}}, 0x69: {l: {0x6F: {l: {0x6E: {l: {0x3B: {c: [8899]}, 0x50: {l: {0x6C: {l: {0x75: {l: {0x73: {l: {0x3B: {c: [8846]}}}}}}}}}}}}}}}}}, 0x6F: {l: {0x67: {l: {0x6F: {l: {0x6E: {l: {0x3B: {c: [370]}}}}}}}, 0x70: {l: {0x66: {l: {0x3B: {c: [120140]}}}}}}}, 0x70: {l: {0x41: {l: {0x72: {l: {0x72: {l: {0x6F: {l: {0x77: {l: {0x42: {l: {0x61: {l: {0x72: {l: {0x3B: {c: [10514]}}}}}}}, 0x3B: {c: [8593]}, 0x44: {l: {0x6F: {l: {0x77: {l: {0x6E: {l: {0x41: {l: {0x72: {l: {0x72: {l: {0x6F: {l: {0x77: {l: {0x3B: {c: [8645]}}}}}}}}}}}}}}}}}}}}}}}}}}}}}, 0x61: {l: {0x72: {l: {0x72: {l: {0x6F: {l: {0x77: {l: {0x3B: {c: [8657]}}}}}}}}}}}, 0x44: {l: {0x6F: {l: {0x77: {l: {0x6E: {l: {0x41: {l: {0x72: {l: {0x72: {l: {0x6F: {l: {0x77: {l: {0x3B: {c: [8597]}}}}}}}}}}}}}}}}}}}, 0x64: {l: {0x6F: {l: {0x77: {l: {0x6E: {l: {0x61: {l: {0x72: {l: {0x72: {l: {0x6F: {l: {0x77: {l: {0x3B: {c: [8661]}}}}}}}}}}}}}}}}}}}, 0x45: {l: {0x71: {l: {0x75: {l: {0x69: {l: {0x6C: {l: {0x69: {l: {0x62: {l: {0x72: {l: {0x69: {l: {0x75: {l: {0x6D: {l: {0x3B: {c: [10606]}}}}}}}}}}}}}}}}}}}}}}}, 0x70: {l: {0x65: {l: {0x72: {l: {0x4C: {l: {0x65: {l: {0x66: {l: {0x74: {l: {0x41: {l: {0x72: {l: {0x72: {l: {0x6F: {l: {0x77: {l: {0x3B: {c: [8598]}}}}}}}}}}}}}}}}}}}, 0x52: {l: {0x69: {l: {0x67: {l: {0x68: {l: {0x74: {l: {0x41: {l: {0x72: {l: {0x72: {l: {0x6F: {l: {0x77: {l: {0x3B: {c: [8599]}}}}}}}}}}}}}}}}}}}}}}}}}}}, 0x73: {l: {0x69: {l: {0x3B: {c: [978]}, 0x6C: {l: {0x6F: {l: {0x6E: {l: {0x3B: {c: [933]}}}}}}}}}}}, 0x54: {l: {0x65: {l: {0x65: {l: {0x41: {l: {0x72: {l: {0x72: {l: {0x6F: {l: {0x77: {l: {0x3B: {c: [8613]}}}}}}}}}}}, 0x3B: {c: [8869]}}}}}}}}}, 0x72: {l: {0x69: {l: {0x6E: {l: {0x67: {l: {0x3B: {c: [366]}}}}}}}}}, 0x73: {l: {0x63: {l: {0x72: {l: {0x3B: {c: [119984]}}}}}}}, 0x74: {l: {0x69: {l: {0x6C: {l: {0x64: {l: {0x65: {l: {0x3B: {c: [360]}}}}}}}}}}}, 0x75: {l: {0x6D: {l: {0x6C: {l: {0x3B: {c: [220]}}, c: [220]}}}}}}},
    0x75: {l: {0x61: {l: {0x63: {l: {0x75: {l: {0x74: {l: {0x65: {l: {0x3B: {c: [250]}}, c: [250]}}}}}}}, 0x72: {l: {0x72: {l: {0x3B: {c: [8593]}}}}}}}, 0x41: {l: {0x72: {l: {0x72: {l: {0x3B: {c: [8657]}}}}}}}, 0x62: {l: {0x72: {l: {0x63: {l: {0x79: {l: {0x3B: {c: [1118]}}}}}, 0x65: {l: {0x76: {l: {0x65: {l: {0x3B: {c: [365]}}}}}}}}}}}, 0x63: {l: {0x69: {l: {0x72: {l: {0x63: {l: {0x3B: {c: [251]}}, c: [251]}}}}}, 0x79: {l: {0x3B: {c: [1091]}}}}}, 0x64: {l: {0x61: {l: {0x72: {l: {0x72: {l: {0x3B: {c: [8645]}}}}}}}, 0x62: {l: {0x6C: {l: {0x61: {l: {0x63: {l: {0x3B: {c: [369]}}}}}}}}}, 0x68: {l: {0x61: {l: {0x72: {l: {0x3B: {c: [10606]}}}}}}}}}, 0x66: {l: {0x69: {l: {0x73: {l: {0x68: {l: {0x74: {l: {0x3B: {c: [10622]}}}}}}}}}, 0x72: {l: {0x3B: {c: [120114]}}}}}, 0x67: {l: {0x72: {l: {0x61: {l: {0x76: {l: {0x65: {l: {0x3B: {c: [249]}}, c: [249]}}}}}}}}}, 0x48: {l: {0x61: {l: {0x72: {l: {0x3B: {c: [10595]}}}}}}}, 0x68: {l: {0x61: {l: {0x72: {l: {0x6C: {l: {0x3B: {c: [8639]}}}, 0x72: {l: {0x3B: {c: [8638]}}}}}}}, 0x62: {l: {0x6C: {l: {0x6B: {l: {0x3B: {c: [9600]}}}}}}}}}, 0x6C: {l: {0x63: {l: {0x6F: {l: {0x72: {l: {0x6E: {l: {0x3B: {c: [8988]}, 0x65: {l: {0x72: {l: {0x3B: {c: [8988]}}}}}}}}}}}, 0x72: {l: {0x6F: {l: {0x70: {l: {0x3B: {c: [8975]}}}}}}}}}, 0x74: {l: {0x72: {l: {0x69: {l: {0x3B: {c: [9720]}}}}}}}}}, 0x6D: {l: {0x61: {l: {0x63: {l: {0x72: {l: {0x3B: {c: [363]}}}}}}}, 0x6C: {l: {0x3B: {c: [168]}}, c: [168]}}}, 0x6F: {l: {0x67: {l: {0x6F: {l: {0x6E: {l: {0x3B: {c: [371]}}}}}}}, 0x70: {l: {0x66: {l: {0x3B: {c: [120166]}}}}}}}, 0x70: {l: {0x61: {l: {0x72: {l: {0x72: {l: {0x6F: {l: {0x77: {l: {0x3B: {c: [8593]}}}}}}}}}}}, 0x64: {l: {0x6F: {l: {0x77: {l: {0x6E: {l: {0x61: {l: {0x72: {l: {0x72: {l: {0x6F: {l: {0x77: {l: {0x3B: {c: [8597]}}}}}}}}}}}}}}}}}}}, 0x68: {l: {0x61: {l: {0x72: {l: {0x70: {l: {0x6F: {l: {0x6F: {l: {0x6E: {l: {0x6C: {l: {0x65: {l: {0x66: {l: {0x74: {l: {0x3B: {c: [8639]}}}}}}}}}, 0x72: {l: {0x69: {l: {0x67: {l: {0x68: {l: {0x74: {l: {0x3B: {c: [8638]}}}}}}}}}}}}}}}}}}}}}}}}}, 0x6C: {l: {0x75: {l: {0x73: {l: {0x3B: {c: [8846]}}}}}}}, 0x73: {l: {0x69: {l: {0x3B: {c: [965]}, 0x68: {l: {0x3B: {c: [978]}}}, 0x6C: {l: {0x6F: {l: {0x6E: {l: {0x3B: {c: [965]}}}}}}}}}}}, 0x75: {l: {0x70: {l: {0x61: {l: {0x72: {l: {0x72: {l: {0x6F: {l: {0x77: {l: {0x73: {l: {0x3B: {c: [8648]}}}}}}}}}}}}}}}}}}}, 0x72: {l: {0x63: {l: {0x6F: {l: {0x72: {l: {0x6E: {l: {0x3B: {c: [8989]}, 0x65: {l: {0x72: {l: {0x3B: {c: [8989]}}}}}}}}}}}, 0x72: {l: {0x6F: {l: {0x70: {l: {0x3B: {c: [8974]}}}}}}}}}, 0x69: {l: {0x6E: {l: {0x67: {l: {0x3B: {c: [367]}}}}}}}, 0x74: {l: {0x72: {l: {0x69: {l: {0x3B: {c: [9721]}}}}}}}}}, 0x73: {l: {0x63: {l: {0x72: {l: {0x3B: {c: [120010]}}}}}}}, 0x74: {l: {0x64: {l: {0x6F: {l: {0x74: {l: {0x3B: {c: [8944]}}}}}}}, 0x69: {l: {0x6C: {l: {0x64: {l: {0x65: {l: {0x3B: {c: [361]}}}}}}}}}, 0x72: {l: {0x69: {l: {0x3B: {c: [9653]}, 0x66: {l: {0x3B: {c: [9652]}}}}}}}}}, 0x75: {l: {0x61: {l: {0x72: {l: {0x72: {l: {0x3B: {c: [8648]}}}}}}}, 0x6D: {l: {0x6C: {l: {0x3B: {c: [252]}}, c: [252]}}}}}, 0x77: {l: {0x61: {l: {0x6E: {l: {0x67: {l: {0x6C: {l: {0x65: {l: {0x3B: {c: [10663]}}}}}}}}}}}}}}},
    0x76: {l: {0x61: {l: {0x6E: {l: {0x67: {l: {0x72: {l: {0x74: {l: {0x3B: {c: [10652]}}}}}}}}}, 0x72: {l: {0x65: {l: {0x70: {l: {0x73: {l: {0x69: {l: {0x6C: {l: {0x6F: {l: {0x6E: {l: {0x3B: {c: [1013]}}}}}}}}}}}}}}}, 0x6B: {l: {0x61: {l: {0x70: {l: {0x70: {l: {0x61: {l: {0x3B: {c: [1008]}}}}}}}}}}}, 0x6E: {l: {0x6F: {l: {0x74: {l: {0x68: {l: {0x69: {l: {0x6E: {l: {0x67: {l: {0x3B: {c: [8709]}}}}}}}}}}}}}}}, 0x70: {l: {0x68: {l: {0x69: {l: {0x3B: {c: [981]}}}}}, 0x69: {l: {0x3B: {c: [982]}}}, 0x72: {l: {0x6F: {l: {0x70: {l: {0x74: {l: {0x6F: {l: {0x3B: {c: [8733]}}}}}}}}}}}}}, 0x72: {l: {0x3B: {c: [8597]}, 0x68: {l: {0x6F: {l: {0x3B: {c: [1009]}}}}}}}, 0x73: {l: {0x69: {l: {0x67: {l: {0x6D: {l: {0x61: {l: {0x3B: {c: [962]}}}}}}}}}, 0x75: {l: {0x62: {l: {0x73: {l: {0x65: {l: {0x74: {l: {0x6E: {l: {0x65: {l: {0x71: {l: {0x3B: {c: [8842, 65024]}, 0x71: {l: {0x3B: {c: [10955, 65024]}}}}}}}}}}}}}}}}}, 0x70: {l: {0x73: {l: {0x65: {l: {0x74: {l: {0x6E: {l: {0x65: {l: {0x71: {l: {0x3B: {c: [8843, 65024]}, 0x71: {l: {0x3B: {c: [10956, 65024]}}}}}}}}}}}}}}}}}}}}}, 0x74: {l: {0x68: {l: {0x65: {l: {0x74: {l: {0x61: {l: {0x3B: {c: [977]}}}}}}}}}, 0x72: {l: {0x69: {l: {0x61: {l: {0x6E: {l: {0x67: {l: {0x6C: {l: {0x65: {l: {0x6C: {l: {0x65: {l: {0x66: {l: {0x74: {l: {0x3B: {c: [8882]}}}}}}}}}, 0x72: {l: {0x69: {l: {0x67: {l: {0x68: {l: {0x74: {l: {0x3B: {c: [8883]}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}, 0x41: {l: {0x72: {l: {0x72: {l: {0x3B: {c: [8661]}}}}}}}, 0x42: {l: {0x61: {l: {0x72: {l: {0x3B: {c: [10984]}, 0x76: {l: {0x3B: {c: [10985]}}}}}}}}}, 0x63: {l: {0x79: {l: {0x3B: {c: [1074]}}}}}, 0x64: {l: {0x61: {l: {0x73: {l: {0x68: {l: {0x3B: {c: [8866]}}}}}}}}}, 0x44: {l: {0x61: {l: {0x73: {l: {0x68: {l: {0x3B: {c: [8872]}}}}}}}}}, 0x65: {l: {0x65: {l: {0x62: {l: {0x61: {l: {0x72: {l: {0x3B: {c: [8891]}}}}}}}, 0x3B: {c: [8744]}, 0x65: {l: {0x71: {l: {0x3B: {c: [8794]}}}}}}}, 0x6C: {l: {0x6C: {l: {0x69: {l: {0x70: {l: {0x3B: {c: [8942]}}}}}}}}}, 0x72: {l: {0x62: {l: {0x61: {l: {0x72: {l: {0x3B: {c: [124]}}}}}}}, 0x74: {l: {0x3B: {c: [124]}}}}}}}, 0x66: {l: {0x72: {l: {0x3B: {c: [120115]}}}}}, 0x6C: {l: {0x74: {l: {0x72: {l: {0x69: {l: {0x3B: {c: [8882]}}}}}}}}}, 0x6E: {l: {0x73: {l: {0x75: {l: {0x62: {l: {0x3B: {c: [8834, 8402]}}}, 0x70: {l: {0x3B: {c: [8835, 8402]}}}}}}}}}, 0x6F: {l: {0x70: {l: {0x66: {l: {0x3B: {c: [120167]}}}}}}}, 0x70: {l: {0x72: {l: {0x6F: {l: {0x70: {l: {0x3B: {c: [8733]}}}}}}}}}, 0x72: {l: {0x74: {l: {0x72: {l: {0x69: {l: {0x3B: {c: [8883]}}}}}}}}}, 0x73: {l: {0x63: {l: {0x72: {l: {0x3B: {c: [120011]}}}}}, 0x75: {l: {0x62: {l: {0x6E: {l: {0x45: {l: {0x3B: {c: [10955, 65024]}}}, 0x65: {l: {0x3B: {c: [8842, 65024]}}}}}}}, 0x70: {l: {0x6E: {l: {0x45: {l: {0x3B: {c: [10956, 65024]}}}, 0x65: {l: {0x3B: {c: [8843, 65024]}}}}}}}}}}}, 0x7A: {l: {0x69: {l: {0x67: {l: {0x7A: {l: {0x61: {l: {0x67: {l: {0x3B: {c: [10650]}}}}}}}}}}}}}}},
    0x56: {l: {0x62: {l: {0x61: {l: {0x72: {l: {0x3B: {c: [10987]}}}}}}}, 0x63: {l: {0x79: {l: {0x3B: {c: [1042]}}}}}, 0x64: {l: {0x61: {l: {0x73: {l: {0x68: {l: {0x3B: {c: [8873]}, 0x6C: {l: {0x3B: {c: [10982]}}}}}}}}}}}, 0x44: {l: {0x61: {l: {0x73: {l: {0x68: {l: {0x3B: {c: [8875]}}}}}}}}}, 0x65: {l: {0x65: {l: {0x3B: {c: [8897]}}}, 0x72: {l: {0x62: {l: {0x61: {l: {0x72: {l: {0x3B: {c: [8214]}}}}}}}, 0x74: {l: {0x3B: {c: [8214]}, 0x69: {l: {0x63: {l: {0x61: {l: {0x6C: {l: {0x42: {l: {0x61: {l: {0x72: {l: {0x3B: {c: [8739]}}}}}}}, 0x4C: {l: {0x69: {l: {0x6E: {l: {0x65: {l: {0x3B: {c: [124]}}}}}}}}}, 0x53: {l: {0x65: {l: {0x70: {l: {0x61: {l: {0x72: {l: {0x61: {l: {0x74: {l: {0x6F: {l: {0x72: {l: {0x3B: {c: [10072]}}}}}}}}}}}}}}}}}}}, 0x54: {l: {0x69: {l: {0x6C: {l: {0x64: {l: {0x65: {l: {0x3B: {c: [8768]}}}}}}}}}}}}}}}}}}}}}, 0x79: {l: {0x54: {l: {0x68: {l: {0x69: {l: {0x6E: {l: {0x53: {l: {0x70: {l: {0x61: {l: {0x63: {l: {0x65: {l: {0x3B: {c: [8202]}}}}}}}}}}}}}}}}}}}}}}}}}, 0x66: {l: {0x72: {l: {0x3B: {c: [120089]}}}}}, 0x6F: {l: {0x70: {l: {0x66: {l: {0x3B: {c: [120141]}}}}}}}, 0x73: {l: {0x63: {l: {0x72: {l: {0x3B: {c: [119985]}}}}}}}, 0x76: {l: {0x64: {l: {0x61: {l: {0x73: {l: {0x68: {l: {0x3B: {c: [8874]}}}}}}}}}}}}},
    0x57: {l: {0x63: {l: {0x69: {l: {0x72: {l: {0x63: {l: {0x3B: {c: [372]}}}}}}}}}, 0x65: {l: {0x64: {l: {0x67: {l: {0x65: {l: {0x3B: {c: [8896]}}}}}}}}}, 0x66: {l: {0x72: {l: {0x3B: {c: [120090]}}}}}, 0x6F: {l: {0x70: {l: {0x66: {l: {0x3B: {c: [120142]}}}}}}}, 0x73: {l: {0x63: {l: {0x72: {l: {0x3B: {c: [119986]}}}}}}}}},
    0x77: {l: {0x63: {l: {0x69: {l: {0x72: {l: {0x63: {l: {0x3B: {c: [373]}}}}}}}}}, 0x65: {l: {0x64: {l: {0x62: {l: {0x61: {l: {0x72: {l: {0x3B: {c: [10847]}}}}}}}, 0x67: {l: {0x65: {l: {0x3B: {c: [8743]}, 0x71: {l: {0x3B: {c: [8793]}}}}}}}}}, 0x69: {l: {0x65: {l: {0x72: {l: {0x70: {l: {0x3B: {c: [8472]}}}}}}}}}}}, 0x66: {l: {0x72: {l: {0x3B: {c: [120116]}}}}}, 0x6F: {l: {0x70: {l: {0x66: {l: {0x3B: {c: [120168]}}}}}}}, 0x70: {l: {0x3B: {c: [8472]}}}, 0x72: {l: {0x3B: {c: [8768]}, 0x65: {l: {0x61: {l: {0x74: {l: {0x68: {l: {0x3B: {c: [8768]}}}}}}}}}}}, 0x73: {l: {0x63: {l: {0x72: {l: {0x3B: {c: [120012]}}}}}}}}},
    0x78: {l: {0x63: {l: {0x61: {l: {0x70: {l: {0x3B: {c: [8898]}}}}}, 0x69: {l: {0x72: {l: {0x63: {l: {0x3B: {c: [9711]}}}}}}}, 0x75: {l: {0x70: {l: {0x3B: {c: [8899]}}}}}}}, 0x64: {l: {0x74: {l: {0x72: {l: {0x69: {l: {0x3B: {c: [9661]}}}}}}}}}, 0x66: {l: {0x72: {l: {0x3B: {c: [120117]}}}}}, 0x68: {l: {0x61: {l: {0x72: {l: {0x72: {l: {0x3B: {c: [10231]}}}}}}}, 0x41: {l: {0x72: {l: {0x72: {l: {0x3B: {c: [10234]}}}}}}}}}, 0x69: {l: {0x3B: {c: [958]}}}, 0x6C: {l: {0x61: {l: {0x72: {l: {0x72: {l: {0x3B: {c: [10229]}}}}}}}, 0x41: {l: {0x72: {l: {0x72: {l: {0x3B: {c: [10232]}}}}}}}}}, 0x6D: {l: {0x61: {l: {0x70: {l: {0x3B: {c: [10236]}}}}}}}, 0x6E: {l: {0x69: {l: {0x73: {l: {0x3B: {c: [8955]}}}}}}}, 0x6F: {l: {0x64: {l: {0x6F: {l: {0x74: {l: {0x3B: {c: [10752]}}}}}}}, 0x70: {l: {0x66: {l: {0x3B: {c: [120169]}}}, 0x6C: {l: {0x75: {l: {0x73: {l: {0x3B: {c: [10753]}}}}}}}}}, 0x74: {l: {0x69: {l: {0x6D: {l: {0x65: {l: {0x3B: {c: [10754]}}}}}}}}}}}, 0x72: {l: {0x61: {l: {0x72: {l: {0x72: {l: {0x3B: {c: [10230]}}}}}}}, 0x41: {l: {0x72: {l: {0x72: {l: {0x3B: {c: [10233]}}}}}}}}}, 0x73: {l: {0x63: {l: {0x72: {l: {0x3B: {c: [120013]}}}}}, 0x71: {l: {0x63: {l: {0x75: {l: {0x70: {l: {0x3B: {c: [10758]}}}}}}}}}}}, 0x75: {l: {0x70: {l: {0x6C: {l: {0x75: {l: {0x73: {l: {0x3B: {c: [10756]}}}}}}}}}, 0x74: {l: {0x72: {l: {0x69: {l: {0x3B: {c: [9651]}}}}}}}}}, 0x76: {l: {0x65: {l: {0x65: {l: {0x3B: {c: [8897]}}}}}}}, 0x77: {l: {0x65: {l: {0x64: {l: {0x67: {l: {0x65: {l: {0x3B: {c: [8896]}}}}}}}}}}}}},
    0x58: {l: {0x66: {l: {0x72: {l: {0x3B: {c: [120091]}}}}}, 0x69: {l: {0x3B: {c: [926]}}}, 0x6F: {l: {0x70: {l: {0x66: {l: {0x3B: {c: [120143]}}}}}}}, 0x73: {l: {0x63: {l: {0x72: {l: {0x3B: {c: [119987]}}}}}}}}},
    0x59: {l: {0x61: {l: {0x63: {l: {0x75: {l: {0x74: {l: {0x65: {l: {0x3B: {c: [221]}}, c: [221]}}}}}}}}}, 0x41: {l: {0x63: {l: {0x79: {l: {0x3B: {c: [1071]}}}}}}}, 0x63: {l: {0x69: {l: {0x72: {l: {0x63: {l: {0x3B: {c: [374]}}}}}}}, 0x79: {l: {0x3B: {c: [1067]}}}}}, 0x66: {l: {0x72: {l: {0x3B: {c: [120092]}}}}}, 0x49: {l: {0x63: {l: {0x79: {l: {0x3B: {c: [1031]}}}}}}}, 0x6F: {l: {0x70: {l: {0x66: {l: {0x3B: {c: [120144]}}}}}}}, 0x73: {l: {0x63: {l: {0x72: {l: {0x3B: {c: [119988]}}}}}}}, 0x55: {l: {0x63: {l: {0x79: {l: {0x3B: {c: [1070]}}}}}}}, 0x75: {l: {0x6D: {l: {0x6C: {l: {0x3B: {c: [376]}}}}}}}}},
    0x79: {l: {0x61: {l: {0x63: {l: {0x75: {l: {0x74: {l: {0x65: {l: {0x3B: {c: [253]}}, c: [253]}}}}}, 0x79: {l: {0x3B: {c: [1103]}}}}}}}, 0x63: {l: {0x69: {l: {0x72: {l: {0x63: {l: {0x3B: {c: [375]}}}}}}}, 0x79: {l: {0x3B: {c: [1099]}}}}}, 0x65: {l: {0x6E: {l: {0x3B: {c: [165]}}, c: [165]}}}, 0x66: {l: {0x72: {l: {0x3B: {c: [120118]}}}}}, 0x69: {l: {0x63: {l: {0x79: {l: {0x3B: {c: [1111]}}}}}}}, 0x6F: {l: {0x70: {l: {0x66: {l: {0x3B: {c: [120170]}}}}}}}, 0x73: {l: {0x63: {l: {0x72: {l: {0x3B: {c: [120014]}}}}}}}, 0x75: {l: {0x63: {l: {0x79: {l: {0x3B: {c: [1102]}}}}}, 0x6D: {l: {0x6C: {l: {0x3B: {c: [255]}}, c: [255]}}}}}}},
    0x5A: {l: {0x61: {l: {0x63: {l: {0x75: {l: {0x74: {l: {0x65: {l: {0x3B: {c: [377]}}}}}}}}}}}, 0x63: {l: {0x61: {l: {0x72: {l: {0x6F: {l: {0x6E: {l: {0x3B: {c: [381]}}}}}}}}}, 0x79: {l: {0x3B: {c: [1047]}}}}}, 0x64: {l: {0x6F: {l: {0x74: {l: {0x3B: {c: [379]}}}}}}}, 0x65: {l: {0x72: {l: {0x6F: {l: {0x57: {l: {0x69: {l: {0x64: {l: {0x74: {l: {0x68: {l: {0x53: {l: {0x70: {l: {0x61: {l: {0x63: {l: {0x65: {l: {0x3B: {c: [8203]}}}}}}}}}}}}}}}}}}}}}}}}}, 0x74: {l: {0x61: {l: {0x3B: {c: [918]}}}}}}}, 0x66: {l: {0x72: {l: {0x3B: {c: [8488]}}}}}, 0x48: {l: {0x63: {l: {0x79: {l: {0x3B: {c: [1046]}}}}}}}, 0x6F: {l: {0x70: {l: {0x66: {l: {0x3B: {c: [8484]}}}}}}}, 0x73: {l: {0x63: {l: {0x72: {l: {0x3B: {c: [119989]}}}}}}}}},
    0x7A: {l: {0x61: {l: {0x63: {l: {0x75: {l: {0x74: {l: {0x65: {l: {0x3B: {c: [378]}}}}}}}}}}}, 0x63: {l: {0x61: {l: {0x72: {l: {0x6F: {l: {0x6E: {l: {0x3B: {c: [382]}}}}}}}}}, 0x79: {l: {0x3B: {c: [1079]}}}}}, 0x64: {l: {0x6F: {l: {0x74: {l: {0x3B: {c: [380]}}}}}}}, 0x65: {l: {0x65: {l: {0x74: {l: {0x72: {l: {0x66: {l: {0x3B: {c: [8488]}}}}}}}}}, 0x74: {l: {0x61: {l: {0x3B: {c: [950]}}}}}}}, 0x66: {l: {0x72: {l: {0x3B: {c: [120119]}}}}}, 0x68: {l: {0x63: {l: {0x79: {l: {0x3B: {c: [1078]}}}}}}}, 0x69: {l: {0x67: {l: {0x72: {l: {0x61: {l: {0x72: {l: {0x72: {l: {0x3B: {c: [8669]}}}}}}}}}}}}}, 0x6F: {l: {0x70: {l: {0x66: {l: {0x3B: {c: [120171]}}}}}}}, 0x73: {l: {0x63: {l: {0x72: {l: {0x3B: {c: [120015]}}}}}}}, 0x77: {l: {0x6A: {l: {0x3B: {c: [8205]}}}, 0x6E: {l: {0x6A: {l: {0x3B: {c: [8204]}}}}}}}}}
};
},{}],31:[function(require,module,exports){
'use strict';

var UNICODE = require('../common/unicode');

//Aliases
var $ = UNICODE.CODE_POINTS;

//Utils

//OPTIMIZATION: these utility functions should not be moved out of this module. V8 Crankshaft will not inline
//this functions if they will be situated in another module due to context switch.
//Always perform inlining check before modifying this functions ('node --trace-inlining').
function isReservedCodePoint(cp) {
    return cp >= 0xD800 && cp <= 0xDFFF || cp > 0x10FFFF;
}

function isSurrogatePair(cp1, cp2) {
    return cp1 >= 0xD800 && cp1 <= 0xDBFF && cp2 >= 0xDC00 && cp2 <= 0xDFFF;
}

function getSurrogatePairCodePoint(cp1, cp2) {
    return (cp1 - 0xD800) * 0x400 + 0x2400 + cp2;
}

//Preprocessor
//NOTE: HTML input preprocessing
//(see: http://www.whatwg.org/specs/web-apps/current-work/multipage/parsing.html#preprocessing-the-input-stream)
var Preprocessor = module.exports = function (html) {
    this.write(html);

    //NOTE: one leading U+FEFF BYTE ORDER MARK character must be ignored if any are present in the input stream.
    this.pos = this.html.charCodeAt(0) === $.BOM ? 0 : -1;

    this.gapStack = [];
    this.lastGapPos = -1;
    this.skipNextNewLine = false;
};

Preprocessor.prototype.write = function (html) {
    if (this.html) {
        this.html = this.html.substring(0, this.pos + 1) +
                    html +
                    this.html.substring(this.pos + 1, this.html.length);

    }
    else
        this.html = html;


    this.lastCharPos = this.html.length - 1;
};

Preprocessor.prototype.advanceAndPeekCodePoint = function () {
    this.pos++;

    if (this.pos > this.lastCharPos)
        return $.EOF;

    var cp = this.html.charCodeAt(this.pos);

    //NOTE: any U+000A LINE FEED (LF) characters that immediately follow a U+000D CARRIAGE RETURN (CR) character
    //must be ignored.
    if (this.skipNextNewLine && cp === $.LINE_FEED) {
        this.skipNextNewLine = false;
        this._addGap();
        return this.advanceAndPeekCodePoint();
    }

    //NOTE: all U+000D CARRIAGE RETURN (CR) characters must be converted to U+000A LINE FEED (LF) characters
    if (cp === $.CARRIAGE_RETURN) {
        this.skipNextNewLine = true;
        return $.LINE_FEED;
    }

    this.skipNextNewLine = false;

    //OPTIMIZATION: first perform check if the code point in the allowed range that covers most common
    //HTML input (e.g. ASCII codes) to avoid performance-cost operations for high-range code points.
    return cp >= 0xD800 ? this._processHighRangeCodePoint(cp) : cp;
};

Preprocessor.prototype._processHighRangeCodePoint = function (cp) {
    //NOTE: try to peek a surrogate pair
    if (this.pos !== this.lastCharPos) {
        var nextCp = this.html.charCodeAt(this.pos + 1);

        if (isSurrogatePair(cp, nextCp)) {
            //NOTE: we have a surrogate pair. Peek pair character and recalculate code point.
            this.pos++;
            cp = getSurrogatePairCodePoint(cp, nextCp);

            //NOTE: add gap that should be avoided during retreat
            this._addGap();
        }
    }

    if (isReservedCodePoint(cp))
        cp = $.REPLACEMENT_CHARACTER;

    return cp;
};

Preprocessor.prototype._addGap = function () {
    this.gapStack.push(this.lastGapPos);
    this.lastGapPos = this.pos;
};

Preprocessor.prototype.retreat = function () {
    if (this.pos === this.lastGapPos) {
        this.lastGapPos = this.gapStack.pop();
        this.pos--;
    }

    this.pos--;
};

},{"../common/unicode":22}],32:[function(require,module,exports){
'use strict';

var Preprocessor = require('./preprocessor'),
    LocationInfoMixin = require('./location_info_mixin'),
    UNICODE = require('../common/unicode'),
    NAMED_ENTITY_TRIE = require('./named_entity_trie');

//Aliases
var $ = UNICODE.CODE_POINTS,
    $$ = UNICODE.CODE_POINT_SEQUENCES;

//Replacement code points for numeric entities
var NUMERIC_ENTITY_REPLACEMENTS = {
    0x00: 0xFFFD, 0x0D: 0x000D, 0x80: 0x20AC, 0x81: 0x0081, 0x82: 0x201A, 0x83: 0x0192, 0x84: 0x201E,
    0x85: 0x2026, 0x86: 0x2020, 0x87: 0x2021, 0x88: 0x02C6, 0x89: 0x2030, 0x8A: 0x0160, 0x8B: 0x2039,
    0x8C: 0x0152, 0x8D: 0x008D, 0x8E: 0x017D, 0x8F: 0x008F, 0x90: 0x0090, 0x91: 0x2018, 0x92: 0x2019,
    0x93: 0x201C, 0x94: 0x201D, 0x95: 0x2022, 0x96: 0x2013, 0x97: 0x2014, 0x98: 0x02DC, 0x99: 0x2122,
    0x9A: 0x0161, 0x9B: 0x203A, 0x9C: 0x0153, 0x9D: 0x009D, 0x9E: 0x017E, 0x9F: 0x0178
};

//States
var DATA_STATE = 'DATA_STATE',
    CHARACTER_REFERENCE_IN_DATA_STATE = 'CHARACTER_REFERENCE_IN_DATA_STATE',
    RCDATA_STATE = 'RCDATA_STATE',
    CHARACTER_REFERENCE_IN_RCDATA_STATE = 'CHARACTER_REFERENCE_IN_RCDATA_STATE',
    RAWTEXT_STATE = 'RAWTEXT_STATE',
    SCRIPT_DATA_STATE = 'SCRIPT_DATA_STATE',
    PLAINTEXT_STATE = 'PLAINTEXT_STATE',
    TAG_OPEN_STATE = 'TAG_OPEN_STATE',
    END_TAG_OPEN_STATE = 'END_TAG_OPEN_STATE',
    TAG_NAME_STATE = 'TAG_NAME_STATE',
    RCDATA_LESS_THAN_SIGN_STATE = 'RCDATA_LESS_THAN_SIGN_STATE',
    RCDATA_END_TAG_OPEN_STATE = 'RCDATA_END_TAG_OPEN_STATE',
    RCDATA_END_TAG_NAME_STATE = 'RCDATA_END_TAG_NAME_STATE',
    RAWTEXT_LESS_THAN_SIGN_STATE = 'RAWTEXT_LESS_THAN_SIGN_STATE',
    RAWTEXT_END_TAG_OPEN_STATE = 'RAWTEXT_END_TAG_OPEN_STATE',
    RAWTEXT_END_TAG_NAME_STATE = 'RAWTEXT_END_TAG_NAME_STATE',
    SCRIPT_DATA_LESS_THAN_SIGN_STATE = 'SCRIPT_DATA_LESS_THAN_SIGN_STATE',
    SCRIPT_DATA_END_TAG_OPEN_STATE = 'SCRIPT_DATA_END_TAG_OPEN_STATE',
    SCRIPT_DATA_END_TAG_NAME_STATE = 'SCRIPT_DATA_END_TAG_NAME_STATE',
    SCRIPT_DATA_ESCAPE_START_STATE = 'SCRIPT_DATA_ESCAPE_START_STATE',
    SCRIPT_DATA_ESCAPE_START_DASH_STATE = 'SCRIPT_DATA_ESCAPE_START_DASH_STATE',
    SCRIPT_DATA_ESCAPED_STATE = 'SCRIPT_DATA_ESCAPED_STATE',
    SCRIPT_DATA_ESCAPED_DASH_STATE = 'SCRIPT_DATA_ESCAPED_DASH_STATE',
    SCRIPT_DATA_ESCAPED_DASH_DASH_STATE = 'SCRIPT_DATA_ESCAPED_DASH_DASH_STATE',
    SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN_STATE = 'SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN_STATE',
    SCRIPT_DATA_ESCAPED_END_TAG_OPEN_STATE = 'SCRIPT_DATA_ESCAPED_END_TAG_OPEN_STATE',
    SCRIPT_DATA_ESCAPED_END_TAG_NAME_STATE = 'SCRIPT_DATA_ESCAPED_END_TAG_NAME_STATE',
    SCRIPT_DATA_DOUBLE_ESCAPE_START_STATE = 'SCRIPT_DATA_DOUBLE_ESCAPE_START_STATE',
    SCRIPT_DATA_DOUBLE_ESCAPED_STATE = 'SCRIPT_DATA_DOUBLE_ESCAPED_STATE',
    SCRIPT_DATA_DOUBLE_ESCAPED_DASH_STATE = 'SCRIPT_DATA_DOUBLE_ESCAPED_DASH_STATE',
    SCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH_STATE = 'SCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH_STATE',
    SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN_STATE = 'SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN_STATE',
    SCRIPT_DATA_DOUBLE_ESCAPE_END_STATE = 'SCRIPT_DATA_DOUBLE_ESCAPE_END_STATE',
    BEFORE_ATTRIBUTE_NAME_STATE = 'BEFORE_ATTRIBUTE_NAME_STATE',
    ATTRIBUTE_NAME_STATE = 'ATTRIBUTE_NAME_STATE',
    AFTER_ATTRIBUTE_NAME_STATE = 'AFTER_ATTRIBUTE_NAME_STATE',
    BEFORE_ATTRIBUTE_VALUE_STATE = 'BEFORE_ATTRIBUTE_VALUE_STATE',
    ATTRIBUTE_VALUE_DOUBLE_QUOTED_STATE = 'ATTRIBUTE_VALUE_DOUBLE_QUOTED_STATE',
    ATTRIBUTE_VALUE_SINGLE_QUOTED_STATE = 'ATTRIBUTE_VALUE_SINGLE_QUOTED_STATE',
    ATTRIBUTE_VALUE_UNQUOTED_STATE = 'ATTRIBUTE_VALUE_UNQUOTED_STATE',
    CHARACTER_REFERENCE_IN_ATTRIBUTE_VALUE_STATE = 'CHARACTER_REFERENCE_IN_ATTRIBUTE_VALUE_STATE',
    AFTER_ATTRIBUTE_VALUE_QUOTED_STATE = 'AFTER_ATTRIBUTE_VALUE_QUOTED_STATE',
    SELF_CLOSING_START_TAG_STATE = 'SELF_CLOSING_START_TAG_STATE',
    BOGUS_COMMENT_STATE = 'BOGUS_COMMENT_STATE',
    MARKUP_DECLARATION_OPEN_STATE = 'MARKUP_DECLARATION_OPEN_STATE',
    COMMENT_START_STATE = 'COMMENT_START_STATE',
    COMMENT_START_DASH_STATE = 'COMMENT_START_DASH_STATE',
    COMMENT_STATE = 'COMMENT_STATE',
    COMMENT_END_DASH_STATE = 'COMMENT_END_DASH_STATE',
    COMMENT_END_STATE = 'COMMENT_END_STATE',
    COMMENT_END_BANG_STATE = 'COMMENT_END_BANG_STATE',
    DOCTYPE_STATE = 'DOCTYPE_STATE',
    BEFORE_DOCTYPE_NAME_STATE = 'BEFORE_DOCTYPE_NAME_STATE',
    DOCTYPE_NAME_STATE = 'DOCTYPE_NAME_STATE',
    AFTER_DOCTYPE_NAME_STATE = 'AFTER_DOCTYPE_NAME_STATE',
    AFTER_DOCTYPE_PUBLIC_KEYWORD_STATE = 'AFTER_DOCTYPE_PUBLIC_KEYWORD_STATE',
    BEFORE_DOCTYPE_PUBLIC_IDENTIFIER_STATE = 'BEFORE_DOCTYPE_PUBLIC_IDENTIFIER_STATE',
    DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED_STATE = 'DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED_STATE',
    DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED_STATE = 'DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED_STATE',
    AFTER_DOCTYPE_PUBLIC_IDENTIFIER_STATE = 'AFTER_DOCTYPE_PUBLIC_IDENTIFIER_STATE',
    BETWEEN_DOCTYPE_PUBLIC_AND_SYSTEM_IDENTIFIERS_STATE = 'BETWEEN_DOCTYPE_PUBLIC_AND_SYSTEM_IDENTIFIERS_STATE',
    AFTER_DOCTYPE_SYSTEM_KEYWORD_STATE = 'AFTER_DOCTYPE_SYSTEM_KEYWORD_STATE',
    BEFORE_DOCTYPE_SYSTEM_IDENTIFIER_STATE = 'BEFORE_DOCTYPE_SYSTEM_IDENTIFIER_STATE',
    DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED_STATE = 'DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED_STATE',
    DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED_STATE = 'DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED_STATE',
    AFTER_DOCTYPE_SYSTEM_IDENTIFIER_STATE = 'AFTER_DOCTYPE_SYSTEM_IDENTIFIER_STATE',
    BOGUS_DOCTYPE_STATE = 'BOGUS_DOCTYPE_STATE',
    CDATA_SECTION_STATE = 'CDATA_SECTION_STATE';

//Utils

//OPTIMIZATION: these utility functions should not be moved out of this module. V8 Crankshaft will not inline
//this functions if they will be situated in another module due to context switch.
//Always perform inlining check before modifying this functions ('node --trace-inlining').
function isWhitespace(cp) {
    return cp === $.SPACE || cp === $.LINE_FEED || cp === $.TABULATION || cp === $.FORM_FEED;
}

function isAsciiDigit(cp) {
    return cp >= $.DIGIT_0 && cp <= $.DIGIT_9;
}

function isAsciiUpper(cp) {
    return cp >= $.LATIN_CAPITAL_A && cp <= $.LATIN_CAPITAL_Z;
}

function isAsciiLower(cp) {
    return cp >= $.LATIN_SMALL_A && cp <= $.LATIN_SMALL_Z;
}

function isAsciiAlphaNumeric(cp) {
    return isAsciiDigit(cp) || isAsciiUpper(cp) || isAsciiLower(cp);
}

function isDigit(cp, isHex) {
    return isAsciiDigit(cp) || (isHex && ((cp >= $.LATIN_CAPITAL_A && cp <= $.LATIN_CAPITAL_F) ||
                                          (cp >= $.LATIN_SMALL_A && cp <= $.LATIN_SMALL_F)));
}

function isReservedCodePoint(cp) {
    return cp >= 0xD800 && cp <= 0xDFFF || cp > 0x10FFFF;
}

function toAsciiLowerCodePoint(cp) {
    return cp + 0x0020;
}

//NOTE: String.fromCharCode() function can handle only characters from BMP subset.
//So, we need to workaround this manually.
//(see: https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/String/fromCharCode#Getting_it_to_work_with_higher_values)
function toChar(cp) {
    if (cp <= 0xFFFF)
        return String.fromCharCode(cp);

    cp -= 0x10000;
    return String.fromCharCode(cp >>> 10 & 0x3FF | 0xD800) + String.fromCharCode(0xDC00 | cp & 0x3FF);
}

function toAsciiLowerChar(cp) {
    return String.fromCharCode(toAsciiLowerCodePoint(cp));
}

//Tokenizer
var Tokenizer = module.exports = function (html, options) {
    this.disableEntitiesDecoding = false;

    this.preprocessor = new Preprocessor(html);

    this.tokenQueue = [];

    this.allowCDATA = false;

    this.state = DATA_STATE;
    this.returnState = '';

    this.consumptionPos = 0;

    this.tempBuff = [];
    this.additionalAllowedCp = void 0;
    this.lastStartTagName = '';

    this.currentCharacterToken = null;
    this.currentToken = null;
    this.currentAttr = null;

    if (options) {
        this.disableEntitiesDecoding = !options.decodeHtmlEntities;

        if (options.locationInfo)
            LocationInfoMixin.assign(this);
    }
};

//Token types
Tokenizer.CHARACTER_TOKEN = 'CHARACTER_TOKEN';
Tokenizer.NULL_CHARACTER_TOKEN = 'NULL_CHARACTER_TOKEN';
Tokenizer.WHITESPACE_CHARACTER_TOKEN = 'WHITESPACE_CHARACTER_TOKEN';
Tokenizer.START_TAG_TOKEN = 'START_TAG_TOKEN';
Tokenizer.END_TAG_TOKEN = 'END_TAG_TOKEN';
Tokenizer.COMMENT_TOKEN = 'COMMENT_TOKEN';
Tokenizer.DOCTYPE_TOKEN = 'DOCTYPE_TOKEN';
Tokenizer.EOF_TOKEN = 'EOF_TOKEN';

//Tokenizer initial states for different modes
Tokenizer.MODE = Tokenizer.prototype.MODE = {
    DATA: DATA_STATE,
    RCDATA: RCDATA_STATE,
    RAWTEXT: RAWTEXT_STATE,
    SCRIPT_DATA: SCRIPT_DATA_STATE,
    PLAINTEXT: PLAINTEXT_STATE
};

//Static
Tokenizer.getTokenAttr = function (token, attrName) {
    for (var i = token.attrs.length - 1; i >= 0; i--) {
        if (token.attrs[i].name === attrName)
            return token.attrs[i].value;
    }

    return null;
};

//Get token
Tokenizer.prototype.getNextToken = function () {
    while (!this.tokenQueue.length)
        this[this.state](this._consume());

    return this.tokenQueue.shift();
};

//Consumption
Tokenizer.prototype._consume = function () {
    this.consumptionPos++;
    return this.preprocessor.advanceAndPeekCodePoint();
};

Tokenizer.prototype._unconsume = function () {
    this.consumptionPos--;
    this.preprocessor.retreat();
};

Tokenizer.prototype._unconsumeSeveral = function (count) {
    while (count--)
        this._unconsume();
};

Tokenizer.prototype._reconsumeInState = function (state) {
    this.state = state;
    this._unconsume();
};

Tokenizer.prototype._consumeSubsequentIfMatch = function (pattern, startCp, caseSensitive) {
    var rollbackPos = this.consumptionPos,
        isMatch = true,
        patternLength = pattern.length,
        patternPos = 0,
        cp = startCp,
        patternCp = void 0;

    for (; patternPos < patternLength; patternPos++) {
        if (patternPos > 0)
            cp = this._consume();

        if (cp === $.EOF) {
            isMatch = false;
            break;
        }

        patternCp = pattern[patternPos];

        if (cp !== patternCp && (caseSensitive || cp !== toAsciiLowerCodePoint(patternCp))) {
            isMatch = false;
            break;
        }
    }

    if (!isMatch)
        this._unconsumeSeveral(this.consumptionPos - rollbackPos);

    return isMatch;
};

//Lookahead
Tokenizer.prototype._lookahead = function () {
    var cp = this.preprocessor.advanceAndPeekCodePoint();
    this.preprocessor.retreat();

    return cp;
};

//Temp buffer
Tokenizer.prototype.isTempBufferEqualToScriptString = function () {
    if (this.tempBuff.length !== $$.SCRIPT_STRING.length)
        return false;

    for (var i = 0; i < this.tempBuff.length; i++) {
        if (this.tempBuff[i] !== $$.SCRIPT_STRING[i])
            return false;
    }

    return true;
};

//Token creation
Tokenizer.prototype.buildStartTagToken = function (tagName) {
    return {
        type: Tokenizer.START_TAG_TOKEN,
        tagName: tagName,
        selfClosing: false,
        attrs: []
    };
};

Tokenizer.prototype.buildEndTagToken = function (tagName) {
    return {
        type: Tokenizer.END_TAG_TOKEN,
        tagName: tagName,
        ignored: false,
        attrs: []
    };
};

Tokenizer.prototype._createStartTagToken = function (tagNameFirstCh) {
    this.currentToken = this.buildStartTagToken(tagNameFirstCh);
};

Tokenizer.prototype._createEndTagToken = function (tagNameFirstCh) {
    this.currentToken = this.buildEndTagToken(tagNameFirstCh);
};

Tokenizer.prototype._createCommentToken = function () {
    this.currentToken = {
        type: Tokenizer.COMMENT_TOKEN,
        data: ''
    };
};

Tokenizer.prototype._createDoctypeToken = function (doctypeNameFirstCh) {
    this.currentToken = {
        type: Tokenizer.DOCTYPE_TOKEN,
        name: doctypeNameFirstCh || '',
        forceQuirks: false,
        publicId: null,
        systemId: null
    };
};

Tokenizer.prototype._createCharacterToken = function (type, ch) {
    this.currentCharacterToken = {
        type: type,
        chars: ch
    };
};

//Tag attributes
Tokenizer.prototype._createAttr = function (attrNameFirstCh) {
    this.currentAttr = {
        name: attrNameFirstCh,
        value: ''
    };
};

Tokenizer.prototype._isDuplicateAttr = function () {
    return Tokenizer.getTokenAttr(this.currentToken, this.currentAttr.name) !== null;
};

Tokenizer.prototype._leaveAttrName = function (toState) {
    this.state = toState;

    if (!this._isDuplicateAttr())
        this.currentToken.attrs.push(this.currentAttr);
};

//Appropriate end tag token
//(see: http://www.whatwg.org/specs/web-apps/current-work/multipage/tokenization.html#appropriate-end-tag-token)
Tokenizer.prototype._isAppropriateEndTagToken = function () {
    return this.lastStartTagName === this.currentToken.tagName;
};

//Token emission
Tokenizer.prototype._emitCurrentToken = function () {
    this._emitCurrentCharacterToken();

    //NOTE: store emited start tag's tagName to determine is the following end tag token is appropriate.
    if (this.currentToken.type === Tokenizer.START_TAG_TOKEN)
        this.lastStartTagName = this.currentToken.tagName;

    this.tokenQueue.push(this.currentToken);
    this.currentToken = null;
};

Tokenizer.prototype._emitCurrentCharacterToken = function () {
    if (this.currentCharacterToken) {
        this.tokenQueue.push(this.currentCharacterToken);
        this.currentCharacterToken = null;
    }
};

Tokenizer.prototype._emitEOFToken = function () {
    this._emitCurrentCharacterToken();
    this.tokenQueue.push({type: Tokenizer.EOF_TOKEN});
};

//Characters emission

//OPTIMIZATION: specification uses only one type of character tokens (one token per character).
//This causes a huge memory overhead and a lot of unnecessary parser loops. parse5 uses 3 groups of characters.
//If we have a sequence of characters that belong to the same group, parser can process it
//as a single solid character token.
//So, there are 3 types of character tokens in parse5:
//1)NULL_CHARACTER_TOKEN - \u0000-character sequences (e.g. '\u0000\u0000\u0000')
//2)WHITESPACE_CHARACTER_TOKEN - any whitespace/new-line character sequences (e.g. '\n  \r\t   \f')
//3)CHARACTER_TOKEN - any character sequence which don't belong to groups 1 and 2 (e.g. 'abcdef1234@@#$%^')
Tokenizer.prototype._appendCharToCurrentCharacterToken = function (type, ch) {
    if (this.currentCharacterToken && this.currentCharacterToken.type !== type)
        this._emitCurrentCharacterToken();

    if (this.currentCharacterToken)
        this.currentCharacterToken.chars += ch;

    else
        this._createCharacterToken(type, ch);
};

Tokenizer.prototype._emitCodePoint = function (cp) {
    var type = Tokenizer.CHARACTER_TOKEN;

    if (isWhitespace(cp))
        type = Tokenizer.WHITESPACE_CHARACTER_TOKEN;

    else if (cp === $.NULL)
        type = Tokenizer.NULL_CHARACTER_TOKEN;

    this._appendCharToCurrentCharacterToken(type, toChar(cp));
};

Tokenizer.prototype._emitSeveralCodePoints = function (codePoints) {
    for (var i = 0; i < codePoints.length; i++)
        this._emitCodePoint(codePoints[i]);
};

//NOTE: used then we emit character explicitly. This is always a non-whitespace and a non-null character.
//So we can avoid additional checks here.
Tokenizer.prototype._emitChar = function (ch) {
    this._appendCharToCurrentCharacterToken(Tokenizer.CHARACTER_TOKEN, ch);
};

//Character reference tokenization
Tokenizer.prototype._consumeNumericEntity = function (isHex) {
    var digits = '',
        nextCp = void 0;

    do {
        digits += toChar(this._consume());
        nextCp = this._lookahead();
    } while (nextCp !== $.EOF && isDigit(nextCp, isHex));

    if (this._lookahead() === $.SEMICOLON)
        this._consume();

    var referencedCp = parseInt(digits, isHex ? 16 : 10),
        replacement = NUMERIC_ENTITY_REPLACEMENTS[referencedCp];

    if (replacement)
        return replacement;

    if (isReservedCodePoint(referencedCp))
        return $.REPLACEMENT_CHARACTER;

    return referencedCp;
};

Tokenizer.prototype._consumeNamedEntity = function (startCp, inAttr) {
    var referencedCodePoints = null,
        entityCodePointsCount = 0,
        cp = startCp,
        leaf = NAMED_ENTITY_TRIE[cp],
        consumedCount = 1,
        semicolonTerminated = false;

    for (; leaf && cp !== $.EOF; cp = this._consume(), consumedCount++, leaf = leaf.l && leaf.l[cp]) {
        if (leaf.c) {
            //NOTE: we have at least one named reference match. But we don't stop lookup at this point,
            //because longer matches still can be found (e.g. '&not' and '&notin;') except the case
            //then found match is terminated by semicolon.
            referencedCodePoints = leaf.c;
            entityCodePointsCount = consumedCount;

            if (cp === $.SEMICOLON) {
                semicolonTerminated = true;
                break;
            }
        }
    }

    if (referencedCodePoints) {
        if (!semicolonTerminated) {
            //NOTE: unconsume excess (e.g. 'it' in '&notit')
            this._unconsumeSeveral(consumedCount - entityCodePointsCount);

            //NOTE: If the character reference is being consumed as part of an attribute and the next character
            //is either a U+003D EQUALS SIGN character (=) or an alphanumeric ASCII character, then, for historical
            //reasons, all the characters that were matched after the U+0026 AMPERSAND character (&) must be
            //unconsumed, and nothing is returned.
            //However, if this next character is in fact a U+003D EQUALS SIGN character (=), then this is a
            //parse error, because some legacy user agents will misinterpret the markup in those cases.
            //(see: http://www.whatwg.org/specs/web-apps/current-work/multipage/tokenization.html#tokenizing-character-references)
            if (inAttr) {
                var nextCp = this._lookahead();

                if (nextCp === $.EQUALS_SIGN || isAsciiAlphaNumeric(nextCp)) {
                    this._unconsumeSeveral(entityCodePointsCount);
                    return null;
                }
            }
        }

        return referencedCodePoints;
    }

    this._unconsumeSeveral(consumedCount);

    return null;
};

Tokenizer.prototype._consumeCharacterReference = function (startCp, inAttr) {
    if (this.disableEntitiesDecoding || isWhitespace(startCp) || startCp === $.GREATER_THAN_SIGN ||
        startCp === $.AMPERSAND || startCp === this.additionalAllowedCp || startCp === $.EOF) {
        //NOTE: not a character reference. No characters are consumed, and nothing is returned.
        this._unconsume();
        return null;
    }

    else if (startCp === $.NUMBER_SIGN) {
        //NOTE: we have a numeric entity candidate, now we should determine if it's hex or decimal
        var isHex = false,
            nextCp = this._lookahead();

        if (nextCp === $.LATIN_SMALL_X || nextCp === $.LATIN_CAPITAL_X) {
            this._consume();
            isHex = true;
        }

        nextCp = this._lookahead();

        //NOTE: if we have at least one digit this is a numeric entity for sure, so we consume it
        if (nextCp !== $.EOF && isDigit(nextCp, isHex))
            return [this._consumeNumericEntity(isHex)];

        else {
            //NOTE: otherwise this is a bogus number entity and a parse error. Unconsume the number sign
            //and the 'x'-character if appropriate.
            this._unconsumeSeveral(isHex ? 2 : 1);
            return null;
        }
    }

    else
        return this._consumeNamedEntity(startCp, inAttr);
};

//State machine
var _ = Tokenizer.prototype;

//12.2.4.1 Data state
//------------------------------------------------------------------
_[DATA_STATE] = function dataState(cp) {
    if (cp === $.AMPERSAND)
        this.state = CHARACTER_REFERENCE_IN_DATA_STATE;

    else if (cp === $.LESS_THAN_SIGN)
        this.state = TAG_OPEN_STATE;

    else if (cp === $.NULL)
        this._emitCodePoint(cp);

    else if (cp === $.EOF)
        this._emitEOFToken();

    else
        this._emitCodePoint(cp);
};


//12.2.4.2 Character reference in data state
//------------------------------------------------------------------
_[CHARACTER_REFERENCE_IN_DATA_STATE] = function characterReferenceInDataState(cp) {
    this.state = DATA_STATE;
    this.additionalAllowedCp = void 0;

    var referencedCodePoints = this._consumeCharacterReference(cp, false);

    if (referencedCodePoints)
        this._emitSeveralCodePoints(referencedCodePoints);
    else
        this._emitChar('&');
};


//12.2.4.3 RCDATA state
//------------------------------------------------------------------
_[RCDATA_STATE] = function rcdataState(cp) {
    if (cp === $.AMPERSAND)
        this.state = CHARACTER_REFERENCE_IN_RCDATA_STATE;

    else if (cp === $.LESS_THAN_SIGN)
        this.state = RCDATA_LESS_THAN_SIGN_STATE;

    else if (cp === $.NULL)
        this._emitChar(UNICODE.REPLACEMENT_CHARACTER);

    else if (cp === $.EOF)
        this._emitEOFToken();

    else
        this._emitCodePoint(cp);
};


//12.2.4.4 Character reference in RCDATA state
//------------------------------------------------------------------
_[CHARACTER_REFERENCE_IN_RCDATA_STATE] = function characterReferenceInRcdataState(cp) {
    this.state = RCDATA_STATE;
    this.additionalAllowedCp = void 0;

    var referencedCodePoints = this._consumeCharacterReference(cp, false);

    if (referencedCodePoints)
        this._emitSeveralCodePoints(referencedCodePoints);
    else
        this._emitChar('&');
};


//12.2.4.5 RAWTEXT state
//------------------------------------------------------------------
_[RAWTEXT_STATE] = function rawtextState(cp) {
    if (cp === $.LESS_THAN_SIGN)
        this.state = RAWTEXT_LESS_THAN_SIGN_STATE;

    else if (cp === $.NULL)
        this._emitChar(UNICODE.REPLACEMENT_CHARACTER);

    else if (cp === $.EOF)
        this._emitEOFToken();

    else
        this._emitCodePoint(cp);
};


//12.2.4.6 Script data state
//------------------------------------------------------------------
_[SCRIPT_DATA_STATE] = function scriptDataState(cp) {
    if (cp === $.LESS_THAN_SIGN)
        this.state = SCRIPT_DATA_LESS_THAN_SIGN_STATE;

    else if (cp === $.NULL)
        this._emitChar(UNICODE.REPLACEMENT_CHARACTER);

    else if (cp === $.EOF)
        this._emitEOFToken();

    else
        this._emitCodePoint(cp);
};


//12.2.4.7 PLAINTEXT state
//------------------------------------------------------------------
_[PLAINTEXT_STATE] = function plaintextState(cp) {
    if (cp === $.NULL)
        this._emitChar(UNICODE.REPLACEMENT_CHARACTER);

    else if (cp === $.EOF)
        this._emitEOFToken();

    else
        this._emitCodePoint(cp);
};


//12.2.4.8 Tag open state
//------------------------------------------------------------------
_[TAG_OPEN_STATE] = function tagOpenState(cp) {
    if (cp === $.EXCLAMATION_MARK)
        this.state = MARKUP_DECLARATION_OPEN_STATE;

    else if (cp === $.SOLIDUS)
        this.state = END_TAG_OPEN_STATE;

    else if (isAsciiUpper(cp)) {
        this._createStartTagToken(toAsciiLowerChar(cp));
        this.state = TAG_NAME_STATE;
    }

    else if (isAsciiLower(cp)) {
        this._createStartTagToken(toChar(cp));
        this.state = TAG_NAME_STATE;
    }

    else if (cp === $.QUESTION_MARK) {
        //NOTE: call bogus comment state directly with current consumed character to avoid unnecessary reconsumption.
        this[BOGUS_COMMENT_STATE](cp);
    }

    else {
        this._emitChar('<');
        this._reconsumeInState(DATA_STATE);
    }
};


//12.2.4.9 End tag open state
//------------------------------------------------------------------
_[END_TAG_OPEN_STATE] = function endTagOpenState(cp) {
    if (isAsciiUpper(cp)) {
        this._createEndTagToken(toAsciiLowerChar(cp));
        this.state = TAG_NAME_STATE;
    }

    else if (isAsciiLower(cp)) {
        this._createEndTagToken(toChar(cp));
        this.state = TAG_NAME_STATE;
    }

    else if (cp === $.GREATER_THAN_SIGN)
        this.state = DATA_STATE;

    else if (cp === $.EOF) {
        this._reconsumeInState(DATA_STATE);
        this._emitChar('<');
        this._emitChar('/');
    }

    else {
        //NOTE: call bogus comment state directly with current consumed character to avoid unnecessary reconsumption.
        this[BOGUS_COMMENT_STATE](cp);
    }
};


//12.2.4.10 Tag name state
//------------------------------------------------------------------
_[TAG_NAME_STATE] = function tagNameState(cp) {
    if (isWhitespace(cp))
        this.state = BEFORE_ATTRIBUTE_NAME_STATE;

    else if (cp === $.SOLIDUS)
        this.state = SELF_CLOSING_START_TAG_STATE;

    else if (cp === $.GREATER_THAN_SIGN) {
        this.state = DATA_STATE;
        this._emitCurrentToken();
    }

    else if (isAsciiUpper(cp))
        this.currentToken.tagName += toAsciiLowerChar(cp);

    else if (cp === $.NULL)
        this.currentToken.tagName += UNICODE.REPLACEMENT_CHARACTER;

    else if (cp === $.EOF)
        this._reconsumeInState(DATA_STATE);

    else
        this.currentToken.tagName += toChar(cp);
};


//12.2.4.11 RCDATA less-than sign state
//------------------------------------------------------------------
_[RCDATA_LESS_THAN_SIGN_STATE] = function rcdataLessThanSignState(cp) {
    if (cp === $.SOLIDUS) {
        this.tempBuff = [];
        this.state = RCDATA_END_TAG_OPEN_STATE;
    }

    else {
        this._emitChar('<');
        this._reconsumeInState(RCDATA_STATE);
    }
};


//12.2.4.12 RCDATA end tag open state
//------------------------------------------------------------------
_[RCDATA_END_TAG_OPEN_STATE] = function rcdataEndTagOpenState(cp) {
    if (isAsciiUpper(cp)) {
        this._createEndTagToken(toAsciiLowerChar(cp));
        this.tempBuff.push(cp);
        this.state = RCDATA_END_TAG_NAME_STATE;
    }

    else if (isAsciiLower(cp)) {
        this._createEndTagToken(toChar(cp));
        this.tempBuff.push(cp);
        this.state = RCDATA_END_TAG_NAME_STATE;
    }

    else {
        this._emitChar('<');
        this._emitChar('/');
        this._reconsumeInState(RCDATA_STATE);
    }
};


//12.2.4.13 RCDATA end tag name state
//------------------------------------------------------------------
_[RCDATA_END_TAG_NAME_STATE] = function rcdataEndTagNameState(cp) {
    if (isAsciiUpper(cp)) {
        this.currentToken.tagName += toAsciiLowerChar(cp);
        this.tempBuff.push(cp);
    }

    else if (isAsciiLower(cp)) {
        this.currentToken.tagName += toChar(cp);
        this.tempBuff.push(cp);
    }

    else {
        if (this._isAppropriateEndTagToken()) {
            if (isWhitespace(cp)) {
                this.state = BEFORE_ATTRIBUTE_NAME_STATE;
                return;
            }

            if (cp === $.SOLIDUS) {
                this.state = SELF_CLOSING_START_TAG_STATE;
                return;
            }

            if (cp === $.GREATER_THAN_SIGN) {
                this.state = DATA_STATE;
                this._emitCurrentToken();
                return;
            }
        }

        this._emitChar('<');
        this._emitChar('/');
        this._emitSeveralCodePoints(this.tempBuff);
        this._reconsumeInState(RCDATA_STATE);
    }
};


//12.2.4.14 RAWTEXT less-than sign state
//------------------------------------------------------------------
_[RAWTEXT_LESS_THAN_SIGN_STATE] = function rawtextLessThanSignState(cp) {
    if (cp === $.SOLIDUS) {
        this.tempBuff = [];
        this.state = RAWTEXT_END_TAG_OPEN_STATE;
    }

    else {
        this._emitChar('<');
        this._reconsumeInState(RAWTEXT_STATE);
    }
};


//12.2.4.15 RAWTEXT end tag open state
//------------------------------------------------------------------
_[RAWTEXT_END_TAG_OPEN_STATE] = function rawtextEndTagOpenState(cp) {
    if (isAsciiUpper(cp)) {
        this._createEndTagToken(toAsciiLowerChar(cp));
        this.tempBuff.push(cp);
        this.state = RAWTEXT_END_TAG_NAME_STATE;
    }

    else if (isAsciiLower(cp)) {
        this._createEndTagToken(toChar(cp));
        this.tempBuff.push(cp);
        this.state = RAWTEXT_END_TAG_NAME_STATE;
    }

    else {
        this._emitChar('<');
        this._emitChar('/');
        this._reconsumeInState(RAWTEXT_STATE);
    }
};


//12.2.4.16 RAWTEXT end tag name state
//------------------------------------------------------------------
_[RAWTEXT_END_TAG_NAME_STATE] = function rawtextEndTagNameState(cp) {
    if (isAsciiUpper(cp)) {
        this.currentToken.tagName += toAsciiLowerChar(cp);
        this.tempBuff.push(cp);
    }

    else if (isAsciiLower(cp)) {
        this.currentToken.tagName += toChar(cp);
        this.tempBuff.push(cp);
    }

    else {
        if (this._isAppropriateEndTagToken()) {
            if (isWhitespace(cp)) {
                this.state = BEFORE_ATTRIBUTE_NAME_STATE;
                return;
            }

            if (cp === $.SOLIDUS) {
                this.state = SELF_CLOSING_START_TAG_STATE;
                return;
            }

            if (cp === $.GREATER_THAN_SIGN) {
                this._emitCurrentToken();
                this.state = DATA_STATE;
                return;
            }
        }

        this._emitChar('<');
        this._emitChar('/');
        this._emitSeveralCodePoints(this.tempBuff);
        this._reconsumeInState(RAWTEXT_STATE);
    }
};


//12.2.4.17 Script data less-than sign state
//------------------------------------------------------------------
_[SCRIPT_DATA_LESS_THAN_SIGN_STATE] = function scriptDataLessThanSignState(cp) {
    if (cp === $.SOLIDUS) {
        this.tempBuff = [];
        this.state = SCRIPT_DATA_END_TAG_OPEN_STATE;
    }

    else if (cp === $.EXCLAMATION_MARK) {
        this.state = SCRIPT_DATA_ESCAPE_START_STATE;
        this._emitChar('<');
        this._emitChar('!');
    }

    else {
        this._emitChar('<');
        this._reconsumeInState(SCRIPT_DATA_STATE);
    }
};


//12.2.4.18 Script data end tag open state
//------------------------------------------------------------------
_[SCRIPT_DATA_END_TAG_OPEN_STATE] = function scriptDataEndTagOpenState(cp) {
    if (isAsciiUpper(cp)) {
        this._createEndTagToken(toAsciiLowerChar(cp));
        this.tempBuff.push(cp);
        this.state = SCRIPT_DATA_END_TAG_NAME_STATE;
    }

    else if (isAsciiLower(cp)) {
        this._createEndTagToken(toChar(cp));
        this.tempBuff.push(cp);
        this.state = SCRIPT_DATA_END_TAG_NAME_STATE;
    }

    else {
        this._emitChar('<');
        this._emitChar('/');
        this._reconsumeInState(SCRIPT_DATA_STATE);
    }
};


//12.2.4.19 Script data end tag name state
//------------------------------------------------------------------
_[SCRIPT_DATA_END_TAG_NAME_STATE] = function scriptDataEndTagNameState(cp) {
    if (isAsciiUpper(cp)) {
        this.currentToken.tagName += toAsciiLowerChar(cp);
        this.tempBuff.push(cp);
    }

    else if (isAsciiLower(cp)) {
        this.currentToken.tagName += toChar(cp);
        this.tempBuff.push(cp);
    }

    else {
        if (this._isAppropriateEndTagToken()) {
            if (isWhitespace(cp)) {
                this.state = BEFORE_ATTRIBUTE_NAME_STATE;
                return;
            }

            else if (cp === $.SOLIDUS) {
                this.state = SELF_CLOSING_START_TAG_STATE;
                return;
            }

            else if (cp === $.GREATER_THAN_SIGN) {
                this._emitCurrentToken();
                this.state = DATA_STATE;
                return;
            }
        }

        this._emitChar('<');
        this._emitChar('/');
        this._emitSeveralCodePoints(this.tempBuff);
        this._reconsumeInState(SCRIPT_DATA_STATE);
    }
};


//12.2.4.20 Script data escape start state
//------------------------------------------------------------------
_[SCRIPT_DATA_ESCAPE_START_STATE] = function scriptDataEscapeStartState(cp) {
    if (cp === $.HYPHEN_MINUS) {
        this.state = SCRIPT_DATA_ESCAPE_START_DASH_STATE;
        this._emitChar('-');
    }

    else
        this._reconsumeInState(SCRIPT_DATA_STATE);
};


//12.2.4.21 Script data escape start dash state
//------------------------------------------------------------------
_[SCRIPT_DATA_ESCAPE_START_DASH_STATE] = function scriptDataEscapeStartDashState(cp) {
    if (cp === $.HYPHEN_MINUS) {
        this.state = SCRIPT_DATA_ESCAPED_DASH_DASH_STATE;
        this._emitChar('-');
    }

    else
        this._reconsumeInState(SCRIPT_DATA_STATE);
};


//12.2.4.22 Script data escaped state
//------------------------------------------------------------------
_[SCRIPT_DATA_ESCAPED_STATE] = function scriptDataEscapedState(cp) {
    if (cp === $.HYPHEN_MINUS) {
        this.state = SCRIPT_DATA_ESCAPED_DASH_STATE;
        this._emitChar('-');
    }

    else if (cp === $.LESS_THAN_SIGN)
        this.state = SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN_STATE;

    else if (cp === $.NULL)
        this._emitChar(UNICODE.REPLACEMENT_CHARACTER);

    else if (cp === $.EOF)
        this._reconsumeInState(DATA_STATE);

    else
        this._emitCodePoint(cp);
};


//12.2.4.23 Script data escaped dash state
//------------------------------------------------------------------
_[SCRIPT_DATA_ESCAPED_DASH_STATE] = function scriptDataEscapedDashState(cp) {
    if (cp === $.HYPHEN_MINUS) {
        this.state = SCRIPT_DATA_ESCAPED_DASH_DASH_STATE;
        this._emitChar('-');
    }

    else if (cp === $.LESS_THAN_SIGN)
        this.state = SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN_STATE;

    else if (cp === $.NULL) {
        this.state = SCRIPT_DATA_ESCAPED_STATE;
        this._emitChar(UNICODE.REPLACEMENT_CHARACTER);
    }

    else if (cp === $.EOF)
        this._reconsumeInState(DATA_STATE);

    else {
        this.state = SCRIPT_DATA_ESCAPED_STATE;
        this._emitCodePoint(cp);
    }
};


//12.2.4.24 Script data escaped dash dash state
//------------------------------------------------------------------
_[SCRIPT_DATA_ESCAPED_DASH_DASH_STATE] = function scriptDataEscapedDashDashState(cp) {
    if (cp === $.HYPHEN_MINUS)
        this._emitChar('-');

    else if (cp === $.LESS_THAN_SIGN)
        this.state = SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN_STATE;

    else if (cp === $.GREATER_THAN_SIGN) {
        this.state = SCRIPT_DATA_STATE;
        this._emitChar('>');
    }

    else if (cp === $.NULL) {
        this.state = SCRIPT_DATA_ESCAPED_STATE;
        this._emitChar(UNICODE.REPLACEMENT_CHARACTER);
    }

    else if (cp === $.EOF)
        this._reconsumeInState(DATA_STATE);

    else {
        this.state = SCRIPT_DATA_ESCAPED_STATE;
        this._emitCodePoint(cp);
    }
};


//12.2.4.25 Script data escaped less-than sign state
//------------------------------------------------------------------
_[SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN_STATE] = function scriptDataEscapedLessThanSignState(cp) {
    if (cp === $.SOLIDUS) {
        this.tempBuff = [];
        this.state = SCRIPT_DATA_ESCAPED_END_TAG_OPEN_STATE;
    }

    else if (isAsciiUpper(cp)) {
        this.tempBuff = [];
        this.tempBuff.push(toAsciiLowerCodePoint(cp));
        this.state = SCRIPT_DATA_DOUBLE_ESCAPE_START_STATE;
        this._emitChar('<');
        this._emitCodePoint(cp);
    }

    else if (isAsciiLower(cp)) {
        this.tempBuff = [];
        this.tempBuff.push(cp);
        this.state = SCRIPT_DATA_DOUBLE_ESCAPE_START_STATE;
        this._emitChar('<');
        this._emitCodePoint(cp);
    }

    else {
        this._emitChar('<');
        this._reconsumeInState(SCRIPT_DATA_ESCAPED_STATE);
    }
};


//12.2.4.26 Script data escaped end tag open state
//------------------------------------------------------------------
_[SCRIPT_DATA_ESCAPED_END_TAG_OPEN_STATE] = function scriptDataEscapedEndTagOpenState(cp) {
    if (isAsciiUpper(cp)) {
        this._createEndTagToken(toAsciiLowerChar(cp));
        this.tempBuff.push(cp);
        this.state = SCRIPT_DATA_ESCAPED_END_TAG_NAME_STATE;
    }

    else if (isAsciiLower(cp)) {
        this._createEndTagToken(toChar(cp));
        this.tempBuff.push(cp);
        this.state = SCRIPT_DATA_ESCAPED_END_TAG_NAME_STATE;
    }

    else {
        this._emitChar('<');
        this._emitChar('/');
        this._reconsumeInState(SCRIPT_DATA_ESCAPED_STATE);
    }
};


//12.2.4.27 Script data escaped end tag name state
//------------------------------------------------------------------
_[SCRIPT_DATA_ESCAPED_END_TAG_NAME_STATE] = function scriptDataEscapedEndTagNameState(cp) {
    if (isAsciiUpper(cp)) {
        this.currentToken.tagName += toAsciiLowerChar(cp);
        this.tempBuff.push(cp);
    }

    else if (isAsciiLower(cp)) {
        this.currentToken.tagName += toChar(cp);
        this.tempBuff.push(cp);
    }

    else {
        if (this._isAppropriateEndTagToken()) {
            if (isWhitespace(cp)) {
                this.state = BEFORE_ATTRIBUTE_NAME_STATE;
                return;
            }

            if (cp === $.SOLIDUS) {
                this.state = SELF_CLOSING_START_TAG_STATE;
                return;
            }

            if (cp === $.GREATER_THAN_SIGN) {
                this._emitCurrentToken();
                this.state = DATA_STATE;
                return;
            }
        }

        this._emitChar('<');
        this._emitChar('/');
        this._emitSeveralCodePoints(this.tempBuff);
        this._reconsumeInState(SCRIPT_DATA_ESCAPED_STATE);
    }
};


//12.2.4.28 Script data double escape start state
//------------------------------------------------------------------
_[SCRIPT_DATA_DOUBLE_ESCAPE_START_STATE] = function scriptDataDoubleEscapeStartState(cp) {
    if (isWhitespace(cp) || cp === $.SOLIDUS || cp === $.GREATER_THAN_SIGN) {
        this.state = this.isTempBufferEqualToScriptString() ? SCRIPT_DATA_DOUBLE_ESCAPED_STATE : SCRIPT_DATA_ESCAPED_STATE;
        this._emitCodePoint(cp);
    }

    else if (isAsciiUpper(cp)) {
        this.tempBuff.push(toAsciiLowerCodePoint(cp));
        this._emitCodePoint(cp);
    }

    else if (isAsciiLower(cp)) {
        this.tempBuff.push(cp);
        this._emitCodePoint(cp);
    }

    else
        this._reconsumeInState(SCRIPT_DATA_ESCAPED_STATE);
};


//12.2.4.29 Script data double escaped state
//------------------------------------------------------------------
_[SCRIPT_DATA_DOUBLE_ESCAPED_STATE] = function scriptDataDoubleEscapedState(cp) {
    if (cp === $.HYPHEN_MINUS) {
        this.state = SCRIPT_DATA_DOUBLE_ESCAPED_DASH_STATE;
        this._emitChar('-');
    }

    else if (cp === $.LESS_THAN_SIGN) {
        this.state = SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN_STATE;
        this._emitChar('<');
    }

    else if (cp === $.NULL)
        this._emitChar(UNICODE.REPLACEMENT_CHARACTER);

    else if (cp === $.EOF)
        this._reconsumeInState(DATA_STATE);

    else
        this._emitCodePoint(cp);
};


//12.2.4.30 Script data double escaped dash state
//------------------------------------------------------------------
_[SCRIPT_DATA_DOUBLE_ESCAPED_DASH_STATE] = function scriptDataDoubleEscapedDashState(cp) {
    if (cp === $.HYPHEN_MINUS) {
        this.state = SCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH_STATE;
        this._emitChar('-');
    }

    else if (cp === $.LESS_THAN_SIGN) {
        this.state = SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN_STATE;
        this._emitChar('<');
    }

    else if (cp === $.NULL) {
        this.state = SCRIPT_DATA_DOUBLE_ESCAPED_STATE;
        this._emitChar(UNICODE.REPLACEMENT_CHARACTER);
    }

    else if (cp === $.EOF)
        this._reconsumeInState(DATA_STATE);

    else {
        this.state = SCRIPT_DATA_DOUBLE_ESCAPED_STATE;
        this._emitCodePoint(cp);
    }
};


//12.2.4.31 Script data double escaped dash dash state
//------------------------------------------------------------------
_[SCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH_STATE] = function scriptDataDoubleEscapedDashDashState(cp) {
    if (cp === $.HYPHEN_MINUS)
        this._emitChar('-');

    else if (cp === $.LESS_THAN_SIGN) {
        this.state = SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN_STATE;
        this._emitChar('<');
    }

    else if (cp === $.GREATER_THAN_SIGN) {
        this.state = SCRIPT_DATA_STATE;
        this._emitChar('>');
    }

    else if (cp === $.NULL) {
        this.state = SCRIPT_DATA_DOUBLE_ESCAPED_STATE;
        this._emitChar(UNICODE.REPLACEMENT_CHARACTER);
    }

    else if (cp === $.EOF)
        this._reconsumeInState(DATA_STATE);

    else {
        this.state = SCRIPT_DATA_DOUBLE_ESCAPED_STATE;
        this._emitCodePoint(cp);
    }
};


//12.2.4.32 Script data double escaped less-than sign state
//------------------------------------------------------------------
_[SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN_STATE] = function scriptDataDoubleEscapedLessThanSignState(cp) {
    if (cp === $.SOLIDUS) {
        this.tempBuff = [];
        this.state = SCRIPT_DATA_DOUBLE_ESCAPE_END_STATE;
        this._emitChar('/');
    }

    else
        this._reconsumeInState(SCRIPT_DATA_DOUBLE_ESCAPED_STATE);
};


//12.2.4.33 Script data double escape end state
//------------------------------------------------------------------
_[SCRIPT_DATA_DOUBLE_ESCAPE_END_STATE] = function scriptDataDoubleEscapeEndState(cp) {
    if (isWhitespace(cp) || cp === $.SOLIDUS || cp === $.GREATER_THAN_SIGN) {
        this.state = this.isTempBufferEqualToScriptString() ? SCRIPT_DATA_ESCAPED_STATE : SCRIPT_DATA_DOUBLE_ESCAPED_STATE;

        this._emitCodePoint(cp);
    }

    else if (isAsciiUpper(cp)) {
        this.tempBuff.push(toAsciiLowerCodePoint(cp));
        this._emitCodePoint(cp);
    }

    else if (isAsciiLower(cp)) {
        this.tempBuff.push(cp);
        this._emitCodePoint(cp);
    }

    else
        this._reconsumeInState(SCRIPT_DATA_DOUBLE_ESCAPED_STATE);
};


//12.2.4.34 Before attribute name state
//------------------------------------------------------------------
_[BEFORE_ATTRIBUTE_NAME_STATE] = function beforeAttributeNameState(cp) {
    if (isWhitespace(cp))
        return;

    if (cp === $.SOLIDUS)
        this.state = SELF_CLOSING_START_TAG_STATE;

    else if (cp === $.GREATER_THAN_SIGN) {
        this.state = DATA_STATE;
        this._emitCurrentToken();
    }

    else if (isAsciiUpper(cp)) {
        this._createAttr(toAsciiLowerChar(cp));
        this.state = ATTRIBUTE_NAME_STATE;
    }

    else if (cp === $.NULL) {
        this._createAttr(UNICODE.REPLACEMENT_CHARACTER);
        this.state = ATTRIBUTE_NAME_STATE;
    }

    else if (cp === $.QUOTATION_MARK || cp === $.APOSTROPHE || cp === $.LESS_THAN_SIGN || cp === $.EQUALS_SIGN) {
        this._createAttr(toChar(cp));
        this.state = ATTRIBUTE_NAME_STATE;
    }

    else if (cp === $.EOF)
        this._reconsumeInState(DATA_STATE);

    else {
        this._createAttr(toChar(cp));
        this.state = ATTRIBUTE_NAME_STATE;
    }
};


//12.2.4.35 Attribute name state
//------------------------------------------------------------------
_[ATTRIBUTE_NAME_STATE] = function attributeNameState(cp) {
    if (isWhitespace(cp))
        this._leaveAttrName(AFTER_ATTRIBUTE_NAME_STATE);

    else if (cp === $.SOLIDUS)
        this._leaveAttrName(SELF_CLOSING_START_TAG_STATE);

    else if (cp === $.EQUALS_SIGN)
        this._leaveAttrName(BEFORE_ATTRIBUTE_VALUE_STATE);

    else if (cp === $.GREATER_THAN_SIGN) {
        this._leaveAttrName(DATA_STATE);
        this._emitCurrentToken();
    }

    else if (isAsciiUpper(cp))
        this.currentAttr.name += toAsciiLowerChar(cp);

    else if (cp === $.QUOTATION_MARK || cp === $.APOSTROPHE || cp === $.LESS_THAN_SIGN)
        this.currentAttr.name += toChar(cp);

    else if (cp === $.NULL)
        this.currentAttr.name += UNICODE.REPLACEMENT_CHARACTER;

    else if (cp === $.EOF)
        this._reconsumeInState(DATA_STATE);

    else
        this.currentAttr.name += toChar(cp);
};


//12.2.4.36 After attribute name state
//------------------------------------------------------------------
_[AFTER_ATTRIBUTE_NAME_STATE] = function afterAttributeNameState(cp) {
    if (isWhitespace(cp))
        return;

    if (cp === $.SOLIDUS)
        this.state = SELF_CLOSING_START_TAG_STATE;

    else if (cp === $.EQUALS_SIGN)
        this.state = BEFORE_ATTRIBUTE_VALUE_STATE;

    else if (cp === $.GREATER_THAN_SIGN) {
        this.state = DATA_STATE;
        this._emitCurrentToken();
    }

    else if (isAsciiUpper(cp)) {
        this._createAttr(toAsciiLowerChar(cp));
        this.state = ATTRIBUTE_NAME_STATE;
    }

    else if (cp === $.NULL) {
        this._createAttr(UNICODE.REPLACEMENT_CHARACTER);
        this.state = ATTRIBUTE_NAME_STATE;
    }

    else if (cp === $.QUOTATION_MARK || cp === $.APOSTROPHE || cp === $.LESS_THAN_SIGN) {
        this._createAttr(toChar(cp));
        this.state = ATTRIBUTE_NAME_STATE;
    }

    else if (cp === $.EOF)
        this._reconsumeInState(DATA_STATE);

    else {
        this._createAttr(toChar(cp));
        this.state = ATTRIBUTE_NAME_STATE;
    }
};


//12.2.4.37 Before attribute value state
//------------------------------------------------------------------
_[BEFORE_ATTRIBUTE_VALUE_STATE] = function beforeAttributeValueState(cp) {
    if (isWhitespace(cp))
        return;

    if (cp === $.QUOTATION_MARK)
        this.state = ATTRIBUTE_VALUE_DOUBLE_QUOTED_STATE;

    else if (cp === $.AMPERSAND)
        this._reconsumeInState(ATTRIBUTE_VALUE_UNQUOTED_STATE);

    else if (cp === $.APOSTROPHE)
        this.state = ATTRIBUTE_VALUE_SINGLE_QUOTED_STATE;

    else if (cp === $.NULL) {
        this.currentAttr.value += UNICODE.REPLACEMENT_CHARACTER;
        this.state = ATTRIBUTE_VALUE_UNQUOTED_STATE;
    }

    else if (cp === $.GREATER_THAN_SIGN) {
        this.state = DATA_STATE;
        this._emitCurrentToken();
    }

    else if (cp === $.LESS_THAN_SIGN || cp === $.EQUALS_SIGN || cp === $.GRAVE_ACCENT) {
        this.currentAttr.value += toChar(cp);
        this.state = ATTRIBUTE_VALUE_UNQUOTED_STATE;
    }

    else if (cp === $.EOF)
        this._reconsumeInState(DATA_STATE);

    else {
        this.currentAttr.value += toChar(cp);
        this.state = ATTRIBUTE_VALUE_UNQUOTED_STATE;
    }
};


//12.2.4.38 Attribute value (double-quoted) state
//------------------------------------------------------------------
_[ATTRIBUTE_VALUE_DOUBLE_QUOTED_STATE] = function attributeValueDoubleQuotedState(cp) {
    if (cp === $.QUOTATION_MARK)
        this.state = AFTER_ATTRIBUTE_VALUE_QUOTED_STATE;

    else if (cp === $.AMPERSAND) {
        this.additionalAllowedCp = $.QUOTATION_MARK;
        this.returnState = this.state;
        this.state = CHARACTER_REFERENCE_IN_ATTRIBUTE_VALUE_STATE;
    }

    else if (cp === $.NULL)
        this.currentAttr.value += UNICODE.REPLACEMENT_CHARACTER;

    else if (cp === $.EOF)
        this._reconsumeInState(DATA_STATE);

    else
        this.currentAttr.value += toChar(cp);
};


//12.2.4.39 Attribute value (single-quoted) state
//------------------------------------------------------------------
_[ATTRIBUTE_VALUE_SINGLE_QUOTED_STATE] = function attributeValueSingleQuotedState(cp) {
    if (cp === $.APOSTROPHE)
        this.state = AFTER_ATTRIBUTE_VALUE_QUOTED_STATE;

    else if (cp === $.AMPERSAND) {
        this.additionalAllowedCp = $.APOSTROPHE;
        this.returnState = this.state;
        this.state = CHARACTER_REFERENCE_IN_ATTRIBUTE_VALUE_STATE;
    }

    else if (cp === $.NULL)
        this.currentAttr.value += UNICODE.REPLACEMENT_CHARACTER;

    else if (cp === $.EOF)
        this._reconsumeInState(DATA_STATE);

    else
        this.currentAttr.value += toChar(cp);
};


//12.2.4.40 Attribute value (unquoted) state
//------------------------------------------------------------------
_[ATTRIBUTE_VALUE_UNQUOTED_STATE] = function attributeValueUnquotedState(cp) {
    if (isWhitespace(cp))
        this.state = BEFORE_ATTRIBUTE_NAME_STATE;

    else if (cp === $.AMPERSAND) {
        this.additionalAllowedCp = $.GREATER_THAN_SIGN;
        this.returnState = this.state;
        this.state = CHARACTER_REFERENCE_IN_ATTRIBUTE_VALUE_STATE;
    }

    else if (cp === $.GREATER_THAN_SIGN) {
        this.state = DATA_STATE;
        this._emitCurrentToken();
    }

    else if (cp === $.NULL)
        this.currentAttr.value += UNICODE.REPLACEMENT_CHARACTER;

    else if (cp === $.QUOTATION_MARK || cp === $.APOSTROPHE || cp === $.LESS_THAN_SIGN ||
             cp === $.EQUALS_SIGN || cp === $.GRAVE_ACCENT) {
        this.currentAttr.value += toChar(cp);
    }

    else if (cp === $.EOF)
        this._reconsumeInState(DATA_STATE);

    else
        this.currentAttr.value += toChar(cp);
};


//12.2.4.41 Character reference in attribute value state
//------------------------------------------------------------------
_[CHARACTER_REFERENCE_IN_ATTRIBUTE_VALUE_STATE] = function characterReferenceInAttributeValueState(cp) {
    var referencedCodePoints = this._consumeCharacterReference(cp, true);

    if (referencedCodePoints) {
        for (var i = 0; i < referencedCodePoints.length; i++)
            this.currentAttr.value += toChar(referencedCodePoints[i]);
    } else
        this.currentAttr.value += '&';

    this.state = this.returnState;
};


//12.2.4.42 After attribute value (quoted) state
//------------------------------------------------------------------
_[AFTER_ATTRIBUTE_VALUE_QUOTED_STATE] = function afterAttributeValueQuotedState(cp) {
    if (isWhitespace(cp))
        this.state = BEFORE_ATTRIBUTE_NAME_STATE;

    else if (cp === $.SOLIDUS)
        this.state = SELF_CLOSING_START_TAG_STATE;

    else if (cp === $.GREATER_THAN_SIGN) {
        this.state = DATA_STATE;
        this._emitCurrentToken();
    }

    else if (cp === $.EOF)
        this._reconsumeInState(DATA_STATE);

    else
        this._reconsumeInState(BEFORE_ATTRIBUTE_NAME_STATE);
};


//12.2.4.43 Self-closing start tag state
//------------------------------------------------------------------
_[SELF_CLOSING_START_TAG_STATE] = function selfClosingStartTagState(cp) {
    if (cp === $.GREATER_THAN_SIGN) {
        this.currentToken.selfClosing = true;
        this.state = DATA_STATE;
        this._emitCurrentToken();
    }

    else if (cp === $.EOF)
        this._reconsumeInState(DATA_STATE);

    else
        this._reconsumeInState(BEFORE_ATTRIBUTE_NAME_STATE);
};


//12.2.4.44 Bogus comment state
//------------------------------------------------------------------
_[BOGUS_COMMENT_STATE] = function bogusCommentState(cp) {
    this._createCommentToken();

    while (true) {
        if (cp === $.GREATER_THAN_SIGN) {
            this.state = DATA_STATE;
            break;
        }

        else if (cp === $.EOF) {
            this._reconsumeInState(DATA_STATE);
            break;
        }

        else {
            this.currentToken.data += cp === $.NULL ? UNICODE.REPLACEMENT_CHARACTER : toChar(cp);
            cp = this._consume();
        }
    }

    this._emitCurrentToken();
};


//12.2.4.45 Markup declaration open state
//------------------------------------------------------------------
_[MARKUP_DECLARATION_OPEN_STATE] = function markupDeclarationOpenState(cp) {
    if (this._consumeSubsequentIfMatch($$.DASH_DASH_STRING, cp, true)) {
        this._createCommentToken();
        this.state = COMMENT_START_STATE;
    }

    else if (this._consumeSubsequentIfMatch($$.DOCTYPE_STRING, cp, false))
        this.state = DOCTYPE_STATE;

    else if (this.allowCDATA && this._consumeSubsequentIfMatch($$.CDATA_START_STRING, cp, true))
        this.state = CDATA_SECTION_STATE;

    else {
        //NOTE: call bogus comment state directly with current consumed character to avoid unnecessary reconsumption.
        this[BOGUS_COMMENT_STATE](cp);
    }
};


//12.2.4.46 Comment start state
//------------------------------------------------------------------
_[COMMENT_START_STATE] = function commentStartState(cp) {
    if (cp === $.HYPHEN_MINUS)
        this.state = COMMENT_START_DASH_STATE;

    else if (cp === $.NULL) {
        this.currentToken.data += UNICODE.REPLACEMENT_CHARACTER;
        this.state = COMMENT_STATE;
    }

    else if (cp === $.GREATER_THAN_SIGN) {
        this.state = DATA_STATE;
        this._emitCurrentToken();
    }

    else if (cp === $.EOF) {
        this._emitCurrentToken();
        this._reconsumeInState(DATA_STATE);
    }

    else {
        this.currentToken.data += toChar(cp);
        this.state = COMMENT_STATE;
    }
};


//12.2.4.47 Comment start dash state
//------------------------------------------------------------------
_[COMMENT_START_DASH_STATE] = function commentStartDashState(cp) {
    if (cp === $.HYPHEN_MINUS)
        this.state = COMMENT_END_STATE;

    else if (cp === $.NULL) {
        this.currentToken.data += '-';
        this.currentToken.data += UNICODE.REPLACEMENT_CHARACTER;
        this.state = COMMENT_STATE;
    }

    else if (cp === $.GREATER_THAN_SIGN) {
        this.state = DATA_STATE;
        this._emitCurrentToken();
    }

    else if (cp === $.EOF) {
        this._emitCurrentToken();
        this._reconsumeInState(DATA_STATE);
    }

    else {
        this.currentToken.data += '-';
        this.currentToken.data += toChar(cp);
        this.state = COMMENT_STATE;
    }
};


//12.2.4.48 Comment state
//------------------------------------------------------------------
_[COMMENT_STATE] = function commentState(cp) {
    if (cp === $.HYPHEN_MINUS)
        this.state = COMMENT_END_DASH_STATE;

    else if (cp === $.NULL)
        this.currentToken.data += UNICODE.REPLACEMENT_CHARACTER;

    else if (cp === $.EOF) {
        this._emitCurrentToken();
        this._reconsumeInState(DATA_STATE);
    }

    else
        this.currentToken.data += toChar(cp);
};


//12.2.4.49 Comment end dash state
//------------------------------------------------------------------
_[COMMENT_END_DASH_STATE] = function commentEndDashState(cp) {
    if (cp === $.HYPHEN_MINUS)
        this.state = COMMENT_END_STATE;

    else if (cp === $.NULL) {
        this.currentToken.data += '-';
        this.currentToken.data += UNICODE.REPLACEMENT_CHARACTER;
        this.state = COMMENT_STATE;
    }

    else if (cp === $.EOF) {
        this._emitCurrentToken();
        this._reconsumeInState(DATA_STATE);
    }

    else {
        this.currentToken.data += '-';
        this.currentToken.data += toChar(cp);
        this.state = COMMENT_STATE;
    }
};


//12.2.4.50 Comment end state
//------------------------------------------------------------------
_[COMMENT_END_STATE] = function commentEndState(cp) {
    if (cp === $.GREATER_THAN_SIGN) {
        this.state = DATA_STATE;
        this._emitCurrentToken();
    }

    else if (cp === $.EXCLAMATION_MARK)
        this.state = COMMENT_END_BANG_STATE;

    else if (cp === $.HYPHEN_MINUS)
        this.currentToken.data += '-';

    else if (cp === $.NULL) {
        this.currentToken.data += '--';
        this.currentToken.data += UNICODE.REPLACEMENT_CHARACTER;
        this.state = COMMENT_STATE;
    }

    else if (cp === $.EOF) {
        this._reconsumeInState(DATA_STATE);
        this._emitCurrentToken();
    }

    else {
        this.currentToken.data += '--';
        this.currentToken.data += toChar(cp);
        this.state = COMMENT_STATE;
    }
};


//12.2.4.51 Comment end bang state
//------------------------------------------------------------------
_[COMMENT_END_BANG_STATE] = function commentEndBangState(cp) {
    if (cp === $.HYPHEN_MINUS) {
        this.currentToken.data += '--!';
        this.state = COMMENT_END_DASH_STATE;
    }

    else if (cp === $.GREATER_THAN_SIGN) {
        this.state = DATA_STATE;
        this._emitCurrentToken();
    }

    else if (cp === $.NULL) {
        this.currentToken.data += '--!';
        this.currentToken.data += UNICODE.REPLACEMENT_CHARACTER;
        this.state = COMMENT_STATE;
    }

    else if (cp === $.EOF) {
        this._emitCurrentToken();
        this._reconsumeInState(DATA_STATE);
    }

    else {
        this.currentToken.data += '--!';
        this.currentToken.data += toChar(cp);
        this.state = COMMENT_STATE;
    }
};


//12.2.4.52 DOCTYPE state
//------------------------------------------------------------------
_[DOCTYPE_STATE] = function doctypeState(cp) {
    if (isWhitespace(cp))
        this.state = BEFORE_DOCTYPE_NAME_STATE;

    else if (cp === $.EOF) {
        this._createDoctypeToken();
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this._reconsumeInState(DATA_STATE);
    }

    else
        this._reconsumeInState(BEFORE_DOCTYPE_NAME_STATE);
};


//12.2.4.53 Before DOCTYPE name state
//------------------------------------------------------------------
_[BEFORE_DOCTYPE_NAME_STATE] = function beforeDoctypeNameState(cp) {
    if (isWhitespace(cp))
        return;

    if (isAsciiUpper(cp)) {
        this._createDoctypeToken(toAsciiLowerChar(cp));
        this.state = DOCTYPE_NAME_STATE;
    }

    else if (cp === $.GREATER_THAN_SIGN) {
        this._createDoctypeToken();
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this.state = DATA_STATE;
    }

    else if (cp === $.EOF) {
        this._createDoctypeToken();
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this._reconsumeInState(DATA_STATE);
    }

    else if (cp === $.NULL) {
        this._createDoctypeToken(UNICODE.REPLACEMENT_CHARACTER);
        this.state = DOCTYPE_NAME_STATE;
    }

    else {
        this._createDoctypeToken(toChar(cp));
        this.state = DOCTYPE_NAME_STATE;
    }
};


//12.2.4.54 DOCTYPE name state
//------------------------------------------------------------------
_[DOCTYPE_NAME_STATE] = function doctypeNameState(cp) {
    if (isWhitespace(cp))
        this.state = AFTER_DOCTYPE_NAME_STATE;

    else if (cp === $.GREATER_THAN_SIGN) {
        this._emitCurrentToken();
        this.state = DATA_STATE;
    }

    else if (isAsciiUpper(cp))
        this.currentToken.name += toAsciiLowerChar(cp);

    else if (cp === $.NULL)
        this.currentToken.name += UNICODE.REPLACEMENT_CHARACTER;

    else if (cp === $.EOF) {
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this._reconsumeInState(DATA_STATE);
    }

    else
        this.currentToken.name += toChar(cp);
};


//12.2.4.55 After DOCTYPE name state
//------------------------------------------------------------------
_[AFTER_DOCTYPE_NAME_STATE] = function afterDoctypeNameState(cp) {
    if (isWhitespace(cp))
        return;

    if (cp === $.GREATER_THAN_SIGN) {
        this.state = DATA_STATE;
        this._emitCurrentToken();
    }

    else if (cp === $.EOF) {
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this._reconsumeInState(DATA_STATE);
    }

    else if (this._consumeSubsequentIfMatch($$.PUBLIC_STRING, cp, false))
        this.state = AFTER_DOCTYPE_PUBLIC_KEYWORD_STATE;

    else if (this._consumeSubsequentIfMatch($$.SYSTEM_STRING, cp, false))
        this.state = AFTER_DOCTYPE_SYSTEM_KEYWORD_STATE;

    else {
        this.currentToken.forceQuirks = true;
        this.state = BOGUS_DOCTYPE_STATE;
    }
};


//12.2.4.56 After DOCTYPE public keyword state
//------------------------------------------------------------------
_[AFTER_DOCTYPE_PUBLIC_KEYWORD_STATE] = function afterDoctypePublicKeywordState(cp) {
    if (isWhitespace(cp))
        this.state = BEFORE_DOCTYPE_PUBLIC_IDENTIFIER_STATE;

    else if (cp === $.QUOTATION_MARK) {
        this.currentToken.publicId = '';
        this.state = DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED_STATE;
    }

    else if (cp === $.APOSTROPHE) {
        this.currentToken.publicId = '';
        this.state = DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED_STATE;
    }

    else if (cp === $.GREATER_THAN_SIGN) {
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this.state = DATA_STATE;
    }

    else if (cp === $.EOF) {
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this._reconsumeInState(DATA_STATE);
    }

    else {
        this.currentToken.forceQuirks = true;
        this.state = BOGUS_DOCTYPE_STATE;
    }
};


//12.2.4.57 Before DOCTYPE public identifier state
//------------------------------------------------------------------
_[BEFORE_DOCTYPE_PUBLIC_IDENTIFIER_STATE] = function beforeDoctypePublicIdentifierState(cp) {
    if (isWhitespace(cp))
        return;

    if (cp === $.QUOTATION_MARK) {
        this.currentToken.publicId = '';
        this.state = DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED_STATE;
    }

    else if (cp === $.APOSTROPHE) {
        this.currentToken.publicId = '';
        this.state = DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED_STATE;
    }

    else if (cp === $.GREATER_THAN_SIGN) {
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this.state = DATA_STATE;
    }

    else if (cp === $.EOF) {
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this._reconsumeInState(DATA_STATE);
    }

    else {
        this.currentToken.forceQuirks = true;
        this.state = BOGUS_DOCTYPE_STATE;
    }
};


//12.2.4.58 DOCTYPE public identifier (double-quoted) state
//------------------------------------------------------------------
_[DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED_STATE] = function doctypePublicIdentifierDoubleQuotedState(cp) {
    if (cp === $.QUOTATION_MARK)
        this.state = AFTER_DOCTYPE_PUBLIC_IDENTIFIER_STATE;

    else if (cp === $.NULL)
        this.currentToken.publicId += UNICODE.REPLACEMENT_CHARACTER;

    else if (cp === $.GREATER_THAN_SIGN) {
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this.state = DATA_STATE;
    }

    else if (cp === $.EOF) {
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this._reconsumeInState(DATA_STATE);
    }

    else
        this.currentToken.publicId += toChar(cp);
};


//12.2.4.59 DOCTYPE public identifier (single-quoted) state
//------------------------------------------------------------------
_[DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED_STATE] = function doctypePublicIdentifierSingleQuotedState(cp) {
    if (cp === $.APOSTROPHE)
        this.state = AFTER_DOCTYPE_PUBLIC_IDENTIFIER_STATE;

    else if (cp === $.NULL)
        this.currentToken.publicId += UNICODE.REPLACEMENT_CHARACTER;

    else if (cp === $.GREATER_THAN_SIGN) {
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this.state = DATA_STATE;
    }

    else if (cp === $.EOF) {
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this._reconsumeInState(DATA_STATE);
    }

    else
        this.currentToken.publicId += toChar(cp);
};


//12.2.4.60 After DOCTYPE public identifier state
//------------------------------------------------------------------
_[AFTER_DOCTYPE_PUBLIC_IDENTIFIER_STATE] = function afterDoctypePublicIdentifierState(cp) {
    if (isWhitespace(cp))
        this.state = BETWEEN_DOCTYPE_PUBLIC_AND_SYSTEM_IDENTIFIERS_STATE;

    else if (cp === $.GREATER_THAN_SIGN) {
        this._emitCurrentToken();
        this.state = DATA_STATE;
    }

    else if (cp === $.QUOTATION_MARK) {
        this.currentToken.systemId = '';
        this.state = DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED_STATE;
    }

    else if (cp === $.APOSTROPHE) {
        this.currentToken.systemId = '';
        this.state = DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED_STATE;
    }

    else if (cp === $.EOF) {
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this._reconsumeInState(DATA_STATE);
    }

    else {
        this.currentToken.forceQuirks = true;
        this.state = BOGUS_DOCTYPE_STATE;
    }
};


//12.2.4.61 Between DOCTYPE public and system identifiers state
//------------------------------------------------------------------
_[BETWEEN_DOCTYPE_PUBLIC_AND_SYSTEM_IDENTIFIERS_STATE] = function betweenDoctypePublicAndSystemIdentifiersState(cp) {
    if (isWhitespace(cp))
        return;

    if (cp === $.GREATER_THAN_SIGN) {
        this._emitCurrentToken();
        this.state = DATA_STATE;
    }

    else if (cp === $.QUOTATION_MARK) {
        this.currentToken.systemId = '';
        this.state = DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED_STATE;
    }


    else if (cp === $.APOSTROPHE) {
        this.currentToken.systemId = '';
        this.state = DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED_STATE;
    }

    else if (cp === $.EOF) {
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this._reconsumeInState(DATA_STATE);
    }

    else {
        this.currentToken.forceQuirks = true;
        this.state = BOGUS_DOCTYPE_STATE;
    }
};


//12.2.4.62 After DOCTYPE system keyword state
//------------------------------------------------------------------
_[AFTER_DOCTYPE_SYSTEM_KEYWORD_STATE] = function afterDoctypeSystemKeywordState(cp) {
    if (isWhitespace(cp))
        this.state = BEFORE_DOCTYPE_SYSTEM_IDENTIFIER_STATE;

    else if (cp === $.QUOTATION_MARK) {
        this.currentToken.systemId = '';
        this.state = DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED_STATE;
    }

    else if (cp === $.APOSTROPHE) {
        this.currentToken.systemId = '';
        this.state = DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED_STATE;
    }

    else if (cp === $.GREATER_THAN_SIGN) {
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this.state = DATA_STATE;
    }

    else if (cp === $.EOF) {
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this._reconsumeInState(DATA_STATE);
    }

    else {
        this.currentToken.forceQuirks = true;
        this.state = BOGUS_DOCTYPE_STATE;
    }
};


//12.2.4.63 Before DOCTYPE system identifier state
//------------------------------------------------------------------
_[BEFORE_DOCTYPE_SYSTEM_IDENTIFIER_STATE] = function beforeDoctypeSystemIdentifierState(cp) {
    if (isWhitespace(cp))
        return;

    if (cp === $.QUOTATION_MARK) {
        this.currentToken.systemId = '';
        this.state = DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED_STATE;
    }

    else if (cp === $.APOSTROPHE) {
        this.currentToken.systemId = '';
        this.state = DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED_STATE;
    }

    else if (cp === $.GREATER_THAN_SIGN) {
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this.state = DATA_STATE;
    }

    else if (cp === $.EOF) {
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this._reconsumeInState(DATA_STATE);
    }

    else {
        this.currentToken.forceQuirks = true;
        this.state = BOGUS_DOCTYPE_STATE;
    }
};


//12.2.4.64 DOCTYPE system identifier (double-quoted) state
//------------------------------------------------------------------
_[DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED_STATE] = function doctypeSystemIdentifierDoubleQuotedState(cp) {
    if (cp === $.QUOTATION_MARK)
        this.state = AFTER_DOCTYPE_SYSTEM_IDENTIFIER_STATE;

    else if (cp === $.GREATER_THAN_SIGN) {
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this.state = DATA_STATE;
    }

    else if (cp === $.NULL)
        this.currentToken.systemId += UNICODE.REPLACEMENT_CHARACTER;

    else if (cp === $.EOF) {
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this._reconsumeInState(DATA_STATE);
    }

    else
        this.currentToken.systemId += toChar(cp);
};


//12.2.4.65 DOCTYPE system identifier (single-quoted) state
//------------------------------------------------------------------
_[DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED_STATE] = function doctypeSystemIdentifierSingleQuotedState(cp) {
    if (cp === $.APOSTROPHE)
        this.state = AFTER_DOCTYPE_SYSTEM_IDENTIFIER_STATE;

    else if (cp === $.GREATER_THAN_SIGN) {
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this.state = DATA_STATE;
    }

    else if (cp === $.NULL)
        this.currentToken.systemId += UNICODE.REPLACEMENT_CHARACTER;

    else if (cp === $.EOF) {
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this._reconsumeInState(DATA_STATE);
    }

    else
        this.currentToken.systemId += toChar(cp);
};


//12.2.4.66 After DOCTYPE system identifier state
//------------------------------------------------------------------
_[AFTER_DOCTYPE_SYSTEM_IDENTIFIER_STATE] = function afterDoctypeSystemIdentifierState(cp) {
    if (isWhitespace(cp))
        return;

    if (cp === $.GREATER_THAN_SIGN) {
        this._emitCurrentToken();
        this.state = DATA_STATE;
    }

    else if (cp === $.EOF) {
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this._reconsumeInState(DATA_STATE);
    }

    else
        this.state = BOGUS_DOCTYPE_STATE;
};


//12.2.4.67 Bogus DOCTYPE state
//------------------------------------------------------------------
_[BOGUS_DOCTYPE_STATE] = function bogusDoctypeState(cp) {
    if (cp === $.GREATER_THAN_SIGN) {
        this._emitCurrentToken();
        this.state = DATA_STATE;
    }

    else if (cp === $.EOF) {
        this._emitCurrentToken();
        this._reconsumeInState(DATA_STATE);
    }
};


//12.2.4.68 CDATA section state
//------------------------------------------------------------------
_[CDATA_SECTION_STATE] = function cdataSectionState(cp) {
    while (true) {
        if (cp === $.EOF) {
            this._reconsumeInState(DATA_STATE);
            break;
        }

        else if (this._consumeSubsequentIfMatch($$.CDATA_END_STRING, cp, true)) {
            this.state = DATA_STATE;
            break;
        }

        else {
            this._emitCodePoint(cp);
            cp = this._consume();
        }
    }
};

},{"../common/unicode":22,"./location_info_mixin":29,"./named_entity_trie":30,"./preprocessor":31}],33:[function(require,module,exports){
'use strict';

//Node construction
exports.createDocument = function () {
    return {
        nodeName: '#document',
        quirksMode: false,
        childNodes: []
    };
};

exports.createDocumentFragment = function () {
    return {
        nodeName: '#document-fragment',
        quirksMode: false,
        childNodes: []
    };
};

exports.createElement = function (tagName, namespaceURI, attrs) {
    return {
        nodeName: tagName,
        tagName: tagName,
        attrs: attrs,
        namespaceURI: namespaceURI,
        childNodes: [],
        parentNode: null
    };
};

exports.createCommentNode = function (data) {
    return {
        nodeName: '#comment',
        data: data,
        parentNode: null
    };
};

var createTextNode = function (value) {
    return {
        nodeName: '#text',
        value: value,
        parentNode: null
    }
};


//Tree mutation
exports.setDocumentType = function (document, name, publicId, systemId) {
    var doctypeNode = null;

    for (var i = 0; i < document.childNodes.length; i++) {
        if (document.childNodes[i].nodeName === '#documentType') {
            doctypeNode = document.childNodes[i];
            break;
        }
    }

    if (doctypeNode) {
        doctypeNode.name = name;
        doctypeNode.publicId = publicId;
        doctypeNode.systemId = systemId;
    }

    else {
        appendChild(document, {
            nodeName: '#documentType',
            name: name,
            publicId: publicId,
            systemId: systemId
        });
    }
};

exports.setQuirksMode = function (document) {
    document.quirksMode = true;
};

exports.isQuirksMode = function (document) {
    return document.quirksMode;
};

var appendChild = exports.appendChild = function (parentNode, newNode) {
    parentNode.childNodes.push(newNode);
    newNode.parentNode = parentNode;
};

var insertBefore = exports.insertBefore = function (parentNode, newNode, referenceNode) {
    var insertionIdx = parentNode.childNodes.indexOf(referenceNode);

    parentNode.childNodes.splice(insertionIdx, 0, newNode);
    newNode.parentNode = parentNode;
};

exports.detachNode = function (node) {
    if (node.parentNode) {
        var idx = node.parentNode.childNodes.indexOf(node);

        node.parentNode.childNodes.splice(idx, 1);
        node.parentNode = null;
    }
};

exports.insertText = function (parentNode, text) {
    if (parentNode.childNodes.length) {
        var prevNode = parentNode.childNodes[parentNode.childNodes.length - 1];

        if (prevNode.nodeName === '#text') {
            prevNode.value += text;
            return;
        }
    }

    appendChild(parentNode, createTextNode(text));
};

exports.insertTextBefore = function (parentNode, text, referenceNode) {
    var prevNode = parentNode.childNodes[parentNode.childNodes.indexOf(referenceNode) - 1];

    if (prevNode && prevNode.nodeName === '#text')
        prevNode.value += text;
    else
        insertBefore(parentNode, createTextNode(text), referenceNode);
};

exports.adoptAttributes = function (recipientNode, attrs) {
    var recipientAttrsMap = [];

    for (var i = 0; i < recipientNode.attrs.length; i++)
        recipientAttrsMap.push(recipientNode.attrs[i].name);

    for (var j = 0; j < attrs.length; j++) {
        if (recipientAttrsMap.indexOf(attrs[j].name) === -1)
            recipientNode.attrs.push(attrs[j]);
    }
};


//Tree traversing
exports.getFirstChild = function (node) {
    return node.childNodes[0];
};

exports.getChildNodes = function (node) {
    return node.childNodes;
};

exports.getParentNode = function (node) {
    return node.parentNode;
};

exports.getAttrList = function (node) {
    return node.attrs;
};

//Node data
exports.getTagName = function (element) {
    return element.tagName;
};

exports.getNamespaceURI = function (element) {
    return element.namespaceURI;
};

exports.getTextNodeContent = function (textNode) {
    return textNode.value;
};

exports.getCommentNodeContent = function (commentNode) {
    return commentNode.data;
};

exports.getDocumentTypeNodeName = function (doctypeNode) {
    return doctypeNode.name;
};

exports.getDocumentTypeNodePublicId = function (doctypeNode) {
    return doctypeNode.publicId;
};

exports.getDocumentTypeNodeSystemId = function (doctypeNode) {
    return doctypeNode.systemId;
};

//Node types
exports.isTextNode = function (node) {
    return node.nodeName === '#text';
};

exports.isCommentNode = function (node) {
    return node.nodeName === '#comment';
};

exports.isDocumentTypeNode = function (node) {
    return node.nodeName === '#documentType';
};

exports.isElementNode = function (node) {
    return !!node.tagName;
};

},{}],34:[function(require,module,exports){
'use strict';

var Doctype = require('../common/doctype');

//Conversion tables for DOM Level1 structure emulation
var nodeTypes = {
    element: 1,
    text: 3,
    cdata: 4,
    comment: 8
};

var nodePropertyShorthands = {
    tagName: 'name',
    childNodes: 'children',
    parentNode: 'parent',
    previousSibling: 'prev',
    nextSibling: 'next',
    nodeValue: 'data'
};

//Node
var Node = function (props) {
    for (var key in props) {
        if (props.hasOwnProperty(key))
            this[key] = props[key];
    }
};

Node.prototype = {
    get firstChild() {
        var children = this.children;
        return children && children[0] || null;
    },

    get lastChild() {
        var children = this.children;
        return children && children[children.length - 1] || null;
    },

    get nodeType() {
        return nodeTypes[this.type] || nodeTypes.element;
    }
};

Object.keys(nodePropertyShorthands).forEach(function (key) {
    var shorthand = nodePropertyShorthands[key];

    Object.defineProperty(Node.prototype, key, {
        get: function () {
            return this[shorthand] || null;
        },
        set: function (val) {
            this[shorthand] = val;
            return val;
        }
    });
});


//Node construction
exports.createDocument =
exports.createDocumentFragment = function () {
    return new Node({
        type: 'root',
        name: 'root',
        parent: null,
        prev: null,
        next: null,
        children: []
    });
};

exports.createElement = function (tagName, namespaceURI, attrs) {
    var attribs = {},
        attribsNamespace = {},
        attribsPrefix = {};

    for (var i = 0; i < attrs.length; i++) {
        var attrName = attrs[i].name;

        attribs[attrName] = attrs[i].value;
        attribsNamespace[attrName] = attrs[i].namespace;
        attribsPrefix[attrName] = attrs[i].prefix;
    }

    return new Node({
        type: tagName === 'script' || tagName === 'style' ? tagName : 'tag',
        name: tagName,
        namespace: namespaceURI,
        attribs: attribs,
        'x-attribsNamespace': attribsNamespace,
        'x-attribsPrefix': attribsPrefix,
        children: [],
        parent: null,
        prev: null,
        next: null
    });
};

exports.createCommentNode = function (data) {
    return new Node({
        type: 'comment',
        data: data,
        parent: null,
        prev: null,
        next: null
    });
};

var createTextNode = function (value) {
    return new Node({
        type: 'text',
        data: value,
        parent: null,
        prev: null,
        next: null
    });
};


//Tree mutation
exports.setDocumentType = function (document, name, publicId, systemId) {
    var data = Doctype.serializeContent(name, publicId, systemId),
        doctypeNode = null;

    for (var i = 0; i < document.children.length; i++) {
        if (document.children[i].type === 'directive' && document.children[i].name === '!doctype') {
            doctypeNode = document.children[i];
            break;
        }
    }

    if (doctypeNode) {
        doctypeNode.data = data;
        doctypeNode['x-name'] = name;
        doctypeNode['x-publicId'] = publicId;
        doctypeNode['x-systemId'] = systemId;
    }

    else {
        appendChild(document, new Node({
            type: 'directive',
            name: '!doctype',
            data: data,
            'x-name': name,
            'x-publicId': publicId,
            'x-systemId': systemId
        }));
    }

};

exports.setQuirksMode = function (document) {
    document.quirksMode = true;
};

exports.isQuirksMode = function (document) {
    return document.quirksMode;
};

var appendChild = exports.appendChild = function (parentNode, newNode) {
    var prev = parentNode.children[parentNode.children.length - 1];

    if (prev) {
        prev.next = newNode;
        newNode.prev = prev;
    }

    parentNode.children.push(newNode);
    newNode.parent = parentNode;
};

var insertBefore = exports.insertBefore = function (parentNode, newNode, referenceNode) {
    var insertionIdx = parentNode.children.indexOf(referenceNode),
        prev = referenceNode.prev;

    if (prev) {
        prev.next = newNode;
        newNode.prev = prev;
    }

    referenceNode.prev = newNode;
    newNode.next = referenceNode;

    parentNode.children.splice(insertionIdx, 0, newNode);
    newNode.parent = parentNode;
};

exports.detachNode = function (node) {
    if (node.parent) {
        var idx = node.parent.children.indexOf(node),
            prev = node.prev,
            next = node.next;

        node.prev = null;
        node.next = null;

        if (prev)
            prev.next = next;

        if (next)
            next.prev = prev;

        node.parent.children.splice(idx, 1);
        node.parent = null;
    }
};

exports.insertText = function (parentNode, text) {
    var lastChild = parentNode.children[parentNode.children.length - 1];

    if (lastChild && lastChild.type === 'text')
        lastChild.data += text;
    else
        appendChild(parentNode, createTextNode(text));
};

exports.insertTextBefore = function (parentNode, text, referenceNode) {
    var prevNode = parentNode.children[parentNode.children.indexOf(referenceNode) - 1];

    if (prevNode && prevNode.type === 'text')
        prevNode.data += text;
    else
        insertBefore(parentNode, createTextNode(text), referenceNode);
};

exports.adoptAttributes = function (recipientNode, attrs) {
    for (var i = 0; i < attrs.length; i++) {
        var attrName = attrs[i].name;

        if (typeof recipientNode.attribs[attrName] === 'undefined') {
            recipientNode.attribs[attrName] = attrs[i].value;
            recipientNode['x-attribsNamespace'][attrName] = attrs[i].namespace;
            recipientNode['x-attribsPrefix'][attrName] = attrs[i].prefix;
        }
    }
};


//Tree traversing
exports.getFirstChild = function (node) {
    return node.children[0];
};

exports.getChildNodes = function (node) {
    return node.children;
};

exports.getParentNode = function (node) {
    return node.parent;
};

exports.getAttrList = function (node) {
    var attrList = [];

    for (var name in node.attribs) {
        if (node.attribs.hasOwnProperty(name)) {
            attrList.push({
                name: name,
                value: node.attribs[name],
                namespace: node['x-attribsNamespace'][name],
                prefix: node['x-attribsPrefix'][name]
            });
        }
    }

    return attrList;
};


//Node data
exports.getTagName = function (element) {
    return element.name;
};

exports.getNamespaceURI = function (element) {
    return element.namespace;
};

exports.getTextNodeContent = function (textNode) {
    return textNode.data;
};

exports.getCommentNodeContent = function (commentNode) {
    return commentNode.data;
};

exports.getDocumentTypeNodeName = function (doctypeNode) {
    return doctypeNode['x-name'];
};

exports.getDocumentTypeNodePublicId = function (doctypeNode) {
    return doctypeNode['x-publicId'];
};

exports.getDocumentTypeNodeSystemId = function (doctypeNode) {
    return doctypeNode['x-systemId'];
};


//Node types
exports.isTextNode = function (node) {
    return node.type === 'text';
};

exports.isCommentNode = function (node) {
    return node.type === 'comment';
};

exports.isDocumentTypeNode = function (node) {
    return node.type === 'directive' && node.name === '!doctype';
};

exports.isElementNode = function (node) {
    return !!node.attribs;
};

},{"../common/doctype":19}],35:[function(require,module,exports){
'use strict';

//Const
var NOAH_ARK_CAPACITY = 3;

//List of formatting elements
var FormattingElementList = module.exports = function (treeAdapter) {
    this.length = 0;
    this.entries = [];
    this.treeAdapter = treeAdapter;
    this.bookmark = null;
};

//Entry types
FormattingElementList.MARKER_ENTRY = 'MARKER_ENTRY';
FormattingElementList.ELEMENT_ENTRY = 'ELEMENT_ENTRY';

//Noah Ark's condition
//OPTIMIZATION: at first we try to find possible candidates for exclusion using
//lightweight heuristics without thorough attributes check.
FormattingElementList.prototype._getNoahArkConditionCandidates = function (newElement) {
    var candidates = [];

    if (this.length >= NOAH_ARK_CAPACITY) {
        var neAttrsLength = this.treeAdapter.getAttrList(newElement).length,
            neTagName = this.treeAdapter.getTagName(newElement),
            neNamespaceURI = this.treeAdapter.getNamespaceURI(newElement);

        for (var i = this.length - 1; i >= 0; i--) {
            var entry = this.entries[i];

            if (entry.type === FormattingElementList.MARKER_ENTRY)
                break;

            var element = entry.element,
                elementAttrs = this.treeAdapter.getAttrList(element);

            if (this.treeAdapter.getTagName(element) === neTagName &&
                this.treeAdapter.getNamespaceURI(element) === neNamespaceURI &&
                elementAttrs.length === neAttrsLength) {
                candidates.push({idx: i, attrs: elementAttrs});
            }
        }
    }

    return candidates.length < NOAH_ARK_CAPACITY ? [] : candidates;
};

FormattingElementList.prototype._ensureNoahArkCondition = function (newElement) {
    var candidates = this._getNoahArkConditionCandidates(newElement),
        cLength = candidates.length;

    if (cLength) {
        var neAttrs = this.treeAdapter.getAttrList(newElement),
            neAttrsLength = neAttrs.length,
            neAttrsMap = {};

        //NOTE: build attrs map for the new element so we can perform fast lookups
        for (var i = 0; i < neAttrsLength; i++) {
            var neAttr = neAttrs[i];

            neAttrsMap[neAttr.name] = neAttr.value;
        }

        for (var i = 0; i < neAttrsLength; i++) {
            for (var j = 0; j < cLength; j++) {
                var cAttr = candidates[j].attrs[i];

                if (neAttrsMap[cAttr.name] !== cAttr.value) {
                    candidates.splice(j, 1);
                    cLength--;
                }

                if (candidates.length < NOAH_ARK_CAPACITY)
                    return;
            }
        }

        //NOTE: remove bottommost candidates until Noah's Ark condition will not be met
        for (var i = cLength - 1; i >= NOAH_ARK_CAPACITY - 1; i--) {
            this.entries.splice(candidates[i].idx, 1);
            this.length--;
        }
    }
};

//Mutations
FormattingElementList.prototype.insertMarker = function () {
    this.entries.push({type: FormattingElementList.MARKER_ENTRY});
    this.length++;
};

FormattingElementList.prototype.pushElement = function (element, token) {
    this._ensureNoahArkCondition(element);

    this.entries.push({
        type: FormattingElementList.ELEMENT_ENTRY,
        element: element,
        token: token
    });

    this.length++;
};

FormattingElementList.prototype.insertElementAfterBookmark = function (element, token) {
    var bookmarkIdx = this.length - 1;

    for (; bookmarkIdx >= 0; bookmarkIdx--) {
        if (this.entries[bookmarkIdx] === this.bookmark)
            break;
    }

    this.entries.splice(bookmarkIdx + 1, 0, {
        type: FormattingElementList.ELEMENT_ENTRY,
        element: element,
        token: token
    });

    this.length++;
};

FormattingElementList.prototype.removeEntry = function (entry) {
    for (var i = this.length - 1; i >= 0; i--) {
        if (this.entries[i] === entry) {
            this.entries.splice(i, 1);
            this.length--;
            break;
        }
    }
};

FormattingElementList.prototype.clearToLastMarker = function () {
    while (this.length) {
        var entry = this.entries.pop();

        this.length--;

        if (entry.type === FormattingElementList.MARKER_ENTRY)
            break;
    }
};

//Search
FormattingElementList.prototype.getElementEntryInScopeWithTagName = function (tagName) {
    for (var i = this.length - 1; i >= 0; i--) {
        var entry = this.entries[i];

        if (entry.type === FormattingElementList.MARKER_ENTRY)
            return null;

        if (this.treeAdapter.getTagName(entry.element) === tagName)
            return entry;
    }

    return null;
};

FormattingElementList.prototype.getElementEntry = function (element) {
    for (var i = this.length - 1; i >= 0; i--) {
        var entry = this.entries[i];

        if (entry.type === FormattingElementList.ELEMENT_ENTRY && entry.element == element)
            return entry;
    }

    return null;
};

},{}],36:[function(require,module,exports){
'use strict';

var OpenElementStack = require('./open_element_stack'),
    Tokenizer = require('../tokenization/tokenizer'),
    HTML = require('../common/html');


//Aliases
var $ = HTML.TAG_NAMES;


function setEndLocation(element, closingToken, treeAdapter) {
    var loc = element.__location;

    if (!loc)
        return;

    if (!loc.startTag) {
        loc.startTag = {
            start: loc.start,
            end: loc.end
        };
    }

    if (closingToken.location) {
        var tn = treeAdapter.getTagName(element),
            // NOTE: For cases like <p> <p> </p> - First 'p' closes without a closing tag and
            // for cases like <td> <p> </td> - 'p' closes without a closing tag
            isClosingEndTag = closingToken.type === Tokenizer.END_TAG_TOKEN &&
                              tn === closingToken.tagName;

        if (isClosingEndTag) {
            loc.endTag = {
                start: closingToken.location.start,
                end: closingToken.location.end
            };
        }

        loc.end = closingToken.location.end;
    }
}

//NOTE: patch open elements stack, so we can assign end location for the elements
function patchOpenElementsStack(stack, parser) {
    var treeAdapter = parser.treeAdapter;

    stack.pop = function () {
        setEndLocation(this.current, parser.currentToken, treeAdapter);
        OpenElementStack.prototype.pop.call(this);
    };

    stack.popAllUpToHtmlElement = function () {
        for (var i = this.stackTop; i > 0; i--)
            setEndLocation(this.items[i], parser.currentToken, treeAdapter);

        OpenElementStack.prototype.popAllUpToHtmlElement.call(this);
    };

    stack.remove = function (element) {
        setEndLocation(element, parser.currentToken, treeAdapter);
        OpenElementStack.prototype.remove.call(this, element);
    };
}

exports.assign = function (parser) {
    //NOTE: obtain Parser proto this way to avoid module circular references
    var parserProto = Object.getPrototypeOf(parser),
        treeAdapter = parser.treeAdapter;


    //NOTE: patch _reset method
    parser._reset = function (html, document, fragmentContext) {
        parserProto._reset.call(this, html, document, fragmentContext);

        this.attachableElementLocation = null;
        this.lastFosterParentingLocation = null;
        this.currentToken = null;

        patchOpenElementsStack(this.openElements, parser);
    };

    parser._processTokenInForeignContent = function (token) {
        this.currentToken = token;
        parserProto._processTokenInForeignContent.call(this, token);
    };

    parser._processToken = function (token) {
        this.currentToken = token;
        parserProto._processToken.call(this, token);

        //NOTE: <body> and <html> are never popped from the stack, so we need to updated
        //their end location explicitly.
        if (token.type === Tokenizer.END_TAG_TOKEN &&
            (token.tagName === $.HTML ||
            (token.tagName === $.BODY && this.openElements.hasInScope($.BODY)))) {
            for (var i = this.openElements.stackTop; i >= 0; i--) {
                var element = this.openElements.items[i];

                if (this.treeAdapter.getTagName(element) === token.tagName) {
                    setEndLocation(element, token, treeAdapter);
                    break;
                }
            }
        }
    };

    //Doctype
    parser._setDocumentType = function (token) {
        parserProto._setDocumentType.call(this, token);

        var documentChildren = this.treeAdapter.getChildNodes(this.document),
            cnLength = documentChildren.length;

        for (var i = 0; i < cnLength; i++) {
            var node = documentChildren[i];

            if (this.treeAdapter.isDocumentTypeNode(node)) {
                node.__location = token.location;
                break;
            }
        }
    };

    //Elements
    parser._attachElementToTree = function (element) {
        //NOTE: _attachElementToTree is called from _appendElement, _insertElement and _insertTemplate methods.
        //So we will use token location stored in this methods for the element.
        element.__location = this.attachableElementLocation || null;
        this.attachableElementLocation = null;
        parserProto._attachElementToTree.call(this, element);
    };

    parser._appendElement = function (token, namespaceURI) {
        this.attachableElementLocation = token.location;
        parserProto._appendElement.call(this, token, namespaceURI);
    };

    parser._insertElement = function (token, namespaceURI) {
        this.attachableElementLocation = token.location;
        parserProto._insertElement.call(this, token, namespaceURI);
    };

    parser._insertTemplate = function (token) {
        this.attachableElementLocation = token.location;
        parserProto._insertTemplate.call(this, token);

        var tmplContent = this.treeAdapter.getChildNodes(this.openElements.current)[0];

        tmplContent.__location = null;
    };

    parser._insertFakeRootElement = function () {
        parserProto._insertFakeRootElement.call(this);
        this.openElements.current.__location = null;
    };

    //Comments
    parser._appendCommentNode = function (token, parent) {
        parserProto._appendCommentNode.call(this, token, parent);

        var children = this.treeAdapter.getChildNodes(parent),
            commentNode = children[children.length - 1];

        commentNode.__location = token.location;
    };

    //Text
    parser._findFosterParentingLocation = function () {
        //NOTE: store last foster parenting location, so we will be able to find inserted text
        //in case of foster parenting
        this.lastFosterParentingLocation = parserProto._findFosterParentingLocation.call(this);
        return this.lastFosterParentingLocation;
    };

    parser._insertCharacters = function (token) {
        parserProto._insertCharacters.call(this, token);

        var hasFosterParent = this._shouldFosterParentOnInsertion(),
            parentingLocation = this.lastFosterParentingLocation,
            parent = (hasFosterParent && parentingLocation.parent) ||
                     this.openElements.currentTmplContent ||
                     this.openElements.current,
            siblings = this.treeAdapter.getChildNodes(parent),
            textNodeIdx = hasFosterParent && parentingLocation.beforeElement ?
                          siblings.indexOf(parentingLocation.beforeElement) - 1 :
                          siblings.length - 1,
            textNode = siblings[textNodeIdx];

        //NOTE: if we have location assigned by another token, then just update end position
        if (textNode.__location)
            textNode.__location.end = token.location.end;

        else
            textNode.__location = token.location;
    };
};


},{"../common/html":21,"../tokenization/tokenizer":32,"./open_element_stack":37}],37:[function(require,module,exports){
'use strict';

var HTML = require('../common/html');

//Aliases
var $ = HTML.TAG_NAMES,
    NS = HTML.NAMESPACES;

//Element utils

//OPTIMIZATION: Integer comparisons are low-cost, so we can use very fast tag name length filters here.
//It's faster than using dictionary.
function isImpliedEndTagRequired(tn) {
    switch (tn.length) {
        case 1:
            return tn === $.P;

        case 2:
            return tn === $.RP || tn === $.RT || tn === $.DD || tn === $.DT || tn === $.LI;

        case 6:
            return tn === $.OPTION;

        case 8:
            return tn === $.OPTGROUP;
    }

    return false;
}

function isScopingElement(tn, ns) {
    switch (tn.length) {
        case 2:
            if (tn === $.TD || tn === $.TH)
                return ns === NS.HTML;

            else if (tn === $.MI || tn === $.MO || tn == $.MN || tn === $.MS)
                return ns === NS.MATHML;

            break;

        case 4:
            if (tn === $.HTML)
                return ns === NS.HTML;

            else if (tn === $.DESC)
                return ns === NS.SVG;

            break;

        case 5:
            if (tn === $.TABLE)
                return ns === NS.HTML;

            else if (tn === $.MTEXT)
                return ns === NS.MATHML;

            else if (tn === $.TITLE)
                return ns === NS.SVG;

            break;

        case 6:
            return (tn === $.APPLET || tn === $.OBJECT) && ns === NS.HTML;

        case 7:
            return (tn === $.CAPTION || tn === $.MARQUEE) && ns === NS.HTML;

        case 8:
            return tn === $.TEMPLATE && ns === NS.HTML;

        case 13:
            return tn === $.FOREIGN_OBJECT && ns === NS.SVG;

        case 14:
            return tn === $.ANNOTATION_XML && ns === NS.MATHML;
    }

    return false;
}

//Stack of open elements
var OpenElementStack = module.exports = function (document, treeAdapter) {
    this.stackTop = -1;
    this.items = [];
    this.current = document;
    this.currentTagName = null;
    this.currentTmplContent = null;
    this.tmplCount = 0;
    this.treeAdapter = treeAdapter;
};

//Index of element
OpenElementStack.prototype._indexOf = function (element) {
    var idx = -1;

    for (var i = this.stackTop; i >= 0; i--) {
        if (this.items[i] === element) {
            idx = i;
            break;
        }
    }
    return idx;
};

//Update current element
OpenElementStack.prototype._isInTemplate = function () {
    if (this.currentTagName !== $.TEMPLATE)
        return false;

    return this.treeAdapter.getNamespaceURI(this.current) === NS.HTML;
};

OpenElementStack.prototype._updateCurrentElement = function () {
    this.current = this.items[this.stackTop];
    this.currentTagName = this.current && this.treeAdapter.getTagName(this.current);

    this.currentTmplContent = this._isInTemplate() ? this.treeAdapter.getChildNodes(this.current)[0] : null;
};

//Mutations
OpenElementStack.prototype.push = function (element) {
    this.items[++this.stackTop] = element;
    this._updateCurrentElement();

    if (this._isInTemplate())
        this.tmplCount++;

};

OpenElementStack.prototype.pop = function () {
    this.stackTop--;

    if (this.tmplCount > 0 && this._isInTemplate())
        this.tmplCount--;

    this._updateCurrentElement();
};

OpenElementStack.prototype.replace = function (oldElement, newElement) {
    var idx = this._indexOf(oldElement);
    this.items[idx] = newElement;

    if (idx === this.stackTop)
        this._updateCurrentElement();
};

OpenElementStack.prototype.insertAfter = function (referenceElement, newElement) {
    var insertionIdx = this._indexOf(referenceElement) + 1;

    this.items.splice(insertionIdx, 0, newElement);

    if (insertionIdx == ++this.stackTop)
        this._updateCurrentElement();
};

OpenElementStack.prototype.popUntilTagNamePopped = function (tagName) {
    while (this.stackTop > -1) {
        var tn = this.currentTagName;

        this.pop();

        if (tn === tagName)
            break;
    }
};

OpenElementStack.prototype.popUntilTemplatePopped = function () {
    while (this.stackTop > -1) {
        var tn = this.currentTagName,
            ns = this.treeAdapter.getNamespaceURI(this.current);

        this.pop();

        if (tn === $.TEMPLATE && ns === NS.HTML)
            break;
    }
};

OpenElementStack.prototype.popUntilElementPopped = function (element) {
    while (this.stackTop > -1) {
        var poppedElement = this.current;

        this.pop();

        if (poppedElement === element)
            break;
    }
};

OpenElementStack.prototype.popUntilNumberedHeaderPopped = function () {
    while (this.stackTop > -1) {
        var tn = this.currentTagName;

        this.pop();

        if (tn === $.H1 || tn === $.H2 || tn === $.H3 || tn === $.H4 || tn === $.H5 || tn === $.H6)
            break;
    }
};

OpenElementStack.prototype.popAllUpToHtmlElement = function () {
    //NOTE: here we assume that root <html> element is always first in the open element stack, so
    //we perform this fast stack clean up.
    this.stackTop = 0;
    this._updateCurrentElement();
};

OpenElementStack.prototype.clearBackToTableContext = function () {
    while (this.currentTagName !== $.TABLE && this.currentTagName !== $.TEMPLATE && this.currentTagName !== $.HTML)
        this.pop();
};

OpenElementStack.prototype.clearBackToTableBodyContext = function () {
    while (this.currentTagName !== $.TBODY && this.currentTagName !== $.TFOOT &&
           this.currentTagName !== $.THEAD && this.currentTagName !== $.TEMPLATE &&
           this.currentTagName !== $.HTML) {
        this.pop();
    }
};

OpenElementStack.prototype.clearBackToTableRowContext = function () {
    while (this.currentTagName !== $.TR && this.currentTagName !== $.TEMPLATE && this.currentTagName !== $.HTML)
        this.pop();
};

OpenElementStack.prototype.remove = function (element) {
    for (var i = this.stackTop; i >= 0; i--) {
        if (this.items[i] === element) {
            this.items.splice(i, 1);
            this.stackTop--;
            this._updateCurrentElement();
            break;
        }
    }
};

//Search
OpenElementStack.prototype.tryPeekProperlyNestedBodyElement = function () {
    //Properly nested <body> element (should be second element in stack).
    var element = this.items[1];
    return element && this.treeAdapter.getTagName(element) === $.BODY ? element : null;
};

OpenElementStack.prototype.contains = function (element) {
    return this._indexOf(element) > -1;
};

OpenElementStack.prototype.getCommonAncestor = function (element) {
    var elementIdx = this._indexOf(element);

    return --elementIdx >= 0 ? this.items[elementIdx] : null;
};

OpenElementStack.prototype.isRootHtmlElementCurrent = function () {
    return this.stackTop === 0 && this.currentTagName === $.HTML;
};

//Element in scope
OpenElementStack.prototype.hasInScope = function (tagName) {
    for (var i = this.stackTop; i >= 0; i--) {
        var tn = this.treeAdapter.getTagName(this.items[i]);

        if (tn === tagName)
            return true;

        var ns = this.treeAdapter.getNamespaceURI(this.items[i]);

        if (isScopingElement(tn, ns))
            return false;
    }

    return true;
};

OpenElementStack.prototype.hasNumberedHeaderInScope = function () {
    for (var i = this.stackTop; i >= 0; i--) {
        var tn = this.treeAdapter.getTagName(this.items[i]);

        if (tn === $.H1 || tn === $.H2 || tn === $.H3 || tn === $.H4 || tn === $.H5 || tn === $.H6)
            return true;

        if (isScopingElement(tn, this.treeAdapter.getNamespaceURI(this.items[i])))
            return false;
    }

    return true;
};

OpenElementStack.prototype.hasInListItemScope = function (tagName) {
    for (var i = this.stackTop; i >= 0; i--) {
        var tn = this.treeAdapter.getTagName(this.items[i]);

        if (tn === tagName)
            return true;

        var ns = this.treeAdapter.getNamespaceURI(this.items[i]);

        if (((tn === $.UL || tn === $.OL) && ns === NS.HTML) || isScopingElement(tn, ns))
            return false;
    }

    return true;
};

OpenElementStack.prototype.hasInButtonScope = function (tagName) {
    for (var i = this.stackTop; i >= 0; i--) {
        var tn = this.treeAdapter.getTagName(this.items[i]);

        if (tn === tagName)
            return true;

        var ns = this.treeAdapter.getNamespaceURI(this.items[i]);

        if ((tn === $.BUTTON && ns === NS.HTML) || isScopingElement(tn, ns))
            return false;
    }

    return true;
};

OpenElementStack.prototype.hasInTableScope = function (tagName) {
    for (var i = this.stackTop; i >= 0; i--) {
        var tn = this.treeAdapter.getTagName(this.items[i]);

        if (tn === tagName)
            return true;

        var ns = this.treeAdapter.getNamespaceURI(this.items[i]);

        if ((tn === $.TABLE || tn === $.TEMPLATE || tn === $.HTML) && ns === NS.HTML)
            return false;
    }

    return true;
};

OpenElementStack.prototype.hasTableBodyContextInTableScope = function () {
    for (var i = this.stackTop; i >= 0; i--) {
        var tn = this.treeAdapter.getTagName(this.items[i]);

        if (tn === $.TBODY || tn === $.THEAD || tn === $.TFOOT)
            return true;

        var ns = this.treeAdapter.getNamespaceURI(this.items[i]);

        if ((tn === $.TABLE || tn === $.HTML) && ns === NS.HTML)
            return false;
    }

    return true;
};

OpenElementStack.prototype.hasInSelectScope = function (tagName) {
    for (var i = this.stackTop; i >= 0; i--) {
        var tn = this.treeAdapter.getTagName(this.items[i]);

        if (tn === tagName)
            return true;

        var ns = this.treeAdapter.getNamespaceURI(this.items[i]);

        if (tn !== $.OPTION && tn !== $.OPTGROUP && ns === NS.HTML)
            return false;
    }

    return true;
};

//Implied end tags
OpenElementStack.prototype.generateImpliedEndTags = function () {
    while (isImpliedEndTagRequired(this.currentTagName))
        this.pop();
};

OpenElementStack.prototype.generateImpliedEndTagsWithExclusion = function (exclusionTagName) {
    while (isImpliedEndTagRequired(this.currentTagName) && this.currentTagName !== exclusionTagName)
        this.pop();
};

},{"../common/html":21}],38:[function(require,module,exports){
'use strict';

var Tokenizer = require('../tokenization/tokenizer'),
    OpenElementStack = require('./open_element_stack'),
    FormattingElementList = require('./formatting_element_list'),
    LocationInfoMixin = require('./location_info_mixin'),
    DefaultTreeAdapter = require('../tree_adapters/default'),
    Doctype = require('../common/doctype'),
    ForeignContent = require('../common/foreign_content'),
    Utils = require('../common/utils'),
    UNICODE = require('../common/unicode'),
    HTML = require('../common/html');

//Aliases
var $ = HTML.TAG_NAMES,
    NS = HTML.NAMESPACES,
    ATTRS = HTML.ATTRS;

//Default options
var DEFAULT_OPTIONS = {
    decodeHtmlEntities: true,
    locationInfo: false
};

//Misc constants
var SEARCHABLE_INDEX_DEFAULT_PROMPT = 'This is a searchable index. Enter search keywords: ',
    SEARCHABLE_INDEX_INPUT_NAME = 'isindex',
    HIDDEN_INPUT_TYPE = 'hidden';

//Adoption agency loops iteration count
var AA_OUTER_LOOP_ITER = 8,
    AA_INNER_LOOP_ITER = 3;

//Insertion modes
var INITIAL_MODE = 'INITIAL_MODE',
    BEFORE_HTML_MODE = 'BEFORE_HTML_MODE',
    BEFORE_HEAD_MODE = 'BEFORE_HEAD_MODE',
    IN_HEAD_MODE = 'IN_HEAD_MODE',
    AFTER_HEAD_MODE = 'AFTER_HEAD_MODE',
    IN_BODY_MODE = 'IN_BODY_MODE',
    TEXT_MODE = 'TEXT_MODE',
    IN_TABLE_MODE = 'IN_TABLE_MODE',
    IN_TABLE_TEXT_MODE = 'IN_TABLE_TEXT_MODE',
    IN_CAPTION_MODE = 'IN_CAPTION_MODE',
    IN_COLUMN_GROUP_MODE = 'IN_COLUMN_GROUP_MODE',
    IN_TABLE_BODY_MODE = 'IN_TABLE_BODY_MODE',
    IN_ROW_MODE = 'IN_ROW_MODE',
    IN_CELL_MODE = 'IN_CELL_MODE',
    IN_SELECT_MODE = 'IN_SELECT_MODE',
    IN_SELECT_IN_TABLE_MODE = 'IN_SELECT_IN_TABLE_MODE',
    IN_TEMPLATE_MODE = 'IN_TEMPLATE_MODE',
    AFTER_BODY_MODE = 'AFTER_BODY_MODE',
    IN_FRAMESET_MODE = 'IN_FRAMESET_MODE',
    AFTER_FRAMESET_MODE = 'AFTER_FRAMESET_MODE',
    AFTER_AFTER_BODY_MODE = 'AFTER_AFTER_BODY_MODE',
    AFTER_AFTER_FRAMESET_MODE = 'AFTER_AFTER_FRAMESET_MODE';

//Insertion mode reset map
var INSERTION_MODE_RESET_MAP = {};

INSERTION_MODE_RESET_MAP[$.TR] = IN_ROW_MODE;
INSERTION_MODE_RESET_MAP[$.TBODY] =
INSERTION_MODE_RESET_MAP[$.THEAD] =
INSERTION_MODE_RESET_MAP[$.TFOOT] = IN_TABLE_BODY_MODE;
INSERTION_MODE_RESET_MAP[$.CAPTION] = IN_CAPTION_MODE;
INSERTION_MODE_RESET_MAP[$.COLGROUP] = IN_COLUMN_GROUP_MODE;
INSERTION_MODE_RESET_MAP[$.TABLE] = IN_TABLE_MODE;
INSERTION_MODE_RESET_MAP[$.BODY] = IN_BODY_MODE;
INSERTION_MODE_RESET_MAP[$.FRAMESET] = IN_FRAMESET_MODE;

//Template insertion mode switch map
var TEMPLATE_INSERTION_MODE_SWITCH_MAP = {};

TEMPLATE_INSERTION_MODE_SWITCH_MAP[$.CAPTION] =
TEMPLATE_INSERTION_MODE_SWITCH_MAP[$.COLGROUP] =
TEMPLATE_INSERTION_MODE_SWITCH_MAP[$.TBODY] =
TEMPLATE_INSERTION_MODE_SWITCH_MAP[$.TFOOT] =
TEMPLATE_INSERTION_MODE_SWITCH_MAP[$.THEAD] = IN_TABLE_MODE;
TEMPLATE_INSERTION_MODE_SWITCH_MAP[$.COL] = IN_COLUMN_GROUP_MODE;
TEMPLATE_INSERTION_MODE_SWITCH_MAP[$.TR] = IN_TABLE_BODY_MODE;
TEMPLATE_INSERTION_MODE_SWITCH_MAP[$.TD] =
TEMPLATE_INSERTION_MODE_SWITCH_MAP[$.TH] = IN_ROW_MODE;

//Token handlers map for insertion modes
var _ = {};

_[INITIAL_MODE] = {};
_[INITIAL_MODE][Tokenizer.CHARACTER_TOKEN] =
_[INITIAL_MODE][Tokenizer.NULL_CHARACTER_TOKEN] = tokenInInitialMode;
_[INITIAL_MODE][Tokenizer.WHITESPACE_CHARACTER_TOKEN] = ignoreToken;
_[INITIAL_MODE][Tokenizer.COMMENT_TOKEN] = appendComment;
_[INITIAL_MODE][Tokenizer.DOCTYPE_TOKEN] = doctypeInInitialMode;
_[INITIAL_MODE][Tokenizer.START_TAG_TOKEN] =
_[INITIAL_MODE][Tokenizer.END_TAG_TOKEN] =
_[INITIAL_MODE][Tokenizer.EOF_TOKEN] = tokenInInitialMode;

_[BEFORE_HTML_MODE] = {};
_[BEFORE_HTML_MODE][Tokenizer.CHARACTER_TOKEN] =
_[BEFORE_HTML_MODE][Tokenizer.NULL_CHARACTER_TOKEN] = tokenBeforeHtml;
_[BEFORE_HTML_MODE][Tokenizer.WHITESPACE_CHARACTER_TOKEN] = ignoreToken;
_[BEFORE_HTML_MODE][Tokenizer.COMMENT_TOKEN] = appendComment;
_[BEFORE_HTML_MODE][Tokenizer.DOCTYPE_TOKEN] = ignoreToken;
_[BEFORE_HTML_MODE][Tokenizer.START_TAG_TOKEN] = startTagBeforeHtml;
_[BEFORE_HTML_MODE][Tokenizer.END_TAG_TOKEN] = endTagBeforeHtml;
_[BEFORE_HTML_MODE][Tokenizer.EOF_TOKEN] = tokenBeforeHtml;

_[BEFORE_HEAD_MODE] = {};
_[BEFORE_HEAD_MODE][Tokenizer.CHARACTER_TOKEN] =
_[BEFORE_HEAD_MODE][Tokenizer.NULL_CHARACTER_TOKEN] = tokenBeforeHead;
_[BEFORE_HEAD_MODE][Tokenizer.WHITESPACE_CHARACTER_TOKEN] = ignoreToken;
_[BEFORE_HEAD_MODE][Tokenizer.COMMENT_TOKEN] = appendComment;
_[BEFORE_HEAD_MODE][Tokenizer.DOCTYPE_TOKEN] = ignoreToken;
_[BEFORE_HEAD_MODE][Tokenizer.START_TAG_TOKEN] = startTagBeforeHead;
_[BEFORE_HEAD_MODE][Tokenizer.END_TAG_TOKEN] = endTagBeforeHead;
_[BEFORE_HEAD_MODE][Tokenizer.EOF_TOKEN] = tokenBeforeHead;

_[IN_HEAD_MODE] = {};
_[IN_HEAD_MODE][Tokenizer.CHARACTER_TOKEN] =
_[IN_HEAD_MODE][Tokenizer.NULL_CHARACTER_TOKEN] = tokenInHead;
_[IN_HEAD_MODE][Tokenizer.WHITESPACE_CHARACTER_TOKEN] = insertCharacters;
_[IN_HEAD_MODE][Tokenizer.COMMENT_TOKEN] = appendComment;
_[IN_HEAD_MODE][Tokenizer.DOCTYPE_TOKEN] = ignoreToken;
_[IN_HEAD_MODE][Tokenizer.START_TAG_TOKEN] = startTagInHead;
_[IN_HEAD_MODE][Tokenizer.END_TAG_TOKEN] = endTagInHead;
_[IN_HEAD_MODE][Tokenizer.EOF_TOKEN] = tokenInHead;

_[AFTER_HEAD_MODE] = {};
_[AFTER_HEAD_MODE][Tokenizer.CHARACTER_TOKEN] =
_[AFTER_HEAD_MODE][Tokenizer.NULL_CHARACTER_TOKEN] = tokenAfterHead;
_[AFTER_HEAD_MODE][Tokenizer.WHITESPACE_CHARACTER_TOKEN] = insertCharacters;
_[AFTER_HEAD_MODE][Tokenizer.COMMENT_TOKEN] = appendComment;
_[AFTER_HEAD_MODE][Tokenizer.DOCTYPE_TOKEN] = ignoreToken;
_[AFTER_HEAD_MODE][Tokenizer.START_TAG_TOKEN] = startTagAfterHead;
_[AFTER_HEAD_MODE][Tokenizer.END_TAG_TOKEN] = endTagAfterHead;
_[AFTER_HEAD_MODE][Tokenizer.EOF_TOKEN] = tokenAfterHead;

_[IN_BODY_MODE] = {};
_[IN_BODY_MODE][Tokenizer.CHARACTER_TOKEN] = characterInBody;
_[IN_BODY_MODE][Tokenizer.NULL_CHARACTER_TOKEN] = ignoreToken;
_[IN_BODY_MODE][Tokenizer.WHITESPACE_CHARACTER_TOKEN] = whitespaceCharacterInBody;
_[IN_BODY_MODE][Tokenizer.COMMENT_TOKEN] = appendComment;
_[IN_BODY_MODE][Tokenizer.DOCTYPE_TOKEN] = ignoreToken;
_[IN_BODY_MODE][Tokenizer.START_TAG_TOKEN] = startTagInBody;
_[IN_BODY_MODE][Tokenizer.END_TAG_TOKEN] = endTagInBody;
_[IN_BODY_MODE][Tokenizer.EOF_TOKEN] = eofInBody;

_[TEXT_MODE] = {};
_[TEXT_MODE][Tokenizer.CHARACTER_TOKEN] =
_[TEXT_MODE][Tokenizer.NULL_CHARACTER_TOKEN] =
_[TEXT_MODE][Tokenizer.WHITESPACE_CHARACTER_TOKEN] = insertCharacters;
_[TEXT_MODE][Tokenizer.COMMENT_TOKEN] =
_[TEXT_MODE][Tokenizer.DOCTYPE_TOKEN] =
_[TEXT_MODE][Tokenizer.START_TAG_TOKEN] = ignoreToken;
_[TEXT_MODE][Tokenizer.END_TAG_TOKEN] = endTagInText;
_[TEXT_MODE][Tokenizer.EOF_TOKEN] = eofInText;

_[IN_TABLE_MODE] = {};
_[IN_TABLE_MODE][Tokenizer.CHARACTER_TOKEN] =
_[IN_TABLE_MODE][Tokenizer.NULL_CHARACTER_TOKEN] =
_[IN_TABLE_MODE][Tokenizer.WHITESPACE_CHARACTER_TOKEN] = characterInTable;
_[IN_TABLE_MODE][Tokenizer.COMMENT_TOKEN] = appendComment;
_[IN_TABLE_MODE][Tokenizer.DOCTYPE_TOKEN] = ignoreToken;
_[IN_TABLE_MODE][Tokenizer.START_TAG_TOKEN] = startTagInTable;
_[IN_TABLE_MODE][Tokenizer.END_TAG_TOKEN] = endTagInTable;
_[IN_TABLE_MODE][Tokenizer.EOF_TOKEN] = eofInBody;

_[IN_TABLE_TEXT_MODE] = {};
_[IN_TABLE_TEXT_MODE][Tokenizer.CHARACTER_TOKEN] = characterInTableText;
_[IN_TABLE_TEXT_MODE][Tokenizer.NULL_CHARACTER_TOKEN] = ignoreToken;
_[IN_TABLE_TEXT_MODE][Tokenizer.WHITESPACE_CHARACTER_TOKEN] = whitespaceCharacterInTableText;
_[IN_TABLE_TEXT_MODE][Tokenizer.COMMENT_TOKEN] =
_[IN_TABLE_TEXT_MODE][Tokenizer.DOCTYPE_TOKEN] =
_[IN_TABLE_TEXT_MODE][Tokenizer.START_TAG_TOKEN] =
_[IN_TABLE_TEXT_MODE][Tokenizer.END_TAG_TOKEN] =
_[IN_TABLE_TEXT_MODE][Tokenizer.EOF_TOKEN] = tokenInTableText;

_[IN_CAPTION_MODE] = {};
_[IN_CAPTION_MODE][Tokenizer.CHARACTER_TOKEN] = characterInBody;
_[IN_CAPTION_MODE][Tokenizer.NULL_CHARACTER_TOKEN] = ignoreToken;
_[IN_CAPTION_MODE][Tokenizer.WHITESPACE_CHARACTER_TOKEN] = whitespaceCharacterInBody;
_[IN_CAPTION_MODE][Tokenizer.COMMENT_TOKEN] = appendComment;
_[IN_CAPTION_MODE][Tokenizer.DOCTYPE_TOKEN] = ignoreToken;
_[IN_CAPTION_MODE][Tokenizer.START_TAG_TOKEN] = startTagInCaption;
_[IN_CAPTION_MODE][Tokenizer.END_TAG_TOKEN] = endTagInCaption;
_[IN_CAPTION_MODE][Tokenizer.EOF_TOKEN] = eofInBody;

_[IN_COLUMN_GROUP_MODE] = {};
_[IN_COLUMN_GROUP_MODE][Tokenizer.CHARACTER_TOKEN] =
_[IN_COLUMN_GROUP_MODE][Tokenizer.NULL_CHARACTER_TOKEN] = tokenInColumnGroup;
_[IN_COLUMN_GROUP_MODE][Tokenizer.WHITESPACE_CHARACTER_TOKEN] = insertCharacters;
_[IN_COLUMN_GROUP_MODE][Tokenizer.COMMENT_TOKEN] = appendComment;
_[IN_COLUMN_GROUP_MODE][Tokenizer.DOCTYPE_TOKEN] = ignoreToken;
_[IN_COLUMN_GROUP_MODE][Tokenizer.START_TAG_TOKEN] = startTagInColumnGroup;
_[IN_COLUMN_GROUP_MODE][Tokenizer.END_TAG_TOKEN] = endTagInColumnGroup;
_[IN_COLUMN_GROUP_MODE][Tokenizer.EOF_TOKEN] = eofInBody;

_[IN_TABLE_BODY_MODE] = {};
_[IN_TABLE_BODY_MODE][Tokenizer.CHARACTER_TOKEN] =
_[IN_TABLE_BODY_MODE][Tokenizer.NULL_CHARACTER_TOKEN] =
_[IN_TABLE_BODY_MODE][Tokenizer.WHITESPACE_CHARACTER_TOKEN] = characterInTable;
_[IN_TABLE_BODY_MODE][Tokenizer.COMMENT_TOKEN] = appendComment;
_[IN_TABLE_BODY_MODE][Tokenizer.DOCTYPE_TOKEN] = ignoreToken;
_[IN_TABLE_BODY_MODE][Tokenizer.START_TAG_TOKEN] = startTagInTableBody;
_[IN_TABLE_BODY_MODE][Tokenizer.END_TAG_TOKEN] = endTagInTableBody;
_[IN_TABLE_BODY_MODE][Tokenizer.EOF_TOKEN] = eofInBody;

_[IN_ROW_MODE] = {};
_[IN_ROW_MODE][Tokenizer.CHARACTER_TOKEN] =
_[IN_ROW_MODE][Tokenizer.NULL_CHARACTER_TOKEN] =
_[IN_ROW_MODE][Tokenizer.WHITESPACE_CHARACTER_TOKEN] = characterInTable;
_[IN_ROW_MODE][Tokenizer.COMMENT_TOKEN] = appendComment;
_[IN_ROW_MODE][Tokenizer.DOCTYPE_TOKEN] = ignoreToken;
_[IN_ROW_MODE][Tokenizer.START_TAG_TOKEN] = startTagInRow;
_[IN_ROW_MODE][Tokenizer.END_TAG_TOKEN] = endTagInRow;
_[IN_ROW_MODE][Tokenizer.EOF_TOKEN] = eofInBody;

_[IN_CELL_MODE] = {};
_[IN_CELL_MODE][Tokenizer.CHARACTER_TOKEN] = characterInBody;
_[IN_CELL_MODE][Tokenizer.NULL_CHARACTER_TOKEN] = ignoreToken;
_[IN_CELL_MODE][Tokenizer.WHITESPACE_CHARACTER_TOKEN] = whitespaceCharacterInBody;
_[IN_CELL_MODE][Tokenizer.COMMENT_TOKEN] = appendComment;
_[IN_CELL_MODE][Tokenizer.DOCTYPE_TOKEN] = ignoreToken;
_[IN_CELL_MODE][Tokenizer.START_TAG_TOKEN] = startTagInCell;
_[IN_CELL_MODE][Tokenizer.END_TAG_TOKEN] = endTagInCell;
_[IN_CELL_MODE][Tokenizer.EOF_TOKEN] = eofInBody;

_[IN_SELECT_MODE] = {};
_[IN_SELECT_MODE][Tokenizer.CHARACTER_TOKEN] = insertCharacters;
_[IN_SELECT_MODE][Tokenizer.NULL_CHARACTER_TOKEN] = ignoreToken;
_[IN_SELECT_MODE][Tokenizer.WHITESPACE_CHARACTER_TOKEN] = insertCharacters;
_[IN_SELECT_MODE][Tokenizer.COMMENT_TOKEN] = appendComment;
_[IN_SELECT_MODE][Tokenizer.DOCTYPE_TOKEN] = ignoreToken;
_[IN_SELECT_MODE][Tokenizer.START_TAG_TOKEN] = startTagInSelect;
_[IN_SELECT_MODE][Tokenizer.END_TAG_TOKEN] = endTagInSelect;
_[IN_SELECT_MODE][Tokenizer.EOF_TOKEN] = eofInBody;

_[IN_SELECT_IN_TABLE_MODE] = {};
_[IN_SELECT_IN_TABLE_MODE][Tokenizer.CHARACTER_TOKEN] = insertCharacters;
_[IN_SELECT_IN_TABLE_MODE][Tokenizer.NULL_CHARACTER_TOKEN] = ignoreToken;
_[IN_SELECT_IN_TABLE_MODE][Tokenizer.WHITESPACE_CHARACTER_TOKEN] = insertCharacters;
_[IN_SELECT_IN_TABLE_MODE][Tokenizer.COMMENT_TOKEN] = appendComment;
_[IN_SELECT_IN_TABLE_MODE][Tokenizer.DOCTYPE_TOKEN] = ignoreToken;
_[IN_SELECT_IN_TABLE_MODE][Tokenizer.START_TAG_TOKEN] = startTagInSelectInTable;
_[IN_SELECT_IN_TABLE_MODE][Tokenizer.END_TAG_TOKEN] = endTagInSelectInTable;
_[IN_SELECT_IN_TABLE_MODE][Tokenizer.EOF_TOKEN] = eofInBody;

_[IN_TEMPLATE_MODE] = {};
_[IN_TEMPLATE_MODE][Tokenizer.CHARACTER_TOKEN] = characterInBody;
_[IN_TEMPLATE_MODE][Tokenizer.NULL_CHARACTER_TOKEN] = ignoreToken;
_[IN_TEMPLATE_MODE][Tokenizer.WHITESPACE_CHARACTER_TOKEN] = whitespaceCharacterInBody;
_[IN_TEMPLATE_MODE][Tokenizer.COMMENT_TOKEN] = appendComment;
_[IN_TEMPLATE_MODE][Tokenizer.DOCTYPE_TOKEN] = ignoreToken;
_[IN_TEMPLATE_MODE][Tokenizer.START_TAG_TOKEN] = startTagInTemplate;
_[IN_TEMPLATE_MODE][Tokenizer.END_TAG_TOKEN] = endTagInTemplate;
_[IN_TEMPLATE_MODE][Tokenizer.EOF_TOKEN] = eofInTemplate;

_[AFTER_BODY_MODE] = {};
_[AFTER_BODY_MODE][Tokenizer.CHARACTER_TOKEN] =
_[AFTER_BODY_MODE][Tokenizer.NULL_CHARACTER_TOKEN] = tokenAfterBody;
_[AFTER_BODY_MODE][Tokenizer.WHITESPACE_CHARACTER_TOKEN] = whitespaceCharacterInBody;
_[AFTER_BODY_MODE][Tokenizer.COMMENT_TOKEN] = appendCommentToRootHtmlElement;
_[AFTER_BODY_MODE][Tokenizer.DOCTYPE_TOKEN] = ignoreToken;
_[AFTER_BODY_MODE][Tokenizer.START_TAG_TOKEN] = startTagAfterBody;
_[AFTER_BODY_MODE][Tokenizer.END_TAG_TOKEN] = endTagAfterBody;
_[AFTER_BODY_MODE][Tokenizer.EOF_TOKEN] = stopParsing;

_[IN_FRAMESET_MODE] = {};
_[IN_FRAMESET_MODE][Tokenizer.CHARACTER_TOKEN] =
_[IN_FRAMESET_MODE][Tokenizer.NULL_CHARACTER_TOKEN] = ignoreToken;
_[IN_FRAMESET_MODE][Tokenizer.WHITESPACE_CHARACTER_TOKEN] = insertCharacters;
_[IN_FRAMESET_MODE][Tokenizer.COMMENT_TOKEN] = appendComment;
_[IN_FRAMESET_MODE][Tokenizer.DOCTYPE_TOKEN] = ignoreToken;
_[IN_FRAMESET_MODE][Tokenizer.START_TAG_TOKEN] = startTagInFrameset;
_[IN_FRAMESET_MODE][Tokenizer.END_TAG_TOKEN] = endTagInFrameset;
_[IN_FRAMESET_MODE][Tokenizer.EOF_TOKEN] = stopParsing;

_[AFTER_FRAMESET_MODE] = {};
_[AFTER_FRAMESET_MODE][Tokenizer.CHARACTER_TOKEN] =
_[AFTER_FRAMESET_MODE][Tokenizer.NULL_CHARACTER_TOKEN] = ignoreToken;
_[AFTER_FRAMESET_MODE][Tokenizer.WHITESPACE_CHARACTER_TOKEN] = insertCharacters;
_[AFTER_FRAMESET_MODE][Tokenizer.COMMENT_TOKEN] = appendComment;
_[AFTER_FRAMESET_MODE][Tokenizer.DOCTYPE_TOKEN] = ignoreToken;
_[AFTER_FRAMESET_MODE][Tokenizer.START_TAG_TOKEN] = startTagAfterFrameset;
_[AFTER_FRAMESET_MODE][Tokenizer.END_TAG_TOKEN] = endTagAfterFrameset;
_[AFTER_FRAMESET_MODE][Tokenizer.EOF_TOKEN] = stopParsing;

_[AFTER_AFTER_BODY_MODE] = {};
_[AFTER_AFTER_BODY_MODE][Tokenizer.CHARACTER_TOKEN] = tokenAfterAfterBody;
_[AFTER_AFTER_BODY_MODE][Tokenizer.NULL_CHARACTER_TOKEN] = tokenAfterAfterBody;
_[AFTER_AFTER_BODY_MODE][Tokenizer.WHITESPACE_CHARACTER_TOKEN] = whitespaceCharacterInBody;
_[AFTER_AFTER_BODY_MODE][Tokenizer.COMMENT_TOKEN] = appendCommentToDocument;
_[AFTER_AFTER_BODY_MODE][Tokenizer.DOCTYPE_TOKEN] = ignoreToken;
_[AFTER_AFTER_BODY_MODE][Tokenizer.START_TAG_TOKEN] = startTagAfterAfterBody;
_[AFTER_AFTER_BODY_MODE][Tokenizer.END_TAG_TOKEN] = tokenAfterAfterBody;
_[AFTER_AFTER_BODY_MODE][Tokenizer.EOF_TOKEN] = stopParsing;

_[AFTER_AFTER_FRAMESET_MODE] = {};
_[AFTER_AFTER_FRAMESET_MODE][Tokenizer.CHARACTER_TOKEN] =
_[AFTER_AFTER_FRAMESET_MODE][Tokenizer.NULL_CHARACTER_TOKEN] = ignoreToken;
_[AFTER_AFTER_FRAMESET_MODE][Tokenizer.WHITESPACE_CHARACTER_TOKEN] = whitespaceCharacterInBody;
_[AFTER_AFTER_FRAMESET_MODE][Tokenizer.COMMENT_TOKEN] = appendCommentToDocument;
_[AFTER_AFTER_FRAMESET_MODE][Tokenizer.DOCTYPE_TOKEN] = ignoreToken;
_[AFTER_AFTER_FRAMESET_MODE][Tokenizer.START_TAG_TOKEN] = startTagAfterAfterFrameset;
_[AFTER_AFTER_FRAMESET_MODE][Tokenizer.END_TAG_TOKEN] = ignoreToken;
_[AFTER_AFTER_FRAMESET_MODE][Tokenizer.EOF_TOKEN] = stopParsing;

//Searchable index building utils (<isindex> tag)
function getSearchableIndexFormAttrs(isindexStartTagToken) {
    var indexAction = Tokenizer.getTokenAttr(isindexStartTagToken, ATTRS.ACTION),
        attrs = [];

    if (indexAction !== null) {
        attrs.push({
            name: ATTRS.ACTION,
            value: indexAction
        });
    }

    return attrs;
}

function getSearchableIndexLabelText(isindexStartTagToken) {
    var indexPrompt = Tokenizer.getTokenAttr(isindexStartTagToken, ATTRS.PROMPT);

    return indexPrompt === null ? SEARCHABLE_INDEX_DEFAULT_PROMPT : indexPrompt;
}

function getSearchableIndexInputAttrs(isindexStartTagToken) {
    var isindexAttrs = isindexStartTagToken.attrs,
        inputAttrs = [];

    for (var i = 0; i < isindexAttrs.length; i++) {
        var name = isindexAttrs[i].name;

        if (name !== ATTRS.NAME && name !== ATTRS.ACTION && name !== ATTRS.PROMPT)
            inputAttrs.push(isindexAttrs[i]);
    }

    inputAttrs.push({
        name: ATTRS.NAME,
        value: SEARCHABLE_INDEX_INPUT_NAME
    });

    return inputAttrs;
}

//Parser
var Parser = module.exports = function (treeAdapter, options) {
    this.treeAdapter = treeAdapter || DefaultTreeAdapter;
    this.options = Utils.mergeOptions(DEFAULT_OPTIONS, options);
    this.scriptHandler = null;

    if (this.options.locationInfo)
        LocationInfoMixin.assign(this);
};

//API
Parser.prototype.parse = function (html) {
    var document = this.treeAdapter.createDocument();

    this._reset(html, document, null);
    this._runParsingLoop();

    return document;
};

Parser.prototype.parseFragment = function (html, fragmentContext) {
    //NOTE: use <template> element as a fragment context if context element was not provided,
    //so we will parse in "forgiving" manner
    if (!fragmentContext)
        fragmentContext = this.treeAdapter.createElement($.TEMPLATE, NS.HTML, []);

    //NOTE: create fake element which will be used as 'document' for fragment parsing.
    //This is important for jsdom there 'document' can't be recreated, therefore
    //fragment parsing causes messing of the main `document`.
    var documentMock = this.treeAdapter.createElement('documentmock', NS.HTML, []);

    this._reset(html, documentMock, fragmentContext);

    if (this.treeAdapter.getTagName(fragmentContext) === $.TEMPLATE)
        this._pushTmplInsertionMode(IN_TEMPLATE_MODE);

    this._initTokenizerForFragmentParsing();
    this._insertFakeRootElement();
    this._resetInsertionMode();
    this._findFormInFragmentContext();
    this._runParsingLoop();

    var rootElement = this.treeAdapter.getFirstChild(documentMock),
        fragment = this.treeAdapter.createDocumentFragment();

    this._adoptNodes(rootElement, fragment);

    return fragment;
};

//Reset state
Parser.prototype._reset = function (html, document, fragmentContext) {
    this.tokenizer = new Tokenizer(html, this.options);

    this.stopped = false;

    this.insertionMode = INITIAL_MODE;
    this.originalInsertionMode = '';

    this.document = document;
    this.fragmentContext = fragmentContext;

    this.headElement = null;
    this.formElement = null;

    this.openElements = new OpenElementStack(this.document, this.treeAdapter);
    this.activeFormattingElements = new FormattingElementList(this.treeAdapter);

    this.tmplInsertionModeStack = [];
    this.tmplInsertionModeStackTop = -1;
    this.currentTmplInsertionMode = null;

    this.pendingCharacterTokens = [];
    this.hasNonWhitespacePendingCharacterToken = false;

    this.framesetOk = true;
    this.skipNextNewLine = false;
    this.fosterParentingEnabled = false;
};

//Parsing loop
Parser.prototype._iterateParsingLoop = function () {
    this._setupTokenizerCDATAMode();

    var token = this.tokenizer.getNextToken();

    if (this.skipNextNewLine) {
        this.skipNextNewLine = false;

        if (token.type === Tokenizer.WHITESPACE_CHARACTER_TOKEN && token.chars[0] === '\n') {
            if (token.chars.length === 1)
                return;

            token.chars = token.chars.substr(1);
        }
    }

    if (this._shouldProcessTokenInForeignContent(token))
        this._processTokenInForeignContent(token);

    else
        this._processToken(token);
};

Parser.prototype._runParsingLoop = function () {
    while (!this.stopped)
        this._iterateParsingLoop();
};

//Text parsing
Parser.prototype._setupTokenizerCDATAMode = function () {
    var current = this._getAdjustedCurrentElement();

    this.tokenizer.allowCDATA = current && current !== this.document &&
                                this.treeAdapter.getNamespaceURI(current) !== NS.HTML &&
                                (!this._isHtmlIntegrationPoint(current)) &&
                                (!this._isMathMLTextIntegrationPoint(current));
};

Parser.prototype._switchToTextParsing = function (currentToken, nextTokenizerState) {
    this._insertElement(currentToken, NS.HTML);
    this.tokenizer.state = nextTokenizerState;
    this.originalInsertionMode = this.insertionMode;
    this.insertionMode = TEXT_MODE;
};

//Fragment parsing
Parser.prototype._getAdjustedCurrentElement = function () {
    return this.openElements.stackTop === 0 && this.fragmentContext ?
           this.fragmentContext :
           this.openElements.current;
};

Parser.prototype._findFormInFragmentContext = function () {
    var node = this.fragmentContext;

    do {
        if (this.treeAdapter.getTagName(node) === $.FORM) {
            this.formElement = node;
            break;
        }

        node = this.treeAdapter.getParentNode(node);
    } while (node);
};

Parser.prototype._initTokenizerForFragmentParsing = function () {
    var tn = this.treeAdapter.getTagName(this.fragmentContext);

    if (tn === $.TITLE || tn === $.TEXTAREA)
        this.tokenizer.state = Tokenizer.MODE.RCDATA;

    else if (tn === $.STYLE || tn === $.XMP || tn === $.IFRAME ||
             tn === $.NOEMBED || tn === $.NOFRAMES || tn === $.NOSCRIPT) {
        this.tokenizer.state = Tokenizer.MODE.RAWTEXT;
    }

    else if (tn === $.SCRIPT)
        this.tokenizer.state = Tokenizer.MODE.SCRIPT_DATA;

    else if (tn === $.PLAINTEXT)
        this.tokenizer.state = Tokenizer.MODE.PLAINTEXT;
};

//Tree mutation
Parser.prototype._setDocumentType = function (token) {
    this.treeAdapter.setDocumentType(this.document, token.name, token.publicId, token.systemId);
};

Parser.prototype._attachElementToTree = function (element) {
    if (this._shouldFosterParentOnInsertion())
        this._fosterParentElement(element);

    else {
        var parent = this.openElements.currentTmplContent || this.openElements.current;

        this.treeAdapter.appendChild(parent, element);
    }
};

Parser.prototype._appendElement = function (token, namespaceURI) {
    var element = this.treeAdapter.createElement(token.tagName, namespaceURI, token.attrs);

    this._attachElementToTree(element);
};

Parser.prototype._insertElement = function (token, namespaceURI) {
    var element = this.treeAdapter.createElement(token.tagName, namespaceURI, token.attrs);

    this._attachElementToTree(element);
    this.openElements.push(element);
};

Parser.prototype._insertTemplate = function (token) {
    var tmpl = this.treeAdapter.createElement(token.tagName, NS.HTML, token.attrs),
        content = this.treeAdapter.createDocumentFragment();

    this.treeAdapter.appendChild(tmpl, content);
    this._attachElementToTree(tmpl);
    this.openElements.push(tmpl);
};

Parser.prototype._insertFakeRootElement = function () {
    var element = this.treeAdapter.createElement($.HTML, NS.HTML, []);

    this.treeAdapter.appendChild(this.openElements.current, element);
    this.openElements.push(element);
};

Parser.prototype._appendCommentNode = function (token, parent) {
    var commentNode = this.treeAdapter.createCommentNode(token.data);

    this.treeAdapter.appendChild(parent, commentNode);
};

Parser.prototype._insertCharacters = function (token) {
    if (this._shouldFosterParentOnInsertion())
        this._fosterParentText(token.chars);

    else {
        var parent = this.openElements.currentTmplContent || this.openElements.current;

        this.treeAdapter.insertText(parent, token.chars);
    }
};

Parser.prototype._adoptNodes = function (donor, recipient) {
    while (true) {
        var child = this.treeAdapter.getFirstChild(donor);

        if (!child)
            break;

        this.treeAdapter.detachNode(child);
        this.treeAdapter.appendChild(recipient, child);
    }
};

//Token processing
Parser.prototype._shouldProcessTokenInForeignContent = function (token) {
    var current = this._getAdjustedCurrentElement();

    if (!current || current === this.document)
        return false;

    var ns = this.treeAdapter.getNamespaceURI(current);

    if (ns === NS.HTML)
        return false;

    if (this.treeAdapter.getTagName(current) === $.ANNOTATION_XML && ns === NS.MATHML &&
        token.type === Tokenizer.START_TAG_TOKEN && token.tagName === $.SVG) {
        return false;
    }

    var isCharacterToken = token.type === Tokenizer.CHARACTER_TOKEN ||
                           token.type === Tokenizer.NULL_CHARACTER_TOKEN ||
                           token.type === Tokenizer.WHITESPACE_CHARACTER_TOKEN,
        isMathMLTextStartTag = token.type === Tokenizer.START_TAG_TOKEN &&
                               token.tagName !== $.MGLYPH &&
                               token.tagName !== $.MALIGNMARK;

    if ((isMathMLTextStartTag || isCharacterToken) && this._isMathMLTextIntegrationPoint(current))
        return false;

    if ((token.type === Tokenizer.START_TAG_TOKEN || isCharacterToken) && this._isHtmlIntegrationPoint(current))
        return false;

    return token.type !== Tokenizer.EOF_TOKEN;
};

Parser.prototype._processToken = function (token) {
    _[this.insertionMode][token.type](this, token);
};

Parser.prototype._processTokenInBodyMode = function (token) {
    _[IN_BODY_MODE][token.type](this, token);
};

Parser.prototype._processTokenInForeignContent = function (token) {
    if (token.type === Tokenizer.CHARACTER_TOKEN)
        characterInForeignContent(this, token);

    else if (token.type === Tokenizer.NULL_CHARACTER_TOKEN)
        nullCharacterInForeignContent(this, token);

    else if (token.type === Tokenizer.WHITESPACE_CHARACTER_TOKEN)
        insertCharacters(this, token);

    else if (token.type === Tokenizer.COMMENT_TOKEN)
        appendComment(this, token);

    else if (token.type === Tokenizer.START_TAG_TOKEN)
        startTagInForeignContent(this, token);

    else if (token.type === Tokenizer.END_TAG_TOKEN)
        endTagInForeignContent(this, token);
};

Parser.prototype._processFakeStartTagWithAttrs = function (tagName, attrs) {
    var fakeToken = this.tokenizer.buildStartTagToken(tagName);

    fakeToken.attrs = attrs;
    this._processToken(fakeToken);
};

Parser.prototype._processFakeStartTag = function (tagName) {
    var fakeToken = this.tokenizer.buildStartTagToken(tagName);

    this._processToken(fakeToken);
    return fakeToken;
};

Parser.prototype._processFakeEndTag = function (tagName) {
    var fakeToken = this.tokenizer.buildEndTagToken(tagName);

    this._processToken(fakeToken);
    return fakeToken;
};

//Integration points
Parser.prototype._isMathMLTextIntegrationPoint = function (element) {
    var tn = this.treeAdapter.getTagName(element),
        ns = this.treeAdapter.getNamespaceURI(element);

    return ForeignContent.isMathMLTextIntegrationPoint(tn, ns);
};

Parser.prototype._isHtmlIntegrationPoint = function (element) {
    var tn = this.treeAdapter.getTagName(element),
        ns = this.treeAdapter.getNamespaceURI(element),
        attrs = this.treeAdapter.getAttrList(element);

    return ForeignContent.isHtmlIntegrationPoint(tn, ns, attrs);
};

//Active formatting elements reconstruction
Parser.prototype._reconstructActiveFormattingElements = function () {
    var listLength = this.activeFormattingElements.length;

    if (listLength) {
        var unopenIdx = listLength,
            entry = null;

        do {
            unopenIdx--;
            entry = this.activeFormattingElements.entries[unopenIdx];

            if (entry.type === FormattingElementList.MARKER_ENTRY || this.openElements.contains(entry.element)) {
                unopenIdx++;
                break;
            }
        } while (unopenIdx > 0);

        for (var i = unopenIdx; i < listLength; i++) {
            entry = this.activeFormattingElements.entries[i];
            this._insertElement(entry.token, this.treeAdapter.getNamespaceURI(entry.element));
            entry.element = this.openElements.current;
        }
    }
};

//Close elements
Parser.prototype._closeTableCell = function () {
    if (this.openElements.hasInTableScope($.TD))
        this._processFakeEndTag($.TD);

    else
        this._processFakeEndTag($.TH);
};

Parser.prototype._closePElement = function () {
    this.openElements.generateImpliedEndTagsWithExclusion($.P);
    this.openElements.popUntilTagNamePopped($.P);
};

//Insertion modes
Parser.prototype._resetInsertionMode = function () {
    for (var i = this.openElements.stackTop, last = false; i >= 0; i--) {
        var element = this.openElements.items[i];

        if (i === 0) {
            last = true;

            if (this.fragmentContext)
                element = this.fragmentContext;
        }

        var tn = this.treeAdapter.getTagName(element),
            newInsertionMode = INSERTION_MODE_RESET_MAP[tn];

        if (newInsertionMode) {
            this.insertionMode = newInsertionMode;
            break;
        }

        else if (!last && (tn === $.TD || tn === $.TH)) {
            this.insertionMode = IN_CELL_MODE;
            break;
        }

        else if (!last && tn === $.HEAD) {
            this.insertionMode = IN_HEAD_MODE;
            break;
        }

        else if (tn === $.SELECT) {
            this._resetInsertionModeForSelect(i);
            break;
        }

        else if (tn === $.TEMPLATE) {
            this.insertionMode = this.currentTmplInsertionMode;
            break;
        }

        else if (tn === $.HTML) {
            this.insertionMode = this.headElement ? AFTER_HEAD_MODE : BEFORE_HEAD_MODE;
            break;
        }

        else if (last) {
            this.insertionMode = IN_BODY_MODE;
            break;
        }
    }
};

Parser.prototype._resetInsertionModeForSelect = function (selectIdx) {
    if (selectIdx > 0) {
        for (var i = selectIdx - 1; i > 0; i--) {
            var ancestor = this.openElements.items[i],
                tn = this.treeAdapter.getTagName(ancestor);

            if (tn === $.TEMPLATE)
                break;

            else if (tn === $.TABLE) {
                this.insertionMode = IN_SELECT_IN_TABLE_MODE;
                return;
            }
        }
    }

    this.insertionMode = IN_SELECT_MODE;
};

Parser.prototype._pushTmplInsertionMode = function (mode) {
    this.tmplInsertionModeStack.push(mode);
    this.tmplInsertionModeStackTop++;
    this.currentTmplInsertionMode = mode;
};

Parser.prototype._popTmplInsertionMode = function () {
    this.tmplInsertionModeStack.pop();
    this.tmplInsertionModeStackTop--;
    this.currentTmplInsertionMode = this.tmplInsertionModeStack[this.tmplInsertionModeStackTop];
};

//Foster parenting
Parser.prototype._isElementCausesFosterParenting = function (element) {
    var tn = this.treeAdapter.getTagName(element);

    return tn === $.TABLE || tn === $.TBODY || tn === $.TFOOT || tn == $.THEAD || tn === $.TR;
};

Parser.prototype._shouldFosterParentOnInsertion = function () {
    return this.fosterParentingEnabled && this._isElementCausesFosterParenting(this.openElements.current);
};

Parser.prototype._findFosterParentingLocation = function () {
    var location = {
        parent: null,
        beforeElement: null
    };

    for (var i = this.openElements.stackTop; i >= 0; i--) {
        var openElement = this.openElements.items[i],
            tn = this.treeAdapter.getTagName(openElement),
            ns = this.treeAdapter.getNamespaceURI(openElement);

        if (tn === $.TEMPLATE && ns === NS.HTML) {
            location.parent = this.treeAdapter.getChildNodes(openElement)[0];
            break;
        }

        else if (tn === $.TABLE) {
            location.parent = this.treeAdapter.getParentNode(openElement);

            if (location.parent)
                location.beforeElement = openElement;
            else
                location.parent = this.openElements.items[i - 1];

            break;
        }
    }

    if (!location.parent)
        location.parent = this.openElements.items[0];

    return location;
};

Parser.prototype._fosterParentElement = function (element) {
    var location = this._findFosterParentingLocation();

    if (location.beforeElement)
        this.treeAdapter.insertBefore(location.parent, element, location.beforeElement);
    else
        this.treeAdapter.appendChild(location.parent, element);
};

Parser.prototype._fosterParentText = function (chars) {
    var location = this._findFosterParentingLocation();

    if (location.beforeElement)
        this.treeAdapter.insertTextBefore(location.parent, chars, location.beforeElement);
    else
        this.treeAdapter.insertText(location.parent, chars);
};

//Special elements
Parser.prototype._isSpecialElement = function (element) {
    var tn = this.treeAdapter.getTagName(element),
        ns = this.treeAdapter.getNamespaceURI(element);

    return HTML.SPECIAL_ELEMENTS[ns][tn];
};

//Adoption agency algorithm
//(see: http://www.whatwg.org/specs/web-apps/current-work/multipage/tree-construction.html#adoptionAgency)
//------------------------------------------------------------------

//Steps 5-8 of the algorithm
function aaObtainFormattingElementEntry(p, token) {
    var formattingElementEntry = p.activeFormattingElements.getElementEntryInScopeWithTagName(token.tagName);

    if (formattingElementEntry) {
        if (!p.openElements.contains(formattingElementEntry.element)) {
            p.activeFormattingElements.removeEntry(formattingElementEntry);
            formattingElementEntry = null;
        }

        else if (!p.openElements.hasInScope(token.tagName))
            formattingElementEntry = null;
    }

    else
        genericEndTagInBody(p, token);

    return formattingElementEntry;
}

//Steps 9 and 10 of the algorithm
function aaObtainFurthestBlock(p, formattingElementEntry) {
    var furthestBlock = null;

    for (var i = p.openElements.stackTop; i >= 0; i--) {
        var element = p.openElements.items[i];

        if (element === formattingElementEntry.element)
            break;

        if (p._isSpecialElement(element))
            furthestBlock = element;
    }

    if (!furthestBlock) {
        p.openElements.popUntilElementPopped(formattingElementEntry.element);
        p.activeFormattingElements.removeEntry(formattingElementEntry);
    }

    return furthestBlock;
}

//Step 13 of the algorithm
function aaInnerLoop(p, furthestBlock, formattingElement) {
    var element = null,
        lastElement = furthestBlock,
        nextElement = p.openElements.getCommonAncestor(furthestBlock);

    for (var i = 0; i < AA_INNER_LOOP_ITER; i++) {
        element = nextElement;

        //NOTE: store next element for the next loop iteration (it may be deleted from the stack by step 9.5)
        nextElement = p.openElements.getCommonAncestor(element);

        var elementEntry = p.activeFormattingElements.getElementEntry(element);

        if (!elementEntry) {
            p.openElements.remove(element);
            continue;
        }

        if (element === formattingElement)
            break;

        element = aaRecreateElementFromEntry(p, elementEntry);

        if (lastElement === furthestBlock)
            p.activeFormattingElements.bookmark = elementEntry;

        p.treeAdapter.detachNode(lastElement);
        p.treeAdapter.appendChild(element, lastElement);
        lastElement = element;
    }

    return lastElement;
}

//Step 13.7 of the algorithm
function aaRecreateElementFromEntry(p, elementEntry) {
    var ns = p.treeAdapter.getNamespaceURI(elementEntry.element),
        newElement = p.treeAdapter.createElement(elementEntry.token.tagName, ns, elementEntry.token.attrs);

    p.openElements.replace(elementEntry.element, newElement);
    elementEntry.element = newElement;

    return newElement;
}

//Step 14 of the algorithm
function aaInsertLastNodeInCommonAncestor(p, commonAncestor, lastElement) {
    if (p._isElementCausesFosterParenting(commonAncestor))
        p._fosterParentElement(lastElement);

    else {
        var tn = p.treeAdapter.getTagName(commonAncestor),
            ns = p.treeAdapter.getNamespaceURI(commonAncestor);

        if (tn === $.TEMPLATE && ns === NS.HTML)
            commonAncestor = p.treeAdapter.getChildNodes(commonAncestor)[0];

        p.treeAdapter.appendChild(commonAncestor, lastElement);
    }
}

//Steps 15-19 of the algorithm
function aaReplaceFormattingElement(p, furthestBlock, formattingElementEntry) {
    var ns = p.treeAdapter.getNamespaceURI(formattingElementEntry.element),
        token = formattingElementEntry.token,
        newElement = p.treeAdapter.createElement(token.tagName, ns, token.attrs);

    p._adoptNodes(furthestBlock, newElement);
    p.treeAdapter.appendChild(furthestBlock, newElement);

    p.activeFormattingElements.insertElementAfterBookmark(newElement, formattingElementEntry.token);
    p.activeFormattingElements.removeEntry(formattingElementEntry);

    p.openElements.remove(formattingElementEntry.element);
    p.openElements.insertAfter(furthestBlock, newElement);
}

//Algorithm entry point
function callAdoptionAgency(p, token) {
    for (var i = 0; i < AA_OUTER_LOOP_ITER; i++) {
        var formattingElementEntry = aaObtainFormattingElementEntry(p, token, formattingElementEntry);

        if (!formattingElementEntry)
            break;

        var furthestBlock = aaObtainFurthestBlock(p, formattingElementEntry);

        if (!furthestBlock)
            break;

        p.activeFormattingElements.bookmark = formattingElementEntry;

        var lastElement = aaInnerLoop(p, furthestBlock, formattingElementEntry.element),
            commonAncestor = p.openElements.getCommonAncestor(formattingElementEntry.element);

        p.treeAdapter.detachNode(lastElement);
        aaInsertLastNodeInCommonAncestor(p, commonAncestor, lastElement);
        aaReplaceFormattingElement(p, furthestBlock, formattingElementEntry);
    }
}


//Generic token handlers
//------------------------------------------------------------------
function ignoreToken(p, token) {
    //NOTE: do nothing =)
}

function appendComment(p, token) {
    p._appendCommentNode(token, p.openElements.currentTmplContent || p.openElements.current)
}

function appendCommentToRootHtmlElement(p, token) {
    p._appendCommentNode(token, p.openElements.items[0]);
}

function appendCommentToDocument(p, token) {
    p._appendCommentNode(token, p.document);
}

function insertCharacters(p, token) {
    p._insertCharacters(token);
}

function stopParsing(p, token) {
    p.stopped = true;
}

//12.2.5.4.1 The "initial" insertion mode
//------------------------------------------------------------------
function doctypeInInitialMode(p, token) {
    p._setDocumentType(token);

    if (token.forceQuirks || Doctype.isQuirks(token.name, token.publicId, token.systemId))
        p.treeAdapter.setQuirksMode(p.document);

    p.insertionMode = BEFORE_HTML_MODE;
}

function tokenInInitialMode(p, token) {
    p.treeAdapter.setQuirksMode(p.document);
    p.insertionMode = BEFORE_HTML_MODE;
    p._processToken(token);
}


//12.2.5.4.2 The "before html" insertion mode
//------------------------------------------------------------------
function startTagBeforeHtml(p, token) {
    if (token.tagName === $.HTML) {
        p._insertElement(token, NS.HTML);
        p.insertionMode = BEFORE_HEAD_MODE;
    }

    else
        tokenBeforeHtml(p, token);
}

function endTagBeforeHtml(p, token) {
    var tn = token.tagName;

    if (tn === $.HTML || tn === $.HEAD || tn === $.BODY || tn === $.BR)
        tokenBeforeHtml(p, token);
}

function tokenBeforeHtml(p, token) {
    p._insertFakeRootElement();
    p.insertionMode = BEFORE_HEAD_MODE;
    p._processToken(token);
}


//12.2.5.4.3 The "before head" insertion mode
//------------------------------------------------------------------
function startTagBeforeHead(p, token) {
    var tn = token.tagName;

    if (tn === $.HTML)
        startTagInBody(p, token);

    else if (tn === $.HEAD) {
        p._insertElement(token, NS.HTML);
        p.headElement = p.openElements.current;
        p.insertionMode = IN_HEAD_MODE;
    }

    else
        tokenBeforeHead(p, token);
}

function endTagBeforeHead(p, token) {
    var tn = token.tagName;

    if (tn === $.HEAD || tn === $.BODY || tn === $.HTML || tn === $.BR)
        tokenBeforeHead(p, token);
}

function tokenBeforeHead(p, token) {
    p._processFakeStartTag($.HEAD);
    p._processToken(token);
}


//12.2.5.4.4 The "in head" insertion mode
//------------------------------------------------------------------
function startTagInHead(p, token) {
    var tn = token.tagName;

    if (tn === $.HTML)
        startTagInBody(p, token);

    else if (tn === $.BASE || tn === $.BASEFONT || tn === $.BGSOUND ||
             tn === $.COMMAND || tn === $.LINK || tn === $.META) {
        p._appendElement(token, NS.HTML);
    }

    else if (tn === $.TITLE)
        p._switchToTextParsing(token, Tokenizer.MODE.RCDATA);

    //NOTE: here we assume that we always act as an interactive user agent with enabled scripting, so we parse
    //<noscript> as a rawtext.
    else if (tn === $.NOSCRIPT || tn === $.NOFRAMES || tn === $.STYLE)
        p._switchToTextParsing(token, Tokenizer.MODE.RAWTEXT);

    else if (tn === $.SCRIPT)
        p._switchToTextParsing(token, Tokenizer.MODE.SCRIPT_DATA);

    else if (tn === $.TEMPLATE) {
        p._insertTemplate(token, NS.HTML);
        p.activeFormattingElements.insertMarker();
        p.framesetOk = false;
        p.insertionMode = IN_TEMPLATE_MODE;
        p._pushTmplInsertionMode(IN_TEMPLATE_MODE);
    }

    else if (tn !== $.HEAD)
        tokenInHead(p, token);
}

function endTagInHead(p, token) {
    var tn = token.tagName;

    if (tn === $.HEAD) {
        p.openElements.pop();
        p.insertionMode = AFTER_HEAD_MODE;
    }

    else if (tn === $.BODY || tn === $.BR || tn === $.HTML)
        tokenInHead(p, token);

    else if (tn === $.TEMPLATE && p.openElements.tmplCount > 0) {
        p.openElements.generateImpliedEndTags();
        p.openElements.popUntilTemplatePopped();
        p.activeFormattingElements.clearToLastMarker();
        p._popTmplInsertionMode();
        p._resetInsertionMode();
    }
}

function tokenInHead(p, token) {
    p._processFakeEndTag($.HEAD);
    p._processToken(token);
}


//12.2.5.4.6 The "after head" insertion mode
//------------------------------------------------------------------
function startTagAfterHead(p, token) {
    var tn = token.tagName;

    if (tn === $.HTML)
        startTagInBody(p, token);

    else if (tn === $.BODY) {
        p._insertElement(token, NS.HTML);
        p.framesetOk = false;
        p.insertionMode = IN_BODY_MODE;
    }

    else if (tn === $.FRAMESET) {
        p._insertElement(token, NS.HTML);
        p.insertionMode = IN_FRAMESET_MODE;
    }

    else if (tn === $.BASE || tn === $.BASEFONT || tn === $.BGSOUND || tn === $.LINK || tn === $.META ||
             tn === $.NOFRAMES || tn === $.SCRIPT || tn === $.STYLE || tn === $.TEMPLATE || tn === $.TITLE) {
        p.openElements.push(p.headElement);
        startTagInHead(p, token);
        p.openElements.remove(p.headElement);
    }

    else if (tn !== $.HEAD)
        tokenAfterHead(p, token);
}

function endTagAfterHead(p, token) {
    var tn = token.tagName;

    if (tn === $.BODY || tn === $.HTML || tn === $.BR)
        tokenAfterHead(p, token);

    else if (tn === $.TEMPLATE)
        endTagInHead(p, token);
}

function tokenAfterHead(p, token) {
    p._processFakeStartTag($.BODY);
    p.framesetOk = true;
    p._processToken(token);
}


//12.2.5.4.7 The "in body" insertion mode
//------------------------------------------------------------------
function whitespaceCharacterInBody(p, token) {
    p._reconstructActiveFormattingElements();
    p._insertCharacters(token);
}

function characterInBody(p, token) {
    p._reconstructActiveFormattingElements();
    p._insertCharacters(token);
    p.framesetOk = false;
}

function htmlStartTagInBody(p, token) {
    if (p.openElements.tmplCount === 0)
        p.treeAdapter.adoptAttributes(p.openElements.items[0], token.attrs);
}

function bodyStartTagInBody(p, token) {
    var bodyElement = p.openElements.tryPeekProperlyNestedBodyElement();

    if (bodyElement && p.openElements.tmplCount === 0) {
        p.framesetOk = false;
        p.treeAdapter.adoptAttributes(bodyElement, token.attrs);
    }
}

function framesetStartTagInBody(p, token) {
    var bodyElement = p.openElements.tryPeekProperlyNestedBodyElement();

    if (p.framesetOk && bodyElement) {
        p.treeAdapter.detachNode(bodyElement);
        p.openElements.popAllUpToHtmlElement();
        p._insertElement(token, NS.HTML);
        p.insertionMode = IN_FRAMESET_MODE;
    }
}

function addressStartTagInBody(p, token) {
    if (p.openElements.hasInButtonScope($.P))
        p._closePElement();

    p._insertElement(token, NS.HTML);
}

function numberedHeaderStartTagInBody(p, token) {
    if (p.openElements.hasInButtonScope($.P))
        p._closePElement();

    var tn = p.openElements.currentTagName;

    if (tn === $.H1 || tn === $.H2 || tn === $.H3 || tn === $.H4 || tn === $.H5 || tn === $.H6)
        p.openElements.pop();

    p._insertElement(token, NS.HTML);
}

function preStartTagInBody(p, token) {
    if (p.openElements.hasInButtonScope($.P))
        p._closePElement();

    p._insertElement(token, NS.HTML);
    //NOTE: If the next token is a U+000A LINE FEED (LF) character token, then ignore that token and move
    //on to the next one. (Newlines at the start of pre blocks are ignored as an authoring convenience.)
    p.skipNextNewLine = true;
    p.framesetOk = false;
}

function formStartTagInBody(p, token) {
    var inTemplate = p.openElements.tmplCount > 0;

    if (!p.formElement || inTemplate) {
        if (p.openElements.hasInButtonScope($.P))
            p._closePElement();

        p._insertElement(token, NS.HTML);

        if (!inTemplate)
            p.formElement = p.openElements.current;
    }
}

function listItemStartTagInBody(p, token) {
    p.framesetOk = false;

    for (var i = p.openElements.stackTop; i >= 0; i--) {
        var element = p.openElements.items[i],
            tn = p.treeAdapter.getTagName(element);

        if ((token.tagName === $.LI && tn === $.LI) ||
            ((token.tagName === $.DD || token.tagName === $.DT) && (tn === $.DD || tn == $.DT))) {
            p._processFakeEndTag(tn);
            break;
        }

        if (tn !== $.ADDRESS && tn !== $.DIV && tn !== $.P && p._isSpecialElement(element))
            break;
    }

    if (p.openElements.hasInButtonScope($.P))
        p._closePElement();

    p._insertElement(token, NS.HTML);
}

function plaintextStartTagInBody(p, token) {
    if (p.openElements.hasInButtonScope($.P))
        p._closePElement();

    p._insertElement(token, NS.HTML);
    p.tokenizer.state = Tokenizer.MODE.PLAINTEXT;
}

function buttonStartTagInBody(p, token) {
    if (p.openElements.hasInScope($.BUTTON)) {
        p._processFakeEndTag($.BUTTON);
        buttonStartTagInBody(p, token);
    }

    else {
        p._reconstructActiveFormattingElements();
        p._insertElement(token, NS.HTML);
        p.framesetOk = false;
    }
}

function aStartTagInBody(p, token) {
    var activeElementEntry = p.activeFormattingElements.getElementEntryInScopeWithTagName($.A);

    if (activeElementEntry) {
        p._processFakeEndTag($.A);
        p.openElements.remove(activeElementEntry.element);
        p.activeFormattingElements.removeEntry(activeElementEntry);
    }

    p._reconstructActiveFormattingElements();
    p._insertElement(token, NS.HTML);
    p.activeFormattingElements.pushElement(p.openElements.current, token);
}

function bStartTagInBody(p, token) {
    p._reconstructActiveFormattingElements();
    p._insertElement(token, NS.HTML);
    p.activeFormattingElements.pushElement(p.openElements.current, token);
}

function nobrStartTagInBody(p, token) {
    p._reconstructActiveFormattingElements();

    if (p.openElements.hasInScope($.NOBR)) {
        p._processFakeEndTag($.NOBR);
        p._reconstructActiveFormattingElements();
    }

    p._insertElement(token, NS.HTML);
    p.activeFormattingElements.pushElement(p.openElements.current, token);
}

function appletStartTagInBody(p, token) {
    p._reconstructActiveFormattingElements();
    p._insertElement(token, NS.HTML);
    p.activeFormattingElements.insertMarker();
    p.framesetOk = false;
}

function tableStartTagInBody(p, token) {
    if (!p.treeAdapter.isQuirksMode(p.document) && p.openElements.hasInButtonScope($.P))
        p._closePElement();

    p._insertElement(token, NS.HTML);
    p.framesetOk = false;
    p.insertionMode = IN_TABLE_MODE;
}

function areaStartTagInBody(p, token) {
    p._reconstructActiveFormattingElements();
    p._appendElement(token, NS.HTML);
    p.framesetOk = false;
}

function inputStartTagInBody(p, token) {
    p._reconstructActiveFormattingElements();
    p._appendElement(token, NS.HTML);

    var inputType = Tokenizer.getTokenAttr(token, ATTRS.TYPE);

    if (!inputType || inputType.toLowerCase() !== HIDDEN_INPUT_TYPE)
        p.framesetOk = false;

}

function paramStartTagInBody(p, token) {
    p._appendElement(token, NS.HTML);
}

function hrStartTagInBody(p, token) {
    if (p.openElements.hasInButtonScope($.P))
        p._closePElement();

    p._appendElement(token, NS.HTML);
    p.framesetOk = false;
}

function imageStartTagInBody(p, token) {
    token.tagName = $.IMG;
    areaStartTagInBody(p, token);
}

function isindexStartTagInBody(p, token) {
    if (!p.formElement || p.openElements.tmplCount > 0) {
        p._processFakeStartTagWithAttrs($.FORM, getSearchableIndexFormAttrs(token));
        p._processFakeStartTag($.HR);
        p._processFakeStartTag($.LABEL);
        p.treeAdapter.insertText(p.openElements.current, getSearchableIndexLabelText(token));
        p._processFakeStartTagWithAttrs($.INPUT, getSearchableIndexInputAttrs(token));
        p._processFakeEndTag($.LABEL);
        p._processFakeStartTag($.HR);
        p._processFakeEndTag($.FORM);
    }
}

function textareaStartTagInBody(p, token) {
    p._insertElement(token, NS.HTML);
    //NOTE: If the next token is a U+000A LINE FEED (LF) character token, then ignore that token and move
    //on to the next one. (Newlines at the start of textarea elements are ignored as an authoring convenience.)
    p.skipNextNewLine = true;
    p.tokenizer.state = Tokenizer.MODE.RCDATA;
    p.originalInsertionMode = p.insertionMode;
    p.framesetOk = false;
    p.insertionMode = TEXT_MODE;
}

function xmpStartTagInBody(p, token) {
    if (p.openElements.hasInButtonScope($.P))
        p._closePElement();

    p._reconstructActiveFormattingElements();
    p.framesetOk = false;
    p._switchToTextParsing(token, Tokenizer.MODE.RAWTEXT);
}

function iframeStartTagInBody(p, token) {
    p.framesetOk = false;
    p._switchToTextParsing(token, Tokenizer.MODE.RAWTEXT);
}

//NOTE: here we assume that we always act as an user agent with enabled plugins, so we parse
//<noembed> as a rawtext.
function noembedStartTagInBody(p, token) {
    p._switchToTextParsing(token, Tokenizer.MODE.RAWTEXT);
}

function selectStartTagInBody(p, token) {
    p._reconstructActiveFormattingElements();
    p._insertElement(token, NS.HTML);
    p.framesetOk = false;

    if (p.insertionMode === IN_TABLE_MODE || p.insertionMode === IN_CAPTION_MODE ||
        p.insertionMode === IN_TABLE_BODY_MODE || p.insertionMode === IN_ROW_MODE ||
        p.insertionMode === IN_CELL_MODE) {
        p.insertionMode = IN_SELECT_IN_TABLE_MODE;
    }

    else
        p.insertionMode = IN_SELECT_MODE;
}

function optgroupStartTagInBody(p, token) {
    if (p.openElements.currentTagName === $.OPTION)
        p._processFakeEndTag($.OPTION);

    p._reconstructActiveFormattingElements();
    p._insertElement(token, NS.HTML);
}

function rpStartTagInBody(p, token) {
    if (p.openElements.hasInScope($.RUBY))
        p.openElements.generateImpliedEndTags();

    p._insertElement(token, NS.HTML);
}

function menuitemStartTagInBody(p, token) {
    p._appendElement(token, NS.HTML);
}

function mathStartTagInBody(p, token) {
    p._reconstructActiveFormattingElements();

    ForeignContent.adjustTokenMathMLAttrs(token);
    ForeignContent.adjustTokenXMLAttrs(token);

    if (token.selfClosing)
        p._appendElement(token, NS.MATHML);
    else
        p._insertElement(token, NS.MATHML);
}

function svgStartTagInBody(p, token) {
    p._reconstructActiveFormattingElements();

    ForeignContent.adjustTokenSVGAttrs(token);
    ForeignContent.adjustTokenXMLAttrs(token);

    if (token.selfClosing)
        p._appendElement(token, NS.SVG);
    else
        p._insertElement(token, NS.SVG);
}

function genericStartTagInBody(p, token) {
    p._reconstructActiveFormattingElements();
    p._insertElement(token, NS.HTML);
}

//OPTIMIZATION: Integer comparisons are low-cost, so we can use very fast tag name length filters here.
//It's faster than using dictionary.
function startTagInBody(p, token) {
    var tn = token.tagName;

    switch (tn.length) {
        case 1:
            if (tn === $.I || tn === $.S || tn === $.B || tn === $.U)
                bStartTagInBody(p, token);

            else if (tn === $.P)
                addressStartTagInBody(p, token);

            else if (tn === $.A)
                aStartTagInBody(p, token);

            else
                genericStartTagInBody(p, token);

            break;

        case 2:
            if (tn === $.DL || tn === $.OL || tn === $.UL)
                addressStartTagInBody(p, token);

            else if (tn === $.H1 || tn === $.H2 || tn === $.H3 || tn === $.H4 || tn === $.H5 || tn === $.H6)
                numberedHeaderStartTagInBody(p, token);

            else if (tn === $.LI || tn === $.DD || tn === $.DT)
                listItemStartTagInBody(p, token);

            else if (tn === $.EM || tn === $.TT)
                bStartTagInBody(p, token);

            else if (tn === $.BR)
                areaStartTagInBody(p, token);

            else if (tn === $.HR)
                hrStartTagInBody(p, token);

            else if (tn === $.RP || tn === $.RT)
                rpStartTagInBody(p, token);

            else if (tn !== $.TH && tn !== $.TD && tn !== $.TR)
                genericStartTagInBody(p, token);

            break;

        case 3:
            if (tn === $.DIV || tn === $.DIR || tn === $.NAV)
                addressStartTagInBody(p, token);

            else if (tn === $.PRE)
                preStartTagInBody(p, token);

            else if (tn === $.BIG)
                bStartTagInBody(p, token);

            else if (tn === $.IMG || tn === $.WBR)
                areaStartTagInBody(p, token);

            else if (tn === $.XMP)
                xmpStartTagInBody(p, token);

            else if (tn === $.SVG)
                svgStartTagInBody(p, token);

            else if (tn !== $.COL)
                genericStartTagInBody(p, token);

            break;

        case 4:
            if (tn === $.HTML)
                htmlStartTagInBody(p, token);

            else if (tn === $.BASE || tn === $.LINK || tn === $.META)
                startTagInHead(p, token);

            else if (tn === $.BODY)
                bodyStartTagInBody(p, token);

            else if (tn === $.MAIN || tn === $.MENU)
                addressStartTagInBody(p, token);

            else if (tn === $.FORM)
                formStartTagInBody(p, token);

            else if (tn === $.CODE || tn === $.FONT)
                bStartTagInBody(p, token);

            else if (tn === $.NOBR)
                nobrStartTagInBody(p, token);

            else if (tn === $.AREA)
                areaStartTagInBody(p, token);

            else if (tn === $.MATH)
                mathStartTagInBody(p, token);

            else if (tn !== $.HEAD)
                genericStartTagInBody(p, token);

            break;

        case 5:
            if (tn === $.STYLE || tn === $.TITLE)
                startTagInHead(p, token);

            else if (tn === $.ASIDE)
                addressStartTagInBody(p, token);

            else if (tn === $.SMALL)
                bStartTagInBody(p, token);

            else if (tn === $.TABLE)
                tableStartTagInBody(p, token);

            else if (tn === $.EMBED)
                areaStartTagInBody(p, token);

            else if (tn === $.INPUT)
                inputStartTagInBody(p, token);

            else if (tn === $.PARAM || tn === $.TRACK)
                paramStartTagInBody(p, token);

            else if (tn === $.IMAGE)
                imageStartTagInBody(p, token);

            else if (tn !== $.FRAME && tn !== $.TBODY && tn !== $.TFOOT && tn !== $.THEAD)
                genericStartTagInBody(p, token);

            break;

        case 6:
            if (tn === $.SCRIPT)
                startTagInHead(p, token);

            else if (tn === $.CENTER || tn === $.FIGURE || tn === $.FOOTER || tn === $.HEADER || tn === $.HGROUP)
                addressStartTagInBody(p, token);

            else if (tn === $.BUTTON)
                buttonStartTagInBody(p, token);

            else if (tn === $.STRIKE || tn === $.STRONG)
                bStartTagInBody(p, token);

            else if (tn === $.APPLET || tn === $.OBJECT)
                appletStartTagInBody(p, token);

            else if (tn === $.KEYGEN)
                areaStartTagInBody(p, token);

            else if (tn === $.SOURCE)
                paramStartTagInBody(p, token);

            else if (tn === $.IFRAME)
                iframeStartTagInBody(p, token);

            else if (tn === $.SELECT)
                selectStartTagInBody(p, token);

            else if (tn === $.OPTION)
                optgroupStartTagInBody(p, token);

            else
                genericStartTagInBody(p, token);

            break;

        case 7:
            if (tn === $.BGSOUND || tn === $.COMMAND)
                startTagInHead(p, token);

            else if (tn === $.DETAILS || tn === $.ADDRESS || tn === $.ARTICLE || tn === $.SECTION || tn === $.SUMMARY)
                addressStartTagInBody(p, token);

            else if (tn === $.LISTING)
                preStartTagInBody(p, token);

            else if (tn === $.MARQUEE)
                appletStartTagInBody(p, token);

            else if (tn === $.ISINDEX)
                isindexStartTagInBody(p, token);

            else if (tn === $.NOEMBED)
                noembedStartTagInBody(p, token);

            else if (tn !== $.CAPTION)
                genericStartTagInBody(p, token);

            break;

        case 8:
            if (tn === $.BASEFONT || tn === $.MENUITEM)
                menuitemStartTagInBody(p, token);

            else if (tn === $.FRAMESET)
                framesetStartTagInBody(p, token);

            else if (tn === $.FIELDSET)
                addressStartTagInBody(p, token);

            else if (tn === $.TEXTAREA)
                textareaStartTagInBody(p, token);

            else if (tn === $.TEMPLATE)
                startTagInHead(p, token);

            else if (tn === $.NOSCRIPT)
                noembedStartTagInBody(p, token);

            else if (tn === $.OPTGROUP)
                optgroupStartTagInBody(p, token);

            else if (tn !== $.COLGROUP)
                genericStartTagInBody(p, token);

            break;

        case 9:
            if (tn === $.PLAINTEXT)
                plaintextStartTagInBody(p, token);

            else
                genericStartTagInBody(p, token);

            break;

        case 10:
            if (tn === $.BLOCKQUOTE || tn === $.FIGCAPTION)
                addressStartTagInBody(p, token);

            else
                genericStartTagInBody(p, token);

            break;

        default:
            genericStartTagInBody(p, token);
    }
}

function bodyEndTagInBody(p, token) {
    if (p.openElements.hasInScope($.BODY))
        p.insertionMode = AFTER_BODY_MODE;

    else
        token.ignored = true;
}

function htmlEndTagInBody(p, token) {
    var fakeToken = p._processFakeEndTag($.BODY);

    if (!fakeToken.ignored)
        p._processToken(token);
}

function addressEndTagInBody(p, token) {
    var tn = token.tagName;

    if (p.openElements.hasInScope(tn)) {
        p.openElements.generateImpliedEndTags();
        p.openElements.popUntilTagNamePopped(tn);
    }
}

function formEndTagInBody(p, token) {
    var inTemplate = p.openElements.tmplCount > 0,
        formElement = p.formElement;

    if (!inTemplate)
        p.formElement = null;

    if ((formElement || inTemplate) && p.openElements.hasInScope($.FORM)) {
        p.openElements.generateImpliedEndTags();

        if (inTemplate)
            p.openElements.popUntilTagNamePopped($.FORM);

        else
            p.openElements.remove(formElement);
    }
}

function pEndTagInBody(p, token) {
    if (p.openElements.hasInButtonScope($.P)) {
        p.openElements.generateImpliedEndTagsWithExclusion($.P);
        p.openElements.popUntilTagNamePopped($.P);
    }

    else {
        p._processFakeStartTag($.P);
        p._processToken(token);
    }
}

function liEndTagInBody(p, token) {
    if (p.openElements.hasInListItemScope($.LI)) {
        p.openElements.generateImpliedEndTagsWithExclusion($.LI);
        p.openElements.popUntilTagNamePopped($.LI);
    }
}

function ddEndTagInBody(p, token) {
    var tn = token.tagName;

    if (p.openElements.hasInScope(tn)) {
        p.openElements.generateImpliedEndTagsWithExclusion(tn);
        p.openElements.popUntilTagNamePopped(tn);
    }
}

function numberedHeaderEndTagInBody(p, token) {
    if (p.openElements.hasNumberedHeaderInScope()) {
        p.openElements.generateImpliedEndTags();
        p.openElements.popUntilNumberedHeaderPopped();
    }
}

function appletEndTagInBody(p, token) {
    var tn = token.tagName;

    if (p.openElements.hasInScope(tn)) {
        p.openElements.generateImpliedEndTags();
        p.openElements.popUntilTagNamePopped(tn);
        p.activeFormattingElements.clearToLastMarker();
    }
}

function brEndTagInBody(p, token) {
    p._processFakeStartTag($.BR);
}

function genericEndTagInBody(p, token) {
    var tn = token.tagName;

    for (var i = p.openElements.stackTop; i > 0; i--) {
        var element = p.openElements.items[i];

        if (p.treeAdapter.getTagName(element) === tn) {
            p.openElements.generateImpliedEndTagsWithExclusion(tn);
            p.openElements.popUntilElementPopped(element);
            break;
        }

        if (p._isSpecialElement(element))
            break;
    }
}

//OPTIMIZATION: Integer comparisons are low-cost, so we can use very fast tag name length filters here.
//It's faster than using dictionary.
function endTagInBody(p, token) {
    var tn = token.tagName;

    switch (tn.length) {
        case 1:
            if (tn === $.A || tn === $.B || tn === $.I || tn === $.S || tn == $.U)
                callAdoptionAgency(p, token);

            else if (tn === $.P)
                pEndTagInBody(p, token);

            else
                genericEndTagInBody(p, token);

            break;

        case 2:
            if (tn == $.DL || tn === $.UL || tn === $.OL)
                addressEndTagInBody(p, token);

            else if (tn === $.LI)
                liEndTagInBody(p, token);

            else if (tn === $.DD || tn === $.DT)
                ddEndTagInBody(p, token);

            else if (tn === $.H1 || tn === $.H2 || tn === $.H3 || tn === $.H4 || tn === $.H5 || tn === $.H6)
                numberedHeaderEndTagInBody(p, token);

            else if (tn === $.BR)
                brEndTagInBody(p, token);

            else if (tn === $.EM || tn === $.TT)
                callAdoptionAgency(p, token);

            else
                genericEndTagInBody(p, token);

            break;

        case 3:
            if (tn === $.BIG)
                callAdoptionAgency(p, token);

            else if (tn === $.DIR || tn === $.DIV || tn === $.NAV)
                addressEndTagInBody(p, token);

            else
                genericEndTagInBody(p, token);

            break;

        case 4:
            if (tn === $.BODY)
                bodyEndTagInBody(p, token);

            else if (tn === $.HTML)
                htmlEndTagInBody(p, token);

            else if (tn === $.FORM)
                formEndTagInBody(p, token);

            else if (tn === $.CODE || tn === $.FONT || tn === $.NOBR)
                callAdoptionAgency(p, token);

            else if (tn === $.MAIN || tn === $.MENU)
                addressEndTagInBody(p, token);

            else
                genericEndTagInBody(p, token);

            break;

        case 5:
            if (tn === $.ASIDE)
                addressEndTagInBody(p, token);

            else if (tn === $.SMALL)
                callAdoptionAgency(p, token);

            else
                genericEndTagInBody(p, token);

            break;

        case 6:
            if (tn === $.CENTER || tn === $.FIGURE || tn === $.FOOTER || tn === $.HEADER || tn === $.HGROUP)
                addressEndTagInBody(p, token);

            else if (tn === $.APPLET || tn === $.OBJECT)
                appletEndTagInBody(p, token);

            else if (tn == $.STRIKE || tn === $.STRONG)
                callAdoptionAgency(p, token);

            else
                genericEndTagInBody(p, token);

            break;

        case 7:
            if (tn === $.ADDRESS || tn === $.ARTICLE || tn === $.DETAILS || tn === $.SECTION || tn === $.SUMMARY)
                addressEndTagInBody(p, token);

            else if (tn === $.MARQUEE)
                appletEndTagInBody(p, token);

            else
                genericEndTagInBody(p, token);

            break;

        case 8:
            if (tn === $.FIELDSET)
                addressEndTagInBody(p, token);

            else if (tn === $.TEMPLATE)
                endTagInHead(p, token);

            else
                genericEndTagInBody(p, token);

            break;

        case 10:
            if (tn === $.BLOCKQUOTE || tn === $.FIGCAPTION)
                addressEndTagInBody(p, token);

            else
                genericEndTagInBody(p, token);

            break;

        default :
            genericEndTagInBody(p, token);
    }
}

function eofInBody(p, token) {
    if (p.tmplInsertionModeStackTop > -1)
        eofInTemplate(p, token);

    else
        p.stopped = true;
}

//12.2.5.4.8 The "text" insertion mode
//------------------------------------------------------------------
function endTagInText(p, token) {
    if (!p.fragmentContext && p.scriptHandler && token.tagName === $.SCRIPT)
        p.scriptHandler(p.document, p.openElements.current);

    p.openElements.pop();
    p.insertionMode = p.originalInsertionMode;
}


function eofInText(p, token) {
    p.openElements.pop();
    p.insertionMode = p.originalInsertionMode;
    p._processToken(token);
}


//12.2.5.4.9 The "in table" insertion mode
//------------------------------------------------------------------
function characterInTable(p, token) {
    var curTn = p.openElements.currentTagName;

    if (curTn === $.TABLE || curTn === $.TBODY || curTn === $.TFOOT || curTn === $.THEAD || curTn === $.TR) {
        p.pendingCharacterTokens = [];
        p.hasNonWhitespacePendingCharacterToken = false;
        p.originalInsertionMode = p.insertionMode;
        p.insertionMode = IN_TABLE_TEXT_MODE;
        p._processToken(token);
    }

    else
        tokenInTable(p, token);
}

function captionStartTagInTable(p, token) {
    p.openElements.clearBackToTableContext();
    p.activeFormattingElements.insertMarker();
    p._insertElement(token, NS.HTML);
    p.insertionMode = IN_CAPTION_MODE;
}

function colgroupStartTagInTable(p, token) {
    p.openElements.clearBackToTableContext();
    p._insertElement(token, NS.HTML);
    p.insertionMode = IN_COLUMN_GROUP_MODE;
}

function colStartTagInTable(p, token) {
    p._processFakeStartTag($.COLGROUP);
    p._processToken(token);
}

function tbodyStartTagInTable(p, token) {
    p.openElements.clearBackToTableContext();
    p._insertElement(token, NS.HTML);
    p.insertionMode = IN_TABLE_BODY_MODE;
}

function tdStartTagInTable(p, token) {
    p._processFakeStartTag($.TBODY);
    p._processToken(token);
}

function tableStartTagInTable(p, token) {
    var fakeToken = p._processFakeEndTag($.TABLE);

    //NOTE: The fake end tag token here can only be ignored in the fragment case.
    if (!fakeToken.ignored)
        p._processToken(token);
}

function inputStartTagInTable(p, token) {
    var inputType = Tokenizer.getTokenAttr(token, ATTRS.TYPE);

    if (inputType && inputType.toLowerCase() === HIDDEN_INPUT_TYPE)
        p._appendElement(token, NS.HTML);

    else
        tokenInTable(p, token);
}

function formStartTagInTable(p, token) {
    if (!p.formElement && p.openElements.tmplCount === 0) {
        p._insertElement(token, NS.HTML);
        p.formElement = p.openElements.current;
        p.openElements.pop();
    }
}

function startTagInTable(p, token) {
    var tn = token.tagName;

    switch (tn.length) {
        case 2:
            if (tn === $.TD || tn === $.TH || tn === $.TR)
                tdStartTagInTable(p, token);

            else
                tokenInTable(p, token);

            break;

        case 3:
            if (tn === $.COL)
                colStartTagInTable(p, token);

            else
                tokenInTable(p, token);

            break;

        case 4:
            if (tn === $.FORM)
                formStartTagInTable(p, token);

            else
                tokenInTable(p, token);

            break;

        case 5:
            if (tn === $.TABLE)
                tableStartTagInTable(p, token);

            else if (tn === $.STYLE)
                startTagInHead(p, token);

            else if (tn === $.TBODY || tn === $.TFOOT || tn === $.THEAD)
                tbodyStartTagInTable(p, token);

            else if (tn === $.INPUT)
                inputStartTagInTable(p, token);

            else
                tokenInTable(p, token);

            break;

        case 6:
            if (tn === $.SCRIPT)
                startTagInHead(p, token);

            else
                tokenInTable(p, token);

            break;

        case 7:
            if (tn === $.CAPTION)
                captionStartTagInTable(p, token);

            else
                tokenInTable(p, token);

            break;

        case 8:
            if (tn === $.COLGROUP)
                colgroupStartTagInTable(p, token);

            else if (tn === $.TEMPLATE)
                startTagInHead(p, token);

            else
                tokenInTable(p, token);

            break;

        default:
            tokenInTable(p, token);
    }

}

function endTagInTable(p, token) {
    var tn = token.tagName;

    if (tn === $.TABLE) {
        if (p.openElements.hasInTableScope($.TABLE)) {
            p.openElements.popUntilTagNamePopped($.TABLE);
            p._resetInsertionMode();
        }

        else
            token.ignored = true;
    }

    else if (tn === $.TEMPLATE)
        endTagInHead(p, token);

    else if (tn !== $.BODY && tn !== $.CAPTION && tn !== $.COL && tn !== $.COLGROUP && tn !== $.HTML &&
             tn !== $.TBODY && tn !== $.TD && tn !== $.TFOOT && tn !== $.TH && tn !== $.THEAD && tn !== $.TR) {
        tokenInTable(p, token);
    }
}

function tokenInTable(p, token) {
    var savedFosterParentingState = p.fosterParentingEnabled;

    p.fosterParentingEnabled = true;
    p._processTokenInBodyMode(token);
    p.fosterParentingEnabled = savedFosterParentingState;
}


//12.2.5.4.10 The "in table text" insertion mode
//------------------------------------------------------------------
function whitespaceCharacterInTableText(p, token) {
    p.pendingCharacterTokens.push(token);
}

function characterInTableText(p, token) {
    p.pendingCharacterTokens.push(token);
    p.hasNonWhitespacePendingCharacterToken = true;
}

function tokenInTableText(p, token) {
    if (p.hasNonWhitespacePendingCharacterToken) {
        for (var i = 0; i < p.pendingCharacterTokens.length; i++)
            tokenInTable(p, p.pendingCharacterTokens[i]);
    }

    else {
        for (var i = 0; i < p.pendingCharacterTokens.length; i++)
            p._insertCharacters(p.pendingCharacterTokens[i]);
    }

    p.insertionMode = p.originalInsertionMode;
    p._processToken(token);
}


//12.2.5.4.11 The "in caption" insertion mode
//------------------------------------------------------------------
function startTagInCaption(p, token) {
    var tn = token.tagName;

    if (tn === $.CAPTION || tn === $.COL || tn === $.COLGROUP || tn === $.TBODY ||
        tn === $.TD || tn === $.TFOOT || tn === $.TH || tn === $.THEAD || tn === $.TR) {
        var fakeToken = p._processFakeEndTag($.CAPTION);

        //NOTE: The fake end tag token here can only be ignored in the fragment case.
        if (!fakeToken.ignored)
            p._processToken(token);
    }

    else
        startTagInBody(p, token);
}

function endTagInCaption(p, token) {
    var tn = token.tagName;

    if (tn === $.CAPTION) {
        if (p.openElements.hasInTableScope($.CAPTION)) {
            p.openElements.generateImpliedEndTags();
            p.openElements.popUntilTagNamePopped($.CAPTION);
            p.activeFormattingElements.clearToLastMarker();
            p.insertionMode = IN_TABLE_MODE;
        }

        else
            token.ignored = true;
    }

    else if (tn === $.TABLE) {
        var fakeToken = p._processFakeEndTag($.CAPTION);

        //NOTE: The fake end tag token here can only be ignored in the fragment case.
        if (!fakeToken.ignored)
            p._processToken(token);
    }

    else if (tn !== $.BODY && tn !== $.COL && tn !== $.COLGROUP && tn !== $.HTML && tn !== $.TBODY &&
             tn !== $.TD && tn !== $.TFOOT && tn !== $.TH && tn !== $.THEAD && tn !== $.TR) {
        endTagInBody(p, token);
    }
}


//12.2.5.4.12 The "in column group" insertion mode
//------------------------------------------------------------------
function startTagInColumnGroup(p, token) {
    var tn = token.tagName;

    if (tn === $.HTML)
        startTagInBody(p, token);

    else if (tn === $.COL)
        p._appendElement(token, NS.HTML);

    else if (tn === $.TEMPLATE)
        startTagInHead(p, token);

    else
        tokenInColumnGroup(p, token);
}

function endTagInColumnGroup(p, token) {
    var tn = token.tagName;

    if (tn === $.COLGROUP) {
        if (p.openElements.currentTagName !== $.COLGROUP)
            token.ignored = true;

        else {
            p.openElements.pop();
            p.insertionMode = IN_TABLE_MODE;
        }
    }

    else if (tn === $.TEMPLATE)
        endTagInHead(p, token);

    else if (tn !== $.COL)
        tokenInColumnGroup(p, token);
}

function tokenInColumnGroup(p, token) {
    var fakeToken = p._processFakeEndTag($.COLGROUP);

    //NOTE: The fake end tag token here can only be ignored in the fragment case.
    if (!fakeToken.ignored)
        p._processToken(token);
}

//12.2.5.4.13 The "in table body" insertion mode
//------------------------------------------------------------------
function startTagInTableBody(p, token) {
    var tn = token.tagName;

    if (tn === $.TR) {
        p.openElements.clearBackToTableBodyContext();
        p._insertElement(token, NS.HTML);
        p.insertionMode = IN_ROW_MODE;
    }

    else if (tn === $.TH || tn === $.TD) {
        p._processFakeStartTag($.TR);
        p._processToken(token);
    }

    else if (tn === $.CAPTION || tn === $.COL || tn === $.COLGROUP ||
             tn === $.TBODY || tn === $.TFOOT || tn === $.THEAD) {

        if (p.openElements.hasTableBodyContextInTableScope()) {
            p.openElements.clearBackToTableBodyContext();
            p._processFakeEndTag(p.openElements.currentTagName);
            p._processToken(token);
        }
    }

    else
        startTagInTable(p, token);
}

function endTagInTableBody(p, token) {
    var tn = token.tagName;

    if (tn === $.TBODY || tn === $.TFOOT || tn === $.THEAD) {
        if (p.openElements.hasInTableScope(tn)) {
            p.openElements.clearBackToTableBodyContext();
            p.openElements.pop();
            p.insertionMode = IN_TABLE_MODE;
        }
    }

    else if (tn === $.TABLE) {
        if (p.openElements.hasTableBodyContextInTableScope()) {
            p.openElements.clearBackToTableBodyContext();
            p._processFakeEndTag(p.openElements.currentTagName);
            p._processToken(token);
        }
    }

    else if (tn !== $.BODY && tn !== $.CAPTION && tn !== $.COL && tn !== $.COLGROUP ||
             tn !== $.HTML && tn !== $.TD && tn !== $.TH && tn !== $.TR) {
        endTagInTable(p, token);
    }
}

//12.2.5.4.14 The "in row" insertion mode
//------------------------------------------------------------------
function startTagInRow(p, token) {
    var tn = token.tagName;

    if (tn === $.TH || tn === $.TD) {
        p.openElements.clearBackToTableRowContext();
        p._insertElement(token, NS.HTML);
        p.insertionMode = IN_CELL_MODE;
        p.activeFormattingElements.insertMarker();
    }

    else if (tn === $.CAPTION || tn === $.COL || tn === $.COLGROUP || tn === $.TBODY ||
             tn === $.TFOOT || tn === $.THEAD || tn === $.TR) {
        var fakeToken = p._processFakeEndTag($.TR);

        //NOTE: The fake end tag token here can only be ignored in the fragment case.
        if (!fakeToken.ignored)
            p._processToken(token);
    }

    else
        startTagInTable(p, token);
}

function endTagInRow(p, token) {
    var tn = token.tagName;

    if (tn === $.TR) {
        if (p.openElements.hasInTableScope($.TR)) {
            p.openElements.clearBackToTableRowContext();
            p.openElements.pop();
            p.insertionMode = IN_TABLE_BODY_MODE;
        }

        else
            token.ignored = true;
    }

    else if (tn === $.TABLE) {
        var fakeToken = p._processFakeEndTag($.TR);

        //NOTE: The fake end tag token here can only be ignored in the fragment case.
        if (!fakeToken.ignored)
            p._processToken(token);
    }

    else if (tn === $.TBODY || tn === $.TFOOT || tn === $.THEAD) {
        if (p.openElements.hasInTableScope(tn)) {
            p._processFakeEndTag($.TR);
            p._processToken(token);
        }
    }

    else if (tn !== $.BODY && tn !== $.CAPTION && tn !== $.COL && tn !== $.COLGROUP ||
             tn !== $.HTML && tn !== $.TD && tn !== $.TH) {
        endTagInTable(p, token);
    }
}


//12.2.5.4.15 The "in cell" insertion mode
//------------------------------------------------------------------
function startTagInCell(p, token) {
    var tn = token.tagName;

    if (tn === $.CAPTION || tn === $.COL || tn === $.COLGROUP || tn === $.TBODY ||
        tn === $.TD || tn === $.TFOOT || tn === $.TH || tn === $.THEAD || tn === $.TR) {

        if (p.openElements.hasInTableScope($.TD) || p.openElements.hasInTableScope($.TH)) {
            p._closeTableCell();
            p._processToken(token);
        }
    }

    else
        startTagInBody(p, token);
}

function endTagInCell(p, token) {
    var tn = token.tagName;

    if (tn === $.TD || tn === $.TH) {
        if (p.openElements.hasInTableScope(tn)) {
            p.openElements.generateImpliedEndTags();
            p.openElements.popUntilTagNamePopped(tn);
            p.activeFormattingElements.clearToLastMarker();
            p.insertionMode = IN_ROW_MODE;
        }
    }

    else if (tn === $.TABLE || tn === $.TBODY || tn === $.TFOOT || tn === $.THEAD || tn === $.TR) {
        if (p.openElements.hasInTableScope(tn)) {
            p._closeTableCell();
            p._processToken(token);
        }
    }

    else if (tn !== $.BODY && tn !== $.CAPTION && tn !== $.COL && tn !== $.COLGROUP && tn !== $.HTML)
        endTagInBody(p, token);
}

//12.2.5.4.16 The "in select" insertion mode
//------------------------------------------------------------------
function startTagInSelect(p, token) {
    var tn = token.tagName;

    if (tn === $.HTML)
        startTagInBody(p, token);

    else if (tn === $.OPTION) {
        if (p.openElements.currentTagName === $.OPTION)
            p._processFakeEndTag($.OPTION);

        p._insertElement(token, NS.HTML);
    }

    else if (tn === $.OPTGROUP) {
        if (p.openElements.currentTagName === $.OPTION)
            p._processFakeEndTag($.OPTION);

        if (p.openElements.currentTagName === $.OPTGROUP)
            p._processFakeEndTag($.OPTGROUP);

        p._insertElement(token, NS.HTML);
    }

    else if (tn === $.SELECT)
        p._processFakeEndTag($.SELECT);

    else if (tn === $.INPUT || tn === $.KEYGEN || tn === $.TEXTAREA) {
        if (p.openElements.hasInSelectScope($.SELECT)) {
            p._processFakeEndTag($.SELECT);
            p._processToken(token);
        }
    }

    else if (tn === $.SCRIPT || tn === $.TEMPLATE)
        startTagInHead(p, token);
}

function endTagInSelect(p, token) {
    var tn = token.tagName;

    if (tn === $.OPTGROUP) {
        var prevOpenElement = p.openElements.items[p.openElements.stackTop - 1],
            prevOpenElementTn = prevOpenElement && p.treeAdapter.getTagName(prevOpenElement);

        if (p.openElements.currentTagName === $.OPTION && prevOpenElementTn === $.OPTGROUP)
            p._processFakeEndTag($.OPTION);

        if (p.openElements.currentTagName === $.OPTGROUP)
            p.openElements.pop();
    }

    else if (tn === $.OPTION) {
        if (p.openElements.currentTagName === $.OPTION)
            p.openElements.pop();
    }

    else if (tn === $.SELECT && p.openElements.hasInSelectScope($.SELECT)) {
        p.openElements.popUntilTagNamePopped($.SELECT);
        p._resetInsertionMode();
    }

    else if (tn === $.TEMPLATE)
        endTagInHead(p, token);
}

//12.2.5.4.17 The "in select in table" insertion mode
//------------------------------------------------------------------
function startTagInSelectInTable(p, token) {
    var tn = token.tagName;

    if (tn === $.CAPTION || tn === $.TABLE || tn === $.TBODY || tn === $.TFOOT ||
        tn === $.THEAD || tn === $.TR || tn === $.TD || tn === $.TH) {
        p._processFakeEndTag($.SELECT);
        p._processToken(token);
    }

    else
        startTagInSelect(p, token);
}

function endTagInSelectInTable(p, token) {
    var tn = token.tagName;

    if (tn === $.CAPTION || tn === $.TABLE || tn === $.TBODY || tn === $.TFOOT ||
        tn === $.THEAD || tn === $.TR || tn === $.TD || tn === $.TH) {
        if (p.openElements.hasInTableScope(tn)) {
            p._processFakeEndTag($.SELECT);
            p._processToken(token);
        }
    }

    else
        endTagInSelect(p, token);
}

//12.2.5.4.18 The "in template" insertion mode
//------------------------------------------------------------------
function startTagInTemplate(p, token) {
    var tn = token.tagName;

    if (tn === $.BASE || tn === $.BASEFONT || tn === $.BGSOUND || tn === $.LINK || tn === $.META ||
        tn === $.NOFRAMES || tn === $.SCRIPT || tn === $.STYLE || tn === $.TEMPLATE || tn === $.TITLE) {
        startTagInHead(p, token);
    }

    else {
        var newInsertionMode = TEMPLATE_INSERTION_MODE_SWITCH_MAP[tn] || IN_BODY_MODE;

        p._popTmplInsertionMode();
        p._pushTmplInsertionMode(newInsertionMode);
        p.insertionMode = newInsertionMode;
        p._processToken(token);
    }
}

function endTagInTemplate(p, token) {
    if (token.tagName === $.TEMPLATE)
        endTagInHead(p, token);
}

function eofInTemplate(p, token) {
    if (p.openElements.tmplCount > 0) {
        p.openElements.popUntilTemplatePopped();
        p.activeFormattingElements.clearToLastMarker();
        p._popTmplInsertionMode();
        p._resetInsertionMode();
        p._processToken(token);
    }

    else
        p.stopped = true;
}


//12.2.5.4.19 The "after body" insertion mode
//------------------------------------------------------------------
function startTagAfterBody(p, token) {
    if (token.tagName === $.HTML)
        startTagInBody(p, token);

    else
        tokenAfterBody(p, token);
}

function endTagAfterBody(p, token) {
    if (token.tagName === $.HTML) {
        if (!p.fragmentContext)
            p.insertionMode = AFTER_AFTER_BODY_MODE;
    }

    else
        tokenAfterBody(p, token);
}

function tokenAfterBody(p, token) {
    p.insertionMode = IN_BODY_MODE;
    p._processToken(token);
}

//12.2.5.4.20 The "in frameset" insertion mode
//------------------------------------------------------------------
function startTagInFrameset(p, token) {
    var tn = token.tagName;

    if (tn === $.HTML)
        startTagInBody(p, token);

    else if (tn === $.FRAMESET)
        p._insertElement(token, NS.HTML);

    else if (tn === $.FRAME)
        p._appendElement(token, NS.HTML);

    else if (tn === $.NOFRAMES)
        startTagInHead(p, token);
}

function endTagInFrameset(p, token) {
    if (token.tagName === $.FRAMESET && !p.openElements.isRootHtmlElementCurrent()) {
        p.openElements.pop();

        if (!p.fragmentContext && p.openElements.currentTagName !== $.FRAMESET)
            p.insertionMode = AFTER_FRAMESET_MODE;
    }
}

//12.2.5.4.21 The "after frameset" insertion mode
//------------------------------------------------------------------
function startTagAfterFrameset(p, token) {
    var tn = token.tagName;

    if (tn === $.HTML)
        startTagInBody(p, token);

    else if (tn === $.NOFRAMES)
        startTagInHead(p, token);
}

function endTagAfterFrameset(p, token) {
    if (token.tagName === $.HTML)
        p.insertionMode = AFTER_AFTER_FRAMESET_MODE;
}

//12.2.5.4.22 The "after after body" insertion mode
//------------------------------------------------------------------
function startTagAfterAfterBody(p, token) {
    if (token.tagName === $.HTML)
        startTagInBody(p, token);

    else
        tokenAfterAfterBody(p, token);
}

function tokenAfterAfterBody(p, token) {
    p.insertionMode = IN_BODY_MODE;
    p._processToken(token);
}

//12.2.5.4.23 The "after after frameset" insertion mode
//------------------------------------------------------------------
function startTagAfterAfterFrameset(p, token) {
    var tn = token.tagName;

    if (tn === $.HTML)
        startTagInBody(p, token);

    else if (tn === $.NOFRAMES)
        startTagInHead(p, token);
}


//12.2.5.5 The rules for parsing tokens in foreign content
//------------------------------------------------------------------
function nullCharacterInForeignContent(p, token) {
    token.chars = UNICODE.REPLACEMENT_CHARACTER;
    p._insertCharacters(token);
}

function characterInForeignContent(p, token) {
    p._insertCharacters(token);
    p.framesetOk = false;
}

function startTagInForeignContent(p, token) {
    if (ForeignContent.causesExit(token) && !p.fragmentContext) {
        while (p.treeAdapter.getNamespaceURI(p.openElements.current) !== NS.HTML &&
               (!p._isMathMLTextIntegrationPoint(p.openElements.current)) &&
               (!p._isHtmlIntegrationPoint(p.openElements.current))) {
            p.openElements.pop();
        }

        p._processToken(token);
    }

    else {
        var current = p._getAdjustedCurrentElement(),
            currentNs = p.treeAdapter.getNamespaceURI(current);

        if (currentNs === NS.MATHML)
            ForeignContent.adjustTokenMathMLAttrs(token);

        else if (currentNs === NS.SVG) {
            ForeignContent.adjustTokenSVGTagName(token);
            ForeignContent.adjustTokenSVGAttrs(token);
        }

        ForeignContent.adjustTokenXMLAttrs(token);

        if (token.selfClosing)
            p._appendElement(token, currentNs);
        else
            p._insertElement(token, currentNs);
    }
}

function endTagInForeignContent(p, token) {
    for (var i = p.openElements.stackTop; i > 0; i--) {
        var element = p.openElements.items[i];

        if (p.treeAdapter.getNamespaceURI(element) === NS.HTML) {
            p._processToken(token);
            break;
        }

        if (p.treeAdapter.getTagName(element).toLowerCase() === token.tagName) {
            p.openElements.popUntilElementPopped(element);
            break;
        }
    }
}

},{"../common/doctype":19,"../common/foreign_content":20,"../common/html":21,"../common/unicode":22,"../common/utils":23,"../tokenization/tokenizer":32,"../tree_adapters/default":33,"./formatting_element_list":35,"./location_info_mixin":36,"./open_element_stack":37}],39:[function(require,module,exports){
var reporters = {
    "A.": [{"cite_type": "state_regional",
            "editions": {"A.": [{"year":1885, "month":0, "day":1},
                                {"year":1938, "month":11, "day":31}],
                         "A.2d": [{"year":1938, "month":0, "day":1},
                                  {"year":2010, "month":11, "day":31}],
                         "A.3d": [{"year":2010, "month":0, "day":1},
                                  {"year":false, "month":false, "day":false}]},
            "mlz_jurisdiction": ["us;ct","us;de","us;dc","us;me","us;md","us;nh","us;nj","us;pa","us;ri","us;vt"],
            "name": "Atlantic Reporter",
            "variations": {"A. 2d": "A.2d",
                           "A. 3d": "A.3d",
                           "A.R.": "A.",
                           "A.Rep.": "A.",
                           "At.": "A.",
                           "Atl.": "A.",
                           "Atl.2d": "A.2d",
                           "Atl.R.": "A."}}],
    "A.D.": [{"cite_type": "state",
              "editions": {"A.D.": [{"year":1896, "month":0, "day":1},
                                    {"year":1955, "month":11, "day":31}],
                           "A.D.2d": [{"year":1955, "month":0, "day":1},
                                      {"year":2004, "month":11, "day":31}],
                           "A.D.3d": [{"year":2003, "month":0, "day":1},
                                      {"year":false, "month":false, "day":false}]},
              "mlz_jurisdiction": ["us;ny"],
              "name": "New York Supreme Court Appellate Division Reports",
              "variations": {"A.D. 2d": "A.D.2d",
                             "A.D. 3d": "A.D.3d",
                             "AD 2d": "A.D.2d",
                             "AD 3d": "A.D.3d",
                             "Ap.": "A.D.",
                             "Ap.2d.": "A.D.",
                             "App.Div.": "A.D.",
                             "App.Div.(N.Y.)": "A.D.",
                             "App.Div.2d.": "A.D.",
                             "N.Y.App.Dec.": "A.D.",
                             "N.Y.App.Div.": "A.D."}}],
    "A.K. Marsh.": [{"cite_type": "state",
                     "editions": {"A.K. Marsh.": [{"year":1817, "month":0, "day":1},
                                                  {"year":1821, "month":11, "day":31}]},
                     "mlz_jurisdiction": ["us;ky"],
                     "name": "Kentucky Reports, Marshall, A.K.",
                     "variations": {"Ky.(A.K.Marsh.)": "A.K. Marsh.",
                                    "Mar.": "A.K. Marsh.",
                                    "Marsh.": "A.K. Marsh.",
                                    "Marsh.(Ky.)": "A.K. Marsh.",
                                    "Marsh.A.K.": "A.K. Marsh."}}],
    "AZ": [{"cite_type": "neutral",
            "editions": {"AZ": [{"year":1750, "month":0, "day":1},
                                {"year":false, "month":false, "day":false}]},
            "mlz_jurisdiction": ["us;az"],
            "name": "Arizona Neutral Citation",
            "variations": {}}],
    "Abb. N. Cas.": [{"cite_type": "state",
                      "editions": {"Abb. N. Cas.": [{"year":1876, "month":0, "day":1},
                                                    {"year":1894, "month":11, "day":31}]},
                      "mlz_jurisdiction": ["us;ny"],
                      "name": "Abbott's New Cases",
                      "variations": {"A.N.": "Abb. N. Cas.",
                                     "A.N.C.": "Abb. N. Cas.",
                                     "Abb.N.C.": "Abb. N. Cas."}}],
    "Abb. Pr.": [{"cite_type": "state",
                  "editions": {"Abb. Pr.": [{"year":1854, "month":0, "day":1},
                                            {"year":1875, "month":11, "day":31}]},
                  "mlz_jurisdiction": ["us;ny"],
                  "name": "Abbott's Practice Reports",
                  "variations": {"Abb.P.R.": "Abb. Pr.",
                                 "Abb.Pr.Rep.": "Abb. Pr.",
                                 "Abb.Prac.": "Abb. Pr.",
                                 "Abbott P.R.": "Abb. Pr.",
                                 "Abbott Pr.Rep.": "Abb. Pr.",
                                 "Abbott Pract.Cas.": "Abb. Pr.",
                                 "Abbott's Pr.Rep.": "Abb. Pr.",
                                 "Abbott's Prac.Rep.": "Abb. Pr."}}],
    "Aik.": [{"cite_type": "state",
              "editions": {"Aik.": [{"year":1825, "month":0, "day":1},
                                    {"year":1828, "month":11, "day":31}]},
              "mlz_jurisdiction": ["us;vt"],
              "name": "Vermont Reports, Aikens",
              "variations": {}}],
    "Ala.": [{"cite_type": "state",
              "editions": {"Ala.": [{"year":1840, "month":0, "day":1},
                                    {"year":1976, "month":11, "day":31}],
                           "Ala. 2d": [{"year":1977, "month":0, "day":1},
                                       {"year":false, "month":false, "day":false}]},
              "mlz_jurisdiction": ["us;al"],
              "name": "Alabama Reports",
              "variations": {}}],
    "Ala. App.": [{"cite_type": "state",
                   "editions": {"Ala. App.": [{"year":1910, "month":0, "day":1},
                                              {"year":1976, "month":11, "day":31}]},
                   "mlz_jurisdiction": ["us;al"],
                   "name": "Alabama Appellate Courts Reports",
                   "variations": {}}],
    "Alaska": [{"cite_type": "state",
                "editions": {"Alaska": [{"year":1884, "month":0, "day":1},
                                        {"year":1959, "month":11, "day":31}]},
                "mlz_jurisdiction": ["us;ak"],
                "name": "Alaska Reports",
                "variations": {"Alk.": "Alaska"}}],
    "Alaska Fed.": [{"cite_type": "state",
                     "editions": {"Alaska Fed.": [{"year":1869, "month":0, "day":1},
                                                  {"year":1937, "month":11, "day":31}]},
                     "mlz_jurisdiction": ["us;ak"],
                     "name": "Alaska Federal Reports",
                     "variations": {"A.F.Rep.": "Alaska Fed.",
                                    "Alaska Fed.": "Alaska Fed.",
                                    "Alaska Fed.R.": "Alaska Fed.",
                                    "Alaska Fed.Rep.": "Alaska Fed."}}],
    "Allen": [{"cite_type": "state",
               "editions": {"Allen": [{"year":1861, "month":0, "day":1},
                                      {"year":1867, "month":11, "day":31}]},
               "mlz_jurisdiction": ["us;ma"],
               "name": "Massachusetts Reports, Allen",
               "variations": {"All.": "Allen", "Mass.(Allen)": "Allen"}}],
    "Am. Samoa": [{"cite_type": "state",
                   "editions": {"Am. Samoa": [{"year":1900, "month":0, "day":1},
                                              {"year":false, "month":false, "day":false}],
                                "Am. Samoa 2d": [{"year":1900, "month":0, "day":1},
                                                 {"year":false, "month":false, "day":false}]},
                   "mlz_jurisdiction": ["us;am"],
                   "name": "American Samoa Reports",
                   "variations": {}}],
    "Ant. N.P. Cas.": [{"cite_type": "state",
                        "editions": {"Ant. N.P. Cas.": [{"year":1807, "month":0, "day":1},
                                                        {"year":1851, "month":11, "day":31}]},
                        "mlz_jurisdiction": ["us;ny"],
                        "name": "Anthon's Nisi Prius Cases",
                        "variations": {"Anth.": "Ant. N.P. Cas.",
                                       "Anthon N.P.(N.Y.)": "Ant. N.P. Cas."}}],
    "App. D.C.": [{"cite_type": "state",
                   "editions": {"App. D.C.": [{"year":1893, "month":0, "day":1},
                                              {"year":1941, "month":11, "day":31}]},
                   "mlz_jurisdiction": ["us;dc"],
                   "name": "Appeal Cases, District of Colombia",
                   "variations":{"U.S. App. D.C.":"App. D.C.",
                                 "U.S.App.D.C.":"App. D.C.",
                                 "U. S. App. D. C.":"App. D.C."}}],
    "Ariz.": [{"cite_type": "state",
               "editions": {"Ariz.": [{"year":1866, "month":0, "day":1},
                                      {"year":false, "month":false, "day":false}]},
               "mlz_jurisdiction": ["us;az"],
               "name": "Arizona Reporter",
               "variations": {}}],
    "Ariz. App.": [{"cite_type": "state",
                    "editions": {"Ariz. App.": [{"year":1965, "month":0, "day":1},
                                                {"year":1976, "month":11, "day":31}]},
                    "mlz_jurisdiction": ["us;az"],
                    "name": "Arizona Appeals Reports",
                    "variations": {}}],
    "Ark.": [{"cite_type": "state",
              "editions": {"Ark.": [{"year":1837, "month":0, "day":1},
                                    {"year":false, "month":false, "day":false}]},
              "mlz_jurisdiction": ["us;ar"],
              "name": "Arkansas Reports",
              "variations": {"Ak.": "Ark."}}],
    "Ark. App.": [{"cite_type": "state",
                   "editions": {"Ark. App.": [{"year":1981, "month":0, "day":1},
                                              {"year":false, "month":false, "day":false}]},
                   "mlz_jurisdiction": ["us;ar"],
                   "name": "Arkansas Appellate Reports",
                   "variations": {"Ak. App.": "Ark. App."}}],
    "B. Mon.": [{"cite_type": "state",
                 "editions": {"B. Mon.": [{"year":1840, "month":0, "day":1},
                                          {"year":1857, "month":11, "day":31}]},
                 "mlz_jurisdiction": ["us;ky"],
                 "name": "Kentucky Reports, Monroe, Ben",
                 "variations": {"Ky.(B.Mon.)": "B. Mon.",
                                "Mon.": "B. Mon.",
                                "Mon.B.": "B. Mon.",
                                "Monroe, B.": "B. Mon."}}],
    "B.R.": [{"cite_type": "specialty",
              "editions": {"B.R.": [{"year":1979, "month":0, "day":1},
                                    {"year":false, "month":false, "day":false}]},
              "mlz_jurisdiction": ["us"],
              "name": "Bankruptcy Reporter",
              "variations": {"B. R.": "B.R.", "BR": "B.R."}}],
    "B.T.A.": [{"cite_type": "specialty",
                "editions": {"B.T.A.": [{"year":1924, "month":0, "day":1},
                                        {"year":1942, "month":11, "day":31}]},
                "mlz_jurisdiction": ["us"],
                "name": "Reports of the United States Board of Tax Appeals",
                "variations": {}}],
    "B.T.A.M. (P-H)": [{"cite_type": "specialty",
                        "editions": {"B.T.A.M. (P-H)": [{"year":1928, "month":0, "day":1},
                                                        {"year":1942, "month":11, "day":31}]},
                        "mlz_jurisdiction": ["us"],
                        "name": "Board of Tax Appeals Memorandum Decisions",
                        "variations": {}}],
    "Bail.": [{"cite_type": "state",
               "editions": {"Bail.": [{"year":1828, "month":0, "day":1},
                                      {"year":1832, "month":11, "day":31}]},
               "mlz_jurisdiction": ["us;sc"],
               "name": "South Carolina Reports, Bailey",
               "variations": {"Bai.": "Bail.",
                              "Bail.L.": "Bail.",
                              "Bail.L.(S.C.)": "Bail.",
                              "Bailey": "Bail.",
                              "S.C.L.(Bail.)": "Bail."}}],
    "Bail. Eq.": [{"cite_type": "state",
                   "editions": {"Bail. Eq.": [{"year":1830, "month":0, "day":1},
                                              {"year":1831, "month":11, "day":31}]},
                   "mlz_jurisdiction": ["us;sc"],
                   "name": "South Carolina Reports, Bailey's Equity",
                   "variations": {"Bai.Eq.": "Bail. Eq.",
                                  "Bail.Eq.(S.C.)": "Bail. Eq.",
                                  "Bailey": "Bail. Eq.",
                                  "Bailey Ch.": "Bail. Eq.",
                                  "Bailey Eq.": "Bail. Eq.",
                                  "S.C.Eq.(Bail.Eq.)": "Bail. Eq."}}],
    "Barb.": [{"cite_type": "state",
               "editions": {"Barb.": [{"year":1847, "month":0, "day":1},
                                      {"year":1877, "month":11, "day":31}]},
               "mlz_jurisdiction": ["us;ny"],
               "name": "Barbour's Supreme Court Reports",
               "variations": {"B.": "Barb.", "Barb.S.C.": "Barb."}}],
    "Barb. Ch.": [{"cite_type": "state",
                   "editions": {"Barb. Ch.": [{"year":1845, "month":0, "day":1},
                                              {"year":1848, "month":11, "day":31}]},
                   "mlz_jurisdiction": ["us;ny"],
                   "name": "Barbour's Chancery Reports",
                   "variations": {"Barb.Ch.(N.Y.)": "Barb. Ch."}}],
    "Bay": [{"cite_type": "state",
             "editions": {"Bay": [{"year":1783, "month":0, "day":1},
                                  {"year":1804, "month":11, "day":31}]},
             "mlz_jurisdiction": ["us;sc"],
             "name": "South Carolina Reports, Bay",
             "variations": {"S.C.L.(Bay)": "Bay"}}],
    "Bibb": [{"cite_type": "state",
              "editions": {"Bibb": [{"year":1808, "month":0, "day":1},
                                    {"year":1817, "month":11, "day":31}]},
              "mlz_jurisdiction": ["us;ky"],
              "name": "Kentucky Reports, Bibb",
              "variations": {"Bibb(Ky.)": "Bibb", "Ky.(Bibb)": "Bibb"}}],
    "Binn.": [{"cite_type": "state",
               "editions": {"Binn.": [{"year":1799, "month":0, "day":1},
                                     {"year":1814, "month":11, "day":31}]},
               "mlz_jurisdiction": ["us;pa"],
               "name": "Pennsylvania State Reports, Binney",
               "variations": {"Bin.": "Binn.", "Binn.(Pa.)": "Binn.", "Binn": "Binn."}}],
    "Black": [{"cite_type": "scotus_early",
               "editions": {"Black": [{"year":1861, "month":0, "day":1},
                                      {"year":1862, "month":11, "day":31}]},
               "mlz_jurisdiction": ["us;federal;supreme.court"],
               "name": "Black's Supreme Court Reports",
               "variations": {"Black R.": "Black", "U.S.(Black)": "Black"}}],
    "Blackf.": [{"cite_type": "state",
                 "editions": {"Blackf.": [{"year":1817, "month":0, "day":1},
                                          {"year":1847, "month":11, "day":31}]},
                 "mlz_jurisdiction": ["us;in"],
                 "name": "Indiana Reports, Blackford",
                 "variations": {"Black.": "Blackf.",
                                "Blackf.(Ind.)": "Blackf."}}],
    "Blume Sup. Ct. Trans.": [{"cite_type": "state",
                               "editions": {"Blume Sup. Ct. Trans.": [{"year":1805, "month":0, "day":1},
                                                                      {"year":1836, "month":11, "day":31}]},
                               "mlz_jurisdiction": ["us;mi"],
                               "name": "Blume, Supreme Court Transactions",
                               "variations": {"Blume Sup.Ct.Trans.": "Blume Sup. Ct. Trans."}}],
    "Blume Unrep. Op.": [{"cite_type": "state",
                          "editions": {"Blume Unrep. Op.": [{"year":1836, "month":0, "day":1},
                                                            {"year":1843, "month":11, "day":31}]},
                          "mlz_jurisdiction": ["us;mi"],
                          "name": "Blume, Unreported Opinions",
                          "variations": {"Blume Op.": "Blume Unrep. Op."}}],
    "Boyce": [{"cite_type": "state",
               "editions": {"Boyce": [{"year":1909, "month":0, "day":1},
                                      {"year":1920, "month":11, "day":31}]},
               "mlz_jurisdiction": ["us;de"],
               "name": "Delaware Reports, Boyce",
               "variations": {"Del.(Boyce)": "Boyce"}}],
    "Bradf.": [{"cite_type": "state",
                "editions": {"Bradf.": [{"year":1838, "month":0, "day":1},
                                        {"year":1841, "month":11, "day":31}]},
                "mlz_jurisdiction": ["us;ia"],
                "name": "Iowa Reports, Bradford",
                "variations": {"Brad.": "Bradf.", "Bradford": "Bradf."}}],
    "Brayt.": [{"cite_type": "state",
                "editions": {"Brayt.": [{"year":1815, "month":0, "day":1},
                                        {"year":1819, "month":11, "day":31}]},
                "mlz_jurisdiction": ["us;vt"],
                "name": "Vermont Reports, Brayton",
                "variations": {"Brayton (Vt.)": "Brayt."}}],
    "Breese": [{"cite_type": "state",
                "editions": {"Breese": [{"year":1819, "month":0, "day":1},
                                        {"year":1831, "month":11, "day":31}]},
                "mlz_jurisdiction": ["us;il"],
                "name": "Illinois Reports, Breese",
                "variations": {"Ill.(Breese)": "Breese"}}],
    "Brev.": [{"cite_type": "state",
               "editions": {"Brev.": [{"year":1793, "month":0, "day":1},
                                      {"year":1816, "month":11, "day":31}]},
               "mlz_jurisdiction": ["us;sc"],
               "name": "South Carolina Reports, Brevard",
               "variations": {"S.C.L.(Brev)": "Brev."}}],
    "Brief Times Rptr.": [{"cite_type": "state",
                           "editions": {"Brief Times Rptr.": [{"year":1750, "month":0, "day":1},
                                                             {"year":false, "month":false, "day":false}]},
                           "mlz_jurisdiction": ["us;co"],
                           "name": "Brief Times Reporter",
                           "variations": {}}],
    "Bur.": [{"cite_type": "state",
              "editions": {"Bur.": [{"year":1841, "month":0, "day":1},
                                    {"year":1843, "month":11, "day":31}]},
              "mlz_jurisdiction": ["us;wi"],
              "name": "Wisconsin Reports, Burnett",
              "variations": {"Burnett": "Bur.", "Burnett (Wis.)": "Bur."}}],
    "Busb.": [{"cite_type": "state",
               "editions": {"Busb.": [{"year":1852, "month":0, "day":1},
                                      {"year":1853, "month":11, "day":31}]},
               "mlz_jurisdiction": ["us;nc"],
               "name": "North Carolina Reports, Busbee's Law",
               "variations": {"Busb.L.": "Busb.", "N.C.(Busb.)": "Busb."}}],
    "Busb. Eq.": [{"cite_type": "state",
                   "editions": {"Busb. Eq.": [{"year":1852, "month":0, "day":1},
                                              {"year":1853, "month":11, "day":31}]},
                   "mlz_jurisdiction": ["us;nc"],
                   "name": "North Carolina Reports, Busbee's Equity",
                   "variations": {"Busbee Eq.(N.C.)": "Busb. Eq.",
                                  "N.C.(Busb.Eq.)": "Busb. Eq."}}],
    "Bush": [{"cite_type": "state",
              "editions": {"Bush": [{"year":1866, "month":0, "day":1},
                                    {"year":1879, "month":11, "day":31}]},
              "mlz_jurisdiction": ["us;ky"],
              "name": "Kentucky Reports, Bush",
              "variations": {"Bush (Ky.)": "Bush", "Ky.(Bush)": "Bush"}}],
    "C.C.P.A.": [{"cite_type": "specialty",
                  "editions": {"C.C.P.A.": [{"year":1929, "month":0, "day":1},
                                            {"year":1982, "month":11, "day":31}]},
                  "mlz_jurisdiction": ["us"],
                  "name": "Court of Customs and Patent Appeals Reports",
                  "variations": {}}],
    "C.M.A.": [{"cite_type": "specialty",
                "editions": {"C.M.A.": [{"year":1951, "month":0, "day":1},
                                        {"year":1975, "month":11, "day":31}]},
                "mlz_jurisdiction": ["us"],
                "name": "Decisions of the United States Court of Military Appeals",
                "variations": {}}],
    "C.M.R.": [{"cite_type": "specialty",
                "editions": {"C.M.R.": [{"year":1951, "month":0, "day":1},
                                        {"year":1975, "month":11, "day":31}]},
                "mlz_jurisdiction": ["us"],
                "name": "Court Martial Records",
                "variations": {}}],
    "CO": [{"cite_type": "neutral",
            "editions": {"CO": [{"year":1750, "month":0, "day":1},
                                {"year":false, "month":false, "day":false}]},
            "mlz_jurisdiction": ["us;co"],
            "name": "Colorado Neutral Citation",
            "variations": {}}],
    "Cai. Cas.": [{"cite_type": "state",
                   "editions": {"Cai. Cas.": [{"year":1796, "month":0, "day":1},
                                              {"year":1805, "month":11, "day":31}]},
                   "mlz_jurisdiction": ["us;ny"],
                   "name": "Caines' Cases",
                   "variations": {"Cai.": "Cai. Cas.",
                                  "Cai.Cas.Err.": "Cai. Cas.",
                                  "Cain.": "Cai. Cas.",
                                  "Caines": "Cai. Cas.",
                                  "Caines (N.Y.)": "Cai. Cas.",
                                  "Caines Cas.": "Cai. Cas.",
                                  "N.Y.Cas.Err.": "Cai. Cas."}}],
    "Cai. R.": [{"cite_type": "state",
                 "editions": {"Cai. R.": [{"year":1803, "month":0, "day":1},
                                          {"year":1805, "month":11, "day":31}]},
                 "mlz_jurisdiction": ["us;ny"],
                 "name": "Caines' Reports",
                 "variations": {"Cai.R.": "Cai. R."}}],
    "Cal.": [{"cite_type": "state",
              "editions": {"Cal.": [{"year":1850, "month":0, "day":1},
                                    {"year":1934, "month":11, "day":31}],
                           "Cal. 2d": [{"year":1934, "month":0, "day":1},
                                       {"year":1969, "month":11, "day":31}],
                           "Cal. 3d": [{"year":1969, "month":0, "day":1},
                                       {"year":1991, "month":11, "day":31}],
                           "Cal. 4th": [{"year":1991, "month":0, "day":1},
                                        {"year":false, "month":false, "day":false}]},
              "mlz_jurisdiction": ["us;ca"],
              "name": "California Reports",
              "variations": {"Cal.2d": "Cal. 2d",
                             "Cal.3d": "Cal. 3d",
                             "Cal.4th": "Cal. 4th"}}],
    "Cal. App.": [{"cite_type": "state",
                   "editions": {"Cal. App.": [{"year":1905, "month":0, "day":1},
                                              {"year":1934, "month":11, "day":31}],
                                "Cal. App. 2d": [{"year":1934, "month":0, "day":1},
                                                 {"year":1969, "month":11, "day":31}],
                                "Cal. App. 3d": [{"year":1969, "month":0, "day":1},
                                                 {"year":1991, "month":11, "day":31}],
                                "Cal. App. 4th": [{"year":1991, "month":0, "day":1},
                                                  {"year":false, "month":false, "day":false}]},
                   "mlz_jurisdiction": ["us;ca"],
                   "name": "California Appellate Reports",
                   "variations": {"Cal. App.2d": "Cal. App. 2d",
                                  "Cal. App.3d": "Cal. App. 3d",
                                  "Cal. App.4th": "Cal. App. 4th",
                                  "Cal.App.": "Cal. App.",
                                  "Cal.App. 2d": "Cal. App. 2d",
                                  "Cal.App. 3d": "Cal. App. 3d",
                                  "Cal.App. 4th": "Cal. App. 4th",
                                  "Cal.App.2d": "Cal. App. 2d",
                                  "Cal.App.3d": "Cal. App. 3d",
                                  "Cal.App.4th": "Cal. App. 4th"}}],
    "Cal. App. Supp.": [{"cite_type": "state",
                         "editions": {"Cal. App. Supp.": [{"year":1929, "month":0, "day":1},
                                                          {"year":false, "month":false, "day":false}],
                                      "Cal. App. Supp. 2d": [{"year":1929, "month":0, "day":1},
                                                             {"year":false, "month":false, "day":false}],
                                      "Cal. App. Supp. 3d": [{"year":1929, "month":0, "day":1},
                                                             {"year":false, "month":false, "day":false}]},
                         "mlz_jurisdiction": ["us;ca"],
                         "name": "California Appellate Reports, Supplement",
                         "variations": {"Cal.App. 2d Supp.": "Cal. App. Supp. 2d",
                                        "Cal.App. 3d Supp.": "Cal. App. Supp. 3d",
                                        "Cal.App. Supp. 2d": "Cal. App. Supp. 2d",
                                        "Cal.App. Supp. 3d": "Cal. App. Supp. 3d",
                                        "Cal.App. Supp.2d": "Cal. App. Supp. 2d",
                                        "Cal.App. Supp.3d": "Cal. App. Supp. 3d",
                                        "Cal.App.2d Supp.": "Cal. App. Supp. 2d",
                                        "Cal.App.3d Supp.": "Cal. App. Supp. 3d",
                                        "Cal.App.Supp.": "Cal. App. Supp.",
                                        "Cal.App.Supp.2d": "Cal. App. Supp. 2d"}}],
    "Cal. Rptr.": [{"cite_type": "state",
                    "editions": {"Cal. Rptr.": [{"year":1959, "month":0, "day":1},
                                                {"year":1991, "month":11, "day":31}],
                                 "Cal. Rptr. 2d": [{"year":1992, "month":0, "day":1},
                                                   {"year":2003, "month":11, "day":31}],
                                 "Cal. Rptr. 3d": [{"year":2003, "month":0, "day":1},
                                                   {"year":false, "month":false, "day":false}]},
                    "mlz_jurisdiction": ["us;ca"],
                    "name": "West's California Reporter",
                    "variations": {"Cal. Rptr.2d": "Cal. Rptr. 2d",
                                   "Cal. Rptr.3d": "Cal. Rptr. 3d",
                                   "Cal.Rptr.": "Cal. Rptr.",
                                   "Cal.Rptr. 2d": "Cal. Rptr. 2d",
                                   "Cal.Rptr. 3d": "Cal. Rptr. 3d",
                                   "Cal.Rptr.2d": "Cal. Rptr. 2d",
                                   "Cal.Rptr.3d": "Cal. Rptr. 3d"}}],
    "Cal. Unrep.": [{"cite_type": "state",
                     "editions": {"Cal. Unrep.": [{"year":1855, "month":0, "day":1},
                                                  {"year":1910, "month":11, "day":31}]},
                     "mlz_jurisdiction": ["us;ca"],
                     "name": "California Unreported Cases",
                     "variations": {"Cal.Unrep.Cas.": "Cal. Unrep."}}],
    "Call": [{"cite_type": "state",
              "editions": {"Call": [{"year":1779, "month":0, "day":1},
                                    {"year":1825, "month":11, "day":31}]},
              "mlz_jurisdiction": ["us;va"],
              "name": "Virginia Reports, Call",
              "variations": {"Call (Va.)": "Call", "Va.(Call)": "Call"}}],
    "Cam. & Nor.": [{"cite_type": "state",
                     "editions": {"Cam. & Nor.": [{"year":1800, "month":0, "day":1},
                                                  {"year":1804, "month":11, "day":31}]},
                     "mlz_jurisdiction": ["us;nc"],
                     "name": "North Carolina Reports, Conference by Cameron & Norwood",
                     "variations": {"Cam.& N.": "Cam. & Nor.",
                                    "N.C.(Cam.& Nor.)": "Cam. & Nor.",
                                    "N.C.Conf.": "Cam. & Nor.",
                                    "N.C.Conf.Rep.": "Cam. & Nor."}}],
    "Car. L. Rep.": [{"cite_type": "state",
                      "editions": {"Car. L. Rep.": [{"year":1811, "month":0, "day":1},
                                                    {"year":1816, "month":11, "day":31}]},
                      "mlz_jurisdiction": ["us;nc"],
                      "name": "Carolina Law Repository",
                      "variations": {"Car.Law.Repos.": "Car. L. Rep.",
                                     "N.C.(Car.L.Rep.)": "Car. L. Rep."}}],
    "Chand.": [{"cite_type": "state",
                "editions": {"Chand.": [{"year":1849, "month":0, "day":1},
                                        {"year":1852, "month":11, "day":31}]},
                "mlz_jurisdiction": ["us;wi"],
                "name": "Wisconsin Reports, Chandler",
                "variations": {"Chand.(Wis.)": "Chand.", "Chandl.": "Chand."}}],
    "Chev.": [{"cite_type": "state",
               "editions": {"Chev.": [{"year":1839, "month":0, "day":1},
                                      {"year":1840, "month":11, "day":31}]},
               "mlz_jurisdiction": ["us;sc"],
               "name": "South Carolina Reports, Cheves",
               "variations": {"Cheves": "Chev.",
                              "Cheves L.(S.C.)": "Chev.",
                              "S.C.L.(Chev.)": "Chev."}}],
    "Chev. Eq.": [{"cite_type": "state",
                   "editions": {"Chev. Eq.": [{"year":1839, "month":0, "day":1},
                                              {"year":1840, "month":11, "day":31}]},
                   "mlz_jurisdiction": ["us;sc"],
                   "name": "South Carolina Reports, Cheves' Equity",
                   "variations": {"Chev.Ch.": "Chev. Eq.",
                                  "Cheves Eq.(S.C.)": "Chev. Eq.",
                                  "S.C.Eq.(Chev.Eq.)": "Chev. Eq."}}],
    "Cl. Ch.": [{"cite_type": "state",
                 "editions": {"Cl. Ch.": [{"year":1839, "month":0, "day":1},
                                          {"year":1841, "month":11, "day":31}]},
                 "mlz_jurisdiction": ["us;ny"],
                 "name": "Clarke's Chancery Reports",
                 "variations": {"Cl.R.": "Cl. Ch.",
                                "Clarke": "Cl. Ch.",
                                "Clarke Ch.": "Cl. Ch.",
                                "Clarke Ch.(N.Y.)": "Cl. Ch."}}],
    "Cl. Ct.": [{"cite_type": "specialty",
                 "editions": {"Cl. Ct.": [{"year":1983, "month":0, "day":1},
                                          {"year":1992, "month":11, "day":31}]},
                 "mlz_jurisdiction": ["us"],
                 "name": "United States Claims Court Reporter",
                 "variations": {}}],
    "Cold.": [{"cite_type": "state",
               "editions": {"Cold.": [{"year":1860, "month":0, "day":1},
                                      {"year":1870, "month":11, "day":31}]},
               "mlz_jurisdiction": ["us;tn"],
               "name": "Tennessee Reports, Coldwell",
               "variations": {"Col.": "Cold.",
                              "Coldw.": "Cold.",
                              "Tenn.(Cold.)": "Cold."}}],
    "Cole. & Cai. Cas.": [{"cite_type": "state",
                           "editions": {"Cole. & Cai. Cas.": [{"year":1794, "month":0, "day":1},
                                                              {"year":1805, "month":11, "day":31}]},
                           "mlz_jurisdiction": ["us;ny"],
                           "name": "Coleman & Caines' Cases",
                           "variations": {"C.& C.": "Cole. & Cai. Cas.",
                                          "Col.& C.Cas.": "Cole. & Cai. Cas.",
                                          "Col.& Cai.": "Cole. & Cai. Cas.",
                                          "Col.& Caines Cas.(N.Y.)": "Cole. & Cai. Cas.",
                                          "Cole.& C.Cas.": "Cole. & Cai. Cas.",
                                          "Cole.& Cai.": "Cole. & Cai. Cas.",
                                          "Colem.& C.Cas.": "Cole. & Cai. Cas."}}],
    "Cole. Cas.": [{"cite_type": "state",
                    "editions": {"Cole. Cas.": [{"year":1791, "month":0, "day":1},
                                                {"year":1800, "month":11, "day":31}]},
                    "mlz_jurisdiction": ["us;ny"],
                    "name": "Coleman's Cases",
                    "variations": {"C.C.": "Cole. Cas.",
                                   "Col.Cas.": "Cole. Cas.",
                                   "Col.Cas.(N.Y.)": "Cole. Cas.",
                                   "Cole.Cas.Pr.": "Cole. Cas.",
                                   "Colem.Cas.": "Cole. Cas."}}],
    "Colo.": [{"cite_type": "state",
               "editions": {"Colo.": [{"year":1864, "month":0, "day":1},
                                      {"year":1980, "month":11, "day":31}]},
               "mlz_jurisdiction": ["us;co"],
               "name": "Colorado Reports",
               "variations": {"Col.": "Colo."}}],
    "Colo. Law.": [{"cite_type": "state",
                    "editions": {"Colo. Law.": [{"year":1750, "month":0, "day":1},
                                                {"year":false, "month":false, "day":false}]},
                    "mlz_jurisdiction": ["us;co"],
                    "name": "Colorado Lawyer",
                    "variations": {"Colorado Law.": "Colo. Law."}}],
    "Conn.": [{"cite_type": "state",
               "editions": {"Conn.": [{"year":1814, "month":0, "day":1},
                                      {"year":false, "month":false, "day":false}]},
               "mlz_jurisdiction": ["us;ct"],
               "name": "Connecticut Reports",
               "variations": {}}],
    "Conn. App.": [{"cite_type": "state",
                    "editions": {"Conn. App.": [{"year":1983, "month":0, "day":1},
                                                {"year":false, "month":false, "day":false}]},
                    "mlz_jurisdiction": ["us;ct"],
                    "name": "Connecticut Appellate Reports",
                    "variations": {}}],
    "Conn. Cir. Ct": [{"cite_type": "state",
                       "editions": {"Conn. Cir. Ct": [{"year":1961, "month":0, "day":1},
                                                      {"year":1974, "month":11, "day":31}]},
                       "mlz_jurisdiction": ["us;ct"],
                       "name": "Connecticut Circuit Court Reports",
                       "variations": {}}],
    "Conn. L. Rptr.": [{"cite_type": "state",
                        "editions": {"Conn. L. Rptr.": [{"year":1990, "month":0, "day":1},
                                                        {"year":false, "month":false, "day":false}]},
                        "mlz_jurisdiction": ["us;ct"],
                        "name": "Connecticut Law Reporter",
                        "variations": {}}],
    "Conn. Super. Ct.": [{"cite_type": "state",
                          "editions": {"Conn. Super. Ct.": [{"year":1986, "month":0, "day":1},
                                                            {"year":1994, "month":11, "day":31}]},
                          "mlz_jurisdiction": ["us;ct"],
                          "name": "Connecticut Superior Court Reports",
                          "variations": {}}],
    "Conn. Supp.": [{"cite_type": "state",
                     "editions": {"Conn. Supp.": [{"year":1935, "month":0, "day":1},
                                                  {"year":false, "month":false, "day":false}]},
                     "mlz_jurisdiction": ["us;ct"],
                     "name": "Connecticut Supplement",
                     "variations": {}}],
    "Cooke": [{"cite_type": "state",
               "editions": {"Cooke": [{"year":1811, "month":0, "day":1},
                                      {"year":1814, "month":11, "day":31}]},
               "mlz_jurisdiction": ["us;tn"],
               "name": "Tennessee Reports, Cooke",
               "variations": {"Cooke (Tenn.)": "Cooke",
                              "Tenn.(Cooke)": "Cooke"}}],
    "Cow.": [{"cite_type": "state",
              "editions": {"Cow.": [{"year":1823, "month":0, "day":1},
                                    {"year":1829, "month":11, "day":31}]},
              "mlz_jurisdiction": ["us;ny"],
              "name": "Cowen's Reports",
              "variations": {"C.": "Cow.", "Cow.N.Y.": "Cow."}}],
    "Cranch": [{"cite_type": "scotus_early",
                "editions": {"Cranch": [{"year":1801, "month":0, "day":1},
                                        {"year":1815, "month":11, "day":31}]},
                "mlz_jurisdiction": ["us;federal;supreme.court"],
                "name": "Cranch's Supreme Court Reports",
                "variations": {"Cr.": "Cranch",
                               "Cra.": "Cranch",
                               "Cranch (US)": "Cranch",
                               "U.S.(Cranch)": "Cranch"}},
               {"cite_type": "state",
                "editions": {"Cranch": [{"year":1801, "month":0, "day":1},
                                        {"year":1841, "month":11, "day":31}]},
                "mlz_jurisdiction": ["us;dc"],
                "name": "District of Columbia Reports, Cranch",
                "variations": {"Cranch C.C.": "Cranch",
                               "Cranch D.C.": "Cranch",
                               "D.C.(Cranch)": "Cranch"}}],
    "Ct. Cl.": [{"cite_type": "specialty",
                 "editions": {"Ct. Cl.": [{"year":1863, "month":0, "day":1},
                                          {"year":1982, "month":11, "day":31}]},
                 "mlz_jurisdiction": ["us"],
                 "name": "Court of Claims Reports",
                 "variations": {"Court Cl.": "Ct. Cl.",
                                "Ct.Cl.": "Ct. Cl."}}],
    "Ct. Cust.": [{"cite_type": "specialty",
                   "editions": {"Ct. Cust.": [{"year":1910, "month":0, "day":1},
                                              {"year":1929, "month":11, "day":31}]},
                   "mlz_jurisdiction": ["us"],
                   "name": "Court of Customs Appeals Reports",
                   "variations": {}}],
    "Ct. Int'l Trade": [{"cite_type": "fed",
                         "editions": {"Ct. Int'l Trade": [{"year":1980, "month":0, "day":1},
                                                          {"year":false, "month":false, "day":false}]},
                         "mlz_jurisdiction": ["us"],
                         "name": "Court of International Trade Reports",
                         "variations": {"Ct.Int'l Trade": "Ct. Int'l Trade"}}],
    "Cush.": [{"cite_type": "state",
               "editions": {"Cush.": [{"year":1848, "month":0, "day":1},
                                      {"year":1853, "month":11, "day":31}]},
               "mlz_jurisdiction": ["us;ma"],
               "name": "Massachusetts Reports, Cushing",
               "variations": {"Cush.(Mass.)": "Cush.",
                              "Cushing": "Cush.",
                              "Mass.(Cush.)": "Cush."}}],
    "Cust. B. & Dec.": [{"cite_type": "fed",
                         "editions": {"Cust. B. & Dec.": [{"year":1967, "month":0, "day":1},
                                                          {"year":false, "month":false, "day":false}]},
                         "mlz_jurisdiction": ["us"],
                         "name": "Customs Bulletin and Decisions",
                         "variations": {}}],
    "Cust. Ct.": [{"cite_type": "fed",
                   "editions": {"Cust. Ct.": [{"year":1938, "month":0, "day":1},
                                              {"year":1980, "month":11, "day":31}]},
                   "mlz_jurisdiction": ["us"],
                   "name": "Customs Court Reports",
                   "variations": {}}],
    "D. Chip.": [{"cite_type": "state",
                  "editions": {"D. Chip.": [{"year":1789, "month":0, "day":1},
                                            {"year":1824, "month":11, "day":31}]},
                  "mlz_jurisdiction": ["us;vt"],
                  "name": "Vermont Reports, Chipman, D.",
                  "variations": {"Chip.": "D. Chip.",
                                 "Chip.(Vt.)": "D. Chip.",
                                 "Chip.D.": "D. Chip.",
                                 "D.Chip.(Vt.)": "D. Chip.",
                                 "D.Chipm.": "D. Chip."}}],
    "Dakota": [{"cite_type": "state",
                "editions": {"Dakota": [{"year":1867, "month":0, "day":1},
                                        {"year":1889, "month":11, "day":31}]},
                "mlz_jurisdiction": ["us;nd"],
                "name": "Dakota Reports",
                "variations": {"Dak.": "Dakota"}}],
    "Dall.": [{"cite_type": "scotus_early",
               "editions": {"Dall.": [{"year":1790, "month":0, "day":1},
                                      {"year":1880, "month":11, "day":31}]},
               "mlz_jurisdiction": ["us;federal;supreme.court"],
               "name": "Dallas' Supreme Court Reports",
               "variations": {"Dal.": "Dall.",
                              "Dall.S.C.": "Dall.",
                              "Dallas": "Dall.",
                              "U.S.(Dall.)": "Dall."}},
              {"cite_type": "state",
               "editions": {"Dall.": [{"year":1754, "month":0, "day":1},
                                      {"year":1806, "month":11, "day":31}]},
               "mlz_jurisdiction": ["us;pa"],
               "name": "Pennsylvania State Reports, Dallas",
               "variations": {"D.": "Dall.",
                              "Dal.": "Dall.",
                              "Dallas": "Dall."}}],
    "Dallam": [{"cite_type": "state",
                "editions": {"Dallam": [{"year":1840, "month":0, "day":1},
                                        {"year":1844, "month":11, "day":31}]},
                "mlz_jurisdiction": ["us;tx"],
                "name": "Digest of the Laws of Texas (Dallam's Opinions)",
                "variations": {"Dall.(Tex.)": "Dallam",
                               "Dall.Dig.": "Dallam",
                               "Dallam Dig.(Tex.)": "Dallam"}}],
    "Dana": [{"cite_type": "state",
              "editions": {"Dana": [{"year":1833, "month":0, "day":1},
                                    {"year":1840, "month":11, "day":31}]},
              "mlz_jurisdiction": ["us;ky"],
              "name": "Kentucky Reports, Dana",
              "variations": {"Dan.": "Dana", "Ky.(Dana)": "Dana"}}],
    "Day": [{"cite_type": "state",
             "editions": {"Day": [{"year":1802, "month":0, "day":1},
                                  {"year":1813, "month":11, "day":31}]},
             "mlz_jurisdiction": ["uc;ct"],
             "name": "Day's Connecticut Reports",
             "variations": {"Day (Conn)": "Day"}}],
    "Del.": [{"cite_type": "state",
              "editions": {"Del.": [{"year":1920, "month":0, "day":1},
                                    {"year":1966, "month":11, "day":31}]},
              "mlz_jurisdiction": ["us;de"],
              "name": "Delaware Reports",
              "variations": {}}],
    "Del. Cas.": [{"cite_type": "state",
                   "editions": {"Del. Cas.": [{"year":1792, "month":0, "day":1},
                                              {"year":1830, "month":11, "day":31}]},
                   "mlz_jurisdiction": ["us;de"],
                   "name": "Delaware Cases",
                   "variations": {}}],
    "Del. Ch.": [{"cite_type": "state",
                  "editions": {"Del. Ch.": [{"year":1814, "month":0, "day":1},
                                            {"year":1968, "month":11, "day":31}]},
                  "mlz_jurisdiction": ["us;de"],
                  "name": "Delaware Chancery Reports",
                  "variations": {}}],
    "Denio": [{"cite_type": "state",
               "editions": {"Denio": [{"year":1845, "month":0, "day":1},
                                      {"year":1848, "month":11, "day":31}]},
               "mlz_jurisdiction": ["us;ny"],
               "name": "Denio's Reports",
               "variations": {"Den.": "Denio"}}],
    "Des.": [{"cite_type": "state",
              "editions": {"Des.": [{"year":1784, "month":0, "day":1},
                                    {"year":1817, "month":11, "day":31}]},
              "mlz_jurisdiction": ["us;sc"],
              "name": "South Carolina Reports, Desaussure's Equity",
              "variations": {"Desaus.": "Des.",
                             "Desaus.Eq.": "Des.",
                             "S.C.Eq.(Des.)": "Des."}}],
    "Dev.": [{"cite_type": "state",
              "editions": {"Dev.": [{"year":1826, "month":0, "day":1},
                                    {"year":1834, "month":11, "day":31}]},
              "mlz_jurisdiction": ["us;nc"],
              "name": "North Carolina Reports, Devereux's Law",
              "variations": {"Dev.L.": "Dev.", "N.C.(Dev.)": "Dev."}}],
    "Dev. & Bat.": [{"cite_type": "state",
                     "editions": {"Dev. & Bat.": [{"year":1834, "month":0, "day":1},
                                                  {"year":1839, "month":11, "day":31}]},
                     "mlz_jurisdiction": ["us;nc"],
                     "name": "North Carolina Reports, Devereux & Battle's Law",
                     "variations": {"D.& B.": "Dev. & Bat.",
                                    "Dev.& B.": "Dev. & Bat.",
                                    "Dev.& B.L.": "Dev. & Bat.",
                                    "N.C.(Dev.& Bat.)": "Dev. & Bat."}}],
    "Dev. & Bat. Eq.": [{"cite_type": "state",
                         "editions": {"Dev. & Bat. Eq.": [{"year":1834, "month":0, "day":1},
                                                          {"year":1839, "month":11, "day":31}]},
                         "mlz_jurisdiction": ["us;nc"],
                         "name": "North Carolina Reports, Devereux & Battle's Equity",
                         "variations": {"D.& B.": "Dev. & Bat. Eq.",
                                        "Dev.& B.": "Dev. & Bat. Eq.",
                                        "Dev.& B.Eq.": "Dev. & Bat. Eq.",
                                        "N.C.(Dev.& Bat.Eq.)": "Dev. & Bat. Eq."}}],
    "Dev. Eq.": [{"cite_type": "state",
                  "editions": {"Dev. Eq.": [{"year":1826, "month":0, "day":1},
                                            {"year":1834, "month":11, "day":31}]},
                  "mlz_jurisdiction": ["us;nc"],
                  "name": "North Carolina Reports, Devereux's Equity",
                  "variations": {"Dev.": "Dev. Eq.",
                                 "N.C.(Dev.Eq.)": "Dev. Eq."}}],
    "Doug.": [{"cite_type": "state",
               "editions": {"Doug.": [{"year":1843, "month":0, "day":1},
                                      {"year":1847, "month":11, "day":31}]},
               "mlz_jurisdiction": ["us;mi"],
               "name": "Michigan Reports, Douglass",
               "variations": {"Doug.(Mich.)": "Doug.",
                              "Dougl.(Mich.)": "Doug."}}],
    "Dud.": [{"cite_type": "state",
              "editions": {"Dud.": [{"year":1837, "month":0, "day":1},
                                    {"year":1838, "month":11, "day":31}]},
              "mlz_jurisdiction": ["us;sc"],
              "name": "South Carolina Reports, Dudley",
              "variations": {"Dud.(S.C.)": "Dud.",
                             "Dud.L.": "Dud.",
                             "Dud.L.(S.C.)": "Dud.",
                             "Dudl.": "Dud.",
                             "S.C.L.(Dud.)": "Dud."}}],
    "Dud. Eq.": [{"cite_type": "state",
                  "editions": {"Dud. Eq.": [{"year":1837, "month":0, "day":1},
                                            {"year":1838, "month":11, "day":31}]},
                  "mlz_jurisdiction": ["us;sc"],
                  "name": "South Carolina Reports, Dudley's Equity",
                  "variations": {"Dud.Ch.": "Dud. Eq.",
                                 "Dud.Eq.(S.C.)": "Dud. Eq.",
                                 "Dudl.": "Dud. Eq.",
                                 "S.C.Eq.(Dud.Eq.)": "Dud. Eq."}}],
    "Duv.": [{"cite_type": "state",
              "editions": {"Duv.": [{"year":1863, "month":0, "day":1},
                                    {"year":1866, "month":11, "day":31}]},
              "mlz_jurisdiction": ["us;ky"],
              "name": "Kentucky Reports, Duvall",
              "variations": {"Ky.(Duv.)": "Duv."}}],
    "Edm. Sel. Cas.": [{"cite_type": "state",
                        "editions": {"Edm. Sel. Cas.": [{"year":1834, "month":0, "day":1},
                                                        {"year":1853, "month":11, "day":31}]},
                        "mlz_jurisdiction": ["us;ny"],
                        "name": "Edmond's Select Cases",
                        "variations": {"Edm.Sel.Ca.": "Edm. Sel. Cas.",
                                       "Edm.Sel.Cas.(N.Y.)": "Edm. Sel. Cas.",
                                       "Edmond": "Edm. Sel. Cas."}}],
    "Edw. Ch.": [{"cite_type": "state",
                  "editions": {"Edw. Ch.": [{"year":1831, "month":0, "day":1},
                                            {"year":1850, "month":11, "day":31}]},
                  "mlz_jurisdiction": ["us;ny"],
                  "name": "Edwards' Chancery Reports",
                  "variations": {"Ed.C.R.": "Edw. Ch.",
                                 "Ed.Ch.": "Edw. Ch.",
                                 "Edw.": "Edw. Ch.",
                                 "Edw.Ch.(N.Y.)": "Edw. Ch."}}],
    "F.": [{"cite_type": "fed",
            "editions": {"F.": [{"year":1880, "month":0, "day":1},
                                {"year":1924, "month":11, "day":31}],
                         "F.2d": [{"year":1924, "month":0, "day":1},
                                  {"year":1993, "month":11, "day":31}],
                         "F.3d": [{"year":1993, "month":0, "day":1},
                                  {"year":false, "month":false, "day":false}]},
            "mlz_jurisdiction": ["us;federal;1-cir","us;federal;2-cir","us;federal;3-cir","us;federal;4-cir","us;federal;5-cir","us;federal;6-cir","us;federal;7-cir","us;federal;8-cir","us;federal;9-cir","us;federal;10-cir","us;federal;11-cir"],
            "name": "Federal Reporter",
            "variations": {"F. 2d": "F.2d",
                           "F. 3d": "F.3d",
                           "F.2d.": "F.2d",
                           "F.3d.": "F.3d",
                           "Fed.R.": "F.",
                           "Fed.R.2d": "F.2d",
                           "Fed.R.3d": "F.3d",
                           "Fed.Rep.": "F.",
                           "Fed.Rep.2d": "F.2d",
                           "Fed.Rep.3d": "F.3d"}}],
    "F. App'x": [{"cite_type": "fed",
                   "editions": {"F. App'x": [{"year":2001, "month":0, "day":1},
                                              {"year":false, "month":false, "day":false}]},
                   "mlz_jurisdiction": ["us;federal;1-cir","us;federal;2-cir","us;federal;3-cir","us;federal;4-cir","us;federal;5-cir","us;federal;6-cir","us;federal;7-cir","us;federal;8-cir","us;federal;9-cir","us;federal;10-cir","us;federal;11-cir"],
                   "name": "Federal Appendix",
                   "variations": {}}],
    "F. Cas.": [{"cite_type": "fed",
                 "editions": {"F. Cas.": [{"year":1789, "month":0, "day":1},
                                          {"year":1880, "month":0, "day":1}]},
                 "mlz_jurisdiction": ["us"],
                 "name": "Federal Cases",
                 "variations": {"F.C.": "F. Cas.",
                                "F.Cas.": "F. Cas.",
                                "Fed.Ca.": "F. Cas."}}],
    "F. Supp.": [{"cite_type": "fed",
                  "editions": {"F. Supp.": [{"year":1932, "month":0, "day":1},
                                            {"year":1988, "month":11, "day":31}],
                               "F. Supp. 2d": [{"year":1988, "month":0, "day":1},
                                               {"year":false, "month":false, "day":false}]},
                  "mlz_jurisdiction": ["us"],
                  "name": "Federal Supplement",
                  "variations": {"F. Supp.2d": "F. Supp. 2d",
                                 "F.Supp.": "F. Supp.",
                                 "F.Supp. 2d": "F. Supp. 2d",
                                 "F.Supp.2d": "F. Supp. 2d"}}],
    "F.R.D.": [{"cite_type": "specialty",
                "editions": {"F.R.D.": [{"year":2001, "month":0, "day":1},
                                        {"year":false, "month":false, "day":false}]},
                "mlz_jurisdiction": ["us"],
                "name": "Federal Rules Decisions",
                "variations": {}}],
    "FL": [{"cite_type": "neutral",
            "editions": {"FL": [{"year":1750, "month":0, "day":1},
                                {"year":false, "month":false, "day":false}]},
            "mlz_jurisdiction": ["us;fl"],
            "name": "Florida Neutral Citation",
            "variations": {}}],
    "Fed. Cl.": [{"cite_type": "specialty",
                  "editions": {"Fed. Cl.": [{"year":1992, "month":0, "day":1},
                                            {"year":false, "month":false, "day":false}]},
                  "mlz_jurisdiction": ["us"],
                  "name": "United States Claims Court Reporter",
                  "variations": {"Fed.Cl.": "Fed. Cl."}}],
    "Fed. R. Serv.": [{"cite_type": "specialty",
                       "editions": {"Fed. R. Serv.": [{"year":1938, "month":0, "day":1},
                                                      {"year":false, "month":false, "day":false}],
                                    "Fed. R. Serv. 2d": [{"year":1938, "month":0, "day":1},
                                                         {"year":false, "month":false, "day":false}],
                                    "Fed. R. Serv. 3d": [{"year":1938, "month":0, "day":1},
                                                         {"year":false, "month":false, "day":false}]},
                       "mlz_jurisdiction": ["us"],
                       "name": "Federal Rules Service",
                       "variations": {"Fed. R. Serv. (Callaghan)": "Fed. R. Serv.",
                                      "Fed. R. Serv. 2d (Callaghan)": "Fed. R. Serv. 2d",
                                      "Fed. R. Serv. 3d (West)": "Fed. R. Serv. 3d"}}],
    "Fla.": [{"cite_type": "state",
              "editions": {"Fla.": [{"year":1846, "month":0, "day":1},
                                    {"year":1948, "month":11, "day":31}]},
              "mlz_jurisdiction": ["us;fl"],
              "name": "Florida Reports",
              "variations": {"Flor.": "Fla.", "Florida": "Fla."}}],
    "Fla. L. Weekly": [{"cite_type": "state",
                        "editions": {"Fla. L. Weekly": [{"year":1978, "month":0, "day":1},
                                                        {"year":false, "month":false, "day":false}]},
                        "mlz_jurisdiction": ["us;fl"],
                        "name": "Florida Law Weekly",
                        "variations": {}}],
    "Fla. L. Weekly Supp.": [{"cite_type": "state",
                              "editions": {"Fla. L. Weekly Supp.": [{"year":1992, "month":0, "day":1},
                                                                    {"year":false, "month":false, "day":false}]},
                              "mlz_jurisdiction": ["us;fl"],
                              "name": "Florida Law Weekly Supplement",
                              "variations": {}}],
    "Fla. Supp.": [{"cite_type": "state",
                    "editions": {"Fla. Supp.": [{"year":1948, "month":0, "day":1},
                                                {"year":1981, "month":11, "day":31}],
                                 "Fla. Supp. 2d": [{"year":1983, "month":0, "day":1},
                                                   {"year":1992, "month":11, "day":31}]},
                    "mlz_jurisdiction": ["us;fl"],
                    "name": "Florida Supplement",
                    "variations": {"Fl.S.": "Fla. Supp."}}],
    "G. & J.": [{"cite_type": "state",
                 "editions": {"G. & J.": [{"year":1829, "month":0, "day":1},
                                          {"year":1842, "month":11, "day":31}]},
                 "mlz_jurisdiction": ["us;md"],
                 "name": "Maryland Reports, Gill & Johnson",
                 "variations": {}}],
    "Ga.": [{"cite_type": "state",
             "editions": {"Ga.": [{"year":1846, "month":0, "day":1},
                                  {"year":false, "month":false, "day":false}]},
             "mlz_jurisdiction": ["us;ga"],
             "name": "Georgia Reports",
             "variations": {}}],
    "Ga. App.": [{"cite_type": "state",
                  "editions": {"Ga. App.": [{"year":1907, "month":0, "day":1},
                                            {"year":false, "month":false, "day":false}]},
                  "mlz_jurisdiction": ["us;ga"],
                  "name": "Georgia Appeals Reports",
                  "variations": {}}],
    "Gild.": [{"cite_type": "state",
               "editions": {"Gild.": [{"year":1883, "month":0, "day":1},
                                      {"year":1889, "month":11, "day":31}]},
               "mlz_jurisdiction": ["us;nm"],
               "name": "Gildersleeve Reports",
               "variations": {"Gildersleeve": "Gild.",
                              "Gildr.": "Gild.",
                              "N.M.(G.)": "Gild.",
                              "N.M.(Gild.)": "Gild."}}],
    "Gill": [{"cite_type": "state",
              "editions": {"Gill": [{"year":1843, "month":0, "day":1},
                                    {"year":1851, "month":11, "day":31}]},
              "mlz_jurisdiction": ["us;md"],
              "name": "Maryland Reports, Gill",
              "variations": {}}],
    "Gilm.": [{"cite_type": "state",
               "editions": {"Gilm.": [{"year":1844, "month":0, "day":1},
                                      {"year":1849, "month":11, "day":31}]},
               "mlz_jurisdiction": ["us;il"],
               "name": "Illinois Reports, Gilman",
               "variations": {"Gilm.(Ill.)": "Gilm.",
                              "Gilman": "Gilm.",
                              "Ill.(Gilm.)": "Gilm."}}],
    "Gilmer": [{"cite_type": "state",
                "editions": {"Gilmer": [{"year":1820, "month":0, "day":1},
                                        {"year":1821, "month":11, "day":31}]},
                "mlz_jurisdiction": ["us;va"],
                "name": "Virginia Reports, Gilmer",
                "variations": {"Gil.": "Gilmer",
                               "Gilm.": "Gilmer",
                               "Gilmer (Va.)": "Gilmer",
                               "Va.(Gilmer)": "Gilmer"}}],
    "Grant": [{"cite_type": "state",
               "editions": {"Grant": [{"year":1814, "month":0, "day":1},
                                      {"year":1863, "month":11, "day":31}]},
               "mlz_jurisdiction": ["us;pa"],
               "name": "Pennsylvania State Reports, Grant",
               "variations": {"Gr.": "Grant",
                              "Grant (Pa.)": "Grant",
                              "Grant Cas.": "Grant",
                              "Grant Cas.(Pa.)": "Grant",
                              "Grant Pa.": "Grant"}}],
    "Gratt.": [{"cite_type": "state",
                "editions": {"Gratt.": [{"year":1844, "month":0, "day":1},
                                        {"year":1880, "month":11, "day":31}]},
                "mlz_jurisdiction": ["us;va"],
                "name": "Virginia Reports, Grattan",
                "variations": {"Gratt.(Va.)": "Gratt.",
                               "Va.(Gratt.)": "Gratt."}}],
    "Gray": [{"cite_type": "state",
              "editions": {"Gray": [{"year":1854, "month":0, "day":1},
                                    {"year":1860, "month":11, "day":31}]},
              "mlz_jurisdiction": ["us;ma"],
              "name": "Massachusetts Reports, Gray",
              "variations": {"Gray (Mass.)": "Gray", "Mass.(Gray)": "Gray"}}],
    "Greene": [{"cite_type": "state",
                "editions": {"Greene": [{"year":1847, "month":0, "day":1},
                                        {"year":1854, "month":11, "day":31}]},
                "mlz_jurisdiction": ["ui;ia"],
                "name": "Iowa Reports, Greene",
                "variations": {"Greene G.(Iowa)": "Greene"}}],
    "Guam": [{"cite_type": "state",
              "editions": {"Guam": [{"year":1955, "month":0, "day":1},
                                    {"year":false, "month":false, "day":false}]},
              "mlz_jurisdiction": ["us;gu"],
              "name": "Guam Reports",
              "variations": {}}],
    "Gunby": [{"cite_type": "state",
               "editions": {"Gunby": [{"year":1885, "month":0, "day":1},
                                      {"year":1885, "month":11, "day":31}]},
               "mlz_jurisdiction": ["us;la"],
               "name": "Louisiana Court of Appeals Reports, Gunby",
               "variations": {"Gunby (La.)": "Gunby"}}],
    "H. & G.": [{"cite_type": "state",
                 "editions": {"H. & G.": [{"year":1826, "month":0, "day":1},
                                          {"year":1829, "month":11, "day":31}]},
                 "mlz_jurisdiction": ["us;md"],
                 "name": "Maryland Reports, Harris and Gill",
                 "variations": {}}],
    "H. & J.": [{"cite_type": "state",
                 "editions": {"H. & J.": [{"year":1800, "month":0, "day":1},
                                          {"year":1826, "month":11, "day":31}]},
                 "mlz_jurisdiction": ["us;md"],
                 "name": "Maryland Reports, Harris and Johnson",
                 "variations": {}}],
    "H. & McH.": [{"cite_type": "state",
                   "editions": {"H. & McH.": [{"year":1770, "month":0, "day":1},
                                              {"year":1799, "month":11, "day":31}]},
                   "mlz_jurisdiction": ["us;md"],
                   "name": "Maryland Reports, Harris and McHenry",
                   "variations": {}}],
    "Hard.": [{"cite_type": "state",
               "editions": {"Hard.": [{"year":1805, "month":0, "day":1},
                                      {"year":1808, "month":11, "day":31}]},
               "mlz_jurisdiction": ["us;ky"],
               "name": "Kentucky Reports, Hardin",
               "variations": {"Hardin": "Hard.",
                              "Hardin(Ky.)": "Hard.",
                              "Ky.(Hard.)": "Hard."}}],
    "Harp.": [{"cite_type": "state",
               "editions": {"Harp.": [{"year":1823, "month":0, "day":1},
                                      {"year":1831, "month":11, "day":31}]},
               "mlz_jurisdiction": ["us;sc"],
               "name": "South Carolina Reports, Harper",
               "variations": {"Harp.L.": "Harp.",
                              "Harp.L.(S.C.)": "Harp.",
                              "Harper": "Harp.",
                              "S.C.L.(Harp.)": "Harp."}}],
    "Harp. Eq.": [{"cite_type": "state",
                   "editions": {"Harp. Eq.": [{"year":1824, "month":0, "day":1},
                                              {"year":1824, "month":11, "day":31}]},
                   "mlz_jurisdiction": ["us;sc"],
                   "name": "South Carolina Reports, Harper's Equity",
                   "variations": {"Harp.": "Harp. Eq.",
                                  "Harp.Eq.(S.C.)": "Harp. Eq.",
                                  "Harper": "Harp. Eq.",
                                  "S.C.Eq.(Harp.Eq.)": "Harp. Eq."}}],
    "Harrington": [{"cite_type": "state",
                    "editions": {"Harrington": [{"year":1832, "month":0, "day":1},
                                                {"year":1855, "month":11, "day":31}]},
                    "mlz_jurisdiction": ["us;de"],
                    "name": "Delaware Reports, Harrington",
                    "variations": {}}],
    "Haw.": [{"cite_type": "state",
              "editions": {"Haw.": [{"year":1847, "month":0, "day":1},
                                    {"year":false, "month":false, "day":false}]},
              "mlz_jurisdiction": ["us;hi"],
              "name": "Hawaii Reports",
              "variations": {"H.": "Haw.",
                             "Hawai`i": "Haw.",
                             "Hawaii": "Haw.",
                             "Hawaii Rep.": "Haw."}}],
    "Haw. App.": [{"cite_type": "state",
                   "editions": {"Haw. App.": [{"year":1980, "month":0, "day":1},
                                              {"year":1994, "month":11, "day":31}]},
                   "mlz_jurisdiction": ["us;hi"],
                   "name": "Hawaii Appellate Reports",
                   "variations": {"Hawaii App.": "Haw. App."}}],
    "Hawks": [{"cite_type": "state",
               "editions": {"Hawks": [{"year":1820, "month":0, "day":1},
                                      {"year":1826, "month":11, "day":31}]},
               "mlz_jurisdiction": ["us;nc"],
               "name": "North Carolina Reports, Hawks",
               "variations": {"Hawks(N.C.)": "Hawks", "N.C.(Hawks)": "Hawks"}}],
    "Hay. & Haz.": [{"cite_type": "state",
                     "editions": {"Hay. & Haz.": [{"year":1841, "month":0, "day":1},
                                                  {"year":1862, "month":11, "day":31}]},
                     "mlz_jurisdiction": ["us;dc"],
                     "name": "District of Columbia Reports, Hayward & Hazelton",
                     "variations": {"Hayw.& H.": "Hay. & Haz."}}],
    "Hayw.": [{"cite_type": "state",
               "editions": {"Hayw.": [{"year":1789, "month":0, "day":1},
                                      {"year":1806, "month":11, "day":31}]},
               "mlz_jurisdiction": ["us;nc"],
               "name": "North Carolina Reports, Haywood",
               "variations": {"Hay.": "Hayw.",
                              "Hayw.N.C.": "Hayw.",
                              "N.C.(Hayw.)": "Hayw."}},
              {"cite_type": "state",
               "editions": {"Hayw.": [{"year":1816, "month":0, "day":1},
                                      {"year":1818, "month":11, "day":31}]},
               "mlz_jurisdiction": ["us;tn"],
               "name": "Tennessee Reports, Haywood",
               "variations": {"Hayw.(Tenn.)": "Hayw.",
                              "Hayw.Tenn.": "Hayw.",
                              "Tenn.(Hayw.)": "Hayw."}}],
    "Head": [{"cite_type": "state",
              "editions": {"Head": [{"year":1858, "month":0, "day":1},
                                    {"year":1860, "month":11, "day":31}]},
              "mlz_jurisdiction": ["us;tn"],
              "name": "Tennessee Reports, Head",
              "variations": {"Head(Tenn.)": "Head", "Tenn.(Head)": "Head"}}],
    "Heisk.": [{"cite_type": "state",
                "editions": {"Heisk.": [{"year":1870, "month":0, "day":1},
                                        {"year":1879, "month":11, "day":31}]},
                "mlz_jurisdiction": ["us;tn"],
                "name": "Tennessee Reports, Heiskell",
                "variations": {"Heisk.(Tenn.)": "Heisk.",
                               "Tenn.(Heisk.)": "Heisk."}}],
    "Hen. & M.": [{"cite_type": "state",
                   "editions": {"Hen. & M.": [{"year":1806, "month":0, "day":1},
                                              {"year":1810, "month":11, "day":31}]},
                   "mlz_jurisdiction": ["us;va"],
                   "name": "Virginia Reports, Hening & Munford",
                   "variations": {"H.& M.": "Hen. & M.",
                                  "H.& M.(Va.)": "Hen. & M.",
                                  "Hen.& Mun.": "Hen. & M.",
                                  "Va.(Hen.& M.)": "Hen. & M."}}],
    "Hill": [{"cite_type": "state",
              "editions": {"Hill": [{"year":1841, "month":0, "day":1},
                                    {"year":1844, "month":11, "day":31}]},
              "mlz_jurisdiction": ["us;ny"],
              "name": "Hill's New York Reports",
              "variations": {"H.": "Hill", "Hill.N.Y.": "Hill"}},
             {"cite_type": "state",
              "editions": {"Hill": [{"year":1833, "month":0, "day":1},
                                    {"year":1837, "month":11, "day":31}]},
              "mlz_jurisdiction": ["us;sc"],
              "name": "South Carolina Reports, Hill",
              "variations": {"Hill Law": "Hill",
                             "Hill S.C.": "Hill",
                             "S.C.L.(Hill)": "Hill"}}],
    "Hill & Den.": [{"cite_type": "state",
                     "editions": {"Hill & Den.": [{"year":1842, "month":0, "day":1},
                                                  {"year":1844, "month":11, "day":31}]},
                     "mlz_jurisdiction": ["us;ny"],
                     "name": "Hill and Denio Supplement (Lalor)",
                     "variations": {"Hill & D.Supp.": "Hill & Den.",
                                    "Hill & Den.Supp.": "Hill & Den.",
                                    "Lalor": "Hill & Den.",
                                    "Lalor Supp.": "Hill & Den."}}],
    "Hill Eq.": [{"cite_type": "state",
                  "editions": {"Hill Eq.": [{"year":1833, "month":0, "day":1},
                                            {"year":1837, "month":11, "day":31}]},
                  "mlz_jurisdiction": ["us;sc"],
                  "name": "South Carolina Reports, Hill's Chancery",
                  "variations": {"Hill": "Hill Eq.",
                                 "Hill Ch.": "Hill Eq.",
                                 "Hill Eq.(S.C.)": "Hill Eq.",
                                 "Hill S.C.": "Hill Eq.",
                                 "S.C.Eq.(Hill Eq.)": "Hill Eq."}}],
    "Hoff. Ch.": [{"cite_type": "state",
                   "editions": {"Hoff. Ch.": [{"year":1838, "month":0, "day":1},
                                              {"year":1840, "month":11, "day":31}]},
                   "mlz_jurisdiction": ["us;ny"],
                   "name": "Hoffman's Chancery Reports",
                   "variations": {"Hoff.": "Hoff. Ch.",
                                  "Hoff.Cha.": "Hoff. Ch.",
                                  "Hoff.N.Y.": "Hoff. Ch.",
                                  "Hoffm.": "Hoff. Ch.",
                                  "Hoffm.Ch.(N.Y.)": "Hoff. Ch."}}],
    "Hopk. Ch.": [{"cite_type": "state",
                   "editions": {"Hopk. Ch.": [{"year":1823, "month":0, "day":1},
                                              {"year":1826, "month":11, "day":31}]},
                   "mlz_jurisdiction": ["us;ny"],
                   "name": "Hopkins' Chancery Reports",
                   "variations": {}}],
    "Houston": [{"cite_type": "state",
                 "editions": {"Houston": [{"year":1855, "month":0, "day":1},
                                          {"year":1893, "month":11, "day":31}]},
                 "mlz_jurisdiction": ["us;de"],
                 "name": "Delaware Reports, Houston",
                 "variations": {}}],
    "How.": [{"cite_type": "scotus_early",
              "editions": {"How.": [{"year":1843, "month":0, "day":1},
                                    {"year":1860, "month":11, "day":31}]},
              "mlz_jurisdiction": ["us;federal;supreme.court"],
              "name": "Howard's Supreme Court Reports",
              "variations": {"U.S.(How.)": "How."}}],
    "How. Pr.": [{"cite_type": "state",
                  "editions": {"How. Pr.": [{"year":1844, "month":0, "day":1},
                                            {"year":1886, "month":11, "day":31}]},
                  "mlz_jurisdiction": ["us;ny"],
                  "name": "Howard's Practice Reports",
                  "variations": {"How.P.R.": "How. Pr.",
                                 "How.Prac.(N.Y.)": "How. Pr.",
                                 "N.Y.Spec.Term R.": "How. Pr.",
                                 "N.Y.Spec.Term Rep.": "How. Pr."}}],
    "Howard": [{"cite_type": "state",
                "editions": {"Howard": [{"year":1834, "month":0, "day":1},
                                        {"year":1843, "month":11, "day":31}]},
                "mlz_jurisdiction": ["us;ms"],
                "name": "Mississippi Reports, Howard",
                "variations": {"How.": "Howard", "Miss.(Howard)": "Howard"}}],
    "Hughes": [{"cite_type": "state",
                "editions": {"Hughes": [{"year":1785, "month":0, "day":1},
                                        {"year":1801, "month":11, "day":31}]},
                "mlz_jurisdiction": ["us;ky"],
                "name": "Kentucky Reports, Hughes",
                "variations": {"Hugh.": "Hughes", "Ky.(Hughes)": "Hughes"}}],
    "Hum.": [{"cite_type": "state",
              "editions": {"Hum.": [{"year":1839, "month":0, "day":1},
                                    {"year":1851, "month":11, "day":31}]},
              "mlz_jurisdiction": ["us;tn"],
              "name": "Tennessee Reports, Humphreys",
              "variations": {"Humph.": "Hum.", "Tenn.(Hum.)": "Hum."}}],
    "I.T.R.D. (BNA)": [{"cite_type": "specialty",
                        "editions": {"I.T.R.D. (BNA)": [{"year":1980, "month":0, "day":1},
                                                        {"year":false, "month":false, "day":false}]},
                        "mlz_jurisdiction": ["us"],
                        "name": "International Trade Reporter Decisions",
                        "variations": {}}],
    "Idaho": [{"cite_type": "state",
               "editions": {"Idaho": [{"year":1982, "month":0, "day":1},
                                      {"year":false, "month":false, "day":false}]},
               "mlz_jurisdiction": ["us;id"],
               "name": "Idaho Reports",
               "variations": {"Id.": "Idaho", "Ida.": "Idaho"}}],
    "Ill.": [{"cite_type": "state",
              "editions": {"Ill.": [{"year":1849, "month":0, "day":1},
                                    {"year":false, "month":false, "day":false}],
                           "Ill. 2d": [{"year":1849, "month":0, "day":1},
                                       {"year":false, "month":false, "day":false}]},
              "mlz_jurisdiction": ["us;il"],
              "name": "Illinois Reports",
              "variations": {"Ill.2d": "Ill. 2d"}}],
    "Ill. App.": [{"cite_type": "state",
                   "editions": {"Ill. App.": [{"year":1877, "month":0, "day":1},
                                              {"year":false, "month":false, "day":false}],
                                "Ill. App. 2d": [{"year":1877, "month":0, "day":1},
                                                 {"year":false, "month":false, "day":false}],
                                "Ill. App. 3d": [{"year":1877, "month":0, "day":1},
                                                 {"year":false, "month":false, "day":false}]},
                   "mlz_jurisdiction": ["us;il"],
                   "name": "Illinois Appellate Court Reports",
                   "variations": {"Ill. App.2d": "Ill. App. 2d",
                                  "Ill. App.3d": "Ill. App. 3d",
                                  "Ill.A.": "Ill. App.",
                                  "Ill.A.2d": "Ill. App. 2d",
                                  "Ill.A.3d": "Ill. App. 3d",
                                  "Ill.App.": "Ill. App.",
                                  "Ill.App.2d": "Ill. App. 2d",
                                  "Ill.App.3d": "Ill. App. 3d"}}],
    "Ill. Ct. Cl.": [{"cite_type": "state",
                      "editions": {"Ill. Ct. Cl.": [{"year":1889, "month":0, "day":1},
                                                    {"year":false, "month":false, "day":false}]},
                      "mlz_jurisdiction": ["us;il"],
                      "name": "Illinois Court of Claims Reports",
                      "variations": {}}],
    "Ill. Dec.": [{"cite_type": "state",
                   "editions": {"Ill. Dec.": [{"year":1976, "month":0, "day":1},
                                              {"year":false, "month":false, "day":false}]},
                   "mlz_jurisdiction": ["us;il"],
                   "name": "West's Illinois Decisions",
                   "variations": {"Ill.Dec.": "Ill. Dec.",
                                  "Ill.Decs.": "Ill. Dec."}}],
    "Ind.": [{"cite_type": "state",
              "editions": {"Ind.": [{"year":1848, "month":0, "day":1},
                                    {"year":1981, "month":11, "day":31}]},
              "mlz_jurisdiction": ["us;in"],
              "name": "Indiana Reports",
              "variations": {"Ind.Rep.": "Ind."}}],
    "Ind. App.": [{"cite_type": "state",
                   "editions": {"Ind. App.": [{"year":1890, "month":0, "day":1},
                                              {"year":1979, "month":11, "day":31}]},
                   "mlz_jurisdiction": ["us;in"],
                   "name": "Indiana Court of Appeals Reports",
                   "variations": {}}],
    "Indian Terr.": [{"cite_type": "state",
                      "editions": {"Indian Terr.": [{"year":1896, "month":0, "day":1},
                                                    {"year":1907, "month":11, "day":31}]},
                      "mlz_jurisdiction": ["us;ok"],
                      "name": "Indian Territory Reports",
                      "variations": {}}],
    "Iowa": [{"cite_type": "state",
              "editions": {"Iowa": [{"year":1855, "month":0, "day":1},
                                    {"year":1968, "month":11, "day":31}]},
              "mlz_jurisdiction": ["us;ia"],
              "name": "Iowa Reports",
              "variations": {}}],
    "Ired.": [{"cite_type": "state",
               "editions": {"Ired.": [{"year":1840, "month":0, "day":1},
                                      {"year":1852, "month":11, "day":31}]},
               "mlz_jurisdiction": ["us;nc"],
               "name": "North Carolina Reports, Iredell's Law",
               "variations": {"Ired.L.": "Ired.",
                              "Ired.L.(N.C.)": "Ired.",
                              "N.C.(Ired.)": "Ired."}}],
    "Ired. Eq.": [{"cite_type": "state",
                   "editions": {"Ired. Eq.": [{"year":1840, "month":0, "day":1},
                                              {"year":1852, "month":11, "day":31}]},
                   "mlz_jurisdiction": ["us;nc"],
                   "name": "North Carolina Reports, Iredell's Equity",
                   "variations": {"Ired.": "Ired. Eq.",
                                  "Ired.Eq.(N.C.)": "Ired. Eq.",
                                  "N.C.(Ired.Eq.)": "Ired. Eq."}}],
    "J.J. Marsh.": [{"cite_type": "state",
                     "editions": {"J.J. Marsh.": [{"year":1829, "month":0, "day":1},
                                                  {"year":1832, "month":11, "day":31}]},
                     "mlz_jurisdiction": ["us;ky"],
                     "name": "Kentucky Reports, Marshall, J.J.",
                     "variations": {"J.J.Mar.": "J.J. Marsh.",
                                    "J.J.Marsh.(Ky.)": "J.J. Marsh.",
                                    "Ky.(J.J.Marsh.)": "J.J. Marsh.",
                                    "Marsh.": "J.J. Marsh.",
                                    "Marsh.(Ky.)": "J.J. Marsh.",
                                    "Marsh.J.J.": "J.J. Marsh."}}],
    "Johns.": [{"cite_type": "state",
                "editions": {"Johns.": [{"year":1806, "month":0, "day":1},
                                        {"year":1823, "month":11, "day":31}]},
                "mlz_jurisdiction": ["us;ny"],
                "name": "Johnson's Reports",
                "variations": {"J.": "Johns.",
                               "John.": "Johns.",
                               "Johns.Ct.Err.": "Johns.",
                               "Johns.N.Y.": "Johns.",
                               "Johns.Rep.": "Johns.",
                               "Johnson": "Johns."}}],
    "Johns. Cas.": [{"cite_type": "state",
                     "editions": {"Johns. Cas.": [{"year":1799, "month":0, "day":1},
                                                  {"year":1803, "month":11, "day":31}]},
                     "mlz_jurisdiction": ["us;ny"],
                     "name": "Johnson's Cases",
                     "variations": {"Johns.Cas.(N.Y.)": "Johns. Cas."}}],
    "Johns. Ch.": [{"cite_type": "state",
                    "editions": {"Johns. Ch.": [{"year":1814, "month":0, "day":1},
                                                {"year":1823, "month":11, "day":31}]},
                    "mlz_jurisdiction": ["us;ny"],
                    "name": "Johnsons' Chancery Reports",
                    "variations": {"J.Ch.": "Johns. Ch.",
                                   "Johns.": "Johns. Ch.",
                                   "Johns.(N.Y.)": "Johns. Ch.",
                                   "Johns.Ch.(N.Y.)": "Johns. Ch.",
                                   "Johns.Ch.Cas.": "Johns. Ch.",
                                   "Johns.Rep.": "Johns. Ch.",
                                   "Johnson": "Johns. Ch."}}],
    "Jones": [{"cite_type": "state",
               "editions": {"Jones": [{"year":1853, "month":0, "day":1},
                                      {"year":1862, "month":11, "day":31}]},
               "mlz_jurisdiction": ["us;nc"],
               "name": "North Carolina Reports, Jones' Law",
               "variations": {"Jones L.": "Jones",
                              "Jones N.C.": "Jones",
                              "N.C.(Jones)": "Jones"}}],
    "Jones Eq.": [{"cite_type": "state",
                   "editions": {"Jones Eq.": [{"year":1853, "month":0, "day":1},
                                              {"year":1863, "month":11, "day":31}]},
                   "mlz_jurisdiction": ["us;nc"],
                   "name": "North Carolina Reports, Jones' Equity",
                   "variations": {"Jones": "Jones Eq.",
                                  "N.C.(Jones Eq.)": "Jones Eq."}}],
    "Kan.": [{"cite_type": "state",
              "editions": {"Kan.": [{"year":1862, "month":0, "day":1},
                                    {"year":false, "month":false, "day":false}]},
              "mlz_jurisdiction": ["us;ks"],
              "name": "Kansas Reports",
              "variations": {"Kans.": "Kan."}}],
    "Kan. App.": [{"cite_type": "state",
                   "editions": {"Kan. App.": [{"year":1895, "month":0, "day":1},
                                              {"year":1901, "month":11, "day":31}],
                                "Kan. App. 2d": [{"year":1977, "month":0, "day":1},
                                                 {"year":false, "month":false, "day":false}]},
                   "mlz_jurisdiction": ["us;ks"],
                   "name": "Kansas Court of Appeals Reports",
                   "variations": {"Kan. App.2d": "Kan. App. 2d",
                                  "Kan.App.": "Kan. App.",
                                  "Kan.App. 2d": "Kan. App. 2d",
                                  "Kan.App.2d": "Kan. App. 2d",
                                  "Kans.App.": "Kan. App."}}],
    "Kirby": [{"cite_type": "state",
               "editions": {"Kirby": [{"year":1785, "month":0, "day":1},
                                      {"year":1789, "month":11, "day":31}]},
               "mlz_jurisdiction": ["us;ct"],
               "name": "Kirby's Connecticut Reports",
               "variations": {"Kir.": "Kirby", "Kirb.": "Kirby"}}],
    "Ky.": [{"cite_type": "state",
             "editions": {"Ky.": [{"year":1879, "month":0, "day":1},
                                  {"year":1951, "month":11, "day":31}]},
             "mlz_jurisdiction": ["us;ky"],
             "name": "Kentucky Reports",
             "variations": {}}],
    "Ky. App.": [{"cite_type": "state",
                  "editions": {"Ky. App.": [{"year":1994, "month":0, "day":1},
                                            {"year":2000, "month":11, "day":31}]},
                  "mlz_jurisdiction": ["us;ky"],
                  "name": "Kentucky Appellate Reporter",
                  "variations": {}}],
    "Ky. L. Rptr.": [{"cite_type": "state",
                      "editions": {"Ky. L. Rptr.": [{"year":1880, "month":0, "day":1},
                                                    {"year":1908, "month":11, "day":31}]},
                      "mlz_jurisdiction": ["us;ky"],
                      "name": "Kentucky Law Reporter",
                      "variations": {"Ken.L.Re.": "Ky. L. Rptr.",
                                     "Ky.L.R.": "Ky. L. Rptr.",
                                     "Ky.Law.Rep.": "Ky. L. Rptr."}}],
    "Ky. L. Summ.": [{"cite_type": "state",
                      "editions": {"Ky. L. Summ.": [{"year":1966, "month":0, "day":1},
                                                    {"year":false, "month":false, "day":false}]},
                      "mlz_jurisdiction": ["us;ky"],
                      "name": "Kentucky Law Summary",
                      "variations": {}}],
    "Ky. Op.": [{"cite_type": "state",
                 "editions": {"Ky. Op.": [{"year":1864, "month":0, "day":1},
                                          {"year":1886, "month":11, "day":31}]},
                 "mlz_jurisdiction": ["us;ky"],
                 "name": "Kentucky Opinions",
                 "variations": {"Ken.Opin.": "Ky. Op."}}],
    "L. Ed.": [{"cite_type": "fed",
                "editions": {"L. Ed.": [{"year":1790, "month":0, "day":1},
                                        {"year":1956, "month":11, "day":31}],
                             "L. Ed. 2d": [{"year":1956, "month":0, "day":1},
                                           {"year":false, "month":false, "day":false}]},
                "mlz_jurisdiction": ["us;federal;supreme.court"],
                "name": "Lawyer's Edition",
                "variations": {"L Ed": "L. Ed.",
                               "L Ed 2d": "L. Ed. 2d",
                               "L. Ed.2d": "L. Ed. 2d",
                               "L.E.": "L. Ed.",
                               "L.E.2d": "L. Ed. 2d",
                               "L.Ed.": "L. Ed.",
                               "L.Ed. 2d": "L. Ed. 2d",
                               "L.Ed.(U.S.)": "L. Ed.",
                               "L.Ed.2d": "L. Ed. 2d",
                               "LAW ED": "L. Ed.",
                               "Law.Ed.": "L. Ed.",
                               "U.S.L.Ed.": "L. Ed.",
                               "U.S.L.Ed.2d": "L. Ed. 2d",
                               "U.S.Law.Ed.": "L. Ed."}}],
    "LA": [{"cite_type": "neutral",
            "editions": {"LA": [{"year":1750, "month":0, "day":1},
                                {"year":false, "month":false, "day":false}]},
            "mlz_jurisdiction": ["us;la"],
            "name": "Louisiana Neutral Citation",
            "variations": {}}],
    "La.": [{"cite_type": "state",
             "editions": {"La.": [{"year":1830, "month":0, "day":1},
                                  {"year":1972, "month":11, "day":31}]},
             "mlz_jurisdiction": ["us;la"],
             "name": "Louisiana Reports",
             "variations": {}}],
    "La. Ann.": [{"cite_type": "state",
                  "editions": {"La. Ann.": [{"year":1846, "month":0, "day":1},
                                            {"year":1900, "month":11, "day":31}]},
                  "mlz_jurisdiction": ["us;la"],
                  "name": "Louisiana Annual Reports",
                  "variations": {}}],
    "La. App.": [{"cite_type": "state",
                  "editions": {"La. App.": [{"year":1924, "month":0, "day":1},
                                            {"year":1932, "month":11, "day":31}]},
                  "mlz_jurisdiction": ["us;la"],
                  "name": "Louisiana Court of Appeals Reports",
                  "variations": {"La.A.": "La. App."}}],
    "Lans.": [{"cite_type": "state",
               "editions": {"Lans.": [{"year":1869, "month":0, "day":1},
                                      {"year":1873, "month":11, "day":31}]},
               "mlz_jurisdiction": ["us;ny"],
               "name": "Lansing's Reports",
               "variations": {}}],
    "Lans. Ch.": [{"cite_type": "state",
                   "editions": {"Lans. Ch.": [{"year":1824, "month":0, "day":1},
                                              {"year":1826, "month":11, "day":31}]},
                   "mlz_jurisdiction": ["us;ny"],
                   "name": "Lansing's Chancery Reports",
                   "variations": {"L.": "Lans. Ch.", "Lans.": "Lans. Ch."}}],
    "LEXIS": [{"cite_type": "specialty",
               "editions": {"LEXIS": [{"year":1750, "month":0, "day":1},
                                      {"year":false, "month":false, "day":false}]},
               "mlz_jurisdiction": ["us;ct","us;de","us;dc","us;me","us;nh","us;nj","us;pa","us;ri","us;vt","us;il","us;in","us;ma","us;ny","us;oh","us;ia","us;mi","us;mn","us;ne","us;nd","us;sd","us;wi","us;ak","us;az","us;ca","us;co","us;hi","us;id","us;ks","us;mt","us;nv","us;nm","us;ok","us;or","us;ut","us;wa","us;wy","us;ga","us;nc","us;sc","us;va","us;wv","us;ar","us;ky","us;mo","us;tn","us;tx","us;al","us;fl","us;la","us;ms","us;federal;1-cir","us;federal;2-cir","us;federal;3-cir","us;federal;4-cir","us;federal;5-cir","us;federal;6-cir","us;federal;7-cir","us;federal;8-cir","us;federal;9-cir","us;federal;10-cir","us;federal;11-cir"],
               "name": "Lexis Nexus Citation",
               "variations": {}}],
    "Leigh": [{"cite_type": "state",
               "editions": {"Leigh": [{"year":1829, "month":0, "day":1},
                                      {"year":1842, "month":11, "day":31}]},
               "mlz_jurisdiction": ["us;va"],
               "name": "Virginia Reports, Leigh",
               "variations": {"Leigh (Va.)": "Leigh", "Va.(Leigh)": "Leigh"}}],
    "Litt.": [{"cite_type": "state",
               "editions": {"Litt.": [{"year":1822, "month":0, "day":1},
                                      {"year":1824, "month":11, "day":31}]},
               "mlz_jurisdiction": ["us;ky"],
               "name": "Kentucky Reports, Littell",
               "variations": {"Ky.(Litt.)": "Litt.",
                              "Lit.": "Litt.",
                              "Litt.(Ky.)": "Litt.",
                              "Littell": "Litt."}}],
    "Litt. Sel. Cas.": [{"cite_type": "state",
                         "editions": {"Litt. Sel. Cas.": [{"year":1795, "month":0, "day":1},
                                                          {"year":1821, "month":11, "day":31}]},
                         "mlz_jurisdiction": ["us;ky"],
                         "name": "Kentucky Reports, Littell's Selected Cases",
                         "variations": {"Ky.(Lit.Sel.Cas.)": "Litt. Sel. Cas.",
                                        "Lit.Sel.Ca.": "Litt. Sel. Cas."}}],
    "Lock. Rev. Cas.": [{"cite_type": "state",
                         "editions": {"Lock. Rev. Cas.": [{"year":1799, "month":0, "day":1},
                                                          {"year":1847, "month":11, "day":31}]},
                         "mlz_jurisdiction": ["us;ny"],
                         "name": "Lockwood's Reversed Cases",
                         "variations": {}}],
    "M.J.": [{"cite_type": "specialty",
              "editions": {"M.J.": [{"year":1975, "month":0, "day":1},
                                    {"year":false, "month":false, "day":false}]},
              "mlz_jurisdiction": ["us"],
              "name": "Military Justice Reporter",
              "variations": {"M. J.": "M.J."}}],
    "ME": [{"cite_type": "neutral",
            "editions": {"ME": [{"year":1750, "month":0, "day":1},
                                {"year":false, "month":false, "day":false}]},
            "mlz_jurisdiction": ["us;me"],
            "name": "Maine Neutral Citation",
            "variations": {}}],
    "MS": [{"cite_type": "neutral",
            "editions": {"MS": [{"year":1750, "month":0, "day":1},
                                {"year":false, "month":false, "day":false}]},
            "mlz_jurisdiction": ["us;ms"],
            "name": "Mississippi Neutral Citation",
            "variations": {}}],
    "MT": [{"cite_type": "neutral",
            "editions": {"MT": [{"year":1750, "month":0, "day":1},
                                {"year":false, "month":false, "day":false}]},
            "mlz_jurisdiction": ["us;mt"],
            "name": "Montana Neutral Citation",
            "variations": {}}],
    "MacArth.": [{"cite_type": "state",
                  "editions": {"MacArth.": [{"year":1873, "month":0, "day":1},
                                            {"year":1879, "month":11, "day":31}]},
                  "mlz_jurisdiction": ["us;dc"],
                  "name": "District of Columbia Reports, MacArthur",
                  "variations": {"D.C.(MacArth.)": "MacArth.",
                                 "MacAr.": "MacArth.",
                                 "MacArthur": "MacArth."}}],
    "MacArth. & M.": [{"cite_type": "state",
                       "editions": {"MacArth. & M.": [{"year":1879, "month":0, "day":1},
                                                      {"year":1880, "month":11, "day":31}]},
                       "mlz_jurisdiction": ["us;dc"],
                       "name": "District of Columbia Reports, MacArthur and Mackey",
                       "variations": {"D.C.(MacArth.& M.)": "MacArth. & M.",
                                      "MacAr.& M.": "MacArth. & M.",
                                      "MacAr.& Mackey": "MacArth. & M.",
                                      "MacArth.& M.(Dist.Col.)": "MacArth. & M.",
                                      "MacArthur & M.": "MacArth. & M."}}],
    "Mackey": [{"cite_type": "state",
                "editions": {"Mackey": [{"year":1863, "month":0, "day":1},
                                        {"year":1892, "month":11, "day":31}]},
                "mlz_jurisdiction": ["us;dc"],
                "name": "District of Columbia Reports, Mackey",
                "variations": {"D.C.(Mackey)": "Mackey"}}],
    "Mart.": [{"cite_type": "state",
               "editions": {"Mart.": [{"year":1809, "month":0, "day":1},
                                      {"year":1830, "month":11, "day":31}]},
               "mlz_jurisdiction": ["us;la"],
               "name": "Louisiana Reports, Martin",
               "variations": {}},
              {"cite_type": "state",
               "editions": {"Mart.": [{"year":1778, "month":0, "day":1},
                                      {"year":1797, "month":11, "day":31}]},
               "mlz_jurisdiction": ["us;nc"],
               "name": "North Carolina Reports, Martin",
               "variations": {"Mart.Dec.": "Mart.",
                              "Mart.N.C.": "Mart.",
                              "Martin": "Mart.",
                              "N.C.(Mart.)": "Mart."}}],
    "Mart. & Yer.": [{"cite_type": "state",
                      "editions": {"Mart. & Yer.": [{"year":1825, "month":0, "day":1},
                                                    {"year":1828, "month":11, "day":31}]},
                      "mlz_jurisdiction": ["us;tn"],
                      "name": "Tennessee Reports, Martin & Yerger",
                      "variations": {"M.& Y.": "Mart. & Yer.",
                                     "M.& Y.R.": "Mart. & Yer.",
                                     "Mart.& Y.": "Mart. & Yer.",
                                     "Mart.& Y.(Tenn.)": "Mart. & Yer.",
                                     "Mart.& Yerg.": "Mart. & Yer."}}],
    "Marvel": [{"cite_type": "state",
                "editions": {"Marvel": [{"year":1893, "month":0, "day":1},
                                        {"year":1897, "month":11, "day":31}]},
                "mlz_jurisdiction": ["us;de"],
                "name": "Delaware Reports, Marvel",
                "variations": {}}],
    "Mass.": [{"cite_type": "state",
               "editions": {"Mass.": [{"year":1867, "month":0, "day":1},
                                      {"year":false, "month":false, "day":false}]},
               "mlz_jurisdiction": ["us;ma"],
               "name": "Massachusetts Reports",
               "variations": {"Ma.": "Mass.", "Mas.": "Mass."}}],
    "Mass. App. Ct.": [{"cite_type": "state",
                        "editions": {"Mass. App. Ct.": [{"year":1972, "month":0, "day":1},
                                                        {"year":false, "month":false, "day":false}]},
                        "mlz_jurisdiction": ["us;ma"],
                        "name": "Massachusetts Appeals Court Reports",
                        "variations": {"Ma.A.": "Mass. App. Ct."}}],
    "Mass. App. Dec.": [{"cite_type": "state",
                         "editions": {"Mass. App. Dec.": [{"year":1941, "month":0, "day":1},
                                                          {"year":1977, "month":11, "day":31}]},
                         "mlz_jurisdiction": ["us;ma"],
                         "name": "Massachusetts Appellate Decisions",
                         "variations": {}}],
    "Mass. App. Div.": [{"cite_type": "state",
                         "editions": {"Mass. App. Div.": [{"year":1936, "month":0, "day":1},
                                                          {"year":false, "month":false, "day":false}]},
                         "mlz_jurisdiction": ["us;ma"],
                         "name": "Reports of Massachusetts Appellate Division",
                         "variations": {}}],
    "Mass. Supp.": [{"cite_type": "state",
                     "editions": {"Mass. Supp.": [{"year":1980, "month":0, "day":1},
                                                  {"year":1983, "month":11, "day":31}]},
                     "mlz_jurisdiction": ["us;ma"],
                     "name": "Massachusetts Reports Supplement",
                     "variations": {}}],
    "McCahon": [{"cite_type": "state",
                 "editions": {"McCahon": [{"year":1858, "month":0, "day":1},
                                          {"year":1868, "month":11, "day":31}]},
                 "mlz_jurisdiction": ["us;ks"],
                 "name": "Kansas Reports, McCahon",
                 "variations": {"McCah.": "McCahon"}}],
    "McCord": [{"cite_type": "state",
                "editions": {"McCord": [{"year":1821, "month":0, "day":1},
                                        {"year":1828, "month":11, "day":31}]},
                "mlz_jurisdiction": ["us;sc"],
                "name": "South Carolina Reports, McCord",
                "variations": {"S.C.L.(McCord)": "McCord"}}],
    "McCord Eq.": [{"cite_type": "state",
                    "editions": {"McCord Eq.": [{"year":1825, "month":0, "day":1},
                                                {"year":1827, "month":11, "day":31}]},
                    "mlz_jurisdiction": ["us;sc"],
                    "name": "South Carolina Reports, McCord's Chancery",
                    "variations": {"McCord Ch.": "McCord Eq.",
                                   "S.C.L.(McCord Eq.)": "McCord Eq."}}],
    "McGl.": [{"cite_type": "state",
               "editions": {"McGl.": [{"year":1881, "month":0, "day":1},
                                      {"year":1884, "month":11, "day":31}]},
               "mlz_jurisdiction": ["us;la"],
               "name": "Louisiana Court of Appeals Reports, McGloin",
               "variations": {"McGloin": "McGl."}}],
    "McMul.": [{"cite_type": "state",
                "editions": {"McMul.": [{"year":1840, "month":0, "day":1},
                                        {"year":1842, "month":11, "day":31}]},
                "mlz_jurisdiction": ["us;sc"],
                "name": "South Carolina Reports, McMullen",
                "variations": {"McMul.L.(S.C.)": "McMul.",
                               "S.C.L.(McMul.)": "McMul."}}],
    "McMul. Eq.": [{"cite_type": "state",
                    "editions": {"McMul. Eq.": [{"year":1840, "month":0, "day":1},
                                                {"year":1842, "month":11, "day":31}]},
                    "mlz_jurisdiction": ["us;sc"],
                    "name": "South Carolina Reports, McMullen's Equity",
                    "variations": {"McMul.Eq.(S.C.)": "McMul. Eq.",
                                   "S.C.L.(McMullan Eq.)": "McMul. Eq."}}],
    "Md.": [{"cite_type": "state",
             "editions": {"Md.": [{"year":1851, "month":0, "day":1},
                                  {"year":false, "month":false, "day":false}]},
             "mlz_jurisdiction": ["us;md"],
             "name": "Maryland Reports",
             "variations": {"Maryland": "Md."}}],
    "Md. App.": [{"cite_type": "state",
                  "editions": {"Md. App.": [{"year":1967, "month":0, "day":1},
                                            {"year":false, "month":false, "day":false}]},
                  "mlz_jurisdiction": ["us;md"],
                  "name": "Maryland Appellate Reports",
                  "variations": {}}],
    "Me.": [{"cite_type": "state",
             "editions": {"Me.": [{"year":1820, "month":0, "day":1},
                                  {"year":1965, "month":11, "day":31}]},
             "mlz_jurisdiction": ["us;me"],
             "name": "Maine Reports",
             "variations": {"Mai.": "Me.", "Maine": "Me."}}],
    "Meigs": [{"cite_type": "state",
               "editions": {"Meigs": [{"year":1838, "month":0, "day":1},
                                      {"year":1839, "month":11, "day":31}]},
               "mlz_jurisdiction": ["us;tn"],
               "name": "Tennessee Reports, Meigs",
               "variations": {"Tenn.(Meigs)": "Meigs"}}],
    "Met.": [{"cite_type": "state",
              "editions": {"Met.": [{"year":1858, "month":0, "day":1},
                                    {"year":1863, "month":11, "day":31}]},
              "mlz_jurisdiction": ["us;ky"],
              "name": "Kentucky Reports, Metcalf",
              "variations": {"Ky.(Met.)": "Met.",
                             "Metc.": "Met.",
                             "Metc.Ky.": "Met."}},
             {"cite_type": "state",
              "editions": {"Met.": [{"year":1840, "month":0, "day":1},
                                    {"year":1847, "month":11, "day":31}]},
              "mlz_jurisdiction": ["us;ma"],
              "name": "Massachusetts Reports, Metcalf",
              "variations": {"Mass.(Met.)": "Met.",
                             "Metc.": "Met.",
                             "Metc.Mass.": "Met."}}],
    "Mich.": [{"cite_type": "state",
               "editions": {"Mich.": [{"year":1847, "month":0, "day":1},
                                      {"year":false, "month":false, "day":false}]},
               "mlz_jurisdiction": ["us;mi"],
               "name": "Michigan Reports",
               "variations": {"Mich.": "Mich."}}],
    "Mich. App.": [{"cite_type": "state",
                    "editions": {"Mich. App.": [{"year":1965, "month":0, "day":1},
                                                {"year":false, "month":false, "day":false}]},
                    "mlz_jurisdiction": ["us;mi"],
                    "name": "Michigan Appeals Reports",
                    "variations": {}}],
    "Mich. Ct. Cl.": [{"cite_type": "state",
                       "editions": {"Mich. Ct. Cl.": [{"year":1938, "month":0, "day":1},
                                                      {"year":1942, "month":11, "day":31}]},
                       "mlz_jurisdiction": ["us;mi"],
                       "name": "Michigan Court of Claims Reports",
                       "variations": {}}],
    "Mill": [{"cite_type": "state",
              "editions": {"Mill": [{"year":1817, "month":0, "day":1},
                                    {"year":1818, "month":11, "day":31}]},
              "mlz_jurisdiction": ["us;sc"],
              "name": "South Carolina Reports, Mill (Constitutional)",
              "variations": {"Const.": "Mill",
                             "Const.S.C.": "Mill",
                             "Mill Const.": "Mill",
                             "Mill Const.(S.C.)": "Mill",
                             "S.C.L.(Mill)": "Mill"}}],
    "Minn.": [{"cite_type": "state",
               "editions": {"Minn.": [{"year":1851, "month":0, "day":1},
                                      {"year":1977, "month":11, "day":31}]},
               "mlz_jurisdiction": ["us;mn"],
               "name": "Minnesota Reports",
               "variations": {"Min.": "Minn."}}],
    "Minor": [{"cite_type": "state",
               "editions": {"Minor": [{"year":1820, "month":0, "day":1},
                                      {"year":1826, "month":0, "day":1}]},
               "mlz_jurisdiction": ["us;al"],
               "name": "Minor's Alabama Reports",
               "variations": {"Min.": "Minor",
                              "Minor (Ala.)": "Minor"}}],
    "Misc.": [{"cite_type": "state",
               "editions": {"Misc.": [{"year":1892, "month":0, "day":1},
                                      {"year":1955, "month":11, "day":31}],
                            "Misc. 2d": [{"year":1955, "month":0, "day":1},
                                         {"year":2004, "month":11, "day":31}],
                            "Misc. 3d": [{"year":2004, "month":0, "day":1},
                                         {"year":false, "month":false, "day":false}]},
               "mlz_jurisdiction": ["us;ny"],
               "name": "New York Miscellaneous Reports",
               "variations": {"Misc 2d": "Misc. 2d",
                              "Misc 3d": "Misc. 3d",
                              "Misc.2d": "Misc. 2d",
                              "Misc.3d": "Misc. 3d"}}],
    "Miss.": [{"cite_type": "state",
               "editions": {"Miss.": [{"year":1851, "month":0, "day":1},
                                      {"year":1966, "month":11, "day":31}]},
               "mlz_jurisdiction": ["us;ms"],
               "name": "Mississippi Reports",
               "variations": {"Mis.": "Miss."}}],
    "Mo.": [{"cite_type": "state",
             "editions": {"Mo.": [{"year":1821, "month":0, "day":1},
                                  {"year":1956, "month":11, "day":31}]},
             "mlz_jurisdiction": ["us;mo"],
             "name": "Missouri Reports",
             "variations": {}}],
    "Mo. App.": [{"cite_type": "state",
                  "editions": {"Mo. App.": [{"year":1876, "month":0, "day":1},
                                            {"year":1954, "month":11, "day":31}]},
                  "mlz_jurisdiction": ["us;mo"],
                  "name": "Missouri Appeals Reports",
                  "variations": {"Mo.App.Rep.": "Mo. App."}}],
    "Monag.": [{"cite_type": "state",
                "editions": {"Monag.": [{"year":1888, "month":0, "day":1},
                                        {"year":1890, "month":11, "day":31}]},
                "mlz_jurisdiction": ["us;pa"],
                "name": "Pennsylvania State Reports, Monaghan",
                "variations": {"Mon.": "Monag.",
                               "Mona.": "Monag.",
                               "Monaghan": "Monag.",
                               "Monaghan(Pa.)": "Monag."}}],
    "Mont.": [{"cite_type": "state",
               "editions": {"Mont.": [{"year":1868, "month":0, "day":1},
                                      {"year":false, "month":false, "day":false}]},
               "mlz_jurisdiction": ["us;mt"],
               "name": "Montana Reports",
               "variations": {"Mont.": "Mont."}}],
    "Morris": [{"cite_type": "state",
                "editions": {"Morris": [{"year":1839, "month":0, "day":1},
                                        {"year":1846, "month":11, "day":31}]},
                "mlz_jurisdiction": ["us;ia"],
                "name": "Iowa Reports, Morris",
                "variations": {"Mor.Ia.": "Morris", "Morr.": "Morris"}}],
    "Munf.": [{"cite_type": "state",
               "editions": {"Munf.": [{"year":1810, "month":0, "day":1},
                                      {"year":1820, "month":11, "day":31}]},
               "mlz_jurisdiction": ["us;va"],
               "name": "Virginia Reports, Munford",
               "variations": {}}],
    "Mur.": [{"cite_type": "state",
              "editions": {"Mur.": [{"year":1804, "month":0, "day":1},
                                    {"year":1819, "month":11, "day":31}]},
              "mlz_jurisdiction": ["us;nc"],
              "name": "North Carolina Reports, Murphey",
              "variations": {"Murph.": "Mur.",
                             "Murph.(N.C.)": "Mur.",
                             "N.C.(Mur.)": "Mur."}}],
    "N. Chip.": [{"cite_type": "state",
                  "editions": {"N. Chip.": [{"year":1789, "month":0, "day":1},
                                            {"year":1791, "month":11, "day":31}]},
                  "mlz_jurisdiction": ["us;vt"],
                  "name": "Vermont Reports, Chipman, N.",
                  "variations": {"Chip.N.": "N. Chip.",
                                 "N.Chip.(Vt.)": "N. Chip.",
                                 "N.Chipm.": "N. Chip."}}],
    "N. Mar. I.": [{"cite_type": "state",
                    "editions": {"N. Mar. I.": [{"year":1989, "month":0, "day":1},
                                                {"year":false, "month":false, "day":false}]},
                    "mlz_jurisdiction": ["us;mp"],
                    "name": "Northern Mariana Islands Reporter",
                    "variations": {}}],
    "N. Mar. I. Commw. Rptr.": [{"cite_type": "state",
                                 "editions": {"N. Mar. I. Commw. Rptr.": [{"year":1979, "month":0, "day":1},
                                                                          {"year":false, "month":false, "day":false}]},
                                 "mlz_jurisdiction": ["us;mp"],
                                 "name": "Northern Mariana Islands Commonwealth Reporter",
                                 "variations": {}}],
    "N.C.": [{"cite_type": "state",
              "editions": {"N.C.": [{"year":1868, "month":0, "day":1},
                                    {"year":false, "month":false, "day":false}]},
              "mlz_jurisdiction": ["us;nc"],
              "name": "North Carolina Reports",
              "variations": {}}],
    "N.C. App.": [{"cite_type": "state",
                   "editions": {"N.C. App.": [{"year":1968, "month":0, "day":1},
                                              {"year":false, "month":false, "day":false}]},
                   "mlz_jurisdiction": ["us;nc"],
                   "name": "North Carolina Court of Appeals Reports",
                   "variations": {}}],
    "N.D.": [{"cite_type": "state",
              "editions": {"N.D.": [{"year":1890, "month":0, "day":1},
                                    {"year":1953, "month":11, "day":31}]},
              "mlz_jurisdiction": ["us;nd"],
              "name": "North Dakota Reports",
              "variations": {}}],
    "N.E.": [{"cite_type": "state_regional",
              "editions": {"N.E.": [{"year":1884, "month":0, "day":1},
                                    {"year":1936, "month":11, "day":31}],
                           "N.E.2d": [{"year":1936, "month":0, "day":1},
                                      {"year":false, "month":false, "day":false}]},
              "mlz_jurisdiction": ["us;il","us;in","us;ma","us;ny","us;oh"],
              "name": "North Eastern Reporter",
              "variations": {"N. E.": "N.E.",
                             "N. E. 2d": "N.E.2d",
                             "N. E.2d": "N.E.2d",
                             "N.E. 2d": "N.E.2d",
                             "N.E.Rep.": "N.E.",
                             "NE": "N.E.",
                             "NE 2d": "N.E.2d",
                             "No.East Rep.": "N.E."}}],
    "N.H.": [{"cite_type": "state",
              "editions": {"N.H.": [{"year":1816, "month":0, "day":1},
                                    {"year":false, "month":false, "day":false}]},
              "mlz_jurisdiction": ["us;nh"],
              "name": "New Hampshire Reports",
              "variations": {"N.H.R.": "N.H."}}],
    "N.J.": [{"cite_type": "state",
              "editions": {"N.J.": [{"year":1948, "month":0, "day":1},
                                    {"year":false, "month":false, "day":false}]},
              "mlz_jurisdiction": ["us;nj"],
              "name": "New Jersey Reports",
              "variations": {}}],
    "N.J. Admin.": [{"cite_type": "state",
                     "editions": {"N.J. Admin.": [{"year":1982, "month":0, "day":1},
                                                  {"year":false, "month":false, "day":false}],
                                  "N.J. Admin. 2d": [{"year":1982, "month":0, "day":1},
                                                     {"year":false, "month":false, "day":false}]},
                     "mlz_jurisdiction": ["us;nj"],
                     "name": "New Jersey Administrative Reports",
                     "variations": {}}],
    "N.J. Eq.": [{"cite_type": "state",
                  "editions": {"N.J. Eq.": [{"year":1830, "month":0, "day":1},
                                            {"year":1948, "month":11, "day":31}]},
                  "mlz_jurisdiction": ["us;nj"],
                  "name": "New Jersey Equity Reports",
                  "variations": {}}],
    "N.J. Misc.": [{"cite_type": "state",
                    "editions": {"N.J. Misc.": [{"year":1923, "month":0, "day":1},
                                                {"year":1949, "month":11, "day":31}]},
                    "mlz_jurisdiction": ["us;nj"],
                    "name": "New Jersey Miscellaneous Reports",
                    "variations": {"N.J.M.": "N.J. Misc.", "NJM": "N.J. Misc."}}],
    "N.J. Super.": [{"cite_type": "state",
                     "editions": {"N.J. Super.": [{"year":1948, "month":0, "day":1},
                                                  {"year":false, "month":false, "day":false}]},
                     "mlz_jurisdiction": ["us;nj"],
                     "name": "New Jersey Superior Court Reports",
                     "variations": {"N.J.S.": "N.J. Super."}}],
    "N.J. Tax": [{"cite_type": "state",
                  "editions": {"N.J. Tax.": [{"year":1979, "month":0, "day":1},
                                             {"year":false, "month":false, "day":false}]},
                  "mlz_jurisdiction": ["us;nj"],
                  "name": "New Jersey Tax Court",
                  "variations": {}}],
    "N.J.L.": [{"cite_type": "state",
                "editions": {"N.J.L.": [{"year":1790, "month":0, "day":1},
                                        {"year":1948, "month":11, "day":31}]},
                "mlz_jurisdiction": ["us;nj"],
                "name": "New Jersey Law Reports",
                "variations": {"N.J.Law": "N.J.L."}}],
    "N.M.": [{"cite_type": "state",
              "editions": {"N.M.": [{"year":1890, "month":0, "day":1},
                                    {"year":false, "month":false, "day":false}]},
              "mlz_jurisdiction": ["us;nm"],
              "name": "New Mexico Reports",
              "variations": {}}],
    "N.W.": [{"cite_type": "state_regional",
              "editions": {"N.W.": [{"year":1880, "month":0, "day":1},
                                    {"year":1942, "month":11, "day":31}],
                           "N.W.2d": [{"year":1942, "month":0, "day":1},
                                      {"year":false, "month":false, "day":false}]},
              "mlz_jurisdiction": ["us;ia","us;mi","us;mn","us;ne","us;nd","us;sd","us;wi"],
              "name": "North Western Reporter",
              "variations": {"N. W.": "N.W.",
                             "N. W. 2d": "N.W.2d",
                             "N. W.2d": "N.W.2d",
                             "N.W. 2d": "N.W.2d",
                             "NW": "N.W.",
                             "NW 2d": "N.W.2d",
                             "No.West Rep.": "N.W.",
                             "Northw.Rep.": "N.W."}}],
    "N.Y.": [{"cite_type": "state",
              "editions": {"N.Y.": [{"year":1847, "month":0, "day":1},
                                    {"year":1956, "month":11, "day":31}],
                           "N.Y.2d": [{"year":1956, "month":0, "day":1},
                                      {"year":2004, "month":0, "day":1}],
                           "N.Y.3d": [{"year":2004, "month":0, "day":1},
                                      {"year":false, "month":false, "day":false}]},
              "mlz_jurisdiction": ["us;ny"],
              "name": "New York Reports",
              "variations": {"N. Y.": "N.Y.",
                             "N.Y. 2d": "N.Y.2d",
                             "N.Y. 3d": "N.Y.3d",
                             "NY 2d": "N.Y.2d",
                             "NY 3d": "N.Y.3d"}}],
    "N.Y. Ch. Ann.": [{"cite_type": "state",
                       "editions": {"N.Y. Ch. Ann.": [{"year":1814, "month":0, "day":1},
                                                      {"year":1847, "month":11, "day":31}]},
                       "mlz_jurisdiction": ["us;ny"],
                       "name": "New York Chancery Reports Annotated",
                       "variations": {"N.Y.Ch.R.Ann.": "N.Y. Ch. Ann."}}],
    "N.Y. Sup. Ct.": [{"cite_type": "state",
                       "editions": {"N.Y. Sup. Ct.": [{"year":1873, "month":0, "day":1},
                                                      {"year":1896, "month":11, "day":31}]},
                       "mlz_jurisdiction": ["us;ny"],
                       "name": "Supreme Court Reports",
                       "variations": {"N.Y.Supr.Ct.": "N.Y. Sup. Ct.",
                                      "N.Y.Suprm.Ct.": "N.Y. Sup. Ct."}}],
    "N.Y.S.": [{"cite_type": "state",
                "editions": {"N.Y.S.": [{"year":1888, "month":0, "day":1},
                                        {"year":1937, "month":11, "day":31}],
                             "N.Y.S.2d": [{"year":1938, "month":0, "day":1},
                                          {"year":false, "month":false, "day":false}],
                             "N.Y.S.3d": [{"year":1938, "month":0, "day":1},
                                          {"year":false, "month":false, "day":false}]},
                "mlz_jurisdiction": ["us;ny"],
                "name": "New York Supplement",
                "variations": {"N.Y.S. 2d": "N.Y.S.2d",
                               "N.Y.S. 3d": "N.Y.S.3d",
                               "NYS": "N.Y.S.",
                               "NYS 2d": "N.Y.S.2d",
                               "NYS 3d": "N.Y.S.3d",
                               "New York Supp.": "N.Y.S."}}],
    "ND": [{"cite_type": "neutral",
            "editions": {"ND": [{"year":1750, "month":0, "day":1},
                                {"year":false, "month":false, "day":false}]},
            "mlz_jurisdiction": ["us;nd"],
            "name": "North Dakota Neutral Citation",
            "variations": {}}],
    "ND App": [{"cite_type": "neutral",
                "editions": {"ND App": [{"year":1750, "month":0, "day":1},
                                        {"year":false, "month":false, "day":false}]},
                "mlz_jurisdiction": ["us;nd"],
                "name": "North Dakota Neutral Citation, Court of Appeals",
                "variations": {}}],
    "NM": [{"cite_type": "neutral",
            "editions": {"NM": [{"year":1750, "month":0, "day":1},
                                {"year":false, "month":false, "day":false}]},
            "mlz_jurisdiction": ["us;nm"],
            "name": "New Mexico Neutral Citation",
            "variations": {}}],
    "NMCA": [{"cite_type": "neutral",
              "editions": {"NMCA": [{"year":1750, "month":0, "day":1},
                                    {"year":false, "month":false, "day":false}]},
              "mlz_jurisdiction": ["us;nm"],
              "name": "New Mexico Neutral Citation (Court of Appeals)",
              "variations": {}}],
    "NMCERT": [{"cite_type": "neutral",
                "editions": {"NMCERT": [{"year":1750, "month":0, "day":1},
                                        {"year":false, "month":false, "day":false}]},
                "mlz_jurisdiction": ["us;nm"],
                "name": "New Mexico Neutral Citation",
                "variations": {}}],
    "NMSC": [{"cite_type": "neutral",
              "editions": {"NMSC": [{"year":1750, "month":0, "day":1},
                                    {"year":false, "month":false, "day":false}]},
              "mlz_jurisdiction": ["us;nm"],
              "name": "New Mexico Neutral Citation (Supreme Court)",
              "variations": {}}],
    "NY Slip Op": [{"cite_type": "state",
                    "editions": {"NY Slip Op": [{"year":1750, "month":0, "day":1},
                                                {"year":false, "month":false, "day":false}]},
                    "mlz_jurisdiction": ["us;ny"],
                    "name": "New York Slip Opinion",
                    "variations": {}}],
    "Navajo Rptr.": [{"cite_type": "fed",
                      "editions": {"Navajo Rptr.": [{"year":1969, "month":0, "day":1},
                                                    {"year":false, "month":false, "day":false}]},
                      "mlz_jurisdiction": ["us"],
                      "name": "Navajo Reporter",
                      "variations": {}}],
    "Neb.": [{"cite_type": "state",
              "editions": {"Neb.": [{"year":1860, "month":0, "day":1},
                                    {"year":false, "month":false, "day":false}]},
              "mlz_jurisdiction": ["us;ne"],
              "name": "Nebraska Reports",
              "variations": {}}],
    "Neb. Ct. App.": [{"cite_type": "state",
                       "editions": {"Neb. Ct. App.": [{"year":1922, "month":0, "day":1},
                                                      {"year":false, "month":false, "day":false}]},
                       "mlz_jurisdiction": ["us;ne"],
                       "name": "Nebraska Court of Appeals Reports",
                       "variations": {"Neb. App.": "Neb. Ct. App.",
                                      "Neb.App.R.": "Neb. Ct. App."}}],
    "Nev.": [{"cite_type": "state",
              "editions": {"Nev.": [{"year":1865, "month":0, "day":1},
                                    {"year":false, "month":false, "day":false}]},
              "mlz_jurisdiction": ["us;nv"],
              "name": "Nevada Reports",
              "variations": {}}],
    "Nev. Adv. Op. No.": [{"cite_type": "state",
                           "editions": {"Nev. Adv. Op. No.": [{"year":1750, "month":0, "day":1},
                                                              {"year":false, "month":false, "day":false}]},
                           "mlz_jurisdiction": ["us;nv"],
                           "name": "Nevada Advanced Opinion",
                           "variations": {}}],
    "Nott & McC.": [{"cite_type": "state",
                     "editions": {"Nott & McC.": [{"year":1817, "month":0, "day":1},
                                                  {"year":1820, "month":11, "day":31}]},
                     "mlz_jurisdiction": ["us;sc"],
                     "name": "South Carolina Reports, Nott and McCord",
                     "variations": {"N.& Mc.": "Nott & McC.",
                                    "Nott & M'C.(S.C.)": "Nott & McC.",
                                    "Nott & McC.": "Nott & McC.",
                                    "S.C.L.(Nott & McC.)": "Nott & McC."}}],
    "OH": [{"cite_type": "neutral",
            "editions": {"OH": [{"year":1750, "month":0, "day":1},
                                {"year":false, "month":false, "day":false}]},
            "mlz_jurisdiction": ["us;oh"],
            "name": "Ohio Neutral Citation",
            "variations": {"-Ohio-": "OH"}}],
    "OK": [{"cite_type": "neutral",
            "editions": {"OK": [{"year":1750, "month":0, "day":1},
                                {"year":false, "month":false, "day":false}]},
            "mlz_jurisdiction": ["us;ok"],
            "name": "Oklahoma Neutral Citation",
            "variations": {}}],
    "OK CIV APP": [{"cite_type": "neutral",
                    "editions": {"OK CIV APP": [{"year":1750, "month":0, "day":1},
                                                {"year":false, "month":false, "day":false}]},
                    "mlz_jurisdiction": ["us;ok"],
                    "name": "Oklahoma Neutral Citation (Civic Appeals)",
                    "variations": {}}],
    "OK CR": [{"cite_type": "neutral",
               "editions": {"OK CR": [{"year":1750, "month":0, "day":1},
                                      {"year":false, "month":false, "day":false}]},
               "mlz_jurisdiction": ["us;ok"],
               "name": "Oklahoma Neutral Citation",
               "variations": {}}],
    "Ohio": [{"cite_type": "state",
              "editions": {"Ohio": [{"year":1821, "month":0, "day":1},
                                    {"year":1851, "month":11, "day":31}]},
              "mlz_jurisdiction": ["us;oh"],
              "name": "Ohio Reports",
              "variations": {}}],
    "Ohio App.": [{"cite_type": "state",
                   "editions": {"Ohio App.": [{"year":1913, "month":0, "day":1},
                                              {"year":false, "month":false, "day":false}],
                                "Ohio App. 2d": [{"year":1913, "month":0, "day":1},
                                                 {"year":false, "month":false, "day":false}],
                                "Ohio App. 3d": [{"year":1913, "month":0, "day":1},
                                                 {"year":false, "month":false, "day":false}]},
                   "mlz_jurisdiction": ["us;oh"],
                   "name": "Ohio Appellate Reports",
                   "variations": {"App.": "Ohio App.",
                                  "O.A.R.": "Ohio App.",
                                  "O.A.R.2d": "Ohio App. 2d",
                                  "O.A.R.3d": "Ohio App. 3d",
                                  "O.App.": "Ohio App.",
                                  "O.App.2d": "Ohio App. 2d",
                                  "O.App.3d": "Ohio App. 3d",
                                  "Oh.A.": "Ohio App.",
                                  "Oh.A.2d": "Ohio App. 2d",
                                  "Oh.App.3d": "Ohio App. 3d"}}],
    "Ohio App. Unrep.": [{"cite_type": "state",
                          "editions": {"Ohio App. Unrep.": [{"year":1990, "month":0, "day":1},
                                                            {"year":1990, "month":11, "day":31}]},
                          "mlz_jurisdiction": ["us;oh"],
                          "name": "Unreported Ohio Appellate Cases (Anderson)",
                          "variations": {}}],
    "Ohio B.": [{"cite_type": "state",
                 "editions": {"Ohio B.": [{"year":1982, "month":0, "day":1},
                                          {"year":1987, "month":11, "day":31}]},
                 "mlz_jurisdiction": ["us;oh"],
                 "name": "Ohio Bar Reports",
                 "variations": {}}],
    "Ohio C.C.": [{"cite_type": "state",
                   "editions": {"Ohio C.C.": [{"year":1885, "month":0, "day":1},
                                              {"year":1901, "month":11, "day":31}],
                                "Ohio C.C. (n.s.)": [{"year":1901, "month":0, "day":1},
                                                     {"year":1922, "month":11, "day":31}]},
                   "mlz_jurisdiction": ["us;oh"],
                   "name": "Ohio Circuit Court Reports",
                   "variations": {"O.C.C.N.S.": "Ohio C.C. (n.s.)",
                                  "Oh.Cir.Ct.": "Ohio C.C.",
                                  "Oh.Cir.Ct.N.S.": "Ohio C.C. (n.s.)",
                                  "Ohio C.C.N.S.": "Ohio C.C. (n.s.)",
                                  "Ohio C.C.R.": "Ohio C.C.",
                                  "Ohio C.C.R.N.S.": "Ohio C.C. (n.s.)",
                                  "Ohio Cir.Ct.": "Ohio C.C.",
                                  "Ohio Cir.Ct.(N.S.)": "Ohio C.C. (n.s.)",
                                  "Ohio Cir.Ct.R.N.S.": "Ohio C.C. (n.s.)",
                                  "Ohio Cr.Ct.R.": "Ohio C.C."}}],
    "Ohio C.C. Dec.": [{"cite_type": "state",
                        "editions": {"Ohio C.C. Dec.": [{"year":1901, "month":0, "day":1},
                                                        {"year":1923, "month":11, "day":31}]},
                        "mlz_jurisdiction": ["us;oh"],
                        "name": "Ohio Circuit Court Decisions",
                        "variations": {"O.C.C.": "Ohio C.C. Dec.",
                                       "Ohio Cir.Ct.": "Ohio C.C. Dec."}}],
    "Ohio Cir. Dec.": [{"cite_type": "state",
                        "editions": {"Ohio Cir. Dec.": [{"year":1885, "month":0, "day":1},
                                                        {"year":1901, "month":11, "day":31}]},
                        "mlz_jurisdiction": ["us;oh"],
                        "name": "Ohio Circuit Decisions",
                        "variations": {"O.C.D.": "Ohio Cir. Dec.",
                                       "Oh.Cir.Dec.": "Ohio Cir. Dec.",
                                       "Ohio C.D.": "Ohio Cir. Dec.",
                                       "Ohio C.Dec.": "Ohio Cir. Dec."}}],
    "Ohio Dec.": [{"cite_type": "state",
                   "editions": {"Ohio Dec.": [{"year":1894, "month":0, "day":1},
                                              {"year":1920, "month":11, "day":31}]},
                   "mlz_jurisdiction": ["us;oh"],
                   "name": "Ohio Decisions",
                   "variations": {"O.D.": "Ohio Dec.", "Oh.Dec.": "Ohio Dec."}}],
    "Ohio Dec. Reprint": [{"cite_type": "state",
                           "editions": {"Ohio Dec. Reprint": [{"year":1840, "month":0, "day":1},
                                                              {"year":1873, "month":11, "day":31}]},
                           "mlz_jurisdiction": ["us;oh"],
                           "name": "Ohio Decisions, Reprint",
                           "variations": {"O.Dec.Rep.": "Ohio Dec. Reprint",
                                          "Oh.Dec.(Reprint)": "Ohio Dec. Reprint"}}],
    "Ohio Law. Abs.": [{"cite_type": "state",
                        "editions": {"Ohio Law. Abs.": [{"year":1922, "month":0, "day":1},
                                                        {"year":1964, "month":11, "day":31}]},
                        "mlz_jurisdiction": ["us;oh"],
                        "name": "Ohio Law Abstracts",
                        "variations": {"O.L.A.": "Ohio Law. Abs.",
                                       "O.L.Abs.": "Ohio Law. Abs.",
                                       "Ohio Abs.": "Ohio Law. Abs.",
                                       "Ohio L.Abs.": "Ohio Law. Abs.",
                                       "Ohio Law Abst.": "Ohio Law. Abs."}}],
    "Ohio Misc.": [{"cite_type": "state",
                    "editions": {"Ohio Misc.": [{"year":1962, "month":0, "day":1},
                                                {"year":false, "month":false, "day":false}],
                                 "Ohio Misc. 2d": [{"year":1962, "month":0, "day":1},
                                                   {"year":false, "month":false, "day":false}]},
                    "mlz_jurisdiction": ["us;oh"],
                    "name": "Ohio Miscellaneous",
                    "variations": {"O.Misc.": "Ohio Misc.",
                                   "O.Misc.2d": "Ohio Misc. 2d",
                                   "Ohio Misc.Dec.": "Ohio Misc."}}],
    "Ohio N.P.": [{"cite_type": "state",
                   "editions": {"Ohio N.P.": [{"year":1894, "month":0, "day":1},
                                              {"year":1934, "month":11, "day":31}],
                                "Ohio N.P. (n.s.)": [{"year":1894, "month":0, "day":1},
                                                     {"year":1934, "month":11, "day":31}]},
                   "mlz_jurisdiction": ["us;oh"],
                   "name": "Ohio Nisi Prius Reports",
                   "variations": {"O.N.P.": "Ohio N.P.",
                                  "O.N.P.N.S.": "Ohio N.P. (n.s.)",
                                  "Oh.N.P.": "Ohio N.P.",
                                  "Oh.N.P.(N.S).": "Ohio N.P. (n.s.)",
                                  "Ohio N.P.N.S.": "Ohio N.P. (n.s.)"}}],
    "Ohio Op.": [{"cite_type": "state",
                  "editions": {"Ohio Op.": [{"year":1934, "month":0, "day":1},
                                            {"year":1982, "month":11, "day":31}],
                               "Ohio Op. 2d": [{"year":1934, "month":0, "day":1},
                                               {"year":1982, "month":11, "day":31}],
                               "Ohio Op. 3d": [{"year":1934, "month":0, "day":1},
                                               {"year":1982, "month":11, "day":31}]},
                  "mlz_jurisdiction": ["us;oh"],
                  "name": "Ohio Opinions",
                  "variations": {"O.O.": "Ohio Op.",
                                 "Ohio Op.2d": "Ohio Op. 2d",
                                 "Ohio Op.3d": "Ohio Op. 3d",
                                 "Ohio Ops.": "Ohio Op."}}],
    "Ohio St.": [{"cite_type": "state",
                  "editions": {"Ohio St.": [{"year":1840, "month":0, "day":1},
                                            {"year":1964, "month":11, "day":31}],
                               "Ohio St. 2d": [{"year":1965, "month":0, "day":1},
                                               {"year":1991, "month":11, "day":31}],
                               "Ohio St. 3d": [{"year":1991, "month":0, "day":1},
                                               {"year":false, "month":false, "day":false}]},
                  "mlz_jurisdiction": ["us;oh"],
                  "name": "Ohio State Reports",
                  "variations": {"O.S.": "Ohio St.",
                                 "O.S.2d": "Ohio St. 2d",
                                 "O.S.3d": "Ohio St. 3d",
                                 "Oh.St.": "Ohio St.",
                                 "Ohio St.2d": "Ohio St. 2d",
                                 "Ohio St.3d": "Ohio St. 3d"}}],
    "Okla.": [{"cite_type": "state",
               "editions": {"Okla.": [{"year":1890, "month":0, "day":1},
                                      {"year":1953, "month":11, "day":31}]},
               "mlz_jurisdiction": ["us;ok"],
               "name": "Oklahoma Reports",
               "variations": {}}],
    "Okla. Crim.": [{"cite_type": "state",
                     "editions": {"Okla. Crim.": [{"year":1908, "month":0, "day":1},
                                                  {"year":1953, "month":11, "day":31}]},
                     "mlz_jurisdiction": ["us;ok"],
                     "name": "Oklahoma Criminal Reports",
                     "variations": {"O.Cr.": "Okla. Crim.",
                                    "Okl.Cr.": "Okla. Crim.",
                                    "Okla.": "Okla. Crim.",
                                    "Okla.Cr.": "Okla. Crim."}}],
    "Or.": [{"cite_type": "state",
             "editions": {"Or.": [{"year":1853, "month":0, "day":1},
                                  {"year":false, "month":false, "day":false}]},
             "mlz_jurisdiction": ["us;or"],
             "name": "Oregon Reports",
             "variations": {"O.": "Or."}}],
    "Or. App.": [{"cite_type": "state",
                  "editions": {"Or. App.": [{"year":1969, "month":0, "day":1},
                                            {"year":false, "month":false, "day":false}]},
                  "mlz_jurisdiction": ["us;or"],
                  "name": "Oregon Reports, Court of Appeals",
                  "variations": {"Or.A.": "Or. App.", "Ore. App.": "Or. App.", "Ore.App.": "Or. App."}}],
    "Or. Tax": [{"cite_type": "state",
                 "editions": {"Or. Tax": [{"year":1962, "month":0, "day":1},
                                          {"year":false, "month":false, "day":false}]},
                 "mlz_jurisdiction": ["us;or"],
                 "name": "Oregon Tax Reports",
                 "variations": {}}],
    "Overt.": [{"cite_type": "state",
                "editions": {"Overt.": [{"year":1791, "month":0, "day":1},
                                        {"year":1816, "month":11, "day":31}]},
                "mlz_jurisdiction": ["us;tn"],
                "name": "Tennessee Reports, Overton",
                "variations": {"Tenn.(Overt.)": "Overt."}}],
    "P.": [{"cite_type": "state_regional",
            "editions": {"P.": [{"year":1883, "month":0, "day":1},
                                {"year":1931, "month":11, "day":31}],
                         "P.2d": [{"year":1931, "month":0, "day":1},
                                  {"year":2000, "month":11, "day":31}],
                         "P.3d": [{"year":2000, "month":0, "day":1},
                                  {"year":false, "month":false, "day":false}]},
            "mlz_jurisdiction": ["us;ak","us;az","us;ca","us;co","us;hi","us;id","us;ks","us;mt","us;nv","us;nm","us;ok","us;or","us;ut","us;wa","us;wy"],
            "name": "Pacific Reporter",
            "variations": {"P": "P.",
                           "P 2d": "P.2d",
                           "P 3d": "P.3d",
                           "P. 2d": "P.2d",
                           "P. 3d": "P.3d",
                           "P.R.": "P.",
                           "Pac.": "P.",
                           "Pac.R.": "P.",
                           "Pac.Rep.": "P."}}],
    "P.R. Dec.": [{"cite_type": "state",
                   "editions": {"P.R. Dec.": [{"year":1899, "month":0, "day":1},
                                              {"year":false, "month":false, "day":false}]},
                   "mlz_jurisdiction": ["us;pr"],
                   "name": "Decisiones de Puerto Rico",
                   "variations": {}}],
    "P.R. Offic. Trans.": [{"cite_type": "state",
                            "editions": {"P.R. Offic. Trans.": [{"year":1978, "month":0, "day":1},
                                                                {"year":false, "month":false, "day":false}]},
                            "mlz_jurisdiction": ["us;pr"],
                            "name": "Official Translations of the Opinions of the Supreme Court of Puerto Rico",
                            "variations": {}}],
    "P.R. Sent.": [{"cite_type": "state",
                    "editions": {"P.R. Sent.": [{"year":1899, "month":0, "day":1},
                                                {"year":1902, "month":11, "day":31}]},
                    "mlz_jurisdiction": ["us;pr"],
                    "name": "Sentencias del Tribunal Supremo de Puerto Rico",
                    "variations": {}}],
    "P.R.R.": [{"cite_type": "state",
                "editions": {"P.R.R.": [{"year":1899, "month":0, "day":1},
                                        {"year":1978, "month":11, "day":31}]},
                "mlz_jurisdiction": ["us;pr"],
                "name": "Puerto Rico Reports",
                "variations": {"P.R.": "P.R.R.", "Puerto Rico": "P.R.R."}}],
    "PA": [{"cite_type": "neutral",
            "editions": {"PA": [{"year":1750, "month":0, "day":1},
                                {"year":false, "month":false, "day":false}]},
            "mlz_jurisdiction": ["us;pa"],
            "name": "Pennsylvania Neutral Citation",
            "variations": {}}],
    "Pa.": [{"cite_type": "state",
             "editions": {"Pa.": [{"year":1845, "month":0, "day":1},
                                  {"year":false, "month":false, "day":false}]},
             "mlz_jurisdiction": ["us;pa"],
             "name": "Pennsylvania State Reports",
             "variations": {"P.S.R.": "Pa.",
                            "Pa.Rep.": "Pa.",
                            "Pa.St.": "Pa.",
                            "Pa.State": "Pa.",
                            "Penn.": "Pa.",
                            "Penn.Rep.": "Pa.",
                            "Penn.St.": "Pa.",
                            "Penn.St.R.": "Pa."}}],
    "Pa. C.": [{"cite_type": "state",
                "editions": {"Pa. C.": [{"year":1870, "month":0, "day":1},
                                        {"year":1921, "month":11, "day":31}]},
                "mlz_jurisdiction": ["us;pa"],
                "name": "Pennsylvania County Court Reports",
                "variations": {"P.C.R.": "Pa. C.",
                               "Pa.C.C.": "Pa. C.",
                               "Pa.Co.Ct.": "Pa. C.",
                               "Pa.Co.Ct.R.": "Pa. C.",
                               "Pa.County Ct.": "Pa. C.",
                               "Penn.Co.Ct.Rep.": "Pa. C."}}],
    "Pa. Commw.": [{"cite_type": "state",
                    "editions": {"Pa. Commw.": [{"year":1970, "month":0, "day":1},
                                                {"year":1994, "month":11, "day":31}]},
                    "mlz_jurisdiction": ["us;pa"],
                    "name": "Pennsylvania Commonwealth Court",
                    "variations": {"Pa. Commonwealth Ct.": "Pa. Commw.",
                                   "Pa.C.": "Pa. Commw.",
                                   "Pa.Commw.Ct.": "Pa. Commw."}}],
    "Pa. D.": [{"cite_type": "state",
                "editions": {"Pa. D.": [{"year":1892, "month":0, "day":1},
                                        {"year":1921, "month":11, "day":31}]},
                "mlz_jurisdiction": ["us;pa"],
                "name": "Pennsylvania District Reports",
                "variations": {"Dist.Rep.": "Pa. D.",
                               "Pa.Dist.": "Pa. D.",
                               "Pa.Dist.R.": "Pa. D.",
                               "Penn.Dist.Rep.": "Pa. D."}}],
    "Pa. D. & C.": [{"cite_type": "state",
                     "editions": {"Pa. D. & C.": [{"year":1921, "month":0, "day":1},
                                                  {"year":false, "month":false, "day":false}],
                                  "Pa. D. & C.2d": [{"year":1921, "month":0, "day":1},
                                                    {"year":false, "month":false, "day":false}],
                                  "Pa. D. & C.3d": [{"year":1921, "month":0, "day":1},
                                                    {"year":false, "month":false, "day":false}],
                                  "Pa. D. & C.4th": [{"year":1921, "month":0, "day":1},
                                                     {"year":false, "month":false, "day":false}]},
                     "mlz_jurisdiction": ["us;pa"],
                     "name": "Pennsylvania District and County Reports",
                     "variations": {"Pa.Dist.& C.Rep.": "Pa. D. & C.",
                                    "Pa.Dist.& Co.": "Pa. D. & C."}}],
    "Pa. Super.": [{"cite_type": "state",
                    "editions": {"Pa. Super.": [{"year":1895, "month":0, "day":1},
                                                {"year":false, "month":false, "day":false}]},
                    "mlz_jurisdiction": ["us;pa"],
                    "name": "Pennsylvania Superior Court Reports",
                    "variations": {"Pa. Superior Ct.": "Pa. Super.",
                                   "Pa.S.": "Pa. Super.",
                                   "Pa.Super.Ct.": "Pa. Super."}}],
    "Paige Ch.": [{"cite_type": "state",
                   "editions": {"Paige Ch.": [{"year":1828, "month":0, "day":1},
                                              {"year":1845, "month":11, "day":31}]},
                   "mlz_jurisdiction": ["us;ny"],
                   "name": "Paige's Chancery Reports",
                   "variations": {"Pai.": "Paige Ch.",
                                  "Pai.Ch.": "Paige Ch.",
                                  "Paige": "Paige Ch."}}],
    "Peck": [{"cite_type": "state",
              "editions": {"Peck": [{"year":1821, "month":0, "day":1},
                                    {"year":1824, "month":11, "day":31}]},
              "mlz_jurisdiction": ["us;tn"],
              "name": "Tennessee Reports, Peck",
              "variations": {"Peck (Tenn.)": "Peck", "Tenn.(Peck)": "Peck"}}],
    "Pelt.": [{"cite_type": "state",
               "editions": {"Pelt.": [{"year":1917, "month":0, "day":1},
                                      {"year":1924, "month":11, "day":31}]},
               "mlz_jurisdiction": ["us;la"],
               "name": "Peltier's Opinions, Parish at Orleans",
               "variations": {}}],
    "Pen. & W.": [{"cite_type": "state",
                   "editions": {"Pen. & W.": [{"year":1829, "month":0, "day":1},
                                              {"year":1832, "month":11, "day":31}]},
                   "mlz_jurisdiction": ["us;pa"],
                   "name": "Pennsylvania State Reports, Penrose and Watts",
                   "variations": {"P.& W.": "Pen. & W.",
                                  "P.R.": "Pen. & W.",
                                  "Penr.& W.": "Pen. & W."}}],
    "Pennewill": [{"cite_type": "state",
                   "editions": {"Pennewill": [{"year":1897, "month":0, "day":1},
                                              {"year":1909, "month":11, "day":31}]},
                   "mlz_jurisdiction": ["us;de"],
                   "name": "Delaware Reports, Pennewill",
                   "variations": {}}],
    "Pennyp.": [{"cite_type": "state",
                 "editions": {"Pennyp.": [{"year":1881, "month":0, "day":1},
                                          {"year":1884, "month":11, "day":31}]},
                 "mlz_jurisdiction": ["us;pa"],
                 "name": "Pennsylvania State Reports, Pennypacker",
                 "variations": {"Penn.": "Pennyp.",
                                "Penny.": "Pennyp.",
                                "Pennyp.(Pa.)": "Pennyp."}}],
    "Pet.": [{"cite_type": "scotus_early",
              "editions": {"Pet.": [{"year":1828, "month":0, "day":1},
                                    {"year":1842, "month":11, "day":31}]},
              "mlz_jurisdiction": ["us;federal;supreme.court"],
              "name": "Peters' Supreme Court Reports",
              "variations": {"Pet.S.C.": "Pet.",
                             "Peters": "Pet.",
                             "U.S.(Pet.)": "Pet."}}],
    "Phil. Eq.": [{"cite_type": "state",
                   "editions": {"Phil. Eq.": [{"year":1866, "month":0, "day":1},
                                              {"year":1868, "month":11, "day":31}]},
                   "mlz_jurisdiction": ["us;nc"],
                   "name": "North Carolina Reports, Philips' Equity<",
                   "variations": {"N.C.(Phil.Eq.)": "Phil. Eq.",
                                  "Phil.": "Phil. Eq.",
                                  "Phil.Eq.(N.C.)": "Phil. Eq.",
                                  "Phill.": "Phil. Eq.",
                                  "Phillips": "Phil. Eq."}}],
    "Phil. Law": [{"cite_type": "state",
                   "editions": {"Phil. Law": [{"year":1866, "month":0, "day":1},
                                              {"year":1868, "month":11, "day":31}]},
                   "mlz_jurisdiction": ["us;nc"],
                   "name": "North Carolina Reports, Philips' Law",
                   "variations": {"N.C.(Phil.Law)": "Phil. Law",
                                  "Phil.": "Phil. Law",
                                  "Phil.N.C.": "Phil. Law",
                                  "Phill.": "Phil. Law",
                                  "Phill.L.(N.C.)": "Phil. Law",
                                  "Phillips": "Phil. Law"}}],
    "Pick.": [{"cite_type": "state",
               "editions": {"Pick.": [{"year":1822, "month":0, "day":1},
                                      {"year":1839, "month":11, "day":31}]},
               "mlz_jurisdiction": ["us;ma"],
               "name": "Massachusetts Reports, Pickering",
               "variations": {"Mass.(Pick.)": "Pick.", "Pick.(Mass.)": "Pick."}}],
    "Pin.": [{"cite_type": "state",
              "editions": {"Pin.": [{"year":1839, "month":0, "day":1},
                                    {"year":1852, "month":11, "day":31}]},
              "mlz_jurisdiction": ["us;wi"],
              "name": "Wisconsin Reports, Pinney",
              "variations": {"Pinn.": "Pin."}}],
    "Port.": [{"cite_type": "state",
               "editions": {"Port.": [{"year":1834, "month":0, "day":1},
                                      {"year":1839, "month":11, "day":31}]},
               "mlz_jurisdiction": ["us;al"],
               "name": "Alabama Reports, Porter",
               "variations": {"Port.(Ala.)": "Port.", "Porter": "Port."}}],
    "R.I.": [{"cite_type": "state",
              "editions": {"R.I.": [{"year":1828, "month":0, "day":1},
                                    {"year":1980, "month":11, "day":31}]},
              "mlz_jurisdiction": ["us;ri"],
              "name": "Rhode Island Reports",
              "variations": {}}],
    "Rand.": [{"cite_type": "state",
               "editions": {"Rand.": [{"year":1821, "month":0, "day":1},
                                      {"year":1828, "month":11, "day":31}]},
               "mlz_jurisdiction": ["us;va"],
               "name": "Virginia Reports, Randolph",
               "variations": {"Va.(Rand.)": "Rand."}}],
    "Rawle": [{"cite_type": "state",
               "editions": {"Rawle": [{"year":1828, "month":0, "day":1},
                                      {"year":1835, "month":11, "day":31}]},
               "mlz_jurisdiction": ["us;pa"],
               "name": "Pennsylvania State Reports, Rawle",
               "variations": {"Pa. Rawle": "Rawle",
                              "R.": "Rawle",
                              "Raw.": "Rawle"}}],
    "Rice": [{"cite_type": "state",
              "editions": {"Rice": [{"year":1838, "month":0, "day":1},
                                    {"year":1839, "month":11, "day":31}]},
              "mlz_jurisdiction": ["us;sc"],
              "name": "South Carolina Reports, Rice",
              "variations": {"Rice L.(S.C.)": "Rice", "S.C.L.(Rice)": "Rice"}}],
    "Rice Eq.": [{"cite_type": "state",
                  "editions": {"Rice Eq.": [{"year":1838, "month":0, "day":1},
                                            {"year":1839, "month":11, "day":31}]},
                  "mlz_jurisdiction": ["us;sc"],
                  "name": "South Carolina Reports, Rice's Equity",
                  "variations": {"Rice Ch.": "Rice Eq.",
                                 "S.C.Eq.(Rice.Eq.)": "Rice Eq."}}],
    "Rich.": [{"cite_type": "state",
               "editions": {"Rich.": [{"year":1846, "month":0, "day":1},
                                      {"year":1868, "month":11, "day":31}]},
               "mlz_jurisdiction": ["us;sc"],
               "name": "South Carolina Reports, Richardson",
               "variations": {"Rich.L.(S.C.)": "Rich.",
                              "Rich.Law(S.C.)": "Rich.",
                              "S.C.L.(Rich.)": "Rich."}}],
    "Rich. Cas.": [{"cite_type": "state",
                    "editions": {"Rich. Cas.": [{"year":1831, "month":0, "day":1},
                                                {"year":1832, "month":11, "day":31}]},
                    "mlz_jurisdiction": ["us;sc"],
                    "name": "South Carolina Reports, Richardson's Cases",
                    "variations": {"Rich.Cas.(S.C.)": "Rich. Cas."}}],
    "Rich. Eq.": [{"cite_type": "state",
                   "editions": {"Rich. Eq.": [{"year":1844, "month":0, "day":1},
                                              {"year":1868, "month":11, "day":31}]},
                   "mlz_jurisdiction": ["us;sc"],
                   "name": "South Carolina Reports, Richardson's Equity",
                   "variations": {"Rich.Eq.Ch.": "Rich. Eq.",
                                  "S.C.Eq.(Rich.Eq.)": "Rich. Eq."}}],
    "Ril.": [{"cite_type": "state",
              "editions": {"Ril.": [{"year":1836, "month":0, "day":1},
                                    {"year":1837, "month":11, "day":31}]},
              "mlz_jurisdiction": ["us;sc"],
              "name": "South Carolina Reports, Riley",
              "variations": {"Riley": "Ril.",
                             "Riley L.(S.C.)": "Ril.",
                             "S.C.L.(Riley)": "Ril."}}],
    "Ril. Eq.": [{"cite_type": "state",
                  "editions": {"Ril. Eq.": [{"year":1836, "month":0, "day":1},
                                            {"year":1837, "month":11, "day":31}]},
                  "mlz_jurisdiction": ["us;sc"],
                  "name": "South Carolina Reports, Riley's Chancery",
                  "variations": {"Ril.": "Ril. Eq.",
                                 "Riley": "Ril. Eq.",
                                 "Riley Ch.": "Ril. Eq.",
                                 "Riley Eq.": "Ril. Eq.",
                                 "Riley Eq.(S.C.)": "Ril. Eq.",
                                 "S.C.Eq.(Ril.)": "Ril. Eq."}}],
    "Rob.": [{"cite_type": "state",
              "editions": {"Rob.": [{"year":1841, "month":0, "day":1},
                                    {"year":1846, "month":11, "day":31}]},
              "mlz_jurisdiction": ["us;la"],
              "name": "Louisiana Reports, Robinson",
              "variations": {"Rob.La.": "Rob.", "Robinson": "Rob."}},
             {"cite_type": "state",
              "editions": {"Rob.": [{"year":1842, "month":0, "day":1},
                                    {"year":1844, "month":11, "day":31}]},
              "mlz_jurisdiction": ["us;va"],
              "name": "Virginia Reports, Robinson",
              "variations": {"Rob.Va.": "Rob.",
                             "Robinson": "Rob.",
                             "Va.(Rob.)": "Rob."}}],
    "Robards": [{"cite_type": "state",
                 "editions": {"Robards": [{"year":1862, "month":0, "day":1},
                                          {"year":1865, "month":11, "day":31}]},
                 "mlz_jurisdiction": ["us;tx"],
                 "name": "Synopses of the Decisions of the Supreme Court of Texas Arising from Restraints by Conscript and Other Military Authorities (Robards)",
                 "variations": {"Rob.": "Robards",
                                "Rob.Cons.Cas.(Tex.)": "Robards",
                                "Rob.Consc.Cas.": "Robards",
                                "Robard": "Robards"}}],
    "Root": [{"cite_type": "state",
              "editions": {"Root": [{"year":1789, "month":0, "day":1},
                                    {"year":1798, "month":11, "day":31}]},
              "mlz_jurisdiction": ["us;ct"],
              "name": "Root's Connecticut Reports",
              "variations": {}}],
    "S. & M.": [{"cite_type": "state",
                 "editions": {"S. & M.": [{"year":1843, "month":0, "day":1},
                                          {"year":1850, "month":11, "day":31}]},
                 "mlz_jurisdiction": ["us;ms"],
                 "name": "Mississippi Reports, Smedes and Marshall",
                 "variations": {"Miss.(S.& M.)": "S. & M.",
                                "S.& Mar.": "S. & M.",
                                "Sm.& M.": "S. & M.",
                                "Smed.& M.": "S. & M.",
                                "Smedes & M.(Miss.)": "S. & M."}}],
    "S. Ct.": [{"cite_type": "fed",
                "editions": {"S. Ct.": [{"year":1882, "month":0, "day":1},
                                        {"year":false, "month":false, "day":false}]},
                "mlz_jurisdiction": ["us;federal;supreme.court"],
                "name": "West's Supreme Court Reporter",
                "variations": {"S Ct": "S. Ct.",
                               "S.C.": "S. Ct.",
                               "S.Ct.": "S. Ct.",
                               "Sup.Ct.": "S. Ct.",
                               "Sup.Ct.Rep.": "S. Ct.",
                               "Supr.Ct.Rep.": "S. Ct."}}],
    "S.C.": [{"cite_type": "state",
              "editions": {"S.C.": [{"year":1868, "month":0, "day":1},
                                    {"year":false, "month":false, "day":false}]},
              "mlz_jurisdiction": ["us;sc"],
              "name": "South Carolina Reports",
              "variations": {"S.C.R.": "S.C.",
                             "S.Car.": "S.C.",
                             "So.C.": "S.C.",
                             "So.Car.": "S.C.",
                             "South Car.": "S.C."}}],
    "S.D.": [{"cite_type": "state",
              "editions": {"S.D.": [{"year":1890, "month":0, "day":1},
                                    {"year":1976, "month":11, "day":31}]},
              "mlz_jurisdiction": ["us;sd"],
              "name": "South Dakota Reports",
              "variations": {"S.Dak.": "S.D."}}],
    "S.E.": [{"cite_type": "state_regional",
              "editions": {"S.E.": [{"year":1887, "month":0, "day":1},
                                    {"year":1939, "month":11, "day":31}],
                           "S.E.2d": [{"year":1939, "month":0, "day":1},
                                      {"year":false, "month":false, "day":false}]},
              "mlz_jurisdiction": ["us;ga","us;nc","us;sc","us;va","us;wv"],
              "name": "South Eastern Reporter",
              "variations": {"S. E.": "S.E.",
                             "S. E. 2d": "S.E.2d",
                             "S. E.2d": "S.E.2d",
                             "S.E. 2d": "S.E.2d",
                             "SE": "S.E.",
                             "SE 2d": "S.E.2d"}}],
    "S.W.": [{"cite_type": "state_regional",
              "editions": {"S.W.": [{"year":1886, "month":0, "day":1},
                                    {"year":1928, "month":11, "day":31}],
                           "S.W.2d": [{"year":1928, "month":0, "day":1},
                                      {"year":1999, "month":11, "day":31}],
                           "S.W.3d": [{"year":1999, "month":0, "day":1},
                                      {"year":false, "month":false, "day":false}]},
              "mlz_jurisdiction": ["us;ar","us;ky","us;mo","us;tn","us;tx"],
              "name": "South Western Reporter",
              "variations": {"S. W.": "S.W.",
                             "S. W. 2d": "S.W.2d",
                             "S. W. 3d": "S.W.3d",
                             "S. W.2d": "S.W.2d",
                             "S. W.3d": "S.W.3d",
                             "S.W. 2d": "S.W.2d",
                             "S.W. 3d": "S.W.3d",
                             "SW": "S.W.",
                             "SW 2d": "S.W.2d",
                             "SW 3d": "S.W.3d"}}],
    "SD": [{"cite_type": "neutral",
            "editions": {"SD": [{"year":1750, "month":0, "day":1},
                                {"year":false, "month":false, "day":false}]},
            "mlz_jurisdiction": ["us;sd"],
            "name": "South Dakota Neutral Citation",
            "variations": {}}],
    "Sadler": [{"cite_type": "state",
                "editions": {"Sadler": [{"year":1885, "month":0, "day":1},
                                        {"year":1888, "month":11, "day":31}]},
                "mlz_jurisdiction": ["us;pa"],
                "name": "Pennsylvania State Reports, Sadler",
                "variations": {"Pa.Cas.": "Sadler",
                               "Sad.Pa.Cas.": "Sadler",
                               "Sad.Pa.Cs.": "Sadler",
                               "Sadl.": "Sadler",
                               "Sadler(Pa.)": "Sadler"}}],
    "Sand. Ch.": [{"cite_type": "state",
                   "editions": {"Sand. Ch.": [{"year":1843, "month":0, "day":1},
                                              {"year":1847, "month":11, "day":31}]},
                   "mlz_jurisdiction": ["us;ny"],
                   "name": "Sandford's Chancery Reports",
                   "variations": {"Sand.Chy.": "Sand. Ch.",
                                  "Sandf.Ch.": "Sand. Ch.",
                                  "Sandf.Ch.(N.Y.)": "Sand. Ch.",
                                  "Sandf.Chy.": "Sand. Ch."}}],
    "Sarat. Ch. Sent.": [{"cite_type": "state",
                          "editions": {"Sarat. Ch. Sent.": [{"year":1841, "month":0, "day":1},
                                                            {"year":1847, "month":11, "day":31}]},
                          "mlz_jurisdiction": ["us;ny"],
                          "name": "Saratoga Chancery Sentinel",
                          "variations": {"Ch.Sent.": "Sarat. Ch. Sent.",
                                         "Ch.Sent.(N.Y.)": "Sarat. Ch. Sent.",
                                         "N.Y.Ch.Sent.": "Sarat. Ch. Sent.",
                                         "Sar.Ch.Sen.": "Sarat. Ch. Sent."}}],
    "Scam.": [{"cite_type": "state",
               "editions": {"Scam.": [{"year":1832, "month":0, "day":1},
                                      {"year":1843, "month":11, "day":31}]},
               "mlz_jurisdiction": ["us;il"],
               "name": "Illinois Reports, Scammon",
               "variations": {"Ill.(Scam.)": "Scam.", "Sc.": "Scam."}}],
    "Serg. & Rawle": [{"cite_type": "state",
                       "editions": {"Serg. & Rawle": [{"year":1814, "month":0, "day":1},
                                                      {"year":1828, "month":11, "day":31}]},
                       "mlz_jurisdiction": ["us;pa"],
                       "name": "Pennsylvania State Reports, Sergeant and Rawle",
                       "variations": {"Serg.& R.": "Serg. & Rawle",
                                      "Serg.& Raw.": "Serg. & Rawle",
                                      "Serg.& Rawl.": "Serg. & Rawle"}}],
    "Sneed": [{"cite_type": "state",
               "editions": {"Sneed": [{"year":1801, "month":0, "day":1},
                                      {"year":1805, "month":11, "day":31}]},
               "mlz_jurisdiction": ["us;ky"],
               "name": "Kentucky Reports, Sneed",
               "variations": {"Ken.Dec.": "Sneed",
                              "Ky.(Sneed)": "Sneed",
                              "Sneed Dec.": "Sneed"}},
              {"cite_type": "state",
               "editions": {"Sneed": [{"year":1853, "month":0, "day":1},
                                      {"year":1858, "month":11, "day":31}]},
               "mlz_jurisdiction": ["us;tn"],
               "name": "Tennessee Reports, Sneed",
               "variations": {"Tenn.(Sneed)": "Sneed"}}],
    "So.": [{"cite_type": "state_regional",
             "editions": {"So.": [{"year":1886, "month":0, "day":1},
                                  {"year":1941, "month":11, "day":31}],
                          "So. 2d": [{"year":1941, "month":0, "day":1},
                                     {"year":2008, "month":11, "day":31}],
                          "So. 3d": [{"year":2008, "month":0, "day":1},
                                     {"year":false, "month":false, "day":false}]},
             "mlz_jurisdiction": ["us;al","us;fl","us;la","us;ms"],
             "name": "Southern Reporter",
             "variations": {"So.2d": "So. 2d",
                            "So.3d": "So. 3d",
                            "South.": "So.",
                            "South.2d": "So. 2d",
                            "South.3d": "So. 3d"}}],
    "Speers": [{"cite_type": "state",
                "editions": {"Speers": [{"year":1842, "month":0, "day":1},
                                        {"year":1844, "month":11, "day":31}]},
                "mlz_jurisdiction": ["us;sc"],
                "name": "South Carolina Reports, Speers",
                "variations": {"S.C.L.(Speers)": "Speers",
                               "Sp.": "Speers",
                               "Spears": "Speers",
                               "Speers L.(S.C.)": "Speers"}}],
    "Speers Eq.": [{"cite_type": "state",
                    "editions": {"Speers Eq.": [{"year":1842, "month":0, "day":1},
                                                {"year":1844, "month":11, "day":31}]},
                    "mlz_jurisdiction": ["us;sc"],
                    "name": "South Carolina Reports, Speers' Equity",
                    "variations": {"S.C.Eq.(Speers Eq.)": "Speers Eq.",
                                   "Sp.": "Speers Eq.",
                                   "Sp.Ch.": "Speers Eq.",
                                   "Spear Ch.": "Speers Eq.",
                                   "Spear Eq.": "Speers Eq.",
                                   "Spears": "Speers Eq.",
                                   "Spears Eq.": "Speers Eq.",
                                   "Speers": "Speers Eq.",
                                   "Speers Eq.(S.C.)": "Speers Eq."}}],
    "State Rptr.": [{"cite_type": "state",
                     "editions": {"State Rptr.": [{"year":1945, "month":0, "day":1},
                                                  {"year":false, "month":false, "day":false}]},
                     "mlz_jurisdiction": ["us;mt"],
                     "name": "State Reporter",
                     "variations": {}}],
    "Stew.": [{"cite_type": "state",
               "editions": {"Stew.": [{"year":1827, "month":0, "day":1},
                                      {"year":1831, "month":11, "day":31}]},
               "mlz_jurisdiction": ["us;al"],
               "name": "Alabama Reports, Stewart",
               "variations": {"Stewart": "Stew."}}],
    "Stew. & P.": [{"cite_type": "state",
                    "editions": {"Stew. & P.": [{"year":1831, "month":0, "day":1},
                                                {"year":1834, "month":0, "day":1}]},
                    "mlz_jurisdiction": ["us;al"],
                    "name": "Alabama Reports, Stewart and Porter",
                    "variations": {}}],
    "Strob.": [{"cite_type": "state",
                "editions": {"Strob.": [{"year":1846, "month":0, "day":1},
                                        {"year":1850, "month":11, "day":31}]},
                "mlz_jurisdiction": ["us;sc"],
                "name": "South Carolina Reports, Strobhart",
                "variations": {"S.C.L.(Strob.)": "Strob.",
                               "Strobh.L.(S.C.)": "Strob."}}],
    "Strob. Eq.": [{"cite_type": "state",
                    "editions": {"Strob. Eq.": [{"year":1846, "month":0, "day":1},
                                                {"year":1850, "month":11, "day":31}]},
                    "mlz_jurisdiction": ["us;sc"],
                    "name": "South Carolina Reports, Strobhart's Equity",
                    "variations": {"S.C.Eq.(Strob.Eq.)": "Strob. Eq.",
                                   "Strob.Eq.(S.C.)": "Strob. Eq."}}],
    "Swan": [{"cite_type": "state",
              "editions": {"Swan": [{"year":1851, "month":0, "day":1},
                                    {"year":1853, "month":11, "day":31}]},
              "mlz_jurisdiction": ["us;tn"],
              "name": "Tennessee Reports, Swan",
              "variations": {"Tenn.(Swan)": "Swan"}}],
    "T.B. Mon.": [{"cite_type": "state",
                   "editions": {"T.B. Mon.": [{"year":1824, "month":0, "day":1},
                                              {"year":1828, "month":11, "day":31}]},
                   "mlz_jurisdiction": ["us;ky"],
                   "name": "Kentucky Reports, Monroe, T.B.",
                   "variations": {"Ky.(T.B.Monroe)": "T.B. Mon.",
                                  "Mon.": "T.B. Mon.",
                                  "Mon.T.B.": "T.B. Mon.",
                                  "T.B.Mon.(Ky.)": "T.B. Mon."}}],
    "T.C.": [{"cite_type": "specialty",
              "editions": {"T.C.": [{"year":1942, "month":0, "day":1},
                                    {"year":false, "month":false, "day":false}]},
              "mlz_jurisdiction": ["us"],
              "name": "Reports of the United States Tax Court",
              "variations": {"T. C.": "T.C.", "T.Ct": "T.C.", "T.Ct.": "T.C."}}],
    "T.C.M.": [{"cite_type": "specialty",
                "editions": {"T.C.M.": [{"year":1942, "month":0, "day":1},
                                        {"year":false, "month":false, "day":false}]},
                "mlz_jurisdiction": ["us"],
                "name": "Tax Court Memorandum Decisions",
                'variations': {'T.C.M. (CCH)': 'T.C.M.',
                               'T.C.M. (P-H)': 'T.C.M.',
                               'T.C.M. (RIA)': 'T.C.M.'}}],
    "Tay.": [{"cite_type": "state",
              "editions": {"Tay.": [{"year":1798, "month":0, "day":1},
                                    {"year":1802, "month":11, "day":31}]},
              "mlz_jurisdiction": ["us;nc"],
              "name": "North Carolina Reports, Taylor",
              "variations": {"N.C.(Tay.)": "Tay.",
                             "Tay.J.L.": "Tay.",
                             "Tay.N.C.": "Tay.",
                             "Tayl.N.C.": "Tay.",
                             "Taylor": "Tay."}}],
    "Taylor": [{"cite_type": "state",
                "editions": {"Taylor": [{"year":1816, "month":0, "day":1},
                                        {"year":1818, "month":11, "day":31}]},
                "mlz_jurisdiction": ["us;nc"],
                "name": "Taylor's North Carolina Term Reports",
                "variations": {"N.C.(Taylor)": "Taylor",
                               "N.C.T.Rep.": "Taylor",
                               "N.C.Term.R.": "Taylor",
                               "N.C.Term.Rep.": "Taylor"}}],
    "Teiss.": [{"cite_type": "state",
                "editions": {"Teiss.": [{"year":1903, "month":0, "day":1},
                                        {"year":1917, "month":11, "day":31}]},
                "mlz_jurisdiction": ["us;la"],
                "name": "Louisiana Court of Appeals Reports, Teisser",
                "variations": {"La.App.(Orleans)": "Teiss.",
                               "Teissier": "Teiss."}}],
    "Tenn.": [{"cite_type": "state",
               "editions": {"Tenn.": [{"year":1870, "month":0, "day":1},
                                      {"year":1971, "month":11, "day":31}]},
               "mlz_jurisdiction": ["us;tn"],
               "name": "Tennessee Reports",
               "variations": {"Ten.": "Tenn."}}],
    "Tenn. App.": [{"cite_type": "state",
                    "editions": {"Tenn. App.": [{"year":1925, "month":0, "day":1},
                                                {"year":1971, "month":11, "day":31}]},
                    "mlz_jurisdiction": ["us;tn"],
                    "name": "Tennessee Appeals Reports",
                    "variations": {}}],
    "Tenn. Crim. App.": [{"cite_type": "state",
                          "editions": {"Tenn. Crim. App.": [{"year":1967, "month":0, "day":1},
                                                            {"year":1971, "month":11, "day":31}]},
                          "mlz_jurisdiction": ["us;tn"],
                          "name": "Tennessee Criminal Appeals Reports",
                          "variations": {}}],
    "Tex.": [{"cite_type": "state",
              "editions": {"Tex.": [{"year":1846, "month":0, "day":1},
                                    {"year":1962, "month":11, "day":31}]},
              "mlz_jurisdiction": ["us;tx"],
              "name": "Texas Reports",
              "variations": {"Tex.S.Ct.": "Tex."}}],
    "Tex. Civ. App.": [{"cite_type": "state",
                        "editions": {"Tex. Civ. App.": [{"year":1892, "month":0, "day":1},
                                                        {"year":1911, "month":11, "day":31}]},
                        "mlz_jurisdiction": ["us;tx"],
                        "name": "Texas Civil Appeals Reports",
                        "variations": {"Tex.Civ.App.": "Tex. Civ. App."}}],
    "Tex. Crim.": [{"cite_type": "state",
                    "editions": {"Tex. Crim.": [{"year":1891, "month":0, "day":1},
                                                {"year":1962, "month":11, "day":31}]},
                    "mlz_jurisdiction": ["us;tx"],
                    "name": "Texas Criminal Reports",
                    "variations": {"Tex.Cr.App.": "Tex. Crim.",
                                   "Tex.Cr.R.": "Tex. Crim.",
                                   "Tex.Crim.Rep.": "Tex. Crim."}}],
    "Tex. Ct. App.": [{"cite_type": "state",
                       "editions": {"Tex. Ct. App.": [{"year":1876, "month":0, "day":1},
                                                      {"year":1891, "month":11, "day":31}]},
                       "mlz_jurisdiction": ["us;tx"],
                       "name": "Texas Court of Appeals Reports",
                       "variations": {"Tex.Ct.App.R.": "Tex. Ct. App."}}],
    "Tex. L. Rev.": [{"cite_type": "state",
                      "editions": {"Tex. L. Rev.": [{"year":1845, "month":0, "day":1},
                                                    {"year":1846, "month":11, "day":31}]},
                      "mlz_jurisdiction": ["us;tx"],
                      "name": "Texas Law Review",
                      "variations": {"Texas L.Rev.": "Tex. L. Rev."}}],
    "Tex. Sup. Ct. J.": [{"cite_type": "state",
                          "editions": {"Tex. Sup. Ct. J.": [{"year":1957, "month":0, "day":1},
                                                            {"year":false, "month":false, "day":false}]},
                          "mlz_jurisdiction": ["us;tx"],
                          "name": "Texas Supreme Court Journal",
                          "variations": {}}],
    "Tread.": [{"cite_type": "state",
                "editions": {"Tread.": [{"year":1812, "month":0, "day":1},
                                        {"year":1816, "month":11, "day":31}]},
                "mlz_jurisdiction": ["us;sc"],
                "name": "South Carolina Reports, Treadway",
                "variations": {"S.C.L.(Tread.)": "Tread."}}],
    "Tuck. & Cl.": [{"cite_type": "state",
                     "editions": {"Tuck. & Cl.": [{"year":1892, "month":0, "day":1},
                                                  {"year":1893, "month":11, "day":31}]},
                     "mlz_jurisdiction": ["us;dc"],
                     "name": "District of Columbia Reports, Tucker and Clephane",
                     "variations": {"D.C.(Tuck.& Cl.)": "Tuck. & Cl.",
                                    "Tuck.": "Tuck. & Cl.",
                                    "Tuck.& C.": "Tuck. & Cl."}}],
    "Tyl.": [{"cite_type": "state",
              "editions": {"Tyl.": [{"year":1800, "month":0, "day":1},
                                    {"year":1803, "month":11, "day":31}]},
              "mlz_jurisdiction": ["us;vt"],
              "name": "Vermont Reports, Tyler",
              "variations": {"Tyler": "Tyl."}}],
    "Tyng": [{"cite_type": "state",
              "editions": {"Tyng": [{"year":1806, "month":0, "day":1},
                                    {"year":1822, "month":11, "day":31}]},
              "mlz_jurisdiction": ["us;ma"],
              "name": "Massachusetts Reports, Tyng",
              "variations": {"Mass.(Tyng)": "Tyng"}}],
    "U.S.": [{"cite_type": "fed",
              "editions": {"U.S.": [{"year":1790, "month":0, "day":1},
                                    {"year":false, "month":false, "day":false}]},
              "mlz_jurisdiction": ["us;federal;supreme.court"],
              "name": "United States Supreme Court Reports",
              "variations": {"U. S.": "U.S.",
                             "U.S.S.C.Rep.": "U.S.",
                             "US": "U.S.",
                             "USSCR": "U.S."}}],
    "U.S. App. D.C.": [{"cite_type": "state",
                        "editions": {"U.S. App. D.C.": [{"year":1941, "month":0, "day":1},
                                                        {"year":false, "month":false, "day":false}]},
                        "mlz_jurisdiction": ["us;dc"],
                        "name": "United States Court of Appeals Reports",
                        "variations": {}}],
    "U.S. App. LEXIS": [{"cite_type": "specialty",
                         "editions": {"U.S. App. LEXIS": [{"year":1750, "month":0, "day":1},
                                                          {"year":false, "month":false, "day":false}]},
                         "mlz_jurisdiction": ["us;federal;1-cir","us;federal;2-cir","us;federal;3-cir","us;federal;4-cir","us;federal;5-cir","us;federal;6-cir","us;federal;7-cir","us;federal;8-cir","us;federal;9-cir","us;federal;10-cir","us;federal;11-cir"],
                         "name": "Lexis Nexus U.S. Appeals Citation",
                         "variations": {}}],
    "U.S.L.W.": [{"cite_type": "specialty",
                  "editions": {"U.S.L.W.": [{"year":1933, "month":0, "day":1},
                                            {"year":false, "month":false, "day":false}]},
                  "mlz_jurisdiction": ["us"],
                  "name": "United States Law Week",
                  "variations": {}}],
    "UT": [{"cite_type": "neutral",
            "editions": {"UT": [{"year":1750, "month":0, "day":1},
                                {"year":false, "month":false, "day":false}]},
            "mlz_jurisdiction": ["us;ut"],
            "name": "Utah Neutral Citation",
            "variations": {}}],
    "UT App": [{"cite_type": "neutral",
                "editions": {"UT App": [{"year":1750, "month":0, "day":1},
                                        {"year":false, "month":false, "day":false}]},
                "mlz_jurisdiction": ["us;ut"],
                "name": "Utah Neutral Citation",
                "variations": {}}],
    "Utah": [{"cite_type": "state",
              "editions": {"Utah": [{"year":1851, "month":0, "day":1},
                                    {"year":1974, "month":11, "day":31}],
                           "Utah 2d": [{"year":1851, "month":0, "day":1},
                                       {"year":1974, "month":11, "day":31}]},
              "mlz_jurisdiction": ["us;ut"],
              "name": "Utah Reports",
              "variations": {}}],
    "V.I.": [{"cite_type": "state",
             "editions": {"V.I.": [{"year":1917, "month":0, "day":1},
                                   {"year":false, "month":false, "day":false}]},
             "mlz_jurisdiction": ["us;vi"],
             "name": "Virgin Islands Reports",
             "variations": {}}],
    "VT": [{"cite_type": "neutral",
            "editions": {"VT": [{"year":1750, "month":0, "day":1},
                                {"year":false, "month":false, "day":false}]},
            "mlz_jurisdiction": ["us;vt"],
            "name": "Vermont Neutral Citation",
            "variations": {}}],
    "Va.": [{"cite_type": "state",
             "editions": {"Va.": [{"year":1880, "month":0, "day":1},
                                  {"year":false, "month":false, "day":false}]},
             "mlz_jurisdiction": ["us;va"],
             "name": "Virginia Reports",
             "variations": {"V.": "Va.", "Virg.": "Va."}}],
    "Va. App.": [{"cite_type": "state",
                  "editions": {"Va. App.": [{"year":1985, "month":0, "day":1},
                                            {"year":false, "month":false, "day":false}]},
                  "mlz_jurisdiction": ["us;va"],
                  "name": "Virginia Court of Appeals Reports",
                  "variations": {}}],
    "Va. Cas.": [{"cite_type": "state",
                  "editions": {"Va. Cas.": [{"year":1789, "month":0, "day":1},
                                            {"year":1826, "month":11, "day":31}]},
                  "mlz_jurisdiction": ["us;va"],
                  "name": "Virginia Cases, Criminal",
                  "variations": {}}],
    "Vet. App.": [{"cite_type": "specialty",
                   "editions": {"Vet. App.": [{"year":1990, "month":0, "day":1},
                                              {"year":false, "month":false, "day":false}]},
                   "mlz_jurisdiction": ["us"],
                   "name": "Veterans Appeals Reporter",
                   "variations": {"Vet.App.": "Vet. App."}}],
    "Vt.": [{"cite_type": "state",
             "editions": {"Vt.": [{"year":1826, "month":0, "day":1},
                                  {"year":false, "month":false, "day":false}]},
             "mlz_jurisdiction": ["us;vt"],
             "name": "Vermont Reports",
             "variations": {"V.R.": "Vt.", "Verm.": "Vt."}}],
    "W. Va.": [{"cite_type": "state",
                "editions": {"W. Va.": [{"year":1864, "month":0, "day":1},
                                        {"year":false, "month":false, "day":false}]},
                "mlz_jurisdiction": ["us;wv"],
                "name": "West Virginia Reports",
                "variations": {"W.V.": "W. Va.", 
                               "West Va.": "W. Va."}}],
    "WI": [{"cite_type": "neutral",
            "editions": {"WI": [{"year":1750, "month":0, "day":1},
                                {"year":false, "month":false, "day":false}]},
            "mlz_jurisdiction": ["us;wi"],
            "name": "Wisconsin Neutral Citation",
            "variations": {}}],
    "WI App": [{"cite_type": "neutral",
                "editions": {"WI App": [{"year":1750, "month":0, "day":1},
                                        {"year":false, "month":false, "day":false}]},
                "mlz_jurisdiction": ["us;wi"],
                "name": "Wisconsin Neutral Citation",
                "variations": {}}],
    "WL": [{"cite_type": "specialty",
            "editions": {"WL": [{"year":1750, "month":0, "day":1},
                                {"year":false, "month":false, "day":false}]},
            "mlz_jurisdiction": ["us;ct","us;de","us;dc","us;me","us;nh","us;nj","us;pa","us;ri","us;vt","us;il","us;in","us;ma","us;ny","us;oh","us;ia","us;mi","us;mn","us;ne","us;nd","us;sd","us;wi","us;ak","us;az","us;ca","us;co","us;hi","us;id","us;ks","us;mt","us;nv","us;nm","us;ok","us;or","us;ut","us;wa","us;wy","us;ga","us;nc","us;sc","us;va","us;wv","us;ar","us;ky","us;mo","us;tn","us;tx","us;al","us;fl","us;la","us;ms","us;federal;1-cir","us;federal;2-cir","us;federal;3-cir","us;federal;4-cir","us;federal;5-cir","us;federal;6-cir","us;federal;7-cir","us;federal;8-cir","us;federal;9-cir","us;federal;10-cir","us;federal;11-cir"],
            "name": "West Law Citation",
            "variations": {}}],
    "WY": [{"cite_type": "neutral",
            "editions": {"WY": [{"year":1750, "month":0, "day":1},
                                {"year":false, "month":false, "day":false}]},
            "mlz_jurisdiction": ["us;wy"],
            "name": "Wyoming Neutral Citation",
            "variations": {}}],
    "Walk.": [{"cite_type": "state",
               "editions": {"Walk.": [{"year":1855, "month":0, "day":1},
                                      {"year":1885, "month":11, "day":31}]},
               "mlz_jurisdiction": ["us;pa"],
               "name": "Pennsylvania State Reports, Walker",
               "variations": {"Walk.Pa.": "Walk.",
                              "Walker": "Walk."}}],
    "Walker": [{"cite_type": "state",
                "editions": {"Walker": [{"year":1818, "month":0, "day":1},
                                        {"year":1832, "month":11, "day":31}]},
                "mlz_jurisdiction": ["us;ms"],
                "name": "Mississippi Reports, Walker",
                "variations": {"Miss.(Walker)": "Walker",
                               "Walk.": "Walker",
                               "Walk.Miss.": "Walker"}}],
    "Wall.": [{"cite_type": "scotus_early",
               "editions": {"Wall.": [{"year":1863, "month":0, "day":1},
                                      {"year":1874, "month":11, "day":31}]},
               "mlz_jurisdiction": ["us;federal;supreme.court"],
               "name": "Wallace's Supreme Court Reports",
               "variations": {"U.S.(Wall.)": "Wall.",
                              "Wall.": "Wall.",
                              "Wallace": "Wall.",
                              "Wall.Rep.": "Wall.",
                              "Wall.S.C.": "Wall."}}],
    "Wash.": [{"cite_type": "state",
               "editions": {"Wash.": [{"year":1790, "month":0, "day":1},
                                      {"year":1796, "month":11, "day":31}]},
               "mlz_jurisdiction": ["us;va"],
               "name": "Virginia Reports, Washington",
               "variations": {"Va.(Wash.)": "Wash.", "Wash.Va.": "Wash."}},
              {"cite_type": "state",
               "editions": {"Wash.": [{"year":1889, "month":0, "day":1},
                                      {"year":false, "month":false, "day":false}],
                            "Wash. 2d": [{"year":1889, "month":0, "day":1},
                                         {"year":false, "month":false, "day":false}]},
               "mlz_jurisdiction": ["us;wa"],
               "name": "Washington Reports",
               "variations": {"W.": "Wash.",
                              "W.2d": "Wash. 2d",
                              "W.St.": "Wash.",
                              "WASH": "Wash.",
                              "Wa.": "Wash.",
                              "Wa.2d": "Wash. 2d",
                              "Wash.St.": "Wash.",
                              "Wn": "Wash.",
                              "Wn. 2d": "Wash. 2d",
                              "Wn.2d": "Wash. 2d"}}],
    "Wash. App.": [{"cite_type": "state",
                    "editions": {"Wash. App.": [{"year":1969, "month":0, "day":1},
                                                {"year":false, "month":false, "day":false}]},
                    "mlz_jurisdiction": ["us;wa"],
                    "name": "Washington Appellate Reports",
                    "variations": {"W.App.": "Wash. App.",
                                   "Wa.A.": "Wash. App.",
                                   "Wn. App.": "Wash. App.",
                                   "Wn.App.": "Wash. App."}}],
    "Wash. Terr.": [{"cite_type": "state",
                     "editions": {"Wash. Terr.": [{"year":1854, "month":0, "day":1},
                                                  {"year":1888, "month":11, "day":31}]},
                     "mlz_jurisdiction": ["us;wa"],
                     "name": "Washington Territory Reports",
                     "variations": {"Allen": "Wash. Terr.",
                                    "W.T.": "Wash. Terr.",
                                    "W.Ty.R.": "Wash. Terr.",
                                    "Wash.": "Wash. Terr.",
                                    "Wash.T.": "Wash. Terr.",
                                    "Wash.Ter.": "Wash. Terr.",
                                    "Wash.Ter.N.S.": "Wash. Terr.",
                                    "Wash.Ty.": "Wash. Terr.",
                                    "Wn. Terr.": "Wash. Terr."}}],
    "Watts": [{"cite_type": "state",
               "editions": {"Watts": [{"year":1832, "month":0, "day":1},
                                      {"year":1840, "month":11, "day":31}]},
               "mlz_jurisdiction": ["us;pa"],
               "name": "Pennsylvania State Reports, Watts",
               "variations": {"Wa.": "Watts", "Watts(Pa.)": "Watts"}}],
    "Watts & Serg.": [{"cite_type": "state",
                       "editions": {"Watts & Serg.": [{"year":1841, "month":0, "day":1},
                                                      {"year":1845, "month":11, "day":31}]},
                       "mlz_jurisdiction": ["us;pa"],
                       "name": "Pennsylvania State Reports, Watts & Sergeant",
                       "variations": {"W.& S.": "Watts & Serg.",
                                      "Watts & S.": "Watts & Serg."}}],
    "Wend.": [{"cite_type": "state",
               "editions": {"Wend.": [{"year":1828, "month":0, "day":1},
                                      {"year":1841, "month":11, "day":31}]},
               "mlz_jurisdiction": ["us;ny"],
               "name": "Wendell's Reports",
               "variations": {"W.": "Wend.",
                              "Wend.(N.Y.)": "Wend.",
                              "Wendell": "Wend."}}],
    "Whart.": [{"cite_type": "state",
                "editions": {"Whart.": [{"year":1835, "month":0, "day":1},
                                        {"year":1841, "month":11, "day":31}]},
                "mlz_jurisdiction": ["us;pa"],
                "name": "Pennsylvania State Reports, Wharton",
                "variations": {"Wh.": "Whart.",
                               "Whar.": "Whart.",
                               "Whart.Pa.": "Whart.",
                               "Wharton": "Whart."}}],
    "Wheat.": [{"cite_type": "scotus_early",
                "editions": {"Wheat.": [{"year":1816, "month":0, "day":1},
                                        {"year":1827, "month":11, "day":31}]},
                "mlz_jurisdiction": ["us;federal;supreme.court"],
                "name": "Wheaton's Supreme Court Reports",
                "variations": {"U.S.(Wheat.)": "Wheat.", "Wheaton": "Wheat."}}],
    "White & W.": [{"cite_type": "state",
                    "editions": {"White & W.": [{"year":1876, "month":0, "day":1},
                                                {"year":1883, "month":11, "day":31}]},
                    "mlz_jurisdiction": ["us;tx"],
                    "name": "Condensed Reports of Decisions in Civil Causes in the Court of Appeals of Texas (White & Wilson)",
                    "variations": {"Tex.A.Civ.": "White & W.",
                                   "Tex.A.Civ.Cas.": "White & W.",
                                   "Tex.App.": "White & W.",
                                   "Tex.C.C.": "White & W.",
                                   "Tex.Civ.Cas.": "White & W.",
                                   "Tex.Ct.App.Dec.Civ.": "White & W.",
                                   "W.& W.": "White & W.",
                                   "White & W.(Tex.)": "White & W.",
                                   "White & W.Civ.Cas.Ct.App.": "White & W.",
                                   "Wi.& Will.": "White & W."}}],
    "Will.": [{"cite_type": "state",
               "editions": {"Will.": [{"year":1804, "month":0, "day":1},
                                      {"year":1805, "month":11, "day":31}]},
               "mlz_jurisdiction": ["us;ma"],
               "name": "Massachusetts Reports, Williams",
               "variations": {"Mass.(Will.)": "Will.",
                              "Will.Mass.": "Will.",
                              "Williams": "Will."}}],
    "Wilson": [{"cite_type": "state",
                "editions": {"Wilson": [{"year":1883, "month":0, "day":1},
                                        {"year":1892, "month":11, "day":31}]},
                "mlz_jurisdiction": ["us;tx"],
                "name": "Condensed Reports of Decisions in Civil Causes in the Court of Appeals of Texas (Wilson)",
                "variations": {}}],
    "Win.": [{"cite_type": "state",
              "editions": {"Win.": [{"year":1863, "month":0, "day":1},
                                    {"year":1864, "month":11, "day":31}]},
              "mlz_jurisdiction": ["us;nc"],
              "name": "North Carolina Reports, Winston",
              "variations": {}}],
    "Wis.": [{"cite_type": "state",
              "editions": {"Wis.": [{"year":1853, "month":0, "day":1},
                                    {"year":false, "month":false, "day":false}],
                           "Wis. 2d": [{"year":1853, "month":0, "day":1},
                                       {"year":false, "month":false, "day":false}]},
              "mlz_jurisdiction": ["us;wi"],
              "name": "Wisconsin Reports",
              "variations": {"W.": "Wis.",
                             "W.2d": "Wis. 2d",
                             "W.R.": "Wis.",
                             "Wis.2d": "Wis. 2d"}}],
    "Wyo.": [{"cite_type": "state",
              "editions": {"Wyo.": [{"year":1870, "month":0, "day":1},
                                    {"year":1959, "month":11, "day":31}]},
              "mlz_jurisdiction": ["us;wy"],
              "name": "Wyoming Reports",
              "variations": {"W.": "Wyo.", "Wy.": "Wyo."}}],
    "Yates Sel. Cas.": [{"cite_type": "state",
                         "editions": {"Yates Sel. Cas.": [{"year":1809, "month":0, "day":1},
                                                          {"year":1809, "month":11, "day":31}]},
                         "mlz_jurisdiction": ["us;ny"],
                         "name": "Yates' Select Cases",
                         "variations": {"Yates": "Yates Sel. Cas.",
                                        "Yates Sel.Cas.(N.Y.)": "Yates Sel. Cas."}}],
    "Yeates": [{"cite_type": "state",
                "editions": {"Yeates": [{"year":1791, "month":0, "day":1},
                                        {"year":1808, "month":11, "day":31}]},
                "mlz_jurisdiction": ["us;pa"],
                "name": "Pennsylvania State Reports, Yeates",
                "variations": {"Y.": "Yeates", "Yea.": "Yeates"}}],
    "Yer.": [{"cite_type": "state",
              "editions": {"Yer.": [{"year":1828, "month":0, "day":1},
                                    {"year":1837, "month":11, "day":31}]},
              "mlz_jurisdiction": ["us;tn"],
              "name": "Tennessee Reports, Yerger",
              "variations": {"Tenn.(Yer.)": "Yer.",
                             "Yerg.": "Yer.",
                             "Yerg.(Tenn.)": "Yer."}}]
};

module.exports.reporters = reporters;
},{}],40:[function(require,module,exports){
WalverineCitation = function(volume, reporter, page) {
    /*
     * Convenience class which represents a single citation found in a document.
     */

    // Note: It will be tempting to resolve reporter variations in the __init__ function, but, alas, you cannot,
    //       because often reporter variations refer to one of several reporters (e.g. P.R. could be a variant of
    //       either ['Pen. & W.', 'P.R.R.', 'P.']).
    this.volume = volume;
    this.reporter = reporter;
    this.page = page;
    this.lookup_index = null;
    this.canonical_reporter = null;
    this.extra = null;
    this.defendant = null;
    this.plaintiff = null;
    this.court = null;
    this.year = null;
    this.mlz_jurisdiction = null;
    this.match_url = null;
    this.end_idx = null;
    this.cert_order = null;
    this.disposition = null;
    this.cite_type;
    this.match;
}

WalverineCitation.keys = function(obj) {
    if (Object.keys) return Object.keys(obj);
    var keys = [];
    for (var key in obj) if (obj.hasOwnProperty(key)) keys.push(key);
    return keys;
};

WalverineCitation.each = function(obj, iterator, context) {
    if (obj == null) return obj;
    if (Array.prototype.forEach && obj.forEach === Array.prototype.forEach) {
      obj.forEach(iterator, context);
    } else if (obj.length === +obj.length) {
      for (var i = 0, length = obj.length; i < length; i++) {
        if (iterator.call(context, obj[i], i, obj) === breaker) return;
      }
    } else {
      var keys = WalverineCitation.keys(obj);
      for (var i = 0, length = keys.length; i < length; i++) {
        if (iterator.call(context, obj[keys[i]], keys[i], obj) === breaker) return;
      }
    }
    return obj;
};

WalverineCitation.map = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (Array.prototype.map && obj.map === Array.prototype.map) return obj.map(iterator, context);
    WalverineCitation.each(obj, function(value, index, list) {
      results.push(iterator.call(context, value, index, list));
    });
    return results;
};

WalverineCitation.prototype.base_citation = function () {
    // The Commonwealth jurisdictions have cites like "Smith v. Jones [2007] HL 123".
    var volume = this.volume ? this.volume + " " : ""
    return volume + this.reporter + " " + this.page;
}

WalverineCitation.prototype.as_regex = function () {
    // Should include the year, if no volume and year is a prefix
    // Form would be something like: "[\[\(]<year>[\]\)]\s+<reporter>\s+<page>"
    var volume = this.volume ? this.volume + "(\s+)" : ""
    var ret = new RegExp(volume + this.reporter + "(\s+)" + this.page);
}

WalverineCitation.prototype.as_html = function () {
    // As above, should include year if it serves as a volume number for this jurisdiction
    var volume = this.volume ? '<span class="volume">' + this.volume + '</span>' : ""
    var inner_html = volume
        + '<span class="reporter">' + this.reporter + '</span>'
        + '<span class="page">' + this.page + '</span>';
    var span_class = "citation";
    if (this.match_url) {
        inner_html = '<a href="' + this.match_url + '">' + inner_html + '</a>';
    } else {
        span_class += " no-link";
    }
    return '<span class="' + span_class + '">' + inner_html + '</span>'
}
var Walverine = {
    builders: {},
    constants: {},
    utils: {},
    buffer: 0
};

Walverine.constants.FORWARD_SEEK = 20;
Walverine.constants.BACKWARD_SEEK = 120;

// this could be improved
var reporters = require('./reporters').reporters;

Walverine.constants.REPORTERS = reporters;
Walverine.constants.JURISDICTIONS = {
    'us;ct':['Connecticut',"Conn."],
    'us;de':['Delaware',"Del."],
    'us;dc':['District of Columbia',"D.C.", "DC"],
    'us;me':['Maine',"Me."],
    'us;nh':['New Hampshire',"N.H."],
    'us;nj':['New Jersey',"N.J."],
    'us;pa':['Pennsylvania',"Penn."],
    'us;ri':['Rhode Island',"R.I."],
    'us;vt':['Vermont',"Vt."],
    'us;il':['Illinois',"Ill."],
    'us;in':['Indiana',"Ind."],
    'us;ma':['Massachussetts',"Mass."],
    'us;md':['Maryland',"Md."],
    'us;ny':['New York',"N.Y."],
    'us;oh':['Ohio'],
    'us;ia':['Iowa'],
    'us;mi':['Michigan',"Mich."],
    'us;mn':['Minnisota',"Minn."],
    'us;ne':['Nebraska',"Neb."],
    'us;nd':['North Dakota'],
    'us;sd':['South Dakota'],
    'us;wi':['Wisconsin',"Wis.","Wisc."],
    'us;ak':['Alaska',"Ala."],
    'us;az':['Arizona',"Ariz."],
    'us;ca':['California',"Cal."],
    'us;co':['Colorado',"Co."],
    'us;hi':["Hawai'i","Hawaii"],
    'us;id':['Idaho'],
    'us;ks':['Kansas',"Kan."],
    'us;mt':['Montana',"Mon.","Mont."],
    'us;nv':['Nevada',"Nev."],
    'us;nm':['New Mexico',"N.M."],
    'us;ok':['Oklahoma',"Ok."],
    'us;or':['Oregon',"Or."],
    'us;ut':['Utah'],
    'us;wa':['Washington',"Wa.","Wash."],
    'us;wy':['Wyoming',"Wy.","Wyo."],
    'us;ga':['Georgia',"Ga."],
    'us;nc':['North Carolina',"N.C."],
    'us;sc':['South Carolina',"S.C."],
    'us;va':['Virginia',"Va."],
    'us;wv':['West Virginia',"West Va.","W. Va.", "W.Va."],
    'us;ar':['Arkansas',"Ark."],
    'us;ky':['Kentucky',"Ken."],
    'us;mo':['Missouri',"Mo."],
    'us;tn':['Tennessee',"Tenn."],
    'us;tx':['Texas',"Tex."],
    'us;al':['Alabama',"Ala."],
    'us;fl':['Florida',"Fla."],
    'us;la':['Louisiana',"La."],
    'us;ms':['Mississippi',"Miss."],
    'us;federal;1-cir':['First Circuit',"1st Cir.","1st Cir","1 Cir.","CA1"],
    'us;federal;2-cir':['Second Circuit',"2nd Cir.","2d Cir","2 Cir.","CA2"],
    'us;federal;3-cir':['Third Circuit',"3rd Cir.","3d Cir","3 Cir.","CA3"],
    'us;federal;4-cir':['Fourth Circuit',"4th Cir.","4th Cir","4 Cir.","CA4"],
    'us;federal;5-cir':['Fifth Circuit',"5th Cir.","5th Cir","5 Cir.","CA5"],
    'us;federal;6-cir':['Sixth Circuit',"6th Cir.","6th Cir","6 Cir.","CA6"],
    'us;federal;7-cir':['Seventh Circuit',"7th Cir.","7th Cir","7 Cir.","CA7"],
    'us;federal;8-cir':['Eighth Circuit',"8th Cir.","8th Cir","8 Cir.","CA8"],
    'us;federal;9-cir':['Ninth Circuit',"9th Cir.","9th Cir","9 Cir.","CA9"],
    'us;federal;10-cir':['Tenth Circuit',"10th Cir.","10th Cir","10 Cir.","CA10"],
    'us;federal;11-cir':['Eleventh Circuit',"11th Cir.","11th Cir","11 Cir.","CA11"]
};
Walverine.constants.ACCEPT_TOKENS = [
    'In Re',
    'In re',
    'Ex parte',
    'Ex Parte'
];

Walverine.constants.STRING_TOKENS = [
    'certiorari denied',
    'cert. denied',
    'denied',
    "aff'd",
    "aff\u2019d",
    'affirmed',
    'remanded',
    'certiorari granted',
    'cert. granted',
    'granted',
    'dismissed',
    'opinion',
    'dismissed by',
    'modified by',
    'amended by',
    'affirmed by',
    "aff'd by",
    'aff\u2019d by',
    'vacated in',
    'vacated by'
];

Walverine.constants.EMBEDDED_TOKENS = [
    "of the",
    "on the",
    "ex rel",
    "et al",
    "et al.",
    "[Nn]o.? +[0-9]+",
    "to"
];

Walverine.constants.PREPOSITIONS = [
    "citing",
    "in",
    "for",
    "from",
    "with",
    "over",
    "than",
    "by",
    "Act."
];
Walverine.builders.make_variant_key = function (key) {
    key = key.replace(".", " ", "g");
    key = key.replace(/\s+/g, " ");
    key = " " + key + " ";
    key = key.replace(/([^a-zA-Z])([A-Z])\s+([A-Z])([^A-Za-z])/g, "$1$2$3$4");
    key = key.replace(/\s+([\]\)])/g, "$1");
    key = key.replace(/^\s+/, "").replace(/\s+$/, "");
    return key;
};

Walverine.builders.make_variants = function (REPORTERS) {
    for (var canonical_key in REPORTERS) {
        var canonical_segment = REPORTERS[canonical_key];
        for (var i=0,ilen=canonical_segment.length;i<ilen;i+=1) {
            var class_entry = canonical_segment[i];
            var newvars = {};
            for (var key in class_entry.editions) {
                var nvk = this.make_variant_key(key);
                if (!class_entry.editions[nvk]
                    && !class_entry.variations[nvk]
                    && !newvars[nvk]) {

                    newvars[nvk] = key;
                }
            }
            for (var key in class_entry.variations) {
                var nvk = this.make_variant_key(key);
                if (!class_entry.editions[nvk]
                    && !class_entry.variations[nvk]
                    && !newvars[nvk]) {

                    newvars[nvk] = class_entry.variations[key];
                }
            }
            for (var nvk in newvars) {
                class_entry.variations[nvk] = newvars[nvk];
            }
        }
    }
};

Walverine.builders.make_variants(Walverine.constants.REPORTERS);
Walverine.builders.suck_out_variations_only = function (REPORTERS) {
    /*
     *  Builds a dictionary of variations to canonical reporters.
     *
     *  The dictionary takes the form of:
     *      {
     *       'A. 2d': ['A.2d'],
     *       ...
     *       'P.R.': ['Pen. & W.', 'P.R.R.', 'P.'],
     *      }
     *
     *  In other words, it's a dictionary that maps each variation to a list of
     *  reporters that it could be possibly referring to.
     */
    var variations_out = {};
    for (var reporter_key in REPORTERS) {
        // For each reporter key ...
        var data_list = REPORTERS[reporter_key];
        for (var i=0,ilen=data_list.length;i<ilen;i+=1) {
            data = data_list[i];
            // For each book it maps to...
            for (var variation_key in data.variations) {
                var variation_value = data.variations[variation_key];
                if ("undefined" !== typeof variations_out[variation_key]) {
                    var variations_list = variations_out[variation_key];
                    if (variations_list.indexOf(variation_value) === -1) {
                        variations_list.push(variation_value);
                    }
                } else {
                    // The item wasn't there; add it.
                    variations_out[variation_key] = [variation_value];
                }
            }
        }
    }
    return variations_out;
}

Walverine.constants.VARIATIONS_ONLY = Walverine.builders.suck_out_variations_only(Walverine.constants.REPORTERS);
Walverine.builders.suck_out_courts = function(JURISDICTIONS) {
    var COURTS = {};
    for (var key in JURISDICTIONS) {
        for (var i=0,ilen=JURISDICTIONS[key].length;i<ilen;i+=1) {
            var court = JURISDICTIONS[key][i];
            COURTS[court] = true;
        }
    }
    return COURTS;
}

Walverine.constants.COURTS = Walverine.builders.suck_out_courts(Walverine.constants.JURISDICTIONS);
Walverine.builders.suck_out_neutrals = function (REPORTERS) {
    /*
     *  Builds a small dictionary of neutral reporter keys
     *
     *  The dictionary takes the form of:
     *      {
     *       'AZ': true,
     *       ...
     *       'OK': true
     *      }
     *
     */
    var neutrals = {};
    for (var reporter_key in REPORTERS) {
        // For each reporter key ...
        var data_list = REPORTERS[reporter_key];
        for (var i=0,ilen=data_list.length;i<ilen;i+=1) {
            data = data_list[i];
            // For each book it maps to...
            if (data.cite_type === "neutral") {
                // So far, at least, neutrals and their variations are unambiguous.
                for (var key in data.editions) {
                    neutrals[key] = true;
                }
                for (var key in data.variations) {
                    neutrals[key] = true;
                }
            }
        }
    }
    return neutrals;
}

Walverine.constants.NEUTRALS = Walverine.builders.suck_out_neutrals(Walverine.constants.REPORTERS);
Walverine.builders.suck_out_editions = function(REPORTERS) {
    /*
     *  Builds a dictionary mapping edition keys to their root name.
     *
     *  The dictionary takes the form of:
     *      {
     *       'A.':   'A.',
     *       'A.2d': 'A.',
     *       'A.3d': 'A.',
     *       'A.D.': 'A.D.',
     *       ...
     *      }

     *  In other words, this lets you go from an edition match to its parent key.
     */
    var editions_out = {};
    for (var reporter_key in REPORTERS) {
        // For each reporter key ...
        var data_list = REPORTERS[reporter_key];
        for (var i=0,ilen=data_list.length;i<ilen;i+=1) {
            var data = data_list[i];
            for (var edition_key in data.editions) {
                // For each book it maps to...
                var edition_value = data.editions[edition_value];
                if ("undefined" === typeof editions_out[edition_key]) {
                    editions_out[edition_key] = reporter_key;
                }
            }
        }
    }
    return editions_out;
}

Walverine.constants.EDITIONS = Walverine.builders.suck_out_editions(Walverine.constants.REPORTERS);
// We need to build a REGEX that has all the variations and the reporters in_ order from longest to shortest.

Walverine.builders.make_regex = function (constants) {
    var EDITIONS = constants.EDITIONS;
    var VARIATIONS_ONLY = constants.VARIATIONS_ONLY;
    var ACCEPT_TOKENS = constants.ACCEPT_TOKENS;
    var EMBEDDED_TOKENS = constants.EMBEDDED_TOKENS;
    var STRING_TOKENS = constants.STRING_TOKENS;

    //var REGEX_LIST = [key for (key in EDITIONS)].concat([key for (key in VARIATIONS_ONLY)]);

    var REGEX_LIST = WalverineCitation.keys(EDITIONS).concat(WalverineCitation.keys(VARIATIONS_ONLY));

    /*
    REGEX_LIST = REGEX_LIST
        .concat([ACCEPT_TOKENS[i] for (i in ACCEPT_TOKENS)])
        .concat([EMBEDDED_TOKENS[i] for (i in EMBEDDED_TOKENS)])
        .concat([STRING_TOKENS[i] for (i in STRING_TOKENS)]);
    */

    REGEX_LIST = REGEX_LIST.concat(ACCEPT_TOKENS);
    REGEX_LIST = REGEX_LIST.concat(EMBEDDED_TOKENS);
    REGEX_LIST = REGEX_LIST.concat(STRING_TOKENS);

    for (var i=0,ilen=REGEX_LIST.length;i<ilen;i+=1) {
        if (REGEX_LIST[i].slice(-1) !== "." && REGEX_LIST[i].slice(-1) !== " ") {
            // Prevent mid-word matches
            REGEX_LIST[i] = " "  + REGEX_LIST[i] + " ";
        }
    }

    REGEX_LIST.sort(
        function (a,b) {
            if (a.length < b.length) {
                return 1;
            } else if (a.length > b.length) {
                return -1;
            } else {
                return 0;
            }
        }
    );
    /*
    var REGEX_STR = [REGEX_LIST[i].replace(".","\\.","g").replace("(","\\(","g").replace(")","\\)","g").replace("\'", "\\'","g") for (i in REGEX_LIST)].join("|");

    var REGEX_STR = [REGEX_LIST[i]
                     .replace(".","\\.","g")
                     .replace("(","\\(","g")
                     .replace(")","\\)","g")
                     .replace("\'", "\\'","g") for (i in REGEX_LIST)].join("|");

    */
    var REGEX_STR = WalverineCitation.map(REGEX_LIST, function(i) {
      return i.replace(".","\\.","g").replace("(","\\(","g").replace(")","\\)","g").replace("\'", "\\'","g");
    }).join("|");

    constants.REPORTER_RE = new RegExp("(" + REGEX_STR + ")");


}

Walverine.builders.make_regex(Walverine.constants);
Walverine.utils.strip_punct = function (text) {
    //starting quotes
    text = text.replace(/^\"/g, "");
    text = text.replace(/(``)/g, "");
    text = text.replace(/([ (\[{<])"/g, '')

    //punctuation
    text = text.replace(/\.\.\./g, '')
    text = text.replace(/[,;:@#$%&]/g, '')
    text = text.replace(/([^\.])(\.)([\]\)}>"\']*)\s*$/g, '$1')
    text = text.replace(/[?!]/g, '')

    // XXX What did I add this for? As written, it's only effect will be to break things.
    text = text.replace(/([^'])' /g, "")

    //parens, brackets, etc.
    text = text.replace(/[\]\[\(\)\{\}\<\>]/g, '')
    text = text.replace(/--/g, '')

    //ending quotes
    text = text.replace(/\"/g, "")
    text = text.replace(/(\S)(\'\')/g, '')

    return text.replace(/^\s+/, "").replace(/\s+$/, "");
};


Walverine.utils.get_visible_text = function (text) {
    var text = text.replace(/<(?:style|STYLE)[^>]*>.*?<\/(?:style|STYLE)>/g, " ");
    text = text.replace(/<[Aa] [^>]+>[^ ]+<\/[Aa]>/g, " ");
    text = text.replace(/<[^>]*>/g, "");
    text = text.replace("\n"," ","g");
    text = text.replace(" "," ","g");
    return text;
};

Walverine.utils.set_jurisdiction = function (citation, jurisdiction) {
    if (!citation.mlz_jurisdiction) {
        citation.mlz_jurisdiction = jurisdiction;
    }
};

Walverine.utils.is_date_in_reporter = function (editions, year) {
    /*
     *  Checks whether a year falls within the range of 1 to n editions of a reporter
     *
     *  Editions will look something like:
     *      'editions': {'S.E.': (datetime.date(1887, 1, 1),
     *                            datetime.date(1939, 12, 31)),
     *                   'S.E.2d': (datetime.date(1939, 1, 1),
     *                              datetime.date.today())},
     */
    for (var key in editions) {
        var start = editions[key][0];
        var end = editions[key][1];
        var now = new Date();
        var start_year = start.year ? start.year : now.getFullYear();
        var end_year = end.year ? end.year : now.getFullYear();
        if (start_year <= year && year <= end_year) {
            return true;
        }
    }
    return false;
};
Walverine.get_court = function (paren_string, year) {
    var court;
    if (!year) {
        court = paren_string.replace(/(?:,\s*)*,\s*$/,"").replace(/^\s*\(/,"").replace(/\)\s*$/,"");
    } else {
        var year_index = paren_string.indexOf(("" + year));
        court = paren_string.slice(0,year_index);
        court = court.replace(/^\s*\(\s*/, "").replace(/,\s*,\s*$/,"");
    }
    if (court === "") {
        court = null;
    }
    return court;
};

Walverine.get_year = function (token) {
    /*
     *  Given a string token, look for a valid 4-digit number at the start and
     *  return its value.
     */
    var strip_punct = this.utils.strip_punct;

    var year;
    var token = strip_punct(token);
    var m = token.match(/.*?([0-9]{4})/);
    if (m) {
        year = parseInt(m[1], 10);
        if (year < 1754) {
            year = null;
        }
    }
    return year;
};

Walverine.get_pre_citation = function (citation, citations, words, reporter_index) {
    // There are Federal Circuit decisions that have a form
    // like this:
    //
    //     "Smith v. Jones, 2nd Cir., 1955, 123 F.2d 456".
    //
    var preoffset = 0;
    var pos = reporter_index - 2;

    var prev_idx = citations.length ? citations[citations.length - 1].end_idx : 0;
    if (pos < 3 || pos == prev_idx) {
        return preoffset;
    }

    var m = words[pos].match(/^[(]*([0-9]{4})[,)]+$/);
    if (m) {
        preoffset = 1;
        citation.year = m[1];
        if (words[pos].slice(-1) !== ")" && words[pos - 1].slice(-1) !== ",") {
            return preoffset;
        }
        // Try for a court
        var newoffset = 0;
        var maybecourt = [];
        for (var i=pos-1,ilen=pos-4;i>ilen;i+=-1) {
            if (i == prev_idx) break;
            maybecourt.reverse();
            maybecourt.push(words[i]);
            maybecourt.reverse();
            if (this.match_jurisdiction(citation, maybecourt.join(" "))) {
                newoffset = pos-i;
                break;
            }
        }
        if (newoffset) {
            preoffset = newoffset+1;
        }
        return preoffset;
    }
    return preoffset;
};

Walverine.carry_forward = function (citations, pos) {
    citations[pos].plaintiff = citations[pos - 1].plaintiff;
    citations[pos].defendant = citations[pos - 1].defendant;
    this.apply_jurisdiction(citations[pos], citations[pos - 1].mlz_jurisdiction);
    this.apply_year(citations[pos], citations[pos - 1].year);
};

Walverine.apply_jurisdiction = function (citation, jurisdiction) {
    if (!citation.mlz_jurisdiction) {
        citation.mlz_jurisdiction = jurisdiction;
    }
};

Walverine.apply_year = function (citation, year) {
    if (!citation.year) {
        citation.year = year;
    }
};

Walverine.match_jurisdiction = function (citation, data_string) {
    // A wild guess is the best we can do -- any match clears
    var COURTS = this.constants.COURTS;
    for (var key in COURTS) {
        if (data_string.indexOf(key) > -1) {
            citation.court = key;
            return true;
        }
    }
    return false;
};
Walverine.tokenize = function (text) {
    /*
     *  Tokenize text using regular expressions in the following steps:
     *       -Split the text by the occurrences of patterns which match a federal
     *        reporter, including the reporter strings as part of the resulting list.
     *       -Perform simple tokenization (whitespace split) on each of the non-reporter
     *        strings in the list.
     *
     *     Example:
     *     >>>tokenize('See Roe v. Wade, 410 U. S. 113 (1973)')
     *     ['See', 'Roe', 'v.', 'Wade,', '410', 'U.S.', '113', '(1973)']
     */
    var REPORTER_RE = this.constants.REPORTER_RE;

    var strings = text.split(REPORTER_RE);
    var words = [];
    for (var i=0,ilen=strings.length;i<ilen;i+=1) {
        var string = strings[i];
        if ((i+1)%2 === 0) {
            string = string.replace(/^\s+/, "").replace(/\s+$/, "");
            words.push(string);
        } else {
            // Normalize spaces
            words = words.concat(this._tokenize(string));
        }
    }
    return words;
};


Walverine._tokenize = function (text) {
    //add extra space to make things easier
    text = " " + text + " ";

    //get rid of all the annoying underscores in text from pdfs
    text = text.replace(/__+/g,"");

    // No lone commas
    text = text.replace(/\s+,\s+/g," ");

    // No star numbers (Google Scholar link text for these is immediately adjacent)
    text = text.replace(/([0-9]+)*\*[0-9]+/g," ");

    //reduce excess whitespace
    text = text.replace(/ +/g, " ");
    text = text.replace(/^\s+/, "").replace(/\s+$/, "");
    return text.split(" ");
};
Walverine.extract_base_citation = function (words, reporter_index) {
    /*
     *  """Construct and return a citation object from a list of "words"
     *
     *  Given a list of words and the index of a federal reporter, look before and after
     *  for volume and page number.  If found, construct and return a WalverineCitation object.
     */
    var NEUTRALS = this.constants.NEUTRALS;

    var reporter = words[reporter_index];
    var m = words[reporter_index - 1].match(/^\s*([0-9]+)\s*$/);
    if (m) {
        volume = parseInt(m[1], 10);
    } else {
        volume = null;
    }
    var page_str = words[reporter_index + 1];
    // Strip off ending comma, which occurs when there is a page range next
    // ... and a period, which can occur in neutral and year-first citations.
    page_str = page_str.replace(/[;,.]$/, "");
    if (page_str.match(/^[0-9]+$/)) {
        page = parseInt(page_str, 10);
    } else {
        // No page, therefore no valid citation
        return null;
    }
    var citation = new WalverineCitation(volume, reporter, page);
    if (NEUTRALS[reporter]) {
        citation.cite_type = "neutral";
        if (volume && (""+volume).match(/[0-9]{4}/)) {
            citation.year = volume;
        }
    }
    citation.end_idx = reporter_index + 1;
    return citation;
}
Walverine.add_post_citation = function (citation, words, reporter_index) {
    var FORWARD_SEEK = this.constants.FORWARD_SEEK;

    var find_pinpoints = true;

    // Start looking 2 tokens after the reporter (1 after page)
    for (var i=(reporter_index+2),ilen=Math.min((reporter_index+FORWARD_SEEK), words.length);i<ilen;i+=1) {
        // Check each token going forward as either (a) a parenthetical or (b) a potential pinpoint.
        // When the test for (b) fails, peg the ending index of the current cite at two less than the
        // failing index (i.e. one before the possible volume number of the following cite).
        var start = i;
        if (words[start].slice(0,1) === "(" || words[start].slice(0,1) === "[") {
            for (var k=start,klen=start+FORWARD_SEEK;k<klen;k+=1) {
                var end = k;
                var has_ending_paren;
                has_ending_paren = (words[end].indexOf(")") > -1 || words[end].indexOf(")") > -1);
                if (has_ending_paren) {
                    // Sometimes the paren gets split from the preceding content
                    if (words[end].slice(0,1) === ")" || words[end].slice(0,1) === "]") {
                        citation.year = this.get_year(words[end - 1]);
                    } else {
                        citation.year = this.get_year(words[end]);
                    }
                    citation.court = this.get_court(words.slice(start, (end+1)).join(" "), citation.year)
                    break;
                }
            }
            if (start > (reporter_index + 2)) {
                // Then there's content between page and (), starting with a comma, which we skip
                citation.extra = words.slice(reporter_index+2,start).join(" ");
            }
            break;
        } else {
            if (find_pinpoints) {
                if (words[i].match(/^(?:n\.|n|nn\.|nn|para|para\.|Â¶|[-0-9]+)[,;]?\s*$/)) {
                    citation.end_idx = (i-1);
                } else {
                    find_pinpoints = false;
                }
            }
        }
    }
}
Walverine.add_defendant = function (citations, words, reporter_index) {
    /*
     *  Scan backwards from 2 tokens before reporter until you find v., in re, etc.
     *  If no known stop-token is found, no defendant name is stored.  In the future,
     *  this could be improved.
     */

    var pos = citations.length - 1;
    var end = (reporter_index - 1);
    var idx = (reporter_index - 2);
    var prev_idx = citations[pos - 1] ? citations[pos - 1].end_idx : 0;

    var _add_defendant = Walverine.addDefendant(citations, words, pos, idx, end, prev_idx);
    this.buffer = _add_defendant.backscan();
    _add_defendant.finish(citations[pos]);
}

Walverine.addDefendant = function (citations, words, pos, idx, end, prev_idx) {
    // Try a sort-of state machine
    var STRING_TOKENS = this.constants.STRING_TOKENS;
    var ACCEPT_TOKENS = this.constants.ACCEPT_TOKENS;
    var EMBEDDED_TOKENS = this.constants.EMBEDDED_TOKENS;
    var PREPOSITIONS = this.constants.PREPOSITIONS;
    var BACKWARD_SEEK = this.constants.BACKWARD_SEEK;
    var strip_punct = this.utils.strip_punct;
    var buffer = this.buffer;

    return {
        idx: idx,
        end: end,
        buffer: buffer,
        backscan: function () {
            // Some conditions
            if (this.idx < 1) {
                return;
            }
            // Not sure why, but the tokenizer can produce empty elements.
            var word = words[this.idx];
            if (!word) {
                this.idx += -1;
                this.backscan();
            }
            word = word.replace(/^[\(\[]*/g, "");
            var capWord = this.isCap(word);
            var preword = words[this.idx - 1].replace(/^[\(\[]*/g, "");
            var capPreWord = this.isCap(preword);
            if (this.idx+1 == this.end && this.is_parallel()) {
                // If the name consists entirely of pinpoint-like things, it's a parallel.
                citations[pos].CARRY_FORWARD = true;
            } else if (citations.length > 1 && this.idx == (this.end-1) && this.idx <= (citations[pos - 1].end_idx)) {
                // If there is nothing between it and the previous cite, it's a parallel also
                this.idx = this.end;
                citations[pos].CARRY_FORWARD = true;
            } else if (preword.slice(-2) === '".' || preword.slice(-2) === '."') {
                this.cleanup(true);
            } else if (STRING_TOKENS.indexOf(strip_punct(word)) > -1 && pos > 0) {
                // If it stops at a member of STRING_TOKENS, it pertains to the immediately preceding case
                this.idx = this.end;
                citations[pos].CARRY_FORWARD = true;
                var m = word.match(/cert.*(granted|denied)/);
                if (m) {
                    citations[pos].CERT = m[1];
                    if (citations[pos].year) {
                        for (var i=(citations.length-1+this.buffer),ilen=(citations.length-1);i<ilen;i+=1) {
                            citations[i].year = citations[pos].year;
                        }
                        this.buffer = 0;
                    }
                }
            } else if (word.slice(-1) === "." && !capWord && word !== "v.") {
                // It never includes a non-capitalized word that ends in a period
                this.cleanup();
            } else if (word.indexOf(":") > -1 || word.indexOf(";") > -1) {
                // Colons and semicolons are fatal to the search and should never be included
                this.cleanup();
            } else if ((this.end - this.idx) > 3 && word.indexOf(")") > -1) {
                this.idx += 1;
                // It does not run past a close parens after gathering three words
                this.cleanup();
            } else if (word === "of" || word === "and" || word === "to" || word.match(/^see[,.]?$/i)) {
                if (!capPreWord) {
                    // The preposition "of" or conjunction "and" precede a case name only if it is not themselves preceded by a capitalized word.
                    this.cleanup();
                } else {
                    this.idx += -1;
                    this.backscan();
                }
            } else if (ACCEPT_TOKENS.indexOf(strip_punct(word)) > -1) {
                // It never extends beyond "In re"
                // It never extends beyond "Ex parte"
                this.cleanup();
            } else if (PREPOSITIONS.indexOf(strip_punct(preword)) > -1 && capWord) {
                // If over an arbitrary length (?), it never extends beyond certain prepositions if they precede a capitalized word
                this.cleanup(true);
            } else if (!capWord && word !== "v." && word !== "v" && word !== "&" && word !== "&amp;" && EMBEDDED_TOKENS.indexOf(word) === -1) {
                // It never includes a non-capitalized word that is not "v." or "&"
                this.cleanup();
            } else if ((this.end - this.idx) > BACKWARD_SEEK) {
                // It never extends beyond an arbitrary length limit
                this.cleanup(true);
            } else {
                this.idx += -1;
                this.backscan();
            }
            return this.buffer;
        },

        is_parallel: function() {
            // "of" is handled by a special condition
            var idx = this.idx;
            for (var i=this.idx,ilen=Math.max(this.idx-BACKWARD_SEEK, prev_idx+1, -1);i>ilen;i+=-1) {
                if (words[i].match(/^(?:n\.|n|para|para\.|Â¶|[-0-9]+)[,;]?\s*$/)) {
                    idx = i;
                } else {
                    return false;
                }
            }
            this.end = idx+1;
            return true;
        },

        isCap: function (word) {
            return word.slice(0,1) !== word.slice(0,1).toLowerCase();
        },

        cleanup: function (keepCurrentWord) {
            // It always begins with a capitalized word
            if (keepCurrentWord) {
                this.idx += -1;
            }
            for (var i=this.idx,ilen=this.end;i<ilen;i+=1) {
                var word = words[i].replace(/[\[\(\]\)]*/g, "");
                if (this.isCap(word)) {
                    this.idx = i;
                    break;
                }
            }
        },

        cleanstr: function (str) {
            str = str.replace("&amp;", "&", "g");
            str = str.replace(/,$/,"");
            str = str.replace(/[\[\(\)\]]*/g, "");
            return str;
        },

        finish: function (citation) {

            if (this.idx < this.end) {
                // It doesn't necessarily exist
                var parties = words.slice(this.idx,(this.end)).join(" ");
                parties = parties.split(/\s+v\.?\s+/);
                if (parties.length > 1) {
                    // I had some plain text conversion wrappers here, but they're no longer needed
                    citation.plaintiff = strip_punct(parties[0]) ? this.cleanstr(parties[0]) : "";
                    citation.defendant = strip_punct(parties[1]) ? this.cleanstr(parties[1]) : "";
                } else {
                    citation.plaintiff = strip_punct(parties[0]) ? this.cleanstr(parties[0]) : "";
                }
            }
            if (citation.plaintiff) {
                var m = citation.plaintiff.match(/^(?:See|Cf.)\s+(.*)/);
                if (m) {
                    citation.plaintiff = this.cleanstr(m[1]);
                } else if (!citation.plaintiff.match(/^in re/i)) {
                    citation.plaintiff = citation.plaintiff.replace(/^In\s+/, "");
                }
            }
            citation.match = words.slice(this.idx,this.end_idx).join(" ");
        }
    }
}
Walverine.infer_jurisdiction = function (citations) {
    var REPORTERS = this.constants.REPORTERS;
    var JURISDICTIONS = this.constants.JURISDICTIONS;

    for (var i=0,ilen=citations.length;i<ilen;i+=1) {
        var citation = citations[i];
        // Move stray citation data from defendant to extra
        if (citation.defendant) {
            var extras = [];
            while (true) {
                var m = citation.defendant.match(/^(.*,)\s([0-9]+\s[A-Z][A-Za-z. 0-9]+\s[0-9]+),\s*$/);
                if (m) {
                    citation.defendant = m[1];
                    extras.push(m[2]);
                } else {
                    break;
                }
            }
            if (extras.length) {
                if (citation.extra) {
                    extras.push(citation.extra);
                }
                citation.extra = extras.join(", ");
                citation.defendant.replace(/,\s*$/, "");
            }
        }
        var reporters = REPORTERS[citation.canonical_reporter];
        var jurisdictions = [];
        for (var j=0,jlen=reporters.length;j<jlen;j+=1) {
            var reporter = reporters[j];
            jurisdictions = jurisdictions.concat(reporter.mlz_jurisdiction);
        }
        if (jurisdictions.length === 1) {
            // If there is only one choice, we're already home
            citation.mlz_jurisdiction = jurisdictions[0];
        } else if (citation.court || citation.extra) {
            // Look for a match of an abbrev of the jurisdiction name in the court field
            var done = false;
            var data_string = (citation.court ? citation.court : "") + " " + (citation.extra ? citation.extra : "");
            for (var j=0,jlen=jurisdictions.length;j<jlen;j+=1) {
                var possible_jurisdiction = jurisdictions[j];
                for (var k=0,klen=JURISDICTIONS[possible_jurisdiction].length;k<klen;k+=1) {
                    var match_string = JURISDICTIONS[possible_jurisdiction][k];
                    if (data_string.indexOf(match_string) > -1) {
                        citation.mlz_jurisdiction = possible_jurisdiction;
                        var done = true;
                        break;
                    }
                }
                if (done) break;
            }
        }
        // If we didn't find anything, the jurisdiction field will be empty.
        // It's something from the US, but we don't set that until after handling the carry-forwards
        //apply_jurisdiction(citation, "us");
    }
}
Walverine.disambiguate_reporters = function (citations) {
    /*
     *  A second, from scratch, approach to converting a list of citations to a list of unambiguous ones.
     *
     *  Goal is to figure out:
     *   - citation.canonical_reporter
     *   - citation.lookup_index
     *
     *  And there are a few things that can be ambiguous:
     *   - More than one variation.
     *   - More than one reporter for the key.
     *   - Could be an edition (or not)
     *   - All combinations of the above:
     *      - More than one variation.
     *      - More than one variation, with more than one reporter for the key.
     *      - More than one variation, with more than one reporter for the key, which is an edition.
     *      - More than one variation, which is an edition
     *      - ...

     *  For variants, we just need to sort out the canonical_reporter
     */
    var REPORTERS = this.constants.REPORTERS;
    var EDITIONS = this.constants.EDITIONS;
    var VARIATIONS_ONLY = this.constants.VARIATIONS_ONLY;
    var is_date_in_reporter = this.utils.is_date_in_reporter;

    var unambiguous_citations = [];
    for (var h=0,hlen=citations.length;h<hlen;h+=1) {
        var citation = citations[h];
        // Non-variant items (P.R.R., A.2d, Wash., etc.)
        if (REPORTERS[EDITIONS[citation.reporter]]) {
            if (REPORTERS[EDITIONS[citation.reporter]].length === 1) {
                // Single reporter, easy-peasy.
                citation.canonical_reporter = EDITIONS[citation.reporter];
                citation.lookup_index = 0;
                unambiguous_citations.push(citation);
                continue;
            } else {
                // Multiple books under this key, but which is correct?
                if (citation.year) {
                    // attempt resolution by date
                    var possible_citations = [];
                    for (var i=0,ilen=REPORTERS[EDITIONS[citation.reporter]].length;i<ilen;i+=1) {
                        if (is_date_in_reporter(REPORTERS[EDITIONS[citation.reporter]][i]['editions'], citation.year)) {
                            possible_citations.push((citation.reporter, i));
                        }
                    }
                    if (possible_citations.length === 1) {
                        // We were able to identify only one hit after filtering by year.
                        citation.canonical_reporter = EDITIONS[possible_citations[0][0]]
                        citation.reporter = possible_citations[0][0]
                        citation.lookup_index = possible_citations[0][1]
                        unambiguous_citations.push(citation)
                        continue
                    }
                }
            }
        } else if (VARIATIONS_ONLY[citation.reporter]) {
            // Try doing a variation of an edition.
            if (VARIATIONS_ONLY[citation.reporter].length === 1) {
                // Only one variation -- great, use it.
                if (REPORTERS[EDITIONS[VARIATIONS_ONLY[citation.reporter][0]]].length == 1) {
                    // It's a single reporter under a misspelled key.
                    citation.canonical_reporter = EDITIONS[VARIATIONS_ONLY[citation.reporter][0]];
                    citation.reporter = VARIATIONS_ONLY[citation.reporter][0];
                    citation.lookup_index = 0;
                    unambiguous_citations.push(citation);
                    continue
                } else {
                    // Multiple reporters under a single misspelled key (e.g. Wn.2d --> Wash --> Va Reports, Wash or
                    //                                                   Washington Reports).
                    if (citation.year) {
                        // attempt resolution by date
                        var possible_citations = [];
                        for (var i=0,ilen=REPORTERS[EDITIONS[VARIATIONS_ONLY[citation.reporter][0]]].length;i<ilen;i+=1) {
                            if (is_date_in_reporter(REPORTERS[EDITIONS[VARIATIONS_ONLY[citation.reporter][0]]][i].editions, citation.year)) {
                                possible_citations.push((citation.reporter, i));
                            }
                        }
                        if (possible_citations.length === 1) {
                            // We were able to identify only one hit after filtering by year.
                            citation.canonical_reporter = EDITIONS[VARIATIONS_ONLY[possible_citations[0][0]][0]];
                            citation.reporter = VARIATIONS_ONLY[possible_citations[0][0]][0];
                            citation.lookup_index = possible_citations[0][1];
                            unambiguous_citations.push(citation);
                            continue;
                        }
                    }
                    var possible_citations = [];
                    for (var i=0,ilen=REPORTERS[EDITIONS[VARIATIONS_ONLY[citation.reporter][0]]].length;i<ilen;i+=1) {
                        for (var variation_key in REPORTERS[EDITIONS[VARIATIONS_ONLY[citation.reporter][0]]]['variations']) {
                            if (variation_key == citation.reporter) {
                                possible_citations.push(REPORTERS[EDITIONS[VARIATIONS_ONLY[citation.reporter][0]]].variations[variation_key], i);
                            }
                        }
                    }
                    if (possible_citations.length === 1) {
                        // We were able to find a single match after filtering by variation.
                        citation.canonical_reporter = EDITIONS[possible_citations[0][0]];
                        citation.reporter = possible_citations[0][0];
                        citation.lookup_index = possible_citations[0][1];
                        unambiguous_citations.push(citation);
                        continue;
                    }
                }
            } else {
                // Multiple variations, deal with them.
                var possible_citations = [];
                for (var reporter_key in VARIATIONS_ONLY[citation.reporter]) {
                    for (var i=0,ilen=REPORTERS[EDITIONS[reporter_key]];i<ilen;i+=1) {
                        // This inner loop works regardless of the number of reporters under the key.
                        if (is_date_in_reporter(REPORTERS[EDITIONS[reporter_key]][i].editions, citation.year)) {
                            possible_citations.push(citation);
                        }
                    }
                }
                if (possible_citations.length === 1) {
                    // We were able to identify only one hit after filtering by year.
                    citation.canonical_reporter = EDITIONS[possible_citations[0][0]];
                    citation.reporter = possible_citations[0][0];
                    citation.lookup_index = possible_citations[0][1];
                    unambiguous_citations.push(citation);
                    continue;
                }
            }
        }
    }
    for (var h=0,hlen=citations.length;h<hlen;h+=1) {
        if (unambiguous_citations.indexOf(citation) === -1) {
            // Try matching by year.
            if (true) {
                // It's a matter of figuring out which
            } else {
                // Unable to disambiguate, just add it anyway so we can return it.
                unambiguous_citations.push(citation);
            }
        }
    }
    return unambiguous_citations;
}
Walverine.get_citations = function (text, html, do_post_citation, do_defendant) {
    var EDITIONS = this.constants.EDITIONS;
    var VARIATIONS_ONLY = this.constants.VARIATIONS_ONLY;
    var get_visible_text = this.utils.get_visible_text;

    if ("undefined" === typeof html) {
        html = true;
    }
    if ("undefined" === typeof do_post_citation) {
        do_post_citation = true;
    }
    if ("undefined" === typeof do_defendant) {
        do_defendant = true;
    }
    if (html) {
        text = get_visible_text(text);
    }
    var words = this.tokenize(text);
    var citations = [];
    // Exclude first and last tokens when looking for reporters, because valid
    // citations must have a volume before and a page number after the reporter.
    var progress_value = 0;
    for (var i=1,ilen=words.length-1;i<ilen;i+=1) {
        // Find reporter
        //if ([key for (key in EDITIONS)].concat([key for (key in VARIATIONS_ONLY)]).indexOf(words[i]) > -1) {
        if (WalverineCitation.keys(EDITIONS).concat(WalverineCitation.keys(VARIATIONS_ONLY)).indexOf(words[i]) > -1) {
            citation = this.extract_base_citation(words, i);
            if (!citation) {
                // Not a valid citation; continue looking
                continue;
            }
            var preoffset = 0;
            if (do_post_citation) {
                //citation.rptr_idx =
                var preoffset = this.get_pre_citation(citation, citations, words, i);
                if (!preoffset && citation.volume) {
                    this.add_post_citation(citation, words, i);
                }
            }
            if (!citation.volume) {
                continue;
            }
            citations.push(citation);
            if (do_defendant) {
                this.add_defendant(citations, words, (i-preoffset));
            }
            // Virtual buffer
            if (citation.title && citation.year && this.buffer) {
                // If we have a complete cite, clear the buffer of yearless citations
                // (buffer acceptance takes place in add_defendant())
                citations = citations.slice(0,this.buffer);
                this.buffer = 0;
            }
            if (!citation.year) {
                this.buffer += -1;
            }
        }
    }
    // Drop citations for which no year was found
    for (var i=citations.length-1;i>-1;i+=-1) {
        if (!citations[i].year) {
            citations = citations.slice(0,i).concat(citations.slice(i+1));
        }
    }

    // Disambiguate all the reporters
    citations = this.disambiguate_reporters(citations)

    // Stamp for jurisdiction
    this.infer_jurisdiction(citations);

    // Fill out citations with missing party names or jurisdiction values
    if (citations.length) {
        this.apply_jurisdiction(citations[0], "us");
    }
    for (var i=1,ilen=citations.length;i<ilen;i+=1) {
        if (citations[i].CARRY_FORWARD) {
            this.carry_forward(citations, i);
        }
        this.apply_jurisdiction(citations[i], "us");
    }

    // Mark related citations
    var lastPlaintiff = false;
    var lastDefendant = false;
    var lastJurisdiction = false;
    var relations = [];
    for (var i=0,ilen=citations.length;i<ilen;i+=1) {
        var citation = citations[i];
        citation.seqID = i;
        if (citation.plaintiff !== lastPlaintiff || citation.defendant !== lastDefendant || citation.mlz_jurisdiction !== lastJurisdiction) {
            for (var j in relations) {
                citations[relations[j]].relations = relations.slice();
            }
            relations = [];
        }
        relations.push(i);
        lastPlaintiff = citation.plaintiff;
        lastDefendant = citation.defendant;
        lastJurisdiction = citation.mlz_jurisdiction;
    }
    // Process the last item and its relations
    for (var j in relations) {
        citations[relations[j]].relations = relations.slice();
    }

    // Populate CERT_DENIED and CERT_GRANTED disposition forward and back
    for (var i=1,ilen=citations.length;i<ilen;i+=1) {
        var citation = citations[i];
        var prev_citation = citations[i-1];
        if (citation.CERT) {
            for (var j=0,jlen=citation.relations.length;j<jlen;j+=1) {
                var pos = citation.relations[j];
                citations[pos].cert_order = true;
            }
            for (var j=0,jlen=prev_citation.relations.length;j<jlen;j+=1) {
                var pos = prev_citation.relations[j];
                citations[pos].disposition = "certiorari " + citation.CERT;
            }
        }
    }

    return citations;
}

module.exports = Walverine;


},{"./reporters":39}]},{},[14])