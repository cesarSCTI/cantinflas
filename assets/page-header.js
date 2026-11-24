class PageHeaderSection extends HTMLElement {
  constructor() {
    super();

    this.isSticky = this.dataset.sticky === "true";
    this.isStickyAlways = this.dataset.stickyAlways === "true";
    this.isTransparent = this.dataset.transparent === "true";
    this.isAlwaysMobileMenu = this.dataset.alwaysMobileMenu === "true";

    // Optional CSS selector for the section over which the header should hide
    this.hideOverSelector = this.dataset.hideOverSelector || null;

    this.classBodyAlwaysMobileMenu = "mobile-nav";

    this.header = document.querySelector(".page-header");
    this.desktopMenuTrigger = document.querySelector(
      ".wt-header__sticky-menu-trigger",
    );
    this.desktopMenuBar = document.querySelector(".wt-drawer--nav");

    this.enabledClass = "sticky-enabled";
    this.showClass = "sticky-show";
    this.desktopHeaderWithMenuBarClass = "page-header--sticky-show-menubar-lg";
  }

  connectedCallback() {
    this.init();
    if (this.hasAttribute("data-xd-fixed-header")) this.initFixedOverlay();
  }

  disconnectedCallback() {
    if (this.overlayResizeObserver) {
      this.overlayResizeObserver.disconnect();
      this.overlayController.abort();
      cancelAnimationFrame(this.overlayFrame);
      document.documentElement.style.removeProperty("--xd-header-space");
    }
    this.disableStickyHeader();
  }

  initFixedOverlay() {
    const reservesSpace = this.hasAttribute("data-overlay-reserve");
    this.overlayController = new AbortController();
    const { signal } = this.overlayController;
    let announcement;
    let cover;

    const update = () => {
      this.overlayFrame = null;
      const top = Math.max(0, announcement?.getBoundingClientRect().bottom || 0);
      const bottom = top + this.offsetHeight;
      this.parentElement.style.setProperty("--xd-header-top", `${top}px`);
      this.toggleAttribute("data-overlay-reserve", reservesSpace || !cover);
      this.toggleAttribute("data-xd-header-surface", !cover || cover.getBoundingClientRect().bottom <= bottom);
      document.documentElement.style.setProperty("--xd-header-space", `${this.offsetHeight}px`);
      this.setAttribute("data-xd-header-ready", "");
    };
    const schedule = () => {
      if (!this.overlayFrame) this.overlayFrame = requestAnimationFrame(update);
    };

    this.overlayResizeObserver = new ResizeObserver(schedule);
    const refreshSections = () => {
      announcement = document.querySelector(".wt-announcement");
      cover = reservesSpace ? null : document.querySelector(
        "page-header-logo-banner, #root > .shopify-section:first-of-type .cantinflas-video-hero",
      );
      this.overlayResizeObserver.disconnect();
      this.overlayResizeObserver.observe(this);
      if (announcement) this.overlayResizeObserver.observe(announcement);
      if (cover) this.overlayResizeObserver.observe(cover);
      schedule();
    };

    refreshSections();
    cancelAnimationFrame(this.overlayFrame);
    update();
    window.addEventListener("scroll", schedule, { passive: true, signal });
    window.addEventListener("resize", schedule, { passive: true, signal });
    document.addEventListener("shopify:section:load", refreshSections, { signal });
    document.addEventListener("shopify:section:unload", refreshSections, { signal });
    document.addEventListener("shopify:section:reorder", refreshSections, { signal });
  }

  getHeaderHeight() {
    return this.header ? this.header.offsetHeight : 0;
  }

  /** Returns the target element for the hide-over behavior (if any). */
  getHideOverTarget() {
    if (!this.hideOverSelector) return null;
    if (this._hideOverTarget && document.body.contains(this._hideOverTarget)) {
      return this._hideOverTarget;
    }
    this._hideOverTarget =
      document.querySelector(this.hideOverSelector) || null;
    return this._hideOverTarget;
  }

  /**
   * Should the sticky header be hidden because its bottom edge reached
   * the target section's top edge?
   *
   * Geometry reference (viewport coordinates):
   * - header top: usually 0 when sticky is shown
   * - header bottom: header.offsetHeight
   * - section top: target.getBoundingClientRect().top
   *
   * We hide when sectionTop <= headerBottom.
   */
  shouldHideOverSection() {
    const target = this.getHideOverTarget();
    if (!target || !this.header) return false;

    const rect = target.getBoundingClientRect();
    const headerH = this.getHeaderHeight();

    // Small hysteresis to avoid flicker on exact boundary (in px)
    const EPS = 1;

    // True when the section intersects with the header band [0, headerH)
    // i.e. sectionTop < headerBottom && sectionBottom > 0
    const overlapsHeaderBand = rect.top < headerH - EPS && rect.bottom > EPS;

    return overlapsHeaderBand;
  }

  /** Attach / detach a lightweight resize handler to keep things in sync. */
  attachResizeHandler() {
    // Re-run calculations on resize; cheap logic, no throttling needed here
    this._onResize = () => {
      // Force potential reflow-based checks in next scroll tick
      // so currentScrollPos logic stays consistent.
      this.scrollHandler?.();
    };
    window.addEventListener("resize", this._onResize, { passive: true });
  }

  detachResizeHandler() {
    if (this._onResize) {
      window.removeEventListener("resize", this._onResize);
      this._onResize = null;
    }
  }

  enableStickyHeader() {
    if (!this.header) {
      console.error("Header element not found for enabling sticky header");
      return;
    }

    document.body.classList.add("page-header-sticky");

    let prevScrollpos = window.pageYOffset;

    const isDesktop = window.matchMedia("(min-width: 1200px)").matches;
    const isMenuBarOpen = () =>
      this.header.classList.contains(this.desktopHeaderWithMenuBarClass);
    const isHeaderWithDesktopNav =
      !document.body.classList.contains("mobile-nav");
    const allLLevelsLinks =
      this.desktopMenuBar?.querySelectorAll("a[data-menu-level]");
    const onlyLevel1Links = this.desktopMenuBar?.querySelectorAll(
      "a[data-menu-level='1']",
    );

    const header = document.querySelector("#header");

    const calculateNavbarTopMargin = () => {
      const navbar = document.querySelector("#wt-drawer-nav");
      if (!navbar || !header) return 0;

      let marginTop = 0;

      if (navbar.offsetHeight > header.offsetHeight) {
        marginTop = header.offsetHeight - navbar.offsetHeight;
      } else {
        marginTop = Math.abs(navbar.offsetHeight - header.offsetHeight);
      }

      navbar.style.setProperty("--top-margin", `${marginTop}px`);

      return marginTop;
    };

    const calculateStickyFiltersTopOffset = (value = 0) => {
      const stickyFilters = document.querySelector(
        ".collection__sticky-header",
      );
      const plpWrapper = document.querySelector(".collection-grid-section");

      if (stickyFilters && plpWrapper) {
        const offset = value ?? `${this.header.offsetHeight}px`;
        plpWrapper.style.setProperty("--filters-sticky-offset", offset);
      }
    };

    calculateNavbarTopMargin();
    calculateStickyFiltersTopOffset();

    const stickyHeader = {
      show: () => {
        if (this.header) this.header.classList.add(this.showClass);
        stickyHeader.visible = true;
        stickyHeader.handleBehavior();
        calculateNavbarTopMargin();
        calculateStickyFiltersTopOffset();
      },
      hide: () => {
        if (this.header) this.header.classList.remove(this.showClass);
        stickyHeader.visible = false;
        stickyHeader.handleBehavior();
        calculateStickyFiltersTopOffset(0);
      },
      enable: () => {
        if (this.header) this.header.classList.add(this.enabledClass);
        stickyHeader.enabled = true;
        stickyHeader.handleBehavior();
      },
      disable: () => {
        if (this.header)
          this.header.classList.remove(this.enabledClass, this.showClass);
        stickyHeader.enabled = false;
        stickyHeader.handleBehavior();
      },
      enabled: false,
      visible: true,
      handleBehavior: () => {
        if (isHeaderWithDesktopNav && isDesktop && this.header) {
          stickyHeader.log();
          if (!isMenuBarOpen() && stickyHeader.enabled) {
            setTabindex(allLLevelsLinks, "-1");
          }
          if (isMenuBarOpen() && stickyHeader.enabled) {
            setTabindex(allLLevelsLinks, "0");
          }
          if (!stickyHeader.enabled) {
            setTabindex(onlyLevel1Links, "0");
            if (this.desktopMenuTrigger)
              setTabindex([this.desktopMenuTrigger], "-1");
          } else if (this.desktopMenuTrigger)
            setTabindex([this.desktopMenuTrigger], "0");
        }
      },
      log: () => {},
    };

    // --- Scroll handler with "hide-over-section" override ----------
    this.scrollHandler = () => {
      const currentScrollPos = window.pageYOffset;

      // If we're over the target section, force-hide regardless of isStickyAlways.
      if (this.shouldHideOverSection()) {
        stickyHeader.hide();
      } else {
        // Original behavior preserved
        if (!this.isStickyAlways) {
          if (prevScrollpos > currentScrollPos) {
            stickyHeader.show();
          } else {
            stickyHeader.hide();
          }
        } else {
          stickyHeader.show();
        }
      }

      prevScrollpos = currentScrollPos;
    };

    window.addEventListener("scroll", this.scrollHandler, { passive: true });
    this.attachResizeHandler();

    this.desktopMenuTrigger?.addEventListener("click", (e) => {
      e.preventDefault();
      this.desktopMenuBar?.classList.toggle("wt-drawer--nav-show");
      this.desktopMenuTrigger?.classList.toggle(
        "wt-header__sticky-menu-trigger--active",
      );
      this.header?.classList.toggle(this.desktopHeaderWithMenuBarClass);
      stickyHeader.handleBehavior();
    });

    const sentinel = document.querySelector(".sticky-header__threshold");
    const handleStickySentinel = (entries) => {
      entries.forEach(({ isIntersecting }) => {
        if (isIntersecting) {
          stickyHeader.disable();
        } else {
          stickyHeader.enable();
        }
      });
    };

    this.stickyHeaderObserver = new IntersectionObserver(handleStickySentinel, {
      root: null,
      rootMargin: `${this.isStickyAlways ? "-160" : "-100"}px 0px 0px 0px`,
      threshold: 0,
    });
    if (sentinel) this.stickyHeaderObserver.observe(sentinel);
  }

  disableStickyHeader() {
    if (this.header) {
      // Remove classes added by sticky header
      this.header.classList.remove(
        this.enabledClass,
        this.showClass,
        this.desktopHeaderWithMenuBarClass,
      );
      document.body.classList.remove("page-header-sticky");
      this.desktopMenuBar?.classList.remove("wt-drawer--nav-show");
      this.desktopMenuTrigger?.classList.remove(
        "wt-header__sticky-menu-trigger--active",
      );
    }

    // Remove the scroll event listener
    if (this.scrollHandler) {
      window.removeEventListener("scroll", this.scrollHandler);
      this.scrollHandler = null;
    }

    // Detach resize handler
    this.detachResizeHandler();

    // Disconnect the IntersectionObserver
    if (this.stickyHeaderObserver) {
      this.stickyHeaderObserver.disconnect();
      this.stickyHeaderObserver = null;
    }
  }

  init() {
    if (this.isSticky) {
      this.enableStickyHeader();
    } else {
      this.disableStickyHeader();
    }
  }
}

customElements.define("page-header", PageHeaderSection);
