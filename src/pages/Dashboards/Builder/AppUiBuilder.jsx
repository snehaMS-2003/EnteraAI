import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Play, 
  Save, 
  Plus, 
  Check, 
  AlertTriangle, 
  Layers, 
  Settings, 
  Edit3, 
  Trash2, 
  Database, 
  Webhook, 
  FileCode,
  ArrowLeft,
  X,
  ShieldAlert,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { orgFetch, useAuth } from '../../../hooks/useAuth';
import { ComponentPalette } from './ComponentPalette';
import { ComponentInspector } from './ComponentInspector';
import { CanvasView } from './CanvasView';
import { AppPreview } from './AppPreview';

export function AppUiBuilder({ application, basePath }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Core Builder State
  const [pages, setPages] = useState([]);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [selectedComponentId, setSelectedComponentId] = useState(null);
  const [navigation, setNavigation] = useState(null);
  const [schema, setSchema] = useState({ tables: [] });
  const [apis, setApis] = useState({ endpoints: [] });

  // Mode
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  // Modals
  const [showAddPageModal, setShowAddPageModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [newPageName, setNewPageName] = useState('');
  const [newPageSlug, setNewPageSlug] = useState('');
  const [newPageTitle, setNewPageTitle] = useState('');
  const [newPageDescription, setNewPageDescription] = useState('');

  // Validation
  const [validationErrors, setValidationErrors] = useState([]);

  // Load Full Builder Configuration from PostgreSQL
  const fetchBuilderData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await orgFetch(`/api/designer/applications/${id}/builder`);
      if (res.ok) {
        const data = await res.json();
        setPages(data.pages || []);
        setNavigation(data.navigation || null);
        setSchema(data.schema || { tables: [] });
        setApis(data.apis || { endpoints: [] });
        if (data.pages && data.pages.length > 0) {
          setActivePageIndex(0);
          setSelectedComponentId(data.pages[0]?.components?.[0]?.id || null);
        }
      } else {
        const err = await res.json();
        setErrorMsg(err.error || 'Failed to load application builder data.');
      }
    } catch (err) {
      console.error('Failed to load builder data:', err);
      setErrorMsg('Failed to connect to the backend server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchBuilderData();
  }, [id]);

  const activePage = pages[activePageIndex] || pages[0] || null;
  const activeComponents = activePage?.components || [];
  const selectedComponent = activeComponents.find(c => c.id === selectedComponentId) || null;

  // Validation Function
  const runValidation = (currentPages) => {
    const errors = [];
    const knownTables = new Map();
    (schema.tables || []).forEach(t => {
      knownTables.set(t.name, new Set((t.columns || []).map(c => c.name)));
    });

    const knownApis = new Set();
    (apis.endpoints || []).forEach(ep => {
      knownApis.add(`${ep.method} ${ep.path}`);
      if (ep.id) knownApis.add(ep.id);
    });

    const pageSlugs = new Set();

    (currentPages || []).forEach(page => {
      if (!page.name?.trim()) {
        errors.push(`Page ID ${page.id || 'new'}: Page name is required.`);
      }
      const slug = page.slug?.trim();
      if (!slug) {
        errors.push(`Page "${page.name}": Page slug is required.`);
      } else if (pageSlugs.has(slug)) {
        errors.push(`Duplicate page slug "${slug}". Each page must have a unique slug.`);
      } else {
        pageSlugs.add(slug);
      }

      const componentIds = new Set();
      (page.components || []).forEach(comp => {
        if (!comp.name?.trim() && !comp.id) {
          errors.push(`Page "${page.name}": Component of type "${comp.type}" is missing an identifier.`);
        } else {
          const cId = (comp.name || comp.id).trim();
          if (componentIds.has(cId)) {
            errors.push(`Page "${page.name}": Duplicate component identifier "${cId}". Identifiers must be unique per page.`);
          } else {
            componentIds.add(cId);
          }
        }

        // Validate DB table binding
        if (comp.dataBinding?.table) {
          if (!knownTables.has(comp.dataBinding.table)) {
            errors.push(`Page "${page.name}", Component "${comp.name || comp.id}": References non-existent database table "${comp.dataBinding.table}".`);
          } else if (comp.dataBinding.column && !knownTables.get(comp.dataBinding.table).has(comp.dataBinding.column)) {
            errors.push(`Page "${page.name}", Component "${comp.name || comp.id}": Column "${comp.dataBinding.column}" does not exist in table "${comp.dataBinding.table}".`);
          }
        }

        // Validate Table component table
        if (comp.type === 'table' && comp.tableConfig?.tableName) {
          if (!knownTables.has(comp.tableConfig.tableName)) {
            errors.push(`Page "${page.name}", Table Component "${comp.name || comp.id}": References non-existent table "${comp.tableConfig.tableName}".`);
          }
        }

        // Validate API binding
        if (comp.apiBinding?.endpoint && !knownApis.has(comp.apiBinding.endpoint)) {
          errors.push(`Page "${page.name}", Component "${comp.name || comp.id}": References non-existent REST API "${comp.apiBinding.endpoint}".`);
        }
        if (comp.buttonConfig?.actionType === 'api' && comp.buttonConfig?.apiEndpoint && !knownApis.has(comp.buttonConfig.apiEndpoint)) {
          errors.push(`Page "${page.name}", Button "${comp.name || comp.id}": References non-existent REST API "${comp.buttonConfig.apiEndpoint}".`);
        }
      });
    });

    setValidationErrors(errors);
    return errors;
  };

  // Add Component to active page
  const handleAddComponent = (definition) => {
    if (!activePage) return;
    const timestamp = Date.now().toString().slice(-6);
    const newComponent = {
      id: `comp_${definition.type}_${timestamp}`,
      type: definition.type,
      ...JSON.parse(JSON.stringify(definition.defaultProps)),
      name: `${definition.defaultProps.name}_${timestamp}`
    };

    const updatedPages = [...pages];
    const targetPage = { ...updatedPages[activePageIndex] };
    targetPage.components = [...(targetPage.components || []), newComponent];
    updatedPages[activePageIndex] = targetPage;

    setPages(updatedPages);
    setSelectedComponentId(newComponent.id);
    runValidation(updatedPages);
  };

  // Update Component properties
  const handleUpdateComponent = (updatedComponent) => {
    if (!activePage) return;
    const updatedPages = [...pages];
    const targetPage = { ...updatedPages[activePageIndex] };
    targetPage.components = (targetPage.components || []).map(c => 
      c.id === updatedComponent.id ? updatedComponent : c
    );
    updatedPages[activePageIndex] = targetPage;
    setPages(updatedPages);
    runValidation(updatedPages);
  };

  // Delete Component
  const handleDeleteComponent = (compId) => {
    if (!activePage) return;
    const updatedPages = [...pages];
    const targetPage = { ...updatedPages[activePageIndex] };
    targetPage.components = (targetPage.components || []).filter(c => c.id !== compId);
    updatedPages[activePageIndex] = targetPage;
    setPages(updatedPages);
    if (selectedComponentId === compId) {
      setSelectedComponentId(targetPage.components[0]?.id || null);
    }
    runValidation(updatedPages);
  };

  // Duplicate Component
  const handleDuplicateComponent = (compId) => {
    if (!activePage) return;
    const sourceComp = (activePage.components || []).find(c => c.id === compId);
    if (!sourceComp) return;

    const timestamp = Date.now().toString().slice(-6);
    const cloned = {
      ...JSON.parse(JSON.stringify(sourceComp)),
      id: `comp_${sourceComp.type}_${timestamp}`,
      name: `${sourceComp.name}_copy_${timestamp}`
    };

    const updatedPages = [...pages];
    const targetPage = { ...updatedPages[activePageIndex] };
    targetPage.components = [...targetPage.components, cloned];
    updatedPages[activePageIndex] = targetPage;
    setPages(updatedPages);
    setSelectedComponentId(cloned.id);
    runValidation(updatedPages);
  };

  // Reorder Components
  const handleMoveComponent = (fromIndex, toIndex) => {
    if (!activePage) return;
    if (toIndex < 0 || toIndex >= activeComponents.length) return;

    const updatedPages = [...pages];
    const targetPage = { ...updatedPages[activePageIndex] };
    const comps = [...targetPage.components];
    const [moved] = comps.splice(fromIndex, 1);
    comps.splice(toIndex, 0, moved);
    targetPage.components = comps;
    updatedPages[activePageIndex] = targetPage;
    setPages(updatedPages);
  };

  // Reorder Pages
  const handleMovePage = async (idx, direction) => {
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= pages.length) return;
    const updated = [...pages];
    const [moved] = updated.splice(idx, 1);
    updated.splice(targetIdx, 0, moved);
    const reordered = updated.map((p, i) => ({ ...p, order_index: i }));
    setPages(reordered);
    setActivePageIndex(targetIdx);
    try {
      await orgFetch(`/api/designer/applications/${id}/builder/save`, {
        method: 'PUT',
        body: JSON.stringify({
          pages: reordered,
          navigation: navigation ? {
            ...navigation,
            nav_items: reordered.map(p => ({
              id: `nav_${p.slug}`,
              label: p.name,
              pageSlug: p.slug
            }))
          } : null
        })
      });
    } catch (e) {
      console.error('Failed to save page order:', e);
    }
  };

  // Create Page
  const handleCreatePage = async (e) => {
    e.preventDefault();
    if (!newPageName.trim()) return;

    const cleanSlug = (newPageSlug || newPageName).toLowerCase().trim().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-');
    
    try {
      const res = await orgFetch(`/api/designer/applications/${id}/pages`, {
        method: 'POST',
        body: JSON.stringify({
          name: newPageName.trim(),
          slug: cleanSlug,
          title: newPageTitle.trim() || newPageName.trim(),
          description: newPageDescription.trim() || null,
          layout: { columns: 12, spacing: 'normal' },
          components: [],
          is_home: pages.length === 0
        })
      });

      if (res.ok) {
        const createdPage = await res.json();
        const updated = [...pages, createdPage];
        setPages(updated);
        setActivePageIndex(updated.length - 1);
        setSelectedComponentId(null);
        setShowAddPageModal(false);
        setNewPageName('');
        setNewPageSlug('');
        setNewPageTitle('');
        setNewPageDescription('');
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to create page');
      }
    } catch (err) {
      console.error('Create page error:', err);
      alert('Error creating page');
    }
  };

  // Delete Page
  const handleDeletePage = async () => {
    if (pages.length <= 1) {
      alert('Cannot delete the only page in the application. An application must have at least one page.');
      return;
    }

    if (!confirm(`Are you sure you want to delete page "${activePage.name}"?`)) return;

    try {
      const res = await orgFetch(`/api/designer/applications/${id}/pages/${activePage.id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        const updated = pages.filter((_, i) => i !== activePageIndex);
        setPages(updated);
        setActivePageIndex(0);
        setSelectedComponentId(updated[0]?.components?.[0]?.id || null);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to delete page');
      }
    } catch (err) {
      console.error('Delete page error:', err);
      alert('Error deleting page');
    }
  };

  // Rename Page
  const handleRenamePage = async (e) => {
    e.preventDefault();
    if (!newPageName.trim()) return;

    try {
      const cleanSlug = (newPageSlug || activePage.slug).toLowerCase().trim().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-');
      const res = await orgFetch(`/api/designer/applications/${id}/pages/${activePage.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: newPageName.trim(),
          slug: cleanSlug,
          title: newPageTitle.trim() || newPageName.trim(),
          description: newPageDescription.trim() || null
        })
      });

      if (res.ok) {
        const updatedPage = await res.json();
        const updated = [...pages];
        updated[activePageIndex] = updatedPage;
        setPages(updated);
        setShowRenameModal(false);
        setNewPageDescription('');
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to rename page');
      }
    } catch (err) {
      console.error('Rename page error:', err);
      alert('Error updating page');
    }
  };

  // Save Full Builder State to PostgreSQL (Atomic Transaction)
  const handleSaveConfiguration = async () => {
    const errors = runValidation(pages);
    if (errors.length > 0) {
      setErrorMsg(`Please resolve ${errors.length} validation errors before saving.`);
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    setSaveSuccess(false);

    try {
      const res = await orgFetch(`/api/designer/applications/${id}/builder/save`, {
        method: 'PUT',
        body: JSON.stringify({
          pages,
          navigation: navigation || {
            nav_items: pages.map(p => ({
              id: `nav_${p.slug}`,
              label: p.name,
              pageSlug: p.slug
            })),
            settings: {
              brandName: application?.app_name || 'Application',
              style: 'sidebar',
              theme: 'dark'
            }
          }
        })
      });

      if (res.ok) {
        const data = await res.json();
        setPages(data.pages || pages);
        setNavigation(data.navigation || navigation);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        const err = await res.json();
        setErrorMsg(err.error || (err.validationErrors ? err.validationErrors.join('; ') : 'Failed to save configuration.'));
      }
    } catch (err) {
      console.error('Save configuration error:', err);
      setErrorMsg('Failed to save to PostgreSQL database.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  // Preview Mode
  if (isPreviewMode) {
    return (
      <AppPreview
        application={application}
        pages={pages}
        navigation={navigation}
        activePageSlug={activePage?.slug}
        onExitPreview={() => setIsPreviewMode(false)}
      />
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] min-h-[600px] bg-dark-400 rounded-xl border border-white/10 overflow-hidden select-none">
      {/* Top Builder Control Header Bar */}
      <div className="h-14 bg-dark-200 border-b border-white/10 px-4 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(`${basePath}/apps/${id}`)}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            title="Back to Overview"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <div className="h-5 w-px bg-white/10" />

          {/* Page Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-xl">
            {pages.map((p, idx) => (
              <button
                key={p.id || p.slug}
                type="button"
                onClick={() => {
                  setActivePageIndex(idx);
                  setSelectedComponentId(p.components?.[0]?.id || null);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activePageIndex === idx
                    ? 'bg-primary-600/20 text-primary-300 border border-primary-500/40 shadow-sm'
                    : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <span>{p.name}</span>
                {p.is_home && <span className="text-[10px] text-primary-400">★</span>}
              </button>
            ))}

            <button
              type="button"
              onClick={() => {
                setNewPageName('');
                setNewPageSlug('');
                setNewPageTitle('');
                setShowAddPageModal(true);
              }}
              className="p-1.5 rounded-lg text-gray-400 hover:text-primary-400 hover:bg-primary-500/10 border border-dashed border-white/15 transition-colors"
              title="Add New Screen/Page"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Page Actions & Save/Preview */}
        <div className="flex items-center gap-2">
          {/* Active Page Rename / Delete actions */}
          {activePage && (
            <div className="flex items-center gap-1 mr-2 border-r border-white/10 pr-2">
              <button
                type="button"
                disabled={activePageIndex === 0}
                onClick={() => handleMovePage(activePageIndex, -1)}
                className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-25 disabled:hover:bg-transparent text-xs"
                title="Move page left"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                disabled={activePageIndex === pages.length - 1}
                onClick={() => handleMovePage(activePageIndex, 1)}
                className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-25 disabled:hover:bg-transparent text-xs"
                title="Move page right"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setNewPageName(activePage.name);
                  setNewPageSlug(activePage.slug);
                  setNewPageTitle(activePage.title || activePage.name);
                  setNewPageDescription(activePage.description || '');
                  setShowRenameModal(true);
                }}
                className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-white/10 text-xs flex items-center gap-1"
                title="Rename page"
              >
                <Edit3 className="h-3.5 w-3.5" />
              </button>
              {pages.length > 1 && (
                <button
                  type="button"
                  onClick={handleDeletePage}
                  className="p-1.5 rounded text-gray-400 hover:text-red-400 hover:bg-red-500/10 text-xs flex items-center gap-1"
                  title="Delete page"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Validation Check Button */}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => runValidation(pages)}
            className="text-xs h-8 text-gray-300 hover:text-white"
          >
            Validate
          </Button>

          {/* Save Button */}
          <Button
            size="sm"
            variant="primary"
            onClick={handleSaveConfiguration}
            disabled={saving}
            className={`text-xs h-8 gap-1.5 transition-all ${
              saveSuccess ? 'bg-emerald-600 border-emerald-500' : ''
            }`}
          >
            {saving ? (
              <>
                <div className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                <span>Saving...</span>
              </>
            ) : saveSuccess ? (
              <>
                <Check className="h-3.5 w-3.5 text-white" />
                <span>Saved!</span>
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                <span>Save</span>
              </>
            )}
          </Button>

          {/* Preview Button */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsPreviewMode(true)}
            className="text-xs h-8 border-primary-500/40 text-primary-300 hover:bg-primary-500/10 gap-1.5"
          >
            <Play className="h-3.5 w-3.5" />
            <span>Preview</span>
          </Button>
        </div>
      </div>

      {/* Validation Error Banner if any */}
      {(validationErrors.length > 0 || errorMsg) && (
        <div className="bg-red-500/15 border-b border-red-500/30 px-4 py-2 flex items-center justify-between text-xs text-red-300">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
            <span>
              {errorMsg || `Validation issue: ${validationErrors[0]}`}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setValidationErrors([]);
              setErrorMsg(null);
            }}
            className="text-red-400 hover:text-red-200"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* 3-Panel Builder Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Component Palette */}
        <ComponentPalette onAddComponent={handleAddComponent} />

        {/* Center Panel: Interactive Canvas */}
        <CanvasView
          components={activeComponents}
          selectedComponentId={selectedComponentId}
          onSelectComponent={setSelectedComponentId}
          onMoveComponent={handleMoveComponent}
          onDuplicateComponent={handleDuplicateComponent}
          onDeleteComponent={handleDeleteComponent}
          schema={schema}
          apis={apis}
        />

        {/* Right Panel: Property Inspector */}
        <ComponentInspector
          component={selectedComponent}
          onUpdateComponent={handleUpdateComponent}
          onDeleteComponent={handleDeleteComponent}
          onDuplicateComponent={handleDuplicateComponent}
          schema={schema}
          apis={apis}
          pages={pages}
        />
      </div>

      {/* Modal: Create Page */}
      {showAddPageModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-dark-200 border border-white/10 rounded-xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-white text-base">Create New Page</h3>
              <button onClick={() => setShowAddPageModal(false)} className="text-gray-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePage} className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-300 mb-1 font-medium">Page Name <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. Students Directory"
                  value={newPageName}
                  onChange={(e) => {
                    setNewPageName(e.target.value);
                    if (!newPageSlug) {
                      setNewPageSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '-'));
                    }
                  }}
                  required
                  className="w-full bg-dark-100 border border-white/15 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-1 font-medium">Slug / URL Path <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. students-directory"
                  value={newPageSlug}
                  onChange={(e) => setNewPageSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '-'))}
                  required
                  className="w-full bg-dark-100 border border-white/15 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-1 font-medium">Page Title</label>
                <input
                  type="text"
                  placeholder="Optional display heading title"
                  value={newPageTitle}
                  onChange={(e) => setNewPageTitle(e.target.value)}
                  className="w-full bg-dark-100 border border-white/15 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-1 font-medium">Description</label>
                <textarea
                  rows={2}
                  placeholder="Optional page description"
                  value={newPageDescription}
                  onChange={(e) => setNewPageDescription(e.target.value)}
                  className="w-full bg-dark-100 border border-white/15 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowAddPageModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Create Page
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Rename Page */}
      {showRenameModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-dark-200 border border-white/10 rounded-xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-white text-base">Edit Page Settings</h3>
              <button onClick={() => setShowRenameModal(false)} className="text-gray-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleRenamePage} className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-300 mb-1 font-medium">Page Name <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={newPageName}
                  onChange={(e) => setNewPageName(e.target.value)}
                  required
                  className="w-full bg-dark-100 border border-white/15 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-1 font-medium">Page Slug</label>
                <input
                  type="text"
                  value={newPageSlug}
                  onChange={(e) => setNewPageSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '-'))}
                  required
                  className="w-full bg-dark-100 border border-white/15 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-1 font-medium">Page Title</label>
                <input
                  type="text"
                  value={newPageTitle}
                  onChange={(e) => setNewPageTitle(e.target.value)}
                  className="w-full bg-dark-100 border border-white/15 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-1 font-medium">Description</label>
                <textarea
                  rows={2}
                  placeholder="Optional page description"
                  value={newPageDescription}
                  onChange={(e) => setNewPageDescription(e.target.value)}
                  className="w-full bg-dark-100 border border-white/15 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowRenameModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
