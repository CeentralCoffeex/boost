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
  facebookUrl: string;
  twitterUrl: string;
  instagramUrl: string;
  theme: ThemeId;
}

const Settings = (): ReactElement => {
  const [formData, setFormData] = useState<SettingsForm>({
    heroTitle: '',
    heroSubtitle1: '',
    heroSubtitle2: '',
    heroSubtitle3: '',
    heroTagline: '',
    heroImage: '',
    facebookUrl: '',
    twitterUrl: '',
    instagramUrl: '',
    theme: 'blanc',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      const data = await response.json();
      setFormData({
        heroTitle: data.heroTitle || '',
        heroSubtitle1: data.heroSubtitle1 || '',
        heroSubtitle2: data.heroSubtitle2 || '',
        heroSubtitle3: data.heroSubtitle3 || '',
        heroTagline: data.heroTagline || '',
        heroImage: data.heroImage || '',
        facebookUrl: data.facebookUrl || '',
        twitterUrl: data.twitterUrl || '',
        instagramUrl: data.instagramUrl || '',
        theme: ['blue-white', 'noir', 'orange', 'violet', 'rouge', 'jaune'].includes(data.theme) ? data.theme : 'blanc',
      });
    } catch {
      setError('Erreur lors du chargement des paramètres');
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetchWithCSRF('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
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
      {/* Header avec bouton Enregistrer */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" color="common.white">
          Paramètres
        </Typography>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading}
          sx={{
            bgcolor: 'white',
            color: 'black',
            fontWeight: 600,
            px: 3,
            py: 1,
            '&:hover': {
              bgcolor: '#e0e0e0',
            },
          }}
        >
          {loading ? 'Enregistrement...' : 'Enregistrer'}
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

      <Paper sx={{ p: { xs: 3, sm: 4 } }}>
        <Grid container spacing={4}>
          {/* Section Hero */}
          <Grid item xs={12}>
            <Accordion
              defaultExpanded
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
                aria-controls="hero-content"
                id="hero-header"
                sx={{
                  '& .MuiAccordionSummary-content': { alignItems: 'center', gap: 1 },
                }}
              >
                <Typography variant="h6" color="common.white">
                  Hero de la page d'accueil
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 2 }}>
                <Grid container spacing={3}>
                  {/* Formulaire Hero */}
                  <Grid item xs={12} md={6}>
                    <Stack spacing={2}>
                      <TextField
                        label="Titre principal"
                        fullWidth
                        value={formData.heroTitle}
                        onChange={(e) => setFormData({ ...formData, heroTitle: e.target.value })}
                        placeholder="PROPULSEZ VOTRE BUSINESS!"
                      />
                      <TextField
                        label="Sous-titre 1"
                        fullWidth
                        value={formData.heroSubtitle1}
                        onChange={(e) => setFormData({ ...formData, heroSubtitle1: e.target.value })}
                        placeholder="Exclusive"
                      />
                      <TextField
                        label="Sous-titre 2"
                        fullWidth
                        value={formData.heroSubtitle2}
                        onChange={(e) => setFormData({ ...formData, heroSubtitle2: e.target.value })}
                        placeholder="Boutique"
                      />
                      <TextField
                        label="Sous-titre 3"
                        fullWidth
                        value={formData.heroSubtitle3}
                        onChange={(e) => setFormData({ ...formData, heroSubtitle3: e.target.value })}
                        placeholder="Hotel"
                      />
                      <TextField
                        label="Slogan"
                        fullWidth
                        value={formData.heroTagline}
                        onChange={(e) => setFormData({ ...formData, heroTagline: e.target.value })}
                        placeholder="Luxury Experience"
                      />
                      <TextField
                        label="URL de l'image"
                        fullWidth
                        value={formData.heroImage}
                        onChange={(e) => setFormData({ ...formData, heroImage: e.target.value })}
                        placeholder="/hero.png"
                      />
                    </Stack>
                  </Grid>

                  {/* Prévisualisation Hero */}
                  <Grid item xs={12} md={6}>
                    <Box
                      sx={{
                        position: 'relative',
                        width: '100%',
                        height: '400px',
                        borderRadius: 2,
                        overflow: 'hidden',
                        bgcolor: '#000',
                        border: '2px solid rgba(255,255,255,0.1)',
                      }}
                    >
                      {formData.heroImage && (
                        <Box
                          component="img"
                          src={formData.heroImage}
                          alt="Hero"
                          sx={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            opacity: 0.7,
                          }}
                        />
                      )}
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          alignItems: 'center',
                          textAlign: 'center',
                          p: 3,
                        }}
                      >
                        {formData.heroTitle && (
                          <Typography
                            variant="h3"
                            sx={{
                              color: 'white',
                              fontWeight: 900,
                              mb: 2,
                              textShadow: '2px 2px 8px rgba(0,0,0,0.8)',
                              fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' },
                            }}
                          >
                            {formData.heroTitle}
                          </Typography>
                        )}
                        <Stack direction="row" spacing={1} mb={1} flexWrap="wrap" justifyContent="center">
                          {formData.heroSubtitle1 && (
                            <Typography
                              sx={{
                                color: 'white',
                                fontWeight: 600,
                                fontSize: '1.2rem',
                                textShadow: '1px 1px 4px rgba(0,0,0,0.8)',
                              }}
                            >
                              {formData.heroSubtitle1}
                            </Typography>
                          )}
                          {formData.heroSubtitle2 && (
                            <Typography
                              sx={{
                                color: 'white',
                                fontWeight: 600,
                                fontSize: '1.2rem',
                                textShadow: '1px 1px 4px rgba(0,0,0,0.8)',
                              }}
                            >
                              {formData.heroSubtitle2}
                            </Typography>
                          )}
                          {formData.heroSubtitle3 && (
                            <Typography
                              sx={{
                                color: 'white',
                                fontWeight: 600,
                                fontSize: '1.2rem',
                                textShadow: '1px 1px 4px rgba(0,0,0,0.8)',
                              }}
                            >
                              {formData.heroSubtitle3}
                            </Typography>
                          )}
                        </Stack>
                        {formData.heroTagline && (
                          <Typography
                            sx={{
                              color: 'rgba(255,255,255,0.9)',
                              fontSize: '1rem',
                              fontStyle: 'italic',
                              textShadow: '1px 1px 4px rgba(0,0,0,0.8)',
                            }}
                          >
                            {formData.heroTagline}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          </Grid>

          {/* Section Thème */}
          <Grid item xs={12}>
            <Typography variant="h6" color="common.white" mb={2}>
              Thème du site
            </Typography>
            <Typography variant="body2" color="grey.400" mb={2}>
              Choisissez l'apparence des pages du site (fond et textes).
            </Typography>
            <Box sx={{ overflowX: 'auto', pb: 1 }}>
              <ToggleButtonGroup
                value={formData.theme}
                exclusive
                onChange={(_, value: ThemeId | null) => value != null && setFormData({ ...formData, theme: value })}
                aria-label="Thème"
                sx={{ 
                  flexWrap: 'nowrap', 
                  gap: 1,
                  display: 'flex',
                  '& .MuiToggleButton-root': {
                    whiteSpace: 'nowrap'
                  }
                }}
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
            </Box>
          </Grid>

          {/* Réseaux sociaux */}
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
                  WhatsApp, Snapchat, Instagram
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

        </Grid>
      </Paper>
    </Box>
  );
};

export default Settings;
