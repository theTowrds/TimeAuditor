import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useTimeStore } from './store';

const getLast7Days = () => {
  const dates = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateString = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const dayName = d.toLocaleDateString('en-US', { weekday: 'narrow' }); 
    dates.push({ dateString, dayName });
  }
  return dates;
};

const TaskHistoryRow = ({ title, taskId, last7Days }) => {
  const history = useTimeStore((state) => state.history);
  const budget = useTimeStore((state) => state.budgets[taskId]);

  return (
    <View style={styles.row}>
      <Text style={styles.rowTitle}>{title}</Text>
      <View style={styles.chartContainer}>
        {last7Days.map((day, index) => {
          const dayData = history[day.dateString] || {};
          const accumulatedMs = dayData[taskId] || 0;
          const isOvertime = accumulatedMs > budget;
          const progressPercentage = Math.min(1, accumulatedMs / budget);
          const barHeight = Math.max(2, progressPercentage * 100);
          const barColor = isOvertime ? '#ef4444' : (progressPercentage > 0.9 ? '#3b82f6' : '#333333');

          return (
            <View key={index} style={styles.barWrapper}>
              <View style={styles.barBackground}>
                <View style={[styles.barFill, { height: `${barHeight}%`, backgroundColor: barColor }]} />
              </View>
              <Text style={styles.dayLabel}>{day.dayName}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

export default function HistoryView() {
  const last7Days = useMemo(() => getLast7Days(), []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {/* Pushed down slightly to account for the curved top glass */}
      <View style={{ height: 30 }} />
      <Text style={styles.header}>Last 7 Days</Text>
      
      <TaskHistoryRow title="Part-Time" taskId="parttime" last7Days={last7Days} />
      <TaskHistoryRow title="Work" taskId="work" last7Days={last7Days} />
      <TaskHistoryRow title="Daily Time" taskId="daily" last7Days={last7Days} />
      <TaskHistoryRow title="Sleep" taskId="sleep" last7Days={last7Days} />
      <View style={{ height: 60 }} /> 
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scrollContent: { alignItems: 'center' },
  header: { color: '#fff', fontSize: 14, fontWeight: 'bold', marginBottom: 20 },
  row: { width: '100%', marginBottom: 24, alignItems: 'center' },
  rowTitle: { color: '#a3a3a3', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', marginBottom: 10, letterSpacing: 1 },
  chartContainer: { flexDirection: 'row', justifyContent: 'space-between', width: 140 },
  barWrapper: { alignItems: 'center', width: 14 },
  barBackground: { height: 40, width: 8, backgroundColor: '#111', borderRadius: 4, justifyContent: 'flex-end', overflow: 'hidden' },
  barFill: { width: '100%', borderRadius: 4 },
  dayLabel: { color: '#737373', fontSize: 8, marginTop: 4 }
});