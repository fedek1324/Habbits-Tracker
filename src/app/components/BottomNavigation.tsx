"use client";

import { IoTodayOutline, IoTimeOutline } from "react-icons/io5";

interface BottomNavigationProps {
  activeTab: "today" | "history";
  onTabChange: (tab: "today" | "history") => void;
}

const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab,
  onTabChange,
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
      <div className="max-w-2xl mx-auto">
        <div className="flex">
          <button
            onClick={() => onTabChange("today")}
            className={`
              flex-1 flex flex-col items-center justify-center py-3 px-4
              transition-colors duration-200
              ${
                activeTab === "today"
                  ? "text-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }
            `}
          >
            <IoTodayOutline
              className={`w-6 h-6 mb-1 ${
                activeTab === "today" ? "text-blue-600" : ""
              }`}
            />
            <span
              className={`text-xs ${
                activeTab === "today" ? "font-medium" : ""
              }`}
            >
              Today
            </span>
          </button>

          <button
            onClick={() => onTabChange("history")}
            className={`
              flex-1 flex flex-col items-center justify-center py-3 px-4
              transition-colors duration-200
              ${
                activeTab === "history"
                  ? "text-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }
            `}
          >
            <IoTimeOutline
              className={`w-6 h-6 mb-1 ${
                activeTab === "history" ? "text-blue-600" : ""
              }`}
            />
            <span
              className={`text-xs ${
                activeTab === "history" ? "font-medium" : ""
              }`}
            >
              History
            </span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default BottomNavigation;