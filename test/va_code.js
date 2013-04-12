/*
  Tests for extracting Virginia Code citations.
*/

var Citation = require('../citation');


exports.testPatterns = function(test) {
  test.expect();

  var cases = [
    [ 'standard',
      'Va. Code Ann. § 19.2-56.2 (2010)', 
      '19.2', '56.2', '2010'],
    [ 'standard-west',
      'Va. Code Ann. § 19.2-56.2 (West 2010)', 
      '19.2', '56.2', '2010'],
    [ 'no-year-1',
      'Va. Code Ann. § 57-1', 
      '57', '1', null],
    [ 'no-year-2',
      'Va. Code Ann. § 57-2.02', 
      '57', '2.02', null],
    [ 'no-year-3',
      'Va. Code Ann. § 63.2-300', 
      '63.2', '300', null],
    [ 'section-with-colon',
      'Va. Code Ann. § 66-25.1:1',
      '66', '25.1:1', null],
    [ 'No Annotation',
      "Va. Code § 66-25.1:1",
      "66", "25.1:1", null],
    [ 'No Annotation or Period',
      "VA Code § 66-25.1:1",
      "66", "25.1:1", null]
  ];

  for (var i=0; i<cases.length; i++) {
    var details = cases[i];

    var text = details[1];
    var found = Citation.find(text, {types: ["va_code"]}).citations;
    test.equal(found.length, 1);

    if (found.length == 1) {
      var citation = found[0];
      test.equal(citation.match, details[1], details[0]);
      test.equal(citation.va_code.title, details[2]);
      test.equal(citation.va_code.section, details[3]);
      test.equal(citation.va_code.year, details[4]);
    } else
      console.log("No match found in: " + text);
  }

  test.done();
};