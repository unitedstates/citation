module.exports = {
  id: "legislink",

  name: "Legislink",
  abbreviation: "Legislink",
  link: "http://legislink.org/us",

  authoritative: false,

  citations: {
    stat: function(cite) {
      var legislink_url = "http://legislink.org/us/stat-" + cite.volume + "-" + cite.page;

      // the format differs depending on the volume, and where it is a simple
      // redirect to US GPO (and not hosted content) then we can note that.
      if (cite.volume >= 125) {
        // hosted content is a mirror of US GPO Public and Private Laws in text format
        return {
          text: legislink_url
        };

      } else if (cite.volume >= 65) {
        // redirect to US GPO (so same content as the usgpo link)
        return {
          pdf: legislink_url,
          note: "Link redirects to US GPO Statutes at Large."
        };

      } else {
        // original content
        return {
          pdf: legislink_url
        };
      }
    }
  }
}
