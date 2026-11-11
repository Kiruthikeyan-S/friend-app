import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Colors } from '@/constants/colors';

/**
 * Ambient Pastel Glassmorphism Background
 * Renders soft diffused rose, lavender, and aqua light spheres behind frosted glass cards.
 */
export function GlassBackground({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.root}>
      {/* Soft diffused ambient light spheres */}
      <View pointerEvents="none" style={styles.ambientTopRight} />
      <View pointerEvents="none" style={styles.ambientCenterLeft} />
      <View pointerEvents="none" style={styles.ambientBottomRight} />
      <View pointerEvents="none" style={styles.ambientBottomLeft} />
      {children}
    </View>
  );
}

/**
 * Mini 3D Iridescent Glass Orb Avatar
 * Used in the "Voice Pulse" top pill and next to Aura's assistant chat messages.
 */
export function IridescentMiniOrb({ size = 26 }: { size?: number }) {
  const half = size / 2;
  return (
    <View
      style={[
        styles.miniOrbOuter,
        {
          width: size,
          height: size,
          borderRadius: half,
        },
      ]}
    >
      {/* Pink-Magenta Top Layer */}
      <View
        style={[
          styles.miniOrbPink,
          {
            width: size * 0.78,
            height: size * 0.78,
            borderRadius: (size * 0.78) / 2,
          },
        ]}
      />
      {/* Cyan-Aqua Bottom Refraction */}
      <View
        style={[
          styles.miniOrbCyan,
          {
            width: size * 0.65,
            height: size * 0.44,
            borderRadius: size * 0.3,
          },
        ]}
      />
      {/* Specular White Glass Highlight */}
      <View
        style={[
          styles.miniOrbSpecular,
          {
            width: size * 0.42,
            height: size * 0.22,
            borderRadius: size * 0.2,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  ambientTopRight: {
    position: 'absolute',
    top: -60,
    right: -50,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: Colors.ambientPinkGlow,
  },
  ambientCenterLeft: {
    position: 'absolute',
    top: '30%',
    left: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: Colors.ambientLavenderGlow,
  },
  ambientBottomRight: {
    position: 'absolute',
    bottom: 60,
    right: -70,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: Colors.ambientPinkGlow,
  },
  ambientBottomLeft: {
    position: 'absolute',
    bottom: '22%',
    left: '20%',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: Colors.ambientCyanGlow,
  },
  miniOrbOuter: {
    backgroundColor: '#F694D2',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#D95BA3',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 6,
    elevation: 3,
  },
  miniOrbPink: {
    position: 'absolute',
    top: 1,
    backgroundColor: '#EC6AB5',
    opacity: 0.85,
  },
  miniOrbCyan: {
    position: 'absolute',
    bottom: 1,
    backgroundColor: '#5CE1E6',
    opacity: 0.9,
  },
  miniOrbSpecular: {
    position: 'absolute',
    top: 2,
    left: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    transform: [{ rotate: '-18deg' }],
  },
});
