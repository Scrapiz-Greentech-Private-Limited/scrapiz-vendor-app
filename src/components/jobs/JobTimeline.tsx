import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '../../theme/tokens';

export interface JobTimelineProps {
  currentStep: 'en_route' | 'arrived' | 'in_progress' | 'ready' | 'completed' | 'payment_pending';
  completedAt?: Record<string, string>; // step key -> summary or timestamp
  onStepPress?: (stepKey: string) => void; // only fires on active step
}

export const TIMELINE_STEPS = [
  {
    key: 'face_verify',
    title: 'Face Verification',
    subtitle: 'Verify your identity to confirm arrival',
    completedWhen: ['arrived', 'in_progress', 'ready', 'completed'],
    activeWhen: ['en_route'],
  },
  {
    key: 'otp_verify',
    title: 'Customer OTP',
    subtitle: 'Send OTP and confirm customer presence',
    completedWhen: ['in_progress', 'ready', 'completed'],
    activeWhen: ['arrived'],
  },
  {
    key: 'weighing',
    title: 'Start Weighing',
    subtitle: 'Measure and confirm scrap quantities',
    completedWhen: ['ready', 'completed'],
    activeWhen: ['in_progress'],
  },
  {
    key: 'price_quote',
    title: 'Complete Pickup',
    subtitle: 'Submit final quote and confirm amounts',
    completedWhen: ['completed'],
    activeWhen: ['ready'],
  },
  {
    key: 'payment',
    title: 'Complete Payment',
    subtitle: 'Complete payment to the customer and close job',
    completedWhen: [],
    activeWhen: ['payment_pending'],
  },
] as const;

type StepStatus = 'completed' | 'active' | 'pending';

export const JobTimeline: React.FC<JobTimelineProps> = ({
  currentStep,
  completedAt,
  onStepPress,
}) => {
  const getStepStatus = (step: (typeof TIMELINE_STEPS)[number]): StepStatus => {
    if (step.completedWhen.includes(currentStep as any)) {
      return 'completed';
    }
    if (step.activeWhen.includes(currentStep as any)) {
      return 'active';
    }
    return 'pending';
  };

  return (
    <View style={styles.cardContainer}>
      {TIMELINE_STEPS.map((step, index) => {
        const status = getStepStatus(step);
        const isLast = index === TIMELINE_STEPS.length - 1;
        const stepNumber = index + 1;
        const isCompleted = status === 'completed';
        const isActive = status === 'active';
        const metaText = completedAt?.[step.key];

        return (
          <View key={step.key} style={styles.row}>
            {/* Left Column: 48px wide, circle (32x32) + connector line */}
            <View style={styles.leftCol}>
              <View
                style={[
                  styles.circle,
                  isCompleted && styles.circleCompleted,
                  isActive && styles.circleActive,
                  status === 'pending' && styles.circlePending,
                ]}
              >
                {isCompleted ? (
                  <MaterialIcons name="check" size={18} color="#FFFFFF" />
                ) : (
                  <Text
                    style={[
                      styles.circleText,
                      isActive ? styles.circleTextActive : styles.circleTextPending,
                    ]}
                  >
                    {stepNumber}
                  </Text>
                )}
              </View>

              {/* Vertical connector line (no line after last step) */}
              {!isLast && (
                <View
                  style={[
                    styles.connectorLine,
                    isCompleted ? styles.connectorSolid : styles.connectorDashed,
                  ]}
                />
              )}
            </View>

            {/* Right Column: flex: 1 */}
            <Pressable
              style={[
                styles.rightCol,
                isActive && styles.rightColActive,
              ]}
              onPress={() => {
                if (isActive && onStepPress) {
                  onStepPress(step.key);
                }
              }}
              disabled={!isActive}
            >
              <View style={styles.contentWrap}>
                <View style={styles.headerRow}>
                  <Text
                    style={[
                      styles.title,
                      isActive && styles.titleActive,
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {step.title}
                  </Text>
                  {metaText ? (
                    <Text style={styles.metaText} numberOfLines={1} ellipsizeMode="tail">
                      {metaText}
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.subtitle} numberOfLines={2} ellipsizeMode="tail">
                  {step.subtitle}
                </Text>
              </View>

              {isActive && (
                <View style={styles.chevronWrap}>
                  <MaterialIcons name="chevron-right" size={24} color={DESIGN_TOKENS.GREEN_MID} />
                </View>
              )}
            </Pressable>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: DESIGN_TOKENS.CARD_BG,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.BORDER,
    paddingVertical: 8,
    paddingHorizontal: 16,
    minHeight: 280,
    shadowColor: DESIGN_TOKENS.GREEN_DARK,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingVertical: 12,
  },
  leftCol: {
    width: 48,
    alignItems: 'center',
    position: 'relative',
  },
  circle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  circleCompleted: {
    backgroundColor: DESIGN_TOKENS.GREEN_MID,
  },
  circleActive: {
    backgroundColor: DESIGN_TOKENS.GREEN_MID,
  },
  circlePending: {
    backgroundColor: DESIGN_TOKENS.BORDER,
  },
  circleText: {
    fontSize: 14,
    fontWeight: '800',
  },
  circleTextActive: {
    color: '#FFFFFF',
  },
  circleTextPending: {
    color: DESIGN_TOKENS.TEXT_MUTED,
  },
  connectorLine: {
    position: 'absolute',
    top: 32,
    bottom: -12,
    left: 23,
    width: 2,
    zIndex: 1,
  },
  connectorSolid: {
    backgroundColor: DESIGN_TOKENS.GREEN_MID,
  },
  connectorDashed: {
    borderStyle: 'dashed',
    borderLeftWidth: 2,
    borderColor: '#CBD5E1',
    backgroundColor: 'transparent',
  },
  rightCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  rightColActive: {
    backgroundColor: DESIGN_TOKENS.GREEN_BG,
    borderLeftWidth: 3,
    borderLeftColor: DESIGN_TOKENS.GREEN_MID,
  },
  contentWrap: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: DESIGN_TOKENS.TEXT_PRIMARY,
  },
  titleActive: {
    color: DESIGN_TOKENS.GREEN_DARK,
  },
  subtitle: {
    fontSize: 13,
    color: DESIGN_TOKENS.TEXT_SECONDARY,
    marginTop: 2,
    lineHeight: 18,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '700',
    color: DESIGN_TOKENS.GREEN_DARK,
  },
  chevronWrap: {
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default JobTimeline;
