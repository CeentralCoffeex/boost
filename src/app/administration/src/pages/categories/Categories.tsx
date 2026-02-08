import { ReactElement, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CircularProgress,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import IconifyIcon from '../../components/base/IconifyIcon';
import { fetchWithCSRF } from '../../utils/csrf';

interface Category {
  id: string;
  name: string;
  subtitle: string;
  icon: string | null;
  backgroundColor: string;
  url: string;
  order: number;
  isActive: boolean;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  subcategories?: Category[];
}

const Categories = (): ReactElement => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/categories?all=1', { credentials: 'include' });
      const data = await response.json();
      if (Array.isArray(data)) {
        setCategories(data);
      } else {
        setCategories([]);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      setError('Erreur lors du chargement des catégories');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette catégorie ?')) {
      return;
    }

    try {
      const response = await fetchWithCSRF(`/api/categories/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSuccess('Catégorie supprimée avec succès');
        fetchCategories();
      } else {
        const result = await response.json();
        setError(result.error || 'Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Delete error:', error);
      setError('Erreur lors de la suppression');
    }
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h5" color="common.white">
          Catégories
        </Typography>
        <Button
          variant="contained"
          size="small"
          startIcon={<IconifyIcon icon="material-symbols:add" />}
          onClick={() => navigate('/categories/new')}
          sx={{
            bgcolor: 'primary.main',
            color: 'common.black',
            '&:hover': {
              bgcolor: 'primary.dark',
            },
          }}
        >
          Ajouter une catégorie
        </Button>
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

      <Stack spacing={1.5}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : categories.length === 0 ? (
          <Typography color="text.disabled" align="center">Aucune catégorie</Typography>
        ) : (
          categories
            .filter((c) => !c.parentId)
            .map((category) => (
            <Card
              key={category.id}
              elevation={0}
              sx={{
                p: 1,
                display: 'flex',
                flexDirection: 'row',
                flexWrap: 'nowrap',
                alignItems: 'center',
                borderRadius: 2,
                bgcolor: 'background.paper',
                boxShadow: '0px 2px 5px rgba(0, 0, 0, 0.05)',
                transition: 'all 0.2s ease',
                width: '100%',
                '&:hover': {
                  transform: 'translateY(-1px)',
                  boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.08)',
                }
              }}
            >
              {/* Icon */}
              <Box
                sx={{
                  width: 60,
                  height: 60,
                  borderRadius: 2,
                  mr: 2,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'action.hover',
                  overflow: 'hidden'
                }}
              >
                {category.icon ? (
                  <Box component="img" src={category.icon} alt={category.name} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <IconifyIcon icon="material-symbols:category" width={32} color="text.secondary" />
                )}
              </Box>

              {/* Content */}
              <Box sx={{ flexGrow: 1, minWidth: 0, mx: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', overflow: 'hidden' }}>
                <Box sx={{ minWidth: 0, mr: 2, flex: 1, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                    <Typography
                      variant="subtitle2"
                      fontWeight={700}
                      sx={{ fontSize: '0.9rem', mb: 0, color: 'text.primary' }}
                    >
                      {category.name}
                    </Typography>

                    <Typography
                      variant="caption"
                      color="text.secondary"
                      noWrap
                      sx={{
                        fontSize: '0.75rem',
                        bgcolor: 'action.hover',
                        px: 1,
                        py: 0.5,
                        borderRadius: 1
                      }}
                    >
                      {category.subtitle}
                    </Typography>

                    <Typography
                      variant="caption"
                      sx={{
                        fontSize: '0.75rem',
                        bgcolor: category.isActive ? 'success.lighter' : 'action.disabledBackground',
                        color: category.isActive ? 'success.dark' : 'text.disabled',
                        px: 1,
                        py: 0.5,
                        borderRadius: 1,
                        fontWeight: 'bold'
                      }}
                    >
                      {category.isActive ? 'ACTIF' : 'INACTIF'}
                    </Typography>
                  </Box>
                  {(category.subcategories?.length ?? 0) > 0 && (
                    <Typography
                      variant="caption"
                      sx={{
                        fontSize: '0.7rem',
                        color: 'text.disabled',
                        fontStyle: 'italic',
                        mt: 0.25,
                      }}
                    >
                      ↳ {category.subcategories!.map((s) => s.name).join(' · ')}
                    </Typography>
                  )}
                </Box>
              </Box>

              {/* Actions */}
              <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 'fit-content' }}>
                <IconButton
                  onClick={() => navigate(`/categories/edit/${category.id}`)}
                  size="small"
                  sx={{
                    bgcolor: 'action.hover',
                    width: 32,
                    height: 32,
                    '&:hover': { bgcolor: 'primary.lighter', color: 'primary.main' }
                  }}
                >
                  <IconifyIcon icon="material-symbols:edit-outline" width={18} height={18} />
                </IconButton>

                <IconButton
                  size="small"
                  onClick={() => handleDelete(category.id)}
                  sx={{
                    color: 'error.main',
                    bgcolor: 'error.lighter',
                    width: 32,
                    height: 32,
                    '&:hover': { bgcolor: 'error.light', color: 'white' }
                  }}
                >
                  <IconifyIcon icon="material-symbols:delete-outline" width={18} />
                </IconButton>
              </Stack>
            </Card>
          ))
        )}
      </Stack>
    </Box>
  );
};

export default Categories;
