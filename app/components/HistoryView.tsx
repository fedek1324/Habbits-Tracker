"use client";

import { useState, useEffect } from "react";
import IHabbit from "@/types/habbit";
import { getDailySnapshots, getHabit, getHabits } from "@/apiLocalStorage";
import { IoCheckmarkCircle } from "react-icons/io5";

interface HistoryViewProps {}

// type Period = "daily" | "weekly" | "monthly";

type DailyHistory = {
  date: string;
  habits: {
    habbitId: string;
    habbitText: string;
    habbitNeedCount: number;
    habbitHasCount: number;
  }[];
};

const HistoryView: React.FC<HistoryViewProps> = () => {
  // const [selectedPeriod, setSelectedPeriod] = useState<Period>("daily");
  const [history, setHistory] = useState<DailyHistory[]>([]);

  useEffect(() => {
    const loadHistory = async () => {
      const history = await getLast30DaysHistory();
      setHistory(history);
    };
    loadHistory();
  }, []);

  // Get the last 30 days for example
  const getLast30DaysHistory = async (): Promise<Array<DailyHistory>> => {
    const daysHistory = [];
    const today = new Date();

    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().slice(0, 10);

      const habitsForDay = await getHabitsForDate(dateString);

      daysHistory.push({
        date: dateString,
        habits: habitsForDay,
      });
    }

    return daysHistory;
  };

  // Function to get history data for a specific day from snapshots
  // Function to format display date based on day index
  const formatDisplayDate = (dateString: string, dayIndex: number): string => {
    if (dayIndex === 0) return "Today";
    if (dayIndex === 1) return "Yesterday";

    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  // Function to calculate completed habits count for a day
  const getCompletedCount = (habits: DailyHistory["habits"]): number => {
    return habits.filter((h) => h.habbitHasCount >= h.habbitNeedCount).length;
  };

  // Function to get total habits count for a day
  const getTotalCount = (habits: DailyHistory["habits"]): number => {
    return habits.length;
  };

  const getHabitsForDate = async (
    date: string
  ): Promise<
    Array<{
      habbitId: string;
      habbitText: string;
      habbitNeedCount: number;
      habbitHasCount: number;
    }>
  > => {
    const snapshots = await getDailySnapshots();

    const snapshot = snapshots.find((s) => s.date === date);
    if (!snapshot) {
      // If no snapshot exists for this day, return empty array
      return [];
    }

    // Combine information from snapshot with current habits
    return await Promise.all(
      snapshot.habbits.map(async (habit) => {
        const habbit = await getHabit(habit.habbitId);
        const habbitText = habbit?.text;
        return {
          habbitId: habbit?.id || "No id",
          habbitText: habbitText || "No name",
          habbitHasCount: habit.habbitDidCount || 0,
          habbitNeedCount: habit.habbitNeedCount || 1,
        };
      })
    );
  };

  return (
    <div className="pb-20">
      {" "}
      {/* Padding for bottom navigation */}
      <h1 className="text-2xl font-semibold text-gray-800 mb-6">History</h1>
      {/* Period Selector */}
      {/* <div className="flex gap-2 mb-6">
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
      </div> */}
      {/* History List */}
      <div className="space-y-6">
        {history.map((day) => (
          <div key={day.date} className="border-b border-gray-100 pb-4">
            {/* Day Header */}
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-medium text-gray-900">
                {formatDisplayDate(day.date, history.indexOf(day))}
              </h3>
              {getTotalCount(day.habits) !== 0 && (
                <span className="text-sm text-gray-500">
                  {getCompletedCount(day.habits)}/{getTotalCount(day.habits)}{" "}
                  completed
                </span>
              )}
            </div>

            {/* Habits for this day */}
            <div className="space-y-2">
              {day.habits.length > 0 ? (
                day.habits.map((habit) => (
                  <div
                    key={habit.habbitId}
                    className={`
                      flex justify-between items-center p-3 rounded-lg
                      ${
                        habit.habbitHasCount === habit.habbitNeedCount
                          ? "bg-green-50"
                          : "bg-gray-50"
                      }
                    `}
                  >
                    <span className="text-sm text-gray-700">
                      {habit.habbitText}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">
                        {habit.habbitHasCount}/{habit.habbitNeedCount}
                      </span>
                      {habit.habbitHasCount === habit.habbitNeedCount && (
                        <IoCheckmarkCircle className="w-5 h-5 text-green-600" />
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-3 rounded-lg bg-gray-50 text-center">
                  <span className="text-sm text-gray-500">
                    No habits for this day
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HistoryView;
