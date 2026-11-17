import { Box, Paper, Typography } from '@mui/material';
import { tokens } from '../theme/theme';

export default function StatCard({ icon, label, value }) {
  return (
    <Paper
      sx={{
        p: 2.25,
        minHeight: 92,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        backgroundColor: tokens.surface,
        transition:
          'border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease',

        '&:hover': {
          borderColor: tokens.accentBorder,
          boxShadow: tokens.glow,
          transform: 'translateY(-1px)',
        },
      }}
    >
      <Box
        sx={{
          width: 42,
          height: 42,
          flexShrink: 0,
          display: 'grid',
          placeItems: 'center',
          borderRadius: '12px',
          color: tokens.accent,
          backgroundColor: tokens.accentSoft,
          border: `1px solid ${tokens.accentBorder}`,

          '& svg': {
            fontSize: 22,
          },
        }}
      >
        {icon}
      </Box>

      <Box sx={{ minWidth: 0 }}>
        <Typography
          variant="h5"
          sx={{
            lineHeight: 1.1,
            color: 'text.primary',
          }}
        >
          {value}
        </Typography>

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            display: 'block',
            mt: 0.5,
            lineHeight: 1.35,
          }}
        >
          {label}
        </Typography>
      </Box>
    </Paper>
  );
}