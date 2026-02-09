import { ReactElement, useEffect, useState } from 'react';
import { Box, Card, Stack, Typography, CircularProgress, Alert, Switch, FormControlLabel } from '@mui/material';
import IconifyIcon from '../../components/base/IconifyIcon';

interface Product {
  id: string;
  title: string;
  image: string;
  categoryId: string;
  section: string;
}

interface Category {
  id: string;
  name: string;
  products: Product[];
}

const MAX_FEATURED = 10; // Limite de produits en avant par section

const Tendances = (): ReactElement => {
  const [categoriesWithProducts, setCategoriesWithProducts] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isTendances, setIsTendances] = useState(true); // true = PHARE (Tendances), false = DECOUVRIR (Récents)
  const [saving, setSaving] = useState(false);

  const currentSection = isTendances ? 'PHARE' : 'DECOUVRIR';

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
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (productId: string, currentProductSection: string) => {
    if (saving) return;
    setSaving(true);

    try {
      // Compter combien de produits sont déjà dans la section actuelle
      const allProducts = categoriesWithProducts.flatMap(c => c.products);
      const currentSectionCount = allProducts.filter(p => p.section === currentSection).length;
      
      // Si on ajoute et qu'on a atteint la limite
      if (currentProductSection !== currentSection && currentSectionCount >= MAX_FEATURED) {
        alert(`Maximum ${MAX_FEATURED} produits en avant pour ${isTendances ? 'Tendances' : 'Récents'}`);
        setSaving(false);
        return;
      }

      // Déterminer la nouvelle section
      const newSection = currentProductSection === currentSection ? 'CATEGORIE' : currentSection;

      // Enregistrer en base
      const response = await fetch(`/api/products/${productId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: newSection })
      });

      if (!response.ok) throw new Error('Erreur lors de la sauvegarde');

      // Mettre à jour l'état local
      setCategoriesWithProducts(prev =>
        prev.map(cat => ({
          ...cat,
          products: cat.products.map(p =>
            p.id === productId ? { ...p, section: newSection } : p
          )
        }))
      );

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 1500);
    } catch (error) {
      console.error('Error saving:', error);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const currentSectionProducts = categoriesWithProducts
    .flatMap(c => c.products)
    .filter(p => p.section === currentSection);

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
            Gérer les produits en avant
          </Typography>
          <Typography variant="body2" color="#999" sx={{ mt: 0.5, fontSize: '0.85rem' }}>
            Sélectionnez les produits à mettre en avant (max {MAX_FEATURED} par section)
          </Typography>
        </Box>
      </Stack>

      {/* Switch Récents / Tendances */}
      <Box sx={{ 
        mb: 3, 
        p: 2, 
        bgcolor: '#111', 
        borderRadius: 2, 
        border: '1px solid #222',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Typography 
            variant="subtitle1" 
            fontWeight={700} 
            color={!isTendances ? 'white' : '#666'}
            sx={{ transition: 'color 0.2s' }}
          >
            🕐 Récents
          </Typography>
          <Switch
            checked={isTendances}
            onChange={(e) => setIsTendances(e.target.checked)}
            sx={{
              '& .MuiSwitch-switchBase.Mui-checked': {
                color: '#10b981',
              },
              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                backgroundColor: '#10b981',
              },
            }}
          />
          <Typography 
            variant="subtitle1" 
            fontWeight={700} 
            color={isTendances ? 'white' : '#666'}
            sx={{ transition: 'color 0.2s' }}
          >
            🔥 Tendances
          </Typography>
        </Stack>
        <Typography variant="body2" color="#999">
          {currentSectionProducts.length} / {MAX_FEATURED} sélectionnés
        </Typography>
      </Box>

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
          ✓ Enregistré
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
                  const isSelected = product.section === currentSection;
                  return (
                    <Card
                      key={product.id}
                      onClick={() => handleToggle(product.id, product.section)}
                      sx={{
                        minWidth: 120,
                        maxWidth: 120,
                        cursor: saving ? 'wait' : 'pointer',
                        border: isSelected ? '3px solid #10b981' : '2px solid #333',
                        transition: 'all 0.2s',
                        bgcolor: isSelected ? '#064e3b' : '#0a0a0a',
                        position: 'relative',
                        opacity: saving ? 0.6 : 1,
                        '&:hover': {
                          borderColor: isSelected ? '#10b981' : '#555',
                          transform: saving ? 'none' : 'scale(1.02)',
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
        bgcolor: currentSectionProducts.length > 0 ? '#064e3b' : '#111', 
        borderRadius: 2, 
        border: currentSectionProducts.length > 0 ? '1px solid #10b981' : '1px solid #222',
        transition: 'all 0.3s'
      }}>
        <Stack spacing={1}>
          <Typography variant="body2" color={currentSectionProducts.length > 0 ? 'white' : '#999'} fontWeight={600}>
            {currentSectionProducts.length > 0 
              ? `✓ ${currentSectionProducts.length} produit(s) en avant dans "${isTendances ? 'Tendances' : 'Récents'}"` 
              : `Aucun produit en avant dans "${isTendances ? 'Tendances' : 'Récents'}"`
            }
          </Typography>
          {currentSectionProducts.length > 0 && (
            <Typography variant="caption" color="#999">
              Cliquez sur un produit vert pour le retirer
            </Typography>
          )}
        </Stack>
      </Box>
    </Box>
  );
};

export default Tendances;
