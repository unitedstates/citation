Citation.types.usc = {
  name: "US Code",
  type: "regex",

  // normalize all cites to an ID, with and without subsections
  standardize: function(data) {
    return {
      id: _.flatten(["usc", data.title, data.section, data.subsections]).join("/"),
      section_id: ["usc", data.title, data.section].join("/")
    }
  },

  // field to calculate parents from
  parents_by: "subsections",

  patterns: [
    // "5 USC 552"
    // "5 U.S.C. § 552(a)(1)(E)"
    // "7 U.S.C. 612c note"
    // "50 U.S.C. App. 595"
    // "45 U.S.C. 10a-10c"
    // "50 U.S.C. 404o-1(a)" - single section
    // "45 U.S.C. 10a(1)-10c(2)" - range
    // "50 U.S.C. App. §§ 451--473" - range
    {
      regex:
        "(?<title>\\d+)\\s+" +
        "(?<whatever>U\\.?\\s?S\\.?\\s?C\\.?)" +
        "(?:\\s+(?<appendix>App)\.?)?" +
        "(?:\\s+(?<symbol>§+))?" +
        "\\s+(?<sections>(?:\\-*\\d+[\\w\\d\\-]*(?:\\([^\\)]+\\))*)+)" +
        "(?:\\s+(?<note>note))?",
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

        return _.map(sections, function(section) {
          // separate subsections for each section being considered
          var split = _.compact(section.split(/[\(\)]+/));
          section = split[0];
          subsections = split.splice(1);
          if (match.note) subsections.push(match.note); // "note"

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
        "section (?<section>\\d+[\\w\\d\-]*)(?<subsections>(?:\\([^\\)]+\\))*)" +
        "(?:\\s+of|\\,) title (?<title>\\d+)", 
      processor: function(match) {
        return {
          title: match.title,
          section: match.section,
          subsections: _.compact(match.subsections.split(/[\(\)]+/))
        };
      }
    }
  ]
};