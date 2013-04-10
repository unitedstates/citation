/*
  Tests for extracting Virginia Code citations.
*/

var Citation = require('../citation');


exports.testRelativePatterns = function(test) {
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

    // now ensure that these relative patterns are *not* picked up if the context is not provided
    var found = Citation.find(text, {
      types: ["dc_code"], 
      context: {} // leaving out a context means the parser will require an absolute cite
    });

    test.equal(found.length, 0);
  }

  test.done();
};



exports.testAbsolutePatterns = function(test) {
  test.expect();

  var cases = [
    // DC bill PR 20-0035 - http://openstates.org/dc/bills/20/PR20-0035/documents/DCD00005209/
    [ 'standard',
      'March 25, 1986 (D.C. Law 6-99; D.C. Official Code 3-1202.04 (2012 Supp.)), and in accordance', 
      'D.C. Official Code 3-1202.04',
      '3', '1202.04', []],

    // DC register notice of final rule, download full text DOC at http://www.dcregs.dc.gov/Gateway/NoticeHome.aspx?noticeid=4266174
    [ 'standard-with-symbol',
      'March 25, 1986 (D.C. Law 6-99; D.C. Official Code § 3-1201.01 et seq. (2007 Repl. & 2012 Supp.)), as amended',
      'D.C. Official Code § 3-1201.01', // we're not caring about 'et seq' for right now
      '3', '1201.01', []],

    
  ];

  // for (var i=0; i<cases.length; i++) {
  //   var details = cases[i];
  //   var text = details[1];

  //   var found = Citation.find(text, {
  //     types: ["dc_code"], 
  //     context: {} // leaving out a context means the parser will require an absolute cite
  //   });

  //   test.equal(found.length, 1);

  //   if (found.length == 1) {
  //     var citation = found[0];
  //     test.equal(citation.match, details[2], details[0]);
  //     test.equal(citation.dc_code.title, details[3]);
  //     test.equal(citation.dc_code.section, details[4]);
  //     test.deepEqual(citation.dc_code.subsections, details[5]);
  //   } else
  //     console.log("No match found in: " + text);
  // }

  test.done();
};