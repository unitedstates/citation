/*
  Tests for extracting Virginia Code citations.
*/

var Citation = require('../citation');


exports["All patterns"] = function(test) {
  var cases = [
    [ 'standard',
      'Va. Code Ann. § 19.2-56.2 (2010)',
      '19.2', '56.2', '2010',
      'va-code/19.2/56.2', 'https://vacode.org/19.2-56.2/'],
    [ 'standard-west',
      'Va. Code Ann. § 19.2-56.2 (West 2010)',
      '19.2', '56.2', '2010',
      'va-code/19.2/56.2', 'https://vacode.org/19.2-56.2/'],
    [ 'no-year-1',
      'Va. Code Ann. § 57-1',
      '57', '1', null,
      'va-code/57/1', 'https://vacode.org/57-1/'],
    [ 'no-year-2',
      'Va. Code Ann. § 57-2.02',
      '57', '2.02', null,
      'va-code/57/2.02', 'https://vacode.org/57-2.02/'],
    [ 'no-year-3',
      'Va. Code Ann. § 63.2-300',
      '63.2', '300', null,
      'va-code/63.2/300', 'https://vacode.org/63.2-300/'],
    [ 'section-with-colon',
      'Va. Code Ann. § 66-25.1:1',
      '66', '25.1:1', null,
      'va-code/66/25.1:1', 'https://vacode.org/66-25.1:1/'],
    [ 'No Annotation',
      "Va. Code § 66-25.1:1",
      "66", "25.1:1", null,
      'va-code/66/25.1:1', 'https://vacode.org/66-25.1:1/'],
    [ 'No Annotation or Period',
      "VA Code § 66-25.1:1",
      "66", "25.1:1", null,
      'va-code/66/25.1:1', 'https://vacode.org/66-25.1:1/'],
    [ 'No space before section number',
      'Va. Code Ann. §19.2-56.2 (2010)',
      '19.2', '56.2', '2010',
      'va-code/19.2/56.2', 'https://vacode.org/19.2-56.2/']
  ];

  for (var i=0; i<cases.length; i++) {
    var details = cases[i];

    var text = details[1];
    var found = Citation.find(text, {types: ["va_code"], links: true}).citations;
    test.equal(found.length, 1);

    if (found.length == 1) {
      var citation = found[0];
      test.equal(citation.type, 'va_code');
      test.equal(citation.type_name, 'Code of Virginia');
      test.equal(citation.match, details[1], details[0]);
      test.equal(citation.va_code.title, details[2]);
      test.equal(citation.va_code.section, details[3]);
      test.equal(citation.va_code.year, details[4]);
      test.equal(citation.va_code.id, details[5]);
      test.equal(citation.va_code.links.vadecoded.landing, details[6]);
    } else
      console.log("No match found in: " + text);
  }

  test.done();
};
