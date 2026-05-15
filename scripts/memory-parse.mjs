import { instantiate, parse } from "../packages/uikitml/dist/index.js";
import { tokenize } from "../packages/uikitml/dist/tokens.js";

const scenario = process.argv[2] ?? "small";
const iterations = Number(process.argv[3] ?? 100);
const mode = process.argv[4] ?? "parse";

const smallUi = `<div width="320" height="180"><span>Hello UIKitML</span><button>Save</button></div>`;

function makeFlatUi(count) {
  const children = Array.from({ length: count }, (_, index) => {
    const tone = index % 2 === 0 ? "even" : "odd";
    return `<div class="row ${tone}" width="240" height="24"><span>Item ${index}</span><button>Open</button></div>`;
  }).join("");
  return `<div flex-direction="column" width="640" height="${count * 24}">${children}</div>`;
}

const sources = {
  small: smallUi,
  flat100: makeFlatUi(100),
  flat250: makeFlatUi(250),
  flat500: makeFlatUi(500),
};

const source = sources[scenario];
if (source == null) {
  throw new Error(`Unknown scenario: ${scenario}`);
}

function mb(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function snapshot(label) {
  globalThis.gc?.();
  const memory = process.memoryUsage();
  console.log(`${label.padEnd(12)} heap=${mb(memory.heapUsed).padStart(9)} rss=${mb(memory.rss).padStart(9)}`);
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

snapshot("before");
for (let index = 0; index < iterations; index++) {
  if (mode === "tokenize") {
    tokenize(source);
  } else {
    const parseOptions = mode === "parse-no-validation" ? { validate: false } : undefined;
    const result = parse(source, parseOptions);
    if (!result.success) {
      throw new Error(JSON.stringify(result.errors.slice(0, 3), null, 2));
    }
    if (mode === "instantiate" || mode === "parse-instantiate-dispose") {
      disposeComponentTree(instantiate(result.ast));
    }
  }
}
snapshot("after");
