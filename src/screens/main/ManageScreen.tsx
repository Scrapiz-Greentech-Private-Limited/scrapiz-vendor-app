import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ManageScreenProps {
  onBack: () => void;
  onNavigate: (screen: string) => void;
}

const manageOptions = [
  {
    icon: "work",
    title: "Active Jobs",
    subtitle: "View ongoing pickups",
    action: "active-jobs-list",
    color: "#1B7332"
  },
  {
    icon: "calendar-today",
    title: "Future Requests",
    subtitle: "Scheduled pickups",
    action: "future-requests",
    color: "#FF9800"
  },
  {
    icon: "history",
    title: "Job History",
    subtitle: "Completed jobs",
    action: "history",
    color: "#2196F3"
  },
  {
    icon: "trending-up",
    title: "Earnings Report",
    subtitle: "View your earnings",
    action: "earnings",
    color: "#4CAF50"
  }
];

const ManageScreen = ({ onBack, onNavigate }: ManageScreenProps) => {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));

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

  const handleOptionPress = (action: string) => {
    try {
      if (typeof onNavigate === 'function' && action) {
        onNavigate(action);
      } else {
        console.error('Invalid navigation parameters');
      }
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  return (
    <View style={styles.container}>
      {/* Enhanced Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>🛠️ Manage</Text>
          <Text style={styles.headerSubtitle}>Control your business operations</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Animated.View 
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          {/* Quick Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <MaterialIcons name="work" size={20} color="#1B7332" />
              <Text style={styles.statValue}>2</Text>
              <Text style={styles.statLabel}>Active Jobs</Text>
            </View>
            <View style={styles.statCard}>
              <MaterialIcons name="schedule" size={20} color="#FF9800" />
              <Text style={styles.statValue}>4</Text>
              <Text style={styles.statLabel}>Scheduled</Text>
            </View>
            <View style={styles.statCard}>
              <MaterialIcons name="check-circle" size={20} color="#4CAF50" />
              <Text style={styles.statValue}>15</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
          </View>

          {/* Enhanced Options List */}
          <View style={styles.optionsContainer}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            {manageOptions.map((option, index) => (
              <Animated.View
                key={option.action}
                style={{
                  opacity: fadeAnim,
                  transform: [{ 
                    translateY: slideAnim.interpolate({
                      inputRange: [0, 50],
                      outputRange: [0, 50 + (index * 10)]
                    })
                  }]
                }}
              >
                <TouchableOpacity
                  style={styles.optionCard}
                  onPress={() => handleOptionPress(option.action)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.optionIcon, { backgroundColor: option.color + '20' }]}>
                    <MaterialIcons name={option.icon as any} size={24} color={option.color} />
                  </View>
                  <View style={styles.optionContent}>
                    <Text style={styles.optionTitle}>{option.title}</Text>
                    <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
                  </View>
                  <View style={styles.optionArrow}>
                    <MaterialIcons name="chevron-right" size={24} color="#bdc3c7" />
                  </View>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 160, // Increased for proper scrolling clearance with bottom navigation
  },
  header: {
    backgroundColor: '#1B7332',
    paddingHorizontal: 16,
    paddingTop: 44,
    paddingBottom: 12,
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
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 1,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    padding: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#6c757d',
    fontWeight: '600',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  optionsContainer: {
    gap: 12,
  },
  optionCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#1B7332',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(27, 115, 50, 0.1)',
  },
  optionIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  optionSubtitle: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '500',
  },
  optionArrow: {
    padding: 4,
  },
});

export default ManageScreen;
