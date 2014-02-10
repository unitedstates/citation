/*
  Tests this library's integration with Walverine, which parses case law citations

  To do a simple test in the REPL, run:

    require("./citation");
    text = "he dissent is correct that United States v. Mead Corp., 533 U. S. 218 (2001), requires that"
    Citation.find(text, {types: "judicial"});

  To re-require Citation without restarting the REPL, run:

    Object.keys(require.cache).forEach(function(k) {delete require.cache[k]})
*/

var Citation = require('../citation');
var underscore = require('underscore');
var deepEqual = require('deep-equal');

var singles = [
  // https://www.courtlistener.com/scotus/5s99/arlington-v-fcc/
  ["he dissent is correct that United States v. Mead Corp., 533 U. S. 218 (2001), requires that",
   "Simple case name",
    [{
      match: "United States v. Mead Corp., 533 U. S. 218 (2001), requires that",
      judicial: {
        volume: 533,
        reporter: 'U.S.',
        page: 218,
        lookup_index: 0,
        canonical_reporter: 'U.S.',
        extra: null,
        defendant: 'Mead Corp.',
        plaintiff: 'United States',
        court: null,
        year: 2001,
        mlz_jurisdiction: 'us;federal;supreme.court',
        match_url: null,
        end_idx: 12,
        cert_order: null,
        disposition: null,
        seqID: 0,
        relations: [ 0 ]
      }
    }]
  ]
];

// runs tests with "judicial" type explicit
singles.forEach(function(single) {
  exports[single[1] + " (explicit-type)"] = function(test) {
    test.expect();

    var text = single[0];
    var actual = Citation.find(text, {types: "judicial"}).citations;
    var actual = actual.map(function(result) {
      // Not worried about testing these at the moment.
      result.judicial = underscore.omit(result.judicial, ["base_citation", "as_regex", "as_html"]);
      return result;
    });
    var expected = single[2];

    test.ok(deepEqual(actual, expected), "derp");
    test.done();
  };

});

// runs tests without "judicial" explicit
singles.forEach(function(single) {
  exports[single[1] + " (no-judicial-type)"] = function(test) {
    test.expect();

    var text = single[0];
    var actual = Citation.find(text).citations;
    var actual = actual.map(function(result) {
      // Not worried about testing these at the moment.
      result.judicial = underscore.omit(result.judicial, ["base_citation", "as_regex", "as_html"]);
      return result;
    });
    var expected = single[2];

    test.ok(deepEqual(actual, expected), "derp");
    test.done();
  };

});
