import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../db/db';

interface DiagramNode {
  id: string;
  label: string;
  x: number;
  y: number;
  type: 'concept' | 'process' | 'cloud';
}

interface DiagramEdge {
  id: string;
  fromId: string;
  toId: string;
}

export const DiagramBuilder: React.FC = () => {
  const [diagrams, setDiagrams] = useState<{ id: string; name: string }[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [nodes, setNodes] = useState<DiagramNode[]>([]);
  const [edges, setEdges] = useState<DiagramEdge[]>([]);
  const [diagramName, setDiagramName] = useState('Untitled Roadmap');

  // Canvas translation & scaling
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);


  // Port connection state
  const [activeConnector, setActiveConnector] = useState<{ fromId: string; startX: number; startY: number } | null>(null);
  const [tempLine, setTempLine] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const panStartRef = useRef({ x: 0, y: 0 });

  const loadDiagrams = async () => {
    try {
      const data = await db.getAll('diagrams');
      setDiagrams(data.map(d => ({ id: d.id, name: d.name })));
      
      if (data.length > 0 && !activeId) {
        setActiveId(data[0].id);
        setDiagramName(data[0].name);
        setNodes(data[0].nodes);
        setEdges(data[0].edges);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadDiagrams();
  }, []);

  const handleCreateDiagram = async () => {
    const newD = {
      id: crypto.randomUUID(),
      name: 'New Roadmap',
      nodes: [],
      edges: [],
      updatedAt: Date.now()
    };
    try {
      await db.put('diagrams', newD);
      setActiveId(newD.id);
      setDiagramName(newD.name);
      setNodes(newD.nodes);
      setEdges(newD.edges);
      await loadDiagrams();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveDiagram = async () => {
    if (!activeId) return;
    const item = {
      id: activeId,
      name: diagramName,
      nodes,
      edges,
      updatedAt: Date.now()
    };
    try {
      await db.put('diagrams', item);
      await loadDiagrams();
      alert('Map saved successfully offline!');
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteDiagram = async () => {
    if (!activeId || !confirm('Delete this diagram?')) return;
    try {
      await db.delete('diagrams', activeId);
      const all = diagrams.filter(d => d.id !== activeId);
      setDiagrams(all);
      setActiveId(all.length > 0 ? all[0].id : null);
      if (all.length > 0) {
        const full = await db.get('diagrams', all[0].id);
        if (full) {
          setDiagramName(full.name);
          setNodes(full.nodes);
          setEdges(full.edges);
        }
      } else {
        setNodes([]);
        setEdges([]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectDiagram = async (id: string) => {
    try {
      const full = await db.get('diagrams', id);
      if (full) {
        setActiveId(id);
        setDiagramName(full.name);
        setNodes(full.nodes);
        setEdges(full.edges);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Dragging nodes
  const handleNodePointerDown = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    setSelectedNodeId(id);

    
    const clientX = e.clientX;
    const clientY = e.clientY;
    const targetNode = nodes.find(n => n.id === id);
    if (!targetNode) return;

    const initialNodeX = targetNode.x;
    const initialNodeY = targetNode.y;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = (moveEvent.clientX - clientX) / zoom;
      const deltaY = (moveEvent.clientY - clientY) / zoom;
      
      setNodes(prev => prev.map(n => 
        n.id === id ? { ...n, x: initialNodeX + deltaX, y: initialNodeY + deltaY } : n
      ));
    };

    const handlePointerUp = () => {

      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  };

  // Panning canvas
  const handleCanvasPointerDown = (e: React.PointerEvent) => {
    // Only Middle click (button 1) or Left click + Space allows pan
    if (e.button !== 0 && e.button !== 1) return;
    setIsPanning(true);
    panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleCanvasPointerMove = (e: React.PointerEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y
      });
    }

    // Handle active temp connector drawing
    if (activeConnector && tempLine) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        setTempLine({
          ...tempLine,
          x2: (e.clientX - rect.left - pan.x) / zoom,
          y2: (e.clientY - rect.top - pan.y) / zoom
        });
      }
    }
  };

  const handleCanvasPointerUp = () => {
    setIsPanning(false);
    if (activeConnector) {
      setActiveConnector(null);
      setTempLine(null);
    }
  };

  // Zooming
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const scale = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom(z => Math.max(0.3, Math.min(3, z * scale)));
  };

  // Sockets connections
  const startConnection = (e: React.PointerEvent, nodeId: string) => {
    e.stopPropagation();
    const rect = canvasRef.current?.getBoundingClientRect();
    const node = nodes.find(n => n.id === nodeId);
    if (rect && node) {
      // Out socket is on the right side of the node (width ~140px, height ~40px)
      const startX = node.x + 140;
      const startY = node.y + 20;
      
      setActiveConnector({ fromId: nodeId, startX, startY });
      setTempLine({ x1: startX, y1: startY, x2: startX, y2: startY });
    }
  };

  const completeConnection = (e: React.PointerEvent, toNodeId: string) => {
    e.stopPropagation();
    if (activeConnector && activeConnector.fromId !== toNodeId) {
      const alreadyExists = edges.some(edge => edge.fromId === activeConnector.fromId && edge.toId === toNodeId);
      if (!alreadyExists) {
        setEdges([...edges, {
          id: crypto.randomUUID(),
          fromId: activeConnector.fromId,
          toId: toNodeId
        }]);
      }
    }
    setActiveConnector(null);
    setTempLine(null);
  };

  const handleAddNode = (type: 'concept' | 'process' | 'cloud') => {
    const newNode: DiagramNode = {
      id: crypto.randomUUID(),
      label: 'New Step',
      x: 100 - pan.x / zoom,
      y: 100 - pan.y / zoom,
      type
    };
    setNodes([...nodes, newNode]);
  };

  const handleDeleteSelectedNode = () => {
    if (!selectedNodeId) return;
    setNodes(nodes.filter(n => n.id !== selectedNodeId));
    setEdges(edges.filter(e => e.fromId !== selectedNodeId && e.toId !== selectedNodeId));
    setSelectedNodeId(null);
  };

  // Bezier coordinates calculation
  const getBezierPath = (x1: number, y1: number, x2: number, y2: number) => {
    const dx = Math.abs(x2 - x1) * 0.5;
    return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
  };

  const handleExportSVG = () => {
    const svgContent = `
      <svg xmlns="http://www.w3.org/2000/svg" width="1000" height="800" style="background:#0b0c10">
        ${edges.map(edge => {
          const fromNode = nodes.find(n => n.id === edge.fromId);
          const toNode = nodes.find(n => n.id === edge.toId);
          if (fromNode && toNode) {
            const x1 = fromNode.x + 140;
            const y1 = fromNode.y + 20;
            const x2 = toNode.x;
            const y2 = toNode.y + 20;
            return `<path d="${getBezierPath(x1, y1, x2, y2)}" fill="none" stroke="#00c3ff" stroke-width="2.5" />`;
          }
          return '';
        }).join('')}
        ${nodes.map(n => `
          <g transform="translate(${n.x},${n.y})">
            <rect width="140" height="40" rx="8" fill="#161821" stroke="#00c3ff" stroke-width="1.5" />
            <text x="70" y="25" fill="#f3f4f6" font-size="12" font-family="sans-serif" text-anchor="middle">${n.label}</text>
          </g>
        `).join('')}
      </svg>
    `;
    
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${diagramName.replace(/\s+/g, '_')}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="module-container" style={{ flexDirection: 'row' }}>
      
      {/* Sidebar: Map manager */}
      <div className="module-sidebar" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ padding: '12px', borderBottom: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleCreateDiagram}>
            ➕ New Roadmap
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {diagrams.map(d => (
            <div
              key={d.id}
              style={{
                padding: '10px 12px',
                borderBottom: '1px solid var(--glass-border)',
                cursor: 'pointer',
                background: activeId === d.id ? 'rgba(255,255,255,0.05)' : 'transparent',
                fontSize: '13px'
              }}
              onClick={() => handleSelectDiagram(d.id)}
            >
              📐 {d.name}
            </div>
          ))}
        </div>
      </div>

      {/* Main visual canvas */}
      <div className="module-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0 }}>
        
        {/* Controls top bar */}
        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <input
            type="text"
            className="input-field"
            value={diagramName}
            onChange={(e) => setDiagramName(e.target.value)}
            style={{ maxWidth: '220px', fontWeight: 'bold' }}
            placeholder="Map Name"
          />

          <div style={{ display: 'flex', gap: '6px' }}>
            <button className="btn" style={{ fontSize: '11px', padding: '6px 10px' }} onClick={() => handleAddNode('concept')}>Concept card</button>
            <button className="btn" style={{ fontSize: '11px', padding: '6px 10px' }} onClick={() => handleAddNode('process')}>Process step</button>
            
            {selectedNodeId && (
              <button className="btn btn-danger" style={{ fontSize: '11px', padding: '6px 10px' }} onClick={handleDeleteSelectedNode}>
                Delete Node
              </button>
            )}

            <button className="btn btn-primary" style={{ fontSize: '11px', padding: '6px 10px' }} onClick={handleSaveDiagram}>Save Map</button>
            <button className="btn" style={{ fontSize: '11px', padding: '6px 10px' }} onClick={handleExportSVG}>Export SVG</button>
            <button className="btn btn-danger" style={{ fontSize: '11px', padding: '6px 10px' }} onClick={handleDeleteDiagram}>Delete</button>
          </div>
        </div>

        {/* Visual workspace */}
        <div
          ref={canvasRef}
          className="diagram-canvas-container"
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={handleCanvasPointerMove}
          onPointerUp={handleCanvasPointerUp}
          onWheel={handleWheel}
          style={{ flex: 1, cursor: isPanning ? 'grabbing' : 'default' }}
        >
          {/* Transforming canvas content */}
          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0',
              width: '2000px',
              height: '1500px',
              position: 'relative'
            }}
          >
            {/* SVG connectors layer */}
            <svg className="diagram-svg-layer" style={{ width: '100%', height: '100%' }}>
              {edges.map(edge => {
                const fromNode = nodes.find(n => n.id === edge.fromId);
                const toNode = nodes.find(n => n.id === edge.toId);
                if (fromNode && toNode) {
                  // Connect right socket of "from" to left socket of "to"
                  const x1 = fromNode.x + 140;
                  const y1 = fromNode.y + 20;
                  const x2 = toNode.x;
                  const y2 = toNode.y + 20;

                  return (
                    <path
                      key={edge.id}
                      className="diagram-connection-line"
                      d={getBezierPath(x1, y1, x2, y2)}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Delete this connecting link?')) {
                          setEdges(edges.filter(ed => ed.id !== edge.id));
                        }
                      }}
                      stroke="var(--accent-color)"
                      strokeWidth="2.5"
                    />
                  );
                }
                return null;
              })}

              {/* Temporary connection line drawing */}
              {tempLine && (
                <path
                  d={getBezierPath(tempLine.x1, tempLine.y1, tempLine.x2, tempLine.y2)}
                  fill="none"
                  stroke="var(--warning)"
                  strokeWidth="2"
                  strokeDasharray="4"
                />
              )}
            </svg>

            {/* Draggable Node components */}
            {nodes.map(node => {
              const isSelected = selectedNodeId === node.id;
              
              return (
                <div
                  key={node.id}
                  className={`diagram-node ${isSelected ? 'selected' : ''}`}
                  style={{
                    left: `${node.x}px`,
                    top: `${node.y}px`,
                    width: '140px',
                    height: '40px',
                    padding: '2px',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: node.type === 'concept' ? 'rgba(0,195,255,0.1)' : 'rgba(255,255,255,0.03)'
                  }}
                  onPointerDown={(e) => handleNodePointerDown(e, node.id)}
                >
                  <input
                    type="text"
                    value={node.label}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNodes(nodes.map(n => n.id === node.id ? { ...n, label: val } : n));
                    }}
                    onPointerDown={(e) => e.stopPropagation()} // Stop drag while typing!
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'inherit',
                      textAlign: 'center',
                      fontSize: '12px',
                      width: '90%'
                    }}
                  />

                  {/* Port handles */}
                  {/* Left input handle */}
                  <div
                    className="diagram-connector-point connector-input"
                    onPointerDown={(e) => { e.stopPropagation(); }}
                    onPointerUp={(e) => completeConnection(e, node.id)}
                    title="Connect input socket"
                  />

                  {/* Right output handle */}
                  <div
                    className="diagram-connector-point connector-output"
                    onPointerDown={(e) => startConnection(e, node.id)}
                    title="Drag output socket"
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Tip status footer */}
        <div style={{ padding: '4px 16px', background: 'rgba(0,0,0,0.2)', fontSize: '10px', color: 'var(--text-muted)' }}>
          Tip: Drag right socket to connect to left socket of another node. Middle-click drag to PAN. Wheel to ZOOM. Click nodes to rename/delete.
        </div>

      </div>

    </div>
  );
};
