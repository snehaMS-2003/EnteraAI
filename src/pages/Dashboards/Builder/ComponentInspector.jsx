import React from 'react';
import { 
  Trash2, 
  Copy, 
  Database, 
  Webhook, 
  Sliders, 
  Palette, 
  Eye, 
  Plus, 
  X,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';

export function ComponentInspector({
  component,
  onUpdateComponent,
  onDeleteComponent,
  onDuplicateComponent,
  schema = { tables: [] },
  apis = { endpoints: [] },
  pages = []
}) {
  if (!component) {
    return (
      <div className="w-80 bg-dark-300/80 border-l border-white/10 p-6 flex flex-col items-center justify-center text-center select-none text-gray-400">
        <div className="p-3 bg-white/5 rounded-full mb-3">
          <Sliders className="h-6 w-6 text-gray-400" />
        </div>
        <p className="text-sm font-medium text-gray-200">No Component Selected</p>
        <p className="text-xs text-gray-400 mt-1 max-w-[200px]">
          Click any component on the canvas to configure its properties, database bindings, and API actions.
        </p>
      </div>
    );
  }

  const handleChange = (key, value) => {
    onUpdateComponent({
      ...component,
      [key]: value
    });
  };

  const handleNestedChange = (parentKey, key, value) => {
    onUpdateComponent({
      ...component,
      [parentKey]: {
        ...(component[parentKey] || {}),
        [key]: value
      }
    });
  };

  const tables = schema.tables || [];
  const endpoints = apis.endpoints || [];

  // Find columns for currently selected table in data binding
  const selectedTableObj = tables.find(t => t.name === component.dataBinding?.table);
  const availableColumns = selectedTableObj ? (selectedTableObj.columns || []) : [];

  // Find columns for table component
  const selectedTableComponentObj = tables.find(t => t.name === component.tableConfig?.tableName);
  const tableComponentColumns = selectedTableComponentObj ? (selectedTableComponentObj.columns || []) : [];

  const handleTableColumnToggle = (columnName) => {
    const currentCols = component.tableConfig?.columns || [];
    let updated;
    if (currentCols.includes(columnName)) {
      updated = currentCols.filter(c => c !== columnName);
    } else {
      updated = [...currentCols, columnName];
    }
    handleNestedChange('tableConfig', 'columns', updated);
  };

  const handleAddSelectOption = () => {
    const current = component.selectOptions || [];
    const newIdx = current.length + 1;
    handleChange('selectOptions', [
      ...current,
      { label: `Option ${newIdx}`, value: `option_${newIdx}` }
    ]);
  };

  const handleUpdateSelectOption = (idx, field, val) => {
    const current = [...(component.selectOptions || [])];
    current[idx] = { ...current[idx], [field]: val };
    handleChange('selectOptions', current);
  };

  const handleRemoveSelectOption = (idx) => {
    const current = (component.selectOptions || []).filter((_, i) => i !== idx);
    handleChange('selectOptions', current);
  };

  return (
    <div className="w-80 bg-dark-300/80 border-l border-white/10 flex flex-col h-full overflow-hidden select-none">
      {/* Inspector Header */}
      <div className="p-4 border-b border-white/10 bg-dark-200/50 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary-400 font-mono">
            {component.type}
          </span>
          <h3 className="font-semibold text-white text-sm truncate max-w-[150px]">
            {component.label || component.name || 'Component'}
          </h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            title="Duplicate component"
            onClick={() => onDuplicateComponent(component.id)}
            className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <Copy className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Delete component"
            onClick={() => onDeleteComponent(component.id)}
            className="p-1.5 rounded hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Inspector Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
        {/* Section 1: Identification */}
        <div className="space-y-3">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
            <Sliders className="h-3 w-3 text-primary-400" />
            General Properties
          </h4>

          <div>
            <label className="block text-gray-300 mb-1 font-medium">
              Component Identifier (ID) <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={component.name || ''}
              onChange={(e) => handleChange('name', e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '_'))}
              placeholder="e.g. user_first_name"
              className="w-full bg-dark-100/80 border border-white/10 rounded-md px-2.5 py-1.5 text-gray-200 font-mono focus:outline-none focus:border-primary-500"
            />
            <p className="text-[10px] text-gray-400 mt-1">Unique programmatic ID on this page</p>
          </div>

          {component.type !== 'divider' && (
            <div>
              <label className="block text-gray-300 mb-1 font-medium">
                {component.type === 'heading' || component.type === 'text' ? 'Display Text' : 'Label'}
              </label>
              {component.type === 'text' ? (
                <textarea
                  rows={2}
                  value={component.text || ''}
                  onChange={(e) => handleChange('text', e.target.value)}
                  className="w-full bg-dark-100/80 border border-white/10 rounded-md px-2.5 py-1.5 text-gray-200 focus:outline-none focus:border-primary-500"
                />
              ) : component.type === 'heading' ? (
                <input
                  type="text"
                  value={component.text || ''}
                  onChange={(e) => handleChange('text', e.target.value)}
                  className="w-full bg-dark-100/80 border border-white/10 rounded-md px-2.5 py-1.5 text-gray-200 focus:outline-none focus:border-primary-500"
                />
              ) : (
                <input
                  type="text"
                  value={component.label || ''}
                  onChange={(e) => handleChange('label', e.target.value)}
                  className="w-full bg-dark-100/80 border border-white/10 rounded-md px-2.5 py-1.5 text-gray-200 focus:outline-none focus:border-primary-500"
                />
              )}
            </div>
          )}

          {['input'].includes(component.type) && (
            <div>
              <label className="block text-gray-300 mb-1 font-medium">Placeholder</label>
              <input
                type="text"
                value={component.placeholder || ''}
                onChange={(e) => handleChange('placeholder', e.target.value)}
                className="w-full bg-dark-100/80 border border-white/10 rounded-md px-2.5 py-1.5 text-gray-200 focus:outline-none focus:border-primary-500"
              />
            </div>
          )}

          {component.type === 'card' && (
            <div>
              <label className="block text-gray-300 mb-1 font-medium">Card Subtitle</label>
              <input
                type="text"
                value={component.subtitle || ''}
                onChange={(e) => handleChange('subtitle', e.target.value)}
                className="w-full bg-dark-100/80 border border-white/10 rounded-md px-2.5 py-1.5 text-gray-200 focus:outline-none focus:border-primary-500"
              />
            </div>
          )}
        </div>

        {/* Section 2: Layout & Grid */}
        <div className="space-y-3 pt-3 border-t border-white/10">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
            Layout & Sizing
          </h4>

          <div>
            <label className="block text-gray-300 mb-1 font-medium">
              Column Width: {component.colSpan || 12} / 12
            </label>
            <select
              value={component.colSpan || 12}
              onChange={(e) => handleChange('colSpan', parseInt(e.target.value, 10))}
              className="w-full bg-dark-100/80 border border-white/10 rounded-md px-2.5 py-1.5 text-gray-200 focus:outline-none focus:border-primary-500"
            >
              <option value={12}>Full Width (12 Columns)</option>
              <option value={8}>Two-Thirds Width (8 Columns)</option>
              <option value={6}>Half Width (6 Columns)</option>
              <option value={4}>One-Third Width (4 Columns)</option>
              <option value={3}>One-Quarter Width (3 Columns)</option>
            </select>
          </div>

          {['input', 'select', 'checkbox', 'date'].includes(component.type) && (
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id={`req_${component.id}`}
                checked={Boolean(component.required)}
                onChange={(e) => handleChange('required', e.target.checked)}
                className="rounded border-white/20 bg-dark-100 text-primary-500 focus:ring-primary-500"
              />
              <label htmlFor={`req_${component.id}`} className="text-gray-300 font-medium cursor-pointer">
                Required Field
              </label>
            </div>
          )}
        </div>

        {/* Section 3: Select Options (Dropdown) */}
        {component.type === 'select' && (
          <div className="space-y-3 pt-3 border-t border-white/10">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                Dropdown Options
              </h4>
              <button
                type="button"
                onClick={handleAddSelectOption}
                className="text-[11px] text-primary-400 hover:text-primary-300 flex items-center gap-1"
              >
                <Plus className="h-3 w-3" /> Add
              </button>
            </div>

            <div className="space-y-2">
              {(component.selectOptions || []).map((opt, idx) => (
                <div key={idx} className="flex items-center gap-1.5">
                  <input
                    type="text"
                    placeholder="Label"
                    value={opt.label || ''}
                    onChange={(e) => handleUpdateSelectOption(idx, 'label', e.target.value)}
                    className="flex-1 bg-dark-100/80 border border-white/10 rounded px-2 py-1 text-gray-200 text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Value"
                    value={opt.value || ''}
                    onChange={(e) => handleUpdateSelectOption(idx, 'value', e.target.value)}
                    className="flex-1 bg-dark-100/80 border border-white/10 rounded px-2 py-1 text-gray-200 text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveSelectOption(idx)}
                    className="p-1 text-gray-400 hover:text-red-400"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 4: Database Schema Binding (Requirement 6) */}
        {['input', 'select', 'checkbox', 'date'].includes(component.type) && (
          <div className="space-y-3 pt-3 border-t border-white/10">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5" />
              Database Field Binding
            </h4>

            <div>
              <label className="block text-gray-300 mb-1 font-medium">Schema Table</label>
              <select
                value={component.dataBinding?.table || ''}
                onChange={(e) => {
                  const newTbl = e.target.value;
                  onUpdateComponent({
                    ...component,
                    dataBinding: { table: newTbl, column: '' }
                  });
                }}
                className="w-full bg-dark-100/80 border border-white/10 rounded-md px-2.5 py-1.5 text-gray-200 focus:outline-none focus:border-blue-500"
              >
                <option value="">-- No Table Binding --</option>
                {tables.map((t) => (
                  <option key={t.id || t.name} value={t.name}>
                    {t.name} ({(t.columns || []).length} cols)
                  </option>
                ))}
              </select>
            </div>

            {component.dataBinding?.table && (
              <div>
                <label className="block text-gray-300 mb-1 font-medium">Column Field</label>
                <select
                  value={component.dataBinding?.column || ''}
                  onChange={(e) => handleNestedChange('dataBinding', 'column', e.target.value)}
                  className="w-full bg-dark-100/80 border border-white/10 rounded-md px-2.5 py-1.5 text-gray-200 focus:outline-none focus:border-blue-500 font-mono"
                >
                  <option value="">-- Select Column --</option>
                  {availableColumns.map((col) => (
                    <option key={col.id || col.name} value={col.name}>
                      {col.name} ({col.type}) {col.primaryKey ? '🔑 PK' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Section 5: Table Component Configuration */}
        {component.type === 'table' && (
          <div className="space-y-3 pt-3 border-t border-white/10">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5" />
              Data Source Binding
            </h4>

            <div>
              <label className="block text-gray-300 mb-1 font-medium">Bind to Schema Table</label>
              <select
                value={component.tableConfig?.tableName || ''}
                onChange={(e) => {
                  const tbl = e.target.value;
                  const tObj = tables.find(x => x.name === tbl);
                  const allCols = tObj ? (tObj.columns || []).map(c => c.name) : [];
                  onUpdateComponent({
                    ...component,
                    tableConfig: {
                      ...(component.tableConfig || {}),
                      tableName: tbl,
                      columns: allCols
                    }
                  });
                }}
                className="w-full bg-dark-100/80 border border-white/10 rounded-md px-2.5 py-1.5 text-gray-200 focus:outline-none focus:border-blue-500"
              >
                <option value="">-- Select Database Table --</option>
                {tables.map((t) => (
                  <option key={t.id || t.name} value={t.name}>
                    {t.name} ({(t.columns || []).length} cols)
                  </option>
                ))}
              </select>
            </div>

            {component.tableConfig?.tableName && (
              <div className="space-y-1.5">
                <label className="block text-gray-300 mb-1 font-medium">Select Columns to Display</label>
                <div className="space-y-1 bg-dark-100/50 p-2 rounded-md border border-white/5 max-h-36 overflow-y-auto">
                  {tableComponentColumns.map((col) => {
                    const isChecked = (component.tableConfig?.columns || []).includes(col.name);
                    return (
                      <label key={col.id || col.name} className="flex items-center gap-2 text-gray-300 hover:text-white cursor-pointer py-0.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleTableColumnToggle(col.name)}
                          className="rounded border-white/20 bg-dark-200 text-primary-500"
                        />
                        <span className="font-mono text-xs">{col.name}</span>
                        <span className="text-[10px] text-gray-400">({col.type})</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <label className="block text-gray-300 mb-1 font-medium">Bind to REST API (GET)</label>
              <select
                value={component.tableConfig?.apiEndpoint || ''}
                onChange={(e) => handleNestedChange('tableConfig', 'apiEndpoint', e.target.value)}
                className="w-full bg-dark-100/80 border border-white/10 rounded-md px-2.5 py-1.5 text-gray-200 focus:outline-none focus:border-purple-500 font-mono"
              >
                <option value="">-- No API Binding --</option>
                {endpoints.filter(e => e.method === 'GET').map((ep) => (
                  <option key={ep.id || ep.path} value={`${ep.method} ${ep.path}`}>
                    {ep.method} {ep.path} ({ep.description || 'Endpoint'})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Section 6: Action Button Configuration (Requirement 7) */}
        {component.type === 'button' && (
          <div className="space-y-3 pt-3 border-t border-white/10">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
              <Webhook className="h-3.5 w-3.5" />
              Action & API Trigger
            </h4>

            <div>
              <label className="block text-gray-300 mb-1 font-medium">Action Type</label>
              <select
                value={component.buttonConfig?.actionType || 'api'}
                onChange={(e) => handleNestedChange('buttonConfig', 'actionType', e.target.value)}
                className="w-full bg-dark-100/80 border border-white/10 rounded-md px-2.5 py-1.5 text-gray-200 focus:outline-none focus:border-purple-500"
              >
                <option value="api">Trigger REST API</option>
                <option value="navigate">Navigate to Page</option>
                <option value="submit">Submit Form</option>
              </select>
            </div>

            {component.buttonConfig?.actionType === 'api' && (
              <div>
                <label className="block text-gray-300 mb-1 font-medium">Select REST API</label>
                <select
                  value={component.buttonConfig?.apiEndpoint || ''}
                  onChange={(e) => handleNestedChange('buttonConfig', 'apiEndpoint', e.target.value)}
                  className="w-full bg-dark-100/80 border border-white/10 rounded-md px-2.5 py-1.5 text-gray-200 focus:outline-none focus:border-purple-500 font-mono"
                >
                  <option value="">-- Select API Endpoint --</option>
                  {endpoints.map((ep) => (
                    <option key={ep.id || ep.path} value={`${ep.method} ${ep.path}`}>
                      {ep.method} {ep.path} - {ep.description || 'Action'}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {component.buttonConfig?.actionType === 'navigate' && (
              <div>
                <label className="block text-gray-300 mb-1 font-medium">Target Page</label>
                <select
                  value={component.buttonConfig?.targetPage || ''}
                  onChange={(e) => handleNestedChange('buttonConfig', 'targetPage', e.target.value)}
                  className="w-full bg-dark-100/80 border border-white/10 rounded-md px-2.5 py-1.5 text-gray-200 focus:outline-none focus:border-purple-500"
                >
                  <option value="">-- Choose Page --</option>
                  {pages.map((p) => (
                    <option key={p.id || p.slug} value={p.slug}>
                      {p.name} (/{p.slug})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-gray-300 mb-1 font-medium">Visual Style Variant</label>
              <select
                value={component.styling?.variant || 'primary'}
                onChange={(e) => handleNestedChange('styling', 'variant', e.target.value)}
                className="w-full bg-dark-100/80 border border-white/10 rounded-md px-2.5 py-1.5 text-gray-200 focus:outline-none focus:border-primary-500"
              >
                <option value="primary">Primary Gradient</option>
                <option value="secondary">Secondary Glass</option>
                <option value="outline">Outline</option>
                <option value="destructive">Destructive / Red</option>
              </select>
            </div>
          </div>
        )}

        {/* Section 7: Form Wrapper API Binding */}
        {component.type === 'form' && (
          <div className="space-y-3 pt-3 border-t border-white/10">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
              <Webhook className="h-3.5 w-3.5" />
              Form Submission API
            </h4>

            <div>
              <label className="block text-gray-300 mb-1 font-medium">Submit API Endpoint</label>
              <select
                value={component.apiBinding?.endpoint || ''}
                onChange={(e) => handleNestedChange('apiBinding', 'endpoint', e.target.value)}
                className="w-full bg-dark-100/80 border border-white/10 rounded-md px-2.5 py-1.5 text-gray-200 focus:outline-none focus:border-purple-500 font-mono"
              >
                <option value="">-- Select Submit Endpoint --</option>
                {endpoints.filter(e => e.method === 'POST' || e.method === 'PUT').map((ep) => (
                  <option key={ep.id || ep.path} value={`${ep.method} ${ep.path}`}>
                    {ep.method} {ep.path} ({ep.description || 'Endpoint'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-300 mb-1 font-medium">Submit Button Text</label>
              <input
                type="text"
                value={component.submitLabel || 'Submit Data'}
                onChange={(e) => handleChange('submitLabel', e.target.value)}
                className="w-full bg-dark-100/80 border border-white/10 rounded-md px-2.5 py-1.5 text-gray-200 focus:outline-none focus:border-primary-500"
              />
            </div>
          </div>
        )}

        {/* Section 8: Typography Options */}
        {component.type === 'heading' && (
          <div className="space-y-3 pt-3 border-t border-white/10">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
              Heading Level
            </h4>
            <div className="grid grid-cols-3 gap-2">
              {['h1', 'h2', 'h3'].map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => handleChange('level', lvl)}
                  className={`py-1 rounded font-bold uppercase border transition-colors ${
                    component.level === lvl 
                      ? 'border-primary-500 bg-primary-500/20 text-white' 
                      : 'border-white/10 bg-white/5 text-gray-400 hover:text-white'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
