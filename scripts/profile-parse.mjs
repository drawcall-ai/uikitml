import { instantiate, parse } from "../packages/uikitml/dist/index.js";

function makeFlatUi(count) {
  const children = Array.from({ length: count }, (_, index) => {
    const tone = index % 2 === 0 ? "even" : "odd";
    return `<div class="row ${tone}" width="240" height="24"><span>Item ${index}</span><button>Open</button></div>`;
  }).join("");
  return `<div flex-direction="column" width="640" height="${count * 24}">${children}</div>`;
}

const source = makeFlatUi(Number(process.argv[2] ?? 250));
const iterations = Number(process.argv[3] ?? 50);
const mode = process.argv[4] ?? "parse";

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

for (let index = 0; index < 3; index++) {
  const result = parse(source);
  if (!result.success) {
    throw new Error(JSON.stringify(result.errors.slice(0, 3), null, 2));
  }
}

globalThis.gc?.();

for (let index = 0; index < iterations; index++) {
  const result = parse(source);
  if (mode === "parse-instantiate" && result.success) {
    disposeComponentTree(instantiate(result.ast));
  }
}
