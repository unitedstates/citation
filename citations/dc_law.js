(function(def) {
    if (typeof module !== 'undefined') module.exports = def;
    if (Citation && Citation.types) Citation.types.dc_law = def;
})({
  name: "DC Slip Law",
  type: "regex",

  standardize: function(cite) {
    return {
      id: ["dc-law", cite.period, cite.number].join("/")
    };
  },

  patterns: [
    // "D.C. Law 111-89"
    // "DC Law 111-89"
    {
      regex:
        "D\\.?\\s*C\\.?\\s+Law\\s+(?<period>\\d+)\\s?[-–]+\\s?(?<number>\\d+)",
      processor: function(captures) {
        return {
          period: captures.period,
          number: captures.number
        };
      }
    }
  ]
});
