import * as React from 'react';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

export interface MessageAttachment {
  url: string;
  name: string;
  mime: string;
  type?: 'image' | 'file' | 'gif';
}

export interface MessageInputBlockProps {
  onSend: (payload: { message: string; attachments: MessageAttachment[] }) => void;
  isSending?: boolean;
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  style?: StyleProp<ViewStyle>;
  className?: string;
  disabled?: boolean;
  onShowToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

// ── Curated Emojis Categorized ───────────────────────────────────────────────
const EMOJI_CATEGORIES = [
  {
    name: 'Frequent',
    icon: 'smile',
    emojis: ['😊', '👍', '❤️', '🙏', '🔥', '✨', '🎉', '👏', '🤝', '💯', '👌', '🙌'],
  },
  {
    name: 'Scrap & Work',
    icon: 'truck',
    emojis: ['📦', '🚛', '♻️', '⚖️', '💰', '🏢', '⚡', '🔧', '📍', '📞', '📄', '🏷️'],
  },
  {
    name: 'Faces',
    icon: 'smile',
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂',
      '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩',
      '😘', '😗', '😋', '😛', '😜', '🤪', '😎', '🤓',
      '🧐', '🤗', '🤔', '😐', '😑', '😶', '🙄', '😏',
    ],
  },
  {
    name: 'Gestures',
    icon: 'thumbs-up',
    emojis: [
      '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙',
      '👈', '👉', '👆', '👇', '✋', '🤚', '🖐️', '🖖',
      '👋', '🤝', '👏', '🙌', '👐', '🤲', '🙏', '✍️',
    ],
  },
  {
    name: 'Symbols',
    icon: 'check-circle',
    emojis: [
      '✅', '❌', '⚠️', '❓', '❗', '💡', '📌', '📎',
      '🔒', '🔓', '⏰', '⌛', '📅', '💳', '💵', '🟢',
    ],
  },
];

// ── Curated Reaction GIFs / Quick stickers ──────────────────────────────────
const CURATED_GIFS = [
  { id: '1', title: 'Thumbs Up', url: 'https://media.giphy.com/media/111ebonMs90YLu/giphy.gif' },
  { id: '2', title: 'On My Way', url: 'https://media.giphy.com/media/3o7ZetIsjgoqVqh076/giphy.gif' },
  { id: '3', title: 'Thank You', url: 'https://media.giphy.com/media/osjgQPWRx3cac/giphy.gif' },
  { id: '4', title: 'Deal Done', url: 'https://media.giphy.com/media/ibolLe3mOqHE3PQTtk/giphy.gif' },
  { id: '5', title: 'Checking', url: 'https://media.giphy.com/media/26n6WywJyh39n1pBu/giphy.gif' },
  { id: '6', title: 'Great Job', url: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif' },
  { id: '7', title: 'Hello', url: 'https://media.giphy.com/media/dzaUX7CAG0Ihi/giphy.gif' },
  { id: '8', title: 'Awesome', url: 'https://media.giphy.com/media/3oEjI5VtIhHvK37WYo/giphy.gif' },
];

export const MessageInputBlock = ({
  onSend,
  isSending = false,
  placeholder = 'Type your message...',
  value: controlledValue,
  onChangeText: controlledOnChangeText,
  style,
  disabled = false,
  onShowToast,
}: MessageInputBlockProps) => {
  const [internalText, setInternalText] = useState('');
  const text = controlledValue !== undefined ? controlledValue : internalText;
  const setText = (val: string) => {
    if (controlledOnChangeText) controlledOnChangeText(val);
    if (controlledValue === undefined) setInternalText(val);
  };

  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachmentSheet, setShowAttachmentSheet] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [activeEmojiCategory, setActiveEmojiCategory] = useState(0);
  const [gifSearchQuery, setGifSearchQuery] = useState('');

  const inputRef = useRef<TextInput>(null);
  const sheetAnim = useRef(new Animated.Value(280)).current;

  // ── Open / Close Bottom Sheets ─────────────────────────────────────────────
  const openAttachmentSheet = () => {
    setShowAttachmentSheet(true);
    sheetAnim.setValue(280);
    Animated.spring(sheetAnim, {
      toValue: 0,
      damping: 22,
      stiffness: 200,
      useNativeDriver: true,
    }).start();
  };

  const closeAttachmentSheet = () => {
    Animated.timing(sheetAnim, {
      toValue: 280,
      duration: 180,
      useNativeDriver: true,
    }).start(() => setShowAttachmentSheet(false));
  };

  // ── Attachments Handling ───────────────────────────────────────────────────
  const handleTakePhoto = async () => {
    closeAttachmentSheet();
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      onShowToast?.('Camera permission is required to take photos.', 'error');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      setAttachments((prev) => [
        ...prev,
        {
          url: asset.uri,
          name: asset.fileName ?? `photo_${Date.now()}.jpg`,
          mime: asset.mimeType ?? 'image/jpeg',
          type: 'image',
        },
      ]);
    }
  };

  const handlePickImages = async () => {
    closeAttachmentSheet();
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      onShowToast?.('Photo library permission is required.', 'error');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.8,
      allowsMultipleSelection: true,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const newItems: MessageAttachment[] = result.assets.map((asset, i) => ({
        url: asset.uri,
        name: asset.fileName ?? `image_${Date.now()}_${i}.jpg`,
        mime: asset.mimeType ?? 'image/jpeg',
        type: 'image',
      }));
      setAttachments((prev) => [...prev, ...newItems]);
    }
  };

  const handlePickDocument = async () => {
    closeAttachmentSheet();
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
        type: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'image/*',
          'text/plain',
        ],
      });
      if (!result.canceled && result.assets?.[0]) {
        const doc = result.assets[0];
        setAttachments((prev) => [
          ...prev,
          {
            url: doc.uri,
            name: doc.name,
            mime: doc.mimeType ?? 'application/octet-stream',
            type: doc.mimeType?.startsWith('image') ? 'image' : 'file',
          },
        ]);
      }
    } catch {
      onShowToast?.('Could not pick document.', 'error');
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSelectEmoji = (emoji: string) => {
    setText(text + emoji);
  };

  const handleSelectGif = (url: string, title: string) => {
    setAttachments((prev) => [
      ...prev,
      {
        url,
        name: `${title}.gif`,
        mime: 'image/gif',
        type: 'gif',
      },
    ]);
    setShowGifPicker(false);
  };

  const handleSendPress = () => {
    if ((!text.trim() && attachments.length === 0) || isSending || disabled) return;
    onSend({
      message: text.trim(),
      attachments,
    });
    setText('');
    setAttachments([]);
  };

  const canSend = (text.trim().length > 0 || attachments.length > 0) && !isSending && !disabled;

  return (
    <View style={[styles.wrapper, style]}>
      {/* ── Attachment Preview Carousel (Horizontal) ────────────────────────── */}
      {attachments.length > 0 && (
        <View style={styles.previewContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.previewScrollContent}
          >
            {attachments.map((item, idx) => (
              <View key={`${item.url}-${idx}`} style={styles.previewCard}>
                {item.type === 'file' ? (
                  <View style={styles.fileThumbnail}>
                    <MaterialCommunityIcons name="file-document-outline" size={28} color="#087333" />
                    <Text style={styles.fileThumbnailName} numberOfLines={1}>
                      {item.name}
                    </Text>
                  </View>
                ) : (
                  <Image source={{ uri: item.url }} style={styles.imageThumbnail} resizeMode="cover" />
                )}
                <TouchableOpacity
                  style={styles.removeAttachmentBadge}
                  activeOpacity={0.8}
                  onPress={() => handleRemoveAttachment(idx)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={13} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* ── Main Input Card ─────────────────────────────────────────────────── */}
      <View style={styles.inputCard}>
        {/* Multiline text input */}
        <TextInput
          ref={inputRef}
          value={text}
          onChangeText={setText}
          placeholder={placeholder}
          placeholderTextColor="#7F9489"
          multiline
          maxLength={1500}
          textAlignVertical="center"
          style={styles.textInput}
          editable={!disabled && !isSending}
        />

        {/* Action button toolbar */}
        <View style={styles.toolbarRow}>
          <View style={styles.leftTools}>
            {/* Emoji Button */}
            <TouchableOpacity
              style={styles.toolIconBtn}
              activeOpacity={0.7}
              onPress={() => setShowEmojiPicker(true)}
              disabled={disabled}
            >
              <Feather name="smile" size={20} color="#087333" />
            </TouchableOpacity>

            {/* Paperclip / Attachment Button */}
            <TouchableOpacity
              style={[styles.toolIconBtn, attachments.length > 0 && styles.toolIconBtnActive]}
              activeOpacity={0.7}
              onPress={openAttachmentSheet}
              disabled={disabled}
            >
              <MaterialCommunityIcons
                name={attachments.length > 0 ? 'paperclip-check' : 'paperclip'}
                size={22}
                color="#087333"
              />
            </TouchableOpacity>

            {/* GIF Button */}
            <TouchableOpacity
              style={styles.toolIconBtn}
              activeOpacity={0.7}
              onPress={() => setShowGifPicker(true)}
              disabled={disabled}
            >
              <MaterialIcons name="gif" size={26} color="#087333" />
            </TouchableOpacity>
          </View>

          {/* Send Button */}
          <TouchableOpacity
            style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
            activeOpacity={0.85}
            onPress={handleSendPress}
            disabled={!canSend}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="send" size={17} color="#FFFFFF" style={styles.sendIconOffset} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Emoji Picker Modal ──────────────────────────────────────────────── */}
      <Modal
        visible={showEmojiPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEmojiPicker(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowEmojiPicker(false)}>
          <Pressable style={styles.emojiModalCard}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select an Emoji</Text>
              <TouchableOpacity onPress={() => setShowEmojiPicker(false)}>
                <Ionicons name="close-circle" size={24} color="#7F9489" />
              </TouchableOpacity>
            </View>

            {/* Category tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryTabs}>
              {EMOJI_CATEGORIES.map((cat, i) => (
                <TouchableOpacity
                  key={cat.name}
                  style={[styles.categoryChip, activeEmojiCategory === i && styles.categoryChipActive]}
                  onPress={() => setActiveEmojiCategory(i)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      activeEmojiCategory === i && styles.categoryChipTextActive,
                    ]}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Emoji Grid */}
            <ScrollView style={styles.emojiScrollGrid} showsVerticalScrollIndicator={false}>
              <View style={styles.emojiGrid}>
                {EMOJI_CATEGORIES[activeEmojiCategory].emojis.map((emoji, index) => (
                  <TouchableOpacity
                    key={`${emoji}-${index}`}
                    style={styles.emojiBtn}
                    activeOpacity={0.6}
                    onPress={() => handleSelectEmoji(emoji)}
                  >
                    <Text style={styles.emojiChar}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Attachment Sheet Modal ──────────────────────────────────────────── */}
      <Modal
        visible={showAttachmentSheet}
        transparent
        animationType="none"
        onRequestClose={closeAttachmentSheet}
      >
        <Pressable style={styles.modalOverlay} onPress={closeAttachmentSheet}>
          <Animated.View style={[styles.attachmentSheet, { transform: [{ translateY: sheetAnim }] }]}>
            <Pressable>
              <View style={styles.modalHandle} />
              <Text style={styles.sheetTitle}>Add Attachment</Text>

              <TouchableOpacity style={styles.sheetOption} activeOpacity={0.8} onPress={handleTakePhoto}>
                <View style={styles.sheetOptionIconWrap}>
                  <Ionicons name="camera-outline" size={22} color="#087333" />
                </View>
                <View style={styles.sheetOptionTextWrap}>
                  <Text style={styles.sheetOptionTitle}>Take Photo</Text>
                  <Text style={styles.sheetOptionSub}>Use your camera directly</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#A3B8AC" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.sheetOption} activeOpacity={0.8} onPress={handlePickImages}>
                <View style={styles.sheetOptionIconWrap}>
                  <Ionicons name="images-outline" size={22} color="#087333" />
                </View>
                <View style={styles.sheetOptionTextWrap}>
                  <Text style={styles.sheetOptionTitle}>Upload from Gallery</Text>
                  <Text style={styles.sheetOptionSub}>Select photos or screenshots</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#A3B8AC" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.sheetOption} activeOpacity={0.8} onPress={handlePickDocument}>
                <View style={styles.sheetOptionIconWrap}>
                  <MaterialCommunityIcons name="file-document-outline" size={22} color="#087333" />
                </View>
                <View style={styles.sheetOptionTextWrap}>
                  <Text style={styles.sheetOptionTitle}>Choose Document</Text>
                  <Text style={styles.sheetOptionSub}>PDF, invoice or doc</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#A3B8AC" />
              </TouchableOpacity>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>

      {/* ── GIF Picker Modal ────────────────────────────────────────────────── */}
      <Modal
        visible={showGifPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowGifPicker(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowGifPicker(false)}>
          <Pressable style={styles.gifModalCard}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Send a Reaction GIF</Text>
              <TouchableOpacity onPress={() => setShowGifPicker(false)}>
                <Ionicons name="close-circle" size={24} color="#7F9489" />
              </TouchableOpacity>
            </View>

            {/* Search bar */}
            <View style={styles.gifSearchBox}>
              <Feather name="search" size={16} color="#087333" />
              <TextInput
                value={gifSearchQuery}
                onChangeText={setGifSearchQuery}
                placeholder="Search reactions..."
                placeholderTextColor="#8C9E95"
                style={styles.gifSearchInput}
              />
              {gifSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setGifSearchQuery('')}>
                  <Ionicons name="close" size={16} color="#8C9E95" />
                </TouchableOpacity>
              )}
            </View>

            {/* GIF Grid */}
            <ScrollView style={styles.gifScrollGrid} showsVerticalScrollIndicator={false}>
              <View style={styles.gifGrid}>
                {CURATED_GIFS.filter((g) =>
                  g.title.toLowerCase().includes(gifSearchQuery.trim().toLowerCase())
                ).map((gif) => (
                  <TouchableOpacity
                    key={gif.id}
                    style={styles.gifCard}
                    activeOpacity={0.8}
                    onPress={() => handleSelectGif(gif.url, gif.title)}
                  >
                    <Image source={{ uri: gif.url }} style={styles.gifImage} resizeMode="cover" />
                    <View style={styles.gifLabelBar}>
                      <Text style={styles.gifLabelText} numberOfLines={1}>
                        {gif.title}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

export default MessageInputBlock;

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  // ── Attachment Preview Carousel ─────────────────────────────────────────────
  previewContainer: {
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  previewScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  previewCard: {
    width: 76,
    height: 76,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#C6EAD1',
    backgroundColor: '#F3FBF6',
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#087333',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  imageThumbnail: {
    width: '100%',
    height: '100%',
  },
  fileThumbnail: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    backgroundColor: '#EBF8F0',
  },
  fileThumbnailName: {
    fontSize: 9,
    color: '#084823',
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  removeAttachmentBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#DC2626',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  // ── Main Card ───────────────────────────────────────────────────────────────
  inputCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#D4EBDC',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
    shadowColor: '#0B4D27',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  textInput: {
    color: '#092B19',
    fontSize: 15,
    lineHeight: 21,
    minHeight: 38,
    maxHeight: 110,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  // ── Toolbar ────────────────────────────────────────────────────────────────
  toolbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F0F9F3',
    marginTop: 4,
  },
  leftTools: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  toolIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2FBF5',
  },
  toolIconBtnActive: {
    backgroundColor: '#D7F3E2',
    borderWidth: 1,
    borderColor: '#087333',
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#087333',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#087333',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  sendButtonDisabled: {
    backgroundColor: '#B6D9C2',
    shadowOpacity: 0,
    elevation: 0,
  },
  sendIconOffset: {
    marginLeft: 2,
  },
  // ── Common Modals ──────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(5, 30, 16, 0.45)',
  },
  modalHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#CFDFD5',
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#082E19',
  },
  // ── Emoji Modal ────────────────────────────────────────────────────────────
  emojiModalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    maxHeight: 420,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
  },
  categoryTabs: {
    paddingHorizontal: 14,
    marginBottom: 10,
    maxHeight: 38,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F2F7F4',
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#087333',
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#556E61',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
  emojiScrollGrid: {
    maxHeight: 260,
    paddingHorizontal: 12,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'flex-start',
    paddingBottom: 16,
  },
  emojiBtn: {
    width: (width - 24 - 40) / 6,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#F9FDFB',
  },
  emojiChar: {
    fontSize: 26,
  },
  // ── Attachment Sheet ───────────────────────────────────────────────────────
  attachmentSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#092A18',
    marginBottom: 14,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5FCF7',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2F3E7',
  },
  sheetOptionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#E0F7E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  sheetOptionTextWrap: {
    flex: 1,
  },
  sheetOptionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0B331D',
  },
  sheetOptionSub: {
    fontSize: 12,
    color: '#658172',
    marginTop: 2,
  },
  // ── GIF Modal ──────────────────────────────────────────────────────────────
  gifModalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    maxHeight: 460,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
  },
  gifSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F9F5',
    borderRadius: 14,
    marginHorizontal: 16,
    paddingHorizontal: 12,
    height: 40,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#D8ECDF',
  },
  gifSearchInput: {
    flex: 1,
    fontSize: 14,
    color: '#082E19',
    marginLeft: 8,
    paddingVertical: 0,
  },
  gifScrollGrid: {
    maxHeight: 320,
    paddingHorizontal: 14,
  },
  gifGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingBottom: 16,
  },
  gifCard: {
    width: (width - 28 - 10) / 2,
    height: 110,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#EAF7EE',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#D4EEDB',
  },
  gifImage: {
    width: '100%',
    height: '100%',
  },
  gifLabelBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(5, 30, 16, 0.65)',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  gifLabelText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
});
