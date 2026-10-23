import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import {
  Search,
  Filter,
  Plus,
  Download,
  Upload,
  RefreshCw,
  FileSpreadsheet,
  Trash2,
  Edit3,
  Eye,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  AlertCircle,
  CheckCircle2,
  Users,
  UserCheck,
  UserX,
  FileDown,
  UserPlus,
  School,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Shield,
  Layers,
  Save,
  FileText
} from 'lucide-react';
import { orgFetch } from '../../hooks/useAuth';
import { Button } from '../ui/Button';

// Sanitize strings against CSV/Excel formula injection
function sanitizeCellValue(val) {
  if (val === null || val === undefined) return '';
  const str = String(val).trim();
  if (str.startsWith('=') || str.startsWith('+') || str.startsWith('-') || str.startsWith('@')) {
    return `'${str}`;
  }
  return str;
}

// Format date to YYYY-MM-DD
function formatDate(d) {
  if (!d) return '—';
  if (typeof d === 'string') {
    const match = d.match(/^\d{4}-\d{2}-\d{2}/);
    if (match) return match[0];
  }
  try {
    const parsed = new Date(d);
    return isNaN(parsed.getTime()) ? String(d) : parsed.toISOString().split('T')[0];
  } catch {
    return String(d);
  }
}

const DEFAULT_COLUMNS = [
  { key: 'id', label: 'ID', width: 'w-16', readOnly: true },
  { key: 'admission_number', label: 'Admission No', width: 'w-32', required: false },
  { key: 'name', label: 'Full Name', width: 'w-44', required: true },
  { key: 'gender', label: 'Gender', width: 'w-24', type: 'select', options: ['Male', 'Female', 'Other'] },
  { key: 'dob', label: 'Date of Birth', width: 'w-32', type: 'date' },
  { key: 'class_grade', label: 'Class / Grade', width: 'w-36' },
  { key: 'section', label: 'Section', width: 'w-20' },
  { key: 'roll_number', label: 'Roll No', width: 'w-24' },
  { key: 'email', label: 'Email', width: 'w-48', type: 'email' },
  { key: 'phone', label: 'Phone', width: 'w-32' },
  { key: 'address', label: 'Address', width: 'w-48' },
  { key: 'parent_name', label: 'Parent Name', width: 'w-40' },
  { key: 'parent_phone', label: 'Parent Phone', width: 'w-32' },
  { key: 'admission_date', label: 'Admission Date', width: 'w-32', type: 'date' },
  { key: 'status', label: 'Status', width: 'w-28', type: 'select', options: ['Active', 'Inactive'] },
];

export function StudentRecordsExcel({ appId = 5, onRecordChange }) {
  // State
  const [students, setStudents] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState('all');
  const [filterSection, setFilterSection] = useState('all');
  const [filterGender, setFilterGender] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Sorting
  const [sortBy, setSortBy] = useState('id');
  const [sortDir, setSortDir] = useState('desc');

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [viewRecord, setViewRecord] = useState(null);
  const [editRecord, setEditRecord] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Inline editing
  const [editingCell, setEditingCell] = useState(null); // { id, field }
  const [inlineValue, setInlineValue] = useState('');
  const [inlineSaving, setInlineSaving] = useState(false);

  // Import flow state
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importSkipInvalid, setImportSkipInvalid] = useState(true);

  // Show Toast
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch Students from PostgreSQL
  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams({
        paginated: 'true',
        page: String(page),
        limit: String(limit),
        sort_by: sortBy,
        sort_dir: sortDir,
        ...(search ? { search: search.trim() } : {}),
        ...(filterClass !== 'all' ? { class_grade: filterClass } : {}),
        ...(filterSection !== 'all' ? { section: filterSection } : {}),
        ...(filterGender !== 'all' ? { gender: filterGender } : {}),
        ...(filterStatus !== 'all' ? { status: filterStatus } : {}),
      });

      const res = await orgFetch(`/api/students?${queryParams.toString()}`, {
        headers: {
          'X-App-Id': String(appId),
        },
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to load students');
      }

      const data = await res.json();
      if (data && Array.isArray(data.records)) {
        setStudents(data.records);
        setTotalRecords(data.total);
        setTotalPages(data.totalPages || 1);
        if (data.stats) {
          setStats(data.stats);
        }
      } else if (Array.isArray(data)) {
        setStudents(data);
        setTotalRecords(data.length);
        setTotalPages(Math.ceil(data.length / limit) || 1);
        setStats({
          total: data.length,
          active: data.filter((s) => s.status?.toLowerCase() === 'active').length,
          inactive: data.filter((s) => s.status?.toLowerCase() === 'inactive').length,
        });
      }
    } catch (err) {
      console.error('Fetch students error:', err);
      setError(err.message || 'Error connecting to database');
    } finally {
      setLoading(false);
    }
  }, [appId, page, limit, sortBy, sortDir, search, filterClass, filterSection, filterGender, filterStatus]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Handle Sort Change
  const handleSort = (columnKey) => {
    if (sortBy === columnKey) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(columnKey);
      setSortDir('asc');
    }
    setPage(1);
  };

  // Dynamic filter option lists based on loaded records
  const availableClasses = useMemo(() => {
    const set = new Set();
    students.forEach((s) => {
      const c = s.class_grade || s.course;
      if (c) set.add(c);
    });
    // Add common grades if not present
    ['Grade 9', 'Grade 10', 'Grade 11', 'Grade 12', 'Computer Science'].forEach((c) => set.add(c));
    return Array.from(set).sort();
  }, [students]);

  const availableSections = useMemo(() => {
    const set = new Set();
    students.forEach((s) => {
      if (s.section) set.add(s.section);
    });
    ['A', 'B', 'C', 'D'].forEach((s) => set.add(s));
    return Array.from(set).sort();
  }, [students]);

  // Inline Cell Editing
  const startInlineEdit = (student, field) => {
    if (field === 'id') return; // ID is read-only
    setEditingCell({ id: student.id, field });
    setInlineValue(student[field] || '');
  };

  const cancelInlineEdit = () => {
    setEditingCell(null);
    setInlineValue('');
  };

  const saveInlineEdit = async (student, field) => {
    const originalVal = student[field] || '';
    if (inlineValue === originalVal) {
      cancelInlineEdit();
      return;
    }

    setInlineSaving(true);
    try {
      const payload = {
        ...student,
        [field]: inlineValue.trim(),
      };

      const res = await orgFetch(`/api/students/${student.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-App-Id': String(appId),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to update student');
      }

      const updated = await res.json();
      setStudents((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      showToast(`Updated ${field.replace('_', ' ')} for ${student.name}`);
      cancelInlineEdit();
      if (onRecordChange) onRecordChange();
    } catch (err) {
      showToast(err.message || 'Update failed', 'error');
    } finally {
      setInlineSaving(false);
    }
  };

  // Delete Student
  const handleDeleteStudent = async (studentId, studentName) => {
    try {
      const res = await orgFetch(`/api/students/${studentId}`, {
        method: 'DELETE',
        headers: {
          'X-App-Id': String(appId),
        },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to delete student');
      }

      showToast(`Student "${studentName}" deleted successfully`);
      setDeleteConfirm(null);
      fetchStudents();
      if (onRecordChange) onRecordChange();
    } catch (err) {
      showToast(err.message || 'Delete failed', 'error');
    }
  };

  // Export to Excel (.xlsx)
  const handleExportExcel = async (exportAll = false) => {
    try {
      let dataToExport = students;
      if (exportAll) {
        // Fetch all matching records without pagination
        const queryParams = new URLSearchParams({
          paginated: 'false',
          sort_by: sortBy,
          sort_dir: sortDir,
          ...(search ? { search: search.trim() } : {}),
          ...(filterClass !== 'all' ? { class_grade: filterClass } : {}),
          ...(filterSection !== 'all' ? { section: filterSection } : {}),
          ...(filterGender !== 'all' ? { gender: filterGender } : {}),
          ...(filterStatus !== 'all' ? { status: filterStatus } : {}),
        });
        const res = await orgFetch(`/api/students?${queryParams.toString()}`, {
          headers: { 'X-App-Id': String(appId) },
        });
        if (res.ok) {
          const allData = await res.json();
          if (Array.isArray(allData)) dataToExport = allData;
          else if (Array.isArray(allData.records)) dataToExport = allData.records;
        }
      }

      // Map rows to Excel header fields
      const rows = dataToExport.map((s) => ({
        'Student ID': s.id,
        'Admission Number': sanitizeCellValue(s.admission_number || ''),
        'Full Name': sanitizeCellValue(s.name || ''),
        'Gender': s.gender || '',
        'Date of Birth': formatDate(s.dob),
        'Class / Grade': s.class_grade || s.course || '',
        'Section': s.section || '',
        'Roll Number': sanitizeCellValue(s.roll_number || ''),
        'Email': sanitizeCellValue(s.email || ''),
        'Phone Number': sanitizeCellValue(s.phone || ''),
        'Address': sanitizeCellValue(s.address || ''),
        'Parent / Guardian Name': sanitizeCellValue(s.parent_name || ''),
        'Parent / Guardian Phone': sanitizeCellValue(s.parent_phone || ''),
        'Admission Date': formatDate(s.admission_date),
        'Status': s.status || 'Active',
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);

      // Set clean column widths
      worksheet['!cols'] = [
        { wch: 10 }, // ID
        { wch: 16 }, // Admission Number
        { wch: 22 }, // Full Name
        { wch: 10 }, // Gender
        { wch: 14 }, // DOB
        { wch: 16 }, // Class
        { wch: 10 }, // Section
        { wch: 12 }, // Roll No
        { wch: 26 }, // Email
        { wch: 16 }, // Phone
        { wch: 28 }, // Address
        { wch: 22 }, // Parent Name
        { wch: 16 }, // Parent Phone
        { wch: 14 }, // Admission Date
        { wch: 12 }, // Status
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');

      const fileName = `Student_Records_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      showToast(`Exported ${rows.length} student records to ${fileName}`);
    } catch (err) {
      console.error('Export error:', err);
      showToast('Export failed. Please try again.', 'error');
    }
  };

  // Export to CSV
  const handleExportCSV = async () => {
    try {
      const rows = students.map((s) => ({
        'Student ID': s.id,
        'Admission Number': sanitizeCellValue(s.admission_number || ''),
        'Full Name': sanitizeCellValue(s.name || ''),
        'Gender': s.gender || '',
        'Date of Birth': formatDate(s.dob),
        'Class / Grade': s.class_grade || s.course || '',
        'Section': s.section || '',
        'Roll Number': sanitizeCellValue(s.roll_number || ''),
        'Email': sanitizeCellValue(s.email || ''),
        'Phone Number': sanitizeCellValue(s.phone || ''),
        'Address': sanitizeCellValue(s.address || ''),
        'Parent / Guardian Name': sanitizeCellValue(s.parent_name || ''),
        'Parent / Guardian Phone': sanitizeCellValue(s.parent_phone || ''),
        'Admission Date': formatDate(s.admission_date),
        'Status': s.status || 'Active',
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const csvOutput = XLSX.utils.sheet_to_csv(worksheet);

      const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Student_Records_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();

      showToast(`Exported ${rows.length} student records as CSV`);
    } catch (err) {
      showToast('CSV export failed', 'error');
    }
  };

  // Download Sample Excel Template
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Admission Number': 'ADM-2026-001',
        'Full Name': 'John Doe',
        'Gender': 'Male',
        'Date of Birth': '2008-05-15',
        'Class / Grade': 'Grade 10',
        'Section': 'A',
        'Roll Number': '15',
        'Email': 'john.doe@example.com',
        'Phone Number': '9876543210',
        'Address': '123 Academic Way, Silicon Valley',
        'Parent / Guardian Name': 'Robert Doe',
        'Parent / Guardian Phone': '9876500000',
        'Admission Date': '2026-06-01',
        'Status': 'Active',
      },
      {
        'Admission Number': 'ADM-2026-002',
        'Full Name': 'Sarah Connor',
        'Gender': 'Female',
        'Date of Birth': '2009-02-20',
        'Class / Grade': 'Grade 9',
        'Section': 'B',
        'Roll Number': '08',
        'Email': 'sarah.c@example.com',
        'Phone Number': '9876543211',
        'Address': '456 Campus Blvd, Austin',
        'Parent / Guardian Name': 'Jane Connor',
        'Parent / Guardian Phone': '9876500001',
        'Admission Date': '2026-06-01',
        'Status': 'Active',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    worksheet['!cols'] = [
      { wch: 18 },
      { wch: 20 },
      { wch: 10 },
      { wch: 14 },
      { wch: 16 },
      { wch: 10 },
      { wch: 12 },
      { wch: 24 },
      { wch: 16 },
      { wch: 30 },
      { wch: 22 },
      { wch: 18 },
      { wch: 14 },
      { wch: 10 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
    XLSX.writeFile(workbook, 'Student_Import_Template.xlsx');
    showToast('Student Excel Template downloaded successfully!');
  };

  // Handle File Upload for Import
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      showToast('Please upload a valid .xlsx, .xls, or .csv file', 'error');
      return;
    }

    setImportFile(file);
    parseUploadedFile(file);
  };

  // Parse Excel / CSV File and Generate Preview
  const parseUploadedFile = (file) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (jsonData.length < 2) {
          showToast('Uploaded spreadsheet appears empty or missing data rows', 'error');
          return;
        }

        const headers = jsonData[0].map((h) => String(h || '').trim());
        const dataRows = jsonData.slice(1);

        // Flexible header mapping
        const headerMap = {};
        headers.forEach((h, idx) => {
          const lower = h.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (lower.includes('adm') || lower.includes('admissionno')) headerMap.admission_number = idx;
          else if (lower.includes('fullname') || lower === 'name' || lower.includes('studentname')) headerMap.name = idx;
          else if (lower.includes('gender') || lower === 'sex') headerMap.gender = idx;
          else if (lower.includes('dob') || lower.includes('birth')) headerMap.dob = idx;
          else if (lower.includes('class') || lower.includes('grade') || lower.includes('course')) headerMap.class_grade = idx;
          else if (lower.includes('section')) headerMap.section = idx;
          else if (lower.includes('roll')) headerMap.roll_number = idx;
          else if (lower.includes('email')) headerMap.email = idx;
          else if (lower.includes('phone') && !lower.includes('parent') && !lower.includes('guardian')) headerMap.phone = idx;
          else if (lower.includes('address')) headerMap.address = idx;
          else if (lower.includes('parent') && (lower.includes('name') || lower.includes('guardian'))) headerMap.parent_name = idx;
          else if ((lower.includes('parent') || lower.includes('guardian')) && lower.includes('phone')) headerMap.parent_phone = idx;
          else if (lower.includes('admissiondate') || lower.includes('dateofadmission')) headerMap.admission_date = idx;
          else if (lower.includes('status')) headerMap.status = idx;
        });

        // Validate each row
        const seenAdmissionNumbers = new Set();
        const existingAdmissionNumbers = new Set(
          students.map((s) => (s.admission_number || '').toLowerCase()).filter(Boolean)
        );

        const parsedRows = [];
        let validCount = 0;
        let invalidCount = 0;

        dataRows.forEach((row, rowIdx) => {
          if (row.length === 0 || row.every((c) => c === undefined || c === null || String(c).trim() === '')) {
            return; // skip completely blank row
          }

          const getVal = (field) => {
            const idx = headerMap[field];
            if (idx === undefined || row[idx] === undefined || row[idx] === null) return '';
            return String(row[idx]).trim();
          };

          const rawName = getVal('name');
          const rawAdm = getVal('admission_number');
          const rawEmail = getVal('email');
          const rawPhone = getVal('phone');
          const rawGender = getVal('gender');
          const rawDob = getVal('dob');
          const rawClass = getVal('class_grade');
          const rawSection = getVal('section');
          const rawRoll = getVal('roll_number');
          const rawAddress = getVal('address');
          const rawParentName = getVal('parent_name');
          const rawParentPhone = getVal('parent_phone');
          const rawAdmDate = getVal('admission_date');
          const rawStatus = getVal('status') || 'Active';

          const errors = [];

          if (!rawName) {
            errors.push('Full Name is required');
          }

          if (rawEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
            errors.push('Invalid email address format');
          }

          if (rawAdm) {
            const lowerAdm = rawAdm.toLowerCase();
            if (existingAdmissionNumbers.has(lowerAdm)) {
              errors.push(`Admission No "${rawAdm}" already exists in database`);
            } else if (seenAdmissionNumbers.has(lowerAdm)) {
              errors.push(`Duplicate Admission No "${rawAdm}" in spreadsheet`);
            } else {
              seenAdmissionNumbers.add(lowerAdm);
            }
          }

          const isValid = errors.length === 0;
          if (isValid) validCount++;
          else invalidCount++;

          parsedRows.push({
            rowNumber: rowIdx + 2,
            data: {
              name: rawName,
              admission_number: rawAdm,
              gender: rawGender || 'Male',
              dob: rawDob || null,
              class_grade: rawClass || 'Grade 10',
              section: rawSection || 'A',
              roll_number: rawRoll || null,
              email: rawEmail || null,
              phone: rawPhone || null,
              address: rawAddress || null,
              parent_name: rawParentName || null,
              parent_phone: rawParentPhone || null,
              admission_date: rawAdmDate || null,
              status: rawStatus.toLowerCase().startsWith('inact') ? 'Inactive' : 'Active',
            },
            errors,
            isValid,
          });
        });

        setImportPreview({
          totalRows: parsedRows.length,
          validCount,
          invalidCount,
          rows: parsedRows,
        });
      } catch (err) {
        console.error('File parsing error:', err);
        showToast('Failed to parse file. Please verify it is a valid Excel spreadsheet.', 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Submit Bulk Import
  const handleExecuteImport = async () => {
    if (!importPreview || importPreview.rows.length === 0) return;

    setImportLoading(true);
    try {
      const rowsToImport = importSkipInvalid
        ? importPreview.rows.filter((r) => r.isValid).map((r) => r.data)
        : importPreview.rows.map((r) => r.data);

      if (rowsToImport.length === 0) {
        throw new Error('No valid student rows to import');
      }

      const res = await orgFetch('/api/students/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-App-Id': String(appId),
        },
        body: JSON.stringify({
          students: rowsToImport,
          skipInvalid: importSkipInvalid,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Bulk import failed');
      }

      showToast(
        `Successfully imported ${result.insertedCount} student(s)${result.skippedCount > 0 ? ` (${result.skippedCount} skipped)` : ''}!`,
        'success'
      );
      setShowImportModal(false);
      setImportFile(null);
      setImportPreview(null);
      fetchStudents();
      if (onRecordChange) onRecordChange();
    } catch (err) {
      showToast(err.message || 'Import error occurred', 'error');
    } finally {
      setImportLoading(false);
    }
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSearch('');
    setFilterClass('all');
    setFilterSection('all');
    setFilterGender('all');
    setFilterStatus('all');
    setPage(1);
  };

  const hasActiveFilters = search || filterClass !== 'all' || filterSection !== 'all' || filterGender !== 'all' || filterStatus !== 'all';

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border text-sm font-medium ${
              toast.type === 'error'
                ? 'bg-red-950/90 border-red-500/50 text-red-200'
                : 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
            }`}
          >
            {toast.type === 'error' ? (
              <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            )}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Header & Metrics Banner */}
      <div className="bg-dark-200/80 border border-white/10 rounded-2xl p-6 backdrop-blur-md shadow-2xl space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary-400">
              <School className="h-4 w-4" />
              <span>Student Management System</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1 flex items-center gap-2.5">
              <span>Student Records</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary-500/10 text-primary-300 border border-primary-500/20 font-mono font-normal">
                Excel View
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-1">
              Complete student details spreadsheet with inline editing, multi-entry, and Excel/CSV import & export.
            </p>
          </div>

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowAddModal(true)}
              className="gap-2 shadow-lg shadow-primary-500/20 font-semibold"
            >
              <Plus className="h-4 w-4" /> Add Student
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowBatchModal(true)}
              className="gap-2 border-white/15 hover:bg-white/10 text-white font-medium"
            >
              <UserPlus className="h-4 w-4 text-emerald-400" /> Add Multiple
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowImportModal(true)}
              className="gap-2 border-white/15 hover:bg-white/10 text-white font-medium"
            >
              <Upload className="h-4 w-4 text-sky-400" /> Import Excel
            </Button>

            <div className="relative group">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleExportExcel(false)}
                className="gap-2 border-white/15 hover:bg-white/10 text-white font-medium"
              >
                <Download className="h-4 w-4 text-amber-400" /> Export Excel
              </Button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              className="gap-2 border-primary-500/30 text-primary-300 hover:bg-primary-500/10"
              title="Download empty Excel template"
            >
              <FileDown className="h-4 w-4" /> Template
            </Button>

            <button
              type="button"
              onClick={fetchStudents}
              disabled={loading}
              className="p-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all disabled:opacity-50"
              title="Refresh data"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-primary-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Metric Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-white/10">
          <div className="bg-dark-100/60 border border-white/5 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold">Total Students</p>
              <p className="text-2xl font-black text-white mt-1 font-mono">{stats.total || totalRecords}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Enrolled in PostgreSQL</p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-primary-500/10 border border-primary-500/20 text-primary-400 flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-dark-100/60 border border-white/5 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-emerald-400 font-semibold">Active Students</p>
              <p className="text-2xl font-black text-white mt-1 font-mono text-emerald-400">{stats.active}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Currently Attending</p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <UserCheck className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-dark-100/60 border border-white/5 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold">Inactive / Graduated</p>
              <p className="text-2xl font-black text-white mt-1 font-mono text-gray-300">{stats.inactive}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Alumni & Inactive</p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-gray-500/10 border border-gray-500/20 text-gray-400 flex items-center justify-center">
              <UserX className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Search, Filter Toolbar & Export Options */}
      <div className="bg-dark-200/80 border border-white/10 rounded-2xl p-4 backdrop-blur-md shadow-xl space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Multi-Field Search Bar */}
          <div className="relative flex-1">
            <Search className="h-4 w-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by ID, Admission No, Name, Class, Email, or Phone..."
              className="w-full h-10 pl-10 pr-4 rounded-xl border border-white/15 bg-dark-100 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Class Filter */}
            <select
              value={filterClass}
              onChange={(e) => {
                setFilterClass(e.target.value);
                setPage(1);
              }}
              className="h-10 px-3 rounded-xl border border-white/15 bg-dark-100 text-xs text-gray-300 focus:outline-none focus:border-primary-500 transition-all"
            >
              <option value="all">All Classes</option>
              {availableClasses.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {/* Section Filter */}
            <select
              value={filterSection}
              onChange={(e) => {
                setFilterSection(e.target.value);
                setPage(1);
              }}
              className="h-10 px-3 rounded-xl border border-white/15 bg-dark-100 text-xs text-gray-300 focus:outline-none focus:border-primary-500 transition-all"
            >
              <option value="all">All Sections</option>
              {availableSections.map((s) => (
                <option key={s} value={s}>
                  Section {s}
                </option>
              ))}
            </select>

            {/* Gender Filter */}
            <select
              value={filterGender}
              onChange={(e) => {
                setFilterGender(e.target.value);
                setPage(1);
              }}
              className="h-10 px-3 rounded-xl border border-white/15 bg-dark-100 text-xs text-gray-300 focus:outline-none focus:border-primary-500 transition-all"
            >
              <option value="all">All Genders</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setPage(1);
              }}
              className="h-10 px-3 rounded-xl border border-white/15 bg-dark-100 text-xs text-gray-300 focus:outline-none focus:border-primary-500 transition-all"
            >
              <option value="all">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>

            {/* Reset Button */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-10 text-xs text-gray-400 hover:text-white gap-1.5"
              >
                <X className="h-3.5 w-3.5" /> Reset
              </Button>
            )}

            {/* Secondary Export Options */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="h-10 text-xs border-white/15 text-gray-300 hover:text-white"
              title="Download CSV"
            >
              CSV
            </Button>
          </div>
        </div>

        {/* Inline Helper Tip */}
        <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Excel Mode Active: Click any cell directly to edit inline. Press Enter or click Check to persist.</span>
          </div>
          <span>Showing {students.length} of {totalRecords} records</span>
        </div>
      </div>

      {/* Spreadsheet Table Container */}
      <div className="bg-dark-200/90 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        <div className="overflow-x-auto max-h-[620px] scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
          <table className="w-full text-left text-xs border-collapse">
            {/* Sticky Table Header */}
            <thead className="bg-dark-100/95 sticky top-0 z-20 backdrop-blur-md border-b border-white/15">
              <tr>
                {DEFAULT_COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className={`p-3 font-semibold text-gray-300 uppercase tracking-wider text-[11px] select-none cursor-pointer hover:bg-white/5 transition-colors whitespace-nowrap ${col.width}`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span>{col.label}</span>
                      <span className="text-gray-500">
                        {sortBy === col.key ? (
                          sortDir === 'asc' ? (
                            <ArrowUp className="h-3.5 w-3.5 text-primary-400" />
                          ) : (
                            <ArrowDown className="h-3.5 w-3.5 text-primary-400" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-40 hover:opacity-100" />
                        )}
                      </span>
                    </div>
                  </th>
                ))}
                {/* Actions Header */}
                <th className="p-3 font-semibold text-gray-300 uppercase tracking-wider text-[11px] text-right sticky right-0 bg-dark-100/95 backdrop-blur-md z-30 shadow-[-5px_0_10px_rgba(0,0,0,0.3)] w-28">
                  Actions
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-white/5 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={16} className="py-20 text-center text-gray-400">
                    <div className="h-8 w-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin mx-auto mb-3" />
                    <p className="text-sm font-medium text-white">Loading student records...</p>
                    <p className="text-xs text-gray-400 mt-1">Connecting to PostgreSQL database</p>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={16} className="py-16 text-center text-red-400">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 text-red-400" />
                    <p className="text-base font-semibold">Failed to load records</p>
                    <p className="text-xs text-red-400/80 mt-1 max-w-md mx-auto">{error}</p>
                    <Button variant="outline" size="sm" onClick={fetchStudents} className="mt-4 border-red-500/40 text-red-400">
                      Try Again
                    </Button>
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={16} className="py-20 text-center text-gray-400">
                    <div className="h-12 w-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-3 text-gray-500">
                      <FileSpreadsheet className="h-6 w-6" />
                    </div>
                    <p className="text-base font-bold text-white">No Student Records Found</p>
                    <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                      {hasActiveFilters
                        ? 'No records match your current filters. Clear the filters to see all students.'
                        : 'Your student database is empty. Click "+ Add Student" or "Import Excel" to get started.'}
                    </p>
                    {hasActiveFilters ? (
                      <Button variant="outline" size="sm" onClick={handleResetFilters} className="mt-4">
                        Clear Filters
                      </Button>
                    ) : (
                      <div className="flex items-center justify-center gap-2 mt-4">
                        <Button variant="primary" size="sm" onClick={() => setShowAddModal(true)}>
                          <Plus className="h-4 w-4 mr-1.5" /> Add First Student
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => setShowImportModal(true)}>
                          <Upload className="h-4 w-4 mr-1.5" /> Import Excel
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                students.map((student, idx) => (
                  <tr
                    key={student.id}
                    className="hover:bg-white/[0.03] transition-colors group border-b border-white/5"
                  >
                    {/* 1. Student ID */}
                    <td className="p-3 font-mono text-gray-400 text-xs border-r border-white/5 bg-white/[0.01]">
                      #{student.id}
                    </td>

                    {/* 2. Admission Number */}
                    <td
                      className="p-2 border-r border-white/5 cursor-pointer relative"
                      onClick={() => startInlineEdit(student, 'admission_number')}
                      title="Click to edit admission number"
                    >
                      {editingCell?.id === student.id && editingCell?.field === 'admission_number' ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={inlineValue}
                            onChange={(e) => setInlineValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveInlineEdit(student, 'admission_number');
                              if (e.key === 'Escape') cancelInlineEdit();
                            }}
                            autoFocus
                            className="w-full h-7 px-2 text-xs rounded border border-primary-500 bg-dark-100 text-white focus:outline-none"
                          />
                          <button
                            onClick={() => saveInlineEdit(student, 'admission_number')}
                            className="p-1 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                          >
                            <Check className="h-3 w-3" />
                          </button>
                          <button
                            onClick={cancelInlineEdit}
                            className="p-1 rounded bg-white/10 text-gray-400 hover:bg-white/20"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <span className="font-mono text-primary-300 font-medium">
                          {student.admission_number || '—'}
                        </span>
                      )}
                    </td>

                    {/* 3. Full Name */}
                    <td
                      className="p-2 border-r border-white/5 cursor-pointer relative font-semibold text-white"
                      onClick={() => startInlineEdit(student, 'name')}
                      title="Click to edit name"
                    >
                      {editingCell?.id === student.id && editingCell?.field === 'name' ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={inlineValue}
                            onChange={(e) => setInlineValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveInlineEdit(student, 'name');
                              if (e.key === 'Escape') cancelInlineEdit();
                            }}
                            autoFocus
                            className="w-full h-7 px-2 text-xs rounded border border-primary-500 bg-dark-100 text-white focus:outline-none"
                          />
                          <button
                            onClick={() => saveInlineEdit(student, 'name')}
                            className="p-1 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                          >
                            <Check className="h-3 w-3" />
                          </button>
                          <button
                            onClick={cancelInlineEdit}
                            className="p-1 rounded bg-white/10 text-gray-400 hover:bg-white/20"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        student.name
                      )}
                    </td>

                    {/* 4. Gender */}
                    <td
                      className="p-2 border-r border-white/5 cursor-pointer text-gray-300"
                      onClick={() => startInlineEdit(student, 'gender')}
                    >
                      {editingCell?.id === student.id && editingCell?.field === 'gender' ? (
                        <select
                          value={inlineValue}
                          onChange={(e) => {
                            setInlineValue(e.target.value);
                            // Auto save on select change
                            saveInlineEdit(student, 'gender');
                          }}
                          autoFocus
                          className="w-full h-7 px-1 text-xs rounded border border-primary-500 bg-dark-100 text-white focus:outline-none"
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      ) : (
                        student.gender || '—'
                      )}
                    </td>

                    {/* 5. Date of Birth */}
                    <td
                      className="p-2 border-r border-white/5 cursor-pointer font-mono text-gray-300"
                      onClick={() => startInlineEdit(student, 'dob')}
                    >
                      {editingCell?.id === student.id && editingCell?.field === 'dob' ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="date"
                            value={inlineValue}
                            onChange={(e) => setInlineValue(e.target.value)}
                            onBlur={() => saveInlineEdit(student, 'dob')}
                            autoFocus
                            className="w-full h-7 px-1 text-xs rounded border border-primary-500 bg-dark-100 text-white focus:outline-none"
                          />
                        </div>
                      ) : (
                        formatDate(student.dob)
                      )}
                    </td>

                    {/* 6. Class / Grade */}
                    <td
                      className="p-2 border-r border-white/5 cursor-pointer text-primary-300 font-medium"
                      onClick={() => startInlineEdit(student, 'class_grade')}
                    >
                      {editingCell?.id === student.id && editingCell?.field === 'class_grade' ? (
                        <input
                          type="text"
                          value={inlineValue}
                          onChange={(e) => setInlineValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveInlineEdit(student, 'class_grade');
                            if (e.key === 'Escape') cancelInlineEdit();
                          }}
                          autoFocus
                          className="w-full h-7 px-2 text-xs rounded border border-primary-500 bg-dark-100 text-white focus:outline-none"
                        />
                      ) : (
                        student.class_grade || student.course || '—'
                      )}
                    </td>

                    {/* 7. Section */}
                    <td
                      className="p-2 border-r border-white/5 cursor-pointer text-center font-bold text-gray-300"
                      onClick={() => startInlineEdit(student, 'section')}
                    >
                      {editingCell?.id === student.id && editingCell?.field === 'section' ? (
                        <input
                          type="text"
                          value={inlineValue}
                          onChange={(e) => setInlineValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveInlineEdit(student, 'section');
                            if (e.key === 'Escape') cancelInlineEdit();
                          }}
                          autoFocus
                          className="w-full h-7 px-1 text-center text-xs rounded border border-primary-500 bg-dark-100 text-white focus:outline-none"
                        />
                      ) : (
                        student.section || '—'
                      )}
                    </td>

                    {/* 8. Roll Number */}
                    <td
                      className="p-2 border-r border-white/5 cursor-pointer font-mono text-gray-300"
                      onClick={() => startInlineEdit(student, 'roll_number')}
                    >
                      {editingCell?.id === student.id && editingCell?.field === 'roll_number' ? (
                        <input
                          type="text"
                          value={inlineValue}
                          onChange={(e) => setInlineValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveInlineEdit(student, 'roll_number');
                            if (e.key === 'Escape') cancelInlineEdit();
                          }}
                          autoFocus
                          className="w-full h-7 px-2 text-xs rounded border border-primary-500 bg-dark-100 text-white focus:outline-none"
                        />
                      ) : (
                        student.roll_number || '—'
                      )}
                    </td>

                    {/* 9. Email */}
                    <td
                      className="p-2 border-r border-white/5 cursor-pointer text-gray-300"
                      onClick={() => startInlineEdit(student, 'email')}
                    >
                      {editingCell?.id === student.id && editingCell?.field === 'email' ? (
                        <input
                          type="email"
                          value={inlineValue}
                          onChange={(e) => setInlineValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveInlineEdit(student, 'email');
                            if (e.key === 'Escape') cancelInlineEdit();
                          }}
                          autoFocus
                          className="w-full h-7 px-2 text-xs rounded border border-primary-500 bg-dark-100 text-white focus:outline-none"
                        />
                      ) : (
                        student.email || '—'
                      )}
                    </td>

                    {/* 10. Phone Number */}
                    <td
                      className="p-2 border-r border-white/5 cursor-pointer font-mono text-gray-300"
                      onClick={() => startInlineEdit(student, 'phone')}
                    >
                      {editingCell?.id === student.id && editingCell?.field === 'phone' ? (
                        <input
                          type="text"
                          value={inlineValue}
                          onChange={(e) => setInlineValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveInlineEdit(student, 'phone');
                            if (e.key === 'Escape') cancelInlineEdit();
                          }}
                          autoFocus
                          className="w-full h-7 px-2 text-xs rounded border border-primary-500 bg-dark-100 text-white focus:outline-none"
                        />
                      ) : (
                        student.phone || '—'
                      )}
                    </td>

                    {/* 11. Address */}
                    <td
                      className="p-2 border-r border-white/5 cursor-pointer text-gray-300 truncate max-w-xs"
                      onClick={() => startInlineEdit(student, 'address')}
                      title={student.address}
                    >
                      {editingCell?.id === student.id && editingCell?.field === 'address' ? (
                        <input
                          type="text"
                          value={inlineValue}
                          onChange={(e) => setInlineValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveInlineEdit(student, 'address');
                            if (e.key === 'Escape') cancelInlineEdit();
                          }}
                          autoFocus
                          className="w-full h-7 px-2 text-xs rounded border border-primary-500 bg-dark-100 text-white focus:outline-none"
                        />
                      ) : (
                        student.address || '—'
                      )}
                    </td>

                    {/* 12. Parent / Guardian Name */}
                    <td
                      className="p-2 border-r border-white/5 cursor-pointer text-gray-300"
                      onClick={() => startInlineEdit(student, 'parent_name')}
                    >
                      {editingCell?.id === student.id && editingCell?.field === 'parent_name' ? (
                        <input
                          type="text"
                          value={inlineValue}
                          onChange={(e) => setInlineValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveInlineEdit(student, 'parent_name');
                            if (e.key === 'Escape') cancelInlineEdit();
                          }}
                          autoFocus
                          className="w-full h-7 px-2 text-xs rounded border border-primary-500 bg-dark-100 text-white focus:outline-none"
                        />
                      ) : (
                        student.parent_name || '—'
                      )}
                    </td>

                    {/* 13. Parent / Guardian Phone */}
                    <td
                      className="p-2 border-r border-white/5 cursor-pointer font-mono text-gray-300"
                      onClick={() => startInlineEdit(student, 'parent_phone')}
                    >
                      {editingCell?.id === student.id && editingCell?.field === 'parent_phone' ? (
                        <input
                          type="text"
                          value={inlineValue}
                          onChange={(e) => setInlineValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveInlineEdit(student, 'parent_phone');
                            if (e.key === 'Escape') cancelInlineEdit();
                          }}
                          autoFocus
                          className="w-full h-7 px-2 text-xs rounded border border-primary-500 bg-dark-100 text-white focus:outline-none"
                        />
                      ) : (
                        student.parent_phone || '—'
                      )}
                    </td>

                    {/* 14. Admission Date */}
                    <td
                      className="p-2 border-r border-white/5 cursor-pointer font-mono text-gray-300"
                      onClick={() => startInlineEdit(student, 'admission_date')}
                    >
                      {editingCell?.id === student.id && editingCell?.field === 'admission_date' ? (
                        <input
                          type="date"
                          value={inlineValue}
                          onChange={(e) => setInlineValue(e.target.value)}
                          onBlur={() => saveInlineEdit(student, 'admission_date')}
                          autoFocus
                          className="w-full h-7 px-1 text-xs rounded border border-primary-500 bg-dark-100 text-white focus:outline-none"
                        />
                      ) : (
                        formatDate(student.admission_date)
                      )}
                    </td>

                    {/* 15. Status */}
                    <td
                      className="p-2 border-r border-white/5 cursor-pointer"
                      onClick={() => startInlineEdit(student, 'status')}
                    >
                      {editingCell?.id === student.id && editingCell?.field === 'status' ? (
                        <select
                          value={inlineValue}
                          onChange={(e) => {
                            setInlineValue(e.target.value);
                            saveInlineEdit(student, 'status');
                          }}
                          autoFocus
                          className="w-full h-7 px-1 text-xs rounded border border-primary-500 bg-dark-100 text-white focus:outline-none"
                        >
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                        </select>
                      ) : (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border inline-block ${
                            student.status?.toLowerCase() === 'active'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                          }`}
                        >
                          {student.status || 'Active'}
                        </span>
                      )}
                    </td>

                    {/* 16. Actions */}
                    <td className="p-2 text-right sticky right-0 bg-dark-200 group-hover:bg-dark-100 transition-colors z-10 shadow-[-5px_0_10px_rgba(0,0,0,0.3)]">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setViewRecord(student)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                          title="View Profile"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditRecord(student)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                          title="Edit Student"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirm(student)}
                          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors"
                          title="Delete Student"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400 bg-dark-100/50">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(parseInt(e.target.value, 10));
                setPage(1);
              }}
              className="h-8 px-2 rounded-lg border border-white/15 bg-dark-100 text-xs text-white focus:outline-none"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-gray-500">|</span>
            <span>
              Showing {students.length > 0 ? (page - 1) * limit + 1 : 0} to{' '}
              {Math.min(page * limit, totalRecords)} of {totalRecords} records
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage(1)}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-gray-300 disabled:opacity-30 disabled:pointer-events-none"
              title="First Page"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-gray-300 disabled:opacity-30 disabled:pointer-events-none"
              title="Previous Page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-3 py-1 font-mono text-white bg-white/5 rounded-lg border border-white/10">
              Page {page} of {totalPages || 1}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-gray-300 disabled:opacity-30 disabled:pointer-events-none"
              title="Next Page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage(totalPages)}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-gray-300 disabled:opacity-30 disabled:pointer-events-none"
              title="Last Page"
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* MODAL 1: ADD SINGLE STUDENT */}
      {showAddModal && (
        <AddStudentModal
          appId={appId}
          onClose={() => setShowAddModal(false)}
          onSuccess={(newStudent) => {
            showToast(`Student "${newStudent.name}" created successfully!`);
            setShowAddModal(false);
            fetchStudents();
            if (onRecordChange) onRecordChange();
          }}
        />
      )}

      {/* MODAL 2: EDIT STUDENT */}
      {editRecord && (
        <EditStudentModal
          appId={appId}
          student={editRecord}
          onClose={() => setEditRecord(null)}
          onSuccess={(updatedStudent) => {
            showToast(`Student "${updatedStudent.name}" updated successfully!`);
            setEditRecord(null);
            fetchStudents();
            if (onRecordChange) onRecordChange();
          }}
        />
      )}

      {/* MODAL 3: VIEW STUDENT PROFILE */}
      {viewRecord && (
        <ViewStudentModal
          student={viewRecord}
          onClose={() => setViewRecord(null)}
          onEdit={() => {
            const rec = viewRecord;
            setViewRecord(null);
            setEditRecord(rec);
          }}
        />
      )}

      {/* MODAL 4: DELETE CONFIRMATION */}
      {deleteConfirm && (
        <DeleteConfirmModal
          student={deleteConfirm}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={() => handleDeleteStudent(deleteConfirm.id, deleteConfirm.name)}
        />
      )}

      {/* MODAL 5: ADD MULTIPLE STUDENTS BATCH GRID */}
      {showBatchModal && (
        <BatchAddStudentsModal
          appId={appId}
          onClose={() => setShowBatchModal(false)}
          onSuccess={(count) => {
            showToast(`Successfully added ${count} students in batch!`);
            setShowBatchModal(false);
            fetchStudents();
            if (onRecordChange) onRecordChange();
          }}
        />
      )}

      {/* MODAL 6: EXCEL / CSV IMPORT MODAL */}
      {showImportModal && (
        <ImportExcelModal
          onClose={() => {
            setShowImportModal(false);
            setImportFile(null);
            setImportPreview(null);
          }}
          importFile={importFile}
          importPreview={importPreview}
          importLoading={importLoading}
          importSkipInvalid={importSkipInvalid}
          setImportSkipInvalid={setImportSkipInvalid}
          onFileChange={handleFileChange}
          onDownloadTemplate={handleDownloadTemplate}
          onExecuteImport={handleExecuteImport}
        />
      )}
    </div>
  );
}

// ==========================================
// SUB-COMPONENT: ADD STUDENT MODAL
// ==========================================
function AddStudentModal({ appId, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    admission_number: '',
    gender: 'Male',
    dob: '',
    class_grade: 'Grade 10',
    section: 'A',
    roll_number: '',
    email: '',
    phone: '',
    address: '',
    parent_name: '',
    parent_phone: '',
    admission_date: new Date().toISOString().split('T')[0],
    status: 'Active',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Student Full Name is required');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await orgFetch('/api/students', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-App-Id': String(appId),
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create student');
      }

      onSuccess(data);
    } catch (err) {
      setError(err.message || 'Error creating student');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl bg-dark-200 border border-white/15 rounded-2xl shadow-2xl p-6 space-y-6 my-8"
      >
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary-500/10 text-primary-400 flex items-center justify-center border border-primary-500/20">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Add New Student</h2>
              <p className="text-xs text-gray-400">Enter full student record to persist into PostgreSQL</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Section 1: Basic Information */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary-400 flex items-center gap-1.5">
              <School className="h-3.5 w-3.5" /> 1. Academic & Identification
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Full Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full h-9 px-3 rounded-xl border border-white/15 bg-dark-100 text-xs text-white focus:outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Admission Number <span className="text-gray-500 text-[10px]">(Auto-generated if empty)</span>
                </label>
                <input
                  type="text"
                  value={formData.admission_number}
                  onChange={(e) => setFormData({ ...formData, admission_number: e.target.value })}
                  placeholder="e.g. ADM-2026-0045"
                  className="w-full h-9 px-3 rounded-xl border border-white/15 bg-dark-100 text-xs text-white focus:outline-none focus:border-primary-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Class / Grade</label>
                <input
                  type="text"
                  value={formData.class_grade}
                  onChange={(e) => setFormData({ ...formData, class_grade: e.target.value })}
                  placeholder="e.g. Grade 10 or Computer Science"
                  className="w-full h-9 px-3 rounded-xl border border-white/15 bg-dark-100 text-xs text-white focus:outline-none focus:border-primary-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Section</label>
                  <input
                    type="text"
                    value={formData.section}
                    onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                    placeholder="e.g. A"
                    className="w-full h-9 px-3 rounded-xl border border-white/15 bg-dark-100 text-xs text-white focus:outline-none focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Roll No</label>
                  <input
                    type="text"
                    value={formData.roll_number}
                    onChange={(e) => setFormData({ ...formData, roll_number: e.target.value })}
                    placeholder="e.g. 12"
                    className="w-full h-9 px-3 rounded-xl border border-white/15 bg-dark-100 text-xs text-white focus:outline-none focus:border-primary-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Admission Date</label>
                <input
                  type="date"
                  value={formData.admission_date}
                  onChange={(e) => setFormData({ ...formData, admission_date: e.target.value })}
                  className="w-full h-9 px-3 rounded-xl border border-white/15 bg-dark-100 text-xs text-white focus:outline-none focus:border-primary-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full h-9 px-3 rounded-xl border border-white/15 bg-dark-100 text-xs text-white focus:outline-none focus:border-primary-500"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Personal Information */}
          <div className="space-y-3 pt-3 border-t border-white/10">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary-400 flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" /> 2. Personal Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Gender</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full h-9 px-3 rounded-xl border border-white/15 bg-dark-100 text-xs text-white focus:outline-none focus:border-primary-500"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={formData.dob}
                  onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                  className="w-full h-9 px-3 rounded-xl border border-white/15 bg-dark-100 text-xs text-white focus:outline-none focus:border-primary-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="student@school.edu"
                  className="w-full h-9 px-3 rounded-xl border border-white/15 bg-dark-100 text-xs text-white focus:outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="e.g. 9876543210"
                  className="w-full h-9 px-3 rounded-xl border border-white/15 bg-dark-100 text-xs text-white focus:outline-none focus:border-primary-500 font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-300 mb-1">Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Street Address, City, State, Postal Code"
                  className="w-full h-9 px-3 rounded-xl border border-white/15 bg-dark-100 text-xs text-white focus:outline-none focus:border-primary-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Guardian Details */}
          <div className="space-y-3 pt-3 border-t border-white/10">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary-400 flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5" /> 3. Parent / Guardian Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Parent / Guardian Name</label>
                <input
                  type="text"
                  value={formData.parent_name}
                  onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })}
                  placeholder="e.g. Mr. Robert Sharma"
                  className="w-full h-9 px-3 rounded-xl border border-white/15 bg-dark-100 text-xs text-white focus:outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Parent / Guardian Phone</label>
                <input
                  type="tel"
                  value={formData.parent_phone}
                  onChange={(e) => setFormData({ ...formData, parent_phone: e.target.value })}
                  placeholder="e.g. 9876500000"
                  className="w-full h-9 px-3 rounded-xl border border-white/15 bg-dark-100 text-xs text-white focus:outline-none focus:border-primary-500 font-mono"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <Button variant="ghost" type="button" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={saving} className="gap-2">
              {saving ? (
                <>
                  <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" /> Save Student
                </>
              )}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ==========================================
// SUB-COMPONENT: EDIT STUDENT MODAL
// ==========================================
function EditStudentModal({ appId, student, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: student.name || '',
    admission_number: student.admission_number || '',
    gender: student.gender || 'Male',
    dob: formatDate(student.dob) !== '—' ? formatDate(student.dob) : '',
    class_grade: student.class_grade || student.course || '',
    section: student.section || '',
    roll_number: student.roll_number || '',
    email: student.email || '',
    phone: student.phone || '',
    address: student.address || '',
    parent_name: student.parent_name || '',
    parent_phone: student.parent_phone || '',
    admission_date: formatDate(student.admission_date) !== '—' ? formatDate(student.admission_date) : '',
    status: student.status || 'Active',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Student Full Name is required');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await orgFetch(`/api/students/${student.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-App-Id': String(appId),
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update student');
      }

      onSuccess(data);
    } catch (err) {
      setError(err.message || 'Error updating student');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl bg-dark-200 border border-white/15 rounded-2xl shadow-2xl p-6 space-y-6 my-8"
      >
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary-500/10 text-primary-400 flex items-center justify-center border border-primary-500/20">
              <Edit3 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Edit Student #{student.id}</h2>
              <p className="text-xs text-gray-400">Update record for {student.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Full Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full h-9 px-3 rounded-xl border border-white/15 bg-dark-100 text-xs text-white focus:outline-none focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Admission Number</label>
              <input
                type="text"
                value={formData.admission_number}
                onChange={(e) => setFormData({ ...formData, admission_number: e.target.value })}
                className="w-full h-9 px-3 rounded-xl border border-white/15 bg-dark-100 text-xs text-white focus:outline-none focus:border-primary-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Gender</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full h-9 px-3 rounded-xl border border-white/15 bg-dark-100 text-xs text-white focus:outline-none focus:border-primary-500"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Date of Birth</label>
              <input
                type="date"
                value={formData.dob}
                onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                className="w-full h-9 px-3 rounded-xl border border-white/15 bg-dark-100 text-xs text-white focus:outline-none focus:border-primary-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Class / Grade</label>
              <input
                type="text"
                value={formData.class_grade}
                onChange={(e) => setFormData({ ...formData, class_grade: e.target.value })}
                className="w-full h-9 px-3 rounded-xl border border-white/15 bg-dark-100 text-xs text-white focus:outline-none focus:border-primary-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Section</label>
                <input
                  type="text"
                  value={formData.section}
                  onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                  className="w-full h-9 px-3 rounded-xl border border-white/15 bg-dark-100 text-xs text-white focus:outline-none focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Roll No</label>
                <input
                  type="text"
                  value={formData.roll_number}
                  onChange={(e) => setFormData({ ...formData, roll_number: e.target.value })}
                  className="w-full h-9 px-3 rounded-xl border border-white/15 bg-dark-100 text-xs text-white focus:outline-none focus:border-primary-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full h-9 px-3 rounded-xl border border-white/15 bg-dark-100 text-xs text-white focus:outline-none focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full h-9 px-3 rounded-xl border border-white/15 bg-dark-100 text-xs text-white focus:outline-none focus:border-primary-500 font-mono"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-300 mb-1">Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full h-9 px-3 rounded-xl border border-white/15 bg-dark-100 text-xs text-white focus:outline-none focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Parent / Guardian Name</label>
              <input
                type="text"
                value={formData.parent_name}
                onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })}
                className="w-full h-9 px-3 rounded-xl border border-white/15 bg-dark-100 text-xs text-white focus:outline-none focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Parent Phone</label>
              <input
                type="tel"
                value={formData.parent_phone}
                onChange={(e) => setFormData({ ...formData, parent_phone: e.target.value })}
                className="w-full h-9 px-3 rounded-xl border border-white/15 bg-dark-100 text-xs text-white focus:outline-none focus:border-primary-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Admission Date</label>
              <input
                type="date"
                value={formData.admission_date}
                onChange={(e) => setFormData({ ...formData, admission_date: e.target.value })}
                className="w-full h-9 px-3 rounded-xl border border-white/15 bg-dark-100 text-xs text-white focus:outline-none focus:border-primary-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full h-9 px-3 rounded-xl border border-white/15 bg-dark-100 text-xs text-white focus:outline-none focus:border-primary-500"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <Button variant="ghost" type="button" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={saving} className="gap-2">
              {saving ? 'Updating...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ==========================================
// SUB-COMPONENT: VIEW STUDENT PROFILE MODAL
// ==========================================
function ViewStudentModal({ student, onClose, onEdit }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-xl bg-dark-200 border border-white/15 rounded-2xl shadow-2xl p-6 space-y-6 my-8"
      >
        <div className="flex items-start justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-primary-600 to-indigo-500 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-primary-500/20">
              {student.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">{student.name}</h2>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${
                    student.status?.toLowerCase() === 'active'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                  }`}
                >
                  {student.status || 'Active'}
                </span>
              </div>
              <p className="text-xs font-mono text-primary-300 mt-0.5">
                Adm No: {student.admission_number || 'N/A'} • Student ID #{student.id}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Profile Grid */}
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="bg-dark-100/60 p-3 rounded-xl border border-white/5 space-y-1">
            <span className="text-gray-400 text-[11px] uppercase tracking-wider block">Class & Section</span>
            <span className="font-semibold text-white text-sm">
              {student.class_grade || student.course || '—'} {student.section ? `(Sec ${student.section})` : ''}
            </span>
          </div>

          <div className="bg-dark-100/60 p-3 rounded-xl border border-white/5 space-y-1">
            <span className="text-gray-400 text-[11px] uppercase tracking-wider block">Roll Number</span>
            <span className="font-mono font-semibold text-white text-sm">{student.roll_number || '—'}</span>
          </div>

          <div className="bg-dark-100/60 p-3 rounded-xl border border-white/5 space-y-1">
            <span className="text-gray-400 text-[11px] uppercase tracking-wider block">Gender</span>
            <span className="font-semibold text-white">{student.gender || '—'}</span>
          </div>

          <div className="bg-dark-100/60 p-3 rounded-xl border border-white/5 space-y-1">
            <span className="text-gray-400 text-[11px] uppercase tracking-wider block">Date of Birth</span>
            <span className="font-mono font-semibold text-white">{formatDate(student.dob)}</span>
          </div>

          <div className="bg-dark-100/60 p-3 rounded-xl border border-white/5 space-y-1">
            <span className="text-gray-400 text-[11px] uppercase tracking-wider block">Email</span>
            <span className="text-white truncate block">{student.email || '—'}</span>
          </div>

          <div className="bg-dark-100/60 p-3 rounded-xl border border-white/5 space-y-1">
            <span className="text-gray-400 text-[11px] uppercase tracking-wider block">Phone</span>
            <span className="font-mono text-white">{student.phone || '—'}</span>
          </div>

          <div className="col-span-2 bg-dark-100/60 p-3 rounded-xl border border-white/5 space-y-1">
            <span className="text-gray-400 text-[11px] uppercase tracking-wider block">Address</span>
            <span className="text-white block">{student.address || '—'}</span>
          </div>

          <div className="bg-dark-100/60 p-3 rounded-xl border border-white/5 space-y-1">
            <span className="text-gray-400 text-[11px] uppercase tracking-wider block">Parent / Guardian</span>
            <span className="text-white font-medium">{student.parent_name || '—'}</span>
          </div>

          <div className="bg-dark-100/60 p-3 rounded-xl border border-white/5 space-y-1">
            <span className="text-gray-400 text-[11px] uppercase tracking-wider block">Parent Phone</span>
            <span className="font-mono text-white">{student.parent_phone || '—'}</span>
          </div>

          <div className="bg-dark-100/60 p-3 rounded-xl border border-white/5 space-y-1">
            <span className="text-gray-400 text-[11px] uppercase tracking-wider block">Admission Date</span>
            <span className="font-mono text-white">{formatDate(student.admission_date)}</span>
          </div>

          <div className="bg-dark-100/60 p-3 rounded-xl border border-white/5 space-y-1">
            <span className="text-gray-400 text-[11px] uppercase tracking-wider block">Registered At</span>
            <span className="font-mono text-gray-300">
              {student.created_at ? new Date(student.created_at).toLocaleDateString() : 'Active'}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button variant="primary" onClick={onEdit} className="gap-2">
            <Edit3 className="h-4 w-4" /> Edit Record
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ==========================================
// SUB-COMPONENT: DELETE CONFIRMATION MODAL
// ==========================================
function DeleteConfirmModal({ student, onClose, onConfirm }) {
  const [deleting, setDeleting] = useState(false);

  const handleConfirm = async () => {
    setDeleting(true);
    await onConfirm();
    setDeleting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-dark-200 border border-red-500/30 rounded-2xl shadow-2xl p-6 space-y-5"
      >
        <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
          <Trash2 className="h-6 w-6" />
        </div>

        <div className="text-center space-y-2">
          <h2 className="text-lg font-bold text-white">Delete Student Record?</h2>
          <p className="text-xs text-gray-400">
            Are you sure you want to delete student <strong className="text-white">&ldquo;{student.name}&rdquo;</strong>{' '}
            (ID: #{student.id})? This will permanently delete the student from PostgreSQL.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <Button variant="ghost" onClick={onClose} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Yes, Delete Record'}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ==========================================
// SUB-COMPONENT: BATCH ADD MULTIPLE STUDENTS MODAL
// ==========================================
function BatchAddStudentsModal({ appId, onClose, onSuccess }) {
  const [rows, setRows] = useState([
    { name: '', admission_number: '', class_grade: 'Grade 10', section: 'A', roll_number: '', gender: 'Male', email: '', phone: '', status: 'Active' },
    { name: '', admission_number: '', class_grade: 'Grade 10', section: 'A', roll_number: '', gender: 'Female', email: '', phone: '', status: 'Active' },
    { name: '', admission_number: '', class_grade: 'Grade 10', section: 'B', roll_number: '', gender: 'Male', email: '', phone: '', status: 'Active' },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      { name: '', admission_number: '', class_grade: 'Grade 10', section: 'A', roll_number: '', gender: 'Male', email: '', phone: '', status: 'Active' },
    ]);
  };

  const removeRow = (idx) => {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateRow = (idx, field, value) => {
    setRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r))
    );
  };

  const handleSaveAll = async () => {
    const validRows = rows.filter((r) => r.name.trim().length > 0);
    if (validRows.length === 0) {
      setError('Please provide at least one student with a Full Name.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await orgFetch('/api/students/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-App-Id': String(appId),
        },
        body: JSON.stringify({
          students: validRows,
          skipInvalid: false,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Failed to batch insert students');
      }

      onSuccess(result.insertedCount);
    } catch (err) {
      setError(err.message || 'Error saving multiple students');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-5xl bg-dark-200 border border-white/15 rounded-2xl shadow-2xl p-6 space-y-6 my-8"
      >
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Add Multiple Students (Batch Grid)</h2>
              <p className="text-xs text-gray-400">
                Enter multiple student rows in an Excel-like grid and save them together in one transaction.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="overflow-x-auto rounded-xl border border-white/10 max-h-[380px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-dark-100 sticky top-0 border-b border-white/15">
              <tr>
                <th className="p-2.5 w-10 text-gray-400 text-center font-mono">#</th>
                <th className="p-2.5 w-40 text-gray-300 font-semibold">Full Name *</th>
                <th className="p-2.5 w-28 text-gray-300 font-semibold">Admission No</th>
                <th className="p-2.5 w-24 text-gray-300 font-semibold">Gender</th>
                <th className="p-2.5 w-28 text-gray-300 font-semibold">Class / Grade</th>
                <th className="p-2.5 w-16 text-gray-300 font-semibold">Section</th>
                <th className="p-2.5 w-20 text-gray-300 font-semibold">Roll No</th>
                <th className="p-2.5 w-36 text-gray-300 font-semibold">Email</th>
                <th className="p-2.5 w-28 text-gray-300 font-semibold">Phone</th>
                <th className="p-2.5 w-24 text-gray-300 font-semibold">Status</th>
                <th className="p-2.5 w-10 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((row, idx) => (
                <tr key={idx} className="hover:bg-white/[0.02]">
                  <td className="p-2 text-center text-gray-500 font-mono text-[11px]">{idx + 1}</td>
                  <td className="p-1.5">
                    <input
                      type="text"
                      value={row.name}
                      onChange={(e) => updateRow(idx, 'name', e.target.value)}
                      placeholder="Student Name"
                      className="w-full h-8 px-2 text-xs rounded border border-white/10 bg-dark-100 text-white focus:outline-none focus:border-primary-500 font-medium"
                    />
                  </td>
                  <td className="p-1.5">
                    <input
                      type="text"
                      value={row.admission_number}
                      onChange={(e) => updateRow(idx, 'admission_number', e.target.value)}
                      placeholder="e.g. ADM-01"
                      className="w-full h-8 px-2 text-xs rounded border border-white/10 bg-dark-100 text-white focus:outline-none focus:border-primary-500 font-mono"
                    />
                  </td>
                  <td className="p-1.5">
                    <select
                      value={row.gender}
                      onChange={(e) => updateRow(idx, 'gender', e.target.value)}
                      className="w-full h-8 px-1 text-xs rounded border border-white/10 bg-dark-100 text-white focus:outline-none"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </td>
                  <td className="p-1.5">
                    <input
                      type="text"
                      value={row.class_grade}
                      onChange={(e) => updateRow(idx, 'class_grade', e.target.value)}
                      className="w-full h-8 px-2 text-xs rounded border border-white/10 bg-dark-100 text-white focus:outline-none"
                    />
                  </td>
                  <td className="p-1.5">
                    <input
                      type="text"
                      value={row.section}
                      onChange={(e) => updateRow(idx, 'section', e.target.value)}
                      className="w-full h-8 px-1 text-center text-xs rounded border border-white/10 bg-dark-100 text-white focus:outline-none"
                    />
                  </td>
                  <td className="p-1.5">
                    <input
                      type="text"
                      value={row.roll_number}
                      onChange={(e) => updateRow(idx, 'roll_number', e.target.value)}
                      className="w-full h-8 px-1 text-xs rounded border border-white/10 bg-dark-100 text-white focus:outline-none font-mono"
                    />
                  </td>
                  <td className="p-1.5">
                    <input
                      type="email"
                      value={row.email}
                      onChange={(e) => updateRow(idx, 'email', e.target.value)}
                      placeholder="email@domain.com"
                      className="w-full h-8 px-2 text-xs rounded border border-white/10 bg-dark-100 text-white focus:outline-none"
                    />
                  </td>
                  <td className="p-1.5">
                    <input
                      type="tel"
                      value={row.phone}
                      onChange={(e) => updateRow(idx, 'phone', e.target.value)}
                      placeholder="Phone"
                      className="w-full h-8 px-2 text-xs rounded border border-white/10 bg-dark-100 text-white focus:outline-none font-mono"
                    />
                  </td>
                  <td className="p-1.5">
                    <select
                      value={row.status}
                      onChange={(e) => updateRow(idx, 'status', e.target.value)}
                      className="w-full h-8 px-1 text-xs rounded border border-white/10 bg-dark-100 text-white focus:outline-none"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </td>
                  <td className="p-1.5 text-right">
                    <button
                      type="button"
                      onClick={() => removeRow(idx)}
                      disabled={rows.length <= 1}
                      className="p-1 rounded text-gray-500 hover:text-red-400 disabled:opacity-20"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between pt-2">
          <Button variant="outline" size="sm" onClick={addRow} className="gap-1.5 border-dashed">
            <Plus className="h-3.5 w-3.5" /> Add Another Row
          </Button>

          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveAll} disabled={saving} className="gap-2">
              {saving ? 'Saving...' : `Save All (${rows.filter((r) => r.name.trim()).length} Students)`}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ==========================================
// SUB-COMPONENT: EXCEL / CSV IMPORT MODAL
// ==========================================
function ImportExcelModal({
  onClose,
  importFile,
  importPreview,
  importLoading,
  importSkipInvalid,
  setImportSkipInvalid,
  onFileChange,
  onDownloadTemplate,
  onExecuteImport,
}) {
  const fileInputRef = useRef(null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-4xl bg-dark-200 border border-white/15 rounded-2xl shadow-2xl p-6 space-y-6 my-8"
      >
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center border border-sky-500/20">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Import Students from Excel / CSV</h2>
              <p className="text-xs text-gray-400">
                Upload .xlsx, .xls, or .csv files with student details. Preview and validate before saving.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step 1: Upload or Choose File */}
        {!importPreview ? (
          <div className="space-y-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-white/20 hover:border-primary-500/60 rounded-2xl p-10 text-center cursor-pointer transition-all bg-dark-100/50 hover:bg-dark-100 group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={onFileChange}
                className="hidden"
              />
              <div className="h-14 w-14 rounded-2xl bg-primary-500/10 text-primary-400 flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform">
                <FileSpreadsheet className="h-7 w-7" />
              </div>
              <h3 className="text-base font-bold text-white">Select or drag & drop student spreadsheet</h3>
              <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
                Supports Microsoft Excel (.xlsx, .xls) and CSV (.csv). Column headers will be automatically mapped.
              </p>
              <Button variant="secondary" size="sm" className="mt-4 pointer-events-none">
                Browse Computer
              </Button>
            </div>

            {/* Template Download Prompt */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <FileDown className="h-4 w-4 text-primary-400" />
                <span className="text-gray-300">Need a pre-formatted starting sheet with all 15 supported columns?</span>
              </div>
              <Button variant="outline" size="sm" onClick={onDownloadTemplate} className="gap-1.5 h-8">
                Download Template (.xlsx)
              </Button>
            </div>
          </div>
        ) : (
          /* Step 2: Interactive Pre-Import Preview & Validation */
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-dark-100/80 rounded-xl border border-white/10">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  {importPreview.validCount}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>{importFile?.name}</span>
                    <span className="text-xs text-gray-400 font-normal">({importPreview.totalRows} rows parsed)</span>
                  </h4>
                  <div className="flex items-center gap-3 text-xs mt-0.5">
                    <span className="text-emerald-400 font-medium">✓ {importPreview.validCount} Valid rows</span>
                    {importPreview.invalidCount > 0 && (
                      <span className="text-red-400 font-medium">✗ {importPreview.invalidCount} Invalid rows</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={importSkipInvalid}
                    onChange={(e) => setImportSkipInvalid(e.target.checked)}
                    className="rounded border-white/20 bg-dark-100 text-primary-600 focus:ring-0"
                  />
                  <span>Import valid rows only (skip errors)</span>
                </label>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs"
                >
                  Change File
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={onFileChange}
                  className="hidden"
                />
              </div>
            </div>

            {/* Preview Spreadsheet Grid */}
            <div className="overflow-x-auto rounded-xl border border-white/10 max-h-[340px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-dark-100 sticky top-0 border-b border-white/15">
                  <tr>
                    <th className="p-2.5 w-12 text-gray-400 text-center">Row</th>
                    <th className="p-2.5 w-16 text-gray-400 text-center">Status</th>
                    <th className="p-2.5 w-36 text-gray-300 font-semibold">Name</th>
                    <th className="p-2.5 w-28 text-gray-300 font-semibold">Admission No</th>
                    <th className="p-2.5 w-24 text-gray-300 font-semibold">Gender</th>
                    <th className="p-2.5 w-28 text-gray-300 font-semibold">Class</th>
                    <th className="p-2.5 w-16 text-gray-300 font-semibold">Sec</th>
                    <th className="p-2.5 w-20 text-gray-300 font-semibold">Roll No</th>
                    <th className="p-2.5 w-36 text-gray-300 font-semibold">Email</th>
                    <th className="p-2.5 w-28 text-gray-300 font-semibold">Phone</th>
                    <th className="p-2.5 text-gray-300 font-semibold">Validation Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {importPreview.rows.map((row, idx) => (
                    <tr
                      key={idx}
                      className={row.isValid ? 'hover:bg-white/[0.02]' : 'bg-red-500/[0.04] hover:bg-red-500/[0.08]'}
                    >
                      <td className="p-2 text-center text-gray-500 font-mono text-[11px]">{row.rowNumber}</td>
                      <td className="p-2 text-center">
                        {row.isValid ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                            Valid
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 font-bold">
                            Error
                          </span>
                        )}
                      </td>
                      <td className={`p-2 font-medium ${!row.data.name ? 'text-red-400 font-bold' : 'text-white'}`}>
                        {row.data.name || '<Empty Name>'}
                      </td>
                      <td className="p-2 font-mono text-gray-300">{row.data.admission_number || '—'}</td>
                      <td className="p-2 text-gray-300">{row.data.gender || '—'}</td>
                      <td className="p-2 text-gray-300">{row.data.class_grade || '—'}</td>
                      <td className="p-2 text-gray-300">{row.data.section || '—'}</td>
                      <td className="p-2 font-mono text-gray-300">{row.data.roll_number || '—'}</td>
                      <td className="p-2 text-gray-300">{row.data.email || '—'}</td>
                      <td className="p-2 font-mono text-gray-300">{row.data.phone || '—'}</td>
                      <td className="p-2">
                        {row.errors.length > 0 ? (
                          <div className="space-y-0.5">
                            {row.errors.map((err, errIdx) => (
                              <span key={errIdx} className="text-[11px] text-red-400 block font-medium">
                                • {err}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] text-emerald-400 font-medium">Ready to import</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-gray-400">
                {importSkipInvalid
                  ? `Will import ${importPreview.validCount} valid record(s). ${importPreview.invalidCount} invalid row(s) will be skipped.`
                  : importPreview.invalidCount > 0
                  ? 'All rows must be valid before importing, or enable "Import valid rows only".'
                  : 'All rows validated successfully!'}
              </span>

              <div className="flex items-center gap-3">
                <Button variant="ghost" onClick={onClose} disabled={importLoading}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={onExecuteImport}
                  disabled={importLoading || (importPreview.validCount === 0) || (!importSkipInvalid && importPreview.invalidCount > 0)}
                  className="gap-2"
                >
                  {importLoading ? (
                    <>
                      <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      Importing into Database...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" /> Import{' '}
                      {importSkipInvalid ? importPreview.validCount : importPreview.totalRows} Students
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default StudentRecordsExcel;
