/* Parses citations to the United States Constitution
 *
 * like: U.S. CONST., art. I, ¶ 8, cl. 17
 * as seen in http://pdfserver.amlaw.com/nlj/3-18-16%20dc%20council%20v%20mayor%20order%20NLJ.pdf
  */

var arabic_number = parseInt;
var roman_numeral = require('nomar');

// All of the sub-parts that might be found in the citation.
var part_types = {
  amendment: { abbrev: "Amdt.", regex: "Amdt\\.?|Amend\\.?", numbering: roman_numeral },
  article: { abbrev: "art.", regex: "art\\.?", numbering: roman_numeral },
  section: { abbrev: "§", regex: "§", numbering: arabic_number },
  paragraph: { abbrev: "¶", regex: "¶", numbering: arabic_number },
  clause: { abbrev: "cl.", regex: "cl\\.?", numbering: arabic_number },
};

module.exports = {
  type: "regex",

  // normalize all cites to an ID
  id: function(cite) {
    return ["usconst"].concat((cite.part || []).map(function(part) {
      if (!part) return "?";
      return part.type + "-" + part.number;
    })).join("/");
  },

  canonical: function(cite) {
    var ret = "U.S. Const.";
    for (var i = 0; i < (cite.part || []).length; i++)
      if (cite.part[i]) // did this part parse?
        ret += ", " + part_types[cite.part[i].type].abbrev + " " + cite.part[i].number_str;
    return ret;
  },

  patterns: [
    // "U.S. CONST., art. I, ¶ 8, cl. 17"
    {
      regex:
        "U\\.? ?S\\.? ?C(?:ONST|onst)\\.?" +
        "((:?,? ?" +
        "(" +
        Object.keys(part_types).map(function(type) { return part_types[type].regex; }).join("|") +
        ") ?([IVX0-9]+)" +
        ")*)",
      fields: ['part'],
      processor: function(match) {
        var part = match.part;
        if (part) {
          // Split the comma-separated list of parts into the Constitution.
          part = part.split(/, ?/);
          if (part[0].length == 0)
            part.shift();
          part = part.map(process_part);
        }
        return {
          part: part,
        };
      }
    }
  ]
};

function process_part(part) {
  for (var part_type in part_types) {
    var match = new RegExp("(?:" + part_types[part_type].regex + ") ?([IVX0-9]+)" + "$" , 'i').exec(part);
    if (match) {
      return {
        type: part_type,
        number_str: match[1],
        number: part_types[part_type].numbering(match[1])
      };
    }
  }
  return null; // somehow didn't match
}

