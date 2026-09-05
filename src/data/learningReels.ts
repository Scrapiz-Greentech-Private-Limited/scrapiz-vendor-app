export type LearningReel = {
  id: string;
  title: string;
  subtitle: string;
  duration: string;
  featuredLabel: string;
  thumbnail: number;
  video: number;
};

export const LEARNING_REELS: LearningReel[] = [
  {
    id: 'effective-communications',
    title: 'Effective Communications',
    subtitle: 'Build better customer relationships.',
    duration: '4:32',
    featuredLabel: 'FEATURED',
    thumbnail: require('../../assets/images/customer.jpeg'),
    video: require('../../assets/videos/reel_1.mp4'),
  },
];
