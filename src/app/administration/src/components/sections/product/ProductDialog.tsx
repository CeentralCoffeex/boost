import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  Button,
  TextField,
  MenuItem,
  Stack,
  Box,
  Typography,
  InputAdornment,
  IconButton
} from '@mui/material';
import { ArrowBack, AddPhotoAlternate } from '@mui/icons-material';
import RichTextBlock from '../../base/RichTextBlock';
import { fetchWithCSRF } from '../../../utils/csrf';

const SECTIONS = [
  { value: 'PHARE', label: 'Produit Phare' },
  { value: 'DECOUVRIR', label: 'Découvrir' },
  { value: 'CATEGORIE', label: 'Catégorie' },
];

interface ProductDialogProps {
  open: boolean;
  onClose: () => void;
  product?: { id: string; [key: string]: unknown } | null;
  onSave: () => void;
}

export default function ProductDialog({ open, onClose, product, onSave }: ProductDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    tag: '',
    section: 'DECOUVRIR',
    image: '',
    videoUrl: '',
  });
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string>('');
  const [previewVideo, setPreviewVideo] = useState<string>('');

  useEffect(() => {
    if (product) {
      setFormData({
        title: (product.title as string) || '',
        description: (product.description as string) || '',
        price: (product.price as string) || '',
        tag: (product.tag as string) || '',
        section: (product.section as string) || 'DECOUVRIR',
        image: (product.image as string) || '',
        videoUrl: (product.videoUrl as string) || '',
      });
    } else {
      setFormData({
        title: '',
        description: '',
        price: '',
        tag: '',
        section: 'DECOUVRIR',
        image: '',
        videoUrl: '',
      });
    }
  }, [product, open]);

  const handleChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [field]: event.target.value });
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    setPreviewImage(objectUrl);

    setUploading(true);
    const data = new FormData();
    data.append('file', file);

    try {
      const response = await fetchWithCSRF('/api/upload', {
        method: 'POST',
        body: data,
        credentials: 'include',
      });
      const result = await response.json();
      if (result.url) {
        setFormData(prev => ({ ...prev, image: result.url }));
      } else if (!response.ok) {
        console.error('Upload failed:', result.message || response.statusText);
        alert(result.message || 'Erreur lors de l\'upload de l\'image.');
      }
    } catch (error) {
      console.error('Upload failed', error);
      alert('Erreur lors de l\'upload de l\'image.');
    } finally {
      setUploading(false);
    }
  };

  const handleVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    setPreviewVideo(objectUrl);

    setUploading(true);
    const data = new FormData();
    data.append('file', file);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5 * 60 * 1000); // 5 min pour les vidéos
      const response = await fetchWithCSRF('/api/upload', {
        method: 'POST',
        body: data,
        credentials: 'include',
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const result = await response.json();
      if (result.url) {
        setFormData(prev => ({ ...prev, videoUrl: result.url }));
      } else if (!response.ok) {
        console.error('Upload failed:', result.message || response.statusText);
        alert(result.message || 'Erreur lors de l\'upload de la vidéo.');
      }
    } catch (error) {
      console.error('Upload failed', error);
      alert('Erreur lors de l\'upload de la vidéo.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const url = product ? `/api/products/${product.id}` : '/api/products';
      const method = product ? 'PUT' : 'POST';

      const response = await fetchWithCSRF(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
        credentials: 'include',
      });

      if (response.ok) {
        onSave();
        onClose();
      } else {
        const err = await response.json().catch(() => ({}));
        alert(err?.message || err?.error || 'Erreur lors de la mise à jour');
      }
    } catch (error) {
      console.error('Save failed', error);
      alert('Erreur lors de la mise à jour du produit');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="xs" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4,
          overflow: 'hidden',
          bgcolor: 'background.paper',
          height: 'auto',
          maxHeight: '90vh'
        }
      }}
    >
      {/* Header with Back Arrow */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <IconButton onClick={onClose} edge="start" sx={{ color: 'text.primary' }}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h6" fontWeight="bold">
          {product ? 'Edit Product' : 'Add Product'}
        </Typography>
      </Box>

      <DialogContent sx={{ p: 3, pt: 0 }}>
        <Stack spacing={3}>
          {/* Large Image Upload Area */}
          <Box
            component="label"
            sx={{ 
              width: '100%', 
              aspectRatio: '1/1',
              borderRadius: 4, 
              bgcolor: 'action.hover',
              border: '2px dashed',
              borderColor: formData.image ? 'transparent' : 'divider',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              position: 'relative',
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': { bgcolor: 'action.selected' }
            }}
          >
            <input type="file" hidden accept="image/*,.heic,.heif" onChange={handleImageUpload} />
            {previewImage || formData.image ? (
              <Box
                component="img"
                src={previewImage || formData.image}
                sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <>
                <AddPhotoAlternate sx={{ fontSize: 64, color: 'text.secondary', mb: 1 }} />
                <Typography variant="body2" color="text.secondary" align="center">
                  Click to button for <Box component="span" sx={{ color: 'error.main' }}>uploading</Box> product photos
                </Typography>
              </>
            )}
            {uploading && (
              <Box sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography>Uploading...</Typography>
              </Box>
            )}
          </Box>

          {/* Form Fields */}
          <Stack spacing={2.5}>
            <TextField
              label="Name"
              placeholder="Give your product a name"
              fullWidth
              variant="outlined"
              value={formData.title}
              onChange={handleChange('title')}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />

            <RichTextBlock
              label="Description"
              value={formData.description}
              onChange={(v) => setFormData({ ...formData, description: v })}
              minRows={3}
              placeholder="**gras**, [c=#hex]couleur[/c], retours à la ligne..."
            />

            <Stack direction="row" spacing={2}>
              <TextField
                label="Price"
                placeholder="$"
                fullWidth
                value={formData.price}
                onChange={handleChange('price')}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
              <TextField
                label="Sale Price" // Using 'tag' as Sale Price/Label
                placeholder="$"
                fullWidth
                value={formData.tag}
                onChange={handleChange('tag')}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Stack>

            <Stack direction="row" spacing={2}>
              <TextField
                select
                label="Category"
                fullWidth
                value={formData.section}
                onChange={handleChange('section')}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              >
                {SECTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
              
              <TextField
                  fullWidth
                  value={previewVideo || formData.videoUrl ? 'Vidéo ajoutée' : ''}
                  label="Quantity" // Using Video slot for Quantity visual placeholder or actual video
                  placeholder="0"
                  InputProps={{
                      readOnly: true,
                      endAdornment: (
                          <InputAdornment position="end">
                              <Button component="label" size="small" sx={{ minWidth: 0, p: 0.5 }}>
                                  {uploading ? '...' : '+'}
                                  <input type="file" hidden accept="video/*,.mov,.quicktime" onChange={handleVideoUpload} />
                              </Button>
                          </InputAdornment>
                      )
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Stack>
          </Stack>

          <Button 
            fullWidth 
            variant="contained" 
            size="large"
            onClick={handleSubmit}
            disabled={loading}
            sx={{ 
              borderRadius: 3, 
              py: 1.5,
              mt: 2,
              bgcolor: 'text.primary',
              color: 'background.paper',
              '&:hover': { bgcolor: 'text.secondary' }
            }}
          >
            {loading ? 'Saving...' : (product ? 'Update Product' : 'Add Product')}
          </Button>

        </Stack>
      </DialogContent>
    </Dialog>
  );
}
