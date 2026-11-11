import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Colors, Radius, Spacing } from '@/constants/colors';
import { AppConfig } from '@/constants/config';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Phase Badge */}
        <View style={styles.topBar}>
          <View style={styles.phasePill}>
            <View style={styles.statusDot} />
            <Text style={styles.phasePillText}>{AppConfig.version}</Text>
          </View>
        </View>

        {/* Simple, Warm Brand Identity */}
        <View style={styles.heroSection}>
          <View style={styles.brandMark}>
            <View style={styles.brandInnerCircle}>
              <Feather name="mic" size={28} color={Colors.primary} />
            </View>
          </View>

          <Text style={styles.appName}>{AppConfig.appName}</Text>
          <Text style={styles.tagline}>
            Your calm, everyday voice & text companion
          </Text>

          <Text style={styles.description}>
            Talk naturally like you would with a thoughtful friend. Ask questions,
            think out loud by voice, and stay in complete control of what is
            remembered about you.
          </Text>
        </View>

        {/* Value Highlights */}
        <View style={styles.highlightsCard}>
          <View style={styles.highlightRow}>
            <View style={styles.highlightIconBox}>
              <Feather name="message-circle" size={18} color={Colors.primary} />
            </View>
            <View style={styles.highlightTextCol}>
              <Text style={styles.highlightTitle}>Natural Text & Voice</Text>
              <Text style={styles.highlightSubtitle}>
                Switch effortlessly between typing and speaking whenever it suits you.
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.highlightRow}>
            <View style={styles.highlightIconBox}>
              <Feather name="shield" size={18} color={Colors.accent} />
            </View>
            <View style={styles.highlightTextCol}>
              <Text style={styles.highlightTitle}>Consent-First Memory</Text>
              <Text style={styles.highlightSubtitle}>
                Nothing personal is ever saved automatically. You approve every memory.
              </Text>
            </View>
          </View>
        </View>

        {/* Primary & Secondary Actions */}
        <View style={styles.footerActions}>
          <Pressable
            onPress={() => router.push('/(tabs)/chat')}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Get Started"
          >
            <Text style={styles.primaryButtonText}>Get Started</Text>
            <Feather name="arrow-right" size={18} color={Colors.textInverse} />
          </Pressable>

          <Pressable
            onPress={() => router.push('/(auth)/login')}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Sign In"
          >
            <Text style={styles.secondaryButtonText}>Sign In with Email</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/(auth)/register')}
            style={styles.textLinkButton}
            accessibilityRole="button"
          >
            <Text style={styles.textLinkLabel}>
              New here? <Text style={styles.textLinkStrong}>Create an account</Text>
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxxl,
    justifyContent: 'space-between',
  },
  topBar: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  phasePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.accent,
  },
  phasePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  heroSection: {
    alignItems: 'center',
    marginVertical: Spacing.lg,
  },
  brandMark: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  brandInnerCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  appName: {
    fontSize: 34,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: Spacing.xs,
  },
  tagline: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  description: {
    fontSize: 15,
    lineHeight: 23,
    color: Colors.textSecondary,
    textAlign: 'center',
    maxWidth: 340,
  },
  highlightsCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    marginVertical: Spacing.lg,
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  highlightIconBox: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlightTextCol: {
    flex: 1,
  },
  highlightTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  highlightSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: Colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: Spacing.lg,
  },
  footerActions: {
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: Radius.lg,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textInverse,
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 15,
    borderRadius: Radius.lg,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  textLinkButton: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  textLinkLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  textLinkStrong: {
    color: Colors.primary,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.85,
  },
});
