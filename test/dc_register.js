/*
  Tests for extracting DC Register citations.
*/

var Citation = require('../citation');

exports.testPattern = function(test) {
  test.expect();

  var cases = [
    [ 'standard',
      'D.C. Law 17-25, § 2(c), 54 DCR 8014', 
      '54 DCR 8014',
      '54', '8014']
  ];

  for (var i=0; i<cases.length; i++) {
    var details = cases[i];
    var text = details[1];

    var found = Citation.find(text, {
      types: ["dc_register"]
    }).citations;

    test.equal(found.length, 1);

    if (found.length == 1) {
      var citation = found[0];
      test.equal(citation.match, details[2], details[0]);
      test.equal(citation.dc_register.volume, details[3]);
      test.equal(citation.dc_register.page, details[4]);
    } else
      console.log("No match found in: " + text);
  }

  test.done();
};