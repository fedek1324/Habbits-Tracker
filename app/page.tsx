"use client";

import HabitButton from "./components/HabbitButton";
import AddHabbit from "./components/AddHabbit";
import IntegrationPannel from "./components/IntegrationPannel";
import {
  getHabits,
  updateHabit,
  getLastResetDate,
  setLastResetDate,
  deleteHabbit,
  addHabit,
} from "@/api";
import { useEffect, useState } from "react";
import IHabbit from "@/types/habbit";

export default function Home() {
  const [habbits, setHabbits] = useState<IHabbit[]>([]);
  const [currentUser, setCurrentUser] = useState(undefined);

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
    const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"

    const habitToUpdate = habbits.find((habbit) => habbit.id === id);

    if (habitToUpdate) {
      habitToUpdate.currentCount = Math.min(
        habitToUpdate.needCount,
        habitToUpdate.currentCount + 1
      );

      const lastEntry = habitToUpdate.history.find(
        (entry) => entry.date === today
      );
      if (lastEntry) {
        lastEntry.count = habitToUpdate.currentCount;
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
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-4 sm:p-8 bg-gray-100">
      <main className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-md sm:max-w-2xl row-start-2 flex flex-col gap-6 items-center sm:items-start">
        <h1 className="text-center text-xl sm:text-2xl font-semibold text-gray-800">
          {habbits.length > 0
            ? `Hello! Todays' habbits:`
            : "Hello! Add habbit using the button below"}
        </h1>

        {/*Google integration panel */}
        <IntegrationPannel currentUser={currentUser} />

        {/* Habbits list */}
        {habbits.length > 0 && (
          <div className="w-full space-y-4">
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
      </main>
    </div>
  );
}
