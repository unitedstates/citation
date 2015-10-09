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

var xpath = [{
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

xpath.forEach(function(xpathcase) {
  exports["XPath: " + xpathcase.name] = function(test) {
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
      var options = {filter: "xpath"};
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
