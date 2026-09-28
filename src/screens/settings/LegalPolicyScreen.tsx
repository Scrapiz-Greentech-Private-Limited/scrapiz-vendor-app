import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type PolicyKind = 'privacy' | 'terms' | 'content';
interface Props { kind: PolicyKind; onBack: () => void; }

const CONTENT: Record<PolicyKind, { title: string; intro: string; sections: Array<[string, string]> }> = {
  privacy: { title: 'Privacy Policy', intro: 'We use your information to operate safe, reliable Scrapiz pickups.', sections: [['Information we use', 'Your profile, location, booking, payment and verification data help us match jobs, protect accounts and support transactions.'], ['How we protect it', 'Access is restricted to the people and services that need it for pickup operations, safety, support and legal compliance.'], ['Your choices', 'You can request account information or deletion through support, subject to records we must retain for safety and finance.']] },
  terms: { title: 'Terms & Conditions', intro: 'These terms explain the responsibilities of every Scrapiz vendor partner.', sections: [['Using the app', 'Keep your profile, vehicle, location and payment details accurate. Accept only bookings you can complete safely.'], ['Pickup standards', 'Follow customer privacy, face verification, OTP, weighing and payment confirmation steps shown in the app.'], ['Account safety', 'Do not share login credentials or falsify pickup, payment or verification records. Serious violations may restrict access.']] },
  content: { title: 'Content Policy', intro: 'Help keep Scrapiz useful, respectful and safe for customers and partners.', sections: [['Allowed content', 'Send accurate booking notes, useful support messages and respectful feedback related to Scrapiz operations.'], ['Not allowed', 'Do not upload abusive, threatening, misleading, private or unlawful content, or content unrelated to the booking.'], ['Review process', 'We may review reported content and remove it or restrict accounts when it creates safety, privacy or trust risks.']] },
};

export default function LegalPolicyScreen({ kind, onBack }: Props) {
  const content = CONTENT[kind];
  return <View style={styles.screen}><View style={styles.header}><TouchableOpacity onPress={onBack} style={styles.back}><Ionicons name="arrow-back" size={23} color="#FFFFFF" /></TouchableOpacity><Text style={styles.title}>{content.title}</Text><View style={styles.back} /></View><ScrollView contentContainerStyle={styles.content}><Text style={styles.intro}>{content.intro}</Text>{content.sections.map(([heading, body]) => <View key={heading} style={styles.card}><Text style={styles.heading}>{heading}</Text><Text style={styles.body}>{body}</Text></View>)}<Text style={styles.updated}>Last updated: September 2026</Text></ScrollView></View>;
}

const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: '#F6FAF7' }, header: { backgroundColor: '#1B7332', paddingTop: 46, paddingBottom: 16, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }, title: { color: '#FFFFFF', fontSize: 19, fontWeight: '900' }, content: { padding: 18, paddingBottom: 80 }, intro: { color: '#24402D', fontSize: 18, lineHeight: 26, fontWeight: '800', marginBottom: 16 }, card: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 17, marginBottom: 12, borderWidth: 1, borderColor: '#E0EAE2' }, heading: { color: '#1B7332', fontSize: 16, fontWeight: '900', marginBottom: 8 }, body: { color: '#526358', fontSize: 14, lineHeight: 22, fontWeight: '500' }, updated: { color: '#84948A', fontSize: 12, textAlign: 'center', marginTop: 12 }, });
