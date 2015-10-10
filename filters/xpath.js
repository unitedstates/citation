var HTMLParser = require("parse5").Parser;
var XMLParser = require("xmldom").DOMParser;

function html_recurse(node, partialXpath, extract) {
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
      html_recurse(next, nextXpath, extract);
    }
  }
}

function xml_recurse(node, partialXpath, extract) {
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

      xml_recurse(next, nextXpath, extract);
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
  //
  // Accepts options:
  //   input: xml or html, chooses parser to use (default to html)

  from: function(text, options, extract) {
    var input = (options && options.input) || "html";
    input = input.toLowerCase();

    // Parse the input text
    var parser, doc;
    if (input == "html") {
      parser = new HTMLParser();
      doc = parser.parse(text);

      // Hand off to recursive function, which will walk the DOM
      html_recurse(doc, '', extract);
    } else if (input == "xml") {
      parser = new XMLParser();
      doc = parser.parseFromString(text, "text/xml");

      // Hand off to recursive function, which will walk the DOM
      xml_recurse(doc, '', extract);
    } else {
      throw "The XPath filter requires 'input' to be specified as either 'html' or 'xml'";
    }
  }

};
