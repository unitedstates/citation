/*
  Tests for extracting DC Code citations.
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
    
    // in 3-101 of the DC Code
    [ 'section-with-dot',
      'required under § 3-101.01, the Commission',
      '§ 3-101.01',
      '3', '101.01', []],

    // in 1-611.1 of the DC Code
    [ 'section-ending-with-dot',
      'accordance with the policies of § 1-611.01.',
      '§ 1-611.01',
      '1', '611.01', []],

    // in 1-1163.20 of the DC Code
    [ 'section-forgiving-with-space',
      'contribution limits for the candidate as provided under § 1- 1163.33.',
      '§ 1- 1163.33',
      '1', '1163.33', []],

    // hypothetical (modified from 1-1163.20 of the DC Code)
    [ 'section-forgiving-with-space',
      'contribution limits for the candidate as provided under § 1 -1163.33.',
      '§ 1 -1163.33',
      '1', '1163.33', []],

    // in 16-316 of the DC Code
    [ 'section-with-word-section',
      'case shall be subject to the limitation set forth in [section 16-2326.01(b)(2)].',
      'section 16-2326.01(b)(2)',
      '16', '2326.01', ['b', '2']]
  ];

  for (var i=0; i<cases.length; i++) {
    var details = cases[i];
    var text = details[1];

    var found = Citation.find(text, {
      types: ["dc_code"], 
      context: {dc_code: {source: "dc_code"}} // ensures we'll detect relative cites
    }).citations;

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
    }).citations;

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

    // DC register notice of proposed rule, download full text DOC at http://www.dcregs.dc.gov/Gateway/NoticeHome.aspx?noticeid=4264525
    [ 'standard-with-double-symbol-and-subsections',
      'October 21, 2000 (D.C. Law 13-176; D.C. Official Code §§ 38-2602(b)(11) (2012 Supp.)) and',
      'D.C. Official Code §§ 38-2602(b)(11)',
      '38', '2602', ['b', '11']],

    // hypothetical
    [ 'standard-ending-with-dot',
      'March 25, 1986 (D.C. Law 6-99; D.C. Official Code 3-1202.04. And, in accordance', 
      'D.C. Official Code 3-1202.04',
      '3', '1202.04', []],

    // hypothetical
    [ 'standard-with-space',
      'March 25, 1986 (D.C. Law 6-99; D.C. Official Code 3 -1202.04. And, in accordance', 
      'D.C. Official Code 3 -1202.04',
      '3', '1202.04', []],

    // hypothetical
    [ 'standard-with-space-2',
      'March 25, 1986 (D.C. Law 6-99; D.C. Official Code 3- 1202.04. And, in accordance', 
      'D.C. Official Code 3- 1202.04',
      '3', '1202.04', []]
  ];

  for (var i=0; i<cases.length; i++) {
    var details = cases[i];
    var text = details[1];

    var found = Citation.find(text, {
      types: ["dc_code"], 
      context: {} // leaving out a context means the parser will require an absolute cite
    }).citations;

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

// todo, should return *two* sections:
// DC mayoral order 2013-060, download PDF at 
// [ 'two-sections-with-and'
//   'December 24, 1973, 87 Stat. 790, Pub. L. 93-198, D.C. Official Code § 1-204.22(2) and (11) (2012 Supp.), and',
//   'D.C. Official Code § 1-204.22(2) and (11)',