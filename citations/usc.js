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
      processor: function(captures) {
        // a few titles have distinct appendixes
        var title = captures[0];
        if (captures[1]) title += "-app";

        var sections = captures[3].split(/-+/);

        var range = false;

        // two section symbols is unambiguous
        if (captures[2] == "§§") // 2 section symbols
          range = true;

        // paren before dash is unambiguous
        else { 
          var dash = captures[3].indexOf("-");
          var paren = captures[3].indexOf("(");
          if (dash > 0 && paren > 0 && paren < dash)
            range = true;
        }

        // if there's a hyphen and the range is ambiguous, 
        // also return the original section string as one
        if ((sections.length > 1) && !range) 
          sections.unshift(captures[3]);

        return _.map(sections, function(section) {
          // separate subsections for each section being considered
          var split = _.compact(section.split(/[\(\)]+/));
          section = split[0];
          subsections = split.splice(1);
          if (captures[4]) subsections.push(captures[4]); // "note"

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
      processor: function(captures) {
        return {
          title: captures[2],
          section: captures[0],
          subsections: _.compact(captures[1].split(/[\(\)]+/))
        };
      }
    }
  ]
};