module.exports = {
  type: "regex",

  id: function(cite) {
    return ["dc-law", cite.period, cite.number].join("/");
  },

  patterns: function(context) {
    // If the context for this citation is the DC Code, then Law XX-YYY can be assumed
    // to be a DC law. In other context, require the "DC Law" prefix. In the DC Code
    // context also slurp in the "DC" prefix.
    var context_regex = "D\\.?\\s*C\\.?\\s+";
    if (context.source == "dc_code")
      context_regex = "(?:" + context_regex + ")?"

    return [
      // "D.C. Law 20-17"
      // "DC Law 20-17"
      // "DC Law 18-135A"
      {
        regex:
          context_regex + "Law\\s+(\\d+)\\s?[-–]+\\s?(\\d+\\w?)",
        fields: ["period", "number"],
        processor: function(captures) {
          return {
            period: captures.period,
            number: captures.number
          };
        }
      }
    ];
  },

  links: function(cite) {
    // Only available for CP's 19 and 20.
    if (cite.period < 19 || cite.period > 20) return { };
    return {
      dccodeorg: {
        source: {
            name: "Council of the District of Columbia",
            abbreviation: "DC Council",
            link: "https://dccode.gov",
            authoritative: true
        },

        pdf: "https://dcstat.dccode.gov/public/Law_" + cite.period + "-" + cite.number + ".pdf"
      }
    };
  }
};
