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
        "\\b(\\d{1,3})\\s" +
        "([AFSNU]\\.\\s?[\\w\\.]+)\\s" +
        "(\\d{1,4}|_{1,4})\\b",
      fields: ['volume',  'reporter', 'page'],
      processor: function(match) {
        return {
          volume: match.volume,
          reporter: match.reporter,
          page: match.page.indexOf('_') === -1 ? match.page : 'blank',
        };
      }
    }
  ]
};
