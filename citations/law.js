Citation.types.law = {
  name: "US Slip Law",
  type: "regex",

  patterns: [
    // "Public Law 111-89"
    // "Pub. L. 112-56"
    // "Pub. L. No. 110-2"
    // "Private Law 111-72"
    // "Priv. L. No. 98-23"
    // "section 552 of Public Law 111-89"
    // "section 4402(e)(1) of Public Law 110-2"
    [
      "(?:section (\\d+[\\w\\d\-]*)((?:\\([^\\)]+\\))*) of )?(pub(?:lic)?|priv(?:ate)?)\\.? +l(?:aw)?\\.?(?: +No\\.?)? +(\\d+)[-–](\\d+)", function(match) {
      var sections = [];
      if (match[1]) sections.push(match[1]);
      if (match[2]) sections = sections.concat(_.compact(match[2].split(/[\(\)]+/)));

      return {
        type: match[3].match(/^priv/i) ? "private" : "public",
        congress: match[4],
        number: match[5],
        sections: sections
      }
    }],

    // "PL 19-4"
    // "P.L. 45-78"
    // "section 552 of PL 19-4"
    // "section 4402(e)(1) of PL 19-4"
    [
      "(?:section (\\d+[\\w\\d\-]*)((?:\\([^\\)]+\\))*) of )?P\\.?L\\.? +(\\d+)[-–](\\d+)", function(match) {
      sections = [];
      if (match[1]) sections.push(match[1]);
      if (match[2]) sections = sections.concat(_.compact(match[2].split(/[\(\)]+/)));

      return {
        type: "public",
        congress: match[3],
        number: match[4],
        sections: sections
      }
    }]
  ],

  // ID: [type]_law_[congress]_[number]_[section 1]_...
  standardize: function(data) {
    return {
      id: _.flatten([data.type, "law", data.congress, data.number, data.sections]).join("_"),
      law_id: [data.type, "law", data.congress, data.number].join("_")
    }
  }
};