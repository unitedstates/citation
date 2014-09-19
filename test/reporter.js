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

      //  Atlantic Reporter
      ["Atlantic",
      "In enacting the 1984 amendment, Congress undertook to authorize the Council in certain circumstances to do by resolution what the Congress itself could not do in its capacity as a national legislature. Cf. Gary v. United States, 499 A.2d 815, 818-821 (D.C.1985) (en banc)....",
      '499 A.2d 815',
      '499','A.2d','815'
      ],
      
      ["Atlantic",
      "If the language of the statute is clear and unambiguous and conveys a definite and sensible meaning that does not contradict an evident legislative purpose, the court must apply the words literally.' Rathbun v. Leesona Corp., R.I. 460 A.2d 931, 933 (1983).",
      '460 A.2d 931',
      '460', 'A.2d', '931'
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
      ],
      
      //  Pacific Reporter
      ["Pacific Reporter",
      'and (3) a duty should be found under the factors presented in Mostert v. CBL & Assocs., 741 P.2d 1090 (Wyo.1987). A hearing was held on October 6, 1998, and the district court issued a decision letter on November 3, 1998, granting summary judgment in favor of the appellees.',
      '741 P.2d 1090',
      '741', 'P.2d', '1090'
      ],
      
      // Southwestern Reporter
      ["Southwestern Reporter",
      "State asserts and whether those objectives are compelling enough to override appellees' right of privacy. The burden of proof rests with the State to demonstrate a compelling governmental objective. TSEU, 746 S.W.2d at 205.",
      '746 S.W.2d 205',
      '746', 'S.W.2d', '205'
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