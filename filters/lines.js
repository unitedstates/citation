(function(def) {
  if (typeof module !== 'undefined') module.exports = def;
  if (typeof Citation !== 'undefined' && Citation.filters) Citation.filters.lines = def;
})({

  // A line-by-line filter.
  //
  // Breaks the text up by line, and feeds each line into the extractor.
  // Attaches the line number (1-indexed) as metadata to each cite,
  // so that any character offsets will be relative to that line.
  //
  // Accepts options:
  //   delimiter: override the default delimiter

  from: function(text, options, extract) {
    var delimiter = (options && options.delimiter) || /[\n\r]+/;
    var lines = text.split(new RegExp(delimiter));
    lines.forEach(function(line, i) {
      extract(line, {line: (i+1)});
    });
  }

});