var form_canonical_cite = require("../citations/reporter").canonical;

module.exports = {
  id: "courtlistener",

  name: "Court Listener",
  abbreviation: "CL",
  link: "https://www.courtlistener.com",

  authoritative: false,

  citations: {
    reporter: function(cite) {
      // Create a link to the Court Listener search page for the citation. Citations
      // can be ambiguous, and so there is no permalink to a case available without
      // querying an API.
      //
      // The citation is wrapped in quotes in the query to force the CL API to do
      // a phrase search (per Solr). Without quotes, a citation search on "410 U.S. 113"
      // brings back `410 U.S. 257, 93 S. Ct. 880, 35 L. Ed. 2d 247, 1973 U.S. LEXIS 113`
      // and `507 U.S. 410, 113 S. Ct. 1505, 123 L. Ed. 2d 99, 1993 U.S. LEXIS 2401`.
      // (They match because "410" "US" and "113" appear somewhere in the whole string.)
      // See https://github.com/freelawproject/courtlistener/issues/381, but that's only
      // a partial fix because quotes are still needed to ensure the terms appear in
      // the right order.
      return {
        landing: "https://www.courtlistener.com/?citation=" + encodeURIComponent("\"" + form_canonical_cite(cite) + "\"")
      };
    }
  }
}
