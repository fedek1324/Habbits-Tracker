"use client";

import IHabbit from "@/src/app/types/habbit";
import INote from "@/src/app/types/note";
import { IoCheckmarkCircle } from "react-icons/io5";
import IDailySnapshot from "@/src/app/types/dailySnapshot";

interface HistoryViewProps {
  habits: IHabbit[];
  notes: INote[];
  snapshots: IDailySnapshot[];
  today: Date;
}

// type Period = "daily" | "weekly" | "monthly";

type DailyHistory = {
  date: string;
  habits: {
    habbitId: string;
    habbitText: string;
    habbitNeedCount: number;
    habbitDidCount: number;
  }[];
  notes: {
    noteId: string;
    noteName: string;
    noteText: string;
  }[];
};

const HistoryView: React.FC<HistoryViewProps> = ({
  habits,
  notes,
  snapshots,
  today,
}) => {
  // const [selectedPeriod, setSelectedPeriod] = useState<Period>("daily");

  // Transform snapshots to history format
  const history: DailyHistory[] = snapshots
    ? snapshots
        .filter((snapshot) => {
          // today with time 00.00.00 for correct currentDate < today compare
          const today00 = new Date(today.toISOString().split("T")[0]);
          const snapshotDate = new Date(snapshot.date);
          return snapshotDate <= today00;
        })
        .map((snapshot) => ({
          date: snapshot.date,
          habits: snapshot.habbits.map((habbitSnapshot) => {
            const habit = habits.find((h) => h.id === habbitSnapshot.habbitId);
            return {
              habbitId: habbitSnapshot.habbitId,
              habbitText: habit?.text || "Unknown Habit",
              habbitNeedCount: habbitSnapshot.habbitNeedCount,
              habbitDidCount: habbitSnapshot.habbitDidCount,
            };
          }),
          notes: (snapshot.notes || []).map((noteSnapshot) => {
            const note = notes.find((n) => n.id === noteSnapshot.noteId);
            return {
              noteId: noteSnapshot.noteId,
              noteName: note?.name || "Unknown Note",
              noteText: noteSnapshot.noteText,
            };
          }),
        }))
        .reverse()
    : [];

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
    return habits.filter((h) => h.habbitDidCount >= h.habbitNeedCount).length;
  };

  // Function to get total habits count for a day
  const getTotalCount = (habits: DailyHistory["habits"]): number => {
    return habits.length;
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

            {/* Habits and notes for this day */}
            <div className="space-y-2">
              {day.habits.length > 0 || day.notes.length > 0 ? (
                <>
                  {day.habits.map((habit) => (
                    <div
                      key={habit.habbitId}
                      className={`
                        flex justify-between items-center p-3 rounded-lg
                        ${
                          habit.habbitDidCount >= habit.habbitNeedCount
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
                          {habit.habbitDidCount}/{habit.habbitNeedCount}
                        </span>
                        {habit.habbitDidCount >= habit.habbitNeedCount && (
                          <IoCheckmarkCircle className="w-5 h-5 text-green-600" />
                        )}
                      </div>
                    </div>
                  ))}
                  {day.notes
                    .filter(
                      (note) =>
                        note.noteText &&
                        note.noteText.trim() !== "" &&
                        note.noteText !== "No text for that day"
                    )
                    .map((note) => (
                      <div
                        key={note.noteId}
                        className="p-3 rounded-lg bg-blue-50 border-l-4 border-blue-200"
                      >
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-medium text-gray-700">
                            {note.noteName}
                          </span>
                          <span className="text-sm text-gray-600">
                            {note.noteText}
                          </span>
                        </div>
                      </div>
                    ))}
                </>
              ) : (
                <div className="p-3 rounded-lg bg-gray-50 text-center">
                  <span className="text-sm text-gray-500">
                    No habits or notes for this day
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
