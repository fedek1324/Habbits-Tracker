import User from "@/types/user";
import { useGoogleLogin } from "@react-oauth/google";
import { hasGrantedAllScopesGoogle } from "@react-oauth/google";
import React, { useState, useEffect } from "react";
import { getHabits, getDailySnapshots } from "@/api";

interface IntegrationPannelProps {
  currentUser: User | undefined;
  onChangeUser: (user: User) => void;
}

const IntegrationPannel: React.FC<IntegrationPannelProps> = ({
  currentUser,
  onChangeUser,
}) => {
  console.log("IntegrationPannel: Component rendering");
  
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string | null>(null);
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(null);
  const [isCreatingSpreadsheet, setIsCreatingSpreadsheet] = useState(false);
  const [isUpdatingSpreadsheet, setIsUpdatingSpreadsheet] = useState(false);
  
  console.log("IntegrationPannel: State initialized");
  
  const SCOPES =
    "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file";

  // Load existing spreadsheet info from localStorage on component mount
  useEffect(() => {
    console.log("IntegrationPannel: useEffect running");
    try {
      const savedSpreadsheetId = localStorage.getItem('habitsSpreadsheetId');
      const savedSpreadsheetUrl = localStorage.getItem('habitsSpreadsheetUrl');
      console.log("Saved spreadsheet ID:", savedSpreadsheetId);
      console.log("Saved spreadsheet URL:", savedSpreadsheetUrl);
      if (savedSpreadsheetId && savedSpreadsheetUrl) {
        setSpreadsheetId(savedSpreadsheetId);
        setSpreadsheetUrl(savedSpreadsheetUrl);
      }
      console.log("IntegrationPannel: useEffect completed");
    } catch (error) {
      console.error("Error in useEffect:", error);
    }
  }, []);

  // Save spreadsheet info to localStorage
  const saveSpreadsheetInfo = (id: string, url: string) => {
    localStorage.setItem('habitsSpreadsheetId', id);
    localStorage.setItem('habitsSpreadsheetUrl', url);
    setSpreadsheetId(id);
    setSpreadsheetUrl(url);
  };

  // Clear spreadsheet info from localStorage
  const clearSpreadsheetInfo = () => {
    localStorage.removeItem('habitsSpreadsheetId');
    localStorage.removeItem('habitsSpreadsheetUrl');
    setSpreadsheetId(null);
    setSpreadsheetUrl(null);
  };

  const syncWithGoogleSheets = async (accessToken: string) => {
    try {
      // Check if we have an existing spreadsheet
      if (spreadsheetId) {
        console.log("Updating existing spreadsheet:", spreadsheetId);
        setIsUpdatingSpreadsheet(true);
        
        // First, check if the spreadsheet still exists by trying to get its metadata
        try {
          const checkResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          });
          
          if (!checkResponse.ok) {
            throw new Error(`Spreadsheet not found: ${checkResponse.status}`);
          }
          
          // If spreadsheet exists, update it
          await populateSpreadsheetWithHabits(accessToken, spreadsheetId, true);
          console.log("✅ Successfully updated existing spreadsheet");
          setIsUpdatingSpreadsheet(false);
          return { spreadsheetId, spreadsheetUrl };
        } catch (updateError) {
          console.warn("⚠️ Failed to update existing spreadsheet, creating new one:", updateError);
          // Clear the invalid spreadsheet info and create a new one
          clearSpreadsheetInfo();
          setIsUpdatingSpreadsheet(false);
        }
      }
      
      // Create a new spreadsheet
      setIsCreatingSpreadsheet(true);
      console.log("Creating new habits spreadsheet...");
      
      const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          properties: {
            title: "My habits tracker",
          },
          sheets: [{
            properties: {
              title: 'Habits Data',
            },
          }],
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create spreadsheet: ${response.statusText}`);
      }

      const spreadsheet = await response.json();
      console.log("✅ Spreadsheet created successfully:", spreadsheet);
      console.log("📝 Spreadsheet ID:", spreadsheet.spreadsheetId);
      console.log("🔗 Spreadsheet URL:", spreadsheet.spreadsheetUrl);

      // Populate with existing habits data (this will also set up headers)
      await populateSpreadsheetWithHabits(accessToken, spreadsheet.spreadsheetId, false);
      
      // Save the spreadsheet info
      saveSpreadsheetInfo(spreadsheet.spreadsheetId, spreadsheet.spreadsheetUrl);
      setIsCreatingSpreadsheet(false);
      setIsUpdatingSpreadsheet(false);
      
      return spreadsheet;
    } catch (error) {
      console.error("❌ Error syncing with Google Sheets:", error);
      setIsCreatingSpreadsheet(false);
      setIsUpdatingSpreadsheet(false);
    }
  };

  const setupSpreadsheetHeaders = async (accessToken: string, spreadsheetId: string, habitNames: string[]) => {
    try {
      console.log("Setting up spreadsheet headers...");
      
      // Create headers: Date + each habit name
      const headers = [['Date', ...habitNames]];

      const columnRange = String.fromCharCode(65 + habitNames.length); // A=65, so A+habitNames.length gives us the end column
      const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:${columnRange}1?valueInputOption=USER_ENTERED`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: headers,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Failed to set headers: ${response.status} ${response.statusText} - ${errorBody}`);
      }

      console.log("✅ Headers set up successfully");
    } catch (error) {
      console.error("❌ Error setting up headers:", error);
    }
  };

  const clearSpreadsheetData = async (accessToken: string, spreadsheetId: string) => {
    try {
      console.log("Clearing existing spreadsheet data...");
      
      // Get the spreadsheet to find the sheet dimensions
      const spreadsheetResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      
      if (!spreadsheetResponse.ok) {
        throw new Error(`Failed to get spreadsheet details: ${spreadsheetResponse.statusText}`);
      }
      
      const spreadsheetData = await spreadsheetResponse.json();
      const sheet = spreadsheetData.sheets[0];
      const sheetId = sheet.properties.sheetId;
      
      // Clear all data by deleting rows (keeping headers)
      const requests = [{
        deleteDimension: {
          range: {
            sheetId: sheetId,
            dimension: 'ROWS',
            startIndex: 1, // Start from row 2 (0-indexed), keep header row
          }
        }
      }];
      
      const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests }),
      });
      
      if (!response.ok) {
        // If clearing fails, it might be because there are no data rows, which is fine
        console.log("Note: Could not clear data (might be empty already)");
      } else {
        console.log("✅ Existing data cleared successfully");
      }
    } catch (error) {
      console.warn("⚠️ Error clearing existing data (proceeding anyway):", error);
    }
  };

  const populateSpreadsheetWithHabits = async (accessToken: string, spreadsheetId: string, isUpdate = false) => {
    try {
      console.log(isUpdate ? "Updating spreadsheet with latest habits data..." : "Populating spreadsheet with habits data...");
      
      // If this is an update, clear existing data first
      if (isUpdate) {
        await clearSpreadsheetData(accessToken, spreadsheetId);
      }
      
      // Get daily snapshots (historical data) and habits (for names)
      const [snapshots, habits] = await Promise.all([
        getDailySnapshots(),
        getHabits()
      ]);
      
      console.log("Found snapshots:", snapshots.length);
      console.log("Found habits:", habits.length);
      
      if (snapshots.length === 0) {
        console.log("No historical data found to populate");
        return;
      }

      // Get all unique habit names and create a mapping
      const habitIdToName = new Map<string, string>();
      habits.forEach(habit => {
        habitIdToName.set(habit.id, habit.text);
      });

      // Get all unique habit names from snapshots (in case there are deleted habits)
      const allHabitNames = new Set<string>();
      snapshots.forEach(snapshot => {
        snapshot.habbits.forEach(habitSnapshot => {
          const habitName = habitIdToName.get(habitSnapshot.habbitId) || "Unknown Habit";
          allHabitNames.add(habitName);
        });
      });

      const habitNamesArray = Array.from(allHabitNames).sort();
      console.log("Habit columns:", habitNamesArray);

      // Set up headers first
      await setupSpreadsheetHeaders(accessToken, spreadsheetId, habitNamesArray);

      // Create a data structure: Map<date, Map<habitName, progress>>
      const dateData = new Map<string, Map<string, string>>();

      snapshots.forEach((snapshot) => {
        if (!dateData.has(snapshot.date)) {
          dateData.set(snapshot.date, new Map());
        }
        
        const dayData = dateData.get(snapshot.date)!;
        
        snapshot.habbits.forEach((habitSnapshot) => {
          const habitName = habitIdToName.get(habitSnapshot.habbitId) || "Unknown Habit";
          // Show progress as "actual/target" format
          const progress = `${habitSnapshot.habbitDidCount}/${habitSnapshot.habbitNeedCount}`;
          dayData.set(habitName, progress);
        });
      });

      // Convert to rows for the spreadsheet
      const rows: string[][] = [];
      const sortedDates = Array.from(dateData.keys()).sort();

      sortedDates.forEach(date => {
        const row = [date];
        const dayData = dateData.get(date)!;
        
        // Add data for each habit column (in same order as headers)
        habitNamesArray.forEach(habitName => {
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
      const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A2:${endColumn}${endRow}?valueInputOption=USER_ENTERED`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: rows,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Failed to populate data: ${response.status} ${response.statusText} - ${errorBody}`);
      }

      console.log(`✅ Successfully populated ${rows.length} rows with ${habitNamesArray.length} habit columns`);
      
      // Format the spreadsheet beautifully
      await formatSpreadsheet(accessToken, spreadsheetId, habitNamesArray.length, rows.length);
      
    } catch (error) {
      console.error("❌ Error populating spreadsheet with habits:", error);
    }
  };

  const formatSpreadsheet = async (accessToken: string, spreadsheetId: string, numHabitColumns: number, numDataRows: number) => {
    try {
      console.log("Applying beautiful formatting to spreadsheet...");
      
      // Get the spreadsheet to find the correct sheet ID
      const spreadsheetResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      
      if (!spreadsheetResponse.ok) {
        throw new Error(`Failed to get spreadsheet details: ${spreadsheetResponse.statusText}`);
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
              endColumnIndex: numHabitColumns + 1
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.2, green: 0.4, blue: 0.8 },
                textFormat: {
                  foregroundColor: { red: 1, green: 1, blue: 1 },
                  fontSize: 12,
                  bold: true
                },
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE'
              }
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
          }
        },
        // Format date column
        {
          repeatCell: {
            range: {
              sheetId: sheetId,
              startRowIndex: 1,
              endRowIndex: numDataRows + 1,
              startColumnIndex: 0,
              endColumnIndex: 1
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.95, green: 0.95, blue: 0.95 },
                textFormat: {
                  fontSize: 10,
                  bold: true
                },
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE'
              }
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
          }
        },
        // Format habit data columns
        {
          repeatCell: {
            range: {
              sheetId: sheetId,
              startRowIndex: 1,
              endRowIndex: numDataRows + 1,
              startColumnIndex: 1,
              endColumnIndex: numHabitColumns + 1
            },
            cell: {
              userEnteredFormat: {
                textFormat: {
                  fontSize: 10
                },
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE'
              }
            },
            fields: 'userEnteredFormat(textFormat,horizontalAlignment,verticalAlignment)'
          }
        },
        // Add borders
        {
          updateBorders: {
            range: {
              sheetId: sheetId,
              startRowIndex: 0,
              endRowIndex: numDataRows + 1,
              startColumnIndex: 0,
              endColumnIndex: numHabitColumns + 1
            },
            top: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
            bottom: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
            left: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
            right: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
            innerHorizontal: { style: 'SOLID', width: 1, color: { red: 0.9, green: 0.9, blue: 0.9 } },
            innerVertical: { style: 'SOLID', width: 1, color: { red: 0.9, green: 0.9, blue: 0.9 } }
          }
        },
        // Auto-resize columns
        {
          autoResizeDimensions: {
            dimensions: {
              sheetId: sheetId,
              dimension: 'COLUMNS',
              startIndex: 0,
              endIndex: numHabitColumns + 1
            }
          }
        },
        // Freeze first row and first column
        {
          updateSheetProperties: {
            properties: {
              sheetId: sheetId,
              gridProperties: {
                frozenRowCount: 1,
                frozenColumnCount: 1
              }
            },
            fields: 'gridProperties.frozenRowCount,gridProperties.frozenColumnCount'
          }
        }
      ];

      console.log("Formatting request:", JSON.stringify({ requests: requests }, null, 2));

      const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: requests
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error("Formatting error details:", errorBody);
        throw new Error(`Failed to format spreadsheet: ${response.statusText} - ${errorBody}`);
      }

      console.log("✅ Beautiful formatting applied successfully");
    } catch (error) {
      console.error("❌ Error formatting spreadsheet:", error);
    }
  };

  const login = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      console.log("Login successful:", tokenResponse);
      
      // Check if all required scopes have been granted
      const hasAccess = hasGrantedAllScopesGoogle(
        tokenResponse,
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive.file"
      );
      
      console.log("Has all required scopes granted:", hasAccess);
      
      if (hasAccess) {
        console.log("✅ All scopes granted - can proceed with Google Sheets integration");
        // Update user state with access token
        onChangeUser({ key: tokenResponse.access_token });
        // Sync with Google Sheets after successful login
        syncWithGoogleSheets(tokenResponse.access_token);
      } else {
        console.log("❌ Not all scopes granted - user needs to grant additional permissions");
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
    <div>
      {/* <div>
        <span>Google Sheets integration</span>
      </div> */}
      <div className="max-w-md mx-auto space-y-4">
        {/* <!-- Google Sheets Panel - Connected State --> */}
        {/* <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-5 shadow-sm">
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
            <h3 className="font-semibold text-blue-900">Google Sheets</h3>
            <div className="ml-auto">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            </div>
          </div>
          <p className="text-sm text-blue-700 mb-4 flex items-center gap-2">
            <svg
              className="w-4 h-4 text-green-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fill-rule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clip-rule="evenodd"
              />
            </svg>
            Synchronized 2 minutes age
          </p>
          <div className="flex gap-2">
            <button className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg font-medium transition-colors duration-200">
              Open table
            </button>
            <button className="bg-white hover:bg-gray-50 text-blue-600 text-sm px-4 py-2 rounded-lg font-medium border border-blue-200 transition-colors duration-200">
              Sinchronization
            </button>
          </div>
        </div> */}

        {/* <!-- Syncing State --> */}
        {/* <div
          id="syncingState"
          className="hidden bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-2xl p-5 shadow-sm"
        >
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
            <h3 className="font-semibold text-amber-900">Google Sheets</h3>
            <div className="ml-auto">
              <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
            </div>
          </div>
          <p className="text-sm text-amber-700 mb-4 flex items-center gap-2">
            <svg
              className="w-4 h-4 text-amber-600 animate-spin"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Synchronizing...
          </p>
          <div className="flex gap-2">
            <button
              disabled
              className="bg-gray-300 text-gray-500 text-sm px-4 py-2 rounded-lg font-medium cursor-not-allowed"
            >
              Open table
            </button>
            <button
              disabled
              className="bg-gray-100 text-gray-400 text-sm px-4 py-2 rounded-lg font-medium border border-gray-200 cursor-not-allowed"
            >
              Sinchronizing
            </button>
          </div>
        </div> */}

        {/* <!-- Not Connected State --> */}

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
              {isCreatingSpreadsheet ? 'Creating your habits spreadsheet...' : 'Updating your habits spreadsheet...'}
            </p>
          </div>
        )}

        {/* Connected State with Spreadsheet */}
        {currentUser && spreadsheetUrl && !isCreatingSpreadsheet && !isUpdatingSpreadsheet && (
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
              {spreadsheetId ? 'Connected to existing spreadsheet' : 'Connected and spreadsheet ready'}
            </p>
            <div className="flex gap-2">
              <button 
                onClick={() => window.open(spreadsheetUrl, '_blank')}
                className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded-lg font-medium transition-colors duration-200"
              >
                Open Spreadsheet
              </button>
              <button 
                onClick={() => {
                  if (currentUser?.key) {
                    syncWithGoogleSheets(currentUser.key);
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
        {currentUser === undefined && !isCreatingSpreadsheet && !isUpdatingSpreadsheet && (
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

        {/* <!-- Sync Status Bar --> */}
        {/* <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <svg
            className="w-5 h-5 text-green-600"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fill-rule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clip-rule="evenodd"
            />
          </svg>
          <span className="text-sm text-green-800 font-medium">
            All habbits are synchronized
          </span>
        </div> */}

        {/* <!-- Sync Status Bar - Syncing --> */}
        {/* <div
          id="syncingBar"
          className="hidden bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3"
        >
          <svg
            className="w-5 h-5 text-amber-600 animate-spin"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span className="text-sm text-amber-800 font-medium">
            Synchronizing...
          </span>
        </div> */}
      </div>
    </div>
  );
};

export default IntegrationPannel;
