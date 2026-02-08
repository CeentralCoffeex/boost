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
  MenuItem,
  LinearProgress,
  Card,
  CardContent,
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

  const displayPrice = variants.length > 0 
    ? `${Math.min(...variants.map(v => parseFloat(v.price) || 0))}€`
    : 'Prix à définir';

  return (
    <Box sx={{ pb: 4, bgcolor: '#fafafa', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{
        bgcolor: 'white',
        borderBottom: '1px solid #e0e0e0',
        py: 2,
        px: 3,
        mb: 3
      }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <IconButton onClick={() => navigate(-1)} size="medium">
              <IconifyIcon icon="material-symbols:arrow-back" width={24} />
            </IconButton>
            <Typography variant="h5" fontWeight={700}>
              {isEditing ? 'Modifier le produit' : 'Nouveau produit'}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={2}>
            <Button variant="outlined" onClick={() => navigate(-1)}>
              Annuler
            </Button>
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={loading}
              startIcon={loading ? <IconifyIcon icon="eos-icons:loading" /> : null}
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

      <Box sx={{ px: 3 }}>
        <Grid container spacing={3}>
          {/* COLONNE GAUCHE - Formulaire */}
          <Grid item xs={12} md={8}>
            <Stack spacing={3}>
              {/* Médias */}
              <Paper sx={{ overflow: 'hidden' }}>
                <Box sx={{ bgcolor: '#667eea', color: 'white', px: 2.5, py: 1.5 }}>
                  <Typography variant="subtitle1" fontWeight={700}>📸 MÉDIAS</Typography>
                </Box>
                <Box sx={{ p: 2.5 }}>
                  <Stack direction="row" spacing={2}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="caption" sx={{ mb: 1, display: 'block', fontWeight: 600 }}>Image</Typography>
                      <Box
                        sx={{
                          height: 120,
                          border: '2px dashed #ddd',
                          borderRadius: 1.5,
                          overflow: 'hidden',
                          position: 'relative',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          bgcolor: '#f9f9f9',
                          '&:hover': { borderColor: '#667eea', bgcolor: '#f5f5ff' }
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
                                top: 4,
                                right: 4,
                                bgcolor: 'white',
                                '&:hover': { bgcolor: 'error.main', color: 'white' },
                              }}
                            >
                              <IconifyIcon icon="material-symbols:close" width={16} />
                            </IconButton>
                          </>
                        ) : (
                          <Stack alignItems="center" spacing={0.5}>
                            <IconifyIcon icon="material-symbols:add-photo-alternate" width={28} />
                            <Typography variant="caption" fontSize="0.7rem">Ajouter</Typography>
                          </Stack>
                        )}
                      </Box>
                    </Box>

                    <Box sx={{ flex: 1 }}>
                      <Typography variant="caption" sx={{ mb: 1, display: 'block', fontWeight: 600 }}>Vidéo</Typography>
                      <Box
                        sx={{
                          height: 120,
                          border: '2px dashed #ddd',
                          borderRadius: 1.5,
                          overflow: 'hidden',
                          position: 'relative',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          bgcolor: '#f9f9f9',
                          '&:hover': { borderColor: '#667eea', bgcolor: '#f5f5ff' }
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
                                top: 4,
                                right: 4,
                                bgcolor: 'white',
                                '&:hover': { bgcolor: 'error.main', color: 'white' },
                              }}
                            >
                              <IconifyIcon icon="material-symbols:close" width={16} />
                            </IconButton>
                          </>
                        ) : (
                          <Stack alignItems="center" spacing={0.5}>
                            <IconifyIcon icon="material-symbols:video-library" width={28} />
                            <Typography variant="caption" fontSize="0.7rem">Ajouter</Typography>
                          </Stack>
                        )}
                      </Box>
                    </Box>
                  </Stack>
                  {uploading && uploadProgress > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <LinearProgress variant="determinate" value={uploadProgress} sx={{ height: 6, borderRadius: 1 }} />
                      <Typography variant="caption" color="text.secondary" textAlign="center" display="block" sx={{ mt: 0.5 }}>
                        {uploadProgress}%
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Paper>

              {/* Informations */}
              <Paper sx={{ overflow: 'hidden' }}>
                <Box sx={{ bgcolor: '#10b981', color: 'white', px: 2.5, py: 1.5 }}>
                  <Typography variant="subtitle1" fontWeight={700}>📝 INFORMATIONS</Typography>
                </Box>
                <Box sx={{ p: 2.5 }}>
                  <Stack spacing={2.5}>
                    <TextField
                      label="Titre"
                      fullWidth
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Nom du produit"
                    />

                    <Box>
                      <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, color: 'text.secondary' }}>
                        Description
                      </Typography>
                      <RichTextEditor
                        value={formData.description}
                        onChange={(value) => setFormData({ ...formData, description: value })}
                        placeholder="Description du produit avec mise en forme..."
                        height={120}
                      />
                    </Box>

                    <TextField
                      label="Tag"
                      fullWidth
                      value={formData.tag}
                      onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                      placeholder="Nouveau, Promo..."
                    />
                  </Stack>
                </Box>
              </Paper>

              {/* Catégorie */}
              <Paper sx={{ overflow: 'hidden' }}>
                <Box sx={{ bgcolor: '#f59e0b', color: 'white', px: 2.5, py: 1.5 }}>
                  <Typography variant="subtitle1" fontWeight={700}>🏷️ CATÉGORIE</Typography>
                </Box>
                <Box sx={{ p: 2.5 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        select
                        label="Catégorie"
                        fullWidth
                        value={selectedParent?.id ?? ''}
                        onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                      >
                        <MenuItem value="">Aucune</MenuItem>
                        {parentCategories.map((cat) => (
                          <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    {subcategories.length > 0 && (
                      <Grid item xs={12} sm={6}>
                        <TextField
                          select
                          label="Sous-catégorie"
                          fullWidth
                          value={selectedSubcategoryId || selectedParent?.id || ''}
                          onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
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
                </Box>
              </Paper>

              {/* Tarifs */}
              <Paper sx={{ overflow: 'hidden' }}>
                <Box sx={{ bgcolor: '#8b5cf6', color: 'white', px: 2.5, py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle1" fontWeight={700}>💰 TARIFS ({variants.length})</Typography>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={addVariant}
                    sx={{ bgcolor: 'rgba(255,255,255,0.2)', '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' } }}
                    startIcon={<IconifyIcon icon="material-symbols:add" />}
                  >
                    Ajouter
                  </Button>
                </Box>
                <Box sx={{ p: 2.5, bgcolor: 'white' }}>
                  {variants.length === 0 ? (
                    <Box sx={{ py: 3, textAlign: 'center', color: 'text.secondary' }}>
                      <Typography variant="body2">Aucun tarif défini</Typography>
                    </Box>
                  ) : (
                    <Stack spacing={2}>
                      {variants.map((variant, index) => (
                        <Box key={index} sx={{ 
                          p: 2, 
                          border: '1px solid #e5e7eb', 
                          borderRadius: 2,
                          bgcolor: '#fafafa'
                        }}>
                          <Grid container spacing={2} alignItems="center">
                            <Grid item xs={12} sm={6}>
                              <Box sx={{ position: 'relative' }}>
                                <TextField
                                  label="Quantité"
                                  size="small"
                                  fullWidth
                                  value={variant.name}
                                  onChange={(e) => updateVariant(index, 'name', e.target.value)}
                                  placeholder="5, 100"
                                  sx={{ '& .MuiInputBase-root': { paddingRight: '70px', bgcolor: 'white' } }}
                                />
                                <TextField
                                  select
                                  size="small"
                                  value={variant.unit || ''}
                                  onChange={(e) => updateVariant(index, 'unit', e.target.value || null)}
                                  SelectProps={{ native: true }}
                                  sx={{
                                    position: 'absolute',
                                    right: 0,
                                    top: 0,
                                    width: '65px',
                                    '& .MuiInputBase-root': { bgcolor: 'white' },
                                    '& .MuiOutlinedInput-notchedOutline': {
                                      borderLeft: 'none',
                                      borderTopLeftRadius: 0,
                                      borderBottomLeftRadius: 0,
                                    },
                                  }}
                                >
                                  <option value="">—</option>
                                  <option value="gramme">g</option>
                                  <option value="ml">ml</option>
                                </TextField>
                              </Box>
                            </Grid>
                            <Grid item xs={10} sm={5}>
                              <TextField
                                label="Prix €"
                                size="small"
                                fullWidth
                                value={variant.price}
                                type="number"
                                inputProps={{ inputMode: 'decimal', step: '0.01' }}
                                onChange={(e) => updateVariant(index, 'price', e.target.value)}
                                placeholder="10.00"
                                sx={{ '& .MuiInputBase-root': { bgcolor: 'white' } }}
                              />
                            </Grid>
                            <Grid item xs={2} sm={1} sx={{ textAlign: 'center' }}>
                              <IconButton
                                onClick={() => removeVariant(index)}
                                color="error"
                                size="small"
                              >
                                <IconifyIcon icon="material-symbols:delete" />
                              </IconButton>
                            </Grid>
                          </Grid>
                        </Box>
                      ))}
                    </Stack>
                  )}
                </Box>
              </Paper>
            </Stack>
          </Grid>

          {/* COLONNE DROITE - Preview */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2.5, position: 'sticky', top: 20 }}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2, color: '#667eea' }}>
                👁️ APERÇU EN DIRECT
              </Typography>
              
              <Card sx={{
                maxWidth: 220,
                mx: 'auto',
                borderRadius: 3,
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                border: '1px solid #e5e5e5',
                overflow: 'hidden'
              }}>
                {(previewImage || previewVideo) && (
                  <Box sx={{ 
                    height: 160, 
                    bgcolor: '#f8f8f8',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    {formData.tag && (
                      <Box sx={{
                        position: 'absolute',
                        top: 8,
                        left: 8,
                        bgcolor: '#0a0a0a',
                        color: 'white',
                        px: 1.5,
                        py: 0.5,
                        borderRadius: 1,
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        zIndex: 2
                      }}>
                        {formData.tag}
                      </Box>
                    )}
                    {previewVideo ? (
                      <video style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted playsInline>
                        <source src={previewVideo} type={getVideoMimeType(previewVideo)} />
                      </video>
                    ) : (
                      <img src={previewImage} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    )}
                  </Box>
                )}
                <CardContent sx={{ p: 1.5 }}>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ fontSize: '0.9rem', mb: 0.5, lineHeight: 1.3 }}>
                    {formData.title || 'Titre du produit'}
                  </Typography>
                  <Box 
                    sx={{ 
                      fontSize: '0.75rem', 
                      color: 'text.secondary', 
                      mb: 1.5,
                      '& p': { margin: 0, lineHeight: 1.4 },
                      '& strong': { fontWeight: 700 },
                      '& ul, & ol': { paddingLeft: '16px', margin: 0 }
                    }}
                    dangerouslySetInnerHTML={{ 
                      __html: formData.description || '<p style="color: #999;">Description</p>' 
                    }}
                  />
                  <Button
                    fullWidth
                    sx={{
                      bgcolor: '#0a0a0a',
                      color: 'white',
                      py: 0.8,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      borderRadius: 2,
                      textTransform: 'none',
                      '&:hover': { bgcolor: '#1a1a1a' }
                    }}
                  >
                    Voir les détails
                  </Button>
                </CardContent>
              </Card>

              <Box sx={{ mt: 2, p: 1.5, bgcolor: '#f0fdf4', borderRadius: 1, border: '1px solid #86efac' }}>
                <Typography variant="caption" sx={{ display: 'block', fontWeight: 600, color: '#16a34a', mb: 0.5 }}>
                  💡 Prix affiché
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#15803d' }}>
                  {displayPrice}
                </Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default ProductEdit;
