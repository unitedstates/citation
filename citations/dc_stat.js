module.exports = {
  type: "regex",

  // normalize all cites to an ID
  id: function(cite) {
    return ["dcstat", cite.volume, cite.page].join("/")
  },

  patterns: [
    // "20 DCSTAT 1952"
    {
      regex:
        "(\\d+)\\s+" +
        "DCSTAT" +
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
