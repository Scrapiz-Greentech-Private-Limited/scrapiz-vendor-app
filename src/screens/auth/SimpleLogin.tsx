import { MaterialIcons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import {
	ActivityIndicator,
	Alert,
	Dimensions,
	Image,
	ImageBackground,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	StatusBar,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ApiService } from '../../services/api';

const { height } = Dimensions.get('window');
const BRAND_GREEN = '#16a34a';
const LOGO_FRAME_WIDTH = 240;
const LOGO_FRAME_HEIGHT = 148;

interface SimpleLoginProps {
	onNavigateSignup: () => void;
	onNavigateOTP: (phone: string) => void;
}

export default function SimpleLogin({ onNavigateSignup, onNavigateOTP }: SimpleLoginProps) {
	const [phone, setPhone] = useState('');
	const [error, setError] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const scrollViewRef = useRef<ScrollView>(null);

	const handleSendOtp = async () => {
		if (phone.length !== 10) {
			setError('Please enter a valid 10-digit phone number');
			return;
		}

		setError('');
		setIsLoading(true);

		try {
			await ApiService.sendPhoneOtp(`+91${phone}`);
			onNavigateOTP(phone);
		} catch (apiError: any) {
			Alert.alert('OTP Failed', apiError?.message || 'Unable to send OTP right now. Please try again.');
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<View style={{ flex: 1, backgroundColor: '#ffffff' }}>
			<StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
			<SafeAreaView style={styles.safeArea}>
				<KeyboardAvoidingView
					style={styles.container}
					behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
					keyboardVerticalOffset={Platform.OS === 'ios' ? 16 : 24}
				>
					<ScrollView
						ref={scrollViewRef}
						style={styles.scrollView}
						contentContainerStyle={styles.scrollContent}
						keyboardShouldPersistTaps="handled"
						showsVerticalScrollIndicator={false}
						bounces={false}
					>
						{/* Top Half - Background Image */}
						<View style={styles.topHalf}>
							<ImageBackground 
								source={require('../../../assets/images/auth.png')} 
								style={styles.backgroundImage}
								resizeMode="cover"
							>
								{/* Back Button */}
								<TouchableOpacity style={styles.backButton}>
									<MaterialIcons name="arrow-back" size={24} color="#000000" />
								</TouchableOpacity>
							</ImageBackground>
						</View>

						{/* Bottom Half - White Background */}
						<View style={styles.bottomHalf}>
							{/* Logo - Overlapping both sections */}
							<View style={styles.logoContainer}>
								<View style={styles.logoFrame}>
									<Image
										source={require('../../../assets/images/vendorAppLogoFull.png')}
										style={styles.logoBackdrop}
										resizeMode="contain"
									/>
									<Image
										source={require('../../../assets/images/vendorAppLogoFull.png')}
										style={styles.logo}
										resizeMode="contain"
									/>
								</View>
							</View>

							{/* Content Section */}
							<View style={styles.contentSection}>
								<Text style={styles.headline}>Mumbai's trusted Scrap Pickup</Text>
								<Text style={styles.subheadline}>
									Trusted by more than 1k families{'\n'}and industries in Mumbai
								</Text>

								{/* Phone Input */}
								<View style={styles.phoneInputContainer}>
									<Text style={styles.countryCode}>+91</Text>
									<TextInput
										style={styles.phoneInput}
										placeholder="9188883459"
										placeholderTextColor="#9ca3af"
										keyboardType="phone-pad"
										maxLength={10}
										value={phone}
										onChangeText={(text) => {
											setPhone(text.replace(/\D/g, ''));
											setError('');
										}}
										onFocus={() => {
											requestAnimationFrame(() => {
												scrollViewRef.current?.scrollTo({ y: height * 0.18, animated: true });
											});
										}}
										autoFocus
									/>
									{phone.length > 0 && (
										<TouchableOpacity onPress={() => setPhone('')} style={styles.clearButton}>
											<MaterialIcons name="cancel" size={20} color="#9ca3af" />
										</TouchableOpacity>
									)}
								</View>

								{error ? <Text style={styles.errorText}>{error}</Text> : null}

								{/* Continue Button */}
								<TouchableOpacity
									style={[styles.continueButton, isLoading && styles.continueButtonDisabled]}
									onPress={handleSendOtp}
									disabled={isLoading || phone.length !== 10}
								>
									{isLoading ? (
										<ActivityIndicator color="#ffffff" />
									) : (
										<Text style={styles.continueButtonText}>Continue</Text>
									)}
								</TouchableOpacity>
							</View>
						</View>
					</ScrollView>
				</KeyboardAvoidingView>
			</SafeAreaView>
		</View>
	);
}

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
	},
	container: {
		flex: 1,
	},
	scrollView: {
		flex: 1,
	},
	scrollContent: {
		flexGrow: 1,
	},
	topHalf: {
		height: height * 0.39, // Slightly shorter hero so the content sits higher
	},
	backgroundImage: {
		flex: 1,
		width: '100%',
	},
	backButton: {
		width: 40,
		height: 40,
		alignItems: 'center',
		justifyContent: 'center',
		marginLeft: 16,
		marginTop: 16,
	},
	bottomHalf: {
		flex: 1,
		backgroundColor: '#ffffff',
		position: 'relative',
	},
	logoContainer: {
		position: 'absolute',
		top: -74, // Push the logo further into the hero image
		left: 0,
		right: 0,
		alignItems: 'center',
		zIndex: 10,
	},
	logoFrame: {
		width: LOGO_FRAME_WIDTH,
		height: LOGO_FRAME_HEIGHT,
		position: 'relative',
	},
	logo: {
		width: LOGO_FRAME_WIDTH,
		height: LOGO_FRAME_HEIGHT,
	},
	logoBackdrop: {
		position: 'absolute',
		width: LOGO_FRAME_WIDTH,
		height: LOGO_FRAME_HEIGHT,
		tintColor: '#ffffff',
	},
	contentSection: {
		flex: 1,
		paddingHorizontal: 24,
		paddingTop: 84, // Keep headline below the logo backdrop
		alignItems: 'center',
	},
	headline: {
		fontSize: 24,
		fontWeight: '700',
		color: '#000000',
		textAlign: 'center',
		lineHeight: 32,
	},
	subheadline: {
		fontSize: 13,
		color: '#6b7280',
		marginTop: 8,
		marginBottom: 24,
		textAlign: 'center',
		lineHeight: 18,
	},
	phoneInputContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#ffffff',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#e5e7eb',
		paddingHorizontal: 16,
		height: 56,
		marginBottom: 8,
		width: '100%',
	},
	countryCode: {
		fontSize: 16,
		fontWeight: '600',
		color: '#000000',
		marginRight: 8,
	},
	phoneInput: {
		flex: 1,
		fontSize: 16,
		color: '#000000',
		fontWeight: '500',
	},
	clearButton: {
		padding: 4,
	},
	errorText: {
		color: '#dc2626',
		fontSize: 13,
		marginBottom: 8,
		alignSelf: 'flex-start',
		marginLeft: 4,
	},
	continueButton: {
		height: 56,
		borderRadius: 12,
		backgroundColor: BRAND_GREEN,
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 8,
		width: '100%',
	},
	continueButtonDisabled: {
		opacity: 0.6,
	},
	continueButtonText: {
		fontSize: 17,
		fontWeight: '600',
		color: '#ffffff',
	},
});
