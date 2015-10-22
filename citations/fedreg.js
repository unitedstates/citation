module.exports = {
  type: "regex",

  // normalize all cites to an ID
  id: function(cite) {
    return ["fedreg", cite.volume, cite.page].join("/")
  },


  patterns: [
    // "75 Fed. Reg. 28404"
    // "69 FR 22135"
    {
      regex:
        "(\\d+)\\s+" +
        "(?:Fed\\.?\\sReg?\\.?|F\\.?R\\.?)" +
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
    var gpo_url = "http://api.fdsys.gov/link?collection=fr&volume=" + cite.volume + "&page=" + cite.page;
    
    return {
      usgpo: {
        source: {
          name: "U.S. Government Publishing Office",
          abbreviation: "US GPO",
          link: "http://www.gpo.gov",
          authoritative: true
        },
        pdf: gpo_url
      }
    };
  }
};
