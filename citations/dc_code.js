Citation.types.dc_code = {
  name: "DC Code",
  type: "regex",

  // normalize all cites to an ID, with and without subsections
  standardize: function(data) {
    return {
      id: _.flatten(["dc-code", data.title, data.section, data.subsections]).join("/"),
      section_id: ["dc-code", data.title, data.section].join("/")
    }
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
        {
          regex:
            "§\\s+(?<title>\\d+)" +    
            "\\-" +                 
            "(?<section>[\\w\\d\\.]+)" +      // section identifier, letters/numbers/dots
            "(?<subsections>(?:\\([^\\)]+\\))*)", // any number of adjacent parenthesized subsections

          processor: function(captures) {
            var title = captures.title;
            var section = captures.section;
            var subsections = [];
            if (captures.subsections) subsections = _.compact(captures.subsections.split(/[\(\)]+/));

            return {
              title: title,
              section: section,
              subsections: subsections
            };
          }
        }
      ]
    } 

    // absolute cites
    else {
      return [

        // D.C. Official Code 3-1202.04
        // D.C. Official Code § 3-1201.01
        // D.C. Official Code §§ 38-2602(b)(11)
        {
          regex: 
            "D\\.?C\\.? Official Code\\s+" + // absolute identifier
            "(?:§*\\s+)?(?<title>\\d+)" +            // optional section sign, plus title
            "\\-" +                 
            "(?<section>[\\w\\d\\.]+)" +      // section identifier, letters/numbers/dots
            "(?<subsections>(?:\\([^\\)]+\\))*)", // any number of adjacent parenthesized subsections

          processor: function(captures) {
            var title = captures.title;
            var section = captures.section;
            var subsections = [];
            if (captures.subsections) subsections = _.compact(captures.subsections.split(/[\(\)]+/));

            return {
              title: title,
              section: section,
              subsections: subsections
            };
          }
        }
      ]
    }

  }
}