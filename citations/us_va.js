Citation.types.va_code_ann = {
  name: "Code of Virginia Annotated",
  type: "regex",

  patterns: [
    // Va. Code Ann. § 19.2-56.2 (2010)
    // Va. Code Ann. § 19.2-56.2 (West 2010)
    [
      "Va\\.? Code\\.? Ann\\.? §* ?(\\d+\\.\\d+)\\-(\\d+\\.\\d+) \\((West )?([12]\\d{3})\\)",
      function(match) {
        return {
          title: match[1],
          section: match[2],
          year: match[4]
        };
      }]
    ],

  // ID: [title]_usc_[section]_[subsection 1]_...
  standardize: function(data) {
    return {
      id: ["va_code_ann", data.title, data.section].join("_"),
      section_id: ["va_code_ann", data.title, data.section].join("_")
    };
  }
};