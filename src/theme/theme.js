import { createTheme, alpha } from '@mui/material/styles';

export const tokens = {
  bg: '#060809',
  sidebar: '#080c0e',
  surface: '#0b1013',
  surfaceRaised: '#0f1518',
  surfaceHover: '#131b1f',
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.15)',
  accent: '#2dd4a4',
  accentSoft: 'rgba(45,212,164,0.10)',
  accentBorder: 'rgba(45,212,164,0.30)',
  glow: '0 0 28px rgba(45,212,164,0.18)',
  textPrimary: '#edf2f4',
  textSecondary: '#a2adb5',
  sidebarWidth: 264,
};

const theme = createTheme({
  palette: {
    mode: 'dark',

    primary: {
      main: tokens.accent,
      contrastText: '#03110c',
    },

    background: {
      default: tokens.bg,
      paper: tokens.surface,
    },

    text: {
      primary: tokens.textPrimary,
      secondary: tokens.textSecondary,
    },

    divider: tokens.border,
  },

  shape: {
    borderRadius: 14,
  },

  typography: {
    fontFamily: '"Inter Variable", Inter, system-ui, sans-serif',

    h1: {
      color: tokens.textPrimary,
    },

    h2: {
      color: tokens.textPrimary,
    },

    h3: {
      color: tokens.textPrimary,
    },

    h4: {
      color: tokens.textPrimary,
      fontWeight: 650,
      letterSpacing: '-0.025em',
    },

    h5: {
      color: tokens.textPrimary,
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },

    h6: {
      color: tokens.textPrimary,
      fontWeight: 600,
    },

    subtitle1: {
      color: tokens.textPrimary,
    },

    subtitle2: {
      color: tokens.textPrimary,
    },

    body1: {
      color: tokens.textPrimary,
    },

    body2: {
      color: tokens.textSecondary,
      lineHeight: 1.65,
    },

    caption: {
      color: tokens.textSecondary,
    },

    button: {
      textTransform: 'none',
      fontWeight: 600,
    },

    overline: {
      color: tokens.textSecondary,
      letterSpacing: '0.12em',
      fontWeight: 600,
    },
  },

  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: {
          colorScheme: 'dark',
          color: tokens.textPrimary,
          backgroundColor: tokens.bg,
        },

        body: {
          color: tokens.textPrimary,
          backgroundColor: tokens.bg,
          backgroundImage: `
            radial-gradient(
              900px 500px at 85% -10%,
              rgba(45,212,164,0.08),
              transparent 60%
            ),
            radial-gradient(
              700px 400px at -10% 110%,
              rgba(45,212,164,0.05),
              transparent 60%
            )
          `,
          backgroundAttachment: 'fixed',
        },

        '#root': {
          minHeight: '100vh',
          color: tokens.textPrimary,
        },

        '*::-webkit-scrollbar': {
          width: 8,
          height: 8,
        },

        '*::-webkit-scrollbar-track': {
          background: 'transparent',
        },

        '*::-webkit-scrollbar-thumb': {
          background: 'rgba(255,255,255,0.1)',
          borderRadius: 8,
        },

        '*::-webkit-scrollbar-thumb:hover': {
          background: 'rgba(255,255,255,0.18)',
        },

        '::selection': {
          background: alpha(tokens.accent, 0.3),
        },
      },
    },

    MuiTypography: {
      styleOverrides: {
        root: {
          color: 'inherit',
        },
      },
    },

    MuiPaper: {
      defaultProps: {
        elevation: 0,
      },

      styleOverrides: {
        root: {
          color: tokens.textPrimary,
          backgroundColor: tokens.surface,
          backgroundImage: 'none',
          border: `1px solid ${tokens.border}`,
          boxShadow: '0 12px 35px rgba(0,0,0,0.16)',
        },
      },
    },

    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          minHeight: 42,
        },

        containedPrimary: {
          color: '#03110c',
          boxShadow: tokens.glow,

          '&:hover': {
            boxShadow: '0 0 34px rgba(45,212,164,0.3)',
          },

          '&.Mui-disabled': {
            color: 'rgba(3,17,12,0.55)',
          },
        },

        outlined: {
          color: tokens.textPrimary,
          borderColor: tokens.border,

          '&:hover': {
            borderColor: tokens.accentBorder,
            backgroundColor: tokens.accentSoft,
          },
        },

        text: {
          color: tokens.textPrimary,
        },
      },
    },

    MuiIconButton: {
      styleOverrides: {
        root: {
          color: tokens.textSecondary,
        },
      },
    },

    MuiListItemText: {
      styleOverrides: {
        primary: {
          color: 'inherit',
        },

        secondary: {
          color: tokens.textSecondary,
        },
      },
    },

    MuiListItemButton: {
      styleOverrides: {
        root: {
          color: tokens.textPrimary,
        },
      },
    },

    MuiChip: {
      styleOverrides: {
        root: {
          color: tokens.textPrimary,
          backgroundColor: tokens.surfaceRaised,
          border: `1px solid ${tokens.border}`,
        },

        label: {
          color: 'inherit',
        },
      },
    },

    MuiDrawer: {
      styleOverrides: {
        paper: {
          color: tokens.textPrimary,
          backgroundColor: tokens.sidebar,
          backgroundImage: 'none',
          borderColor: tokens.border,
        },
      },
    },

    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          color: tokens.textPrimary,
          backgroundColor: tokens.surface,

          '& fieldset': {
            borderColor: tokens.border,
          },

          '&:hover fieldset': {
            borderColor: tokens.borderStrong,
          },

          '&.Mui-focused fieldset': {
            borderColor: tokens.accentBorder,
          },

          '& input::placeholder': {
            color: tokens.textSecondary,
            opacity: 1,
          },
        },
      },
    },

    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: tokens.textSecondary,

          '&.Mui-focused': {
            color: tokens.accent,
          },
        },
      },
    },

    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          color: tokens.textPrimary,
          backgroundColor: '#141a1d',
          border: `1px solid ${tokens.border}`,
        },
      },
    },
  },
});

export default theme;