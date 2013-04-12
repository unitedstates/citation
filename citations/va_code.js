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
    
    {
      regex: 
        "Va\\.? Code\\.?" +
        "(?:\\s+Ann\\.?)?" +
        "(?:\\s+§+)?" +
        "\\s+([\\d\\.]+)\\-([\\d\\.:]+)" +
        "(?:\\s+\\((West )?([12]\\d{3})\\))?",
      processor: function (captures) {
        return {
          title: captures[0],
          section: captures[1],
          year: captures[3]
        };
      }
    }
  ],

  // ID: va_code_[title]_[section]
  standardize: function(data) {
    return {
      id: ["va-code", data.title, data.section].join("/")
    };
  }
};