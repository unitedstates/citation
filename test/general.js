/*
  Testing general library features.
*/

var Citation = require('../citation');
var _ = require('underscore');
var util = require('util');


// exports.testAllTypes = function(test) {
//   test.expect();
//   var text, results;

//   var types = _.keys(Citation.types);

//   // base case (all) works for nothing, and for empty arrays]
//   [null, {types: null}, {types: []}].forEach(function(options) {
//     text = "" +
//       "and 5 U.S.C. 552 " +
//       "and Public Law 112-34 " +
//       "and 10 CFR 15.6 ";
//     results = Citation.find(text, options);

//     test.equal(types.length, results.length);
//     types.forEach(function(type, i) {
//       test.equal(type, results[i].type);  
//     });
//   });

//   test.done();
// };

exports.testTypes = function(test) {
  test.expect();
  var text, results;

  // limit results by a string or an array, ignoring invalid results
  [
    {types: "law"}, 
    {types: ["law"]}
  ].forEach(function(options) {
    text = "both 5 U.S.C. 552 and Public Law 112-34 are";
    results = Citation.find(text, options);

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
    results = Citation.find(text, options);

    test.equal(0, results.length);
  });

  test.done();
};


// testing the replacement function, oh boy
exports.testReplacement = function(test) {
  test.expect();

  

  test.done();
}