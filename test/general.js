/*
  Testing general library features.
*/

var Citation = require('../citation');
var _ = require('underscore');
var util = require('util');


exports.testAllTypes = function(test) {
  test.expect();
  var text, results;

  var types = ["usc", "law", "cfr"];

  // base case (all) works for nothing, and for empty arrays]
  [null, {types: null}, {types: []}].forEach(function(options) {
    text = "" +
      "and 5 U.S.C. 552 " +
      "and Public Law 112-34 " +
      "and 10 CFR 15.6 ";
    results = Citation.find(text, options).citations;

    test.equal(types.length, results.length);
    types.forEach(function(type, i) {
      test.equal(type, results[i].type);  
    });
  });

  test.done();
};

exports.testTypes = function(test) {
  test.expect();
  var text, results;

  // limit results by a string or an array, ignoring invalid results
  [
    {types: "law"}, 
    {types: ["law"]}
  ].forEach(function(options) {
    text = "both 5 U.S.C. 552 and Public Law 112-34 are";
    results = Citation.find(text, options).citations;

    test.equal(1, results.length, "Using options: " + util.inspect(options));
    test.equal("law", results[0].type, "Using options: " + util.inspect(options));
  });

  // if the array is all invalid results, nothing is found
  [
    {types: "nonsense"}, 
    {types: ["nonsense"]}, 
    {types: ["nonsense", "poppycock"]}
  ].forEach(function(options) {
    text = "both 5 U.S.C. 552 and Public Law 112-34 are";
    test.equal(null, Citation.find(text, options));
  });

  test.done();
};


// testing the replacement function, oh boy
// exports.testReplacement = function(test) {
//   test.expect();

//   var text = "of the Administrative Procedure Act (5 U.S.C. 552) and some";

//   var results = Citation.find(text, {
//     types: ["usc"],
//     replace: function(cite) {
//       return "<a href=\"http://www.law.cornell.edu/uscode/text/" + cite.usc.title + "/" + cite.usc.section + "\">" + cite.match + "</a>";
//     }
//   }).citations;

//   var citations = results.citations;
//   test.equal(citations.length, 1);
//   var citation = citations[0];

//   test.equal(citation.match, "5 U.S.C. 552");
//   test.equal(citation.usc.title, "5");
//   test.equal(citation.usc.section, "552");
//   test.deepEqual(citation.usc.subsections, [])
//   test.equal(citation.usc.section_id, "usc/5/552");
//   test.equal(citation.usc.id, "usc/5/552");

//   test.equal(results.text, "of the Administrative Procedure Act (<a href=\"http://www.law.cornell.edu/uscode/text/5/552\">5 U.S.C. 552</a>) and some");

//   // when replace is passed, there should be no index field
//   test.equal(citation.index, null);

//   test.done();
// };