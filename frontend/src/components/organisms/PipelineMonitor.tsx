/**
 * PipelineMonitor Component (Organism)
 *
 * Real-time pipeline execution monitor with WebSocket updates.
 */

import React, { useState, useEffect } from 'react';
import { ProgressBar, Spinner, Badge } from '../atoms';
import { StageCard } from '../molecules';

export interface PipelineUpdate {
  type: string;
  execution_id: string;
  stage: string;
  status: 'running' | 'completed' | 'failed';
  progress: number;
  message: string;
  error?: string;
  timestamp: string;
}

export interface StageInfo {
  stage_name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  started_at?: string;
  completed_at?: string;
  duration_seconds?: number;
  cache_hit?: boolean;
  error_message?: string;
}

export interface PipelineMonitorProps {
  executionId: string;
  wsUrl?: string;  // Default: ws://localhost:8000/ws/pipeline/{executionId}/
  onComplete?: () => void;
  onError?: (error: string) => void;
  className?: string;
}

export const PipelineMonitor: React.FC<PipelineMonitorProps> = ({
  executionId,
  wsUrl,
  onComplete,
  onError,
  className = '',
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState('');
  const [stages, setStages] = useState<Map<string, StageInfo>>(new Map());
  const [updates, setUpdates] = useState<PipelineUpdate[]>([]);
  const [overallStatus, setOverallStatus] = useState<'running' | 'completed' | 'failed'>('running');

  // WebSocket connection
  useEffect(() => {
    const url = wsUrl || `ws://localhost:8000/ws/pipeline/${executionId}/`;
    let ws: WebSocket | null = null;

    try {
      ws = new WebSocket(url);

      ws.onopen = () => {
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const update: PipelineUpdate = JSON.parse(event.data);

          // Update progress
          setProgress(update.progress);
          setCurrentStage(update.stage);

          // Add to updates list
          setUpdates((prev) => [...prev, update]);

          // Update stage info
          setStages((prev) => {
            const newStages = new Map(prev);
            const existingStage = newStages.get(update.stage) || {
              stage_name: update.stage,
              status: 'pending',
            };

            newStages.set(update.stage, {
              ...existingStage,
              status: update.status,
              started_at: existingStage.started_at || update.timestamp,
              completed_at: update.status === 'completed' || update.status === 'failed'
                ? update.timestamp
                : existingStage.completed_at,
              error_message: update.error,
            });

            return newStages;
          });

          // Check if pipeline completed
          if (update.progress === 100) {
            setOverallStatus('completed');
            if (onComplete) {
              onComplete();
            }
          }

          // Check if stage failed
          if (update.status === 'failed') {
            setOverallStatus('failed');
            if (onError && update.error) {
              onError(update.error);
            }
          }
        } catch (error) {
        }
      };

      ws.onerror = (error) => {
        setIsConnected(false);
      };

      ws.onclose = () => {
        setIsConnected(false);
      };
    } catch (error) {
    }

    // Cleanup on unmount
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [executionId, wsUrl, onComplete, onError]);

  // Get ordered stages array
  const stagesArray = Array.from(stages.values());

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Pipeline Execution
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              ID: <span className="font-mono">{executionId}</span>
            </p>
          </div>

          {/* Connection Status */}
          <div className="flex items-center space-x-2">
            {isConnected ? (
              <>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm text-gray-600">Connected</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 bg-red-500 rounded-full" />
                <span className="text-sm text-gray-600">Disconnected</span>
              </>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <ProgressBar
          value={progress}
          variant={overallStatus === 'failed' ? 'danger' : overallStatus === 'completed' ? 'success' : 'default'}
          showLabel
          size="lg"
        />

        {/* Current Stage */}
        {currentStage && (
          <div className="mt-4 flex items-center space-x-2">
            {overallStatus === 'running' && <Spinner size="sm" />}
            <span className="text-sm text-gray-700">
              {overallStatus === 'running'
                ? `Processing: ${currentStage.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}`
                : overallStatus === 'completed'
                ? 'Pipeline completed successfully!'
                : 'Pipeline failed'}
            </span>
          </div>
        )}

        {/* Overall Status Badge */}
        <div className="mt-4">
          <Badge
            variant={
              overallStatus === 'completed' ? 'success' :
              overallStatus === 'failed' ? 'danger' :
              'info'
            }
            size="lg"
          >
            {overallStatus === 'completed' ? '✓ Completed' :
             overallStatus === 'failed' ? '✗ Failed' :
             'Running...'}
          </Badge>
        </div>
      </div>

      {/* Stages List */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Pipeline Stages
        </h3>

        {stagesArray.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Waiting for pipeline stages...
          </div>
        ) : (
          <div className="space-y-3">
            {stagesArray.map((stage) => (
              <StageCard
                key={stage.stage_name}
                stageName={stage.stage_name}
                status={stage.status}
                duration={stage.duration_seconds}
                cacheHit={stage.cache_hit}
                errorMessage={stage.error_message}
                startedAt={stage.started_at}
                completedAt={stage.completed_at}
              />
            ))}
          </div>
        )}
      </div>

      {/* Updates Log (Optional - for debugging) */}
      {process.env.NODE_ENV === 'development' && updates.length > 0 && (
        <details className="bg-gray-50 rounded-lg p-4">
          <summary className="cursor-pointer text-sm font-medium text-gray-700">
            Debug: Raw Updates ({updates.length})
          </summary>
          <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
            {updates.map((update, idx) => (
              <div
                key={idx}
                className="text-xs font-mono bg-white p-2 rounded border border-gray-200"
              >
                <span className="text-gray-500">{new Date(update.timestamp).toLocaleTimeString()}</span>
                {' - '}
                <span className="font-semibold">{update.stage}</span>
                {' - '}
                <span className={
                  update.status === 'completed' ? 'text-green-600' :
                  update.status === 'failed' ? 'text-red-600' :
                  'text-blue-600'
                }>
                  {update.status}
                </span>
                {' - '}
                <span>{update.progress}%</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
};
