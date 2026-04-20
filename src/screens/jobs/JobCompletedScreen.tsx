import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface JobCompletedScreenProps {
  bookingId: string;
  totalPayout: number;
  onDone: () => void;
}

const JobCompletedScreen: React.FC<JobCompletedScreenProps> = ({ bookingId, totalPayout, onDone }) => {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <MaterialIcons name="check-circle" size={64} color="#16A34A" />
        </View>
        <Text style={styles.title}>Job Completed</Text>
        <Text style={styles.booking}>Booking #{bookingId}</Text>
        <Text style={styles.amount}>₹{totalPayout.toFixed(2)}</Text>
        <Text style={styles.sub}>Final payout recorded successfully</Text>
        <TouchableOpacity style={styles.doneBtn} onPress={onDone}>
          <Text style={styles.doneText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 16, width: '100%', padding: 20, alignItems: 'center' },
  iconWrap: { marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '800', color: '#0F172A' },
  booking: { marginTop: 6, color: '#64748B', fontWeight: '600' },
  amount: { marginTop: 16, fontSize: 34, fontWeight: '900', color: '#14532D' },
  sub: { marginTop: 6, color: '#64748B' },
  doneBtn: { marginTop: 20, backgroundColor: '#14532D', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24 },
  doneText: { color: '#fff', fontWeight: '800' },
});

export default JobCompletedScreen;
