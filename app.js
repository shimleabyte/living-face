(() => {
  "use strict";

  const root = document.documentElement;
  const body = document.body;
  const stage = document.getElementById("face-stage");
  const face = document.getElementById("living-face");
  const modeButtons = Array.from(document.querySelectorAll("[data-mode-target]"));
  const coordinateX = document.getElementById("coordinate-x");
  const coordinateY = document.getElementById("coordinate-y");
  const stageModeLabel = document.getElementById("stage-mode-label");
  const expressionState = document.getElementById("expression-state");
  const resetButton = document.getElementById("reset-gaze");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  if (!stage || !face || modeButtons.length !== 3) {
    return;
  }

  const modeLabels = {
    cartoon: "INKED STUDY",
    pixel: "16-BIT SPRITE",
    hyper: "VOLUMETRIC STUDY"
  };

  let pointerX = 0;
  let pointerY = 0;
  let framePending = false;
  let blinkTimer = 0;
  let speakingTimer = 0;
  let pointerActive = false;

  const formatCoordinate = (value) => {
    const sign = value < 0 ? "" : "+";
    return sign + value.toFixed(2);
  };

  const setCoordinates = (x, y) => {
    pointerX = Math.max(-1, Math.min(1, x));
    pointerY = Math.max(-1, Math.min(1, y));

    const gazeScaleX = 8;
    const gazeScaleY = 5;
    let gazeX = pointerX * gazeScaleX;
    let gazeY = pointerY * gazeScaleY;

    if (body.dataset.mode === "pixel") {
      const pixelUnit = 5;
      gazeX = Math.round(gazeX / pixelUnit) * pixelUnit;
      gazeY = Math.round(gazeY / pixelUnit) * pixelUnit;
    }

    root.style.setProperty("--mouse-x", pointerX.toFixed(4));
    root.style.setProperty("--mouse-y", pointerY.toFixed(4));
    root.style.setProperty("--gaze-x", gazeX.toFixed(2) + "px");
    root.style.setProperty("--gaze-y", gazeY.toFixed(2) + "px");

    if (coordinateX) coordinateX.value = formatCoordinate(pointerX);
    if (coordinateY) coordinateY.value = formatCoordinate(pointerY);
  };

  const flushPointer = () => {
    framePending = false;
    if (!pointerActive) return;
    setCoordinates(pointerX, pointerY);
  };

  const handlePointerMove = (event) => {
    if (event.pointerType === "touch") {
      pointerActive = true;
    }

    pointerX = (event.clientX / Math.max(window.innerWidth, 1)) * 2 - 1;
    pointerY = (event.clientY / Math.max(window.innerHeight, 1)) * 2 - 1;

    if (!framePending) {
      framePending = true;
      window.requestAnimationFrame(flushPointer);
    }

    face.classList.add("is-awake");
  };

  const handlePointerLeave = (event) => {
    if (event.pointerType === "mouse" && event.relatedTarget === null) {
      pointerActive = false;
      setCoordinates(0, 0);
    }
  };

  const selectMode = (mode) => {
    if (!Object.prototype.hasOwnProperty.call(modeLabels, mode)) return;

    body.dataset.mode = mode;
    stageModeLabel.textContent = modeLabels[mode];

    modeButtons.forEach((button) => {
      const selected = button.dataset.modeTarget === mode;
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-pressed", String(selected));
      const state = button.querySelector(".mode-state");
      if (state) state.textContent = selected ? "ACTIVE" : "SELECT";
    });

    setCoordinates(pointerX, pointerY);
    expressionState.textContent = "EXPRESSION: NEUTRAL";
  };

  const scheduleBlink = () => {
    window.clearTimeout(blinkTimer);
    if (document.hidden || reducedMotion.matches) return;

    const delay = 2200 + Math.random() * 3600;
    blinkTimer = window.setTimeout(() => {
      face.classList.add("is-blinking");
      window.setTimeout(() => {
        face.classList.remove("is-blinking");
        scheduleBlink();
      }, 145);
    }, delay);
  };

  const triggerSpeechMotion = () => {
    window.clearTimeout(speakingTimer);
    face.classList.remove("is-speaking");
    void face.offsetWidth;
    face.classList.add("is-speaking");
    expressionState.textContent = "EXPRESSION: RESPONDING";
    speakingTimer = window.setTimeout(() => {
      face.classList.remove("is-speaking");
      expressionState.textContent = "EXPRESSION: NEUTRAL";
    }, 620);
  };

  modeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      selectMode(button.dataset.modeTarget);
    });

    button.addEventListener("focus", () => {
      face.classList.add("is-awake", "is-focused");
    });

    button.addEventListener("blur", () => {
      if (!modeButtons.some((item) => item === document.activeElement)) {
        face.classList.remove("is-focused");
      }
    });
  });

  window.addEventListener("pointermove", handlePointerMove, { passive: true });
  window.addEventListener("pointerout", handlePointerLeave, { passive: true });

  stage.addEventListener("pointerenter", () => {
    face.classList.add("is-awake");
  });

  stage.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "touch") return;
    face.classList.add("is-awake");
  });

  face.addEventListener("click", triggerSpeechMotion);

  if (resetButton) {
    resetButton.addEventListener("click", () => {
      pointerActive = false;
      setCoordinates(0, 0);
      expressionState.textContent = "EXPRESSION: RECENTERED";
      window.setTimeout(() => {
        expressionState.textContent = "EXPRESSION: NEUTRAL";
      }, 800);
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;

    const activeTag = document.activeElement && document.activeElement.tagName;
    if (activeTag === "INPUT" || activeTag === "TEXTAREA" || activeTag === "SELECT") return;

    const shortcuts = { "1": "cartoon", "2": "pixel", "3": "hyper" };
    if (shortcuts[event.key]) {
      selectMode(shortcuts[event.key]);
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      window.clearTimeout(blinkTimer);
      face.classList.remove("is-blinking");
    } else {
      scheduleBlink();
    }
  });

  reducedMotion.addEventListener?.("change", scheduleBlink);

  setCoordinates(0, 0);
  scheduleBlink();
})();
