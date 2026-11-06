import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [html, css, js] = await Promise.all([
  readFile(new URL("../index.html", import.meta.url), "utf8"),
  readFile(new URL("../style.css", import.meta.url), "utf8"),
  readFile(new URL("../app.js", import.meta.url), "utf8")
]);

const requireMarkup = [
  "eyebrow--left",
  "eyebrow--right",
  "upper-eyelid",
  "lower-eyelid",
  "iris-ring--outer",
  "iris-ring--inner",
  "pupil-highlight--primary",
  "nose-structure",
  "nose-bridge",
  "nose-cast-shadow",
  "mouth-cavity",
  "teeth",
  "tongue"
];

for (const layer of requireMarkup) {
  assert.ok(html.includes(layer), "Missing facial DOM layer: " + layer);
}

for (const mode of ["cartoon", "pixel", "hyper"]) {
  assert.ok(html.includes('data-mode-target="' + mode + '"'), "Missing mode control: " + mode);
  assert.ok(css.includes('body[data-mode="' + mode + '"]'), "Missing mode styling: " + mode);
}

const htmlTokens = [...html.matchAll(/<\/?([a-zA-Z][\w-]*)\b[^>]*>/g)];
const voidTags = new Set([
  "area", "base", "br", "col", "embed", "hr", "img",
  "input", "link", "meta", "param", "source", "track", "wbr"
]);
const tagStack = [];

for (const token of htmlTokens) {
  const name = token[1].toLowerCase();
  const raw = token[0];

  if (raw.startsWith("</")) {
    const expected = tagStack.pop();
    assert.equal(name, expected, "Mismatched HTML closing tag: " + name);
  } else if (!raw.endsWith("/>") && !voidTags.has(name)) {
    tagStack.push(name);
  }
}

assert.deepEqual(tagStack, [], "HTML contains unclosed elements");

const cleanCss = css.replace(/\/\*[\s\S]*?\*\//g, "");
const countBalance = (source, open, close) => {
  let depth = 0;
  let minimum = 0;

  for (const character of source) {
    if (character === open) depth += 1;
    if (character === close) depth -= 1;
    minimum = Math.min(minimum, depth);
  }

  return { depth, minimum };
};

assert.deepEqual(countBalance(cleanCss, "{", "}"), { depth: 0, minimum: 0 });
assert.deepEqual(countBalance(cleanCss, "(", ")"), { depth: 0, minimum: 0 });
assert.doesNotMatch(cleanCss, /\{\s*\}/, "CSS contains an empty rule");
assert.doesNotMatch(cleanCss, /filter:\s*blur\(/i, "Blur filters re-entered the render path");
assert.doesNotMatch(cleanCss, /feTurbulence/i, "Procedural SVG turbulence re-entered the render path");
assert.doesNotMatch(cleanCss, /var\(--(?:mouse|gaze)-[xy]\)/, "Pointer state must not fan out through CSS variables");

const promotedLayers = [...cleanCss.matchAll(/will-change:\s*transform\s*;/g)];
assert.equal(promotedLayers.length, 4, "Keep explicit transform promotion limited to the four moving layer types");
assert.match(
  cleanCss,
  /body:not\(\[data-mode="hyper"\]\) \.face-base,[\s\S]*?transform-style:\s*flat;/,
  "Cartoon and pixel modes must flatten the shared 3D face tree"
);
assert.match(
  cleanCss,
  /body:not\(\[data-mode="hyper"\]\) \.face-stage\s*\{\s*perspective:\s*none;/,
  "Perspective must be disabled outside the hyper mode"
);
assert.match(
  cleanCss,
  /body\[data-mode="pixel"\] \.face-base\s*\{[^}]*filter:\s*none;/s,
  "Pixel mode must not filter the full facial subtree"
);

assert.match(js, /requestAnimationFrame/, "Pointer updates must be frame-coalesced");
assert.match(js, /style\.transform\s*=/, "Pointer movement must write compositor transforms directly");
assert.match(js, /100 - \(performance\.now\(\) - state\.lastReadoutAt\)/, "Diagnostic readout must be throttled");
assert.doesNotMatch(
  js,
  /\b(?:offsetWidth|offsetHeight|getBoundingClientRect|clientWidth|scrollHeight)\b/,
  "Pointer and expression handlers must not force layout reads"
);
assert.match(js, /\.animate\(/, "Expression motion must use Web Animations API");
assert.match(js, /stageModeLabel\.animate\(/, "Mode transitions must animate the small label, not the entire stage");
assert.match(js, /mode === "hyper"/, "Full 3D pointer motion must remain isolated to hyper mode");
assert.match(cleanCss, /\.mode-button:active\s*\{[^}]*transform:[^}]*scale\(/s, "Mode tabs need immediate tactile feedback");
assert.match(cleanCss, /\.reset-button:active\s*\{[^}]*transform:/s, "Reset control needs immediate tactile feedback");

console.log("Living Face performance contract passed.");
console.log("- Semantic facial DOM and all three visual modes are present.");
console.log("- HTML structure and CSS delimiter balance are valid.");
console.log("- Pointer motion is frame-coalesced and transform-only.");
console.log("- No forced layout reads, pointer CSS-variable fan-out or paint blur filters.");
console.log("- Diagnostic readout is throttled independently of animation.");
