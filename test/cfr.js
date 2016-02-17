/*
  Tests for extracting Code of Federal Regulations citations.
  Each test should link to a real world circumstance where possible.
*/

var Citation = require('../citation');

var singles = [
  // http://gao.gov/products/GAO-10-441T
  ["14 CFR part 25", "Simple Part (word)",
    {
      match: "14 CFR part 25",
      cfr: {
        title: "14",
        part: "25",
        section: null,
        subsections: null,
        id: "cfr/14/25"
      }
    }
  ],

  // http://gao.gov/products/GAO-10-673T
  ["38 CFR Part 74.2", "Simple Section (word)",
    {
      match: "38 CFR Part 74.2",
      cfr: {
        title: "38",
        part: "74",
        section: "74.2",
        subsections: [],
        id: "cfr/38/74.2"
      }
    }
  ],

  // http://gao.gov/products/GAO-11-331T
  ["48 CFR § 9903.201", "Simple Section (symbol)",
    {
      match: "48 CFR § 9903.201",
      cfr: {
        title: "48",
        part: "9903",
        section: "9903.201",
        subsections: [],
        id: "cfr/48/9903.201"
      }
    }
  ],

  // Artificial test case
  ["48 CFR §9903.201", "Simple Section (symbol, no space)",
    {
      match: "48 CFR §9903.201",
      cfr: {
        title: "48",
        part: "9903",
        section: "9903.201",
        subsections: [],
        id: "cfr/48/9903.201"
      }
    }
  ],

  // http://gao.gov/products/GAO-11-166
  ["45 C.F.R. 3009.4", "Simple Section (Periods)",
    {
      match: "45 C.F.R. 3009.4",
      cfr: {
        title: "45",
        part: "3009",
        section: "3009.4",
        subsections: [],
        id: "cfr/45/3009.4"
      }
    }
  ],

  // http://gao.gov/products/GAO-09-727
  ["5CFR, part 575", "Simple CFR (no space)",
    {
      match: "5CFR, part 575",
      cfr: {
        title: "5",
        part: "575",
        section: null,
        subsections: null,
        id: "cfr/5/575"
      }
    }
  ],

  // http://gao.gov/products/GAO-10-1000SP
  ["24 CFR 85.25(h)", "Subsection",
    {
      match: "24 CFR 85.25(h)",
      cfr: {
        title: "24",
        part: "85",
        section: "85.25",
        subsections: ["h"],
        id: "cfr/24/85.25/h"
      }
    }
  ],

  // http://gao.gov/products/GAO-09-562
  ["5 CFR §531.610(f)", "Subsection (symbol)",
    {
      match: "5 CFR §531.610(f)",
      cfr: {
        title: "5",
        part: "531",
        section: "531.610",
        subsections: ["f"],
        id: "cfr/5/531.610/f"
      }
    }
  ],

  // http://gao.gov/products/GAO-09-253
  ["47 CFR 54.506 (c)", "Subsection (with space)",
    {
      match: "47 CFR 54.506 (c)",
      cfr: {
        title: "47",
        part: "54",
        section: "54.506",
        subsections: ["c"],
        id: "cfr/47/54.506/c"
      }
    }
  ],

  // Test: do not match arbitrary parenthesized words with spaces
  ["47 CFR 54.506 (whatever)", "Subsection (invalid word)",
    {
      match: "47 CFR 54.506",
      cfr: {
        title: "47",
        part: "54",
        section: "54.506",
        subsections: [],
        id: "cfr/47/54.506"
      }
    }
  ],

  // https://twitter.com/CrimeADay/status/654462486704467968
  ["43 U.S.C. §1733, 43 C.F.R. §8360.0–7 & 8365.2–3(f) make it a federal crime to move a table in a federal picnic area.", "Section with dash",
    {
      match: "43 C.F.R. §8360.0–7",
      cfr: {
        title: "43",
        part: "8360",
        section: "8360.0-7",
        subsections: [],
        id: "cfr/43/8360.0-7"
      }
    }
  ],

  // Modified from https://twitter.com/CrimeADay/status/654462486704467968
  ["43 U.S.C. §1733, 43 C.F.R. §8360.0-7 & 8365.2-3(f) make it a federal crime to move a table in a federal picnic area.", "Section with hyphen",
    {
      match: "43 C.F.R. §8360.0-7",
      cfr: {
        title: "43",
        part: "8360",
        section: "8360.0-7",
        subsections: [],
        id: "cfr/43/8360.0-7"
      }
    }
  ],

  ["12 CFR § 226.5a", "Trailing lowercase letter in section number",
    {
      match: "12 CFR § 226.5a",
      cfr: {
        title: "12",
        part: "226",
        section: "226.5a",
        subsections: [],
        id: "cfr/12/226.5a"
      }
    }
  ],

  ["10 CFR § 205.192A", "Trailing uppercase letter in section number",
    {
      match: "10 CFR § 205.192A",
      cfr: {
        title: "10",
        part: "205",
        section: "205.192A",
        subsections: [],
        id: "cfr/10/205.192A"
      }
    }
  ],

  ["17 CFR § 240.10b-21", "Lowercase letter, dash, and additional number in section number",
    {
      match: "17 CFR § 240.10b-21",
      cfr: {
        title: "17",
        part: "240",
        section: "240.10b-21",
        subsections: [],
        id: "cfr/17/240.10b-21"
      }
    }
  ],

  ["12 CFR § 708a.101", "Lowercase letter at the end of a part number",
    {
      match: "12 CFR § 708a.101",
      cfr: {
        title: "12",
        part: "708a",
        section: "708a.101",
        subsections: [],
        id: "cfr/12/708a.101"
      }
    }
  ],

  ["10 CFR § 960.3-1-1", "Multiple dashes and numbers in section numbers (case 1)",
    {
      match: "10 CFR § 960.3-1-1",
      cfr: {
        title: "10",
        part: "960",
        section: "960.3-1-1",
        subsections: [],
        id: "cfr/10/960.3-1-1"
      }
    }
  ],

  ["10 CFR § 960.3-1-4-1", "Multiple dashes and numbers in section numbers (case 2)",
    {
      match: "10 CFR § 960.3-1-4-1",
      cfr: {
        title: "10",
        part: "960",
        section: "960.3-1-4-1",
        subsections: [],
        id: "cfr/10/960.3-1-4-1"
      }
    }
  ],

  ["48 CFR 970.3102-05-30-70", "Multiple dashes and numbers in section numbers (case 3)",
    {
      match: "48 CFR 970.3102-05-30-70",
      cfr: {
        title: "48",
        part: "970",
        section: "970.3102-05-30-70",
        subsections: [],
        id: "cfr/48/970.3102-05-30-70"
      }
    }
  ],

  ["26 CFR § 1.1031(a)-1", "Letter in parentheses, trailing dash, and number in section",
    {
      match: "26 CFR § 1.1031(a)-1",
      cfr: {
        title: "26",
        part: "1",
        section: "1.1031(a)-1",
        subsections: [],
        id: "cfr/26/1.1031(a)-1"
      }
    }
  ],

  ["26 CFR § 1.1031(d)-1T", "Letter in parentheses, trailing dash, number, and \"T\" in section",
    {
      match: "26 CFR § 1.1031(d)-1T",
      cfr: {
        title: "26",
        part: "1",
        section: "1.1031(d)-1T",
        subsections: [],
        id: "cfr/26/1.1031(d)-1T"
      }
    }
  ],

  ["41 CFR § 128-1.5004", "Dash in part number",
    {
      match: "41 CFR § 128-1.5004",
      cfr: {
        title: "41",
        part: "128-1",
        section: "128-1.5004",
        subsections: [],
        id: "cfr/41/128-1.5004"
      }
    }
  ],

  ["41 CFR § 128-48.001-50", "Dash in both part number and section number",
    {
      match: "41 CFR § 128-48.001-50",
      cfr: {
        title: "41",
        part: "128-48",
        section: "128-48.001-50",
        subsections: [],
        id: "cfr/41/128-48.001-50"
      }
    }
  ],

  ["33 CFR § 100.35T01-0125", "\"T\" and dash in section number (case 1)",
    {
      match: "33 CFR § 100.35T01-0125",
      cfr: {
        title: "33",
        part: "100",
        section: "100.35T01-0125",
        subsections: [],
        id: "cfr/33/100.35T01-0125"
      }
    }
  ],

  ["33 CFR § 100.T07-0110", "\"T\" and dash in section number (case 2)",
    {
      match: "33 CFR § 100.T07-0110",
      cfr: {
        title: "33",
        part: "100",
        section: "100.T07-0110",
        subsections: [],
        id: "cfr/33/100.T07-0110"
      }
    }
  ],

  ["48 CFR 53.303-DD-254", "Dashes and capital letters in section numbers (case 1)",
    {
      match: "48 CFR 53.303-DD-254",
      cfr: {
        title: "48",
        part: "53",
        section: "53.303-DD-254",
        subsections: [],
        id: "cfr/48/53.303-DD-254"
      }
    }
  ],

  ["48 CFR 53.303-WH-347", "Dashes and capital letters in section numbers (case 2)",
    {
      match: "48 CFR 53.303-WH-347",
      cfr: {
        title: "48",
        part: "53",
        section: "53.303-WH-347",
        subsections: [],
        id: "cfr/48/53.303-WH-347"
      }
    }
  ],

  ["48 CFR 53.302-1419A", "Dash in section number, trailing capital letter",
    {
      match: "48 CFR 53.302-1419A",
      cfr: {
        title: "48",
        part: "53",
        section: "53.302-1419A",
        subsections: [],
        id: "cfr/48/53.302-1419A"
      }
    }
  ],

  ["17 CFR § 210.6A-01", "Capital letter and dash in section number",
    {
      match: "17 CFR § 210.6A-01",
      cfr: {
        title: "17",
        part: "210",
        section: "210.6A-01",
        subsections: [],
        id: "cfr/17/210.6A-01"
      }
    }
  ],

  ["12 CFR § 563d.3b-6", "Lowercase letter and dash in section number",
    {
      match: "12 CFR § 563d.3b-6",
      cfr: {
        title: "12",
        part: "563d",
        section: "563d.3b-6",
        subsections: [],
        id: "cfr/12/563d.3b-6"
      }
    }
  ],

  ["26 CFR § 1.1402(e)-1A", "Dash, number, and capital letter after subsection",
    {
      match: "26 CFR § 1.1402(e)-1A",
      cfr: {
        title: "26",
        part: "1",
        section: "1.1402(e)-1A",
        subsections: [],
        id: "cfr/26/1.1402(e)-1A"
      }
    }
  ],

  ["17 CFR § 240.3a12-12", "Numbers, lowercase letter, numbers, dash, numbers",
    {
      match: "17 CFR § 240.3a12-12",
      cfr: {
        title: "17",
        part: "240",
        section: "240.3a12-12",
        subsections: [],
        id: "cfr/17/240.3a12-12"
      }
    }
  ],

  ["17 CFR § 240.15Cc1-1", "Uppercase and lowercase letters in the section number, followed by a number, a dash, and a number",
    {
      match: "17 CFR § 240.15Cc1-1",
      cfr: {
        title: "17",
        part: "240",
        section: "240.15Cc1-1",
        subsections: [],
        id: "cfr/17/240.15Cc1-1"
      }
    }
  ],

  ["17 CFR § 240.15Ga-2", "Uppercase and lowercase letters in the section number, followed by a dash and a number",
    {
      match: "17 CFR § 240.15Ga-2",
      cfr: {
        title: "17",
        part: "240",
        section: "240.15Ga-2",
        subsections: [],
        id: "cfr/17/240.15Ga-2"
      }
    }
  ],

  ["17 CFR § 275.206(3)-3T", "Parentheses inside section, depth 1",
    {
      match: "17 CFR § 275.206(3)-3T",
      cfr: {
        title: "17",
        part: "275",
        section: "275.206(3)-3T",
        subsections: [],
        id: "cfr/17/275.206(3)-3T"
      }
    }
  ],

  ["26 CFR § 1.411(a)(13)-1", "Parentheses inside section, depth 2",
    {
      match: "26 CFR § 1.411(a)(13)-1",
      cfr: {
        title: "26",
        part: "1",
        section: "1.411(a)(13)-1",
        subsections: [],
        id: "cfr/26/1.411(a)(13)-1"
      }
    }
  ],

  ["26 CFR § 301.6103(j)(1)-1T", "Parentheses inside section, depth 2, trailing T",
    {
      match: "26 CFR § 301.6103(j)(1)-1T",
      cfr: {
        title: "26",
        part: "301",
        section: "301.6103(j)(1)-1T",
        subsections: [],
        id: "cfr/26/301.6103(j)(1)-1T"
      }
    }
  ],

  ["26 CFR § 31.3401(a)(6)-1A", "Parentheses inside section, depth 2, trailing A",
    {
      match: "26 CFR § 31.3401(a)(6)-1A",
      cfr: {
        title: "26",
        part: "31",
        section: "31.3401(a)(6)-1A",
        subsections: [],
        id: "cfr/26/31.3401(a)(6)-1A"
      }
    }
  ],

  ["17 CFR § 275.202(a)(11)(G)-1", "Parentheses inside section, depth 3",
    {
      match: "17 CFR § 275.202(a)(11)(G)-1",
      cfr: {
        title: "17",
        part: "275",
        section: "275.202(a)(11)(G)-1",
        subsections: [],
        id: "cfr/17/275.202(a)(11)(G)-1"
      }
    }
  ],

  ["33 CFR § 110.72aa", "Two trailing letters",
    {
      match: "33 CFR § 110.72aa",
      cfr: {
        title: "33",
        part: "110",
        section: "110.72aa",
        subsections: [],
        id: "cfr/33/110.72aa"
      }
    }
  ],

  ["26 CFR § 1.863-3AT", "Two trailing letters, with hyphen in section number",
    {
      match: "26 CFR § 1.863-3AT",
      cfr: {
        title: "26",
        part: "1",
        section: "1.863-3AT",
        subsections: [],
        id: "cfr/26/1.863-3AT"
      }
    }
  ],

  ["17 CFR § 240.13h-l", "Typo in Federal Register that got codified",
    {
      match: "17 CFR § 240.13h-l",
      cfr: {
        title: "17",
        part: "240",
        section: "240.13h-l",
        subsections: [],
        id: "cfr/17/240.13h-l"
      }
    }
  ],

  ["17 CFR § 240.13h-l(d)(2)(xiii)", "Typo in Federal Register that got codified (subsection)",
    {
      match: "17 CFR § 240.13h-l(d)(2)(xiii)",
      cfr: {
        title: "17",
        part: "240",
        section: "240.13h-l",
        subsections: ["d", "2", "xiii"],
        id: "cfr/17/240.13h-l/d/2/xiii"
      }
    }
  ],

  ["41 CFR §109-38.301-1.50", "Section number with extra period",
    {
      match: "41 CFR §109-38.301-1.50",
      cfr: {
        title: "41",
        part: "109-38",
        section: "109-38.301-1.50",
        subsections: [],
        id: "cfr/41/109-38.301-1.50"
      }
    }
  ]
];

singles.forEach(function(single) {

  exports[single[1]] = function(test) {

    var text = single[0];
    var expected = single[2];

    var found = Citation.find(text, {types: "cfr"}).citations;

    if (expected) {
      test.equal(found.length, 1);

      if (found.length == 1) {
        var citation = found[0];
        test.equal(citation.match, expected.match);
        test.deepEqual(citation.cfr, expected.cfr);
      } else
        console.log(found);
    } else {
      test.equal(found.length, 0);
      if (found.length != 0)
        console.log(found);
    }

    test.done();
  };

});
