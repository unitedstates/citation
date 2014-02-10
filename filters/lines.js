(function(def) {
  if (typeof module !== 'undefined') module.exports = def;
  if (typeof Citation !== 'undefined' && Citation.filters) Citation.filters.lines = def;
})({

  // This function gets fed in whole text, any filter options,
  // and a callback, `extract`.
  // It should execute `extract` with each piece of text,
  // and any associated metadata that should be merged with
  // any cites extracted from that text.
  from: function(text, options, extract) {
    var delimiter = (options && options.delimiter) || /[\n\r]+/;
    var lines = text.split(new RegExp(delimiter));
    lines.forEach(function(line, i) {
      extract(line, {line: (i+1)});
    });
  },

  // take a cite that got extracted from a piece sent in above,
  // do any post-processing on it.
  //
  // metadata will be {line: i} from above, just plop it on
  // then: function(cite, metadata) {
  //   cite.line = metadata.line;
  //   return cite;
  // }

});