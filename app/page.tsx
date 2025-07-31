"use client";

import { useEffect, useState } from "react";
import HabitButton from "./components/HabbitButton";
import AddHabbit from "./components/AddHabbit";
import IntegrationPannel from "./components/IntegrationPannel";
import BottomNavigation from "./components/BottomNavigation";
import HistoryView from "./components/HistoryView";
import {
  getHabits,
  updateHabit,
  getLastResetDate,
  setLastResetDate,
  deleteHabbit,
  addHabit,
  getTodaySnapshot,
  saveDailySnapshot,
  getCurrentNeedCount,
  getCurrentActualCount,
  updateHabitCount,
  updateHabitNeedCount,
} from "@/api";
import IHabbit from "@/types/habbit";

export default function Home() {
  const [habbits, setHabbits] = useState<IHabbit[]>([]);
  const [habitCounts, setHabitCounts] = useState<{[habitId: string]: {needCount: number, actualCount: number}}>({});
  const [currentUser, setCurrentUser] = useState(undefined);
  const [activeTab, setActiveTab] = useState<"today" | "history">("today");

  useEffect(() => {
    async function initializeHabits() {
      // const today = new Date().toISOString().slice(0, 10);
      const today = "2025-08-04";
      const lastResetDate = await getLastResetDate();
      const fetchedHabits = await getHabits();
      
      // Check if we need to create new day
      if (!lastResetDate || lastResetDate !== today) {
        // Create today's snapshot with existing habits

        const todaySnapshot = {
          date: today,
          habbits: await Promise.all(fetchedHabits.map(async (habit) => ({
            habbitId: habit.id,
            habbitNeedCount: await getCurrentNeedCount(habit.id),
            habbitDidCount: 0
          })))
        };
        
        await saveDailySnapshot(todaySnapshot);
        await setLastResetDate(today);
      }
      
      // Load today's counts
      const counts: {[habitId: string]: {needCount: number, actualCount: number}} = {};
      for (const habit of fetchedHabits) {
        counts[habit.id] = {
          needCount: await getCurrentNeedCount(habit.id),
          actualCount: await getCurrentActualCount(habit.id)
        };
      }
      
      setHabbits(fetchedHabits);
      setHabitCounts(counts);
    }
    
    initializeHabits();
  }, []);

  const handleAdd = async (newHabbit: IHabbit, needCount: number) => {
    setHabbits((prev) => [...prev, newHabbit]);
    
    // Add to today's snapshot
    const todaySnapshot = await getTodaySnapshot();
    if (todaySnapshot) {
      todaySnapshot.habbits.push({
        habbitId: newHabbit.id,
        habbitNeedCount: needCount,
        habbitDidCount: 0
      });
      await saveDailySnapshot(todaySnapshot);
    }
    
    // Update local counts
    setHabitCounts(prev => ({
      ...prev,
      [newHabbit.id]: { needCount: needCount, actualCount: 0 }
    }));

    addHabit(newHabbit)
      .then(() => console.log("Added new habbit"))
      .catch((e) => {
        console.log("Error on add habbit " + e);
      });
  };

  const handleIncrement = async (id: string) => {
    const currentCounts = habitCounts[id];
    if (!currentCounts) return;
    
    const newActualCount = Math.min(
      currentCounts.needCount,
      currentCounts.actualCount + 1
    );
    
    // Update local state
    setHabitCounts(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        actualCount: newActualCount
      }
    }));
    
    // Update in snapshot
    await updateHabitCount(id, newActualCount);
  };

  const handleDelete = (id: string) => {
    setHabbits((prev) => prev.filter((h) => h.id !== id));
    deleteHabbit(id)
      .then(() => console.log("Habbit deleted"))
      .catch(() => {
        // Can show toast on error
        console.error("Error on habbit delete");
      });
  };

  const handleEdit = async (habbit: IHabbit, newNeedCount?: number, newActualCount?: number) => {
    // Update habit text
    setHabbits((prev) => prev.map((h) => (h.id === habbit.id ? habbit : h)));
    
    // Update counts if provided
    if (newNeedCount !== undefined) {
      await updateHabitNeedCount(habbit.id, newNeedCount);
      setHabitCounts(prev => ({
        ...prev,
        [habbit.id]: {
          ...prev[habbit.id],
          needCount: newNeedCount
        }
      }));
    }
    
    if (newActualCount !== undefined) {
      await updateHabitCount(habbit.id, newActualCount);
      setHabitCounts(prev => ({
        ...prev,
        [habbit.id]: {
          ...prev[habbit.id],
          actualCount: newActualCount
        }
      }));
    }

    // Update habit info
    updateHabit(habbit)
      .then(() => console.log("Updated habbit"))
      .catch(() => {
        console.error("Error on habbit edit");
      });
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-2xl mx-auto bg-white min-h-screen shadow-sm">
        <main className="p-4 pb-20">
          {activeTab === "today" ? (
            <>
              <h1 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-6">
                {habbits.length > 0
                  ? `Hello! Today's habits:`
                  : "Hello! Add habit using the button below"}
              </h1>

              {/*Google integration panel */}
              <div className="mb-4">
                <IntegrationPannel currentUser={currentUser} />
              </div>

              {/* Habbits list */}
              {habbits.length > 0 && (
                <div className="mb-4 w-full space-y-4">
                  {habbits.map((habbit) => {
                    const counts = habitCounts[habbit.id] || { needCount: 1, actualCount: 0 };
                    return (
                      <HabitButton
                        key={habbit.id}
                        habbit={habbit}
                        currentCount={counts.actualCount}
                        needCount={counts.needCount}
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
            <HistoryView habbits={habbits} />
          )}
        </main>

        <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    </div>
  );
}