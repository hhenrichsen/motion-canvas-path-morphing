import {PathMorpher} from './PathMorpher';

interface Point {
  x: number;
  y: number;
}

export interface WildernessMorpherOptions {
  morphIterations?: number;
}

function parsePathToPoints(d: string): Point[] {
  const points: Point[] = [];
  const commands = d.match(/[MmLlHhVvCcSsQqTtAaZz][^MmLlHhVvCcSsQqTtAaZz]*/g);

  if (!commands) return points;

  let currentX = 0;
  let currentY = 0;

  for (const cmd of commands) {
    const type = cmd[0];
    const args = cmd
      .slice(1)
      .trim()
      .split(/[\s,]+/)
      .map(Number)
      .filter(n => !isNaN(n));

    switch (type) {
      case 'M':
        currentX = args[0];
        currentY = args[1];
        points.push({x: currentX, y: currentY});
        break;
      case 'm':
        currentX += args[0];
        currentY += args[1];
        points.push({x: currentX, y: currentY});
        break;
      case 'L':
        for (let i = 0; i < args.length; i += 2) {
          currentX = args[i];
          currentY = args[i + 1];
          points.push({x: currentX, y: currentY});
        }
        break;
      case 'l':
        for (let i = 0; i < args.length; i += 2) {
          currentX += args[i];
          currentY += args[i + 1];
          points.push({x: currentX, y: currentY});
        }
        break;
      case 'H':
        currentX = args[0];
        points.push({x: currentX, y: currentY});
        break;
      case 'h':
        currentX += args[0];
        points.push({x: currentX, y: currentY});
        break;
      case 'V':
        currentY = args[0];
        points.push({x: currentX, y: currentY});
        break;
      case 'v':
        currentY += args[0];
        points.push({x: currentX, y: currentY});
        break;
      case 'C':
        for (let i = 0; i < args.length; i += 6) {
          currentX = args[i + 4];
          currentY = args[i + 5];
          points.push({x: currentX, y: currentY});
        }
        break;
      case 'c':
        for (let i = 0; i < args.length; i += 6) {
          currentX += args[i + 4];
          currentY += args[i + 5];
          points.push({x: currentX, y: currentY});
        }
        break;
      case 'Z':
      case 'z':
        break;
    }
  }

  return points;
}

function normalizePoints(points: Point[], targetLen: number): Point[] {
  if (points.length === targetLen) return points;
  if (points.length === 0) return Array(targetLen).fill({x: 0, y: 0});

  const result: Point[] = [];
  const step = (points.length - 1) / (targetLen - 1);

  for (let i = 0; i < targetLen; i++) {
    const idx = i * step;
    const lower = Math.floor(idx);
    const upper = Math.min(Math.ceil(idx), points.length - 1);
    const t = idx - lower;

    if (lower === upper) {
      result.push(points[lower]);
    } else {
      result.push({
        x: points[lower].x + (points[upper].x - points[lower].x) * t,
        y: points[lower].y + (points[upper].y - points[lower].y) * t,
      });
    }
  }

  return result;
}

function pointsToPath(points: Point[]): string {
  if (points.length === 0) return '';
  const [first, ...rest] = points;
  const moveTo = `M${first.x},${first.y}`;
  const lineTo = rest.map(p => `L${p.x},${p.y}`).join('');
  return `${moveTo}${lineTo}Z`;
}

export function wildernessMorpher(): PathMorpher {
  return {
    createInterpolator(fromPath: string, toPath: string) {
      const fromPoints = parsePathToPoints(fromPath);
      const toPoints = parsePathToPoints(toPath);

      const maxLen = Math.max(fromPoints.length, toPoints.length);
      const normalizedFrom = normalizePoints(fromPoints, maxLen);
      const normalizedTo = normalizePoints(toPoints, maxLen);

      return (progress: number): string => {
        if (progress <= 0) return fromPath;
        if (progress >= 1) return toPath;

        if (
          normalizedFrom.length === 0 ||
          normalizedTo.length === 0 ||
          maxLen < 2
        ) {
          return fromPath;
        }

        const interpolatedPoints: Point[] = [];
        for (let i = 0; i < normalizedFrom.length; i++) {
          const fromPt = normalizedFrom[i];
          const toPt = normalizedTo[i];
          if (!fromPt || !toPt) continue;
          const x = fromPt.x + (toPt.x - fromPt.x) * progress;
          const y = fromPt.y + (toPt.y - fromPt.y) * progress;
          if (isNaN(x) || isNaN(y) || !isFinite(x) || !isFinite(y)) continue;
          interpolatedPoints.push({x, y});
        }

        if (interpolatedPoints.length < 2) return fromPath;

        return pointsToPath(interpolatedPoints) || fromPath;
      };
    },
  };
}
