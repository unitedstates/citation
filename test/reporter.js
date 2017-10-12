/*
  Tests for extracting Reporter citations.
*/

var Citation = require('../citation');

exports["Absolute patterns"] = function(test) {

  var cases = [
    // Supreme Court Opinion
    [ 'US Reporter',
      'Citizens United v. Federal Election Commission, 558 U.S. 310 (2010), (Docket No. 08-205), is a U.S. constitutional law case dealing with the regulation of campaign spending by corporations',
      '558 U.S. 310',
      '558', 'U.S.', '310'],

    // Supreme Court Opinion with extra space
    [ 'US Reporter Spacing',
      'Citizens United v. Federal Election Commission, 558 U. S. 310 (2010), (Docket No. 08-205), is a U.S. constitutional law case dealing with the regulation of campaign spending by corporations',
  '558 U. S. 310',
  '558', 'U. S.', '310'],

    // Supreme Court Opinion with unassigned page
    [ 'Supreme Court Opinion Underscore',
      'See, e.g., Herbert v. Kitchen 571 U. S. ___ (2014);',
      '571 U. S. ___',
      '571', 'U. S.', '___'
      ],

      //  Atlantic Reporter
      ["Atlantic",
      "In enacting the 1984 amendment, Congress undertook to authorize the Council in certain circumstances to do by resolution what the Congress itself could not do in its capacity as a national legislature. Cf. Gary v. United States, 499 A.2d 815, 818-821 (D.C.1985) (en banc)....",
      '499 A.2d 815',
      '499','A.2d','815'
      ],

      // Southwest Reporter
      ["Southwest",
      "the State contends in its first point of error that a court cannot review this statute in a civil action. Passel, 440 S.W.2d 61 (Tex.1969), ....",
      '440 S.W.2d 61',
      '440','S.W.2d','61'
      ],


      // Northwest Reporter
      ["Northwest",
      "Noyes v. State, 1 N.W. 1 (Wis., 1879)  ....",
      '1 N.W. 1',
      '1','N.W.','1'
      ],


       //  Federal Reporter
      ["Federal Reporter",
      "MATTHEW BENDER & CO. v. WEST PUBLISHING CO., 158 F.3d 674 (2nd Cir. 1998)",
      '158 F.3d 674',
      '158','F.3d','674'
      ],

      //  Federal Supplement Report
      ["Federal Supplement",
      'See, e.g., Hearn v. Meyer, 664 F. Supp. 832, 847 (S.D.N.Y. 1987) ("Copyright protection is afforded rarely where a fact permits only a narrow continuum or spectrum of expression.").',
      '664 F. Supp. 832',
      '664','F. Supp.','832'
      ]


  ];

  for (var i=0; i<cases.length; i++) {
    var details = cases[i];
    var text = details[1];

    var found = Citation.find(text, {
      types: ["reporter"],
      context: {} // leaving out a context means the parser will require an absolute cite
    }).citations;

    test.equal(found.length, 1);

    if (found.length == 1) {
      var citation = found[0];
      test.equal(citation.match, details[2], details[0]);
      test.equal(citation.reporter.volume, details[3]);
      test.equal(citation.reporter.reporter, details[4]);
      test.deepEqual(citation.reporter.page, details[5]);
    } else
      console.log("No match found in: " + text);
  }

  test.done();
};
