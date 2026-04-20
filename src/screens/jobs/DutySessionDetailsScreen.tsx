import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DutySession } from '../../types';
import LiveSessionMap from '../../components/jobs/LiveSessionMap';

interface DutySessionDetailsScreenProps {
  onBack: () => void;
  session?: DutySession | null;
  vendorName?: string;
}

const formatSessionDate = (value?: string) => {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

const DutySessionDetailsScreen: React.FC<DutySessionDetailsScreenProps> = ({ onBack, session, vendorName = 'Vendor' }) => {
  const activeSession: DutySession =
    session ||
    ({
      session_id: 'local-session',
      started_at: new Date().toISOString(),
      ended_at: new Date().toISOString(),
      duration_display: '0h',
      orders_completed: 0,
      vehicle_number: 'MH01DM8286',
      vehicle_type: 'bike',
      start_lat: 19.0176,
      start_lng: 72.8174,
      status: 'offline',
    } as DutySession);

  const statusLabel = activeSession.status === 'live' ? 'Live' : 'Offline';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Duty session details</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.mapWrap}>
          <LiveSessionMap
            location={{ latitude: activeSession.start_lat, longitude: activeSession.start_lng }}
            height={220}
            label={activeSession.status === 'live' ? 'LIVE SESSION TRACKING' : 'SESSION LOCATION'}
          />
          {activeSession.status === 'live' && (
            <View style={styles.livePill}>
              <Text style={styles.liveText}>● LIVE SESSION TRACKING</Text>
            </View>
          )}
        </View>

        <View style={styles.statusCard}>
          <View>
            <Text style={styles.statusTitle}>{statusLabel}</Text>
            <Text style={styles.statusRange}>
              ({formatSessionDate(activeSession.started_at)} - {formatSessionDate(activeSession.ended_at)})
            </Text>
          </View>
          <View style={styles.durationPill}>
            <Ionicons name="time-outline" size={14} color="#6B7280" />
            <Text style={styles.durationText}>{activeSession.duration_display}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Vehicle Info</Text>
        <View style={styles.vehicleCard}>
          <View style={styles.vehicleLeft}>
            <View style={styles.vehicleIconWrap}>
              <MaterialIcons name="two-wheeler" size={24} color="#6B7280" />
            </View>
            <View>
              <Text style={styles.vehicleType}>Bike</Text>
              <Text style={styles.vehicleSub}>Vehicle No: {activeSession.vehicle_number}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.viewBtn}>
            <Text style={styles.viewBtnText}>View</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Past Members</Text>
        <View style={styles.memberCard}>
          <View style={styles.memberAvatar}>
            <Text style={styles.memberInitial}>{vendorName.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.memberInfo}>
            <Text style={styles.memberName}>{vendorName}</Text>
            <Text style={styles.memberRange}>
              {formatSessionDate(activeSession.started_at)} - {formatSessionDate(activeSession.ended_at)}
            </Text>
          </View>
          <View style={styles.durationPill}>
            <Ionicons name="time-outline" size={14} color="#6B7280" />
            <Text style={styles.durationText}>{activeSession.duration_display}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  backButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginRight: 6 },
  headerTitle: { fontSize: 40 / 2, fontWeight: '800', color: '#111827' },
  scroll: { flex: 1, backgroundColor: '#F8F9FA' },
  content: { paddingBottom: 30 },
  mapWrap: { position: 'relative' },
  livePill: {
    position: 'absolute',
    top: 12,
    left: 12,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  liveText: { fontSize: 12, fontWeight: '800', color: '#1F2937' },
  statusCard: {
    backgroundColor: '#EBEBEB',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusTitle: { fontSize: 42 / 2, fontWeight: '800', color: '#1F2937' },
  statusRange: { marginTop: 4, color: '#4B5563' },
  durationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
  },
  durationText: { color: '#4B5563', fontWeight: '600' },
  sectionTitle: { marginTop: 18, marginBottom: 10, marginHorizontal: 16, fontSize: 20, fontWeight: '800', color: '#1F2937' },
  vehicleCard: {
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  vehicleLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  vehicleIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  vehicleType: { fontSize: 16, fontWeight: '800', color: '#111827' },
  vehicleSub: { marginTop: 2, color: '#6B7280' },
  viewBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#1B7332',
  },
  viewBtnText: { color: '#1B7332', fontWeight: '700' },
  memberCard: {
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  memberInitial: { color: '#4B5563', fontWeight: '700', fontSize: 18 },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 35 / 2, fontWeight: '800', color: '#1F2937' },
  memberRange: { marginTop: 2, color: '#6B7280', maxWidth: 210 },
});

export default DutySessionDetailsScreen;
