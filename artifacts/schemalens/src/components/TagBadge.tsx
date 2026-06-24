import { X } from 'lucide-react';
import { TAG_COLORS } from '../lib/types';
import { cn } from '../lib/utils';

interface TagBadgeProps {
  tag: string;
  color: string;
  onRemove?: () => void;
}

export function TagBadge({ tag, color, onRemove }: TagBadgeProps) {
  const styles = TAG_COLORS[color] ?? TAG_COLORS['gray']!;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        styles.bg, styles.text, styles.border
      )}
    >
      {tag}
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 p-0.5 cursor-pointer"
          aria-label={`Remove tag ${tag}`}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}
