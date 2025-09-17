"use client";

import { use, useCallback, useEffect, useState } from "react";
import HabitButton from "./components/HabbitButton";
import AddHabbit from "./components/AddHabbit";
import IntegrationPannel from "./components/IntegrationPannel";
import BottomNavigation from "./components/BottomNavigation";
import HistoryView from "./components/HistoryView";
import axios from "axios";

// Import write operations from syncManager instead
import {
  addHabit,
  updateHabit,
  deleteHabbit,
  updateHabitCount,
  updateHabitNeedCount,
  getHabits,
  getTodaySnapshot,
  saveDailySnapshot,
  fillHistory,
  initializeHabitsLocalStorage,
} from "@/services/apiLocalStorage";

import { registerSyncFunction, triggerSync } from "@/services/syncManager";

import IHabbit from "@/types/habbit";
import IDailySnapshot from "@/types/dailySnapshot";
import { getDailySnapshots } from "@/services/apiLocalStorage";
import { GoogleState } from "@/types/googleState";
import { useGoogle } from "@/hooks/useGoogle";

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
  const [error, setError] = useState<string>("");
  const [mounted, setMounted] = useState(false);

  homeRenderCount++;
  console.log("Home render. Total: " + homeRenderCount);

  const {
    googleState,
    getGoogleData,
    uploadDataToGoogle,
    spreadsheetId,
    spreadsheetUrl,
    setGoogleRefreshToken,
    setGoolgeAccessToken,
    loadedData,
  } = useGoogle();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (spreadsheetId) {
      registerSyncFunction(async () => await uploadDataToGoogle());
    }
  }, [spreadsheetId]);

  useEffect(() => {
    if (loadedData) {
      const { habits, snapshots } = loadedData;
      setHabits(habits);
      setHabitSnapshots(snapshots);
      initializeHabitsLocalStorage(habits, snapshots);
      fillHistory();
    }
  }, [loadedData]);
  

  const handleSyncNowButtonClick = useCallback(() => {
    // getCurrentData();
  }, []);

  const updateGoogle = async (operation?: string) => {
    console.log("updateGoogle called with operation " + operation);
    if (googleState !== GoogleState.NOT_CONNECTED) {
      // Update google spreadsheet
      // TODO handle error
      await triggerSync(operation);
    }
  };

  const handleAdd = async (newHabbit: IHabbit, needCount: number) => {
    addHabit(newHabbit);

    // Add to today's snapshot to local storage if needed
    const todaySnapshot = getTodaySnapshot();

    todaySnapshot.habbits.push({
      habbitId: newHabbit.id,
      habbitNeedCount: needCount,
      habbitDidCount: 0,
    });
    saveDailySnapshot(todaySnapshot);

    const newSnapshotsArr = getDailySnapshots();

    // Update local state
    setHabits([...habits, newHabbit]);
    setHabitSnapshots(newSnapshotsArr);

    await updateGoogle("handleAdd");
  };

  const handleIncrement = async (id: string) => {
    // Add to today's snapshot to local storage if needed
    const todaySnapshot = getTodaySnapshot();

    const habitData = todaySnapshot.habbits.find((h) => h.habbitId === id);
    if (!habitData) return;

    const newActualCount = Math.min(
      habitData.habbitNeedCount,
      habitData.habbitDidCount + 1
    );

    // Update in snapshot
    updateHabitCount(id, newActualCount);

    const newSnapshotsArr = getDailySnapshots();

    // Update local state
    setHabitSnapshots(newSnapshotsArr);

    await updateGoogle("handleIncrement");
  };

  const handleDelete = async (id: string) => {
    // Update local storage
    deleteHabbit(id);

    const newSnapshotsArr = getDailySnapshots();

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
    // Update local storage
    updateHabitCount(habitChanged.id, newActualCount || 0);
    updateHabitNeedCount(habitChanged.id, newNeedCount || 1);
    // Update habit text if needed
    updateHabit(habitChanged);

    const newSnapshotsArr = getDailySnapshots();

    // Update local state
    setHabitSnapshots(newSnapshotsArr);
    setHabits(
      habits.map((habit) => {
        return habit.id === habitChanged.id ? habitChanged : habit;
      })
    );

    await updateGoogle("handleEdit");
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="max-w-2xl mx-auto bg-white min-h-screen shadow-sm">
          <main className="p-4 pb-20">
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-6">
              Loading...
            </h1>
          </main>
        </div>
      </div>
    );
  }

  const todayDisplayed = new Date().toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
  });

  const todaySnapshot = getTodaySnapshot();
  let displayHabits: DispalyHabbit[] = [];
  if (todaySnapshot) {
    for (const habit of todaySnapshot.habbits) {
      displayHabits.push({
        habitId: habit.habbitId,
        text: habits.find((h) => h.id === habit.habbitId)?.text || "No text",
        needCount: habit.habbitNeedCount,
        actualCount: habit.habbitDidCount,
      });
    }
  }

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
                  state={googleState}
                  spreadSheetUrl={spreadsheetUrl}
                  onSyncNowClick={handleSyncNowButtonClick}
                  onSetGoogleRefreshToken={setGoogleRefreshToken}
                  onSetGoogleAccessToken={setGoolgeAccessToken}
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
            <HistoryView />
          )}
        </main>

        <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    </div>
  );
}
