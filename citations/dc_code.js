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
    var sections_regex = "(?:sections|§§)\\s+";
    if (context.source != "dc_code") {
      // Require "DC Official Code" but then make the section symbol optional.
      prefix_regex = "D\\.?C\\.? (?:Official )?Code\\s+";
      section_regex = "(?:" + section_regex + ")?";
      sections_regex = "(?:" + sections_regex + ")?";
    }

    return [
      // multiple citations
      // has precedence over a single citation
      // Unlike the single citation, the matched parts are just the title/section/subsection
      // and omits "DC Code" and the section symbols (if present) from the matched text.
      {
        regex: "(" + prefix_regex + sections_regex + ")(" + base_regex + "(?:(?:,|, and|\\s+and|\\s+through|\\s+to)\\s+" + base_regex + ")+)",

        fields: ["prefix", "multicite", "title1", "section1", "subsections1", "title2", "section2", "subsections2"],

        processor: function(captures) {
          var rx = new RegExp(base_regex, "g");
          var matches = new Array();
          var match;
          while((match = rx.exec(captures.multicite)) !== null) {
            matches.push({
              _submatch: {
                text: match[0],
                offset: captures.prefix.length + match.index,
              },
              title: match[1],
              section: match[2],
              subsections: split_subsections(match[3])
            });
          }
          return matches;
        }
      },

      // a single citation
      {
        regex: prefix_regex + section_regex + base_regex,

        fields: ["title", "section", "subsections"],

        processor: function(captures) {
          var title = captures.title;
          var section = captures.section;
          var subsections = split_subsections(captures.subsections);

          return {
            title: title,
            section: section,
            subsections: subsections
          };
        }
      }
    ];
  },

  links: function(cite) {
    return {
      dccodeorg: {
        source: {
            name: "DCCode.org",
            abbreviation: "DCCode.org",
            link: "http://www.dccode.org",
            authoritative: false
        },

        landing: "http://dccode.org/simple/sections/" + cite.title + "-" + cite.section + ".html"
      },
      dcdecoded: {
        source: {
            name: "DC Decoded",
            abbreviation: "DCDecoded.org",
            link: "http://dcdecoded.org",
            authoritative: false
        },

        landing: "http://dcdecoded.org/" + cite.title + "-" + cite.section + "/"
      }
    };
  }
};

function split_subsections(match) {
  if (match)
    return match.split(/[\(\)]+/).filter(function(x) {return x});
  else
    return [];
}