module.exports = {
  type: "regex",

  // normalize all cites to an ID
  id: function(cite) {
    return ["stat", cite.volume, cite.page].join("/")
  },

  canonical: function(cite) {
    return cite.volume + " Stat. " + cite.page;
  },

  patterns: [
    // "117 Stat. 1952"
    // "77 STAT. 77"
    {
      regex:
        "(\\d+[\\w]*)\\s+" +
        "Stat\\.?" +
        "\\s+(\\d+)",
      fields: ['volume', 'page'],
      processor: function(match) {
        return {
          volume: match.volume,
          page: match.page,
        };
      }
    }
  ],

  links: function(cite) {
    // GPO only has volumes starting with 65.
    if (cite.volume < 65) return { };

    var usgpo_url = "http://api.fdsys.gov/link?collection=statute&volume=" + cite.volume + "&page=" + cite.page;

    return {
      usgpo: {
        source: {
            name: "U.S. Government Publishing Office",
            abbreviation: "US GPO",
            link: "http://www.gpo.gov",
            authoritative: true
        },
        pdf: usgpo_url,
        mods: usgpo_url + "&link-type=mods"
      }
    };
  }
};
