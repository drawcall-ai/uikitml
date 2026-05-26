import { Container } from "@pmndrs/uikit";
import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { instantiate, parse } from "../src/index.js";
import { createRenderWrapperProps } from "../src/render-layout.js";

async function settleRoot(root: Container) {
  for (let index = 0; index < 10; index += 1) {
    root.update(1 / 60);
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

describe("render layout", () => {
  it.each([
    {
      name: "absolute inset decoration",
      source: `
        <div width="76" flex-direction="column" padding="3.2" gap="2.4">
          <div
            position-type="absolute"
            position-left="1.1"
            position-right="1.1"
            position-top="1.1"
            position-bottom="1.1"
          ></div>
          <div width="20" height="5"></div>
        </div>
      `,
      expectedSize: [76, 11.4],
    },
    {
      name: "explicit width and height with absolute inset decoration",
      source: `
        <div width="76" height="14">
          <div
            position-type="absolute"
            position-left="1.1"
            position-right="1.1"
            position-top="1.1"
            position-bottom="1.1"
          ></div>
        </div>
      `,
      expectedSize: [76, 14],
    },
    {
      name: "normal flow column",
      source: `
        <div width="180" flex-direction="column" padding="12" gap="8">
          <div width="80" height="18"></div>
          <div width="120" height="18"></div>
          <div width="100" height="18"></div>
        </div>
      `,
      expectedSize: [180, 94],
    },
    {
      name: "fixed 2:1 panel",
      source: '<div width="220" height="110"></div>',
      expectedSize: [220, 110],
    },
    {
      name: "tall meter",
      source: '<div width="72" height="260"></div>',
      expectedSize: [72, 260],
    },
  ])("does not stretch the authored root to the requested render height: $name", async ({ source, expectedSize }) => {
    const result = parse(source);

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    const scene = new THREE.Scene();
    const authoredRoot = instantiate(result.ast);
    const renderWrapper = new Container(createRenderWrapperProps({ width: 900, height: 900 }));
    renderWrapper.add(authoredRoot);
    scene.add(renderWrapper);

    await settleRoot(renderWrapper);

    expect(renderWrapper.size.value).toEqual([900, 900]);
    expect(authoredRoot.size.value?.[0]).toBeCloseTo(expectedSize[0], 4);
    expect(authoredRoot.size.value?.[1]).toBeCloseTo(expectedSize[1], 4);
  });

  it("uses the requested render size as the wrapper layout size", () => {
    expect(createRenderWrapperProps({ width: 1200, height: 700 })).toMatchObject({
      pixelSize: 1,
      alignItems: "flex-start",
      width: 1200,
      height: 700,
    });
  });

  it("does not add an implicit render height when height is omitted", () => {
    expect(createRenderWrapperProps({ width: 900 })).not.toHaveProperty("height");
  });
});
