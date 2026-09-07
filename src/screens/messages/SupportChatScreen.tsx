import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

interface SupportChatScreenProps {
  onBack: () => void;
  onShowToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

const chatImage = require('../../../assets/images/avatars/chat_image.png');
const TOPICS = ['Update my plan', 'Buy a new plan', 'Booking problem'];

const SupportChatScreen = ({ onBack, onShowToast }: SupportChatScreenProps) => {
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState('');
  const [isAttachmentSheetVisible, setIsAttachmentSheetVisible] = useState(false);
  const [isReportMenuVisible, setIsReportMenuVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const sheetTranslateY = useRef(new Animated.Value(280)).current;

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(Math.max(event.endCoordinates.height - insets.bottom, 0));
    });
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [insets.bottom]);

  const openAttachmentSheet = () => {
    setIsAttachmentSheetVisible(true);
    sheetTranslateY.setValue(280);
    Animated.spring(sheetTranslateY, {
      toValue: 0,
      damping: 20,
      stiffness: 180,
      useNativeDriver: true,
    }).start();
  };

  const closeAttachmentSheet = () => {
    Animated.timing(sheetTranslateY, {
      toValue: 280,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setIsAttachmentSheetVisible(false));
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      onShowToast?.('Photo access is needed to upload an image.', 'error');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });

    if (!result.canceled) {
      onShowToast?.('Image attached.', 'success');
      closeAttachmentSheet();
    }
  };

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
      type: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ],
    });

    if (!result.canceled) {
      onShowToast?.('File attached.', 'success');
      closeAttachmentSheet();
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={[styles.keyboardView, { paddingBottom: keyboardHeight }]}
        behavior={undefined}
      >
        <View style={styles.backgroundLayer}>
          <View style={styles.glowTopLeft} />
          <View style={styles.glowTopCenter} />
          <View style={styles.waveLeft} />
          <View style={styles.waveRight} />
          <View style={styles.waveBottom} />
          <View style={styles.leafLeft} />
          <View style={styles.leafRight} />
        </View>

        <View style={styles.header}>
          <TouchableOpacity style={styles.headerCircle} onPress={onBack} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={28} color="#0B6F32" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Support</Text>
          <TouchableOpacity
            style={styles.headerCircle}
            activeOpacity={0.8}
            onPress={() => setIsReportMenuVisible(true)}
          >
            <Ionicons name="ellipsis-horizontal" size={28} color="#0B6F32" />
          </TouchableOpacity>
        </View>

        <View style={styles.hero}>
          <View style={styles.imageHalo} />
          <Image source={chatImage} style={styles.chatImage} resizeMode="contain" />
        </View>

        <Text style={styles.title}>
          How can we <Text style={styles.titleAccent}>help</Text> you?
        </Text>
        <Text style={styles.subtitle}>Send your request. Our assistant will help.</Text>

        <View style={styles.topicFloat}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.topicRow}
          >
            {TOPICS.map((topic, index) => (
              <TouchableOpacity
                key={topic}
                style={styles.topicChip}
                activeOpacity={0.86}
                onPress={() => setMessage(topic)}
              >
                <MaterialIcons
                  name={index === 0 ? 'sync' : index === 1 ? 'workspace-premium' : 'event-busy'}
                  size={20}
                  color="#087333"
                />
                <Text style={styles.topicText}>{topic}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={[styles.inputDock, { marginBottom: keyboardHeight > 0 ? 12 : Math.max(insets.bottom, 18) }]}>
          <TouchableOpacity style={styles.attachButton} onPress={openAttachmentSheet} activeOpacity={0.84}>
            <MaterialCommunityIcons name="paperclip" size={30} color="#0B6F32" />
          </TouchableOpacity>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Ask your question..."
            placeholderTextColor="#8B9E95"
            style={styles.input}
            multiline
            textAlignVertical="center"
          />
          <TouchableOpacity
            style={styles.sendButton}
            activeOpacity={0.88}
            onPress={() => {
              if (message.trim()) {
                onShowToast?.('Request sent.', 'success');
                setMessage('');
              }
            }}
          >
            <Ionicons name="paper-plane" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={isReportMenuVisible} transparent animationType="fade" onRequestClose={() => setIsReportMenuVisible(false)}>
        <Pressable style={styles.menuOverlay} onPress={() => setIsReportMenuVisible(false)}>
          <View style={[styles.reportMenu, { top: Math.max(insets.top + 74, 86) }]}>
            <TouchableOpacity
              style={styles.reportOption}
              activeOpacity={0.86}
              onPress={() => {
                setIsReportMenuVisible(false);
                onShowToast?.('Issue report started.', 'info');
              }}
            >
              <MaterialIcons name="report-problem" size={20} color="#087333" />
              <Text style={styles.reportOptionText}>Report issue</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={isAttachmentSheetVisible} transparent animationType="none" onRequestClose={closeAttachmentSheet}>
        <Pressable style={styles.sheetOverlay} onPress={closeAttachmentSheet}>
          <Animated.View style={[styles.sheet, { transform: [{ translateY: sheetTranslateY }] }]}>
            <Pressable>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>Attach a file</Text>
              <TouchableOpacity style={styles.attachmentOption} activeOpacity={0.88} onPress={pickImage}>
                <View style={styles.attachmentIcon}>
                  <Ionicons name="image" size={22} color="#087333" />
                </View>
                <View style={styles.attachmentCopy}>
                  <Text style={styles.attachmentTitle}>Upload image</Text>
                  <Text style={styles.attachmentText}>PNG, JPG, JPEG, WEBP</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.attachmentOption} activeOpacity={0.88} onPress={pickFile}>
                <View style={styles.attachmentIcon}>
                  <Ionicons name="document-text" size={22} color="#087333" />
                </View>
                <View style={styles.attachmentCopy}>
                  <Text style={styles.attachmentTitle}>Upload file</Text>
                  <Text style={styles.attachmentText}>PDF or Word</Text>
                </View>
              </TouchableOpacity>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FFF9',
  },
  keyboardView: {
    flex: 1,
    paddingHorizontal: 24,
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
    bottom: -96,
    overflow: 'hidden',
  },
  glowTopLeft: {
    position: 'absolute',
    top: -88,
    left: -84,
    width: 230,
    height: 250,
    borderRadius: 130,
    backgroundColor: 'rgba(173, 255, 196, 0.42)',
  },
  glowTopCenter: {
    position: 'absolute',
    top: 186,
    alignSelf: 'center',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(170, 244, 190, 0.32)',
  },
  waveLeft: {
    position: 'absolute',
    left: -170,
    top: 360,
    width: 330,
    height: 430,
    borderRadius: 190,
    backgroundColor: 'rgba(215, 249, 226, 0.86)',
    transform: [{ rotate: '-61deg' }],
  },
  waveRight: {
    position: 'absolute',
    right: -184,
    top: 622,
    width: 410,
    height: 500,
    borderRadius: 230,
    backgroundColor: 'rgba(191, 246, 210, 0.68)',
    transform: [{ rotate: '42deg' }],
  },
  waveBottom: {
    position: 'absolute',
    left: -126,
    right: -100,
    bottom: -122,
    height: 270,
    borderRadius: 180,
    backgroundColor: 'rgba(101, 225, 136, 0.54)',
    transform: [{ rotate: '10deg' }],
  },
  leafLeft: {
    position: 'absolute',
    top: 310,
    left: 28,
    width: 42,
    height: 108,
    borderTopLeftRadius: 42,
    borderBottomRightRadius: 42,
    backgroundColor: 'rgba(93, 223, 139, 0.28)',
    transform: [{ rotate: '-32deg' }],
  },
  leafRight: {
    position: 'absolute',
    top: 408,
    right: 20,
    width: 46,
    height: 126,
    borderTopRightRadius: 46,
    borderBottomLeftRadius: 46,
    backgroundColor: 'rgba(93, 223, 139, 0.25)',
    transform: [{ rotate: '28deg' }],
  },
  header: {
    height: 84,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(235, 255, 240, 0.86)',
  },
  headerTitle: {
    color: '#082B19',
    fontSize: 25,
    fontWeight: '900',
  },
  hero: {
    height: 272,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageHalo: {
    position: 'absolute',
    width: 238,
    height: 238,
    borderRadius: 119,
    backgroundColor: 'rgba(192, 247, 207, 0.56)',
  },
  chatImage: {
    width: 310,
    height: 260,
  },
  title: {
    color: '#062719',
    fontSize: 38,
    lineHeight: 46,
    fontWeight: '900',
    letterSpacing: 0,
    textAlign: 'center',
  },
  titleAccent: {
    color: '#079437',
    fontStyle: 'italic',
  },
  subtitle: {
    alignSelf: 'center',
    color: '#5D6E67',
    fontSize: 18,
    lineHeight: 27,
    marginTop: 16,
    maxWidth: 318,
    textAlign: 'center',
  },
  topicFloat: {
    marginTop: 'auto',
    marginHorizontal: -24,
    marginBottom: 18,
  },
  topicRow: {
    paddingHorizontal: 24,
    paddingVertical: 4,
    gap: 12,
  },
  topicChip: {
    height: 56,
    borderRadius: 24,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(220, 255, 230, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(180, 238, 198, 0.82)',
  },
  topicText: {
    color: '#0B2D1C',
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 9,
  },
  inputDock: {
    minHeight: 86,
    borderRadius: 38,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 10,
    shadowColor: '#10733A',
    shadowOpacity: 0.13,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(8, 43, 25, 0.08)',
  },
  reportMenu: {
    position: 'absolute',
    right: 24,
    width: 184,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    padding: 8,
    shadowColor: '#0B2D1C',
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  reportOption: {
    height: 50,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    backgroundColor: '#F4FCF6',
  },
  reportOptionText: {
    color: '#102B1D',
    fontSize: 15,
    fontWeight: '800',
    marginLeft: 10,
  },
  attachButton: {
    width: 46,
    height: 66,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    color: '#0B2D1C',
    fontSize: 17,
    paddingHorizontal: 12,
    paddingVertical: 14,
    maxHeight: 92,
    minHeight: 58,
  },
  sendButton: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#098C35',
  },
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(8, 43, 25, 0.34)',
  },
  sheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 34,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 46,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#D9E6DE',
    marginBottom: 18,
  },
  sheetTitle: {
    color: '#092A19',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 10,
  },
  attachmentOption: {
    minHeight: 72,
    borderRadius: 24,
    backgroundColor: '#F4FCF6',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginTop: 10,
  },
  attachmentIcon: {
    width: 46,
    height: 46,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E1F8E9',
    marginRight: 13,
  },
  attachmentCopy: {
    flex: 1,
  },
  attachmentTitle: {
    color: '#102B1D',
    fontSize: 16,
    fontWeight: '800',
  },
  attachmentText: {
    color: '#667A70',
    fontSize: 13,
    marginTop: 4,
  },
});

export default SupportChatScreen;
