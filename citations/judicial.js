if (typeof(require) !== "undefined")
  walverine = require("walverine");

(function(def) {
    if (typeof module !== 'undefined') module.exports = def;
    if (typeof Citation !== 'undefined' && Citation.types) Citation.types.judicial = def;
})({
  type: "external",

  extract: function(text) {
    return underscore.map(walverine.get_citations(text), function(cite) {
      var result = {};
      result.match = cite.match;
      result.judicial = underscore.omit(cite, "match");
      return result;
    });
  }
});