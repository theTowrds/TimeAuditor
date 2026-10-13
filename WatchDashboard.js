import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Vibration, useWindowDimensions, FlatList } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { useTimeStore } from './store';

const formatTime = (ms) => {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
};

const ProgressRing = ({ radius, strokeWidth, percentage, color, trackColor }) => {
  const size = radius * 2;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - percentage * circumference;

  return (
    <Svg width={size} height={size}>
      <G rotation="-90" origin={`${radius}, ${radius}`}>
        <Circle stroke={trackColor} fill="transparent" strokeWidth={strokeWidth} r={normalizedRadius} cx={radius} cy={radius} />
        <Circle stroke={color} fill="transparent" strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" r={normalizedRadius} cx={radius} cy={radius} />
      </G>
    </Svg>
  );
};

const FullScreenTaskCard = ({ item, now, screenWidth, screenHeight }) => {
  const { taskId, title } = item;
  const activeTask = useTimeStore((state) => state.activeTask);
  const lastActiveTimestamp = useTimeStore((state) => state.lastActiveTimestamp);
  const accumulated = useTimeStore((state) => state.today[taskId]);
  const budget = useTimeStore((state) => state.budgets[taskId]);
  const startTask = useTimeStore((state) => state.startTask);

  const isActive = activeTask === taskId;
  const currentSessionTime = isActive ? Math.max(0, now - lastActiveTimestamp) : 0;
  const totalDisplayTime = accumulated + currentSessionTime;
  
  const isOvertime = totalDisplayTime > budget;
  const progressPercentage = Math.min(1, totalDisplayTime / budget); 
  const prevTime = useRef(totalDisplayTime);

  useEffect(() => {
    if (isActive && prevTime.current <= budget && totalDisplayTime > budget) {
      Vibration.vibrate([0, 500, 200, 500]); 
    }
    prevTime.current = totalDisplayTime;
  }, [totalDisplayTime, budget, isActive]);

  const handlePress = () => {
    Vibration.vibrate(50); 
    startTask(taskId);
  };

  const ringColor = isOvertime ? '#ef4444' : (isActive ? '#3b82f6' : '#60a5fa');
  const activeOpacity = isActive ? 1 : 0.5;
  
  const radius = (screenWidth / 2) - 20; 
  const boxSize = radius * 2;

  return (
    <View style={[styles.cardContainer, { width: screenWidth, height: screenHeight }]}>
      <TouchableOpacity 
        style={[styles.touchTarget, { width: boxSize, height: boxSize, opacity: activeOpacity }]} 
        onPress={handlePress} 
        activeOpacity={0.7}
      >
        <View style={styles.svgAbsolute}>
          <ProgressRing radius={radius} strokeWidth={8} percentage={progressPercentage} color={ringColor} trackColor="#1a1a1a" />
        </View>
        
        <Text style={[styles.title, { color: isOvertime ? '#ef4444' : '#a3a3a3' }]}>{title}</Text>
        <Text style={[styles.time, { color: isActive ? '#ffffff' : '#d4d4d4' }]}>{formatTime(totalDisplayTime)}</Text>
        {isActive && <Text style={styles.activeLabel}>TRACKING</Text>}
      </TouchableOpacity>
    </View>
  );
};

export default function WatchDashboard({ onOpenHistory, onOpenSettings }) {
  const [now, setNow] = useState(Date.now());
  const pauseAll = useTimeStore((state) => state.pauseAll);
  const activeTask = useTimeStore((state) => state.activeTask);
  const { width, height } = useWindowDimensions();

  const tasks = [
    { id: '1', taskId: 'parttime', title: 'PART TIME' },
    { id: '2', taskId: 'work', title: 'WORK' },
    { id: '3', taskId: 'daily', title: 'DAILY' },
    { id: '4', taskId: 'sleep', title: 'SLEEP' },
  ];

  useEffect(() => {
    if (!activeTask) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [activeTask]);

  return (
    <View style={styles.container}>
      <FlatList
        data={tasks}
        horizontal // Triggers the left/right swipe behavior
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <FullScreenTaskCard item={item} now={now} screenWidth={width} screenHeight={height} />
        )}
        showsHorizontalScrollIndicator={false}
        snapToInterval={width} // Snaps horizontally based on screen width
        snapToAlignment="start"
        decelerationRate="fast"
        ListFooterComponent={
          // This acts as the 5th horizontal screen
          <View style={[styles.footerContainer, { height: height, width: width }]}>
            <TouchableOpacity style={styles.footerBtn} onPress={pauseAll}>
              <Text style={styles.footerBtnText}>{activeTask ? "Stop Tracking" : "Currently Idle"}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.footerBtn} onPress={onOpenHistory}>
              <Text style={styles.footerBtnText}>History Ledger</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.footerBtn} onPress={onOpenSettings}>
              <Text style={styles.footerBtnText}>Adjust Targets</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  cardContainer: { justifyContent: 'center', alignItems: 'center' },
  touchTarget: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  svgAbsolute: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: -1, 
  },
  title: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 },
  time: { fontSize: 20, fontWeight: '600' },
  activeLabel: { fontSize: 10, color: '#3b82f6', fontWeight: 'bold', marginTop: 4, letterSpacing: 2 },
  footerContainer: { justifyContent: 'center', alignItems: 'center', gap: 15 },
  footerBtn: { backgroundColor: '#111', paddingVertical: 12, paddingHorizontal: 30, borderRadius: 30, width: '75%', alignItems: 'center' },
  footerBtnText: { color: '#fff', fontSize: 12, fontWeight: '600', textTransform: 'uppercase' }
});