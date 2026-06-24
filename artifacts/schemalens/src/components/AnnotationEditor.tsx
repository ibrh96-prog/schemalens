import { useState, useCallback } from 'react';
import { Check, Pencil, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

interface AnnotationEditorProps {
  note: string;
  placeholder?: string;
  onSave: (note: string) => Promise<void>;
  className?: string;
}

export function AnnotationEditor({ note, placeholder, onSave, className }: AnnotationEditorProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(note);
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await onSave(value);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }, [value, onSave]);

  const handleCancel = () => {
    setValue(note);
    setEditing(false);
  };

  if (!editing) {
    return (
      <div className={cn('group flex items-start gap-2', className)}>
        <div className="flex-1 min-h-[1.5rem]">
          {note ? (
            <p className="text-sm text-foreground whitespace-pre-wrap">{note}</p>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              {placeholder ?? 'Add a note…'}
            </p>
          )}
        </div>
        <button
          onClick={() => setEditing(true)}
          className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 p-1 rounded hover:bg-accent cursor-pointer"
          aria-label="Edit note"
        >
          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.15 }}
        className={cn('flex flex-col gap-2', className)}
      >
        <Textarea
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder ?? 'Write a note…'}
          className="min-h-[80px] text-sm"
          onKeyDown={(e) => {
            if (e.key === 'Escape') handleCancel();
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSave();
          }}
        />
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handleSave} loading={saving}>
            <Check className="h-3.5 w-3.5" />
            Save
          </Button>
          <Button size="sm" variant="ghost" onClick={handleCancel} disabled={saving}>
            <X className="h-3.5 w-3.5" />
            Cancel
          </Button>
          <span className="text-xs text-muted-foreground ml-auto">⌘↵ to save · Esc to cancel</span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
