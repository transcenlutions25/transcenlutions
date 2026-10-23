import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const json = (relative) => JSON.parse(read(relative));

const APPROVED = "public/tay/assets/Tay-approved-suit-fullbody-transparent-2026-10-17.png";
const MANIFEST = "public/tay/assets/manifest.json";

function pngHeader(file) {
  const bytes = fs.readFileSync(path.join(root, file));
  assert.equal(bytes.subarray(1, 4).toString("latin1"), "PNG", "asset must be a PNG");
  return {
    bytes: bytes.length,
    sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
    bitDepth: bytes[24],
    colorType: bytes[25],
  };
}

function makeDom({ reduced = false, intersection = true } = {}) {
  const dom = new JSDOM(`<!doctype html><html><body>
    <div id="root" class="app">
      <div class="shell">
        <aside class="sidebar">
          <div class="brand">TRANSCENLUTIONS</div>
          <div class="sidebar-head"><strong>Projects</strong><button id="newProject" type="button">New</button></div>
          <div id="projects"></div>
          <button id="logout" type="button">Sign out</button>
        </aside>
        <main class="main">
          <header class="topbar">
            <div class="workspace-title"><strong id="projectTitle">Preview</strong></div>
            <button id="refresh" type="button">Refresh</button>
          </header>
          <section id="messages"></section>
          <form id="composer"><textarea id="message"></textarea><button type="submit">Send</button></form>
        </main>
        <aside class="workspace-context" id="workspaceContext">
          <h2>Tay workspace</h2>
        </aside>
      </div>
    </div>
  </body></html>`, {
    url: "http://localhost/tay/index.html",
    runScripts: "outside-only",
    pretendToBeVisual: true,
  });
  const window = dom.window;
  Object.defineProperty(window.document, "visibilityState", { value: "visible", configurable: true });
  window.matchMedia = (query) => ({
    matches: query.includes("prefers-reduced-motion") ? reduced : false,
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent() { return false; },
  });
  if (intersection) {
    window.IntersectionObserver = class {
      constructor(callback) { this.callback = callback; }
      observe(element) {
        queueMicrotask(() => {
          if (typeof this.callback === "function") {
            this.callback([{ target: element, isIntersecting: true, intersectionRatio: 1 }]);
          }
        });
      }
      disconnect() {}
    };
  }
  window.eval(read("public/tay/portrait-presence.js"));
  window.eval(read("public/tay/workspace-parity.js"));
  return { dom, window, root: window.document.getElementById("root") };
}

async function settle() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function markPortraitReady(window, root) {
  const portrait = root.querySelector(".workspace-identity img");
  assert.ok(portrait, "the full-body header image must exist");
  Object.defineProperty(portrait, "complete", { value: true, configurable: true });
  Object.defineProperty(portrait, "naturalWidth", { value: 1024, configurable: true });
  portrait.dispatchEvent(new window.Event("load"));
  return portrait;
}

test("canonical Tay asset is the approved transparent full-body artwork", () => {
  const header = pngHeader(APPROVED);
  assert.deepEqual({ width: header.width, height: header.height }, { width: 1024, height: 1536 });
  assert.equal(header.colorType, 6, "PNG must carry an alpha channel (RGBA)");
  assert.equal(header.bitDepth, 8);

  const manifest = json(MANIFEST);
  assert.equal(manifest.agentId, "tay");
  assert.equal(manifest.asset.filename, path.basename(APPROVED));
  assert.equal(manifest.asset.width, header.width);
  assert.equal(manifest.asset.height, header.height);
  assert.equal(manifest.asset.bytes, header.bytes);
  assert.equal(manifest.asset.sha256, header.sha256);
  assert.match(manifest.asset.provenance, /black-and-gold suit/);
  assert.match(manifest.asset.provenance, /jewels/);
  assert.match(manifest.asset.provenance, /black cap/);
  assert.match(manifest.asset.provenance, /transparent background/);
});

test("the manifest declares only one motion and names everything that is missing", () => {
  const { motion } = json(MANIFEST);
  assert.equal(motion.id, "standing-sway-v1");
  assert.equal(motion.kind, "whole-cutout-transform");
  assert.equal(motion.cycleMilliseconds, 50000);
  assert.equal(motion.motionMilliseconds, 3000);
  assert.equal(motion.maxRotationDegrees, 0.6);
  assert.equal(motion.reducedMotion, "static");
  assert.equal(motion.pauseSupported, true);
  for (const missing of ["blinking", "gestures", "facial animation", "speech sync", "speaking state", "listening state"]) {
    assert.ok(motion.notImplemented.includes(missing), `${missing} must be declared unimplemented`);
  }
});

test("only the approved asset ships and the cover says exactly Transcenlutions", () => {
  const files = fs.readdirSync(path.join(root, "public/tay/assets"));
  assert.deepEqual(files.sort(), [path.basename(APPROVED), "manifest.json"]);
  assert.ok(!files.includes("Tay-canonical-ornate-suit-v1.png"), "the opaque duplicate must not ship");

  for (const relative of ["public/tay/index.html", "public/tay/workspace-parity.js", "public/tay/character-chat.mjs"]) {
    assert.doesNotMatch(read(relative), /Crowne Legacy/i, `${relative} must not claim the replaced title`);
  }

  const parity = read("public/tay/workspace-parity.js");
  assert.match(parity, /cover\.append\(coverPortrait, element\('figcaption', 'Transcenlutions'\)\)/);
  assert.match(parity, /coverImage\.src = 'assets\/Tay-approved-suit-fullbody-transparent-2026-10-17\.png'/);
  assert.match(parity, /coverImage\.width = 1024;coverImage\.height = 1536/);
  assert.match(parity, /portrait\.width = 72/);
  assert.match(parity, /portrait\.height = 108/);

  const css = read("public/tay/workspace-parity.css");
  assert.match(css, /\.workspace-cover-portrait\{[^}]*height:160px/);
  assert.match(css, /object-fit:cover;object-position:50% 6%/);
  assert.match(css, /@media\(max-width:760px\)\{[\s\S]*?\.workspace-brand-cover img\{object-position:50% 0%\}/);
  assert.match(css, /\.workspace-identity img\{width:72px;height:108px;object-fit:contain/);
  assert.match(css, /@keyframes tay-standing-sway\{/);
});

test("the optional character surface never fakes missing poses", async () => {
  const character = await import(path.join(root, "public/tay/character-chat.mjs"));
  assert.equal(character.parseCharacterCommand("/tay wave"), "wave");
  assert.equal(character.parseCharacterCommand("/tay show"), "show");
  assert.equal(character.parseCharacterCommand("please wave"), null);
  for (const command of ["wave", "sit"]) {
    const result = character.reduceCharacter({ visible: true, paused: true, edge: "right" }, command);
    assert.match(result.message, /layered character artwork/i);
    assert.match(result.message, /original standing pose/i);
  }
  const idle = character.companionReaction(
    { visible: true, paused: false, edge: "right", lastReaction: -Infinity },
    { now: 5000, button: true, sensitive: false, reducedMotion: false, hidden: false, mobile: false, selection: false },
  );
  assert.equal(idle.reaction, true);
  const throttled = character.companionReaction(idle.state, {
    now: 5200, button: true, sensitive: false, reducedMotion: false, hidden: false, mobile: false, selection: false,
  });
  assert.equal(throttled.reaction, false);
  const reduced = character.companionReaction(
    { visible: true, paused: false, edge: "right" },
    { now: 9000, button: true, sensitive: false, reducedMotion: true, hidden: false, mobile: false, selection: false },
  );
  assert.equal(reduced.reaction, false);
});

test("header companion fills the space, keeps the full body, and pauses locally", async () => {
  const { window, root } = makeDom();
  window.TayWorkspacePresentation.mount(root, "p1");
  const identity = root.querySelector(".workspace-identity");
  assert.ok(identity, "header identity must mount");
  assert.equal(identity.querySelector("img").getAttribute("width"), "72");
  assert.equal(identity.querySelector("img").getAttribute("height"), "108");
  assert.equal(identity.querySelector("img").getAttribute("alt"), "");
  markPortraitReady(window, root);
  await settle();

  const button = identity.querySelector(".portrait-motion");
  assert.ok(button, "pause control must exist");
  assert.equal(button.textContent, "Pause");
  assert.equal(button.disabled, false);
  assert.equal(identity.dataset.motionState, "playing");
  assert.equal(identity.dataset.motion, "playing");
  assert.equal(button.getAttribute("aria-pressed"), "false");
  const describedBy = button.getAttribute("aria-describedby");
  const description = window.document.getElementById(describedBy);
  assert.ok(description, "pause must reference its description");
  assert.match(description.textContent, /Decorative standing pose only/);
  assert.match(description.textContent, /does not indicate thinking, listening or task progress/);

  button.click();
  assert.equal(button.textContent, "Resume");
  assert.equal(identity.dataset.motionState, "paused");
  assert.equal(identity.dataset.motion, "still");
  assert.equal(button.getAttribute("aria-pressed"), "true");
  assert.deepEqual(JSON.parse(window.localStorage.getItem("tay.header.motion.v1")), { version: 1, paused: true });

  button.click();
  assert.equal(button.textContent, "Pause");
  assert.equal(identity.dataset.motionState, "playing");
  assert.deepEqual(JSON.parse(window.localStorage.getItem("tay.header.motion.v1")), { version: 1, paused: false });
});

test("cover is the left-panel centered portrait crop and history remains present", () => {
  const { window, root } = makeDom();
  window.TayWorkspacePresentation.mount(root, "p1");
  const sidebar = root.querySelector(".sidebar");
  const cover = sidebar.firstElementChild;
  assert.equal(cover.className, "workspace-brand-cover");
  const caption = cover.querySelector("figcaption");
  assert.equal(caption.textContent, "Transcenlutions");
  assert.equal(cover.getAttribute("aria-label"), "Transcenlutions cover");
  const image = cover.querySelector("img");
  assert.equal(image.getAttribute("src"), "assets/Tay-approved-suit-fullbody-transparent-2026-10-17.png");
  assert.match(image.getAttribute("alt"), /canonical ornate suit/);
  assert.equal(image.getAttribute("width"), "1024");
  assert.equal(image.getAttribute("height"), "1536");
  assert.ok(sidebar.querySelector(".workspace-history"), "conversation history must remain");
  assert.ok(root.querySelector(".workspace-context"), "context panel must remain");
});

test("opening the context panel suspends decoration instead of animating behind it", async () => {
  const { window, root } = makeDom();
  window.TayWorkspacePresentation.mount(root, "p1");
  markPortraitReady(window, root);
  await settle();
  const identity = root.querySelector(".workspace-identity");
  const button = identity.querySelector(".portrait-motion");
  const contextButton = [...root.querySelectorAll(".topbar button")].find((item) => item.textContent === "Workspace");
  assert.ok(contextButton);
  contextButton.click();
  assert.equal(identity.dataset.motionState, "suspended");
  assert.equal(button.disabled, true);
  assert.equal(button.textContent, "Paused");
  assert.match(button.getAttribute("aria-label"), /suspended while a workspace panel is open/);
  const closeButton = [...root.querySelectorAll(".workspace-context button")]
    .find((item) => item.textContent === "Close workspace panel");
  assert.ok(closeButton, "the real close control must exist");
  closeButton.click();
  assert.equal(identity.dataset.motionState, "playing");
});

test("reduced motion and missing visibility support fail to static art", async () => {
  const reducedDom = makeDom({ reduced: true });
  reducedDom.window.TayWorkspacePresentation.mount(reducedDom.root, "p1");
  markPortraitReady(reducedDom.window, reducedDom.root);
  await settle();
  const reducedIdentity = reducedDom.root.querySelector(".workspace-identity");
  const reducedButton = reducedIdentity.querySelector(".portrait-motion");
  assert.equal(reducedIdentity.dataset.motionState, "reduced-motion");
  assert.equal(reducedButton.disabled, true);
  assert.equal(reducedButton.textContent, "Off");
  assert.match(reducedButton.getAttribute("aria-label"), /reduced motion is enabled/);

  const noObserverDom = makeDom({ intersection: false });
  noObserverDom.window.TayWorkspacePresentation.mount(noObserverDom.root, "p1");
  markPortraitReady(noObserverDom.window, noObserverDom.root);
  await settle();
  const unavailableIdentity = noObserverDom.root.querySelector(".workspace-identity");
  const unavailableButton = unavailableIdentity.querySelector(".portrait-motion");
  assert.equal(unavailableIdentity.dataset.motionState, "unavailable");
  assert.equal(unavailableButton.disabled, true);
  assert.equal(unavailableButton.textContent, "Off");
});

test("a failed image leaves the workspace usable and only the decoration unavailable", async () => {
  const { window, root } = makeDom();
  window.TayWorkspacePresentation.mount(root, "p1");
  const portrait = root.querySelector(".workspace-identity img");
  portrait.dispatchEvent(new window.Event("error"));
  await settle();
  assert.equal(portrait.hidden, true);
  assert.equal(root.querySelector(".workspace-identity").dataset.motionState, "unavailable");
  assert.ok(root.querySelector("#message"), "composer must remain");
  assert.ok(root.querySelector("#logout"), "sign out must remain");
});

test("existing authentication, saved messages, drafts and review surfaces are preserved", () => {
  const html = read("public/tay/index.html");
  assert.match(html, /Sign in to Tay/);
  assert.match(html, /Forgot password\? Send a reset email/);
  assert.match(html, /Set a new Tay password/);
  assert.match(html, /New here\? Set up Tay/);
  assert.match(html, /loadProject/);
  assert.match(html, /renderShell/);
  assert.match(read("public/tay/workspace-parity.js"), /Unsent drafts stay in this tab/);
  assert.match(read("public/tay/conversation-tools.js"), /Edit as writing/);
  assert.match(read("public/tay/proposal-review.js"), /INACTIVE/);
  assert.match(read("public/tay/proposal-review.js"), /Activate unavailable/);
  assert.doesNotMatch(html, /SUPABASE_SERVICE|service_role/i, "no server credential may appear in the client");
});

test("/tay is a real entry point without replacing the root app", async () => {
  const html = read("public/tay/index.html");
  assert.match(html, /<base href="\/tay\/">/);
  const config = (await import(path.join(root, "next.config.mjs"))).default;
  assert.deepEqual(await config.rewrites(), [{ source: "/tay", destination: "/tay/index.html" }]);
  assert.ok(fs.existsSync(path.join(root, "app/page.tsx")), "the root application must remain");
  assert.ok(fs.existsSync(path.join(root, "app/api")), "the root APIs must remain");
});
