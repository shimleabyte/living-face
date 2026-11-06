(() => {
  "use strict";

  const body = document.body;
  const stage = document.getElementById("face-stage");
  const atmosphere = stage && stage.querySelector(".stage-atmosphere");
  const face = document.getElementById("living-face");
  const mouth = face && face.querySelector(".mouth-structure");
  const modeButtons = Array.from(document.querySelectorAll("[data-mode-target]"));
  const coordinateX = document.getElementById("coordinate-x");
  const coordinateY = document.getElementById("coordinate-y");
  const stageModeLabel = document.getElementById("stage-mode-label");
  const expressionState = document.getElementById("expression-state");
  const resetButton = document.getElementById("reset-gaze");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  if (!stage || !face || !mouth || modeButtons.length !== 3) return;

  const modeLabels = Object.freeze({
    cartoon: "INKED STUDY",
    pixel: "16-BIT SPRITE",
    hyper: "VOLUMETRIC STUDY"
  });

  const modeControls = modeButtons.map((button) => ({
    button,
    state: button.querySelector(".mode-state")
  }));

  const state = {
    pointerX: 0,
    pointerY: 0,
    frame: 0,
    blinkTimer: 0,
    blinkEndTimer: 0,
    readoutTimer: 0,
    lastReadoutAt: 0,
    speechTimer: 0,
    speechAnimation: null
  };

  const clampUnit = (value) => Math.max(-1, Math.min(1, value));
  const formatCoordinate = (value) => (value < 0 ? "" : "+") + value.toFixed(2);

  const renderReadout = () => {
    if (coordinateX) coordinateX.value = formatCoordinate(state.pointerX);
    if (coordinateY) coordinateY.value = formatCoordinate(state.pointerY);
    state.lastReadoutAt = performance.now();
    state.readoutTimer = 0;
  };

  // The readout is informational, not part of the gaze loop. Cap it at ~10 Hz.
  const scheduleReadout = (immediate = false) => {
    const elapsed = performance.now() - state.lastReadoutAt;
    const wait = Math.max(0, 100 - elapsed);

    if (immediate || wait === 0) {
      window.clearTimeout(state.readoutTimer);
      renderReadout();
      return;
    }

    if (!state.readoutTimer) {
      state.readoutTimer = window.setTimeout(renderReadout, wait);
    }
  };

  const applyMotionFrame = () => {
    state.frame = 0;
    if (document.hidden) return;

    const x = state.pointerX;
    const y = state.pointerY;

    // Scope pointer variables to the face subtree, not the entire document.
    face.style.setProperty("--mouse-x", x.toFixed(4));
    face.style.setProperty("--mouse-y", y.toFixed(4));
    face.style.setProperty("--gaze-x", (x * 8).toFixed(2) + "px");
    face.style.setProperty("--gaze-y", (y * 5).toFixed(2) + "px");

    // A single composited atmosphere layer supplies the moving key-light cue.
    if (atmosphere) {
      atmosphere.style.transform =
        "translate3d(" + (-x * 8).toFixed(2) + "px, " + (-y * 5).toFixed(2) + "px, 0)";
    }

    scheduleReadout();
  };

  const requestMotionFrame = () => {
    if (!state.frame && !document.hidden) {
      state.frame = window.requestAnimationFrame(applyMotionFrame);
    }
  };

  const setPointer = (x, y, immediate = false) => {
    state.pointerX = clampUnit(x);
    state.pointerY = clampUnit(y);

    if (immediate) {
      if (state.frame) window.cancelAnimationFrame(state.frame);
      state.frame = 0;
      applyMotionFrame();
      scheduleReadout(true);
    } else {
      requestMotionFrame();
    }
  };

  const awakenFace = () => {
    if (!face.classList.contains("is-awake")) {
      face.classList.add("is-awake");
    }
  };

  const handlePointerMove = (event) => {
    setPointer(
      (event.clientX / Math.max(window.innerWidth, 1)) * 2 - 1,
      (event.clientY / Math.max(window.innerHeight, 1)) * 2 - 1
    );
    awakenFace();
  };

  const animateModeChange = () => {
    if (reducedMotion.matches || typeof face.animate !== "function") return;

    face.animate(
      [{ opacity: 0.88 }, { opacity: 1 }],
      {
        duration: 260,
        easing: "cubic-bezier(.16, 1, .3, 1)",
        fill: "none"
      }
    );
  };

  const selectMode = (mode) => {
    if (!Object.prototype.hasOwnProperty.call(modeLabels, mode) || body.dataset.mode === mode) return;

    body.dataset.mode = mode;
    if (stageModeLabel) stageModeLabel.textContent = modeLabels[mode];

    for (const control of modeControls) {
      const selected = control.button.dataset.modeTarget === mode;
      control.button.classList.toggle("is-active", selected);
      control.button.setAttribute("aria-pressed", String(selected));
      if (control.state) control.state.textContent = selected ? "ACTIVE" : "SELECT";
    }

    requestMotionFrame();
    animateModeChange();
    if (expressionState) expressionState.textContent = "EXPRESSION: NEUTRAL";
  };

  const stopBlink = () => {
    window.clearTimeout(state.blinkTimer);
    window.clearTimeout(state.blinkEndTimer);
    state.blinkTimer = 0;
    state.blinkEndTimer = 0;
    face.classList.remove("is-blinking");
  };

  const scheduleBlink = () => {
    window.clearTimeout(state.blinkTimer);
    window.clearTimeout(state.blinkEndTimer);
    state.blinkTimer = 0;
    state.blinkEndTimer = 0;

    if (document.hidden || reducedMotion.matches) return;

    const delay = 2600 + Math.random() * 3400;
    state.blinkTimer = window.setTimeout(() => {
      face.classList.add("is-blinking");
      state.blinkEndTimer = window.setTimeout(() => {
        face.classList.remove("is-blinking");
        scheduleBlink();
      }, 145);
    }, delay);
  };

  const triggerSpeechMotion = () => {
    awakenFace();

    if (state.speechAnimation) {
      state.speechAnimation.cancel();
      state.speechAnimation = null;
    }

    if (!reducedMotion.matches && typeof mouth.animate === "function") {
      const easing = body.dataset.mode === "pixel"
        ? "steps(2, end)"
        : "cubic-bezier(.16, 1, .3, 1)";

      state.speechAnimation = mouth.animate(
        [
          { scale: "1 1" },
          { scale: "1 1.16", offset: 0.42 },
          { scale: "1 1" },
          { scale: "1 1.1", offset: 0.78 },
          { scale: "1 1" }
        ],
        {
          duration: 520,
          easing,
          fill: "none"
        }
      );

      state.speechAnimation.onfinish = () => {
        state.speechAnimation = null;
      };
    }

    if (expressionState) expressionState.textContent = "EXPRESSION: RESPONDING";
    window.clearTimeout(state.speechTimer);
    state.speechTimer = window.setTimeout(() => {
      if (expressionState) expressionState.textContent = "EXPRESSION: NEUTRAL";
    }, 620);
  };

  for (const { button } of modeControls) {
    button.addEventListener("click", () => selectMode(button.dataset.modeTarget));
    button.addEventListener("focus", awakenFace);
  }

  window.addEventListener("pointermove", handlePointerMove, { passive: true });

  window.addEventListener("pointerout", (event) => {
    if (event.relatedTarget !== null) return;
    setPointer(0, 0);
  }, { passive: true });

  stage.addEventListener("pointerenter", awakenFace, { passive: true });
  stage.addEventListener("pointerdown", awakenFace, { passive: true });

  face.addEventListener("click", triggerSpeechMotion);
  face.addEventListener("focus", awakenFace);
  face.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    triggerSpeechMotion();
  });

  if (resetButton) {
    resetButton.addEventListener("click", () => {
      setPointer(0, 0, true);
      if (expressionState) expressionState.textContent = "EXPRESSION: RECENTERED";
      window.setTimeout(() => {
        if (expressionState) expressionState.textContent = "EXPRESSION: NEUTRAL";
      }, 700);
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;

    const activeTag = document.activeElement && document.activeElement.tagName;
    if (activeTag === "INPUT" || activeTag === "TEXTAREA" || activeTag === "SELECT") return;

    const shortcuts = { "1": "cartoon", "2": "pixel", "3": "hyper" };
    const nextMode = shortcuts[event.key];
    if (nextMode) selectMode(nextMode);
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopBlink();
      if (state.frame) window.cancelAnimationFrame(state.frame);
      state.frame = 0;
      return;
    }

    setPointer(0, 0, true);
    scheduleBlink();
  });

  const handleMotionPreference = () => {
    if (reducedMotion.matches) {
      stopBlink();
      if (state.speechAnimation) {
        state.speechAnimation.cancel();
        state.speechAnimation = null;
      }
    } else {
      scheduleBlink();
    }
  };

  if (typeof reducedMotion.addEventListener === "function") {
    reducedMotion.addEventListener("change", handleMotionPreference);
  } else {
    reducedMotion.addListener(handleMotionPreference);
  }

  window.addEventListener("pagehide", () => {
    stopBlink();
    window.clearTimeout(state.readoutTimer);
    window.clearTimeout(state.speechTimer);
    if (state.frame) window.cancelAnimationFrame(state.frame);
  }, { once: true });

  setPointer(0, 0, true);
  scheduleBlink();
})();
