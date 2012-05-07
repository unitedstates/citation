Citation
========

A JavaScript library for detecting US Code citations, and other kinds of legal citations, in blocks of text.

Includes a minimal Node.JS API so that its functionality can be used by other languages.


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