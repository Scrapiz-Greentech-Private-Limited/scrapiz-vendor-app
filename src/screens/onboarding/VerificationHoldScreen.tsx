import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface VerificationHoldScreenProps {
  vendorName?: string;
  status?: string;
  rejectionReason?: string | null;
  isRefreshing?: boolean;
  onRefresh: () => void;
  onLogout: () => void;
}

const statusCopy: Record<string, { eyebrow: string; title: string; description: string }> = {
  pending_verification: {
    eyebrow: 'Verification in progress',
    title: 'We will be right back',
    description:
      'Your onboarding details, images, and KYC documents are under review. We will unlock the full partner app as soon as the verification pass is complete.',
  },
  rejected: {
    eyebrow: 'Action required',
    title: 'Your profile needs an update',
    description:
      'A few verification details still need attention. Please review the admin note and re-submit your documents once the requested changes are ready.',
  },
  suspended: {
    eyebrow: 'Account on hold',
    title: 'Access is temporarily paused',
    description:
      'Your partner account has been paused for review. The team will reopen the app once the operational hold is cleared.',
  },
}

export default function VerificationHoldScreen({
  vendorName,
  status = 'pending_verification',
  rejectionReason,
  isRefreshing = false,
  onRefresh,
  onLogout,
}: VerificationHoldScreenProps) {
  const copy = statusCopy[status] || statusCopy.pending_verification

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.heroWrap}>
          <View style={styles.heroCard}>
            <View style={styles.heroBadge}>
              <MaterialCommunityIcons name="shield-check-outline" size={22} color="#166534" />
            </View>

            <View style={styles.illustrationWrap}>
              <View style={styles.deviceFrame}>
                <View style={styles.deviceHeader}>
                  <View style={styles.deviceDot} />
                  <View style={styles.deviceLine} />
                  <Feather name="more-vertical" size={14} color="#94A3B8" />
                </View>
                <View style={styles.notificationCardPrimary}>
                  <MaterialCommunityIcons name="file-document-check-outline" size={20} color="#FFFFFF" />
                  <View style={styles.notificationTextWrap}>
                    <View style={styles.notificationLineShort} />
                    <View style={styles.notificationLineLong} />
                  </View>
                </View>
                <View style={styles.notificationCardSecondary}>
                  <MaterialCommunityIcons name="clock-time-four-outline" size={18} color="#64748B" />
                  <View style={styles.notificationTextWrap}>
                    <View style={[styles.notificationLineShort, styles.notificationMuted]} />
                    <View style={[styles.notificationLineLong, styles.notificationMuted]} />
                  </View>
                </View>
              </View>
              <View style={styles.floatingBell}>
                <MaterialCommunityIcons name="bell-ring-outline" size={24} color="#F59E0B" />
              </View>
            </View>

            <Text style={styles.eyebrow}>{copy.eyebrow}</Text>
            <Text style={styles.title}>{copy.title}</Text>
            <Text style={styles.description}>{copy.description}</Text>

            <View style={styles.pointsWrap}>
              <View style={styles.pointRow}>
                <Feather name="clock" size={18} color="#0F172A" />
                <View style={styles.pointCopy}>
                  <Text style={styles.pointTitle}>Real-time review updates</Text>
                  <Text style={styles.pointDescription}>
                    We check your KYC profile, vehicle details, and uploaded proofs before opening live bookings.
                  </Text>
                </View>
              </View>
              <View style={styles.pointRow}>
                <MaterialCommunityIcons name="truck-delivery-outline" size={18} color="#0F172A" />
                <View style={styles.pointCopy}>
                  <Text style={styles.pointTitle}>Partner app access</Text>
                  <Text style={styles.pointDescription}>
                    Bookings, wallet operations, and online mode unlock automatically once verification is complete.
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.statusPanel}>
              <Text style={styles.statusLabel}>Partner</Text>
              <Text style={styles.statusValue}>{vendorName || 'Vendor partner'}</Text>
              <Text style={styles.statusSubtext}>
                Status: {status === 'pending_verification' ? 'Pending verification' : status.replace(/_/g, ' ')}
              </Text>
              {rejectionReason ? (
                <View style={styles.reasonBox}>
                  <Text style={styles.reasonLabel}>Admin note</Text>
                  <Text style={styles.reasonText}>{rejectionReason}</Text>
                </View>
              ) : null}
            </View>

            <TouchableOpacity style={styles.primaryButton} onPress={onRefresh} disabled={isRefreshing}>
              {isRefreshing ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Check status again</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={onLogout}>
              <Text style={styles.secondaryButtonText}>Logout for now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  heroWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  heroCard: {
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 28,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 18 },
    shadowRadius: 30,
    elevation: 10,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 18,
  },
  illustrationWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  deviceFrame: {
    width: 224,
    borderRadius: 30,
    borderWidth: 7,
    borderColor: '#0F172A',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 20,
    transform: [{ rotate: '-8deg' }],
  },
  deviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  deviceDot: {
    width: 12,
    height: 12,
    borderRadius: 999,
    backgroundColor: '#0F172A',
    marginRight: 12,
  },
  deviceLine: {
    flex: 1,
    height: 2,
    borderRadius: 999,
    backgroundColor: '#CBD5E1',
    marginRight: 12,
  },
  notificationCardPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: '#B91C1C',
    paddingHorizontal: 14,
    paddingVertical: 16,
    marginBottom: 14,
  },
  notificationCardSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  notificationTextWrap: {
    flex: 1,
    marginLeft: 12,
  },
  notificationLineShort: {
    height: 7,
    width: '58%',
    borderRadius: 999,
    backgroundColor: '#FDE68A',
    marginBottom: 8,
  },
  notificationLineLong: {
    height: 7,
    width: '88%',
    borderRadius: 999,
    backgroundColor: '#FECACA',
  },
  notificationMuted: {
    backgroundColor: '#CBD5E1',
  },
  floatingBell: {
    position: 'absolute',
    top: -6,
    right: 42,
    borderRadius: 999,
    backgroundColor: '#FEF3C7',
    padding: 10,
  },
  eyebrow: {
    color: '#15803D',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  title: {
    color: '#0F172A',
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
    marginBottom: 12,
  },
  description: {
    color: '#475569',
    fontSize: 17,
    lineHeight: 26,
    marginBottom: 24,
  },
  pointsWrap: {
    gap: 18,
    marginBottom: 22,
  },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  pointCopy: {
    flex: 1,
    marginLeft: 14,
  },
  pointTitle: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  pointDescription: {
    color: '#64748B',
    fontSize: 16,
    lineHeight: 23,
  },
  statusPanel: {
    borderRadius: 24,
    backgroundColor: '#F8FAFC',
    padding: 18,
    marginBottom: 22,
  },
  statusLabel: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  statusValue: {
    color: '#0F172A',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 6,
  },
  statusSubtext: {
    color: '#475569',
    fontSize: 15,
    lineHeight: 22,
  },
  reasonBox: {
    marginTop: 14,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    padding: 14,
  },
  reasonLabel: {
    color: '#991B1B',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  reasonText: {
    color: '#475569',
    fontSize: 15,
    lineHeight: 22,
  },
  primaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: '#15803D',
    minHeight: 56,
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    minHeight: 56,
  },
  secondaryButtonText: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '600',
  },
});
