import {
  BBox,
  Matrix2D,
  PossibleSpacing,
  SerializedVector2,
  SignalValue,
  SimpleSignal,
  ThreadGenerator,
  TimingFunction,
  Vector2,
  all,
  clampRemap,
  delay,
  easeInOutSine,
  isReactive,
  lazy,
  threadable,
  tween,
  useLogger,
} from '@motion-canvas/core';
import {computed, signal} from '@motion-canvas/2d/lib/decorators';
import {
  DesiredLength,
  PossibleCanvasStyle,
} from '@motion-canvas/2d/lib/partials';
import {
  applyTransformDiff,
  getTransformDiff,
} from '@motion-canvas/2d/lib/utils/diff';
import {Circle, CircleProps} from '@motion-canvas/2d/lib/components/Circle';
import {Img, ImgProps} from '@motion-canvas/2d/lib/components/Img';
import {Layout} from '@motion-canvas/2d/lib/components/Layout';
import {Line, LineProps} from '@motion-canvas/2d/lib/components/Line';
import {Node, NodeProps} from '@motion-canvas/2d/lib/components/Node';
import {Path, PathProps} from '@motion-canvas/2d/lib/components/Path';
import {Rect, RectProps} from '@motion-canvas/2d/lib/components/Rect';
import {Shape, ShapeProps} from '@motion-canvas/2d/lib/components/Shape';
import {View2D} from '@motion-canvas/2d/lib/components/View2D';
import {PathMorpher} from '../morphers/PathMorpher';

export interface SVGShape {
  id: string;
  shape: Node;
}

export interface SVGShapeData {
  id: string;
  type: new (props: NodeProps) => Node;
  props: ShapeProps;
  children?: SVGShapeData[];
}

export interface SVGDocument {
  size: Vector2;
  nodes: SVGShape[];
}

export interface SVGDocumentData {
  size: Vector2;
  nodes: SVGShapeData[];
}

export interface SvgProps extends ShapeProps {
  svg: SignalValue<string>;
  morpher?: PathMorpher;
}

export class Svg extends Shape {
  @lazy(() => {
    const element = document.createElement('div');
    View2D.shadowRoot.appendChild(element);
    return element;
  })
  protected static containerElement: HTMLDivElement;
  private static svgNodesPool: Record<string, SVGDocumentData> = {};

  @signal()
  declare public readonly svg: SimpleSignal<string, this>;

  public wrapper: Node;
  protected readonly morpher?: PathMorpher;

  private lastTweenTargetSrc: string | null = null;
  private lastTweenTargetDocument: SVGDocument | null = null;

  public constructor(props: SvgProps) {
    const {morpher, ...rest} = props;
    super(rest);
    this.morpher = morpher;
    this.wrapper = new Node({});
    this.wrapper.children(this.documentNodes);
    this.wrapper.scale(this.wrapperScale);
    this.add(this.wrapper);
  }

  protected override collectAsyncResources(): void {
    this.svg();
  }

  public getChildrenById(id: string) {
    return this.document()
      .nodes.filter(node => node.id === id)
      .map(({shape}) => shape);
  }

  protected override desiredSize(): SerializedVector2<DesiredLength> {
    const docSize = this.document().size;
    const scale = this.calculateWrapperScale(
      docSize,
      super.desiredSize() as SerializedVector2<number | null>,
    );
    return docSize.mul(scale);
  }

  protected getCurrentSize() {
    return {
      x: this.width.isInitial() ? null : this.width(),
      y: this.height.isInitial() ? null : this.height(),
    };
  }

  protected calculateWrapperScale(
    documentSize: Vector2,
    parentSize: SerializedVector2<number | null>,
  ) {
    const result = new Vector2(1, 1);
    if (parentSize.x && parentSize.y) {
      result.x = parentSize.x / documentSize.width;
      result.y = parentSize.y / documentSize.height;
    } else if (parentSize.x && !parentSize.y) {
      result.x = parentSize.x / documentSize.width;
      result.y = result.x;
    } else if (!parentSize.x && parentSize.y) {
      result.y = parentSize.y / documentSize.height;
      result.x = result.y;
    }
    return result;
  }

  protected buildDocument(data: SVGDocumentData): SVGDocument {
    return {
      size: data.size,
      nodes: data.nodes.map(ch => this.buildShape(ch)),
    };
  }

  protected buildShape({id, type, props, children}: SVGShapeData): SVGShape {
    return {
      id,
      shape: new type({
        children: children?.map(ch => this.buildShape(ch).shape),
        ...this.processElementStyle(props),
      }),
    };
  }

  protected parseSVG(svg: string): SVGDocument {
    return this.buildDocument(Svg.parseSVGData(svg));
  }

  protected *generateTransformer(
    from: Node,
    to: Node,
    duration: number,
    timing: TimingFunction,
  ): Generator<ThreadGenerator> {
    yield from.position(to.position(), duration, timing);
    yield from.scale(to.scale(), duration, timing);
    yield from.rotation(to.rotation(), duration, timing);

    if (
      from instanceof Path &&
      to instanceof Path &&
      from.data() !== to.data()
    ) {
      if (this.morpher) {
        const fromData = from.data();
        const toData = to.data();
        const interpolator = this.morpher.createInterpolator(fromData, toData);

        yield tween(
          duration,
          value => {
            const progress = timing(value);
            from.data.context.setter(interpolator(progress));
          },
          () => {
            from.data(toData);
          },
        );
      } else {
        yield from.data(to.data(), duration, timing);
      }
    }

    if (from instanceof Layout && to instanceof Layout) {
      yield from.size(to.size(), duration, timing);
    }

    if (from instanceof Shape && to instanceof Shape) {
      yield from.fill(to.fill(), duration, timing);
      yield from.stroke(to.stroke(), duration, timing);
      yield from.lineWidth(to.lineWidth(), duration, timing);
    }

    const fromChildren = from.children();
    const toChildren = to.children();
    for (let i = 0; i < fromChildren.length; i++) {
      yield* this.generateTransformer(
        fromChildren[i],
        toChildren[i],
        duration,
        timing,
      );
    }
  }

  @threadable()
  protected *tweenSvg(
    value: SignalValue<string>,
    time: number,
    timingFunction: TimingFunction,
  ) {
    const newValue = isReactive(value) ? value() : value;
    let newSVG: SVGDocument;
    try {
      newSVG = this.parseSVG(newValue);
    } catch {
      newSVG = {size: new Vector2(0, 0), nodes: []};
    }
    const currentSVG = this.document();

    if (currentSVG.nodes.length === 0 || newSVG.nodes.length === 0) {
      this.svg.context.setter(newValue);
      return;
    }

    const diff = getTransformDiff(currentSVG.nodes, newSVG.nodes);

    this.lastTweenTargetSrc = newValue;
    this.lastTweenTargetDocument = newSVG;

    applyTransformDiff(currentSVG.nodes, diff, ({shape, ...rest}) => ({
      ...rest,
      shape: shape.clone(),
    }));
    this.wrapper.children(currentSVG.nodes.map(shape => shape.shape));
    for (const item of currentSVG.nodes) {
      item.shape.parent(this.wrapper);
    }

    const beginning = 0.2;
    const ending = 0.8;
    const overlap = 0.15;

    const transformator: ThreadGenerator[] = [];
    const transformatorTime = (ending - beginning) * time;
    const transformatorDelay = beginning * time;

    for (const item of diff.transformed) {
      transformator.push(
        ...this.generateTransformer(
          item.from.current.shape,
          item.to.current.shape,
          transformatorTime,
          timingFunction,
        ),
      );
    }

    const autoWidth = this.width.isInitial();
    const autoHeight = this.height.isInitial();
    this.wrapper.scale(
      this.calculateWrapperScale(currentSVG.size, this.getCurrentSize()),
    );

    const baseTween = tween(
      time,
      value => {
        const progress = timingFunction(value);
        const remapped = clampRemap(beginning, ending, 0, 1, progress);

        const scale = this.wrapper.scale();
        if (autoWidth) {
          this.width(
            easeInOutSine(remapped, currentSVG.size.x, newSVG.size.x) * scale.x,
          );
        }

        if (autoHeight) {
          this.height(
            easeInOutSine(remapped, currentSVG.size.y, newSVG.size.y) * scale.y,
          );
        }

        const deletedOpacity = clampRemap(
          0,
          beginning + overlap,
          1,
          0,
          progress,
        );
        for (const {current} of diff.deleted) {
          current.shape.opacity(deletedOpacity);
        }

        const insertedOpacity = clampRemap(ending - overlap, 1, 0, 1, progress);
        for (const {current} of diff.inserted) {
          current.shape.opacity(insertedOpacity);
        }
      },
      () => {
        this.wrapper.children(this.documentNodes);
        if (autoWidth) this.width.reset();
        if (autoHeight) this.height.reset();

        for (const {current} of diff.deleted) current.shape.dispose();
        for (const {from} of diff.transformed) {
          from.current.shape.dispose();
        }
        this.wrapper.scale(this.wrapperScale);
      },
    );
    yield* all(
      this.wrapper.scale(
        this.calculateWrapperScale(newSVG.size, this.getCurrentSize()),
        time,
        timingFunction,
      ),
      baseTween,
      delay(transformatorDelay, all(...transformator)),
    );
  }

  @computed()
  private wrapperScale(): Vector2 {
    return this.calculateWrapperScale(
      this.document().size,
      this.getCurrentSize(),
    );
  }

  @computed()
  private document(): SVGDocument {
    try {
      const src = this.svg();
      if (this.lastTweenTargetDocument && src === this.lastTweenTargetSrc) {
        return this.lastTweenTargetDocument;
      }
      return this.parseSVG(src);
    } catch {
      return {
        size: new Vector2(0, 0),
        nodes: [],
      };
    } finally {
      this.lastTweenTargetSrc = null;
      this.lastTweenTargetDocument = null;
    }
  }

  @computed()
  protected documentNodes() {
    return this.document().nodes.map(node => node.shape);
  }

  private processElementStyle({fill, stroke, ...rest}: ShapeProps): ShapeProps {
    return {
      fill: fill === 'currentColor' ? this.fill : Svg.processSVGColor(fill),
      stroke:
        stroke === 'currentColor' ? this.stroke : Svg.processSVGColor(stroke),
      ...rest,
    };
  }

  public static parseSVGData(svg: string) {
    const cached = Svg.svgNodesPool[svg];
    if (cached && (cached.size.x > 0 || cached.size.y > 0)) return cached;

    Svg.containerElement.innerHTML = svg;

    const svgRoot = Svg.containerElement.querySelector('svg');

    if (!svgRoot) {
      useLogger().error({
        message: 'Invalid SVG',
        object: svg,
      });
      return {
        size: new Vector2(0, 0),
        nodes: [],
      } as SVGDocumentData;
    }

    let viewBox = new BBox();
    let size = new Vector2();

    const hasViewBox = svgRoot.hasAttribute('viewBox');
    const hasSize =
      svgRoot.hasAttribute('width') || svgRoot.hasAttribute('height');

    if (hasViewBox) {
      const {x, y, width, height} = svgRoot.viewBox.baseVal;
      viewBox = new BBox(x, y, width, height);

      if (!hasSize) size = viewBox.size;
    }

    if (hasSize) {
      size = new Vector2(
        svgRoot.width.baseVal.value,
        svgRoot.height.baseVal.value,
      );

      if (!hasViewBox) viewBox = new BBox(0, 0, size.width, size.height);
    }

    if (!hasViewBox && !hasSize) {
      viewBox = new BBox(svgRoot.getBBox());
      size = viewBox.size;
    }

    const scale = size.div(viewBox.size);
    const center = viewBox.center;

    const rootTransform = new DOMMatrix()
      .scaleSelf(scale.x, scale.y)
      .translateSelf(-center.x, -center.y);

    const nodes = Array.from(
      Svg.extractGroupNodes(svgRoot, svgRoot, rootTransform, {}),
    );
    const builder: SVGDocumentData = {
      size,
      nodes,
    };
    Svg.svgNodesPool[svg] = builder;
    return builder;
  }

  protected static getMatrixTransformation(transform: DOMMatrix): ShapeProps {
    const matrix2 = new Matrix2D(transform);

    const position = matrix2.translation;
    const rotation = matrix2.rotation;
    const scale = {
      x: matrix2.x.magnitude,
      y: matrix2.y.magnitude,
    };
    if (matrix2.determinant < 0) {
      if (matrix2.values[0] < matrix2.values[3]) scale.x = -scale.x;
      else scale.y = -scale.y;
    }
    return {
      position,
      rotation,
      scale,
    };
  }

  private static processSVGColor(
    color: SignalValue<PossibleCanvasStyle> | undefined,
  ): SignalValue<PossibleCanvasStyle> | undefined {
    if (color === 'transparent' || color === 'none') {
      return null;
    }

    return color;
  }

  private static getElementTransformation(
    element: SVGGraphicsElement,
    parentTransform: DOMMatrix,
  ) {
    const transform = element.transform.baseVal.consolidate();
    const transformMatrix = (
      transform ? parentTransform.multiply(transform.matrix) : parentTransform
    ).translate(
      Svg.parseNumberAttribute(element, 'x'),
      Svg.parseNumberAttribute(element, 'y'),
    );
    return transformMatrix;
  }

  private static parseLineCap(name: string | null): CanvasLineCap | null {
    if (!name) return null;
    if (name === 'butt' || name === 'round' || name === 'square') return name;

    useLogger().warn(`SVG: invalid line cap "${name}"`);
    return null;
  }

  private static parseLineJoin(name: string | null): CanvasLineJoin | null {
    if (!name) return null;
    if (name === 'bevel' || name === 'miter' || name === 'round') return name;

    if (name === 'arcs' || name === 'miter-clip') {
      useLogger().warn(`SVG: line join is not supported "${name}"`);
    } else {
      useLogger().warn(`SVG: invalid line join "${name}"`);
    }
    return null;
  }

  private static parseLineDash(value: string | null): number[] | null {
    if (!value) return null;

    const list = value.split(/,|\s+/);
    if (list.findIndex(str => str.endsWith('%')) > 0) {
      useLogger().warn(`SVG: percentage line dash are ignored`);
      return null;
    }
    return list.map(str => parseFloat(str));
  }

  private static parseDashOffset(value: string | null): number | null {
    if (!value) return null;
    const trimmed = value.trim();
    if (trimmed.endsWith('%')) {
      useLogger().warn(`SVG: percentage line dash offset are ignored`);
    }
    return parseFloat(trimmed);
  }

  private static parseOpacity(value: string | null): number | null {
    if (!value) return null;
    if (value.endsWith('%')) return parseFloat(value) / 100;
    return parseFloat(value);
  }

  private static getElementStyle(
    element: SVGGraphicsElement,
    inheritedStyle: ShapeProps,
  ): ShapeProps {
    return {
      fill: element.getAttribute('fill') ?? inheritedStyle.fill,
      stroke: element.getAttribute('stroke') ?? inheritedStyle.stroke,
      lineWidth: element.hasAttribute('stroke-width')
        ? parseFloat(element.getAttribute('stroke-width')!)
        : inheritedStyle.lineWidth,
      lineCap:
        this.parseLineCap(element.getAttribute('stroke-linecap')) ??
        inheritedStyle.lineCap,
      lineJoin:
        this.parseLineJoin(element.getAttribute('stroke-linejoin')) ??
        inheritedStyle.lineJoin,
      lineDash:
        this.parseLineDash(element.getAttribute('stroke-dasharray')) ??
        inheritedStyle.lineDash,
      lineDashOffset:
        this.parseDashOffset(element.getAttribute('stroke-dashoffset')) ??
        inheritedStyle.lineDashOffset,
      opacity:
        this.parseOpacity(element.getAttribute('opacity')) ??
        inheritedStyle.opacity,
      layout: false,
    };
  }

  private static *extractGroupNodes(
    element: SVGElement,
    svgRoot: Element,
    parentTransform: DOMMatrix,
    inheritedStyle: ShapeProps,
  ): Generator<SVGShapeData> {
    for (const child of element.children) {
      if (!(child instanceof SVGGraphicsElement)) continue;

      yield* this.extractElementNodes(
        child,
        svgRoot,
        parentTransform,
        inheritedStyle,
      );
    }
  }

  private static parseNumberAttribute(
    element: SVGElement,
    name: string,
  ): number {
    return parseFloat(element.getAttribute(name) ?? '0');
  }

  private static *extractElementNodes(
    child: SVGGraphicsElement,
    svgRoot: Element,
    parentTransform: DOMMatrix,
    inheritedStyle: ShapeProps,
  ): Generator<SVGShapeData> {
    const transformMatrix = Svg.getElementTransformation(
      child,
      parentTransform,
    );
    const style = Svg.getElementStyle(child, inheritedStyle);
    const id = child.id ?? '';

    if (child.tagName === 'g') {
      yield* Svg.extractGroupNodes(child, svgRoot, transformMatrix, style);
    } else if (child.tagName === 'svg') {
      const nestedSvg = child as unknown as SVGSVGElement;
      let nestedTransform = transformMatrix;

      if (nestedSvg.hasAttribute('viewBox')) {
        try {
          const vb = nestedSvg.viewBox.baseVal;
          const width = Svg.parseNumberAttribute(child, 'width') || vb.width;
          const height = Svg.parseNumberAttribute(child, 'height') || vb.height;

          const scaleX = vb.width > 0 ? width / vb.width : 1;
          const scaleY = vb.height > 0 ? height / vb.height : 1;

          nestedTransform = nestedTransform
            .scale(scaleX, scaleY)
            .translate(-vb.x, -vb.y);
        } catch {
          // viewBox parsing failed, continue with basic transform
        }
      }

      yield* Svg.extractGroupNodes(child, svgRoot, nestedTransform, style);
    } else if (child.tagName === 'use') {
      const hrefElement = svgRoot.querySelector(
        (child as SVGUseElement).href.baseVal,
      );
      if (!(hrefElement instanceof SVGGraphicsElement)) {
        useLogger().warn(`invalid SVG use tag. element "${child.outerHTML}"`);
        return;
      }

      yield* Svg.extractElementNodes(
        hrefElement,
        svgRoot,
        transformMatrix,
        inheritedStyle,
      );
    } else if (child.tagName === 'path') {
      const data = child.getAttribute('d');
      if (!data) {
        useLogger().warn('blank path data at ' + child.id);
        return;
      }
      const transformation = transformMatrix;
      yield {
        id: id || 'path',
        type: Path as unknown as new (props: NodeProps) => Node,
        props: {
          data,
          tweenAlignPath: true,
          ...Svg.getMatrixTransformation(transformation),
          ...style,
        } as PathProps,
      };
    } else if (child.tagName === 'rect') {
      const width = Svg.parseNumberAttribute(child, 'width');
      const height = Svg.parseNumberAttribute(child, 'height');
      const rx = Svg.parseNumberAttribute(child, 'rx');
      const ry = Svg.parseNumberAttribute(child, 'ry');

      const bbox = new BBox(0, 0, width, height);
      const center = bbox.center;
      const transformation = transformMatrix.translate(center.x, center.y);

      yield {
        id: id || 'rect',
        type: Rect,
        props: {
          width,
          height,
          radius: [rx, ry],
          ...Svg.getMatrixTransformation(transformation),
          ...style,
        } as RectProps,
      };
    } else if (['circle', 'ellipse'].includes(child.tagName)) {
      const cx = Svg.parseNumberAttribute(child, 'cx');
      const cy = Svg.parseNumberAttribute(child, 'cy');
      const size: PossibleSpacing =
        child.tagName === 'circle'
          ? Svg.parseNumberAttribute(child, 'r') * 2
          : [
              Svg.parseNumberAttribute(child, 'rx') * 2,
              Svg.parseNumberAttribute(child, 'ry') * 2,
            ];

      const transformation = transformMatrix.translate(cx, cy);

      yield {
        id: id || child.tagName,
        type: Circle,
        props: {
          size,
          ...style,
          ...Svg.getMatrixTransformation(transformation),
        } as CircleProps,
      };
    } else if (['line', 'polyline', 'polygon'].includes(child.tagName)) {
      const numbers =
        child.tagName === 'line'
          ? ['x1', 'y1', 'x2', 'y2'].map(attr =>
              Svg.parseNumberAttribute(child, attr),
            )
          : child
              .getAttribute('points')!
              .match(/-?[\d.e+-]+/g)!
              .map(value => parseFloat(value));
      const points = numbers.reduce<number[][]>((accum, current) => {
        let last = accum[accum.length - 1];
        if (!last || last.length === 2) {
          last = [];
          accum.push(last);
        }
        last.push(current);
        return accum;
      }, []);

      if (child.tagName === 'polygon') points.push(points[0]);

      yield {
        id: id || child.tagName,
        type: Line as unknown as new (props: NodeProps) => Node,
        props: {
          points,
          ...style,
          ...Svg.getMatrixTransformation(transformMatrix),
        } as LineProps,
      };
    } else if (child.tagName === 'image') {
      const x = Svg.parseNumberAttribute(child, 'x');
      const y = Svg.parseNumberAttribute(child, 'y');
      const width = Svg.parseNumberAttribute(child, 'width');
      const height = Svg.parseNumberAttribute(child, 'height');
      const href = child.getAttribute('href') ?? '';

      const bbox = new BBox(x, y, width, height);
      const center = bbox.center;
      const transformation = transformMatrix.translate(center.x, center.y);

      yield {
        id: id || child.tagName,
        type: Img,
        props: {
          src: href,
          ...style,
          ...Svg.getMatrixTransformation(transformation),
        } as ImgProps,
      };
    }
  }
}
