/*
  Testing out the line-by-line filters.
*/

var Citation = require('../citation');
var util = require('util');



var lines = [{
  name: "Basic",
  text: "Line 1.\n\n" +
    "Line 2.\n" +
    "Line 3, 5 USC 552 citation.\n",
  outcome: {
    without: {
      line: undefined,
      index: 25,
      match: "5 USC 552"
    },
    with: {
      line: 3,
      index: 8,
      match: "5 USC 552"
    }
  }
}, {
  name: "Override delimiter regex",
  text: "Line 1.\t\t" +
    "Line 2.\t" +
    "Line 3, 5 USC 552 citation.\t",
  delimiter: /\t+/,
  outcome: {
    without: {
      line: undefined,
      index: 25,
      match: "5 USC 552"
    },
    with: {
      line: 3,
      index: 8,
      match: "5 USC 552"
    }
  }

}, {
  name: "Override delimiter string",
  text: "Line 1.\t\t" +
    "Line 2.\t" +
    "Line 3, 5 USC 552 citation.\t",
  delimiter: "\\t+",
  outcome: {
    without: {
      line: undefined,
      index: 25,
      match: "5 USC 552"
    },
    with: {
      line: 3,
      index: 8,
      match: "5 USC 552"
    }
  }

}];

lines.forEach(function(line) {
  exports["Lines: " + line.name] = function(test) {
    var results, cite;

    if (line.outcome.without) {
      results = Citation.find(line.text).citations;
      test.equal(results.length, 1);
      cite = results[0];
      test.equal(cite.line, line.outcome.without.line);
      test.equal(cite.index, line.outcome.without.index);
      test.equal(cite.match, line.outcome.without.match);
    }

    if (line.outcome.with) {
      var options = {filter: "lines"};
      if (line.delimiter) options.lines = {delimiter: line.delimiter};
      results = Citation.find(line.text, options).citations;
      test.equal(results.length, 1);
      cite = results[0];
      test.equal(cite.line, line.outcome.with.line);
      test.equal(cite.index, line.outcome.with.index);
      test.equal(cite.match, line.outcome.with.match);
    }

    test.done();
  };
});

var html = [{
  name: "Basic",
  text: "<html><head></head><body>" +
    "Body, 5 USC 552 citation." +
    "</body></html>",
  outcome: {
    without: {
      xpath: undefined,
      index: 31,
      match: "5 USC 552"
    },
    with: {
      xpath: "/html[1]/body[1]/text()[1]",
      index: 6,
      match: "5 USC 552"
    }
  }
}, {
  name: "Node type smoke test",
  text: "<!DOCTYPE html><!-- comment --><html><head></head><body>" +
    "<?xml-stylesheet ...xsl ?>" +
    "<![CDATA[ CDATA section ]]>" +
    "<!ENTITY xml entities >" +
    "<!NOTATION notation >" +
    "Text 5 USC 552 citation." +
    "</body></html>",
  outcome: {
    without: {
      xpath: undefined,
      index: 158,
      match: "5 USC 552"
    },
    with: {
      xpath: "/html[1]/body[1]/text()[1]",
      index: 5,
      match: "5 USC 552"
    }
  }
}, {
  name: "Deeply nested",
  text: "<html><head></head><body>" +
    "<div><div><div><div><table><tbody><tr><td>" +
    "Text<br>text<br>text<br>text<b>text 5 USC 552</b>" +
    "</td></tr></tbody></table></div></div></div></div>" +
    "</body></html>",
  outcome: {
    without: {
      xpath: undefined,
      index: 103,
      match: "5 USC 552"
    },
    with: {
      xpath: "/html[1]/body[1]/div[1]/div[1]/div[1]/div[1]/table[1]/tbody[1]/tr[1]/td[1]/b[1]/text()[1]",
      index: 5,
      match: "5 USC 552"
    }
  }
}, {
  name: "Multiple text nodes",
  text: "<html><head></head></body>" +
    "Text<br>Text <a href=\"#anchor\">link</a> text<br>Text<br>Text 5 USC 552" +
    "</body></html>",
  outcome: {
    without: {
      xpath: undefined,
      index: 87,
      match: "5 USC 552"
    },
    with: {
      xpath: "/html[1]/body[1]/text()[5]",
      index: 5,
      match: "5 USC 552"
    }
  }
}, {
  name: "Document fragment",
  text: "5 USC 552",
  outcome: {
    without: {
      xpath: undefined,
      index: 0,
      match: "5 USC 552"
    },
    with: {
      xpath: "/html[1]/body[1]/text()[1]",
      index: 0,
      match: "5 USC 552"
    }
  }
}];

html.forEach(function(xpathcase) {
  exports["HTML XPath: " + xpathcase.name] = function(test) {
    var results, cite;

    if (xpathcase.outcome.without) {
      results = Citation.find(xpathcase.text).citations;
      test.equal(results.length, 1);
      cite = results[0];
      test.equal(cite.xpath, xpathcase.outcome.without.xpath);
      test.equal(cite.index, xpathcase.outcome.without.index);
      test.equal(cite.match, xpathcase.outcome.without.match);
    }

    if (xpathcase.outcome.with) {
      var options = {filter: "xpath_html"};
      results = Citation.find(xpathcase.text, options).citations;
      test.equal(results.length, 1);
      cite = results[0];
      test.equal(cite.xpath, xpathcase.outcome.with.xpath);
      test.equal(cite.index, xpathcase.outcome.with.index);
      test.equal(cite.match, xpathcase.outcome.with.match);
    }

    test.done();
  };
});

var xml = [{
  name: "Basic",
  text: "<?xml version=\"1.0\" ?>\n" +
    "<document>\n" +
    "  <title>Best Bill of 2012</title>\n" +
    "  <bill>\n" +
    "    <introduction>Bill to enforce happiness amongst all the children</introduction>\n" +
    "    <closing>All information releasable through 5 U.S.C. 552 is now banned</closing>\n" +
    "    <footer>(c) Congress</footer>\n" +
    "  </bill>\n" +
    "</document>\n",
  outcome: {
    without: {
      xpath: undefined,
      index: 210,
      match: "5 U.S.C. 552"
    },
    with: {
      xpath: "/document[1]/bill[1]/closing[1]/text()[1]",
      index: 35,
      match: "5 U.S.C. 552"
    }
  }
}, {
  name: "Node type smoke test",
  text: "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" +
    "<!DOCTYPE test SYSTEM \"test.dtd\">\n" +
    "<element>\n" +
    "<?xml-stylesheet stylesheet.xsl ?>\n" +
    "<!-- comment -->\n" +
    "5 U.S.C. 552\n" +
    "</element>",
  outcome: {
    without: {
      xpath: undefined,
      index: 135,
      match: "5 U.S.C. 552"
    },
    with: {
      xpath: "/element[1]/text()[3]",
      index: 1,
      match: "5 U.S.C. 552"
    }
  }
}, {
  name: "CDATA test",
  text: "<?xml version=\"1.0\" ?><doc><![CDATA[ 5 U.S.C. 552 ]]></doc>",
  outcome: {
    without: {
      xpath: undefined,
      index: 37,
      match: "5 U.S.C. 552"
    },
    with: {
      xpath: "/doc[1]/text()[1]",
      index: 1,
      match: "5 U.S.C. 552"
    }
  }
}];

xml.forEach(function(xpathcase) {
  exports["XML XPath: " + xpathcase.name] = function(test) {
    var results, cite;

    if (xpathcase.outcome.without) {
      results = Citation.find(xpathcase.text).citations;
      test.equal(results.length, 1);
      cite = results[0];
      test.equal(cite.xpath, xpathcase.outcome.without.xpath);
      test.equal(cite.index, xpathcase.outcome.without.index);
      test.equal(cite.match, xpathcase.outcome.without.match);
    }

    if (xpathcase.outcome.with) {
      var options = {filter: "xpath_xml"};
      results = Citation.find(xpathcase.text, options).citations;
      test.equal(results.length, 1);
      cite = results[0];
      test.equal(cite.xpath, xpathcase.outcome.with.xpath);
      test.equal(cite.index, xpathcase.outcome.with.index);
      test.equal(cite.match, xpathcase.outcome.with.match);
    }

    test.done();
  };
});

/* The XPath expressions from the above test cases can be validated in a
 * browser by using the following snippet.
function verify(serialized, mime, xpath) {
  var parser = new DOMParser();
  var doc = parser.parseFromString(serialized, mime);
  return doc.evaluate(xpath, doc, null, XPathResult.STRING_TYPE, null).stringValue;
}

for (var i = 0; i < html.length; i++) {
  console.log(verify(html[i].text, "text/html", html[i].outcome.with.xpath));
}

for (var i = 0; i < xml.length; i++) {
  console.log(verify(xml[i].text, "text/xml", xml[i].outcome.with.xpath));
}
 */
