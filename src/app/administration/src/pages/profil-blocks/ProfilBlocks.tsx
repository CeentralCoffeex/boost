import { ReactElement, useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Stack,
  Alert,
  TextField,
  Grid,
} from '@mui/material';
import IconifyIcon from '../../components/base/IconifyIcon';
import RichTextEditor from '../../components/RichTextEditor';
import { fetchWithCSRF } from '../../utils/csrf';

const DEFAULT_BLOCK1_TITLE = 'Bienvenue ⭐';
const DEFAULT_BLOCK1_CONTENT = `📦 Service de livraison ouvert 7j/7
⏰ Horaires : 11h - 2h
🚚 Organisation des livraisons
• 1 livreur dédié à Marseille
• 1 livreur dédié aux alentours
⚡ Objectif : une livraison rapide, efficace et fiable`;

const DEFAULT_BLOCK2_TITLE = '📦 LIVRAISON MAIN PROPRE';
const DEFAULT_BLOCK2_CONTENT = `⏰ 3 tournées quotidiennes pour mieux vous servir :
• ⌚ TOURNÉE : 11h
• ⌚ TOURNÉE : 15h
• ⌚ TOURNÉE : 20h
📌 Zones proches du département 13
(Aix-en-Provence, Gardanne, Vitrolles, Marignane, Salon-de-Provence, Martigues)
💶 Frais de livraison : 10 €
📌 Zones 83 / 84 / 04 🚚
(Toulon, La Seyne-sur-Mer, Hyères, Fréjus, Draguignan / Avignon, Orange, Carpentras / Digne-les-Bains, Manosque)
🛒 Commande minimum : 150 €
⭐ Programme de parrainage ⭐
Chaque client peut parrainer un ami et gagner une commande offerte ! 🎁`;

interface ProfileBlocksForm {
  profileBlock1Title: string;
  profileBlock1Content: string;
  profileBlock2Title: string;
  profileBlock2Content: string;
}

const ProfilBlocks = (): ReactElement => {
  const [formData, setFormData] = useState<ProfileBlocksForm>({
    profileBlock1Title: DEFAULT_BLOCK1_TITLE,
    profileBlock1Content: DEFAULT_BLOCK1_CONTENT,
    profileBlock2Title: DEFAULT_BLOCK2_TITLE,
    profileBlock2Content: DEFAULT_BLOCK2_CONTENT,
  });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/settings');
        const data = await response.json();
        setFormData({
          profileBlock1Title: data.profileBlock1Title ?? DEFAULT_BLOCK1_TITLE,
          profileBlock1Content: data.profileBlock1Content ?? DEFAULT_BLOCK1_CONTENT,
          profileBlock2Title: data.profileBlock2Title ?? DEFAULT_BLOCK2_TITLE,
          profileBlock2Content: data.profileBlock2Content ?? DEFAULT_BLOCK2_CONTENT,
        });
      } catch {
        setError('Erreur lors du chargement des textes profil');
      } finally {
        setFetching(false);
      }
    };
    fetchData();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const response = await fetchWithCSRF('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileBlock1Title: formData.profileBlock1Title,
          profileBlock1Content: formData.profileBlock1Content,
          profileBlock2Title: formData.profileBlock2Title,
          profileBlock2Content: formData.profileBlock2Content,
        }),
      });
      if (response.ok) {
        setSuccess('Textes du profil enregistrés avec succès');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const result = await response.json();
        setError(result.error || 'Erreur lors de la sauvegarde');
      }
    } catch {
      setError('Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <Typography variant="h6" color="text.secondary">
          Chargement...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: '#000', minHeight: '100vh', width: '100%', overflowX: 'hidden' }}>
      {/* Header */}
      <Box sx={{ bgcolor: '#000', borderBottom: '1px solid #222', py: 1.5, px: 1.5, width: '100%', boxSizing: 'border-box', mb: 0 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
          <Typography variant="h6" fontWeight={700} color="white" sx={{ fontSize: { xs: '1.1rem', sm: '1.3rem' } }}>
            Textes de la page Profil
          </Typography>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={loading}
            sx={{ 
              bgcolor: 'white', 
              color: 'black', 
              fontSize: '0.875rem',
              px: 2,
              py: 1,
              minWidth: '110px',
              fontWeight: 600,
              '&:hover': { bgcolor: '#e0e0e0' }
            }}
          >
            {loading ? 'Saving...' : 'Enregistrer'}
          </Button>
        </Stack>
      </Box>

      {error && <Alert severity="error" sx={{ m: 0, borderRadius: 0 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ m: 0, borderRadius: 0 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Box sx={{ p: 2, bgcolor: '#0a0a0a', minHeight: 'calc(100vh - 70px)' }}>
        <Grid container spacing={3}>
          {/* Bloc 1 */}
          <Grid item xs={12}>
            <Box sx={{ bgcolor: '#000', border: '1px solid #222', borderRadius: 2, p: 2 }}>
              <Typography variant="subtitle1" fontWeight={600} color="white" mb={2} sx={{ fontSize: '1rem' }}>
                📋 Bloc 1 - Bienvenue
              </Typography>
              <Stack spacing={2}>
                <TextField
                  fullWidth
                  value={formData.profileBlock1Title}
                  onChange={(e) => setFormData({ ...formData, profileBlock1Title: e.target.value })}
                  placeholder="Titre du bloc 1"
                  sx={{ 
                    '& .MuiInputBase-root': { bgcolor: '#0a0a0a', color: 'white' }, 
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#222' },
                    '& input::placeholder': { color: '#555', opacity: 1 }
                  }}
                />
                <RichTextEditor
                  value={formData.profileBlock1Content}
                  onChange={(value) => setFormData({ ...formData, profileBlock1Content: value })}
                  placeholder="Contenu du bloc 1..."
                  height={150}
                />
              </Stack>
            </Box>
          </Grid>

          {/* Bloc 2 */}
          <Grid item xs={12}>
            <Box sx={{ bgcolor: '#000', border: '1px solid #222', borderRadius: 2, p: 2 }}>
              <Typography variant="subtitle1" fontWeight={600} color="white" mb={2} sx={{ fontSize: '1rem' }}>
                📦 Bloc 2 - Livraison
              </Typography>
              <Stack spacing={2}>
                <TextField
                  fullWidth
                  value={formData.profileBlock2Title}
                  onChange={(e) => setFormData({ ...formData, profileBlock2Title: e.target.value })}
                  placeholder="Titre du bloc 2"
                  sx={{ 
                    '& .MuiInputBase-root': { bgcolor: '#0a0a0a', color: 'white' }, 
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#222' },
                    '& input::placeholder': { color: '#555', opacity: 1 }
                  }}
                />
                <RichTextEditor
                  value={formData.profileBlock2Content}
                  onChange={(value) => setFormData({ ...formData, profileBlock2Content: value })}
                  placeholder="Contenu du bloc 2..."
                  height={200}
                />
              </Stack>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default ProfilBlocks;