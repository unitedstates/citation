module.exports = {
  type: "regex",

  name: "U.S. Statutes at Large",

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
  ]
};
