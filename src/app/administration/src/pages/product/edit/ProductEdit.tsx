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
  Accordion,
  AccordionSummary,
  AccordionDetails,
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

  return (
    <Box sx={{ pb: 4, bgcolor: '#000', minHeight: '100vh', width: '100%', overflowX: 'hidden' }}>
      {/* Header */}
      <Box sx={{ bgcolor: '#000', borderBottom: '1px solid #222', py: 2, px: 2, mb: 3, width: '100%', boxSizing: 'border-box' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <IconButton onClick={() => navigate(-1)} size="medium" sx={{ color: 'white' }}>
              <IconifyIcon icon="material-symbols:arrow-back" width={22} />
            </IconButton>
            <Typography variant="h6" fontWeight={700} color="white" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
              {isEditing ? 'Modifier' : 'Nouveau'}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={() => navigate(-1)} size="small" sx={{ color: 'white', borderColor: '#333', fontSize: '0.75rem' }}>
              Annuler
            </Button>
            <Button variant="contained" onClick={handleSubmit} disabled={loading} size="small" sx={{ bgcolor: 'white', color: 'black', fontSize: '0.75rem' }}>
              {loading ? 'Saving...' : 'Enregistrer'}
            </Button>
          </Stack>
        </Stack>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2, mx: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2, mx: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Box sx={{ px: 2, width: '100%', boxSizing: 'border-box', overflowX: 'hidden' }}>
        {/* ACCORDION FORMULAIRE */}
        <Accordion 
          defaultExpanded 
          sx={{ 
            bgcolor: '#0a0a0a', 
            border: '1px solid #222',
            mb: 2,
            '&:before': { display: 'none' }
          }}
        >
          <AccordionSummary
            expandIcon={<IconifyIcon icon="mdi:chevron-down" width={24} color="white" />}
            sx={{ 
              bgcolor: '#000',
              borderBottom: '1px solid #222',
              '&:hover': { bgcolor: '#111' }
            }}
          >
            <Typography variant="h6" fontWeight={700} color="white">
              📝 FORMULAIRE PRODUIT
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 1.5 }}>
            <Grid container spacing={1.5}>
          {/* MÉDIAS */}
          <Grid item xs={12} md={6}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Box sx={{ flex: 1 }}>
                <Box
                  sx={{
                    height: 100,
                    border: '1px solid #222',
                    borderRadius: 1,
                    overflow: 'hidden',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    bgcolor: '#0a0a0a',
                    '&:hover': { borderColor: '#444' }
                  }}
                  onClick={() => document.getElementById('image-upload')?.click()}
                >
                  <input id="image-upload" type="file" hidden accept="image/*" onChange={handleFileUpload} />
                  {previewImage ? (
                    <>
                      <img src={previewImage} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); setFormData({ ...formData, image: '' }); setPreviewImage(''); }} sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'rgba(0,0,0,0.7)', color: 'white' }}>
                        <IconifyIcon icon="material-symbols:close" width={16} />
                      </IconButton>
                    </>
                  ) : (
                    <Stack alignItems="center" spacing={0.5}>
                      <IconifyIcon icon="material-symbols:add-photo-alternate" width={24} color="#444" />
                      <Typography variant="caption" color="#444" fontSize="9px">Image</Typography>
                    </Stack>
                  )}
                </Box>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Box
                  sx={{
                    height: 100,
                    border: '1px solid #222',
                    borderRadius: 1,
                    overflow: 'hidden',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    bgcolor: '#0a0a0a',
                    '&:hover': { borderColor: '#444' }
                  }}
                  onClick={() => document.getElementById('video-upload')?.click()}
                >
                  <input id="video-upload" type="file" hidden accept="video/*" onChange={handleVideoUpload} />
                  {previewVideo ? (
                    <>
                      <video style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted playsInline controls preload="auto">
                        <source src={previewVideo} type={getVideoMimeType(previewVideo)} />
                      </video>
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); setFormData({ ...formData, videoUrl: '' }); setPreviewVideo(''); }} sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'rgba(0,0,0,0.7)', color: 'white' }}>
                        <IconifyIcon icon="material-symbols:close" width={16} />
                      </IconButton>
                    </>
                  ) : (
                    <Stack alignItems="center" spacing={0.5}>
                      <IconifyIcon icon="material-symbols:video-library" width={24} color="#444" />
                      <Typography variant="caption" color="#444" fontSize="9px">Vidéo</Typography>
                    </Stack>
                  )}
                </Box>
              </Box>
            </Stack>
            {uploading && uploadProgress > 0 && (
              <LinearProgress variant="determinate" value={uploadProgress} sx={{ mt: 1, height: 4, borderRadius: 1, bgcolor: '#222', '& .MuiLinearProgress-bar': { bgcolor: 'white' } }} />
            )}
          </Grid>

          {/* CATÉGORIES */}
          <Grid item xs={12} md={6}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField
                select
                label="Catégorie"
                fullWidth
                value={selectedParent?.id ?? ''}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                sx={{ '& .MuiInputBase-root': { bgcolor: '#0a0a0a', color: 'white' }, '& .MuiInputLabel-root': { color: '#666' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: '#222' } }}
              >
                <MenuItem value="">Aucune</MenuItem>
                {parentCategories.map((cat) => (
                  <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
                ))}
              </TextField>
              {subcategories.length > 0 && (
                <TextField
                  select
                  label="Sous-catégorie"
                  fullWidth
                  value={selectedSubcategoryId || selectedParent?.id || ''}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  sx={{ '& .MuiInputBase-root': { bgcolor: '#0a0a0a', color: 'white' }, '& .MuiInputLabel-root': { color: '#666' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: '#222' } }}
                >
                  <MenuItem value={selectedParent?.id ?? ''}>{selectedParent?.name ?? '— Principale'}</MenuItem>
                  {subcategories.map((sub) => (
                    <MenuItem key={sub.id} value={sub.id}>{sub.name}</MenuItem>
                  ))}
                </TextField>
              )}
            </Stack>
          </Grid>

          {/* TITRE & TAG */}
          <Grid item xs={12} md={8}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField label="Titre" fullWidth value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} sx={{ flex: { sm: 2 }, '& .MuiInputBase-root': { bgcolor: '#0a0a0a', color: 'white' }, '& .MuiInputLabel-root': { color: '#666' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: '#222' } }} />
              <TextField label="Tag" fullWidth value={formData.tag} onChange={(e) => setFormData({ ...formData, tag: e.target.value })} placeholder="Nouveau, Promo..." sx={{ flex: { sm: 1 }, '& .MuiInputBase-root': { bgcolor: '#0a0a0a', color: 'white' }, '& .MuiInputLabel-root': { color: '#666' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: '#222' } }} />
            </Stack>
          </Grid>

          {/* DESCRIPTION */}
          <Grid item xs={12}>
            <RichTextEditor value={formData.description} onChange={(value) => setFormData({ ...formData, description: value })} placeholder="Description..." height={80} />
          </Grid>

          {/* TARIFS */}
          <Grid item xs={12}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
              <Typography variant="body2" color="#999" sx={{ fontSize: '12px', fontWeight: 600 }}>
                💰 {variants.length} tarif(s)
              </Typography>
              <Button size="small" onClick={addVariant} sx={{ bgcolor: 'white', color: 'black', py: 0.5, px: 1.5, fontSize: '0.7rem', '&:hover': { bgcolor: '#ddd' } }} startIcon={<IconifyIcon icon="material-symbols:add" width={16} />}>
                Ajouter
              </Button>
            </Stack>
            {variants.length === 0 ? (
              <Box sx={{ py: 3, textAlign: 'center', color: '#444' }}>
                <Typography variant="body2" fontSize="12px">Aucun tarif</Typography>
              </Box>
            ) : (
              <Stack spacing={1.5}>
                {variants.map((variant, index) => (
                  <Box key={index} sx={{ display: 'flex', gap: 0.75, alignItems: 'center', flexWrap: 'nowrap', width: '100%' }}>
                    <TextField
                      size="small"
                      value={variant.name}
                      onChange={(e) => updateVariant(index, 'name', e.target.value)}
                      placeholder="Qté"
                      sx={{ width: { xs: '60px', sm: '80px' }, flexShrink: 0, '& .MuiInputBase-root': { bgcolor: '#0a0a0a', color: 'white', fontSize: '0.8rem' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: '#222' } }}
                    />
                    <TextField
                      select
                      size="small"
                      value={variant.unit || ''}
                      onChange={(e) => updateVariant(index, 'unit', e.target.value || null)}
                      sx={{ width: { xs: '50px', sm: '65px' }, flexShrink: 0, '& .MuiInputBase-root': { bgcolor: '#0a0a0a', color: 'white', fontSize: '0.8rem' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: '#222' } }}
                    >
                      <MenuItem value="">—</MenuItem>
                      <MenuItem value="gramme">g</MenuItem>
                      <MenuItem value="ml">ml</MenuItem>
                    </TextField>
                    <TextField
                      size="small"
                      value={variant.price}
                      type="number"
                      onChange={(e) => updateVariant(index, 'price', e.target.value)}
                      placeholder="Prix"
                      sx={{ flex: 1, minWidth: 0, '& .MuiInputBase-root': { bgcolor: '#0a0a0a', color: 'white', fontSize: '0.8rem' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: '#222' } }}
                    />
                    <IconButton onClick={() => removeVariant(index)} size="small" sx={{ color: '#666', '&:hover': { color: '#ff4444' }, flexShrink: 0, p: 0.5 }}>
                      <IconifyIcon icon="material-symbols:delete" width={16} />
                    </IconButton>
                  </Box>
                ))}
              </Stack>
            )}
          </Grid>
        </Grid>
          </AccordionDetails>
        </Accordion>

        {/* ACCORDION PRÉVISUALISATION */}
        <Accordion 
          sx={{ 
            bgcolor: '#0a0a0a', 
            border: '1px solid #222',
            '&:before': { display: 'none' }
          }}
        >
          <AccordionSummary
            expandIcon={<IconifyIcon icon="mdi:chevron-down" width={24} color="white" />}
            sx={{ 
              bgcolor: '#000',
              borderBottom: '1px solid #222',
              '&:hover': { bgcolor: '#111' }
            }}
          >
            <Typography variant="h6" fontWeight={700} color="white">
              👁️ PRÉVISUALISATION
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
            <Card sx={{
              maxWidth: 200,
              borderRadius: 3,
              boxShadow: '0 2px 10px rgba(255,255,255,0.1)',
              border: '1px solid #222',
              overflow: 'hidden',
              bgcolor: '#0a0a0a'
            }}>
              {(previewImage || previewVideo) && (
                <Box sx={{ 
                  height: 160, 
                  bgcolor: '#111',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {formData.tag && (
                    <Box sx={{
                      position: 'absolute',
                      top: 8,
                      left: 8,
                      bgcolor: '#000',
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
              <CardContent sx={{ p: 1.5, bgcolor: '#0a0a0a' }}>
                <Typography variant="subtitle2" fontWeight={700} color="white" sx={{ fontSize: '0.9rem', mb: 0.5, lineHeight: 1.3 }}>
                  {formData.title || 'Titre du produit'}
                </Typography>
                <Box 
                  sx={{ 
                    fontSize: '0.75rem', 
                    color: '#999', 
                    mb: 1.5,
                    '& p': { margin: 0, lineHeight: 1.4 },
                    '& strong': { fontWeight: 700 },
                    '& ul, & ol': { paddingLeft: '16px', margin: 0 }
                  }}
                  dangerouslySetInnerHTML={{ 
                    __html: formData.description || '<p style="color: #666;">Description</p>' 
                  }}
                />
                <Button
                  fullWidth
                  sx={{
                    bgcolor: '#000',
                    color: 'white',
                    py: 0.8,
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    borderRadius: 2,
                    textTransform: 'none',
                    border: '1px solid #333',
                    '&:hover': { bgcolor: '#111', borderColor: '#444' }
                  }}
                >
                  Voir les détails
                </Button>
                {variants.length > 0 && (
                  <Typography variant="caption" sx={{ display: 'block', mt: 1, color: '#666', textAlign: 'center' }}>
                    Prix : {Math.min(...variants.map(v => parseFloat(v.price) || 0))}€
                  </Typography>
                )}
              </CardContent>
            </Card>
          </AccordionDetails>
        </Accordion>
      </Box>
    </Box>
  );
};

export default ProductEdit;
