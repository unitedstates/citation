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
      result.judicial = underscore.omit(cite, "match");
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvaG9tZS9lcmljL3VuaXRlZHN0YXRlcy9jaXRhdGlvbi9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvaG9tZS9lcmljL3VuaXRlZHN0YXRlcy9jaXRhdGlvbi9jaXRhdGlvbnMvY2ZyLmpzIiwiL2hvbWUvZXJpYy91bml0ZWRzdGF0ZXMvY2l0YXRpb24vY2l0YXRpb25zL2RjX2NvZGUuanMiLCIvaG9tZS9lcmljL3VuaXRlZHN0YXRlcy9jaXRhdGlvbi9jaXRhdGlvbnMvZGNfbGF3LmpzIiwiL2hvbWUvZXJpYy91bml0ZWRzdGF0ZXMvY2l0YXRpb24vY2l0YXRpb25zL2RjX3JlZ2lzdGVyLmpzIiwiL2hvbWUvZXJpYy91bml0ZWRzdGF0ZXMvY2l0YXRpb24vY2l0YXRpb25zL2p1ZGljaWFsLmpzIiwiL2hvbWUvZXJpYy91bml0ZWRzdGF0ZXMvY2l0YXRpb24vY2l0YXRpb25zL2xhdy5qcyIsIi9ob21lL2VyaWMvdW5pdGVkc3RhdGVzL2NpdGF0aW9uL2NpdGF0aW9ucy9zdGF0LmpzIiwiL2hvbWUvZXJpYy91bml0ZWRzdGF0ZXMvY2l0YXRpb24vY2l0YXRpb25zL3VzYy5qcyIsIi9ob21lL2VyaWMvdW5pdGVkc3RhdGVzL2NpdGF0aW9uL2NpdGF0aW9ucy92YV9jb2RlLmpzIiwiL2hvbWUvZXJpYy91bml0ZWRzdGF0ZXMvY2l0YXRpb24vZmFrZV8yOTNkYWI5OS5qcyIsIi9ob21lL2VyaWMvdW5pdGVkc3RhdGVzL2NpdGF0aW9uL2ZpbHRlcnMvbGluZXMuanMiLCIvaG9tZS9lcmljL3VuaXRlZHN0YXRlcy9jaXRhdGlvbi9ub2RlX21vZHVsZXMvdW5kZXJzY29yZS91bmRlcnNjb3JlLmpzIiwiL2hvbWUvZXJpYy91bml0ZWRzdGF0ZXMvY2l0YXRpb24vbm9kZV9tb2R1bGVzL3dhbHZlcmluZS9yZXBvcnRlcnMuanMiLCIvaG9tZS9lcmljL3VuaXRlZHN0YXRlcy9jaXRhdGlvbi9ub2RlX21vZHVsZXMvd2FsdmVyaW5lL3dhbHZlcmluZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy96Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZuR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiKGZ1bmN0aW9uKGRlZikge1xuICAgIGlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJykgbW9kdWxlLmV4cG9ydHMgPSBkZWY7XG4gICAgaWYgKHR5cGVvZiBDaXRhdGlvbiAhPT0gJ3VuZGVmaW5lZCcgJiYgQ2l0YXRpb24udHlwZXMpIENpdGF0aW9uLnR5cGVzLmNmciA9IGRlZjtcbn0pKHtcbiAgdHlwZTogXCJyZWdleFwiLFxuXG4gIHN0YW5kYXJkaXplOiBmdW5jdGlvbihkYXRhKSB7XG4gICAgdmFyIHNlY3Rpb24gPSBkYXRhLnNlY3Rpb24gfHwgZGF0YS5wYXJ0O1xuICAgIHJldHVybiB7XG4gICAgICBpZDogdW5kZXJzY29yZS5jb21wYWN0KHVuZGVyc2NvcmUuZmxhdHRlbihbXCJjZnJcIiwgZGF0YS50aXRsZSwgc2VjdGlvbiwgZGF0YS5zdWJzZWN0aW9uc10pKS5qb2luKFwiL1wiKVxuICAgIH07XG4gIH0sXG5cbiAgcGF0dGVybnM6IFtcbiAgICAvLyBkb25lOlxuICAgIC8vIDE0IENGUiBwYXJ0IDI1XG4gICAgLy8gMzggQ0ZSIFBhcnQgNzQuMlxuICAgIC8vIDQ4IENGUiDCpyA5OTAzLjIwMVxuICAgIC8vIDI0IENGUiA4NS4yNShoKVxuICAgIC8vIDUgQ0ZSIMKnNTMxLjYxMChmKVxuICAgIC8vIDQ1IEMuRi5SLiAzMDA5LjRcbiAgICAvLyA0NyBDRlIgNTQuNTA2IChjKVxuICAgIC8vICAgYnV0IG5vdDogNDcgQ0ZSIDU0LjUwNiAod2hhdGV2ZXIpXG4gICAgLy8gNUNGUiwgcGFydCA1NzVcblxuICAgIC8vIG1heWJlOlxuICAgIC8vIDEzIENGUiBQYXJ0cyAxMjUgYW5kIDEzNFxuICAgIC8vIDVDRlIsIHBhcnQgNTc1LCBzdWJwYXJ0IENcbiAgICAvLyAyMyBDRlIgNjUwLCBTdWJwYXJ0IEFcbiAgICB7XG4gICAgICByZWdleDpcbiAgICAgICAgXCIoXFxcXGQrKVxcXFxzP1wiICtcbiAgICAgICAgXCJDXFxcXC4/XFxcXHM/RlxcXFwuP1xcXFxzP1JcXFxcLj9cIiArXG4gICAgICAgIFwiKD86W1xcXFxzLF0rKD86wqcrfHBhcnRzPykpP1wiICtcbiAgICAgICAgXCJcXFxccyooKD86XFxcXGQrXFxcXC4/XFxcXGQqKD86XFxcXHMqXFxcXCgoPzpbYS16QS1aXFxcXGRdezEsMn18W2l4dklYVl0rKVxcXFwpKSopKylcIixcblxuICAgICAgZmllbGRzOiBbJ3RpdGxlJywgJ3NlY3Rpb25zJ10sXG5cbiAgICAgIHByb2Nlc3NvcjogZnVuY3Rpb24oY2FwdHVyZXMpIHtcbiAgICAgICAgdmFyIHRpdGxlID0gY2FwdHVyZXMudGl0bGU7XG4gICAgICAgIHZhciBwYXJ0LCBzZWN0aW9uLCBzdWJzZWN0aW9ucztcblxuICAgICAgICAvLyBzZXBhcmF0ZSBzdWJzZWN0aW9ucyBmb3IgZWFjaCBzZWN0aW9uIGJlaW5nIGNvbnNpZGVyZWRcbiAgICAgICAgdmFyIHNwbGl0ID0gdW5kZXJzY29yZS5jb21wYWN0KGNhcHR1cmVzLnNlY3Rpb25zLnNwbGl0KC9bXFwoXFwpXSsvKSk7XG4gICAgICAgIHNlY3Rpb24gPSBzcGxpdFswXS50cmltKCk7XG4gICAgICAgIHN1YnNlY3Rpb25zID0gc3BsaXQuc3BsaWNlKDEpO1xuXG4gICAgICAgIGlmIChzZWN0aW9uLmluZGV4T2YoXCIuXCIpID4gMCkge1xuICAgICAgICAgIHBhcnQgPSBzZWN0aW9uLnNwbGl0KFwiLlwiKVswXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBwYXJ0ID0gc2VjdGlvbjtcbiAgICAgICAgICBzZWN0aW9uID0gbnVsbDtcbiAgICAgICAgICBzdWJzZWN0aW9ucyA9IG51bGw7IC8vIGRvbid0IGluY2x1ZGUgZW1wdHkgYXJyYXlcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgdGl0bGU6IHRpdGxlLFxuICAgICAgICAgIHBhcnQ6IHBhcnQsXG4gICAgICAgICAgc2VjdGlvbjogc2VjdGlvbixcbiAgICAgICAgICBzdWJzZWN0aW9uczogc3Vic2VjdGlvbnNcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyB0b2RvOlxuICAgIC8vIHBhcnRzIDEyMSBhbmQgMTM1IG9mIFRpdGxlIDE0IG9mIHRoZSBDb2RlIG9mIEZlZGVyYWwgUmVndWxhdGlvbnNcbiAgICAvLyB7XG4gICAgLy8gICByZWdleDpcbiAgICAvLyAgICAgXCJzZWN0aW9uIChcXFxcZCtbXFxcXHdcXFxcZFxcLV0qKSgoPzpcXFxcKFteXFxcXCldK1xcXFwpKSopXCIgK1xuICAgIC8vICAgICBcIig/OlxcXFxzK29mfFxcXFwsKSB0aXRsZSAoXFxcXGQrKVwiLFxuICAgIC8vICAgZmllbGRzOiBbJ3NlY3Rpb24nLCAnc3Vic2VjdGlvbnMnLCAndGl0bGUnXSxcbiAgICAvLyAgIHByb2Nlc3NvcjogZnVuY3Rpb24oY2FwdHVyZXMpIHtcbiAgICAvLyAgICAgcmV0dXJuIHtcbiAgICAvLyAgICAgICB0aXRsZTogY2FwdHVyZXMudGl0bGUsXG4gICAgLy8gICAgICAgc2VjdGlvbjogY2FwdHVyZXMuc2VjdGlvbixcbiAgICAvLyAgICAgICBzdWJzZWN0aW9uczogdW5kZXJzY29yZS5jb21wYWN0KGNhcHR1cmVzLnN1YnNlY3Rpb25zLnNwbGl0KC9bXFwoXFwpXSsvKSlcbiAgICAvLyAgICAgfTtcbiAgICAvLyAgIH1cbiAgICAvLyB9XG4gIF1cbn0pO1xuIiwiKGZ1bmN0aW9uKGRlZikge1xuICAgIGlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJykgbW9kdWxlLmV4cG9ydHMgPSBkZWY7XG4gICAgaWYgKHR5cGVvZiBDaXRhdGlvbiAhPT0gJ3VuZGVmaW5lZCcgJiYgQ2l0YXRpb24udHlwZXMpIENpdGF0aW9uLnR5cGVzLmRjX2NvZGUgPSBkZWY7XG59KSh7XG4gIHR5cGU6IFwicmVnZXhcIixcblxuICAvLyBub3JtYWxpemUgYWxsIGNpdGVzIHRvIGFuIElELCB3aXRoIGFuZCB3aXRob3V0IHN1YnNlY3Rpb25zXG4gIHN0YW5kYXJkaXplOiBmdW5jdGlvbihkYXRhKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGlkOiB1bmRlcnNjb3JlLmZsYXR0ZW4oW1wiZGMtY29kZVwiLCBkYXRhLnRpdGxlLCBkYXRhLnNlY3Rpb24sIGRhdGEuc3Vic2VjdGlvbnNdKS5qb2luKFwiL1wiKSxcbiAgICAgIHNlY3Rpb25faWQ6IFtcImRjLWNvZGVcIiwgZGF0YS50aXRsZSwgZGF0YS5zZWN0aW9uXS5qb2luKFwiL1wiKVxuICAgIH07XG4gIH0sXG5cbiAgLy8gZmllbGQgdG8gY2FsY3VsYXRlIHBhcmVudHMgZnJvbVxuICBwYXJlbnRzX2J5OiBcInN1YnNlY3Rpb25zXCIsXG5cbiAgcGF0dGVybnM6IGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgICAvLyBvbmx5IGFwcGx5IHRoaXMgcmVnZXggaWYgd2UncmUgY29uZmlkZW50IHRoYXQgcmVsYXRpdmUgY2l0YXRpb25zIHJlZmVyIHRvIHRoZSBEQyBDb2RlXG4gICAgaWYgKGNvbnRleHQuc291cmNlID09IFwiZGNfY29kZVwiKSB7XG4gICAgICByZXR1cm4gW1xuXG4gICAgICAgIC8vIMKnIDMyLTcwMVxuICAgICAgICAvLyDCpyAzMi03MDEoNClcbiAgICAgICAgLy8gwqcgMy0xMDEuMDFcbiAgICAgICAgLy8gwqcgMS02MDMuMDEoMTMpXG4gICAgICAgIC8vIMKnIDEtIDExNjMuMzNcbiAgICAgICAgLy8gwqcgMSAtMTE2My4zM1xuICAgICAgICAvLyBzZWN0aW9uIDE2LTIzMjYuMDFcbiAgICAgICAge1xuICAgICAgICAgIHJlZ2V4OlxuICAgICAgICAgICAgXCIoPzpzZWN0aW9uKD86cyk/fMKnKylcXFxccysoXFxcXGQrQT8pXCIgK1xuICAgICAgICAgICAgXCJcXFxccz9cXFxcLVxcXFxzP1wiICtcbiAgICAgICAgICAgIFwiKFtcXFxcd1xcXFxkXSsoPzpcXFxcLj9bXFxcXHdcXFxcZF0rKT8pXCIgKyAgLy8gc2VjdGlvbiBpZGVudGlmaWVyLCBsZXR0ZXJzL251bWJlcnMvZG90c1xuICAgICAgICAgICAgXCIoKD86XFxcXChbXlxcXFwpXStcXFxcKSkqKVwiLCAvLyBhbnkgbnVtYmVyIG9mIGFkamFjZW50IHBhcmVudGhlc2l6ZWQgc3Vic2VjdGlvbnNcblxuICAgICAgICAgIGZpZWxkczogW1widGl0bGVcIiwgXCJzZWN0aW9uXCIsIFwic3Vic2VjdGlvbnNcIl0sXG5cbiAgICAgICAgICBwcm9jZXNzb3I6IGZ1bmN0aW9uKGNhcHR1cmVzKSB7XG4gICAgICAgICAgICB2YXIgdGl0bGUgPSBjYXB0dXJlcy50aXRsZTtcbiAgICAgICAgICAgIHZhciBzZWN0aW9uID0gY2FwdHVyZXMuc2VjdGlvbjtcbiAgICAgICAgICAgIHZhciBzdWJzZWN0aW9ucyA9IFtdO1xuICAgICAgICAgICAgaWYgKGNhcHR1cmVzLnN1YnNlY3Rpb25zKSBzdWJzZWN0aW9ucyA9IHVuZGVyc2NvcmUuY29tcGFjdChjYXB0dXJlcy5zdWJzZWN0aW9ucy5zcGxpdCgvW1xcKFxcKV0rLykpO1xuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICB0aXRsZTogdGl0bGUsXG4gICAgICAgICAgICAgIHNlY3Rpb246IHNlY3Rpb24sXG4gICAgICAgICAgICAgIHN1YnNlY3Rpb25zOiBzdWJzZWN0aW9uc1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIF07XG4gICAgfVxuXG4gICAgLy8gYWJzb2x1dGUgY2l0ZXNcbiAgICBlbHNlIHtcbiAgICAgIHJldHVybiBbXG5cbiAgICAgICAgLy8gRC5DLiBPZmZpY2lhbCBDb2RlIDMtMTIwMi4wNFxuICAgICAgICAvLyBELkMuIE9mZmljaWFsIENvZGUgwqcgMy0xMjAxLjAxXG4gICAgICAgIC8vIEQuQy4gT2ZmaWNpYWwgQ29kZSDCp8KnIDM4LTI2MDIoYikoMTEpXG4gICAgICAgIC8vIEQuQy4gT2ZmaWNpYWwgQ29kZSDCpyAzLSAxMjAxLjAxXG4gICAgICAgIC8vIEQuQy4gT2ZmaWNpYWwgQ29kZSDCpyAzIC0xMjAxLjAxXG4gICAgICAgIHtcbiAgICAgICAgICByZWdleDpcbiAgICAgICAgICAgIFwiRFxcXFwuP0NcXFxcLj8gT2ZmaWNpYWwgQ29kZVxcXFxzK1wiICsgLy8gYWJzb2x1dGUgaWRlbnRpZmllclxuICAgICAgICAgICAgXCIoPzrCpytcXFxccyspPyhcXFxcZCtBPylcIiArICAgICAgICAgICAgLy8gb3B0aW9uYWwgc2VjdGlvbiBzaWduLCBwbHVzIHRpdGxlXG4gICAgICAgICAgICBcIlxcXFxzP1xcXFwtXFxcXHM/XCIgK1xuICAgICAgICAgICAgXCIoW1xcXFx3XFxcXGRdKyg/OlxcXFwuP1tcXFxcd1xcXFxkXSspPylcIiArICAgICAgLy8gc2VjdGlvbiBpZGVudGlmaWVyLCBsZXR0ZXJzL251bWJlcnMvZG90c1xuICAgICAgICAgICAgXCIoKD86XFxcXChbXlxcXFwpXStcXFxcKSkqKVwiLCAvLyBhbnkgbnVtYmVyIG9mIGFkamFjZW50IHBhcmVudGhlc2l6ZWQgc3Vic2VjdGlvbnNcblxuICAgICAgICAgIGZpZWxkczogW1widGl0bGVcIiwgXCJzZWN0aW9uXCIsIFwic3Vic2VjdGlvbnNcIl0sXG5cbiAgICAgICAgICBwcm9jZXNzb3I6IGZ1bmN0aW9uKGNhcHR1cmVzKSB7XG4gICAgICAgICAgICB2YXIgdGl0bGUgPSBjYXB0dXJlcy50aXRsZTtcbiAgICAgICAgICAgIHZhciBzZWN0aW9uID0gY2FwdHVyZXMuc2VjdGlvbjtcblxuICAgICAgICAgICAgdmFyIHN1YnNlY3Rpb25zID0gW107XG4gICAgICAgICAgICBpZiAoY2FwdHVyZXMuc3Vic2VjdGlvbnMpIHN1YnNlY3Rpb25zID0gdW5kZXJzY29yZS5jb21wYWN0KGNhcHR1cmVzLnN1YnNlY3Rpb25zLnNwbGl0KC9bXFwoXFwpXSsvKSk7XG5cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgIHRpdGxlOiB0aXRsZSxcbiAgICAgICAgICAgICAgc2VjdGlvbjogc2VjdGlvbixcbiAgICAgICAgICAgICAgc3Vic2VjdGlvbnM6IHN1YnNlY3Rpb25zXG4gICAgICAgICAgICB9O1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgXTtcbiAgICB9XG4gIH1cbn0pO1xuIiwiKGZ1bmN0aW9uKGRlZikge1xuICAgIGlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJykgbW9kdWxlLmV4cG9ydHMgPSBkZWY7XG4gICAgaWYgKHR5cGVvZiBDaXRhdGlvbiAhPT0gJ3VuZGVmaW5lZCcgJiYgQ2l0YXRpb24udHlwZXMpIENpdGF0aW9uLnR5cGVzLmRjX2xhdyA9IGRlZjtcbn0pKHtcbiAgdHlwZTogXCJyZWdleFwiLFxuXG4gIHN0YW5kYXJkaXplOiBmdW5jdGlvbihjaXRlKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGlkOiBbXCJkYy1sYXdcIiwgY2l0ZS5wZXJpb2QsIGNpdGUubnVtYmVyXS5qb2luKFwiL1wiKVxuICAgIH07XG4gIH0sXG5cbiAgcGF0dGVybnM6IGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgICAvLyBJZiB0aGUgY29udGV4dCBmb3IgdGhpcyBjaXRhdGlvbiBpcyB0aGUgREMgQ29kZSwgdGhlbiBMYXcgWFgtWVlZIGNhbiBiZSBhc3N1bWVkXG4gICAgLy8gdG8gYmUgYSBEQyBsYXcuIEluIG90aGVyIGNvbnRleHQsIHJlcXVpcmUgdGhlIFwiREMgTGF3XCIgcHJlZml4LlxuICAgIHZhciBjb250ZXh0X3JlZ2V4ID0gXCJcIjtcbiAgICBpZiAoY29udGV4dC5zb3VyY2UgIT0gXCJkY19jb2RlXCIpXG4gICAgICBjb250ZXh0X3JlZ2V4ID0gXCJEXFxcXC4/XFxcXHMqQ1xcXFwuP1xcXFxzK1wiO1xuXG4gICAgcmV0dXJuIFtcbiAgICAgIC8vIFwiRC5DLiBMYXcgMTExLTg5XCJcbiAgICAgIC8vIFwiREMgTGF3IDExMS04OVwiXG4gICAgICAvLyBcIkRDIExhdyAxOC0xMzVBXCJcbiAgICAgIHtcbiAgICAgICAgcmVnZXg6XG4gICAgICAgICAgY29udGV4dF9yZWdleCArIFwiTGF3XFxcXHMrKFxcXFxkKylcXFxccz9bLeKAk10rXFxcXHM/KFxcXFxkK1xcXFx3PylcIixcbiAgICAgICAgZmllbGRzOiBbXCJwZXJpb2RcIiwgXCJudW1iZXJcIl0sXG4gICAgICAgIHByb2Nlc3NvcjogZnVuY3Rpb24oY2FwdHVyZXMpIHtcbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcGVyaW9kOiBjYXB0dXJlcy5wZXJpb2QsXG4gICAgICAgICAgICBudW1iZXI6IGNhcHR1cmVzLm51bWJlclxuICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICBdO1xuICB9XG59KTtcbiIsIihmdW5jdGlvbihkZWYpIHtcbiAgICBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcpIG1vZHVsZS5leHBvcnRzID0gZGVmO1xuICAgIGlmICh0eXBlb2YgQ2l0YXRpb24gIT09ICd1bmRlZmluZWQnICYmIENpdGF0aW9uLnR5cGVzKSBDaXRhdGlvbi50eXBlcy5kY19yZWdpc3RlciA9IGRlZjtcbn0pKHtcbiAgdHlwZTogXCJyZWdleFwiLFxuXG4gIC8vIG5vcm1hbGl6ZSBhbGwgY2l0ZXMgdG8gYW4gSURcbiAgc3RhbmRhcmRpemU6IGZ1bmN0aW9uKG1hdGNoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGlkOiB1bmRlcnNjb3JlLmZsYXR0ZW4oW1wiZGMtcmVnaXN0ZXJcIiwgbWF0Y2gudm9sdW1lLCBtYXRjaC5wYWdlXSkuam9pbihcIi9cIilcbiAgICB9O1xuICB9LFxuXG4gIHBhdHRlcm5zOiBbXG4gICAgLy8gNTQgRENSIDgwMTRcbiAgICB7XG4gICAgICByZWdleDpcbiAgICAgICAgXCIoXFxcXGQrKVxcXFxzK1wiICtcbiAgICAgICAgXCJEQ1JcIiArXG4gICAgICAgIFwiXFxcXHMrKFxcXFxkKylcIixcbiAgICAgIGZpZWxkczogWyd2b2x1bWUnLCAncGFnZSddLFxuICAgICAgcHJvY2Vzc29yOiBmdW5jdGlvbihtYXRjaCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIHZvbHVtZTogbWF0Y2gudm9sdW1lLFxuICAgICAgICAgIHBhZ2U6IG1hdGNoLnBhZ2UsXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfVxuICBdXG59KTtcbiIsImlmICh0eXBlb2YocmVxdWlyZSkgIT09IFwidW5kZWZpbmVkXCIpXG4gIHdhbHZlcmluZSA9IHJlcXVpcmUoXCJ3YWx2ZXJpbmVcIik7XG5cbihmdW5jdGlvbihkZWYpIHtcbiAgICBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcpIG1vZHVsZS5leHBvcnRzID0gZGVmO1xuICAgIGlmICh0eXBlb2YgQ2l0YXRpb24gIT09ICd1bmRlZmluZWQnICYmIENpdGF0aW9uLnR5cGVzKSBDaXRhdGlvbi50eXBlcy5qdWRpY2lhbCA9IGRlZjtcbn0pKHtcbiAgdHlwZTogXCJleHRlcm5hbFwiLFxuXG4gIGV4dHJhY3Q6IGZ1bmN0aW9uKHRleHQpIHtcbiAgICByZXR1cm4gd2FsdmVyaW5lLmdldF9jaXRhdGlvbnModGV4dCkubWFwKGZ1bmN0aW9uKGNpdGUpIHtcbiAgICAgIHZhciByZXN1bHQgPSB7fTtcbiAgICAgIHJlc3VsdC5tYXRjaCA9IGNpdGUubWF0Y2g7XG4gICAgICByZXN1bHQuanVkaWNpYWwgPSB1bmRlcnNjb3JlLm9taXQoY2l0ZSwgXCJtYXRjaFwiKTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSk7XG4gIH1cbn0pOyIsIihmdW5jdGlvbihkZWYpIHtcbiAgICBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcpIG1vZHVsZS5leHBvcnRzID0gZGVmO1xuICAgIGlmICh0eXBlb2YgQ2l0YXRpb24gIT09ICd1bmRlZmluZWQnICYmIENpdGF0aW9uLnR5cGVzKSBDaXRhdGlvbi50eXBlcy5sYXcgPSBkZWY7XG59KSh7XG4gIHR5cGU6IFwicmVnZXhcIixcblxuICBzdGFuZGFyZGl6ZTogZnVuY3Rpb24oY2l0ZSkge1xuICAgIHJldHVybiB7XG4gICAgICBpZDogdW5kZXJzY29yZS5mbGF0dGVuKFtcInVzLWxhd1wiLCBjaXRlLnR5cGUsIGNpdGUuY29uZ3Jlc3MsIGNpdGUubnVtYmVyLCBjaXRlLnNlY3Rpb25zXSkuam9pbihcIi9cIiksXG4gICAgICBsYXdfaWQ6IFtcInVzLWxhd1wiLCBjaXRlLnR5cGUsIGNpdGUuY29uZ3Jlc3MsIGNpdGUubnVtYmVyXS5qb2luKFwiL1wiKVxuICAgIH07XG4gIH0sXG5cbiAgLy8gZmllbGQgdG8gY2FsY3VsYXRlIHBhcmVudHMgZnJvbVxuICBwYXJlbnRzX2J5OiBcInNlY3Rpb25zXCIsXG5cbiAgcGF0dGVybnM6IFtcbiAgICAvLyBcIlB1YmxpYyBMYXcgMTExLTg5XCJcbiAgICAvLyBcIlB1Yi4gTC4gMTEyLTU2XCJcbiAgICAvLyBcIlB1Yi4gTC4gTm8uIDExMC0yXCJcbiAgICAvLyBcIlB1Yi5MLiAxMDUtMzNcIlxuICAgIC8vIFwiUHJpdmF0ZSBMYXcgMTExLTcyXCJcbiAgICAvLyBcIlByaXYuIEwuIE5vLiA5OC0yM1wiXG4gICAgLy8gXCJzZWN0aW9uIDU1MiBvZiBQdWJsaWMgTGF3IDExMS04OVwiXG4gICAgLy8gXCJzZWN0aW9uIDQ0MDIoZSkoMSkgb2YgUHVibGljIExhdyAxMTAtMlwiXG4gICAge1xuICAgICAgcmVnZXg6XG4gICAgICAgIFwiKD86c2VjdGlvbiAoXFxcXGQrW1xcXFx3XFxcXGRcXC1dKikoKD86XFxcXChbXlxcXFwpXStcXFxcKSkqKSBvZiApP1wiICtcbiAgICAgICAgXCIocHViKD86bGljKT98cHJpdig/OmF0ZSk/KVxcXFwuP1xcXFxzKmwoPzphdyk/XFxcXC4/KD86XFxcXHMqTm9cXFxcLj8pP1wiICtcbiAgICAgICAgXCIgKyhcXFxcZCspWy3igJNdKyhcXFxcZCspXCIsXG4gICAgICBmaWVsZHM6IFsnc2VjdGlvbicsICdzdWJzZWN0aW9ucycsICd0eXBlJywgJ2NvbmdyZXNzJywgJ251bWJlciddLFxuICAgICAgcHJvY2Vzc29yOiBmdW5jdGlvbihjYXB0dXJlcykge1xuICAgICAgICB2YXIgc2VjdGlvbnMgPSBbXTtcbiAgICAgICAgaWYgKGNhcHR1cmVzLnNlY3Rpb24pIHNlY3Rpb25zLnB1c2goY2FwdHVyZXMuc2VjdGlvbik7XG4gICAgICAgIGlmIChjYXB0dXJlcy5zdWJzZWN0aW9ucykgc2VjdGlvbnMgPSBzZWN0aW9ucy5jb25jYXQodW5kZXJzY29yZS5jb21wYWN0KGNhcHR1cmVzLnN1YnNlY3Rpb25zLnNwbGl0KC9bXFwoXFwpXSsvKSkpO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgdHlwZTogY2FwdHVyZXMudHlwZS5tYXRjaCgvXnByaXYvaSkgPyBcInByaXZhdGVcIiA6IFwicHVibGljXCIsXG4gICAgICAgICAgY29uZ3Jlc3M6IGNhcHR1cmVzLmNvbmdyZXNzLFxuICAgICAgICAgIG51bWJlcjogY2FwdHVyZXMubnVtYmVyLFxuICAgICAgICAgIHNlY3Rpb25zOiBzZWN0aW9uc1xuICAgICAgICB9O1xuICAgICAgfVxuICAgIH0sXG5cbiAgICAvLyBcIlBMIDE5LTRcIlxuICAgIC8vIFwiUC5MLiA0NS03OFwiXG4gICAgLy8gXCJzZWN0aW9uIDU1MiBvZiBQTCAxOS00XCJcbiAgICAvLyBcInNlY3Rpb24gNDQwMihlKSgxKSBvZiBQTCAxOS00XCJcbiAgICB7XG4gICAgICByZWdleDpcbiAgICAgICAgXCIoPzpzZWN0aW9uIChcXFxcZCtbXFxcXHdcXFxcZFxcLV0qKSgoPzpcXFxcKFteXFxcXCldK1xcXFwpKSopIG9mICk/XCIgK1xuICAgICAgICBcIlBcXFxcLj9MXFxcXC4/ICsoXFxcXGQrKVst4oCTXShcXFxcZCspXCIsXG4gICAgICBmaWVsZHM6IFsnc2VjdGlvbicsICdzdWJzZWN0aW9ucycsICdjb25ncmVzcycsICdudW1iZXInXSxcbiAgICAgIHByb2Nlc3NvcjogZnVuY3Rpb24oY2FwdHVyZXMpIHtcbiAgICAgICAgc2VjdGlvbnMgPSBbXTtcbiAgICAgICAgaWYgKGNhcHR1cmVzLnNlY3Rpb24pIHNlY3Rpb25zLnB1c2goY2FwdHVyZXMuc2VjdGlvbik7XG4gICAgICAgIGlmIChjYXB0dXJlcy5zdWJzZWN0aW9ucykgc2VjdGlvbnMgPSBzZWN0aW9ucy5jb25jYXQodW5kZXJzY29yZS5jb21wYWN0KGNhcHR1cmVzLnN1YnNlY3Rpb25zLnNwbGl0KC9bXFwoXFwpXSsvKSkpO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgdHlwZTogXCJwdWJsaWNcIixcbiAgICAgICAgICBjb25ncmVzczogY2FwdHVyZXMuY29uZ3Jlc3MsXG4gICAgICAgICAgbnVtYmVyOiBjYXB0dXJlcy5udW1iZXIsXG4gICAgICAgICAgc2VjdGlvbnM6IHNlY3Rpb25zXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfVxuICBdXG59KTtcbiIsIihmdW5jdGlvbihkZWYpIHtcbiAgICBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcpIG1vZHVsZS5leHBvcnRzID0gZGVmO1xuICAgIGlmICh0eXBlb2YgQ2l0YXRpb24gIT09ICd1bmRlZmluZWQnICYmIENpdGF0aW9uLnR5cGVzKSBDaXRhdGlvbi50eXBlcy5zdGF0ID0gZGVmO1xufSkoe1xuICB0eXBlOiBcInJlZ2V4XCIsXG5cbiAgLy8gbm9ybWFsaXplIGFsbCBjaXRlcyB0byBhbiBJRFxuICBzdGFuZGFyZGl6ZTogZnVuY3Rpb24oY2l0ZSkge1xuICAgIHJldHVybiB7XG4gICAgICBpZDogdW5kZXJzY29yZS5mbGF0dGVuKFtcInN0YXRcIiwgY2l0ZS52b2x1bWUsIGNpdGUucGFnZV0pLmpvaW4oXCIvXCIpXG4gICAgfTtcbiAgfSxcblxuICBwYXR0ZXJuczogW1xuICAgIC8vIFwiMTE3IFN0YXQuIDE5NTJcIlxuICAgIC8vIFwiNzcgU1RBVC4gNzdcIlxuICAgIHtcbiAgICAgIHJlZ2V4OlxuICAgICAgICBcIihcXFxcZCtbXFxcXHddKilcXFxccytcIiArXG4gICAgICAgIFwiU3RhdFxcXFwuP1wiICtcbiAgICAgICAgXCJcXFxccysoXFxcXGQrKVwiLFxuICAgICAgZmllbGRzOiBbJ3ZvbHVtZScsICdwYWdlJ10sXG4gICAgICBwcm9jZXNzb3I6IGZ1bmN0aW9uKG1hdGNoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgdm9sdW1lOiBtYXRjaC52b2x1bWUsXG4gICAgICAgICAgcGFnZTogbWF0Y2gucGFnZSxcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9XG4gIF1cbn0pO1xuIiwiKGZ1bmN0aW9uKGRlZikge1xuICAgIGlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJykgbW9kdWxlLmV4cG9ydHMgPSBkZWY7XG4gICAgaWYgKHR5cGVvZiBDaXRhdGlvbiAhPT0gJ3VuZGVmaW5lZCcgJiYgQ2l0YXRpb24udHlwZXMpIENpdGF0aW9uLnR5cGVzLnVzYyA9IGRlZjtcbn0pKHtcbiAgdHlwZTogXCJyZWdleFwiLFxuXG4gIC8vIG5vcm1hbGl6ZSBhbGwgY2l0ZXMgdG8gYW4gSUQsIHdpdGggYW5kIHdpdGhvdXQgc3Vic2VjdGlvbnMsXG4gIC8vIFRPRE86IGtpbGwgdGhpcz9cbiAgc3RhbmRhcmRpemU6IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICByZXR1cm4ge1xuICAgICAgaWQ6IHVuZGVyc2NvcmUuZmxhdHRlbihbXCJ1c2NcIiwgZGF0YS50aXRsZSwgZGF0YS5zZWN0aW9uLCBkYXRhLnN1YnNlY3Rpb25zXSkuam9pbihcIi9cIiksXG4gICAgICBzZWN0aW9uX2lkOiBbXCJ1c2NcIiwgZGF0YS50aXRsZSwgZGF0YS5zZWN0aW9uXS5qb2luKFwiL1wiKVxuICAgIH07XG4gIH0sXG5cblxuICAvLyBmaWVsZCB0byBjYWxjdWxhdGUgcGFyZW50cyBmcm9tXG4gIHBhcmVudHNfYnk6IFwic3Vic2VjdGlvbnNcIixcblxuICBwYXR0ZXJuczogW1xuICAgIC8vIFwiNSBVU0MgNTUyXCJcbiAgICAvLyBcIjUgVS5TLkMuIMKnIDU1MihhKSgxKShFKVwiXG4gICAgLy8gXCI3IFUuUy5DLiA2MTJjIG5vdGVcIlxuICAgIC8vIFwiMjkgVS5TLkMuIDEwODEgZXQgc2VxXCJcbiAgICAvLyBcIjUwIFUuUy5DLiBBcHAuIDU5NVwiXG4gICAgLy8gXCI0NSBVLlMuQy4gMTBhLTEwY1wiXG4gICAgLy8gXCI1MCBVLlMuQy4gNDA0by0xKGEpXCIgLSBzaW5nbGUgc2VjdGlvblxuICAgIC8vIFwiNDUgVS5TLkMuIDEwYSgxKS0xMGMoMilcIiAtIHJhbmdlXG4gICAgLy8gXCI1MCBVLlMuQy4gQXBwLiDCp8KnIDQ1MS0tNDczXCIgLSByYW5nZVxuICAgIHtcbiAgICAgIHJlZ2V4OlxuICAgICAgICBcIihcXFxcZCspXFxcXHMrXCIgKyAvLyB0aXRsZVxuICAgICAgICBcIlVcXFxcLj9cXFxccz9TXFxcXC4/XFxcXHM/Q1xcXFwuP1wiICtcbiAgICAgICAgXCIoPzpcXFxccysoQXBwKVxcLj8pP1wiICsgLy8gYXBwZW5kaXhcbiAgICAgICAgXCIoPzpcXFxccysowqcrKSk/XCIgKyAvLyBzeW1ib2xcbiAgICAgICAgXCJcXFxccysoKD86XFxcXC0qXFxcXGQrW1xcXFx3XFxcXGRcXFxcLV0qKD86XFxcXChbXlxcXFwpXStcXFxcKSkqKSspXCIgKyAvLyBzZWN0aW9uc1xuICAgICAgICBcIig/OlxcXFxzKyhub3RlfGV0XFxcXHMrc2VxKSk/XCIsIC8vIG5vdGVcblxuICAgICAgZmllbGRzOiBbXG4gICAgICAgICd0aXRsZScsICdhcHBlbmRpeCcsXG4gICAgICAgICdzeW1ib2wnLCAnc2VjdGlvbnMnLCAnbm90ZSdcbiAgICAgIF0sXG5cbiAgICAgIHByb2Nlc3NvcjogZnVuY3Rpb24obWF0Y2gpIHtcbiAgICAgICAgLy8gYSBmZXcgdGl0bGVzIGhhdmUgZGlzdGluY3QgYXBwZW5kaXhlc1xuICAgICAgICB2YXIgdGl0bGUgPSBtYXRjaC50aXRsZTtcbiAgICAgICAgaWYgKG1hdGNoLmFwcGVuZGl4KSB0aXRsZSArPSBcIi1hcHBcIjtcblxuICAgICAgICB2YXIgc2VjdGlvbnMgPSBtYXRjaC5zZWN0aW9ucy5zcGxpdCgvLSsvKTtcblxuICAgICAgICB2YXIgcmFuZ2UgPSBmYWxzZTtcblxuICAgICAgICAvLyB0d28gc2VjdGlvbiBzeW1ib2xzIGlzIHVuYW1iaWd1b3VzXG4gICAgICAgIGlmIChtYXRjaC5zeW1ib2wgPT0gXCLCp8KnXCIpIC8vIDIgc2VjdGlvbiBzeW1ib2xzXG4gICAgICAgICAgcmFuZ2UgPSB0cnVlO1xuXG4gICAgICAgIC8vIHBhcmVuIGJlZm9yZSBkYXNoIGlzIHVuYW1iaWd1b3VzXG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIHZhciBkYXNoID0gbWF0Y2guc2VjdGlvbnMuaW5kZXhPZihcIi1cIik7XG4gICAgICAgICAgdmFyIHBhcmVuID0gbWF0Y2guc2VjdGlvbnMuaW5kZXhPZihcIihcIik7XG4gICAgICAgICAgaWYgKGRhc2ggPiAwICYmIHBhcmVuID4gMCAmJiBwYXJlbiA8IGRhc2gpXG4gICAgICAgICAgICByYW5nZSA9IHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBpZiB0aGVyZSdzIGEgaHlwaGVuIGFuZCB0aGUgcmFuZ2UgaXMgYW1iaWd1b3VzLFxuICAgICAgICAvLyBhbHNvIHJldHVybiB0aGUgb3JpZ2luYWwgc2VjdGlvbiBzdHJpbmcgYXMgb25lXG4gICAgICAgIGlmICgoc2VjdGlvbnMubGVuZ3RoID4gMSkgJiYgIXJhbmdlKVxuICAgICAgICAgIHNlY3Rpb25zLnVuc2hpZnQobWF0Y2guc2VjdGlvbnMpO1xuXG4gICAgICAgIHJldHVybiBzZWN0aW9ucy5tYXAoZnVuY3Rpb24oc2VjdGlvbikge1xuICAgICAgICAgIC8vIHNlcGFyYXRlIHN1YnNlY3Rpb25zIGZvciBlYWNoIHNlY3Rpb24gYmVpbmcgY29uc2lkZXJlZFxuICAgICAgICAgIHZhciBzcGxpdCA9IHVuZGVyc2NvcmUuY29tcGFjdChzZWN0aW9uLnNwbGl0KC9bXFwoXFwpXSsvKSk7XG4gICAgICAgICAgc2VjdGlvbiA9IHNwbGl0WzBdO1xuICAgICAgICAgIHN1YnNlY3Rpb25zID0gc3BsaXQuc3BsaWNlKDEpO1xuICAgICAgICAgIGlmIChtYXRjaC5ub3RlKVxuICAgICAgICAgICAgc3Vic2VjdGlvbnMucHVzaChtYXRjaC5ub3RlLnJlcGxhY2UoXCIgXCIsIFwiLVwiKSk7IC8vIFwibm90ZVwiIG9yIFwiZXQgc2VxXCJcblxuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0aXRsZTogdGl0bGUsXG4gICAgICAgICAgICBzZWN0aW9uOiBzZWN0aW9uLFxuICAgICAgICAgICAgc3Vic2VjdGlvbnM6IHN1YnNlY3Rpb25zXG4gICAgICAgICAgfTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSxcblxuICAgIC8vIFwic2VjdGlvbiA1NTIgb2YgdGl0bGUgNVwiXG4gICAgLy8gXCJzZWN0aW9uIDU1MiwgdGl0bGUgNVwiXG4gICAgLy8gXCJzZWN0aW9uIDU1MihhKSgxKShFKSBvZiB0aXRsZSA1XCJcbiAgICAvLyBcInNlY3Rpb24gNDA0by0xKGEpIG9mIHRpdGxlIDUwXCJcbiAgICB7XG4gICAgICByZWdleDpcbiAgICAgICAgXCJzZWN0aW9uIChcXFxcZCtbXFxcXHdcXFxcZFxcLV0qKSgoPzpcXFxcKFteXFxcXCldK1xcXFwpKSopXCIgK1xuICAgICAgICBcIig/OlxcXFxzK29mfFxcXFwsKSB0aXRsZSAoXFxcXGQrKVwiLFxuXG4gICAgICBmaWVsZHM6IFsnc2VjdGlvbicsICdzdWJzZWN0aW9ucycsICd0aXRsZSddLFxuXG4gICAgICBwcm9jZXNzb3I6IGZ1bmN0aW9uKG1hdGNoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgdGl0bGU6IG1hdGNoLnRpdGxlLFxuICAgICAgICAgIHNlY3Rpb246IG1hdGNoLnNlY3Rpb24sXG4gICAgICAgICAgc3Vic2VjdGlvbnM6IHVuZGVyc2NvcmUuY29tcGFjdChtYXRjaC5zdWJzZWN0aW9ucy5zcGxpdCgvW1xcKFxcKV0rLykpXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfVxuICBdXG59KTtcbiIsIihmdW5jdGlvbihkZWYpIHtcbiAgICBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcpIG1vZHVsZS5leHBvcnRzID0gZGVmO1xuICAgIGlmICh0eXBlb2YgQ2l0YXRpb24gIT09ICd1bmRlZmluZWQnICYmIENpdGF0aW9uLnR5cGVzKSBDaXRhdGlvbi50eXBlcy52YV9jb2RlID0gZGVmO1xufSkoe1xuICB0eXBlOiBcInJlZ2V4XCIsXG5cbiAgc3RhbmRhcmRpemU6IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICByZXR1cm4ge1xuICAgICAgaWQ6IFtcInZhLWNvZGVcIiwgZGF0YS50aXRsZSwgZGF0YS5zZWN0aW9uXS5qb2luKFwiL1wiKVxuICAgIH07XG4gIH0sXG5cbiAgcGF0dGVybnM6IFtcblxuICAgIC8vIFZhLiBDb2RlIEFubi4gwqcgMTkuMi01Ni4yICgyMDEwKVxuICAgIC8vIFZhLiBDb2RlIEFubi4gwqcgMTkuMi01Ni4yIChXZXN0IDIwMTApXG4gICAgLy8gVmEuIENvZGUgQW5uLiDCpyA1Ny0xXG4gICAgLy8gVmEuIENvZGUgQW5uLiDCpyA1Ny0yLjAyXG4gICAgLy8gVmEuIENvZGUgQW5uLiDCpyA2My4yLTMwMFxuICAgIC8vIFZhLiBDb2RlIEFubi4gwqcgNjYtMjUuMToxXG4gICAgLy8gVmEuIENvZGUgwqcgNjYtMjUuMToxXG4gICAgLy8gVkEgQ29kZSDCpyA2Ni0yNS4xOjFcbiAgICB7XG4gICAgICByZWdleDpcbiAgICAgICAgXCJWYVxcXFwuPyBDb2RlXFxcXC4/XCIgK1xuICAgICAgICBcIig/OlxcXFxzK0FublxcXFwuPyk/XCIgK1xuICAgICAgICBcIig/OlxcXFxzK8KnKyk/XCIgK1xuICAgICAgICBcIlxcXFxzKyhbXFxcXGRcXFxcLl0rKVxcXFwtKFtcXFxcZFxcXFwuOl0rKVwiICtcbiAgICAgICAgXCIoPzpcXFxccytcXFxcKCg/Oldlc3QgKT8oWzEyXVxcXFxkezN9KVxcXFwpKT9cIixcbiAgICAgIGZpZWxkczogWyd0aXRsZScsICdzZWN0aW9uJywgJ3llYXInXSxcbiAgICAgIHByb2Nlc3NvcjogZnVuY3Rpb24gKGNhcHR1cmVzKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgdGl0bGU6IGNhcHR1cmVzLnRpdGxlLFxuICAgICAgICAgIHNlY3Rpb246IGNhcHR1cmVzLnNlY3Rpb24sXG4gICAgICAgICAgeWVhcjogY2FwdHVyZXMueWVhclxuICAgICAgICB9O1xuICAgICAgfVxuICAgIH1cbiAgXVxufSk7XG4iLCIvKiBDaXRhdGlvbi5qcyAtIGEgbGVnYWwgY2l0YXRpb24gZXh0cmFjdG9yLlxuICpcbiAqIE9wZW4gc291cmNlLCBkZWRpY2F0ZWQgdG8gdGhlIHB1YmxpYyBkb21haW46IGh0dHBzOi8vZ2l0aHViLmNvbS91bml0ZWRzdGF0ZXMvY2l0YXRpb25cbiAqXG4gKiBPcmlnaW5hbGx5IGF1dGhvcmVkIGJ5IEVyaWMgTWlsbCAoQGtvbmtsb25lKSwgYXQgdGhlIFN1bmxpZ2h0IEZvdW5kYXRpb24sXG4gKiBtYW55IGNvbnRyaWJ1dGlvbnMgYnkgaHR0cHM6Ly9naXRodWIuY29tL3VuaXRlZHN0YXRlcy9jaXRhdGlvbi9ncmFwaHMvY29udHJpYnV0b3JzXG4gKi9cblxuXG4vKlxuIFRPRE86XG4gKiBtb3ZlIHVuZGVyc2NvcmUgb3V0IG9mIHRoZSBuYW1lc3BhY2UsIHNlZSAjNTZcbiAqIHJld29yayBob3cgY2l0YXRvcnMgbG9hZCBDaXRhdGlvbiwgaXQncyBoZWZ0eVxuKi9cblxuaWYgKHR5cGVvZihyZXF1aXJlKSAhPT0gXCJ1bmRlZmluZWRcIikge1xuICB1bmRlcnNjb3JlID0gcmVxdWlyZShcInVuZGVyc2NvcmVcIik7XG59XG5cblxuKGZ1bmN0aW9uKENpdGF0aW9uKSB7XG5DaXRhdGlvbiA9IHtcblxuICAvLyB3aWxsIGJlIGZpbGxlZCBpbiBieSBpbmRpdmlkdWFsIGNpdGF0aW9uIHR5cGVzIGFzIGF2YWlsYWJsZVxuICB0eXBlczoge30sXG5cbiAgLy8gZmlsdGVycyB0aGF0IGNhbiBwcmUtcHJvY2VzcyB0ZXh0IGFuZCBwb3N0LXByb2Nlc3MgY2l0YXRpb25zXG4gIGZpbHRlcnM6IHt9LFxuXG4gIC8vIFRPRE86IGRvY3VtZW50IHRoaXMgaW5saW5lXG4gIC8vIGNoZWNrIGEgYmxvY2sgb2YgdGV4dCBmb3IgY2l0YXRpb25zIG9mIGEgZ2l2ZW4gdHlwZSAtXG4gIC8vIHJldHVybiBhbiBhcnJheSBvZiBtYXRjaGVzLCB3aXRoIGNpdGF0aW9uIGJyb2tlbiBvdXQgaW50byBmaWVsZHNcbiAgZmluZDogZnVuY3Rpb24odGV4dCwgb3B0aW9ucykge1xuICAgIGlmICghb3B0aW9ucykgb3B0aW9ucyA9IHt9O1xuXG4gICAgLy8gY2xpZW50IGNhbiBhcHBseSBhIGZpbHRlciB0aGF0IHByZS1wcm9jZXNzZXMgdGV4dCBiZWZvcmUgZXh0cmFjdGlvbixcbiAgICAvLyBhbmQgcG9zdC1wcm9jZXNzZXMgY2l0YXRpb25zIGFmdGVyIGV4dHJhY3Rpb25cbiAgICB2YXIgcmVzdWx0cztcbiAgICBpZiAob3B0aW9ucy5maWx0ZXIgJiYgQ2l0YXRpb24uZmlsdGVyc1tvcHRpb25zLmZpbHRlcl0pXG4gICAgICByZXN1bHRzID0gQ2l0YXRpb24uZmlsdGVyZWQob3B0aW9ucy5maWx0ZXIsIHRleHQsIG9wdGlvbnMpO1xuXG4gICAgLy8gb3RoZXJ3aXNlLCBkbyBhIHNpbmdsZSBwYXNzIG92ZXIgdGhlIHdob2xlIHRleHQuXG4gICAgZWxzZVxuICAgICAgcmVzdWx0cyA9IENpdGF0aW9uLmV4dHJhY3QodGV4dCwgb3B0aW9ucyk7XG5cbiAgICByZXR1cm4gcmVzdWx0cztcbiAgfSxcblxuICAvLyByZXR1cm4gYW4gYXJyYXkgb2YgbWF0Y2hlZCBhbmQgZmlsdGVyLW1hcHBlZCBjaXRlc1xuICBmaWx0ZXJlZDogZnVuY3Rpb24obmFtZSwgdGV4dCwgb3B0aW9ucykge1xuICAgIHZhciByZXN1bHRzID0gW107XG5cbiAgICB2YXIgZmlsdGVyID0gQ2l0YXRpb24uZmlsdGVyc1tuYW1lXTtcblxuICAgIC8vIGZpbHRlciBjYW4gYnJlYWsgdXAgdGhlIHRleHQgaW50byBwaWVjZXMgd2l0aCBhY2NvbXBhbnlpbmcgbWV0YWRhdGFcbiAgICBmaWx0ZXIuZnJvbSh0ZXh0LCBvcHRpb25zW25hbWVdLCBmdW5jdGlvbihwaWVjZSwgbWV0YWRhdGEpIHtcbiAgICAgIHZhciByZXNwb25zZSA9IENpdGF0aW9uLmV4dHJhY3QocGllY2UsIG9wdGlvbnMpO1xuICAgICAgdmFyIGZpbHRlcmVkID0gcmVzcG9uc2UuY2l0YXRpb25zLm1hcChmdW5jdGlvbihyZXN1bHQpIHtcblxuICAgICAgICBPYmplY3Qua2V5cyhtZXRhZGF0YSkuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgICByZXN1bHRba2V5XSA9IG1ldGFkYXRhW2tleV07XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICB9KTtcblxuICAgICAgcmVzdWx0cyA9IHJlc3VsdHMuY29uY2F0KGZpbHRlcmVkKTtcbiAgICB9KTtcblxuICAgIHJldHVybiB7Y2l0YXRpb25zOiByZXN1bHRzfTtcbiAgfSxcblxuXG4gIC8vIHJ1biB0aGUgY2l0YXRvcnMgb3ZlciB0aGUgdGV4dCwgcmV0dXJuIGFuIGFycmF5IG9mIG1hdGNoZWQgY2l0ZXNcbiAgZXh0cmFjdDogZnVuY3Rpb24odGV4dCwgb3B0aW9ucykge1xuICAgIGlmICghb3B0aW9ucykgb3B0aW9ucyA9IHt9O1xuXG4gICAgLy8gZGVmYXVsdDogbm8gZXhjZXJwdFxuICAgIHZhciBleGNlcnB0ID0gb3B0aW9ucy5leGNlcnB0ID8gcGFyc2VJbnQob3B0aW9ucy5leGNlcnB0LCAxMCkgOiAwO1xuXG4gICAgLy8gd2hldGhlciB0byByZXR1cm4gcGFyZW50IGNpdGF0aW9uc1xuICAgIC8vIGRlZmF1bHQ6IGZhbHNlXG4gICAgdmFyIHBhcmVudHMgPSBvcHRpb25zLnBhcmVudHMgfHwgZmFsc2U7XG5cbiAgICAvLyBkZWZhdWx0OiBhbGwgdHlwZXMsIGNhbiBiZSBmaWx0ZXJlZCB0byBvbmUsIG9yIGFuIGFycmF5IG9mIHRoZW1cbiAgICB2YXIgdHlwZXMgPSBDaXRhdGlvbi5zZWxlY3RlZFR5cGVzKG9wdGlvbnMpO1xuICAgIGlmICh0eXBlcy5sZW5ndGggPT09IDApIHJldHVybiBudWxsO1xuXG5cbiAgICAvLyBjYWxsZXIgY2FuIHByb3ZpZGUgb3B0aW9uYWwgY29udGV4dCB0aGF0IGNhbiBjaGFuZ2Ugd2hhdCBwYXR0ZXJucyBpbmRpdmlkdWFsIGNpdGF0b3JzIGFwcGx5XG4gICAgdmFyIGNvbnRleHQgPSBvcHRpb25zLmNvbnRleHQgfHwge307XG5cblxuICAgIC8vIFRoZSBjYWxsZXIgY2FuIHByb3ZpZGUgYSByZXBsYWNlIGNhbGxiYWNrIHRvIGFsdGVyIGV2ZXJ5IGZvdW5kIGNpdGF0aW9uLlxuICAgIC8vIHRoaXMgZnVuY3Rpb24gd2lsbCBiZSBjYWxsZWQgd2l0aCBlYWNoIChmb3VuZCBhbmQgcHJvY2Vzc2VkKSBjaXRlIG9iamVjdCxcbiAgICAvLyBhbmQgc2hvdWxkIHJldHVybiBhIHN0cmluZyB0byBiZSBwdXQgaW4gdGhlIGNpdGUncyBwbGFjZS5cbiAgICAvL1xuICAgIC8vIFRoZSByZXN1bHRpbmcgdHJhbnNmb3JtZWQgc3RyaW5nIHdpbGwgYmUgaW4gdGhlIHJldHVybmVkIG9iamVjdCBhcyBhICd0ZXh0JyBmaWVsZC5cbiAgICAvLyB0aGlzIGZpZWxkIHdpbGwgb25seSBiZSBwcmVzZW50IGlmIGEgcmVwbGFjZSBjYWxsYmFjayB3YXMgcHJvdmlkZWQuXG4gICAgLy9cbiAgICAvLyBwcm92aWRpbmcgdGhpcyBjYWxsYmFjayB3aWxsIGFsc28gY2F1c2UgbWF0Y2hlZCBjaXRlcyBub3QgdG8gcmV0dXJuIHRoZSAnaW5kZXgnIGZpZWxkLFxuICAgIC8vIGFzIHRoZSByZXBsYWNlIHByb2Nlc3Mgd2lsbCBjb21wbGV0ZWx5IHNjcmV3IHRoZW0gdXAuIG9ubHkgdXNlIHRoZSAnaW5kZXgnIGZpZWxkIGlmIHlvdVxuICAgIC8vIHBsYW4gb24gZG9pbmcgeW91ciBvd24gcmVwbGFjaW5nLlxuICAgIHZhciByZXBsYWNlID0gb3B0aW9ucy5yZXBsYWNlO1xuXG4gICAgLy8gYWNjdW11bGF0ZSB0aGUgcmVzdWx0c1xuICAgIHZhciByZXN1bHRzID0gW107XG5cblxuICAgIC8vLy8vLy8vLy8vLy8gcHJlcGFyZSBjaXRhdGlvbiBwYXR0ZXJucyAvLy8vLy8vLy8vLy8vXG5cbiAgICAvLyB3aWxsIGhvbGQgdGhlIGNhbGN1bGF0ZWQgY29udGV4dC1zcGVjaWZpYyBwYXR0ZXJucyB3ZSBhcmUgdG8gcnVuXG4gICAgLy8gb3ZlciB0aGUgZ2l2ZW4gdGV4dCwgdHJhY2tlZCBieSBpbmRleCB3ZSBleHBlY3QgdG8gZmluZCB0aGVtIGF0LlxuICAgIC8vIG5leHRJbmRleCB0cmFja3MgYSBydW5uaW5nIGluZGV4IGFzIHdlIGxvb3AgdGhyb3VnaCBwYXR0ZXJucy5cbiAgICAvLyAoY2l0YXRvcnMgY291bGQganVzdCBiZSBjYWxsZWQgaW5kZXhlZFBhdHRlcm5zKVxuICAgIHZhciBjaXRhdG9ycyA9IHt9O1xuICAgIHZhciBuZXh0SW5kZXggPSAwO1xuXG4gICAgLy8gR28gdGhyb3VnaCBldmVyeSByZWdleC1iYXNlZCBjaXRhdG9yIGFuZCBwcmVwYXJlIGEgc2V0IG9mIHBhdHRlcm5zLFxuICAgIC8vIGluZGV4ZWQgYnkgdGhlIG9yZGVyIG9mIGEgbWF0Y2hlZCBhcmd1bWVudHMgYXJyYXkuXG4gICAgdHlwZXMuZm9yRWFjaChmdW5jdGlvbih0eXBlKSB7XG4gICAgICBpZiAoQ2l0YXRpb24udHlwZXNbdHlwZV0udHlwZSAhPSBcInJlZ2V4XCIpIHJldHVybjtcblxuICAgICAgLy8gQ2FsY3VsYXRlIHRoZSBwYXR0ZXJucyB0aGlzIGNpdGF0b3Igd2lsbCBjb250cmlidXRlIHRvIHRoZSBwYXJzZS5cbiAgICAgIC8vIChpbmRpdmlkdWFsIHBhcnNlcnMgY2FuIG9wdCB0byBtYWtlIHRoZWlyIHBhcnNpbmcgY29udGV4dC1zcGVjaWZpYylcbiAgICAgIHZhciBwYXR0ZXJucyA9IENpdGF0aW9uLnR5cGVzW3R5cGVdLnBhdHRlcm5zO1xuICAgICAgaWYgKHR5cGVvZihwYXR0ZXJucykgPT0gXCJmdW5jdGlvblwiKVxuICAgICAgICBwYXR0ZXJucyA9IHBhdHRlcm5zKGNvbnRleHRbdHlwZV0gfHwge30pO1xuXG4gICAgICAvLyBhZGQgZWFjaCBwYXR0ZXJuLCBrZWVwaW5nIGEgcnVubmluZyB0YWxseSBvZiB3aGF0IHdlIHdvdWxkXG4gICAgICAvLyBleHBlY3QgaXRzIHByaW1hcnkgaW5kZXggdG8gYmUgd2hlbiBmb3VuZCBpbiB0aGUgbWFzdGVyIHJlZ2V4LlxuICAgICAgcGF0dGVybnMuZm9yRWFjaChmdW5jdGlvbihwYXR0ZXJuKSB7XG4gICAgICAgIHBhdHRlcm4udHlwZSA9IHR5cGU7IC8vIHdpbGwgYmUgbmVlZGVkIGxhdGVyXG4gICAgICAgIGNpdGF0b3JzW25leHRJbmRleF0gPSBwYXR0ZXJuO1xuICAgICAgICBuZXh0SW5kZXggKz0gcGF0dGVybi5maWVsZHMubGVuZ3RoICsgMTtcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgLy8gSWYgdGhlcmUgYXJlIGFueSByZWdleC1iYXNlZCBwYXR0ZXJucyBiZWluZyBhcHBsaWVkLCBjb21iaW5lIHRoZW1cbiAgICAvLyBhbmQgcnVuIGEgZmluZC9yZXBsYWNlIG92ZXIgdGhlIHN0cmluZy5cbiAgICB2YXIgcmVnZXhlcyA9IHVuZGVyc2NvcmUudmFsdWVzKGNpdGF0b3JzKS5tYXAoZnVuY3Rpb24ocGF0dGVybikge3JldHVybiBwYXR0ZXJuLnJlZ2V4fSk7XG4gICAgaWYgKHJlZ2V4ZXMubGVuZ3RoID4gMCkge1xuXG4gICAgICAvLyBtZXJnZSBhbGwgcmVnZXhlcyBpbnRvIG9uZSwgc28gdGhhdCBlYWNoIHBhdHRlcm4gd2lsbCBiZWdpbiBhdCBhIHByZWRpY3RhYmxlIHBsYWNlXG4gICAgICB2YXIgcmVnZXggPSBuZXcgUmVnRXhwKFwiKFwiICsgcmVnZXhlcy5qb2luKFwiKXwoXCIpICsgXCIpXCIsIFwiaWdcIik7XG5cbiAgICAgIHZhciByZXBsYWNlZCA9IHRleHQucmVwbGFjZShyZWdleCwgZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBtYXRjaCA9IGFyZ3VtZW50c1swXTtcblxuICAgICAgICAvLyBvZmZzZXQgaXMgc2Vjb25kLXRvLWxhc3QgYXJndW1lbnRcbiAgICAgICAgdmFyIGluZGV4ID0gYXJndW1lbnRzW2FyZ3VtZW50cy5sZW5ndGggLSAyXTtcblxuICAgICAgICAvLyBwdWxsIG91dCBqdXN0IHRoZSByZWdleC1jYXB0dXJlZCBtYXRjaGVzXG4gICAgICAgIHZhciBjYXB0dXJlcyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSwgLTIpO1xuXG4gICAgICAgIC8vIGZpbmQgdGhlIGZpcnN0IG1hdGNoZWQgaW5kZXggaW4gdGhlIGNhcHR1cmVzXG4gICAgICAgIHZhciBtYXRjaEluZGV4O1xuICAgICAgICBmb3IgKG1hdGNoSW5kZXg9MDsgbWF0Y2hJbmRleDxjYXB0dXJlcy5sZW5ndGg7IG1hdGNoSW5kZXgrKylcbiAgICAgICAgICBpZiAoY2FwdHVyZXNbbWF0Y2hJbmRleF0pIGJyZWFrO1xuXG4gICAgICAgIC8vIGxvb2sgdXAgdGhlIGNpdGF0b3IgYnkgdGhlIGluZGV4IHdlIGV4cGVjdGVkIGl0IGF0XG4gICAgICAgIHZhciBjaXRhdG9yID0gY2l0YXRvcnNbbWF0Y2hJbmRleF07XG4gICAgICAgIGlmICghY2l0YXRvcikgcmV0dXJuIG51bGw7IC8vIHdoYXQ/XG4gICAgICAgIHZhciB0eXBlID0gY2l0YXRvci50eXBlO1xuXG4gICAgICAgIC8vIHByb2Nlc3MgdGhlIG1hdGNoZWQgZGF0YSBpbnRvIHRoZSBmaW5hbCBvYmplY3RcbiAgICAgICAgdmFyIG91ckNhcHR1cmVzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoY2FwdHVyZXMsIG1hdGNoSW5kZXggKyAxKTtcbiAgICAgICAgdmFyIG5hbWVkTWF0Y2ggPSBDaXRhdGlvbi5tYXRjaEZvcihvdXJDYXB0dXJlcywgY2l0YXRvcik7XG4gICAgICAgIHZhciBjaXRlcyA9IGNpdGF0b3IucHJvY2Vzc29yKG5hbWVkTWF0Y2gpO1xuXG4gICAgICAgIC8vIG9uZSBtYXRjaCBjYW4gZ2VuZXJhdGUgb25lIG9yIG1hbnkgY2l0YXRpb24gcmVzdWx0cyAoZS5nLiByYW5nZXMpXG4gICAgICAgIGlmICghdW5kZXJzY29yZS5pc0FycmF5KGNpdGVzKSkgY2l0ZXMgPSBbY2l0ZXNdO1xuXG4gICAgICAgIC8vIHB1dCB0b2dldGhlciB0aGUgbWF0Y2gtbGV2ZWwgaW5mb3JtYXRpb25cbiAgICAgICAgdmFyIG1hdGNoSW5mbyA9IHt0eXBlOiBjaXRhdG9yLnR5cGV9O1xuICAgICAgICBtYXRjaEluZm8ubWF0Y2ggPSBtYXRjaC50b1N0cmluZygpOyAvLyBtYXRjaCBkYXRhIGNhbiBiZSBjb252ZXJ0ZWQgdG8gdGhlIHBsYWluIHN0cmluZ1xuXG4gICAgICAgIC8vIHN0b3JlIHRoZSBtYXRjaGVkIGNoYXJhY3RlciBvZmZzZXQsIGV4Y2VwdCBpZiB3ZSdyZSByZXBsYWNpbmdcbiAgICAgICAgaWYgKCFyZXBsYWNlKVxuICAgICAgICAgIG1hdGNoSW5mby5pbmRleCA9IGluZGV4O1xuXG5cbiAgICAgICAgLy8gdXNlIGluZGV4IHRvIGdyYWIgc3Vycm91bmRpbmcgZXhjZXJwdFxuICAgICAgICBpZiAoZXhjZXJwdCA+IDApIHtcbiAgICAgICAgICB2YXIgcHJvcG9zZWRMZWZ0ID0gaW5kZXggLSBleGNlcnB0O1xuICAgICAgICAgIHZhciBsZWZ0ID0gcHJvcG9zZWRMZWZ0ID4gMCA/IHByb3Bvc2VkTGVmdCA6IDA7XG5cbiAgICAgICAgICB2YXIgcHJvcG9zZWRSaWdodCA9IGluZGV4ICsgbWF0Y2hJbmZvLm1hdGNoLmxlbmd0aCArIGV4Y2VycHQ7XG4gICAgICAgICAgdmFyIHJpZ2h0ID0gKHByb3Bvc2VkUmlnaHQgPD0gdGV4dC5sZW5ndGgpID8gcHJvcG9zZWRSaWdodCA6IHRleHQubGVuZ3RoO1xuXG4gICAgICAgICAgbWF0Y2hJbmZvLmV4Y2VycHQgPSB0ZXh0LnN1YnN0cmluZyhsZWZ0LCByaWdodCk7XG4gICAgICAgIH1cblxuXG4gICAgICAgIC8vIGlmIHdlIHdhbnQgcGFyZW50IGNpdGVzIHRvbywgbWFrZSB0aG9zZSBub3dcbiAgICAgICAgaWYgKHBhcmVudHMgJiYgQ2l0YXRpb24udHlwZXNbdHlwZV0ucGFyZW50c19ieSkge1xuICAgICAgICAgIGNpdGVzID0gdW5kZXJzY29yZS5mbGF0dGVuKGNpdGVzLm1hcChmdW5jdGlvbihjaXRlKSB7XG4gICAgICAgICAgICByZXR1cm4gQ2l0YXRpb24uY2l0ZVBhcmVudHMoY2l0ZSwgdHlwZSk7XG4gICAgICAgICAgfSkpO1xuICAgICAgICB9XG5cbiAgICAgICAgY2l0ZXMgPSBjaXRlcy5tYXAoZnVuY3Rpb24oY2l0ZSkge1xuICAgICAgICAgIHZhciByZXN1bHQgPSB7fTtcblxuICAgICAgICAgIC8vIG1hdGNoLWxldmVsIGluZm9cbiAgICAgICAgICB1bmRlcnNjb3JlLmV4dGVuZChyZXN1bHQsIG1hdGNoSW5mbyk7XG5cbiAgICAgICAgICAvLyBjaXRlLWxldmVsIGluZm8sIHBsdXMgSUQgc3RhbmRhcmRpemF0aW9uXG4gICAgICAgICAgcmVzdWx0W3R5cGVdID0gY2l0ZTtcbiAgICAgICAgICB1bmRlcnNjb3JlLmV4dGVuZChyZXN1bHRbdHlwZV0sIENpdGF0aW9uLnR5cGVzW3R5cGVdLnN0YW5kYXJkaXplKHJlc3VsdFt0eXBlXSkpO1xuXG4gICAgICAgICAgcmVzdWx0cy5wdXNoKHJlc3VsdCk7XG5cbiAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJIGRvbid0IGtub3cgd2hhdCB0byBkbyBhYm91dCByYW5nZXMgeWV0IC0gYnV0IGZvciBub3csIHNjcmV3IGl0XG4gICAgICAgIHZhciByZXBsYWNlZENpdGU7XG4gICAgICAgIGlmICh0eXBlb2YocmVwbGFjZSkgPT09IFwiZnVuY3Rpb25cIilcbiAgICAgICAgICByZXBsYWNlZENpdGUgPSByZXBsYWNlKGNpdGVzWzBdKTtcbiAgICAgICAgZWxzZSBpZiAoKHR5cGVvZihyZXBsYWNlKSA9PT0gXCJvYmplY3RcIikgJiYgKHR5cGVvZihyZXBsYWNlW3R5cGVdKSA9PT0gXCJmdW5jdGlvblwiKSlcbiAgICAgICAgICByZXBsYWNlZENpdGUgPSByZXBsYWNlW3R5cGVdKGNpdGVzWzBdKTtcblxuICAgICAgICBpZiAocmVwbGFjZWRDaXRlKVxuICAgICAgICAgIHJldHVybiByZXBsYWNlZENpdGU7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICByZXR1cm4gbWF0Y2hJbmZvLm1hdGNoO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gVE9ETzogZG8gZm9yIGFueSBleHRlcm5hbCBjaXRlIHR5cGVzLCBub3QganVzdCBcImp1ZGljaWFsXCJcbiAgICBpZiAodW5kZXJzY29yZS5jb250YWlucyh0eXBlcywgXCJqdWRpY2lhbFwiKSlcbiAgICAgIHJlc3VsdHMgPSByZXN1bHRzLmNvbmNhdChDaXRhdGlvbi50eXBlcy5qdWRpY2lhbC5leHRyYWN0KHRleHQpKTtcblxuICAgIHZhciByZXNwb25zZSA9IHtjaXRhdGlvbnM6IHVuZGVyc2NvcmUuY29tcGFjdChyZXN1bHRzKX07XG4gICAgaWYgKG9wdGlvbnMucmVwbGFjZSkgcmVzcG9uc2UudGV4dCA9IHJlcGxhY2VkO1xuXG4gICAgcmV0dXJuIHJlc3BvbnNlO1xuICB9LFxuXG5cbiAgLy8gZm9yIGEgZ2l2ZW4gc2V0IG9mIGNpdGUtc3BlY2lmaWMgZGV0YWlscyxcbiAgLy8gcmV0dXJuIGl0c2VsZiBhbmQgaXRzIHBhcmVudCBjaXRhdGlvbnNcbiAgY2l0ZVBhcmVudHM6IGZ1bmN0aW9uKGNpdGF0aW9uLCB0eXBlKSB7XG4gICAgdmFyIGZpZWxkID0gQ2l0YXRpb24udHlwZXNbdHlwZV0ucGFyZW50c19ieTtcbiAgICB2YXIgcmVzdWx0cyA9IFtdO1xuXG4gICAgZm9yICh2YXIgaT1jaXRhdGlvbltmaWVsZF0ubGVuZ3RoOyBpID49IDA7IGktLSkge1xuICAgICAgdmFyIHBhcmVudCA9IHVuZGVyc2NvcmUuY2xvbmUoY2l0YXRpb24pO1xuICAgICAgcGFyZW50W2ZpZWxkXSA9IHBhcmVudFtmaWVsZF0uc2xpY2UoMCwgaSk7XG4gICAgICByZXN1bHRzLnB1c2gocGFyZW50KTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdHM7XG4gIH0sXG5cbiAgLy8gZ2l2ZW4gYW4gYXJyYXkgb2YgY2FwdHVyZXMgKmJlZ2lubmluZyogd2l0aCB2YWx1ZXMgdGhlIHBhdHRlcm5cbiAgLy8ga25vd3MgaG93IHRvIHByb2Nlc3MsIHR1cm4gaXQgaW50byBhbiBvYmplY3Qgd2l0aCB0aG9zZSBrZXlzLlxuICBtYXRjaEZvcjogZnVuY3Rpb24oY2FwdHVyZXMsIHBhdHRlcm4pIHtcbiAgICB2YXIgbWF0Y2ggPSB7fTtcbiAgICBmb3IgKHZhciBpPTA7IGk8Y2FwdHVyZXMubGVuZ3RoOyBpKyspXG4gICAgICBtYXRjaFtwYXR0ZXJuLmZpZWxkc1tpXV0gPSBjYXB0dXJlc1tpXTtcbiAgICByZXR1cm4gbWF0Y2g7XG4gIH0sXG5cbiAgc2VsZWN0ZWRUeXBlczogZnVuY3Rpb24ob3B0aW9ucykge1xuICAgIHZhciB0eXBlcztcbiAgICBpZiAob3B0aW9ucy50eXBlcykge1xuICAgICAgaWYgKHVuZGVyc2NvcmUuaXNBcnJheShvcHRpb25zLnR5cGVzKSkge1xuICAgICAgICBpZiAob3B0aW9ucy50eXBlcy5sZW5ndGggPiAwKVxuICAgICAgICAgIHR5cGVzID0gb3B0aW9ucy50eXBlcztcbiAgICAgIH0gZWxzZVxuICAgICAgICB0eXBlcyA9IFtvcHRpb25zLnR5cGVzXTtcbiAgICB9XG5cbiAgICAvLyBvbmx5IGFsbG93IHZhbGlkIHR5cGVzXG4gICAgaWYgKHR5cGVzKVxuICAgICAgdHlwZXMgPSB1bmRlcnNjb3JlLmludGVyc2VjdGlvbih0eXBlcywgT2JqZWN0LmtleXMoQ2l0YXRpb24udHlwZXMpKTtcbiAgICBlbHNlXG4gICAgICB0eXBlcyA9IE9iamVjdC5rZXlzKENpdGF0aW9uLnR5cGVzKTtcblxuICAgIHJldHVybiB0eXBlcztcbiAgfVxuXG59O1xuXG5cbi8vIFRPRE86IGxvYWQgb25seSB0aGUgY2l0YXRpb24gdHlwZXMgYXNrZWQgZm9yXG5pZiAodHlwZW9mKHJlcXVpcmUpICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gIENpdGF0aW9uLnR5cGVzLnVzYyA9IHJlcXVpcmUoXCIuL2NpdGF0aW9ucy91c2NcIik7XG4gIENpdGF0aW9uLnR5cGVzLmxhdyA9IHJlcXVpcmUoXCIuL2NpdGF0aW9ucy9sYXdcIik7XG4gIENpdGF0aW9uLnR5cGVzLmNmciA9IHJlcXVpcmUoXCIuL2NpdGF0aW9ucy9jZnJcIik7XG4gIENpdGF0aW9uLnR5cGVzLnZhX2NvZGUgPSByZXF1aXJlKFwiLi9jaXRhdGlvbnMvdmFfY29kZVwiKTtcbiAgQ2l0YXRpb24udHlwZXMuZGNfY29kZSA9IHJlcXVpcmUoXCIuL2NpdGF0aW9ucy9kY19jb2RlXCIpO1xuICBDaXRhdGlvbi50eXBlcy5kY19yZWdpc3RlciA9IHJlcXVpcmUoXCIuL2NpdGF0aW9ucy9kY19yZWdpc3RlclwiKTtcbiAgQ2l0YXRpb24udHlwZXMuZGNfbGF3ID0gcmVxdWlyZShcIi4vY2l0YXRpb25zL2RjX2xhd1wiKTtcbiAgQ2l0YXRpb24udHlwZXMuc3RhdCA9IHJlcXVpcmUoXCIuL2NpdGF0aW9ucy9zdGF0XCIpO1xuICBDaXRhdGlvbi50eXBlcy5qdWRpY2lhbCA9IHJlcXVpcmUoXCIuL2NpdGF0aW9ucy9qdWRpY2lhbFwiKTtcblxuICBDaXRhdGlvbi5maWx0ZXJzLmxpbmVzID0gcmVxdWlyZShcIi4vZmlsdGVycy9saW5lc1wiKTtcbn1cblxuXG5pZiAodHlwZW9mKHdpbmRvdykgIT09IFwidW5kZWZpbmVkXCIpXG4gIHdpbmRvdy5DaXRhdGlvbiA9IENpdGF0aW9uO1xuXG5pZiAodHlwZW9mKG1vZHVsZSkgIT09IFwidW5kZWZpbmVkXCIgJiYgbW9kdWxlLmV4cG9ydHMpXG4gIG1vZHVsZS5leHBvcnRzID0gQ2l0YXRpb247XG5cbn0pKCk7XG4iLCIoZnVuY3Rpb24oZGVmKSB7XG4gIGlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJykgbW9kdWxlLmV4cG9ydHMgPSBkZWY7XG4gIGlmICh0eXBlb2YgQ2l0YXRpb24gIT09ICd1bmRlZmluZWQnICYmIENpdGF0aW9uLmZpbHRlcnMpIENpdGF0aW9uLmZpbHRlcnMubGluZXMgPSBkZWY7XG59KSh7XG5cbiAgLy8gQSBsaW5lLWJ5LWxpbmUgZmlsdGVyLlxuICAvL1xuICAvLyBCcmVha3MgdGhlIHRleHQgdXAgYnkgbGluZSwgYW5kIGZlZWRzIGVhY2ggbGluZSBpbnRvIHRoZSBleHRyYWN0b3IuXG4gIC8vIEF0dGFjaGVzIHRoZSBsaW5lIG51bWJlciAoMS1pbmRleGVkKSBhcyBtZXRhZGF0YSB0byBlYWNoIGNpdGUsXG4gIC8vIHNvIHRoYXQgYW55IGNoYXJhY3RlciBvZmZzZXRzIHdpbGwgYmUgcmVsYXRpdmUgdG8gdGhhdCBsaW5lLlxuICAvL1xuICAvLyBBY2NlcHRzIG9wdGlvbnM6XG4gIC8vICAgZGVsaW1pdGVyOiBvdmVycmlkZSB0aGUgZGVmYXVsdCBkZWxpbWl0ZXJcblxuICBmcm9tOiBmdW5jdGlvbih0ZXh0LCBvcHRpb25zLCBleHRyYWN0KSB7XG4gICAgdmFyIGRlbGltaXRlciA9IChvcHRpb25zICYmIG9wdGlvbnMuZGVsaW1pdGVyKSB8fCAvW1xcblxccl0rLztcbiAgICB2YXIgbGluZXMgPSB0ZXh0LnNwbGl0KG5ldyBSZWdFeHAoZGVsaW1pdGVyKSk7XG4gICAgbGluZXMuZm9yRWFjaChmdW5jdGlvbihsaW5lLCBpKSB7XG4gICAgICBleHRyYWN0KGxpbmUsIHtsaW5lOiAoaSsxKX0pO1xuICAgIH0pO1xuICB9XG5cbn0pOyIsIi8vICAgICBVbmRlcnNjb3JlLmpzIDEuNi4wXG4vLyAgICAgaHR0cDovL3VuZGVyc2NvcmVqcy5vcmdcbi8vICAgICAoYykgMjAwOS0yMDE0IEplcmVteSBBc2hrZW5hcywgRG9jdW1lbnRDbG91ZCBhbmQgSW52ZXN0aWdhdGl2ZSBSZXBvcnRlcnMgJiBFZGl0b3JzXG4vLyAgICAgVW5kZXJzY29yZSBtYXkgYmUgZnJlZWx5IGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBNSVQgbGljZW5zZS5cblxuKGZ1bmN0aW9uKCkge1xuXG4gIC8vIEJhc2VsaW5lIHNldHVwXG4gIC8vIC0tLS0tLS0tLS0tLS0tXG5cbiAgLy8gRXN0YWJsaXNoIHRoZSByb290IG9iamVjdCwgYHdpbmRvd2AgaW4gdGhlIGJyb3dzZXIsIG9yIGBleHBvcnRzYCBvbiB0aGUgc2VydmVyLlxuICB2YXIgcm9vdCA9IHRoaXM7XG5cbiAgLy8gU2F2ZSB0aGUgcHJldmlvdXMgdmFsdWUgb2YgdGhlIGBfYCB2YXJpYWJsZS5cbiAgdmFyIHByZXZpb3VzVW5kZXJzY29yZSA9IHJvb3QuXztcblxuICAvLyBFc3RhYmxpc2ggdGhlIG9iamVjdCB0aGF0IGdldHMgcmV0dXJuZWQgdG8gYnJlYWsgb3V0IG9mIGEgbG9vcCBpdGVyYXRpb24uXG4gIHZhciBicmVha2VyID0ge307XG5cbiAgLy8gU2F2ZSBieXRlcyBpbiB0aGUgbWluaWZpZWQgKGJ1dCBub3QgZ3ppcHBlZCkgdmVyc2lvbjpcbiAgdmFyIEFycmF5UHJvdG8gPSBBcnJheS5wcm90b3R5cGUsIE9ialByb3RvID0gT2JqZWN0LnByb3RvdHlwZSwgRnVuY1Byb3RvID0gRnVuY3Rpb24ucHJvdG90eXBlO1xuXG4gIC8vIENyZWF0ZSBxdWljayByZWZlcmVuY2UgdmFyaWFibGVzIGZvciBzcGVlZCBhY2Nlc3MgdG8gY29yZSBwcm90b3R5cGVzLlxuICB2YXJcbiAgICBwdXNoICAgICAgICAgICAgID0gQXJyYXlQcm90by5wdXNoLFxuICAgIHNsaWNlICAgICAgICAgICAgPSBBcnJheVByb3RvLnNsaWNlLFxuICAgIGNvbmNhdCAgICAgICAgICAgPSBBcnJheVByb3RvLmNvbmNhdCxcbiAgICB0b1N0cmluZyAgICAgICAgID0gT2JqUHJvdG8udG9TdHJpbmcsXG4gICAgaGFzT3duUHJvcGVydHkgICA9IE9ialByb3RvLmhhc093blByb3BlcnR5O1xuXG4gIC8vIEFsbCAqKkVDTUFTY3JpcHQgNSoqIG5hdGl2ZSBmdW5jdGlvbiBpbXBsZW1lbnRhdGlvbnMgdGhhdCB3ZSBob3BlIHRvIHVzZVxuICAvLyBhcmUgZGVjbGFyZWQgaGVyZS5cbiAgdmFyXG4gICAgbmF0aXZlRm9yRWFjaCAgICAgID0gQXJyYXlQcm90by5mb3JFYWNoLFxuICAgIG5hdGl2ZU1hcCAgICAgICAgICA9IEFycmF5UHJvdG8ubWFwLFxuICAgIG5hdGl2ZVJlZHVjZSAgICAgICA9IEFycmF5UHJvdG8ucmVkdWNlLFxuICAgIG5hdGl2ZVJlZHVjZVJpZ2h0ICA9IEFycmF5UHJvdG8ucmVkdWNlUmlnaHQsXG4gICAgbmF0aXZlRmlsdGVyICAgICAgID0gQXJyYXlQcm90by5maWx0ZXIsXG4gICAgbmF0aXZlRXZlcnkgICAgICAgID0gQXJyYXlQcm90by5ldmVyeSxcbiAgICBuYXRpdmVTb21lICAgICAgICAgPSBBcnJheVByb3RvLnNvbWUsXG4gICAgbmF0aXZlSW5kZXhPZiAgICAgID0gQXJyYXlQcm90by5pbmRleE9mLFxuICAgIG5hdGl2ZUxhc3RJbmRleE9mICA9IEFycmF5UHJvdG8ubGFzdEluZGV4T2YsXG4gICAgbmF0aXZlSXNBcnJheSAgICAgID0gQXJyYXkuaXNBcnJheSxcbiAgICBuYXRpdmVLZXlzICAgICAgICAgPSBPYmplY3Qua2V5cyxcbiAgICBuYXRpdmVCaW5kICAgICAgICAgPSBGdW5jUHJvdG8uYmluZDtcblxuICAvLyBDcmVhdGUgYSBzYWZlIHJlZmVyZW5jZSB0byB0aGUgVW5kZXJzY29yZSBvYmplY3QgZm9yIHVzZSBiZWxvdy5cbiAgdmFyIF8gPSBmdW5jdGlvbihvYmopIHtcbiAgICBpZiAob2JqIGluc3RhbmNlb2YgXykgcmV0dXJuIG9iajtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgXykpIHJldHVybiBuZXcgXyhvYmopO1xuICAgIHRoaXMuX3dyYXBwZWQgPSBvYmo7XG4gIH07XG5cbiAgLy8gRXhwb3J0IHRoZSBVbmRlcnNjb3JlIG9iamVjdCBmb3IgKipOb2RlLmpzKiosIHdpdGhcbiAgLy8gYmFja3dhcmRzLWNvbXBhdGliaWxpdHkgZm9yIHRoZSBvbGQgYHJlcXVpcmUoKWAgQVBJLiBJZiB3ZSdyZSBpblxuICAvLyB0aGUgYnJvd3NlciwgYWRkIGBfYCBhcyBhIGdsb2JhbCBvYmplY3QgdmlhIGEgc3RyaW5nIGlkZW50aWZpZXIsXG4gIC8vIGZvciBDbG9zdXJlIENvbXBpbGVyIFwiYWR2YW5jZWRcIiBtb2RlLlxuICBpZiAodHlwZW9mIGV4cG9ydHMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgICBleHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBfO1xuICAgIH1cbiAgICBleHBvcnRzLl8gPSBfO1xuICB9IGVsc2Uge1xuICAgIHJvb3QuXyA9IF87XG4gIH1cblxuICAvLyBDdXJyZW50IHZlcnNpb24uXG4gIF8uVkVSU0lPTiA9ICcxLjYuMCc7XG5cbiAgLy8gQ29sbGVjdGlvbiBGdW5jdGlvbnNcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICAvLyBUaGUgY29ybmVyc3RvbmUsIGFuIGBlYWNoYCBpbXBsZW1lbnRhdGlvbiwgYWthIGBmb3JFYWNoYC5cbiAgLy8gSGFuZGxlcyBvYmplY3RzIHdpdGggdGhlIGJ1aWx0LWluIGBmb3JFYWNoYCwgYXJyYXlzLCBhbmQgcmF3IG9iamVjdHMuXG4gIC8vIERlbGVnYXRlcyB0byAqKkVDTUFTY3JpcHQgNSoqJ3MgbmF0aXZlIGBmb3JFYWNoYCBpZiBhdmFpbGFibGUuXG4gIHZhciBlYWNoID0gXy5lYWNoID0gXy5mb3JFYWNoID0gZnVuY3Rpb24ob2JqLCBpdGVyYXRvciwgY29udGV4dCkge1xuICAgIGlmIChvYmogPT0gbnVsbCkgcmV0dXJuIG9iajtcbiAgICBpZiAobmF0aXZlRm9yRWFjaCAmJiBvYmouZm9yRWFjaCA9PT0gbmF0aXZlRm9yRWFjaCkge1xuICAgICAgb2JqLmZvckVhY2goaXRlcmF0b3IsIGNvbnRleHQpO1xuICAgIH0gZWxzZSBpZiAob2JqLmxlbmd0aCA9PT0gK29iai5sZW5ndGgpIHtcbiAgICAgIGZvciAodmFyIGkgPSAwLCBsZW5ndGggPSBvYmoubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgb2JqW2ldLCBpLCBvYmopID09PSBicmVha2VyKSByZXR1cm47XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBrZXlzID0gXy5rZXlzKG9iaik7XG4gICAgICBmb3IgKHZhciBpID0gMCwgbGVuZ3RoID0ga2V5cy5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoaXRlcmF0b3IuY2FsbChjb250ZXh0LCBvYmpba2V5c1tpXV0sIGtleXNbaV0sIG9iaikgPT09IGJyZWFrZXIpIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG9iajtcbiAgfTtcblxuICAvLyBSZXR1cm4gdGhlIHJlc3VsdHMgb2YgYXBwbHlpbmcgdGhlIGl0ZXJhdG9yIHRvIGVhY2ggZWxlbWVudC5cbiAgLy8gRGVsZWdhdGVzIHRvICoqRUNNQVNjcmlwdCA1KioncyBuYXRpdmUgYG1hcGAgaWYgYXZhaWxhYmxlLlxuICBfLm1hcCA9IF8uY29sbGVjdCA9IGZ1bmN0aW9uKG9iaiwgaXRlcmF0b3IsIGNvbnRleHQpIHtcbiAgICB2YXIgcmVzdWx0cyA9IFtdO1xuICAgIGlmIChvYmogPT0gbnVsbCkgcmV0dXJuIHJlc3VsdHM7XG4gICAgaWYgKG5hdGl2ZU1hcCAmJiBvYmoubWFwID09PSBuYXRpdmVNYXApIHJldHVybiBvYmoubWFwKGl0ZXJhdG9yLCBjb250ZXh0KTtcbiAgICBlYWNoKG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBsaXN0KSB7XG4gICAgICByZXN1bHRzLnB1c2goaXRlcmF0b3IuY2FsbChjb250ZXh0LCB2YWx1ZSwgaW5kZXgsIGxpc3QpKTtcbiAgICB9KTtcbiAgICByZXR1cm4gcmVzdWx0cztcbiAgfTtcblxuICB2YXIgcmVkdWNlRXJyb3IgPSAnUmVkdWNlIG9mIGVtcHR5IGFycmF5IHdpdGggbm8gaW5pdGlhbCB2YWx1ZSc7XG5cbiAgLy8gKipSZWR1Y2UqKiBidWlsZHMgdXAgYSBzaW5nbGUgcmVzdWx0IGZyb20gYSBsaXN0IG9mIHZhbHVlcywgYWthIGBpbmplY3RgLFxuICAvLyBvciBgZm9sZGxgLiBEZWxlZ2F0ZXMgdG8gKipFQ01BU2NyaXB0IDUqKidzIG5hdGl2ZSBgcmVkdWNlYCBpZiBhdmFpbGFibGUuXG4gIF8ucmVkdWNlID0gXy5mb2xkbCA9IF8uaW5qZWN0ID0gZnVuY3Rpb24ob2JqLCBpdGVyYXRvciwgbWVtbywgY29udGV4dCkge1xuICAgIHZhciBpbml0aWFsID0gYXJndW1lbnRzLmxlbmd0aCA+IDI7XG4gICAgaWYgKG9iaiA9PSBudWxsKSBvYmogPSBbXTtcbiAgICBpZiAobmF0aXZlUmVkdWNlICYmIG9iai5yZWR1Y2UgPT09IG5hdGl2ZVJlZHVjZSkge1xuICAgICAgaWYgKGNvbnRleHQpIGl0ZXJhdG9yID0gXy5iaW5kKGl0ZXJhdG9yLCBjb250ZXh0KTtcbiAgICAgIHJldHVybiBpbml0aWFsID8gb2JqLnJlZHVjZShpdGVyYXRvciwgbWVtbykgOiBvYmoucmVkdWNlKGl0ZXJhdG9yKTtcbiAgICB9XG4gICAgZWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgaWYgKCFpbml0aWFsKSB7XG4gICAgICAgIG1lbW8gPSB2YWx1ZTtcbiAgICAgICAgaW5pdGlhbCA9IHRydWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBtZW1vID0gaXRlcmF0b3IuY2FsbChjb250ZXh0LCBtZW1vLCB2YWx1ZSwgaW5kZXgsIGxpc3QpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIGlmICghaW5pdGlhbCkgdGhyb3cgbmV3IFR5cGVFcnJvcihyZWR1Y2VFcnJvcik7XG4gICAgcmV0dXJuIG1lbW87XG4gIH07XG5cbiAgLy8gVGhlIHJpZ2h0LWFzc29jaWF0aXZlIHZlcnNpb24gb2YgcmVkdWNlLCBhbHNvIGtub3duIGFzIGBmb2xkcmAuXG4gIC8vIERlbGVnYXRlcyB0byAqKkVDTUFTY3JpcHQgNSoqJ3MgbmF0aXZlIGByZWR1Y2VSaWdodGAgaWYgYXZhaWxhYmxlLlxuICBfLnJlZHVjZVJpZ2h0ID0gXy5mb2xkciA9IGZ1bmN0aW9uKG9iaiwgaXRlcmF0b3IsIG1lbW8sIGNvbnRleHQpIHtcbiAgICB2YXIgaW5pdGlhbCA9IGFyZ3VtZW50cy5sZW5ndGggPiAyO1xuICAgIGlmIChvYmogPT0gbnVsbCkgb2JqID0gW107XG4gICAgaWYgKG5hdGl2ZVJlZHVjZVJpZ2h0ICYmIG9iai5yZWR1Y2VSaWdodCA9PT0gbmF0aXZlUmVkdWNlUmlnaHQpIHtcbiAgICAgIGlmIChjb250ZXh0KSBpdGVyYXRvciA9IF8uYmluZChpdGVyYXRvciwgY29udGV4dCk7XG4gICAgICByZXR1cm4gaW5pdGlhbCA/IG9iai5yZWR1Y2VSaWdodChpdGVyYXRvciwgbWVtbykgOiBvYmoucmVkdWNlUmlnaHQoaXRlcmF0b3IpO1xuICAgIH1cbiAgICB2YXIgbGVuZ3RoID0gb2JqLmxlbmd0aDtcbiAgICBpZiAobGVuZ3RoICE9PSArbGVuZ3RoKSB7XG4gICAgICB2YXIga2V5cyA9IF8ua2V5cyhvYmopO1xuICAgICAgbGVuZ3RoID0ga2V5cy5sZW5ndGg7XG4gICAgfVxuICAgIGVhY2gob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGxpc3QpIHtcbiAgICAgIGluZGV4ID0ga2V5cyA/IGtleXNbLS1sZW5ndGhdIDogLS1sZW5ndGg7XG4gICAgICBpZiAoIWluaXRpYWwpIHtcbiAgICAgICAgbWVtbyA9IG9ialtpbmRleF07XG4gICAgICAgIGluaXRpYWwgPSB0cnVlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbWVtbyA9IGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgbWVtbywgb2JqW2luZGV4XSwgaW5kZXgsIGxpc3QpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIGlmICghaW5pdGlhbCkgdGhyb3cgbmV3IFR5cGVFcnJvcihyZWR1Y2VFcnJvcik7XG4gICAgcmV0dXJuIG1lbW87XG4gIH07XG5cbiAgLy8gUmV0dXJuIHRoZSBmaXJzdCB2YWx1ZSB3aGljaCBwYXNzZXMgYSB0cnV0aCB0ZXN0LiBBbGlhc2VkIGFzIGBkZXRlY3RgLlxuICBfLmZpbmQgPSBfLmRldGVjdCA9IGZ1bmN0aW9uKG9iaiwgcHJlZGljYXRlLCBjb250ZXh0KSB7XG4gICAgdmFyIHJlc3VsdDtcbiAgICBhbnkob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGxpc3QpIHtcbiAgICAgIGlmIChwcmVkaWNhdGUuY2FsbChjb250ZXh0LCB2YWx1ZSwgaW5kZXgsIGxpc3QpKSB7XG4gICAgICAgIHJlc3VsdCA9IHZhbHVlO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuXG4gIC8vIFJldHVybiBhbGwgdGhlIGVsZW1lbnRzIHRoYXQgcGFzcyBhIHRydXRoIHRlc3QuXG4gIC8vIERlbGVnYXRlcyB0byAqKkVDTUFTY3JpcHQgNSoqJ3MgbmF0aXZlIGBmaWx0ZXJgIGlmIGF2YWlsYWJsZS5cbiAgLy8gQWxpYXNlZCBhcyBgc2VsZWN0YC5cbiAgXy5maWx0ZXIgPSBfLnNlbGVjdCA9IGZ1bmN0aW9uKG9iaiwgcHJlZGljYXRlLCBjb250ZXh0KSB7XG4gICAgdmFyIHJlc3VsdHMgPSBbXTtcbiAgICBpZiAob2JqID09IG51bGwpIHJldHVybiByZXN1bHRzO1xuICAgIGlmIChuYXRpdmVGaWx0ZXIgJiYgb2JqLmZpbHRlciA9PT0gbmF0aXZlRmlsdGVyKSByZXR1cm4gb2JqLmZpbHRlcihwcmVkaWNhdGUsIGNvbnRleHQpO1xuICAgIGVhY2gob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGxpc3QpIHtcbiAgICAgIGlmIChwcmVkaWNhdGUuY2FsbChjb250ZXh0LCB2YWx1ZSwgaW5kZXgsIGxpc3QpKSByZXN1bHRzLnB1c2godmFsdWUpO1xuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHRzO1xuICB9O1xuXG4gIC8vIFJldHVybiBhbGwgdGhlIGVsZW1lbnRzIGZvciB3aGljaCBhIHRydXRoIHRlc3QgZmFpbHMuXG4gIF8ucmVqZWN0ID0gZnVuY3Rpb24ob2JqLCBwcmVkaWNhdGUsIGNvbnRleHQpIHtcbiAgICByZXR1cm4gXy5maWx0ZXIob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGxpc3QpIHtcbiAgICAgIHJldHVybiAhcHJlZGljYXRlLmNhbGwoY29udGV4dCwgdmFsdWUsIGluZGV4LCBsaXN0KTtcbiAgICB9LCBjb250ZXh0KTtcbiAgfTtcblxuICAvLyBEZXRlcm1pbmUgd2hldGhlciBhbGwgb2YgdGhlIGVsZW1lbnRzIG1hdGNoIGEgdHJ1dGggdGVzdC5cbiAgLy8gRGVsZWdhdGVzIHRvICoqRUNNQVNjcmlwdCA1KioncyBuYXRpdmUgYGV2ZXJ5YCBpZiBhdmFpbGFibGUuXG4gIC8vIEFsaWFzZWQgYXMgYGFsbGAuXG4gIF8uZXZlcnkgPSBfLmFsbCA9IGZ1bmN0aW9uKG9iaiwgcHJlZGljYXRlLCBjb250ZXh0KSB7XG4gICAgcHJlZGljYXRlIHx8IChwcmVkaWNhdGUgPSBfLmlkZW50aXR5KTtcbiAgICB2YXIgcmVzdWx0ID0gdHJ1ZTtcbiAgICBpZiAob2JqID09IG51bGwpIHJldHVybiByZXN1bHQ7XG4gICAgaWYgKG5hdGl2ZUV2ZXJ5ICYmIG9iai5ldmVyeSA9PT0gbmF0aXZlRXZlcnkpIHJldHVybiBvYmouZXZlcnkocHJlZGljYXRlLCBjb250ZXh0KTtcbiAgICBlYWNoKG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBsaXN0KSB7XG4gICAgICBpZiAoIShyZXN1bHQgPSByZXN1bHQgJiYgcHJlZGljYXRlLmNhbGwoY29udGV4dCwgdmFsdWUsIGluZGV4LCBsaXN0KSkpIHJldHVybiBicmVha2VyO1xuICAgIH0pO1xuICAgIHJldHVybiAhIXJlc3VsdDtcbiAgfTtcblxuICAvLyBEZXRlcm1pbmUgaWYgYXQgbGVhc3Qgb25lIGVsZW1lbnQgaW4gdGhlIG9iamVjdCBtYXRjaGVzIGEgdHJ1dGggdGVzdC5cbiAgLy8gRGVsZWdhdGVzIHRvICoqRUNNQVNjcmlwdCA1KioncyBuYXRpdmUgYHNvbWVgIGlmIGF2YWlsYWJsZS5cbiAgLy8gQWxpYXNlZCBhcyBgYW55YC5cbiAgdmFyIGFueSA9IF8uc29tZSA9IF8uYW55ID0gZnVuY3Rpb24ob2JqLCBwcmVkaWNhdGUsIGNvbnRleHQpIHtcbiAgICBwcmVkaWNhdGUgfHwgKHByZWRpY2F0ZSA9IF8uaWRlbnRpdHkpO1xuICAgIHZhciByZXN1bHQgPSBmYWxzZTtcbiAgICBpZiAob2JqID09IG51bGwpIHJldHVybiByZXN1bHQ7XG4gICAgaWYgKG5hdGl2ZVNvbWUgJiYgb2JqLnNvbWUgPT09IG5hdGl2ZVNvbWUpIHJldHVybiBvYmouc29tZShwcmVkaWNhdGUsIGNvbnRleHQpO1xuICAgIGVhY2gob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGxpc3QpIHtcbiAgICAgIGlmIChyZXN1bHQgfHwgKHJlc3VsdCA9IHByZWRpY2F0ZS5jYWxsKGNvbnRleHQsIHZhbHVlLCBpbmRleCwgbGlzdCkpKSByZXR1cm4gYnJlYWtlcjtcbiAgICB9KTtcbiAgICByZXR1cm4gISFyZXN1bHQ7XG4gIH07XG5cbiAgLy8gRGV0ZXJtaW5lIGlmIHRoZSBhcnJheSBvciBvYmplY3QgY29udGFpbnMgYSBnaXZlbiB2YWx1ZSAodXNpbmcgYD09PWApLlxuICAvLyBBbGlhc2VkIGFzIGBpbmNsdWRlYC5cbiAgXy5jb250YWlucyA9IF8uaW5jbHVkZSA9IGZ1bmN0aW9uKG9iaiwgdGFyZ2V0KSB7XG4gICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKG5hdGl2ZUluZGV4T2YgJiYgb2JqLmluZGV4T2YgPT09IG5hdGl2ZUluZGV4T2YpIHJldHVybiBvYmouaW5kZXhPZih0YXJnZXQpICE9IC0xO1xuICAgIHJldHVybiBhbnkob2JqLCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgcmV0dXJuIHZhbHVlID09PSB0YXJnZXQ7XG4gICAgfSk7XG4gIH07XG5cbiAgLy8gSW52b2tlIGEgbWV0aG9kICh3aXRoIGFyZ3VtZW50cykgb24gZXZlcnkgaXRlbSBpbiBhIGNvbGxlY3Rpb24uXG4gIF8uaW52b2tlID0gZnVuY3Rpb24ob2JqLCBtZXRob2QpIHtcbiAgICB2YXIgYXJncyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAyKTtcbiAgICB2YXIgaXNGdW5jID0gXy5pc0Z1bmN0aW9uKG1ldGhvZCk7XG4gICAgcmV0dXJuIF8ubWFwKG9iaiwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIHJldHVybiAoaXNGdW5jID8gbWV0aG9kIDogdmFsdWVbbWV0aG9kXSkuYXBwbHkodmFsdWUsIGFyZ3MpO1xuICAgIH0pO1xuICB9O1xuXG4gIC8vIENvbnZlbmllbmNlIHZlcnNpb24gb2YgYSBjb21tb24gdXNlIGNhc2Ugb2YgYG1hcGA6IGZldGNoaW5nIGEgcHJvcGVydHkuXG4gIF8ucGx1Y2sgPSBmdW5jdGlvbihvYmosIGtleSkge1xuICAgIHJldHVybiBfLm1hcChvYmosIF8ucHJvcGVydHkoa2V5KSk7XG4gIH07XG5cbiAgLy8gQ29udmVuaWVuY2UgdmVyc2lvbiBvZiBhIGNvbW1vbiB1c2UgY2FzZSBvZiBgZmlsdGVyYDogc2VsZWN0aW5nIG9ubHkgb2JqZWN0c1xuICAvLyBjb250YWluaW5nIHNwZWNpZmljIGBrZXk6dmFsdWVgIHBhaXJzLlxuICBfLndoZXJlID0gZnVuY3Rpb24ob2JqLCBhdHRycykge1xuICAgIHJldHVybiBfLmZpbHRlcihvYmosIF8ubWF0Y2hlcyhhdHRycykpO1xuICB9O1xuXG4gIC8vIENvbnZlbmllbmNlIHZlcnNpb24gb2YgYSBjb21tb24gdXNlIGNhc2Ugb2YgYGZpbmRgOiBnZXR0aW5nIHRoZSBmaXJzdCBvYmplY3RcbiAgLy8gY29udGFpbmluZyBzcGVjaWZpYyBga2V5OnZhbHVlYCBwYWlycy5cbiAgXy5maW5kV2hlcmUgPSBmdW5jdGlvbihvYmosIGF0dHJzKSB7XG4gICAgcmV0dXJuIF8uZmluZChvYmosIF8ubWF0Y2hlcyhhdHRycykpO1xuICB9O1xuXG4gIC8vIFJldHVybiB0aGUgbWF4aW11bSBlbGVtZW50IG9yIChlbGVtZW50LWJhc2VkIGNvbXB1dGF0aW9uKS5cbiAgLy8gQ2FuJ3Qgb3B0aW1pemUgYXJyYXlzIG9mIGludGVnZXJzIGxvbmdlciB0aGFuIDY1LDUzNSBlbGVtZW50cy5cbiAgLy8gU2VlIFtXZWJLaXQgQnVnIDgwNzk3XShodHRwczovL2J1Z3Mud2Via2l0Lm9yZy9zaG93X2J1Zy5jZ2k/aWQ9ODA3OTcpXG4gIF8ubWF4ID0gZnVuY3Rpb24ob2JqLCBpdGVyYXRvciwgY29udGV4dCkge1xuICAgIGlmICghaXRlcmF0b3IgJiYgXy5pc0FycmF5KG9iaikgJiYgb2JqWzBdID09PSArb2JqWzBdICYmIG9iai5sZW5ndGggPCA2NTUzNSkge1xuICAgICAgcmV0dXJuIE1hdGgubWF4LmFwcGx5KE1hdGgsIG9iaik7XG4gICAgfVxuICAgIHZhciByZXN1bHQgPSAtSW5maW5pdHksIGxhc3RDb21wdXRlZCA9IC1JbmZpbml0eTtcbiAgICBlYWNoKG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBsaXN0KSB7XG4gICAgICB2YXIgY29tcHV0ZWQgPSBpdGVyYXRvciA/IGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgdmFsdWUsIGluZGV4LCBsaXN0KSA6IHZhbHVlO1xuICAgICAgaWYgKGNvbXB1dGVkID4gbGFzdENvbXB1dGVkKSB7XG4gICAgICAgIHJlc3VsdCA9IHZhbHVlO1xuICAgICAgICBsYXN0Q29tcHV0ZWQgPSBjb21wdXRlZDtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuXG4gIC8vIFJldHVybiB0aGUgbWluaW11bSBlbGVtZW50IChvciBlbGVtZW50LWJhc2VkIGNvbXB1dGF0aW9uKS5cbiAgXy5taW4gPSBmdW5jdGlvbihvYmosIGl0ZXJhdG9yLCBjb250ZXh0KSB7XG4gICAgaWYgKCFpdGVyYXRvciAmJiBfLmlzQXJyYXkob2JqKSAmJiBvYmpbMF0gPT09ICtvYmpbMF0gJiYgb2JqLmxlbmd0aCA8IDY1NTM1KSB7XG4gICAgICByZXR1cm4gTWF0aC5taW4uYXBwbHkoTWF0aCwgb2JqKTtcbiAgICB9XG4gICAgdmFyIHJlc3VsdCA9IEluZmluaXR5LCBsYXN0Q29tcHV0ZWQgPSBJbmZpbml0eTtcbiAgICBlYWNoKG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBsaXN0KSB7XG4gICAgICB2YXIgY29tcHV0ZWQgPSBpdGVyYXRvciA/IGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgdmFsdWUsIGluZGV4LCBsaXN0KSA6IHZhbHVlO1xuICAgICAgaWYgKGNvbXB1dGVkIDwgbGFzdENvbXB1dGVkKSB7XG4gICAgICAgIHJlc3VsdCA9IHZhbHVlO1xuICAgICAgICBsYXN0Q29tcHV0ZWQgPSBjb21wdXRlZDtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuXG4gIC8vIFNodWZmbGUgYW4gYXJyYXksIHVzaW5nIHRoZSBtb2Rlcm4gdmVyc2lvbiBvZiB0aGVcbiAgLy8gW0Zpc2hlci1ZYXRlcyBzaHVmZmxlXShodHRwOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0Zpc2hlcuKAk1lhdGVzX3NodWZmbGUpLlxuICBfLnNodWZmbGUgPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIgcmFuZDtcbiAgICB2YXIgaW5kZXggPSAwO1xuICAgIHZhciBzaHVmZmxlZCA9IFtdO1xuICAgIGVhY2gob2JqLCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgcmFuZCA9IF8ucmFuZG9tKGluZGV4KyspO1xuICAgICAgc2h1ZmZsZWRbaW5kZXggLSAxXSA9IHNodWZmbGVkW3JhbmRdO1xuICAgICAgc2h1ZmZsZWRbcmFuZF0gPSB2YWx1ZTtcbiAgICB9KTtcbiAgICByZXR1cm4gc2h1ZmZsZWQ7XG4gIH07XG5cbiAgLy8gU2FtcGxlICoqbioqIHJhbmRvbSB2YWx1ZXMgZnJvbSBhIGNvbGxlY3Rpb24uXG4gIC8vIElmICoqbioqIGlzIG5vdCBzcGVjaWZpZWQsIHJldHVybnMgYSBzaW5nbGUgcmFuZG9tIGVsZW1lbnQuXG4gIC8vIFRoZSBpbnRlcm5hbCBgZ3VhcmRgIGFyZ3VtZW50IGFsbG93cyBpdCB0byB3b3JrIHdpdGggYG1hcGAuXG4gIF8uc2FtcGxlID0gZnVuY3Rpb24ob2JqLCBuLCBndWFyZCkge1xuICAgIGlmIChuID09IG51bGwgfHwgZ3VhcmQpIHtcbiAgICAgIGlmIChvYmoubGVuZ3RoICE9PSArb2JqLmxlbmd0aCkgb2JqID0gXy52YWx1ZXMob2JqKTtcbiAgICAgIHJldHVybiBvYmpbXy5yYW5kb20ob2JqLmxlbmd0aCAtIDEpXTtcbiAgICB9XG4gICAgcmV0dXJuIF8uc2h1ZmZsZShvYmopLnNsaWNlKDAsIE1hdGgubWF4KDAsIG4pKTtcbiAgfTtcblxuICAvLyBBbiBpbnRlcm5hbCBmdW5jdGlvbiB0byBnZW5lcmF0ZSBsb29rdXAgaXRlcmF0b3JzLlxuICB2YXIgbG9va3VwSXRlcmF0b3IgPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgIGlmICh2YWx1ZSA9PSBudWxsKSByZXR1cm4gXy5pZGVudGl0eTtcbiAgICBpZiAoXy5pc0Z1bmN0aW9uKHZhbHVlKSkgcmV0dXJuIHZhbHVlO1xuICAgIHJldHVybiBfLnByb3BlcnR5KHZhbHVlKTtcbiAgfTtcblxuICAvLyBTb3J0IHRoZSBvYmplY3QncyB2YWx1ZXMgYnkgYSBjcml0ZXJpb24gcHJvZHVjZWQgYnkgYW4gaXRlcmF0b3IuXG4gIF8uc29ydEJ5ID0gZnVuY3Rpb24ob2JqLCBpdGVyYXRvciwgY29udGV4dCkge1xuICAgIGl0ZXJhdG9yID0gbG9va3VwSXRlcmF0b3IoaXRlcmF0b3IpO1xuICAgIHJldHVybiBfLnBsdWNrKF8ubWFwKG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBsaXN0KSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICB2YWx1ZTogdmFsdWUsXG4gICAgICAgIGluZGV4OiBpbmRleCxcbiAgICAgICAgY3JpdGVyaWE6IGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgdmFsdWUsIGluZGV4LCBsaXN0KVxuICAgICAgfTtcbiAgICB9KS5zb3J0KGZ1bmN0aW9uKGxlZnQsIHJpZ2h0KSB7XG4gICAgICB2YXIgYSA9IGxlZnQuY3JpdGVyaWE7XG4gICAgICB2YXIgYiA9IHJpZ2h0LmNyaXRlcmlhO1xuICAgICAgaWYgKGEgIT09IGIpIHtcbiAgICAgICAgaWYgKGEgPiBiIHx8IGEgPT09IHZvaWQgMCkgcmV0dXJuIDE7XG4gICAgICAgIGlmIChhIDwgYiB8fCBiID09PSB2b2lkIDApIHJldHVybiAtMTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBsZWZ0LmluZGV4IC0gcmlnaHQuaW5kZXg7XG4gICAgfSksICd2YWx1ZScpO1xuICB9O1xuXG4gIC8vIEFuIGludGVybmFsIGZ1bmN0aW9uIHVzZWQgZm9yIGFnZ3JlZ2F0ZSBcImdyb3VwIGJ5XCIgb3BlcmF0aW9ucy5cbiAgdmFyIGdyb3VwID0gZnVuY3Rpb24oYmVoYXZpb3IpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24ob2JqLCBpdGVyYXRvciwgY29udGV4dCkge1xuICAgICAgdmFyIHJlc3VsdCA9IHt9O1xuICAgICAgaXRlcmF0b3IgPSBsb29rdXBJdGVyYXRvcihpdGVyYXRvcik7XG4gICAgICBlYWNoKG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4KSB7XG4gICAgICAgIHZhciBrZXkgPSBpdGVyYXRvci5jYWxsKGNvbnRleHQsIHZhbHVlLCBpbmRleCwgb2JqKTtcbiAgICAgICAgYmVoYXZpb3IocmVzdWx0LCBrZXksIHZhbHVlKTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xuICB9O1xuXG4gIC8vIEdyb3VwcyB0aGUgb2JqZWN0J3MgdmFsdWVzIGJ5IGEgY3JpdGVyaW9uLiBQYXNzIGVpdGhlciBhIHN0cmluZyBhdHRyaWJ1dGVcbiAgLy8gdG8gZ3JvdXAgYnksIG9yIGEgZnVuY3Rpb24gdGhhdCByZXR1cm5zIHRoZSBjcml0ZXJpb24uXG4gIF8uZ3JvdXBCeSA9IGdyb3VwKGZ1bmN0aW9uKHJlc3VsdCwga2V5LCB2YWx1ZSkge1xuICAgIF8uaGFzKHJlc3VsdCwga2V5KSA/IHJlc3VsdFtrZXldLnB1c2godmFsdWUpIDogcmVzdWx0W2tleV0gPSBbdmFsdWVdO1xuICB9KTtcblxuICAvLyBJbmRleGVzIHRoZSBvYmplY3QncyB2YWx1ZXMgYnkgYSBjcml0ZXJpb24sIHNpbWlsYXIgdG8gYGdyb3VwQnlgLCBidXQgZm9yXG4gIC8vIHdoZW4geW91IGtub3cgdGhhdCB5b3VyIGluZGV4IHZhbHVlcyB3aWxsIGJlIHVuaXF1ZS5cbiAgXy5pbmRleEJ5ID0gZ3JvdXAoZnVuY3Rpb24ocmVzdWx0LCBrZXksIHZhbHVlKSB7XG4gICAgcmVzdWx0W2tleV0gPSB2YWx1ZTtcbiAgfSk7XG5cbiAgLy8gQ291bnRzIGluc3RhbmNlcyBvZiBhbiBvYmplY3QgdGhhdCBncm91cCBieSBhIGNlcnRhaW4gY3JpdGVyaW9uLiBQYXNzXG4gIC8vIGVpdGhlciBhIHN0cmluZyBhdHRyaWJ1dGUgdG8gY291bnQgYnksIG9yIGEgZnVuY3Rpb24gdGhhdCByZXR1cm5zIHRoZVxuICAvLyBjcml0ZXJpb24uXG4gIF8uY291bnRCeSA9IGdyb3VwKGZ1bmN0aW9uKHJlc3VsdCwga2V5KSB7XG4gICAgXy5oYXMocmVzdWx0LCBrZXkpID8gcmVzdWx0W2tleV0rKyA6IHJlc3VsdFtrZXldID0gMTtcbiAgfSk7XG5cbiAgLy8gVXNlIGEgY29tcGFyYXRvciBmdW5jdGlvbiB0byBmaWd1cmUgb3V0IHRoZSBzbWFsbGVzdCBpbmRleCBhdCB3aGljaFxuICAvLyBhbiBvYmplY3Qgc2hvdWxkIGJlIGluc2VydGVkIHNvIGFzIHRvIG1haW50YWluIG9yZGVyLiBVc2VzIGJpbmFyeSBzZWFyY2guXG4gIF8uc29ydGVkSW5kZXggPSBmdW5jdGlvbihhcnJheSwgb2JqLCBpdGVyYXRvciwgY29udGV4dCkge1xuICAgIGl0ZXJhdG9yID0gbG9va3VwSXRlcmF0b3IoaXRlcmF0b3IpO1xuICAgIHZhciB2YWx1ZSA9IGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgb2JqKTtcbiAgICB2YXIgbG93ID0gMCwgaGlnaCA9IGFycmF5Lmxlbmd0aDtcbiAgICB3aGlsZSAobG93IDwgaGlnaCkge1xuICAgICAgdmFyIG1pZCA9IChsb3cgKyBoaWdoKSA+Pj4gMTtcbiAgICAgIGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgYXJyYXlbbWlkXSkgPCB2YWx1ZSA/IGxvdyA9IG1pZCArIDEgOiBoaWdoID0gbWlkO1xuICAgIH1cbiAgICByZXR1cm4gbG93O1xuICB9O1xuXG4gIC8vIFNhZmVseSBjcmVhdGUgYSByZWFsLCBsaXZlIGFycmF5IGZyb20gYW55dGhpbmcgaXRlcmFibGUuXG4gIF8udG9BcnJheSA9IGZ1bmN0aW9uKG9iaikge1xuICAgIGlmICghb2JqKSByZXR1cm4gW107XG4gICAgaWYgKF8uaXNBcnJheShvYmopKSByZXR1cm4gc2xpY2UuY2FsbChvYmopO1xuICAgIGlmIChvYmoubGVuZ3RoID09PSArb2JqLmxlbmd0aCkgcmV0dXJuIF8ubWFwKG9iaiwgXy5pZGVudGl0eSk7XG4gICAgcmV0dXJuIF8udmFsdWVzKG9iaik7XG4gIH07XG5cbiAgLy8gUmV0dXJuIHRoZSBudW1iZXIgb2YgZWxlbWVudHMgaW4gYW4gb2JqZWN0LlxuICBfLnNpemUgPSBmdW5jdGlvbihvYmopIHtcbiAgICBpZiAob2JqID09IG51bGwpIHJldHVybiAwO1xuICAgIHJldHVybiAob2JqLmxlbmd0aCA9PT0gK29iai5sZW5ndGgpID8gb2JqLmxlbmd0aCA6IF8ua2V5cyhvYmopLmxlbmd0aDtcbiAgfTtcblxuICAvLyBBcnJheSBGdW5jdGlvbnNcbiAgLy8gLS0tLS0tLS0tLS0tLS0tXG5cbiAgLy8gR2V0IHRoZSBmaXJzdCBlbGVtZW50IG9mIGFuIGFycmF5LiBQYXNzaW5nICoqbioqIHdpbGwgcmV0dXJuIHRoZSBmaXJzdCBOXG4gIC8vIHZhbHVlcyBpbiB0aGUgYXJyYXkuIEFsaWFzZWQgYXMgYGhlYWRgIGFuZCBgdGFrZWAuIFRoZSAqKmd1YXJkKiogY2hlY2tcbiAgLy8gYWxsb3dzIGl0IHRvIHdvcmsgd2l0aCBgXy5tYXBgLlxuICBfLmZpcnN0ID0gXy5oZWFkID0gXy50YWtlID0gZnVuY3Rpb24oYXJyYXksIG4sIGd1YXJkKSB7XG4gICAgaWYgKGFycmF5ID09IG51bGwpIHJldHVybiB2b2lkIDA7XG4gICAgaWYgKChuID09IG51bGwpIHx8IGd1YXJkKSByZXR1cm4gYXJyYXlbMF07XG4gICAgaWYgKG4gPCAwKSByZXR1cm4gW107XG4gICAgcmV0dXJuIHNsaWNlLmNhbGwoYXJyYXksIDAsIG4pO1xuICB9O1xuXG4gIC8vIFJldHVybnMgZXZlcnl0aGluZyBidXQgdGhlIGxhc3QgZW50cnkgb2YgdGhlIGFycmF5LiBFc3BlY2lhbGx5IHVzZWZ1bCBvblxuICAvLyB0aGUgYXJndW1lbnRzIG9iamVjdC4gUGFzc2luZyAqKm4qKiB3aWxsIHJldHVybiBhbGwgdGhlIHZhbHVlcyBpblxuICAvLyB0aGUgYXJyYXksIGV4Y2x1ZGluZyB0aGUgbGFzdCBOLiBUaGUgKipndWFyZCoqIGNoZWNrIGFsbG93cyBpdCB0byB3b3JrIHdpdGhcbiAgLy8gYF8ubWFwYC5cbiAgXy5pbml0aWFsID0gZnVuY3Rpb24oYXJyYXksIG4sIGd1YXJkKSB7XG4gICAgcmV0dXJuIHNsaWNlLmNhbGwoYXJyYXksIDAsIGFycmF5Lmxlbmd0aCAtICgobiA9PSBudWxsKSB8fCBndWFyZCA/IDEgOiBuKSk7XG4gIH07XG5cbiAgLy8gR2V0IHRoZSBsYXN0IGVsZW1lbnQgb2YgYW4gYXJyYXkuIFBhc3NpbmcgKipuKiogd2lsbCByZXR1cm4gdGhlIGxhc3QgTlxuICAvLyB2YWx1ZXMgaW4gdGhlIGFycmF5LiBUaGUgKipndWFyZCoqIGNoZWNrIGFsbG93cyBpdCB0byB3b3JrIHdpdGggYF8ubWFwYC5cbiAgXy5sYXN0ID0gZnVuY3Rpb24oYXJyYXksIG4sIGd1YXJkKSB7XG4gICAgaWYgKGFycmF5ID09IG51bGwpIHJldHVybiB2b2lkIDA7XG4gICAgaWYgKChuID09IG51bGwpIHx8IGd1YXJkKSByZXR1cm4gYXJyYXlbYXJyYXkubGVuZ3RoIC0gMV07XG4gICAgcmV0dXJuIHNsaWNlLmNhbGwoYXJyYXksIE1hdGgubWF4KGFycmF5Lmxlbmd0aCAtIG4sIDApKTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIGV2ZXJ5dGhpbmcgYnV0IHRoZSBmaXJzdCBlbnRyeSBvZiB0aGUgYXJyYXkuIEFsaWFzZWQgYXMgYHRhaWxgIGFuZCBgZHJvcGAuXG4gIC8vIEVzcGVjaWFsbHkgdXNlZnVsIG9uIHRoZSBhcmd1bWVudHMgb2JqZWN0LiBQYXNzaW5nIGFuICoqbioqIHdpbGwgcmV0dXJuXG4gIC8vIHRoZSByZXN0IE4gdmFsdWVzIGluIHRoZSBhcnJheS4gVGhlICoqZ3VhcmQqKlxuICAvLyBjaGVjayBhbGxvd3MgaXQgdG8gd29yayB3aXRoIGBfLm1hcGAuXG4gIF8ucmVzdCA9IF8udGFpbCA9IF8uZHJvcCA9IGZ1bmN0aW9uKGFycmF5LCBuLCBndWFyZCkge1xuICAgIHJldHVybiBzbGljZS5jYWxsKGFycmF5LCAobiA9PSBudWxsKSB8fCBndWFyZCA/IDEgOiBuKTtcbiAgfTtcblxuICAvLyBUcmltIG91dCBhbGwgZmFsc3kgdmFsdWVzIGZyb20gYW4gYXJyYXkuXG4gIF8uY29tcGFjdCA9IGZ1bmN0aW9uKGFycmF5KSB7XG4gICAgcmV0dXJuIF8uZmlsdGVyKGFycmF5LCBfLmlkZW50aXR5KTtcbiAgfTtcblxuICAvLyBJbnRlcm5hbCBpbXBsZW1lbnRhdGlvbiBvZiBhIHJlY3Vyc2l2ZSBgZmxhdHRlbmAgZnVuY3Rpb24uXG4gIHZhciBmbGF0dGVuID0gZnVuY3Rpb24oaW5wdXQsIHNoYWxsb3csIG91dHB1dCkge1xuICAgIGlmIChzaGFsbG93ICYmIF8uZXZlcnkoaW5wdXQsIF8uaXNBcnJheSkpIHtcbiAgICAgIHJldHVybiBjb25jYXQuYXBwbHkob3V0cHV0LCBpbnB1dCk7XG4gICAgfVxuICAgIGVhY2goaW5wdXQsIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICBpZiAoXy5pc0FycmF5KHZhbHVlKSB8fCBfLmlzQXJndW1lbnRzKHZhbHVlKSkge1xuICAgICAgICBzaGFsbG93ID8gcHVzaC5hcHBseShvdXRwdXQsIHZhbHVlKSA6IGZsYXR0ZW4odmFsdWUsIHNoYWxsb3csIG91dHB1dCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvdXRwdXQucHVzaCh2YWx1ZSk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIG91dHB1dDtcbiAgfTtcblxuICAvLyBGbGF0dGVuIG91dCBhbiBhcnJheSwgZWl0aGVyIHJlY3Vyc2l2ZWx5IChieSBkZWZhdWx0KSwgb3IganVzdCBvbmUgbGV2ZWwuXG4gIF8uZmxhdHRlbiA9IGZ1bmN0aW9uKGFycmF5LCBzaGFsbG93KSB7XG4gICAgcmV0dXJuIGZsYXR0ZW4oYXJyYXksIHNoYWxsb3csIFtdKTtcbiAgfTtcblxuICAvLyBSZXR1cm4gYSB2ZXJzaW9uIG9mIHRoZSBhcnJheSB0aGF0IGRvZXMgbm90IGNvbnRhaW4gdGhlIHNwZWNpZmllZCB2YWx1ZShzKS5cbiAgXy53aXRob3V0ID0gZnVuY3Rpb24oYXJyYXkpIHtcbiAgICByZXR1cm4gXy5kaWZmZXJlbmNlKGFycmF5LCBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSkpO1xuICB9O1xuXG4gIC8vIFNwbGl0IGFuIGFycmF5IGludG8gdHdvIGFycmF5czogb25lIHdob3NlIGVsZW1lbnRzIGFsbCBzYXRpc2Z5IHRoZSBnaXZlblxuICAvLyBwcmVkaWNhdGUsIGFuZCBvbmUgd2hvc2UgZWxlbWVudHMgYWxsIGRvIG5vdCBzYXRpc2Z5IHRoZSBwcmVkaWNhdGUuXG4gIF8ucGFydGl0aW9uID0gZnVuY3Rpb24oYXJyYXksIHByZWRpY2F0ZSkge1xuICAgIHZhciBwYXNzID0gW10sIGZhaWwgPSBbXTtcbiAgICBlYWNoKGFycmF5LCBmdW5jdGlvbihlbGVtKSB7XG4gICAgICAocHJlZGljYXRlKGVsZW0pID8gcGFzcyA6IGZhaWwpLnB1c2goZWxlbSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIFtwYXNzLCBmYWlsXTtcbiAgfTtcblxuICAvLyBQcm9kdWNlIGEgZHVwbGljYXRlLWZyZWUgdmVyc2lvbiBvZiB0aGUgYXJyYXkuIElmIHRoZSBhcnJheSBoYXMgYWxyZWFkeVxuICAvLyBiZWVuIHNvcnRlZCwgeW91IGhhdmUgdGhlIG9wdGlvbiBvZiB1c2luZyBhIGZhc3RlciBhbGdvcml0aG0uXG4gIC8vIEFsaWFzZWQgYXMgYHVuaXF1ZWAuXG4gIF8udW5pcSA9IF8udW5pcXVlID0gZnVuY3Rpb24oYXJyYXksIGlzU29ydGVkLCBpdGVyYXRvciwgY29udGV4dCkge1xuICAgIGlmIChfLmlzRnVuY3Rpb24oaXNTb3J0ZWQpKSB7XG4gICAgICBjb250ZXh0ID0gaXRlcmF0b3I7XG4gICAgICBpdGVyYXRvciA9IGlzU29ydGVkO1xuICAgICAgaXNTb3J0ZWQgPSBmYWxzZTtcbiAgICB9XG4gICAgdmFyIGluaXRpYWwgPSBpdGVyYXRvciA/IF8ubWFwKGFycmF5LCBpdGVyYXRvciwgY29udGV4dCkgOiBhcnJheTtcbiAgICB2YXIgcmVzdWx0cyA9IFtdO1xuICAgIHZhciBzZWVuID0gW107XG4gICAgZWFjaChpbml0aWFsLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgpIHtcbiAgICAgIGlmIChpc1NvcnRlZCA/ICghaW5kZXggfHwgc2VlbltzZWVuLmxlbmd0aCAtIDFdICE9PSB2YWx1ZSkgOiAhXy5jb250YWlucyhzZWVuLCB2YWx1ZSkpIHtcbiAgICAgICAgc2Vlbi5wdXNoKHZhbHVlKTtcbiAgICAgICAgcmVzdWx0cy5wdXNoKGFycmF5W2luZGV4XSk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdHM7XG4gIH07XG5cbiAgLy8gUHJvZHVjZSBhbiBhcnJheSB0aGF0IGNvbnRhaW5zIHRoZSB1bmlvbjogZWFjaCBkaXN0aW5jdCBlbGVtZW50IGZyb20gYWxsIG9mXG4gIC8vIHRoZSBwYXNzZWQtaW4gYXJyYXlzLlxuICBfLnVuaW9uID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIF8udW5pcShfLmZsYXR0ZW4oYXJndW1lbnRzLCB0cnVlKSk7XG4gIH07XG5cbiAgLy8gUHJvZHVjZSBhbiBhcnJheSB0aGF0IGNvbnRhaW5zIGV2ZXJ5IGl0ZW0gc2hhcmVkIGJldHdlZW4gYWxsIHRoZVxuICAvLyBwYXNzZWQtaW4gYXJyYXlzLlxuICBfLmludGVyc2VjdGlvbiA9IGZ1bmN0aW9uKGFycmF5KSB7XG4gICAgdmFyIHJlc3QgPSBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgcmV0dXJuIF8uZmlsdGVyKF8udW5pcShhcnJheSksIGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgIHJldHVybiBfLmV2ZXJ5KHJlc3QsIGZ1bmN0aW9uKG90aGVyKSB7XG4gICAgICAgIHJldHVybiBfLmNvbnRhaW5zKG90aGVyLCBpdGVtKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9O1xuXG4gIC8vIFRha2UgdGhlIGRpZmZlcmVuY2UgYmV0d2VlbiBvbmUgYXJyYXkgYW5kIGEgbnVtYmVyIG9mIG90aGVyIGFycmF5cy5cbiAgLy8gT25seSB0aGUgZWxlbWVudHMgcHJlc2VudCBpbiBqdXN0IHRoZSBmaXJzdCBhcnJheSB3aWxsIHJlbWFpbi5cbiAgXy5kaWZmZXJlbmNlID0gZnVuY3Rpb24oYXJyYXkpIHtcbiAgICB2YXIgcmVzdCA9IGNvbmNhdC5hcHBseShBcnJheVByb3RvLCBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSkpO1xuICAgIHJldHVybiBfLmZpbHRlcihhcnJheSwgZnVuY3Rpb24odmFsdWUpeyByZXR1cm4gIV8uY29udGFpbnMocmVzdCwgdmFsdWUpOyB9KTtcbiAgfTtcblxuICAvLyBaaXAgdG9nZXRoZXIgbXVsdGlwbGUgbGlzdHMgaW50byBhIHNpbmdsZSBhcnJheSAtLSBlbGVtZW50cyB0aGF0IHNoYXJlXG4gIC8vIGFuIGluZGV4IGdvIHRvZ2V0aGVyLlxuICBfLnppcCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBsZW5ndGggPSBfLm1heChfLnBsdWNrKGFyZ3VtZW50cywgJ2xlbmd0aCcpLmNvbmNhdCgwKSk7XG4gICAgdmFyIHJlc3VsdHMgPSBuZXcgQXJyYXkobGVuZ3RoKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICByZXN1bHRzW2ldID0gXy5wbHVjayhhcmd1bWVudHMsICcnICsgaSk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHRzO1xuICB9O1xuXG4gIC8vIENvbnZlcnRzIGxpc3RzIGludG8gb2JqZWN0cy4gUGFzcyBlaXRoZXIgYSBzaW5nbGUgYXJyYXkgb2YgYFtrZXksIHZhbHVlXWBcbiAgLy8gcGFpcnMsIG9yIHR3byBwYXJhbGxlbCBhcnJheXMgb2YgdGhlIHNhbWUgbGVuZ3RoIC0tIG9uZSBvZiBrZXlzLCBhbmQgb25lIG9mXG4gIC8vIHRoZSBjb3JyZXNwb25kaW5nIHZhbHVlcy5cbiAgXy5vYmplY3QgPSBmdW5jdGlvbihsaXN0LCB2YWx1ZXMpIHtcbiAgICBpZiAobGlzdCA9PSBudWxsKSByZXR1cm4ge307XG4gICAgdmFyIHJlc3VsdCA9IHt9O1xuICAgIGZvciAodmFyIGkgPSAwLCBsZW5ndGggPSBsaXN0Lmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAodmFsdWVzKSB7XG4gICAgICAgIHJlc3VsdFtsaXN0W2ldXSA9IHZhbHVlc1tpXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc3VsdFtsaXN0W2ldWzBdXSA9IGxpc3RbaV1bMV07XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG5cbiAgLy8gSWYgdGhlIGJyb3dzZXIgZG9lc24ndCBzdXBwbHkgdXMgd2l0aCBpbmRleE9mIChJJ20gbG9va2luZyBhdCB5b3UsICoqTVNJRSoqKSxcbiAgLy8gd2UgbmVlZCB0aGlzIGZ1bmN0aW9uLiBSZXR1cm4gdGhlIHBvc2l0aW9uIG9mIHRoZSBmaXJzdCBvY2N1cnJlbmNlIG9mIGFuXG4gIC8vIGl0ZW0gaW4gYW4gYXJyYXksIG9yIC0xIGlmIHRoZSBpdGVtIGlzIG5vdCBpbmNsdWRlZCBpbiB0aGUgYXJyYXkuXG4gIC8vIERlbGVnYXRlcyB0byAqKkVDTUFTY3JpcHQgNSoqJ3MgbmF0aXZlIGBpbmRleE9mYCBpZiBhdmFpbGFibGUuXG4gIC8vIElmIHRoZSBhcnJheSBpcyBsYXJnZSBhbmQgYWxyZWFkeSBpbiBzb3J0IG9yZGVyLCBwYXNzIGB0cnVlYFxuICAvLyBmb3IgKippc1NvcnRlZCoqIHRvIHVzZSBiaW5hcnkgc2VhcmNoLlxuICBfLmluZGV4T2YgPSBmdW5jdGlvbihhcnJheSwgaXRlbSwgaXNTb3J0ZWQpIHtcbiAgICBpZiAoYXJyYXkgPT0gbnVsbCkgcmV0dXJuIC0xO1xuICAgIHZhciBpID0gMCwgbGVuZ3RoID0gYXJyYXkubGVuZ3RoO1xuICAgIGlmIChpc1NvcnRlZCkge1xuICAgICAgaWYgKHR5cGVvZiBpc1NvcnRlZCA9PSAnbnVtYmVyJykge1xuICAgICAgICBpID0gKGlzU29ydGVkIDwgMCA/IE1hdGgubWF4KDAsIGxlbmd0aCArIGlzU29ydGVkKSA6IGlzU29ydGVkKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGkgPSBfLnNvcnRlZEluZGV4KGFycmF5LCBpdGVtKTtcbiAgICAgICAgcmV0dXJuIGFycmF5W2ldID09PSBpdGVtID8gaSA6IC0xO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAobmF0aXZlSW5kZXhPZiAmJiBhcnJheS5pbmRleE9mID09PSBuYXRpdmVJbmRleE9mKSByZXR1cm4gYXJyYXkuaW5kZXhPZihpdGVtLCBpc1NvcnRlZCk7XG4gICAgZm9yICg7IGkgPCBsZW5ndGg7IGkrKykgaWYgKGFycmF5W2ldID09PSBpdGVtKSByZXR1cm4gaTtcbiAgICByZXR1cm4gLTE7XG4gIH07XG5cbiAgLy8gRGVsZWdhdGVzIHRvICoqRUNNQVNjcmlwdCA1KioncyBuYXRpdmUgYGxhc3RJbmRleE9mYCBpZiBhdmFpbGFibGUuXG4gIF8ubGFzdEluZGV4T2YgPSBmdW5jdGlvbihhcnJheSwgaXRlbSwgZnJvbSkge1xuICAgIGlmIChhcnJheSA9PSBudWxsKSByZXR1cm4gLTE7XG4gICAgdmFyIGhhc0luZGV4ID0gZnJvbSAhPSBudWxsO1xuICAgIGlmIChuYXRpdmVMYXN0SW5kZXhPZiAmJiBhcnJheS5sYXN0SW5kZXhPZiA9PT0gbmF0aXZlTGFzdEluZGV4T2YpIHtcbiAgICAgIHJldHVybiBoYXNJbmRleCA/IGFycmF5Lmxhc3RJbmRleE9mKGl0ZW0sIGZyb20pIDogYXJyYXkubGFzdEluZGV4T2YoaXRlbSk7XG4gICAgfVxuICAgIHZhciBpID0gKGhhc0luZGV4ID8gZnJvbSA6IGFycmF5Lmxlbmd0aCk7XG4gICAgd2hpbGUgKGktLSkgaWYgKGFycmF5W2ldID09PSBpdGVtKSByZXR1cm4gaTtcbiAgICByZXR1cm4gLTE7XG4gIH07XG5cbiAgLy8gR2VuZXJhdGUgYW4gaW50ZWdlciBBcnJheSBjb250YWluaW5nIGFuIGFyaXRobWV0aWMgcHJvZ3Jlc3Npb24uIEEgcG9ydCBvZlxuICAvLyB0aGUgbmF0aXZlIFB5dGhvbiBgcmFuZ2UoKWAgZnVuY3Rpb24uIFNlZVxuICAvLyBbdGhlIFB5dGhvbiBkb2N1bWVudGF0aW9uXShodHRwOi8vZG9jcy5weXRob24ub3JnL2xpYnJhcnkvZnVuY3Rpb25zLmh0bWwjcmFuZ2UpLlxuICBfLnJhbmdlID0gZnVuY3Rpb24oc3RhcnQsIHN0b3AsIHN0ZXApIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA8PSAxKSB7XG4gICAgICBzdG9wID0gc3RhcnQgfHwgMDtcbiAgICAgIHN0YXJ0ID0gMDtcbiAgICB9XG4gICAgc3RlcCA9IGFyZ3VtZW50c1syXSB8fCAxO1xuXG4gICAgdmFyIGxlbmd0aCA9IE1hdGgubWF4KE1hdGguY2VpbCgoc3RvcCAtIHN0YXJ0KSAvIHN0ZXApLCAwKTtcbiAgICB2YXIgaWR4ID0gMDtcbiAgICB2YXIgcmFuZ2UgPSBuZXcgQXJyYXkobGVuZ3RoKTtcblxuICAgIHdoaWxlKGlkeCA8IGxlbmd0aCkge1xuICAgICAgcmFuZ2VbaWR4KytdID0gc3RhcnQ7XG4gICAgICBzdGFydCArPSBzdGVwO1xuICAgIH1cblxuICAgIHJldHVybiByYW5nZTtcbiAgfTtcblxuICAvLyBGdW5jdGlvbiAoYWhlbSkgRnVuY3Rpb25zXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIC8vIFJldXNhYmxlIGNvbnN0cnVjdG9yIGZ1bmN0aW9uIGZvciBwcm90b3R5cGUgc2V0dGluZy5cbiAgdmFyIGN0b3IgPSBmdW5jdGlvbigpe307XG5cbiAgLy8gQ3JlYXRlIGEgZnVuY3Rpb24gYm91bmQgdG8gYSBnaXZlbiBvYmplY3QgKGFzc2lnbmluZyBgdGhpc2AsIGFuZCBhcmd1bWVudHMsXG4gIC8vIG9wdGlvbmFsbHkpLiBEZWxlZ2F0ZXMgdG8gKipFQ01BU2NyaXB0IDUqKidzIG5hdGl2ZSBgRnVuY3Rpb24uYmluZGAgaWZcbiAgLy8gYXZhaWxhYmxlLlxuICBfLmJpbmQgPSBmdW5jdGlvbihmdW5jLCBjb250ZXh0KSB7XG4gICAgdmFyIGFyZ3MsIGJvdW5kO1xuICAgIGlmIChuYXRpdmVCaW5kICYmIGZ1bmMuYmluZCA9PT0gbmF0aXZlQmluZCkgcmV0dXJuIG5hdGl2ZUJpbmQuYXBwbHkoZnVuYywgc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcbiAgICBpZiAoIV8uaXNGdW5jdGlvbihmdW5jKSkgdGhyb3cgbmV3IFR5cGVFcnJvcjtcbiAgICBhcmdzID0gc2xpY2UuY2FsbChhcmd1bWVudHMsIDIpO1xuICAgIHJldHVybiBib3VuZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIGJvdW5kKSkgcmV0dXJuIGZ1bmMuYXBwbHkoY29udGV4dCwgYXJncy5jb25jYXQoc2xpY2UuY2FsbChhcmd1bWVudHMpKSk7XG4gICAgICBjdG9yLnByb3RvdHlwZSA9IGZ1bmMucHJvdG90eXBlO1xuICAgICAgdmFyIHNlbGYgPSBuZXcgY3RvcjtcbiAgICAgIGN0b3IucHJvdG90eXBlID0gbnVsbDtcbiAgICAgIHZhciByZXN1bHQgPSBmdW5jLmFwcGx5KHNlbGYsIGFyZ3MuY29uY2F0KHNsaWNlLmNhbGwoYXJndW1lbnRzKSkpO1xuICAgICAgaWYgKE9iamVjdChyZXN1bHQpID09PSByZXN1bHQpIHJldHVybiByZXN1bHQ7XG4gICAgICByZXR1cm4gc2VsZjtcbiAgICB9O1xuICB9O1xuXG4gIC8vIFBhcnRpYWxseSBhcHBseSBhIGZ1bmN0aW9uIGJ5IGNyZWF0aW5nIGEgdmVyc2lvbiB0aGF0IGhhcyBoYWQgc29tZSBvZiBpdHNcbiAgLy8gYXJndW1lbnRzIHByZS1maWxsZWQsIHdpdGhvdXQgY2hhbmdpbmcgaXRzIGR5bmFtaWMgYHRoaXNgIGNvbnRleHQuIF8gYWN0c1xuICAvLyBhcyBhIHBsYWNlaG9sZGVyLCBhbGxvd2luZyBhbnkgY29tYmluYXRpb24gb2YgYXJndW1lbnRzIHRvIGJlIHByZS1maWxsZWQuXG4gIF8ucGFydGlhbCA9IGZ1bmN0aW9uKGZ1bmMpIHtcbiAgICB2YXIgYm91bmRBcmdzID0gc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBwb3NpdGlvbiA9IDA7XG4gICAgICB2YXIgYXJncyA9IGJvdW5kQXJncy5zbGljZSgpO1xuICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbmd0aCA9IGFyZ3MubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKGFyZ3NbaV0gPT09IF8pIGFyZ3NbaV0gPSBhcmd1bWVudHNbcG9zaXRpb24rK107XG4gICAgICB9XG4gICAgICB3aGlsZSAocG9zaXRpb24gPCBhcmd1bWVudHMubGVuZ3RoKSBhcmdzLnB1c2goYXJndW1lbnRzW3Bvc2l0aW9uKytdKTtcbiAgICAgIHJldHVybiBmdW5jLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH07XG4gIH07XG5cbiAgLy8gQmluZCBhIG51bWJlciBvZiBhbiBvYmplY3QncyBtZXRob2RzIHRvIHRoYXQgb2JqZWN0LiBSZW1haW5pbmcgYXJndW1lbnRzXG4gIC8vIGFyZSB0aGUgbWV0aG9kIG5hbWVzIHRvIGJlIGJvdW5kLiBVc2VmdWwgZm9yIGVuc3VyaW5nIHRoYXQgYWxsIGNhbGxiYWNrc1xuICAvLyBkZWZpbmVkIG9uIGFuIG9iamVjdCBiZWxvbmcgdG8gaXQuXG4gIF8uYmluZEFsbCA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHZhciBmdW5jcyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICBpZiAoZnVuY3MubGVuZ3RoID09PSAwKSB0aHJvdyBuZXcgRXJyb3IoJ2JpbmRBbGwgbXVzdCBiZSBwYXNzZWQgZnVuY3Rpb24gbmFtZXMnKTtcbiAgICBlYWNoKGZ1bmNzLCBmdW5jdGlvbihmKSB7IG9ialtmXSA9IF8uYmluZChvYmpbZl0sIG9iaik7IH0pO1xuICAgIHJldHVybiBvYmo7XG4gIH07XG5cbiAgLy8gTWVtb2l6ZSBhbiBleHBlbnNpdmUgZnVuY3Rpb24gYnkgc3RvcmluZyBpdHMgcmVzdWx0cy5cbiAgXy5tZW1vaXplID0gZnVuY3Rpb24oZnVuYywgaGFzaGVyKSB7XG4gICAgdmFyIG1lbW8gPSB7fTtcbiAgICBoYXNoZXIgfHwgKGhhc2hlciA9IF8uaWRlbnRpdHkpO1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBrZXkgPSBoYXNoZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgIHJldHVybiBfLmhhcyhtZW1vLCBrZXkpID8gbWVtb1trZXldIDogKG1lbW9ba2V5XSA9IGZ1bmMuYXBwbHkodGhpcywgYXJndW1lbnRzKSk7XG4gICAgfTtcbiAgfTtcblxuICAvLyBEZWxheXMgYSBmdW5jdGlvbiBmb3IgdGhlIGdpdmVuIG51bWJlciBvZiBtaWxsaXNlY29uZHMsIGFuZCB0aGVuIGNhbGxzXG4gIC8vIGl0IHdpdGggdGhlIGFyZ3VtZW50cyBzdXBwbGllZC5cbiAgXy5kZWxheSA9IGZ1bmN0aW9uKGZ1bmMsIHdhaXQpIHtcbiAgICB2YXIgYXJncyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAyKTtcbiAgICByZXR1cm4gc2V0VGltZW91dChmdW5jdGlvbigpeyByZXR1cm4gZnVuYy5hcHBseShudWxsLCBhcmdzKTsgfSwgd2FpdCk7XG4gIH07XG5cbiAgLy8gRGVmZXJzIGEgZnVuY3Rpb24sIHNjaGVkdWxpbmcgaXQgdG8gcnVuIGFmdGVyIHRoZSBjdXJyZW50IGNhbGwgc3RhY2sgaGFzXG4gIC8vIGNsZWFyZWQuXG4gIF8uZGVmZXIgPSBmdW5jdGlvbihmdW5jKSB7XG4gICAgcmV0dXJuIF8uZGVsYXkuYXBwbHkoXywgW2Z1bmMsIDFdLmNvbmNhdChzbGljZS5jYWxsKGFyZ3VtZW50cywgMSkpKTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIGEgZnVuY3Rpb24sIHRoYXQsIHdoZW4gaW52b2tlZCwgd2lsbCBvbmx5IGJlIHRyaWdnZXJlZCBhdCBtb3N0IG9uY2VcbiAgLy8gZHVyaW5nIGEgZ2l2ZW4gd2luZG93IG9mIHRpbWUuIE5vcm1hbGx5LCB0aGUgdGhyb3R0bGVkIGZ1bmN0aW9uIHdpbGwgcnVuXG4gIC8vIGFzIG11Y2ggYXMgaXQgY2FuLCB3aXRob3V0IGV2ZXIgZ29pbmcgbW9yZSB0aGFuIG9uY2UgcGVyIGB3YWl0YCBkdXJhdGlvbjtcbiAgLy8gYnV0IGlmIHlvdSdkIGxpa2UgdG8gZGlzYWJsZSB0aGUgZXhlY3V0aW9uIG9uIHRoZSBsZWFkaW5nIGVkZ2UsIHBhc3NcbiAgLy8gYHtsZWFkaW5nOiBmYWxzZX1gLiBUbyBkaXNhYmxlIGV4ZWN1dGlvbiBvbiB0aGUgdHJhaWxpbmcgZWRnZSwgZGl0dG8uXG4gIF8udGhyb3R0bGUgPSBmdW5jdGlvbihmdW5jLCB3YWl0LCBvcHRpb25zKSB7XG4gICAgdmFyIGNvbnRleHQsIGFyZ3MsIHJlc3VsdDtcbiAgICB2YXIgdGltZW91dCA9IG51bGw7XG4gICAgdmFyIHByZXZpb3VzID0gMDtcbiAgICBvcHRpb25zIHx8IChvcHRpb25zID0ge30pO1xuICAgIHZhciBsYXRlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgcHJldmlvdXMgPSBvcHRpb25zLmxlYWRpbmcgPT09IGZhbHNlID8gMCA6IF8ubm93KCk7XG4gICAgICB0aW1lb3V0ID0gbnVsbDtcbiAgICAgIHJlc3VsdCA9IGZ1bmMuYXBwbHkoY29udGV4dCwgYXJncyk7XG4gICAgICBjb250ZXh0ID0gYXJncyA9IG51bGw7XG4gICAgfTtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgbm93ID0gXy5ub3coKTtcbiAgICAgIGlmICghcHJldmlvdXMgJiYgb3B0aW9ucy5sZWFkaW5nID09PSBmYWxzZSkgcHJldmlvdXMgPSBub3c7XG4gICAgICB2YXIgcmVtYWluaW5nID0gd2FpdCAtIChub3cgLSBwcmV2aW91cyk7XG4gICAgICBjb250ZXh0ID0gdGhpcztcbiAgICAgIGFyZ3MgPSBhcmd1bWVudHM7XG4gICAgICBpZiAocmVtYWluaW5nIDw9IDApIHtcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuICAgICAgICB0aW1lb3V0ID0gbnVsbDtcbiAgICAgICAgcHJldmlvdXMgPSBub3c7XG4gICAgICAgIHJlc3VsdCA9IGZ1bmMuYXBwbHkoY29udGV4dCwgYXJncyk7XG4gICAgICAgIGNvbnRleHQgPSBhcmdzID0gbnVsbDtcbiAgICAgIH0gZWxzZSBpZiAoIXRpbWVvdXQgJiYgb3B0aW9ucy50cmFpbGluZyAhPT0gZmFsc2UpIHtcbiAgICAgICAgdGltZW91dCA9IHNldFRpbWVvdXQobGF0ZXIsIHJlbWFpbmluZyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG4gIH07XG5cbiAgLy8gUmV0dXJucyBhIGZ1bmN0aW9uLCB0aGF0LCBhcyBsb25nIGFzIGl0IGNvbnRpbnVlcyB0byBiZSBpbnZva2VkLCB3aWxsIG5vdFxuICAvLyBiZSB0cmlnZ2VyZWQuIFRoZSBmdW5jdGlvbiB3aWxsIGJlIGNhbGxlZCBhZnRlciBpdCBzdG9wcyBiZWluZyBjYWxsZWQgZm9yXG4gIC8vIE4gbWlsbGlzZWNvbmRzLiBJZiBgaW1tZWRpYXRlYCBpcyBwYXNzZWQsIHRyaWdnZXIgdGhlIGZ1bmN0aW9uIG9uIHRoZVxuICAvLyBsZWFkaW5nIGVkZ2UsIGluc3RlYWQgb2YgdGhlIHRyYWlsaW5nLlxuICBfLmRlYm91bmNlID0gZnVuY3Rpb24oZnVuYywgd2FpdCwgaW1tZWRpYXRlKSB7XG4gICAgdmFyIHRpbWVvdXQsIGFyZ3MsIGNvbnRleHQsIHRpbWVzdGFtcCwgcmVzdWx0O1xuXG4gICAgdmFyIGxhdGVyID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgbGFzdCA9IF8ubm93KCkgLSB0aW1lc3RhbXA7XG4gICAgICBpZiAobGFzdCA8IHdhaXQpIHtcbiAgICAgICAgdGltZW91dCA9IHNldFRpbWVvdXQobGF0ZXIsIHdhaXQgLSBsYXN0KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRpbWVvdXQgPSBudWxsO1xuICAgICAgICBpZiAoIWltbWVkaWF0ZSkge1xuICAgICAgICAgIHJlc3VsdCA9IGZ1bmMuYXBwbHkoY29udGV4dCwgYXJncyk7XG4gICAgICAgICAgY29udGV4dCA9IGFyZ3MgPSBudWxsO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcblxuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIGNvbnRleHQgPSB0aGlzO1xuICAgICAgYXJncyA9IGFyZ3VtZW50cztcbiAgICAgIHRpbWVzdGFtcCA9IF8ubm93KCk7XG4gICAgICB2YXIgY2FsbE5vdyA9IGltbWVkaWF0ZSAmJiAhdGltZW91dDtcbiAgICAgIGlmICghdGltZW91dCkge1xuICAgICAgICB0aW1lb3V0ID0gc2V0VGltZW91dChsYXRlciwgd2FpdCk7XG4gICAgICB9XG4gICAgICBpZiAoY2FsbE5vdykge1xuICAgICAgICByZXN1bHQgPSBmdW5jLmFwcGx5KGNvbnRleHQsIGFyZ3MpO1xuICAgICAgICBjb250ZXh0ID0gYXJncyA9IG51bGw7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIGEgZnVuY3Rpb24gdGhhdCB3aWxsIGJlIGV4ZWN1dGVkIGF0IG1vc3Qgb25lIHRpbWUsIG5vIG1hdHRlciBob3dcbiAgLy8gb2Z0ZW4geW91IGNhbGwgaXQuIFVzZWZ1bCBmb3IgbGF6eSBpbml0aWFsaXphdGlvbi5cbiAgXy5vbmNlID0gZnVuY3Rpb24oZnVuYykge1xuICAgIHZhciByYW4gPSBmYWxzZSwgbWVtbztcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICBpZiAocmFuKSByZXR1cm4gbWVtbztcbiAgICAgIHJhbiA9IHRydWU7XG4gICAgICBtZW1vID0gZnVuYy5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgZnVuYyA9IG51bGw7XG4gICAgICByZXR1cm4gbWVtbztcbiAgICB9O1xuICB9O1xuXG4gIC8vIFJldHVybnMgdGhlIGZpcnN0IGZ1bmN0aW9uIHBhc3NlZCBhcyBhbiBhcmd1bWVudCB0byB0aGUgc2Vjb25kLFxuICAvLyBhbGxvd2luZyB5b3UgdG8gYWRqdXN0IGFyZ3VtZW50cywgcnVuIGNvZGUgYmVmb3JlIGFuZCBhZnRlciwgYW5kXG4gIC8vIGNvbmRpdGlvbmFsbHkgZXhlY3V0ZSB0aGUgb3JpZ2luYWwgZnVuY3Rpb24uXG4gIF8ud3JhcCA9IGZ1bmN0aW9uKGZ1bmMsIHdyYXBwZXIpIHtcbiAgICByZXR1cm4gXy5wYXJ0aWFsKHdyYXBwZXIsIGZ1bmMpO1xuICB9O1xuXG4gIC8vIFJldHVybnMgYSBmdW5jdGlvbiB0aGF0IGlzIHRoZSBjb21wb3NpdGlvbiBvZiBhIGxpc3Qgb2YgZnVuY3Rpb25zLCBlYWNoXG4gIC8vIGNvbnN1bWluZyB0aGUgcmV0dXJuIHZhbHVlIG9mIHRoZSBmdW5jdGlvbiB0aGF0IGZvbGxvd3MuXG4gIF8uY29tcG9zZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBmdW5jcyA9IGFyZ3VtZW50cztcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgYXJncyA9IGFyZ3VtZW50cztcbiAgICAgIGZvciAodmFyIGkgPSBmdW5jcy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgICBhcmdzID0gW2Z1bmNzW2ldLmFwcGx5KHRoaXMsIGFyZ3MpXTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBhcmdzWzBdO1xuICAgIH07XG4gIH07XG5cbiAgLy8gUmV0dXJucyBhIGZ1bmN0aW9uIHRoYXQgd2lsbCBvbmx5IGJlIGV4ZWN1dGVkIGFmdGVyIGJlaW5nIGNhbGxlZCBOIHRpbWVzLlxuICBfLmFmdGVyID0gZnVuY3Rpb24odGltZXMsIGZ1bmMpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoLS10aW1lcyA8IDEpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmMuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgIH1cbiAgICB9O1xuICB9O1xuXG4gIC8vIE9iamVjdCBGdW5jdGlvbnNcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLVxuXG4gIC8vIFJldHJpZXZlIHRoZSBuYW1lcyBvZiBhbiBvYmplY3QncyBwcm9wZXJ0aWVzLlxuICAvLyBEZWxlZ2F0ZXMgdG8gKipFQ01BU2NyaXB0IDUqKidzIG5hdGl2ZSBgT2JqZWN0LmtleXNgXG4gIF8ua2V5cyA9IGZ1bmN0aW9uKG9iaikge1xuICAgIGlmICghXy5pc09iamVjdChvYmopKSByZXR1cm4gW107XG4gICAgaWYgKG5hdGl2ZUtleXMpIHJldHVybiBuYXRpdmVLZXlzKG9iaik7XG4gICAgdmFyIGtleXMgPSBbXTtcbiAgICBmb3IgKHZhciBrZXkgaW4gb2JqKSBpZiAoXy5oYXMob2JqLCBrZXkpKSBrZXlzLnB1c2goa2V5KTtcbiAgICByZXR1cm4ga2V5cztcbiAgfTtcblxuICAvLyBSZXRyaWV2ZSB0aGUgdmFsdWVzIG9mIGFuIG9iamVjdCdzIHByb3BlcnRpZXMuXG4gIF8udmFsdWVzID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgdmFyIGtleXMgPSBfLmtleXMob2JqKTtcbiAgICB2YXIgbGVuZ3RoID0ga2V5cy5sZW5ndGg7XG4gICAgdmFyIHZhbHVlcyA9IG5ldyBBcnJheShsZW5ndGgpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhbHVlc1tpXSA9IG9ialtrZXlzW2ldXTtcbiAgICB9XG4gICAgcmV0dXJuIHZhbHVlcztcbiAgfTtcblxuICAvLyBDb252ZXJ0IGFuIG9iamVjdCBpbnRvIGEgbGlzdCBvZiBgW2tleSwgdmFsdWVdYCBwYWlycy5cbiAgXy5wYWlycyA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHZhciBrZXlzID0gXy5rZXlzKG9iaik7XG4gICAgdmFyIGxlbmd0aCA9IGtleXMubGVuZ3RoO1xuICAgIHZhciBwYWlycyA9IG5ldyBBcnJheShsZW5ndGgpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIHBhaXJzW2ldID0gW2tleXNbaV0sIG9ialtrZXlzW2ldXV07XG4gICAgfVxuICAgIHJldHVybiBwYWlycztcbiAgfTtcblxuICAvLyBJbnZlcnQgdGhlIGtleXMgYW5kIHZhbHVlcyBvZiBhbiBvYmplY3QuIFRoZSB2YWx1ZXMgbXVzdCBiZSBzZXJpYWxpemFibGUuXG4gIF8uaW52ZXJ0ID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgdmFyIHJlc3VsdCA9IHt9O1xuICAgIHZhciBrZXlzID0gXy5rZXlzKG9iaik7XG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbmd0aCA9IGtleXMubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIHJlc3VsdFtvYmpba2V5c1tpXV1dID0ga2V5c1tpXTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcblxuICAvLyBSZXR1cm4gYSBzb3J0ZWQgbGlzdCBvZiB0aGUgZnVuY3Rpb24gbmFtZXMgYXZhaWxhYmxlIG9uIHRoZSBvYmplY3QuXG4gIC8vIEFsaWFzZWQgYXMgYG1ldGhvZHNgXG4gIF8uZnVuY3Rpb25zID0gXy5tZXRob2RzID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgdmFyIG5hbWVzID0gW107XG4gICAgZm9yICh2YXIga2V5IGluIG9iaikge1xuICAgICAgaWYgKF8uaXNGdW5jdGlvbihvYmpba2V5XSkpIG5hbWVzLnB1c2goa2V5KTtcbiAgICB9XG4gICAgcmV0dXJuIG5hbWVzLnNvcnQoKTtcbiAgfTtcblxuICAvLyBFeHRlbmQgYSBnaXZlbiBvYmplY3Qgd2l0aCBhbGwgdGhlIHByb3BlcnRpZXMgaW4gcGFzc2VkLWluIG9iamVjdChzKS5cbiAgXy5leHRlbmQgPSBmdW5jdGlvbihvYmopIHtcbiAgICBlYWNoKHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSwgZnVuY3Rpb24oc291cmNlKSB7XG4gICAgICBpZiAoc291cmNlKSB7XG4gICAgICAgIGZvciAodmFyIHByb3AgaW4gc291cmNlKSB7XG4gICAgICAgICAgb2JqW3Byb3BdID0gc291cmNlW3Byb3BdO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIG9iajtcbiAgfTtcblxuICAvLyBSZXR1cm4gYSBjb3B5IG9mIHRoZSBvYmplY3Qgb25seSBjb250YWluaW5nIHRoZSB3aGl0ZWxpc3RlZCBwcm9wZXJ0aWVzLlxuICBfLnBpY2sgPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIgY29weSA9IHt9O1xuICAgIHZhciBrZXlzID0gY29uY2F0LmFwcGx5KEFycmF5UHJvdG8sIHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSk7XG4gICAgZWFjaChrZXlzLCBmdW5jdGlvbihrZXkpIHtcbiAgICAgIGlmIChrZXkgaW4gb2JqKSBjb3B5W2tleV0gPSBvYmpba2V5XTtcbiAgICB9KTtcbiAgICByZXR1cm4gY29weTtcbiAgfTtcblxuICAgLy8gUmV0dXJuIGEgY29weSBvZiB0aGUgb2JqZWN0IHdpdGhvdXQgdGhlIGJsYWNrbGlzdGVkIHByb3BlcnRpZXMuXG4gIF8ub21pdCA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHZhciBjb3B5ID0ge307XG4gICAgdmFyIGtleXMgPSBjb25jYXQuYXBwbHkoQXJyYXlQcm90bywgc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcbiAgICBmb3IgKHZhciBrZXkgaW4gb2JqKSB7XG4gICAgICBpZiAoIV8uY29udGFpbnMoa2V5cywga2V5KSkgY29weVtrZXldID0gb2JqW2tleV07XG4gICAgfVxuICAgIHJldHVybiBjb3B5O1xuICB9O1xuXG4gIC8vIEZpbGwgaW4gYSBnaXZlbiBvYmplY3Qgd2l0aCBkZWZhdWx0IHByb3BlcnRpZXMuXG4gIF8uZGVmYXVsdHMgPSBmdW5jdGlvbihvYmopIHtcbiAgICBlYWNoKHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSwgZnVuY3Rpb24oc291cmNlKSB7XG4gICAgICBpZiAoc291cmNlKSB7XG4gICAgICAgIGZvciAodmFyIHByb3AgaW4gc291cmNlKSB7XG4gICAgICAgICAgaWYgKG9ialtwcm9wXSA9PT0gdm9pZCAwKSBvYmpbcHJvcF0gPSBzb3VyY2VbcHJvcF07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gb2JqO1xuICB9O1xuXG4gIC8vIENyZWF0ZSBhIChzaGFsbG93LWNsb25lZCkgZHVwbGljYXRlIG9mIGFuIG9iamVjdC5cbiAgXy5jbG9uZSA9IGZ1bmN0aW9uKG9iaikge1xuICAgIGlmICghXy5pc09iamVjdChvYmopKSByZXR1cm4gb2JqO1xuICAgIHJldHVybiBfLmlzQXJyYXkob2JqKSA/IG9iai5zbGljZSgpIDogXy5leHRlbmQoe30sIG9iaik7XG4gIH07XG5cbiAgLy8gSW52b2tlcyBpbnRlcmNlcHRvciB3aXRoIHRoZSBvYmosIGFuZCB0aGVuIHJldHVybnMgb2JqLlxuICAvLyBUaGUgcHJpbWFyeSBwdXJwb3NlIG9mIHRoaXMgbWV0aG9kIGlzIHRvIFwidGFwIGludG9cIiBhIG1ldGhvZCBjaGFpbiwgaW5cbiAgLy8gb3JkZXIgdG8gcGVyZm9ybSBvcGVyYXRpb25zIG9uIGludGVybWVkaWF0ZSByZXN1bHRzIHdpdGhpbiB0aGUgY2hhaW4uXG4gIF8udGFwID0gZnVuY3Rpb24ob2JqLCBpbnRlcmNlcHRvcikge1xuICAgIGludGVyY2VwdG9yKG9iaik7XG4gICAgcmV0dXJuIG9iajtcbiAgfTtcblxuICAvLyBJbnRlcm5hbCByZWN1cnNpdmUgY29tcGFyaXNvbiBmdW5jdGlvbiBmb3IgYGlzRXF1YWxgLlxuICB2YXIgZXEgPSBmdW5jdGlvbihhLCBiLCBhU3RhY2ssIGJTdGFjaykge1xuICAgIC8vIElkZW50aWNhbCBvYmplY3RzIGFyZSBlcXVhbC4gYDAgPT09IC0wYCwgYnV0IHRoZXkgYXJlbid0IGlkZW50aWNhbC5cbiAgICAvLyBTZWUgdGhlIFtIYXJtb255IGBlZ2FsYCBwcm9wb3NhbF0oaHR0cDovL3dpa2kuZWNtYXNjcmlwdC5vcmcvZG9rdS5waHA/aWQ9aGFybW9ueTplZ2FsKS5cbiAgICBpZiAoYSA9PT0gYikgcmV0dXJuIGEgIT09IDAgfHwgMSAvIGEgPT0gMSAvIGI7XG4gICAgLy8gQSBzdHJpY3QgY29tcGFyaXNvbiBpcyBuZWNlc3NhcnkgYmVjYXVzZSBgbnVsbCA9PSB1bmRlZmluZWRgLlxuICAgIGlmIChhID09IG51bGwgfHwgYiA9PSBudWxsKSByZXR1cm4gYSA9PT0gYjtcbiAgICAvLyBVbndyYXAgYW55IHdyYXBwZWQgb2JqZWN0cy5cbiAgICBpZiAoYSBpbnN0YW5jZW9mIF8pIGEgPSBhLl93cmFwcGVkO1xuICAgIGlmIChiIGluc3RhbmNlb2YgXykgYiA9IGIuX3dyYXBwZWQ7XG4gICAgLy8gQ29tcGFyZSBgW1tDbGFzc11dYCBuYW1lcy5cbiAgICB2YXIgY2xhc3NOYW1lID0gdG9TdHJpbmcuY2FsbChhKTtcbiAgICBpZiAoY2xhc3NOYW1lICE9IHRvU3RyaW5nLmNhbGwoYikpIHJldHVybiBmYWxzZTtcbiAgICBzd2l0Y2ggKGNsYXNzTmFtZSkge1xuICAgICAgLy8gU3RyaW5ncywgbnVtYmVycywgZGF0ZXMsIGFuZCBib29sZWFucyBhcmUgY29tcGFyZWQgYnkgdmFsdWUuXG4gICAgICBjYXNlICdbb2JqZWN0IFN0cmluZ10nOlxuICAgICAgICAvLyBQcmltaXRpdmVzIGFuZCB0aGVpciBjb3JyZXNwb25kaW5nIG9iamVjdCB3cmFwcGVycyBhcmUgZXF1aXZhbGVudDsgdGh1cywgYFwiNVwiYCBpc1xuICAgICAgICAvLyBlcXVpdmFsZW50IHRvIGBuZXcgU3RyaW5nKFwiNVwiKWAuXG4gICAgICAgIHJldHVybiBhID09IFN0cmluZyhiKTtcbiAgICAgIGNhc2UgJ1tvYmplY3QgTnVtYmVyXSc6XG4gICAgICAgIC8vIGBOYU5gcyBhcmUgZXF1aXZhbGVudCwgYnV0IG5vbi1yZWZsZXhpdmUuIEFuIGBlZ2FsYCBjb21wYXJpc29uIGlzIHBlcmZvcm1lZCBmb3JcbiAgICAgICAgLy8gb3RoZXIgbnVtZXJpYyB2YWx1ZXMuXG4gICAgICAgIHJldHVybiBhICE9ICthID8gYiAhPSArYiA6IChhID09IDAgPyAxIC8gYSA9PSAxIC8gYiA6IGEgPT0gK2IpO1xuICAgICAgY2FzZSAnW29iamVjdCBEYXRlXSc6XG4gICAgICBjYXNlICdbb2JqZWN0IEJvb2xlYW5dJzpcbiAgICAgICAgLy8gQ29lcmNlIGRhdGVzIGFuZCBib29sZWFucyB0byBudW1lcmljIHByaW1pdGl2ZSB2YWx1ZXMuIERhdGVzIGFyZSBjb21wYXJlZCBieSB0aGVpclxuICAgICAgICAvLyBtaWxsaXNlY29uZCByZXByZXNlbnRhdGlvbnMuIE5vdGUgdGhhdCBpbnZhbGlkIGRhdGVzIHdpdGggbWlsbGlzZWNvbmQgcmVwcmVzZW50YXRpb25zXG4gICAgICAgIC8vIG9mIGBOYU5gIGFyZSBub3QgZXF1aXZhbGVudC5cbiAgICAgICAgcmV0dXJuICthID09ICtiO1xuICAgICAgLy8gUmVnRXhwcyBhcmUgY29tcGFyZWQgYnkgdGhlaXIgc291cmNlIHBhdHRlcm5zIGFuZCBmbGFncy5cbiAgICAgIGNhc2UgJ1tvYmplY3QgUmVnRXhwXSc6XG4gICAgICAgIHJldHVybiBhLnNvdXJjZSA9PSBiLnNvdXJjZSAmJlxuICAgICAgICAgICAgICAgYS5nbG9iYWwgPT0gYi5nbG9iYWwgJiZcbiAgICAgICAgICAgICAgIGEubXVsdGlsaW5lID09IGIubXVsdGlsaW5lICYmXG4gICAgICAgICAgICAgICBhLmlnbm9yZUNhc2UgPT0gYi5pZ25vcmVDYXNlO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIGEgIT0gJ29iamVjdCcgfHwgdHlwZW9mIGIgIT0gJ29iamVjdCcpIHJldHVybiBmYWxzZTtcbiAgICAvLyBBc3N1bWUgZXF1YWxpdHkgZm9yIGN5Y2xpYyBzdHJ1Y3R1cmVzLiBUaGUgYWxnb3JpdGhtIGZvciBkZXRlY3RpbmcgY3ljbGljXG4gICAgLy8gc3RydWN0dXJlcyBpcyBhZGFwdGVkIGZyb20gRVMgNS4xIHNlY3Rpb24gMTUuMTIuMywgYWJzdHJhY3Qgb3BlcmF0aW9uIGBKT2AuXG4gICAgdmFyIGxlbmd0aCA9IGFTdGFjay5sZW5ndGg7XG4gICAgd2hpbGUgKGxlbmd0aC0tKSB7XG4gICAgICAvLyBMaW5lYXIgc2VhcmNoLiBQZXJmb3JtYW5jZSBpcyBpbnZlcnNlbHkgcHJvcG9ydGlvbmFsIHRvIHRoZSBudW1iZXIgb2ZcbiAgICAgIC8vIHVuaXF1ZSBuZXN0ZWQgc3RydWN0dXJlcy5cbiAgICAgIGlmIChhU3RhY2tbbGVuZ3RoXSA9PSBhKSByZXR1cm4gYlN0YWNrW2xlbmd0aF0gPT0gYjtcbiAgICB9XG4gICAgLy8gT2JqZWN0cyB3aXRoIGRpZmZlcmVudCBjb25zdHJ1Y3RvcnMgYXJlIG5vdCBlcXVpdmFsZW50LCBidXQgYE9iamVjdGBzXG4gICAgLy8gZnJvbSBkaWZmZXJlbnQgZnJhbWVzIGFyZS5cbiAgICB2YXIgYUN0b3IgPSBhLmNvbnN0cnVjdG9yLCBiQ3RvciA9IGIuY29uc3RydWN0b3I7XG4gICAgaWYgKGFDdG9yICE9PSBiQ3RvciAmJiAhKF8uaXNGdW5jdGlvbihhQ3RvcikgJiYgKGFDdG9yIGluc3RhbmNlb2YgYUN0b3IpICYmXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIF8uaXNGdW5jdGlvbihiQ3RvcikgJiYgKGJDdG9yIGluc3RhbmNlb2YgYkN0b3IpKVxuICAgICAgICAgICAgICAgICAgICAgICAgJiYgKCdjb25zdHJ1Y3RvcicgaW4gYSAmJiAnY29uc3RydWN0b3InIGluIGIpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIC8vIEFkZCB0aGUgZmlyc3Qgb2JqZWN0IHRvIHRoZSBzdGFjayBvZiB0cmF2ZXJzZWQgb2JqZWN0cy5cbiAgICBhU3RhY2sucHVzaChhKTtcbiAgICBiU3RhY2sucHVzaChiKTtcbiAgICB2YXIgc2l6ZSA9IDAsIHJlc3VsdCA9IHRydWU7XG4gICAgLy8gUmVjdXJzaXZlbHkgY29tcGFyZSBvYmplY3RzIGFuZCBhcnJheXMuXG4gICAgaWYgKGNsYXNzTmFtZSA9PSAnW29iamVjdCBBcnJheV0nKSB7XG4gICAgICAvLyBDb21wYXJlIGFycmF5IGxlbmd0aHMgdG8gZGV0ZXJtaW5lIGlmIGEgZGVlcCBjb21wYXJpc29uIGlzIG5lY2Vzc2FyeS5cbiAgICAgIHNpemUgPSBhLmxlbmd0aDtcbiAgICAgIHJlc3VsdCA9IHNpemUgPT0gYi5sZW5ndGg7XG4gICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgIC8vIERlZXAgY29tcGFyZSB0aGUgY29udGVudHMsIGlnbm9yaW5nIG5vbi1udW1lcmljIHByb3BlcnRpZXMuXG4gICAgICAgIHdoaWxlIChzaXplLS0pIHtcbiAgICAgICAgICBpZiAoIShyZXN1bHQgPSBlcShhW3NpemVdLCBiW3NpemVdLCBhU3RhY2ssIGJTdGFjaykpKSBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBEZWVwIGNvbXBhcmUgb2JqZWN0cy5cbiAgICAgIGZvciAodmFyIGtleSBpbiBhKSB7XG4gICAgICAgIGlmIChfLmhhcyhhLCBrZXkpKSB7XG4gICAgICAgICAgLy8gQ291bnQgdGhlIGV4cGVjdGVkIG51bWJlciBvZiBwcm9wZXJ0aWVzLlxuICAgICAgICAgIHNpemUrKztcbiAgICAgICAgICAvLyBEZWVwIGNvbXBhcmUgZWFjaCBtZW1iZXIuXG4gICAgICAgICAgaWYgKCEocmVzdWx0ID0gXy5oYXMoYiwga2V5KSAmJiBlcShhW2tleV0sIGJba2V5XSwgYVN0YWNrLCBiU3RhY2spKSkgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIC8vIEVuc3VyZSB0aGF0IGJvdGggb2JqZWN0cyBjb250YWluIHRoZSBzYW1lIG51bWJlciBvZiBwcm9wZXJ0aWVzLlxuICAgICAgaWYgKHJlc3VsdCkge1xuICAgICAgICBmb3IgKGtleSBpbiBiKSB7XG4gICAgICAgICAgaWYgKF8uaGFzKGIsIGtleSkgJiYgIShzaXplLS0pKSBicmVhaztcbiAgICAgICAgfVxuICAgICAgICByZXN1bHQgPSAhc2l6ZTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gUmVtb3ZlIHRoZSBmaXJzdCBvYmplY3QgZnJvbSB0aGUgc3RhY2sgb2YgdHJhdmVyc2VkIG9iamVjdHMuXG4gICAgYVN0YWNrLnBvcCgpO1xuICAgIGJTdGFjay5wb3AoKTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuXG4gIC8vIFBlcmZvcm0gYSBkZWVwIGNvbXBhcmlzb24gdG8gY2hlY2sgaWYgdHdvIG9iamVjdHMgYXJlIGVxdWFsLlxuICBfLmlzRXF1YWwgPSBmdW5jdGlvbihhLCBiKSB7XG4gICAgcmV0dXJuIGVxKGEsIGIsIFtdLCBbXSk7XG4gIH07XG5cbiAgLy8gSXMgYSBnaXZlbiBhcnJheSwgc3RyaW5nLCBvciBvYmplY3QgZW1wdHk/XG4gIC8vIEFuIFwiZW1wdHlcIiBvYmplY3QgaGFzIG5vIGVudW1lcmFibGUgb3duLXByb3BlcnRpZXMuXG4gIF8uaXNFbXB0eSA9IGZ1bmN0aW9uKG9iaikge1xuICAgIGlmIChvYmogPT0gbnVsbCkgcmV0dXJuIHRydWU7XG4gICAgaWYgKF8uaXNBcnJheShvYmopIHx8IF8uaXNTdHJpbmcob2JqKSkgcmV0dXJuIG9iai5sZW5ndGggPT09IDA7XG4gICAgZm9yICh2YXIga2V5IGluIG9iaikgaWYgKF8uaGFzKG9iaiwga2V5KSkgcmV0dXJuIGZhbHNlO1xuICAgIHJldHVybiB0cnVlO1xuICB9O1xuXG4gIC8vIElzIGEgZ2l2ZW4gdmFsdWUgYSBET00gZWxlbWVudD9cbiAgXy5pc0VsZW1lbnQgPSBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gISEob2JqICYmIG9iai5ub2RlVHlwZSA9PT0gMSk7XG4gIH07XG5cbiAgLy8gSXMgYSBnaXZlbiB2YWx1ZSBhbiBhcnJheT9cbiAgLy8gRGVsZWdhdGVzIHRvIEVDTUE1J3MgbmF0aXZlIEFycmF5LmlzQXJyYXlcbiAgXy5pc0FycmF5ID0gbmF0aXZlSXNBcnJheSB8fCBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gdG9TdHJpbmcuY2FsbChvYmopID09ICdbb2JqZWN0IEFycmF5XSc7XG4gIH07XG5cbiAgLy8gSXMgYSBnaXZlbiB2YXJpYWJsZSBhbiBvYmplY3Q/XG4gIF8uaXNPYmplY3QgPSBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gb2JqID09PSBPYmplY3Qob2JqKTtcbiAgfTtcblxuICAvLyBBZGQgc29tZSBpc1R5cGUgbWV0aG9kczogaXNBcmd1bWVudHMsIGlzRnVuY3Rpb24sIGlzU3RyaW5nLCBpc051bWJlciwgaXNEYXRlLCBpc1JlZ0V4cC5cbiAgZWFjaChbJ0FyZ3VtZW50cycsICdGdW5jdGlvbicsICdTdHJpbmcnLCAnTnVtYmVyJywgJ0RhdGUnLCAnUmVnRXhwJ10sIGZ1bmN0aW9uKG5hbWUpIHtcbiAgICBfWydpcycgKyBuYW1lXSA9IGZ1bmN0aW9uKG9iaikge1xuICAgICAgcmV0dXJuIHRvU3RyaW5nLmNhbGwob2JqKSA9PSAnW29iamVjdCAnICsgbmFtZSArICddJztcbiAgICB9O1xuICB9KTtcblxuICAvLyBEZWZpbmUgYSBmYWxsYmFjayB2ZXJzaW9uIG9mIHRoZSBtZXRob2QgaW4gYnJvd3NlcnMgKGFoZW0sIElFKSwgd2hlcmVcbiAgLy8gdGhlcmUgaXNuJ3QgYW55IGluc3BlY3RhYmxlIFwiQXJndW1lbnRzXCIgdHlwZS5cbiAgaWYgKCFfLmlzQXJndW1lbnRzKGFyZ3VtZW50cykpIHtcbiAgICBfLmlzQXJndW1lbnRzID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgICByZXR1cm4gISEob2JqICYmIF8uaGFzKG9iaiwgJ2NhbGxlZScpKTtcbiAgICB9O1xuICB9XG5cbiAgLy8gT3B0aW1pemUgYGlzRnVuY3Rpb25gIGlmIGFwcHJvcHJpYXRlLlxuICBpZiAodHlwZW9mICgvLi8pICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgXy5pc0Z1bmN0aW9uID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgICByZXR1cm4gdHlwZW9mIG9iaiA9PT0gJ2Z1bmN0aW9uJztcbiAgICB9O1xuICB9XG5cbiAgLy8gSXMgYSBnaXZlbiBvYmplY3QgYSBmaW5pdGUgbnVtYmVyP1xuICBfLmlzRmluaXRlID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIGlzRmluaXRlKG9iaikgJiYgIWlzTmFOKHBhcnNlRmxvYXQob2JqKSk7XG4gIH07XG5cbiAgLy8gSXMgdGhlIGdpdmVuIHZhbHVlIGBOYU5gPyAoTmFOIGlzIHRoZSBvbmx5IG51bWJlciB3aGljaCBkb2VzIG5vdCBlcXVhbCBpdHNlbGYpLlxuICBfLmlzTmFOID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIF8uaXNOdW1iZXIob2JqKSAmJiBvYmogIT0gK29iajtcbiAgfTtcblxuICAvLyBJcyBhIGdpdmVuIHZhbHVlIGEgYm9vbGVhbj9cbiAgXy5pc0Jvb2xlYW4gPSBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gb2JqID09PSB0cnVlIHx8IG9iaiA9PT0gZmFsc2UgfHwgdG9TdHJpbmcuY2FsbChvYmopID09ICdbb2JqZWN0IEJvb2xlYW5dJztcbiAgfTtcblxuICAvLyBJcyBhIGdpdmVuIHZhbHVlIGVxdWFsIHRvIG51bGw/XG4gIF8uaXNOdWxsID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIG9iaiA9PT0gbnVsbDtcbiAgfTtcblxuICAvLyBJcyBhIGdpdmVuIHZhcmlhYmxlIHVuZGVmaW5lZD9cbiAgXy5pc1VuZGVmaW5lZCA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiBvYmogPT09IHZvaWQgMDtcbiAgfTtcblxuICAvLyBTaG9ydGN1dCBmdW5jdGlvbiBmb3IgY2hlY2tpbmcgaWYgYW4gb2JqZWN0IGhhcyBhIGdpdmVuIHByb3BlcnR5IGRpcmVjdGx5XG4gIC8vIG9uIGl0c2VsZiAoaW4gb3RoZXIgd29yZHMsIG5vdCBvbiBhIHByb3RvdHlwZSkuXG4gIF8uaGFzID0gZnVuY3Rpb24ob2JqLCBrZXkpIHtcbiAgICByZXR1cm4gaGFzT3duUHJvcGVydHkuY2FsbChvYmosIGtleSk7XG4gIH07XG5cbiAgLy8gVXRpbGl0eSBGdW5jdGlvbnNcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS1cblxuICAvLyBSdW4gVW5kZXJzY29yZS5qcyBpbiAqbm9Db25mbGljdCogbW9kZSwgcmV0dXJuaW5nIHRoZSBgX2AgdmFyaWFibGUgdG8gaXRzXG4gIC8vIHByZXZpb3VzIG93bmVyLiBSZXR1cm5zIGEgcmVmZXJlbmNlIHRvIHRoZSBVbmRlcnNjb3JlIG9iamVjdC5cbiAgXy5ub0NvbmZsaWN0ID0gZnVuY3Rpb24oKSB7XG4gICAgcm9vdC5fID0gcHJldmlvdXNVbmRlcnNjb3JlO1xuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIC8vIEtlZXAgdGhlIGlkZW50aXR5IGZ1bmN0aW9uIGFyb3VuZCBmb3IgZGVmYXVsdCBpdGVyYXRvcnMuXG4gIF8uaWRlbnRpdHkgPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfTtcblxuICBfLmNvbnN0YW50ID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH07XG4gIH07XG5cbiAgXy5wcm9wZXJ0eSA9IGZ1bmN0aW9uKGtleSkge1xuICAgIHJldHVybiBmdW5jdGlvbihvYmopIHtcbiAgICAgIHJldHVybiBvYmpba2V5XTtcbiAgICB9O1xuICB9O1xuXG4gIC8vIFJldHVybnMgYSBwcmVkaWNhdGUgZm9yIGNoZWNraW5nIHdoZXRoZXIgYW4gb2JqZWN0IGhhcyBhIGdpdmVuIHNldCBvZiBga2V5OnZhbHVlYCBwYWlycy5cbiAgXy5tYXRjaGVzID0gZnVuY3Rpb24oYXR0cnMpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24ob2JqKSB7XG4gICAgICBpZiAob2JqID09PSBhdHRycykgcmV0dXJuIHRydWU7IC8vYXZvaWQgY29tcGFyaW5nIGFuIG9iamVjdCB0byBpdHNlbGYuXG4gICAgICBmb3IgKHZhciBrZXkgaW4gYXR0cnMpIHtcbiAgICAgICAgaWYgKGF0dHJzW2tleV0gIT09IG9ialtrZXldKVxuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfTtcblxuICAvLyBSdW4gYSBmdW5jdGlvbiAqKm4qKiB0aW1lcy5cbiAgXy50aW1lcyA9IGZ1bmN0aW9uKG4sIGl0ZXJhdG9yLCBjb250ZXh0KSB7XG4gICAgdmFyIGFjY3VtID0gQXJyYXkoTWF0aC5tYXgoMCwgbikpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbjsgaSsrKSBhY2N1bVtpXSA9IGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgaSk7XG4gICAgcmV0dXJuIGFjY3VtO1xuICB9O1xuXG4gIC8vIFJldHVybiBhIHJhbmRvbSBpbnRlZ2VyIGJldHdlZW4gbWluIGFuZCBtYXggKGluY2x1c2l2ZSkuXG4gIF8ucmFuZG9tID0gZnVuY3Rpb24obWluLCBtYXgpIHtcbiAgICBpZiAobWF4ID09IG51bGwpIHtcbiAgICAgIG1heCA9IG1pbjtcbiAgICAgIG1pbiA9IDA7XG4gICAgfVxuICAgIHJldHVybiBtaW4gKyBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAobWF4IC0gbWluICsgMSkpO1xuICB9O1xuXG4gIC8vIEEgKHBvc3NpYmx5IGZhc3Rlcikgd2F5IHRvIGdldCB0aGUgY3VycmVudCB0aW1lc3RhbXAgYXMgYW4gaW50ZWdlci5cbiAgXy5ub3cgPSBEYXRlLm5vdyB8fCBmdW5jdGlvbigpIHsgcmV0dXJuIG5ldyBEYXRlKCkuZ2V0VGltZSgpOyB9O1xuXG4gIC8vIExpc3Qgb2YgSFRNTCBlbnRpdGllcyBmb3IgZXNjYXBpbmcuXG4gIHZhciBlbnRpdHlNYXAgPSB7XG4gICAgZXNjYXBlOiB7XG4gICAgICAnJic6ICcmYW1wOycsXG4gICAgICAnPCc6ICcmbHQ7JyxcbiAgICAgICc+JzogJyZndDsnLFxuICAgICAgJ1wiJzogJyZxdW90OycsXG4gICAgICBcIidcIjogJyYjeDI3OydcbiAgICB9XG4gIH07XG4gIGVudGl0eU1hcC51bmVzY2FwZSA9IF8uaW52ZXJ0KGVudGl0eU1hcC5lc2NhcGUpO1xuXG4gIC8vIFJlZ2V4ZXMgY29udGFpbmluZyB0aGUga2V5cyBhbmQgdmFsdWVzIGxpc3RlZCBpbW1lZGlhdGVseSBhYm92ZS5cbiAgdmFyIGVudGl0eVJlZ2V4ZXMgPSB7XG4gICAgZXNjYXBlOiAgIG5ldyBSZWdFeHAoJ1snICsgXy5rZXlzKGVudGl0eU1hcC5lc2NhcGUpLmpvaW4oJycpICsgJ10nLCAnZycpLFxuICAgIHVuZXNjYXBlOiBuZXcgUmVnRXhwKCcoJyArIF8ua2V5cyhlbnRpdHlNYXAudW5lc2NhcGUpLmpvaW4oJ3wnKSArICcpJywgJ2cnKVxuICB9O1xuXG4gIC8vIEZ1bmN0aW9ucyBmb3IgZXNjYXBpbmcgYW5kIHVuZXNjYXBpbmcgc3RyaW5ncyB0by9mcm9tIEhUTUwgaW50ZXJwb2xhdGlvbi5cbiAgXy5lYWNoKFsnZXNjYXBlJywgJ3VuZXNjYXBlJ10sIGZ1bmN0aW9uKG1ldGhvZCkge1xuICAgIF9bbWV0aG9kXSA9IGZ1bmN0aW9uKHN0cmluZykge1xuICAgICAgaWYgKHN0cmluZyA9PSBudWxsKSByZXR1cm4gJyc7XG4gICAgICByZXR1cm4gKCcnICsgc3RyaW5nKS5yZXBsYWNlKGVudGl0eVJlZ2V4ZXNbbWV0aG9kXSwgZnVuY3Rpb24obWF0Y2gpIHtcbiAgICAgICAgcmV0dXJuIGVudGl0eU1hcFttZXRob2RdW21hdGNoXTtcbiAgICAgIH0pO1xuICAgIH07XG4gIH0pO1xuXG4gIC8vIElmIHRoZSB2YWx1ZSBvZiB0aGUgbmFtZWQgYHByb3BlcnR5YCBpcyBhIGZ1bmN0aW9uIHRoZW4gaW52b2tlIGl0IHdpdGggdGhlXG4gIC8vIGBvYmplY3RgIGFzIGNvbnRleHQ7IG90aGVyd2lzZSwgcmV0dXJuIGl0LlxuICBfLnJlc3VsdCA9IGZ1bmN0aW9uKG9iamVjdCwgcHJvcGVydHkpIHtcbiAgICBpZiAob2JqZWN0ID09IG51bGwpIHJldHVybiB2b2lkIDA7XG4gICAgdmFyIHZhbHVlID0gb2JqZWN0W3Byb3BlcnR5XTtcbiAgICByZXR1cm4gXy5pc0Z1bmN0aW9uKHZhbHVlKSA/IHZhbHVlLmNhbGwob2JqZWN0KSA6IHZhbHVlO1xuICB9O1xuXG4gIC8vIEFkZCB5b3VyIG93biBjdXN0b20gZnVuY3Rpb25zIHRvIHRoZSBVbmRlcnNjb3JlIG9iamVjdC5cbiAgXy5taXhpbiA9IGZ1bmN0aW9uKG9iaikge1xuICAgIGVhY2goXy5mdW5jdGlvbnMob2JqKSwgZnVuY3Rpb24obmFtZSkge1xuICAgICAgdmFyIGZ1bmMgPSBfW25hbWVdID0gb2JqW25hbWVdO1xuICAgICAgXy5wcm90b3R5cGVbbmFtZV0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGFyZ3MgPSBbdGhpcy5fd3JhcHBlZF07XG4gICAgICAgIHB1c2guYXBwbHkoYXJncywgYXJndW1lbnRzKTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdC5jYWxsKHRoaXMsIGZ1bmMuYXBwbHkoXywgYXJncykpO1xuICAgICAgfTtcbiAgICB9KTtcbiAgfTtcblxuICAvLyBHZW5lcmF0ZSBhIHVuaXF1ZSBpbnRlZ2VyIGlkICh1bmlxdWUgd2l0aGluIHRoZSBlbnRpcmUgY2xpZW50IHNlc3Npb24pLlxuICAvLyBVc2VmdWwgZm9yIHRlbXBvcmFyeSBET00gaWRzLlxuICB2YXIgaWRDb3VudGVyID0gMDtcbiAgXy51bmlxdWVJZCA9IGZ1bmN0aW9uKHByZWZpeCkge1xuICAgIHZhciBpZCA9ICsraWRDb3VudGVyICsgJyc7XG4gICAgcmV0dXJuIHByZWZpeCA/IHByZWZpeCArIGlkIDogaWQ7XG4gIH07XG5cbiAgLy8gQnkgZGVmYXVsdCwgVW5kZXJzY29yZSB1c2VzIEVSQi1zdHlsZSB0ZW1wbGF0ZSBkZWxpbWl0ZXJzLCBjaGFuZ2UgdGhlXG4gIC8vIGZvbGxvd2luZyB0ZW1wbGF0ZSBzZXR0aW5ncyB0byB1c2UgYWx0ZXJuYXRpdmUgZGVsaW1pdGVycy5cbiAgXy50ZW1wbGF0ZVNldHRpbmdzID0ge1xuICAgIGV2YWx1YXRlICAgIDogLzwlKFtcXHNcXFNdKz8pJT4vZyxcbiAgICBpbnRlcnBvbGF0ZSA6IC88JT0oW1xcc1xcU10rPyklPi9nLFxuICAgIGVzY2FwZSAgICAgIDogLzwlLShbXFxzXFxTXSs/KSU+L2dcbiAgfTtcblxuICAvLyBXaGVuIGN1c3RvbWl6aW5nIGB0ZW1wbGF0ZVNldHRpbmdzYCwgaWYgeW91IGRvbid0IHdhbnQgdG8gZGVmaW5lIGFuXG4gIC8vIGludGVycG9sYXRpb24sIGV2YWx1YXRpb24gb3IgZXNjYXBpbmcgcmVnZXgsIHdlIG5lZWQgb25lIHRoYXQgaXNcbiAgLy8gZ3VhcmFudGVlZCBub3QgdG8gbWF0Y2guXG4gIHZhciBub01hdGNoID0gLyguKV4vO1xuXG4gIC8vIENlcnRhaW4gY2hhcmFjdGVycyBuZWVkIHRvIGJlIGVzY2FwZWQgc28gdGhhdCB0aGV5IGNhbiBiZSBwdXQgaW50byBhXG4gIC8vIHN0cmluZyBsaXRlcmFsLlxuICB2YXIgZXNjYXBlcyA9IHtcbiAgICBcIidcIjogICAgICBcIidcIixcbiAgICAnXFxcXCc6ICAgICAnXFxcXCcsXG4gICAgJ1xccic6ICAgICAncicsXG4gICAgJ1xcbic6ICAgICAnbicsXG4gICAgJ1xcdCc6ICAgICAndCcsXG4gICAgJ1xcdTIwMjgnOiAndTIwMjgnLFxuICAgICdcXHUyMDI5JzogJ3UyMDI5J1xuICB9O1xuXG4gIHZhciBlc2NhcGVyID0gL1xcXFx8J3xcXHJ8XFxufFxcdHxcXHUyMDI4fFxcdTIwMjkvZztcblxuICAvLyBKYXZhU2NyaXB0IG1pY3JvLXRlbXBsYXRpbmcsIHNpbWlsYXIgdG8gSm9obiBSZXNpZydzIGltcGxlbWVudGF0aW9uLlxuICAvLyBVbmRlcnNjb3JlIHRlbXBsYXRpbmcgaGFuZGxlcyBhcmJpdHJhcnkgZGVsaW1pdGVycywgcHJlc2VydmVzIHdoaXRlc3BhY2UsXG4gIC8vIGFuZCBjb3JyZWN0bHkgZXNjYXBlcyBxdW90ZXMgd2l0aGluIGludGVycG9sYXRlZCBjb2RlLlxuICBfLnRlbXBsYXRlID0gZnVuY3Rpb24odGV4dCwgZGF0YSwgc2V0dGluZ3MpIHtcbiAgICB2YXIgcmVuZGVyO1xuICAgIHNldHRpbmdzID0gXy5kZWZhdWx0cyh7fSwgc2V0dGluZ3MsIF8udGVtcGxhdGVTZXR0aW5ncyk7XG5cbiAgICAvLyBDb21iaW5lIGRlbGltaXRlcnMgaW50byBvbmUgcmVndWxhciBleHByZXNzaW9uIHZpYSBhbHRlcm5hdGlvbi5cbiAgICB2YXIgbWF0Y2hlciA9IG5ldyBSZWdFeHAoW1xuICAgICAgKHNldHRpbmdzLmVzY2FwZSB8fCBub01hdGNoKS5zb3VyY2UsXG4gICAgICAoc2V0dGluZ3MuaW50ZXJwb2xhdGUgfHwgbm9NYXRjaCkuc291cmNlLFxuICAgICAgKHNldHRpbmdzLmV2YWx1YXRlIHx8IG5vTWF0Y2gpLnNvdXJjZVxuICAgIF0uam9pbignfCcpICsgJ3wkJywgJ2cnKTtcblxuICAgIC8vIENvbXBpbGUgdGhlIHRlbXBsYXRlIHNvdXJjZSwgZXNjYXBpbmcgc3RyaW5nIGxpdGVyYWxzIGFwcHJvcHJpYXRlbHkuXG4gICAgdmFyIGluZGV4ID0gMDtcbiAgICB2YXIgc291cmNlID0gXCJfX3ArPSdcIjtcbiAgICB0ZXh0LnJlcGxhY2UobWF0Y2hlciwgZnVuY3Rpb24obWF0Y2gsIGVzY2FwZSwgaW50ZXJwb2xhdGUsIGV2YWx1YXRlLCBvZmZzZXQpIHtcbiAgICAgIHNvdXJjZSArPSB0ZXh0LnNsaWNlKGluZGV4LCBvZmZzZXQpXG4gICAgICAgIC5yZXBsYWNlKGVzY2FwZXIsIGZ1bmN0aW9uKG1hdGNoKSB7IHJldHVybiAnXFxcXCcgKyBlc2NhcGVzW21hdGNoXTsgfSk7XG5cbiAgICAgIGlmIChlc2NhcGUpIHtcbiAgICAgICAgc291cmNlICs9IFwiJytcXG4oKF9fdD0oXCIgKyBlc2NhcGUgKyBcIikpPT1udWxsPycnOl8uZXNjYXBlKF9fdCkpK1xcbidcIjtcbiAgICAgIH1cbiAgICAgIGlmIChpbnRlcnBvbGF0ZSkge1xuICAgICAgICBzb3VyY2UgKz0gXCInK1xcbigoX190PShcIiArIGludGVycG9sYXRlICsgXCIpKT09bnVsbD8nJzpfX3QpK1xcbidcIjtcbiAgICAgIH1cbiAgICAgIGlmIChldmFsdWF0ZSkge1xuICAgICAgICBzb3VyY2UgKz0gXCInO1xcblwiICsgZXZhbHVhdGUgKyBcIlxcbl9fcCs9J1wiO1xuICAgICAgfVxuICAgICAgaW5kZXggPSBvZmZzZXQgKyBtYXRjaC5sZW5ndGg7XG4gICAgICByZXR1cm4gbWF0Y2g7XG4gICAgfSk7XG4gICAgc291cmNlICs9IFwiJztcXG5cIjtcblxuICAgIC8vIElmIGEgdmFyaWFibGUgaXMgbm90IHNwZWNpZmllZCwgcGxhY2UgZGF0YSB2YWx1ZXMgaW4gbG9jYWwgc2NvcGUuXG4gICAgaWYgKCFzZXR0aW5ncy52YXJpYWJsZSkgc291cmNlID0gJ3dpdGgob2JqfHx7fSl7XFxuJyArIHNvdXJjZSArICd9XFxuJztcblxuICAgIHNvdXJjZSA9IFwidmFyIF9fdCxfX3A9JycsX19qPUFycmF5LnByb3RvdHlwZS5qb2luLFwiICtcbiAgICAgIFwicHJpbnQ9ZnVuY3Rpb24oKXtfX3ArPV9fai5jYWxsKGFyZ3VtZW50cywnJyk7fTtcXG5cIiArXG4gICAgICBzb3VyY2UgKyBcInJldHVybiBfX3A7XFxuXCI7XG5cbiAgICB0cnkge1xuICAgICAgcmVuZGVyID0gbmV3IEZ1bmN0aW9uKHNldHRpbmdzLnZhcmlhYmxlIHx8ICdvYmonLCAnXycsIHNvdXJjZSk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgZS5zb3VyY2UgPSBzb3VyY2U7XG4gICAgICB0aHJvdyBlO1xuICAgIH1cblxuICAgIGlmIChkYXRhKSByZXR1cm4gcmVuZGVyKGRhdGEsIF8pO1xuICAgIHZhciB0ZW1wbGF0ZSA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgIHJldHVybiByZW5kZXIuY2FsbCh0aGlzLCBkYXRhLCBfKTtcbiAgICB9O1xuXG4gICAgLy8gUHJvdmlkZSB0aGUgY29tcGlsZWQgZnVuY3Rpb24gc291cmNlIGFzIGEgY29udmVuaWVuY2UgZm9yIHByZWNvbXBpbGF0aW9uLlxuICAgIHRlbXBsYXRlLnNvdXJjZSA9ICdmdW5jdGlvbignICsgKHNldHRpbmdzLnZhcmlhYmxlIHx8ICdvYmonKSArICcpe1xcbicgKyBzb3VyY2UgKyAnfSc7XG5cbiAgICByZXR1cm4gdGVtcGxhdGU7XG4gIH07XG5cbiAgLy8gQWRkIGEgXCJjaGFpblwiIGZ1bmN0aW9uLCB3aGljaCB3aWxsIGRlbGVnYXRlIHRvIHRoZSB3cmFwcGVyLlxuICBfLmNoYWluID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIF8ob2JqKS5jaGFpbigpO1xuICB9O1xuXG4gIC8vIE9PUFxuICAvLyAtLS0tLS0tLS0tLS0tLS1cbiAgLy8gSWYgVW5kZXJzY29yZSBpcyBjYWxsZWQgYXMgYSBmdW5jdGlvbiwgaXQgcmV0dXJucyBhIHdyYXBwZWQgb2JqZWN0IHRoYXRcbiAgLy8gY2FuIGJlIHVzZWQgT08tc3R5bGUuIFRoaXMgd3JhcHBlciBob2xkcyBhbHRlcmVkIHZlcnNpb25zIG9mIGFsbCB0aGVcbiAgLy8gdW5kZXJzY29yZSBmdW5jdGlvbnMuIFdyYXBwZWQgb2JqZWN0cyBtYXkgYmUgY2hhaW5lZC5cblxuICAvLyBIZWxwZXIgZnVuY3Rpb24gdG8gY29udGludWUgY2hhaW5pbmcgaW50ZXJtZWRpYXRlIHJlc3VsdHMuXG4gIHZhciByZXN1bHQgPSBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gdGhpcy5fY2hhaW4gPyBfKG9iaikuY2hhaW4oKSA6IG9iajtcbiAgfTtcblxuICAvLyBBZGQgYWxsIG9mIHRoZSBVbmRlcnNjb3JlIGZ1bmN0aW9ucyB0byB0aGUgd3JhcHBlciBvYmplY3QuXG4gIF8ubWl4aW4oXyk7XG5cbiAgLy8gQWRkIGFsbCBtdXRhdG9yIEFycmF5IGZ1bmN0aW9ucyB0byB0aGUgd3JhcHBlci5cbiAgZWFjaChbJ3BvcCcsICdwdXNoJywgJ3JldmVyc2UnLCAnc2hpZnQnLCAnc29ydCcsICdzcGxpY2UnLCAndW5zaGlmdCddLCBmdW5jdGlvbihuYW1lKSB7XG4gICAgdmFyIG1ldGhvZCA9IEFycmF5UHJvdG9bbmFtZV07XG4gICAgXy5wcm90b3R5cGVbbmFtZV0gPSBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBvYmogPSB0aGlzLl93cmFwcGVkO1xuICAgICAgbWV0aG9kLmFwcGx5KG9iaiwgYXJndW1lbnRzKTtcbiAgICAgIGlmICgobmFtZSA9PSAnc2hpZnQnIHx8IG5hbWUgPT0gJ3NwbGljZScpICYmIG9iai5sZW5ndGggPT09IDApIGRlbGV0ZSBvYmpbMF07XG4gICAgICByZXR1cm4gcmVzdWx0LmNhbGwodGhpcywgb2JqKTtcbiAgICB9O1xuICB9KTtcblxuICAvLyBBZGQgYWxsIGFjY2Vzc29yIEFycmF5IGZ1bmN0aW9ucyB0byB0aGUgd3JhcHBlci5cbiAgZWFjaChbJ2NvbmNhdCcsICdqb2luJywgJ3NsaWNlJ10sIGZ1bmN0aW9uKG5hbWUpIHtcbiAgICB2YXIgbWV0aG9kID0gQXJyYXlQcm90b1tuYW1lXTtcbiAgICBfLnByb3RvdHlwZVtuYW1lXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHJlc3VsdC5jYWxsKHRoaXMsIG1ldGhvZC5hcHBseSh0aGlzLl93cmFwcGVkLCBhcmd1bWVudHMpKTtcbiAgICB9O1xuICB9KTtcblxuICBfLmV4dGVuZChfLnByb3RvdHlwZSwge1xuXG4gICAgLy8gU3RhcnQgY2hhaW5pbmcgYSB3cmFwcGVkIFVuZGVyc2NvcmUgb2JqZWN0LlxuICAgIGNoYWluOiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuX2NoYWluID0gdHJ1ZTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cbiAgICAvLyBFeHRyYWN0cyB0aGUgcmVzdWx0IGZyb20gYSB3cmFwcGVkIGFuZCBjaGFpbmVkIG9iamVjdC5cbiAgICB2YWx1ZTogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5fd3JhcHBlZDtcbiAgICB9XG5cbiAgfSk7XG5cbiAgLy8gQU1EIHJlZ2lzdHJhdGlvbiBoYXBwZW5zIGF0IHRoZSBlbmQgZm9yIGNvbXBhdGliaWxpdHkgd2l0aCBBTUQgbG9hZGVyc1xuICAvLyB0aGF0IG1heSBub3QgZW5mb3JjZSBuZXh0LXR1cm4gc2VtYW50aWNzIG9uIG1vZHVsZXMuIEV2ZW4gdGhvdWdoIGdlbmVyYWxcbiAgLy8gcHJhY3RpY2UgZm9yIEFNRCByZWdpc3RyYXRpb24gaXMgdG8gYmUgYW5vbnltb3VzLCB1bmRlcnNjb3JlIHJlZ2lzdGVyc1xuICAvLyBhcyBhIG5hbWVkIG1vZHVsZSBiZWNhdXNlLCBsaWtlIGpRdWVyeSwgaXQgaXMgYSBiYXNlIGxpYnJhcnkgdGhhdCBpc1xuICAvLyBwb3B1bGFyIGVub3VnaCB0byBiZSBidW5kbGVkIGluIGEgdGhpcmQgcGFydHkgbGliLCBidXQgbm90IGJlIHBhcnQgb2ZcbiAgLy8gYW4gQU1EIGxvYWQgcmVxdWVzdC4gVGhvc2UgY2FzZXMgY291bGQgZ2VuZXJhdGUgYW4gZXJyb3Igd2hlbiBhblxuICAvLyBhbm9ueW1vdXMgZGVmaW5lKCkgaXMgY2FsbGVkIG91dHNpZGUgb2YgYSBsb2FkZXIgcmVxdWVzdC5cbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgIGRlZmluZSgndW5kZXJzY29yZScsIFtdLCBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBfO1xuICAgIH0pO1xuICB9XG59KS5jYWxsKHRoaXMpO1xuIiwidmFyIHJlcG9ydGVycyA9IHtcbiAgICBcIkEuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZV9yZWdpb25hbFwiLFxuICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJBLlwiOiBbe1wieWVhclwiOjE4ODUsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTkzOCwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgXCJBLjJkXCI6IFt7XCJ5ZWFyXCI6MTkzOCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjIwMTAsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dLFxuICAgICAgICAgICAgICAgICAgICAgICAgIFwiQS4zZFwiOiBbe1wieWVhclwiOjIwMTAsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2N0XCIsXCJ1cztkZVwiLFwidXM7ZGNcIixcInVzO21lXCIsXCJ1czttZFwiLFwidXM7bmhcIixcInVzO25qXCIsXCJ1cztwYVwiLFwidXM7cmlcIixcInVzO3Z0XCJdLFxuICAgICAgICAgICAgXCJuYW1lXCI6IFwiQXRsYW50aWMgUmVwb3J0ZXJcIixcbiAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJBLiAyZFwiOiBcIkEuMmRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQS4gM2RcIjogXCJBLjNkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBcIkEuUi5cIjogXCJBLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJBLlJlcC5cIjogXCJBLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJBdC5cIjogXCJBLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJBdGwuXCI6IFwiQS5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQXRsLjJkXCI6IFwiQS4yZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJBdGwuUi5cIjogXCJBLlwifX1dLFxuICAgIFwiQS5ELlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJBLkQuXCI6IFt7XCJ5ZWFyXCI6MTg5NiwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTk1NSwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBcIkEuRC4yZFwiOiBbe1wieWVhclwiOjE5NTUsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MjAwNCwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBcIkEuRC4zZFwiOiBbe1wieWVhclwiOjIwMDMsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO255XCJdLFxuICAgICAgICAgICAgICBcIm5hbWVcIjogXCJOZXcgWW9yayBTdXByZW1lIENvdXJ0IEFwcGVsbGF0ZSBEaXZpc2lvbiBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJBLkQuIDJkXCI6IFwiQS5ELjJkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQS5ELiAzZFwiOiBcIkEuRC4zZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkFEIDJkXCI6IFwiQS5ELjJkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQUQgM2RcIjogXCJBLkQuM2RcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJBcC5cIjogXCJBLkQuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQXAuMmQuXCI6IFwiQS5ELlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkFwcC5EaXYuXCI6IFwiQS5ELlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkFwcC5EaXYuKE4uWS4pXCI6IFwiQS5ELlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkFwcC5EaXYuMmQuXCI6IFwiQS5ELlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk4uWS5BcHAuRGVjLlwiOiBcIkEuRC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJOLlkuQXBwLkRpdi5cIjogXCJBLkQuXCJ9fV0sXG4gICAgXCJBLksuIE1hcnNoLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiQS5LLiBNYXJzaC5cIjogW3tcInllYXJcIjoxODE3LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4MjEsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztreVwiXSxcbiAgICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIktlbnR1Y2t5IFJlcG9ydHMsIE1hcnNoYWxsLCBBLksuXCIsXG4gICAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiS3kuKEEuSy5NYXJzaC4pXCI6IFwiQS5LLiBNYXJzaC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTWFyLlwiOiBcIkEuSy4gTWFyc2guXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk1hcnNoLlwiOiBcIkEuSy4gTWFyc2guXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk1hcnNoLihLeS4pXCI6IFwiQS5LLiBNYXJzaC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTWFyc2guQS5LLlwiOiBcIkEuSy4gTWFyc2guXCJ9fV0sXG4gICAgXCJBWlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwibmV1dHJhbFwiLFxuICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJBWlwiOiBbe1wieWVhclwiOjE3NTAsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1czthelwiXSxcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIkFyaXpvbmEgTmV1dHJhbCBDaXRhdGlvblwiLFxuICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fV0sXG4gICAgXCJBYmIuIE4uIENhcy5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJBYmIuIE4uIENhcy5cIjogW3tcInllYXJcIjoxODc2LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTg5NCwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztueVwiXSxcbiAgICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJBYmJvdHQncyBOZXcgQ2FzZXNcIixcbiAgICAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiQS5OLlwiOiBcIkFiYi4gTi4gQ2FzLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQS5OLkMuXCI6IFwiQWJiLiBOLiBDYXMuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJBYmIuTi5DLlwiOiBcIkFiYi4gTi4gQ2FzLlwifX1dLFxuICAgIFwiQWJiLiBQci5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkFiYi4gUHIuXCI6IFt7XCJ5ZWFyXCI6MTg1NCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODc1LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bnlcIl0sXG4gICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJBYmJvdHQncyBQcmFjdGljZSBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiQWJiLlAuUi5cIjogXCJBYmIuIFByLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJBYmIuUHIuUmVwLlwiOiBcIkFiYi4gUHIuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkFiYi5QcmFjLlwiOiBcIkFiYi4gUHIuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkFiYm90dCBQLlIuXCI6IFwiQWJiLiBQci5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQWJib3R0IFByLlJlcC5cIjogXCJBYmIuIFByLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJBYmJvdHQgUHJhY3QuQ2FzLlwiOiBcIkFiYi4gUHIuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkFiYm90dCdzIFByLlJlcC5cIjogXCJBYmIuIFByLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJBYmJvdHQncyBQcmFjLlJlcC5cIjogXCJBYmIuIFByLlwifX1dLFxuICAgIFwiQWlrLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJBaWsuXCI6IFt7XCJ5ZWFyXCI6MTgyNSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTgyOCwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7dnRcIl0sXG4gICAgICAgICAgICAgIFwibmFtZVwiOiBcIlZlcm1vbnQgUmVwb3J0cywgQWlrZW5zXCIsXG4gICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiQWxhLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJBbGEuXCI6IFt7XCJ5ZWFyXCI6MTg0MCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTk3NiwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBcIkFsYS4gMmRcIjogW3tcInllYXJcIjoxOTc3LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7YWxcIl0sXG4gICAgICAgICAgICAgIFwibmFtZVwiOiBcIkFsYWJhbWEgUmVwb3J0c1wiLFxuICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge319XSxcbiAgICBcIkFsYS4gQXBwLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkFsYS4gQXBwLlwiOiBbe1wieWVhclwiOjE5MTAsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxOTc2LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2FsXCJdLFxuICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIkFsYWJhbWEgQXBwZWxsYXRlIENvdXJ0cyBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fV0sXG4gICAgXCJBbGFza2FcIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJBbGFza2FcIjogW3tcInllYXJcIjoxODg0LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTk1OSwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztha1wiXSxcbiAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJBbGFza2EgUmVwb3J0c1wiLFxuICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJBbGsuXCI6IFwiQWxhc2thXCJ9fV0sXG4gICAgXCJBbGFza2EgRmVkLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiQWxhc2thIEZlZC5cIjogW3tcInllYXJcIjoxODY5LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE5MzcsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztha1wiXSxcbiAgICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIkFsYXNrYSBGZWRlcmFsIFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJBLkYuUmVwLlwiOiBcIkFsYXNrYSBGZWQuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkFsYXNrYSBGZWQuXCI6IFwiQWxhc2thIEZlZC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQWxhc2thIEZlZC5SLlwiOiBcIkFsYXNrYSBGZWQuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkFsYXNrYSBGZWQuUmVwLlwiOiBcIkFsYXNrYSBGZWQuXCJ9fV0sXG4gICAgXCJBbGxlblwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiQWxsZW5cIjogW3tcInllYXJcIjoxODYxLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4NjcsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1czttYVwiXSxcbiAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIk1hc3NhY2h1c2V0dHMgUmVwb3J0cywgQWxsZW5cIixcbiAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJBbGwuXCI6IFwiQWxsZW5cIiwgXCJNYXNzLihBbGxlbilcIjogXCJBbGxlblwifX1dLFxuICAgIFwiQW0uIFNhbW9hXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiQW0uIFNhbW9hXCI6IFt7XCJ5ZWFyXCI6MTkwMCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJBbS4gU2Ftb2EgMmRcIjogW3tcInllYXJcIjoxOTAwLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7YW1cIl0sXG4gICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiQW1lcmljYW4gU2Ftb2EgUmVwb3J0c1wiLFxuICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiQW50LiBOLlAuIENhcy5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkFudC4gTi5QLiBDYXMuXCI6IFt7XCJ5ZWFyXCI6MTgwNywgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODUxLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bnlcIl0sXG4gICAgICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJBbnRob24ncyBOaXNpIFByaXVzIENhc2VzXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiQW50aC5cIjogXCJBbnQuIE4uUC4gQ2FzLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJBbnRob24gTi5QLihOLlkuKVwiOiBcIkFudC4gTi5QLiBDYXMuXCJ9fV0sXG4gICAgXCJBcHAuIEQuQy5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJBcHAuIEQuQy5cIjogW3tcInllYXJcIjoxODkzLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTk0MSwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztkY1wiXSxcbiAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJBcHBlYWwgQ2FzZXMsIERpc3RyaWN0IG9mIENvbG9tYmlhXCIsXG4gICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6e1wiVS5TLiBBcHAuIEQuQy5cIjpcIkFwcC4gRC5DLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJVLlMuQXBwLkQuQy5cIjpcIkFwcC4gRC5DLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJVLiBTLiBBcHAuIEQuIEMuXCI6XCJBcHAuIEQuQy5cIn19XSxcbiAgICBcIkFyaXouXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJBcml6LlwiOiBbe1wieWVhclwiOjE4NjYsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1czthelwiXSxcbiAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIkFyaXpvbmEgUmVwb3J0ZXJcIixcbiAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiQXJpei4gQXBwLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJBcml6LiBBcHAuXCI6IFt7XCJ5ZWFyXCI6MTk2NSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTk3NiwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7YXpcIl0sXG4gICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIkFyaXpvbmEgQXBwZWFscyBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiQXJrLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJBcmsuXCI6IFt7XCJ5ZWFyXCI6MTgzNywgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2FyXCJdLFxuICAgICAgICAgICAgICBcIm5hbWVcIjogXCJBcmthbnNhcyBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJBay5cIjogXCJBcmsuXCJ9fV0sXG4gICAgXCJBcmsuIEFwcC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJBcmsuIEFwcC5cIjogW3tcInllYXJcIjoxOTgxLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7YXJcIl0sXG4gICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiQXJrYW5zYXMgQXBwZWxsYXRlIFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiQWsuIEFwcC5cIjogXCJBcmsuIEFwcC5cIn19XSxcbiAgICBcIkIuIE1vbi5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiQi4gTW9uLlwiOiBbe1wieWVhclwiOjE4NDAsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4NTcsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2t5XCJdLFxuICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJLZW50dWNreSBSZXBvcnRzLCBNb25yb2UsIEJlblwiLFxuICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiS3kuKEIuTW9uLilcIjogXCJCLiBNb24uXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTW9uLlwiOiBcIkIuIE1vbi5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJNb24uQi5cIjogXCJCLiBNb24uXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTW9ucm9lLCBCLlwiOiBcIkIuIE1vbi5cIn19XSxcbiAgICBcIkIuUi5cIjogW3tcImNpdGVfdHlwZVwiOiBcInNwZWNpYWx0eVwiLFxuICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkIuUi5cIjogW3tcInllYXJcIjoxOTc5LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXNcIl0sXG4gICAgICAgICAgICAgIFwibmFtZVwiOiBcIkJhbmtydXB0Y3kgUmVwb3J0ZXJcIixcbiAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkIuIFIuXCI6IFwiQi5SLlwiLCBcIkJSXCI6IFwiQi5SLlwifX1dLFxuICAgIFwiQi5ULkEuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzcGVjaWFsdHlcIixcbiAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkIuVC5BLlwiOiBbe1wieWVhclwiOjE5MjQsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxOTQyLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzXCJdLFxuICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIlJlcG9ydHMgb2YgdGhlIFVuaXRlZCBTdGF0ZXMgQm9hcmQgb2YgVGF4IEFwcGVhbHNcIixcbiAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge319XSxcbiAgICBcIkIuVC5BLk0uIChQLUgpXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzcGVjaWFsdHlcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiQi5ULkEuTS4gKFAtSClcIjogW3tcInllYXJcIjoxOTI4LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE5NDIsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1c1wiXSxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIkJvYXJkIG9mIFRheCBBcHBlYWxzIE1lbW9yYW5kdW0gRGVjaXNpb25zXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge319XSxcbiAgICBcIkJhaWwuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJCYWlsLlwiOiBbe1wieWVhclwiOjE4MjgsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTgzMiwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3NjXCJdLFxuICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiU291dGggQ2Fyb2xpbmEgUmVwb3J0cywgQmFpbGV5XCIsXG4gICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiQmFpLlwiOiBcIkJhaWwuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkJhaWwuTC5cIjogXCJCYWlsLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJCYWlsLkwuKFMuQy4pXCI6IFwiQmFpbC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQmFpbGV5XCI6IFwiQmFpbC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiUy5DLkwuKEJhaWwuKVwiOiBcIkJhaWwuXCJ9fV0sXG4gICAgXCJCYWlsLiBFcS5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJCYWlsLiBFcS5cIjogW3tcInllYXJcIjoxODMwLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTgzMSwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztzY1wiXSxcbiAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJTb3V0aCBDYXJvbGluYSBSZXBvcnRzLCBCYWlsZXkncyBFcXVpdHlcIixcbiAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiQmFpLkVxLlwiOiBcIkJhaWwuIEVxLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQmFpbC5FcS4oUy5DLilcIjogXCJCYWlsLiBFcS5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkJhaWxleVwiOiBcIkJhaWwuIEVxLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQmFpbGV5IENoLlwiOiBcIkJhaWwuIEVxLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQmFpbGV5IEVxLlwiOiBcIkJhaWwuIEVxLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiUy5DLkVxLihCYWlsLkVxLilcIjogXCJCYWlsLiBFcS5cIn19XSxcbiAgICBcIkJhcmIuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJCYXJiLlwiOiBbe1wieWVhclwiOjE4NDcsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTg3NywgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO255XCJdLFxuICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiQmFyYm91cidzIFN1cHJlbWUgQ291cnQgUmVwb3J0c1wiLFxuICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkIuXCI6IFwiQmFyYi5cIiwgXCJCYXJiLlMuQy5cIjogXCJCYXJiLlwifX1dLFxuICAgIFwiQmFyYi4gQ2guXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiQmFyYi4gQ2guXCI6IFt7XCJ5ZWFyXCI6MTg0NSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4NDgsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bnlcIl0sXG4gICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiQmFyYm91cidzIENoYW5jZXJ5IFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiQmFyYi5DaC4oTi5ZLilcIjogXCJCYXJiLiBDaC5cIn19XSxcbiAgICBcIkJheVwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkJheVwiOiBbe1wieWVhclwiOjE3ODMsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODA0LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3NjXCJdLFxuICAgICAgICAgICAgIFwibmFtZVwiOiBcIlNvdXRoIENhcm9saW5hIFJlcG9ydHMsIEJheVwiLFxuICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJTLkMuTC4oQmF5KVwiOiBcIkJheVwifX1dLFxuICAgIFwiQmliYlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJCaWJiXCI6IFt7XCJ5ZWFyXCI6MTgwOCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTgxNywgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7a3lcIl0sXG4gICAgICAgICAgICAgIFwibmFtZVwiOiBcIktlbnR1Y2t5IFJlcG9ydHMsIEJpYmJcIixcbiAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkJpYmIoS3kuKVwiOiBcIkJpYmJcIiwgXCJLeS4oQmliYilcIjogXCJCaWJiXCJ9fV0sXG4gICAgXCJCaW5uLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiQmlubi5cIjogW3tcInllYXJcIjoxNzk5LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTgxNCwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3BhXCJdLFxuICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiUGVubnN5bHZhbmlhIFN0YXRlIFJlcG9ydHMsIEJpbm5leVwiLFxuICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkJpbi5cIjogXCJCaW5uLlwiLCBcIkJpbm4uKFBhLilcIjogXCJCaW5uLlwiLCBcIkJpbm5cIjogXCJCaW5uLlwifX1dLFxuICAgIFwiQmxhY2tcIjogW3tcImNpdGVfdHlwZVwiOiBcInNjb3R1c19lYXJseVwiLFxuICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJCbGFja1wiOiBbe1wieWVhclwiOjE4NjEsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTg2MiwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2ZlZGVyYWw7c3VwcmVtZS5jb3VydFwiXSxcbiAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIkJsYWNrJ3MgU3VwcmVtZSBDb3VydCBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiQmxhY2sgUi5cIjogXCJCbGFja1wiLCBcIlUuUy4oQmxhY2spXCI6IFwiQmxhY2tcIn19XSxcbiAgICBcIkJsYWNrZi5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiQmxhY2tmLlwiOiBbe1wieWVhclwiOjE4MTcsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4NDcsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2luXCJdLFxuICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJJbmRpYW5hIFJlcG9ydHMsIEJsYWNrZm9yZFwiLFxuICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiQmxhY2suXCI6IFwiQmxhY2tmLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkJsYWNrZi4oSW5kLilcIjogXCJCbGFja2YuXCJ9fV0sXG4gICAgXCJCbHVtZSBTdXAuIEN0LiBUcmFucy5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJCbHVtZSBTdXAuIEN0LiBUcmFucy5cIjogW3tcInllYXJcIjoxODA1LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTgzNiwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1czttaVwiXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJCbHVtZSwgU3VwcmVtZSBDb3VydCBUcmFuc2FjdGlvbnNcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiQmx1bWUgU3VwLkN0LlRyYW5zLlwiOiBcIkJsdW1lIFN1cC4gQ3QuIFRyYW5zLlwifX1dLFxuICAgIFwiQmx1bWUgVW5yZXAuIE9wLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJCbHVtZSBVbnJlcC4gT3AuXCI6IFt7XCJ5ZWFyXCI6MTgzNiwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTg0MywgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bWlcIl0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIkJsdW1lLCBVbnJlcG9ydGVkIE9waW5pb25zXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJCbHVtZSBPcC5cIjogXCJCbHVtZSBVbnJlcC4gT3AuXCJ9fV0sXG4gICAgXCJCb3ljZVwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiQm95Y2VcIjogW3tcInllYXJcIjoxOTA5LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE5MjAsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztkZVwiXSxcbiAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIkRlbGF3YXJlIFJlcG9ydHMsIEJveWNlXCIsXG4gICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiRGVsLihCb3ljZSlcIjogXCJCb3ljZVwifX1dLFxuICAgIFwiQnJhZGYuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiQnJhZGYuXCI6IFt7XCJ5ZWFyXCI6MTgzOCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4NDEsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7aWFcIl0sXG4gICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiSW93YSBSZXBvcnRzLCBCcmFkZm9yZFwiLFxuICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJCcmFkLlwiOiBcIkJyYWRmLlwiLCBcIkJyYWRmb3JkXCI6IFwiQnJhZGYuXCJ9fV0sXG4gICAgXCJCcmF5dC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJCcmF5dC5cIjogW3tcInllYXJcIjoxODE1LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTgxOSwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1czt2dFwiXSxcbiAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJWZXJtb250IFJlcG9ydHMsIEJyYXl0b25cIixcbiAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiQnJheXRvbiAoVnQuKVwiOiBcIkJyYXl0LlwifX1dLFxuICAgIFwiQnJlZXNlXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiQnJlZXNlXCI6IFt7XCJ5ZWFyXCI6MTgxOSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4MzEsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7aWxcIl0sXG4gICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiSWxsaW5vaXMgUmVwb3J0cywgQnJlZXNlXCIsXG4gICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIklsbC4oQnJlZXNlKVwiOiBcIkJyZWVzZVwifX1dLFxuICAgIFwiQnJldi5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkJyZXYuXCI6IFt7XCJ5ZWFyXCI6MTc5MywgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODE2LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7c2NcIl0sXG4gICAgICAgICAgICAgICBcIm5hbWVcIjogXCJTb3V0aCBDYXJvbGluYSBSZXBvcnRzLCBCcmV2YXJkXCIsXG4gICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiUy5DLkwuKEJyZXYpXCI6IFwiQnJldi5cIn19XSxcbiAgICBcIkJyaWVmIFRpbWVzIFJwdHIuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJCcmllZiBUaW1lcyBScHRyLlwiOiBbe1wieWVhclwiOjE3NTAsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2NvXCJdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiQnJpZWYgVGltZXMgUmVwb3J0ZXJcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiQnVyLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJCdXIuXCI6IFt7XCJ5ZWFyXCI6MTg0MSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTg0MywgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7d2lcIl0sXG4gICAgICAgICAgICAgIFwibmFtZVwiOiBcIldpc2NvbnNpbiBSZXBvcnRzLCBCdXJuZXR0XCIsXG4gICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJCdXJuZXR0XCI6IFwiQnVyLlwiLCBcIkJ1cm5ldHQgKFdpcy4pXCI6IFwiQnVyLlwifX1dLFxuICAgIFwiQnVzYi5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkJ1c2IuXCI6IFt7XCJ5ZWFyXCI6MTg1MiwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODUzLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bmNcIl0sXG4gICAgICAgICAgICAgICBcIm5hbWVcIjogXCJOb3J0aCBDYXJvbGluYSBSZXBvcnRzLCBCdXNiZWUncyBMYXdcIixcbiAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJCdXNiLkwuXCI6IFwiQnVzYi5cIiwgXCJOLkMuKEJ1c2IuKVwiOiBcIkJ1c2IuXCJ9fV0sXG4gICAgXCJCdXNiLiBFcS5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJCdXNiLiBFcS5cIjogW3tcInllYXJcIjoxODUyLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTg1MywgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztuY1wiXSxcbiAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJOb3J0aCBDYXJvbGluYSBSZXBvcnRzLCBCdXNiZWUncyBFcXVpdHlcIixcbiAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiQnVzYmVlIEVxLihOLkMuKVwiOiBcIkJ1c2IuIEVxLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTi5DLihCdXNiLkVxLilcIjogXCJCdXNiLiBFcS5cIn19XSxcbiAgICBcIkJ1c2hcIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiQnVzaFwiOiBbe1wieWVhclwiOjE4NjYsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4NzksIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2t5XCJdLFxuICAgICAgICAgICAgICBcIm5hbWVcIjogXCJLZW50dWNreSBSZXBvcnRzLCBCdXNoXCIsXG4gICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJCdXNoIChLeS4pXCI6IFwiQnVzaFwiLCBcIkt5LihCdXNoKVwiOiBcIkJ1c2hcIn19XSxcbiAgICBcIkMuQy5QLkEuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzcGVjaWFsdHlcIixcbiAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiQy5DLlAuQS5cIjogW3tcInllYXJcIjoxOTI5LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE5ODIsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1c1wiXSxcbiAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIkNvdXJ0IG9mIEN1c3RvbXMgYW5kIFBhdGVudCBBcHBlYWxzIFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiQy5NLkEuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzcGVjaWFsdHlcIixcbiAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkMuTS5BLlwiOiBbe1wieWVhclwiOjE5NTEsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxOTc1LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzXCJdLFxuICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIkRlY2lzaW9ucyBvZiB0aGUgVW5pdGVkIFN0YXRlcyBDb3VydCBvZiBNaWxpdGFyeSBBcHBlYWxzXCIsXG4gICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fV0sXG4gICAgXCJDLk0uUi5cIjogW3tcImNpdGVfdHlwZVwiOiBcInNwZWNpYWx0eVwiLFxuICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiQy5NLlIuXCI6IFt7XCJ5ZWFyXCI6MTk1MSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE5NzUsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXNcIl0sXG4gICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiQ291cnQgTWFydGlhbCBSZWNvcmRzXCIsXG4gICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fV0sXG4gICAgXCJDT1wiOiBbe1wiY2l0ZV90eXBlXCI6IFwibmV1dHJhbFwiLFxuICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJDT1wiOiBbe1wieWVhclwiOjE3NTAsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztjb1wiXSxcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIkNvbG9yYWRvIE5ldXRyYWwgQ2l0YXRpb25cIixcbiAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiQ2FpLiBDYXMuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiQ2FpLiBDYXMuXCI6IFt7XCJ5ZWFyXCI6MTc5NiwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4MDUsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bnlcIl0sXG4gICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiQ2FpbmVzJyBDYXNlc1wiLFxuICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJDYWkuXCI6IFwiQ2FpLiBDYXMuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJDYWkuQ2FzLkVyci5cIjogXCJDYWkuIENhcy5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkNhaW4uXCI6IFwiQ2FpLiBDYXMuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJDYWluZXNcIjogXCJDYWkuIENhcy5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkNhaW5lcyAoTi5ZLilcIjogXCJDYWkuIENhcy5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkNhaW5lcyBDYXMuXCI6IFwiQ2FpLiBDYXMuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJOLlkuQ2FzLkVyci5cIjogXCJDYWkuIENhcy5cIn19XSxcbiAgICBcIkNhaS4gUi5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiQ2FpLiBSLlwiOiBbe1wieWVhclwiOjE4MDMsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4MDUsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO255XCJdLFxuICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJDYWluZXMnIFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkNhaS5SLlwiOiBcIkNhaS4gUi5cIn19XSxcbiAgICBcIkNhbC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiQ2FsLlwiOiBbe1wieWVhclwiOjE4NTAsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE5MzQsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJDYWwuIDJkXCI6IFt7XCJ5ZWFyXCI6MTkzNCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTk2OSwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBcIkNhbC4gM2RcIjogW3tcInllYXJcIjoxOTY5LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxOTkxLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQ2FsLiA0dGhcIjogW3tcInllYXJcIjoxOTkxLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2NhXCJdLFxuICAgICAgICAgICAgICBcIm5hbWVcIjogXCJDYWxpZm9ybmlhIFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkNhbC4yZFwiOiBcIkNhbC4gMmRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJDYWwuM2RcIjogXCJDYWwuIDNkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQ2FsLjR0aFwiOiBcIkNhbC4gNHRoXCJ9fV0sXG4gICAgXCJDYWwuIEFwcC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJDYWwuIEFwcC5cIjogW3tcInllYXJcIjoxOTA1LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTkzNCwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQ2FsLiBBcHAuIDJkXCI6IFt7XCJ5ZWFyXCI6MTkzNCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE5NjksIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkNhbC4gQXBwLiAzZFwiOiBbe1wieWVhclwiOjE5NjksIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxOTkxLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJDYWwuIEFwcC4gNHRoXCI6IFt7XCJ5ZWFyXCI6MTk5MSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztjYVwiXSxcbiAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJDYWxpZm9ybmlhIEFwcGVsbGF0ZSBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkNhbC4gQXBwLjJkXCI6IFwiQ2FsLiBBcHAuIDJkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJDYWwuIEFwcC4zZFwiOiBcIkNhbC4gQXBwLiAzZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQ2FsLiBBcHAuNHRoXCI6IFwiQ2FsLiBBcHAuIDR0aFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQ2FsLkFwcC5cIjogXCJDYWwuIEFwcC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkNhbC5BcHAuIDJkXCI6IFwiQ2FsLiBBcHAuIDJkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJDYWwuQXBwLiAzZFwiOiBcIkNhbC4gQXBwLiAzZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQ2FsLkFwcC4gNHRoXCI6IFwiQ2FsLiBBcHAuIDR0aFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQ2FsLkFwcC4yZFwiOiBcIkNhbC4gQXBwLiAyZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQ2FsLkFwcC4zZFwiOiBcIkNhbC4gQXBwLiAzZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQ2FsLkFwcC40dGhcIjogXCJDYWwuIEFwcC4gNHRoXCJ9fV0sXG4gICAgXCJDYWwuIEFwcC4gU3VwcC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJDYWwuIEFwcC4gU3VwcC5cIjogW3tcInllYXJcIjoxOTI5LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkNhbC4gQXBwLiBTdXBwLiAyZFwiOiBbe1wieWVhclwiOjE5MjksIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQ2FsLiBBcHAuIFN1cHAuIDNkXCI6IFt7XCJ5ZWFyXCI6MTkyOSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2NhXCJdLFxuICAgICAgICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIkNhbGlmb3JuaWEgQXBwZWxsYXRlIFJlcG9ydHMsIFN1cHBsZW1lbnRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiQ2FsLkFwcC4gMmQgU3VwcC5cIjogXCJDYWwuIEFwcC4gU3VwcC4gMmRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkNhbC5BcHAuIDNkIFN1cHAuXCI6IFwiQ2FsLiBBcHAuIFN1cHAuIDNkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJDYWwuQXBwLiBTdXBwLiAyZFwiOiBcIkNhbC4gQXBwLiBTdXBwLiAyZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQ2FsLkFwcC4gU3VwcC4gM2RcIjogXCJDYWwuIEFwcC4gU3VwcC4gM2RcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkNhbC5BcHAuIFN1cHAuMmRcIjogXCJDYWwuIEFwcC4gU3VwcC4gMmRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkNhbC5BcHAuIFN1cHAuM2RcIjogXCJDYWwuIEFwcC4gU3VwcC4gM2RcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkNhbC5BcHAuMmQgU3VwcC5cIjogXCJDYWwuIEFwcC4gU3VwcC4gMmRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkNhbC5BcHAuM2QgU3VwcC5cIjogXCJDYWwuIEFwcC4gU3VwcC4gM2RcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkNhbC5BcHAuU3VwcC5cIjogXCJDYWwuIEFwcC4gU3VwcC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkNhbC5BcHAuU3VwcC4yZFwiOiBcIkNhbC4gQXBwLiBTdXBwLiAyZFwifX1dLFxuICAgIFwiQ2FsLiBScHRyLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJDYWwuIFJwdHIuXCI6IFt7XCJ5ZWFyXCI6MTk1OSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTk5MSwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkNhbC4gUnB0ci4gMmRcIjogW3tcInllYXJcIjoxOTkyLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoyMDAzLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQ2FsLiBScHRyLiAzZFwiOiBbe1wieWVhclwiOjIwMDMsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztjYVwiXSxcbiAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiV2VzdCdzIENhbGlmb3JuaWEgUmVwb3J0ZXJcIixcbiAgICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkNhbC4gUnB0ci4yZFwiOiBcIkNhbC4gUnB0ci4gMmRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJDYWwuIFJwdHIuM2RcIjogXCJDYWwuIFJwdHIuIDNkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQ2FsLlJwdHIuXCI6IFwiQ2FsLiBScHRyLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkNhbC5ScHRyLiAyZFwiOiBcIkNhbC4gUnB0ci4gMmRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJDYWwuUnB0ci4gM2RcIjogXCJDYWwuIFJwdHIuIDNkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQ2FsLlJwdHIuMmRcIjogXCJDYWwuIFJwdHIuIDJkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQ2FsLlJwdHIuM2RcIjogXCJDYWwuIFJwdHIuIDNkXCJ9fV0sXG4gICAgXCJDYWwuIFVucmVwLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiQ2FsLiBVbnJlcC5cIjogW3tcInllYXJcIjoxODU1LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE5MTAsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztjYVwiXSxcbiAgICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIkNhbGlmb3JuaWEgVW5yZXBvcnRlZCBDYXNlc1wiLFxuICAgICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkNhbC5VbnJlcC5DYXMuXCI6IFwiQ2FsLiBVbnJlcC5cIn19XSxcbiAgICBcIkNhbGxcIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiQ2FsbFwiOiBbe1wieWVhclwiOjE3NzksIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4MjUsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3ZhXCJdLFxuICAgICAgICAgICAgICBcIm5hbWVcIjogXCJWaXJnaW5pYSBSZXBvcnRzLCBDYWxsXCIsXG4gICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJDYWxsIChWYS4pXCI6IFwiQ2FsbFwiLCBcIlZhLihDYWxsKVwiOiBcIkNhbGxcIn19XSxcbiAgICBcIkNhbS4gJiBOb3IuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJDYW0uICYgTm9yLlwiOiBbe1wieWVhclwiOjE4MDAsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTgwNCwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO25jXCJdLFxuICAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiTm9ydGggQ2Fyb2xpbmEgUmVwb3J0cywgQ29uZmVyZW5jZSBieSBDYW1lcm9uICYgTm9yd29vZFwiLFxuICAgICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkNhbS4mIE4uXCI6IFwiQ2FtLiAmIE5vci5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTi5DLihDYW0uJiBOb3IuKVwiOiBcIkNhbS4gJiBOb3IuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk4uQy5Db25mLlwiOiBcIkNhbS4gJiBOb3IuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk4uQy5Db25mLlJlcC5cIjogXCJDYW0uICYgTm9yLlwifX1dLFxuICAgIFwiQ2FyLiBMLiBSZXAuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiQ2FyLiBMLiBSZXAuXCI6IFt7XCJ5ZWFyXCI6MTgxMSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4MTYsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bmNcIl0sXG4gICAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiQ2Fyb2xpbmEgTGF3IFJlcG9zaXRvcnlcIixcbiAgICAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiQ2FyLkxhdy5SZXBvcy5cIjogXCJDYXIuIEwuIFJlcC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk4uQy4oQ2FyLkwuUmVwLilcIjogXCJDYXIuIEwuIFJlcC5cIn19XSxcbiAgICBcIkNoYW5kLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkNoYW5kLlwiOiBbe1wieWVhclwiOjE4NDksIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODUyLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3dpXCJdLFxuICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIldpc2NvbnNpbiBSZXBvcnRzLCBDaGFuZGxlclwiLFxuICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJDaGFuZC4oV2lzLilcIjogXCJDaGFuZC5cIiwgXCJDaGFuZGwuXCI6IFwiQ2hhbmQuXCJ9fV0sXG4gICAgXCJDaGV2LlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiQ2hldi5cIjogW3tcInllYXJcIjoxODM5LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4NDAsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztzY1wiXSxcbiAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIlNvdXRoIENhcm9saW5hIFJlcG9ydHMsIENoZXZlc1wiLFxuICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkNoZXZlc1wiOiBcIkNoZXYuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkNoZXZlcyBMLihTLkMuKVwiOiBcIkNoZXYuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlMuQy5MLihDaGV2LilcIjogXCJDaGV2LlwifX1dLFxuICAgIFwiQ2hldi4gRXEuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiQ2hldi4gRXEuXCI6IFt7XCJ5ZWFyXCI6MTgzOSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4NDAsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7c2NcIl0sXG4gICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiU291dGggQ2Fyb2xpbmEgUmVwb3J0cywgQ2hldmVzJyBFcXVpdHlcIixcbiAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiQ2hldi5DaC5cIjogXCJDaGV2LiBFcS5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkNoZXZlcyBFcS4oUy5DLilcIjogXCJDaGV2LiBFcS5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlMuQy5FcS4oQ2hldi5FcS4pXCI6IFwiQ2hldi4gRXEuXCJ9fV0sXG4gICAgXCJDbC4gQ2guXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkNsLiBDaC5cIjogW3tcInllYXJcIjoxODM5LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODQxLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztueVwiXSxcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiQ2xhcmtlJ3MgQ2hhbmNlcnkgUmVwb3J0c1wiLFxuICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiQ2wuUi5cIjogXCJDbC4gQ2guXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQ2xhcmtlXCI6IFwiQ2wuIENoLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkNsYXJrZSBDaC5cIjogXCJDbC4gQ2guXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQ2xhcmtlIENoLihOLlkuKVwiOiBcIkNsLiBDaC5cIn19XSxcbiAgICBcIkNsLiBDdC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInNwZWNpYWx0eVwiLFxuICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkNsLiBDdC5cIjogW3tcInllYXJcIjoxOTgzLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxOTkyLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1c1wiXSxcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiVW5pdGVkIFN0YXRlcyBDbGFpbXMgQ291cnQgUmVwb3J0ZXJcIixcbiAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fV0sXG4gICAgXCJDb2xkLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiQ29sZC5cIjogW3tcInllYXJcIjoxODYwLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4NzAsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1czt0blwiXSxcbiAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIlRlbm5lc3NlZSBSZXBvcnRzLCBDb2xkd2VsbFwiLFxuICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkNvbC5cIjogXCJDb2xkLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJDb2xkdy5cIjogXCJDb2xkLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJUZW5uLihDb2xkLilcIjogXCJDb2xkLlwifX1dLFxuICAgIFwiQ29sZS4gJiBDYWkuIENhcy5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkNvbGUuICYgQ2FpLiBDYXMuXCI6IFt7XCJ5ZWFyXCI6MTc5NCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODA1LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bnlcIl0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJDb2xlbWFuICYgQ2FpbmVzJyBDYXNlc1wiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkMuJiBDLlwiOiBcIkNvbGUuICYgQ2FpLiBDYXMuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkNvbC4mIEMuQ2FzLlwiOiBcIkNvbGUuICYgQ2FpLiBDYXMuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkNvbC4mIENhaS5cIjogXCJDb2xlLiAmIENhaS4gQ2FzLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJDb2wuJiBDYWluZXMgQ2FzLihOLlkuKVwiOiBcIkNvbGUuICYgQ2FpLiBDYXMuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkNvbGUuJiBDLkNhcy5cIjogXCJDb2xlLiAmIENhaS4gQ2FzLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJDb2xlLiYgQ2FpLlwiOiBcIkNvbGUuICYgQ2FpLiBDYXMuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkNvbGVtLiYgQy5DYXMuXCI6IFwiQ29sZS4gJiBDYWkuIENhcy5cIn19XSxcbiAgICBcIkNvbGUuIENhcy5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiQ29sZS4gQ2FzLlwiOiBbe1wieWVhclwiOjE3OTEsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4MDAsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO255XCJdLFxuICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJDb2xlbWFuJ3MgQ2FzZXNcIixcbiAgICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkMuQy5cIjogXCJDb2xlLiBDYXMuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQ29sLkNhcy5cIjogXCJDb2xlLiBDYXMuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQ29sLkNhcy4oTi5ZLilcIjogXCJDb2xlLiBDYXMuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQ29sZS5DYXMuUHIuXCI6IFwiQ29sZS4gQ2FzLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkNvbGVtLkNhcy5cIjogXCJDb2xlLiBDYXMuXCJ9fV0sXG4gICAgXCJDb2xvLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiQ29sby5cIjogW3tcInllYXJcIjoxODY0LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE5ODAsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztjb1wiXSxcbiAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIkNvbG9yYWRvIFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJDb2wuXCI6IFwiQ29sby5cIn19XSxcbiAgICBcIkNvbG8uIExhdy5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiQ29sby4gTGF3LlwiOiBbe1wieWVhclwiOjE3NTAsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztjb1wiXSxcbiAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiQ29sb3JhZG8gTGF3eWVyXCIsXG4gICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJDb2xvcmFkbyBMYXcuXCI6IFwiQ29sby4gTGF3LlwifX1dLFxuICAgIFwiQ29ubi5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkNvbm4uXCI6IFt7XCJ5ZWFyXCI6MTgxNCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2N0XCJdLFxuICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiQ29ubmVjdGljdXQgUmVwb3J0c1wiLFxuICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fV0sXG4gICAgXCJDb25uLiBBcHAuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkNvbm4uIEFwcC5cIjogW3tcInllYXJcIjoxOTgzLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7Y3RcIl0sXG4gICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIkNvbm5lY3RpY3V0IEFwcGVsbGF0ZSBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiQ29ubi4gQ2lyLiBDdFwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJDb25uLiBDaXIuIEN0XCI6IFt7XCJ5ZWFyXCI6MTk2MSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTk3NCwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7Y3RcIl0sXG4gICAgICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIkNvbm5lY3RpY3V0IENpcmN1aXQgQ291cnQgUmVwb3J0c1wiLFxuICAgICAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge319XSxcbiAgICBcIkNvbm4uIEwuIFJwdHIuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJDb25uLiBMLiBScHRyLlwiOiBbe1wieWVhclwiOjE5OTAsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztjdFwiXSxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIkNvbm5lY3RpY3V0IExhdyBSZXBvcnRlclwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fV0sXG4gICAgXCJDb25uLiBTdXBlci4gQ3QuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkNvbm4uIFN1cGVyLiBDdC5cIjogW3tcInllYXJcIjoxOTg2LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxOTk0LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztjdFwiXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiQ29ubmVjdGljdXQgU3VwZXJpb3IgQ291cnQgUmVwb3J0c1wiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge319XSxcbiAgICBcIkNvbm4uIFN1cHAuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJDb25uLiBTdXBwLlwiOiBbe1wieWVhclwiOjE5MzUsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztjdFwiXSxcbiAgICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIkNvbm5lY3RpY3V0IFN1cHBsZW1lbnRcIixcbiAgICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiQ29va2VcIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkNvb2tlXCI6IFt7XCJ5ZWFyXCI6MTgxMSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODE0LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7dG5cIl0sXG4gICAgICAgICAgICAgICBcIm5hbWVcIjogXCJUZW5uZXNzZWUgUmVwb3J0cywgQ29va2VcIixcbiAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJDb29rZSAoVGVubi4pXCI6IFwiQ29va2VcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiVGVubi4oQ29va2UpXCI6IFwiQ29va2VcIn19XSxcbiAgICBcIkNvdy5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiQ293LlwiOiBbe1wieWVhclwiOjE4MjMsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4MjksIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO255XCJdLFxuICAgICAgICAgICAgICBcIm5hbWVcIjogXCJDb3dlbidzIFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkMuXCI6IFwiQ293LlwiLCBcIkNvdy5OLlkuXCI6IFwiQ293LlwifX1dLFxuICAgIFwiQ3JhbmNoXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzY290dXNfZWFybHlcIixcbiAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkNyYW5jaFwiOiBbe1wieWVhclwiOjE4MDEsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODE1LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2ZlZGVyYWw7c3VwcmVtZS5jb3VydFwiXSxcbiAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJDcmFuY2gncyBTdXByZW1lIENvdXJ0IFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiQ3IuXCI6IFwiQ3JhbmNoXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJDcmEuXCI6IFwiQ3JhbmNoXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJDcmFuY2ggKFVTKVwiOiBcIkNyYW5jaFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiVS5TLihDcmFuY2gpXCI6IFwiQ3JhbmNoXCJ9fSxcbiAgICAgICAgICAgICAgIHtcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJDcmFuY2hcIjogW3tcInllYXJcIjoxODAxLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTg0MSwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztkY1wiXSxcbiAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJEaXN0cmljdCBvZiBDb2x1bWJpYSBSZXBvcnRzLCBDcmFuY2hcIixcbiAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiQ3JhbmNoIEMuQy5cIjogXCJDcmFuY2hcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkNyYW5jaCBELkMuXCI6IFwiQ3JhbmNoXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJELkMuKENyYW5jaClcIjogXCJDcmFuY2hcIn19XSxcbiAgICBcIkN0LiBDbC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInNwZWNpYWx0eVwiLFxuICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkN0LiBDbC5cIjogW3tcInllYXJcIjoxODYzLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxOTgyLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1c1wiXSxcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiQ291cnQgb2YgQ2xhaW1zIFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkNvdXJ0IENsLlwiOiBcIkN0LiBDbC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJDdC5DbC5cIjogXCJDdC4gQ2wuXCJ9fV0sXG4gICAgXCJDdC4gQ3VzdC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInNwZWNpYWx0eVwiLFxuICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiQ3QuIEN1c3QuXCI6IFt7XCJ5ZWFyXCI6MTkxMCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE5MjksIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXNcIl0sXG4gICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiQ291cnQgb2YgQ3VzdG9tcyBBcHBlYWxzIFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge319XSxcbiAgICBcIkN0LiBJbnQnbCBUcmFkZVwiOiBbe1wiY2l0ZV90eXBlXCI6IFwiZmVkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJDdC4gSW50J2wgVHJhZGVcIjogW3tcInllYXJcIjoxOTgwLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXNcIl0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiQ291cnQgb2YgSW50ZXJuYXRpb25hbCBUcmFkZSBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkN0LkludCdsIFRyYWRlXCI6IFwiQ3QuIEludCdsIFRyYWRlXCJ9fV0sXG4gICAgXCJDdXNoLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiQ3VzaC5cIjogW3tcInllYXJcIjoxODQ4LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4NTMsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1czttYVwiXSxcbiAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIk1hc3NhY2h1c2V0dHMgUmVwb3J0cywgQ3VzaGluZ1wiLFxuICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkN1c2guKE1hc3MuKVwiOiBcIkN1c2guXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkN1c2hpbmdcIjogXCJDdXNoLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJNYXNzLihDdXNoLilcIjogXCJDdXNoLlwifX1dLFxuICAgIFwiQ3VzdC4gQi4gJiBEZWMuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJmZWRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkN1c3QuIEIuICYgRGVjLlwiOiBbe1wieWVhclwiOjE5NjcsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1c1wiXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJDdXN0b21zIEJ1bGxldGluIGFuZCBEZWNpc2lvbnNcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge319XSxcbiAgICBcIkN1c3QuIEN0LlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwiZmVkXCIsXG4gICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJDdXN0LiBDdC5cIjogW3tcInllYXJcIjoxOTM4LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTk4MCwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1c1wiXSxcbiAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJDdXN0b21zIENvdXJ0IFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge319XSxcbiAgICBcIkQuIENoaXAuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJELiBDaGlwLlwiOiBbe1wieWVhclwiOjE3ODksIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTgyNCwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3Z0XCJdLFxuICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiVmVybW9udCBSZXBvcnRzLCBDaGlwbWFuLCBELlwiLFxuICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkNoaXAuXCI6IFwiRC4gQ2hpcC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQ2hpcC4oVnQuKVwiOiBcIkQuIENoaXAuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkNoaXAuRC5cIjogXCJELiBDaGlwLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJELkNoaXAuKFZ0LilcIjogXCJELiBDaGlwLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJELkNoaXBtLlwiOiBcIkQuIENoaXAuXCJ9fV0sXG4gICAgXCJEYWtvdGFcIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJEYWtvdGFcIjogW3tcInllYXJcIjoxODY3LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTg4OSwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztuZFwiXSxcbiAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJEYWtvdGEgUmVwb3J0c1wiLFxuICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJEYWsuXCI6IFwiRGFrb3RhXCJ9fV0sXG4gICAgXCJEYWxsLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic2NvdHVzX2Vhcmx5XCIsXG4gICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkRhbGwuXCI6IFt7XCJ5ZWFyXCI6MTc5MCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODgwLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7ZmVkZXJhbDtzdXByZW1lLmNvdXJ0XCJdLFxuICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiRGFsbGFzJyBTdXByZW1lIENvdXJ0IFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJEYWwuXCI6IFwiRGFsbC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiRGFsbC5TLkMuXCI6IFwiRGFsbC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiRGFsbGFzXCI6IFwiRGFsbC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiVS5TLihEYWxsLilcIjogXCJEYWxsLlwifX0sXG4gICAgICAgICAgICAgIHtcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkRhbGwuXCI6IFt7XCJ5ZWFyXCI6MTc1NCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODA2LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7cGFcIl0sXG4gICAgICAgICAgICAgICBcIm5hbWVcIjogXCJQZW5uc3lsdmFuaWEgU3RhdGUgUmVwb3J0cywgRGFsbGFzXCIsXG4gICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiRC5cIjogXCJEYWxsLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJEYWwuXCI6IFwiRGFsbC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiRGFsbGFzXCI6IFwiRGFsbC5cIn19XSxcbiAgICBcIkRhbGxhbVwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkRhbGxhbVwiOiBbe1wieWVhclwiOjE4NDAsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODQ0LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3R4XCJdLFxuICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIkRpZ2VzdCBvZiB0aGUgTGF3cyBvZiBUZXhhcyAoRGFsbGFtJ3MgT3BpbmlvbnMpXCIsXG4gICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkRhbGwuKFRleC4pXCI6IFwiRGFsbGFtXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJEYWxsLkRpZy5cIjogXCJEYWxsYW1cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkRhbGxhbSBEaWcuKFRleC4pXCI6IFwiRGFsbGFtXCJ9fV0sXG4gICAgXCJEYW5hXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkRhbmFcIjogW3tcInllYXJcIjoxODMzLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODQwLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztreVwiXSxcbiAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiS2VudHVja3kgUmVwb3J0cywgRGFuYVwiLFxuICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiRGFuLlwiOiBcIkRhbmFcIiwgXCJLeS4oRGFuYSlcIjogXCJEYW5hXCJ9fV0sXG4gICAgXCJEYXlcIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJEYXlcIjogW3tcInllYXJcIjoxODAyLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTgxMywgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1YztjdFwiXSxcbiAgICAgICAgICAgICBcIm5hbWVcIjogXCJEYXkncyBDb25uZWN0aWN1dCBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkRheSAoQ29ubilcIjogXCJEYXlcIn19XSxcbiAgICBcIkRlbC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiRGVsLlwiOiBbe1wieWVhclwiOjE5MjAsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE5NjYsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2RlXCJdLFxuICAgICAgICAgICAgICBcIm5hbWVcIjogXCJEZWxhd2FyZSBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiRGVsLiBDYXMuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiRGVsLiBDYXMuXCI6IFt7XCJ5ZWFyXCI6MTc5MiwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4MzAsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7ZGVcIl0sXG4gICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiRGVsYXdhcmUgQ2FzZXNcIixcbiAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge319XSxcbiAgICBcIkRlbC4gQ2guXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJEZWwuIENoLlwiOiBbe1wieWVhclwiOjE4MTQsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTk2OCwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2RlXCJdLFxuICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiRGVsYXdhcmUgQ2hhbmNlcnkgUmVwb3J0c1wiLFxuICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fV0sXG4gICAgXCJEZW5pb1wiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiRGVuaW9cIjogW3tcInllYXJcIjoxODQ1LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4NDgsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztueVwiXSxcbiAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIkRlbmlvJ3MgUmVwb3J0c1wiLFxuICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkRlbi5cIjogXCJEZW5pb1wifX1dLFxuICAgIFwiRGVzLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJEZXMuXCI6IFt7XCJ5ZWFyXCI6MTc4NCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTgxNywgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7c2NcIl0sXG4gICAgICAgICAgICAgIFwibmFtZVwiOiBcIlNvdXRoIENhcm9saW5hIFJlcG9ydHMsIERlc2F1c3N1cmUncyBFcXVpdHlcIixcbiAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkRlc2F1cy5cIjogXCJEZXMuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiRGVzYXVzLkVxLlwiOiBcIkRlcy5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJTLkMuRXEuKERlcy4pXCI6IFwiRGVzLlwifX1dLFxuICAgIFwiRGV2LlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJEZXYuXCI6IFt7XCJ5ZWFyXCI6MTgyNiwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTgzNCwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bmNcIl0sXG4gICAgICAgICAgICAgIFwibmFtZVwiOiBcIk5vcnRoIENhcm9saW5hIFJlcG9ydHMsIERldmVyZXV4J3MgTGF3XCIsXG4gICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJEZXYuTC5cIjogXCJEZXYuXCIsIFwiTi5DLihEZXYuKVwiOiBcIkRldi5cIn19XSxcbiAgICBcIkRldi4gJiBCYXQuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJEZXYuICYgQmF0LlwiOiBbe1wieWVhclwiOjE4MzQsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTgzOSwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO25jXCJdLFxuICAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiTm9ydGggQ2Fyb2xpbmEgUmVwb3J0cywgRGV2ZXJldXggJiBCYXR0bGUncyBMYXdcIixcbiAgICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJELiYgQi5cIjogXCJEZXYuICYgQmF0LlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJEZXYuJiBCLlwiOiBcIkRldi4gJiBCYXQuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkRldi4mIEIuTC5cIjogXCJEZXYuICYgQmF0LlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJOLkMuKERldi4mIEJhdC4pXCI6IFwiRGV2LiAmIEJhdC5cIn19XSxcbiAgICBcIkRldi4gJiBCYXQuIEVxLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkRldi4gJiBCYXQuIEVxLlwiOiBbe1wieWVhclwiOjE4MzQsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODM5LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO25jXCJdLFxuICAgICAgICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIk5vcnRoIENhcm9saW5hIFJlcG9ydHMsIERldmVyZXV4ICYgQmF0dGxlJ3MgRXF1aXR5XCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkQuJiBCLlwiOiBcIkRldi4gJiBCYXQuIEVxLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiRGV2LiYgQi5cIjogXCJEZXYuICYgQmF0LiBFcS5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkRldi4mIEIuRXEuXCI6IFwiRGV2LiAmIEJhdC4gRXEuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJOLkMuKERldi4mIEJhdC5FcS4pXCI6IFwiRGV2LiAmIEJhdC4gRXEuXCJ9fV0sXG4gICAgXCJEZXYuIEVxLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiRGV2LiBFcS5cIjogW3tcInllYXJcIjoxODI2LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4MzQsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztuY1wiXSxcbiAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIk5vcnRoIENhcm9saW5hIFJlcG9ydHMsIERldmVyZXV4J3MgRXF1aXR5XCIsXG4gICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiRGV2LlwiOiBcIkRldi4gRXEuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk4uQy4oRGV2LkVxLilcIjogXCJEZXYuIEVxLlwifX1dLFxuICAgIFwiRG91Zy5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkRvdWcuXCI6IFt7XCJ5ZWFyXCI6MTg0MywgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODQ3LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bWlcIl0sXG4gICAgICAgICAgICAgICBcIm5hbWVcIjogXCJNaWNoaWdhbiBSZXBvcnRzLCBEb3VnbGFzc1wiLFxuICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkRvdWcuKE1pY2guKVwiOiBcIkRvdWcuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkRvdWdsLihNaWNoLilcIjogXCJEb3VnLlwifX1dLFxuICAgIFwiRHVkLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJEdWQuXCI6IFt7XCJ5ZWFyXCI6MTgzNywgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTgzOCwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7c2NcIl0sXG4gICAgICAgICAgICAgIFwibmFtZVwiOiBcIlNvdXRoIENhcm9saW5hIFJlcG9ydHMsIER1ZGxleVwiLFxuICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiRHVkLihTLkMuKVwiOiBcIkR1ZC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJEdWQuTC5cIjogXCJEdWQuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiRHVkLkwuKFMuQy4pXCI6IFwiRHVkLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkR1ZGwuXCI6IFwiRHVkLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlMuQy5MLihEdWQuKVwiOiBcIkR1ZC5cIn19XSxcbiAgICBcIkR1ZC4gRXEuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJEdWQuIEVxLlwiOiBbe1wieWVhclwiOjE4MzcsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTgzOCwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3NjXCJdLFxuICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiU291dGggQ2Fyb2xpbmEgUmVwb3J0cywgRHVkbGV5J3MgRXF1aXR5XCIsXG4gICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiRHVkLkNoLlwiOiBcIkR1ZC4gRXEuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkR1ZC5FcS4oUy5DLilcIjogXCJEdWQuIEVxLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJEdWRsLlwiOiBcIkR1ZC4gRXEuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlMuQy5FcS4oRHVkLkVxLilcIjogXCJEdWQuIEVxLlwifX1dLFxuICAgIFwiRHV2LlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJEdXYuXCI6IFt7XCJ5ZWFyXCI6MTg2MywgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTg2NiwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7a3lcIl0sXG4gICAgICAgICAgICAgIFwibmFtZVwiOiBcIktlbnR1Y2t5IFJlcG9ydHMsIER1dmFsbFwiLFxuICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiS3kuKER1di4pXCI6IFwiRHV2LlwifX1dLFxuICAgIFwiRWRtLiBTZWwuIENhcy5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkVkbS4gU2VsLiBDYXMuXCI6IFt7XCJ5ZWFyXCI6MTgzNCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODUzLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bnlcIl0sXG4gICAgICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJFZG1vbmQncyBTZWxlY3QgQ2FzZXNcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJFZG0uU2VsLkNhLlwiOiBcIkVkbS4gU2VsLiBDYXMuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkVkbS5TZWwuQ2FzLihOLlkuKVwiOiBcIkVkbS4gU2VsLiBDYXMuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkVkbW9uZFwiOiBcIkVkbS4gU2VsLiBDYXMuXCJ9fV0sXG4gICAgXCJFZHcuIENoLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiRWR3LiBDaC5cIjogW3tcInllYXJcIjoxODMxLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4NTAsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztueVwiXSxcbiAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIkVkd2FyZHMnIENoYW5jZXJ5IFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJFZC5DLlIuXCI6IFwiRWR3LiBDaC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiRWQuQ2guXCI6IFwiRWR3LiBDaC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiRWR3LlwiOiBcIkVkdy4gQ2guXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkVkdy5DaC4oTi5ZLilcIjogXCJFZHcuIENoLlwifX1dLFxuICAgIFwiRi5cIjogW3tcImNpdGVfdHlwZVwiOiBcImZlZFwiLFxuICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJGLlwiOiBbe1wieWVhclwiOjE4ODAsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTkyNCwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgXCJGLjJkXCI6IFt7XCJ5ZWFyXCI6MTkyNCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE5OTMsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dLFxuICAgICAgICAgICAgICAgICAgICAgICAgIFwiRi4zZFwiOiBbe1wieWVhclwiOjE5OTMsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2ZlZGVyYWw7MS1jaXJcIixcInVzO2ZlZGVyYWw7Mi1jaXJcIixcInVzO2ZlZGVyYWw7My1jaXJcIixcInVzO2ZlZGVyYWw7NC1jaXJcIixcInVzO2ZlZGVyYWw7NS1jaXJcIixcInVzO2ZlZGVyYWw7Ni1jaXJcIixcInVzO2ZlZGVyYWw7Ny1jaXJcIixcInVzO2ZlZGVyYWw7OC1jaXJcIixcInVzO2ZlZGVyYWw7OS1jaXJcIixcInVzO2ZlZGVyYWw7MTAtY2lyXCIsXCJ1cztmZWRlcmFsOzExLWNpclwiXSxcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIkZlZGVyYWwgUmVwb3J0ZXJcIixcbiAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJGLiAyZFwiOiBcIkYuMmRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiRi4gM2RcIjogXCJGLjNkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBcIkYuMmQuXCI6IFwiRi4yZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJGLjNkLlwiOiBcIkYuM2RcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiRmVkLlIuXCI6IFwiRi5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiRmVkLlIuMmRcIjogXCJGLjJkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBcIkZlZC5SLjNkXCI6IFwiRi4zZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJGZWQuUmVwLlwiOiBcIkYuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBcIkZlZC5SZXAuMmRcIjogXCJGLjJkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBcIkZlZC5SZXAuM2RcIjogXCJGLjNkXCJ9fV0sXG4gICAgXCJGLiBBcHAneFwiOiBbe1wiY2l0ZV90eXBlXCI6IFwiZmVkXCIsXG4gICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJGLiBBcHAneFwiOiBbe1wieWVhclwiOjIwMDEsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztmZWRlcmFsOzEtY2lyXCIsXCJ1cztmZWRlcmFsOzItY2lyXCIsXCJ1cztmZWRlcmFsOzMtY2lyXCIsXCJ1cztmZWRlcmFsOzQtY2lyXCIsXCJ1cztmZWRlcmFsOzUtY2lyXCIsXCJ1cztmZWRlcmFsOzYtY2lyXCIsXCJ1cztmZWRlcmFsOzctY2lyXCIsXCJ1cztmZWRlcmFsOzgtY2lyXCIsXCJ1cztmZWRlcmFsOzktY2lyXCIsXCJ1cztmZWRlcmFsOzEwLWNpclwiLFwidXM7ZmVkZXJhbDsxMS1jaXJcIl0sXG4gICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiRmVkZXJhbCBBcHBlbmRpeFwiLFxuICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiRi4gQ2FzLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwiZmVkXCIsXG4gICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiRi4gQ2FzLlwiOiBbe1wieWVhclwiOjE3ODksIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4ODAsIFwibW9udGhcIjowLCBcImRheVwiOjF9XX0sXG4gICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1c1wiXSxcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiRmVkZXJhbCBDYXNlc1wiLFxuICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiRi5DLlwiOiBcIkYuIENhcy5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJGLkNhcy5cIjogXCJGLiBDYXMuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiRmVkLkNhLlwiOiBcIkYuIENhcy5cIn19XSxcbiAgICBcIkYuIFN1cHAuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJmZWRcIixcbiAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiRi4gU3VwcC5cIjogW3tcInllYXJcIjoxOTMyLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE5ODgsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiRi4gU3VwcC4gMmRcIjogW3tcInllYXJcIjoxOTg4LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXNcIl0sXG4gICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJGZWRlcmFsIFN1cHBsZW1lbnRcIixcbiAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJGLiBTdXBwLjJkXCI6IFwiRi4gU3VwcC4gMmRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiRi5TdXBwLlwiOiBcIkYuIFN1cHAuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkYuU3VwcC4gMmRcIjogXCJGLiBTdXBwLiAyZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJGLlN1cHAuMmRcIjogXCJGLiBTdXBwLiAyZFwifX1dLFxuICAgIFwiRi5SLkQuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzcGVjaWFsdHlcIixcbiAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkYuUi5ELlwiOiBbe1wieWVhclwiOjIwMDEsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1c1wiXSxcbiAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJGZWRlcmFsIFJ1bGVzIERlY2lzaW9uc1wiLFxuICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiRkxcIjogW3tcImNpdGVfdHlwZVwiOiBcIm5ldXRyYWxcIixcbiAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiRkxcIjogW3tcInllYXJcIjoxNzUwLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7ZmxcIl0sXG4gICAgICAgICAgICBcIm5hbWVcIjogXCJGbG9yaWRhIE5ldXRyYWwgQ2l0YXRpb25cIixcbiAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiRmVkLiBDbC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInNwZWNpYWx0eVwiLFxuICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJGZWQuIENsLlwiOiBbe1wieWVhclwiOjE5OTIsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1c1wiXSxcbiAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIlVuaXRlZCBTdGF0ZXMgQ2xhaW1zIENvdXJ0IFJlcG9ydGVyXCIsXG4gICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiRmVkLkNsLlwiOiBcIkZlZC4gQ2wuXCJ9fV0sXG4gICAgXCJGZWQuIFIuIFNlcnYuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzcGVjaWFsdHlcIixcbiAgICAgICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJGZWQuIFIuIFNlcnYuXCI6IFt7XCJ5ZWFyXCI6MTkzOCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJGZWQuIFIuIFNlcnYuIDJkXCI6IFt7XCJ5ZWFyXCI6MTkzOCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJGZWQuIFIuIFNlcnYuIDNkXCI6IFt7XCJ5ZWFyXCI6MTkzOCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzXCJdLFxuICAgICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJGZWRlcmFsIFJ1bGVzIFNlcnZpY2VcIixcbiAgICAgICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkZlZC4gUi4gU2Vydi4gKENhbGxhZ2hhbilcIjogXCJGZWQuIFIuIFNlcnYuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiRmVkLiBSLiBTZXJ2LiAyZCAoQ2FsbGFnaGFuKVwiOiBcIkZlZC4gUi4gU2Vydi4gMmRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJGZWQuIFIuIFNlcnYuIDNkIChXZXN0KVwiOiBcIkZlZC4gUi4gU2Vydi4gM2RcIn19XSxcbiAgICBcIkZsYS5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiRmxhLlwiOiBbe1wieWVhclwiOjE4NDYsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE5NDgsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2ZsXCJdLFxuICAgICAgICAgICAgICBcIm5hbWVcIjogXCJGbG9yaWRhIFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkZsb3IuXCI6IFwiRmxhLlwiLCBcIkZsb3JpZGFcIjogXCJGbGEuXCJ9fV0sXG4gICAgXCJGbGEuIEwuIFdlZWtseVwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiRmxhLiBMLiBXZWVrbHlcIjogW3tcInllYXJcIjoxOTc4LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7ZmxcIl0sXG4gICAgICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJGbG9yaWRhIExhdyBXZWVrbHlcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiRmxhLiBMLiBXZWVrbHkgU3VwcC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkZsYS4gTC4gV2Vla2x5IFN1cHAuXCI6IFt7XCJ5ZWFyXCI6MTk5MiwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2ZsXCJdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiRmxvcmlkYSBMYXcgV2Vla2x5IFN1cHBsZW1lbnRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiRmxhLiBTdXBwLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJGbGEuIFN1cHAuXCI6IFt7XCJ5ZWFyXCI6MTk0OCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTk4MSwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkZsYS4gU3VwcC4gMmRcIjogW3tcInllYXJcIjoxOTgzLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxOTkyLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztmbFwiXSxcbiAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiRmxvcmlkYSBTdXBwbGVtZW50XCIsXG4gICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJGbC5TLlwiOiBcIkZsYS4gU3VwcC5cIn19XSxcbiAgICBcIkcuICYgSi5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiRy4gJiBKLlwiOiBbe1wieWVhclwiOjE4MjksIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4NDIsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO21kXCJdLFxuICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJNYXJ5bGFuZCBSZXBvcnRzLCBHaWxsICYgSm9obnNvblwiLFxuICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge319XSxcbiAgICBcIkdhLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkdhLlwiOiBbe1wieWVhclwiOjE4NDYsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztnYVwiXSxcbiAgICAgICAgICAgICBcIm5hbWVcIjogXCJHZW9yZ2lhIFJlcG9ydHNcIixcbiAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge319XSxcbiAgICBcIkdhLiBBcHAuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJHYS4gQXBwLlwiOiBbe1wieWVhclwiOjE5MDcsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztnYVwiXSxcbiAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIkdlb3JnaWEgQXBwZWFscyBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge319XSxcbiAgICBcIkdpbGQuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJHaWxkLlwiOiBbe1wieWVhclwiOjE4ODMsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTg4OSwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO25tXCJdLFxuICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiR2lsZGVyc2xlZXZlIFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJHaWxkZXJzbGVldmVcIjogXCJHaWxkLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJHaWxkci5cIjogXCJHaWxkLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJOLk0uKEcuKVwiOiBcIkdpbGQuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk4uTS4oR2lsZC4pXCI6IFwiR2lsZC5cIn19XSxcbiAgICBcIkdpbGxcIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiR2lsbFwiOiBbe1wieWVhclwiOjE4NDMsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4NTEsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO21kXCJdLFxuICAgICAgICAgICAgICBcIm5hbWVcIjogXCJNYXJ5bGFuZCBSZXBvcnRzLCBHaWxsXCIsXG4gICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiR2lsbS5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkdpbG0uXCI6IFt7XCJ5ZWFyXCI6MTg0NCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODQ5LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7aWxcIl0sXG4gICAgICAgICAgICAgICBcIm5hbWVcIjogXCJJbGxpbm9pcyBSZXBvcnRzLCBHaWxtYW5cIixcbiAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJHaWxtLihJbGwuKVwiOiBcIkdpbG0uXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkdpbG1hblwiOiBcIkdpbG0uXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIklsbC4oR2lsbS4pXCI6IFwiR2lsbS5cIn19XSxcbiAgICBcIkdpbG1lclwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkdpbG1lclwiOiBbe1wieWVhclwiOjE4MjAsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODIxLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3ZhXCJdLFxuICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIlZpcmdpbmlhIFJlcG9ydHMsIEdpbG1lclwiLFxuICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJHaWwuXCI6IFwiR2lsbWVyXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJHaWxtLlwiOiBcIkdpbG1lclwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiR2lsbWVyIChWYS4pXCI6IFwiR2lsbWVyXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJWYS4oR2lsbWVyKVwiOiBcIkdpbG1lclwifX1dLFxuICAgIFwiR3JhbnRcIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkdyYW50XCI6IFt7XCJ5ZWFyXCI6MTgxNCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODYzLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7cGFcIl0sXG4gICAgICAgICAgICAgICBcIm5hbWVcIjogXCJQZW5uc3lsdmFuaWEgU3RhdGUgUmVwb3J0cywgR3JhbnRcIixcbiAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJHci5cIjogXCJHcmFudFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJHcmFudCAoUGEuKVwiOiBcIkdyYW50XCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkdyYW50IENhcy5cIjogXCJHcmFudFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJHcmFudCBDYXMuKFBhLilcIjogXCJHcmFudFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJHcmFudCBQYS5cIjogXCJHcmFudFwifX1dLFxuICAgIFwiR3JhdHQuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiR3JhdHQuXCI6IFt7XCJ5ZWFyXCI6MTg0NCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4ODAsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7dmFcIl0sXG4gICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiVmlyZ2luaWEgUmVwb3J0cywgR3JhdHRhblwiLFxuICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJHcmF0dC4oVmEuKVwiOiBcIkdyYXR0LlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiVmEuKEdyYXR0LilcIjogXCJHcmF0dC5cIn19XSxcbiAgICBcIkdyYXlcIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiR3JheVwiOiBbe1wieWVhclwiOjE4NTQsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4NjAsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO21hXCJdLFxuICAgICAgICAgICAgICBcIm5hbWVcIjogXCJNYXNzYWNodXNldHRzIFJlcG9ydHMsIEdyYXlcIixcbiAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkdyYXkgKE1hc3MuKVwiOiBcIkdyYXlcIiwgXCJNYXNzLihHcmF5KVwiOiBcIkdyYXlcIn19XSxcbiAgICBcIkdyZWVuZVwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkdyZWVuZVwiOiBbe1wieWVhclwiOjE4NDcsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODU0LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVpO2lhXCJdLFxuICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIklvd2EgUmVwb3J0cywgR3JlZW5lXCIsXG4gICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkdyZWVuZSBHLihJb3dhKVwiOiBcIkdyZWVuZVwifX1dLFxuICAgIFwiR3VhbVwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJHdWFtXCI6IFt7XCJ5ZWFyXCI6MTk1NSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2d1XCJdLFxuICAgICAgICAgICAgICBcIm5hbWVcIjogXCJHdWFtIFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fV0sXG4gICAgXCJHdW5ieVwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiR3VuYnlcIjogW3tcInllYXJcIjoxODg1LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4ODUsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztsYVwiXSxcbiAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIkxvdWlzaWFuYSBDb3VydCBvZiBBcHBlYWxzIFJlcG9ydHMsIEd1bmJ5XCIsXG4gICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiR3VuYnkgKExhLilcIjogXCJHdW5ieVwifX1dLFxuICAgIFwiSC4gJiBHLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJILiAmIEcuXCI6IFt7XCJ5ZWFyXCI6MTgyNiwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTgyOSwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bWRcIl0sXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIk1hcnlsYW5kIFJlcG9ydHMsIEhhcnJpcyBhbmQgR2lsbFwiLFxuICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge319XSxcbiAgICBcIkguICYgSi5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiSC4gJiBKLlwiOiBbe1wieWVhclwiOjE4MDAsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4MjYsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO21kXCJdLFxuICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJNYXJ5bGFuZCBSZXBvcnRzLCBIYXJyaXMgYW5kIEpvaG5zb25cIixcbiAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fV0sXG4gICAgXCJILiAmIE1jSC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJILiAmIE1jSC5cIjogW3tcInllYXJcIjoxNzcwLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTc5OSwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1czttZFwiXSxcbiAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJNYXJ5bGFuZCBSZXBvcnRzLCBIYXJyaXMgYW5kIE1jSGVucnlcIixcbiAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge319XSxcbiAgICBcIkhhcmQuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJIYXJkLlwiOiBbe1wieWVhclwiOjE4MDUsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTgwOCwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2t5XCJdLFxuICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiS2VudHVja3kgUmVwb3J0cywgSGFyZGluXCIsXG4gICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiSGFyZGluXCI6IFwiSGFyZC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiSGFyZGluKEt5LilcIjogXCJIYXJkLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJLeS4oSGFyZC4pXCI6IFwiSGFyZC5cIn19XSxcbiAgICBcIkhhcnAuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJIYXJwLlwiOiBbe1wieWVhclwiOjE4MjMsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTgzMSwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3NjXCJdLFxuICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiU291dGggQ2Fyb2xpbmEgUmVwb3J0cywgSGFycGVyXCIsXG4gICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiSGFycC5MLlwiOiBcIkhhcnAuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkhhcnAuTC4oUy5DLilcIjogXCJIYXJwLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJIYXJwZXJcIjogXCJIYXJwLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJTLkMuTC4oSGFycC4pXCI6IFwiSGFycC5cIn19XSxcbiAgICBcIkhhcnAuIEVxLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkhhcnAuIEVxLlwiOiBbe1wieWVhclwiOjE4MjQsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODI0LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3NjXCJdLFxuICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIlNvdXRoIENhcm9saW5hIFJlcG9ydHMsIEhhcnBlcidzIEVxdWl0eVwiLFxuICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJIYXJwLlwiOiBcIkhhcnAuIEVxLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiSGFycC5FcS4oUy5DLilcIjogXCJIYXJwLiBFcS5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkhhcnBlclwiOiBcIkhhcnAuIEVxLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiUy5DLkVxLihIYXJwLkVxLilcIjogXCJIYXJwLiBFcS5cIn19XSxcbiAgICBcIkhhcnJpbmd0b25cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiSGFycmluZ3RvblwiOiBbe1wieWVhclwiOjE4MzIsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4NTUsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2RlXCJdLFxuICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJEZWxhd2FyZSBSZXBvcnRzLCBIYXJyaW5ndG9uXCIsXG4gICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiSGF3LlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJIYXcuXCI6IFt7XCJ5ZWFyXCI6MTg0NywgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2hpXCJdLFxuICAgICAgICAgICAgICBcIm5hbWVcIjogXCJIYXdhaWkgUmVwb3J0c1wiLFxuICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiSC5cIjogXCJIYXcuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiSGF3YWlgaVwiOiBcIkhhdy5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJIYXdhaWlcIjogXCJIYXcuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiSGF3YWlpIFJlcC5cIjogXCJIYXcuXCJ9fV0sXG4gICAgXCJIYXcuIEFwcC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJIYXcuIEFwcC5cIjogW3tcInllYXJcIjoxOTgwLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTk5NCwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztoaVwiXSxcbiAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJIYXdhaWkgQXBwZWxsYXRlIFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiSGF3YWlpIEFwcC5cIjogXCJIYXcuIEFwcC5cIn19XSxcbiAgICBcIkhhd2tzXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJIYXdrc1wiOiBbe1wieWVhclwiOjE4MjAsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTgyNiwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO25jXCJdLFxuICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiTm9ydGggQ2Fyb2xpbmEgUmVwb3J0cywgSGF3a3NcIixcbiAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJIYXdrcyhOLkMuKVwiOiBcIkhhd2tzXCIsIFwiTi5DLihIYXdrcylcIjogXCJIYXdrc1wifX1dLFxuICAgIFwiSGF5LiAmIEhhei5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkhheS4gJiBIYXouXCI6IFt7XCJ5ZWFyXCI6MTg0MSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODYyLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7ZGNcIl0sXG4gICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJEaXN0cmljdCBvZiBDb2x1bWJpYSBSZXBvcnRzLCBIYXl3YXJkICYgSGF6ZWx0b25cIixcbiAgICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJIYXl3LiYgSC5cIjogXCJIYXkuICYgSGF6LlwifX1dLFxuICAgIFwiSGF5dy5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkhheXcuXCI6IFt7XCJ5ZWFyXCI6MTc4OSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODA2LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bmNcIl0sXG4gICAgICAgICAgICAgICBcIm5hbWVcIjogXCJOb3J0aCBDYXJvbGluYSBSZXBvcnRzLCBIYXl3b29kXCIsXG4gICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiSGF5LlwiOiBcIkhheXcuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkhheXcuTi5DLlwiOiBcIkhheXcuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk4uQy4oSGF5dy4pXCI6IFwiSGF5dy5cIn19LFxuICAgICAgICAgICAgICB7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJIYXl3LlwiOiBbe1wieWVhclwiOjE4MTYsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTgxOCwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3RuXCJdLFxuICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiVGVubmVzc2VlIFJlcG9ydHMsIEhheXdvb2RcIixcbiAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJIYXl3LihUZW5uLilcIjogXCJIYXl3LlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJIYXl3LlRlbm4uXCI6IFwiSGF5dy5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiVGVubi4oSGF5dy4pXCI6IFwiSGF5dy5cIn19XSxcbiAgICBcIkhlYWRcIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiSGVhZFwiOiBbe1wieWVhclwiOjE4NTgsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4NjAsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3RuXCJdLFxuICAgICAgICAgICAgICBcIm5hbWVcIjogXCJUZW5uZXNzZWUgUmVwb3J0cywgSGVhZFwiLFxuICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiSGVhZChUZW5uLilcIjogXCJIZWFkXCIsIFwiVGVubi4oSGVhZClcIjogXCJIZWFkXCJ9fV0sXG4gICAgXCJIZWlzay5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJIZWlzay5cIjogW3tcInllYXJcIjoxODcwLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTg3OSwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1czt0blwiXSxcbiAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJUZW5uZXNzZWUgUmVwb3J0cywgSGVpc2tlbGxcIixcbiAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiSGVpc2suKFRlbm4uKVwiOiBcIkhlaXNrLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiVGVubi4oSGVpc2suKVwiOiBcIkhlaXNrLlwifX1dLFxuICAgIFwiSGVuLiAmIE0uXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiSGVuLiAmIE0uXCI6IFt7XCJ5ZWFyXCI6MTgwNiwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4MTAsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7dmFcIl0sXG4gICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiVmlyZ2luaWEgUmVwb3J0cywgSGVuaW5nICYgTXVuZm9yZFwiLFxuICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJILiYgTS5cIjogXCJIZW4uICYgTS5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkguJiBNLihWYS4pXCI6IFwiSGVuLiAmIE0uXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJIZW4uJiBNdW4uXCI6IFwiSGVuLiAmIE0uXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJWYS4oSGVuLiYgTS4pXCI6IFwiSGVuLiAmIE0uXCJ9fV0sXG4gICAgXCJIaWxsXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkhpbGxcIjogW3tcInllYXJcIjoxODQxLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODQ0LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztueVwiXSxcbiAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiSGlsbCdzIE5ldyBZb3JrIFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkguXCI6IFwiSGlsbFwiLCBcIkhpbGwuTi5ZLlwiOiBcIkhpbGxcIn19LFxuICAgICAgICAgICAgIHtcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiSGlsbFwiOiBbe1wieWVhclwiOjE4MzMsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4MzcsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3NjXCJdLFxuICAgICAgICAgICAgICBcIm5hbWVcIjogXCJTb3V0aCBDYXJvbGluYSBSZXBvcnRzLCBIaWxsXCIsXG4gICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJIaWxsIExhd1wiOiBcIkhpbGxcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJIaWxsIFMuQy5cIjogXCJIaWxsXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiUy5DLkwuKEhpbGwpXCI6IFwiSGlsbFwifX1dLFxuICAgIFwiSGlsbCAmIERlbi5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkhpbGwgJiBEZW4uXCI6IFt7XCJ5ZWFyXCI6MTg0MiwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODQ0LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bnlcIl0sXG4gICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJIaWxsIGFuZCBEZW5pbyBTdXBwbGVtZW50IChMYWxvcilcIixcbiAgICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJIaWxsICYgRC5TdXBwLlwiOiBcIkhpbGwgJiBEZW4uXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkhpbGwgJiBEZW4uU3VwcC5cIjogXCJIaWxsICYgRGVuLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJMYWxvclwiOiBcIkhpbGwgJiBEZW4uXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkxhbG9yIFN1cHAuXCI6IFwiSGlsbCAmIERlbi5cIn19XSxcbiAgICBcIkhpbGwgRXEuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJIaWxsIEVxLlwiOiBbe1wieWVhclwiOjE4MzMsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTgzNywgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3NjXCJdLFxuICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiU291dGggQ2Fyb2xpbmEgUmVwb3J0cywgSGlsbCdzIENoYW5jZXJ5XCIsXG4gICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiSGlsbFwiOiBcIkhpbGwgRXEuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkhpbGwgQ2guXCI6IFwiSGlsbCBFcS5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiSGlsbCBFcS4oUy5DLilcIjogXCJIaWxsIEVxLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJIaWxsIFMuQy5cIjogXCJIaWxsIEVxLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJTLkMuRXEuKEhpbGwgRXEuKVwiOiBcIkhpbGwgRXEuXCJ9fV0sXG4gICAgXCJIb2ZmLiBDaC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJIb2ZmLiBDaC5cIjogW3tcInllYXJcIjoxODM4LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTg0MCwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztueVwiXSxcbiAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJIb2ZmbWFuJ3MgQ2hhbmNlcnkgUmVwb3J0c1wiLFxuICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJIb2ZmLlwiOiBcIkhvZmYuIENoLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiSG9mZi5DaGEuXCI6IFwiSG9mZi4gQ2guXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJIb2ZmLk4uWS5cIjogXCJIb2ZmLiBDaC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkhvZmZtLlwiOiBcIkhvZmYuIENoLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiSG9mZm0uQ2guKE4uWS4pXCI6IFwiSG9mZi4gQ2guXCJ9fV0sXG4gICAgXCJIb3BrLiBDaC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJIb3BrLiBDaC5cIjogW3tcInllYXJcIjoxODIzLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTgyNiwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztueVwiXSxcbiAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJIb3BraW5zJyBDaGFuY2VyeSBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fV0sXG4gICAgXCJIb3VzdG9uXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkhvdXN0b25cIjogW3tcInllYXJcIjoxODU1LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODkzLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztkZVwiXSxcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiRGVsYXdhcmUgUmVwb3J0cywgSG91c3RvblwiLFxuICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge319XSxcbiAgICBcIkhvdy5cIjogW3tcImNpdGVfdHlwZVwiOiBcInNjb3R1c19lYXJseVwiLFxuICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkhvdy5cIjogW3tcInllYXJcIjoxODQzLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODYwLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztmZWRlcmFsO3N1cHJlbWUuY291cnRcIl0sXG4gICAgICAgICAgICAgIFwibmFtZVwiOiBcIkhvd2FyZCdzIFN1cHJlbWUgQ291cnQgUmVwb3J0c1wiLFxuICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiVS5TLihIb3cuKVwiOiBcIkhvdy5cIn19XSxcbiAgICBcIkhvdy4gUHIuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJIb3cuIFByLlwiOiBbe1wieWVhclwiOjE4NDQsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTg4NiwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO255XCJdLFxuICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiSG93YXJkJ3MgUHJhY3RpY2UgUmVwb3J0c1wiLFxuICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkhvdy5QLlIuXCI6IFwiSG93LiBQci5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiSG93LlByYWMuKE4uWS4pXCI6IFwiSG93LiBQci5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTi5ZLlNwZWMuVGVybSBSLlwiOiBcIkhvdy4gUHIuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk4uWS5TcGVjLlRlcm0gUmVwLlwiOiBcIkhvdy4gUHIuXCJ9fV0sXG4gICAgXCJIb3dhcmRcIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJIb3dhcmRcIjogW3tcInllYXJcIjoxODM0LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTg0MywgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1czttc1wiXSxcbiAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJNaXNzaXNzaXBwaSBSZXBvcnRzLCBIb3dhcmRcIixcbiAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiSG93LlwiOiBcIkhvd2FyZFwiLCBcIk1pc3MuKEhvd2FyZClcIjogXCJIb3dhcmRcIn19XSxcbiAgICBcIkh1Z2hlc1wiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkh1Z2hlc1wiOiBbe1wieWVhclwiOjE3ODUsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODAxLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2t5XCJdLFxuICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIktlbnR1Y2t5IFJlcG9ydHMsIEh1Z2hlc1wiLFxuICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJIdWdoLlwiOiBcIkh1Z2hlc1wiLCBcIkt5LihIdWdoZXMpXCI6IFwiSHVnaGVzXCJ9fV0sXG4gICAgXCJIdW0uXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkh1bS5cIjogW3tcInllYXJcIjoxODM5LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODUxLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1czt0blwiXSxcbiAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiVGVubmVzc2VlIFJlcG9ydHMsIEh1bXBocmV5c1wiLFxuICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiSHVtcGguXCI6IFwiSHVtLlwiLCBcIlRlbm4uKEh1bS4pXCI6IFwiSHVtLlwifX1dLFxuICAgIFwiSS5ULlIuRC4gKEJOQSlcIjogW3tcImNpdGVfdHlwZVwiOiBcInNwZWNpYWx0eVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJJLlQuUi5ELiAoQk5BKVwiOiBbe1wieWVhclwiOjE5ODAsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1c1wiXSxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIkludGVybmF0aW9uYWwgVHJhZGUgUmVwb3J0ZXIgRGVjaXNpb25zXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge319XSxcbiAgICBcIklkYWhvXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJJZGFob1wiOiBbe1wieWVhclwiOjE5ODIsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztpZFwiXSxcbiAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIklkYWhvIFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJJZC5cIjogXCJJZGFob1wiLCBcIklkYS5cIjogXCJJZGFob1wifX1dLFxuICAgIFwiSWxsLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJJbGwuXCI6IFt7XCJ5ZWFyXCI6MTg0OSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJJbGwuIDJkXCI6IFt7XCJ5ZWFyXCI6MTg0OSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2lsXCJdLFxuICAgICAgICAgICAgICBcIm5hbWVcIjogXCJJbGxpbm9pcyBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJJbGwuMmRcIjogXCJJbGwuIDJkXCJ9fV0sXG4gICAgXCJJbGwuIEFwcC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJJbGwuIEFwcC5cIjogW3tcInllYXJcIjoxODc3LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIklsbC4gQXBwLiAyZFwiOiBbe1wieWVhclwiOjE4NzcsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiSWxsLiBBcHAuIDNkXCI6IFt7XCJ5ZWFyXCI6MTg3NywgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2lsXCJdLFxuICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIklsbGlub2lzIEFwcGVsbGF0ZSBDb3VydCBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIklsbC4gQXBwLjJkXCI6IFwiSWxsLiBBcHAuIDJkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJJbGwuIEFwcC4zZFwiOiBcIklsbC4gQXBwLiAzZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiSWxsLkEuXCI6IFwiSWxsLiBBcHAuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJJbGwuQS4yZFwiOiBcIklsbC4gQXBwLiAyZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiSWxsLkEuM2RcIjogXCJJbGwuIEFwcC4gM2RcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIklsbC5BcHAuXCI6IFwiSWxsLiBBcHAuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJJbGwuQXBwLjJkXCI6IFwiSWxsLiBBcHAuIDJkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJJbGwuQXBwLjNkXCI6IFwiSWxsLiBBcHAuIDNkXCJ9fV0sXG4gICAgXCJJbGwuIEN0LiBDbC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJJbGwuIEN0LiBDbC5cIjogW3tcInllYXJcIjoxODg5LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7aWxcIl0sXG4gICAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiSWxsaW5vaXMgQ291cnQgb2YgQ2xhaW1zIFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge319XSxcbiAgICBcIklsbC4gRGVjLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIklsbC4gRGVjLlwiOiBbe1wieWVhclwiOjE5NzYsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztpbFwiXSxcbiAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJXZXN0J3MgSWxsaW5vaXMgRGVjaXNpb25zXCIsXG4gICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIklsbC5EZWMuXCI6IFwiSWxsLiBEZWMuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJJbGwuRGVjcy5cIjogXCJJbGwuIERlYy5cIn19XSxcbiAgICBcIkluZC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiSW5kLlwiOiBbe1wieWVhclwiOjE4NDgsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE5ODEsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2luXCJdLFxuICAgICAgICAgICAgICBcIm5hbWVcIjogXCJJbmRpYW5hIFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkluZC5SZXAuXCI6IFwiSW5kLlwifX1dLFxuICAgIFwiSW5kLiBBcHAuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiSW5kLiBBcHAuXCI6IFt7XCJ5ZWFyXCI6MTg5MCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE5NzksIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7aW5cIl0sXG4gICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiSW5kaWFuYSBDb3VydCBvZiBBcHBlYWxzIFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge319XSxcbiAgICBcIkluZGlhbiBUZXJyLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkluZGlhbiBUZXJyLlwiOiBbe1wieWVhclwiOjE4OTYsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxOTA3LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO29rXCJdLFxuICAgICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIkluZGlhbiBUZXJyaXRvcnkgUmVwb3J0c1wiLFxuICAgICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiSW93YVwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJJb3dhXCI6IFt7XCJ5ZWFyXCI6MTg1NSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTk2OCwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7aWFcIl0sXG4gICAgICAgICAgICAgIFwibmFtZVwiOiBcIklvd2EgUmVwb3J0c1wiLFxuICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge319XSxcbiAgICBcIklyZWQuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJJcmVkLlwiOiBbe1wieWVhclwiOjE4NDAsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTg1MiwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO25jXCJdLFxuICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiTm9ydGggQ2Fyb2xpbmEgUmVwb3J0cywgSXJlZGVsbCdzIExhd1wiLFxuICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIklyZWQuTC5cIjogXCJJcmVkLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJJcmVkLkwuKE4uQy4pXCI6IFwiSXJlZC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTi5DLihJcmVkLilcIjogXCJJcmVkLlwifX1dLFxuICAgIFwiSXJlZC4gRXEuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiSXJlZC4gRXEuXCI6IFt7XCJ5ZWFyXCI6MTg0MCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4NTIsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bmNcIl0sXG4gICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiTm9ydGggQ2Fyb2xpbmEgUmVwb3J0cywgSXJlZGVsbCdzIEVxdWl0eVwiLFxuICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJJcmVkLlwiOiBcIklyZWQuIEVxLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiSXJlZC5FcS4oTi5DLilcIjogXCJJcmVkLiBFcS5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk4uQy4oSXJlZC5FcS4pXCI6IFwiSXJlZC4gRXEuXCJ9fV0sXG4gICAgXCJKLkouIE1hcnNoLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiSi5KLiBNYXJzaC5cIjogW3tcInllYXJcIjoxODI5LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4MzIsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztreVwiXSxcbiAgICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIktlbnR1Y2t5IFJlcG9ydHMsIE1hcnNoYWxsLCBKLkouXCIsXG4gICAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiSi5KLk1hci5cIjogXCJKLkouIE1hcnNoLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJKLkouTWFyc2guKEt5LilcIjogXCJKLkouIE1hcnNoLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJLeS4oSi5KLk1hcnNoLilcIjogXCJKLkouIE1hcnNoLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJNYXJzaC5cIjogXCJKLkouIE1hcnNoLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJNYXJzaC4oS3kuKVwiOiBcIkouSi4gTWFyc2guXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk1hcnNoLkouSi5cIjogXCJKLkouIE1hcnNoLlwifX1dLFxuICAgIFwiSm9obnMuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiSm9obnMuXCI6IFt7XCJ5ZWFyXCI6MTgwNiwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4MjMsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bnlcIl0sXG4gICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiSm9obnNvbidzIFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiSi5cIjogXCJKb2hucy5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkpvaG4uXCI6IFwiSm9obnMuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJKb2hucy5DdC5FcnIuXCI6IFwiSm9obnMuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJKb2hucy5OLlkuXCI6IFwiSm9obnMuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJKb2hucy5SZXAuXCI6IFwiSm9obnMuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJKb2huc29uXCI6IFwiSm9obnMuXCJ9fV0sXG4gICAgXCJKb2hucy4gQ2FzLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiSm9obnMuIENhcy5cIjogW3tcInllYXJcIjoxNzk5LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4MDMsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztueVwiXSxcbiAgICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIkpvaG5zb24ncyBDYXNlc1wiLFxuICAgICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkpvaG5zLkNhcy4oTi5ZLilcIjogXCJKb2hucy4gQ2FzLlwifX1dLFxuICAgIFwiSm9obnMuIENoLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJKb2hucy4gQ2guXCI6IFt7XCJ5ZWFyXCI6MTgxNCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTgyMywgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bnlcIl0sXG4gICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIkpvaG5zb25zJyBDaGFuY2VyeSBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJKLkNoLlwiOiBcIkpvaG5zLiBDaC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJKb2hucy5cIjogXCJKb2hucy4gQ2guXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiSm9obnMuKE4uWS4pXCI6IFwiSm9obnMuIENoLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkpvaG5zLkNoLihOLlkuKVwiOiBcIkpvaG5zLiBDaC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJKb2hucy5DaC5DYXMuXCI6IFwiSm9obnMuIENoLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkpvaG5zLlJlcC5cIjogXCJKb2hucy4gQ2guXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiSm9obnNvblwiOiBcIkpvaG5zLiBDaC5cIn19XSxcbiAgICBcIkpvbmVzXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJKb25lc1wiOiBbe1wieWVhclwiOjE4NTMsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTg2MiwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO25jXCJdLFxuICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiTm9ydGggQ2Fyb2xpbmEgUmVwb3J0cywgSm9uZXMnIExhd1wiLFxuICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkpvbmVzIEwuXCI6IFwiSm9uZXNcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiSm9uZXMgTi5DLlwiOiBcIkpvbmVzXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk4uQy4oSm9uZXMpXCI6IFwiSm9uZXNcIn19XSxcbiAgICBcIkpvbmVzIEVxLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkpvbmVzIEVxLlwiOiBbe1wieWVhclwiOjE4NTMsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODYzLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO25jXCJdLFxuICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIk5vcnRoIENhcm9saW5hIFJlcG9ydHMsIEpvbmVzJyBFcXVpdHlcIixcbiAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiSm9uZXNcIjogXCJKb25lcyBFcS5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk4uQy4oSm9uZXMgRXEuKVwiOiBcIkpvbmVzIEVxLlwifX1dLFxuICAgIFwiS2FuLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJLYW4uXCI6IFt7XCJ5ZWFyXCI6MTg2MiwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2tzXCJdLFxuICAgICAgICAgICAgICBcIm5hbWVcIjogXCJLYW5zYXMgUmVwb3J0c1wiLFxuICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiS2Fucy5cIjogXCJLYW4uXCJ9fV0sXG4gICAgXCJLYW4uIEFwcC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJLYW4uIEFwcC5cIjogW3tcInllYXJcIjoxODk1LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTkwMSwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiS2FuLiBBcHAuIDJkXCI6IFt7XCJ5ZWFyXCI6MTk3NywgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2tzXCJdLFxuICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIkthbnNhcyBDb3VydCBvZiBBcHBlYWxzIFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiS2FuLiBBcHAuMmRcIjogXCJLYW4uIEFwcC4gMmRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkthbi5BcHAuXCI6IFwiS2FuLiBBcHAuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJLYW4uQXBwLiAyZFwiOiBcIkthbi4gQXBwLiAyZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiS2FuLkFwcC4yZFwiOiBcIkthbi4gQXBwLiAyZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiS2Fucy5BcHAuXCI6IFwiS2FuLiBBcHAuXCJ9fV0sXG4gICAgXCJLaXJieVwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiS2lyYnlcIjogW3tcInllYXJcIjoxNzg1LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE3ODksIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztjdFwiXSxcbiAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIktpcmJ5J3MgQ29ubmVjdGljdXQgUmVwb3J0c1wiLFxuICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIktpci5cIjogXCJLaXJieVwiLCBcIktpcmIuXCI6IFwiS2lyYnlcIn19XSxcbiAgICBcIkt5LlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkt5LlwiOiBbe1wieWVhclwiOjE4NzksIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxOTUxLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2t5XCJdLFxuICAgICAgICAgICAgIFwibmFtZVwiOiBcIktlbnR1Y2t5IFJlcG9ydHNcIixcbiAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge319XSxcbiAgICBcIkt5LiBBcHAuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJLeS4gQXBwLlwiOiBbe1wieWVhclwiOjE5OTQsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MjAwMCwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2t5XCJdLFxuICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiS2VudHVja3kgQXBwZWxsYXRlIFJlcG9ydGVyXCIsXG4gICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge319XSxcbiAgICBcIkt5LiBMLiBScHRyLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkt5LiBMLiBScHRyLlwiOiBbe1wieWVhclwiOjE4ODAsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxOTA4LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2t5XCJdLFxuICAgICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIktlbnR1Y2t5IExhdyBSZXBvcnRlclwiLFxuICAgICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJLZW4uTC5SZS5cIjogXCJLeS4gTC4gUnB0ci5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkt5LkwuUi5cIjogXCJLeS4gTC4gUnB0ci5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkt5Lkxhdy5SZXAuXCI6IFwiS3kuIEwuIFJwdHIuXCJ9fV0sXG4gICAgXCJLeS4gTC4gU3VtbS5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJLeS4gTC4gU3VtbS5cIjogW3tcInllYXJcIjoxOTY2LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7a3lcIl0sXG4gICAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiS2VudHVja3kgTGF3IFN1bW1hcnlcIixcbiAgICAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge319XSxcbiAgICBcIkt5LiBPcC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiS3kuIE9wLlwiOiBbe1wieWVhclwiOjE4NjQsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4ODYsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2t5XCJdLFxuICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJLZW50dWNreSBPcGluaW9uc1wiLFxuICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiS2VuLk9waW4uXCI6IFwiS3kuIE9wLlwifX1dLFxuICAgIFwiTC4gRWQuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJmZWRcIixcbiAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkwuIEVkLlwiOiBbe1wieWVhclwiOjE3OTAsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxOTU2LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJMLiBFZC4gMmRcIjogW3tcInllYXJcIjoxOTU2LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7ZmVkZXJhbDtzdXByZW1lLmNvdXJ0XCJdLFxuICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIkxhd3llcidzIEVkaXRpb25cIixcbiAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiTCBFZFwiOiBcIkwuIEVkLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTCBFZCAyZFwiOiBcIkwuIEVkLiAyZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTC4gRWQuMmRcIjogXCJMLiBFZC4gMmRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkwuRS5cIjogXCJMLiBFZC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkwuRS4yZFwiOiBcIkwuIEVkLiAyZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTC5FZC5cIjogXCJMLiBFZC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkwuRWQuIDJkXCI6IFwiTC4gRWQuIDJkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJMLkVkLihVLlMuKVwiOiBcIkwuIEVkLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTC5FZC4yZFwiOiBcIkwuIEVkLiAyZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTEFXIEVEXCI6IFwiTC4gRWQuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJMYXcuRWQuXCI6IFwiTC4gRWQuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJVLlMuTC5FZC5cIjogXCJMLiBFZC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlUuUy5MLkVkLjJkXCI6IFwiTC4gRWQuIDJkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJVLlMuTGF3LkVkLlwiOiBcIkwuIEVkLlwifX1dLFxuICAgIFwiTEFcIjogW3tcImNpdGVfdHlwZVwiOiBcIm5ldXRyYWxcIixcbiAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiTEFcIjogW3tcInllYXJcIjoxNzUwLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bGFcIl0sXG4gICAgICAgICAgICBcIm5hbWVcIjogXCJMb3Vpc2lhbmEgTmV1dHJhbCBDaXRhdGlvblwiLFxuICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fV0sXG4gICAgXCJMYS5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJMYS5cIjogW3tcInllYXJcIjoxODMwLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTk3MiwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztsYVwiXSxcbiAgICAgICAgICAgICBcIm5hbWVcIjogXCJMb3Vpc2lhbmEgUmVwb3J0c1wiLFxuICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiTGEuIEFubi5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkxhLiBBbm4uXCI6IFt7XCJ5ZWFyXCI6MTg0NiwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxOTAwLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bGFcIl0sXG4gICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJMb3Vpc2lhbmEgQW5udWFsIFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiTGEuIEFwcC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkxhLiBBcHAuXCI6IFt7XCJ5ZWFyXCI6MTkyNCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxOTMyLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bGFcIl0sXG4gICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJMb3Vpc2lhbmEgQ291cnQgb2YgQXBwZWFscyBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiTGEuQS5cIjogXCJMYS4gQXBwLlwifX1dLFxuICAgIFwiTGFucy5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkxhbnMuXCI6IFt7XCJ5ZWFyXCI6MTg2OSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODczLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bnlcIl0sXG4gICAgICAgICAgICAgICBcIm5hbWVcIjogXCJMYW5zaW5nJ3MgUmVwb3J0c1wiLFxuICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fV0sXG4gICAgXCJMYW5zLiBDaC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJMYW5zLiBDaC5cIjogW3tcInllYXJcIjoxODI0LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTgyNiwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztueVwiXSxcbiAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJMYW5zaW5nJ3MgQ2hhbmNlcnkgUmVwb3J0c1wiLFxuICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJMLlwiOiBcIkxhbnMuIENoLlwiLCBcIkxhbnMuXCI6IFwiTGFucy4gQ2guXCJ9fV0sXG4gICAgXCJMRVhJU1wiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3BlY2lhbHR5XCIsXG4gICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkxFWElTXCI6IFt7XCJ5ZWFyXCI6MTc1MCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2N0XCIsXCJ1cztkZVwiLFwidXM7ZGNcIixcInVzO21lXCIsXCJ1cztuaFwiLFwidXM7bmpcIixcInVzO3BhXCIsXCJ1cztyaVwiLFwidXM7dnRcIixcInVzO2lsXCIsXCJ1cztpblwiLFwidXM7bWFcIixcInVzO255XCIsXCJ1cztvaFwiLFwidXM7aWFcIixcInVzO21pXCIsXCJ1czttblwiLFwidXM7bmVcIixcInVzO25kXCIsXCJ1cztzZFwiLFwidXM7d2lcIixcInVzO2FrXCIsXCJ1czthelwiLFwidXM7Y2FcIixcInVzO2NvXCIsXCJ1cztoaVwiLFwidXM7aWRcIixcInVzO2tzXCIsXCJ1czttdFwiLFwidXM7bnZcIixcInVzO25tXCIsXCJ1cztva1wiLFwidXM7b3JcIixcInVzO3V0XCIsXCJ1czt3YVwiLFwidXM7d3lcIixcInVzO2dhXCIsXCJ1cztuY1wiLFwidXM7c2NcIixcInVzO3ZhXCIsXCJ1czt3dlwiLFwidXM7YXJcIixcInVzO2t5XCIsXCJ1czttb1wiLFwidXM7dG5cIixcInVzO3R4XCIsXCJ1czthbFwiLFwidXM7ZmxcIixcInVzO2xhXCIsXCJ1czttc1wiLFwidXM7ZmVkZXJhbDsxLWNpclwiLFwidXM7ZmVkZXJhbDsyLWNpclwiLFwidXM7ZmVkZXJhbDszLWNpclwiLFwidXM7ZmVkZXJhbDs0LWNpclwiLFwidXM7ZmVkZXJhbDs1LWNpclwiLFwidXM7ZmVkZXJhbDs2LWNpclwiLFwidXM7ZmVkZXJhbDs3LWNpclwiLFwidXM7ZmVkZXJhbDs4LWNpclwiLFwidXM7ZmVkZXJhbDs5LWNpclwiLFwidXM7ZmVkZXJhbDsxMC1jaXJcIixcInVzO2ZlZGVyYWw7MTEtY2lyXCJdLFxuICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiTGV4aXMgTmV4dXMgQ2l0YXRpb25cIixcbiAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiTGVpZ2hcIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIkxlaWdoXCI6IFt7XCJ5ZWFyXCI6MTgyOSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODQyLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7dmFcIl0sXG4gICAgICAgICAgICAgICBcIm5hbWVcIjogXCJWaXJnaW5pYSBSZXBvcnRzLCBMZWlnaFwiLFxuICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkxlaWdoIChWYS4pXCI6IFwiTGVpZ2hcIiwgXCJWYS4oTGVpZ2gpXCI6IFwiTGVpZ2hcIn19XSxcbiAgICBcIkxpdHQuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJMaXR0LlwiOiBbe1wieWVhclwiOjE4MjIsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTgyNCwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2t5XCJdLFxuICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiS2VudHVja3kgUmVwb3J0cywgTGl0dGVsbFwiLFxuICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkt5LihMaXR0LilcIjogXCJMaXR0LlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJMaXQuXCI6IFwiTGl0dC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTGl0dC4oS3kuKVwiOiBcIkxpdHQuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkxpdHRlbGxcIjogXCJMaXR0LlwifX1dLFxuICAgIFwiTGl0dC4gU2VsLiBDYXMuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiTGl0dC4gU2VsLiBDYXMuXCI6IFt7XCJ5ZWFyXCI6MTc5NSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4MjEsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7a3lcIl0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiS2VudHVja3kgUmVwb3J0cywgTGl0dGVsbCdzIFNlbGVjdGVkIENhc2VzXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkt5LihMaXQuU2VsLkNhcy4pXCI6IFwiTGl0dC4gU2VsLiBDYXMuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJMaXQuU2VsLkNhLlwiOiBcIkxpdHQuIFNlbC4gQ2FzLlwifX1dLFxuICAgIFwiTG9jay4gUmV2LiBDYXMuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiTG9jay4gUmV2LiBDYXMuXCI6IFt7XCJ5ZWFyXCI6MTc5OSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4NDcsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bnlcIl0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiTG9ja3dvb2QncyBSZXZlcnNlZCBDYXNlc1wiLFxuICAgICAgICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiTS5KLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3BlY2lhbHR5XCIsXG4gICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiTS5KLlwiOiBbe1wieWVhclwiOjE5NzUsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1c1wiXSxcbiAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiTWlsaXRhcnkgSnVzdGljZSBSZXBvcnRlclwiLFxuICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiTS4gSi5cIjogXCJNLkouXCJ9fV0sXG4gICAgXCJNRVwiOiBbe1wiY2l0ZV90eXBlXCI6IFwibmV1dHJhbFwiLFxuICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJNRVwiOiBbe1wieWVhclwiOjE3NTAsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1czttZVwiXSxcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIk1haW5lIE5ldXRyYWwgQ2l0YXRpb25cIixcbiAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiTVNcIjogW3tcImNpdGVfdHlwZVwiOiBcIm5ldXRyYWxcIixcbiAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiTVNcIjogW3tcInllYXJcIjoxNzUwLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bXNcIl0sXG4gICAgICAgICAgICBcIm5hbWVcIjogXCJNaXNzaXNzaXBwaSBOZXV0cmFsIENpdGF0aW9uXCIsXG4gICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge319XSxcbiAgICBcIk1UXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJuZXV0cmFsXCIsXG4gICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIk1UXCI6IFt7XCJ5ZWFyXCI6MTc1MCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO210XCJdLFxuICAgICAgICAgICAgXCJuYW1lXCI6IFwiTW9udGFuYSBOZXV0cmFsIENpdGF0aW9uXCIsXG4gICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge319XSxcbiAgICBcIk1hY0FydGguXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJNYWNBcnRoLlwiOiBbe1wieWVhclwiOjE4NzMsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTg3OSwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2RjXCJdLFxuICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiRGlzdHJpY3Qgb2YgQ29sdW1iaWEgUmVwb3J0cywgTWFjQXJ0aHVyXCIsXG4gICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiRC5DLihNYWNBcnRoLilcIjogXCJNYWNBcnRoLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJNYWNBci5cIjogXCJNYWNBcnRoLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJNYWNBcnRodXJcIjogXCJNYWNBcnRoLlwifX1dLFxuICAgIFwiTWFjQXJ0aC4gJiBNLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJNYWNBcnRoLiAmIE0uXCI6IFt7XCJ5ZWFyXCI6MTg3OSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTg4MCwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7ZGNcIl0sXG4gICAgICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIkRpc3RyaWN0IG9mIENvbHVtYmlhIFJlcG9ydHMsIE1hY0FydGh1ciBhbmQgTWFja2V5XCIsXG4gICAgICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJELkMuKE1hY0FydGguJiBNLilcIjogXCJNYWNBcnRoLiAmIE0uXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTWFjQXIuJiBNLlwiOiBcIk1hY0FydGguICYgTS5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJNYWNBci4mIE1hY2tleVwiOiBcIk1hY0FydGguICYgTS5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJNYWNBcnRoLiYgTS4oRGlzdC5Db2wuKVwiOiBcIk1hY0FydGguICYgTS5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJNYWNBcnRodXIgJiBNLlwiOiBcIk1hY0FydGguICYgTS5cIn19XSxcbiAgICBcIk1hY2tleVwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIk1hY2tleVwiOiBbe1wieWVhclwiOjE4NjMsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODkyLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2RjXCJdLFxuICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIkRpc3RyaWN0IG9mIENvbHVtYmlhIFJlcG9ydHMsIE1hY2tleVwiLFxuICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJELkMuKE1hY2tleSlcIjogXCJNYWNrZXlcIn19XSxcbiAgICBcIk1hcnQuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJNYXJ0LlwiOiBbe1wieWVhclwiOjE4MDksIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTgzMCwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2xhXCJdLFxuICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiTG91aXNpYW5hIFJlcG9ydHMsIE1hcnRpblwiLFxuICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fSxcbiAgICAgICAgICAgICAge1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiTWFydC5cIjogW3tcInllYXJcIjoxNzc4LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE3OTcsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztuY1wiXSxcbiAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIk5vcnRoIENhcm9saW5hIFJlcG9ydHMsIE1hcnRpblwiLFxuICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIk1hcnQuRGVjLlwiOiBcIk1hcnQuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk1hcnQuTi5DLlwiOiBcIk1hcnQuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk1hcnRpblwiOiBcIk1hcnQuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk4uQy4oTWFydC4pXCI6IFwiTWFydC5cIn19XSxcbiAgICBcIk1hcnQuICYgWWVyLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIk1hcnQuICYgWWVyLlwiOiBbe1wieWVhclwiOjE4MjUsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODI4LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3RuXCJdLFxuICAgICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIlRlbm5lc3NlZSBSZXBvcnRzLCBNYXJ0aW4gJiBZZXJnZXJcIixcbiAgICAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiTS4mIFkuXCI6IFwiTWFydC4gJiBZZXIuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJNLiYgWS5SLlwiOiBcIk1hcnQuICYgWWVyLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTWFydC4mIFkuXCI6IFwiTWFydC4gJiBZZXIuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJNYXJ0LiYgWS4oVGVubi4pXCI6IFwiTWFydC4gJiBZZXIuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJNYXJ0LiYgWWVyZy5cIjogXCJNYXJ0LiAmIFllci5cIn19XSxcbiAgICBcIk1hcnZlbFwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIk1hcnZlbFwiOiBbe1wieWVhclwiOjE4OTMsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODk3LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2RlXCJdLFxuICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIkRlbGF3YXJlIFJlcG9ydHMsIE1hcnZlbFwiLFxuICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiTWFzcy5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIk1hc3MuXCI6IFt7XCJ5ZWFyXCI6MTg2NywgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO21hXCJdLFxuICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiTWFzc2FjaHVzZXR0cyBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiTWEuXCI6IFwiTWFzcy5cIiwgXCJNYXMuXCI6IFwiTWFzcy5cIn19XSxcbiAgICBcIk1hc3MuIEFwcC4gQ3QuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJNYXNzLiBBcHAuIEN0LlwiOiBbe1wieWVhclwiOjE5NzIsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1czttYVwiXSxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIk1hc3NhY2h1c2V0dHMgQXBwZWFscyBDb3VydCBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiTWEuQS5cIjogXCJNYXNzLiBBcHAuIEN0LlwifX1dLFxuICAgIFwiTWFzcy4gQXBwLiBEZWMuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiTWFzcy4gQXBwLiBEZWMuXCI6IFt7XCJ5ZWFyXCI6MTk0MSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE5NzcsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bWFcIl0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiTWFzc2FjaHVzZXR0cyBBcHBlbGxhdGUgRGVjaXNpb25zXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fV0sXG4gICAgXCJNYXNzLiBBcHAuIERpdi5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJNYXNzLiBBcHAuIERpdi5cIjogW3tcInllYXJcIjoxOTM2LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bWFcIl0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiUmVwb3J0cyBvZiBNYXNzYWNodXNldHRzIEFwcGVsbGF0ZSBEaXZpc2lvblwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiTWFzcy4gU3VwcC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIk1hc3MuIFN1cHAuXCI6IFt7XCJ5ZWFyXCI6MTk4MCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxOTgzLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bWFcIl0sXG4gICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJNYXNzYWNodXNldHRzIFJlcG9ydHMgU3VwcGxlbWVudFwiLFxuICAgICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fV0sXG4gICAgXCJNY0NhaG9uXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIk1jQ2Fob25cIjogW3tcInllYXJcIjoxODU4LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODY4LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztrc1wiXSxcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiS2Fuc2FzIFJlcG9ydHMsIE1jQ2Fob25cIixcbiAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIk1jQ2FoLlwiOiBcIk1jQ2Fob25cIn19XSxcbiAgICBcIk1jQ29yZFwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIk1jQ29yZFwiOiBbe1wieWVhclwiOjE4MjEsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODI4LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3NjXCJdLFxuICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIlNvdXRoIENhcm9saW5hIFJlcG9ydHMsIE1jQ29yZFwiLFxuICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJTLkMuTC4oTWNDb3JkKVwiOiBcIk1jQ29yZFwifX1dLFxuICAgIFwiTWNDb3JkIEVxLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJNY0NvcmQgRXEuXCI6IFt7XCJ5ZWFyXCI6MTgyNSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTgyNywgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7c2NcIl0sXG4gICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIlNvdXRoIENhcm9saW5hIFJlcG9ydHMsIE1jQ29yZCdzIENoYW5jZXJ5XCIsXG4gICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJNY0NvcmQgQ2guXCI6IFwiTWNDb3JkIEVxLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlMuQy5MLihNY0NvcmQgRXEuKVwiOiBcIk1jQ29yZCBFcS5cIn19XSxcbiAgICBcIk1jR2wuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJNY0dsLlwiOiBbe1wieWVhclwiOjE4ODEsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTg4NCwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2xhXCJdLFxuICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiTG91aXNpYW5hIENvdXJ0IG9mIEFwcGVhbHMgUmVwb3J0cywgTWNHbG9pblwiLFxuICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIk1jR2xvaW5cIjogXCJNY0dsLlwifX1dLFxuICAgIFwiTWNNdWwuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiTWNNdWwuXCI6IFt7XCJ5ZWFyXCI6MTg0MCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4NDIsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7c2NcIl0sXG4gICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiU291dGggQ2Fyb2xpbmEgUmVwb3J0cywgTWNNdWxsZW5cIixcbiAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiTWNNdWwuTC4oUy5DLilcIjogXCJNY011bC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlMuQy5MLihNY011bC4pXCI6IFwiTWNNdWwuXCJ9fV0sXG4gICAgXCJNY011bC4gRXEuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIk1jTXVsLiBFcS5cIjogW3tcInllYXJcIjoxODQwLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODQyLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztzY1wiXSxcbiAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiU291dGggQ2Fyb2xpbmEgUmVwb3J0cywgTWNNdWxsZW4ncyBFcXVpdHlcIixcbiAgICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIk1jTXVsLkVxLihTLkMuKVwiOiBcIk1jTXVsLiBFcS5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJTLkMuTC4oTWNNdWxsYW4gRXEuKVwiOiBcIk1jTXVsLiBFcS5cIn19XSxcbiAgICBcIk1kLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIk1kLlwiOiBbe1wieWVhclwiOjE4NTEsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1czttZFwiXSxcbiAgICAgICAgICAgICBcIm5hbWVcIjogXCJNYXJ5bGFuZCBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIk1hcnlsYW5kXCI6IFwiTWQuXCJ9fV0sXG4gICAgXCJNZC4gQXBwLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiTWQuIEFwcC5cIjogW3tcInllYXJcIjoxOTY3LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bWRcIl0sXG4gICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJNYXJ5bGFuZCBBcHBlbGxhdGUgUmVwb3J0c1wiLFxuICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fV0sXG4gICAgXCJNZS5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJNZS5cIjogW3tcInllYXJcIjoxODIwLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTk2NSwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1czttZVwiXSxcbiAgICAgICAgICAgICBcIm5hbWVcIjogXCJNYWluZSBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIk1haS5cIjogXCJNZS5cIiwgXCJNYWluZVwiOiBcIk1lLlwifX1dLFxuICAgIFwiTWVpZ3NcIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIk1laWdzXCI6IFt7XCJ5ZWFyXCI6MTgzOCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODM5LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7dG5cIl0sXG4gICAgICAgICAgICAgICBcIm5hbWVcIjogXCJUZW5uZXNzZWUgUmVwb3J0cywgTWVpZ3NcIixcbiAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJUZW5uLihNZWlncylcIjogXCJNZWlnc1wifX1dLFxuICAgIFwiTWV0LlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJNZXQuXCI6IFt7XCJ5ZWFyXCI6MTg1OCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTg2MywgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7a3lcIl0sXG4gICAgICAgICAgICAgIFwibmFtZVwiOiBcIktlbnR1Y2t5IFJlcG9ydHMsIE1ldGNhbGZcIixcbiAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkt5LihNZXQuKVwiOiBcIk1ldC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJNZXRjLlwiOiBcIk1ldC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJNZXRjLkt5LlwiOiBcIk1ldC5cIn19LFxuICAgICAgICAgICAgIHtcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiTWV0LlwiOiBbe1wieWVhclwiOjE4NDAsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4NDcsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO21hXCJdLFxuICAgICAgICAgICAgICBcIm5hbWVcIjogXCJNYXNzYWNodXNldHRzIFJlcG9ydHMsIE1ldGNhbGZcIixcbiAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIk1hc3MuKE1ldC4pXCI6IFwiTWV0LlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk1ldGMuXCI6IFwiTWV0LlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk1ldGMuTWFzcy5cIjogXCJNZXQuXCJ9fV0sXG4gICAgXCJNaWNoLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiTWljaC5cIjogW3tcInllYXJcIjoxODQ3LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bWlcIl0sXG4gICAgICAgICAgICAgICBcIm5hbWVcIjogXCJNaWNoaWdhbiBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiTWljaC5cIjogXCJNaWNoLlwifX1dLFxuICAgIFwiTWljaC4gQXBwLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJNaWNoLiBBcHAuXCI6IFt7XCJ5ZWFyXCI6MTk2NSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO21pXCJdLFxuICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJNaWNoaWdhbiBBcHBlYWxzIFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fV0sXG4gICAgXCJNaWNoLiBDdC4gQ2wuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIk1pY2guIEN0LiBDbC5cIjogW3tcInllYXJcIjoxOTM4LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxOTQyLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1czttaVwiXSxcbiAgICAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiTWljaGlnYW4gQ291cnQgb2YgQ2xhaW1zIFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fV0sXG4gICAgXCJNaWxsXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIk1pbGxcIjogW3tcInllYXJcIjoxODE3LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODE4LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztzY1wiXSxcbiAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiU291dGggQ2Fyb2xpbmEgUmVwb3J0cywgTWlsbCAoQ29uc3RpdHV0aW9uYWwpXCIsXG4gICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJDb25zdC5cIjogXCJNaWxsXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQ29uc3QuUy5DLlwiOiBcIk1pbGxcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJNaWxsIENvbnN0LlwiOiBcIk1pbGxcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJNaWxsIENvbnN0LihTLkMuKVwiOiBcIk1pbGxcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJTLkMuTC4oTWlsbClcIjogXCJNaWxsXCJ9fV0sXG4gICAgXCJNaW5uLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiTWlubi5cIjogW3tcInllYXJcIjoxODUxLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE5NzcsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1czttblwiXSxcbiAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIk1pbm5lc290YSBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiTWluLlwiOiBcIk1pbm4uXCJ9fV0sXG4gICAgXCJNaW5vclwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiTWlub3JcIjogW3tcInllYXJcIjoxODIwLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4MjYsIFwibW9udGhcIjowLCBcImRheVwiOjF9XX0sXG4gICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7YWxcIl0sXG4gICAgICAgICAgICAgICBcIm5hbWVcIjogXCJNaW5vcidzIEFsYWJhbWEgUmVwb3J0c1wiLFxuICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIk1pbi5cIjogXCJNaW5vclwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJNaW5vciAoQWxhLilcIjogXCJNaW5vclwifX1dLFxuICAgIFwiTWlzYy5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIk1pc2MuXCI6IFt7XCJ5ZWFyXCI6MTg5MiwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxOTU1LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk1pc2MuIDJkXCI6IFt7XCJ5ZWFyXCI6MTk1NSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoyMDA0LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk1pc2MuIDNkXCI6IFt7XCJ5ZWFyXCI6MjAwNCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO255XCJdLFxuICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiTmV3IFlvcmsgTWlzY2VsbGFuZW91cyBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiTWlzYyAyZFwiOiBcIk1pc2MuIDJkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk1pc2MgM2RcIjogXCJNaXNjLiAzZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJNaXNjLjJkXCI6IFwiTWlzYy4gMmRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTWlzYy4zZFwiOiBcIk1pc2MuIDNkXCJ9fV0sXG4gICAgXCJNaXNzLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiTWlzcy5cIjogW3tcInllYXJcIjoxODUxLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE5NjYsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1czttc1wiXSxcbiAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIk1pc3Npc3NpcHBpIFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJNaXMuXCI6IFwiTWlzcy5cIn19XSxcbiAgICBcIk1vLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIk1vLlwiOiBbe1wieWVhclwiOjE4MjEsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxOTU2LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO21vXCJdLFxuICAgICAgICAgICAgIFwibmFtZVwiOiBcIk1pc3NvdXJpIFJlcG9ydHNcIixcbiAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge319XSxcbiAgICBcIk1vLiBBcHAuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJNby4gQXBwLlwiOiBbe1wieWVhclwiOjE4NzYsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTk1NCwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO21vXCJdLFxuICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiTWlzc291cmkgQXBwZWFscyBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiTW8uQXBwLlJlcC5cIjogXCJNby4gQXBwLlwifX1dLFxuICAgIFwiTW9uYWcuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiTW9uYWcuXCI6IFt7XCJ5ZWFyXCI6MTg4OCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4OTAsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7cGFcIl0sXG4gICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiUGVubnN5bHZhbmlhIFN0YXRlIFJlcG9ydHMsIE1vbmFnaGFuXCIsXG4gICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIk1vbi5cIjogXCJNb25hZy5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk1vbmEuXCI6IFwiTW9uYWcuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJNb25hZ2hhblwiOiBcIk1vbmFnLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTW9uYWdoYW4oUGEuKVwiOiBcIk1vbmFnLlwifX1dLFxuICAgIFwiTW9udC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIk1vbnQuXCI6IFt7XCJ5ZWFyXCI6MTg2OCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO210XCJdLFxuICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiTW9udGFuYSBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiTW9udC5cIjogXCJNb250LlwifX1dLFxuICAgIFwiTW9ycmlzXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiTW9ycmlzXCI6IFt7XCJ5ZWFyXCI6MTgzOSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4NDYsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7aWFcIl0sXG4gICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiSW93YSBSZXBvcnRzLCBNb3JyaXNcIixcbiAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiTW9yLklhLlwiOiBcIk1vcnJpc1wiLCBcIk1vcnIuXCI6IFwiTW9ycmlzXCJ9fV0sXG4gICAgXCJNdW5mLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiTXVuZi5cIjogW3tcInllYXJcIjoxODEwLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4MjAsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1czt2YVwiXSxcbiAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIlZpcmdpbmlhIFJlcG9ydHMsIE11bmZvcmRcIixcbiAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiTXVyLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJNdXIuXCI6IFt7XCJ5ZWFyXCI6MTgwNCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTgxOSwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bmNcIl0sXG4gICAgICAgICAgICAgIFwibmFtZVwiOiBcIk5vcnRoIENhcm9saW5hIFJlcG9ydHMsIE11cnBoZXlcIixcbiAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIk11cnBoLlwiOiBcIk11ci5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJNdXJwaC4oTi5DLilcIjogXCJNdXIuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTi5DLihNdXIuKVwiOiBcIk11ci5cIn19XSxcbiAgICBcIk4uIENoaXAuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJOLiBDaGlwLlwiOiBbe1wieWVhclwiOjE3ODksIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTc5MSwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3Z0XCJdLFxuICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiVmVybW9udCBSZXBvcnRzLCBDaGlwbWFuLCBOLlwiLFxuICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkNoaXAuTi5cIjogXCJOLiBDaGlwLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJOLkNoaXAuKFZ0LilcIjogXCJOLiBDaGlwLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJOLkNoaXBtLlwiOiBcIk4uIENoaXAuXCJ9fV0sXG4gICAgXCJOLiBNYXIuIEkuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIk4uIE1hci4gSS5cIjogW3tcInllYXJcIjoxOTg5LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bXBcIl0sXG4gICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIk5vcnRoZXJuIE1hcmlhbmEgSXNsYW5kcyBSZXBvcnRlclwiLFxuICAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge319XSxcbiAgICBcIk4uIE1hci4gSS4gQ29tbXcuIFJwdHIuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJOLiBNYXIuIEkuIENvbW13LiBScHRyLlwiOiBbe1wieWVhclwiOjE5NzksIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1czttcFwiXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIk5vcnRoZXJuIE1hcmlhbmEgSXNsYW5kcyBDb21tb253ZWFsdGggUmVwb3J0ZXJcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiTi5DLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJOLkMuXCI6IFt7XCJ5ZWFyXCI6MTg2OCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO25jXCJdLFxuICAgICAgICAgICAgICBcIm5hbWVcIjogXCJOb3J0aCBDYXJvbGluYSBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiTi5DLiBBcHAuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiTi5DLiBBcHAuXCI6IFt7XCJ5ZWFyXCI6MTk2OCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO25jXCJdLFxuICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIk5vcnRoIENhcm9saW5hIENvdXJ0IG9mIEFwcGVhbHMgUmVwb3J0c1wiLFxuICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiTi5ELlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJOLkQuXCI6IFt7XCJ5ZWFyXCI6MTg5MCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTk1MywgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bmRcIl0sXG4gICAgICAgICAgICAgIFwibmFtZVwiOiBcIk5vcnRoIERha290YSBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiTi5FLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVfcmVnaW9uYWxcIixcbiAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJOLkUuXCI6IFt7XCJ5ZWFyXCI6MTg4NCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTkzNiwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBcIk4uRS4yZFwiOiBbe1wieWVhclwiOjE5MzYsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2lsXCIsXCJ1cztpblwiLFwidXM7bWFcIixcInVzO255XCIsXCJ1cztvaFwiXSxcbiAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiTm9ydGggRWFzdGVybiBSZXBvcnRlclwiLFxuICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiTi4gRS5cIjogXCJOLkUuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTi4gRS4gMmRcIjogXCJOLkUuMmRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJOLiBFLjJkXCI6IFwiTi5FLjJkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTi5FLiAyZFwiOiBcIk4uRS4yZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk4uRS5SZXAuXCI6IFwiTi5FLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk5FXCI6IFwiTi5FLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk5FIDJkXCI6IFwiTi5FLjJkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTm8uRWFzdCBSZXAuXCI6IFwiTi5FLlwifX1dLFxuICAgIFwiTi5ILlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJOLkguXCI6IFt7XCJ5ZWFyXCI6MTgxNiwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO25oXCJdLFxuICAgICAgICAgICAgICBcIm5hbWVcIjogXCJOZXcgSGFtcHNoaXJlIFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIk4uSC5SLlwiOiBcIk4uSC5cIn19XSxcbiAgICBcIk4uSi5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiTi5KLlwiOiBbe1wieWVhclwiOjE5NDgsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztualwiXSxcbiAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiTmV3IEplcnNleSBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiTi5KLiBBZG1pbi5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIk4uSi4gQWRtaW4uXCI6IFt7XCJ5ZWFyXCI6MTk4MiwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJOLkouIEFkbWluLiAyZFwiOiBbe1wieWVhclwiOjE5ODIsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztualwiXSxcbiAgICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIk5ldyBKZXJzZXkgQWRtaW5pc3RyYXRpdmUgUmVwb3J0c1wiLFxuICAgICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fV0sXG4gICAgXCJOLkouIEVxLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiTi5KLiBFcS5cIjogW3tcInllYXJcIjoxODMwLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE5NDgsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztualwiXSxcbiAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIk5ldyBKZXJzZXkgRXF1aXR5IFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiTi5KLiBNaXNjLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJOLkouIE1pc2MuXCI6IFt7XCJ5ZWFyXCI6MTkyMywgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTk0OSwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bmpcIl0sXG4gICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIk5ldyBKZXJzZXkgTWlzY2VsbGFuZW91cyBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJOLkouTS5cIjogXCJOLkouIE1pc2MuXCIsIFwiTkpNXCI6IFwiTi5KLiBNaXNjLlwifX1dLFxuICAgIFwiTi5KLiBTdXBlci5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIk4uSi4gU3VwZXIuXCI6IFt7XCJ5ZWFyXCI6MTk0OCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO25qXCJdLFxuICAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiTmV3IEplcnNleSBTdXBlcmlvciBDb3VydCBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiTi5KLlMuXCI6IFwiTi5KLiBTdXBlci5cIn19XSxcbiAgICBcIk4uSi4gVGF4XCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJOLkouIFRheC5cIjogW3tcInllYXJcIjoxOTc5LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO25qXCJdLFxuICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiTmV3IEplcnNleSBUYXggQ291cnRcIixcbiAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiTi5KLkwuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiTi5KLkwuXCI6IFt7XCJ5ZWFyXCI6MTc5MCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE5NDgsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bmpcIl0sXG4gICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiTmV3IEplcnNleSBMYXcgUmVwb3J0c1wiLFxuICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJOLkouTGF3XCI6IFwiTi5KLkwuXCJ9fV0sXG4gICAgXCJOLk0uXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIk4uTS5cIjogW3tcInllYXJcIjoxODkwLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bm1cIl0sXG4gICAgICAgICAgICAgIFwibmFtZVwiOiBcIk5ldyBNZXhpY28gUmVwb3J0c1wiLFxuICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge319XSxcbiAgICBcIk4uVy5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlX3JlZ2lvbmFsXCIsXG4gICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiTi5XLlwiOiBbe1wieWVhclwiOjE4ODAsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE5NDIsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJOLlcuMmRcIjogW3tcInllYXJcIjoxOTQyLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztpYVwiLFwidXM7bWlcIixcInVzO21uXCIsXCJ1cztuZVwiLFwidXM7bmRcIixcInVzO3NkXCIsXCJ1czt3aVwiXSxcbiAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiTm9ydGggV2VzdGVybiBSZXBvcnRlclwiLFxuICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiTi4gVy5cIjogXCJOLlcuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTi4gVy4gMmRcIjogXCJOLlcuMmRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJOLiBXLjJkXCI6IFwiTi5XLjJkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTi5XLiAyZFwiOiBcIk4uVy4yZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk5XXCI6IFwiTi5XLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk5XIDJkXCI6IFwiTi5XLjJkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTm8uV2VzdCBSZXAuXCI6IFwiTi5XLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk5vcnRody5SZXAuXCI6IFwiTi5XLlwifX1dLFxuICAgIFwiTi5ZLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJOLlkuXCI6IFt7XCJ5ZWFyXCI6MTg0NywgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTk1NiwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBcIk4uWS4yZFwiOiBbe1wieWVhclwiOjE5NTYsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MjAwNCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX1dLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJOLlkuM2RcIjogW3tcInllYXJcIjoyMDA0LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztueVwiXSxcbiAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiTmV3IFlvcmsgUmVwb3J0c1wiLFxuICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiTi4gWS5cIjogXCJOLlkuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTi5ZLiAyZFwiOiBcIk4uWS4yZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk4uWS4gM2RcIjogXCJOLlkuM2RcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJOWSAyZFwiOiBcIk4uWS4yZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk5ZIDNkXCI6IFwiTi5ZLjNkXCJ9fV0sXG4gICAgXCJOLlkuIENoLiBBbm4uXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIk4uWS4gQ2guIEFubi5cIjogW3tcInllYXJcIjoxODE0LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODQ3LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztueVwiXSxcbiAgICAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiTmV3IFlvcmsgQ2hhbmNlcnkgUmVwb3J0cyBBbm5vdGF0ZWRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIk4uWS5DaC5SLkFubi5cIjogXCJOLlkuIENoLiBBbm4uXCJ9fV0sXG4gICAgXCJOLlkuIFN1cC4gQ3QuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIk4uWS4gU3VwLiBDdC5cIjogW3tcInllYXJcIjoxODczLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODk2LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztueVwiXSxcbiAgICAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiU3VwcmVtZSBDb3VydCBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJOLlkuU3Vwci5DdC5cIjogXCJOLlkuIFN1cC4gQ3QuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTi5ZLlN1cHJtLkN0LlwiOiBcIk4uWS4gU3VwLiBDdC5cIn19XSxcbiAgICBcIk4uWS5TLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIk4uWS5TLlwiOiBbe1wieWVhclwiOjE4ODgsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxOTM3LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJOLlkuUy4yZFwiOiBbe1wieWVhclwiOjE5MzgsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJOLlkuUy4zZFwiOiBbe1wieWVhclwiOjE5MzgsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO255XCJdLFxuICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIk5ldyBZb3JrIFN1cHBsZW1lbnRcIixcbiAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiTi5ZLlMuIDJkXCI6IFwiTi5ZLlMuMmRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk4uWS5TLiAzZFwiOiBcIk4uWS5TLjNkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJOWVNcIjogXCJOLlkuUy5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk5ZUyAyZFwiOiBcIk4uWS5TLjJkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJOWVMgM2RcIjogXCJOLlkuUy4zZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTmV3IFlvcmsgU3VwcC5cIjogXCJOLlkuUy5cIn19XSxcbiAgICBcIk5EXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJuZXV0cmFsXCIsXG4gICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIk5EXCI6IFt7XCJ5ZWFyXCI6MTc1MCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO25kXCJdLFxuICAgICAgICAgICAgXCJuYW1lXCI6IFwiTm9ydGggRGFrb3RhIE5ldXRyYWwgQ2l0YXRpb25cIixcbiAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiTkQgQXBwXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJuZXV0cmFsXCIsXG4gICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJORCBBcHBcIjogW3tcInllYXJcIjoxNzUwLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bmRcIl0sXG4gICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiTm9ydGggRGFrb3RhIE5ldXRyYWwgQ2l0YXRpb24sIENvdXJ0IG9mIEFwcGVhbHNcIixcbiAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge319XSxcbiAgICBcIk5NXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJuZXV0cmFsXCIsXG4gICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIk5NXCI6IFt7XCJ5ZWFyXCI6MTc1MCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO25tXCJdLFxuICAgICAgICAgICAgXCJuYW1lXCI6IFwiTmV3IE1leGljbyBOZXV0cmFsIENpdGF0aW9uXCIsXG4gICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge319XSxcbiAgICBcIk5NQ0FcIjogW3tcImNpdGVfdHlwZVwiOiBcIm5ldXRyYWxcIixcbiAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJOTUNBXCI6IFt7XCJ5ZWFyXCI6MTc1MCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO25tXCJdLFxuICAgICAgICAgICAgICBcIm5hbWVcIjogXCJOZXcgTWV4aWNvIE5ldXRyYWwgQ2l0YXRpb24gKENvdXJ0IG9mIEFwcGVhbHMpXCIsXG4gICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiTk1DRVJUXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJuZXV0cmFsXCIsXG4gICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJOTUNFUlRcIjogW3tcInllYXJcIjoxNzUwLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bm1cIl0sXG4gICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiTmV3IE1leGljbyBOZXV0cmFsIENpdGF0aW9uXCIsXG4gICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fV0sXG4gICAgXCJOTVNDXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJuZXV0cmFsXCIsXG4gICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiTk1TQ1wiOiBbe1wieWVhclwiOjE3NTAsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztubVwiXSxcbiAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiTmV3IE1leGljbyBOZXV0cmFsIENpdGF0aW9uIChTdXByZW1lIENvdXJ0KVwiLFxuICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge319XSxcbiAgICBcIk5ZIFNsaXAgT3BcIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiTlkgU2xpcCBPcFwiOiBbe1wieWVhclwiOjE3NTAsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztueVwiXSxcbiAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiTmV3IFlvcmsgU2xpcCBPcGluaW9uXCIsXG4gICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiTmF2YWpvIFJwdHIuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJmZWRcIixcbiAgICAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIk5hdmFqbyBScHRyLlwiOiBbe1wieWVhclwiOjE5NjksIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1c1wiXSxcbiAgICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJOYXZham8gUmVwb3J0ZXJcIixcbiAgICAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge319XSxcbiAgICBcIk5lYi5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiTmViLlwiOiBbe1wieWVhclwiOjE4NjAsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztuZVwiXSxcbiAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiTmVicmFza2EgUmVwb3J0c1wiLFxuICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge319XSxcbiAgICBcIk5lYi4gQ3QuIEFwcC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiTmViLiBDdC4gQXBwLlwiOiBbe1wieWVhclwiOjE5MjIsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztuZVwiXSxcbiAgICAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiTmVicmFza2EgQ291cnQgb2YgQXBwZWFscyBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJOZWIuIEFwcC5cIjogXCJOZWIuIEN0LiBBcHAuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTmViLkFwcC5SLlwiOiBcIk5lYi4gQ3QuIEFwcC5cIn19XSxcbiAgICBcIk5ldi5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiTmV2LlwiOiBbe1wieWVhclwiOjE4NjUsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztudlwiXSxcbiAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiTmV2YWRhIFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fV0sXG4gICAgXCJOZXYuIEFkdi4gT3AuIE5vLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiTmV2LiBBZHYuIE9wLiBOby5cIjogW3tcInllYXJcIjoxNzUwLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bnZcIl0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJOZXZhZGEgQWR2YW5jZWQgT3BpbmlvblwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fV0sXG4gICAgXCJOb3R0ICYgTWNDLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiTm90dCAmIE1jQy5cIjogW3tcInllYXJcIjoxODE3LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4MjAsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztzY1wiXSxcbiAgICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIlNvdXRoIENhcm9saW5hIFJlcG9ydHMsIE5vdHQgYW5kIE1jQ29yZFwiLFxuICAgICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIk4uJiBNYy5cIjogXCJOb3R0ICYgTWNDLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJOb3R0ICYgTSdDLihTLkMuKVwiOiBcIk5vdHQgJiBNY0MuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk5vdHQgJiBNY0MuXCI6IFwiTm90dCAmIE1jQy5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiUy5DLkwuKE5vdHQgJiBNY0MuKVwiOiBcIk5vdHQgJiBNY0MuXCJ9fV0sXG4gICAgXCJPSFwiOiBbe1wiY2l0ZV90eXBlXCI6IFwibmV1dHJhbFwiLFxuICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJPSFwiOiBbe1wieWVhclwiOjE3NTAsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztvaFwiXSxcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIk9oaW8gTmV1dHJhbCBDaXRhdGlvblwiLFxuICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIi1PaGlvLVwiOiBcIk9IXCJ9fV0sXG4gICAgXCJPS1wiOiBbe1wiY2l0ZV90eXBlXCI6IFwibmV1dHJhbFwiLFxuICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJPS1wiOiBbe1wieWVhclwiOjE3NTAsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztva1wiXSxcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIk9rbGFob21hIE5ldXRyYWwgQ2l0YXRpb25cIixcbiAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiT0sgQ0lWIEFQUFwiOiBbe1wiY2l0ZV90eXBlXCI6IFwibmV1dHJhbFwiLFxuICAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIk9LIENJViBBUFBcIjogW3tcInllYXJcIjoxNzUwLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7b2tcIl0sXG4gICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIk9rbGFob21hIE5ldXRyYWwgQ2l0YXRpb24gKENpdmljIEFwcGVhbHMpXCIsXG4gICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiT0sgQ1JcIjogW3tcImNpdGVfdHlwZVwiOiBcIm5ldXRyYWxcIixcbiAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiT0sgQ1JcIjogW3tcInllYXJcIjoxNzUwLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7b2tcIl0sXG4gICAgICAgICAgICAgICBcIm5hbWVcIjogXCJPa2xhaG9tYSBOZXV0cmFsIENpdGF0aW9uXCIsXG4gICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge319XSxcbiAgICBcIk9oaW9cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiT2hpb1wiOiBbe1wieWVhclwiOjE4MjEsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4NTEsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO29oXCJdLFxuICAgICAgICAgICAgICBcIm5hbWVcIjogXCJPaGlvIFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fV0sXG4gICAgXCJPaGlvIEFwcC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJPaGlvIEFwcC5cIjogW3tcInllYXJcIjoxOTEzLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk9oaW8gQXBwLiAyZFwiOiBbe1wieWVhclwiOjE5MTMsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiT2hpbyBBcHAuIDNkXCI6IFt7XCJ5ZWFyXCI6MTkxMywgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO29oXCJdLFxuICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIk9oaW8gQXBwZWxsYXRlIFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiQXBwLlwiOiBcIk9oaW8gQXBwLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTy5BLlIuXCI6IFwiT2hpbyBBcHAuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJPLkEuUi4yZFwiOiBcIk9oaW8gQXBwLiAyZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTy5BLlIuM2RcIjogXCJPaGlvIEFwcC4gM2RcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk8uQXBwLlwiOiBcIk9oaW8gQXBwLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTy5BcHAuMmRcIjogXCJPaGlvIEFwcC4gMmRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk8uQXBwLjNkXCI6IFwiT2hpbyBBcHAuIDNkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJPaC5BLlwiOiBcIk9oaW8gQXBwLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiT2guQS4yZFwiOiBcIk9oaW8gQXBwLiAyZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiT2guQXBwLjNkXCI6IFwiT2hpbyBBcHAuIDNkXCJ9fV0sXG4gICAgXCJPaGlvIEFwcC4gVW5yZXAuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIk9oaW8gQXBwLiBVbnJlcC5cIjogW3tcInllYXJcIjoxOTkwLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxOTkwLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztvaFwiXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiVW5yZXBvcnRlZCBPaGlvIEFwcGVsbGF0ZSBDYXNlcyAoQW5kZXJzb24pXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiT2hpbyBCLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJPaGlvIEIuXCI6IFt7XCJ5ZWFyXCI6MTk4MiwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTk4NywgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7b2hcIl0sXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIk9oaW8gQmFyIFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fV0sXG4gICAgXCJPaGlvIEMuQy5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJPaGlvIEMuQy5cIjogW3tcInllYXJcIjoxODg1LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTkwMSwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiT2hpbyBDLkMuIChuLnMuKVwiOiBbe1wieWVhclwiOjE5MDEsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTkyMiwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztvaFwiXSxcbiAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJPaGlvIENpcmN1aXQgQ291cnQgUmVwb3J0c1wiLFxuICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJPLkMuQy5OLlMuXCI6IFwiT2hpbyBDLkMuIChuLnMuKVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiT2guQ2lyLkN0LlwiOiBcIk9oaW8gQy5DLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiT2guQ2lyLkN0Lk4uUy5cIjogXCJPaGlvIEMuQy4gKG4ucy4pXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJPaGlvIEMuQy5OLlMuXCI6IFwiT2hpbyBDLkMuIChuLnMuKVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiT2hpbyBDLkMuUi5cIjogXCJPaGlvIEMuQy5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk9oaW8gQy5DLlIuTi5TLlwiOiBcIk9oaW8gQy5DLiAobi5zLilcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk9oaW8gQ2lyLkN0LlwiOiBcIk9oaW8gQy5DLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiT2hpbyBDaXIuQ3QuKE4uUy4pXCI6IFwiT2hpbyBDLkMuIChuLnMuKVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiT2hpbyBDaXIuQ3QuUi5OLlMuXCI6IFwiT2hpbyBDLkMuIChuLnMuKVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiT2hpbyBDci5DdC5SLlwiOiBcIk9oaW8gQy5DLlwifX1dLFxuICAgIFwiT2hpbyBDLkMuIERlYy5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIk9oaW8gQy5DLiBEZWMuXCI6IFt7XCJ5ZWFyXCI6MTkwMSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxOTIzLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7b2hcIl0sXG4gICAgICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJPaGlvIENpcmN1aXQgQ291cnQgRGVjaXNpb25zXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiTy5DLkMuXCI6IFwiT2hpbyBDLkMuIERlYy5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiT2hpbyBDaXIuQ3QuXCI6IFwiT2hpbyBDLkMuIERlYy5cIn19XSxcbiAgICBcIk9oaW8gQ2lyLiBEZWMuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJPaGlvIENpci4gRGVjLlwiOiBbe1wieWVhclwiOjE4ODUsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTkwMSwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO29oXCJdLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiT2hpbyBDaXJjdWl0IERlY2lzaW9uc1wiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIk8uQy5ELlwiOiBcIk9oaW8gQ2lyLiBEZWMuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk9oLkNpci5EZWMuXCI6IFwiT2hpbyBDaXIuIERlYy5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiT2hpbyBDLkQuXCI6IFwiT2hpbyBDaXIuIERlYy5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiT2hpbyBDLkRlYy5cIjogXCJPaGlvIENpci4gRGVjLlwifX1dLFxuICAgIFwiT2hpbyBEZWMuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiT2hpbyBEZWMuXCI6IFt7XCJ5ZWFyXCI6MTg5NCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE5MjAsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7b2hcIl0sXG4gICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiT2hpbyBEZWNpc2lvbnNcIixcbiAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiTy5ELlwiOiBcIk9oaW8gRGVjLlwiLCBcIk9oLkRlYy5cIjogXCJPaGlvIERlYy5cIn19XSxcbiAgICBcIk9oaW8gRGVjLiBSZXByaW50XCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJPaGlvIERlYy4gUmVwcmludFwiOiBbe1wieWVhclwiOjE4NDAsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTg3MywgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO29oXCJdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiT2hpbyBEZWNpc2lvbnMsIFJlcHJpbnRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJPLkRlYy5SZXAuXCI6IFwiT2hpbyBEZWMuIFJlcHJpbnRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiT2guRGVjLihSZXByaW50KVwiOiBcIk9oaW8gRGVjLiBSZXByaW50XCJ9fV0sXG4gICAgXCJPaGlvIExhdy4gQWJzLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiT2hpbyBMYXcuIEFicy5cIjogW3tcInllYXJcIjoxOTIyLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE5NjQsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztvaFwiXSxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIk9oaW8gTGF3IEFic3RyYWN0c1wiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIk8uTC5BLlwiOiBcIk9oaW8gTGF3LiBBYnMuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk8uTC5BYnMuXCI6IFwiT2hpbyBMYXcuIEFicy5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiT2hpbyBBYnMuXCI6IFwiT2hpbyBMYXcuIEFicy5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiT2hpbyBMLkFicy5cIjogXCJPaGlvIExhdy4gQWJzLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJPaGlvIExhdyBBYnN0LlwiOiBcIk9oaW8gTGF3LiBBYnMuXCJ9fV0sXG4gICAgXCJPaGlvIE1pc2MuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIk9oaW8gTWlzYy5cIjogW3tcInllYXJcIjoxOTYyLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk9oaW8gTWlzYy4gMmRcIjogW3tcInllYXJcIjoxOTYyLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7b2hcIl0sXG4gICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIk9oaW8gTWlzY2VsbGFuZW91c1wiLFxuICAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiTy5NaXNjLlwiOiBcIk9oaW8gTWlzYy5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJPLk1pc2MuMmRcIjogXCJPaGlvIE1pc2MuIDJkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiT2hpbyBNaXNjLkRlYy5cIjogXCJPaGlvIE1pc2MuXCJ9fV0sXG4gICAgXCJPaGlvIE4uUC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJPaGlvIE4uUC5cIjogW3tcInllYXJcIjoxODk0LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTkzNCwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiT2hpbyBOLlAuIChuLnMuKVwiOiBbe1wieWVhclwiOjE4OTQsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTkzNCwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztvaFwiXSxcbiAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJPaGlvIE5pc2kgUHJpdXMgUmVwb3J0c1wiLFxuICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJPLk4uUC5cIjogXCJPaGlvIE4uUC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk8uTi5QLk4uUy5cIjogXCJPaGlvIE4uUC4gKG4ucy4pXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJPaC5OLlAuXCI6IFwiT2hpbyBOLlAuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJPaC5OLlAuKE4uUykuXCI6IFwiT2hpbyBOLlAuIChuLnMuKVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiT2hpbyBOLlAuTi5TLlwiOiBcIk9oaW8gTi5QLiAobi5zLilcIn19XSxcbiAgICBcIk9oaW8gT3AuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJPaGlvIE9wLlwiOiBbe1wieWVhclwiOjE5MzQsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTk4MiwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJPaGlvIE9wLiAyZFwiOiBbe1wieWVhclwiOjE5MzQsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTk4MiwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJPaGlvIE9wLiAzZFwiOiBbe1wieWVhclwiOjE5MzQsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTk4MiwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO29oXCJdLFxuICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiT2hpbyBPcGluaW9uc1wiLFxuICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIk8uTy5cIjogXCJPaGlvIE9wLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJPaGlvIE9wLjJkXCI6IFwiT2hpbyBPcC4gMmRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiT2hpbyBPcC4zZFwiOiBcIk9oaW8gT3AuIDNkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk9oaW8gT3BzLlwiOiBcIk9oaW8gT3AuXCJ9fV0sXG4gICAgXCJPaGlvIFN0LlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiT2hpbyBTdC5cIjogW3tcInllYXJcIjoxODQwLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE5NjQsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiT2hpbyBTdC4gMmRcIjogW3tcInllYXJcIjoxOTY1LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE5OTEsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiT2hpbyBTdC4gM2RcIjogW3tcInllYXJcIjoxOTkxLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7b2hcIl0sXG4gICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJPaGlvIFN0YXRlIFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJPLlMuXCI6IFwiT2hpbyBTdC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTy5TLjJkXCI6IFwiT2hpbyBTdC4gMmRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTy5TLjNkXCI6IFwiT2hpbyBTdC4gM2RcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiT2guU3QuXCI6IFwiT2hpbyBTdC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiT2hpbyBTdC4yZFwiOiBcIk9oaW8gU3QuIDJkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk9oaW8gU3QuM2RcIjogXCJPaGlvIFN0LiAzZFwifX1dLFxuICAgIFwiT2tsYS5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIk9rbGEuXCI6IFt7XCJ5ZWFyXCI6MTg5MCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxOTUzLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7b2tcIl0sXG4gICAgICAgICAgICAgICBcIm5hbWVcIjogXCJPa2xhaG9tYSBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge319XSxcbiAgICBcIk9rbGEuIENyaW0uXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJPa2xhLiBDcmltLlwiOiBbe1wieWVhclwiOjE5MDgsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTk1MywgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO29rXCJdLFxuICAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiT2tsYWhvbWEgQ3JpbWluYWwgUmVwb3J0c1wiLFxuICAgICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIk8uQ3IuXCI6IFwiT2tsYS4gQ3JpbS5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiT2tsLkNyLlwiOiBcIk9rbGEuIENyaW0uXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk9rbGEuXCI6IFwiT2tsYS4gQ3JpbS5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiT2tsYS5Dci5cIjogXCJPa2xhLiBDcmltLlwifX1dLFxuICAgIFwiT3IuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiT3IuXCI6IFt7XCJ5ZWFyXCI6MTg1MywgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO29yXCJdLFxuICAgICAgICAgICAgIFwibmFtZVwiOiBcIk9yZWdvbiBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIk8uXCI6IFwiT3IuXCJ9fV0sXG4gICAgXCJPci4gQXBwLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiT3IuIEFwcC5cIjogW3tcInllYXJcIjoxOTY5LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7b3JcIl0sXG4gICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJPcmVnb24gUmVwb3J0cywgQ291cnQgb2YgQXBwZWFsc1wiLFxuICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIk9yLkEuXCI6IFwiT3IuIEFwcC5cIiwgXCJPcmUuIEFwcC5cIjogXCJPci4gQXBwLlwiLCBcIk9yZS5BcHAuXCI6IFwiT3IuIEFwcC5cIn19XSxcbiAgICBcIk9yLiBUYXhcIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiT3IuIFRheFwiOiBbe1wieWVhclwiOjE5NjIsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztvclwiXSxcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiT3JlZ29uIFRheCBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiT3ZlcnQuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiT3ZlcnQuXCI6IFt7XCJ5ZWFyXCI6MTc5MSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4MTYsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7dG5cIl0sXG4gICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiVGVubmVzc2VlIFJlcG9ydHMsIE92ZXJ0b25cIixcbiAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiVGVubi4oT3ZlcnQuKVwiOiBcIk92ZXJ0LlwifX1dLFxuICAgIFwiUC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlX3JlZ2lvbmFsXCIsXG4gICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIlAuXCI6IFt7XCJ5ZWFyXCI6MTg4MywgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxOTMxLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XSxcbiAgICAgICAgICAgICAgICAgICAgICAgICBcIlAuMmRcIjogW3tcInllYXJcIjoxOTMxLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MjAwMCwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgXCJQLjNkXCI6IFt7XCJ5ZWFyXCI6MjAwMCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7YWtcIixcInVzO2F6XCIsXCJ1cztjYVwiLFwidXM7Y29cIixcInVzO2hpXCIsXCJ1cztpZFwiLFwidXM7a3NcIixcInVzO210XCIsXCJ1cztudlwiLFwidXM7bm1cIixcInVzO29rXCIsXCJ1cztvclwiLFwidXM7dXRcIixcInVzO3dhXCIsXCJ1czt3eVwiXSxcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIlBhY2lmaWMgUmVwb3J0ZXJcIixcbiAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJQXCI6IFwiUC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiUCAyZFwiOiBcIlAuMmRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiUCAzZFwiOiBcIlAuM2RcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiUC4gMmRcIjogXCJQLjJkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBcIlAuIDNkXCI6IFwiUC4zZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJQLlIuXCI6IFwiUC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiUGFjLlwiOiBcIlAuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBcIlBhYy5SLlwiOiBcIlAuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBcIlBhYy5SZXAuXCI6IFwiUC5cIn19XSxcbiAgICBcIlAuUi4gRGVjLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIlAuUi4gRGVjLlwiOiBbe1wieWVhclwiOjE4OTksIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztwclwiXSxcbiAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJEZWNpc2lvbmVzIGRlIFB1ZXJ0byBSaWNvXCIsXG4gICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fV0sXG4gICAgXCJQLlIuIE9mZmljLiBUcmFucy5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJQLlIuIE9mZmljLiBUcmFucy5cIjogW3tcInllYXJcIjoxOTc4LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7cHJcIl0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiT2ZmaWNpYWwgVHJhbnNsYXRpb25zIG9mIHRoZSBPcGluaW9ucyBvZiB0aGUgU3VwcmVtZSBDb3VydCBvZiBQdWVydG8gUmljb1wiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiUC5SLiBTZW50LlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJQLlIuIFNlbnQuXCI6IFt7XCJ5ZWFyXCI6MTg5OSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTkwMiwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7cHJcIl0sXG4gICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIlNlbnRlbmNpYXMgZGVsIFRyaWJ1bmFsIFN1cHJlbW8gZGUgUHVlcnRvIFJpY29cIixcbiAgICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fV0sXG4gICAgXCJQLlIuUi5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJQLlIuUi5cIjogW3tcInllYXJcIjoxODk5LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTk3OCwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztwclwiXSxcbiAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJQdWVydG8gUmljbyBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIlAuUi5cIjogXCJQLlIuUi5cIiwgXCJQdWVydG8gUmljb1wiOiBcIlAuUi5SLlwifX1dLFxuICAgIFwiUEFcIjogW3tcImNpdGVfdHlwZVwiOiBcIm5ldXRyYWxcIixcbiAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiUEFcIjogW3tcInllYXJcIjoxNzUwLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7cGFcIl0sXG4gICAgICAgICAgICBcIm5hbWVcIjogXCJQZW5uc3lsdmFuaWEgTmV1dHJhbCBDaXRhdGlvblwiLFxuICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fV0sXG4gICAgXCJQYS5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJQYS5cIjogW3tcInllYXJcIjoxODQ1LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7cGFcIl0sXG4gICAgICAgICAgICAgXCJuYW1lXCI6IFwiUGVubnN5bHZhbmlhIFN0YXRlIFJlcG9ydHNcIixcbiAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiUC5TLlIuXCI6IFwiUGEuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJQYS5SZXAuXCI6IFwiUGEuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJQYS5TdC5cIjogXCJQYS5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlBhLlN0YXRlXCI6IFwiUGEuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJQZW5uLlwiOiBcIlBhLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiUGVubi5SZXAuXCI6IFwiUGEuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJQZW5uLlN0LlwiOiBcIlBhLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiUGVubi5TdC5SLlwiOiBcIlBhLlwifX1dLFxuICAgIFwiUGEuIEMuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiUGEuIEMuXCI6IFt7XCJ5ZWFyXCI6MTg3MCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE5MjEsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7cGFcIl0sXG4gICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiUGVubnN5bHZhbmlhIENvdW50eSBDb3VydCBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIlAuQy5SLlwiOiBcIlBhLiBDLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiUGEuQy5DLlwiOiBcIlBhLiBDLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiUGEuQ28uQ3QuXCI6IFwiUGEuIEMuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJQYS5Dby5DdC5SLlwiOiBcIlBhLiBDLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiUGEuQ291bnR5IEN0LlwiOiBcIlBhLiBDLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiUGVubi5Dby5DdC5SZXAuXCI6IFwiUGEuIEMuXCJ9fV0sXG4gICAgXCJQYS4gQ29tbXcuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIlBhLiBDb21tdy5cIjogW3tcInllYXJcIjoxOTcwLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxOTk0LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztwYVwiXSxcbiAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiUGVubnN5bHZhbmlhIENvbW1vbndlYWx0aCBDb3VydFwiLFxuICAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiUGEuIENvbW1vbndlYWx0aCBDdC5cIjogXCJQYS4gQ29tbXcuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiUGEuQy5cIjogXCJQYS4gQ29tbXcuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiUGEuQ29tbXcuQ3QuXCI6IFwiUGEuIENvbW13LlwifX1dLFxuICAgIFwiUGEuIEQuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiUGEuIEQuXCI6IFt7XCJ5ZWFyXCI6MTg5MiwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE5MjEsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7cGFcIl0sXG4gICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiUGVubnN5bHZhbmlhIERpc3RyaWN0IFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiRGlzdC5SZXAuXCI6IFwiUGEuIEQuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJQYS5EaXN0LlwiOiBcIlBhLiBELlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiUGEuRGlzdC5SLlwiOiBcIlBhLiBELlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiUGVubi5EaXN0LlJlcC5cIjogXCJQYS4gRC5cIn19XSxcbiAgICBcIlBhLiBELiAmIEMuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJQYS4gRC4gJiBDLlwiOiBbe1wieWVhclwiOjE5MjEsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiUGEuIEQuICYgQy4yZFwiOiBbe1wieWVhclwiOjE5MjEsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJQYS4gRC4gJiBDLjNkXCI6IFt7XCJ5ZWFyXCI6MTkyMSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlBhLiBELiAmIEMuNHRoXCI6IFt7XCJ5ZWFyXCI6MTkyMSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3BhXCJdLFxuICAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiUGVubnN5bHZhbmlhIERpc3RyaWN0IGFuZCBDb3VudHkgUmVwb3J0c1wiLFxuICAgICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIlBhLkRpc3QuJiBDLlJlcC5cIjogXCJQYS4gRC4gJiBDLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJQYS5EaXN0LiYgQ28uXCI6IFwiUGEuIEQuICYgQy5cIn19XSxcbiAgICBcIlBhLiBTdXBlci5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiUGEuIFN1cGVyLlwiOiBbe1wieWVhclwiOjE4OTUsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztwYVwiXSxcbiAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiUGVubnN5bHZhbmlhIFN1cGVyaW9yIENvdXJ0IFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIlBhLiBTdXBlcmlvciBDdC5cIjogXCJQYS4gU3VwZXIuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiUGEuUy5cIjogXCJQYS4gU3VwZXIuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiUGEuU3VwZXIuQ3QuXCI6IFwiUGEuIFN1cGVyLlwifX1dLFxuICAgIFwiUGFpZ2UgQ2guXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiUGFpZ2UgQ2guXCI6IFt7XCJ5ZWFyXCI6MTgyOCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4NDUsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bnlcIl0sXG4gICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiUGFpZ2UncyBDaGFuY2VyeSBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIlBhaS5cIjogXCJQYWlnZSBDaC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlBhaS5DaC5cIjogXCJQYWlnZSBDaC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlBhaWdlXCI6IFwiUGFpZ2UgQ2guXCJ9fV0sXG4gICAgXCJQZWNrXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIlBlY2tcIjogW3tcInllYXJcIjoxODIxLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODI0LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1czt0blwiXSxcbiAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiVGVubmVzc2VlIFJlcG9ydHMsIFBlY2tcIixcbiAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIlBlY2sgKFRlbm4uKVwiOiBcIlBlY2tcIiwgXCJUZW5uLihQZWNrKVwiOiBcIlBlY2tcIn19XSxcbiAgICBcIlBlbHQuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJQZWx0LlwiOiBbe1wieWVhclwiOjE5MTcsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTkyNCwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2xhXCJdLFxuICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiUGVsdGllcidzIE9waW5pb25zLCBQYXJpc2ggYXQgT3JsZWFuc1wiLFxuICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fV0sXG4gICAgXCJQZW4uICYgVy5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJQZW4uICYgVy5cIjogW3tcInllYXJcIjoxODI5LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTgzMiwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztwYVwiXSxcbiAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJQZW5uc3lsdmFuaWEgU3RhdGUgUmVwb3J0cywgUGVucm9zZSBhbmQgV2F0dHNcIixcbiAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiUC4mIFcuXCI6IFwiUGVuLiAmIFcuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJQLlIuXCI6IFwiUGVuLiAmIFcuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJQZW5yLiYgVy5cIjogXCJQZW4uICYgVy5cIn19XSxcbiAgICBcIlBlbm5ld2lsbFwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIlBlbm5ld2lsbFwiOiBbe1wieWVhclwiOjE4OTcsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxOTA5LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2RlXCJdLFxuICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIkRlbGF3YXJlIFJlcG9ydHMsIFBlbm5ld2lsbFwiLFxuICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiUGVubnlwLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJQZW5ueXAuXCI6IFt7XCJ5ZWFyXCI6MTg4MSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTg4NCwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7cGFcIl0sXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIlBlbm5zeWx2YW5pYSBTdGF0ZSBSZXBvcnRzLCBQZW5ueXBhY2tlclwiLFxuICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiUGVubi5cIjogXCJQZW5ueXAuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiUGVubnkuXCI6IFwiUGVubnlwLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlBlbm55cC4oUGEuKVwiOiBcIlBlbm55cC5cIn19XSxcbiAgICBcIlBldC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInNjb3R1c19lYXJseVwiLFxuICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIlBldC5cIjogW3tcInllYXJcIjoxODI4LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODQyLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztmZWRlcmFsO3N1cHJlbWUuY291cnRcIl0sXG4gICAgICAgICAgICAgIFwibmFtZVwiOiBcIlBldGVycycgU3VwcmVtZSBDb3VydCBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJQZXQuUy5DLlwiOiBcIlBldC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJQZXRlcnNcIjogXCJQZXQuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiVS5TLihQZXQuKVwiOiBcIlBldC5cIn19XSxcbiAgICBcIlBoaWwuIEVxLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIlBoaWwuIEVxLlwiOiBbe1wieWVhclwiOjE4NjYsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODY4LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO25jXCJdLFxuICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIk5vcnRoIENhcm9saW5hIFJlcG9ydHMsIFBoaWxpcHMnIEVxdWl0eTxcIixcbiAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiTi5DLihQaGlsLkVxLilcIjogXCJQaGlsLiBFcS5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlBoaWwuXCI6IFwiUGhpbC4gRXEuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJQaGlsLkVxLihOLkMuKVwiOiBcIlBoaWwuIEVxLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiUGhpbGwuXCI6IFwiUGhpbC4gRXEuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJQaGlsbGlwc1wiOiBcIlBoaWwuIEVxLlwifX1dLFxuICAgIFwiUGhpbC4gTGF3XCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiUGhpbC4gTGF3XCI6IFt7XCJ5ZWFyXCI6MTg2NiwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4NjgsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bmNcIl0sXG4gICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiTm9ydGggQ2Fyb2xpbmEgUmVwb3J0cywgUGhpbGlwcycgTGF3XCIsXG4gICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIk4uQy4oUGhpbC5MYXcpXCI6IFwiUGhpbC4gTGF3XCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJQaGlsLlwiOiBcIlBoaWwuIExhd1wiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiUGhpbC5OLkMuXCI6IFwiUGhpbC4gTGF3XCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJQaGlsbC5cIjogXCJQaGlsLiBMYXdcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlBoaWxsLkwuKE4uQy4pXCI6IFwiUGhpbC4gTGF3XCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJQaGlsbGlwc1wiOiBcIlBoaWwuIExhd1wifX1dLFxuICAgIFwiUGljay5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIlBpY2suXCI6IFt7XCJ5ZWFyXCI6MTgyMiwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODM5LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bWFcIl0sXG4gICAgICAgICAgICAgICBcIm5hbWVcIjogXCJNYXNzYWNodXNldHRzIFJlcG9ydHMsIFBpY2tlcmluZ1wiLFxuICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIk1hc3MuKFBpY2suKVwiOiBcIlBpY2suXCIsIFwiUGljay4oTWFzcy4pXCI6IFwiUGljay5cIn19XSxcbiAgICBcIlBpbi5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiUGluLlwiOiBbe1wieWVhclwiOjE4MzksIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4NTIsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3dpXCJdLFxuICAgICAgICAgICAgICBcIm5hbWVcIjogXCJXaXNjb25zaW4gUmVwb3J0cywgUGlubmV5XCIsXG4gICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJQaW5uLlwiOiBcIlBpbi5cIn19XSxcbiAgICBcIlBvcnQuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJQb3J0LlwiOiBbe1wieWVhclwiOjE4MzQsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTgzOSwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2FsXCJdLFxuICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiQWxhYmFtYSBSZXBvcnRzLCBQb3J0ZXJcIixcbiAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJQb3J0LihBbGEuKVwiOiBcIlBvcnQuXCIsIFwiUG9ydGVyXCI6IFwiUG9ydC5cIn19XSxcbiAgICBcIlIuSS5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiUi5JLlwiOiBbe1wieWVhclwiOjE4MjgsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE5ODAsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3JpXCJdLFxuICAgICAgICAgICAgICBcIm5hbWVcIjogXCJSaG9kZSBJc2xhbmQgUmVwb3J0c1wiLFxuICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge319XSxcbiAgICBcIlJhbmQuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJSYW5kLlwiOiBbe1wieWVhclwiOjE4MjEsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTgyOCwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3ZhXCJdLFxuICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiVmlyZ2luaWEgUmVwb3J0cywgUmFuZG9scGhcIixcbiAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJWYS4oUmFuZC4pXCI6IFwiUmFuZC5cIn19XSxcbiAgICBcIlJhd2xlXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJSYXdsZVwiOiBbe1wieWVhclwiOjE4MjgsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTgzNSwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3BhXCJdLFxuICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiUGVubnN5bHZhbmlhIFN0YXRlIFJlcG9ydHMsIFJhd2xlXCIsXG4gICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiUGEuIFJhd2xlXCI6IFwiUmF3bGVcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiUi5cIjogXCJSYXdsZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJSYXcuXCI6IFwiUmF3bGVcIn19XSxcbiAgICBcIlJpY2VcIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiUmljZVwiOiBbe1wieWVhclwiOjE4MzgsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4MzksIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3NjXCJdLFxuICAgICAgICAgICAgICBcIm5hbWVcIjogXCJTb3V0aCBDYXJvbGluYSBSZXBvcnRzLCBSaWNlXCIsXG4gICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJSaWNlIEwuKFMuQy4pXCI6IFwiUmljZVwiLCBcIlMuQy5MLihSaWNlKVwiOiBcIlJpY2VcIn19XSxcbiAgICBcIlJpY2UgRXEuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJSaWNlIEVxLlwiOiBbe1wieWVhclwiOjE4MzgsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTgzOSwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3NjXCJdLFxuICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiU291dGggQ2Fyb2xpbmEgUmVwb3J0cywgUmljZSdzIEVxdWl0eVwiLFxuICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIlJpY2UgQ2guXCI6IFwiUmljZSBFcS5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiUy5DLkVxLihSaWNlLkVxLilcIjogXCJSaWNlIEVxLlwifX1dLFxuICAgIFwiUmljaC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIlJpY2guXCI6IFt7XCJ5ZWFyXCI6MTg0NiwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODY4LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7c2NcIl0sXG4gICAgICAgICAgICAgICBcIm5hbWVcIjogXCJTb3V0aCBDYXJvbGluYSBSZXBvcnRzLCBSaWNoYXJkc29uXCIsXG4gICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiUmljaC5MLihTLkMuKVwiOiBcIlJpY2guXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlJpY2guTGF3KFMuQy4pXCI6IFwiUmljaC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiUy5DLkwuKFJpY2guKVwiOiBcIlJpY2guXCJ9fV0sXG4gICAgXCJSaWNoLiBDYXMuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIlJpY2guIENhcy5cIjogW3tcInllYXJcIjoxODMxLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODMyLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztzY1wiXSxcbiAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiU291dGggQ2Fyb2xpbmEgUmVwb3J0cywgUmljaGFyZHNvbidzIENhc2VzXCIsXG4gICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJSaWNoLkNhcy4oUy5DLilcIjogXCJSaWNoLiBDYXMuXCJ9fV0sXG4gICAgXCJSaWNoLiBFcS5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJSaWNoLiBFcS5cIjogW3tcInllYXJcIjoxODQ0LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTg2OCwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztzY1wiXSxcbiAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJTb3V0aCBDYXJvbGluYSBSZXBvcnRzLCBSaWNoYXJkc29uJ3MgRXF1aXR5XCIsXG4gICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIlJpY2guRXEuQ2guXCI6IFwiUmljaC4gRXEuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJTLkMuRXEuKFJpY2guRXEuKVwiOiBcIlJpY2guIEVxLlwifX1dLFxuICAgIFwiUmlsLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJSaWwuXCI6IFt7XCJ5ZWFyXCI6MTgzNiwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTgzNywgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7c2NcIl0sXG4gICAgICAgICAgICAgIFwibmFtZVwiOiBcIlNvdXRoIENhcm9saW5hIFJlcG9ydHMsIFJpbGV5XCIsXG4gICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJSaWxleVwiOiBcIlJpbC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJSaWxleSBMLihTLkMuKVwiOiBcIlJpbC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJTLkMuTC4oUmlsZXkpXCI6IFwiUmlsLlwifX1dLFxuICAgIFwiUmlsLiBFcS5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIlJpbC4gRXEuXCI6IFt7XCJ5ZWFyXCI6MTgzNiwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODM3LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7c2NcIl0sXG4gICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJTb3V0aCBDYXJvbGluYSBSZXBvcnRzLCBSaWxleSdzIENoYW5jZXJ5XCIsXG4gICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiUmlsLlwiOiBcIlJpbC4gRXEuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlJpbGV5XCI6IFwiUmlsLiBFcS5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiUmlsZXkgQ2guXCI6IFwiUmlsLiBFcS5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiUmlsZXkgRXEuXCI6IFwiUmlsLiBFcS5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiUmlsZXkgRXEuKFMuQy4pXCI6IFwiUmlsLiBFcS5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiUy5DLkVxLihSaWwuKVwiOiBcIlJpbC4gRXEuXCJ9fV0sXG4gICAgXCJSb2IuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIlJvYi5cIjogW3tcInllYXJcIjoxODQxLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODQ2LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztsYVwiXSxcbiAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiTG91aXNpYW5hIFJlcG9ydHMsIFJvYmluc29uXCIsXG4gICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJSb2IuTGEuXCI6IFwiUm9iLlwiLCBcIlJvYmluc29uXCI6IFwiUm9iLlwifX0sXG4gICAgICAgICAgICAge1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJSb2IuXCI6IFt7XCJ5ZWFyXCI6MTg0MiwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTg0NCwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7dmFcIl0sXG4gICAgICAgICAgICAgIFwibmFtZVwiOiBcIlZpcmdpbmlhIFJlcG9ydHMsIFJvYmluc29uXCIsXG4gICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJSb2IuVmEuXCI6IFwiUm9iLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlJvYmluc29uXCI6IFwiUm9iLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlZhLihSb2IuKVwiOiBcIlJvYi5cIn19XSxcbiAgICBcIlJvYmFyZHNcIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiUm9iYXJkc1wiOiBbe1wieWVhclwiOjE4NjIsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4NjUsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3R4XCJdLFxuICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJTeW5vcHNlcyBvZiB0aGUgRGVjaXNpb25zIG9mIHRoZSBTdXByZW1lIENvdXJ0IG9mIFRleGFzIEFyaXNpbmcgZnJvbSBSZXN0cmFpbnRzIGJ5IENvbnNjcmlwdCBhbmQgT3RoZXIgTWlsaXRhcnkgQXV0aG9yaXRpZXMgKFJvYmFyZHMpXCIsXG4gICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJSb2IuXCI6IFwiUm9iYXJkc1wiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlJvYi5Db25zLkNhcy4oVGV4LilcIjogXCJSb2JhcmRzXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiUm9iLkNvbnNjLkNhcy5cIjogXCJSb2JhcmRzXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiUm9iYXJkXCI6IFwiUm9iYXJkc1wifX1dLFxuICAgIFwiUm9vdFwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJSb290XCI6IFt7XCJ5ZWFyXCI6MTc4OSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTc5OCwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7Y3RcIl0sXG4gICAgICAgICAgICAgIFwibmFtZVwiOiBcIlJvb3QncyBDb25uZWN0aWN1dCBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiUy4gJiBNLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJTLiAmIE0uXCI6IFt7XCJ5ZWFyXCI6MTg0MywgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTg1MCwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bXNcIl0sXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIk1pc3Npc3NpcHBpIFJlcG9ydHMsIFNtZWRlcyBhbmQgTWFyc2hhbGxcIixcbiAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIk1pc3MuKFMuJiBNLilcIjogXCJTLiAmIE0uXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiUy4mIE1hci5cIjogXCJTLiAmIE0uXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiU20uJiBNLlwiOiBcIlMuICYgTS5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJTbWVkLiYgTS5cIjogXCJTLiAmIE0uXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiU21lZGVzICYgTS4oTWlzcy4pXCI6IFwiUy4gJiBNLlwifX1dLFxuICAgIFwiUy4gQ3QuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJmZWRcIixcbiAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIlMuIEN0LlwiOiBbe1wieWVhclwiOjE4ODIsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztmZWRlcmFsO3N1cHJlbWUuY291cnRcIl0sXG4gICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiV2VzdCdzIFN1cHJlbWUgQ291cnQgUmVwb3J0ZXJcIixcbiAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiUyBDdFwiOiBcIlMuIEN0LlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiUy5DLlwiOiBcIlMuIEN0LlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiUy5DdC5cIjogXCJTLiBDdC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlN1cC5DdC5cIjogXCJTLiBDdC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlN1cC5DdC5SZXAuXCI6IFwiUy4gQ3QuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJTdXByLkN0LlJlcC5cIjogXCJTLiBDdC5cIn19XSxcbiAgICBcIlMuQy5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiUy5DLlwiOiBbe1wieWVhclwiOjE4NjgsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztzY1wiXSxcbiAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiU291dGggQ2Fyb2xpbmEgUmVwb3J0c1wiLFxuICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiUy5DLlIuXCI6IFwiUy5DLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlMuQ2FyLlwiOiBcIlMuQy5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJTby5DLlwiOiBcIlMuQy5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJTby5DYXIuXCI6IFwiUy5DLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlNvdXRoIENhci5cIjogXCJTLkMuXCJ9fV0sXG4gICAgXCJTLkQuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIlMuRC5cIjogW3tcInllYXJcIjoxODkwLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxOTc2LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztzZFwiXSxcbiAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiU291dGggRGFrb3RhIFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIlMuRGFrLlwiOiBcIlMuRC5cIn19XSxcbiAgICBcIlMuRS5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlX3JlZ2lvbmFsXCIsXG4gICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiUy5FLlwiOiBbe1wieWVhclwiOjE4ODcsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE5MzksIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJTLkUuMmRcIjogW3tcInllYXJcIjoxOTM5LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztnYVwiLFwidXM7bmNcIixcInVzO3NjXCIsXCJ1czt2YVwiLFwidXM7d3ZcIl0sXG4gICAgICAgICAgICAgIFwibmFtZVwiOiBcIlNvdXRoIEVhc3Rlcm4gUmVwb3J0ZXJcIixcbiAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIlMuIEUuXCI6IFwiUy5FLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlMuIEUuIDJkXCI6IFwiUy5FLjJkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiUy4gRS4yZFwiOiBcIlMuRS4yZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlMuRS4gMmRcIjogXCJTLkUuMmRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJTRVwiOiBcIlMuRS5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJTRSAyZFwiOiBcIlMuRS4yZFwifX1dLFxuICAgIFwiUy5XLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVfcmVnaW9uYWxcIixcbiAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJTLlcuXCI6IFt7XCJ5ZWFyXCI6MTg4NiwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTkyOCwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBcIlMuVy4yZFwiOiBbe1wieWVhclwiOjE5MjgsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTk5OSwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBcIlMuVy4zZFwiOiBbe1wieWVhclwiOjE5OTksIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2FyXCIsXCJ1cztreVwiLFwidXM7bW9cIixcInVzO3RuXCIsXCJ1czt0eFwiXSxcbiAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiU291dGggV2VzdGVybiBSZXBvcnRlclwiLFxuICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiUy4gVy5cIjogXCJTLlcuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiUy4gVy4gMmRcIjogXCJTLlcuMmRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJTLiBXLiAzZFwiOiBcIlMuVy4zZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlMuIFcuMmRcIjogXCJTLlcuMmRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJTLiBXLjNkXCI6IFwiUy5XLjNkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiUy5XLiAyZFwiOiBcIlMuVy4yZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlMuVy4gM2RcIjogXCJTLlcuM2RcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJTV1wiOiBcIlMuVy5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJTVyAyZFwiOiBcIlMuVy4yZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlNXIDNkXCI6IFwiUy5XLjNkXCJ9fV0sXG4gICAgXCJTRFwiOiBbe1wiY2l0ZV90eXBlXCI6IFwibmV1dHJhbFwiLFxuICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJTRFwiOiBbe1wieWVhclwiOjE3NTAsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztzZFwiXSxcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIlNvdXRoIERha290YSBOZXV0cmFsIENpdGF0aW9uXCIsXG4gICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge319XSxcbiAgICBcIlNhZGxlclwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIlNhZGxlclwiOiBbe1wieWVhclwiOjE4ODUsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODg4LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3BhXCJdLFxuICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIlBlbm5zeWx2YW5pYSBTdGF0ZSBSZXBvcnRzLCBTYWRsZXJcIixcbiAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiUGEuQ2FzLlwiOiBcIlNhZGxlclwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiU2FkLlBhLkNhcy5cIjogXCJTYWRsZXJcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlNhZC5QYS5Dcy5cIjogXCJTYWRsZXJcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlNhZGwuXCI6IFwiU2FkbGVyXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJTYWRsZXIoUGEuKVwiOiBcIlNhZGxlclwifX1dLFxuICAgIFwiU2FuZC4gQ2guXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiU2FuZC4gQ2guXCI6IFt7XCJ5ZWFyXCI6MTg0MywgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4NDcsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7bnlcIl0sXG4gICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiU2FuZGZvcmQncyBDaGFuY2VyeSBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIlNhbmQuQ2h5LlwiOiBcIlNhbmQuIENoLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiU2FuZGYuQ2guXCI6IFwiU2FuZC4gQ2guXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJTYW5kZi5DaC4oTi5ZLilcIjogXCJTYW5kLiBDaC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlNhbmRmLkNoeS5cIjogXCJTYW5kLiBDaC5cIn19XSxcbiAgICBcIlNhcmF0LiBDaC4gU2VudC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiU2FyYXQuIENoLiBTZW50LlwiOiBbe1wieWVhclwiOjE4NDEsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4NDcsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO255XCJdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJTYXJhdG9nYSBDaGFuY2VyeSBTZW50aW5lbFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiQ2guU2VudC5cIjogXCJTYXJhdC4gQ2guIFNlbnQuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQ2guU2VudC4oTi5ZLilcIjogXCJTYXJhdC4gQ2guIFNlbnQuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTi5ZLkNoLlNlbnQuXCI6IFwiU2FyYXQuIENoLiBTZW50LlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlNhci5DaC5TZW4uXCI6IFwiU2FyYXQuIENoLiBTZW50LlwifX1dLFxuICAgIFwiU2NhbS5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIlNjYW0uXCI6IFt7XCJ5ZWFyXCI6MTgzMiwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODQzLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7aWxcIl0sXG4gICAgICAgICAgICAgICBcIm5hbWVcIjogXCJJbGxpbm9pcyBSZXBvcnRzLCBTY2FtbW9uXCIsXG4gICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiSWxsLihTY2FtLilcIjogXCJTY2FtLlwiLCBcIlNjLlwiOiBcIlNjYW0uXCJ9fV0sXG4gICAgXCJTZXJnLiAmIFJhd2xlXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIlNlcmcuICYgUmF3bGVcIjogW3tcInllYXJcIjoxODE0LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODI4LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztwYVwiXSxcbiAgICAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiUGVubnN5bHZhbmlhIFN0YXRlIFJlcG9ydHMsIFNlcmdlYW50IGFuZCBSYXdsZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiU2VyZy4mIFIuXCI6IFwiU2VyZy4gJiBSYXdsZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlNlcmcuJiBSYXcuXCI6IFwiU2VyZy4gJiBSYXdsZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlNlcmcuJiBSYXdsLlwiOiBcIlNlcmcuICYgUmF3bGVcIn19XSxcbiAgICBcIlNuZWVkXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJTbmVlZFwiOiBbe1wieWVhclwiOjE4MDEsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTgwNSwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2t5XCJdLFxuICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiS2VudHVja3kgUmVwb3J0cywgU25lZWRcIixcbiAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJLZW4uRGVjLlwiOiBcIlNuZWVkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkt5LihTbmVlZClcIjogXCJTbmVlZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJTbmVlZCBEZWMuXCI6IFwiU25lZWRcIn19LFxuICAgICAgICAgICAgICB7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJTbmVlZFwiOiBbe1wieWVhclwiOjE4NTMsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTg1OCwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3RuXCJdLFxuICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiVGVubmVzc2VlIFJlcG9ydHMsIFNuZWVkXCIsXG4gICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiVGVubi4oU25lZWQpXCI6IFwiU25lZWRcIn19XSxcbiAgICBcIlNvLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVfcmVnaW9uYWxcIixcbiAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIlNvLlwiOiBbe1wieWVhclwiOjE4ODYsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxOTQxLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgXCJTby4gMmRcIjogW3tcInllYXJcIjoxOTQxLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MjAwOCwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgIFwiU28uIDNkXCI6IFt7XCJ5ZWFyXCI6MjAwOCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2FsXCIsXCJ1cztmbFwiLFwidXM7bGFcIixcInVzO21zXCJdLFxuICAgICAgICAgICAgIFwibmFtZVwiOiBcIlNvdXRoZXJuIFJlcG9ydGVyXCIsXG4gICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIlNvLjJkXCI6IFwiU28uIDJkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJTby4zZFwiOiBcIlNvLiAzZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiU291dGguXCI6IFwiU28uXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJTb3V0aC4yZFwiOiBcIlNvLiAyZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiU291dGguM2RcIjogXCJTby4gM2RcIn19XSxcbiAgICBcIlNwZWVyc1wiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIlNwZWVyc1wiOiBbe1wieWVhclwiOjE4NDIsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODQ0LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3NjXCJdLFxuICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIlNvdXRoIENhcm9saW5hIFJlcG9ydHMsIFNwZWVyc1wiLFxuICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJTLkMuTC4oU3BlZXJzKVwiOiBcIlNwZWVyc1wiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiU3AuXCI6IFwiU3BlZXJzXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJTcGVhcnNcIjogXCJTcGVlcnNcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlNwZWVycyBMLihTLkMuKVwiOiBcIlNwZWVyc1wifX1dLFxuICAgIFwiU3BlZXJzIEVxLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJTcGVlcnMgRXEuXCI6IFt7XCJ5ZWFyXCI6MTg0MiwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTg0NCwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7c2NcIl0sXG4gICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIlNvdXRoIENhcm9saW5hIFJlcG9ydHMsIFNwZWVycycgRXF1aXR5XCIsXG4gICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJTLkMuRXEuKFNwZWVycyBFcS4pXCI6IFwiU3BlZXJzIEVxLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlNwLlwiOiBcIlNwZWVycyBFcS5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJTcC5DaC5cIjogXCJTcGVlcnMgRXEuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiU3BlYXIgQ2guXCI6IFwiU3BlZXJzIEVxLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlNwZWFyIEVxLlwiOiBcIlNwZWVycyBFcS5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJTcGVhcnNcIjogXCJTcGVlcnMgRXEuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiU3BlYXJzIEVxLlwiOiBcIlNwZWVycyBFcS5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJTcGVlcnNcIjogXCJTcGVlcnMgRXEuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiU3BlZXJzIEVxLihTLkMuKVwiOiBcIlNwZWVycyBFcS5cIn19XSxcbiAgICBcIlN0YXRlIFJwdHIuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJTdGF0ZSBScHRyLlwiOiBbe1wieWVhclwiOjE5NDUsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1czttdFwiXSxcbiAgICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIlN0YXRlIFJlcG9ydGVyXCIsXG4gICAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge319XSxcbiAgICBcIlN0ZXcuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJTdGV3LlwiOiBbe1wieWVhclwiOjE4MjcsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTgzMSwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2FsXCJdLFxuICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiQWxhYmFtYSBSZXBvcnRzLCBTdGV3YXJ0XCIsXG4gICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiU3Rld2FydFwiOiBcIlN0ZXcuXCJ9fV0sXG4gICAgXCJTdGV3LiAmIFAuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIlN0ZXcuICYgUC5cIjogW3tcInllYXJcIjoxODMxLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODM0LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfV19LFxuICAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7YWxcIl0sXG4gICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIkFsYWJhbWEgUmVwb3J0cywgU3Rld2FydCBhbmQgUG9ydGVyXCIsXG4gICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiU3Ryb2IuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiU3Ryb2IuXCI6IFt7XCJ5ZWFyXCI6MTg0NiwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4NTAsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7c2NcIl0sXG4gICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiU291dGggQ2Fyb2xpbmEgUmVwb3J0cywgU3Ryb2JoYXJ0XCIsXG4gICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIlMuQy5MLihTdHJvYi4pXCI6IFwiU3Ryb2IuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJTdHJvYmguTC4oUy5DLilcIjogXCJTdHJvYi5cIn19XSxcbiAgICBcIlN0cm9iLiBFcS5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiU3Ryb2IuIEVxLlwiOiBbe1wieWVhclwiOjE4NDYsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4NTAsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3NjXCJdLFxuICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJTb3V0aCBDYXJvbGluYSBSZXBvcnRzLCBTdHJvYmhhcnQncyBFcXVpdHlcIixcbiAgICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIlMuQy5FcS4oU3Ryb2IuRXEuKVwiOiBcIlN0cm9iLiBFcS5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJTdHJvYi5FcS4oUy5DLilcIjogXCJTdHJvYi4gRXEuXCJ9fV0sXG4gICAgXCJTd2FuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIlN3YW5cIjogW3tcInllYXJcIjoxODUxLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODUzLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1czt0blwiXSxcbiAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiVGVubmVzc2VlIFJlcG9ydHMsIFN3YW5cIixcbiAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIlRlbm4uKFN3YW4pXCI6IFwiU3dhblwifX1dLFxuICAgIFwiVC5CLiBNb24uXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiVC5CLiBNb24uXCI6IFt7XCJ5ZWFyXCI6MTgyNCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4MjgsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7a3lcIl0sXG4gICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiS2VudHVja3kgUmVwb3J0cywgTW9ucm9lLCBULkIuXCIsXG4gICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkt5LihULkIuTW9ucm9lKVwiOiBcIlQuQi4gTW9uLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTW9uLlwiOiBcIlQuQi4gTW9uLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTW9uLlQuQi5cIjogXCJULkIuIE1vbi5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlQuQi5Nb24uKEt5LilcIjogXCJULkIuIE1vbi5cIn19XSxcbiAgICBcIlQuQy5cIjogW3tcImNpdGVfdHlwZVwiOiBcInNwZWNpYWx0eVwiLFxuICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIlQuQy5cIjogW3tcInllYXJcIjoxOTQyLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXNcIl0sXG4gICAgICAgICAgICAgIFwibmFtZVwiOiBcIlJlcG9ydHMgb2YgdGhlIFVuaXRlZCBTdGF0ZXMgVGF4IENvdXJ0XCIsXG4gICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJULiBDLlwiOiBcIlQuQy5cIiwgXCJULkN0XCI6IFwiVC5DLlwiLCBcIlQuQ3QuXCI6IFwiVC5DLlwifX1dLFxuICAgIFwiVC5DLk0uXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzcGVjaWFsdHlcIixcbiAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIlQuQy5NLlwiOiBbe1wieWVhclwiOjE5NDIsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1c1wiXSxcbiAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJUYXggQ291cnQgTWVtb3JhbmR1bSBEZWNpc2lvbnNcIixcbiAgICAgICAgICAgICAgICAndmFyaWF0aW9ucyc6IHsnVC5DLk0uIChDQ0gpJzogJ1QuQy5NLicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ1QuQy5NLiAoUC1IKSc6ICdULkMuTS4nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdULkMuTS4gKFJJQSknOiAnVC5DLk0uJ319XSxcbiAgICBcIlRheS5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiVGF5LlwiOiBbe1wieWVhclwiOjE3OTgsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4MDIsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO25jXCJdLFxuICAgICAgICAgICAgICBcIm5hbWVcIjogXCJOb3J0aCBDYXJvbGluYSBSZXBvcnRzLCBUYXlsb3JcIixcbiAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIk4uQy4oVGF5LilcIjogXCJUYXkuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiVGF5LkouTC5cIjogXCJUYXkuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiVGF5Lk4uQy5cIjogXCJUYXkuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiVGF5bC5OLkMuXCI6IFwiVGF5LlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlRheWxvclwiOiBcIlRheS5cIn19XSxcbiAgICBcIlRheWxvclwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIlRheWxvclwiOiBbe1wieWVhclwiOjE4MTYsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODE4LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO25jXCJdLFxuICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIlRheWxvcidzIE5vcnRoIENhcm9saW5hIFRlcm0gUmVwb3J0c1wiLFxuICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJOLkMuKFRheWxvcilcIjogXCJUYXlsb3JcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk4uQy5ULlJlcC5cIjogXCJUYXlsb3JcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk4uQy5UZXJtLlIuXCI6IFwiVGF5bG9yXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJOLkMuVGVybS5SZXAuXCI6IFwiVGF5bG9yXCJ9fV0sXG4gICAgXCJUZWlzcy5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJUZWlzcy5cIjogW3tcInllYXJcIjoxOTAzLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTkxNywgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztsYVwiXSxcbiAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJMb3Vpc2lhbmEgQ291cnQgb2YgQXBwZWFscyBSZXBvcnRzLCBUZWlzc2VyXCIsXG4gICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkxhLkFwcC4oT3JsZWFucylcIjogXCJUZWlzcy5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlRlaXNzaWVyXCI6IFwiVGVpc3MuXCJ9fV0sXG4gICAgXCJUZW5uLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiVGVubi5cIjogW3tcInllYXJcIjoxODcwLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE5NzEsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1czt0blwiXSxcbiAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIlRlbm5lc3NlZSBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiVGVuLlwiOiBcIlRlbm4uXCJ9fV0sXG4gICAgXCJUZW5uLiBBcHAuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIlRlbm4uIEFwcC5cIjogW3tcInllYXJcIjoxOTI1LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxOTcxLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1czt0blwiXSxcbiAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiVGVubmVzc2VlIEFwcGVhbHMgUmVwb3J0c1wiLFxuICAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge319XSxcbiAgICBcIlRlbm4uIENyaW0uIEFwcC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiVGVubi4gQ3JpbS4gQXBwLlwiOiBbe1wieWVhclwiOjE5NjcsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE5NzEsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3RuXCJdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJUZW5uZXNzZWUgQ3JpbWluYWwgQXBwZWFscyBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiVGV4LlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJUZXguXCI6IFt7XCJ5ZWFyXCI6MTg0NiwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTk2MiwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7dHhcIl0sXG4gICAgICAgICAgICAgIFwibmFtZVwiOiBcIlRleGFzIFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIlRleC5TLkN0LlwiOiBcIlRleC5cIn19XSxcbiAgICBcIlRleC4gQ2l2LiBBcHAuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJUZXguIENpdi4gQXBwLlwiOiBbe1wieWVhclwiOjE4OTIsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTkxMSwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3R4XCJdLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiVGV4YXMgQ2l2aWwgQXBwZWFscyBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiVGV4LkNpdi5BcHAuXCI6IFwiVGV4LiBDaXYuIEFwcC5cIn19XSxcbiAgICBcIlRleC4gQ3JpbS5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiVGV4LiBDcmltLlwiOiBbe1wieWVhclwiOjE4OTEsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE5NjIsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3R4XCJdLFxuICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJUZXhhcyBDcmltaW5hbCBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJUZXguQ3IuQXBwLlwiOiBcIlRleC4gQ3JpbS5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJUZXguQ3IuUi5cIjogXCJUZXguIENyaW0uXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiVGV4LkNyaW0uUmVwLlwiOiBcIlRleC4gQ3JpbS5cIn19XSxcbiAgICBcIlRleC4gQ3QuIEFwcC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiVGV4LiBDdC4gQXBwLlwiOiBbe1wieWVhclwiOjE4NzYsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4OTEsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3R4XCJdLFxuICAgICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJUZXhhcyBDb3VydCBvZiBBcHBlYWxzIFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIlRleC5DdC5BcHAuUi5cIjogXCJUZXguIEN0LiBBcHAuXCJ9fV0sXG4gICAgXCJUZXguIEwuIFJldi5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJUZXguIEwuIFJldi5cIjogW3tcInllYXJcIjoxODQ1LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTg0NiwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1czt0eFwiXSxcbiAgICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJUZXhhcyBMYXcgUmV2aWV3XCIsXG4gICAgICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIlRleGFzIEwuUmV2LlwiOiBcIlRleC4gTC4gUmV2LlwifX1dLFxuICAgIFwiVGV4LiBTdXAuIEN0LiBKLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJUZXguIFN1cC4gQ3QuIEouXCI6IFt7XCJ5ZWFyXCI6MTk1NywgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3R4XCJdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJUZXhhcyBTdXByZW1lIENvdXJ0IEpvdXJuYWxcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fV0sXG4gICAgXCJUcmVhZC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJUcmVhZC5cIjogW3tcInllYXJcIjoxODEyLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTgxNiwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztzY1wiXSxcbiAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJTb3V0aCBDYXJvbGluYSBSZXBvcnRzLCBUcmVhZHdheVwiLFxuICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJTLkMuTC4oVHJlYWQuKVwiOiBcIlRyZWFkLlwifX1dLFxuICAgIFwiVHVjay4gJiBDbC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIlR1Y2suICYgQ2wuXCI6IFt7XCJ5ZWFyXCI6MTg5MiwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODkzLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7ZGNcIl0sXG4gICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJEaXN0cmljdCBvZiBDb2x1bWJpYSBSZXBvcnRzLCBUdWNrZXIgYW5kIENsZXBoYW5lXCIsXG4gICAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiRC5DLihUdWNrLiYgQ2wuKVwiOiBcIlR1Y2suICYgQ2wuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlR1Y2suXCI6IFwiVHVjay4gJiBDbC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiVHVjay4mIEMuXCI6IFwiVHVjay4gJiBDbC5cIn19XSxcbiAgICBcIlR5bC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiVHlsLlwiOiBbe1wieWVhclwiOjE4MDAsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4MDMsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3Z0XCJdLFxuICAgICAgICAgICAgICBcIm5hbWVcIjogXCJWZXJtb250IFJlcG9ydHMsIFR5bGVyXCIsXG4gICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJUeWxlclwiOiBcIlR5bC5cIn19XSxcbiAgICBcIlR5bmdcIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiVHluZ1wiOiBbe1wieWVhclwiOjE4MDYsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4MjIsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO21hXCJdLFxuICAgICAgICAgICAgICBcIm5hbWVcIjogXCJNYXNzYWNodXNldHRzIFJlcG9ydHMsIFR5bmdcIixcbiAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIk1hc3MuKFR5bmcpXCI6IFwiVHluZ1wifX1dLFxuICAgIFwiVS5TLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwiZmVkXCIsXG4gICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiVS5TLlwiOiBbe1wieWVhclwiOjE3OTAsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztmZWRlcmFsO3N1cHJlbWUuY291cnRcIl0sXG4gICAgICAgICAgICAgIFwibmFtZVwiOiBcIlVuaXRlZCBTdGF0ZXMgU3VwcmVtZSBDb3VydCBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJVLiBTLlwiOiBcIlUuUy5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJVLlMuUy5DLlJlcC5cIjogXCJVLlMuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiVVNcIjogXCJVLlMuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiVVNTQ1JcIjogXCJVLlMuXCJ9fV0sXG4gICAgXCJVLlMuIEFwcC4gRC5DLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiVS5TLiBBcHAuIEQuQy5cIjogW3tcInllYXJcIjoxOTQxLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7ZGNcIl0sXG4gICAgICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJVbml0ZWQgU3RhdGVzIENvdXJ0IG9mIEFwcGVhbHMgUmVwb3J0c1wiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fV0sXG4gICAgXCJVLlMuIEFwcC4gTEVYSVNcIjogW3tcImNpdGVfdHlwZVwiOiBcInNwZWNpYWx0eVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiVS5TLiBBcHAuIExFWElTXCI6IFt7XCJ5ZWFyXCI6MTc1MCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2ZlZGVyYWw7MS1jaXJcIixcInVzO2ZlZGVyYWw7Mi1jaXJcIixcInVzO2ZlZGVyYWw7My1jaXJcIixcInVzO2ZlZGVyYWw7NC1jaXJcIixcInVzO2ZlZGVyYWw7NS1jaXJcIixcInVzO2ZlZGVyYWw7Ni1jaXJcIixcInVzO2ZlZGVyYWw7Ny1jaXJcIixcInVzO2ZlZGVyYWw7OC1jaXJcIixcInVzO2ZlZGVyYWw7OS1jaXJcIixcInVzO2ZlZGVyYWw7MTAtY2lyXCIsXCJ1cztmZWRlcmFsOzExLWNpclwiXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJMZXhpcyBOZXh1cyBVLlMuIEFwcGVhbHMgQ2l0YXRpb25cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge319XSxcbiAgICBcIlUuUy5MLlcuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzcGVjaWFsdHlcIixcbiAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiVS5TLkwuVy5cIjogW3tcInllYXJcIjoxOTMzLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXNcIl0sXG4gICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJVbml0ZWQgU3RhdGVzIExhdyBXZWVrXCIsXG4gICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge319XSxcbiAgICBcIlVUXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJuZXV0cmFsXCIsXG4gICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIlVUXCI6IFt7XCJ5ZWFyXCI6MTc1MCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3V0XCJdLFxuICAgICAgICAgICAgXCJuYW1lXCI6IFwiVXRhaCBOZXV0cmFsIENpdGF0aW9uXCIsXG4gICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge319XSxcbiAgICBcIlVUIEFwcFwiOiBbe1wiY2l0ZV90eXBlXCI6IFwibmV1dHJhbFwiLFxuICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiVVQgQXBwXCI6IFt7XCJ5ZWFyXCI6MTc1MCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3V0XCJdLFxuICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIlV0YWggTmV1dHJhbCBDaXRhdGlvblwiLFxuICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiVXRhaFwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJVdGFoXCI6IFt7XCJ5ZWFyXCI6MTg1MSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTk3NCwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBcIlV0YWggMmRcIjogW3tcInllYXJcIjoxODUxLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxOTc0LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1czt1dFwiXSxcbiAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiVXRhaCBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiVi5JLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIlYuSS5cIjogW3tcInllYXJcIjoxOTE3LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3ZpXCJdLFxuICAgICAgICAgICAgIFwibmFtZVwiOiBcIlZpcmdpbiBJc2xhbmRzIFJlcG9ydHNcIixcbiAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge319XSxcbiAgICBcIlZUXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJuZXV0cmFsXCIsXG4gICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIlZUXCI6IFt7XCJ5ZWFyXCI6MTc1MCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3Z0XCJdLFxuICAgICAgICAgICAgXCJuYW1lXCI6IFwiVmVybW9udCBOZXV0cmFsIENpdGF0aW9uXCIsXG4gICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge319XSxcbiAgICBcIlZhLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIlZhLlwiOiBbe1wieWVhclwiOjE4ODAsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1czt2YVwiXSxcbiAgICAgICAgICAgICBcIm5hbWVcIjogXCJWaXJnaW5pYSBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIlYuXCI6IFwiVmEuXCIsIFwiVmlyZy5cIjogXCJWYS5cIn19XSxcbiAgICBcIlZhLiBBcHAuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJWYS4gQXBwLlwiOiBbe1wieWVhclwiOjE5ODUsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1czt2YVwiXSxcbiAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIlZpcmdpbmlhIENvdXJ0IG9mIEFwcGVhbHMgUmVwb3J0c1wiLFxuICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fV0sXG4gICAgXCJWYS4gQ2FzLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiVmEuIENhcy5cIjogW3tcInllYXJcIjoxNzg5LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4MjYsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1czt2YVwiXSxcbiAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIlZpcmdpbmlhIENhc2VzLCBDcmltaW5hbFwiLFxuICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fV0sXG4gICAgXCJWZXQuIEFwcC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInNwZWNpYWx0eVwiLFxuICAgICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiVmV0LiBBcHAuXCI6IFt7XCJ5ZWFyXCI6MTk5MCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzXCJdLFxuICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIlZldGVyYW5zIEFwcGVhbHMgUmVwb3J0ZXJcIixcbiAgICAgICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiVmV0LkFwcC5cIjogXCJWZXQuIEFwcC5cIn19XSxcbiAgICBcIlZ0LlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIlZ0LlwiOiBbe1wieWVhclwiOjE4MjYsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1czt2dFwiXSxcbiAgICAgICAgICAgICBcIm5hbWVcIjogXCJWZXJtb250IFJlcG9ydHNcIixcbiAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiVi5SLlwiOiBcIlZ0LlwiLCBcIlZlcm0uXCI6IFwiVnQuXCJ9fV0sXG4gICAgXCJXLiBWYS5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJXLiBWYS5cIjogW3tcInllYXJcIjoxODY0LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7d3ZcIl0sXG4gICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiV2VzdCBWaXJnaW5pYSBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIlcuVi5cIjogXCJXLiBWYS5cIiwgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJXZXN0IFZhLlwiOiBcIlcuIFZhLlwifX1dLFxuICAgIFwiV0lcIjogW3tcImNpdGVfdHlwZVwiOiBcIm5ldXRyYWxcIixcbiAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiV0lcIjogW3tcInllYXJcIjoxNzUwLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7d2lcIl0sXG4gICAgICAgICAgICBcIm5hbWVcIjogXCJXaXNjb25zaW4gTmV1dHJhbCBDaXRhdGlvblwiLFxuICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fV0sXG4gICAgXCJXSSBBcHBcIjogW3tcImNpdGVfdHlwZVwiOiBcIm5ldXRyYWxcIixcbiAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIldJIEFwcFwiOiBbe1wieWVhclwiOjE3NTAsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1czt3aVwiXSxcbiAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJXaXNjb25zaW4gTmV1dHJhbCBDaXRhdGlvblwiLFxuICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7fX1dLFxuICAgIFwiV0xcIjogW3tcImNpdGVfdHlwZVwiOiBcInNwZWNpYWx0eVwiLFxuICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJXTFwiOiBbe1wieWVhclwiOjE3NTAsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztjdFwiLFwidXM7ZGVcIixcInVzO2RjXCIsXCJ1czttZVwiLFwidXM7bmhcIixcInVzO25qXCIsXCJ1cztwYVwiLFwidXM7cmlcIixcInVzO3Z0XCIsXCJ1cztpbFwiLFwidXM7aW5cIixcInVzO21hXCIsXCJ1cztueVwiLFwidXM7b2hcIixcInVzO2lhXCIsXCJ1czttaVwiLFwidXM7bW5cIixcInVzO25lXCIsXCJ1cztuZFwiLFwidXM7c2RcIixcInVzO3dpXCIsXCJ1cztha1wiLFwidXM7YXpcIixcInVzO2NhXCIsXCJ1cztjb1wiLFwidXM7aGlcIixcInVzO2lkXCIsXCJ1cztrc1wiLFwidXM7bXRcIixcInVzO252XCIsXCJ1cztubVwiLFwidXM7b2tcIixcInVzO29yXCIsXCJ1czt1dFwiLFwidXM7d2FcIixcInVzO3d5XCIsXCJ1cztnYVwiLFwidXM7bmNcIixcInVzO3NjXCIsXCJ1czt2YVwiLFwidXM7d3ZcIixcInVzO2FyXCIsXCJ1cztreVwiLFwidXM7bW9cIixcInVzO3RuXCIsXCJ1czt0eFwiLFwidXM7YWxcIixcInVzO2ZsXCIsXCJ1cztsYVwiLFwidXM7bXNcIixcInVzO2ZlZGVyYWw7MS1jaXJcIixcInVzO2ZlZGVyYWw7Mi1jaXJcIixcInVzO2ZlZGVyYWw7My1jaXJcIixcInVzO2ZlZGVyYWw7NC1jaXJcIixcInVzO2ZlZGVyYWw7NS1jaXJcIixcInVzO2ZlZGVyYWw7Ni1jaXJcIixcInVzO2ZlZGVyYWw7Ny1jaXJcIixcInVzO2ZlZGVyYWw7OC1jaXJcIixcInVzO2ZlZGVyYWw7OS1jaXJcIixcInVzO2ZlZGVyYWw7MTAtY2lyXCIsXCJ1cztmZWRlcmFsOzExLWNpclwiXSxcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIldlc3QgTGF3IENpdGF0aW9uXCIsXG4gICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge319XSxcbiAgICBcIldZXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJuZXV0cmFsXCIsXG4gICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIldZXCI6IFt7XCJ5ZWFyXCI6MTc1MCwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3d5XCJdLFxuICAgICAgICAgICAgXCJuYW1lXCI6IFwiV3lvbWluZyBOZXV0cmFsIENpdGF0aW9uXCIsXG4gICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge319XSxcbiAgICBcIldhbGsuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJXYWxrLlwiOiBbe1wieWVhclwiOjE4NTUsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTg4NSwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3BhXCJdLFxuICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiUGVubnN5bHZhbmlhIFN0YXRlIFJlcG9ydHMsIFdhbGtlclwiLFxuICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIldhbGsuUGEuXCI6IFwiV2Fsay5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiV2Fsa2VyXCI6IFwiV2Fsay5cIn19XSxcbiAgICBcIldhbGtlclwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIldhbGtlclwiOiBbe1wieWVhclwiOjE4MTgsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODMyLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO21zXCJdLFxuICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIk1pc3Npc3NpcHBpIFJlcG9ydHMsIFdhbGtlclwiLFxuICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJNaXNzLihXYWxrZXIpXCI6IFwiV2Fsa2VyXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJXYWxrLlwiOiBcIldhbGtlclwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiV2Fsay5NaXNzLlwiOiBcIldhbGtlclwifX1dLFxuICAgIFwiV2FsbC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInNjb3R1c19lYXJseVwiLFxuICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJXYWxsLlwiOiBbe1wieWVhclwiOjE4NjMsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTg3NCwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO2ZlZGVyYWw7c3VwcmVtZS5jb3VydFwiXSxcbiAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIldhbGxhY2UncyBTdXByZW1lIENvdXJ0IFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJVLlMuKFdhbGwuKVwiOiBcIldhbGwuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIldhbGwuXCI6IFwiV2FsbC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiV2FsbGFjZVwiOiBcIldhbGwuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIldhbGwuUmVwLlwiOiBcIldhbGwuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIldhbGwuUy5DLlwiOiBcIldhbGwuXCJ9fV0sXG4gICAgXCJXYXNoLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiV2FzaC5cIjogW3tcInllYXJcIjoxNzkwLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE3OTYsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1czt2YVwiXSxcbiAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIlZpcmdpbmlhIFJlcG9ydHMsIFdhc2hpbmd0b25cIixcbiAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJWYS4oV2FzaC4pXCI6IFwiV2FzaC5cIiwgXCJXYXNoLlZhLlwiOiBcIldhc2guXCJ9fSxcbiAgICAgICAgICAgICAge1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiV2FzaC5cIjogW3tcInllYXJcIjoxODg5LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIldhc2guIDJkXCI6IFt7XCJ5ZWFyXCI6MTg4OSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjpmYWxzZSwgXCJtb250aFwiOmZhbHNlLCBcImRheVwiOmZhbHNlfV19LFxuICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3dhXCJdLFxuICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiV2FzaGluZ3RvbiBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge1wiVy5cIjogXCJXYXNoLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJXLjJkXCI6IFwiV2FzaC4gMmRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiVy5TdC5cIjogXCJXYXNoLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJXQVNIXCI6IFwiV2FzaC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiV2EuXCI6IFwiV2FzaC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiV2EuMmRcIjogXCJXYXNoLiAyZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJXYXNoLlN0LlwiOiBcIldhc2guXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlduXCI6IFwiV2FzaC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiV24uIDJkXCI6IFwiV2FzaC4gMmRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiV24uMmRcIjogXCJXYXNoLiAyZFwifX1dLFxuICAgIFwiV2FzaC4gQXBwLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJXYXNoLiBBcHAuXCI6IFt7XCJ5ZWFyXCI6MTk2OSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6ZmFsc2UsIFwibW9udGhcIjpmYWxzZSwgXCJkYXlcIjpmYWxzZX1dfSxcbiAgICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3dhXCJdLFxuICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJXYXNoaW5ndG9uIEFwcGVsbGF0ZSBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJXLkFwcC5cIjogXCJXYXNoLiBBcHAuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiV2EuQS5cIjogXCJXYXNoLiBBcHAuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiV24uIEFwcC5cIjogXCJXYXNoLiBBcHAuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiV24uQXBwLlwiOiBcIldhc2guIEFwcC5cIn19XSxcbiAgICBcIldhc2guIFRlcnIuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJXYXNoLiBUZXJyLlwiOiBbe1wieWVhclwiOjE4NTQsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTg4OCwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3dhXCJdLFxuICAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiV2FzaGluZ3RvbiBUZXJyaXRvcnkgUmVwb3J0c1wiLFxuICAgICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIkFsbGVuXCI6IFwiV2FzaC4gVGVyci5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiVy5ULlwiOiBcIldhc2guIFRlcnIuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlcuVHkuUi5cIjogXCJXYXNoLiBUZXJyLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJXYXNoLlwiOiBcIldhc2guIFRlcnIuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIldhc2guVC5cIjogXCJXYXNoLiBUZXJyLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJXYXNoLlRlci5cIjogXCJXYXNoLiBUZXJyLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJXYXNoLlRlci5OLlMuXCI6IFwiV2FzaC4gVGVyci5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiV2FzaC5UeS5cIjogXCJXYXNoLiBUZXJyLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJXbi4gVGVyci5cIjogXCJXYXNoLiBUZXJyLlwifX1dLFxuICAgIFwiV2F0dHNcIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIldhdHRzXCI6IFt7XCJ5ZWFyXCI6MTgzMiwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODQwLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7cGFcIl0sXG4gICAgICAgICAgICAgICBcIm5hbWVcIjogXCJQZW5uc3lsdmFuaWEgU3RhdGUgUmVwb3J0cywgV2F0dHNcIixcbiAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJXYS5cIjogXCJXYXR0c1wiLCBcIldhdHRzKFBhLilcIjogXCJXYXR0c1wifX1dLFxuICAgIFwiV2F0dHMgJiBTZXJnLlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic3RhdGVcIixcbiAgICAgICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJXYXR0cyAmIFNlcmcuXCI6IFt7XCJ5ZWFyXCI6MTg0MSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTg0NSwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7cGFcIl0sXG4gICAgICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIlBlbm5zeWx2YW5pYSBTdGF0ZSBSZXBvcnRzLCBXYXR0cyAmIFNlcmdlYW50XCIsXG4gICAgICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJXLiYgUy5cIjogXCJXYXR0cyAmIFNlcmcuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiV2F0dHMgJiBTLlwiOiBcIldhdHRzICYgU2VyZy5cIn19XSxcbiAgICBcIldlbmQuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJXZW5kLlwiOiBbe1wieWVhclwiOjE4MjgsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTg0MSwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO255XCJdLFxuICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiV2VuZGVsbCdzIFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJXLlwiOiBcIldlbmQuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIldlbmQuKE4uWS4pXCI6IFwiV2VuZC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiV2VuZGVsbFwiOiBcIldlbmQuXCJ9fV0sXG4gICAgXCJXaGFydC5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJXaGFydC5cIjogW3tcInllYXJcIjoxODM1LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTg0MSwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztwYVwiXSxcbiAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJQZW5uc3lsdmFuaWEgU3RhdGUgUmVwb3J0cywgV2hhcnRvblwiLFxuICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJXaC5cIjogXCJXaGFydC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIldoYXIuXCI6IFwiV2hhcnQuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJXaGFydC5QYS5cIjogXCJXaGFydC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIldoYXJ0b25cIjogXCJXaGFydC5cIn19XSxcbiAgICBcIldoZWF0LlwiOiBbe1wiY2l0ZV90eXBlXCI6IFwic2NvdHVzX2Vhcmx5XCIsXG4gICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJXaGVhdC5cIjogW3tcInllYXJcIjoxODE2LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTgyNywgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztmZWRlcmFsO3N1cHJlbWUuY291cnRcIl0sXG4gICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiV2hlYXRvbidzIFN1cHJlbWUgQ291cnQgUmVwb3J0c1wiLFxuICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJVLlMuKFdoZWF0LilcIjogXCJXaGVhdC5cIiwgXCJXaGVhdG9uXCI6IFwiV2hlYXQuXCJ9fV0sXG4gICAgXCJXaGl0ZSAmIFcuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIldoaXRlICYgVy5cIjogW3tcInllYXJcIjoxODc2LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODgzLCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1czt0eFwiXSxcbiAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiQ29uZGVuc2VkIFJlcG9ydHMgb2YgRGVjaXNpb25zIGluIENpdmlsIENhdXNlcyBpbiB0aGUgQ291cnQgb2YgQXBwZWFscyBvZiBUZXhhcyAoV2hpdGUgJiBXaWxzb24pXCIsXG4gICAgICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJUZXguQS5DaXYuXCI6IFwiV2hpdGUgJiBXLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlRleC5BLkNpdi5DYXMuXCI6IFwiV2hpdGUgJiBXLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlRleC5BcHAuXCI6IFwiV2hpdGUgJiBXLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlRleC5DLkMuXCI6IFwiV2hpdGUgJiBXLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlRleC5DaXYuQ2FzLlwiOiBcIldoaXRlICYgVy5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJUZXguQ3QuQXBwLkRlYy5DaXYuXCI6IFwiV2hpdGUgJiBXLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlcuJiBXLlwiOiBcIldoaXRlICYgVy5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJXaGl0ZSAmIFcuKFRleC4pXCI6IFwiV2hpdGUgJiBXLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIldoaXRlICYgVy5DaXYuQ2FzLkN0LkFwcC5cIjogXCJXaGl0ZSAmIFcuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiV2kuJiBXaWxsLlwiOiBcIldoaXRlICYgVy5cIn19XSxcbiAgICBcIldpbGwuXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJXaWxsLlwiOiBbe1wieWVhclwiOjE4MDQsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTgwNSwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO21hXCJdLFxuICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiTWFzc2FjaHVzZXR0cyBSZXBvcnRzLCBXaWxsaWFtc1wiLFxuICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIk1hc3MuKFdpbGwuKVwiOiBcIldpbGwuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIldpbGwuTWFzcy5cIjogXCJXaWxsLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJXaWxsaWFtc1wiOiBcIldpbGwuXCJ9fV0sXG4gICAgXCJXaWxzb25cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJXaWxzb25cIjogW3tcInllYXJcIjoxODgzLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTg5MiwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1czt0eFwiXSxcbiAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJDb25kZW5zZWQgUmVwb3J0cyBvZiBEZWNpc2lvbnMgaW4gQ2l2aWwgQ2F1c2VzIGluIHRoZSBDb3VydCBvZiBBcHBlYWxzIG9mIFRleGFzIChXaWxzb24pXCIsXG4gICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHt9fV0sXG4gICAgXCJXaW4uXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIldpbi5cIjogW3tcInllYXJcIjoxODYzLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxODY0LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztuY1wiXSxcbiAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiTm9ydGggQ2Fyb2xpbmEgUmVwb3J0cywgV2luc3RvblwiLFxuICAgICAgICAgICAgICBcInZhcmlhdGlvbnNcIjoge319XSxcbiAgICBcIldpcy5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiV2lzLlwiOiBbe1wieWVhclwiOjE4NTMsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiV2lzLiAyZFwiOiBbe1wieWVhclwiOjE4NTMsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOmZhbHNlLCBcIm1vbnRoXCI6ZmFsc2UsIFwiZGF5XCI6ZmFsc2V9XX0sXG4gICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1czt3aVwiXSxcbiAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiV2lzY29uc2luIFJlcG9ydHNcIixcbiAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIlcuXCI6IFwiV2lzLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlcuMmRcIjogXCJXaXMuIDJkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiVy5SLlwiOiBcIldpcy5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJXaXMuMmRcIjogXCJXaXMuIDJkXCJ9fV0sXG4gICAgXCJXeW8uXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICBcImVkaXRpb25zXCI6IHtcIld5by5cIjogW3tcInllYXJcIjoxODcwLCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcInllYXJcIjoxOTU5LCBcIm1vbnRoXCI6MTEsIFwiZGF5XCI6MzF9XX0sXG4gICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1czt3eVwiXSxcbiAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiV3lvbWluZyBSZXBvcnRzXCIsXG4gICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJXLlwiOiBcIld5by5cIiwgXCJXeS5cIjogXCJXeW8uXCJ9fV0sXG4gICAgXCJZYXRlcyBTZWwuIENhcy5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgXCJlZGl0aW9uc1wiOiB7XCJZYXRlcyBTZWwuIENhcy5cIjogW3tcInllYXJcIjoxODA5LCBcIm1vbnRoXCI6MCwgXCJkYXlcIjoxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XCJ5ZWFyXCI6MTgwOSwgXCJtb250aFwiOjExLCBcImRheVwiOjMxfV19LFxuICAgICAgICAgICAgICAgICAgICAgICAgIFwibWx6X2p1cmlzZGljdGlvblwiOiBbXCJ1cztueVwiXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJZYXRlcycgU2VsZWN0IENhc2VzXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgXCJ2YXJpYXRpb25zXCI6IHtcIllhdGVzXCI6IFwiWWF0ZXMgU2VsLiBDYXMuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJZYXRlcyBTZWwuQ2FzLihOLlkuKVwiOiBcIllhdGVzIFNlbC4gQ2FzLlwifX1dLFxuICAgIFwiWWVhdGVzXCI6IFt7XCJjaXRlX3R5cGVcIjogXCJzdGF0ZVwiLFxuICAgICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiWWVhdGVzXCI6IFt7XCJ5ZWFyXCI6MTc5MSwgXCJtb250aFwiOjAsIFwiZGF5XCI6MX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4MDgsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgICBcIm1sel9qdXJpc2RpY3Rpb25cIjogW1widXM7cGFcIl0sXG4gICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiUGVubnN5bHZhbmlhIFN0YXRlIFJlcG9ydHMsIFllYXRlc1wiLFxuICAgICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJZLlwiOiBcIlllYXRlc1wiLCBcIlllYS5cIjogXCJZZWF0ZXNcIn19XSxcbiAgICBcIlllci5cIjogW3tcImNpdGVfdHlwZVwiOiBcInN0YXRlXCIsXG4gICAgICAgICAgICAgIFwiZWRpdGlvbnNcIjoge1wiWWVyLlwiOiBbe1wieWVhclwiOjE4MjgsIFwibW9udGhcIjowLCBcImRheVwiOjF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1wieWVhclwiOjE4MzcsIFwibW9udGhcIjoxMSwgXCJkYXlcIjozMX1dfSxcbiAgICAgICAgICAgICAgXCJtbHpfanVyaXNkaWN0aW9uXCI6IFtcInVzO3RuXCJdLFxuICAgICAgICAgICAgICBcIm5hbWVcIjogXCJUZW5uZXNzZWUgUmVwb3J0cywgWWVyZ2VyXCIsXG4gICAgICAgICAgICAgIFwidmFyaWF0aW9uc1wiOiB7XCJUZW5uLihZZXIuKVwiOiBcIlllci5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJZZXJnLlwiOiBcIlllci5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJZZXJnLihUZW5uLilcIjogXCJZZXIuXCJ9fV1cbn07XG5cbm1vZHVsZS5leHBvcnRzLnJlcG9ydGVycyA9IHJlcG9ydGVyczsiLCJ2YXIgXyA9IHJlcXVpcmUoJ3VuZGVyc2NvcmUnKTtcblxuV2FsdmVyaW5lQ2l0YXRpb24gPSBmdW5jdGlvbih2b2x1bWUsIHJlcG9ydGVyLCBwYWdlKSB7XG4gICAgLypcbiAgICAgKiBDb252ZW5pZW5jZSBjbGFzcyB3aGljaCByZXByZXNlbnRzIGEgc2luZ2xlIGNpdGF0aW9uIGZvdW5kIGluIGEgZG9jdW1lbnQuXG4gICAgICovXG4gICAgXG4gICAgLy8gTm90ZTogSXQgd2lsbCBiZSB0ZW1wdGluZyB0byByZXNvbHZlIHJlcG9ydGVyIHZhcmlhdGlvbnMgaW4gdGhlIF9faW5pdF9fIGZ1bmN0aW9uLCBidXQsIGFsYXMsIHlvdSBjYW5ub3QsXG4gICAgLy8gICAgICAgYmVjYXVzZSBvZnRlbiByZXBvcnRlciB2YXJpYXRpb25zIHJlZmVyIHRvIG9uZSBvZiBzZXZlcmFsIHJlcG9ydGVycyAoZS5nLiBQLlIuIGNvdWxkIGJlIGEgdmFyaWFudCBvZlxuICAgIC8vICAgICAgIGVpdGhlciBbJ1Blbi4gJiBXLicsICdQLlIuUi4nLCAnUC4nXSkuXG4gICAgdGhpcy52b2x1bWUgPSB2b2x1bWU7XG4gICAgdGhpcy5yZXBvcnRlciA9IHJlcG9ydGVyO1xuICAgIHRoaXMucGFnZSA9IHBhZ2U7XG4gICAgdGhpcy5sb29rdXBfaW5kZXggPSBudWxsO1xuICAgIHRoaXMuY2Fub25pY2FsX3JlcG9ydGVyID0gbnVsbDtcbiAgICB0aGlzLmV4dHJhID0gbnVsbDtcbiAgICB0aGlzLmRlZmVuZGFudCA9IG51bGw7XG4gICAgdGhpcy5wbGFpbnRpZmYgPSBudWxsO1xuICAgIHRoaXMuY291cnQgPSBudWxsO1xuICAgIHRoaXMueWVhciA9IG51bGw7XG4gICAgdGhpcy5tbHpfanVyaXNkaWN0aW9uID0gbnVsbDtcbiAgICB0aGlzLm1hdGNoX3VybCA9IG51bGw7XG4gICAgdGhpcy5lbmRfaWR4ID0gbnVsbDtcbiAgICB0aGlzLmNlcnRfb3JkZXIgPSBudWxsO1xuICAgIHRoaXMuZGlzcG9zaXRpb24gPSBudWxsO1xuICAgIHRoaXMuY2l0ZV90eXBlO1xuICAgIHRoaXMubWF0Y2g7XG59XG5cbldhbHZlcmluZUNpdGF0aW9uLnByb3RvdHlwZS5iYXNlX2NpdGF0aW9uID0gZnVuY3Rpb24gKCkge1xuICAgIC8vIFRoZSBDb21tb253ZWFsdGgganVyaXNkaWN0aW9ucyBoYXZlIGNpdGVzIGxpa2UgXCJTbWl0aCB2LiBKb25lcyBbMjAwN10gSEwgMTIzXCIuXG4gICAgdmFyIHZvbHVtZSA9IHRoaXMudm9sdW1lID8gdGhpcy52b2x1bWUgKyBcIiBcIiA6IFwiXCJcbiAgICByZXR1cm4gdm9sdW1lICsgdGhpcy5yZXBvcnRlciArIFwiIFwiICsgdGhpcy5wYWdlO1xufVxuXG5XYWx2ZXJpbmVDaXRhdGlvbi5wcm90b3R5cGUuYXNfcmVnZXggPSBmdW5jdGlvbiAoKSB7XG4gICAgLy8gU2hvdWxkIGluY2x1ZGUgdGhlIHllYXIsIGlmIG5vIHZvbHVtZSBhbmQgeWVhciBpcyBhIHByZWZpeFxuICAgIC8vIEZvcm0gd291bGQgYmUgc29tZXRoaW5nIGxpa2U6IFwiW1xcW1xcKF08eWVhcj5bXFxdXFwpXVxccys8cmVwb3J0ZXI+XFxzKzxwYWdlPlwiXG4gICAgdmFyIHZvbHVtZSA9IHRoaXMudm9sdW1lID8gdGhpcy52b2x1bWUgKyBcIihcXHMrKVwiIDogXCJcIlxuICAgIHZhciByZXQgPSBuZXcgUmVnRXhwKHZvbHVtZSArIHRoaXMucmVwb3J0ZXIgKyBcIihcXHMrKVwiICsgdGhpcy5wYWdlKTtcbn1cblxuV2FsdmVyaW5lQ2l0YXRpb24ucHJvdG90eXBlLmFzX2h0bWwgPSBmdW5jdGlvbiAoKSB7XG4gICAgLy8gQXMgYWJvdmUsIHNob3VsZCBpbmNsdWRlIHllYXIgaWYgaXQgc2VydmVzIGFzIGEgdm9sdW1lIG51bWJlciBmb3IgdGhpcyBqdXJpc2RpY3Rpb25cbiAgICB2YXIgdm9sdW1lID0gdGhpcy52b2x1bWUgPyAnPHNwYW4gY2xhc3M9XCJ2b2x1bWVcIj4nICsgdGhpcy52b2x1bWUgKyAnPC9zcGFuPicgOiBcIlwiXG4gICAgdmFyIGlubmVyX2h0bWwgPSB2b2x1bWVcbiAgICAgICAgKyAnPHNwYW4gY2xhc3M9XCJyZXBvcnRlclwiPicgKyB0aGlzLnJlcG9ydGVyICsgJzwvc3Bhbj4nXG4gICAgICAgICsgJzxzcGFuIGNsYXNzPVwicGFnZVwiPicgKyB0aGlzLnBhZ2UgKyAnPC9zcGFuPic7XG4gICAgdmFyIHNwYW5fY2xhc3MgPSBcImNpdGF0aW9uXCI7XG4gICAgaWYgKHRoaXMubWF0Y2hfdXJsKSB7XG4gICAgICAgIGlubmVyX2h0bWwgPSAnPGEgaHJlZj1cIicgKyB0aGlzLm1hdGNoX3VybCArICdcIj4nICsgaW5uZXJfaHRtbCArICc8L2E+JztcbiAgICB9IGVsc2Uge1xuICAgICAgICBzcGFuX2NsYXNzICs9IFwiIG5vLWxpbmtcIjtcbiAgICB9XG4gICAgcmV0dXJuICc8c3BhbiBjbGFzcz1cIicgKyBzcGFuX2NsYXNzICsgJ1wiPicgKyBpbm5lcl9odG1sICsgJzwvc3Bhbj4nXG59XG52YXIgV2FsdmVyaW5lID0ge1xuICAgIGJ1aWxkZXJzOiB7fSxcbiAgICBjb25zdGFudHM6IHt9LFxuICAgIHV0aWxzOiB7fSxcbiAgICBidWZmZXI6IDBcbn07XG5cbldhbHZlcmluZS5jb25zdGFudHMuRk9SV0FSRF9TRUVLID0gMjA7XG5XYWx2ZXJpbmUuY29uc3RhbnRzLkJBQ0tXQVJEX1NFRUsgPSAxMjA7XG5cbi8vIHRoaXMgY291bGQgYmUgaW1wcm92ZWRcbnZhciByZXBvcnRlcnMgPSByZXF1aXJlKCcuL3JlcG9ydGVycycpLnJlcG9ydGVycztcblxuV2FsdmVyaW5lLmNvbnN0YW50cy5SRVBPUlRFUlMgPSByZXBvcnRlcnM7XG5XYWx2ZXJpbmUuY29uc3RhbnRzLkpVUklTRElDVElPTlMgPSB7XG4gICAgJ3VzO2N0JzpbJ0Nvbm5lY3RpY3V0JyxcIkNvbm4uXCJdLFxuICAgICd1cztkZSc6WydEZWxhd2FyZScsXCJEZWwuXCJdLFxuICAgICd1cztkYyc6WydEaXN0cmljdCBvZiBDb2x1bWJpYScsXCJELkMuXCIsIFwiRENcIl0sXG4gICAgJ3VzO21lJzpbJ01haW5lJyxcIk1lLlwiXSxcbiAgICAndXM7bmgnOlsnTmV3IEhhbXBzaGlyZScsXCJOLkguXCJdLFxuICAgICd1cztuaic6WydOZXcgSmVyc2V5JyxcIk4uSi5cIl0sXG4gICAgJ3VzO3BhJzpbJ1Blbm5zeWx2YW5pYScsXCJQZW5uLlwiXSxcbiAgICAndXM7cmknOlsnUmhvZGUgSXNsYW5kJyxcIlIuSS5cIl0sXG4gICAgJ3VzO3Z0JzpbJ1Zlcm1vbnQnLFwiVnQuXCJdLFxuICAgICd1cztpbCc6WydJbGxpbm9pcycsXCJJbGwuXCJdLFxuICAgICd1cztpbic6WydJbmRpYW5hJyxcIkluZC5cIl0sXG4gICAgJ3VzO21hJzpbJ01hc3NhY2h1c3NldHRzJyxcIk1hc3MuXCJdLFxuICAgICd1czttZCc6WydNYXJ5bGFuZCcsXCJNZC5cIl0sXG4gICAgJ3VzO255JzpbJ05ldyBZb3JrJyxcIk4uWS5cIl0sXG4gICAgJ3VzO29oJzpbJ09oaW8nXSxcbiAgICAndXM7aWEnOlsnSW93YSddLFxuICAgICd1czttaSc6WydNaWNoaWdhbicsXCJNaWNoLlwiXSxcbiAgICAndXM7bW4nOlsnTWlubmlzb3RhJyxcIk1pbm4uXCJdLFxuICAgICd1cztuZSc6WydOZWJyYXNrYScsXCJOZWIuXCJdLFxuICAgICd1cztuZCc6WydOb3J0aCBEYWtvdGEnXSxcbiAgICAndXM7c2QnOlsnU291dGggRGFrb3RhJ10sXG4gICAgJ3VzO3dpJzpbJ1dpc2NvbnNpbicsXCJXaXMuXCIsXCJXaXNjLlwiXSxcbiAgICAndXM7YWsnOlsnQWxhc2thJyxcIkFsYS5cIl0sXG4gICAgJ3VzO2F6JzpbJ0FyaXpvbmEnLFwiQXJpei5cIl0sXG4gICAgJ3VzO2NhJzpbJ0NhbGlmb3JuaWEnLFwiQ2FsLlwiXSxcbiAgICAndXM7Y28nOlsnQ29sb3JhZG8nLFwiQ28uXCJdLFxuICAgICd1cztoaSc6W1wiSGF3YWknaVwiLFwiSGF3YWlpXCJdLFxuICAgICd1cztpZCc6WydJZGFobyddLFxuICAgICd1cztrcyc6WydLYW5zYXMnLFwiS2FuLlwiXSxcbiAgICAndXM7bXQnOlsnTW9udGFuYScsXCJNb24uXCIsXCJNb250LlwiXSxcbiAgICAndXM7bnYnOlsnTmV2YWRhJyxcIk5ldi5cIl0sXG4gICAgJ3VzO25tJzpbJ05ldyBNZXhpY28nLFwiTi5NLlwiXSxcbiAgICAndXM7b2snOlsnT2tsYWhvbWEnLFwiT2suXCJdLFxuICAgICd1cztvcic6WydPcmVnb24nLFwiT3IuXCJdLFxuICAgICd1czt1dCc6WydVdGFoJ10sXG4gICAgJ3VzO3dhJzpbJ1dhc2hpbmd0b24nLFwiV2EuXCIsXCJXYXNoLlwiXSxcbiAgICAndXM7d3knOlsnV3lvbWluZycsXCJXeS5cIixcIld5by5cIl0sXG4gICAgJ3VzO2dhJzpbJ0dlb3JnaWEnLFwiR2EuXCJdLFxuICAgICd1cztuYyc6WydOb3J0aCBDYXJvbGluYScsXCJOLkMuXCJdLFxuICAgICd1cztzYyc6WydTb3V0aCBDYXJvbGluYScsXCJTLkMuXCJdLFxuICAgICd1czt2YSc6WydWaXJnaW5pYScsXCJWYS5cIl0sXG4gICAgJ3VzO3d2JzpbJ1dlc3QgVmlyZ2luaWEnLFwiV2VzdCBWYS5cIixcIlcuIFZhLlwiLCBcIlcuVmEuXCJdLFxuICAgICd1czthcic6WydBcmthbnNhcycsXCJBcmsuXCJdLFxuICAgICd1cztreSc6WydLZW50dWNreScsXCJLZW4uXCJdLFxuICAgICd1czttbyc6WydNaXNzb3VyaScsXCJNby5cIl0sXG4gICAgJ3VzO3RuJzpbJ1Rlbm5lc3NlZScsXCJUZW5uLlwiXSxcbiAgICAndXM7dHgnOlsnVGV4YXMnLFwiVGV4LlwiXSxcbiAgICAndXM7YWwnOlsnQWxhYmFtYScsXCJBbGEuXCJdLFxuICAgICd1cztmbCc6WydGbG9yaWRhJyxcIkZsYS5cIl0sXG4gICAgJ3VzO2xhJzpbJ0xvdWlzaWFuYScsXCJMYS5cIl0sXG4gICAgJ3VzO21zJzpbJ01pc3Npc3NpcHBpJyxcIk1pc3MuXCJdLFxuICAgICd1cztmZWRlcmFsOzEtY2lyJzpbJ0ZpcnN0IENpcmN1aXQnLFwiMXN0IENpci5cIixcIjFzdCBDaXJcIixcIjEgQ2lyLlwiLFwiQ0ExXCJdLFxuICAgICd1cztmZWRlcmFsOzItY2lyJzpbJ1NlY29uZCBDaXJjdWl0JyxcIjJuZCBDaXIuXCIsXCIyZCBDaXJcIixcIjIgQ2lyLlwiLFwiQ0EyXCJdLFxuICAgICd1cztmZWRlcmFsOzMtY2lyJzpbJ1RoaXJkIENpcmN1aXQnLFwiM3JkIENpci5cIixcIjNkIENpclwiLFwiMyBDaXIuXCIsXCJDQTNcIl0sXG4gICAgJ3VzO2ZlZGVyYWw7NC1jaXInOlsnRm91cnRoIENpcmN1aXQnLFwiNHRoIENpci5cIixcIjR0aCBDaXJcIixcIjQgQ2lyLlwiLFwiQ0E0XCJdLFxuICAgICd1cztmZWRlcmFsOzUtY2lyJzpbJ0ZpZnRoIENpcmN1aXQnLFwiNXRoIENpci5cIixcIjV0aCBDaXJcIixcIjUgQ2lyLlwiLFwiQ0E1XCJdLFxuICAgICd1cztmZWRlcmFsOzYtY2lyJzpbJ1NpeHRoIENpcmN1aXQnLFwiNnRoIENpci5cIixcIjZ0aCBDaXJcIixcIjYgQ2lyLlwiLFwiQ0E2XCJdLFxuICAgICd1cztmZWRlcmFsOzctY2lyJzpbJ1NldmVudGggQ2lyY3VpdCcsXCI3dGggQ2lyLlwiLFwiN3RoIENpclwiLFwiNyBDaXIuXCIsXCJDQTdcIl0sXG4gICAgJ3VzO2ZlZGVyYWw7OC1jaXInOlsnRWlnaHRoIENpcmN1aXQnLFwiOHRoIENpci5cIixcIjh0aCBDaXJcIixcIjggQ2lyLlwiLFwiQ0E4XCJdLFxuICAgICd1cztmZWRlcmFsOzktY2lyJzpbJ05pbnRoIENpcmN1aXQnLFwiOXRoIENpci5cIixcIjl0aCBDaXJcIixcIjkgQ2lyLlwiLFwiQ0E5XCJdLFxuICAgICd1cztmZWRlcmFsOzEwLWNpcic6WydUZW50aCBDaXJjdWl0JyxcIjEwdGggQ2lyLlwiLFwiMTB0aCBDaXJcIixcIjEwIENpci5cIixcIkNBMTBcIl0sXG4gICAgJ3VzO2ZlZGVyYWw7MTEtY2lyJzpbJ0VsZXZlbnRoIENpcmN1aXQnLFwiMTF0aCBDaXIuXCIsXCIxMXRoIENpclwiLFwiMTEgQ2lyLlwiLFwiQ0ExMVwiXVxufTtcbldhbHZlcmluZS5jb25zdGFudHMuQUNDRVBUX1RPS0VOUyA9IFtcbiAgICAnSW4gUmUnLFxuICAgICdJbiByZScsXG4gICAgJ0V4IHBhcnRlJyxcbiAgICAnRXggUGFydGUnXG5dO1xuXG5XYWx2ZXJpbmUuY29uc3RhbnRzLlNUUklOR19UT0tFTlMgPSBbXG4gICAgJ2NlcnRpb3JhcmkgZGVuaWVkJyxcbiAgICAnY2VydC4gZGVuaWVkJyxcbiAgICAnZGVuaWVkJyxcbiAgICBcImFmZidkXCIsXG4gICAgXCJhZmZcXHUyMDE5ZFwiLFxuICAgICdhZmZpcm1lZCcsXG4gICAgJ3JlbWFuZGVkJyxcbiAgICAnY2VydGlvcmFyaSBncmFudGVkJyxcbiAgICAnY2VydC4gZ3JhbnRlZCcsXG4gICAgJ2dyYW50ZWQnLFxuICAgICdkaXNtaXNzZWQnLFxuICAgICdvcGluaW9uJyxcbiAgICAnZGlzbWlzc2VkIGJ5JyxcbiAgICAnbW9kaWZpZWQgYnknLFxuICAgICdhbWVuZGVkIGJ5JyxcbiAgICAnYWZmaXJtZWQgYnknLFxuICAgIFwiYWZmJ2QgYnlcIixcbiAgICAnYWZmXFx1MjAxOWQgYnknLFxuICAgICd2YWNhdGVkIGluJyxcbiAgICAndmFjYXRlZCBieSdcbl07XG5cbldhbHZlcmluZS5jb25zdGFudHMuRU1CRURERURfVE9LRU5TID0gW1xuICAgIFwib2YgdGhlXCIsXG4gICAgXCJvbiB0aGVcIixcbiAgICBcImV4IHJlbFwiLFxuICAgIFwiZXQgYWxcIixcbiAgICBcImV0IGFsLlwiLFxuICAgIFwiW05uXW8uPyArWzAtOV0rXCIsXG4gICAgXCJ0b1wiXG5dO1xuXG5XYWx2ZXJpbmUuY29uc3RhbnRzLlBSRVBPU0lUSU9OUyA9IFtcbiAgICBcImNpdGluZ1wiLFxuICAgIFwiaW5cIixcbiAgICBcImZvclwiLFxuICAgIFwiZnJvbVwiLFxuICAgIFwid2l0aFwiLFxuICAgIFwib3ZlclwiLFxuICAgIFwidGhhblwiLFxuICAgIFwiYnlcIixcbiAgICBcIkFjdC5cIlxuXTtcbldhbHZlcmluZS5idWlsZGVycy5tYWtlX3ZhcmlhbnRfa2V5ID0gZnVuY3Rpb24gKGtleSkge1xuICAgIGtleSA9IGtleS5yZXBsYWNlKFwiLlwiLCBcIiBcIiwgXCJnXCIpO1xuICAgIGtleSA9IGtleS5yZXBsYWNlKC9cXHMrL2csIFwiIFwiKTtcbiAgICBrZXkgPSBcIiBcIiArIGtleSArIFwiIFwiO1xuICAgIGtleSA9IGtleS5yZXBsYWNlKC8oW15hLXpBLVpdKShbQS1aXSlcXHMrKFtBLVpdKShbXkEtWmEtel0pL2csIFwiJDEkMiQzJDRcIik7XG4gICAga2V5ID0ga2V5LnJlcGxhY2UoL1xccysoW1xcXVxcKV0pL2csIFwiJDFcIik7XG4gICAga2V5ID0ga2V5LnJlcGxhY2UoL15cXHMrLywgXCJcIikucmVwbGFjZSgvXFxzKyQvLCBcIlwiKTtcbiAgICByZXR1cm4ga2V5O1xufTtcblxuV2FsdmVyaW5lLmJ1aWxkZXJzLm1ha2VfdmFyaWFudHMgPSBmdW5jdGlvbiAoUkVQT1JURVJTKSB7XG4gICAgZm9yICh2YXIgY2Fub25pY2FsX2tleSBpbiBSRVBPUlRFUlMpIHtcbiAgICAgICAgdmFyIGNhbm9uaWNhbF9zZWdtZW50ID0gUkVQT1JURVJTW2Nhbm9uaWNhbF9rZXldO1xuICAgICAgICBmb3IgKHZhciBpPTAsaWxlbj1jYW5vbmljYWxfc2VnbWVudC5sZW5ndGg7aTxpbGVuO2krPTEpIHtcbiAgICAgICAgICAgIHZhciBjbGFzc19lbnRyeSA9IGNhbm9uaWNhbF9zZWdtZW50W2ldO1xuICAgICAgICAgICAgdmFyIG5ld3ZhcnMgPSB7fTtcbiAgICAgICAgICAgIGZvciAodmFyIGtleSBpbiBjbGFzc19lbnRyeS5lZGl0aW9ucykge1xuICAgICAgICAgICAgICAgIHZhciBudmsgPSB0aGlzLm1ha2VfdmFyaWFudF9rZXkoa2V5KTtcbiAgICAgICAgICAgICAgICBpZiAoIWNsYXNzX2VudHJ5LmVkaXRpb25zW252a10gXG4gICAgICAgICAgICAgICAgICAgICYmICFjbGFzc19lbnRyeS52YXJpYXRpb25zW252a11cbiAgICAgICAgICAgICAgICAgICAgJiYgIW5ld3ZhcnNbbnZrXSkge1xuXG4gICAgICAgICAgICAgICAgICAgIG5ld3ZhcnNbbnZrXSA9IGtleTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3IgKHZhciBrZXkgaW4gY2xhc3NfZW50cnkudmFyaWF0aW9ucykge1xuICAgICAgICAgICAgICAgIHZhciBudmsgPSB0aGlzLm1ha2VfdmFyaWFudF9rZXkoa2V5KTtcbiAgICAgICAgICAgICAgICBpZiAoIWNsYXNzX2VudHJ5LmVkaXRpb25zW252a10gXG4gICAgICAgICAgICAgICAgICAgICYmICFjbGFzc19lbnRyeS52YXJpYXRpb25zW252a11cbiAgICAgICAgICAgICAgICAgICAgJiYgIW5ld3ZhcnNbbnZrXSkge1xuXG4gICAgICAgICAgICAgICAgICAgIG5ld3ZhcnNbbnZrXSA9IGNsYXNzX2VudHJ5LnZhcmlhdGlvbnNba2V5XTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3IgKHZhciBudmsgaW4gbmV3dmFycykge1xuICAgICAgICAgICAgICAgIGNsYXNzX2VudHJ5LnZhcmlhdGlvbnNbbnZrXSA9IG5ld3ZhcnNbbnZrXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn07XG4gICAgXG5XYWx2ZXJpbmUuYnVpbGRlcnMubWFrZV92YXJpYW50cyhXYWx2ZXJpbmUuY29uc3RhbnRzLlJFUE9SVEVSUyk7XG5XYWx2ZXJpbmUuYnVpbGRlcnMuc3Vja19vdXRfdmFyaWF0aW9uc19vbmx5ID0gZnVuY3Rpb24gKFJFUE9SVEVSUykge1xuICAgIC8qXG4gICAgICogIEJ1aWxkcyBhIGRpY3Rpb25hcnkgb2YgdmFyaWF0aW9ucyB0byBjYW5vbmljYWwgcmVwb3J0ZXJzLlxuICAgICAqXG4gICAgICogIFRoZSBkaWN0aW9uYXJ5IHRha2VzIHRoZSBmb3JtIG9mOlxuICAgICAqICAgICAge1xuICAgICAqICAgICAgICdBLiAyZCc6IFsnQS4yZCddLFxuICAgICAqICAgICAgIC4uLlxuICAgICAqICAgICAgICdQLlIuJzogWydQZW4uICYgVy4nLCAnUC5SLlIuJywgJ1AuJ10sXG4gICAgICogICAgICB9XG4gICAgICpcbiAgICAgKiAgSW4gb3RoZXIgd29yZHMsIGl0J3MgYSBkaWN0aW9uYXJ5IHRoYXQgbWFwcyBlYWNoIHZhcmlhdGlvbiB0byBhIGxpc3Qgb2ZcbiAgICAgKiAgcmVwb3J0ZXJzIHRoYXQgaXQgY291bGQgYmUgcG9zc2libHkgcmVmZXJyaW5nIHRvLlxuICAgICAqL1xuICAgIHZhciB2YXJpYXRpb25zX291dCA9IHt9O1xuICAgIGZvciAodmFyIHJlcG9ydGVyX2tleSBpbiBSRVBPUlRFUlMpIHtcbiAgICAgICAgLy8gRm9yIGVhY2ggcmVwb3J0ZXIga2V5IC4uLlxuICAgICAgICB2YXIgZGF0YV9saXN0ID0gUkVQT1JURVJTW3JlcG9ydGVyX2tleV07XG4gICAgICAgIGZvciAodmFyIGk9MCxpbGVuPWRhdGFfbGlzdC5sZW5ndGg7aTxpbGVuO2krPTEpIHtcbiAgICAgICAgICAgIGRhdGEgPSBkYXRhX2xpc3RbaV07XG4gICAgICAgICAgICAvLyBGb3IgZWFjaCBib29rIGl0IG1hcHMgdG8uLi5cbiAgICAgICAgICAgIGZvciAodmFyIHZhcmlhdGlvbl9rZXkgaW4gZGF0YS52YXJpYXRpb25zKSB7XG4gICAgICAgICAgICAgICAgdmFyIHZhcmlhdGlvbl92YWx1ZSA9IGRhdGEudmFyaWF0aW9uc1t2YXJpYXRpb25fa2V5XTtcbiAgICAgICAgICAgICAgICBpZiAoXCJ1bmRlZmluZWRcIiAhPT0gdHlwZW9mIHZhcmlhdGlvbnNfb3V0W3ZhcmlhdGlvbl9rZXldKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciB2YXJpYXRpb25zX2xpc3QgPSB2YXJpYXRpb25zX291dFt2YXJpYXRpb25fa2V5XTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHZhcmlhdGlvbnNfbGlzdC5pbmRleE9mKHZhcmlhdGlvbl92YWx1ZSkgPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXJpYXRpb25zX2xpc3QucHVzaCh2YXJpYXRpb25fdmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVGhlIGl0ZW0gd2Fzbid0IHRoZXJlOyBhZGQgaXQuXG4gICAgICAgICAgICAgICAgICAgIHZhcmlhdGlvbnNfb3V0W3ZhcmlhdGlvbl9rZXldID0gW3ZhcmlhdGlvbl92YWx1ZV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB2YXJpYXRpb25zX291dDtcbn1cblxuV2FsdmVyaW5lLmNvbnN0YW50cy5WQVJJQVRJT05TX09OTFkgPSBXYWx2ZXJpbmUuYnVpbGRlcnMuc3Vja19vdXRfdmFyaWF0aW9uc19vbmx5KFdhbHZlcmluZS5jb25zdGFudHMuUkVQT1JURVJTKTtcbldhbHZlcmluZS5idWlsZGVycy5zdWNrX291dF9jb3VydHMgPSBmdW5jdGlvbihKVVJJU0RJQ1RJT05TKSB7XG4gICAgdmFyIENPVVJUUyA9IHt9O1xuICAgIGZvciAodmFyIGtleSBpbiBKVVJJU0RJQ1RJT05TKSB7XG4gICAgICAgIGZvciAodmFyIGk9MCxpbGVuPUpVUklTRElDVElPTlNba2V5XS5sZW5ndGg7aTxpbGVuO2krPTEpIHtcbiAgICAgICAgICAgIHZhciBjb3VydCA9IEpVUklTRElDVElPTlNba2V5XVtpXTtcbiAgICAgICAgICAgIENPVVJUU1tjb3VydF0gPSB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBDT1VSVFM7XG59XG5cbldhbHZlcmluZS5jb25zdGFudHMuQ09VUlRTID0gV2FsdmVyaW5lLmJ1aWxkZXJzLnN1Y2tfb3V0X2NvdXJ0cyhXYWx2ZXJpbmUuY29uc3RhbnRzLkpVUklTRElDVElPTlMpO1xuV2FsdmVyaW5lLmJ1aWxkZXJzLnN1Y2tfb3V0X25ldXRyYWxzID0gZnVuY3Rpb24gKFJFUE9SVEVSUykge1xuICAgIC8qXG4gICAgICogIEJ1aWxkcyBhIHNtYWxsIGRpY3Rpb25hcnkgb2YgbmV1dHJhbCByZXBvcnRlciBrZXlzXG4gICAgICpcbiAgICAgKiAgVGhlIGRpY3Rpb25hcnkgdGFrZXMgdGhlIGZvcm0gb2Y6XG4gICAgICogICAgICB7XG4gICAgICogICAgICAgJ0FaJzogdHJ1ZSxcbiAgICAgKiAgICAgICAuLi5cbiAgICAgKiAgICAgICAnT0snOiB0cnVlXG4gICAgICogICAgICB9XG4gICAgICpcbiAgICAgKi9cbiAgICB2YXIgbmV1dHJhbHMgPSB7fTtcbiAgICBmb3IgKHZhciByZXBvcnRlcl9rZXkgaW4gUkVQT1JURVJTKSB7XG4gICAgICAgIC8vIEZvciBlYWNoIHJlcG9ydGVyIGtleSAuLi5cbiAgICAgICAgdmFyIGRhdGFfbGlzdCA9IFJFUE9SVEVSU1tyZXBvcnRlcl9rZXldO1xuICAgICAgICBmb3IgKHZhciBpPTAsaWxlbj1kYXRhX2xpc3QubGVuZ3RoO2k8aWxlbjtpKz0xKSB7XG4gICAgICAgICAgICBkYXRhID0gZGF0YV9saXN0W2ldO1xuICAgICAgICAgICAgLy8gRm9yIGVhY2ggYm9vayBpdCBtYXBzIHRvLi4uXG4gICAgICAgICAgICBpZiAoZGF0YS5jaXRlX3R5cGUgPT09IFwibmV1dHJhbFwiKSB7XG4gICAgICAgICAgICAgICAgLy8gU28gZmFyLCBhdCBsZWFzdCwgbmV1dHJhbHMgYW5kIHRoZWlyIHZhcmlhdGlvbnMgYXJlIHVuYW1iaWd1b3VzLlxuICAgICAgICAgICAgICAgIGZvciAodmFyIGtleSBpbiBkYXRhLmVkaXRpb25zKSB7XG4gICAgICAgICAgICAgICAgICAgIG5ldXRyYWxzW2tleV0gPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBmb3IgKHZhciBrZXkgaW4gZGF0YS52YXJpYXRpb25zKSB7XG4gICAgICAgICAgICAgICAgICAgIG5ldXRyYWxzW2tleV0gPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbmV1dHJhbHM7XG59XG5cbldhbHZlcmluZS5jb25zdGFudHMuTkVVVFJBTFMgPSBXYWx2ZXJpbmUuYnVpbGRlcnMuc3Vja19vdXRfbmV1dHJhbHMoV2FsdmVyaW5lLmNvbnN0YW50cy5SRVBPUlRFUlMpO1xuV2FsdmVyaW5lLmJ1aWxkZXJzLnN1Y2tfb3V0X2VkaXRpb25zID0gZnVuY3Rpb24oUkVQT1JURVJTKSB7XG4gICAgLypcbiAgICAgKiAgQnVpbGRzIGEgZGljdGlvbmFyeSBtYXBwaW5nIGVkaXRpb24ga2V5cyB0byB0aGVpciByb290IG5hbWUuXG4gICAgICpcbiAgICAgKiAgVGhlIGRpY3Rpb25hcnkgdGFrZXMgdGhlIGZvcm0gb2Y6XG4gICAgICogICAgICB7XG4gICAgICogICAgICAgJ0EuJzogICAnQS4nLFxuICAgICAqICAgICAgICdBLjJkJzogJ0EuJyxcbiAgICAgKiAgICAgICAnQS4zZCc6ICdBLicsXG4gICAgICogICAgICAgJ0EuRC4nOiAnQS5ELicsXG4gICAgICogICAgICAgLi4uXG4gICAgICogICAgICB9XG5cbiAgICAgKiAgSW4gb3RoZXIgd29yZHMsIHRoaXMgbGV0cyB5b3UgZ28gZnJvbSBhbiBlZGl0aW9uIG1hdGNoIHRvIGl0cyBwYXJlbnQga2V5LlxuICAgICAqL1xuICAgIHZhciBlZGl0aW9uc19vdXQgPSB7fTtcbiAgICBmb3IgKHZhciByZXBvcnRlcl9rZXkgaW4gUkVQT1JURVJTKSB7XG4gICAgICAgIC8vIEZvciBlYWNoIHJlcG9ydGVyIGtleSAuLi5cbiAgICAgICAgdmFyIGRhdGFfbGlzdCA9IFJFUE9SVEVSU1tyZXBvcnRlcl9rZXldO1xuICAgICAgICBmb3IgKHZhciBpPTAsaWxlbj1kYXRhX2xpc3QubGVuZ3RoO2k8aWxlbjtpKz0xKSB7XG4gICAgICAgICAgICB2YXIgZGF0YSA9IGRhdGFfbGlzdFtpXTtcbiAgICAgICAgICAgIGZvciAodmFyIGVkaXRpb25fa2V5IGluIGRhdGEuZWRpdGlvbnMpIHtcbiAgICAgICAgICAgICAgICAvLyBGb3IgZWFjaCBib29rIGl0IG1hcHMgdG8uLi5cbiAgICAgICAgICAgICAgICB2YXIgZWRpdGlvbl92YWx1ZSA9IGRhdGEuZWRpdGlvbnNbZWRpdGlvbl92YWx1ZV07XG4gICAgICAgICAgICAgICAgaWYgKFwidW5kZWZpbmVkXCIgPT09IHR5cGVvZiBlZGl0aW9uc19vdXRbZWRpdGlvbl9rZXldKSB7XG4gICAgICAgICAgICAgICAgICAgIGVkaXRpb25zX291dFtlZGl0aW9uX2tleV0gPSByZXBvcnRlcl9rZXk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBlZGl0aW9uc19vdXQ7XG59XG5cbldhbHZlcmluZS5jb25zdGFudHMuRURJVElPTlMgPSBXYWx2ZXJpbmUuYnVpbGRlcnMuc3Vja19vdXRfZWRpdGlvbnMoV2FsdmVyaW5lLmNvbnN0YW50cy5SRVBPUlRFUlMpO1xuLy8gV2UgbmVlZCB0byBidWlsZCBhIFJFR0VYIHRoYXQgaGFzIGFsbCB0aGUgdmFyaWF0aW9ucyBhbmQgdGhlIHJlcG9ydGVycyBpbl8gb3JkZXIgZnJvbSBsb25nZXN0IHRvIHNob3J0ZXN0LlxuXG5XYWx2ZXJpbmUuYnVpbGRlcnMubWFrZV9yZWdleCA9IGZ1bmN0aW9uIChjb25zdGFudHMpIHtcbiAgICB2YXIgRURJVElPTlMgPSBjb25zdGFudHMuRURJVElPTlM7XG4gICAgdmFyIFZBUklBVElPTlNfT05MWSA9IGNvbnN0YW50cy5WQVJJQVRJT05TX09OTFk7XG4gICAgdmFyIEFDQ0VQVF9UT0tFTlMgPSBjb25zdGFudHMuQUNDRVBUX1RPS0VOUztcbiAgICB2YXIgRU1CRURERURfVE9LRU5TID0gY29uc3RhbnRzLkVNQkVEREVEX1RPS0VOUztcbiAgICB2YXIgU1RSSU5HX1RPS0VOUyA9IGNvbnN0YW50cy5TVFJJTkdfVE9LRU5TO1xuXG4gICAgLy92YXIgUkVHRVhfTElTVCA9IFtrZXkgZm9yIChrZXkgaW4gRURJVElPTlMpXS5jb25jYXQoW2tleSBmb3IgKGtleSBpbiBWQVJJQVRJT05TX09OTFkpXSk7XG5cbiAgICB2YXIgUkVHRVhfTElTVCA9IF8ua2V5cyhFRElUSU9OUykuY29uY2F0KF8ua2V5cyhWQVJJQVRJT05TX09OTFkpKTtcblxuICAgIC8qXG4gICAgUkVHRVhfTElTVCA9IFJFR0VYX0xJU1RcbiAgICAgICAgLmNvbmNhdChbQUNDRVBUX1RPS0VOU1tpXSBmb3IgKGkgaW4gQUNDRVBUX1RPS0VOUyldKVxuICAgICAgICAuY29uY2F0KFtFTUJFRERFRF9UT0tFTlNbaV0gZm9yIChpIGluIEVNQkVEREVEX1RPS0VOUyldKVxuICAgICAgICAuY29uY2F0KFtTVFJJTkdfVE9LRU5TW2ldIGZvciAoaSBpbiBTVFJJTkdfVE9LRU5TKV0pO1xuICAgICovXG5cbiAgICBSRUdFWF9MSVNUID0gUkVHRVhfTElTVC5jb25jYXQoQUNDRVBUX1RPS0VOUyk7XG4gICAgUkVHRVhfTElTVCA9IFJFR0VYX0xJU1QuY29uY2F0KEVNQkVEREVEX1RPS0VOUyk7XG4gICAgUkVHRVhfTElTVCA9IFJFR0VYX0xJU1QuY29uY2F0KFNUUklOR19UT0tFTlMpO1xuXG4gICAgZm9yICh2YXIgaT0wLGlsZW49UkVHRVhfTElTVC5sZW5ndGg7aTxpbGVuO2krPTEpIHtcbiAgICAgICAgaWYgKFJFR0VYX0xJU1RbaV0uc2xpY2UoLTEpICE9PSBcIi5cIiAmJiBSRUdFWF9MSVNUW2ldLnNsaWNlKC0xKSAhPT0gXCIgXCIpIHtcbiAgICAgICAgICAgIC8vIFByZXZlbnQgbWlkLXdvcmQgbWF0Y2hlc1xuICAgICAgICAgICAgUkVHRVhfTElTVFtpXSA9IFwiIFwiICArIFJFR0VYX0xJU1RbaV0gKyBcIiBcIjtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICBSRUdFWF9MSVNULnNvcnQoXG4gICAgICAgIGZ1bmN0aW9uIChhLGIpIHtcbiAgICAgICAgICAgIGlmIChhLmxlbmd0aCA8IGIubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGEubGVuZ3RoID4gYi5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gLTE7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgKTtcbiAgICAvKlxuICAgIHZhciBSRUdFWF9TVFIgPSBbUkVHRVhfTElTVFtpXS5yZXBsYWNlKFwiLlwiLFwiXFxcXC5cIixcImdcIikucmVwbGFjZShcIihcIixcIlxcXFwoXCIsXCJnXCIpLnJlcGxhY2UoXCIpXCIsXCJcXFxcKVwiLFwiZ1wiKS5yZXBsYWNlKFwiXFwnXCIsIFwiXFxcXCdcIixcImdcIikgZm9yIChpIGluIFJFR0VYX0xJU1QpXS5qb2luKFwifFwiKTtcblxuICAgIHZhciBSRUdFWF9TVFIgPSBbUkVHRVhfTElTVFtpXVxuICAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoXCIuXCIsXCJcXFxcLlwiLFwiZ1wiKVxuICAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoXCIoXCIsXCJcXFxcKFwiLFwiZ1wiKVxuICAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoXCIpXCIsXCJcXFxcKVwiLFwiZ1wiKVxuICAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoXCJcXCdcIiwgXCJcXFxcJ1wiLFwiZ1wiKSBmb3IgKGkgaW4gUkVHRVhfTElTVCldLmpvaW4oXCJ8XCIpO1xuXG4gICAgKi9cbiAgICB2YXIgUkVHRVhfU1RSID0gXy5tYXAoUkVHRVhfTElTVCwgZnVuY3Rpb24oaSkge1xuICAgICAgcmV0dXJuIGkucmVwbGFjZShcIi5cIixcIlxcXFwuXCIsXCJnXCIpLnJlcGxhY2UoXCIoXCIsXCJcXFxcKFwiLFwiZ1wiKS5yZXBsYWNlKFwiKVwiLFwiXFxcXClcIixcImdcIikucmVwbGFjZShcIlxcJ1wiLCBcIlxcXFwnXCIsXCJnXCIpO1xuICAgIH0pLmpvaW4oXCJ8XCIpO1xuXG4gICAgY29uc3RhbnRzLlJFUE9SVEVSX1JFID0gbmV3IFJlZ0V4cChcIihcIiArIFJFR0VYX1NUUiArIFwiKVwiKTtcblxuXG59XG5cbldhbHZlcmluZS5idWlsZGVycy5tYWtlX3JlZ2V4KFdhbHZlcmluZS5jb25zdGFudHMpO1xuV2FsdmVyaW5lLnV0aWxzLnN0cmlwX3B1bmN0ID0gZnVuY3Rpb24gKHRleHQpIHtcbiAgICAvL3N0YXJ0aW5nIHF1b3Rlc1xuICAgIHRleHQgPSB0ZXh0LnJlcGxhY2UoL15cXFwiL2csIFwiXCIpO1xuICAgIHRleHQgPSB0ZXh0LnJlcGxhY2UoLyhgYCkvZywgXCJcIik7XG4gICAgdGV4dCA9IHRleHQucmVwbGFjZSgvKFsgKFxcW3s8XSlcIi9nLCAnJylcblxuICAgIC8vcHVuY3R1YXRpb25cbiAgICB0ZXh0ID0gdGV4dC5yZXBsYWNlKC9cXC5cXC5cXC4vZywgJycpXG4gICAgdGV4dCA9IHRleHQucmVwbGFjZSgvWyw7OkAjJCUmXS9nLCAnJylcbiAgICB0ZXh0ID0gdGV4dC5yZXBsYWNlKC8oW15cXC5dKShcXC4pKFtcXF1cXCl9PlwiXFwnXSopXFxzKiQvZywgJyQxJylcbiAgICB0ZXh0ID0gdGV4dC5yZXBsYWNlKC9bPyFdL2csICcnKVxuICAgIFxuICAgIC8vIFhYWCBXaGF0IGRpZCBJIGFkZCB0aGlzIGZvcj8gQXMgd3JpdHRlbiwgaXQncyBvbmx5IGVmZmVjdCB3aWxsIGJlIHRvIGJyZWFrIHRoaW5ncy5cbiAgICB0ZXh0ID0gdGV4dC5yZXBsYWNlKC8oW14nXSknIC9nLCBcIlwiKVxuXG4gICAgLy9wYXJlbnMsIGJyYWNrZXRzLCBldGMuXG4gICAgdGV4dCA9IHRleHQucmVwbGFjZSgvW1xcXVxcW1xcKFxcKVxce1xcfVxcPFxcPl0vZywgJycpXG4gICAgdGV4dCA9IHRleHQucmVwbGFjZSgvLS0vZywgJycpXG4gICAgXG4gICAgLy9lbmRpbmcgcXVvdGVzXG4gICAgdGV4dCA9IHRleHQucmVwbGFjZSgvXFxcIi9nLCBcIlwiKVxuICAgIHRleHQgPSB0ZXh0LnJlcGxhY2UoLyhcXFMpKFxcJ1xcJykvZywgJycpXG4gICAgXG4gICAgcmV0dXJuIHRleHQucmVwbGFjZSgvXlxccysvLCBcIlwiKS5yZXBsYWNlKC9cXHMrJC8sIFwiXCIpO1xufTtcblxuICAgIFxuV2FsdmVyaW5lLnV0aWxzLmdldF92aXNpYmxlX3RleHQgPSBmdW5jdGlvbiAodGV4dCkge1xuICAgIHZhciB0ZXh0ID0gdGV4dC5yZXBsYWNlKC88KD86c3R5bGV8U1RZTEUpW14+XSo+Lio/PFxcLyg/OnN0eWxlfFNUWUxFKT4vZywgXCIgXCIpO1xuICAgIHRleHQgPSB0ZXh0LnJlcGxhY2UoLzxbQWFdIFtePl0rPlteIF0rPFxcL1tBYV0+L2csIFwiIFwiKTsgXG4gICAgdGV4dCA9IHRleHQucmVwbGFjZSgvPFtePl0qPi9nLCBcIlwiKTtcbiAgICB0ZXh0ID0gdGV4dC5yZXBsYWNlKFwiXFxuXCIsXCIgXCIsXCJnXCIpO1xuICAgIHRleHQgPSB0ZXh0LnJlcGxhY2UoXCIgXCIsXCIgXCIsXCJnXCIpO1xuICAgIHJldHVybiB0ZXh0O1xufTtcblxuV2FsdmVyaW5lLnV0aWxzLnNldF9qdXJpc2RpY3Rpb24gPSBmdW5jdGlvbiAoY2l0YXRpb24sIGp1cmlzZGljdGlvbikge1xuICAgIGlmICghY2l0YXRpb24ubWx6X2p1cmlzZGljdGlvbikge1xuICAgICAgICBjaXRhdGlvbi5tbHpfanVyaXNkaWN0aW9uID0ganVyaXNkaWN0aW9uO1xuICAgIH1cbn07XG5cbldhbHZlcmluZS51dGlscy5pc19kYXRlX2luX3JlcG9ydGVyID0gZnVuY3Rpb24gKGVkaXRpb25zLCB5ZWFyKSB7XG4gICAgLypcbiAgICAgKiAgQ2hlY2tzIHdoZXRoZXIgYSB5ZWFyIGZhbGxzIHdpdGhpbiB0aGUgcmFuZ2Ugb2YgMSB0byBuIGVkaXRpb25zIG9mIGEgcmVwb3J0ZXJcbiAgICAgKlxuICAgICAqICBFZGl0aW9ucyB3aWxsIGxvb2sgc29tZXRoaW5nIGxpa2U6XG4gICAgICogICAgICAnZWRpdGlvbnMnOiB7J1MuRS4nOiAoZGF0ZXRpbWUuZGF0ZSgxODg3LCAxLCAxKSxcbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRldGltZS5kYXRlKDE5MzksIDEyLCAzMSkpLFxuICAgICAqICAgICAgICAgICAgICAgICAgICdTLkUuMmQnOiAoZGF0ZXRpbWUuZGF0ZSgxOTM5LCAxLCAxKSxcbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGV0aW1lLmRhdGUudG9kYXkoKSl9LFxuICAgICAqL1xuICAgIGZvciAodmFyIGtleSBpbiBlZGl0aW9ucykge1xuICAgICAgICB2YXIgc3RhcnQgPSBlZGl0aW9uc1trZXldWzBdO1xuICAgICAgICB2YXIgZW5kID0gZWRpdGlvbnNba2V5XVsxXTtcbiAgICAgICAgdmFyIG5vdyA9IG5ldyBEYXRlKCk7XG4gICAgICAgIHZhciBzdGFydF95ZWFyID0gc3RhcnQueWVhciA/IHN0YXJ0LnllYXIgOiBub3cuZ2V0RnVsbFllYXIoKTtcbiAgICAgICAgdmFyIGVuZF95ZWFyID0gZW5kLnllYXIgPyBlbmQueWVhciA6IG5vdy5nZXRGdWxsWWVhcigpO1xuICAgICAgICBpZiAoc3RhcnRfeWVhciA8PSB5ZWFyICYmIHllYXIgPD0gZW5kX3llYXIpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbn07XG5XYWx2ZXJpbmUuZ2V0X2NvdXJ0ID0gZnVuY3Rpb24gKHBhcmVuX3N0cmluZywgeWVhcikge1xuICAgIHZhciBjb3VydDtcbiAgICBpZiAoIXllYXIpIHtcbiAgICAgICAgY291cnQgPSBwYXJlbl9zdHJpbmcucmVwbGFjZSgvKD86LFxccyopKixcXHMqJC8sXCJcIikucmVwbGFjZSgvXlxccypcXCgvLFwiXCIpLnJlcGxhY2UoL1xcKVxccyokLyxcIlwiKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgeWVhcl9pbmRleCA9IHBhcmVuX3N0cmluZy5pbmRleE9mKChcIlwiICsgeWVhcikpO1xuICAgICAgICBjb3VydCA9IHBhcmVuX3N0cmluZy5zbGljZSgwLHllYXJfaW5kZXgpO1xuICAgICAgICBjb3VydCA9IGNvdXJ0LnJlcGxhY2UoL15cXHMqXFwoXFxzKi8sIFwiXCIpLnJlcGxhY2UoLyxcXHMqLFxccyokLyxcIlwiKTtcbiAgICB9XG4gICAgaWYgKGNvdXJ0ID09PSBcIlwiKSB7XG4gICAgICAgIGNvdXJ0ID0gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIGNvdXJ0O1xufTtcblxuV2FsdmVyaW5lLmdldF95ZWFyID0gZnVuY3Rpb24gKHRva2VuKSB7XG4gICAgLypcbiAgICAgKiAgR2l2ZW4gYSBzdHJpbmcgdG9rZW4sIGxvb2sgZm9yIGEgdmFsaWQgNC1kaWdpdCBudW1iZXIgYXQgdGhlIHN0YXJ0IGFuZFxuICAgICAqICByZXR1cm4gaXRzIHZhbHVlLlxuICAgICAqL1xuICAgIHZhciBzdHJpcF9wdW5jdCA9IHRoaXMudXRpbHMuc3RyaXBfcHVuY3Q7XG5cbiAgICB2YXIgeWVhcjtcbiAgICB2YXIgdG9rZW4gPSBzdHJpcF9wdW5jdCh0b2tlbik7XG4gICAgdmFyIG0gPSB0b2tlbi5tYXRjaCgvLio/KFswLTldezR9KS8pO1xuICAgIGlmIChtKSB7XG4gICAgICAgIHllYXIgPSBwYXJzZUludChtWzFdLCAxMCk7XG4gICAgICAgIGlmICh5ZWFyIDwgMTc1NCkge1xuICAgICAgICAgICAgeWVhciA9IG51bGw7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHllYXI7XG59O1xuXG5XYWx2ZXJpbmUuZ2V0X3ByZV9jaXRhdGlvbiA9IGZ1bmN0aW9uIChjaXRhdGlvbiwgY2l0YXRpb25zLCB3b3JkcywgcmVwb3J0ZXJfaW5kZXgpIHtcbiAgICAvLyBUaGVyZSBhcmUgRmVkZXJhbCBDaXJjdWl0IGRlY2lzaW9ucyB0aGF0IGhhdmUgYSBmb3JtXG4gICAgLy8gbGlrZSB0aGlzOiBcbiAgICAvL1xuICAgIC8vICAgICBcIlNtaXRoIHYuIEpvbmVzLCAybmQgQ2lyLiwgMTk1NSwgMTIzIEYuMmQgNDU2XCIuXG4gICAgLy9cbiAgICB2YXIgcHJlb2Zmc2V0ID0gMDtcbiAgICB2YXIgcG9zID0gcmVwb3J0ZXJfaW5kZXggLSAyO1xuXG4gICAgdmFyIHByZXZfaWR4ID0gY2l0YXRpb25zLmxlbmd0aCA/IGNpdGF0aW9uc1tjaXRhdGlvbnMubGVuZ3RoIC0gMV0uZW5kX2lkeCA6IDA7XG4gICAgaWYgKHBvcyA8IDMgfHwgcG9zID09IHByZXZfaWR4KSB7XG4gICAgICAgIHJldHVybiBwcmVvZmZzZXQ7XG4gICAgfVxuXG4gICAgdmFyIG0gPSB3b3Jkc1twb3NdLm1hdGNoKC9eWyhdKihbMC05XXs0fSlbLCldKyQvKTtcbiAgICBpZiAobSkge1xuICAgICAgICBwcmVvZmZzZXQgPSAxO1xuICAgICAgICBjaXRhdGlvbi55ZWFyID0gbVsxXTtcbiAgICAgICAgaWYgKHdvcmRzW3Bvc10uc2xpY2UoLTEpICE9PSBcIilcIiAmJiB3b3Jkc1twb3MgLSAxXS5zbGljZSgtMSkgIT09IFwiLFwiKSB7XG4gICAgICAgICAgICByZXR1cm4gcHJlb2Zmc2V0O1xuICAgICAgICB9XG4gICAgICAgIC8vIFRyeSBmb3IgYSBjb3VydFxuICAgICAgICB2YXIgbmV3b2Zmc2V0ID0gMDtcbiAgICAgICAgdmFyIG1heWJlY291cnQgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgaT1wb3MtMSxpbGVuPXBvcy00O2k+aWxlbjtpKz0tMSkge1xuICAgICAgICAgICAgaWYgKGkgPT0gcHJldl9pZHgpIGJyZWFrO1xuICAgICAgICAgICAgbWF5YmVjb3VydC5yZXZlcnNlKCk7XG4gICAgICAgICAgICBtYXliZWNvdXJ0LnB1c2god29yZHNbaV0pO1xuICAgICAgICAgICAgbWF5YmVjb3VydC5yZXZlcnNlKCk7XG4gICAgICAgICAgICBpZiAodGhpcy5tYXRjaF9qdXJpc2RpY3Rpb24oY2l0YXRpb24sIG1heWJlY291cnQuam9pbihcIiBcIikpKSB7XG4gICAgICAgICAgICAgICAgbmV3b2Zmc2V0ID0gcG9zLWk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG5ld29mZnNldCkge1xuICAgICAgICAgICAgcHJlb2Zmc2V0ID0gbmV3b2Zmc2V0KzE7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHByZW9mZnNldDtcbiAgICB9XG4gICAgcmV0dXJuIHByZW9mZnNldDtcbn07XG5cbldhbHZlcmluZS5jYXJyeV9mb3J3YXJkID0gZnVuY3Rpb24gKGNpdGF0aW9ucywgcG9zKSB7XG4gICAgY2l0YXRpb25zW3Bvc10ucGxhaW50aWZmID0gY2l0YXRpb25zW3BvcyAtIDFdLnBsYWludGlmZjtcbiAgICBjaXRhdGlvbnNbcG9zXS5kZWZlbmRhbnQgPSBjaXRhdGlvbnNbcG9zIC0gMV0uZGVmZW5kYW50O1xuICAgIHRoaXMuYXBwbHlfanVyaXNkaWN0aW9uKGNpdGF0aW9uc1twb3NdLCBjaXRhdGlvbnNbcG9zIC0gMV0ubWx6X2p1cmlzZGljdGlvbik7XG4gICAgdGhpcy5hcHBseV95ZWFyKGNpdGF0aW9uc1twb3NdLCBjaXRhdGlvbnNbcG9zIC0gMV0ueWVhcik7XG59O1xuXG5XYWx2ZXJpbmUuYXBwbHlfanVyaXNkaWN0aW9uID0gZnVuY3Rpb24gKGNpdGF0aW9uLCBqdXJpc2RpY3Rpb24pIHtcbiAgICBpZiAoIWNpdGF0aW9uLm1sel9qdXJpc2RpY3Rpb24pIHtcbiAgICAgICAgY2l0YXRpb24ubWx6X2p1cmlzZGljdGlvbiA9IGp1cmlzZGljdGlvbjtcbiAgICB9XG59O1xuXG5XYWx2ZXJpbmUuYXBwbHlfeWVhciA9IGZ1bmN0aW9uIChjaXRhdGlvbiwgeWVhcikge1xuICAgIGlmICghY2l0YXRpb24ueWVhcikge1xuICAgICAgICBjaXRhdGlvbi55ZWFyID0geWVhcjtcbiAgICB9XG59O1xuXG5XYWx2ZXJpbmUubWF0Y2hfanVyaXNkaWN0aW9uID0gZnVuY3Rpb24gKGNpdGF0aW9uLCBkYXRhX3N0cmluZykge1xuICAgIC8vIEEgd2lsZCBndWVzcyBpcyB0aGUgYmVzdCB3ZSBjYW4gZG8gLS0gYW55IG1hdGNoIGNsZWFyc1xuICAgIHZhciBDT1VSVFMgPSB0aGlzLmNvbnN0YW50cy5DT1VSVFM7XG4gICAgZm9yICh2YXIga2V5IGluIENPVVJUUykge1xuICAgICAgICBpZiAoZGF0YV9zdHJpbmcuaW5kZXhPZihrZXkpID4gLTEpIHtcbiAgICAgICAgICAgIGNpdGF0aW9uLmNvdXJ0ID0ga2V5O1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xufTtcbldhbHZlcmluZS50b2tlbml6ZSA9IGZ1bmN0aW9uICh0ZXh0KSB7XG4gICAgLypcbiAgICAgKiAgVG9rZW5pemUgdGV4dCB1c2luZyByZWd1bGFyIGV4cHJlc3Npb25zIGluIHRoZSBmb2xsb3dpbmcgc3RlcHM6XG4gICAgICogICAgICAgLVNwbGl0IHRoZSB0ZXh0IGJ5IHRoZSBvY2N1cnJlbmNlcyBvZiBwYXR0ZXJucyB3aGljaCBtYXRjaCBhIGZlZGVyYWxcbiAgICAgKiAgICAgICAgcmVwb3J0ZXIsIGluY2x1ZGluZyB0aGUgcmVwb3J0ZXIgc3RyaW5ncyBhcyBwYXJ0IG9mIHRoZSByZXN1bHRpbmcgbGlzdC5cbiAgICAgKiAgICAgICAtUGVyZm9ybSBzaW1wbGUgdG9rZW5pemF0aW9uICh3aGl0ZXNwYWNlIHNwbGl0KSBvbiBlYWNoIG9mIHRoZSBub24tcmVwb3J0ZXJcbiAgICAgKiAgICAgICAgc3RyaW5ncyBpbiB0aGUgbGlzdC5cbiAgICAgKlxuICAgICAqICAgICBFeGFtcGxlOlxuICAgICAqICAgICA+Pj50b2tlbml6ZSgnU2VlIFJvZSB2LiBXYWRlLCA0MTAgVS4gUy4gMTEzICgxOTczKScpXG4gICAgICogICAgIFsnU2VlJywgJ1JvZScsICd2LicsICdXYWRlLCcsICc0MTAnLCAnVS5TLicsICcxMTMnLCAnKDE5NzMpJ11cbiAgICAgKi9cbiAgICB2YXIgUkVQT1JURVJfUkUgPSB0aGlzLmNvbnN0YW50cy5SRVBPUlRFUl9SRTtcblxuICAgIHZhciBzdHJpbmdzID0gdGV4dC5zcGxpdChSRVBPUlRFUl9SRSk7XG4gICAgdmFyIHdvcmRzID0gW107XG4gICAgZm9yICh2YXIgaT0wLGlsZW49c3RyaW5ncy5sZW5ndGg7aTxpbGVuO2krPTEpIHtcbiAgICAgICAgdmFyIHN0cmluZyA9IHN0cmluZ3NbaV07XG4gICAgICAgIGlmICgoaSsxKSUyID09PSAwKSB7XG4gICAgICAgICAgICBzdHJpbmcgPSBzdHJpbmcucmVwbGFjZSgvXlxccysvLCBcIlwiKS5yZXBsYWNlKC9cXHMrJC8sIFwiXCIpO1xuICAgICAgICAgICAgd29yZHMucHVzaChzdHJpbmcpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gTm9ybWFsaXplIHNwYWNlc1xuICAgICAgICAgICAgd29yZHMgPSB3b3Jkcy5jb25jYXQodGhpcy5fdG9rZW5pemUoc3RyaW5nKSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHdvcmRzO1xufTtcblxuXG5XYWx2ZXJpbmUuX3Rva2VuaXplID0gZnVuY3Rpb24gKHRleHQpIHtcbiAgICAvL2FkZCBleHRyYSBzcGFjZSB0byBtYWtlIHRoaW5ncyBlYXNpZXJcbiAgICB0ZXh0ID0gXCIgXCIgKyB0ZXh0ICsgXCIgXCI7XG5cbiAgICAvL2dldCByaWQgb2YgYWxsIHRoZSBhbm5veWluZyB1bmRlcnNjb3JlcyBpbiB0ZXh0IGZyb20gcGRmc1xuICAgIHRleHQgPSB0ZXh0LnJlcGxhY2UoL19fKy9nLFwiXCIpO1xuXG4gICAgLy8gTm8gbG9uZSBjb21tYXNcbiAgICB0ZXh0ID0gdGV4dC5yZXBsYWNlKC9cXHMrLFxccysvZyxcIiBcIik7XG5cbiAgICAvLyBObyBzdGFyIG51bWJlcnMgKEdvb2dsZSBTY2hvbGFyIGxpbmsgdGV4dCBmb3IgdGhlc2UgaXMgaW1tZWRpYXRlbHkgYWRqYWNlbnQpXG4gICAgdGV4dCA9IHRleHQucmVwbGFjZSgvKFswLTldKykqXFwqWzAtOV0rL2csXCIgXCIpO1xuXG4gICAgLy9yZWR1Y2UgZXhjZXNzIHdoaXRlc3BhY2VcbiAgICB0ZXh0ID0gdGV4dC5yZXBsYWNlKC8gKy9nLCBcIiBcIik7XG4gICAgdGV4dCA9IHRleHQucmVwbGFjZSgvXlxccysvLCBcIlwiKS5yZXBsYWNlKC9cXHMrJC8sIFwiXCIpO1xuICAgIHJldHVybiB0ZXh0LnNwbGl0KFwiIFwiKTtcbn07XG5XYWx2ZXJpbmUuZXh0cmFjdF9iYXNlX2NpdGF0aW9uID0gZnVuY3Rpb24gKHdvcmRzLCByZXBvcnRlcl9pbmRleCkge1xuICAgIC8qXG4gICAgICogIFwiXCJcIkNvbnN0cnVjdCBhbmQgcmV0dXJuIGEgY2l0YXRpb24gb2JqZWN0IGZyb20gYSBsaXN0IG9mIFwid29yZHNcIlxuICAgICAqXG4gICAgICogIEdpdmVuIGEgbGlzdCBvZiB3b3JkcyBhbmQgdGhlIGluZGV4IG9mIGEgZmVkZXJhbCByZXBvcnRlciwgbG9vayBiZWZvcmUgYW5kIGFmdGVyXG4gICAgICogIGZvciB2b2x1bWUgYW5kIHBhZ2UgbnVtYmVyLiAgSWYgZm91bmQsIGNvbnN0cnVjdCBhbmQgcmV0dXJuIGEgV2FsdmVyaW5lQ2l0YXRpb24gb2JqZWN0LlxuICAgICAqL1xuICAgIHZhciBORVVUUkFMUyA9IHRoaXMuY29uc3RhbnRzLk5FVVRSQUxTO1xuXG4gICAgdmFyIHJlcG9ydGVyID0gd29yZHNbcmVwb3J0ZXJfaW5kZXhdO1xuICAgIHZhciBtID0gd29yZHNbcmVwb3J0ZXJfaW5kZXggLSAxXS5tYXRjaCgvXlxccyooWzAtOV0rKVxccyokLyk7XG4gICAgaWYgKG0pIHtcbiAgICAgICAgdm9sdW1lID0gcGFyc2VJbnQobVsxXSwgMTApO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHZvbHVtZSA9IG51bGw7XG4gICAgfVxuICAgIHZhciBwYWdlX3N0ciA9IHdvcmRzW3JlcG9ydGVyX2luZGV4ICsgMV07XG4gICAgLy8gU3RyaXAgb2ZmIGVuZGluZyBjb21tYSwgd2hpY2ggb2NjdXJzIHdoZW4gdGhlcmUgaXMgYSBwYWdlIHJhbmdlIG5leHRcbiAgICAvLyAuLi4gYW5kIGEgcGVyaW9kLCB3aGljaCBjYW4gb2NjdXIgaW4gbmV1dHJhbCBhbmQgeWVhci1maXJzdCBjaXRhdGlvbnMuXG4gICAgcGFnZV9zdHIgPSBwYWdlX3N0ci5yZXBsYWNlKC9bOywuXSQvLCBcIlwiKTtcbiAgICBpZiAocGFnZV9zdHIubWF0Y2goL15bMC05XSskLykpIHtcbiAgICAgICAgcGFnZSA9IHBhcnNlSW50KHBhZ2Vfc3RyLCAxMCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgLy8gTm8gcGFnZSwgdGhlcmVmb3JlIG5vIHZhbGlkIGNpdGF0aW9uXG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICB2YXIgY2l0YXRpb24gPSBuZXcgV2FsdmVyaW5lQ2l0YXRpb24odm9sdW1lLCByZXBvcnRlciwgcGFnZSk7XG4gICAgaWYgKE5FVVRSQUxTW3JlcG9ydGVyXSkge1xuICAgICAgICBjaXRhdGlvbi5jaXRlX3R5cGUgPSBcIm5ldXRyYWxcIjtcbiAgICAgICAgaWYgKHZvbHVtZSAmJiAoXCJcIit2b2x1bWUpLm1hdGNoKC9bMC05XXs0fS8pKSB7XG4gICAgICAgICAgICBjaXRhdGlvbi55ZWFyID0gdm9sdW1lO1xuICAgICAgICB9XG4gICAgfVxuICAgIGNpdGF0aW9uLmVuZF9pZHggPSByZXBvcnRlcl9pbmRleCArIDE7XG4gICAgcmV0dXJuIGNpdGF0aW9uO1xufVxuV2FsdmVyaW5lLmFkZF9wb3N0X2NpdGF0aW9uID0gZnVuY3Rpb24gKGNpdGF0aW9uLCB3b3JkcywgcmVwb3J0ZXJfaW5kZXgpIHtcbiAgICB2YXIgRk9SV0FSRF9TRUVLID0gdGhpcy5jb25zdGFudHMuRk9SV0FSRF9TRUVLO1xuXG4gICAgdmFyIGZpbmRfcGlucG9pbnRzID0gdHJ1ZTtcblxuICAgIC8vIFN0YXJ0IGxvb2tpbmcgMiB0b2tlbnMgYWZ0ZXIgdGhlIHJlcG9ydGVyICgxIGFmdGVyIHBhZ2UpXG4gICAgZm9yICh2YXIgaT0ocmVwb3J0ZXJfaW5kZXgrMiksaWxlbj1NYXRoLm1pbigocmVwb3J0ZXJfaW5kZXgrRk9SV0FSRF9TRUVLKSwgd29yZHMubGVuZ3RoKTtpPGlsZW47aSs9MSkge1xuICAgICAgICAvLyBDaGVjayBlYWNoIHRva2VuIGdvaW5nIGZvcndhcmQgYXMgZWl0aGVyIChhKSBhIHBhcmVudGhldGljYWwgb3IgKGIpIGEgcG90ZW50aWFsIHBpbnBvaW50LlxuICAgICAgICAvLyBXaGVuIHRoZSB0ZXN0IGZvciAoYikgZmFpbHMsIHBlZyB0aGUgZW5kaW5nIGluZGV4IG9mIHRoZSBjdXJyZW50IGNpdGUgYXQgdHdvIGxlc3MgdGhhbiB0aGVcbiAgICAgICAgLy8gZmFpbGluZyBpbmRleCAoaS5lLiBvbmUgYmVmb3JlIHRoZSBwb3NzaWJsZSB2b2x1bWUgbnVtYmVyIG9mIHRoZSBmb2xsb3dpbmcgY2l0ZSkuXG4gICAgICAgIHZhciBzdGFydCA9IGk7XG4gICAgICAgIGlmICh3b3Jkc1tzdGFydF0uc2xpY2UoMCwxKSA9PT0gXCIoXCIgfHwgd29yZHNbc3RhcnRdLnNsaWNlKDAsMSkgPT09IFwiW1wiKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBrPXN0YXJ0LGtsZW49c3RhcnQrRk9SV0FSRF9TRUVLO2s8a2xlbjtrKz0xKSB7XG4gICAgICAgICAgICAgICAgdmFyIGVuZCA9IGs7XG4gICAgICAgICAgICAgICAgdmFyIGhhc19lbmRpbmdfcGFyZW47XG4gICAgICAgICAgICAgICAgaGFzX2VuZGluZ19wYXJlbiA9ICh3b3Jkc1tlbmRdLmluZGV4T2YoXCIpXCIpID4gLTEgfHwgd29yZHNbZW5kXS5pbmRleE9mKFwiKVwiKSA+IC0xKTtcbiAgICAgICAgICAgICAgICBpZiAoaGFzX2VuZGluZ19wYXJlbikge1xuICAgICAgICAgICAgICAgICAgICAvLyBTb21ldGltZXMgdGhlIHBhcmVuIGdldHMgc3BsaXQgZnJvbSB0aGUgcHJlY2VkaW5nIGNvbnRlbnRcbiAgICAgICAgICAgICAgICAgICAgaWYgKHdvcmRzW2VuZF0uc2xpY2UoMCwxKSA9PT0gXCIpXCIgfHwgd29yZHNbZW5kXS5zbGljZSgwLDEpID09PSBcIl1cIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2l0YXRpb24ueWVhciA9IHRoaXMuZ2V0X3llYXIod29yZHNbZW5kIC0gMV0pO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2l0YXRpb24ueWVhciA9IHRoaXMuZ2V0X3llYXIod29yZHNbZW5kXSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgY2l0YXRpb24uY291cnQgPSB0aGlzLmdldF9jb3VydCh3b3Jkcy5zbGljZShzdGFydCwgKGVuZCsxKSkuam9pbihcIiBcIiksIGNpdGF0aW9uLnllYXIpXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChzdGFydCA+IChyZXBvcnRlcl9pbmRleCArIDIpKSB7XG4gICAgICAgICAgICAgICAgLy8gVGhlbiB0aGVyZSdzIGNvbnRlbnQgYmV0d2VlbiBwYWdlIGFuZCAoKSwgc3RhcnRpbmcgd2l0aCBhIGNvbW1hLCB3aGljaCB3ZSBza2lwXG4gICAgICAgICAgICAgICAgY2l0YXRpb24uZXh0cmEgPSB3b3Jkcy5zbGljZShyZXBvcnRlcl9pbmRleCsyLHN0YXJ0KS5qb2luKFwiIFwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKGZpbmRfcGlucG9pbnRzKSB7XG4gICAgICAgICAgICAgICAgaWYgKHdvcmRzW2ldLm1hdGNoKC9eKD86blxcLnxufG5uXFwufG5ufHBhcmF8cGFyYVxcLnzDgsK2fFstMC05XSspWyw7XT9cXHMqJC8pKSB7XG4gICAgICAgICAgICAgICAgICAgIGNpdGF0aW9uLmVuZF9pZHggPSAoaS0xKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBmaW5kX3BpbnBvaW50cyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cbldhbHZlcmluZS5hZGRfZGVmZW5kYW50ID0gZnVuY3Rpb24gKGNpdGF0aW9ucywgd29yZHMsIHJlcG9ydGVyX2luZGV4KSB7XG4gICAgLypcbiAgICAgKiAgU2NhbiBiYWNrd2FyZHMgZnJvbSAyIHRva2VucyBiZWZvcmUgcmVwb3J0ZXIgdW50aWwgeW91IGZpbmQgdi4sIGluIHJlLCBldGMuXG4gICAgICogIElmIG5vIGtub3duIHN0b3AtdG9rZW4gaXMgZm91bmQsIG5vIGRlZmVuZGFudCBuYW1lIGlzIHN0b3JlZC4gIEluIHRoZSBmdXR1cmUsXG4gICAgICogIHRoaXMgY291bGQgYmUgaW1wcm92ZWQuXG4gICAgICovXG4gICAgXG4gICAgdmFyIHBvcyA9IGNpdGF0aW9ucy5sZW5ndGggLSAxO1xuICAgIHZhciBlbmQgPSAocmVwb3J0ZXJfaW5kZXggLSAxKTtcbiAgICB2YXIgaWR4ID0gKHJlcG9ydGVyX2luZGV4IC0gMik7XG4gICAgdmFyIHByZXZfaWR4ID0gY2l0YXRpb25zW3BvcyAtIDFdID8gY2l0YXRpb25zW3BvcyAtIDFdLmVuZF9pZHggOiAwO1xuXG4gICAgdmFyIF9hZGRfZGVmZW5kYW50ID0gV2FsdmVyaW5lLmFkZERlZmVuZGFudChjaXRhdGlvbnMsIHdvcmRzLCBwb3MsIGlkeCwgZW5kLCBwcmV2X2lkeCk7XG4gICAgdGhpcy5idWZmZXIgPSBfYWRkX2RlZmVuZGFudC5iYWNrc2NhbigpO1xuICAgIF9hZGRfZGVmZW5kYW50LmZpbmlzaChjaXRhdGlvbnNbcG9zXSk7XG59XG5cbldhbHZlcmluZS5hZGREZWZlbmRhbnQgPSBmdW5jdGlvbiAoY2l0YXRpb25zLCB3b3JkcywgcG9zLCBpZHgsIGVuZCwgcHJldl9pZHgpIHtcbiAgICAvLyBUcnkgYSBzb3J0LW9mIHN0YXRlIG1hY2hpbmVcbiAgICB2YXIgU1RSSU5HX1RPS0VOUyA9IHRoaXMuY29uc3RhbnRzLlNUUklOR19UT0tFTlM7XG4gICAgdmFyIEFDQ0VQVF9UT0tFTlMgPSB0aGlzLmNvbnN0YW50cy5BQ0NFUFRfVE9LRU5TO1xuICAgIHZhciBFTUJFRERFRF9UT0tFTlMgPSB0aGlzLmNvbnN0YW50cy5FTUJFRERFRF9UT0tFTlM7XG4gICAgdmFyIFBSRVBPU0lUSU9OUyA9IHRoaXMuY29uc3RhbnRzLlBSRVBPU0lUSU9OUztcbiAgICB2YXIgQkFDS1dBUkRfU0VFSyA9IHRoaXMuY29uc3RhbnRzLkJBQ0tXQVJEX1NFRUs7XG4gICAgdmFyIHN0cmlwX3B1bmN0ID0gdGhpcy51dGlscy5zdHJpcF9wdW5jdDtcbiAgICB2YXIgYnVmZmVyID0gdGhpcy5idWZmZXI7XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBpZHg6IGlkeCxcbiAgICAgICAgZW5kOiBlbmQsXG4gICAgICAgIGJ1ZmZlcjogYnVmZmVyLFxuICAgICAgICBiYWNrc2NhbjogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgLy8gU29tZSBjb25kaXRpb25zXG4gICAgICAgICAgICBpZiAodGhpcy5pZHggPCAxKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gTm90IHN1cmUgd2h5LCBidXQgdGhlIHRva2VuaXplciBjYW4gcHJvZHVjZSBlbXB0eSBlbGVtZW50cy5cbiAgICAgICAgICAgIHZhciB3b3JkID0gd29yZHNbdGhpcy5pZHhdO1xuICAgICAgICAgICAgaWYgKCF3b3JkKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5pZHggKz0gLTE7XG4gICAgICAgICAgICAgICAgdGhpcy5iYWNrc2NhbigpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgd29yZCA9IHdvcmQucmVwbGFjZSgvXltcXChcXFtdKi9nLCBcIlwiKTtcbiAgICAgICAgICAgIHZhciBjYXBXb3JkID0gdGhpcy5pc0NhcCh3b3JkKTtcbiAgICAgICAgICAgIHZhciBwcmV3b3JkID0gd29yZHNbdGhpcy5pZHggLSAxXS5yZXBsYWNlKC9eW1xcKFxcW10qL2csIFwiXCIpO1xuICAgICAgICAgICAgdmFyIGNhcFByZVdvcmQgPSB0aGlzLmlzQ2FwKHByZXdvcmQpO1xuICAgICAgICAgICAgaWYgKHRoaXMuaWR4KzEgPT0gdGhpcy5lbmQgJiYgdGhpcy5pc19wYXJhbGxlbCgpKSB7XG4gICAgICAgICAgICAgICAgLy8gSWYgdGhlIG5hbWUgY29uc2lzdHMgZW50aXJlbHkgb2YgcGlucG9pbnQtbGlrZSB0aGluZ3MsIGl0J3MgYSBwYXJhbGxlbC5cbiAgICAgICAgICAgICAgICBjaXRhdGlvbnNbcG9zXS5DQVJSWV9GT1JXQVJEID0gdHJ1ZTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY2l0YXRpb25zLmxlbmd0aCA+IDEgJiYgdGhpcy5pZHggPT0gKHRoaXMuZW5kLTEpICYmIHRoaXMuaWR4IDw9IChjaXRhdGlvbnNbcG9zIC0gMV0uZW5kX2lkeCkpIHtcbiAgICAgICAgICAgICAgICAvLyBJZiB0aGVyZSBpcyBub3RoaW5nIGJldHdlZW4gaXQgYW5kIHRoZSBwcmV2aW91cyBjaXRlLCBpdCdzIGEgcGFyYWxsZWwgYWxzb1xuICAgICAgICAgICAgICAgIHRoaXMuaWR4ID0gdGhpcy5lbmQ7XG4gICAgICAgICAgICAgICAgY2l0YXRpb25zW3Bvc10uQ0FSUllfRk9SV0FSRCA9IHRydWU7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHByZXdvcmQuc2xpY2UoLTIpID09PSAnXCIuJyB8fCBwcmV3b3JkLnNsaWNlKC0yKSA9PT0gJy5cIicpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNsZWFudXAodHJ1ZSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKFNUUklOR19UT0tFTlMuaW5kZXhPZihzdHJpcF9wdW5jdCh3b3JkKSkgPiAtMSAmJiBwb3MgPiAwKSB7XG4gICAgICAgICAgICAgICAgLy8gSWYgaXQgc3RvcHMgYXQgYSBtZW1iZXIgb2YgU1RSSU5HX1RPS0VOUywgaXQgcGVydGFpbnMgdG8gdGhlIGltbWVkaWF0ZWx5IHByZWNlZGluZyBjYXNlXG4gICAgICAgICAgICAgICAgdGhpcy5pZHggPSB0aGlzLmVuZDtcbiAgICAgICAgICAgICAgICBjaXRhdGlvbnNbcG9zXS5DQVJSWV9GT1JXQVJEID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB2YXIgbSA9IHdvcmQubWF0Y2goL2NlcnQuKihncmFudGVkfGRlbmllZCkvKTtcbiAgICAgICAgICAgICAgICBpZiAobSkge1xuICAgICAgICAgICAgICAgICAgICBjaXRhdGlvbnNbcG9zXS5DRVJUID0gbVsxXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNpdGF0aW9uc1twb3NdLnllYXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGk9KGNpdGF0aW9ucy5sZW5ndGgtMSt0aGlzLmJ1ZmZlciksaWxlbj0oY2l0YXRpb25zLmxlbmd0aC0xKTtpPGlsZW47aSs9MSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNpdGF0aW9uc1tpXS55ZWFyID0gY2l0YXRpb25zW3Bvc10ueWVhcjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYnVmZmVyID0gMDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAod29yZC5zbGljZSgtMSkgPT09IFwiLlwiICYmICFjYXBXb3JkICYmIHdvcmQgIT09IFwidi5cIikge1xuICAgICAgICAgICAgICAgIC8vIEl0IG5ldmVyIGluY2x1ZGVzIGEgbm9uLWNhcGl0YWxpemVkIHdvcmQgdGhhdCBlbmRzIGluIGEgcGVyaW9kXG4gICAgICAgICAgICAgICAgdGhpcy5jbGVhbnVwKCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHdvcmQuaW5kZXhPZihcIjpcIikgPiAtMSB8fCB3b3JkLmluZGV4T2YoXCI7XCIpID4gLTEpIHtcbiAgICAgICAgICAgICAgICAvLyBDb2xvbnMgYW5kIHNlbWljb2xvbnMgYXJlIGZhdGFsIHRvIHRoZSBzZWFyY2ggYW5kIHNob3VsZCBuZXZlciBiZSBpbmNsdWRlZFxuICAgICAgICAgICAgICAgIHRoaXMuY2xlYW51cCgpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICgodGhpcy5lbmQgLSB0aGlzLmlkeCkgPiAzICYmIHdvcmQuaW5kZXhPZihcIilcIikgPiAtMSkge1xuICAgICAgICAgICAgICAgIHRoaXMuaWR4ICs9IDE7XG4gICAgICAgICAgICAgICAgLy8gSXQgZG9lcyBub3QgcnVuIHBhc3QgYSBjbG9zZSBwYXJlbnMgYWZ0ZXIgZ2F0aGVyaW5nIHRocmVlIHdvcmRzXG4gICAgICAgICAgICAgICAgdGhpcy5jbGVhbnVwKCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHdvcmQgPT09IFwib2ZcIiB8fCB3b3JkID09PSBcImFuZFwiIHx8IHdvcmQgPT09IFwidG9cIiB8fCB3b3JkLm1hdGNoKC9ec2VlWywuXT8kL2kpKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFjYXBQcmVXb3JkKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFRoZSBwcmVwb3NpdGlvbiBcIm9mXCIgb3IgY29uanVuY3Rpb24gXCJhbmRcIiBwcmVjZWRlIGEgY2FzZSBuYW1lIG9ubHkgaWYgaXQgaXMgbm90IHRoZW1zZWx2ZXMgcHJlY2VkZWQgYnkgYSBjYXBpdGFsaXplZCB3b3JkLlxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNsZWFudXAoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmlkeCArPSAtMTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5iYWNrc2NhbigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoQUNDRVBUX1RPS0VOUy5pbmRleE9mKHN0cmlwX3B1bmN0KHdvcmQpKSA+IC0xKSB7XG4gICAgICAgICAgICAgICAgLy8gSXQgbmV2ZXIgZXh0ZW5kcyBiZXlvbmQgXCJJbiByZVwiXG4gICAgICAgICAgICAgICAgLy8gSXQgbmV2ZXIgZXh0ZW5kcyBiZXlvbmQgXCJFeCBwYXJ0ZVwiXG4gICAgICAgICAgICAgICAgdGhpcy5jbGVhbnVwKCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKFBSRVBPU0lUSU9OUy5pbmRleE9mKHN0cmlwX3B1bmN0KHByZXdvcmQpKSA+IC0xICYmIGNhcFdvcmQpIHtcbiAgICAgICAgICAgICAgICAvLyBJZiBvdmVyIGFuIGFyYml0cmFyeSBsZW5ndGggKD8pLCBpdCBuZXZlciBleHRlbmRzIGJleW9uZCBjZXJ0YWluIHByZXBvc2l0aW9ucyBpZiB0aGV5IHByZWNlZGUgYSBjYXBpdGFsaXplZCB3b3JkXG4gICAgICAgICAgICAgICAgdGhpcy5jbGVhbnVwKHRydWUpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICghY2FwV29yZCAmJiB3b3JkICE9PSBcInYuXCIgJiYgd29yZCAhPT0gXCJ2XCIgJiYgd29yZCAhPT0gXCImXCIgJiYgd29yZCAhPT0gXCImYW1wO1wiICYmIEVNQkVEREVEX1RPS0VOUy5pbmRleE9mKHdvcmQpID09PSAtMSkge1xuICAgICAgICAgICAgICAgIC8vIEl0IG5ldmVyIGluY2x1ZGVzIGEgbm9uLWNhcGl0YWxpemVkIHdvcmQgdGhhdCBpcyBub3QgXCJ2LlwiIG9yIFwiJlwiXG4gICAgICAgICAgICAgICAgdGhpcy5jbGVhbnVwKCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCh0aGlzLmVuZCAtIHRoaXMuaWR4KSA+IEJBQ0tXQVJEX1NFRUspIHtcbiAgICAgICAgICAgICAgICAvLyBJdCBuZXZlciBleHRlbmRzIGJleW9uZCBhbiBhcmJpdHJhcnkgbGVuZ3RoIGxpbWl0XG4gICAgICAgICAgICAgICAgdGhpcy5jbGVhbnVwKHRydWUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLmlkeCArPSAtMTtcbiAgICAgICAgICAgICAgICB0aGlzLmJhY2tzY2FuKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5idWZmZXI7XG4gICAgICAgIH0sXG4gICAgICAgIFxuICAgICAgICBpc19wYXJhbGxlbDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAvLyBcIm9mXCIgaXMgaGFuZGxlZCBieSBhIHNwZWNpYWwgY29uZGl0aW9uXG4gICAgICAgICAgICB2YXIgaWR4ID0gdGhpcy5pZHg7XG4gICAgICAgICAgICBmb3IgKHZhciBpPXRoaXMuaWR4LGlsZW49TWF0aC5tYXgodGhpcy5pZHgtQkFDS1dBUkRfU0VFSywgcHJldl9pZHgrMSwgLTEpO2k+aWxlbjtpKz0tMSkge1xuICAgICAgICAgICAgICAgIGlmICh3b3Jkc1tpXS5tYXRjaCgvXig/Om5cXC58bnxwYXJhfHBhcmFcXC58w4LCtnxbLTAtOV0rKVssO10/XFxzKiQvKSkge1xuICAgICAgICAgICAgICAgICAgICBpZHggPSBpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmVuZCA9IGlkeCsxO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0sXG5cbiAgICAgICAgaXNDYXA6IGZ1bmN0aW9uICh3b3JkKSB7XG4gICAgICAgICAgICByZXR1cm4gd29yZC5zbGljZSgwLDEpICE9PSB3b3JkLnNsaWNlKDAsMSkudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgfSxcblxuICAgICAgICBjbGVhbnVwOiBmdW5jdGlvbiAoa2VlcEN1cnJlbnRXb3JkKSB7XG4gICAgICAgICAgICAvLyBJdCBhbHdheXMgYmVnaW5zIHdpdGggYSBjYXBpdGFsaXplZCB3b3JkXG4gICAgICAgICAgICBpZiAoa2VlcEN1cnJlbnRXb3JkKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5pZHggKz0gLTE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3IgKHZhciBpPXRoaXMuaWR4LGlsZW49dGhpcy5lbmQ7aTxpbGVuO2krPTEpIHtcbiAgICAgICAgICAgICAgICB2YXIgd29yZCA9IHdvcmRzW2ldLnJlcGxhY2UoL1tcXFtcXChcXF1cXCldKi9nLCBcIlwiKTtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5pc0NhcCh3b3JkKSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmlkeCA9IGk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgXG4gICAgICAgIGNsZWFuc3RyOiBmdW5jdGlvbiAoc3RyKSB7XG4gICAgICAgICAgICBzdHIgPSBzdHIucmVwbGFjZShcIiZhbXA7XCIsIFwiJlwiLCBcImdcIik7XG4gICAgICAgICAgICBzdHIgPSBzdHIucmVwbGFjZSgvLCQvLFwiXCIpO1xuICAgICAgICAgICAgc3RyID0gc3RyLnJlcGxhY2UoL1tcXFtcXChcXClcXF1dKi9nLCBcIlwiKTtcbiAgICAgICAgICAgIHJldHVybiBzdHI7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZmluaXNoOiBmdW5jdGlvbiAoY2l0YXRpb24pIHtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHRoaXMuaWR4IDwgdGhpcy5lbmQpIHtcbiAgICAgICAgICAgICAgICAvLyBJdCBkb2Vzbid0IG5lY2Vzc2FyaWx5IGV4aXN0XG4gICAgICAgICAgICAgICAgdmFyIHBhcnRpZXMgPSB3b3Jkcy5zbGljZSh0aGlzLmlkeCwodGhpcy5lbmQpKS5qb2luKFwiIFwiKTtcbiAgICAgICAgICAgICAgICBwYXJ0aWVzID0gcGFydGllcy5zcGxpdCgvXFxzK3ZcXC4/XFxzKy8pO1xuICAgICAgICAgICAgICAgIGlmIChwYXJ0aWVzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSSBoYWQgc29tZSBwbGFpbiB0ZXh0IGNvbnZlcnNpb24gd3JhcHBlcnMgaGVyZSwgYnV0IHRoZXkncmUgbm8gbG9uZ2VyIG5lZWRlZFxuICAgICAgICAgICAgICAgICAgICBjaXRhdGlvbi5wbGFpbnRpZmYgPSBzdHJpcF9wdW5jdChwYXJ0aWVzWzBdKSA/IHRoaXMuY2xlYW5zdHIocGFydGllc1swXSkgOiBcIlwiO1xuICAgICAgICAgICAgICAgICAgICBjaXRhdGlvbi5kZWZlbmRhbnQgPSBzdHJpcF9wdW5jdChwYXJ0aWVzWzFdKSA/IHRoaXMuY2xlYW5zdHIocGFydGllc1sxXSkgOiBcIlwiO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNpdGF0aW9uLnBsYWludGlmZiA9IHN0cmlwX3B1bmN0KHBhcnRpZXNbMF0pID8gdGhpcy5jbGVhbnN0cihwYXJ0aWVzWzBdKSA6IFwiXCI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGNpdGF0aW9uLnBsYWludGlmZikge1xuICAgICAgICAgICAgICAgIHZhciBtID0gY2l0YXRpb24ucGxhaW50aWZmLm1hdGNoKC9eKD86U2VlfENmLilcXHMrKC4qKS8pO1xuICAgICAgICAgICAgICAgIGlmIChtKSB7XG4gICAgICAgICAgICAgICAgICAgIGNpdGF0aW9uLnBsYWludGlmZiA9IHRoaXMuY2xlYW5zdHIobVsxXSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICghY2l0YXRpb24ucGxhaW50aWZmLm1hdGNoKC9eaW4gcmUvaSkpIHtcbiAgICAgICAgICAgICAgICAgICAgY2l0YXRpb24ucGxhaW50aWZmID0gY2l0YXRpb24ucGxhaW50aWZmLnJlcGxhY2UoL15JblxccysvLCBcIlwiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjaXRhdGlvbi5tYXRjaCA9IHdvcmRzLnNsaWNlKHRoaXMuaWR4LHRoaXMuZW5kX2lkeCkuam9pbihcIiBcIik7XG4gICAgICAgIH1cbiAgICB9XG59XG5XYWx2ZXJpbmUuaW5mZXJfanVyaXNkaWN0aW9uID0gZnVuY3Rpb24gKGNpdGF0aW9ucykge1xuICAgIHZhciBSRVBPUlRFUlMgPSB0aGlzLmNvbnN0YW50cy5SRVBPUlRFUlM7XG4gICAgdmFyIEpVUklTRElDVElPTlMgPSB0aGlzLmNvbnN0YW50cy5KVVJJU0RJQ1RJT05TO1xuXG4gICAgZm9yICh2YXIgaT0wLGlsZW49Y2l0YXRpb25zLmxlbmd0aDtpPGlsZW47aSs9MSkge1xuICAgICAgICB2YXIgY2l0YXRpb24gPSBjaXRhdGlvbnNbaV07XG4gICAgICAgIC8vIE1vdmUgc3RyYXkgY2l0YXRpb24gZGF0YSBmcm9tIGRlZmVuZGFudCB0byBleHRyYVxuICAgICAgICBpZiAoY2l0YXRpb24uZGVmZW5kYW50KSB7XG4gICAgICAgICAgICB2YXIgZXh0cmFzID0gW107XG4gICAgICAgICAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICAgICAgICAgIHZhciBtID0gY2l0YXRpb24uZGVmZW5kYW50Lm1hdGNoKC9eKC4qLClcXHMoWzAtOV0rXFxzW0EtWl1bQS1aYS16LiAwLTldK1xcc1swLTldKyksXFxzKiQvKTtcbiAgICAgICAgICAgICAgICBpZiAobSkge1xuICAgICAgICAgICAgICAgICAgICBjaXRhdGlvbi5kZWZlbmRhbnQgPSBtWzFdO1xuICAgICAgICAgICAgICAgICAgICBleHRyYXMucHVzaChtWzJdKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZXh0cmFzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGlmIChjaXRhdGlvbi5leHRyYSkge1xuICAgICAgICAgICAgICAgICAgICBleHRyYXMucHVzaChjaXRhdGlvbi5leHRyYSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNpdGF0aW9uLmV4dHJhID0gZXh0cmFzLmpvaW4oXCIsIFwiKTtcbiAgICAgICAgICAgICAgICBjaXRhdGlvbi5kZWZlbmRhbnQucmVwbGFjZSgvLFxccyokLywgXCJcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHJlcG9ydGVycyA9IFJFUE9SVEVSU1tjaXRhdGlvbi5jYW5vbmljYWxfcmVwb3J0ZXJdO1xuICAgICAgICB2YXIganVyaXNkaWN0aW9ucyA9IFtdO1xuICAgICAgICBmb3IgKHZhciBqPTAsamxlbj1yZXBvcnRlcnMubGVuZ3RoO2o8amxlbjtqKz0xKSB7XG4gICAgICAgICAgICB2YXIgcmVwb3J0ZXIgPSByZXBvcnRlcnNbal07XG4gICAgICAgICAgICBqdXJpc2RpY3Rpb25zID0ganVyaXNkaWN0aW9ucy5jb25jYXQocmVwb3J0ZXIubWx6X2p1cmlzZGljdGlvbik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGp1cmlzZGljdGlvbnMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICAvLyBJZiB0aGVyZSBpcyBvbmx5IG9uZSBjaG9pY2UsIHdlJ3JlIGFscmVhZHkgaG9tZVxuICAgICAgICAgICAgY2l0YXRpb24ubWx6X2p1cmlzZGljdGlvbiA9IGp1cmlzZGljdGlvbnNbMF07XG4gICAgICAgIH0gZWxzZSBpZiAoY2l0YXRpb24uY291cnQgfHwgY2l0YXRpb24uZXh0cmEpIHtcbiAgICAgICAgICAgIC8vIExvb2sgZm9yIGEgbWF0Y2ggb2YgYW4gYWJicmV2IG9mIHRoZSBqdXJpc2RpY3Rpb24gbmFtZSBpbiB0aGUgY291cnQgZmllbGRcbiAgICAgICAgICAgIHZhciBkb25lID0gZmFsc2U7XG4gICAgICAgICAgICB2YXIgZGF0YV9zdHJpbmcgPSAoY2l0YXRpb24uY291cnQgPyBjaXRhdGlvbi5jb3VydCA6IFwiXCIpICsgXCIgXCIgKyAoY2l0YXRpb24uZXh0cmEgPyBjaXRhdGlvbi5leHRyYSA6IFwiXCIpO1xuICAgICAgICAgICAgZm9yICh2YXIgaj0wLGpsZW49anVyaXNkaWN0aW9ucy5sZW5ndGg7ajxqbGVuO2orPTEpIHtcbiAgICAgICAgICAgICAgICB2YXIgcG9zc2libGVfanVyaXNkaWN0aW9uID0ganVyaXNkaWN0aW9uc1tqXTtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBrPTAsa2xlbj1KVVJJU0RJQ1RJT05TW3Bvc3NpYmxlX2p1cmlzZGljdGlvbl0ubGVuZ3RoO2s8a2xlbjtrKz0xKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBtYXRjaF9zdHJpbmcgPSBKVVJJU0RJQ1RJT05TW3Bvc3NpYmxlX2p1cmlzZGljdGlvbl1ba107XG4gICAgICAgICAgICAgICAgICAgIGlmIChkYXRhX3N0cmluZy5pbmRleE9mKG1hdGNoX3N0cmluZykgPiAtMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2l0YXRpb24ubWx6X2p1cmlzZGljdGlvbiA9IHBvc3NpYmxlX2p1cmlzZGljdGlvbjtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBkb25lID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChkb25lKSBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBJZiB3ZSBkaWRuJ3QgZmluZCBhbnl0aGluZywgdGhlIGp1cmlzZGljdGlvbiBmaWVsZCB3aWxsIGJlIGVtcHR5LlxuICAgICAgICAvLyBJdCdzIHNvbWV0aGluZyBmcm9tIHRoZSBVUywgYnV0IHdlIGRvbid0IHNldCB0aGF0IHVudGlsIGFmdGVyIGhhbmRsaW5nIHRoZSBjYXJyeS1mb3J3YXJkc1xuICAgICAgICAvL2FwcGx5X2p1cmlzZGljdGlvbihjaXRhdGlvbiwgXCJ1c1wiKTtcbiAgICB9XG59XG5XYWx2ZXJpbmUuZGlzYW1iaWd1YXRlX3JlcG9ydGVycyA9IGZ1bmN0aW9uIChjaXRhdGlvbnMpIHtcbiAgICAvKlxuICAgICAqICBBIHNlY29uZCwgZnJvbSBzY3JhdGNoLCBhcHByb2FjaCB0byBjb252ZXJ0aW5nIGEgbGlzdCBvZiBjaXRhdGlvbnMgdG8gYSBsaXN0IG9mIHVuYW1iaWd1b3VzIG9uZXMuXG4gICAgICpcbiAgICAgKiAgR29hbCBpcyB0byBmaWd1cmUgb3V0OlxuICAgICAqICAgLSBjaXRhdGlvbi5jYW5vbmljYWxfcmVwb3J0ZXJcbiAgICAgKiAgIC0gY2l0YXRpb24ubG9va3VwX2luZGV4XG4gICAgICpcbiAgICAgKiAgQW5kIHRoZXJlIGFyZSBhIGZldyB0aGluZ3MgdGhhdCBjYW4gYmUgYW1iaWd1b3VzOlxuICAgICAqICAgLSBNb3JlIHRoYW4gb25lIHZhcmlhdGlvbi5cbiAgICAgKiAgIC0gTW9yZSB0aGFuIG9uZSByZXBvcnRlciBmb3IgdGhlIGtleS5cbiAgICAgKiAgIC0gQ291bGQgYmUgYW4gZWRpdGlvbiAob3Igbm90KVxuICAgICAqICAgLSBBbGwgY29tYmluYXRpb25zIG9mIHRoZSBhYm92ZTpcbiAgICAgKiAgICAgIC0gTW9yZSB0aGFuIG9uZSB2YXJpYXRpb24uXG4gICAgICogICAgICAtIE1vcmUgdGhhbiBvbmUgdmFyaWF0aW9uLCB3aXRoIG1vcmUgdGhhbiBvbmUgcmVwb3J0ZXIgZm9yIHRoZSBrZXkuXG4gICAgICogICAgICAtIE1vcmUgdGhhbiBvbmUgdmFyaWF0aW9uLCB3aXRoIG1vcmUgdGhhbiBvbmUgcmVwb3J0ZXIgZm9yIHRoZSBrZXksIHdoaWNoIGlzIGFuIGVkaXRpb24uXG4gICAgICogICAgICAtIE1vcmUgdGhhbiBvbmUgdmFyaWF0aW9uLCB3aGljaCBpcyBhbiBlZGl0aW9uXG4gICAgICogICAgICAtIC4uLlxuXG4gICAgICogIEZvciB2YXJpYW50cywgd2UganVzdCBuZWVkIHRvIHNvcnQgb3V0IHRoZSBjYW5vbmljYWxfcmVwb3J0ZXJcbiAgICAgKi9cbiAgICB2YXIgUkVQT1JURVJTID0gdGhpcy5jb25zdGFudHMuUkVQT1JURVJTO1xuICAgIHZhciBFRElUSU9OUyA9IHRoaXMuY29uc3RhbnRzLkVESVRJT05TO1xuICAgIHZhciBWQVJJQVRJT05TX09OTFkgPSB0aGlzLmNvbnN0YW50cy5WQVJJQVRJT05TX09OTFk7XG4gICAgdmFyIGlzX2RhdGVfaW5fcmVwb3J0ZXIgPSB0aGlzLnV0aWxzLmlzX2RhdGVfaW5fcmVwb3J0ZXI7XG5cbiAgICB2YXIgdW5hbWJpZ3VvdXNfY2l0YXRpb25zID0gW107XG4gICAgZm9yICh2YXIgaD0wLGhsZW49Y2l0YXRpb25zLmxlbmd0aDtoPGhsZW47aCs9MSkge1xuICAgICAgICB2YXIgY2l0YXRpb24gPSBjaXRhdGlvbnNbaF07XG4gICAgICAgIC8vIE5vbi12YXJpYW50IGl0ZW1zIChQLlIuUi4sIEEuMmQsIFdhc2guLCBldGMuKVxuICAgICAgICBpZiAoUkVQT1JURVJTW0VESVRJT05TW2NpdGF0aW9uLnJlcG9ydGVyXV0pIHtcbiAgICAgICAgICAgIGlmIChSRVBPUlRFUlNbRURJVElPTlNbY2l0YXRpb24ucmVwb3J0ZXJdXS5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgICAgICAvLyBTaW5nbGUgcmVwb3J0ZXIsIGVhc3ktcGVhc3kuXG4gICAgICAgICAgICAgICAgY2l0YXRpb24uY2Fub25pY2FsX3JlcG9ydGVyID0gRURJVElPTlNbY2l0YXRpb24ucmVwb3J0ZXJdO1xuICAgICAgICAgICAgICAgIGNpdGF0aW9uLmxvb2t1cF9pbmRleCA9IDA7XG4gICAgICAgICAgICAgICAgdW5hbWJpZ3VvdXNfY2l0YXRpb25zLnB1c2goY2l0YXRpb24pO1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBNdWx0aXBsZSBib29rcyB1bmRlciB0aGlzIGtleSwgYnV0IHdoaWNoIGlzIGNvcnJlY3Q/XG4gICAgICAgICAgICAgICAgaWYgKGNpdGF0aW9uLnllYXIpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gYXR0ZW1wdCByZXNvbHV0aW9uIGJ5IGRhdGVcbiAgICAgICAgICAgICAgICAgICAgdmFyIHBvc3NpYmxlX2NpdGF0aW9ucyA9IFtdO1xuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpPTAsaWxlbj1SRVBPUlRFUlNbRURJVElPTlNbY2l0YXRpb24ucmVwb3J0ZXJdXS5sZW5ndGg7aTxpbGVuO2krPTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpc19kYXRlX2luX3JlcG9ydGVyKFJFUE9SVEVSU1tFRElUSU9OU1tjaXRhdGlvbi5yZXBvcnRlcl1dW2ldWydlZGl0aW9ucyddLCBjaXRhdGlvbi55ZWFyKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBvc3NpYmxlX2NpdGF0aW9ucy5wdXNoKChjaXRhdGlvbi5yZXBvcnRlciwgaSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChwb3NzaWJsZV9jaXRhdGlvbnMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBXZSB3ZXJlIGFibGUgdG8gaWRlbnRpZnkgb25seSBvbmUgaGl0IGFmdGVyIGZpbHRlcmluZyBieSB5ZWFyLlxuICAgICAgICAgICAgICAgICAgICAgICAgY2l0YXRpb24uY2Fub25pY2FsX3JlcG9ydGVyID0gRURJVElPTlNbcG9zc2libGVfY2l0YXRpb25zWzBdWzBdXVxuICAgICAgICAgICAgICAgICAgICAgICAgY2l0YXRpb24ucmVwb3J0ZXIgPSBwb3NzaWJsZV9jaXRhdGlvbnNbMF1bMF1cbiAgICAgICAgICAgICAgICAgICAgICAgIGNpdGF0aW9uLmxvb2t1cF9pbmRleCA9IHBvc3NpYmxlX2NpdGF0aW9uc1swXVsxXVxuICAgICAgICAgICAgICAgICAgICAgICAgdW5hbWJpZ3VvdXNfY2l0YXRpb25zLnB1c2goY2l0YXRpb24pXG4gICAgICAgICAgICAgICAgICAgICAgICBjb250aW51ZVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKFZBUklBVElPTlNfT05MWVtjaXRhdGlvbi5yZXBvcnRlcl0pIHtcbiAgICAgICAgICAgIC8vIFRyeSBkb2luZyBhIHZhcmlhdGlvbiBvZiBhbiBlZGl0aW9uLlxuICAgICAgICAgICAgaWYgKFZBUklBVElPTlNfT05MWVtjaXRhdGlvbi5yZXBvcnRlcl0ubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICAgICAgLy8gT25seSBvbmUgdmFyaWF0aW9uIC0tIGdyZWF0LCB1c2UgaXQuXG4gICAgICAgICAgICAgICAgaWYgKFJFUE9SVEVSU1tFRElUSU9OU1tWQVJJQVRJT05TX09OTFlbY2l0YXRpb24ucmVwb3J0ZXJdWzBdXV0ubGVuZ3RoID09IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSXQncyBhIHNpbmdsZSByZXBvcnRlciB1bmRlciBhIG1pc3NwZWxsZWQga2V5LlxuICAgICAgICAgICAgICAgICAgICBjaXRhdGlvbi5jYW5vbmljYWxfcmVwb3J0ZXIgPSBFRElUSU9OU1tWQVJJQVRJT05TX09OTFlbY2l0YXRpb24ucmVwb3J0ZXJdWzBdXTtcbiAgICAgICAgICAgICAgICAgICAgY2l0YXRpb24ucmVwb3J0ZXIgPSBWQVJJQVRJT05TX09OTFlbY2l0YXRpb24ucmVwb3J0ZXJdWzBdO1xuICAgICAgICAgICAgICAgICAgICBjaXRhdGlvbi5sb29rdXBfaW5kZXggPSAwO1xuICAgICAgICAgICAgICAgICAgICB1bmFtYmlndW91c19jaXRhdGlvbnMucHVzaChjaXRhdGlvbik7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gTXVsdGlwbGUgcmVwb3J0ZXJzIHVuZGVyIGEgc2luZ2xlIG1pc3NwZWxsZWQga2V5IChlLmcuIFduLjJkIC0tPiBXYXNoIC0tPiBWYSBSZXBvcnRzLCBXYXNoIG9yXG4gICAgICAgICAgICAgICAgICAgIC8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgV2FzaGluZ3RvbiBSZXBvcnRzKS5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGNpdGF0aW9uLnllYXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGF0dGVtcHQgcmVzb2x1dGlvbiBieSBkYXRlXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcG9zc2libGVfY2l0YXRpb25zID0gW107XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpPTAsaWxlbj1SRVBPUlRFUlNbRURJVElPTlNbVkFSSUFUSU9OU19PTkxZW2NpdGF0aW9uLnJlcG9ydGVyXVswXV1dLmxlbmd0aDtpPGlsZW47aSs9MSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpc19kYXRlX2luX3JlcG9ydGVyKFJFUE9SVEVSU1tFRElUSU9OU1tWQVJJQVRJT05TX09OTFlbY2l0YXRpb24ucmVwb3J0ZXJdWzBdXV1baV0uZWRpdGlvbnMsIGNpdGF0aW9uLnllYXIpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBvc3NpYmxlX2NpdGF0aW9ucy5wdXNoKChjaXRhdGlvbi5yZXBvcnRlciwgaSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwb3NzaWJsZV9jaXRhdGlvbnMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gV2Ugd2VyZSBhYmxlIHRvIGlkZW50aWZ5IG9ubHkgb25lIGhpdCBhZnRlciBmaWx0ZXJpbmcgYnkgeWVhci5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaXRhdGlvbi5jYW5vbmljYWxfcmVwb3J0ZXIgPSBFRElUSU9OU1tWQVJJQVRJT05TX09OTFlbcG9zc2libGVfY2l0YXRpb25zWzBdWzBdXVswXV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2l0YXRpb24ucmVwb3J0ZXIgPSBWQVJJQVRJT05TX09OTFlbcG9zc2libGVfY2l0YXRpb25zWzBdWzBdXVswXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaXRhdGlvbi5sb29rdXBfaW5kZXggPSBwb3NzaWJsZV9jaXRhdGlvbnNbMF1bMV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdW5hbWJpZ3VvdXNfY2l0YXRpb25zLnB1c2goY2l0YXRpb24pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHZhciBwb3NzaWJsZV9jaXRhdGlvbnMgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaT0wLGlsZW49UkVQT1JURVJTW0VESVRJT05TW1ZBUklBVElPTlNfT05MWVtjaXRhdGlvbi5yZXBvcnRlcl1bMF1dXS5sZW5ndGg7aTxpbGVuO2krPTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAodmFyIHZhcmlhdGlvbl9rZXkgaW4gUkVQT1JURVJTW0VESVRJT05TW1ZBUklBVElPTlNfT05MWVtjaXRhdGlvbi5yZXBvcnRlcl1bMF1dXVsndmFyaWF0aW9ucyddKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHZhcmlhdGlvbl9rZXkgPT0gY2l0YXRpb24ucmVwb3J0ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcG9zc2libGVfY2l0YXRpb25zLnB1c2goUkVQT1JURVJTW0VESVRJT05TW1ZBUklBVElPTlNfT05MWVtjaXRhdGlvbi5yZXBvcnRlcl1bMF1dXS52YXJpYXRpb25zW3ZhcmlhdGlvbl9rZXldLCBpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKHBvc3NpYmxlX2NpdGF0aW9ucy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFdlIHdlcmUgYWJsZSB0byBmaW5kIGEgc2luZ2xlIG1hdGNoIGFmdGVyIGZpbHRlcmluZyBieSB2YXJpYXRpb24uXG4gICAgICAgICAgICAgICAgICAgICAgICBjaXRhdGlvbi5jYW5vbmljYWxfcmVwb3J0ZXIgPSBFRElUSU9OU1twb3NzaWJsZV9jaXRhdGlvbnNbMF1bMF1dO1xuICAgICAgICAgICAgICAgICAgICAgICAgY2l0YXRpb24ucmVwb3J0ZXIgPSBwb3NzaWJsZV9jaXRhdGlvbnNbMF1bMF07XG4gICAgICAgICAgICAgICAgICAgICAgICBjaXRhdGlvbi5sb29rdXBfaW5kZXggPSBwb3NzaWJsZV9jaXRhdGlvbnNbMF1bMV07XG4gICAgICAgICAgICAgICAgICAgICAgICB1bmFtYmlndW91c19jaXRhdGlvbnMucHVzaChjaXRhdGlvbik7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gTXVsdGlwbGUgdmFyaWF0aW9ucywgZGVhbCB3aXRoIHRoZW0uXG4gICAgICAgICAgICAgICAgdmFyIHBvc3NpYmxlX2NpdGF0aW9ucyA9IFtdO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIHJlcG9ydGVyX2tleSBpbiBWQVJJQVRJT05TX09OTFlbY2l0YXRpb24ucmVwb3J0ZXJdKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGk9MCxpbGVuPVJFUE9SVEVSU1tFRElUSU9OU1tyZXBvcnRlcl9rZXldXTtpPGlsZW47aSs9MSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gVGhpcyBpbm5lciBsb29wIHdvcmtzIHJlZ2FyZGxlc3Mgb2YgdGhlIG51bWJlciBvZiByZXBvcnRlcnMgdW5kZXIgdGhlIGtleS5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpc19kYXRlX2luX3JlcG9ydGVyKFJFUE9SVEVSU1tFRElUSU9OU1tyZXBvcnRlcl9rZXldXVtpXS5lZGl0aW9ucywgY2l0YXRpb24ueWVhcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwb3NzaWJsZV9jaXRhdGlvbnMucHVzaChjaXRhdGlvbik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHBvc3NpYmxlX2NpdGF0aW9ucy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gV2Ugd2VyZSBhYmxlIHRvIGlkZW50aWZ5IG9ubHkgb25lIGhpdCBhZnRlciBmaWx0ZXJpbmcgYnkgeWVhci5cbiAgICAgICAgICAgICAgICAgICAgY2l0YXRpb24uY2Fub25pY2FsX3JlcG9ydGVyID0gRURJVElPTlNbcG9zc2libGVfY2l0YXRpb25zWzBdWzBdXTtcbiAgICAgICAgICAgICAgICAgICAgY2l0YXRpb24ucmVwb3J0ZXIgPSBwb3NzaWJsZV9jaXRhdGlvbnNbMF1bMF07XG4gICAgICAgICAgICAgICAgICAgIGNpdGF0aW9uLmxvb2t1cF9pbmRleCA9IHBvc3NpYmxlX2NpdGF0aW9uc1swXVsxXTtcbiAgICAgICAgICAgICAgICAgICAgdW5hbWJpZ3VvdXNfY2l0YXRpb25zLnB1c2goY2l0YXRpb24pO1xuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgZm9yICh2YXIgaD0wLGhsZW49Y2l0YXRpb25zLmxlbmd0aDtoPGhsZW47aCs9MSkge1xuICAgICAgICBpZiAodW5hbWJpZ3VvdXNfY2l0YXRpb25zLmluZGV4T2YoY2l0YXRpb24pID09PSAtMSkge1xuICAgICAgICAgICAgLy8gVHJ5IG1hdGNoaW5nIGJ5IHllYXIuXG4gICAgICAgICAgICBpZiAodHJ1ZSkge1xuICAgICAgICAgICAgICAgIC8vIEl0J3MgYSBtYXR0ZXIgb2YgZmlndXJpbmcgb3V0IHdoaWNoXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIFVuYWJsZSB0byBkaXNhbWJpZ3VhdGUsIGp1c3QgYWRkIGl0IGFueXdheSBzbyB3ZSBjYW4gcmV0dXJuIGl0LlxuICAgICAgICAgICAgICAgIHVuYW1iaWd1b3VzX2NpdGF0aW9ucy5wdXNoKGNpdGF0aW9uKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdW5hbWJpZ3VvdXNfY2l0YXRpb25zO1xufVxuV2FsdmVyaW5lLmdldF9jaXRhdGlvbnMgPSBmdW5jdGlvbiAodGV4dCwgaHRtbCwgZG9fcG9zdF9jaXRhdGlvbiwgZG9fZGVmZW5kYW50KSB7XG4gICAgdmFyIEVESVRJT05TID0gdGhpcy5jb25zdGFudHMuRURJVElPTlM7XG4gICAgdmFyIFZBUklBVElPTlNfT05MWSA9IHRoaXMuY29uc3RhbnRzLlZBUklBVElPTlNfT05MWTtcbiAgICB2YXIgZ2V0X3Zpc2libGVfdGV4dCA9IHRoaXMudXRpbHMuZ2V0X3Zpc2libGVfdGV4dDtcblxuICAgIGlmIChcInVuZGVmaW5lZFwiID09PSB0eXBlb2YgaHRtbCkge1xuICAgICAgICBodG1sID0gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKFwidW5kZWZpbmVkXCIgPT09IHR5cGVvZiBkb19wb3N0X2NpdGF0aW9uKSB7XG4gICAgICAgIGRvX3Bvc3RfY2l0YXRpb24gPSB0cnVlO1xuICAgIH1cbiAgICBpZiAoXCJ1bmRlZmluZWRcIiA9PT0gdHlwZW9mIGRvX2RlZmVuZGFudCkge1xuICAgICAgICBkb19kZWZlbmRhbnQgPSB0cnVlO1xuICAgIH1cbiAgICBpZiAoaHRtbCkge1xuICAgICAgICB0ZXh0ID0gZ2V0X3Zpc2libGVfdGV4dCh0ZXh0KTtcbiAgICB9XG4gICAgdmFyIHdvcmRzID0gdGhpcy50b2tlbml6ZSh0ZXh0KTtcbiAgICB2YXIgY2l0YXRpb25zID0gW107XG4gICAgLy8gRXhjbHVkZSBmaXJzdCBhbmQgbGFzdCB0b2tlbnMgd2hlbiBsb29raW5nIGZvciByZXBvcnRlcnMsIGJlY2F1c2UgdmFsaWRcbiAgICAvLyBjaXRhdGlvbnMgbXVzdCBoYXZlIGEgdm9sdW1lIGJlZm9yZSBhbmQgYSBwYWdlIG51bWJlciBhZnRlciB0aGUgcmVwb3J0ZXIuXG4gICAgdmFyIHByb2dyZXNzX3ZhbHVlID0gMDtcbiAgICBmb3IgKHZhciBpPTEsaWxlbj13b3Jkcy5sZW5ndGgtMTtpPGlsZW47aSs9MSkge1xuICAgICAgICAvLyBGaW5kIHJlcG9ydGVyXG4gICAgICAgIC8vaWYgKFtrZXkgZm9yIChrZXkgaW4gRURJVElPTlMpXS5jb25jYXQoW2tleSBmb3IgKGtleSBpbiBWQVJJQVRJT05TX09OTFkpXSkuaW5kZXhPZih3b3Jkc1tpXSkgPiAtMSkge1xuICAgICAgICBpZiAoXy5rZXlzKEVESVRJT05TKS5jb25jYXQoXy5rZXlzKFZBUklBVElPTlNfT05MWSkpLmluZGV4T2Yod29yZHNbaV0pID4gLTEpIHtcbiAgICAgICAgICAgIGNpdGF0aW9uID0gdGhpcy5leHRyYWN0X2Jhc2VfY2l0YXRpb24od29yZHMsIGkpO1xuICAgICAgICAgICAgaWYgKCFjaXRhdGlvbikge1xuICAgICAgICAgICAgICAgIC8vIE5vdCBhIHZhbGlkIGNpdGF0aW9uOyBjb250aW51ZSBsb29raW5nXG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgcHJlb2Zmc2V0ID0gMDtcbiAgICAgICAgICAgIGlmIChkb19wb3N0X2NpdGF0aW9uKSB7XG4gICAgICAgICAgICAgICAgLy9jaXRhdGlvbi5ycHRyX2lkeCA9IFxuICAgICAgICAgICAgICAgIHZhciBwcmVvZmZzZXQgPSB0aGlzLmdldF9wcmVfY2l0YXRpb24oY2l0YXRpb24sIGNpdGF0aW9ucywgd29yZHMsIGkpO1xuICAgICAgICAgICAgICAgIGlmICghcHJlb2Zmc2V0ICYmIGNpdGF0aW9uLnZvbHVtZSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmFkZF9wb3N0X2NpdGF0aW9uKGNpdGF0aW9uLCB3b3JkcywgaSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFjaXRhdGlvbi52b2x1bWUpIHtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNpdGF0aW9ucy5wdXNoKGNpdGF0aW9uKTtcbiAgICAgICAgICAgIGlmIChkb19kZWZlbmRhbnQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmFkZF9kZWZlbmRhbnQoY2l0YXRpb25zLCB3b3JkcywgKGktcHJlb2Zmc2V0KSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBWaXJ0dWFsIGJ1ZmZlclxuICAgICAgICAgICAgaWYgKGNpdGF0aW9uLnRpdGxlICYmIGNpdGF0aW9uLnllYXIgJiYgdGhpcy5idWZmZXIpIHtcbiAgICAgICAgICAgICAgICAvLyBJZiB3ZSBoYXZlIGEgY29tcGxldGUgY2l0ZSwgY2xlYXIgdGhlIGJ1ZmZlciBvZiB5ZWFybGVzcyBjaXRhdGlvbnNcbiAgICAgICAgICAgICAgICAvLyAoYnVmZmVyIGFjY2VwdGFuY2UgdGFrZXMgcGxhY2UgaW4gYWRkX2RlZmVuZGFudCgpKVxuICAgICAgICAgICAgICAgIGNpdGF0aW9ucyA9IGNpdGF0aW9ucy5zbGljZSgwLHRoaXMuYnVmZmVyKTtcbiAgICAgICAgICAgICAgICB0aGlzLmJ1ZmZlciA9IDA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIWNpdGF0aW9uLnllYXIpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmJ1ZmZlciArPSAtMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICAvLyBEcm9wIGNpdGF0aW9ucyBmb3Igd2hpY2ggbm8geWVhciB3YXMgZm91bmRcbiAgICBmb3IgKHZhciBpPWNpdGF0aW9ucy5sZW5ndGgtMTtpPi0xO2krPS0xKSB7XG4gICAgICAgIGlmICghY2l0YXRpb25zW2ldLnllYXIpIHtcbiAgICAgICAgICAgIGNpdGF0aW9ucyA9IGNpdGF0aW9ucy5zbGljZSgwLGkpLmNvbmNhdChjaXRhdGlvbnMuc2xpY2UoaSsxKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBEaXNhbWJpZ3VhdGUgYWxsIHRoZSByZXBvcnRlcnNcbiAgICBjaXRhdGlvbnMgPSB0aGlzLmRpc2FtYmlndWF0ZV9yZXBvcnRlcnMoY2l0YXRpb25zKVxuXG4gICAgLy8gU3RhbXAgZm9yIGp1cmlzZGljdGlvblxuICAgIHRoaXMuaW5mZXJfanVyaXNkaWN0aW9uKGNpdGF0aW9ucyk7XG5cbiAgICAvLyBGaWxsIG91dCBjaXRhdGlvbnMgd2l0aCBtaXNzaW5nIHBhcnR5IG5hbWVzIG9yIGp1cmlzZGljdGlvbiB2YWx1ZXNcbiAgICBpZiAoY2l0YXRpb25zLmxlbmd0aCkge1xuICAgICAgICB0aGlzLmFwcGx5X2p1cmlzZGljdGlvbihjaXRhdGlvbnNbMF0sIFwidXNcIik7XG4gICAgfVxuICAgIGZvciAodmFyIGk9MSxpbGVuPWNpdGF0aW9ucy5sZW5ndGg7aTxpbGVuO2krPTEpIHtcbiAgICAgICAgaWYgKGNpdGF0aW9uc1tpXS5DQVJSWV9GT1JXQVJEKSB7XG4gICAgICAgICAgICB0aGlzLmNhcnJ5X2ZvcndhcmQoY2l0YXRpb25zLCBpKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmFwcGx5X2p1cmlzZGljdGlvbihjaXRhdGlvbnNbaV0sIFwidXNcIik7XG4gICAgfVxuXG4gICAgLy8gTWFyayByZWxhdGVkIGNpdGF0aW9uc1xuICAgIHZhciBsYXN0UGxhaW50aWZmID0gZmFsc2U7XG4gICAgdmFyIGxhc3REZWZlbmRhbnQgPSBmYWxzZTtcbiAgICB2YXIgbGFzdEp1cmlzZGljdGlvbiA9IGZhbHNlO1xuICAgIHZhciByZWxhdGlvbnMgPSBbXTtcbiAgICBmb3IgKHZhciBpPTAsaWxlbj1jaXRhdGlvbnMubGVuZ3RoO2k8aWxlbjtpKz0xKSB7XG4gICAgICAgIHZhciBjaXRhdGlvbiA9IGNpdGF0aW9uc1tpXTtcbiAgICAgICAgY2l0YXRpb24uc2VxSUQgPSBpO1xuICAgICAgICBpZiAoY2l0YXRpb24ucGxhaW50aWZmICE9PSBsYXN0UGxhaW50aWZmIHx8IGNpdGF0aW9uLmRlZmVuZGFudCAhPT0gbGFzdERlZmVuZGFudCB8fCBjaXRhdGlvbi5tbHpfanVyaXNkaWN0aW9uICE9PSBsYXN0SnVyaXNkaWN0aW9uKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBqIGluIHJlbGF0aW9ucykge1xuICAgICAgICAgICAgICAgIGNpdGF0aW9uc1tyZWxhdGlvbnNbal1dLnJlbGF0aW9ucyA9IHJlbGF0aW9ucy5zbGljZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVsYXRpb25zID0gW107XG4gICAgICAgIH1cbiAgICAgICAgcmVsYXRpb25zLnB1c2goaSk7XG4gICAgICAgIGxhc3RQbGFpbnRpZmYgPSBjaXRhdGlvbi5wbGFpbnRpZmY7XG4gICAgICAgIGxhc3REZWZlbmRhbnQgPSBjaXRhdGlvbi5kZWZlbmRhbnQ7XG4gICAgICAgIGxhc3RKdXJpc2RpY3Rpb24gPSBjaXRhdGlvbi5tbHpfanVyaXNkaWN0aW9uO1xuICAgIH1cbiAgICAvLyBQcm9jZXNzIHRoZSBsYXN0IGl0ZW0gYW5kIGl0cyByZWxhdGlvbnNcbiAgICBmb3IgKHZhciBqIGluIHJlbGF0aW9ucykge1xuICAgICAgICBjaXRhdGlvbnNbcmVsYXRpb25zW2pdXS5yZWxhdGlvbnMgPSByZWxhdGlvbnMuc2xpY2UoKTtcbiAgICB9XG4gICAgXG4gICAgLy8gUG9wdWxhdGUgQ0VSVF9ERU5JRUQgYW5kIENFUlRfR1JBTlRFRCBkaXNwb3NpdGlvbiBmb3J3YXJkIGFuZCBiYWNrXG4gICAgZm9yICh2YXIgaT0xLGlsZW49Y2l0YXRpb25zLmxlbmd0aDtpPGlsZW47aSs9MSkge1xuICAgICAgICB2YXIgY2l0YXRpb24gPSBjaXRhdGlvbnNbaV07XG4gICAgICAgIHZhciBwcmV2X2NpdGF0aW9uID0gY2l0YXRpb25zW2ktMV07XG4gICAgICAgIGlmIChjaXRhdGlvbi5DRVJUKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBqPTAsamxlbj1jaXRhdGlvbi5yZWxhdGlvbnMubGVuZ3RoO2o8amxlbjtqKz0xKSB7XG4gICAgICAgICAgICAgICAgdmFyIHBvcyA9IGNpdGF0aW9uLnJlbGF0aW9uc1tqXTtcbiAgICAgICAgICAgICAgICBjaXRhdGlvbnNbcG9zXS5jZXJ0X29yZGVyID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvciAodmFyIGo9MCxqbGVuPXByZXZfY2l0YXRpb24ucmVsYXRpb25zLmxlbmd0aDtqPGpsZW47ais9MSkge1xuICAgICAgICAgICAgICAgIHZhciBwb3MgPSBwcmV2X2NpdGF0aW9uLnJlbGF0aW9uc1tqXTtcbiAgICAgICAgICAgICAgICBjaXRhdGlvbnNbcG9zXS5kaXNwb3NpdGlvbiA9IFwiY2VydGlvcmFyaSBcIiArIGNpdGF0aW9uLkNFUlQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gY2l0YXRpb25zO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFdhbHZlcmluZTtcblxuIl19
