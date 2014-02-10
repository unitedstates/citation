(function(def) {
  if (typeof module !== 'undefined') module.exports = def;
  if (typeof Citation !== 'undefined' && Citation.filters) Citation.filters.lines = def;
})({

  from: function(text, options, extract) {
    var delimiter = (options && options.delimiter) || /[\n\r]+/;
    var lines = text.split(new RegExp(delimiter));
    lines.forEach(function(line, i) {
      extract(line, {line: (i+1)});
    });
  }

});