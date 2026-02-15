'use client';

import { useState } from 'react';
import { Copy, Check, Maximize2, Minimize2 } from 'lucide-react';

interface DiffViewerProps {
  patch: string;
  fileName: string;
}

interface DiffLine {
  type: 'add' | 'remove' | 'context' | 'header';
  content: string;
  oldLineNum?: number;
  newLineNum?: number;
}

export function DiffViewer({ patch, fileName }: DiffViewerProps) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const parseDiff = (patch: string): DiffLine[] => {
    const lines = patch.split('\n');
    const diffLines: DiffLine[] = [];
    let oldLineNum = 0;
    let newLineNum = 0;

    for (const line of lines) {
      if (line.startsWith('@@')) {
        const match = line.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/);
        if (match) {
          oldLineNum = parseInt(match[1]) - 1;
          newLineNum = parseInt(match[2]) - 1;
        }
        diffLines.push({ type: 'header', content: line });
        continue;
      }

      if (line.startsWith('---') || line.startsWith('+++')) {
        continue;
      }

      if (line.startsWith('-')) {
        oldLineNum++;
        diffLines.push({
          type: 'remove',
          content: line.substring(1),
          oldLineNum,
        });
      } else if (line.startsWith('+')) {
        newLineNum++;
        diffLines.push({
          type: 'add',
          content: line.substring(1),
          newLineNum,
        });
      } else {
        oldLineNum++;
        newLineNum++;
        const content = line.startsWith(' ') ? line.substring(1) : line;
        diffLines.push({
          type: 'context',
          content,
          oldLineNum,
          newLineNum,
        });
      }
    }

    return diffLines;
  };

  const diffLines = parseDiff(patch);

  // HANDLERS

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(patch);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };


  const getLineClass = (type: string) => {
    switch (type) {
      case 'add':
        return 'bg-green-500/10 text-green-400 border-l-2 border-green-500';
      case 'remove':
        return 'bg-red-500/10 text-red-400 border-l-2 border-red-500';
      case 'header':
        return 'bg-blue-500/10 text-blue-400 font-semibold sticky top-0 z-10';
      default:
        return 'text-zinc-300';
    }
  };

  const getLinePrefix = (type: string) => {
    switch (type) {
      case 'add':
        return '+';
      case 'remove':
        return '-';
      default:
        return ' ';
    }
  };


  return (
    <div className="diff-viewer-container bg-zinc-900">
      {/* Header */}
      <div className="bg-zinc-800 px-4 py-3 flex items-center justify-between border-b border-zinc-700 sticky top-0 z-20">
        <code className="text-sm text-zinc-300 font-mono truncate flex-1 mr-4">
          {fileName}
        </code>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 px-3 py-1.5 text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded transition-colors"
            title={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? (
              <>
                <Minimize2 className="h-3 w-3" />
                Collapse
              </>
            ) : (
              <>
                <Maximize2 className="h-3 w-3" />
                Expand
              </>
            )}
          </button>
          
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-2 px-3 py-1.5 text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded transition-colors"
            title="Copy diff"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-green-400" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                Copy
              </>
            )}
          </button>
        </div>
      </div>

      {/* Diff Content */}
      <div className={`overflow-x-auto ${expanded ? 'max-h-none' : 'max-h-96'}`}>
        <table className="w-full text-sm font-mono border-collapse">
          <tbody>
            {diffLines.map((line, idx) => (
              <tr key={idx} className={getLineClass(line.type)}>
                {/* Old Line Number */}
                <td className="px-3 py-1 text-zinc-500 text-right select-none w-12 border-r border-zinc-700/50">
                  {line.oldLineNum || ''}
                </td>

                {/* New Line Number */}
                <td className="px-3 py-1 text-zinc-500 text-right select-none w-12 border-r border-zinc-700/50">
                  {line.newLineNum || ''}
                </td>

                {/* Prefix (+/-/ ) */}
                <td className="px-3 py-1 w-8 select-none font-bold">
                  {getLinePrefix(line.type)}
                </td>

                {/* Content */}
                <td className="px-3 py-1 whitespace-pre font-mono">
                  {line.content || ' '}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      {!expanded && diffLines.length > 20 && (
        <div className="bg-zinc-800 px-4 py-2 text-center border-t border-zinc-700">
          <button
            onClick={() => setExpanded(true)}
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            Show all {diffLines.length} lines →
          </button>
        </div>
      )}
    </div>
  );
}