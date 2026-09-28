import * as React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  supportChatService,
  SupportMessage,
  SupportThread,
  ThreadTopic,
  CreateThreadPayload,
} from '../../services/supportChatService';
import { MessageInputBlock, MessageAttachment } from '../../components/ui/message-input-block';
import { ScrollArea6 } from '../../components/ui/scroll-area6';

interface SupportChatScreenProps {
  onBack: () => void;
  /** If provided, loads an existing thread directly (skips topic selection). */
  threadId?: string;
  onShowToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

const chatImage = require('../../../assets/images/avatars/chat_image.png');

const TOPICS: { label: string; value: ThreadTopic; icon: string }[] = [
  { label: 'Update my plan',  value: 'update_plan',     icon: 'sync' },
  { label: 'Buy a new plan',  value: 'buy_plan',        icon: 'workspace-premium' },
  { label: 'Booking problem', value: 'booking_problem', icon: 'event-busy' },
  { label: 'Payment issue',   value: 'payment',         icon: 'payment' },
  { label: 'Account',         value: 'account',         icon: 'manage-accounts' },
  { label: 'Other',           value: 'other',           icon: 'help-outline' },
];

const SupportChatScreen = ({
  onBack,
  threadId: initialThreadId,
  onShowToast,
}: SupportChatScreenProps) => {

  // ── State ──────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<'topic_select' | 'chat'>(
    initialThreadId ? 'chat' : 'topic_select'
  );
  const [selectedTopic, setSelectedTopic] = useState<ThreadTopic>('other');
  const [threadId, setThreadId] = useState<string | null>(initialThreadId ?? null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>(
    'disconnected'
  );
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(!!initialThreadId);
  const [threads, setThreads] = useState<SupportThread[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const forceNewThreadRef = useRef(!initialThreadId);

  // ── Real-time subscriptions ────────────────────────────────────────────────
  useEffect(() => {
    const unsubMsg = supportChatService.subscribeMessages(setMessages);
    const unsubStatus = supportChatService.subscribeStatus(setWsStatus);
    return () => {
      unsubMsg();
      unsubStatus();
      supportChatService.stop();
    };
  }, []);

  // ── Load existing thread on mount ─────────────────────────────────────────
  useEffect(() => {
    if (!initialThreadId) return;
    (async () => {
      try {
        setIsLoading(true);
        await supportChatService.loadThread(initialThreadId);
      } catch {
        onShowToast?.('Could not load conversation. Please try again.', 'error');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [initialThreadId, onShowToast]);

  useEffect(() => {
    void supportChatService.listThreads().then(setThreads).catch(() => undefined);
  }, []);

  const startNewChat = useCallback(() => {
    supportChatService.clearLocalConversation();
    setThreadId(null);
    setPhase('topic_select');
    setIsHistoryOpen(false);
    setSelectedTopic('other');
    forceNewThreadRef.current = true;
  }, []);

  const openThread = useCallback(async (id: string) => {
    setIsHistoryOpen(false);
    setThreadId(id);
    setPhase('chat');
    setIsLoading(true);
    try {
      await supportChatService.loadThread(id);
    } catch {
      onShowToast?.('Could not load this conversation.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [onShowToast]);

  // ── Thread creation with MessageInputBlock payload ────────────────────────
  const handleStartChatWithPayload = useCallback(
    async ({ message, attachments }: { message: string; attachments: MessageAttachment[] }) => {
      if (!message.trim() && attachments.length === 0) return;
      setIsSending(true);
      try {
        const first = attachments[0];
        const payload: CreateThreadPayload = {
          topic: selectedTopic,
          initial_message: message.trim() || (first ? `Shared attachment: ${first.name}` : ''),
          attachment_url: first?.url,
          attachment_name: first?.name,
          attachment_mime: first?.mime,
          force_new: forceNewThreadRef.current,
        };
        const thread = await supportChatService.createThread(payload);
        forceNewThreadRef.current = false;
        setThreadId(thread.id);
        await supportChatService.loadThread(thread.id);
        setThreads(await supportChatService.listThreads());

        // Send additional attachments if user selected multiple
        if (attachments.length > 1) {
          for (let i = 1; i < attachments.length; i++) {
            const att = attachments[i];
            await supportChatService.sendMessage(thread.id, {
              body: '',
              message_type: att.type === 'image' || att.type === 'gif' ? 'image' : 'file',
              attachment_url: att.url,
              attachment_name: att.name,
              attachment_mime: att.mime,
            });
          }
        }
        setPhase('chat');
      } catch {
        onShowToast?.('Could not start chat. Please try again.', 'error');
      } finally {
        setIsSending(false);
      }
    },
    [selectedTopic, onShowToast]
  );

  // ── Send message in existing thread with payload ──────────────────────────
  const handleSendWithPayload = useCallback(
    async ({ message, attachments }: { message: string; attachments: MessageAttachment[] }) => {
      if (!threadId) return;
      if (!message.trim() && attachments.length === 0) return;
      setIsSending(true);
      try {
        if (attachments.length === 0) {
          await supportChatService.sendMessage(threadId, {
            body: message.trim(),
            message_type: 'text',
          });
        } else {
          const first = attachments[0];
          await supportChatService.sendMessage(threadId, {
            body: message.trim(),
            message_type: first.type === 'image' || first.type === 'gif' ? 'image' : 'file',
            attachment_url: first.url,
            attachment_name: first.name,
            attachment_mime: first.mime,
          });

          for (let i = 1; i < attachments.length; i++) {
            const att = attachments[i];
            await supportChatService.sendMessage(threadId, {
              body: '',
              message_type: att.type === 'image' || att.type === 'gif' ? 'image' : 'file',
              attachment_url: att.url,
              attachment_name: att.name,
              attachment_mime: att.mime,
            });
          }
        }
      } catch {
        onShowToast?.('Message failed to send. Tap to retry.', 'error');
      } finally {
        setIsSending(false);
      }
    },
    [threadId, onShowToast]
  );

  // ── Status dot color ───────────────────────────────────────────────────────
  const statusDot =
    wsStatus === 'connected' ? '#16a34a' : wsStatus === 'connecting' ? '#eab308' : '#9ca3af';

  // ══════════════════════════════════════════════════════════════════════════
  // PHASE: topic_select — Clean, scrollable, input dock pinned at bottom
  // ══════════════════════════════════════════════════════════════════════════
  if (phase === 'topic_select') {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Background ambient shapes */}
        <View style={styles.backgroundLayer} pointerEvents="none">
          <View style={styles.glowTopLeft} />
          <View style={styles.glowTopCenter} />
          <View style={styles.waveLeft} />
          <View style={styles.waveRight} />
          <View style={styles.waveBottom} />
        </View>

        <KeyboardAvoidingView
          style={styles.flexOne}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.headerCircle} onPress={onBack} activeOpacity={0.8}>
              <Ionicons name="arrow-back" size={24} color="#0B6F32" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Support</Text>
            <TouchableOpacity style={styles.newChatButton} onPress={startNewChat}>
              <Ionicons name="add" size={17} color="#0B6F32" />
              <Text style={styles.newChatText}>New chat</Text>
            </TouchableOpacity>
          </View>

          {/* Scrollable topic & hero body */}
          <ScrollView
            style={styles.topicScrollView}
            contentContainerStyle={styles.topicScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Hero Image */}
            <View style={styles.hero}>
              <View style={styles.imageHalo} />
              <Image source={chatImage} style={styles.chatImage} resizeMode="contain" />
            </View>

            {/* Typography */}
            <Text style={styles.title}>
              How can we <Text style={styles.titleAccent}>help</Text> you?
            </Text>
            <Text style={styles.subtitle}>Pick a topic and describe your issue below.</Text>

            {/* Topic chips grid */}
            <View style={styles.topicGrid}>
              {TOPICS.map((t) => {
                const isSelected = selectedTopic === t.value;
                return (
                  <TouchableOpacity
                    key={t.value}
                    style={[styles.topicChip, isSelected && styles.topicChipSelected]}
                    activeOpacity={0.84}
                    onPress={() => setSelectedTopic(t.value)}
                  >
                    <MaterialIcons
                      name={t.icon as any}
                      size={18}
                      color={isSelected ? '#FFFFFF' : '#087333'}
                    />
                    <Text style={[styles.topicText, isSelected && styles.topicTextSelected]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Pinned Input Block at the bottom - Always visible */}
          <View style={styles.dockContainer}>
            <MessageInputBlock
              onSend={handleStartChatWithPayload}
              isSending={isSending}
              placeholder={`Describe your ${TOPICS.find((t) => t.value === selectedTopic)?.label.toLowerCase()}...`}
              onShowToast={onShowToast}
            />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PHASE: chat — Full conversation view using ScrollArea6 & MessageInputBlock
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Chat header */}
      <View style={styles.chatHeader}>
        <TouchableOpacity style={styles.headerCircle} onPress={() => setIsHistoryOpen(true)} activeOpacity={0.8}>
          <Ionicons name="menu" size={24} color="#0B6F32" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.chatBackButton} onPress={onBack} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#0B6F32" />
        </TouchableOpacity>
        <View style={styles.chatHeaderCenter}>
          <Text style={styles.chatHeaderTitle}>Support Chat</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: statusDot }]} />
            <Text style={styles.statusText}>
              {wsStatus === 'connected'
                ? 'Live'
                : wsStatus === 'connecting'
                  ? 'Connecting…'
                  : 'Online'}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.newChatButton} onPress={startNewChat}>
          <Ionicons name="add" size={17} color="#0B6F32" />
          <Text style={styles.newChatText}>New chat</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.flexOne}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        {/* Messages Stream via ScrollArea6 */}
        <ScrollArea6
          messages={messages.filter((m) => !m.is_deleted)}
          isLoading={isLoading}
          onRetryMessage={(msg) => {
            if (threadId) {
              supportChatService.sendMessage(threadId, {
                body: msg.body,
                message_type: msg.message_type,
                attachment_url: msg.attachment_url,
                attachment_name: msg.attachment_name,
                attachment_mime: msg.attachment_mime,
              });
            }
          }}
        />

        {/* Bottom Pinned Input Block */}
        <View style={styles.dockContainerChat}>
          <MessageInputBlock
            onSend={handleSendWithPayload}
            isSending={isSending}
            placeholder="Type your message…"
            onShowToast={onShowToast}
          />
        </View>
      </KeyboardAvoidingView>

      {isHistoryOpen ? (
        <View style={styles.historyOverlay}>
          <TouchableOpacity style={styles.historyBackdrop} onPress={() => setIsHistoryOpen(false)} />
          <View style={styles.historyDrawer}>
            <View style={styles.historyTitleRow}>
              <Text style={styles.historyTitle}>Previous conversations</Text>
              <TouchableOpacity onPress={() => setIsHistoryOpen(false)}><Ionicons name="close" size={22} color="#0B6F32" /></TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.drawerNewChat} onPress={startNewChat}>
              <Ionicons name="add-circle-outline" size={21} color="#168447" />
              <Text style={styles.drawerNewChatText}>Start a new chat</Text>
            </TouchableOpacity>
            <ScrollView showsVerticalScrollIndicator={false}>
              {threads.map((thread) => (
                <TouchableOpacity key={thread.id} style={styles.threadRow} onPress={() => void openThread(thread.id)}>
                  <View style={styles.threadIcon}><Ionicons name="chatbubble-ellipses-outline" size={18} color="#168447" /></View>
                  <View style={styles.threadCopy}>
                    <Text style={styles.threadTopic} numberOfLines={1}>{thread.topic_display}</Text>
                    <Text style={styles.threadPreview} numberOfLines={2}>{thread.last_message_preview || 'No messages yet'}</Text>
                  </View>
                  {thread.unread_vendor_count > 0 ? <View style={styles.unreadBadge}><Text style={styles.unreadText}>{thread.unread_vendor_count}</Text></View> : null}
                </TouchableOpacity>
              ))}
              {!threads.length ? <Text style={styles.emptyHistory}>No previous conversations.</Text> : null}
            </ScrollView>
          </View>
        </View>
      ) : null}

    </SafeAreaView>
  );
};

export default SupportChatScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FCF8',
  },
  flexOne: {
    flex: 1,
  },
  // ── Header ─────────────────────────────────────────────────────────────────
  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(235, 255, 240, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(180, 238, 198, 0.4)',
  },
  headerTitle: {
    color: '#082B19',
    fontSize: 22,
    fontWeight: '900',
  },
  headerPlaceholder: {
    width: 44,
  },
  newChatButton: { minHeight: 38, borderRadius: 19, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#E9F8ED' },
  newChatText: { color: '#0B6F32', fontSize: 12, fontWeight: '800' },
  chatBackButton: { width: 34, height: 44, alignItems: 'center', justifyContent: 'center' },
  // ── Chat Header ────────────────────────────────────────────────────────────
  chatHeader: {
    height: 66,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8F5EC',
    shadowColor: '#0D3B22',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  chatHeaderCenter: {
    flex: 1,
    alignItems: 'center',
  },
  chatHeaderTitle: {
    color: '#082B19',
    fontSize: 17,
    fontWeight: '800',
  },
  historyOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 20, flexDirection: 'row' },
  historyBackdrop: { flex: 1, backgroundColor: 'rgba(8,43,25,0.25)' },
  historyDrawer: { width: '82%', maxWidth: 340, backgroundColor: '#FFFFFF', paddingTop: 52, paddingHorizontal: 16, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 14, elevation: 10 },
  historyTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  historyTitle: { color: '#082B19', fontSize: 19, fontWeight: '900' },
  drawerNewChat: { minHeight: 48, borderRadius: 14, backgroundColor: '#EFFAF2', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, gap: 9, marginBottom: 12 },
  drawerNewChatText: { color: '#166534', fontSize: 14, fontWeight: '800' },
  threadRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#E8F5EC', gap: 10 },
  threadIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EAF8EE', alignItems: 'center', justifyContent: 'center' },
  threadCopy: { flex: 1 },
  threadTopic: { color: '#153524', fontSize: 14, fontWeight: '800' },
  threadPreview: { color: '#718078', fontSize: 12, lineHeight: 17, marginTop: 3 },
  unreadBadge: { minWidth: 21, height: 21, borderRadius: 11, backgroundColor: '#168447', alignItems: 'center', justifyContent: 'center' },
  unreadText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },
  emptyHistory: { color: '#718078', textAlign: 'center', marginTop: 30, fontSize: 14 },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 5,
  },
  statusText: {
    color: '#60796B',
    fontSize: 12,
    fontWeight: '600',
  },
  // ── Topic Select View ──────────────────────────────────────────────────────
  topicScrollView: {
    flex: 1,
  },
  topicScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
    alignItems: 'center',
  },
  hero: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  imageHalo: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(192, 247, 207, 0.52)',
  },
  chatImage: {
    width: 220,
    height: 190,
  },
  title: {
    color: '#062719',
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '900',
    textAlign: 'center',
  },
  titleAccent: {
    color: '#087333',
    fontStyle: 'italic',
  },
  subtitle: {
    color: '#526A5D',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
    marginBottom: 20,
    textAlign: 'center',
    maxWidth: 290,
  },
  topicGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    width: '100%',
  },
  topicChip: {
    height: 48,
    borderRadius: 20,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: '#CBEBD5',
    shadowColor: '#087333',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  topicChipSelected: {
    backgroundColor: '#087333',
    borderColor: '#087333',
    shadowOpacity: 0.15,
    elevation: 3,
  },
  topicText: {
    color: '#0B2D1C',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
  },
  topicTextSelected: {
    color: '#FFFFFF',
  },
  // ── Input Dock Container (Pinned at bottom) ────────────────────────────────
  dockContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: '#F7FCF8',
  },
  dockContainerChat: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E8F5EC',
  },
  // ── Decorative Background Shapes ───────────────────────────────────────────
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  glowTopLeft: {
    position: 'absolute',
    top: -80,
    left: -80,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(173, 255, 196, 0.38)',
  },
  glowTopCenter: {
    position: 'absolute',
    top: 140,
    alignSelf: 'center',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(170, 244, 190, 0.28)',
  },
  waveLeft: {
    position: 'absolute',
    left: -150,
    top: 320,
    width: 300,
    height: 400,
    borderRadius: 170,
    backgroundColor: 'rgba(215, 249, 226, 0.75)',
    transform: [{ rotate: '-61deg' }],
  },
  waveRight: {
    position: 'absolute',
    right: -170,
    top: 560,
    width: 380,
    height: 460,
    borderRadius: 210,
    backgroundColor: 'rgba(191, 246, 210, 0.58)',
    transform: [{ rotate: '42deg' }],
  },
  waveBottom: {
    position: 'absolute',
    left: -100,
    right: -80,
    bottom: -110,
    height: 240,
    borderRadius: 160,
    backgroundColor: 'rgba(101, 225, 136, 0.42)',
    transform: [{ rotate: '10deg' }],
  },
  headerCirclePlaceholder: {
    width: 44,
    height: 44,
  },
});
