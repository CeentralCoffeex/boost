import { ReactElement, useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Stack,
  Alert,
  Grid,
  ToggleButton,
  ToggleButtonGroup,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import IconButton from '@mui/material/IconButton';
import IconifyIcon from '../../components/base/IconifyIcon';
import { fetchWithCSRF } from '../../utils/csrf';

type ThemeId = 'blanc' | 'blue-white' | 'noir' | 'orange' | 'violet' | 'rouge' | 'jaune';

interface SettingsForm {
  heroTitle: string;
  heroSubtitle1: string;
  heroSubtitle2: string;
  heroSubtitle3: string;
  heroTagline: string;
  heroImage: string;
  heroSeparatorColor: string;
  facebookUrl: string;
  twitterUrl: string;
  instagramUrl: string;
  theme: ThemeId;
  featuredRecentIds: string;
  featuredTrendingIds: string;
}

const Settings = (): ReactElement => {
  const [formData, setFormData] = useState<SettingsForm>({
    heroTitle: '',
    heroSubtitle1: '',
    heroSubtitle2: '',
    heroSubtitle3: '',
    heroTagline: '',
    heroImage: '',
    heroSeparatorColor: '#bef264',
    facebookUrl: '',
    twitterUrl: '',
    instagramUrl: '',
    theme: 'blanc',
    featuredRecentIds: '',
    featuredTrendingIds: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      console.log('[Settings] Fetching settings from API...');
      const response = await fetch('/api/settings');
      const data = await response.json();
      
      console.log('[Settings] Received data:', data);
      console.log('[Settings] heroImage value:', data.heroImage);
      
      setFormData({
        heroTitle: data.heroTitle || '',
        heroSubtitle1: data.heroSubtitle1 || '',
        heroSubtitle2: data.heroSubtitle2 || '',
        heroSubtitle3: data.heroSubtitle3 || '',
        heroTagline: data.heroTagline || '',
        heroImage: data.heroImage || '',
        heroSeparatorColor: data.heroSeparatorColor || '#bef264',
        facebookUrl: data.facebookUrl || '',
        twitterUrl: data.twitterUrl || '',
        instagramUrl: data.instagramUrl || '',
        theme: ['blue-white', 'noir', 'orange', 'violet', 'rouge', 'jaune'].includes(data.theme) ? data.theme : 'blanc',
        featuredRecentIds: (() => {
          try {
            const arr = JSON.parse(data.featuredRecentIds || '[]');
            return Array.isArray(arr) ? arr.join(', ') : '';
          } catch { return ''; }
        })(),
        featuredTrendingIds: (() => {
          try {
            const arr = JSON.parse(data.featuredTrendingIds || '[]');
            return Array.isArray(arr) ? arr.join(', ') : '';
          } catch { return ''; }
        })(),
      });
      
      console.log('[Settings] Form data updated:', {
        heroTitle: data.heroTitle || '',
        heroImage: data.heroImage || '',
        facebookUrl: data.facebookUrl || '',
        twitterUrl: data.twitterUrl || '',
        instagramUrl: data.instagramUrl || '',
      });
    } catch (error) {
      console.error('[Settings] Error fetching settings:', error);
      setError('Erreur lors du chargement des paramètres');
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const idsRecent = formData.featuredRecentIds
        ? JSON.stringify(formData.featuredRecentIds.split(',').map((s) => s.trim()).filter(Boolean))
        : null;
      const idsTrending = formData.featuredTrendingIds
        ? JSON.stringify(formData.featuredTrendingIds.split(',').map((s) => s.trim()).filter(Boolean))
        : null;
      const payload = {
        ...formData,
        featuredRecentIds: idsRecent,
        featuredTrendingIds: idsTrending,
      };
      const response = await fetchWithCSRF('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setSuccess('Paramètres sauvegardés avec succès');
        setTimeout(() => setSuccess(''), 3000);
        window.dispatchEvent(new Event('admin-theme-changed'));
      } else {
        const result = await response.json();
        setError(result.error || 'Erreur lors de la sauvegarde');
      }
    } catch (error) {
      console.error('Submit error:', error);
      setError('Erreur lors de la sauvegarde des paramètres');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" color="common.white" mb={4}>
        Paramètres du site
      </Typography>

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
        <Grid container spacing={4}>
          {/* Section Thème */}
          <Grid item xs={12}>
            <Typography variant="h6" color="common.white" mb={2}>
              Thème du site
            </Typography>
            <Typography variant="body2" color="grey.400" mb={2}>
              Choisissez l'apparence des pages du site (fond et textes).
            </Typography>
            <ToggleButtonGroup
              value={formData.theme}
              exclusive
              onChange={(_, value: ThemeId | null) => value != null && setFormData({ ...formData, theme: value })}
              aria-label="Thème"
              sx={{ flexWrap: 'wrap', gap: 1 }}
            >
              <ToggleButton 
                value="blanc" 
                aria-label="Blanc"
                sx={{
                  bgcolor: formData.theme === 'blanc' ? 'rgba(255,255,255,0.95) !important' : 'rgba(255,255,255,0.1)',
                  color: formData.theme === 'blanc' ? '#000 !important' : '#fff',
                  border: '1px solid rgba(255,255,255,0.3) !important',
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.85)',
                    color: '#000',
                  }
                }}
              >
                Blanc
              </ToggleButton>
              <ToggleButton 
                value="blue-white" 
                aria-label="Bleu"
                sx={{
                  bgcolor: formData.theme === 'blue-white' ? '#1565c0 !important' : 'rgba(21,101,192,0.2)',
                  color: '#fff !important',
                  border: '1px solid rgba(21,101,192,0.5) !important',
                  '&:hover': { bgcolor: '#1976d2' }
                }}
              >
                Bleu
              </ToggleButton>
              <ToggleButton 
                value="noir" 
                aria-label="Noir"
                sx={{
                  bgcolor: formData.theme === 'noir' ? '#171717 !important' : 'rgba(0,0,0,0.3)',
                  color: '#fff !important',
                  border: '1px solid rgba(255,255,255,0.2) !important',
                  '&:hover': { bgcolor: '#262626' }
                }}
              >
                Noir
              </ToggleButton>
              <ToggleButton 
                value="orange" 
                aria-label="Orange"
                sx={{
                  bgcolor: formData.theme === 'orange' ? '#ea580c !important' : 'rgba(234,88,12,0.3)',
                  color: '#fff !important',
                  border: '1px solid rgba(234,88,12,0.5) !important',
                  '&:hover': { bgcolor: '#f97316' }
                }}
              >
                Orange
              </ToggleButton>
              <ToggleButton 
                value="violet" 
                aria-label="Violet"
                sx={{
                  bgcolor: formData.theme === 'violet' ? '#7c3aed !important' : 'rgba(124,58,237,0.3)',
                  color: '#fff !important',
                  border: '1px solid rgba(124,58,237,0.5) !important',
                  '&:hover': { bgcolor: '#8b5cf6' }
                }}
              >
                Violet
              </ToggleButton>
              <ToggleButton 
                value="rouge" 
                aria-label="Rouge"
                sx={{
                  bgcolor: formData.theme === 'rouge' ? '#dc2626 !important' : 'rgba(220,38,38,0.3)',
                  color: '#fff !important',
                  border: '1px solid rgba(220,38,38,0.5) !important',
                  '&:hover': { bgcolor: '#ef4444' }
                }}
              >
                Rouge
              </ToggleButton>
              <ToggleButton 
                value="jaune" 
                aria-label="Jaune"
                sx={{
                  bgcolor: formData.theme === 'jaune' ? '#ca8a04 !important' : 'rgba(202,138,4,0.3)',
                  color: '#fff !important',
                  border: '1px solid rgba(202,138,4,0.5) !important',
                  '&:hover': { bgcolor: '#eab308' }
                }}
              >
                Jaune
              </ToggleButton>
            </ToggleButtonGroup>
          </Grid>

          {/* Section Hero - Éditeur visuel */}
          <Grid item xs={12}>
            <Typography variant="h6" color="common.white" mb={2}>
              Hero de la page d'accueil
            </Typography>
            <Typography variant="body2" color="grey.400" mb={3}>
              Cliquez sur les textes pour les modifier directement dans la preview.
            </Typography>
            
            {/* Preview Box - Visuel du Hero */}
            <Box
              sx={{
                position: 'relative',
                width: '100%',
                height: '380px',
                borderRadius: '12px',
                overflow: 'hidden',
                backgroundImage: `url(${formData.heroImage || '/hero.png'})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                mb: 3,
                border: '2px solid rgba(255,255,255,0.1)',
              }}
            >
              {/* Bouton modifier photo hero */}
              <IconButton
                component="label"
                sx={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  zIndex: 20,
                  bgcolor: 'rgba(0,0,0,0.5)',
                  color: 'white',
                  '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
                }}
              >
                <PhotoCameraIcon />
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const fd = new FormData();
                      fd.append('file', file);
                      const res = await fetchWithCSRF('/api/upload', { method: 'POST', body: fd });
                      const data = await res.json();
                      if (data?.url) setFormData(prev => ({ ...prev, heroImage: data.url }));
                    } catch (err) {
                      console.error(err);
                    }
                    e.target.value = '';
                  }}
                />
              </IconButton>
              {/* Overlay */}
              <Box sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(0,0,0,0.2)' }} />
              
              {/* Contenu éditable */}
              <Box sx={{ position: 'relative', zIndex: 10, p: 3, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                {/* Top */}
                <Box>
                  <TextField
                    fullWidth
                    variant="standard"
                    multiline
                    minRows={1}
                    maxRows={3}
                    value={formData.heroSubtitle1}
                    onChange={(e) => setFormData({ ...formData, heroSubtitle1: e.target.value })}
                    placeholder="Ligne 1 (ex. BIENVENUE ✨)"
                    InputProps={{
                      disableUnderline: true,
                      sx: {
                        color: 'white',
                        fontSize: formData.heroSubtitle1.length > 20 ? 'clamp(1.5rem, 5vw, 2rem)' : 'clamp(1.75rem, 6vw, 2.25rem)',
                        fontWeight: 300,
                        fontFamily: "'Orbitron', sans-serif",
                        textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                        whiteSpace: 'pre-line',
                      }
                    }}
                  />
                  <TextField
                    fullWidth
                    variant="standard"
                    multiline
                    minRows={1}
                    maxRows={3}
                    value={formData.heroSubtitle3}
                    onChange={(e) => setFormData({ ...formData, heroSubtitle3: e.target.value })}
                    placeholder="Ligne 2 (ex. L'EXCELLENCE À VOTRE SERVICE — Entrée = retour à la ligne)"
                    InputProps={{
                      disableUnderline: true,
                      sx: {
                        color: 'white',
                        fontSize: formData.heroSubtitle3.length > 15 ? 'clamp(1.5rem, 5vw, 2rem)' : 'clamp(1.75rem, 6vw, 2.25rem)',
                        fontWeight: 700,
                        fontFamily: "'Orbitron', sans-serif",
                        textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                        whiteSpace: 'pre-line',
                      }
                    }}
                  />
                  <TextField
                    fullWidth
                    variant="standard"
                    value={formData.heroTagline}
                    onChange={(e) => setFormData({ ...formData, heroTagline: e.target.value })}
                    placeholder="Luxury Experience"
                    InputProps={{
                      disableUnderline: true,
                      sx: {
                        color: 'rgba(255,255,255,0.9)',
                        fontSize: formData.heroTagline.length > 30 ? '8px' : '9px',
                        fontWeight: 500,
                        textTransform: 'uppercase',
                        letterSpacing: '0.3em',
                        borderLeft: '2px solid rgba(255,255,255,0.5)',
                        pl: 1.5,
                        mt: 2,
                      }
                    }}
                  />
                </Box>

                {/* Bottom */}
                <Box sx={{ textAlign: 'center' }}>
                  <TextField
                    fullWidth
                    variant="standard"
                    value={formData.heroTitle}
                    onChange={(e) => setFormData({ ...formData, heroTitle: e.target.value })}
                    placeholder="PROPULSEZ VOTRE BUISNESS!"
                    InputProps={{
                      disableUnderline: true,
                      sx: {
                        color: 'white',
                        fontSize: formData.heroTitle.length > 30 ? 'clamp(1.25rem, 4vw, 1.75rem)' : 'clamp(1.5rem, 5vw, 2rem)',
                        fontWeight: 900,
                        fontFamily: "'Orbitron', sans-serif",
                        textTransform: 'uppercase',
                        fontStyle: 'italic',
                        textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                        textAlign: 'center',
                      }
                    }}
                  />
                </Box>
              </Box>
            </Box>

            {/* Ligne animée du hero - couleur */}
            <Typography variant="subtitle2" color="grey.300" sx={{ mt: 3, mb: 1 }}>
              Ligne animée du hero
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <input
                type="color"
                value={formData.heroSeparatorColor || '#bef264'}
                onChange={(e) => setFormData({ ...formData, heroSeparatorColor: e.target.value })}
                style={{
                  width: 48,
                  height: 36,
                  padding: 2,
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.2)',
                  cursor: 'pointer',
                  backgroundColor: 'transparent',
                }}
              />
              <TextField
                size="small"
                value={formData.heroSeparatorColor || '#bef264'}
                onChange={(e) => setFormData({ ...formData, heroSeparatorColor: e.target.value })}
                placeholder="#bef264"
                sx={{
                  width: 120,
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'rgba(255,255,255,0.05)',
                    color: 'white',
                    '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                  },
                }}
              />
              <Box
                sx={{
                  flex: 1,
                  height: 6,
                  borderRadius: 9999,
                  background: `linear-gradient(90deg, ${(formData.heroSeparatorColor || '#bef264')}00 0%, ${(formData.heroSeparatorColor || '#bef264')}33 20%, ${(formData.heroSeparatorColor || '#bef264')}e6 100%)`,
                  backgroundSize: '200% 100%',
                  animation: 'heroSeparatorMove 2.4s linear infinite',
                  '@keyframes heroSeparatorMove': {
                    '0%': { backgroundPosition: '100% 0' },
                    '100%': { backgroundPosition: '-100% 0' },
                  },
                }}
              />
            </Box>

            <Typography variant="body2" color="grey.400" sx={{ mt: 1, mb: 2 }}>
              Pour « L'excellence à votre service », utilisez le 2ᵉ champ et appuyez sur Entrée pour aller à la ligne.
            </Typography>
          </Grid>

          <Grid item xs={12}>
            <Accordion
              defaultExpanded={false}
              sx={{
                bgcolor: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px !important',
                '&:before': { display: 'none' },
                boxShadow: 'none',
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon sx={{ color: 'common.white' }} />}
                aria-controls="reseaux-content"
                id="reseaux-header"
                sx={{
                  '& .MuiAccordionSummary-content': { alignItems: 'center', gap: 1 },
                }}
              >
                <Typography variant="h6" color="common.white">
                  Réseaux sociaux
                </Typography>
                <Typography variant="body2" color="grey.400">
                  WhatsApp, Snapchat, Instagram — cliquer pour modifier
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0 }}>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="URL WhatsApp"
                      fullWidth
                      value={formData.facebookUrl}
                      onChange={(e) => setFormData({ ...formData, facebookUrl: e.target.value })}
                      placeholder="https://wa.me/votrecompte"
                      InputProps={{
                        startAdornment: (
                          <IconifyIcon icon="mdi:whatsapp" width={24} style={{ marginRight: 8 }} />
                        ),
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="URL Snapchat"
                      fullWidth
                      value={formData.twitterUrl}
                      onChange={(e) => setFormData({ ...formData, twitterUrl: e.target.value })}
                      placeholder="https://snapchat.com/add/votrecompte"
                      InputProps={{
                        startAdornment: (
                          <IconifyIcon icon="mdi:snapchat" width={24} style={{ marginRight: 8 }} />
                        ),
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="URL Instagram"
                      fullWidth
                      value={formData.instagramUrl}
                      onChange={(e) => setFormData({ ...formData, instagramUrl: e.target.value })}
                      placeholder="https://instagram.com/votrecompte"
                      InputProps={{
                        startAdornment: (
                          <IconifyIcon icon="mdi:instagram" width={24} style={{ marginRight: 8 }} />
                        ),
                      }}
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          </Grid>

          {/* Produits mis en avant */}
          <Grid item xs={12}>
            <Accordion
              defaultExpanded={false}
              sx={{
                bgcolor: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px !important',
                '&:before': { display: 'none' },
                boxShadow: 'none',
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon sx={{ color: 'common.white' }} />}
                aria-controls="featured-content"
                id="featured-header"
              >
                <Typography variant="h6" color="common.white">
                  Produits mis en avant
                </Typography>
                <Typography variant="body2" color="grey.400" sx={{ ml: 1 }}>
                  Section Récents et Tendances sur la page d&apos;accueil
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0 }}>
                <Typography variant="body2" color="grey.400" sx={{ mb: 2 }}>
                  Entrez les IDs des produits séparés par des virgules. Laissez vide pour utiliser le tri par défaut (date pour Récents, section pour Tendances).
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="IDs produits - Récents"
                      fullWidth
                      multiline
                      minRows={2}
                      value={formData.featuredRecentIds}
                      onChange={(e) => setFormData({ ...formData, featuredRecentIds: e.target.value })}
                      placeholder="id1, id2, id3..."
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="IDs produits - Tendances"
                      fullWidth
                      multiline
                      minRows={2}
                      value={formData.featuredTrendingIds}
                      onChange={(e) => setFormData({ ...formData, featuredTrendingIds: e.target.value })}
                      placeholder="id1, id2, id3..."
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          </Grid>

          <Grid item xs={12}>
            <Stack direction="row" spacing={2} justifyContent="flex-end" mt={2}>
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={loading}
                sx={{
                  bgcolor: 'primary.main',
                  color: 'common.black',
                  minWidth: 150,
                  '&:hover': {
                    bgcolor: 'primary.dark',
                  },
                }}
              >
                {loading ? 'Enregistrement...' : 'Sauvegarder'}
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default Settings;
