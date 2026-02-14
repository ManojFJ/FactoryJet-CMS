'use client';

import { useState, useEffect } from 'react';
import { 
  Check, 
  X, 
  AlertTriangle, 
  Clock, 
  GitPullRequest, 
  GitMerge, 
  ExternalLink, 
  Loader2,
  RefreshCw,
  XCircle
} from 'lucide-react';
import { DiffViewer } from './DiffViewer';

// TYPES

interface PRDetailsProps {
  prId: string;
  projectId: string;
}

interface CheckRun {
  name: string;
  status: string;
  conclusion: string | null;
  url: string;
  startedAt?: string;
  completedAt?: string;
}

interface Review {
  id: number;
  user: string;
  state: string;
  body: string;
  submittedAt: string;
}

interface RiskFlag {
  id: string;
  level: 'low' | 'medium' | 'high';
  message: string;
  file_path?: string;
}

interface FileChange {
  path: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
  blobUrl?: string;
  rawUrl?: string;
  previousFilename?: string;
}

interface PRStatus {
  id: string;
  number: number;
  title: string;
  status: string;
  url: string;
  state: string;
  mergeable: boolean;
  mergeableState: string;
  draft: boolean;
  checks: {
    total: number;
    passed: number;
    failed: number;
    pending: number;
    runs: CheckRun[];
  };
  reviews: Review[];
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  mergedAt?: string;
}

interface PRDiff {
  files: FileChange[];
  riskFlags: RiskFlag[];
  stats: {
    totalFiles: number;
    totalAdditions: number;
    totalDeletions: number;
    totalChanges: number;
  };
}

// COMPONENT

export function PRDetails({ prId, projectId }: PRDetailsProps) {
  const [prStatus, setPrStatus] = useState<PRStatus | null>(null);
  const [prDiff, setPrDiff] = useState<PRDiff | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [merging, setMerging] = useState(false);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    fetchPRData();
    
    // Poll for updates every 10 seconds
    const interval = setInterval(() => {
      fetchPRData();
    }, 10000);
    
    return () => clearInterval(interval);
  }, [prId]);

  const fetchPRData = async () => {
    try {
      const [statusRes, diffRes] = await Promise.all([
        fetch(`/api/pull-requests/${prId}/status`),
        fetch(`/api/pull-requests/${prId}/diff`),
      ]);

      if (!statusRes.ok || !diffRes.ok) {
        throw new Error('Failed to fetch PR data');
      }

      const status = await statusRes.json();
      const diff = await diffRes.json();

      setPrStatus(status);
      setPrDiff(diff);
      setLastRefresh(new Date());
      setLoading(false);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleManualRefresh = () => {
    setLoading(true);
    fetchPRData();
  };

  const handleMerge = async () => {
    if (!confirm('Are you sure you want to merge this PR? This action cannot be undone.')) {
      return;
    }

    setMerging(true);
    try {
      const res = await fetch(`/api/pull-requests/${prId}/merge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mergeMethod: 'squash' }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to merge PR');
      }

      const result = await res.json();
      alert('✅ PR merged successfully!');
      fetchPRData();
    } catch (err: any) {
      alert(`❌ Merge failed: ${err.message}`);
    } finally {
      setMerging(false);
    }
  };

  const handleClose = async () => {
    if (!confirm('Are you sure you want to close this PR without merging?')) {
      return;
    }

    setClosing(true);
    try {
      const res = await fetch(`/api/pull-requests/${prId}/close`, {
        method: 'POST',
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to close PR');
      }

      alert('✅ PR closed successfully');
      fetchPRData();
    } catch (err: any) {
      alert(`❌ Close failed: ${err.message}`);
    } finally {
      setClosing(false);
    }
  };

  // HELPER FUNCTIONS

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'medium':
        return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      default:
        return 'text-green-500 bg-green-500/10 border-green-500/20';
    }
  };

  const getCheckIcon = (conclusion: string | null, status: string) => {
    if (status === 'in_progress' || status === 'queued') {
      return <Clock className="h-4 w-4 text-yellow-500 animate-spin" />;
    }
    
    switch (conclusion) {
      case 'success':
        return <Check className="h-4 w-4 text-green-500" />;
      case 'failure':
        return <X className="h-4 w-4 text-red-500" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-green-500/10 text-green-500';
      case 'merged':
        return 'bg-purple-500/10 text-purple-500';
      case 'closed':
        return 'bg-red-500/10 text-red-500';
      default:
        return 'bg-gray-500/10 text-gray-500';
    }
  };

  const getFileStatusColor = (status: string) => {
    switch (status) {
      case 'added':
        return 'bg-green-500/20 text-green-400';
      case 'modified':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'removed':
        return 'bg-red-500/20 text-red-400';
      case 'renamed':
        return 'bg-blue-500/20 text-blue-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const canMerge =
    prStatus?.status === 'open' &&
    prStatus?.mergeable &&
    prStatus?.checks.failed === 0 &&
    !prStatus?.draft;

  // RENDER

  if (loading && !prStatus) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-zinc-400">Loading pull request...</p>
        </div>
      </div>
    );
  }

  if (error && !prStatus) {
    return (
      <div className="p-8 text-center">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">
          Error Loading PR
        </h3>
        <p className="text-red-400 mb-4">{error}</p>
        <button
          onClick={handleManualRefresh}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!prStatus || !prDiff) return null;

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-4 flex-1">
            <GitPullRequest className="h-8 w-8 text-blue-500 mt-1 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-semibold text-white mb-2 break-words">
                {prStatus.title}
              </h2>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(prStatus.status)}`}>
                  {prStatus.status}
                </span>
                <span className="text-zinc-400 text-sm">
                  #{prStatus.number}
                </span>
                {prStatus.draft && (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-500/10 text-gray-400">
                    Draft
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleManualRefresh}
              disabled={loading}
              className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-lg transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <a
              href={prStatus.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
            >
              View on GitHub
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>

        {/* Timestamps */}
        <div className="text-sm text-zinc-500 space-y-1">
          <div>Created: {new Date(prStatus.createdAt).toLocaleString()}</div>
          <div>Updated: {new Date(prStatus.updatedAt).toLocaleString()}</div>
          {prStatus.mergedAt && (
            <div className="text-purple-400">
              Merged: {new Date(prStatus.mergedAt).toLocaleString()}
            </div>
          )}
          {prStatus.closedAt && !prStatus.mergedAt && (
            <div className="text-red-400">
              Closed: {new Date(prStatus.closedAt).toLocaleString()}
            </div>
          )}
          <div className="text-zinc-600">
            Last refreshed: {lastRefresh.toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Status Checks */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          Status Checks ({prStatus.checks.total})
        </h3>
        
        {prStatus.checks.total > 0 ? (
          <>
            <div className="space-y-3 mb-4">
              {prStatus.checks.runs.map((check, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {getCheckIcon(check.conclusion, check.status)}
                    <div>
                      <span className="text-white">{check.name}</span>
                      <div className="text-xs text-zinc-500">
                        {check.status === 'completed' && check.conclusion
                          ? check.conclusion
                          : check.status}
                      </div>
                    </div>
                  </div>
                  {check.url && (
                    <a
                      href={check.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 text-sm"
                    >
                      Details →
                    </a>
                  )}
                </div>
              ))}
            </div>

            {/* Checks Summary */}
            <div className="flex items-center gap-4 text-sm pt-3 border-t border-zinc-800">
              {prStatus.checks.passed > 0 && (
                <span className="text-green-500 flex items-center gap-1">
                  <Check className="h-4 w-4" />
                  {prStatus.checks.passed} passed
                </span>
              )}
              {prStatus.checks.failed > 0 && (
                <span className="text-red-500 flex items-center gap-1">
                  <X className="h-4 w-4" />
                  {prStatus.checks.failed} failed
                </span>
              )}
              {prStatus.checks.pending > 0 && (
                <span className="text-yellow-500 flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {prStatus.checks.pending} pending
                </span>
              )}
            </div>
          </>
        ) : (
          <p className="text-zinc-400 text-sm">No checks configured for this repository</p>
        )}
      </div>

      {/* Risk Flags */}
      {prDiff.riskFlags && prDiff.riskFlags.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Risk Flags ({prDiff.riskFlags.length})
          </h3>
          <div className="space-y-2">
            {prDiff.riskFlags.map((flag, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg border ${getRiskColor(flag.level)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium uppercase text-xs">
                        {flag.level} RISK
                      </span>
                    </div>
                    <p className="text-sm">{flag.message}</p>
                    {flag.file_path && (
                      <code className="text-xs mt-1 block opacity-70">
                        📄 {flag.file_path}
                      </code>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* File Changes */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          Changed Files ({prDiff.files.length})
        </h3>

        {/* Stats */}
        <div className="flex items-center gap-4 mb-4 text-sm pb-4 border-b border-zinc-800">
          <span className="text-green-500 flex items-center gap-1">
            <span className="font-mono">+{prDiff.stats.totalAdditions}</span>
            additions
          </span>
          <span className="text-red-500 flex items-center gap-1">
            <span className="font-mono">-{prDiff.stats.totalDeletions}</span>
            deletions
          </span>
          <span className="text-zinc-400">
            {prDiff.stats.totalChanges} changes
          </span>
        </div>

        {/* File List */}
        <div className="space-y-2">
          {prDiff.files.map((file, idx) => (
            <div key={idx} className="border border-zinc-800 rounded-lg overflow-hidden">
              <div
                className={`p-3 cursor-pointer transition-colors ${
                  selectedFile === file.path
                    ? 'bg-blue-500/10 border-blue-500/30'
                    : 'bg-zinc-800/50 hover:bg-zinc-800'
                }`}
                onClick={() =>
                  setSelectedFile(
                    selectedFile === file.path ? null : file.path
                  )
                }
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 ${getFileStatusColor(file.status)}`}>
                      {file.status}
                    </span>
                    <code className="text-white text-sm truncate">
                      {file.path}
                    </code>
                    {file.previousFilename && (
                      <span className="text-xs text-zinc-500">
                        ← {file.previousFilename}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-green-400 font-mono">
                        +{file.additions}
                      </span>
                      <span className="text-red-400 font-mono">
                        -{file.deletions}
                      </span>
                    </div>
                    <div className="text-zinc-600">
                      {selectedFile === file.path ? '▼' : '▶'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Diff Viewer (expanded) */}
              {selectedFile === file.path && file.patch && (
                <div className="border-t border-zinc-800">
                  <DiffViewer patch={file.patch} fileName={file.path} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Reviews */}
      {prStatus.reviews && prStatus.reviews.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Reviews ({prStatus.reviews.length})
          </h3>
          <div className="space-y-3">
            {prStatus.reviews.map((review) => (
              <div key={review.id} className="p-4 bg-zinc-800/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">
                      {review.user}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        review.state === 'APPROVED'
                          ? 'bg-green-500/20 text-green-400'
                          : review.state === 'CHANGES_REQUESTED'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-gray-500/20 text-gray-400'
                      }`}
                    >
                      {review.state}
                    </span>
                  </div>
                  <span className="text-xs text-zinc-500">
                    {new Date(review.submittedAt).toLocaleString()}
                  </span>
                </div>
                {review.body && (
                  <p className="text-sm text-zinc-300 whitespace-pre-wrap">
                    {review.body}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {prStatus.status === 'open' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-1">
                Merge Pull Request
              </h3>
              {!canMerge && (
                <div className="space-y-1">
                  {prStatus.draft && (
                    <p className="text-yellow-500 text-sm">
                      ⚠️ This is a draft PR
                    </p>
                  )}
                  {prStatus.checks.failed > 0 && (
                    <p className="text-red-500 text-sm">
                      ❌ Some checks are failing
                    </p>
                  )}
                  {!prStatus.mergeable && (
                    <p className="text-red-500 text-sm">
                      ⚠️ This PR has merge conflicts
                    </p>
                  )}
                  {canMerge === false && prStatus.checks.pending > 0 && (
                    <p className="text-yellow-500 text-sm">
                      ⏳ Waiting for checks to complete
                    </p>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={handleClose}
                disabled={closing}
                className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-800 disabled:opacity-50 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                {closing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Closing...
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4" />
                    Close PR
                  </>
                )}
              </button>

              <button
                onClick={handleMerge}
                disabled={!canMerge || merging}
                className={`px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors ${
                  canMerge && !merging
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
                }`}
              >
                {merging ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Merging...
                  </>
                ) : (
                  <>
                    <GitMerge className="h-4 w-4" />
                    Squash and Merge
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
