import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Linking,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';

interface LocationPermissionGateScreenProps {
  onContinue: () => void;
  onLogout: () => void;
}

export default function LocationPermissionGateScreen({ onContinue, onLogout }: LocationPermissionGateScreenProps) {
  const [isBusy, setIsBusy] = useState(false);
  const [foregroundGranted, setForegroundGranted] = useState(false);
  const [backgroundGranted, setBackgroundGranted] = useState(false);
  const [backgroundAvailable, setBackgroundAvailable] = useState(true);

  const syncPermissionState = useCallback(async () => {
    try {
      const [foreground, background] = await Promise.all([
        Location.getForegroundPermissionsAsync(),
        Location.getBackgroundPermissionsAsync(),
      ]);

      setForegroundGranted(foreground.status === 'granted');
      setBackgroundGranted(background.status === 'granted');

      if (Platform.OS === 'android' && Location.isBackgroundLocationAvailableAsync) {
        const isAvailable = await Location.isBackgroundLocationAvailableAsync();
        setBackgroundAvailable(isAvailable);
      } else {
        setBackgroundAvailable(true);
      }
    } catch {
      setForegroundGranted(false);
      setBackgroundGranted(false);
      setBackgroundAvailable(false);
    }
  }, []);

  useEffect(() => {
    void syncPermissionState();
  }, [syncPermissionState]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void syncPermissionState();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [syncPermissionState]);

  const allGranted = foregroundGranted && backgroundGranted;

  const statusCopy = useMemo(() => {
    if (allGranted) {
      return 'Great. You are ready to accept jobs with live and background tracking.';
    }

    if (foregroundGranted && !backgroundAvailable) {
      return 'Background location option is not available from this prompt on your Android version. Open app settings and set Location to Allow all the time.';
    }

    if (foregroundGranted) {
      return 'Precise location is enabled. Set location to Allow all the time so tracking stays active when app is minimized or screen is locked.';
    }

    return 'Enable precise and background location to run vendor jobs reliably in production.';
  }, [allGranted, backgroundAvailable, foregroundGranted]);

  const requestForeground = useCallback(async () => {
    setIsBusy(true);
    let granted = false;

    try {
      const foreground = await Location.requestForegroundPermissionsAsync();
      granted = foreground.status === 'granted';

      if (granted) {
        try {
          await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Highest,
            mayShowUserSettingsDialog: true,
          });
        } catch {
          // Best effort: permission may still be granted even if location fetch fails.
        }
      }
    } finally {
      await syncPermissionState();
      setIsBusy(false);
    }

    return granted;
  }, [syncPermissionState]);

  const requestBackground = useCallback(async () => {
    setIsBusy(true);
    let granted = false;

    try {
      const foregroundReady = foregroundGranted || (await requestForeground());
      if (!foregroundReady) {
        return granted;
      }

      const background = await Location.requestBackgroundPermissionsAsync();
      granted = background.status === 'granted';

      if (!granted && Platform.OS === 'android') {
        Alert.alert(
          'Enable Allow all the time',
          'On Android 11 and above, background location is granted from App Settings. Open settings, tap Permissions > Location, then choose Allow all the time.',
          [
            {
              text: 'Open settings',
              onPress: () => {
                void Linking.openSettings();
              },
            },
            { text: 'Not now', style: 'cancel' },
          ]
        );
      }
    } finally {
      await syncPermissionState();
      setIsBusy(false);
    }

    return granted;
  }, [foregroundGranted, requestForeground, syncPermissionState]);

  const handleContinue = async () => {
    if (allGranted) {
      onContinue();
      return;
    }

    const foregroundReady = foregroundGranted || (await requestForeground());
    const backgroundReady = backgroundGranted || (await requestBackground());

    if (foregroundReady && backgroundReady) {
      onContinue();
      return;
    }

    Alert.alert(
      'Permissions pending',
      'Both precise and background location permissions are required to run vendor jobs in live mode.',
      [
        {
          text: 'Open settings',
          onPress: () => {
            void Linking.openSettings();
          },
        },
        { text: 'Not now', style: 'cancel' },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.heroOrbPrimary} />
          <View style={styles.heroOrbSecondary} />

          <View style={styles.heroIconWrap}>
            <MaterialIcons name="gps-fixed" size={28} color="#0B6B3A" />
          </View>
          <Text style={styles.heroTitle}>Enable always-on tracking</Text>
          <Text style={styles.heroSubtitle}>
            Scrapiz Partner needs precise GPS + background access to keep your job location live while navigating, calling, or locking the phone.
          </Text>
        </View>

        <View style={styles.statusCard}>
          <Text style={styles.statusHeading}>Permission checklist</Text>
          <Text style={styles.statusSubheading}>{statusCopy}</Text>

          <View style={styles.statusRow}>
            <View style={[styles.statusIconWrap, foregroundGranted && styles.statusIconWrapEnabled]}>
              <MaterialIcons
                name={foregroundGranted ? 'check' : 'gps-not-fixed'}
                size={18}
                color={foregroundGranted ? '#14532D' : '#64748B'}
              />
            </View>
            <View style={styles.statusCopyWrap}>
              <Text style={styles.statusLabel}>Precise location</Text>
              <Text style={styles.statusValue}>{foregroundGranted ? 'Enabled' : 'Not enabled'}</Text>
            </View>
            <Pressable
              style={[styles.actionButton, isBusy && styles.actionButtonDisabled]}
              onPress={() => {
                void requestForeground();
              }}
              disabled={isBusy}
            >
              <Text style={styles.actionButtonText}>Enable</Text>
            </Pressable>
          </View>

          <View style={styles.statusRow}>
            <View style={[styles.statusIconWrap, backgroundGranted && styles.statusIconWrapEnabled]}>
              <MaterialIcons
                name={backgroundGranted ? 'check' : 'motion-photos-on'}
                size={18}
                color={backgroundGranted ? '#14532D' : '#64748B'}
              />
            </View>
            <View style={styles.statusCopyWrap}>
              <Text style={styles.statusLabel}>Background tracking</Text>
              <Text style={styles.statusValue}>
                {backgroundGranted ? 'Allow all the time enabled' : 'Only while using app or disabled'}
              </Text>
            </View>
            <Pressable
              style={[styles.actionButton, isBusy && styles.actionButtonDisabled]}
              onPress={() => {
                void requestBackground();
              }}
              disabled={isBusy}
            >
              <Text style={styles.actionButtonText}>Enable</Text>
            </Pressable>
          </View>

          {!backgroundGranted ? (
            <View style={styles.tipBox}>
              <MaterialIcons name="info" size={18} color="#0F5132" />
              <View style={styles.tipCopyWrap}>
                <Text style={styles.tipTitle}>If you only see "Allow while using app"</Text>
                <Text style={styles.tipText}>Android may hide "Allow all the time" in popups. Open App Settings and set Location to Allow all the time manually.</Text>
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.stepsCard}>
          <Text style={styles.stepsHeading}>Quick fix steps</Text>
          <Text style={styles.stepItem}>1. Tap Open phone settings</Text>
          <Text style={styles.stepItem}>2. Open Permissions > Location</Text>
          <Text style={styles.stepItem}>3. Select Allow all the time</Text>
          <Text style={styles.stepItem}>4. Return to app and continue</Text>
        </View>

        <View style={styles.footer}>
          <Pressable
            style={[styles.continueButton, (!allGranted || isBusy) && styles.continueButtonDisabled]}
            onPress={() => {
              void handleContinue();
            }}
            disabled={!allGranted || isBusy}
          >
            {isBusy ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.continueButtonText}>Continue to Dashboard</Text>
            )}
          </Pressable>

          <Pressable
            style={styles.secondaryButton}
            onPress={() => {
              void Linking.openSettings();
            }}
          >
            <MaterialIcons name="settings" size={18} color="#166534" />
            <Text style={styles.secondaryButtonText}>Open phone settings</Text>
          </Pressable>

          <Pressable style={styles.logoutButton} onPress={onLogout}>
            <Text style={styles.logoutButtonText}>Logout</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#EDF3EF',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 26,
    gap: 16,
  },
  heroCard: {
    overflow: 'hidden',
    borderRadius: 26,
    backgroundColor: '#0F5C36',
    padding: 20,
    gap: 10,
  },
  heroOrbPrimary: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    top: -68,
    right: -44,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroOrbSecondary: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    bottom: -28,
    left: -20,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  heroIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DFF7E8',
  },
  heroTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: 'rgba(255,255,255,0.88)',
  },
  statusCard: {
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D5E3D9',
    padding: 16,
    gap: 11,
  },
  statusHeading: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  statusSubheading: {
    fontSize: 13,
    lineHeight: 20,
    color: '#475569',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  statusIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  statusIconWrapEnabled: {
    backgroundColor: '#DCFCE7',
  },
  statusCopyWrap: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  statusValue: {
    marginTop: 3,
    fontSize: 12,
    color: '#64748B',
  },
  actionButton: {
    borderRadius: 12,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
  },
  tipBox: {
    marginTop: 2,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CBE7D5',
    backgroundColor: '#EAF6EF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    gap: 10,
  },
  tipCopyWrap: {
    flex: 1,
  },
  tipTitle: {
    color: '#0F5132',
    fontSize: 13,
    fontWeight: '800',
  },
  tipText: {
    marginTop: 4,
    color: '#2F4F3C',
    fontSize: 12,
    lineHeight: 17,
  },
  stepsCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D5E3D9',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 8,
  },
  stepsHeading: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
  },
  stepItem: {
    color: '#334155',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  footer: {
    gap: 12,
  },
  continueButton: {
    height: 54,
    borderRadius: 16,
    backgroundColor: '#15803D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonDisabled: {
    opacity: 0.55,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryButton: {
    height: 46,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCE7DF',
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#166534',
    fontSize: 14,
    fontWeight: '700',
  },
  logoutButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  logoutButtonText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
  },
});
