Citation.types.law = {
  name: "US Slip Law",
  type: "regex",

  standardize: function(cite) {
    return {
      id: _.flatten(["us-law", cite.type, cite.congress, cite.number, cite.sections]).join("/"),
      law_id: ["us-law", cite.type, cite.congress, cite.number].join("/")
    }
  },

  // field to calculate parents from
  parents_by: "sections",

  patterns: [
    // "Public Law 111-89"
    // "Pub. L. 112-56"
    // "Pub. L. No. 110-2"
    // "Private Law 111-72"
    // "Priv. L. No. 98-23"
    // "section 552 of Public Law 111-89"
    // "section 4402(e)(1) of Public Law 110-2"
    {
      regex: 
        "(?:section (?<section>\\d+[\\w\\d\-]*)(?<subsections>(?:\\([^\\)]+\\))*) of )?" +
        "(?<type>pub(?:lic)?|priv(?:ate)?)\\.? +l(?:aw)?\\.?(?: +No\\.?)?" +
        " +(?<congress>\\d+)[-–]+(?<number>\\d+)", 
      processor: function(captures) {
        var sections = [];
        if (captures.section) sections.push(captures.section);
        if (captures.subsections) sections = sections.concat(_.compact(captures.subsections.split(/[\(\)]+/)));

        return {
          type: captures.type.match(/^priv/i) ? "private" : "public",
          congress: captures.congress,
          number: captures.number,
          sections: sections
        }
      }
    },

    // "PL 19-4"
    // "P.L. 45-78"
    // "section 552 of PL 19-4"
    // "section 4402(e)(1) of PL 19-4"
    {
      regex: 
        "(?:section (?<section>\\d+[\\w\\d\-]*)(?<subsections>(?:\\([^\\)]+\\))*) of )?" +
        "P\\.?L\\.? +(?<congress>\\d+)[-–](?<number>\\d+)", 
      processor: function(captures) {
        sections = [];
        if (captures.section) sections.push(captures.section);
        if (captures.subsections) sections = sections.concat(_.compact(captures.subsections.split(/[\(\)]+/)));

        return {
          type: "public",
          congress: captures.congress,
          number: captures.number,
          sections: sections
        }
      }
    }
  ]
};