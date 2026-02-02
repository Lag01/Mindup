import Link from 'next/link';

interface InsightCardProps {
  type: 'positive' | 'warning' | 'suggestion' | 'milestone';
  icon: string;
  title: string;
  description: string;
  action?: { label: string; href: string };
}

const variantStyles = {
  positive: {
    border: 'border-green-700 hover:border-green-600',
    bg: 'bg-green-900/20',
    text: 'text-green-400',
  },
  warning: {
    border: 'border-orange-700 hover:border-orange-600',
    bg: 'bg-orange-900/20',
    text: 'text-orange-400',
  },
  suggestion: {
    border: 'border-blue-700 hover:border-blue-600',
    bg: 'bg-blue-900/20',
    text: 'text-blue-400',
  },
  milestone: {
    border: 'border-purple-700 hover:border-purple-600',
    bg: 'bg-purple-900/20',
    text: 'text-purple-400',
  },
} as const;

export default function InsightCard({
  type,
  icon,
  title,
  description,
  action,
}: InsightCardProps) {
  const styles = variantStyles[type];

  return (
    <div
      className={`rounded-lg border-l-4 p-4 ${styles.border} ${styles.bg} transition-colors`}
    >
      <div className="text-2xl mb-2">{icon}</div>

      <h3 className={`text-sm font-semibold mb-1 ${styles.text}`}>
        {title}
      </h3>

      <p className="text-xs text-zinc-400 leading-relaxed">
        {description}
      </p>

      {action && (
        <Link
          href={action.href}
          className={`inline-block text-xs mt-3 ${styles.text} hover:underline`}
        >
          {action.label} →
        </Link>
      )}
    </div>
  );
}
