/*
  Tests for extracting Statutes at Large citations.
  Each test should link to a real world circumstance where possible.
*/

var Citation = require('../citation');

exports.testPatterns = function(test) {
  test.expect();

var cases = [
    // text copied from the DC Code Credits
    ["110 Stat. 548", "Basic citation", "110 Stat. 548", 
    "110", "548", "stat/110/548"],
    ["Mar. 3, 1887, 24 Stat. 501, ch. 355", "DC Code Credits", 
    "24 Stat. 501", "24", "501", "stat/24/501"],
]
 
 for (var i=0; i<cases.length; i++) {
    var details = cases[i];

    var text = details[0];
    var found = Citation.find(text).citations;
    test.equal(found.length, 1);

    if (found.length == 1) {
      var citation = found[0];
      test.equal(citation.match, details[2]);
      test.equal(citation.stat.id, details[5]);
      test.equal(citation.stat.volume, details[3]);
      test.equal(citation.stat.page, details[4]);
    }
    else
      console.log("No match found in: " + text);;
  };

  test.done();
};
