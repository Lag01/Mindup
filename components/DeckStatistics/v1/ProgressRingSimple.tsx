interface ProgressRingSimpleProps {
  percentage: number;
  label: string;
  sublabel: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeConfig = {
  sm: { diameter: 80, strokeWidth: 6, fontSize: 'text-xl' },
  md: { diameter: 140, strokeWidth: 8, fontSize: 'text-2xl' },
  lg: { diameter: 200, strokeWidth: 10, fontSize: 'text-3xl' },
} as const;

export default function ProgressRingSimple({
  percentage,
  label,
  sublabel,
  size = 'md',
}: ProgressRingSimpleProps) {
  const config = sizeConfig[size];
  const { diameter, strokeWidth, fontSize } = config;

  const radius = (diameter - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={diameter}
        height={diameter}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={diameter / 2}
          cy={diameter / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-zinc-800"
        />

        {/* Progress circle */}
        <circle
          cx={diameter / 2}
          cy={diameter / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="text-green-600 transition-all duration-500 ease-out"
        />
      </svg>

      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <div className={`${fontSize} font-bold text-green-600`}>
          {Math.round(percentage)}%
        </div>
        <div className="text-xs text-zinc-400 mt-0.5">
          {label}
        </div>
        <div className="text-xs text-zinc-500">
          {sublabel}
        </div>
      </div>
    </div>
  );
}
