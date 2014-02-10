(function(def) {
  if (typeof module !== 'undefined') module.exports = def;
  if (typeof Citation !== 'undefined' && Citation.filters) Citation.filters.xpath = def;
})({

  // INCOMPLETE: An XPath filter.
  //
  // Should parse the given text as XML, walk through the DOM,
  // and feed every text node to the `extract` callback,
  // with an attached unique XPath as metadata. The char offset
  // should end up being relative to that unique XPath.
  //
  ///////// Parsing the DOM ///////////////////
  //
  // Probably jsdom:
  //   https://github.com/tmpvar/jsdom
  //
  ///////// Calculating XPath per-node ////////
  // Some relevant resources:
  // http://stackoverflow.com/a/3454579/16075
  // http://stackoverflow.com/a/8942908/16075
  //
  // this firebug code may be the best option:
  // https://code.google.com/p/fbug/source/browse/branches/firebug1.6/content/firebug/lib.js?spec=svn12950&r=8828#1332
  //
  // Accepts options:
  //   [none]

  from: function(text, options, extract) {}

});