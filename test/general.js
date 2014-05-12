/*
  Testing general library features.
*/

var Citation = require('../citation');
var util = require('util');

exports["Invalid text input"] = function(test) {

  var invalids = [null, undefined, 1234, true, false, NaN, [], {}, function() {}];
  invalids.forEach(function(invalid) {
    test.equal(null, Citation.find(invalid));
  });

  test.done();
};

exports["Asking for all types"] = function(test) {
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

exports["Asking for a specific type"] = function(test) {
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
