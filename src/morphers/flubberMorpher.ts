import {interpolate as flubberInterpolate} from 'flubber';
import {PathMorpher} from './PathMorpher';

export interface FlubberMorpherOptions {
  maxSegmentLength?: number;
}

export function flubberMorpher(
  options: FlubberMorpherOptions = {},
): PathMorpher {
  const {maxSegmentLength = 10} = options;

  return {
    createInterpolator(fromPath: string, toPath: string) {
      return flubberInterpolate(fromPath, toPath, {maxSegmentLength});
    },
  };
}
