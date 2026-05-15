import { Component, Container, reversePainterSortStable, StyleSheet } from "@pmndrs/uikit";
import * as THREE from "three";
import { instantiate } from "../instantiate.js";
import { resolveKitComponentSets, type KitName } from "../kits.js";
import { parse } from "../parse.js";
import type { PreferredColorScheme, UIKitComponent } from "../types.js";

type RenderPayload = {
  source: string;
  kit: KitName;
  width?: number;
  height?: number;
  preferredColorScheme?: PreferredColorScheme;
};

type BrowserRenderResult =
  | { ok: true; width: number; height: number }
  | { ok: false; error: string };

const canvas = document.querySelector<HTMLCanvasElement>("#render-canvas");
if (canvas == null) {
  throw new Error("Missing render canvas.");
}

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.localClippingEnabled = true;
renderer.setTransparentSort(reversePainterSortStable);
renderer.setClearColor(0x000000, 0);
renderer.setPixelRatio(1);

const scene = new THREE.Scene();
let camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, -1000, 1000);
camera.position.set(0, 0, 100);

let currentRoot: UIKitComponent | undefined;
let measuredSize: [number, number] | undefined;
let measuredBounds: Bounds | undefined;

window.uikitmlRender = {
  async measure(payload) {
    try {
      clearCurrentRoot();
      const componentSets = resolveKitComponentSets(payload.kit);
      const result = parse(payload.source, { componentSets });
      if (!result.success) {
        return { ok: false, error: "render received invalid UIKitML" };
      }

      replaceStyleSheet(result.ast.stylesheet);
      const rootProps: Record<string, unknown> = { pixelSize: 1 };
      if (payload.width != null) {
        rootProps.width = payload.width;
      }
      if (payload.height != null) {
        rootProps.height = payload.height;
      }

      const wrapper = new Container(rootProps) as UIKitComponent;
      wrapper.add(instantiate(result.ast, { componentSets, preferredColorScheme: payload.preferredColorScheme }));
      scene.add(wrapper);
      currentRoot = wrapper;
      resolveRetainedClassLists(wrapper);

      const size = await measureRoot(wrapper);
      measuredSize = [Math.ceil(size[0]), Math.ceil(size[1])];
      measuredBounds = measureWorldBounds(wrapper);
      if (measuredSize[0] <= 0 || measuredSize[1] <= 0) {
        return { ok: false, error: "render measured an empty root" };
      }
      return { ok: true, width: measuredSize[0], height: measuredSize[1] };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  },

  async render() {
    try {
      if (currentRoot == null || measuredSize == null || measuredBounds == null) {
        return { ok: false, error: "render called before measure" };
      }
      resizeRenderer(measuredSize[0], measuredSize[1]);
      const boundsWidth = Math.max(0.0001, measuredBounds.maxX - measuredBounds.minX);
      const boundsHeight = Math.max(0.0001, measuredBounds.maxY - measuredBounds.minY);
      const boundsCenterX = (measuredBounds.minX + measuredBounds.maxX) / 2;
      const boundsCenterY = (measuredBounds.minY + measuredBounds.maxY) / 2;
      camera = new THREE.OrthographicCamera(
        -boundsWidth / 2,
        boundsWidth / 2,
        boundsHeight / 2,
        -boundsHeight / 2,
        -1000,
        1000,
      );
      camera.position.set(boundsCenterX, boundsCenterY, 100);
      camera.updateProjectionMatrix();

      await settleRoot(currentRoot);
      renderer.render(scene, camera);
      return { ok: true, width: measuredSize[0], height: measuredSize[1] };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  },
};

async function measureRoot(root: UIKitComponent): Promise<[number, number]> {
  await settleRoot(root);
  const size = root.size.value;
  if (size == null) {
    throw new Error("render could not measure root");
  }
  return size;
}

async function settleRoot(root: UIKitComponent) {
  let lastSize = "";
  let stableFrames = 0;

  for (let index = 0; index < 30; index += 1) {
    root.update(1 / 60);
    renderer.render(scene, camera);
    await nextFrame();

    const size = root.size.value;
    const currentSize = size == null ? "" : `${size[0]}x${size[1]}`;
    if (currentSize !== "" && currentSize === lastSize) {
      stableFrames += 1;
      if (stableFrames >= 2) {
        return;
      }
    } else {
      stableFrames = 0;
      lastSize = currentSize;
    }
  }
}

function resizeRenderer(width: number, height: number) {
  renderer.setSize(width, height, false);
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
    if (object.parentContainer.value == null) {
      return;
    }
    const classList = object.classList as unknown as { list?: string[]; set: (...classes: string[]) => void };
    const classes = [...(classList.list ?? [])];
    if (classes.length > 0) {
      classList.set(...classes);
    }
  });
}

function clearCurrentRoot() {
  if (currentRoot == null) {
    return;
  }
  disposeComponentTree(currentRoot);
  currentRoot = undefined;
  measuredSize = undefined;
  measuredBounds = undefined;
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
  scene.remove(root);
}

function nextFrame() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

type Bounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

function measureWorldBounds(root: UIKitComponent): Bounds {
  const bounds: Bounds = {
    minX: Number.POSITIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
  };
  let isFirstComponent = true;

  root.traverse((object) => {
    if (!(object instanceof Component)) {
      return;
    }
    if (isFirstComponent) {
      isFirstComponent = false;
      return;
    }
    const size = object.size.value;
    const matrix = object.globalMatrix.value;
    if (size == null || matrix == null) {
      return;
    }
    const pixelSize = parsePixelSize(object.properties.value.pixelSize);
    const halfWidth = (size[0] * pixelSize) / 2;
    const halfHeight = (size[1] * pixelSize) / 2;
    includePoint(bounds, matrix, -halfWidth, -halfHeight);
    includePoint(bounds, matrix, halfWidth, -halfHeight);
    includePoint(bounds, matrix, halfWidth, halfHeight);
    includePoint(bounds, matrix, -halfWidth, halfHeight);
  });

  if (!Number.isFinite(bounds.minX) || !Number.isFinite(bounds.minY)) {
    throw new Error("render could not measure world bounds");
  }

  return bounds;
}

function includePoint(bounds: Bounds, matrix: THREE.Matrix4, x: number, y: number) {
  const point = new THREE.Vector3(x, y, 0).applyMatrix4(matrix);
  bounds.minX = Math.min(bounds.minX, point.x);
  bounds.minY = Math.min(bounds.minY, point.y);
  bounds.maxX = Math.max(bounds.maxX, point.x);
  bounds.maxY = Math.max(bounds.maxY, point.y);
}

function parsePixelSize(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return 1;
}

declare global {
  interface Window {
    uikitmlRender: {
      measure(payload: RenderPayload): Promise<BrowserRenderResult>;
      render(): Promise<BrowserRenderResult>;
    };
  }
}
