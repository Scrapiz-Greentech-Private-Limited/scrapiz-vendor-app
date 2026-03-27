import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  Linking, 
  Animated
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ActiveJob as ActiveJobType } from '../../types';
import { useLanguage } from '../../utils/i18n';

interface ActiveJobProps {
  job: ActiveJobType;
  onStatusUpdate: (status: ActiveJobType['status']) => void;
  onCompleteJob: () => void;
  onBack: () => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

const ActiveJob = ({ job, onStatusUpdate, onCompleteJob, onBack, onShowToast }: ActiveJobProps) => {
  const { t } = useLanguage();
  const [currentStatus, setCurrentStatus] = useState<ActiveJobType['status']>(job.status || 'on-the-way');
  const [isLoading, setIsLoading] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(30));

  const statusSteps = [
    { 
      value: 'on-the-way', 
      label: t('on_the_way'), 
      icon: 'directions-car',
      description: t('heading_pickup')
    },
    { 
      value: 'arrived', 
      label: t('arrived'), 
      icon: 'location-on',
      description: t('reached_customer')
    },
    { 
      value: 'in-progress', 
      label: t('collecting'), 
      icon: 'inventory',
      description: t('weighing_collecting')
    },
    { 
      value: 'completed', 
      label: t('ready'), 
      icon: 'check-circle',
      description: t('ready_completion')
    },
  ];

  const currentStatusIndex = statusSteps.findIndex(s => s.value === currentStatus);
  const currentStep = statusSteps[currentStatusIndex];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const handleStatusChange = async (status: ActiveJobType['status']) => {
    if (isLoading) return;
    
    try {
      setIsLoading(true);
      setCurrentStatus(status);
      onStatusUpdate(status);
      const statusLabel = statusSteps.find(s => s.value === status)?.label;
      onShowToast(`✅ ${statusLabel}!`, 'success');
    } catch (error) {
      console.error('Error updating status:', error);
      onShowToast('❌ Failed to update status', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const getNextAction = () => {
    const nextIndex = currentStatusIndex + 1;
    if (nextIndex < statusSteps.length) {
      return statusSteps[nextIndex];
    }
    return null;
  };

  const nextAction = getNextAction();

  const handleCall = () => {
    try {
      Linking.openURL(`tel:${job.customerPhone}`);
      onShowToast(`📞 ${t('calling_customer')}`, 'info');
    } catch (error) {
      console.error('Error making call:', error);
      onShowToast('❌ Unable to make call', 'error');
    }
  };

  const handleNavigate = () => {
    try {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(job.address)}`;
      Linking.openURL(url);
      onShowToast(`🗺️ ${t('opening_navigation')}`, 'info');
    } catch (error) {
      console.error('Error opening navigation:', error);
      onShowToast('❌ Unable to open navigation', 'error');
    }
  };

  return (
    <View style={styles.container}>
      {/* Minimal Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <MaterialIcons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{t('active_job')}</Text>
          <Text style={styles.headerSubtitle}>#{job.id}</Text>
        </View>
        <View style={styles.statusBadge}>
          <MaterialIcons name={currentStep?.icon as any} size={16} color="white" />
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Current Status Card */}
        <Animated.View 
          style={[
            styles.currentStatusCard,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.statusHeader}>
            <View style={styles.statusIcon}>
              <MaterialIcons name={currentStep?.icon as any} size={32} color="#1B7332" />
            </View>
            <View style={styles.statusInfo}>
              <Text style={styles.currentStatusLabel}>{currentStep?.label}</Text>
              <Text style={styles.currentStatusDescription}>{currentStep?.description}</Text>
            </View>
          </View>
          
          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${((currentStatusIndex + 1) / statusSteps.length) * 100}%` }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>
              {currentStatusIndex + 1} {t('of')} {statusSteps.length}
            </Text>
          </View>
        </Animated.View>

        {/* Customer Info Card */}
        <Animated.View 
          style={[
            styles.customerCard,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.customerHeader}>
            <View style={styles.customerAvatar}>
              <MaterialIcons name="person" size={24} color="#1B7332" />
            </View>
            <View style={styles.customerInfo}>
              <Text style={styles.customerName}>{job.customerName}</Text>
              <Text style={styles.customerPhone}>{job.customerPhone}</Text>
            </View>
            <TouchableOpacity style={styles.callButton} onPress={handleCall}>
              <MaterialIcons name="phone" size={20} color="white" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.locationContainer}>
            <MaterialIcons name="location-on" size={16} color="#1B7332" />
            <Text style={styles.locationText}>{job.address}</Text>
          </View>
          
          <View style={styles.jobDetails}>
            <View style={styles.detailItem}>
              <MaterialIcons name="category" size={16} color="#6c757d" />
              <Text style={styles.detailText}>{job.scrapType}</Text>
            </View>
            <View style={styles.detailItem}>
              <MaterialIcons name="navigation" size={16} color="#6c757d" />
              <Text style={styles.detailText}>{job.distance}</Text>
            </View>
          </View>
        </Animated.View>

        {/* Quick Actions */}
        <Animated.View 
          style={[
            styles.actionsCard,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <TouchableOpacity style={styles.navigationButton} onPress={handleNavigate}>
            <MaterialIcons name="navigation" size={24} color="white" />
            <Text style={styles.navigationButtonText}>{t('open_navigation')}</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      {/* Bottom Action Button */}
      <View style={styles.bottomContainer}>
        {nextAction ? (
          <TouchableOpacity
            style={[styles.nextButton, isLoading && styles.nextButtonDisabled]}
            onPress={() => handleStatusChange(nextAction.value as any)}
            disabled={isLoading}
          >
            <MaterialIcons 
              name={isLoading ? "hourglass-empty" : nextAction.icon as any} 
              size={20} 
              color="white" 
            />
            <Text style={styles.nextButtonText}>
              {isLoading ? t('updating') : `${t('mark_as')} ${nextAction.label}`}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.completeButton, isLoading && styles.completeButtonDisabled]}
            onPress={onCompleteJob}
            disabled={isLoading}
          >
            <MaterialIcons name="check-circle" size={20} color="white" />
            <Text style={styles.completeButtonText}>{t('complete_job')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  // Minimal Header
  header: {
    backgroundColor: '#1B7332',
    paddingTop: 44,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 1,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  statusBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Content
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  
  // Current Status Card
  currentStatusCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#1B7332',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  statusIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(27, 115, 50, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  statusInfo: {
    flex: 1,
  },
  currentStatusLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  currentStatusDescription: {
    fontSize: 14,
    color: '#6c757d',
    lineHeight: 20,
  },
  
  // Progress Bar
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#1B7332',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
    fontWeight: '600',
  },
  
  // Customer Card
  customerCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  customerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(27, 115, 50, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  customerPhone: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
  },
  callButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1B7332',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1B7332',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  
  // Location
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  locationText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    lineHeight: 20,
  },
  
  // Job Details
  jobDetails: {
    flexDirection: 'row',
    gap: 16,
  },
  detailItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    color: '#6c757d',
    fontWeight: '500',
  },
  
  // Actions Card
  actionsCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  navigationButton: {
    backgroundColor: '#1B7332',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#1B7332',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  navigationButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  // Bottom Container
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    padding: 20,
    paddingBottom: 34, // Safe area
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  nextButton: {
    backgroundColor: '#1B7332',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#1B7332',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  nextButtonDisabled: {
    backgroundColor: '#6c757d',
    shadowColor: '#6c757d',
  },
  nextButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  completeButton: {
    backgroundColor: '#FF9800',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  completeButtonDisabled: {
    backgroundColor: '#6c757d',
    shadowColor: '#6c757d',
  },
  completeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ActiveJob;