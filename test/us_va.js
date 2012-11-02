/*
  Tests for extracting slip law citations from legislation.
  Each test should link to a real world circumstance where possible.
*/

var Citation = require('../citation');


exports.testPatterns = function(test) {
  var cases = [
    // variations on text of http://www.gpo.gov/fdsys/pkg/BILLS-112hr2367ih/xml/BILLS-112hr2367ih.xml
    ['Va. Code Ann. § 19.2-56.2 (2010)', '19.2', '56.2', '2010'],
    ['Va. Code Ann. § 19.2-56.2 (West 2010)', '19.2', '56.2', '2010']
  ];

  for (var i=0; i<cases.length; i++) {
    var details = cases[i];

    var text = details[0];
    var found = Citation.find(text);
    test.equal(found.length, 1, "No match found in: " + text);

    if (found.length == 1) {
      var citation = found[0];
      test.equal(citation.match, details[0]);
      test.equal(citation.title, details[1]);
      test.equal(citation.section, details[2]);
      test.equal(citation.year, details[3]);
    }
  }

  test.done();
};
