import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';

interface Props {
  visible: boolean;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss: () => void;
  duration?: number;
}

export default function Snackbar({ visible, message, actionLabel, onAction, onDismiss, duration = 5000 }: Props) {
  const translateY = useRef(new Animated.Value(100)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
      const timer = setTimeout(() => { onDismiss(); }, duration);
      return () => clearTimeout(timer);
    } else {
      Animated.timing(translateY, { toValue: 100, duration: 200, useNativeDriver: true }).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View style={[st.container, { transform: [{ translateY }] }]}>
      <Text style={st.message} numberOfLines={2}>{message}</Text>
      {actionLabel && onAction && (
        <TouchableOpacity onPress={onAction} style={st.actionBtn}>
          <Text style={st.actionText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const st = StyleSheet.create({
  container: { position: 'absolute', bottom: 90, left: 20, right: 20, backgroundColor: '#2C5F2D', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, zIndex: 999 },
  message: { color: '#FFF', fontSize: 14, flex: 1, marginRight: 12 },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 6 },
  actionText: { color: '#D4AF37', fontSize: 14, fontWeight: '700', textTransform: 'uppercase' },
});
