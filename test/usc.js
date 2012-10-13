/*
  Tests for extracting US Code citations from legislation. 
  Each test should be based on a real world circumstance, with a link to it if possible.
*/

var Citation = require('../citation');


exports.testBasicPattern = function(test) {
  test.expect();

  // http://www.gpo.gov/fdsys/pkg/BILLS-112hr3604ih/xml/BILLS-112hr3604ih.xml
  var text = "of the Administrative Procedure Act (5 U.S.C. 552) and some";
    
  var found = Citation.find(text);
  test.equal(found.length, 1);

  var citation = found[0];
  test.equal(citation.match, "5 U.S.C. 552");
  test.equal(citation.usc.title, "5");
  test.equal(citation.usc.section, "552");
  test.deepEqual(citation.usc.subsections, [])
  test.equal(citation.usc.section_id, "5_usc_552");
  test.equal(citation.usc.id, "5_usc_552");

  var foundExcerpt = Citation.find(text, {excerpt: 5});
  test.equal(foundExcerpt.length, 1);

  var citationExcerpt = foundExcerpt[0];
  test.equal(citationExcerpt.match, "5 U.S.C. 552");
  test.equal(citationExcerpt.excerpt, "Act (5 U.S.C. 552) and")

  // test excerpt where no excerpt is necessary
  text = "5 usc 552";
  foundSmall = Citation.find(text, {excerpt: 5});
  test.equal(foundSmall.length, 1);
  test.equal(foundSmall[0].match, "5 usc 552")
  test.equal(foundSmall[0].excerpt, "5 usc 552")
  test.equal(foundSmall[0].index, 0)

  test.done();
};

exports.testNearby = function(test) {
  test.expect(4);

  var text = "[E] Section 824(g) is codified at 22 U.S.C. § 4064(g) See also U.S.AID " +
    "waiver authority under 22 U.S.C. § 23850 to waive the offset " +
    "requirement under 5 U.S.C. §§ 8344 and 8468 in order to facilitate " +
    "assignment of persons to Iraq, Pakistan, and Afghanistan.";

  var found = Citation.find(text, {excerpt: 250});
  test.equal(found.length, 3); // will increase to 4 someday! (8468!!)

  test.equal(found[0].match, "22 U.S.C. § 4064(g)");
  test.equal(found[1].match, "22 U.S.C. § 23850");
  test.equal(found[2].match, "5 U.S.C. §§ 8344")

  test.done();
}

exports.testExcerpt = function(test) {
  // http://www.gpo.gov/fdsys/pkg/BILLS-112hr2045ih/html/BILLS-112hr2045ih.htm
  var tests = [
    ["21 U.S.C. 321(ff)(1)", 
      "(B) the term `dietary ingredient' means an " +
                "ingredient listed in subparagraphs (A) through (F) of " +
                "section 201(ff)(1) (21 U.S.C. 321(ff)(1)) of the " +
                "Federal Food, Drug, and Cosmetic Act that is included " +
                "in, or that is intended to be included in, a dietary " +
                "supplement."],
    ["21 U.S.C. 321(ff)(1)", 
      "dient listed in subparagraphs (A) through (F) of " +
                "section 201(ff)(1) (21 U.S.C. 321(ff)(1)) of the " +
                "Federal Food, Drug, and Cosmetic Act that is included " +
                "in, or that is intended to be include"],
    ["21 U.S.C. 321",
      "(B) the term `dietary ingredient' means an " +
                "ingredient listed in subparagraphs (A) through (F) of " +
                "section 201(ff)(1) (21 U.S.C. 321) of the " +
                "Federal Food, Drug, and Cosmetic Act that is included " +
                "in, or that is intended to be included in, a dietary " +
                "supplement."]
  ];

  var excerpts = [0, 1, 5, 10, 15, 20, 25, 30, 35, 50, 75, 90, 100, 125, 150];

  test.expect(2 * tests.length * excerpts.length);

  // try out a ton of different excerpt sizes, on both strings
  _.each(excerpts, function(excerpt) {
    _.each(tests, function(items) {
      var match = items[0];
      var text = items[1];
      
      var found = Citation.find(text, {excerpt: excerpt});
      test.equal(found.length, 1);
      var citation = found[0];
      test.equal(citation.match, match);
    });
  });

  test.done();
};


exports.testBasicWithSubsections = function(test) {
  test.expect(7);

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

  test.done();
}

// this is the worst kind of hyphen, a valid section entry with a number on either end
// for what produces this, see:
// http://www.law.cornell.edu/uscode/text/50/chapter-15/subchapter-I
exports.testSectionWithHyphen = function(test) {
  test.expect();

  // http://www.gpo.gov/fdsys/pkg/BILLS-111s3611es/xml/BILLS-111s3611es.xml
  var text = "National Counter Proliferation Center.--Section 119A(a) of the " +
    "National Security Act of 1947 (50 U.S.C. 404o-1(a)) is amended--";

  var found = Citation.find(text);
  test.equal(found.length, 3);

  if (found.length == 3) {
    var citation = found[0];
    test.equal(citation.match, "50 U.S.C. 404o-1(a)");
    test.equal(citation.usc.title, "50");
    test.equal(citation.usc.section, "404o-1");
    test.deepEqual(citation.usc.subsections, ["a"])
    test.equal(citation.usc.section_id, "50_usc_404o-1");
    test.equal(citation.usc.id, "50_usc_404o-1_a");

    // even though these are wrong: for now, they are found
    citation = found[1];
    test.equal(citation.match, "50 U.S.C. 404o-1(a)");
    test.equal(citation.usc.title, "50");
    test.equal(citation.usc.section, "404o");
    test.deepEqual(citation.usc.subsections, [])
    test.equal(citation.usc.section_id, "50_usc_404o");
    test.equal(citation.usc.id, "50_usc_404o");

    citation = found[2];
    test.equal(citation.match, "50 U.S.C. 404o-1(a)");
    test.equal(citation.usc.title, "50");
    test.equal(citation.usc.section, "1");
    test.deepEqual(citation.usc.subsections, ["a"])
    test.equal(citation.usc.section_id, "50_usc_1");
    test.equal(citation.usc.id, "50_usc_1_a");
  }

  test.done();
};


// FOR NOW:
// Range expansion just finds the first and last.
// When the range does not have double section symbols, treat it as ambiguous,
// and return it as both an original section, and as an expanded range.
exports.testRange = function(test) {
  test.expect();

  // http://www.gpo.gov/fdsys/pkg/BILLS-112hr5972pcs/xml/BILLS-112hr5972pcs.xml
  var text = "convicted of violating the Buy American Act (41 U.S.C. 10a-10c).";

  var found = Citation.find(text);
  test.equal(found.length, 3);

  if (found.length == 3) {
    var citation = found[0];
    test.equal(citation.match, "41 U.S.C. 10a-10c");
    test.equal(citation.usc.title, "41");
    test.equal(citation.usc.section, "10a-10c");
    test.deepEqual(citation.usc.subsections, [])
    test.equal(citation.usc.section_id, "41_usc_10a-10c");
    test.equal(citation.usc.id, "41_usc_10a-10c");

    citation = found[1];
    test.equal(citation.match, "41 U.S.C. 10a-10c");
    test.equal(citation.usc.title, "41");
    test.equal(citation.usc.section, "10a");
    test.deepEqual(citation.usc.subsections, [])
    test.equal(citation.usc.section_id, "41_usc_10a");
    test.equal(citation.usc.id, "41_usc_10a");

    citation = found[2];
    test.equal(citation.match, "41 U.S.C. 10a-10c");
    test.equal(citation.usc.title, "41");
    test.equal(citation.usc.section, "10c");
    test.deepEqual(citation.usc.subsections, [])
    test.equal(citation.usc.section_id, "41_usc_10c");
    test.equal(citation.usc.id, "41_usc_10c");
  }

  // modified version of
  // http://www.gpo.gov/fdsys/pkg/BILLS-112hr5972pcs/xml/BILLS-112hr5972pcs.xml
  var text = "convicted of violating the Buy American Act (41 U.S.C. 10a(1)-10c(2)).";

  // ranges where there's a subsection on the left of a dash are non-ambiguous
  var found = Citation.find(text);
  test.equal(found.length, 2);

  if (found.length == 2) {
    citation = found[0];
    test.equal(citation.match, "41 U.S.C. 10a(1)-10c(2)");
    test.equal(citation.usc.title, "41");
    test.equal(citation.usc.section, "10a");
    test.deepEqual(citation.usc.subsections, ["1"])
    test.equal(citation.usc.section_id, "41_usc_10a");
    test.equal(citation.usc.id, "41_usc_10a_1");

    citation = found[1];
    test.equal(citation.match, "41 U.S.C. 10a(1)-10c(2)");
    test.equal(citation.usc.title, "41");
    test.equal(citation.usc.section, "10c");
    test.deepEqual(citation.usc.subsections, ["2"])
    test.equal(citation.usc.section_id, "41_usc_10c");
    test.equal(citation.usc.id, "41_usc_10c_2");
  }

  test.done();
};


// // explicit ranges (with §§) interpret ranges unambiguously
// exports.testRangeExplicit = function(test) {
//   test.expect();

//   // modified version of:
//   // http://www.gpo.gov/fdsys/pkg/BILLS-112hr5972pcs/xml/BILLS-112hr5972pcs.xml
//   var text = "convicted of violating the Buy American Act (41 U.S.C. §§ 10a-10c).";

//   var found = Citation.find(text);
//   test.equal(found.length, 2);

//   if (found.length == 2) {
//     var citation = found[0];
//     test.equal(citation.match, "41 U.S.C. §§ 10a-10c");
//     test.equal(citation.usc.title, "41");
//     test.equal(citation.usc.section, "10a");
//     test.deepEqual(citation.usc.subsections, [])
//     test.equal(citation.usc.section_id, "41_usc_10a");
//     test.equal(citation.usc.id, "41_usc_10a");

//     citation = found[1];
//     test.equal(citation.match, "41 U.S.C. §§ 10a-10c");
//     test.equal(citation.usc.title, "41");
//     test.equal(citation.usc.section, "10c");
//     test.deepEqual(citation.usc.subsections, [])
//     test.equal(citation.usc.section_id, "41_usc_10c");
//     test.equal(citation.usc.id, "41_usc_10c");
//   }

//   test.done();
// };

// todo: range with subsections on either side


// "section 89 of title 14"
// http://www.gpo.gov/fdsys/pkg/BILLS-111s3663pcs/xml/BILLS-111s3663pcs.xml

exports.testCasualPattern = function(test) {
  test.expect(17);

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

  var foundExcerpt = Citation.find(text, {excerpt: 5});
  test.equal(foundExcerpt.length, 1);

  var citationExcerpt = foundExcerpt[0];
  test.equal(citationExcerpt.match, "section 89 of title 14");
  test.equal(citationExcerpt.excerpt, "nder section 89 of title 14, Uni");

  // comma version
  text = "under section 89, title 14, United States Code.";

  var found = Citation.find(text);
  test.equal(found.length, 1);

  var citation = found[0];
  test.equal(citation.match, "section 89, title 14");
  test.equal(citation.usc.title, "14");
  test.equal(citation.usc.section, "89");
  test.deepEqual(citation.usc.subsections, [])
  test.equal(citation.usc.section_id, "14_usc_89");
  test.equal(citation.usc.id, "14_usc_89");

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

exports.testAppendix = function(test) {
  test.expect(7);

  // http://www.gpo.gov/fdsys/pkg/BILLS-112s3608is/xml/BILLS-112s3608is.xml
  var text = "Civil Relief Act (50 U.S.C. App. 595) is amended"

  var found = Citation.find(text);
  test.equal(found.length, 1);

  var citation = found[0];
  test.equal(citation.match, "50 U.S.C. App. 595");
  test.equal(citation.usc.title, "50-app");
  test.equal(citation.usc.section, "595");
  test.deepEqual(citation.usc.subsections, [])
  test.equal(citation.usc.section_id, "50-app_usc_595");
  test.equal(citation.usc.id, "50-app_usc_595");

  test.done();
};

exports.testNote = function(test) {
  test.expect(7);

  // http://www.gpo.gov/fdsys/pkg/BILLS-112hr6567ih/xml/BILLS-112hr6567ih.xml
  var text = "commodity supplemental food program) (7 U.S.C. 612c note).";

  var found = Citation.find(text);
  test.equal(found.length, 1);

  var citation = found[0];
  test.equal(citation.match, "7 U.S.C. 612c note");
  test.equal(citation.usc.title, "7");
  test.equal(citation.usc.section, "612c");
  test.deepEqual(citation.usc.subsections, ["note"])
  test.equal(citation.usc.section_id, "7_usc_612c");
  test.equal(citation.usc.id, "7_usc_612c_note");

  test.done();
}

// for now, no chapters
exports.testChapters = function(test) {
  test.expect();

  var text = "46 U.S.C. Chapters 701, 3306, 3703";

  var found = Citation.find(text);
  test.equal(found.length, 0);

  if (found.length > 0)
    console.log(found);

  test.done();
}