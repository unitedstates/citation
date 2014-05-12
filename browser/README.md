## Browser-ready citations

Any of the files in this folder are ready for browser use, and can be dropped into your web project.

Loading any of them with a `<script>` tag will result in a global `Citation` object being available for immediate use.

```html
<script src="/path/to/citation.min.js"></script>
<script>
  var results = Citation.find("lo and behold, 5 USC 552");
  console.log(results.citations[0].id);
  // will print "usc/5/552"
</script>
```

## Including walverine

If you want citations for court opinions, you'll need to use one of the `citation-with-walverine` versions. This adds integration with [walverine](https://github.com/adelevie/walverine), a project for detecting court opinion citations.

It adds a significant amount of bytes to the download, which is why it's separate by default.