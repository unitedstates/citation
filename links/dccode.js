module.exports = {
  id: "dccode",

  name: "Council of the District of Columbia",
  abbreviation: "DC Council",
  link: "https://dccode.gov",

  authoritative: true,

  citations: {
    dc_code: function(cite) {
      // Only available for CP's 19 and 20.
      if (cite.period < 19 || cite.period > 20) return null;
      return {
        pdf: "https://dcstat.dccode.gov/public/Law_" + cite.period + "-" + cite.number + ".pdf"
      };
    }
  }
};
