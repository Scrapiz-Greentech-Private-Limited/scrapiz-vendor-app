import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LEARNING_REELS } from '../../data/learningReels';
import { HOME } from '../main/home/homeTheme';

type LearningHubScreenProps = {
  onBack: () => void;
  onOpenReel: () => void;
};

export default function LearningHubScreen({ onBack, onOpenReel }: LearningHubScreenProps) {
  const featured = LEARNING_REELS[0];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={HOME.bg} />
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color={HOME.ink} />
        </TouchableOpacity>
        <Text style={styles.title}>Partner Learning Corner</Text>
        <View style={styles.backBtn} />
      </View>

      <TouchableOpacity style={styles.card} onPress={onOpenReel} activeOpacity={0.92}>
        <View style={styles.thumbWrap}>
          <Image source={featured.thumbnail} style={styles.thumb} contentFit="cover" />
          <View style={styles.playBadge}>
            <MaterialIcons name="play-arrow" size={26} color="#FFFFFF" />
          </View>
        </View>
        <View style={styles.copy}>
          <Text style={styles.featured}>{featured.featuredLabel}</Text>
          <Text style={styles.cardTitle}>{featured.title}</Text>
          <Text style={styles.sub}>{featured.subtitle}</Text>
          <Text style={styles.duration}>{featured.duration}</Text>
        </View>
        <View style={styles.arrow}>
          <MaterialIcons name="chevron-right" size={22} color={HOME.green} />
        </View>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: HOME.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    paddingBottom: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: HOME.ink,
  },
  card: {
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 120,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: HOME.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  thumbWrap: {
    width: 92,
    height: 72,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#D7DDD8',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  playBadge: {
    position: 'absolute',
    top: 22,
    left: 32,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    paddingHorizontal: 12,
  },
  featured: {
    fontSize: 10,
    fontWeight: '800',
    color: HOME.greenMid,
    letterSpacing: 0.8,
  },
  cardTitle: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: '800',
    color: HOME.ink,
  },
  sub: {
    marginTop: 3,
    fontSize: 12,
    color: HOME.muted,
  },
  duration: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '700',
    color: HOME.green,
  },
  arrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: HOME.greenWash,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
