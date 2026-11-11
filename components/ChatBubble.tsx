import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { IridescentMiniOrb } from '@/components/GlassBackground';
import { Colors, Radius } from '@/constants/colors';
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
  const [liked, setLiked] = useState(false);

  if (isUser) {
    return (
      <View style={styles.userRow}>
        <View style={styles.bubbleUser}>
          <Text style={styles.messageTextUser}>{message.content}</Text>
        </View>
        <View style={styles.userAvatarCircle}>
          <Feather name="user" size={14} color={Colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.assistantBlock}>
      {/* Frosted Glass Assistant Message Card */}
      <View style={styles.bubbleAssistant}>
        <Text style={styles.messageTextAssistant}>{message.content}</Text>
      </View>

      {/* Glass Action Strip Underneath Assistant Message (Matching Mockup) */}
      <View style={styles.assistantActionRow}>
        <IridescentMiniOrb size={26} />

        <View style={styles.actionIconsLeft}>
          <Pressable
            onPress={() => onTogglePlayback(message.id, message.content)}
            style={({ pressed }) => [
              styles.glassIconCircle,
              isPlaying && styles.glassIconCircleActive,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={
              isPlaying ? 'Stop voice playback' : 'Play voice aloud'
            }
          >
            <Feather
              name={isPlaying ? 'volume-x' : 'volume-2'}
              size={13}
              color={isPlaying ? Colors.primary : Colors.textSecondary}
            />
          </Pressable>

          <Pressable
            onPress={() => setLiked((prev) => !prev)}
            style={({ pressed }) => [
              styles.glassIconCircle,
              liked && styles.glassIconCircleActive,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Like response"
          >
            <Feather
              name="thumbs-up"
              size={12.5}
              color={liked ? Colors.primary : Colors.textSecondary}
            />
          </Pressable>

          <Text style={styles.timestampText}>{message.createdAt}</Text>
        </View>

        <Pressable
          onPress={() => onTogglePlayback(message.id, message.content)}
          style={({ pressed }) => [
            styles.replayGlassBtn,
            isPlaying && styles.glassIconCircleActive,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Replay voice"
        >
          <Feather
            name="repeat"
            size={12.5}
            color={isPlaying ? Colors.primary : Colors.textSecondary}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  userRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    alignSelf: 'flex-end',
    gap: 8,
    marginVertical: 8,
    maxWidth: '88%',
  },
  bubbleUser: {
    backgroundColor: Colors.userBubble,
    borderRadius: 20,
    borderBottomRightRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#D95BA3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 3,
  },
  messageTextUser: {
    fontSize: 14.5,
    lineHeight: 21,
    fontWeight: '500',
    color: Colors.userBubbleText,
  },
  userAvatarCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  assistantBlock: {
    alignSelf: 'flex-start',
    maxWidth: '88%',
    marginVertical: 8,
  },
  bubbleAssistant: {
    backgroundColor: Colors.assistantBubble,
    borderRadius: 22,
    borderTopLeftRadius: 8,
    borderWidth: 1.2,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#9D7BB0',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 2,
  },
  messageTextAssistant: {
    fontSize: 14.5,
    lineHeight: 22,
    color: Colors.assistantBubbleText,
  },
  assistantActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 7,
    paddingHorizontal: 2,
  },
  actionIconsLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 8,
  },
  glassIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glassIconCircleActive: {
    backgroundColor: Colors.primarySoft,
    borderColor: Colors.primary,
  },
  replayGlassBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timestampText: {
    fontSize: 11,
    color: Colors.textMuted,
    marginLeft: 4,
  },
  pressed: {
    opacity: 0.78,
  },
});
