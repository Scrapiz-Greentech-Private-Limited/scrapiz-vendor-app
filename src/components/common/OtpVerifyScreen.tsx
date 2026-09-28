import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DESIGN_TOKENS } from '../../theme/tokens';

export interface OtpVerifyScreenProps {
  title: string;
  subtitle: string;
  digitCount?: number; // default 6
  onVerify: (otp: string) => Promise<void>;
  onResend?: () => Promise<void>;
  resendCooldownSeconds?: number; // default 30
  isLoading?: boolean;
  themeColor?: string; // default #16A34A
  showBackButton?: boolean;
  onBack?: () => void;
  maxAttempts?: number; // default 3
}

export const OtpVerifyScreen: React.FC<OtpVerifyScreenProps> = ({
  title,
  subtitle,
  digitCount = 6,
  onVerify,
  onResend,
  resendCooldownSeconds = 30,
  isLoading = false,
  themeColor = DESIGN_TOKENS.GREEN_MID,
  showBackButton = true,
  onBack,
  maxAttempts = 3,
}) => {
  const [digits, setDigits] = useState<string[]>(Array(digitCount).fill(''));
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const [countdown, setCountdown] = useState<number>(resendCooldownSeconds);
  const [isResending, setIsResending] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number>(maxAttempts);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const inputRefs = useRef<(TextInput | null)[]>([]);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const successScaleAnim = useRef(new Animated.Value(0)).current;

  const otpValue = useMemo(() => digits.join(''), [digits]);
  const isComplete = otpValue.length === digitCount;
  const isMaxAttemptsExceeded = attemptsRemaining <= 0;

  // Auto focus first input on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // Resend Countdown Timer
  useEffect(() => {
    if (countdown <= 0) return undefined;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // Shake animation on error
  const triggerShake = () => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 4, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleChangeText = (text: string, index: number) => {
    if (isMaxAttemptsExceeded || submitting || isLoading) return;

    setErrorMessage(null);
    setIsExpired(false);

    // Handle full paste
    if (text.length > 1) {
      const sanitized = text.replace(/[^0-9]/g, '').slice(0, digitCount);
      const newDigits = Array(digitCount).fill('');
      sanitized.split('').forEach((char, i) => {
        newDigits[i] = char;
      });
      setDigits(newDigits);
      const nextIdx = Math.min(sanitized.length, digitCount - 1);
      inputRefs.current[nextIdx]?.focus();
      return;
    }

    const sanitizedChar = text.replace(/[^0-9]/g, '');
    const newDigits = [...digits];
    newDigits[index] = sanitizedChar;
    setDigits(newDigits);

    if (sanitizedChar && index < digitCount - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        setDigits(newDigits);
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handleVerify = async () => {
    if (!isComplete || submitting || isLoading || isMaxAttemptsExceeded) return;

    setSubmitting(true);
    setErrorMessage(null);
    try {
      await onVerify(otpValue);
      // Play green checkmark scale animation (0 -> 1 in 300ms ease-out)
      setIsSuccess(true);
      Animated.timing(successScaleAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } catch (err: any) {
      const rawMsg = String(err?.message || '').toLowerCase();
      triggerShake();

      if (rawMsg.includes('expired')) {
        setIsExpired(true);
        setErrorMessage('OTP has expired. Please resend a fresh code.');
      } else {
        const nextAttempts = attemptsRemaining - 1;
        setAttemptsRemaining(nextAttempts);
        if (nextAttempts <= 0) {
          setErrorMessage('Too many attempts. Contact support.');
        } else {
          setErrorMessage(`Incorrect OTP. ${nextAttempts} attempt${nextAttempts === 1 ? '' : 's'} remaining`);
        }
      }

      // Auto clear boxes after 800ms
      setTimeout(() => {
        setDigits(Array(digitCount).fill(''));
        if (attemptsRemaining > 1) {
          inputRefs.current[0]?.focus();
        }
      }, 800);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || isResending || !onResend || isMaxAttemptsExceeded) return;

    setIsResending(true);
    setErrorMessage(null);
    setIsExpired(false);
    try {
      await onResend();
      setCountdown(resendCooldownSeconds);
      setDigits(Array(digitCount).fill(''));
      setAttemptsRemaining(maxAttempts);
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to resend OTP. Try again.');
    } finally {
      setIsResending(false);
    }
  };

  const formattedCountdown = useMemo(() => {
    const mins = Math.floor(countdown / 60);
    const secs = countdown % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }, [countdown]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardWrap}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header Bar */}
        <View style={styles.navBar}>
          {showBackButton && onBack ? (
            <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={24} color={DESIGN_TOKENS.TEXT_PRIMARY} />
            </TouchableOpacity>
          ) : (
            <View style={styles.backButtonPlaceholder} />
          )}
        </View>

        <View style={styles.contentWrap}>
          {/* Title & Subtitle */}
          <View style={styles.headerSection}>
            <View style={styles.iconCircle}>
              <MaterialIcons name="lock-outline" size={28} color={themeColor} />
            </View>
            <Text style={styles.title} numberOfLines={2} ellipsizeMode="tail">
              {title}
            </Text>
            <Text style={styles.subtitle} numberOfLines={3} ellipsizeMode="tail">
              {subtitle}
            </Text>
          </View>

          {/* Expired Warning Banner */}
          {isExpired && (
            <View style={styles.warningCard}>
              <MaterialIcons name="warning" size={20} color={DESIGN_TOKENS.WARNING} />
              <View style={styles.warningTextCol}>
                <Text style={styles.warningTitle} numberOfLines={1}>
                  OTP has expired
                </Text>
                <Text style={styles.warningBody} numberOfLines={2}>
                  Please resend a new OTP to continue.
                </Text>
              </View>
            </View>
          )}

          {/* Max Attempts Red Error Banner */}
          {isMaxAttemptsExceeded && (
            <View style={styles.errorBannerCard}>
              <MaterialIcons name="error-outline" size={20} color={DESIGN_TOKENS.ERROR} />
              <View style={styles.warningTextCol}>
                <Text style={styles.errorBannerTitle} numberOfLines={1}>
                  Too many attempts
                </Text>
                <Text style={styles.errorBannerBody} numberOfLines={2}>
                  Maximum attempts reached. Please contact Scrapiz support.
                </Text>
              </View>
            </View>
          )}

          {/* 6 Individual Boxes with Shake Animation */}
          <Animated.View
            style={[
              styles.boxRow,
              { transform: [{ translateX: shakeAnim }] },
            ]}
          >
            {Array.from({ length: digitCount }).map((_, index) => {
              const isFocused = focusedIndex === index;
              const hasError = Boolean(errorMessage);

              return (
                <Pressable
                  key={index}
                  onPress={() => inputRefs.current[index]?.focus()}
                  style={[
                    styles.otpBox,
                    isFocused && styles.otpBoxFocused,
                    hasError && styles.otpBoxError,
                    (isLoading || submitting || isMaxAttemptsExceeded) && styles.otpBoxDisabled,
                  ]}
                >
                  <TextInput
                    ref={(ref) => {
                      inputRefs.current[index] = ref;
                    }}
                    value={digits[index]}
                    onChangeText={(text) => handleChangeText(text, index)}
                    onKeyPress={(e) => handleKeyPress(e, index)}
                    onFocus={() => setFocusedIndex(index)}
                    onBlur={() => setFocusedIndex(-1)}
                    keyboardType="number-pad"
                    maxLength={1}
                    selectTextOnFocus
                    editable={!isLoading && !submitting && !isMaxAttemptsExceeded && !isSuccess}
                    style={styles.otpInput}
                  />
                </Pressable>
              );
            })}
          </Animated.View>

          {/* Error text below boxes */}
          {errorMessage && !isMaxAttemptsExceeded && !isExpired ? (
            <Text style={styles.errorText} numberOfLines={2} ellipsizeMode="tail">
              {errorMessage}
            </Text>
          ) : null}

          {/* Resend Timer & CTA */}
          <View style={styles.resendSection}>
            {countdown > 0 ? (
              <Text style={styles.resendTimerText} numberOfLines={1} ellipsizeMode="tail">
                Resend OTP in <Text style={styles.timerHighlight}>{formattedCountdown}</Text>
              </Text>
            ) : (
              <TouchableOpacity
                onPress={() => void handleResend()}
                disabled={isResending || isMaxAttemptsExceeded}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.resendBtnText,
                    { color: isMaxAttemptsExceeded ? DESIGN_TOKENS.TEXT_MUTED : themeColor },
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {isResending ? 'Sending...' : 'Resend OTP'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Sticky Bottom CTA Button */}
        <View style={styles.bottomCtaSection}>
          <TouchableOpacity
            style={[
              styles.primaryBtn,
              { backgroundColor: themeColor },
              (!isComplete || submitting || isLoading || isMaxAttemptsExceeded) && styles.primaryBtnDisabled,
            ]}
            onPress={() => void handleVerify()}
            disabled={!isComplete || submitting || isLoading || isMaxAttemptsExceeded || isSuccess}
            activeOpacity={0.85}
          >
            {submitting || isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.primaryBtnText} numberOfLines={1} ellipsizeMode="tail">
                Verify OTP
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Success Scale Overlay Animation */}
        {isSuccess && (
          <View style={styles.successOverlay}>
            <Animated.View
              style={[
                styles.successCircle,
                { transform: [{ scale: successScaleAnim }] },
              ]}
            >
              <MaterialIcons name="check" size={54} color="#FFFFFF" />
            </Animated.View>
            <Text style={styles.successText}>Arrival Verified</Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DESIGN_TOKENS.BG,
  },
  keyboardWrap: {
    flex: 1,
    justifyContent: 'space-between',
  },
  navBar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonPlaceholder: {
    width: 44,
    height: 44,
  },
  contentWrap: {
    flex: 1,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: DESIGN_TOKENS.GREEN_BG,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: DESIGN_TOKENS.TEXT_PRIMARY,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: DESIGN_TOKENS.TEXT_SECONDARY,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  warningCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 16,
    padding: 12,
    marginBottom: 18,
  },
  warningTextCol: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400E',
  },
  warningBody: {
    fontSize: 12,
    color: '#B45309',
    marginTop: 2,
  },
  errorBannerCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    borderRadius: 16,
    padding: 12,
    marginBottom: 18,
  },
  errorBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#991B1B',
  },
  errorBannerBody: {
    fontSize: 12,
    color: '#B91C1C',
    marginTop: 2,
  },
  boxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginVertical: 12,
  },
  otpBox: {
    width: 48,
    height: 60,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: DESIGN_TOKENS.BORDER,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBoxFocused: {
    borderColor: DESIGN_TOKENS.GREEN_MID,
    backgroundColor: '#F0FDF4',
  },
  otpBoxError: {
    borderColor: DESIGN_TOKENS.ERROR,
  },
  otpBoxDisabled: {
    opacity: 0.6,
  },
  otpInput: {
    width: '100%',
    height: '100%',
    textAlign: 'center',
    fontSize: 28,
    fontWeight: '800',
    color: DESIGN_TOKENS.TEXT_PRIMARY,
  },
  errorText: {
    color: DESIGN_TOKENS.ERROR,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 10,
  },
  resendSection: {
    marginTop: 20,
    alignItems: 'center',
  },
  resendTimerText: {
    fontSize: 14,
    color: DESIGN_TOKENS.TEXT_SECONDARY,
    fontWeight: '600',
  },
  timerHighlight: {
    color: DESIGN_TOKENS.GREEN_DARK,
    fontWeight: '800',
  },
  resendBtnText: {
    fontSize: 14,
    fontWeight: '800',
  },
  bottomCtaSection: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: DESIGN_TOKENS.BORDER,
  },
  primaryBtn: {
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnDisabled: {
    opacity: 0.5,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99,
  },
  successCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: DESIGN_TOKENS.GREEN_MID,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: DESIGN_TOKENS.GREEN_MID,
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  successText: {
    marginTop: 18,
    fontSize: 20,
    fontWeight: '900',
    color: DESIGN_TOKENS.GREEN_DARK,
  },
});

export default OtpVerifyScreen;
