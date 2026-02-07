declare module 'flubber' {
  interface InterpolateOptions {
    maxSegmentLength?: number;
    string?: boolean;
  }

  function interpolate(
    fromShape: string,
    toShape: string,
    options?: InterpolateOptions,
  ): (t: number) => string;

  function separate(
    fromShape: string,
    toShapes: string[],
    options?: InterpolateOptions,
  ): (t: number) => string[];

  function combine(
    fromShapes: string[],
    toShape: string,
    options?: InterpolateOptions,
  ): (t: number) => string[];

  function interpolateAll(
    fromShapes: string[],
    toShapes: string[],
    options?: InterpolateOptions & {single?: boolean},
  ): ((t: number) => string)[];

  function splitPathString(pathString: string): string[];
  function toPathString(ring: [number, number][]): string;

  function fromCircle(
    x: number,
    y: number,
    radius: number,
    toShape: string,
    options?: InterpolateOptions,
  ): (t: number) => string;

  function toCircle(
    fromShape: string,
    x: number,
    y: number,
    radius: number,
    options?: InterpolateOptions,
  ): (t: number) => string;

  function fromRect(
    x: number,
    y: number,
    width: number,
    height: number,
    toShape: string,
    options?: InterpolateOptions,
  ): (t: number) => string;

  function toRect(
    fromShape: string,
    x: number,
    y: number,
    width: number,
    height: number,
    options?: InterpolateOptions,
  ): (t: number) => string;
}
