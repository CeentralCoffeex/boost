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
  FormControlLabel,
  Switch,
} from '@mui/material';
import IconifyIcon from '../../components/base/IconifyIcon';
import { fetchWithCSRF } from '../../utils/csrf';

type OrderPlatform = 'telegram' | 'signal';

const Panier = (): ReactElement => {
  const [orderPlatform, setOrderPlatform] = useState<OrderPlatform>('telegram');
  const [orderTelegramUsername, setOrderTelegramUsername] = useState('');
  const [orderSignalLink, setOrderSignalLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/order-telegram', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setOrderTelegramUsername(data.orderTelegramUsername || '');
        setOrderPlatform((data.orderPlatform as OrderPlatform) || 'telegram');
        setOrderSignalLink(data.orderSignalLink || '');
      }
    } catch {
      setError('Erreur lors du chargement');
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const payload: Record<string, string> = {
        orderPlatform,
        orderTelegramUsername: orderTelegramUsername.replace(/^@/, '').trim() || 'savpizz13',
      };
      if (orderPlatform === 'signal') {
        payload.orderSignalLink = orderSignalLink.trim();
      }

      const res = await fetchWithCSRF('/api/order-telegram', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSuccess('Configuration enregistrée');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err?.error || 'Erreur lors de l\'enregistrement');
      }
    } catch (e) {
      console.error(e);
      setError('Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" color="common.white" mb={4}>
        Panier & Commandes
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
          <Grid item xs={12}>
            <Typography variant="h6" color="common.white" mb={2}>
              Plateforme de redirection (Meet-up & Livraison)
            </Typography>
            <Typography variant="body2" color="grey.400" mb={2}>
              Choisissez vers quelle plateforme les clients seront redirigés lors de la finalisation de leur commande.
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={orderPlatform === 'telegram'}
                    onChange={(_, checked) => setOrderPlatform(checked ? 'telegram' : 'signal')}
                    color="primary"
                  />
                }
                label=""
              />
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  px: 2,
                  py: 1,
                  borderRadius: 2,
                  bgcolor: orderPlatform === 'telegram' ? 'rgba(0, 136, 204, 0.2)' : 'rgba(255,255,255,0.05)',
                  border: orderPlatform === 'telegram' ? '2px solid #0088cc' : '1px solid rgba(255,255,255,0.1)',
                  cursor: 'pointer',
                  minWidth: 140,
                  justifyContent: 'center',
                }}
                onClick={() => setOrderPlatform('telegram')}
              >
                <IconifyIcon icon="mdi:telegram" width={28} height={28} color={orderPlatform === 'telegram' ? '#0088cc' : undefined} />
                <Typography color={orderPlatform === 'telegram' ? 'primary.main' : 'grey.400'} fontWeight={600}>
                  Telegram
                </Typography>
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  px: 2,
                  py: 1,
                  borderRadius: 2,
                  bgcolor: orderPlatform === 'signal' ? 'rgba(58, 134, 255, 0.2)' : 'rgba(255,255,255,0.05)',
                  border: orderPlatform === 'signal' ? '2px solid #3a86ff' : '1px solid rgba(255,255,255,0.1)',
                  cursor: 'pointer',
                  minWidth: 140,
                  justifyContent: 'center',
                }}
                onClick={() => setOrderPlatform('signal')}
              >
                <IconifyIcon icon="simple-icons:signal" width={28} height={28} color={orderPlatform === 'signal' ? '#3a86ff' : undefined} />
                <Typography color={orderPlatform === 'signal' ? '#3a86ff' : 'grey.400'} fontWeight={600}>
                  Signal
                </Typography>
              </Box>
            </Box>
          </Grid>

          {orderPlatform === 'telegram' && (
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" color="common.white" mb={1}>
                @ Telegram pour les commandes
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={orderTelegramUsername}
                onChange={(e) => setOrderTelegramUsername(e.target.value)}
                placeholder="savpizz13"
                InputProps={{
                  startAdornment: (
                    <Typography sx={{ mr: 1, color: 'grey.400' }}>@</Typography>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'rgba(255,255,255,0.05)',
                    color: 'white',
                    '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                  },
                }}
              />
              <Typography variant="caption" color="grey.500" sx={{ mt: 0.5, display: 'block' }}>
                Le panier redirigera vers t.me/@{orderTelegramUsername || '...'} avec la commande pré-remplie
              </Typography>
            </Grid>
          )}

          {orderPlatform === 'signal' && (
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" color="common.white" mb={1}>
                Lien Signal pour le panier
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={orderSignalLink}
                onChange={(e) => setOrderSignalLink(e.target.value)}
                placeholder="https://signal.me/#eu/VOTRE_LIEN"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'rgba(255,255,255,0.05)',
                    color: 'white',
                    '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                  },
                }}
              />
              <Typography variant="caption" color="grey.500" sx={{ mt: 0.5, display: 'block' }}>
                Les clients seront redirigés vers ce lien Signal avec la commande copiée dans le presse-papier
              </Typography>
            </Grid>
          )}

          <Grid item xs={12}>
            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={loading}
                startIcon={<IconifyIcon icon="mdi:content-save" width={20} />}
                sx={{
                  bgcolor: 'primary.main',
                  color: 'common.black',
                  minWidth: 150,
                  '&:hover': { bgcolor: 'primary.dark' },
                }}
              >
                {loading ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default Panier;
