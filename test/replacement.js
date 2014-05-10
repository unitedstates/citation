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
    test.equal(1, citations.length);
    test.equal(text, results.text);
  });

  test.done();
};

// You can have all parent cites returned at detect-time, using the
// individual citator's idea of what parenthood is.
//
// Replacement needs to replace the matched text with a single piece
// of text made from one detected cite. So, it should use the child cite
// as the one to pass to the replacement function, and replace the given
// text with it.
exports["Replacement while including parent cites"] = function(test) {
  var text, found, citation;

  text = "31 USC 5318A(a)(1)(A)";

  var results = Citation.find(text, {
    types: "usc", parents: true,
    replace: function(cite) {
      return "{found}";
    }
  });
  var found = results.citations;

  test.equal(found.length, 4);

  test.equal(found[0].usc.id, "usc/31/5318A/a/1/A");
  test.equal(found[1].usc.id, "usc/31/5318A/a/1");
  test.equal(found[2].usc.id, "usc/31/5318A/a");
  test.equal(found[3].usc.id, "usc/31/5318A");

  test.equal("{found}", results.text);

  test.done();
}

// Filters don't support the replace option. To do so, the filter
// would have to know how to take the pieces it breaks the text,
// and re-assemble it after running the replace callback on each
// piece. That's a) complicated, but b) you'd lose the `index`
// field anyway (as you do when using `replace` even without filters),
// and why are you using a line-by-line filter if you don't care about
// the relative character index?
//
// If you need to do advanced, filtered cite detection that gives you
// precise detection of cites, you'll need to do your own replacement.

/*
exports["Replacement with a filter"] = function(test) {

  var text = "the Administrative Procedure Act\n" +
    "(or 5 U.S.C. 552)\n" +
    "is here";

  var replaced = "the Administrative Procedure Act\n" +
    "(or {found})\n" +
    "is here";

  var results = Citation.find(text, {
    filter: "lines",
    replace: function(cite) {
      return "{found}";
    }
  });

  test.equal(1, results.citations.length);
  var citation = results.citations[0];
  test.equal("5 U.S.C. 552", citation.match);
  test.equal(undefined, citation.index);
  test.equal(2, citation.line);
  test.equal(results.text, replaced);

  test.done();
};
*/

