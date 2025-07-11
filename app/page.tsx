import Image from "next/image";
import HabitButton from "./components/HabbitButton";

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

        <button className="w-full mt-2 p-4 border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center space-x-2 text-gray-500 hover:border-gray-300 hover:text-gray-600 transition-colors">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
              clipRule="evenodd"
            />
          </svg>
          <span>Add habbit</span>
        </button>
      </main>
    </div>
  );
}
