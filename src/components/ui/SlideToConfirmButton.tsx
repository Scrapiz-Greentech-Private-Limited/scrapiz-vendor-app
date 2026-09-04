import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const THUMB_SIZE = 54;
const TRACK_PADDING = 6;

interface SlideToConfirmButtonProps {
  label?: string;
  onConfirm: () => void;
  onDisabledPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export default function SlideToConfirmButton({
  label = 'Slide to Continue',
  onConfirm,
  onDisabledPress,
  disabled = false,
  loading = false,
}: SlideToConfirmButtonProps) {
  const [containerWidth, setContainerWidth] = useState(300);
  const containerWidthRef = useRef(300);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [completed, setCompleted] = useState(false);

  // Arrow wave opacity animateds
  const arrow1 = useRef(new Animated.Value(1)).current;
  const arrow2 = useRef(new Animated.Value(0.5)).current;
  const arrow3 = useRef(new Animated.Value(0.2)).current;

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    containerWidthRef.current = w;
    setContainerWidth(w);
  }, []);

  // Wave arrow animation — runs when active, uses native driver (opacity only)
  useEffect(() => {
    if (disabled || loading) return;

    const makeWave = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 380,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.quad),
          }),
          Animated.timing(anim, {
            toValue: 0.1,
            duration: 380,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.quad),
          }),
        ])
      );

    const a1 = makeWave(arrow1, 0);
    const a2 = makeWave(arrow2, 253);
    const a3 = makeWave(arrow3, 506);
    a1.start();
    a2.start();
    a3.start();

    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [disabled, loading, arrow1, arrow2, arrow3]);

  const snapToComplete = useCallback(() => {
    const maxSlide = containerWidthRef.current - THUMB_SIZE - TRACK_PADDING * 2;
    Animated.spring(slideAnim, {
      toValue: maxSlide,
      useNativeDriver: false,
      damping: 22,
      stiffness: 220,
    }).start(() => {
      setCompleted(true);
      setTimeout(() => {
        onConfirm();
        // Reset after a brief success moment
        setTimeout(() => {
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: false,
            damping: 18,
            stiffness: 180,
          }).start(() => setCompleted(false));
        }, 500);
      }, 220);
    });
  }, [onConfirm, slideAnim]);

  const snapBack = useCallback(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: false,
      damping: 18,
      stiffness: 180,
    }).start();
  }, [slideAnim]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabled && !loading,
        onMoveShouldSetPanResponder: (_, gs) =>
          !disabled && !loading && Math.abs(gs.dx) > 6 && Math.abs(gs.dx) > Math.abs(gs.dy),
        onPanResponderMove: (_, gesture) => {
          const maxSlide = containerWidthRef.current - THUMB_SIZE - TRACK_PADDING * 2;
          slideAnim.setValue(Math.max(0, Math.min(gesture.dx, maxSlide)));
        },
        onPanResponderRelease: (_, gesture) => {
          const maxSlide = containerWidthRef.current - THUMB_SIZE - TRACK_PADDING * 2;
          const finalX = Math.max(0, Math.min(gesture.dx, maxSlide));
          if (finalX >= maxSlide * 0.82) {
            snapToComplete();
          } else {
            snapBack();
          }
        },
        onPanResponderTerminate: () => snapBack(),
      }),
    [disabled, loading, slideAnim, snapToComplete, snapBack]
  );

  // Computed animated values — derived fresh each render using latest containerWidth
  const maxSlide = Math.max(1, containerWidth - THUMB_SIZE - TRACK_PADDING * 2);

  // Fill grows from (thumbSize + padding) to full container width
  const fillWidth = slideAnim.interpolate({
    inputRange: [0, maxSlide],
    outputRange: [THUMB_SIZE + TRACK_PADDING * 2, containerWidth],
    extrapolate: 'clamp',
  });

  // Arrows fade out as fill advances past 35%
  const arrowsOpacity = slideAnim.interpolate({
    inputRange: [0, maxSlide * 0.35],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // ─── Disabled state ────────────────────────────────────────────────────────
  if (disabled) {
    return (
      <Pressable
        style={[styles.container, styles.containerDisabled]}
        onPress={onDisabledPress}
        accessibilityLabel="Enable permissions to continue"
        accessibilityRole="button"
      >
        <View style={[styles.thumb, styles.thumbDisabled]}>
          <MaterialIcons name="lock" size={20} color="#94A3B8" />
        </View>
        <Text style={styles.labelDisabled}>Enable permissions to continue</Text>
      </Pressable>
    );
  }

  // ─── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.container, styles.containerLoading]}>
        <ActivityIndicator color="#15803D" size="small" />
        <Text style={styles.loadingLabel}>Processing…</Text>
      </View>
    );
  }

  // ─── Active slider ──────────────────────────────────────────────────────────
  return (
    <View
      style={styles.container}
      onLayout={handleLayout}
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {/* ── Green fill layer (expands left → right as thumb slides) ── */}
      <Animated.View style={[styles.fill, { width: fillWidth }]} />

      {/* ── Base label: green text visible in the unfilled area ── */}
      <View style={[StyleSheet.absoluteFill, styles.centered]}>
        <Text style={styles.labelBase}>{completed ? '✓  Done!' : label}</Text>
      </View>

      {/* ── White label clipped to fill width — the "fill bucket" paint effect ──
           The inner view is full-button-width so the text sits at the same
           horizontal position as the base label.  overflow:'hidden' clips it.   */}
      <Animated.View style={[styles.whiteClip, { width: fillWidth }]}>
        <View style={[styles.centered, { width: containerWidth, height: 66 }]}>
          <Text style={styles.labelFilled}>{completed ? '✓  Done!' : label}</Text>
        </View>
      </Animated.View>

      {/* ── Direction arrows (wave animation, fade as fill grows) ── */}
      <Animated.View style={[styles.arrowRow, { opacity: arrowsOpacity }]}>
        <Animated.View style={{ opacity: arrow1 }}>
          <MaterialIcons name="chevron-right" size={18} color="#94A3B8" />
        </Animated.View>
        <Animated.View style={{ opacity: arrow2 }}>
          <MaterialIcons name="chevron-right" size={18} color="#94A3B8" />
        </Animated.View>
        <Animated.View style={{ opacity: arrow3 }}>
          <MaterialIcons name="chevron-right" size={18} color="#94A3B8" />
        </Animated.View>
      </Animated.View>

      {/* ── Draggable thumb (white pill with chevron) ── */}
      <Animated.View
        style={[styles.thumb, { transform: [{ translateX: slideAnim }] }]}
        {...panResponder.panHandlers}
      >
        <MaterialIcons
          name={completed ? 'check' : 'chevron-right'}
          size={26}
          color="#15803D"
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 66,
    borderRadius: 33,
    backgroundColor: '#F0FDF4',
    borderWidth: 2,
    borderColor: '#86EFAC',
    overflow: 'hidden',
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#166534',
        shadowOpacity: 0.14,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 10,
      },
      android: { elevation: 3 },
    }),
  },
  containerDisabled: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: TRACK_PADDING,
    gap: 12,
  },
  containerLoading: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#15803D',
    borderRadius: 33,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelBase: {
    fontSize: 15,
    fontWeight: '700',
    color: '#15803D',
    letterSpacing: 0.4,
  },
  whiteClip: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  labelFilled: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  arrowRow: {
    position: 'absolute',
    right: 14,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  thumb: {
    position: 'absolute',
    left: TRACK_PADDING,
    top: TRACK_PADDING,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.18,
        shadowOffset: { width: 0, height: 3 },
        shadowRadius: 6,
      },
      android: { elevation: 5 },
    }),
  },
  thumbDisabled: {
    backgroundColor: '#F1F5F9',
    ...Platform.select({
      ios: { shadowOpacity: 0.06 },
      android: { elevation: 1 },
    }),
  },
  labelDisabled: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
    textAlign: 'center',
    paddingRight: THUMB_SIZE,
  },
  loadingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#15803D',
  },
});
