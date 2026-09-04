import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../../hooks/useAuth';
import { ApiService, VendorProfile, VendorProfileDocument } from '../../services/api';

interface PersonalInfoScreenProps {
  onBack: () => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

const DOCUMENT_META: Record<string, { label: string; icon: keyof typeof MaterialIcons.glyphMap }> = {
  aadhaar: { label: 'Aadhaar Number', icon: 'credit-card' },
  pan: { label: 'PAN Number', icon: 'account-balance-wallet' },
  dl: { label: 'Driving License', icon: 'drive-eta' },
  passport: { label: 'Passport', icon: 'book' },
};

const getDocumentMeta = (document: VendorProfileDocument) =>
  DOCUMENT_META[document.document_type] ?? {
    label: document.document_type.replace(/_/g, ' '),
    icon: 'description' as keyof typeof MaterialIcons.glyphMap,
  };

const PersonalInfoScreen = ({ onBack, onShowToast }: PersonalInfoScreenProps) => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'info' | 'documents' | 'logout'>('info');
  const [vendorProfile, setVendorProfile] = useState<VendorProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const loadProfile = async () => {
      try {
        const profile = await ApiService.getVendorProfile();
        if (mounted) setVendorProfile(profile);
      } catch {
        if (mounted) onShowToast('Unable to load personal information right now.', 'error');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void loadProfile();
    return () => {
      mounted = false;
    };
  }, [onShowToast]);

  const displayName = vendorProfile?.full_name || user?.name || 'Vendor';
  const contactNumber = user?.phone || '-';
  const homeAddress = useMemo(
    () => vendorProfile?.service_area || user?.serviceArea || 'Home address unavailable',
    [user?.serviceArea, vendorProfile?.service_area],
  );
  const serviceCity = vendorProfile?.service_city || user?.serviceCity || 'City unavailable';

  const handleContactSupport = () => {
    Linking.openURL('tel:+911234567890').catch(() => {
      onShowToast('Unable to open the support dialer.', 'error');
    });
  };

  const handleDeleteAccount = () => {
    Alert.alert('Request account deletion?', 'This starts the permanent removal flow for this vendor account.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Request deletion', style: 'destructive', onPress: () => onShowToast('Deletion request submitted.', 'info') },
    ]);
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Sign out from this device?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.9}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View>
            <Text style={styles.subtitle}>Vendor profile</Text>
            <Text style={styles.title}>Personal Information</Text>
          </View>
        </View>

        <View style={styles.identityCard}>
          <View style={styles.avatar}>
            {vendorProfile?.effective_profile_image || user?.image ? (
              <Image source={{ uri: vendorProfile?.effective_profile_image || user?.image || '' }} style={styles.avatarImage} />
            ) : (
              <MaterialIcons name="person" size={30} color="#fff" />
            )}
          </View>
          <View style={styles.identityCopy}>
            <Text style={styles.identityName}>{displayName}</Text>
            <Text style={styles.identityLine}>{serviceCity}</Text>
            <Text style={styles.identityMuted}>{vendorProfile?.status || 'Active vendor profile'}</Text>
          </View>
        </View>

        <View style={styles.tabBar}>
          {[
            { key: 'info', label: 'Info' },
            { key: 'documents', label: 'Documents' },
            { key: 'logout', label: 'Logout' },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabButton, activeTab === tab.key && styles.tabButtonActive]}
              onPress={() => setActiveTab(tab.key as 'info' | 'documents' | 'logout')}
              activeOpacity={0.9}
            >
              <Text style={[styles.tabButtonText, activeTab === tab.key && styles.tabButtonTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'info' ? (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialIcons name="badge" size={20} color="#1B7332" />
              <Text style={styles.cardTitle}>Personal Details</Text>
            </View>
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Contact no</Text>
              <Text style={styles.fieldValue}>{contactNumber}</Text>
            </View>
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Gender</Text>
              <Text style={styles.fieldValue}>Male</Text>
            </View>
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Home Address</Text>
              <Text style={styles.fieldValue}>{homeAddress}</Text>
            </View>
          </View>
        ) : null}

        {activeTab === 'documents' ? (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialIcons name="description" size={20} color="#1B7332" />
              <Text style={styles.cardTitle}>Uploaded Documents</Text>
            </View>
            {loading ? (
              <Text style={styles.emptyText}>Loading documents...</Text>
            ) : vendorProfile?.documents?.length ? (
              vendorProfile.documents.map((document) => {
                const meta = getDocumentMeta(document);
                return (
                  <View key={document.id} style={styles.documentCard}>
                    <View style={styles.documentHeader}>
                      <View style={styles.documentTitleRow}>
                        <MaterialIcons name={meta.icon} size={18} color="#1B7332" />
                        <Text style={styles.documentTitle}>{meta.label}</Text>
                      </View>
                      <Text style={styles.documentStatus}>{document.status_display || document.status}</Text>
                    </View>
                    <Text style={styles.documentNumber}>{document.document_number || 'Number unavailable'}</Text>
                    <View style={styles.documentImages}>
                      {document.document_front_url ? <Image source={{ uri: document.document_front_url }} style={styles.documentImage} /> : null}
                      {document.document_back_url ? <Image source={{ uri: document.document_back_url }} style={styles.documentImage} /> : null}
                    </View>
                    {document.rejection_reason ? <Text style={styles.documentReason}>{document.rejection_reason}</Text> : null}
                  </View>
                );
              })
            ) : (
              <Text style={styles.emptyText}>No KYC documents uploaded yet.</Text>
            )}
          </View>
        ) : null}

        {activeTab === 'logout' ? (
          <View style={styles.card}>
            <TouchableOpacity style={styles.accountAction} onPress={handleDeleteAccount} activeOpacity={0.9}>
              <MaterialIcons name="delete-outline" size={20} color="#dc2626" />
              <View style={styles.accountActionText}>
                <Text style={styles.accountActionTitle}>Account Deletion</Text>
                <Text style={styles.accountActionSubtitle}>Request permanent removal of this account</Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color="#cbd5e1" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.accountAction} onPress={handleContactSupport} activeOpacity={0.9}>
              <MaterialIcons name="support-agent" size={20} color="#1B7332" />
              <View style={styles.accountActionText}>
                <Text style={styles.accountActionTitle}>Contact with Support</Text>
                <Text style={styles.accountActionSubtitle}>Call or message the Scrapiz support desk</Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color="#cbd5e1" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.accountAction} onPress={handleLogout} activeOpacity={0.9}>
              <MaterialIcons name="logout" size={20} color="#dc2626" />
              <View style={styles.accountActionText}>
                <Text style={[styles.accountActionTitle, { color: '#dc2626' }]}>Logout</Text>
                <Text style={styles.accountActionSubtitle}>Sign out from this vendor device</Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color="#dc2626" />
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F5' },
  content: { padding: 16, paddingBottom: 28 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 18,
    backgroundColor: '#166534',
    borderRadius: 24,
    marginBottom: 16,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: { color: 'rgba(255,255,255,0.78)', fontSize: 12, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase' },
  title: { color: '#fff', fontSize: 24, fontWeight: '800', marginTop: 2 },
  identityCard: {
    flexDirection: 'row',
    gap: 14,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: '#1B7332',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  identityCopy: { flex: 1, justifyContent: 'center' },
  identityName: { color: '#0F172A', fontSize: 20, fontWeight: '800' },
  identityLine: { color: '#334155', marginTop: 4, fontWeight: '600' },
  identityMuted: { color: '#64748B', marginTop: 4, fontSize: 12 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#EAF5EE',
    borderRadius: 18,
    padding: 4,
    marginBottom: 16,
  },
  tabButton: { flex: 1, paddingVertical: 11, borderRadius: 14, alignItems: 'center' },
  tabButtonActive: { backgroundColor: '#166534' },
  tabButtonText: { color: '#14532D', fontWeight: '700' },
  tabButtonTextActive: { color: '#fff' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  cardTitle: { color: '#0F172A', fontSize: 18, fontWeight: '800' },
  fieldBlock: { marginBottom: 14 },
  fieldLabel: { color: '#64748B', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  fieldValue: { color: '#0F172A', marginTop: 4, fontSize: 16, fontWeight: '700' },
  documentCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 12,
    backgroundColor: '#F8FAFC',
  },
  documentHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'center' },
  documentTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  documentTitle: { color: '#0F172A', fontWeight: '800' },
  documentStatus: { color: '#166534', fontWeight: '800', fontSize: 12 },
  documentNumber: { color: '#334155', marginTop: 8, fontWeight: '600' },
  documentImages: { flexDirection: 'row', gap: 10, marginTop: 12 },
  documentImage: { width: 86, height: 58, borderRadius: 12, backgroundColor: '#E2E8F0' },
  documentReason: { color: '#B91C1C', marginTop: 10, fontSize: 12, fontWeight: '600' },
  emptyText: { color: '#64748B', fontWeight: '600' },
  accountAction: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  accountActionText: { flex: 1 },
  accountActionTitle: { color: '#0F172A', fontWeight: '800', fontSize: 15 },
  accountActionSubtitle: { color: '#64748B', marginTop: 2, fontSize: 12 },
  divider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 8 },
});

export default PersonalInfoScreen;
