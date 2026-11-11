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

export default function RegisterScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [authResult, setAuthResult] = useState<AuthAttemptResult | null>(null);

  const handleRegister = async () => {
    const fieldErrors = AuthService.validateRegistration({
      fullName,
      email,
      password,
      confirmPassword,
    });
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) {
      setAuthResult(null);
      return;
    }

    const result = await AuthService.registerWithEmail({
      fullName,
      email,
      password,
      confirmPassword,
    });
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
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityRole="button"
          >
            <Feather name="arrow-left" size={20} color={Colors.textPrimary} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>

          <View style={styles.headerBlock}>
            <Text style={styles.title}>Create your account</Text>
            <Text style={styles.subtitle}>
              Set up your details for Aura. Account persistence will connect via
              Firebase Authentication in Phase 6.
            </Text>
          </View>

          <View style={styles.formCard}>
            {/* Full Name */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Full Name</Text>
              <View
                style={[
                  styles.inputWrapper,
                  errors.fullName ? styles.inputError : null,
                ]}
              >
                <Feather name="user" size={17} color={Colors.textMuted} />
                <TextInput
                  style={styles.input}
                  value={fullName}
                  onChangeText={(text) => {
                    setFullName(text);
                    if (errors.fullName)
                      setErrors({ ...errors, fullName: undefined });
                  }}
                  placeholder="Alex Morgan"
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="words"
                />
              </View>
              {errors.fullName ? (
                <Text style={styles.errorText}>{errors.fullName}</Text>
              ) : null}
            </View>

            {/* Email */}
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

            {/* Password */}
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
                  placeholder="8+ chars with letters & numbers"
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

            {/* Confirm Password */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Confirm Password</Text>
              <View
                style={[
                  styles.inputWrapper,
                  errors.confirmPassword ? styles.inputError : null,
                ]}
              >
                <Feather name="check-circle" size={17} color={Colors.textMuted} />
                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    if (errors.confirmPassword)
                      setErrors({ ...errors, confirmPassword: undefined });
                  }}
                  placeholder="Re-enter your password"
                  placeholderTextColor={Colors.textMuted}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
              </View>
              {errors.confirmPassword ? (
                <Text style={styles.errorText}>{errors.confirmPassword}</Text>
              ) : null}
            </View>

            <Pressable
              onPress={handleRegister}
              style={({ pressed }) => [
                styles.submitButton,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Validate and Register"
            >
              <Text style={styles.submitButtonText}>Create Account</Text>
            </Pressable>
          </View>

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
                  Continue to Phase 1 Workspace
                </Text>
                <Feather name="arrow-right" size={15} color={Colors.primary} />
              </Pressable>
            </View>
          ) : null}

          <View style={styles.bottomRow}>
            <Text style={styles.bottomText}>Already have an account?</Text>
            <Pressable onPress={() => router.push('/(auth)/login')}>
              <Text style={styles.bottomLink}>Sign In</Text>
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
