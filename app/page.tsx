"use client";

import Image from "next/image";
import HabitButton from "./components/HabbitButton";
import AddHabbit from "./components/AddHabbit";
import { getHabits, updateHabit } from "@/api";
import { useEffect, useState } from "react";
import IHabbit from "@/types/habbit";

export default function Home() {
  const [habbits, setHabbits] = useState<IHabbit[]>([]);

  useEffect(() => {
    getHabits().then((habbits) => setHabbits(habbits));
  }, []);

  const handleAdd = (newHabit: IHabbit) => {
    setHabbits((prev) => [...prev, newHabit]);
  };

const handleIncrement = (id: string) => {
  setHabbits((prev) =>
    prev.map((h) =>
      h.id === id && h.currentCount < h.needCount
        ? { ...h, currentCount: h.currentCount + 1 }
        : h
    )
  );

  // Async update in API
  const habitToUpdate = habbits.find(habbit => habbit.id === id);
  if (habitToUpdate) {
    updateHabit(habitToUpdate).catch(() => {
      // Can show toast on error
      console.error("Error on habbit counter increment");
    });
  }
};

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-4 sm:p-8 bg-gray-100">
      <main className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-md sm:max-w-2xl row-start-2 flex flex-col gap-6 items-center sm:items-start">
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-800">
          Hello! Todays' habbits:
        </h1>

        {/* Список привычек */}
        <div className="w-full space-y-4">
          {habbits.map((habbit) => (
            <HabitButton
              key={habbit.id}
              habbit={habbit}
              onIncrement={handleIncrement}
            />
          ))}
        </div>

        <AddHabbit onAdd={handleAdd} />
      </main>
    </div>
  );
}
