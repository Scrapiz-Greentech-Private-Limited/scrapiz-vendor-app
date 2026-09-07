import React, { useEffect, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';

interface ProgressSnackbarProps {
  visible: boolean;
  progress: number;
  label: string;
  subtitle?: string;
  themeColor?: string;
}

const ProgressSnackbar = ({
  visible,
  progress,
  label,
  subtitle,
  themeColor = '#16a34a',
}: ProgressSnackbarProps) => {
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(28)).current;
  const cardScale = useRef(new Animated.Value(0.96)).current;
  const progressWidth = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0.85)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: visible ? 1 : 0,
        duration: visible ? 240 : 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(cardTranslateY, {
        toValue: visible ? 0 : 28,
        useNativeDriver: true,
        tension: 60,
        friction: 10,
      }),
      Animated.spring(cardScale, {
        toValue: visible ? 1 : 0.96,
        useNativeDriver: true,
        tension: 60,
        friction: 10,
      }),
    ]).start();
  }, [cardScale, cardTranslateY, overlayOpacity, visible]);

  useEffect(() => {
    Animated.timing(progressWidth, {
      toValue: Number.isFinite(Number(progress)) ? Math.max(0, Math.min(100, Number(progress))) : 0,
      duration: 360,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progress, progressWidth]);

  useEffect(() => {
    if (!visible) {
      rotateAnim.stopAnimation();
      pulseAnim.stopAnimation();
      shimmerAnim.stopAnimation();
      return;
    }

    const rotationLoop = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 2800,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1100,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.9,
          duration: 1100,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    const shimmerLoop = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1500,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: false,
      }),
    );

    rotationLoop.start();
    pulseLoop.start();
    shimmerLoop.start();

    return () => {
      rotationLoop.stop();
      pulseLoop.stop();
      shimmerLoop.stop();
      rotateAnim.setValue(0);
      shimmerAnim.setValue(0);
    };
  }, [pulseAnim, rotateAnim, shimmerAnim, visible]);

  const numericProgress = Number.isFinite(Number(progress)) ? Number(progress) : 0;
  const clampedProgress = Math.max(0, Math.min(100, numericProgress));

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-120, 320],
  });

  const percentageLabel = useMemo(() => `${Math.round(clampedProgress)}%`, [clampedProgress]);

  if (!visible && clampedProgress <= 0) {
    return null;
  }

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[
        styles.overlay,
        {
          opacity: overlayOpacity,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.card,
          {
            transform: [{ translateY: cardTranslateY }, { scale: cardScale }],
          },
        ]}
      >
        <View style={styles.heroRow}>
          <View style={styles.loaderDock}>
            <Animated.View
              style={[
                styles.orbitRingOuter,
                {
                  borderColor: `${themeColor}35`,
                  transform: [{ rotate }, { scale: pulseAnim }],
                },
              ]}
            />
            <Animated.View
              style={[
                styles.orbitRingInner,
                {
                  borderColor: `${themeColor}70`,
                  transform: [{ rotate: rotate.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['360deg', '0deg'],
                  }) }],
                },
              ]}
            />
            <View style={[styles.loaderCore, { backgroundColor: `${themeColor}12` }]}>
              <ActivityIndicator size="large" color={themeColor} />
            </View>
          </View>

          <View style={styles.copyColumn}>
            <Text style={styles.kicker}>Scrapiz Processing</Text>
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.subtitle}>
              {subtitle || 'Please keep this screen open while we complete the secure profile update.'}
            </Text>
          </View>
        </View>

        <View style={styles.progressMetaRow}>
          <Text style={styles.progressCaption}>Live progress</Text>
          <Text style={[styles.percentage, { color: themeColor }]}>{percentageLabel}</Text>
        </View>

        <View style={styles.track}>
          <Animated.View
            style={[
              styles.fill,
              {
                backgroundColor: themeColor,
                width: progressWidth.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '100%'],
                }),
                shadowColor: themeColor,
              },
            ]}
          >
            <Animated.View
              style={[
                styles.shimmer,
                {
                  transform: [{ translateX: shimmerTranslate }],
                },
              ]}
            />
          </Animated.View>
        </View>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1200,
    backgroundColor: 'rgba(8, 15, 30, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    maxWidth: 430,
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingVertical: 24,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...Platform.select({
      ios: {
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 14 },
        shadowOpacity: 0.18,
        shadowRadius: 26,
      },
      android: {
        elevation: 18,
      },
    }),
  },
  heroRow: {
    flexDirection: 'row',
    gap: 18,
    alignItems: 'center',
  },
  loaderDock: {
    width: 104,
    height: 104,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbitRingOuter: {
    position: 'absolute',
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  orbitRingInner: {
    position: 'absolute',
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: 2,
  },
  loaderCore: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyColumn: {
    flex: 1,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: '#16a34a',
  },
  label: {
    marginTop: 6,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: '#475569',
  },
  progressMetaRow: {
    marginTop: 22,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressCaption: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  percentage: {
    fontSize: 14,
    fontWeight: '800',
  },
  track: {
    width: '100%',
    height: 12,
    borderRadius: 999,
    backgroundColor: '#e2e8f0',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
    overflow: 'hidden',
    shadowOpacity: 0.45,
    shadowRadius: 10,
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '34%',
    backgroundColor: 'rgba(255,255,255,0.28)',
    borderRadius: 999,
  },
});

export default ProgressSnackbar;
