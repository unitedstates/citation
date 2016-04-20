module.exports = {
  id: "nara",

  name: "The National Archives and Records Administration",
  abbreviation: "NARA",
  link: "http://www.archives.gov",

  authoritative: true,

  citations: {
    usconst: function(cite) {
      return {
        landing: "http://www.archives.gov/exhibits/charters/constitution_transcript.html"
      }
    }
  }
}
