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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
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

  // États séparés pour la prévisualisation pour éviter les clignotements/erreurs
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
    if (isEditing) {
      fetchProduct();
    }
  }, [id]);

  useEffect(() => {
    // Initialiser les prévisualisations avec les données du formulaire si elles ne sont pas déjà définies localement
    if (!previewImage && formData.image) setPreviewImage(formData.image);
    if (!previewVideo && formData.videoUrl) setPreviewVideo(formData.videoUrl);
  }, [formData.image, formData.videoUrl]);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories?all=1', { credentials: 'include' });
      const data = await response.json();
      if (Array.isArray(data)) {
        setCategories(data);
      }
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

    // Prévisualisation immédiate
    const objectUrl = URL.createObjectURL(file);
    setPreviewImage(objectUrl);
    // On ne met PAS à jour formData.image tout de suite pour éviter d'afficher une URL vide ou invalide pendant l'upload

    setUploading(true);
    
    try {
      let response;
      // Utiliser le mode stream pour tout ce qui n'est pas une petite image
      const isSmallImage = file.type.startsWith('image/') && file.size < 1024 * 1024;
      const useRawMode = !isSmallImage;

      if (useRawMode) {
        // Mode RAW pour les gros fichiers et vidéos
        // On passe aussi le nom dans l'URL pour éviter les problèmes de headers strippés par IIS/Proxies
        const uploadUrl = `/api/upload?filename=${encodeURIComponent(file.name)}`;
        
        response = await fetchWithCSRF(uploadUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/octet-stream', // Force binary stream type
            'x-file-name': encodeURIComponent(file.name),
          },
          body: file,
        });
      } else {
        // Mode FormData standard
        const formDataUpload = new FormData();
        formDataUpload.append('file', file);
        response = await fetchWithCSRF('/api/upload', {
          method: 'POST',
          body: formDataUpload,
        });
      }

      const data = await response.json();

      if (data.success && data.url) {
        // On garde l'URL retournée par le serveur pour la sauvegarde
        setFormData(prev => ({ ...prev, image: data.url }));
        setSuccess('Fichier uploadé avec succès');
        // On ne change PAS previewImage, on garde la version locale qui est instantanée et fiable
      } else {
        console.warn('Upload success but no URL or failed', data);
        if (!data.success) {
             setError(data.message || 'Erreur lors de l\'upload');
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      setError('Erreur lors de l\'upload du fichier');
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
    setUploadProgress(0);

    try {
      let response;
      const isLargeFile = file.size > 1024 * 1024 || file.type.startsWith('video/');

      if (isLargeFile) {
        const base = typeof window !== 'undefined' ? window.location.origin : '';
        const uploadUrl = `${base}/api/upload?filename=${encodeURIComponent(file.name)}`;
        response = await uploadWithProgress(uploadUrl, file, {
          onProgress: (p) => setUploadProgress(p),
        });
      } else {
        const formDataUpload = new FormData();
        formDataUpload.append('file', file);
        response = await fetchWithCSRF('/api/upload', {
          method: 'POST',
          body: formDataUpload,
        });
      }

      const data = await response.json();
      
      console.log('Upload response:', {
        success: data.success,
        url: data.url,
        type: data.type,
        fileName: data.fileName,
        size: data.size
      });

      if (data.success && data.url) {
        try { URL.revokeObjectURL(objectUrl); } catch { /* ignore */ }
        const videoUrl = data.url.startsWith('http') ? data.url : (typeof window !== 'undefined' ? window.location.origin : '') + data.url;
        setFormData(prev => ({ ...prev, videoUrl: data.url }));
        setPreviewVideo(videoUrl);
        setSuccess('Vidéo uploadée avec succès');
      } else {
        console.warn('Video upload success but no URL or failed', data);
        if (!data.success) {
            setError(data.message || 'Erreur lors de l\'upload');
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      try { URL.revokeObjectURL(objectUrl); } catch { /* ignore */ }
      setError('Erreur lors de l\'upload de la vidéo');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.description) {
      setError('Veuillez remplir tous les champs obligatoires (Titre, Description)');
      return;
    }
    if (previewVideo && !formData.videoUrl) {
      setError('La vidéo n’a pas été enregistrée. Attendez la fin de l’upload ou réessayez.');
      return;
    }

    if (variants.length === 0) {
      setError('Veuillez ajouter au moins un tarif (Grammage + Prix)');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const url = isEditing ? `/api/products/${id}` : '/api/products';
      const method = isEditing ? 'PUT' : 'POST';

      const productData = {
        ...formData,
        basePrice: variants[0]?.price || '0',
        variants: variants
      };

      const response = await fetchWithCSRF(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData),
        credentials: 'include',
      });

      if (response.ok) {
        setSuccess(isEditing ? 'Produit modifié avec succès' : 'Produit créé avec succès');
        setTimeout(() => navigate('/product'), 1500);
      } else {
        const result = await response.json();
        setError(result.error || 'Erreur lors de la sauvegarde');
      }
    } catch (error) {
      console.error('Submit error:', error);
      setError('Erreur lors de la sauvegarde du produit');
    } finally {
      setLoading(false);
    }
  };

  const addVariant = () => {
    setVariants([
      ...variants,
      {
        name: '',
        type: 'weight',
        price: '',
        unit: null,
      }
    ]);
  };

  const updateVariant = (index: number, field: keyof ProductVariant, value: string | number | boolean | null) => {
    const updatedVariants = [...variants];
    updatedVariants[index] = {
      ...updatedVariants[index],
      [field]: value
    } as ProductVariant;
    setVariants(updatedVariants);
  };

  const removeVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
          <IconButton
            onClick={() => navigate('/product')}
            sx={{
              color: 'text.primary',
            bgcolor: 'background.paper',
            boxShadow: 1,
            '&:hover': {
              bgcolor: 'action.hover',
            }
          }}
        >
          <IconifyIcon icon="mdi:arrow-left" width={24} height={24} />
        </IconButton>
        <Typography variant="h4">
          {isEditing ? 'Modifier le produit' : 'Nouveau produit'}
        </Typography>
        <Box sx={{ width: 40 }} /> {/* Spacer to balance the header */}
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
        <Grid container spacing={3}>
          {/* Médias (Image & Vidéo) côte à côte */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="text.secondary" mb={1}>
              Médias (Image & Vidéo)
            </Typography>
            <Stack direction="row" spacing={2}>
              {/* IMAGE */}
              <Box
                sx={{
                  width: 150,
                  height: 150,
                  border: '1px dashed',
                  borderColor: 'divider',
                  borderRadius: 1,
                  overflow: 'hidden',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  bgcolor: 'background.default',
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
                        top: 4,
                        right: 4,
                        bgcolor: 'rgba(255,255,255,0.8)',
                        '&:hover': { bgcolor: 'error.main', color: 'white' },
                        zIndex: 2
                      }}
                    >
                      <IconifyIcon icon="material-symbols:close" width={16} />
                    </IconButton>
                  </>
                ) : (
                  <Stack alignItems="center" spacing={1} sx={{ color: 'text.secondary' }}>
                    <IconifyIcon icon={uploading ? "eos-icons:loading" : "material-symbols:add-photo-alternate"} width={32} />
                    <Typography variant="caption">Image</Typography>
                  </Stack>
                )}
              </Box>

              {/* VIDEO */}
              <Box
                sx={{
                  width: 150,
                  height: 150,
                  border: '1px dashed',
                  borderColor: 'divider',
                  borderRadius: 1,
                  overflow: 'hidden',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  bgcolor: 'background.default',
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
                      onError={(e) => {
                        const videoElement = e.target as HTMLVideoElement;
                        const error = videoElement.error;
                        let errorMsg = 'Erreur inconnue';
                        let errorCode = 'N/A';
                        
                        if (error) {
                          errorCode = error.code.toString();
                          if (error.code === 1) errorMsg = 'Lecture annulée (MEDIA_ERR_ABORTED)';
                          else if (error.code === 2) errorMsg = 'Problème réseau (MEDIA_ERR_NETWORK)';
                          else if (error.code === 3) errorMsg = 'Erreur décodage (MEDIA_ERR_DECODE)';
                          else if (error.code === 4) errorMsg = 'Format non supporté (MEDIA_ERR_SRC_NOT_SUPPORTED)';
                          
                          console.error('Video playback error:', {
                            code: error.code,
                            message: error.message,
                            src: videoElement.src,
                            currentSrc: videoElement.currentSrc,
                            networkState: videoElement.networkState,
                            readyState: videoElement.readyState
                          });
                        }
                        
                        // Afficher une alerte visible à l'utilisateur
                        alert(`Impossible de lire la vidéo : ${errorMsg} (Code: ${errorCode})\n\nURL: ${videoElement.src}\n\nEssayez de l'ouvrir dans un nouvel onglet pour tester.`);
                      }}
                    >
                      <source 
                        src={previewVideo} 
                        type={getVideoMimeType(previewVideo)}
                      />
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
                        top: 4,
                        right: 4,
                        bgcolor: 'rgba(255,255,255,0.8)',
                        '&:hover': { bgcolor: 'error.main', color: 'white' },
                        zIndex: 2
                      }}
                    >
                      <IconifyIcon icon="material-symbols:close" width={16} />
                    </IconButton>
                  </>
                ) : (
                  <Stack alignItems="center" spacing={1} sx={{ color: 'text.secondary' }}>
                    <IconifyIcon icon={uploading ? "eos-icons:loading" : "material-symbols:video-library"} width={32} />
                    <Typography variant="caption">Vidéo</Typography>
                  </Stack>
                )}
              </Box>
              {uploading && uploadProgress > 0 && (
                <Box sx={{ mt: 0.5 }}>
                  <LinearProgress variant="determinate" value={uploadProgress} color="primary" sx={{ height: 6, borderRadius: 1 }} />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>{uploadProgress}%</Typography>
                </Box>
              )}
            </Stack>
          </Grid>

          {/* Champs principaux - 2 par ligne */}
          <Grid item xs={12}>
            <TextField
              label="Titre"
              fullWidth
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </Grid>

          <Grid item xs={12}>
            <RichTextBlock
              label="Description"
              value={formData.description}
              onChange={(v) => setFormData({ ...formData, description: v })}
              minRows={4}
              placeholder="**gras**, [c=#dc2626]couleur[/c], retours à la ligne..."
            />
          </Grid>

          <Grid item xs={6}>
            <TextField
              label="FARM / (70u, 120u...)"
              fullWidth
              value={formData.tag}
              onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
              placeholder="ex: FARM / 120u"
            />
          </Grid>

          {/* Catégorie et Sous-catégorie regroupés proprement */}
          <Grid item xs={12}>
            <Box
              sx={{
                p: 2,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                bgcolor: 'background.default',
              }}
            >
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                Catégorie du produit
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="stretch">
                <TextField
                  select
                  label="Catégorie"
                  fullWidth
                  size="small"
                  value={selectedParent?.id ?? ''}
                  onChange={(e) => {
                    const parentId = e.target.value;
                    setFormData({ ...formData, categoryId: parentId });
                  }}
                  sx={{ minWidth: { sm: 200 } }}
                >
                  <MenuItem value="">Aucune</MenuItem>
                  {parentCategories.map((cat) => (
                    <MenuItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </MenuItem>
                  ))}
                </TextField>
                {subcategories.length > 0 && (
                  <TextField
                    select
                    label="Sous-catégorie"
                    fullWidth
                    size="small"
                    value={selectedSubcategoryId || selectedParent?.id || ''}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    sx={{ minWidth: { sm: 200 } }}
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
                )}
              </Stack>
            </Box>
          </Grid>

          {/* Gestion des variantes */}
          <Grid item xs={12}>
            <Accordion defaultExpanded sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
              <AccordionSummary expandIcon={<IconifyIcon icon="material-symbols:expand-more" />}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Tarifs et Variantes ({variants.length})
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Button
                  variant="contained"
                  size="small"
                  onClick={addVariant}
                  startIcon={<IconifyIcon icon="material-symbols:add" />}
                  sx={{ mb: 2 }}
                >
                  Ajouter un tarif
                </Button>
                
                {variants.map((variant, index) => (
                  <Box key={index} sx={{ 
                    p: 1.5, 
                    mb: 1.5, 
                    border: '1px solid', 
                    borderColor: 'divider', 
                    borderRadius: 1,
                    bgcolor: 'background.paper'
                  }}>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} sm={3}>
                        <TextField
                          label="Valeur (gramme/ml)"
                          size="small"
                          fullWidth
                          value={variant.name}
                          type="text"
                          onChange={(e) => updateVariant(index, 'name', e.target.value)}
                          placeholder="ex: 5, 2.5, 2ml"
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
                          <option value="gramme">Gramme</option>
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
                          onChange={(e) => {
                            const v = e.target.value.replace(/,/g, '.').replace(/[^0-9.]/g, '');
                            updateVariant(index, 'price', v);
                          }}
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
                      <Grid item xs={2} sm={1} sx={{ textAlign: 'center' }}>
                        <IconButton
                          onClick={() => removeVariant(index)}
                          color="error"
                          size="small"
                        >
                          <IconifyIcon icon="material-symbols:delete" fontSize="small" />
                        </IconButton>
                      </Grid>
                    </Grid>
                  </Box>
                ))}
              </AccordionDetails>
            </Accordion>
          </Grid>

          <Grid item xs={12}>
            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button
                variant="outlined"
                onClick={() => navigate('/product')}
                sx={{ minWidth: 120 }}
              >
                Annuler
              </Button>
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={loading || uploading}
                sx={{
                  bgcolor: 'primary.main',
                  color: 'common.black',
                  minWidth: 120,
                  '&:hover': {
                    bgcolor: 'primary.dark',
                  },
                }}
              >
                {loading ? 'Sauvegarde...' : uploading ? 'Upload vidéo...' : 'Enregistrer'}
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default ProductEdit;
