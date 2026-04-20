import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    Dimensions,
    Platform
} from 'react-native';

interface ProgressSnackbarProps {
    visible: boolean;
    progress: number; // 0 to 100
    label: string;
    themeColor?: string;
}

const ProgressSnackbar = ({
    visible,
    progress,
    label,
    themeColor = '#16a34a'
}: ProgressSnackbarProps) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(20)).current;
    const progressWidth = useRef(new Animated.Value(0)).current;

    // Handles showing/hiding the snackbar
    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: visible ? 1 : 0,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.spring(slideAnim, {
                toValue: visible ? 0 : 20,
                useNativeDriver: true,
                tension: 40,
                friction: 8,
            }),
        ]).start();
    }, [visible]);

    // Handles the smooth progress bar transition
    useEffect(() => {
        Animated.timing(progressWidth, {
            toValue: progress,
            duration: 400, // Smooth transition between progress increments
            useNativeDriver: false, // width cannot use native driver
        }).start();
    }, [progress]);

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }]
                }
            ]}
        >
            <View style={styles.card}>
                <View style={styles.contentRow}>
                    <Text style={styles.label}>{label}</Text>
                    <Text style={styles.percentage}>{Math.round(progress)}%</Text>
                </View>

                {/* Progress Track */}
                <View style={styles.track}>
                    {/* Progress Fill */}
                    <Animated.View
                        style={[
                            styles.fill,
                            {
                                backgroundColor: themeColor,
                                width: progressWidth.interpolate({
                                    inputRange: [0, 100],
                                    outputRange: ['0%', '100%'],
                                }),
                                // Adding a subtle glow to the bar
                                shadowColor: themeColor,
                                shadowOpacity: 0.5,
                                shadowRadius: 5,
                            }
                        ]}
                    />
                </View>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 40,
        left: 20,
        right: 20,
        zIndex: 1000,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.1,
                shadowRadius: 20,
            },
            android: {
                elevation: 10,
            },
        }),
        borderWidth: 1,
        borderColor: '#F1F1F1',
    },
    contentRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    label: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1F2937', // Slate 800
        letterSpacing: -0.2,
    },
    percentage: {
        fontSize: 12,
        fontWeight: '800',
        color: '#6B7280', // Slate 500
        fontVariant: ['tabular-nums'], // Prevents jittering when numbers change
    },
    track: {
        height: 6,
        width: '100%',
        backgroundColor: '#F3F4F6',
        borderRadius: 10,
        overflow: 'hidden',
    },
    fill: {
        height: '100%',
        borderRadius: 10,
    },
});

export default ProgressSnackbar;
