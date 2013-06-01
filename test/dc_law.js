/*
  Tests for extracting DC slip law citations.
  Each test should link to a real world circumstance where possible.
*/

var Citation = require('../citation');


exports.testPatterns = function(test) {

  var cases = [
    // http://dccode.org/browser/#/3/3-101.01
    ["D.C. Law 19-168", "dc-law/19/168", "19", "168",
      "D.C. Law 19-168"]
  ];

  test.expect();

  for (var i=0; i<cases.length; i++) {
    var details = cases[i];

    var text = details[4];
    var found = Citation.find(text, {types: "dc_law"}).citations;
    test.equal(found.length, 1, "No match found in: " + text);

    if (found.length == 1) {
      var citation = found[0];
      test.equal(citation.match, details[0]);
      test.equal(citation.dc_law.id, details[1]);
      test.equal(citation.dc_law.period, details[2]);
      test.equal(citation.dc_law.number, details[3]);
    }
  }

  test.done();
};