module.exports = {
  id: "dc_council",

  name: "Council of the District of Columbia",
  abbreviation: "DC Council",
  link: "https://dccode.gov",

  authoritative: true,

  citations: {
    dc_law: function(cite) {
      return {
        landing: "https://code.dccouncil.us/dc/council/laws/" + cite.period + "-" + cite.number + ".html"
      };
    },
    dc_code: function(cite) {
      return {
        landing: "https://code.dccouncil.us/dc/council/code/sections/" + cite.title + "-" + cite.section + ".html"
      };
    }
  }
};
