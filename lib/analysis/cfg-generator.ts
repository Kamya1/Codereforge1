import type { Node, Edge } from 'react-flow-renderer';

export interface CFGNode {
  id: string;
  label: string;
  lineNumber: number;
  type: 'start' | 'end' | 'process' | 'decision' | 'loop';
  code?: string;
}

export interface CFGEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  condition?: 'true' | 'false';
}

export function generateCFG(code: string, language: 'cpp' | 'python' | 'javascript'): {
  nodes: Node[];
  edges: Edge[];
} {
  const lines = code.split('\n');
  const nodes: CFGNode[] = [];
  const edges: CFGEdge[] = [];
  
  // Start node
  nodes.push({
    id: 'start',
    label: 'Start',
    lineNumber: 0,
    type: 'start',
    code: 'Program Start'
  });
  
  let nodeId = 1;
  const nodeMap = new Map<number, string>(); // Map line number to node ID
  nodeMap.set(0, 'start');
  
  // Track control flow structures
  const controlStack: Array<{ type: string; nodeId: string; line: number; trueBranchEnd?: string; falseBranchEnd?: string }> = [];
  // Track the last node processed (for connecting sequential statements)
  let lastProcessedNode: string = 'start';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('using')) {
      continue;
    }
    
    // Detect else if statements (must come before if)
    const elseIfMatch = trimmed.match(/^else\s+if\s*\((.+)\)\s*\{?/);
    if (elseIfMatch) {
      const condition = elseIfMatch[1];
      const decisionNode: CFGNode = {
        id: `node-${nodeId}`,
        label: `else if (${condition.substring(0, 25)}${condition.length > 25 ? '...' : ''})`,
        lineNumber: i + 1,
        type: 'decision',
        code: trimmed
      };
      nodes.push(decisionNode);
      nodeMap.set(i + 1, decisionNode.id);
      
      // Connect from previous if/else if node (false branch)
      if (controlStack.length > 0 && controlStack[controlStack.length - 1].type === 'if') {
        const prevIf = controlStack[controlStack.length - 1];
        edges.push({
          id: `edge-${edges.length}`,
          source: prevIf.nodeId,
          target: decisionNode.id,
          label: 'false'
        });
        // Update the previous if's false branch end
        prevIf.falseBranchEnd = decisionNode.id;
      } else {
        const prevNodeId = lastProcessedNode || nodeMap.get(i) || (nodes.length > 1 ? nodes[nodes.length - 2].id : 'start');
        edges.push({
          id: `edge-${edges.length}`,
          source: prevNodeId,
          target: decisionNode.id
        });
      }
      
      lastProcessedNode = decisionNode.id;
      controlStack.push({ type: 'if', nodeId: decisionNode.id, line: i + 1 });
      nodeId++;
      continue;
    }
    
    // Detect if statements
    const ifMatch = trimmed.match(/^if\s*\((.+)\)\s*\{?/);
    if (ifMatch) {
      const condition = ifMatch[1];
      const decisionNode: CFGNode = {
        id: `node-${nodeId}`,
        label: `if (${condition.substring(0, 30)}${condition.length > 30 ? '...' : ''})`,
        lineNumber: i + 1,
        type: 'decision',
        code: trimmed
      };
      nodes.push(decisionNode);
      nodeMap.set(i + 1, decisionNode.id);
      
      // Connect from previous node
      const prevNodeId = lastProcessedNode || nodeMap.get(i) || (nodes.length > 1 ? nodes[nodes.length - 2].id : 'start');
      edges.push({
        id: `edge-${edges.length}`,
        source: prevNodeId,
        target: decisionNode.id
      });
      
      lastProcessedNode = decisionNode.id;
      controlStack.push({ type: 'if', nodeId: decisionNode.id, line: i + 1 });
      nodeId++;
      continue;
    }
    
    // Detect else statements (without if)
    const elseMatch = trimmed.match(/^else\s*\{?/);
    if (elseMatch) {
      // This is handled by the closing brace detection, but we need to track it
      // The else block will be connected when we hit the closing brace
      continue;
    }
    
    // Detect while loops
    const whileMatch = trimmed.match(/^while\s*\((.+)\)\s*\{?/);
    if (whileMatch) {
      const condition = whileMatch[1];
      const loopNode: CFGNode = {
        id: `node-${nodeId}`,
        label: `while (${condition.substring(0, 30)}${condition.length > 30 ? '...' : ''})`,
        lineNumber: i + 1,
        type: 'loop',
        code: trimmed
      };
      nodes.push(loopNode);
      nodeMap.set(i + 1, loopNode.id);
      
      // Connect from previous node
      const prevNodeId = lastProcessedNode || nodeMap.get(i) || (nodes.length > 1 ? nodes[nodes.length - 2].id : 'start');
      edges.push({
        id: `edge-${edges.length}`,
        source: prevNodeId,
        target: loopNode.id
      });
      
      lastProcessedNode = loopNode.id;
      controlStack.push({ type: 'while', nodeId: loopNode.id, line: i + 1 });
      nodeId++;
      continue;
    }
    
    // Detect for loops
    const forMatch = trimmed.match(/^for\s*\((.+)\)\s*\{?/);
    if (forMatch) {
      const condition = forMatch[1];
      const loopNode: CFGNode = {
        id: `node-${nodeId}`,
        label: `for (${condition.substring(0, 30)}${condition.length > 30 ? '...' : ''})`,
        lineNumber: i + 1,
        type: 'loop',
        code: trimmed
      };
      nodes.push(loopNode);
      nodeMap.set(i + 1, loopNode.id);
      
      const prevNodeId = nodeMap.get(i) || (nodes.length > 1 ? nodes[nodes.length - 2].id : 'start');
      edges.push({
        id: `edge-${edges.length}`,
        source: prevNodeId,
        target: loopNode.id
      });
      
      controlStack.push({ type: 'for', nodeId: loopNode.id, line: i + 1 });
      nodeId++;
      continue;
    }
    
    // Detect return statements
    const returnMatch = trimmed.match(/^return\s+(.+);/);
    if (returnMatch) {
      const returnValue = returnMatch[1].trim();
      const returnNode: CFGNode = {
        id: `node-${nodeId}`,
        label: `return ${returnValue.substring(0, 30)}${returnValue.length > 30 ? '...' : ''}`,
        lineNumber: i + 1,
        type: 'end',
        code: trimmed
      };
      nodes.push(returnNode);
      nodeMap.set(i + 1, returnNode.id);
      
      const prevNodeId = lastProcessedNode || nodeMap.get(i) || (nodes.length > 1 ? nodes[nodes.length - 2].id : 'start');
      edges.push({
        id: `edge-${edges.length}`,
        source: prevNodeId,
        target: returnNode.id,
        label: returnValue.includes('-1') ? 'not found' : 'found'
      });
      
      // If this return is inside an if statement, mark it as the true branch end
      if (controlStack.length > 0 && controlStack[controlStack.length - 1].type === 'if') {
        const currentIf = controlStack[controlStack.length - 1];
        if (!currentIf.trueBranchEnd) {
          currentIf.trueBranchEnd = returnNode.id;
        }
      }
      
      lastProcessedNode = returnNode.id;
      nodeId++;
      continue;
    }
    
    // Detect closing braces (end of control structures)
    if (trimmed === '}' || trimmed.match(/^}\s*else/)) {
      if (controlStack.length > 0) {
        const control = controlStack[controlStack.length - 1];
        
        // Add edge back to loop for while/for
        if (control.type === 'while' || control.type === 'for') {
          // Find the last node before this closing brace
          let lastNodeId = nodeMap.get(i - 1);
          if (!lastNodeId) {
            // Look for the most recent node
            const recentNodes = Array.from(nodeMap.entries()).filter(([line]) => line < i + 1);
            if (recentNodes.length > 0) {
              lastNodeId = recentNodes[recentNodes.length - 1][1];
            } else {
              lastNodeId = `node-${nodeId - 1}`;
            }
          }
          
          if (lastNodeId && lastNodeId !== control.nodeId) {
            edges.push({
              id: `edge-${edges.length}`,
              source: lastNodeId,
              target: control.nodeId,
              label: 'loop back'
            });
          }
        }
        
        // For if statements, we need to connect the false branch if there's no else
        if (control.type === 'if') {
          // Check if next line is else or else if
          const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : '';
          if (!nextLine.match(/^\s*else/)) {
            // No else, so false branch goes to next statement
            // This will be handled by the next statement's connection
          }
        }
        
        controlStack.pop();
      }
      continue;
    }
    
    // Detect variable assignments with comments
    const assignWithCommentMatch = trimmed.match(/^(\w+\s*=\s*[^;]+);\s*\/\/\s*(.+)/);
    if (assignWithCommentMatch) {
      const assignment = assignWithCommentMatch[1];
      const comment = assignWithCommentMatch[2];
      const processNode: CFGNode = {
        id: `node-${nodeId}`,
        label: `${assignment.substring(0, 25)}${assignment.length > 25 ? '...' : ''} // ${comment.substring(0, 20)}${comment.length > 20 ? '...' : ''}`,
        lineNumber: i + 1,
        type: 'process',
        code: trimmed
      };
      nodes.push(processNode);
      nodeMap.set(i + 1, processNode.id);
      
      // Connect from previous node or from if statement (true branch)
      let prevNodeId = lastProcessedNode || nodeMap.get(i);
      if (!prevNodeId && controlStack.length > 0 && controlStack[controlStack.length - 1].type === 'if') {
        // Connect from if statement (true branch)
        prevNodeId = controlStack[controlStack.length - 1].nodeId;
        edges.push({
          id: `edge-${edges.length}`,
          source: prevNodeId,
          target: processNode.id,
          label: 'true'
        });
        // Mark this as the true branch end
        controlStack[controlStack.length - 1].trueBranchEnd = processNode.id;
      } else {
        prevNodeId = prevNodeId || (nodes.length > 1 ? nodes[nodes.length - 2].id : 'start');
        if (prevNodeId && prevNodeId !== processNode.id) {
          edges.push({
            id: `edge-${edges.length}`,
            source: prevNodeId,
            target: processNode.id
          });
        }
      }
      lastProcessedNode = processNode.id;
      nodeId++;
      continue;
    }
    
    // Regular statements - create process nodes for significant ones
    if (trimmed.match(/^\w+\s*=\s*.+/) || trimmed.match(/^\w+\(.+\)/)) {
      const processNode: CFGNode = {
        id: `node-${nodeId}`,
        label: trimmed.substring(0, 40) + (trimmed.length > 40 ? '...' : ''),
        lineNumber: i + 1,
        type: 'process',
        code: trimmed
      };
      nodes.push(processNode);
      nodeMap.set(i + 1, processNode.id);
      
      // Connect from previous node or from if statement
      let prevNodeId = lastProcessedNode || nodeMap.get(i);
      if (!prevNodeId && controlStack.length > 0 && controlStack[controlStack.length - 1].type === 'if') {
        // Connect from if statement (true branch)
        prevNodeId = controlStack[controlStack.length - 1].nodeId;
        edges.push({
          id: `edge-${edges.length}`,
          source: prevNodeId,
          target: processNode.id,
          label: 'true'
        });
        // Mark this as the true branch end
        controlStack[controlStack.length - 1].trueBranchEnd = processNode.id;
      } else {
        prevNodeId = prevNodeId || (nodes.length > 1 ? nodes[nodes.length - 2].id : 'start');
        if (prevNodeId && prevNodeId !== processNode.id) {
          edges.push({
            id: `edge-${edges.length}`,
            source: prevNodeId,
            target: processNode.id
          });
        }
      }
      lastProcessedNode = processNode.id;
      nodeId++;
    }
  }
  
  // End node
  const endNode: CFGNode = {
    id: 'end',
    label: 'End',
    lineNumber: lines.length + 1,
    type: 'end',
    code: 'Program End'
  };
  nodes.push(endNode);
  
  // Connect last nodes to end (only return nodes and nodes that don't already have outgoing edges)
  const nodesWithOutgoing = new Set(edges.map(e => e.source));
  const returnNodes = nodes.filter(n => n.type === 'end' && n.id !== 'end');
  
  // Connect return nodes to end
  returnNodes.forEach(node => {
    if (!edges.some(e => e.source === node.id && e.target === 'end')) {
      edges.push({
        id: `edge-${edges.length}`,
        source: node.id,
        target: 'end'
      });
    }
  });
  
  // Connect nodes without outgoing edges to end (if they're not return nodes)
  nodes.forEach(node => {
    if (node.id !== 'end' && node.id !== 'start' && 
        !nodesWithOutgoing.has(node.id) && 
        node.type !== 'end' &&
        !edges.some(e => e.source === node.id)) {
      edges.push({
        id: `edge-${edges.length}`,
        source: node.id,
        target: 'end'
      });
    }
  });
  
  // Convert to React Flow format with better positioning
  const reactFlowNodes: Node[] = nodes.map((node, idx) => {
    const x = (idx % 4) * 250;
    const y = Math.floor(idx / 4) * 150;
    
    let nodeType = 'default';
    let style: any = {
      background: '#fff',
      border: '2px solid #e2e8f0',
      borderRadius: '8px',
      padding: '10px',
      minWidth: '150px',
    };
    
    if (node.type === 'start') {
      nodeType = 'default';
      style.background = '#10b981';
      style.color = '#fff';
    } else if (node.type === 'end') {
      nodeType = 'default';
      style.background = '#ef4444';
      style.color = '#fff';
    } else if (node.type === 'decision') {
      nodeType = 'diamond';
      style.background = '#3b82f6';
      style.color = '#fff';
    } else if (node.type === 'loop') {
      nodeType = 'default';
      style.background = '#f59e0b';
      style.color = '#fff';
    }
    
    return {
      id: node.id,
      type: nodeType,
      position: { x, y },
      data: { 
        label: node.label,
        lineNumber: node.lineNumber,
        code: node.code
      },
      style
    };
  });
  
  const reactFlowEdges: Edge[] = edges.map((edge, idx) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label || '',
    style: { stroke: '#64748b', strokeWidth: 2 },
    markerEnd: { type: 'arrowclosed', color: '#64748b' }
  }));
  
  return { nodes: reactFlowNodes, edges: reactFlowEdges };
}

