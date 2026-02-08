import { useRef, useCallback, useState } from 'react';
import { Box, Button, TextField, Stack, Popover } from '@mui/material';
import IconifyIcon from './IconifyIcon';

/** Format: **bold** et [c=#hex]texte coloré[/c] */

interface RichTextBlockProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  minRows?: number;
  placeholder?: string;
}

const PRESET_COLORS = [
  '#000000', '#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#0891b2', '#2563eb', '#7c3aed', '#db2777',
];

export default function RichTextBlock({
  label,
  value,
  onChange,
  minRows = 6,
  placeholder,
}: RichTextBlockProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const colorAnchorRef = useRef<HTMLButtonElement>(null);
  const [colorOpen, setColorOpen] = useState(false);
  const savedSelectionRef = useRef<{ start: number; end: number } | null>(null);

  const getSelection = useCallback(() => {
    const el = inputRef.current;
    if (!el) return { start: 0, end: 0, text: '' };
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = value.substring(start, end);
    return { start, end, text };
  }, [value]);

  const applyFormat = useCallback(
    (before: string, after: string) => {
      const { start, end, text } = getSelection();
      if (!text) return;
      const newValue = value.substring(0, start) + before + text + after + value.substring(end);
      onChange(newValue);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.setSelectionRange(start + before.length, end + before.length);
      }, 0);
    },
    [value, onChange, getSelection]
  );

  const handleBold = (e: React.MouseEvent) => {
    e.preventDefault();
    applyFormat('**', '**');
  };

  const handleColorButtonMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const { start, end } = getSelection();
    savedSelectionRef.current = { start, end };
    setColorOpen(true);
  };

  const handleColor = (hex: string) => {
    const sel = savedSelectionRef.current ?? getSelection();
    const start = sel.start;
    const end = sel.end;
    savedSelectionRef.current = null;
    const text = value.substring(start, end);
    if (!text) return;
    const before = `[c=${hex}]`;
    const after = '[/c]';
    const newValue = value.substring(0, start) + before + text + after + value.substring(end);
    onChange(newValue);
    setColorOpen(false);
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(start + before.length, end + before.length);
    }, 0);
  };

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        overflow: 'hidden',
        bgcolor: 'background.paper',
      }}
    >
      <Stack
        direction="row"
        spacing={0.5}
        sx={{
          px: 1,
          py: 0.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'action.hover',
        }}
      >
        <Button
          size="small"
          variant="text"
          onMouseDown={handleBold}
          sx={{ minWidth: 36, fontWeight: 700 }}
          title="Gras (sélectionnez du texte)"
        >
          B
        </Button>
        <Button
          ref={colorAnchorRef}
          size="small"
          variant="text"
          onMouseDown={handleColorButtonMouseDown}
          sx={{ minWidth: 36 }}
          title="Couleur (sélectionnez du texte)"
        >
          <IconifyIcon icon="mdi:format-color-text" />
        </Button>
        <Popover
          open={colorOpen}
          anchorEl={colorAnchorRef.current}
          onClose={() => setColorOpen(false)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        >
          <Box sx={{ p: 1.5, display: 'flex', gap: 0.5, flexWrap: 'wrap', maxWidth: 200 }}>
            {PRESET_COLORS.map((hex) => (
              <Box
                key={hex}
                onClick={() => handleColor(hex)}
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: 1,
                  bgcolor: hex,
                  cursor: 'pointer',
                  border: '2px solid',
                  borderColor: 'divider',
                  '&:hover': { borderColor: 'primary.main' },
                }}
              />
            ))}
          </Box>
        </Popover>
      </Stack>
      <TextField
        inputRef={inputRef}
        fullWidth
        multiline
        minRows={minRows}
        label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        variant="outlined"
        sx={{
          '& .MuiOutlinedInput-root': {
            border: 'none',
            '& fieldset': { border: 'none' },
            bgcolor: 'background.paper',
            color: 'text.primary',
          },
          '& .MuiInputLabel-root': { color: 'text.secondary' },
        }}
      />
    </Box>
  );
}
