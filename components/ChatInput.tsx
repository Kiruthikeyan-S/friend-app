import React from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors, Radius, Spacing } from '@/constants/colors';

interface ChatInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onPressMicrophone: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  value,
  onChangeText,
  onSend,
  onPressMicrophone,
  disabled = false,
  placeholder = 'Ask me something...',
}: ChatInputProps) {
  const canSend = value.trim().length > 0 && !disabled;

  return (
    <View style={styles.outerContainer}>
      <View style={styles.glassCapsule}>
        <Pressable
          onPress={onPressMicrophone}
          style={({ pressed }) => [
            styles.leftAttachBtn,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Quick voice or prompt"
        >
          <Feather name="paperclip" size={16} color={Colors.textSecondary} />
        </Pressable>

        <TextInput
          style={styles.textInput}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          multiline
          maxLength={1000}
          editable={!disabled}
          returnKeyType="send"
          blurOnSubmit={false}
          onSubmitEditing={() => {
            if (canSend) onSend();
          }}
        />

        <Pressable
          onPress={onPressMicrophone}
          style={({ pressed }) => [
            styles.inlineMicBtn,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Open voice assistant"
        >
          <Feather name="mic" size={17} color={Colors.textPrimary} />
        </Pressable>
      </View>

      <Pressable
        onPress={onSend}
        disabled={!canSend}
        style={({ pressed }) => [
          styles.sendGlassCircle,
          canSend && styles.sendGlassCircleActive,
          pressed && canSend && styles.pressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Send message"
      >
        <Feather
          name="send"
          size={17}
          color={canSend ? Colors.textInverse : Colors.textPrimary}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: Spacing.lg,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: 'transparent',
  },
  glassCapsule: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.86)',
    borderRadius: Radius.full,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.96)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    shadowColor: '#9D7BB0',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 3,
  },
  leftAttachBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    flex: 1,
    minHeight: 38,
    maxHeight: 100,
    paddingHorizontal: 6,
    paddingTop: 8,
    paddingBottom: 8,
    fontSize: 14.5,
    color: Colors.textPrimary,
  },
  inlineMicBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendGlassCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#9D7BB0',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 3,
  },
  sendGlassCircleActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  pressed: {
    opacity: 0.8,
  },
});
