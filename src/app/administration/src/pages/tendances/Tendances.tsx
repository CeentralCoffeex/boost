import { ReactElement, useEffect, useState } from 'react';
import { Box, Card, Stack, Typography, CircularProgress, Alert, Checkbox } from '@mui/material';

interface Product {
  id: string;
  title: string;
  image: string;
  categoryId: string;
}

interface Category {
  id: string;
  name: string;
  products: Product[];
}

const Tendances = (): ReactElement => {
  const [categoriesWithProducts, setCategoriesWithProducts] = useState<Category[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [productsRes, settingsRes, categoriesRes] = await Promise.all([
        fetch('/api/products?all=1', { credentials: 'include' }),
        fetch('/api/settings', { credentials: 'include' }),
        fetch('/api/categories?all=1', { credentials: 'include' })
      ]);

      const products: Product[] = await productsRes.json();
      const settings = await settingsRes.json();
      const categories = await categoriesRes.json();

      // Grouper produits par catégorie
      const categoryMap = new Map<string, Category>();
      
      categories.forEach((cat: any) => {
        if (!cat.parentId) { // Seulement catégories principales
          categoryMap.set(cat.id, {
            id: cat.id,
            name: cat.name,
            products: []
          });
        }
      });

      // Ajouter produits aux catégories
      products.forEach((product) => {
        if (product.categoryId && categoryMap.has(product.categoryId)) {
          categoryMap.get(product.categoryId)!.products.push(product);
        }
      });

      // Filtrer catégories vides et convertir en array
      const categoriesArray = Array.from(categoryMap.values())
        .filter(cat => cat.products.length > 0)
        .sort((a, b) => a.name.localeCompare(b.name));

      setCategoriesWithProducts(categoriesArray);

      // Charger produits sélectionnés
      if (settings?.featuredTrendingIds) {
        setSelectedIds(new Set(settings.featuredTrendingIds));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (productId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedIds(newSelected);

    // Auto-save
    setSaving(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          featuredTrendingIds: Array.from(newSelected)
        })
      });

      if (response.ok) {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
      }
    } catch (error) {
      console.error('Error saving:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Stack alignItems="center" justifyContent="center" sx={{ minHeight: '60vh' }}>
        <CircularProgress />
      </Stack>
    );
  }

  return (
    <Box sx={{ pb: 4 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>
            Gérer les tendances
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Sélectionnez les produits à afficher dans la section "Tendances"
          </Typography>
        </Box>
        {saving && (
          <Stack direction="row" alignItems="center" spacing={1}>
            <CircularProgress size={20} />
            <Typography variant="body2" color="text.secondary">
              Enregistrement...
            </Typography>
          </Stack>
        )}
      </Stack>

      {showSuccess && (
        <Alert 
          severity="success" 
          sx={{ 
            mb: 3, 
            bgcolor: '#10b981', 
            color: 'white',
            '& .MuiAlert-icon': { color: 'white' }
          }}
        >
          Tendances enregistrées
        </Alert>
      )}

      <Stack spacing={3}>
        {categoriesWithProducts.length === 0 ? (
          <Card sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">
              Aucun produit disponible
            </Typography>
          </Card>
        ) : (
          categoriesWithProducts.map((category) => (
            <Box key={category.id}>
              {/* Header catégorie */}
              <Typography 
                variant="h6" 
                fontWeight={700} 
                sx={{ 
                  mb: 2, 
                  pb: 1, 
                  borderBottom: '2px solid #667eea',
                  color: '#667eea'
                }}
              >
                {category.name}
              </Typography>

              {/* Scroll horizontal des produits */}
              <Box
                sx={{
                  display: 'flex',
                  gap: 2,
                  overflowX: 'auto',
                  pb: 2,
                  '&::-webkit-scrollbar': {
                    height: 8,
                  },
                  '&::-webkit-scrollbar-track': {
                    bgcolor: '#f1f1f1',
                    borderRadius: 1,
                  },
                  '&::-webkit-scrollbar-thumb': {
                    bgcolor: '#667eea',
                    borderRadius: 1,
                    '&:hover': {
                      bgcolor: '#5568d3',
                    },
                  },
                }}
              >
                {category.products.map((product) => {
                  const isSelected = selectedIds.has(product.id);
                  return (
                    <Card
                      key={product.id}
                      onClick={() => handleToggle(product.id)}
                      sx={{
                        minWidth: 140,
                        maxWidth: 140,
                        cursor: 'pointer',
                        border: isSelected ? '3px solid #667eea' : '2px solid #e5e7eb',
                        transition: 'all 0.2s',
                        bgcolor: isSelected ? '#f5f5ff' : 'white',
                        '&:hover': {
                          borderColor: '#667eea',
                          transform: 'translateY(-2px)',
                          boxShadow: 2,
                        },
                      }}
                    >
                      {/* Image */}
                      <Box
                        sx={{
                          height: 100,
                          bgcolor: '#f8f8f8',
                          position: 'relative',
                          overflow: 'hidden',
                        }}
                      >
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.title}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                            }}
                          />
                        ) : (
                          <Stack
                            alignItems="center"
                            justifyContent="center"
                            sx={{ height: '100%' }}
                          >
                            <Typography variant="caption" color="text.secondary">
                              Pas d'image
                            </Typography>
                          </Stack>
                        )}
                        {/* Checkbox badge */}
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 4,
                            right: 4,
                            bgcolor: 'white',
                            borderRadius: '50%',
                            width: 28,
                            height: 28,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: 1,
                          }}
                        >
                          <Checkbox
                            checked={isSelected}
                            size="small"
                            sx={{ p: 0 }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </Box>
                      </Box>

                      {/* Titre */}
                      <Box sx={{ p: 1.5 }}>
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          sx={{
                            fontSize: '0.8rem',
                            lineHeight: 1.3,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            minHeight: 32,
                          }}
                        >
                          {product.title}
                        </Typography>
                      </Box>
                    </Card>
                  );
                })}
              </Box>
            </Box>
          ))
        )}
      </Stack>

      <Box sx={{ mt: 4, p: 2, bgcolor: '#f9fafb', borderRadius: 2, border: '1px solid #e5e7eb' }}>
        <Typography variant="body2" color="text.secondary">
          💡 <strong>{selectedIds.size}</strong> produit(s) sélectionné(s) • Enregistrement automatique
        </Typography>
      </Box>
    </Box>
  );
};

export default Tendances;
