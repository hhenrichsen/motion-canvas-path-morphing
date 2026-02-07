import {makeScene2D, Path as MCPath, Txt} from '@motion-canvas/2d';
import {createRef, all, waitFor} from '@motion-canvas/core';
import {Path, Latex, Icon} from '@/components';
import {
  flubberMorpher,
  kuteMorpher,
  wildernessMorpher,
  manimMorpher,
} from '@/morphers';

const STAR =
  'M50,0 L61,35 L98,35 L68,57 L79,91 L50,70 L21,91 L32,57 L2,35 L39,35 Z';
const CIRCLE =
  'M50,0 C77.6,0 100,22.4 100,50 C100,77.6 77.6,100 50,100 C22.4,100 0,77.6 0,50 C0,22.4 22.4,0 50,0 Z';
const SQUARE = 'M0,0 L100,0 L100,100 L0,100 Z';

export default makeScene2D(function* (view) {
  const flubberPath = createRef<Path>();
  const kutePath = createRef<Path>();
  const wildernessPath = createRef<Path>();
  const manimPath = createRef<Path>();
  const defaultPath = createRef<MCPath>();

  const flubberLatex = createRef<Latex>();
  const kuteLatex = createRef<Latex>();
  const wildernessLatex = createRef<Latex>();
  const manimLatex = createRef<Latex>();
  const fixedLatex = createRef<Latex>();

  const flubberIcon = createRef<Icon>();
  const kuteIcon = createRef<Icon>();
  const wildernessIcon = createRef<Icon>();
  const manimIcon = createRef<Icon>();
  const fixedIcon = createRef<Icon>();

  yield view.add(
    <>
      <Txt text="Path Morphing" x={0} y={-300} fill="white" fontSize={28} />
      <Txt text="Flubber" x={-560} y={-250} fill="coral" fontSize={14} />
      <Txt text="KUTE.js" x={-280} y={-250} fill="skyblue" fontSize={14} />
      <Txt text="Wilderness" x={0} y={-250} fill="lightgreen" fontSize={14} />
      <Txt text="Manim" x={280} y={-250} fill="plum" fontSize={14} />
      <Txt text="Fixed" x={560} y={-250} fill="gold" fontSize={14} />

      <Path
        ref={flubberPath}
        morpher={flubberMorpher()}
        data={STAR}
        x={-560 - 48}
        y={-200}
        fill="coral"
        scale={1}
      />
      <Path
        ref={kutePath}
        morpher={kuteMorpher()}
        data={STAR}
        x={-280 - 48}
        y={-200}
        fill="skyblue"
        scale={1}
      />
      <Path
        ref={wildernessPath}
        morpher={wildernessMorpher()}
        data={STAR}
        x={0 - 48}
        y={-200}
        fill="lightgreen"
        scale={1}
      />
      <Path
        ref={manimPath}
        morpher={manimMorpher()}
        data={STAR}
        x={280 - 48}
        y={-200}
        fill="plum"
        scale={1}
      />
      <MCPath
        ref={defaultPath}
        data={STAR}
        x={560 - 48}
        y={-200}
        fill="gold"
        scale={1}
      />

      <Txt text="LaTeX Morphing" x={0} y={-50} fill="white" fontSize={28} />

      <Latex
        ref={flubberLatex}
        morpher={flubberMorpher()}
        tex={'x'}
        x={-560}
        y={40}
        fill="coral"
      />
      <Latex
        ref={kuteLatex}
        morpher={kuteMorpher()}
        tex={'x'}
        x={-280}
        y={40}
        fill="skyblue"
      />
      <Latex
        ref={wildernessLatex}
        morpher={wildernessMorpher()}
        tex={'x'}
        x={0}
        y={40}
        fill="lightgreen"
      />
      <Latex
        ref={manimLatex}
        morpher={manimMorpher()}
        tex={'x'}
        x={280}
        y={40}
        fill="plum"
      />
      <Latex ref={fixedLatex} tex={'x'} x={560} y={40} fill="gold" />

      <Txt text="Icon Morphing" x={0} y={130} fill="white" fontSize={28} />

      <Icon
        ref={flubberIcon}
        morpher={flubberMorpher()}
        icon="mdi:home"
        x={-560}
        y={230}
        color="coral"
        scale={3}
      />
      <Icon
        ref={kuteIcon}
        morpher={kuteMorpher()}
        icon="mdi:home"
        x={-280}
        y={230}
        color="skyblue"
        scale={3}
      />
      <Icon
        ref={wildernessIcon}
        morpher={wildernessMorpher()}
        icon="mdi:home"
        x={0}
        y={230}
        color="lightgreen"
        scale={3}
      />
      <Icon
        ref={manimIcon}
        morpher={manimMorpher()}
        icon="mdi:home"
        x={280}
        y={230}
        color="plum"
        scale={3}
      />
      <Icon
        ref={fixedIcon}
        icon="mdi:home"
        x={560}
        y={230}
        color="gold"
        scale={3}
      />
    </>,
  );

  yield* waitFor(1);

  yield* all(
    flubberPath().data(CIRCLE, 1.5),
    kutePath().data(CIRCLE, 1.5),
    wildernessPath().data(CIRCLE, 1.5),
    manimPath().data(CIRCLE, 1.5),
    defaultPath().data(CIRCLE, 1.5),
  );

  yield* waitFor(0.5);

  yield* all(
    flubberPath().data(SQUARE, 1.5),
    kutePath().data(SQUARE, 1.5),
    wildernessPath().data(SQUARE, 1.5),
    manimPath().data(SQUARE, 1.5),
    defaultPath().data(SQUARE, 1.5),
  );

  yield* waitFor(0.5);

  yield* all(
    flubberPath().data(STAR, 1.5),
    kutePath().data(STAR, 1.5),
    wildernessPath().data(STAR, 1.5),
    manimPath().data(STAR, 1.5),
    defaultPath().data(STAR, 1.5),
  );

  yield* waitFor(4);

  yield* all(
    flubberLatex().tex('{{x}}^{{2}} + {{y}}^{{2}}', 1.5),
    kuteLatex().tex('{{x}}^{{2}} + {{y}}^{{2}}', 1.5),
    wildernessLatex().tex('{{x}}^{{2}} + {{y}}^{{2}}', 1.5),
    manimLatex().tex('{{x}}^{{2}} + {{y}}^{{2}}', 1.5),
    fixedLatex().tex('{{x}}^{{2}} + {{y}}^{{2}}', 1.5),
  );

  yield* waitFor(2);

  yield* all(
    flubberLatex().tex('\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}', 1.5),
    kuteLatex().tex('\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}', 1.5),
    wildernessLatex().tex(
      '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}',
      1.5,
    ),
    manimLatex().tex('\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}', 1.5),
    fixedLatex().tex('\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}', 1.5),
  );

  yield* waitFor(2);

  yield* all(
    flubberLatex().scale(0.5, 1),
    kuteLatex().scale(0.5, 1),
    wildernessLatex().scale(0.5, 1),
    manimLatex().scale(0.5, 1),
    fixedLatex().scale(0.5, 1),
  );

  yield* all(
    flubberLatex().tex('x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}', 1.5),
    kuteLatex().tex('x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}', 1.5),
    wildernessLatex().tex('x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}', 1.5),
    manimLatex().tex('x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}', 1.5),
    fixedLatex().tex('x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}', 1.5),
  );

  yield* waitFor(2);

  yield* all(
    flubberLatex().tex('E = mc^2', 1.5),
    kuteLatex().tex('E = mc^2', 1.5),
    wildernessLatex().tex('E = mc^2', 1.5),
    manimLatex().tex('E = mc^2', 1.5),
    fixedLatex().tex('E = mc^2', 1.5),
  );

  yield* all(
    flubberLatex().scale(1, 1),
    kuteLatex().scale(1, 1),
    wildernessLatex().scale(1, 1),
    manimLatex().scale(1, 1),
    fixedLatex().scale(1, 1),
  );

  yield* waitFor(4);

  yield* all(
    flubberIcon().icon('mdi:heart', 1.5),
    kuteIcon().icon('mdi:heart', 1.5),
    wildernessIcon().icon('mdi:heart', 1.5),
    manimIcon().icon('mdi:heart', 1.5),
    fixedIcon().icon('mdi:heart', 1.5),
  );

  yield* waitFor(0.5);

  yield* all(
    flubberIcon().icon('mdi:star', 1.5),
    kuteIcon().icon('mdi:star', 1.5),
    wildernessIcon().icon('mdi:star', 1.5),
    manimIcon().icon('mdi:star', 1.5),
    fixedIcon().icon('mdi:star', 1.5),
  );

  yield* waitFor(0.5);

  yield* all(
    flubberIcon().icon('mdi:home', 1.5),
    kuteIcon().icon('mdi:home', 1.5),
    wildernessIcon().icon('mdi:home', 1.5),
    manimIcon().icon('mdi:home', 1.5),
    fixedIcon().icon('mdi:home', 1.5),
  );

  yield* waitFor(2);
});
