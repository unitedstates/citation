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

### Options

* `text`: **required**, text to extract citations from.
* `callback`: a function name to use as a JSONP callback.
* `pretty`: prettify (indent) output.
* `options[excerpt]`: include excerpts with up to this many characters around it.
* `options[types]`: limit citation types to a comma-separated list (e.g. "usc,law")

Valid `types` are:

- `"cfr"`
- `"dc_code"`
- `"dc_law"`
- `"dc_register"`
- `"judicial"`
- `"law"`
- `"stat"`
- `"usc"`
- `"va_code"`
