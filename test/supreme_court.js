/*
  Tests for extracting US Supreme Court citations.
  Each test should link to a real world circumstance where possible.

  In-progress:
  - Currently does not capture the parties
  - I'm not sure if this should be a separate file, or part of a larger judicial extractor.
    - For example, maybe this should have a `reporter` field, and not specify that it's from the US Sup. Ct.
    - Instead, the reporter tells you which court.
*/

var Citation = require('../citation');

exports["Basic pattern, no parties"] = function(test) {
  var text = "United States v. Mead Corp., 533 U.S. 218 (2001)";

  var found = Citation.find(text, {types: "supreme_court"});
  var citation = found.citations[0];

  test.equal(citation.supreme_court.volume, '533');
  test.equal(citation.supreme_court.page, '218');
  test.equal(citation.supreme_court.year, '2001');
  test.equal(citation.supreme_court.id, "supreme_court/533/218/2001");

  test.done();
};

/*
parties
volume
reporter (U.S. or U. S.)
begin page
cite page (optional)
year
*/
