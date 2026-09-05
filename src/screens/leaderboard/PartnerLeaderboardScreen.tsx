import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HOME } from '../main/home/homeTheme';

const AWARDS = {
  gold: require('../../../assets/images/golden_award.png'),
  silver: require('../../../assets/images/silver_award.png'),
  bronze: require('../../../assets/images/bronze_award.png'),
} as const;

type PartnerLeaderboardScreenProps = {
  onBack: () => void;
};

const periods = ['Day', 'Week', 'Month', 'Year'] as const;

const topPartners = [
  {
    rank: 2,
    name: 'Priya M.',
    handle: 'priya_recycles',
    score: 8541,
    award: 'silver' as const,
    avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
  },
  {
    rank: 1,
    name: 'Rohan S.',
    handle: 'rohan_scrapiz',
    score: 8693,
    award: 'gold' as const,
    avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
  },
  {
    rank: 3,
    name: 'Amit K.',
    handle: 'amit_pickups',
    score: 8502,
    award: 'bronze' as const,
    avatar: 'https://randomuser.me/api/portraits/men/76.jpg',
  },
];

const nearbyPartners = [
  { rank: 4, name: 'Neha Sharma', handle: 'neha_green', score: 8483, avatar: 'https://randomuser.me/api/portraits/women/65.jpg', delta: 3 },
  { rank: 5, name: 'Vikram Rao', handle: 'vikram_r', score: 8421, avatar: 'https://randomuser.me/api/portraits/men/22.jpg', delta: -1 },
  { rank: 6, name: 'Sana Khan', handle: 'sana_scrap', score: 8377, avatar: 'https://randomuser.me/api/portraits/women/19.jpg', delta: 2 },
  { rank: 7, name: 'Manoj Patel', handle: 'manoj_clean', score: 8345, avatar: 'https://randomuser.me/api/portraits/men/54.jpg', delta: -1 },
  { rank: 8, name: 'Kavya Iyer', handle: 'kavya_i', score: 8314, avatar: 'https://randomuser.me/api/portraits/women/37.jpg', delta: 0 },
  { rank: 9, name: 'Arjun Mehta', handle: 'arjun_m', score: 8203, avatar: 'https://randomuser.me/api/portraits/men/62.jpg', delta: 1 },
  { rank: 10, name: 'Ayaan Partner', handle: 'you', score: 8190, avatar: 'https://randomuser.me/api/portraits/men/11.jpg', delta: 4 },
];

export default function PartnerLeaderboardScreen({ onBack }: PartnerLeaderboardScreenProps) {
  const [period, setPeriod] = useState<(typeof periods)[number]>('Week');

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.78}>
            <MaterialIcons name="arrow-back" size={22} color={HOME.ink} />
          </TouchableOpacity>
          <Text style={styles.title}>Leaderboard</Text>
          <View style={styles.pointsPill}>
            <MaterialIcons name="stars" size={16} color="#F2B705" />
            <Text style={styles.pointsText}>4521</Text>
          </View>
        </View>

        <View style={styles.segment}>
          {periods.map((item) => {
            const active = period === item;
            return (
              <TouchableOpacity
                key={item}
                style={[styles.segmentItem, active && styles.segmentActive]}
                onPress={() => setPeriod(item)}
                activeOpacity={0.82}
              >
                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{item}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.podium}>
          {topPartners.map((partner) => (
            <View key={partner.rank} style={[styles.topSlot, partner.rank === 1 && styles.winnerSlot]}>
              <Text style={styles.topName} numberOfLines={1}>{partner.name}</Text>
              <View style={[styles.avatarRing, styles[`${partner.award}Ring`]]}>
                <Image source={{ uri: partner.avatar }} style={styles.topAvatar} />
                <View style={[styles.rankBadge, styles[`${partner.award}Badge`]]}>
                  <Text style={styles.rankBadgeText}>{partner.rank}</Text>
                </View>
              </View>
              <Image source={AWARDS[partner.award]} style={styles.topAward} contentFit="contain" />
              <Text style={styles.topScore}>{partner.score}</Text>
              <Text style={styles.handle} numberOfLines={1}>{partner.handle}</Text>
            </View>
          ))}
        </View>

        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>Partners around you</Text>
          <TouchableOpacity activeOpacity={0.75}>
            <Text style={styles.viewAll}>View all</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.partnerList}>
          {nearbyPartners.map((partner) => (
            <View key={partner.rank} style={[styles.partnerRow, partner.handle === 'you' && styles.youRow]}>
              <Text style={styles.rankText}>{partner.rank}</Text>
              <Image source={{ uri: partner.avatar }} style={styles.rowAvatar} />
              <View style={styles.rowCopy}>
                <Text style={styles.rowName} numberOfLines={1}>{partner.name}</Text>
                <Text style={styles.rowHandle} numberOfLines={1}>{partner.handle}</Text>
              </View>
              <View style={styles.scoreWrap}>
                <Text style={styles.rowScore}>{partner.score}</Text>
                <View style={styles.deltaRow}>
                  {partner.delta === 0 ? (
                    <Text style={styles.flatDelta}>-</Text>
                  ) : (
                    <>
                      <Text style={[styles.deltaText, partner.delta > 0 ? styles.upDelta : styles.downDelta]}>
                        {Math.abs(partner.delta)}
                      </Text>
                      <MaterialIcons
                        name={partner.delta > 0 ? 'arrow-drop-up' : 'arrow-drop-down'}
                        size={18}
                        color={partner.delta > 0 ? '#22A06B' : '#E05252'}
                      />
                    </>
                  )}
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    paddingBottom: 36,
  },
  header: {
    height: 58,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  title: {
    flex: 1,
    fontSize: 25,
    fontWeight: '900',
    color: HOME.ink,
  },
  pointsPill: {
    height: 32,
    borderRadius: 16,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F7F6F1',
  },
  pointsText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#74716A',
  },
  segment: {
    marginHorizontal: 26,
    marginTop: 10,
    height: 48,
    borderRadius: 24,
    padding: 5,
    flexDirection: 'row',
    backgroundColor: '#F0F0F0',
  },
  segmentItem: {
    flex: 1,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: {
    backgroundColor: '#2E2F33',
    shadowColor: '#000000',
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#777B82',
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  podium: {
    height: 238,
    marginTop: 22,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  topSlot: {
    width: '31%',
    alignItems: 'center',
    paddingBottom: 4,
  },
  winnerSlot: {
    paddingBottom: 14,
  },
  topName: {
    maxWidth: '100%',
    fontSize: 11,
    fontWeight: '800',
    color: '#545861',
    marginBottom: 8,
  },
  avatarRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    padding: 3,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
  },
  goldRing: {
    width: 98,
    height: 98,
    borderRadius: 49,
    borderColor: '#F2D000',
  },
  silverRing: {
    borderColor: '#B7C0C9',
  },
  bronzeRing: {
    borderColor: '#E6A65B',
  },
  topAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#EDF2F0',
  },
  rankBadge: {
    position: 'absolute',
    bottom: -10,
    alignSelf: 'center',
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  goldBadge: {
    backgroundColor: '#F2D000',
  },
  silverBadge: {
    backgroundColor: '#C9D0D8',
  },
  bronzeBadge: {
    backgroundColor: '#E0A05D',
  },
  rankBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    color: HOME.ink,
  },
  topAward: {
    width: 42,
    height: 42,
    marginTop: 16,
  },
  topScore: {
    marginTop: 2,
    fontSize: 18,
    fontWeight: '900',
    color: '#3B3F45',
  },
  handle: {
    maxWidth: '100%',
    fontSize: 11,
    fontWeight: '700',
    color: '#9AA1A8',
  },
  listHeader: {
    marginTop: 20,
    marginHorizontal: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#2D3036',
  },
  viewAll: {
    fontSize: 12,
    fontWeight: '800',
    color: HOME.greenMid,
  },
  partnerList: {
    marginTop: 12,
    paddingHorizontal: 24,
  },
  partnerRow: {
    height: 58,
    borderRadius: 14,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  youRow: {
    backgroundColor: HOME.greenWash,
  },
  rankText: {
    width: 26,
    fontSize: 13,
    fontWeight: '800',
    color: '#5D6269',
    textAlign: 'center',
  },
  rowAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E6EBE8',
  },
  rowCopy: {
    flex: 1,
    paddingHorizontal: 10,
  },
  rowName: {
    fontSize: 13,
    fontWeight: '900',
    color: '#363A40',
  },
  rowHandle: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '700',
    color: '#A0A6AE',
  },
  scoreWrap: {
    minWidth: 62,
    alignItems: 'flex-end',
  },
  rowScore: {
    fontSize: 16,
    fontWeight: '900',
    color: '#555A61',
  },
  deltaRow: {
    height: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },
  deltaText: {
    fontSize: 11,
    fontWeight: '900',
  },
  upDelta: {
    color: '#22A06B',
  },
  downDelta: {
    color: '#E05252',
  },
  flatDelta: {
    fontSize: 13,
    fontWeight: '900',
    color: '#9AA1A8',
  },
});
