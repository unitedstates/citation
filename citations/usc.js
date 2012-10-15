Citation.types.usc = {
  name: "US Code",
  type: "regex",

  // normalize all cites to an ID, with and without subsections
  standardize: function(data) {
    return {
      id: _.flatten([data.title, "usc", data.section, data.subsections]).join("_"),
      section_id: [data.title, "usc", data.section].join("_")
    }
  },

  patterns: [
    // "5 U.S.C. 552"
    // "5 U.S.C. § 552(a)(1)(E)"
    // "7 U.S.C. 612c note"
    // "50 U.S.C. App. 595"
    // "45 U.S.C. 10a-10c"
    // "50 U.S.C. 404o-1(a)" - single section
    // "45 U.S.C. 10a(1)-10c(2)" - range
    // "50 U.S.C. App. §§ 451--473" - range
    {
      regex:
        "(\\d+)\\s+" +
        "U\\.?\\s?S\\.?\\s?C\\.?" +
        "(?:\\s+(App)\.?)?" +
        "(?:\\s+(§+))?" +
        "\\s+((?:\\-*\\d+[\\w\\d\\-]*(?:\\([^\\)]+\\))*)+)" +
        "(?:\\s+(note))?",
      processor: function(match) {
        // a few titles have distinct appendixes
        var title = match[1];
        if (match[2]) title += "-app";

        var sections = match[4].split(/-+/);

        var range = false;
        if (match[3] == "§§") // 2 section symbols
          range = true;
        else {
          var dash = match[4].indexOf("-");
          var paren = match[4].indexOf("(");
          if (dash > 0 && paren > 0 && paren < dash) // paren before dash
            range = true;
        }

        // if there's a hyphen and the range is ambiguous, 
        // also return the original section string as one
        if ((sections.length > 1) && !range) 
          sections.unshift(match[4]);

        return _.map(sections, function(section) {
          // separate subsections for each section being considered
          var split = _.compact(section.split(/[\(\)]+/));
          section = split[0];
          subsections = split.splice(1);
          if (match[5]) subsections.push(match[5]); // "note"

          return {
            title: title,
            section: section,
            subsections: subsections
          }
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
      processor: function(match) {
        return {
          title: match[3],
          section: match[1],
          subsections: _.compact(match[2].split(/[\(\)]+/))
        }
      }
    }
  ]
};