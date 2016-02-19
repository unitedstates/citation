var parse5 = require("parse5");

function recurse(node, partialXpath, extract) {
  if (node.nodeName == "#text") {
    // Pass contents of text nodes to the extractor
    extract(node.value, {xpath: partialXpath});
  } else if (node.nodeName == "#comment" || node.nodeName == "#documentType") {
    // Skip doctypes and comments
    // (parse5 treats processing instructions, entities, and notations as
    // comments)
    return;
  } else {
    for (var i = 0; i < node.childNodes.length; i++) {
      var next = node.childNodes[i];

      // Incrementally build XPath expressions for each node
      var nextName = next.nodeName;
      var index = 1; // XPath indices are 1-based because reasons
      for (var j = 0; j < i; j++) {
        if (node.childNodes[j].nodeName == nextName) {
          index++;
        }
      }
      var nextXpath;
      if (nextName == "#text") {
        nextXpath = partialXpath + "/text()[" + index + "]";
      } else {
        nextXpath = partialXpath + "/" + nextName + "[" + index + "]";
      }

      // Recurse through each child element node
      recurse(next, nextXpath, extract);
    }
  }
}

module.exports = {

  /*
    Filters receive:
      * text: the entire input text
      * options: any filter-specific options
      * extract: execute this function once with every substring the filter
          breaks the input tet into, along with any associated metadata, e.g.
          the XPath expression associated with each text fragment.
   */

  // An HTML/XPath filter.
  //
  // Parses the text as an HTML document, using an HTML5 parser, and feeds
  // each text node into the extractor. Attaches an XPath expression that
  // locates the text node as metadata to each cite. Character offsets will
  // be relative to the beginning of the text node.

  from: function(text, options, extract) {
    // Parse the input text
    var doc = parse5.parse(text);

    // Hand off to recursive function, which will walk the DOM
    recurse(doc, '', extract);
  }

};
