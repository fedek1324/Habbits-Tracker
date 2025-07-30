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
} from "@/api";
import IHabbit from "@/types/habbit";

export default function Home() {
  const [habbits, setHabbits] = useState<IHabbit[]>([]);
  const [currentUser, setCurrentUser] = useState(undefined);
  const [activeTab, setActiveTab] = useState<"today" | "history">("today");

  useEffect(() => {
    async function setTodaysHabbits() {
      const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
      const lastResetDate = await getLastResetDate();

      const fetchedHabbits = await getHabits();

      if (!lastResetDate) {
        setLastResetDate(today);
        setHabbits(fetchedHabbits);
      } else if (lastResetDate === today) {
        setHabbits(fetchedHabbits);
      } else {
        const resetedHabbits = fetchedHabbits.map((habbit) => ({
          ...habbit,
          currentCount: 0,
        }));

        // async write new habbits to api
        resetedHabbits.forEach((habbit) => updateHabit(habbit));
        setLastResetDate(today);

        setHabbits(resetedHabbits);
      }
    }
    setTodaysHabbits();
  }, []);

  const handleAdd = (newHabbit: IHabbit) => {
    setHabbits((prev) => [...prev, newHabbit]);

    addHabit(newHabbit)
      .then(() => console.log("Added new habbit"))
      .catch((e) => {
        console.log("Error on add habbit " + e);
      });
  };

  const handleIncrement = (id: string) => {
    const habitToUpdate = habbits.find((habbit) => habbit.id === id);

    if (habitToUpdate) {
      habitToUpdate.currentCount = Math.min(
        habitToUpdate.needCount,
        habitToUpdate.currentCount + 1
      );

      const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
      const todaysEntry = habitToUpdate.history.find(
        (entry) => entry.date === today
      );
      if (todaysEntry) {
        todaysEntry.count = habitToUpdate.currentCount;
      } else {
        habitToUpdate.history.push({
          date: today,
          count: habitToUpdate.currentCount,
        });
      }

      setHabbits((prev) => prev.map((h) => (h.id === id ? habitToUpdate : h)));

      // Async update in API
      if (habitToUpdate) {
        updateHabit(habitToUpdate)
          .then(() => console.log("Updated habbit"))
          .catch(() => {
            // Can show toast on error
            console.error("Error on habbit counter increment");
          });
      }
    }
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

  const handleEdit = (habbit: IHabbit) => {
    const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"

    const todaysEntry = habbit.history.find((entry) => entry.date === today);
    if (todaysEntry) {
      todaysEntry.count = habbit.currentCount;
    } else {
      habbit.history.push({
        date: today,
        count: habbit.currentCount,
      });
    }

    setHabbits((prev) => prev.map((h) => (h.id === habbit.id ? habbit : h)));

    // Async update in API
    if (habbit) {
      updateHabit(habbit)
        .then(() => console.log("Updated habbit"))
        .catch(() => {
          // Can show toast on error
          console.error("Error on habbit edit");
        });
    }
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
                  {habbits.map((habbit) => (
                    <HabitButton
                      key={habbit.id}
                      habbit={habbit}
                      onIncrement={handleIncrement}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  ))}
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