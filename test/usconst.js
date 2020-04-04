/*
  Tests for extracting U.S. Constittion citations.
  Each test should link to a real world circumstance where possible.
*/

var Citation = require('../citation');

exports["All patterns"] = function(test) {
  var cases = [
    // http://pdfserver.amlaw.com/nlj/3-18-16%20dc%20council%20v%20mayor%20order%20NLJ.pdf
    ["U.S. CONST., art. I, ¶ 8, cl. 17", 'usconst/article-1/paragraph-8/clause-17'],
    ["U.S. CONST., art. VI, cl. 2", 'usconst/article-6/clause-2'],

    // https://www.courtlistener.com/?q=%22U.S.+CONST.%22&order_by=score+desc&stat_Precedential=on
    ["U. S. Const. Amend. IV", 'usconst/amendment-4'],
    ["U. S. Const., Art. I, § 8, cl. 18", 'usconst/article-1/section-8/clause-18'],
  ];

  for (var i=0; i<cases.length; i++) {
    var details = cases[i];

    var text = details[0];
    var found = Citation.find(text, {types: "usconst", links: true}).citations;
    test.equal(found.length, 1);

    if (found.length == 1) {
      var citation = found[0];
      test.equal(citation.type, 'usconst');
      test.equal(citation.type_name, 'United States Constitution');
      test.equal(citation.usconst.id, details[1]);
    }
    else
      console.log("No match found in: " + text);;
  };

  test.done();
};
