"use client";

import { useEffect, useState } from "react";
import HabitButton from "./components/HabbitButton";
import AddHabbit from "./components/AddHabbit";
import IntegrationPannel from "./components/IntegrationPannel";
import BottomNavigation from "./components/BottomNavigation";
import HistoryView from "./components/HistoryView";
import axios from "axios";

// Import write operations from syncManager instead
import {
  addHabit,
  updateHabit,
  deleteHabbit,
  updateHabitCount,
  updateHabitNeedCount,
  getHabits,
  getTodaySnapshot,
  saveDailySnapshot,
  fillHistory,
  initializeHabitsLocalStorage,
} from "@/services/apiLocalStorage";

import {
  registerSyncFunction,
  triggerSync
} from "@/syncManager";

import IHabbit from "@/types/habbit";
import User from "@/types/user";
import IDailySnapshot from "@/types/dailySnapshot";
import { getDailySnapshots } from "@/services/apiLocalStorage";
import { GoogleState } from "@/types/googleState";

type DispalyHabbit = {
  habitId: string;
  text: string;
  needCount: number;
  actualCount: number;
};

export default function Home() {
  const [habits, setHabits] = useState<Array<IHabbit>>([]);
  const [snapshots, setHabitSnapshots] = useState<Array<IDailySnapshot>>([]);
  const [currentUser, setCurrentUser] = useState<User | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<"today" | "history">("today");
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [error, setError] = useState<string>("");
  const [googleState, setGoogleState] = useState<GoogleState>(GoogleState.NOT_CONNECTED);
  const [mounted, setMounted] = useState(false);

  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string | null>(null);
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(null);
  const [isCreatingSpreadsheet, setIsCreatingSpreadsheet] = useState(false);
  const [isUpdatingSpreadsheet, setIsUpdatingSpreadsheet] = useState(false);

  const SPREADSHEET_NAME = "My habits tracker";

  /**
   * Gets data from google and sets panel and habits state.
   * Then initializesLocalStorage data.
   */
  const getCurrentData = async (refreshToken: string | null) => {
    const habits = await getHabits();
    const snapshots = await getDailySnapshots();
    let resultHabits: IHabbit[] = [];
    let resultSnapshots: IDailySnapshot[] = [];
    if (refreshToken) {
      setGoogleState(GoogleState.UPDATING);
      const currentData = await getCurrentGoogleData(refreshToken, habits, snapshots);
      if (currentData) {
        setGoogleState(GoogleState.CONNECTED);
        resultHabits = currentData.habits;
        resultSnapshots = currentData.snapshots;
      } else {
        setGoogleState(GoogleState.ERROR);
        setError("Could not connect to google");
      }
    } else {
      resultHabits = habits;
      resultSnapshots = snapshots;
    }
    setHabits(resultHabits);
    setHabitSnapshots(resultSnapshots);
    initializeHabitsLocalStorage(resultHabits, resultSnapshots);
    fillHistory();
  };

  useEffect(() => {
    setMounted(true);
    const storedRefreshToken = localStorage.getItem("googleRefreshToken");
    setRefreshToken(storedRefreshToken);
  }, []);

  useEffect(() => {
    getCurrentData(refreshToken);
  }, [refreshToken]);

  useEffect(() => {
    if (spreadsheetId && accessToken) {
      registerSyncFunction(async () => await manualSyncToSpreadsheet(accessToken));
    }
  }, [spreadsheetId])

    /**
   * Finds spreadSheet by accessToken and populates it with data from local storage
   */
  const manualSyncToSpreadsheet = async (accessToken: string) => {
    const habits = getHabits();
    const snapshots = getDailySnapshots();
    try {
      console.log("Manual sync: Pushing local data to spreadsheet...");
      setIsUpdatingSpreadsheet(true);

      // Search for existing spreadsheet by name
      const existingSpreadsheet = await findSpreadsheetByName(
        accessToken,
        SPREADSHEET_NAME
      );

      if (existingSpreadsheet) {
        console.log(
          "Found spreadsheet for manual sync:",
          existingSpreadsheet.id
        );

        // Update state with found spreadsheet info
        setSpreadsheetId(existingSpreadsheet.id);
        setSpreadsheetUrl(existingSpreadsheet.url);

        // Push local data to spreadsheet (don't read from spreadsheet)
        await populateSpreadsheetWithHabits(
          accessToken,
          existingSpreadsheet.id,
          habits,
          snapshots
        );
        console.log("✅ Successfully pushed local data to spreadsheet");

        setIsUpdatingSpreadsheet(false);
        return {
          spreadsheetId: existingSpreadsheet.id,
          spreadsheetUrl: existingSpreadsheet.url,
        };
      } else {
        // If no spreadsheet exists, create one
        console.log(
          "No spreadsheet found, creating new one for manual sync..."
        );
        return await createGoogleSpreadSheet(accessToken, habits, snapshots);
      }
    } catch (error) {
      console.error("❌ Error during manual sync:", error);
      setIsUpdatingSpreadsheet(false);
    }
  };


  /**
   * using refresh token from localStorage get access token and get google data.
   * If table doesn't exist create table with data from arguments.
   * If something went wrong return undefined.
   */
  const getCurrentGoogleData = async (refreshToken:string, habits: IHabbit[], habitSnapshots: IDailySnapshot[]) : Promise<{
    snapshots: IDailySnapshot[],
    habits: IHabbit[]
  } | undefined> => {
    if (refreshToken) {
      // Automatically try to get a fresh access token
      const newAccessToken = await refreshAccessToken(refreshToken)
      if (newAccessToken) {
        console.log(
          "✅ Successfully refreshed access token from stored refresh token"
        );
        setAccessToken(newAccessToken);

        // Sync with google: use google data
        const googleData = await getGoogleDataUseToken(newAccessToken);
        if (googleData === undefined) {
          const spreadSheet = await createGoogleSpreadSheet(
            newAccessToken,
            habits,
            habitSnapshots
          );

          if (!spreadSheet) {
            // throw new Error("Spreadsheet couldn't be created");
            return undefined;
          }
          return { habits, snapshots: habitSnapshots };
        } else {
          return googleData;
        }

        // Register update functon
        // registerSyncFunction(() => manualSyncToSpreadsheet(newAccessToken));
      } else {
        console.log(
          "❌ Failed to refresh access token, removing stored refresh token"
        );
        localStorage.removeItem("googleRefreshToken");
        setRefreshToken(null);
      }
    }
    return undefined;
  };

  /**
   *
   * @returns spreadSheet object
   */
  const createGoogleSpreadSheet = async (
    accessToken: string,
    habits: IHabbit[],
    habitSnapshots: IDailySnapshot[]
  ) => {
    // Create a new spreadsheet
    setIsCreatingSpreadsheet(true);
    console.log("Creating new habits spreadsheet...");

    const response = await makeAuthenticatedRequest(
      "https://sheets.googleapis.com/v4/spreadsheets",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          properties: {
            title: SPREADSHEET_NAME,
          },
          sheets: [
            {
              properties: {
                title: "Habits Data",
              },
            },
          ],
        }),
      },
      accessToken
    );

    if (!response.ok) {
      throw new Error(`Failed to create spreadsheet: ${response.statusText}`);
    }

    const spreadsheet = await response.json();
    console.log("✅ Spreadsheet created successfully:", spreadsheet);
    console.log("📝 Spreadsheet ID:", spreadsheet.spreadsheetId);
    console.log("🔗 Spreadsheet URL:", spreadsheet.spreadsheetUrl);

    // Populate with existing habits data (this will also set up headers)
    await populateSpreadsheetWithHabits(
      accessToken,
      spreadsheet.spreadsheetId,
      habits,
      habitSnapshots
    );

    // Update state with new spreadsheet info
    setSpreadsheetId(spreadsheet.spreadsheetId);
    setSpreadsheetUrl(spreadsheet.spreadsheetUrl);

    return spreadsheet;
  };

  /**
   * find table by name using accessToken
   * if table exists parse data from it and call onChange from parent
   * if not create such table using getDailySnapshots and getHabits
   */
  const getGoogleDataUseToken = async (accessToken: string) => {
    try {
      // Search for existing spreadsheet by name
      console.log(`Looking for spreadsheet named: "${SPREADSHEET_NAME}"`);
      const existingSpreadsheet = await findSpreadsheetByName(
        accessToken,
        SPREADSHEET_NAME
      );

      if (existingSpreadsheet) {
        console.log("Found existing spreadsheet:", existingSpreadsheet.id);
        setIsUpdatingSpreadsheet(true);

        // Update state with found spreadsheet info
        setSpreadsheetId(existingSpreadsheet.id);
        setSpreadsheetUrl(existingSpreadsheet.url);

        // Always read and import data from existing spreadsheet
        console.log(
          "Reading data from existing spreadsheet to reinitialize local storage..."
        );
        const spreadsheetData = await readExistingSpreadsheetData(
          accessToken,
          existingSpreadsheet.id
        );

        if (spreadsheetData && spreadsheetData.dataRows.length > 0) {
          console.log(
            "Found data in existing spreadsheet, reinitializing local storage..."
          );

          const parsedData = parseSpreadsheetDataToHabits(spreadsheetData);

          if (parsedData.habits.length > 0) {
            console.log(
              "✅ Successfully reinitialized habits from existing spreadsheet"
            );
            return parsedData;
          }
        } else {
          console.log(
            "No data found in existing spreadsheet, keeping current local data"
          );
        }
        setIsUpdatingSpreadsheet(false);
      }
      return undefined;
    } catch (error) {
      console.error("❌ Error syncing with Google Sheets:", error);
      setIsCreatingSpreadsheet(false);
      setIsUpdatingSpreadsheet(false);
      return undefined;
    }
  };

  /**
   * using spreadSheetData from agtument NOT USING PROPER METHODS
   * creates habits info and returns it
   */
  const parseSpreadsheetDataToHabits = (spreadsheetData: {
    headers: string[];
    dataRows: string[][];
  }) => {
    try {
      console.log("Parsing spreadsheet data to habits and snapshots...");

      const { headers, dataRows } = spreadsheetData;

      // Extract habit names from headers (skip first column which is "Date")
      const habitNames = headers.slice(1);
      console.log("Found habit names:", habitNames);

      if (habitNames.length === 0) {
        console.log("No habits found in spreadsheet");
        return { habits: [], snapshots: [] };
      }

      // Create habit objects with unique IDs
      const habits: IHabbit[] = habitNames.map((name) => ({
        id: crypto.randomUUID(),
        text: name,
      }));

      // Create daily snapshots from the data
      const snapshots: IDailySnapshot[] = [];

      dataRows.forEach((row) => {
        if (row.length === 0) return; // Skip empty rows

        const date = row[0];
        if (!date) return; // Skip rows without date

        const habitData: Array<{
          habbitId: string;
          habbitNeedCount: number;
          habbitDidCount: number;
        }> = [];

        // Parse each habit's progress for this date
        for (let i = 1; i < row.length && i <= habitNames.length; i++) {
          const progressStr = row[i];
          if (!progressStr) continue; // Skip empty cells

          // Parse "actual/target" format (e.g., "2/3")
          const progressMatch = progressStr.match(/^(\d+)\/(\d+)$/);
          if (progressMatch) {
            const actualCount = parseInt(progressMatch[1]);
            const targetCount = parseInt(progressMatch[2]);
            const habitId = habits[i - 1].id; // -1 because habits array doesn't include date column

            habitData.push({
              habbitId: habitId,
              habbitNeedCount: targetCount,
              habbitDidCount: actualCount,
            });
          }
        }

        snapshots.push({
          date: date,
          habbits: habitData,
        });
      });

      console.log(
        `Parsed ${habits.length} habits and ${snapshots.length} daily snapshots`
      );
      return { habits, snapshots };
    } catch (error) {
      console.error("❌ Error parsing spreadsheet data:", error);
      return { habits: [], snapshots: [] };
    }
  };

  /**
   * using spreadSheetId and accessToken reads spreadSheet content
   */
  const readExistingSpreadsheetData = async (
    accessToken: string,
    spreadsheetId: string
  ) => {
    try {
      console.log("Reading existing spreadsheet data...");

      // First get the spreadsheet metadata to find the sheet range
      const metadataResponse = await makeAuthenticatedRequest(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`,
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
        accessToken
      );

      if (!metadataResponse.ok) {
        throw new Error(
          `Failed to get spreadsheet metadata: ${metadataResponse.status}`
        );
      }

      const metadata = await metadataResponse.json();
      const sheet = metadata.sheets[0];
      const sheetTitle = sheet.properties.title;

      // Read all data from the sheet
      const dataResponse = await makeAuthenticatedRequest(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetTitle}`,
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
        accessToken
      );

      if (!dataResponse.ok) {
        throw new Error(
          `Failed to read spreadsheet data: ${dataResponse.status}`
        );
      }

      const data = await dataResponse.json();
      const rows = data.values;

      if (!rows || rows.length === 0) {
        console.log("Spreadsheet is empty");
        return null;
      }

      console.log("Successfully read spreadsheet data:", rows.length, "rows");
      return { headers: rows[0], dataRows: rows.slice(1) };
    } catch (error) {
      console.error("❌ Error reading spreadsheet data:", error);
      return null;
    }
  };

  /**
   * get Access Token using refreshToken
   */
  const refreshAccessToken = async (
    refreshToken: string
  ): Promise<string | null> => {
    try {
      console.log("Refreshing access token...");
      const response = await axios.post("/api/auth/google/refresh-token", {
        refreshToken,
      });

      if (response.data.access_token) {
        console.log("✅ Successfully refreshed access token");
        return response.data.access_token;
      }

      return null;
    } catch (error) {
      console.error("❌ Error refreshing access token:", error);
      return null;
    }
  };

  /**
   * fill spreadsheet with habits
   * calling getDailySnapshots and getHabits
   */
  const populateSpreadsheetWithHabits = async (
    accessToken: string,
    spreadsheetId: string,
    habits: IHabbit[],
    habitSnapshots: IDailySnapshot[]
  ) => {
    try {
      console.log("Atomically syncing spreadsheet with latest habits data...");

      // Get spreadsheet metadata to get sheet ID
      const spreadsheetResponse = await makeAuthenticatedRequest(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`,
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
        accessToken
      );

      if (!spreadsheetResponse.ok) {
        throw new Error(
          `Failed to get spreadsheet details: ${spreadsheetResponse.statusText}`
        );
      }

      const spreadsheetData = await spreadsheetResponse.json();
      const sheet = spreadsheetData.sheets[0];
      const sheetId = sheet.properties.sheetId;

      // Get daily snapshots (historical data) and habits (for names)
      const snapshots = habitSnapshots;

      console.log("Found snapshots:", snapshots.length);
      console.log("Found habits:", habits.length);

      if (snapshots.length === 0 && habits.length === 0) {
        console.log("No data found to populate");
        return;
      }

      // Create habit ID to name mapping from current habits
      const habitIdToName = new Map<string, string>();
      habits.forEach((habit) => {
        habitIdToName.set(habit.id, habit.text);
      });

      // Get current habit names from local data
      const currentHabitNames = Array.from(
        new Set(habits.map((h) => h.text))
      ).sort();
      console.log("Current habits:", currentHabitNames);

      // Create headers: Date + habit names
      const headers = [["Date", ...currentHabitNames]];

      // Create a data structure: Map<date, Map<habitName, progress>>
      const dateData = new Map<string, Map<string, string>>();

      snapshots.forEach((snapshot) => {
        if (!dateData.has(snapshot.date)) {
          dateData.set(snapshot.date, new Map());
        }

        const dayData = dateData.get(snapshot.date)!;

        snapshot.habbits.forEach((habitSnapshot) => {
          const habitName = habitIdToName.get(habitSnapshot.habbitId);
          if (habitName && currentHabitNames.includes(habitName)) {
            // Show progress as "actual/target" format
            const progress = `${habitSnapshot.habbitDidCount}/${habitSnapshot.habbitNeedCount}`;
            dayData.set(habitName, progress);
          }
        });
      });

      // Convert to rows for the spreadsheet
      const dataRows: string[][] = [];
      const sortedDates = Array.from(dateData.keys()).sort();

      sortedDates.forEach((date) => {
        const row = [date];
        const dayData = dateData.get(date)!;

        // Add data for each habit column (in same order as headers)
        currentHabitNames.forEach((habitName) => {
          row.push(dayData.get(habitName) || ""); // Empty if no data for this habit on this date
        });

        dataRows.push(row);
      });

      // Combine headers and data
      const allRows = [...headers, ...dataRows];

      // Calculate dimensions for the update
      const numColumns = currentHabitNames.length + 1; // +1 for Date column
      const numRows = allRows.length;

      console.log(
        `Updating spreadsheet with ${numRows} rows and ${numColumns} columns`
      );

      // Prepare atomic batchUpdate request that handles everything
      const requests = [
        // First, ensure we have enough rows and columns
        {
          updateSheetProperties: {
            properties: {
              sheetId: sheetId,
              gridProperties: {
                rowCount: Math.max(numRows + 10, 100), // Add some buffer
                columnCount: Math.max(numColumns + 5, 26), // Add some buffer
              },
            },
            fields: "gridProperties.rowCount,gridProperties.columnCount",
          },
        },
        // Update all values in one go
        {
          updateCells: {
            range: {
              sheetId: sheetId,
              startRowIndex: 0,
              endRowIndex: numRows,
              startColumnIndex: 0,
              endColumnIndex: numColumns,
            },
            rows: allRows.map((row) => ({
              values: row.map((cellValue) => ({
                userEnteredValue: { stringValue: cellValue || "" },
              })),
            })),
            fields: "userEnteredValue",
          },
        },
        // Apply header formatting
        {
          repeatCell: {
            range: {
              sheetId: sheetId,
              startRowIndex: 0,
              endRowIndex: 1,
              startColumnIndex: 0,
              endColumnIndex: numColumns,
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.2, green: 0.4, blue: 0.8 },
                textFormat: {
                  foregroundColor: { red: 1, green: 1, blue: 1 },
                  fontSize: 12,
                  bold: true,
                },
                horizontalAlignment: "CENTER",
                verticalAlignment: "MIDDLE",
              },
            },
            fields: "userEnteredFormat",
          },
        },
        // Apply data formatting
        {
          repeatCell: {
            range: {
              sheetId: sheetId,
              startRowIndex: 1,
              endRowIndex: numRows,
              startColumnIndex: 0,
              endColumnIndex: numColumns,
            },
            cell: {
              userEnteredFormat: {
                textFormat: {
                  fontSize: 10,
                },
                horizontalAlignment: "CENTER",
                verticalAlignment: "MIDDLE",
              },
            },
            fields: "userEnteredFormat",
          },
        },
        // Add borders
        {
          updateBorders: {
            range: {
              sheetId: sheetId,
              startRowIndex: 0,
              endRowIndex: numRows,
              startColumnIndex: 0,
              endColumnIndex: numColumns,
            },
            top: {
              style: "SOLID",
              width: 1,
              color: { red: 0.8, green: 0.8, blue: 0.8 },
            },
            bottom: {
              style: "SOLID",
              width: 1,
              color: { red: 0.8, green: 0.8, blue: 0.8 },
            },
            left: {
              style: "SOLID",
              width: 1,
              color: { red: 0.8, green: 0.8, blue: 0.8 },
            },
            right: {
              style: "SOLID",
              width: 1,
              color: { red: 0.8, green: 0.8, blue: 0.8 },
            },
            innerHorizontal: {
              style: "SOLID",
              width: 1,
              color: { red: 0.9, green: 0.9, blue: 0.9 },
            },
            innerVertical: {
              style: "SOLID",
              width: 1,
              color: { red: 0.9, green: 0.9, blue: 0.9 },
            },
          },
        },
        // Auto-resize columns
        {
          autoResizeDimensions: {
            dimensions: {
              sheetId: sheetId,
              dimension: "COLUMNS",
              startIndex: 0,
              endIndex: numColumns,
            },
          },
        },
        // Freeze first row and first column
        {
          updateSheetProperties: {
            properties: {
              sheetId: sheetId,
              gridProperties: {
                frozenRowCount: 1,
                frozenColumnCount: 1,
              },
            },
            fields:
              "gridProperties.frozenRowCount,gridProperties.frozenColumnCount",
          },
        },
      ];

      // Execute the atomic batch update
      const response = await makeAuthenticatedRequest(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ requests }),
        },
        accessToken
      );

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `Failed to update spreadsheet: ${response.status} ${response.statusText} - ${errorBody}`
        );
      }

      console.log(
        `✅ Successfully updated spreadsheet with ${dataRows.length} data rows and ${currentHabitNames.length} habit columns in one atomic operation`
      );
    } catch (error) {
      console.error("❌ Error populating spreadsheet with habits:", error);
    }
  };

  /**
   * find SpreadSheet by name using accessToken
   */
  const findSpreadsheetByName = async (accessToken: string, name: string) => {
    try {
      console.log(`Searching for spreadsheet named: "${name}"`);

      // Search for spreadsheets with the specific name
      const searchResponse = await makeAuthenticatedRequest(
        `https://www.googleapis.com/drive/v3/files?q=name='${encodeURIComponent(
          name
        )}' and mimeType='application/vnd.google-apps.spreadsheet'&fields=files(id,name,webViewLink)`,
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
        accessToken
      );

      if (!searchResponse.ok) {
        throw new Error(
          `Failed to search for spreadsheet: ${searchResponse.status}`
        );
      }

      const searchData = await searchResponse.json();
      const files = searchData.files;

      if (files && files.length > 0) {
        // If multiple spreadsheets with same name exist, take the first one
        const spreadsheet = files[0];
        console.log(
          `✅ Found existing spreadsheet: ${spreadsheet.name} (ID: ${spreadsheet.id})`
        );
        return {
          id: spreadsheet.id,
          url: spreadsheet.webViewLink,
        };
      } else {
        console.log(`No spreadsheet found with name: "${name}"`);
        return null;
      }
    } catch (error) {
      console.error("❌ Error searching for spreadsheet:", error);
      return null;
    }
  };

  /**
   * use fetch with arguments and refrest access token if needed
   */
  const makeAuthenticatedRequest = async (
    url: string,
    options: RequestInit,
    accessToken: string,
    retryCount = 0
  ): Promise<Response> => {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${accessToken}`,
      },
    });

    // If token expired and we have a refresh token, try to refresh
    if (response.status === 401 && refreshToken && retryCount === 0) {
      console.log("Access token expired, attempting to refresh...");
      const newAccessToken = await refreshAccessToken(refreshToken);

      if (newAccessToken) {
        // Update user with new access token
        setCurrentUser({ key: newAccessToken });

        // Retry the request with new token
        return makeAuthenticatedRequest(url, options, newAccessToken, 1);
      }
    }

    return response;
  };

  const updateGoogle = async () => {
    // Update google spreadsheet
    setGoogleState(GoogleState.UPDATING);
    // TODO handle error
    await triggerSync();
    setGoogleState(GoogleState.CONNECTED);
  }
  

  const handleAdd = async (newHabbit: IHabbit, needCount: number) => {
    addHabit(newHabbit);

    // Add to today's snapshot to local storage if needed
    const todaySnapshot = getTodaySnapshot();

    todaySnapshot.habbits.push({
      habbitId: newHabbit.id,
      habbitNeedCount: needCount,
      habbitDidCount: 0,
    });
    saveDailySnapshot(todaySnapshot);

    const newSnapshotsArr = getDailySnapshots();

    // Update local state
    setHabits([...habits, newHabbit]);
    setHabitSnapshots(newSnapshotsArr);

    await updateGoogle();
  };

  const handleIncrement = async (id: string) => {
    // Add to today's snapshot to local storage if needed
    const todaySnapshot = getTodaySnapshot();

    const habitData = todaySnapshot.habbits.find((h) => h.habbitId === id);
    if (!habitData) return;

    const newActualCount = Math.min(
      habitData.habbitNeedCount,
      habitData.habbitDidCount + 1
    );

    // Update in snapshot
    updateHabitCount(id, newActualCount);

    const newSnapshotsArr = getDailySnapshots();
    
    // Update local state
    setHabitSnapshots(newSnapshotsArr);

    await updateGoogle();
  };

  const handleDelete = async (id: string) => {
    // Update local storage
    deleteHabbit(id);
    
    const newSnapshotsArr = getDailySnapshots();
    
    // Update local state
    // dont remove from habits because this habit can be used in history
    setHabitSnapshots(newSnapshotsArr);

    await updateGoogle();
  };

  const handleEdit = async (
    habitChanged: IHabbit,
    newNeedCount?: number,
    newActualCount?: number
  ) => {
    // Update local storage
    updateHabitCount(habitChanged.id, newActualCount || 0);
    updateHabitNeedCount(habitChanged.id, newNeedCount || 1);
    // Update habit text if needed
    updateHabit(habitChanged);

    const newSnapshotsArr = getDailySnapshots();
    
    // Update local state
    setHabitSnapshots(newSnapshotsArr);
    setHabits(habits.map((habit) => {
      return habit.id === habitChanged.id ? habitChanged : habit
    }));

    await updateGoogle();
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="max-w-2xl mx-auto bg-white min-h-screen shadow-sm">
          <main className="p-4 pb-20">
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-6">
              Loading...
            </h1>
          </main>
        </div>
      </div>
    );
  }

  const todayDisplayed = new Date().toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
  });

  const todaySnapshot = getTodaySnapshot();
  let displayHabits: DispalyHabbit[] = [];
  if (todaySnapshot) {
    for (const habit of todaySnapshot.habbits) {
      displayHabits.push({
        habitId: habit.habbitId,
        text: habits.find((h) => h.id === habit.habbitId)?.text || "No text",
        needCount: habit.habbitNeedCount,
        actualCount: habit.habbitDidCount,
      });
    }
  }


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
                  state={googleState}
                  onGoogleStateChange={setGoogleState}
                  onRefreshTokenChange={setRefreshToken}
                  onAccessTokenChange={setAccessToken}
                />
              </div>

              {/* Habbits list */}
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
                </div>
              )}

              <AddHabbit onAdd={handleAdd} />
            </>
          ) : (
            <HistoryView />
          )}
        </main>

        <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    </div>
  );
}
