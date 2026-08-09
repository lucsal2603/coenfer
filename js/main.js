/* ============================================================
   COENFER — demo concept · animazioni & interazioni
   GSAP + ScrollTrigger + Lenis
   ============================================================ */

(function () {
  "use strict";

  const RM = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasGsap = typeof window.gsap !== "undefined";
  const hoverFine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => [...(c || document).querySelectorAll(s)];

  /* ---------------- utilities ---------------- */

  // divide il testo in parole (non spezzabili) e caratteri, preservando <em> ecc.
  function splitChars(el) {
    const walk = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((piece) => {
            if (!piece) return;
            if (/^\s+$/.test(piece)) { frag.appendChild(document.createTextNode(" ")); return; }
            const w = document.createElement("span");
            w.className = "word";
            [...piece].forEach((c) => {
              const s = document.createElement("span");
              s.className = "ch";
              s.textContent = c;
              w.appendChild(s);
            });
            frag.appendChild(w);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1 && !child.classList.contains("ch") && !child.classList.contains("word")) {
          walk(child);
        }
      });
    };
    walk(el);
    return $$(".ch", el);
  }

  function toast(msg) {
    const t = $("#toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove("show"), 2800);
  }

  const fmt = (n) => n.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

  /* ---------------- lenis ---------------- */
  let lenis = null;
  if (!RM && typeof window.Lenis !== "undefined") {
    lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1 });
    if (hasGsap) {
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }

  const scrollToTarget = (target) => {
    if (lenis) lenis.scrollTo(target, { offset: 0, duration: 1.4 });
    else target.scrollIntoView({ behavior: RM ? "auto" : "smooth" });
  };

  /* ---------------- ancore ---------------- */
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (id.length < 2) return;
      const target = $(id);
      if (!target) return;
      e.preventDefault();
      const wasOpen = menuIsOpen;
      if (wasOpen) closeMenu();
      setTimeout(() => scrollToTarget(target), wasOpen ? 380 : 0);
    });
  });

  /* ---------------- menu overlay ---------------- */
  const menu = $("#menuOverlay");
  const menuToggle = $("#menuToggle");
  let menuIsOpen = false;
  let menuTl = null;

  // hover "roll" sui link
  $$(".roll").forEach((r) => {
    const label = r.textContent;
    r.innerHTML = `<span class="roll-in"><span>${label}</span><span aria-hidden="true">${label}</span></span>`;
  });

  if (hasGsap && !RM) {
    menuTl = gsap.timeline({ paused: true })
      .set(menu, { visibility: "visible" })
      .to(menu, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.65, ease: "power4.inOut" })
      .from($$(".menu-link", menu), { yPercent: 60, opacity: 0, duration: 0.5, stagger: 0.06, ease: "power3.out" }, "-=0.25")
      .from($$(".menu-side > *", menu), { y: 30, opacity: 0, duration: 0.4, stagger: 0.07, ease: "power2.out" }, "-=0.4");
  }

  function openMenu() {
    menuIsOpen = true;
    document.body.classList.add("menu-open");
    menuToggle.setAttribute("aria-expanded", "true");
    menu.setAttribute("aria-hidden", "false");
    if (lenis) lenis.stop();
    document.body.style.overflow = "hidden";
    if (menuTl) menuTl.timeScale(1).play();
    else { menu.style.visibility = "visible"; menu.style.clipPath = "inset(0 0 0% 0)"; }
  }
  function closeMenu() {
    menuIsOpen = false;
    document.body.classList.remove("menu-open");
    menuToggle.setAttribute("aria-expanded", "false");
    menu.setAttribute("aria-hidden", "true");
    if (lenis) lenis.start();
    document.body.style.overflow = "";
    if (menuTl) menuTl.timeScale(1.6).reverse();
    else { menu.style.clipPath = "inset(0 0 100% 0)"; menu.style.visibility = "hidden"; }
  }
  menuToggle.addEventListener("click", () => (menuIsOpen ? closeMenu() : openMenu()));
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { if (menuIsOpen) closeMenu(); if (drawerOpen) closeDrawer(); }
  });

  /* ---------------- carrello demo ---------------- */
  const WINES = {
    enfer:    { name: "Enfer DOC",       price: 23, img: "assets/img/vino-enfer.jpg" },
    triskell: { name: "Triskell",        price: 24, img: "assets/img/vino-triskell.jpg" },
    clos:     { name: "Clos de l'Enfer", price: 30, img: "assets/img/vino-clos-de-lenfer.jpg" },
    digne:    { name: "Digne du Pape",   price: 41, img: "assets/img/vino-digne-du-pape.jpg" },
  };
  let cart = {};
  try { cart = JSON.parse(localStorage.getItem("coenfer_cart") || "{}"); } catch (e) { cart = {}; }

  const drawer = $("#cartDrawer");
  const veil = $("#drawerVeil");
  const cartCount = $("#cartCount");
  let drawerOpen = false;

  function saveCart() { localStorage.setItem("coenfer_cart", JSON.stringify(cart)); }

  function renderCart() {
    const list = $("#cartList");
    const empty = $("#cartEmpty");
    const totalEl = $("#cartTotal");
    list.innerHTML = "";
    let total = 0, count = 0;
    Object.entries(cart).forEach(([id, qty]) => {
      if (!WINES[id] || qty < 1) return;
      const w = WINES[id];
      total += w.price * qty;
      count += qty;
      const li = document.createElement("li");
      li.className = "drawer-item";
      li.innerHTML = `
        <img src="${w.img}" alt="" width="58" height="58">
        <div><p class="di-name">${w.name}</p><p class="di-price">${fmt(w.price)} / bott.</p></div>
        <div class="di-qty">
          <button data-q="${id}:-1" aria-label="Togli una bottiglia di ${w.name}">−</button>
          <span>${qty}</span>
          <button data-q="${id}:1" aria-label="Aggiungi una bottiglia di ${w.name}">+</button>
        </div>`;
      list.appendChild(li);
    });
    empty.style.display = count ? "none" : "block";
    totalEl.textContent = fmt(total);
    cartCount.textContent = count;
    if (hasGsap && !RM && count) gsap.fromTo(cartCount, { scale: 1.5 }, { scale: 1, duration: 0.4, ease: "back.out(3)" });
  }

  function openDrawer() {
    drawerOpen = true;
    drawer.classList.add("open");
    drawer.setAttribute("aria-hidden", "false");
    veil.hidden = false;
    setTimeout(() => veil.classList.add("on"), 10);
    if (lenis) lenis.stop();
    document.body.style.overflow = "hidden";
  }
  function closeDrawer() {
    drawerOpen = false;
    drawer.classList.remove("open");
    drawer.setAttribute("aria-hidden", "true");
    veil.classList.remove("on");
    setTimeout(() => (veil.hidden = true), 320);
    if (lenis && !menuIsOpen) lenis.start();
    document.body.style.overflow = "";
  }

  $("#cartToggle").addEventListener("click", openDrawer);
  $("#cartClose").addEventListener("click", closeDrawer);
  veil.addEventListener("click", closeDrawer);
  $("#cartCheckout").addEventListener("click", () =>
    toast("Demo — pagamenti e spedizioni attivi nella versione definitiva")
  );

  document.addEventListener("click", (e) => {
    const add = e.target.closest("[data-add]");
    if (add && add.dataset.add && WINES[add.dataset.add] && add.tagName === "BUTTON") {
      cart[add.dataset.add] = (cart[add.dataset.add] || 0) + 1;
      saveCart(); renderCart();
      toast(WINES[add.dataset.add].name + " aggiunto al cartone");
      return;
    }
    const q = e.target.closest("[data-q]");
    if (q) {
      const [id, d] = q.dataset.q.split(":");
      cart[id] = (cart[id] || 0) + parseInt(d, 10);
      if (cart[id] < 1) delete cart[id];
      saveCart(); renderCart();
    }
  });
  renderCart();

  /* ---------------- rail vini: frecce ---------------- */
  const rail = $("#viniRail");
  const step = () => Math.min(rail.clientWidth * 0.8, 400);
  $("#railPrev").addEventListener("click", () => rail.scrollBy({ left: -step(), behavior: "smooth" }));
  $("#railNext").addEventListener("click", () => rail.scrollBy({ left: step(), behavior: "smooth" }));

  /* ---------------- video ---------------- */
  const videoCard = $("#videoCard");
  $("#videoPlay").addEventListener("click", () => {
    const id = videoCard.dataset.videoId;
    const iframe = document.createElement("iframe");
    iframe.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
    iframe.title = "Video CoEnfer";
    iframe.allow = "autoplay; encrypted-media; picture-in-picture";
    iframe.allowFullscreen = true;
    videoCard.appendChild(iframe);
    $("#videoPlay").remove();
  });

  /* ============================================================
     ANIMAZIONI (solo con GSAP e senza reduced-motion)
     ============================================================ */
  if (!hasGsap || RM) {
    const l = $("#loader");
    if (l) l.remove();
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  gsap.defaults({ ease: "power3.out" });

  /* ---------- loader + intro hero ---------- */
  const loaderWordChars = splitChars($("#loaderWord"));
  const heroWordChars = splitChars($("#heroWord"));
  gsap.set(heroWordChars, { rotation: () => gsap.utils.random(-4, 4) });

  const intro = gsap.timeline();
  intro
    .from(loaderWordChars, { yPercent: 120, duration: 0.55, stagger: 0.045, ease: "power4.out" })
    .to($("#loader"), { yPercent: -100, duration: 0.7, ease: "power4.inOut", delay: 0.45 })
    .set($("#loader"), { display: "none" })
    .from(".hero-card", { scale: 0.85, yPercent: 8, rotation: -5, duration: 0.9, ease: "power4.out" }, "-=0.35")
    .from(heroWordChars, { yPercent: 130, rotation: 12, duration: 0.7, stagger: 0.05, ease: "back.out(1.6)" }, "-=0.55")
    .from(".hero-sub .pill", { y: 26, opacity: 0, scale: 0.9, duration: 0.45, stagger: 0.1, ease: "back.out(2)" }, "-=0.3")
    .from(".hero .shape", { scale: 0, rotation: -20, duration: 0.65, stagger: 0.07, ease: "back.out(1.8)" }, "-=0.5")
    .from([".nav > *", ".btn-float"], { y: -40, opacity: 0, duration: 0.5, stagger: 0.06 }, "-=0.5")
    .from(".hero-badge", { scale: 0, rotation: 40, duration: 0.6, ease: "back.out(2)" }, "-=0.4")
    .from(".hero-hint", { opacity: 0, duration: 0.4 }, "-=0.2");

  /* ---------- hero scrub ---------- */
  gsap.to(".hero-img", {
    y: 60, ease: "none",
    scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
  });
  gsap.to(".hero-title", {
    y: -80, ease: "none",
    scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
  });
  $$(".hero .shape").forEach((sh) => {
    const sp = parseFloat(sh.dataset.speed || 1);
    gsap.to(sh, {
      y: (1 - sp) * 420,
      rotation: sp > 1 ? 24 : -24,
      ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
    });
  });
  gsap.to(".hero-hint", {
    opacity: 0, ease: "none",
    scrollTrigger: { trigger: ".hero", start: "2% top", end: "18% top", scrub: true },
  });

  // fluttuazione costante delle forme (solo rotazione: non confligge con lo scrub)
  $$(".shape").forEach((sh, i) => {
    gsap.to(sh, { rotation: "+=" + (i % 2 ? 6 : -6), duration: 2.4 + i * 0.35, yoyo: true, repeat: -1, ease: "sine.inOut" });
  });

  /* ---------- reveal testi ---------- */
  $$("[data-split]").forEach((el) => {
    const chars = [];
    $$(".line", el).forEach((line) => chars.push(...splitChars(line)));
    gsap.from(chars, {
      yPercent: 130,
      rotation: 5,
      duration: 0.75,
      stagger: 0.016,
      ease: "power4.out",
      scrollTrigger: { trigger: el, start: "top 85%" },
    });
  });

  $$(".reveal").forEach((el) => {
    gsap.from(el, {
      y: 46, opacity: 0, duration: 0.9,
      scrollTrigger: { trigger: el, start: "top 88%" },
    });
  });

  /* ---------- card entrances ---------- */
  ScrollTrigger.batch(".wine-card, .soon-card, .c-card, .stat", {
    start: "top 90%",
    once: true,
    onEnter: (els) =>
      gsap.from(els, {
        y: 60, opacity: 0, rotation: () => gsap.utils.random(-4, 4),
        duration: 0.7, stagger: 0.08, ease: "back.out(1.4)", clearProps: "opacity",
      }),
  });

  $$(".polaroid-wall .polaroid").forEach((p, i) => {
    // ingresso: solo opacità+rotazione (la y resta allo scrub parallasse)
    gsap.from(p, {
      opacity: 0, rotation: () => gsap.utils.random(-16, 16), scale: 0.86,
      duration: 0.9, ease: "back.out(1.5)", delay: (i % 3) * 0.08,
      scrollTrigger: { trigger: p, start: "top 94%" },
    });
    gsap.to(p, {
      y: () => -gsap.utils.random(26, 64), ease: "none",
      scrollTrigger: { trigger: ".polaroid-wall", start: "top bottom", end: "bottom top", scrub: 1.2 },
    });
  });

  $$(".sticker-card, .video-card").forEach((c) => {
    if (c.closest(".b2b")) return;
    gsap.from(c, {
      y: 70, opacity: 0, duration: 0.9,
      scrollTrigger: { trigger: c, start: "top 88%" },
    });
  });

  /* ---------- marquee ---------- */
  $$("[data-marquee]").forEach((track) => {
    const chunk = track.firstElementChild;
    for (let i = 0; i < 7; i++) track.appendChild(chunk.cloneNode(true));
  });
  const skewSetters = $$(".marquee-track").map((t) => gsap.quickTo(t, "skewX", { duration: 0.5, ease: "power3" }));
  if (lenis) {
    lenis.on("scroll", (e) => {
      const skew = gsap.utils.clamp(-6, 6, e.velocity * 0.25);
      skewSetters.forEach((set) => set(skew));
    });
  }

  /* ---------- timeline orizzontale ---------- */
  const mm = gsap.matchMedia();
  mm.add("(min-width: 901px)", () => {
    const track = $("#tlTrack");
    const bar = $("#tlBar");
    const dist = () => track.scrollWidth - window.innerWidth + 80;
    const st = gsap.to(track, {
      x: () => -dist(),
      ease: "none",
      scrollTrigger: {
        trigger: ".tl-pin",
        start: "top top",
        end: () => "+=" + dist(),
        pin: true,
        scrub: 1,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => { bar.style.width = self.progress * 100 + "%"; },
      },
    });
    return () => st.scrollTrigger && st.scrollTrigger.kill();
  });

  /* ---------- contatori ---------- */
  $$(".stat-num").forEach((el) => {
    const target = parseInt(el.dataset.count, 10);
    gsap.fromTo(el, { textContent: 0 }, {
      textContent: target,
      duration: 1.6,
      ease: "power2.out",
      snap: { textContent: 1 },
      scrollTrigger: { trigger: el, start: "top 90%", once: true },
    });
  });

  /* ---------- indice vini: preview che segue il mouse ---------- */
  if (hoverFine) {
    const prev = $("#wiPreview");
    const index = $("#wineIndex");
    gsap.set(prev, { autoAlpha: 0, scale: 0.7, rotation: 5, x: 0, y: 0 });

    const xTo = gsap.quickTo(prev, "x", { duration: 0.35, ease: "power3" });
    const yTo = gsap.quickTo(prev, "y", { duration: 0.35, ease: "power3" });

    // posizione del puntatore sempre nota, anche prima del primo hover
    let px = 0, py = 0, known = false, visible = false;

    // tiene l'anteprima dentro lo schermo
    const place = (instant) => {
      const w = prev.offsetWidth || 170, h = prev.offsetHeight || 240;
      const x = gsap.utils.clamp(8, window.innerWidth - w - 8, px + 30);
      const y = gsap.utils.clamp(8, window.innerHeight - h - 8, py - 120);
      if (instant) gsap.set(prev, { x, y });
      else { xTo(x); yTo(y); }
    };

    const show = (row) => {
      if (!known) return;               // niente da mostrare finché non sappiamo dov'è il mouse
      prev.src = row.dataset.preview;
      if (!visible) {
        visible = true;
        place(true);                    // piazzala subito sotto il cursore: mai più l'angolo in alto a sinistra
        gsap.to(prev, { autoAlpha: 1, scale: 1, rotation: gsap.utils.random(-6, 6), duration: 0.35, ease: "back.out(2)" });
      }
    };

    const hide = () => {
      if (!visible) return;
      visible = false;
      gsap.to(prev, { autoAlpha: 0, scale: 0.7, duration: 0.25, ease: "power2.out" });
    };

    // sorgente di verità: cosa c'è davvero sotto il puntatore
    const sync = () => {
      if (!known) return;
      const row = document.elementFromPoint(px, py)?.closest(".wi-row");
      if (row) show(row); else hide();
    };

    window.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;
      px = e.clientX; py = e.clientY; known = true;
      const row = e.target.closest(".wi-row");
      if (row) { show(row); place(false); }
      else hide();                      // rete di sicurezza se mouseleave non scatta
    }, { passive: true });

    // col mouse fermo la pagina scorre sotto: ricontrolla cosa c'è sotto il cursore
    window.addEventListener("scroll", () => { if (visible || known) sync(); }, { passive: true });
    index.addEventListener("pointerleave", hide);
    // puntatore fuori dalla finestra, tab in background, menu/carrello aperti
    document.addEventListener("pointerleave", hide);
    window.addEventListener("blur", hide);
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("resize", hide);
  }

  /* ---------- b2b: tilt del mock ---------- */
  if (hoverFine) {
    const mock = $("#b2bMock");
    gsap.set(mock, { transformPerspective: 900 });
    const rx = gsap.quickTo(mock, "rotationX", { duration: 0.6, ease: "power3" });
    const ry = gsap.quickTo(mock, "rotationY", { duration: 0.6, ease: "power3" });
    const shot = $(".b2b-shot");
    shot.addEventListener("mousemove", (e) => {
      const r = shot.getBoundingClientRect();
      ry(((e.clientX - r.left) / r.width - 0.5) * 10);
      rx(-((e.clientY - r.top) / r.height - 0.5) * 10);
    });
    shot.addEventListener("mouseleave", () => { rx(0); ry(0); });
  }
  gsap.from(".b2b-mock", {
    y: 90, opacity: 0, rotation: 6, duration: 1, ease: "back.out(1.3)",
    scrollTrigger: { trigger: ".b2b-shot", start: "top 85%" },
  });
  gsap.from($$(".b2b-list li"), {
    x: -40, opacity: 0, duration: 0.5, stagger: 0.08,
    scrollTrigger: { trigger: ".b2b-list", start: "top 88%" },
  });

  /* ---------- footer gigante ---------- */
  const giantChars = splitChars($("#footerGiant"));
  gsap.from(giantChars, {
    yPercent: 105, duration: 0.8, stagger: 0.045, ease: "power4.out",
    scrollTrigger: { trigger: ".footer", start: "top 75%" },
  });
  if (hoverFine) {
    giantChars.forEach((ch) => {
      ch.addEventListener("mouseenter", () => {
        gsap.timeline()
          .to(ch, { y: -22, color: "#ffc233", duration: 0.18, ease: "power2.out" })
          .to(ch, { y: 0, color: "#f3efe6", duration: 0.5, ease: "bounce.out" });
      });
    });
  }

  /* ---------- indice: righe ---------- */
  gsap.from($$(".wi-row"), {
    y: 40, opacity: 0, duration: 0.55, stagger: 0.07, clearProps: "all",
    scrollTrigger: { trigger: "#wineIndex", start: "top 85%" },
  });

  /* ---------- bottone flottante: sparisce sul footer ---------- */
  ScrollTrigger.create({
    trigger: ".footer",
    start: "top 92%",
    onEnter: () => gsap.to(".btn-float", { y: 120, opacity: 0, duration: 0.35, ease: "power2.in" }),
    onLeaveBack: () => gsap.to(".btn-float", { y: 0, opacity: 1, duration: 0.4, ease: "power3.out" }),
  });

  /* ---------- refresh ---------- */
  window.addEventListener("load", () => ScrollTrigger.refresh());
})();
