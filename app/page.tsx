import Image from "next/image";

const HabitButton = ({
  icon,
  title,
  subtitle,
  completed = false,
  hasProgress = false,
  bgColor = "bg-white",
  onClick,
}) => {
  return (
    <button
      className={`
        ${bgColor} 
        rounded-2xl 
        p-4 
        w-full 
        flex 
        items-center 
        justify-between 
        shadow-sm 
        border 
        border-gray-100
        hover:shadow-md 
        transition-all 
        duration-200
        active:scale-95
      `}
      onClick={onClick}
    >
      {/* Левая часть - иконка и текст */}
      <div className="flex items-center space-x-4">
        {/* Иконка */}
        <div className="text-2xl">{icon}</div>

        {/* Текст */}
        <div className="text-left">
          <div className="text-lg font-medium text-gray-900">{title}</div>
          {subtitle && <div className="text-sm text-gray-500">{subtitle}</div>}
        </div>
      </div>

      {/* Правая часть - кнопка действия */}
      <div className="flex-shrink-0">
        {completed ? (
          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
            <svg
              className="w-5 h-5 text-gray-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        ) : (
          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
            <svg
              className="w-5 h-5 text-gray-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        )}
      </div>
    </button>
  );
};

export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-4 sm:p-8 bg-gray-100">
      <main className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-md sm:max-w-2xl row-start-2 flex flex-col gap-8 items-center sm:items-start">
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-800">
          Hello!
        </h1>

        {/* Список привычек */}
        <div className="space-y-4">
          <HabitButton
            icon="🧘‍♂️"
            title="Медитация"
            completed={true}
            bgColor="bg-purple-50"
          />

          <HabitButton
            icon="💧"
            title="Вода"
            subtitle="2/8"
            completed={false}
            bgColor="bg-blue-50"
          />

          <HabitButton
            icon="📚"
            title="Читать"
            completed={true}
            bgColor="bg-orange-50"
          />
        </div>

        <button className="w-full mt-6 p-4 border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center space-x-2 text-gray-500 hover:border-gray-300 hover:text-gray-600 transition-colors">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
              clipRule="evenodd"
            />
          </svg>
          <span>Add habbit</span>
        </button>
      </main>
    </div>
  );
}
