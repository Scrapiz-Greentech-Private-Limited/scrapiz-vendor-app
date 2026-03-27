import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Image, Platform } from 'react-native';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useAuth } from '../../../hooks/useAuth';
import { useLanguage } from '../../utils/i18n';

interface ProfileScreenProps {
  onBack: () => void;
  onNavigate: (screen: string) => void;
}

const ProfileScreen = ({ onBack, onNavigate }: ProfileScreenProps) => {
  const { user, logout } = useAuth();
  const { t, language, setLanguage } = useLanguage();

  const handleLogout = () => {
    Alert.alert(
      t('logout'),
      t('logout_confirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        { 
          text: t('logout'), 
          style: 'destructive',
          onPress: logout 
        }
      ]
    );
  };

  const getLanguageName = (lang: string) => {
    switch (lang) {
      case 'english': return 'English';
      case 'hindi': return 'हिन्दी';
      case 'marathi': return 'मराठी';
      default: return 'English';
    }
  };

  const [isLanguageModalVisible, setIsLanguageModalVisible] = React.useState(false);

  const languages = [
    { code: 'english', name: 'English', nativeName: 'English' },
    { code: 'hindi', name: 'Hindi', nativeName: 'हिन्दी' },
    { code: 'marathi', name: 'Marathi', nativeName: 'मराठी' },
  ];

  const handleLanguageSelect = async (code: string) => {
    await setLanguage(code as any);
    setIsLanguageModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} bounces={false}>
        {/* Header Section */}
        <View style={styles.header}>
          {/* Back Button */}
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          
          <View style={styles.headerContent}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                {user?.image ? (
                  <Image source={{ uri: user.image }} style={styles.avatarImage} />
                ) : (
                  <MaterialIcons name="person" size={50} color="white" />
                )}
              </View>
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.userName}>{user?.name || 'Nooroolhuda'}</Text>
              <Text style={styles.userPhone}>{user?.phone || '+91 9967332092'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.content}>
          {/* Ratings Card */}
          <TouchableOpacity style={styles.ratingsCard} activeOpacity={0.8}>
            <View style={styles.ratingsContent}>
              <View style={styles.ratingsLeft}>
                <View style={styles.starIconContainer}>
                  <MaterialIcons name="star-outline" size={24} color="#333" />
                </View>
                <Text style={styles.ratingsText}>{t('your_ratings')}</Text>
              </View>
              <View style={styles.ratingsRight}>
                <Text style={styles.ratingsValue}>3.0 ★</Text>
                <MaterialIcons name="chevron-right" size={24} color="#333" />
              </View>
            </View>
          </TouchableOpacity>

          {/* Account Settings Section */}
          <Text style={styles.sectionTitle}>{t('account_settings')}</Text>
          <View style={styles.optionsGroup}>
            <TouchableOpacity style={styles.optionItem}>
              <View style={styles.optionLeft}>
                <FontAwesome5 name="rupee-sign" size={18} color="#333" />
                <Text style={styles.optionText}>{t('payment_acceptance_mode')}</Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#ccc" />
            </TouchableOpacity>
            
            <View style={styles.divider} />
            
            <TouchableOpacity style={styles.optionItem} onPress={() => setIsLanguageModalVisible(true)}>
              <View style={styles.optionLeft}>
                <Ionicons name="globe-outline" size={20} color="#333" />
                <Text style={styles.optionText}>{t('language')}</Text>
              </View>
              <View style={styles.optionRight}>
                <Text style={styles.languageIndicator}>{getLanguageName(language)}</Text>
                <MaterialIcons name="chevron-right" size={24} color="#ccc" />
              </View>
            </TouchableOpacity>
          </View>

          {/* Help & Support Section */}
          <Text style={styles.sectionTitle}>{t('help_support')}</Text>
          <View style={styles.optionsGroup}>
            <TouchableOpacity style={styles.optionItem}>
              <View style={styles.optionLeft}>
                <MaterialIcons name="thumb-up-off-alt" size={20} color="#333" />
                <Text style={styles.optionText}>{t('give_us_feedback')}</Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#ccc" />
            </TouchableOpacity>
            
            <View style={styles.divider} />
            
            <TouchableOpacity style={styles.optionItem} onPress={() => onNavigate('help-support')}>
              <View style={styles.optionLeft}>
                <Ionicons name="help-circle-outline" size={22} color="#333" />
                <Text style={styles.optionText}>{t('help_support_item')}</Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#ccc" />
            </TouchableOpacity>
          </View>

          {/* More Section */}
          <Text style={styles.sectionTitle}>{t('more')}</Text>
          <View style={styles.optionsGroup}>
            <TouchableOpacity style={styles.optionItem}>
              <View style={styles.optionLeft}>
                <Ionicons name="shield-outline" size={20} color="#333" />
                <Text style={styles.optionText}>{t('privacy_policy')}</Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#ccc" />
            </TouchableOpacity>
            
            <View style={styles.divider} />
            
            <TouchableOpacity style={styles.optionItem}>
              <View style={styles.optionLeft}>
                <MaterialIcons name="list-alt" size={20} color="#333" />
                <Text style={styles.optionText}>{t('content_policy')}</Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#ccc" />
            </TouchableOpacity>

            <View style={styles.divider} />
            
            <TouchableOpacity style={styles.optionItem}>
              <View style={styles.optionLeft}>
                <MaterialIcons name="description" size={20} color="#333" />
                <Text style={styles.optionText}>{t('terms_conditions')}</Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#ccc" />
            </TouchableOpacity>

            <View style={styles.divider} />
            
            <TouchableOpacity style={styles.optionItem} onPress={handleLogout}>
              <View style={styles.optionLeft}>
                <MaterialIcons name="logout" size={20} color="#dc3545" />
                <Text style={[styles.optionText, { color: '#dc3545' }]}>{t('logout')}</Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#dc3545" />
            </TouchableOpacity>
          </View>

          {/* App Info */}
          <View style={styles.appInfo}>
            <Text style={styles.appInfoText}>{t('app_version')}</Text>
            <Text style={styles.appVersion}>v0.0.0</Text>
          </View>
        </View>
      </ScrollView>

      {/* Language Selection Modal */}
      {isLanguageModalVisible && (
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalCloseArea} 
            activeOpacity={1} 
            onPress={() => setIsLanguageModalVisible(false)} 
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('select_language')}</Text>
            </View>
            
            <View style={styles.languageList}>
              {languages.map((lang) => (
                <TouchableOpacity 
                  key={lang.code} 
                  style={[
                    styles.languageItem,
                    language === lang.code && styles.activeLanguageItem
                  ]}
                  onPress={() => handleLanguageSelect(lang.code)}
                >
                  <Text style={[
                    styles.languageItemText,
                    language === lang.code && styles.activeLanguageText
                  ]}>
                    {lang.nativeName}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#0a421a', // Dark green
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
    paddingHorizontal: 20,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 20,
    zIndex: 10,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 40,
  },
  avatarContainer: {
    marginRight: 15,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  headerInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
  },
  userPhone: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
  },
  content: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    marginTop: 0,
  },
  ratingsCard: {
    backgroundColor: '#fffbeb', // Light amber/yellow
    borderRadius: 12,
    padding: 18,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: '#fef3c7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ratingsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ratingsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starIconContainer: {
    marginRight: 10,
  },
  ratingsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  ratingsRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingsValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#999',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  optionsGroup: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  optionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  languageIndicator: {
    fontSize: 14,
    color: '#888',
  },
  divider: {
    height: 1,
    backgroundColor: '#f5f5f5',
    marginHorizontal: 0,
  },
  appInfo: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 100, // For bottom nav
  },
  appInfoText: {
    fontSize: 14,
    color: '#bbb',
    marginBottom: 4,
  },
  appVersion: {
    fontSize: 14,
    color: '#bbb',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    zIndex: 2000,
  },
  modalCloseArea: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    maxHeight: '50%',
  },
  modalHeader: {
    padding: 24,
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
  languageList: {
    padding: 24,
    paddingTop: 10,
  },
  languageItem: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fff',
  },
  activeLanguageItem: {
    borderColor: '#0a421a',
    backgroundColor: '#f6fff8',
  },
  languageItemText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#333',
  },
  activeLanguageText: {
    color: '#0a421a',
    fontWeight: '700',
  },
});

export default ProfileScreen;
