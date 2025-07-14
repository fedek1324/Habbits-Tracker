"use client";

import Image from "next/image";
import HabitButton from "./components/HabbitButton";
import AddHabbit from "./components/AddHabbit";
import { getHabits } from "@/api";
import { useEffect, useState } from "react";
import IHabbit from "@/types/habbit";

function getPastelColorFromId(id: string): string {
  // Простая хеш-функция
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Ограничим hue от 0 до 360
  const hue = Math.abs(hash) % 360;

  // HSL: высокая светлота (80%), малая насыщенность 90%) → пастельные
  return `hsl(${hue}, 80%, 94%)`;
}

export default function Home() {
  const [habbits, setHabbits] = useState<IHabbit[]>([]);

  useEffect(() => {
    getHabits().then((habbits) => setHabbits(habbits));
  }, []);

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
              title={habbit.text}
              currentCount={habbit.currentCount}
              totalCount={habbit.needCount}
              bgColor={getPastelColorFromId(habbit.id)}
            />
          ))}
        </div>

        <AddHabbit />
      </main>
    </div>
  );
}
