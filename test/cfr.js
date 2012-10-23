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
  ]

  // // http://gao.gov/products/GAO-11-331T
  // ["48 CFR § 9903.201", "section symbol",
  //   ],

  // // http://gao.gov/products/GAO-10-1000SP
  // ["24 CFR 85.25(h)", "subsection",
  //   ],

  // // http://gao.gov/products/GAO-09-253
  // ["47 CFR 54.506 (c)", "subsection space",
  //   ],

  // // http://gao.gov/products/GAO-09-562
  // ["5 CFR §531.610(f)", "subsection symbol",
  //   ],

  // // http://gao.gov/products/GAO-11-166
  // ["45 C.F.R. 3009.4", "basic periods",
  //   ],
];

tests.forEach(function(single) {

  exports[single[1]] = function(test) {
    test.expect();

    var text = single[0];
    var expected = single[2];

    var found = Citation.find(text, {types: "cfr"});
    test.equal(found.length, 1);

    if (found.length == 1) {
      var citation = found[0];
      test.equal(citation.match, expected.match);
      test.deepEqual(citation.cfr, expected.cfr);
    }

    test.done();
  };

});