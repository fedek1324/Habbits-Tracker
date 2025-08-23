import User from "@/types/user";

interface IntegrationPannelProps {
  currentUser: User | undefined;
  onChangeUser: (user: User) => void;
}

const IntegrationPannel: React.FC<IntegrationPannelProps> = ({
  currentUser, onChangeUser
}) => {
  function handleConnectClick() {
    
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

        {currentUser === undefined && (
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
            <button onClick={handleConnectClick} className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2">
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
