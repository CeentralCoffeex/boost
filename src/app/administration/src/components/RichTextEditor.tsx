import React, { useRef, useEffect, useState } from 'react';
import { Box, Stack, IconButton, Tooltip } from '@mui/material';
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
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [formatStates, setFormatStates] = useState({
    bold: false,
    italic: false,
    underline: false,
  });

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const updateFormatStates = () => {
    try {
      setFormatStates({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
      });
    } catch (e) {
      // Ignore errors
    }
  };

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
    updateFormatStates();
  };

  const handleSelectionChange = () => {
    updateFormatStates();
  };

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, []);

  const execCommand = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  const handleColorChange = (color: string) => {
    execCommand('foreColor', color);
    setShowColorPicker(false);
  };

  return (
    <Box sx={{ border: '1px solid #222', borderRadius: 1, overflow: 'hidden', bgcolor: '#0a0a0a' }}>
      {/* Toolbar */}
      <Stack 
        direction="row" 
        spacing={0.5} 
        sx={{ 
          p: 1, 
          bgcolor: '#000',
          borderBottom: '1px solid #222',
          flexWrap: 'wrap',
          gap: 0.5
        }}
      >
        <Tooltip title="Gras">
          <IconButton 
            size="small" 
            onClick={() => execCommand('bold')}
            sx={{ 
              bgcolor: formatStates.bold ? '#2563eb' : '#0a0a0a', 
              color: 'white', 
              '&:hover': { bgcolor: formatStates.bold ? '#1d4ed8' : '#1a1a1a' } 
            }}
          >
            <IconifyIcon icon="mdi:format-bold" width={16} />
          </IconButton>
        </Tooltip>

        <Tooltip title="Italique">
          <IconButton 
            size="small" 
            onClick={() => execCommand('italic')}
            sx={{ 
              bgcolor: formatStates.italic ? '#2563eb' : '#0a0a0a', 
              color: 'white', 
              '&:hover': { bgcolor: formatStates.italic ? '#1d4ed8' : '#1a1a1a' } 
            }}
          >
            <IconifyIcon icon="mdi:format-italic" width={16} />
          </IconButton>
        </Tooltip>

        <Tooltip title="Souligné">
          <IconButton 
            size="small" 
            onClick={() => execCommand('underline')}
            sx={{ 
              bgcolor: formatStates.underline ? '#2563eb' : '#0a0a0a', 
              color: 'white', 
              '&:hover': { bgcolor: formatStates.underline ? '#1d4ed8' : '#1a1a1a' } 
            }}
          >
            <IconifyIcon icon="mdi:format-underline" width={16} />
          </IconButton>
        </Tooltip>

        <Box sx={{ position: 'relative' }}>
          <Tooltip title="Couleur du texte">
            <IconButton
              size="small"
              onClick={() => setShowColorPicker(!showColorPicker)}
              sx={{ bgcolor: '#0a0a0a', color: 'white', '&:hover': { bgcolor: '#1a1a1a' } }}
            >
              <IconifyIcon icon="mdi:palette" width={16} />
            </IconButton>
          </Tooltip>
          
          {showColorPicker && (
            <Box
              sx={{
                position: 'absolute',
                top: '100%',
                left: 0,
                mt: 0.5,
                p: 1.5,
                bgcolor: '#1a1a1a',
                border: '1px solid #333',
                borderRadius: 1,
                zIndex: 1000,
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
              }}
            >
              <input
                type="color"
                onChange={(e) => handleColorChange(e.target.value)}
                style={{
                  width: '120px',
                  height: '32px',
                  border: '1px solid #333',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  backgroundColor: '#000'
                }}
              />
            </Box>
          )}
        </Box>

        <Tooltip title="Liste à puces">
          <IconButton 
            size="small" 
            onClick={() => execCommand('insertUnorderedList')}
            sx={{ bgcolor: '#0a0a0a', color: 'white', '&:hover': { bgcolor: '#1a1a1a' } }}
          >
            <IconifyIcon icon="mdi:format-list-bulleted" width={16} />
          </IconButton>
        </Tooltip>

        <Tooltip title="Liste numérotée">
          <IconButton 
            size="small" 
            onClick={() => execCommand('insertOrderedList')}
            sx={{ bgcolor: '#0a0a0a', color: 'white', '&:hover': { bgcolor: '#1a1a1a' } }}
          >
            <IconifyIcon icon="mdi:format-list-numbered" width={16} />
          </IconButton>
        </Tooltip>

        <Tooltip title="Effacer le formatage">
          <IconButton 
            size="small" 
            onClick={() => execCommand('removeFormat')}
            sx={{ bgcolor: '#0a0a0a', color: 'white', '&:hover': { bgcolor: '#1a1a1a' } }}
          >
            <IconifyIcon icon="mdi:format-clear" width={16} />
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
          bgcolor: '#0a0a0a',
          color: 'white',
          '&:empty:before': {
            content: `"${placeholder}"`,
            color: '#444',
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
