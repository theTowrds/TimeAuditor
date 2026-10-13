import React, { useEffect, useRef, useState } from 'react';
import { AppState, View, BackHandler } from 'react-native';
import { useTimeStore } from './store';
import WatchDashboard from './WatchDashboard';
import HistoryView from './HistoryView';
import SettingsView from './SettingsView';

export default function App() {
  const appState = useRef(AppState.currentState);
  const [currentView, setCurrentView] = useState('dashboard');

  useEffect(() => {
    useTimeStore.getState().syncMidnight();

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        useTimeStore.getState().syncMidnight();
      }
      appState.current = nextAppState;
    });

    return () => subscription.remove();
  }, []);

  // --- NATIVE WEAR OS SWIPE-TO-DISMISS NAVIGATION ---
  useEffect(() => {
    const backAction = () => {
      // If we aren't on the dashboard, intercept the swipe and go back to dashboard
      if (currentView !== 'dashboard') {
        setCurrentView('dashboard');
        return true; 
      }
      // If we are on the dashboard, let the OS handle the swipe (closes the app)
      return false; 
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [currentView]);

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {currentView === 'dashboard' && (
        <WatchDashboard 
          onOpenHistory={() => setCurrentView('history')}
          onOpenSettings={() => setCurrentView('settings')}
        />
      )}
      {currentView === 'history' && (
        <HistoryView />
      )}
      {currentView === 'settings' && (
        <SettingsView onClose={() => setCurrentView('dashboard')} />
      )}
    </View>
  );
}