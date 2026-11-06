(() => {
  "use strict";

  const body = document.body;
  const stage = document.getElementById("face-stage");
  const atmosphere = stage && stage.querySelector(".stage-atmosphere");
  const face = document.getElementById("living-face");
  const mouth = face && face.querySelector(".mouth-structure");
  const noseShadow = face && face.querySelector(".nose-cast-shadow");
  const irises = face ? Array.from(face.querySelectorAll(".iris")) : [];
  const modeButtons = Array.from(document.querySelectorAll("[data-mode-target]"));
  const coordinateX = document.getElementById("coordinate-x");
  const coordinateY = document.getElementById("coordinate-y");
  const stageModeLabel = document.getElementById("stage-mode-label");
  const expressionState = document.getElementById("expression-state");
  const resetButton = document.getElementById("reset-gaze");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  if (!stage || !face || !mouth || !noseShadow || irises.length !== 2 || modeButtons.length !== 3) return;

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
    speechAnimation: null,
    modeAnimation: null
  };

  const clampUnit = (value) => Math.max(-1, Math.min(1, value));
  const formatCoordinate = (value) => (value < 0 ? "" : "+") + value.toFixed(2);

  const renderReadout = () => {
    if (coordinateX) coordinateX.value = formatCoordinate(state.pointerX);
    if (coordinateY) coordinateY.value = formatCoordinate(state.pointerY);
    state.lastReadoutAt = performance.now();
    state.readoutTimer = 0;
  };

  // Coordinates are diagnostic text. They update at 10 Hz, outside the motion loop.
  const scheduleReadout = (immediate = false) => {
    const wait = Math.max(0, 100 - (performance.now() - state.lastReadoutAt));

    if (immediate || wait === 0) {
      window.clearTimeout(state.readoutTimer);
      renderReadout();
      return;
    }

    if (!state.readoutTimer) {
      state.readoutTimer = window.setTimeout(renderReadout, wait);
    }
  };

  const applyMotionFrame = (readoutImmediate = false) => {
    state.frame = 0;
    if (document.hidden) return;

    const x = reducedMotion.matches ? 0 : state.pointerX;
    const y = reducedMotion.matches ? 0 : state.pointerY;
    const mode = body.dataset.mode;
    let faceX = x;
    let faceY = y;
    let gazeX = x * 8;
    let gazeY = y * 5;
    let noseX = x * -3;
    let noseY = y * -2;
    let noseZ = -2;

    if (mode === "pixel") {
      // Quantize the silhouette and eye movement into sprite-like steps.
      faceX = Math.round(x * 4) / 4;
      faceY = Math.round(y * 4) / 4;
      face.style.transform =
        "translate3d(" + Math.round(faceX * -12) + "px, " + Math.round(faceY * -8) + "px, 0)";
      gazeX = Math.round(x * 8 / 2) * 2;
      gazeY = Math.round(y * 5 / 2) * 2;
      noseX = Math.round(faceX * -8);
      noseY = 0;
      noseZ = -1;
    } else if (mode === "hyper") {
      const radians = Math.PI / 180;
      const headX = Math.sin(x * 34 * radians) * -5;
      const headY = Math.sin(y * 26 * radians) * -3;
      face.style.transform =
        "translate3d(" + headX.toFixed(2) + "px, " + headY.toFixed(2) + "px, 0) " +
        "rotateX(" + (y * -2).toFixed(2) + "deg) rotateY(" + (x * 2.6).toFixed(2) + "deg)";
      noseX = Math.sin(x * 42 * radians) * -8;
      noseY = Math.cos(y * 35 * radians) * -4;
      noseZ = -4;
    } else {
      face.style.transform =
        "translate3d(" + (x * -3).toFixed(2) + "px, " + (y * -2).toFixed(2) + "px, 0) " +
        "rotateX(" + (y * -1.5).toFixed(2) + "deg) rotateY(" + (x * 2).toFixed(2) + "deg)";
    }

    const irisDepth = mode === "hyper" ? 12 : mode === "pixel" ? 0 : 7;
    const irisTransform =
      "translate3d(calc(-50% + " + gazeX.toFixed(2) + "px), " +
      "calc(-50% + " + gazeY.toFixed(2) + "px), " + irisDepth + "px)";

    for (const iris of irises) {
      iris.style.transform = irisTransform;
    }

    noseShadow.style.transform =
      "translate3d(" + noseX.toFixed(2) + "px, " + noseY.toFixed(2) + "px, " + noseZ + "px)";

    if (atmosphere) {
      atmosphere.style.transform =
        "translate3d(" + (x * -8).toFixed(2) + "px, " + (y * -5).toFixed(2) + "px, 0)";
    }

    scheduleReadout(readoutImmediate);
  };

  const requestMotionFrame = () => {
    if (!state.frame && !document.hidden) {
      state.frame = window.requestAnimationFrame(() => applyMotionFrame());
    }
  };

  const setPointer = (x, y, immediate = false) => {
    state.pointerX = clampUnit(x);
    state.pointerY = clampUnit(y);

    if (immediate) {
      if (state.frame) window.cancelAnimationFrame(state.frame);
      state.frame = 0;
      applyMotionFrame(true);
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
    if (state.modeAnimation) {
      state.modeAnimation.cancel();
      state.modeAnimation = null;
    }

    if (reducedMotion.matches || typeof face.animate !== "function") return;

    state.modeAnimation = stage.animate(
      [{ opacity: 0.88 }, { opacity: 1 }],
      {
        duration: 260,
        easing: "cubic-bezier(.16, 1, .3, 1)",
        fill: "none"
      }
    );

    state.modeAnimation.onfinish = () => {
      state.modeAnimation = null;
    };
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

    state.blinkTimer = window.setTimeout(() => {
      face.classList.add("is-blinking");
      state.blinkEndTimer = window.setTimeout(() => {
        face.classList.remove("is-blinking");
        scheduleBlink();
      }, 145);
    }, 2600 + Math.random() * 3400);
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
        { duration: 520, easing, fill: "none" }
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
      setPointer(0, 0, true);

      if (state.speechAnimation) {
        state.speechAnimation.cancel();
        state.speechAnimation = null;
      }

      if (state.modeAnimation) {
        state.modeAnimation.cancel();
        state.modeAnimation = null;
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
