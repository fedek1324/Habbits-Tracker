import IHabbit from "@/app/types/habbit";
import { FormEventHandler, useEffect, useState } from "react";
import { LuTrash } from "react-icons/lu";
import { MdOutlineEdit } from "react-icons/md";
import Modal from "./Modal";

function getPastelColorFromId(id: string): string {
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Restrict hue from 0 to 360
  const hue = Math.abs(hash) % 360;

  // HSL: high saturation (80%), lightness 90%) → pastel color
  return `hsl(${hue}, 80%, 94%)`;
}

interface HabbitButtonProps {
  habbit: IHabbit;
  currentCount: number;
  needCount: number;
  onIncrement: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (habbit: IHabbit, newNeedCount?: number, newActualCount?: number) => void;
}

const HabitButton: React.FC<HabbitButtonProps> = ({
  habbit,
  currentCount,
  needCount,
  onIncrement,
  onDelete,
  onEdit,
}) => {
  const subtitle = `${currentCount}/${needCount}`;
  const completed = currentCount === needCount;

  const [isEditModalOpen, setEditModalOpen] = useState<boolean>(false);
  const [newHabbitText, setNewHabbitText] = useState<string>(habbit.text);
  const [newHabbitCurrentCount, setNewHabbitCurrentCount] = useState<string>(
    String(currentCount)
  );
  const [newHabbitNeedCount, setNewHabbitNeedCount] = useState<string>(
    String(needCount)
  );
  const [currentCountError, setCurrentCountError] = useState<string>(""); // for error message
  const [needCountError, setNeedCountError] = useState<string>(""); // for error message
  const [textError, setTextError] = useState<string>(""); // for error message

  const handleEditHabbit: FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();

    let habbitNeedCount;
    if (!/^\d+$/.test(newHabbitNeedCount)) {
      setNeedCountError("Enter a valid number");
      return;
    } else {
      habbitNeedCount = parseInt(newHabbitNeedCount, 10);
      if (!(habbitNeedCount > 0 && habbitNeedCount < 1e6)) {
        setNeedCountError("Enter a valid number more that 0");
        return;
      }
    }

    let habbitCurrentCount;
    if (!/^\d+$/.test(newHabbitCurrentCount)) {
      setCurrentCountError("Enter a valid number");
      return;
    } else {
      habbitCurrentCount = parseInt(newHabbitCurrentCount, 10);
      if (!(habbitCurrentCount >= 0 && habbitCurrentCount < 1e6 && 
        habbitCurrentCount <= habbitNeedCount
      )) {
        setCurrentCountError("Enter a valid number less or equal to habbit aim");
        return;
      }
    }

    if (newHabbitText === "" || newHabbitText.length > 1e3) {
      setTextError("Enter a valid text");
      return;
    }

    const updatedHabbit = {
      id: habbit.id,
      text: newHabbitText.trim(),
    };

    onEdit(updatedHabbit, habbitNeedCount, habbitCurrentCount);

    setNewHabbitText("");
    setNewHabbitCurrentCount("");
    setNewHabbitNeedCount("");

    setCurrentCountError("");
    setNeedCountError("");
    setTextError("");
    setEditModalOpen(false);
  };

  useEffect(() => {
    if (isEditModalOpen) {
      setNewHabbitText(habbit.text);
      setNewHabbitCurrentCount(String(currentCount));
      setNewHabbitNeedCount(String(needCount));
    }
  }, [isEditModalOpen, habbit, currentCount, needCount]);

  return (
    <div
      className={`
        rounded-2xl 
        p-4 
        w-full 
        flex 
        items-center 
        justify-between 
        shadow-sm 
        hover:shadow-md 
        transition-all 
      
      `}
      style={{ backgroundColor: getPastelColorFromId(habbit.id) }}
    >
      <div className="flex items-center space-x-4">
        {/* Text */}
        <div className="text-left">
          <span
            style={{ wordBreak: "break-word" }}
            className="block text-lg font-medium text-gray-900"
            title={habbit.text}
          >
            {habbit.text}
          </span>
          {subtitle && (
            <span className="block text-sm text-gray-600">{subtitle}</span>
          )}
        </div>
      </div>

      <div className="flex space-x-2">
        {/* Right part - action button */}
        <button
          onClick={() => onIncrement(habbit.id)}
          className="rounded-full flex-shrink-0 active:scale-120 duration-30 transition-all hover:shadow-md "
        >
          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
            <svg
              className="w-5 h-5 text-gray-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              {completed ? (
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              ) : (
                <path
                  fillRule="evenodd"
                  d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                  clipRule="evenodd"
                />
              )}
            </svg>
          </div>
        </button>

        {/* Right part - edit button */}
        <button
          onClick={() => setEditModalOpen(true)}
          className="rounded-full flex-shrink-0 active:scale-120 duration-30 transition-all hover:shadow-md "
        >
          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
            <MdOutlineEdit />
          </div>
        </button>

        <Modal modalOpen={isEditModalOpen} setModalOpen={setEditModalOpen}>
          <form onSubmit={handleEditHabbit} className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold">Edit habit</h2>

            {/* Habbit name */}
            <div className="flex flex-col">
              <input
                type="text"
                placeholder="Habit name"
                value={newHabbitText}
                onChange={(e) => {
                  setNewHabbitText(e.target.value);
                  setTextError("");
                }}
                aria-label="Habbit name"
                className={
                  "border border-gray-300 rounded-lg " +
                  "px-4 py-2 focus:outline-none " +
                  "focus:ring-2 focus:ring-blue-400" +
                  (textError
                    ? "border-red-500 focus:ring-red-300"
                    : "border-gray-300 focus:ring-blue-400")
                }
              />
              {textError && (
                <p className="mt-1 text-sm text-red-600">{textError}</p>
              )}
            </div>

            {/* Current count */}
            <div className="flex flex-col">
              <input
                type="text"
                inputMode="numeric"
                placeholder="Current repetitions per day"
                value={newHabbitCurrentCount}
                onChange={(e) => {
                  setNewHabbitCurrentCount(e.target.value);
                  setCurrentCountError("");
                }}
                aria-label="Repetitions per day"
                className={
                  "border border-gray-300 rounded-lg " +
                  "px-4 py-2 focus:outline-none " +
                  "focus:ring-2 focus:ring-blue-400" +
                  (currentCountError
                    ? "border-red-500 focus:ring-red-300"
                    : "border-gray-300 focus:ring-blue-400")
                }
              />
              {currentCountError && (
                <p className="mt-1 text-sm text-red-600">{currentCountError}</p>
              )}
            </div>

            {/* Repetitions count */}
            <div className="flex flex-col">
              <input
                type="text"
                inputMode="numeric"
                placeholder="Need repetitions per day"
                value={newHabbitNeedCount}
                onChange={(e) => {
                  setNewHabbitNeedCount(e.target.value);
                  setNeedCountError("");
                }}
                aria-label="Repetitions per day"
                className={
                  "border border-gray-300 rounded-lg " +
                  "px-4 py-2 focus:outline-none " +
                  "focus:ring-2 focus:ring-blue-400" +
                  (needCountError
                    ? "border-red-500 focus:ring-red-300"
                    : "border-gray-300 focus:ring-blue-400")
                }
              />
              {needCountError && (
                <p className="mt-1 text-sm text-red-600">{needCountError}</p>
              )}
            </div>

            {/* Sumbit button */}
            <button
              type="submit"
              className="bg-blue-500 text-white font-medium py-2 rounded-lg hover:bg-blue-600 transition-colors"
            >
              Submit
            </button>
          </form>
        </Modal>

        {/* Right part - delete button */}
        <button
          onClick={() => onDelete(habbit.id)}
          className="rounded-full flex-shrink-0 active:scale-120 duration-30 transition-all hover:shadow-md "
        >
          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
            <LuTrash />
          </div>
        </button>
      </div>
    </div>
  );
};

export default HabitButton;
