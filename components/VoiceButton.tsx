import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Colors, Radius } from '@/constants/colors';
import { VoiceInteractionState } from '@/hooks/useVoice';

interface VoiceButtonProps {
  state: VoiceInteractionState;
  recordingSeconds: number;
  onPress: () => void;
}

export function VoiceButton({
  state,
  recordingSeconds,
  onPress,
}: VoiceButtonProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const isActive = state !== 'idle';

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: isActive ? 1.12 : 1.03,
          duration: state === 'listening' ? 680 : 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: state === 'listening' ? 680 : 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -6,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 6,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    const shimmerLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: isActive ? 900 : 2200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: isActive ? 900 : 2200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    pulseLoop.start();
    floatLoop.start();
    shimmerLoop.start();

    return () => {
      pulseLoop.stop();
      floatLoop.stop();
      shimmerLoop.stop();
    };
  }, [floatAnim, pulseAnim, shimmerAnim, state]);

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const rem = sec % 60;
    return `${mins}:${rem < 10 ? '0' : ''}${rem}`;
  };

  const stateBadgeLabel =
    state === 'listening'
      ? `Listening · ${formatTimer(recordingSeconds)}`
      : state === 'processing'
      ? 'Recognizing...'
      : state === 'speaking'
      ? 'Speaking Live'
      : 'Tap Bubble to Speak';

  return (
    <View style={styles.container}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`3D Glass Voice Orb. ${stateBadgeLabel}`}
        style={({ pressed }) => [
          styles.orbTouchArea,
          pressed && { transform: [{ scale: 0.96 }] },
        ]}
      >
        {/* Diffused Ambient Halo Behind Glass Bubble */}
        <Animated.View
          style={[
            styles.ambientHalo,
            {
              transform: [{ scale: pulseAnim }],
              opacity: state === 'idle' ? 0.55 : 0.9,
            },
          ]}
        />

        {/* Floating 3D Iridescent Glass Bubble Sphere */}
        <Animated.View
          style={[
            styles.glassSphereOuter,
            {
              transform: [
                { translateY: floatAnim },
                { scale: state === 'idle' ? 1 : pulseAnim },
              ],
            },
          ]}
        >
          {/* Outer Dark Violet-Rose Glass Rim Refraction */}
          <View style={styles.rimDarkRefraction} />

          {/* Soft Pastel Pink Core Body */}
          <View style={styles.pinkCoreLayer} />

          {/* Iridescent Cyan-Aqua Lower Hemisphere Glow */}
          <Animated.View
            style={[
              styles.cyanBottomGlow,
              {
                opacity: shimmerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.78, 1],
                }),
                transform: [
                  {
                    scale: shimmerAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.96, 1.06],
                    }),
                  },
                ],
              },
            ]}
          />

          {/* Violet-Magenta Side Swirl */}
          <View style={styles.magentaSideSwirl} />

          {/* Top-Left Glossy White Specular Glass Arc */}
          <View style={styles.specularTopArc} />
          <View style={styles.specularTopDot} />

          {/* Bottom-Right Rim Highlight */}
          <View style={styles.specularBottomRim} />

          {/* Subtle Inner Glass Ring */}
          <View style={styles.innerGlassRing} />
        </Animated.View>
      </Pressable>

      {/* Frosted Glass State Pill Under the Bubble */}
      <View style={styles.stateGlassPill}>
        <View
          style={[
            styles.liveDot,
            {
              backgroundColor:
                state === 'listening'
                  ? Colors.primary
                  : state === 'speaking'
                  ? Colors.orbCyan
                  : state === 'processing'
                  ? Colors.accent
                  : Colors.success,
            },
          ]}
        />
        <Text style={styles.stateGlassPillText}>{stateBadgeLabel}</Text>
      </View>
    </View>
  );
}

const SPHERE_SIZE = 192;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  orbTouchArea: {
    width: SPHERE_SIZE + 36,
    height: SPHERE_SIZE + 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ambientHalo: {
    position: 'absolute',
    width: SPHERE_SIZE + 30,
    height: SPHERE_SIZE + 30,
    borderRadius: (SPHERE_SIZE + 30) / 2,
    backgroundColor: 'rgba(244, 130, 200, 0.25)',
    shadowColor: '#EC6AB5',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.35,
    shadowRadius: 28,
    elevation: 8,
  },
  glassSphereOuter: {
    width: SPHERE_SIZE,
    height: SPHERE_SIZE,
    borderRadius: SPHERE_SIZE / 2,
    backgroundColor: 'rgba(253, 213, 240, 0.85)',
    borderWidth: 2.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8B3A75',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.28,
    shadowRadius: 22,
    elevation: 10,
  },
  rimDarkRefraction: {
    position: 'absolute',
    width: SPHERE_SIZE - 6,
    height: SPHERE_SIZE - 6,
    borderRadius: (SPHERE_SIZE - 6) / 2,
    borderWidth: 7,
    borderColor: 'rgba(112, 36, 98, 0.28)',
  },
  pinkCoreLayer: {
    position: 'absolute',
    top: 12,
    width: SPHERE_SIZE * 0.84,
    height: SPHERE_SIZE * 0.72,
    borderRadius: SPHERE_SIZE * 0.42,
    backgroundColor: '#F69FD6',
    opacity: 0.88,
  },
  cyanBottomGlow: {
    position: 'absolute',
    bottom: 8,
    width: SPHERE_SIZE * 0.78,
    height: SPHERE_SIZE * 0.46,
    borderRadius: SPHERE_SIZE * 0.38,
    backgroundColor: '#56E0E8',
  },
  magentaSideSwirl: {
    position: 'absolute',
    right: 10,
    bottom: 26,
    width: SPHERE_SIZE * 0.45,
    height: SPHERE_SIZE * 0.45,
    borderRadius: SPHERE_SIZE * 0.25,
    backgroundColor: '#D946EF',
    opacity: 0.45,
  },
  specularTopArc: {
    position: 'absolute',
    top: 14,
    left: 22,
    width: SPHERE_SIZE * 0.56,
    height: SPHERE_SIZE * 0.24,
    borderRadius: SPHERE_SIZE * 0.25,
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    transform: [{ rotate: '-16deg' }],
  },
  specularTopDot: {
    position: 'absolute',
    top: 44,
    left: 24,
    width: 16,
    height: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    transform: [{ rotate: '-25deg' }],
  },
  specularBottomRim: {
    position: 'absolute',
    bottom: 12,
    right: 26,
    width: SPHERE_SIZE * 0.44,
    height: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    transform: [{ rotate: '-14deg' }],
  },
  innerGlassRing: {
    position: 'absolute',
    width: SPHERE_SIZE - 16,
    height: SPHERE_SIZE - 16,
    borderRadius: (SPHERE_SIZE - 16) / 2,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.65)',
  },
  stateGlassPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.96)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  stateGlassPillText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
});
