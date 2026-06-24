import { useState } from 'react';
import { Plus } from 'lucide-react';
import { TagBadge } from './TagBadge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { TAG_COLORS } from '../lib/types';

interface TagEditorProps {
  tags: Array<{ tag: string; color: string }>;
  onSave: (tags: Array<{ tag: string; color: string }>) => Promise<void>;
}

const COLOR_OPTIONS = Object.keys(TAG_COLORS) as string[];

export function TagEditor({ tags, onSave }: TagEditorProps) {
  const [localTags, setLocalTags] = useState(tags);
  const [newTag, setNewTag] = useState('');
  const [newColor, setNewColor] = useState('blue');
  const [saving, setSaving] = useState(false);

  const addTag = async () => {
    const trimmed = newTag.trim();
    if (!trimmed) return;
    const updated = [...localTags, { tag: trimmed, color: newColor }];
    setLocalTags(updated);
    setNewTag('');
    setSaving(true);
    try {
      await onSave(updated);
    } finally {
      setSaving(false);
    }
  };

  const removeTag = async (index: number) => {
    const updated = localTags.filter((_, i) => i !== index);
    setLocalTags(updated);
    setSaving(true);
    try {
      await onSave(updated);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        {localTags.map((t, i) => (
          <TagBadge
            key={`${t.tag}-${i}`}
            tag={t.tag}
            color={t.color}
            onRemove={() => removeTag(i)}
          />
        ))}
        {localTags.length === 0 && (
          <span className="text-xs text-muted-foreground italic">No tags yet</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Input
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          placeholder="Add tag…"
          className="h-7 text-xs w-32"
          onKeyDown={(e) => e.key === 'Enter' && addTag()}
        />
        <select
          value={newColor}
          onChange={(e) => setNewColor(e.target.value)}
          className="h-7 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
        >
          {COLOR_OPTIONS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <Button size="sm" variant="outline" onClick={addTag} loading={saving} disabled={!newTag.trim()}>
          <Plus className="h-3.5 w-3.5" />
          Add
        </Button>
      </div>
    </div>
  );
}
