module.exports = {
  id: "nara",

  name: "The National Archives and Records Administration",
  abbreviation: "NARA",
  link: "http://www.archives.gov",

  authoritative: true,

  citations: {
    usconst: function(cite) {
      return {
        html: "https://www.archives.gov/founding-docs/constitution-transcript"
      }
    }
  }
}
