module.exports = {
  id: "usgpo",

  name: "U.S. Government Publishing Office",
  abbreviation: "US GPO",
  link: "https://govinfo.gov",

  authoritative: true,

  citations: {
    cfr: function(cite) {
      var usgpo_url = "https://www.govinfo.gov/link/cfr/" + cite.title + "/" + cite.part;
      if (cite.section) // section, if present, is of the form PART.SECTION, and for the GPO url only include the (inner) section
        usgpo_url += "?sectionnum=" + cite.section.substring(cite.part.length+1) + "";
      else
        usgpo_url += "?";

      return {
        landing: usgpo_url + "&link-type=details",
        pdf: usgpo_url + "&link-type=pdf",
        mods: usgpo_url + "&link-type=mods"
      };
    },

    fedreg: function(cite) {
      var usgpo_url = "https://www.govinfo.gov/link/fr/" + cite.volume + "/" + cite.page;
      return {
        landing: usgpo_url + "?link-type=details",
        pdf: usgpo_url + "?link-type=pdf",
        mods: usgpo_url + "?link-type=mods"
      };
    },

    law: function(cite) {
      if (cite.congress < 104) return null;
      var usgpo_url = "https://www.govinfo.gov/link/plaw/" + cite.congress + "/" + cite.type + "/" + cite.number;
      return {
        landing: usgpo_url + "?link-type=details",
        pdf: usgpo_url + "?link-type=pdf",
        mods: usgpo_url + "?link-type=mods"
      };
    },

    stat: function(cite) {
      if (cite.volume < 65 || cite.volume > 125) return null;
      var usgpo_url = "https://www.govinfo.gov/link/statute/" + cite.volume + "/" + cite.page;
      return {
        landing: usgpo_url + "?link-type=details",
        pdf: usgpo_url + "?link-type=pdf",
        mods: usgpo_url + "?link-type=mods"
      };
    },

    usc: function(cite) {
      var title = cite.title.replace(/-app$/, '');
      var is_appendix = cite.title.indexOf("-app") != -1;
      var usgpo_url = "https://www.govinfo.gov/link/uscode/" + title + "/" + cite.section
       + "?type=" + (!is_appendix ? "usc" : "uscappendix");
      return {
        landing: usgpo_url + "&link-type=details",
        pdf: usgpo_url + "&link-type=pdf",
        mods: usgpo_url + "&link-type=mods"
      };
    }
  }
}

