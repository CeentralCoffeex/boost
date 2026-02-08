import { ReactElement, useEffect, useState } from 'react';
import { Box, Card, Stack, Typography, CircularProgress, Alert } from '@mui/material';
import IconifyIcon from '../../components/base/IconifyIcon';

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
      const [productsRes, categoriesRes] = await Promise.all([
        fetch('/api/products', { credentials: 'include' }),
        fetch('/api/categories?all=1', { credentials: 'include' })
      ]);

      const products: Product[] = await productsRes.json();
      const categories = await categoriesRes.json();

      const categoryMap = new Map<string, Category>();
      
      categories.forEach((cat: any) => {
        if (!cat.parentId) {
          categoryMap.set(cat.id, {
            id: cat.id,
            name: cat.name,
            products: []
          });
        }
      });

      products.forEach((product) => {
        if (product.categoryId && categoryMap.has(product.categoryId)) {
          categoryMap.get(product.categoryId)!.products.push(product);
        }
      });

      const categoriesArray = Array.from(categoryMap.values())
        .filter(cat => cat.products.length > 0)
        .sort((a, b) => a.name.localeCompare(b.name));

      setCategoriesWithProducts(categoriesArray);

      // Charger les sélections depuis localStorage
      try {
        const saved = localStorage.getItem('admin_featured_trending');
        if (saved) {
          setSelectedIds(new Set(JSON.parse(saved)));
        }
      } catch {}
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

    // Sauvegarder dans localStorage
    try {
      localStorage.setItem('admin_featured_trending', JSON.stringify(Array.from(newSelected)));
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 1500);
    } catch (error) {
      console.error('Error saving:', error);
    }
  };

  if (loading) {
    return (
      <Stack alignItems="center" justifyContent="center" sx={{ minHeight: '60vh' }}>
        <CircularProgress sx={{ color: 'white' }} />
      </Stack>
    );
  }

  return (
    <Box sx={{ pb: 4 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700} color="white">
            Gérer les tendances
          </Typography>
          <Typography variant="body2" color="#999" sx={{ mt: 0.5, fontSize: '0.85rem' }}>
            Sélectionnez les produits à afficher en priorité dans "Tendances" (en vert = sélectionné)
          </Typography>
        </Box>
      </Stack>

      {showSuccess && (
        <Alert 
          severity="success" 
          sx={{ 
            mb: 2, 
            bgcolor: '#10b981', 
            color: 'white',
            fontWeight: 600,
            '& .MuiAlert-icon': { color: 'white' }
          }}
          onClose={() => setShowSuccess(false)}
        >
          Tendances enregistrées
        </Alert>
      )}

      <Stack spacing={3}>
        {categoriesWithProducts.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center', bgcolor: '#111', borderRadius: 2 }}>
            <Typography color="#666">Aucun produit disponible</Typography>
          </Box>
        ) : (
          categoriesWithProducts.map((category) => (
            <Box key={category.id}>
              <Typography 
                variant="subtitle1" 
                fontWeight={700} 
                sx={{ 
                  mb: 1.5, 
                  color: 'white',
                  fontSize: '1rem'
                }}
              >
                {category.name}
              </Typography>

              <Box
                sx={{
                  display: 'flex',
                  gap: 1.5,
                  overflowX: 'auto',
                  pb: 1.5,
                  '&::-webkit-scrollbar': { height: 6 },
                  '&::-webkit-scrollbar-track': { bgcolor: '#222', borderRadius: 1 },
                  '&::-webkit-scrollbar-thumb': { bgcolor: '#444', borderRadius: 1, '&:hover': { bgcolor: '#555' } },
                }}
              >
                {category.products.map((product) => {
                  const isSelected = selectedIds.has(product.id);
                  return (
                    <Card
                      key={product.id}
                      onClick={() => handleToggle(product.id)}
                      sx={{
                        minWidth: 120,
                        maxWidth: 120,
                        cursor: 'pointer',
                        border: isSelected ? '3px solid #10b981' : '2px solid #333',
                        transition: 'all 0.2s',
                        bgcolor: isSelected ? '#064e3b' : '#0a0a0a',
                        position: 'relative',
                        '&:hover': {
                          borderColor: isSelected ? '#10b981' : '#555',
                          transform: 'scale(1.02)',
                          boxShadow: isSelected ? '0 0 12px rgba(16,185,129,0.4)' : '0 0 8px rgba(255,255,255,0.1)',
                        },
                      }}
                    >
                      <Box
                        sx={{
                          height: 100,
                          bgcolor: '#111',
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
                          <Stack alignItems="center" justifyContent="center" sx={{ height: '100%' }}>
                            <IconifyIcon icon="mdi:image-off" width={32} color="#333" />
                          </Stack>
                        )}
                        
                        {isSelected && (
                          <Box
                            sx={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              bgcolor: 'rgba(16,185,129,0.2)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Box
                              sx={{
                                bgcolor: '#10b981',
                                borderRadius: '50%',
                                width: 40,
                                height: 40,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                              }}
                            >
                              <IconifyIcon icon="mdi:check-bold" width={24} color="white" />
                            </Box>
                          </Box>
                        )}
                      </Box>

                      <Box sx={{ p: 1, bgcolor: isSelected ? '#064e3b' : '#0a0a0a' }}>
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          color={isSelected ? 'white' : '#ddd'}
                          sx={{
                            fontSize: '0.75rem',
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

      <Box sx={{ 
        mt: 3, 
        p: 2, 
        bgcolor: selectedIds.size > 0 ? '#064e3b' : '#111', 
        borderRadius: 2, 
        border: selectedIds.size > 0 ? '1px solid #10b981' : '1px solid #222',
        transition: 'all 0.3s'
      }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="body2" color={selectedIds.size > 0 ? 'white' : '#999'} fontWeight={600}>
            {selectedIds.size > 0 ? `✓ ${selectedIds.size} produit(s) sélectionné(s)` : 'Aucun produit sélectionné'}
          </Typography>
          {saving && (
            <CircularProgress size={16} sx={{ color: 'white' }} />
          )}
        </Stack>
      </Box>
    </Box>
  );
};

export default Tendances;
