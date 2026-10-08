import React from 'react';
import { 
  Type, 
  Square, 
  FormInput, 
  CheckSquare, 
  Calendar as CalendarIcon, 
  Table as TableIcon, 
  CreditCard, 
  Layers, 
  ChevronDown, 
  MousePointerClick, 
  Heading as HeadingIcon,
  BarChart2,
  Minus
} from 'lucide-react';

export const COMPONENT_DEFINITIONS = [
  // Layout
  {
    type: 'container',
    category: 'Layout',
    label: 'Container / Section',
    description: 'Grid section to group and arrange components',
    icon: Layers,
    defaultProps: {
      name: 'section_container',
      label: 'Section Container',
      colSpan: 12,
      columns: 2,
      styling: { padding: 'medium', background: 'glass' },
    }
  },
  {
    type: 'card',
    category: 'Layout',
    label: 'Card Surface',
    description: 'Elevated surface card with title and content',
    icon: CreditCard,
    defaultProps: {
      name: 'surface_card',
      label: 'Card Title',
      subtitle: 'Optional card description or subtitle',
      colSpan: 12,
      styling: { padding: 'medium', variant: 'glass' },
    }
  },

  // Content
  {
    type: 'heading',
    category: 'Content',
    label: 'Heading',
    description: 'Section or page title',
    icon: HeadingIcon,
    defaultProps: {
      name: 'section_heading',
      text: 'New Heading',
      level: 'h2', // h1, h2, h3
      colSpan: 12,
      styling: { alignment: 'left', color: 'white' },
    }
  },
  {
    type: 'text',
    category: 'Content',
    label: 'Paragraph / Text',
    description: 'Informational or descriptive text',
    icon: Type,
    defaultProps: {
      name: 'body_text',
      text: 'This is a description text block that provides context to the user.',
      colSpan: 12,
      styling: { alignment: 'left', color: 'muted' },
    }
  },
  {
    type: 'divider',
    category: 'Content',
    label: 'Divider Line',
    description: 'Horizontal separator rule',
    icon: Minus,
    defaultProps: {
      name: 'divider_line',
      colSpan: 12,
    }
  },

  // Form Controls
  {
    type: 'form',
    category: 'Forms',
    label: 'Form Wrapper',
    description: 'Form submission container bound to API',
    icon: Square,
    defaultProps: {
      name: 'data_form',
      label: 'Form Submission',
      colSpan: 12,
      submitLabel: 'Submit Data',
      apiBinding: { endpoint: '', method: 'POST' },
    }
  },
  {
    type: 'input',
    category: 'Forms',
    label: 'Text Input',
    description: 'Single-line text or number input field',
    icon: FormInput,
    defaultProps: {
      name: 'input_field',
      label: 'Input Field',
      placeholder: 'Enter value...',
      inputType: 'text', // text, email, number
      colSpan: 6,
      required: false,
      dataBinding: { table: '', column: '' },
    }
  },
  {
    type: 'select',
    category: 'Forms',
    label: 'Dropdown / Select',
    description: 'Select an option from a dropdown list',
    icon: ChevronDown,
    defaultProps: {
      name: 'select_field',
      label: 'Select Option',
      placeholder: '-- Choose an option --',
      colSpan: 6,
      required: false,
      dataBinding: { table: '', column: '' },
      selectOptions: [
        { label: 'Option 1', value: 'option_1' },
        { label: 'Option 2', value: 'option_2' }
      ]
    }
  },
  {
    type: 'checkbox',
    category: 'Forms',
    label: 'Checkbox',
    description: 'Boolean checkbox toggle',
    icon: CheckSquare,
    defaultProps: {
      name: 'checkbox_field',
      label: 'I confirm this action',
      colSpan: 6,
      required: false,
      defaultChecked: false,
      dataBinding: { table: '', column: '' },
    }
  },
  {
    type: 'date',
    category: 'Forms',
    label: 'Date Picker',
    description: 'Calendar date selection field',
    icon: CalendarIcon,
    defaultProps: {
      name: 'date_field',
      label: 'Select Date',
      colSpan: 6,
      required: false,
      dataBinding: { table: '', column: '' },
    }
  },
  {
    type: 'button',
    category: 'Forms',
    label: 'Action Button',
    description: 'Clickable button to trigger actions or APIs',
    icon: MousePointerClick,
    defaultProps: {
      name: 'action_button',
      label: 'Click Action',
      colSpan: 6,
      styling: { variant: 'primary', size: 'default' },
      buttonConfig: {
        actionType: 'api', // api, navigate
        apiEndpoint: '',
        targetPage: '',
      }
    }
  },

  // Data Display
  {
    type: 'table',
    category: 'Data',
    label: 'Data Table',
    description: 'Tabular list bound to Database Schema and GET API',
    icon: TableIcon,
    defaultProps: {
      name: 'records_table',
      label: 'Data Records',
      colSpan: 12,
      tableConfig: {
        tableName: '',
        columns: [],
        apiEndpoint: '',
      }
    }
  },
  {
    type: 'metric',
    category: 'Data',
    label: 'Metric Card',
    description: 'Key performance metric summary indicator',
    icon: BarChart2,
    defaultProps: {
      name: 'metric_indicator',
      label: 'Total Count',
      value: '128',
      subtitle: '+12% from previous month',
      colSpan: 4,
      styling: { variant: 'primary' }
    }
  }
];

export function ComponentPalette({ onAddComponent }) {
  const categories = ['Layout', 'Forms', 'Content', 'Data'];

  return (
    <div className="w-72 bg-dark-300/80 border-r border-white/10 flex flex-col h-full overflow-hidden select-none">
      <div className="p-4 border-b border-white/10 bg-dark-200/50">
        <h3 className="font-semibold text-white text-sm">Component Palette</h3>
        <p className="text-xs text-gray-400 mt-0.5">Click any component to add to active page</p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {categories.map((category) => {
          const items = COMPONENT_DEFINITIONS.filter(c => c.category === category);
          return (
            <div key={category} className="space-y-1.5">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 px-2">
                {category}
              </h4>
              <div className="space-y-1">
                {items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => onAddComponent(item)}
                      className="w-full text-left p-2.5 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.08] hover:border-primary-500/40 transition-all flex items-start gap-3 group"
                    >
                      <div className="p-1.5 rounded-md bg-white/5 group-hover:bg-primary-500/20 text-gray-400 group-hover:text-primary-400 transition-colors">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-gray-200 group-hover:text-white flex items-center justify-between">
                          <span>{item.label}</span>
                          <span className="text-[10px] text-primary-400 opacity-0 group-hover:opacity-100 transition-opacity font-mono">
                            + Add
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 truncate mt-0.5">
                          {item.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
