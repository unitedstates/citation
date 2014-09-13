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
          cites = Citation._.flatten(cites.map(function(cite) {
            return Citation.citeParents(cite, type);
          }));
        }

        cites = cites.map(function(cite) {
          var result = {};

          // match-level info
          Citation._.extend(result, matchInfo);

          // cite-level info, plus ID standardization
          result[type] = cite;
          result[type].id = Citation.types[type].id(cite);

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
  Citation.types.stat = require("./citations/stat");
  Citation.types.reporter = require("./citations/reporter");


  Citation.filters.lines = require("./filters/lines");
}

// auto-load in-browser
if (typeof(window) !== "undefined")
  window.Citation = Citation;

return Citation;

})();

},{"./citations/cfr":2,"./citations/dc_code":3,"./citations/dc_law":4,"./citations/dc_register":5,"./citations/law":7,"./citations/reporter":8,"./citations/stat":9,"./citations/usc":10,"./citations/va_code":11,"./filters/lines":13}],2:[function(require,module,exports){
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
            if (captures.subsections)
              subsections = captures.subsections.split(/[\(\)]+/).filter(function(x) {return x});

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
            "D\\.?C\\.? (?:Official )?Code\\s+" + // absolute identifier
            "(?:§+\\s+)?(\\d+A?)" +            // optional section sign, plus title
            "\\s?\\-\\s?" +
            "([\\w\\d]+(?:\\.?[\\w\\d]+)?)" +      // section identifier, letters/numbers/dots
            "((?:\\([^\\)]+\\))*)", // any number of adjacent parenthesized subsections

          fields: ["title", "section", "subsections"],

          processor: function(captures) {
            var title = captures.title;
            var section = captures.section;

            var subsections = [];
            if (captures.subsections) subsections = captures.subsections.split(/[\(\)]+/).filter(function(x) {return x});

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
};

},{}],4:[function(require,module,exports){
module.exports = {
  type: "regex",

  id: function(cite) {
    return ["dc-law", cite.period, cite.number].join("/");
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
},{"walverine":15}],7:[function(require,module,exports){
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

},{}],8:[function(require,module,exports){
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
        "(\\w+(?:\\.\\dd)?|U\\.?S\\.?|F\\. Supp\\.(?:\\s\\dd)?)\\s" +
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

},{}],9:[function(require,module,exports){
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

},{}],10:[function(require,module,exports){
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

},{}],11:[function(require,module,exports){
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

},{}],12:[function(require,module,exports){
Citation = require("./citation");
Citation.types.judicial = require("./citations/judicial");
module.exports = Citation;
},{"./citation":1,"./citations/judicial":6}],13:[function(require,module,exports){
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

},{}],14:[function(require,module,exports){
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
},{}],15:[function(require,module,exports){
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


},{"./reporters":14}]},{},[12])