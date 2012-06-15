/**

  Tests for extracting US Code citations. 

  Each test should be based on a real world circumstance, with a link to it if possible.

*/


var Citation = require('../lib/citation');


// "5 U.S.C. 552"
// http://www.gpo.gov/fdsys/pkg/BILLS-112hr3604ih/xml/BILLS-112hr3604ih.xml

exports.testBasicPattern = function(test) {
  test.expect(5);

  var text = "All regulations in effect immediately before " +
    "the enactment of subsection (f) that were promulgated under " +
    "the authority of this section shall be repealed in accordance " +
    "with section 552(a)(1)(E) of the Administrative Procedure Act (5 U.S.C. 552(a)(1)(E))";

  var found = Citation.find(text);
  test.equal(found.length, 1);

  var citation = found[0];
  test.equal(citation.match, "5 U.S.C. 552");
  test.equal(citation.usc.title, "5");
  test.equal(citation.usc.section, "552");
  test.equal(citation.usc.id, "5-usc-552");

  test.done();
};


// "section 89 of title 14"
// http://www.gpo.gov/fdsys/pkg/BILLS-111s3663pcs/xml/BILLS-111s3663pcs.xml

exports.testCasualPattern = function(test) {
  test.expect(5);

  var text = "Nothing in this section shall be considered to limit the authority " +
    "of the Coast Guard to enforce this or any other Federal law " +
    "under section 89 of title 14, United States Code.";

  var found = Citation.find(text);
  test.equal(found.length, 1);

  var citation = found[0];
  test.equal(citation.match, "section 89 of title 14");
  test.equal(citation.usc.title, "14");
  test.equal(citation.usc.section, "89");
  test.equal(citation.usc.id, "14-usc-89");

  test.done();
}
