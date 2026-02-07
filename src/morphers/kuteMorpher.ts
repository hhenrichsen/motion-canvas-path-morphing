import svgMorph from 'kute.js/src/components/svgMorph';
import {PathMorpher} from './PathMorpher';

type PolygonPoint = [number, number];
type Polygon = PolygonPoint[];

const kuteUtil = svgMorph.Util as {
  getInterpolationPoints: (
    path1: string,
    path2: string,
    precision: number,
  ) => [Polygon, Polygon];
};

export interface KuteMorpherOptions {
  morphPrecision?: number;
}

function interpolatePolygons(from: Polygon, to: Polygon, t: number): Polygon {
  return from.map(
    (point, i) =>
      [
        point[0] + (to[i][0] - point[0]) * t,
        point[1] + (to[i][1] - point[1]) * t,
      ] as PolygonPoint,
  );
}

function polygonToPath(polygon: Polygon): string {
  if (polygon.length === 0) return '';
  const [first, ...rest] = polygon;
  const moveTo = `M${first[0]},${first[1]}`;
  const lineTo = rest.map(p => `L${p[0]},${p[1]}`).join('');
  return `${moveTo}${lineTo}Z`;
}

export function kuteMorpher(options: KuteMorpherOptions = {}): PathMorpher {
  const {morphPrecision = 10} = options;

  return {
    createInterpolator(fromPath: string, toPath: string) {
      const [fromPolygon, toPolygon] = kuteUtil.getInterpolationPoints(
        fromPath,
        toPath,
        morphPrecision,
      );

      return (progress: number): string => {
        const interpolated = interpolatePolygons(
          fromPolygon,
          toPolygon,
          progress,
        );
        return polygonToPath(interpolated);
      };
    },
  };
}
