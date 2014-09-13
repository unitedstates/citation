var base_regex =
  "(\\d+A?)" + // title
  "\\s?\\-\\s?" + // dash
  "([\\w\\d]+(?:\\.?[\\w\\d]+)?)" +  // section identifier (letters/numbers/dots)
  "((?:\\([^\\)]+\\))*)"; // subsection (any number of adjacent parenthesized subsections)

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
    // D.C. Official Code 3-1202.04
    // D.C. Official Code § 3-1201.01
    // D.C. Official Code §§ 38-2602(b)(11)
    // D.C. Official Code § 3- 1201.01
    // D.C. Official Code § 3 -1201.01
    //
    // § 32-701
    // § 32-701(4)
    // § 3-101.01
    // § 1-603.01(13)
    // § 1- 1163.33
    // § 1 -1163.33
    // section 16-2326.01

    var prefix_regex = "";
    var section_regex = "(?:sections?|§+)\\s+";
    if (context.source != "dc_code") {
      // Require "DC Official Code" but then make the section symbol optional.
      prefix_regex = "D\\.?C\\.? (?:Official )?Code\\s+";
      section_regex = "(?:" + section_regex + ")?";
    }

    return [
      {
        regex: prefix_regex + section_regex + base_regex,

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
};
