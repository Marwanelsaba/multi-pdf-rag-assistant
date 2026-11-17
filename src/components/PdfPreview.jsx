import { useEffect, useRef, useState } from 'react';
import { Box, CircularProgress, IconButton, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import RemoveIcon from '@mui/icons-material/Remove';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs';
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';

GlobalWorkerOptions.workerSrc = workerUrl;

const controlGroup = {
  display: 'inline-grid',
  gridTemplateColumns: '36px auto 36px',
  alignItems: 'center',
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 1.5,
  bgcolor: 'background.paper',
};

const controlButton = {
  width: 36,
  height: 36,
  p: 0,
  borderRadius: 1,
};

const controlValue = {
  display: 'block',
  px: 0.75,
  textAlign: 'center',
  whiteSpace: 'nowrap',
  fontVariantNumeric: 'tabular-nums',
  lineHeight: 1,
};

export default function PdfPreview({ url, initialPage, filename, onUnavailable }) {
  const [pdf, setPdf] = useState(null);
  const [page, setPage] = useState(initialPage);
  const [zoom, setZoom] = useState(100);
  const [width, setWidth] = useState(0);
  const [rendering, setRendering] = useState(true);
  const viewportRef = useRef(null);
  const previewRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    const task = getDocument({
      url,
      enableXfa: false,
      isEvalSupported: false,
      cMapUrl: '/pdfjs/cmaps/',
      cMapPacked: true,
      standardFontDataUrl: '/pdfjs/standard_fonts/',
      wasmUrl: '/pdfjs/wasm/',
      iccUrl: '/pdfjs/iccs/',
    });
    task.promise.then((document) => {
      if (!mounted) return;
      setPage(Math.min(initialPage, document.numPages));
      setPdf(document);
    }).catch((issue) => {
      if (!mounted) return;
      console.warn('PDF preview failed to load.', issue);
      onUnavailable(true);
    });
    return () => {
      mounted = false;
      task.destroy().catch(() => {});
    };
  }, [url, initialPage, onUnavailable]);

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(viewportRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!pdf || !width) return;
    let mounted = true;
    let task;
    setRendering(true);
    pdf.getPage(page).then((pdfPage) => {
      if (!mounted) return;
      const original = pdfPage.getViewport({ scale: 1 });
      const scale = Math.min(1200, width) * zoom / 100 / original.width;
      const display = pdfPage.getViewport({ scale });
      const ratio = Math.min(window.devicePixelRatio || 1, 2, 4096 / Math.max(display.width, display.height));
      const viewport = pdfPage.getViewport({ scale: scale * ratio });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      canvas.style.width = `${display.width}px`;
      canvas.setAttribute('role', 'img');
      canvas.setAttribute('aria-label', `Page ${page} of ${filename}`);
      task = pdfPage.render({ canvas, viewport });
      return task.promise.then(() => {
        if (!mounted) return;
        previewRef.current.replaceChildren(canvas);
        setRendering(false);
      });
    }).catch((issue) => {
      if (!mounted) return;
      console.warn('PDF page failed to render.', issue);
      onUnavailable(true);
    });
    return () => {
      mounted = false;
      task?.cancel();
    };
  }, [pdf, page, width, zoom, filename, onUnavailable]);

  return (
    <Stack sx={{ minHeight: 0, flex: 1 }}>
      {pdf && (
        <Box
          role="toolbar"
          aria-label="PDF viewer controls"
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'center',
            gap: { xs: 1, sm: 1.5 },
            px: 1,
            py: 1,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box role="group" aria-label="Page navigation" sx={controlGroup}>
            <IconButton
              aria-label="Previous page"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              sx={controlButton}
            >
              <ChevronLeftIcon fontSize="small" />
            </IconButton>
            <Typography
              component="span"
              variant="body2"
              role="status"
              aria-label={`Page ${page} of ${pdf.numPages}`}
              sx={{ ...controlValue, minWidth: 60 }}
            >
              {page} / {pdf.numPages}
            </Typography>
            <IconButton
              aria-label="Next page"
              disabled={page >= pdf.numPages}
              onClick={() => setPage(page + 1)}
              sx={controlButton}
            >
              <ChevronRightIcon fontSize="small" />
            </IconButton>
          </Box>
          <Box role="group" aria-label="Zoom" sx={controlGroup}>
            <IconButton aria-label="Zoom out" disabled={zoom <= 50} onClick={() => setZoom(zoom - 25)} sx={controlButton}>
              <RemoveIcon fontSize="small" />
            </IconButton>
            <Typography component="span" variant="body2" aria-live="polite" sx={{ ...controlValue, minWidth: 48 }}>
              {zoom}%
            </Typography>
            <IconButton aria-label="Zoom in" disabled={zoom >= 200} onClick={() => setZoom(zoom + 25)} sx={controlButton}>
              <AddIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      )}
      {rendering && (
        <Box sx={{ p: 2, textAlign: 'center' }}><CircularProgress size={24} aria-label="Rendering PDF page" /></Box>
      )}
      <Box sx={{ overflow: 'auto', minHeight: 0, flex: 1, p: 1 }}>
        <Box ref={viewportRef}>
          <Box ref={previewRef} sx={{ visibility: rendering ? 'hidden' : 'visible', '& canvas': { display: 'block', mx: 'auto' } }} />
        </Box>
      </Box>
    </Stack>
  );
}
