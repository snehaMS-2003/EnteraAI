import React from 'react';
import { 
  ArrowUp, 
  ArrowDown, 
  Copy, 
  Trash2, 
  Database, 
  Webhook, 
  Layers, 
  PlusCircle,
  Table as TableIcon
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';

export function CanvasView({
  components = [],
  selectedComponentId,
  onSelectComponent,
  onMoveComponent,
  onDuplicateComponent,
  onDeleteComponent,
  schema = { tables: [] },
  apis = { endpoints: [] }
}) {
  const getColSpanClass = (span) => {
    switch (span) {
      case 12: return 'col-span-12';
      case 8: return 'col-span-12 md:col-span-8';
      case 6: return 'col-span-12 md:col-span-6';
      case 4: return 'col-span-12 md:col-span-4';
      case 3: return 'col-span-12 md:col-span-3';
      default: return 'col-span-12';
    }
  };

  if (!components || components.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center min-h-[500px]">
        <div className="p-4 bg-primary-500/10 rounded-full border border-primary-500/20 mb-4 animate-pulse">
          <PlusCircle className="h-10 w-10 text-primary-400" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">Canvas is Empty</h3>
        <p className="text-gray-400 text-sm max-w-md mb-6">
          Add components from the palette on the left to start building your application screen. You can bind them to your database tables and REST APIs.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-dark-400/40">
      <div className="max-w-5xl mx-auto grid grid-cols-12 gap-4 pb-16">
        {components.map((comp, index) => {
          const isSelected = comp.id === selectedComponentId;
          const colClass = getColSpanClass(comp.colSpan || 12);

          return (
            <div
              key={comp.id}
              onClick={(e) => {
                e.stopPropagation();
                onSelectComponent(comp.id);
              }}
              className={`${colClass} relative group transition-all duration-150 cursor-pointer rounded-xl border ${
                isSelected
                  ? 'border-primary-500 bg-primary-500/[0.04] ring-2 ring-primary-500/30'
                  : 'border-white/10 bg-dark-200/50 hover:border-white/25 hover:bg-dark-200/80'
              } p-4`}
            >
              {/* Component Info Bar & Controls on Hover/Selection */}
              <div
                className={`absolute -top-3 left-3 flex items-center gap-1.5 z-10 transition-opacity ${
                  isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}
              >
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-primary-600 text-white shadow-sm">
                  {comp.type}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-dark-100 text-gray-300 border border-white/10">
                  {comp.name || comp.id}
                </span>
              </div>

              {/* Action Toolbar */}
              <div
                className={`absolute -top-3 right-3 flex items-center gap-1 bg-dark-100 border border-white/10 rounded-lg p-0.5 shadow-md z-10 transition-opacity ${
                  isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}
              >
                <button
                  type="button"
                  title="Move Up"
                  disabled={index === 0}
                  onClick={(e) => {
                    e.stopPropagation();
                    onMoveComponent(index, index - 1);
                  }}
                  className="p-1 text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:text-gray-400"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  title="Move Down"
                  disabled={index === components.length - 1}
                  onClick={(e) => {
                    e.stopPropagation();
                    onMoveComponent(index, index + 1);
                  }}
                  className="p-1 text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:text-gray-400"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  title="Duplicate"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicateComponent(comp.id);
                  }}
                  className="p-1 text-gray-400 hover:text-white"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  title="Delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteComponent(comp.id);
                  }}
                  className="p-1 text-gray-400 hover:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Render Component Content */}
              <div className="pt-2">
                {renderComponentPreview(comp, schema)}
              </div>

              {/* Binding Tags at bottom */}
              <div className="mt-3 pt-2 border-t border-white/5 flex flex-wrap items-center gap-2 text-[10px]">
                {comp.dataBinding?.table && (
                  <span className="inline-flex items-center gap-1 text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 font-mono">
                    <Database className="h-2.5 w-2.5" />
                    {comp.dataBinding.table}
                    {comp.dataBinding.column ? `.${comp.dataBinding.column}` : ''}
                  </span>
                )}
                {(comp.apiBinding?.endpoint || comp.buttonConfig?.apiEndpoint || comp.tableConfig?.apiEndpoint) && (
                  <span className="inline-flex items-center gap-1 text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20 font-mono">
                    <Webhook className="h-2.5 w-2.5" />
                    {comp.apiBinding?.endpoint || comp.buttonConfig?.apiEndpoint || comp.tableConfig?.apiEndpoint}
                  </span>
                )}
                {comp.required && (
                  <span className="text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                    Required
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function renderComponentPreview(comp, schema) {
  switch (comp.type) {
    case 'heading': {
      if (comp.level === 'h1') return <h1 className="text-2xl font-bold text-white">{comp.text || 'Heading 1'}</h1>;
      if (comp.level === 'h3') return <h3 className="text-lg font-bold text-white">{comp.text || 'Heading 3'}</h3>;
      return <h2 className="text-xl font-bold text-white">{comp.text || 'Heading 2'}</h2>;
    }

    case 'text':
      return <p className="text-sm text-gray-300 leading-relaxed">{comp.text || 'Text content'}</p>;

    case 'divider':
      return <hr className="border-white/10 my-1" />;

    case 'card':
      return (
        <div className="space-y-1">
          <h4 className="text-base font-bold text-white">{comp.label || 'Card Title'}</h4>
          {comp.subtitle && <p className="text-xs text-gray-400">{comp.subtitle}</p>}
          <div className="mt-3 p-4 rounded-lg bg-white/[0.02] border border-dashed border-white/10 text-center text-xs text-gray-500">
            Card Content Container
          </div>
        </div>
      );

    case 'container':
      return (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
            <span className="font-medium text-gray-300">{comp.label || 'Section Container'}</span>
            <span>Grid Layout ({comp.columns || 2} columns)</span>
          </div>
          <div className="p-6 rounded-lg bg-white/[0.02] border border-dashed border-white/10 text-center text-xs text-gray-500">
            Section Grid Dropzone
          </div>
        </div>
      );

    case 'form':
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-white">{comp.label || 'Form Container'}</span>
            {comp.apiBinding?.endpoint && (
              <span className="text-[10px] text-purple-400 font-mono">
                API: {comp.apiBinding.endpoint}
              </span>
            )}
          </div>
          <div className="p-4 rounded-lg bg-white/[0.02] border border-white/5 space-y-2">
            <div className="text-xs text-gray-400 italic">Form fields are placed on the canvas and submitted together.</div>
            <div className="pt-2 flex justify-end">
              <Button size="sm" variant="primary" className="text-xs">
                {comp.submitLabel || 'Submit Data'}
              </Button>
            </div>
          </div>
        </div>
      );

    case 'input':
      return (
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-gray-300">
            {comp.label || 'Input Field'}
            {comp.required && <span className="text-red-400 ml-1">*</span>}
          </label>
          <div className="h-9 px-3 rounded-lg border border-white/10 bg-dark-100 flex items-center text-xs text-gray-500">
            {comp.placeholder || 'Enter value...'}
          </div>
        </div>
      );

    case 'select':
      return (
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-gray-300">
            {comp.label || 'Dropdown Selection'}
            {comp.required && <span className="text-red-400 ml-1">*</span>}
          </label>
          <div className="h-9 px-3 rounded-lg border border-white/10 bg-dark-100 flex items-center justify-between text-xs text-gray-400">
            <span>{comp.placeholder || '-- Select an option --'}</span>
            <span className="text-[10px]">▼</span>
          </div>
        </div>
      );

    case 'checkbox':
      return (
        <div className="flex items-center gap-2.5 pt-1">
          <div className="h-4 w-4 rounded border border-white/20 bg-dark-100 flex items-center justify-center">
            {comp.defaultChecked && <span className="text-xs text-primary-400">✓</span>}
          </div>
          <span className="text-xs text-gray-200">{comp.label || 'Checkbox option'}</span>
        </div>
      );

    case 'date':
      return (
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-gray-300">
            {comp.label || 'Select Date'}
            {comp.required && <span className="text-red-400 ml-1">*</span>}
          </label>
          <div className="h-9 px-3 rounded-lg border border-white/10 bg-dark-100 flex items-center justify-between text-xs text-gray-400">
            <span>YYYY-MM-DD</span>
            <span className="text-xs">📅</span>
          </div>
        </div>
      );

    case 'button':
      return (
        <div className="flex items-center gap-2">
          <Button 
            size={comp.styling?.size || 'default'} 
            variant={comp.styling?.variant || 'primary'}
            className="pointer-events-none"
          >
            {comp.label || 'Click Action'}
          </Button>
        </div>
      );

    case 'table': {
      const tableName = comp.tableConfig?.tableName || 'Table';
      const columns = comp.tableConfig?.columns || ['id', 'name', 'status'];

      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TableIcon className="h-4 w-4 text-blue-400" />
              <span className="text-sm font-bold text-white">{comp.label || 'Records Table'}</span>
            </div>
            {comp.tableConfig?.tableName && (
              <span className="text-xs font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                Bound to: {tableName}
              </span>
            )}
          </div>

          <div className="overflow-x-auto rounded-lg border border-white/10 bg-dark-100/50">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  {columns.map((col) => (
                    <th key={col} className="p-2.5 font-medium text-gray-300 font-mono">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {[1, 2].map((row) => (
                  <tr key={row} className="text-gray-400">
                    {columns.map((col, idx) => (
                      <td key={col} className="p-2.5 font-mono">
                        {idx === 0 ? `${row}` : idx === 1 ? `Sample ${col} ${row}` : `Active`}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    case 'metric':
      return (
        <div className="space-y-1">
          <p className="text-xs text-gray-400 font-medium">{comp.label || 'Metric Indicator'}</p>
          <p className="text-2xl font-bold text-white">{comp.value || '128'}</p>
          {comp.subtitle && <p className="text-[11px] text-green-400">{comp.subtitle}</p>}
        </div>
      );

    default:
      return <div className="text-xs text-gray-400">Component: {comp.type}</div>;
  }
}
