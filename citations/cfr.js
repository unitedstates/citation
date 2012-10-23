Citation.types.cfr = {
  name: "US Code of Federal Regulations",
  type: "regex",

  // normalize all cites to an ID, with and without subsections
  standardize: function(data) {
    var section = data.section || data.part;
    return {
      id: _.compact(_.flatten([data.title, "cfr", section, data.subsections])).join("_")
    }
  },

  patterns: [
    // 14 CFR part 25
    // Title 41 CFR Sections 102-74.435
    // 38 CFR Part 74.2
    // 48 CFR § 9903.201
    // 23 CFR 650, Subpart A
    // Appendix A of 10 CFR Part 440
    // 24 CFR 85.25(h)
    // 47 CFR 54.506 (c)
    // 5 CFR §531.610(f)
    // 5CFR, part 575, subpart C
    // 19 Code of Federal Regulations (CFR) Parts 12
    // 13 CFR Parts 125 and 134
    // 45 C.F.R. 3009.4
    {
      regex:
        "(\\d+)\\s+" +
        "C\\.?\\s?F\\.?\\s?R\\.?" +
        "(?:\\s+(?:§+|part))?" +
        "\\s+((?:\\-*\\d+[\\.\\w\\d\\-]*(?:\\([^\\)]+\\))*)+)",
      processor: function(match) {
        var title = match[1];
        var part, section, subsections;
        
        // separate subsections for each section being considered
        var split = _.compact(match[2].split(/[\(\)]+/));
        section = split[0];
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

    // parts 121 and 135 of Title 14 of the Code of Federal Regulations
    // {
    //   regex: 
    //     "section (\\d+[\\w\\d\-]*)((?:\\([^\\)]+\\))*)" +
    //     "(?:\\s+of|\\,) title (\\d+)", 
    //   processor: function(match) {
    //     return {
    //       title: match[3],
    //       section: match[1],
    //       subsections: _.compact(match[2].split(/[\(\)]+/))
    //     };
    //   }
    // }
  ]
};