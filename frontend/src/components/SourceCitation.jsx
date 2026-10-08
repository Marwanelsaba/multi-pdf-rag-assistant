import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Drawer,
  IconButton,
  Typography,
} from '@mui/material';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import CloseIcon from '@mui/icons-material/Close';
import { tokens } from '../theme/theme';

export default function SourceCitation({ source, sessionId }) {
  const [open, setOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [previewError, setPreviewError] = useState(false);

  const filename = source?.file || 'Unknown document';
  const documentId = source?.document_id;

  const page =
    source?.page != null
      ? Number(source.page)
      : null;

  const pdfUrl = useMemo(() => {
    const hasValidSessionId =
      sessionId != null &&
      String(sessionId).trim() !== '';

    if (documentId == null || !hasValidSessionId) {
      return '';
    }

    const query = new URLSearchParams({
      session_id: String(sessionId),
    });

    const pageFragment =
      Number.isFinite(page) && page > 0
        ? `#page=${page}`
        : '';

    return (
      `/api/documents/${encodeURIComponent(documentId)}` +
      `/file?${query.toString()}${pageFragment}`
    );
  }, [documentId, page, sessionId]);

  if (!source) {
    return null;
  }

  const handleOpen = () => {
    setPreviewLoading(true);
    setPreviewError(false);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handlePreviewLoad = () => {
    setPreviewLoading(false);
  };

  const handlePreviewError = () => {
    setPreviewLoading(false);
    setPreviewError(true);
  };

  return (
    <>
      <Chip
        size="small"
        clickable
        icon={<DescriptionOutlinedIcon />}
        label={`${filename} · Page ${page ?? 'Unknown'}`}
        onClick={handleOpen}
        aria-label={`Open source ${filename}, page ${
          page ?? 'unknown'
        }`}
        sx={{
          color: 'text.secondary',
          backgroundColor: tokens.surface,
          borderColor: tokens.border,
          cursor: 'pointer',
          transition:
            'color 0.2s ease, border-color 0.2s ease, background-color 0.2s ease',

          '& .MuiChip-icon': {
            color: tokens.accent,
          },

          '&:hover': {
            color: 'text.primary',
            backgroundColor: tokens.surfaceRaised,
            borderColor: tokens.accentBorder,
          },

          '&:focus-visible': {
            outline: `2px solid ${tokens.accent}`,
            outlineOffset: 2,
          },
        }}
      />

      <Drawer
        anchor="right"
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: {
              xs: '100%',
              sm: 650,
              md: 820,
              lg: 900,
            },
            maxWidth: '100%',
            display: 'flex',
            flexDirection: 'column',
            color: 'text.primary',
            backgroundColor: tokens.sidebar,
            backgroundImage: 'none',
            borderLeft: `1px solid ${tokens.border}`,
          },
        }}
      >
        {/* Drawer header */}
        <Box
          component="header"
          sx={{
            px: 2.5,
            py: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            flexShrink: 0,
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="overline"
              color="primary.main"
            >
              Citation
            </Typography>

            <Typography variant="h6">
              Source
            </Typography>
          </Box>

          <IconButton
            onClick={handleClose}
            aria-label="Close source panel"
          >
            <CloseIcon />
          </IconButton>
        </Box>

        <Divider />

        {/* Source information */}
        <Box
          sx={{
            px: 2.5,
            py: 2,
            display: 'flex',
            alignItems: {
              xs: 'flex-start',
              sm: 'center',
            },
            justifyContent: 'space-between',
            flexDirection: {
              xs: 'column',
              sm: 'row',
            },
            gap: 2,
            flexShrink: 0,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              minWidth: 0,
            }}
          >
            <Box
              sx={{
                width: 44,
                height: 44,
                flexShrink: 0,
                display: 'grid',
                placeItems: 'center',
                borderRadius: '13px',
                color: tokens.accent,
                backgroundColor: tokens.accentSoft,
                border: `1px solid ${tokens.accentBorder}`,
              }}
            >
              <DescriptionOutlinedIcon />
            </Box>

            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 600,
                  overflowWrap: 'anywhere',
                }}
              >
                {filename}
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.25 }}
              >
                Cited page: {page ?? 'Unknown'}
              </Typography>
            </Box>
          </Box>

          {pdfUrl && (
            <Button
              component="a"
              href={pdfUrl}
              target="_blank"
              rel="noreferrer"
              variant="outlined"
              startIcon={<DescriptionOutlinedIcon />}
              sx={{
                flexShrink: 0,
                borderColor: tokens.accentBorder,
                color: tokens.textPrimary,

                '&:hover': {
                  borderColor: tokens.accent,
                  backgroundColor: tokens.accentSoft,
                },
              }}
            >
              Open PDF
            </Button>
          )}
        </Box>

        <Divider />

        {/* PDF preview */}
        <Box
          sx={{
            position: 'relative',
            flex: 1,
            minHeight: {
              xs: 500,
              sm: 0,
            },
            display: 'flex',
            overflow: 'hidden',
            p: {
              xs: 0.75,
              sm: 1,
            },
          }}
        >
          {!pdfUrl ? (
            <Box sx={{ width: '100%' }}>
              <Alert severity="warning">
                This citation does not contain the document information
                needed to open the PDF preview. Older stored citations may
                not contain a document ID.
              </Alert>
            </Box>
          ) : previewError ? (
            <Box sx={{ width: '100%' }}>
              <Alert
                severity="error"
                sx={{ mb: 2 }}
              >
                The embedded PDF preview could not be loaded. You can still
                try opening the document in a new browser tab.
              </Alert>

              <Button
                component="a"
                href={pdfUrl}
                target="_blank"
                rel="noreferrer"
                variant="outlined"
                startIcon={<DescriptionOutlinedIcon />}
              >
                Open PDF
              </Button>
            </Box>
          ) : (
            <>
              {previewLoading && (
                <Box
                  sx={{
                    position: 'absolute',
                    inset: {
                      xs: 6,
                      sm: 8,
                    },
                    zIndex: 1,
                    display: 'grid',
                    placeItems: 'center',
                    backgroundColor: tokens.surface,
                    borderRadius: 2,
                    border: `1px solid ${tokens.border}`,
                  }}
                >
                  <Box sx={{ textAlign: 'center' }}>
                    <CircularProgress size={30} />

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 1.5 }}
                    >
                      Loading PDF preview...
                    </Typography>
                  </Box>
                </Box>
              )}

              <Box
                component="iframe"
                src={pdfUrl}
                title={`PDF preview of ${filename}, page ${
                  page ?? 'unknown'
                }`}
                onLoad={handlePreviewLoad}
                onError={handlePreviewError}
                sx={{
                  width: '100%',
                  height: '100%',
                  minHeight: 500,
                  border: 'none',
                  borderRadius: 2,
                  backgroundColor: '#ffffff',
                }}
              />
            </>
          )}
        </Box>
      </Drawer>
    </>
  );
}