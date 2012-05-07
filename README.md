Citation
========

A JavaScript library for detecting US Code citations, and other kinds of legal citations, in blocks of text.


Example Usage
=============

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


Current Status
==============

Proof of concept only - under active development.


Upcoming
========

* A test suite!
* Many more US Code citation formats.
* More citation types: US bills, public laws, Code of Federal Regulations.
* A minimal Node.JS API so that it can be used by other languages (and so that we can stand up a public API for community use).