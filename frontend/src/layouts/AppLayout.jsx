import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import {
  Box,
  Drawer,
  IconButton,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import Sidebar from '../components/Sidebar';
import { tokens } from '../theme/theme';

export default function AppLayout() {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <Box
  sx={{
    position: 'fixed',
    inset: 0,
    display: 'flex',
    width: '100vw',
    height: '100vh',
    maxWidth: 'none',
    overflow: 'hidden',
  }}
>
      {isDesktop ? (
        <Box
          component="aside"
          sx={{
            width: tokens.sidebarWidth,
            flexShrink: 0,
            borderRight: `1px solid ${tokens.border}`,
            backgroundColor: tokens.sidebar,
          }}
        >
          <Sidebar />
        </Box>
      ) : (
        <Drawer
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          PaperProps={{
            sx: {
              width: tokens.sidebarWidth,
            },
          }}
        >
          <Sidebar onNavigate={() => setMobileOpen(false)} />
        </Drawer>
      )}

      <Box
        component="main"
        sx={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'transparent',
        }}
      >
        {!isDesktop && (
          <Box
            component="header"
            sx={{
              p: 1.5,
              flexShrink: 0,
              borderBottom: `1px solid ${tokens.border}`,
              backgroundColor: tokens.sidebar,
            }}
          >
            <IconButton
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
            >
              <MenuIcon />
            </IconButton>
          </Box>
        )}

        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}