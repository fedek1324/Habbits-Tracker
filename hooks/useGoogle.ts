import { getDailySnapshots, getHabits } from "@/services/apiLocalStorage";
import IDailySnapshot from "@/types/dailySnapshot";
import { GoogleState } from "@/types/googleState";
import IHabbit from "@/types/habbit";
import IHabbitsData from "@/types/habitsData";
import axios from "axios";
import { useCallback, useEffect, useState } from "react";

type SpreadSheetData = {
  majorDimension: "ROWS";
  range: string;
  values: Array<Array<string>> | undefined;
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

const SPREADSHEET_NAME = "My habits tracker";

export const useGoogle = (
  onDataLoad?: (data: IHabbitsData) => void,
  onDataLoadError?: (error: string) => void
) => {
  const [onDataLoadState, setOnDataLoadState] = useState<((data: IHabbitsData) => void) | undefined>(undefined);
  const [onDataLoadErrorState, setOnDataLoadErrorState] = useState<((error: string) => void) | undefined>(undefined);
  const [state, setState] = useState<GoogleState>(GoogleState.NOT_CONNECTED);

  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);

  useEffect(() => {
    if (onDataLoad) {
      setOnDataLoadState(onDataLoad);
    }
    if (onDataLoadError) {
      setOnDataLoadErrorState(onDataLoadError);
    }
  }, []);

  useEffect(() => {
    const localRefreshToken = localStorage.getItem("googleRefreshToken");
    if (localRefreshToken) {
      setState(GoogleState.HAS_REFRESH_TOKEN);
    } else {
      setState(GoogleState.NOT_CONNECTED);
    }
    setRefreshToken(localRefreshToken);
  }, []);


  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(null);
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string | null>(null);

  const setRefreshTokenPublic = useCallback((refreshToken: string): void => {
    if (refreshToken) {
      setState(GoogleState.HAS_REFRESH_TOKEN);
    } else {
      setState(GoogleState.NOT_CONNECTED);
    }
    localStorage.setItem("googleRefreshToken", refreshToken ?? null);
    setRefreshToken(refreshToken ?? null);
  }, []);

  /**
   * using refresh token from localStorage get access token and get google data.
   * If table doesn't exist create table with data from arguments.
   * If something went wrong return undefined.
   */
  const getDataCheckEmpty = useCallback(async (): Promise<
    | {
        snapshots: IDailySnapshot[];
        habits: IHabbit[];
      }
    | undefined
  > => {
    const habits = getHabits();
    const snapshots = getDailySnapshots();
    if (refreshToken) {
      // Automatically try to get a fresh access token
      const newAccessToken = await refreshAccessToken(refreshToken);
      if (newAccessToken) {
        console.log(
          "✅ Successfully refreshed access token from stored refresh token"
        );
        setAccessToken(newAccessToken);

        const googleData = await getData();
        if (googleData === undefined) {
          const spreadSheet = await createGoogleSpreadSheet(
            habits,
            snapshots
          );

          if (!spreadSheet) {
            // throw new Error("Spreadsheet couldn't be created");
            return undefined;
          }
          return { habits, snapshots: snapshots };
        } else {
          return googleData;
        }
      } else {
        console.log(
          "❌ Failed to refresh access token, removing stored refresh token"
        );
        localStorage.removeItem("googleRefreshToken");
        setRefreshToken(null);
        return undefined;
      }
    }
    return {habits, snapshots};
  }, [refreshToken]);

  const getData = useCallback(async (): Promise<
    | {
        habits: IHabbit[];
        snapshots: IDailySnapshot[];
      }
    | undefined
  > => {
    if (!accessToken) {
      return;
    }
    try {
      // Search for existing spreadsheet by name
      console.log(`Looking for spreadsheet named: "${SPREADSHEET_NAME}"`);
      const existingSpreadsheet = await findSpreadsheetByName(
        SPREADSHEET_NAME
      );

      if (existingSpreadsheet) {
        console.log("Found existing spreadsheet:", existingSpreadsheet.id);

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

        if (spreadsheetData) {
          const parsedData = parseSpreadsheetDataToHabits(spreadsheetData);

          console.log(
            "✅ Successfully reinitialized habits from existing spreadsheet"
          );
          return parsedData;
        } else {
          console.log(
            "No data found in existing spreadsheet, keeping current local data"
          );
        }
      }
      return undefined;
    } catch (error) {
      console.error("❌ Error syncing with Google Sheets:", error);
      return undefined;
    }
  }, [accessToken]);

  /**
   *
   * @returns spreadSheet object
   */
  const createGoogleSpreadSheet = useCallback(async (
    habits: IHabbit[],
    habitSnapshots: IDailySnapshot[]
  ) => {
    // Create a new spreadsheet
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
      }
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
      spreadsheet.spreadsheetId,
      habits,
      habitSnapshots
    );

    // Update state with new spreadsheet info
    setSpreadsheetId(spreadsheet.spreadsheetId);
    setSpreadsheetUrl(spreadsheet.spreadsheetUrl);

    return spreadsheet;
  }, [accessToken]);

  /**
   * Populates spreadSheet it with data from local storage
   */
  const uploadData = useCallback(async () => {
    setState(GoogleState.UPDATING);
    const habits = getHabits();
    const snapshots = getDailySnapshots();
    try {
      console.log("Manual sync: Pushing local data to spreadsheet...");

      if (spreadsheetId) {
        // Push local data to spreadsheet (don't read from spreadsheet)
        await populateSpreadsheetWithHabits(spreadsheetId, habits, snapshots);
        console.log("✅ Successfully pushed local data to spreadsheet");
        setState(GoogleState.CONNECTED);
        return;
      } else {
        // If no spreadsheet exists, create one
        console.error("No spreadsheetId found in manualSyncToSpreadsheet");
        setState(GoogleState.ERROR);
        return;
      }
    } catch (error) {
      console.error("❌ Error during manual sync:", error);
      setState(GoogleState.ERROR);
    }
  }, [accessToken]);

  /**
   * fill spreadsheet with habits
   * calling getDailySnapshots and getHabits
   */
  const populateSpreadsheetWithHabits = useCallback(async (
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
        }
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

      console.log("Uploading snapshots:", snapshots);
      console.log("Uploading habits:", habits);

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
        }
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
  }, [accessToken]);

  /**
   * use fetch with arguments and refrest access token if needed
   */
  const makeAuthenticatedRequest = useCallback(async (
    url: string,
    options: RequestInit,
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
        setAccessToken(newAccessToken);

        // Retry the request with new token
        return makeAuthenticatedRequest(url, options, 1);
      }
    }

    return response;
  }, [accessToken]);

  /**
   * using spreadSheetId and accessToken reads spreadSheet content
   */
  const readExistingSpreadsheetData = useCallback(async (
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
        }
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
        }
      );

      if (!dataResponse.ok) {
        throw new Error(
          `Failed to read spreadsheet data: ${dataResponse.status}`
        );
      }

      const data: SpreadSheetData = await dataResponse.json();
      const rows = data.values;

      if (!rows || rows.length === 0) {
        console.log("Spreadsheet is empty");
        return { headers: [], dataRows: [] };
      }

      console.log("Successfully read spreadsheet data:", rows.length, "rows");
      return { headers: rows[0], dataRows: rows.slice(1) };
    } catch (error) {
      console.error("❌ Error reading spreadsheet data:", error);
      return null;
    }
  }, [accessToken]);

  /**
   * find SpreadSheet by name using accessToken
   */
  const findSpreadsheetByName = useCallback(async (name: string) => {
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
        }
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
  }, [accessToken]);

  return {
    googleState: state,
    getGoogleData: getData,
    uploadDataToGoogle: uploadData,
    setGoogleRefreshToken: setRefreshTokenPublic,
    setGoolgeAccessToken: setAccessToken,
    spreadsheetUrl,
    spreadsheetId,
  };
};
