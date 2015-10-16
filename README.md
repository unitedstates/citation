# Citation

[![Build Status](https://travis-ci.org/unitedstates/citation.svg?branch=master)](https://travis-ci.org/unitedstates/citation)

A fast, stand-alone legal citation extractor.

Currently supports:

* `usc`: US Code
* `law`: US Slip Laws (public and private laws)
* `stat`: US Statutes at Large
* `cfr`: US Code of Federal Regulations
* `dc_code`: DC Code
* `dc_register`: DC Register
* `dc_law`: DC Slip Law

With limited, opt-in support for:

* `judicial`: US court opinions, using [walverine](https://github.com/adelevie/walverine) ([more below](#court-opinions))

As you can see, Citation is currently US-only, but we'd love for that to change. There are lots more citation types out there, and it's [easy to contribute](HOWTO.md), so please help us grow!

Compatible in-browser with modern browsers, including IE **9+**.

## Use

Citation can be used:

1. **[In JavaScript](#javascript-api)**, in browser or in Node. This method supports the most options, including passing in JavaScript functions as callbacks.
2. **[Over HTTP](#http-api)**, via GET or POST. Supports JSON and JSONP. Options require function callbacks are *not* supported (it won't eval JavaScript).
3. **[On the command line](#command-line-api)** or Unix pipes, over STDOUT. Options require function callbacks are *not* supported (it won't eval JavaScript).

But one way or another, you pass in text:

```javascript
Citation.find("pursuant to 5 U.S.C. 552(a)(1)(E) and");
```

And you get back data about matched citations:

```javascript
[{
  "match": "5 U.S.C. 552(a)(1)(E)",
  "type": "usc",
  "index": "0",
  "usc": {
    "title": "5",
    "section": "552",
    "subsections": ["a", "1", "E"],
    "id": "usc/5/552/a/1/E",
    "section_id": "usc/5/552"
  }
}]
```

### In the browser

[Check out /browser](/browser) for browser-ready compressed and uncompressed versions of the library.

Loading any of them with a `<script>` tag will result in a global `Citation` object being available for immediate use.

### In Node

[Install Node.js and NPM](http://nodejs.org/#download), then install Citation globally (may require `sudo`):

```bash
npm install -g citation
```

Or install it locally to a `node_modules` directory with `npm install citation`.

## JavaScript API

### `Citation.find(text, options)`

Check a block of `text` for citations of a given type, returning an array of
matches with citations broken out into fields.

`options` can include:

* `types`: (string | string array) Limit citation types to those given. e.g. `["usc", "law"]`
* `excerpt`: (integer) Return an `excerpt` of the surrounding text for each detected cite, with the given number of characters on either side.
* `parents`: (boolean) For any cite, return any "parent" cites alongside it. For example, matching "5 USC 552(b)(3)" would return 3 results - one for the parent section, one for `(b)`, and one for `(b)(3)`.
* `filter`: (string) Enable [Filtering](#filtering).
* `replace`: (function | object) Enable [Replacement](#replacement).
* Also: see [Cite-specific options](#cite-specific-options) to pass in options for a particular citation type.

Some examples:

```javascript
Citation.find("pursuant to 5 U.S.C. 552(a)(1)(E) and");

// Yields:

[{
  "match": "5 U.S.C. 552(a)(1)(E)",
  "type": "usc",
  "index": "0",
  "usc": {
    "title": "5",
    "section": "552",
    "subsections": ["a", "1", "E"],
    "id": "usc/5/552/a/1/E",
    "section_id": "usc/5/552"
  }
}]

Citation.find("that term in section 5362(5) of title 31, United States Code.", {
  excerpt: 10
})

// Yields:

[{
  "match": "section 5362(5) of title 31",
  "excerpt": "t term in section 5362(5) of title 31, United S",
  // ... more details ...
}]
```

## HTTP API

Start the API on a given port (defaults to 3000):

```bash
cite-server [port]
```

GET or POST to `/citation/find` with a `text` parameter:

```bash
curl http://localhost:3000/citation/find?text=5+U.S.C.+552%28a%29%281%29%28E%29

curl -XPOST "http://localhost:3000/citation/find" -d "text=5 U.S.C. 552(a)(1)(E)"
```

Will return the results of running Citation.find() on the block of text, under a `results` key:

```json
{
  "results": [
    {
      "match": "5 U.S.C. 552(a)(1)(E)",
      "type": "usc",
      "index": "0",
      "usc": {
        "title": "5",
        "section": "552",
        "subsections": ["a", "1", "E"],
        "id": "usc/5/552/a/1/E",
        "section_id": "usc/5/552"
      }
    }
  ]
}
```

### Supported options

Some HTTP-specific parameters:

* `callback`: a function name to use as a JSONP callback.
* `pretty`: prettify (indent) output.

And some of the options that the [JavaScript API](#javascript-api) supports:

* `text`: **required**, text to extract citations from.
* `options[excerpt]`: include excerpts with up to this many characters around it.
* `options[types]`: limit citation types to a comma-separated list (e.g. "usc,law")

### Server deployment

See [etc/](etc) for an example upstart script to keep `cite-server` running in production.

## Command line API

The shell command can accept a string to parse as an argument or through STDIN, and outputs results to STDOUT as indented JSON.

```bash
cite "section 5362(5) of title 31"

echo "section 5362(5) of title 31" | cite

cite "pursuant to 5 U.S.C. 552(a)(1)(E) and > results.json"
```

### Options

Pass any options the library takes, using dot operators to pass nested options.

For example, searching among types:

```bash
cite --types=usc,law "section 5362(5) of title 31"
```

Passing nested options:

```bash
cite --dc_code.source=dc_code "and then § 3-101.01 happened"
```

Opt-in to using `walverine` to search judicial cites with `--judicial`:

```bash
cite --judicial "Smith v. Hardibble, 111 Cal.2d 222, 555, 558, 333 Cal.3d 444 (1988)"
```

## Replacement

You can perform a "find-and-replace" with detected citations, by providing a `replace` callback to be executed on each citation, that returns the string to replace that citation.

By passing a `replace` callback, a `text` field will be included at the top of the returned object, with the processed text.

```javascript
Citation.find("click on 5 USC 552 to read more", {
  replace: function(cite) {
    var url = "http://www.law.cornell.edu/uscode/text/" + cite.usc.title + "/" + cite.usc.section;
    return "<a href=\"" + url + "\">" + cite.match + "</a>";
  };
});
```

The response will have a `text` field containing:

```text
click on <a href="http://www.law.cornell.edu/uscode/text/5/552">5 USC 552</a> to read more
```

This feature is only available in the JavaScript API.

## Cite-specific options

You can pass arbitrary options to individual citators, if that citator supports them.

By using a key is the key of a citator, e.g. `usc` or `dc_code`, that citator's processors will get the value of that key passed in as an argument.

### Example: DC Code relative cites

For example, the `dc_code` citator accepts a `source` option, to indicate
what the text source is. If the value of `source` is itself "dc_code",
then the citator will apply a looser pattern to detect internal cites.

That looks like this:

```javascript
Citation.find("required under § 3-101.01(13)(e), the Commission shall perform the", {
  dc_code: {source: "dc_code"}
})
```

That will match `§ 3-101.01(13)(e)`, because the `dc_code` citator assumes it's processing the text of the DC Code itself, and internal references are unambiguous.

## Court opinions

Citation can integrate with [walverine](https://github.com/adelevie/walverine) to detect and return results for US court opinions.

To use walverine, you may need to "opt-in" to including `judicial`-type citations.

In JavaScript:

```javascript
Citation.types.judicial = require("./citations/judicial");
```

In CLI:

```javascript
cite --judicial "Text to scan"
```

The HTTP server, `cite-server` actually loads `judicial` cites by default, since the performance penalty is absorbed on start-up.

#### Unsupported features

walverine's support for extra features is limited. When detecting `judicial`-type cites, there is no support for:

* Returning parent citations
* Replacing detected text
* A character index of detected citations

## Tests

This project is tested with [nodeunit](https://github.com/caolan/nodeunit).

To run tests, you'll need to install this project from source and install its
node dependencies:

```
git clone git@github.com:unitedstates/citation.git
cd citation
npm install
npm test
```

Test cases are stored in the `test` directory. Each test case covers a subsection
of the code and ensures that citations are correctly detected: for instance, see
[test/stat.js](test/stat.js).

To run all tests:

```bash
nodeunit test
```

To run a specific test:

```bash
nodeunit test/usc.js
```

## Public domain

This project is [dedicated to the public domain](LICENSE). As spelled out in [CONTRIBUTING](CONTRIBUTING.md):

> The project is in the public domain within the United States, and copyright and related rights in the work worldwide are waived through the [CC0 1.0 Universal public domain dedication](http://creativecommons.org/publicdomain/zero/1.0/).

> All contributions to this project will be released under the CC0 dedication. By submitting a pull request, you are agreeing to comply with this waiver of copyright interest.
