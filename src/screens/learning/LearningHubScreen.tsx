import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LEARNING_REELS } from '../../data/learningReels';
import { HOME } from '../main/home/homeTheme';

const LEARNING_BANNER = require('../../../assets/images/learning/learn_with_scrapiz.webp');

type LearningHubScreenProps = {
  onBack: () => void;
  onOpenReel: () => void;
};

const watchedLessons = [
  {
    title: 'Effective Communications',
    duration: '4:32',
    color: '#DFF7EA',
  },
  {
    title: 'Build pickup trust',
    duration: '3:18',
    color: '#FFE7D2',
  },
];

const customerLessons = [
  'How to talk with customers efficiently',
  'Managing doorstep expectations',
  'Closing every pickup politely',
];

export default function LearningHubScreen({ onBack, onOpenReel }: LearningHubScreenProps) {
  const [query, setQuery] = useState('');
  const featured = LEARNING_REELS[0];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={HOME.bg} />
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.iconBtn} activeOpacity={0.75}>
          <MaterialIcons name="arrow-back" size={22} color={HOME.ink} />
        </TouchableOpacity>
        <Text style={styles.title}>Learning centre</Text>
        <TouchableOpacity style={styles.iconBtn} activeOpacity={0.75}>
          <MaterialIcons name="auto-awesome-motion" size={20} color={HOME.greenMid} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <Image source={LEARNING_BANNER} style={styles.heroImage} contentFit="contain" />
        </View>

        <TouchableOpacity style={styles.appStrip} activeOpacity={0.88} onPress={onOpenReel}>
          <View>
            <Text style={styles.appStripTitle}>Get the most out of your partner app</Text>
            <Text style={styles.appStripSub}>Take a 2 minute app tour</Text>
          </View>
          <View style={styles.stripArrow}>
            <MaterialIcons name="arrow-forward" size={16} color="#8B4AE2" />
          </View>
        </TouchableOpacity>

        <View style={styles.searchBox}>
          <MaterialIcons name="search" size={20} color={HOME.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search any topic"
            placeholderTextColor={HOME.muted}
            style={styles.searchInput}
          />
        </View>

        <Text style={styles.sectionTitle}>Most watched on Scrapiz</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.watchedRow}
        >
          {watchedLessons.map((lesson, index) => (
            <TouchableOpacity
              key={lesson.title}
              style={[styles.watchedCard, { backgroundColor: lesson.color }]}
              activeOpacity={0.9}
              onPress={onOpenReel}
            >
              <Image source={featured.thumbnail} style={styles.watchedImage} contentFit="cover" />
              <View style={styles.watchedScrim} />
              <Text style={styles.watchedTitle}>{lesson.title}</Text>
              <View style={styles.durationBadge}>
                <Text style={styles.durationText}>{index === 0 ? featured.duration : lesson.duration}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.sectionTitle}>How to talk with customers efficiently</Text>
        <View style={styles.topicGrid}>
          {customerLessons.map((lesson) => (
            <TouchableOpacity key={lesson} style={styles.topicCard} activeOpacity={0.82} onPress={onOpenReel}>
              <View style={styles.topicIcon}>
                <MaterialIcons name="record-voice-over" size={20} color={HOME.green} />
              </View>
              <Text style={styles.topicText}>{lesson}</Text>
              <MaterialIcons name="chevron-right" size={20} color={HOME.muted} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.featureCard} onPress={onOpenReel} activeOpacity={0.92}>
          <View style={styles.featureThumbWrap}>
            <Image source={featured.thumbnail} style={styles.featureThumb} contentFit="cover" />
            <View style={styles.playBadge}>
              <MaterialIcons name="play-arrow" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.featureDuration}>
              <Text style={styles.featureDurationText}>{featured.duration}</Text>
            </View>
          </View>
          <View style={styles.featureCopy}>
            <Text style={styles.featureLabel}>Featured lesson</Text>
            <Text style={styles.featureTitle}>{featured.title}</Text>
            <Text style={styles.featureSub}>{featured.subtitle}</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: HOME.bg,
  },
  header: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E3E8E4',
    backgroundColor: '#FFFFFF',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    color: HOME.ink,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: 122,
  },
  hero: {
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    backgroundColor: '#FFF5EF',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  appStrip: {
    marginHorizontal: 20,
    marginTop: 16,
    minHeight: 74,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#A855F7',
  },
  appStripTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  appStripSub: {
    marginTop: 3,
    fontSize: 12,
    color: 'rgba(255,255,255,0.88)',
    fontWeight: '600',
  },
  stripArrow: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  searchBox: {
    marginHorizontal: 20,
    marginTop: 26,
    height: 46,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#B8C0BA',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    color: HOME.ink,
  },
  sectionTitle: {
    marginHorizontal: 20,
    marginTop: 22,
    marginBottom: 12,
    fontSize: 15,
    fontWeight: '800',
    color: HOME.ink,
  },
  watchedRow: {
    paddingHorizontal: 20,
    gap: 12,
  },
  watchedCard: {
    width: 154,
    height: 86,
    borderRadius: 8,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  watchedImage: {
    ...StyleSheet.absoluteFillObject,
  },
  watchedScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  watchedTitle: {
    paddingHorizontal: 10,
    paddingBottom: 10,
    paddingRight: 42,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  durationBadge: {
    position: 'absolute',
    right: 7,
    bottom: 7,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  durationText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  topicGrid: {
    marginHorizontal: 20,
    gap: 10,
  },
  topicCard: {
    minHeight: 58,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8E4',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  topicIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: HOME.greenWash,
  },
  topicText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '800',
    color: HOME.ink,
  },
  featureCard: {
    marginHorizontal: 20,
    marginTop: 18,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8E4',
  },
  featureThumbWrap: {
    height: 152,
    backgroundColor: '#D7DDD8',
  },
  featureThumb: {
    width: '100%',
    height: '100%',
  },
  playBadge: {
    position: 'absolute',
    top: 56,
    alignSelf: 'center',
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0,0,0,0.48)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureDuration: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  featureDurationText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  featureCopy: {
    padding: 14,
  },
  featureLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: HOME.greenMid,
    textTransform: 'uppercase',
  },
  featureTitle: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: '900',
    color: HOME.ink,
  },
  featureSub: {
    marginTop: 4,
    fontSize: 13,
    color: HOME.muted,
  },
});
