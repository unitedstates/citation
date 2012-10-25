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
      processor: function(match) {
        var title = match[1];
        var part, section, subsections;
        
        // separate subsections for each section being considered
        var split = _.compact(match[2].split(/[\(\)]+/));
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