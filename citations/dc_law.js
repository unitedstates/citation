Citation.types.dc_law = {
  name: "DC Slip Law",
  type: "regex",

  standardize: function(cite) {
    return {
      id: _.flatten(["dc-law", cite.period, cite.number]).join("/"),
      law_id: ["dc-law", cite.period, cite.number].join("/")
    }
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
        }
      }
    }
  ]
};