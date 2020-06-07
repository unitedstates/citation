/*
  Tests for extracting slip law citations.
  Each test should link to a real world circumstance where possible.
*/

var Citation = require('../citation');


exports["Basic patterns"] = function(test) {
  var cases = [
    // variations on text of http://www.gpo.gov/fdsys/pkg/BILLS-112hr2367ih/xml/BILLS-112hr2367ih.xml
    ["Pub. L. 96–164", "us-law/public/96/164", "public", "96", "164",
      "Nuclear Energy Authorization Act of 1980 (Pub. L. 96–164; ", "Pub. L. 96-164"],
    ["Pub. L. 96-164", "us-law/public/96/164", "public", "96", "164",
      "Nuclear Energy Authorization Act of 1980 (Pub. L. 96-164; ", "Pub. L. 96-164"],
    ["Pub. L. No. 96-164", "us-law/public/96/164", "public", "96", "164",
      "Nuclear Energy Authorization Act of 1980 (Pub. L. No. 96-164; ", "Pub. L. 96-164"],
    ["Pub L 96–164", "us-law/public/96/164", "public", "96", "164",
      "Nuclear Energy Authorization Act of 1980 (Pub L 96–164; ", "Pub. L. 96-164"],
    ["Pub L No 96-164", "us-law/public/96/164", "public", "96", "164",
      "Nuclear Energy Authorization Act of 1980 (Pub L No 96-164; ", "Pub. L. 96-164"],
    ["Public Law 96–164", "us-law/public/96/164", "public", "96", "164",
      "Nuclear Energy Authorization Act of 1980 (Public Law 96–164; ", "Pub. L. 96-164"],
    ["Public   Law  96–164", "us-law/public/96/164", "public", "96", "164",
      "Nuclear Energy Authorization Act of 1980 (Public   Law  96–164; ", "Pub. L. 96-164"],

    // from DC Code credits for 1-201.01
    ["Pub.L. 105-33", "us-law/public/105/33", "public", "105", "33",
      "111 Stat. 251, Pub.L. 105-33, title XI", "Pub. L. 105-33"],
    ["Pub.L.No. 105-33", "us-law/public/105/33", "public", "105", "33",
      "111 Stat. 251, Pub.L.No. 105-33, title XI", "Pub. L. 105-33"], // made-up

    // summary for http://beta.congress.gov/bill/112th/house-bill/1
    ["P.L. 111-80", "us-law/public/111/80", "public", "111", "80",
      "Related Agencies Appropriations Act, 2010 (P.L. 111-80);", "Pub. L. 111-80"],
    ["PL 111-83", "us-law/public/111/83", "public", "111", "83",
      "Homeland Security Appropriations Act, 2010 (PL 111-83);", "Pub. L. 111-83"],
    ["PL   111-83", "us-law/public/111/83", "public", "111", "83",
      "Homeland Security Appropriations Act, 2010 (PL   111-83);", "Pub. L. 111-83"],

    // don't have a source for these yet, just theoretical
    ["Priv. L. 96–164", "us-law/private/96/164", "private", "96", "164",
      "Nuclear Energy Authorization Act of 1980 (Priv. L. 96–164; ", "Pvt. L. 96-164"],
    ["Priv. L. 96-164", "us-law/private/96/164", "private", "96", "164",
      "Nuclear Energy Authorization Act of 1980 (Priv. L. 96-164; ", "Pvt. L. 96-164"],
    ["Priv. L. No. 96-164", "us-law/private/96/164", "private", "96", "164",
      "Nuclear Energy Authorization Act of 1980 (Priv. L. No. 96-164; ", "Pvt. L. 96-164"],
    ["Priv L 96–164", "us-law/private/96/164", "private", "96", "164",
      "Nuclear Energy Authorization Act of 1980 (Priv L 96–164; ", "Pvt. L. 96-164"],
    ["Priv L No 96-164", "us-law/private/96/164", "private", "96", "164",
      "Nuclear Energy Authorization Act of 1980 (Priv L No 96-164; ", "Pvt. L. 96-164"],
    ["Private Law 96–164", "us-law/private/96/164", "private", "96", "164",
      "Nuclear Energy Authorization Act of 1980 (Private Law 96–164; ", "Pvt. L. 96-164"],

    // historical anomalies (https://github.com/unitedstates/legisworks-historical-statutes)
    ["Pub. L. 61-167½", "us-law/public/61/167½", "public", "61", "167½" ],
    ["Pub. L. 65-246½",  "us-law/public/65/246½", "public", "65", "246½" ],
    ["Pub. L. 67-45-46", "us-law/public/67/45-46", "public", "67", "45-46" ],
    ["Pub. L. 69-439½",  "us-law/public/69/439½", "public", "69", "439½" ],
    ["Pub. L. 74-297½",  "us-law/public/74/297½", "public", "74", "297½" ],
    ["Pub. L. 74-770½",  "us-law/public/74/770½", "public", "74", "770½" ],
    ["Pub. L. 79-160-A", "us-law/public/79/160-A", "public", "79", "160-A" ]
  ];

  for (var i=0; i<cases.length; i++) {
    var details = cases[i];

    // Search the text string for a citation. The details[5] holds the string
    // to search, or if not given, then details[0].
    var text = details[5] || details[0];
    var found = Citation.find(text, {types: "law"}).citations;
    test.equal(found.length, 1, "No match found in: " + text);
    if (found.length != 1) continue;

    // Check the fields of the found citation.
    var citation = found[0];
    test.equal(citation.type, 'law');
    test.equal(citation.type_name, 'U.S. Law');
    test.equal(citation.match, details[0]);
    test.equal(citation.citation, details[6] || details[0]); // compare to canonical form in details[6] if given
    test.equal(citation.law.id, details[1]);
    test.equal(citation.law.type, details[2]);
    test.equal(citation.law.congress, details[3]);
    test.equal(citation.law.number, details[4]);

    // Check that fromId round-trips properly. It will be missing the 'match' and 'index'
    // properties so delete those.
    delete citation.match;
    delete citation.index;
    test.deepEqual(Citation.fromId(citation.law.id), citation);
  }

  test.done();
};

exports["Subsections"] = function(test) {
  var cases = [
    // variations on text of http://www.gpo.gov/fdsys/pkg/BILLS-112hr6567ih/xml/BILLS-112hr6567ih.xml
    ["Section 4402 of Public Law 107–171", "us-law/public/107/171/4402",
      "public", "107", "171", ["4402"],
      "(3) Section 4402 of Public Law 107–171 (relating", "Section 4402 of Public Law 107-171"],
    ["Section 4402(e) of PL 107–171", "us-law/public/107/171/4402/e",
      "public", "107", "171", ["4402", "e"],
      "(3) Section 4402(e) of PL 107–171 (relating", "Section 4402(e) of Public Law 107-171"],
    ["Section 4402(e)(1) of Public Law 107–171", "us-law/public/107/171/4402/e/1",
      "public", "107", "171", ["4402", "e", "1"],
      "(3) Section 4402(e)(1) of Public Law 107–171 (relating", "Section 4402(e)(1) of Public Law 107-171"]
  ];


  for (var i=0; i<cases.length; i++) {
    var details = cases[i];

    // Search the text string for a citation.
    var text = details[6];
    var found = Citation.find(text, {types: "law"}).citations;
    test.equal(found.length, 1, "No match found in: " + text);
    if (found.length != 1) continue;

    // Check the fields of the found citation.
    var citation = found[0];
    test.equal(citation.match, details[0]);
    test.equal(citation.citation, details[7]);
    test.equal(citation.law.id, details[1]);
    test.equal(citation.law.type, details[2]);
    test.equal(citation.law.congress, details[3]);
    test.equal(citation.law.number, details[4]);
    test.deepEqual(citation.law.sections, details[5]);

    // Check that fromId round-trips properly. It will be missing the 'match' and 'index'
    // properties so delete those.
    delete citation.match;
    delete citation.index;
    test.deepEqual(Citation.fromId(citation.law.id), citation);
  }

  test.done();
};

// can opt-in to asking for all parents of a subsection to be returned too
exports["Parent detection"] = function(test) {
  var text, found, citation;

  text = "section 4402(e)(1) of Public Law 110-2";

  found = Citation.find(text, {types: "law", parents: false}).citations;
  test.equal(found.length, 1);
  test.equal(found[0].law.id, "us-law/public/110/2/4402/e/1");

  found = Citation.find(text, {types: "law", parents: true}).citations;
  test.equal(found.length, 4);

  if (found.length == 4) {
    test.equal(found[0].law.id, "us-law/public/110/2/4402/e/1");
    test.equal(found[1].law.id, "us-law/public/110/2/4402/e");
    test.equal(found[2].law.id, "us-law/public/110/2/4402");
    test.equal(found[3].law.id, "us-law/public/110/2");
  } else
    console.log(found);

  test.done();
}