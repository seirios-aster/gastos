import {
  Canvas,
  Group,
  Image as SkiaImage,
  LinearGradient,
  Paint,
  Rect,
  RuntimeShader,
  makeImageFromView,
  vec,
  type SkImage,
} from '@shopify/react-native-skia';
import { useEffect, useRef, type RefObject } from 'react';
import { StyleSheet, type View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';

import { SOURCE } from '@/components/liquid-layer';
import { useTheme } from '@/hooks/use-theme';

/**
 * Set to false to go back to a plain see-through bar. The live glass takes a picture of the
 * screen over and over, which costs battery, so this is the first thing to try if it is slow.
 */
export const LIVE_GLASS = true;

/** How often to look again while nothing is touching the screen, and between failed tries. */
const IDLE_MS = 900;

/**
 * Keeps taking pictures of `content` and hands back the latest one (as a shared value, so drawing
 * it never re-renders React). It goes as fast as the phone manages while `live` is true (a finger is
 * scrolling) and slowly otherwise.
 */
function useSnapshot(content: RefObject<View | null>, enabled: boolean, live: boolean) {
  const image = useSharedValue<SkImage | null>(null);
  const fast = useRef(live);
  useEffect(() => {
    fast.current = live;
  }, [live]);

  useEffect(() => {
    if (!enabled) return;
    let stopped = false;
    const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
    (async () => {
      while (!stopped) {
        let wait = fast.current ? 0 : IDLE_MS;
        try {
          const picture = await makeImageFromView(content);
          if (!stopped && picture) image.set(picture);
          else if (!picture) wait = IDLE_MS;
        } catch {
          wait = IDLE_MS;
        }
        await pause(wait);
      }
    })();
    return () => {
      stopped = true;
    };
  }, [content, enabled, image]);

  return image;
}

type Props = {
  /** The view to look through the glass at: everything the screens draw. */
  content: RefObject<View | null>;
  /** Its size, and where this glass sits inside it. */
  contentWidth: number;
  contentHeight: number;
  left: number;
  top: number;
  /** The glass's own size and corner radius. */
  width: number;
  height: number;
  radius: number;
  /** A finger is on the screen (scrolling): pictures are taken as fast as possible. */
  live: boolean;
  tint: string;
};

/**
 * Glass that bends whatever really lies behind it, as it moves: a picture of the screen's content
 * is bent along the glass's rounded edge with the same shader the cards and buttons used.
 * Draws nothing until the first picture arrives (the parent's own tint shows meanwhile).
 */
export function LiveGlass({
  content,
  contentWidth,
  contentHeight,
  left,
  top,
  width,
  height,
  radius,
  live,
  tint,
}: Props) {
  const theme = useTheme();
  const enabled = LIVE_GLASS && !!SOURCE && contentWidth > 0 && width > 0;
  const image = useSnapshot(content, enabled, live);

  if (!enabled || !SOURCE) return null;

  return (
    <Canvas style={StyleSheet.absoluteFill}>
      <Group
        layer={
          <Paint>
            <RuntimeShader source={SOURCE} uniforms={{ size: [width, height], radius, band: 44, strength: 46 }} />
          </Paint>
        }>
        <Rect x={0} y={0} width={width} height={height} color={theme.background} />
        <SkiaImage image={image} x={-left} y={-top} width={contentWidth} height={contentHeight} fit="fill" />
      </Group>
      <Rect x={0} y={0} width={width} height={height}>
        <LinearGradient start={vec(0, 0)} end={vec(width, height)} colors={[tint, tint]} />
      </Rect>
    </Canvas>
  );
}
