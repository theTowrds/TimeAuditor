import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Vibration } from 'react-native';
import { useTimeStore } from './store';

const msToHrs = (ms) => ms / 3600000;
const hrsToMs = (hrs) => hrs * 3600000;

const formatHrsDisplay = (hrs) => {
  const h = Math.floor(hrs);
  const m = (hrs % 1) * 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

const BudgetStepper = ({ title, hours, onAdjust }) => (
  <View style={styles.stepperContainer}>
    <Text style={styles.stepperTitle}>{title}</Text>
    <View style={styles.stepperControls}>
      <TouchableOpacity style={styles.button} onPress={() => onAdjust(-0.5)}>
        <Text style={styles.buttonText}>-</Text>
      </TouchableOpacity>
      <Text style={styles.valueText}>{formatHrsDisplay(hours)}</Text>
      <TouchableOpacity style={styles.button} onPress={() => onAdjust(0.5)}>
        <Text style={styles.buttonText}>+</Text>
      </TouchableOpacity>
    </View>
  </View>
);

export default function SettingsView({ onClose }) {
  const currentBudgets = useTimeStore((state) => state.budgets);
  const updateBudgets = useTimeStore((state) => state.updateBudgets);

  const [draft, setDraft] = useState({
    parttime: msToHrs(currentBudgets.parttime),
    work: msToHrs(currentBudgets.work),
    daily: msToHrs(currentBudgets.daily),
    sleep: msToHrs(currentBudgets.sleep),
  });

  const handleAdjust = (taskId, delta) => {
    Vibration.vibrate(20); 
    setDraft((prev) => ({ ...prev, [taskId]: Math.max(0.5, prev[taskId] + delta) }));
  };

  const handleSave = () => {
    Vibration.vibrate([0, 50, 100, 50]);
    updateBudgets({
      parttime: hrsToMs(draft.parttime),
      work: hrsToMs(draft.work),
      daily: hrsToMs(draft.daily),
      sleep: hrsToMs(draft.sleep),
    });
    // Triggers the state change back to 'dashboard' in App.js
    onClose(); 
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={{ height: 30 }} />
      <Text style={styles.header}>Target Hours</Text>

      <BudgetStepper title="Part-Time" hours={draft.parttime} onAdjust={(delta) => handleAdjust('parttime', delta)} />
      <BudgetStepper title="Work" hours={draft.work} onAdjust={(delta) => handleAdjust('work', delta)} />
      <BudgetStepper title="Daily Time" hours={draft.daily} onAdjust={(delta) => handleAdjust('daily', delta)} />
      <BudgetStepper title="Sleep" hours={draft.sleep} onAdjust={(delta) => handleAdjust('sleep', delta)} />

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>Save Targets</Text>
      </TouchableOpacity>
      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scrollContent: { alignItems: 'center' },
  header: { color: '#fff', fontSize: 14, fontWeight: 'bold', marginBottom: 20 },
  stepperContainer: { width: '100%', marginBottom: 24, alignItems: 'center' },
  stepperTitle: { color: '#a3a3a3', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 1 },
  stepperControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#111', borderRadius: 30, paddingHorizontal: 5, paddingVertical: 5 },
  button: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#222', justifyContent: 'center', alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginTop: -2 },
  valueText: { color: '#fff', fontSize: 16, fontWeight: '700', width: 70, textAlign: 'center' },
  saveButton: { marginTop: 10, backgroundColor: '#3b82f6', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 24 },
  saveButtonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' }
});