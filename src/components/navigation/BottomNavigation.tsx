import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLanguage } from '../../utils/i18n';

interface BottomNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  jobCounts?: {
    active: number;
    pending: number;
    upcoming: number;
  };
}

const BottomNavigation = ({ activeTab, onTabChange, jobCounts }: BottomNavigationProps) => {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  
  // Simplified and more compact safe area calculation
  const compactBottomPadding = Platform.OS === 'android' 
    ? Math.max(insets.bottom + 4, 12) // Minimal padding for Android
    : Math.max(insets.bottom, 8); // iOS safe area
  
  const tabs = [
    { key: 'home', label: t('home'), icon: 'home' },
    { 
      key: 'ongoing', 
      label: t('manage'), 
      icon: 'work'
    },
    { key: 'profile', label: t('profile'), icon: 'person' },
    { key: 'more-menu', label: t('more_tabs'), icon: 'more-horiz' }
  ];

  return (
    <View style={[
      styles.container,
      {
        paddingBottom: compactBottomPadding,
      }
    ]}>
      <View style={styles.tabContainer}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => onTabChange(tab.key)}
              style={[
                styles.tab,
                isActive && styles.activeTab
              ]}
              activeOpacity={0.7}
            >
              <View style={styles.iconContainer}>
                <MaterialIcons 
                  name={tab.icon as any} 
                  size={22} 
                  color={isActive ? '#1B7332' : '#6c757d'} 
                />
                {tab.badge && tab.badge > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {tab.badge > 99 ? '99+' : tab.badge}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[
                styles.label,
                isActive && styles.activeLabel
              ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 4,
    paddingTop: 8,
    paddingBottom: 4,
    minHeight: 56, // Compact height while maintaining accessibility
  },
  
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 2,
    borderRadius: 8,
    minHeight: 44, // Compact but still accessible
  },
  
  activeTab: {
    backgroundColor: 'rgba(27, 115, 50, 0.1)',
    transform: [{ scale: 1.02 }],
  },
  
  iconContainer: {
    position: 'relative',
    marginBottom: 3,
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
  },
  
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#dc3545',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  
  badgeText: {
    color: 'white',
    fontSize: 8,
    fontWeight: 'bold',
    lineHeight: 10,
  },
  
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 12,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  
  activeLabel: {
    color: '#1B7332',
    fontWeight: 'bold',
  },
});

export default BottomNavigation;