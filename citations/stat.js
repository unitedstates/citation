module.exports = {
  type: "regex",

  // normalize all cites to an ID
  id: function(cite) {
    return ["stat", cite.volume, cite.page].join("/")
  },

  canonical: function(cite) {
    return cite.volume + " Stat. " + cite.page;
  },

  patterns: [
    // "117 Stat. 1952"
    // "77 STAT. 77"
    {
      regex:
        "(\\d+[\\w]*)\\s+" +
        "Stat\\.?" +
        "\\s+(\\d+)",
      fields: ['volume', 'page'],
      processor: function(match) {
        return {
          volume: match.volume,
          page: match.page,
        };
      }
    }
  ],

  links: function(cite) {
    var links = { };

    // GPO
    if (cite.volume >= 65 && cite.volume <= 125) {
      var usgpo_url = "http://api.fdsys.gov/link?collection=statute&volume=" + cite.volume + "&page=" + cite.page;
      links.usgpo = {
        source: {
            name: "U.S. Government Publishing Office",
            abbreviation: "US GPO",
            link: "http://www.gpo.gov",
            authoritative: true
        },
        pdf: usgpo_url,
        mods: usgpo_url + "&link-type=mods"
      };
    }

    // LIBRARY OF CONGRESS
    if (cite.volume < 65) {
      // LoC organizes the volumes by Congress and, for some Congresses, by chapter
      // number. This is well and good but awful for direct linking of citations
      // because we don't know the Congress number from a volume (through the 12th
      // volume volumes contained more than one Congress) or the chapter number
      // (which is a sequential numbering of public and private laws, I think?).
      links.libraryofcongress = {
        source: {
            name: "Library of Congress",
            abbreviation: "LoC",
            link: "https://www.loc.gov",
            authoritative: true,
            note: "Link is to LoC's general Statutes at Large landing page."
        },
        landing: "https://www.loc.gov/law/help/statutes-at-large/index.php"
      }
    }

    // LEGISLINK
    var legislink_url = "http://legislink.org/us/stat-" + cite.volume + "-" + cite.page;
    links.legislink = {
      source: {
          name: "Legislink",
          abbreviation: "Legislink",
          link: "http://legislink.org/us",
          authoritative: false
      }
    }
    // the format differs depending on the volume, and where it is a simple
    // redirect to US GPO (and not hosted content) then we can note that.
    if (cite.volume >= 125) {
      // hosted content is a mirror of US GPO Public and Private Laws in text format
      links.legislink.text = legislink_url;
    } else if (cite.volume >= 65) {
      // redirect to US GPO (so same content as the usgpo link)
      links.legislink.pdf = legislink_url;
      links.legislink.source.note = "Link redirects to US GPO Statutes at Large."
    } else {
      // original content
      links.legislink.pdf = legislink_url;
    }

    return links;
  }
};
