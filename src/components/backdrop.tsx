import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { GlowBackground } from '@/components/glow-background';
import { useTheme } from '@/hooks/use-theme';
import { useBackground } from '@/lib/background-preference';

/**
 * What lies behind every screen: the person's own photo with the screen color laid over it (so
 * text stays readable), or the default drifting colors. Frosted cards blur whichever it is.
 */
export function Backdrop() {
  const theme = useTheme();
  const background = useBackground();

  if (!background.uri) return <GlowBackground />;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Image
        source={{ uri: background.uri }}
        // A new photo has the same file name, so draw it again whenever the version changes.
        recyclingKey={String(background.version)}
        cachePolicy="none"
        contentFit="cover"
        transition={null}
        style={StyleSheet.absoluteFill}
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.background, opacity: background.dim }]} />
    </View>
  );
}
