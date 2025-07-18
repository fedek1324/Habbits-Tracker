import IHabbit from "@/types/habbit";
import { LuTrash } from "react-icons/lu";


function getPastelColorFromId(id: string): string {
  // Простая хеш-функция
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Ограничим hue от 0 до 360
  const hue = Math.abs(hash) % 360;

  // HSL: высокая светлота (80%), малая насыщенность 90%) → пастельные
  return `hsl(${hue}, 80%, 94%)`;
}

interface HabbitButtonProps {
  habbit: IHabbit,
  onIncrement: (id: string) => void,
  onDelete: (id: string) => void
}

const HabitButton: React.FC<HabbitButtonProps> = ({
  habbit,
  onIncrement,
  onDelete
}) => {
  const subtitle = `${habbit.currentCount}/${habbit.needCount}`;
  const completed = habbit.currentCount === habbit.needCount;

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
          <div className="text-lg font-medium text-gray-900">{habbit.text}</div>
          {subtitle && <div className="text-sm text-gray-500">{subtitle}</div>}
        </div>
      </div>

      <div className="flex space-x-2">
        {/* Right part - action button */}
        <button 
          onClick={() => onIncrement(habbit.id)}
          className="rounded-full flex-shrink-0 active:scale-120 duration-30 transition-all hover:shadow-md ">
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

        {/* Right part - delete button */}
        <button 
          onClick={() => onDelete(habbit.id)}
          className="rounded-full flex-shrink-0 active:scale-120 duration-30 transition-all hover:shadow-md ">
          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
            <LuTrash  />
          </div>
        </button>
      </div>
    </div>
  );
};

export default HabitButton;
