import React, { useRef, useState } from 'react';
import {
  Animated,
  Image,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { FontAwesome5, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

interface MessageScreenProps {
  onBack: () => void;
  onNavigate: (screen: string) => void;
  onShowToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

const supportImage = require('../../../assets/images/avatars/customer_Support.png');

const SOCIAL_ROUTES = [
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    icon: 'whatsapp',
    color: '#25D366',
    url: 'whatsapp://send?phone=918000123456&text=Hi%2C%20I%20need%20help%20with%20Scrapiz.',
    fallbackUrl: 'https://wa.me/918000123456?text=Hi%2C%20I%20need%20help%20with%20Scrapiz.',
  },
  {
    key: 'linkedin',
    label: 'LinkedIn',
    icon: 'linkedin-in',
    color: '#0A66C2',
    url: 'https://www.linkedin.com/company/scrapiz',
  },
  {
    key: 'instagram',
    label: 'Instagram',
    icon: 'instagram',
    color: '#E4405F',
    url: 'https://www.instagram.com/scrapiz.in',
  },
];

const MessageScreen = ({ onBack, onNavigate, onShowToast }: MessageScreenProps) => {
  const [isSocialSheetVisible, setIsSocialSheetVisible] = useState(false);
  const sheetTranslateY = useRef(new Animated.Value(360)).current;

  const openSocialSheet = () => {
    setIsSocialSheetVisible(true);
    sheetTranslateY.setValue(360);
    Animated.spring(sheetTranslateY, {
      toValue: 0,
      damping: 20,
      stiffness: 180,
      useNativeDriver: true,
    }).start();
  };

  const closeSocialSheet = () => {
    Animated.timing(sheetTranslateY, {
      toValue: 360,
      duration: 210,
      useNativeDriver: true,
    }).start(() => setIsSocialSheetVisible(false));
  };

  const openRoute = async (route: (typeof SOCIAL_ROUTES)[number]) => {
    try {
      const supported = await Linking.canOpenURL(route.url);
      await Linking.openURL(supported ? route.url : route.fallbackUrl || route.url);
      closeSocialSheet();
    } catch {
      onShowToast?.(`Unable to open ${route.label}.`, 'error');
    }
  };

  const callSupport = async () => {
    const url = 'tel:+918000123456';
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        onShowToast?.('Calling is unavailable on this device.', 'error');
        return;
      }
      await Linking.openURL(url);
    } catch {
      onShowToast?.('Unable to start the call.', 'error');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.headerButton} onPress={onBack} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={22} color="#0B2D1C" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Messages</Text>
          <View style={styles.headerButtonMuted}>
            <MaterialIcons name="support-agent" size={21} color="#0B7D3A" />
          </View>
        </View>

        <Image source={supportImage} style={styles.supportImage} resizeMode="contain" />

        <Text style={styles.title}>Need support?</Text>
        <Text style={styles.subtitle}>Choose one route. We will keep it quick.</Text>

        <View style={styles.routeList}>
          <TouchableOpacity style={styles.routeButton} activeOpacity={0.88} onPress={callSupport}>
            <View style={styles.routeIcon}>
              <Ionicons name="call" size={22} color="#087333" />
            </View>
            <View style={styles.routeCopy}>
              <Text style={styles.routeTitle}>Call support</Text>
              <Text style={styles.routeText}>10:00 AM to 9:00 PM</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#8AA393" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.routeButton} activeOpacity={0.88} onPress={openSocialSheet}>
            <View style={[styles.routeIcon, styles.socialIconCluster]}>
              {SOCIAL_ROUTES.map((route) => (
                <FontAwesome5 key={route.key} name={route.icon as any} size={14} color={route.color} />
              ))}
            </View>
            <View style={styles.routeCopy}>
              <Text style={styles.routeTitle}>Social messages</Text>
              <Text style={styles.routeText}>WhatsApp, Instagram, LinkedIn</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#8AA393" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.routeButton, styles.primaryRoute]}
            activeOpacity={0.9}
            onPress={() => onNavigate('support-chat')}
          >
            <View style={[styles.routeIcon, styles.primaryRouteIcon]}>
              <Ionicons name="chatbubble-ellipses" size={22} color="#FFFFFF" />
            </View>
            <View style={styles.routeCopy}>
              <Text style={styles.primaryRouteTitle}>In-app chat support</Text>
              <Text style={styles.primaryRouteText}>Start a guided request</Text>
            </View>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={isSocialSheetVisible} transparent animationType="none" onRequestClose={closeSocialSheet}>
        <Pressable style={styles.sheetOverlay} onPress={closeSocialSheet}>
          <Animated.View style={[styles.sheet, { transform: [{ translateY: sheetTranslateY }] }]}>
            <Pressable>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>Message Scrapiz</Text>
              <Text style={styles.sheetText}>Pick a channel to continue.</Text>
              {SOCIAL_ROUTES.map((route) => (
                <TouchableOpacity
                  key={route.key}
                  style={styles.sheetOption}
                  activeOpacity={0.88}
                  onPress={() => openRoute(route)}
                >
                  <View style={[styles.sheetOptionIcon, { backgroundColor: `${route.color}18` }]}>
                    <FontAwesome5 name={route.icon as any} size={21} color={route.color} />
                  </View>
                  <Text style={styles.sheetOptionText}>{route.label}</Text>
                  <Ionicons name="open-outline" size={19} color="#667085" />
                </TouchableOpacity>
              ))}
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4FBF6',
  },
  content: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 116,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    shadowColor: '#0D3B22',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  headerButtonMuted: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E7F9EE',
  },
  headerTitle: {
    color: '#0B2D1C',
    fontSize: 20,
    fontWeight: '800',
  },
  supportImage: {
    alignSelf: 'center',
    width: '100%',
    height: 278,
    marginTop: 8,
    marginBottom: 2,
  },
  title: {
    color: '#082B19',
    fontSize: 31,
    fontWeight: '900',
    letterSpacing: 0,
    textAlign: 'center',
  },
  subtitle: {
    color: '#5D7467',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
    marginBottom: 22,
    textAlign: 'center',
  },
  routeList: {
    gap: 14,
  },
  routeButton: {
    minHeight: 82,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCEFE4',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#105C31',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  routeIcon: {
    width: 48,
    height: 48,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF8EF',
    marginRight: 14,
  },
  socialIconCluster: {
    flexDirection: 'row',
    gap: 5,
  },
  routeCopy: {
    flex: 1,
    minWidth: 0,
  },
  routeTitle: {
    color: '#102B1D',
    fontSize: 17,
    fontWeight: '800',
  },
  routeText: {
    color: '#6A7D71',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  primaryRoute: {
    backgroundColor: '#078735',
    borderColor: '#078735',
  },
  primaryRouteIcon: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  primaryRouteTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },
  primaryRouteText: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(7, 31, 18, 0.38)',
  },
  sheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 34,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 46,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#D9E6DE',
    marginBottom: 18,
  },
  sheetTitle: {
    color: '#092A19',
    fontSize: 22,
    fontWeight: '900',
  },
  sheetText: {
    color: '#65776C',
    fontSize: 14,
    marginTop: 5,
    marginBottom: 14,
  },
  sheetOption: {
    height: 66,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FBF8',
    paddingHorizontal: 14,
    marginTop: 10,
  },
  sheetOptionIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },
  sheetOptionText: {
    flex: 1,
    color: '#102B1D',
    fontSize: 16,
    fontWeight: '800',
  },
});

export default MessageScreen;
