import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Paper,
  Typography,
} from '@mui/material';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined';
import StatCard from '../components/StatCard';
import DocumentList from '../components/DocumentList';
import {
  deleteDocument,
  getDocuments,
  getSessions,
} from '../services/api';
import { tokens } from '../theme/theme';

function SectionHeading({ title, count }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        mb: 2,
      }}
    >
      <Typography variant="h6">{title}</Typography>

      {count != null && (
        <Box
          component="span"
          sx={{
            minWidth: 24,
            height: 24,
            px: 0.75,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '999px',
            color: 'text.secondary',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid',
            borderColor: 'divider',
            fontSize: 12,
            fontWeight: 600,
            lineHeight: 1,
          }}
        >
          {count}
        </Box>
      )}
    </Box>
  );
}

export default function Dashboard() {
  const [documents, setDocuments] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingDocumentId, setDeletingDocumentId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadDashboardData() {
      setLoading(true);
      setError('');

      try {
        const [documentData, sessionData] = await Promise.all([
          getDocuments(),
          getSessions(),
        ]);

        if (!cancelled) {
          setDocuments(documentData);
          setSessions(sessionData);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError.message ||
              'Unable to load dashboard data. Please try again.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadDashboardData();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleDelete = async (documentId) => {
    setDeletingDocumentId(documentId);
    setError('');

    try {
      await deleteDocument(documentId);

      setDocuments((previousDocuments) =>
        previousDocuments.filter(
          (document) => document.id !== documentId
        )
      );
    } catch (requestError) {
      setError(
        requestError.message ||
          'Unable to delete the document. Please try again.'
      );
    } finally {
      setDeletingDocumentId(null);
    }
  };

  const totalPages = documents.reduce(
    (sum, document) => sum + (document.page_count || 0),
    0
  );

  return (
    <Box
      sx={{
        width: '100%',
        minWidth: 0,
        px: {
          xs: 2.5,
          sm: 4,
          lg: 5,
        },
        py: {
          xs: 3.5,
          md: 5,
        },
      }}
    >
      {/* Welcome */}
      <Box
        component="section"
        sx={{
          mb: {
            xs: 4,
            md: 4.5,
          },
        }}
      >
        <Typography variant="overline" color="primary.main">
          Workspace
        </Typography>

        <Typography
          variant="h4"
          component="h1"
          sx={{
            mt: 0.75,
            maxWidth: 720,
          }}
        >
          Ask your documents anything
        </Typography>

        <Typography
          color="text.secondary"
          sx={{
            mt: 1.25,
            maxWidth: 600,
            lineHeight: 1.7,
          }}
        >
          Create or open a chat session, upload PDFs, and ask questions
          grounded in your documents with file and page citations.
        </Typography>
      </Box>

      {error && (
        <Alert
          severity="error"
          sx={{
            mb: 3,
          }}
        >
          {error}
        </Alert>
      )}

      {/* Statistics */}
      <Box
        component="section"
        aria-label="Workspace statistics"
        sx={{
          display: 'grid',
          gap: 2,
          mb: 4.5,
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(3, minmax(0, 1fr))',
          },
        }}
      >
        <StatCard
          icon={<DescriptionOutlinedIcon />}
          label="Indexed documents"
          value={loading ? '—' : documents.length}
        />

        <StatCard
          icon={<LayersOutlinedIcon />}
          label="Total pages"
          value={loading ? '—' : totalPages}
        />

        <StatCard
          icon={<ForumOutlinedIcon />}
          label="Chat sessions"
          value={loading ? '—' : sessions.length}
        />
      </Box>

      {/* Session guidance */}
      <Paper
        component="section"
        sx={{
          mb: 4.5,
          px: {
            xs: 2,
            sm: 2.5,
          },
          py: 2.25,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          backgroundColor: tokens.surface,
          borderColor: tokens.border,
          boxShadow: 'none',
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
          }}
        >
          <ForumOutlinedIcon fontSize="small" />
        </Box>

        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 600,
            }}
          >
            Upload documents inside a chat session
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mt: 0.25,
            }}
          >
            Create a new chat or open an existing session from the sidebar,
            then upload the PDFs you want to use in that conversation.
          </Typography>
        </Box>
      </Paper>

      {/* Documents */}
      <Box component="section">
        <SectionHeading
          title="Indexed documents"
          count={loading ? null : documents.length}
        />

        {loading ? (
          <Box
            sx={{
              minHeight: 160,
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <CircularProgress size={30} />
          </Box>
        ) : (
          <DocumentList
            documents={documents}
            onDelete={handleDelete}
            deletingDocumentId={deletingDocumentId}
          />
        )}
      </Box>
    </Box>
  );
}