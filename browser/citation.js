(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function(def) {
    if (typeof module !== 'undefined') module.exports = def;
    if (typeof Citation !== 'undefined' && Citation.types) Citation.types.cfr = def;
})({
  type: "regex",

  standardize: function(data) {
    var section = data.section || data.part;
    return {
      id: underscore.compact(underscore.flatten(["cfr", data.title, section, data.subsections])).join("/")
    };
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
        var split = underscore.compact(captures.sections.split(/[\(\)]+/));
        section = split[0].trim();
        subsections = split.splice(1);

        if (section.indexOf(".") > 0) {
          part = section.split(".")[0];
        } else {
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
    //       subsections: underscore.compact(captures.subsections.split(/[\(\)]+/))
    //     };
    //   }
    // }
  ]
});

},{}],2:[function(require,module,exports){
(function(def) {
    if (typeof module !== 'undefined') module.exports = def;
    if (typeof Citation !== 'undefined' && Citation.types) Citation.types.dc_code = def;
})({
  type: "regex",

  // normalize all cites to an ID, with and without subsections
  standardize: function(data) {
    return {
      id: underscore.flatten(["dc-code", data.title, data.section, data.subsections]).join("/"),
      section_id: ["dc-code", data.title, data.section].join("/")
    };
  },

  // field to calculate parents from
  parents_by: "subsections",

  patterns: function(context) {
    // only apply this regex if we're confident that relative citations refer to the DC Code
    if (context.source == "dc_code") {
      return [

        // § 32-701
        // § 32-701(4)
        // § 3-101.01
        // § 1-603.01(13)
        // § 1- 1163.33
        // § 1 -1163.33
        // section 16-2326.01
        {
          regex:
            "(?:section(?:s)?|§+)\\s+(\\d+A?)" +
            "\\s?\\-\\s?" +
            "([\\w\\d]+(?:\\.?[\\w\\d]+)?)" +  // section identifier, letters/numbers/dots
            "((?:\\([^\\)]+\\))*)", // any number of adjacent parenthesized subsections

          fields: ["title", "section", "subsections"],

          processor: function(captures) {
            var title = captures.title;
            var section = captures.section;
            var subsections = [];
            if (captures.subsections) subsections = underscore.compact(captures.subsections.split(/[\(\)]+/));

            return {
              title: title,
              section: section,
              subsections: subsections
            };
          }
        }
      ];
    }

    // absolute cites
    else {
      return [

        // D.C. Official Code 3-1202.04
        // D.C. Official Code § 3-1201.01
        // D.C. Official Code §§ 38-2602(b)(11)
        // D.C. Official Code § 3- 1201.01
        // D.C. Official Code § 3 -1201.01
        {
          regex:
            "D\\.?C\\.? Official Code\\s+" + // absolute identifier
            "(?:§+\\s+)?(\\d+A?)" +            // optional section sign, plus title
            "\\s?\\-\\s?" +
            "([\\w\\d]+(?:\\.?[\\w\\d]+)?)" +      // section identifier, letters/numbers/dots
            "((?:\\([^\\)]+\\))*)", // any number of adjacent parenthesized subsections

          fields: ["title", "section", "subsections"],

          processor: function(captures) {
            var title = captures.title;
            var section = captures.section;

            var subsections = [];
            if (captures.subsections) subsections = underscore.compact(captures.subsections.split(/[\(\)]+/));

            return {
              title: title,
              section: section,
              subsections: subsections
            };
          }
        }
      ];
    }
  }
});

},{}],3:[function(require,module,exports){
(function(def) {
    if (typeof module !== 'undefined') module.exports = def;
    if (typeof Citation !== 'undefined' && Citation.types) Citation.types.dc_law = def;
})({
  type: "regex",

  standardize: function(cite) {
    return {
      id: ["dc-law", cite.period, cite.number].join("/")
    };
  },

  patterns: function(context) {
    // If the context for this citation is the DC Code, then Law XX-YYY can be assumed
    // to be a DC law. In other context, require the "DC Law" prefix.
    var context_regex = "";
    if (context.source != "dc_code")
      context_regex = "D\\.?\\s*C\\.?\\s+";

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
});

},{}],4:[function(require,module,exports){
(function(def) {
    if (typeof module !== 'undefined') module.exports = def;
    if (typeof Citation !== 'undefined' && Citation.types) Citation.types.dc_register = def;
})({
  type: "regex",

  // normalize all cites to an ID
  standardize: function(match) {
    return {
      id: underscore.flatten(["dc-register", match.volume, match.page]).join("/")
    };
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
});

},{}],5:[function(require,module,exports){
if (typeof(require) !== "undefined")
  walverine = require("walverine");

(function(def) {
    if (typeof module !== 'undefined') module.exports = def;
    if (typeof Citation !== 'undefined' && Citation.types) Citation.types.judicial = def;
})({
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
});
},{"walverine":14}],6:[function(require,module,exports){
(function(def) {
    if (typeof module !== 'undefined') module.exports = def;
    if (typeof Citation !== 'undefined' && Citation.types) Citation.types.law = def;
})({
  type: "regex",

  standardize: function(cite) {
    return {
      id: underscore.flatten(["us-law", cite.type, cite.congress, cite.number, cite.sections]).join("/"),
      law_id: ["us-law", cite.type, cite.congress, cite.number].join("/")
    };
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
        if (captures.subsections) sections = sections.concat(underscore.compact(captures.subsections.split(/[\(\)]+/)));

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
        if (captures.subsections) sections = sections.concat(underscore.compact(captures.subsections.split(/[\(\)]+/)));

        return {
          type: "public",
          congress: captures.congress,
          number: captures.number,
          sections: sections
        };
      }
    }
  ]
});

},{}],7:[function(require,module,exports){
(function(def) {
    if (typeof module !== 'undefined') module.exports = def;
    if (typeof Citation !== 'undefined' && Citation.types) Citation.types.stat = def;
})({
  type: "regex",

  // normalize all cites to an ID
  standardize: function(cite) {
    return {
      id: underscore.flatten(["stat", cite.volume, cite.page]).join("/")
    };
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
});

},{}],8:[function(require,module,exports){
(function(def) {
    if (typeof module !== 'undefined') module.exports = def;
    if (typeof Citation !== 'undefined' && Citation.types) Citation.types.usc = def;
})({
  type: "regex",

  // normalize all cites to an ID, with and without subsections,
  // TODO: kill this?
  standardize: function(data) {
    return {
      id: underscore.flatten(["usc", data.title, data.section, data.subsections]).join("/"),
      section_id: ["usc", data.title, data.section].join("/")
    };
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
          var split = underscore.compact(section.split(/[\(\)]+/));
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
          subsections: underscore.compact(match.subsections.split(/[\(\)]+/))
        };
      }
    }
  ]
});

},{}],9:[function(require,module,exports){
(function(def) {
    if (typeof module !== 'undefined') module.exports = def;
    if (typeof Citation !== 'undefined' && Citation.types) Citation.types.va_code = def;
})({
  type: "regex",

  standardize: function(data) {
    return {
      id: ["va-code", data.title, data.section].join("/")
    };
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
});

},{}],10:[function(require,module,exports){
/* Citation.js - a legal citation extractor.
 *
 * Open source, dedicated to the public domain: https://github.com/unitedstates/citation
 *
 * Originally authored by Eric Mill (@konklone), at the Sunlight Foundation,
 * many contributions by https://github.com/unitedstates/citation/graphs/contributors
 */


/*
 TODO:
 * move underscore out of the namespace, see #56
 * rework how citators load Citation, it's hefty
*/

if (typeof(require) !== "undefined") {
  underscore = require("underscore");
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
    if (options.filter && Citation.filters[options.filter])
      results = Citation.filtered(options.filter, text, options);

    // otherwise, do a single pass over the whole text.
    else
      results = Citation.extract(text, options);

    return results;
  },

  // return an array of matched and filter-mapped cites
  filtered: function(name, text, options) {
    var results = [];

    var filter = Citation.filters[name];

    // filter can break up the text into pieces with accompanying metadata
    filter.from(text, options[name], function(piece, metadata) {
      var response = Citation.extract(piece, options);
      var filtered = response.citations.map(function(result) {

        Object.keys(metadata).forEach(function(key) {
          result[key] = metadata[key];
        });

        return result;
      });

      results = results.concat(filtered);
    });

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
        patterns = patterns(context[type] || {});

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
    var regexes = underscore.values(citators).map(function(pattern) {return pattern.regex});
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
        if (!underscore.isArray(cites)) cites = [cites];

        // put together the match-level information
        var matchInfo = {type: citator.type};
        matchInfo.match = match.toString(); // match data can be converted to the plain string

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
          Citation.u.extend(result, matchInfo);

          // cite-level info, plus ID standardization
          result[type] = cite;
          Citation.u.extend(result[type], Citation.types[type].standardize(result[type]));

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
    if (types.indexOf("judicial") != -1)
      results = results.concat(Citation.types.judicial.extract(text));

    var response = {citations: underscore.compact(results)};
    if (options.replace) response.text = replaced;

    return response;
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
  },

  // small replacement for several functions previously served by
  // the `underscore` library.
  u: {
    extend: function(obj) {
      Array.prototype.slice.call(arguments, 1).forEach(function(source) {
        if (source) {
          for (var prop in source)
            obj[prop] = source[prop];
        }
      });
      return obj;
    },

    contains: function(obj) {
      return obj.indexOf(target) != -1;
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
  Citation.types.stat = require("./citations/stat");
  Citation.types.judicial = require("./citations/judicial");

  Citation.filters.lines = require("./filters/lines");
}


if (typeof(window) !== "undefined")
  window.Citation = Citation;

if (typeof(module) !== "undefined" && module.exports)
  module.exports = Citation;

})();

},{"./citations/cfr":1,"./citations/dc_code":2,"./citations/dc_law":3,"./citations/dc_register":4,"./citations/judicial":5,"./citations/law":6,"./citations/stat":7,"./citations/usc":8,"./citations/va_code":9,"./filters/lines":11,"underscore":12}],11:[function(require,module,exports){
(function(def) {
  if (typeof module !== 'undefined') module.exports = def;
  if (typeof Citation !== 'undefined' && Citation.filters) Citation.filters.lines = def;
})({

  // A line-by-line filter.
  //
  // Breaks the text up by line, and feeds each line into the extractor.
  // Attaches the line number (1-indexed) as metadata to each cite,
  // so that any character offsets will be relative to that line.
  //
  // Accepts options:
  //   delimiter: override the default delimiter

  from: function(text, options, extract) {
    var delimiter = (options && options.delimiter) || /[\n\r]+/;
    var lines = text.split(new RegExp(delimiter));
    lines.forEach(function(line, i) {
      extract(line, {line: (i+1)});
    });
  }

});
},{}],12:[function(require,module,exports){
//     Underscore.js 1.6.0
//     http://underscorejs.org
//     (c) 2009-2014 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//     Underscore may be freely distributed under the MIT license.

(function() {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `exports` on the server.
  var root = this;

  // Save the previous value of the `_` variable.
  var previousUnderscore = root._;

  // Establish the object that gets returned to break out of a loop iteration.
  var breaker = {};

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var
    push             = ArrayProto.push,
    slice            = ArrayProto.slice,
    concat           = ArrayProto.concat,
    toString         = ObjProto.toString,
    hasOwnProperty   = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeForEach      = ArrayProto.forEach,
    nativeMap          = ArrayProto.map,
    nativeReduce       = ArrayProto.reduce,
    nativeReduceRight  = ArrayProto.reduceRight,
    nativeFilter       = ArrayProto.filter,
    nativeEvery        = ArrayProto.every,
    nativeSome         = ArrayProto.some,
    nativeIndexOf      = ArrayProto.indexOf,
    nativeLastIndexOf  = ArrayProto.lastIndexOf,
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind;

  // Create a safe reference to the Underscore object for use below.
  var _ = function(obj) {
    if (obj instanceof _) return obj;
    if (!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
  };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `_` as a global object via a string identifier,
  // for Closure Compiler "advanced" mode.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root._ = _;
  }

  // Current version.
  _.VERSION = '1.6.0';

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles objects with the built-in `forEach`, arrays, and raw objects.
  // Delegates to **ECMAScript 5**'s native `forEach` if available.
  var each = _.each = _.forEach = function(obj, iterator, context) {
    if (obj == null) return obj;
    if (nativeForEach && obj.forEach === nativeForEach) {
      obj.forEach(iterator, context);
    } else if (obj.length === +obj.length) {
      for (var i = 0, length = obj.length; i < length; i++) {
        if (iterator.call(context, obj[i], i, obj) === breaker) return;
      }
    } else {
      var keys = _.keys(obj);
      for (var i = 0, length = keys.length; i < length; i++) {
        if (iterator.call(context, obj[keys[i]], keys[i], obj) === breaker) return;
      }
    }
    return obj;
  };

  // Return the results of applying the iterator to each element.
  // Delegates to **ECMAScript 5**'s native `map` if available.
  _.map = _.collect = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeMap && obj.map === nativeMap) return obj.map(iterator, context);
    each(obj, function(value, index, list) {
      results.push(iterator.call(context, value, index, list));
    });
    return results;
  };

  var reduceError = 'Reduce of empty array with no initial value';

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`. Delegates to **ECMAScript 5**'s native `reduce` if available.
  _.reduce = _.foldl = _.inject = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduce && obj.reduce === nativeReduce) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduce(iterator, memo) : obj.reduce(iterator);
    }
    each(obj, function(value, index, list) {
      if (!initial) {
        memo = value;
        initial = true;
      } else {
        memo = iterator.call(context, memo, value, index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // The right-associative version of reduce, also known as `foldr`.
  // Delegates to **ECMAScript 5**'s native `reduceRight` if available.
  _.reduceRight = _.foldr = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduceRight && obj.reduceRight === nativeReduceRight) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduceRight(iterator, memo) : obj.reduceRight(iterator);
    }
    var length = obj.length;
    if (length !== +length) {
      var keys = _.keys(obj);
      length = keys.length;
    }
    each(obj, function(value, index, list) {
      index = keys ? keys[--length] : --length;
      if (!initial) {
        memo = obj[index];
        initial = true;
      } else {
        memo = iterator.call(context, memo, obj[index], index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function(obj, predicate, context) {
    var result;
    any(obj, function(value, index, list) {
      if (predicate.call(context, value, index, list)) {
        result = value;
        return true;
      }
    });
    return result;
  };

  // Return all the elements that pass a truth test.
  // Delegates to **ECMAScript 5**'s native `filter` if available.
  // Aliased as `select`.
  _.filter = _.select = function(obj, predicate, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeFilter && obj.filter === nativeFilter) return obj.filter(predicate, context);
    each(obj, function(value, index, list) {
      if (predicate.call(context, value, index, list)) results.push(value);
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  _.reject = function(obj, predicate, context) {
    return _.filter(obj, function(value, index, list) {
      return !predicate.call(context, value, index, list);
    }, context);
  };

  // Determine whether all of the elements match a truth test.
  // Delegates to **ECMAScript 5**'s native `every` if available.
  // Aliased as `all`.
  _.every = _.all = function(obj, predicate, context) {
    predicate || (predicate = _.identity);
    var result = true;
    if (obj == null) return result;
    if (nativeEvery && obj.every === nativeEvery) return obj.every(predicate, context);
    each(obj, function(value, index, list) {
      if (!(result = result && predicate.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if at least one element in the object matches a truth test.
  // Delegates to **ECMAScript 5**'s native `some` if available.
  // Aliased as `any`.
  var any = _.some = _.any = function(obj, predicate, context) {
    predicate || (predicate = _.identity);
    var result = false;
    if (obj == null) return result;
    if (nativeSome && obj.some === nativeSome) return obj.some(predicate, context);
    each(obj, function(value, index, list) {
      if (result || (result = predicate.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if the array or object contains a given value (using `===`).
  // Aliased as `include`.
  _.contains = _.include = function(obj, target) {
    if (obj == null) return false;
    if (nativeIndexOf && obj.indexOf === nativeIndexOf) return obj.indexOf(target) != -1;
    return any(obj, function(value) {
      return value === target;
    });
  };

  // Invoke a method (with arguments) on every item in a collection.
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    var isFunc = _.isFunction(method);
    return _.map(obj, function(value) {
      return (isFunc ? method : value[method]).apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  _.pluck = function(obj, key) {
    return _.map(obj, _.property(key));
  };

  // Convenience version of a common use case of `filter`: selecting only objects
  // containing specific `key:value` pairs.
  _.where = function(obj, attrs) {
    return _.filter(obj, _.matches(attrs));
  };

  // Convenience version of a common use case of `find`: getting the first object
  // containing specific `key:value` pairs.
  _.findWhere = function(obj, attrs) {
    return _.find(obj, _.matches(attrs));
  };

  // Return the maximum element or (element-based computation).
  // Can't optimize arrays of integers longer than 65,535 elements.
  // See [WebKit Bug 80797](https://bugs.webkit.org/show_bug.cgi?id=80797)
  _.max = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.max.apply(Math, obj);
    }
    var result = -Infinity, lastComputed = -Infinity;
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      if (computed > lastComputed) {
        result = value;
        lastComputed = computed;
      }
    });
    return result;
  };

  // Return the minimum element (or element-based computation).
  _.min = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.min.apply(Math, obj);
    }
    var result = Infinity, lastComputed = Infinity;
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      if (computed < lastComputed) {
        result = value;
        lastComputed = computed;
      }
    });
    return result;
  };

  // Shuffle an array, using the modern version of the
  // [Fisher-Yates shuffle](http://en.wikipedia.org/wiki/Fisher–Yates_shuffle).
  _.shuffle = function(obj) {
    var rand;
    var index = 0;
    var shuffled = [];
    each(obj, function(value) {
      rand = _.random(index++);
      shuffled[index - 1] = shuffled[rand];
      shuffled[rand] = value;
    });
    return shuffled;
  };

  // Sample **n** random values from a collection.
  // If **n** is not specified, returns a single random element.
  // The internal `guard` argument allows it to work with `map`.
  _.sample = function(obj, n, guard) {
    if (n == null || guard) {
      if (obj.length !== +obj.length) obj = _.values(obj);
      return obj[_.random(obj.length - 1)];
    }
    return _.shuffle(obj).slice(0, Math.max(0, n));
  };

  // An internal function to generate lookup iterators.
  var lookupIterator = function(value) {
    if (value == null) return _.identity;
    if (_.isFunction(value)) return value;
    return _.property(value);
  };

  // Sort the object's values by a criterion produced by an iterator.
  _.sortBy = function(obj, iterator, context) {
    iterator = lookupIterator(iterator);
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value: value,
        index: index,
        criteria: iterator.call(context, value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria;
      var b = right.criteria;
      if (a !== b) {
        if (a > b || a === void 0) return 1;
        if (a < b || b === void 0) return -1;
      }
      return left.index - right.index;
    }), 'value');
  };

  // An internal function used for aggregate "group by" operations.
  var group = function(behavior) {
    return function(obj, iterator, context) {
      var result = {};
      iterator = lookupIterator(iterator);
      each(obj, function(value, index) {
        var key = iterator.call(context, value, index, obj);
        behavior(result, key, value);
      });
      return result;
    };
  };

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  _.groupBy = group(function(result, key, value) {
    _.has(result, key) ? result[key].push(value) : result[key] = [value];
  });

  // Indexes the object's values by a criterion, similar to `groupBy`, but for
  // when you know that your index values will be unique.
  _.indexBy = group(function(result, key, value) {
    result[key] = value;
  });

  // Counts instances of an object that group by a certain criterion. Pass
  // either a string attribute to count by, or a function that returns the
  // criterion.
  _.countBy = group(function(result, key) {
    _.has(result, key) ? result[key]++ : result[key] = 1;
  });

  // Use a comparator function to figure out the smallest index at which
  // an object should be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function(array, obj, iterator, context) {
    iterator = lookupIterator(iterator);
    var value = iterator.call(context, obj);
    var low = 0, high = array.length;
    while (low < high) {
      var mid = (low + high) >>> 1;
      iterator.call(context, array[mid]) < value ? low = mid + 1 : high = mid;
    }
    return low;
  };

  // Safely create a real, live array from anything iterable.
  _.toArray = function(obj) {
    if (!obj) return [];
    if (_.isArray(obj)) return slice.call(obj);
    if (obj.length === +obj.length) return _.map(obj, _.identity);
    return _.values(obj);
  };

  // Return the number of elements in an object.
  _.size = function(obj) {
    if (obj == null) return 0;
    return (obj.length === +obj.length) ? obj.length : _.keys(obj).length;
  };

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head` and `take`. The **guard** check
  // allows it to work with `_.map`.
  _.first = _.head = _.take = function(array, n, guard) {
    if (array == null) return void 0;
    if ((n == null) || guard) return array[0];
    if (n < 0) return [];
    return slice.call(array, 0, n);
  };

  // Returns everything but the last entry of the array. Especially useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N. The **guard** check allows it to work with
  // `_.map`.
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, array.length - ((n == null) || guard ? 1 : n));
  };

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array. The **guard** check allows it to work with `_.map`.
  _.last = function(array, n, guard) {
    if (array == null) return void 0;
    if ((n == null) || guard) return array[array.length - 1];
    return slice.call(array, Math.max(array.length - n, 0));
  };

  // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
  // Especially useful on the arguments object. Passing an **n** will return
  // the rest N values in the array. The **guard**
  // check allows it to work with `_.map`.
  _.rest = _.tail = _.drop = function(array, n, guard) {
    return slice.call(array, (n == null) || guard ? 1 : n);
  };

  // Trim out all falsy values from an array.
  _.compact = function(array) {
    return _.filter(array, _.identity);
  };

  // Internal implementation of a recursive `flatten` function.
  var flatten = function(input, shallow, output) {
    if (shallow && _.every(input, _.isArray)) {
      return concat.apply(output, input);
    }
    each(input, function(value) {
      if (_.isArray(value) || _.isArguments(value)) {
        shallow ? push.apply(output, value) : flatten(value, shallow, output);
      } else {
        output.push(value);
      }
    });
    return output;
  };

  // Flatten out an array, either recursively (by default), or just one level.
  _.flatten = function(array, shallow) {
    return flatten(array, shallow, []);
  };

  // Return a version of the array that does not contain the specified value(s).
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // Split an array into two arrays: one whose elements all satisfy the given
  // predicate, and one whose elements all do not satisfy the predicate.
  _.partition = function(array, predicate) {
    var pass = [], fail = [];
    each(array, function(elem) {
      (predicate(elem) ? pass : fail).push(elem);
    });
    return [pass, fail];
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function(array, isSorted, iterator, context) {
    if (_.isFunction(isSorted)) {
      context = iterator;
      iterator = isSorted;
      isSorted = false;
    }
    var initial = iterator ? _.map(array, iterator, context) : array;
    var results = [];
    var seen = [];
    each(initial, function(value, index) {
      if (isSorted ? (!index || seen[seen.length - 1] !== value) : !_.contains(seen, value)) {
        seen.push(value);
        results.push(array[index]);
      }
    });
    return results;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  _.union = function() {
    return _.uniq(_.flatten(arguments, true));
  };

  // Produce an array that contains every item shared between all the
  // passed-in arrays.
  _.intersection = function(array) {
    var rest = slice.call(arguments, 1);
    return _.filter(_.uniq(array), function(item) {
      return _.every(rest, function(other) {
        return _.contains(other, item);
      });
    });
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  _.difference = function(array) {
    var rest = concat.apply(ArrayProto, slice.call(arguments, 1));
    return _.filter(array, function(value){ return !_.contains(rest, value); });
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  _.zip = function() {
    var length = _.max(_.pluck(arguments, 'length').concat(0));
    var results = new Array(length);
    for (var i = 0; i < length; i++) {
      results[i] = _.pluck(arguments, '' + i);
    }
    return results;
  };

  // Converts lists into objects. Pass either a single array of `[key, value]`
  // pairs, or two parallel arrays of the same length -- one of keys, and one of
  // the corresponding values.
  _.object = function(list, values) {
    if (list == null) return {};
    var result = {};
    for (var i = 0, length = list.length; i < length; i++) {
      if (values) {
        result[list[i]] = values[i];
      } else {
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  };

  // If the browser doesn't supply us with indexOf (I'm looking at you, **MSIE**),
  // we need this function. Return the position of the first occurrence of an
  // item in an array, or -1 if the item is not included in the array.
  // Delegates to **ECMAScript 5**'s native `indexOf` if available.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = function(array, item, isSorted) {
    if (array == null) return -1;
    var i = 0, length = array.length;
    if (isSorted) {
      if (typeof isSorted == 'number') {
        i = (isSorted < 0 ? Math.max(0, length + isSorted) : isSorted);
      } else {
        i = _.sortedIndex(array, item);
        return array[i] === item ? i : -1;
      }
    }
    if (nativeIndexOf && array.indexOf === nativeIndexOf) return array.indexOf(item, isSorted);
    for (; i < length; i++) if (array[i] === item) return i;
    return -1;
  };

  // Delegates to **ECMAScript 5**'s native `lastIndexOf` if available.
  _.lastIndexOf = function(array, item, from) {
    if (array == null) return -1;
    var hasIndex = from != null;
    if (nativeLastIndexOf && array.lastIndexOf === nativeLastIndexOf) {
      return hasIndex ? array.lastIndexOf(item, from) : array.lastIndexOf(item);
    }
    var i = (hasIndex ? from : array.length);
    while (i--) if (array[i] === item) return i;
    return -1;
  };

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  _.range = function(start, stop, step) {
    if (arguments.length <= 1) {
      stop = start || 0;
      start = 0;
    }
    step = arguments[2] || 1;

    var length = Math.max(Math.ceil((stop - start) / step), 0);
    var idx = 0;
    var range = new Array(length);

    while(idx < length) {
      range[idx++] = start;
      start += step;
    }

    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // Reusable constructor function for prototype setting.
  var ctor = function(){};

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Delegates to **ECMAScript 5**'s native `Function.bind` if
  // available.
  _.bind = function(func, context) {
    var args, bound;
    if (nativeBind && func.bind === nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    if (!_.isFunction(func)) throw new TypeError;
    args = slice.call(arguments, 2);
    return bound = function() {
      if (!(this instanceof bound)) return func.apply(context, args.concat(slice.call(arguments)));
      ctor.prototype = func.prototype;
      var self = new ctor;
      ctor.prototype = null;
      var result = func.apply(self, args.concat(slice.call(arguments)));
      if (Object(result) === result) return result;
      return self;
    };
  };

  // Partially apply a function by creating a version that has had some of its
  // arguments pre-filled, without changing its dynamic `this` context. _ acts
  // as a placeholder, allowing any combination of arguments to be pre-filled.
  _.partial = function(func) {
    var boundArgs = slice.call(arguments, 1);
    return function() {
      var position = 0;
      var args = boundArgs.slice();
      for (var i = 0, length = args.length; i < length; i++) {
        if (args[i] === _) args[i] = arguments[position++];
      }
      while (position < arguments.length) args.push(arguments[position++]);
      return func.apply(this, args);
    };
  };

  // Bind a number of an object's methods to that object. Remaining arguments
  // are the method names to be bound. Useful for ensuring that all callbacks
  // defined on an object belong to it.
  _.bindAll = function(obj) {
    var funcs = slice.call(arguments, 1);
    if (funcs.length === 0) throw new Error('bindAll must be passed function names');
    each(funcs, function(f) { obj[f] = _.bind(obj[f], obj); });
    return obj;
  };

  // Memoize an expensive function by storing its results.
  _.memoize = function(func, hasher) {
    var memo = {};
    hasher || (hasher = _.identity);
    return function() {
      var key = hasher.apply(this, arguments);
      return _.has(memo, key) ? memo[key] : (memo[key] = func.apply(this, arguments));
    };
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){ return func.apply(null, args); }, wait);
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  _.defer = function(func) {
    return _.delay.apply(_, [func, 1].concat(slice.call(arguments, 1)));
  };

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time. Normally, the throttled function will run
  // as much as it can, without ever going more than once per `wait` duration;
  // but if you'd like to disable the execution on the leading edge, pass
  // `{leading: false}`. To disable execution on the trailing edge, ditto.
  _.throttle = function(func, wait, options) {
    var context, args, result;
    var timeout = null;
    var previous = 0;
    options || (options = {});
    var later = function() {
      previous = options.leading === false ? 0 : _.now();
      timeout = null;
      result = func.apply(context, args);
      context = args = null;
    };
    return function() {
      var now = _.now();
      if (!previous && options.leading === false) previous = now;
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0) {
        clearTimeout(timeout);
        timeout = null;
        previous = now;
        result = func.apply(context, args);
        context = args = null;
      } else if (!timeout && options.trailing !== false) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  _.debounce = function(func, wait, immediate) {
    var timeout, args, context, timestamp, result;

    var later = function() {
      var last = _.now() - timestamp;
      if (last < wait) {
        timeout = setTimeout(later, wait - last);
      } else {
        timeout = null;
        if (!immediate) {
          result = func.apply(context, args);
          context = args = null;
        }
      }
    };

    return function() {
      context = this;
      args = arguments;
      timestamp = _.now();
      var callNow = immediate && !timeout;
      if (!timeout) {
        timeout = setTimeout(later, wait);
      }
      if (callNow) {
        result = func.apply(context, args);
        context = args = null;
      }

      return result;
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  _.once = function(func) {
    var ran = false, memo;
    return function() {
      if (ran) return memo;
      ran = true;
      memo = func.apply(this, arguments);
      func = null;
      return memo;
    };
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  _.wrap = function(func, wrapper) {
    return _.partial(wrapper, func);
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  _.compose = function() {
    var funcs = arguments;
    return function() {
      var args = arguments;
      for (var i = funcs.length - 1; i >= 0; i--) {
        args = [funcs[i].apply(this, args)];
      }
      return args[0];
    };
  };

  // Returns a function that will only be executed after being called N times.
  _.after = function(times, func) {
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  };

  // Object Functions
  // ----------------

  // Retrieve the names of an object's properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  _.keys = function(obj) {
    if (!_.isObject(obj)) return [];
    if (nativeKeys) return nativeKeys(obj);
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys.push(key);
    return keys;
  };

  // Retrieve the values of an object's properties.
  _.values = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var values = new Array(length);
    for (var i = 0; i < length; i++) {
      values[i] = obj[keys[i]];
    }
    return values;
  };

  // Convert an object into a list of `[key, value]` pairs.
  _.pairs = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var pairs = new Array(length);
    for (var i = 0; i < length; i++) {
      pairs[i] = [keys[i], obj[keys[i]]];
    }
    return pairs;
  };

  // Invert the keys and values of an object. The values must be serializable.
  _.invert = function(obj) {
    var result = {};
    var keys = _.keys(obj);
    for (var i = 0, length = keys.length; i < length; i++) {
      result[obj[keys[i]]] = keys[i];
    }
    return result;
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Return a copy of the object only containing the whitelisted properties.
  _.pick = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    each(keys, function(key) {
      if (key in obj) copy[key] = obj[key];
    });
    return copy;
  };

   // Return a copy of the object without the blacklisted properties.
  _.omit = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    for (var key in obj) {
      if (!_.contains(keys, key)) copy[key] = obj[key];
    }
    return copy;
  };

  // Fill in a given object with default properties.
  _.defaults = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          if (obj[prop] === void 0) obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Internal recursive comparison function for `isEqual`.
  var eq = function(a, b, aStack, bStack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the [Harmony `egal` proposal](http://wiki.ecmascript.org/doku.php?id=harmony:egal).
    if (a === b) return a !== 0 || 1 / a == 1 / b;
    // A strict comparison is necessary because `null == undefined`.
    if (a == null || b == null) return a === b;
    // Unwrap any wrapped objects.
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className != toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, dates, and booleans are compared by value.
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return a == String(b);
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive. An `egal` comparison is performed for
        // other numeric values.
        return a != +a ? b != +b : (a == 0 ? 1 / a == 1 / b : a == +b);
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a == +b;
      // RegExps are compared by their source patterns and flags.
      case '[object RegExp]':
        return a.source == b.source &&
               a.global == b.global &&
               a.multiline == b.multiline &&
               a.ignoreCase == b.ignoreCase;
    }
    if (typeof a != 'object' || typeof b != 'object') return false;
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
    var length = aStack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (aStack[length] == a) return bStack[length] == b;
    }
    // Objects with different constructors are not equivalent, but `Object`s
    // from different frames are.
    var aCtor = a.constructor, bCtor = b.constructor;
    if (aCtor !== bCtor && !(_.isFunction(aCtor) && (aCtor instanceof aCtor) &&
                             _.isFunction(bCtor) && (bCtor instanceof bCtor))
                        && ('constructor' in a && 'constructor' in b)) {
      return false;
    }
    // Add the first object to the stack of traversed objects.
    aStack.push(a);
    bStack.push(b);
    var size = 0, result = true;
    // Recursively compare objects and arrays.
    if (className == '[object Array]') {
      // Compare array lengths to determine if a deep comparison is necessary.
      size = a.length;
      result = size == b.length;
      if (result) {
        // Deep compare the contents, ignoring non-numeric properties.
        while (size--) {
          if (!(result = eq(a[size], b[size], aStack, bStack))) break;
        }
      }
    } else {
      // Deep compare objects.
      for (var key in a) {
        if (_.has(a, key)) {
          // Count the expected number of properties.
          size++;
          // Deep compare each member.
          if (!(result = _.has(b, key) && eq(a[key], b[key], aStack, bStack))) break;
        }
      }
      // Ensure that both objects contain the same number of properties.
      if (result) {
        for (key in b) {
          if (_.has(b, key) && !(size--)) break;
        }
        result = !size;
      }
    }
    // Remove the first object from the stack of traversed objects.
    aStack.pop();
    bStack.pop();
    return result;
  };

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    return eq(a, b, [], []);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    if (_.isArray(obj) || _.isString(obj)) return obj.length === 0;
    for (var key in obj) if (_.has(obj, key)) return false;
    return true;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType === 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) == '[object Array]';
  };

  // Is a given variable an object?
  _.isObject = function(obj) {
    return obj === Object(obj);
  };

  // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp.
  each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp'], function(name) {
    _['is' + name] = function(obj) {
      return toString.call(obj) == '[object ' + name + ']';
    };
  });

  // Define a fallback version of the method in browsers (ahem, IE), where
  // there isn't any inspectable "Arguments" type.
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return !!(obj && _.has(obj, 'callee'));
    };
  }

  // Optimize `isFunction` if appropriate.
  if (typeof (/./) !== 'function') {
    _.isFunction = function(obj) {
      return typeof obj === 'function';
    };
  }

  // Is a given object a finite number?
  _.isFinite = function(obj) {
    return isFinite(obj) && !isNaN(parseFloat(obj));
  };

  // Is the given value `NaN`? (NaN is the only number which does not equal itself).
  _.isNaN = function(obj) {
    return _.isNumber(obj) && obj != +obj;
  };

  // Is a given value a boolean?
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) == '[object Boolean]';
  };

  // Is a given value equal to null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Shortcut function for checking if an object has a given property directly
  // on itself (in other words, not on a prototype).
  _.has = function(obj, key) {
    return hasOwnProperty.call(obj, key);
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iterators.
  _.identity = function(value) {
    return value;
  };

  _.constant = function(value) {
    return function () {
      return value;
    };
  };

  _.property = function(key) {
    return function(obj) {
      return obj[key];
    };
  };

  // Returns a predicate for checking whether an object has a given set of `key:value` pairs.
  _.matches = function(attrs) {
    return function(obj) {
      if (obj === attrs) return true; //avoid comparing an object to itself.
      for (var key in attrs) {
        if (attrs[key] !== obj[key])
          return false;
      }
      return true;
    }
  };

  // Run a function **n** times.
  _.times = function(n, iterator, context) {
    var accum = Array(Math.max(0, n));
    for (var i = 0; i < n; i++) accum[i] = iterator.call(context, i);
    return accum;
  };

  // Return a random integer between min and max (inclusive).
  _.random = function(min, max) {
    if (max == null) {
      max = min;
      min = 0;
    }
    return min + Math.floor(Math.random() * (max - min + 1));
  };

  // A (possibly faster) way to get the current timestamp as an integer.
  _.now = Date.now || function() { return new Date().getTime(); };

  // List of HTML entities for escaping.
  var entityMap = {
    escape: {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;'
    }
  };
  entityMap.unescape = _.invert(entityMap.escape);

  // Regexes containing the keys and values listed immediately above.
  var entityRegexes = {
    escape:   new RegExp('[' + _.keys(entityMap.escape).join('') + ']', 'g'),
    unescape: new RegExp('(' + _.keys(entityMap.unescape).join('|') + ')', 'g')
  };

  // Functions for escaping and unescaping strings to/from HTML interpolation.
  _.each(['escape', 'unescape'], function(method) {
    _[method] = function(string) {
      if (string == null) return '';
      return ('' + string).replace(entityRegexes[method], function(match) {
        return entityMap[method][match];
      });
    };
  });

  // If the value of the named `property` is a function then invoke it with the
  // `object` as context; otherwise, return it.
  _.result = function(object, property) {
    if (object == null) return void 0;
    var value = object[property];
    return _.isFunction(value) ? value.call(object) : value;
  };

  // Add your own custom functions to the Underscore object.
  _.mixin = function(obj) {
    each(_.functions(obj), function(name) {
      var func = _[name] = obj[name];
      _.prototype[name] = function() {
        var args = [this._wrapped];
        push.apply(args, arguments);
        return result.call(this, func.apply(_, args));
      };
    });
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = ++idCounter + '';
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /(.)^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  var escapes = {
    "'":      "'",
    '\\':     '\\',
    '\r':     'r',
    '\n':     'n',
    '\t':     't',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  var escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  _.template = function(text, data, settings) {
    var render;
    settings = _.defaults({}, settings, _.templateSettings);

    // Combine delimiters into one regular expression via alternation.
    var matcher = new RegExp([
      (settings.escape || noMatch).source,
      (settings.interpolate || noMatch).source,
      (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');

    // Compile the template source, escaping string literals appropriately.
    var index = 0;
    var source = "__p+='";
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      source += text.slice(index, offset)
        .replace(escaper, function(match) { return '\\' + escapes[match]; });

      if (escape) {
        source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
      }
      if (interpolate) {
        source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
      }
      if (evaluate) {
        source += "';\n" + evaluate + "\n__p+='";
      }
      index = offset + match.length;
      return match;
    });
    source += "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + "return __p;\n";

    try {
      render = new Function(settings.variable || 'obj', '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }

    if (data) return render(data, _);
    var template = function(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled function source as a convenience for precompilation.
    template.source = 'function(' + (settings.variable || 'obj') + '){\n' + source + '}';

    return template;
  };

  // Add a "chain" function, which will delegate to the wrapper.
  _.chain = function(obj) {
    return _(obj).chain();
  };

  // OOP
  // ---------------
  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.

  // Helper function to continue chaining intermediate results.
  var result = function(obj) {
    return this._chain ? _(obj).chain() : obj;
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      var obj = this._wrapped;
      method.apply(obj, arguments);
      if ((name == 'shift' || name == 'splice') && obj.length === 0) delete obj[0];
      return result.call(this, obj);
    };
  });

  // Add all accessor Array functions to the wrapper.
  each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      return result.call(this, method.apply(this._wrapped, arguments));
    };
  });

  _.extend(_.prototype, {

    // Start chaining a wrapped Underscore object.
    chain: function() {
      this._chain = true;
      return this;
    },

    // Extracts the result from a wrapped and chained object.
    value: function() {
      return this._wrapped;
    }

  });

  // AMD registration happens at the end for compatibility with AMD loaders
  // that may not enforce next-turn semantics on modules. Even though general
  // practice for AMD registration is to be anonymous, underscore registers
  // as a named module because, like jQuery, it is a base library that is
  // popular enough to be bundled in a third party lib, but not be part of
  // an AMD load request. Those cases could generate an error when an
  // anonymous define() is called outside of a loader request.
  if (typeof define === 'function' && define.amd) {
    define('underscore', [], function() {
      return _;
    });
  }
}).call(this);

},{}],13:[function(require,module,exports){
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
},{}],14:[function(require,module,exports){
var _ = require('underscore');

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

    var REGEX_LIST = _.keys(EDITIONS).concat(_.keys(VARIATIONS_ONLY));

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
    var REGEX_STR = _.map(REGEX_LIST, function(i) {
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
        if (_.keys(EDITIONS).concat(_.keys(VARIATIONS_ONLY)).indexOf(words[i]) > -1) {
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


},{"./reporters":13,"underscore":12}]},{},[10])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvaG9tZS9lcmljL3VuaXRlZHN0YXRlcy9jaXRhdGlvbi9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvaG9tZS9lcmljL3VuaXRlZHN0YXRlcy9jaXRhdGlvbi9jaXRhdGlvbnMvY2ZyLmpzIiwiL2hvbWUvZXJpYy91bml0ZWRzdGF0ZXMvY2l0YXRpb24vY2l0YXRpb25zL2RjX2NvZGUuanMiLCIvaG9tZS9lcmljL3VuaXRlZHN0YXRlcy9jaXRhdGlvbi9jaXRhdGlvbnMvZGNfbGF3LmpzIiwiL2hvbWUvZXJpYy91bml0ZWRzdGF0ZXMvY2l0YXRpb24vY2l0YXRpb25zL2RjX3JlZ2lzdGVyLmpzIiwiL2hvbWUvZXJpYy91bml0ZWRzdGF0ZXMvY2l0YXRpb24vY2l0YXRpb25zL2p1ZGljaWFsLmpzIiwiL2hvbWUvZXJpYy91bml0ZWRzdGF0ZXMvY2l0YXRpb24vY2l0YXRpb25zL2xhdy5qcyIsIi9ob21lL2VyaWMvdW5pdGVkc3RhdGVzL2NpdGF0aW9uL2NpdGF0aW9ucy9zdGF0LmpzIiwiL2hvbWUvZXJpYy91bml0ZWRzdGF0ZXMvY2l0YXRpb24vY2l0YXRpb25zL3VzYy5qcyIsIi9ob21lL2VyaWMvdW5pdGVkc3RhdGVzL2NpdGF0aW9uL2NpdGF0aW9ucy92YV9jb2RlLmpzIiwiL2hvbWUvZXJpYy91bml0ZWRzdGF0ZXMvY2l0YXRpb24vZmFrZV8zNmMwOTVjOS5qcyIsIi9ob21lL2VyaWMvdW5pdGVkc3RhdGVzL2NpdGF0aW9uL2ZpbHRlcnMvbGluZXMuanMiLCIvaG9tZS9lcmljL3VuaXRlZHN0YXRlcy9jaXRhdGlvbi9ub2RlX21vZHVsZXMvdW5kZXJzY29yZS91bmRlcnNjb3JlLmpzIiwiL2hvbWUvZXJpYy91bml0ZWRzdGF0ZXMvY2l0YXRpb24vbm9kZV9tb2R1bGVzL3dhbHZlcmluZS9yZXBvcnRlcnMuanMiLCIvaG9tZS9lcmljL3VuaXRlZHN0YXRlcy9jaXRhdGlvbi9ub2RlX21vZHVsZXMvd2FsdmVyaW5lL3dhbHZlcmluZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0dBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZVQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL3pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdm5HQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIoZnVuY3Rpb24oZGVmKSB7XG4gICAgaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnKSBtb2R1bGUuZXhwb3J0cyA9IGRlZjtcbiAgICBpZiAodHlwZW9mIENpdGF0aW9uICE9PSAndW5kZWZpbmVkJyAmJiBDaXRhdGlvbi50eXBlcykgQ2l0YXRpb24udHlwZXMuY2ZyID0gZGVmO1xufSkoe1xuICB0eXBlOiBcInJlZ2V4XCIsXG5cbiAgc3RhbmRhcmRpemU6IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICB2YXIgc2VjdGlvbiA9IGRhdGEuc2VjdGlvbiB8fCBkYXRhLnBhcnQ7XG4gICAgcmV0dXJuIHtcbiAgICAgIGlkOiB1bmRlcnNjb3JlLmNvbXBhY3QodW5kZXJzY29yZS5mbGF0dGVuKFtcImNmclwiLCBkYXRhLnRpdGxlLCBzZWN0aW9uLCBkYXRhLnN1YnNlY3Rpb25zXSkpLmpvaW4oXCIvXCIpXG4gICAgfTtcbiAgfSxcblxuICBwYXR0ZXJuczogW1xuICAgIC8vIGRvbmU6XG4gICAgLy8gMTQgQ0ZSIHBhcnQgMjVcbiAgICAvLyAzOCBDRlIgUGFydCA3NC4yXG4gICAgLy8gNDggQ0ZSIMKnIDk5MDMuMjAxXG4gICAgLy8gMjQgQ0ZSIDg1LjI1KGgpXG4gICAgLy8gNSBDRlIgwqc1MzEuNjEwKGYpXG4gICAgLy8gNDUgQy5GLlIuIDMwMDkuNFxuICAgIC8vIDQ3IENGUiA1NC41MDYgKGMpXG4gICAgLy8gICBidXQgbm90OiA0NyBDRlIgNTQuNTA2ICh3aGF0ZXZlcilcbiAgICAvLyA1Q0ZSLCBwYXJ0IDU3NVxuXG4gICAgLy8gbWF5YmU6XG4gICAgLy8gMTMgQ0ZSIFBhcnRzIDEyNSBhbmQgMTM0XG4gICAgLy8gNUNGUiwgcGFydCA1NzUsIHN1YnBhcnQgQ1xuICAgIC8vIDIzIENGUiA2NTAsIFN1YnBhcnQgQVxuICAgIHtcbiAgICAgIHJlZ2V4OlxuICAgICAgICBcIihcXFxcZCspXFxcXHM/XCIgK1xuICAgICAgICBcIkNcXFxcLj9cXFxccz9GXFxcXC4/XFxcXHM/UlxcXFwuP1wiICtcbiAgICAgICAgXCIoPzpbXFxcXHMsXSsoPzrCpyt8cGFydHM/KSk/XCIgK1xuICAgICAgICBcIlxcXFxzKigoPzpcXFxcZCtcXFxcLj9cXFxcZCooPzpcXFxccypcXFxcKCg/OlthLXpBLVpcXFxcZF17MSwyfXxbaXh2SVhWXSspXFxcXCkpKikrKVwiLFxuXG4gICAgICBmaWVsZHM6IFsndGl0bGUnLCAnc2VjdGlvbnMnXSxcblxuICAgICAgcHJvY2Vzc29yOiBmdW5jdGlvbihjYXB0dXJlcykge1xuICAgICAgICB2YXIgdGl0bGUgPSBjYXB0dXJlcy50aXRsZTtcbiAgICAgICAgdmFyIHBhcnQsIHNlY3Rpb24sIHN1YnNlY3Rpb25zO1xuXG4gICAgICAgIC8vIHNlcGFyYXRlIHN1YnNlY3Rpb25zIGZvciBlYWNoIHNlY3Rpb24gYmVpbmcgY29uc2lkZXJlZFxuICAgICAgICB2YXIgc3BsaXQgPSB1bmRlcnNjb3JlLmNvbXBhY3QoY2FwdHVyZXMuc2VjdGlvbnMuc3BsaXQoL1tcXChcXCldKy8pKTtcbiAgICAgICAgc2VjdGlvbiA9IHNwbGl0WzBdLnRyaW0oKTtcbiAgICAgICAgc3Vic2VjdGlvbnMgPSBzcGxpdC5zcGxpY2UoMSk7XG5cbiAgICAgICAgaWYgKHNlY3Rpb24uaW5kZXhPZihcIi5cIikgPiAwKSB7XG4gICAgICAgICAgcGFydCA9IHNlY3Rpb24uc3BsaXQoXCIuXCIpWzBdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHBhcnQgPSBzZWN0aW9uO1xuICAgICAgICAgIHNlY3Rpb24gPSBudWxsO1xuICAgICAgICAgIHN1YnNlY3Rpb25zID0gbnVsbDsgLy8gZG9uJ3QgaW5jbHVkZSBlbXB0eSBhcnJheVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICB0aXRsZTogdGl0bGUsXG4gICAgICAgICAgcGFydDogcGFydCxcbiAgICAgICAgICBzZWN0aW9uOiBzZWN0aW9uLFxuICAgICAgICAgIHN1YnNlY3Rpb25zOiBzdWJzZWN0aW9uc1xuICAgICAgICB9O1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIHRvZG86XG4gICAgLy8gcGFydHMgMTIxIGFuZCAxMzUgb2YgVGl0bGUgMTQgb2YgdGhlIENvZGUgb2YgRmVkZXJhbCBSZWd1bGF0aW9uc1xuICAgIC8vIHtcbiAgICAvLyAgIHJlZ2V4OlxuICAgIC8vICAgICBcInNlY3Rpb24gKFxcXFxkK1tcXFxcd1xcXFxkXFwtXSopKCg/OlxcXFwoW15cXFxcKV0rXFxcXCkpKilcIiArXG4gICAgLy8gICAgIFwiKD86XFxcXHMrb2Z8XFxcXCwpIHRpdGxlIChcXFxcZCspXCIsXG4gICAgLy8gICBmaWVsZHM6IFsnc2VjdGlvbicsICdzdWJzZWN0aW9ucycsICd0aXRsZSddLFxuICAgIC8vICAgcHJvY2Vzc29yOiBmdW5jdGlvbihjYXB0dXJlcykge1xuICAgIC8vICAgICByZXR1cm4ge1xuICAgIC8vICAgICAgIHRpdGxlOiBjYXB0dXJlcy50aXRsZSxcbiAgICAvLyAgICAgICBzZWN0aW9uOiBjYXB0dXJlcy5zZWN0aW9uLFxuICAgIC8vICAgICAgIHN1YnNlY3Rpb25zOiB1bmRlcnNjb3JlLmNvbXBhY3QoY2FwdHVyZXMuc3Vic2VjdGlvbnMuc3BsaXQoL1tcXChcXCldKy8pKVxuICAgIC8vICAgICB9O1xuICAgIC8vICAgfVxuICAgIC8vIH1cbiAgXVxufSk7XG4iLCIoZnVuY3Rpb24oZGVmKSB7XG4gICAgaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnKSBtb2R1bGUuZXhwb3J0cyA9IGRlZjtcbiAgICBpZiAodHlwZW9mIENpdGF0aW9uICE9PSAndW5kZWZpbmVkJyAmJiBDaXRhdGlvbi50eXBlcykgQ2l0YXRpb24udHlwZXMuZGNfY29kZSA9IGRlZjtcbn0pKHtcbiAgdHlwZTogXCJyZWdleFwiLFxuXG4gIC8vIG5vcm1hbGl6ZSBhbGwgY2l0ZXMgdG8gYW4gSUQsIHdpdGggYW5kIHdpdGhvdXQgc3Vic2VjdGlvbnNcbiAgc3RhbmRhcmRpemU6IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICByZXR1cm4ge1xuICAgICAgaWQ6IHVuZGVyc2NvcmUuZmxhdHRlbihbXCJkYy1jb2RlXCIsIGRhdGEudGl0bGUsIGRhdGEuc2VjdGlvbiwgZGF0YS5zdWJzZWN0aW9uc10pLmpvaW4oXCIvXCIpLFxuICAgICAgc2VjdGlvbl9pZDogW1wiZGMtY29kZVwiLCBkYXRhLnRpdGxlLCBkYXRhLnNlY3Rpb25dLmpvaW4oXCIvXCIpXG4gICAgfTtcbiAgfSxcblxuICAvLyBmaWVsZCB0byBjYWxjdWxhdGUgcGFyZW50cyBmcm9tXG4gIHBhcmVudHNfYnk6IFwic3Vic2VjdGlvbnNcIixcblxuICBwYXR0ZXJuczogZnVuY3Rpb24oY29udGV4dCkge1xuICAgIC8vIG9ubHkgYXBwbHkgdGhpcyByZWdleCBpZiB3ZSdyZSBjb25maWRlbnQgdGhhdCByZWxhdGl2ZSBjaXRhdGlvbnMgcmVmZXIgdG8gdGhlIERDIENvZGVcbiAgICBpZiAoY29udGV4dC5zb3VyY2UgPT0gXCJkY19jb2RlXCIpIHtcbiAgICAgIHJldHVybiBbXG5cbiAgICAgICAgLy8gwqcgMzItNzAxXG4gICAgICAgIC8vIMKnIDMyLTcwMSg0KVxuICAgICAgICAvLyDCpyAzLTEwMS4wMVxuICAgICAgICAvLyDCpyAxLTYwMy4wMSgxMylcbiAgICAgICAgLy8gwqcgMS0gMTE2My4zM1xuICAgICAgICAvLyDCpyAxIC0xMTYzLjMzXG4gICAgICAgIC8vIHNlY3Rpb24gMTYtMjMyNi4wMVxuICAgICAgICB7XG4gICAgICAgICAgcmVnZXg6XG4gICAgICAgICAgICBcIig/OnNlY3Rpb24oPzpzKT98wqcrKVxcXFxzKyhcXFxcZCtBPylcIiArXG4gICAgICAgICAgICBcIlxcXFxzP1xcXFwtXFxcXHM/XCIgK1xuICAgICAgICAgICAgXCIoW1xcXFx3XFxcXGRdKyg/OlxcXFwuP1tcXFxcd1xcXFxkXSspPylcIiArICAvLyBzZWN0aW9uIGlkZW50aWZpZXIsIGxldHRlcnMvbnVtYmVycy9kb3RzXG4gICAgICAgICAgICBcIigoPzpcXFxcKFteXFxcXCldK1xcXFwpKSopXCIsIC8vIGFueSBudW1iZXIgb2YgYWRqYWNlbnQgcGFyZW50aGVzaXplZCBzdWJzZWN0aW9uc1xuXG4gICAgICAgICAgZmllbGRzOiBbXCJ0aXRsZVwiLCBcInNlY3Rpb25cIiwgXCJzdWJzZWN0aW9uc1wiXSxcblxuICAgICAgICAgIHByb2Nlc3NvcjogZnVuY3Rpb24oY2FwdHVyZXMpIHtcbiAgICAgICAgICAgIHZhciB0aXRsZSA9IGNhcHR1cmVzLnRpdGxlO1xuICAgICAgICAgICAgdmFyIHNlY3Rpb24gPSBjYXB0dXJlcy5zZWN0aW9uO1xuICAgICAgICAgICAgdmFyIHN1YnNlY3Rpb25zID0gW107XG4gICAgICAgICAgICBpZiAoY2FwdHVyZXMuc3Vic2VjdGlvbnMpIHN1YnNlY3Rpb25zID0gdW5kZXJzY29yZS5jb21wYWN0KGNhcHR1cmVzLnN1YnNlY3Rpb25zLnNwbGl0KC9bXFwoXFwpXSsvKSk7XG5cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgIHRpdGxlOiB0aXRsZSxcbiAgICAgICAgICAgICAgc2VjdGlvbjogc2VjdGlvbixcbiAgICAgICAgICAgICAgc3Vic2VjdGlvbnM6IHN1YnNlY3Rpb25zXG4gICAgICAgICAgICB9O1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgXTtcbiAgICB9XG5cbiAgICAvLyBhYnNvbHV0ZSBjaXRlc1xuICAgIGVsc2Uge1xuICAgICAgcmV0dXJuIFtcblxuICAgICAgICAvLyBELkMuIE9mZmljaWFsIENvZGUgMy0xMjAyLjA0XG4gICAgICAgIC8vIEQuQy4gT2ZmaWNpYWwgQ29kZSDCpyAzLTEyMDEuMDFcbiAgICAgICAgLy8gRC5DLiBPZmZpY2lhbCBDb2RlIMKnwqcgMzgtMjYwMihiKSgxMSlcbiAgICAgICAgLy8gRC5DLiBPZmZpY2lhbCBDb2RlIMKnIDMtIDEyMDEuMDFcbiAgICAgICAgLy8gRC5DLiBPZmZpY2lhbCBDb2RlIMKnIDMgLTEyMDEuMDFcbiAgICAgICAge1xuICAgICAgICAgIHJlZ2V4OlxuICAgICAgICAgICAgXCJEXFxcXC4/Q1xcXFwuPyBPZmZpY2lhbCBDb2RlXFxcXHMrXCIgKyAvLyBhYnNvbHV0ZSBpZGVudGlmaWVyXG4gICAgICAgICAgICBcIig/OsKnK1xcXFxzKyk/KFxcXFxkK0E/KVwiICsgICAgICAgICAgICAvLyBvcHRpb25hbCBzZWN0aW9uIHNpZ24sIHBsdXMgdGl0bGVcbiAgICAgICAgICAgIFwiXFxcXHM/XFxcXC1cXFxccz9cIiArXG4gICAgICAgICAgICBcIihbXFxcXHdcXFxcZF0rKD86XFxcXC4/W1xcXFx3XFxcXGRdKyk/KVwiICsgICAgICAvLyBzZWN0aW9uIGlkZW50aWZpZXIsIGxldHRlcnMvbnVtYmVycy9kb3RzXG4gICAgICAgICAgICBcIigoPzpcXFxcKFteXFxcXCldK1xcXFwpKSopXCIsIC8vIGFueSBudW1iZXIgb2YgYWRqYWNlbnQgcGFyZW50aGVzaXplZCBzdWJzZWN0aW9uc1xuXG4gICAgICAgICAgZmllbGRzOiBbXCJ0aXRsZVwiLCBcInNlY3Rpb25cIiwgXCJzdWJzZWN0aW9uc1wiXSxcblxuICAgICAgICAgIHByb2Nlc3NvcjogZnVuY3Rpb24oY2FwdHVyZXMpIHtcbiAgICAgICAgICAgIHZhciB0aXRsZSA9IGNhcHR1cmVzLnRpdGxlO1xuICAgICAgICAgICAgdmFyIHNlY3Rpb24gPSBjYXB0dXJlcy5zZWN0aW9uO1xuXG4gICAgICAgICAgICB2YXIgc3Vic2VjdGlvbnMgPSBbXTtcbiAgICAgICAgICAgIGlmIChjYXB0dXJlcy5zdWJzZWN0aW9ucykgc3Vic2VjdGlvbnMgPSB1bmRlcnNjb3JlLmNvbXBhY3QoY2FwdHVyZXMuc3Vic2VjdGlvbnMuc3BsaXQoL1tcXChcXCldKy8pKTtcblxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgdGl0bGU6IHRpdGxlLFxuICAgICAgICAgICAgICBzZWN0aW9uOiBzZWN0aW9uLFxuICAgICAgICAgICAgICBzdWJzZWN0aW9uczogc3Vic2VjdGlvbnNcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICBdO1xuICAgIH1cbiAgfVxufSk7XG4iLCIoZnVuY3Rpb24oZGVmKSB7XG4gICAgaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnKSBtb2R1bGUuZXhwb3J0cyA9IGRlZjtcbiAgICBpZiAodHlwZW9mIENpdGF0aW9uICE9PSAndW5kZWZpbmVkJyAmJiBDaXRhdGlvbi50eXBlcykgQ2l0YXRpb24udHlwZXMuZGNfbGF3ID0gZGVmO1xufSkoe1xuICB0eXBlOiBcInJlZ2V4XCIsXG5cbiAgc3RhbmRhcmRpemU6IGZ1bmN0aW9uKGNpdGUpIHtcbiAgICByZXR1cm4ge1xuICAgICAgaWQ6IFtcImRjLWxhd1wiLCBjaXRlLnBlcmlvZCwgY2l0ZS5udW1iZXJdLmpvaW4oXCIvXCIpXG4gICAgfTtcbiAgfSxcblxuICBwYXR0ZXJuczogZnVuY3Rpb24oY29udGV4dCkge1xuICAgIC8vIElmIHRoZSBjb250ZXh0IGZvciB0aGlzIGNpdGF0aW9uIGlzIHRoZSBEQyBDb2RlLCB0aGVuIExhdyBYWC1ZWVkgY2FuIGJlIGFzc3VtZWRcbiAgICAvLyB0byBiZSBhIERDIGxhdy4gSW4gb3RoZXIgY29udGV4dCwgcmVxdWlyZSB0aGUgXCJEQyBMYXdcIiBwcmVmaXguXG4gICAgdmFyIGNvbnRleHRfcmVnZXggPSBcIlwiO1xuICAgIGlmIChjb250ZXh0LnNvdXJjZSAhPSBcImRjX2NvZGVcIilcbiAgICAgIGNvbnRleHRfcmVnZXggPSBcIkRcXFxcLj9cXFxccypDXFxcXC4/XFxcXHMrXCI7XG5cbiAgICByZXR1cm4gW1xuICAgICAgLy8gXCJELkMuIExhdyAxMTEtODlcIlxuICAgICAgLy8gXCJEQyBMYXcgMTExLTg5XCJcbiAgICAgIC8vIFwiREMgTGF3IDE4LTEzNUFcIlxuICAgICAge1xuICAgICAgICByZWdleDpcbiAgICAgICAgICBjb250ZXh0X3JlZ2V4ICsgXCJMYXdcXFxccysoXFxcXGQrKVxcXFxzP1st4oCTXStcXFxccz8oXFxcXGQrXFxcXHc/KVwiLFxuICAgICAgICBmaWVsZHM6IFtcInBlcmlvZFwiLCBcIm51bWJlclwiXSxcbiAgICAgICAgcHJvY2Vzc29yOiBmdW5jdGlvbihjYXB0dXJlcykge1xuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBwZXJpb2Q6IGNhcHR1cmVzLnBlcmlvZCxcbiAgICAgICAgICAgIG51bWJlcjogY2FwdHVyZXMubnVtYmVyXG4gICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIF07XG4gIH1cbn0pO1xuIiwiKGZ1bmN0aW9uKGRlZikge1xuICAgIGlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJykgbW9kdWxlLmV4cG9ydHMgPSBkZWY7XG4gICAgaWYgKHR5cGVvZiBDaXRhdGlvbiAhPT0gJ3VuZGVmaW5lZCcgJiYgQ2l0YXRpb24udHlwZXMpIENpdGF0aW9uLnR5cGVzLmRjX3JlZ2lzdGVyID0gZGVmO1xufSkoe1xuICB0eXBlOiBcInJlZ2V4XCIsXG5cbiAgLy8gbm9ybWFsaXplIGFsbCBjaXRlcyB0byBhbiBJRFxuICBzdGFuZGFyZGl6ZTogZnVuY3Rpb24obWF0Y2gpIHtcbiAgICByZXR1cm4ge1xuICAgICAgaWQ6IHVuZGVyc2NvcmUuZmxhdHRlbihbXCJkYy1yZWdpc3RlclwiLCBtYXRjaC52b2x1bWUsIG1hdGNoLnBhZ2VdKS5qb2luKFwiL1wiKVxuICAgIH07XG4gIH0sXG5cbiAgcGF0dGVybnM6IFtcbiAgICAvLyA1NCBEQ1IgODAxNFxuICAgIHtcbiAgICAgIHJlZ2V4OlxuICAgICAgICBcIihcXFxcZCspXFxcXHMrXCIgK1xuICAgICAgICBcIkRDUlwiICtcbiAgICAgICAgXCJcXFxccysoXFxcXGQrKVwiLFxuICAgICAgZmllbGRzOiBbJ3ZvbHVtZScsICdwYWdlJ10sXG4gICAgICBwcm9jZXNzb3I6IGZ1bmN0aW9uKG1hdGNoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgdm9sdW1lOiBtYXRjaC52b2x1bWUsXG4gICAgICAgICAgcGFnZTogbWF0Y2gucGFnZSxcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9XG4gIF1cbn0pO1xuIiwiaWYgKHR5cGVvZihyZXF1aXJlKSAhPT0gXCJ1bmRlZmluZWRcIilcbiAgd2FsdmVyaW5lID0gcmVxdWlyZShcIndhbHZlcmluZVwiKTtcblxuKGZ1bmN0aW9uKGRlZikge1xuICAgIGlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJykgbW9kdWxlLmV4cG9ydHMgPSBkZWY7XG4gICAgaWYgKHR5cGVvZiBDaXRhdGlvbiAhPT0gJ3VuZGVmaW5lZCcgJiYgQ2l0YXRpb24udHlwZXMpIENpdGF0aW9uLnR5cGVzLmp1ZGljaWFsID0gZGVmO1xufSkoe1xuICB0eXBlOiBcImV4dGVybmFsXCIsXG5cbiAgZXh0cmFjdDogZnVuY3Rpb24odGV4dCkge1xuICAgIHJldHVybiB3YWx2ZXJpbmUuZ2V0X2NpdGF0aW9ucyh0ZXh0KS5tYXAoZnVuY3Rpb24oY2l0ZSkge1xuICAgICAgdmFyIHJlc3VsdCA9IHt9O1xuICAgICAgcmVzdWx0Lm1hdGNoID0gY2l0ZS5tYXRjaDtcblxuICAgICAgLy8gbW9kaWZ5IGluIHBsYWNlXG4gICAgICBkZWxldGUgY2l0ZS5tYXRjaDtcblxuICAgICAgcmVzdWx0Lmp1ZGljaWFsID0gY2l0ZTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSk7XG4gIH1cbn0pOyIsIihmdW5jdGlvbihkZWYpIHtcbiAgICBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcpIG1vZHVsZS5leHBvcnRzID0gZGVmO1xuICAgIGlmICh0eXBlb2YgQ2l0YXRpb24gIT09ICd1bmRlZmluZWQnICYmIENpdGF0aW9uLnR5cGVzKSBDaXRhdGlvbi50eXBlcy5sYXcgPSBkZWY7XG59KSh7XG4gIHR5cGU6IFwicmVnZXhcIixcblxuICBzdGFuZGFyZGl6ZTogZnVuY3Rpb24oY2l0ZSkge1xuICAgIHJldHVybiB7XG4gICAgICBpZDogdW5kZXJzY29yZS5mbGF0dGVuKFtcInVzLWxhd1wiLCBjaXRlLnR5cGUsIGNpdGUuY29uZ3Jlc3MsIGNpdGUubnVtYmVyLCBjaXRlLnNlY3Rpb25zXSkuam9pbihcIi9cIiksXG4gICAgICBsYXdfaWQ6IFtcInVzLWxhd1wiLCBjaXRlLnR5cGUsIGNpdGUuY29uZ3Jlc3MsIGNpdGUubnVtYmVyXS5qb2luKFwiL1wiKVxuICAgIH07XG4gIH0sXG5cbiAgLy8gZmllbGQgdG8gY2FsY3VsYXRlIHBhcmVudHMgZnJvbVxuICBwYXJlbnRzX2J5OiBcInNlY3Rpb25zXCIsXG5cbiAgcGF0dGVybnM6IFtcbiAgICAvLyBcIlB1YmxpYyBMYXcgMTExLTg5XCJcbiAgICAvLyBcIlB1Yi4gTC4gMTEyLTU2XCJcbiAgICAvLyBcIlB1Yi4gTC4gTm8uIDExMC0yXCJcbiAgICAvLyBcIlB1Yi5MLiAxMDUtMzNcIlxuICAgIC8vIFwiUHJpdmF0ZSBMYXcgMTExLTcyXCJcbiAgICAvLyBcIlByaXYuIEwuIE5vLiA5OC0yM1wiXG4gICAgLy8gXCJzZWN0aW9uIDU1MiBvZiBQdWJsaWMgTGF3IDExMS04OVwiXG4gICAgLy8gXCJzZWN0aW9uIDQ0MDIoZSkoMSkgb2YgUHVibGljIExhdyAxMTAtMlwiXG4gICAge1xuICAgICAgcmVnZXg6XG4gICAgICAgIFwiKD86c2VjdGlvbiAoXFxcXGQrW1xcXFx3XFxcXGRcXC1dKikoKD86XFxcXChbXlxcXFwpXStcXFxcKSkqKSBvZiApP1wiICtcbiAgICAgICAgXCIocHViKD86bGljKT98cHJpdig/OmF0ZSk/KVxcXFwuP1xcXFxzKmwoPzphdyk/XFxcXC4/KD86XFxcXHMqTm9cXFxcLj8pP1wiICtcbiAgICAgICAgXCIgKyhcXFxcZCspWy3igJNdKyhcXFxcZCspXCIsXG4gICAgICBmaWVsZHM6IFsnc2VjdGlvbicsICdzdWJzZWN0aW9ucycsICd0eXBlJywgJ2NvbmdyZXNzJywgJ251bWJlciddLFxuICAgICAgcHJvY2Vzc29yOiBmdW5jdGlvbihjYXB0dXJlcykge1xuICAgICAgICB2YXIgc2VjdGlvbnMgPSBbXTtcbiAgICAgICAgaWYgKGNhcHR1cmVzLnNlY3Rpb24pIHNlY3Rpb25zLnB1c2goY2FwdHVyZXMuc2VjdGlvbik7XG4gICAgICAgIGlmIChjYXB0dXJlcy5zdWJzZWN0aW9ucykgc2VjdGlvbnMgPSBzZWN0aW9ucy5jb25jYXQodW5kZXJzY29yZS5jb21wYWN0KGNhcHR1cmVzLnN1YnNlY3Rpb25zLnNwbGl0KC9bXFwoXFwpXSsvKSkpO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgdHlwZTogY2FwdHVyZXMudHlwZS5tYXRjaCgvXnByaXYvaSkgPyBcInByaXZhdGVcIiA6IFwicHVibGljXCIsXG4gICAgICAgICAgY29uZ3Jlc3M6IGNhcHR1cmVzLmNvbmdyZXNzLFxuICAgICAgICAgIG51bWJlcjogY2FwdHVyZXMubnVtYmVyLFxuICAgICAgICAgIHNlY3Rpb25zOiBzZWN0aW9uc1xuICAgICAgICB9O1xuICAgICAgfVxuICAgIH0sXG5cbiAgICAvLyBcIlBMIDE5LTRcIlxuICAgIC8vIFwiUC5MLiA0NS03OFwiXG4gICAgLy8gXCJzZWN0aW9uIDU1MiBvZiBQTCAxOS00XCJcbiAgICAvLyBcInNlY3Rpb24gNDQwMihlKSgxKSBvZiBQTCAxOS00XCJcbiAgICB7XG4gICAgICByZWdleDpcbiAgICAgICAgXCIoPzpzZWN0aW9uIChcXFxcZCtbXFxcXHdcXFxcZFxcLV0qKSgoPzpcXFxcKFteXFxcXCldK1xcXFwpKSopIG9mICk/XCIgK1xuICAgICAgICBcIlBcXFxcLj9MXFxcXC4/ICsoXFxcXGQrKVst4oCTXShcXFxcZCspXCIsXG4gICAgICBmaWVsZHM6IFsnc2VjdGlvbicsICdzdWJzZWN0aW9ucycsICdjb25ncmVzcycsICdudW1iZXInXSxcbiAgICAgIHByb2Nlc3NvcjogZnVuY3Rpb24oY2FwdHVyZXMpIHtcbiAgICAgICAgc2VjdGlvbnMgPSBbXTtcbiAgICAgICAgaWYgKGNhcHR1cmVzLnNlY3Rpb24pIHNlY3Rpb25zLnB1c2goY2FwdHVyZXMuc2VjdGlvbik7XG4gICAgICAgIGlmIChjYXB0dXJlcy5zdWJzZWN0aW9ucykgc2VjdGlvbnMgPSBzZWN0aW9ucy5jb25jYXQodW5kZXJzY29yZS5jb21wYWN0KGNhcHR1cmVzLnN1YnNlY3Rpb25zLnNwbGl0KC9bXFwoXFwpXSsvKSkpO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgdHlwZTogXCJwdWJsaWNcIixcbiAgICAgICAgICBjb25ncmVzczogY2FwdHVyZXMuY29uZ3Jlc3MsXG4gICAgICAgICAgbnVtYmVyOiBjYXB0dXJlcy5udW1iZXIsXG4gICAgICAgICAgc2VjdGlvbnM6IHNlY3Rpb25zXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfVxuICBdXG59KTtcbiIsIihmdW5jdGlvbihkZWYpIHtcbiAgICBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcpIG1vZHVsZS5leHBvcnRzID0gZGVmO1xuICAgIGlmICh0eXBlb2YgQ2l0YXRpb24gIT09ICd1bmRlZmluZWQnICYmIENpdGF0aW9uLnR5cGVzKSBDaXRhdGlvbi50eXBlcy5zdGF0ID0gZGVmO1xufSkoe1xuICB0eXBlOiBcInJlZ2V4XCIsXG5cbiAgLy8gbm9ybWFsaXplIGFsbCBjaXRlcyB0byBhbiBJRFxuICBzdGFuZGFyZGl6ZTogZnVuY3Rpb24oY2l0ZSkge1xuICAgIHJldHVybiB7XG4gICAgICBpZDogdW5kZXJzY29yZS5mbGF0dGVuKFtcInN0YXRcIiwgY2l0ZS52b2x1bWUsIGNpdGUucGFnZV0pLmpvaW4oXCIvXCIpXG4gICAgfTtcbiAgfSxcblxuICBwYXR0ZXJuczogW1xuICAgIC8vIFwiMTE3IFN0YXQuIDE5NTJcIlxuICAgIC8vIFwiNzcgU1RBVC4gNzdcIlxuICAgIHtcbiAgICAgIHJlZ2V4OlxuICAgICAgICBcIihcXFxcZCtbXFxcXHddKilcXFxccytcIiArXG4gICAgICAgIFwiU3RhdFxcXFwuP1wiICtcbiAgICAgICAgXCJcXFxccysoXFxcXGQrKVwiLFxuICAgICAgZmllbGRzOiBbJ3ZvbHVtZScsICdwYWdlJ10sXG4gICAgICBwcm9jZXNzb3I6IGZ1bmN0aW9uKG1hdGNoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgdm9sdW1lOiBtYXRjaC52b2x1bWUsXG4gICAgICAgICAgcGFnZTogbWF0Y2gucGFnZSxcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9XG4gIF1cbn0pO1xuIiwiKGZ1bmN0aW9uKGRlZikge1xuICAgIGlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJykgbW9kdWxlLmV4cG9ydHMgPSBkZWY7XG4gICAgaWYgKHR5cGVvZiBDaXRhdGlvbiAhPT0gJ3VuZGVmaW5lZCcgJiYgQ2l0YXRpb24udHlwZXMpIENpdGF0aW9uLnR5cGVzLnVzYyA9IGRlZjtcbn0pKHtcbiAgdHlwZTogXCJyZWdleFwiLFxuXG4gIC8vIG5vcm1hbGl6ZSBhbGwgY2l0ZXMgdG8gYW4gSUQsIHdpdGggYW5kIHdpdGhvdXQgc3Vic2VjdGlvbnMsXG4gIC8vIFRPRE86IGtpbGwgdGhpcz9cbiAgc3RhbmRhcmRpemU6IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICByZXR1cm4ge1xuICAgICAgaWQ6IHVuZGVyc2NvcmUuZmxhdHRlbihbXCJ1c2NcIiwgZGF0YS50aXRsZSwgZGF0YS5zZWN0aW9uLCBkYXRhLnN1YnNlY3Rpb25zXSkuam9pbihcIi9cIiksXG4gICAgICBzZWN0aW9uX2lkOiBbXCJ1c2NcIiwgZGF0YS50aXRsZSwgZGF0YS5zZWN0aW9uXS5qb2luKFwiL1wiKVxuICAgIH07XG4gIH0sXG5cblxuICAvLyBmaWVsZCB0byBjYWxjdWxhdGUgcGFyZW50cyBmcm9tXG4gIHBhcmVudHNfYnk6IFwic3Vic2VjdGlvbnNcIixcblxuICBwYXR0ZXJuczogW1xuICAgIC8vIFwiNSBVU0MgNTUyXCJcbiAgICAvLyBcIjUgVS5TLkMuIMKnIDU1MihhKSgxKShFKVwiXG4gICAgLy8gXCI3IFUuUy5DLiA2MTJjIG5vdGVcIlxuICAgIC8vIFwiMjkgVS5TLkMuIDEwODEgZXQgc2VxXCJcbiAgICAvLyBcIjUwIFUuUy5DLiBBcHAuIDU5NVwiXG4gICAgLy8gXCI0NSBVLlMuQy4gMTBhLTEwY1wiXG4gICAgLy8gXCI1MCBVLlMuQy4gNDA0by0xKGEpXCIgLSBzaW5nbGUgc2VjdGlvblxuICAgIC8vIFwiNDUgVS5TLkMuIDEwYSgxKS0xMGMoMilcIiAtIHJhbmdlXG4gICAgLy8gXCI1MCBVLlMuQy4gQXBwLiDCp8KnIDQ1MS0tNDczXCIgLSByYW5nZVxuICAgIHtcbiAgICAgIHJlZ2V4OlxuICAgICAgICBcIihcXFxcZCspXFxcXHMrXCIgKyAvLyB0aXRsZVxuICAgICAgICBcIlVcXFxcLj9cXFxccz9TXFxcXC4/XFxcXHM/Q1xcXFwuP1wiICtcbiAgICAgICAgXCIoPzpcXFxccysoQXBwKVxcLj8pP1wiICsgLy8gYXBwZW5kaXhcbiAgICAgICAgXCIoPzpcXFxccysowqcrKSk/XCIgKyAvLyBzeW1ib2xcbiAgICAgICAgXCJcXFxccysoKD86XFxcXC0qXFxcXGQrW1xcXFx3XFxcXGRcXFxcLV0qKD86XFxcXChbXlxcXFwpXStcXFxcKSkqKSspXCIgKyAvLyBzZWN0aW9uc1xuICAgICAgICBcIig/OlxcXFxzKyhub3RlfGV0XFxcXHMrc2VxKSk/XCIsIC8vIG5vdGVcblxuICAgICAgZmllbGRzOiBbXG4gICAgICAgICd0aXRsZScsICdhcHBlbmRpeCcsXG4gICAgICAgICdzeW1ib2wnLCAnc2VjdGlvbnMnLCAnbm90ZSdcbiAgICAgIF0sXG5cbiAgICAgIHByb2Nlc3NvcjogZnVuY3Rpb24obWF0Y2gpIHtcbiAgICAgICAgLy8gYSBmZXcgdGl0bGVzIGhhdmUgZGlzdGluY3QgYXBwZW5kaXhlc1xuICAgICAgICB2YXIgdGl0bGUgPSBtYXRjaC50aXRsZTtcbiAgICAgICAgaWYgKG1hdGNoLmFwcGVuZGl4KSB0aXRsZSArPSBcIi1hcHBcIjtcblxuICAgICAgICB2YXIgc2VjdGlvbnMgPSBtYXRjaC5zZWN0aW9ucy5zcGxpdCgvLSsvKTtcblxuICAgICAgICB2YXIgcmFuZ2UgPSBmYWxzZTtcblxuICAgICAgICAvLyB0d28gc2VjdGlvbiBzeW1ib2xzIGlzIHVuYW1iaWd1b3VzXG4gICAgICAgIGlmIChtYXRjaC5zeW1ib2wgPT0gXCLCp8KnXCIpIC8vIDIgc2VjdGlvbiBzeW1ib2xzXG4gICAgICAgICAgcmFuZ2UgPSB0cnVlO1xuXG4gICAgICAgIC8vIHBhcmVuIGJlZm9yZSBkYXNoIGlzIHVuYW1iaWd1b3VzXG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIHZhciBkYXNoID0gbWF0Y2guc2VjdGlvbnMuaW5kZXhPZihcIi1cIik7XG4gICAgICAgICAgdmFyIHBhcmVuID0gbWF0Y2guc2VjdGlvbnMuaW5kZXhPZihcIihcIik7XG4gICAgICAgICAgaWYgKGRhc2ggPiAwICYmIHBhcmVuID4gMCAmJiBwYXJlbiA8IGRhc2gpXG4gICAgICAgICAgICByYW5nZSA9IHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBpZiB0aGVyZSdzIGEgaHlwaGVuIGFuZCB0aGUgcmFuZ2UgaXMgYW1iaWd1b3VzLFxuICAgICAgICAvLyBhbHNvIHJldHVybiB0aGUgb3JpZ2luYWwgc2VjdGlvbiBzdHJpbmcgYXMgb25lXG4gICAgICAgIGlmICgoc2VjdGlvbnMubGVuZ3RoID4gMSkgJiYgIXJhbmdlKVxuICAgICAgICAgIHNlY3Rpb25zLnVuc2hpZnQobWF0Y2guc2VjdGlvbnMpO1xuXG4gICAgICAgIHJldHVybiBzZWN0aW9ucy5tYXAoZnVuY3Rpb24oc2VjdGlvbikge1xuICAgICAgICAgIC8vIHNlcGFyYXRlIHN1YnNlY3Rpb25zIGZvciBlYWNoIHNlY3Rpb24gYmVpbmcgY29uc2lkZXJlZFxuICAgICAgICAgIHZhciBzcGxpdCA9IHVuZGVyc2NvcmUuY29tcGFjdChzZWN0aW9uLnNwbGl0KC9bXFwoXFwpXSsvKSk7XG4gICAgICAgICAgc2VjdGlvbiA9IHNwbGl0WzBdO1xuICAgICAgICAgIHN1YnNlY3Rpb25zID0gc3BsaXQuc3BsaWNlKDEpO1xuICAgICAgICAgIGlmIChtYXRjaC5ub3RlKVxuICAgICAgICAgICAgc3Vic2VjdGlvbnMucHVzaChtYXRjaC5ub3RlLnJlcGxhY2UoXCIgXCIsIFwiLVwiKSk7IC8vIFwibm90ZVwiIG9yIFwiZXQgc2VxXCJcblxuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0aXRsZTogdGl0bGUsXG4gICAgICAgICAgICBzZWN0aW9uOiBzZWN0aW9uLFxuICAgICAgICAgICAgc3Vic2VjdGlvbnM6IHN1YnNlY3Rpb25zXG4gICAgICAgICAgfTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSxcblxuICAgIC8vIFwic2VjdGlvbiA1NTIgb2YgdGl0bGUgNVwiXG4gICAgLy8gXCJzZWN0aW9uIDU1MiwgdGl0bGUgNVwiXG4gICAgLy8gXCJzZWN0aW9uIDU1MihhKSgxKShFKSBvZiB0aXRsZSA1XCJcbiAgICAvLyBcInNlY3Rpb24gNDA0by0xKGEpIG9mIHRpdGxlIDUwXCJcbiAgICB7XG4gICAgICByZWdleDpcbiAgICAgICAgXCJzZWN0aW9uIChcXFxcZCtbXFxcXHdcXFxcZFxcLV0qKSgoPzpcXFxcKFteXFxcXCldK1xcXFwpKSopXCIgK1xuICAgICAgICBcIig/OlxcXFxzK29mfFxcXFwsKSB0aXRsZSAoXFxcXGQrKVwiLFxuXG4gICAgICBmaWVsZHM6IFsnc2VjdGlvbicsICdzdWJzZWN0aW9ucycsICd0aXRsZSddLFxuXG4gICAgICBwcm9jZXNzb3I6IGZ1bmN0aW9uKG1hdGNoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgdGl0bGU6IG1hdGNoLnRpdGxlLFxuICAgICAgICAgIHNlY3Rpb246IG1hdGNoLnNlY3Rpb24sXG4gICAgICAgICAgc3Vic2VjdGlvbnM6IHVuZGVyc2NvcmUuY29tcGFjdChtYXRjaC5zdWJzZWN0aW9ucy5zcGxpdCgvW1xcKFxcKV0rLykpXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfVxuICBdXG59KTtcbiIsIihmdW5jdGlvbihkZWYpIHtcbiAgICBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcpIG1vZHVsZS5leHBvcnRzID0gZGVmO1xuICAgIGlmICh0eXBlb2YgQ2l0YXRpb24gIT09ICd1bmRlZmluZWQnICYmIENpdGF0aW9uLnR5cGVzKSBDaXRhdGlvbi50eXBlcy52YV9jb2RlID0gZGVmO1xufSkoe1xuICB0eXBlOiBcInJlZ2V4XCIsXG5cbiAgc3RhbmRhcmRpemU6IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICByZXR1cm4ge1xuICAgICAgaWQ6IFtcInZhLWNvZGVcIiwgZGF0YS50aXRsZSwgZGF0YS5zZWN0aW9uXS5qb2luKFwiL1wiKVxuICAgIH07XG4gIH0sXG5cbiAgcGF0dGVybnM6IFtcblxuICAgIC8vIFZhLiBDb2RlIEFubi4gwqcgMTkuMi01Ni4yICgyMDEwKVxuICAgIC8vIFZhLiBDb2RlIEFubi4gwqcgMTkuMi01Ni4yIChXZXN0IDIwMTApXG4gICAgLy8gVmEuIENvZGUgQW5uLiDCpyA1Ny0xXG4gICAgLy8gVmEuIENvZGUgQW5uLiDCpyA1Ny0yLjAyXG4gICAgLy8gVmEuIENvZGUgQW5uLiDCpyA2My4yLTMwMFxuICAgIC8vIFZhLiBDb2RlIEFubi4gwqcgNjYtMjUuMToxXG4gICAgLy8gVmEuIENvZGUgwqcgNjYtMjUuMToxXG4gICAgLy8gVkEgQ29kZSDCpyA2Ni0yNS4xOjFcbiAgICB7XG4gICAgICByZWdleDpcbiAgICAgICAgXCJWYVxcXFwuPyBDb2RlXFxcXC4/XCIgK1xuICAgICAgICBcIig/OlxcXFxzK0FublxcXFwuPyk/XCIgK1xuICAgICAgICBcIig/OlxcXFxzK8KnKyk/XCIgK1xuICAgICAgICBcIlxcXFxzKyhbXFxcXGRcXFxcLl0rKVxcXFwtKFtcXFxcZFxcXFwuOl0rKVwiICtcbiAgICAgICAgXCIoPzpcXFxccytcXFxcKCg/Oldlc3QgKT8oWzEyXVxcXFxkezN9KVxcXFwpKT9cIixcbiAgICAgIGZpZWxkczogWyd0aXRsZScsICdzZWN0aW9uJywgJ3llYXInXSxcbiAgICAgIHByb2Nlc3NvcjogZnVuY3Rpb24gKGNhcHR1cmVzKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgdGl0bGU6IGNhcHR1cmVzLnRpdGxlLFxuICAgICAgICAgIHNlY3Rpb246IGNhcHR1cmVzLnNlY3Rpb24sXG4gICAgICAgICAgeWVhcjogY2FwdHVyZXMueWVhclxuICAgICAgICB9O1xuICAgICAgfVxuICAgIH1cbiAgXVxufSk7XG4iLCIvKiBDaXRhdGlvbi5qcyAtIGEgbGVnYWwgY2l0YXRpb24gZXh0cmFjdG9yLlxuICpcbiAqIE9wZW4gc291cmNlLCBkZWRpY2F0ZWQgdG8gdGhlIHB1YmxpYyBkb21haW46IGh0dHBzOi8vZ2l0aHViLmNvbS91bml0ZWRzdGF0ZXMvY2l0YXRpb25cbiAqXG4gKiBPcmlnaW5hbGx5IGF1dGhvcmVkIGJ5IEVyaWMgTWlsbCAoQGtvbmtsb25lKSwgYXQgdGhlIFN1bmxpZ2h0IEZvdW5kYXRpb24sXG4gKiBtYW55IGNvbnRyaWJ1dGlvbnMgYnkgaHR0cHM6Ly9naXRodWIuY29tL3VuaXRlZHN0YXRlcy9jaXRhdGlvbi9ncmFwaHMvY29udHJpYnV0b3JzXG4gKi9cblxuXG4vKlxuIFRPRE86XG4gKiBtb3ZlIHVuZGVyc2NvcmUgb3V0IG9mIHRoZSBuYW1lc3BhY2UsIHNlZSAjNTZcbiAqIHJld29yayBob3cgY2l0YXRvcnMgbG9hZCBDaXRhdGlvbiwgaXQncyBoZWZ0eVxuKi9cblxuaWYgKHR5cGVvZihyZXF1aXJlKSAhPT0gXCJ1bmRlZmluZWRcIikge1xuICB1bmRlcnNjb3JlID0gcmVxdWlyZShcInVuZGVyc2NvcmVcIik7XG59XG5cblxuKGZ1bmN0aW9uKENpdGF0aW9uKSB7XG5DaXRhdGlvbiA9IHtcblxuICAvLyB3aWxsIGJlIGZpbGxlZCBpbiBieSBpbmRpdmlkdWFsIGNpdGF0aW9uIHR5cGVzIGFzIGF2YWlsYWJsZVxuICB0eXBlczoge30sXG5cbiAgLy8gZmlsdGVycyB0aGF0IGNhbiBwcmUtcHJvY2VzcyB0ZXh0IGFuZCBwb3N0LXByb2Nlc3MgY2l0YXRpb25zXG4gIGZpbHRlcnM6IHt9LFxuXG4gIC8vIFRPRE86IGRvY3VtZW50IHRoaXMgaW5saW5lXG4gIC8vIGNoZWNrIGEgYmxvY2sgb2YgdGV4dCBmb3IgY2l0YXRpb25zIG9mIGEgZ2l2ZW4gdHlwZSAtXG4gIC8vIHJldHVybiBhbiBhcnJheSBvZiBtYXRjaGVzLCB3aXRoIGNpdGF0aW9uIGJyb2tlbiBvdXQgaW50byBmaWVsZHNcbiAgZmluZDogZnVuY3Rpb24odGV4dCwgb3B0aW9ucykge1xuICAgIGlmICghb3B0aW9ucykgb3B0aW9ucyA9IHt9O1xuXG4gICAgLy8gY2xpZW50IGNhbiBhcHBseSBhIGZpbHRlciB0aGF0IHByZS1wcm9jZXNzZXMgdGV4dCBiZWZvcmUgZXh0cmFjdGlvbixcbiAgICAvLyBhbmQgcG9zdC1wcm9jZXNzZXMgY2l0YXRpb25zIGFmdGVyIGV4dHJhY3Rpb25cbiAgICB2YXIgcmVzdWx0cztcbiAgICBpZiAob3B0aW9ucy5maWx0ZXIgJiYgQ2l0YXRpb24uZmlsdGVyc1tvcHRpb25zLmZpbHRlcl0pXG4gICAgICByZXN1bHRzID0gQ2l0YXRpb24uZmlsdGVyZWQob3B0aW9ucy5maWx0ZXIsIHRleHQsIG9wdGlvbnMpO1xuXG4gICAgLy8gb3RoZXJ3aXNlLCBkbyBhIHNpbmdsZSBwYXNzIG92ZXIgdGhlIHdob2xlIHRleHQuXG4gICAgZWxzZVxuICAgICAgcmVzdWx0cyA9IENpdGF0aW9uLmV4dHJhY3QodGV4dCwgb3B0aW9ucyk7XG5cbiAgICByZXR1cm4gcmVzdWx0cztcbiAgfSxcblxuICAvLyByZXR1cm4gYW4gYXJyYXkgb2YgbWF0Y2hlZCBhbmQgZmlsdGVyLW1hcHBlZCBjaXRlc1xuICBmaWx0ZXJlZDogZnVuY3Rpb24obmFtZSwgdGV4dCwgb3B0aW9ucykge1xuICAgIHZhciByZXN1bHRzID0gW107XG5cbiAgICB2YXIgZmlsdGVyID0gQ2l0YXRpb24uZmlsdGVyc1tuYW1lXTtcblxuICAgIC8vIGZpbHRlciBjYW4gYnJlYWsgdXAgdGhlIHRleHQgaW50byBwaWVjZXMgd2l0aCBhY2NvbXBhbnlpbmcgbWV0YWRhdGFcbiAgICBmaWx0ZXIuZnJvbSh0ZXh0LCBvcHRpb25zW25hbWVdLCBmdW5jdGlvbihwaWVjZSwgbWV0YWRhdGEpIHtcbiAgICAgIHZhciByZXNwb25zZSA9IENpdGF0aW9uLmV4dHJhY3QocGllY2UsIG9wdGlvbnMpO1xuICAgICAgdmFyIGZpbHRlcmVkID0gcmVzcG9uc2UuY2l0YXRpb25zLm1hcChmdW5jdGlvbihyZXN1bHQpIHtcblxuICAgICAgICBPYmplY3Qua2V5cyhtZXRhZGF0YSkuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgICByZXN1bHRba2V5XSA9IG1ldGFkYXRhW2tleV07XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICB9KTtcblxuICAgICAgcmVzdWx0cyA9IHJlc3VsdHMuY29uY2F0KGZpbHRlcmVkKTtcbiAgICB9KTtcblxuICAgIHJldHVybiB7Y2l0YXRpb25zOiByZXN1bHRzfTtcbiAgfSxcblxuXG4gIC8vIHJ1biB0aGUgY2l0YXRvcnMgb3ZlciB0aGUgdGV4dCwgcmV0dXJuIGFuIGFycmF5IG9mIG1hdGNoZWQgY2l0ZXNcbiAgZXh0cmFjdDogZnVuY3Rpb24odGV4dCwgb3B0aW9ucykge1xuICAgIGlmICghb3B0aW9ucykgb3B0aW9ucyA9IHt9O1xuXG4gICAgLy8gZGVmYXVsdDogbm8gZXhjZXJwdFxuICAgIHZhciBleGNlcnB0ID0gb3B0aW9ucy5leGNlcnB0ID8gcGFyc2VJbnQob3B0aW9ucy5leGNlcnB0LCAxMCkgOiAwO1xuXG4gICAgLy8gd2hldGhlciB0byByZXR1cm4gcGFyZW50IGNpdGF0aW9uc1xuICAgIC8vIGRlZmF1bHQ6IGZhbHNlXG4gICAgdmFyIHBhcmVudHMgPSBvcHRpb25zLnBhcmVudHMgfHwgZmFsc2U7XG5cbiAgICAvLyBkZWZhdWx0OiBhbGwgdHlwZXMsIGNhbiBiZSBmaWx0ZXJlZCB0byBvbmUsIG9yIGFuIGFycmF5IG9mIHRoZW1cbiAgICB2YXIgdHlwZXMgPSBDaXRhdGlvbi5zZWxlY3RlZFR5cGVzKG9wdGlvbnMpO1xuICAgIGlmICh0eXBlcy5sZW5ndGggPT09IDApIHJldHVybiBudWxsO1xuXG5cbiAgICAvLyBjYWxsZXIgY2FuIHByb3ZpZGUgb3B0aW9uYWwgY29udGV4dCB0aGF0IGNhbiBjaGFuZ2Ugd2hhdCBwYXR0ZXJucyBpbmRpdmlkdWFsIGNpdGF0b3JzIGFwcGx5XG4gICAgdmFyIGNvbnRleHQgPSBvcHRpb25zLmNvbnRleHQgfHwge307XG5cblxuICAgIC8vIFRoZSBjYWxsZXIgY2FuIHByb3ZpZGUgYSByZXBsYWNlIGNhbGxiYWNrIHRvIGFsdGVyIGV2ZXJ5IGZvdW5kIGNpdGF0aW9uLlxuICAgIC8vIHRoaXMgZnVuY3Rpb24gd2lsbCBiZSBjYWxsZWQgd2l0aCBlYWNoIChmb3VuZCBhbmQgcHJvY2Vzc2VkKSBjaXRlIG9iamVjdCxcbiAgICAvLyBhbmQgc2hvdWxkIHJldHVybiBhIHN0cmluZyB0byBiZSBwdXQgaW4gdGhlIGNpdGUncyBwbGFjZS5cbiAgICAvL1xuICAgIC8vIFRoZSByZXN1bHRpbmcgdHJhbnNmb3JtZWQgc3RyaW5nIHdpbGwgYmUgaW4gdGhlIHJldHVybmVkIG9iamVjdCBhcyBhICd0ZXh0JyBmaWVsZC5cbiAgICAvLyB0aGlzIGZpZWxkIHdpbGwgb25seSBiZSBwcmVzZW50IGlmIGEgcmVwbGFjZSBjYWxsYmFjayB3YXMgcHJvdmlkZWQuXG4gICAgLy9cbiAgICAvLyBwcm92aWRpbmcgdGhpcyBjYWxsYmFjayB3aWxsIGFsc28gY2F1c2UgbWF0Y2hlZCBjaXRlcyBub3QgdG8gcmV0dXJuIHRoZSAnaW5kZXgnIGZpZWxkLFxuICAgIC8vIGFzIHRoZSByZXBsYWNlIHByb2Nlc3Mgd2lsbCBjb21wbGV0ZWx5IHNjcmV3IHRoZW0gdXAuIG9ubHkgdXNlIHRoZSAnaW5kZXgnIGZpZWxkIGlmIHlvdVxuICAgIC8vIHBsYW4gb24gZG9pbmcgeW91ciBvd24gcmVwbGFjaW5nLlxuICAgIHZhciByZXBsYWNlID0gb3B0aW9ucy5yZXBsYWNlO1xuXG4gICAgLy8gYWNjdW11bGF0ZSB0aGUgcmVzdWx0c1xuICAgIHZhciByZXN1bHRzID0gW107XG5cblxuICAgIC8vLy8vLy8vLy8vLy8gcHJlcGFyZSBjaXRhdGlvbiBwYXR0ZXJucyAvLy8vLy8vLy8vLy8vXG5cbiAgICAvLyB3aWxsIGhvbGQgdGhlIGNhbGN1bGF0ZWQgY29udGV4dC1zcGVjaWZpYyBwYXR0ZXJucyB3ZSBhcmUgdG8gcnVuXG4gICAgLy8gb3ZlciB0aGUgZ2l2ZW4gdGV4dCwgdHJhY2tlZCBieSBpbmRleCB3ZSBleHBlY3QgdG8gZmluZCB0aGVtIGF0LlxuICAgIC8vIG5leHRJbmRleCB0cmFja3MgYSBydW5uaW5nIGluZGV4IGFzIHdlIGxvb3AgdGhyb3VnaCBwYXR0ZXJucy5cbiAgICAvLyAoY2l0YXRvcnMgY291bGQganVzdCBiZSBjYWxsZWQgaW5kZXhlZFBhdHRlcm5zKVxuICAgIHZhciBjaXRhdG9ycyA9IHt9O1xuICAgIHZhciBuZXh0SW5kZXggPSAwO1xuXG4gICAgLy8gR28gdGhyb3VnaCBldmVyeSByZWdleC1iYXNlZCBjaXRhdG9yIGFuZCBwcmVwYXJlIGEgc2V0IG9mIHBhdHRlcm5zLFxuICAgIC8vIGluZGV4ZWQgYnkgdGhlIG9yZGVyIG9mIGEgbWF0Y2hlZCBhcmd1bWVudHMgYXJyYXkuXG4gICAgdHlwZXMuZm9yRWFjaChmdW5jdGlvbih0eXBlKSB7XG4gICAgICBpZiAoQ2l0YXRpb24udHlwZXNbdHlwZV0udHlwZSAhPSBcInJlZ2V4XCIpIHJldHVybjtcblxuICAgICAgLy8gQ2FsY3VsYXRlIHRoZSBwYXR0ZXJucyB0aGlzIGNpdGF0b3Igd2lsbCBjb250cmlidXRlIHRvIHRoZSBwYXJzZS5cbiAgICAgIC8vIChpbmRpdmlkdWFsIHBhcnNlcnMgY2FuIG9wdCB0byBtYWtlIHRoZWlyIHBhcnNpbmcgY29udGV4dC1zcGVjaWZpYylcbiAgICAgIHZhciBwYXR0ZXJucyA9IENpdGF0aW9uLnR5cGVzW3R5cGVdLnBhdHRlcm5zO1xuICAgICAgaWYgKHR5cGVvZihwYXR0ZXJucykgPT0gXCJmdW5jdGlvblwiKVxuICAgICAgICBwYXR0ZXJucyA9IHBhdHRlcm5zKGNvbnRleHRbdHlwZV0gfHwge30pO1xuXG4gICAgICAvLyBhZGQgZWFjaCBwYXR0ZXJuLCBrZWVwaW5nIGEgcnVubmluZyB0YWxseSBvZiB3aGF0IHdlIHdvdWxkXG4gICAgICAvLyBleHBlY3QgaXRzIHByaW1hcnkgaW5kZXggdG8gYmUgd2hlbiBmb3VuZCBpbiB0aGUgbWFzdGVyIHJlZ2V4LlxuICAgICAgcGF0dGVybnMuZm9yRWFjaChmdW5jdGlvbihwYXR0ZXJuKSB7XG4gICAgICAgIHBhdHRlcm4udHlwZSA9IHR5cGU7IC8vIHdpbGwgYmUgbmVlZGVkIGxhdGVyXG4gICAgICAgIGNpdGF0b3JzW25leHRJbmRleF0gPSBwYXR0ZXJuO1xuICAgICAgICBuZXh0SW5kZXggKz0gcGF0dGVybi5maWVsZHMubGVuZ3RoICsgMTtcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgLy8gSWYgdGhlcmUgYXJlIGFueSByZWdleC1iYXNlZCBwYXR0ZXJucyBiZWluZyBhcHBsaWVkLCBjb21iaW5lIHRoZW1cbiAgICAvLyBhbmQgcnVuIGEgZmluZC9yZXBsYWNlIG92ZXIgdGhlIHN0cmluZy5cbiAgICB2YXIgcmVnZXhlcyA9IHVuZGVyc2NvcmUudmFsdWVzKGNpdGF0b3JzKS5tYXAoZnVuY3Rpb24ocGF0dGVybikge3JldHVybiBwYXR0ZXJuLnJlZ2V4fSk7XG4gICAgaWYgKHJlZ2V4ZXMubGVuZ3RoID4gMCkge1xuXG4gICAgICAvLyBtZXJnZSBhbGwgcmVnZXhlcyBpbnRvIG9uZSwgc28gdGhhdCBlYWNoIHBhdHRlcm4gd2lsbCBiZWdpbiBhdCBhIHByZWRpY3RhYmxlIHBsYWNlXG4gICAgICB2YXIgcmVnZXggPSBuZXcgUmVnRXhwKFwiKFwiICsgcmVnZXhlcy5qb2luKFwiKXwoXCIpICsgXCIpXCIsIFwiaWdcIik7XG5cbiAgICAgIHZhciByZXBsYWNlZCA9IHRleHQucmVwbGFjZShyZWdleCwgZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBtYXRjaCA9IGFyZ3VtZW50c1swXTtcblxuICAgICAgICAvLyBvZmZzZXQgaXMgc2Vjb25kLXRvLWxhc3QgYXJndW1lbnRcbiAgICAgICAgdmFyIGluZGV4ID0gYXJndW1lbnRzW2FyZ3VtZW50cy5sZW5ndGggLSAyXTtcblxuICAgICAgICAvLyBwdWxsIG91dCBqdXN0IHRoZSByZWdleC1jYXB0dXJlZCBtYXRjaGVzXG4gICAgICAgIHZhciBjYXB0dXJlcyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSwgLTIpO1xuXG4gICAgICAgIC8vIGZpbmQgdGhlIGZpcnN0IG1hdGNoZWQgaW5kZXggaW4gdGhlIGNhcHR1cmVzXG4gICAgICAgIHZhciBtYXRjaEluZGV4O1xuICAgICAgICBmb3IgKG1hdGNoSW5kZXg9MDsgbWF0Y2hJbmRleDxjYXB0dXJlcy5sZW5ndGg7IG1hdGNoSW5kZXgrKylcbiAgICAgICAgICBpZiAoY2FwdHVyZXNbbWF0Y2hJbmRleF0pIGJyZWFrO1xuXG4gICAgICAgIC8vIGxvb2sgdXAgdGhlIGNpdGF0b3IgYnkgdGhlIGluZGV4IHdlIGV4cGVjdGVkIGl0IGF0XG4gICAgICAgIHZhciBjaXRhdG9yID0gY2l0YXRvcnNbbWF0Y2hJbmRleF07XG4gICAgICAgIGlmICghY2l0YXRvcikgcmV0dXJuIG51bGw7IC8vIHdoYXQ/XG4gICAgICAgIHZhciB0eXBlID0gY2l0YXRvci50eXBlO1xuXG4gICAgICAgIC8vIHByb2Nlc3MgdGhlIG1hdGNoZWQgZGF0YSBpbnRvIHRoZSBmaW5hbCBvYmplY3RcbiAgICAgICAgdmFyIG91ckNhcHR1cmVzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoY2FwdHVyZXMsIG1hdGNoSW5kZXggKyAxKTtcbiAgICAgICAgdmFyIG5hbWVkTWF0Y2ggPSBDaXRhdGlvbi5tYXRjaEZvcihvdXJDYXB0dXJlcywgY2l0YXRvcik7XG4gICAgICAgIHZhciBjaXRlcyA9IGNpdGF0b3IucHJvY2Vzc29yKG5hbWVkTWF0Y2gpO1xuXG4gICAgICAgIC8vIG9uZSBtYXRjaCBjYW4gZ2VuZXJhdGUgb25lIG9yIG1hbnkgY2l0YXRpb24gcmVzdWx0cyAoZS5nLiByYW5nZXMpXG4gICAgICAgIGlmICghdW5kZXJzY29yZS5pc0FycmF5KGNpdGVzKSkgY2l0ZXMgPSBbY2l0ZXNdO1xuXG4gICAgICAgIC8vIHB1dCB0b2dldGhlciB0aGUgbWF0Y2gtbGV2ZWwgaW5mb3JtYXRpb25cbiAgICAgICAgdmFyIG1hdGNoSW5mbyA9IHt0eXBlOiBjaXRhdG9yLnR5cGV9O1xuICAgICAgICBtYXRjaEluZm8ubWF0Y2ggPSBtYXRjaC50b1N0cmluZygpOyAvLyBtYXRjaCBkYXRhIGNhbiBiZSBjb252ZXJ0ZWQgdG8gdGhlIHBsYWluIHN0cmluZ1xuXG4gICAgICAgIC8vIHN0b3JlIHRoZSBtYXRjaGVkIGNoYXJhY3RlciBvZmZzZXQsIGV4Y2VwdCBpZiB3ZSdyZSByZXBsYWNpbmdcbiAgICAgICAgaWYgKCFyZXBsYWNlKVxuICAgICAgICAgIG1hdGNoSW5mby5pbmRleCA9IGluZGV4O1xuXG5cbiAgICAgICAgLy8gdXNlIGluZGV4IHRvIGdyYWIgc3Vycm91bmRpbmcgZXhjZXJwdFxuICAgICAgICBpZiAoZXhjZXJwdCA+IDApIHtcbiAgICAgICAgICB2YXIgcHJvcG9zZWRMZWZ0ID0gaW5kZXggLSBleGNlcnB0O1xuICAgICAgICAgIHZhciBsZWZ0ID0gcHJvcG9zZWRMZWZ0ID4gMCA/IHByb3Bvc2VkTGVmdCA6IDA7XG5cbiAgICAgICAgICB2YXIgcHJvcG9zZWRSaWdodCA9IGluZGV4ICsgbWF0Y2hJbmZvLm1hdGNoLmxlbmd0aCArIGV4Y2VycHQ7XG4gICAgICAgICAgdmFyIHJpZ2h0ID0gKHByb3Bvc2VkUmlnaHQgPD0gdGV4dC5sZW5ndGgpID8gcHJvcG9zZWRSaWdodCA6IHRleHQubGVuZ3RoO1xuXG4gICAgICAgICAgbWF0Y2hJbmZvLmV4Y2VycHQgPSB0ZXh0LnN1YnN0cmluZyhsZWZ0LCByaWdodCk7XG4gICAgICAgIH1cblxuXG4gICAgICAgIC8vIGlmIHdlIHdhbnQgcGFyZW50IGNpdGVzIHRvbywgbWFrZSB0aG9zZSBub3dcbiAgICAgICAgaWYgKHBhcmVudHMgJiYgQ2l0YXRpb24udHlwZXNbdHlwZV0ucGFyZW50c19ieSkge1xuICAgICAgICAgIGNpdGVzID0gdW5kZXJzY29yZS5mbGF0dGVuKGNpdGVzLm1hcChmdW5jdGlvbihjaXRlKSB7XG4gICAgICAgICAgICByZXR1cm4gQ2l0YXRpb24uY2l0ZVBhcmVudHMoY2l0ZSwgdHlwZSk7XG4gICAgICAgICAgfSkpO1xuICAgICAgICB9XG5cbiAgICAgICAgY2l0ZXMgPSBjaXRlcy5tYXAoZnVuY3Rpb24oY2l0ZSkge1xuICAgICAgICAgIHZhciByZXN1bHQgPSB7fTtcblxuICAgICAgICAgIC8vIG1hdGNoLWxldmVsIGluZm9cbiAgICAgICAgICBDaXRhdGlvbi51LmV4dGVuZChyZXN1bHQsIG1hdGNoSW5mbyk7XG5cbiAgICAgICAgICAvLyBjaXRlLWxldmVsIGluZm8sIHBsdXMgSUQgc3RhbmRhcmRpemF0aW9uXG4gICAgICAgICAgcmVzdWx0W3R5cGVdID0gY2l0ZTtcbiAgICAgICAgICBDaXRhdGlvbi51LmV4dGVuZChyZXN1bHRbdHlwZV0sIENpdGF0aW9uLnR5cGVzW3R5cGVdLnN0YW5kYXJkaXplKHJlc3VsdFt0eXBlXSkpO1xuXG4gICAgICAgICAgcmVzdWx0cy5wdXNoKHJlc3VsdCk7XG5cbiAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJIGRvbid0IGtub3cgd2hhdCB0byBkbyBhYm91dCByYW5nZXMgeWV0IC0gYnV0IGZvciBub3csIHNjcmV3IGl0XG4gICAgICAgIHZhciByZXBsYWNlZENpdGU7XG4gICAgICAgIGlmICh0eXBlb2YocmVwbGFjZSkgPT09IFwiZnVuY3Rpb25cIilcbiAgICAgICAgICByZXBsYWNlZENpdGUgPSByZXBsYWNlKGNpdGVzWzBdKTtcbiAgICAgICAgZWxzZSBpZiAoKHR5cGVvZihyZXBsYWNlKSA9PT0gXCJvYmplY3RcIikgJiYgKHR5cGVvZihyZXBsYWNlW3R5cGVdKSA9PT0gXCJmdW5jdGlvblwiKSlcbiAgICAgICAgICByZXBsYWNlZENpdGUgPSByZXBsYWNlW3R5cGVdKGNpdGVzWzBdKTtcblxuICAgICAgICBpZiAocmVwbGFjZWRDaXRlKVxuICAgICAgICAgIHJldHVybiByZXBsYWNlZENpdGU7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICByZXR1cm4gbWF0Y2hJbmZvLm1hdGNoO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gVE9ETzogZG8gZm9yIGFueSBleHRlcm5hbCBjaXRlIHR5cGVzLCBub3QganVzdCBcImp1ZGljaWFsXCJcbiAgICBpZiAodHlwZXMuaW5kZXhPZihcImp1ZGljaWFsXCIpICE9IC0xKVxuICAgICAgcmVzdWx0cyA9IHJlc3VsdHMuY29uY2F0KENpdGF0aW9uLnR5cGVzLmp1ZGljaWFsLmV4dHJhY3QodGV4dCkpO1xuXG4gICAgdmFyIHJlc3BvbnNlID0ge2NpdGF0aW9uczogdW5kZXJzY29yZS5jb21wYWN0KHJlc3VsdHMpfTtcbiAgICBpZiAob3B0aW9ucy5yZXBsYWNlKSByZXNwb25zZS50ZXh0ID0gcmVwbGFjZWQ7XG5cbiAgICByZXR1cm4gcmVzcG9uc2U7XG4gIH0sXG5cblxuICAvLyBmb3IgYSBnaXZlbiBzZXQgb2YgY2l0ZS1zcGVjaWZpYyBkZXRhaWxzLFxuICAvLyByZXR1cm4gaXRzZWxmIGFuZCBpdHMgcGFyZW50IGNpdGF0aW9uc1xuICBjaXRlUGFyZW50czogZnVuY3Rpb24oY2l0YXRpb24sIHR5cGUpIHtcbiAgICB2YXIgZmllbGQgPSBDaXRhdGlvbi50eXBlc1t0eXBlXS5wYXJlbnRzX2J5O1xuICAgIHZhciByZXN1bHRzID0gW107XG5cbiAgICBmb3IgKHZhciBpPWNpdGF0aW9uW2ZpZWxkXS5sZW5ndGg7IGkgPj0gMDsgaS0tKSB7XG4gICAgICB2YXIgcGFyZW50ID0gdW5kZXJzY29yZS5jbG9uZShjaXRhdGlvbik7XG4gICAgICBwYXJlbnRbZmllbGRdID0gcGFyZW50W2ZpZWxkXS5zbGljZSgwLCBpKTtcbiAgICAgIHJlc3VsdHMucHVzaChwYXJlbnQpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0cztcbiAgfSxcblxuICAvLyBnaXZlbiBhbiBhcnJheSBvZiBjYXB0dXJlcyAqYmVnaW5uaW5nKiB3aXRoIHZhbHVlcyB0aGUgcGF0dGVyblxuICAvLyBrbm93cyBob3cgdG8gcHJvY2VzcywgdHVybiBpdCBpbnRvIGFuIG9iamVjdCB3aXRoIHRob3NlIGtleXMuXG4gIG1hdGNoRm9yOiBmdW5jdGlvbihjYXB0dXJlcywgcGF0dGVybikge1xuICAgIHZhciBtYXRjaCA9IHt9O1xuICAgIGZvciAodmFyIGk9MDsgaTxjYXB0dXJlcy5sZW5ndGg7IGkrKylcbiAgICAgIG1hdGNoW3BhdHRlcm4uZmllbGRzW2ldXSA9IGNhcHR1cmVzW2ldO1xuICAgIHJldHVybiBtYXRjaDtcbiAgfSxcblxuICBzZWxlY3RlZFR5cGVzOiBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgdmFyIHR5cGVzO1xuICAgIGlmIChvcHRpb25zLnR5cGVzKSB7XG4gICAgICBpZiAodW5kZXJzY29yZS5pc0FycmF5KG9wdGlvbnMudHlwZXMpKSB7XG4gICAgICAgIGlmIChvcHRpb25zLnR5cGVzLmxlbmd0aCA+IDApXG4gICAgICAgICAgdHlwZXMgPSBvcHRpb25zLnR5cGVzO1xuICAgICAgfSBlbHNlXG4gICAgICAgIHR5cGVzID0gW29wdGlvbnMudHlwZXNdO1xuICAgIH1cblxuICAgIC8vIG9ubHkgYWxsb3cgdmFsaWQgdHlwZXNcbiAgICBpZiAodHlwZXMpXG4gICAgICB0eXBlcyA9IHVuZGVyc2NvcmUuaW50ZXJzZWN0aW9uKHR5cGVzLCBPYmplY3Qua2V5cyhDaXRhdGlvbi50eXBlcykpO1xuICAgIGVsc2VcbiAgICAgIHR5cGVzID0gT2JqZWN0LmtleXMoQ2l0YXRpb24udHlwZXMpO1xuXG4gICAgcmV0dXJuIHR5cGVzO1xuICB9LFxuXG4gIC8vIHNtYWxsIHJlcGxhY2VtZW50IGZvciBzZXZlcmFsIGZ1bmN0aW9ucyBwcmV2aW91c2x5IHNlcnZlZCBieVxuICAvLyB0aGUgYHVuZGVyc2NvcmVgIGxpYnJhcnkuXG4gIHU6IHtcbiAgICBleHRlbmQ6IGZ1bmN0aW9uKG9iaikge1xuICAgICAgQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKS5mb3JFYWNoKGZ1bmN0aW9uKHNvdXJjZSkge1xuICAgICAgICBpZiAoc291cmNlKSB7XG4gICAgICAgICAgZm9yICh2YXIgcHJvcCBpbiBzb3VyY2UpXG4gICAgICAgICAgICBvYmpbcHJvcF0gPSBzb3VyY2VbcHJvcF07XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIG9iajtcbiAgICB9LFxuXG4gICAgY29udGFpbnM6IGZ1bmN0aW9uKG9iaikge1xuICAgICAgcmV0dXJuIG9iai5pbmRleE9mKHRhcmdldCkgIT0gLTE7XG4gICAgfVxuICB9XG5cbn07XG5cblxuLy8gVE9ETzogbG9hZCBvbmx5IHRoZSBjaXRhdGlvbiB0eXBlcyBhc2tlZCBmb3JcbmlmICh0eXBlb2YocmVxdWlyZSkgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgQ2l0YXRpb24udHlwZXMudXNjID0gcmVxdWlyZShcIi4vY2l0YXRpb25zL3VzY1wiKTtcbiAgQ2l0YXRpb24udHlwZXMubGF3ID0gcmVxdWlyZShcIi4vY2l0YXRpb25zL2xhd1wiKTtcbiAgQ2l0YXRpb24udHlwZXMuY2ZyID0gcmVxdWlyZShcIi4vY2l0YXRpb25zL2NmclwiKTtcbiAgQ2l0YXRpb24udHlwZXMudmFfY29kZSA9IHJlcXVpcmUoXCIuL2NpdGF0aW9ucy92YV9jb2RlXCIpO1xuICBDaXRhdGlvbi50eXBlcy5kY19jb2RlID0gcmVxdWlyZShcIi4vY2l0YXRpb25zL2RjX2NvZGVcIik7XG4gIENpdGF0aW9uLnR5cGVzLmRjX3JlZ2lzdGVyID0gcmVxdWlyZShcIi4vY2l0YXRpb25zL2RjX3JlZ2lzdGVyXCIpO1xuICBDaXRhdGlvbi50eXBlcy5kY19sYXcgPSByZXF1aXJlKFwiLi9jaXRhdGlvbnMvZGNfbGF3XCIpO1xuICBDaXRhdGlvbi50eXBlcy5zdGF0ID0gcmVxdWlyZShcIi4vY2l0YXRpb25zL3N0YXRcIik7XG4gIENpdGF0aW9uLnR5cGVzLmp1ZGljaWFsID0gcmVxdWlyZShcIi4vY2l0YXRpb25zL2p1ZGljaWFsXCIpO1xuXG4gIENpdGF0aW9uLmZpbHRlcnMubGluZXMgPSByZXF1aXJlKFwiLi9maWx0ZXJzL2xpbmVzXCIpO1xufVxuXG5cbmlmICh0eXBlb2Yod2luZG93KSAhPT0gXCJ1bmRlZmluZWRcIilcbiAgd2luZG93LkNpdGF0aW9uID0gQ2l0YXRpb247XG5cbmlmICh0eXBlb2YobW9kdWxlKSAhPT0gXCJ1bmRlZmluZWRcIiAmJiBtb2R1bGUuZXhwb3J0cylcbiAgbW9kdWxlLmV4cG9ydHMgPSBDaXRhdGlvbjtcblxufSkoKTtcbiIsIihmdW5jdGlvbihkZWYpIHtcbiAgaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnKSBtb2R1bGUuZXhwb3J0cyA9IGRlZjtcbiAgaWYgKHR5cGVvZiBDaXRhdGlvbiAhPT0gJ3VuZGVmaW5lZCcgJiYgQ2l0YXRpb24uZmlsdGVycykgQ2l0YXRpb24uZmlsdGVycy5saW5lcyA9IGRlZjtcbn0pKHtcblxuICAvLyBBIGxpbmUtYnktbGluZSBmaWx0ZXIuXG4gIC8vXG4gIC8vIEJyZWFrcyB0aGUgdGV4dCB1cCBieSBsaW5lLCBhbmQgZmVlZHMgZWFjaCBsaW5lIGludG8gdGhlIGV4dHJhY3Rvci5cbiAgLy8gQXR0YWNoZXMgdGhlIGxpbmUgbnVtYmVyICgxLWluZGV4ZWQpIGFzIG1ldGFkYXRhIHRvIGVhY2ggY2l0ZSxcbiAgLy8gc28gdGhhdCBhbnkgY2hhcmFjdGVyIG9mZnNldHMgd2lsbCBiZSByZWxhdGl2ZSB0byB0aGF0IGxpbmUuXG4gIC8vXG4gIC8vIEFjY2VwdHMgb3B0aW9uczpcbiAgLy8gICBkZWxpbWl0ZXI6IG92ZXJyaWRlIHRoZSBkZWZhdWx0IGRlbGltaXRlclxuXG4gIGZyb206IGZ1bmN0aW9uKHRleHQsIG9wdGlvbnMsIGV4dHJhY3QpIHtcbiAgICB2YXIgZGVsaW1pdGVyID0gKG9wdGlvbnMgJiYgb3B0aW9ucy5kZWxpbWl0ZXIpIHx8IC9bXFxuXFxyXSsvO1xuICAgIHZhciBsaW5lcyA9IHRleHQuc3BsaXQobmV3IFJlZ0V4cChkZWxpbWl0ZXIpKTtcbiAgICBsaW5lcy5mb3JFYWNoKGZ1bmN0aW9uKGxpbmUsIGkpIHtcbiAgICAgIGV4dHJhY3QobGluZSwge2xpbmU6IChpKzEpfSk7XG4gICAgfSk7XG4gIH1cblxufSk7IiwiLy8gICAgIFVuZGVyc2NvcmUuanMgMS42LjBcbi8vICAgICBodHRwOi8vdW5kZXJzY29yZWpzLm9yZ1xuLy8gICAgIChjKSAyMDA5LTIwMTQgSmVyZW15IEFzaGtlbmFzLCBEb2N1bWVudENsb3VkIGFuZCBJbnZlc3RpZ2F0aXZlIFJlcG9ydGVycyAmIEVkaXRvcnNcbi8vICAgICBVbmRlcnNjb3JlIG1heSBiZSBmcmVlbHkgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIE1JVCBsaWNlbnNlLlxuXG4oZnVuY3Rpb24oKSB7XG5cbiAgLy8gQmFzZWxpbmUgc2V0dXBcbiAgLy8gLS0tLS0tLS0tLS0tLS1cblxuICAvLyBFc3RhYmxpc2ggdGhlIHJvb3Qgb2JqZWN0LCBgd2luZG93YCBpbiB0aGUgYnJvd3Nlciwgb3IgYGV4cG9ydHNgIG9uIHRoZSBzZXJ2ZXIuXG4gIHZhciByb290ID0gdGhpcztcblxuICAvLyBTYXZlIHRoZSBwcmV2aW91cyB2YWx1ZSBvZiB0aGUgYF9gIHZhcmlhYmxlLlxuICB2YXIgcHJldmlvdXNVbmRlcnNjb3JlID0gcm9vdC5fO1xuXG4gIC8vIEVzdGFibGlzaCB0aGUgb2JqZWN0IHRoYXQgZ2V0cyByZXR1cm5lZCB0byBicmVhayBvdXQgb2YgYSBsb29wIGl0ZXJhdGlvbi5cbiAgdmFyIGJyZWFrZXIgPSB7fTtcblxuICAvLyBTYXZlIGJ5dGVzIGluIHRoZSBtaW5pZmllZCAoYnV0IG5vdCBnemlwcGVkKSB2ZXJzaW9uOlxuICB2YXIgQXJyYXlQcm90byA9IEFycmF5LnByb3RvdHlwZSwgT2JqUHJvdG8gPSBPYmplY3QucHJvdG90eXBlLCBGdW5jUHJvdG8gPSBGdW5jdGlvbi5wcm90b3R5cGU7XG5cbiAgLy8gQ3JlYXRlIHF1aWNrIHJlZmVyZW5jZSB2YXJpYWJsZXMgZm9yIHNwZWVkIGFjY2VzcyB0byBjb3JlIHByb3RvdHlwZXMuXG4gIHZhclxuICAgIHB1c2ggICAgICAgICAgICAgPSBBcnJheVByb3RvLnB1c2gsXG4gICAgc2xpY2UgICAgICAgICAgICA9IEFycmF5UHJvdG8uc2xpY2UsXG4gICAgY29uY2F0ICAgICAgICAgICA9IEFycmF5UHJvdG8uY29uY2F0LFxuICAgIHRvU3RyaW5nICAgICAgICAgPSBPYmpQcm90by50b1N0cmluZyxcbiAgICBoYXNPd25Qcm9wZXJ0eSAgID0gT2JqUHJvdG8uaGFzT3duUHJvcGVydHk7XG5cbiAgLy8gQWxsICoqRUNNQVNjcmlwdCA1KiogbmF0aXZlIGZ1bmN0aW9uIGltcGxlbWVudGF0aW9ucyB0aGF0IHdlIGhvcGUgdG8gdXNlXG4gIC8vIGFyZSBkZWNsYXJlZCBoZXJlLlxuICB2YXJcbiAgICBuYXRpdmVGb3JFYWNoICAgICAgPSBBcnJheVByb3RvLmZvckVhY2gsXG4gICAgbmF0aXZlTWFwICAgICAgICAgID0gQXJyYXlQcm90by5tYXAsXG4gICAgbmF0aXZlUmVkdWNlICAgICAgID0gQXJyYXlQcm90by5yZWR1Y2UsXG4gICAgbmF0aXZlUmVkdWNlUmlnaHQgID0gQXJyYXlQcm90by5yZWR1Y2VSaWdodCxcbiAgICBuYXRpdmVGaWx0ZXIgICAgICAgPSBBcnJheVByb3RvLmZpbHRlcixcbiAgICBuYXRpdmVFdmVyeSAgICAgICAgPSBBcnJheVByb3RvLmV2ZXJ5LFxuICAgIG5hdGl2ZVNvbWUgICAgICAgICA9IEFycmF5UHJvdG8uc29tZSxcbiAgICBuYXRpdmVJbmRleE9mICAgICAgPSBBcnJheVByb3RvLmluZGV4T2YsXG4gICAgbmF0aXZlTGFzdEluZGV4T2YgID0gQXJyYXlQcm90by5sYXN0SW5kZXhPZixcbiAgICBuYXRpdmVJc0FycmF5ICAgICAgPSBBcnJheS5pc0FycmF5LFxuICAgIG5hdGl2ZUtleXMgICAgICAgICA9IE9iamVjdC5rZXlzLFxuICAgIG5hdGl2ZUJpbmQgICAgICAgICA9IEZ1bmNQcm90by5iaW5kO1xuXG4gIC8vIENyZWF0ZSBhIHNhZmUgcmVmZXJlbmNlIHRvIHRoZSBVbmRlcnNjb3JlIG9iamVjdCBmb3IgdXNlIGJlbG93LlxuICB2YXIgXyA9IGZ1bmN0aW9uKG9iaikge1xuICAgIGlmIChvYmogaW5zdGFuY2VvZiBfKSByZXR1cm4gb2JqO1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBfKSkgcmV0dXJuIG5ldyBfKG9iaik7XG4gICAgdGhpcy5fd3JhcHBlZCA9IG9iajtcbiAgfTtcblxuICAvLyBFeHBvcnQgdGhlIFVuZGVyc2NvcmUgb2JqZWN0IGZvciAqKk5vZGUuanMqKiwgd2l0aFxuICAvLyBiYWNrd2FyZHMtY29tcGF0aWJpbGl0eSBmb3IgdGhlIG9sZCBgcmVxdWlyZSgpYCBBUEkuIElmIHdlJ3JlIGluXG4gIC8vIHRoZSBicm93c2VyLCBhZGQgYF9gIGFzIGEgZ2xvYmFsIG9iamVjdCB2aWEgYSBzdHJpbmcgaWRlbnRpZmllcixcbiAgLy8gZm9yIENsb3N1cmUgQ29tcGlsZXIgXCJhZHZhbmNlZFwiIG1vZGUuXG4gIGlmICh0eXBlb2YgZXhwb3J0cyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICAgIGV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IF87XG4gICAgfVxuICAgIGV4cG9ydHMuXyA9IF87XG4gIH0gZWxzZSB7XG4gICAgcm9vdC5fID0gXztcbiAgfVxuXG4gIC8vIEN1cnJlbnQgdmVyc2lvbi5cbiAgXy5WRVJTSU9OID0gJzEuNi4wJztcblxuICAvLyBDb2xsZWN0aW9uIEZ1bmN0aW9uc1xuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIC8vIFRoZSBjb3JuZXJzdG9uZSwgYW4gYGVhY2hgIGltcGxlbWVudGF0aW9uLCBha2EgYGZvckVhY2hgLlxuICAvLyBIYW5kbGVzIG9iamVjdHMgd2l0aCB0aGUgYnVpbHQtaW4gYGZvckVhY2hgLCBhcnJheXMsIGFuZCByYXcgb2JqZWN0cy5cbiAgLy8gRGVsZWdhdGVzIHRvICoqRUNNQVNjcmlwdCA1KioncyBuYXRpdmUgYGZvckVhY2hgIGlmIGF2YWlsYWJsZS5cbiAgdmFyIGVhY2ggPSBfLmVhY2ggPSBfLmZvckVhY2ggPSBmdW5jdGlvbihvYmosIGl0ZXJhdG9yLCBjb250ZXh0KSB7XG4gICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm4gb2JqO1xuICAgIGlmIChuYXRpdmVGb3JFYWNoICYmIG9iai5mb3JFYWNoID09PSBuYXRpdmVGb3JFYWNoKSB7XG4gICAgICBvYmouZm9yRWFjaChpdGVyYXRvciwgY29udGV4dCk7XG4gICAgfSBlbHNlIGlmIChvYmoubGVuZ3RoID09PSArb2JqLmxlbmd0aCkge1xuICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbmd0aCA9IG9iai5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoaXRlcmF0b3IuY2FsbChjb250ZXh0LCBvYmpbaV0sIGksIG9iaikgPT09IGJyZWFrZXIpIHJldHVybjtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIGtleXMgPSBfLmtleXMob2JqKTtcbiAgICAgIGZvciAodmFyIGkgPSAwLCBsZW5ndGggPSBrZXlzLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmIChpdGVyYXRvci5jYWxsKGNvbnRleHQsIG9ialtrZXlzW2ldXSwga2V5c1tpXSwgb2JqKSA9PT0gYnJlYWtlcikgcmV0dXJuO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gb2JqO1xuICB9O1xuXG4gIC8vIFJldHVybiB0aGUgcmVzdWx0cyBvZiBhcHBseWluZyB0aGUgaXRlcmF0b3IgdG8gZWFjaCBlbGVtZW50LlxuICAvLyBEZWxlZ2F0ZXMgdG8gKipFQ01BU2NyaXB0IDUqKidzIG5hdGl2ZSBgbWFwYCBpZiBhdmFpbGFibGUuXG4gIF8ubWFwID0gXy5jb2xsZWN0ID0gZnVuY3Rpb24ob2JqLCBpdGVyYXRvciwgY29udGV4dCkge1xuICAgIHZhciByZXN1bHRzID0gW107XG4gICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm4gcmVzdWx0cztcbiAgICBpZiAobmF0aXZlTWFwICYmIG9iai5tYXAgPT09IG5hdGl2ZU1hcCkgcmV0dXJuIG9iai5tYXAoaXRlcmF0b3IsIGNvbnRleHQpO1xuICAgIGVhY2gob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGxpc3QpIHtcbiAgICAgIHJlc3VsdHMucHVzaChpdGVyYXRvci5jYWxsKGNvbnRleHQsIHZhbHVlLCBpbmRleCwgbGlzdCkpO1xuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHRzO1xuICB9O1xuXG4gIHZhciByZWR1Y2VFcnJvciA9ICdSZWR1Y2Ugb2YgZW1wdHkgYXJyYXkgd2l0aCBubyBpbml0aWFsIHZhbHVlJztcblxuICAvLyAqKlJlZHVjZSoqIGJ1aWxkcyB1cCBhIHNpbmdsZSByZXN1bHQgZnJvbSBhIGxpc3Qgb2YgdmFsdWVzLCBha2EgYGluamVjdGAsXG4gIC8vIG9yIGBmb2xkbGAuIERlbGVnYXRlcyB0byAqKkVDTUFTY3JpcHQgNSoqJ3MgbmF0aXZlIGByZWR1Y2VgIGlmIGF2YWlsYWJsZS5cbiAgXy5yZWR1Y2UgPSBfLmZvbGRsID0gXy5pbmplY3QgPSBmdW5jdGlvbihvYmosIGl0ZXJhdG9yLCBtZW1vLCBjb250ZXh0KSB7XG4gICAgdmFyIGluaXRpYWwgPSBhcmd1bWVudHMubGVuZ3RoID4gMjtcbiAgICBpZiAob2JqID09IG51bGwpIG9iaiA9IFtdO1xuICAgIGlmIChuYXRpdmVSZWR1Y2UgJiYgb2JqLnJlZHVjZSA9PT0gbmF0aXZlUmVkdWNlKSB7XG4gICAgICBpZiAoY29udGV4dCkgaXRlcmF0b3IgPSBfLmJpbmQoaXRlcmF0b3IsIGNvbnRleHQpO1xuICAgICAgcmV0dXJuIGluaXRpYWwgPyBvYmoucmVkdWNlKGl0ZXJhdG9yLCBtZW1vKSA6IG9iai5yZWR1Y2UoaXRlcmF0b3IpO1xuICAgIH1cbiAgICBlYWNoKG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBsaXN0KSB7XG4gICAgICBpZiAoIWluaXRpYWwpIHtcbiAgICAgICAgbWVtbyA9IHZhbHVlO1xuICAgICAgICBpbml0aWFsID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG1lbW8gPSBpdGVyYXRvci5jYWxsKGNvbnRleHQsIG1lbW8sIHZhbHVlLCBpbmRleCwgbGlzdCk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgaWYgKCFpbml0aWFsKSB0aHJvdyBuZXcgVHlwZUVycm9yKHJlZHVjZUVycm9yKTtcbiAgICByZXR1cm4gbWVtbztcbiAgfTtcblxuICAvLyBUaGUgcmlnaHQtYXNzb2NpYXRpdmUgdmVyc2lvbiBvZiByZWR1Y2UsIGFsc28ga25vd24gYXMgYGZvbGRyYC5cbiAgLy8gRGVsZWdhdGVzIHRvICoqRUNNQVNjcmlwdCA1KioncyBuYXRpdmUgYHJlZHVjZVJpZ2h0YCBpZiBhdmFpbGFibGUuXG4gIF8ucmVkdWNlUmlnaHQgPSBfLmZvbGRyID0gZnVuY3Rpb24ob2JqLCBpdGVyYXRvciwgbWVtbywgY29udGV4dCkge1xuICAgIHZhciBpbml0aWFsID0gYXJndW1lbnRzLmxlbmd0aCA+IDI7XG4gICAgaWYgKG9iaiA9PSBudWxsKSBvYmogPSBbXTtcbiAgICBpZiAobmF0aXZlUmVkdWNlUmlnaHQgJiYgb2JqLnJlZHVjZVJpZ2h0ID09PSBuYXRpdmVSZWR1Y2VSaWdodCkge1xuICAgICAgaWYgKGNvbnRleHQpIGl0ZXJhdG9yID0gXy5iaW5kKGl0ZXJhdG9yLCBjb250ZXh0KTtcbiAgICAgIHJldHVybiBpbml0aWFsID8gb2JqLnJlZHVjZVJpZ2h0KGl0ZXJhdG9yLCBtZW1vKSA6IG9iai5yZWR1Y2VSaWdodChpdGVyYXRvcik7XG4gICAgfVxuICAgIHZhciBsZW5ndGggPSBvYmoubGVuZ3RoO1xuICAgIGlmIChsZW5ndGggIT09ICtsZW5ndGgpIHtcbiAgICAgIHZhciBrZXlzID0gXy5rZXlzKG9iaik7XG4gICAgICBsZW5ndGggPSBrZXlzLmxlbmd0aDtcbiAgICB9XG4gICAgZWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgaW5kZXggPSBrZXlzID8ga2V5c1stLWxlbmd0aF0gOiAtLWxlbmd0aDtcbiAgICAgIGlmICghaW5pdGlhbCkge1xuICAgICAgICBtZW1vID0gb2JqW2luZGV4XTtcbiAgICAgICAgaW5pdGlhbCA9IHRydWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBtZW1vID0gaXRlcmF0b3IuY2FsbChjb250ZXh0LCBtZW1vLCBvYmpbaW5kZXhdLCBpbmRleCwgbGlzdCk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgaWYgKCFpbml0aWFsKSB0aHJvdyBuZXcgVHlwZUVycm9yKHJlZHVjZUVycm9yKTtcbiAgICByZXR1cm4gbWVtbztcbiAgfTtcblxuICAvLyBSZXR1cm4gdGhlIGZpcnN0IHZhbHVlIHdoaWNoIHBhc3NlcyBhIHRydXRoIHRlc3QuIEFsaWFzZWQgYXMgYGRldGVjdGAuXG4gIF8uZmluZCA9IF8uZGV0ZWN0ID0gZnVuY3Rpb24ob2JqLCBwcmVkaWNhdGUsIGNvbnRleHQpIHtcbiAgICB2YXIgcmVzdWx0O1xuICAgIGFueShvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgaWYgKHByZWRpY2F0ZS5jYWxsKGNvbnRleHQsIHZhbHVlLCBpbmRleCwgbGlzdCkpIHtcbiAgICAgICAgcmVzdWx0ID0gdmFsdWU7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG5cbiAgLy8gUmV0dXJuIGFsbCB0aGUgZWxlbWVudHMgdGhhdCBwYXNzIGEgdHJ1dGggdGVzdC5cbiAgLy8gRGVsZWdhdGVzIHRvICoqRUNNQVNjcmlwdCA1KioncyBuYXRpdmUgYGZpbHRlcmAgaWYgYXZhaWxhYmxlLlxuICAvLyBBbGlhc2VkIGFzIGBzZWxlY3RgLlxuICBfLmZpbHRlciA9IF8uc2VsZWN0ID0gZnVuY3Rpb24ob2JqLCBwcmVkaWNhdGUsIGNvbnRleHQpIHtcbiAgICB2YXIgcmVzdWx0cyA9IFtdO1xuICAgIGlmIChvYmogPT0gbnVsbCkgcmV0dXJuIHJlc3VsdHM7XG4gICAgaWYgKG5hdGl2ZUZpbHRlciAmJiBvYmouZmlsdGVyID09PSBuYXRpdmVGaWx0ZXIpIHJldHVybiBvYmouZmlsdGVyKHByZWRpY2F0ZSwgY29udGV4dCk7XG4gICAgZWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgaWYgKHByZWRpY2F0ZS5jYWxsKGNvbnRleHQsIHZhbHVlLCBpbmRleCwgbGlzdCkpIHJlc3VsdHMucHVzaCh2YWx1ZSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdHM7XG4gIH07XG5cbiAgLy8gUmV0dXJuIGFsbCB0aGUgZWxlbWVudHMgZm9yIHdoaWNoIGEgdHJ1dGggdGVzdCBmYWlscy5cbiAgXy5yZWplY3QgPSBmdW5jdGlvbihvYmosIHByZWRpY2F0ZSwgY29udGV4dCkge1xuICAgIHJldHVybiBfLmZpbHRlcihvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgcmV0dXJuICFwcmVkaWNhdGUuY2FsbChjb250ZXh0LCB2YWx1ZSwgaW5kZXgsIGxpc3QpO1xuICAgIH0sIGNvbnRleHQpO1xuICB9O1xuXG4gIC8vIERldGVybWluZSB3aGV0aGVyIGFsbCBvZiB0aGUgZWxlbWVudHMgbWF0Y2ggYSB0cnV0aCB0ZXN0LlxuICAvLyBEZWxlZ2F0ZXMgdG8gKipFQ01BU2NyaXB0IDUqKidzIG5hdGl2ZSBgZXZlcnlgIGlmIGF2YWlsYWJsZS5cbiAgLy8gQWxpYXNlZCBhcyBgYWxsYC5cbiAgXy5ldmVyeSA9IF8uYWxsID0gZnVuY3Rpb24ob2JqLCBwcmVkaWNhdGUsIGNvbnRleHQpIHtcbiAgICBwcmVkaWNhdGUgfHwgKHByZWRpY2F0ZSA9IF8uaWRlbnRpdHkpO1xuICAgIHZhciByZXN1bHQgPSB0cnVlO1xuICAgIGlmIChvYmogPT0gbnVsbCkgcmV0dXJuIHJlc3VsdDtcbiAgICBpZiAobmF0aXZlRXZlcnkgJiYgb2JqLmV2ZXJ5ID09PSBuYXRpdmVFdmVyeSkgcmV0dXJuIG9iai5ldmVyeShwcmVkaWNhdGUsIGNvbnRleHQpO1xuICAgIGVhY2gob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGxpc3QpIHtcbiAgICAgIGlmICghKHJlc3VsdCA9IHJlc3VsdCAmJiBwcmVkaWNhdGUuY2FsbChjb250ZXh0LCB2YWx1ZSwgaW5kZXgsIGxpc3QpKSkgcmV0dXJuIGJyZWFrZXI7XG4gICAgfSk7XG4gICAgcmV0dXJuICEhcmVzdWx0O1xuICB9O1xuXG4gIC8vIERldGVybWluZSBpZiBhdCBsZWFzdCBvbmUgZWxlbWVudCBpbiB0aGUgb2JqZWN0IG1hdGNoZXMgYSB0cnV0aCB0ZXN0LlxuICAvLyBEZWxlZ2F0ZXMgdG8gKipFQ01BU2NyaXB0IDUqKidzIG5hdGl2ZSBgc29tZWAgaWYgYXZhaWxhYmxlLlxuICAvLyBBbGlhc2VkIGFzIGBhbnlgLlxuICB2YXIgYW55ID0gXy5zb21lID0gXy5hbnkgPSBmdW5jdGlvbihvYmosIHByZWRpY2F0ZSwgY29udGV4dCkge1xuICAgIHByZWRpY2F0ZSB8fCAocHJlZGljYXRlID0gXy5pZGVudGl0eSk7XG4gICAgdmFyIHJlc3VsdCA9IGZhbHNlO1xuICAgIGlmIChvYmogPT0gbnVsbCkgcmV0dXJuIHJlc3VsdDtcbiAgICBpZiAobmF0aXZlU29tZSAmJiBvYmouc29tZSA9PT0gbmF0aXZlU29tZSkgcmV0dXJuIG9iai5zb21lKHByZWRpY2F0ZSwgY29udGV4dCk7XG4gICAgZWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgaWYgKHJlc3VsdCB8fCAocmVzdWx0ID0gcHJlZGljYXRlLmNhbGwoY29udGV4dCwgdmFsdWUsIGluZGV4LCBsaXN0KSkpIHJldHVybiBicmVha2VyO1xuICAgIH0pO1xuICAgIHJldHVybiAhIXJlc3VsdDtcbiAgfTtcblxuICAvLyBEZXRlcm1pbmUgaWYgdGhlIGFycmF5IG9yIG9iamVjdCBjb250YWlucyBhIGdpdmVuIHZhbHVlICh1c2luZyBgPT09YCkuXG4gIC8vIEFsaWFzZWQgYXMgYGluY2x1ZGVgLlxuICBfLmNvbnRhaW5zID0gXy5pbmNsdWRlID0gZnVuY3Rpb24ob2JqLCB0YXJnZXQpIHtcbiAgICBpZiAob2JqID09IG51bGwpIHJldHVybiBmYWxzZTtcbiAgICBpZiAobmF0aXZlSW5kZXhPZiAmJiBvYmouaW5kZXhPZiA9PT0gbmF0aXZlSW5kZXhPZikgcmV0dXJuIG9iai5pbmRleE9mKHRhcmdldCkgIT0gLTE7XG4gICAgcmV0dXJuIGFueShvYmosIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICByZXR1cm4gdmFsdWUgPT09IHRhcmdldDtcbiAgICB9KTtcbiAgfTtcblxuICAvLyBJbnZva2UgYSBtZXRob2QgKHdpdGggYXJndW1lbnRzKSBvbiBldmVyeSBpdGVtIGluIGEgY29sbGVjdGlvbi5cbiAgXy5pbnZva2UgPSBmdW5jdGlvbihvYmosIG1ldGhvZCkge1xuICAgIHZhciBhcmdzID0gc2xpY2UuY2FsbChhcmd1bWVudHMsIDIpO1xuICAgIHZhciBpc0Z1bmMgPSBfLmlzRnVuY3Rpb24obWV0aG9kKTtcbiAgICByZXR1cm4gXy5tYXAob2JqLCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgcmV0dXJuIChpc0Z1bmMgPyBtZXRob2QgOiB2YWx1ZVttZXRob2RdKS5hcHBseSh2YWx1ZSwgYXJncyk7XG4gICAgfSk7XG4gIH07XG5cbiAgLy8gQ29udmVuaWVuY2UgdmVyc2lvbiBvZiBhIGNvbW1vbiB1c2UgY2FzZSBvZiBgbWFwYDogZmV0Y2hpbmcgYSBwcm9wZXJ0eS5cbiAgXy5wbHVjayA9IGZ1bmN0aW9uKG9iaiwga2V5KSB7XG4gICAgcmV0dXJuIF8ubWFwKG9iaiwgXy5wcm9wZXJ0eShrZXkpKTtcbiAgfTtcblxuICAvLyBDb252ZW5pZW5jZSB2ZXJzaW9uIG9mIGEgY29tbW9uIHVzZSBjYXNlIG9mIGBmaWx0ZXJgOiBzZWxlY3Rpbmcgb25seSBvYmplY3RzXG4gIC8vIGNvbnRhaW5pbmcgc3BlY2lmaWMgYGtleTp2YWx1ZWAgcGFpcnMuXG4gIF8ud2hlcmUgPSBmdW5jdGlvbihvYmosIGF0dHJzKSB7XG4gICAgcmV0dXJuIF8uZmlsdGVyKG9iaiwgXy5tYXRjaGVzKGF0dHJzKSk7XG4gIH07XG5cbiAgLy8gQ29udmVuaWVuY2UgdmVyc2lvbiBvZiBhIGNvbW1vbiB1c2UgY2FzZSBvZiBgZmluZGA6IGdldHRpbmcgdGhlIGZpcnN0IG9iamVjdFxuICAvLyBjb250YWluaW5nIHNwZWNpZmljIGBrZXk6dmFsdWVgIHBhaXJzLlxuICBfLmZpbmRXaGVyZSA9IGZ1bmN0aW9uKG9iaiwgYXR0cnMpIHtcbiAgICByZXR1cm4gXy5maW5kKG9iaiwgXy5tYXRjaGVzKGF0dHJzKSk7XG4gIH07XG5cbiAgLy8gUmV0dXJuIHRoZSBtYXhpbXVtIGVsZW1lbnQgb3IgKGVsZW1lbnQtYmFzZWQgY29tcHV0YXRpb24pLlxuICAvLyBDYW4ndCBvcHRpbWl6ZSBhcnJheXMgb2YgaW50ZWdlcnMgbG9uZ2VyIHRoYW4gNjUsNTM1IGVsZW1lbnRzLlxuICAvLyBTZWUgW1dlYktpdCBCdWcgODA3OTddKGh0dHBzOi8vYnVncy53ZWJraXQub3JnL3Nob3dfYnVnLmNnaT9pZD04MDc5NylcbiAgXy5tYXggPSBmdW5jdGlvbihvYmosIGl0ZXJhdG9yLCBjb250ZXh0KSB7XG4gICAgaWYgKCFpdGVyYXRvciAmJiBfLmlzQXJyYXkob2JqKSAmJiBvYmpbMF0gPT09ICtvYmpbMF0gJiYgb2JqLmxlbmd0aCA8IDY1NTM1KSB7XG4gICAgICByZXR1cm4gTWF0aC5tYXguYXBwbHkoTWF0aCwgb2JqKTtcbiAgICB9XG4gICAgdmFyIHJlc3VsdCA9IC1JbmZpbml0eSwgbGFzdENvbXB1dGVkID0gLUluZmluaXR5O1xuICAgIGVhY2gob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGxpc3QpIHtcbiAgICAgIHZhciBjb21wdXRlZCA9IGl0ZXJhdG9yID8gaXRlcmF0b3IuY2FsbChjb250ZXh0LCB2YWx1ZSwgaW5kZXgsIGxpc3QpIDogdmFsdWU7XG4gICAgICBpZiAoY29tcHV0ZWQgPiBsYXN0Q29tcHV0ZWQpIHtcbiAgICAgICAgcmVzdWx0ID0gdmFsdWU7XG4gICAgICAgIGxhc3RDb21wdXRlZCA9IGNvbXB1dGVkO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG5cbiAgLy8gUmV0dXJuIHRoZSBtaW5pbXVtIGVsZW1lbnQgKG9yIGVsZW1lbnQtYmFzZWQgY29tcHV0YXRpb24pLlxuICBfLm1pbiA9IGZ1bmN0aW9uKG9iaiwgaXRlcmF0b3IsIGNvbnRleHQpIHtcbiAgICBpZiAoIWl0ZXJhdG9yICYmIF8uaXNBcnJheShvYmopICYmIG9ialswXSA9PT0gK29ialswXSAmJiBvYmoubGVuZ3RoIDwgNjU1MzUpIHtcbiAgICAgIHJldHVybiBNYXRoLm1pbi5hcHBseShNYXRoLCBvYmopO1xuICAgIH1cbiAgICB2YXIgcmVzdWx0ID0gSW5maW5pdHksIGxhc3RDb21wdXRlZCA9IEluZmluaXR5O1xuICAgIGVhY2gob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGxpc3QpIHtcbiAgICAgIHZhciBjb21wdXRlZCA9IGl0ZXJhdG9yID8gaXRlcmF0b3IuY2FsbChjb250ZXh0LCB2YWx1ZSwgaW5kZXgsIGxpc3QpIDogdmFsdWU7XG4gICAgICBpZiAoY29tcHV0ZWQgPCBsYXN0Q29tcHV0ZWQpIHtcbiAgICAgICAgcmVzdWx0ID0gdmFsdWU7XG4gICAgICAgIGxhc3RDb21wdXRlZCA9IGNvbXB1dGVkO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG5cbiAgLy8gU2h1ZmZsZSBhbiBhcnJheSwgdXNpbmcgdGhlIG1vZGVybiB2ZXJzaW9uIG9mIHRoZVxuICAvLyBbRmlzaGVyLVlhdGVzIHNodWZmbGVdKGh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvRmlzaGVy4oCTWWF0ZXNfc2h1ZmZsZSkuXG4gIF8uc2h1ZmZsZSA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHZhciByYW5kO1xuICAgIHZhciBpbmRleCA9IDA7XG4gICAgdmFyIHNodWZmbGVkID0gW107XG4gICAgZWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICByYW5kID0gXy5yYW5kb20oaW5kZXgrKyk7XG4gICAgICBzaHVmZmxlZFtpbmRleCAtIDFdID0gc2h1ZmZsZWRbcmFuZF07XG4gICAgICBzaHVmZmxlZFtyYW5kXSA9IHZhbHVlO1xuICAgIH0pO1xuICAgIHJldHVybiBzaHVmZmxlZDtcbiAgfTtcblxuICAvLyBTYW1wbGUgKipuKiogcmFuZG9tIHZhbHVlcyBmcm9tIGEgY29sbGVjdGlvbi5cbiAgLy8gSWYgKipuKiogaXMgbm90IHNwZWNpZmllZCwgcmV0dXJucyBhIHNpbmdsZSByYW5kb20gZWxlbWVudC5cbiAgLy8gVGhlIGludGVybmFsIGBndWFyZGAgYXJndW1lbnQgYWxsb3dzIGl0IHRvIHdvcmsgd2l0aCBgbWFwYC5cbiAgXy5zYW1wbGUgPSBmdW5jdGlvbihvYmosIG4sIGd1YXJkKSB7XG4gICAgaWYgKG4gPT0gbnVsbCB8fCBndWFyZCkge1xuICAgICAgaWYgKG9iai5sZW5ndGggIT09ICtvYmoubGVuZ3RoKSBvYmogPSBfLnZhbHVlcyhvYmopO1xuICAgICAgcmV0dXJuIG9ialtfLnJhbmRvbShvYmoubGVuZ3RoIC0gMSldO1xuICAgIH1cbiAgICByZXR1cm4gXy5zaHVmZmxlKG9iaikuc2xpY2UoMCwgTWF0aC5tYXgoMCwgbikpO1xuICB9O1xuXG4gIC8vIEFuIGludGVybmFsIGZ1bmN0aW9uIHRvIGdlbmVyYXRlIGxvb2t1cCBpdGVyYXRvcnMuXG4gIHZhciBsb29rdXBJdGVyYXRvciA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgaWYgKHZhbHVlID09IG51bGwpIHJldHVybiBfLmlkZW50aXR5O1xuICAgIGlmIChfLmlzRnVuY3Rpb24odmFsdWUpKSByZXR1cm4gdmFsdWU7XG4gICAgcmV0dXJuIF8ucHJvcGVydHkodmFsdWUpO1xuICB9O1xuXG4gIC8vIFNvcnQgdGhlIG9iamVjdCdzIHZhbHVlcyBieSBhIGNyaXRlcmlvbiBwcm9kdWNlZCBieSBhbiBpdGVyYXRvci5cbiAgXy5zb3J0QnkgPSBmdW5jdGlvbihvYmosIGl0ZXJhdG9yLCBjb250ZXh0KSB7XG4gICAgaXRlcmF0b3IgPSBsb29rdXBJdGVyYXRvcihpdGVyYXRvcik7XG4gICAgcmV0dXJuIF8ucGx1Y2soXy5tYXAob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGxpc3QpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHZhbHVlOiB2YWx1ZSxcbiAgICAgICAgaW5kZXg6IGluZGV4LFxuICAgICAgICBjcml0ZXJpYTogaXRlcmF0b3IuY2FsbChjb250ZXh0LCB2YWx1ZSwgaW5kZXgsIGxpc3QpXG4gICAgICB9O1xuICAgIH0pLnNvcnQoZnVuY3Rpb24obGVmdCwgcmlnaHQpIHtcbiAgICAgIHZhciBhID0gbGVmdC5jcml0ZXJpYTtcbiAgICAgIHZhciBiID0gcmlnaHQuY3JpdGVyaWE7XG4gICAgICBpZiAoYSAhPT0gYikge1xuICAgICAgICBpZiAoYSA+IGIgfHwgYSA9PT0gdm9pZCAwKSByZXR1cm4gMTtcbiAgICAgICAgaWYgKGEgPCBiIHx8IGIgPT09IHZvaWQgMCkgcmV0dXJuIC0xO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGxlZnQuaW5kZXggLSByaWdodC5pbmRleDtcbiAgICB9KSwgJ3ZhbHVlJyk7XG4gIH07XG5cbiAgLy8gQW4gaW50ZXJuYWwgZnVuY3Rpb24gdXNlZCBmb3IgYWdncmVnYXRlIFwiZ3JvdXAgYnlcIiBvcGVyYXRpb25zLlxuICB2YXIgZ3JvdXAgPSBmdW5jdGlvbihiZWhhdmlvcikge1xuICAgIHJldHVybiBmdW5jdGlvbihvYmosIGl0ZXJhdG9yLCBjb250ZXh0KSB7XG4gICAgICB2YXIgcmVzdWx0ID0ge307XG4gICAgICBpdGVyYXRvciA9IGxvb2t1cEl0ZXJhdG9yKGl0ZXJhdG9yKTtcbiAgICAgIGVhY2gob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgpIHtcbiAgICAgICAgdmFyIGtleSA9IGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgdmFsdWUsIGluZGV4LCBvYmopO1xuICAgICAgICBiZWhhdmlvcihyZXN1bHQsIGtleSwgdmFsdWUpO1xuICAgICAgfSk7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG4gIH07XG5cbiAgLy8gR3JvdXBzIHRoZSBvYmplY3QncyB2YWx1ZXMgYnkgYSBjcml0ZXJpb24uIFBhc3MgZWl0aGVyIGEgc3RyaW5nIGF0dHJpYnV0ZVxuICAvLyB0byBncm91cCBieSwgb3IgYSBmdW5jdGlvbiB0aGF0IHJldHVybnMgdGhlIGNyaXRlcmlvbi5cbiAgXy5ncm91cEJ5ID0gZ3JvdXAoZnVuY3Rpb24ocmVzdWx0LCBrZXksIHZhbHVlKSB7XG4gICAgXy5oYXMocmVzdWx0LCBrZXkpID8gcmVzdWx0W2tleV0ucHVzaCh2YWx1ZSkgOiByZXN1bHRba2V5XSA9IFt2YWx1ZV07XG4gIH0pO1xuXG4gIC8vIEluZGV4ZXMgdGhlIG9iamVjdCdzIHZhbHVlcyBieSBhIGNyaXRlcmlvbiwgc2ltaWxhciB0byBgZ3JvdXBCeWAsIGJ1dCBmb3JcbiAgLy8gd2hlbiB5b3Uga25vdyB0aGF0IHlvdXIgaW5kZXggdmFsdWVzIHdpbGwgYmUgdW5pcXVlLlxuICBfLmluZGV4QnkgPSBncm91cChmdW5jdGlvbihyZXN1bHQsIGtleSwgdmFsdWUpIHtcbiAgICByZXN1bHRba2V5XSA9IHZhbHVlO1xuICB9KTtcblxuICAvLyBDb3VudHMgaW5zdGFuY2VzIG9mIGFuIG9iamVjdCB0aGF0IGdyb3VwIGJ5IGEgY2VydGFpbiBjcml0ZXJpb24uIFBhc3NcbiAgLy8gZWl0aGVyIGEgc3RyaW5nIGF0dHJpYnV0ZSB0byBjb3VudCBieSwgb3IgYSBmdW5jdGlvbiB0aGF0IHJldHVybnMgdGhlXG4gIC8vIGNyaXRlcmlvbi5cbiAgXy5jb3VudEJ5ID0gZ3JvdXAoZnVuY3Rpb24ocmVzdWx0LCBrZXkpIHtcbiAgICBfLmhhcyhyZXN1bHQsIGtleSkgPyByZXN1bHRba2V5XSsrIDogcmVzdWx0W2tleV0gPSAxO1xuICB9KTtcblxuICAvLyBVc2UgYSBjb21wYXJhdG9yIGZ1bmN0aW9uIHRvIGZpZ3VyZSBvdXQgdGhlIHNtYWxsZXN0IGluZGV4IGF0IHdoaWNoXG4gIC8vIGFuIG9iamVjdCBzaG91bGQgYmUgaW5zZXJ0ZWQgc28gYXMgdG8gbWFpbnRhaW4gb3JkZXIuIFVzZXMgYmluYXJ5IHNlYXJjaC5cbiAgXy5zb3J0ZWRJbmRleCA9IGZ1bmN0aW9uKGFycmF5LCBvYmosIGl0ZXJhdG9yLCBjb250ZXh0KSB7XG4gICAgaXRlcmF0b3IgPSBsb29rdXBJdGVyYXRvcihpdGVyYXRvcik7XG4gICAgdmFyIHZhbHVlID0gaXRlcmF0b3IuY2FsbChjb250ZXh0LCBvYmopO1xuICAgIHZhciBsb3cgPSAwLCBoaWdoID0gYXJyYXkubGVuZ3RoO1xuICAgIHdoaWxlIChsb3cgPCBoaWdoKSB7XG4gICAgICB2YXIgbWlkID0gKGxvdyArIGhpZ2gpID4+PiAxO1xuICAgICAgaXRlcmF0b3IuY2FsbChjb250ZXh0LCBhcnJheVttaWRdKSA8IHZhbHVlID8gbG93ID0gbWlkICsgMSA6IGhpZ2ggPSBtaWQ7XG4gICAgfVxuICAgIHJldHVybiBsb3c7XG4gIH07XG5cbiAgLy8gU2FmZWx5IGNyZWF0ZSBhIHJlYWwsIGxpdmUgYXJyYXkgZnJvbSBhbnl0aGluZyBpdGVyYWJsZS5cbiAgXy50b0FycmF5ID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgaWYgKCFvYmopIHJldHVybiBbXTtcbiAgICBpZiAoXy5pc0FycmF5KG9iaikpIHJldHVybiBzbGljZS5jYWxsKG9iaik7XG4gICAgaWYgKG9iai5sZW5ndGggPT09ICtvYmoubGVuZ3RoKSByZXR1cm4gXy5tYXAob2JqLCBfLmlkZW50aXR5KTtcbiAgICByZXR1cm4gXy52YWx1ZXMob2JqKTtcbiAgfTtcblxuICAvLyBSZXR1cm4gdGhlIG51bWJlciBvZiBlbGVtZW50cyBpbiBhbiBvYmplY3QuXG4gIF8uc2l6ZSA9IGZ1bmN0aW9uKG9iaikge1xuICAgIGlmIChvYmogPT0gbnVsbCkgcmV0dXJuIDA7XG4gICAgcmV0dXJuIChvYmoubGVuZ3RoID09PSArb2JqLmxlbmd0aCkgPyBvYmoubGVuZ3RoIDogXy5rZXlzKG9iaikubGVuZ3RoO1xuICB9O1xuXG4gIC8vIEFycmF5IEZ1bmN0aW9uc1xuICAvLyAtLS0tLS0tLS0tLS0tLS1cblxuICAvLyBHZXQgdGhlIGZpcnN0IGVsZW1lbnQgb2YgYW4gYXJyYXkuIFBhc3NpbmcgKipuKiogd2lsbCByZXR1cm4gdGhlIGZpcnN0IE5cbiAgLy8gdmFsdWVzIGluIHRoZSBhcnJheS4gQWxpYXNlZCBhcyBgaGVhZGAgYW5kIGB0YWtlYC4gVGhlICoqZ3VhcmQqKiBjaGVja1xuICAvLyBhbGxvd3MgaXQgdG8gd29yayB3aXRoIGBfLm1hcGAuXG4gIF8uZmlyc3QgPSBfLmhlYWQgPSBfLnRha2UgPSBmdW5jdGlvbihhcnJheSwgbiwgZ3VhcmQpIHtcbiAgICBpZiAoYXJyYXkgPT0gbnVsbCkgcmV0dXJuIHZvaWQgMDtcbiAgICBpZiAoKG4gPT0gbnVsbCkgfHwgZ3VhcmQpIHJldHVybiBhcnJheVswXTtcbiAgICBpZiAobiA8IDApIHJldHVybiBbXTtcbiAgICByZXR1cm4gc2xpY2UuY2FsbChhcnJheSwgMCwgbik7XG4gIH07XG5cbiAgLy8gUmV0dXJucyBldmVyeXRoaW5nIGJ1dCB0aGUgbGFzdCBlbnRyeSBvZiB0aGUgYXJyYXkuIEVzcGVjaWFsbHkgdXNlZnVsIG9uXG4gIC8vIHRoZSBhcmd1bWVudHMgb2JqZWN0LiBQYXNzaW5nICoqbioqIHdpbGwgcmV0dXJuIGFsbCB0aGUgdmFsdWVzIGluXG4gIC8vIHRoZSBhcnJheSwgZXhjbHVkaW5nIHRoZSBsYXN0IE4uIFRoZSAqKmd1YXJkKiogY2hlY2sgYWxsb3dzIGl0IHRvIHdvcmsgd2l0aFxuICAvLyBgXy5tYXBgLlxuICBfLmluaXRpYWwgPSBmdW5jdGlvbihhcnJheSwgbiwgZ3VhcmQpIHtcbiAgICByZXR1cm4gc2xpY2UuY2FsbChhcnJheSwgMCwgYXJyYXkubGVuZ3RoIC0gKChuID09IG51bGwpIHx8IGd1YXJkID8gMSA6IG4pKTtcbiAgfTtcblxuICAvLyBHZXQgdGhlIGxhc3QgZWxlbWVudCBvZiBhbiBhcnJheS4gUGFzc2luZyAqKm4qKiB3aWxsIHJldHVybiB0aGUgbGFzdCBOXG4gIC8vIHZhbHVlcyBpbiB0aGUgYXJyYXkuIFRoZSAqKmd1YXJkKiogY2hlY2sgYWxsb3dzIGl0IHRvIHdvcmsgd2l0aCBgXy5tYXBgLlxuICBfLmxhc3QgPSBmdW5jdGlvbihhcnJheSwgbiwgZ3VhcmQpIHtcbiAgICBpZiAoYXJyYXkgPT0gbnVsbCkgcmV0dXJuIHZvaWQgMDtcbiAgICBpZiAoKG4gPT0gbnVsbCkgfHwgZ3VhcmQpIHJldHVybiBhcnJheVthcnJheS5sZW5ndGggLSAxXTtcbiAgICByZXR1cm4gc2xpY2UuY2FsbChhcnJheSwgTWF0aC5tYXgoYXJyYXkubGVuZ3RoIC0gbiwgMCkpO1xuICB9O1xuXG4gIC8vIFJldHVybnMgZXZlcnl0aGluZyBidXQgdGhlIGZpcnN0IGVudHJ5IG9mIHRoZSBhcnJheS4gQWxpYXNlZCBhcyBgdGFpbGAgYW5kIGBkcm9wYC5cbiAgLy8gRXNwZWNpYWxseSB1c2VmdWwgb24gdGhlIGFyZ3VtZW50cyBvYmplY3QuIFBhc3NpbmcgYW4gKipuKiogd2lsbCByZXR1cm5cbiAgLy8gdGhlIHJlc3QgTiB2YWx1ZXMgaW4gdGhlIGFycmF5LiBUaGUgKipndWFyZCoqXG4gIC8vIGNoZWNrIGFsbG93cyBpdCB0byB3b3JrIHdpdGggYF8ubWFwYC5cbiAgXy5yZXN0ID0gXy50YWlsID0gXy5kcm9wID0gZnVuY3Rpb24oYXJyYXksIG4sIGd1YXJkKSB7XG4gICAgcmV0dXJuIHNsaWNlLmNhbGwoYXJyYXksIChuID09IG51bGwpIHx8IGd1YXJkID8gMSA6IG4pO1xuICB9O1xuXG4gIC8vIFRyaW0gb3V0IGFsbCBmYWxzeSB2YWx1ZXMgZnJvbSBhbiBhcnJheS5cbiAgXy5jb21wYWN0ID0gZnVuY3Rpb24oYXJyYXkpIHtcbiAgICByZXR1cm4gXy5maWx0ZXIoYXJyYXksIF8uaWRlbnRpdHkpO1xuICB9O1xuXG4gIC8vIEludGVybmFsIGltcGxlbWVudGF0aW9uIG9mIGEgcmVjdXJzaXZlIGBmbGF0dGVuYCBmdW5jdGlvbi5cbiAgdmFyIGZsYXR0ZW4gPSBmdW5jdGlvbihpbnB1dCwgc2hhbGxvdywgb3V0cHV0KSB7XG4gICAgaWYgKHNoYWxsb3cgJiYgXy5ldmVyeShpbnB1dCwgXy5pc0FycmF5KSkge1xuICAgICAgcmV0dXJuIGNvbmNhdC5hcHBseShvdXRwdXQsIGlucHV0KTtcbiAgICB9XG4gICAgZWFjaChpbnB1dCwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIGlmIChfLmlzQXJyYXkodmFsdWUpIHx8IF8uaXNBcmd1bWVudHModmFsdWUpKSB7XG4gICAgICAgIHNoYWxsb3cgPyBwdXNoLmFwcGx5KG91dHB1dCwgdmFsdWUpIDogZmxhdHRlbih2YWx1ZSwgc2hhbGxvdywgb3V0cHV0KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG91dHB1dC5wdXNoKHZhbHVlKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gb3V0cHV0O1xuICB9O1xuXG4gIC8vIEZsYXR0ZW4gb3V0IGFuIGFycmF5LCBlaXRoZXIgcmVjdXJzaXZlbHkgKGJ5IGRlZmF1bHQpLCBvciBqdXN0IG9uZSBsZXZlbC5cbiAgXy5mbGF0dGVuID0gZnVuY3Rpb24oYXJyYXksIHNoYWxsb3cpIHtcbiAgICByZXR1cm4gZmxhdHRlbihhcnJheSwgc2hhbGxvdywgW10pO1xuICB9O1xuXG4gIC8vIFJldHVybiBhIHZlcnNpb24gb2YgdGhlIGFycmF5IHRoYXQgZG9lcyBub3QgY29udGFpbiB0aGUgc3BlY2lmaWVkIHZhbHVlKHMpLlxuICBfLndpdGhvdXQgPSBmdW5jdGlvbihhcnJheSkge1xuICAgIHJldHVybiBfLmRpZmZlcmVuY2UoYXJyYXksIHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSk7XG4gIH07XG5cbiAgLy8gU3BsaXQgYW4gYXJyYXkgaW50byB0d28gYXJyYXlzOiBvbmUgd2hvc2UgZWxlbWVudHMgYWxsIHNhdGlzZnkgdGhlIGdpdmVuXG4gIC8vIHByZWRpY2F0ZSwgYW5kIG9uZSB3aG9zZSBlbGVtZW50cyBhbGwgZG8gbm90IHNhdGlzZnkgdGhlIHByZWRpY2F0ZS5cbiAgXy5wYXJ0aXRpb24gPSBmdW5jdGlvbihhcnJheSwgcHJlZGljYXRlKSB7XG4gICAgdmFyIHBhc3MgPSBbXSwgZmFpbCA9IFtdO1xuICAgIGVhY2goYXJyYXksIGZ1bmN0aW9uKGVsZW0pIHtcbiAgICAgIChwcmVkaWNhdGUoZWxlbSkgPyBwYXNzIDogZmFpbCkucHVzaChlbGVtKTtcbiAgICB9KTtcbiAgICByZXR1cm4gW3Bhc3MsIGZhaWxdO1xuICB9O1xuXG4gIC8vIFByb2R1Y2UgYSBkdXBsaWNhdGUtZnJlZSB2ZXJzaW9uIG9mIHRoZSBhcnJheS4gSWYgdGhlIGFycmF5IGhhcyBhbHJlYWR5XG4gIC8vIGJlZW4gc29ydGVkLCB5b3UgaGF2ZSB0aGUgb3B0aW9uIG9mIHVzaW5nIGEgZmFzdGVyIGFsZ29yaXRobS5cbiAgLy8gQWxpYXNlZCBhcyBgdW5pcXVlYC5cbiAgXy51bmlxID0gXy51bmlxdWUgPSBmdW5jdGlvbihhcnJheSwgaXNTb3J0ZWQsIGl0ZXJhdG9yLCBjb250ZXh0KSB7XG4gICAgaWYgKF8uaXNGdW5jdGlvbihpc1NvcnRlZCkpIHtcbiAgICAgIGNvbnRleHQgPSBpdGVyYXRvcjtcbiAgICAgIGl0ZXJhdG9yID0gaXNTb3J0ZWQ7XG4gICAgICBpc1NvcnRlZCA9IGZhbHNlO1xuICAgIH1cbiAgICB2YXIgaW5pdGlhbCA9IGl0ZXJhdG9yID8gXy5tYXAoYXJyYXksIGl0ZXJhdG9yLCBjb250ZXh0KSA6IGFycmF5O1xuICAgIHZhciByZXN1bHRzID0gW107XG4gICAgdmFyIHNlZW4gPSBbXTtcbiAgICBlYWNoKGluaXRpYWwsIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCkge1xuICAgICAgaWYgKGlzU29ydGVkID8gKCFpbmRleCB8fCBzZWVuW3NlZW4ubGVuZ3RoIC0gMV0gIT09IHZhbHVlKSA6ICFfLmNvbnRhaW5zKHNlZW4sIHZhbHVlKSkge1xuICAgICAgICBzZWVuLnB1c2godmFsdWUpO1xuICAgICAgICByZXN1bHRzLnB1c2goYXJyYXlbaW5kZXhdKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gcmVzdWx0cztcbiAgfTtcblxuICAvLyBQcm9kdWNlIGFuIGFycmF5IHRoYXQgY29udGFpbnMgdGhlIHVuaW9uOiBlYWNoIGRpc3RpbmN0IGVsZW1lbnQgZnJvbSBhbGwgb2ZcbiAgLy8gdGhlIHBhc3NlZC1pbiBhcnJheXMuXG4gIF8udW5pb24gPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gXy51bmlxKF8uZmxhdHRlbihhcmd1bWVudHMsIHRydWUpKTtcbiAgfTtcblxuICAvLyBQcm9kdWNlIGFuIGFycmF5IHRoYXQgY29udGFpbnMgZXZlcnkgaXRlbSBzaGFyZWQgYmV0d2VlbiBhbGwgdGhlXG4gIC8vIHBhc3NlZC1pbiBhcnJheXMuXG4gIF8uaW50ZXJzZWN0aW9uID0gZnVuY3Rpb24oYXJyYXkpIHtcbiAgICB2YXIgcmVzdCA9IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICByZXR1cm4gXy5maWx0ZXIoXy51bmlxKGFycmF5KSwgZnVuY3Rpb24oaXRlbSkge1xuICAgICAgcmV0dXJuIF8uZXZlcnkocmVzdCwgZnVuY3Rpb24ob3RoZXIpIHtcbiAgICAgICAgcmV0dXJuIF8uY29udGFpbnMob3RoZXIsIGl0ZW0pO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH07XG5cbiAgLy8gVGFrZSB0aGUgZGlmZmVyZW5jZSBiZXR3ZWVuIG9uZSBhcnJheSBhbmQgYSBudW1iZXIgb2Ygb3RoZXIgYXJyYXlzLlxuICAvLyBPbmx5IHRoZSBlbGVtZW50cyBwcmVzZW50IGluIGp1c3QgdGhlIGZpcnN0IGFycmF5IHdpbGwgcmVtYWluLlxuICBfLmRpZmZlcmVuY2UgPSBmdW5jdGlvbihhcnJheSkge1xuICAgIHZhciByZXN0ID0gY29uY2F0LmFwcGx5KEFycmF5UHJvdG8sIHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSk7XG4gICAgcmV0dXJuIF8uZmlsdGVyKGFycmF5LCBmdW5jdGlvbih2YWx1ZSl7IHJldHVybiAhXy5jb250YWlucyhyZXN0LCB2YWx1ZSk7IH0pO1xuICB9O1xuXG4gIC8vIFppcCB0b2dldGhlciBtdWx0aXBsZSBsaXN0cyBpbnRvIGEgc2luZ2xlIGFycmF5IC0tIGVsZW1lbnRzIHRoYXQgc2hhcmVcbiAgLy8gYW4gaW5kZXggZ28gdG9nZXRoZXIuXG4gIF8uemlwID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGxlbmd0aCA9IF8ubWF4KF8ucGx1Y2soYXJndW1lbnRzLCAnbGVuZ3RoJykuY29uY2F0KDApKTtcbiAgICB2YXIgcmVzdWx0cyA9IG5ldyBBcnJheShsZW5ndGgpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIHJlc3VsdHNbaV0gPSBfLnBsdWNrKGFyZ3VtZW50cywgJycgKyBpKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdHM7XG4gIH07XG5cbiAgLy8gQ29udmVydHMgbGlzdHMgaW50byBvYmplY3RzLiBQYXNzIGVpdGhlciBhIHNpbmdsZSBhcnJheSBvZiBgW2tleSwgdmFsdWVdYFxuICAvLyBwYWlycywgb3IgdHdvIHBhcmFsbGVsIGFycmF5cyBvZiB0aGUgc2FtZSBsZW5ndGggLS0gb25lIG9mIGtleXMsIGFuZCBvbmUgb2ZcbiAgLy8gdGhlIGNvcnJlc3BvbmRpbmcgdmFsdWVzLlxuICBfLm9iamVjdCA9IGZ1bmN0aW9uKGxpc3QsIHZhbHVlcykge1xuICAgIGlmIChsaXN0ID09IG51bGwpIHJldHVybiB7fTtcbiAgICB2YXIgcmVzdWx0ID0ge307XG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbmd0aCA9IGxpc3QubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmICh2YWx1ZXMpIHtcbiAgICAgICAgcmVzdWx0W2xpc3RbaV1dID0gdmFsdWVzW2ldO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzdWx0W2xpc3RbaV1bMF1dID0gbGlzdFtpXVsxXTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcblxuICAvLyBJZiB0aGUgYnJvd3NlciBkb2Vzbid0IHN1cHBseSB1cyB3aXRoIGluZGV4T2YgKEknbSBsb29raW5nIGF0IHlvdSwgKipNU0lFKiopLFxuICAvLyB3ZSBuZWVkIHRoaXMgZnVuY3Rpb24uIFJldHVybiB0aGUgcG9zaXRpb24gb2YgdGhlIGZpcnN0IG9jY3VycmVuY2Ugb2YgYW5cbiAgLy8gaXRlbSBpbiBhbiBhcnJheSwgb3IgLTEgaWYgdGhlIGl0ZW0gaXMgbm90IGluY2x1ZGVkIGluIHRoZSBhcnJheS5cbiAgLy8gRGVsZWdhdGVzIHRvICoqRUNNQVNjcmlwdCA1KioncyBuYXRpdmUgYGluZGV4T2ZgIGlmIGF2YWlsYWJsZS5cbiAgLy8gSWYgdGhlIGFycmF5IGlzIGxhcmdlIGFuZCBhbHJlYWR5IGluIHNvcnQgb3JkZXIsIHBhc3MgYHRydWVgXG4gIC8vIGZvciAqKmlzU29ydGVkKiogdG8gdXNlIGJpbmFyeSBzZWFyY2guXG4gIF8uaW5kZXhPZiA9IGZ1bmN0aW9uKGFycmF5LCBpdGVtLCBpc1NvcnRlZCkge1xuICAgIGlmIChhcnJheSA9PSBudWxsKSByZXR1cm4gLTE7XG4gICAgdmFyIGkgPSAwLCBsZW5ndGggPSBhcnJheS5sZW5ndGg7XG4gICAgaWYgKGlzU29ydGVkKSB7XG4gICAgICBpZiAodHlwZW9mIGlzU29ydGVkID09ICdudW1iZXInKSB7XG4gICAgICAgIGkgPSAoaXNTb3J0ZWQgPCAwID8gTWF0aC5tYXgoMCwgbGVuZ3RoICsgaXNTb3J0ZWQpIDogaXNTb3J0ZWQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaSA9IF8uc29ydGVkSW5kZXgoYXJyYXksIGl0ZW0pO1xuICAgICAgICByZXR1cm4gYXJyYXlbaV0gPT09IGl0ZW0gPyBpIDogLTE7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChuYXRpdmVJbmRleE9mICYmIGFycmF5LmluZGV4T2YgPT09IG5hdGl2ZUluZGV4T2YpIHJldHVybiBhcnJheS5pbmRleE9mKGl0ZW0sIGlzU29ydGVkKTtcbiAgICBmb3IgKDsgaSA8IGxlbmd0aDsgaSsrKSBpZiAoYXJyYXlbaV0gPT09IGl0ZW0pIHJldHVybiBpO1xuICAgIHJldHVybiAtMTtcbiAgfTtcblxuICAvLyBEZWxlZ2F0ZXMgdG8gKipFQ01BU2NyaXB0IDUqKidzIG5hdGl2ZSBgbGFzdEluZGV4T2ZgIGlmIGF2YWlsYWJsZS5cbiAgXy5sYXN0SW5kZXhPZiA9IGZ1bmN0aW9uKGFycmF5LCBpdGVtLCBmcm9tKSB7XG4gICAgaWYgKGFycmF5ID09IG51bGwpIHJldHVybiAtMTtcbiAgICB2YXIgaGFzSW5kZXggPSBmcm9tICE9IG51bGw7XG4gICAgaWYgKG5hdGl2ZUxhc3RJbmRleE9mICYmIGFycmF5Lmxhc3RJbmRleE9mID09PSBuYXRpdmVMYXN0SW5kZXhPZikge1xuICAgICAgcmV0dXJuIGhhc0luZGV4ID8gYXJyYXkubGFzdEluZGV4T2YoaXRlbSwgZnJvbSkgOiBhcnJheS5sYXN0SW5kZXhPZihpdGVtKTtcbiAgICB9XG4gICAgdmFyIGkgPSAoaGFzSW5kZXggPyBmcm9tIDogYXJyYXkubGVuZ3RoKTtcbiAgICB3aGlsZSAoaS0tKSBpZiAoYXJyYXlbaV0gPT09IGl0ZW0pIHJldHVybiBpO1xuICAgIHJldHVybiAtMTtcbiAgfTtcblxuICAvLyBHZW5lcmF0ZSBhbiBpbnRlZ2VyIEFycmF5IGNvbnRhaW5pbmcgYW4gYXJpdGhtZXRpYyBwcm9ncmVzc2lvbi4gQSBwb3J0IG9mXG4gIC8vIHRoZSBuYXRpdmUgUHl0aG9uIGByYW5nZSgpYCBmdW5jdGlvbi4gU2VlXG4gIC8vIFt0aGUgUHl0aG9uIGRvY3VtZW50YXRpb25dKGh0dHA6Ly9kb2NzLnB5dGhvbi5vcmcvbGlicmFyeS9mdW5jdGlvbnMuaHRtbCNyYW5nZSkuXG4gIF8ucmFuZ2UgPSBmdW5jdGlvbihzdGFydCwgc3RvcCwgc3RlcCkge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoIDw9IDEpIHtcbiAgICAgIHN0b3AgPSBzdGFydCB8fCAwO1xuICAgICAgc3RhcnQgPSAwO1xuICAgIH1cbiAgICBzdGVwID0gYXJndW1lbnRzWzJdIHx8IDE7XG5cbiAgICB2YXIgbGVuZ3RoID0gTWF0aC5tYXgoTWF0aC5jZWlsKChzdG9wIC0gc3RhcnQpIC8gc3RlcCksIDApO1xuICAgIHZhciBpZHggPSAwO1xuICAgIHZhciByYW5nZSA9IG5ldyBBcnJheShsZW5ndGgpO1xuXG4gICAgd2hpbGUoaWR4IDwgbGVuZ3RoKSB7XG4gICAgICByYW5nZVtpZHgrK10gPSBzdGFydDtcbiAgICAgIHN0YXJ0ICs9IHN0ZXA7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJhbmdlO1xuICB9O1xuXG4gIC8vIEZ1bmN0aW9uIChhaGVtKSBGdW5jdGlvbnNcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgLy8gUmV1c2FibGUgY29uc3RydWN0b3IgZnVuY3Rpb24gZm9yIHByb3RvdHlwZSBzZXR0aW5nLlxuICB2YXIgY3RvciA9IGZ1bmN0aW9uKCl7fTtcblxuICAvLyBDcmVhdGUgYSBmdW5jdGlvbiBib3VuZCB0byBhIGdpdmVuIG9iamVjdCAoYXNzaWduaW5nIGB0aGlzYCwgYW5kIGFyZ3VtZW50cyxcbiAgLy8gb3B0aW9uYWxseSkuIERlbGVnYXRlcyB0byAqKkVDTUFTY3JpcHQgNSoqJ3MgbmF0aXZlIGBGdW5jdGlvbi5iaW5kYCBpZlxuICAvLyBhdmFpbGFibGUuXG4gIF8uYmluZCA9IGZ1bmN0aW9uKGZ1bmMsIGNvbnRleHQpIHtcbiAgICB2YXIgYXJncywgYm91bmQ7XG4gICAgaWYgKG5hdGl2ZUJpbmQgJiYgZnVuYy5iaW5kID09PSBuYXRpdmVCaW5kKSByZXR1cm4gbmF0aXZlQmluZC5hcHBseShmdW5jLCBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSkpO1xuICAgIGlmICghXy5pc0Z1bmN0aW9uKGZ1bmMpKSB0aHJvdyBuZXcgVHlwZUVycm9yO1xuICAgIGFyZ3MgPSBzbGljZS5jYWxsKGFyZ3VtZW50cywgMik7XG4gICAgcmV0dXJuIGJvdW5kID0gZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgYm91bmQpKSByZXR1cm4gZnVuYy5hcHBseShjb250ZXh0LCBhcmdzLmNvbmNhdChzbGljZS5jYWxsKGFyZ3VtZW50cykpKTtcbiAgICAgIGN0b3IucHJvdG90eXBlID0gZnVuYy5wcm90b3R5cGU7XG4gICAgICB2YXIgc2VsZiA9IG5ldyBjdG9yO1xuICAgICAgY3Rvci5wcm90b3R5cGUgPSBudWxsO1xuICAgICAgdmFyIHJlc3VsdCA9IGZ1bmMuYXBwbHkoc2VsZiwgYXJncy5jb25jYXQoc2xpY2UuY2FsbChhcmd1bWVudHMpKSk7XG4gICAgICBpZiAoT2JqZWN0KHJlc3VsdCkgPT09IHJlc3VsdCkgcmV0dXJuIHJlc3VsdDtcbiAgICAgIHJldHVybiBzZWxmO1xuICAgIH07XG4gIH07XG5cbiAgLy8gUGFydGlhbGx5IGFwcGx5IGEgZnVuY3Rpb24gYnkgY3JlYXRpbmcgYSB2ZXJzaW9uIHRoYXQgaGFzIGhhZCBzb21lIG9mIGl0c1xuICAvLyBhcmd1bWVudHMgcHJlLWZpbGxlZCwgd2l0aG91dCBjaGFuZ2luZyBpdHMgZHluYW1pYyBgdGhpc2AgY29udGV4dC4gXyBhY3RzXG4gIC8vIGFzIGEgcGxhY2Vob2xkZXIsIGFsbG93aW5nIGFueSBjb21iaW5hdGlvbiBvZiBhcmd1bWVudHMgdG8gYmUgcHJlLWZpbGxlZC5cbiAgXy5wYXJ0aWFsID0gZnVuY3Rpb24oZnVuYykge1xuICAgIHZhciBib3VuZEFyZ3MgPSBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHBvc2l0aW9uID0gMDtcbiAgICAgIHZhciBhcmdzID0gYm91bmRBcmdzLnNsaWNlKCk7XG4gICAgICBmb3IgKHZhciBpID0gMCwgbGVuZ3RoID0gYXJncy5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoYXJnc1tpXSA9PT0gXykgYXJnc1tpXSA9IGFyZ3VtZW50c1twb3NpdGlvbisrXTtcbiAgICAgIH1cbiAgICAgIHdoaWxlIChwb3NpdGlvbiA8IGFyZ3VtZW50cy5sZW5ndGgpIGFyZ3MucHVzaChhcmd1bWVudHNbcG9zaXRpb24rK10pO1xuICAgICAgcmV0dXJuIGZ1bmMuYXBwbHkodGhpcywgYXJncyk7XG4gICAgfTtcbiAgfTtcblxuICAvLyBCaW5kIGEgbnVtYmVyIG9mIGFuIG9iamVjdCdzIG1ldGhvZHMgdG8gdGhhdCBvYmplY3QuIFJlbWFpbmluZyBhcmd1bWVudHNcbiAgLy8gYXJlIHRoZSBtZXRob2QgbmFtZXMgdG8gYmUgYm91bmQuIFVzZWZ1bCBmb3IgZW5zdXJpbmcgdGhhdCBhbGwgY2FsbGJhY2tzXG4gIC8vIGRlZmluZWQgb24gYW4gb2JqZWN0IGJlbG9uZyB0byBpdC5cbiAgXy5iaW5kQWxsID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgdmFyIGZ1bmNzID0gc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgIGlmIChmdW5jcy5sZW5ndGggPT09IDApIHRocm93IG5ldyBFcnJvcignYmluZEFsbCBtdXN0IGJlIHBhc3NlZCBmdW5jdGlvbiBuYW1lcycpO1xuICAgIGVhY2goZnVuY3MsIGZ1bmN0aW9uKGYpIHsgb2JqW2ZdID0gXy5iaW5kKG9ialtmXSwgb2JqKTsgfSk7XG4gICAgcmV0dXJuIG9iajtcbiAgfTtcblxuICAvLyBNZW1vaXplIGFuIGV4cGVuc2l2ZSBmdW5jdGlvbiBieSBzdG9yaW5nIGl0cyByZXN1bHRzLlxuICBfLm1lbW9pemUgPSBmdW5jdGlvbihmdW5jLCBoYXNoZXIpIHtcbiAgICB2YXIgbWVtbyA9IHt9O1xuICAgIGhhc2hlciB8fCAoaGFzaGVyID0gXy5pZGVudGl0eSk7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGtleSA9IGhhc2hlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgcmV0dXJuIF8uaGFzKG1lbW8sIGtleSkgPyBtZW1vW2tleV0gOiAobWVtb1trZXldID0gZnVuYy5hcHBseSh0aGlzLCBhcmd1bWVudHMpKTtcbiAgICB9O1xuICB9O1xuXG4gIC8vIERlbGF5cyBhIGZ1bmN0aW9uIGZvciB0aGUgZ2l2ZW4gbnVtYmVyIG9mIG1pbGxpc2Vjb25kcywgYW5kIHRoZW4gY2FsbHNcbiAgLy8gaXQgd2l0aCB0aGUgYXJndW1lbnRzIHN1cHBsaWVkLlxuICBfLmRlbGF5ID0gZnVuY3Rpb24oZnVuYywgd2FpdCkge1xuICAgIHZhciBhcmdzID0gc2xpY2UuY2FsbChhcmd1bWVudHMsIDIpO1xuICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7IHJldHVybiBmdW5jLmFwcGx5KG51bGwsIGFyZ3MpOyB9LCB3YWl0KTtcbiAgfTtcblxuICAvLyBEZWZlcnMgYSBmdW5jdGlvbiwgc2NoZWR1bGluZyBpdCB0byBydW4gYWZ0ZXIgdGhlIGN1cnJlbnQgY2FsbCBzdGFjayBoYXNcbiAgLy8gY2xlYXJlZC5cbiAgXy5kZWZlciA9IGZ1bmN0aW9uKGZ1bmMpIHtcbiAgICByZXR1cm4gXy5kZWxheS5hcHBseShfLCBbZnVuYywgMV0uY29uY2F0KHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSkpO1xuICB9O1xuXG4gIC8vIFJldHVybnMgYSBmdW5jdGlvbiwgdGhhdCwgd2hlbiBpbnZva2VkLCB3aWxsIG9ubHkgYmUgdHJpZ2dlcmVkIGF0IG1vc3Qgb25jZVxuICAvLyBkdXJpbmcgYSBnaXZlbiB3aW5kb3cgb2YgdGltZS4gTm9ybWFsbHksIHRoZSB0aHJvdHRsZWQgZnVuY3Rpb24gd2lsbCBydW5cbiAgLy8gYXMgbXVjaCBhcyBpdCBjYW4sIHdpdGhvdXQgZXZlciBnb2luZyBtb3JlIHRoYW4gb25jZSBwZXIgYHdhaXRgIGR1cmF0aW9uO1xuICAvLyBidXQgaWYgeW91J2QgbGlrZSB0byBkaXNhYmxlIHRoZSBleGVjdXRpb24gb24gdGhlIGxlYWRpbmcgZWRnZSwgcGFzc1xuICAvLyBge2xlYWRpbmc6IGZhbHNlfWAuIFRvIGRpc2FibGUgZXhlY3V0aW9uIG9uIHRoZSB0cmFpbGluZyBlZGdlLCBkaXR0by5cbiAgXy50aHJvdHRsZSA9IGZ1bmN0aW9uKGZ1bmMsIHdhaXQsIG9wdGlvbnMpIHtcbiAgICB2YXIgY29udGV4dCwgYXJncywgcmVzdWx0O1xuICAgIHZhciB0aW1lb3V0ID0gbnVsbDtcbiAgICB2YXIgcHJldmlvdXMgPSAwO1xuICAgIG9wdGlvbnMgfHwgKG9wdGlvbnMgPSB7fSk7XG4gICAgdmFyIGxhdGVyID0gZnVuY3Rpb24oKSB7XG4gICAgICBwcmV2aW91cyA9IG9wdGlvbnMubGVhZGluZyA9PT0gZmFsc2UgPyAwIDogXy5ub3coKTtcbiAgICAgIHRpbWVvdXQgPSBudWxsO1xuICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseShjb250ZXh0LCBhcmdzKTtcbiAgICAgIGNvbnRleHQgPSBhcmdzID0gbnVsbDtcbiAgICB9O1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBub3cgPSBfLm5vdygpO1xuICAgICAgaWYgKCFwcmV2aW91cyAmJiBvcHRpb25zLmxlYWRpbmcgPT09IGZhbHNlKSBwcmV2aW91cyA9IG5vdztcbiAgICAgIHZhciByZW1haW5pbmcgPSB3YWl0IC0gKG5vdyAtIHByZXZpb3VzKTtcbiAgICAgIGNvbnRleHQgPSB0aGlzO1xuICAgICAgYXJncyA9IGFyZ3VtZW50cztcbiAgICAgIGlmIChyZW1haW5pbmcgPD0gMCkge1xuICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG4gICAgICAgIHRpbWVvdXQgPSBudWxsO1xuICAgICAgICBwcmV2aW91cyA9IG5vdztcbiAgICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseShjb250ZXh0LCBhcmdzKTtcbiAgICAgICAgY29udGV4dCA9IGFyZ3MgPSBudWxsO1xuICAgICAgfSBlbHNlIGlmICghdGltZW91dCAmJiBvcHRpb25zLnRyYWlsaW5nICE9PSBmYWxzZSkge1xuICAgICAgICB0aW1lb3V0ID0gc2V0VGltZW91dChsYXRlciwgcmVtYWluaW5nKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIGEgZnVuY3Rpb24sIHRoYXQsIGFzIGxvbmcgYXMgaXQgY29udGludWVzIHRvIGJlIGludm9rZWQsIHdpbGwgbm90XG4gIC8vIGJlIHRyaWdnZXJlZC4gVGhlIGZ1bmN0aW9uIHdpbGwgYmUgY2FsbGVkIGFmdGVyIGl0IHN0b3BzIGJlaW5nIGNhbGxlZCBmb3JcbiAgLy8gTiBtaWxsaXNlY29uZHMuIElmIGBpbW1lZGlhdGVgIGlzIHBhc3NlZCwgdHJpZ2dlciB0aGUgZnVuY3Rpb24gb24gdGhlXG4gIC8vIGxlYWRpbmcgZWRnZSwgaW5zdGVhZCBvZiB0aGUgdHJhaWxpbmcuXG4gIF8uZGVib3VuY2UgPSBmdW5jdGlvbihmdW5jLCB3YWl0LCBpbW1lZGlhdGUpIHtcbiAgICB2YXIgdGltZW91dCwgYXJncywgY29udGV4dCwgdGltZXN0YW1wLCByZXN1bHQ7XG5cbiAgICB2YXIgbGF0ZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBsYXN0ID0gXy5ub3coKSAtIHRpbWVzdGFtcDtcbiAgICAgIGlmIChsYXN0IDwgd2FpdCkge1xuICAgICAgICB0aW1lb3V0ID0gc2V0VGltZW91dChsYXRlciwgd2FpdCAtIGxhc3QpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGltZW91dCA9IG51bGw7XG4gICAgICAgIGlmICghaW1tZWRpYXRlKSB7XG4gICAgICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseShjb250ZXh0LCBhcmdzKTtcbiAgICAgICAgICBjb250ZXh0ID0gYXJncyA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuXG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgY29udGV4dCA9IHRoaXM7XG4gICAgICBhcmdzID0gYXJndW1lbnRzO1xuICAgICAgdGltZXN0YW1wID0gXy5ub3coKTtcbiAgICAgIHZhciBjYWxsTm93ID0gaW1tZWRpYXRlICYmICF0aW1lb3V0O1xuICAgICAgaWYgKCF0aW1lb3V0KSB7XG4gICAgICAgIHRpbWVvdXQgPSBzZXRUaW1lb3V0KGxhdGVyLCB3YWl0KTtcbiAgICAgIH1cbiAgICAgIGlmIChjYWxsTm93KSB7XG4gICAgICAgIHJlc3VsdCA9IGZ1bmMuYXBwbHkoY29udGV4dCwgYXJncyk7XG4gICAgICAgIGNvbnRleHQgPSBhcmdzID0gbnVsbDtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xuICB9O1xuXG4gIC8vIFJldHVybnMgYSBmdW5jdGlvbiB0aGF0IHdpbGwgYmUgZXhlY3V0ZWQgYXQgbW9zdCBvbmUgdGltZSwgbm8gbWF0dGVyIGhvd1xuICAvLyBvZnRlbiB5b3UgY2FsbCBpdC4gVXNlZnVsIGZvciBsYXp5IGluaXRpYWxpemF0aW9uLlxuICBfLm9uY2UgPSBmdW5jdGlvbihmdW5jKSB7XG4gICAgdmFyIHJhbiA9IGZhbHNlLCBtZW1vO1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIGlmIChyYW4pIHJldHVybiBtZW1vO1xuICAgICAgcmFuID0gdHJ1ZTtcbiAgICAgIG1lbW8gPSBmdW5jLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICBmdW5jID0gbnVsbDtcbiAgICAgIHJldHVybiBtZW1vO1xuICAgIH07XG4gIH07XG5cbiAgLy8gUmV0dXJucyB0aGUgZmlyc3QgZnVuY3Rpb24gcGFzc2VkIGFzIGFuIGFyZ3VtZW50IHRvIHRoZSBzZWNvbmQsXG4gIC8vIGFsbG93aW5nIHlvdSB0byBhZGp1c3QgYXJndW1lbnRzLCBydW4gY29kZSBiZWZvcmUgYW5kIGFmdGVyLCBhbmRcbiAgLy8gY29uZGl0aW9uYWxseSBleGVjdXRlIHRoZSBvcmlnaW5hbCBmdW5jdGlvbi5cbiAgXy53cmFwID0gZnVuY3Rpb24oZnVuYywgd3JhcHBlcikge1xuICAgIHJldHVybiBfLnBhcnRpYWwod3JhcHBlciwgZnVuYyk7XG4gIH07XG5cbiAgLy8gUmV0dXJucyBhIGZ1bmN0aW9uIHRoYXQgaXMgdGhlIGNvbXBvc2l0aW9uIG9mIGEgbGlzdCBvZiBmdW5jdGlvbnMsIGVhY2hcbiAgLy8gY29uc3VtaW5nIHRoZSByZXR1cm4gdmFsdWUgb2YgdGhlIGZ1bmN0aW9uIHRoYXQgZm9sbG93cy5cbiAgXy5jb21wb3NlID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGZ1bmNzID0gYXJndW1lbnRzO1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBhcmdzID0gYXJndW1lbnRzO1xuICAgICAgZm9yICh2YXIgaSA9IGZ1bmNzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgICAgIGFyZ3MgPSBbZnVuY3NbaV0uYXBwbHkodGhpcywgYXJncyldO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGFyZ3NbMF07XG4gICAgfTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIGEgZnVuY3Rpb24gdGhhdCB3aWxsIG9ubHkgYmUgZXhlY3V0ZWQgYWZ0ZXIgYmVpbmcgY2FsbGVkIE4gdGltZXMuXG4gIF8uYWZ0ZXIgPSBmdW5jdGlvbih0aW1lcywgZnVuYykge1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIGlmICgtLXRpbWVzIDwgMSkge1xuICAgICAgICByZXR1cm4gZnVuYy5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgfVxuICAgIH07XG4gIH07XG5cbiAgLy8gT2JqZWN0IEZ1bmN0aW9uc1xuICAvLyAtLS0tLS0tLS0tLS0tLS0tXG5cbiAgLy8gUmV0cmlldmUgdGhlIG5hbWVzIG9mIGFuIG9iamVjdCdzIHByb3BlcnRpZXMuXG4gIC8vIERlbGVnYXRlcyB0byAqKkVDTUFTY3JpcHQgNSoqJ3MgbmF0aXZlIGBPYmplY3Qua2V5c2BcbiAgXy5rZXlzID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgaWYgKCFfLmlzT2JqZWN0KG9iaikpIHJldHVybiBbXTtcbiAgICBpZiAobmF0aXZlS2V5cykgcmV0dXJuIG5hdGl2ZUtleXMob2JqKTtcbiAgICB2YXIga2V5cyA9IFtdO1xuICAgIGZvciAodmFyIGtleSBpbiBvYmopIGlmIChfLmhhcyhvYmosIGtleSkpIGtleXMucHVzaChrZXkpO1xuICAgIHJldHVybiBrZXlzO1xuICB9O1xuXG4gIC8vIFJldHJpZXZlIHRoZSB2YWx1ZXMgb2YgYW4gb2JqZWN0J3MgcHJvcGVydGllcy5cbiAgXy52YWx1ZXMgPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIga2V5cyA9IF8ua2V5cyhvYmopO1xuICAgIHZhciBsZW5ndGggPSBrZXlzLmxlbmd0aDtcbiAgICB2YXIgdmFsdWVzID0gbmV3IEFycmF5KGxlbmd0aCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgdmFsdWVzW2ldID0gb2JqW2tleXNbaV1dO1xuICAgIH1cbiAgICByZXR1cm4gdmFsdWVzO1xuICB9O1xuXG4gIC8vIENvbnZlcnQgYW4gb2JqZWN0IGludG8gYSBsaXN0IG9mIGBba2V5LCB2YWx1ZV1gIHBhaXJzLlxuICBfLnBhaXJzID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgdmFyIGtleXMgPSBfLmtleXMob2JqKTtcbiAgICB2YXIgbGVuZ3RoID0ga2V5cy5sZW5ndGg7XG4gICAgdmFyIHBhaXJzID0gbmV3IEFycmF5KGxlbmd0aCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgcGFpcnNbaV0gPSBba2V5c1tpXSwgb2JqW2tleXNbaV1dXTtcbiAgICB9XG4gICAgcmV0dXJuIHBhaXJzO1xuICB9O1xuXG4gIC8vIEludmVydCB0aGUga2V5cyBhbmQgdmFsdWVzIG9mIGFuIG9iamVjdC4gVGhlIHZhbHVlcyBtdXN0IGJlIHNlcmlhbGl6YWJsZS5cbiAgXy5pbnZlcnQgPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIgcmVzdWx0ID0ge307XG4gICAgdmFyIGtleXMgPSBfLmtleXMob2JqKTtcbiAgICBmb3IgKHZhciBpID0gMCwgbGVuZ3RoID0ga2V5cy5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgcmVzdWx0W29ialtrZXlzW2ldXV0gPSBrZXlzW2ldO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuXG4gIC8vIFJldHVybiBhIHNvcnRlZCBsaXN0IG9mIHRoZSBmdW5jdGlvbiBuYW1lcyBhdmFpbGFibGUgb24gdGhlIG9iamVjdC5cbiAgLy8gQWxpYXNlZCBhcyBgbWV0aG9kc2BcbiAgXy5mdW5jdGlvbnMgPSBfLm1ldGhvZHMgPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIgbmFtZXMgPSBbXTtcbiAgICBmb3IgKHZhciBrZXkgaW4gb2JqKSB7XG4gICAgICBpZiAoXy5pc0Z1bmN0aW9uKG9ialtrZXldKSkgbmFtZXMucHVzaChrZXkpO1xuICAgIH1cbiAgICByZXR1cm4gbmFtZXMuc29ydCgpO1xuICB9O1xuXG4gIC8vIEV4dGVuZCBhIGdpdmVuIG9iamVjdCB3aXRoIGFsbCB0aGUgcHJvcGVydGllcyBpbiBwYXNzZWQtaW4gb2JqZWN0KHMpLlxuICBfLmV4dGVuZCA9IGZ1bmN0aW9uKG9iaikge1xuICAgIGVhY2goc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpLCBmdW5jdGlvbihzb3VyY2UpIHtcbiAgICAgIGlmIChzb3VyY2UpIHtcbiAgICAgICAgZm9yICh2YXIgcHJvcCBpbiBzb3VyY2UpIHtcbiAgICAgICAgICBvYmpbcHJvcF0gPSBzb3VyY2VbcHJvcF07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gb2JqO1xuICB9O1xuXG4gIC8vIFJldHVybiBhIGNvcHkgb2YgdGhlIG9iamVjdCBvbmx5IGNvbnRhaW5pbmcgdGhlIHdoaXRlbGlzdGVkIHByb3BlcnRpZXMuXG4gIF8ucGljayA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHZhciBjb3B5ID0ge307XG4gICAgdmFyIGtleXMgPSBjb25jYXQuYXBwbHkoQXJyYXlQcm90bywgc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcbiAgICBlYWNoKGtleXMsIGZ1bmN0aW9uKGtleSkge1xuICAgICAgaWYgKGtleSBpbiBvYmopIGNvcHlba2V5XSA9IG9ialtrZXldO1xuICAgIH0pO1xuICAgIHJldHVybiBjb3B5O1xuICB9O1xuXG4gICAvLyBSZXR1cm4gYSBjb3B5IG9mIHRoZSBvYmplY3Qgd2l0aG91dCB0aGUgYmxhY2tsaXN0ZWQgcHJvcGVydGllcy5cbiAgXy5vbWl0ID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgdmFyIGNvcHkgPSB7fTtcbiAgICB2YXIga2V5cyA9IGNvbmNhdC5hcHBseShBcnJheVByb3RvLCBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSkpO1xuICAgIGZvciAodmFyIGtleSBpbiBvYmopIHtcbiAgICAgIGlmICghXy5jb250YWlucyhrZXlzLCBrZXkpKSBjb3B5W2tleV0gPSBvYmpba2V5XTtcbiAgICB9XG4gICAgcmV0dXJuIGNvcHk7XG4gIH07XG5cbiAgLy8gRmlsbCBpbiBhIGdpdmVuIG9iamVjdCB3aXRoIGRlZmF1bHQgcHJvcGVydGllcy5cbiAgXy5kZWZhdWx0cyA9IGZ1bmN0aW9uKG9iaikge1xuICAgIGVhY2goc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpLCBmdW5jdGlvbihzb3VyY2UpIHtcbiAgICAgIGlmIChzb3VyY2UpIHtcbiAgICAgICAgZm9yICh2YXIgcHJvcCBpbiBzb3VyY2UpIHtcbiAgICAgICAgICBpZiAob2JqW3Byb3BdID09PSB2b2lkIDApIG9ialtwcm9wXSA9IHNvdXJjZVtwcm9wXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBvYmo7XG4gIH07XG5cbiAgLy8gQ3JlYXRlIGEgKHNoYWxsb3ctY2xvbmVkKSBkdXBsaWNhdGUgb2YgYW4gb2JqZWN0LlxuICBfLmNsb25lID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgaWYgKCFfLmlzT2JqZWN0KG9iaikpIHJldHVybiBvYmo7XG4gICAgcmV0dXJuIF8uaXNBcnJheShvYmopID8gb2JqLnNsaWNlKCkgOiBfLmV4dGVuZCh7fSwgb2JqKTtcbiAgfTtcblxuICAvLyBJbnZva2VzIGludGVyY2VwdG9yIHdpdGggdGhlIG9iaiwgYW5kIHRoZW4gcmV0dXJucyBvYmouXG4gIC8vIFRoZSBwcmltYXJ5IHB1cnBvc2Ugb2YgdGhpcyBtZXRob2QgaXMgdG8gXCJ0YXAgaW50b1wiIGEgbWV0aG9kIGNoYWluLCBpblxuICAvLyBvcmRlciB0byBwZXJmb3JtIG9wZXJhdGlvbnMgb24gaW50ZXJtZWRpYXRlIHJlc3VsdHMgd2l0aGluIHRoZSBjaGFpbi5cbiAgXy50YXAgPSBmdW5jdGlvbihvYmosIGludGVyY2VwdG9yKSB7XG4gICAgaW50ZXJjZXB0b3Iob2JqKTtcbiAgICByZXR1cm4gb2JqO1xuICB9O1xuXG4gIC8vIEludGVybmFsIHJlY3Vyc2l2ZSBjb21wYXJpc29uIGZ1bmN0aW9uIGZvciBgaXNFcXVhbGAuXG4gIHZhciBlcSA9IGZ1bmN0aW9uKGEsIGIsIGFTdGFjaywgYlN0YWNrKSB7XG4gICAgLy8gSWRlbnRpY2FsIG9iamVjdHMgYXJlIGVxdWFsLiBgMCA9PT0gLTBgLCBidXQgdGhleSBhcmVuJ3QgaWRlbnRpY2FsLlxuICAgIC8vIFNlZSB0aGUgW0hhcm1vbnkgYGVnYWxgIHByb3Bvc2FsXShodHRwOi8vd2lraS5lY21hc2NyaXB0Lm9yZy9kb2t1LnBocD9pZD1oYXJtb255OmVnYWwpLlxuICAgIGlmIChhID09PSBiKSByZXR1cm4gYSAhPT0gMCB8fCAxIC8gYSA9PSAxIC8gYjtcbiAgICAvLyBBIHN0cmljdCBjb21wYXJpc29uIGlzIG5lY2Vzc2FyeSBiZWNhdXNlIGBudWxsID09IHVuZGVmaW5lZGAuXG4gICAgaWYgKGEgPT0gbnVsbCB8fCBiID09IG51bGwpIHJldHVybiBhID09PSBiO1xuICAgIC8vIFVud3JhcCBhbnkgd3JhcHBlZCBvYmplY3RzLlxuICAgIGlmIChhIGluc3RhbmNlb2YgXykgYSA9IGEuX3dyYXBwZWQ7XG4gICAgaWYgKGIgaW5zdGFuY2VvZiBfKSBiID0gYi5fd3JhcHBlZDtcbiAgICAvLyBDb21wYXJlIGBbW0NsYXNzXV1gIG5hbWVzLlxuICAgIHZhciBjbGFzc05hbWUgPSB0b1N0cmluZy5jYWxsKGEpO1xuICAgIGlmIChjbGFzc05hbWUgIT0gdG9TdHJpbmcuY2FsbChiKSkgcmV0dXJuIGZhbHNlO1xuICAgIHN3aXRjaCAoY2xhc3NOYW1lKSB7XG4gICAgICAvLyBTdHJpbmdzLCBudW1iZXJzLCBkYXRlcywgYW5kIGJvb2xlYW5zIGFyZSBjb21wYXJlZCBieSB2YWx1ZS5cbiAgICAgIGNhc2UgJ1tvYmplY3QgU3RyaW5nXSc6XG4gICAgICAgIC8vIFByaW1pdGl2ZXMgYW5kIHRoZWlyIGNvcnJlc3BvbmRpbmcgb2JqZWN0IHdyYXBwZXJzIGFyZSBlcXVpdmFsZW50OyB0aHVzLCBgXCI1XCJgIGlzXG4gICAgICAgIC8vIGVxdWl2YWxlbnQgdG8gYG5ldyBTdHJpbmcoXCI1XCIpYC5cbiAgICAgICAgcmV0dXJuIGEgPT0gU3RyaW5nKGIpO1xuICAgICAgY2FzZSAnW29iamVjdCBOdW1iZXJdJzpcbiAgICAgICAgLy8gYE5hTmBzIGFyZSBlcXVpdmFsZW50LCBidXQgbm9uLXJlZmxleGl2ZS4gQW4gYGVnYWxgIGNvbXBhcmlzb24gaXMgcGVyZm9ybWVkIGZvclxuICAgICAgICAvLyBvdGhlciBudW1lcmljIHZhbHVlcy5cbiAgICAgICAgcmV0dXJuIGEgIT0gK2EgPyBiICE9ICtiIDogKGEgPT0gMCA/IDEgLyBhID09IDEgLyBiIDogYSA9PSArYik7XG4gICAgICBjYXNlICdbb2JqZWN0IERhdGVdJzpcbiAgICAgIGNhc2UgJ1tvYmplY3QgQm9vbGVhbl0nOlxuICAgICAgICAvLyBDb2VyY2UgZGF0ZXMgYW5kIGJvb2xlYW5zIHRvIG51bWVyaWMgcHJpbWl0aXZlIHZhbHVlcy4gRGF0ZXMgYXJlIGNvbXBhcmVkIGJ5IHRoZWlyXG4gICAgICAgIC8vIG1pbGxpc2Vjb25kIHJlcHJlc2VudGF0aW9ucy4gTm90ZSB0aGF0IGludmFsaWQgZGF0ZXMgd2l0aCBtaWxsaXNlY29uZCByZXByZXNlbnRhdGlvbnNcbiAgICAgICAgLy8gb2YgYE5hTmAgYXJlIG5vdCBlcXVpdmFsZW50LlxuICAgICAgICByZXR1cm4gK2EgPT0gK2I7XG4gICAgICAvLyBSZWdFeHBzIGFyZSBjb21wYXJlZCBieSB0aGVpciBzb3VyY2UgcGF0dGVybnMgYW5kIGZsYWdzLlxuICAgICAgY2FzZSAnW29iamVjdCBSZWdFeHBdJzpcbiAgICAgICAgcmV0dXJuIGEuc291cmNlID09IGIuc291cmNlICYmXG4gICAgICAgICAgICAgICBhLmdsb2JhbCA9PSBiLmdsb2JhbCAmJlxuICAgICAgICAgICAgICAgYS5tdWx0aWxpbmUgPT0gYi5tdWx0aWxpbmUgJiZcbiAgICAgICAgICAgICAgIGEuaWdub3JlQ2FzZSA9PSBiLmlnbm9yZUNhc2U7XG4gICAgfVxuICAgIGlmICh0eXBlb2YgYSAhPSAnb2JqZWN0JyB8fCB0eXBlb2YgYiAhPSAnb2JqZWN0JykgcmV0dXJuIGZhbHNlO1xuICAgIC8vIEFzc3VtZSBlcXVhbGl0eSBmb3IgY3ljbGljIHN0cnVjdHVyZXMuIFRoZSBhbGdvcml0aG0gZm9yIGRldGVjdGluZyBjeWNsaWNcbiAgICAvLyBzdHJ1Y3R1cmVzIGlzIGFkYXB0ZWQgZnJvbSBFUyA1LjEgc2VjdGlvbiAxNS4xMi4zLCBhYnN0cmFjdCBvcGVyYXRpb24gYEpPYC5cbiAgICB2YXIgbGVuZ3RoID0gYVN0YWNrLmxlbmd0aDtcbiAgICB3aGlsZSAobGVuZ3RoLS0pIHtcbiAgICAgIC8vIExpbmVhciBzZWFyY2guIFBlcmZvcm1hbmNlIGlzIGludmVyc2VseSBwcm9wb3J0aW9uYWwgdG8gdGhlIG51bWJlciBvZlxuICAgICAgLy8gdW5pcXVlIG5lc3RlZCBzdHJ1Y3R1cmVzLlxuICAgICAgaWYgKGFTdGFja1tsZW5ndGhdID09IGEpIHJldHVybiBiU3RhY2tbbGVuZ3RoXSA9PSBiO1xuICAgIH1cbiAgICAvLyBPYmplY3RzIHdpdGggZGlmZmVyZW50IGNvbnN0cnVjdG9ycyBhcmUgbm90IGVxdWl2YWxlbnQsIGJ1dCBgT2JqZWN0YHNcbiAgICAvLyBmcm9tIGRpZmZlcmVudCBmcmFtZXMgYXJlLlxuICAgIHZhciBhQ3RvciA9IGEuY29uc3RydWN0b3IsIGJDdG9yID0gYi5jb25zdHJ1Y3RvcjtcbiAgICBpZiAoYUN0b3IgIT09IGJDdG9yICYmICEoXy5pc0Z1bmN0aW9uKGFDdG9yKSAmJiAoYUN0b3IgaW5zdGFuY2VvZiBhQ3RvcikgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXy5pc0Z1bmN0aW9uKGJDdG9yKSAmJiAoYkN0b3IgaW5zdGFuY2VvZiBiQ3RvcikpXG4gICAgICAgICAgICAgICAgICAgICAgICAmJiAoJ2NvbnN0cnVjdG9yJyBpbiBhICYmICdjb25zdHJ1Y3RvcicgaW4gYikpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgLy8gQWRkIHRoZSBmaXJzdCBvYmplY3QgdG8gdGhlIHN0YWNrIG9mIHRyYXZlcnNlZCBvYmplY3RzLlxuICAgIGFTdGFjay5wdXNoKGEpO1xuICAgIGJTdGFjay5wdXNoKGIpO1xuICAgIHZhciBzaXplID0gMCwgcmVzdWx0ID0gdHJ1ZTtcbiAgICAvLyBSZWN1cnNpdmVseSBjb21wYXJlIG9iamVjdHMgYW5kIGFycmF5cy5cbiAgICBpZiAoY2xhc3NOYW1lID09ICdbb2JqZWN0IEFycmF5XScpIHtcbiAgICAgIC8vIENvbXBhcmUgYXJyYXkgbGVuZ3RocyB0byBkZXRlcm1pbmUgaWYgYSBkZWVwIGNvbXBhcmlzb24gaXMgbmVjZXNzYXJ5LlxuICAgICAgc2l6ZSA9IGEubGVuZ3RoO1xuICAgICAgcmVzdWx0ID0gc2l6ZSA9PSBiLmxlbmd0aDtcbiAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgLy8gRGVlcCBjb21wYXJlIHRoZSBjb250ZW50cywgaWdub3Jpbmcgbm9uLW51bWVyaWMgcHJvcGVydGllcy5cbiAgICAgICAgd2hpbGUgKHNpemUtLSkge1xuICAgICAgICAgIGlmICghKHJlc3VsdCA9IGVxKGFbc2l6ZV0sIGJbc2l6ZV0sIGFTdGFjaywgYlN0YWNrKSkpIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIERlZXAgY29tcGFyZSBvYmplY3RzLlxuICAgICAgZm9yICh2YXIga2V5IGluIGEpIHtcbiAgICAgICAgaWYgKF8uaGFzKGEsIGtleSkpIHtcbiAgICAgICAgICAvLyBDb3VudCB0aGUgZXhwZWN0ZWQgbnVtYmVyIG9mIHByb3BlcnRpZXMuXG4gICAgICAgICAgc2l6ZSsrO1xuICAgICAgICAgIC8vIERlZXAgY29tcGFyZSBlYWNoIG1lbWJlci5cbiAgICAgICAgICBpZiAoIShyZXN1bHQgPSBfLmhhcyhiLCBrZXkpICYmIGVxKGFba2V5XSwgYltrZXldLCBhU3RhY2ssIGJTdGFjaykpKSBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgLy8gRW5zdXJlIHRoYXQgYm90aCBvYmplY3RzIGNvbnRhaW4gdGhlIHNhbWUgbnVtYmVyIG9mIHByb3BlcnRpZXMuXG4gICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgIGZvciAoa2V5IGluIGIpIHtcbiAgICAgICAgICBpZiAoXy5oYXMoYiwga2V5KSAmJiAhKHNpemUtLSkpIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIHJlc3VsdCA9ICFzaXplO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBSZW1vdmUgdGhlIGZpcnN0IG9iamVjdCBmcm9tIHRoZSBzdGFjayBvZiB0cmF2ZXJzZWQgb2JqZWN0cy5cbiAgICBhU3RhY2sucG9wKCk7XG4gICAgYlN0YWNrLnBvcCgpO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG5cbiAgLy8gUGVyZm9ybSBhIGRlZXAgY29tcGFyaXNvbiB0byBjaGVjayBpZiB0d28gb2JqZWN0cyBhcmUgZXF1YWwuXG4gIF8uaXNFcXVhbCA9IGZ1bmN0aW9uKGEsIGIpIHtcbiAgICByZXR1cm4gZXEoYSwgYiwgW10sIFtdKTtcbiAgfTtcblxuICAvLyBJcyBhIGdpdmVuIGFycmF5LCBzdHJpbmcsIG9yIG9iamVjdCBlbXB0eT9cbiAgLy8gQW4gXCJlbXB0eVwiIG9iamVjdCBoYXMgbm8gZW51bWVyYWJsZSBvd24tcHJvcGVydGllcy5cbiAgXy5pc0VtcHR5ID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm4gdHJ1ZTtcbiAgICBpZiAoXy5pc0FycmF5KG9iaikgfHwgXy5pc1N0cmluZyhvYmopKSByZXR1cm4gb2JqLmxlbmd0aCA9PT0gMDtcbiAgICBmb3IgKHZhciBrZXkgaW4gb2JqKSBpZiAoXy5oYXMob2JqLCBrZXkpKSByZXR1cm4gZmFsc2U7XG4gICAgcmV0dXJuIHRydWU7XG4gIH07XG5cbiAgLy8gSXMgYSBnaXZlbiB2YWx1ZSBhIERPTSBlbGVtZW50P1xuICBfLmlzRWxlbWVudCA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiAhIShvYmogJiYgb2JqLm5vZGVUeXBlID09PSAxKTtcbiAgfTtcblxuICAvLyBJcyBhIGdpdmVuIHZhbHVlIGFuIGFycmF5P1xuICAvLyBEZWxlZ2F0ZXMgdG8gRUNNQTUncyBuYXRpdmUgQXJyYXkuaXNBcnJheVxuICBfLmlzQXJyYXkgPSBuYXRpdmVJc0FycmF5IHx8IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiB0b1N0cmluZy5jYWxsKG9iaikgPT0gJ1tvYmplY3QgQXJyYXldJztcbiAgfTtcblxuICAvLyBJcyBhIGdpdmVuIHZhcmlhYmxlIGFuIG9iamVjdD9cbiAgXy5pc09iamVjdCA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiBvYmogPT09IE9iamVjdChvYmopO1xuICB9O1xuXG4gIC8vIEFkZCBzb21lIGlzVHlwZSBtZXRob2RzOiBpc0FyZ3VtZW50cywgaXNGdW5jdGlvbiwgaXNTdHJpbmcsIGlzTnVtYmVyLCBpc0RhdGUsIGlzUmVnRXhwLlxuICBlYWNoKFsnQXJndW1lbnRzJywgJ0Z1bmN0aW9uJywgJ1N0cmluZycsICdOdW1iZXInLCAnRGF0ZScsICdSZWdFeHAnXSwgZnVuY3Rpb24obmFtZSkge1xuICAgIF9bJ2lzJyArIG5hbWVdID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgICByZXR1cm4gdG9TdHJpbmcuY2FsbChvYmopID09ICdbb2JqZWN0ICcgKyBuYW1lICsgJ10nO1xuICAgIH07XG4gIH0pO1xuXG4gIC8vIERlZmluZSBhIGZhbGxiYWNrIHZlcnNpb24gb2YgdGhlIG1ldGhvZCBpbiBicm93c2VycyAoYWhlbSwgSUUpLCB3aGVyZVxuICAvLyB0aGVyZSBpc24ndCBhbnkgaW5zcGVjdGFibGUgXCJBcmd1bWVudHNcIiB0eXBlLlxuICBpZiAoIV8uaXNBcmd1bWVudHMoYXJndW1lbnRzKSkge1xuICAgIF8uaXNBcmd1bWVudHMgPSBmdW5jdGlvbihvYmopIHtcbiAgICAgIHJldHVybiAhIShvYmogJiYgXy5oYXMob2JqLCAnY2FsbGVlJykpO1xuICAgIH07XG4gIH1cblxuICAvLyBPcHRpbWl6ZSBgaXNGdW5jdGlvbmAgaWYgYXBwcm9wcmlhdGUuXG4gIGlmICh0eXBlb2YgKC8uLykgIT09ICdmdW5jdGlvbicpIHtcbiAgICBfLmlzRnVuY3Rpb24gPSBmdW5jdGlvbihvYmopIHtcbiAgICAgIHJldHVybiB0eXBlb2Ygb2JqID09PSAnZnVuY3Rpb24nO1xuICAgIH07XG4gIH1cblxuICAvLyBJcyBhIGdpdmVuIG9iamVjdCBhIGZpbml0ZSBudW1iZXI/XG4gIF8uaXNGaW5pdGUgPSBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gaXNGaW5pdGUob2JqKSAmJiAhaXNOYU4ocGFyc2VGbG9hdChvYmopKTtcbiAgfTtcblxuICAvLyBJcyB0aGUgZ2l2ZW4gdmFsdWUgYE5hTmA/IChOYU4gaXMgdGhlIG9ubHkgbnVtYmVyIHdoaWNoIGRvZXMgbm90IGVxdWFsIGl0c2VsZikuXG4gIF8uaXNOYU4gPSBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gXy5pc051bWJlcihvYmopICYmIG9iaiAhPSArb2JqO1xuICB9O1xuXG4gIC8vIElzIGEgZ2l2ZW4gdmFsdWUgYSBib29sZWFuP1xuICBfLmlzQm9vbGVhbiA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiBvYmogPT09IHRydWUgfHwgb2JqID09PSBmYWxzZSB8fCB0b1N0cmluZy5jYWxsKG9iaikgPT0gJ1tvYmplY3QgQm9vbGVhbl0nO1xuICB9O1xuXG4gIC8vIElzIGEgZ2l2ZW4gdmFsdWUgZXF1YWwgdG8gbnVsbD9cbiAgXy5pc051bGwgPSBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gb2JqID09PSBudWxsO1xuICB9O1xuXG4gIC8vIElzIGEgZ2l2ZW4gdmFyaWFibGUgdW5kZWZpbmVkP1xuICBfLmlzVW5kZWZpbmVkID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIG9iaiA9PT0gdm9pZCAwO1xuICB9O1xuXG4gIC8vIFNob3J0Y3V0IGZ1bmN0aW9uIGZvciBjaGVja2luZyBpZiBhbiBvYmplY3QgaGFzIGEgZ2l2ZW4gcHJvcGVydHkgZGlyZWN0bHlcbiAgLy8gb24gaXRzZWxmIChpbiBvdGhlciB3b3Jkcywgbm90IG9uIGEgcHJvdG90eXBlKS5cbiAgXy5oYXMgPSBmdW5jdGlvbihvYmosIGtleSkge1xuICAgIHJldHVybiBoYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwga2V5KTtcbiAgfTtcblxuICAvLyBVdGlsaXR5IEZ1bmN0aW9uc1xuICAvLyAtLS0tLS0tLS0tLS0tLS0tLVxuXG4gIC8vIFJ1biBVbmRlcnNjb3JlLmpzIGluICpub0NvbmZsaWN0KiBtb2RlLCByZXR1cm5pbmcgdGhlIGBfYCB2YXJpYWJsZSB0byBpdHNcbiAgLy8gcHJldmlvdXMgb3duZXIuIFJldHVybnMgYSByZWZlcmVuY2UgdG8gdGhlIFVuZGVyc2NvcmUgb2JqZWN0LlxuICBfLm5vQ29uZmxpY3QgPSBmdW5jdGlvbigpIHtcbiAgICByb290Ll8gPSBwcmV2aW91c1VuZGVyc2NvcmU7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgLy8gS2VlcCB0aGUgaWRlbnRpdHkgZnVuY3Rpb24gYXJvdW5kIGZvciBkZWZhdWx0IGl0ZXJhdG9ycy5cbiAgXy5pZGVudGl0eSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9O1xuXG4gIF8uY29uc3RhbnQgPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfTtcbiAgfTtcblxuICBfLnByb3BlcnR5ID0gZnVuY3Rpb24oa2V5KSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKG9iaikge1xuICAgICAgcmV0dXJuIG9ialtrZXldO1xuICAgIH07XG4gIH07XG5cbiAgLy8gUmV0dXJucyBhIHByZWRpY2F0ZSBmb3IgY2hlY2tpbmcgd2hldGhlciBhbiBvYmplY3QgaGFzIGEgZ2l2ZW4gc2V0IG9mIGBrZXk6dmFsdWVgIHBhaXJzLlxuICBfLm1hdGNoZXMgPSBmdW5jdGlvbihhdHRycykge1xuICAgIHJldHVybiBmdW5jdGlvbihvYmopIHtcbiAgICAgIGlmIChvYmogPT09IGF0dHJzKSByZXR1cm4gdHJ1ZTsgLy9hdm9pZCBjb21wYXJpbmcgYW4gb2JqZWN0IHRvIGl0c2VsZi5cbiAgICAgIGZvciAodmFyIGtleSBpbiBhdHRycykge1xuICAgICAgICBpZiAoYXR0cnNba2V5XSAhPT0gb2JqW2tleV0pXG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9O1xuXG4gIC8vIFJ1biBhIGZ1bmN0aW9uICoqbioqIHRpbWVzLlxuICBfLnRpbWVzID0gZnVuY3Rpb24obiwgaXRlcmF0b3IsIGNvbnRleHQpIHtcbiAgICB2YXIgYWNjdW0gPSBBcnJheShNYXRoLm1heCgwLCBuKSk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBuOyBpKyspIGFjY3VtW2ldID0gaXRlcmF0b3IuY2FsbChjb250ZXh0LCBpKTtcbiAgICByZXR1cm4gYWNjdW07XG4gIH07XG5cbiAgLy8gUmV0dXJuIGEgcmFuZG9tIGludGVnZXIgYmV0d2VlbiBtaW4gYW5kIG1heCAoaW5jbHVzaXZlKS5cbiAgXy5yYW5kb20gPSBmdW5jdGlvbihtaW4sIG1heCkge1xuICAgIGlmIChtYXggPT0gbnVsbCkge1xuICAgICAgbWF4ID0gbWluO1xuICAgICAgbWluID0gMDtcbiAgICB9XG4gICAgcmV0dXJuIG1pbiArIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIChtYXggLSBtaW4gKyAxKSk7XG4gIH07XG5cbiAgLy8gQSAocG9zc2libHkgZmFzdGVyKSB3YXkgdG8gZ2V0IHRoZSBjdXJyZW50IHRpbWVzdGFtcCBhcyBhbiBpbnRlZ2VyLlxuICBfLm5vdyA9IERhdGUubm93IHx8IGZ1bmN0aW9uKCkgeyByZXR1cm4gbmV3IERhdGUoKS5nZXRUaW1lKCk7IH07XG5cbiAgLy8gTGlzdCBvZiBIVE1MIGVudGl0aWVzIGZvciBlc2NhcGluZy5cbiAgdmFyIGVudGl0eU1hcCA9IHtcbiAgICBlc2NhcGU6IHtcbiAgICAgICcmJzogJyZhbXA7JyxcbiAgICAgICc8JzogJyZsdDsnLFxuICAgICAgJz4nOiAnJmd0OycsXG4gICAgICAnXCInOiAnJnF1b3Q7JyxcbiAgICAgIFwiJ1wiOiAnJiN4Mjc7J1xuICAgIH1cbiAgfTtcbiAgZW50aXR5TWFwLnVuZXNjYXBlID0gXy5pbnZlcnQoZW50aXR5TWFwLmVzY2FwZSk7XG5cbiAgLy8gUmVnZXhlcyBjb250YWluaW5nIHRoZSBrZXlzIGFuZCB2YWx1ZXMgbGlzdGVkIGltbWVkaWF0ZWx5IGFib3ZlLlxuICB2YXIgZW50aXR5UmVnZXhlcyA9IHtcbiAgICBlc2NhcGU6ICAgbmV3IFJlZ0V4cCgnWycgKyBfLmtleXMoZW50aXR5TWFwLmVzY2FwZSkuam9pbignJykgKyAnXScsICdnJyksXG4gICAgdW5lc2NhcGU6IG5ldyBSZWdFeHAoJygnICsgXy5rZXlzKGVudGl0eU1hcC51bmVzY2FwZSkuam9pbignfCcpICsgJyknLCAnZycpXG4gIH07XG5cbiAgLy8gRnVuY3Rpb25zIGZvciBlc2NhcGluZyBhbmQgdW5lc2NhcGluZyBzdHJpbmdzIHRvL2Zyb20gSFRNTCBpbnRlcnBvbGF0aW9uLlxuICBfLmVhY2goWydlc2NhcGUnLCAndW5lc2NhcGUnXSwgZnVuY3Rpb24obWV0aG9kKSB7XG4gICAgX1ttZXRob2RdID0gZnVuY3Rpb24oc3RyaW5nKSB7XG4gICAgICBpZiAoc3RyaW5nID09IG51bGwpIHJldHVybiAnJztcbiAgICAgIHJldHVybiAoJycgKyBzdHJpbmcpLnJlcGxhY2UoZW50aXR5UmVnZXhlc1ttZXRob2RdLCBmdW5jdGlvbihtYXRjaCkge1xuICAgICAgICByZXR1cm4gZW50aXR5TWFwW21ldGhvZF1bbWF0Y2hdO1xuICAgICAgfSk7XG4gICAgfTtcbiAgfSk7XG5cbiAgLy8gSWYgdGhlIHZhbHVlIG9mIHRoZSBuYW1lZCBgcHJvcGVydHlgIGlzIGEgZnVuY3Rpb24gdGhlbiBpbnZva2UgaXQgd2l0aCB0aGVcbiAgLy8gYG9iamVjdGAgYXMgY29udGV4dDsgb3RoZXJ3aXNlLCByZXR1cm4gaXQuXG4gIF8ucmVzdWx0ID0gZnVuY3Rpb24ob2JqZWN0LCBwcm9wZXJ0eSkge1xuICAgIGlmIChvYmplY3QgPT0gbnVsbCkgcmV0dXJuIHZvaWQgMDtcbiAgICB2YXIgdmFsdWUgPSBvYmplY3RbcHJvcGVydHldO1xuICAgIHJldHVybiBfLmlzRnVuY3Rpb24odmFsdWUpID8gdmFsdWUuY2FsbChvYmplY3QpIDogdmFsdWU7XG4gIH07XG5cbiAgLy8gQWRkIHlvdXIgb3duIGN1c3RvbSBmdW5jdGlvbnMgdG8gdGhlIFVuZGVyc2NvcmUgb2JqZWN0LlxuICBfLm1peGluID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgZWFjaChfLmZ1bmN0aW9ucyhvYmopLCBmdW5jdGlvbihuYW1lKSB7XG4gICAgICB2YXIgZnVuYyA9IF9bbmFtZV0gPSBvYmpbbmFtZV07XG4gICAgICBfLnByb3RvdHlwZVtuYW1lXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgYXJncyA9IFt0aGlzLl93cmFwcGVkXTtcbiAgICAgICAgcHVzaC5hcHBseShhcmdzLCBhcmd1bWVudHMpO1xuICAgICAgICByZXR1cm4gcmVzdWx0LmNhbGwodGhpcywgZnVuYy5hcHBseShfLCBhcmdzKSk7XG4gICAgICB9O1xuICAgIH0pO1xuICB9O1xuXG4gIC8vIEdlbmVyYXRlIGEgdW5pcXVlIGludGVnZXIgaWQgKHVuaXF1ZSB3aXRoaW4gdGhlIGVudGlyZSBjbGllbnQgc2Vzc2lvbikuXG4gIC8vIFVzZWZ1bCBmb3IgdGVtcG9yYXJ5IERPTSBpZHMuXG4gIHZhciBpZENvdW50ZXIgPSAwO1xuICBfLnVuaXF1ZUlkID0gZnVuY3Rpb24ocHJlZml4KSB7XG4gICAgdmFyIGlkID0gKytpZENvdW50ZXIgKyAnJztcbiAgICByZXR1cm4gcHJlZml4ID8gcHJlZml4ICsgaWQgOiBpZDtcbiAgfTtcblxuICAvLyBCeSBkZWZhdWx0LCBVbmRlcnNjb3JlIHVzZXMgRVJCLXN0eWxlIHRlbXBsYXRlIGRlbGltaXRlcnMsIGNoYW5nZSB0aGVcbiAgLy8gZm9sbG93aW5nIHRlbXBsYXRlIHNldHRpbmdzIHRvIHVzZSBhbHRlcm5hdGl2ZSBkZWxpbWl0ZXJzLlxuICBfLnRlbXBsYXRlU2V0dGluZ3MgPSB7XG4gICAgZXZhbHVhdGUgICAgOiAvPCUoW1xcc1xcU10rPyklPi9nLFxuICAgIGludGVycG9sYXRlIDogLzwlPShbXFxzXFxTXSs/KSU+L2csXG4gICAgZXNjYXBlICAgICAgOiAvPCUtKFtcXHNcXFNdKz8pJT4vZ1xuICB9O1xuXG4gIC8vIFdoZW4gY3VzdG9taXppbmcgYHRlbXBsYXRlU2V0dGluZ3NgLCBpZiB5b3UgZG9uJ3Qgd2FudCB0byBkZWZpbmUgYW5cbiAgLy8gaW50ZXJwb2xhdGlvbiwgZXZhbHVhdGlvbiBvciBlc2NhcGluZyByZWdleCwgd2UgbmVlZCBvbmUgdGhhdCBpc1xuICAvLyBndWFyYW50ZWVkIG5vdCB0byBtYXRjaC5cbiAgdmFyIG5vTWF0Y2ggPSAvKC4pXi87XG5cbiAgLy8gQ2VydGFpbiBjaGFyYWN0ZXJzIG5lZWQgdG8gYmUgZXNjYXBlZCBzbyB0aGF0IHRoZXkgY2FuIGJlIHB1dCBpbnRvIGFcbiAgLy8gc3RyaW5nIGxpdGVyYWwuXG4gIHZhciBlc2NhcGVzID0ge1xuICAgIFwiJ1wiOiAgICAgIFwiJ1wiLFxuICAgICdcXFxcJzogICAgICdcXFxcJyxcbiAgICAnXFxyJzogICAgICdyJyxcbiAgICAnXFxuJzogICAgICduJyxcbiAgICAnXFx0JzogICAgICd0JyxcbiAgICAnXFx1MjAyOCc6ICd1MjAyOCcsXG4gICAgJ1xcdTIwMjknOiAndTIwMjknXG4gIH07XG5cbiAgdmFyIGVzY2FwZXIgPSAvXFxcXHwnfFxccnxcXG58XFx0fFxcdTIwMjh8XFx1MjAyOS9nO1xuXG4gIC8vIEphdmFTY3JpcHQgbWljcm8tdGVtcGxhdGluZywgc2ltaWxhciB0byBKb2huIFJlc2lnJ3MgaW1wbGVtZW50YXRpb24uXG4gIC8vIFVuZGVyc2NvcmUgdGVtcGxhdGluZyBoYW5kbGVzIGFyYml0cmFyeSBkZWxpbWl0ZXJzLCBwcmVzZXJ2ZXMgd2hpdGVzcGFjZSxcbiAgLy8gYW5kIGNvcnJlY3RseSBlc2NhcGVzIHF1b3RlcyB3aXRoaW4gaW50ZXJwb2xhdGVkIGNvZGUuXG4gIF8udGVtcGxhdGUgPSBmdW5jdGlvbih0ZXh0LCBkYXRhLCBzZXR0aW5ncykge1xuICAgIHZhciByZW5kZXI7XG4gICAgc2V0dGluZ3MgPSBfLmRlZmF1bHRzKHt9LCBzZXR0aW5ncywgXy50ZW1wbGF0ZVNldHRpbmdzKTtcblxuICAgIC8vIENvbWJpbmUgZGVsaW1pdGVycyBpbnRvIG9uZSByZWd1bGFyIGV4cHJlc3Npb24gdmlhIGFsdGVybmF0aW9uLlxuICAgIHZhciBtYXRjaGVyID0gbmV3IFJlZ0V4cChbXG4gICAgICAoc2V0dGluZ3MuZXNjYXBlIHx8IG5vTWF0Y2gpLnNvdXJjZSxcbiAgICAgIChzZXR0aW5ncy5pbnRlcnBvbGF0ZSB8fCBub01hdGNoKS5zb3VyY2UsXG4gICAgICAoc2V0dGluZ3MuZXZhbHVhdGUgfHwgbm9NYXRjaCkuc291cmNlXG4gICAgXS5qb2luKCd8JykgKyAnfCQnLCAnZycpO1xuXG4gICAgLy8gQ29tcGlsZSB0aGUgdGVtcGxhdGUgc291cmNlLCBlc2NhcGluZyBzdHJpbmcgbGl0ZXJhbHMgYXBwcm9wcmlhdGVseS5cbiAgICB2YXIgaW5kZXggPSAwO1xuICAgIHZhciBzb3VyY2UgPSBcIl9fcCs9J1wiO1xuICAgIHRleHQucmVwbGFjZShtYXRjaGVyLCBmdW5jdGlvbihtYXRjaCwgZXNjYXBlLCBpbnRlcnBvbGF0ZSwgZXZhbHVhdGUsIG9mZnNldCkge1xuICAgICAgc291cmNlICs9IHRleHQuc2xpY2UoaW5kZXgsIG9mZnNldClcbiAgICAgICAgLnJlcGxhY2UoZXNjYXBlciwgZnVuY3Rpb24obWF0Y2gpIHsgcmV0dXJuICdcXFxcJyArIGVzY2FwZXNbbWF0Y2hdOyB9KTtcblxuICAgICAgaWYgKGVzY2FwZSkge1xuICAgICAgICBzb3VyY2UgKz0gXCInK1xcbigoX190PShcIiArIGVzY2FwZSArIFwiKSk9PW51bGw/Jyc6Xy5lc2NhcGUoX190KSkrXFxuJ1wiO1xuICAgICAgfVxuICAgICAgaWYgKGludGVycG9sYXRlKSB7XG4gICAgICAgIHNvdXJjZSArPSBcIicrXFxuKChfX3Q9KFwiICsgaW50ZXJwb2xhdGUgKyBcIikpPT1udWxsPycnOl9fdCkrXFxuJ1wiO1xuICAgICAgfVxuICAgICAgaWYgKGV2YWx1YXRlKSB7XG4gICAgICAgIHNvdXJjZSArPSBcIic7XFxuXCIgKyBldmFsdWF0ZSArIFwiXFxuX19wKz0nXCI7XG4gICAgICB9XG4gICAgICBpbmRleCA9IG9mZnNldCArIG1hdGNoLmxlbmd0aDtcbiAgICAgIHJldHVybiBtYXRjaDtcbiAgICB9KTtcbiAgICBzb3VyY2UgKz0gXCInO1xcblwiO1xuXG4gICAgLy8gSWYgYSB2YXJpYWJsZSBpcyBub3Qgc3BlY2lmaWVkLCBwbGFjZSBkYXRhIHZhbHVlcyBpbiBsb2NhbCBzY29wZS5cbiAgICBpZiAoIXNldHRpbmdzLnZhcmlhYmxlKSBzb3VyY2UgPSAnd2l0aChvYmp8fHt9KXtcXG4nICsgc291cmNlICsgJ31cXG4nO1xuXG4gICAgc291cmNlID0gXCJ2YXIgX190LF9fcD0nJyxfX2o9QXJyYXkucHJvdG90eXBlLmpvaW4sXCIgK1xuICAgICAgXCJwcmludD1mdW5jdGlvbigpe19fcCs9X19qLmNhbGwoYXJndW1lbnRzLCcnKTt9O1xcblwiICtcbiAgICAgIHNvdXJjZSArIFwicmV0dXJuIF9fcDtcXG5cIjtcblxuICAgIHRyeSB7XG4gICAgICByZW5kZXIgPSBuZXcgRnVuY3Rpb24oc2V0dGluZ3MudmFyaWFibGUgfHwgJ29iaicsICdfJywgc291cmNlKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBlLnNvdXJjZSA9IHNvdXJjZTtcbiAgICAgIHRocm93IGU7XG4gICAgfVxuXG4gICAgaWYgKGRhdGEpIHJldHVybiByZW5kZXIoZGF0YSwgXyk7XG4gICAgdmFyIHRlbXBsYXRlID0gZnVuY3Rpb24oZGF0YSkge1xuICAgICAgcmV0dXJuIHJlbmRlci5jYWxsKHRoaXMsIGRhdGEsIF8pO1xuICAgIH07XG5cbiAgICAvLyBQcm92aWRlIHRoZSBjb21waWxlZCBmdW5jdGlvbiBzb3VyY2UgYXMgYSBjb252ZW5pZW5jZSBmb3IgcHJlY29tcGlsYXRpb24uXG4gICAgdGVtcGxhdGUuc291cmNlID0gJ2Z1bmN0aW9uKCcgKyAoc2V0dGluZ3MudmFyaWFibGUgfHwgJ29iaicpICsgJyl7XFxuJyArIHNvdXJjZSArICd9JztcblxuICAgIHJldHVybiB0ZW1wbGF0ZTtcbiAgfTtcblxuICAvLyBBZGQgYSBcImNoYWluXCIgZnVuY3Rpb24sIHdoaWNoIHdpbGwgZGVsZWdhdGUgdG8gdGhlIHdyYXBwZXIuXG4gIF8uY2hhaW4gPSBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gXyhvYmopLmNoYWluKCk7XG4gIH07XG5cbiAgLy8gT09QXG4gIC8vIC0tLS0tLS0tLS0tLS0tLVxuICAvLyBJZiBVbmRlcnNjb3JlIGlzIGNhbGxlZCBhcyBhIGZ1bmN0aW9uLCBpdCByZXR1cm5zIGEgd3JhcHBlZCBvYmplY3QgdGhhdFxuICAvLyBjYW4gYmUgdXNlZCBPTy1zdHlsZS4gVGhpcyB3cmFwcGVyIGhvbGRzIGFsdGVyZWQgdmVyc2lvbnMgb2YgYWxsIHRoZVxuICAvLyB1bmRlcnNjb3JlIGZ1bmN0aW9ucy4gV3JhcHBlZCBvYmplY3RzIG1heSBiZSBjaGFpbmVkLlxuXG4gIC8vIEhlbHBlciBmdW5jdGlvbiB0byBjb250aW51ZSBjaGFpbmluZyBpbnRlcm1lZGlhdGUgcmVzdWx0cy5cbiAgdmFyIHJlc3VsdCA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiB0aGlzLl9jaGFpbiA/IF8ob2JqKS5jaGFpbigpIDogb2JqO1xuICB9O1xuXG4gIC8vIEFkZCBhbGwgb2YgdGhlIFVuZGVyc2NvcmUgZnVuY3Rpb25zIHRvIHRoZSB3cmFwcGVyIG9iamVjdC5cbiAgXy5taXhpbihfKTtcblxuICAvLyBBZGQgYWxsIG11dGF0b3IgQXJyYXkgZnVuY3Rpb25zIHRvIHRoZSB3cmFwcGVyLlxuICBlYWNoKFsncG9wJywgJ3B1c2gnLCAncmV2ZXJzZScsICdzaGlmdCcsICdzb3J0JywgJ3NwbGljZScsICd1bnNoaWZ0J10sIGZ1bmN0aW9uKG5hbWUpIHtcbiAgICB2YXIgbWV0aG9kID0gQXJyYXlQcm90b1tuYW1lXTtcbiAgICBfLnByb3RvdHlwZVtuYW1lXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIG9iaiA9IHRoaXMuX3dyYXBwZWQ7XG4gICAgICBtZXRob2QuYXBwbHkob2JqLCBhcmd1bWVudHMpO1xuICAgICAgaWYgKChuYW1lID09ICdzaGlmdCcgfHwgbmFtZSA9PSAnc3BsaWNlJykgJiYgb2JqLmxlbmd0aCA9PT0gMCkgZGVsZXRlIG9ialswXTtcbiAgICAgIHJldHVybiByZXN1bHQuY2FsbCh0aGlzLCBvYmopO1xuICAgIH07XG4gIH0pO1xuXG4gIC8vIEFkZCBhbGwgYWNjZXNzb3IgQXJyYXkgZnVuY3Rpb25zIHRvIHRoZSB3cmFwcGVyLlxuICBlYWNoKFsnY29uY2F0JywgJ2pvaW4nLCAnc2xpY2UnXSwgZnVuY3Rpb24obmFtZSkge1xuICAgIHZhciBtZXRob2QgPSBBcnJheVByb3RvW25hbWVdO1xuICAgIF8ucHJvdG90eXBlW25hbWVdID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gcmVzdWx0LmNhbGwodGhpcywgbWV0aG9kLmFwcGx5KHRoaXMuX3dyYXBwZWQsIGFyZ3VtZW50cykpO1xuICAgIH07XG4gIH0pO1xuXG4gIF8uZXh0ZW5kKF8ucHJvdG90eXBlLCB7XG5cbiAgICAvLyBTdGFydCBjaGFpbmluZyBhIHdyYXBwZWQgVW5kZXJzY29yZSBvYmplY3QuXG4gICAgY2hhaW46IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5fY2hhaW4gPSB0cnVlO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIC8vIEV4dHJhY3RzIHRoZSByZXN1bHQgZnJvbSBhIHdyYXBwZWQgYW5kIGNoYWluZWQgb2JqZWN0LlxuICAgIHZhbHVlOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLl93cmFwcGVkO1xuICAgIH1cblxuICB9KTtcblxuICAvLyBBTUQgcmVnaXN0cmF0aW9uIGhhcHBlbnMgYXQgdGhlIGVuZCBmb3IgY29tcGF0aWJpbGl0eSB3aXRoIEFNRCBsb2FkZXJzXG4gIC8vIHRoYXQgbWF5IG5vdCBlbmZvcmNlIG5leHQtdHVybiBzZW1hbnRpY3Mgb24gbW9kdWxlcy4gRXZlbiB0aG91Z2ggZ2VuZXJhbFxuICAvLyBwcmFjdGljZSBmb3IgQU1EIHJlZ2lzdHJhdGlvbiBpcyB0byBiZSBhbm9ueW1vdXMsIHVuZGVyc2NvcmUgcmVnaXN0ZXJzXG4gIC8vIGFzIGEgbmFtZWQgbW9kdWxlIGJlY2F1c2UsIGxpa2UgalF1ZXJ5LCBpdCBpcyBhIGJhc2UgbGlicmFyeSB0aGF0IGlzXG4gIC8vIHBvcHVsYXIgZW5vdWdoIHRvIGJlIGJ1bmRsZWQgaW4gYSB0aGlyZCBwYXJ0eSBsaWIsIGJ1dCBub3QgYmUgcGFydCBvZlxuICAvLyBhbiBBTUQgbG9hZCByZXF1ZXN0LiBUaG9zZSBjYXNlcyBjb3VsZCBnZW5lcmF0ZSBhbiBlcnJvciB3aGVuIGFuXG4gIC8vIGFub255bW91cyBkZWZpbmUoKSBpcyBjYWxsZWQgb3V0c2lkZSBvZiBhIGxvYWRlciByZXF1ZXN0LlxuICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgZGVmaW5lKCd1bmRlcnNjb3JlJywgW10sIGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIF87XG4gICAgfSk7XG4gIH1cbn0pLmNhbGwodGhpcyk7XG4iLCJ2YXIgcmVwb3J0ZXJzID0ge1xuICAgIFwiQS5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlX3JlZ2lvbmFsXCIsXG4gICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkEuXCI6IFt7XCJ5ZWFyXCI6MTg4NSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxOTM4LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XSxcbiAgICAgICAgICAgICAgICAgICAgICAgICBcIkEuMmRcIjogW3tcInllYXJcIjoxOTM4LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MjAxMCwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgXCJBLjNkXCI6IFt7XCJ5ZWFyXCI6MjAxMCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7Y3RcIixcInVzO2RlXCIsXCJ1cztkY1wiLFwidXM7bWVcIixcInVzO21kXCIsXCJ1cztuaFwiLFwidXM7bmpcIixcInVzO3BhXCIsXCJ1cztyaVwiLFwidXM7dnRcIl0sXG4gICAgICAgICAgICBcIm5hbWVcIjogXCJBdGxhbnRpYyBSZXBvcnRlclwiLFxuICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkEuIDJkXCI6IFwiQS4yZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJBLiAzZFwiOiBcIkEuM2RcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQS5SLlwiOiBcIkEuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBcIkEuUmVwLlwiOiBcIkEuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBcIkF0LlwiOiBcIkEuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBcIkF0bC5cIjogXCJBLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJBdGwuMmRcIjogXCJBLjJkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBcIkF0bC5SLlwiOiBcIkEuXCJ9fV0sXG4gICAgXCJBLkQuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkEuRC5cIjogW3tcInllYXJcIjoxODk2LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxOTU1LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQS5ELjJkXCI6IFt7XCJ5ZWFyXCI6MTk1NSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoyMDA0LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQS5ELjNkXCI6IFt7XCJ5ZWFyXCI6MjAwMywgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bnlcIl0sXG4gICAgICAgICAgICAgIFwibmFtZVwiOiBcIk5ldyBZb3JrIFN1cHJlbWUgQ291cnQgQXBwZWxsYXRlIERpdmlzaW9uIFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkEuRC4gMmRcIjogXCJBLkQuMmRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJBLkQuIDNkXCI6IFwiQS5ELjNkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQUQgMmRcIjogXCJBLkQuMmRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJBRCAzZFwiOiBcIkEuRC4zZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkFwLlwiOiBcIkEuRC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJBcC4yZC5cIjogXCJBLkQuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQXBwLkRpdi5cIjogXCJBLkQuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQXBwLkRpdi4oTi5ZLilcIjogXCJBLkQuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQXBwLkRpdi4yZC5cIjogXCJBLkQuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTi5ZLkFwcC5EZWMuXCI6IFwiQS5ELlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk4uWS5BcHAuRGl2LlwiOiBcIkEuRC5cIn19XSxcbiAgICBcIkEuSy4gTWFyc2guXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJBLksuIE1hcnNoLlwiOiBbe1wieWVhclwiOjE4MTcsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTgyMSwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2t5XCJdLFxuICAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiS2VudHVja3kgUmVwb3J0cywgTWFyc2hhbGwsIEEuSy5cIixcbiAgICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJLeS4oQS5LLk1hcnNoLilcIjogXCJBLksuIE1hcnNoLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJNYXIuXCI6IFwiQS5LLiBNYXJzaC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTWFyc2guXCI6IFwiQS5LLiBNYXJzaC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTWFyc2guKEt5LilcIjogXCJBLksuIE1hcnNoLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJNYXJzaC5BLksuXCI6IFwiQS5LLiBNYXJzaC5cIn19XSxcbiAgICBcIkFaXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJuZXV0cmFsXCIsXG4gICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkFaXCI6IFt7XCJ5ZWFyXCI6MTc1MCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2F6XCJdLFxuICAgICAgICAgICAgXCJuYW1lXCI6IFwiQXJpem9uYSBOZXV0cmFsIENpdGF0aW9uXCIsXG4gICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge319XSxcbiAgICBcIkFiYi4gTi4gQ2FzLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkFiYi4gTi4gQ2FzLlwiOiBbe1wieWVhclwiOjE4NzYsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODk0LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO255XCJdLFxuICAgICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIkFiYm90dCdzIE5ldyBDYXNlc1wiLFxuICAgICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJBLk4uXCI6IFwiQWJiLiBOLiBDYXMuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJBLk4uQy5cIjogXCJBYmIuIE4uIENhcy5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkFiYi5OLkMuXCI6IFwiQWJiLiBOLiBDYXMuXCJ9fV0sXG4gICAgXCJBYmIuIFByLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiQWJiLiBQci5cIjogW3tcInllYXJcIjoxODU0LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4NzUsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztueVwiXSxcbiAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIkFiYm90dCdzIFByYWN0aWNlIFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJBYmIuUC5SLlwiOiBcIkFiYi4gUHIuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkFiYi5Qci5SZXAuXCI6IFwiQWJiLiBQci5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQWJiLlByYWMuXCI6IFwiQWJiLiBQci5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQWJib3R0IFAuUi5cIjogXCJBYmIuIFByLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJBYmJvdHQgUHIuUmVwLlwiOiBcIkFiYi4gUHIuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkFiYm90dCBQcmFjdC5DYXMuXCI6IFwiQWJiLiBQci5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQWJib3R0J3MgUHIuUmVwLlwiOiBcIkFiYi4gUHIuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkFiYm90dCdzIFByYWMuUmVwLlwiOiBcIkFiYi4gUHIuXCJ9fV0sXG4gICAgXCJBaWsuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkFpay5cIjogW3tcInllYXJcIjoxODI1LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODI4LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1czt2dFwiXSxcbiAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiVmVybW9udCBSZXBvcnRzLCBBaWtlbnNcIixcbiAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fV0sXG4gICAgXCJBbGEuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkFsYS5cIjogW3tcInllYXJcIjoxODQwLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxOTc2LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQWxhLiAyZFwiOiBbe1wieWVhclwiOjE5NzcsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1czthbFwiXSxcbiAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiQWxhYmFtYSBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiQWxhLiBBcHAuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiQWxhLiBBcHAuXCI6IFt7XCJ5ZWFyXCI6MTkxMCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE5NzYsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7YWxcIl0sXG4gICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiQWxhYmFtYSBBcHBlbGxhdGUgQ291cnRzIFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge319XSxcbiAgICBcIkFsYXNrYVwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkFsYXNrYVwiOiBbe1wieWVhclwiOjE4ODQsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxOTU5LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2FrXCJdLFxuICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIkFsYXNrYSBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkFsay5cIjogXCJBbGFza2FcIn19XSxcbiAgICBcIkFsYXNrYSBGZWQuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJBbGFza2EgRmVkLlwiOiBbe1wieWVhclwiOjE4NjksIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTkzNywgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2FrXCJdLFxuICAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiQWxhc2thIEZlZGVyYWwgUmVwb3J0c1wiLFxuICAgICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkEuRi5SZXAuXCI6IFwiQWxhc2thIEZlZC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQWxhc2thIEZlZC5cIjogXCJBbGFza2EgRmVkLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJBbGFza2EgRmVkLlIuXCI6IFwiQWxhc2thIEZlZC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQWxhc2thIEZlZC5SZXAuXCI6IFwiQWxhc2thIEZlZC5cIn19XSxcbiAgICBcIkFsbGVuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJBbGxlblwiOiBbe1wieWVhclwiOjE4NjEsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTg2NywgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO21hXCJdLFxuICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiTWFzc2FjaHVzZXR0cyBSZXBvcnRzLCBBbGxlblwiLFxuICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkFsbC5cIjogXCJBbGxlblwiLCBcIk1hc3MuKEFsbGVuKVwiOiBcIkFsbGVuXCJ9fV0sXG4gICAgXCJBbS4gU2Ftb2FcIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJBbS4gU2Ftb2FcIjogW3tcInllYXJcIjoxOTAwLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkFtLiBTYW1vYSAyZFwiOiBbe1wieWVhclwiOjE5MDAsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1czthbVwiXSxcbiAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJBbWVyaWNhbiBTYW1vYSBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fV0sXG4gICAgXCJBbnQuIE4uUC4gQ2FzLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiQW50LiBOLlAuIENhcy5cIjogW3tcInllYXJcIjoxODA3LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4NTEsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztueVwiXSxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIkFudGhvbidzIE5pc2kgUHJpdXMgQ2FzZXNcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJBbnRoLlwiOiBcIkFudC4gTi5QLiBDYXMuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkFudGhvbiBOLlAuKE4uWS4pXCI6IFwiQW50LiBOLlAuIENhcy5cIn19XSxcbiAgICBcIkFwcC4gRC5DLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkFwcC4gRC5DLlwiOiBbe1wieWVhclwiOjE4OTMsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxOTQxLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2RjXCJdLFxuICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIkFwcGVhbCBDYXNlcywgRGlzdHJpY3Qgb2YgQ29sb21iaWFcIixcbiAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjp7XCJVLlMuIEFwcC4gRC5DLlwiOlwiQXBwLiBELkMuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlUuUy5BcHAuRC5DLlwiOlwiQXBwLiBELkMuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlUuIFMuIEFwcC4gRC4gQy5cIjpcIkFwcC4gRC5DLlwifX1dLFxuICAgIFwiQXJpei5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkFyaXouXCI6IFt7XCJ5ZWFyXCI6MTg2NiwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2F6XCJdLFxuICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiQXJpem9uYSBSZXBvcnRlclwiLFxuICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fV0sXG4gICAgXCJBcml6LiBBcHAuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkFyaXouIEFwcC5cIjogW3tcInllYXJcIjoxOTY1LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxOTc2LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1czthelwiXSxcbiAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiQXJpem9uYSBBcHBlYWxzIFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fV0sXG4gICAgXCJBcmsuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkFyay5cIjogW3tcInllYXJcIjoxODM3LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7YXJcIl0sXG4gICAgICAgICAgICAgIFwibmFtZVwiOiBcIkFya2Fuc2FzIFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkFrLlwiOiBcIkFyay5cIn19XSxcbiAgICBcIkFyay4gQXBwLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkFyay4gQXBwLlwiOiBbe1wieWVhclwiOjE5ODEsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1czthclwiXSxcbiAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJBcmthbnNhcyBBcHBlbGxhdGUgUmVwb3J0c1wiLFxuICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJBay4gQXBwLlwiOiBcIkFyay4gQXBwLlwifX1dLFxuICAgIFwiQi4gTW9uLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJCLiBNb24uXCI6IFt7XCJ5ZWFyXCI6MTg0MCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTg1NywgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7a3lcIl0sXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIktlbnR1Y2t5IFJlcG9ydHMsIE1vbnJvZSwgQmVuXCIsXG4gICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJLeS4oQi5Nb24uKVwiOiBcIkIuIE1vbi5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJNb24uXCI6IFwiQi4gTW9uLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk1vbi5CLlwiOiBcIkIuIE1vbi5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJNb25yb2UsIEIuXCI6IFwiQi4gTW9uLlwifX1dLFxuICAgIFwiQi5SLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3BlY2lhbHR5XCIsXG4gICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiQi5SLlwiOiBbe1wieWVhclwiOjE5NzksIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1c1wiXSxcbiAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiQmFua3J1cHRjeSBSZXBvcnRlclwiLFxuICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiQi4gUi5cIjogXCJCLlIuXCIsIFwiQlJcIjogXCJCLlIuXCJ9fV0sXG4gICAgXCJCLlQuQS5cIjogW3tcImNpdGVfdHlwZVwiOiBcInNwZWNpYWx0eVwiLFxuICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiQi5ULkEuXCI6IFt7XCJ5ZWFyXCI6MTkyNCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE5NDIsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXNcIl0sXG4gICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiUmVwb3J0cyBvZiB0aGUgVW5pdGVkIFN0YXRlcyBCb2FyZCBvZiBUYXggQXBwZWFsc1wiLFxuICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiQi5ULkEuTS4gKFAtSClcIjogW3tcImNpdGVfdHlwZVwiOiBcInNwZWNpYWx0eVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJCLlQuQS5NLiAoUC1IKVwiOiBbe1wieWVhclwiOjE5MjgsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTk0MiwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzXCJdLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiQm9hcmQgb2YgVGF4IEFwcGVhbHMgTWVtb3JhbmR1bSBEZWNpc2lvbnNcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiQmFpbC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkJhaWwuXCI6IFt7XCJ5ZWFyXCI6MTgyOCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODMyLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7c2NcIl0sXG4gICAgICAgICAgICAgICBcIm5hbWVcIjogXCJTb3V0aCBDYXJvbGluYSBSZXBvcnRzLCBCYWlsZXlcIixcbiAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJCYWkuXCI6IFwiQmFpbC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQmFpbC5MLlwiOiBcIkJhaWwuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkJhaWwuTC4oUy5DLilcIjogXCJCYWlsLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJCYWlsZXlcIjogXCJCYWlsLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJTLkMuTC4oQmFpbC4pXCI6IFwiQmFpbC5cIn19XSxcbiAgICBcIkJhaWwuIEVxLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkJhaWwuIEVxLlwiOiBbe1wieWVhclwiOjE4MzAsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODMxLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3NjXCJdLFxuICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIlNvdXRoIENhcm9saW5hIFJlcG9ydHMsIEJhaWxleSdzIEVxdWl0eVwiLFxuICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJCYWkuRXEuXCI6IFwiQmFpbC4gRXEuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJCYWlsLkVxLihTLkMuKVwiOiBcIkJhaWwuIEVxLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQmFpbGV5XCI6IFwiQmFpbC4gRXEuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJCYWlsZXkgQ2guXCI6IFwiQmFpbC4gRXEuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJCYWlsZXkgRXEuXCI6IFwiQmFpbC4gRXEuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJTLkMuRXEuKEJhaWwuRXEuKVwiOiBcIkJhaWwuIEVxLlwifX1dLFxuICAgIFwiQmFyYi5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkJhcmIuXCI6IFt7XCJ5ZWFyXCI6MTg0NywgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODc3LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bnlcIl0sXG4gICAgICAgICAgICAgICBcIm5hbWVcIjogXCJCYXJib3VyJ3MgU3VwcmVtZSBDb3VydCBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiQi5cIjogXCJCYXJiLlwiLCBcIkJhcmIuUy5DLlwiOiBcIkJhcmIuXCJ9fV0sXG4gICAgXCJCYXJiLiBDaC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJCYXJiLiBDaC5cIjogW3tcInllYXJcIjoxODQ1LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTg0OCwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztueVwiXSxcbiAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJCYXJib3VyJ3MgQ2hhbmNlcnkgUmVwb3J0c1wiLFxuICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJCYXJiLkNoLihOLlkuKVwiOiBcIkJhcmIuIENoLlwifX1dLFxuICAgIFwiQmF5XCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiQmF5XCI6IFt7XCJ5ZWFyXCI6MTc4MywgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4MDQsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7c2NcIl0sXG4gICAgICAgICAgICAgXCJuYW1lXCI6IFwiU291dGggQ2Fyb2xpbmEgUmVwb3J0cywgQmF5XCIsXG4gICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIlMuQy5MLihCYXkpXCI6IFwiQmF5XCJ9fV0sXG4gICAgXCJCaWJiXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkJpYmJcIjogW3tcInllYXJcIjoxODA4LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODE3LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztreVwiXSxcbiAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiS2VudHVja3kgUmVwb3J0cywgQmliYlwiLFxuICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiQmliYihLeS4pXCI6IFwiQmliYlwiLCBcIkt5LihCaWJiKVwiOiBcIkJpYmJcIn19XSxcbiAgICBcIkJpbm4uXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJCaW5uLlwiOiBbe1wieWVhclwiOjE3OTksIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODE0LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7cGFcIl0sXG4gICAgICAgICAgICAgICBcIm5hbWVcIjogXCJQZW5uc3lsdmFuaWEgU3RhdGUgUmVwb3J0cywgQmlubmV5XCIsXG4gICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiQmluLlwiOiBcIkJpbm4uXCIsIFwiQmlubi4oUGEuKVwiOiBcIkJpbm4uXCIsIFwiQmlublwiOiBcIkJpbm4uXCJ9fV0sXG4gICAgXCJCbGFja1wiOiBbe1wiY2l0ZV90eXBlXCI6IFwic2NvdHVzX2Vhcmx5XCIsXG4gICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkJsYWNrXCI6IFt7XCJ5ZWFyXCI6MTg2MSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODYyLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7ZmVkZXJhbDtzdXByZW1lLmNvdXJ0XCJdLFxuICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiQmxhY2sncyBTdXByZW1lIENvdXJ0IFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJCbGFjayBSLlwiOiBcIkJsYWNrXCIsIFwiVS5TLihCbGFjaylcIjogXCJCbGFja1wifX1dLFxuICAgIFwiQmxhY2tmLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJCbGFja2YuXCI6IFt7XCJ5ZWFyXCI6MTgxNywgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTg0NywgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7aW5cIl0sXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIkluZGlhbmEgUmVwb3J0cywgQmxhY2tmb3JkXCIsXG4gICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJCbGFjay5cIjogXCJCbGFja2YuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQmxhY2tmLihJbmQuKVwiOiBcIkJsYWNrZi5cIn19XSxcbiAgICBcIkJsdW1lIFN1cC4gQ3QuIFRyYW5zLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkJsdW1lIFN1cC4gQ3QuIFRyYW5zLlwiOiBbe1wieWVhclwiOjE4MDUsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODM2LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO21pXCJdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIkJsdW1lLCBTdXByZW1lIENvdXJ0IFRyYW5zYWN0aW9uc1wiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJCbHVtZSBTdXAuQ3QuVHJhbnMuXCI6IFwiQmx1bWUgU3VwLiBDdC4gVHJhbnMuXCJ9fV0sXG4gICAgXCJCbHVtZSBVbnJlcC4gT3AuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkJsdW1lIFVucmVwLiBPcC5cIjogW3tcInllYXJcIjoxODM2LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODQzLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1czttaVwiXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiQmx1bWUsIFVucmVwb3J0ZWQgT3BpbmlvbnNcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkJsdW1lIE9wLlwiOiBcIkJsdW1lIFVucmVwLiBPcC5cIn19XSxcbiAgICBcIkJveWNlXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJCb3ljZVwiOiBbe1wieWVhclwiOjE5MDksIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTkyMCwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2RlXCJdLFxuICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiRGVsYXdhcmUgUmVwb3J0cywgQm95Y2VcIixcbiAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJEZWwuKEJveWNlKVwiOiBcIkJveWNlXCJ9fV0sXG4gICAgXCJCcmFkZi5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJCcmFkZi5cIjogW3tcInllYXJcIjoxODM4LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTg0MSwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztpYVwiXSxcbiAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJJb3dhIFJlcG9ydHMsIEJyYWRmb3JkXCIsXG4gICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkJyYWQuXCI6IFwiQnJhZGYuXCIsIFwiQnJhZGZvcmRcIjogXCJCcmFkZi5cIn19XSxcbiAgICBcIkJyYXl0LlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkJyYXl0LlwiOiBbe1wieWVhclwiOjE4MTUsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODE5LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3Z0XCJdLFxuICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIlZlcm1vbnQgUmVwb3J0cywgQnJheXRvblwiLFxuICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJCcmF5dG9uIChWdC4pXCI6IFwiQnJheXQuXCJ9fV0sXG4gICAgXCJCcmVlc2VcIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJCcmVlc2VcIjogW3tcInllYXJcIjoxODE5LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTgzMSwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztpbFwiXSxcbiAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJJbGxpbm9pcyBSZXBvcnRzLCBCcmVlc2VcIixcbiAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiSWxsLihCcmVlc2UpXCI6IFwiQnJlZXNlXCJ9fV0sXG4gICAgXCJCcmV2LlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiQnJldi5cIjogW3tcInllYXJcIjoxNzkzLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4MTYsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztzY1wiXSxcbiAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIlNvdXRoIENhcm9saW5hIFJlcG9ydHMsIEJyZXZhcmRcIixcbiAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJTLkMuTC4oQnJldilcIjogXCJCcmV2LlwifX1dLFxuICAgIFwiQnJpZWYgVGltZXMgUnB0ci5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkJyaWVmIFRpbWVzIFJwdHIuXCI6IFt7XCJ5ZWFyXCI6MTc1MCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7Y29cIl0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJCcmllZiBUaW1lcyBSZXBvcnRlclwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fV0sXG4gICAgXCJCdXIuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkJ1ci5cIjogW3tcInllYXJcIjoxODQxLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODQzLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1czt3aVwiXSxcbiAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiV2lzY29uc2luIFJlcG9ydHMsIEJ1cm5ldHRcIixcbiAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkJ1cm5ldHRcIjogXCJCdXIuXCIsIFwiQnVybmV0dCAoV2lzLilcIjogXCJCdXIuXCJ9fV0sXG4gICAgXCJCdXNiLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiQnVzYi5cIjogW3tcInllYXJcIjoxODUyLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4NTMsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztuY1wiXSxcbiAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIk5vcnRoIENhcm9saW5hIFJlcG9ydHMsIEJ1c2JlZSdzIExhd1wiLFxuICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkJ1c2IuTC5cIjogXCJCdXNiLlwiLCBcIk4uQy4oQnVzYi4pXCI6IFwiQnVzYi5cIn19XSxcbiAgICBcIkJ1c2IuIEVxLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkJ1c2IuIEVxLlwiOiBbe1wieWVhclwiOjE4NTIsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODUzLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO25jXCJdLFxuICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIk5vcnRoIENhcm9saW5hIFJlcG9ydHMsIEJ1c2JlZSdzIEVxdWl0eVwiLFxuICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJCdXNiZWUgRXEuKE4uQy4pXCI6IFwiQnVzYi4gRXEuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJOLkMuKEJ1c2IuRXEuKVwiOiBcIkJ1c2IuIEVxLlwifX1dLFxuICAgIFwiQnVzaFwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJCdXNoXCI6IFt7XCJ5ZWFyXCI6MTg2NiwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTg3OSwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7a3lcIl0sXG4gICAgICAgICAgICAgIFwibmFtZVwiOiBcIktlbnR1Y2t5IFJlcG9ydHMsIEJ1c2hcIixcbiAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkJ1c2ggKEt5LilcIjogXCJCdXNoXCIsIFwiS3kuKEJ1c2gpXCI6IFwiQnVzaFwifX1dLFxuICAgIFwiQy5DLlAuQS5cIjogW3tcImNpdGVfdHlwZVwiOiBcInNwZWNpYWx0eVwiLFxuICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJDLkMuUC5BLlwiOiBbe1wieWVhclwiOjE5MjksIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTk4MiwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzXCJdLFxuICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiQ291cnQgb2YgQ3VzdG9tcyBhbmQgUGF0ZW50IEFwcGVhbHMgUmVwb3J0c1wiLFxuICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fV0sXG4gICAgXCJDLk0uQS5cIjogW3tcImNpdGVfdHlwZVwiOiBcInNwZWNpYWx0eVwiLFxuICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiQy5NLkEuXCI6IFt7XCJ5ZWFyXCI6MTk1MSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE5NzUsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXNcIl0sXG4gICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiRGVjaXNpb25zIG9mIHRoZSBVbml0ZWQgU3RhdGVzIENvdXJ0IG9mIE1pbGl0YXJ5IEFwcGVhbHNcIixcbiAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge319XSxcbiAgICBcIkMuTS5SLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3BlY2lhbHR5XCIsXG4gICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJDLk0uUi5cIjogW3tcInllYXJcIjoxOTUxLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTk3NSwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1c1wiXSxcbiAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJDb3VydCBNYXJ0aWFsIFJlY29yZHNcIixcbiAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge319XSxcbiAgICBcIkNPXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJuZXV0cmFsXCIsXG4gICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkNPXCI6IFt7XCJ5ZWFyXCI6MTc1MCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2NvXCJdLFxuICAgICAgICAgICAgXCJuYW1lXCI6IFwiQ29sb3JhZG8gTmV1dHJhbCBDaXRhdGlvblwiLFxuICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fV0sXG4gICAgXCJDYWkuIENhcy5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJDYWkuIENhcy5cIjogW3tcInllYXJcIjoxNzk2LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTgwNSwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztueVwiXSxcbiAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJDYWluZXMnIENhc2VzXCIsXG4gICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkNhaS5cIjogXCJDYWkuIENhcy5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkNhaS5DYXMuRXJyLlwiOiBcIkNhaS4gQ2FzLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQ2Fpbi5cIjogXCJDYWkuIENhcy5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkNhaW5lc1wiOiBcIkNhaS4gQ2FzLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQ2FpbmVzIChOLlkuKVwiOiBcIkNhaS4gQ2FzLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQ2FpbmVzIENhcy5cIjogXCJDYWkuIENhcy5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk4uWS5DYXMuRXJyLlwiOiBcIkNhaS4gQ2FzLlwifX1dLFxuICAgIFwiQ2FpLiBSLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJDYWkuIFIuXCI6IFt7XCJ5ZWFyXCI6MTgwMywgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTgwNSwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bnlcIl0sXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIkNhaW5lcycgUmVwb3J0c1wiLFxuICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiQ2FpLlIuXCI6IFwiQ2FpLiBSLlwifX1dLFxuICAgIFwiQ2FsLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJDYWwuXCI6IFt7XCJ5ZWFyXCI6MTg1MCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTkzNCwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBcIkNhbC4gMmRcIjogW3tcInllYXJcIjoxOTM0LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxOTY5LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQ2FsLiAzZFwiOiBbe1wieWVhclwiOjE5NjksIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE5OTEsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJDYWwuIDR0aFwiOiBbe1wieWVhclwiOjE5OTEsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7Y2FcIl0sXG4gICAgICAgICAgICAgIFwibmFtZVwiOiBcIkNhbGlmb3JuaWEgUmVwb3J0c1wiLFxuICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiQ2FsLjJkXCI6IFwiQ2FsLiAyZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkNhbC4zZFwiOiBcIkNhbC4gM2RcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJDYWwuNHRoXCI6IFwiQ2FsLiA0dGhcIn19XSxcbiAgICBcIkNhbC4gQXBwLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkNhbC4gQXBwLlwiOiBbe1wieWVhclwiOjE5MDUsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxOTM0LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJDYWwuIEFwcC4gMmRcIjogW3tcInllYXJcIjoxOTM0LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTk2OSwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQ2FsLiBBcHAuIDNkXCI6IFt7XCJ5ZWFyXCI6MTk2OSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE5OTEsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkNhbC4gQXBwLiA0dGhcIjogW3tcInllYXJcIjoxOTkxLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2NhXCJdLFxuICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIkNhbGlmb3JuaWEgQXBwZWxsYXRlIFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiQ2FsLiBBcHAuMmRcIjogXCJDYWwuIEFwcC4gMmRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkNhbC4gQXBwLjNkXCI6IFwiQ2FsLiBBcHAuIDNkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJDYWwuIEFwcC40dGhcIjogXCJDYWwuIEFwcC4gNHRoXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJDYWwuQXBwLlwiOiBcIkNhbC4gQXBwLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQ2FsLkFwcC4gMmRcIjogXCJDYWwuIEFwcC4gMmRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkNhbC5BcHAuIDNkXCI6IFwiQ2FsLiBBcHAuIDNkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJDYWwuQXBwLiA0dGhcIjogXCJDYWwuIEFwcC4gNHRoXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJDYWwuQXBwLjJkXCI6IFwiQ2FsLiBBcHAuIDJkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJDYWwuQXBwLjNkXCI6IFwiQ2FsLiBBcHAuIDNkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJDYWwuQXBwLjR0aFwiOiBcIkNhbC4gQXBwLiA0dGhcIn19XSxcbiAgICBcIkNhbC4gQXBwLiBTdXBwLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkNhbC4gQXBwLiBTdXBwLlwiOiBbe1wieWVhclwiOjE5MjksIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQ2FsLiBBcHAuIFN1cHAuIDJkXCI6IFt7XCJ5ZWFyXCI6MTkyOSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJDYWwuIEFwcC4gU3VwcC4gM2RcIjogW3tcInllYXJcIjoxOTI5LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7Y2FcIl0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiQ2FsaWZvcm5pYSBBcHBlbGxhdGUgUmVwb3J0cywgU3VwcGxlbWVudFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJDYWwuQXBwLiAyZCBTdXBwLlwiOiBcIkNhbC4gQXBwLiBTdXBwLiAyZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQ2FsLkFwcC4gM2QgU3VwcC5cIjogXCJDYWwuIEFwcC4gU3VwcC4gM2RcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkNhbC5BcHAuIFN1cHAuIDJkXCI6IFwiQ2FsLiBBcHAuIFN1cHAuIDJkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJDYWwuQXBwLiBTdXBwLiAzZFwiOiBcIkNhbC4gQXBwLiBTdXBwLiAzZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQ2FsLkFwcC4gU3VwcC4yZFwiOiBcIkNhbC4gQXBwLiBTdXBwLiAyZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQ2FsLkFwcC4gU3VwcC4zZFwiOiBcIkNhbC4gQXBwLiBTdXBwLiAzZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQ2FsLkFwcC4yZCBTdXBwLlwiOiBcIkNhbC4gQXBwLiBTdXBwLiAyZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQ2FsLkFwcC4zZCBTdXBwLlwiOiBcIkNhbC4gQXBwLiBTdXBwLiAzZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQ2FsLkFwcC5TdXBwLlwiOiBcIkNhbC4gQXBwLiBTdXBwLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQ2FsLkFwcC5TdXBwLjJkXCI6IFwiQ2FsLiBBcHAuIFN1cHAuIDJkXCJ9fV0sXG4gICAgXCJDYWwuIFJwdHIuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkNhbC4gUnB0ci5cIjogW3tcInllYXJcIjoxOTU5LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxOTkxLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQ2FsLiBScHRyLiAyZFwiOiBbe1wieWVhclwiOjE5OTIsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjIwMDMsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJDYWwuIFJwdHIuIDNkXCI6IFt7XCJ5ZWFyXCI6MjAwMywgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2NhXCJdLFxuICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJXZXN0J3MgQ2FsaWZvcm5pYSBSZXBvcnRlclwiLFxuICAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiQ2FsLiBScHRyLjJkXCI6IFwiQ2FsLiBScHRyLiAyZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkNhbC4gUnB0ci4zZFwiOiBcIkNhbC4gUnB0ci4gM2RcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJDYWwuUnB0ci5cIjogXCJDYWwuIFJwdHIuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQ2FsLlJwdHIuIDJkXCI6IFwiQ2FsLiBScHRyLiAyZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkNhbC5ScHRyLiAzZFwiOiBcIkNhbC4gUnB0ci4gM2RcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJDYWwuUnB0ci4yZFwiOiBcIkNhbC4gUnB0ci4gMmRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJDYWwuUnB0ci4zZFwiOiBcIkNhbC4gUnB0ci4gM2RcIn19XSxcbiAgICBcIkNhbC4gVW5yZXAuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJDYWwuIFVucmVwLlwiOiBbe1wieWVhclwiOjE4NTUsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTkxMCwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2NhXCJdLFxuICAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiQ2FsaWZvcm5pYSBVbnJlcG9ydGVkIENhc2VzXCIsXG4gICAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiQ2FsLlVucmVwLkNhcy5cIjogXCJDYWwuIFVucmVwLlwifX1dLFxuICAgIFwiQ2FsbFwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJDYWxsXCI6IFt7XCJ5ZWFyXCI6MTc3OSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTgyNSwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7dmFcIl0sXG4gICAgICAgICAgICAgIFwibmFtZVwiOiBcIlZpcmdpbmlhIFJlcG9ydHMsIENhbGxcIixcbiAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkNhbGwgKFZhLilcIjogXCJDYWxsXCIsIFwiVmEuKENhbGwpXCI6IFwiQ2FsbFwifX1dLFxuICAgIFwiQ2FtLiAmIE5vci5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkNhbS4gJiBOb3IuXCI6IFt7XCJ5ZWFyXCI6MTgwMCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODA0LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bmNcIl0sXG4gICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJOb3J0aCBDYXJvbGluYSBSZXBvcnRzLCBDb25mZXJlbmNlIGJ5IENhbWVyb24gJiBOb3J3b29kXCIsXG4gICAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiQ2FtLiYgTi5cIjogXCJDYW0uICYgTm9yLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJOLkMuKENhbS4mIE5vci4pXCI6IFwiQ2FtLiAmIE5vci5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTi5DLkNvbmYuXCI6IFwiQ2FtLiAmIE5vci5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTi5DLkNvbmYuUmVwLlwiOiBcIkNhbS4gJiBOb3IuXCJ9fV0sXG4gICAgXCJDYXIuIEwuIFJlcC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJDYXIuIEwuIFJlcC5cIjogW3tcInllYXJcIjoxODExLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTgxNiwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztuY1wiXSxcbiAgICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJDYXJvbGluYSBMYXcgUmVwb3NpdG9yeVwiLFxuICAgICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJDYXIuTGF3LlJlcG9zLlwiOiBcIkNhci4gTC4gUmVwLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTi5DLihDYXIuTC5SZXAuKVwiOiBcIkNhci4gTC4gUmVwLlwifX1dLFxuICAgIFwiQ2hhbmQuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiQ2hhbmQuXCI6IFt7XCJ5ZWFyXCI6MTg0OSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4NTIsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7d2lcIl0sXG4gICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiV2lzY29uc2luIFJlcG9ydHMsIENoYW5kbGVyXCIsXG4gICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkNoYW5kLihXaXMuKVwiOiBcIkNoYW5kLlwiLCBcIkNoYW5kbC5cIjogXCJDaGFuZC5cIn19XSxcbiAgICBcIkNoZXYuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJDaGV2LlwiOiBbe1wieWVhclwiOjE4MzksIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTg0MCwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3NjXCJdLFxuICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiU291dGggQ2Fyb2xpbmEgUmVwb3J0cywgQ2hldmVzXCIsXG4gICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiQ2hldmVzXCI6IFwiQ2hldi5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQ2hldmVzIEwuKFMuQy4pXCI6IFwiQ2hldi5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiUy5DLkwuKENoZXYuKVwiOiBcIkNoZXYuXCJ9fV0sXG4gICAgXCJDaGV2LiBFcS5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJDaGV2LiBFcS5cIjogW3tcInllYXJcIjoxODM5LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTg0MCwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztzY1wiXSxcbiAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJTb3V0aCBDYXJvbGluYSBSZXBvcnRzLCBDaGV2ZXMnIEVxdWl0eVwiLFxuICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJDaGV2LkNoLlwiOiBcIkNoZXYuIEVxLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQ2hldmVzIEVxLihTLkMuKVwiOiBcIkNoZXYuIEVxLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiUy5DLkVxLihDaGV2LkVxLilcIjogXCJDaGV2LiBFcS5cIn19XSxcbiAgICBcIkNsLiBDaC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiQ2wuIENoLlwiOiBbe1wieWVhclwiOjE4MzksIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4NDEsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO255XCJdLFxuICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJDbGFya2UncyBDaGFuY2VyeSBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJDbC5SLlwiOiBcIkNsLiBDaC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJDbGFya2VcIjogXCJDbC4gQ2guXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQ2xhcmtlIENoLlwiOiBcIkNsLiBDaC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJDbGFya2UgQ2guKE4uWS4pXCI6IFwiQ2wuIENoLlwifX1dLFxuICAgIFwiQ2wuIEN0LlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3BlY2lhbHR5XCIsXG4gICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiQ2wuIEN0LlwiOiBbe1wieWVhclwiOjE5ODMsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE5OTIsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzXCJdLFxuICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJVbml0ZWQgU3RhdGVzIENsYWltcyBDb3VydCBSZXBvcnRlclwiLFxuICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge319XSxcbiAgICBcIkNvbGQuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJDb2xkLlwiOiBbe1wieWVhclwiOjE4NjAsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTg3MCwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3RuXCJdLFxuICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiVGVubmVzc2VlIFJlcG9ydHMsIENvbGR3ZWxsXCIsXG4gICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiQ29sLlwiOiBcIkNvbGQuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkNvbGR3LlwiOiBcIkNvbGQuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlRlbm4uKENvbGQuKVwiOiBcIkNvbGQuXCJ9fV0sXG4gICAgXCJDb2xlLiAmIENhaS4gQ2FzLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiQ29sZS4gJiBDYWkuIENhcy5cIjogW3tcInllYXJcIjoxNzk0LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4MDUsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztueVwiXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIkNvbGVtYW4gJiBDYWluZXMnIENhc2VzXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiQy4mIEMuXCI6IFwiQ29sZS4gJiBDYWkuIENhcy5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQ29sLiYgQy5DYXMuXCI6IFwiQ29sZS4gJiBDYWkuIENhcy5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQ29sLiYgQ2FpLlwiOiBcIkNvbGUuICYgQ2FpLiBDYXMuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkNvbC4mIENhaW5lcyBDYXMuKE4uWS4pXCI6IFwiQ29sZS4gJiBDYWkuIENhcy5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQ29sZS4mIEMuQ2FzLlwiOiBcIkNvbGUuICYgQ2FpLiBDYXMuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkNvbGUuJiBDYWkuXCI6IFwiQ29sZS4gJiBDYWkuIENhcy5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQ29sZW0uJiBDLkNhcy5cIjogXCJDb2xlLiAmIENhaS4gQ2FzLlwifX1dLFxuICAgIFwiQ29sZS4gQ2FzLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJDb2xlLiBDYXMuXCI6IFt7XCJ5ZWFyXCI6MTc5MSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTgwMCwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bnlcIl0sXG4gICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIkNvbGVtYW4ncyBDYXNlc1wiLFxuICAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiQy5DLlwiOiBcIkNvbGUuIENhcy5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJDb2wuQ2FzLlwiOiBcIkNvbGUuIENhcy5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJDb2wuQ2FzLihOLlkuKVwiOiBcIkNvbGUuIENhcy5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJDb2xlLkNhcy5Qci5cIjogXCJDb2xlLiBDYXMuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQ29sZW0uQ2FzLlwiOiBcIkNvbGUuIENhcy5cIn19XSxcbiAgICBcIkNvbG8uXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJDb2xvLlwiOiBbe1wieWVhclwiOjE4NjQsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTk4MCwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2NvXCJdLFxuICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiQ29sb3JhZG8gUmVwb3J0c1wiLFxuICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkNvbC5cIjogXCJDb2xvLlwifX1dLFxuICAgIFwiQ29sby4gTGF3LlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJDb2xvLiBMYXcuXCI6IFt7XCJ5ZWFyXCI6MTc1MCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2NvXCJdLFxuICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJDb2xvcmFkbyBMYXd5ZXJcIixcbiAgICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkNvbG9yYWRvIExhdy5cIjogXCJDb2xvLiBMYXcuXCJ9fV0sXG4gICAgXCJDb25uLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiQ29ubi5cIjogW3tcInllYXJcIjoxODE0LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7Y3RcIl0sXG4gICAgICAgICAgICAgICBcIm5hbWVcIjogXCJDb25uZWN0aWN1dCBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge319XSxcbiAgICBcIkNvbm4uIEFwcC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiQ29ubi4gQXBwLlwiOiBbe1wieWVhclwiOjE5ODMsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztjdFwiXSxcbiAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiQ29ubmVjdGljdXQgQXBwZWxsYXRlIFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fV0sXG4gICAgXCJDb25uLiBDaXIuIEN0XCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkNvbm4uIENpci4gQ3RcIjogW3tcInllYXJcIjoxOTYxLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxOTc0LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztjdFwiXSxcbiAgICAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiQ29ubmVjdGljdXQgQ2lyY3VpdCBDb3VydCBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiQ29ubi4gTC4gUnB0ci5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkNvbm4uIEwuIFJwdHIuXCI6IFt7XCJ5ZWFyXCI6MTk5MCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2N0XCJdLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiQ29ubmVjdGljdXQgTGF3IFJlcG9ydGVyXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge319XSxcbiAgICBcIkNvbm4uIFN1cGVyLiBDdC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiQ29ubi4gU3VwZXIuIEN0LlwiOiBbe1wieWVhclwiOjE5ODYsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE5OTQsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2N0XCJdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJDb25uZWN0aWN1dCBTdXBlcmlvciBDb3VydCBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiQ29ubi4gU3VwcC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkNvbm4uIFN1cHAuXCI6IFt7XCJ5ZWFyXCI6MTkzNSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2N0XCJdLFxuICAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiQ29ubmVjdGljdXQgU3VwcGxlbWVudFwiLFxuICAgICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fV0sXG4gICAgXCJDb29rZVwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiQ29va2VcIjogW3tcInllYXJcIjoxODExLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4MTQsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1czt0blwiXSxcbiAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIlRlbm5lc3NlZSBSZXBvcnRzLCBDb29rZVwiLFxuICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkNvb2tlIChUZW5uLilcIjogXCJDb29rZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJUZW5uLihDb29rZSlcIjogXCJDb29rZVwifX1dLFxuICAgIFwiQ293LlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJDb3cuXCI6IFt7XCJ5ZWFyXCI6MTgyMywgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTgyOSwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bnlcIl0sXG4gICAgICAgICAgICAgIFwibmFtZVwiOiBcIkNvd2VuJ3MgUmVwb3J0c1wiLFxuICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiQy5cIjogXCJDb3cuXCIsIFwiQ293Lk4uWS5cIjogXCJDb3cuXCJ9fV0sXG4gICAgXCJDcmFuY2hcIjogW3tcImNpdGVfdHlwZVwiOiBcInNjb3R1c19lYXJseVwiLFxuICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiQ3JhbmNoXCI6IFt7XCJ5ZWFyXCI6MTgwMSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4MTUsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7ZmVkZXJhbDtzdXByZW1lLmNvdXJ0XCJdLFxuICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIkNyYW5jaCdzIFN1cHJlbWUgQ291cnQgUmVwb3J0c1wiLFxuICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJDci5cIjogXCJDcmFuY2hcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkNyYS5cIjogXCJDcmFuY2hcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkNyYW5jaCAoVVMpXCI6IFwiQ3JhbmNoXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJVLlMuKENyYW5jaClcIjogXCJDcmFuY2hcIn19LFxuICAgICAgICAgICAgICAge1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkNyYW5jaFwiOiBbe1wieWVhclwiOjE4MDEsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODQxLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2RjXCJdLFxuICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIkRpc3RyaWN0IG9mIENvbHVtYmlhIFJlcG9ydHMsIENyYW5jaFwiLFxuICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJDcmFuY2ggQy5DLlwiOiBcIkNyYW5jaFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQ3JhbmNoIEQuQy5cIjogXCJDcmFuY2hcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkQuQy4oQ3JhbmNoKVwiOiBcIkNyYW5jaFwifX1dLFxuICAgIFwiQ3QuIENsLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3BlY2lhbHR5XCIsXG4gICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiQ3QuIENsLlwiOiBbe1wieWVhclwiOjE4NjMsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE5ODIsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzXCJdLFxuICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJDb3VydCBvZiBDbGFpbXMgUmVwb3J0c1wiLFxuICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiQ291cnQgQ2wuXCI6IFwiQ3QuIENsLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkN0LkNsLlwiOiBcIkN0LiBDbC5cIn19XSxcbiAgICBcIkN0LiBDdXN0LlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3BlY2lhbHR5XCIsXG4gICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJDdC4gQ3VzdC5cIjogW3tcInllYXJcIjoxOTEwLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTkyOSwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1c1wiXSxcbiAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJDb3VydCBvZiBDdXN0b21zIEFwcGVhbHMgUmVwb3J0c1wiLFxuICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiQ3QuIEludCdsIFRyYWRlXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJmZWRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkN0LiBJbnQnbCBUcmFkZVwiOiBbe1wieWVhclwiOjE5ODAsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1c1wiXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJDb3VydCBvZiBJbnRlcm5hdGlvbmFsIFRyYWRlIFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiQ3QuSW50J2wgVHJhZGVcIjogXCJDdC4gSW50J2wgVHJhZGVcIn19XSxcbiAgICBcIkN1c2guXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJDdXNoLlwiOiBbe1wieWVhclwiOjE4NDgsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTg1MywgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO21hXCJdLFxuICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiTWFzc2FjaHVzZXR0cyBSZXBvcnRzLCBDdXNoaW5nXCIsXG4gICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiQ3VzaC4oTWFzcy4pXCI6IFwiQ3VzaC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQ3VzaGluZ1wiOiBcIkN1c2guXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk1hc3MuKEN1c2guKVwiOiBcIkN1c2guXCJ9fV0sXG4gICAgXCJDdXN0LiBCLiAmIERlYy5cIjogW3tcImNpdGVfdHlwZVwiOiBcImZlZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiQ3VzdC4gQi4gJiBEZWMuXCI6IFt7XCJ5ZWFyXCI6MTk2NywgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzXCJdLFxuICAgICAgICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIkN1c3RvbXMgQnVsbGV0aW4gYW5kIERlY2lzaW9uc1wiLFxuICAgICAgICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiQ3VzdC4gQ3QuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJmZWRcIixcbiAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkN1c3QuIEN0LlwiOiBbe1wieWVhclwiOjE5MzgsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxOTgwLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzXCJdLFxuICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIkN1c3RvbXMgQ291cnQgUmVwb3J0c1wiLFxuICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiRC4gQ2hpcC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkQuIENoaXAuXCI6IFt7XCJ5ZWFyXCI6MTc4OSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODI0LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7dnRcIl0sXG4gICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJWZXJtb250IFJlcG9ydHMsIENoaXBtYW4sIEQuXCIsXG4gICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiQ2hpcC5cIjogXCJELiBDaGlwLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJDaGlwLihWdC4pXCI6IFwiRC4gQ2hpcC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQ2hpcC5ELlwiOiBcIkQuIENoaXAuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkQuQ2hpcC4oVnQuKVwiOiBcIkQuIENoaXAuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkQuQ2hpcG0uXCI6IFwiRC4gQ2hpcC5cIn19XSxcbiAgICBcIkRha290YVwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkRha290YVwiOiBbe1wieWVhclwiOjE4NjcsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODg5LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO25kXCJdLFxuICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIkRha290YSBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkRhay5cIjogXCJEYWtvdGFcIn19XSxcbiAgICBcIkRhbGwuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzY290dXNfZWFybHlcIixcbiAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiRGFsbC5cIjogW3tcInllYXJcIjoxNzkwLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4ODAsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztmZWRlcmFsO3N1cHJlbWUuY291cnRcIl0sXG4gICAgICAgICAgICAgICBcIm5hbWVcIjogXCJEYWxsYXMnIFN1cHJlbWUgQ291cnQgUmVwb3J0c1wiLFxuICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkRhbC5cIjogXCJEYWxsLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJEYWxsLlMuQy5cIjogXCJEYWxsLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJEYWxsYXNcIjogXCJEYWxsLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJVLlMuKERhbGwuKVwiOiBcIkRhbGwuXCJ9fSxcbiAgICAgICAgICAgICAge1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiRGFsbC5cIjogW3tcInllYXJcIjoxNzU0LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4MDYsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztwYVwiXSxcbiAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIlBlbm5zeWx2YW5pYSBTdGF0ZSBSZXBvcnRzLCBEYWxsYXNcIixcbiAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJELlwiOiBcIkRhbGwuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkRhbC5cIjogXCJEYWxsLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJEYWxsYXNcIjogXCJEYWxsLlwifX1dLFxuICAgIFwiRGFsbGFtXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiRGFsbGFtXCI6IFt7XCJ5ZWFyXCI6MTg0MCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4NDQsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7dHhcIl0sXG4gICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiRGlnZXN0IG9mIHRoZSBMYXdzIG9mIFRleGFzIChEYWxsYW0ncyBPcGluaW9ucylcIixcbiAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiRGFsbC4oVGV4LilcIjogXCJEYWxsYW1cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkRhbGwuRGlnLlwiOiBcIkRhbGxhbVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiRGFsbGFtIERpZy4oVGV4LilcIjogXCJEYWxsYW1cIn19XSxcbiAgICBcIkRhbmFcIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiRGFuYVwiOiBbe1wieWVhclwiOjE4MzMsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4NDAsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2t5XCJdLFxuICAgICAgICAgICAgICBcIm5hbWVcIjogXCJLZW50dWNreSBSZXBvcnRzLCBEYW5hXCIsXG4gICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJEYW4uXCI6IFwiRGFuYVwiLCBcIkt5LihEYW5hKVwiOiBcIkRhbmFcIn19XSxcbiAgICBcIkRheVwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkRheVwiOiBbe1wieWVhclwiOjE4MDIsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODEzLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVjO2N0XCJdLFxuICAgICAgICAgICAgIFwibmFtZVwiOiBcIkRheSdzIENvbm5lY3RpY3V0IFJlcG9ydHNcIixcbiAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiRGF5IChDb25uKVwiOiBcIkRheVwifX1dLFxuICAgIFwiRGVsLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJEZWwuXCI6IFt7XCJ5ZWFyXCI6MTkyMCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTk2NiwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7ZGVcIl0sXG4gICAgICAgICAgICAgIFwibmFtZVwiOiBcIkRlbGF3YXJlIFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fV0sXG4gICAgXCJEZWwuIENhcy5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJEZWwuIENhcy5cIjogW3tcInllYXJcIjoxNzkyLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTgzMCwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztkZVwiXSxcbiAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJEZWxhd2FyZSBDYXNlc1wiLFxuICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiRGVsLiBDaC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkRlbC4gQ2guXCI6IFt7XCJ5ZWFyXCI6MTgxNCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxOTY4LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7ZGVcIl0sXG4gICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJEZWxhd2FyZSBDaGFuY2VyeSBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge319XSxcbiAgICBcIkRlbmlvXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJEZW5pb1wiOiBbe1wieWVhclwiOjE4NDUsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTg0OCwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO255XCJdLFxuICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiRGVuaW8ncyBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiRGVuLlwiOiBcIkRlbmlvXCJ9fV0sXG4gICAgXCJEZXMuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkRlcy5cIjogW3tcInllYXJcIjoxNzg0LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODE3LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztzY1wiXSxcbiAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiU291dGggQ2Fyb2xpbmEgUmVwb3J0cywgRGVzYXVzc3VyZSdzIEVxdWl0eVwiLFxuICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiRGVzYXVzLlwiOiBcIkRlcy5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJEZXNhdXMuRXEuXCI6IFwiRGVzLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlMuQy5FcS4oRGVzLilcIjogXCJEZXMuXCJ9fV0sXG4gICAgXCJEZXYuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkRldi5cIjogW3tcInllYXJcIjoxODI2LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODM0LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztuY1wiXSxcbiAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiTm9ydGggQ2Fyb2xpbmEgUmVwb3J0cywgRGV2ZXJldXgncyBMYXdcIixcbiAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkRldi5MLlwiOiBcIkRldi5cIiwgXCJOLkMuKERldi4pXCI6IFwiRGV2LlwifX1dLFxuICAgIFwiRGV2LiAmIEJhdC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkRldi4gJiBCYXQuXCI6IFt7XCJ5ZWFyXCI6MTgzNCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODM5LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bmNcIl0sXG4gICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJOb3J0aCBDYXJvbGluYSBSZXBvcnRzLCBEZXZlcmV1eCAmIEJhdHRsZSdzIExhd1wiLFxuICAgICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkQuJiBCLlwiOiBcIkRldi4gJiBCYXQuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkRldi4mIEIuXCI6IFwiRGV2LiAmIEJhdC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiRGV2LiYgQi5MLlwiOiBcIkRldi4gJiBCYXQuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk4uQy4oRGV2LiYgQmF0LilcIjogXCJEZXYuICYgQmF0LlwifX1dLFxuICAgIFwiRGV2LiAmIEJhdC4gRXEuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiRGV2LiAmIEJhdC4gRXEuXCI6IFt7XCJ5ZWFyXCI6MTgzNCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4MzksIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bmNcIl0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiTm9ydGggQ2Fyb2xpbmEgUmVwb3J0cywgRGV2ZXJldXggJiBCYXR0bGUncyBFcXVpdHlcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiRC4mIEIuXCI6IFwiRGV2LiAmIEJhdC4gRXEuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJEZXYuJiBCLlwiOiBcIkRldi4gJiBCYXQuIEVxLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiRGV2LiYgQi5FcS5cIjogXCJEZXYuICYgQmF0LiBFcS5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk4uQy4oRGV2LiYgQmF0LkVxLilcIjogXCJEZXYuICYgQmF0LiBFcS5cIn19XSxcbiAgICBcIkRldi4gRXEuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJEZXYuIEVxLlwiOiBbe1wieWVhclwiOjE4MjYsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTgzNCwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO25jXCJdLFxuICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiTm9ydGggQ2Fyb2xpbmEgUmVwb3J0cywgRGV2ZXJldXgncyBFcXVpdHlcIixcbiAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJEZXYuXCI6IFwiRGV2LiBFcS5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTi5DLihEZXYuRXEuKVwiOiBcIkRldi4gRXEuXCJ9fV0sXG4gICAgXCJEb3VnLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiRG91Zy5cIjogW3tcInllYXJcIjoxODQzLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4NDcsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1czttaVwiXSxcbiAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIk1pY2hpZ2FuIFJlcG9ydHMsIERvdWdsYXNzXCIsXG4gICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiRG91Zy4oTWljaC4pXCI6IFwiRG91Zy5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiRG91Z2wuKE1pY2guKVwiOiBcIkRvdWcuXCJ9fV0sXG4gICAgXCJEdWQuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkR1ZC5cIjogW3tcInllYXJcIjoxODM3LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODM4LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztzY1wiXSxcbiAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiU291dGggQ2Fyb2xpbmEgUmVwb3J0cywgRHVkbGV5XCIsXG4gICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJEdWQuKFMuQy4pXCI6IFwiRHVkLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkR1ZC5MLlwiOiBcIkR1ZC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJEdWQuTC4oUy5DLilcIjogXCJEdWQuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiRHVkbC5cIjogXCJEdWQuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiUy5DLkwuKER1ZC4pXCI6IFwiRHVkLlwifX1dLFxuICAgIFwiRHVkLiBFcS5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkR1ZC4gRXEuXCI6IFt7XCJ5ZWFyXCI6MTgzNywgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODM4LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7c2NcIl0sXG4gICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJTb3V0aCBDYXJvbGluYSBSZXBvcnRzLCBEdWRsZXkncyBFcXVpdHlcIixcbiAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJEdWQuQ2guXCI6IFwiRHVkLiBFcS5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiRHVkLkVxLihTLkMuKVwiOiBcIkR1ZC4gRXEuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkR1ZGwuXCI6IFwiRHVkLiBFcS5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiUy5DLkVxLihEdWQuRXEuKVwiOiBcIkR1ZC4gRXEuXCJ9fV0sXG4gICAgXCJEdXYuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkR1di5cIjogW3tcInllYXJcIjoxODYzLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODY2LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztreVwiXSxcbiAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiS2VudHVja3kgUmVwb3J0cywgRHV2YWxsXCIsXG4gICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJLeS4oRHV2LilcIjogXCJEdXYuXCJ9fV0sXG4gICAgXCJFZG0uIFNlbC4gQ2FzLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiRWRtLiBTZWwuIENhcy5cIjogW3tcInllYXJcIjoxODM0LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4NTMsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztueVwiXSxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIkVkbW9uZCdzIFNlbGVjdCBDYXNlc1wiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkVkbS5TZWwuQ2EuXCI6IFwiRWRtLiBTZWwuIENhcy5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiRWRtLlNlbC5DYXMuKE4uWS4pXCI6IFwiRWRtLiBTZWwuIENhcy5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiRWRtb25kXCI6IFwiRWRtLiBTZWwuIENhcy5cIn19XSxcbiAgICBcIkVkdy4gQ2guXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJFZHcuIENoLlwiOiBbe1wieWVhclwiOjE4MzEsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTg1MCwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO255XCJdLFxuICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiRWR3YXJkcycgQ2hhbmNlcnkgUmVwb3J0c1wiLFxuICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkVkLkMuUi5cIjogXCJFZHcuIENoLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJFZC5DaC5cIjogXCJFZHcuIENoLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJFZHcuXCI6IFwiRWR3LiBDaC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiRWR3LkNoLihOLlkuKVwiOiBcIkVkdy4gQ2guXCJ9fV0sXG4gICAgXCJGLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwiZmVkXCIsXG4gICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkYuXCI6IFt7XCJ5ZWFyXCI6MTg4MCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxOTI0LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XSxcbiAgICAgICAgICAgICAgICAgICAgICAgICBcIkYuMmRcIjogW3tcInllYXJcIjoxOTI0LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTk5MywgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgXCJGLjNkXCI6IFt7XCJ5ZWFyXCI6MTk5MywgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7ZmVkZXJhbDsxLWNpclwiLFwidXM7ZmVkZXJhbDsyLWNpclwiLFwidXM7ZmVkZXJhbDszLWNpclwiLFwidXM7ZmVkZXJhbDs0LWNpclwiLFwidXM7ZmVkZXJhbDs1LWNpclwiLFwidXM7ZmVkZXJhbDs2LWNpclwiLFwidXM7ZmVkZXJhbDs3LWNpclwiLFwidXM7ZmVkZXJhbDs4LWNpclwiLFwidXM7ZmVkZXJhbDs5LWNpclwiLFwidXM7ZmVkZXJhbDsxMC1jaXJcIixcInVzO2ZlZGVyYWw7MTEtY2lyXCJdLFxuICAgICAgICAgICAgXCJuYW1lXCI6IFwiRmVkZXJhbCBSZXBvcnRlclwiLFxuICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkYuIDJkXCI6IFwiRi4yZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJGLiAzZFwiOiBcIkYuM2RcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiRi4yZC5cIjogXCJGLjJkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBcIkYuM2QuXCI6IFwiRi4zZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJGZWQuUi5cIjogXCJGLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJGZWQuUi4yZFwiOiBcIkYuMmRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiRmVkLlIuM2RcIjogXCJGLjNkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBcIkZlZC5SZXAuXCI6IFwiRi5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiRmVkLlJlcC4yZFwiOiBcIkYuMmRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiRmVkLlJlcC4zZFwiOiBcIkYuM2RcIn19XSxcbiAgICBcIkYuIEFwcCd4XCI6IFt7XCJjaXRlX3R5cGVcIjogXCJmZWRcIixcbiAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkYuIEFwcCd4XCI6IFt7XCJ5ZWFyXCI6MjAwMSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2ZlZGVyYWw7MS1jaXJcIixcInVzO2ZlZGVyYWw7Mi1jaXJcIixcInVzO2ZlZGVyYWw7My1jaXJcIixcInVzO2ZlZGVyYWw7NC1jaXJcIixcInVzO2ZlZGVyYWw7NS1jaXJcIixcInVzO2ZlZGVyYWw7Ni1jaXJcIixcInVzO2ZlZGVyYWw7Ny1jaXJcIixcInVzO2ZlZGVyYWw7OC1jaXJcIixcInVzO2ZlZGVyYWw7OS1jaXJcIixcInVzO2ZlZGVyYWw7MTAtY2lyXCIsXCJ1cztmZWRlcmFsOzExLWNpclwiXSxcbiAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJGZWRlcmFsIEFwcGVuZGl4XCIsXG4gICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fV0sXG4gICAgXCJGLiBDYXMuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJmZWRcIixcbiAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJGLiBDYXMuXCI6IFt7XCJ5ZWFyXCI6MTc4OSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTg4MCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX1dfSxcbiAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzXCJdLFxuICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJGZWRlcmFsIENhc2VzXCIsXG4gICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJGLkMuXCI6IFwiRi4gQ2FzLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkYuQ2FzLlwiOiBcIkYuIENhcy5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJGZWQuQ2EuXCI6IFwiRi4gQ2FzLlwifX1dLFxuICAgIFwiRi4gU3VwcC5cIjogW3tcImNpdGVfdHlwZVwiOiBcImZlZFwiLFxuICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJGLiBTdXBwLlwiOiBbe1wieWVhclwiOjE5MzIsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTk4OCwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJGLiBTdXBwLiAyZFwiOiBbe1wieWVhclwiOjE5ODgsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1c1wiXSxcbiAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIkZlZGVyYWwgU3VwcGxlbWVudFwiLFxuICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkYuIFN1cHAuMmRcIjogXCJGLiBTdXBwLiAyZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJGLlN1cHAuXCI6IFwiRi4gU3VwcC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiRi5TdXBwLiAyZFwiOiBcIkYuIFN1cHAuIDJkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkYuU3VwcC4yZFwiOiBcIkYuIFN1cHAuIDJkXCJ9fV0sXG4gICAgXCJGLlIuRC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInNwZWNpYWx0eVwiLFxuICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiRi5SLkQuXCI6IFt7XCJ5ZWFyXCI6MjAwMSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzXCJdLFxuICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIkZlZGVyYWwgUnVsZXMgRGVjaXNpb25zXCIsXG4gICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fV0sXG4gICAgXCJGTFwiOiBbe1wiY2l0ZV90eXBlXCI6IFwibmV1dHJhbFwiLFxuICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJGTFwiOiBbe1wieWVhclwiOjE3NTAsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztmbFwiXSxcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIkZsb3JpZGEgTmV1dHJhbCBDaXRhdGlvblwiLFxuICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fV0sXG4gICAgXCJGZWQuIENsLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3BlY2lhbHR5XCIsXG4gICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkZlZC4gQ2wuXCI6IFt7XCJ5ZWFyXCI6MTk5MiwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzXCJdLFxuICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiVW5pdGVkIFN0YXRlcyBDbGFpbXMgQ291cnQgUmVwb3J0ZXJcIixcbiAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJGZWQuQ2wuXCI6IFwiRmVkLiBDbC5cIn19XSxcbiAgICBcIkZlZC4gUi4gU2Vydi5cIjogW3tcImNpdGVfdHlwZVwiOiBcInNwZWNpYWx0eVwiLFxuICAgICAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkZlZC4gUi4gU2Vydi5cIjogW3tcInllYXJcIjoxOTM4LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkZlZC4gUi4gU2Vydi4gMmRcIjogW3tcInllYXJcIjoxOTM4LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkZlZC4gUi4gU2Vydi4gM2RcIjogW3tcInllYXJcIjoxOTM4LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXNcIl0sXG4gICAgICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIkZlZGVyYWwgUnVsZXMgU2VydmljZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiRmVkLiBSLiBTZXJ2LiAoQ2FsbGFnaGFuKVwiOiBcIkZlZC4gUi4gU2Vydi5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJGZWQuIFIuIFNlcnYuIDJkIChDYWxsYWdoYW4pXCI6IFwiRmVkLiBSLiBTZXJ2LiAyZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkZlZC4gUi4gU2Vydi4gM2QgKFdlc3QpXCI6IFwiRmVkLiBSLiBTZXJ2LiAzZFwifX1dLFxuICAgIFwiRmxhLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJGbGEuXCI6IFt7XCJ5ZWFyXCI6MTg0NiwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTk0OCwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7ZmxcIl0sXG4gICAgICAgICAgICAgIFwibmFtZVwiOiBcIkZsb3JpZGEgUmVwb3J0c1wiLFxuICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiRmxvci5cIjogXCJGbGEuXCIsIFwiRmxvcmlkYVwiOiBcIkZsYS5cIn19XSxcbiAgICBcIkZsYS4gTC4gV2Vla2x5XCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJGbGEuIEwuIFdlZWtseVwiOiBbe1wieWVhclwiOjE5NzgsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztmbFwiXSxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIkZsb3JpZGEgTGF3IFdlZWtseVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fV0sXG4gICAgXCJGbGEuIEwuIFdlZWtseSBTdXBwLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiRmxhLiBMLiBXZWVrbHkgU3VwcC5cIjogW3tcInllYXJcIjoxOTkyLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7ZmxcIl0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJGbG9yaWRhIExhdyBXZWVrbHkgU3VwcGxlbWVudFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fV0sXG4gICAgXCJGbGEuIFN1cHAuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkZsYS4gU3VwcC5cIjogW3tcInllYXJcIjoxOTQ4LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxOTgxLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiRmxhLiBTdXBwLiAyZFwiOiBbe1wieWVhclwiOjE5ODMsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE5OTIsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2ZsXCJdLFxuICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJGbG9yaWRhIFN1cHBsZW1lbnRcIixcbiAgICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkZsLlMuXCI6IFwiRmxhLiBTdXBwLlwifX1dLFxuICAgIFwiRy4gJiBKLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJHLiAmIEouXCI6IFt7XCJ5ZWFyXCI6MTgyOSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTg0MiwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bWRcIl0sXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIk1hcnlsYW5kIFJlcG9ydHMsIEdpbGwgJiBKb2huc29uXCIsXG4gICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiR2EuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiR2EuXCI6IFt7XCJ5ZWFyXCI6MTg0NiwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2dhXCJdLFxuICAgICAgICAgICAgIFwibmFtZVwiOiBcIkdlb3JnaWEgUmVwb3J0c1wiLFxuICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiR2EuIEFwcC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkdhLiBBcHAuXCI6IFt7XCJ5ZWFyXCI6MTkwNywgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2dhXCJdLFxuICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiR2VvcmdpYSBBcHBlYWxzIFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiR2lsZC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkdpbGQuXCI6IFt7XCJ5ZWFyXCI6MTg4MywgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODg5LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bm1cIl0sXG4gICAgICAgICAgICAgICBcIm5hbWVcIjogXCJHaWxkZXJzbGVldmUgUmVwb3J0c1wiLFxuICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkdpbGRlcnNsZWV2ZVwiOiBcIkdpbGQuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkdpbGRyLlwiOiBcIkdpbGQuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk4uTS4oRy4pXCI6IFwiR2lsZC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTi5NLihHaWxkLilcIjogXCJHaWxkLlwifX1dLFxuICAgIFwiR2lsbFwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJHaWxsXCI6IFt7XCJ5ZWFyXCI6MTg0MywgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTg1MSwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bWRcIl0sXG4gICAgICAgICAgICAgIFwibmFtZVwiOiBcIk1hcnlsYW5kIFJlcG9ydHMsIEdpbGxcIixcbiAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fV0sXG4gICAgXCJHaWxtLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiR2lsbS5cIjogW3tcInllYXJcIjoxODQ0LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4NDksIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztpbFwiXSxcbiAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIklsbGlub2lzIFJlcG9ydHMsIEdpbG1hblwiLFxuICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkdpbG0uKElsbC4pXCI6IFwiR2lsbS5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiR2lsbWFuXCI6IFwiR2lsbS5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiSWxsLihHaWxtLilcIjogXCJHaWxtLlwifX1dLFxuICAgIFwiR2lsbWVyXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiR2lsbWVyXCI6IFt7XCJ5ZWFyXCI6MTgyMCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4MjEsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7dmFcIl0sXG4gICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiVmlyZ2luaWEgUmVwb3J0cywgR2lsbWVyXCIsXG4gICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkdpbC5cIjogXCJHaWxtZXJcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkdpbG0uXCI6IFwiR2lsbWVyXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJHaWxtZXIgKFZhLilcIjogXCJHaWxtZXJcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlZhLihHaWxtZXIpXCI6IFwiR2lsbWVyXCJ9fV0sXG4gICAgXCJHcmFudFwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiR3JhbnRcIjogW3tcInllYXJcIjoxODE0LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4NjMsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztwYVwiXSxcbiAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIlBlbm5zeWx2YW5pYSBTdGF0ZSBSZXBvcnRzLCBHcmFudFwiLFxuICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkdyLlwiOiBcIkdyYW50XCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkdyYW50IChQYS4pXCI6IFwiR3JhbnRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiR3JhbnQgQ2FzLlwiOiBcIkdyYW50XCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkdyYW50IENhcy4oUGEuKVwiOiBcIkdyYW50XCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkdyYW50IFBhLlwiOiBcIkdyYW50XCJ9fV0sXG4gICAgXCJHcmF0dC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJHcmF0dC5cIjogW3tcInllYXJcIjoxODQ0LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTg4MCwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1czt2YVwiXSxcbiAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJWaXJnaW5pYSBSZXBvcnRzLCBHcmF0dGFuXCIsXG4gICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkdyYXR0LihWYS4pXCI6IFwiR3JhdHQuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJWYS4oR3JhdHQuKVwiOiBcIkdyYXR0LlwifX1dLFxuICAgIFwiR3JheVwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJHcmF5XCI6IFt7XCJ5ZWFyXCI6MTg1NCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTg2MCwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bWFcIl0sXG4gICAgICAgICAgICAgIFwibmFtZVwiOiBcIk1hc3NhY2h1c2V0dHMgUmVwb3J0cywgR3JheVwiLFxuICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiR3JheSAoTWFzcy4pXCI6IFwiR3JheVwiLCBcIk1hc3MuKEdyYXkpXCI6IFwiR3JheVwifX1dLFxuICAgIFwiR3JlZW5lXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiR3JlZW5lXCI6IFt7XCJ5ZWFyXCI6MTg0NywgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4NTQsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widWk7aWFcIl0sXG4gICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiSW93YSBSZXBvcnRzLCBHcmVlbmVcIixcbiAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiR3JlZW5lIEcuKElvd2EpXCI6IFwiR3JlZW5lXCJ9fV0sXG4gICAgXCJHdWFtXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkd1YW1cIjogW3tcInllYXJcIjoxOTU1LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7Z3VcIl0sXG4gICAgICAgICAgICAgIFwibmFtZVwiOiBcIkd1YW0gUmVwb3J0c1wiLFxuICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge319XSxcbiAgICBcIkd1bmJ5XCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJHdW5ieVwiOiBbe1wieWVhclwiOjE4ODUsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTg4NSwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2xhXCJdLFxuICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiTG91aXNpYW5hIENvdXJ0IG9mIEFwcGVhbHMgUmVwb3J0cywgR3VuYnlcIixcbiAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJHdW5ieSAoTGEuKVwiOiBcIkd1bmJ5XCJ9fV0sXG4gICAgXCJILiAmIEcuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkguICYgRy5cIjogW3tcInllYXJcIjoxODI2LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODI5LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1czttZFwiXSxcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiTWFyeWxhbmQgUmVwb3J0cywgSGFycmlzIGFuZCBHaWxsXCIsXG4gICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiSC4gJiBKLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJILiAmIEouXCI6IFt7XCJ5ZWFyXCI6MTgwMCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTgyNiwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bWRcIl0sXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIk1hcnlsYW5kIFJlcG9ydHMsIEhhcnJpcyBhbmQgSm9obnNvblwiLFxuICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge319XSxcbiAgICBcIkguICYgTWNILlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkguICYgTWNILlwiOiBbe1wieWVhclwiOjE3NzAsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxNzk5LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO21kXCJdLFxuICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIk1hcnlsYW5kIFJlcG9ydHMsIEhhcnJpcyBhbmQgTWNIZW5yeVwiLFxuICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiSGFyZC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkhhcmQuXCI6IFt7XCJ5ZWFyXCI6MTgwNSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODA4LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7a3lcIl0sXG4gICAgICAgICAgICAgICBcIm5hbWVcIjogXCJLZW50dWNreSBSZXBvcnRzLCBIYXJkaW5cIixcbiAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJIYXJkaW5cIjogXCJIYXJkLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJIYXJkaW4oS3kuKVwiOiBcIkhhcmQuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkt5LihIYXJkLilcIjogXCJIYXJkLlwifX1dLFxuICAgIFwiSGFycC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkhhcnAuXCI6IFt7XCJ5ZWFyXCI6MTgyMywgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODMxLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7c2NcIl0sXG4gICAgICAgICAgICAgICBcIm5hbWVcIjogXCJTb3V0aCBDYXJvbGluYSBSZXBvcnRzLCBIYXJwZXJcIixcbiAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJIYXJwLkwuXCI6IFwiSGFycC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiSGFycC5MLihTLkMuKVwiOiBcIkhhcnAuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkhhcnBlclwiOiBcIkhhcnAuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlMuQy5MLihIYXJwLilcIjogXCJIYXJwLlwifX1dLFxuICAgIFwiSGFycC4gRXEuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiSGFycC4gRXEuXCI6IFt7XCJ5ZWFyXCI6MTgyNCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4MjQsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7c2NcIl0sXG4gICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiU291dGggQ2Fyb2xpbmEgUmVwb3J0cywgSGFycGVyJ3MgRXF1aXR5XCIsXG4gICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkhhcnAuXCI6IFwiSGFycC4gRXEuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJIYXJwLkVxLihTLkMuKVwiOiBcIkhhcnAuIEVxLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiSGFycGVyXCI6IFwiSGFycC4gRXEuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJTLkMuRXEuKEhhcnAuRXEuKVwiOiBcIkhhcnAuIEVxLlwifX1dLFxuICAgIFwiSGFycmluZ3RvblwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJIYXJyaW5ndG9uXCI6IFt7XCJ5ZWFyXCI6MTgzMiwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTg1NSwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7ZGVcIl0sXG4gICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIkRlbGF3YXJlIFJlcG9ydHMsIEhhcnJpbmd0b25cIixcbiAgICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fV0sXG4gICAgXCJIYXcuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkhhdy5cIjogW3tcInllYXJcIjoxODQ3LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7aGlcIl0sXG4gICAgICAgICAgICAgIFwibmFtZVwiOiBcIkhhd2FpaSBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJILlwiOiBcIkhhdy5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJIYXdhaWBpXCI6IFwiSGF3LlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkhhd2FpaVwiOiBcIkhhdy5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJIYXdhaWkgUmVwLlwiOiBcIkhhdy5cIn19XSxcbiAgICBcIkhhdy4gQXBwLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkhhdy4gQXBwLlwiOiBbe1wieWVhclwiOjE5ODAsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxOTk0LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2hpXCJdLFxuICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIkhhd2FpaSBBcHBlbGxhdGUgUmVwb3J0c1wiLFxuICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJIYXdhaWkgQXBwLlwiOiBcIkhhdy4gQXBwLlwifX1dLFxuICAgIFwiSGF3a3NcIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkhhd2tzXCI6IFt7XCJ5ZWFyXCI6MTgyMCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODI2LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bmNcIl0sXG4gICAgICAgICAgICAgICBcIm5hbWVcIjogXCJOb3J0aCBDYXJvbGluYSBSZXBvcnRzLCBIYXdrc1wiLFxuICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkhhd2tzKE4uQy4pXCI6IFwiSGF3a3NcIiwgXCJOLkMuKEhhd2tzKVwiOiBcIkhhd2tzXCJ9fV0sXG4gICAgXCJIYXkuICYgSGF6LlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiSGF5LiAmIEhhei5cIjogW3tcInllYXJcIjoxODQxLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4NjIsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztkY1wiXSxcbiAgICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIkRpc3RyaWN0IG9mIENvbHVtYmlhIFJlcG9ydHMsIEhheXdhcmQgJiBIYXplbHRvblwiLFxuICAgICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkhheXcuJiBILlwiOiBcIkhheS4gJiBIYXouXCJ9fV0sXG4gICAgXCJIYXl3LlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiSGF5dy5cIjogW3tcInllYXJcIjoxNzg5LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4MDYsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztuY1wiXSxcbiAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIk5vcnRoIENhcm9saW5hIFJlcG9ydHMsIEhheXdvb2RcIixcbiAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJIYXkuXCI6IFwiSGF5dy5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiSGF5dy5OLkMuXCI6IFwiSGF5dy5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTi5DLihIYXl3LilcIjogXCJIYXl3LlwifX0sXG4gICAgICAgICAgICAgIHtcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkhheXcuXCI6IFt7XCJ5ZWFyXCI6MTgxNiwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODE4LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7dG5cIl0sXG4gICAgICAgICAgICAgICBcIm5hbWVcIjogXCJUZW5uZXNzZWUgUmVwb3J0cywgSGF5d29vZFwiLFxuICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkhheXcuKFRlbm4uKVwiOiBcIkhheXcuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkhheXcuVGVubi5cIjogXCJIYXl3LlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJUZW5uLihIYXl3LilcIjogXCJIYXl3LlwifX1dLFxuICAgIFwiSGVhZFwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJIZWFkXCI6IFt7XCJ5ZWFyXCI6MTg1OCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTg2MCwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7dG5cIl0sXG4gICAgICAgICAgICAgIFwibmFtZVwiOiBcIlRlbm5lc3NlZSBSZXBvcnRzLCBIZWFkXCIsXG4gICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJIZWFkKFRlbm4uKVwiOiBcIkhlYWRcIiwgXCJUZW5uLihIZWFkKVwiOiBcIkhlYWRcIn19XSxcbiAgICBcIkhlaXNrLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkhlaXNrLlwiOiBbe1wieWVhclwiOjE4NzAsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODc5LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3RuXCJdLFxuICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIlRlbm5lc3NlZSBSZXBvcnRzLCBIZWlza2VsbFwiLFxuICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJIZWlzay4oVGVubi4pXCI6IFwiSGVpc2suXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJUZW5uLihIZWlzay4pXCI6IFwiSGVpc2suXCJ9fV0sXG4gICAgXCJIZW4uICYgTS5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJIZW4uICYgTS5cIjogW3tcInllYXJcIjoxODA2LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTgxMCwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1czt2YVwiXSxcbiAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJWaXJnaW5pYSBSZXBvcnRzLCBIZW5pbmcgJiBNdW5mb3JkXCIsXG4gICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkguJiBNLlwiOiBcIkhlbi4gJiBNLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiSC4mIE0uKFZhLilcIjogXCJIZW4uICYgTS5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkhlbi4mIE11bi5cIjogXCJIZW4uICYgTS5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlZhLihIZW4uJiBNLilcIjogXCJIZW4uICYgTS5cIn19XSxcbiAgICBcIkhpbGxcIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiSGlsbFwiOiBbe1wieWVhclwiOjE4NDEsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4NDQsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO255XCJdLFxuICAgICAgICAgICAgICBcIm5hbWVcIjogXCJIaWxsJ3MgTmV3IFlvcmsgUmVwb3J0c1wiLFxuICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiSC5cIjogXCJIaWxsXCIsIFwiSGlsbC5OLlkuXCI6IFwiSGlsbFwifX0sXG4gICAgICAgICAgICAge1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJIaWxsXCI6IFt7XCJ5ZWFyXCI6MTgzMywgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTgzNywgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7c2NcIl0sXG4gICAgICAgICAgICAgIFwibmFtZVwiOiBcIlNvdXRoIENhcm9saW5hIFJlcG9ydHMsIEhpbGxcIixcbiAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkhpbGwgTGF3XCI6IFwiSGlsbFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkhpbGwgUy5DLlwiOiBcIkhpbGxcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJTLkMuTC4oSGlsbClcIjogXCJIaWxsXCJ9fV0sXG4gICAgXCJIaWxsICYgRGVuLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiSGlsbCAmIERlbi5cIjogW3tcInllYXJcIjoxODQyLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4NDQsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztueVwiXSxcbiAgICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIkhpbGwgYW5kIERlbmlvIFN1cHBsZW1lbnQgKExhbG9yKVwiLFxuICAgICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkhpbGwgJiBELlN1cHAuXCI6IFwiSGlsbCAmIERlbi5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiSGlsbCAmIERlbi5TdXBwLlwiOiBcIkhpbGwgJiBEZW4uXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkxhbG9yXCI6IFwiSGlsbCAmIERlbi5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTGFsb3IgU3VwcC5cIjogXCJIaWxsICYgRGVuLlwifX1dLFxuICAgIFwiSGlsbCBFcS5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkhpbGwgRXEuXCI6IFt7XCJ5ZWFyXCI6MTgzMywgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODM3LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7c2NcIl0sXG4gICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJTb3V0aCBDYXJvbGluYSBSZXBvcnRzLCBIaWxsJ3MgQ2hhbmNlcnlcIixcbiAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJIaWxsXCI6IFwiSGlsbCBFcS5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiSGlsbCBDaC5cIjogXCJIaWxsIEVxLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJIaWxsIEVxLihTLkMuKVwiOiBcIkhpbGwgRXEuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkhpbGwgUy5DLlwiOiBcIkhpbGwgRXEuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlMuQy5FcS4oSGlsbCBFcS4pXCI6IFwiSGlsbCBFcS5cIn19XSxcbiAgICBcIkhvZmYuIENoLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkhvZmYuIENoLlwiOiBbe1wieWVhclwiOjE4MzgsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODQwLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO255XCJdLFxuICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIkhvZmZtYW4ncyBDaGFuY2VyeSBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkhvZmYuXCI6IFwiSG9mZi4gQ2guXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJIb2ZmLkNoYS5cIjogXCJIb2ZmLiBDaC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkhvZmYuTi5ZLlwiOiBcIkhvZmYuIENoLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiSG9mZm0uXCI6IFwiSG9mZi4gQ2guXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJIb2ZmbS5DaC4oTi5ZLilcIjogXCJIb2ZmLiBDaC5cIn19XSxcbiAgICBcIkhvcGsuIENoLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkhvcGsuIENoLlwiOiBbe1wieWVhclwiOjE4MjMsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODI2LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO255XCJdLFxuICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIkhvcGtpbnMnIENoYW5jZXJ5IFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge319XSxcbiAgICBcIkhvdXN0b25cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiSG91c3RvblwiOiBbe1wieWVhclwiOjE4NTUsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4OTMsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2RlXCJdLFxuICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJEZWxhd2FyZSBSZXBvcnRzLCBIb3VzdG9uXCIsXG4gICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiSG93LlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic2NvdHVzX2Vhcmx5XCIsXG4gICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiSG93LlwiOiBbe1wieWVhclwiOjE4NDMsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4NjAsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2ZlZGVyYWw7c3VwcmVtZS5jb3VydFwiXSxcbiAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiSG93YXJkJ3MgU3VwcmVtZSBDb3VydCBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJVLlMuKEhvdy4pXCI6IFwiSG93LlwifX1dLFxuICAgIFwiSG93LiBQci5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkhvdy4gUHIuXCI6IFt7XCJ5ZWFyXCI6MTg0NCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODg2LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bnlcIl0sXG4gICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJIb3dhcmQncyBQcmFjdGljZSBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiSG93LlAuUi5cIjogXCJIb3cuIFByLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJIb3cuUHJhYy4oTi5ZLilcIjogXCJIb3cuIFByLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJOLlkuU3BlYy5UZXJtIFIuXCI6IFwiSG93LiBQci5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTi5ZLlNwZWMuVGVybSBSZXAuXCI6IFwiSG93LiBQci5cIn19XSxcbiAgICBcIkhvd2FyZFwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkhvd2FyZFwiOiBbe1wieWVhclwiOjE4MzQsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODQzLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO21zXCJdLFxuICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIk1pc3Npc3NpcHBpIFJlcG9ydHMsIEhvd2FyZFwiLFxuICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJIb3cuXCI6IFwiSG93YXJkXCIsIFwiTWlzcy4oSG93YXJkKVwiOiBcIkhvd2FyZFwifX1dLFxuICAgIFwiSHVnaGVzXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiSHVnaGVzXCI6IFt7XCJ5ZWFyXCI6MTc4NSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4MDEsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7a3lcIl0sXG4gICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiS2VudHVja3kgUmVwb3J0cywgSHVnaGVzXCIsXG4gICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkh1Z2guXCI6IFwiSHVnaGVzXCIsIFwiS3kuKEh1Z2hlcylcIjogXCJIdWdoZXNcIn19XSxcbiAgICBcIkh1bS5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiSHVtLlwiOiBbe1wieWVhclwiOjE4MzksIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4NTEsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3RuXCJdLFxuICAgICAgICAgICAgICBcIm5hbWVcIjogXCJUZW5uZXNzZWUgUmVwb3J0cywgSHVtcGhyZXlzXCIsXG4gICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJIdW1waC5cIjogXCJIdW0uXCIsIFwiVGVubi4oSHVtLilcIjogXCJIdW0uXCJ9fV0sXG4gICAgXCJJLlQuUi5ELiAoQk5BKVwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3BlY2lhbHR5XCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkkuVC5SLkQuIChCTkEpXCI6IFt7XCJ5ZWFyXCI6MTk4MCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzXCJdLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiSW50ZXJuYXRpb25hbCBUcmFkZSBSZXBvcnRlciBEZWNpc2lvbnNcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiSWRhaG9cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIklkYWhvXCI6IFt7XCJ5ZWFyXCI6MTk4MiwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2lkXCJdLFxuICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiSWRhaG8gUmVwb3J0c1wiLFxuICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIklkLlwiOiBcIklkYWhvXCIsIFwiSWRhLlwiOiBcIklkYWhvXCJ9fV0sXG4gICAgXCJJbGwuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIklsbC5cIjogW3tcInllYXJcIjoxODQ5LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBcIklsbC4gMmRcIjogW3tcInllYXJcIjoxODQ5LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7aWxcIl0sXG4gICAgICAgICAgICAgIFwibmFtZVwiOiBcIklsbGlub2lzIFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIklsbC4yZFwiOiBcIklsbC4gMmRcIn19XSxcbiAgICBcIklsbC4gQXBwLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIklsbC4gQXBwLlwiOiBbe1wieWVhclwiOjE4NzcsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiSWxsLiBBcHAuIDJkXCI6IFt7XCJ5ZWFyXCI6MTg3NywgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJJbGwuIEFwcC4gM2RcIjogW3tcInllYXJcIjoxODc3LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7aWxcIl0sXG4gICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiSWxsaW5vaXMgQXBwZWxsYXRlIENvdXJ0IFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiSWxsLiBBcHAuMmRcIjogXCJJbGwuIEFwcC4gMmRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIklsbC4gQXBwLjNkXCI6IFwiSWxsLiBBcHAuIDNkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJJbGwuQS5cIjogXCJJbGwuIEFwcC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIklsbC5BLjJkXCI6IFwiSWxsLiBBcHAuIDJkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJJbGwuQS4zZFwiOiBcIklsbC4gQXBwLiAzZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiSWxsLkFwcC5cIjogXCJJbGwuIEFwcC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIklsbC5BcHAuMmRcIjogXCJJbGwuIEFwcC4gMmRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIklsbC5BcHAuM2RcIjogXCJJbGwuIEFwcC4gM2RcIn19XSxcbiAgICBcIklsbC4gQ3QuIENsLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIklsbC4gQ3QuIENsLlwiOiBbe1wieWVhclwiOjE4ODksIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztpbFwiXSxcbiAgICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJJbGxpbm9pcyBDb3VydCBvZiBDbGFpbXMgUmVwb3J0c1wiLFxuICAgICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiSWxsLiBEZWMuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiSWxsLiBEZWMuXCI6IFt7XCJ5ZWFyXCI6MTk3NiwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2lsXCJdLFxuICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIldlc3QncyBJbGxpbm9pcyBEZWNpc2lvbnNcIixcbiAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiSWxsLkRlYy5cIjogXCJJbGwuIERlYy5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIklsbC5EZWNzLlwiOiBcIklsbC4gRGVjLlwifX1dLFxuICAgIFwiSW5kLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJJbmQuXCI6IFt7XCJ5ZWFyXCI6MTg0OCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTk4MSwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7aW5cIl0sXG4gICAgICAgICAgICAgIFwibmFtZVwiOiBcIkluZGlhbmEgUmVwb3J0c1wiLFxuICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiSW5kLlJlcC5cIjogXCJJbmQuXCJ9fV0sXG4gICAgXCJJbmQuIEFwcC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJJbmQuIEFwcC5cIjogW3tcInllYXJcIjoxODkwLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTk3OSwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztpblwiXSxcbiAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJJbmRpYW5hIENvdXJ0IG9mIEFwcGVhbHMgUmVwb3J0c1wiLFxuICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiSW5kaWFuIFRlcnIuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiSW5kaWFuIFRlcnIuXCI6IFt7XCJ5ZWFyXCI6MTg5NiwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE5MDcsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7b2tcIl0sXG4gICAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiSW5kaWFuIFRlcnJpdG9yeSBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fV0sXG4gICAgXCJJb3dhXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIklvd2FcIjogW3tcInllYXJcIjoxODU1LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxOTY4LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztpYVwiXSxcbiAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiSW93YSBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiSXJlZC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIklyZWQuXCI6IFt7XCJ5ZWFyXCI6MTg0MCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODUyLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bmNcIl0sXG4gICAgICAgICAgICAgICBcIm5hbWVcIjogXCJOb3J0aCBDYXJvbGluYSBSZXBvcnRzLCBJcmVkZWxsJ3MgTGF3XCIsXG4gICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiSXJlZC5MLlwiOiBcIklyZWQuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIklyZWQuTC4oTi5DLilcIjogXCJJcmVkLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJOLkMuKElyZWQuKVwiOiBcIklyZWQuXCJ9fV0sXG4gICAgXCJJcmVkLiBFcS5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJJcmVkLiBFcS5cIjogW3tcInllYXJcIjoxODQwLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTg1MiwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztuY1wiXSxcbiAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJOb3J0aCBDYXJvbGluYSBSZXBvcnRzLCBJcmVkZWxsJ3MgRXF1aXR5XCIsXG4gICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIklyZWQuXCI6IFwiSXJlZC4gRXEuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJJcmVkLkVxLihOLkMuKVwiOiBcIklyZWQuIEVxLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTi5DLihJcmVkLkVxLilcIjogXCJJcmVkLiBFcS5cIn19XSxcbiAgICBcIkouSi4gTWFyc2guXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJKLkouIE1hcnNoLlwiOiBbe1wieWVhclwiOjE4MjksIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTgzMiwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2t5XCJdLFxuICAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiS2VudHVja3kgUmVwb3J0cywgTWFyc2hhbGwsIEouSi5cIixcbiAgICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJKLkouTWFyLlwiOiBcIkouSi4gTWFyc2guXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkouSi5NYXJzaC4oS3kuKVwiOiBcIkouSi4gTWFyc2guXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkt5LihKLkouTWFyc2guKVwiOiBcIkouSi4gTWFyc2guXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk1hcnNoLlwiOiBcIkouSi4gTWFyc2guXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk1hcnNoLihLeS4pXCI6IFwiSi5KLiBNYXJzaC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTWFyc2guSi5KLlwiOiBcIkouSi4gTWFyc2guXCJ9fV0sXG4gICAgXCJKb2hucy5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJKb2hucy5cIjogW3tcInllYXJcIjoxODA2LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTgyMywgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztueVwiXSxcbiAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJKb2huc29uJ3MgUmVwb3J0c1wiLFxuICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJKLlwiOiBcIkpvaG5zLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiSm9obi5cIjogXCJKb2hucy5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkpvaG5zLkN0LkVyci5cIjogXCJKb2hucy5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkpvaG5zLk4uWS5cIjogXCJKb2hucy5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkpvaG5zLlJlcC5cIjogXCJKb2hucy5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkpvaG5zb25cIjogXCJKb2hucy5cIn19XSxcbiAgICBcIkpvaG5zLiBDYXMuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJKb2hucy4gQ2FzLlwiOiBbe1wieWVhclwiOjE3OTksIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTgwMywgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO255XCJdLFxuICAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiSm9obnNvbidzIENhc2VzXCIsXG4gICAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiSm9obnMuQ2FzLihOLlkuKVwiOiBcIkpvaG5zLiBDYXMuXCJ9fV0sXG4gICAgXCJKb2hucy4gQ2guXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkpvaG5zLiBDaC5cIjogW3tcInllYXJcIjoxODE0LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODIzLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztueVwiXSxcbiAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiSm9obnNvbnMnIENoYW5jZXJ5IFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkouQ2guXCI6IFwiSm9obnMuIENoLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkpvaG5zLlwiOiBcIkpvaG5zLiBDaC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJKb2hucy4oTi5ZLilcIjogXCJKb2hucy4gQ2guXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiSm9obnMuQ2guKE4uWS4pXCI6IFwiSm9obnMuIENoLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkpvaG5zLkNoLkNhcy5cIjogXCJKb2hucy4gQ2guXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiSm9obnMuUmVwLlwiOiBcIkpvaG5zLiBDaC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJKb2huc29uXCI6IFwiSm9obnMuIENoLlwifX1dLFxuICAgIFwiSm9uZXNcIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkpvbmVzXCI6IFt7XCJ5ZWFyXCI6MTg1MywgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODYyLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bmNcIl0sXG4gICAgICAgICAgICAgICBcIm5hbWVcIjogXCJOb3J0aCBDYXJvbGluYSBSZXBvcnRzLCBKb25lcycgTGF3XCIsXG4gICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiSm9uZXMgTC5cIjogXCJKb25lc1wiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJKb25lcyBOLkMuXCI6IFwiSm9uZXNcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTi5DLihKb25lcylcIjogXCJKb25lc1wifX1dLFxuICAgIFwiSm9uZXMgRXEuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiSm9uZXMgRXEuXCI6IFt7XCJ5ZWFyXCI6MTg1MywgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4NjMsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bmNcIl0sXG4gICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiTm9ydGggQ2Fyb2xpbmEgUmVwb3J0cywgSm9uZXMnIEVxdWl0eVwiLFxuICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJKb25lc1wiOiBcIkpvbmVzIEVxLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTi5DLihKb25lcyBFcS4pXCI6IFwiSm9uZXMgRXEuXCJ9fV0sXG4gICAgXCJLYW4uXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkthbi5cIjogW3tcInllYXJcIjoxODYyLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7a3NcIl0sXG4gICAgICAgICAgICAgIFwibmFtZVwiOiBcIkthbnNhcyBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJLYW5zLlwiOiBcIkthbi5cIn19XSxcbiAgICBcIkthbi4gQXBwLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkthbi4gQXBwLlwiOiBbe1wieWVhclwiOjE4OTUsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxOTAxLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJLYW4uIEFwcC4gMmRcIjogW3tcInllYXJcIjoxOTc3LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7a3NcIl0sXG4gICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiS2Fuc2FzIENvdXJ0IG9mIEFwcGVhbHMgUmVwb3J0c1wiLFxuICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJLYW4uIEFwcC4yZFwiOiBcIkthbi4gQXBwLiAyZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiS2FuLkFwcC5cIjogXCJLYW4uIEFwcC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkthbi5BcHAuIDJkXCI6IFwiS2FuLiBBcHAuIDJkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJLYW4uQXBwLjJkXCI6IFwiS2FuLiBBcHAuIDJkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJLYW5zLkFwcC5cIjogXCJLYW4uIEFwcC5cIn19XSxcbiAgICBcIktpcmJ5XCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJLaXJieVwiOiBbe1wieWVhclwiOjE3ODUsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTc4OSwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2N0XCJdLFxuICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiS2lyYnkncyBDb25uZWN0aWN1dCBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiS2lyLlwiOiBcIktpcmJ5XCIsIFwiS2lyYi5cIjogXCJLaXJieVwifX1dLFxuICAgIFwiS3kuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiS3kuXCI6IFt7XCJ5ZWFyXCI6MTg3OSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE5NTEsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7a3lcIl0sXG4gICAgICAgICAgICAgXCJuYW1lXCI6IFwiS2VudHVja3kgUmVwb3J0c1wiLFxuICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiS3kuIEFwcC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkt5LiBBcHAuXCI6IFt7XCJ5ZWFyXCI6MTk5NCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoyMDAwLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7a3lcIl0sXG4gICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJLZW50dWNreSBBcHBlbGxhdGUgUmVwb3J0ZXJcIixcbiAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiS3kuIEwuIFJwdHIuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiS3kuIEwuIFJwdHIuXCI6IFt7XCJ5ZWFyXCI6MTg4MCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE5MDgsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7a3lcIl0sXG4gICAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiS2VudHVja3kgTGF3IFJlcG9ydGVyXCIsXG4gICAgICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIktlbi5MLlJlLlwiOiBcIkt5LiBMLiBScHRyLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiS3kuTC5SLlwiOiBcIkt5LiBMLiBScHRyLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiS3kuTGF3LlJlcC5cIjogXCJLeS4gTC4gUnB0ci5cIn19XSxcbiAgICBcIkt5LiBMLiBTdW1tLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkt5LiBMLiBTdW1tLlwiOiBbe1wieWVhclwiOjE5NjYsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztreVwiXSxcbiAgICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJLZW50dWNreSBMYXcgU3VtbWFyeVwiLFxuICAgICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiS3kuIE9wLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJLeS4gT3AuXCI6IFt7XCJ5ZWFyXCI6MTg2NCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTg4NiwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7a3lcIl0sXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIktlbnR1Y2t5IE9waW5pb25zXCIsXG4gICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJLZW4uT3Bpbi5cIjogXCJLeS4gT3AuXCJ9fV0sXG4gICAgXCJMLiBFZC5cIjogW3tcImNpdGVfdHlwZVwiOiBcImZlZFwiLFxuICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiTC4gRWQuXCI6IFt7XCJ5ZWFyXCI6MTc5MCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE5NTYsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkwuIEVkLiAyZFwiOiBbe1wieWVhclwiOjE5NTYsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztmZWRlcmFsO3N1cHJlbWUuY291cnRcIl0sXG4gICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiTGF3eWVyJ3MgRWRpdGlvblwiLFxuICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJMIEVkXCI6IFwiTC4gRWQuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJMIEVkIDJkXCI6IFwiTC4gRWQuIDJkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJMLiBFZC4yZFwiOiBcIkwuIEVkLiAyZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTC5FLlwiOiBcIkwuIEVkLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTC5FLjJkXCI6IFwiTC4gRWQuIDJkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJMLkVkLlwiOiBcIkwuIEVkLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTC5FZC4gMmRcIjogXCJMLiBFZC4gMmRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkwuRWQuKFUuUy4pXCI6IFwiTC4gRWQuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJMLkVkLjJkXCI6IFwiTC4gRWQuIDJkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJMQVcgRURcIjogXCJMLiBFZC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkxhdy5FZC5cIjogXCJMLiBFZC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlUuUy5MLkVkLlwiOiBcIkwuIEVkLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiVS5TLkwuRWQuMmRcIjogXCJMLiBFZC4gMmRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlUuUy5MYXcuRWQuXCI6IFwiTC4gRWQuXCJ9fV0sXG4gICAgXCJMQVwiOiBbe1wiY2l0ZV90eXBlXCI6IFwibmV1dHJhbFwiLFxuICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJMQVwiOiBbe1wieWVhclwiOjE3NTAsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztsYVwiXSxcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIkxvdWlzaWFuYSBOZXV0cmFsIENpdGF0aW9uXCIsXG4gICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge319XSxcbiAgICBcIkxhLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkxhLlwiOiBbe1wieWVhclwiOjE4MzAsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxOTcyLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2xhXCJdLFxuICAgICAgICAgICAgIFwibmFtZVwiOiBcIkxvdWlzaWFuYSBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fV0sXG4gICAgXCJMYS4gQW5uLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiTGEuIEFubi5cIjogW3tcInllYXJcIjoxODQ2LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE5MDAsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztsYVwiXSxcbiAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIkxvdWlzaWFuYSBBbm51YWwgUmVwb3J0c1wiLFxuICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fV0sXG4gICAgXCJMYS4gQXBwLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiTGEuIEFwcC5cIjogW3tcInllYXJcIjoxOTI0LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE5MzIsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztsYVwiXSxcbiAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIkxvdWlzaWFuYSBDb3VydCBvZiBBcHBlYWxzIFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJMYS5BLlwiOiBcIkxhLiBBcHAuXCJ9fV0sXG4gICAgXCJMYW5zLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiTGFucy5cIjogW3tcInllYXJcIjoxODY5LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4NzMsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztueVwiXSxcbiAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIkxhbnNpbmcncyBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge319XSxcbiAgICBcIkxhbnMuIENoLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkxhbnMuIENoLlwiOiBbe1wieWVhclwiOjE4MjQsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODI2LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO255XCJdLFxuICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIkxhbnNpbmcncyBDaGFuY2VyeSBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkwuXCI6IFwiTGFucy4gQ2guXCIsIFwiTGFucy5cIjogXCJMYW5zLiBDaC5cIn19XSxcbiAgICBcIkxFWElTXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzcGVjaWFsdHlcIixcbiAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiTEVYSVNcIjogW3tcInllYXJcIjoxNzUwLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7Y3RcIixcInVzO2RlXCIsXCJ1cztkY1wiLFwidXM7bWVcIixcInVzO25oXCIsXCJ1cztualwiLFwidXM7cGFcIixcInVzO3JpXCIsXCJ1czt2dFwiLFwidXM7aWxcIixcInVzO2luXCIsXCJ1czttYVwiLFwidXM7bnlcIixcInVzO29oXCIsXCJ1cztpYVwiLFwidXM7bWlcIixcInVzO21uXCIsXCJ1cztuZVwiLFwidXM7bmRcIixcInVzO3NkXCIsXCJ1czt3aVwiLFwidXM7YWtcIixcInVzO2F6XCIsXCJ1cztjYVwiLFwidXM7Y29cIixcInVzO2hpXCIsXCJ1cztpZFwiLFwidXM7a3NcIixcInVzO210XCIsXCJ1cztudlwiLFwidXM7bm1cIixcInVzO29rXCIsXCJ1cztvclwiLFwidXM7dXRcIixcInVzO3dhXCIsXCJ1czt3eVwiLFwidXM7Z2FcIixcInVzO25jXCIsXCJ1cztzY1wiLFwidXM7dmFcIixcInVzO3d2XCIsXCJ1czthclwiLFwidXM7a3lcIixcInVzO21vXCIsXCJ1czt0blwiLFwidXM7dHhcIixcInVzO2FsXCIsXCJ1cztmbFwiLFwidXM7bGFcIixcInVzO21zXCIsXCJ1cztmZWRlcmFsOzEtY2lyXCIsXCJ1cztmZWRlcmFsOzItY2lyXCIsXCJ1cztmZWRlcmFsOzMtY2lyXCIsXCJ1cztmZWRlcmFsOzQtY2lyXCIsXCJ1cztmZWRlcmFsOzUtY2lyXCIsXCJ1cztmZWRlcmFsOzYtY2lyXCIsXCJ1cztmZWRlcmFsOzctY2lyXCIsXCJ1cztmZWRlcmFsOzgtY2lyXCIsXCJ1cztmZWRlcmFsOzktY2lyXCIsXCJ1cztmZWRlcmFsOzEwLWNpclwiLFwidXM7ZmVkZXJhbDsxMS1jaXJcIl0sXG4gICAgICAgICAgICAgICBcIm5hbWVcIjogXCJMZXhpcyBOZXh1cyBDaXRhdGlvblwiLFxuICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fV0sXG4gICAgXCJMZWlnaFwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiTGVpZ2hcIjogW3tcInllYXJcIjoxODI5LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4NDIsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1czt2YVwiXSxcbiAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIlZpcmdpbmlhIFJlcG9ydHMsIExlaWdoXCIsXG4gICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiTGVpZ2ggKFZhLilcIjogXCJMZWlnaFwiLCBcIlZhLihMZWlnaClcIjogXCJMZWlnaFwifX1dLFxuICAgIFwiTGl0dC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkxpdHQuXCI6IFt7XCJ5ZWFyXCI6MTgyMiwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODI0LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7a3lcIl0sXG4gICAgICAgICAgICAgICBcIm5hbWVcIjogXCJLZW50dWNreSBSZXBvcnRzLCBMaXR0ZWxsXCIsXG4gICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiS3kuKExpdHQuKVwiOiBcIkxpdHQuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkxpdC5cIjogXCJMaXR0LlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJMaXR0LihLeS4pXCI6IFwiTGl0dC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTGl0dGVsbFwiOiBcIkxpdHQuXCJ9fV0sXG4gICAgXCJMaXR0LiBTZWwuIENhcy5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJMaXR0LiBTZWwuIENhcy5cIjogW3tcInllYXJcIjoxNzk1LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTgyMSwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztreVwiXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJLZW50dWNreSBSZXBvcnRzLCBMaXR0ZWxsJ3MgU2VsZWN0ZWQgQ2FzZXNcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiS3kuKExpdC5TZWwuQ2FzLilcIjogXCJMaXR0LiBTZWwuIENhcy5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkxpdC5TZWwuQ2EuXCI6IFwiTGl0dC4gU2VsLiBDYXMuXCJ9fV0sXG4gICAgXCJMb2NrLiBSZXYuIENhcy5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJMb2NrLiBSZXYuIENhcy5cIjogW3tcInllYXJcIjoxNzk5LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTg0NywgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztueVwiXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJMb2Nrd29vZCdzIFJldmVyc2VkIENhc2VzXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fV0sXG4gICAgXCJNLkouXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzcGVjaWFsdHlcIixcbiAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJNLkouXCI6IFt7XCJ5ZWFyXCI6MTk3NSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzXCJdLFxuICAgICAgICAgICAgICBcIm5hbWVcIjogXCJNaWxpdGFyeSBKdXN0aWNlIFJlcG9ydGVyXCIsXG4gICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJNLiBKLlwiOiBcIk0uSi5cIn19XSxcbiAgICBcIk1FXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJuZXV0cmFsXCIsXG4gICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIk1FXCI6IFt7XCJ5ZWFyXCI6MTc1MCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO21lXCJdLFxuICAgICAgICAgICAgXCJuYW1lXCI6IFwiTWFpbmUgTmV1dHJhbCBDaXRhdGlvblwiLFxuICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fV0sXG4gICAgXCJNU1wiOiBbe1wiY2l0ZV90eXBlXCI6IFwibmV1dHJhbFwiLFxuICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJNU1wiOiBbe1wieWVhclwiOjE3NTAsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1czttc1wiXSxcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIk1pc3Npc3NpcHBpIE5ldXRyYWwgQ2l0YXRpb25cIixcbiAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiTVRcIjogW3tcImNpdGVfdHlwZVwiOiBcIm5ldXRyYWxcIixcbiAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiTVRcIjogW3tcInllYXJcIjoxNzUwLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bXRcIl0sXG4gICAgICAgICAgICBcIm5hbWVcIjogXCJNb250YW5hIE5ldXRyYWwgQ2l0YXRpb25cIixcbiAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiTWFjQXJ0aC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIk1hY0FydGguXCI6IFt7XCJ5ZWFyXCI6MTg3MywgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODc5LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7ZGNcIl0sXG4gICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJEaXN0cmljdCBvZiBDb2x1bWJpYSBSZXBvcnRzLCBNYWNBcnRodXJcIixcbiAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJELkMuKE1hY0FydGguKVwiOiBcIk1hY0FydGguXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk1hY0FyLlwiOiBcIk1hY0FydGguXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk1hY0FydGh1clwiOiBcIk1hY0FydGguXCJ9fV0sXG4gICAgXCJNYWNBcnRoLiAmIE0uXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIk1hY0FydGguICYgTS5cIjogW3tcInllYXJcIjoxODc5LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODgwLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztkY1wiXSxcbiAgICAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiRGlzdHJpY3Qgb2YgQ29sdW1iaWEgUmVwb3J0cywgTWFjQXJ0aHVyIGFuZCBNYWNrZXlcIixcbiAgICAgICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkQuQy4oTWFjQXJ0aC4mIE0uKVwiOiBcIk1hY0FydGguICYgTS5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJNYWNBci4mIE0uXCI6IFwiTWFjQXJ0aC4gJiBNLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk1hY0FyLiYgTWFja2V5XCI6IFwiTWFjQXJ0aC4gJiBNLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk1hY0FydGguJiBNLihEaXN0LkNvbC4pXCI6IFwiTWFjQXJ0aC4gJiBNLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk1hY0FydGh1ciAmIE0uXCI6IFwiTWFjQXJ0aC4gJiBNLlwifX1dLFxuICAgIFwiTWFja2V5XCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiTWFja2V5XCI6IFt7XCJ5ZWFyXCI6MTg2MywgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4OTIsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7ZGNcIl0sXG4gICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiRGlzdHJpY3Qgb2YgQ29sdW1iaWEgUmVwb3J0cywgTWFja2V5XCIsXG4gICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkQuQy4oTWFja2V5KVwiOiBcIk1hY2tleVwifX1dLFxuICAgIFwiTWFydC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIk1hcnQuXCI6IFt7XCJ5ZWFyXCI6MTgwOSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODMwLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bGFcIl0sXG4gICAgICAgICAgICAgICBcIm5hbWVcIjogXCJMb3Vpc2lhbmEgUmVwb3J0cywgTWFydGluXCIsXG4gICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge319LFxuICAgICAgICAgICAgICB7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJNYXJ0LlwiOiBbe1wieWVhclwiOjE3NzgsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTc5NywgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO25jXCJdLFxuICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiTm9ydGggQ2Fyb2xpbmEgUmVwb3J0cywgTWFydGluXCIsXG4gICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiTWFydC5EZWMuXCI6IFwiTWFydC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTWFydC5OLkMuXCI6IFwiTWFydC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTWFydGluXCI6IFwiTWFydC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTi5DLihNYXJ0LilcIjogXCJNYXJ0LlwifX1dLFxuICAgIFwiTWFydC4gJiBZZXIuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiTWFydC4gJiBZZXIuXCI6IFt7XCJ5ZWFyXCI6MTgyNSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4MjgsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7dG5cIl0sXG4gICAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiVGVubmVzc2VlIFJlcG9ydHMsIE1hcnRpbiAmIFllcmdlclwiLFxuICAgICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJNLiYgWS5cIjogXCJNYXJ0LiAmIFllci5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk0uJiBZLlIuXCI6IFwiTWFydC4gJiBZZXIuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJNYXJ0LiYgWS5cIjogXCJNYXJ0LiAmIFllci5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk1hcnQuJiBZLihUZW5uLilcIjogXCJNYXJ0LiAmIFllci5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk1hcnQuJiBZZXJnLlwiOiBcIk1hcnQuICYgWWVyLlwifX1dLFxuICAgIFwiTWFydmVsXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiTWFydmVsXCI6IFt7XCJ5ZWFyXCI6MTg5MywgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4OTcsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7ZGVcIl0sXG4gICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiRGVsYXdhcmUgUmVwb3J0cywgTWFydmVsXCIsXG4gICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fV0sXG4gICAgXCJNYXNzLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiTWFzcy5cIjogW3tcInllYXJcIjoxODY3LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bWFcIl0sXG4gICAgICAgICAgICAgICBcIm5hbWVcIjogXCJNYXNzYWNodXNldHRzIFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJNYS5cIjogXCJNYXNzLlwiLCBcIk1hcy5cIjogXCJNYXNzLlwifX1dLFxuICAgIFwiTWFzcy4gQXBwLiBDdC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIk1hc3MuIEFwcC4gQ3QuXCI6IFt7XCJ5ZWFyXCI6MTk3MiwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO21hXCJdLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiTWFzc2FjaHVzZXR0cyBBcHBlYWxzIENvdXJ0IFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJNYS5BLlwiOiBcIk1hc3MuIEFwcC4gQ3QuXCJ9fV0sXG4gICAgXCJNYXNzLiBBcHAuIERlYy5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJNYXNzLiBBcHAuIERlYy5cIjogW3tcInllYXJcIjoxOTQxLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTk3NywgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1czttYVwiXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJNYXNzYWNodXNldHRzIEFwcGVsbGF0ZSBEZWNpc2lvbnNcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge319XSxcbiAgICBcIk1hc3MuIEFwcC4gRGl2LlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIk1hc3MuIEFwcC4gRGl2LlwiOiBbe1wieWVhclwiOjE5MzYsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1czttYVwiXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJSZXBvcnRzIG9mIE1hc3NhY2h1c2V0dHMgQXBwZWxsYXRlIERpdmlzaW9uXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fV0sXG4gICAgXCJNYXNzLiBTdXBwLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiTWFzcy4gU3VwcC5cIjogW3tcInllYXJcIjoxOTgwLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE5ODMsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1czttYVwiXSxcbiAgICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIk1hc3NhY2h1c2V0dHMgUmVwb3J0cyBTdXBwbGVtZW50XCIsXG4gICAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge319XSxcbiAgICBcIk1jQ2Fob25cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiTWNDYWhvblwiOiBbe1wieWVhclwiOjE4NTgsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4NjgsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2tzXCJdLFxuICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJLYW5zYXMgUmVwb3J0cywgTWNDYWhvblwiLFxuICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiTWNDYWguXCI6IFwiTWNDYWhvblwifX1dLFxuICAgIFwiTWNDb3JkXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiTWNDb3JkXCI6IFt7XCJ5ZWFyXCI6MTgyMSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4MjgsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7c2NcIl0sXG4gICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiU291dGggQ2Fyb2xpbmEgUmVwb3J0cywgTWNDb3JkXCIsXG4gICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIlMuQy5MLihNY0NvcmQpXCI6IFwiTWNDb3JkXCJ9fV0sXG4gICAgXCJNY0NvcmQgRXEuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIk1jQ29yZCBFcS5cIjogW3tcInllYXJcIjoxODI1LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODI3LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztzY1wiXSxcbiAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiU291dGggQ2Fyb2xpbmEgUmVwb3J0cywgTWNDb3JkJ3MgQ2hhbmNlcnlcIixcbiAgICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIk1jQ29yZCBDaC5cIjogXCJNY0NvcmQgRXEuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiUy5DLkwuKE1jQ29yZCBFcS4pXCI6IFwiTWNDb3JkIEVxLlwifX1dLFxuICAgIFwiTWNHbC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIk1jR2wuXCI6IFt7XCJ5ZWFyXCI6MTg4MSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODg0LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bGFcIl0sXG4gICAgICAgICAgICAgICBcIm5hbWVcIjogXCJMb3Vpc2lhbmEgQ291cnQgb2YgQXBwZWFscyBSZXBvcnRzLCBNY0dsb2luXCIsXG4gICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiTWNHbG9pblwiOiBcIk1jR2wuXCJ9fV0sXG4gICAgXCJNY011bC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJNY011bC5cIjogW3tcInllYXJcIjoxODQwLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTg0MiwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztzY1wiXSxcbiAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJTb3V0aCBDYXJvbGluYSBSZXBvcnRzLCBNY011bGxlblwiLFxuICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJNY011bC5MLihTLkMuKVwiOiBcIk1jTXVsLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiUy5DLkwuKE1jTXVsLilcIjogXCJNY011bC5cIn19XSxcbiAgICBcIk1jTXVsLiBFcS5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiTWNNdWwuIEVxLlwiOiBbe1wieWVhclwiOjE4NDAsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4NDIsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3NjXCJdLFxuICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJTb3V0aCBDYXJvbGluYSBSZXBvcnRzLCBNY011bGxlbidzIEVxdWl0eVwiLFxuICAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiTWNNdWwuRXEuKFMuQy4pXCI6IFwiTWNNdWwuIEVxLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlMuQy5MLihNY011bGxhbiBFcS4pXCI6IFwiTWNNdWwuIEVxLlwifX1dLFxuICAgIFwiTWQuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiTWQuXCI6IFt7XCJ5ZWFyXCI6MTg1MSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO21kXCJdLFxuICAgICAgICAgICAgIFwibmFtZVwiOiBcIk1hcnlsYW5kIFJlcG9ydHNcIixcbiAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiTWFyeWxhbmRcIjogXCJNZC5cIn19XSxcbiAgICBcIk1kLiBBcHAuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJNZC4gQXBwLlwiOiBbe1wieWVhclwiOjE5NjcsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1czttZFwiXSxcbiAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIk1hcnlsYW5kIEFwcGVsbGF0ZSBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge319XSxcbiAgICBcIk1lLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIk1lLlwiOiBbe1wieWVhclwiOjE4MjAsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxOTY1LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO21lXCJdLFxuICAgICAgICAgICAgIFwibmFtZVwiOiBcIk1haW5lIFJlcG9ydHNcIixcbiAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiTWFpLlwiOiBcIk1lLlwiLCBcIk1haW5lXCI6IFwiTWUuXCJ9fV0sXG4gICAgXCJNZWlnc1wiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiTWVpZ3NcIjogW3tcInllYXJcIjoxODM4LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4MzksIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1czt0blwiXSxcbiAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIlRlbm5lc3NlZSBSZXBvcnRzLCBNZWlnc1wiLFxuICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIlRlbm4uKE1laWdzKVwiOiBcIk1laWdzXCJ9fV0sXG4gICAgXCJNZXQuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIk1ldC5cIjogW3tcInllYXJcIjoxODU4LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODYzLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztreVwiXSxcbiAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiS2VudHVja3kgUmVwb3J0cywgTWV0Y2FsZlwiLFxuICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiS3kuKE1ldC4pXCI6IFwiTWV0LlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk1ldGMuXCI6IFwiTWV0LlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk1ldGMuS3kuXCI6IFwiTWV0LlwifX0sXG4gICAgICAgICAgICAge1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJNZXQuXCI6IFt7XCJ5ZWFyXCI6MTg0MCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTg0NywgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bWFcIl0sXG4gICAgICAgICAgICAgIFwibmFtZVwiOiBcIk1hc3NhY2h1c2V0dHMgUmVwb3J0cywgTWV0Y2FsZlwiLFxuICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiTWFzcy4oTWV0LilcIjogXCJNZXQuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTWV0Yy5cIjogXCJNZXQuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTWV0Yy5NYXNzLlwiOiBcIk1ldC5cIn19XSxcbiAgICBcIk1pY2guXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJNaWNoLlwiOiBbe1wieWVhclwiOjE4NDcsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1czttaVwiXSxcbiAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIk1pY2hpZ2FuIFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJNaWNoLlwiOiBcIk1pY2guXCJ9fV0sXG4gICAgXCJNaWNoLiBBcHAuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIk1pY2guIEFwcC5cIjogW3tcInllYXJcIjoxOTY1LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bWlcIl0sXG4gICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIk1pY2hpZ2FuIEFwcGVhbHMgUmVwb3J0c1wiLFxuICAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge319XSxcbiAgICBcIk1pY2guIEN0LiBDbC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiTWljaC4gQ3QuIENsLlwiOiBbe1wieWVhclwiOjE5MzgsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE5NDIsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO21pXCJdLFxuICAgICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJNaWNoaWdhbiBDb3VydCBvZiBDbGFpbXMgUmVwb3J0c1wiLFxuICAgICAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge319XSxcbiAgICBcIk1pbGxcIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiTWlsbFwiOiBbe1wieWVhclwiOjE4MTcsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4MTgsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3NjXCJdLFxuICAgICAgICAgICAgICBcIm5hbWVcIjogXCJTb3V0aCBDYXJvbGluYSBSZXBvcnRzLCBNaWxsIChDb25zdGl0dXRpb25hbClcIixcbiAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkNvbnN0LlwiOiBcIk1pbGxcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJDb25zdC5TLkMuXCI6IFwiTWlsbFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk1pbGwgQ29uc3QuXCI6IFwiTWlsbFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk1pbGwgQ29uc3QuKFMuQy4pXCI6IFwiTWlsbFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlMuQy5MLihNaWxsKVwiOiBcIk1pbGxcIn19XSxcbiAgICBcIk1pbm4uXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJNaW5uLlwiOiBbe1wieWVhclwiOjE4NTEsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTk3NywgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO21uXCJdLFxuICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiTWlubmVzb3RhIFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJNaW4uXCI6IFwiTWlubi5cIn19XSxcbiAgICBcIk1pbm9yXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJNaW5vclwiOiBbe1wieWVhclwiOjE4MjAsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTgyNiwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX1dfSxcbiAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1czthbFwiXSxcbiAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIk1pbm9yJ3MgQWxhYmFtYSBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiTWluLlwiOiBcIk1pbm9yXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk1pbm9yIChBbGEuKVwiOiBcIk1pbm9yXCJ9fV0sXG4gICAgXCJNaXNjLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiTWlzYy5cIjogW3tcInllYXJcIjoxODkyLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE5NTUsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTWlzYy4gMmRcIjogW3tcInllYXJcIjoxOTU1LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjIwMDQsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTWlzYy4gM2RcIjogW3tcInllYXJcIjoyMDA0LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bnlcIl0sXG4gICAgICAgICAgICAgICBcIm5hbWVcIjogXCJOZXcgWW9yayBNaXNjZWxsYW5lb3VzIFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJNaXNjIDJkXCI6IFwiTWlzYy4gMmRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTWlzYyAzZFwiOiBcIk1pc2MuIDNkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk1pc2MuMmRcIjogXCJNaXNjLiAyZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJNaXNjLjNkXCI6IFwiTWlzYy4gM2RcIn19XSxcbiAgICBcIk1pc3MuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJNaXNzLlwiOiBbe1wieWVhclwiOjE4NTEsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTk2NiwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO21zXCJdLFxuICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiTWlzc2lzc2lwcGkgUmVwb3J0c1wiLFxuICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIk1pcy5cIjogXCJNaXNzLlwifX1dLFxuICAgIFwiTW8uXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiTW8uXCI6IFt7XCJ5ZWFyXCI6MTgyMSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE5NTYsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bW9cIl0sXG4gICAgICAgICAgICAgXCJuYW1lXCI6IFwiTWlzc291cmkgUmVwb3J0c1wiLFxuICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiTW8uIEFwcC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIk1vLiBBcHAuXCI6IFt7XCJ5ZWFyXCI6MTg3NiwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxOTU0LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bW9cIl0sXG4gICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJNaXNzb3VyaSBBcHBlYWxzIFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJNby5BcHAuUmVwLlwiOiBcIk1vLiBBcHAuXCJ9fV0sXG4gICAgXCJNb25hZy5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJNb25hZy5cIjogW3tcInllYXJcIjoxODg4LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTg5MCwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztwYVwiXSxcbiAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJQZW5uc3lsdmFuaWEgU3RhdGUgUmVwb3J0cywgTW9uYWdoYW5cIixcbiAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiTW9uLlwiOiBcIk1vbmFnLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTW9uYS5cIjogXCJNb25hZy5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk1vbmFnaGFuXCI6IFwiTW9uYWcuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJNb25hZ2hhbihQYS4pXCI6IFwiTW9uYWcuXCJ9fV0sXG4gICAgXCJNb250LlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiTW9udC5cIjogW3tcInllYXJcIjoxODY4LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bXRcIl0sXG4gICAgICAgICAgICAgICBcIm5hbWVcIjogXCJNb250YW5hIFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJNb250LlwiOiBcIk1vbnQuXCJ9fV0sXG4gICAgXCJNb3JyaXNcIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJNb3JyaXNcIjogW3tcInllYXJcIjoxODM5LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTg0NiwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztpYVwiXSxcbiAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJJb3dhIFJlcG9ydHMsIE1vcnJpc1wiLFxuICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJNb3IuSWEuXCI6IFwiTW9ycmlzXCIsIFwiTW9yci5cIjogXCJNb3JyaXNcIn19XSxcbiAgICBcIk11bmYuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJNdW5mLlwiOiBbe1wieWVhclwiOjE4MTAsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTgyMCwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3ZhXCJdLFxuICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiVmlyZ2luaWEgUmVwb3J0cywgTXVuZm9yZFwiLFxuICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fV0sXG4gICAgXCJNdXIuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIk11ci5cIjogW3tcInllYXJcIjoxODA0LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODE5LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztuY1wiXSxcbiAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiTm9ydGggQ2Fyb2xpbmEgUmVwb3J0cywgTXVycGhleVwiLFxuICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiTXVycGguXCI6IFwiTXVyLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk11cnBoLihOLkMuKVwiOiBcIk11ci5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJOLkMuKE11ci4pXCI6IFwiTXVyLlwifX1dLFxuICAgIFwiTi4gQ2hpcC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIk4uIENoaXAuXCI6IFt7XCJ5ZWFyXCI6MTc4OSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxNzkxLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7dnRcIl0sXG4gICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJWZXJtb250IFJlcG9ydHMsIENoaXBtYW4sIE4uXCIsXG4gICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiQ2hpcC5OLlwiOiBcIk4uIENoaXAuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk4uQ2hpcC4oVnQuKVwiOiBcIk4uIENoaXAuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk4uQ2hpcG0uXCI6IFwiTi4gQ2hpcC5cIn19XSxcbiAgICBcIk4uIE1hci4gSS5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiTi4gTWFyLiBJLlwiOiBbe1wieWVhclwiOjE5ODksIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1czttcFwiXSxcbiAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiTm9ydGhlcm4gTWFyaWFuYSBJc2xhbmRzIFJlcG9ydGVyXCIsXG4gICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiTi4gTWFyLiBJLiBDb21tdy4gUnB0ci5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIk4uIE1hci4gSS4gQ29tbXcuIFJwdHIuXCI6IFt7XCJ5ZWFyXCI6MTk3OSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO21wXCJdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiTm9ydGhlcm4gTWFyaWFuYSBJc2xhbmRzIENvbW1vbndlYWx0aCBSZXBvcnRlclwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fV0sXG4gICAgXCJOLkMuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIk4uQy5cIjogW3tcInllYXJcIjoxODY4LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bmNcIl0sXG4gICAgICAgICAgICAgIFwibmFtZVwiOiBcIk5vcnRoIENhcm9saW5hIFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fV0sXG4gICAgXCJOLkMuIEFwcC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJOLkMuIEFwcC5cIjogW3tcInllYXJcIjoxOTY4LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bmNcIl0sXG4gICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiTm9ydGggQ2Fyb2xpbmEgQ291cnQgb2YgQXBwZWFscyBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fV0sXG4gICAgXCJOLkQuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIk4uRC5cIjogW3tcInllYXJcIjoxODkwLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxOTUzLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztuZFwiXSxcbiAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiTm9ydGggRGFrb3RhIFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fV0sXG4gICAgXCJOLkUuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZV9yZWdpb25hbFwiLFxuICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIk4uRS5cIjogW3tcInllYXJcIjoxODg0LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxOTM2LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTi5FLjJkXCI6IFt7XCJ5ZWFyXCI6MTkzNiwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7aWxcIixcInVzO2luXCIsXCJ1czttYVwiLFwidXM7bnlcIixcInVzO29oXCJdLFxuICAgICAgICAgICAgICBcIm5hbWVcIjogXCJOb3J0aCBFYXN0ZXJuIFJlcG9ydGVyXCIsXG4gICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJOLiBFLlwiOiBcIk4uRS5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJOLiBFLiAyZFwiOiBcIk4uRS4yZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk4uIEUuMmRcIjogXCJOLkUuMmRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJOLkUuIDJkXCI6IFwiTi5FLjJkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTi5FLlJlcC5cIjogXCJOLkUuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTkVcIjogXCJOLkUuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTkUgMmRcIjogXCJOLkUuMmRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJOby5FYXN0IFJlcC5cIjogXCJOLkUuXCJ9fV0sXG4gICAgXCJOLkguXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIk4uSC5cIjogW3tcInllYXJcIjoxODE2LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bmhcIl0sXG4gICAgICAgICAgICAgIFwibmFtZVwiOiBcIk5ldyBIYW1wc2hpcmUgUmVwb3J0c1wiLFxuICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiTi5ILlIuXCI6IFwiTi5ILlwifX1dLFxuICAgIFwiTi5KLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJOLkouXCI6IFt7XCJ5ZWFyXCI6MTk0OCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO25qXCJdLFxuICAgICAgICAgICAgICBcIm5hbWVcIjogXCJOZXcgSmVyc2V5IFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fV0sXG4gICAgXCJOLkouIEFkbWluLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiTi5KLiBBZG1pbi5cIjogW3tcInllYXJcIjoxOTgyLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk4uSi4gQWRtaW4uIDJkXCI6IFt7XCJ5ZWFyXCI6MTk4MiwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO25qXCJdLFxuICAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiTmV3IEplcnNleSBBZG1pbmlzdHJhdGl2ZSBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge319XSxcbiAgICBcIk4uSi4gRXEuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJOLkouIEVxLlwiOiBbe1wieWVhclwiOjE4MzAsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTk0OCwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO25qXCJdLFxuICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiTmV3IEplcnNleSBFcXVpdHkgUmVwb3J0c1wiLFxuICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fV0sXG4gICAgXCJOLkouIE1pc2MuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIk4uSi4gTWlzYy5cIjogW3tcInllYXJcIjoxOTIzLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxOTQ5LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztualwiXSxcbiAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiTmV3IEplcnNleSBNaXNjZWxsYW5lb3VzIFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIk4uSi5NLlwiOiBcIk4uSi4gTWlzYy5cIiwgXCJOSk1cIjogXCJOLkouIE1pc2MuXCJ9fV0sXG4gICAgXCJOLkouIFN1cGVyLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiTi5KLiBTdXBlci5cIjogW3tcInllYXJcIjoxOTQ4LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bmpcIl0sXG4gICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJOZXcgSmVyc2V5IFN1cGVyaW9yIENvdXJ0IFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJOLkouUy5cIjogXCJOLkouIFN1cGVyLlwifX1dLFxuICAgIFwiTi5KLiBUYXhcIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIk4uSi4gVGF4LlwiOiBbe1wieWVhclwiOjE5NzksIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bmpcIl0sXG4gICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJOZXcgSmVyc2V5IFRheCBDb3VydFwiLFxuICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fV0sXG4gICAgXCJOLkouTC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJOLkouTC5cIjogW3tcInllYXJcIjoxNzkwLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTk0OCwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztualwiXSxcbiAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJOZXcgSmVyc2V5IExhdyBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIk4uSi5MYXdcIjogXCJOLkouTC5cIn19XSxcbiAgICBcIk4uTS5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiTi5NLlwiOiBbe1wieWVhclwiOjE4OTAsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztubVwiXSxcbiAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiTmV3IE1leGljbyBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiTi5XLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVfcmVnaW9uYWxcIixcbiAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJOLlcuXCI6IFt7XCJ5ZWFyXCI6MTg4MCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTk0MiwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBcIk4uVy4yZFwiOiBbe1wieWVhclwiOjE5NDIsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2lhXCIsXCJ1czttaVwiLFwidXM7bW5cIixcInVzO25lXCIsXCJ1cztuZFwiLFwidXM7c2RcIixcInVzO3dpXCJdLFxuICAgICAgICAgICAgICBcIm5hbWVcIjogXCJOb3J0aCBXZXN0ZXJuIFJlcG9ydGVyXCIsXG4gICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJOLiBXLlwiOiBcIk4uVy5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJOLiBXLiAyZFwiOiBcIk4uVy4yZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk4uIFcuMmRcIjogXCJOLlcuMmRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJOLlcuIDJkXCI6IFwiTi5XLjJkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTldcIjogXCJOLlcuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTlcgMmRcIjogXCJOLlcuMmRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJOby5XZXN0IFJlcC5cIjogXCJOLlcuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTm9ydGh3LlJlcC5cIjogXCJOLlcuXCJ9fV0sXG4gICAgXCJOLlkuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIk4uWS5cIjogW3tcInllYXJcIjoxODQ3LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxOTU2LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTi5ZLjJkXCI6IFt7XCJ5ZWFyXCI6MTk1NiwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoyMDA0LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfV0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBcIk4uWS4zZFwiOiBbe1wieWVhclwiOjIwMDQsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO255XCJdLFxuICAgICAgICAgICAgICBcIm5hbWVcIjogXCJOZXcgWW9yayBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJOLiBZLlwiOiBcIk4uWS5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJOLlkuIDJkXCI6IFwiTi5ZLjJkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTi5ZLiAzZFwiOiBcIk4uWS4zZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk5ZIDJkXCI6IFwiTi5ZLjJkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTlkgM2RcIjogXCJOLlkuM2RcIn19XSxcbiAgICBcIk4uWS4gQ2guIEFubi5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiTi5ZLiBDaC4gQW5uLlwiOiBbe1wieWVhclwiOjE4MTQsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4NDcsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO255XCJdLFxuICAgICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJOZXcgWW9yayBDaGFuY2VyeSBSZXBvcnRzIEFubm90YXRlZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiTi5ZLkNoLlIuQW5uLlwiOiBcIk4uWS4gQ2guIEFubi5cIn19XSxcbiAgICBcIk4uWS4gU3VwLiBDdC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiTi5ZLiBTdXAuIEN0LlwiOiBbe1wieWVhclwiOjE4NzMsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4OTYsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO255XCJdLFxuICAgICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJTdXByZW1lIENvdXJ0IFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIk4uWS5TdXByLkN0LlwiOiBcIk4uWS4gU3VwLiBDdC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJOLlkuU3Vwcm0uQ3QuXCI6IFwiTi5ZLiBTdXAuIEN0LlwifX1dLFxuICAgIFwiTi5ZLlMuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiTi5ZLlMuXCI6IFt7XCJ5ZWFyXCI6MTg4OCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE5MzcsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk4uWS5TLjJkXCI6IFt7XCJ5ZWFyXCI6MTkzOCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk4uWS5TLjNkXCI6IFt7XCJ5ZWFyXCI6MTkzOCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bnlcIl0sXG4gICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiTmV3IFlvcmsgU3VwcGxlbWVudFwiLFxuICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJOLlkuUy4gMmRcIjogXCJOLlkuUy4yZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTi5ZLlMuIDNkXCI6IFwiTi5ZLlMuM2RcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk5ZU1wiOiBcIk4uWS5TLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTllTIDJkXCI6IFwiTi5ZLlMuMmRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk5ZUyAzZFwiOiBcIk4uWS5TLjNkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJOZXcgWW9yayBTdXBwLlwiOiBcIk4uWS5TLlwifX1dLFxuICAgIFwiTkRcIjogW3tcImNpdGVfdHlwZVwiOiBcIm5ldXRyYWxcIixcbiAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiTkRcIjogW3tcInllYXJcIjoxNzUwLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bmRcIl0sXG4gICAgICAgICAgICBcIm5hbWVcIjogXCJOb3J0aCBEYWtvdGEgTmV1dHJhbCBDaXRhdGlvblwiLFxuICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fV0sXG4gICAgXCJORCBBcHBcIjogW3tcImNpdGVfdHlwZVwiOiBcIm5ldXRyYWxcIixcbiAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIk5EIEFwcFwiOiBbe1wieWVhclwiOjE3NTAsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztuZFwiXSxcbiAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJOb3J0aCBEYWtvdGEgTmV1dHJhbCBDaXRhdGlvbiwgQ291cnQgb2YgQXBwZWFsc1wiLFxuICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiTk1cIjogW3tcImNpdGVfdHlwZVwiOiBcIm5ldXRyYWxcIixcbiAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiTk1cIjogW3tcInllYXJcIjoxNzUwLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bm1cIl0sXG4gICAgICAgICAgICBcIm5hbWVcIjogXCJOZXcgTWV4aWNvIE5ldXRyYWwgQ2l0YXRpb25cIixcbiAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiTk1DQVwiOiBbe1wiY2l0ZV90eXBlXCI6IFwibmV1dHJhbFwiLFxuICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIk5NQ0FcIjogW3tcInllYXJcIjoxNzUwLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bm1cIl0sXG4gICAgICAgICAgICAgIFwibmFtZVwiOiBcIk5ldyBNZXhpY28gTmV1dHJhbCBDaXRhdGlvbiAoQ291cnQgb2YgQXBwZWFscylcIixcbiAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fV0sXG4gICAgXCJOTUNFUlRcIjogW3tcImNpdGVfdHlwZVwiOiBcIm5ldXRyYWxcIixcbiAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIk5NQ0VSVFwiOiBbe1wieWVhclwiOjE3NTAsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztubVwiXSxcbiAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJOZXcgTWV4aWNvIE5ldXRyYWwgQ2l0YXRpb25cIixcbiAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge319XSxcbiAgICBcIk5NU0NcIjogW3tcImNpdGVfdHlwZVwiOiBcIm5ldXRyYWxcIixcbiAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJOTVNDXCI6IFt7XCJ5ZWFyXCI6MTc1MCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO25tXCJdLFxuICAgICAgICAgICAgICBcIm5hbWVcIjogXCJOZXcgTWV4aWNvIE5ldXRyYWwgQ2l0YXRpb24gKFN1cHJlbWUgQ291cnQpXCIsXG4gICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiTlkgU2xpcCBPcFwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJOWSBTbGlwIE9wXCI6IFt7XCJ5ZWFyXCI6MTc1MCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO255XCJdLFxuICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJOZXcgWW9yayBTbGlwIE9waW5pb25cIixcbiAgICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fV0sXG4gICAgXCJOYXZham8gUnB0ci5cIjogW3tcImNpdGVfdHlwZVwiOiBcImZlZFwiLFxuICAgICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiTmF2YWpvIFJwdHIuXCI6IFt7XCJ5ZWFyXCI6MTk2OSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzXCJdLFxuICAgICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIk5hdmFqbyBSZXBvcnRlclwiLFxuICAgICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiTmViLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJOZWIuXCI6IFt7XCJ5ZWFyXCI6MTg2MCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO25lXCJdLFxuICAgICAgICAgICAgICBcIm5hbWVcIjogXCJOZWJyYXNrYSBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiTmViLiBDdC4gQXBwLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJOZWIuIEN0LiBBcHAuXCI6IFt7XCJ5ZWFyXCI6MTkyMiwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO25lXCJdLFxuICAgICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJOZWJyYXNrYSBDb3VydCBvZiBBcHBlYWxzIFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIk5lYi4gQXBwLlwiOiBcIk5lYi4gQ3QuIEFwcC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJOZWIuQXBwLlIuXCI6IFwiTmViLiBDdC4gQXBwLlwifX1dLFxuICAgIFwiTmV2LlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJOZXYuXCI6IFt7XCJ5ZWFyXCI6MTg2NSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO252XCJdLFxuICAgICAgICAgICAgICBcIm5hbWVcIjogXCJOZXZhZGEgUmVwb3J0c1wiLFxuICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge319XSxcbiAgICBcIk5ldi4gQWR2LiBPcC4gTm8uXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJOZXYuIEFkdi4gT3AuIE5vLlwiOiBbe1wieWVhclwiOjE3NTAsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztudlwiXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIk5ldmFkYSBBZHZhbmNlZCBPcGluaW9uXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge319XSxcbiAgICBcIk5vdHQgJiBNY0MuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJOb3R0ICYgTWNDLlwiOiBbe1wieWVhclwiOjE4MTcsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTgyMCwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3NjXCJdLFxuICAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiU291dGggQ2Fyb2xpbmEgUmVwb3J0cywgTm90dCBhbmQgTWNDb3JkXCIsXG4gICAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiTi4mIE1jLlwiOiBcIk5vdHQgJiBNY0MuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk5vdHQgJiBNJ0MuKFMuQy4pXCI6IFwiTm90dCAmIE1jQy5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTm90dCAmIE1jQy5cIjogXCJOb3R0ICYgTWNDLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJTLkMuTC4oTm90dCAmIE1jQy4pXCI6IFwiTm90dCAmIE1jQy5cIn19XSxcbiAgICBcIk9IXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJuZXV0cmFsXCIsXG4gICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIk9IXCI6IFt7XCJ5ZWFyXCI6MTc1MCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO29oXCJdLFxuICAgICAgICAgICAgXCJuYW1lXCI6IFwiT2hpbyBOZXV0cmFsIENpdGF0aW9uXCIsXG4gICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiLU9oaW8tXCI6IFwiT0hcIn19XSxcbiAgICBcIk9LXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJuZXV0cmFsXCIsXG4gICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIk9LXCI6IFt7XCJ5ZWFyXCI6MTc1MCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO29rXCJdLFxuICAgICAgICAgICAgXCJuYW1lXCI6IFwiT2tsYWhvbWEgTmV1dHJhbCBDaXRhdGlvblwiLFxuICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fV0sXG4gICAgXCJPSyBDSVYgQVBQXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJuZXV0cmFsXCIsXG4gICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiT0sgQ0lWIEFQUFwiOiBbe1wieWVhclwiOjE3NTAsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztva1wiXSxcbiAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiT2tsYWhvbWEgTmV1dHJhbCBDaXRhdGlvbiAoQ2l2aWMgQXBwZWFscylcIixcbiAgICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fV0sXG4gICAgXCJPSyBDUlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwibmV1dHJhbFwiLFxuICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJPSyBDUlwiOiBbe1wieWVhclwiOjE3NTAsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztva1wiXSxcbiAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIk9rbGFob21hIE5ldXRyYWwgQ2l0YXRpb25cIixcbiAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiT2hpb1wiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJPaGlvXCI6IFt7XCJ5ZWFyXCI6MTgyMSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTg1MSwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7b2hcIl0sXG4gICAgICAgICAgICAgIFwibmFtZVwiOiBcIk9oaW8gUmVwb3J0c1wiLFxuICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge319XSxcbiAgICBcIk9oaW8gQXBwLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIk9oaW8gQXBwLlwiOiBbe1wieWVhclwiOjE5MTMsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiT2hpbyBBcHAuIDJkXCI6IFt7XCJ5ZWFyXCI6MTkxMywgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJPaGlvIEFwcC4gM2RcIjogW3tcInllYXJcIjoxOTEzLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7b2hcIl0sXG4gICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiT2hpbyBBcHBlbGxhdGUgUmVwb3J0c1wiLFxuICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJBcHAuXCI6IFwiT2hpbyBBcHAuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJPLkEuUi5cIjogXCJPaGlvIEFwcC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk8uQS5SLjJkXCI6IFwiT2hpbyBBcHAuIDJkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJPLkEuUi4zZFwiOiBcIk9oaW8gQXBwLiAzZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTy5BcHAuXCI6IFwiT2hpbyBBcHAuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJPLkFwcC4yZFwiOiBcIk9oaW8gQXBwLiAyZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTy5BcHAuM2RcIjogXCJPaGlvIEFwcC4gM2RcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk9oLkEuXCI6IFwiT2hpbyBBcHAuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJPaC5BLjJkXCI6IFwiT2hpbyBBcHAuIDJkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJPaC5BcHAuM2RcIjogXCJPaGlvIEFwcC4gM2RcIn19XSxcbiAgICBcIk9oaW8gQXBwLiBVbnJlcC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiT2hpbyBBcHAuIFVucmVwLlwiOiBbe1wieWVhclwiOjE5OTAsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE5OTAsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO29oXCJdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJVbnJlcG9ydGVkIE9oaW8gQXBwZWxsYXRlIENhc2VzIChBbmRlcnNvbilcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fV0sXG4gICAgXCJPaGlvIEIuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIk9oaW8gQi5cIjogW3tcInllYXJcIjoxOTgyLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxOTg3LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztvaFwiXSxcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiT2hpbyBCYXIgUmVwb3J0c1wiLFxuICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge319XSxcbiAgICBcIk9oaW8gQy5DLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIk9oaW8gQy5DLlwiOiBbe1wieWVhclwiOjE4ODUsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxOTAxLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJPaGlvIEMuQy4gKG4ucy4pXCI6IFt7XCJ5ZWFyXCI6MTkwMSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxOTIyLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO29oXCJdLFxuICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIk9oaW8gQ2lyY3VpdCBDb3VydCBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIk8uQy5DLk4uUy5cIjogXCJPaGlvIEMuQy4gKG4ucy4pXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJPaC5DaXIuQ3QuXCI6IFwiT2hpbyBDLkMuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJPaC5DaXIuQ3QuTi5TLlwiOiBcIk9oaW8gQy5DLiAobi5zLilcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk9oaW8gQy5DLk4uUy5cIjogXCJPaGlvIEMuQy4gKG4ucy4pXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJPaGlvIEMuQy5SLlwiOiBcIk9oaW8gQy5DLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiT2hpbyBDLkMuUi5OLlMuXCI6IFwiT2hpbyBDLkMuIChuLnMuKVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiT2hpbyBDaXIuQ3QuXCI6IFwiT2hpbyBDLkMuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJPaGlvIENpci5DdC4oTi5TLilcIjogXCJPaGlvIEMuQy4gKG4ucy4pXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJPaGlvIENpci5DdC5SLk4uUy5cIjogXCJPaGlvIEMuQy4gKG4ucy4pXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJPaGlvIENyLkN0LlIuXCI6IFwiT2hpbyBDLkMuXCJ9fV0sXG4gICAgXCJPaGlvIEMuQy4gRGVjLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiT2hpbyBDLkMuIERlYy5cIjogW3tcInllYXJcIjoxOTAxLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE5MjMsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztvaFwiXSxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIk9oaW8gQ2lyY3VpdCBDb3VydCBEZWNpc2lvbnNcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJPLkMuQy5cIjogXCJPaGlvIEMuQy4gRGVjLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJPaGlvIENpci5DdC5cIjogXCJPaGlvIEMuQy4gRGVjLlwifX1dLFxuICAgIFwiT2hpbyBDaXIuIERlYy5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIk9oaW8gQ2lyLiBEZWMuXCI6IFt7XCJ5ZWFyXCI6MTg4NSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxOTAxLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7b2hcIl0sXG4gICAgICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJPaGlvIENpcmN1aXQgRGVjaXNpb25zXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiTy5DLkQuXCI6IFwiT2hpbyBDaXIuIERlYy5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiT2guQ2lyLkRlYy5cIjogXCJPaGlvIENpci4gRGVjLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJPaGlvIEMuRC5cIjogXCJPaGlvIENpci4gRGVjLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJPaGlvIEMuRGVjLlwiOiBcIk9oaW8gQ2lyLiBEZWMuXCJ9fV0sXG4gICAgXCJPaGlvIERlYy5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJPaGlvIERlYy5cIjogW3tcInllYXJcIjoxODk0LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTkyMCwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztvaFwiXSxcbiAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJPaGlvIERlY2lzaW9uc1wiLFxuICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJPLkQuXCI6IFwiT2hpbyBEZWMuXCIsIFwiT2guRGVjLlwiOiBcIk9oaW8gRGVjLlwifX1dLFxuICAgIFwiT2hpbyBEZWMuIFJlcHJpbnRcIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIk9oaW8gRGVjLiBSZXByaW50XCI6IFt7XCJ5ZWFyXCI6MTg0MCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODczLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7b2hcIl0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJPaGlvIERlY2lzaW9ucywgUmVwcmludFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIk8uRGVjLlJlcC5cIjogXCJPaGlvIERlYy4gUmVwcmludFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJPaC5EZWMuKFJlcHJpbnQpXCI6IFwiT2hpbyBEZWMuIFJlcHJpbnRcIn19XSxcbiAgICBcIk9oaW8gTGF3LiBBYnMuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJPaGlvIExhdy4gQWJzLlwiOiBbe1wieWVhclwiOjE5MjIsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTk2NCwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO29oXCJdLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiT2hpbyBMYXcgQWJzdHJhY3RzXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiTy5MLkEuXCI6IFwiT2hpbyBMYXcuIEFicy5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTy5MLkFicy5cIjogXCJPaGlvIExhdy4gQWJzLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJPaGlvIEFicy5cIjogXCJPaGlvIExhdy4gQWJzLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJPaGlvIEwuQWJzLlwiOiBcIk9oaW8gTGF3LiBBYnMuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk9oaW8gTGF3IEFic3QuXCI6IFwiT2hpbyBMYXcuIEFicy5cIn19XSxcbiAgICBcIk9oaW8gTWlzYy5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiT2hpbyBNaXNjLlwiOiBbe1wieWVhclwiOjE5NjIsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiT2hpbyBNaXNjLiAyZFwiOiBbe1wieWVhclwiOjE5NjIsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztvaFwiXSxcbiAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiT2hpbyBNaXNjZWxsYW5lb3VzXCIsXG4gICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJPLk1pc2MuXCI6IFwiT2hpbyBNaXNjLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk8uTWlzYy4yZFwiOiBcIk9oaW8gTWlzYy4gMmRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJPaGlvIE1pc2MuRGVjLlwiOiBcIk9oaW8gTWlzYy5cIn19XSxcbiAgICBcIk9oaW8gTi5QLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIk9oaW8gTi5QLlwiOiBbe1wieWVhclwiOjE4OTQsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxOTM0LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJPaGlvIE4uUC4gKG4ucy4pXCI6IFt7XCJ5ZWFyXCI6MTg5NCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxOTM0LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO29oXCJdLFxuICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIk9oaW8gTmlzaSBQcml1cyBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIk8uTi5QLlwiOiBcIk9oaW8gTi5QLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTy5OLlAuTi5TLlwiOiBcIk9oaW8gTi5QLiAobi5zLilcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk9oLk4uUC5cIjogXCJPaGlvIE4uUC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk9oLk4uUC4oTi5TKS5cIjogXCJPaGlvIE4uUC4gKG4ucy4pXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJPaGlvIE4uUC5OLlMuXCI6IFwiT2hpbyBOLlAuIChuLnMuKVwifX1dLFxuICAgIFwiT2hpbyBPcC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIk9oaW8gT3AuXCI6IFt7XCJ5ZWFyXCI6MTkzNCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxOTgyLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk9oaW8gT3AuIDJkXCI6IFt7XCJ5ZWFyXCI6MTkzNCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxOTgyLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk9oaW8gT3AuIDNkXCI6IFt7XCJ5ZWFyXCI6MTkzNCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxOTgyLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7b2hcIl0sXG4gICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJPaGlvIE9waW5pb25zXCIsXG4gICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiTy5PLlwiOiBcIk9oaW8gT3AuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk9oaW8gT3AuMmRcIjogXCJPaGlvIE9wLiAyZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJPaGlvIE9wLjNkXCI6IFwiT2hpbyBPcC4gM2RcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiT2hpbyBPcHMuXCI6IFwiT2hpbyBPcC5cIn19XSxcbiAgICBcIk9oaW8gU3QuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJPaGlvIFN0LlwiOiBbe1wieWVhclwiOjE4NDAsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTk2NCwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJPaGlvIFN0LiAyZFwiOiBbe1wieWVhclwiOjE5NjUsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTk5MSwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJPaGlvIFN0LiAzZFwiOiBbe1wieWVhclwiOjE5OTEsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztvaFwiXSxcbiAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIk9oaW8gU3RhdGUgUmVwb3J0c1wiLFxuICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIk8uUy5cIjogXCJPaGlvIFN0LlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJPLlMuMmRcIjogXCJPaGlvIFN0LiAyZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJPLlMuM2RcIjogXCJPaGlvIFN0LiAzZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJPaC5TdC5cIjogXCJPaGlvIFN0LlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJPaGlvIFN0LjJkXCI6IFwiT2hpbyBTdC4gMmRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiT2hpbyBTdC4zZFwiOiBcIk9oaW8gU3QuIDNkXCJ9fV0sXG4gICAgXCJPa2xhLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiT2tsYS5cIjogW3tcInllYXJcIjoxODkwLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE5NTMsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztva1wiXSxcbiAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIk9rbGFob21hIFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiT2tsYS4gQ3JpbS5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIk9rbGEuIENyaW0uXCI6IFt7XCJ5ZWFyXCI6MTkwOCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxOTUzLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7b2tcIl0sXG4gICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJPa2xhaG9tYSBDcmltaW5hbCBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiTy5Dci5cIjogXCJPa2xhLiBDcmltLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJPa2wuQ3IuXCI6IFwiT2tsYS4gQ3JpbS5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiT2tsYS5cIjogXCJPa2xhLiBDcmltLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJPa2xhLkNyLlwiOiBcIk9rbGEuIENyaW0uXCJ9fV0sXG4gICAgXCJPci5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJPci5cIjogW3tcInllYXJcIjoxODUzLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7b3JcIl0sXG4gICAgICAgICAgICAgXCJuYW1lXCI6IFwiT3JlZ29uIFJlcG9ydHNcIixcbiAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiTy5cIjogXCJPci5cIn19XSxcbiAgICBcIk9yLiBBcHAuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJPci4gQXBwLlwiOiBbe1wieWVhclwiOjE5NjksIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztvclwiXSxcbiAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIk9yZWdvbiBSZXBvcnRzLCBDb3VydCBvZiBBcHBlYWxzXCIsXG4gICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiT3IuQS5cIjogXCJPci4gQXBwLlwiLCBcIk9yZS4gQXBwLlwiOiBcIk9yLiBBcHAuXCIsIFwiT3JlLkFwcC5cIjogXCJPci4gQXBwLlwifX1dLFxuICAgIFwiT3IuIFRheFwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJPci4gVGF4XCI6IFt7XCJ5ZWFyXCI6MTk2MiwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO29yXCJdLFxuICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJPcmVnb24gVGF4IFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fV0sXG4gICAgXCJPdmVydC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJPdmVydC5cIjogW3tcInllYXJcIjoxNzkxLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTgxNiwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1czt0blwiXSxcbiAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJUZW5uZXNzZWUgUmVwb3J0cywgT3ZlcnRvblwiLFxuICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJUZW5uLihPdmVydC4pXCI6IFwiT3ZlcnQuXCJ9fV0sXG4gICAgXCJQLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVfcmVnaW9uYWxcIixcbiAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiUC5cIjogW3tcInllYXJcIjoxODgzLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE5MzEsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dLFxuICAgICAgICAgICAgICAgICAgICAgICAgIFwiUC4yZFwiOiBbe1wieWVhclwiOjE5MzEsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoyMDAwLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XSxcbiAgICAgICAgICAgICAgICAgICAgICAgICBcIlAuM2RcIjogW3tcInllYXJcIjoyMDAwLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztha1wiLFwidXM7YXpcIixcInVzO2NhXCIsXCJ1cztjb1wiLFwidXM7aGlcIixcInVzO2lkXCIsXCJ1cztrc1wiLFwidXM7bXRcIixcInVzO252XCIsXCJ1cztubVwiLFwidXM7b2tcIixcInVzO29yXCIsXCJ1czt1dFwiLFwidXM7d2FcIixcInVzO3d5XCJdLFxuICAgICAgICAgICAgXCJuYW1lXCI6IFwiUGFjaWZpYyBSZXBvcnRlclwiLFxuICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIlBcIjogXCJQLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJQIDJkXCI6IFwiUC4yZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJQIDNkXCI6IFwiUC4zZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJQLiAyZFwiOiBcIlAuMmRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiUC4gM2RcIjogXCJQLjNkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBcIlAuUi5cIjogXCJQLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJQYWMuXCI6IFwiUC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiUGFjLlIuXCI6IFwiUC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiUGFjLlJlcC5cIjogXCJQLlwifX1dLFxuICAgIFwiUC5SLiBEZWMuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiUC5SLiBEZWMuXCI6IFt7XCJ5ZWFyXCI6MTg5OSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3ByXCJdLFxuICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIkRlY2lzaW9uZXMgZGUgUHVlcnRvIFJpY29cIixcbiAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge319XSxcbiAgICBcIlAuUi4gT2ZmaWMuIFRyYW5zLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIlAuUi4gT2ZmaWMuIFRyYW5zLlwiOiBbe1wieWVhclwiOjE5NzgsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztwclwiXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJPZmZpY2lhbCBUcmFuc2xhdGlvbnMgb2YgdGhlIE9waW5pb25zIG9mIHRoZSBTdXByZW1lIENvdXJ0IG9mIFB1ZXJ0byBSaWNvXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fV0sXG4gICAgXCJQLlIuIFNlbnQuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIlAuUi4gU2VudC5cIjogW3tcInllYXJcIjoxODk5LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxOTAyLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztwclwiXSxcbiAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiU2VudGVuY2lhcyBkZWwgVHJpYnVuYWwgU3VwcmVtbyBkZSBQdWVydG8gUmljb1wiLFxuICAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge319XSxcbiAgICBcIlAuUi5SLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIlAuUi5SLlwiOiBbe1wieWVhclwiOjE4OTksIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxOTc4LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3ByXCJdLFxuICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIlB1ZXJ0byBSaWNvIFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiUC5SLlwiOiBcIlAuUi5SLlwiLCBcIlB1ZXJ0byBSaWNvXCI6IFwiUC5SLlIuXCJ9fV0sXG4gICAgXCJQQVwiOiBbe1wiY2l0ZV90eXBlXCI6IFwibmV1dHJhbFwiLFxuICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJQQVwiOiBbe1wieWVhclwiOjE3NTAsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztwYVwiXSxcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIlBlbm5zeWx2YW5pYSBOZXV0cmFsIENpdGF0aW9uXCIsXG4gICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge319XSxcbiAgICBcIlBhLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIlBhLlwiOiBbe1wieWVhclwiOjE4NDUsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztwYVwiXSxcbiAgICAgICAgICAgICBcIm5hbWVcIjogXCJQZW5uc3lsdmFuaWEgU3RhdGUgUmVwb3J0c1wiLFxuICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJQLlMuUi5cIjogXCJQYS5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlBhLlJlcC5cIjogXCJQYS5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlBhLlN0LlwiOiBcIlBhLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiUGEuU3RhdGVcIjogXCJQYS5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlBlbm4uXCI6IFwiUGEuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJQZW5uLlJlcC5cIjogXCJQYS5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlBlbm4uU3QuXCI6IFwiUGEuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJQZW5uLlN0LlIuXCI6IFwiUGEuXCJ9fV0sXG4gICAgXCJQYS4gQy5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJQYS4gQy5cIjogW3tcInllYXJcIjoxODcwLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTkyMSwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztwYVwiXSxcbiAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJQZW5uc3lsdmFuaWEgQ291bnR5IENvdXJ0IFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiUC5DLlIuXCI6IFwiUGEuIEMuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJQYS5DLkMuXCI6IFwiUGEuIEMuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJQYS5Dby5DdC5cIjogXCJQYS4gQy5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlBhLkNvLkN0LlIuXCI6IFwiUGEuIEMuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJQYS5Db3VudHkgQ3QuXCI6IFwiUGEuIEMuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJQZW5uLkNvLkN0LlJlcC5cIjogXCJQYS4gQy5cIn19XSxcbiAgICBcIlBhLiBDb21tdy5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiUGEuIENvbW13LlwiOiBbe1wieWVhclwiOjE5NzAsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE5OTQsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3BhXCJdLFxuICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJQZW5uc3lsdmFuaWEgQ29tbW9ud2VhbHRoIENvdXJ0XCIsXG4gICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJQYS4gQ29tbW9ud2VhbHRoIEN0LlwiOiBcIlBhLiBDb21tdy5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJQYS5DLlwiOiBcIlBhLiBDb21tdy5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJQYS5Db21tdy5DdC5cIjogXCJQYS4gQ29tbXcuXCJ9fV0sXG4gICAgXCJQYS4gRC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJQYS4gRC5cIjogW3tcInllYXJcIjoxODkyLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTkyMSwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztwYVwiXSxcbiAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJQZW5uc3lsdmFuaWEgRGlzdHJpY3QgUmVwb3J0c1wiLFxuICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJEaXN0LlJlcC5cIjogXCJQYS4gRC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlBhLkRpc3QuXCI6IFwiUGEuIEQuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJQYS5EaXN0LlIuXCI6IFwiUGEuIEQuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJQZW5uLkRpc3QuUmVwLlwiOiBcIlBhLiBELlwifX1dLFxuICAgIFwiUGEuIEQuICYgQy5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIlBhLiBELiAmIEMuXCI6IFt7XCJ5ZWFyXCI6MTkyMSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJQYS4gRC4gJiBDLjJkXCI6IFt7XCJ5ZWFyXCI6MTkyMSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlBhLiBELiAmIEMuM2RcIjogW3tcInllYXJcIjoxOTIxLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiUGEuIEQuICYgQy40dGhcIjogW3tcInllYXJcIjoxOTIxLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7cGFcIl0sXG4gICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJQZW5uc3lsdmFuaWEgRGlzdHJpY3QgYW5kIENvdW50eSBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiUGEuRGlzdC4mIEMuUmVwLlwiOiBcIlBhLiBELiAmIEMuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlBhLkRpc3QuJiBDby5cIjogXCJQYS4gRC4gJiBDLlwifX1dLFxuICAgIFwiUGEuIFN1cGVyLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJQYS4gU3VwZXIuXCI6IFt7XCJ5ZWFyXCI6MTg5NSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3BhXCJdLFxuICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJQZW5uc3lsdmFuaWEgU3VwZXJpb3IgQ291cnQgUmVwb3J0c1wiLFxuICAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiUGEuIFN1cGVyaW9yIEN0LlwiOiBcIlBhLiBTdXBlci5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJQYS5TLlwiOiBcIlBhLiBTdXBlci5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJQYS5TdXBlci5DdC5cIjogXCJQYS4gU3VwZXIuXCJ9fV0sXG4gICAgXCJQYWlnZSBDaC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJQYWlnZSBDaC5cIjogW3tcInllYXJcIjoxODI4LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTg0NSwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztueVwiXSxcbiAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJQYWlnZSdzIENoYW5jZXJ5IFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiUGFpLlwiOiBcIlBhaWdlIENoLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiUGFpLkNoLlwiOiBcIlBhaWdlIENoLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiUGFpZ2VcIjogXCJQYWlnZSBDaC5cIn19XSxcbiAgICBcIlBlY2tcIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiUGVja1wiOiBbe1wieWVhclwiOjE4MjEsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4MjQsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3RuXCJdLFxuICAgICAgICAgICAgICBcIm5hbWVcIjogXCJUZW5uZXNzZWUgUmVwb3J0cywgUGVja1wiLFxuICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiUGVjayAoVGVubi4pXCI6IFwiUGVja1wiLCBcIlRlbm4uKFBlY2spXCI6IFwiUGVja1wifX1dLFxuICAgIFwiUGVsdC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIlBlbHQuXCI6IFt7XCJ5ZWFyXCI6MTkxNywgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxOTI0LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bGFcIl0sXG4gICAgICAgICAgICAgICBcIm5hbWVcIjogXCJQZWx0aWVyJ3MgT3BpbmlvbnMsIFBhcmlzaCBhdCBPcmxlYW5zXCIsXG4gICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge319XSxcbiAgICBcIlBlbi4gJiBXLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIlBlbi4gJiBXLlwiOiBbe1wieWVhclwiOjE4MjksIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODMyLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3BhXCJdLFxuICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIlBlbm5zeWx2YW5pYSBTdGF0ZSBSZXBvcnRzLCBQZW5yb3NlIGFuZCBXYXR0c1wiLFxuICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJQLiYgVy5cIjogXCJQZW4uICYgVy5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlAuUi5cIjogXCJQZW4uICYgVy5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlBlbnIuJiBXLlwiOiBcIlBlbi4gJiBXLlwifX1dLFxuICAgIFwiUGVubmV3aWxsXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiUGVubmV3aWxsXCI6IFt7XCJ5ZWFyXCI6MTg5NywgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE5MDksIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7ZGVcIl0sXG4gICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiRGVsYXdhcmUgUmVwb3J0cywgUGVubmV3aWxsXCIsXG4gICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fV0sXG4gICAgXCJQZW5ueXAuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIlBlbm55cC5cIjogW3tcInllYXJcIjoxODgxLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODg0LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztwYVwiXSxcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiUGVubnN5bHZhbmlhIFN0YXRlIFJlcG9ydHMsIFBlbm55cGFja2VyXCIsXG4gICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJQZW5uLlwiOiBcIlBlbm55cC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJQZW5ueS5cIjogXCJQZW5ueXAuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiUGVubnlwLihQYS4pXCI6IFwiUGVubnlwLlwifX1dLFxuICAgIFwiUGV0LlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic2NvdHVzX2Vhcmx5XCIsXG4gICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiUGV0LlwiOiBbe1wieWVhclwiOjE4MjgsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4NDIsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2ZlZGVyYWw7c3VwcmVtZS5jb3VydFwiXSxcbiAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiUGV0ZXJzJyBTdXByZW1lIENvdXJ0IFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIlBldC5TLkMuXCI6IFwiUGV0LlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlBldGVyc1wiOiBcIlBldC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJVLlMuKFBldC4pXCI6IFwiUGV0LlwifX1dLFxuICAgIFwiUGhpbC4gRXEuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiUGhpbC4gRXEuXCI6IFt7XCJ5ZWFyXCI6MTg2NiwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4NjgsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bmNcIl0sXG4gICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiTm9ydGggQ2Fyb2xpbmEgUmVwb3J0cywgUGhpbGlwcycgRXF1aXR5PFwiLFxuICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJOLkMuKFBoaWwuRXEuKVwiOiBcIlBoaWwuIEVxLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiUGhpbC5cIjogXCJQaGlsLiBFcS5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlBoaWwuRXEuKE4uQy4pXCI6IFwiUGhpbC4gRXEuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJQaGlsbC5cIjogXCJQaGlsLiBFcS5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlBoaWxsaXBzXCI6IFwiUGhpbC4gRXEuXCJ9fV0sXG4gICAgXCJQaGlsLiBMYXdcIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJQaGlsLiBMYXdcIjogW3tcInllYXJcIjoxODY2LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTg2OCwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztuY1wiXSxcbiAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJOb3J0aCBDYXJvbGluYSBSZXBvcnRzLCBQaGlsaXBzJyBMYXdcIixcbiAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiTi5DLihQaGlsLkxhdylcIjogXCJQaGlsLiBMYXdcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlBoaWwuXCI6IFwiUGhpbC4gTGF3XCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJQaGlsLk4uQy5cIjogXCJQaGlsLiBMYXdcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlBoaWxsLlwiOiBcIlBoaWwuIExhd1wiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiUGhpbGwuTC4oTi5DLilcIjogXCJQaGlsLiBMYXdcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlBoaWxsaXBzXCI6IFwiUGhpbC4gTGF3XCJ9fV0sXG4gICAgXCJQaWNrLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiUGljay5cIjogW3tcInllYXJcIjoxODIyLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4MzksIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1czttYVwiXSxcbiAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIk1hc3NhY2h1c2V0dHMgUmVwb3J0cywgUGlja2VyaW5nXCIsXG4gICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiTWFzcy4oUGljay4pXCI6IFwiUGljay5cIiwgXCJQaWNrLihNYXNzLilcIjogXCJQaWNrLlwifX1dLFxuICAgIFwiUGluLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJQaW4uXCI6IFt7XCJ5ZWFyXCI6MTgzOSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTg1MiwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7d2lcIl0sXG4gICAgICAgICAgICAgIFwibmFtZVwiOiBcIldpc2NvbnNpbiBSZXBvcnRzLCBQaW5uZXlcIixcbiAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIlBpbm4uXCI6IFwiUGluLlwifX1dLFxuICAgIFwiUG9ydC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIlBvcnQuXCI6IFt7XCJ5ZWFyXCI6MTgzNCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODM5LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7YWxcIl0sXG4gICAgICAgICAgICAgICBcIm5hbWVcIjogXCJBbGFiYW1hIFJlcG9ydHMsIFBvcnRlclwiLFxuICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIlBvcnQuKEFsYS4pXCI6IFwiUG9ydC5cIiwgXCJQb3J0ZXJcIjogXCJQb3J0LlwifX1dLFxuICAgIFwiUi5JLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJSLkkuXCI6IFt7XCJ5ZWFyXCI6MTgyOCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTk4MCwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7cmlcIl0sXG4gICAgICAgICAgICAgIFwibmFtZVwiOiBcIlJob2RlIElzbGFuZCBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiUmFuZC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIlJhbmQuXCI6IFt7XCJ5ZWFyXCI6MTgyMSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODI4LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7dmFcIl0sXG4gICAgICAgICAgICAgICBcIm5hbWVcIjogXCJWaXJnaW5pYSBSZXBvcnRzLCBSYW5kb2xwaFwiLFxuICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIlZhLihSYW5kLilcIjogXCJSYW5kLlwifX1dLFxuICAgIFwiUmF3bGVcIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIlJhd2xlXCI6IFt7XCJ5ZWFyXCI6MTgyOCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODM1LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7cGFcIl0sXG4gICAgICAgICAgICAgICBcIm5hbWVcIjogXCJQZW5uc3lsdmFuaWEgU3RhdGUgUmVwb3J0cywgUmF3bGVcIixcbiAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJQYS4gUmF3bGVcIjogXCJSYXdsZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJSLlwiOiBcIlJhd2xlXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlJhdy5cIjogXCJSYXdsZVwifX1dLFxuICAgIFwiUmljZVwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJSaWNlXCI6IFt7XCJ5ZWFyXCI6MTgzOCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTgzOSwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7c2NcIl0sXG4gICAgICAgICAgICAgIFwibmFtZVwiOiBcIlNvdXRoIENhcm9saW5hIFJlcG9ydHMsIFJpY2VcIixcbiAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIlJpY2UgTC4oUy5DLilcIjogXCJSaWNlXCIsIFwiUy5DLkwuKFJpY2UpXCI6IFwiUmljZVwifX1dLFxuICAgIFwiUmljZSBFcS5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIlJpY2UgRXEuXCI6IFt7XCJ5ZWFyXCI6MTgzOCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODM5LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7c2NcIl0sXG4gICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJTb3V0aCBDYXJvbGluYSBSZXBvcnRzLCBSaWNlJ3MgRXF1aXR5XCIsXG4gICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiUmljZSBDaC5cIjogXCJSaWNlIEVxLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJTLkMuRXEuKFJpY2UuRXEuKVwiOiBcIlJpY2UgRXEuXCJ9fV0sXG4gICAgXCJSaWNoLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiUmljaC5cIjogW3tcInllYXJcIjoxODQ2LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4NjgsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztzY1wiXSxcbiAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIlNvdXRoIENhcm9saW5hIFJlcG9ydHMsIFJpY2hhcmRzb25cIixcbiAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJSaWNoLkwuKFMuQy4pXCI6IFwiUmljaC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiUmljaC5MYXcoUy5DLilcIjogXCJSaWNoLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJTLkMuTC4oUmljaC4pXCI6IFwiUmljaC5cIn19XSxcbiAgICBcIlJpY2guIENhcy5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiUmljaC4gQ2FzLlwiOiBbe1wieWVhclwiOjE4MzEsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4MzIsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3NjXCJdLFxuICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJTb3V0aCBDYXJvbGluYSBSZXBvcnRzLCBSaWNoYXJkc29uJ3MgQ2FzZXNcIixcbiAgICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIlJpY2guQ2FzLihTLkMuKVwiOiBcIlJpY2guIENhcy5cIn19XSxcbiAgICBcIlJpY2guIEVxLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIlJpY2guIEVxLlwiOiBbe1wieWVhclwiOjE4NDQsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODY4LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3NjXCJdLFxuICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIlNvdXRoIENhcm9saW5hIFJlcG9ydHMsIFJpY2hhcmRzb24ncyBFcXVpdHlcIixcbiAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiUmljaC5FcS5DaC5cIjogXCJSaWNoLiBFcS5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlMuQy5FcS4oUmljaC5FcS4pXCI6IFwiUmljaC4gRXEuXCJ9fV0sXG4gICAgXCJSaWwuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIlJpbC5cIjogW3tcInllYXJcIjoxODM2LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODM3LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztzY1wiXSxcbiAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiU291dGggQ2Fyb2xpbmEgUmVwb3J0cywgUmlsZXlcIixcbiAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIlJpbGV5XCI6IFwiUmlsLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlJpbGV5IEwuKFMuQy4pXCI6IFwiUmlsLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlMuQy5MLihSaWxleSlcIjogXCJSaWwuXCJ9fV0sXG4gICAgXCJSaWwuIEVxLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiUmlsLiBFcS5cIjogW3tcInllYXJcIjoxODM2LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4MzcsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztzY1wiXSxcbiAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIlNvdXRoIENhcm9saW5hIFJlcG9ydHMsIFJpbGV5J3MgQ2hhbmNlcnlcIixcbiAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJSaWwuXCI6IFwiUmlsLiBFcS5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiUmlsZXlcIjogXCJSaWwuIEVxLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJSaWxleSBDaC5cIjogXCJSaWwuIEVxLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJSaWxleSBFcS5cIjogXCJSaWwuIEVxLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJSaWxleSBFcS4oUy5DLilcIjogXCJSaWwuIEVxLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJTLkMuRXEuKFJpbC4pXCI6IFwiUmlsLiBFcS5cIn19XSxcbiAgICBcIlJvYi5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiUm9iLlwiOiBbe1wieWVhclwiOjE4NDEsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4NDYsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2xhXCJdLFxuICAgICAgICAgICAgICBcIm5hbWVcIjogXCJMb3Vpc2lhbmEgUmVwb3J0cywgUm9iaW5zb25cIixcbiAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIlJvYi5MYS5cIjogXCJSb2IuXCIsIFwiUm9iaW5zb25cIjogXCJSb2IuXCJ9fSxcbiAgICAgICAgICAgICB7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIlJvYi5cIjogW3tcInllYXJcIjoxODQyLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODQ0LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1czt2YVwiXSxcbiAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiVmlyZ2luaWEgUmVwb3J0cywgUm9iaW5zb25cIixcbiAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIlJvYi5WYS5cIjogXCJSb2IuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiUm9iaW5zb25cIjogXCJSb2IuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiVmEuKFJvYi4pXCI6IFwiUm9iLlwifX1dLFxuICAgIFwiUm9iYXJkc1wiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJSb2JhcmRzXCI6IFt7XCJ5ZWFyXCI6MTg2MiwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTg2NSwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7dHhcIl0sXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIlN5bm9wc2VzIG9mIHRoZSBEZWNpc2lvbnMgb2YgdGhlIFN1cHJlbWUgQ291cnQgb2YgVGV4YXMgQXJpc2luZyBmcm9tIFJlc3RyYWludHMgYnkgQ29uc2NyaXB0IGFuZCBPdGhlciBNaWxpdGFyeSBBdXRob3JpdGllcyAoUm9iYXJkcylcIixcbiAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIlJvYi5cIjogXCJSb2JhcmRzXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiUm9iLkNvbnMuQ2FzLihUZXguKVwiOiBcIlJvYmFyZHNcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJSb2IuQ29uc2MuQ2FzLlwiOiBcIlJvYmFyZHNcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJSb2JhcmRcIjogXCJSb2JhcmRzXCJ9fV0sXG4gICAgXCJSb290XCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIlJvb3RcIjogW3tcInllYXJcIjoxNzg5LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxNzk4LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztjdFwiXSxcbiAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiUm9vdCdzIENvbm5lY3RpY3V0IFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fV0sXG4gICAgXCJTLiAmIE0uXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIlMuICYgTS5cIjogW3tcInllYXJcIjoxODQzLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODUwLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1czttc1wiXSxcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiTWlzc2lzc2lwcGkgUmVwb3J0cywgU21lZGVzIGFuZCBNYXJzaGFsbFwiLFxuICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiTWlzcy4oUy4mIE0uKVwiOiBcIlMuICYgTS5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJTLiYgTWFyLlwiOiBcIlMuICYgTS5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJTbS4mIE0uXCI6IFwiUy4gJiBNLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlNtZWQuJiBNLlwiOiBcIlMuICYgTS5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJTbWVkZXMgJiBNLihNaXNzLilcIjogXCJTLiAmIE0uXCJ9fV0sXG4gICAgXCJTLiBDdC5cIjogW3tcImNpdGVfdHlwZVwiOiBcImZlZFwiLFxuICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiUy4gQ3QuXCI6IFt7XCJ5ZWFyXCI6MTg4MiwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2ZlZGVyYWw7c3VwcmVtZS5jb3VydFwiXSxcbiAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJXZXN0J3MgU3VwcmVtZSBDb3VydCBSZXBvcnRlclwiLFxuICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJTIEN0XCI6IFwiUy4gQ3QuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJTLkMuXCI6IFwiUy4gQ3QuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJTLkN0LlwiOiBcIlMuIEN0LlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiU3VwLkN0LlwiOiBcIlMuIEN0LlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiU3VwLkN0LlJlcC5cIjogXCJTLiBDdC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlN1cHIuQ3QuUmVwLlwiOiBcIlMuIEN0LlwifX1dLFxuICAgIFwiUy5DLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJTLkMuXCI6IFt7XCJ5ZWFyXCI6MTg2OCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3NjXCJdLFxuICAgICAgICAgICAgICBcIm5hbWVcIjogXCJTb3V0aCBDYXJvbGluYSBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJTLkMuUi5cIjogXCJTLkMuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiUy5DYXIuXCI6IFwiUy5DLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlNvLkMuXCI6IFwiUy5DLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlNvLkNhci5cIjogXCJTLkMuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiU291dGggQ2FyLlwiOiBcIlMuQy5cIn19XSxcbiAgICBcIlMuRC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiUy5ELlwiOiBbe1wieWVhclwiOjE4OTAsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE5NzYsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3NkXCJdLFxuICAgICAgICAgICAgICBcIm5hbWVcIjogXCJTb3V0aCBEYWtvdGEgUmVwb3J0c1wiLFxuICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiUy5EYWsuXCI6IFwiUy5ELlwifX1dLFxuICAgIFwiUy5FLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVfcmVnaW9uYWxcIixcbiAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJTLkUuXCI6IFt7XCJ5ZWFyXCI6MTg4NywgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTkzOSwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBcIlMuRS4yZFwiOiBbe1wieWVhclwiOjE5MzksIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2dhXCIsXCJ1cztuY1wiLFwidXM7c2NcIixcInVzO3ZhXCIsXCJ1czt3dlwiXSxcbiAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiU291dGggRWFzdGVybiBSZXBvcnRlclwiLFxuICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiUy4gRS5cIjogXCJTLkUuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiUy4gRS4gMmRcIjogXCJTLkUuMmRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJTLiBFLjJkXCI6IFwiUy5FLjJkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiUy5FLiAyZFwiOiBcIlMuRS4yZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlNFXCI6IFwiUy5FLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlNFIDJkXCI6IFwiUy5FLjJkXCJ9fV0sXG4gICAgXCJTLlcuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZV9yZWdpb25hbFwiLFxuICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIlMuVy5cIjogW3tcInllYXJcIjoxODg2LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxOTI4LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiUy5XLjJkXCI6IFt7XCJ5ZWFyXCI6MTkyOCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxOTk5LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiUy5XLjNkXCI6IFt7XCJ5ZWFyXCI6MTk5OSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7YXJcIixcInVzO2t5XCIsXCJ1czttb1wiLFwidXM7dG5cIixcInVzO3R4XCJdLFxuICAgICAgICAgICAgICBcIm5hbWVcIjogXCJTb3V0aCBXZXN0ZXJuIFJlcG9ydGVyXCIsXG4gICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJTLiBXLlwiOiBcIlMuVy5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJTLiBXLiAyZFwiOiBcIlMuVy4yZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlMuIFcuIDNkXCI6IFwiUy5XLjNkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiUy4gVy4yZFwiOiBcIlMuVy4yZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlMuIFcuM2RcIjogXCJTLlcuM2RcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJTLlcuIDJkXCI6IFwiUy5XLjJkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiUy5XLiAzZFwiOiBcIlMuVy4zZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlNXXCI6IFwiUy5XLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlNXIDJkXCI6IFwiUy5XLjJkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiU1cgM2RcIjogXCJTLlcuM2RcIn19XSxcbiAgICBcIlNEXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJuZXV0cmFsXCIsXG4gICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIlNEXCI6IFt7XCJ5ZWFyXCI6MTc1MCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3NkXCJdLFxuICAgICAgICAgICAgXCJuYW1lXCI6IFwiU291dGggRGFrb3RhIE5ldXRyYWwgQ2l0YXRpb25cIixcbiAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiU2FkbGVyXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiU2FkbGVyXCI6IFt7XCJ5ZWFyXCI6MTg4NSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4ODgsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7cGFcIl0sXG4gICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiUGVubnN5bHZhbmlhIFN0YXRlIFJlcG9ydHMsIFNhZGxlclwiLFxuICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJQYS5DYXMuXCI6IFwiU2FkbGVyXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJTYWQuUGEuQ2FzLlwiOiBcIlNhZGxlclwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiU2FkLlBhLkNzLlwiOiBcIlNhZGxlclwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiU2FkbC5cIjogXCJTYWRsZXJcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlNhZGxlcihQYS4pXCI6IFwiU2FkbGVyXCJ9fV0sXG4gICAgXCJTYW5kLiBDaC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJTYW5kLiBDaC5cIjogW3tcInllYXJcIjoxODQzLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTg0NywgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztueVwiXSxcbiAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJTYW5kZm9yZCdzIENoYW5jZXJ5IFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiU2FuZC5DaHkuXCI6IFwiU2FuZC4gQ2guXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJTYW5kZi5DaC5cIjogXCJTYW5kLiBDaC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlNhbmRmLkNoLihOLlkuKVwiOiBcIlNhbmQuIENoLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiU2FuZGYuQ2h5LlwiOiBcIlNhbmQuIENoLlwifX1dLFxuICAgIFwiU2FyYXQuIENoLiBTZW50LlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJTYXJhdC4gQ2guIFNlbnQuXCI6IFt7XCJ5ZWFyXCI6MTg0MSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTg0NywgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bnlcIl0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIlNhcmF0b2dhIENoYW5jZXJ5IFNlbnRpbmVsXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJDaC5TZW50LlwiOiBcIlNhcmF0LiBDaC4gU2VudC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJDaC5TZW50LihOLlkuKVwiOiBcIlNhcmF0LiBDaC4gU2VudC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJOLlkuQ2guU2VudC5cIjogXCJTYXJhdC4gQ2guIFNlbnQuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiU2FyLkNoLlNlbi5cIjogXCJTYXJhdC4gQ2guIFNlbnQuXCJ9fV0sXG4gICAgXCJTY2FtLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiU2NhbS5cIjogW3tcInllYXJcIjoxODMyLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4NDMsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztpbFwiXSxcbiAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIklsbGlub2lzIFJlcG9ydHMsIFNjYW1tb25cIixcbiAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJJbGwuKFNjYW0uKVwiOiBcIlNjYW0uXCIsIFwiU2MuXCI6IFwiU2NhbS5cIn19XSxcbiAgICBcIlNlcmcuICYgUmF3bGVcIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiU2VyZy4gJiBSYXdsZVwiOiBbe1wieWVhclwiOjE4MTQsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4MjgsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3BhXCJdLFxuICAgICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJQZW5uc3lsdmFuaWEgU3RhdGUgUmVwb3J0cywgU2VyZ2VhbnQgYW5kIFJhd2xlXCIsXG4gICAgICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJTZXJnLiYgUi5cIjogXCJTZXJnLiAmIFJhd2xlXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiU2VyZy4mIFJhdy5cIjogXCJTZXJnLiAmIFJhd2xlXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiU2VyZy4mIFJhd2wuXCI6IFwiU2VyZy4gJiBSYXdsZVwifX1dLFxuICAgIFwiU25lZWRcIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIlNuZWVkXCI6IFt7XCJ5ZWFyXCI6MTgwMSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODA1LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7a3lcIl0sXG4gICAgICAgICAgICAgICBcIm5hbWVcIjogXCJLZW50dWNreSBSZXBvcnRzLCBTbmVlZFwiLFxuICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIktlbi5EZWMuXCI6IFwiU25lZWRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiS3kuKFNuZWVkKVwiOiBcIlNuZWVkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlNuZWVkIERlYy5cIjogXCJTbmVlZFwifX0sXG4gICAgICAgICAgICAgIHtcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIlNuZWVkXCI6IFt7XCJ5ZWFyXCI6MTg1MywgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODU4LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7dG5cIl0sXG4gICAgICAgICAgICAgICBcIm5hbWVcIjogXCJUZW5uZXNzZWUgUmVwb3J0cywgU25lZWRcIixcbiAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJUZW5uLihTbmVlZClcIjogXCJTbmVlZFwifX1dLFxuICAgIFwiU28uXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZV9yZWdpb25hbFwiLFxuICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiU28uXCI6IFt7XCJ5ZWFyXCI6MTg4NiwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE5NDEsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dLFxuICAgICAgICAgICAgICAgICAgICAgICAgICBcIlNvLiAyZFwiOiBbe1wieWVhclwiOjE5NDEsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoyMDA4LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgXCJTby4gM2RcIjogW3tcInllYXJcIjoyMDA4LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7YWxcIixcInVzO2ZsXCIsXCJ1cztsYVwiLFwidXM7bXNcIl0sXG4gICAgICAgICAgICAgXCJuYW1lXCI6IFwiU291dGhlcm4gUmVwb3J0ZXJcIixcbiAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiU28uMmRcIjogXCJTby4gMmRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlNvLjNkXCI6IFwiU28uIDNkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJTb3V0aC5cIjogXCJTby5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlNvdXRoLjJkXCI6IFwiU28uIDJkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJTb3V0aC4zZFwiOiBcIlNvLiAzZFwifX1dLFxuICAgIFwiU3BlZXJzXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiU3BlZXJzXCI6IFt7XCJ5ZWFyXCI6MTg0MiwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4NDQsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7c2NcIl0sXG4gICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiU291dGggQ2Fyb2xpbmEgUmVwb3J0cywgU3BlZXJzXCIsXG4gICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIlMuQy5MLihTcGVlcnMpXCI6IFwiU3BlZXJzXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJTcC5cIjogXCJTcGVlcnNcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlNwZWFyc1wiOiBcIlNwZWVyc1wiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiU3BlZXJzIEwuKFMuQy4pXCI6IFwiU3BlZXJzXCJ9fV0sXG4gICAgXCJTcGVlcnMgRXEuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIlNwZWVycyBFcS5cIjogW3tcInllYXJcIjoxODQyLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODQ0LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztzY1wiXSxcbiAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiU291dGggQ2Fyb2xpbmEgUmVwb3J0cywgU3BlZXJzJyBFcXVpdHlcIixcbiAgICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIlMuQy5FcS4oU3BlZXJzIEVxLilcIjogXCJTcGVlcnMgRXEuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiU3AuXCI6IFwiU3BlZXJzIEVxLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlNwLkNoLlwiOiBcIlNwZWVycyBFcS5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJTcGVhciBDaC5cIjogXCJTcGVlcnMgRXEuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiU3BlYXIgRXEuXCI6IFwiU3BlZXJzIEVxLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlNwZWFyc1wiOiBcIlNwZWVycyBFcS5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJTcGVhcnMgRXEuXCI6IFwiU3BlZXJzIEVxLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlNwZWVyc1wiOiBcIlNwZWVycyBFcS5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJTcGVlcnMgRXEuKFMuQy4pXCI6IFwiU3BlZXJzIEVxLlwifX1dLFxuICAgIFwiU3RhdGUgUnB0ci5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIlN0YXRlIFJwdHIuXCI6IFt7XCJ5ZWFyXCI6MTk0NSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO210XCJdLFxuICAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiU3RhdGUgUmVwb3J0ZXJcIixcbiAgICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiU3Rldy5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIlN0ZXcuXCI6IFt7XCJ5ZWFyXCI6MTgyNywgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODMxLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7YWxcIl0sXG4gICAgICAgICAgICAgICBcIm5hbWVcIjogXCJBbGFiYW1hIFJlcG9ydHMsIFN0ZXdhcnRcIixcbiAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJTdGV3YXJ0XCI6IFwiU3Rldy5cIn19XSxcbiAgICBcIlN0ZXcuICYgUC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiU3Rldy4gJiBQLlwiOiBbe1wieWVhclwiOjE4MzEsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4MzQsIFwibW9udGhcIjowLCBcImRheVwiOjF9XX0sXG4gICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1czthbFwiXSxcbiAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiQWxhYmFtYSBSZXBvcnRzLCBTdGV3YXJ0IGFuZCBQb3J0ZXJcIixcbiAgICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fV0sXG4gICAgXCJTdHJvYi5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJTdHJvYi5cIjogW3tcInllYXJcIjoxODQ2LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTg1MCwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztzY1wiXSxcbiAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJTb3V0aCBDYXJvbGluYSBSZXBvcnRzLCBTdHJvYmhhcnRcIixcbiAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiUy5DLkwuKFN0cm9iLilcIjogXCJTdHJvYi5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlN0cm9iaC5MLihTLkMuKVwiOiBcIlN0cm9iLlwifX1dLFxuICAgIFwiU3Ryb2IuIEVxLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJTdHJvYi4gRXEuXCI6IFt7XCJ5ZWFyXCI6MTg0NiwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTg1MCwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7c2NcIl0sXG4gICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIlNvdXRoIENhcm9saW5hIFJlcG9ydHMsIFN0cm9iaGFydCdzIEVxdWl0eVwiLFxuICAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiUy5DLkVxLihTdHJvYi5FcS4pXCI6IFwiU3Ryb2IuIEVxLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlN0cm9iLkVxLihTLkMuKVwiOiBcIlN0cm9iLiBFcS5cIn19XSxcbiAgICBcIlN3YW5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiU3dhblwiOiBbe1wieWVhclwiOjE4NTEsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4NTMsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3RuXCJdLFxuICAgICAgICAgICAgICBcIm5hbWVcIjogXCJUZW5uZXNzZWUgUmVwb3J0cywgU3dhblwiLFxuICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiVGVubi4oU3dhbilcIjogXCJTd2FuXCJ9fV0sXG4gICAgXCJULkIuIE1vbi5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJULkIuIE1vbi5cIjogW3tcInllYXJcIjoxODI0LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTgyOCwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztreVwiXSxcbiAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJLZW50dWNreSBSZXBvcnRzLCBNb25yb2UsIFQuQi5cIixcbiAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiS3kuKFQuQi5Nb25yb2UpXCI6IFwiVC5CLiBNb24uXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJNb24uXCI6IFwiVC5CLiBNb24uXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJNb24uVC5CLlwiOiBcIlQuQi4gTW9uLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiVC5CLk1vbi4oS3kuKVwiOiBcIlQuQi4gTW9uLlwifX1dLFxuICAgIFwiVC5DLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3BlY2lhbHR5XCIsXG4gICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiVC5DLlwiOiBbe1wieWVhclwiOjE5NDIsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1c1wiXSxcbiAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiUmVwb3J0cyBvZiB0aGUgVW5pdGVkIFN0YXRlcyBUYXggQ291cnRcIixcbiAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIlQuIEMuXCI6IFwiVC5DLlwiLCBcIlQuQ3RcIjogXCJULkMuXCIsIFwiVC5DdC5cIjogXCJULkMuXCJ9fV0sXG4gICAgXCJULkMuTS5cIjogW3tcImNpdGVfdHlwZVwiOiBcInNwZWNpYWx0eVwiLFxuICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiVC5DLk0uXCI6IFt7XCJ5ZWFyXCI6MTk0MiwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzXCJdLFxuICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIlRheCBDb3VydCBNZW1vcmFuZHVtIERlY2lzaW9uc1wiLFxuICAgICAgICAgICAgICAgICd2YXJpYXRpb25zJzogeydULkMuTS4gKENDSCknOiAnVC5DLk0uJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnVC5DLk0uIChQLUgpJzogJ1QuQy5NLicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ1QuQy5NLiAoUklBKSc6ICdULkMuTS4nfX1dLFxuICAgIFwiVGF5LlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJUYXkuXCI6IFt7XCJ5ZWFyXCI6MTc5OCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTgwMiwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bmNcIl0sXG4gICAgICAgICAgICAgIFwibmFtZVwiOiBcIk5vcnRoIENhcm9saW5hIFJlcG9ydHMsIFRheWxvclwiLFxuICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiTi5DLihUYXkuKVwiOiBcIlRheS5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJUYXkuSi5MLlwiOiBcIlRheS5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJUYXkuTi5DLlwiOiBcIlRheS5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJUYXlsLk4uQy5cIjogXCJUYXkuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiVGF5bG9yXCI6IFwiVGF5LlwifX1dLFxuICAgIFwiVGF5bG9yXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiVGF5bG9yXCI6IFt7XCJ5ZWFyXCI6MTgxNiwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4MTgsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bmNcIl0sXG4gICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiVGF5bG9yJ3MgTm9ydGggQ2Fyb2xpbmEgVGVybSBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIk4uQy4oVGF5bG9yKVwiOiBcIlRheWxvclwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTi5DLlQuUmVwLlwiOiBcIlRheWxvclwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTi5DLlRlcm0uUi5cIjogXCJUYXlsb3JcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk4uQy5UZXJtLlJlcC5cIjogXCJUYXlsb3JcIn19XSxcbiAgICBcIlRlaXNzLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIlRlaXNzLlwiOiBbe1wieWVhclwiOjE5MDMsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxOTE3LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2xhXCJdLFxuICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIkxvdWlzaWFuYSBDb3VydCBvZiBBcHBlYWxzIFJlcG9ydHMsIFRlaXNzZXJcIixcbiAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiTGEuQXBwLihPcmxlYW5zKVwiOiBcIlRlaXNzLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiVGVpc3NpZXJcIjogXCJUZWlzcy5cIn19XSxcbiAgICBcIlRlbm4uXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJUZW5uLlwiOiBbe1wieWVhclwiOjE4NzAsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTk3MSwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3RuXCJdLFxuICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiVGVubmVzc2VlIFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJUZW4uXCI6IFwiVGVubi5cIn19XSxcbiAgICBcIlRlbm4uIEFwcC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiVGVubi4gQXBwLlwiOiBbe1wieWVhclwiOjE5MjUsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE5NzEsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3RuXCJdLFxuICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJUZW5uZXNzZWUgQXBwZWFscyBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiVGVubi4gQ3JpbS4gQXBwLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJUZW5uLiBDcmltLiBBcHAuXCI6IFt7XCJ5ZWFyXCI6MTk2NywgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTk3MSwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7dG5cIl0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIlRlbm5lc3NlZSBDcmltaW5hbCBBcHBlYWxzIFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fV0sXG4gICAgXCJUZXguXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIlRleC5cIjogW3tcInllYXJcIjoxODQ2LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxOTYyLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1czt0eFwiXSxcbiAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiVGV4YXMgUmVwb3J0c1wiLFxuICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiVGV4LlMuQ3QuXCI6IFwiVGV4LlwifX1dLFxuICAgIFwiVGV4LiBDaXYuIEFwcC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIlRleC4gQ2l2LiBBcHAuXCI6IFt7XCJ5ZWFyXCI6MTg5MiwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxOTExLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7dHhcIl0sXG4gICAgICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJUZXhhcyBDaXZpbCBBcHBlYWxzIFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJUZXguQ2l2LkFwcC5cIjogXCJUZXguIENpdi4gQXBwLlwifX1dLFxuICAgIFwiVGV4LiBDcmltLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJUZXguIENyaW0uXCI6IFt7XCJ5ZWFyXCI6MTg5MSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTk2MiwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7dHhcIl0sXG4gICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIlRleGFzIENyaW1pbmFsIFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIlRleC5Dci5BcHAuXCI6IFwiVGV4LiBDcmltLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlRleC5Dci5SLlwiOiBcIlRleC4gQ3JpbS5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJUZXguQ3JpbS5SZXAuXCI6IFwiVGV4LiBDcmltLlwifX1dLFxuICAgIFwiVGV4LiBDdC4gQXBwLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJUZXguIEN0LiBBcHAuXCI6IFt7XCJ5ZWFyXCI6MTg3NiwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTg5MSwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7dHhcIl0sXG4gICAgICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIlRleGFzIENvdXJ0IG9mIEFwcGVhbHMgUmVwb3J0c1wiLFxuICAgICAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiVGV4LkN0LkFwcC5SLlwiOiBcIlRleC4gQ3QuIEFwcC5cIn19XSxcbiAgICBcIlRleC4gTC4gUmV2LlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIlRleC4gTC4gUmV2LlwiOiBbe1wieWVhclwiOjE4NDUsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODQ2LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3R4XCJdLFxuICAgICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIlRleGFzIExhdyBSZXZpZXdcIixcbiAgICAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiVGV4YXMgTC5SZXYuXCI6IFwiVGV4LiBMLiBSZXYuXCJ9fV0sXG4gICAgXCJUZXguIFN1cC4gQ3QuIEouXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIlRleC4gU3VwLiBDdC4gSi5cIjogW3tcInllYXJcIjoxOTU3LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7dHhcIl0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIlRleGFzIFN1cHJlbWUgQ291cnQgSm91cm5hbFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge319XSxcbiAgICBcIlRyZWFkLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIlRyZWFkLlwiOiBbe1wieWVhclwiOjE4MTIsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODE2LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3NjXCJdLFxuICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIlNvdXRoIENhcm9saW5hIFJlcG9ydHMsIFRyZWFkd2F5XCIsXG4gICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIlMuQy5MLihUcmVhZC4pXCI6IFwiVHJlYWQuXCJ9fV0sXG4gICAgXCJUdWNrLiAmIENsLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiVHVjay4gJiBDbC5cIjogW3tcInllYXJcIjoxODkyLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4OTMsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztkY1wiXSxcbiAgICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIkRpc3RyaWN0IG9mIENvbHVtYmlhIFJlcG9ydHMsIFR1Y2tlciBhbmQgQ2xlcGhhbmVcIixcbiAgICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJELkMuKFR1Y2suJiBDbC4pXCI6IFwiVHVjay4gJiBDbC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiVHVjay5cIjogXCJUdWNrLiAmIENsLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJUdWNrLiYgQy5cIjogXCJUdWNrLiAmIENsLlwifX1dLFxuICAgIFwiVHlsLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJUeWwuXCI6IFt7XCJ5ZWFyXCI6MTgwMCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTgwMywgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7dnRcIl0sXG4gICAgICAgICAgICAgIFwibmFtZVwiOiBcIlZlcm1vbnQgUmVwb3J0cywgVHlsZXJcIixcbiAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIlR5bGVyXCI6IFwiVHlsLlwifX1dLFxuICAgIFwiVHluZ1wiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJUeW5nXCI6IFt7XCJ5ZWFyXCI6MTgwNiwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTgyMiwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bWFcIl0sXG4gICAgICAgICAgICAgIFwibmFtZVwiOiBcIk1hc3NhY2h1c2V0dHMgUmVwb3J0cywgVHluZ1wiLFxuICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiTWFzcy4oVHluZylcIjogXCJUeW5nXCJ9fV0sXG4gICAgXCJVLlMuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJmZWRcIixcbiAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJVLlMuXCI6IFt7XCJ5ZWFyXCI6MTc5MCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2ZlZGVyYWw7c3VwcmVtZS5jb3VydFwiXSxcbiAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiVW5pdGVkIFN0YXRlcyBTdXByZW1lIENvdXJ0IFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIlUuIFMuXCI6IFwiVS5TLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlUuUy5TLkMuUmVwLlwiOiBcIlUuUy5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJVU1wiOiBcIlUuUy5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJVU1NDUlwiOiBcIlUuUy5cIn19XSxcbiAgICBcIlUuUy4gQXBwLiBELkMuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJVLlMuIEFwcC4gRC5DLlwiOiBbe1wieWVhclwiOjE5NDEsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztkY1wiXSxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIlVuaXRlZCBTdGF0ZXMgQ291cnQgb2YgQXBwZWFscyBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge319XSxcbiAgICBcIlUuUy4gQXBwLiBMRVhJU1wiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3BlY2lhbHR5XCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJVLlMuIEFwcC4gTEVYSVNcIjogW3tcInllYXJcIjoxNzUwLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7ZmVkZXJhbDsxLWNpclwiLFwidXM7ZmVkZXJhbDsyLWNpclwiLFwidXM7ZmVkZXJhbDszLWNpclwiLFwidXM7ZmVkZXJhbDs0LWNpclwiLFwidXM7ZmVkZXJhbDs1LWNpclwiLFwidXM7ZmVkZXJhbDs2LWNpclwiLFwidXM7ZmVkZXJhbDs3LWNpclwiLFwidXM7ZmVkZXJhbDs4LWNpclwiLFwidXM7ZmVkZXJhbDs5LWNpclwiLFwidXM7ZmVkZXJhbDsxMC1jaXJcIixcInVzO2ZlZGVyYWw7MTEtY2lyXCJdLFxuICAgICAgICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIkxleGlzIE5leHVzIFUuUy4gQXBwZWFscyBDaXRhdGlvblwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiVS5TLkwuVy5cIjogW3tcImNpdGVfdHlwZVwiOiBcInNwZWNpYWx0eVwiLFxuICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJVLlMuTC5XLlwiOiBbe1wieWVhclwiOjE5MzMsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1c1wiXSxcbiAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIlVuaXRlZCBTdGF0ZXMgTGF3IFdlZWtcIixcbiAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiVVRcIjogW3tcImNpdGVfdHlwZVwiOiBcIm5ldXRyYWxcIixcbiAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiVVRcIjogW3tcInllYXJcIjoxNzUwLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7dXRcIl0sXG4gICAgICAgICAgICBcIm5hbWVcIjogXCJVdGFoIE5ldXRyYWwgQ2l0YXRpb25cIixcbiAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiVVQgQXBwXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJuZXV0cmFsXCIsXG4gICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJVVCBBcHBcIjogW3tcInllYXJcIjoxNzUwLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7dXRcIl0sXG4gICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiVXRhaCBOZXV0cmFsIENpdGF0aW9uXCIsXG4gICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fV0sXG4gICAgXCJVdGFoXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIlV0YWhcIjogW3tcInllYXJcIjoxODUxLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxOTc0LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiVXRhaCAyZFwiOiBbe1wieWVhclwiOjE4NTEsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE5NzQsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3V0XCJdLFxuICAgICAgICAgICAgICBcIm5hbWVcIjogXCJVdGFoIFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fV0sXG4gICAgXCJWLkkuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiVi5JLlwiOiBbe1wieWVhclwiOjE5MTcsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7dmlcIl0sXG4gICAgICAgICAgICAgXCJuYW1lXCI6IFwiVmlyZ2luIElzbGFuZHMgUmVwb3J0c1wiLFxuICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiVlRcIjogW3tcImNpdGVfdHlwZVwiOiBcIm5ldXRyYWxcIixcbiAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiVlRcIjogW3tcInllYXJcIjoxNzUwLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7dnRcIl0sXG4gICAgICAgICAgICBcIm5hbWVcIjogXCJWZXJtb250IE5ldXRyYWwgQ2l0YXRpb25cIixcbiAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiVmEuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiVmEuXCI6IFt7XCJ5ZWFyXCI6MTg4MCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3ZhXCJdLFxuICAgICAgICAgICAgIFwibmFtZVwiOiBcIlZpcmdpbmlhIFJlcG9ydHNcIixcbiAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiVi5cIjogXCJWYS5cIiwgXCJWaXJnLlwiOiBcIlZhLlwifX1dLFxuICAgIFwiVmEuIEFwcC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIlZhLiBBcHAuXCI6IFt7XCJ5ZWFyXCI6MTk4NSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3ZhXCJdLFxuICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiVmlyZ2luaWEgQ291cnQgb2YgQXBwZWFscyBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge319XSxcbiAgICBcIlZhLiBDYXMuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJWYS4gQ2FzLlwiOiBbe1wieWVhclwiOjE3ODksIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTgyNiwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3ZhXCJdLFxuICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiVmlyZ2luaWEgQ2FzZXMsIENyaW1pbmFsXCIsXG4gICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge319XSxcbiAgICBcIlZldC4gQXBwLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3BlY2lhbHR5XCIsXG4gICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJWZXQuIEFwcC5cIjogW3tcInllYXJcIjoxOTkwLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXNcIl0sXG4gICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiVmV0ZXJhbnMgQXBwZWFscyBSZXBvcnRlclwiLFxuICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJWZXQuQXBwLlwiOiBcIlZldC4gQXBwLlwifX1dLFxuICAgIFwiVnQuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiVnQuXCI6IFt7XCJ5ZWFyXCI6MTgyNiwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3Z0XCJdLFxuICAgICAgICAgICAgIFwibmFtZVwiOiBcIlZlcm1vbnQgUmVwb3J0c1wiLFxuICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJWLlIuXCI6IFwiVnQuXCIsIFwiVmVybS5cIjogXCJWdC5cIn19XSxcbiAgICBcIlcuIFZhLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIlcuIFZhLlwiOiBbe1wieWVhclwiOjE4NjQsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1czt3dlwiXSxcbiAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJXZXN0IFZpcmdpbmlhIFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiVy5WLlwiOiBcIlcuIFZhLlwiLCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIldlc3QgVmEuXCI6IFwiVy4gVmEuXCJ9fV0sXG4gICAgXCJXSVwiOiBbe1wiY2l0ZV90eXBlXCI6IFwibmV1dHJhbFwiLFxuICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJXSVwiOiBbe1wieWVhclwiOjE3NTAsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1czt3aVwiXSxcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIldpc2NvbnNpbiBOZXV0cmFsIENpdGF0aW9uXCIsXG4gICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge319XSxcbiAgICBcIldJIEFwcFwiOiBbe1wiY2l0ZV90eXBlXCI6IFwibmV1dHJhbFwiLFxuICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiV0kgQXBwXCI6IFt7XCJ5ZWFyXCI6MTc1MCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3dpXCJdLFxuICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIldpc2NvbnNpbiBOZXV0cmFsIENpdGF0aW9uXCIsXG4gICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fV0sXG4gICAgXCJXTFwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3BlY2lhbHR5XCIsXG4gICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIldMXCI6IFt7XCJ5ZWFyXCI6MTc1MCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2N0XCIsXCJ1cztkZVwiLFwidXM7ZGNcIixcInVzO21lXCIsXCJ1cztuaFwiLFwidXM7bmpcIixcInVzO3BhXCIsXCJ1cztyaVwiLFwidXM7dnRcIixcInVzO2lsXCIsXCJ1cztpblwiLFwidXM7bWFcIixcInVzO255XCIsXCJ1cztvaFwiLFwidXM7aWFcIixcInVzO21pXCIsXCJ1czttblwiLFwidXM7bmVcIixcInVzO25kXCIsXCJ1cztzZFwiLFwidXM7d2lcIixcInVzO2FrXCIsXCJ1czthelwiLFwidXM7Y2FcIixcInVzO2NvXCIsXCJ1cztoaVwiLFwidXM7aWRcIixcInVzO2tzXCIsXCJ1czttdFwiLFwidXM7bnZcIixcInVzO25tXCIsXCJ1cztva1wiLFwidXM7b3JcIixcInVzO3V0XCIsXCJ1czt3YVwiLFwidXM7d3lcIixcInVzO2dhXCIsXCJ1cztuY1wiLFwidXM7c2NcIixcInVzO3ZhXCIsXCJ1czt3dlwiLFwidXM7YXJcIixcInVzO2t5XCIsXCJ1czttb1wiLFwidXM7dG5cIixcInVzO3R4XCIsXCJ1czthbFwiLFwidXM7ZmxcIixcInVzO2xhXCIsXCJ1czttc1wiLFwidXM7ZmVkZXJhbDsxLWNpclwiLFwidXM7ZmVkZXJhbDsyLWNpclwiLFwidXM7ZmVkZXJhbDszLWNpclwiLFwidXM7ZmVkZXJhbDs0LWNpclwiLFwidXM7ZmVkZXJhbDs1LWNpclwiLFwidXM7ZmVkZXJhbDs2LWNpclwiLFwidXM7ZmVkZXJhbDs3LWNpclwiLFwidXM7ZmVkZXJhbDs4LWNpclwiLFwidXM7ZmVkZXJhbDs5LWNpclwiLFwidXM7ZmVkZXJhbDsxMC1jaXJcIixcInVzO2ZlZGVyYWw7MTEtY2lyXCJdLFxuICAgICAgICAgICAgXCJuYW1lXCI6IFwiV2VzdCBMYXcgQ2l0YXRpb25cIixcbiAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiV1lcIjogW3tcImNpdGVfdHlwZVwiOiBcIm5ldXRyYWxcIixcbiAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiV1lcIjogW3tcInllYXJcIjoxNzUwLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7d3lcIl0sXG4gICAgICAgICAgICBcIm5hbWVcIjogXCJXeW9taW5nIE5ldXRyYWwgQ2l0YXRpb25cIixcbiAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiV2Fsay5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIldhbGsuXCI6IFt7XCJ5ZWFyXCI6MTg1NSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODg1LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7cGFcIl0sXG4gICAgICAgICAgICAgICBcIm5hbWVcIjogXCJQZW5uc3lsdmFuaWEgU3RhdGUgUmVwb3J0cywgV2Fsa2VyXCIsXG4gICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiV2Fsay5QYS5cIjogXCJXYWxrLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJXYWxrZXJcIjogXCJXYWxrLlwifX1dLFxuICAgIFwiV2Fsa2VyXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiV2Fsa2VyXCI6IFt7XCJ5ZWFyXCI6MTgxOCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4MzIsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bXNcIl0sXG4gICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiTWlzc2lzc2lwcGkgUmVwb3J0cywgV2Fsa2VyXCIsXG4gICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIk1pc3MuKFdhbGtlcilcIjogXCJXYWxrZXJcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIldhbGsuXCI6IFwiV2Fsa2VyXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJXYWxrLk1pc3MuXCI6IFwiV2Fsa2VyXCJ9fV0sXG4gICAgXCJXYWxsLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic2NvdHVzX2Vhcmx5XCIsXG4gICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIldhbGwuXCI6IFt7XCJ5ZWFyXCI6MTg2MywgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODc0LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7ZmVkZXJhbDtzdXByZW1lLmNvdXJ0XCJdLFxuICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiV2FsbGFjZSdzIFN1cHJlbWUgQ291cnQgUmVwb3J0c1wiLFxuICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIlUuUy4oV2FsbC4pXCI6IFwiV2FsbC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiV2FsbC5cIjogXCJXYWxsLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJXYWxsYWNlXCI6IFwiV2FsbC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiV2FsbC5SZXAuXCI6IFwiV2FsbC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiV2FsbC5TLkMuXCI6IFwiV2FsbC5cIn19XSxcbiAgICBcIldhc2guXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJXYXNoLlwiOiBbe1wieWVhclwiOjE3OTAsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTc5NiwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3ZhXCJdLFxuICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiVmlyZ2luaWEgUmVwb3J0cywgV2FzaGluZ3RvblwiLFxuICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIlZhLihXYXNoLilcIjogXCJXYXNoLlwiLCBcIldhc2guVmEuXCI6IFwiV2FzaC5cIn19LFxuICAgICAgICAgICAgICB7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJXYXNoLlwiOiBbe1wieWVhclwiOjE4ODksIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiV2FzaC4gMmRcIjogW3tcInllYXJcIjoxODg5LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7d2FcIl0sXG4gICAgICAgICAgICAgICBcIm5hbWVcIjogXCJXYXNoaW5ndG9uIFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJXLlwiOiBcIldhc2guXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlcuMmRcIjogXCJXYXNoLiAyZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJXLlN0LlwiOiBcIldhc2guXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIldBU0hcIjogXCJXYXNoLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJXYS5cIjogXCJXYXNoLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJXYS4yZFwiOiBcIldhc2guIDJkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIldhc2guU3QuXCI6IFwiV2FzaC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiV25cIjogXCJXYXNoLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJXbi4gMmRcIjogXCJXYXNoLiAyZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJXbi4yZFwiOiBcIldhc2guIDJkXCJ9fV0sXG4gICAgXCJXYXNoLiBBcHAuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIldhc2guIEFwcC5cIjogW3tcInllYXJcIjoxOTY5LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7d2FcIl0sXG4gICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIldhc2hpbmd0b24gQXBwZWxsYXRlIFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIlcuQXBwLlwiOiBcIldhc2guIEFwcC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJXYS5BLlwiOiBcIldhc2guIEFwcC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJXbi4gQXBwLlwiOiBcIldhc2guIEFwcC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJXbi5BcHAuXCI6IFwiV2FzaC4gQXBwLlwifX1dLFxuICAgIFwiV2FzaC4gVGVyci5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIldhc2guIFRlcnIuXCI6IFt7XCJ5ZWFyXCI6MTg1NCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODg4LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7d2FcIl0sXG4gICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJXYXNoaW5ndG9uIFRlcnJpdG9yeSBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiQWxsZW5cIjogXCJXYXNoLiBUZXJyLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJXLlQuXCI6IFwiV2FzaC4gVGVyci5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiVy5UeS5SLlwiOiBcIldhc2guIFRlcnIuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIldhc2guXCI6IFwiV2FzaC4gVGVyci5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiV2FzaC5ULlwiOiBcIldhc2guIFRlcnIuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIldhc2guVGVyLlwiOiBcIldhc2guIFRlcnIuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIldhc2guVGVyLk4uUy5cIjogXCJXYXNoLiBUZXJyLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJXYXNoLlR5LlwiOiBcIldhc2guIFRlcnIuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlduLiBUZXJyLlwiOiBcIldhc2guIFRlcnIuXCJ9fV0sXG4gICAgXCJXYXR0c1wiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiV2F0dHNcIjogW3tcInllYXJcIjoxODMyLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4NDAsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztwYVwiXSxcbiAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIlBlbm5zeWx2YW5pYSBTdGF0ZSBSZXBvcnRzLCBXYXR0c1wiLFxuICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIldhLlwiOiBcIldhdHRzXCIsIFwiV2F0dHMoUGEuKVwiOiBcIldhdHRzXCJ9fV0sXG4gICAgXCJXYXR0cyAmIFNlcmcuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIldhdHRzICYgU2VyZy5cIjogW3tcInllYXJcIjoxODQxLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODQ1LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztwYVwiXSxcbiAgICAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiUGVubnN5bHZhbmlhIFN0YXRlIFJlcG9ydHMsIFdhdHRzICYgU2VyZ2VhbnRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIlcuJiBTLlwiOiBcIldhdHRzICYgU2VyZy5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJXYXR0cyAmIFMuXCI6IFwiV2F0dHMgJiBTZXJnLlwifX1dLFxuICAgIFwiV2VuZC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIldlbmQuXCI6IFt7XCJ5ZWFyXCI6MTgyOCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODQxLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bnlcIl0sXG4gICAgICAgICAgICAgICBcIm5hbWVcIjogXCJXZW5kZWxsJ3MgUmVwb3J0c1wiLFxuICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIlcuXCI6IFwiV2VuZC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiV2VuZC4oTi5ZLilcIjogXCJXZW5kLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJXZW5kZWxsXCI6IFwiV2VuZC5cIn19XSxcbiAgICBcIldoYXJ0LlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIldoYXJ0LlwiOiBbe1wieWVhclwiOjE4MzUsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODQxLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3BhXCJdLFxuICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIlBlbm5zeWx2YW5pYSBTdGF0ZSBSZXBvcnRzLCBXaGFydG9uXCIsXG4gICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIldoLlwiOiBcIldoYXJ0LlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiV2hhci5cIjogXCJXaGFydC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIldoYXJ0LlBhLlwiOiBcIldoYXJ0LlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiV2hhcnRvblwiOiBcIldoYXJ0LlwifX1dLFxuICAgIFwiV2hlYXQuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzY290dXNfZWFybHlcIixcbiAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIldoZWF0LlwiOiBbe1wieWVhclwiOjE4MTYsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODI3LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2ZlZGVyYWw7c3VwcmVtZS5jb3VydFwiXSxcbiAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJXaGVhdG9uJ3MgU3VwcmVtZSBDb3VydCBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIlUuUy4oV2hlYXQuKVwiOiBcIldoZWF0LlwiLCBcIldoZWF0b25cIjogXCJXaGVhdC5cIn19XSxcbiAgICBcIldoaXRlICYgVy5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiV2hpdGUgJiBXLlwiOiBbe1wieWVhclwiOjE4NzYsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4ODMsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3R4XCJdLFxuICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJDb25kZW5zZWQgUmVwb3J0cyBvZiBEZWNpc2lvbnMgaW4gQ2l2aWwgQ2F1c2VzIGluIHRoZSBDb3VydCBvZiBBcHBlYWxzIG9mIFRleGFzIChXaGl0ZSAmIFdpbHNvbilcIixcbiAgICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIlRleC5BLkNpdi5cIjogXCJXaGl0ZSAmIFcuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiVGV4LkEuQ2l2LkNhcy5cIjogXCJXaGl0ZSAmIFcuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiVGV4LkFwcC5cIjogXCJXaGl0ZSAmIFcuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiVGV4LkMuQy5cIjogXCJXaGl0ZSAmIFcuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiVGV4LkNpdi5DYXMuXCI6IFwiV2hpdGUgJiBXLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlRleC5DdC5BcHAuRGVjLkNpdi5cIjogXCJXaGl0ZSAmIFcuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiVy4mIFcuXCI6IFwiV2hpdGUgJiBXLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIldoaXRlICYgVy4oVGV4LilcIjogXCJXaGl0ZSAmIFcuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiV2hpdGUgJiBXLkNpdi5DYXMuQ3QuQXBwLlwiOiBcIldoaXRlICYgVy5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJXaS4mIFdpbGwuXCI6IFwiV2hpdGUgJiBXLlwifX1dLFxuICAgIFwiV2lsbC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIldpbGwuXCI6IFt7XCJ5ZWFyXCI6MTgwNCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODA1LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bWFcIl0sXG4gICAgICAgICAgICAgICBcIm5hbWVcIjogXCJNYXNzYWNodXNldHRzIFJlcG9ydHMsIFdpbGxpYW1zXCIsXG4gICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiTWFzcy4oV2lsbC4pXCI6IFwiV2lsbC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiV2lsbC5NYXNzLlwiOiBcIldpbGwuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIldpbGxpYW1zXCI6IFwiV2lsbC5cIn19XSxcbiAgICBcIldpbHNvblwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIldpbHNvblwiOiBbe1wieWVhclwiOjE4ODMsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODkyLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3R4XCJdLFxuICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIkNvbmRlbnNlZCBSZXBvcnRzIG9mIERlY2lzaW9ucyBpbiBDaXZpbCBDYXVzZXMgaW4gdGhlIENvdXJ0IG9mIEFwcGVhbHMgb2YgVGV4YXMgKFdpbHNvbilcIixcbiAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge319XSxcbiAgICBcIldpbi5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiV2luLlwiOiBbe1wieWVhclwiOjE4NjMsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4NjQsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO25jXCJdLFxuICAgICAgICAgICAgICBcIm5hbWVcIjogXCJOb3J0aCBDYXJvbGluYSBSZXBvcnRzLCBXaW5zdG9uXCIsXG4gICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiV2lzLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJXaXMuXCI6IFt7XCJ5ZWFyXCI6MTg1MywgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJXaXMuIDJkXCI6IFt7XCJ5ZWFyXCI6MTg1MywgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3dpXCJdLFxuICAgICAgICAgICAgICBcIm5hbWVcIjogXCJXaXNjb25zaW4gUmVwb3J0c1wiLFxuICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiVy5cIjogXCJXaXMuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiVy4yZFwiOiBcIldpcy4gMmRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJXLlIuXCI6IFwiV2lzLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIldpcy4yZFwiOiBcIldpcy4gMmRcIn19XSxcbiAgICBcIld5by5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiV3lvLlwiOiBbe1wieWVhclwiOjE4NzAsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE5NTksIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3d5XCJdLFxuICAgICAgICAgICAgICBcIm5hbWVcIjogXCJXeW9taW5nIFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIlcuXCI6IFwiV3lvLlwiLCBcIld5LlwiOiBcIld5by5cIn19XSxcbiAgICBcIllhdGVzIFNlbC4gQ2FzLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIllhdGVzIFNlbC4gQ2FzLlwiOiBbe1wieWVhclwiOjE4MDksIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODA5LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO255XCJdLFxuICAgICAgICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIllhdGVzJyBTZWxlY3QgQ2FzZXNcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiWWF0ZXNcIjogXCJZYXRlcyBTZWwuIENhcy5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIllhdGVzIFNlbC5DYXMuKE4uWS4pXCI6IFwiWWF0ZXMgU2VsLiBDYXMuXCJ9fV0sXG4gICAgXCJZZWF0ZXNcIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJZZWF0ZXNcIjogW3tcInllYXJcIjoxNzkxLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTgwOCwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztwYVwiXSxcbiAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJQZW5uc3lsdmFuaWEgU3RhdGUgUmVwb3J0cywgWWVhdGVzXCIsXG4gICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIlkuXCI6IFwiWWVhdGVzXCIsIFwiWWVhLlwiOiBcIlllYXRlc1wifX1dLFxuICAgIFwiWWVyLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJZZXIuXCI6IFt7XCJ5ZWFyXCI6MTgyOCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTgzNywgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7dG5cIl0sXG4gICAgICAgICAgICAgIFwibmFtZVwiOiBcIlRlbm5lc3NlZSBSZXBvcnRzLCBZZXJnZXJcIixcbiAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIlRlbm4uKFllci4pXCI6IFwiWWVyLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlllcmcuXCI6IFwiWWVyLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlllcmcuKFRlbm4uKVwiOiBcIlllci5cIn19XVxufTtcblxubW9kdWxlLmV4cG9ydHMucmVwb3J0ZXJzID0gcmVwb3J0ZXJzOyIsInZhciBfID0gcmVxdWlyZSgndW5kZXJzY29yZScpO1xuXG5XYWx2ZXJpbmVDaXRhdGlvbiA9IGZ1bmN0aW9uKHZvbHVtZSwgcmVwb3J0ZXIsIHBhZ2UpIHtcbiAgICAvKlxuICAgICAqIENvbnZlbmllbmNlIGNsYXNzIHdoaWNoIHJlcHJlc2VudHMgYSBzaW5nbGUgY2l0YXRpb24gZm91bmQgaW4gYSBkb2N1bWVudC5cbiAgICAgKi9cbiAgICBcbiAgICAvLyBOb3RlOiBJdCB3aWxsIGJlIHRlbXB0aW5nIHRvIHJlc29sdmUgcmVwb3J0ZXIgdmFyaWF0aW9ucyBpbiB0aGUgX19pbml0X18gZnVuY3Rpb24sIGJ1dCwgYWxhcywgeW91IGNhbm5vdCxcbiAgICAvLyAgICAgICBiZWNhdXNlIG9mdGVuIHJlcG9ydGVyIHZhcmlhdGlvbnMgcmVmZXIgdG8gb25lIG9mIHNldmVyYWwgcmVwb3J0ZXJzIChlLmcuIFAuUi4gY291bGQgYmUgYSB2YXJpYW50IG9mXG4gICAgLy8gICAgICAgZWl0aGVyIFsnUGVuLiAmIFcuJywgJ1AuUi5SLicsICdQLiddKS5cbiAgICB0aGlzLnZvbHVtZSA9IHZvbHVtZTtcbiAgICB0aGlzLnJlcG9ydGVyID0gcmVwb3J0ZXI7XG4gICAgdGhpcy5wYWdlID0gcGFnZTtcbiAgICB0aGlzLmxvb2t1cF9pbmRleCA9IG51bGw7XG4gICAgdGhpcy5jYW5vbmljYWxfcmVwb3J0ZXIgPSBudWxsO1xuICAgIHRoaXMuZXh0cmEgPSBudWxsO1xuICAgIHRoaXMuZGVmZW5kYW50ID0gbnVsbDtcbiAgICB0aGlzLnBsYWludGlmZiA9IG51bGw7XG4gICAgdGhpcy5jb3VydCA9IG51bGw7XG4gICAgdGhpcy55ZWFyID0gbnVsbDtcbiAgICB0aGlzLm1sel9qdXJpc2RpY3Rpb24gPSBudWxsO1xuICAgIHRoaXMubWF0Y2hfdXJsID0gbnVsbDtcbiAgICB0aGlzLmVuZF9pZHggPSBudWxsO1xuICAgIHRoaXMuY2VydF9vcmRlciA9IG51bGw7XG4gICAgdGhpcy5kaXNwb3NpdGlvbiA9IG51bGw7XG4gICAgdGhpcy5jaXRlX3R5cGU7XG4gICAgdGhpcy5tYXRjaDtcbn1cblxuV2FsdmVyaW5lQ2l0YXRpb24ucHJvdG90eXBlLmJhc2VfY2l0YXRpb24gPSBmdW5jdGlvbiAoKSB7XG4gICAgLy8gVGhlIENvbW1vbndlYWx0aCBqdXJpc2RpY3Rpb25zIGhhdmUgY2l0ZXMgbGlrZSBcIlNtaXRoIHYuIEpvbmVzIFsyMDA3XSBITCAxMjNcIi5cbiAgICB2YXIgdm9sdW1lID0gdGhpcy52b2x1bWUgPyB0aGlzLnZvbHVtZSArIFwiIFwiIDogXCJcIlxuICAgIHJldHVybiB2b2x1bWUgKyB0aGlzLnJlcG9ydGVyICsgXCIgXCIgKyB0aGlzLnBhZ2U7XG59XG5cbldhbHZlcmluZUNpdGF0aW9uLnByb3RvdHlwZS5hc19yZWdleCA9IGZ1bmN0aW9uICgpIHtcbiAgICAvLyBTaG91bGQgaW5jbHVkZSB0aGUgeWVhciwgaWYgbm8gdm9sdW1lIGFuZCB5ZWFyIGlzIGEgcHJlZml4XG4gICAgLy8gRm9ybSB3b3VsZCBiZSBzb21ldGhpbmcgbGlrZTogXCJbXFxbXFwoXTx5ZWFyPltcXF1cXCldXFxzKzxyZXBvcnRlcj5cXHMrPHBhZ2U+XCJcbiAgICB2YXIgdm9sdW1lID0gdGhpcy52b2x1bWUgPyB0aGlzLnZvbHVtZSArIFwiKFxccyspXCIgOiBcIlwiXG4gICAgdmFyIHJldCA9IG5ldyBSZWdFeHAodm9sdW1lICsgdGhpcy5yZXBvcnRlciArIFwiKFxccyspXCIgKyB0aGlzLnBhZ2UpO1xufVxuXG5XYWx2ZXJpbmVDaXRhdGlvbi5wcm90b3R5cGUuYXNfaHRtbCA9IGZ1bmN0aW9uICgpIHtcbiAgICAvLyBBcyBhYm92ZSwgc2hvdWxkIGluY2x1ZGUgeWVhciBpZiBpdCBzZXJ2ZXMgYXMgYSB2b2x1bWUgbnVtYmVyIGZvciB0aGlzIGp1cmlzZGljdGlvblxuICAgIHZhciB2b2x1bWUgPSB0aGlzLnZvbHVtZSA/ICc8c3BhbiBjbGFzcz1cInZvbHVtZVwiPicgKyB0aGlzLnZvbHVtZSArICc8L3NwYW4+JyA6IFwiXCJcbiAgICB2YXIgaW5uZXJfaHRtbCA9IHZvbHVtZVxuICAgICAgICArICc8c3BhbiBjbGFzcz1cInJlcG9ydGVyXCI+JyArIHRoaXMucmVwb3J0ZXIgKyAnPC9zcGFuPidcbiAgICAgICAgKyAnPHNwYW4gY2xhc3M9XCJwYWdlXCI+JyArIHRoaXMucGFnZSArICc8L3NwYW4+JztcbiAgICB2YXIgc3Bhbl9jbGFzcyA9IFwiY2l0YXRpb25cIjtcbiAgICBpZiAodGhpcy5tYXRjaF91cmwpIHtcbiAgICAgICAgaW5uZXJfaHRtbCA9ICc8YSBocmVmPVwiJyArIHRoaXMubWF0Y2hfdXJsICsgJ1wiPicgKyBpbm5lcl9odG1sICsgJzwvYT4nO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHNwYW5fY2xhc3MgKz0gXCIgbm8tbGlua1wiO1xuICAgIH1cbiAgICByZXR1cm4gJzxzcGFuIGNsYXNzPVwiJyArIHNwYW5fY2xhc3MgKyAnXCI+JyArIGlubmVyX2h0bWwgKyAnPC9zcGFuPidcbn1cbnZhciBXYWx2ZXJpbmUgPSB7XG4gICAgYnVpbGRlcnM6IHt9LFxuICAgIGNvbnN0YW50czoge30sXG4gICAgdXRpbHM6IHt9LFxuICAgIGJ1ZmZlcjogMFxufTtcblxuV2FsdmVyaW5lLmNvbnN0YW50cy5GT1JXQVJEX1NFRUsgPSAyMDtcbldhbHZlcmluZS5jb25zdGFudHMuQkFDS1dBUkRfU0VFSyA9IDEyMDtcblxuLy8gdGhpcyBjb3VsZCBiZSBpbXByb3ZlZFxudmFyIHJlcG9ydGVycyA9IHJlcXVpcmUoJy4vcmVwb3J0ZXJzJykucmVwb3J0ZXJzO1xuXG5XYWx2ZXJpbmUuY29uc3RhbnRzLlJFUE9SVEVSUyA9IHJlcG9ydGVycztcbldhbHZlcmluZS5jb25zdGFudHMuSlVSSVNESUNUSU9OUyA9IHtcbiAgICAndXM7Y3QnOlsnQ29ubmVjdGljdXQnLFwiQ29ubi5cIl0sXG4gICAgJ3VzO2RlJzpbJ0RlbGF3YXJlJyxcIkRlbC5cIl0sXG4gICAgJ3VzO2RjJzpbJ0Rpc3RyaWN0IG9mIENvbHVtYmlhJyxcIkQuQy5cIiwgXCJEQ1wiXSxcbiAgICAndXM7bWUnOlsnTWFpbmUnLFwiTWUuXCJdLFxuICAgICd1cztuaCc6WydOZXcgSGFtcHNoaXJlJyxcIk4uSC5cIl0sXG4gICAgJ3VzO25qJzpbJ05ldyBKZXJzZXknLFwiTi5KLlwiXSxcbiAgICAndXM7cGEnOlsnUGVubnN5bHZhbmlhJyxcIlBlbm4uXCJdLFxuICAgICd1cztyaSc6WydSaG9kZSBJc2xhbmQnLFwiUi5JLlwiXSxcbiAgICAndXM7dnQnOlsnVmVybW9udCcsXCJWdC5cIl0sXG4gICAgJ3VzO2lsJzpbJ0lsbGlub2lzJyxcIklsbC5cIl0sXG4gICAgJ3VzO2luJzpbJ0luZGlhbmEnLFwiSW5kLlwiXSxcbiAgICAndXM7bWEnOlsnTWFzc2FjaHVzc2V0dHMnLFwiTWFzcy5cIl0sXG4gICAgJ3VzO21kJzpbJ01hcnlsYW5kJyxcIk1kLlwiXSxcbiAgICAndXM7bnknOlsnTmV3IFlvcmsnLFwiTi5ZLlwiXSxcbiAgICAndXM7b2gnOlsnT2hpbyddLFxuICAgICd1cztpYSc6WydJb3dhJ10sXG4gICAgJ3VzO21pJzpbJ01pY2hpZ2FuJyxcIk1pY2guXCJdLFxuICAgICd1czttbic6WydNaW5uaXNvdGEnLFwiTWlubi5cIl0sXG4gICAgJ3VzO25lJzpbJ05lYnJhc2thJyxcIk5lYi5cIl0sXG4gICAgJ3VzO25kJzpbJ05vcnRoIERha290YSddLFxuICAgICd1cztzZCc6WydTb3V0aCBEYWtvdGEnXSxcbiAgICAndXM7d2knOlsnV2lzY29uc2luJyxcIldpcy5cIixcIldpc2MuXCJdLFxuICAgICd1czthayc6WydBbGFza2EnLFwiQWxhLlwiXSxcbiAgICAndXM7YXonOlsnQXJpem9uYScsXCJBcml6LlwiXSxcbiAgICAndXM7Y2EnOlsnQ2FsaWZvcm5pYScsXCJDYWwuXCJdLFxuICAgICd1cztjbyc6WydDb2xvcmFkbycsXCJDby5cIl0sXG4gICAgJ3VzO2hpJzpbXCJIYXdhaSdpXCIsXCJIYXdhaWlcIl0sXG4gICAgJ3VzO2lkJzpbJ0lkYWhvJ10sXG4gICAgJ3VzO2tzJzpbJ0thbnNhcycsXCJLYW4uXCJdLFxuICAgICd1czttdCc6WydNb250YW5hJyxcIk1vbi5cIixcIk1vbnQuXCJdLFxuICAgICd1cztudic6WydOZXZhZGEnLFwiTmV2LlwiXSxcbiAgICAndXM7bm0nOlsnTmV3IE1leGljbycsXCJOLk0uXCJdLFxuICAgICd1cztvayc6WydPa2xhaG9tYScsXCJPay5cIl0sXG4gICAgJ3VzO29yJzpbJ09yZWdvbicsXCJPci5cIl0sXG4gICAgJ3VzO3V0JzpbJ1V0YWgnXSxcbiAgICAndXM7d2EnOlsnV2FzaGluZ3RvbicsXCJXYS5cIixcIldhc2guXCJdLFxuICAgICd1czt3eSc6WydXeW9taW5nJyxcIld5LlwiLFwiV3lvLlwiXSxcbiAgICAndXM7Z2EnOlsnR2VvcmdpYScsXCJHYS5cIl0sXG4gICAgJ3VzO25jJzpbJ05vcnRoIENhcm9saW5hJyxcIk4uQy5cIl0sXG4gICAgJ3VzO3NjJzpbJ1NvdXRoIENhcm9saW5hJyxcIlMuQy5cIl0sXG4gICAgJ3VzO3ZhJzpbJ1ZpcmdpbmlhJyxcIlZhLlwiXSxcbiAgICAndXM7d3YnOlsnV2VzdCBWaXJnaW5pYScsXCJXZXN0IFZhLlwiLFwiVy4gVmEuXCIsIFwiVy5WYS5cIl0sXG4gICAgJ3VzO2FyJzpbJ0Fya2Fuc2FzJyxcIkFyay5cIl0sXG4gICAgJ3VzO2t5JzpbJ0tlbnR1Y2t5JyxcIktlbi5cIl0sXG4gICAgJ3VzO21vJzpbJ01pc3NvdXJpJyxcIk1vLlwiXSxcbiAgICAndXM7dG4nOlsnVGVubmVzc2VlJyxcIlRlbm4uXCJdLFxuICAgICd1czt0eCc6WydUZXhhcycsXCJUZXguXCJdLFxuICAgICd1czthbCc6WydBbGFiYW1hJyxcIkFsYS5cIl0sXG4gICAgJ3VzO2ZsJzpbJ0Zsb3JpZGEnLFwiRmxhLlwiXSxcbiAgICAndXM7bGEnOlsnTG91aXNpYW5hJyxcIkxhLlwiXSxcbiAgICAndXM7bXMnOlsnTWlzc2lzc2lwcGknLFwiTWlzcy5cIl0sXG4gICAgJ3VzO2ZlZGVyYWw7MS1jaXInOlsnRmlyc3QgQ2lyY3VpdCcsXCIxc3QgQ2lyLlwiLFwiMXN0IENpclwiLFwiMSBDaXIuXCIsXCJDQTFcIl0sXG4gICAgJ3VzO2ZlZGVyYWw7Mi1jaXInOlsnU2Vjb25kIENpcmN1aXQnLFwiMm5kIENpci5cIixcIjJkIENpclwiLFwiMiBDaXIuXCIsXCJDQTJcIl0sXG4gICAgJ3VzO2ZlZGVyYWw7My1jaXInOlsnVGhpcmQgQ2lyY3VpdCcsXCIzcmQgQ2lyLlwiLFwiM2QgQ2lyXCIsXCIzIENpci5cIixcIkNBM1wiXSxcbiAgICAndXM7ZmVkZXJhbDs0LWNpcic6WydGb3VydGggQ2lyY3VpdCcsXCI0dGggQ2lyLlwiLFwiNHRoIENpclwiLFwiNCBDaXIuXCIsXCJDQTRcIl0sXG4gICAgJ3VzO2ZlZGVyYWw7NS1jaXInOlsnRmlmdGggQ2lyY3VpdCcsXCI1dGggQ2lyLlwiLFwiNXRoIENpclwiLFwiNSBDaXIuXCIsXCJDQTVcIl0sXG4gICAgJ3VzO2ZlZGVyYWw7Ni1jaXInOlsnU2l4dGggQ2lyY3VpdCcsXCI2dGggQ2lyLlwiLFwiNnRoIENpclwiLFwiNiBDaXIuXCIsXCJDQTZcIl0sXG4gICAgJ3VzO2ZlZGVyYWw7Ny1jaXInOlsnU2V2ZW50aCBDaXJjdWl0JyxcIjd0aCBDaXIuXCIsXCI3dGggQ2lyXCIsXCI3IENpci5cIixcIkNBN1wiXSxcbiAgICAndXM7ZmVkZXJhbDs4LWNpcic6WydFaWdodGggQ2lyY3VpdCcsXCI4dGggQ2lyLlwiLFwiOHRoIENpclwiLFwiOCBDaXIuXCIsXCJDQThcIl0sXG4gICAgJ3VzO2ZlZGVyYWw7OS1jaXInOlsnTmludGggQ2lyY3VpdCcsXCI5dGggQ2lyLlwiLFwiOXRoIENpclwiLFwiOSBDaXIuXCIsXCJDQTlcIl0sXG4gICAgJ3VzO2ZlZGVyYWw7MTAtY2lyJzpbJ1RlbnRoIENpcmN1aXQnLFwiMTB0aCBDaXIuXCIsXCIxMHRoIENpclwiLFwiMTAgQ2lyLlwiLFwiQ0ExMFwiXSxcbiAgICAndXM7ZmVkZXJhbDsxMS1jaXInOlsnRWxldmVudGggQ2lyY3VpdCcsXCIxMXRoIENpci5cIixcIjExdGggQ2lyXCIsXCIxMSBDaXIuXCIsXCJDQTExXCJdXG59O1xuV2FsdmVyaW5lLmNvbnN0YW50cy5BQ0NFUFRfVE9LRU5TID0gW1xuICAgICdJbiBSZScsXG4gICAgJ0luIHJlJyxcbiAgICAnRXggcGFydGUnLFxuICAgICdFeCBQYXJ0ZSdcbl07XG5cbldhbHZlcmluZS5jb25zdGFudHMuU1RSSU5HX1RPS0VOUyA9IFtcbiAgICAnY2VydGlvcmFyaSBkZW5pZWQnLFxuICAgICdjZXJ0LiBkZW5pZWQnLFxuICAgICdkZW5pZWQnLFxuICAgIFwiYWZmJ2RcIixcbiAgICBcImFmZlxcdTIwMTlkXCIsXG4gICAgJ2FmZmlybWVkJyxcbiAgICAncmVtYW5kZWQnLFxuICAgICdjZXJ0aW9yYXJpIGdyYW50ZWQnLFxuICAgICdjZXJ0LiBncmFudGVkJyxcbiAgICAnZ3JhbnRlZCcsXG4gICAgJ2Rpc21pc3NlZCcsXG4gICAgJ29waW5pb24nLFxuICAgICdkaXNtaXNzZWQgYnknLFxuICAgICdtb2RpZmllZCBieScsXG4gICAgJ2FtZW5kZWQgYnknLFxuICAgICdhZmZpcm1lZCBieScsXG4gICAgXCJhZmYnZCBieVwiLFxuICAgICdhZmZcXHUyMDE5ZCBieScsXG4gICAgJ3ZhY2F0ZWQgaW4nLFxuICAgICd2YWNhdGVkIGJ5J1xuXTtcblxuV2FsdmVyaW5lLmNvbnN0YW50cy5FTUJFRERFRF9UT0tFTlMgPSBbXG4gICAgXCJvZiB0aGVcIixcbiAgICBcIm9uIHRoZVwiLFxuICAgIFwiZXggcmVsXCIsXG4gICAgXCJldCBhbFwiLFxuICAgIFwiZXQgYWwuXCIsXG4gICAgXCJbTm5dby4/ICtbMC05XStcIixcbiAgICBcInRvXCJcbl07XG5cbldhbHZlcmluZS5jb25zdGFudHMuUFJFUE9TSVRJT05TID0gW1xuICAgIFwiY2l0aW5nXCIsXG4gICAgXCJpblwiLFxuICAgIFwiZm9yXCIsXG4gICAgXCJmcm9tXCIsXG4gICAgXCJ3aXRoXCIsXG4gICAgXCJvdmVyXCIsXG4gICAgXCJ0aGFuXCIsXG4gICAgXCJieVwiLFxuICAgIFwiQWN0LlwiXG5dO1xuV2FsdmVyaW5lLmJ1aWxkZXJzLm1ha2VfdmFyaWFudF9rZXkgPSBmdW5jdGlvbiAoa2V5KSB7XG4gICAga2V5ID0ga2V5LnJlcGxhY2UoXCIuXCIsIFwiIFwiLCBcImdcIik7XG4gICAga2V5ID0ga2V5LnJlcGxhY2UoL1xccysvZywgXCIgXCIpO1xuICAgIGtleSA9IFwiIFwiICsga2V5ICsgXCIgXCI7XG4gICAga2V5ID0ga2V5LnJlcGxhY2UoLyhbXmEtekEtWl0pKFtBLVpdKVxccysoW0EtWl0pKFteQS1aYS16XSkvZywgXCIkMSQyJDMkNFwiKTtcbiAgICBrZXkgPSBrZXkucmVwbGFjZSgvXFxzKyhbXFxdXFwpXSkvZywgXCIkMVwiKTtcbiAgICBrZXkgPSBrZXkucmVwbGFjZSgvXlxccysvLCBcIlwiKS5yZXBsYWNlKC9cXHMrJC8sIFwiXCIpO1xuICAgIHJldHVybiBrZXk7XG59O1xuXG5XYWx2ZXJpbmUuYnVpbGRlcnMubWFrZV92YXJpYW50cyA9IGZ1bmN0aW9uIChSRVBPUlRFUlMpIHtcbiAgICBmb3IgKHZhciBjYW5vbmljYWxfa2V5IGluIFJFUE9SVEVSUykge1xuICAgICAgICB2YXIgY2Fub25pY2FsX3NlZ21lbnQgPSBSRVBPUlRFUlNbY2Fub25pY2FsX2tleV07XG4gICAgICAgIGZvciAodmFyIGk9MCxpbGVuPWNhbm9uaWNhbF9zZWdtZW50Lmxlbmd0aDtpPGlsZW47aSs9MSkge1xuICAgICAgICAgICAgdmFyIGNsYXNzX2VudHJ5ID0gY2Fub25pY2FsX3NlZ21lbnRbaV07XG4gICAgICAgICAgICB2YXIgbmV3dmFycyA9IHt9O1xuICAgICAgICAgICAgZm9yICh2YXIga2V5IGluIGNsYXNzX2VudHJ5LmVkaXRpb25zKSB7XG4gICAgICAgICAgICAgICAgdmFyIG52ayA9IHRoaXMubWFrZV92YXJpYW50X2tleShrZXkpO1xuICAgICAgICAgICAgICAgIGlmICghY2xhc3NfZW50cnkuZWRpdGlvbnNbbnZrXSBcbiAgICAgICAgICAgICAgICAgICAgJiYgIWNsYXNzX2VudHJ5LnZhcmlhdGlvbnNbbnZrXVxuICAgICAgICAgICAgICAgICAgICAmJiAhbmV3dmFyc1tudmtdKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgbmV3dmFyc1tudmtdID0ga2V5O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvciAodmFyIGtleSBpbiBjbGFzc19lbnRyeS52YXJpYXRpb25zKSB7XG4gICAgICAgICAgICAgICAgdmFyIG52ayA9IHRoaXMubWFrZV92YXJpYW50X2tleShrZXkpO1xuICAgICAgICAgICAgICAgIGlmICghY2xhc3NfZW50cnkuZWRpdGlvbnNbbnZrXSBcbiAgICAgICAgICAgICAgICAgICAgJiYgIWNsYXNzX2VudHJ5LnZhcmlhdGlvbnNbbnZrXVxuICAgICAgICAgICAgICAgICAgICAmJiAhbmV3dmFyc1tudmtdKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgbmV3dmFyc1tudmtdID0gY2xhc3NfZW50cnkudmFyaWF0aW9uc1trZXldO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvciAodmFyIG52ayBpbiBuZXd2YXJzKSB7XG4gICAgICAgICAgICAgICAgY2xhc3NfZW50cnkudmFyaWF0aW9uc1tudmtdID0gbmV3dmFyc1tudmtdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufTtcbiAgICBcbldhbHZlcmluZS5idWlsZGVycy5tYWtlX3ZhcmlhbnRzKFdhbHZlcmluZS5jb25zdGFudHMuUkVQT1JURVJTKTtcbldhbHZlcmluZS5idWlsZGVycy5zdWNrX291dF92YXJpYXRpb25zX29ubHkgPSBmdW5jdGlvbiAoUkVQT1JURVJTKSB7XG4gICAgLypcbiAgICAgKiAgQnVpbGRzIGEgZGljdGlvbmFyeSBvZiB2YXJpYXRpb25zIHRvIGNhbm9uaWNhbCByZXBvcnRlcnMuXG4gICAgICpcbiAgICAgKiAgVGhlIGRpY3Rpb25hcnkgdGFrZXMgdGhlIGZvcm0gb2Y6XG4gICAgICogICAgICB7XG4gICAgICogICAgICAgJ0EuIDJkJzogWydBLjJkJ10sXG4gICAgICogICAgICAgLi4uXG4gICAgICogICAgICAgJ1AuUi4nOiBbJ1Blbi4gJiBXLicsICdQLlIuUi4nLCAnUC4nXSxcbiAgICAgKiAgICAgIH1cbiAgICAgKlxuICAgICAqICBJbiBvdGhlciB3b3JkcywgaXQncyBhIGRpY3Rpb25hcnkgdGhhdCBtYXBzIGVhY2ggdmFyaWF0aW9uIHRvIGEgbGlzdCBvZlxuICAgICAqICByZXBvcnRlcnMgdGhhdCBpdCBjb3VsZCBiZSBwb3NzaWJseSByZWZlcnJpbmcgdG8uXG4gICAgICovXG4gICAgdmFyIHZhcmlhdGlvbnNfb3V0ID0ge307XG4gICAgZm9yICh2YXIgcmVwb3J0ZXJfa2V5IGluIFJFUE9SVEVSUykge1xuICAgICAgICAvLyBGb3IgZWFjaCByZXBvcnRlciBrZXkgLi4uXG4gICAgICAgIHZhciBkYXRhX2xpc3QgPSBSRVBPUlRFUlNbcmVwb3J0ZXJfa2V5XTtcbiAgICAgICAgZm9yICh2YXIgaT0wLGlsZW49ZGF0YV9saXN0Lmxlbmd0aDtpPGlsZW47aSs9MSkge1xuICAgICAgICAgICAgZGF0YSA9IGRhdGFfbGlzdFtpXTtcbiAgICAgICAgICAgIC8vIEZvciBlYWNoIGJvb2sgaXQgbWFwcyB0by4uLlxuICAgICAgICAgICAgZm9yICh2YXIgdmFyaWF0aW9uX2tleSBpbiBkYXRhLnZhcmlhdGlvbnMpIHtcbiAgICAgICAgICAgICAgICB2YXIgdmFyaWF0aW9uX3ZhbHVlID0gZGF0YS52YXJpYXRpb25zW3ZhcmlhdGlvbl9rZXldO1xuICAgICAgICAgICAgICAgIGlmIChcInVuZGVmaW5lZFwiICE9PSB0eXBlb2YgdmFyaWF0aW9uc19vdXRbdmFyaWF0aW9uX2tleV0pIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHZhcmlhdGlvbnNfbGlzdCA9IHZhcmlhdGlvbnNfb3V0W3ZhcmlhdGlvbl9rZXldO1xuICAgICAgICAgICAgICAgICAgICBpZiAodmFyaWF0aW9uc19saXN0LmluZGV4T2YodmFyaWF0aW9uX3ZhbHVlKSA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhcmlhdGlvbnNfbGlzdC5wdXNoKHZhcmlhdGlvbl92YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBUaGUgaXRlbSB3YXNuJ3QgdGhlcmU7IGFkZCBpdC5cbiAgICAgICAgICAgICAgICAgICAgdmFyaWF0aW9uc19vdXRbdmFyaWF0aW9uX2tleV0gPSBbdmFyaWF0aW9uX3ZhbHVlXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHZhcmlhdGlvbnNfb3V0O1xufVxuXG5XYWx2ZXJpbmUuY29uc3RhbnRzLlZBUklBVElPTlNfT05MWSA9IFdhbHZlcmluZS5idWlsZGVycy5zdWNrX291dF92YXJpYXRpb25zX29ubHkoV2FsdmVyaW5lLmNvbnN0YW50cy5SRVBPUlRFUlMpO1xuV2FsdmVyaW5lLmJ1aWxkZXJzLnN1Y2tfb3V0X2NvdXJ0cyA9IGZ1bmN0aW9uKEpVUklTRElDVElPTlMpIHtcbiAgICB2YXIgQ09VUlRTID0ge307XG4gICAgZm9yICh2YXIga2V5IGluIEpVUklTRElDVElPTlMpIHtcbiAgICAgICAgZm9yICh2YXIgaT0wLGlsZW49SlVSSVNESUNUSU9OU1trZXldLmxlbmd0aDtpPGlsZW47aSs9MSkge1xuICAgICAgICAgICAgdmFyIGNvdXJ0ID0gSlVSSVNESUNUSU9OU1trZXldW2ldO1xuICAgICAgICAgICAgQ09VUlRTW2NvdXJ0XSA9IHRydWU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIENPVVJUUztcbn1cblxuV2FsdmVyaW5lLmNvbnN0YW50cy5DT1VSVFMgPSBXYWx2ZXJpbmUuYnVpbGRlcnMuc3Vja19vdXRfY291cnRzKFdhbHZlcmluZS5jb25zdGFudHMuSlVSSVNESUNUSU9OUyk7XG5XYWx2ZXJpbmUuYnVpbGRlcnMuc3Vja19vdXRfbmV1dHJhbHMgPSBmdW5jdGlvbiAoUkVQT1JURVJTKSB7XG4gICAgLypcbiAgICAgKiAgQnVpbGRzIGEgc21hbGwgZGljdGlvbmFyeSBvZiBuZXV0cmFsIHJlcG9ydGVyIGtleXNcbiAgICAgKlxuICAgICAqICBUaGUgZGljdGlvbmFyeSB0YWtlcyB0aGUgZm9ybSBvZjpcbiAgICAgKiAgICAgIHtcbiAgICAgKiAgICAgICAnQVonOiB0cnVlLFxuICAgICAqICAgICAgIC4uLlxuICAgICAqICAgICAgICdPSyc6IHRydWVcbiAgICAgKiAgICAgIH1cbiAgICAgKlxuICAgICAqL1xuICAgIHZhciBuZXV0cmFscyA9IHt9O1xuICAgIGZvciAodmFyIHJlcG9ydGVyX2tleSBpbiBSRVBPUlRFUlMpIHtcbiAgICAgICAgLy8gRm9yIGVhY2ggcmVwb3J0ZXIga2V5IC4uLlxuICAgICAgICB2YXIgZGF0YV9saXN0ID0gUkVQT1JURVJTW3JlcG9ydGVyX2tleV07XG4gICAgICAgIGZvciAodmFyIGk9MCxpbGVuPWRhdGFfbGlzdC5sZW5ndGg7aTxpbGVuO2krPTEpIHtcbiAgICAgICAgICAgIGRhdGEgPSBkYXRhX2xpc3RbaV07XG4gICAgICAgICAgICAvLyBGb3IgZWFjaCBib29rIGl0IG1hcHMgdG8uLi5cbiAgICAgICAgICAgIGlmIChkYXRhLmNpdGVfdHlwZSA9PT0gXCJuZXV0cmFsXCIpIHtcbiAgICAgICAgICAgICAgICAvLyBTbyBmYXIsIGF0IGxlYXN0LCBuZXV0cmFscyBhbmQgdGhlaXIgdmFyaWF0aW9ucyBhcmUgdW5hbWJpZ3VvdXMuXG4gICAgICAgICAgICAgICAgZm9yICh2YXIga2V5IGluIGRhdGEuZWRpdGlvbnMpIHtcbiAgICAgICAgICAgICAgICAgICAgbmV1dHJhbHNba2V5XSA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGZvciAodmFyIGtleSBpbiBkYXRhLnZhcmlhdGlvbnMpIHtcbiAgICAgICAgICAgICAgICAgICAgbmV1dHJhbHNba2V5XSA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBuZXV0cmFscztcbn1cblxuV2FsdmVyaW5lLmNvbnN0YW50cy5ORVVUUkFMUyA9IFdhbHZlcmluZS5idWlsZGVycy5zdWNrX291dF9uZXV0cmFscyhXYWx2ZXJpbmUuY29uc3RhbnRzLlJFUE9SVEVSUyk7XG5XYWx2ZXJpbmUuYnVpbGRlcnMuc3Vja19vdXRfZWRpdGlvbnMgPSBmdW5jdGlvbihSRVBPUlRFUlMpIHtcbiAgICAvKlxuICAgICAqICBCdWlsZHMgYSBkaWN0aW9uYXJ5IG1hcHBpbmcgZWRpdGlvbiBrZXlzIHRvIHRoZWlyIHJvb3QgbmFtZS5cbiAgICAgKlxuICAgICAqICBUaGUgZGljdGlvbmFyeSB0YWtlcyB0aGUgZm9ybSBvZjpcbiAgICAgKiAgICAgIHtcbiAgICAgKiAgICAgICAnQS4nOiAgICdBLicsXG4gICAgICogICAgICAgJ0EuMmQnOiAnQS4nLFxuICAgICAqICAgICAgICdBLjNkJzogJ0EuJyxcbiAgICAgKiAgICAgICAnQS5ELic6ICdBLkQuJyxcbiAgICAgKiAgICAgICAuLi5cbiAgICAgKiAgICAgIH1cblxuICAgICAqICBJbiBvdGhlciB3b3JkcywgdGhpcyBsZXRzIHlvdSBnbyBmcm9tIGFuIGVkaXRpb24gbWF0Y2ggdG8gaXRzIHBhcmVudCBrZXkuXG4gICAgICovXG4gICAgdmFyIGVkaXRpb25zX291dCA9IHt9O1xuICAgIGZvciAodmFyIHJlcG9ydGVyX2tleSBpbiBSRVBPUlRFUlMpIHtcbiAgICAgICAgLy8gRm9yIGVhY2ggcmVwb3J0ZXIga2V5IC4uLlxuICAgICAgICB2YXIgZGF0YV9saXN0ID0gUkVQT1JURVJTW3JlcG9ydGVyX2tleV07XG4gICAgICAgIGZvciAodmFyIGk9MCxpbGVuPWRhdGFfbGlzdC5sZW5ndGg7aTxpbGVuO2krPTEpIHtcbiAgICAgICAgICAgIHZhciBkYXRhID0gZGF0YV9saXN0W2ldO1xuICAgICAgICAgICAgZm9yICh2YXIgZWRpdGlvbl9rZXkgaW4gZGF0YS5lZGl0aW9ucykge1xuICAgICAgICAgICAgICAgIC8vIEZvciBlYWNoIGJvb2sgaXQgbWFwcyB0by4uLlxuICAgICAgICAgICAgICAgIHZhciBlZGl0aW9uX3ZhbHVlID0gZGF0YS5lZGl0aW9uc1tlZGl0aW9uX3ZhbHVlXTtcbiAgICAgICAgICAgICAgICBpZiAoXCJ1bmRlZmluZWRcIiA9PT0gdHlwZW9mIGVkaXRpb25zX291dFtlZGl0aW9uX2tleV0pIHtcbiAgICAgICAgICAgICAgICAgICAgZWRpdGlvbnNfb3V0W2VkaXRpb25fa2V5XSA9IHJlcG9ydGVyX2tleTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGVkaXRpb25zX291dDtcbn1cblxuV2FsdmVyaW5lLmNvbnN0YW50cy5FRElUSU9OUyA9IFdhbHZlcmluZS5idWlsZGVycy5zdWNrX291dF9lZGl0aW9ucyhXYWx2ZXJpbmUuY29uc3RhbnRzLlJFUE9SVEVSUyk7XG4vLyBXZSBuZWVkIHRvIGJ1aWxkIGEgUkVHRVggdGhhdCBoYXMgYWxsIHRoZSB2YXJpYXRpb25zIGFuZCB0aGUgcmVwb3J0ZXJzIGluXyBvcmRlciBmcm9tIGxvbmdlc3QgdG8gc2hvcnRlc3QuXG5cbldhbHZlcmluZS5idWlsZGVycy5tYWtlX3JlZ2V4ID0gZnVuY3Rpb24gKGNvbnN0YW50cykge1xuICAgIHZhciBFRElUSU9OUyA9IGNvbnN0YW50cy5FRElUSU9OUztcbiAgICB2YXIgVkFSSUFUSU9OU19PTkxZID0gY29uc3RhbnRzLlZBUklBVElPTlNfT05MWTtcbiAgICB2YXIgQUNDRVBUX1RPS0VOUyA9IGNvbnN0YW50cy5BQ0NFUFRfVE9LRU5TO1xuICAgIHZhciBFTUJFRERFRF9UT0tFTlMgPSBjb25zdGFudHMuRU1CRURERURfVE9LRU5TO1xuICAgIHZhciBTVFJJTkdfVE9LRU5TID0gY29uc3RhbnRzLlNUUklOR19UT0tFTlM7XG5cbiAgICAvL3ZhciBSRUdFWF9MSVNUID0gW2tleSBmb3IgKGtleSBpbiBFRElUSU9OUyldLmNvbmNhdChba2V5IGZvciAoa2V5IGluIFZBUklBVElPTlNfT05MWSldKTtcblxuICAgIHZhciBSRUdFWF9MSVNUID0gXy5rZXlzKEVESVRJT05TKS5jb25jYXQoXy5rZXlzKFZBUklBVElPTlNfT05MWSkpO1xuXG4gICAgLypcbiAgICBSRUdFWF9MSVNUID0gUkVHRVhfTElTVFxuICAgICAgICAuY29uY2F0KFtBQ0NFUFRfVE9LRU5TW2ldIGZvciAoaSBpbiBBQ0NFUFRfVE9LRU5TKV0pXG4gICAgICAgIC5jb25jYXQoW0VNQkVEREVEX1RPS0VOU1tpXSBmb3IgKGkgaW4gRU1CRURERURfVE9LRU5TKV0pXG4gICAgICAgIC5jb25jYXQoW1NUUklOR19UT0tFTlNbaV0gZm9yIChpIGluIFNUUklOR19UT0tFTlMpXSk7XG4gICAgKi9cblxuICAgIFJFR0VYX0xJU1QgPSBSRUdFWF9MSVNULmNvbmNhdChBQ0NFUFRfVE9LRU5TKTtcbiAgICBSRUdFWF9MSVNUID0gUkVHRVhfTElTVC5jb25jYXQoRU1CRURERURfVE9LRU5TKTtcbiAgICBSRUdFWF9MSVNUID0gUkVHRVhfTElTVC5jb25jYXQoU1RSSU5HX1RPS0VOUyk7XG5cbiAgICBmb3IgKHZhciBpPTAsaWxlbj1SRUdFWF9MSVNULmxlbmd0aDtpPGlsZW47aSs9MSkge1xuICAgICAgICBpZiAoUkVHRVhfTElTVFtpXS5zbGljZSgtMSkgIT09IFwiLlwiICYmIFJFR0VYX0xJU1RbaV0uc2xpY2UoLTEpICE9PSBcIiBcIikge1xuICAgICAgICAgICAgLy8gUHJldmVudCBtaWQtd29yZCBtYXRjaGVzXG4gICAgICAgICAgICBSRUdFWF9MSVNUW2ldID0gXCIgXCIgICsgUkVHRVhfTElTVFtpXSArIFwiIFwiO1xuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIFJFR0VYX0xJU1Quc29ydChcbiAgICAgICAgZnVuY3Rpb24gKGEsYikge1xuICAgICAgICAgICAgaWYgKGEubGVuZ3RoIDwgYi5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoYS5sZW5ndGggPiBiLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHJldHVybiAtMTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICApO1xuICAgIC8qXG4gICAgdmFyIFJFR0VYX1NUUiA9IFtSRUdFWF9MSVNUW2ldLnJlcGxhY2UoXCIuXCIsXCJcXFxcLlwiLFwiZ1wiKS5yZXBsYWNlKFwiKFwiLFwiXFxcXChcIixcImdcIikucmVwbGFjZShcIilcIixcIlxcXFwpXCIsXCJnXCIpLnJlcGxhY2UoXCJcXCdcIiwgXCJcXFxcJ1wiLFwiZ1wiKSBmb3IgKGkgaW4gUkVHRVhfTElTVCldLmpvaW4oXCJ8XCIpO1xuXG4gICAgdmFyIFJFR0VYX1NUUiA9IFtSRUdFWF9MSVNUW2ldXG4gICAgICAgICAgICAgICAgICAgICAucmVwbGFjZShcIi5cIixcIlxcXFwuXCIsXCJnXCIpXG4gICAgICAgICAgICAgICAgICAgICAucmVwbGFjZShcIihcIixcIlxcXFwoXCIsXCJnXCIpXG4gICAgICAgICAgICAgICAgICAgICAucmVwbGFjZShcIilcIixcIlxcXFwpXCIsXCJnXCIpXG4gICAgICAgICAgICAgICAgICAgICAucmVwbGFjZShcIlxcJ1wiLCBcIlxcXFwnXCIsXCJnXCIpIGZvciAoaSBpbiBSRUdFWF9MSVNUKV0uam9pbihcInxcIik7XG5cbiAgICAqL1xuICAgIHZhciBSRUdFWF9TVFIgPSBfLm1hcChSRUdFWF9MSVNULCBmdW5jdGlvbihpKSB7XG4gICAgICByZXR1cm4gaS5yZXBsYWNlKFwiLlwiLFwiXFxcXC5cIixcImdcIikucmVwbGFjZShcIihcIixcIlxcXFwoXCIsXCJnXCIpLnJlcGxhY2UoXCIpXCIsXCJcXFxcKVwiLFwiZ1wiKS5yZXBsYWNlKFwiXFwnXCIsIFwiXFxcXCdcIixcImdcIik7XG4gICAgfSkuam9pbihcInxcIik7XG5cbiAgICBjb25zdGFudHMuUkVQT1JURVJfUkUgPSBuZXcgUmVnRXhwKFwiKFwiICsgUkVHRVhfU1RSICsgXCIpXCIpO1xuXG5cbn1cblxuV2FsdmVyaW5lLmJ1aWxkZXJzLm1ha2VfcmVnZXgoV2FsdmVyaW5lLmNvbnN0YW50cyk7XG5XYWx2ZXJpbmUudXRpbHMuc3RyaXBfcHVuY3QgPSBmdW5jdGlvbiAodGV4dCkge1xuICAgIC8vc3RhcnRpbmcgcXVvdGVzXG4gICAgdGV4dCA9IHRleHQucmVwbGFjZSgvXlxcXCIvZywgXCJcIik7XG4gICAgdGV4dCA9IHRleHQucmVwbGFjZSgvKGBgKS9nLCBcIlwiKTtcbiAgICB0ZXh0ID0gdGV4dC5yZXBsYWNlKC8oWyAoXFxbezxdKVwiL2csICcnKVxuXG4gICAgLy9wdW5jdHVhdGlvblxuICAgIHRleHQgPSB0ZXh0LnJlcGxhY2UoL1xcLlxcLlxcLi9nLCAnJylcbiAgICB0ZXh0ID0gdGV4dC5yZXBsYWNlKC9bLDs6QCMkJSZdL2csICcnKVxuICAgIHRleHQgPSB0ZXh0LnJlcGxhY2UoLyhbXlxcLl0pKFxcLikoW1xcXVxcKX0+XCJcXCddKilcXHMqJC9nLCAnJDEnKVxuICAgIHRleHQgPSB0ZXh0LnJlcGxhY2UoL1s/IV0vZywgJycpXG4gICAgXG4gICAgLy8gWFhYIFdoYXQgZGlkIEkgYWRkIHRoaXMgZm9yPyBBcyB3cml0dGVuLCBpdCdzIG9ubHkgZWZmZWN0IHdpbGwgYmUgdG8gYnJlYWsgdGhpbmdzLlxuICAgIHRleHQgPSB0ZXh0LnJlcGxhY2UoLyhbXiddKScgL2csIFwiXCIpXG5cbiAgICAvL3BhcmVucywgYnJhY2tldHMsIGV0Yy5cbiAgICB0ZXh0ID0gdGV4dC5yZXBsYWNlKC9bXFxdXFxbXFwoXFwpXFx7XFx9XFw8XFw+XS9nLCAnJylcbiAgICB0ZXh0ID0gdGV4dC5yZXBsYWNlKC8tLS9nLCAnJylcbiAgICBcbiAgICAvL2VuZGluZyBxdW90ZXNcbiAgICB0ZXh0ID0gdGV4dC5yZXBsYWNlKC9cXFwiL2csIFwiXCIpXG4gICAgdGV4dCA9IHRleHQucmVwbGFjZSgvKFxcUykoXFwnXFwnKS9nLCAnJylcbiAgICBcbiAgICByZXR1cm4gdGV4dC5yZXBsYWNlKC9eXFxzKy8sIFwiXCIpLnJlcGxhY2UoL1xccyskLywgXCJcIik7XG59O1xuXG4gICAgXG5XYWx2ZXJpbmUudXRpbHMuZ2V0X3Zpc2libGVfdGV4dCA9IGZ1bmN0aW9uICh0ZXh0KSB7XG4gICAgdmFyIHRleHQgPSB0ZXh0LnJlcGxhY2UoLzwoPzpzdHlsZXxTVFlMRSlbXj5dKj4uKj88XFwvKD86c3R5bGV8U1RZTEUpPi9nLCBcIiBcIik7XG4gICAgdGV4dCA9IHRleHQucmVwbGFjZSgvPFtBYV0gW14+XSs+W14gXSs8XFwvW0FhXT4vZywgXCIgXCIpOyBcbiAgICB0ZXh0ID0gdGV4dC5yZXBsYWNlKC88W14+XSo+L2csIFwiXCIpO1xuICAgIHRleHQgPSB0ZXh0LnJlcGxhY2UoXCJcXG5cIixcIiBcIixcImdcIik7XG4gICAgdGV4dCA9IHRleHQucmVwbGFjZShcIiBcIixcIiBcIixcImdcIik7XG4gICAgcmV0dXJuIHRleHQ7XG59O1xuXG5XYWx2ZXJpbmUudXRpbHMuc2V0X2p1cmlzZGljdGlvbiA9IGZ1bmN0aW9uIChjaXRhdGlvbiwganVyaXNkaWN0aW9uKSB7XG4gICAgaWYgKCFjaXRhdGlvbi5tbHpfanVyaXNkaWN0aW9uKSB7XG4gICAgICAgIGNpdGF0aW9uLm1sel9qdXJpc2RpY3Rpb24gPSBqdXJpc2RpY3Rpb247XG4gICAgfVxufTtcblxuV2FsdmVyaW5lLnV0aWxzLmlzX2RhdGVfaW5fcmVwb3J0ZXIgPSBmdW5jdGlvbiAoZWRpdGlvbnMsIHllYXIpIHtcbiAgICAvKlxuICAgICAqICBDaGVja3Mgd2hldGhlciBhIHllYXIgZmFsbHMgd2l0aGluIHRoZSByYW5nZSBvZiAxIHRvIG4gZWRpdGlvbnMgb2YgYSByZXBvcnRlclxuICAgICAqXG4gICAgICogIEVkaXRpb25zIHdpbGwgbG9vayBzb21ldGhpbmcgbGlrZTpcbiAgICAgKiAgICAgICdlZGl0aW9ucyc6IHsnUy5FLic6IChkYXRldGltZS5kYXRlKDE4ODcsIDEsIDEpLFxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGV0aW1lLmRhdGUoMTkzOSwgMTIsIDMxKSksXG4gICAgICogICAgICAgICAgICAgICAgICAgJ1MuRS4yZCc6IChkYXRldGltZS5kYXRlKDE5MzksIDEsIDEpLFxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0ZXRpbWUuZGF0ZS50b2RheSgpKX0sXG4gICAgICovXG4gICAgZm9yICh2YXIga2V5IGluIGVkaXRpb25zKSB7XG4gICAgICAgIHZhciBzdGFydCA9IGVkaXRpb25zW2tleV1bMF07XG4gICAgICAgIHZhciBlbmQgPSBlZGl0aW9uc1trZXldWzFdO1xuICAgICAgICB2YXIgbm93ID0gbmV3IERhdGUoKTtcbiAgICAgICAgdmFyIHN0YXJ0X3llYXIgPSBzdGFydC55ZWFyID8gc3RhcnQueWVhciA6IG5vdy5nZXRGdWxsWWVhcigpO1xuICAgICAgICB2YXIgZW5kX3llYXIgPSBlbmQueWVhciA/IGVuZC55ZWFyIDogbm93LmdldEZ1bGxZZWFyKCk7XG4gICAgICAgIGlmIChzdGFydF95ZWFyIDw9IHllYXIgJiYgeWVhciA8PSBlbmRfeWVhcikge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xufTtcbldhbHZlcmluZS5nZXRfY291cnQgPSBmdW5jdGlvbiAocGFyZW5fc3RyaW5nLCB5ZWFyKSB7XG4gICAgdmFyIGNvdXJ0O1xuICAgIGlmICgheWVhcikge1xuICAgICAgICBjb3VydCA9IHBhcmVuX3N0cmluZy5yZXBsYWNlKC8oPzosXFxzKikqLFxccyokLyxcIlwiKS5yZXBsYWNlKC9eXFxzKlxcKC8sXCJcIikucmVwbGFjZSgvXFwpXFxzKiQvLFwiXCIpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciB5ZWFyX2luZGV4ID0gcGFyZW5fc3RyaW5nLmluZGV4T2YoKFwiXCIgKyB5ZWFyKSk7XG4gICAgICAgIGNvdXJ0ID0gcGFyZW5fc3RyaW5nLnNsaWNlKDAseWVhcl9pbmRleCk7XG4gICAgICAgIGNvdXJ0ID0gY291cnQucmVwbGFjZSgvXlxccypcXChcXHMqLywgXCJcIikucmVwbGFjZSgvLFxccyosXFxzKiQvLFwiXCIpO1xuICAgIH1cbiAgICBpZiAoY291cnQgPT09IFwiXCIpIHtcbiAgICAgICAgY291cnQgPSBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gY291cnQ7XG59O1xuXG5XYWx2ZXJpbmUuZ2V0X3llYXIgPSBmdW5jdGlvbiAodG9rZW4pIHtcbiAgICAvKlxuICAgICAqICBHaXZlbiBhIHN0cmluZyB0b2tlbiwgbG9vayBmb3IgYSB2YWxpZCA0LWRpZ2l0IG51bWJlciBhdCB0aGUgc3RhcnQgYW5kXG4gICAgICogIHJldHVybiBpdHMgdmFsdWUuXG4gICAgICovXG4gICAgdmFyIHN0cmlwX3B1bmN0ID0gdGhpcy51dGlscy5zdHJpcF9wdW5jdDtcblxuICAgIHZhciB5ZWFyO1xuICAgIHZhciB0b2tlbiA9IHN0cmlwX3B1bmN0KHRva2VuKTtcbiAgICB2YXIgbSA9IHRva2VuLm1hdGNoKC8uKj8oWzAtOV17NH0pLyk7XG4gICAgaWYgKG0pIHtcbiAgICAgICAgeWVhciA9IHBhcnNlSW50KG1bMV0sIDEwKTtcbiAgICAgICAgaWYgKHllYXIgPCAxNzU0KSB7XG4gICAgICAgICAgICB5ZWFyID0gbnVsbDtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4geWVhcjtcbn07XG5cbldhbHZlcmluZS5nZXRfcHJlX2NpdGF0aW9uID0gZnVuY3Rpb24gKGNpdGF0aW9uLCBjaXRhdGlvbnMsIHdvcmRzLCByZXBvcnRlcl9pbmRleCkge1xuICAgIC8vIFRoZXJlIGFyZSBGZWRlcmFsIENpcmN1aXQgZGVjaXNpb25zIHRoYXQgaGF2ZSBhIGZvcm1cbiAgICAvLyBsaWtlIHRoaXM6IFxuICAgIC8vXG4gICAgLy8gICAgIFwiU21pdGggdi4gSm9uZXMsIDJuZCBDaXIuLCAxOTU1LCAxMjMgRi4yZCA0NTZcIi5cbiAgICAvL1xuICAgIHZhciBwcmVvZmZzZXQgPSAwO1xuICAgIHZhciBwb3MgPSByZXBvcnRlcl9pbmRleCAtIDI7XG5cbiAgICB2YXIgcHJldl9pZHggPSBjaXRhdGlvbnMubGVuZ3RoID8gY2l0YXRpb25zW2NpdGF0aW9ucy5sZW5ndGggLSAxXS5lbmRfaWR4IDogMDtcbiAgICBpZiAocG9zIDwgMyB8fCBwb3MgPT0gcHJldl9pZHgpIHtcbiAgICAgICAgcmV0dXJuIHByZW9mZnNldDtcbiAgICB9XG5cbiAgICB2YXIgbSA9IHdvcmRzW3Bvc10ubWF0Y2goL15bKF0qKFswLTldezR9KVssKV0rJC8pO1xuICAgIGlmIChtKSB7XG4gICAgICAgIHByZW9mZnNldCA9IDE7XG4gICAgICAgIGNpdGF0aW9uLnllYXIgPSBtWzFdO1xuICAgICAgICBpZiAod29yZHNbcG9zXS5zbGljZSgtMSkgIT09IFwiKVwiICYmIHdvcmRzW3BvcyAtIDFdLnNsaWNlKC0xKSAhPT0gXCIsXCIpIHtcbiAgICAgICAgICAgIHJldHVybiBwcmVvZmZzZXQ7XG4gICAgICAgIH1cbiAgICAgICAgLy8gVHJ5IGZvciBhIGNvdXJ0XG4gICAgICAgIHZhciBuZXdvZmZzZXQgPSAwO1xuICAgICAgICB2YXIgbWF5YmVjb3VydCA9IFtdO1xuICAgICAgICBmb3IgKHZhciBpPXBvcy0xLGlsZW49cG9zLTQ7aT5pbGVuO2krPS0xKSB7XG4gICAgICAgICAgICBpZiAoaSA9PSBwcmV2X2lkeCkgYnJlYWs7XG4gICAgICAgICAgICBtYXliZWNvdXJ0LnJldmVyc2UoKTtcbiAgICAgICAgICAgIG1heWJlY291cnQucHVzaCh3b3Jkc1tpXSk7XG4gICAgICAgICAgICBtYXliZWNvdXJ0LnJldmVyc2UoKTtcbiAgICAgICAgICAgIGlmICh0aGlzLm1hdGNoX2p1cmlzZGljdGlvbihjaXRhdGlvbiwgbWF5YmVjb3VydC5qb2luKFwiIFwiKSkpIHtcbiAgICAgICAgICAgICAgICBuZXdvZmZzZXQgPSBwb3MtaTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAobmV3b2Zmc2V0KSB7XG4gICAgICAgICAgICBwcmVvZmZzZXQgPSBuZXdvZmZzZXQrMTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcHJlb2Zmc2V0O1xuICAgIH1cbiAgICByZXR1cm4gcHJlb2Zmc2V0O1xufTtcblxuV2FsdmVyaW5lLmNhcnJ5X2ZvcndhcmQgPSBmdW5jdGlvbiAoY2l0YXRpb25zLCBwb3MpIHtcbiAgICBjaXRhdGlvbnNbcG9zXS5wbGFpbnRpZmYgPSBjaXRhdGlvbnNbcG9zIC0gMV0ucGxhaW50aWZmO1xuICAgIGNpdGF0aW9uc1twb3NdLmRlZmVuZGFudCA9IGNpdGF0aW9uc1twb3MgLSAxXS5kZWZlbmRhbnQ7XG4gICAgdGhpcy5hcHBseV9qdXJpc2RpY3Rpb24oY2l0YXRpb25zW3Bvc10sIGNpdGF0aW9uc1twb3MgLSAxXS5tbHpfanVyaXNkaWN0aW9uKTtcbiAgICB0aGlzLmFwcGx5X3llYXIoY2l0YXRpb25zW3Bvc10sIGNpdGF0aW9uc1twb3MgLSAxXS55ZWFyKTtcbn07XG5cbldhbHZlcmluZS5hcHBseV9qdXJpc2RpY3Rpb24gPSBmdW5jdGlvbiAoY2l0YXRpb24sIGp1cmlzZGljdGlvbikge1xuICAgIGlmICghY2l0YXRpb24ubWx6X2p1cmlzZGljdGlvbikge1xuICAgICAgICBjaXRhdGlvbi5tbHpfanVyaXNkaWN0aW9uID0ganVyaXNkaWN0aW9uO1xuICAgIH1cbn07XG5cbldhbHZlcmluZS5hcHBseV95ZWFyID0gZnVuY3Rpb24gKGNpdGF0aW9uLCB5ZWFyKSB7XG4gICAgaWYgKCFjaXRhdGlvbi55ZWFyKSB7XG4gICAgICAgIGNpdGF0aW9uLnllYXIgPSB5ZWFyO1xuICAgIH1cbn07XG5cbldhbHZlcmluZS5tYXRjaF9qdXJpc2RpY3Rpb24gPSBmdW5jdGlvbiAoY2l0YXRpb24sIGRhdGFfc3RyaW5nKSB7XG4gICAgLy8gQSB3aWxkIGd1ZXNzIGlzIHRoZSBiZXN0IHdlIGNhbiBkbyAtLSBhbnkgbWF0Y2ggY2xlYXJzXG4gICAgdmFyIENPVVJUUyA9IHRoaXMuY29uc3RhbnRzLkNPVVJUUztcbiAgICBmb3IgKHZhciBrZXkgaW4gQ09VUlRTKSB7XG4gICAgICAgIGlmIChkYXRhX3N0cmluZy5pbmRleE9mKGtleSkgPiAtMSkge1xuICAgICAgICAgICAgY2l0YXRpb24uY291cnQgPSBrZXk7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG59O1xuV2FsdmVyaW5lLnRva2VuaXplID0gZnVuY3Rpb24gKHRleHQpIHtcbiAgICAvKlxuICAgICAqICBUb2tlbml6ZSB0ZXh0IHVzaW5nIHJlZ3VsYXIgZXhwcmVzc2lvbnMgaW4gdGhlIGZvbGxvd2luZyBzdGVwczpcbiAgICAgKiAgICAgICAtU3BsaXQgdGhlIHRleHQgYnkgdGhlIG9jY3VycmVuY2VzIG9mIHBhdHRlcm5zIHdoaWNoIG1hdGNoIGEgZmVkZXJhbFxuICAgICAqICAgICAgICByZXBvcnRlciwgaW5jbHVkaW5nIHRoZSByZXBvcnRlciBzdHJpbmdzIGFzIHBhcnQgb2YgdGhlIHJlc3VsdGluZyBsaXN0LlxuICAgICAqICAgICAgIC1QZXJmb3JtIHNpbXBsZSB0b2tlbml6YXRpb24gKHdoaXRlc3BhY2Ugc3BsaXQpIG9uIGVhY2ggb2YgdGhlIG5vbi1yZXBvcnRlclxuICAgICAqICAgICAgICBzdHJpbmdzIGluIHRoZSBsaXN0LlxuICAgICAqXG4gICAgICogICAgIEV4YW1wbGU6XG4gICAgICogICAgID4+PnRva2VuaXplKCdTZWUgUm9lIHYuIFdhZGUsIDQxMCBVLiBTLiAxMTMgKDE5NzMpJylcbiAgICAgKiAgICAgWydTZWUnLCAnUm9lJywgJ3YuJywgJ1dhZGUsJywgJzQxMCcsICdVLlMuJywgJzExMycsICcoMTk3MyknXVxuICAgICAqL1xuICAgIHZhciBSRVBPUlRFUl9SRSA9IHRoaXMuY29uc3RhbnRzLlJFUE9SVEVSX1JFO1xuXG4gICAgdmFyIHN0cmluZ3MgPSB0ZXh0LnNwbGl0KFJFUE9SVEVSX1JFKTtcbiAgICB2YXIgd29yZHMgPSBbXTtcbiAgICBmb3IgKHZhciBpPTAsaWxlbj1zdHJpbmdzLmxlbmd0aDtpPGlsZW47aSs9MSkge1xuICAgICAgICB2YXIgc3RyaW5nID0gc3RyaW5nc1tpXTtcbiAgICAgICAgaWYgKChpKzEpJTIgPT09IDApIHtcbiAgICAgICAgICAgIHN0cmluZyA9IHN0cmluZy5yZXBsYWNlKC9eXFxzKy8sIFwiXCIpLnJlcGxhY2UoL1xccyskLywgXCJcIik7XG4gICAgICAgICAgICB3b3Jkcy5wdXNoKHN0cmluZyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBOb3JtYWxpemUgc3BhY2VzXG4gICAgICAgICAgICB3b3JkcyA9IHdvcmRzLmNvbmNhdCh0aGlzLl90b2tlbml6ZShzdHJpbmcpKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gd29yZHM7XG59O1xuXG5cbldhbHZlcmluZS5fdG9rZW5pemUgPSBmdW5jdGlvbiAodGV4dCkge1xuICAgIC8vYWRkIGV4dHJhIHNwYWNlIHRvIG1ha2UgdGhpbmdzIGVhc2llclxuICAgIHRleHQgPSBcIiBcIiArIHRleHQgKyBcIiBcIjtcblxuICAgIC8vZ2V0IHJpZCBvZiBhbGwgdGhlIGFubm95aW5nIHVuZGVyc2NvcmVzIGluIHRleHQgZnJvbSBwZGZzXG4gICAgdGV4dCA9IHRleHQucmVwbGFjZSgvX18rL2csXCJcIik7XG5cbiAgICAvLyBObyBsb25lIGNvbW1hc1xuICAgIHRleHQgPSB0ZXh0LnJlcGxhY2UoL1xccyssXFxzKy9nLFwiIFwiKTtcblxuICAgIC8vIE5vIHN0YXIgbnVtYmVycyAoR29vZ2xlIFNjaG9sYXIgbGluayB0ZXh0IGZvciB0aGVzZSBpcyBpbW1lZGlhdGVseSBhZGphY2VudClcbiAgICB0ZXh0ID0gdGV4dC5yZXBsYWNlKC8oWzAtOV0rKSpcXCpbMC05XSsvZyxcIiBcIik7XG5cbiAgICAvL3JlZHVjZSBleGNlc3Mgd2hpdGVzcGFjZVxuICAgIHRleHQgPSB0ZXh0LnJlcGxhY2UoLyArL2csIFwiIFwiKTtcbiAgICB0ZXh0ID0gdGV4dC5yZXBsYWNlKC9eXFxzKy8sIFwiXCIpLnJlcGxhY2UoL1xccyskLywgXCJcIik7XG4gICAgcmV0dXJuIHRleHQuc3BsaXQoXCIgXCIpO1xufTtcbldhbHZlcmluZS5leHRyYWN0X2Jhc2VfY2l0YXRpb24gPSBmdW5jdGlvbiAod29yZHMsIHJlcG9ydGVyX2luZGV4KSB7XG4gICAgLypcbiAgICAgKiAgXCJcIlwiQ29uc3RydWN0IGFuZCByZXR1cm4gYSBjaXRhdGlvbiBvYmplY3QgZnJvbSBhIGxpc3Qgb2YgXCJ3b3Jkc1wiXG4gICAgICpcbiAgICAgKiAgR2l2ZW4gYSBsaXN0IG9mIHdvcmRzIGFuZCB0aGUgaW5kZXggb2YgYSBmZWRlcmFsIHJlcG9ydGVyLCBsb29rIGJlZm9yZSBhbmQgYWZ0ZXJcbiAgICAgKiAgZm9yIHZvbHVtZSBhbmQgcGFnZSBudW1iZXIuICBJZiBmb3VuZCwgY29uc3RydWN0IGFuZCByZXR1cm4gYSBXYWx2ZXJpbmVDaXRhdGlvbiBvYmplY3QuXG4gICAgICovXG4gICAgdmFyIE5FVVRSQUxTID0gdGhpcy5jb25zdGFudHMuTkVVVFJBTFM7XG5cbiAgICB2YXIgcmVwb3J0ZXIgPSB3b3Jkc1tyZXBvcnRlcl9pbmRleF07XG4gICAgdmFyIG0gPSB3b3Jkc1tyZXBvcnRlcl9pbmRleCAtIDFdLm1hdGNoKC9eXFxzKihbMC05XSspXFxzKiQvKTtcbiAgICBpZiAobSkge1xuICAgICAgICB2b2x1bWUgPSBwYXJzZUludChtWzFdLCAxMCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdm9sdW1lID0gbnVsbDtcbiAgICB9XG4gICAgdmFyIHBhZ2Vfc3RyID0gd29yZHNbcmVwb3J0ZXJfaW5kZXggKyAxXTtcbiAgICAvLyBTdHJpcCBvZmYgZW5kaW5nIGNvbW1hLCB3aGljaCBvY2N1cnMgd2hlbiB0aGVyZSBpcyBhIHBhZ2UgcmFuZ2UgbmV4dFxuICAgIC8vIC4uLiBhbmQgYSBwZXJpb2QsIHdoaWNoIGNhbiBvY2N1ciBpbiBuZXV0cmFsIGFuZCB5ZWFyLWZpcnN0IGNpdGF0aW9ucy5cbiAgICBwYWdlX3N0ciA9IHBhZ2Vfc3RyLnJlcGxhY2UoL1s7LC5dJC8sIFwiXCIpO1xuICAgIGlmIChwYWdlX3N0ci5tYXRjaCgvXlswLTldKyQvKSkge1xuICAgICAgICBwYWdlID0gcGFyc2VJbnQocGFnZV9zdHIsIDEwKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICAvLyBObyBwYWdlLCB0aGVyZWZvcmUgbm8gdmFsaWQgY2l0YXRpb25cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHZhciBjaXRhdGlvbiA9IG5ldyBXYWx2ZXJpbmVDaXRhdGlvbih2b2x1bWUsIHJlcG9ydGVyLCBwYWdlKTtcbiAgICBpZiAoTkVVVFJBTFNbcmVwb3J0ZXJdKSB7XG4gICAgICAgIGNpdGF0aW9uLmNpdGVfdHlwZSA9IFwibmV1dHJhbFwiO1xuICAgICAgICBpZiAodm9sdW1lICYmIChcIlwiK3ZvbHVtZSkubWF0Y2goL1swLTldezR9LykpIHtcbiAgICAgICAgICAgIGNpdGF0aW9uLnllYXIgPSB2b2x1bWU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgY2l0YXRpb24uZW5kX2lkeCA9IHJlcG9ydGVyX2luZGV4ICsgMTtcbiAgICByZXR1cm4gY2l0YXRpb247XG59XG5XYWx2ZXJpbmUuYWRkX3Bvc3RfY2l0YXRpb24gPSBmdW5jdGlvbiAoY2l0YXRpb24sIHdvcmRzLCByZXBvcnRlcl9pbmRleCkge1xuICAgIHZhciBGT1JXQVJEX1NFRUsgPSB0aGlzLmNvbnN0YW50cy5GT1JXQVJEX1NFRUs7XG5cbiAgICB2YXIgZmluZF9waW5wb2ludHMgPSB0cnVlO1xuXG4gICAgLy8gU3RhcnQgbG9va2luZyAyIHRva2VucyBhZnRlciB0aGUgcmVwb3J0ZXIgKDEgYWZ0ZXIgcGFnZSlcbiAgICBmb3IgKHZhciBpPShyZXBvcnRlcl9pbmRleCsyKSxpbGVuPU1hdGgubWluKChyZXBvcnRlcl9pbmRleCtGT1JXQVJEX1NFRUspLCB3b3Jkcy5sZW5ndGgpO2k8aWxlbjtpKz0xKSB7XG4gICAgICAgIC8vIENoZWNrIGVhY2ggdG9rZW4gZ29pbmcgZm9yd2FyZCBhcyBlaXRoZXIgKGEpIGEgcGFyZW50aGV0aWNhbCBvciAoYikgYSBwb3RlbnRpYWwgcGlucG9pbnQuXG4gICAgICAgIC8vIFdoZW4gdGhlIHRlc3QgZm9yIChiKSBmYWlscywgcGVnIHRoZSBlbmRpbmcgaW5kZXggb2YgdGhlIGN1cnJlbnQgY2l0ZSBhdCB0d28gbGVzcyB0aGFuIHRoZVxuICAgICAgICAvLyBmYWlsaW5nIGluZGV4IChpLmUuIG9uZSBiZWZvcmUgdGhlIHBvc3NpYmxlIHZvbHVtZSBudW1iZXIgb2YgdGhlIGZvbGxvd2luZyBjaXRlKS5cbiAgICAgICAgdmFyIHN0YXJ0ID0gaTtcbiAgICAgICAgaWYgKHdvcmRzW3N0YXJ0XS5zbGljZSgwLDEpID09PSBcIihcIiB8fCB3b3Jkc1tzdGFydF0uc2xpY2UoMCwxKSA9PT0gXCJbXCIpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGs9c3RhcnQsa2xlbj1zdGFydCtGT1JXQVJEX1NFRUs7azxrbGVuO2srPTEpIHtcbiAgICAgICAgICAgICAgICB2YXIgZW5kID0gaztcbiAgICAgICAgICAgICAgICB2YXIgaGFzX2VuZGluZ19wYXJlbjtcbiAgICAgICAgICAgICAgICBoYXNfZW5kaW5nX3BhcmVuID0gKHdvcmRzW2VuZF0uaW5kZXhPZihcIilcIikgPiAtMSB8fCB3b3Jkc1tlbmRdLmluZGV4T2YoXCIpXCIpID4gLTEpO1xuICAgICAgICAgICAgICAgIGlmIChoYXNfZW5kaW5nX3BhcmVuKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNvbWV0aW1lcyB0aGUgcGFyZW4gZ2V0cyBzcGxpdCBmcm9tIHRoZSBwcmVjZWRpbmcgY29udGVudFxuICAgICAgICAgICAgICAgICAgICBpZiAod29yZHNbZW5kXS5zbGljZSgwLDEpID09PSBcIilcIiB8fCB3b3Jkc1tlbmRdLnNsaWNlKDAsMSkgPT09IFwiXVwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjaXRhdGlvbi55ZWFyID0gdGhpcy5nZXRfeWVhcih3b3Jkc1tlbmQgLSAxXSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjaXRhdGlvbi55ZWFyID0gdGhpcy5nZXRfeWVhcih3b3Jkc1tlbmRdKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjaXRhdGlvbi5jb3VydCA9IHRoaXMuZ2V0X2NvdXJ0KHdvcmRzLnNsaWNlKHN0YXJ0LCAoZW5kKzEpKS5qb2luKFwiIFwiKSwgY2l0YXRpb24ueWVhcilcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHN0YXJ0ID4gKHJlcG9ydGVyX2luZGV4ICsgMikpIHtcbiAgICAgICAgICAgICAgICAvLyBUaGVuIHRoZXJlJ3MgY29udGVudCBiZXR3ZWVuIHBhZ2UgYW5kICgpLCBzdGFydGluZyB3aXRoIGEgY29tbWEsIHdoaWNoIHdlIHNraXBcbiAgICAgICAgICAgICAgICBjaXRhdGlvbi5leHRyYSA9IHdvcmRzLnNsaWNlKHJlcG9ydGVyX2luZGV4KzIsc3RhcnQpLmpvaW4oXCIgXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoZmluZF9waW5wb2ludHMpIHtcbiAgICAgICAgICAgICAgICBpZiAod29yZHNbaV0ubWF0Y2goL14oPzpuXFwufG58bm5cXC58bm58cGFyYXxwYXJhXFwufMOCwrZ8Wy0wLTldKylbLDtdP1xccyokLykpIHtcbiAgICAgICAgICAgICAgICAgICAgY2l0YXRpb24uZW5kX2lkeCA9IChpLTEpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGZpbmRfcGlucG9pbnRzID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuV2FsdmVyaW5lLmFkZF9kZWZlbmRhbnQgPSBmdW5jdGlvbiAoY2l0YXRpb25zLCB3b3JkcywgcmVwb3J0ZXJfaW5kZXgpIHtcbiAgICAvKlxuICAgICAqICBTY2FuIGJhY2t3YXJkcyBmcm9tIDIgdG9rZW5zIGJlZm9yZSByZXBvcnRlciB1bnRpbCB5b3UgZmluZCB2LiwgaW4gcmUsIGV0Yy5cbiAgICAgKiAgSWYgbm8ga25vd24gc3RvcC10b2tlbiBpcyBmb3VuZCwgbm8gZGVmZW5kYW50IG5hbWUgaXMgc3RvcmVkLiAgSW4gdGhlIGZ1dHVyZSxcbiAgICAgKiAgdGhpcyBjb3VsZCBiZSBpbXByb3ZlZC5cbiAgICAgKi9cbiAgICBcbiAgICB2YXIgcG9zID0gY2l0YXRpb25zLmxlbmd0aCAtIDE7XG4gICAgdmFyIGVuZCA9IChyZXBvcnRlcl9pbmRleCAtIDEpO1xuICAgIHZhciBpZHggPSAocmVwb3J0ZXJfaW5kZXggLSAyKTtcbiAgICB2YXIgcHJldl9pZHggPSBjaXRhdGlvbnNbcG9zIC0gMV0gPyBjaXRhdGlvbnNbcG9zIC0gMV0uZW5kX2lkeCA6IDA7XG5cbiAgICB2YXIgX2FkZF9kZWZlbmRhbnQgPSBXYWx2ZXJpbmUuYWRkRGVmZW5kYW50KGNpdGF0aW9ucywgd29yZHMsIHBvcywgaWR4LCBlbmQsIHByZXZfaWR4KTtcbiAgICB0aGlzLmJ1ZmZlciA9IF9hZGRfZGVmZW5kYW50LmJhY2tzY2FuKCk7XG4gICAgX2FkZF9kZWZlbmRhbnQuZmluaXNoKGNpdGF0aW9uc1twb3NdKTtcbn1cblxuV2FsdmVyaW5lLmFkZERlZmVuZGFudCA9IGZ1bmN0aW9uIChjaXRhdGlvbnMsIHdvcmRzLCBwb3MsIGlkeCwgZW5kLCBwcmV2X2lkeCkge1xuICAgIC8vIFRyeSBhIHNvcnQtb2Ygc3RhdGUgbWFjaGluZVxuICAgIHZhciBTVFJJTkdfVE9LRU5TID0gdGhpcy5jb25zdGFudHMuU1RSSU5HX1RPS0VOUztcbiAgICB2YXIgQUNDRVBUX1RPS0VOUyA9IHRoaXMuY29uc3RhbnRzLkFDQ0VQVF9UT0tFTlM7XG4gICAgdmFyIEVNQkVEREVEX1RPS0VOUyA9IHRoaXMuY29uc3RhbnRzLkVNQkVEREVEX1RPS0VOUztcbiAgICB2YXIgUFJFUE9TSVRJT05TID0gdGhpcy5jb25zdGFudHMuUFJFUE9TSVRJT05TO1xuICAgIHZhciBCQUNLV0FSRF9TRUVLID0gdGhpcy5jb25zdGFudHMuQkFDS1dBUkRfU0VFSztcbiAgICB2YXIgc3RyaXBfcHVuY3QgPSB0aGlzLnV0aWxzLnN0cmlwX3B1bmN0O1xuICAgIHZhciBidWZmZXIgPSB0aGlzLmJ1ZmZlcjtcblxuICAgIHJldHVybiB7XG4gICAgICAgIGlkeDogaWR4LFxuICAgICAgICBlbmQ6IGVuZCxcbiAgICAgICAgYnVmZmVyOiBidWZmZXIsXG4gICAgICAgIGJhY2tzY2FuOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAvLyBTb21lIGNvbmRpdGlvbnNcbiAgICAgICAgICAgIGlmICh0aGlzLmlkeCA8IDEpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBOb3Qgc3VyZSB3aHksIGJ1dCB0aGUgdG9rZW5pemVyIGNhbiBwcm9kdWNlIGVtcHR5IGVsZW1lbnRzLlxuICAgICAgICAgICAgdmFyIHdvcmQgPSB3b3Jkc1t0aGlzLmlkeF07XG4gICAgICAgICAgICBpZiAoIXdvcmQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmlkeCArPSAtMTtcbiAgICAgICAgICAgICAgICB0aGlzLmJhY2tzY2FuKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB3b3JkID0gd29yZC5yZXBsYWNlKC9eW1xcKFxcW10qL2csIFwiXCIpO1xuICAgICAgICAgICAgdmFyIGNhcFdvcmQgPSB0aGlzLmlzQ2FwKHdvcmQpO1xuICAgICAgICAgICAgdmFyIHByZXdvcmQgPSB3b3Jkc1t0aGlzLmlkeCAtIDFdLnJlcGxhY2UoL15bXFwoXFxbXSovZywgXCJcIik7XG4gICAgICAgICAgICB2YXIgY2FwUHJlV29yZCA9IHRoaXMuaXNDYXAocHJld29yZCk7XG4gICAgICAgICAgICBpZiAodGhpcy5pZHgrMSA9PSB0aGlzLmVuZCAmJiB0aGlzLmlzX3BhcmFsbGVsKCkpIHtcbiAgICAgICAgICAgICAgICAvLyBJZiB0aGUgbmFtZSBjb25zaXN0cyBlbnRpcmVseSBvZiBwaW5wb2ludC1saWtlIHRoaW5ncywgaXQncyBhIHBhcmFsbGVsLlxuICAgICAgICAgICAgICAgIGNpdGF0aW9uc1twb3NdLkNBUlJZX0ZPUldBUkQgPSB0cnVlO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChjaXRhdGlvbnMubGVuZ3RoID4gMSAmJiB0aGlzLmlkeCA9PSAodGhpcy5lbmQtMSkgJiYgdGhpcy5pZHggPD0gKGNpdGF0aW9uc1twb3MgLSAxXS5lbmRfaWR4KSkge1xuICAgICAgICAgICAgICAgIC8vIElmIHRoZXJlIGlzIG5vdGhpbmcgYmV0d2VlbiBpdCBhbmQgdGhlIHByZXZpb3VzIGNpdGUsIGl0J3MgYSBwYXJhbGxlbCBhbHNvXG4gICAgICAgICAgICAgICAgdGhpcy5pZHggPSB0aGlzLmVuZDtcbiAgICAgICAgICAgICAgICBjaXRhdGlvbnNbcG9zXS5DQVJSWV9GT1JXQVJEID0gdHJ1ZTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocHJld29yZC5zbGljZSgtMikgPT09ICdcIi4nIHx8IHByZXdvcmQuc2xpY2UoLTIpID09PSAnLlwiJykge1xuICAgICAgICAgICAgICAgIHRoaXMuY2xlYW51cCh0cnVlKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoU1RSSU5HX1RPS0VOUy5pbmRleE9mKHN0cmlwX3B1bmN0KHdvcmQpKSA+IC0xICYmIHBvcyA+IDApIHtcbiAgICAgICAgICAgICAgICAvLyBJZiBpdCBzdG9wcyBhdCBhIG1lbWJlciBvZiBTVFJJTkdfVE9LRU5TLCBpdCBwZXJ0YWlucyB0byB0aGUgaW1tZWRpYXRlbHkgcHJlY2VkaW5nIGNhc2VcbiAgICAgICAgICAgICAgICB0aGlzLmlkeCA9IHRoaXMuZW5kO1xuICAgICAgICAgICAgICAgIGNpdGF0aW9uc1twb3NdLkNBUlJZX0ZPUldBUkQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHZhciBtID0gd29yZC5tYXRjaCgvY2VydC4qKGdyYW50ZWR8ZGVuaWVkKS8pO1xuICAgICAgICAgICAgICAgIGlmIChtKSB7XG4gICAgICAgICAgICAgICAgICAgIGNpdGF0aW9uc1twb3NdLkNFUlQgPSBtWzFdO1xuICAgICAgICAgICAgICAgICAgICBpZiAoY2l0YXRpb25zW3Bvc10ueWVhcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaT0oY2l0YXRpb25zLmxlbmd0aC0xK3RoaXMuYnVmZmVyKSxpbGVuPShjaXRhdGlvbnMubGVuZ3RoLTEpO2k8aWxlbjtpKz0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2l0YXRpb25zW2ldLnllYXIgPSBjaXRhdGlvbnNbcG9zXS55ZWFyO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5idWZmZXIgPSAwO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmICh3b3JkLnNsaWNlKC0xKSA9PT0gXCIuXCIgJiYgIWNhcFdvcmQgJiYgd29yZCAhPT0gXCJ2LlwiKSB7XG4gICAgICAgICAgICAgICAgLy8gSXQgbmV2ZXIgaW5jbHVkZXMgYSBub24tY2FwaXRhbGl6ZWQgd29yZCB0aGF0IGVuZHMgaW4gYSBwZXJpb2RcbiAgICAgICAgICAgICAgICB0aGlzLmNsZWFudXAoKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAod29yZC5pbmRleE9mKFwiOlwiKSA+IC0xIHx8IHdvcmQuaW5kZXhPZihcIjtcIikgPiAtMSkge1xuICAgICAgICAgICAgICAgIC8vIENvbG9ucyBhbmQgc2VtaWNvbG9ucyBhcmUgZmF0YWwgdG8gdGhlIHNlYXJjaCBhbmQgc2hvdWxkIG5ldmVyIGJlIGluY2x1ZGVkXG4gICAgICAgICAgICAgICAgdGhpcy5jbGVhbnVwKCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCh0aGlzLmVuZCAtIHRoaXMuaWR4KSA+IDMgJiYgd29yZC5pbmRleE9mKFwiKVwiKSA+IC0xKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5pZHggKz0gMTtcbiAgICAgICAgICAgICAgICAvLyBJdCBkb2VzIG5vdCBydW4gcGFzdCBhIGNsb3NlIHBhcmVucyBhZnRlciBnYXRoZXJpbmcgdGhyZWUgd29yZHNcbiAgICAgICAgICAgICAgICB0aGlzLmNsZWFudXAoKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAod29yZCA9PT0gXCJvZlwiIHx8IHdvcmQgPT09IFwiYW5kXCIgfHwgd29yZCA9PT0gXCJ0b1wiIHx8IHdvcmQubWF0Y2goL15zZWVbLC5dPyQvaSkpIHtcbiAgICAgICAgICAgICAgICBpZiAoIWNhcFByZVdvcmQpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVGhlIHByZXBvc2l0aW9uIFwib2ZcIiBvciBjb25qdW5jdGlvbiBcImFuZFwiIHByZWNlZGUgYSBjYXNlIG5hbWUgb25seSBpZiBpdCBpcyBub3QgdGhlbXNlbHZlcyBwcmVjZWRlZCBieSBhIGNhcGl0YWxpemVkIHdvcmQuXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY2xlYW51cCgpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaWR4ICs9IC0xO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmJhY2tzY2FuKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChBQ0NFUFRfVE9LRU5TLmluZGV4T2Yoc3RyaXBfcHVuY3Qod29yZCkpID4gLTEpIHtcbiAgICAgICAgICAgICAgICAvLyBJdCBuZXZlciBleHRlbmRzIGJleW9uZCBcIkluIHJlXCJcbiAgICAgICAgICAgICAgICAvLyBJdCBuZXZlciBleHRlbmRzIGJleW9uZCBcIkV4IHBhcnRlXCJcbiAgICAgICAgICAgICAgICB0aGlzLmNsZWFudXAoKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoUFJFUE9TSVRJT05TLmluZGV4T2Yoc3RyaXBfcHVuY3QocHJld29yZCkpID4gLTEgJiYgY2FwV29yZCkge1xuICAgICAgICAgICAgICAgIC8vIElmIG92ZXIgYW4gYXJiaXRyYXJ5IGxlbmd0aCAoPyksIGl0IG5ldmVyIGV4dGVuZHMgYmV5b25kIGNlcnRhaW4gcHJlcG9zaXRpb25zIGlmIHRoZXkgcHJlY2VkZSBhIGNhcGl0YWxpemVkIHdvcmRcbiAgICAgICAgICAgICAgICB0aGlzLmNsZWFudXAodHJ1ZSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCFjYXBXb3JkICYmIHdvcmQgIT09IFwidi5cIiAmJiB3b3JkICE9PSBcInZcIiAmJiB3b3JkICE9PSBcIiZcIiAmJiB3b3JkICE9PSBcIiZhbXA7XCIgJiYgRU1CRURERURfVE9LRU5TLmluZGV4T2Yod29yZCkgPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgLy8gSXQgbmV2ZXIgaW5jbHVkZXMgYSBub24tY2FwaXRhbGl6ZWQgd29yZCB0aGF0IGlzIG5vdCBcInYuXCIgb3IgXCImXCJcbiAgICAgICAgICAgICAgICB0aGlzLmNsZWFudXAoKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoKHRoaXMuZW5kIC0gdGhpcy5pZHgpID4gQkFDS1dBUkRfU0VFSykge1xuICAgICAgICAgICAgICAgIC8vIEl0IG5ldmVyIGV4dGVuZHMgYmV5b25kIGFuIGFyYml0cmFyeSBsZW5ndGggbGltaXRcbiAgICAgICAgICAgICAgICB0aGlzLmNsZWFudXAodHJ1ZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuaWR4ICs9IC0xO1xuICAgICAgICAgICAgICAgIHRoaXMuYmFja3NjYW4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzLmJ1ZmZlcjtcbiAgICAgICAgfSxcbiAgICAgICAgXG4gICAgICAgIGlzX3BhcmFsbGVsOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIC8vIFwib2ZcIiBpcyBoYW5kbGVkIGJ5IGEgc3BlY2lhbCBjb25kaXRpb25cbiAgICAgICAgICAgIHZhciBpZHggPSB0aGlzLmlkeDtcbiAgICAgICAgICAgIGZvciAodmFyIGk9dGhpcy5pZHgsaWxlbj1NYXRoLm1heCh0aGlzLmlkeC1CQUNLV0FSRF9TRUVLLCBwcmV2X2lkeCsxLCAtMSk7aT5pbGVuO2krPS0xKSB7XG4gICAgICAgICAgICAgICAgaWYgKHdvcmRzW2ldLm1hdGNoKC9eKD86blxcLnxufHBhcmF8cGFyYVxcLnzDgsK2fFstMC05XSspWyw7XT9cXHMqJC8pKSB7XG4gICAgICAgICAgICAgICAgICAgIGlkeCA9IGk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuZW5kID0gaWR4KzE7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSxcblxuICAgICAgICBpc0NhcDogZnVuY3Rpb24gKHdvcmQpIHtcbiAgICAgICAgICAgIHJldHVybiB3b3JkLnNsaWNlKDAsMSkgIT09IHdvcmQuc2xpY2UoMCwxKS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGNsZWFudXA6IGZ1bmN0aW9uIChrZWVwQ3VycmVudFdvcmQpIHtcbiAgICAgICAgICAgIC8vIEl0IGFsd2F5cyBiZWdpbnMgd2l0aCBhIGNhcGl0YWxpemVkIHdvcmRcbiAgICAgICAgICAgIGlmIChrZWVwQ3VycmVudFdvcmQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmlkeCArPSAtMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvciAodmFyIGk9dGhpcy5pZHgsaWxlbj10aGlzLmVuZDtpPGlsZW47aSs9MSkge1xuICAgICAgICAgICAgICAgIHZhciB3b3JkID0gd29yZHNbaV0ucmVwbGFjZSgvW1xcW1xcKFxcXVxcKV0qL2csIFwiXCIpO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmlzQ2FwKHdvcmQpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaWR4ID0gaTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBcbiAgICAgICAgY2xlYW5zdHI6IGZ1bmN0aW9uIChzdHIpIHtcbiAgICAgICAgICAgIHN0ciA9IHN0ci5yZXBsYWNlKFwiJmFtcDtcIiwgXCImXCIsIFwiZ1wiKTtcbiAgICAgICAgICAgIHN0ciA9IHN0ci5yZXBsYWNlKC8sJC8sXCJcIik7XG4gICAgICAgICAgICBzdHIgPSBzdHIucmVwbGFjZSgvW1xcW1xcKFxcKVxcXV0qL2csIFwiXCIpO1xuICAgICAgICAgICAgcmV0dXJuIHN0cjtcbiAgICAgICAgfSxcblxuICAgICAgICBmaW5pc2g6IGZ1bmN0aW9uIChjaXRhdGlvbikge1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAodGhpcy5pZHggPCB0aGlzLmVuZCkge1xuICAgICAgICAgICAgICAgIC8vIEl0IGRvZXNuJ3QgbmVjZXNzYXJpbHkgZXhpc3RcbiAgICAgICAgICAgICAgICB2YXIgcGFydGllcyA9IHdvcmRzLnNsaWNlKHRoaXMuaWR4LCh0aGlzLmVuZCkpLmpvaW4oXCIgXCIpO1xuICAgICAgICAgICAgICAgIHBhcnRpZXMgPSBwYXJ0aWVzLnNwbGl0KC9cXHMrdlxcLj9cXHMrLyk7XG4gICAgICAgICAgICAgICAgaWYgKHBhcnRpZXMubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBJIGhhZCBzb21lIHBsYWluIHRleHQgY29udmVyc2lvbiB3cmFwcGVycyBoZXJlLCBidXQgdGhleSdyZSBubyBsb25nZXIgbmVlZGVkXG4gICAgICAgICAgICAgICAgICAgIGNpdGF0aW9uLnBsYWludGlmZiA9IHN0cmlwX3B1bmN0KHBhcnRpZXNbMF0pID8gdGhpcy5jbGVhbnN0cihwYXJ0aWVzWzBdKSA6IFwiXCI7XG4gICAgICAgICAgICAgICAgICAgIGNpdGF0aW9uLmRlZmVuZGFudCA9IHN0cmlwX3B1bmN0KHBhcnRpZXNbMV0pID8gdGhpcy5jbGVhbnN0cihwYXJ0aWVzWzFdKSA6IFwiXCI7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY2l0YXRpb24ucGxhaW50aWZmID0gc3RyaXBfcHVuY3QocGFydGllc1swXSkgPyB0aGlzLmNsZWFuc3RyKHBhcnRpZXNbMF0pIDogXCJcIjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoY2l0YXRpb24ucGxhaW50aWZmKSB7XG4gICAgICAgICAgICAgICAgdmFyIG0gPSBjaXRhdGlvbi5wbGFpbnRpZmYubWF0Y2goL14oPzpTZWV8Q2YuKVxccysoLiopLyk7XG4gICAgICAgICAgICAgICAgaWYgKG0pIHtcbiAgICAgICAgICAgICAgICAgICAgY2l0YXRpb24ucGxhaW50aWZmID0gdGhpcy5jbGVhbnN0cihtWzFdKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCFjaXRhdGlvbi5wbGFpbnRpZmYubWF0Y2goL15pbiByZS9pKSkge1xuICAgICAgICAgICAgICAgICAgICBjaXRhdGlvbi5wbGFpbnRpZmYgPSBjaXRhdGlvbi5wbGFpbnRpZmYucmVwbGFjZSgvXkluXFxzKy8sIFwiXCIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNpdGF0aW9uLm1hdGNoID0gd29yZHMuc2xpY2UodGhpcy5pZHgsdGhpcy5lbmRfaWR4KS5qb2luKFwiIFwiKTtcbiAgICAgICAgfVxuICAgIH1cbn1cbldhbHZlcmluZS5pbmZlcl9qdXJpc2RpY3Rpb24gPSBmdW5jdGlvbiAoY2l0YXRpb25zKSB7XG4gICAgdmFyIFJFUE9SVEVSUyA9IHRoaXMuY29uc3RhbnRzLlJFUE9SVEVSUztcbiAgICB2YXIgSlVSSVNESUNUSU9OUyA9IHRoaXMuY29uc3RhbnRzLkpVUklTRElDVElPTlM7XG5cbiAgICBmb3IgKHZhciBpPTAsaWxlbj1jaXRhdGlvbnMubGVuZ3RoO2k8aWxlbjtpKz0xKSB7XG4gICAgICAgIHZhciBjaXRhdGlvbiA9IGNpdGF0aW9uc1tpXTtcbiAgICAgICAgLy8gTW92ZSBzdHJheSBjaXRhdGlvbiBkYXRhIGZyb20gZGVmZW5kYW50IHRvIGV4dHJhXG4gICAgICAgIGlmIChjaXRhdGlvbi5kZWZlbmRhbnQpIHtcbiAgICAgICAgICAgIHZhciBleHRyYXMgPSBbXTtcbiAgICAgICAgICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICAgICAgICAgICAgdmFyIG0gPSBjaXRhdGlvbi5kZWZlbmRhbnQubWF0Y2goL14oLiosKVxccyhbMC05XStcXHNbQS1aXVtBLVphLXouIDAtOV0rXFxzWzAtOV0rKSxcXHMqJC8pO1xuICAgICAgICAgICAgICAgIGlmIChtKSB7XG4gICAgICAgICAgICAgICAgICAgIGNpdGF0aW9uLmRlZmVuZGFudCA9IG1bMV07XG4gICAgICAgICAgICAgICAgICAgIGV4dHJhcy5wdXNoKG1bMl0pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChleHRyYXMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgaWYgKGNpdGF0aW9uLmV4dHJhKSB7XG4gICAgICAgICAgICAgICAgICAgIGV4dHJhcy5wdXNoKGNpdGF0aW9uLmV4dHJhKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2l0YXRpb24uZXh0cmEgPSBleHRyYXMuam9pbihcIiwgXCIpO1xuICAgICAgICAgICAgICAgIGNpdGF0aW9uLmRlZmVuZGFudC5yZXBsYWNlKC8sXFxzKiQvLCBcIlwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB2YXIgcmVwb3J0ZXJzID0gUkVQT1JURVJTW2NpdGF0aW9uLmNhbm9uaWNhbF9yZXBvcnRlcl07XG4gICAgICAgIHZhciBqdXJpc2RpY3Rpb25zID0gW107XG4gICAgICAgIGZvciAodmFyIGo9MCxqbGVuPXJlcG9ydGVycy5sZW5ndGg7ajxqbGVuO2orPTEpIHtcbiAgICAgICAgICAgIHZhciByZXBvcnRlciA9IHJlcG9ydGVyc1tqXTtcbiAgICAgICAgICAgIGp1cmlzZGljdGlvbnMgPSBqdXJpc2RpY3Rpb25zLmNvbmNhdChyZXBvcnRlci5tbHpfanVyaXNkaWN0aW9uKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoanVyaXNkaWN0aW9ucy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgIC8vIElmIHRoZXJlIGlzIG9ubHkgb25lIGNob2ljZSwgd2UncmUgYWxyZWFkeSBob21lXG4gICAgICAgICAgICBjaXRhdGlvbi5tbHpfanVyaXNkaWN0aW9uID0ganVyaXNkaWN0aW9uc1swXTtcbiAgICAgICAgfSBlbHNlIGlmIChjaXRhdGlvbi5jb3VydCB8fCBjaXRhdGlvbi5leHRyYSkge1xuICAgICAgICAgICAgLy8gTG9vayBmb3IgYSBtYXRjaCBvZiBhbiBhYmJyZXYgb2YgdGhlIGp1cmlzZGljdGlvbiBuYW1lIGluIHRoZSBjb3VydCBmaWVsZFxuICAgICAgICAgICAgdmFyIGRvbmUgPSBmYWxzZTtcbiAgICAgICAgICAgIHZhciBkYXRhX3N0cmluZyA9IChjaXRhdGlvbi5jb3VydCA/IGNpdGF0aW9uLmNvdXJ0IDogXCJcIikgKyBcIiBcIiArIChjaXRhdGlvbi5leHRyYSA/IGNpdGF0aW9uLmV4dHJhIDogXCJcIik7XG4gICAgICAgICAgICBmb3IgKHZhciBqPTAsamxlbj1qdXJpc2RpY3Rpb25zLmxlbmd0aDtqPGpsZW47ais9MSkge1xuICAgICAgICAgICAgICAgIHZhciBwb3NzaWJsZV9qdXJpc2RpY3Rpb24gPSBqdXJpc2RpY3Rpb25zW2pdO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGs9MCxrbGVuPUpVUklTRElDVElPTlNbcG9zc2libGVfanVyaXNkaWN0aW9uXS5sZW5ndGg7azxrbGVuO2srPTEpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG1hdGNoX3N0cmluZyA9IEpVUklTRElDVElPTlNbcG9zc2libGVfanVyaXNkaWN0aW9uXVtrXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGFfc3RyaW5nLmluZGV4T2YobWF0Y2hfc3RyaW5nKSA+IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjaXRhdGlvbi5tbHpfanVyaXNkaWN0aW9uID0gcG9zc2libGVfanVyaXNkaWN0aW9uO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGRvbmUgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGRvbmUpIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIElmIHdlIGRpZG4ndCBmaW5kIGFueXRoaW5nLCB0aGUganVyaXNkaWN0aW9uIGZpZWxkIHdpbGwgYmUgZW1wdHkuXG4gICAgICAgIC8vIEl0J3Mgc29tZXRoaW5nIGZyb20gdGhlIFVTLCBidXQgd2UgZG9uJ3Qgc2V0IHRoYXQgdW50aWwgYWZ0ZXIgaGFuZGxpbmcgdGhlIGNhcnJ5LWZvcndhcmRzXG4gICAgICAgIC8vYXBwbHlfanVyaXNkaWN0aW9uKGNpdGF0aW9uLCBcInVzXCIpO1xuICAgIH1cbn1cbldhbHZlcmluZS5kaXNhbWJpZ3VhdGVfcmVwb3J0ZXJzID0gZnVuY3Rpb24gKGNpdGF0aW9ucykge1xuICAgIC8qXG4gICAgICogIEEgc2Vjb25kLCBmcm9tIHNjcmF0Y2gsIGFwcHJvYWNoIHRvIGNvbnZlcnRpbmcgYSBsaXN0IG9mIGNpdGF0aW9ucyB0byBhIGxpc3Qgb2YgdW5hbWJpZ3VvdXMgb25lcy5cbiAgICAgKlxuICAgICAqICBHb2FsIGlzIHRvIGZpZ3VyZSBvdXQ6XG4gICAgICogICAtIGNpdGF0aW9uLmNhbm9uaWNhbF9yZXBvcnRlclxuICAgICAqICAgLSBjaXRhdGlvbi5sb29rdXBfaW5kZXhcbiAgICAgKlxuICAgICAqICBBbmQgdGhlcmUgYXJlIGEgZmV3IHRoaW5ncyB0aGF0IGNhbiBiZSBhbWJpZ3VvdXM6XG4gICAgICogICAtIE1vcmUgdGhhbiBvbmUgdmFyaWF0aW9uLlxuICAgICAqICAgLSBNb3JlIHRoYW4gb25lIHJlcG9ydGVyIGZvciB0aGUga2V5LlxuICAgICAqICAgLSBDb3VsZCBiZSBhbiBlZGl0aW9uIChvciBub3QpXG4gICAgICogICAtIEFsbCBjb21iaW5hdGlvbnMgb2YgdGhlIGFib3ZlOlxuICAgICAqICAgICAgLSBNb3JlIHRoYW4gb25lIHZhcmlhdGlvbi5cbiAgICAgKiAgICAgIC0gTW9yZSB0aGFuIG9uZSB2YXJpYXRpb24sIHdpdGggbW9yZSB0aGFuIG9uZSByZXBvcnRlciBmb3IgdGhlIGtleS5cbiAgICAgKiAgICAgIC0gTW9yZSB0aGFuIG9uZSB2YXJpYXRpb24sIHdpdGggbW9yZSB0aGFuIG9uZSByZXBvcnRlciBmb3IgdGhlIGtleSwgd2hpY2ggaXMgYW4gZWRpdGlvbi5cbiAgICAgKiAgICAgIC0gTW9yZSB0aGFuIG9uZSB2YXJpYXRpb24sIHdoaWNoIGlzIGFuIGVkaXRpb25cbiAgICAgKiAgICAgIC0gLi4uXG5cbiAgICAgKiAgRm9yIHZhcmlhbnRzLCB3ZSBqdXN0IG5lZWQgdG8gc29ydCBvdXQgdGhlIGNhbm9uaWNhbF9yZXBvcnRlclxuICAgICAqL1xuICAgIHZhciBSRVBPUlRFUlMgPSB0aGlzLmNvbnN0YW50cy5SRVBPUlRFUlM7XG4gICAgdmFyIEVESVRJT05TID0gdGhpcy5jb25zdGFudHMuRURJVElPTlM7XG4gICAgdmFyIFZBUklBVElPTlNfT05MWSA9IHRoaXMuY29uc3RhbnRzLlZBUklBVElPTlNfT05MWTtcbiAgICB2YXIgaXNfZGF0ZV9pbl9yZXBvcnRlciA9IHRoaXMudXRpbHMuaXNfZGF0ZV9pbl9yZXBvcnRlcjtcblxuICAgIHZhciB1bmFtYmlndW91c19jaXRhdGlvbnMgPSBbXTtcbiAgICBmb3IgKHZhciBoPTAsaGxlbj1jaXRhdGlvbnMubGVuZ3RoO2g8aGxlbjtoKz0xKSB7XG4gICAgICAgIHZhciBjaXRhdGlvbiA9IGNpdGF0aW9uc1toXTtcbiAgICAgICAgLy8gTm9uLXZhcmlhbnQgaXRlbXMgKFAuUi5SLiwgQS4yZCwgV2FzaC4sIGV0Yy4pXG4gICAgICAgIGlmIChSRVBPUlRFUlNbRURJVElPTlNbY2l0YXRpb24ucmVwb3J0ZXJdXSkge1xuICAgICAgICAgICAgaWYgKFJFUE9SVEVSU1tFRElUSU9OU1tjaXRhdGlvbi5yZXBvcnRlcl1dLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgICAgIC8vIFNpbmdsZSByZXBvcnRlciwgZWFzeS1wZWFzeS5cbiAgICAgICAgICAgICAgICBjaXRhdGlvbi5jYW5vbmljYWxfcmVwb3J0ZXIgPSBFRElUSU9OU1tjaXRhdGlvbi5yZXBvcnRlcl07XG4gICAgICAgICAgICAgICAgY2l0YXRpb24ubG9va3VwX2luZGV4ID0gMDtcbiAgICAgICAgICAgICAgICB1bmFtYmlndW91c19jaXRhdGlvbnMucHVzaChjaXRhdGlvbik7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIE11bHRpcGxlIGJvb2tzIHVuZGVyIHRoaXMga2V5LCBidXQgd2hpY2ggaXMgY29ycmVjdD9cbiAgICAgICAgICAgICAgICBpZiAoY2l0YXRpb24ueWVhcikge1xuICAgICAgICAgICAgICAgICAgICAvLyBhdHRlbXB0IHJlc29sdXRpb24gYnkgZGF0ZVxuICAgICAgICAgICAgICAgICAgICB2YXIgcG9zc2libGVfY2l0YXRpb25zID0gW107XG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGk9MCxpbGVuPVJFUE9SVEVSU1tFRElUSU9OU1tjaXRhdGlvbi5yZXBvcnRlcl1dLmxlbmd0aDtpPGlsZW47aSs9MSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzX2RhdGVfaW5fcmVwb3J0ZXIoUkVQT1JURVJTW0VESVRJT05TW2NpdGF0aW9uLnJlcG9ydGVyXV1baV1bJ2VkaXRpb25zJ10sIGNpdGF0aW9uLnllYXIpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcG9zc2libGVfY2l0YXRpb25zLnB1c2goKGNpdGF0aW9uLnJlcG9ydGVyLCBpKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKHBvc3NpYmxlX2NpdGF0aW9ucy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFdlIHdlcmUgYWJsZSB0byBpZGVudGlmeSBvbmx5IG9uZSBoaXQgYWZ0ZXIgZmlsdGVyaW5nIGJ5IHllYXIuXG4gICAgICAgICAgICAgICAgICAgICAgICBjaXRhdGlvbi5jYW5vbmljYWxfcmVwb3J0ZXIgPSBFRElUSU9OU1twb3NzaWJsZV9jaXRhdGlvbnNbMF1bMF1dXG4gICAgICAgICAgICAgICAgICAgICAgICBjaXRhdGlvbi5yZXBvcnRlciA9IHBvc3NpYmxlX2NpdGF0aW9uc1swXVswXVxuICAgICAgICAgICAgICAgICAgICAgICAgY2l0YXRpb24ubG9va3VwX2luZGV4ID0gcG9zc2libGVfY2l0YXRpb25zWzBdWzFdXG4gICAgICAgICAgICAgICAgICAgICAgICB1bmFtYmlndW91c19jaXRhdGlvbnMucHVzaChjaXRhdGlvbilcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoVkFSSUFUSU9OU19PTkxZW2NpdGF0aW9uLnJlcG9ydGVyXSkge1xuICAgICAgICAgICAgLy8gVHJ5IGRvaW5nIGEgdmFyaWF0aW9uIG9mIGFuIGVkaXRpb24uXG4gICAgICAgICAgICBpZiAoVkFSSUFUSU9OU19PTkxZW2NpdGF0aW9uLnJlcG9ydGVyXS5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgICAgICAvLyBPbmx5IG9uZSB2YXJpYXRpb24gLS0gZ3JlYXQsIHVzZSBpdC5cbiAgICAgICAgICAgICAgICBpZiAoUkVQT1JURVJTW0VESVRJT05TW1ZBUklBVElPTlNfT05MWVtjaXRhdGlvbi5yZXBvcnRlcl1bMF1dXS5sZW5ndGggPT0gMSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBJdCdzIGEgc2luZ2xlIHJlcG9ydGVyIHVuZGVyIGEgbWlzc3BlbGxlZCBrZXkuXG4gICAgICAgICAgICAgICAgICAgIGNpdGF0aW9uLmNhbm9uaWNhbF9yZXBvcnRlciA9IEVESVRJT05TW1ZBUklBVElPTlNfT05MWVtjaXRhdGlvbi5yZXBvcnRlcl1bMF1dO1xuICAgICAgICAgICAgICAgICAgICBjaXRhdGlvbi5yZXBvcnRlciA9IFZBUklBVElPTlNfT05MWVtjaXRhdGlvbi5yZXBvcnRlcl1bMF07XG4gICAgICAgICAgICAgICAgICAgIGNpdGF0aW9uLmxvb2t1cF9pbmRleCA9IDA7XG4gICAgICAgICAgICAgICAgICAgIHVuYW1iaWd1b3VzX2NpdGF0aW9ucy5wdXNoKGNpdGF0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgY29udGludWVcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBNdWx0aXBsZSByZXBvcnRlcnMgdW5kZXIgYSBzaW5nbGUgbWlzc3BlbGxlZCBrZXkgKGUuZy4gV24uMmQgLS0+IFdhc2ggLS0+IFZhIFJlcG9ydHMsIFdhc2ggb3JcbiAgICAgICAgICAgICAgICAgICAgLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBXYXNoaW5ndG9uIFJlcG9ydHMpLlxuICAgICAgICAgICAgICAgICAgICBpZiAoY2l0YXRpb24ueWVhcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gYXR0ZW1wdCByZXNvbHV0aW9uIGJ5IGRhdGVcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBwb3NzaWJsZV9jaXRhdGlvbnMgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGk9MCxpbGVuPVJFUE9SVEVSU1tFRElUSU9OU1tWQVJJQVRJT05TX09OTFlbY2l0YXRpb24ucmVwb3J0ZXJdWzBdXV0ubGVuZ3RoO2k8aWxlbjtpKz0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzX2RhdGVfaW5fcmVwb3J0ZXIoUkVQT1JURVJTW0VESVRJT05TW1ZBUklBVElPTlNfT05MWVtjaXRhdGlvbi5yZXBvcnRlcl1bMF1dXVtpXS5lZGl0aW9ucywgY2l0YXRpb24ueWVhcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcG9zc2libGVfY2l0YXRpb25zLnB1c2goKGNpdGF0aW9uLnJlcG9ydGVyLCBpKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHBvc3NpYmxlX2NpdGF0aW9ucy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBXZSB3ZXJlIGFibGUgdG8gaWRlbnRpZnkgb25seSBvbmUgaGl0IGFmdGVyIGZpbHRlcmluZyBieSB5ZWFyLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNpdGF0aW9uLmNhbm9uaWNhbF9yZXBvcnRlciA9IEVESVRJT05TW1ZBUklBVElPTlNfT05MWVtwb3NzaWJsZV9jaXRhdGlvbnNbMF1bMF1dWzBdXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaXRhdGlvbi5yZXBvcnRlciA9IFZBUklBVElPTlNfT05MWVtwb3NzaWJsZV9jaXRhdGlvbnNbMF1bMF1dWzBdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNpdGF0aW9uLmxvb2t1cF9pbmRleCA9IHBvc3NpYmxlX2NpdGF0aW9uc1swXVsxXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1bmFtYmlndW91c19jaXRhdGlvbnMucHVzaChjaXRhdGlvbik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgdmFyIHBvc3NpYmxlX2NpdGF0aW9ucyA9IFtdO1xuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpPTAsaWxlbj1SRVBPUlRFUlNbRURJVElPTlNbVkFSSUFUSU9OU19PTkxZW2NpdGF0aW9uLnJlcG9ydGVyXVswXV1dLmxlbmd0aDtpPGlsZW47aSs9MSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgdmFyaWF0aW9uX2tleSBpbiBSRVBPUlRFUlNbRURJVElPTlNbVkFSSUFUSU9OU19PTkxZW2NpdGF0aW9uLnJlcG9ydGVyXVswXV1dWyd2YXJpYXRpb25zJ10pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodmFyaWF0aW9uX2tleSA9PSBjaXRhdGlvbi5yZXBvcnRlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwb3NzaWJsZV9jaXRhdGlvbnMucHVzaChSRVBPUlRFUlNbRURJVElPTlNbVkFSSUFUSU9OU19PTkxZW2NpdGF0aW9uLnJlcG9ydGVyXVswXV1dLnZhcmlhdGlvbnNbdmFyaWF0aW9uX2tleV0sIGkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAocG9zc2libGVfY2l0YXRpb25zLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gV2Ugd2VyZSBhYmxlIHRvIGZpbmQgYSBzaW5nbGUgbWF0Y2ggYWZ0ZXIgZmlsdGVyaW5nIGJ5IHZhcmlhdGlvbi5cbiAgICAgICAgICAgICAgICAgICAgICAgIGNpdGF0aW9uLmNhbm9uaWNhbF9yZXBvcnRlciA9IEVESVRJT05TW3Bvc3NpYmxlX2NpdGF0aW9uc1swXVswXV07XG4gICAgICAgICAgICAgICAgICAgICAgICBjaXRhdGlvbi5yZXBvcnRlciA9IHBvc3NpYmxlX2NpdGF0aW9uc1swXVswXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNpdGF0aW9uLmxvb2t1cF9pbmRleCA9IHBvc3NpYmxlX2NpdGF0aW9uc1swXVsxXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHVuYW1iaWd1b3VzX2NpdGF0aW9ucy5wdXNoKGNpdGF0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBNdWx0aXBsZSB2YXJpYXRpb25zLCBkZWFsIHdpdGggdGhlbS5cbiAgICAgICAgICAgICAgICB2YXIgcG9zc2libGVfY2l0YXRpb25zID0gW107XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgcmVwb3J0ZXJfa2V5IGluIFZBUklBVElPTlNfT05MWVtjaXRhdGlvbi5yZXBvcnRlcl0pIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaT0wLGlsZW49UkVQT1JURVJTW0VESVRJT05TW3JlcG9ydGVyX2tleV1dO2k8aWxlbjtpKz0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBUaGlzIGlubmVyIGxvb3Agd29ya3MgcmVnYXJkbGVzcyBvZiB0aGUgbnVtYmVyIG9mIHJlcG9ydGVycyB1bmRlciB0aGUga2V5LlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzX2RhdGVfaW5fcmVwb3J0ZXIoUkVQT1JURVJTW0VESVRJT05TW3JlcG9ydGVyX2tleV1dW2ldLmVkaXRpb25zLCBjaXRhdGlvbi55ZWFyKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBvc3NpYmxlX2NpdGF0aW9ucy5wdXNoKGNpdGF0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAocG9zc2libGVfY2l0YXRpb25zLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBXZSB3ZXJlIGFibGUgdG8gaWRlbnRpZnkgb25seSBvbmUgaGl0IGFmdGVyIGZpbHRlcmluZyBieSB5ZWFyLlxuICAgICAgICAgICAgICAgICAgICBjaXRhdGlvbi5jYW5vbmljYWxfcmVwb3J0ZXIgPSBFRElUSU9OU1twb3NzaWJsZV9jaXRhdGlvbnNbMF1bMF1dO1xuICAgICAgICAgICAgICAgICAgICBjaXRhdGlvbi5yZXBvcnRlciA9IHBvc3NpYmxlX2NpdGF0aW9uc1swXVswXTtcbiAgICAgICAgICAgICAgICAgICAgY2l0YXRpb24ubG9va3VwX2luZGV4ID0gcG9zc2libGVfY2l0YXRpb25zWzBdWzFdO1xuICAgICAgICAgICAgICAgICAgICB1bmFtYmlndW91c19jaXRhdGlvbnMucHVzaChjaXRhdGlvbik7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBmb3IgKHZhciBoPTAsaGxlbj1jaXRhdGlvbnMubGVuZ3RoO2g8aGxlbjtoKz0xKSB7XG4gICAgICAgIGlmICh1bmFtYmlndW91c19jaXRhdGlvbnMuaW5kZXhPZihjaXRhdGlvbikgPT09IC0xKSB7XG4gICAgICAgICAgICAvLyBUcnkgbWF0Y2hpbmcgYnkgeWVhci5cbiAgICAgICAgICAgIGlmICh0cnVlKSB7XG4gICAgICAgICAgICAgICAgLy8gSXQncyBhIG1hdHRlciBvZiBmaWd1cmluZyBvdXQgd2hpY2hcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gVW5hYmxlIHRvIGRpc2FtYmlndWF0ZSwganVzdCBhZGQgaXQgYW55d2F5IHNvIHdlIGNhbiByZXR1cm4gaXQuXG4gICAgICAgICAgICAgICAgdW5hbWJpZ3VvdXNfY2l0YXRpb25zLnB1c2goY2l0YXRpb24pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB1bmFtYmlndW91c19jaXRhdGlvbnM7XG59XG5XYWx2ZXJpbmUuZ2V0X2NpdGF0aW9ucyA9IGZ1bmN0aW9uICh0ZXh0LCBodG1sLCBkb19wb3N0X2NpdGF0aW9uLCBkb19kZWZlbmRhbnQpIHtcbiAgICB2YXIgRURJVElPTlMgPSB0aGlzLmNvbnN0YW50cy5FRElUSU9OUztcbiAgICB2YXIgVkFSSUFUSU9OU19PTkxZID0gdGhpcy5jb25zdGFudHMuVkFSSUFUSU9OU19PTkxZO1xuICAgIHZhciBnZXRfdmlzaWJsZV90ZXh0ID0gdGhpcy51dGlscy5nZXRfdmlzaWJsZV90ZXh0O1xuXG4gICAgaWYgKFwidW5kZWZpbmVkXCIgPT09IHR5cGVvZiBodG1sKSB7XG4gICAgICAgIGh0bWwgPSB0cnVlO1xuICAgIH1cbiAgICBpZiAoXCJ1bmRlZmluZWRcIiA9PT0gdHlwZW9mIGRvX3Bvc3RfY2l0YXRpb24pIHtcbiAgICAgICAgZG9fcG9zdF9jaXRhdGlvbiA9IHRydWU7XG4gICAgfVxuICAgIGlmIChcInVuZGVmaW5lZFwiID09PSB0eXBlb2YgZG9fZGVmZW5kYW50KSB7XG4gICAgICAgIGRvX2RlZmVuZGFudCA9IHRydWU7XG4gICAgfVxuICAgIGlmIChodG1sKSB7XG4gICAgICAgIHRleHQgPSBnZXRfdmlzaWJsZV90ZXh0KHRleHQpO1xuICAgIH1cbiAgICB2YXIgd29yZHMgPSB0aGlzLnRva2VuaXplKHRleHQpO1xuICAgIHZhciBjaXRhdGlvbnMgPSBbXTtcbiAgICAvLyBFeGNsdWRlIGZpcnN0IGFuZCBsYXN0IHRva2VucyB3aGVuIGxvb2tpbmcgZm9yIHJlcG9ydGVycywgYmVjYXVzZSB2YWxpZFxuICAgIC8vIGNpdGF0aW9ucyBtdXN0IGhhdmUgYSB2b2x1bWUgYmVmb3JlIGFuZCBhIHBhZ2UgbnVtYmVyIGFmdGVyIHRoZSByZXBvcnRlci5cbiAgICB2YXIgcHJvZ3Jlc3NfdmFsdWUgPSAwO1xuICAgIGZvciAodmFyIGk9MSxpbGVuPXdvcmRzLmxlbmd0aC0xO2k8aWxlbjtpKz0xKSB7XG4gICAgICAgIC8vIEZpbmQgcmVwb3J0ZXJcbiAgICAgICAgLy9pZiAoW2tleSBmb3IgKGtleSBpbiBFRElUSU9OUyldLmNvbmNhdChba2V5IGZvciAoa2V5IGluIFZBUklBVElPTlNfT05MWSldKS5pbmRleE9mKHdvcmRzW2ldKSA+IC0xKSB7XG4gICAgICAgIGlmIChfLmtleXMoRURJVElPTlMpLmNvbmNhdChfLmtleXMoVkFSSUFUSU9OU19PTkxZKSkuaW5kZXhPZih3b3Jkc1tpXSkgPiAtMSkge1xuICAgICAgICAgICAgY2l0YXRpb24gPSB0aGlzLmV4dHJhY3RfYmFzZV9jaXRhdGlvbih3b3JkcywgaSk7XG4gICAgICAgICAgICBpZiAoIWNpdGF0aW9uKSB7XG4gICAgICAgICAgICAgICAgLy8gTm90IGEgdmFsaWQgY2l0YXRpb247IGNvbnRpbnVlIGxvb2tpbmdcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBwcmVvZmZzZXQgPSAwO1xuICAgICAgICAgICAgaWYgKGRvX3Bvc3RfY2l0YXRpb24pIHtcbiAgICAgICAgICAgICAgICAvL2NpdGF0aW9uLnJwdHJfaWR4ID0gXG4gICAgICAgICAgICAgICAgdmFyIHByZW9mZnNldCA9IHRoaXMuZ2V0X3ByZV9jaXRhdGlvbihjaXRhdGlvbiwgY2l0YXRpb25zLCB3b3JkcywgaSk7XG4gICAgICAgICAgICAgICAgaWYgKCFwcmVvZmZzZXQgJiYgY2l0YXRpb24udm9sdW1lKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYWRkX3Bvc3RfY2l0YXRpb24oY2l0YXRpb24sIHdvcmRzLCBpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIWNpdGF0aW9uLnZvbHVtZSkge1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2l0YXRpb25zLnB1c2goY2l0YXRpb24pO1xuICAgICAgICAgICAgaWYgKGRvX2RlZmVuZGFudCkge1xuICAgICAgICAgICAgICAgIHRoaXMuYWRkX2RlZmVuZGFudChjaXRhdGlvbnMsIHdvcmRzLCAoaS1wcmVvZmZzZXQpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIFZpcnR1YWwgYnVmZmVyXG4gICAgICAgICAgICBpZiAoY2l0YXRpb24udGl0bGUgJiYgY2l0YXRpb24ueWVhciAmJiB0aGlzLmJ1ZmZlcikge1xuICAgICAgICAgICAgICAgIC8vIElmIHdlIGhhdmUgYSBjb21wbGV0ZSBjaXRlLCBjbGVhciB0aGUgYnVmZmVyIG9mIHllYXJsZXNzIGNpdGF0aW9uc1xuICAgICAgICAgICAgICAgIC8vIChidWZmZXIgYWNjZXB0YW5jZSB0YWtlcyBwbGFjZSBpbiBhZGRfZGVmZW5kYW50KCkpXG4gICAgICAgICAgICAgICAgY2l0YXRpb25zID0gY2l0YXRpb25zLnNsaWNlKDAsdGhpcy5idWZmZXIpO1xuICAgICAgICAgICAgICAgIHRoaXMuYnVmZmVyID0gMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghY2l0YXRpb24ueWVhcikge1xuICAgICAgICAgICAgICAgIHRoaXMuYnVmZmVyICs9IC0xO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIC8vIERyb3AgY2l0YXRpb25zIGZvciB3aGljaCBubyB5ZWFyIHdhcyBmb3VuZFxuICAgIGZvciAodmFyIGk9Y2l0YXRpb25zLmxlbmd0aC0xO2k+LTE7aSs9LTEpIHtcbiAgICAgICAgaWYgKCFjaXRhdGlvbnNbaV0ueWVhcikge1xuICAgICAgICAgICAgY2l0YXRpb25zID0gY2l0YXRpb25zLnNsaWNlKDAsaSkuY29uY2F0KGNpdGF0aW9ucy5zbGljZShpKzEpKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIERpc2FtYmlndWF0ZSBhbGwgdGhlIHJlcG9ydGVyc1xuICAgIGNpdGF0aW9ucyA9IHRoaXMuZGlzYW1iaWd1YXRlX3JlcG9ydGVycyhjaXRhdGlvbnMpXG5cbiAgICAvLyBTdGFtcCBmb3IganVyaXNkaWN0aW9uXG4gICAgdGhpcy5pbmZlcl9qdXJpc2RpY3Rpb24oY2l0YXRpb25zKTtcblxuICAgIC8vIEZpbGwgb3V0IGNpdGF0aW9ucyB3aXRoIG1pc3NpbmcgcGFydHkgbmFtZXMgb3IganVyaXNkaWN0aW9uIHZhbHVlc1xuICAgIGlmIChjaXRhdGlvbnMubGVuZ3RoKSB7XG4gICAgICAgIHRoaXMuYXBwbHlfanVyaXNkaWN0aW9uKGNpdGF0aW9uc1swXSwgXCJ1c1wiKTtcbiAgICB9XG4gICAgZm9yICh2YXIgaT0xLGlsZW49Y2l0YXRpb25zLmxlbmd0aDtpPGlsZW47aSs9MSkge1xuICAgICAgICBpZiAoY2l0YXRpb25zW2ldLkNBUlJZX0ZPUldBUkQpIHtcbiAgICAgICAgICAgIHRoaXMuY2FycnlfZm9yd2FyZChjaXRhdGlvbnMsIGkpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuYXBwbHlfanVyaXNkaWN0aW9uKGNpdGF0aW9uc1tpXSwgXCJ1c1wiKTtcbiAgICB9XG5cbiAgICAvLyBNYXJrIHJlbGF0ZWQgY2l0YXRpb25zXG4gICAgdmFyIGxhc3RQbGFpbnRpZmYgPSBmYWxzZTtcbiAgICB2YXIgbGFzdERlZmVuZGFudCA9IGZhbHNlO1xuICAgIHZhciBsYXN0SnVyaXNkaWN0aW9uID0gZmFsc2U7XG4gICAgdmFyIHJlbGF0aW9ucyA9IFtdO1xuICAgIGZvciAodmFyIGk9MCxpbGVuPWNpdGF0aW9ucy5sZW5ndGg7aTxpbGVuO2krPTEpIHtcbiAgICAgICAgdmFyIGNpdGF0aW9uID0gY2l0YXRpb25zW2ldO1xuICAgICAgICBjaXRhdGlvbi5zZXFJRCA9IGk7XG4gICAgICAgIGlmIChjaXRhdGlvbi5wbGFpbnRpZmYgIT09IGxhc3RQbGFpbnRpZmYgfHwgY2l0YXRpb24uZGVmZW5kYW50ICE9PSBsYXN0RGVmZW5kYW50IHx8IGNpdGF0aW9uLm1sel9qdXJpc2RpY3Rpb24gIT09IGxhc3RKdXJpc2RpY3Rpb24pIHtcbiAgICAgICAgICAgIGZvciAodmFyIGogaW4gcmVsYXRpb25zKSB7XG4gICAgICAgICAgICAgICAgY2l0YXRpb25zW3JlbGF0aW9uc1tqXV0ucmVsYXRpb25zID0gcmVsYXRpb25zLnNsaWNlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZWxhdGlvbnMgPSBbXTtcbiAgICAgICAgfVxuICAgICAgICByZWxhdGlvbnMucHVzaChpKTtcbiAgICAgICAgbGFzdFBsYWludGlmZiA9IGNpdGF0aW9uLnBsYWludGlmZjtcbiAgICAgICAgbGFzdERlZmVuZGFudCA9IGNpdGF0aW9uLmRlZmVuZGFudDtcbiAgICAgICAgbGFzdEp1cmlzZGljdGlvbiA9IGNpdGF0aW9uLm1sel9qdXJpc2RpY3Rpb247XG4gICAgfVxuICAgIC8vIFByb2Nlc3MgdGhlIGxhc3QgaXRlbSBhbmQgaXRzIHJlbGF0aW9uc1xuICAgIGZvciAodmFyIGogaW4gcmVsYXRpb25zKSB7XG4gICAgICAgIGNpdGF0aW9uc1tyZWxhdGlvbnNbal1dLnJlbGF0aW9ucyA9IHJlbGF0aW9ucy5zbGljZSgpO1xuICAgIH1cbiAgICBcbiAgICAvLyBQb3B1bGF0ZSBDRVJUX0RFTklFRCBhbmQgQ0VSVF9HUkFOVEVEIGRpc3Bvc2l0aW9uIGZvcndhcmQgYW5kIGJhY2tcbiAgICBmb3IgKHZhciBpPTEsaWxlbj1jaXRhdGlvbnMubGVuZ3RoO2k8aWxlbjtpKz0xKSB7XG4gICAgICAgIHZhciBjaXRhdGlvbiA9IGNpdGF0aW9uc1tpXTtcbiAgICAgICAgdmFyIHByZXZfY2l0YXRpb24gPSBjaXRhdGlvbnNbaS0xXTtcbiAgICAgICAgaWYgKGNpdGF0aW9uLkNFUlQpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGo9MCxqbGVuPWNpdGF0aW9uLnJlbGF0aW9ucy5sZW5ndGg7ajxqbGVuO2orPTEpIHtcbiAgICAgICAgICAgICAgICB2YXIgcG9zID0gY2l0YXRpb24ucmVsYXRpb25zW2pdO1xuICAgICAgICAgICAgICAgIGNpdGF0aW9uc1twb3NdLmNlcnRfb3JkZXIgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm9yICh2YXIgaj0wLGpsZW49cHJldl9jaXRhdGlvbi5yZWxhdGlvbnMubGVuZ3RoO2o8amxlbjtqKz0xKSB7XG4gICAgICAgICAgICAgICAgdmFyIHBvcyA9IHByZXZfY2l0YXRpb24ucmVsYXRpb25zW2pdO1xuICAgICAgICAgICAgICAgIGNpdGF0aW9uc1twb3NdLmRpc3Bvc2l0aW9uID0gXCJjZXJ0aW9yYXJpIFwiICsgY2l0YXRpb24uQ0VSVDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBjaXRhdGlvbnM7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gV2FsdmVyaW5lO1xuXG4iXX0=
