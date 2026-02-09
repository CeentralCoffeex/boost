import { ReactElement, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  FormControlLabel,
  Grid,
  IconButton,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import IconifyIcon from '../../components/base/IconifyIcon';
import { fetchWithCSRF } from '../../utils/csrf';

interface CategoryForm {
  name: string;
  subtitle: string;
  icon: string;
  backgroundColor: string;
  url: string;
  order: number;
  isActive: boolean;
}

interface SubcategoryItem {
  id?: string;
  name: string;
}

const CategoryEdit = (): ReactElement => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;

  const [formData, setFormData] = useState<CategoryForm>({
    name: '',
    subtitle: '',
    icon: '',
    backgroundColor: '#000000',
    url: '',
    order: 0,
    isActive: true,
  });
  const [subcategories, setSubcategories] = useState<SubcategoryItem[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string; order: number }[]>([]);
  const [previewIcon, setPreviewIcon] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchCategories();
    if (isEditing) {
      fetchCategory();
    }
  }, [id]);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories?all=1', { credentials: 'include' });
      const data = await response.json();
      if (Array.isArray(data)) {
        setCategories(data.filter((c: { parentId: string | null }) => !c.parentId).map((c: { id: string; name: string; order: number }) => ({ id: c.id, name: c.name, order: c.order })));
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const fetchCategory = async () => {
    if (!id) return;
    try {
      const response = await fetch(`/api/categories/${id}`, { credentials: 'include' });
      const data = await response.json();
      if (data) {
        setFormData({
          name: data.name || '',
          subtitle: data.subtitle || '',
          icon: data.icon || '',
          backgroundColor: data.backgroundColor || '#000000',
          url: data.url || '',
          order: data.order ?? 0,
          isActive: data.isActive ?? true,
        });
        setPreviewIcon(data.icon || '');
        setSubcategories((data.subcategories || []).map((s: { id: string; name: string }) => ({ id: s.id, name: s.name })));
      }
    } catch (err) {
      console.error('Error fetching category:', err);
      setError('Erreur lors du chargement');
    }
  };

  const addSubcategory = () => {
    setSubcategories([...subcategories, { name: '' }]);
  };

  const updateSubcategory = (index: number, name: string) => {
    const next = [...subcategories];
    next[index] = { ...next[index], name };
    setSubcategories(next);
  };

  const removeSubcategory = (index: number) => {
    setSubcategories(subcategories.filter((_, i) => i !== index));
  };

  const goToCreateSubcategory = (index: number) => {
    const sub = subcategories[index];
    if (!id || !sub?.name?.trim()) return;
    const params = new URLSearchParams({
      parentId: id,
      name: sub.name.trim(),
    });
    navigate(`/categories/subcategory/new?${params.toString()}`);
  };

  const handleDeleteSubcategory = async (index: number) => {
    const sub = subcategories[index];
    if (!sub?.id) {
      removeSubcategory(index);
      return;
    }
    if (!confirm('Supprimer cette sous-catégorie ?')) return;
    try {
      const response = await fetchWithCSRF(`/api/categories/${sub.id}`, { method: 'DELETE' });
      if (response.ok) {
        setSuccess('Sous-catégorie supprimée');
        setSubcategories(subcategories.filter((_, i) => i !== index));
      } else {
        const result = await response.json();
        setError(result.error || 'Erreur lors de la suppression');
      }
    } catch (err) {
      console.error('Delete error:', err);
      setError('Erreur lors de la suppression');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    setPreviewIcon(objectUrl);
    setUploading(true);

    try {
      const isSmallImage = file.type.startsWith('image/') && file.size < 1024 * 1024;
      let response;

      if (!isSmallImage) {
        const uploadUrl = `/api/upload?filename=${encodeURIComponent(file.name)}`;
        response = await fetchWithCSRF(uploadUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/octet-stream',
            'x-file-name': encodeURIComponent(file.name),
          },
          body: file,
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
      if (data.success) {
        setFormData((prev) => ({ ...prev, icon: data.url }));
        setSuccess('Image uploadée avec succès');
      } else {
        setError(data.message || "Erreur lors de l'upload");
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError("Erreur lors de l'upload du fichier");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    setError('');
    setSuccess('');

    if (!formData.name?.trim() || !formData.subtitle?.trim()) {
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    let generatedUrl = formData.url?.trim();
    if (!generatedUrl) {
      generatedUrl =
        '/' +
        formData.name
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
    }

    const dataToSubmit = {
      ...formData,
      url: generatedUrl,
    };

    setLoading(true);

    try {
      if (isEditing) {
        const payload = {
          ...dataToSubmit,
          subcategories: subcategories.filter((s) => s.name.trim()),
        };
        const response = await fetchWithCSRF(`/api/categories/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          setSuccess('Catégorie modifiée avec succès');
          setTimeout(() => navigate('/categories'), 500);
        } else {
          const result = await response.json();
          setError(result.error || 'Erreur lors de la modification');
        }
      } else {
        const payload = {
          ...dataToSubmit,
          order: categories.length,
          subcategories: subcategories.filter((s) => s.name.trim()),
        };
        const response = await fetchWithCSRF('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          setSuccess('Catégorie ajoutée avec succès');
          setTimeout(() => navigate('/categories'), 500);
        } else {
          const result = await response.json();
          setError(result.error || 'Erreur lors de l\'ajout');
        }
      }
    } catch (err) {
      console.error('Submit error:', err);
      setError('Erreur lors de l\'opération');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
        <IconButton
          onClick={() => navigate('/categories')}
          sx={{
            color: 'text.primary',
            bgcolor: 'background.paper',
            boxShadow: 1,
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          <IconifyIcon icon="mdi:arrow-left" width={24} height={24} />
        </IconButton>
        <Typography variant="h4">
          {isEditing ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
        </Typography>
        <Box sx={{ width: 40 }} />
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

      <Paper
        component="form"
        sx={{ p: { xs: 3, sm: 4 } }}
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Nom *"
              fullWidth
              size="small"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Site Web"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Sous-titre *"
              fullWidth
              size="small"
              value={formData.subtitle}
              onChange={(e) => setFormData((prev) => ({ ...prev, subtitle: e.target.value }))}
              placeholder="FRONTEND"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isActive}
                  onChange={(e) => setFormData((prev) => ({ ...prev, isActive: e.target.checked }))}
                />
              }
              label="Actif"
            />
          </Grid>

          {/* Sous-catégories */}
          <Grid item xs={12}>
            <Accordion defaultExpanded sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
              <AccordionSummary expandIcon={<IconifyIcon icon="material-symbols:expand-more" />}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Sous-catégories ({subcategories.length})
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Button
                  variant="contained"
                  size="small"
                  onClick={addSubcategory}
                  startIcon={<IconifyIcon icon="material-symbols:add" />}
                  sx={{ mb: 2 }}
                >
                  Ajouter une sous-catégorie
                </Button>
                {subcategories.map((sub, index) => (
                  <Box
                    key={sub.id || `new-${index}`}
                    sx={{
                      p: 1.5,
                      mb: 1.5,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      bgcolor: 'background.paper',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                    }}
                  >
                    <TextField
                      label="Nom"
                      size="small"
                      fullWidth
                      value={sub.name}
                      onChange={(e) => updateSubcategory(index, e.target.value)}
                      placeholder="ex: Espagnol ou 🌿 Fleurs"
                    />
                    {sub.id ? (
                      <>
                        <IconButton
                          onClick={() => navigate(`/categories/subcategory/edit/${sub.id}`)}
                          size="small"
                          sx={{
                            bgcolor: 'action.hover',
                            width: 36,
                            height: 36,
                            '&:hover': { bgcolor: 'primary.lighter', color: 'primary.main' },
                          }}
                          title="Modifier (icône, sous-titre...)"
                        >
                          <IconifyIcon icon="material-symbols:edit-outline" fontSize="small" />
                        </IconButton>
                        <IconButton
                          onClick={() => handleDeleteSubcategory(index)}
                        size="small"
                        sx={{
                          bgcolor: 'error.main',
                          color: 'white',
                          width: 36,
                          height: 36,
                          '&:hover': { bgcolor: 'error.dark' },
                        }}
                        title="Supprimer la sous-catégorie"
                      >
                        <IconifyIcon icon="material-symbols:delete" fontSize="small" />
                      </IconButton>
                      </>
                    ) : (
                      <Stack direction="row" spacing={1} alignItems="center">
                        <IconButton
                          onClick={addSubcategory}
                          size="small"
                          sx={{
                            bgcolor: 'success.main',
                            color: 'white',
                            width: 36,
                            height: 36,
                            '&:hover': { bgcolor: 'success.dark' },
                          }}
                          title="Ajouter une sous-catégorie"
                        >
                          <IconifyIcon icon="material-symbols:add" width={22} height={22} />
                        </IconButton>
                        {isEditing && (
                          <IconButton
                            onClick={() => goToCreateSubcategory(index)}
                            disabled={!sub.name?.trim()}
                            size="small"
                            sx={{
                              bgcolor: 'primary.main',
                              color: 'white',
                              width: 36,
                              height: 36,
                              '&:hover': { bgcolor: 'primary.dark' },
                            }}
                            title="Créer cette sous-catégorie"
                          >
                            <IconifyIcon icon="mdi:check" width={22} height={22} />
                          </IconButton>
                        )}
                        <IconButton
                          onClick={() => removeSubcategory(index)}
                          size="small"
                          sx={{
                            color: 'text.secondary',
                            width: 36,
                            height: 36,
                            '&:hover': { bgcolor: 'action.hover', color: 'error.main' },
                          }}
                          title="Retirer de la liste"
                        >
                          <IconifyIcon icon="material-symbols:close" fontSize="small" />
                        </IconButton>
                      </Stack>
                    )}
                  </Box>
                ))}
              </AccordionDetails>
            </Accordion>
          </Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle2" color="text.disabled" mb={1}>
              Photo
            </Typography>
            {(previewIcon || formData.icon) && (
              <Box sx={{ mb: 2 }}>
                <img
                  src={previewIcon || formData.icon}
                  alt="Preview"
                  style={{
                    width: 60,
                    height: 60,
                    objectFit: 'cover',
                    borderRadius: 8,
                    border: '1px solid #444',
                  }}
                />
                <IconButton
                  size="small"
                  onClick={() => {
                    setFormData((prev) => ({ ...prev, icon: '' }));
                    setPreviewIcon('');
                  }}
                  sx={{ ml: 1, color: 'error.main' }}
                >
                  <IconifyIcon icon="material-symbols:delete" width={20} />
                </IconButton>
              </Box>
            )}
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
            >
              {uploading ? 'Upload en cours...' : formData.icon ? 'Changer la photo' : 'Choisir une photo'}
              <input type="file" hidden accept="image/*" onChange={handleFileUpload} />
            </Button>
          </Grid>

          <Grid item xs={12}>
            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button type="button" variant="outlined" onClick={() => navigate('/categories')} sx={{ minWidth: 120 }}>
                Annuler
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={loading || uploading}
                sx={{
                  bgcolor: 'primary.main',
                  color: 'common.black',
                  minWidth: 120,
                  '&:hover': { bgcolor: 'primary.dark' },
                }}
              >
                {loading ? 'Sauvegarde...' : isEditing ? 'Modifier' : 'Ajouter'}
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default CategoryEdit;
