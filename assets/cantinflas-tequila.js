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
        this.addEventListener("close", this.restoreFocus, { ...options, capture: true });
      }

      disconnectedCallback() {
        this.controller.abort();
      }

      handleClick = (event) => {
        const trigger = event.target.closest("[data-tequila-dialog-open]");
        if (trigger) {
          const dialog = document.getElementById(trigger.getAttribute("aria-controls"));
          if (!dialog || typeof dialog.showModal !== "function") return;
          event.preventDefault();
          this.trigger = trigger;
          dialog.showModal();
        } else if (event.target.matches("dialog[open]")) {
          const bounds = event.target.getBoundingClientRect();
          if (
            event.clientX < bounds.left || event.clientX > bounds.right ||
            event.clientY < bounds.top || event.clientY > bounds.bottom
          ) {
            event.target.close();
          }
        }
      };

      restoreFocus = () => {
        this.trigger?.focus();
      };
    },
  );
}
