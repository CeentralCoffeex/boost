import { ReactElement, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Stack,
  IconButton,
  Alert,
  Grid,
} from '@mui/material';
import IconifyIcon from '../../../components/base/IconifyIcon';
import { fetchWithCSRF } from '../../../utils/csrf';

interface ServiceForm {
  title: string;
  description: string;
  category: string;
  price: string;
  image: string;
  ctaText: string;
  ctaLink: string;
}

const ServiceEdit = (): ReactElement => {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const isEditing = !!slug;

  const [formData, setFormData] = useState<ServiceForm>({
    title: '',
    description: '',
    category: '',
    price: '',
    image: '',
    ctaText: 'Commander',
    ctaLink: '/contact',
  });
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isVideo, setIsVideo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (isEditing && slug) {
      fetchService(slug);
    }
  }, [isEditing, slug]);

  const fetchService = async (serviceSlug: string) => {
    try {
      const response = await fetch('/api/services');
      const result = await response.json();
      if (result.success) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const service = result.data.find((s: { slug: string; [key: string]: any }) => s.slug === serviceSlug);
        if (service) {
          setFormData({
            title: service.title,
            description: service.description,
            category: service.category,
            price: service.price.toString(),
            image: service.image || '',
            ctaText: service.ctaText || 'Commander',
            ctaLink: service.ctaLink || '/contact',
          });
        }
      }
    } catch (error) {
      console.error('Error fetching service:', error);
      setError('Erreur lors du chargement du service');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const ext = (file.name.split('.').pop() || '').toLowerCase();
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/heic', 'image/heif', 'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-m4v', 'video/mpeg'];
    const allowedImageExt = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'heic', 'heif'];
    const allowedVideoExt = ['mp4', 'webm', 'ogg', 'mov', 'm4v', 'mpeg', 'mpg'];
    const isAllowed = allowedTypes.includes(file.type) || allowedImageExt.includes(ext) || allowedVideoExt.includes(ext);
    if (!isAllowed) {
      setError('Type de fichier non autorisé');
      return;
    }

    const isVideo = file.type.startsWith('video/') || allowedVideoExt.includes(ext);
    const maxSize = isVideo ? 500 * 1024 * 1024 : 50 * 1024 * 1024;
    if (file.size > maxSize) {
      setError(`Fichier trop volumineux. Max: ${maxSize / (1024 * 1024)}MB`);
      return;
    }

    setUploading(true);
    setError('');

    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);

      const response = await fetchWithCSRF('/api/upload', {
        method: 'POST',
        body: formDataUpload,
      });

      const result = await response.json();

      if (result.success) {
        setFormData((prev) => ({ ...prev, image: result.url }));
        setSuccess('Fichier uploadé avec succès');
      } else {
        setError(result.message || 'Erreur lors de l\'upload');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      setError('Erreur lors de l\'upload du fichier');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const url = isEditing ? `/api/services/${slug}` : '/api/services';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetchWithCSRF(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(isEditing ? 'Service modifié avec succès' : 'Service créé avec succès');
        setTimeout(() => navigate('/services'), 1500);
      } else {
        setError(result.error || 'Erreur lors de l\'enregistrement');
      }
    } catch (error) {
      console.error('Error saving service:', error);
      setError('Erreur lors de l\'enregistrement du service');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" mb={3} spacing={2}>
        <IconButton onClick={() => navigate('/services')} sx={{ color: 'text.primary' }}>
          <IconifyIcon icon="material-symbols:arrow-back" />
        </IconButton>
        <Typography variant="h4" color="common.white">
          {isEditing ? 'Modifier le service' : 'Nouveau service'}
        </Typography>
      </Stack>

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

      <Paper sx={{ p: { xs: 3, sm: 4 } }}>
        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                label="Titre"
                fullWidth
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Description"
                fullWidth
                multiline
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Catégorie"
                fullWidth
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                required
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Prix (€)"
                fullWidth
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                required
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.disabled" mb={1}>
                Image ou Vidéo
              </Typography>
              <Stack spacing={2}>
                <Button
                  component="label"
                  variant="outlined"
                  disabled={uploading}
                  startIcon={
                    uploading ? (
                      <IconifyIcon icon="eos-icons:loading" />
                    ) : (
                      <IconifyIcon icon="material-symbols:upload" />
                    )
                  }
                  sx={{
                    borderColor: 'divider',
                    color: 'text.primary',
                    '&:hover': {
                      borderColor: 'primary.main',
                    },
                  }}
                >
                  {uploading ? 'Upload en cours...' : 'Choisir un fichier'}
                  <input
                    type="file"
                    hidden
                    accept="image/*,video/*"
                    onChange={handleFileUpload}
                  />
                </Button>
                {previewUrl && (
                  <Box
                    sx={{
                      position: 'relative',
                      borderRadius: 2,
                      overflow: 'hidden',
                      border: '1px solid',
                      borderColor: 'divider',
                      maxWidth: 400,
                    }}
                  >
                    {isVideo ? (
                      <video
                        src={previewUrl}
                        style={{ width: '100%', maxHeight: '250px', objectFit: 'cover' }}
                        controls
                      />
                    ) : (
                      <img
                        src={previewUrl}
                        alt="Preview"
                        style={{ width: '100%', maxHeight: '250px', objectFit: 'cover' }}
                      />
                    )}
                    <IconButton
                      size="small"
                      onClick={() => {
                        setFormData({ ...formData, image: '' });
                        setPreviewUrl('');
                        setIsVideo(false);
                      }}
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        bgcolor: 'background.paper',
                        '&:hover': {
                          bgcolor: 'error.main',
                          color: 'common.white',
                        },
                      }}
                    >
                      <IconifyIcon icon="material-symbols:close" width={20} />
                    </IconButton>
                  </Box>
                )}
              </Stack>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Texte du bouton"
                fullWidth
                value={formData.ctaText}
                onChange={(e) => setFormData({ ...formData, ctaText: e.target.value })}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Lien du bouton"
                fullWidth
                value={formData.ctaLink}
                onChange={(e) => setFormData({ ...formData, ctaLink: e.target.value })}
                placeholder="/contact"
              />
            </Grid>

            <Grid item xs={12}>
              <Stack direction="row" spacing={2} justifyContent="flex-end">
                <Button
                  onClick={() => navigate('/services')}
                  sx={{ color: 'text.disabled' }}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading}
                  sx={{
                    bgcolor: 'primary.main',
                    color: 'common.black',
                    '&:hover': {
                      bgcolor: 'primary.dark',
                    },
                  }}
                >
                  {loading ? 'Enregistrement...' : isEditing ? 'Modifier' : 'Créer'}
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Box>
  );
};

export default ServiceEdit;
