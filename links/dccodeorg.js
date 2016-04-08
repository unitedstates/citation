module.exports = {
  id: "dccodeorg",

  name: "DCCode.org",
  abbreviation: "DCCode.org",
  link: "http://www.dccode.org",

  authoritative: false,

  citations: {
    dc_code: function(cite) {
      return {
        landing: "http://dccode.org/simple/sections/" + cite.title + "-" + cite.section + ".html"
      };
    }
  }
};
