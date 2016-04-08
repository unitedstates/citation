module.exports = {
  id: "vadecoded",

  name: "Virginia Decoded",
  abbreviation: "VACode.org",
  link: "https://vacode.org",

  authoritative: false,

  citations: {
    va_code: function(cite) {
      return {
        landing: "https://vacode.org/" + cite.title + "-" + cite.section + "/"
      };
    }
  }
};
