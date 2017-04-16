module.exports = {
  type: "regex",

  id: function(cite) {
    return ["supreme_court", cite.volume, cite.page, cite.year].join("/");
  },

  patterns: [
    // 533 U.S. 218 (2001)
    {
      regex: 
        '(\\d+)' +         // volume
        ' U\\.S\\. ' +     // U.S.
        '(\\d+)' +         // page
        ' \\((\\d+)\\)',   // year
      fields: [
        'volume',
        'page',
        'year'
      ],
      processor: function(match) {
        return {
          volume: match.volume,
          page: match.page,
          year: match.year
        };
      }
    }
    // TODO: United States v. Mead Corp., 533 U.S. 218 (2001)
  ]
};


/*
Goal:

parties
volume
reporter (U.S. or U. S.)
begin page
cite page (optional)
year
*/