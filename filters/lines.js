module.exports = {

  /*
    Filters receive:
      * text: the entire input text
      * options: any filter-specific options, e.g. delimiter
      * extract: execute this function once with every substring the filter
          breaks the input text into, e.g. each line,
          along with any associated metadata, e.g. the line number.

  */

  // A line-by-line filter.
  //
  // Breaks the text up by line, and feeds each line into the extractor.
  // Attaches the line number (1-indexed) as metadata to each cite,
  // so that any character offsets will be relative to that line.
  //
  // Accepts options:
  //   delimiter: override the default delimiter

  from: function(text, options, extract) {
    // by default, break lines on any combination of \n\r
    var delimiter = (options && options.delimiter) || /[\n\r]+/;

    // split the text into an array of lines
    var lines = text.split(new RegExp(delimiter));

    // for each line, submit it to the extractor along with its line number
    lines.forEach(function(line, i) {
      extract(line, {line: (i+1)});
    });
  }

};
