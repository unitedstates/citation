# Citation

A JavaScript library for detecting US Code citations, and other kinds of legal citations, in blocks of text.


### Example Usage

Calling:

	Citation.find("5 USC 522 and also section 434 of title 26")

Returns:

	[{
		match: "5 USC 522",
		type: "usc",
		usc: {
			section: 522,
			title: 5
		}
	}, {
		match: "section 434 of title 26",
		type: "usc",
		usc: {
			section: 434,
			title: 26
		}
	}]


### Current Status

Proof of concept only - under active development.


### HTTP API

A minimal Node.js wrapper over this library can be found at [citation-api](https://github.com/sunlightlabs/citation-api).


### Upcoming

* A test suite!
* Many more US Code citation formats.
* More citation types: US bills, public laws, Code of Federal Regulations.
* A public instance of [citation-api](https://github.com/sunlightlabs/citation-api) for community use.