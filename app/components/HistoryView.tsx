"use client";

import { useState } from "react";
import IHabbit from "@/types/habbit";
import { IoCheckmarkCircle } from "react-icons/io5";

interface HistoryViewProps {
  habbits: IHabbit[];
}

type Period = "daily" | "weekly" | "monthly";

const HistoryView: React.FC<HistoryViewProps> = ({ habbits }) => {
  const [selectedPeriod, setSelectedPeriod] = useState<Period>("daily");

  // Функция для получения данных истории за определенный день
  const getHabitsForDate = (date: string) => {
    return habbits.map((habit) => {
      const historyEntry = habit.history.find((h) => h.date === date);
      return {
        ...habit,
        countForDate: historyEntry?.count || 0,
        completedForDate: historyEntry
          ? historyEntry.count >= habit.needCount
          : false,
      };
    });
  };

  // Получаем последние 30 дней для примера
  const getLast30Days = () => {
    const days = [];
    const today = new Date();
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().slice(0, 10);
      
      const habitsForDay = getHabitsForDate(dateString);
      const completedCount = habitsForDay.filter(h => h.completedForDate).length;
      
      days.push({
        date: dateString,
        displayDate: i === 0 ? "Today" : i === 1 ? "Yesterday" : 
          date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        habits: habitsForDay,
        completedCount,
        totalCount: habbits.length,
      });
    }
    
    return days;
  };

  const historyDays = getLast30Days();

  return (
    <div className="pb-20"> {/* Padding for bottom navigation */}
      <h1 className="text-2xl font-semibold text-gray-800 mb-6">History</h1>

      {/* Period Selector */}
      <div className="flex gap-2 mb-6">
        {(["daily", "weekly", "monthly"] as Period[]).map((period) => (
          <button
            key={period}
            onClick={() => setSelectedPeriod(period)}
            className={`
              px-4 py-2 rounded-full text-sm font-medium
              transition-all duration-200
              ${
                selectedPeriod === period
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }
            `}
          >
            {period.charAt(0).toUpperCase() + period.slice(1)}
          </button>
        ))}
      </div>

      {/* History List */}
      <div className="space-y-6">
        {historyDays.map((day) => (
          <div key={day.date} className="border-b border-gray-100 pb-4">
            {/* Day Header */}
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-medium text-gray-900">{day.displayDate}</h3>
              <span className="text-sm text-gray-500">
                {day.completedCount}/{day.totalCount} completed
              </span>
            </div>

            {/* Habits for this day */}
            <div className="space-y-2">
              {day.habits.map((habit) => (
                <div
                  key={habit.id}
                  className={`
                    flex justify-between items-center p-3 rounded-lg
                    ${
                      habit.completedForDate
                        ? "bg-green-50"
                        : "bg-gray-50"
                    }
                  `}
                >
                  <span className="text-sm text-gray-700">{habit.text}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">
                      {habit.countForDate}/{habit.needCount}
                    </span>
                    {habit.completedForDate && (
                      <IoCheckmarkCircle className="w-5 h-5 text-green-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HistoryView;