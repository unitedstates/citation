Citation
========

A JavaScript library for detecting US Code citations, and other kinds of legal citations, in blocks of text.

Includes a minimal Node.JS API so that its functionality can be used by other languages.


Example Usage
=============

	Citation.find("5 USC 522")
	Citation.find("5 USC 522", "usc")
	Citation.find("5 USC 522 and also section 434 of title 26")

Citation will return an object for every match it finds, with the matching text, the type of citation, and the citation itself broken out into type-specific fields.


Current Status
==============

Proof of concept only - under active development.