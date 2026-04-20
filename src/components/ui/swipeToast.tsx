import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export type SwipeToastType = 'success' | 'error' | 'info';

interface SwipeToastProps {
  visible: boolean;
  message: string;
  type?: SwipeToastType;
  duration?: number;
  onHide: () => void;
}

const TOAST_COLORS: Record<SwipeToastType, { bg: string; border: string; icon: string; text: string }> = {
  success: {
    bg: '#ecfdf5',
    border: '#86efac',
    icon: '#15803d',
    text: '#14532d',
  },
  error: {
    bg: '#fef2f2',
    border: '#fca5a5',
    icon: '#b91c1c',
    text: '#7f1d1d',
  },
  info: {
    bg: '#eff6ff',
    border: '#93c5fd',
    icon: '#1d4ed8',
    text: '#1e3a8a',
  },
};

const TOAST_ICONS: Record<SwipeToastType, keyof typeof Ionicons.glyphMap> = {
  success: 'checkmark-circle',
  error: 'alert-circle',
  info: 'information-circle',
};

const SwipeToast = ({
  visible,
  message,
  type = 'info',
  duration = 3000,
  onHide,
}: SwipeToastProps) => {
  const [mounted, setMounted] = useState(visible);
  const translateY = useRef(new Animated.Value(120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const animateOut = useCallback(
    (after?: () => void) => {
      clearHideTimer();
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 120,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setMounted(false);
        if (after) {
          after();
        }
      });
    },
    [clearHideTimer, opacity, translateY]
  );

  const requestHide = useCallback(() => {
    animateOut(onHide);
  }, [animateOut, onHide]);

  useEffect(() => {
    if (!visible) {
      if (mounted) {
        animateOut();
      }
      return;
    }

    setMounted(true);
    clearHideTimer();
    translateY.setValue(120);
    opacity.setValue(0);

    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 18,
        stiffness: 180,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();

    if (duration > 0) {
      hideTimerRef.current = setTimeout(() => {
        requestHide();
      }, duration);
    }

    return clearHideTimer;
  }, [
    animateOut,
    clearHideTimer,
    duration,
    message,
    mounted,
    opacity,
    requestHide,
    translateY,
    visible,
  ]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dy) > 6 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dy < 0) {
            translateY.setValue(Math.max(gestureState.dy, -100));
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy < -45 || gestureState.vy < -0.75) {
            requestHide();
            return;
          }
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            damping: 18,
            stiffness: 180,
          }).start();
        },
      }),
    [requestHide, translateY]
  );

  useEffect(() => {
    return clearHideTimer;
  }, [clearHideTimer]);

  if (!mounted) {
    return null;
  }

  const palette = TOAST_COLORS[type];

  return (
    <View style={styles.root} pointerEvents="box-none">
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.toast,
          {
            backgroundColor: palette.bg,
            borderColor: palette.border,
            opacity,
            transform: [{ translateY }],
          },
        ]}
      >
        <Ionicons name={TOAST_ICONS[type]} size={20} color={palette.icon} style={styles.icon} />
        <View style={styles.body}>
          <Text style={[styles.message, { color: palette.text }]}>{message}</Text>
          <Text style={styles.hint}>Swipe up to dismiss</Text>
        </View>
        <Pressable hitSlop={10} onPress={requestHide} style={styles.closeButton}>
          <Ionicons name="close" size={18} color={palette.icon} />
        </Pressable>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 28,
    zIndex: 1200,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#0f172a',
        shadowOpacity: 0.14,
        shadowOffset: { width: 0, height: 10 },
        shadowRadius: 14,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  icon: {
    marginRight: 10,
  },
  body: {
    flex: 1,
  },
  message: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  hint: {
    marginTop: 2,
    color: '#475569',
    fontSize: 11,
    fontWeight: '500',
  },
  closeButton: {
    marginLeft: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default SwipeToast;
