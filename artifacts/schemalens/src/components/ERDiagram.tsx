import { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type NodeTypes,
  Handle,
  Position,
  MarkerType,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
} from '@xyflow/react';
import dagre from '@dagrejs/dagre';
import { useNavigate } from 'react-router-dom';
import type { TableInfo, Tag } from '../lib/types';
import { TagBadge } from './TagBadge';
import { humanDataType } from '../lib/utils';

interface TableNodeData {
  label: string;
  schemaName: string;
  tableName: string;
  columns: TableInfo['columns'];
  primaryKeys: string[];
  tags: Tag[];
  connectionId: number;
  [key: string]: unknown;
}

function TableNode({ data }: { data: TableNodeData }) {
  const navigate = useNavigate();
  const pkCols = data.columns.filter((c) => c.isPrimaryKey);
  const fkCols = data.columns.filter((c) => !c.isPrimaryKey && c.isForeignKey);
  const rest = data.columns.filter((c) => !c.isPrimaryKey && !c.isForeignKey);
  const allCols = [...pkCols, ...fkCols, ...rest];
  const displayCols = allCols.slice(0, 8);
  const hiddenCount = allCols.length - displayCols.length;

  return (
    <div
      onClick={() =>
        navigate(
          `/connections/${data.connectionId}/schema/${data.schemaName}/table/${data.tableName}`
        )
      }
      className="cursor-pointer rounded-xl border bg-card shadow-md hover:shadow-lg hover:border-primary/50 transition-all duration-150 overflow-hidden min-w-[200px] max-w-[280px]"
      style={{ fontFamily: 'inherit' }}
    >
      <Handle type="target" position={Position.Left} className="opacity-0" />
      <Handle type="source" position={Position.Right} className="opacity-0" />

      {/* Header */}
      <div className="bg-primary/8 dark:bg-primary/15 border-b px-3 py-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] text-muted-foreground font-mono">{data.schemaName}</p>
            <p className="text-sm font-semibold text-foreground leading-tight">{data.tableName}</p>
          </div>
          {data.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 justify-end">
              {data.tags.slice(0, 2).map((t) => (
                <TagBadge key={t.id} tag={t.tag} color={t.color} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Columns */}
      <div className="divide-y divide-border/60">
        {displayCols.map((col) => (
          <div
            key={col.columnName}
            className="flex items-center justify-between gap-2 px-3 py-1.5 hover:bg-accent/50"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              {col.isPrimaryKey && (
                <span className="text-[9px] font-bold text-amber-500 shrink-0">PK</span>
              )}
              {col.isForeignKey && !col.isPrimaryKey && (
                <span className="text-[9px] font-bold text-blue-500 shrink-0">FK</span>
              )}
              <span className="text-xs font-mono text-foreground truncate">{col.columnName}</span>
            </div>
            <span className="text-[10px] text-muted-foreground font-mono shrink-0">
              {humanDataType(col.dataType, col.udtName)}
            </span>
          </div>
        ))}
        {hiddenCount > 0 && (
          <div className="px-3 py-1.5">
            <span className="text-[10px] text-muted-foreground">+{hiddenCount} more columns</span>
          </div>
        )}
      </div>
    </div>
  );
}

const nodeTypes: NodeTypes = { tableNode: TableNode as never };

function layoutGraph(
  nodes: Node[],
  edges: Edge[]
): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'LR', nodesep: 60, ranksep: 100, edgesep: 40 });

  nodes.forEach((n) => {
    g.setNode(n.id, { width: 260, height: Math.max(120, 60 + (n.data as TableNodeData).columns.length * 28) });
  });

  edges.forEach((e) => {
    g.setEdge(e.source, e.target);
  });

  dagre.layout(g);

  return {
    nodes: nodes.map((n) => {
      const pos = g.node(n.id);
      return { ...n, position: { x: pos.x - 130, y: pos.y - pos.height / 2 } };
    }),
    edges,
  };
}

interface ERDiagramProps {
  tables: TableInfo[];
  tags: Tag[];
  connectionId: number;
}

export function ERDiagram({ tables, tags, connectionId }: ERDiagramProps) {
  const tagsByTable = useMemo(() => {
    const m = new Map<string, Tag[]>();
    for (const t of tags) {
      const k = `${t.schemaName}.${t.tableName}`;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(t);
    }
    return m;
  }, [tags]);

  const { nodes: rawNodes, edges: rawEdges } = useMemo(() => {
    const nodes: Node[] = tables.map((t) => ({
      id: `${t.schemaName}.${t.tableName}`,
      type: 'tableNode',
      position: { x: 0, y: 0 },
      data: {
        label: t.tableName,
        schemaName: t.schemaName,
        tableName: t.tableName,
        columns: t.columns,
        primaryKeys: t.primaryKeys,
        tags: tagsByTable.get(`${t.schemaName}.${t.tableName}`) ?? [],
        connectionId,
      } satisfies TableNodeData,
    }));

    const edgeSet = new Set<string>();
    const edges: Edge[] = [];
    for (const t of tables) {
      for (const fk of t.foreignKeys) {
        const edgeId = `${t.schemaName}.${t.tableName}.${fk.fromColumn}→${fk.toSchema}.${fk.toTable}.${fk.toColumn}`;
        if (edgeSet.has(edgeId)) continue;
        edgeSet.add(edgeId);
        edges.push({
          id: edgeId,
          source: `${t.schemaName}.${t.tableName}`,
          target: `${fk.toSchema}.${fk.toTable}`,
          animated: false,
          style: { stroke: 'hsl(220 60% 60%)', strokeWidth: 1.5, strokeDasharray: '5 3' },
          markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(220 60% 60%)', width: 14, height: 14 },
          label: fk.fromColumn,
          labelStyle: { fontSize: 9, fill: 'currentColor' },
          labelBgStyle: { fill: 'transparent' },
        });
      }
    }

    return { nodes, edges };
  }, [tables, tagsByTable, connectionId]);

  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(
    () => layoutGraph(rawNodes, rawEdges),
    [rawNodes, rawEdges]
  );

  const [nodes, , onNodesChange] = useNodesState(layoutedNodes);
  const [edges, , onEdgesChange] = useEdgesState(layoutedEdges);

  const onInit = useCallback((instance: { fitView: (opts?: object) => void }) => {
    instance.fitView({ padding: 0.15 });
  }, []);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      onInit={onInit}
      fitView
      fitViewOptions={{ padding: 0.15 }}
      minZoom={0.1}
      maxZoom={2}
      proOptions={{ hideAttribution: true }}
    >
      <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="var(--border)" />
      <Controls />
      <MiniMap
        nodeColor={() => 'var(--primary)'}
        maskColor="rgba(0,0,0,0.15)"
        pannable
        zoomable
      />
    </ReactFlow>
  );
}
