/*
  Tests for extracting Statutes at Large citations.
  Each test should link to a real world circumstance where possible.
*/

var Citation = require('../citation');

exports["All patterns"] = function(test) {
  var cases = [
      // 
      ["20 DCSTAT 548", "Basic citation", "20 DCSTAT 548",
      "20", "548", "dcstat/20/548"]  ]

  for (var i=0; i<cases.length; i++) {
    var details = cases[i];

    var text = details[0];
    var found = Citation.find(text, {types: "dc_stat"}).citations;
    test.equal(found.length, 1);

    if (found.length == 1) {
      var citation = found[0];
      test.equal(citation.type, 'dc_stat');
      test.equal(citation.type_name, 'D.C. Statutes at Large');
      test.equal(citation.match, details[2]);
      test.equal(citation.dc_stat.id, details[5]);
      test.equal(citation.dc_stat.volume, details[3]);
      test.equal(citation.dc_stat.page, details[4]);
    }
    else
      console.log("No match found in: " + text);;
  };

  test.done();
};
