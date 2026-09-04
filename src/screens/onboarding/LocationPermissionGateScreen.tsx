import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  AppState,
  Easing,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView as RNScrollView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { trackVendorClick, trackVendorFailure } from '../../services/telemetry';
import SlideToConfirmButton from '../../components/ui/SlideToConfirmButton';
import { useLanguage } from '../../utils/i18n';

const PRECISE_LOCATION_IMAGE = require('../../../assets/images/permission_1.png');
const BACKGROUND_LOCATION_IMAGE = require('../../../assets/images/permission_2.png');

const SCREEN_COPY = {
  english: {
    steps: ['Always-on setup', 'Precise location', 'Background access', 'Ready to go'],
    uncomfortable: 'Uncomfortable in English?',
    change: 'Change',
    languageTitle: 'Choose language',
    languageSubtitle: 'Switch this permission flow instantly.',
    english: 'English',
    hindi: 'Hindi',
    trackingSetup: 'Tracking setup',
    introTitle: 'Enable always-on tracking',
    introBody:
      'Turn on the required location access in a short guided flow designed for vendor jobs.',
    introPanelTitle: 'Guided permission setup',
    introPanelBody:
      'We will configure location access one step at a time so nothing feels overwhelming.',
    introHighlights: [
      'Precise GPS for accurate pickup coverage',
      'Always-on tracking while phone is locked',
      'Short guided setup with just a few steps',
    ],
    startSlider: 'Slide to Start Setup',
    step2: 'Step 2 of 4',
    preciseTitle: 'Turn on precise location',
    preciseBody: 'This helps Scrapiz lock onto your exact pickup area before jobs start.',
    precisePanelTitle: 'Precise location access',
    precisePanelBody:
      'Tap the main button below to trigger the location permission prompt directly on this screen.',
    currentStatus: 'Current status',
    preciseEnabled: 'Enabled',
    precisePending: 'Required for live check-ins',
    preciseBenefit1: 'Exact pickup and drop radius',
    preciseBenefit2: 'Faster vendor verification',
    preciseButton: 'Allow precise location',
    preciseDone: 'Precise location enabled',
    back: 'Back',
    step3: 'Step 3 of 4',
    bgTitle: 'Allow background tracking',
    bgBody: 'Keep location active while navigating, taking calls, or locking your phone.',
    bgPanelTitle: 'Background location access',
    bgPanelBody:
      'Android may send this through Settings. We only need one last approval so live tracking stays active off-screen.',
    bgEnabled: 'Allowed all the time',
    bgPending: 'Keep location alive when app is minimized',
    bgSettings: 'Finish this from Settings on your phone',
    bgButton: 'Enable background access',
    bgDone: 'Background tracking enabled',
    openSettings: 'Open phone settings',
    bgHint:
      'If you only see "Allow while using app", open Settings and choose "Allow all the time".',
    step4: 'Step 4 of 4',
    readyTitle: 'You are ready for live jobs',
    readyBody: 'Permissions are configured. Slide to continue and enter the vendor app.',
    statusPanelTitle: 'Permission status',
    productionReady: 'Production ready',
    finishStep: 'Finish remaining step',
    continueSlider: 'Slide to Continue',
    enableFirstSlider: 'Enable Permissions First',
    pendingWarning: 'Finish the remaining permission to unlock the continue slider.',
    logout: 'Logout',
    allowAllTimeTitle: 'Enable Allow all the time',
    allowAllTimeBody:
      'On Android 11 and above, background location is granted from App Settings. Open settings, tap Permissions > Location, then choose Allow all the time.',
    notNow: 'Not now',
  },
  hindi: {
    steps: ['ट्रैकिंग सेटअप', 'सटीक लोकेशन', 'बैकग्राउंड एक्सेस', 'तैयार'],
    uncomfortable: 'अंग्रेज़ी में असुविधा है?',
    change: 'बदलें',
    languageTitle: 'भाषा चुनें',
    languageSubtitle: 'इस अनुमति प्रक्रिया की भाषा तुरंत बदलें।',
    english: 'English',
    hindi: 'हिंदी',
    trackingSetup: 'ट्रैकिंग सेटअप',
    introTitle: 'हमेशा चालू ट्रैकिंग सक्षम करें',
    introBody: 'वेंडर जॉब्स के लिए जरूरी लोकेशन एक्सेस को छोटे गाइडेड स्टेप्स में चालू करें।',
    introPanelTitle: 'गाइडेड परमिशन सेटअप',
    introPanelBody: 'हम लोकेशन एक्सेस को एक-एक स्टेप में सेट करेंगे ताकि सब कुछ आसान लगे।',
    introHighlights: [
      'सटीक GPS से सही पिकअप कवरेज',
      'फोन लॉक होने पर भी ट्रैकिंग चालू रहे',
      'कुछ आसान स्टेप्स में पूरा सेटअप',
    ],
    startSlider: 'सेटअप शुरू करने के लिए स्लाइड करें',
    step2: 'स्टेप 2 / 4',
    preciseTitle: 'सटीक लोकेशन चालू करें',
    preciseBody: 'इससे Scrapiz आपके जॉब शुरू होने से पहले सही पिकअप एरिया पहचान पाता है।',
    precisePanelTitle: 'सटीक लोकेशन एक्सेस',
    precisePanelBody: 'नीचे दिए गए मुख्य बटन पर टैप करें, इसी स्क्रीन से परमिशन पॉपअप सीधे खुलेगा।',
    currentStatus: 'वर्तमान स्थिति',
    preciseEnabled: 'सक्षम',
    precisePending: 'लाइव चेक-इन के लिए आवश्यक',
    preciseBenefit1: 'सही पिकअप और ड्रॉप रेडियस',
    preciseBenefit2: 'तेज़ वेंडर वेरिफिकेशन',
    preciseButton: 'सटीक लोकेशन अनुमति दें',
    preciseDone: 'सटीक लोकेशन सक्षम है',
    back: 'वापस',
    step3: 'स्टेप 3 / 4',
    bgTitle: 'बैकग्राउंड ट्रैकिंग अनुमति दें',
    bgBody: 'नेविगेशन, कॉल या फोन लॉक होने पर भी लोकेशन सक्रिय रखें।',
    bgPanelTitle: 'बैकग्राउंड लोकेशन एक्सेस',
    bgPanelBody:
      'Android आपको Settings पर भेज सकता है। हमें बस एक आखिरी अनुमति चाहिए ताकि स्क्रीन बंद होने पर भी ट्रैकिंग चलती रहे।',
    bgEnabled: 'हमेशा अनुमति दी गई',
    bgPending: 'ऐप मिनिमाइज़ होने पर भी लोकेशन चालू रखें',
    bgSettings: 'इसे फोन की Settings से पूरा करें',
    bgButton: 'बैकग्राउंड एक्सेस सक्षम करें',
    bgDone: 'बैकग्राउंड ट्रैकिंग सक्षम है',
    openSettings: 'फोन Settings खोलें',
    bgHint: 'अगर केवल "Allow while using app" दिखे, तो Settings में जाकर "Allow all the time" चुनें।',
    step4: 'स्टेप 4 / 4',
    readyTitle: 'आप लाइव जॉब्स के लिए तैयार हैं',
    readyBody: 'अनुमतियाँ सेट हो गई हैं। आगे बढ़ने के लिए स्लाइड करें और ऐप में जाएँ।',
    statusPanelTitle: 'परमिशन स्थिति',
    productionReady: 'प्रोडक्शन के लिए तैयार',
    finishStep: 'बाकी स्टेप पूरा करें',
    continueSlider: 'आगे बढ़ने के लिए स्लाइड करें',
    enableFirstSlider: 'पहले परमिशन सक्षम करें',
    pendingWarning: 'जारी रखने वाले स्लाइडर को खोलने के लिए बाकी परमिशन पूरी करें।',
    logout: 'लॉगआउट',
    allowAllTimeTitle: 'हमेशा अनुमति दें सक्षम करें',
    allowAllTimeBody:
      'Android 11 और उससे ऊपर में बैकग्राउंड लोकेशन App Settings से मिलती है। Settings खोलें, Permissions > Location पर जाएँ, फिर Allow all the time चुनें।',
    notNow: 'अभी नहीं',
  },
} as const;

interface LocationPermissionGateScreenProps {
  onContinue: () => void;
  onLogout: () => void;
}

export default function LocationPermissionGateScreen({
  onContinue,
  onLogout,
}: LocationPermissionGateScreenProps) {
  const insets = useSafeAreaInsets();
  const { language, setLanguage } = useLanguage();
  const [languageDrawerOpen, setLanguageDrawerOpen] = useState(false);
  const drawerAnim = useState(() => new Animated.Value(320))[0];
  const [isBusy, setIsBusy] = useState(false);
  const [foregroundGranted, setForegroundGranted] = useState(false);
  const [backgroundGranted, setBackgroundGranted] = useState(false);
  const [backgroundAvailable, setBackgroundAvailable] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const copy = language === 'hindi' ? SCREEN_COPY.hindi : SCREEN_COPY.english;

  const syncPermissionState = useCallback(async () => {
    try {
      const [foreground, background] = await Promise.all([
        Location.getForegroundPermissionsAsync(),
        Location.getBackgroundPermissionsAsync(),
      ]);

      setForegroundGranted(foreground.status === 'granted');
      setBackgroundGranted(background.status === 'granted');

      if (Platform.OS === 'android' && Location.isBackgroundLocationAvailableAsync) {
        const isAvailable = await Location.isBackgroundLocationAvailableAsync();
        setBackgroundAvailable(isAvailable);
      } else {
        setBackgroundAvailable(true);
      }
    } catch {
      trackVendorFailure('location_permission_sync', 'Failed to sync location permissions');
      setForegroundGranted(false);
      setBackgroundGranted(false);
      setBackgroundAvailable(false);
    }
  }, []);

  useEffect(() => {
    void syncPermissionState();
  }, [syncPermissionState]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void syncPermissionState();
      }
    });
    return () => subscription.remove();
  }, [syncPermissionState]);

  const allGranted = foregroundGranted && backgroundGranted;

  useEffect(() => {
    if (allGranted || currentStep === 0) return;

    const interval = setInterval(() => {
      void syncPermissionState();
    }, 1500);

    return () => clearInterval(interval);
  }, [allGranted, currentStep, syncPermissionState]);

  useEffect(() => {
    Animated.timing(drawerAnim, {
      toValue: languageDrawerOpen ? 0 : 320,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [drawerAnim, languageDrawerOpen]);

  useEffect(() => {
    if (allGranted) {
      setCurrentStep(3);
      return;
    }
    if (backgroundGranted) {
      setCurrentStep((prev) => Math.max(prev, 2));
      return;
    }
    if (foregroundGranted) {
      setCurrentStep((prev) => Math.max(prev, 1));
    }
  }, [allGranted, backgroundGranted, foregroundGranted]);

  const requestForeground = useCallback(async () => {
    setIsBusy(true);
    let granted = false;
    try {
      const foreground = await Location.requestForegroundPermissionsAsync();
      granted = foreground.status === 'granted';
      if (granted) {
        try {
          await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Highest,
            mayShowUserSettingsDialog: true,
          });
        } catch {
          // Permission may be granted even if fetching position fails.
        }
      }
    } catch (error) {
      trackVendorFailure('location_permission_foreground_request', error);
      granted = false;
    } finally {
      await syncPermissionState();
      setIsBusy(false);
    }

    if (granted) {
      setCurrentStep(2);
    }
    return granted;
  }, [syncPermissionState]);

  const requestBackground = useCallback(async () => {
    setIsBusy(true);
    let granted = false;
    try {
      const foregroundReady = foregroundGranted || (await requestForeground());
      if (!foregroundReady) return granted;

      const background = await Location.requestBackgroundPermissionsAsync();
      granted = background.status === 'granted';

      if (!granted && Platform.OS === 'android') {
        Alert.alert(
          copy.allowAllTimeTitle,
          copy.allowAllTimeBody,
          [
            {
              text: copy.openSettings,
              onPress: () => {
                trackVendorClick('location_permission_alert_open_settings', {
                  source: 'background_permission_denied_alert',
                });
                void Linking.openSettings();
              },
            },
            { text: copy.notNow, style: 'cancel' },
          ]
        );
      }
    } catch (error) {
      trackVendorFailure('location_permission_background_request', error, {
        foreground_granted: foregroundGranted,
      });
      granted = false;
    } finally {
      await syncPermissionState();
      setIsBusy(false);
    }

    if (granted) {
      setCurrentStep(3);
    }
    return granted;
  }, [copy.allowAllTimeBody, copy.allowAllTimeTitle, copy.notNow, copy.openSettings, foregroundGranted, requestForeground, syncPermissionState]);

  const openPhoneSettings = useCallback((source: string) => {
    trackVendorClick('location_permission_open_phone_settings', {
      source,
      foreground_granted: foregroundGranted,
      background_granted: backgroundGranted,
    });
    void Linking.openSettings();
  }, [backgroundGranted, foregroundGranted]);

  const handleDisabledContinue = useCallback(async () => {
    if (!foregroundGranted) {
      trackVendorClick('location_permission_enable_foreground', {
        foreground_granted: foregroundGranted,
        background_granted: backgroundGranted,
        source: 'disabled_continue',
      });
      await requestForeground();
      return;
    }

    if (!backgroundGranted) {
      trackVendorClick('location_permission_enable_background', {
        foreground_granted: foregroundGranted,
        background_granted: backgroundGranted,
        source: 'disabled_continue',
      });
      await requestBackground();
    }
  }, [
    backgroundGranted,
    foregroundGranted,
    requestBackground,
    requestForeground,
  ]);

  const foregroundStatus = foregroundGranted ? copy.preciseEnabled : copy.precisePending;
  const backgroundStatus = backgroundGranted
    ? copy.bgEnabled
    : backgroundAvailable
      ? copy.bgPending
      : copy.bgSettings;

  const finalGrids = useMemo(
    () => [
      { icon: 'my-location', title: foregroundStatus, tone: foregroundGranted },
      { icon: 'location-on', title: backgroundStatus, tone: backgroundGranted },
      { icon: 'verified-user', title: copy.productionReady, tone: allGranted },
    ],
    [allGranted, backgroundGranted, backgroundStatus, copy.productionReady, foregroundGranted, foregroundStatus]
  );

  const renderStepIndicators = () => (
    <RNScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.stepperScrollContent}
    >
      <View style={styles.stepperRow}>
        {copy.steps.map((label, index) => {
          const isActive = index === currentStep;
          const isDone =
            (index === 1 && foregroundGranted) ||
            (index === 2 && backgroundGranted) ||
            (index === 3 && allGranted) ||
            index < currentStep;

          return (
            <View key={label} style={styles.stepperItem}>
              <View
                style={[
                  styles.stepperDot,
                  isActive && styles.stepperDotActive,
                  isDone && styles.stepperDotDone,
                ]}
              >
                {isDone ? (
                  <MaterialIcons name="check" size={12} color="#FFFFFF" />
                ) : (
                  <Text style={[styles.stepperDotText, isActive && styles.stepperDotTextActive]}>
                    {index + 1}
                  </Text>
                )}
              </View>
              <Text
                style={[styles.stepperLabel, isActive && styles.stepperLabelActive]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </View>
          );
        })}
      </View>
    </RNScrollView>
  );

  const renderHeroCard = () => {
    if (currentStep === 0) {
      return (
        <View style={[styles.heroCard, styles.heroIntroCard]}>
          <View style={styles.heroGlow} />
          <View style={styles.heroBadge}>
            <MaterialIcons name="location-searching" size={14} color="#166534" />
            <Text style={styles.heroBadgeText}>{copy.trackingSetup}</Text>
          </View>
          <View style={styles.heroArtFrame}>
            <Image
              source={PRECISE_LOCATION_IMAGE}
              style={styles.heroIntroImage}
              contentFit="contain"
              accessibilityLabel="Location onboarding illustration"
            />
          </View>
          <Text style={styles.heroTitleDark}>{copy.introTitle}</Text>
          <Text style={styles.heroSubtitleDark}>{copy.introBody}</Text>
        </View>
      );
    }

    if (currentStep === 1) {
      return (
        <View style={[styles.heroCard, styles.heroPermissionCard]}>
          <View style={styles.permissionImageWrap}>
            <View style={styles.permissionImageGradient} />
            <Image
              source={PRECISE_LOCATION_IMAGE}
              style={styles.permissionImage}
              contentFit="contain"
              accessibilityLabel="Precise location illustration"
            />
          </View>
          <Text style={styles.heroEyebrow}>{copy.step2}</Text>
          <Text style={styles.heroTitleDark}>{copy.preciseTitle}</Text>
          <Text style={styles.heroSubtitleDark}>{copy.preciseBody}</Text>
        </View>
      );
    }

    if (currentStep === 2) {
      return (
        <View style={[styles.heroCard, styles.heroPermissionCard]}>
          <View style={styles.permissionImageWrap}>
            <View style={[styles.permissionImageGradient, styles.permissionImageGradientAlt]} />
            <Image
              source={BACKGROUND_LOCATION_IMAGE}
              style={styles.permissionImage}
              contentFit="contain"
              accessibilityLabel="Background location illustration"
            />
          </View>
          <Text style={styles.heroEyebrow}>{copy.step3}</Text>
          <Text style={styles.heroTitleDark}>{copy.bgTitle}</Text>
          <Text style={styles.heroSubtitleDark}>{copy.bgBody}</Text>
        </View>
      );
    }

    return (
      <View style={[styles.heroCard, styles.heroSuccessCard]}>
        <View style={styles.successHalo} />
        <View style={styles.successIconWrap}>
          <MaterialIcons name="verified" size={34} color="#166534" />
        </View>
        <Text style={styles.heroEyebrow}>{copy.step4}</Text>
        <Text style={styles.heroTitleDark}>{copy.readyTitle}</Text>
        <Text style={styles.heroSubtitleDark}>{copy.readyBody}</Text>
      </View>
    );
  };

  const renderBodyCard = () => {
    if (currentStep === 0) {
      return (
        <View style={styles.panelCard}>
          <Text style={styles.panelTitle}>{copy.introPanelTitle}</Text>
          <Text style={styles.panelSubtitle}>{copy.introPanelBody}</Text>
          <View style={styles.introChecklist}>
            {copy.introHighlights.map((item) => (
              <View key={item} style={styles.introChecklistRow}>
                <View style={styles.introChecklistIcon}>
                  <MaterialIcons name="check" size={15} color="#166534" />
                </View>
                <Text style={styles.introChecklistText}>{item}</Text>
              </View>
            ))}
          </View>
          <View style={styles.introCtaWrap}>
            <SlideToConfirmButton
              label={copy.startSlider}
              onConfirm={() => setCurrentStep(1)}
              disabled={false}
              loading={false}
            />
          </View>
        </View>
      );
    }

    if (currentStep === 1) {
      return (
        <View style={styles.panelCard}>
          <Text style={styles.panelTitle}>{copy.precisePanelTitle}</Text>
          <Text style={styles.panelSubtitle}>{copy.precisePanelBody}</Text>
          <View style={styles.statusCard}>
            <View style={[styles.statusIconWrap, foregroundGranted && styles.statusIconWrapDone]}>
              <MaterialIcons
                name={foregroundGranted ? 'gps-fixed' : 'my-location'}
                size={22}
                color={foregroundGranted ? '#166534' : '#0F172A'}
              />
            </View>
            <View style={styles.statusCopy}>
              <Text style={styles.statusTitle}>{copy.currentStatus}</Text>
              <Text style={styles.statusBody}>{foregroundStatus}</Text>
            </View>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              (isBusy || foregroundGranted) && styles.primaryButtonDisabled,
              pressed && !isBusy && !foregroundGranted && styles.primaryButtonPressed,
            ]}
            onPress={() => {
              trackVendorClick('location_permission_enable_foreground', {
                foreground_granted: foregroundGranted,
                background_granted: backgroundGranted,
                source: 'step_foreground_button',
              });
              void requestForeground();
            }}
            disabled={isBusy || foregroundGranted}
            accessibilityLabel={copy.preciseButton}
          >
            {isBusy ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.primaryButtonText}>
                  {foregroundGranted ? copy.preciseDone : copy.preciseButton}
                </Text>
                <MaterialIcons
                  name={foregroundGranted ? 'check-circle' : 'chevron-right'}
                  size={18}
                  color="#FFFFFF"
                />
              </>
            )}
          </Pressable>
          <View style={styles.miniGridRow}>
            <View style={styles.miniGridCard}>
              <MaterialIcons name="place" size={18} color="#16A34A" />
              <Text style={styles.miniGridText}>{copy.preciseBenefit1}</Text>
            </View>
            <View style={styles.miniGridCard}>
              <MaterialIcons name="flash-on" size={18} color="#16A34A" />
              <Text style={styles.miniGridText}>{copy.preciseBenefit2}</Text>
            </View>
          </View>
          <Pressable
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.secondaryButtonPressed]}
            onPress={() => setCurrentStep(0)}
            accessibilityLabel={copy.back}
          >
            <Text style={styles.secondaryButtonText}>{copy.back}</Text>
          </Pressable>
        </View>
      );
    }

    if (currentStep === 2) {
      return (
        <View style={styles.panelCard}>
          <Text style={styles.panelTitle}>{copy.bgPanelTitle}</Text>
          <Text style={styles.panelSubtitle}>{copy.bgPanelBody}</Text>
          <View style={styles.statusCard}>
            <View style={[styles.statusIconWrap, backgroundGranted && styles.statusIconWrapDone]}>
              <MaterialIcons
                name={backgroundGranted ? 'location-on' : 'route'}
                size={22}
                color={backgroundGranted ? '#166534' : '#0F172A'}
              />
            </View>
            <View style={styles.statusCopy}>
              <Text style={styles.statusTitle}>{copy.currentStatus}</Text>
              <Text style={styles.statusBody}>{backgroundStatus}</Text>
            </View>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              (isBusy || backgroundGranted) && styles.primaryButtonDisabled,
              pressed && !isBusy && !backgroundGranted && styles.primaryButtonPressed,
            ]}
            onPress={() => {
              trackVendorClick('location_permission_enable_background', {
                foreground_granted: foregroundGranted,
                background_granted: backgroundGranted,
                source: 'step_background_button',
              });
              void requestBackground();
            }}
            disabled={isBusy || backgroundGranted}
            accessibilityLabel={copy.bgButton}
          >
            {isBusy ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.primaryButtonText}>
                  {backgroundGranted ? copy.bgDone : copy.bgButton}
                </Text>
                <MaterialIcons
                  name={backgroundGranted ? 'check-circle' : 'chevron-right'}
                  size={18}
                  color="#FFFFFF"
                />
              </>
            )}
          </Pressable>
          <View style={styles.gridListSingle}>
            <View style={styles.gridCallout}>
              <MaterialIcons name="info" size={18} color="#166534" />
              <Text style={styles.gridCalloutText}>{copy.bgHint}</Text>
            </View>
          </View>
          <View style={styles.settingsAssistCard}>
            <View style={styles.settingsAssistHeader}>
              <View style={styles.settingsAssistIconWrap}>
                <MaterialIcons name="settings" size={18} color="#166534" />
              </View>
              <Text style={styles.settingsAssistTitle}>{copy.bgSettings}</Text>
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.settingsAssistButton,
                pressed && styles.settingsAssistButtonPressed,
              ]}
              onPress={() => openPhoneSettings('step_background_secondary')}
              accessibilityLabel={copy.openSettings}
            >
              <Text style={styles.settingsAssistButtonText}>{copy.openSettings}</Text>
              <MaterialIcons name="open-in-new" size={18} color="#166534" />
            </Pressable>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.panelCard}>
        <Text style={styles.panelTitle}>{copy.statusPanelTitle}</Text>
        <View style={styles.readyGridRow}>
          {finalGrids.map((item) => (
            <View key={item.title} style={[styles.readyGridCard, item.tone && styles.readyGridCardDone]}>
              <MaterialIcons
                name={item.icon as never}
                size={18}
                color={item.tone ? '#166534' : '#64748B'}
              />
              <Text style={[styles.readyGridText, item.tone && styles.readyGridTextDone]}>{item.title}</Text>
            </View>
          ))}
        </View>
        {!allGranted && (
          <View style={styles.gridCallout}>
            <MaterialIcons name="warning-amber" size={18} color="#B45309" />
            <Text style={[styles.gridCalloutText, styles.gridCalloutWarning]}>
              {copy.pendingWarning}
            </Text>
          </View>
        )}
        <SlideToConfirmButton
          label={allGranted ? copy.continueSlider : copy.enableFirstSlider}
          onConfirm={allGranted ? onContinue : () => { void handleDisabledContinue(); }}
          onDisabledPress={() => { void handleDisabledContinue(); }}
          disabled={!allGranted}
          loading={isBusy && allGranted}
        />
        {!allGranted && (
          <Pressable
            style={({ pressed }) => [styles.ghostButton, pressed && styles.ghostButtonPressed]}
            onPress={() => setCurrentStep(foregroundGranted ? 2 : 1)}
            accessibilityLabel={copy.finishStep}
          >
            <Text style={styles.ghostButtonText}>{copy.finishStep}</Text>
          </Pressable>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.screen}>
      <Modal
        visible={languageDrawerOpen}
        transparent
        animationType="none"
        onRequestClose={() => setLanguageDrawerOpen(false)}
      >
        <View style={styles.drawerOverlay}>
          <Pressable style={styles.drawerBackdrop} onPress={() => setLanguageDrawerOpen(false)} />
          <Animated.View style={[styles.drawerPanel, { transform: [{ translateX: drawerAnim }] }]}>
            <View style={styles.drawerHandle} />
            <Text style={styles.drawerTitle}>{copy.languageTitle}</Text>
            <Text style={styles.drawerSubtitle}>{copy.languageSubtitle}</Text>
            <Pressable
              style={({ pressed }) => [
                styles.languageOption,
                language === 'english' && styles.languageOptionActive,
                pressed && styles.languageOptionPressed,
              ]}
              onPress={() => {
                void setLanguage('english');
                setLanguageDrawerOpen(false);
              }}
            >
              <View>
                <Text style={[styles.languageOptionTitle, language === 'english' && styles.languageOptionTitleActive]}>
                  {copy.english}
                </Text>
                <Text style={styles.languageOptionMeta}>English</Text>
              </View>
              {language === 'english' && <MaterialIcons name="check-circle" size={20} color="#16A34A" />}
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.languageOption,
                language === 'hindi' && styles.languageOptionActive,
                pressed && styles.languageOptionPressed,
              ]}
              onPress={() => {
                void setLanguage('hindi');
                setLanguageDrawerOpen(false);
              }}
            >
              <View>
                <Text style={[styles.languageOptionTitle, language === 'hindi' && styles.languageOptionTitleActive]}>
                  {copy.hindi}
                </Text>
                <Text style={styles.languageOptionMeta}>Hindi</Text>
              </View>
              {language === 'hindi' && <MaterialIcons name="check-circle" size={20} color="#16A34A" />}
            </Pressable>
          </Animated.View>
        </View>
      </Modal>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(10, insets.top * 0.35),
            paddingBottom: Math.max(32, insets.bottom + 20),
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.languageBanner}>
          <Text style={styles.languageBannerText}>{copy.uncomfortable}</Text>
          <Pressable
            style={({ pressed }) => [styles.languageBannerButton, pressed && styles.languageBannerButtonPressed]}
            onPress={() => setLanguageDrawerOpen(true)}
            accessibilityLabel={copy.change}
          >
            <MaterialIcons name="translate" size={16} color="#166534" />
            <Text style={styles.languageBannerButtonText}>{copy.change}</Text>
          </Pressable>
        </View>
        {renderStepIndicators()}
        {renderHeroCard()}
        {renderBodyCard()}

        <View style={styles.footer}>
          <Pressable
            style={styles.logoutBtn}
            onPress={() => {
              trackVendorClick('location_permission_logout');
              onLogout();
            }}
            accessibilityLabel={copy.logout}
          >
            <Text style={styles.logoutBtnText}>{copy.logout}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F5FAF5',
  },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 32,
    gap: 16,
  },
  languageBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 4,
  },
  languageBannerText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: '#475569',
    fontWeight: '600',
  },
  languageBannerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: '#ECFDF3',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  languageBannerButtonPressed: {
    opacity: 0.84,
  },
  languageBannerButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#166534',
  },
  drawerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.28)',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  drawerBackdrop: {
    flex: 1,
  },
  drawerPanel: {
    width: 300,
    backgroundColor: '#FFFFFF',
    paddingTop: 54,
    paddingHorizontal: 18,
    paddingBottom: 24,
    borderTopLeftRadius: 28,
    borderBottomLeftRadius: 28,
    gap: 14,
  },
  drawerHandle: {
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#D9E5DB',
    alignSelf: 'center',
    marginBottom: 4,
  },
  drawerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  drawerSubtitle: {
    fontSize: 13,
    lineHeight: 20,
    color: '#64748B',
    marginBottom: 6,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D8E6DA',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  languageOptionActive: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  languageOptionPressed: {
    opacity: 0.88,
  },
  languageOptionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  languageOptionTitleActive: {
    color: '#166534',
  },
  languageOptionMeta: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 3,
  },
  stepperScrollContent: {
    paddingHorizontal: 4,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  stepperItem: {
    width: 104,
    alignItems: 'center',
    gap: 6,
  },
  stepperDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperDotActive: {
    backgroundColor: '#166534',
  },
  stepperDotDone: {
    backgroundColor: '#16A34A',
  },
  stepperDotText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
  },
  stepperDotTextActive: {
    color: '#FFFFFF',
  },
  stepperLabel: {
    fontSize: 10,
    lineHeight: 13,
    textAlign: 'center',
    color: '#64748B',
    fontWeight: '600',
    width: '100%',
  },
  stepperLabelActive: {
    color: '#0F172A',
  },
  heroCard: {
    borderRadius: 28,
    overflow: 'hidden',
    padding: 20,
    borderWidth: 1,
    borderColor: '#D8E6DA',
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#0F5132',
        shadowOpacity: 0.08,
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 12,
      },
      android: { elevation: 3 },
    }),
  },
  heroIntroCard: {
    backgroundColor: '#FDFEFE',
  },
  heroPermissionCard: {
    backgroundColor: '#FBFEFC',
  },
  heroSuccessCard: {
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 26,
  },
  heroGlow: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    top: -90,
    right: -80,
    backgroundColor: 'rgba(134, 239, 172, 0.18)',
  },
  heroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#ECFDF3',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginBottom: 14,
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
  },
  heroArtFrame: {
    borderRadius: 26,
    backgroundColor: '#F2FBF2',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    padding: 18,
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  heroIntroImage: {
    width: '100%',
    height: 220,
  },
  permissionImageWrap: {
    borderRadius: 24,
    overflow: 'hidden',
    minHeight: 208,
    backgroundColor: '#F7FCF7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    position: 'relative',
  },
  permissionImageGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#EFFBF0',
  },
  permissionImageGradientAlt: {
    backgroundColor: '#EEF9F1',
  },
  permissionImage: {
    width: '100%',
    height: 184,
  },
  successHalo: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    top: -30,
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
  },
  successIconWrap: {
    width: 86,
    height: 86,
    borderRadius: 43,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF3',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginBottom: 16,
  },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16A34A',
    letterSpacing: 0.4,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  heroTitleDark: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  heroSubtitleDark: {
    fontSize: 14,
    lineHeight: 21,
    color: '#475569',
  },
  panelCard: {
    borderRadius: 24,
    padding: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D8E6DA',
    gap: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#0F5132',
        shadowOpacity: 0.06,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },
  panelTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  panelSubtitle: {
    fontSize: 13,
    lineHeight: 20,
    color: '#64748B',
  },
  introChecklist: {
    gap: 12,
    borderRadius: 18,
    backgroundColor: '#F7FBF7',
    borderWidth: 1,
    borderColor: '#E2F3E5',
    padding: 14,
  },
  introChecklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  introChecklistIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF3',
    flexShrink: 0,
  },
  introChecklistText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
    color: '#334155',
  },
  introCtaWrap: {
    paddingTop: 2,
  },
  gridList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  gridCard: {
    borderRadius: 18,
    backgroundColor: '#F7FBF7',
    borderWidth: 1,
    borderColor: '#E2F3E5',
    padding: 14,
    gap: 8,
  },
  gridIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF3',
  },
  gridTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  gridBody: {
    fontSize: 12,
    lineHeight: 18,
    color: '#64748B',
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 20,
    backgroundColor: '#F8FCF8',
    borderWidth: 1,
    borderColor: '#E2F3E5',
    padding: 14,
  },
  statusIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2F6',
  },
  statusIconWrapDone: {
    backgroundColor: '#DCFCE7',
  },
  statusCopy: {
    flex: 1,
    gap: 3,
  },
  statusTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  statusBody: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
    color: '#0F172A',
  },
  miniGridRow: {
    flexDirection: 'row',
    gap: 10,
  },
  miniGridCard: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: '#F7FBF7',
    borderWidth: 1,
    borderColor: '#E2F3E5',
    padding: 12,
    gap: 8,
  },
  miniGridText: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
    color: '#334155',
  },
  gridListSingle: {
    gap: 10,
  },
  gridCallout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 16,
    padding: 13,
    backgroundColor: '#F6FBF6',
    borderWidth: 1,
    borderColor: '#DDEFE0',
  },
  gridCalloutText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
    color: '#2F4F3C',
  },
  gridCalloutWarning: {
    color: '#92400E',
  },
  settingsAssistCard: {
    gap: 12,
    borderRadius: 18,
    padding: 14,
    backgroundColor: '#F8FCF8',
    borderWidth: 1,
    borderColor: '#DCEEDD',
  },
  settingsAssistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  settingsAssistIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF3',
    flexShrink: 0,
  },
  settingsAssistTitle: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
    color: '#334155',
  },
  settingsAssistButton: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CDEED4',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  settingsAssistButtonPressed: {
    opacity: 0.86,
  },
  settingsAssistButtonText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    color: '#166534',
  },
  primaryButton: {
    height: 54,
    borderRadius: 18,
    backgroundColor: '#166534',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  primaryButtonDisabled: {
    opacity: 0.72,
  },
  primaryButtonPressed: {
    opacity: 0.86,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  secondaryButton: {
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D8E6DA',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  secondaryButtonPressed: {
    backgroundColor: '#F8FAFC',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  ghostButton: {
    height: 48,
    borderRadius: 16,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#CDEED4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ghostButtonPressed: {
    opacity: 0.84,
  },
  ghostButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#166534',
  },
  readyGridRow: {
    gap: 10,
  },
  readyGridCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 13,
  },
  readyGridCardDone: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  readyGridText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
    color: '#475569',
  },
  readyGridTextDone: {
    color: '#166534',
  },
  footer: {
    paddingTop: 2,
  },
  logoutBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  logoutBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
});
