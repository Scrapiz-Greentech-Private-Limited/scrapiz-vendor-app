import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { creditNotificationService, NotificationPreferences } from '../../services/creditNotificationService';

interface AppSettingsScreenProps {
  onBack: () => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

const AppSettingsScreen = ({ onBack, onShowToast }: AppSettingsScreenProps) => {
  const [settings, setSettings] = useState({
    darkMode: false,
    notifications: true,
    autoSync: true,
    offlineMode: false,
    hapticFeedback: true,
    soundEffects: true,
  });

  const [creditNotifications, setCreditNotifications] = useState<NotificationPreferences>({
    lowBalanceEnabled: true,
    criticalBalanceEnabled: true,
    rechargeSuccessEnabled: true,
    insufficientCreditEnabled: true,
    lowBalanceThreshold: 10,
    criticalBalanceThreshold: 0,
  });

  // Load notification preferences on component mount
  useEffect(() => {
    const loadPreferences = () => {
      const preferences = creditNotificationService.getPreferences();
      setCreditNotifications(preferences);
    };
    loadPreferences();
  }, []);

  const handleToggle = (setting: keyof typeof settings, label: string) => {
    setSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
    onShowToast(`${label} ${!settings[setting] ? 'enabled' : 'disabled'}`, 'success');
  };

  const handleCreditNotificationToggle = (setting: keyof NotificationPreferences, label: string) => {
    const newValue = !creditNotifications[setting];
    const updatedPreferences = {
      ...creditNotifications,
      [setting]: newValue
    };
    
    setCreditNotifications(updatedPreferences);
    creditNotificationService.updatePreferences(updatedPreferences);
    onShowToast(`${label} ${newValue ? 'enabled' : 'disabled'}`, 'success');
  };

  const settingsOptions = [
    { key: 'notifications', label: 'Notifications', icon: 'notifications', description: 'Receive push notifications' },
    { key: 'autoSync', label: 'Auto Sync', icon: 'sync', description: 'Automatically sync data' },
    { key: 'offlineMode', label: 'Offline Mode', icon: 'wifi-off', description: 'Enable offline functionality' },
    { key: 'hapticFeedback', label: 'Haptic Feedback', icon: 'vibration', description: 'Vibrate on interactions' },
    { key: 'soundEffects', label: 'Sound Effects', icon: 'volume-up', description: 'Play interaction sounds' },
  ];

  const creditNotificationOptions = [
    { 
      key: 'lowBalanceEnabled', 
      label: 'Low Balance Alerts', 
      icon: 'battery-alert', 
      description: 'Notify when credits are below 10' 
    },
    { 
      key: 'criticalBalanceEnabled', 
      label: 'Critical Balance Alerts', 
      icon: 'warning', 
      description: 'Notify when credits reach zero' 
    },
    { 
      key: 'rechargeSuccessEnabled', 
      label: 'Recharge Confirmations', 
      icon: 'check-circle', 
      description: 'Confirm successful credit purchases' 
    },
    { 
      key: 'insufficientCreditEnabled', 
      label: 'Booking Credit Warnings', 
      icon: 'error', 
      description: 'Warn when insufficient credits for booking' 
    },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <MaterialIcons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>App Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.settingsCard}>
          <Text style={styles.sectionTitle}>General Preferences</Text>
          {settingsOptions.map((option) => (
            <View key={option.key} style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <MaterialIcons name={option.icon as any} size={24} color="#1B7332" />
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>{option.label}</Text>
                  <Text style={styles.settingDescription}>{option.description}</Text>
                </View>
              </View>
              <Switch
                value={settings[option.key as keyof typeof settings]}
                onValueChange={() => handleToggle(option.key as keyof typeof settings, option.label)}
                trackColor={{ false: '#e9ecef', true: '#1B7332' }}
                thumbColor={settings[option.key as keyof typeof settings] ? '#fff' : '#f4f3f4'}
              />
            </View>
          ))}
        </View>

        <View style={styles.settingsCard}>
          <Text style={styles.sectionTitle}>Credit Notifications</Text>
          {creditNotificationOptions.map((option) => (
            <View key={option.key} style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <MaterialIcons name={option.icon as any} size={24} color="#1B7332" />
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>{option.label}</Text>
                  <Text style={styles.settingDescription}>{option.description}</Text>
                </View>
              </View>
              <Switch
                value={creditNotifications[option.key as keyof NotificationPreferences] as boolean}
                onValueChange={() => handleCreditNotificationToggle(option.key as keyof NotificationPreferences, option.label)}
                trackColor={{ false: '#e9ecef', true: '#1B7332' }}
                thumbColor={creditNotifications[option.key as keyof NotificationPreferences] ? '#fff' : '#f4f3f4'}
              />
            </View>
          ))}
        </View>

        <View style={styles.actionsCard}>
          <Text style={styles.sectionTitle}>App Maintenance</Text>
          <TouchableOpacity style={styles.actionItem} onPress={() => onShowToast('Cache cleared!', 'success')}>
            <MaterialIcons name="delete" size={24} color="#dc3545" />
            <View style={styles.actionText}>
              <Text style={styles.actionLabel}>Clear Cache</Text>
              <Text style={styles.actionDescription}>Free up storage space</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#6c757d" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  header: {
    backgroundColor: '#1B7332',
    paddingTop: 44,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  settingsCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionsCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 12,
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  settingDescription: {
    fontSize: 12,
    color: '#6c757d',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  actionText: {
    marginLeft: 12,
    flex: 1,
  },
  actionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  actionDescription: {
    fontSize: 12,
    color: '#6c757d',
  },
});

export default AppSettingsScreen;