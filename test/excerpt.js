/*
Testing the ability to return a surrounding excerpt of context
around any detected cites.
*/

var Citation = require('../citation');

exports["Basic excerpting"] = function(test) {
  // http://www.gpo.gov/fdsys/pkg/BILLS-112hr2045ih/html/BILLS-112hr2045ih.htm
  var tests = [
    ["21 U.S.C. 321(ff)(1)",
      "(B) the term `dietary ingredient' means an " +
      "ingredient listed in subparagraphs (A) through (F) of " +
      "section 201(ff)(1) (21 U.S.C. 321(ff)(1)) of the " +
      "Federal Food, Drug, and Cosmetic Act that is included " +
      "in, or that is intended to be included in, a dietary " +
      "supplement."],
    ["21 U.S.C. 321(ff)(1)",
      "dient listed in subparagraphs (A) through (F) of " +
      "section 201(ff)(1) (21 U.S.C. 321(ff)(1)) of the " +
      "Federal Food, Drug, and Cosmetic Act that is included " +
      "in, or that is intended to be include"],
    ["21 U.S.C. 321",
      "(B) the term `dietary ingredient' means an " +
      "ingredient listed in subparagraphs (A) through (F) of " +
      "section 201(ff)(1) (21 U.S.C. 321) of the " +
      "Federal Food, Drug, and Cosmetic Act that is included " +
      "in, or that is intended to be included in, a dietary " +
      "supplement."]
  ];

  var excerpts = [0, 1, 5, 10, 15, 20, 25, '25', 30, 35, 50, 75, 90, 100, 125, 150];

  test.expect(2 * tests.length * excerpts.length);

  // try out a ton of different excerpt sizes, on both strings
  excerpts.forEach(function(excerpt) {
    tests.forEach(function(items) {
      var match = items[0];
      var text = items[1];

      var found = Citation.find(text, {types: "usc", excerpt: excerpt}).citations;
      test.equal(found.length, 1);
      var citation = found[0];
      test.equal(citation.match, match);
    });
  });

  test.done();
};
