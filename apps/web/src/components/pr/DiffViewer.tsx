"use client";

import React from 'react';
import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer-continued';

interface DiffViewerProps {
  oldCode: string;
  newCode: string;
  filename: string;
}

const DiffViewer: React.FC<DiffViewerProps> = ({ oldCode, newCode, filename }) => {
  return (
    <div className="border border-zinc-700 rounded-lg overflow-hidden mb-4">
      <div className="bg-zinc-800 px-4 py-2 text-sm font-mono text-zinc-300 border-b border-zinc-700 flex justify-between">
        <span>{filename}</span>
      </div>
      <div className="max-h-[500px] overflow-y-auto">
        <ReactDiffViewer
          oldValue={oldCode}
          newValue={newCode}
          splitView={true}
          compareMethod={DiffMethod.WORDS}
          useDarkTheme={true}
          styles={{
            variables: {
              dark: {
                diffViewerBackground: '#18181b', 
                diffViewerColor: '#e4e4e7',
                addedBackground: '#064e3b', 
                addedColor: '#fff',
                removedBackground: '#7f1d1d',
                removedColor: '#fff',
                gutterBackground: '#27272a',
              }
            }
          }}
        />
      </div>
    </div>
  );
};

export default DiffViewer;
