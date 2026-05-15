import { instantiate, parse, type ComponentSet, type ParseFailure, type UIKitComponent } from "@drawcall/uikitml";
import { Component, reversePainterSortStable, StyleSheet } from "@pmndrs/uikit";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { horizonComponentSet, lucideComponentSet } from "./kits.js";
import "./styles.css";

const defaultSource = `<style>
  .card {
    background-color: #111827;
    border-radius: 20;
    flex-direction: column;
    align-items: center;
  }

  .row {
    flex-direction: row;
    align-items: center;
  }

  .icon {
    color: #38bdf8;
  }

  .title {
    color: white;
    font-size: 28;
    font-weight: bold;
  }

  .copy {
    color: #cbd5e1;
    font-size: 15;
  }
</style>
<div class="card">
  <div class="row">
    <Sparkles class="icon" />
    <h2 class="title">UIKitML</h2>
  </div>
  <p class="copy">Strict markup into live pmndrs/uikit components.</p>
</div>`;

const editor = queryRequired<HTMLTextAreaElement>("#source-editor");
const errorPanel = queryRequired<HTMLElement>("#error-panel");
const kitSelect = queryRequired<HTMLSelectElement>("#kit-select");
const status = queryRequired<HTMLElement>("#parse-status");
const canvas = queryRequired<HTMLCanvasElement>("#preview-canvas");

editor.value = defaultSource;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.localClippingEnabled = true;
renderer.setTransparentSort(reversePainterSortStable);
renderer.setClearColor(0x0b1020, 1);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
camera.position.set(0, 0, 5);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 0, 0);

const clock = new THREE.Clock();
let currentRoot: UIKitComponent | undefined;
let parseTimer: number | undefined;

window.addEventListener("resize", resizeRenderer);
editor.addEventListener("input", scheduleParse);
kitSelect.addEventListener("change", scheduleParse);

resizeRenderer();
renderSource();
animate();

function getComponentSets(): ComponentSet[] {
  if (kitSelect.value === "horizon") {
    return [lucideComponentSet, horizonComponentSet];
  }
  return [lucideComponentSet];
}

function queryRequired<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (element == null) {
    throw new Error(`Missing element ${selector}.`);
  }
  return element;
}

function scheduleParse() {
  if (parseTimer != null) {
    window.clearTimeout(parseTimer);
  }
  parseTimer = window.setTimeout(renderSource, 120);
}

function renderSource() {
  parseTimer = undefined;
  const result = parse(editor.value, { componentSets: getComponentSets() });

  if (!result.success) {
    showErrors(result);
    clearCurrentRoot();
    return;
  }

  replaceStyleSheet(result.ast.stylesheet);
  clearCurrentRoot();
  currentRoot = instantiate(result.ast, { componentSets: getComponentSets() });
  currentRoot.position.set(0, 0.85, 0);
  scene.add(currentRoot);
  resolveRetainedClassLists(currentRoot);

  errorPanel.classList.remove("has-errors");
  errorPanel.textContent = "No parse errors";
  status.textContent = "Parsed";
}

function showErrors(result: ParseFailure) {
  errorPanel.classList.add("has-errors");
  errorPanel.replaceChildren(
    ...result.errors.map((error) => {
      const entry = document.createElement("div");
      entry.className = "error-entry";
      const position = error.range?.start;
      entry.textContent =
        position == null
          ? `${error.code}: ${error.message}`
          : `${error.code} at ${position.line}:${position.column}: ${error.message}`;
      return entry;
    }),
  );
  status.textContent = `${result.errors.length} error${result.errors.length === 1 ? "" : "s"}`;
}

function clearCurrentRoot() {
  if (currentRoot == null) {
    return;
  }
  disposeComponentTree(currentRoot);
  currentRoot = undefined;
}

function disposeComponentTree(root: UIKitComponent) {
  const disposable: UIKitComponent[] = [];
  root.traverse((object) => {
    if (object instanceof Component) {
      disposable.push(object as UIKitComponent);
    }
  });
  for (const component of disposable.reverse()) {
    component.dispose();
  }
}

function replaceStyleSheet(stylesheet: Record<string, Record<string, unknown>>) {
  for (const key of Object.keys(StyleSheet)) {
    delete StyleSheet[key];
  }
  Object.assign(StyleSheet, stylesheet);
}

function resolveRetainedClassLists(root: UIKitComponent) {
  root.traverse((object) => {
    if (!(object instanceof Component)) {
      return;
    }
    const classList = object.classList as unknown as { list?: string[]; set: (...classes: string[]) => void };
    const classes = [...(classList.list ?? [])];
    if (classes.length > 0) {
      classList.set(...classes);
    }
  });
}

function resizeRenderer() {
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, Math.floor(rect.width));
  const height = Math.max(1, Math.floor(rect.height));
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  controls.update();
  currentRoot?.update(delta);
  renderer.render(scene, camera);
}
