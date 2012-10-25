/*
  Tests for extracting Code of Federal Regulations citations.
  Each test should link to a real world circumstance where possible.
*/

var Citation = require('../citation');
var _ = require('underscore');

var tests = [
  // http://gao.gov/products/GAO-10-441T
  ["14 CFR part 25", "Simple Part (word)",
    {
      match: "14 CFR part 25", 
      cfr: {
        title: "14",
        part: "25",
        section: null,
        subsections: null,
        id: "14_cfr_25"
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
        id: "38_cfr_74.2"
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
        id: "48_cfr_9903.201"
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
        id: "45_cfr_3009.4"
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
        id: "24_cfr_85.25_h"
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
        id: "5_cfr_531.610_f"
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
        id: "47_cfr_54.506_c"
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
        id: "47_cfr_54.506"
      }
    }
  ]
];

tests.forEach(function(single) {

  exports[single[1]] = function(test) {
    test.expect();

    var text = single[0];
    var expected = single[2];

    var found = Citation.find(text, {types: "cfr"});

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