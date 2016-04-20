module.exports = {
  id: "usgpo",

  name: "U.S. Government Publishing Office",
  abbreviation: "US GPO",
  link: "https://www.gpo.gov",

  authoritative: true,

  citations: {
    cfr: function(cite) {
      var gpo_url = "http://api.fdsys.gov/link?collection=cfr&year=mostrecent"
          + "&titlenum=" + cite.title + "&partnum=" + cite.part;
      if (cite.section) // section, if present, is of the form PART.SECTION, and for the GPO url only include the (inner) section
        gpo_url += "&sectionnum=" + cite.section.substring(cite.part.length+1) + "";

      return {
        pdf: gpo_url
      };
    },

    fedreg: function(cite) {
      return {
        pdf: "http://api.fdsys.gov/link?collection=fr&volume=" + cite.volume + "&page=" + cite.page
      };
    },

    law: function(cite) {
      if (cite.congress < 104) return null;
      return {
        pdf: "http://api.fdsys.gov/link?collection=plaw&congress=" + cite.congress + "&lawtype=" + cite.type + "&lawnum=" + cite.number,
        mods: "http://api.fdsys.gov/link?collection=plaw&congress=" + cite.congress + "&lawtype=" + cite.type + "&lawnum=" + cite.number + "&link-type=mods"
      };
    },

    stat: function(cite) {
      if (cite.volume < 65 || cite.volume > 125) return null;
      var usgpo_url = "http://api.fdsys.gov/link?collection=statute&volume=" + cite.volume + "&page=" + cite.page;
      return {
        pdf: usgpo_url,
        mods: usgpo_url + "&link-type=mods"
      };
    },

    usc: function(cite) {
      var title = cite.title.replace(/-app$/, '');
      var is_appendix = cite.title.indexOf("-app") != -1;

      var edition;
      for (var i = 0; i < us_code_editions.length; i++) {
          if (us_code_editions[i].titles == null || us_code_editions[i].titles.indexOf(title) >= 0) {
            // This edition contains the title.
            edition = us_code_editions[i]
            break;
          }
      }

      if (!edition) return null;

      var url = "http://api.fdsys.gov/link?collection=uscode&year="
        + edition.edition + "&title=" + title
        + "&section=" + cite.section
        + "&type=" + (!is_appendix ? "usc" : "uscappendix");
      
      return {
        pdf: url,
        html: url + "&link-type=html",
        landing: url + "&link-type=contentdetail",
        note: edition.edition + " edition." + ((cite.subsections && cite.subsections.length) ? " Sub-section citation is not reflected in the link." : "")
      };
    }
  }
}


// Map published editions of the US Code to the titles they contain. Not all
// published editions have the full US Code. Some are updates. This is per
// http://www.gpo.gov/fdsys/browse/collectionUScode.action?collectionCode=USCODE.
// Most recent first.
var us_code_editions = [
    { edition: '2014', titles: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15'] },
    { edition: '2013', titles: null }, // all titles available in this edition
];
