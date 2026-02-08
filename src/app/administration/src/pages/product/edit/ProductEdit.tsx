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
  Divider,
} from '@mui/material';
import IconifyIcon from '../../../components/base/IconifyIcon';
import RichTextBlock from '../../../components/base/RichTextBlock';
import { fetchWithCSRF, uploadWithProgress } from '../../../utils/csrf';

interface ProductForm {
  title: string;
  description: string;
  basePrice: string;
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
  power?: string | null;
  capacity?: string | null;
  resistance?: string | null;
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
    basePrice: '',
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
          basePrice: product.basePrice || '',
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
      const response = await uploadWithProgress(file, 'image', (progress: number) => setUploadProgress(progress));
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
      const response = await uploadWithProgress(file, 'video', (progress: number) => setUploadProgress(progress));
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
    setVariants([...variants, { name: '', type: 'weight', unit: 'gramme', price: '', power: null, capacity: null, resistance: null }]);
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
        variants: variants.map(v => ({
          ...v,
          name: v.name.trim(),
          price: v.price ? parseFloat(v.price) : 0,
          unit: v.unit || null,
          power: v.power?.trim() || null,
          capacity: v.capacity?.trim() || null,
          resistance: v.resistance?.trim() || null,
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
    <Box sx={{ pb: 4, maxWidth: 1400, mx: 'auto' }}>
      {/* En-tête fixe */}
      <Box sx={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        bgcolor: 'background.default',
        borderBottom: '1px solid',
        borderColor: 'divider',
        py: 2.5,
        mb: 4,
        px: { xs: 2, md: 3 }
      }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <IconButton onClick={() => navigate(-1)} size="medium">
              <IconifyIcon icon="material-symbols:arrow-back" width={24} />
            </IconButton>
            <Typography variant="h4" fontWeight={700} sx={{ fontSize: { xs: '1.5rem', md: '2rem' } }}>
              {isEditing ? 'Modifier le produit' : 'Nouveau produit'}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={2}>
            <Button variant="outlined" onClick={() => navigate(-1)} size="large">
              Annuler
            </Button>
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={loading}
              startIcon={loading ? <IconifyIcon icon="eos-icons:loading" /> : null}
              size="large"
            >
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </Stack>
        </Stack>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, mx: { xs: 2, md: 3 } }} onClose={() => setError('')}>
          <Typography fontWeight={500}>{error}</Typography>
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 3, mx: { xs: 2, md: 3 } }} onClose={() => setSuccess('')}>
          <Typography fontWeight={500}>{success}</Typography>
        </Alert>
      )}

      <Box sx={{ px: { xs: 2, md: 3 } }}>
        <Grid container spacing={3}>
          {/* COLONNE GAUCHE - Informations principales */}
          <Grid item xs={12} lg={8}>
            <Stack spacing={3}>
              {/* Section: Informations de base */}
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 3, fontSize: '1.25rem' }}>
                  📝 Informations de base
                </Typography>
                <Stack spacing={3}>
                  <TextField
                    label="Titre du produit"
                    fullWidth
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    variant="outlined"
                    sx={{ '& .MuiInputBase-input': { fontSize: '1.1rem' } }}
                  />

                  <RichTextBlock
                    label="Description"
                    value={formData.description}
                    onChange={(v) => setFormData({ ...formData, description: v })}
                    minRows={5}
                    placeholder="**gras**, [c=#dc2626]couleur[/c], retours à la ligne..."
                  />

                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Prix de base (€)"
                        fullWidth
                        value={formData.basePrice}
                        onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                        placeholder="20"
                        helperText="Prix si pas de variantes"
                        sx={{ '& .MuiInputBase-input': { fontSize: '1.1rem' } }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Tag / Badge"
                        fullWidth
                        value={formData.tag}
                        onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                        placeholder="Nouveau, Promo..."
                        sx={{ '& .MuiInputBase-input': { fontSize: '1.1rem' } }}
                      />
                    </Grid>
                  </Grid>
                </Stack>
              </Paper>

              {/* Section: Catégorie */}
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 3, fontSize: '1.25rem' }}>
                  🏷️ Catégorie
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      select
                      label="Catégorie principale"
                      fullWidth
                      value={selectedParent?.id ?? ''}
                      onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                      sx={{ '& .MuiInputBase-input': { fontSize: '1rem' } }}
                    >
                      <MenuItem value="">Aucune</MenuItem>
                      {parentCategories.map((cat) => (
                        <MenuItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </MenuItem>
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
                        sx={{ '& .MuiInputBase-input': { fontSize: '1rem' } }}
                      >
                        <MenuItem value={selectedParent?.id ?? ''}>
                          {selectedParent?.name ?? '— Catégorie principale'}
                        </MenuItem>
                        {subcategories.map((sub) => (
                          <MenuItem key={sub.id} value={sub.id}>
                            {sub.name}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                  )}
                </Grid>
              </Paper>

              {/* Section: Variantes/Tarifs */}
              <Paper sx={{ p: 3 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
                  <Typography variant="h6" fontWeight={700} sx={{ fontSize: '1.25rem' }}>
                    💰 Tarifs et variantes ({variants.length})
                  </Typography>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={addVariant}
                    startIcon={<IconifyIcon icon="material-symbols:add" />}
                  >
                    Ajouter
                  </Button>
                </Stack>

                {variants.length === 0 ? (
                  <Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>
                    <Typography>Aucune variante. Le prix de base sera utilisé.</Typography>
                  </Box>
                ) : (
                  <Stack spacing={2}>
                    {variants.map((variant, index) => (
                      <Box key={index} sx={{ 
                        p: 2, 
                        border: '1px solid', 
                        borderColor: 'divider', 
                        borderRadius: 2,
                        bgcolor: 'background.default'
                      }}>
                        <Grid container spacing={2} alignItems="center">
                          <Grid item xs={12} sm={3}>
                            <TextField
                              label="Valeur"
                              size="small"
                              fullWidth
                              value={variant.name}
                              onChange={(e) => updateVariant(index, 'name', e.target.value)}
                              placeholder="5, 2.5, 2ml"
                            />
                          </Grid>
                          <Grid item xs={6} sm={2}>
                            <TextField
                              select
                              label="Unité"
                              size="small"
                              fullWidth
                              value={variant.unit || ''}
                              onChange={(e) => updateVariant(index, 'unit', e.target.value || null)}
                              SelectProps={{ native: true }}
                            >
                              <option value="">—</option>
                              <option value="gramme">g</option>
                              <option value="ml">ml</option>
                            </TextField>
                          </Grid>
                          <Grid item xs={6} sm={2}>
                            <TextField
                              label="Prix €"
                              size="small"
                              fullWidth
                              value={variant.price}
                              type="number"
                              inputProps={{ inputMode: 'decimal', step: '0.01' }}
                              onChange={(e) => updateVariant(index, 'price', e.target.value)}
                              placeholder="10.00"
                            />
                          </Grid>
                          <Grid item xs={4} sm={1.5}>
                            <TextField
                              label="Puissance"
                              size="small"
                              fullWidth
                              value={variant.power || ''}
                              onChange={(e) => updateVariant(index, 'power', e.target.value || null)}
                              placeholder="40W"
                            />
                          </Grid>
                          <Grid item xs={4} sm={1.5}>
                            <TextField
                              label="Capacité"
                              size="small"
                              fullWidth
                              value={variant.capacity || ''}
                              onChange={(e) => updateVariant(index, 'capacity', e.target.value || null)}
                              placeholder="2ml"
                            />
                          </Grid>
                          <Grid item xs={4} sm={1.5}>
                            <TextField
                              label="Résistance"
                              size="small"
                              fullWidth
                              value={variant.resistance || ''}
                              onChange={(e) => updateVariant(index, 'resistance', e.target.value || null)}
                              placeholder="0.2Ω"
                            />
                          </Grid>
                          <Grid item xs={12} sm="auto" sx={{ textAlign: 'center' }}>
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
              </Paper>
            </Stack>
          </Grid>

          {/* COLONNE DROITE - Médias */}
          <Grid item xs={12} lg={4}>
            <Paper sx={{ p: 3, position: 'sticky', top: 100 }}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 3, fontSize: '1.25rem' }}>
                📸 Médias
              </Typography>
              
              <Stack spacing={3}>
                {/* Image */}
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>Image</Typography>
                  <Box
                    sx={{
                      width: '100%',
                      height: 240,
                      border: '2px dashed',
                      borderColor: 'divider',
                      borderRadius: 2,
                      overflow: 'hidden',
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      bgcolor: 'background.default',
                      transition: 'all 0.2s',
                      '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' }
                    }}
                    onClick={() => document.getElementById('image-upload')?.click()}
                  >
                    <input
                      id="image-upload"
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={handleFileUpload}
                    />
                    {previewImage ? (
                      <>
                        <img
                          src={previewImage}
                          alt="Preview"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
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
                            bgcolor: 'rgba(255,255,255,0.95)',
                            '&:hover': { bgcolor: 'error.main', color: 'white' },
                          }}
                        >
                          <IconifyIcon icon="material-symbols:close" width={20} />
                        </IconButton>
                      </>
                    ) : (
                      <Stack alignItems="center" spacing={1.5} sx={{ color: 'text.secondary' }}>
                        <IconifyIcon icon={uploading ? "eos-icons:loading" : "material-symbols:add-photo-alternate"} width={48} />
                        <Typography variant="body2" fontWeight={500}>Cliquer pour ajouter</Typography>
                      </Stack>
                    )}
                  </Box>
                </Box>

                <Divider />

                {/* Vidéo */}
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>Vidéo</Typography>
                  <Box
                    sx={{
                      width: '100%',
                      height: 240,
                      border: '2px dashed',
                      borderColor: 'divider',
                      borderRadius: 2,
                      overflow: 'hidden',
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      bgcolor: 'background.default',
                      transition: 'all 0.2s',
                      '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' }
                    }}
                    onClick={() => document.getElementById('video-upload')?.click()}
                  >
                    <input
                      id="video-upload"
                      type="file"
                      hidden
                      accept="video/*"
                      onChange={handleVideoUpload}
                    />
                    {previewVideo ? (
                      <>
                        <video
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          muted
                          playsInline
                          controls
                          preload="auto"
                        >
                          <source src={previewVideo} type={getVideoMimeType(previewVideo)} />
                          Votre navigateur ne supporte pas la lecture de vidéos.
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
                            bgcolor: 'rgba(255,255,255,0.95)',
                            '&:hover': { bgcolor: 'error.main', color: 'white' },
                          }}
                        >
                          <IconifyIcon icon="material-symbols:close" width={20} />
                        </IconButton>
                      </>
                    ) : (
                      <Stack alignItems="center" spacing={1.5} sx={{ color: 'text.secondary' }}>
                        <IconifyIcon icon={uploading ? "eos-icons:loading" : "material-symbols:video-library"} width={48} />
                        <Typography variant="body2" fontWeight={500}>Cliquer pour ajouter</Typography>
                      </Stack>
                    )}
                  </Box>
                </Box>

                {uploading && uploadProgress > 0 && (
                  <Box>
                    <LinearProgress variant="determinate" value={uploadProgress} sx={{ height: 8, borderRadius: 1, mb: 1 }} />
                    <Typography variant="caption" color="text.secondary" textAlign="center" display="block">
                      Upload en cours... {uploadProgress}%
                    </Typography>
                  </Box>
                )}
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default ProductEdit;
