/* ============================================================
   COENFER — area B2B demo · login finto + listino + ordine
   ============================================================ */

(function () {
  "use strict";

  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => [...(c || document).querySelectorAll(s)];
  const fmt = (n) => n.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

  const LISTINO = [
    { id: "enfer",    name: "Enfer DOC",        sub: "95% Petit Rouge · 12,5%", pub: 23, img: "assets/img/vino-enfer.jpg" },
    { id: "triskell", name: "Triskell",         sub: "Metodo classico · Mayolet", pub: 24, img: "assets/img/vino-triskell.jpg" },
    { id: "clos",     name: "Clos de l'Enfer",  sub: "Petit Rouge · appassimento", pub: 30, img: "assets/img/vino-clos-de-lenfer.jpg" },
    { id: "digne",    name: "Digne du Pape",    sub: "Il gioiello della cantina", pub: 41, img: "assets/img/vino-digne-du-pape.jpg" },
  ];
  const SCONTO = 0.2;
  const b2bPrice = (p) => Math.round(p * (1 - SCONTO) * 100) / 100;

  const qty = {};

  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove("show"), 2800);
  }

  /* ---------- viste ---------- */
  const loginView = $("#loginView");
  const dashView = $("#dashView");
  const logoutBtn = $("#logoutBtn");

  function showDash(name) {
    loginView.hidden = true;
    dashView.hidden = false;
    logoutBtn.hidden = false;
    $("#dashName").textContent = name;
    window.scrollTo(0, 0);
    requestAnimationFrame(() => $$(".fade-up").forEach((el, i) => setTimeout(() => el.classList.add("in"), 90 * i)));
  }
  function showLogin() {
    dashView.hidden = true;
    logoutBtn.hidden = true;
    loginView.hidden = false;
    $$(".fade-up").forEach((el) => el.classList.remove("in"));
  }

  /* ---------- login ---------- */
  const form = $("#loginForm");
  const femail = $("#femail");
  const fpass = $("#fpass");

  $("#passToggle").addEventListener("click", () => {
    const show = fpass.type === "password";
    fpass.type = show ? "text" : "password";
    $("#passToggle").textContent = show ? "Nascondi" : "Mostra";
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const emailOk = /.+@.+\..+/.test(femail.value.trim());
    const passOk = fpass.value.trim().length > 0;
    $("#errEmail").hidden = emailOk;
    femail.classList.toggle("bad", !emailOk);
    $("#errPass").hidden = passOk;
    fpass.classList.toggle("bad", !passOk);
    if (!emailOk) { femail.focus(); return; }
    if (!passOk) { fpass.focus(); return; }

    const btn = $("#loginBtn");
    btn.classList.add("loading");
    btn.textContent = "Un attimo…";
    setTimeout(() => {
      const raw = femail.value.split("@")[0].replace(/[._-]+/g, " ").trim();
      const name = raw ? raw.replace(/\b\w/g, (c) => c.toUpperCase()) : "Operatore";
      sessionStorage.setItem("coenfer_b2b", name);
      btn.classList.remove("loading");
      btn.textContent = "Entra nell'inferno →";
      showDash(name);
      toast("Benvenuti nell'area riservata (demo)");
    }, 650);
  });

  logoutBtn.addEventListener("click", () => {
    sessionStorage.removeItem("coenfer_b2b");
    showLogin();
  });

  /* ---------- listino ---------- */
  const table = $(".listino-table");
  LISTINO.forEach((w) => {
    qty[w.id] = 0;
    const row = document.createElement("div");
    row.className = "lt-row";
    row.setAttribute("role", "row");
    row.innerHTML = `
      <span class="lt-wine" role="cell">
        <img src="${w.img}" alt="" width="42" height="56" loading="lazy">
        <span><b>${w.name}</b><small>${w.sub}</small></span>
      </span>
      <span class="lt-pub" role="cell">${fmt(w.pub)}</span>
      <span class="lt-b2b" role="cell">${fmt(b2bPrice(w.pub))}</span>
      <span class="lt-stepper" role="cell">
        <button data-step="${w.id}:-6" aria-label="Togli un cartone di ${w.name}">−6</button>
        <output id="q-${w.id}" aria-live="polite">0</output>
        <button data-step="${w.id}:6" aria-label="Aggiungi un cartone di ${w.name}">+6</button>
      </span>`;
    table.appendChild(row);
  });

  function renderOrder() {
    const list = $("#ordineList");
    list.innerHTML = "";
    let bott = 0, tot = 0, saving = 0;
    LISTINO.forEach((w) => {
      const q = qty[w.id];
      $("#q-" + w.id).textContent = q;
      if (!q) return;
      bott += q;
      tot += q * b2bPrice(w.pub);
      saving += q * (w.pub - b2bPrice(w.pub));
      const li = document.createElement("li");
      li.innerHTML = `<span>${w.name} × ${q}</span><b>${fmt(q * b2bPrice(w.pub))}</b>`;
      list.appendChild(li);
    });
    $("#ordineEmpty").style.display = bott ? "none" : "block";
    $("#otBott").textContent = bott;
    $("#otSaving").textContent = fmt(saving);
    $("#otTotal").textContent = fmt(tot);
  }

  document.addEventListener("click", (e) => {
    const step = e.target.closest("[data-step]");
    if (step) {
      const [id, d] = step.dataset.step.split(":");
      qty[id] = Math.max(0, qty[id] + parseInt(d, 10));
      renderOrder();
    }
    if (e.target.closest("[data-demo-doc]")) {
      toast("Demo — documento disponibile nella versione definitiva");
    }
  });

  /* ---------- invio ordine ---------- */
  $("#sendOrder").addEventListener("click", () => {
    const bott = LISTINO.reduce((a, w) => a + qty[w.id], 0);
    if (!bott) { toast("Il cartone è vuoto: aggiungete almeno 6 bottiglie"); return; }
    $("#orderOkText").textContent = bott + " bottiglie in arrivo dall'inferno per " + $("#otTotal").textContent + ".";
    $("#orderOk").hidden = false;
    document.body.style.overflow = "hidden";
  });
  $("#orderOkClose").addEventListener("click", () => {
    $("#orderOk").hidden = true;
    document.body.style.overflow = "";
    LISTINO.forEach((w) => (qty[w.id] = 0));
    renderOrder();
  });

  renderOrder();

  /* ---------- auto-login se già dentro ---------- */
  const saved = sessionStorage.getItem("coenfer_b2b");
  if (saved) showDash(saved);
})();
