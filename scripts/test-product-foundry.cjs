// Product Foundry model tests: no credentials, network, purchases or publication.
const assert = require("node:assert/strict");
const { test } = require("node:test");
const { readFileSync } = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const ts = require("typescript");

const sourcePath = path.resolve(__dirname, "../lib/product-foundry.ts");
const compiled = ts.transpileModule(readFileSync(sourcePath, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, strict: true },
  fileName: sourcePath,
});
const foundryModule = new Module(sourcePath, module);
foundryModule.filename = sourcePath;
foundryModule.paths = Module._nodeModulePaths(path.dirname(sourcePath));
foundryModule._compile(compiled.outputText, sourcePath);

const {
  foundryLines, foundryProviders, findFoundryProduct,
  calculateFoundryEconomics, createFoundryPrompt, productRequirements,
  productFoundryLiveExecutionEnabled,
} = foundryModule.exports;

test("all expected physical product divisions have distinct product concepts", () => {
  assert.ok(foundryLines.length >= 8);
  const unique = new Set();
  for (const line of foundryLines) {
    assert.ok(line.id && line.title && line.organization && line.products.length > 0);
    for (const product of line.products) {
      assert.ok(!unique.has(product.id), `Duplicate SKU concept: ${product.id}`);
      unique.add(product.id);
      assert.ok(product.title && product.summary && product.fulfillment && product.risk.length);
      assert.equal(findFoundryProduct(product.id), product);
    }
  }
});

test("organics, herbs, oils, toys and electronics have meaningful blocking prerequisites", () => {
  const herbs = findFoundryProduct("herb-culinary");
  const oils = findFoundryProduct("botanical-aroma");
  const toy = findFoundryProduct("kids-toy");
  const plush = findFoundryProduct("crowne-plush");
  const electronics = findFoundryProduct("gaming-electronics");
  assert.ok(productRequirements(herbs).some(x => /organic certification/i.test(x)));
  assert.ok(productRequirements(herbs).some(x => /food business/i.test(x)));
  assert.ok(productRequirements(oils).some(x => /intended use/i.test(x)));
  assert.ok(productRequirements(oils).some(x => /hazard/i.test(x)));
  assert.ok(productRequirements(toy).some(x => /ASTM F963/i.test(x)));
  assert.ok(productRequirements(plush).some(x => /Children.s Product Certificate/i.test(x)));
  assert.ok(productRequirements(electronics).some(x => /FCC/i.test(x)));
});

test("every provider is disclosed as unconnected and live actions are disabled", () => {
  assert.equal(productFoundryLiveExecutionEnabled, false);
  assert.ok(foundryProviders.length >= 4);
  assert.ok(foundryProviders.every(provider => provider.status === "not_connected"));
});

test("unknown costs never become an invented profit", () => {
  const result = calculateFoundryEconomics({
    retail: 35, manufacturing: 10, shipping: null, packaging: 1, duties: 0,
    paymentFees: 1.5, platformPercent: 5, marketing: 3,
    returnsReserve: 2, monthlyOverhead: 29,
  });
  assert.equal(result.complete, false);
  assert.ok(result.missing.includes("Shipping cost"));
  assert.equal(result.contribution, null);
  assert.equal(result.contributionMargin, null);
  assert.equal(result.monthlyBreakEvenUnits, null);
});

test("verified numeric inputs compute order contribution and break-even correctly", () => {
  const result = calculateFoundryEconomics({
    retail: 35, manufacturing: 10, shipping: 5, packaging: 1, duties: 0,
    paymentFees: 1.5, platformPercent: 5, marketing: 3,
    returnsReserve: 2, monthlyOverhead: 29,
  });
  assert.equal(result.complete, true);
  assert.equal(result.contribution, 10.75);
  assert.equal(result.contributionMargin, 30.71);
  assert.equal(result.monthlyBreakEvenUnits, 3);
});

test("incomplete, zero-price, invalid or money-losing input is safe", () => {
  const template = {
    retail: 20, manufacturing: 22, shipping: 2, packaging: 0,
    duties: 0, paymentFees: 0, platformPercent: 0,
    marketing: 0, returnsReserve: 0, monthlyOverhead: 5,
  };
  const losing = calculateFoundryEconomics(template);
  assert.equal(losing.complete, true);
  assert.equal(losing.monthlyBreakEvenUnits, null);
  assert.equal(calculateFoundryEconomics({ ...template, retail: 0 }).complete, false);
  assert.equal(calculateFoundryEconomics({ ...template, platformPercent: 105 }).complete, false);
  assert.equal(calculateFoundryEconomics({ ...template, shipping: NaN }).complete, false);
});

test("generated Tay prompts are scoped, original and prohibit premature sale", () => {
  for (const line of foundryLines) {
    const prompt = createFoundryPrompt(line, line.products[0], "Keep the design original.");
    assert.ok(prompt.includes(line.title));
    assert.ok(prompt.includes(line.products[0].title));
    assert.ok(prompt.includes("UNPUBLISHED"));
    assert.ok(prompt.includes("do not") || prompt.includes("Do not"));
    assert.ok(prompt.includes("UNKNOWN"));
  }
  const oilLine = foundryLines.find(line => line.id === "botanicals");
  const oil = oilLine.products.find(product => product.id === "botanical-aroma");
  const prompt = createFoundryPrompt(oilLine, oil, "A".repeat(1000));
  assert.ok(prompt.length < 16000);
  assert.ok(prompt.includes("No therapeutic claims"));
});

test("Tay workspace contains a discoverable route and editable handoff", () => {
  const shell = readFileSync(path.resolve(__dirname, "../components/chat-shell.tsx"), "utf8");
  const route = readFileSync(path.resolve(__dirname, "../app/product-foundry/page.tsx"), "utf8");
  assert.ok(shell.includes("href=\"/product-foundry\""));
  assert.ok(shell.includes("tay:foundry:draft:v1"));
  assert.ok(route.includes("ProductFoundryWorkspace"));
});
