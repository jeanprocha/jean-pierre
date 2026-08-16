(function () {
  var root = document.documentElement;
  var SECTIONS = { stack: "Stack", projetos: "Projetos", contato: "Contato" };
  var DEFAULT_ORDER = ["stack", "projetos", "contato"];

  var CONFIG_KEYS = ["tema", "destaque", "cantos", "borda-grossura",
    "fundo", "fundo-anim", "nav-modo", "menu-icones", "contato-estilo",
    "anim-direcao", "movimento", "ordem-secoes", "idioma", "fonte", "tamanho", "trilha"];

  function store(key, value) {
    try {
      if (value) localStorage.setItem(key, value);
      else localStorage.removeItem(key);
    } catch (e) { /* modo privado */ }
  }
  function read(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }

  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function motionOff() {
    return root.getAttribute("data-motion") === "off" || prefersReduced;
  }

  function token(name) { return getComputedStyle(root).getPropertyValue(name); }

  function toHex(v) {
    v = (v || "").trim();
    if (v.charAt(0) === "#") {
      if (v.length === 4) return "#" + v[1] + v[1] + v[2] + v[2] + v[3] + v[3];
      return v.slice(0, 7);
    }
    var m = v.match(/(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
    if (!m) return "#000000";
    return "#" + [m[1], m[2], m[3]].map(function (c) {
      return ("0" + parseInt(c, 10).toString(16)).slice(-2);
    }).join("");
  }
  function hexToRgb(hex) {
    var n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function accentRgb() { return (token("--accent").trim() || "255 167 36").split(/\s+/).join(","); }
  function groundRgb() { return hexToRgb(toHex(token("--ground"))).join(","); }

  /* ── destaque no elemento afetado ─────────────────────────────────────── */
  /* Por padrão só pulsa — mover a tela sob o dedo do usuário incomoda.
     Apenas o contato rola, porque ali o alvo é o próprio assunto. */
  function flash(selector, scroll) {
    if (!selector || motionOff()) return;
    var el = document.querySelector(selector);
    if (!el || getComputedStyle(el).display === "none") return;

    if (scroll) {
      var box = el.getBoundingClientRect();
      var visible = box.top < window.innerHeight * .85 && box.bottom > 60;
      if (!visible) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    el.classList.remove("is-flash");
    void el.offsetWidth;
    el.classList.add("is-flash");
    setTimeout(function () { el.classList.remove("is-flash"); }, 1300);
  }

  /* ── demonstração da animação ─────────────────────────────────────────────
     Reexibe o efeito onde o olho já está — sem rolar a tela. O truque é
     voltar ao estado inicial com a transição/animação desligada (.replay-off);
     sem isso o navegador só inverte a transição em curso e nada aparece. */
  function demoAnimation() {
    if (motionOff()) return;

    var hero = document.querySelector(".hero");
    var card = document.querySelector(".profile");
    var heroVisible = false;
    if (hero) {
      var hb = hero.getBoundingClientRect();
      heroVisible = hb.bottom > 90 && hb.top < window.innerHeight;
    }

    var reveals = Array.prototype.slice.call(document.querySelectorAll("[data-reveal]"))
      .filter(function (el) {
        var b = el.getBoundingClientRect();
        return b.top < window.innerHeight * .95 && b.bottom > 20;
      });

    if (!heroVisible && !reveals.length) return;

    if (heroVisible) {
      /* o tilt congela a animação do card em "none"; devolve o controle */
      if (card) { card.style.animation = ""; card.style.transform = ""; }
      hero.classList.add("replay-off");
    }
    reveals.forEach(function (el) {
      el.classList.add("replay-off");
      el.classList.remove("is-in");
    });

    void document.body.offsetWidth;

    requestAnimationFrame(function () {
      if (heroVisible) hero.classList.remove("replay-off");
      reveals.forEach(function (el) { el.classList.remove("replay-off"); });
      void document.body.offsetWidth;
      requestAnimationFrame(function () {
        reveals.forEach(function (el) { el.classList.add("is-in"); });
      });
    });
  }

  /* ── sistema central de opções ────────────────────────────────────────── */
  var canvasCtl = { start: function () {}, stop: function () {}, restart: function () {} };

  var OPTIONS = {
    cantos:  { attr: "data-cantos",  def: "padrao", flash: ".hero .profile" },
    bw:      { attr: "data-bw",      def: "1",      key: "borda-grossura", flash: ".hero .profile" },
    anim:    { attr: "data-anim",    def: "subir",  key: "anim-direcao",   after: demoAnimation },
    fundo:   { attr: "data-bg",      def: "solida",
               after: function (v) { if (v === "animada") canvasCtl.start(); else canvasCtl.stop(); } },
    bgvar:   { attr: "data-bg-var",  def: "rede",   key: "fundo-anim",
               after: function () { if (optValue("fundo") === "animada") canvasCtl.restart(); } },
    nav:     { attr: "data-nav",     def: "topo",   key: "nav-modo", flash: ".topbar",
               after: function () { closeNav(); } },
    contato: { attr: "data-contact", def: "bloco",  key: "contato-estilo",
               after: function (v) {
                 if (v === "flutuante") flash(".fab", true);
                 else { closeFab(); flash("#contato", true); }
               } }
  };

  function optKey(name) { return OPTIONS[name].key || name; }
  function optValue(name) { return root.getAttribute(OPTIONS[name].attr) || OPTIONS[name].def; }

  function syncButtons(selector, attr, value) {
    Array.prototype.forEach.call(document.querySelectorAll(selector), function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute(attr) === value));
    });
  }

  function setOption(name, value, opts) {
    var o = OPTIONS[name];
    if (value === o.def) root.removeAttribute(o.attr);
    else root.setAttribute(o.attr, value);
    store(optKey(name), value === o.def ? "" : value);
    syncButtons("[data-set-" + name + "]", "data-set-" + name, value);

    var announce = !opts || opts.announce !== false;
    if (announce && o.flash) flash(o.flash);
    if (o.after) o.after(value);
  }

  Object.keys(OPTIONS).forEach(function (name) {
    var sel = "[data-set-" + name + "]", attr = "data-set-" + name;
    syncButtons(sel, attr, optValue(name));
    Array.prototype.forEach.call(document.querySelectorAll(sel), function (b) {
      b.addEventListener("click", function () { setOption(name, b.getAttribute(attr)); });
    });
  });

  /* ── tema ─────────────────────────────────────────────────────────────── */
  function currentTheme() {
    return root.getAttribute("data-theme") ||
      (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
  }

  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    store("tema", theme);
    syncButtons("[data-set-theme]", "data-set-theme", theme);
    if (accentInput && !accentInput.classList.contains("is-on")) {
      accentInput.value = toHex(token("--signal"));
    }
  }

  function setTheme(theme, ev) {
    if (theme === currentTheme()) { applyTheme(theme); return; }
    if (document.startViewTransition && !motionOff()) {
      var x = ev && ev.clientX ? ev.clientX : window.innerWidth - 200;
      var y = ev && ev.clientY ? ev.clientY : 120;
      var vt = document.startViewTransition(function () { applyTheme(theme); });
      vt.ready.then(function () {
        var r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
        root.animate(
          { clipPath: ["circle(0px at " + x + "px " + y + "px)",
                       "circle(" + r + "px at " + x + "px " + y + "px)"] },
          { duration: 450, easing: "ease-in", pseudoElement: "::view-transition-new(root)" }
        );
      }).catch(function () {});
    } else applyTheme(theme);
  }

  syncButtons("[data-set-theme]", "data-set-theme", currentTheme());
  Array.prototype.forEach.call(document.querySelectorAll("[data-set-theme]"), function (b) {
    b.addEventListener("click", function (ev) { setTheme(b.getAttribute("data-set-theme"), ev); });
  });

  /* ── cor de destaque ──────────────────────────────────────────────────── */
  var ACCENTS = ["ambar", "ciano", "violeta", "verde"];
  var accentInput = document.getElementById("accent-custom");
  var accentWrap = accentInput ? accentInput.closest(".pickwrap") : null;

  function currentAccent() {
    var stored = read("destaque");
    if (stored && stored.indexOf("custom:") === 0) return "custom";
    return root.getAttribute("data-accent") || "ambar";
  }

  function markCustom(on) {
    if (!accentInput) return;
    accentInput.classList.toggle("is-on", on);
    if (accentWrap) accentWrap.classList.toggle("is-on", on);
  }

  function applyAccent(name) {
    root.style.removeProperty("--accent");
    root.style.removeProperty("--accent-deep");
    root.setAttribute("data-accent", name);
    store("destaque", name);
    syncButtons("[data-set-accent]", "data-set-accent", name);
    markCustom(false);
    if (accentInput) accentInput.value = toHex(token("--signal"));
  }

  function applyCustomAccent(hex) {
    var rgb = hexToRgb(hex);
    root.removeAttribute("data-accent");
    root.style.setProperty("--accent", rgb.join(" "));
    root.style.setProperty("--accent-deep", rgb.map(function (c) { return Math.round(c * .55); }).join(" "));
    store("destaque", "custom:" + hex);
    syncButtons("[data-set-accent]", "data-set-accent", "custom");
    markCustom(true);
  }

  syncButtons("[data-set-accent]", "data-set-accent", currentAccent());
  Array.prototype.forEach.call(document.querySelectorAll("[data-set-accent]"), function (s) {
    s.addEventListener("click", function () { applyAccent(s.getAttribute("data-set-accent")); });
  });

  if (accentInput) {
    var sa = read("destaque");
    if (sa && sa.indexOf("custom:") === 0) {
      accentInput.value = sa.slice(7);
      markCustom(true);
    } else {
      accentInput.value = toHex(token("--signal"));
    }
    accentInput.addEventListener("input", function () { applyCustomAccent(accentInput.value); });
  }

  function cycleAccent() {
    applyAccent(ACCENTS[(ACCENTS.indexOf(currentAccent()) + 1) % ACCENTS.length]);
  }

  /* ── animação ligada/desligada ────────────────────────────────────────── */
  if (!root.hasAttribute("data-motion") && prefersReduced) root.setAttribute("data-motion", "off");

  var motionToggle = document.getElementById("motion-toggle");
  var animGroup = document.getElementById("anim-dir-group");

  function syncMotion() {
    var off = motionOff();
    if (motionToggle) motionToggle.setAttribute("aria-checked", String(!off));
    if (animGroup) {
      animGroup.style.opacity = off ? ".38" : "";
      animGroup.style.pointerEvents = off ? "none" : "";
    }
  }
  if (motionToggle) {
    motionToggle.addEventListener("click", function () {
      var wasOff = root.getAttribute("data-motion") === "off";
      if (wasOff) root.removeAttribute("data-motion");
      else root.setAttribute("data-motion", "off");
      store("movimento", wasOff ? "" : "off");
      syncMotion();
      if (wasOff) demoAnimation();
    });
  }
  syncMotion();

  /* ── ícones no menu ───────────────────────────────────────────────────── */
  var naviconsToggle = document.getElementById("navicons-toggle");
  function naviconsOn() { return root.getAttribute("data-nav-icons") === "on"; }
  if (naviconsToggle) {
    naviconsToggle.setAttribute("aria-checked", String(naviconsOn()));
    naviconsToggle.addEventListener("click", function () {
      var on = !naviconsOn();
      if (on) root.setAttribute("data-nav-icons", "on");
      else root.removeAttribute("data-nav-icons");
      store("menu-icones", on ? "on" : "");
      naviconsToggle.setAttribute("aria-checked", String(on));
      flash(".topbar");
    });
  }

  /* ── ordem das seções ─────────────────────────────────────────────────── */
  var main = document.getElementById("topo");
  var nav = document.getElementById("site-nav");
  var orderList = document.getElementById("orderlist");
  var currentOrder = DEFAULT_ORDER.slice();

  function applyOrder(order) {
    order.forEach(function (id) {
      var section = main.querySelector('[data-section="' + id + '"]');
      var link = nav.querySelector('[data-nav-for="' + id + '"]');
      if (section) main.appendChild(section);
      if (link) nav.appendChild(link);
    });
  }

  var savedOrder = read("ordem-secoes");
  if (savedOrder) {
    try {
      var parsed = JSON.parse(savedOrder);
      if (Array.isArray(parsed) && parsed.length === DEFAULT_ORDER.length &&
          DEFAULT_ORDER.every(function (id) { return parsed.indexOf(id) !== -1; })) {
        currentOrder = parsed;
        applyOrder(currentOrder);
      }
    } catch (e) {}
  }

  function renderOrderList() {
    if (!orderList) return;
    orderList.innerHTML = "";
    currentOrder.forEach(function (id, i) {
      var li = document.createElement("li");
      li.setAttribute("draggable", "true");
      li.setAttribute("data-id", id);
      li.innerHTML =
        '<span class="grip" aria-hidden="true">⠿</span><span class="oname"></span>' +
        '<span class="ud">' +
          '<button type="button" data-dir="up"' + (i === 0 ? " disabled" : "") + '>↑</button>' +
          '<button type="button" data-dir="down"' + (i === currentOrder.length - 1 ? " disabled" : "") + '>↓</button>' +
        '</span>';
      li.querySelector(".oname").textContent = SECTIONS[id];
      li.querySelector('[data-dir="up"]').setAttribute("aria-label", "Mover " + SECTIONS[id] + " para cima");
      li.querySelector('[data-dir="down"]').setAttribute("aria-label", "Mover " + SECTIONS[id] + " para baixo");
      orderList.appendChild(li);
    });
  }

  function moveInArray(arr, from, to) {
    var copy = arr.slice();
    copy.splice(to, 0, copy.splice(from, 1)[0]);
    return copy;
  }

  if (orderList) {
    renderOrderList();

    orderList.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-dir]");
      if (!btn || btn.disabled) return;
      var id = btn.closest("li").getAttribute("data-id");
      var idx = currentOrder.indexOf(id);
      var to = btn.getAttribute("data-dir") === "up" ? idx - 1 : idx + 1;
      if (to < 0 || to >= currentOrder.length) return;
      currentOrder = moveInArray(currentOrder, idx, to);
      applyOrder(currentOrder);
      store("ordem-secoes", JSON.stringify(currentOrder));
      renderOrderList();
      flash('[data-section="' + id + '"]');
    });

    var dragId = null;
    orderList.addEventListener("dragstart", function (e) {
      var li = e.target.closest("li");
      if (!li) return;
      dragId = li.getAttribute("data-id");
      li.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
      try { e.dataTransfer.setData("text/plain", dragId); } catch (err) {}
    });
    orderList.addEventListener("dragover", function (e) {
      e.preventDefault();
      var li = e.target.closest("li");
      if (!li || !dragId) return;
      var overId = li.getAttribute("data-id");
      if (overId === dragId) return;
      currentOrder = moveInArray(currentOrder, currentOrder.indexOf(dragId), currentOrder.indexOf(overId));
      applyOrder(currentOrder);
      renderOrderList();
      var moving = orderList.querySelector('[data-id="' + dragId + '"]');
      if (moving) moving.classList.add("dragging");
    });
    orderList.addEventListener("dragend", function () {
      if (!dragId) return;
      store("ordem-secoes", JSON.stringify(currentOrder));
      renderOrderList();
      flash('[data-section="' + dragId + '"]');
      dragId = null;
    });
  }

  /* ── menu ─────────────────────────────────────────────────────────────── */
  var navToggle = document.getElementById("nav-toggle");
  function closeNav() {
    root.classList.remove("nav-open");
    if (navToggle) navToggle.setAttribute("aria-expanded", "false");
  }
  if (navToggle) {
    navToggle.addEventListener("click", function () {
      var open = root.classList.toggle("nav-open");
      navToggle.setAttribute("aria-expanded", String(open));
    });
  }
  Array.prototype.forEach.call(nav.querySelectorAll("a"), function (a) {
    a.addEventListener("click", function (e) {
      closeNav();
      if (a.getAttribute("data-nav-for") === "contato" && optValue("contato") === "flutuante") {
        e.preventDefault();
        openFab();
      }
    });
  });

  /* ── contato flutuante ────────────────────────────────────────────────── */
  var fabToggle = document.getElementById("fab-toggle");
  var fabPop = document.getElementById("fab-pop");

  function openFab() {
    root.classList.add("fab-open");
    if (fabToggle) fabToggle.setAttribute("aria-expanded", "true");
  }
  function closeFab() {
    root.classList.remove("fab-open");
    if (fabToggle) fabToggle.setAttribute("aria-expanded", "false");
  }
  if (fabToggle) {
    fabToggle.addEventListener("click", function (e) {
      e.stopPropagation();
      if (root.classList.contains("fab-open")) closeFab(); else openFab();
    });
  }
  document.addEventListener("click", function (e) {
    if (!root.classList.contains("fab-open")) return;
    if (fabPop && !fabPop.contains(e.target)) closeFab();
  });

  /* ── fundos animados: rede, matrix, fluxo ─────────────────────────────── */
  var canvas = document.getElementById("bg-canvas");
  var ctx = canvas ? canvas.getContext("2d") : null;

  if (ctx) {
    var running = false, raf = null, mode = "rede", lastTick = 0;
    var dots = [], mtx = [], lanes = [];
    var MTX_SIZE = 15;
    var CHARS = "0123456789ABCDEF";

    function sizeCanvas() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    /* rede: pontos à deriva que se ligam quando próximos */
    function seedRede() {
      var n = Math.max(18, Math.min(52, Math.round(window.innerWidth * window.innerHeight / 30000)));
      dots = [];
      for (var i = 0; i < n; i++) {
        dots.push({
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          vx: (Math.random() - .5) * .16,
          vy: (Math.random() - .5) * .16
        });
      }
    }
    function drawRede(step) {
      var w = window.innerWidth, h = window.innerHeight, rgb = accentRgb();
      ctx.clearRect(0, 0, w, h);
      if (step) {
        dots.forEach(function (d) {
          d.x += d.vx; d.y += d.vy;
          if (d.x < 0 || d.x > w) d.vx *= -1;
          if (d.y < 0 || d.y > h) d.vy *= -1;
        });
      }
      ctx.lineWidth = 1;
      for (var i = 0; i < dots.length; i++) {
        for (var j = i + 1; j < dots.length; j++) {
          var dx = dots[i].x - dots[j].x, dy = dots[i].y - dots[j].y;
          var dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 160) {
            ctx.strokeStyle = "rgba(" + rgb + "," + ((1 - dist / 160) * .18).toFixed(3) + ")";
            ctx.beginPath();
            ctx.moveTo(dots[i].x, dots[i].y);
            ctx.lineTo(dots[j].x, dots[j].y);
            ctx.stroke();
          }
        }
      }
      ctx.fillStyle = "rgba(" + rgb + ",0.6)";
      dots.forEach(function (d) {
        ctx.beginPath();
        ctx.arc(d.x, d.y, 1.7, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    /* matrix: chuva de dígitos hex; o rastro vem de pintar o fundo com
       pouca opacidade a cada quadro, em vez de redesenhar a coluna toda */
    function seedMatrix() {
      var n = Math.ceil(window.innerWidth / MTX_SIZE);
      mtx = [];
      for (var i = 0; i < n; i++) {
        mtx.push({
          y: Math.random() * -window.innerHeight,
          sp: 2 + Math.random() * 5
        });
      }
      ctx.fillStyle = "rgb(" + groundRgb() + ")";
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
    }
    function drawMatrix(step) {
      var w = window.innerWidth, h = window.innerHeight, rgb = accentRgb();
      ctx.fillStyle = "rgba(" + groundRgb() + ",0.09)";
      ctx.fillRect(0, 0, w, h);
      ctx.font = "700 " + MTX_SIZE + "px ui-monospace, monospace";
      ctx.textBaseline = "top";

      for (var i = 0; i < mtx.length; i++) {
        var col = mtx[i], x = i * MTX_SIZE;
        if (col.y > -MTX_SIZE && col.y < h) {
          ctx.fillStyle = "rgba(" + rgb + ",0.92)";
          ctx.fillText(CHARS.charAt(Math.floor(Math.random() * 16)), x, col.y);
          ctx.fillStyle = "rgba(" + rgb + ",0.34)";
          ctx.fillText(CHARS.charAt(Math.floor(Math.random() * 16)), x, col.y - MTX_SIZE);
        }
        if (step) col.y += col.sp;
        if (col.y > h + Math.random() * 500) {
          col.y = -MTX_SIZE;
          col.sp = 2 + Math.random() * 5;
        }
      }
    }

    /* fluxo: pacotes correndo por trilhas — a metáfora do próprio site */
    function seedFluxo() {
      var n = Math.max(4, Math.min(9, Math.round(window.innerHeight / 110)));
      lanes = [];
      for (var i = 0; i < n; i++) {
        var pk = [], c = 2 + Math.floor(Math.random() * 3);
        for (var j = 0; j < c; j++) {
          pk.push({
            x: Math.random() * window.innerWidth,
            sp: .5 + Math.random() * 1.5,
            w: 30 + Math.random() * 60
          });
        }
        lanes.push({ yf: (i + .5) / n, packets: pk });
      }
    }
    function drawFluxo(step) {
      var w = window.innerWidth, h = window.innerHeight, rgb = accentRgb();
      ctx.clearRect(0, 0, w, h);
      lanes.forEach(function (ln) {
        var y = Math.round(ln.yf * h) + .5;
        ctx.strokeStyle = "rgba(" + rgb + ",0.07)";
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();

        ln.packets.forEach(function (p) {
          var g = ctx.createLinearGradient(p.x - p.w, y, p.x, y);
          g.addColorStop(0, "rgba(" + rgb + ",0)");
          g.addColorStop(1, "rgba(" + rgb + ",0.45)");
          ctx.strokeStyle = g;
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(p.x - p.w, y); ctx.lineTo(p.x, y); ctx.stroke();

          ctx.fillStyle = "rgba(" + rgb + ",0.85)";
          ctx.beginPath(); ctx.arc(p.x, y, 2.2, 0, Math.PI * 2); ctx.fill();

          if (step) p.x += p.sp;
          if (p.x - p.w > w) p.x = -Math.random() * 240;
        });
      });
    }

    function seed() {
      if (mode === "matrix") seedMatrix();
      else if (mode === "fluxo") seedFluxo();
      else seedRede();
    }
    function draw(step) {
      if (mode === "matrix") drawMatrix(step);
      else if (mode === "fluxo") drawFluxo(step);
      else drawRede(step);
    }

    function loop(ts) {
      if (!running) return;
      /* matrix fica melhor em ~18fps: o passo largo é parte do efeito */
      if (mode === "matrix") {
        if (ts - lastTick > 55) { lastTick = ts; draw(true); }
      } else draw(true);
      raf = requestAnimationFrame(loop);
    }

    canvasCtl.start = function () {
      if (running) return;
      mode = optValue("bgvar");
      running = true;
      lastTick = 0;
      sizeCanvas();
      seed();
      if (motionOff()) { draw(false); return; }
      raf = requestAnimationFrame(loop);
    };
    canvasCtl.stop = function () {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    };
    canvasCtl.restart = function () {
      canvasCtl.stop();
      canvasCtl.start();
    };

    window.addEventListener("resize", function () {
      if (!running) return;
      sizeCanvas(); seed();
      if (motionOff()) draw(false);
    });
    document.addEventListener("visibilitychange", function () {
      if (!running || motionOff()) return;
      if (document.hidden) { if (raf) cancelAnimationFrame(raf); }
      else raf = requestAnimationFrame(loop);
    });

    if (optValue("fundo") === "animada") canvasCtl.start();
  }

  /* ── revelação no scroll ──────────────────────────────────────────────── */
  var revealEls = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) entry.target.classList.add("is-in");
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px" });
    Array.prototype.forEach.call(revealEls, function (el) { io.observe(el); });
  } else {
    Array.prototype.forEach.call(revealEls, function (el) { el.classList.add("is-in"); });
  }

  /* ── tilt no card de perfil ───────────────────────────────────────────── */
  var card = document.querySelector(".profile");
  if (card && window.matchMedia("(pointer: fine)").matches) {
    card.addEventListener("animationend", function () { card.style.animation = "none"; });
    card.addEventListener("pointermove", function (e) {
      if (motionOff()) return;
      var r = card.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - .5;
      var y = (e.clientY - r.top) / r.height - .5;
      card.style.transform = "perspective(900px) rotateX(" + (-y * 5).toFixed(2) +
        "deg) rotateY(" + (x * 6).toFixed(2) + "deg)";
    });
    card.addEventListener("pointerleave", function () { card.style.transform = ""; });
  }

  /* ── copiar ───────────────────────────────────────────────────────────── */
  function copyText(text, done) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { legacy(text, done); });
    } else legacy(text, done);
  }
  function legacy(text, done) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;top:-1000px";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); done(); } catch (e) {}
    document.body.removeChild(ta);
  }
  Array.prototype.forEach.call(document.querySelectorAll(".copy"), function (btn) {
    btn.addEventListener("click", function () {
      copyText(btn.getAttribute("data-copy"), function () {
        btn.classList.add("is-done");
        btn.setAttribute("aria-label", "E-mail copiado");
        setTimeout(function () {
          btn.classList.remove("is-done");
          btn.setAttribute("aria-label", "Copiar e-mail");
        }, 1900);
      });
    });
  });

  /* ── editor ───────────────────────────────────────────────────────────── */
  var editorBtn = document.getElementById("editor-open");
  var closeBtn = document.getElementById("editor-close");
  var scrim = document.getElementById("editor-scrim");

  function editorIsOpen() { return root.classList.contains("editor-open"); }
  function syncEditorBtn() {
    if (editorBtn) editorBtn.setAttribute("aria-expanded", String(editorIsOpen()));
  }
  function openEditor() { root.classList.add("editor-open"); syncEditorBtn(); }
  function closeEditor() { root.classList.remove("editor-open"); syncEditorBtn(); }
  function toggleEditor() { root.classList.toggle("editor-open"); syncEditorBtn(); }

  if (editorBtn) editorBtn.addEventListener("click", toggleEditor);
  if (closeBtn) closeBtn.addEventListener("click", closeEditor);
  if (scrim) scrim.addEventListener("click", closeEditor);

  var resetBtn = document.getElementById("editor-reset");
  if (resetBtn) {
    resetBtn.addEventListener("click", function () {
      Object.keys(OPTIONS).forEach(function (name) {
        setOption(name, OPTIONS[name].def, { announce: false });
      });
      root.removeAttribute("data-motion");
      root.removeAttribute("data-nav-icons");
      if (naviconsToggle) naviconsToggle.setAttribute("aria-checked", "false");
      syncMotion();

      root.removeAttribute("data-theme");
      applyTheme(window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
      applyAccent("ambar");

      currentOrder = DEFAULT_ORDER.slice();
      applyOrder(currentOrder);
      renderOrderList();

      root.removeAttribute("data-font");
      root.removeAttribute("data-rail");
      root.style.removeProperty("--fs");
      syncButtons("[data-set-font]", "data-set-font", "misto");
      if (fsRange) { fsRange.value = 100; }
      if (fsVal) fsVal.textContent = "100%";
      syncRail();
      currentLang = "pt";
      applyLang("pt");

      CONFIG_KEYS.forEach(function (k) { store(k, ""); });
      closeFab();

      var was = resetBtn.textContent;
      resetBtn.textContent = "Restaurado ✓";
      setTimeout(function () { resetBtn.textContent = was; }, 1600);
    });
  }


  /* ── idioma ───────────────────────────────────────────────────────────────
     Troca client-side: rápida e sem build. Vale registrar a limitação — o
     Google indexa só a versão inicial (pt-BR); duas URLs exigiriam servidor. */
  var I18N = {
    pt: {},   /* pt-BR é o que está escrito no HTML: dicionário vazio = original */
    en: {
      role: "Senior Full Stack",
      editar: "Edit interface",
      editarTit: "edit interface",
      navStack: "Stack", navProjetos: "Projects", navContato: "Contact",

      heroEyebrow: "Full stack · applied AI, automation &amp; integration",
      heroH1: '<span class="line"><span>I\u2019m Jean Pierre,</span></span>' +
              '<span class="line"><span>I make your systems <em>talk</em>.</span></span>',
      heroP1: "I am a Full Stack developer with over 6 years of experience, specialised in " +
              "systems automation and integration. I build end-to-end solutions, connecting ERPs, " +
              "APIs and platforms to turn manual processes into automated, monitored and " +
              "reliable operations.",
      heroP2: "My experience covers microservices, integrations running in production and " +
              "high-volume systems \u2014 from architecture and data modelling through to " +
              "development, deployment and support.",
      ctaContato: "Get in touch",
      ctaProjetos: "See projects",

      pPerfil: "profile",
      pStatus: "status", pStatusV: "open to roles and projects",
      stTop: "daily drivers",
      pLocal: "location", pFoco: "focus", pFocoV: "Applied AI · Go · React",
      pExp: "experience", pExpV: "6+ years",
      pGrad: "degree", pGradV: "Information Systems",

      heroP3: 'I hold a bachelor\u2019s degree in Information Systems from ' +
                 '<a class="org" href="https://www.unibrasil.com.br/" target="_blank" rel="noopener noreferrer">UniBrasil</a> ' +
                 'and, along the way, I have worked across very different contexts and projects: ' +
                 'blockchain projects (<a class="org" href="https://br.linkedin.com/company/intergalaxy" target="_blank" rel="noopener noreferrer">Intergalaxy</a> / ' +
                 '<a class="org" href="https://www.linkedin.com/company/insightsolutionbr/" target="_blank" rel="noopener noreferrer">Insight</a>) ' +
                 'and digital products for companies such as <a class="org" href="https://www.drogasil.com.br/" target="_blank" rel="noopener noreferrer">Drogasil</a>, ' +
                 '<a class="org" href="https://www.drogaraia.com.br/" target="_blank" rel="noopener noreferrer">Droga Raia</a> and ' +
                 '<a class="org" href="https://www.zonasul.com.br/" target="_blank" rel="noopener noreferrer">Zona Sul</a>, ' +
                 'plus projects delivered through consultancies like ' +
                 '<a class="org" href="https://harpiaconsultoria.com/" target="_blank" rel="noopener noreferrer">Harpia</a>, ' +
                 '<a class="org" href="https://www.cws-platform.com/" target="_blank" rel="noopener noreferrer">CWS</a>, ' +
                 '<a class="org" href="https://systemwiser.com/" target="_blank" rel="noopener noreferrer">SystemWiser</a> and ' +
                 '<a class="org" href="https://groundwork.com.br/" target="_blank" rel="noopener noreferrer">Groundwork</a>.',
      cvBtn: "Download CV (PDF)",
      secStack: "Stack", secStackSub: "what I run in production",
      stLing: "Languages", stFront: "Front-end", stBack: "Back-end", stDados: "Data",
      stMsg: "Messaging", stInfra: "Infra", stObs: "Observability",

      secProjetos: "Projects", secProjetosSub: "live · open source",
      noAr: "live",
      verDemo: "See it running", verCodigo: "Source", instalar: "Install",
      cat1: "\u00b7 AI & automation",
      cat2: "\u00b7 customer service & WhatsApp",
      p1Tit: "Workflow AI Platform",
      p1Hook: "AI automation \u2014 from the visual flow to the cost per run",
      p1P: "An AI-first platform for building automations with agents, RAG and MCP: visual " +
           "workflow editor, event-driven execution, multi-tenant and human approval with " +
           "durable pause \u2014 a flow stops midway, waits days for a decision and resumes " +
           "exactly where it left off. It measures <strong>tokens and cost in dollars per " +
           "run</strong> and suggests switching models when that does not compromise the task.",
      p1Tags: "<span>AI</span><span>RAG</span><span>MCP</span><span>NestJS</span><span>Next.js</span><span>PostgreSQL</span>",
      p2Tit: "Customer service on WhatsApp Web",
      p2Hook: "A service desk inside WhatsApp \u2014 with no server",
      p2P: "A Chrome extension that turns WhatsApp Web into a service channel: quick replies, " +
           "conversation tags, a visual flow editor with a simulator and a metrics panel \u2014 " +
           "funnel per flow, peak hours and time to first reply. It integrates with external " +
           "APIs and runs <strong>entirely in the browser</strong>: no data leaves the machine. " +
           "<strong>495 automated tests</strong>.",
      p2Tags: "<span>Extension</span><span>Manifest V3</span><span>Vue 3</span><span>Automation</span><span>TypeScript</span>",

      secContato: "Get in touch",
      contatoP: "<strong>I am looking for a senior position</strong> \u2014 full-time or " +
                "contract, remote \u2014 and I also take on automation and integration " +
                "projects. If you have a role, a referral or a manual process that should " +
                "be automatic, get in touch.",
      contatoRapido: "quick contact",

      grpTexto: "Text", grpAparencia: "Appearance", grpBordas: "Borders", grpLayout: "Layout",
      idioma: "Language", tipografia: "Typeface", tamanho: "Size",
      fontMisto: "Mixed", fontSans: "Sans", fontMono: "Mono", fontSerifa: "Serif",
      tema: "Theme", tEscuro: "Dark", tClaro: "Light",
      destaque: "Accent colour",
      animacao: "Motion", aSobe: "Up", aDesce: "Down", aSurge: "Fade", aCresce: "Scale",
      cantos: "Corners", cRetos: "Square", cPadrao: "Default", cRedondos: "Round",
      grossura: "Thickness",
      fundo: "Background", fSolido: "Solid", fAnimado: "Animated", fPontos: "Dots",
      movEstilo: "Motion style", mRede: "Network", mMatrix: "Matrix", mFluxo: "Flow",
      menu: "Menu", nTopo: "Top", nLateral: "Side", menuIcones: "Icons on items",
      contato: "Contact", coBloco: "Block", coFaixa: "Full band", coFlutuante: "Floating",
      ordem: "Section order", ordemDica: "Drag to reorder. The menu follows.",
      restaurar: "Reset everything",
      palPlaceholder: "Type a command\u2026", palVazio: "No command found."
    }
  };

  var ORIG = null;   /* guarda o texto original (pt-BR) na primeira troca */
  var langReady = false;

  function snapshotOriginal() {
    if (ORIG) return;
    ORIG = { text: {}, html: {}, ph: {} };
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      ORIG.text[el.getAttribute("data-i18n")] = el.innerHTML;
    });
    document.querySelectorAll("[data-i18n-html]").forEach(function (el) {
      ORIG.html[el.getAttribute("data-i18n-html")] = el.innerHTML;
    });
    document.querySelectorAll("[data-i18n-ph]").forEach(function (el) {
      ORIG.ph[el.getAttribute("data-i18n-ph")] = el.getAttribute("placeholder");
    });
    var h1 = document.querySelector(".hero h1");
    if (h1) ORIG.html.heroH1 = h1.innerHTML;
  }

  function applyLang(lang) {
    snapshotOriginal();
    var d = I18N[lang] || {};
    var fallback = lang === "pt";

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var k = el.getAttribute("data-i18n");
      var v = fallback ? ORIG.text[k] : d[k];
      if (v != null) el.innerHTML = v;
    });
    document.querySelectorAll("[data-i18n-html]").forEach(function (el) {
      var k = el.getAttribute("data-i18n-html");
      var v = fallback ? ORIG.html[k] : d[k];
      if (v != null) el.innerHTML = v;
    });
    document.querySelectorAll("[data-i18n-ph]").forEach(function (el) {
      var k = el.getAttribute("data-i18n-ph");
      var v = fallback ? ORIG.ph[k] : d[k];
      if (v != null) el.setAttribute("placeholder", v);
    });
    var h1 = document.querySelector(".hero h1");
    if (h1) {
      var v = fallback ? ORIG.html.heroH1 : d.heroH1;
      if (v != null) h1.innerHTML = v;
    }

    root.setAttribute("lang", lang === "en" ? "en" : "pt-BR");
    store("idioma", lang === "pt" ? "" : lang);
    syncButtons("[data-set-lang]", "data-set-lang", lang);
    /* na troca pelo usuário a hero foi reescrita: devolve a entrada.
       Na carga inicial não, senão atropela a animação natural. */
    if (langReady) demoAnimation();
  }

  var currentLang = read("idioma") === "en" ? "en" : "pt";
  syncButtons("[data-set-lang]", "data-set-lang", currentLang);
  if (currentLang === "en") applyLang("en");
  langReady = true;
  Array.prototype.forEach.call(document.querySelectorAll("[data-set-lang]"), function (b) {
    b.addEventListener("click", function () {
      currentLang = b.getAttribute("data-set-lang");
      applyLang(currentLang);
    });
  });

  /* ── tipografia e tamanho ─────────────────────────────────────────────── */
  function currentFont() { return root.getAttribute("data-font") || "misto"; }
  syncButtons("[data-set-font]", "data-set-font", currentFont());
  Array.prototype.forEach.call(document.querySelectorAll("[data-set-font]"), function (b) {
    b.addEventListener("click", function () {
      var v = b.getAttribute("data-set-font");
      if (v === "misto") root.removeAttribute("data-font");
      else root.setAttribute("data-font", v);
      store("fonte", v === "misto" ? "" : v);
      syncButtons("[data-set-font]", "data-set-font", v);
      flash(".hero .profile");
    });
  });

  var fsRange = document.getElementById("fs-range");
  var fsVal = document.getElementById("fs-val");
  function applyFs(pct) {
    root.style.setProperty("--fs", (pct / 100).toFixed(3));
    if (fsVal) fsVal.textContent = pct + "%";
    if (fsRange) fsRange.value = pct;
    store("tamanho", pct === 100 ? "" : String(pct));
  }
  if (fsRange) {
    var savedFs = parseInt(read("tamanho") || "100", 10);
    applyFs(isNaN(savedFs) ? 100 : savedFs);
    fsRange.addEventListener("input", function () { applyFs(parseInt(fsRange.value, 10)); });
  }

  /* ── menu lateral recolhível ──────────────────────────────────────────── */
  var railToggle = document.getElementById("rail-toggle");
  function railClosed() { return root.getAttribute("data-rail") === "fechado"; }
  function syncRail() {
    if (!railToggle) return;
    var fechado = railClosed();
    railToggle.setAttribute("aria-expanded", String(!fechado));
    var en = currentLang === "en";
    railToggle.setAttribute("aria-label",
      fechado ? (en ? "Expand menu" : "Expandir menu")
              : (en ? "Collapse menu" : "Recolher menu"));
  }
  if (railToggle) {
    railToggle.addEventListener("click", function () {
      if (railClosed()) root.removeAttribute("data-rail");
      else root.setAttribute("data-rail", "fechado");
      store("trilha", railClosed() ? "fechado" : "");
      syncRail();
    });
    syncRail();
  }

  /* ── progresso de leitura ─────────────────────────────────────────────── */
  var progTick = false;
  function updateProgress() {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    root.style.setProperty("--scrolled", max > 0 ? ((window.scrollY / max) * 100).toFixed(2) : "0");
    progTick = false;
  }
  window.addEventListener("scroll", function () {
    if (progTick) return;
    progTick = true;
    requestAnimationFrame(updateProgress);
  }, { passive: true });
  updateProgress();

  /* ── paleta de comandos (Ctrl+K) ──────────────────────────────────────── */
  var palette = document.getElementById("palette");
  var pInput = document.getElementById("palette-input");
  var pList = document.getElementById("palette-list");
  var pOpen = document.getElementById("palette-open");
  var pEmpty = palette ? palette.querySelector(".palette__empty") : null;
  var lastFocus = null;

  function pItems() { return Array.prototype.slice.call(pList.querySelectorAll("li")); }
  function pVisible() { return pItems().filter(function (li) { return !li.hidden; }); }
  function pActive(li) {
    pItems().forEach(function (el) { el.classList.remove("is-active"); });
    if (li) { li.classList.add("is-active"); li.scrollIntoView({ block: "nearest" }); }
  }
  function pFilter(q) {
    q = q.trim().toLowerCase();
    var any = false;
    pItems().forEach(function (li) {
      var hit = li.textContent.toLowerCase().indexOf(q) !== -1;
      li.hidden = !hit;
      if (hit && !any) { any = true; pActive(li); }
    });
    if (!any) pActive(null);
    if (pEmpty) pEmpty.hidden = any;
  }
  function openPalette() {
    if (!palette) return;
    lastFocus = document.activeElement;
    palette.hidden = false;
    pInput.value = "";
    pFilter("");
    pInput.focus();
  }
  function closePalette() {
    if (!palette || palette.hidden) return;
    palette.hidden = true;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function runCmd(btn) {
    var cmd = btn.getAttribute("data-cmd");
    var arg = btn.getAttribute("data-arg");

    if (cmd === "goto") {
      closePalette();
      if (arg === "contato" && optValue("contato") === "flutuante") { openFab(); return; }
      var t = document.getElementById(arg);
      if (t) t.scrollIntoView({ behavior: motionOff() ? "auto" : "smooth" });
    } else if (cmd === "theme") {
      setTheme(currentTheme() === "dark" ? "light" : "dark");
    } else if (cmd === "accent") {
      cycleAccent();
    } else if (cmd === "editor") {
      closePalette();
      openEditor();
    } else if (cmd === "open") {
      closePalette();
      window.open(arg, "_blank", "noopener");
    } else if (cmd === "copy-email") {
      copyText("jeanprocha89@gmail.com", function () {
        var label = btn.firstChild;
        var was = label.textContent;
        label.textContent = "E-mail copiado ✓";
        setTimeout(function () { label.textContent = was; closePalette(); }, 900);
      });
    }
  }

  if (palette) {
    if (pOpen) pOpen.addEventListener("click", openPalette);
    palette.addEventListener("click", function (e) {
      if (e.target === palette) { closePalette(); return; }
      var btn = e.target.closest("[data-cmd]");
      if (btn) runCmd(btn);
    });
    pInput.addEventListener("input", function () { pFilter(pInput.value); });
  }

  document.addEventListener("keydown", function (e) {
    var k = e.key.toLowerCase();

    if ((e.ctrlKey || e.metaKey) && k === "k") {
      e.preventDefault();
      if (palette.hidden) openPalette(); else closePalette();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && k === "e") {
      e.preventDefault();
      toggleEditor();
      return;
    }
    if (e.key === "Escape") {
      if (palette && !palette.hidden) { closePalette(); return; }
      if (editorIsOpen()) { closeEditor(); return; }
      if (root.classList.contains("nav-open")) { closeNav(); return; }
      if (root.classList.contains("fab-open")) { closeFab(); return; }
      return;
    }
    if (!palette || palette.hidden) return;

    var vis = pVisible();
    if (!vis.length) return;
    var idx = -1;
    vis.forEach(function (li, i) { if (li.classList.contains("is-active")) idx = i; });

    if (e.key === "ArrowDown") { e.preventDefault(); pActive(vis[(idx + 1) % vis.length]); }
    else if (e.key === "ArrowUp") { e.preventDefault(); pActive(vis[(idx - 1 + vis.length) % vis.length]); }
    else if (e.key === "Enter") {
      e.preventDefault();
      var a = vis[idx >= 0 ? idx : 0];
      if (a) runCmd(a.querySelector("[data-cmd]"));
    }
  });

  syncEditorBtn();
})();
