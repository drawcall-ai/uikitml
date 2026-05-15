import { performance } from "node:perf_hooks";
import { instantiate, parse } from "../packages/uikitml/dist/index.js";
import { tokenize } from "../packages/uikitml/dist/tokens.js";

const warmupMs = 200;
const measureMs = 600;

const smallUi = `<div width="320" height="180"><span>Hello UIKitML</span><button>Save</button></div>`;

function makeFlatUi(count) {
  const children = Array.from({ length: count }, (_, index) => {
    const tone = index % 2 === 0 ? "even" : "odd";
    return `<div class="row ${tone}" width="240" height="24"><span>Item ${index}</span><button>Open</button></div>`;
  }).join("");
  return `<div flex-direction="column" width="640" height="${count * 24}">${children}</div>`;
}

function makePlainFlatUi(count) {
  const children = Array.from({ length: count }, (_, index) => {
    return `<div><span>Item ${index}</span><button>Open</button></div>`;
  }).join("");
  return `<div>${children}</div>`;
}

function makeNestedUi(depth) {
  let source = "Leaf";
  for (let index = 0; index < depth; index++) {
    source = `<div class="level-${index}" width="320" height="24">${source}</div>`;
  }
  return source;
}

function timeOnce(fn) {
  const start = performance.now();
  fn();
  return performance.now() - start;
}

function disposeComponentTree(component) {
  const disposable = [];
  component.traverse((object) => {
    if (typeof object.dispose === "function") {
      disposable.push(object);
    }
  });
  for (const object of disposable.reverse()) {
    object.dispose();
  }
}

function parseAndDispose(source, options) {
  const result = parse(source, options);
  if (result.success) {
    disposeComponentTree(instantiate(result.ast));
  }
  return result;
}

function parseOnly(source, options) {
  return parse(source, options);
}

function runFor(fn, durationMs) {
  let iterations = 0;
  const start = performance.now();
  let elapsed = 0;
  while (elapsed < durationMs) {
    fn();
    iterations++;
    elapsed = performance.now() - start;
  }
  return { iterations, elapsed, hz: (iterations / elapsed) * 1_000, meanMs: elapsed / iterations };
}

function measureTask(name, fn) {
  runFor(fn, warmupMs);
  globalThis.gc?.();
  const best = [];
  for (let sample = 0; sample < 5; sample++) {
    const result = runFor(fn, measureMs);
    best.push(result.meanMs);
  }
  best.sort((a, b) => a - b);
  return { name, meanMs: best[0], hz: 1_000 / best[0] };
}

function measureFixed(name, fn, iterations) {
  fn();
  globalThis.gc?.();
  const samples = [];
  for (let sample = 0; sample < 3; sample++) {
    const start = performance.now();
    for (let index = 0; index < iterations; index++) {
      fn();
    }
    samples.push((performance.now() - start) / iterations);
    globalThis.gc?.();
  }
  samples.sort((a, b) => a - b);
  return { name, meanMs: samples[0], hz: 1_000 / samples[0] };
}

function assertParseSuccess(source) {
  const result = parse(source);
  if (!result.success) {
    throw new Error(`Fixture did not parse: ${JSON.stringify(result.errors.slice(0, 3), null, 2)}`);
  }
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
}

function formatRow({ name, meanMs, hz }) {
  return `${name.padEnd(34)} ${formatNumber(meanMs).padStart(10)} ms ${formatNumber(hz).padStart(12)} ops/s`;
}

function phaseBreakdown(name, source) {
  const tokenized = tokenize(source);
  const tokens = tokenized.tokens;
  const tokenCount = tokens.length;
  const parsed = parse(source);
  if (!parsed.success) {
    throw new Error("Fixture did not parse.");
  }
  parse(source, { validate: false });
  disposeComponentTree(instantiate(parsed.ast));
  parseAndDispose(source);
  globalThis.gc?.();

  const tokenizeMs = timeOnce(() => tokenize(source));
  const parseMs = timeOnce(() => parseOnly(source));
  const parseNoValidationMs = timeOnce(() => parseOnly(source, { validate: false }));
  const instantiateMs = timeOnce(() => disposeComponentTree(instantiate(parsed.ast)));
  const parseAndInstantiateMs = timeOnce(() => parseAndDispose(source));

  return {
    name,
    bytes: Buffer.byteLength(source, "utf8"),
    tokenCount,
    tokenizeMs,
    parseMs,
    parseNoValidationMs,
    instantiateMs,
    parseAndInstantiateMs,
  };
}

const fixtures = [
  ["small", smallUi],
  ["flat-100", makeFlatUi(100)],
  ["flat-250", makeFlatUi(250)],
  ["plain-flat-250", makePlainFlatUi(250)],
  ["flat-500", makeFlatUi(500)],
  ["nested-250", makeNestedUi(250)],
];

for (const [, source] of fixtures) {
  assertParseSuccess(source);
}

console.log(`Node ${process.version}`);
console.log("");
console.log("Throughput");
console.log("----------");
const parsedSmall = parse(smallUi);
const flat100 = parse(fixtures[1][1]);
const flat250 = parse(fixtures[2][1]);
if (!parsedSmall.success || !flat100.success || !flat250.success) {
  throw new Error("Fixture did not parse.");
}

const manySmall = measureTask("parse small UI to AST", () => parseOnly(smallUi));
console.log(formatRow(manySmall));
console.log(formatRow(measureTask("parse small UI no validation", () => parseOnly(smallUi, { validate: false }))));
console.log(formatRow(measureTask("instantiate small AST", () => disposeComponentTree(instantiate(parsedSmall.ast)))));
console.log(formatRow(measureTask("parse+instantiate small UI", () => parseAndDispose(smallUi))));
console.log(formatRow(measureFixed("parse flat-100 to AST", () => parseOnly(fixtures[1][1]), 10)));
console.log(formatRow(measureFixed("parse flat-100 no validation", () => parseOnly(fixtures[1][1], { validate: false }), 10)));
console.log(formatRow(measureFixed("instantiate flat-100 AST", () => disposeComponentTree(instantiate(flat100.ast)), 10)));
console.log(formatRow(measureFixed("parse+instantiate flat-100", () => parseAndDispose(fixtures[1][1]), 10)));
console.log(formatRow(measureFixed("parse flat-250 to AST", () => parseOnly(fixtures[2][1]), 2)));
console.log(formatRow(measureFixed("parse flat-250 no validation", () => parseOnly(fixtures[2][1], { validate: false }), 2)));
console.log(formatRow(measureFixed("instantiate flat-250 AST", () => disposeComponentTree(instantiate(flat250.ast)), 2)));
console.log(formatRow(measureFixed("parse+instantiate flat-250", () => parseAndDispose(fixtures[2][1]), 2)));
console.log(formatRow(measureFixed("parse plain-flat-250", () => parseOnly(fixtures[3][1]), 2)));
console.log(formatRow(measureFixed("parse nested-250", () => parseOnly(fixtures[5][1]), 2)));

console.log("");
console.log("Single-run phase breakdown");
console.log("--------------------------");
for (const item of fixtures.map(([name, source]) => phaseBreakdown(name, source))) {
  const token = `${item.tokenCount} tokens`.padStart(12);
  const bytes = `${item.bytes} bytes`.padStart(12);
  console.log(
    `${item.name.padEnd(12)} ${bytes} ${token} tokenize=${formatNumber(item.tokenizeMs).padStart(8)}ms parse=${formatNumber(item.parseMs).padStart(8)}ms parse-no-validation=${formatNumber(item.parseNoValidationMs).padStart(8)}ms instantiate=${formatNumber(item.instantiateMs).padStart(8)}ms parse+instantiate=${formatNumber(item.parseAndInstantiateMs).padStart(8)}ms`,
  );
}
