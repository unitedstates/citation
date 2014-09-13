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