module.exports = {
  type: "regex",

  name: "Federal Register",

  // normalize all cites to an ID
  id: function(cite) {
    return ["fedreg", cite.volume, cite.page].join("/")
  },


  patterns: [
    // "75 Fed. Reg. 28404"
    // "69 FR 22135"
    {
      regex:
        "(\\d+)\\s+" +
        "(?:Fed\\.?\\sReg?\\.?|F\\.?R\\.?)" +
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
