Citation.types.va_code = {
  name: "Code of Virginia Annotated",
  type: "regex",

  standardize: function(data) {
    return {
      id: ["va-code", data.title, data.section].join("/")
    };
  },

  patterns: [

    // Va. Code Ann. § 19.2-56.2 (2010)
    // Va. Code Ann. § 19.2-56.2 (West 2010)
    // Va. Code Ann. § 57-1
    // Va. Code Ann. § 57-2.02
    // Va. Code Ann. § 63.2-300
    // Va. Code Ann. § 66-25.1:1
    // Va. Code § 66-25.1:1
    // VA Code § 66-25.1:1
    {
      regex: 
        "Va\\.? Code\\.?" +
        "(?:\\s+Ann\\.?)?" +
        "(?:\\s+§+)?" +
        "\\s+(?<title>[\\d\\.]+)\\-(?<section>[\\d\\.:]+)" +
        "(?:\\s+\\((West )?(?<year>[12]\\d{3})\\))?",
      processor: function (captures) {
        return {
          title: captures.title,
          section: captures.section,
          year: captures.year
        };
      }
    }
    
  ]
};