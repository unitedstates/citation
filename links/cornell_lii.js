module.exports = {
  id: "cornell_lii",

  name: "Cornell Legal Information Institute",
  abbreviation: "Cornell LII",
  link: "https://www.law.cornell.edu/uscode/text",

  authoritative: false,

  citations: {
    usc: function(cite) {
      var title = cite.title.replace(/-app$/, '');
      var is_appendix = cite.title.indexOf("-app") != -1;

      // (for current citations only, i.e. not tied to a publication or effective date)
      var subsections = (cite.subsections.slice() || []); // clone
      if (subsections.length && subsections[subsections.length-1] == "et-seq") subsections.pop(); // don't include eq-seq in a link
      return {
        landing: "https://www.law.cornell.edu/uscode/text/" + (title + (is_appendix ? "a" : ""))
                          + "/" + cite.section
                          + (subsections.length ? ("#" + subsections.join("_")) : ""),
        note: "Link is to most current version of the US Code, as available at law.cornell.edu."
      };
    }
  }
}
