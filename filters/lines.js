(function(def) {
  if (typeof module !== 'undefined') module.exports = def;
  if (typeof Citation !== 'undefined' && Citation.filters) Citation.filters.lines = def;
})({

  // This function gets fed in whole text and a callback, `extract`.
  // It should execute `extract` with each piece of text,
  // and any associated metadata that should be merged with
  // any cites extracted from that text.
  from: function(text, extract) {
    var lines = text.split(/[\n\r]+/);
    lines.forEach(function(line, i) {
      extract(line, {line: i});
    });
  }

});