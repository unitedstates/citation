module.exports = {
  id: "dcdecoded",

  name: "DC Decoded",
  abbreviation: "DCDecoded.org",
  link: "http://dcdecoded.org",

  authoritative: false,

  citations: {
    dc_code: function(cite) {
      return {
        landing: "http://dcdecoded.org/" + cite.title + "-" + cite.section + "/"
      };
    }
  }
};
