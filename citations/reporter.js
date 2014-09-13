module.exports = {
  type: "regex",

  // normalize all cites to an ID
  id: function(cite) {
    return ["reporter", cite.volume, cite.reporter, cite.page].join("/")
  },

  patterns: [
    {
      regex:
        "(\\d{1,3})\\s" +
        "(\\w+(?:\\.\\dd)?|U\\.?S\\.?|F\\. Supp\\.(?:\\s\\dd)?)\\s" +
        "(\\d{1,4})",
      fields: ['volume',  'reporter', 'page'],
      processor: function(match) {
        return {
          volume: match.volume,
          reporter: match.reporter,
          page: match.page,
        };
      }
    }
  ]
};
