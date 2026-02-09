import { useState, ReactElement, PropsWithChildren, useEffect, useRef, useCallback } from 'react';
import { Box, Drawer } from '@mui/material';
import Topbar from './Topbar/Topbar';
import Sidebar from './Sidebar/Sidebar';
import { useLocation } from 'react-router-dom';

export const drawerOpenWidth = 240;
export const drawerCloseWidth = 110;

const SWIPE_THRESHOLD = 60;
const SWIPE_EDGE_ZONE = 40;

const MainLayout = ({ children }: PropsWithChildren): ReactElement => {
  const [open, setOpen] = useState<boolean>(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
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
    const checkAuth = async () => {
      try {
        const initData = typeof sessionStorage !== 'undefined'
          ? sessionStorage.getItem('tgInitData') || localStorage.getItem('tgInitData')
          : null;
        
        if (!initData) {
          setError('❌ Accès refusé : ouvrez depuis le bot Telegram');
          setIsLoading(false);
          return;
        }

        const headers: Record<string, string> = {
          'Authorization': `tma ${initData}`,
          'X-Telegram-Init-Data': initData,
          'Cache-Control': 'no-cache'
        };

        const res = await fetch('/api/admin/verify', {
          credentials: 'include',
          headers,
        });
        
        if (res.ok) {
          const data = await res.json();
          if (data.allowed) {
            setIsAuthenticated(true);
            setIsLoading(false);
            return;
          }
        }
        
        setError('❌ Accès refusé : vous n\'êtes pas administrateur');
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

  if (error) {
    return <Box sx={{ width: 1, height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#1a1a1a', color: '#fff', padding: 3, textAlign: 'center', flexDirection: 'column', gap: 2 }}>
      <div style={{ fontSize: '48px' }}>🚫</div>
      <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{error}</div>
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
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerOpenWidth },
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
