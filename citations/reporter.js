module.exports = {
  type: "regex",

  // normalize all cites to an ID
  id: function(cite) {
    return ["reporter", cite.volume, cite.reporter, cite.page].join("/")
  },

  canonical: function(cite) {
    return cite.volume + " " + cite.reporter + " " + cite.page;
  },

  patterns: [
    {
      regex:
        "(\\d{1,3})\\s" +
        "(\\w+(?:\\.\\w+(?:\\.)?)?(?:\\.\\dd)?|U\\.?\\s?S\\.?|F\\. Supp\\.(?:\\s\\dd)?)\\s" +
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
