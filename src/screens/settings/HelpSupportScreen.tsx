import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Linking } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';

interface HelpSupportScreenProps {
  onBack: () => void;
}

const HelpSupportScreen = ({ onBack }: HelpSupportScreenProps) => {
  const faqData = [
    {
      question: 'How do I accept a booking request?',
      answer: 'When you receive a booking notification, tap on it to view details and then tap "Accept Booking" to confirm.',
    },
    {
      question: 'How are payments processed?',
      answer: 'Payments are processed automatically after job completion. Money is transferred to your registered bank account within 24-48 hours.',
    },
    {
      question: 'What if customer cancels the booking?',
      answer: 'If a customer cancels before you reach the location, you will not be charged any penalty. If cancelled after reaching, you may receive compensation.',
    },
    {
      question: 'How to update my vehicle information?',
      answer: 'Go to Profile > Vehicle Details to update your vehicle information, capacity, and documents.',
    },
    {
      question: 'What types of scrap can I collect?',
      answer: 'You can collect paper, cardboard, plastic, metal, electronics, and other recyclable materials as per your vehicle capacity.',
    },
  ];

  const supportOptions = [
    {
      title: 'Call Support',
      subtitle: 'Speak with our support team',
      icon: 'phone',
      action: () => handleCall(),
      color: '#1B7332',
    },
    {
      title: 'WhatsApp Support',
      subtitle: 'Chat with us on WhatsApp',
      icon: 'chat',
      action: () => handleWhatsApp(),
      color: '#1B7332',
    },
  ];

  const handleCall = async () => {
    const phoneNumber = '+91-8000-123-456';
    try {
      const supported = await Linking.canOpenURL(`tel:${phoneNumber}`);
      if (supported) {
        await Linking.openURL(`tel:${phoneNumber}`);
      } else {
        Alert.alert('Error', 'Phone calls are not supported on this device');
      }
    } catch {
      Alert.alert('Error', 'Unable to make phone call');
    }
  };

  const handleWhatsApp = async () => {
    const phoneNumber = '918000123456';
    const message = 'Hi, I need help with Scrapiz Vendor App';
    const whatsappUrl = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;
    
    try {
      const supported = await Linking.canOpenURL(whatsappUrl);
      if (supported) {
        await Linking.openURL(whatsappUrl);
      } else {
        Alert.alert('Error', 'WhatsApp is not installed on your device');
      }
    } catch {
      Alert.alert('Error', 'Unable to open WhatsApp');
    }
  };

  const handleEmergencyCall = async () => {
    const emergencyNumber = '+918828700630';
    try {
      const supported = await Linking.canOpenURL(`tel:${emergencyNumber}`);
      if (supported) {
        await Linking.openURL(`tel:${emergencyNumber}`);
      } else {
        Alert.alert('Error', 'Phone calls are not supported on this device');
      }
    } catch {
      Alert.alert('Error', 'Unable to make emergency call');
    }
  };

  const [expandedFaq, setExpandedFaq] = React.useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerNav}>
            <TouchableOpacity 
              onPress={onBack} 
              style={styles.backButton}
              accessibilityLabel="Go back to profile"
              accessibilityRole="button"
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            
            <Text style={styles.headerTitle}>Help & Support</Text>
            
            <View style={styles.headerSpacer} />
          </View>
        </View>

        <View style={styles.content}>
          {/* Quick Support */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Get Quick Help</Text>
            <View style={styles.supportContainer}>
              {supportOptions.map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.supportCard}
                  onPress={option.action}
                  activeOpacity={0.7}
                  accessibilityLabel={`${option.title}: ${option.subtitle}`}
                  accessibilityRole="button"
                >
                  <View style={[styles.supportIcon, { backgroundColor: `${option.color}20` }]}>
                    <MaterialIcons name={option.icon as any} size={24} color={option.color} />
                  </View>
                  <View style={styles.supportText}>
                    <Text style={styles.supportTitle}>{option.title}</Text>
                    <Text style={styles.supportSubtitle}>{option.subtitle}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#6c757d" />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* FAQ Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
            <View style={styles.faqContainer}>
              {faqData.map((faq, index) => (
                <View key={index} style={styles.faqCard}>
                  <TouchableOpacity
                    style={styles.faqQuestion}
                    onPress={() => toggleFaq(index)}
                    activeOpacity={0.7}
                    accessibilityLabel={`FAQ: ${faq.question}. ${expandedFaq === index ? 'Expanded' : 'Tap to expand'}`}
                    accessibilityRole="button"
                  >
                    <Text style={styles.faqQuestionText}>{faq.question}</Text>
                    <Ionicons 
                      name={expandedFaq === index ? "chevron-up" : "chevron-down"} 
                      size={20} 
                      color="#6c757d" 
                    />
                  </TouchableOpacity>
                  {expandedFaq === index && (
                    <View style={styles.faqAnswer}>
                      <Text style={styles.faqAnswerText}>{faq.answer}</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>

          {/* Emergency Contact */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Emergency Contact</Text>
            <View style={styles.emergencyCard}>
              <View style={styles.emergencyIcon}>
                <MaterialIcons name="support-agent" size={32} color="#1B7332" />
              </View>
              <View style={styles.emergencyText}>
                <Text style={styles.emergencyTitle}>24/7 Emergency Support</Text>
                <Text style={styles.emergencySubtitle}>For urgent issues or emergencies</Text>
                <Text style={styles.emergencyNumber}>+91 8828700630</Text>
              </View>
              <TouchableOpacity
                style={styles.emergencyButton}
                onPress={handleEmergencyCall}
                accessibilityLabel="Call emergency support"
                accessibilityRole="button"
              >
                <MaterialIcons name="phone" size={20} color="white" />
              </TouchableOpacity>
            </View>
          </View>

        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120, // Extra space for bottom navigation
  },
  header: {
    backgroundColor: '#1B7332',
    paddingHorizontal: 16,
    paddingTop: 44,
    paddingBottom: 12,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  supportContainer: {
    gap: 12,
  },
  supportCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    gap: 12,
    minHeight: 64,
  },
  supportIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  supportText: {
    flex: 1,
  },
  supportTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  supportSubtitle: {
    fontSize: 13,
    color: '#6c757d',
  },
  faqContainer: {
    gap: 12,
  },
  faqCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  faqQuestion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    minHeight: 56,
  },
  faqQuestionText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 12,
  },
  faqAnswer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    backgroundColor: '#f8f9fa',
  },
  faqAnswerText: {
    fontSize: 14,
    color: '#6c757d',
    lineHeight: 20,
  },
  emergencyCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#1B7332',
    gap: 12,
  },
  emergencyIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#E8F5E8',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emergencyText: {
    flex: 1,
  },
  emergencyTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  emergencySubtitle: {
    fontSize: 13,
    color: '#6c757d',
    marginBottom: 6,
  },
  emergencyNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1B7332',
  },
  emergencyButton: {
    width: 44,
    height: 44,
    backgroundColor: '#1B7332',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appInfoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    alignItems: 'center',
  },
  appInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  appInfoText: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  appInfoButtons: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  websiteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  websiteButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1B7332',
  },
  forumButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  forumButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1B7332',
  },
});

export default HelpSupportScreen;
