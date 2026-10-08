import { useRef, useState } from 'react';
import {
  Box,
  LinearProgress,
  Typography,
} from '@mui/material';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import { uploadPdf } from '../services/api';
import { tokens } from '../theme/theme';

export default function PdfUploader({
  sessionId,
  onUploadComplete,
}) {
  const inputRef = useRef(null);

  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleFiles = async (fileList) => {
    if (uploading) {
      return;
    }

    if (sessionId == null || String(sessionId).trim() === '') {
      setSuccessMessage('');
      setError('Open or create a chat session before uploading PDFs.');
      return;
    }

    const allFiles = Array.from(fileList || []);

    const pdfFiles = allFiles.filter(
      (file) =>
        file.type === 'application/pdf' ||
        file.name.toLowerCase().endsWith('.pdf')
    );

    if (!pdfFiles.length) {
      setSuccessMessage('');
      setError('Only PDF files are supported.');
      return;
    }

    setUploading(true);
    setError('');
    setSuccessMessage('');

    const successfulUploads = [];
    const failedUploads = [];

    try {
      for (const file of pdfFiles) {
        try {
          const result = await uploadPdf(sessionId, file);

          successfulUploads.push({
            file,
            result,
          });
        } catch (uploadError) {
          failedUploads.push({
            file,
            message:
              uploadError.message ||
              'The upload failed.',
          });
        }
      }

      if (successfulUploads.length === 1) {
        setSuccessMessage(
          `${successfulUploads[0].file.name} was uploaded and indexed successfully.`
        );
      } else if (successfulUploads.length > 1) {
        setSuccessMessage(
          `${successfulUploads.length} PDFs were uploaded and indexed successfully.`
        );
      }

      const skippedFiles = allFiles.length - pdfFiles.length;

      if (failedUploads.length > 0) {
        const failedNames = failedUploads
          .map(({ file }) => file.name)
          .join(', ');

        setError(`Upload failed for: ${failedNames}`);
      } else if (skippedFiles > 0) {
        setError(
          `${skippedFiles} non-PDF ${
            skippedFiles === 1 ? 'file was' : 'files were'
          } skipped.`
        );
      }

      if (successfulUploads.length > 0) {
        onUploadComplete?.(
          successfulUploads.map(({ result }) => result)
        );
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragging(false);

    if (!uploading) {
      handleFiles(event.dataTransfer.files);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();

    if (!uploading) {
      setDragging(true);
    }
  };

  const handleKeyDown = (event) => {
    if (
      (event.key === 'Enter' || event.key === ' ') &&
      !uploading
    ) {
      event.preventDefault();
      inputRef.current?.click();
    }
  };

  return (
    <Box>
      <Box
        role="button"
        tabIndex={uploading ? -1 : 0}
        aria-label="Upload PDF files"
        aria-busy={uploading}
        onClick={() => {
          if (!uploading) {
            inputRef.current?.click();
          }
        }}
        onKeyDown={handleKeyDown}
        onDragOver={handleDragOver}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        sx={{
          p: {
            xs: 4,
            md: 5,
          },
          textAlign: 'center',
          cursor: uploading ? 'progress' : 'pointer',
          borderRadius: 4,
          border: `1.5px dashed ${
            dragging ? tokens.accent : tokens.borderStrong
          }`,
          backgroundColor: dragging
            ? tokens.accentSoft
            : tokens.surface,
          boxShadow: dragging ? tokens.glow : 'none',
          backdropFilter: 'blur(14px)',
          transition: 'all 0.2s ease',
          outline: 'none',

          '&:hover, &:focus-visible': {
            borderColor: tokens.accentBorder,
            backgroundColor: dragging
              ? tokens.accentSoft
              : tokens.surfaceRaised,
          },
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          hidden
          disabled={uploading}
          onChange={(event) => {
            handleFiles(event.target.files);

            // Allow selecting the same file again later.
            event.target.value = '';
          }}
        />

        <Box
          sx={{
            width: 52,
            height: 52,
            mx: 'auto',
            mb: 2,
            display: 'grid',
            placeItems: 'center',
            borderRadius: '16px',
            color: tokens.accent,
            backgroundColor: tokens.accentSoft,
            border: `1px solid ${tokens.accentBorder}`,
            boxShadow: tokens.glow,
          }}
        >
          <CloudUploadOutlinedIcon />
        </Box>

        <Typography variant="h6">
          {uploading
            ? 'Indexing your documents…'
            : 'Drop PDFs here'}
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mt: 0.5,
          }}
        >
          {uploading
            ? 'Extracting, chunking and embedding'
            : 'or click to browse · multiple files supported'}
        </Typography>

        {uploading && (
          <LinearProgress
            sx={{
              mt: 3,
              mx: 'auto',
              maxWidth: 320,
              height: 4,
              borderRadius: 2,
              backgroundColor: tokens.border,
            }}
          />
        )}
      </Box>

      {successMessage && (
        <Typography
          variant="caption"
          color="success.main"
          role="status"
          sx={{
            display: 'block',
            mt: 1,
            px: 1,
            lineHeight: 1.5,
          }}
        >
          {successMessage}
        </Typography>
      )}

      {error && (
        <Typography
          variant="caption"
          color="error.light"
          role="alert"
          sx={{
            display: 'block',
            mt: 1,
            px: 1,
            lineHeight: 1.5,
          }}
        >
          {error}
        </Typography>
      )}
    </Box>
  );
}