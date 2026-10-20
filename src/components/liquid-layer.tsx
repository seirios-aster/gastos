import {
  Canvas,
  Image as SkiaImage,
  type SkImage,
  Circle,
  Group,
  LinearGradient,
  Paint,
  RadialGradient,
  Rect,
  RuntimeShader,
  Skia,
  vec,
} from '@shopify/react-native-skia';
import { File } from 'expo-file-system';
import { useState } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
  measure,
  useAnimatedRef,
  useDerivedValue,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import { BLOBS, driftAmount, type Blob } from '@/components/glow-background';
import { useTheme } from '@/hooks/use-theme';
import { useBackground } from '@/lib/background-preference';
import { useIsGlass } from '@/lib/theme-preference';

/**
 * Set to false to go back to the plain tinted card. The liquid look is drawn by the graphics
 * chip, and this is the one switch that turns it off everywhere.
 */
export const LIQUID_GLASS = true;

// The bending of light at a glass edge, as a small shader. For each pixel it measures how close it
// is to the card's rounded edge and, inside a thin band along the edge, looks at the picture a bit
// further in, so the colors behind appear to curve around the rim. Red, green and blue are bent by
// slightly different amounts (the faint color fringe real glass has), and a thin bright line
// follows the very edge.
const SOURCE = Skia.RuntimeEffect.Make(`
uniform shader image;
uniform float2 size;
uniform float radius;
uniform float band;
uniform float strength;

half4 main(float2 xy) {
  float2 p = xy - size * 0.5;
  float2 q = abs(p) - (size * 0.5 - radius);
  float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
  float depth = clamp(-d / band, 0.0, 1.0);
  float k = (1.0 - depth) * (1.0 - depth);
  float2 g;
  if (q.x > 0.0 || q.y > 0.0) {
    g = sign(p) * normalize(max(q, 0.0) + 0.0001);
  } else if (q.x > q.y) {
    g = float2(sign(p.x), 0.0);
  } else {
    g = float2(0.0, sign(p.y));
  }
  float2 shift = g * k * strength;
  half4 c;
  c.r = image.eval(xy - shift * 1.12).r;
  c.g = image.eval(xy - shift).g;
  c.b = image.eval(xy - shift * 0.88).b;
  c.a = 1.0;
  // Light from the top left: the edges facing it catch a bright sheen, the ones facing away go
  // slightly dark, and a thin bright line follows the very edge. This is what makes the glass read
  // as thick even over soft, smooth colors.
  float facing = dot(g, normalize(float2(-1.0, -1.0)));
  float sheen = max(facing, 0.0) * k * 0.55;
  float shade = max(-facing, 0.0) * k * 0.28;
  float rim = smoothstep(3.0, 0.0, -d) * 0.45;
  c.rgb = c.rgb * (1.0 - shade) + half3(sheen + rim);
  return c;
}
`);

/** The decoded photo, shared by every glass layer (it changes only when a new photo is saved). */
let photoCache: { key: string; image: SkImage | null } | null = null;

function loadPhoto(uri: string, version: number): SkImage | null {
  const key = `${uri}#${version}`;
  if (photoCache?.key === key) return photoCache.image;
  let image: SkImage | null = null;
  try {
    const handle = new File(uri).open();
    try {
      const bytes = handle.readBytes(handle.size ?? 0);
      const data = Skia.Data.fromBytes(bytes);
      image = Skia.Image.MakeImageFromEncoded(data);
    } finally {
      handle.close();
    }
  } catch (error) {
    console.log('Could not read the photo for the glass', error);
  }
  photoCache = { key, image };
  return image;
}

/** One of the screen's colored shapes, drifting exactly where the real one is. */
function LiquidBlob({
  blob,
  color,
  width,
  height,
  clock,
  still,
}: {
  blob: Blob;
  color: string;
  width: number;
  height: number;
  clock: SharedValue<number>;
  still: boolean;
}) {
  const r = blob.size / 2;
  const clear = `${color.slice(0, 7)}00`;
  const cx = useDerivedValue(() => blob.x * width + (still ? 0 : blob.dx * driftAmount(blob, clock.get())));
  const cy = useDerivedValue(() => blob.y * height + (still ? 0 : blob.dy * driftAmount(blob, clock.get())));
  const center = useDerivedValue(() => vec(cx.get(), cy.get()));
  return (
    <Circle cx={cx} cy={cy} r={r}>
      <RadialGradient c={center} r={r} colors={[color, color, clear]} positions={[0, 0.86, 1]} />
    </Circle>
  );
}

type Props = {
  radius: number;
  /** The card's tint: drawn over the bent picture, like the color of the glass itself. */
  tintFrom: string;
  tintTo: string;
  /** The card continues below (a budget strip), so the bottom edge is not a glass edge. */
  openBottom?: boolean;
};

/**
 * Fills its parent with a picture of the screen's backdrop (the colored shapes, or the person's own
 * photo with its dim), bent at the edges like a glass lens. The picture stays put on the screen
 * while the card moves over it (scrolling), so the glass really looks through to the backdrop. The parent must clip to its rounded corners. Draws nothing (the parent keeps its plain
 * tint) when the switch is off, the photo cannot be read, or the shader cannot compile.
 */
export function LiquidLayer({ radius, tintFrom, tintTo, openBottom = false }: Props) {
  const theme = useTheme();
  const background = useBackground();
  const glass = useIsGlass();
  const photo = background.uri ? loadPhoto(background.uri, background.version) : null;
  const screen = useWindowDimensions();
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  // Where this card is on the screen right now. It is read every frame on the UI thread, so the
  // backdrop drawn inside stays fixed to the screen while the card scrolls over it.
  const layer = useAnimatedRef<Animated.View>();
  // The same clock the real shapes follow, so the copies drawn here drift in step with them.
  const still = useReducedMotion();
  const clock = useSharedValue(0);
  const left = useSharedValue(0);
  const top = useSharedValue(0);
  useFrameCallback(() => {
    const at = measure(layer);
    if (at) {
      left.set(at.pageX);
      top.set(at.pageY);
    }
    clock.set(Date.now());
  });
  const toScreen = useDerivedValue(() => [{ translateX: -left.get() }, { translateY: -top.get() }]);

  // Chosen a photo but it could not be read: keep the plain tint.
  if (!LIQUID_GLASS || !glass || !SOURCE || (background.uri && !photo)) return null;

  const colors = [theme.glowA, theme.glowB, theme.glowC, theme.glowD, theme.glowE];

  return (
    <Animated.View
      ref={layer}
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setSize({ w: width, h: height });
      }}>
      {size ? (
        <Canvas style={StyleSheet.absoluteFill}>
          <Group
            layer={
              <Paint>
                <RuntimeShader
                  source={SOURCE}
                  uniforms={{ size: [size.w, size.h + (openBottom ? 400 : 0)], radius, band: 44, strength: 46 }}
                />
              </Paint>
            }>
            <Rect x={0} y={0} width={size.w} height={size.h} color={theme.background} />
            {/* The backdrop is drawn where it lies on the screen, then moved to sit under this card. */}
            <Group transform={toScreen}>
              {photo ? (
                <SkiaImage image={photo} x={0} y={0} width={screen.width} height={screen.height} fit="cover" />
              ) : (
                BLOBS.map((blob, i) => (
                  <LiquidBlob
                    key={i}
                    blob={blob}
                    color={colors[i % colors.length]}
                    width={screen.width}
                    height={screen.height}
                    clock={clock}
                    still={still}
                  />
                ))
              )}
            </Group>
            {photo ? (
              <Rect x={0} y={0} width={size.w} height={size.h} color={theme.background} opacity={background.dim} />
            ) : null}
          </Group>
          <Rect x={0} y={0} width={size.w} height={size.h}>
            <LinearGradient start={vec(0, 0)} end={vec(size.w, size.h)} colors={[tintFrom, tintTo]} />
          </Rect>
        </Canvas>
      ) : null}
    </Animated.View>
  );
}
