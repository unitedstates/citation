(function(def) {
    if (typeof module !== 'undefined') module.exports = def;
    if (typeof Citation !== 'undefined' && Citation.types) Citation.types.dc_law = def;
})({
  type: "regex",

  standardize: function(cite) {
    return {
      id: ["dc-law", cite.period, cite.number].join("/")
    };
  },

  patterns: function(context) {
    // If the context for this citation is the DC Code, then Law XX-YYY can be assumed
    // to be a DC law. In other context, require the "DC Law" prefix.
    var context_regex = "";
    if (context.source != "dc_code")
      context_regex = "D\\.?\\s*C\\.?\\s+";

    return [
      // "D.C. Law 111-89"
      // "DC Law 111-89"
      // "DC Law 18-135A"
      {
        regex:
          context_regex + "Law\\s+(?<period>\\d+)\\s?[-–]+\\s?(?<number>\\d+\\w?)",
        processor: function(captures) {
          return {
            period: captures.period,
            number: captures.number
          };
        }
      }
    ];
  }
});
