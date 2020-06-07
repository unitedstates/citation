module.exports = {
  id: "libraryofcongress",

  name: "Library of Congress",
  abbreviation: "LoC",
  link: "https://www.loc.gov",

  authoritative: true,

  citations: {
    /*
    stat: function(cite) {
      // LoC organizes the volumes by Congress and, for some Congresses, by chapter
      // number. This is well and good but awful for direct linking of citations
      // because we don't know the Congress number from a volume (through the 12th
      // volume volumes contained more than one Congress) or the chapter number
      // (which is a sequential numbering of public and private laws, I think?).
      if (cite.volume >= 65) return null;
      return {
        landing: "https://www.loc.gov/law/help/statutes-at-large/index.php",
        note: "Link is to LoC's general Statutes at Large landing page."
      };
    },
    */

    usconst: function(cite) {
      return {
        landing: "https://www.congress.gov/constitution-annotated",
        pdf: get_conan_link(cite),
        note: "Link is to the Constitution Annotated."
      }
    }
  }
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