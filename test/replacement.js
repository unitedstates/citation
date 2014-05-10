/*
  Testing find/replace, under a variety of conditions.
*/

var Citation = require('../citation');
var util = require('util');

// `replace` can be given a callback that can be run to replace
// cites when they're detected.
exports["Replace"] = function(test) {
  var text = "of the Administrative Procedure Act (5 U.S.C. 552) and some";

  var results = Citation.find(text, {
    types: ["usc", "stat"],
    replace: function(cite) {
      return "<a href=\"http://www.law.cornell.edu/uscode/text/" + cite.usc.title + "/" + cite.usc.section + "\">" + cite.match + "</a>";
    }
  });

  var citations = results.citations;
  test.equal(citations.length, 1);
  var citation = citations[0];

  test.equal(citation.match, "5 U.S.C. 552");
  test.equal(citation.usc.title, "5");
  test.equal(citation.usc.section, "552");
  test.deepEqual(citation.usc.subsections, [])
  test.equal(citation.usc.section_id, "usc/5/552");
  test.equal(citation.usc.id, "usc/5/552");

  test.equal(results.text, "of the Administrative Procedure Act (<a href=\"http://www.law.cornell.edu/uscode/text/5/552\">5 U.S.C. 552</a>) and some");

  // when replace is passed, there should be no index field
  test.equal(citation.index, null);

  test.done();
};


// The `replace` option can take an object whose keys are citation types,
// and that callback will be used only for detected cites of that type.
exports["Replace per cite type"] = function(test) {
  var text = "of the Administrative Procedure Act (5 U.S.C. 552) and " +
    "some other stuff from Public Law 111-80 and more";

  var results = Citation.find(text, {
    types: ["usc", "law"],
    replace: {
      usc: function(cite) {
        return "<a href=\"http://www.law.cornell.edu/uscode/text/" + cite.usc.title + "/" + cite.usc.section + "\">" + cite.match + "</a>";
      },
      law: function(cite) {
        return "<a href=\"http://www.govtrack.us/search?q=" + cite.match.replace(/ /g, '%20') + "\">" + cite.match + "</a>";
      }
    }
  });

  var citations = results.citations;
  test.equal(citations.length, 2);

  test.equal(results.text, "of the Administrative Procedure Act " +
    "(<a href=\"http://www.law.cornell.edu/uscode/text/5/552\">5 U.S.C. 552</a>) and " +
    "some other stuff from <a href=\"http://www.govtrack.us/search?q=Public%20Law%20111-80\">Public Law 111-80</a> and more");

  test.done();
};

exports["Replace text doesn't get re-detected"] = function(test) {
  var text = "of the Administrative Procedure Act (5 U.S.C. 552) and some";

  var results = Citation.find(text, {
    types: ["usc"],
    replace: function(cite) {
      return "three cites: 7 U.S.C. 2024 and 5 U.S.C. 552 and also 7 U.S.C. 281";
    }
  });

  var citations = results.citations;
  test.equal(citations.length, 1);
  test.equal(citations[0].match, "5 U.S.C. 552")

  var replaced = "of the Administrative Procedure Act (three cites: 7 U.S.C. 2024 and 5 U.S.C. 552 and also 7 U.S.C. 281) and some"
  test.equal(results.text, replaced);

  test.done();
};

exports["Replace with null values"] = function(test) {
  var text = "of the Administrative Procedure Act (5 U.S.C. 552) and some";

  // explicit or implicit return of null or undefined
  // should default to no replacement (the original match is preserved)
  var nones = [
    function(cite) {return undefined;},
    function(cite) {return null;},
    function(cite) {}
  ];

  nones.forEach(function(func) {
    var results = Citation.find(text, {
      types: ["usc"],
      replace: func
    });

    var citations = results.citations;
    test.equal(citations.length, 1);
    var citation = citations[0];

    test.equal(results.text, text);
  });

  test.done();
};