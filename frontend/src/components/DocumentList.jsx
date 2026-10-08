import {
  Box,
  CircularProgress,
  IconButton,
  Paper,
  Tooltip,
  Typography,
} from '@mui/material';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import DeleteIcon from '@mui/icons-material/Delete';
import { formatDate } from '../utils/format';
import { tokens } from '../theme/theme';

function formatCount(value, singular, plural) {
  return `${value} ${value === 1 ? singular : plural}`;
}

export default function DocumentList({
  documents = [],
  onDelete,
  deletingDocumentId = null,
  showDeleteAction = true,
  singleColumn = false,
}) {
  if (!documents.length) {
    return (
      <Paper
        sx={{
          p: 3,
          textAlign: 'center',
          backgroundColor: tokens.surface,
          boxShadow: 'none',
        }}
      >
        <Typography
          variant="body2"
          color="text.secondary"
        >
          No documents uploaded to this session yet.
        </Typography>
      </Paper>
    );
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gap: 1.5,
        gridTemplateColumns: singleColumn
          ? 'minmax(0, 1fr)'
          : {
              xs: '1fr',
              lg: 'repeat(2, minmax(0, 1fr))',
            },
      }}
    >
      {documents.map((document) => {
        const deleting =
          deletingDocumentId === document.id;

        const metadata = [
          document.page_count != null &&
            formatCount(
              document.page_count,
              'page',
              'pages'
            ),
          document.chunk_count != null &&
            formatCount(
              document.chunk_count,
              'chunk',
              'chunks'
            ),
          document.upload_date &&
            formatDate(document.upload_date),
        ]
          .filter(Boolean)
          .join(' · ');

        return (
          <Paper
            key={document.id}
            sx={{
              p: 2,
              minHeight: 76,
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              backgroundColor: tokens.surface,
              opacity: deleting ? 0.7 : 1,
              transition:
                'border-color 0.2s ease, background-color 0.2s ease, transform 0.2s ease, opacity 0.2s ease',

              '&:hover': {
                borderColor: tokens.borderStrong,
                backgroundColor: tokens.surfaceRaised,
                transform: deleting
                  ? 'none'
                  : 'translateY(-1px)',
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
                borderRadius: '11px',
                color: tokens.accent,
                backgroundColor: tokens.accentSoft,
                border: `1px solid ${tokens.accentBorder}`,

                '& svg': {
                  fontSize: 21,
                },
              }}
            >
              <PictureAsPdfOutlinedIcon />
            </Box>

            <Box
              sx={{
                flex: 1,
                minWidth: 0,
              }}
            >
              <Tooltip
                title={document.filename}
                placement="top-start"
              >
                <Typography
                  noWrap
                  sx={{
                    color: 'text.primary',
                    fontSize: 14.5,
                    fontWeight: 600,
                    lineHeight: 1.4,
                  }}
                >
                  {document.filename}
                </Typography>
              </Tooltip>

              {metadata && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    display: 'block',
                    mt: 0.35,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontFamily:
                      '"JetBrains Mono Variable", monospace',
                  }}
                >
                  {metadata}
                </Typography>
              )}
            </Box>

            {showDeleteAction && (
              <Tooltip
                title={
                  deleting
                    ? 'Removing document'
                    : 'Remove document'
                }
              >
                <span>
                  <IconButton
                    size="small"
                    disabled={deleting}
                    onClick={() =>
                      onDelete?.(document.id)
                    }
                    aria-label={`Delete ${document.filename}`}
                    sx={{
                      flexShrink: 0,
                      color: 'text.secondary',

                      '&:hover': {
                        color: 'error.light',
                        backgroundColor:
                          'rgba(244, 67, 54, 0.08)',
                      },
                    }}
                  >
                    {deleting ? (
                      <CircularProgress
                        size={18}
                        color="inherit"
                      />
                    ) : (
                      <DeleteIcon fontSize="small" />
                    )}
                  </IconButton>
                </span>
              </Tooltip>
            )}
          </Paper>
        );
      })}
    </Box>
  );
}