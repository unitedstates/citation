(function(def) {
    if (typeof module !== 'undefined') module.exports = def;
    if (typeof Citation !== 'undefined' && Citation.types) Citation.types.dc_register = def;
})({
  type: "regex",

  // normalize all cites to an ID
  standardize: function(match) {
    return {
      id: underscore.flatten(["dc-register", match.volume, match.page]).join("/")
    };
  },

  patterns: [
    // 54 DCR 8014
    {
      regex:
        "(?<volume>\\d+)\\s+" +
        "DCR" +
        "\\s+(?<page>\\d+)",
      processor: function(match) {
        return {
          volume: match.volume,
          page: match.page,
        };
      }
    }
  ]
});
