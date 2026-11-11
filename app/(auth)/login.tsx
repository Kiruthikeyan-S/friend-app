import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Colors, Radius, Spacing } from '@/constants/colors';
import { AuthService, ValidationErrors } from '@/services/auth';
import { AuthAttemptResult } from '@/types/user';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [authResult, setAuthResult] = useState<AuthAttemptResult | null>(null);

  const handleSignIn = async () => {
    const fieldErrors = AuthService.validateLogin({ email, password });
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) {
      setAuthResult(null);
      return;
    }

    const result = await AuthService.signInWithEmail({ email, password });
    setAuthResult(result);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 16}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back button */}
          <Pressable
            onPress={() => router.replace('/')}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Back to Welcome screen"
          >
            <Feather name="arrow-left" size={20} color={Colors.textPrimary} />
            <Text style={styles.backText}>Welcome</Text>
          </Pressable>

          <View style={styles.headerBlock}>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>
              Sign in with your email and password. Firebase Authentication
              integration is prepared for Phase 6.
            </Text>
          </View>

          <View style={styles.formCard}>
            {/* Email Field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email Address</Text>
              <View
                style={[
                  styles.inputWrapper,
                  errors.email ? styles.inputError : null,
                ]}
              >
                <Feather name="mail" size={17} color={Colors.textMuted} />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (errors.email) setErrors({ ...errors, email: undefined });
                  }}
                  placeholder="you@example.com"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              {errors.email ? (
                <Text style={styles.errorText}>{errors.email}</Text>
              ) : null}
            </View>

            {/* Password Field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Password</Text>
              <View
                style={[
                  styles.inputWrapper,
                  errors.password ? styles.inputError : null,
                ]}
              >
                <Feather name="lock" size={17} color={Colors.textMuted} />
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (errors.password)
                      setErrors({ ...errors, password: undefined });
                  }}
                  placeholder="At least 8 characters"
                  placeholderTextColor={Colors.textMuted}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <Pressable
                  onPress={() => setShowPassword((prev) => !prev)}
                  hitSlop={8}
                >
                  <Feather
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={17}
                    color={Colors.textSecondary}
                  />
                </Pressable>
              </View>
              {errors.password ? (
                <Text style={styles.errorText}>{errors.password}</Text>
              ) : null}
            </View>

            {/* Submit Button */}
            <Pressable
              onPress={handleSignIn}
              style={({ pressed }) => [
                styles.submitButton,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Validate and Sign In"
            >
              <Text style={styles.submitButtonText}>Sign In</Text>
            </Pressable>
          </View>

          {/* Honest Phase 6 Status Notice (No Fake Authentication) */}
          {authResult ? (
            <View style={styles.integrationNoticeCard}>
              <View style={styles.noticeHeader}>
                <Feather name="info" size={18} color={Colors.warning} />
                <Text style={styles.noticeTitle}>{authResult.phaseNote}</Text>
              </View>
              <Text style={styles.noticeBody}>{authResult.message}</Text>
              <Pressable
                onPress={() => router.replace('/(tabs)/chat')}
                style={({ pressed }) => [
                  styles.workspacePreviewBtn,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.workspacePreviewBtnText}>
                  Open Phase 1 Assistant Workspace
                </Text>
                <Feather name="arrow-right" size={15} color={Colors.primary} />
              </Pressable>
            </View>
          ) : null}

          {/* Navigation to Register */}
          <View style={styles.bottomRow}>
            <Text style={styles.bottomText}>Don’t have an account yet?</Text>
            <Pressable onPress={() => router.push('/(auth)/register')}>
              <Text style={styles.bottomLink}>Create Account</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
  },
  backText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  headerBlock: {
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: Colors.textSecondary,
  },
  formCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    gap: Spacing.lg,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSoft,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    height: 50,
    gap: Spacing.sm,
  },
  inputError: {
    borderColor: Colors.error,
    backgroundColor: Colors.surfaceDanger,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  errorText: {
    fontSize: 12,
    color: Colors.error,
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xs,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textInverse,
  },
  integrationNoticeCard: {
    marginTop: Spacing.xl,
    backgroundColor: Colors.surfaceWarning,
    borderWidth: 1,
    borderColor: '#F6AD55',
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  noticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.warning,
  },
  noticeBody: {
    fontSize: 13,
    lineHeight: 19,
    color: Colors.textPrimary,
  },
  workspacePreviewBtn: {
    marginTop: Spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 11,
    borderRadius: Radius.md,
  },
  workspacePreviewBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: Spacing.xxl,
  },
  bottomText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  bottomLink: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  pressed: {
    opacity: 0.85,
  },
});
