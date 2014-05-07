module.exports = {
  type: "regex",

  // normalize all cites to an ID
  standardize: function(match) {
    return {
      id: ["dc-register", match.volume, match.page].join("/")
    };
  },

  patterns: [
    // 54 DCR 8014
    {
      regex:
        "(\\d+)\\s+" +
        "DCR" +
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
