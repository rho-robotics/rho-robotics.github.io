/* ============================================================
   Where the LLM compute lives: one-trial race (#compute-race)
   Both lanes share one time axis (0 to 113.6 s). CaP-Agent0 lights
   its up-to-66 LLM/VLM calls across its mean trial time; RHO
   finishes at 9.31 s with zero code-generation calls.
   The HTML already shows the final state, so the section reads
   without JS and under prefers-reduced-motion.
   ============================================================ */
(function () {
  "use strict";

  var root = document.getElementById("compute-race");
  if (!root) { return; }

  var T_OLD = 113.6;      // CaP-Agent0 multi-turn mean trial time (s)
  var T_NEW = 9.31;       // RHO GPT-5.5 RaP mean trial time (s)
  var TURNS = 6, CALLS_PER_TURN = 11, CALLS = TURNS * CALLS_PER_TURN;
  var SPEED = 10;         // simulated seconds per real second

  var reduceMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var turnsHost = document.getElementById("race-turns");
  var fillOld = document.getElementById("race-fill-old");
  var fillNew = document.getElementById("race-fill-new");
  var timeOld = document.getElementById("race-time-old");
  var timeNew = document.getElementById("race-time-new");
  var callsOld = document.getElementById("race-calls-old");
  var axis = document.getElementById("race-axis");
  var playBtn = document.getElementById("race-play");
  var resetBtn = document.getElementById("race-reset");
  var status = document.getElementById("race-status");

  // Build the 6 x 11 call grid.
  var dots = [];
  for (var t = 0; t < TURNS; t++) {
    var turn = document.createElement("div");
    turn.className = "race-turn";
    var grid = document.createElement("div");
    grid.className = "race-dots";
    for (var c = 0; c < CALLS_PER_TURN; c++) {
      var d = document.createElement("span");
      d.className = "race-dot";
      grid.appendChild(d);
      dots.push(d);
    }
    var lab = document.createElement("span");
    lab.className = "race-turn-label";
    lab.textContent = "turn " + (t + 1);
    turn.appendChild(grid);
    turn.appendChild(lab);
    turnsHost.appendChild(turn);
  }

  // Shared time axis.
  [0, 30, 60, T_OLD].forEach(function (v) {
    var tick = document.createElement("span");
    tick.className = "race-tick" + (v === T_OLD ? " race-tick-end" : "");
    tick.style.left = (v / T_OLD * 100) + "%";
    tick.textContent = (v === T_OLD ? "113.6" : v) + " s";
    axis.appendChild(tick);
  });
  var rhoTick = document.createElement("span");
  rhoTick.className = "race-tick race-tick-rho";
  rhoTick.style.left = (T_NEW / T_OLD * 100) + "%";
  rhoTick.textContent = "9.31 s";
  axis.appendChild(rhoTick);

  function fmt(v) { return (v >= 100 ? v.toFixed(1) : v.toFixed(v < 10 ? 2 : 1)) + " s"; }

  function render(sim) {
    var so = Math.min(sim, T_OLD), sn = Math.min(sim, T_NEW);
    fillOld.style.width = (so / T_OLD * 100) + "%";
    fillNew.style.width = (sn / T_OLD * 100) + "%";
    timeOld.textContent = sim >= T_OLD ? "113.6 s" : fmt(so);
    timeNew.textContent = sim >= T_NEW ? "9.31 s" : fmt(sn);
    var lit = sim >= T_OLD ? CALLS : Math.floor(so / T_OLD * CALLS);
    for (var i = 0; i < dots.length; i++) { dots[i].classList.toggle("on", i < lit); }
    callsOld.textContent = String(lit);
    root.classList.toggle("rho-done", sim >= T_NEW);
    root.classList.toggle("old-done", sim >= T_OLD);
  }

  var raf = 0, startTs = 0, simAtStart = 0, sim = T_OLD, running = false, announcedRho = false;

  function setBtn() {
    playBtn.innerHTML = running ? "&#10073;&#10073; Pause" : (sim >= T_OLD ? "&#8635; Replay trial" : "&#9654; Play one trial");
    playBtn.setAttribute("aria-pressed", running ? "true" : "false");
  }

  function frame(ts) {
    if (!startTs) { startTs = ts; }
    sim = Math.min(T_OLD, simAtStart + (ts - startTs) / 1000 * SPEED);
    render(sim);
    if (!announcedRho && sim >= T_NEW) {
      announcedRho = true;
      status.textContent = "RHO finished the trial in 9.31 seconds with 0 code-generation calls.";
    }
    if (sim >= T_OLD) {
      running = false;
      status.textContent = "CaP-Agent0 finished the trial in 113.6 seconds with up to 66 LLM and VLM calls.";
      setBtn();
      return;
    }
    raf = requestAnimationFrame(frame);
  }

  function play() {
    if (reduceMotion) { sim = T_OLD; render(sim); setBtn(); return; }
    if (sim >= T_OLD) { sim = 0; announcedRho = false; }
    running = true; startTs = 0; simAtStart = sim;
    status.textContent = "Playing one trial at 10 times speed.";
    setBtn();
    raf = requestAnimationFrame(frame);
  }
  function pause() { running = false; cancelAnimationFrame(raf); setBtn(); }
  function reset() { pause(); sim = 0; announcedRho = false; render(sim); setBtn(); }

  playBtn.addEventListener("click", function () { running ? pause() : play(); });
  resetBtn.addEventListener("click", reset);

  // Start in the final state (fully readable); autoplay once when scrolled into view.
  render(sim);
  setBtn();
  if (window.rhoHoldSize) {
    window.rhoHoldSize(playBtn, ["&#10073;&#10073; Pause", "&#8635; Replay trial", "&#9654; Play one trial"], "width");
    // Ticking times keep their widest width (no re-wrap mid-play).
    window.rhoHoldSize(timeOld, ["113.6 s", "88.8 s"], "width");
    window.rhoHoldSize(timeNew, ["9.31 s", "8.88 s"], "width");
  }
  if (!reduceMotion && "IntersectionObserver" in window) {
    var seen = false;
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting && !seen) { seen = true; obs.disconnect(); sim = 0; play(); }
      });
    }, { threshold: 0.45 });
    obs.observe(root);
  }
})();
