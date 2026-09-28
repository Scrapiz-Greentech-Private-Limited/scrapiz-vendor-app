import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { SupportMessage } from '../../services/supportChatService';

export interface ChatMessageItem {
  id: string;
  sender_type?: 'vendor' | 'agent' | 'system';
  sender_name?: string;
  body: string;
  created_at: string;
  is_mine?: boolean;
  message_type?: 'text' | 'image' | 'file' | 'system';
  attachment_url?: string | null;
  attachment_name?: string | null;
  attachment_mime?: string | null;
  pending?: boolean;
  failed?: boolean;
}

export interface ScrollArea6Props {
  messages: (SupportMessage | ChatMessageItem)[];
  isLoading?: boolean;
  emptyTitle?: string;
  emptySubtitle?: string;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  onRetryMessage?: (message: SupportMessage | ChatMessageItem) => void;
  renderHeader?: () => React.ReactElement | null;
}

function getInitials(name?: string): string {
  if (!name) return 'SP';
  if (name.toLowerCase() === 'you') return 'Y';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatMessageTime(timestamp: string): string {
  try {
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
  } catch {
    return '';
  }
}

export const ScrollArea6 = ({
  messages,
  isLoading = false,
  emptyTitle = 'No messages yet',
  emptySubtitle = 'Ask your question below. Our support team is ready to help you.',
  style,
  contentContainerStyle,
  onRetryMessage,
  renderHeader,
}: ScrollArea6Props) => {
  const flatListRef = useRef<FlatList>(null);
  const [selectedImageModal, setSelectedImageModal] = useState<string | null>(null);

  // Auto-scroll to bottom on mount and on message additions
  useEffect(() => {
    if (messages.length > 0) {
      const timer = setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [messages.length]);

  const renderItem = ({ item }: { item: SupportMessage | ChatMessageItem }) => {
    const isSystem = item.sender_type === 'system';

    if (isSystem) {
      return (
        <View style={styles.systemRow}>
          <View style={styles.systemPill}>
            <Text style={styles.systemText}>{item.body}</Text>
          </View>
        </View>
      );
    }

    // Role differentiation:
    // Vendor messages: right side, green background (#087333), white text (#FFFFFF)
    // Support agent / Admin messages: left side, white background (#FFFFFF), black text (#111827 / #000000)
    const isAgent = item.sender_type === 'agent';
    const isVendor = !isAgent && (item.sender_type === 'vendor' || item.is_mine === true);

    const initials = getInitials(isVendor ? 'You' : item.sender_name ?? 'Support');
    const isImage =
      item.message_type === 'image' ||
      (item.attachment_mime && item.attachment_mime.startsWith('image')) ||
      (item.attachment_url && item.attachment_url.match(/\.(jpeg|jpg|gif|png|webp)($|\?)/i));

    return (
      <View style={[styles.messageRow, isVendor ? styles.rowRight : styles.rowLeft]}>
        {/* Support Agent Avatar on Left */}
        {!isVendor && (
          <View style={styles.avatar}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>
        )}

        {/* Message Bubble */}
        <View
          style={[
            styles.bubble,
            isVendor ? styles.vendorBubble : styles.agentBubble,
            item.pending && styles.bubblePending,
            item.failed && styles.bubbleFailed,
          ]}
        >
          {/* Support Agent Name on Left */}
          {!isVendor && (
            <Text style={styles.senderName}>{item.sender_name ?? 'Support Agent'}</Text>
          )}

          {/* Attachment Render */}
          {item.attachment_url && (
            <View style={styles.attachmentWrapper}>
              {isImage ? (
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => setSelectedImageModal(item.attachment_url!)}
                >
                  <Image
                    source={{ uri: item.attachment_url }}
                    style={styles.attachmentImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ) : (
                <View
                  style={[
                    styles.documentPill,
                    isVendor ? styles.documentPillVendor : styles.documentPillAgent,
                  ]}
                >
                  <MaterialCommunityIcons
                    name="file-document-outline"
                    size={22}
                    color={isVendor ? '#FFFFFF' : '#111827'}
                  />
                  <Text
                    style={[
                      styles.documentText,
                      isVendor ? styles.documentTextVendor : styles.documentTextAgent,
                    ]}
                    numberOfLines={1}
                  >
                    {item.attachment_name ?? 'Attached document'}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Message Body */}
          {Boolean(item.body) && (
            <Text
              style={[
                styles.bubbleText,
                isVendor ? styles.bubbleTextVendor : styles.bubbleTextAgent,
              ]}
            >
              {item.body}
            </Text>
          )}

          {/* Time & Status Footer */}
          <View style={styles.bubbleFooter}>
            <Text
              style={[
                styles.timestampText,
                isVendor ? styles.timestampVendor : styles.timestampAgent,
              ]}
            >
              {formatMessageTime(item.created_at)}
            </Text>

            {isVendor && (
              <View style={styles.statusIconWrap}>
                {item.pending ? (
                  <Ionicons name="time-outline" size={12} color="rgba(255, 255, 255, 0.75)" />
                ) : item.failed ? (
                  <TouchableOpacity
                    onPress={() => onRetryMessage?.(item)}
                    style={styles.retryWrap}
                  >
                    <Ionicons name="alert-circle" size={13} color="#FFD2D2" />
                    <Text style={styles.retryText}>Retry</Text>
                  </TouchableOpacity>
                ) : (
                  <Ionicons name="checkmark-done" size={13} color="rgba(255, 255, 255, 0.9)" />
                )}
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, style]}>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#087333" />
          <Text style={styles.loadingText}>Loading conversation…</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={[styles.listContent, contentContainerStyle]}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <MaterialCommunityIcons name="chat-processing-outline" size={38} color="#087333" />
              </View>
              <Text style={styles.emptyTitle}>{emptyTitle}</Text>
              <Text style={styles.emptySubtitle}>{emptySubtitle}</Text>
            </View>
          }
        />
      )}

      {/* Full-screen Image Preview Modal */}
      <Modal
        visible={Boolean(selectedImageModal)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedImageModal(null)}
      >
        <Pressable style={styles.imageModalOverlay} onPress={() => setSelectedImageModal(null)}>
          <TouchableOpacity
            style={styles.closeImageBtn}
            onPress={() => setSelectedImageModal(null)}
          >
            <Ionicons name="close" size={26} color="#FFFFFF" />
          </TouchableOpacity>
          {selectedImageModal && (
            <Image
              source={{ uri: selectedImageModal }}
              style={styles.fullScreenImage}
              resizeMode="contain"
            />
          )}
        </Pressable>
      </Modal>
    </View>
  );
};

export default ScrollArea6;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 10,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#527060',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 28,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#E7F7ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#C6EAD1',
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#082D18',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    lineHeight: 20,
    color: '#658172',
    textAlign: 'center',
    maxWidth: 280,
  },
  // ── Message Rows ────────────────────────────────────────────────────────────
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 6,
  },
  rowRight: {
    justifyContent: 'flex-end',
  },
  rowLeft: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#D7F1E0',
    borderWidth: 1,
    borderColor: '#BFE7CD',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 2,
  },
  avatarInitials: {
    fontSize: 11,
    fontWeight: '800',
    color: '#08632C',
  },
  bubble: {
    maxWidth: '78%',
    borderRadius: 18,
    paddingHorizontal: 13,
    paddingVertical: 9,
    shadowColor: '#09361C',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  vendorBubble: {
    backgroundColor: '#087333',
    borderBottomRightRadius: 4,
  },
  agentBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  bubblePending: {
    opacity: 0.72,
  },
  bubbleFailed: {
    backgroundColor: '#FDE8E8',
    borderColor: '#F8B4B4',
  },
  senderName: {
    color: '#087333',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 3,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 21,
  },
  bubbleTextVendor: {
    color: '#FFFFFF',
  },
  bubbleTextAgent: {
    color: '#111827',
  },
  // ── Attachments ────────────────────────────────────────────────────────────
  attachmentWrapper: {
    marginBottom: 6,
    borderRadius: 12,
    overflow: 'hidden',
  },
  attachmentImage: {
    width: 200,
    height: 140,
    borderRadius: 10,
  },
  documentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 8,
  },
  documentPillVendor: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  documentPillAgent: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  documentText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  documentTextVendor: {
    color: '#FFFFFF',
  },
  documentTextAgent: {
    color: '#111827',
  },
  // ── Footer (Time & Status) ─────────────────────────────────────────────────
  bubbleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 4,
  },
  timestampText: {
    fontSize: 10,
  },
  timestampVendor: {
    color: 'rgba(255, 255, 255, 0.72)',
  },
  timestampAgent: {
    color: '#6B7280',
  },
  statusIconWrap: {
    marginLeft: 2,
  },
  retryWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  retryText: {
    color: '#FFD2D2',
    fontSize: 10,
    fontWeight: '700',
  },
  // ── System messages ────────────────────────────────────────────────────────
  systemRow: {
    alignItems: 'center',
    marginVertical: 6,
  },
  systemPill: {
    backgroundColor: '#EBF7F0',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D4EEDB',
  },
  systemText: {
    color: '#557563',
    fontSize: 12,
    fontStyle: 'italic',
  },
  // ── Image Modal ────────────────────────────────────────────────────────────
  imageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeImageBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  fullScreenImage: {
    width: '94%',
    height: '80%',
  },
});
