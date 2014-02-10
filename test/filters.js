/*
  Testing out the line-by-line filters.
*/

var Citation = require('../citation');
var util = require('util');



var lines = [{
  name: "Basic",
  text: "Line 1.\n" +
    "Line 2, 5 USC 552 citation.\n" +
    "Line 3.",
  outcome: {
    without: {
      line: undefined,
      index: 16,
      match: "5 USC 552"
    },
    with: {
      line: 2,
      index: 8,
      match: "5 USC 552"
    }
  }
}];

lines.forEach(function(line) {
  exports[line.name] = function(test) {
    test.expect();

    var results, cite;

    // first, without lines
    results = Citation.find(line.text).citations;
    test.equal(results.length, 1);
    cite = results[0];
    test.equal(cite.line, line.outcome.without.line);
    test.equal(cite.index, line.outcome.without.index);
    test.equal(cite.match, line.outcome.without.match);

    // now, with lines
    results = Citation.find(line.text, {filters: "lines"}).citations;
    test.equal(results.length, 1);
    cite = results[0];
    test.equal(cite.line, line.outcome.with.line);
    test.equal(cite.index, line.outcome.with.index);
    test.equal(cite.match, line.outcome.with.match);

    test.done();
  };
});