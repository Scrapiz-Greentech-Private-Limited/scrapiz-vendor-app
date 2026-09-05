import { MaterialIcons } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ViewToken,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LEARNING_REELS, type LearningReel } from '../../data/learningReels';
import { HapticService } from '../../services/hapticService';
import { HOME } from '../main/home/homeTheme';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

type ReelPlayerScreenProps = {
  onBack: () => void;
};

type ReelSlide = LearningReel & { slideId: string };

function ReelSlideItem({
  item,
  isActive,
  liked,
  likeCount,
  commentCount,
  onToggleLike,
  onOpenComments,
}: {
  item: ReelSlide;
  isActive: boolean;
  liked: boolean;
  likeCount: number;
  commentCount: number;
  onToggleLike: () => void;
  onOpenComments: () => void;
}) {
  const player = useVideoPlayer(item.video, (instance) => {
    instance.loop = true;
    instance.muted = false;
  });

  useEffect(() => {
    if (isActive) {
      player.play();
    } else {
      player.pause();
    }
  }, [isActive, player]);

  return (
    <View style={styles.slide}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
      />
      <View style={styles.gradientScrim} />
      <View style={styles.rightRail}>
        <ActionButton
          icon={liked ? 'favorite' : 'favorite-border'}
          color={liked ? '#F43F5E' : '#FFFFFF'}
          label={String(likeCount)}
          onPress={onToggleLike}
        />
        <ActionButton icon="chat-bubble-outline" label={String(commentCount)} onPress={onOpenComments} />
        <ActionButton icon="share" label="Share" />
      </View>
      <View style={styles.caption}>
        <Text style={styles.captionKicker}>{item.featuredLabel}</Text>
        <Text style={styles.captionTitle}>{item.title}</Text>
        <Text style={styles.captionSub}>{item.subtitle}</Text>
      </View>
    </View>
  );
}

function ActionButton({
  icon,
  label,
  color = '#FFFFFF',
  onPress,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  color?: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity style={styles.action} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.actionIcon}>
        <MaterialIcons name={icon} size={28} color={color} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function ReelPlayerScreen({ onBack }: ReelPlayerScreenProps) {
  const insets = useSafeAreaInsets();
  const reel = LEARNING_REELS[0];
  const slides = useMemo<ReelSlide[]>(
    () =>
      Array.from({ length: 2 }, (_, index) => ({
        ...reel,
        slideId: `${reel.id}-${index}`,
      })),
    [reel],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(248);
  const [comments, setComments] = useState<string[]>([
    'Super useful for doorstep pickups.',
    'This helped me greet customers better.',
  ]);
  const [commentOpen, setCommentOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const listRef = useRef<FlatList<ReelSlide>>(null);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems[0];
    if (typeof first?.index === 'number') {
      setActiveIndex(first.index);
    }
  }).current;

  const handleLike = useCallback(async () => {
    await HapticService.light();
    setLiked((prev) => {
      setLikeCount((count) => count + (prev ? -1 : 1));
      return !prev;
    });
  }, []);

  const submitComment = () => {
    const next = draft.trim();
    if (!next) {
      return;
    }
    setComments((prev) => [next, ...prev]);
    setDraft('');
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <FlatList
        ref={listRef}
        data={slides}
        keyExtractor={(item) => item.slideId}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={SCREEN_HEIGHT}
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 80 }}
        getItemLayout={(_, index) => ({
          length: SCREEN_HEIGHT,
          offset: SCREEN_HEIGHT * index,
          index,
        })}
        onMomentumScrollEnd={(event) => {
          const index = Math.round(event.nativeEvent.contentOffset.y / SCREEN_HEIGHT);
          if (index >= slides.length - 1) {
            listRef.current?.scrollToIndex({ index: 0, animated: false });
          }
        }}
        renderItem={({ item, index }) => (
          <ReelSlideItem
            item={item}
            isActive={index === activeIndex}
            liked={liked}
            likeCount={likeCount}
            commentCount={comments.length}
            onToggleLike={handleLike}
            onOpenComments={() => setCommentOpen(true)}
          />
        )}
      />

      <TouchableOpacity
        style={[styles.closeBtn, { top: insets.top + 8 }]}
        onPress={onBack}
        activeOpacity={0.85}
      >
        <MaterialIcons name="close" size={22} color="#FFFFFF" />
      </TouchableOpacity>

      <Modal visible={commentOpen} animationType="slide" transparent onRequestClose={() => setCommentOpen(false)}>
        <KeyboardAvoidingView
          style={styles.commentOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity style={styles.commentBackdrop} onPress={() => setCommentOpen(false)} />
          <View style={[styles.commentSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.commentHandle} />
            <Text style={styles.commentTitle}>Comments</Text>
            {comments.map((comment, index) => (
              <Text key={`${comment}-${index}`} style={styles.commentBody}>
                {comment}
              </Text>
            ))}
            <View style={styles.commentInputRow}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder="Add a comment"
                placeholderTextColor={HOME.muted}
                style={styles.commentInput}
              />
              <TouchableOpacity style={styles.sendBtn} onPress={submitComment}>
                <MaterialIcons name="send" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  slide: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#000000',
    justifyContent: 'flex-end',
  },
  gradientScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  rightRail: {
    position: 'absolute',
    right: 14,
    bottom: 140,
    alignItems: 'center',
    gap: 18,
  },
  action: {
    alignItems: 'center',
  },
  actionIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(0,0,0,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    marginTop: 4,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  caption: {
    paddingHorizontal: 18,
    paddingBottom: 48,
    paddingRight: 86,
  },
  captionKicker: {
    color: '#B7F4C6',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  captionTitle: {
    marginTop: 6,
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  captionSub: {
    marginTop: 4,
    color: 'rgba(255,255,255,0.82)',
    fontSize: 14,
  },
  closeBtn: {
    position: 'absolute',
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  commentBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  commentSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 8,
    maxHeight: '58%',
  },
  commentHandle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    marginBottom: 10,
  },
  commentTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: HOME.ink,
    marginBottom: 12,
  },
  commentBody: {
    fontSize: 14,
    color: HOME.ink,
    marginBottom: 10,
    lineHeight: 20,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  commentInput: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    color: HOME.ink,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: HOME.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
