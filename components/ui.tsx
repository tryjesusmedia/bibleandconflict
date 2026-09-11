import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors, radius } from '@/constants/theme';

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <Text style={styles.eyebrow}>{children}</Text>;
}

type ButtonProps = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
};

export function GoldButton({ title, onPress, disabled, loading }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled || loading), busy: Boolean(loading) }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed, (disabled || loading) && styles.disabled]}
    >
      {loading ? <ActivityIndicator color={colors.navy} /> : <Text style={styles.buttonText}>{title}</Text>}
    </Pressable>
  );
}

export function OutlineButton({ title, onPress, disabled, loading }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled || loading), busy: Boolean(loading) }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [styles.outline, pressed && styles.pressed, (disabled || loading) && styles.disabled]}
    >
      {loading ? <ActivityIndicator color={colors.gold} /> : <Text style={styles.outlineText}>{title}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.panel,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
  },
  eyebrow: {
    color: colors.gold,
    letterSpacing: 1.6,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 7,
  },
  button: {
    backgroundColor: colors.gold,
    borderRadius: radius.md,
    minHeight: 54,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: colors.navy, fontWeight: '900', fontSize: 17, lineHeight: 22, textAlign: 'center' },
  outline: {
    borderColor: colors.gold,
    borderWidth: 1,
    borderRadius: radius.md,
    minHeight: 52,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineText: { color: colors.ivory, fontWeight: '900', fontSize: 16, lineHeight: 21, textAlign: 'center' },
  pressed: { opacity: 0.78 },
  disabled: { opacity: 0.45 },
});
