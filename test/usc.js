/**

  Tests for extracting US Code citations from legislation. 

  Each test should be based on a real world circumstance, with a link to it if possible.

*/


var Citation = require('../lib/citation');


// "5 U.S.C. 552"
// http://www.gpo.gov/fdsys/pkg/BILLS-112hr3604ih/xml/BILLS-112hr3604ih.xml

exports.testBasicPattern = function(test) {
  test.expect(10);

  var text = "All regulations in effect immediately before " +
    "the enactment of subsection (f) that were promulgated under " +
    "the authority of this section shall be repealed in accordance " +
    "... of the Administrative Procedure Act (5 U.S.C. 552) and some more things... " +
    "(8) Add at the end the following new subsections: (f) ... " +
    "Upon receipt of an allotment application, but in any event not " +
    "later than 6 months after receiving such application, the Secretary " +
    "shall notify any person or entity having an interest in land " +
    "potentially adverse to the applicant of their right to initiate...";

  var found = Citation.find(text);
  test.equal(found.length, 1);

  var citation = found[0];
  test.equal(citation.match, "5 U.S.C. 552");
  test.equal(citation.usc.title, "5");
  test.equal(citation.usc.section, "552");
  test.deepEqual(citation.usc.subsections, [])
  test.equal(citation.usc.section_id, "5_usc_552");
  test.equal(citation.usc.id, "5_usc_552");

  var foundContext = Citation.find(text, {context: 5});
  test.equal(foundContext.length, 1);

  var citationContext = foundContext[0];
  test.equal(citationContext.match, "5 U.S.C. 552");
  test.equal(citationContext.context, "Act (5 U.S.C. 552) and")

  test.done();
};



exports.testBasicWithSubsections = function(test) {
  test.expect(14);

  // http://www.gpo.gov/fdsys/pkg/BILLS-112hr3604ih/xml/BILLS-112hr3604ih.xml
  var text = "All regulations in effect immediately before " +
    "the enactment of subsection (f) that were promulgated under " +
    "the authority of this section shall be repealed in accordance " +
    "... of the Administrative Procedure Act (5 U.S.C. 552(a)(1)(E)) ...";

  var found = Citation.find(text);
  test.equal(found.length, 1);

  var citation = found[0];
  test.equal(citation.match, "5 U.S.C. 552(a)(1)(E)");
  test.equal(citation.usc.title, "5");
  test.equal(citation.usc.section, "552");
  test.deepEqual(citation.usc.subsections, ["a", "1", "E"])
  test.equal(citation.usc.section_id, "5_usc_552");
  test.equal(citation.usc.id, "5_usc_552_a_1_E");


  // more complicated section handle

  // http://www.gpo.gov/fdsys/pkg/BILLS-111s3611es/xml/BILLS-111s3611es.xml
  var text = "National Counter Proliferation Center.--Section 119A(a) of the " +
    "National Security Act of 1947 (50 U.S.C. 404o-1(a)) is amended--";

  var found = Citation.find(text);
  test.equal(found.length, 1);

  var citation = found[0];
  test.equal(citation.match, "50 U.S.C. 404o-1(a)");
  test.equal(citation.usc.title, "50");
  test.equal(citation.usc.section, "404o-1");
  test.deepEqual(citation.usc.subsections, ["a"])
  test.equal(citation.usc.section_id, "50_usc_404o-1");
  test.equal(citation.usc.id, "50_usc_404o-1_a");

  test.done();
}


// "section 89 of title 14"
// http://www.gpo.gov/fdsys/pkg/BILLS-111s3663pcs/xml/BILLS-111s3663pcs.xml

exports.testCasualPattern = function(test) {
  test.expect(10);

  var text = "Nothing in this section shall be considered to limit the authority " +
    "of the Coast Guard to enforce this or any other Federal law " +
    "under section 89 of title 14, United States Code.";

  var found = Citation.find(text);
  test.equal(found.length, 1);

  var citation = found[0];
  test.equal(citation.match, "section 89 of title 14");
  test.equal(citation.usc.title, "14");
  test.equal(citation.usc.section, "89");
  test.deepEqual(citation.usc.subsections, [])
  test.equal(citation.usc.section_id, "14_usc_89");
  test.equal(citation.usc.id, "14_usc_89");

  var foundContext = Citation.find(text, {context: 5});
  test.equal(foundContext.length, 1);

  var citationContext = foundContext[0];
  test.equal(citationContext.match, "section 89 of title 14");
  test.equal(citationContext.context, "nder section 89 of title 14, Uni");

  test.done();
};


// "section 5362(5) of title 31"
// http://www.gpo.gov/fdsys/pkg/BILLS-112hr3261ih/xml/BILLS-112hr3261ih.xml

exports.testCasualWithSubsections = function(test) {
  test.expect(14);

  var text = "(11) INTERNET- The term Internet has the meaning given " +
    "that term in section 5362(5) of title 31, United States Code."

  var found = Citation.find(text);
  test.equal(found.length, 1);

  var citation = found[0];
  test.equal(citation.match, "section 5362(5) of title 31");
  test.equal(citation.usc.title, "31");
  test.equal(citation.usc.section, "5362");
  test.deepEqual(citation.usc.subsections, ["5"])
  test.equal(citation.usc.section_id, "31_usc_5362");
  test.equal(citation.usc.id, "31_usc_5362_5");

  
  // fake example for now
  var text = "(11) INTERNET- The term Internet has the meaning given " +
    "that term in section 5362-10c(5) of title 31, United States Code."

  var found = Citation.find(text);
  test.equal(found.length, 1);

  var citation = found[0];
  test.equal(citation.match, "section 5362-10c(5) of title 31");
  test.equal(citation.usc.title, "31");
  test.equal(citation.usc.section, "5362-10c");
  test.deepEqual(citation.usc.subsections, ["5"])
  test.equal(citation.usc.section_id, "31_usc_5362-10c");
  test.equal(citation.usc.id, "31_usc_5362-10c_5");

  test.done();
};


/*
  This library should also handle strings not necessarily cited in legal documents,
  but search strings users might enter into a search engine.
*/

exports.testIgnoresSectionSymbol = function(test) {
  test.expect(7);

  var text = "  5 USC § 552 "; // spaces left intentionally

  var found = Citation.find(text);
  test.equal(found.length, 1);

  var citation = found[0];
  test.equal(citation.match, "5 USC § 552");
  test.equal(citation.usc.title, "5");
  test.equal(citation.usc.section, "552");
  test.deepEqual(citation.usc.subsections, [])
  test.equal(citation.usc.section_id, "5_usc_552");
  test.equal(citation.usc.id, "5_usc_552");

  test.done();
};