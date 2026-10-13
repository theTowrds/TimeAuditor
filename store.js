import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GIST_ID, GITHUB_TOKEN } from './secrets';

const getTodayString = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const initialBudgets = {
  parttime: 4 * 3600000,
  work: 6 * 3600000,
  daily: 6 * 3600000,
  sleep: 7 * 3600000,
};

const initialToday = { parttime: 0, work: 0, daily: 0, sleep: 0 };

export const useTimeStore = create(
  persist(
    (set, get) => ({
      activeTask: null,
      lastActiveTimestamp: null,
      currentDate: getTodayString(),
      budgets: initialBudgets,
      today: initialToday,
      
      // Timestamp & Sync State
      todayLogs: [],     // Active timestamps for the current 24h cycle
      history: {},       // Daily summary totals for the Watch UI History View
      dailyLogs: {},     // Sealed 24h timestamp arrays keyed by YYYY-MM-DD
      syncedDates: [],   // Tracks which days have safely reached GitHub

      flushSyncQueue: async () => {
        const { dailyLogs, history, syncedDates } = get();
        
        // Find any sealed days that haven't been pushed to GitHub yet
        const unsyncedDates = Object.keys(dailyLogs).filter(
          (date) => !syncedDates.includes(date)
        );

        if (unsyncedDates.length === 0) return;

        // Batch them into the Gist files payload
        const filesPayload = {};
        unsyncedDates.forEach((date) => {
          filesPayload[`${date}.json`] = {
            content: JSON.stringify(
              {
                date,
                syncedAt: new Date().toISOString(),
                totals: history[date] || {},
                logs: dailyLogs[date] || [],
              },
              null,
              2
            ),
          };
        });

        try {
          const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${GITHUB_TOKEN}`,
              Accept: 'application/vnd.github+json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ files: filesPayload }),
          });

          if (response.ok) {
            set((state) => ({
              syncedDates: [...new Set([...state.syncedDates, ...unsyncedDates])],
            }));
          }
        } catch (error) {
          // If watch is offline, files stay in the queue and retry on the next tap
        }
      },

      syncMidnight: () => {
        const trueToday = getTodayString();
        const state = get();

        if (state.currentDate !== trueToday) {
          set((prev) => {
            let prevDayTotals = { ...prev.today };
            let newDayTotals = { ...initialToday };
            let yesterdayLogs = [...(prev.todayLogs || [])];
            let newTodayLogs = [];
            const now = Date.now();
            
            if (prev.activeTask && prev.lastActiveTimestamp) {
              const midnight = new Date(trueToday).getTime();
              
              const timeBeforeMidnight = Math.max(0, midnight - prev.lastActiveTimestamp);
              prevDayTotals[prev.activeTask] += timeBeforeMidnight;
              const timeAfterMidnight = Math.max(0, now - midnight);
              newDayTotals[prev.activeTask] += timeAfterMidnight;

              if (yesterdayLogs.length > 0) {
                const lastIdx = yesterdayLogs.length - 1;
                if (yesterdayLogs[lastIdx].endTime === null) {
                  const end = midnight - 1;
                  yesterdayLogs[lastIdx] = {
                    ...yesterdayLogs[lastIdx],
                    endTime: end,
                    durationMs: end - yesterdayLogs[lastIdx].startTime,
                  };
                }
              }

              newTodayLogs.push({
                taskId: prev.activeTask,
                startTime: midnight,
                endTime: null,
                durationMs: 0,
              });
            }

            return {
              history: { ...prev.history, [prev.currentDate]: prevDayTotals },
              dailyLogs: { ...prev.dailyLogs, [prev.currentDate]: yesterdayLogs },
              today: newDayTotals,
              todayLogs: newTodayLogs,
              currentDate: trueToday,
              lastActiveTimestamp: prev.activeTask ? now : null, 
            };
          });
        }
        
        // Always try to clear the sync queue when the engine checks the time
        get().flushSyncQueue();
      },

      startTask: (taskId) => {
        get().syncMidnight();
        set((state) => {
          if (state.activeTask === taskId) return state;

          const now = Date.now();
          let updatedToday = { ...state.today };
          let updatedLogs = [...(state.todayLogs || [])];

          // Close active session
          if (state.activeTask && state.lastActiveTimestamp) {
            const elapsed = now - state.lastActiveTimestamp;
            updatedToday[state.activeTask] += elapsed;

            if (updatedLogs.length > 0) {
              const lastIdx = updatedLogs.length - 1;
              if (updatedLogs[lastIdx].endTime === null) {
                updatedLogs[lastIdx] = {
                  ...updatedLogs[lastIdx],
                  endTime: now,
                  durationMs: now - updatedLogs[lastIdx].startTime,
                };
              }
            }
          }

          // Open new session
          updatedLogs.push({
            taskId,
            startTime: now,
            endTime: null,
            durationMs: 0,
          });

          return { 
            activeTask: taskId, 
            lastActiveTimestamp: now, 
            today: updatedToday,
            todayLogs: updatedLogs 
          };
        });
        get().flushSyncQueue();
      },

      pauseAll: () => {
        get().syncMidnight();
        set((state) => {
          if (!state.activeTask || !state.lastActiveTimestamp) return state;

          const now = Date.now();
          const elapsed = now - state.lastActiveTimestamp;
          let updatedLogs = [...(state.todayLogs || [])];
          
          if (updatedLogs.length > 0) {
            const lastIdx = updatedLogs.length - 1;
            if (updatedLogs[lastIdx].endTime === null) {
              updatedLogs[lastIdx] = {
                ...updatedLogs[lastIdx],
                endTime: now,
                durationMs: now - updatedLogs[lastIdx].startTime,
              };
            }
          }
          
          return {
            activeTask: null,
            lastActiveTimestamp: null,
            today: {
              ...state.today,
              [state.activeTask]: state.today[state.activeTask] + elapsed,
            },
            todayLogs: updatedLogs
          };
        });
        get().flushSyncQueue();
      },

      updateBudgets: (newBudgets) => set({ budgets: newBudgets }),
    }),
    {
      name: 'time-auditor-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);