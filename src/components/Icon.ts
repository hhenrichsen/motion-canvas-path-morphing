import {
  ColorSignal,
  DependencyContext,
  PossibleColor,
  SignalValue,
  SimpleSignal,
  threadable,
  TimingFunction,
  isReactive,
} from '@motion-canvas/core';
import {
  colorSignal,
  computed,
  initial,
  signal,
} from '@motion-canvas/2d/lib/decorators';
import {Svg, SvgProps} from './Svg';

export interface IconProps extends Omit<SvgProps, 'svg'> {
  icon: SignalValue<string>;
  color?: SignalValue<PossibleColor>;
}

const PLACEHOLDER_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" fill="none"/></svg>';

export class Icon extends Svg {
  private static iconSvgCache: Map<string, string> = new Map();
  private static pendingFetches: Map<string, Promise<string>> = new Map();

  @signal()
  declare public readonly icon: SimpleSignal<string, this>;

  @initial('white')
  @colorSignal()
  declare public readonly color: ColorSignal<this>;

  public constructor(props: IconProps) {
    super({
      ...props,
      svg: () => this.iconSvg(),
    });
  }

  protected override collectAsyncResources(): void {
    super.collectAsyncResources();
    this.iconSvg();
  }

  @computed()
  protected iconSvg(): string {
    const iconId = this.icon();
    const color = this.color().hex();
    const cacheKey = `${iconId}::${color}`;

    if (Icon.iconSvgCache.has(cacheKey)) {
      return Icon.iconSvgCache.get(cacheKey)!;
    }

    const fetchPromise = this.fetchIconSvg(iconId, color);
    DependencyContext.collectPromise(fetchPromise);

    return PLACEHOLDER_SVG;
  }

  private async fetchIconSvg(iconId: string, color: string): Promise<string> {
    const cacheKey = `${iconId}::${color}`;

    if (Icon.iconSvgCache.has(cacheKey)) {
      return Icon.iconSvgCache.get(cacheKey)!;
    }

    if (Icon.pendingFetches.has(cacheKey)) {
      return Icon.pendingFetches.get(cacheKey)!;
    }

    const iconPath = iconId.replace(':', '/');
    const encodedColor = encodeURIComponent(color);
    const url = `https://api.iconify.design/${iconPath}.svg?color=${encodedColor}`;

    const fetchPromise = fetch(url)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to fetch icon: ${iconId}`);
        }
        return response.text();
      })
      .then(svg => {
        Icon.iconSvgCache.set(cacheKey, svg);
        Icon.pendingFetches.delete(cacheKey);
        return svg;
      })
      .catch(error => {
        Icon.pendingFetches.delete(cacheKey);
        console.error(`Error fetching icon ${iconId}:`, error);
        return PLACEHOLDER_SVG;
      });

    Icon.pendingFetches.set(cacheKey, fetchPromise);
    return fetchPromise;
  }

  @threadable()
  protected *tweenIcon(
    value: SignalValue<string>,
    time: number,
    timingFunction: TimingFunction,
  ) {
    const newIconId = isReactive(value) ? value() : value;
    const color = this.color().hex();

    const newSvg: string = yield this.fetchIconSvg(newIconId, color);

    yield* this.svg(newSvg, time, timingFunction);
    this.icon.context.setter(newIconId);
  }
}
