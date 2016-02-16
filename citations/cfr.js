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
        "\\s*(\\d+(?:(?:[-–—]\\d+)?[a-z]?(?:\\.(?:\\d+T|T|\\d+[-–—]DD[-–—]|\\d+[-–—]WH[-–—]|\\d+[a-z]{1,2}\\d*[-–—])?\\d+[a-z]?(?:(?:(?:\\([a-z]\\))?[-–—]\\d+)+[a-z]?)?)?(?:(?:\\s*\\((?:[a-z\\d]{1,2}|[ixv]+)\\))+)?)?)",

      fields: ['title', 'sections'],

      processor: function(captures) {
        var title = captures.title;
        var part, section, subsections;

        // convert all dashes to hyphens, deduplicate hyphens, and look for
        // subsections starting after the last hyphen
        var hyphen_split = captures.sections.split(/[-–—]+/);
        var head, tail;
        if (hyphen_split.length > 1) {
          head = hyphen_split.slice(0, -1).join("-") + "-";
          tail = hyphen_split[hyphen_split.length - 1];
        } else {
          head = "";
          tail = hyphen_split[0];
        }

        // separate subsections for each section being considered
        var paren_split = tail.split(/[\(\)]+/).filter(function(x) {return x;});
        section = head + paren_split[0].trim();
        subsections = paren_split.splice(1);

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
  ],

  links: function(cite) {
    var gpo_url = "http://api.fdsys.gov/link?collection=cfr&year=mostrecent"
        + "&titlenum=" + cite.title + "&partnum=" + cite.part;
    if (cite.section) // section, if present, is of the form PART.SECTION, and for the GPO url only include the (inner) section
      gpo_url += "&sectionnum=" + cite.section.substring(cite.part.length+1) + "";

    return {
      usgpo: {
        source: {
            name: "U.S. Government Publishing Office",
            abbreviation: "US GPO",
            link: "http://www.gpo.gov",
            authoritative: true
        },

        pdf: gpo_url
      }
    };
  }
};
