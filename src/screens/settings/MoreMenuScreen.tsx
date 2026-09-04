import React, { useEffect, useState } from 'react';
import {
  Alert,
  Animated,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../../hooks/useAuth';
import { ThemeMode, useAppTheme } from '../../theme/appTheme';

interface MoreMenuScreenProps {
  onBack: () => void;
  onNavigate: (screen: string) => void;
  onLogout?: () => void;
}

type MenuItem = {
  key: string;
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  action: () => void;
};

const MoreMenuScreen: React.FC<MoreMenuScreenProps> = ({ onBack, onNavigate, onLogout }) => {
  const { user } = useAuth();
  const { palette, theme, setTheme } = useAppTheme();
  const [screenAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    Animated.timing(screenAnim, {
      toValue: 1,
      duration: 520,
      useNativeDriver: true,
    }).start();
  }, [screenAnim]);

  const handleThemeToggle = async () => {
    const nextTheme: ThemeMode = theme === 'dark' ? 'light' : 'dark';
    await setTheme(nextTheme);
  };

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
      return;
    }
    Alert.alert('Logout unavailable', 'Logout is not wired on this screen yet.');
  };

  const menuItems: MenuItem[] = [
    {
      key: 'marketplace',
      label: 'Marketplace',
      icon: 'storefront',
      action: () => onNavigate('materials'),
    },
    {
      key: 'language',
      label: 'Language',
      icon: 'translate',
      action: () => onNavigate('language'),
    },
    {
      key: 'theme',
      label: 'Theme',
      icon: theme === 'dark' ? 'dark-mode' : 'light-mode',
      action: () => void handleThemeToggle(),
    },
    {
      key: 'history',
      label: 'Past Completed Orders',
      icon: 'history',
      action: () => onNavigate('history'),
    },
    {
      key: 'reviews',
      label: 'Reviews',
      icon: 'star',
      action: () => onNavigate('ratings-hub'),
    },
    {
      key: 'contacts',
      label: 'Contacts',
      icon: 'contacts',
      action: () => onNavigate('contacts'),
    },
    {
      key: 'support',
      label: 'Customer support messages',
      icon: 'support-agent',
      action: () => onNavigate('message'),
    },
  ];

  const displayName = user?.name || 'Vendor Partner';
  const displayEmail = user?.email || 'vendor@scrapiz.co';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={palette.background} />

      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={onBack}
          style={[styles.iconButton, { backgroundColor: palette.surface, borderColor: palette.border }]}
        >
          <Ionicons name="chevron-back" size={20} color={palette.textMain} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: palette.textMain }]}>Settings</Text>
          <Text style={[styles.headerSubtitle, { color: palette.textMuted }]}>A cleaner control center for vendor work</Text>
        </View>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={[styles.logoutText, { color: palette.textMuted }]}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View
          style={[
            styles.animatedShell,
            {
              opacity: screenAnim,
              transform: [
                {
                  translateY: screenAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [14, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View
            style={[
              styles.profileBlock,
              {
                backgroundColor: palette.surface,
                borderColor: palette.border,
                shadowColor: theme === 'dark' ? '#000' : palette.overlay,
              },
            ]}
          >
            <View style={[styles.avatarWrap, { backgroundColor: palette.surfaceElevated, borderColor: palette.border }]}>
              {user?.image || user?.profileImage ? (
                <Image source={{ uri: (user?.image || user?.profileImage) as string }} style={styles.avatarImage} />
              ) : (
                <MaterialIcons name="person" size={30} color={palette.textMuted} />
              )}
            </View>
            <Text style={[styles.profileName, { color: palette.textMain }]}>{displayName}</Text>
            <Text style={[styles.profileEmail, { color: palette.textMuted }]}>{displayEmail}</Text>
            <View style={[styles.profilePill, { backgroundColor: palette.primarySoft }]}>
              <MaterialIcons name="verified" size={15} color={palette.primary} />
              <Text style={[styles.profilePillText, { color: palette.primary }]}>Vendor settings</Text>
            </View>
          </View>

          <View style={[styles.sectionCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Text style={[styles.sectionTitle, { color: palette.textMuted }]}>Quick Access</Text>
            {menuItems.map((item) => (
              <TouchableOpacity key={item.key} style={styles.rowItem} onPress={item.action} activeOpacity={0.84}>
                <View style={styles.rowLeft}>
                  <View style={[styles.rowIconWrap, { backgroundColor: palette.primarySoft }]}>
                    <MaterialIcons name={item.icon} size={20} color={palette.primary} />
                  </View>
                  <View style={styles.rowTextWrap}>
                    <Text style={[styles.rowLabel, { color: palette.textMain }]}>{item.label}</Text>
                    {item.key === 'theme' ? (
                      <Text style={[styles.rowDescription, { color: palette.textMuted }]}>
                        {theme === 'dark' ? 'Dark mode is active' : 'Light mode is active'}
                      </Text>
                    ) : null}
                  </View>
                </View>

                {item.key === 'theme' ? (
                  <Switch
                    value={theme === 'dark'}
                    onValueChange={() => void handleThemeToggle()}
                    trackColor={{ false: '#A5B4FC', true: palette.primary }}
                    thumbColor="#FFFFFF"
                  />
                ) : (
                  <Ionicons name="chevron-forward" size={18} color={palette.textMuted} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  animatedShell: {
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '500',
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '700',
  },
  profileBlock: {
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 18,
    borderRadius: 24,
    borderWidth: 1,
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  avatarWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 36,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '800',
  },
  profileEmail: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '500',
  },
  profilePill: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  profilePillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sectionCard: {
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 4,
    marginTop: 10,
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.12)',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  rowIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTextWrap: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  rowDescription: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '500',
  },
});

export default MoreMenuScreen;
