import React, { useRef, useEffect } from 'react';
import { Box, Stack, IconButton, Divider, Tooltip } from '@mui/material';
import IconifyIcon from './base/IconifyIcon';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: number;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Écrivez votre texte...',
  height = 150
}) => {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const execCommand = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  const colorOptions = [
    { color: '#000000', label: 'Noir' },
    { color: '#667eea', label: 'Bleu' },
    { color: '#10b981', label: 'Vert' },
    { color: '#ef4444', label: 'Rouge' },
    { color: '#f59e0b', label: 'Orange' },
    { color: '#8b5cf6', label: 'Violet' },
  ];

  return (
    <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 2, overflow: 'hidden' }}>
      {/* Toolbar */}
      <Stack 
        direction="row" 
        spacing={0.5} 
        sx={{ 
          p: 1, 
          bgcolor: '#f8f9fa',
          borderBottom: '1px solid #e0e0e0',
          flexWrap: 'wrap',
          gap: 0.5
        }}
      >
        <Tooltip title="Gras">
          <IconButton 
            size="small" 
            onClick={() => execCommand('bold')}
            sx={{ border: '1px solid #ddd', bgcolor: 'white' }}
          >
            <IconifyIcon icon="mdi:format-bold" width={18} />
          </IconButton>
        </Tooltip>

        <Tooltip title="Italique">
          <IconButton 
            size="small" 
            onClick={() => execCommand('italic')}
            sx={{ border: '1px solid #ddd', bgcolor: 'white' }}
          >
            <IconifyIcon icon="mdi:format-italic" width={18} />
          </IconButton>
        </Tooltip>

        <Tooltip title="Souligné">
          <IconButton 
            size="small" 
            onClick={() => execCommand('underline')}
            sx={{ border: '1px solid #ddd', bgcolor: 'white' }}
          >
            <IconifyIcon icon="mdi:format-underline" width={18} />
          </IconButton>
        </Tooltip>

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

        {colorOptions.map((opt) => (
          <Tooltip key={opt.color} title={opt.label}>
            <IconButton
              size="small"
              onClick={() => execCommand('foreColor', opt.color)}
              sx={{ 
                border: '1px solid #ddd', 
                bgcolor: 'white',
                width: 28,
                height: 28,
                p: 0
              }}
            >
              <Box
                sx={{
                  width: 16,
                  height: 16,
                  bgcolor: opt.color,
                  borderRadius: '50%',
                  border: '1px solid rgba(0,0,0,0.1)'
                }}
              />
            </IconButton>
          </Tooltip>
        ))}

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

        <Tooltip title="Liste à puces">
          <IconButton 
            size="small" 
            onClick={() => execCommand('insertUnorderedList')}
            sx={{ border: '1px solid #ddd', bgcolor: 'white' }}
          >
            <IconifyIcon icon="mdi:format-list-bulleted" width={18} />
          </IconButton>
        </Tooltip>

        <Tooltip title="Liste numérotée">
          <IconButton 
            size="small" 
            onClick={() => execCommand('insertOrderedList')}
            sx={{ border: '1px solid #ddd', bgcolor: 'white' }}
          >
            <IconifyIcon icon="mdi:format-list-numbered" width={18} />
          </IconButton>
        </Tooltip>

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

        <Tooltip title="Effacer le formatage">
          <IconButton 
            size="small" 
            onClick={() => execCommand('removeFormat')}
            sx={{ border: '1px solid #ddd', bgcolor: 'white' }}
          >
            <IconifyIcon icon="mdi:format-clear" width={18} />
          </IconButton>
        </Tooltip>
      </Stack>

      {/* Editor */}
      <Box
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        sx={{
          minHeight: `${height}px`,
          p: 2,
          fontSize: '14px',
          lineHeight: 1.6,
          outline: 'none',
          bgcolor: 'white',
          '&:empty:before': {
            content: `"${placeholder}"`,
            color: '#999',
          },
          '& p': { margin: '0 0 8px 0' },
          '& ul, & ol': { margin: '8px 0', paddingLeft: '24px' },
          '& strong': { fontWeight: 700 },
          '& em': { fontStyle: 'italic' },
          '& u': { textDecoration: 'underline' },
        }}
      />
    </Box>
  );
};

export default RichTextEditor;
