import { lazy, Suspense, useState } from 'react';
import { Box, Button, Chip, CircularProgress, Divider, Drawer, IconButton, Stack, Typography } from '@mui/material';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

const PdfPreview = lazy(() => import('./PdfPreview'));

export default function SourceCitation({ source, sessionId }) {
  const [open, setOpen] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);
  if (!source) return null;

  const filename = source.file || 'Unknown document';
  const page = Math.max(1, Number(source.page) || 1);
  const query = new URLSearchParams({ session_id: sessionId });
  if (source.document_uid) query.set('document_uid', source.document_uid);
  const url = source.document_id == null || !sessionId ? ''
    : `/api/documents/${encodeURIComponent(source.document_id)}/file?${query}`;
  const compact = previewFailed || !url;
  const pageUrl = `${url}#page=${page}`;

  function showSource() {
    setPreviewFailed(false);
    setOpen(true);
  }

  return (
    <>
      <Chip
        size="small"
        clickable
        icon={<DescriptionOutlinedIcon />}
        label={`${filename} · Page ${page}`}
        onClick={showSource}
        aria-label={`Open source ${filename}, page ${page}`}
      />
      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        slotProps={{
          paper: {
            'aria-label': 'Citation source',
            sx: compact ? {
              top: 16,
              right: 16,
              bottom: 'auto',
              height: 'auto',
              width: 420,
              maxWidth: 'calc(100% - 32px)',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
            } : {
              width: { xs: '100%', md: 720 },
              maxWidth: '100%',
            },
          },
        }}
      >
        <Stack direction="row" alignItems="flex-start" gap={1} sx={{ p: 2 }}>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="body2" color="text.secondary">Cited page {page}</Typography>
            <Typography variant="subtitle1" sx={{ overflowWrap: 'anywhere', lineHeight: 1.35 }}>
              {filename}
            </Typography>
          </Box>
          {!compact && (
            <Button component="a" href={pageUrl} target="_blank" rel="noreferrer" variant="outlined">
              Open PDF
            </Button>
          )}
          <IconButton aria-label="Close source panel" size="small" onClick={() => setOpen(false)}>
            <CloseIcon />
          </IconButton>
        </Stack>
        {compact ? (
          <Stack spacing={1.5} sx={{ px: 2, pb: 2 }}>
            <Typography variant="body2" color="text.secondary" role="status">
              {url ? 'Inline preview unavailable.' : 'The PDF link is unavailable for this citation.'}
            </Typography>
            {url && (
              <Button
                component="a"
                href={pageUrl}
                target="_blank"
                rel="noreferrer"
                variant="contained"
                endIcon={<OpenInNewIcon fontSize="small" />}
                sx={{ alignSelf: 'flex-start' }}
              >
                Open page {page}
              </Button>
            )}
          </Stack>
        ) : open && (
          <>
            <Divider />
            <Suspense fallback={<CircularProgress size={24} sx={{ m: 2 }} aria-label="Loading PDF viewer" />}>
              <PdfPreview url={url} initialPage={page} filename={filename} onUnavailable={setPreviewFailed} />
            </Suspense>
          </>
        )}
      </Drawer>
    </>
  );
}
