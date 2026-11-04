/* ============================================================
   RHO system overview (#system-overview)
   Click a step of the search loop to see what it does and which
   parts of the runtime stack it touches; switch to Deployment to
   see what remains once the repository is frozen.
   ============================================================ */
(function () {
  "use strict";

  var root = document.getElementById("system-overview");
  if (!root) { return; }

  var STEPS = {
    run: {
      title: "1 · Run",
      text: "A candidate repository runs training trials in the simulator through the benchmark's host services. It earns a reward plus execution traces and judge scores on what went wrong.",
      parts: ["solver", "perception", "action", "vdm", "sim"]
    },
    rewrite: {
      title: "2 · Rewrite",
      text: "The repository, its traces, judge scores, and side information go to a tool-enabled coding agent with a multi-file editor and shell access. It edits many files at once and tests candidates in an isolated workspace with whitelisted access to the robot environment.",
      parts: ["solver"]
    },
    keep: {
      title: "3 · Keep the winners",
      text: "A child is kept only if it strictly beats its parent on a paired minibatch of trials (the acceptance gate). Children that pass are then scored on validation trials.",
      parts: []
    },
    library: {
      title: "4 · Build a library",
      text: "Accepted children join a validation-scored Pareto frontier over task coverage, a diverse library rather than a single greedy chain. The next generation samples its parent from this library, until the budget runs out.",
      parts: []
    }
  };
  var ORDER = ["run", "rewrite", "keep", "library"];
  var DEPLOY = {
    title: "Deployment",
    html: "When the budget runs out, RHO deploys what the search found: in our results, the single repository with the best mean validation reward (the best repository per task is another option). What runs depends on the kind of repository searched. On CaP-Bench we chose <a href=\"#robosuite-results\">fixed Python code</a>, so no LLM generates code at deployment. On RAI the repository is the <a href=\"#rai-results\">LLM agent's harness</a> (prompts and tools), so the LLM stays in the loop. On Graph-as-Policy it is a <a href=\"#gap-results\">skill graph</a>. The judge VLM is used only during search.",
    parts: ["solver", "perception", "action", "sim"]
  };

  var reduceMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var nodes = Array.prototype.slice.call(root.querySelectorAll(".sysov-node"));
  var modeBtns = Array.prototype.slice.call(root.querySelectorAll(".sysov-mode-btn"));
  var partEls = Array.prototype.slice.call(root.querySelectorAll("[data-part]"));
  var title = document.getElementById("sysov-detail-title");
  var text = document.getElementById("sysov-detail-text");
  var simName = document.getElementById("sysov-sim-name");
  var playBtn = document.getElementById("sysov-play");

  var mode = "search", step = "run", timer = 0, playing = false;

  function light(parts) {
    partEls.forEach(function (el) {
      el.classList.toggle("is-lit", parts.indexOf(el.getAttribute("data-part")) !== -1);
    });
  }

  function render() {
    root.classList.toggle("is-deploy", mode === "deploy");
    modeBtns.forEach(function (b) {
      var on = b.getAttribute("data-mode") === mode;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    nodes.forEach(function (n) {
      var on = mode === "search" && n.getAttribute("data-step") === step;
      n.classList.toggle("is-active", on);
      n.setAttribute("aria-pressed", on ? "true" : "false");
      n.disabled = mode === "deploy";
    });
    var d = mode === "deploy" ? DEPLOY : STEPS[step];
    title.textContent = d.title;
    if (d.html) { text.innerHTML = d.html; } else { text.textContent = d.text; }
    simName.textContent = mode === "deploy" ? "Simulator or real robot" : "Simulator";
    light(d.parts);
    playBtn.hidden = mode === "deploy";
  }

  function stop() {
    playing = false;
    clearInterval(timer);
    playBtn.innerHTML = "&#9654; Play the loop";
    playBtn.setAttribute("aria-pressed", "false");
  }
  function start() {
    if (reduceMotion) { return; }
    playing = true;
    playBtn.innerHTML = "&#10073;&#10073; Pause";
    playBtn.setAttribute("aria-pressed", "true");
    timer = setInterval(function () {
      step = ORDER[(ORDER.indexOf(step) + 1) % ORDER.length];
      render();
    }, 3200);
  }

  nodes.forEach(function (n) {
    n.addEventListener("click", function () { stop(); step = n.getAttribute("data-step"); render(); });
    n.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") { return; }
      e.preventDefault();
      var i = ORDER.indexOf(n.getAttribute("data-step"));
      var j = (i + (e.key === "ArrowRight" ? 1 : ORDER.length - 1)) % ORDER.length;
      stop(); step = ORDER[j]; render(); nodes[j].focus();
    });
  });
  modeBtns.forEach(function (b) {
    b.addEventListener("click", function () { stop(); mode = b.getAttribute("data-mode"); render(); });
  });
  playBtn.addEventListener("click", function () { playing ? stop() : start(); });

  render();
  if (!reduceMotion && "IntersectionObserver" in window) {
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting && !playing && mode === "search") { start(); obs.disconnect(); }
      });
    }, { threshold: 0.5 });
    obs.observe(root);
  }
})();
