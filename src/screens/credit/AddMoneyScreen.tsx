import React, { useMemo, useState } from 'react';
import {
	ActivityIndicator,
	Alert,
	StatusBar,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ApiService } from '../../services/api';

interface AddMoneyScreenProps {
	onBack: () => void;
	onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

const QUICK_AMOUNTS = [100, 250, 500, 1000, 2000, 5000];
const MIN_AMOUNT = 10;
const MAX_AMOUNT = 50000;

export default function AddMoneyScreen({ onBack, onShowToast }: AddMoneyScreenProps) {
	const [selectedAmount, setSelectedAmount] = useState<number>(500);
	const [customAmount, setCustomAmount] = useState<string>('');
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [lastSuccessAmount, setLastSuccessAmount] = useState<number | null>(null);

	const payableAmount = useMemo(() => {
		if (customAmount) {
			return Number(customAmount || 0);
		}
		return selectedAmount;
	}, [customAmount, selectedAmount]);

	const startTopup = async () => {
		if (payableAmount < MIN_AMOUNT) {
			Alert.alert('Invalid amount', `Minimum topup is ₹${MIN_AMOUNT}.`);
			return;
		}

		if (payableAmount > MAX_AMOUNT) {
			Alert.alert('Invalid amount', `Maximum topup is ₹${MAX_AMOUNT.toLocaleString('en-IN')}.`);
			return;
		}

		setIsSubmitting(true);
		try {
			const orderData = await ApiService.createWalletRazorpayOrder(payableAmount);
			const RazorpayCheckout = (await import('react-native-razorpay')).default;

			const checkoutOptions = {
				description: `Wallet Add Money ₹${payableAmount}`,
				image: 'https://scrapiz.in/logo.png',
				currency: orderData.currency,
				key: orderData.key_id,
				amount: String(orderData.amount),
				order_id: orderData.razorpay_order_id,
				name: 'Scrapiz Vendor Wallet',
				prefill: {
					name: orderData.prefill?.name || 'Vendor',
				},
				method: {
					card: true,
					upi: true,
					netbanking: true,
					wallet: true,
				},
				theme: {
					color: '#1B8A46',
				},
			};

			const rzpResult = await RazorpayCheckout.open(checkoutOptions);

			const verified = await ApiService.verifyWalletRazorpayPayment({
				razorpay_order_id: rzpResult.razorpay_order_id,
				razorpay_payment_id: rzpResult.razorpay_payment_id,
				razorpay_signature: rzpResult.razorpay_signature,
			});

			setLastSuccessAmount(verified.credited || payableAmount);
			onShowToast('Wallet recharged successfully.', 'success');
		} catch (error: any) {
			if (error?.code === 0) {
				onShowToast('Payment was cancelled.', 'info');
			} else {
				onShowToast(error?.description || error?.message || 'Payment failed. Please try again.', 'error');
			}
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<SafeAreaView style={styles.safeArea}>
			<StatusBar barStyle="dark-content" backgroundColor="#ECF8EF" />

			<View style={styles.header}>
				<TouchableOpacity onPress={onBack} style={styles.headerButton}>
					<MaterialIcons name="arrow-back" size={22} color="#0F3D22" />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>Add Wallet Balance</Text>
				<View style={styles.headerButton} />
			</View>

			<View style={styles.content}>
				<View style={styles.heroCard}>
					<View style={styles.heroOrbLarge} />
					<View style={styles.heroOrbSmall} />
					<Text style={styles.heroCaption}>Wallet Topup</Text>
					<Text style={styles.heroAmount}>₹{payableAmount.toLocaleString('en-IN')}</Text>
					<Text style={styles.heroSubtext}>INR only • Secure Razorpay checkout</Text>
					<Text style={styles.heroHint}>Your wallet updates instantly after payment verification.</Text>
					{lastSuccessAmount ? (
						<View style={styles.successPill}>
							<MaterialIcons name="check-circle" size={16} color="#0A6E35" />
							<Text style={styles.successPillText}>Last recharge: ₹{lastSuccessAmount.toLocaleString('en-IN')}</Text>
						</View>
					) : null}
				</View>

				<View style={styles.panel}>
					<Text style={styles.panelTitle}>Quick amounts</Text>
					<View style={styles.chipsWrap}>
						{QUICK_AMOUNTS.map((amount) => {
							const active = !customAmount && selectedAmount === amount;
							return (
								<TouchableOpacity
									key={amount}
									style={[styles.chip, active && styles.chipActive]}
									onPress={() => {
										setCustomAmount('');
										setSelectedAmount(amount);
									}}
								>
									<Text style={[styles.chipText, active && styles.chipTextActive]}>₹{amount}</Text>
								</TouchableOpacity>
							);
						})}
					</View>

					<Text style={styles.inputLabel}>Enter custom amount</Text>
					<TextInput
						style={styles.input}
						value={customAmount}
						onChangeText={(text) => {
							const sanitized = text.replace(/[^0-9]/g, '');
							setCustomAmount(sanitized);
						}}
						keyboardType="number-pad"
						placeholder="Amount in INR"
						placeholderTextColor="#7FA08B"
					/>
					<Text style={styles.inputHelp}>Min ₹{MIN_AMOUNT} • Max ₹{MAX_AMOUNT.toLocaleString('en-IN')}</Text>
				</View>
			</View>

			<View style={styles.footer}>
				<TouchableOpacity
					style={[styles.payButton, isSubmitting && styles.payButtonDisabled]}
					onPress={startTopup}
					disabled={isSubmitting}
				>
					{isSubmitting ? (
						<ActivityIndicator color="#FFFFFF" />
					) : (
						<Text style={styles.payButtonText}>Proceed to Pay ₹{payableAmount.toLocaleString('en-IN')}</Text>
					)}
				</TouchableOpacity>
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: '#ECF8EF',
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 18,
		paddingVertical: 10,
	},
	headerButton: {
		width: 38,
		height: 38,
		borderRadius: 19,
		backgroundColor: '#FFFFFF',
		alignItems: 'center',
		justifyContent: 'center',
	},
	headerTitle: {
		fontSize: 18,
		fontWeight: '800',
		color: '#0F3D22',
	},
	content: {
		flex: 1,
		paddingHorizontal: 18,
		paddingTop: 8,
		gap: 16,
	},
	heroCard: {
		backgroundColor: '#0F5132',
		borderRadius: 28,
		padding: 24,
		overflow: 'hidden',
	},
	heroOrbLarge: {
		position: 'absolute',
		width: 180,
		height: 180,
		borderRadius: 90,
		backgroundColor: 'rgba(255,255,255,0.12)',
		right: -40,
		top: -20,
	},
	heroOrbSmall: {
		position: 'absolute',
		width: 90,
		height: 90,
		borderRadius: 45,
		backgroundColor: 'rgba(255,255,255,0.14)',
		left: -24,
		bottom: -20,
	},
	heroCaption: {
		color: 'rgba(255,255,255,0.78)',
		fontWeight: '700',
		fontSize: 13,
	},
	heroAmount: {
		marginTop: 6,
		color: '#FFFFFF',
		fontSize: 42,
		fontWeight: '900',
	},
	heroSubtext: {
		marginTop: 4,
		color: 'rgba(255,255,255,0.86)',
		fontSize: 13,
		fontWeight: '600',
	},
	heroHint: {
		marginTop: 6,
		color: 'rgba(255,255,255,0.72)',
		fontSize: 12,
		fontWeight: '600',
	},
	successPill: {
		marginTop: 14,
		alignSelf: 'flex-start',
		backgroundColor: '#D8F6E3',
		borderRadius: 999,
		paddingHorizontal: 12,
		paddingVertical: 6,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	successPillText: {
		color: '#0A6E35',
		fontWeight: '700',
		fontSize: 12,
	},
	panel: {
		backgroundColor: '#FFFFFF',
		borderRadius: 22,
		padding: 18,
	},
	panelTitle: {
		color: '#163D25',
		fontSize: 16,
		fontWeight: '800',
		marginBottom: 12,
	},
	chipsWrap: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 10,
	},
	chip: {
		minWidth: '30%',
		borderRadius: 14,
		borderWidth: 1,
		borderColor: '#D5E8DB',
		backgroundColor: '#F3FAF5',
		paddingVertical: 10,
		paddingHorizontal: 14,
		alignItems: 'center',
	},
	chipActive: {
		backgroundColor: '#15763B',
		borderColor: '#15763B',
	},
	chipText: {
		color: '#245037',
		fontSize: 14,
		fontWeight: '700',
	},
	chipTextActive: {
		color: '#FFFFFF',
	},
	inputLabel: {
		marginTop: 16,
		color: '#163D25',
		fontSize: 13,
		fontWeight: '700',
		marginBottom: 6,
	},
	input: {
		borderWidth: 1,
		borderColor: '#CFE4D5',
		borderRadius: 14,
		paddingHorizontal: 14,
		paddingVertical: 12,
		color: '#163D25',
		fontSize: 16,
		fontWeight: '700',
		backgroundColor: '#F8FCF9',
	},
	inputHelp: {
		marginTop: 8,
		color: '#6E8A79',
		fontSize: 12,
		fontWeight: '600',
	},
	footer: {
		paddingHorizontal: 18,
		paddingBottom: 20,
		paddingTop: 10,
		backgroundColor: '#ECF8EF',
	},
	payButton: {
		height: 54,
		borderRadius: 16,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#15763B',
	},
	payButtonDisabled: {
		opacity: 0.7,
	},
	payButtonText: {
		color: '#FFFFFF',
		fontSize: 16,
		fontWeight: '800',
	},
});
