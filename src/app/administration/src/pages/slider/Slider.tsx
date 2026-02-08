import { ReactElement, useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Alert,
  Grid,
  Card,
  CardMedia,
  CardContent,
  IconButton,
} from '@mui/material';
import IconifyIcon from '../../components/base/IconifyIcon';
import { fetchWithCSRF } from '../../utils/csrf';

interface SliderImage {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const Slider = (): ReactElement => {
  const [images, setImages] = useState<SliderImage[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploading, setUploading] = useState<number | null>(null);

  useEffect(() => {
    loadImages();
  }, []);

  const loadImages = async () => {
    try {
      const response = await fetch('/api/slider');
      const data = await response.json();
      
      // S'assurer qu'on a toujours 3 emplacements
      const slots = [
        data.find((img: SliderImage) => img.order === 0) || null,
        data.find((img: SliderImage) => img.order === 1) || null,
        data.find((img: SliderImage) => img.order === 2) || null,
      ];
      
      setImages(slots);
    } catch (error) {
      console.error('Error loading images:', error);
      setError('Erreur lors du chargement des images');
    }
  };

  const handleImageUpload = async (index: number, file: File) => {
    if (!file) return;

    setUploading(index);
    setError('');
    setSuccess('');

    try {
      // Upload de l'image
          let uploadResponse;
          // Utiliser le mode stream pour tout ce qui n'est pas une petite image
          const isSmallImage = file.type.startsWith('image/') && file.size < 1024 * 1024;
          const useRawMode = !isSmallImage;

          if (useRawMode) {
             // Mode RAW pour les gros fichiers et vidéos
             const uploadUrl = `/api/upload?filename=${encodeURIComponent(file.name)}`;

             uploadResponse = await fetchWithCSRF(uploadUrl, {
               method: 'POST',
               headers: {
                 'Content-Type': 'application/octet-stream',
                 'x-file-name': encodeURIComponent(file.name),
               },
               body: file,
             });
           } else {
        // Mode FormData standard
        const formData = new FormData();
        formData.append('file', file);
        uploadResponse = await fetchWithCSRF('/api/upload', {
          method: 'POST',
          body: formData,
        });
      }

      if (!uploadResponse.ok) {
        const errData = await uploadResponse.json().catch(() => ({}));
        const msg = errData?.message || errData?.error || 'Erreur lors de l\'upload de l\'image';
        throw new Error(msg);
      }

      const { url } = await uploadResponse.json();

      // Créer ou mettre à jour l'entrée du slider
      const currentImage = images[index];
      
      const imageData = {
        title: currentImage?.title || '',
        subtitle: currentImage?.subtitle || '',
        image: url,
        order: index,
        isActive: true,
      };

      let response;
      if (currentImage?.id) {
        // Mise à jour
        response = await fetchWithCSRF(`/api/slider/${currentImage.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(imageData),
        });
      } else {
        // Création
        response = await fetchWithCSRF('/api/slider', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(imageData),
        });
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const msg = errData?.error || errData?.message || errData?.details || 'Erreur lors de la sauvegarde';
        throw new Error(typeof msg === 'string' ? msg : 'Erreur lors de la sauvegarde');
      }

      setSuccess('Image mise à jour avec succès !');
      loadImages();
    } catch (error) {
      console.error('Error uploading image:', error);
      setError(error instanceof Error ? error.message : 'Erreur lors de l\'upload de l\'image');
    } finally {
      setUploading(null);
    }
  };

  const handleFileInputChange = (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleImageUpload(index, file);
    }
  };

  const PLACEHOLDER_SVG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='200' viewBox='0 0 400 200'%3E%3Crect fill='%23e5e7eb' width='400' height='200'/%3E%3Ctext fill='%239ca3af' x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-size='18'%3ECliquez pour ajouter%3C/text%3E%3C/svg%3E";

  const getImageUrl = (image: SliderImage | null): string => {
    if (!image?.image) {
      return PLACEHOLDER_SVG;
    }
    return image.image;
  };

  const getCardStyle = (image: SliderImage | null) => {
    if (!image?.image) {
      return {
        border: '2px dashed #ccc',
        backgroundColor: '#f5f5f5',
      };
    }
    return {};
  };

  return (
    <Box>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Gestion du Slider
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Cliquez sur une image pour la remplacer. Le slider affiche 3 images en rotation.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        <Grid container spacing={3}>
          {[0, 1, 2].map((index) => (
            <Grid item xs={12} key={index}>
              <Card 
                sx={{ 
                  cursor: 'pointer',
                  transition: 'transform 0.2s',
                  display: 'flex',
                  flexDirection: 'row',
                  '&:hover': {
                    transform: 'scale(1.02)',
                  },
                  ...getCardStyle(images[index] || null),
                }}
              >
                <input
                  type="file"
                  accept="image/*"
                  id={`file-input-${index}`}
                  style={{ display: 'none' }}
                  onChange={(e) => handleFileInputChange(index, e)}
                />
                <label htmlFor={`file-input-${index}`} style={{ cursor: 'pointer', display: 'flex', width: '100%' }}>
                  <CardMedia
                    component="img"
                    sx={{ 
                      width: 200,
                      height: 120,
                      objectFit: 'cover',
                      opacity: uploading === index ? 0.5 : 1,
                    }}
                    image={getImageUrl(images[index] || null)}
                    alt={`Slider ${index + 1}`}
                  />
                  <CardContent sx={{ flex: 1 }}>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Typography variant="h6">
                        Image {index + 1}
                      </Typography>
                      <IconButton size="small" color="primary">
                        <IconifyIcon icon={uploading === index ? 'eos-icons:loading' : 'material-symbols:upload'} />
                      </IconButton>
                    </Box>
                    {!images[index]?.image && (
                      <Typography variant="caption" color="text.secondary">
                        Cliquez pour ajouter une image
                      </Typography>
                    )}
                  </CardContent>
                </label>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Paper>
    </Box>
  );
};

export default Slider;
