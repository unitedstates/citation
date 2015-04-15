/*
  Tests for extracting Statutes at Large citations.
  Each test should link to a real world circumstance where possible.
*/

var Citation = require('../citation');

exports["All patterns"] = function(test) {
  var cites = [
      // starter
      ["75 Fed. Reg. 28404", "Basic citation", "75 Fed. Reg. 28404",
      "75", "28404", "fedreg/75/28404"],
      ["69 FR 22135", "Short form", "69 FR 22135",
      "69","22135","fedreg/69/22135"]
  ]

  for (var i=0; i<cites.length; i++) {
    var details = cites[i];

    var text = details[0];
    var found = Citation.find(text, {types: "fedreg"}).citations;
    test.equal(found.length, 1);

    if (found.length == 1) {
      var citation = found[0];
      test.equal(citation.match, details[2]);
      test.equal(citation.fedreg.volume, details[3]);
      test.equal(citation.fedreg.page, details[4]);
    }
    else
      console.log("No match found in: " + text);;
  };

  test.done();
};
