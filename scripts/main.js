/* ============================================================
   YWAM Chiang Mai. Night into Day.
   Vanilla JS. No libraries.
   1. Lantern canvas hero (Canvas 2D, sprite-cached glows)
   2. Phase engine: flips body[data-phase] per section
   3. Scroll reveals + horizon line draw
   4. Nav state + mobile menu
   ============================================================ */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 1. Lantern canvas ---------- */
  var hero = document.querySelector(".hero");
  var canvas = document.getElementById("lanterns");

  if (canvas && hero && !reduceMotion && canvas.getContext) {
    initLanterns(canvas, hero);
  } else if (hero) {
    hero.classList.add("static-sky");
  }

  function initLanterns(canvas, hero) {
    var ctx = canvas.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = 0, H = 0;
    var COUNT = 80;
    var lanterns = [];
    var mouseX = 0.5, mouseY = 0.5;
    var running = true;
    var rafId = 0;

    // Pre-render one soft glow sprite. Drawing gradients per particle
    // per frame is the classic perf killer; drawImage of a cached
    // sprite keeps this cheap on mid-range phones.
    var sprite = document.createElement("canvas");
    var SPRITE = 64;
    sprite.width = SPRITE;
    sprite.height = SPRITE;
    var sctx = sprite.getContext("2d");
    var g = sctx.createRadialGradient(SPRITE / 2, SPRITE / 2, 0, SPRITE / 2, SPRITE / 2, SPRITE / 2);
    g.addColorStop(0, "rgba(255, 214, 140, 1)");
    g.addColorStop(0.25, "rgba(240, 170, 70, 0.85)");
    g.addColorStop(0.6, "rgba(220, 130, 40, 0.25)");
    g.addColorStop(1, "rgba(220, 130, 40, 0)");
    sctx.fillStyle = g;
    sctx.fillRect(0, 0, SPRITE, SPRITE);

    function resize() {
      W = hero.clientWidth;
      H = hero.clientHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = W + "px";
      canvas.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function spawn(anywhere) {
      // depth 0..1: far lanterns are small, slow, dim
      var depth = Math.random();
      return {
        x: Math.random() * W,
        y: anywhere ? Math.random() * H : H + 30,
        depth: depth,
        size: 5 + depth * 22,
        speed: 0.14 + depth * 0.5,
        swayAmp: 8 + depth * 22,
        swayFreq: 0.0004 + Math.random() * 0.0006,
        swayPhase: Math.random() * Math.PI * 2,
        flickerPhase: Math.random() * Math.PI * 2,
        alpha: 0.25 + depth * 0.6
      };
    }

    function frame(t) {
      if (!running) return;
      ctx.clearRect(0, 0, W, H);

      var px = (mouseX - 0.5) * 2; // -1..1
      var py = (mouseY - 0.5) * 2;

      for (var i = 0; i < lanterns.length; i++) {
        var l = lanterns[i];
        l.y -= l.speed;
        if (l.y < -40) lanterns[i] = l = spawn(false);

        var sway = Math.sin(t * l.swayFreq + l.swayPhase) * l.swayAmp;
        var flicker = 0.82 + 0.18 * Math.sin(t * 0.003 + l.flickerPhase);
        var parX = px * l.depth * 26;
        var parY = py * l.depth * 14;

        ctx.globalAlpha = l.alpha * flicker;
        ctx.drawImage(
          sprite,
          l.x + sway + parX - l.size,
          l.y + parY - l.size,
          l.size * 2,
          l.size * 2
        );
      }
      ctx.globalAlpha = 1;
      rafId = requestAnimationFrame(frame);
    }

    function start() {
      if (!running) {
        running = true;
        rafId = requestAnimationFrame(frame);
      }
    }
    function stop() {
      running = false;
      cancelAnimationFrame(rafId);
    }

    resize();
    for (var i = 0; i < COUNT; i++) lanterns.push(spawn(true));
    rafId = requestAnimationFrame(frame);

    window.addEventListener("resize", resize);

    hero.addEventListener("pointermove", function (e) {
      var r = hero.getBoundingClientRect();
      mouseX = (e.clientX - r.left) / r.width;
      mouseY = (e.clientY - r.top) / r.height;
    });

    // Pause when the hero scrolls away or the tab hides
    new IntersectionObserver(function (entries) {
      entries[0].isIntersecting ? start() : stop();
    }, { threshold: 0 }).observe(hero);

    document.addEventListener("visibilitychange", function () {
      document.hidden ? stop() : start();
    });
  }

  /* ---------- 2. Phase engine ---------- */
  // Each section declares data-phase. Whichever section straddles the
  // viewport midline sets the body phase. Sections stay reorderable
  // with zero JS edits.
  var phased = document.querySelectorAll("[data-phase]");
  if ("IntersectionObserver" in window) {
    var phaseIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          document.body.dataset.phase = entry.target.dataset.phase;
        }
      });
    }, { rootMargin: "-50% 0% -50% 0%", threshold: 0 });
    phased.forEach(function (el) { phaseIO.observe(el); });
  }

  /* ---------- 3. Reveals + horizon ---------- */
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduceMotion) {
    var revealIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          revealIO.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });
    reveals.forEach(function (el) { revealIO.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
  }

  var horizon = document.querySelector(".horizon");
  if (horizon && "IntersectionObserver" in window) {
    new IntersectionObserver(function (entries, io) {
      if (entries[0].isIntersecting) {
        horizon.classList.add("drawn");
        io.disconnect();
      }
    }, { threshold: 0.4 }).observe(horizon);
  }

  /* ---------- 4. Nav ---------- */
  var nav = document.getElementById("nav");
  var onScroll = function () {
    nav.classList.toggle("scrolled", window.scrollY > 40);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  var burger = document.getElementById("navBurger");
  var menu = document.getElementById("mobileMenu");
  if (burger && menu) {
    burger.addEventListener("click", function () {
      var open = burger.getAttribute("aria-expanded") === "true";
      burger.setAttribute("aria-expanded", String(!open));
      burger.setAttribute("aria-label", open ? "Open menu" : "Close menu");
      menu.hidden = open;
    });
    // Close the menu after any in-page navigation
    menu.addEventListener("click", function (e) {
      if (e.target.tagName === "A") {
        burger.setAttribute("aria-expanded", "false");
        burger.setAttribute("aria-label", "Open menu");
        menu.hidden = true;
      }
    });
  }
})();
