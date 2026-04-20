import React from 'react';
import { StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

interface SelectMaterialScreenProps {
  onBack: () => void;
  onNavigate: (screen: string) => void;
}

export default function SelectMaterialScreen({ onBack, onNavigate }: SelectMaterialScreenProps) {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Material Selection</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <MaterialIcons name="local-shipping" size={34} color="#166534" />
        </View>
        <Text style={styles.title}>This flow now starts from booking requests</Text>
        <Text style={styles.description}>
          Material selection has been moved into the booking acceptance journey. Accept a pickup request to review customer items and choose what you want to purchase.
        </Text>

        <TouchableOpacity style={styles.primaryButton} onPress={() => onNavigate('home')}>
          <Text style={styles.primaryButtonText}>Go to bookings</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F9F7' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    marginLeft: 12,
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: '#E9F7EE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    color: '#0F172A',
  },
  description: {
    marginTop: 12,
    color: '#64748B',
    fontSize: 16,
    lineHeight: 24,
  },
  primaryButton: {
    marginTop: 24,
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: '#166534',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
