import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../../theme/appTheme';

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
  const { palette } = useAppTheme();
  
  // Simplified and more compact safe area calculation
  const compactBottomPadding = Platform.OS === 'android' 
    ? Math.max(insets.bottom + 4, 12) // Minimal padding for Android
    : Math.max(insets.bottom, 8); // iOS safe area
  
  const tabs: { key: string; label: string; icon: string; badge?: number }[] = [
    { key: 'home', label: 'Home', icon: 'home' },
    { 
      key: 'manage', 
      label: 'Manage', 
      icon: 'work',
      badge: (jobCounts?.active || 0) + (jobCounts?.pending || 0) + (jobCounts?.upcoming || 0),
    },
    { key: 'message', label: 'Message', icon: 'message' },
    { key: 'profile', label: 'Profile', icon: 'person' },
  ];

  return (
    <View style={styles.container} pointerEvents="box-none">
      <View
        style={[
          styles.tabContainer,
          {
            marginBottom: compactBottomPadding,
            backgroundColor: palette.surface,
            borderColor: palette.border,
          },
        ]}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;

          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => onTabChange(tab.key)}
              style={[styles.tab, isActive && styles.activeTab]}
              activeOpacity={0.75}
              accessibilityLabel={tab.label}
            >
              <View
                style={[
                  styles.iconContainer,
                  isActive && { backgroundColor: palette.primary, shadowColor: palette.primary },
                ]}
              >
                <MaterialIcons
                  name={tab.icon as any}
                  size={22}
                  color={isActive ? palette.primaryText : palette.textMuted}
                />
                {tab.badge && tab.badge > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {tab.badge > 99 ? '99+' : tab.badge}
                    </Text>
                  </View>
                )}
              </View>
              <Text
                style={[
                  styles.label,
                  { color: isActive ? palette.primary : palette.textMuted },
                  isActive && styles.activeLabel,
                ]}
              >
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
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    alignItems: 'center',
    zIndex: 1000,
  },
  
  tabContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 28,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    minWidth: 54,
  },
  
  activeTab: {
    transform: [{ scale: 1.02 }],
  },
  
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
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
    fontSize: 9,
    fontWeight: '600',
    marginTop: 3,
  },
  
  activeLabel: {
    fontWeight: '700',
  },
});

export default BottomNavigation;
