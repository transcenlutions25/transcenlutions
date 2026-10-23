/**
 * Exercise the real TayAuth React component in a DOM, with test-only inputs.
 * Run: node scripts/test-tay-password.mjs
 *
 * jsdom does not perform layout or synthesize a button click from Space/Enter.
 * These checks verify active CSS declarations, native button semantics, focus,
 * unblocked keyboard events and actual click behavior, not browser geometry or
 * end-to-end keyboard activation. All fetches are intercepted locally.
 */
import assert from "node:assert/strict";
import { after, test } from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { JSDOM } from "jsdom";

const require = createRequire(import.meta.url);
const ts = require("typescript");
for (const extension of [".ts", ".tsx"]) {
  require.extensions[extension] = (module, filename) => module._compile(
    ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: {
        esModuleInterop: true,
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
      },
      fileName: filename,
    }).outputText,
    filename,
  );
}

const dom = new JSDOM("<!doctype html><html><head></head><body></body></html>", {
  url: "https://transcenlutions.test/workspace",
  pretendToBeVisual: true,
});
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.HTMLElement = dom.window.HTMLElement;
Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// React DOM must be loaded after the browser globals for real input events.
const { createElement, act } = require("react");
const { createRoot } = require("react-dom/client");
const { TayAuth } = require("../components/tay/tay-auth.tsx");
const css = document.createElement("style");
css.textContent = readFileSync(new URL("../app/tay-command-consolidated.css", import.meta.url), "utf8");
document.head.append(css);
after(() => dom.window.close());

const testPassword = "Only a DOM test password 42!";

async function mount(t) {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const requests = [];
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async (path, options) => {
    requests.push({ path, body: JSON.parse(options.body) });
    // An expected error response avoids navigation; no network is contacted.
    return { ok: false, json: async () => ({ ok: false, error: "Test request intercepted." }) };
  };
  t.after(async () => {
    await act(async () => root.unmount());
    container.remove();
    globalThis.fetch = previousFetch;
  });
  await act(async () => root.render(createElement(TayAuth, {
    setup: { users: 1, ownerExists: true, ownerEmailConfigured: true },
  })));
  const get = (selector) => {
    const element = container.querySelector(selector);
    assert.ok(element, `Missing rendered element: ${selector}`);
    return element;
  };
  const button = (label) => {
    const element = [...container.querySelectorAll("button")].find((entry) => entry.textContent === label);
    assert.ok(element, `Missing button: ${label}`);
    return element;
  };
  const field = (label) => {
    const element = [...container.querySelectorAll("label")].find((entry) => entry.textContent === label);
    assert.ok(element?.control, `Missing labelled input: ${label}`);
    return element.control;
  };
  let submissions = 0;
  get("form").addEventListener("submit", () => submissions++);
  return { get, button, field, requests, submissions: () => submissions };
}

async function input(element, value) {
  await act(async () => {
    // Bypass React's value tracker to dispatch an actual changed input value.
    Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, "value").set.call(element, value);
    element.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  });
}

async function click(element) {
  await act(async () => element.click());
}

function assertVisibility(app, visible) {
  const field = app.get(".tl-password-field input");
  const toggle = app.get(".tl-password-toggle");
  assert.equal(field.type, visible ? "text" : "password");
  assert.equal(toggle.getAttribute("aria-label"), visible ? "Hide password" : "Show password");
  assert.equal(toggle.getAttribute("aria-pressed"), String(visible));
  assert.equal(toggle.title, visible ? "Hide password" : "Show password");
  assert.ok(toggle.querySelector(visible ? ".lucide-eye-off" : ".lucide-eye"));
  assert.equal(toggle.querySelector("svg").getAttribute("aria-hidden"), "true");
}

test("password starts hidden with accessible control and right-end CSS", async (t) => {
  const app = await mount(t);
  const field = app.get(".tl-password-field input");
  const toggle = app.get(".tl-password-toggle");
  assertVisibility(app, false);
  assert.equal(field.autocomplete, "current-password");
  assert.equal(toggle.getAttribute("aria-controls"), field.id);
  assert.equal(field.labels.length, 1);
  assert.equal(field.labels[0].textContent, "Password");
  assert.equal(toggle.parentElement, field.parentElement);
  assert.equal(window.getComputedStyle(field.parentElement).position, "relative");
  const style = window.getComputedStyle(toggle);
  assert.equal(style.position, "absolute");
  assert.match(style.right, /^\d+(?:\.\d+)?px$/);
  assert.ok(parseFloat(style.right) <= 8, "Control is anchored near the field's right end.");
  assert.ok(parseFloat(style.width) >= 44);
  assert.ok(parseFloat(style.height) >= 44);
  assert.ok(parseFloat(window.getComputedStyle(field).paddingRight) >= parseFloat(style.width) + parseFloat(style.right),
    "The field reserves enough right padding for the control.");
});

test("show and hide preserve the typed password without submitting", async (t) => {
  const app = await mount(t);
  const field = app.get(".tl-password-field input");
  const toggle = app.get(".tl-password-toggle");
  await input(app.get('input[type="email"]'), "owner@transcenlutions.test");
  await input(field, testPassword);
  assert.equal(app.get("form").checkValidity(), true, "A valid form makes accidental submit observable.");
  await click(toggle);
  assertVisibility(app, true);
  assert.equal(field.value, testPassword);
  await click(toggle);
  assertVisibility(app, false);
  assert.equal(field.value, testPassword);
  assert.equal(app.submissions(), 0);
  assert.deepEqual(app.requests, []);
  await click(app.button("Sign in"));
  assert.equal(app.submissions(), 1);
  assert.equal(app.requests.length, 1);
  assert.equal(app.requests[0].path, "/api/tay/session");
  assert.equal(app.requests[0].body.password, testPassword, "React state, as well as input DOM value, is preserved.");
});

test("native button is focusable and does not intercept Space or Enter", async (t) => {
  const app = await mount(t);
  const toggle = app.get(".tl-password-toggle");
  assert.ok(toggle instanceof dom.window.HTMLButtonElement);
  assert.equal(toggle.type, "button");
  assert.equal(toggle.tabIndex, 0);
  assert.equal(toggle.disabled, false);
  toggle.focus();
  assert.equal(document.activeElement, toggle);
  for (const [key, code] of [[" ", "Space"], ["Enter", "Enter"]]) {
    for (const type of ["keydown", "keyup"]) {
      const event = new dom.window.KeyboardEvent(type, { key, code, bubbles: true, cancelable: true });
      toggle.dispatchEvent(event);
      assert.equal(event.defaultPrevented, false);
    }
  }
  const focusRule = [...css.sheet.cssRules].find((rule) => rule.selectorText === ".tl-password-toggle:focus-visible");
  assert.ok(focusRule, "A visible keyboard-focus style exists.");
  assert.match(focusRule.style.getPropertyValue("outline"), /^2px solid/);
  assert.equal(app.submissions(), 0);
  // No native key activation claim: jsdom deliberately does not synthesize it.
});

test("invitation uses new-password, hides on mode switches, and keeps typed value", async (t) => {
  const app = await mount(t);
  await input(app.get('input[type="email"]'), "invited@transcenlutions.test");
  await input(app.get(".tl-password-field input"), testPassword);
  await click(app.get(".tl-password-toggle"));
  assertVisibility(app, true);
  await click(app.button("I have an invitation token"));
  assertVisibility(app, false);
  assert.equal(app.get(".tl-password-field input").autocomplete, "new-password");
  assert.equal(app.get(".tl-password-field input").value, testPassword);
  await input(app.field("Your name"), "Test Invitee");
  await input(app.field("Invitation token"), "test-only-invitation-token");
  assert.equal(app.get("form").checkValidity(), true);
  await click(app.get(".tl-password-toggle"));
  assertVisibility(app, true);
  await click(app.get(".tl-password-toggle"));
  assertVisibility(app, false);
  assert.equal(app.submissions(), 0);
  assert.deepEqual(app.requests, []);
  await click(app.button("Accept invitation"));
  assert.equal(app.requests.length, 1);
  assert.equal(app.requests[0].path, "/api/tay/invites/accept");
  assert.equal(app.requests[0].body.password, testPassword);
  assert.equal(app.requests[0].body.token, "test-only-invitation-token");
  await click(app.get(".tl-password-toggle"));
  await click(app.button("Back to sign in"));
  assertVisibility(app, false);
  assert.equal(app.get(".tl-password-field input").autocomplete, "current-password");
  assert.equal(app.get(".tl-password-field input").value, testPassword);
});
