module.exports = {
  type: "regex",

  // normalize all cites to an ID
  standardize: function(cite) {
    return {
      id: ["stat", cite.volume, cite.page].join("/")
    };
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
