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