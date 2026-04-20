import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    useWindowDimensions,
    KeyboardAvoidingView,
    Platform,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ApiService, VerifyOtpResponse } from '../../services/api';

interface OTPVerifyProps {
    phone: string;
    onBack: () => void;
    onSuccess: (response: VerifyOtpResponse & { phone_number?: string }) => void;
}

const BRAND_GREEN = '#16a34a';
const EMPTY_BOX_BG = '#e8f5e9';
const FILLED_BOX_BG = '#16a34a';

const formatPhoneNumber = (phone: string) => {
    if (phone.length !== 10) {
        return `+91 ${phone}`;
    }

    return `+91 ${phone.slice(0, 5)} ${phone.slice(5)}`;
};

export default function OTPVerify({ phone, onBack, onSuccess }: OTPVerifyProps) {
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [countdown, setCountdown] = useState(30);
    const inputRef = useRef<TextInput>(null);
    const { width } = useWindowDimensions();

    const maskedPhone = useMemo(() => formatPhoneNumber(phone || '98XXXXXX'), [phone]);
    const otpDigits = useMemo(
        () => Array.from({ length: 6 }, (_, index) => otp[index] ?? ''),
        [otp]
    );
    const otpRowGap = width < 380 ? 8 : 10;
    const otpCircleSize = Math.min(56, Math.max(46, Math.floor((width - 40 - otpRowGap * 5) / 6)));

    useEffect(() => {
        const focusTimer = setTimeout(() => inputRef.current?.focus(), 250);
        return () => clearTimeout(focusTimer);
    }, []);

    useEffect(() => {
        if (countdown <= 0) {
            return undefined;
        }

        const timer = setTimeout(() => {
            setCountdown((current) => current - 1);
        }, 1000);

        return () => clearTimeout(timer);
    }, [countdown]);

    const handleVerify = async () => {
        if (otp.length < 6) {
            return;
        }

        setLoading(true);
        try {
            const response = await ApiService.verifyPhoneOtp(`+91${phone}`, otp);
            onSuccess({ ...response, phone_number: `+91${phone}` });
        } catch (error: any) {
            Alert.alert('Verification Failed', error?.message || 'Invalid OTP or request expired. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (countdown > 0) {
            return;
        }

        setIsResending(true);
        try {
            await ApiService.sendPhoneOtp(`+91${phone}`);
            setCountdown(30);
            setOtp('');
            Alert.alert('OTP Sent', 'A new OTP has been sent to your phone number.');
        } catch (error: any) {
            Alert.alert('Resend Failed', error?.message || 'Unable to resend OTP right now.');
        } finally {
            setIsResending(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />
            <KeyboardAvoidingView
                style={styles.keyboardView}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <View style={styles.content}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity
                            onPress={onBack}
                            style={styles.backButton}
                        >
                            <MaterialIcons name="arrow-back" size={24} color="#000000" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.helpButton}>
                            <MaterialIcons name="help-outline" size={24} color="#000000" />
                        </TouchableOpacity>
                    </View>

                    {/* Title Section */}
                    <View style={styles.titleSection}>
                        <Text style={styles.title}>Verify your</Text>
                        <Text style={styles.title}>Phone number</Text>
                        <Text style={styles.subtitle}>Enter your OTP code here</Text>
                    </View>

                    {/* OTP Input - Circular Boxes */}
                    <View style={styles.otpContainer}>
                        <View style={[styles.otpBoxesRow, { gap: otpRowGap }]}>
                            {otpDigits.map((digit, index) => {
                                const isFilled = digit !== '';
                                return (
                                    <View
                                        key={`otp-box-${index}`}
                                        style={[
                                            styles.otpCircle,
                                            {
                                                width: otpCircleSize,
                                                height: otpCircleSize,
                                                borderRadius: otpCircleSize / 2,
                                            },
                                            isFilled && styles.otpCircleFilled,
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.otpDigit,
                                                { fontSize: otpCircleSize * 0.46 },
                                                isFilled && styles.otpDigitFilled,
                                            ]}
                                        >
                                            {digit || ''}
                                        </Text>
                                    </View>
                                );
                            })}
                        </View>

                        {/* Hidden TextInput for paste support */}
                        <TextInput
                            ref={inputRef}
                            value={otp}
                            onChangeText={(value) => {
                                const cleaned = value.replace(/\D/g, '').slice(0, 6);
                                setOtp(cleaned);
                                if (cleaned.length === 6) {
                                    handleVerify();
                                }
                            }}
                            keyboardType="number-pad"
                            maxLength={6}
                            autoFocus
                            textContentType="oneTimeCode"
                            autoComplete="sms-otp"
                            importantForAutofill="yes"
                            style={styles.hiddenInput}
                            caretHidden
                            contextMenuHidden={false}
                        />
                    </View>

                    <TouchableOpacity
                        style={[
                            styles.verifyButton,
                            (otp.length < 6 || loading) && styles.verifyButtonDisabled,
                        ]}
                        onPress={handleVerify}
                        disabled={otp.length < 6 || loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#ffffff" />
                        ) : (
                            <Text style={styles.verifyButtonText}>Continue</Text>
                        )}
                    </TouchableOpacity>

                    {/* Resend Section */}
                    <View style={styles.resendSection}>
                        <Text style={styles.resendQuestion}>Didn't you receive any code?</Text>
                        <TouchableOpacity 
                            disabled={countdown > 0 || isResending} 
                            onPress={handleResend}
                        >
                            <Text
                                style={[
                                    styles.resendButton,
                                    (countdown > 0 || isResending) && styles.resendButtonDisabled,
                                ]}
                            >
                                {isResending 
                                    ? 'SENDING...' 
                                    : countdown > 0 
                                        ? `RESEND IN ${String(countdown).padStart(2, '0')}S`
                                        : 'RESEND NEW CODE'
                                }
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    keyboardView: {
        flex: 1,
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 40,
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    helpButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    titleSection: {
        alignItems: 'center',
        marginBottom: 60,
    },
    title: {
        fontSize: 32,
        fontWeight: '700',
        color: '#000000',
        textAlign: 'center',
        lineHeight: 40,
    },
    subtitle: {
        fontSize: 16,
        color: '#9ca3af',
        marginTop: 12,
        textAlign: 'center',
    },
    otpContainer: {
        position: 'relative',
        marginBottom: 24,
        alignItems: 'center',
    },
    otpBoxesRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        width: '100%',
        alignSelf: 'stretch',
    },
    otpCircle: {
        backgroundColor: EMPTY_BOX_BG,
        alignItems: 'center',
        justifyContent: 'center',
    },
    otpCircleFilled: {
        backgroundColor: FILLED_BOX_BG,
    },
    otpDigit: {
        fontWeight: '700',
        color: '#16a34a',
    },
    otpDigitFilled: {
        color: '#ffffff',
    },
    hiddenInput: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        opacity: 0.01,
        fontSize: 1,
    },
    verifyButton: {
        height: 56,
        borderRadius: 14,
        backgroundColor: BRAND_GREEN,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 40,
    },
    verifyButtonDisabled: {
        opacity: 0.55,
    },
    verifyButtonText: {
        fontSize: 17,
        fontWeight: '700',
        color: '#ffffff',
    },
    resendSection: {
        alignItems: 'center',
    },
    resendQuestion: {
        fontSize: 15,
        color: '#9ca3af',
        marginBottom: 12,
    },
    resendButton: {
        fontSize: 15,
        fontWeight: '700',
        color: BRAND_GREEN,
        letterSpacing: 0.5,
    },
    resendButtonDisabled: {
        color: '#9ca3af',
    },
});
