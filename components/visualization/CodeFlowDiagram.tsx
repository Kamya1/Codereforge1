'use client';

import React, { useCallback, useMemo, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  MarkerType,
} from 'react-flow-renderer';
import { generateCFG } from '@/lib/analysis/cfg-generator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GitBranch } from 'lucide-react';

interface CodeFlowDiagramProps {
  code: string;
  language: 'cpp' | 'python' | 'javascript';
  currentLine?: number;
}

const nodeTypes = {
  diamond: ({ data }: any) => (
    <div
      className="px-4 py-2 bg-blue-500 text-white rounded-lg border-2 border-blue-600 shadow-lg transform rotate-45 w-24 h-24 flex items-center justify-center"
      style={{ transform: 'rotate(45deg)' }}
    >
      <div style={{ transform: 'rotate(-45deg)' }} className="text-xs font-semibold text-center">
        {data.label}
      </div>
    </div>
  ),
};

export function CodeFlowDiagram({ code, language, currentLine }: CodeFlowDiagramProps) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => {
      try {
        return generateCFG(code, language);
      } catch (error) {
        console.error('Error generating CFG:', error);
        return { nodes: [], edges: [] };
      }
    },
    [code, language]
  );
  
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  
  // Update nodes/edges when code changes
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);
  
  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );
  
  // Highlight current executing node
  const nodesWithHighlight = useMemo(() => {
    return nodes.map(node => {
      const isCurrent = currentLine && node.data.lineNumber === currentLine;
      return {
        ...node,
        style: {
          ...node.style,
          backgroundColor: isCurrent ? '#ef4444' : node.style?.background || '#fff',
          color: isCurrent ? '#fff' : node.style?.color || '#000',
          border: isCurrent ? '3px solid #ef4444' : node.style?.border || '2px solid #e2e8f0',
          boxShadow: isCurrent ? '0 0 20px rgba(239, 68, 68, 0.5)' : 'none',
          transition: 'all 0.3s ease',
        }
      };
    });
  }, [nodes, currentLine]);
  
  if (!code || code.trim().length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="w-5 h-5" />
            Control Flow Diagram
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No code available to generate flow diagram.</p>
        </CardContent>
      </Card>
    );
  }
  
  if (nodes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="w-5 h-5" />
            Control Flow Diagram
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Could not generate control flow diagram. The code might be too simple or contain syntax that couldn't be parsed.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Debug: {nodes.length} nodes, {edges.length} edges generated.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitBranch className="w-5 h-5" />
          Control Flow Diagram
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="w-full h-[500px] border border-border rounded-lg bg-muted/30 dark:bg-muted/20">
          <ReactFlow
            nodes={nodesWithHighlight}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            fitView
            nodesDraggable={true}
            nodesConnectable={false}
            elementsSelectable={true}
            defaultEdgeOptions={{
              type: 'smoothstep',
              animated: true,
              markerEnd: {
                type: MarkerType.ArrowClosed,
              },
            }}
          >
            <Background color="hsl(var(--muted))" gap={16} />
            <Controls className="bg-background border border-border rounded shadow-lg" />
            <MiniMap 
              nodeColor={(node) => {
                if (node.type === 'diamond') return '#3b82f6';
                if (node.id === 'start') return '#10b981';
                if (node.id === 'end') return '#ef4444';
                return '#64748b';
              }}
              maskColor="rgba(0, 0, 0, 0.1)"
              className="bg-background border border-border rounded shadow-lg"
            />
          </ReactFlow>
        </div>
        {currentLine && (
          <p className="mt-2 text-sm text-muted-foreground">
            Currently executing: Line {currentLine} (highlighted in red)
          </p>
        )}
      </CardContent>
    </Card>
  );
}

