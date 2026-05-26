export type RenderWrapperSize = {
  width?: number;
  height?: number;
};

export function createRenderWrapperProps(size: RenderWrapperSize): Record<string, unknown> {
  const props: Record<string, unknown> = {
    pixelSize: 1,
    alignItems: "flex-start",
  };
  if (size.width != null) {
    props.width = size.width;
  }
  if (size.height != null) {
    props.height = size.height;
  }
  return props;
}
