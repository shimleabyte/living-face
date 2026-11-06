(() => {
  "use strict";

  const face = document.getElementById("living-face");
  const stage = document.getElementById("face-stage");
  const mouth = face && face.querySelector(".mouth-structure");
  const noseShadow = face && face.querySelector(".nose-cast-shadow");
  const irises = face ? Array.from(face.querySelectorAll(".iris")) : [];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  if (!face || !stage || !mouth || !noseShadow || irises.length !== 2) return;

  const state = {
    pointerX: 0,
    pointerY: 0,
    frame: 0,
    blinkTimer: 0,
    blinkEndTimer: 0,
    speechTimer: 0,
    speechAnimation: null
  };

  const clampUnit = (value) => Math.max(-1, Math.min(1, value));

  const applyMotionFrame = () => {
    state.frame = 0;
    if (document.hidden) return;

    const x = reducedMotion.matches ? 0 : state.pointerX;
    const y = reducedMotion.matches ? 0 : state.pointerY;

    face.style.transform =
      "translate3d(" + (x * -3).toFixed(2) + "px, " + (y * -2).toFixed(2) + "px, 0) " +
      "rotate(" + (x * 1.2).toFixed(2) + "deg)";

    const irisTransform =
      "translate3d(calc(-50% + " + (x * 8).toFixed(2) + "px), " +
      "calc(-50% + " + (y * 5).toFixed(2) + "px), 0)";

    for (const iris of irises) iris.style.transform = irisTransform;

    noseShadow.style.transform =
      "translate3d(" + (x * -3).toFixed(2) + "px, " + (y * -2).toFixed(2) + "px, 0)";
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
    } else {
      requestMotionFrame();
    }
  };

  const awakenFace = () => face.classList.add("is-awake");

  const handlePointerMove = (event) => {
    if (event.pointerType === "touch") return;

    setPointer(
      (event.clientX / Math.max(window.innerWidth, 1)) * 2 - 1,
      (event.clientY / Math.max(window.innerHeight, 1)) * 2 - 1
    );
    awakenFace();
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

  const triggerExpression = () => {
    awakenFace();

    if (state.speechAnimation) {
      state.speechAnimation.cancel();
      state.speechAnimation = null;
    }

    if (!reducedMotion.matches && typeof mouth.animate === "function") {
      state.speechAnimation = mouth.animate(
        [
          { scale: "1 1" },
          { scale: "1 1.16", offset: 0.42 },
          { scale: "1 1" },
          { scale: "1 1.1", offset: 0.78 },
          { scale: "1 1" }
        ],
        { duration: 520, easing: "cubic-bezier(.16, 1, .3, 1)", fill: "none" }
      );
      state.speechAnimation.onfinish = () => { state.speechAnimation = null; };
    }

    window.clearTimeout(state.speechTimer);
    state.speechTimer = window.setTimeout(() => {
      state.speechTimer = 0;
    }, 620);
  };

  window.addEventListener("pointermove", handlePointerMove, { passive: true });
  window.addEventListener("pointerout", (event) => {
    if (event.relatedTarget !== null) return;
    setPointer(0, 0);
  }, { passive: true });

  stage.addEventListener("pointerenter", awakenFace, { passive: true });
  stage.addEventListener("pointerdown", awakenFace, { passive: true });
  face.addEventListener("click", triggerExpression);
  face.addEventListener("focus", awakenFace);
  face.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    triggerExpression();
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
    window.clearTimeout(state.speechTimer);
    if (state.frame) window.cancelAnimationFrame(state.frame);
  }, { once: true });

  setPointer(0, 0, true);
  scheduleBlink();
})();
