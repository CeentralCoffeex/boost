import { ReactElement, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  Stack,
  Typography,
  CircularProgress,
  Grid,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import PageTitle from '../../components/common/PageTitle';

interface Product {
  id: string;
  title: string;
  price?: number;
  image?: string;
  videoUrl?: string;
}

const Tendances = (): ReactElement => {
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<{ featuredTrendingIds?: string }>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/products').then((res) => res.json()),
      fetch('/api/settings').then((res) => res.json()),
    ])
      .then(([prods, sett]) => {
        setProducts(Array.isArray(prods) ? prods : []);
        setSettings(sett || {});
        // Parse existing trending IDs
        if (sett?.featuredTrendingIds) {
          try {
            const ids = JSON.parse(sett.featuredTrendingIds);
            setSelectedIds(Array.isArray(ids) ? ids : []);
          } catch {}
        }
        setLoading(false);
      })
      .catch((err) => {
        setError('Erreur lors du chargement');
        setLoading(false);
      });
  }, []);

  const handleToggle = (productId: string) => {
    setSelectedIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          featuredTrendingIds: JSON.stringify(selectedIds),
        }),
      });
      if (!res.ok) throw new Error('Erreur lors de la sauvegarde');
      setSuccess('Tendances mises à jour avec succès');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Stack gap={3}>
      <PageTitle title="Gérer les tendances" />
      <Typography variant="body2" color="text.secondary">
        Sélectionnez les produits à afficher dans la section "Tendances" sur la page d'accueil.
      </Typography>

      {error && (
        <Box sx={{ p: 2, bgcolor: 'error.light', borderRadius: 1 }}>
          <Typography color="error">{error}</Typography>
        </Box>
      )}

      {success && (
        <Box sx={{ p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
          <Typography color="success.dark">{success}</Typography>
        </Box>
      )}

      <Box sx={{ mb: 2 }}>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving}
          sx={{ mr: 2 }}
        >
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </Button>
        <Typography variant="caption" color="text.secondary">
          {selectedIds.length} produit{selectedIds.length !== 1 ? 's' : ''} sélectionné{selectedIds.length !== 1 ? 's' : ''}
        </Typography>
      </Box>

      <Grid container spacing={2}>
        {products.map((product) => (
          <Grid item xs={12} sm={6} md={4} key={product.id}>
            <Card
              sx={{
                p: 2,
                cursor: 'pointer',
                border: selectedIds.includes(product.id)
                  ? '2px solid'
                  : '1px solid',
                borderColor: selectedIds.includes(product.id)
                  ? 'primary.main'
                  : 'divider',
                transition: 'all 0.2s',
                '&:hover': {
                  boxShadow: 4,
                },
              }}
              onClick={() => handleToggle(product.id)}
            >
              {(product.image || product.videoUrl) && (
                <Box
                  sx={{
                    width: '100%',
                    height: 140,
                    mb: 2,
                    borderRadius: 1,
                    overflow: 'hidden',
                    bgcolor: 'grey.200',
                  }}
                >
                  {product.videoUrl ? (
                    <video
                      src={product.videoUrl}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  ) : product.image ? (
                    <img
                      src={product.image}
                      alt={product.title}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  ) : null}
                </Box>
              )}
              <FormControlLabel
                control={
                  <Checkbox
                    checked={selectedIds.includes(product.id)}
                    onChange={() => handleToggle(product.id)}
                  />
                }
                label={
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    {product.title}
                  </Typography>
                }
              />
              {product.price && (
                <Typography variant="body2" color="text.secondary">
                  {product.price}€
                </Typography>
              )}
            </Card>
          </Grid>
        ))}
      </Grid>

      {products.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography color="text.secondary">
            Aucun produit disponible
          </Typography>
        </Box>
      )}
    </Stack>
  );
};

export default Tendances;
