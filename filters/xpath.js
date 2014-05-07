module.exports = {

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
  //
  // The XPath should look like:
  //   /root[0]/child[2]/grandchild[3]/leaf[2]
  //
  // So that it specifies the exact text node.
  //
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

};
