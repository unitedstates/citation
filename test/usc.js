/*
  Tests for extracting US Code citations.
  Each test should link to a real world circumstance where possible.
*/

var Citation = require('../citation');


exports["Basic pattern"] = function(test) {
  // http://www.gpo.gov/fdsys/pkg/BILLS-112hr3604ih/xml/BILLS-112hr3604ih.xml
  var text = "of the Administrative Procedure Act (5 U.S.C. 552) and some";

  var found = Citation.find(text, {types: "usc"}).citations;
  test.equal(found.length, 1);

  var citation = found[0];
  test.equal(citation.match, "5 U.S.C. 552");
  test.equal(citation.index, 37);
  test.equal(citation.usc.title, "5");
  test.equal(citation.usc.section, "552");
  test.deepEqual(citation.usc.subsections, [])
  test.equal(citation.usc.id, "usc/5/552");

  var foundExcerpt = Citation.find(text, {types: "usc", excerpt: 5}).citations;
  test.equal(foundExcerpt.length, 1);

  var citationExcerpt = foundExcerpt[0];
  test.equal(citationExcerpt.match, "5 U.S.C. 552");
  test.equal(citationExcerpt.excerpt, "Act (5 U.S.C. 552) and")

  // test excerpt where no excerpt is necessary
  text = "5 usc 552";
  foundSmall = Citation.find(text, {types: "usc", excerpt: 5}).citations;
  test.equal(foundSmall.length, 1);
  test.equal(foundSmall[0].match, "5 usc 552")
  test.equal(foundSmall[0].excerpt, "5 usc 552")
  test.equal(foundSmall[0].index, 0)

  test.done();
};

exports["Multiple nearby cites"] = function(test) {
  var text = "[E] Section 824(g) is codified at 22 U.S.C. § 4064(g) See also U.S.AID " +
    "waiver authority under 22 U.S.C. § 23850 to waive the offset " +
    "requirement under 5 U.S.C. §§ 8344 and 8468 in order to facilitate " +
    "assignment of persons to Iraq, Pakistan, and Afghanistan.";

  var found = Citation.find(text, {types: "usc", excerpt: 250}).citations;
  test.equal(found.length, 3); // will increase to 4 someday! (8468!!)

  test.equal(found[0].match, "22 U.S.C. § 4064(g)");
  test.equal(found[1].match, "22 U.S.C. § 23850");
  test.equal(found[2].match, "5 U.S.C. §§ 8344")

  test.done();
};


exports["Basic subsection parsing"] = function(test) {
  // http://www.gpo.gov/fdsys/pkg/BILLS-112hr3604ih/xml/BILLS-112hr3604ih.xml
  var text = "All regulations in effect immediately before " +
    "the enactment of subsection (f) that were promulgated under " +
    "the authority of this section shall be repealed in accordance " +
    "... of the Administrative Procedure Act (5 U.S.C. 552(a)(1)(E)) ...";

  var found = Citation.find(text, {types: "usc"}).citations;
  test.equal(found.length, 1);

  var citation = found[0];
  test.equal(citation.match, "5 U.S.C. 552(a)(1)(E)");
  test.equal(citation.usc.title, "5");
  test.equal(citation.usc.section, "552");
  test.deepEqual(citation.usc.subsections, ["a", "1", "E"])
  test.equal(citation.usc.id, "usc/5/552/a/1/E");

  test.done();
}


exports["Casual pattern"] = function(test) {
  // http://www.gpo.gov/fdsys/pkg/BILLS-111s3663pcs/xml/BILLS-111s3663pcs.xml
  var text = "Nothing in this section shall be considered to limit the authority " +
    "of the Coast Guard to enforce this or any other Federal law " +
    "under section 89 of title 14, United States Code.";

  var found = Citation.find(text, {types: "usc"}).citations;
  test.equal(found.length, 1);

  var citation = found[0];
  test.equal(citation.match, "section 89 of title 14");
  test.equal(citation.usc.title, "14");
  test.equal(citation.usc.section, "89");
  test.deepEqual(citation.usc.subsections, [])
  test.equal(citation.usc.id, "usc/14/89");

  var foundExcerpt = Citation.find(text, {types: "usc", excerpt: 5}).citations;
  test.equal(foundExcerpt.length, 1);

  var citationExcerpt = foundExcerpt[0];
  test.equal(citationExcerpt.match, "section 89 of title 14");
  test.equal(citationExcerpt.excerpt, "nder section 89 of title 14, Uni");

  // comma version
  text = "under section 89, title 14, United States Code.";

  var found = Citation.find(text, {types: "usc"}).citations;
  test.equal(found.length, 1);

  var citation = found[0];
  test.equal(citation.match, "section 89, title 14");
  test.equal(citation.usc.title, "14");
  test.equal(citation.usc.section, "89");
  test.deepEqual(citation.usc.subsections, [])
  test.equal(citation.usc.id, "usc/14/89");

  test.done();
};


exports["Casual pattern (with subsections)"] = function(test) {
  // http://www.gpo.gov/fdsys/pkg/BILLS-112hr3261ih/xml/BILLS-112hr3261ih.xml
  var text = "(11) INTERNET- The term Internet has the meaning given " +
    "that term in section 5362(5) of title 31, United States Code."

  var found = Citation.find(text, {types: "usc"}).citations;
  test.equal(found.length, 1);

  var citation = found[0];
  test.equal(citation.match, "section 5362(5) of title 31");
  test.equal(citation.usc.title, "31");
  test.equal(citation.usc.section, "5362");
  test.deepEqual(citation.usc.subsections, ["5"])
  test.equal(citation.usc.id, "usc/31/5362/5");


  // fake example for now
  var text = "(11) INTERNET- The term Internet has the meaning given " +
    "that term in section 5362-10c(5) of title 31, United States Code."

  var found = Citation.find(text, {types: "usc"}).citations;
  test.equal(found.length, 1);

  var citation = found[0];
  test.equal(citation.match, "section 5362-10c(5) of title 31");
  test.equal(citation.usc.title, "31");
  test.equal(citation.usc.section, "5362-10c");
  test.deepEqual(citation.usc.subsections, ["5"])
  test.equal(citation.usc.id, "usc/31/5362-10c/5");

  test.done();
};


/*
  This library should also handle strings not necessarily cited in legal documents,
  but search strings users might enter into a search engine.
*/

exports["Section symbol is ignored"] = function(test) {
  var text = "  5 USC § 552 "; // spaces left intentionally

  var found = Citation.find(text, {types: "usc"}).citations;
  test.equal(found.length, 1);

  var citation = found[0];
  test.equal(citation.match, "5 USC § 552");
  test.equal(citation.usc.title, "5");
  test.equal(citation.usc.section, "552");
  test.deepEqual(citation.usc.subsections, [])
  test.equal(citation.usc.id, "usc/5/552");

  test.done();
};

exports["'Appendix' titles"] = function(test) {
  // http://www.gpo.gov/fdsys/pkg/BILLS-112s3608is/xml/BILLS-112s3608is.xml
  var text = "Civil Relief Act (50 U.S.C. App. 595) is amended"

  var found = Citation.find(text, {types: "usc"}).citations;
  test.equal(found.length, 1);

  var citation = found[0];
  test.equal(citation.match, "50 U.S.C. App. 595");
  test.equal(citation.usc.title, "50-app");
  test.equal(citation.usc.section, "595");
  test.deepEqual(citation.usc.subsections, [])
  test.equal(citation.usc.id, "usc/50-app/595");

  test.done();
};

exports["'note' marks"] = function(test) {
  // http://www.gpo.gov/fdsys/pkg/BILLS-112hr6567ih/xml/BILLS-112hr6567ih.xml
  var text = "commodity supplemental food program) (7 U.S.C. 612c note).";

  var found = Citation.find(text, {types: "usc"}).citations;
  test.equal(found.length, 1);

  var citation = found[0];
  test.equal(citation.match, "7 U.S.C. 612c note");
  test.equal(citation.usc.title, "7");
  test.equal(citation.usc.section, "612c");
  test.deepEqual(citation.usc.subsections, ["note"])
  test.equal(citation.usc.id, "usc/7/612c/note");

  test.done();
}


exports["'et seq' marks"] = function(test) {
  // from http://www.gpo.gov/fdsys/pkg/BILLS-113s1302rs/html/BILLS-113s1302rs.htm
  var text = "the Employee Retirement Income Security Act of 1974 (29 U.S.C. 1081 et seq.)";

  var found = Citation.find(text, {types: "usc"}).citations;
  test.equal(found.length, 1);

  var citation = found[0];
  test.equal(citation.match, "29 U.S.C. 1081 et seq");
  test.equal(citation.usc.title, "29");
  test.equal(citation.usc.section, "1081");
  test.deepEqual(citation.usc.subsections, ["et-seq"])
  test.equal(citation.usc.id, "usc/29/1081/et-seq");

  test.done();
}

// for now, no chapters
exports["Chapters (unsupported)"] = function(test) {
  var text = "46 U.S.C. Chapters 701, 3306, 3703";

  var found = Citation.find(text, {types: "usc"}).citations;
  test.equal(found.length, 0);

  if (found.length > 0)
    console.log(found);

  test.done();
}

// can opt-in to asking for all parents of a subsection to be returned too
exports["Parent detection"] = function(test) {
  var text, found, citation;

  text = "31 USC 5318A(a)(1)(A)";

  found = Citation.find(text, {types: "usc", parents: false}).citations;
  test.equal(found.length, 1);
  test.equal(found[0].usc.id, "usc/31/5318A/a/1/A");

  found = Citation.find(text, {types: "usc", parents: true}).citations;
  test.equal(found.length, 4);

  if (found.length == 4) {
    test.equal(found[0].usc.id, "usc/31/5318A/a/1/A");
    test.equal(found[1].usc.id, "usc/31/5318A/a/1");
    test.equal(found[2].usc.id, "usc/31/5318A/a");
    test.equal(found[3].usc.id, "usc/31/5318A");
  } else
    console.log(found);

  test.done();
}

// Ranges:
// Some ranges are unambiguous.
//  * a parenthesis appears on the left side of a hyphen.
//  * the double section symbol (§§) indicates a range.
//
// Sadly, some ranges are ambiguous. The goal here is to support either
// `generous` or `strict` resolution of ambiguous ranges.

exports["Ranges: ambiguous, generous 1"] = function(test) {
  var text, found;

  // this is the worst kind of hyphen, a valid section entry with a
  // number on either end. for what produces this, see:
  // http://www.law.cornell.edu/uscode/text/50/chapter-15/subchapter-I
  // http://www.gpo.gov/fdsys/pkg/BILLS-111s3611es/xml/BILLS-111s3611es.xml
  text = "National Counter Proliferation Center.--Section 119A(a) of the " +
    "National Security Act of 1947 (50 U.S.C. 404o-1(a)) is amended--";

  found = Citation.find(text, {types: "usc"}).citations;
  test.equal(found.length, 3);

  test.equal(found[0].usc.id, "usc/50/404o-1/a");
  test.equal(found[1].usc.id, "usc/50/404o");
  test.equal(found[2].usc.id, "usc/50/1/a");

  test.done();
};


exports["Ranges: ambiguous, generous 2"] = function(test) {
  var text, found;

  // http://www.gpo.gov/fdsys/pkg/BILLS-112hr5972pcs/xml/BILLS-112hr5972pcs.xml
  text = "convicted of violating the Buy American Act (41 U.S.C. 10a-10c).";

  found = Citation.find(text, {types: "usc"}).citations;
  test.equal(found.length, 3);

  if (found.length == 3) {
    test.equal(found[0].usc.id, "usc/41/10a-10c");
    test.equal(found[1].usc.id, "usc/41/10a");
    test.equal(found[2].usc.id, "usc/41/10c");
  } else
    console.log(found);

  test.done();
};

exports["Ranges: unambiguous, ()"] = function(test) {
  var text, found;

  // modified version of
  // http://www.gpo.gov/fdsys/pkg/BILLS-112hr5972pcs/xml/BILLS-112hr5972pcs.xml
  text = "convicted of violating the Buy American Act (41 U.S.C. 10a(1)-10c(2)).";

  // ranges where there's a subsection on the left of a dash are non-ambiguous
  found = Citation.find(text, {types: "usc"}).citations;
  test.equal(found.length, 2);

  if (found.length == 2) {
    test.equal(found[0].usc.id, "usc/41/10a/1");
    test.equal(found[1].usc.id, "usc/41/10c/2");
  } else
    console.log(found);

  test.done();
}

// explicit ranges (with §§) interpret ranges unambiguously
exports["Ranges: unambiguous, §§ 1"] = function(test) {
  // modified version of:
  // http://www.gpo.gov/fdsys/pkg/BILLS-112hr5972pcs/xml/BILLS-112hr5972pcs.xml
  var text = "convicted of violating the Buy American Act (41 U.S.C. §§ 10a-10c).";

  var found = Citation.find(text, {types: "usc"}).citations;
  test.equal(found.length, 2);

  if (found.length == 2) {
    test.equal(found[0].usc.id, "usc/41/10a");
    test.equal(found[1].usc.id, "usc/41/10c");
  }

  test.done();
};

exports["Ranges: unambiguous, §§ 2"] = function(test) {
  var text, found;
  // GAO-591433, gao_id: 591433
  text = "50 U.S.C. App. §§ 451--473";

  found = Citation.find(text, {types: "usc"}).citations;
  test.equal(found.length, 2);

  if (found.length == 2) {
    test.equal(found[0].usc.id, "usc/50-app/451");
    test.equal(found[1].usc.id, "usc/50-app/473");
  } else
    console.log(found);

  test.done();
};


exports["Ranges: basic subsections"] = function(test) {
  var text, found, citation;

  // regulation 2012-12747
  text = "31 U.S.C. 5318A(b)(l)-(5)";

  found = Citation.find(text, {types: "usc"}).citations;
  test.equal(found.length, 1);

  if (found.length == 1) {
    var citation = found[0];
    test.equal(citation.match, "31 U.S.C. 5318A(b)(l)");
    test.equal(citation.usc.title, "31");
    test.equal(citation.usc.section, "5318A");
    test.deepEqual(citation.usc.subsections, ["b", "l"])
    test.equal(citation.usc.id, "usc/31/5318A/b/l");
  } else
    console.log(found);

  // the worst part of this isn't the ambiguous range...
  //
  // e.g. (b)(l) - (b)(5) vs. (b)(l) - (5)
  //
  // ...but is the fact that there is no (b)(l). This is
  // almost certainly meant to be (b)(1).
  //
  // As evidence - elsewhere, in the same regulation:
  //
  // "...the first special measure (31 U.S.C. 5318A(b)(1))
  // and the fifth special measure (31 U.S.C. 5318A(b)(5)..."
  //
  // This is an example of a bug only fixable with an actual
  // US Code to lookup against. Because the US Code never seems
  // to mix up letters and numbers in the same level of a
  // subhierarchy, it should be possible to always correctly resolve
  // (l) to (1) if the USC can be referred to.

  // So, right now we're just testing to make sure it only
  // catches the front.



  test.done();
};
