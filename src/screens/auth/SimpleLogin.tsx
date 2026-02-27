import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { useAuth } from '../../../hooks/useAuth';

const { height } = Dimensions.get('window');
const isSmallScreen = height < 700;

export default function LoginScreen() {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const { login, loginWithGoogle, isLoading } = useAuth();

  useEffect(() => {
    if (isTyping && error) {
      setError('');
    }
  }, [isTyping, error]);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setIsKeyboardVisible(true);
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setIsKeyboardVisible(false);
    });

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  const handlePhoneChange = (value: string) => {
    // Remove all non-numeric characters including spaces and formatting
    const cleanValue = value.replace(/[^0-9]/g, '');
    setIsTyping(true);
    setSuccess('');
    
    // Only update if length is 10 or less
    if (cleanValue.length <= 10) {
      setPhone(cleanValue);
      // Clear error when user starts typing valid input
      if (error && cleanValue.length > 0) {
        setError('');
      }
    }
  };

  const handleSubmit = async () => {
    setError('');
    setSuccess('');
    setIsTyping(false);
    
    // Validate phone number
    if (!phone || phone.length !== 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }
    
    if (!/^\d{10}$/.test(phone)) {
      setError('Phone number should contain only digits');
      return;
    }
    
    try {
      await login(phone);
      setSuccess('Login successful! Welcome to Scrapiz.');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to login. Please try again.';
      setError(errorMessage);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setSuccess('');
    
    try {
      await loginWithGoogle();
      setSuccess('Login successful! Welcome to Scrapiz.');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign in with Google.';
      setError(errorMessage);
    }
  };



  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        <ScrollView 
          style={styles.scrollContainer} 
          contentContainerStyle={[
            styles.contentContainer,
            isKeyboardVisible && styles.contentContainerKeyboard
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Enhanced Header */}
          {!isKeyboardVisible && (
            <View style={[styles.modernHeader, isSmallScreen && styles.modernHeaderSmall]}>
              <View style={styles.brandContainer}>
                <View style={[styles.modernLogo, isSmallScreen && styles.modernLogoSmall]}>
                  <Text style={[styles.logoText, isSmallScreen && styles.logoTextSmall]}>S</Text>
                  <View style={styles.logoBadge}>
                    <MaterialIcons name="verified" size={10} color="#1B7332" />
                  </View>
                </View>
                <Text style={[styles.brandName, isSmallScreen && styles.brandNameSmall]}>Scrapiz</Text>
                <Text style={[styles.brandTagline, isSmallScreen && styles.brandTaglineSmall]}>Vendor Partner</Text>
              </View>
              

            </View>
          )}

          {/* Simplified Login Form */}
          <View style={[styles.cleanFormContainer, isSmallScreen && styles.cleanFormContainerSmall]}>
            <View style={[styles.cleanFormHeader, isKeyboardVisible && styles.cleanFormHeaderKeyboard]}>
              <Text style={[styles.cleanFormTitle, isSmallScreen && styles.cleanFormTitleSmall]}>
                {isKeyboardVisible ? 'Login' : 'Welcome Back'}
              </Text>
              {!isKeyboardVisible && (
                <Text style={[styles.cleanFormSubtitle, isSmallScreen && styles.cleanFormSubtitleSmall]}>
                  Enter your mobile number to continue
                </Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.cleanInputLabel, isSmallScreen && styles.cleanInputLabelSmall]}>
                Mobile Number
              </Text>
              <View style={[
                styles.cleanPhoneInput,
                error ? styles.cleanPhoneInputError : 
                phone.length === 10 ? styles.cleanPhoneInputValid : styles.cleanPhoneInputDefault
              ]}>
                <Text style={styles.countryPrefix}>+91</Text>
                <TextInput
                  style={styles.phoneField}
                  value={phone}
                  onChangeText={handlePhoneChange}
                  placeholder="Enter 10-digit number"
                  placeholderTextColor="#adb5bd"
                  keyboardType="phone-pad"
                  maxLength={10}
                  autoFocus={false}
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                />
                {phone.length === 10 && !error && (
                  <MaterialIcons name="check" size={20} color="#1B7332" />
                )}
              </View>
              
              {error && (
                <Text style={styles.simpleError}>{error}</Text>
              )}

              {success && (
                <Text style={styles.simpleSuccess}>{success}</Text>
              )}
            </View>

            <TouchableOpacity
              style={[
                styles.modernSubmitButton,
                phone.length === 10 && !isLoading ? styles.modernSubmitButtonActive : styles.modernSubmitButtonDisabled,
                isSmallScreen && styles.modernSubmitButtonSmall
              ]}
              onPress={handleSubmit}
              disabled={phone.length !== 10 || isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color="white" size="small" />
                  <Text style={[styles.modernSubmitText, isSmallScreen && styles.modernSubmitTextSmall]}>
                    Logging in...
                  </Text>
                </View>
              ) : (
                <View style={styles.submitContainer}>
                  <Text style={[styles.modernSubmitText, isSmallScreen && styles.modernSubmitTextSmall]}>
                    Continue
                  </Text>
                  <MaterialIcons name="arrow-forward" size={18} color="white" />
                </View>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google Sign-In Button */}
            <TouchableOpacity
              style={[styles.googleButton, isSmallScreen && styles.googleButtonSmall]}
              onPress={handleGoogleSignIn}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <MaterialIcons name="login" size={20} color="#1B7332" />
              <Text style={[styles.googleButtonText, isSmallScreen && styles.googleButtonTextSmall]}>
                Continue with Google
              </Text>
            </TouchableOpacity>

            {/* Trust Section */}
            {!isKeyboardVisible && (
              <View style={[styles.trustContainer, isSmallScreen && styles.trustContainerSmall]}>
                <View style={styles.trustBadges}>
                  <View style={styles.trustBadge}>
                    <MaterialIcons name="security" size={14} color="#1B7332" />
                    <Text style={styles.trustText}>Secure Login</Text>
                  </View>
                  <View style={styles.trustBadge}>
                    <MaterialIcons name="flash-on" size={14} color="#1B7332" />
                    <Text style={styles.trustText}>Instant OTP</Text>
                  </View>
                </View>
                <Text style={[styles.trustNote, isSmallScreen && styles.trustNoteSmall]}>
                  We&apos;ll send a secure OTP to verify your number
                </Text>
              </View>
            )}
          </View>

          {/* Minimal Footer */}
          {!isKeyboardVisible && (
            <View style={[styles.cleanFooter, isSmallScreen && styles.cleanFooterSmall]}>
              <Text style={[styles.legalText, isSmallScreen && styles.legalTextSmall]}>
                By continuing, you agree to our <Text style={styles.link}>Terms</Text> & <Text style={styles.link}>Privacy Policy</Text>
              </Text>
            </View>
          )}
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    minHeight: height,
  },
  contentContainerKeyboard: {
    justifyContent: 'flex-start',
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  headerSmall: {
    marginBottom: 20,
  },
  logoContainer: {
    width: 70,
    height: 70,
    backgroundColor: '#1B7332',
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#1B7332',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  logoContainerSmall: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 12,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  titleSmall: {
    fontSize: 28,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1B7332',
    marginBottom: 6,
  },
  subtitleSmall: {
    fontSize: 14,
    marginBottom: 4,
  },
  welcomeText: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
  },
  welcomeTextSmall: {
    fontSize: 13,
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(40, 167, 69, 0.1)',
  },
  formContainerSmall: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  formHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  formHeaderKeyboard: {
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  formTitleSmall: {
    fontSize: 20,
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  formSubtitleSmall: {
    fontSize: 12,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  inputLabelSmall: {
    fontSize: 13,
    marginBottom: 6,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 2,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 52, // Better touch target
  },
  phoneInputDefault: {
    borderColor: '#e9ecef',
  },
  phoneInputValid: {
    borderColor: '#1B7332',
    backgroundColor: 'rgba(40, 167, 69, 0.05)',
  },
  phoneInputError: {
    borderColor: '#dc3545',
    backgroundColor: 'rgba(220, 53, 69, 0.05)',
  },
  phoneInputSuccess: {
    borderColor: '#1B7332',
    backgroundColor: 'rgba(40, 167, 69, 0.05)',
  },
  countryCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    paddingRight: 12,
    borderRightWidth: 1,
    borderRightColor: '#e9ecef',
  },
  countryCode: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 6,
  },
  phoneInput: {
    flex: 1,
    fontSize: 17,
    fontWeight: '500',
    color: '#333',
    letterSpacing: 0.5,
  },
  progressContainer: {
    marginTop: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '500',
  },
  progressCount: {
    fontSize: 12,
    color: '#1B7332',
    fontWeight: '600',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e9ecef',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#dc3545',
    fontWeight: '500',
    lineHeight: 18,
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    gap: 8,
  },
  successText: {
    flex: 1,
    fontSize: 13,
    color: '#16a34a',
    fontWeight: '500',
    lineHeight: 18,
  },
  submitButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    minHeight: 52, // Better touch target
  },
  submitButtonSmall: {
    paddingVertical: 14,
    minHeight: 48,
  },
  submitButtonActive: {
    backgroundColor: '#1B7332',
    shadowColor: '#1B7332',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  submitButtonDisabled: {
    backgroundColor: '#adb5bd',
    shadowOpacity: 0,
    elevation: 0,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  submitContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  submitButtonTextSmall: {
    fontSize: 15,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    gap: 10,
  },
  securityNoteSmall: {
    padding: 12,
    gap: 8,
  },
  securityTextContainer: {
    flex: 1,
  },
  securityTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 3,
  },
  securityTitleSmall: {
    fontSize: 12,
  },
  securityDescription: {
    fontSize: 12,
    color: '#3b82f6',
    lineHeight: 16,
  },
  securityDescriptionSmall: {
    fontSize: 11,
    lineHeight: 15,
  },
  footer: {
    alignItems: 'center',
    paddingHorizontal: 8,
    marginTop: 16,
  },
  footerSmall: {
    marginTop: 12,
  },
  footerText: {
    fontSize: 11,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 16,
  },
  footerTextSmall: {
    fontSize: 10,
    marginBottom: 12,
  },
  footerLink: {
    fontWeight: '600',
    color: '#1B7332',
  },
  featuresContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    flexWrap: 'wrap',
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  featureText: {
    fontSize: 11,
    color: '#6c757d',
    fontWeight: '500',
  },

  // Enhanced Header Styles
  modernHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  modernHeaderSmall: {
    marginBottom: 24,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modernLogo: {
    width: 64,
    height: 64,
    backgroundColor: '#1B7332',
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#1B7332',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    position: 'relative',
  },
  modernLogoSmall: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginBottom: 10,
  },
  logoBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 18,
    height: 18,
    backgroundColor: 'white',
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  brandName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  brandNameSmall: {
    fontSize: 28,
  },
  brandTagline: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1B7332',
  },
  brandTaglineSmall: {
    fontSize: 13,
  },
  valueProposition: {
    alignItems: 'center',
  },
  welcomeMessage: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  welcomeMessageSmall: {
    fontSize: 16,
  },
  valueText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
  },
  valueTextSmall: {
    fontSize: 12,
  },

  // Clean Form Styles
  cleanFormContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(27, 115, 50, 0.1)',
  },
  cleanFormContainerSmall: {
    padding: 20,
    marginBottom: 16,
  },
  cleanFormHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  cleanFormHeaderKeyboard: {
    marginBottom: 16,
  },
  cleanFormTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  cleanFormTitleSmall: {
    fontSize: 20,
  },
  cleanFormSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  cleanFormSubtitleSmall: {
    fontSize: 13,
  },

  // Clean Input Styles
  inputGroup: {
    marginBottom: 20,
  },
  cleanInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  cleanInputLabelSmall: {
    fontSize: 13,
  },
  cleanPhoneInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 2,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 52,
  },
  cleanPhoneInputDefault: {
    borderColor: '#e9ecef',
  },
  cleanPhoneInputValid: {
    borderColor: '#1B7332',
    backgroundColor: 'rgba(27, 115, 50, 0.05)',
  },
  cleanPhoneInputError: {
    borderColor: '#dc3545',
    backgroundColor: 'rgba(220, 53, 69, 0.05)',
  },
  countryPrefix: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginRight: 12,
    paddingRight: 12,
    borderRightWidth: 1,
    borderRightColor: '#e9ecef',
  },
  phoneField: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },

  // Simple Validation Styles
  simpleError: {
    fontSize: 13,
    color: '#dc3545',
    marginTop: 8,
    fontWeight: '500',
  },
  simpleSuccess: {
    fontSize: 13,
    color: '#1B7332',
    marginTop: 8,
    fontWeight: '500',
  },

  // Modern Submit Button
  modernSubmitButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    minHeight: 52,
  },
  modernSubmitButtonSmall: {
    paddingVertical: 14,
    minHeight: 48,
  },
  modernSubmitButtonActive: {
    backgroundColor: '#1B7332',
    shadowColor: '#1B7332',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  modernSubmitButtonDisabled: {
    backgroundColor: '#adb5bd',
    shadowOpacity: 0,
    elevation: 0,
  },
  modernSubmitText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modernSubmitTextSmall: {
    fontSize: 15,
  },

  // Trust Section Styles
  trustContainer: {
    backgroundColor: '#f8fffe',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(27, 115, 50, 0.1)',
  },
  trustContainerSmall: {
    padding: 14,
  },
  trustBadges: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 8,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trustText: {
    fontSize: 12,
    color: '#1B7332',
    fontWeight: '600',
  },
  trustNote: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 16,
  },
  trustNoteSmall: {
    fontSize: 11,
  },

  // Clean Footer Styles
  cleanFooter: {
    alignItems: 'center',
    paddingHorizontal: 8,
    marginTop: 16,
  },
  cleanFooterSmall: {
    marginTop: 12,
  },
  legalText: {
    fontSize: 11,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 16,
  },
  legalTextSmall: {
    fontSize: 10,
  },
  link: {
    fontWeight: '600',
    color: '#1B7332',
  },

  // Logo Text Styles
  logoText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  logoTextSmall: {
    fontSize: 24,
  },

  // Divider Styles
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e9ecef',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '600',
  },

  // Google Button Styles
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: '#1B7332',
    gap: 8,
    minHeight: 52,
  },
  googleButtonSmall: {
    paddingVertical: 14,
    minHeight: 48,
  },
  googleButtonText: {
    color: '#1B7332',
    fontSize: 16,
    fontWeight: 'bold',
  },
  googleButtonTextSmall: {
    fontSize: 15,
  },
});