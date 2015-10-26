var DOMParser = require("xmldom").DOMParser;

function recurse(node, partialXpath, extract) {
  if (node.nodeType == node.TEXT_NODE || node.nodeType == node.CDATA_SECTION_NODE) {
    extract(node.nodeValue, {xpath: partialXpath});
  } else if (node.nodeType == node.ELEMENT_NODE || node.nodeType == node.DOCUMENT_NODE) {
    for (var i = 0; i < node.childNodes.length; i++) {
      var next = node.childNodes[i];
      var nextXpath, index, j;

      if (next.nodeType == next.TEXT_NODE ||
          next.nodeType == next.CDATA_SECTION_NODE) {
        index = 1;
        for (j = 0; j < i; j++) {
          if (node.childNodes[j].nodeType == node.TEXT_NODE ||
              node.childNodes[j].nodeType == node.CDATA_SECTION_NODE) {
            index++;
          }
        }
        nextXpath = partialXpath + "/text()[" + index + "]";
      } else if (next.nodeType == next.ELEMENT_NODE) {
        index = 1;
        for (j = 0; j < i; j++) {
          if (node.childNodes[j].nodeType == node.ELEMENT_NODE &&
              node.childNodes[j].nodeName == next.nodeName) {
            index++;
          }
        }
        nextXpath = partialXpath + "/" + next.nodeName + "[" + index + "]";
      }

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

  // An XML/XPath filter.
  //
  // Parses the text as an XML document, using the "xmldom" parser, and feeds
  // each text node into the extractor. Attaches an XPath expression that
  // locates the text node as metadata to each cite. Character offsets will
  // be relative to the beginning of the text node.

  from: function(text, options, extract) {
    // Parse the input text
    var parser, doc;
    parser = new DOMParser();
    doc = parser.parseFromString(text, "text/xml");

    // Hand off to recursive function, which will walk the DOM
    recurse(doc, '', extract);
  }

};
