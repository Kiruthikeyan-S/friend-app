import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors, Radius, Spacing } from '@/constants/colors';
import { ChatMessage } from '@/types/chat';

interface ChatBubbleProps {
  message: ChatMessage;
  isPlaying: boolean;
  onTogglePlayback: (messageId: string, text?: string) => void;
}

export function ChatBubble({
  message,
  isPlaying,
  onTogglePlayback,
}: ChatBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <View
      style={[
        styles.wrapper,
        isUser ? styles.wrapperUser : styles.wrapperAssistant,
      ]}
    >
      <View
        style={[
          styles.bubble,
          isUser ? styles.bubbleUser : styles.bubbleAssistant,
        ]}
      >
        <Text
          style={[
            styles.messageText,
            isUser ? styles.messageTextUser : styles.messageTextAssistant,
          ]}
        >
          {message.content}
        </Text>

        <View style={styles.metaRow}>
          <Text
            style={[
              styles.timestamp,
              isUser ? styles.timestampUser : styles.timestampAssistant,
            ]}
          >
            {message.createdAt}
          </Text>

          {!isUser && (
            <Pressable
              onPress={() => onTogglePlayback(message.id, message.content)}
              style={({ pressed }) => [
                styles.playbackButton,
                isPlaying && styles.playbackButtonActive,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={
                isPlaying ? 'Stop speaking' : 'Listen to Aura speak this reply'
              }
            >
              <Feather
                name={isPlaying ? 'square' : 'volume-2'}
                size={13}
                color={isPlaying ? Colors.primary : Colors.textSecondary}
              />
              <Text
                style={[
                  styles.playbackText,
                  isPlaying && styles.playbackTextActive,
                ]}
              >
                {isPlaying ? 'Stop Voice' : 'Speak'}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 6,
    maxWidth: '85%',
  },
  wrapperUser: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  wrapperAssistant: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  bubble: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  bubbleUser: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 5,
  },
  bubbleAssistant: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderBottomLeftRadius: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  messageText: {
    fontSize: 15.5,
    lineHeight: 22,
  },
  messageTextUser: {
    color: Colors.textInverse,
  },
  messageTextAssistant: {
    color: Colors.textPrimary,
  },
  metaRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  timestamp: {
    fontSize: 11,
  },
  timestampUser: {
    color: 'rgba(255,255,255,0.78)',
  },
  timestampAssistant: {
    color: Colors.textMuted,
  },
  playbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.surfaceSoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  playbackButtonActive: {
    backgroundColor: Colors.primarySoft,
  },
  playbackText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  playbackTextActive: {
    color: Colors.primary,
  },
  pressed: {
    opacity: 0.8,
  },
});
