if (!customElements.get("cantinflas-tequila-process")) {
  customElements.define(
    "cantinflas-tequila-process",
    class extends HTMLElement {
      connectedCallback() {
        this.steps = [...this.querySelectorAll("[data-tequila-step]")];
        this.photos = [...this.querySelectorAll("[data-tequila-process-photo]")];
        this.controller = new AbortController();

        const options = { passive: true, signal: this.controller.signal };
        window.addEventListener("scroll", this.scheduleUpdate, options);
        window.addEventListener("resize", this.scheduleUpdate, options);
        this.addEventListener("shopify:block:select", this.selectBlock, options);
        this.scheduleUpdate();
      }

      disconnectedCallback() {
        this.controller.abort();
        cancelAnimationFrame(this.frame);
        this.frame = null;
      }

      scheduleUpdate = () => {
        if (this.frame) return;
        this.frame = requestAnimationFrame(() => {
          this.frame = null;
          let nearest = 0;
          let smallestDistance = Infinity;
          const midpoint = window.innerHeight * 0.52;

          this.steps.forEach((step, index) => {
            const bounds = step.getBoundingClientRect();
            const distance = Math.abs(bounds.top + bounds.height / 2 - midpoint);
            if (distance < smallestDistance) {
              nearest = index;
              smallestDistance = distance;
            }
          });

          this.setActive(nearest);
        });
      };

      selectBlock = (event) => {
        const index = this.steps.indexOf(event.target.closest("[data-tequila-step]"));
        if (index >= 0) this.setActive(index);
      };

      setActive(index) {
        if (!this.steps[index]) return;
        this.dataset.enhanced = "true";
        this.steps.forEach((step, position) => {
          step.toggleAttribute("data-active", position === index);
        });
        this.photos.forEach((photo, position) => {
          photo.toggleAttribute("data-active", position === index);
          photo.setAttribute("aria-hidden", String(position !== index));
        });
      }
    },
  );
}

if (!customElements.get("cantinflas-tequila-cocktails")) {
  customElements.define(
    "cantinflas-tequila-cocktails",
    class extends HTMLElement {
      connectedCallback() {
        this.controller = new AbortController();
        const options = { signal: this.controller.signal };
        this.addEventListener("click", this.handleClick, options);
        this.addEventListener("keydown", this.handleKeydown, options);
        for (const card of this.querySelectorAll(".ct-cocktails__card")) {
          const button = card.querySelector(".ct-cocktails__plus");
          this.setFace(card, button, false);
          card.setAttribute("data-enhanced", "");
          button.hidden = false;
        }
      }

      disconnectedCallback() {
        this.controller.abort();
      }

      handleClick = (event) => {
        const button = event.target.closest(".ct-cocktails__plus");
        if (!button) return;
        const card = button.closest(".ct-cocktails__card");
        this.setFace(card, button, !card.hasAttribute("data-flipped"));
      };

      handleKeydown = (event) => {
        if (event.key !== "Escape" || event.defaultPrevented) return;
        const card = event.target.closest(".ct-cocktails__card[data-flipped]");
        if (!card) return;
        event.preventDefault();
        event.stopPropagation();
        const button = card.querySelector(".ct-cocktails__plus");
        button.focus();
        this.setFace(card, button, false);
      };

      setFace(card, button, flipped) {
        card.toggleAttribute("data-flipped", flipped);
        button.setAttribute("aria-expanded", String(flipped));
        card.querySelector(".ct-cocktails__front").inert = flipped;
        card.querySelector(".ct-cocktails__back").inert = !flipped;
      }
    },
  );
}
