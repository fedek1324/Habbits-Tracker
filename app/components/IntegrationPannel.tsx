import User from "@/types/user";
import { useGoogleLogin } from "@react-oauth/google";
import { hasGrantedAllScopesGoogle } from "@react-oauth/google";
import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  getHabits,
  getDailySnapshots,
  addHabit,
  saveDailySnapshot,
} from "@/api";
import IHabbit from "@/types/habbit";
import IDailySnapshot from "@/types/dailySnapshot";
import { registerSyncFunction } from "@/syncManager";

interface IntegrationPannelProps {
  currentUser: User | undefined;
  onChangeUser: (user: User) => void;
  onDataChanged?: () => void; // Optional callback to notify parent of data changes
}

const IntegrationPannel: React.FC<IntegrationPannelProps> = ({
  currentUser,
  onChangeUser,
  onDataChanged,
}) => {
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string | null>(null);
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(null);
  const [isCreatingSpreadsheet, setIsCreatingSpreadsheet] = useState(false);
  const [isUpdatingSpreadsheet, setIsUpdatingSpreadsheet] = useState(false);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);

  // Load refresh token from localStorage on component mount
  useEffect(() => {
    const storedRefreshToken = localStorage.getItem("googleRefreshToken");
    if (storedRefreshToken) {
      console.log(
        "✅ Found stored refresh token, attempting to get fresh access token..."
      );
      setRefreshToken(storedRefreshToken);

      // Automatically try to get a fresh access token
      refreshAccessToken(storedRefreshToken).then((newAccessToken) => {
        if (newAccessToken) {
          console.log(
            "✅ Successfully refreshed access token from stored refresh token"
          );
          onChangeUser({ key: newAccessToken });

          // Sync with google: use google data
          syncWithGoogleSheets(newAccessToken).then(console.log);

          // Register update functon
          registerSyncFunction(() => manualSyncToSpreadsheet(newAccessToken));
        } else {
          console.log(
            "❌ Failed to refresh access token, removing stored refresh token"
          );
          localStorage.removeItem("googleRefreshToken");
          setRefreshToken(null);
        }
      });
    }
  }, []);

  const SCOPES =
    "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file";

  const SPREADSHEET_NAME = "My habits tracker";

  /**
   * Clear spreadsheet info from state
   */
  const clearSpreadsheetInfo = () => {
    setSpreadsheetId(null);
    setSpreadsheetUrl(null);
    setRefreshToken(null);
    localStorage.removeItem("googleRefreshToken");
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
        onChangeUser({ key: newAccessToken });

        // Retry the request with new token
        return makeAuthenticatedRequest(url, options, newAccessToken, 1);
      }
    }

    return response;
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
   * find table by name using accessToken
   * if table exists parse data from it and call onChange from parent
   * if not create such table using getDailySnapshots and getHabits
   */
  const syncWithGoogleSheets = async (accessToken: string) => {
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

        // Clear existing local data first
        localStorage.removeItem("habits");
        localStorage.removeItem("dailySnapshots");

        if (spreadsheetData && spreadsheetData.dataRows.length > 0) {
          console.log(
            "Found data in existing spreadsheet, reinitializing local storage..."
          );

          const parsedData = await parseSpreadsheetDataToHabits(
            spreadsheetData
          );

          if (parsedData.habits.length > 0) {
            await initializeHabitsFromSpreadsheet(
              parsedData.habits,
              parsedData.snapshots
            );
            console.log(
              "✅ Successfully reinitialized habits from existing spreadsheet"
            );
          }
        } else {
          console.log(
            "No data found in existing spreadsheet, keeping current local data"
          );
        }

        // Notify parent component that data has changed
        if (onDataChanged) {
          onDataChanged();
        }

        setIsUpdatingSpreadsheet(false);
        return {
          spreadsheetId: existingSpreadsheet.id,
          spreadsheetUrl: existingSpreadsheet.url,
        };
      } else {
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
          throw new Error(
            `Failed to create spreadsheet: ${response.statusText}`
          );
        }

        const spreadsheet = await response.json();
        console.log("✅ Spreadsheet created successfully:", spreadsheet);
        console.log("📝 Spreadsheet ID:", spreadsheet.spreadsheetId);
        console.log("🔗 Spreadsheet URL:", spreadsheet.spreadsheetUrl);

        // Populate with existing habits data (this will also set up headers)
        await populateSpreadsheetWithHabits(
          accessToken,
          spreadsheet.spreadsheetId
        );

        // Update state with new spreadsheet info
        setSpreadsheetId(spreadsheet.spreadsheetId);
        setSpreadsheetUrl(spreadsheet.spreadsheetUrl);
        setIsCreatingSpreadsheet(false);
        setIsUpdatingSpreadsheet(false);

        return spreadsheet;
      }
    } catch (error) {
      console.error("❌ Error syncing with Google Sheets:", error);
      setIsCreatingSpreadsheet(false);
      setIsUpdatingSpreadsheet(false);
    }
  };

  /**
   * sets headers for spreadSheet using arguments
   */
  const setupSpreadsheetHeaders = async (
    accessToken: string,
    spreadsheetId: string,
    habitNames: string[]
  ) => {
    try {
      console.log("Setting up spreadsheet headers...");

      // Create headers: Date + each habit name
      const headers = [["Date", ...habitNames]];

      const columnRange = String.fromCharCode(65 + habitNames.length); // A=65, so A+habitNames.length gives us the end column
      const response = await makeAuthenticatedRequest(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:${columnRange}1?valueInputOption=USER_ENTERED`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            values: headers,
          }),
        },
        accessToken
      );

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `Failed to set headers: ${response.status} ${response.statusText} - ${errorBody}`
        );
      }

      console.log("✅ Headers set up successfully");
    } catch (error) {
      console.error("❌ Error setting up headers:", error);
    }
  };

  /**
   * deletes all table data
   */
  const clearSpreadsheetData = async (
    accessToken: string,
    spreadsheetId: string
  ) => {
    try {
      console.log("Clearing existing spreadsheet data...");

      // Get the spreadsheet to find the sheet dimensions
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

      // Clear all data by clearing values (much simpler and more reliable)
      const response = await makeAuthenticatedRequest(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheet.properties.title}:clear`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        },
        accessToken
      );

      if (!response.ok) {
        // If clearing fails, it might be because there are no data rows, which is fine
        console.log("Note: Could not clear data (might be empty already)");
      } else {
        console.log("✅ Existing data cleared successfully");
      }
    } catch (error) {
      console.warn(
        "⚠️ Error clearing existing data (proceeding anyway):",
        error
      );
    }
  };

  /**
   * fill spreadsheet with habits
   * calling getDailySnapshots and getHabits
   */
  const populateSpreadsheetWithHabits = async (
    accessToken: string,
    spreadsheetId: string,
    isOverwrite = true
  ) => {
    try {
      console.log(
        isOverwrite
          ? "Populating spreadsheet with latest habits data..."
          : "Updating spreadsheet with new habits data..."
      );

      // If this is an update, clear existing data first
      if (isOverwrite) {
        await clearSpreadsheetData(accessToken, spreadsheetId);
      }

      // Get daily snapshots (historical data) and habits (for names)
      const [snapshots, habits] = await Promise.all([
        getDailySnapshots(),
        getHabits(),
      ]);

      console.log("Found snapshots:", snapshots.length);
      console.log("Found habits:", habits.length);

      if (snapshots.length === 0) {
        console.log("No historical data found to populate");
        return;
      }

      // Get all unique habit names and create a mapping
      const habitIdToName = new Map<string, string>();
      habits.forEach((habit) => {
        habitIdToName.set(habit.id, habit.text);
      });

      // Get all unique habit names from snapshots (in case there are deleted habits)
      const allHabitNames = new Set<string>();
      snapshots.forEach((snapshot) => {
        snapshot.habbits.forEach((habitSnapshot) => {
          const habitName =
            habitIdToName.get(habitSnapshot.habbitId) || "Unknown Habit";
          allHabitNames.add(habitName);
        });
      });

      const habitNamesArray = Array.from(allHabitNames).sort();
      console.log("Habit columns:", habitNamesArray);

      // Set up headers first
      await setupSpreadsheetHeaders(
        accessToken,
        spreadsheetId,
        habitNamesArray
      );

      // Create a data structure: Map<date, Map<habitName, progress>>
      const dateData = new Map<string, Map<string, string>>();

      snapshots.forEach((snapshot) => {
        if (!dateData.has(snapshot.date)) {
          dateData.set(snapshot.date, new Map());
        }

        const dayData = dateData.get(snapshot.date)!;

        snapshot.habbits.forEach((habitSnapshot) => {
          const habitName =
            habitIdToName.get(habitSnapshot.habbitId) || "Unknown Habit";
          // Show progress as "actual/target" format
          const progress = `${habitSnapshot.habbitDidCount}/${habitSnapshot.habbitNeedCount}`;
          dayData.set(habitName, progress);
        });
      });

      // Convert to rows for the spreadsheet
      const rows: string[][] = [];
      const sortedDates = Array.from(dateData.keys()).sort();

      sortedDates.forEach((date) => {
        const row = [date];
        const dayData = dateData.get(date)!;

        // Add data for each habit column (in same order as headers)
        habitNamesArray.forEach((habitName) => {
          row.push(dayData.get(habitName) || ""); // Empty if no data for this habit on this date
        });

        rows.push(row);
      });

      if (rows.length === 0) {
        console.log("No habit data to populate");
        return;
      }

      // Calculate the column range
      const endColumn = String.fromCharCode(65 + habitNamesArray.length); // A + number of habits
      const endRow = rows.length + 1; // +1 for header row

      // Write data to spreadsheet starting from row 2 (after headers)
      const response = await makeAuthenticatedRequest(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A2:${endColumn}${endRow}?valueInputOption=USER_ENTERED`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            values: rows,
          }),
        },
        accessToken
      );

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `Failed to populate data: ${response.status} ${response.statusText} - ${errorBody}`
        );
      }

      console.log(
        `✅ Successfully populated ${rows.length} rows with ${habitNamesArray.length} habit columns`
      );

      // Format the spreadsheet beautifully
      await formatSpreadsheet(
        accessToken,
        spreadsheetId,
        habitNamesArray.length,
        rows.length
      );
    } catch (error) {
      console.error("❌ Error populating spreadsheet with habits:", error);
    }
  };

  const formatSpreadsheet = async (
    accessToken: string,
    spreadsheetId: string,
    numHabitColumns: number,
    numDataRows: number
  ) => {
    try {
      console.log("Applying beautiful formatting to spreadsheet...");

      // Get the spreadsheet to find the correct sheet ID
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
      const sheetId = spreadsheetData.sheets[0].properties.sheetId;
      console.log("Using sheet ID:", sheetId);

      const requests = [
        // Format header row
        {
          repeatCell: {
            range: {
              sheetId: sheetId,
              startRowIndex: 0,
              endRowIndex: 1,
              startColumnIndex: 0,
              endColumnIndex: numHabitColumns + 1,
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
            fields:
              "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)",
          },
        },
        // Format date column
        {
          repeatCell: {
            range: {
              sheetId: sheetId,
              startRowIndex: 1,
              endRowIndex: numDataRows + 1,
              startColumnIndex: 0,
              endColumnIndex: 1,
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.95, green: 0.95, blue: 0.95 },
                textFormat: {
                  fontSize: 10,
                  bold: true,
                },
                horizontalAlignment: "CENTER",
                verticalAlignment: "MIDDLE",
              },
            },
            fields:
              "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)",
          },
        },
        // Format habit data columns
        {
          repeatCell: {
            range: {
              sheetId: sheetId,
              startRowIndex: 1,
              endRowIndex: numDataRows + 1,
              startColumnIndex: 1,
              endColumnIndex: numHabitColumns + 1,
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
            fields:
              "userEnteredFormat(textFormat,horizontalAlignment,verticalAlignment)",
          },
        },
        // Add borders
        {
          updateBorders: {
            range: {
              sheetId: sheetId,
              startRowIndex: 0,
              endRowIndex: numDataRows + 1,
              startColumnIndex: 0,
              endColumnIndex: numHabitColumns + 1,
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
              endIndex: numHabitColumns + 1,
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

      const response = await makeAuthenticatedRequest(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            requests: requests,
          }),
        },
        accessToken
      );

      if (!response.ok) {
        const errorBody = await response.text();
        console.error("Formatting error details:", errorBody);
        throw new Error(
          `Failed to format spreadsheet: ${response.statusText} - ${errorBody}`
        );
      }

      console.log("✅ Beautiful formatting applied successfully");
    } catch (error) {
      console.error("❌ Error formatting spreadsheet:", error);
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
   * using spreadSheetData from agtument NOT USING PROPER METHODS
   * creates habits info and returns it
   */
  const parseSpreadsheetDataToHabits = async (spreadsheetData: {
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

        if (habitData.length > 0) {
          snapshots.push({
            date: date,
            habbits: habitData,
          });
        }
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
   * using proper methods like addHabit and saveDailySnapshot initializesHabits
   */
  const initializeHabitsFromSpreadsheet = async (
    habits: IHabbit[],
    snapshots: IDailySnapshot[]
  ) => {
    try {
      console.log("Initializing habits from spreadsheet data...");

      // Add all habits to localStorage
      for (const habit of habits) {
        await addHabit(habit);
      }

      // Add all daily snapshots to localStorage
      for (const snapshot of snapshots) {
        await saveDailySnapshot(snapshot);
      }

      console.log("✅ Successfully initialized habits from spreadsheet");
      return true;
    } catch (error) {
      console.error("❌ Error initializing habits:", error);
      return false;
    }
  };

  /**
   * Finds spreadSheet by accessToken and populates it with data
   */
  const manualSyncToSpreadsheet = async (accessToken: string) => {
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
          existingSpreadsheet.id
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
        return await syncWithGoogleSheets(accessToken);
      }
    } catch (error) {
      console.error("❌ Error during manual sync:", error);
      setIsUpdatingSpreadsheet(false);
    }
  };

  /**
   * login function
   */
  const login = useGoogleLogin({
    flow: "auth-code",
    onSuccess: async (codeResponse) => {
      console.log("Login successful:", codeResponse);
      const code = codeResponse.code;

      const tokenResponse = await axios.post("/api/auth/google", {
        // Next.js API route that will exchange the code
        code,
      });

      console.log("Received tokens:", tokenResponse.data);

      const { access_token, refresh_token } = tokenResponse.data;

      if (access_token) {
        console.log(
          "✅ Access token received - can proceed with Google Sheets integration"
        );

        // Store refresh token if available
        if (refresh_token) {
          console.log("✅ Refresh token also received");
          setRefreshToken(refresh_token);
          localStorage.setItem("googleRefreshToken", refresh_token);
        }

        // Update user state with access token
        onChangeUser({ key: access_token });

        // Sync with Google Sheets after successful login
        syncWithGoogleSheets(access_token);

        // Register update functon
        registerSyncFunction(() => manualSyncToSpreadsheet(access_token));
      } else {
        console.log("❌ No access token received");
      }
    },
    onError: (error) => {
      console.error("Login failed:", error);
    },
    scope: SCOPES,
  });

  function handleConnectClick() {
    login();
  }

  return (
    <div style={{ height: "152px" }}>
      {/* <div>
        <span>Google Sheets integration</span>
      </div> */}
      <div className="max-w-md mx-auto space-y-4">
        {/* Creating/Updating Spreadsheet State */}
        {(isCreatingSpreadsheet || isUpdatingSpreadsheet) && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path
                  fill="#4285f4"
                  d="M11.5 12.5v5h6.5c-.17 1.39-.72 2.73-1.5 3.87L20.84 17C22.2 15.13 23 12.8 23 10.18c0-.83-.09-1.64-.27-2.41H12v4.73h5.5z"
                />
              </svg>
              <h3 className="font-semibold text-blue-900">Google Sheets</h3>
              <div className="ml-auto">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              </div>
            </div>
            <p className="text-sm text-blue-700 mb-4 flex items-center gap-2">
              <svg
                className="w-4 h-4 text-blue-600 animate-spin"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              {isCreatingSpreadsheet
                ? "Creating your habits spreadsheet..."
                : "Updating..."}
            </p>
          </div>
        )}
        {/* Connected State with Spreadsheet */}
        {currentUser && !isCreatingSpreadsheet && !isUpdatingSpreadsheet && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path
                  fill="#0f9d58"
                  d="M11.5 12.5v5h6.5c-.17 1.39-.72 2.73-1.5 3.87L20.84 17C22.2 15.13 23 12.8 23 10.18c0-.83-.09-1.64-.27-2.41H12v4.73h5.5z"
                />
                <path
                  fill="#4285f4"
                  d="M6 12c0-.8.13-1.56.36-2.28L2.05 6.7C1.23 8.34 0.82 10.13 0.82 12s.41 3.66 1.23 5.3l4.31-3.02c-.23-.72-.36-1.48-.36-2.28z"
                />
                <path
                  fill="#ea4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.05 7.07l4.31 3.02C7.25 7.69 9.39 5.38 12 5.38z"
                />
                <path
                  fill="#fbbc04"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.61 0-4.75-1.76-5.54-4.12l-4.31 3.33C3.99 20.53 7.7 23 12 23z"
                />
              </svg>
              <h3 className="font-semibold text-green-900">Google Sheets</h3>
              <div className="ml-auto">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              </div>
            </div>
            <p className="text-sm text-green-700 mb-4 flex items-center gap-2">
              <svg
                className="w-4 h-4 text-green-600"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              {spreadsheetUrl
                ? "Connected to existing spreadsheet"
                : "Connected - access token obtained from stored refresh token"}
            </p>
            <div className="flex gap-2">
              {spreadsheetUrl && (
                <button
                  onClick={() => window.open(spreadsheetUrl, "_blank")}
                  className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded-lg font-medium transition-colors duration-200"
                >
                  Open Spreadsheet
                </button>
              )}
              <button
                onClick={() => {
                  if (currentUser?.key) {
                    // Sync with google: use google data
                    syncWithGoogleSheets(currentUser?.key).then(console.log);
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg font-medium transition-colors duration-200"
              >
                Sync Now
              </button>
              <button
                onClick={() => {
                  onChangeUser({ key: "" });
                  clearSpreadsheetInfo();
                }}
                className="bg-white hover:bg-gray-50 text-green-600 text-sm px-4 py-2 rounded-lg font-medium border border-green-200 transition-colors duration-200"
              >
                Disconnect
              </button>
            </div>
          </div>
        )}
        {/* Not Connected State */}
        {currentUser === undefined &&
          !isCreatingSpreadsheet &&
          !isUpdatingSpreadsheet && (
            <div className="bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <svg className="w-6 h-6 opacity-50" viewBox="0 0 24 24">
                  <path
                    fill="#9ca3af"
                    d="M11.5 12.5v5h6.5c-.17 1.39-.72 2.73-1.5 3.87L20.84 17C22.2 15.13 23 12.8 23 10.18c0-.83-.09-1.64-.27-2.41H12v4.73h5.5z"
                  />
                  <path
                    fill="#9ca3af"
                    d="M6 12c0-.8.13-1.56.36-2.28L2.05 6.7C1.23 8.34 0.82 10.13 0.82 12s.41 3.66 1.23 5.3l4.31-3.02c-.23-.72-.36-1.48-.36-2.28z"
                  />
                  <path
                    fill="#9ca3af"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.05 7.07l4.31 3.02C7.25 7.69 9.39 5.38 12 5.38z"
                  />
                  <path
                    fill="#9ca3af"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.61 0-4.75-1.76-5.54-4.12l-4.31 3.33C3.99 20.53 7.7 23 12 23z"
                  />
                </svg>
                <h3 className="font-semibold text-gray-700">Google Sheets</h3>
                <div className="ml-auto">
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Connect Google Sheets to automatically sync your habits history
              </p>
              <button
                onClick={handleConnectClick}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                  />
                </svg>
                Connect
              </button>
            </div>
          )}
        {/* <!-- Error State --> */}
        {/* <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path
                fill="#9ca3af"
                d="M11.5 12.5v5h6.5c-.17 1.39-.72 2.73-1.5 3.87L20.84 17C22.2 15.13 23 12.8 23 10.18c0-.83-.09-1.64-.27-2.41H12v4.73h5.5z"
              />
              <path
                fill="#9ca3af"
                d="M6 12c0-.8.13-1.56.36-2.28L2.05 6.7C1.23 8.34 0.82 10.13 0.82 12s.41 3.66 1.23 5.3l4.31-3.02c-.23-.72-.36-1.48-.36-2.28z"
              />
              <path
                fill="#9ca3af"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.05 7.07l4.31 3.02C7.25 7.69 9.39 5.38 12 5.38z"
              />
              <path
                fill="#9ca3af"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.61 0-4.75-1.76-5.54-4.12l-4.31 3.33C3.99 20.53 7.7 23 12 23z"
              />
            </svg>
            <h3 className="font-semibold text-red-900">Google Sheets</h3>
            <div className="ml-auto">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            </div>
          </div>
          <p className="text-sm text-red-700 mb-4 flex items-center gap-2">
            <svg
              className="w-4 h-4 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Sync error. Check connection
          </p>
          <div className="flex gap-2">
            <button className="bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-2 rounded-lg font-medium transition-colors duration-200">
              Repeat
            </button>
            <button className="bg-white hover:bg-gray-50 text-red-600 text-sm px-4 py-2 rounded-lg font-medium border border-red-200 transition-colors duration-200">
              Settings
            </button>
          </div>
        </div> */}
      </div>
    </div>
  );
};

export default IntegrationPannel;
