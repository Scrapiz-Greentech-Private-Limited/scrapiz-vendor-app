import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { ApiService, FeedbackQuestion } from '../../services/api';

interface Props { onBack: () => void; onShowToast: (message: string, type: 'success' | 'error' | 'info') => void; }

const OPTIONS = ['Very good app', 'Payment not working', 'Not getting leads', 'Face verification not working'];
const PERSON_1 = require('../../../assets/images/avatars/person1.png');

export default function SupportFeedbackScreen({ onBack, onShowToast }: Props) {
  const [questions, setQuestions] = useState<FeedbackQuestion[]>([]);
  const [selectedOption, setSelectedOption] = useState(OPTIONS[0]);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { void ApiService.getFeedbackQuestions('support').then(setQuestions).catch(() => undefined); }, []);

  const submit = async () => {
    const choiceQuestion = questions.find((question) => question.question_type === 'multiple_choice');
    const textQuestion = questions.find((question) => question.question_type === 'text');
    if (!choiceQuestion && !textQuestion) {
      onShowToast('Support feedback is temporarily unavailable.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await ApiService.submitFeedback({
        context: 'support',
        responses: [
          ...(choiceQuestion ? [{ question_id: choiceQuestion.id, choice_value: selectedOption }] : []),
          ...(textQuestion && message.trim() ? [{ question_id: textQuestion.id, text_value: message.trim() }] : []),
        ],
      });
      setMessage('');
      onShowToast('Thanks — your feedback has been sent to support.', 'success');
    } catch (error: any) {
      onShowToast(error?.message || 'Unable to send feedback.', 'error');
    } finally { setSubmitting(false); }
  };

  return <View style={styles.screen}>
    <View style={styles.header}><TouchableOpacity style={styles.back} onPress={onBack}><Ionicons name="arrow-back" size={23} color="#FFFFFF" /></TouchableOpacity><Text style={styles.headerTitle}>Give us feedback</Text><View style={styles.back} /></View>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}><Image source={PERSON_1} style={styles.personOne} /><View style={styles.heroCopy}><Text style={styles.eyebrow}>SCRAPIZ SUPPORT</Text><Text style={styles.title}>We are listening.</Text><Text style={styles.subtitle}>Tell us what worked well or where you need help. Your message goes directly to our support team.</Text></View></View>
      <View style={styles.card}><Text style={styles.sectionTitle}>What best describes your experience?</Text><View style={styles.options}>{OPTIONS.map((option) => <TouchableOpacity key={option} style={[styles.option, selectedOption === option && styles.optionActive]} onPress={() => setSelectedOption(option)}><View style={[styles.radio, selectedOption === option && styles.radioActive]}>{selectedOption === option ? <MaterialIcons name="check" size={15} color="#FFFFFF" /> : null}</View><Text style={[styles.optionText, selectedOption === option && styles.optionTextActive]}>{option}</Text></TouchableOpacity>)}</View><Text style={styles.sectionTitle}>Add more details</Text><TextInput value={message} onChangeText={setMessage} multiline textAlignVertical="top" placeholder="Write to the Scrapiz support team..." placeholderTextColor="#94A3B8" style={styles.input} /><TouchableOpacity style={styles.submit} onPress={() => void submit()} disabled={submitting}>{submitting ? <ActivityIndicator color="#FFFFFF" /> : <><MaterialIcons name="send" size={18} color="#FFFFFF" /><Text style={styles.submitText}>Send feedback</Text></>}</TouchableOpacity></View>
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F4F8F5' }, header: { backgroundColor: '#1B7332', paddingTop: 46, paddingBottom: 16, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }, headerTitle: { color: '#FFFFFF', fontSize: 19, fontWeight: '900' }, content: { padding: 16, paddingBottom: 120 }, hero: { minHeight: 180, overflow: 'hidden', borderRadius: 24, backgroundColor: '#DDF4E5', padding: 20, marginBottom: 16 }, heroCopy: { width: '68%', zIndex: 1 }, eyebrow: { color: '#168447', fontSize: 11, fontWeight: '900', letterSpacing: 1 }, title: { marginTop: 7, color: '#143524', fontSize: 28, fontWeight: '900' }, subtitle: { marginTop: 8, color: '#4B6354', fontSize: 14, lineHeight: 20, fontWeight: '600' }, personOne: { position: 'absolute', right: -8, bottom: -18, width: 140, height: 190 }, card: { backgroundColor: '#FFFFFF', borderRadius: 22, padding: 18, borderWidth: 1, borderColor: '#E1EAE3' }, sectionTitle: { color: '#182A20', fontSize: 16, fontWeight: '900', marginBottom: 12, marginTop: 4 }, options: { gap: 9, marginBottom: 20 }, option: { minHeight: 48, paddingHorizontal: 13, borderRadius: 14, borderWidth: 1, borderColor: '#DCE7DF', flexDirection: 'row', alignItems: 'center', gap: 10 }, optionActive: { borderColor: '#25A357', backgroundColor: '#EFFAF2' }, radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: '#B8C7BC', alignItems: 'center', justifyContent: 'center' }, radioActive: { borderColor: '#168447', backgroundColor: '#168447' }, optionText: { color: '#526358', fontSize: 14, fontWeight: '700' }, optionTextActive: { color: '#166534' }, input: { minHeight: 120, borderRadius: 14, borderWidth: 1, borderColor: '#DCE7DF', padding: 13, color: '#182A20', fontSize: 14, marginBottom: 16 }, submit: { minHeight: 52, borderRadius: 15, backgroundColor: '#168447', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }, submitText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
});
