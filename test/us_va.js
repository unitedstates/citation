/*
  Tests for extracting Virginia Code citations.
*/

var Citation = require('../citation');


exports.testPatterns = function(test) {
  test.expect();

  var cases = [
    ['Va. Code Ann. § 19.2-56.2 (2010)', '19.2', '56.2', '2010'],
    ['Va. Code Ann. § 19.2-56.2 (West 2010)', '19.2', '56.2', '2010']
  ];

  for (var i=0; i<cases.length; i++) {
    var details = cases[i];

    var text = details[0];
    var found = Citation.find(text);
    test.equal(found.length, 1);

    if (found.length == 1) {
      var citation = found[0];
      test.equal(citation.match, details[0]);
      test.equal(citation.va_code_ann.title, details[1]);
      test.equal(citation.va_code_ann.section, details[2]);
      test.equal(citation.va_code_ann.year, details[3]);
    } else
      console.log("No match found in: " + text);
  }

  test.done();
};
