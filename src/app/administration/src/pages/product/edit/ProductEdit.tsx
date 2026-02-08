import { ReactElement, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  TextField,
  Stack,
  IconButton,
  Alert,
  Grid,
  MenuItem,
  LinearProgress,
} from '@mui/material';
import IconifyIcon from '../../../components/base/IconifyIcon';
import { fetchWithCSRF, uploadWithProgress } from '../../../utils/csrf';
import RichTextEditor from '../../../components/RichTextEditor';

interface ProductForm {
  title: string;
  description: string;
  tag: string;
  image: string;
  videoUrl: string;
  categoryId: string;
}

interface Category {
  id: string;
  name: string;
  parentId?: string | null;
  subcategories?: Category[];
}

interface ProductVariant {
  id?: string;
  name: string;
  type: 'weight' | 'flavor';
  unit?: 'gramme' | 'ml' | null;
  price: string;
}

function getVideoMimeType(url: string): string {
  const u = url.split('?')[0].toLowerCase();
  if (u.endsWith('.mov') || u.endsWith('.qt')) return 'video/quicktime';
  if (u.endsWith('.webm')) return 'video/webm';
  if (u.endsWith('.ogg')) return 'video/ogg';
  return 'video/mp4';
}

const ProductEdit = (): ReactElement => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;

  const [formData, setFormData] = useState<ProductForm>({
    title: '',
    description: '',
    tag: '',
    image: '',
    videoUrl: '',
    categoryId: '',
  });

  const [previewImage, setPreviewImage] = useState<string>('');
  const [previewVideo, setPreviewVideo] = useState<string>('');
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchCategories();
    if (isEditing) fetchProduct();
  }, [id]);

  useEffect(() => {
    if (!previewImage && formData.image) setPreviewImage(formData.image);
    if (!previewVideo && formData.videoUrl) setPreviewVideo(formData.videoUrl);
  }, [formData.image, formData.videoUrl]);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories?all=1', { credentials: 'include' });
      const data = await response.json();
      if (Array.isArray(data)) setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const parentCategories = categories.filter((c: Category) => !c.parentId);
  const selectedParent = parentCategories.find((c: Category) => c.id === formData.categoryId)
    ?? parentCategories.find((c: Category) => c.subcategories?.some((s: Category) => s.id === formData.categoryId));
  const subcategories = selectedParent?.subcategories ?? [];
  const selectedSubcategoryId = selectedParent && subcategories.length > 0 && formData.categoryId
    && subcategories.some((s: Category) => s.id === formData.categoryId)
    ? formData.categoryId
    : '';

  const fetchProduct = async () => {
    try {
      const response = await fetch(`/api/products/${id}`, { credentials: 'include' });
      const product = await response.json();
      
      if (product) {
        setFormData({
          title: product.title || '',
          description: product.description || '',
          tag: product.tag || '',
          image: product.image || '',
          videoUrl: product.videoUrl || '',
          categoryId: product.categoryId || '',
        });
        setVariants(product.variants || []);
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      setError('Erreur lors du chargement du produit');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    setPreviewImage(objectUrl);
    setUploading(true);
    setUploadProgress(0);

    try {
      const response = await uploadWithProgress('/api/upload?type=image', file, { 
        onProgress: setUploadProgress 
      });
      const result = await response.json();
      if (result.success && result.url) {
        setFormData({ ...formData, image: result.url });
        setPreviewImage(result.url);
      } else {
        setError(result.message || 'Erreur lors de l\'upload');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      setError('Erreur lors de l\'upload du fichier');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    setPreviewVideo(objectUrl);
    setUploading(true);
    setUploadProgress(0);

    try {
      const response = await uploadWithProgress('/api/upload?type=video', file, { 
        onProgress: setUploadProgress 
      });
      const result = await response.json();
      if (result.success && result.url) {
        setFormData({ ...formData, videoUrl: result.url });
        setPreviewVideo(result.url);
      } else {
        setError(result.message || 'Erreur lors de l\'upload');
      }
    } catch (error) {
      console.error('Error uploading video:', error);
      setError('Erreur lors de l\'upload de la vidéo');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const addVariant = () => {
    setVariants([...variants, { name: '', type: 'weight', unit: 'gramme', price: '' }]);
  };

  const updateVariant = (index: number, field: keyof ProductVariant, value: unknown) => {
    const updated = [...variants];
    (updated[index] as any)[field] = value;
    setVariants(updated);
  };

  const removeVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      setError('Le titre est obligatoire');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        ...formData,
        basePrice: variants.length > 0 ? '' : (variants[0]?.price || '0'),
        variants: variants.map(v => ({
          ...v,
          name: v.name.trim(),
          price: v.price ? parseFloat(v.price) : 0,
          unit: v.unit || null,
        })),
      };

      const method = isEditing ? 'PUT' : 'POST';
      const url = isEditing ? `/api/products/${id}` : '/api/products';

      const result = await fetchWithCSRF(url, { method, body: JSON.stringify(payload) });
      if (result.ok) {
        setSuccess('Produit enregistré avec succès');
        setTimeout(() => navigate(-1), 1500);
      } else {
        const data = await result.json();
        setError(data.error || 'Erreur lors de la sauvegarde');
      }
    } catch (error) {
      console.error('Error saving product:', error);
      setError('Erreur lors de la sauvegarde du produit');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ pb: 4, bgcolor: '#0a0a0a', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{
        bgcolor: '#000',
        borderBottom: '1px solid #222',
        py: 2,
        px: 3,
        mb: 3
      }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <IconButton onClick={() => navigate(-1)} size="medium" sx={{ color: 'white' }}>
              <IconifyIcon icon="material-symbols:arrow-back" width={24} />
            </IconButton>
            <Typography variant="h5" fontWeight={700} color="white">
              {isEditing ? 'Modifier le produit' : 'Nouveau produit'}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={2}>
            <Button 
              variant="outlined" 
              onClick={() => navigate(-1)}
              sx={{ color: 'white', borderColor: '#333', '&:hover': { borderColor: '#555' } }}
            >
              Annuler
            </Button>
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={loading}
              startIcon={loading ? <IconifyIcon icon="eos-icons:loading" /> : null}
              sx={{ bgcolor: 'white', color: 'black', '&:hover': { bgcolor: '#ddd' } }}
            >
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </Stack>
        </Stack>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2, mx: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2, mx: 3 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Box sx={{ px: 3, maxWidth: '1400px', mx: 'auto' }}>
        <Grid container spacing={4}>
          {/* MÉDIAS */}
          <Grid item xs={12}>
            <Typography variant="h6" fontWeight={700} color="white" sx={{ mb: 2 }}>
              📸 MÉDIAS
            </Typography>
            <Stack direction="row" spacing={3}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" sx={{ mb: 1, color: '#999', fontWeight: 600 }}>Image</Typography>
                <Box
                  sx={{
                    height: 180,
                    border: '2px dashed #333',
                    borderRadius: 2,
                    overflow: 'hidden',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    bgcolor: '#111',
                    '&:hover': { borderColor: '#555', bgcolor: '#1a1a1a' }
                  }}
                  onClick={() => document.getElementById('image-upload')?.click()}
                >
                  <input id="image-upload" type="file" hidden accept="image/*" onChange={handleFileUpload} />
                  {previewImage ? (
                    <>
                      <img src={previewImage} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFormData({ ...formData, image: '' });
                          setPreviewImage('');
                        }}
                        sx={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          bgcolor: 'rgba(0,0,0,0.7)',
                          color: 'white',
                          '&:hover': { bgcolor: 'rgba(255,0,0,0.8)' },
                        }}
                      >
                        <IconifyIcon icon="material-symbols:close" width={18} />
                      </IconButton>
                    </>
                  ) : (
                    <Stack alignItems="center" spacing={1}>
                      <IconifyIcon icon="material-symbols:add-photo-alternate" width={40} color="#666" />
                      <Typography variant="caption" color="#666">Ajouter une image</Typography>
                    </Stack>
                  )}
                </Box>
              </Box>

              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" sx={{ mb: 1, color: '#999', fontWeight: 600 }}>Vidéo</Typography>
                <Box
                  sx={{
                    height: 180,
                    border: '2px dashed #333',
                    borderRadius: 2,
                    overflow: 'hidden',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    bgcolor: '#111',
                    '&:hover': { borderColor: '#555', bgcolor: '#1a1a1a' }
                  }}
                  onClick={() => document.getElementById('video-upload')?.click()}
                >
                  <input id="video-upload" type="file" hidden accept="video/*" onChange={handleVideoUpload} />
                  {previewVideo ? (
                    <>
                      <video style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted playsInline controls preload="auto">
                        <source src={previewVideo} type={getVideoMimeType(previewVideo)} />
                      </video>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFormData({ ...formData, videoUrl: '' });
                          setPreviewVideo('');
                        }}
                        sx={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          bgcolor: 'rgba(0,0,0,0.7)',
                          color: 'white',
                          '&:hover': { bgcolor: 'rgba(255,0,0,0.8)' },
                        }}
                      >
                        <IconifyIcon icon="material-symbols:close" width={18} />
                      </IconButton>
                    </>
                  ) : (
                    <Stack alignItems="center" spacing={1}>
                      <IconifyIcon icon="material-symbols:video-library" width={40} color="#666" />
                      <Typography variant="caption" color="#666">Ajouter une vidéo</Typography>
                    </Stack>
                  )}
                </Box>
              </Box>
            </Stack>
            {uploading && uploadProgress > 0 && (
              <Box sx={{ mt: 2 }}>
                <LinearProgress variant="determinate" value={uploadProgress} sx={{ height: 8, borderRadius: 1, bgcolor: '#222', '& .MuiLinearProgress-bar': { bgcolor: 'white' } }} />
                <Typography variant="caption" color="#999" textAlign="center" display="block" sx={{ mt: 0.5 }}>
                  {uploadProgress}%
                </Typography>
              </Box>
            )}
          </Grid>

          {/* INFORMATIONS */}
          <Grid item xs={12} md={6}>
            <Typography variant="h6" fontWeight={700} color="white" sx={{ mb: 2 }}>
              📝 INFORMATIONS
            </Typography>
            <Stack spacing={3}>
              <TextField
                label="Titre"
                fullWidth
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Nom du produit"
                sx={{
                  '& .MuiInputBase-root': { bgcolor: '#111', color: 'white' },
                  '& .MuiInputLabel-root': { color: '#999' },
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#333' },
                  '& .MuiInputBase-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#555' },
                }}
              />

              <Box>
                <Typography variant="body2" sx={{ mb: 1, color: '#999', fontWeight: 600 }}>
                  Description
                </Typography>
                <RichTextEditor
                  value={formData.description}
                  onChange={(value) => setFormData({ ...formData, description: value })}
                  placeholder="Description du produit..."
                  height={120}
                />
              </Box>

              <TextField
                label="Tag"
                fullWidth
                value={formData.tag}
                onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                placeholder="Nouveau, Promo..."
                sx={{
                  '& .MuiInputBase-root': { bgcolor: '#111', color: 'white' },
                  '& .MuiInputLabel-root': { color: '#999' },
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#333' },
                  '& .MuiInputBase-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#555' },
                }}
              />
            </Stack>
          </Grid>

          {/* CATÉGORIE */}
          <Grid item xs={12} md={6}>
            <Typography variant="h6" fontWeight={700} color="white" sx={{ mb: 2 }}>
              🏷️ CATÉGORIE
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  select
                  label="Catégorie"
                  fullWidth
                  value={selectedParent?.id ?? ''}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  sx={{
                    '& .MuiInputBase-root': { bgcolor: '#111', color: 'white' },
                    '& .MuiInputLabel-root': { color: '#999' },
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#333' },
                    '& .MuiInputBase-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#555' },
                  }}
                >
                  <MenuItem value="">Aucune</MenuItem>
                  {parentCategories.map((cat) => (
                    <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              {subcategories.length > 0 && (
                <Grid item xs={12}>
                  <TextField
                    select
                    label="Sous-catégorie"
                    fullWidth
                    value={selectedSubcategoryId || selectedParent?.id || ''}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    sx={{
                      '& .MuiInputBase-root': { bgcolor: '#111', color: 'white' },
                      '& .MuiInputLabel-root': { color: '#999' },
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: '#333' },
                      '& .MuiInputBase-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#555' },
                    }}
                  >
                    <MenuItem value={selectedParent?.id ?? ''}>
                      {selectedParent?.name ?? '— Principale'}
                    </MenuItem>
                    {subcategories.map((sub) => (
                      <MenuItem key={sub.id} value={sub.id}>{sub.name}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
              )}
            </Grid>
          </Grid>

          {/* TARIFS */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" fontWeight={700} color="white">
                💰 TARIFS ({variants.length})
              </Typography>
              <Button
                variant="contained"
                size="small"
                onClick={addVariant}
                sx={{ bgcolor: 'white', color: 'black', '&:hover': { bgcolor: '#ddd' } }}
                startIcon={<IconifyIcon icon="material-symbols:add" />}
              >
                Ajouter
              </Button>
            </Box>
            {variants.length === 0 ? (
              <Box sx={{ py: 4, textAlign: 'center', color: '#666' }}>
                <Typography variant="body2">Aucun tarif défini</Typography>
              </Box>
            ) : (
              <Stack spacing={2}>
                {variants.map((variant, index) => (
                  <Box key={index} sx={{ 
                    p: 2, 
                    bgcolor: '#111',
                    borderRadius: 2,
                    border: '1px solid #222'
                  }}>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} sm={5}>
                        <TextField
                          label="Quantité"
                          size="small"
                          fullWidth
                          value={variant.name}
                          onChange={(e) => updateVariant(index, 'name', e.target.value)}
                          placeholder="5, 100..."
                          sx={{
                            '& .MuiInputBase-root': { bgcolor: '#000', color: 'white' },
                            '& .MuiInputLabel-root': { color: '#999' },
                            '& .MuiOutlinedInput-notchedOutline': { borderColor: '#333' },
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={3}>
                        <TextField
                          select
                          label="Unité"
                          size="small"
                          fullWidth
                          value={variant.unit || ''}
                          onChange={(e) => updateVariant(index, 'unit', e.target.value || null)}
                          sx={{
                            '& .MuiInputBase-root': { bgcolor: '#000', color: 'white' },
                            '& .MuiInputLabel-root': { color: '#999' },
                            '& .MuiOutlinedInput-notchedOutline': { borderColor: '#333' },
                          }}
                        >
                          <MenuItem value="">—</MenuItem>
                          <MenuItem value="gramme">g</MenuItem>
                          <MenuItem value="ml">ml</MenuItem>
                        </TextField>
                      </Grid>
                      <Grid item xs={10} sm={3}>
                        <TextField
                          label="Prix €"
                          size="small"
                          fullWidth
                          value={variant.price}
                          type="number"
                          inputProps={{ inputMode: 'decimal', step: '0.01' }}
                          onChange={(e) => updateVariant(index, 'price', e.target.value)}
                          placeholder="10.00"
                          sx={{
                            '& .MuiInputBase-root': { bgcolor: '#000', color: 'white' },
                            '& .MuiInputLabel-root': { color: '#999' },
                            '& .MuiOutlinedInput-notchedOutline': { borderColor: '#333' },
                          }}
                        />
                      </Grid>
                      <Grid item xs={2} sm={1} sx={{ textAlign: 'center' }}>
                        <IconButton
                          onClick={() => removeVariant(index)}
                          size="small"
                          sx={{ color: '#999', '&:hover': { color: '#ff4444' } }}
                        >
                          <IconifyIcon icon="material-symbols:delete" />
                        </IconButton>
                      </Grid>
                    </Grid>
                  </Box>
                ))}
              </Stack>
            )}
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default ProductEdit;
