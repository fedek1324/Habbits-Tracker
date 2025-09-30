"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import HabitButton from "./components/HabbitButton";
import AddHabbit from "./components/AddHabbit";
import AddNote from "./components/AddNote";
import IntegrationPannel from "./components/IntegrationPannel";
import BottomNavigation from "./components/BottomNavigation";
import HistoryView from "./components/HistoryView";

// Import write operations from syncManager instead
import {
  addHabit,
  updateHabit,
  deleteHabbitFromSnapshot,
  updateHabitCount,
  updateHabitNeedCount,
  getTodaySnapshot,
  saveDailySnapshot,
  fillHistory as fillHistoryLocalStorage,
  initializeHabitsLocalStorage,
  getHabits,
  addNote,
  getNotes,
  updateNote,
  deleteNoteFromSnapshot,
} from "@/app/services/apiLocalStorage";

import {
  registerSyncFunction,
  triggerSync,
  unregisterSyncFunction,
} from "@/app/services/syncManager";

import IHabbit from "@/app/types/habbit";
import IDailySnapshot from "@/app/types/dailySnapshot";
import { getDailySnapshots } from "@/app/services/apiLocalStorage";
import { GoogleState } from "@/app/types/googleState";
import { useGoogle } from "@/app/hooks/useGoogle";
import INote from "./types/note";
import NoteButton from "./components/NoteButton";

type DispalyHabbit = {
  habitId: string;
  text: string;
  needCount: number;
  actualCount: number;
};

type DispalyNote = {
  noteId: string;
  noteName: string;
  noteText: string;
};

let homeRenderCount = 0;

export default function Home() {
  const [habits, setHabits] = useState<Array<IHabbit>>([]);
  const [notes, setNotes] = useState<Array<INote>>([]);
  const [snapshots, setSnapshots] = useState<Array<IDailySnapshot>>([]);
  const [activeTab, setActiveTab] = useState<"today" | "history">("today");
  // const [error, setError] = useState<string>("");
  const [today] = useState<Date>(new Date());

  const [refreshToken, setRefreshTokenPrivate] = useState<string>(
    typeof window !== "undefined"
      ? localStorage.getItem("googleRefreshToken") || ""
      : ""
  );

  const setRefreshToken = (refreshToken: string) => {
    localStorage.setItem("googleRefreshToken", refreshToken || "");
    setRefreshTokenPrivate(refreshToken || "");
  };

  homeRenderCount++;
  console.log("Home: render. Total: " + homeRenderCount);

  const {
    googleState,
    getGoogleData,
    uploadDataToGoogle,
    spreadsheetUrl,
    setGoolgeAccessToken,
    loadedData,
  } = useGoogle(today, refreshToken);

  // const prevGoogleStateRef = useRef<GoogleState>(GoogleState.NOT_CONNECTED);

  useEffect(() => {
    // synchronize habits data with local storage or google
    if (today) {
      if (loadedData) {
        console.log("Home: effect called Getting data from loaded data");
        const { habits: habitsGoogle, notes: notesGoogle, snapshots: snapshotsGoogle } = loadedData;
        initializeHabitsLocalStorage(habitsGoogle, notesGoogle, snapshotsGoogle);
        // fill empty days in local storage
        fillHistoryLocalStorage(today);

        // get proper habits data from local storage
        const habits = getHabits();
        const notes = getNotes();
        const snapshots = getDailySnapshots(today);
        setHabits(habits);
        setNotes(notes);
        setSnapshots(snapshots);
      } else {
        console.log("Home: effect called Getting data from local storage");
        // get from local storage

        // fill history in local storage
        fillHistoryLocalStorage(today);

        // get habits data from local storage
        const habits = getHabits();
        const notes = getNotes();
        const snapshots = getDailySnapshots(today);
        setHabits(habits);
        setNotes(notes);
        setSnapshots(snapshots);
      }
    } else {
      console.log("Home: effect called No today in Home effect");
    }
  }, [today, loadedData]);

  if (loadedData && today) {
    registerSyncFunction(async () => await uploadDataToGoogle(today));
  } else {
    unregisterSyncFunction();
  }

  const handleSyncNowButtonClick = useCallback(() => {
    if (!today) {
      return;
    }
    getGoogleData(today);
  }, [getGoogleData, today]);

  const updateGoogle = async (operation?: string) => {
    console.log("updateGoogle called with operation " + operation);
    if (googleState !== GoogleState.NOT_CONNECTED) {
      // Update google spreadsheet
      // TODO handle error
      await triggerSync(operation);
    }
  };

  const handleAddHabit = async (newHabbit: IHabbit, needCount: number) => {
    if (!today) {
      return;
    }
    // Update localStorage
    addHabit(newHabbit);

    // Add to today's snapshot to local storage if needed
    const todaySnapshot = getTodaySnapshot(today);

    todaySnapshot.habbits.push({
      habbitId: newHabbit.id,
      habbitNeedCount: needCount,
      habbitDidCount: 0,
    });
    saveDailySnapshot(todaySnapshot);

    const newSnapshotsArr = getDailySnapshots(today);

    // Update local state
    setHabits([...habits, newHabbit]);
    setSnapshots(newSnapshotsArr);

    await updateGoogle("handleAdd");
  };

  const handleIncrement = async (id: string) => {
    if (!today) {
      return;
    }
    // Add to today's snapshot to local storage if needed
    const todaySnapshot = getTodaySnapshot(today);

    const habitData = todaySnapshot.habbits.find((h) => h.habbitId === id);
    if (!habitData) return;

    const newActualCount = Math.min(
      habitData.habbitNeedCount,
      habitData.habbitDidCount + 1
    );

    // Update in snapshot
    updateHabitCount(id, newActualCount, today);

    const newSnapshotsArr = getDailySnapshots(today);

    // Update local state
    setSnapshots(newSnapshotsArr);

    await updateGoogle("handleIncrement");
  };

  const handleDelete = async (id: string) => {
    if (!today) {
      return;
    }
    // Update local storage
    // Not removing habit from habits for history.
    deleteHabbitFromSnapshot(id, today);

    const newSnapshotsArr = getDailySnapshots(today);

    // Update local state
    // dont remove from habits because this habit can be used in history
    setSnapshots(newSnapshotsArr);

    // Update google
    await updateGoogle("handleDelete");
  };

  const handleEdit = async (
    habitChanged: IHabbit,
    newNeedCount?: number,
    newActualCount?: number
  ) => {
    if (!today) {
      return;
    }
    // Update local storage
    updateHabitCount(habitChanged.id, newActualCount || 0, today);
    updateHabitNeedCount(habitChanged.id, newNeedCount || 1, today);
    // Update habit text if needed
    updateHabit(habitChanged);

    const newSnapshotsArr = getDailySnapshots(today);

    // Update local state
    setSnapshots(newSnapshotsArr);
    setHabits(
      habits.map((habit) => {
        return habit.id === habitChanged.id ? habitChanged : habit;
      })
    );

    await updateGoogle("handleEdit");
  };

  const handleAddNote = async (newNote: INote, text: string) => {
    if (!today) {
      return;
    }
    addNote(newNote);

    // Add to today's snapshot to local storage if needed
    const todaySnapshot = getTodaySnapshot(today);

    todaySnapshot.notes.push({
      noteId: newNote.id,
      noteText: text,
    });
    saveDailySnapshot(todaySnapshot);

    const newSnapshotsArr = getDailySnapshots(today);

    // Update local state
    setNotes([...notes, newNote]);
    setSnapshots(newSnapshotsArr);

    await updateGoogle("handleAddNote");
  };

  const handleNoteEdit = async (noteChanged: INote, noteText: string) => {
    if (!today) {
      return;
    }
    // Update note in localStorage
    updateNote(noteChanged);

    // Update note text in today's snapshot
    const todaySnapshot = getTodaySnapshot(today);
    const noteIndex = todaySnapshot.notes.findIndex((n) => n.noteId === noteChanged.id);
    if (noteIndex !== -1) {
      todaySnapshot.notes[noteIndex].noteText = noteText;
    }
    saveDailySnapshot(todaySnapshot);

    const newSnapshotsArr = getDailySnapshots(today);

    // Update local state
    setSnapshots(newSnapshotsArr);
    setNotes(
      notes.map((note) => {
        return note.id === noteChanged.id ? noteChanged : note;
      })
    );

    // Update google
    await updateGoogle("handleNoteEdit");
  };

  const handleNoteDelete = async (id: string) => {
    if (!today) {
      return;
    }
    // Not removing note from notes for history.

    // Remove from today's snapshot
    deleteNoteFromSnapshot(id, today);

    const newSnapshotsArr = getDailySnapshots(today);

    // Update local state
    setSnapshots(newSnapshotsArr);

    // Update google
    await updateGoogle("handleNoteDelete");
  };

  const displayHabits: DispalyHabbit[] = useMemo(() => {
    if (!today) {
      return [];
    }
    const res = [];
    const todayDay = today.toISOString().split("T")[0];
    const todaySnapshot = snapshots.find(
      (snapshot) => snapshot.date === todayDay
    );
    if (todaySnapshot) {
      for (const habit of todaySnapshot.habbits) {
        res.push({
          habitId: habit.habbitId,
          text: habits.find((h) => h.id === habit.habbitId)?.text || "No text for today",
          needCount: habit.habbitNeedCount,
          actualCount: habit.habbitDidCount,
        });
      }
    }
    return res;
  }, [today, habits, snapshots]);

  const displayNotes: DispalyNote[] = useMemo(() => {
    if (!today) {
      return [];
    }
    const res = [];
    const todayDay = today.toISOString().split("T")[0];
    const todaySnapshot = snapshots.find(
      (snapshot) => snapshot.date === todayDay
    );
    if (todaySnapshot) {
      for (const note of todaySnapshot.notes) {
        res.push({
          noteId: note.noteId,
          noteName: notes.find((n) => n.id === note.noteId)?.name || "No text",
          noteText: note.noteText,
        });
      }
    }
    return res;
  }, [today, notes, snapshots]);

  const todayDisplayed = today
    ? today.toLocaleDateString("en-US", {
        day: "numeric",
        month: "long",
      })
    : "loading...";

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-2xl mx-auto bg-white min-h-screen shadow-sm">
        <main className="p-4 pb-20">
          {activeTab === "today" ? (
            <>
              <h1 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-6">
                {displayHabits.length > 0
                  ? `Habits for today (${todayDisplayed}):`
                  : "Add habit using the button below"}
              </h1>

              {/*Google integration panel */}
              <div className="mb-4">
                <IntegrationPannel
                  state={googleState ?? GoogleState.NOT_CONNECTED}
                  spreadSheetUrl={spreadsheetUrl}
                  onSyncNowClick={handleSyncNowButtonClick}
                  onSetGoogleRefreshToken={setRefreshToken}
                  onSetGoogleAccessToken={setGoolgeAccessToken}
                />
              </div>

              {/* Habbits and notes list */}
              {displayHabits.length > 0 && (
                <div className="mb-4 w-full space-y-4">
                  {displayHabits.map((habit) => {
                    return (
                      <HabitButton
                        key={habit.habitId}
                        habbit={{
                          id: habit.habitId,
                          text: habit.text,
                        }}
                        currentCount={habit.actualCount}
                        needCount={habit.needCount}
                        onIncrement={handleIncrement}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                      />
                    );
                  })}
                  {displayNotes.map((note) => {
                    return (
                      <NoteButton
                        key={note.noteId}
                        note={{
                          id: note.noteId,
                          name: note.noteName,
                        }}
                        text={note.noteText}
                        onEdit={handleNoteEdit}
                        onDelete={handleNoteDelete}
                      />
                    );
                  })}
                </div>
              )}

              <AddHabbit onAdd={handleAddHabit} />
              <AddNote onAdd={handleAddNote} />
            </>
          ) : (
            <HistoryView habits={habits} notes={notes} snapshots={snapshots} today={today} />
          )}
        </main>

        <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    </div>
  );
}
