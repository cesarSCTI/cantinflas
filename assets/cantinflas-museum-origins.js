if (!customElements.get("cantinflas-museum-origins")) {
  customElements.define("cantinflas-museum-origins", class extends HTMLElement {
    connectedCallback() {
      if (window.Shopify?.designMode || !window.IntersectionObserver) return;

      const chapters = [...this.querySelectorAll(".cantinflas-origins__chapter")];
      let nextChapter = 0;
      const observer = new IntersectionObserver((entries) => {
        const lastVisible = Math.max(nextChapter - 1, ...entries
          .filter((entry) => entry.isIntersecting)
          .map((entry) => chapters.indexOf(entry.target)));

        // Reveal earlier chapters first when a visitor lands partway down the section.
        let delay = 0;
        while (nextChapter <= lastVisible) {
          const chapter = chapters[nextChapter++];
          chapter.style.setProperty("--origins-reveal-delay", `${delay}ms`);
          chapter.removeAttribute("data-origins-pending");
          observer.unobserve(chapter);
          delay += 150;
        }
      }, { rootMargin: "0px 0px -10% 0px" });

      this.chapterObserver = observer;
      for (const chapter of chapters) {
        chapter.setAttribute("data-origins-pending", "");
        observer.observe(chapter);
      }
    }

    disconnectedCallback() {
      this.chapterObserver?.disconnect();
    }
  });
}
