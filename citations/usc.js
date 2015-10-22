module.exports = {
  type: "regex",

  id: function(cite) {
    return ["usc", cite.title, cite.section]
      .concat(cite.subsections || [])
      .join("/");
  },

  canonical: function(cite) {
    // title, which alos may specify it is an appendix title
    var title = cite.title;
    var app = "";
    var title_without_app = cite.title.replace(/-app$/, '');
    if (title != title_without_app) app = "App. ";

    // subsections, possibly with a note/et-seq as a leaf which should
    // be rendered differently from a normal subsection item
    var subsections = cite.subsections.slice(); // clone
    var suffix = "";
    var leaf = subsections.length > 0 ? subsections[subsections.length-1] : null;
    if (leaf == "note") {
      subsections.pop();
      suffix = " note"
    } else if (leaf == "et-seq") {
      subsections.pop();
      suffix = " et seq"
    }

    return title_without_app + " U.S.C. " + app + cite.section
     + subsections.map(function(item) { return "(" + item + ")" }).join("")
     + suffix;
  },

  // field to calculate parents from
  parents_by: "subsections",

  patterns: [
    // "5 USC 552"
    // "5 U.S.C. § 552(a)(1)(E)"
    // "7 U.S.C. 612c note"
    // "29 U.S.C. 1081 et seq"
    // "50 U.S.C. App. 595"
    // "45 U.S.C. 10a-10c"
    // "50 U.S.C. 404o-1(a)" - single section
    // "45 U.S.C. 10a(1)-10c(2)" - range
    // "50 U.S.C. App. §§ 451--473" - range
    {
      regex:
        "(\\d+)\\s+" + // title
        "U\\.?\\s?S\\.?\\s?C\\.?" +
        "(?:\\s+(App)\.?)?" + // appendix
        "(?:\\s+(§+))?" + // symbol
        "\\s+((?:\\-*\\d+[\\w\\d\\-]*(?:\\([^\\)]+\\))*)+)" + // sections
        "(?:\\s+(note|et\\s+seq))?", // note

      fields: [
        'title', 'appendix',
        'symbol', 'sections', 'note'
      ],

      processor: function(match) {
        // a few titles have distinct appendixes
        var title = match.title;
        if (match.appendix) title += "-app";

        var sections = match.sections.split(/-+/);

        var range = false;

        // two section symbols is unambiguous
        if (match.symbol == "§§") // 2 section symbols
          range = true;

        // paren before dash is unambiguous
        else {
          var dash = match.sections.indexOf("-");
          var paren = match.sections.indexOf("(");
          if (dash > 0 && paren > 0 && paren < dash)
            range = true;
        }

        // if there's a hyphen and the range is ambiguous,
        // also return the original section string as one
        if ((sections.length > 1) && !range)
          sections.unshift(match.sections);

        return sections.map(function(section) {
          // separate subsections for each section being considered
          var split = section.split(/[\(\)]+/).filter(function(x) {return x});
          section = split[0];
          subsections = split.splice(1);
          if (match.note)
            subsections.push(match.note.replace(" ", "-")); // "note" or "et seq"

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

      fields: ['section', 'subsections', 'title'],

      processor: function(match) {
        return {
          title: match.title,
          section: match.section,
          subsections: match.subsections.split(/[\(\)]+/).filter(function(x) {return x})
        };
      }
    }
  ],

  links: function(cite) {
    // US GPO
    var title = cite.title.replace(/-app$/, '');
    var links = {};

    var edition;
    for (var i = 0; i < us_code_editions.length; i++) {
        if (us_code_editions[i].titles == null || us_code_editions[i].titles.indexOf(title) >= 0) {
          // This edition contains the title.
          edition = us_code_editions[i]
          break;
        }
    }

    if (edition) {
      var url = "http://api.fdsys.gov/link?collection=uscode&year="
        + edition.edition + "&title=" + title
        + "&section=" + cite.section
        + "&type=" + (cite.title.indexOf("-app") == -1 ? "usc" : "uscappendix");
      
      links.usgpo = {
          source: {
              name: "U.S. Government Publishing Office",
              abbreviation: "US GPO",
              link: "http://www.gpo.gov",
              authoritative: true,
              note: edition.edition + " edition." + ((cite.subsections && cite.subsections.length) ? " Sub-section citation is not reflected in the link." : "")
          },
          pdf: url,
          html: url + "&link-type=html",
          landing: url + "&link-type=contentdetail",
      };
    }

    // Cornell Legal Information Institute
    // (for current citations only, i.e. not tied to a publication or effective date)
    var subsections = (cite.subsections.slice() || []); // clone
    if (subsections.length && subsections[subsections.length-1] == "et-seq") subsections.pop(); // don't include eq-seq in a link
    links.cornell_lii = {
        source: {
            name: "Cornell Legal Information Institute",
            abbreviation: "Cornell LII",
            link: "https://www.law.cornell.edu/uscode/text",
            authoritative: false,
            note: "Link is to most current version of the US Code, as available at law.cornell.edu."
        },
        landing: "https://www.law.cornell.edu/uscode/text/" + (title + (cite.title.indexOf("-app") >= 0 ? "a" : ""))
                          + "/" + cite.section
                          + (subsections.length ? ("#" + subsections.join("_")) : "")
    };

    return links;
  }
};

// Map published editions of the US Code to the titles they contain. Not all
// published editions have the full US Code. Some are updates. This is per
// http://www.gpo.gov/fdsys/browse/collectionUScode.action?collectionCode=USCODE.
// Most recent first.
var us_code_editions = [
    { edition: '2014', titles: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15'] },
    { edition: '2013', titles: null }, // all titles available in this edition
];
