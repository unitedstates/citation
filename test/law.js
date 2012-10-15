/*
  Tests for extracting slip law citations from legislation. 
  Each test should link to a real world circumstance where possible.
*/

var Citation = require('../citation');


exports.testPatterns = function(test) {
  var cases = [
    // variations on text of http://www.gpo.gov/fdsys/pkg/BILLS-112hr2367ih/xml/BILLS-112hr2367ih.xml
    ["Pub. L. 96–164", "public_law_96_164", "public", "96", "164", 
      "Nuclear Energy Authorization Act of 1980 (Pub. L. 96–164; "],
    ["Pub. L. 96-164", "public_law_96_164", "public", "96", "164", 
      "Nuclear Energy Authorization Act of 1980 (Pub. L. 96-164; "],
    ["Pub. L. No. 96-164", "public_law_96_164", "public", "96", "164", 
      "Nuclear Energy Authorization Act of 1980 (Pub. L. No. 96-164; "],
    ["Pub L 96–164", "public_law_96_164", "public", "96", "164", 
      "Nuclear Energy Authorization Act of 1980 (Pub L 96–164; "],
    ["Pub L No 96-164", "public_law_96_164", "public", "96", "164", 
      "Nuclear Energy Authorization Act of 1980 (Pub L No 96-164; "],
    ["Public Law 96–164", "public_law_96_164", "public", "96", "164", 
      "Nuclear Energy Authorization Act of 1980 (Public Law 96–164; "],
    ["Public   Law  96–164", "public_law_96_164", "public", "96", "164", 
      "Nuclear Energy Authorization Act of 1980 (Public   Law  96–164; "],

    // summary for http://beta.congress.gov/bill/112th/house-bill/1
    ["P.L. 111-80", "public_law_111_80", "public", "111", "80", 
      "Related Agencies Appropriations Act, 2010 (P.L. 111-80);"], 
    ["PL 111-83", "public_law_111_83", "public", "111", "83", 
      "Homeland Security Appropriations Act, 2010 (PL 111-83);"],
    ["PL   111-83", "public_law_111_83", "public", "111", "83", 
      "Homeland Security Appropriations Act, 2010 (PL   111-83);"],

    // don't have a source for these yet, just theoretical
    ["Priv. L. 96–164", "private_law_96_164", "private", "96", "164", 
      "Nuclear Energy Authorization Act of 1980 (Priv. L. 96–164; "],
    ["Priv. L. 96-164", "private_law_96_164", "private", "96", "164", 
      "Nuclear Energy Authorization Act of 1980 (Priv. L. 96-164; "],
    ["Priv. L. No. 96-164", "private_law_96_164", "private", "96", "164", 
      "Nuclear Energy Authorization Act of 1980 (Priv. L. No. 96-164; "],
    ["Priv L 96–164", "private_law_96_164", "private", "96", "164", 
      "Nuclear Energy Authorization Act of 1980 (Priv L 96–164; "],
    ["Priv L No 96-164", "private_law_96_164", "private", "96", "164", 
      "Nuclear Energy Authorization Act of 1980 (Priv L No 96-164; "],
    ["Private Law 96–164", "private_law_96_164", "private", "96", "164", 
      "Nuclear Energy Authorization Act of 1980 (Private Law 96–164; "],
  ];

  test.expect(cases.length * 7);

  for (var i=0; i<cases.length; i++) {
    var details = cases[i];

    var text = details[5];
    var found = Citation.find(text);
    test.equal(found.length, 1, "No match found in: " + text);

    if (found.length == 1) {
      var citation = found[0];
      test.equal(citation.match, details[0]);
      test.equal(citation.law.id, details[1]);
      test.equal(citation.law.law_id, details[1]);
      test.equal(citation.law.type, details[2]);
      test.equal(citation.law.congress, details[3]);
      test.equal(citation.law.number, details[4]);
    }
  }

  test.done();
};

exports.testSubsections = function(test) {
  var cases = [
    // variations on text of http://www.gpo.gov/fdsys/pkg/BILLS-112hr6567ih/xml/BILLS-112hr6567ih.xml
    ["Section 4402 of Public Law 107–171", "public_law_107_171_4402", "public_law_107_171",
      "public", "107", "171", ["4402"],
      "(3) Section 4402 of Public Law 107–171 (relating"],
    ["Section 4402(e) of PL 107–171", "public_law_107_171_4402_e", "public_law_107_171",
      "public", "107", "171", ["4402", "e"],
      "(3) Section 4402(e) of PL 107–171 (relating"],
    ["Section 4402(e)(1) of Public Law 107–171", "public_law_107_171_4402_e_1", "public_law_107_171",
      "public", "107", "171", ["4402", "e", "1"],
      "(3) Section 4402(e)(1) of Public Law 107–171 (relating"]
  ];

  test.expect(cases.length * 8);

  for (var i=0; i<cases.length; i++) {
    var details = cases[i];

    var text = details[7];
    var found = Citation.find(text);
    test.equal(found.length, 1, "No match found in: " + text);

    if (found.length == 1) {
      var citation = found[0];
      test.equal(citation.match, details[0]);
      test.equal(citation.law.id, details[1]);
      test.equal(citation.law.law_id, details[2]);
      test.equal(citation.law.type, details[3]);
      test.equal(citation.law.congress, details[4]);
      test.equal(citation.law.number, details[5]);
      test.deepEqual(citation.law.sections, details[6]);
    }
  }

  test.done();
};

// can opt-in to asking for all parents of a subsection to be returned too
exports.testParents = function(test) {
  test.expect();
  var text, found, citation;

  text = "section 4402(e)(1) of Public Law 110-2";
  
  found = Citation.find(text, {parents: false});
  test.equal(found.length, 1);
  test.equal(found[0].law.id, "public_law_110_2_4402_e_1");

  found = Citation.find(text, {parents: true});
  test.equal(found.length, 4);

  if (found.length == 4) {
    test.equal(found[0].law.id, "public_law_110_2_4402_e_1");
    test.equal(found[1].law.id, "public_law_110_2_4402_e");
    test.equal(found[2].law.id, "public_law_110_2_4402");
    test.equal(found[3].law.id, "public_law_110_2");
  } else
    console.log(found);

  test.done();
}