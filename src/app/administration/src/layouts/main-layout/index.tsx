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
        
        const headers: Record<string, string> = { 'Cache-Control': 'no-cache' };
        if (initData) {
          headers['Authorization'] = `tma ${initData}`;
          headers['X-Telegram-Init-Data'] = initData;
        }

        // Vérification rapide - timeout 3 secondes max
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        try {
          const verifyRes = await fetch('/api/admin/verify', {
            credentials: 'include',
            cache: 'no-store',
            headers,
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          
          const data = await verifyRes.json();
          if (data.allowed) {
            setIsAuthenticated(true);
          } else {
            window.location.href = '/';
          }
        } catch (err: any) {
          clearTimeout(timeoutId);
          // Si timeout ou erreur : refuser l'accès
          console.error('[admin] Verification failed:', err?.message);
          window.location.href = '/';
        }
      } catch (error) {
        console.error('[admin-layout] Auth check failed');
        window.location.href = '/';
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (isLoading || !isAuthenticated) {
    return <Box sx={{ width: 1, height: '100vh' }} />;
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
