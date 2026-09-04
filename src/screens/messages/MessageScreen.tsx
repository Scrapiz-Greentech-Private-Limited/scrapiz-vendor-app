import React, { useMemo } from 'react';
import { Alert, Image, Linking, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../../hooks/useAuth';

interface MessageScreenProps {
  onBack: () => void;
  onNavigate: (screen: string) => void;
  onShowToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

const supportAvatar = require('../../../assets/images/vendorApp_logo1.png');

const routeChips = ['Pickup issue', 'Wallet help', 'Subscription', 'Talk to our consultants'];

const MessageScreen = ({ onBack, onNavigate, onShowToast }: MessageScreenProps) => {
  const { user } = useAuth();

  const supportOptions = useMemo(
    () => [
      {
        key: 'phone',
        title: 'Use our dedicated phone support route',
        subtitle: 'Talk directly with the operations team for urgent vendor help.',
        icon: 'call',
        onPress: async () => {
          const url = 'tel:+918000123456';
          const supported = await Linking.canOpenURL(url);
          if (!supported) {
            Alert.alert('Unavailable', 'Calling is not available on this device.');
            return;
          }
          await Linking.openURL(url);
        },
      },
      {
        key: 'whatsapp',
        title: 'Use our WhatsApp route',
        subtitle: 'Send a quick message and continue the conversation there.',
        icon: 'logo-whatsapp',
        onPress: async () => {
          const text = encodeURIComponent('Hi, I need help with the Scrapiz Vendor App.');
          const url = `whatsapp://send?phone=918000123456&text=${text}`;
          const supported = await Linking.canOpenURL(url);
          if (!supported) {
            onShowToast?.('WhatsApp is not installed on this device.', 'error');
            return;
          }
          await Linking.openURL(url);
        },
      },
      {
        key: 'chat',
        title: 'Use our in-app chat',
        subtitle: 'Recommended for faster responses and guided troubleshooting.',
        icon: 'chatbubble-ellipses',
        recommended: true,
        onPress: () => onNavigate('help-support'),
      },
    ],
    [onNavigate, onShowToast],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.headerButton} onPress={onBack}>
            <Ionicons name="arrow-back" size={20} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerSlug}>Support</Text>
          <TouchableOpacity style={styles.headerButton} onPress={() => onNavigate('contacts')}>
            <Ionicons name="close" size={20} color="#111827" />
          </TouchableOpacity>
        </View>

        <View style={styles.logoWrap}>
          <Image source={supportAvatar} style={styles.logo} resizeMode="contain" />
        </View>
        <Text style={styles.heroTitle}>Vendor support made simple</Text>
        <Text style={styles.heroSubtitle}>
          Choose the route that fits best for {user?.name || 'your team'}, or use in-app chat for faster help.
        </Text>

        <View style={styles.optionsCard}>
          {supportOptions.map((option, index) => (
            <React.Fragment key={option.key}>
              <TouchableOpacity style={styles.optionRow} activeOpacity={0.88} onPress={option.onPress}>
                <View style={styles.optionCopy}>
                  <View style={styles.optionTitleRow}>
                    <Text style={styles.optionTitle}>{option.title}</Text>
                    {option.recommended ? <Text style={styles.recommendedPill}>Recommended</Text> : null}
                  </View>
                  <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
                </View>
                <View style={[styles.optionArrow, option.recommended && styles.optionArrowActive]}>
                  <Ionicons
                    name="arrow-forward"
                    size={16}
                    color={option.recommended ? '#FFFFFF' : '#111827'}
                  />
                </View>
              </TouchableOpacity>
              {index < supportOptions.length - 1 ? <View style={styles.optionDivider} /> : null}
            </React.Fragment>
          ))}
        </View>

        <View style={styles.chatCard}>
          <Text style={styles.chatHeading}>You&apos;re connected with our consultant</Text>
          <Text style={styles.chatDate}>Today</Text>

          <View style={styles.messagesWrap}>
            <View style={styles.leftBubble}>
              <Text style={styles.leftBubbleText}>Hola 👋</Text>
            </View>

            <View style={styles.consultantRow}>
              <Image source={supportAvatar} style={styles.chatAvatar} resizeMode="contain" />
              <View style={styles.rightBubble}>
                <Text style={styles.rightBubbleText}>What brought you here today?</Text>
              </View>
            </View>

            <View style={styles.tagRow}>
              {routeChips.map((chip) => (
                <TouchableOpacity key={chip} style={styles.tagChip} activeOpacity={0.86} onPress={() => onNavigate('help-support')}>
                  <Text style={styles.tagChipText}>{chip}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity style={styles.inAppCta} activeOpacity={0.88} onPress={() => onNavigate('help-support')}>
            <MaterialIcons name="support-agent" size={18} color="#14532D" />
            <Text style={styles.inAppCtaText}>Open in-app support chat</Text>
          </TouchableOpacity>

          <View style={styles.inputShell}>
            <TextInput
              editable={false}
              placeholder="Message..."
              placeholderTextColor="#94A3B8"
              style={styles.input}
            />
            <TouchableOpacity style={styles.sendButton} activeOpacity={0.9} onPress={() => onNavigate('help-support')}>
              <Ionicons name="arrow-up" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F6F2',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 42,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  headerSlug: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  logoWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#F4DC5B',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  logo: {
    width: 60,
    height: 60,
  },
  heroTitle: {
    textAlign: 'center',
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    color: '#0F172A',
  },
  heroSubtitle: {
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
    color: '#475569',
    marginTop: 10,
    marginBottom: 24,
    paddingHorizontal: 12,
  },
  optionsCard: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    marginBottom: 22,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  optionCopy: {
    flex: 1,
    paddingRight: 14,
  },
  optionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    color: '#111827',
    flexShrink: 1,
  },
  optionSubtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: '#64748B',
  },
  recommendedPill: {
    fontSize: 11,
    fontWeight: '700',
    color: '#14532D',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  optionArrow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2F7',
  },
  optionArrowActive: {
    backgroundColor: '#111827',
  },
  optionDivider: {
    height: 1,
    backgroundColor: '#ECEEF3',
  },
  chatCard: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 30,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chatHeading: {
    textAlign: 'center',
    fontSize: 26,
    lineHeight: 34,
    fontWeight: '500',
    color: '#111827',
  },
  chatDate: {
    textAlign: 'center',
    fontSize: 13,
    color: '#64748B',
    marginTop: 18,
    marginBottom: 16,
  },
  messagesWrap: {
    gap: 12,
  },
  leftBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#F8FAFC',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  leftBubbleText: {
    color: '#111827',
    fontSize: 14,
  },
  consultantRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  chatAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 10,
  },
  rightBubble: {
    maxWidth: '82%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  rightBubbleText: {
    color: '#111827',
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '500',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  tagChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: '#FFFFFF',
  },
  tagChipText: {
    fontSize: 13,
    color: '#111827',
  },
  inAppCta: {
    marginTop: 18,
    marginBottom: 14,
    borderRadius: 18,
    backgroundColor: '#ECFDF3',
    borderWidth: 1,
    borderColor: '#CDEED8',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inAppCtaText: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: '700',
    color: '#14532D',
  },
  inputShell: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D7DCE4',
    borderRadius: 999,
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 6,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    paddingVertical: 8,
  },
  sendButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
  },
});

export default MessageScreen;
