# Quick Start: Visual Code Flow Diagram (Highest Impact, Easiest Win)

## Why This Feature?
- ✅ Uses existing dependency (`react-flow-renderer`)
- ✅ High visual impact for demos
- ✅ Shows compiler theory knowledge
- ✅ Can be implemented in 1-2 days
- ✅ Novel feature that stands out

## Implementation Steps

### Step 1: Create CFG Generator (2-3 hours)

Create `lib/analysis/cfg-generator.ts`:

```typescript
import type { Node, Edge } from 'react-flow-renderer';

export interface CFGNode {
  id: string;
  label: string;
  lineNumber: number;
  type: 'start' | 'end' | 'process' | 'decision' | 'loop';
}

export interface CFGEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  condition?: string;
}

export function generateCFG(code: string, language: 'cpp' | 'python' | 'javascript'): {
  nodes: Node[];
  edges: Edge[];
} {
  const lines = code.split('\n');
  const nodes: CFGNode[] = [];
  const edges: CFGEdge[] = [];
  
  // Simple CFG generation based on control flow
  // Start node
  nodes.push({
    id: 'start',
    label: 'Start',
    lineNumber: 0,
    type: 'start'
  });
  
  let nodeId = 1;
  let currentNode = 'start';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Detect control flow statements
    if (line.match(/^(if|while|for)\s*\(/)) {
      // Decision/loop node
      const decisionNode: CFGNode = {
        id: `node-${nodeId}`,
        label: line.substring(0, 50),
        lineNumber: i + 1,
        type: line.startsWith('if') ? 'decision' : 'loop'
      };
      nodes.push(decisionNode);
      
      // Edge from current to decision
      edges.push({
        id: `edge-${edges.length}`,
        source: currentNode,
        target: decisionNode.id
      });
      
      currentNode = decisionNode.id;
      nodeId++;
    } else if (line.includes('return') || line.includes('break') || line.includes('continue')) {
      // End node
      const endNode: CFGNode = {
        id: `end-${nodeId}`,
        label: 'End',
        lineNumber: i + 1,
        type: 'end'
      };
      nodes.push(endNode);
      
      edges.push({
        id: `edge-${edges.length}`,
        source: currentNode,
        target: endNode.id
      });
      
      nodeId++;
    }
  }
  
  // Convert to React Flow format
  const reactFlowNodes: Node[] = nodes.map((node, idx) => ({
    id: node.id,
    type: node.type === 'decision' ? 'diamond' : 'default',
    position: { x: (idx % 3) * 200, y: Math.floor(idx / 3) * 150 },
    data: { label: node.label }
  }));
  
  const reactFlowEdges: Edge[] = edges.map(edge => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label || ''
  }));
  
  return { nodes: reactFlowNodes, edges: reactFlowEdges };
}
```

### Step 2: Create Visualization Component (2-3 hours)

Create `components/visualization/CodeFlowDiagram.tsx`:

```typescript
'use client';

import React, { useCallback } from 'react';
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
} from 'react-flow-renderer';
import { generateCFG } from '@/lib/analysis/cfg-generator';

interface CodeFlowDiagramProps {
  code: string;
  language: 'cpp' | 'python' | 'javascript';
  currentLine?: number;
}

export function CodeFlowDiagram({ code, language, currentLine }: CodeFlowDiagramProps) {
  const { nodes: initialNodes, edges: initialEdges } = generateCFG(code, language);
  
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  
  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );
  
  // Highlight current executing node
  const nodesWithHighlight = nodes.map(node => ({
    ...node,
    style: {
      ...node.style,
      backgroundColor: node.data.label.includes(`Line ${currentLine}`) 
        ? '#ff6b6b' 
        : '#fff',
      border: node.data.label.includes(`Line ${currentLine}`) 
        ? '2px solid #ff6b6b' 
        : '1px solid #ddd',
    }
  }));
  
  return (
    <div className="w-full h-[500px] border rounded-lg">
      <ReactFlow
        nodes={nodesWithHighlight}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}
```

### Step 3: Integrate into Execution Visualization (1 hour)

Update `components/visualization/ExecutionVisualization.tsx`:

```typescript
import { CodeFlowDiagram } from './CodeFlowDiagram';

// Add tab or section:
<Tabs>
  <TabsList>
    <TabsTrigger value="execution">Step-by-Step</TabsTrigger>
    <TabsTrigger value="flow">Control Flow</TabsTrigger>
  </TabsList>
  <TabsContent value="execution">
    {/* Existing execution view */}
  </TabsContent>
  <TabsContent value="flow">
    <CodeFlowDiagram 
      code={challenge.code} 
      language={challenge.language}
      currentLine={currentStep?.line}
    />
  </TabsContent>
</Tabs>
```

### Step 4: Add Node Types (Optional, 1-2 hours)

Create custom node components for better visualization:

```typescript
// components/visualization/flow-nodes.tsx
import { Handle, Position } from 'react-flow-renderer';

export function DecisionNode({ data }: { data: any }) {
  return (
    <div className="px-4 py-2 bg-blue-100 rounded-lg border-2 border-blue-500">
      <Handle type="target" position={Position.Top} />
      <div className="font-semibold">{data.label}</div>
      <Handle type="source" position={Position.Bottom} id="true" label="True" />
      <Handle type="source" position={Position.Right} id="false" label="False" />
    </div>
  );
}
```

---

## Next Quick Win: Adaptive Learning System (2-3 days)

### Step 1: Track User Performance

Create `lib/learning/user-progress.ts`:

```typescript
interface UserProgress {
  userId: string;
  challengesCompleted: string[];
  conceptsMastered: string[];
  accuracy: number;
  averageTime: number;
  difficultyLevel: 'easy' | 'medium' | 'hard';
}

export function calculateNextDifficulty(progress: UserProgress): 'easy' | 'medium' | 'hard' {
  if (progress.accuracy > 0.8 && progress.averageTime < 300) {
    return 'hard';
  } else if (progress.accuracy > 0.6) {
    return 'medium';
  }
  return 'easy';
}
```

### Step 2: Recommend Challenges

```typescript
export function recommendChallenges(
  progress: UserProgress,
  allChallenges: Challenge[]
): Challenge[] {
  const weakConcepts = findWeakConcepts(progress);
  const recommended = allChallenges.filter(challenge => 
    challenge.concepts.some(concept => weakConcepts.includes(concept)) &&
    challenge.difficulty === calculateNextDifficulty(progress)
  );
  return recommended.slice(0, 5);
}
```

---

## Even Quicker Wins (30 minutes each)

### 1. Add Loading Skeletons
```typescript
// components/ui/skeleton.tsx
export function Skeleton() {
  return <div className="animate-pulse bg-gray-200 rounded" />;
}
```

### 2. Add Keyboard Shortcuts
```typescript
// lib/utils/keyboard-shortcuts.ts
useEffect(() => {
  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'Enter') {
      handleExecute();
    }
  };
  window.addEventListener('keydown', handleKeyPress);
  return () => window.removeEventListener('keydown', handleKeyPress);
}, []);
```

### 3. Add Code Formatting
```typescript
// Install: npm install prettier
import prettier from 'prettier/standalone';
import parserBabel from 'prettier/parser-babel';

function formatCode(code: string) {
  return prettier.format(code, {
    parser: 'babel',
    plugins: [parserBabel],
  });
}
```

---

## Priority Order for Maximum Impact

1. **Week 1:** Visual Code Flow Diagram + Loading Skeletons + Keyboard Shortcuts
2. **Week 2:** Adaptive Learning System + Gamification (points/badges)
3. **Week 3:** Code Similarity Detection + Performance Profiling
4. **Week 4:** Polish (themes, export, analytics dashboard)

This gives you 4 weeks of solid, impressive features! 🚀

