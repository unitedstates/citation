Citation.types.va_code = {
  name: "Code of Virginia Annotated",
  type: "regex",

  patterns: [
    // tested:
    // Va. Code Ann. § 19.2-56.2 (2010)
    // Va. Code Ann. § 19.2-56.2 (West 2010)
    // Va. Code Ann. § 57-1
    // Va. Code Ann. § 57-2.02
    // Va. Code Ann. § 63.2-300
    // Va. Code Ann. § 66-25.1:1
    // Va. Code § 66-25.1:1
    // VA Code § 66-25.1:1
    // Va. Code § 8.1A-302
    
    {
      regex: 
        "Va\\.? Code\\.?" +
        "(?:\\s+Ann\\.?)?" +
        "(?:\\s+§+)?" +
        "\\s+([\\d\\.]+{A-Z}?)\\-([\\d\\.:]+)" +
        "(?:\\s+\\((West )?([12]\\d{3})\\))?",
      processor: function (match) {
        return {
          title: match[1],
          section: match[2],
          year: match[4]
        };
      }
    }
  ],

  // ID: va_code_[title]_[section]
  standardize: function(data) {
    return {
      id: ["va_code", data.title, data.section].join("_")
    };
  }
};
