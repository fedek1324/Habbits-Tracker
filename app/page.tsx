"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import HabitButton from "./components/HabbitButton";
import AddHabbit from "./components/AddHabbit";
import IntegrationPannel from "./components/IntegrationPannel";
import BottomNavigation from "./components/BottomNavigation";
import HistoryView from "./components/HistoryView";

// Import write operations from syncManager instead
import {
  addHabit,
  updateHabit,
  deleteHabbit,
  updateHabitCount,
  updateHabitNeedCount,
  getTodaySnapshot,
  saveDailySnapshot,
  fillHistory,
  initializeHabitsLocalStorage,
  getHabits,
} from "@/app/services/apiLocalStorage";

import { registerSyncFunction, triggerSync } from "@/app/services/syncManager";

import IHabbit from "@/types/habbit";
import IDailySnapshot from "@/types/dailySnapshot";
import { getDailySnapshots } from "@/app/services/apiLocalStorage";
import { GoogleState } from "@/types/googleState";
import { useGoogle } from "@/app/hooks/useGoogle";

type DispalyHabbit = {
  habitId: string;
  text: string;
  needCount: number;
  actualCount: number;
};

let homeRenderCount = 0;

export default function Home() {
  const [habits, setHabits] = useState<Array<IHabbit>>([]);
  const [snapshots, setHabitSnapshots] = useState<Array<IDailySnapshot>>([]);
  const [activeTab, setActiveTab] = useState<"today" | "history">("today");
  // const [error, setError] = useState<string>("");
  const [today, setToday] = useState<Date>();

  homeRenderCount++;
  console.log("Home render. Total: " + homeRenderCount);
  
  const {
    googleState,
    getGoogleData,
    uploadDataToGoogle,
    spreadsheetUrl,
    setGoogleRefreshToken,
    setGoolgeAccessToken,
    loadedData,
  } = useGoogle(today);

  // const prevGoogleStateRef = useRef<GoogleState>(GoogleState.NOT_CONNECTED);
  
  useEffect(() => {    
    // for hydration bypass
    // leave render function pure
    const today = new Date();
    setToday(today);

    // fill history in local storage
    fillHistory(today);

    // get habits data from local storage
    const habits = getHabits();
    const snapshots = getDailySnapshots(today);
    setHabits(habits);
    setHabitSnapshots(snapshots);
  }, []);

  (useCallback(
    () => {
      if (today) {
        registerSyncFunction(async () => await uploadDataToGoogle(today))
      }
    },
    [uploadDataToGoogle, today]
  ))();

  // registerSyncFunction(async () => await uploadDataToGoogle())

  useEffect(() => {
    if (loadedData && today) {
      const { habits, snapshots } = loadedData;
      // TODO maybe fillHistory and then getHabits and getSnapshots
      setHabits(habits);
      setHabitSnapshots(snapshots);
      initializeHabitsLocalStorage(habits, snapshots);
      fillHistory(today);
    }
  }, [loadedData, today]);

  const handleSyncNowButtonClick = useCallback(() => {
    if (!today) {
      return;
    }
    getGoogleData(today);
  }, [getGoogleData, today]);

  const updateGoogle = async (operation?: string) => {
    console.log("updateGoogle called with operation " + operation);
    if (googleState !== GoogleState.NOT_CONNECTED) {
      // Update google spreadsheet
      // TODO handle error
      await triggerSync(operation);
    }
  };

  const handleAdd = async (newHabbit: IHabbit, needCount: number) => {
    if (!today) {
      return;
    }
    addHabit(newHabbit);

    // Add to today's snapshot to local storage if needed
    const todaySnapshot = getTodaySnapshot(today);

    todaySnapshot.habbits.push({
      habbitId: newHabbit.id,
      habbitNeedCount: needCount,
      habbitDidCount: 0,
    });
    saveDailySnapshot(todaySnapshot);

    const newSnapshotsArr = getDailySnapshots(today);

    // Update local state
    setHabits([...habits, newHabbit]);
    setHabitSnapshots(newSnapshotsArr);

    await updateGoogle("handleAdd");
  };

  const handleIncrement = async (id: string) => {
    if (!today) {
      return;
    }
    // Add to today's snapshot to local storage if needed
    const todaySnapshot = getTodaySnapshot(today);

    const habitData = todaySnapshot.habbits.find((h) => h.habbitId === id);
    if (!habitData) return;

    const newActualCount = Math.min(
      habitData.habbitNeedCount,
      habitData.habbitDidCount + 1
    );

    // Update in snapshot
    updateHabitCount(id, newActualCount, today);

    const newSnapshotsArr = getDailySnapshots(today);

    // Update local state
    setHabitSnapshots(newSnapshotsArr);

    await updateGoogle("handleIncrement");
  };

  const handleDelete = async (id: string) => {
    if (!today) {
      return;
    }
    // Update local storage
    deleteHabbit(id, today);

    const newSnapshotsArr = getDailySnapshots(today);

    // Update local state
    // dont remove from habits because this habit can be used in history
    setHabitSnapshots(newSnapshotsArr);

    await updateGoogle("handleDelete");
  };

  const handleEdit = async (
    habitChanged: IHabbit,
    newNeedCount?: number,
    newActualCount?: number
  ) => {
    if (!today) {
      return;
    }
    // Update local storage
    updateHabitCount(habitChanged.id, newActualCount || 0, today);
    updateHabitNeedCount(habitChanged.id, newNeedCount || 1, today);
    // Update habit text if needed
    updateHabit(habitChanged);

    const newSnapshotsArr = getDailySnapshots(today);

    // Update local state
    setHabitSnapshots(newSnapshotsArr);
    setHabits(
      habits.map((habit) => {
        return habit.id === habitChanged.id ? habitChanged : habit;
      })
    );

    await updateGoogle("handleEdit");
  };

  const onGooleLogin = async () => {
    if (!today) {
      return;
    }
    await getGoogleData(today);
  }

  const displayHabits: DispalyHabbit[] = useMemo(() => {
    if (!today) {
      return [];
    }
    const res = [];
    const todayDay = today.toISOString().split("T")[0];
    const todaySnapshot = snapshots.find((snapshot => snapshot.date === todayDay));
    if (todaySnapshot) {
      for (const habit of todaySnapshot.habbits) {
        res.push({
          habitId: habit.habbitId,
          text: habits.find((h) => h.id === habit.habbitId)?.text || "No text",
          needCount: habit.habbitNeedCount,
          actualCount: habit.habbitDidCount,
        });
      }
    }
    return res;
  }, [today, habits, snapshots]);

  const todayDisplayed = today ? today.toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
  }) : "loading...";

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-2xl mx-auto bg-white min-h-screen shadow-sm">
        <main className="p-4 pb-20">
          {activeTab === "today" ? (
            <>
              <h1 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-6">
                {displayHabits.length > 0
                  ? `Habits for today (${todayDisplayed}):`
                  : "Add habit using the button below"}
              </h1>

              {/*Google integration panel */}
              <div className="mb-4">
                <IntegrationPannel
                  state={googleState ?? GoogleState.NOT_CONNECTED}
                  spreadSheetUrl={spreadsheetUrl}
                  onSyncNowClick={handleSyncNowButtonClick}
                  onSetGoogleRefreshToken={setGoogleRefreshToken}
                  onSetGoogleAccessToken={setGoolgeAccessToken}
                  onLogin={onGooleLogin}
                />
              </div>

              {/* Habbits list */}
              {displayHabits.length > 0 && (
                <div className="mb-4 w-full space-y-4">
                  {displayHabits.map((habit) => {
                    return (
                      <HabitButton
                        key={habit.habitId}
                        habbit={{
                          id: habit.habitId,
                          text: habit.text,
                        }}
                        currentCount={habit.actualCount}
                        needCount={habit.needCount}
                        onIncrement={handleIncrement}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                      />
                    );
                  })}
                </div>
              )}

              <AddHabbit onAdd={handleAdd} />
            </>
          ) : (
            <HistoryView habits={habits} snapshots={snapshots} />
          )}
        </main>

        <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    </div>
  );
}
