Citation.types.stat = {
  name: "US Statutes At Large",
  type: "regex",

  // normalize all cites to an ID
  standardize: function(cite) {
    return {
      id: _.flatten(["stat", cite.volume, cite.page]).join("/")
    }
  },

  patterns: [
    // "117 Stat. 1952"
    // "77 STAT. 77"
    {
      regex: 
        "(?<volume>\\d+[\\w]*)\\s+" +
        "Stat\\.?" +
        "\\s+(?<page>\\d+)", 
      processor: function(match) {

        return {
          volume: match.volume,
          page: match.page,
        }
      }
    }
  ]
};
