import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Stack,
  Card,
  IconButton,
  CircularProgress,
  Container,
  TextField,
  MenuItem,
} from '@mui/material';
import IconifyIcon from '../../../components/base/IconifyIcon';
import { useNavigate } from 'react-router-dom';
import { fetchWithCSRF } from '../../../utils/csrf';

// Composant interne pour gérer l'affichage intelligent (Image > Vidéo > Placeholder)
const ProductThumbnail = ({ image, videoUrl, alt }: { image?: string | null, videoUrl?: string | null, alt: string }) => {
  const [thumbnail, setThumbnail] = useState<string | null>(null);

  useEffect(() => {
    if (!image && videoUrl) {
      const video = document.createElement('video');
      video.src = videoUrl;
      video.crossOrigin = 'anonymous';
      video.currentTime = 1;
      video.muted = true;
      
      const handleLoadedData = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          setThumbnail(canvas.toDataURL());
        }
        video.remove();
      };

      video.addEventListener('loadeddata', handleLoadedData);
      video.load();

      return () => {
        video.removeEventListener('loadeddata', handleLoadedData);
        video.remove();
      };
    }
    return undefined;
  }, [image, videoUrl]);

  return (
    <Box
      component="img"
      src={image || thumbnail || '/placeholder.png'}
      alt={alt}
      sx={{
        width: 60,
        height: 60,
        borderRadius: 2,
        objectFit: 'cover',
        mr: 2,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}
    />
  );
};

interface CategoryItem {
  id: string;
  name: string;
  parentId?: string | null;
  subcategories?: { id: string }[];
}

interface Product {
  id: string;
  title: string;
  description?: string;
  price: string | number;
  image: string | null;
  videoUrl: string | null;
  tag: string | null;
  section: string;
  category?: { id: string; name: string; parent?: { id: string; name: string } } | null;
  categoryId?: string | null;
  [key: string]: unknown;
}

function stripHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/\[c=#[a-fA-F0-9]+\]/g, '')
    .replace(/\[\/c\]/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

export default function ProductList() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories?all=1', { credentials: 'include' });
      const data = await res.json();
      if (Array.isArray(data)) {
        setCategories(data);
      }
    } catch {}
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/products', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      }
    } catch (error) {
      console.error('Failed to fetch products', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const getCategoryIdsForFilter = (selectedId: string): string[] => {
    const cat = categories.find((c: { id: string; parentId?: string | null; subcategories?: { id: string }[] }) => c.id === selectedId);
    if (!cat) return [selectedId];
    if (cat.subcategories?.length) {
      return [cat.id, ...(cat.subcategories?.map((s) => s.id) ?? [])];
    }
    return [selectedId];
  };

  const filteredProducts = categoryFilter
    ? products.filter((p) => {
        const catId = p.categoryId ?? p.category?.id;
        if (!catId) return false;
        const ids = getCategoryIdsForFilter(categoryFilter);
        return ids.includes(catId);
      })
    : products;

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) return;
    try {
      const response = await fetchWithCSRF(`/api/products/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (response.ok) {
        fetchProducts();
      } else {
        const err = await response.json().catch(() => ({}));
        alert(err?.error || err?.message || 'Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Delete failed', error);
      alert('Erreur lors de la suppression du produit');
    }
  };

  const handleEdit = (product: { id: string }) => {
    if (!product?.id) return;
    navigate(`/product/edit/${product.id}`);
  };

  const handleCreate = () => {
    navigate('/product/new');
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  const flatCategories = categories.filter((c: { parentId?: string | null }) => !c.parentId);

  return (
    <Container maxWidth="xl" sx={{ py: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2} sx={{ gap: 2, flexWrap: 'wrap' }}>
        <Typography variant="h6" fontWeight="bold" sx={{ fontSize: '1rem' }}>
          Produits
        </Typography>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <TextField
            select
            size="small"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            displayEmpty
            sx={{ 
              minWidth: 200,
              '& .MuiSelect-select': { 
                py: 0.75,
                fontSize: '0.875rem'
              }
            }}
          >
            <MenuItem value=""><em>Filtrer par catégorie</em></MenuItem>
            {flatCategories.map((cat) => (
              <MenuItem key={cat.id} value={cat.id}>
                {cat.name}
              </MenuItem>
            ))}
          </TextField>
          <Button
            variant="contained"
            size="small"
            startIcon={<IconifyIcon icon="fluent:add-24-filled" width={16} />}
            onClick={handleCreate}
            sx={{ 
              borderRadius: 2,
              px: 1.5,
              py: 0.5,
              boxShadow: 'none',
              fontSize: '0.75rem',
              whiteSpace: 'nowrap',
              height: 32
            }}
          >
            Nouveau
          </Button>
        </Stack>
      </Stack>

      <Stack spacing={1.5}>
        {filteredProducts.map((product) => (
          <Card
            key={product.id}
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
            {/* Image */}
            <ProductThumbnail 
              image={product.image} 
              videoUrl={product.videoUrl} 
              alt={product.title} 
            />
            
            {/* Content */}
            <Box sx={{ flexGrow: 1, minWidth: 0, mx: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', overflow: 'hidden' }}>
            <Box sx={{ minWidth: 0, mr: 2, flex: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Typography 
                  variant="subtitle2" 
                  fontWeight={700} 
                  noWrap 
                  title={product.title}
                  sx={{ fontSize: '0.9rem', mb: 0, color: 'text.primary' }}
                >
                  {product.title}
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
                  {product.category
                    ? product.category.parent
                      ? `${product.category.parent.name} › ${product.category.name}`
                      : product.category.name
                    : product.tag || product.section || 'Sans catégorie'}
                </Typography>
              </Box>
              {product.description && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    fontSize: '0.75rem',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    lineHeight: 1.5,
                  }}
                >
                  {stripHtml(product.description)}
                </Typography>
              )}
            </Box>

            <Typography 
              variant="subtitle2" 
              fontWeight={700} 
              color="primary.main"
              sx={{ fontSize: '0.9rem', whiteSpace: 'nowrap', mr: 2 }}
            >
              {product.price ? `${product.price} €` : ''}
            </Typography>
          </Box>

            {/* Actions */}
            <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 'fit-content' }}>
              <IconButton 
                onClick={() => handleEdit(product)}
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
                onClick={() => handleDelete(product.id)}
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
        ))}
      </Stack>
    </Container>
  );
}
