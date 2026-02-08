import { ReactElement, useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Stack,
  Alert,
} from '@mui/material';
import IconifyIcon from '../../components/base/IconifyIcon';
import RichTextBlock from '../../components/base/RichTextBlock';
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
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Typography variant="h4" color="common.white">
          Textes de la page Profil
        </Typography>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={loading}
          startIcon={<IconifyIcon icon="mdi:content-save" />}
          sx={{ minWidth: 140 }}
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

      <Stack spacing={2}>
        <Paper
          sx={{
            p: { xs: 2, sm: 3 },
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: 2,
          }}
        >
          <Typography variant="h6" color="common.white" mb={1.5}>
            Bloc 1
          </Typography>
          <Stack spacing={1.5}>
            <RichTextBlock
              label="Titre"
              value={formData.profileBlock1Title}
              onChange={(v) => setFormData((prev) => ({ ...prev, profileBlock1Title: v }))}
              minRows={1}
            />
            <RichTextBlock
              label="Contenu"
              value={formData.profileBlock1Content}
              onChange={(v) => setFormData((prev) => ({ ...prev, profileBlock1Content: v }))}
              minRows={5}
              placeholder="Retours à la ligne préservés. **gras** et [c=#hex]couleur[/c]"
            />
          </Stack>
        </Paper>

        <Paper
          sx={{
            p: { xs: 2, sm: 3 },
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: 2,
          }}
        >
          <Typography variant="h6" color="common.white" mb={1.5}>
            Bloc 2
          </Typography>
          <Stack spacing={1.5}>
            <RichTextBlock
              label="Titre"
              value={formData.profileBlock2Title}
              onChange={(v) => setFormData((prev) => ({ ...prev, profileBlock2Title: v }))}
              minRows={1}
            />
            <RichTextBlock
              label="Contenu"
              value={formData.profileBlock2Content}
              onChange={(v) => setFormData((prev) => ({ ...prev, profileBlock2Content: v }))}
              minRows={6}
              placeholder="Retours à la ligne préservés. **gras** et [c=#hex]couleur[/c]"
            />
          </Stack>
        </Paper>
      </Stack>
    </Box>
  );
};

export default ProfilBlocks;