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
  ],

  links: function(cite) {
    var links = { };

    links.nara = {
      source: {
          name: "The National Archives and Records Administration",
          abbreviation: "NARA",
          link: "http://www.archives.gov",
          authoritative: true
      },
      landing: "http://www.archives.gov/exhibits/charters/constitution_transcript.html",
    };

    links.libraryofcongress = {
      source: {
          name: "Library of Congress - CONAN",
          abbreviation: "LoC (CONAN)",
          link: "https://www.loc.gov",
          authoritative: true,
      },
      landing: "https://www.congress.gov/constitution-annotated",
      pdf: get_conan_link(cite)
    }

    return links;
  }
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

// Helper routines to get a direct link to the PDF of the Constitution Annotated
// for the cited section.

var conan_links = {
  "article-1": "9-2.pdf",
  "article-2": "9-3.pdf",
  "article-3": "9-4.pdf",
  "article-4": "9-5.pdf",
  "article-5": "9-6.pdf",
  "article-6": "9-7.pdf",
  "article-7": "9-8.pdf",
  "amendment-1": "10-2.pdf",
  "amendment-2": "10-3.pdf",
  "amendment-3": "10-4.pdf",
  "amendment-4": "10-5.pdf",
  "amendment-5": "10-6.pdf",
  "amendment-6": "10-7.pdf",
  "amendment-7": "10-8.pdf",
  "amendment-8": "10-9.pdf",
  "amendment-9": "10-10.pdf",
  "amendment-10": "10-11.pdf",
  "amendment-11": "10-12.pdf",
  "amendment-12": "10-13.pdf",
  "amendment-13": "10-14.pdf",
  "amendment-14": "10-15.pdf",
  "amendment-15": "10-16.pdf",
  "amendment-16": "10-17.pdf",
  "amendment-17": "10-18.pdf",
  "amendment-18": "10-19.pdf",
  "amendment-19": "10-20.pdf",
  "amendment-20": "10-21.pdf",
  "amendment-21": "10-22.pdf",
  "amendment-22": "10-23.pdf",
  "amendment-23": "10-24.pdf",
  "amendment-24": "10-25.pdf",
  "amendment-25": "10-26.pdf",
  "amendment-26": "10-27.pdf",
  "amendment-27": "10-28.pdf"
}

function get_conan_link(cite) {
  for (var sec in conan_links) {
    var id_prefix = "usconst/" + sec;
    if (cite.id == id_prefix || cite.id.substring(0, id_prefix.length+1) == (id_prefix+"/"))
        return "https://www.congress.gov/content/conan/pdf/GPO-CONAN-REV-2014-" + conan_links[sec];
  }
  return null;
}