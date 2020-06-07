module.exports = {
  id: "house",

  name: "Office of the Law Revision Counsel of the United States House of Representatives",
  abbreviation: "House OLRC",
  link: "http://uscode.house.gov/",

  authoritative: true,

  citations: {
    usc: function(cite) {
      var title = cite.title.replace(/-app$/, '');
      var is_appendix = cite.title.indexOf("-app") != -1;
      return {
        note: "Link is to most current version of the US Code.",
        html: "https://uscode.house.gov/view.xhtml?req=(" + encodeURIComponent("title:" + (title + (is_appendix ? "a" : "")) + " section:" + cite.section + " edition:prelim") + ")"
      }
    }
  }
}
