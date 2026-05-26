import { Component, Container, reversePainterSortStable, StyleSheet } from "@pmndrs/uikit";
import * as THREE from "three";
import { instantiate } from "../instantiate.js";
import { resolveKitComponentSets, type KitName } from "../kits.js";
import { parse } from "../parse.js";
import { createRenderWrapperProps } from "../render-layout.js";
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
      const rootProps = createRenderWrapperProps(payload);
      const wrapper = new Container(rootProps) as UIKitComponent;
      wrapper.add(instantiate(result.ast, { componentSets, preferredColorScheme: payload.preferredColorScheme }));
      scene.add(wrapper);
      currentRoot = wrapper;
      resolveRetainedClassLists(wrapper);

      const size = await measureRoot(wrapper);
      measuredSize = [Math.ceil(size[0]), Math.ceil(size[1])];
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
      if (currentRoot == null || measuredSize == null) {
        return { ok: false, error: "render called before measure" };
      }
      resizeRenderer(measuredSize[0], measuredSize[1]);
      camera = new THREE.OrthographicCamera(
        -measuredSize[0] / 2,
        measuredSize[0] / 2,
        measuredSize[1] / 2,
        -measuredSize[1] / 2,
        -1000,
        1000,
      );
      camera.position.set(0, 0, 100);
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

declare global {
  interface Window {
    uikitmlRender: {
      measure(payload: RenderPayload): Promise<BrowserRenderResult>;
      render(): Promise<BrowserRenderResult>;
    };
  }
}
