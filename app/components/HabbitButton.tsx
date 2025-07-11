interface HabbitButtonProps {
  title: string;
  bgColor: string;
}

const HabitButton: React.FC<HabbitButtonProps> = ({
  title,
  bgColor = "bg-white",
}) => {
  let subtitle = "0/10";
  let completed = false;
  return (
    <div
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
      
      `}
    >
      <div className="flex items-center space-x-4">
        {/* Текст */}
        <div className="text-left">
          <div className="text-lg font-medium text-gray-900">{title}</div>
          {subtitle && <div className="text-sm text-gray-500">{subtitle}</div>}
        </div>
      </div>

      {/* Правая часть - кнопка действия */}
      <button className="rounded-full flex-shrink-0 active:scale-120 duration-30 transition-all hover:shadow-md ">
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
      </button>
    </div>
  );
};

export default HabitButton;
