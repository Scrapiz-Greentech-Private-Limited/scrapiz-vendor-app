import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ApiService, VendorFaceStatus, VendorOnboardingStatus } from '../../services/api';

interface OnboardingStatusScreenProps {
  onBack: () => void;
  onContinue: () => void;
  onRetakeFace: () => void;
}

const SCRAPIZ_GREEN = '#16a34a';

export default function OnboardingStatusScreen({
  onBack,
  onContinue,
  onRetakeFace,
}: OnboardingStatusScreenProps) {
  const [faceStatus, setFaceStatus] = useState<VendorFaceStatus | null>(null);
  const [onboardingStatus, setOnboardingStatus] = useState<VendorOnboardingStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const loadStatus = async () => {
      try {
        const [face, onboarding] = await Promise.all([
          ApiService.getVendorFaceStatus(),
          ApiService.getVendorOnboardingStatus(),
        ]);
        if (!isMounted) {
          return;
        }
        setFaceStatus(face);
        setOnboardingStatus(onboarding);
      } catch (error) {
        console.log('[OnboardingStatus] failed to load status', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadStatus();
    intervalId = setInterval(() => {
      void loadStatus();
    }, 3000);

    return () => {
      isMounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, []);

  const completionPercent = onboardingStatus?.completion_percent ?? 0;
  const canContinue = faceStatus?.status === 'verified';
  const isRejected = faceStatus?.status === 'rejected';
  const faceMessage = faceStatus?.message || 'We are checking your face photo now.';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        <View style={styles.hero}>
          <Text style={styles.title}>Onboarding status</Text>
          <Text style={styles.subtitle}>
            Track your face verification before moving to document upload.
          </Text>
        </View>

        <View style={styles.statusCard}>
          <Text style={styles.cardLabel}>Face verification</Text>
          <Text style={styles.cardValue}>
            {faceStatus?.status ? faceStatus.status.charAt(0).toUpperCase() + faceStatus.status.slice(1) : 'Pending'}
          </Text>
          <Text style={[styles.cardMessage, isRejected && styles.cardMessageError]}>{faceMessage}</Text>
        </View>

        <View style={styles.statusCard}>
          <Text style={styles.cardLabel}>Overall onboarding</Text>
          <Text style={styles.cardValue}>{completionPercent}% complete</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${completionPercent}%` }]} />
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={SCRAPIZ_GREEN} />
            <Text style={styles.loadingText}>Refreshing status...</Text>
          </View>
        ) : null}

        <View style={styles.footerActions}>
          {isRejected ? (
            <TouchableOpacity onPress={onRetakeFace} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Retake Face Photo</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            onPress={onContinue}
            disabled={!canContinue}
            style={[styles.primaryButton, !canContinue && styles.primaryButtonDisabled]}
          >
            <Text style={styles.primaryButtonText}>Continue to Documents</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
  },
  backButton: {
    alignSelf: 'flex-start',
  },
  backButtonText: {
    color: '#166534',
    fontSize: 16,
    fontWeight: '700',
  },
  hero: {
    marginTop: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    marginTop: 10,
    fontSize: 16,
    lineHeight: 24,
    color: '#64748b',
  },
  statusCard: {
    marginTop: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    padding: 20,
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#166534',
  },
  cardValue: {
    marginTop: 8,
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
  },
  cardMessage: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: '#475569',
  },
  cardMessageError: {
    color: '#DC2626',
  },
  progressTrack: {
    marginTop: 16,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#e2e8f0',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: SCRAPIZ_GREEN,
  },
  loadingRow: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    color: '#64748b',
    fontSize: 14,
  },
  footerActions: {
    marginTop: 'auto',
    gap: 12,
  },
  primaryButton: {
    height: 56,
    borderRadius: 18,
    backgroundColor: SCRAPIZ_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryButton: {
    height: 52,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fff5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#DC2626',
    fontSize: 15,
    fontWeight: '700',
  },
});
