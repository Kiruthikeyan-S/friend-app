import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors, Radius, Spacing } from '@/constants/colors';
import { VoiceInteractionState } from '@/hooks/useVoice';

interface VoiceButtonProps {
  state: VoiceInteractionState;
  recordingSeconds: number;
  onPress: () => void;
}

const WAVE_BAR_COUNT = 9;

export function VoiceButton({
  state,
  recordingSeconds,
  onPress,
}: VoiceButtonProps) {
  const pulseScale = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.22)).current;
  const barAnimations = useRef(
    Array.from({ length: WAVE_BAR_COUNT }, () => new Animated.Value(0.25))
  ).current;

  const isActive =
    state === 'listening' || state === 'speaking' || state === 'processing';

  useEffect(() => {
    if (!isActive) {
      pulseScale.setValue(1);
      pulseOpacity.setValue(0.18);
      barAnimations.forEach((anim) => anim.setValue(0.25));
      return;
    }

    const ringLoop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseScale, {
            toValue: 1.22,
            duration: 750,
            useNativeDriver: true,
          }),
          Animated.timing(pulseScale, {
            toValue: 1,
            duration: 750,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(pulseOpacity, {
            toValue: 0.42,
            duration: 750,
            useNativeDriver: true,
          }),
          Animated.timing(pulseOpacity, {
            toValue: 0.14,
            duration: 750,
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    const barLoops = barAnimations.map((anim, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 75),
          Animated.timing(anim, {
            toValue: state === 'processing' ? 0.55 : 1,
            duration: 260,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0.2,
            duration: 260,
            useNativeDriver: true,
          }),
        ])
      )
    );

    ringLoop.start();
    barLoops.forEach((loop) => loop.start());

    return () => {
      ringLoop.stop();
      barLoops.forEach((loop) => loop.stop());
    };
  }, [barAnimations, isActive, pulseOpacity, pulseScale, state]);

  const getCircleColor = () => {
    switch (state) {
      case 'listening':
        return Colors.voiceListening;
      case 'processing':
        return Colors.voiceProcessing;
      case 'speaking':
        return Colors.voiceSpeaking;
      default:
        return Colors.voiceIdle;
    }
  };

  const getIconName = (): keyof typeof Feather.glyphMap => {
    switch (state) {
      case 'listening':
        return 'mic';
      case 'processing':
        return 'cpu';
      case 'speaking':
        return 'volume-2';
      default:
        return 'mic';
    }
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const rem = sec % 60;
    return `${mins}:${rem < 10 ? '0' : ''}${rem}`;
  };

  const activeColor = getCircleColor();

  return (
    <View style={styles.container}>
      <View style={styles.circleStage}>
        <Animated.View
          style={[
            styles.outerRing,
            {
              backgroundColor: activeColor,
              opacity: pulseOpacity,
              transform: [{ scale: pulseScale }],
            },
          ]}
        />
        <Pressable
          onPress={onPress}
          disabled={state === 'processing'}
          style={({ pressed }) => [
            styles.mainCircle,
            { backgroundColor: activeColor },
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Voice Orb, current state ${state}`}
        >
          <Feather name={getIconName()} size={40} color={Colors.textInverse} />
          <Text style={styles.circleMainLabel}>
            {state === 'idle' && 'Tap to Talk'}
            {state === 'listening' && `Listening · ${formatTimer(recordingSeconds)}`}
            {state === 'processing' && 'Thinking...'}
            {state === 'speaking' && 'Speaking'}
          </Text>
          <Text style={styles.circleHintLabel}>
            {state === 'idle' && 'Live Voice'}
            {state === 'listening' && 'Tap to Send Now'}
            {state === 'processing' && 'Analyzing'}
            {state === 'speaking' && 'Tap to Interrupt'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.waveformContainer}>
        {barAnimations.map((anim, idx) => (
          <Animated.View
            key={`wave-bar-${idx}`}
            style={[
              styles.waveBar,
              {
                backgroundColor: isActive ? activeColor : Colors.border,
                transform: [{ scaleY: anim }],
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.md,
  },
  circleStage: {
    width: 184,
    height: 184,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerRing: {
    position: 'absolute',
    width: 174,
    height: 174,
    borderRadius: 87,
  },
  mainCircle: {
    width: 146,
    height: 146,
    borderRadius: 73,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  circleMainLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textInverse,
    marginTop: 4,
  },
  circleHintLabel: {
    fontSize: 10.5,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.82)',
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    gap: 7,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  waveBar: {
    width: 4.5,
    height: 24,
    borderRadius: 3,
  },
  pressed: {
    opacity: 0.9,
  },
});
