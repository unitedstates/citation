## API

### `Citation.find(text, options)`

Check a block of text for citations of a given type, returning an array of
matches with citations broken out into fields.

* `text`: the content as a string
* `options`: an object of options

Passing an `excerpt` option will include an excerpt in the
response, with up to that number of characters on either side of
each detected citation.

* `pretty`: Prettify (indent) output
* `types`: Limit citation types to a comma-separated list (e.g. "usc,law")

```javascript
Citation.find("pursuant to 5 U.S.C. 552(a)(1)(E) and");
// yields
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

// Yields
[{
  "match": "section 5362(5) of title 31",
  "excerpt": "t term in section 5362(5) of title 31, United S",
  ...
}]
```
