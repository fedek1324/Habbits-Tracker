import Image from "next/image";
import HabitButton from "./components/HabbitButton";
import AddHabbit from "./components/AddHabbit";

export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-4 sm:p-8 bg-gray-100">
      <main className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-md sm:max-w-2xl row-start-2 flex flex-col gap-6 items-center sm:items-start">
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-800">
          Hello! Todays' habbits:
        </h1>

        {/* Список привычек */}
        <div className="w-full space-y-4">
          <HabitButton
            title="Медитация"
            bgColor="bg-purple-50"
          />

          <HabitButton
            title="Вода"
            bgColor="bg-blue-50"
          />

          <HabitButton
            title="Читать"
            bgColor="bg-orange-50"
          />
        </div>

        <AddHabbit />
      </main>
    </div>
  );
}
