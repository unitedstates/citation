(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

},{}],2:[function(require,module,exports){
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

},{}],3:[function(require,module,exports){
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

},{}],4:[function(require,module,exports){
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

},{}],5:[function(require,module,exports){
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

},{}],6:[function(require,module,exports){
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

},{}],7:[function(require,module,exports){
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

},{}],8:[function(require,module,exports){
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

},{}],9:[function(require,module,exports){
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

},{}],10:[function(require,module,exports){
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

},{"./citations/cfr":1,"./citations/dc_code":2,"./citations/dc_law":3,"./citations/dc_register":4,"./citations/law":5,"./citations/reporter":6,"./citations/stat":7,"./citations/usc":8,"./citations/va_code":9,"./filters/lines":11}],11:[function(require,module,exports){
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

},{}]},{},[10])