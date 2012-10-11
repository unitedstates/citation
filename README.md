# Citation

A fast, stand-alone legal citation extractor, and other kinds of legal citations, in blocks of text.

Currently supports the US Code, and slip laws. TODO: CFR, US bills, state codes, state bills.


### Use

Via the command line:

```bash
cite "5 U.S.C. 552(a)(1)(E)"
```

Calling from JavaScript directly:

```javascript
Citation.find("5 U.S.C. 552(a)(1)(E)")
```

Or through the included mini-API:

```bash
curl http://localhost:3000/citation/find.json?text=5+U.S.C.+552%28a%29%281%29%28E%29
```

All of which yield:

```json
[{
	"match": "5 U.S.C. 552(a)(1)(E)",
	"type": "usc",
  "index": "0",
	"usc": {
		"title": "5",
		"section": "552",
		"subsections": ["a", "1", "E"]
		"id": "5_usc_552_a_1_E",
		"section_id": "5_usc_552",
		"display": "5 USC 552(a)(1)(E)"
	}
}]
```

(The mini-API actually returns a JavaScript object with a key of `results` whose value is the above array.)

### Excerpts

Passing a "context" option will include an excerpt in the response, with up to that number of characters on either side of each detected citation.

```javascript
Citation.find("that term in section 5362(5) of title 31, United States Code.", {context: 10})
```

Yields:

```json
[{
  match: "section 5362(5) of title 31",
	context: "t term in section 5362(5) of title 31, United S",
  ...
}]
```


### Shell command

The shell command can accept a string to parse as an argument, through STDIN, or from a file. It can output results to STDOUT, or to a file.

```bash
cite "section 5362(5) of title 31"

echo "section 5362(5) of title 31" | cite

cite --input=in-file.txt --output=out-file.json
```

To pretty-print the output:

```bash
cite "section 5362(5) of title 31" --pretty
```

#### Options

* `--input`: Filename to read text from
* `--output`: Filename to output text to
* `--pretty`: prettify (indent) output

### HTTP API

[Install Node.js and NPM](http://nodejs.org/#download) and run `npm install`, then run:

```bash
node api/app.js [port]
```

GET or POST to `/citation/find.json` with a `text` parameter:

```bash    
curl http://localhost:3000/citation/find.json?text=5+U.S.C.+552%28a%29%281%29%28E%29

curl -XPOST "http://localhost:3000/citation/find.json" -d "text=5 U.S.C. 552(a)(1)(E)"
```

Will return the results of running Citation.find() on the block of text, under a `results` key:

```json
{
  results: [
    {
      "match": "5 U.S.C. 552(a)(1)(E)",
      "type": "usc",
      "index": "0",
      "usc": {
        "title": "5",
        "section": "552",
        "subsections": ["a", "1", "E"]
        "id": "5_usc_552_a_1_E",
        "section_id": "5_usc_552",
        "display": "5 USC 552(a)(1)(E)"
      }
    }
  ]
}

#### Options

* `options[context]`: include excerpts with up to this many characters around it.
* `callback`: a function name to use as a JSONP callback.


### About

Originally written by [Eric Mill](http://twitter.com/konklone), at the [Sunlight Foundation](http://sunlightfoundation.com).