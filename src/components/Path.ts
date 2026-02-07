import {
  SignalValue,
  TimingFunction,
  isReactive,
  threadable,
  tween,
} from '@motion-canvas/core';
import {Path as MCPath, PathProps as MCPathProps} from '@motion-canvas/2d';
import {PathMorpher, PathMorpherInterpolator} from '../morphers/PathMorpher';

export interface PathProps extends MCPathProps {
  morpher?: PathMorpher;
}

export class Path extends MCPath {
  private readonly morpher?: PathMorpher;
  private cachedInterpolator: PathMorpherInterpolator | null = null;
  private cachedFromPath: string | null = null;
  private cachedToPath: string | null = null;

  public constructor(props: PathProps) {
    const {morpher, ...rest} = props;
    super(rest);
    this.morpher = morpher;
  }

  @threadable()
  protected override *tweenData(
    newPath: SignalValue<string>,
    time: number,
    timingFunction: TimingFunction,
  ) {
    if (!this.morpher) {
      yield* super.tweenData(newPath, time, timingFunction);
      return;
    }

    const fromPath = this.data();
    const toPath = isReactive(newPath) ? newPath() : newPath;
    const interpolator = this.getOrCreateInterpolator(fromPath, toPath);

    yield* tween(
      time,
      value => {
        const progress = timingFunction(value);
        this.data.context.setter(interpolator(progress));
      },
      () => {
        this.data(newPath);
        this.clearInterpolatorCache();
      },
    );
  }

  private getOrCreateInterpolator(
    from: string,
    to: string,
  ): PathMorpherInterpolator {
    if (
      this.cachedInterpolator &&
      this.cachedFromPath === from &&
      this.cachedToPath === to
    ) {
      return this.cachedInterpolator;
    }

    const interpolator = this.morpher!.createInterpolator(from, to);
    this.cachedInterpolator = interpolator;
    this.cachedFromPath = from;
    this.cachedToPath = to;
    return interpolator;
  }

  private clearInterpolatorCache(): void {
    this.cachedInterpolator = null;
    this.cachedFromPath = null;
    this.cachedToPath = null;
  }

  public override dispose(): void {
    this.clearInterpolatorCache();
    this.morpher?.dispose?.();
    super.dispose();
  }
}
