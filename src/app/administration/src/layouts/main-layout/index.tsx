import { useState, ReactElement, PropsWithChildren, useEffect, useRef, useCallback } from 'react';
import { Box, Drawer } from '@mui/material';
import Topbar from './Topbar/Topbar';
import Sidebar from './Sidebar/Sidebar';
import { useLocation } from 'react-router-dom';

function getTelegramHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const tg = (window as any)?.Telegram?.WebApp;
  const initData = tg?.initData || sessionStorage.getItem('tgInitData') || localStorage.getItem('tgInitData');
  if (!initData) return {};
  const h: Record<string, string> = {
    Authorization: `tma ${initData}`,
    'X-Telegram-Init-Data': initData,
  };
  if (tg?.platform) h['X-Telegram-Platform'] = tg.platform;
  return h;
}

export const drawerOpenWidth = 240;
export const drawerCloseWidth = 110;

const SWIPE_THRESHOLD = 60;
const SWIPE_EDGE_ZONE = 40;

const MainLayout = ({ children }: PropsWithChildren): ReactElement => {
  const [open, setOpen] = useState<boolean>(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [errorDetail, setErrorDetail] = useState<string>('');
  const location = useLocation();
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const isProductEditPage = location.pathname.includes('/product/new') || location.pathname.includes('/product/edit/');
  const isCategoryEditPage = location.pathname.includes('/categories/new') || location.pathname.includes('/categories/edit/');
  const isSubcategoryEditPage = location.pathname.includes('/categories/subcategory/');
  const isFullPageLayout = isProductEditPage || isCategoryEditPage || isSubcategoryEditPage;

  const handleDrawerToggle = () => setOpen(!open);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const start = touchStartRef.current;
    if (!start) return;
    const endX = e.changedTouches[0].clientX;
    const deltaX = endX - start.x;
    if (start.x <= SWIPE_EDGE_ZONE && deltaX >= SWIPE_THRESHOLD && !open) {
      setOpen(true);
    }
    touchStartRef.current = null;
  }, [open]);

  useEffect(() => {
    const checkAuth = async (retryCount = 0): Promise<void> => {
      try {
        const headers: Record<string, string> = { 'Cache-Control': 'no-cache', ...getTelegramHeaders() };

        const res = await fetch('/api/admin/verify', {
          credentials: 'include',
          headers,
        });
        let data: { allowed?: boolean; telegramId?: string; hint?: string } = {};
        try {
          data = await res.json();
        } catch {
          /* ignore */
        }
        if (res.ok && data.allowed) {
          setIsAuthenticated(true);
          setIsLoading(false);
          return;
        }

        const detail = data.telegramId
          ? `Votre ID Telegram : ${data.telegramId}. ${data.hint || ''}`
          : '';
        setErrorDetail(detail);
        
        const hasTelegram = typeof window !== 'undefined' && !!(window as any)?.Telegram?.WebApp;
        const hasInitData = !!headers['Authorization'];
        if (!hasInitData && hasTelegram && retryCount < 2) {
          setTimeout(() => checkAuth(retryCount + 1), 400);
          return;
        }
        
        setError(hasInitData ? '❌ Vous n\'êtes pas autorisé (votre compte n\'est pas admin)' : '❌ Ouvrez l\'admin depuis le bot Telegram ou connectez-vous (session)');
        setIsLoading(false);
      } catch (err: any) {
        console.error('[admin] Error:', err);
        setError(`❌ Erreur : ${err?.message || 'Impossible de vérifier l\'accès'}`);
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (isLoading) {
    return <Box sx={{ width: 1, height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#000', color: '#fff' }}>
      <div>Chargement...</div>
    </Box>;
  }

  if (error || !isAuthenticated) {
    return <Box sx={{ width: 1, height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#1a1a1a', color: '#fff', padding: 3, textAlign: 'center', flexDirection: 'column', gap: 2 }}>
      <div style={{ fontSize: '48px' }}>🚫</div>
      <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{error || '❌ Accès refusé'}</div>
      {errorDetail && <div style={{ fontSize: '13px', opacity: 0.9, maxWidth: 360 }}>{errorDetail}</div>}
      <div style={{ fontSize: '14px', opacity: 0.7 }}>Contactez un administrateur si vous pensez que c'est une erreur</div>
    </Box>;
  }

  return (
    <>
      <Box sx={{ display: 'flex', minHeight: '100vh', flexDirection: 'column', width: '100%', overflowX: 'hidden' }}>
        {/* Mobile Drawer */}
        <Drawer
          variant="temporary"
          open={open}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerOpenWidth,
              bgcolor: '#000',
              borderRight: '1px solid #222'
            },
          }}
        >
          <Sidebar open={open} />
        </Drawer>
        {/* Desktop Drawer */}
        <Drawer
          variant="permanent"
          component="aside"
          open={open}
          sx={{
            display: { xs: 'none', sm: 'block' },
            width: open ? drawerOpenWidth : drawerCloseWidth,
            '& .MuiDrawer-paper': {
              width: open ? drawerOpenWidth : drawerCloseWidth,
              bgcolor: '#000',
              borderRight: '1px solid #222'
            },
          }}
        >
          <Sidebar open={open} />
        </Drawer>
        <Box
          component="main"
          overflow="auto"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          sx={{
            width: 1,
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {!isFullPageLayout && <Topbar open={open} handleDrawerToggle={handleDrawerToggle} />}
          <Box
            sx={{
              flex: 1,
              pt: isFullPageLayout ? 2 : 5,
              pr: { xs: 3, sm: 5.175 },
              pb: 6.25,
              pl: { xs: 3, sm: 5.25 },
            }}
          >
            {children}
          </Box>
        </Box>
      </Box>
    </>
  );
};

export default MainLayout;
