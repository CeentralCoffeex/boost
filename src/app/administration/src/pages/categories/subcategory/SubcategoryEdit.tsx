import { ReactElement, useEffect, useState } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
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
  FormControlLabel,
  Switch,
} from '@mui/material';
import IconifyIcon from '../../../components/base/IconifyIcon';
import { fetchWithCSRF } from '../../../utils/csrf';

interface SubcategoryForm {
  name: string;
  backgroundColor: string;
  url: string;
  order: number;
  isActive: boolean;
}

interface ParentCategory {
  id: string;
  name: string;
}

const SubcategoryEdit = (): ReactElement => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { id } = useParams<{ id: string }>();
  const parentId = searchParams.get('parentId') || '';
  const prefillName = searchParams.get('name') || '';

  const isEditing = !!id;

  const [formData, setFormData] = useState<SubcategoryForm>({
    name: prefillName,
    backgroundColor: '#000000',
    url: '',
    order: 0,
    isActive: true,
  });

  const [parentCategory, setParentCategory] = useState<ParentCategory | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (prefillName) {
      setFormData((prev) => ({
        ...prev,
        name: prefillName,
      }));
    }
  }, [prefillName]);

  useEffect(() => {
    if (parentId) {
      fetchParentCategory();
    }
    if (isEditing) {
      fetchSubcategory();
    }
  }, [parentId, id]);

  const fetchParentCategory = async () => {
    try {
      const response = await fetch(`/api/categories/${parentId}`, { credentials: 'include' });
      const data = await response.json();
      if (data?.id) {
        setParentCategory({ id: data.id, name: data.name });
        setFormData((prev) => ({
          ...prev,
          backgroundColor: data.backgroundColor || '#000000',
        }));
      }
    } catch (err) {
      console.error('Error fetching parent:', err);
    }
  };

  const fetchSubcategory = async () => {
    if (!id) return;
    try {
      const response = await fetch(`/api/categories/${id}`, { credentials: 'include' });
      const data = await response.json();
      if (data) {
        setFormData({
          name: data.name || '',
          backgroundColor: data.backgroundColor || '#000000',
          url: data.url || '',
          order: data.order ?? 0,
          isActive: data.isActive ?? true,
        });
        if (data.parentId) {
          setParentCategory({ id: data.parentId, name: data.parent?.name || '' });
        }
      }
    } catch (err) {
      console.error('Error fetching subcategory:', err);
      setError('Erreur lors du chargement');
    }
  };


  const handleSubmit = async () => {
    setError('');
    setSuccess('');

    if (!formData.name?.trim()) {
      setError('Le nom est obligatoire');
      return;
    }

    const normalize = (s: string) =>
      s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    let url = formData.url?.trim();
    if (!url) {
      url = '/' + normalize(formData.name);
    } else {
      url = '/' + normalize(url.replace(/^\//, ''));
    }

    const payload = {
      ...formData,
      url,
      subtitle: formData.name,
      icon: '',
      parentId: isEditing ? undefined : parentId,
    };

    setLoading(true);

    try {
      const apiUrl = isEditing ? `/api/categories/${id}` : '/api/categories';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetchWithCSRF(apiUrl, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setSuccess(isEditing ? 'Sous-catégorie modifiée' : 'Sous-catégorie créée');
        const returnUrl = parentId ? `/categories?edit=${parentId}` : '/categories';
        setTimeout(() => navigate(returnUrl), 1500);
      } else {
        const result = await response.json();
        setError(result.error || 'Erreur lors de la sauvegarde');
      }
    } catch (err) {
      console.error('Submit error:', err);
      setError('Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const backPath = parentId ? `/categories/edit/${parentId}` : '/categories';

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
        <IconButton
          onClick={() => navigate(backPath)}
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
          {isEditing ? 'Modifier la sous-catégorie' : 'Nouvelle sous-catégorie'}
        </Typography>
        <Box sx={{ width: 40 }} />
      </Stack>

      {parentCategory && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Catégorie parente : <strong>{parentCategory.name}</strong>
        </Alert>
      )}

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
          <Grid item xs={12}>
            <TextField
              label="Nom *"
              fullWidth
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  name: e.target.value,
                }))
              }
              placeholder="ex: Espagnol"
            />
          </Grid>

          <Grid item xs={12}>
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

          <Grid item xs={12}>
            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button variant="outlined" onClick={() => navigate(backPath)} sx={{ minWidth: 120 }}>
                Annuler
              </Button>
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={loading}
                sx={{
                  bgcolor: 'primary.main',
                  color: 'common.black',
                  minWidth: 120,
                  '&:hover': { bgcolor: 'primary.dark' },
                }}
              >
                {loading ? 'Sauvegarde...' : 'Enregistrer'}
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default SubcategoryEdit;
