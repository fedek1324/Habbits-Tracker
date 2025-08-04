"use client";

import { useEffect, useState } from "react";
import HabitButton from "./components/HabbitButton";
import AddHabbit from "./components/AddHabbit";
// import IntegrationPannel from "./components/IntegrationPannel";
import BottomNavigation from "./components/BottomNavigation";
import HistoryView from "./components/HistoryView";
import {
  getHabits,
  updateHabit,
  deleteHabbit,
  addHabit,
  getTodaySnapshot,
  saveDailySnapshot,
  updateHabitCount,
  updateHabitNeedCount,
} from "@/api";
import IHabbit from "@/types/habbit";

type DispalyHabbit = {
  habitId: string,
  text: string,
  needCount: number,
  actualCount: number
}

export default function Home() {
  const [habitsDisplayData, setHabits] = useState<Array<DispalyHabbit>>([]);
  // const [currentUser, setCurrentUser] = useState(undefined);
  const [activeTab, setActiveTab] = useState<"today" | "history">("today");

  useEffect(() => {
    async function initializeHabits() {
      let habits: Array<DispalyHabbit> = [];
      let todaySnapshot = await getTodaySnapshot();
      const fetchedHabits = await getHabits();

      for (const habit of todaySnapshot.habbits) {
        habits.push({
          habitId: habit.habbitId,
          text: fetchedHabits.find((h) => h.id === habit.habbitId)?.text || "No text",
          needCount: habit.habbitNeedCount,
          actualCount: habit.habbitDidCount
        });
      }

      setHabits(habits);
    }

    initializeHabits();
  }, []);

  const handleAdd = async (newHabbit: IHabbit, needCount: number) => {
    setHabits((prev) => [...prev, {
      habitId: newHabbit.id,
      text: newHabbit.text,
      actualCount: 0,
      needCount: needCount
    }]);

    // Add to today's snapshot
    const todaySnapshot = await getTodaySnapshot();

    todaySnapshot.habbits.push({
      habbitId: newHabbit.id,
      habbitNeedCount: needCount,
      habbitDidCount: 0,
    });
    await saveDailySnapshot(todaySnapshot);

    await addHabit(newHabbit);
  };

  const handleIncrement = async (id: string) => {
    const habbitDisplayData = habitsDisplayData.find((h) => h.habitId === id);
    if (!habbitDisplayData) return;

    const newActualCount = Math.min(
      habbitDisplayData.needCount,
      habbitDisplayData.actualCount + 1
    );

    // Update local state
    setHabits((prev) => prev.map((h) => 
      h.habitId === id 
        ? { ...h, actualCount: newActualCount }
        : h
    ));

    // Update in snapshot
    await updateHabitCount(id, newActualCount);
  };

  const handleDelete = async (id: string) => {
    setHabits((prev) => prev.filter((h) => h.habitId !== id))

    await deleteHabbit(id);
  };

  const handleEdit = async (
    habbit: IHabbit,
    newNeedCount?: number,
    newActualCount?: number
  ) => {
    // Update habit text
    setHabits((prev) => prev.map((h) => (h.habitId === habbit.id ? {
      habitId: habbit.id,
      text: habbit.text,
      needCount: newNeedCount || 1,
      actualCount: newActualCount || 0
    } : h)));

    updateHabitCount(habbit.id, newActualCount || 0);
    updateHabitNeedCount(habbit.id, newNeedCount || 1);

    // Update habit info
    await updateHabit(habbit);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-2xl mx-auto bg-white min-h-screen shadow-sm">
        <main className="p-4 pb-20">
          {activeTab === "today" ? (
            <>
              <h1 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-6">
                {habitsDisplayData.length > 0
                  ? `Hello! Today's habits:`
                  : "Hello! Add habit using the button below"}
              </h1>

              {/*Google integration panel */}
              {/*<div className="mb-4">
                <IntegrationPannel currentUser={currentUser} />
              </div>*/}

              {/* Habbits list */}
              {habitsDisplayData.length > 0 && (
                <div className="mb-4 w-full space-y-4">
                  {habitsDisplayData.map((habit) => {
                    return (
                      <HabitButton
                        key={habit.habitId}
                        habbit={{
                          id: habit.habitId,
                          text: habit.text
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
