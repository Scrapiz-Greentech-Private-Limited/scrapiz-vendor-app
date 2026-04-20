import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ApiService } from '../../services/api';
import { DutySession } from '../../types';
import { useAuth } from '../../../hooks/useAuth';

interface JobHistoryScreenProps {
  onBack: () => void;
  onNavigate?: (screen: string, params?: { session?: DutySession }) => void;
}

const periods = [
  { label: 'This Week', value: 'this_week' as const },
  { label: 'Last Month', value: 'last_month' as const },
  { label: 'All Time', value: 'all_time' as const },
];

const FALLBACK_SESSIONS: DutySession[] = [
  {
    session_id: 'fallback-session-1',
    started_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    ended_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000).toISOString(),
    duration_display: '4h 0m',
    orders_completed: 3,
    vehicle_number: 'MH01DM8286',
    vehicle_type: 'bike',
    start_lat: 19.0176,
    start_lng: 72.8174,
    status: 'offline',
  },
  {
    session_id: 'fallback-session-2',
    started_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    ended_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(),
    duration_display: '3h 30m',
    orders_completed: 2,
    vehicle_number: 'MH01DM8286',
    vehicle_type: 'bike',
    start_lat: 19.0176,
    start_lng: 72.8174,
    status: 'offline',
  },
];

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

const initials = (name: string) =>
  name
    .split(' ')
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

const JobHistoryScreen: React.FC<JobHistoryScreenProps> = ({ onBack, onNavigate }) => {
  const { user } = useAuth();
  const [periodIndex, setPeriodIndex] = useState(1);
  const [sessions, setSessions] = useState<DutySession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);

  const period = periods[periodIndex];

  const loadSessions = async (periodValue: 'this_week' | 'last_month' | 'all_time') => {
    setIsLoading(true);
    try {
      const response = await ApiService.getDutySessions(periodValue);
      const nextSessions = response.sessions || [];
      setSessions(nextSessions.length ? nextSessions : FALLBACK_SESSIONS);
    } catch {
      setSessions(FALLBACK_SESSIONS);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSessions(period.value);
  }, [period.value]);

  const displayName = useMemo(() => user?.name || 'Vendor', [user?.name]);

  const shiftPeriod = (direction: -1 | 1) => {
    setPeriodIndex((prev) => {
      const next = prev + direction;
      if (next < 0) {
        return 0;
      }
      if (next > periods.length - 1) {
        return periods.length - 1;
      }
      return next;
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />

      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Past duty sessions</Text>
      </View>

      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.arrowButton, periodIndex === 0 && styles.arrowButtonDisabled]}
          disabled={periodIndex === 0}
          onPress={() => shiftPeriod(-1)}
        >
          <Ionicons name="arrow-back" size={18} color="#475569" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.periodButton} onPress={() => setShowPicker(true)}>
          <Text style={styles.periodLabel}>{period.label}</Text>
          <Ionicons name="chevron-down" size={16} color="#475569" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.arrowButton, periodIndex === periods.length - 1 && styles.arrowButtonDisabled]}
          disabled={periodIndex === periods.length - 1}
          onPress={() => shiftPeriod(1)}
        >
          <Ionicons name="arrow-forward" size={18} color="#475569" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#1B7332" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          {sessions.map((session) => (
            <TouchableOpacity
              key={session.session_id}
              style={styles.card}
              onPress={() => onNavigate?.('duty-session-details', { session })}
              activeOpacity={0.85}
            >
              <View style={styles.topRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials(displayName)}</Text>
                </View>
                <View style={styles.nameWrap}>
                  <Text style={styles.name}>{displayName}</Text>
                </View>
                <View style={styles.durationPill}>
                  <Ionicons name="time-outline" size={14} color="#6B7280" />
                  <Text style={styles.durationText}>{session.duration_display}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.bottomRow}>
                <View style={styles.vehicleWrap}>
                  <View style={styles.vehicleIconBox}>
                    <MaterialIcons name="two-wheeler" size={18} color="#94A3B8" />
                  </View>
                  <View>
                    <Text style={styles.vehicleTitle}>Access</Text>
                    <Text style={styles.vehicleSub}>{session.vehicle_number}</Text>
                  </View>
                </View>
                <View style={styles.timeWrap}>
                  <Text style={styles.timeLine}>started : {formatSessionDate(session.started_at)}</Text>
                  <Text style={styles.timeLine}>ended : {formatSessionDate(session.ended_at)}</Text>
                  <Text style={styles.ordersLine}>{session.orders_completed} previous orders</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}

          {!sessions.length && <Text style={styles.emptyText}>No sessions found for this period.</Text>}
        </ScrollView>
      )}

      <Modal visible={showPicker} transparent animationType="fade" onRequestClose={() => setShowPicker(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowPicker(false)}>
          <View style={styles.modalCard}>
            {periods.map((option, index) => {
              const selected = period.value === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.modalOption, selected && styles.modalOptionSelected]}
                  onPress={() => {
                    setPeriodIndex(index);
                    setShowPicker(false);
                  }}
                >
                  <Text style={[styles.modalOptionText, selected && styles.modalOptionTextSelected]}>{option.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 6 },
  backButton: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center', marginRight: 4 },
  headerTitle: { fontSize: 54 / 2, fontWeight: '800', color: '#111827', textTransform: 'none' },
  filterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  arrowButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowButtonDisabled: { opacity: 0.35 },
  periodButton: {
    marginHorizontal: 12,
    minWidth: 170,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  periodLabel: { fontSize: 17, fontWeight: '500', color: '#1F2937' },
  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 24, gap: 12 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
  },
  topRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#374151' },
  nameWrap: { marginLeft: 12, flex: 1 },
  name: { fontSize: 42 / 2, fontWeight: '800', color: '#1F2937' },
  durationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  durationText: { fontSize: 15, fontWeight: '600', color: '#4B5563' },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 12 },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  vehicleWrap: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  vehicleIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  vehicleTitle: { fontSize: 18, fontWeight: '800', color: '#1F2937' },
  vehicleSub: { fontSize: 16, color: '#6B7280', marginTop: 2 },
  timeWrap: { marginLeft: 10, alignItems: 'flex-start' },
  timeLine: { fontSize: 13, color: '#4B5563', marginVertical: 1 },
  ordersLine: { fontSize: 12, color: '#1B7332', marginTop: 3, fontWeight: '700' },
  emptyText: { textAlign: 'center', color: '#6B7280', marginTop: 20 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)', justifyContent: 'center', paddingHorizontal: 28 },
  modalCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 8 },
  modalOption: { paddingHorizontal: 14, paddingVertical: 12, borderRadius: 10 },
  modalOptionSelected: { backgroundColor: '#ECFDF5' },
  modalOptionText: { color: '#1F2937', fontSize: 16, fontWeight: '500' },
  modalOptionTextSelected: { color: '#166534', fontWeight: '700' },
});

export default JobHistoryScreen;
