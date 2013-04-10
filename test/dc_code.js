/*
  Tests for extracting Virginia Code citations.
*/

var Citation = require('../citation');


exports.testPatterns = function(test) {
  test.expect();

  var cases = [
    // in 3-202 of the DC Code:
    [ 'standard',
      'as that term is defined in § 32-701(4), to the deceased', 
      '§ 32-701(4)',
      '32', '701', ['4']],

    // in 3-101 of the DC Code:
    [ 'into-newline',
      'as provided in § 1-603.01(13).\n\n(b) In addition to the',
      '§ 1-603.01(13)',
      '1', '603.01', ['13']],
    
    // in 3-101 of the DC Code:
    [ 'section-with-dot',
      'required under § 3-101.01, the Commission',
      '§ 3-101.01',
      '3', '101.01', []]
  ];

  for (var i=0; i<cases.length; i++) {
    var details = cases[i];
    var text = details[1];

    var found = Citation.find(text, {
      types: ["dc_code"], 
      context: {source: "dc_code"} // ensures we'll detect relative cites
    });

    test.equal(found.length, 1);

    if (found.length == 1) {
      var citation = found[0];
      test.equal(citation.match, details[2], details[0]);
      test.equal(citation.dc_code.title, details[3]);
      test.equal(citation.dc_code.section, details[4]);
      test.deepEqual(citation.dc_code.subsections, details[5]);
    } else
      console.log("No match found in: " + text);
  }

  test.done();
};