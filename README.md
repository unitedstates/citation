# Citation

A JavaScript library for detecting US Code citations, and other kinds of legal citations, in blocks of text.


### Example Usage

Calling:

  Citation.find(
    "(11) INTERNET- The term Internet has the meaning given " +
    "that term in section 5362(5) of title 31, United States Code." +
    "All regulations in effect immediately before " +
    "the enactment of subsection (f) that were promulgated under " +
    "the authority of this section shall be repealed in accordance " +
    "... of the Administrative Procedure Act (5 U.S.C. 552(a)(1)(E)) ..."
  )

Returns:

  [{
    match: "5 U.S.C. 552(a)(1)(E)",
    type: "usc",
    usc: {
      section: "552",
      title: "5",
      subsections: ["a", "1", "E"]
      id: "5_usc_552_a_1_E",
      section_id: "5_usc_552",
      display: "5 USC 552(a)(1)(E)"
    }
  }, {
    match: "section 5362(5) of title 31",
    type: "usc",
    usc: {
      section: "5362",
      title: "31",
      subsections: ["5"],
      id: "31_usc_5362_5",
      section_id: "31_usc_5362",
      display: "31 USC 5362(5)"
    }
  }]


### Current Status

Under active development. Handles sections and subsections, but using simple pattern matching for self-contained citations only.


### HTTP API

A minimal Node.js wrapper over this library can be found at [citation-api](https://github.com/sunlightlabs/citation-api).


### Upcoming

* Many more US Code citation formats.
* More citation types: US bills, public laws, Code of Federal Regulations.
* A public instance of [citation-api](https://github.com/sunlightlabs/citation-api) for community use.