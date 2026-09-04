import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const TESTING_MODE_BANNER_HEIGHT = 28;

export default function TestingModeBanner() {
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="none"
      style={[
        styles.wrapper,
        {
          paddingTop: insets.top,
          height: insets.top + TESTING_MODE_BANNER_HEIGHT,
        },
      ]}
    >
      <View style={styles.banner}>
        <Text style={styles.text}>Testing mode</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: '#0f172a',
  },
  banner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#15803d',
    borderBottomWidth: 1,
    borderBottomColor: '#86efac',
  },
  text: {
    color: '#f0fdf4',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
});
