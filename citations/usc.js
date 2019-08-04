module.exports = {
  type: "regex",

  name: "United States Code",

  id: function(cite) {
    return ["usc", cite.title, cite.section]
      .concat(cite.subsections || [])
      .join("/");
  },

  canonical: function(cite) {
    // title, which also may specify it is an appendix title
    var title = cite.title;
    var app = "";
    var title_without_app = cite.title.replace(/-app$/, '');
    if (title != title_without_app) app = "App. ";

    // subsections, possibly with a note/et-seq as a leaf which should
    // be rendered differently from a normal subsection item
    var subsections = cite.subsections.slice(); // clone
    var suffix = "";
    var leaf = subsections.length > 0 ? subsections[subsections.length-1] : null;
    if (leaf == "note") {
      subsections.pop();
      suffix = " note"
    } else if (leaf == "et-seq") {
      subsections.pop();
      suffix = " et seq"
    }

    return title_without_app + " U.S.C. " + app + cite.section
     + subsections.map(function(item) { return "(" + item + ")" }).join("")
     + suffix;
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
        "(?:\\s+(App)\.?)?\\s*" + // appendix
        "(?:(§+)\\s*)?" + // symbol
        "((?:[-–—]*\\d+[\\w\\d\\-–—]*(?:\\([^\\)]+\\))*)+)" + // sections
        "(?:\\s+(note|et\\s+seq))?", // note

      fields: [
        'title', 'appendix',
        'symbol', 'sections', 'note'
      ],

      processor: function(match) {
        // a few titles have distinct appendixes
        var title = match.title;
        if (match.appendix) title += "-app";

        var sections = match.sections.split(/[-–—]+/);
        var match_sections_normalized = match.sections.replace(/[–—]/g, '-');

        var range = false;

        // two section symbols is unambiguous
        if (match.symbol == "§§") // 2 section symbols
          range = true;

        // paren before dash is unambiguous
        else {
          var dash = match_sections_normalized.indexOf("-");
          var paren = match_sections_normalized.indexOf("(");
          if (dash > 0 && paren > 0 && paren < dash)
            range = true;
        }

        // if there's a hyphen and the range is ambiguous,
        // also return the original section string as one
        if ((sections.length > 1) && !range)
          sections.unshift(match_sections_normalized);

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
        "section (\\d+[\\w\\d\\-–—]*)((?:\\([^\\)]+\\))*)" +
        "(?:\\s+of|\\,) title (\\d+)",

      fields: ['section', 'subsections', 'title'],

      processor: function(match) {
        return {
          title: match.title,
          section: match.section.replace(/[–—]/g, '-'),
          subsections: match.subsections.split(/[\(\)]+/).filter(function(x) {return x})
        };
      }
    },

    // "Section 14123(a)(2) of 49 U.S.C."
    // "Section 14123(a)(2), 49 U.S.C."
    {
      regex:
        "section (\\d+[\\w\\d\\-–—]*)((?:\\([^\\)]+\\))*)" +
        "(?:\\s+of|\\,) (\\d+) " +
        "U\\.?\\s?S\\.?\\s?C\\.?",

      fields: ['section', 'subsections', 'title'],

      processor: function(match) {
        return {
          title: match.title,
          section: match.section.replace(/[–—]/g, '-'),
          subsections: match.subsections.split(/[\(\)]+/).filter(function(x) {return x})
        };
      }
    }
  ]
};
