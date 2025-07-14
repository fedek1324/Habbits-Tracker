"use client";

import { addHabit } from "@/api";
import { v4 as uuidv4 } from "uuid";
import { useRouter } from "next/navigation";
import { FormEventHandler, useState } from "react";
import Modal from "./Modal";
import IHabbit from "@/types/habbit";

const AddHabbit: React.FC<{ onAdd: (habbit: IHabbit) => void }> = ({ onAdd }) => {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [newHabbitText, setNewHabbitText] = useState<string>("");
  const [newHabbitCount, setNewHabbitCount] = useState<number>(1);

  const handleSubmitNewHabbit: FormEventHandler<HTMLFormElement> = async (
    e
  ) => {
    e.preventDefault();
    const newHabbit = {
      id: uuidv4(),
      text: newHabbitText,
      currentCount: 0,
      needCount: newHabbitCount,
    };
    await addHabit(newHabbit);
    onAdd(newHabbit);
    setNewHabbitText("");
    setModalOpen(false);
  };

  return (
    <div className="w-full">
      <button
        onClick={() => setModalOpen(true)}
        className="w-full mt-2 p-4 border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center space-x-2 text-gray-500 hover:border-gray-300 hover:text-gray-600 transition-colors"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
            clipRule="evenodd"
          />
        </svg>
        <span>Add habbit</span>
      </button>

      <Modal modalOpen={modalOpen} setModalOpen={setModalOpen}>
        <form onSubmit={handleSubmitNewHabbit} className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold">Add new habit</h2>

          <input
            value={newHabbitText}
            onChange={(e) => setNewHabbitText(e.target.value)}
            type="text"
            placeholder="Habit name"
            className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />

          <input
            value={newHabbitCount}
            onChange={(e) => setNewHabbitCount(Number(e.target.value))}
            type="number"
            min={1}
            max={100}
            placeholder="Repetitions per day"
            aria-label="Repetitions per day"
            className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />

          <button
            type="submit"
            className="bg-blue-500 text-white font-medium py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Submit
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default AddHabbit;
