import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database, Plus, Trash2, Edit3, Key, Link2, Check, AlertCircle,
  Save, ArrowLeft, ArrowRight, RefreshCw, X, Shield, Table as TableIcon,
  HelpCircle, ChevronRight, CheckCircle2, AlertTriangle, Layers
} from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { useAuth, orgFetch } from '../../../hooks/useAuth';

const DATA_TYPES = [
  { value: 'varchar', label: 'VARCHAR (String, max 255 chars)' },
  { value: 'text', label: 'TEXT (Long form text)' },
  { value: 'integer', label: 'INTEGER (Whole numbers)' },
  { value: 'numeric', label: 'NUMERIC (Decimal / Currency)' },
  { value: 'boolean', label: 'BOOLEAN (True / False)' },
  { value: 'timestamp', label: 'TIMESTAMP (Date and Time)' },
  { value: 'date', label: 'DATE (Calendar date YYYY-MM-DD)' },
  { value: 'uuid', label: 'UUID (Universally Unique ID)' },
  { value: 'jsonb', label: 'JSONB (Structured JSON document)' }
];

export function DatabaseSchema({ application, basePath = '', isStandalone = false }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isWorkflowWizard = location.pathname.includes('/workflow/');

  const [schemaData, setSchemaData] = useState({ tables: [] });
  const [initialSchemaJson, setInitialSchemaJson] = useState('{"tables":[]}');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');
  
  // UI State: Active View ('tables' or 'relationships')
  const [activeView, setActiveView] = useState('tables');

  // Modal State: Create / Edit Table
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTableIndex, setEditingTableIndex] = useState(null);
  const [tableFormData, setTableFormData] = useState({
    name: '',
    description: '',
    columns: [
      {
        name: 'id',
        type: 'integer',
        primaryKey: true,
        nullable: false,
        unique: true,
        defaultValue: '',
        isForeignKey: false,
        foreignKey: { referencedTable: '', referencedColumn: '', onDelete: 'CASCADE' }
      }
    ]
  });
  const [modalErrors, setModalErrors] = useState([]);

  // Delete Confirmation Dialog
  const [tableToDelete, setTableToDelete] = useState(null);

  // Check if unsaved changes exist
  const hasUnsavedChanges = useMemo(() => {
    return JSON.stringify(schemaData) !== initialSchemaJson;
  }, [schemaData, initialSchemaJson]);

  // Fetch real schema from PostgreSQL backend
  const fetchSchema = useCallback(async () => {
    if (!application?.id) return;
    setLoading(true);
    setSaveError('');
    try {
      const res = await orgFetch(`/api/designer/applications/${application.id}/schema`);
      if (res.ok) {
        const data = await res.json();
        const normalized = data && Array.isArray(data.tables) ? data : { tables: [] };
        setSchemaData(normalized);
        setInitialSchemaJson(JSON.stringify(normalized));
      } else {
        const err = await res.json().catch(() => ({}));
        setSaveError(err.error || 'Failed to load database schema');
      }
    } catch (err) {
      console.error('Fetch schema error:', err);
      setSaveError('Network error while connecting to database service');
    } finally {
      setLoading(false);
    }
  }, [application?.id]);

  useEffect(() => {
    fetchSchema();
  }, [fetchSchema]);

  // Save schema to backend with full validation
  const handleSave = async (redirectAfter = false) => {
    setSaving(true);
    setSaveSuccess(false);
    setSaveError('');

    try {
      const res = await orgFetch(`/api/designer/applications/${application.id}/schema`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schema_data: schemaData })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save schema');
      }

      setSaveSuccess(true);
      setInitialSchemaJson(JSON.stringify(schemaData));
      setTimeout(() => setSaveSuccess(false), 3000);

      if (redirectAfter && isWorkflowWizard) {
        navigate(`${basePath}/apps/${application.id}/workflow/apis`);
      }
    } catch (err) {
      console.error('Save schema error:', err);
      setSaveError(err.message || 'An error occurred while saving the schema.');
    } finally {
      setSaving(false);
    }
  };

  // Open Create Table Modal
  const openCreateTableModal = () => {
    setEditingTableIndex(null);
    setTableFormData({
      name: '',
      description: '',
      columns: [
        {
          name: 'id',
          type: 'integer',
          primaryKey: true,
          nullable: false,
          unique: true,
          defaultValue: '',
          isForeignKey: false,
          foreignKey: { referencedTable: '', referencedColumn: '', onDelete: 'CASCADE' }
        }
      ]
    });
    setModalErrors([]);
    setIsModalOpen(true);
  };

  // Open Edit Table Modal
  const openEditTableModal = (idx) => {
    const table = schemaData.tables[idx];
    setEditingTableIndex(idx);
    setTableFormData({
      name: table.name || '',
      description: table.description || '',
      columns: (table.columns || []).map(c => ({
        name: c.name || '',
        type: c.type || 'varchar',
        primaryKey: !!c.primaryKey,
        nullable: c.nullable !== undefined ? !!c.nullable : !c.primaryKey,
        unique: !!c.unique,
        defaultValue: c.defaultValue || '',
        isForeignKey: !!(c.isForeignKey || c.foreignKey?.referencedTable),
        foreignKey: {
          referencedTable: c.foreignKey?.referencedTable || '',
          referencedColumn: c.foreignKey?.referencedColumn || '',
          onDelete: c.foreignKey?.onDelete || 'CASCADE'
        }
      }))
    });
    setModalErrors([]);
    setIsModalOpen(true);
  };

  // Add column to table form
  const addColumnToForm = () => {
    setTableFormData(prev => ({
      ...prev,
      columns: [
        ...prev.columns,
        {
          name: '',
          type: 'varchar',
          primaryKey: false,
          nullable: true,
          unique: false,
          defaultValue: '',
          isForeignKey: false,
          foreignKey: { referencedTable: '', referencedColumn: '', onDelete: 'CASCADE' }
        }
      ]
    }));
  };

  // Remove column from table form
  const removeColumnFromForm = (colIdx) => {
    setTableFormData(prev => ({
      ...prev,
      columns: prev.columns.filter((_, i) => i !== colIdx)
    }));
  };

  // Update specific column in table form
  const updateColumnInForm = (colIdx, field, value) => {
    setTableFormData(prev => {
      const nextCols = [...prev.columns];
      const col = { ...nextCols[colIdx], [field]: value };

      // If set as PK, enforce not null and unique
      if (field === 'primaryKey' && value === true) {
        col.nullable = false;
        col.unique = true;
      }

      nextCols[colIdx] = col;
      return { ...prev, columns: nextCols };
    });
  };

  // Validate and submit Table modal
  const handleSaveTableForm = (e) => {
    e.preventDefault();
    const errors = [];
    const trimmedName = (tableFormData.name || '').trim().toLowerCase();

    if (!trimmedName) {
      errors.push('Table name is required.');
    } else if (!/^[a-z][a-z0-9_]{0,62}$/.test(trimmedName)) {
      errors.push('Table name must start with a lowercase letter and contain only letters, numbers, and underscores (max 63 characters).');
    }

    // Check duplicate table name
    const isDuplicate = schemaData.tables.some((t, i) => i !== editingTableIndex && (t.name || '').trim().toLowerCase() === trimmedName);
    if (isDuplicate) {
      errors.push(`A table named "${trimmedName}" already exists in this schema.`);
    }

    if (tableFormData.columns.length === 0) {
      errors.push('The table must have at least one column.');
    }

    const colNames = new Set();
    let hasPK = false;

    tableFormData.columns.forEach((col, idx) => {
      const cName = (col.name || '').trim().toLowerCase();
      if (!cName) {
        errors.push(`Column #${idx + 1}: Name cannot be empty.`);
      } else if (!/^[a-z][a-z0-9_]{0,62}$/.test(cName)) {
        errors.push(`Column "${col.name}": Name must begin with a letter and contain only alphanumeric characters and underscores.`);
      } else if (colNames.has(cName)) {
        errors.push(`Column "${cName}": Duplicate column name detected in table.`);
      }
      colNames.add(cName);

      if (col.primaryKey) hasPK = true;

      if (col.isForeignKey) {
        if (!col.foreignKey.referencedTable) {
          errors.push(`Column "${col.name}": Please select a referenced table for the foreign key.`);
        }
        if (!col.foreignKey.referencedColumn) {
          errors.push(`Column "${col.name}": Please select a referenced column for the foreign key.`);
        }
      }
    });

    if (!hasPK) {
      errors.push('The table must designate at least one column as a Primary Key (PK).');
    }

    if (errors.length > 0) {
      setModalErrors(errors);
      return;
    }

    // Prepare table object
    const finalizedTable = {
      name: trimmedName,
      description: tableFormData.description.trim(),
      columns: tableFormData.columns.map(c => ({
        name: c.name.trim().toLowerCase(),
        type: c.type || 'varchar',
        primaryKey: !!c.primaryKey,
        nullable: !!c.nullable,
        unique: !!c.unique,
        defaultValue: (c.defaultValue || '').trim(),
        isForeignKey: !!c.isForeignKey,
        foreignKey: c.isForeignKey ? {
          referencedTable: c.foreignKey.referencedTable,
          referencedColumn: c.foreignKey.referencedColumn,
          onDelete: c.foreignKey.onDelete || 'CASCADE'
        } : null
      }))
    };

    setSchemaData(prev => {
      let nextTables;
      if (editingTableIndex !== null) {
        nextTables = prev.tables.map((t, i) => i === editingTableIndex ? finalizedTable : t);
      } else {
        nextTables = [...(prev.tables || []), finalizedTable];
      }
      return { ...prev, tables: nextTables };
    });

    setIsModalOpen(false);
  };

  // Check dependencies before table delete
  const initiateDeleteTable = (idx) => {
    const table = schemaData.tables[idx];
    const tableName = (table.name || '').toLowerCase();

    // Check if other tables reference this table
    const dependentTables = [];
    schemaData.tables.forEach((t, i) => {
      if (i !== idx) {
        (t.columns || []).forEach(c => {
          if ((c.foreignKey?.referencedTable || '').toLowerCase() === tableName) {
            dependentTables.push({ tableName: t.name, columnName: c.name });
          }
        });
      }
    });

    setTableToDelete({
      index: idx,
      name: table.name,
      dependencies: dependentTables
    });
  };

  const confirmDeleteTable = () => {
    if (!tableToDelete) return;
    setSchemaData(prev => ({
      ...prev,
      tables: prev.tables.filter((_, i) => i !== tableToDelete.index)
    }));
    setTableToDelete(null);
  };

  // Compute table relationships for visualization
  const relationships = useMemo(() => {
    const rels = [];
    (schemaData.tables || []).forEach(table => {
      (table.columns || []).forEach(col => {
        if (col.isForeignKey && col.foreignKey?.referencedTable) {
          rels.push({
            fromTable: table.name,
            fromColumn: col.name,
            toTable: col.foreignKey.referencedTable,
            toColumn: col.foreignKey.referencedColumn || 'id',
            onDelete: col.foreignKey.onDelete || 'CASCADE'
          });
        }
      });
    });
    return rels;
  }, [schemaData.tables]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="h-8 w-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
        <p className="text-gray-400 text-sm">Loading application database schema...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Database className="h-6 w-6 text-primary-400" />
            <h2 className="text-2xl font-bold text-white tracking-tight">Database Schema</h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary-500/10 text-primary-400 border border-primary-500/20 font-semibold font-mono">
              {schemaData.tables?.length || 0} Tables
            </span>
            {hasUnsavedChanges && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                Unsaved Changes
              </span>
            )}
          </div>
          <p className="text-gray-400 text-sm mt-1">
            Design and manage relational database tables, data types, constraints, and relationships for <strong className="text-gray-200">{application?.app_name}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="bg-dark-300 p-1 rounded-lg border border-white/10 flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveView('tables')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeView === 'tables' ? 'bg-primary-600 text-white shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              <TableIcon className="h-3.5 w-3.5" />
              Tables View
            </button>
            <button
              type="button"
              onClick={() => setActiveView('relationships')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeView === 'relationships' ? 'bg-primary-600 text-white shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Link2 className="h-3.5 w-3.5" />
              Relationships ({relationships.length})
            </button>
          </div>

          <Button onClick={openCreateTableModal} className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white font-medium shadow-md">
            <Plus className="h-4 w-4" />
            Create Table
          </Button>

          <Button
            onClick={() => handleSave(false)}
            disabled={saving || !hasUnsavedChanges}
            variant="outline"
            className={`gap-2 ${hasUnsavedChanges ? 'border-primary-500 text-primary-300 hover:bg-primary-500/10' : 'border-white/10 text-gray-400'}`}
          >
            {saving ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : saveSuccess ? (
              <Check className="h-4 w-4 text-emerald-400" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save Schema'}
          </Button>
        </div>
      </div>

      {/* Save Notifications */}
      {saveError && (
        <div className="p-4 bg-red-950/40 border border-red-500/40 rounded-xl text-red-300 text-sm flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">{saveError}</p>
            <p className="text-xs text-red-300/80">Please inspect your table definitions and column constraints before saving.</p>
          </div>
        </div>
      )}

      {saveSuccess && (
        <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-emerald-300 text-sm flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          <span>Database schema saved and synchronized with PostgreSQL persistence store.</span>
        </div>
      )}

      {/* VIEW 1: TABLES VIEW */}
      {activeView === 'tables' && (
        <div className="space-y-4">
          {(!schemaData.tables || schemaData.tables.length === 0) ? (
            <div className="text-center py-16 border-2 border-dashed border-white/10 rounded-2xl bg-dark-400/20">
              <Database className="h-14 w-14 text-gray-500 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-bold text-white mb-2">No database tables defined yet</h3>
              <p className="text-gray-400 text-sm max-w-md mx-auto mb-6">
                Define relational tables and data attributes. Entera automatically generates dynamic persistence storage and RESTful APIs based on this schema.
              </p>
              <Button onClick={openCreateTableModal} className="gap-2 bg-primary-600 hover:bg-primary-500">
                <Plus className="h-4 w-4" />
                Create Your First Table
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {schemaData.tables.map((table, idx) => {
                const pkCount = (table.columns || []).filter(c => c.primaryKey).length;
                const fkCount = (table.columns || []).filter(c => c.isForeignKey).length;

                return (
                  <Card key={idx} className="p-5 border-white/10 hover:border-white/20 transition-all bg-dark-300/60">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-primary-500/10 text-primary-400 border border-primary-500/20">
                          <TableIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold text-white font-mono">{table.name}</h3>
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/5 text-gray-300 font-mono">
                              {table.columns?.length || 0} Columns
                            </span>
                            {pkCount > 0 && (
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1 font-mono">
                                <Key className="h-3 w-3" /> PK
                              </span>
                            )}
                            {fkCount > 0 && (
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1 font-mono">
                                <Link2 className="h-3 w-3" /> {fkCount} FK
                              </span>
                            )}
                          </div>
                          {table.description && (
                            <p className="text-xs text-gray-400 mt-1">{table.description}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditTableModal(idx)}
                          className="gap-1.5 text-xs border-white/10 hover:bg-white/5"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          Edit Table
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => initiateDeleteTable(idx)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-2"
                          title="Delete Table"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Columns Preview Table */}
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-dark-400/50 text-gray-400 uppercase tracking-wider font-mono">
                          <tr>
                            <th className="py-2 px-3">Column Name</th>
                            <th className="py-2 px-3">Data Type</th>
                            <th className="py-2 px-3">Primary Key</th>
                            <th className="py-2 px-3">Nullable</th>
                            <th className="py-2 px-3">Unique</th>
                            <th className="py-2 px-3">Default</th>
                            <th className="py-2 px-3">Foreign Key</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 font-mono text-gray-300">
                          {(table.columns || []).map((col, cIdx) => (
                            <tr key={cIdx} className="hover:bg-white/[0.02]">
                              <td className="py-2 px-3 font-semibold text-white flex items-center gap-1.5">
                                {col.primaryKey && <Key className="h-3 w-3 text-amber-400 shrink-0" />}
                                <span>{col.name}</span>
                              </td>
                              <td className="py-2 px-3 uppercase text-primary-400">{col.type}</td>
                              <td className="py-2 px-3">
                                {col.primaryKey ? <span className="text-emerald-400 font-bold">YES</span> : <span className="text-gray-600">&mdash;</span>}
                              </td>
                              <td className="py-2 px-3">
                                {col.nullable ? <span className="text-gray-400">NULL</span> : <span className="text-rose-400 font-semibold">NOT NULL</span>}
                              </td>
                              <td className="py-2 px-3">
                                {col.unique ? <span className="text-blue-400 font-semibold">UNIQUE</span> : <span className="text-gray-600">&mdash;</span>}
                              </td>
                              <td className="py-2 px-3 text-gray-400">
                                {col.defaultValue || <span className="text-gray-600">&mdash;</span>}
                              </td>
                              <td className="py-2 px-3">
                                {col.isForeignKey ? (
                                  <span className="text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 text-[10px]">
                                    &rarr; {col.foreignKey?.referencedTable}({col.foreignKey?.referencedColumn || 'id'})
                                  </span>
                                ) : (
                                  <span className="text-gray-600">&mdash;</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: RELATIONSHIPS VIEW */}
      {activeView === 'relationships' && (
        <div className="space-y-4">
          {relationships.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-white/10 rounded-2xl bg-dark-400/20">
              <Link2 className="h-12 w-12 text-gray-500 mx-auto mb-3 opacity-50" />
              <h3 className="text-base font-bold text-white mb-1">No relationships defined</h3>
              <p className="text-gray-400 text-xs max-w-sm mx-auto">
                Foreign key constraints link tables together. Edit any table to declare a foreign key pointing to another table's primary key.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {relationships.map((rel, rIdx) => (
                <Card key={rIdx} className="p-5 border-white/10 bg-dark-300/80 flex flex-col justify-between">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <span className="text-xs uppercase font-bold tracking-wider text-blue-400 flex items-center gap-1.5">
                      <Link2 className="h-3.5 w-3.5" />
                      Foreign Key Constraint
                    </span>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-white/10 text-gray-300">
                      On Delete: {rel.onDelete}
                    </span>
                  </div>

                  <div className="py-4 flex items-center justify-between gap-4">
                    <div className="p-3 rounded-xl bg-dark-400/60 border border-white/10 flex-1 text-center">
                      <span className="text-xs text-gray-400 block mb-1">Source Table</span>
                      <strong className="text-sm text-white font-mono block">{rel.fromTable}</strong>
                      <span className="text-xs text-primary-400 font-mono block mt-0.5">.{rel.fromColumn}</span>
                    </div>

                    <div className="text-gray-500 flex flex-col items-center">
                      <span className="text-[10px] text-gray-400 font-semibold mb-0.5">N:1</span>
                      <ArrowRight className="h-5 w-5 text-primary-400" />
                    </div>

                    <div className="p-3 rounded-xl bg-dark-400/60 border border-white/10 flex-1 text-center">
                      <span className="text-xs text-gray-400 block mb-1">Referenced Table</span>
                      <strong className="text-sm text-white font-mono block">{rel.toTable}</strong>
                      <span className="text-xs text-emerald-400 font-mono block mt-0.5">.{rel.toColumn}</span>
                    </div>
                  </div>

                  <div className="pt-2 text-[11px] text-gray-400">
                    Ensures every <span className="font-mono text-gray-300">{rel.fromTable}.{rel.fromColumn}</span> value points to an existing <span className="font-mono text-gray-300">{rel.toTable}.{rel.toColumn}</span> record.
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Wizard Step Navigation (if rendered inside workflow wizard) */}
      {isWorkflowWizard && (
        <div className="flex justify-between items-center mt-8 pt-6 border-t border-white/10">
          <Button variant="ghost" onClick={() => navigate(`${basePath}/apps/${application.id}/workflow/config`)} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Config
          </Button>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => handleSave(false)} disabled={saving} className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Draft'}
            </Button>
            <Button onClick={() => handleSave(true)} disabled={saving} className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500">
              Next: REST APIs
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* CREATE / EDIT TABLE MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-dark-300 border border-white/10 rounded-2xl p-6 max-w-4xl w-full shadow-2xl my-8 space-y-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-primary-500/10 text-primary-400">
                    <TableIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      {editingTableIndex !== null ? `Edit Table: ${tableFormData.name}` : 'Create Database Table'}
                    </h3>
                    <p className="text-xs text-gray-400">
                      Configure table attributes, data types, and integrity constraints.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Errors */}
              {modalErrors.length > 0 && (
                <div className="p-4 bg-red-950/40 border border-red-500/40 rounded-xl text-red-300 text-xs space-y-1">
                  <p className="font-semibold text-sm">Please resolve the following validation issues:</p>
                  <ul className="list-disc pl-5 space-y-0.5">
                    {modalErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Data Safety Advisory on Edit */}
              {editingTableIndex !== null && (
                <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-xl text-amber-300 text-xs flex items-center gap-2.5">
                  <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
                  <span>Modifying or removing existing columns may affect running application entities or published snapshots. Proceed thoughtfully.</span>
                </div>
              )}

              <form onSubmit={handleSaveTableForm} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                      Table Name <span className="text-red-400">*</span>
                    </label>
                    <Input
                      placeholder="e.g. products, enrollments, courses"
                      value={tableFormData.name}
                      onChange={(e) => setTableFormData(prev => ({ ...prev, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))}
                      className="font-mono"
                      required
                    />
                    <p className="text-[11px] text-gray-500 mt-1">Must be lowercase alphanumeric with underscores.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                      Description (Optional)
                    </label>
                    <Input
                      placeholder="e.g. Student course registration records"
                      value={tableFormData.description}
                      onChange={(e) => setTableFormData(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Columns Designer */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider">Table Columns</h4>
                      <p className="text-xs text-gray-400">At least one Primary Key column is required.</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addColumnToForm}
                      className="gap-1.5 text-xs border-primary-500/40 text-primary-300 hover:bg-primary-500/10"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Column
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {tableFormData.columns.map((col, cIdx) => (
                      <div key={cIdx} className="p-4 rounded-xl bg-dark-400/50 border border-white/10 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                          {/* Column Name */}
                          <div className="md:col-span-4">
                            <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Column Name</label>
                            <Input
                              placeholder="column_name"
                              value={col.name}
                              onChange={(e) => updateColumnInForm(cIdx, 'name', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                              className="font-mono text-xs h-9"
                              required
                            />
                          </div>

                          {/* Data Type */}
                          <div className="md:col-span-4">
                            <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Data Type</label>
                            <select
                              value={col.type}
                              onChange={(e) => updateColumnInForm(cIdx, 'type', e.target.value)}
                              className="w-full bg-dark-300 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-mono text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 h-9"
                            >
                              {DATA_TYPES.map(dt => (
                                <option key={dt.value} value={dt.value}>{dt.label}</option>
                              ))}
                            </select>
                          </div>

                          {/* Default Value */}
                          <div className="md:col-span-3">
                            <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Default Value</label>
                            <Input
                              placeholder="e.g. active, 0"
                              value={col.defaultValue}
                              onChange={(e) => updateColumnInForm(cIdx, 'defaultValue', e.target.value)}
                              className="font-mono text-xs h-9"
                            />
                          </div>

                          {/* Delete Action */}
                          <div className="md:col-span-1 flex justify-end pt-4">
                            <button
                              type="button"
                              onClick={() => removeColumnFromForm(cIdx)}
                              disabled={tableFormData.columns.length <= 1}
                              className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors disabled:opacity-20"
                              title="Delete Column"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {/* Constraints Checkboxes */}
                        <div className="flex flex-wrap items-center gap-4 pt-1 border-t border-white/5 text-xs">
                          <label className="flex items-center gap-1.5 cursor-pointer text-gray-300">
                            <input
                              type="checkbox"
                              checked={col.primaryKey}
                              onChange={(e) => updateColumnInForm(cIdx, 'primaryKey', e.target.checked)}
                              className="rounded border-white/20 bg-dark-300 text-primary-500 focus:ring-primary-500"
                            />
                            <span className="font-semibold text-amber-400">Primary Key (PK)</span>
                          </label>

                          <label className="flex items-center gap-1.5 cursor-pointer text-gray-300">
                            <input
                              type="checkbox"
                              checked={col.nullable}
                              disabled={col.primaryKey}
                              onChange={(e) => updateColumnInForm(cIdx, 'nullable', e.target.checked)}
                              className="rounded border-white/20 bg-dark-300 text-primary-500 focus:ring-primary-500 disabled:opacity-50"
                            />
                            <span>Nullable</span>
                          </label>

                          <label className="flex items-center gap-1.5 cursor-pointer text-gray-300">
                            <input
                              type="checkbox"
                              checked={col.unique}
                              disabled={col.primaryKey}
                              onChange={(e) => updateColumnInForm(cIdx, 'unique', e.target.checked)}
                              className="rounded border-white/20 bg-dark-300 text-primary-500 focus:ring-primary-500 disabled:opacity-50"
                            />
                            <span>Unique</span>
                          </label>

                          <label className="flex items-center gap-1.5 cursor-pointer text-gray-300">
                            <input
                              type="checkbox"
                              checked={col.isForeignKey}
                              disabled={col.primaryKey}
                              onChange={(e) => updateColumnInForm(cIdx, 'isForeignKey', e.target.checked)}
                              className="rounded border-white/20 bg-dark-300 text-blue-500 focus:ring-blue-500 disabled:opacity-50"
                            />
                            <span className="text-blue-300 font-medium">Foreign Key (FK)</span>
                          </label>
                        </div>

                        {/* Foreign Key Detailed Selector */}
                        {col.isForeignKey && (
                          <div className="p-3 bg-blue-950/20 border border-blue-500/20 rounded-lg grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                            <div>
                              <label className="block text-[10px] uppercase font-bold text-blue-300 mb-1">Referenced Table</label>
                              <select
                                value={col.foreignKey.referencedTable}
                                onChange={(e) => {
                                  const targetTable = schemaData.tables.find(t => t.name === e.target.value);
                                  const defaultCol = targetTable?.columns?.find(c => c.primaryKey)?.name || targetTable?.columns?.[0]?.name || 'id';
                                  updateColumnInForm(cIdx, 'foreignKey', {
                                    ...col.foreignKey,
                                    referencedTable: e.target.value,
                                    referencedColumn: defaultCol
                                  });
                                }}
                                className="w-full bg-dark-300 border border-white/10 rounded px-2 py-1 text-xs font-mono text-white"
                                required
                              >
                                <option value="">-- Select Target Table --</option>
                                {schemaData.tables
                                  .filter((_, i) => i !== editingTableIndex)
                                  .map(t => (
                                    <option key={t.name} value={t.name}>{t.name}</option>
                                  ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-[10px] uppercase font-bold text-blue-300 mb-1">Referenced Column</label>
                              <select
                                value={col.foreignKey.referencedColumn}
                                onChange={(e) => updateColumnInForm(cIdx, 'foreignKey', { ...col.foreignKey, referencedColumn: e.target.value })}
                                className="w-full bg-dark-300 border border-white/10 rounded px-2 py-1 text-xs font-mono text-white"
                                required
                              >
                                <option value="">-- Select Column --</option>
                                {(() => {
                                  const targetTable = schemaData.tables.find(t => t.name === col.foreignKey.referencedTable);
                                  return (targetTable?.columns || []).map(tc => (
                                    <option key={tc.name} value={tc.name}>
                                      {tc.name} ({tc.type}){tc.primaryKey ? ' [PK]' : ''}
                                    </option>
                                  ));
                                })()}
                              </select>
                            </div>

                            <div>
                              <label className="block text-[10px] uppercase font-bold text-blue-300 mb-1">On Delete Rule</label>
                              <select
                                value={col.foreignKey.onDelete}
                                onChange={(e) => updateColumnInForm(cIdx, 'foreignKey', { ...col.foreignKey, onDelete: e.target.value })}
                                className="w-full bg-dark-300 border border-white/10 rounded px-2 py-1 text-xs font-mono text-white"
                              >
                                <option value="CASCADE">CASCADE (Delete dependent)</option>
                                <option value="SET NULL">SET NULL (Clear reference)</option>
                                <option value="RESTRICT">RESTRICT (Prevent deletion)</option>
                              </select>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                  <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-primary-600 hover:bg-primary-500 text-white font-medium">
                    {editingTableIndex !== null ? 'Apply Changes' : 'Add Table to Schema'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE TABLE CONFIRMATION DIALOG */}
      <AnimatePresence>
        {tableToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-dark-300 border border-red-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-red-400">
                <div className="p-2.5 rounded-xl bg-red-500/10">
                  <AlertCircle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Delete Table: &quot;{tableToDelete.name}&quot;?</h3>
                  <p className="text-xs text-gray-400">This action will remove the table definition.</p>
                </div>
              </div>

              {tableToDelete.dependencies.length > 0 && (
                <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-lg text-xs text-red-300 space-y-1">
                  <strong className="block font-semibold">Foreign Key Dependency Warning:</strong>
                  <span>The following tables have foreign keys pointing to &quot;{tableToDelete.name}&quot;:</span>
                  <ul className="list-disc pl-4 mt-1">
                    {tableToDelete.dependencies.map((dep, i) => (
                      <li key={i}><span className="font-mono">{dep.tableName}.{dep.columnName}</span></li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="text-xs text-gray-300">
                Are you sure you want to proceed? Remember to click &quot;Save Schema&quot; after deleting to synchronize changes to the database.
              </p>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" size="sm" onClick={() => setTableToDelete(null)}>
                  Cancel
                </Button>
                <Button variant="destructive" size="sm" onClick={confirmDeleteTable}>
                  Yes, Delete Table
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
