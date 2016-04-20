module.exports = {
  id: "govtrack",

  name: "GovTrack.us",
  abbreviation: "GovTrack.us",
  link: "https://www.govtrack.us",

  authoritative: false,

  citations: {
    law: function(cite) {
      if (cite.congress < 82) return null;
      return {
        landing: "https://www.govtrack.us/search?q=" + (cite.type=="public"?"Pub":"Priv") + "Law+" + cite.congress + "-" + cite.number
      };
    }
  }
}
