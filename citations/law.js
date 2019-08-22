
module.exports = {
  type: "regex",

  name: "U.S. Law",

  id: function(cite) {
    return ["us-law", cite.type, cite.congress, cite.number]
      .concat(cite.sections || [])
      .join("/");
  },

  fromId: function(id) {
    var parts = id.split("/");
    if (parts[0] != "us-law") return;
    return {
      type: parts[1],
      congress: parts[2],
      number: parts[3],
      sections: parts.slice(4) || undefined
    };
  },

  canonical: function(cite) {
    if (!cite.sections || cite.sections.length == 0)
      // this style matches GPO at http://www.gpo.gov/fdsys/browse/collection.action?collectionCode=PLAW&browsePath=112&isCollapsed=false&leafLevelBrowse=false&ycord=0
      return (cite.type == "public" ? "Pub. L." : "Pvt. L.") + " " + cite.congress + "-" + cite.number;
    else
      return "Section " + cite.sections[0] + cite.sections.slice(1).map(function(item) { return "(" + item + ")" }).join("")
        + " of " +
        (cite.type == "public" ? "Public" : "Private") + " Law " + cite.congress + "-" + cite.number;
  },

  // field to calculate parents from
  parents_by: "sections",

  patterns: [
    // "Public Law 111-89"
    // "Pub. L. 112-56"
    // "Pub. L. No. 110-2"
    // "Pub.L. 105-33"
    // "Private Law 111-72"
    // "Priv. L. No. 98-23"
    // "section 552 of Public Law 111-89"
    // "section 4402(e)(1) of Public Law 110-2"
    // "Pub. Law 67-45-46", "Pub. Law 74-770½", "Pub. Law 79-160-A" (see https://github.com/unitedstates/legisworks-historical-statutes)
    {
      regex:
        "(?:section (\\d+[\\w\\d\-]*)((?:\\([^\\)]+\\))*) of )?" +
        "(pub(?:lic)?|priv(?:ate)?)\\.?\\s*l(?:aw)?\\.?(?:\\s*No\\.?)?" +
        " +(\\d+)[-–]+(\\d+[-A½\\d]*)",
      fields: ['section', 'subsections', 'type', 'congress', 'number'],
      processor: function(captures) {
        var sections = [];
        if (captures.section) sections.push(captures.section);
        if (captures.subsections) sections = sections.concat(captures.subsections.split(/[\(\)]+/).filter(function(x) {return x}));

        return {
          type: captures.type.match(/^priv/i) ? "private" : "public",
          congress: captures.congress,
          number: captures.number,
          sections: sections
        };
      }
    },

    // "PL 19-4"
    // "P.L. 45-78"
    // "section 552 of PL 19-4"
    // "section 4402(e)(1) of PL 19-4"
    {
      regex:
        "(?:section (\\d+[\\w\\d\-]*)((?:\\([^\\)]+\\))*) of )?" +
        "P\\.?L\\.? +(\\d+)[-–](\\d+[-A½\\d]*)",
      fields: ['section', 'subsections', 'congress', 'number'],
      processor: function(captures) {
        sections = [];
        if (captures.section) sections.push(captures.section);
        if (captures.subsections) sections = sections.concat(captures.subsections.split(/[\(\)]+/).filter(function(x) {return x}));

        return {
          type: "public",
          congress: captures.congress,
          number: captures.number,
          sections: sections
        };
      }
    }
  ]
};
