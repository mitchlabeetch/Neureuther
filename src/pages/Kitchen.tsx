import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import {
  ArrowLeft,
  ChefHat,
  Refrigerator,
  UtensilsCrossed,
  Sparkles,
  Droplets,
  Trash2,
  AlertCircle,
  Check,
  Plus,
  Pencil,
  X,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface KitchenRule {
  id: string;
  label: string;
  category: 'kitchen' | 'fridge' | 'appliances' | 'cleaning';
  completed: boolean;
}

const DEFAULT_RULES: KitchenRule[] = [
  // Kitchen & Appliance Care
  { id: 'k1', label: 'Organize fridge', category: 'fridge', completed: false },
  { id: 'k2', label: 'Clean coffee machine', category: 'appliances', completed: false },
  { id: 'k3', label: 'Clean kettle', category: 'appliances', completed: false },
  { id: 'k4', label: 'Clean dishwasher', category: 'appliances', completed: false },
  { id: 'k5', label: 'Leave wet stuff a bit open to dry', category: 'kitchen', completed: false },
  { id: 'k6', label: 'Put everything away immediately', category: 'kitchen', completed: false },
  // Fridge Hygiene
  { id: 'k7', label: 'No expired food in the fridge', category: 'fridge', completed: false },
  // Trash Sorting
  { id: 'k8', label: 'Take out Pfand (bottle deposit)', category: 'cleaning', completed: false },
  { id: 'k9', label: 'Take out glass / container recycling', category: 'cleaning', completed: false },
  { id: 'k10', label: 'Take out residual waste', category: 'cleaning', completed: false },
  { id: 'k11', label: 'Take out paper recycling', category: 'cleaning', completed: false },
  { id: 'k12', label: 'Take out bio / compost', category: 'cleaning', completed: false },
  // General
  { id: 'k13', label: 'Regular vacuum cleaning', category: 'cleaning', completed: false },
  { id: 'k14', label: 'Dust surfaces', category: 'cleaning', completed: false },
];

const STORAGE_KEY = 'kitchen-rules';

function loadRules(): KitchenRule[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as KitchenRule[];
      // Merge with defaults to ensure new items show up
      const existingIds = new Set(parsed.map((r) => r.id));
      const newDefaults = DEFAULT_RULES.filter((d) => !existingIds.has(d.id));
      return [...parsed, ...newDefaults];
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_RULES;
}

function saveRules(rules: KitchenRule[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
  } catch {
    /* ignore */
  }
}

function KitchenPage() {
  const navigate = useNavigate();
  const [rules, setRules] = useState<KitchenRule[]>(loadRules);
  const [showDialog, setShowDialog] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newCategory, setNewCategory] = useState<KitchenRule['category']>('kitchen');
  const [editingRule, setEditingRule] = useState<KitchenRule | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editCategory, setEditCategory] = useState<KitchenRule['category']>('kitchen');

  const toggleRule = (id: string) => {
    const next = rules.map((r) => (r.id === id ? { ...r, completed: !r.completed } : r));
    setRules(next);
    saveRules(next);
  };

  const handleCreate = () => {
    if (!newLabel.trim()) return;
    const next: KitchenRule[] = [
      ...rules,
      {
        id: crypto.randomUUID(),
        label: newLabel.trim(),
        category: newCategory,
        completed: false,
      },
    ];
    setRules(next);
    saveRules(next);
    setNewLabel('');
    setShowDialog(false);
  };

  const openEdit = (rule: KitchenRule) => {
    setEditingRule(rule);
    setEditLabel(rule.label);
    setEditCategory(rule.category);
  };

  const handleEditSave = () => {
    if (!editingRule || !editLabel.trim()) return;
    const next = rules.map((r) =>
      r.id === editingRule.id
        ? { ...r, label: editLabel.trim(), category: editCategory }
        : r
    );
    setRules(next);
    saveRules(next);
    setEditingRule(null);
  };

  const handleDeleteRule = (id: string) => {
    const next = rules.filter((r) => r.id !== id);
    setRules(next);
    saveRules(next);
  };

  const categories = [
    { key: 'kitchen', label: 'Kitchen', color: '#FDA172', icon: ChefHat },
    { key: 'fridge', label: 'Fridge', color: '#38BDF8', icon: Refrigerator },
    { key: 'appliances', label: 'Appliances', color: '#A78BFA', icon: UtensilsCrossed },
    { key: 'cleaning', label: 'Cleaning', color: '#69D2A6', icon: Sparkles },
  ] as const;

  const doneCount = rules.filter((r) => r.completed).length;

  return (
    <div className="app-container min-h-screen bg-[#fdf7f2] page-content">
      {/* Header */}
      <div className="px-5 pt-14 pb-4 animate-fade-in-up">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1 text-[#b7c6c2] text-sm font-medium mb-3 hover:text-[#171e19] transition-colors"
        >
          <ArrowLeft size={18} /> Home
        </button>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center">
              <ChefHat size={24} className="text-green-500" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold text-[#171e19] tracking-tight">Kitchen</h1>
              <p className="text-sm text-[#b7c6c2] font-medium">Household rules & cleaning</p>
            </div>
          </div>
          {rules.length > 0 && (
            <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center">
              <span className="text-lg font-semibold text-green-500">
                {Math.round((doneCount / rules.length) * 100)}%
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Category cards */}
      <div className="px-5 mb-5">
        <div className="grid grid-cols-2 gap-3">
          {categories.map((cat) => {
            const catRules = rules.filter((r) => r.category === cat.key);
            const catDone = catRules.filter((r) => r.completed).length;
            const CatIcon = cat.icon;
            return (
              <button
                key={cat.key}
                onClick={() => {
                  const el = document.getElementById(`cat-${cat.key}`);
                  el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className="group bg-white rounded-[1.5rem] p-4 text-left border border-[#b7c6c2]/20 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] transition-all duration-300 hover:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.08)] hover:-translate-y-1 active:scale-[0.97]"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-2 transition-transform group-hover:scale-110"
                  style={{ backgroundColor: cat.color + '20' }}
                >
                  <CatIcon size={20} style={{ color: cat.color }} />
                </div>
                <h4 className="text-sm font-semibold text-[#171e19] mb-0.5">{cat.label}</h4>
                <p className="text-[11px] text-[#b7c6c2] font-medium">
                  {catDone}/{catRules.length} done
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Rules by category */}
      <div className="px-5 space-y-5 mb-3">
        {categories.map((cat) => {
          const catRules = rules.filter((r) => r.category === cat.key);
          if (catRules.length === 0) return null;
          const CatIcon = cat.icon;
          return (
            <div key={cat.key} id={`cat-${cat.key}`}>
              <div className="flex items-center gap-2 mb-1">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: cat.color + '15' }}
                >
                  <CatIcon size={16} style={{ color: cat.color }} />
                </div>
                <h3 className="text-sm font-semibold text-[#171e19]">{cat.label}</h3>
              </div>
              <p className="text-[11px] text-[#b7c6c2] font-medium mb-3 leading-tight">
                These checks are resetting every day — the goal is to remain at 100% as much as possible
              </p>
              <div className="space-y-2.5">
                {catRules.map((rule) => (
                  <div
                    key={rule.id}
                    className={`flex items-center gap-3 rounded-[1.5rem] p-3.5 border transition-all duration-300 active:scale-[0.99] ${
                      rule.completed
                        ? 'bg-green-50/40 border-green-200/40'
                        : 'bg-white border-[#b7c6c2]/20 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)]'
                    } hover:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.06)]`}
                  >
                    <button
                      onClick={() => toggleRule(rule.id)}
                      aria-label={rule.completed ? 'Mark incomplete' : 'Mark complete'}
                      className={`shrink-0 w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all duration-300 active:scale-90 ${
                        rule.completed
                          ? 'bg-green-400 border-green-400 text-white'
                          : 'border-[#b7c6c2]/30 text-transparent hover:border-green-400 hover:bg-green-50'
                      }`}
                    >
                      <Check size={16} strokeWidth={3} />
                    </button>
                    <span
                      className={`flex-1 text-sm font-medium transition-colors ${
                        rule.completed
                          ? 'text-[#b7c6c2] line-through'
                          : 'text-[#171e19]'
                      }`}
                    >
                      {rule.label}
                    </span>
                    <button
                      onClick={() => openEdit(rule)}
                      className="p-2 rounded-full bg-[#eeebe3] text-[#95a5a0] hover:text-[#171e19] transition-all active:scale-90"
                      aria-label="Edit"
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add rule button */}
      <div className="px-5 mb-3">
        <button
          onClick={() => setShowDialog(true)}
          className="w-full flex items-center justify-center gap-2.5 rounded-[1.5rem] p-4 bg-[#171e19] text-white font-semibold hover:bg-[#2a302b] transition-all active:scale-[0.98] shadow-[0_10px_28px_-10px_rgba(0,0,0,0.25)]"
        >
          <div className="w-8 h-8 rounded-full bg-green-400 flex items-center justify-center">
            <Plus size={18} className="text-white" strokeWidth={2.5} />
          </div>
          <span>Add rule</span>
        </button>
      </div>

      {/* Tips card */}
      <div className="px-5 mb-8">
        <div className="bg-white rounded-[1.5rem] p-5 border border-[#b7c6c2]/20 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle size={18} className="text-[#ca0013]" />
            <h4 className="text-sm font-semibold text-[#171e19]">Household Reminders</h4>
          </div>
          <ul className="space-y-2 text-sm text-[#171e19]">
            <li className="flex items-start gap-2">
              <Droplets size={14} className="text-[#38BDF8] mt-0.5 shrink-0" />
              <span>Always leave wet stuff a bit open to air dry.</span>
            </li>
            <li className="flex items-start gap-2">
              <Refrigerator size={14} className="text-[#38BDF8] mt-0.5 shrink-0" />
              <span>There is never expired food in the fridge.</span>
            </li>
            <li className="flex items-start gap-2">
              <Trash2 size={14} className="text-[#69D2A6] mt-0.5 shrink-0" />
              <span>Take out trash as soon as bins are full.</span>
            </li>
            <li className="flex items-start gap-2">
              <Sparkles size={14} className="text-[#A78BFA] mt-0.5 shrink-0" />
              <span>Regular vacuum cleaning and dusting surfaces.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Add rule dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="rounded-[2rem] max-w-[380px] mx-auto p-0 gap-0 border-[#b7c6c2]/20">
          <DialogHeader className="px-6 pt-6 pb-3">
            <DialogTitle className="text-xl font-semibold text-[#171e19]">
              New Kitchen Rule
            </DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-6 space-y-4">
            <div>
              <label className="section-header block mb-2">Rule</label>
              <Input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="e.g. Wipe stovetop after cooking"
                className="mt-1.5 rounded-xl bg-[#eeebe3] border-[#b7c6c2]/20 focus:border-green-400 focus:ring-green-400"
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
            </div>
            <div>
              <label className="section-header block mb-2">Category</label>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.key}
                    onClick={() => setNewCategory(cat.key)}
                    className={`px-3 py-2 rounded-xl text-sm font-medium transition-all active:scale-90 ${
                      newCategory === cat.key
                        ? 'text-white'
                        : 'bg-[#eeebe3] text-[#b7c6c2] border border-[#b7c6c2]/20'
                    }`}
                    style={
                      newCategory === cat.key
                        ? { backgroundColor: cat.color }
                        : {}
                    }
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={handleCreate}
              disabled={!newLabel.trim()}
              className="w-full py-3 rounded-xl font-semibold text-white bg-[#171e19] hover:bg-[#2a302b] disabled:bg-[#eeebe3] disabled:text-[#b7c6c2] transition-all active:scale-[0.98]"
            >
              Add Rule
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit rule dialog */}
      <Dialog
        open={!!editingRule}
        onOpenChange={(open) => {
          if (!open) setEditingRule(null);
        }}
      >
        <DialogContent className="rounded-[2rem] max-w-[380px] mx-auto p-0 gap-0 border-[#b7c6c2]/20">
          <DialogHeader className="px-6 pt-6 pb-3">
            <DialogTitle className="text-xl font-semibold text-[#171e19]">
              Edit Rule
            </DialogTitle>
          </DialogHeader>
          {editingRule && (
            <div className="px-6 pb-6 space-y-4">
              <div>
                <label className="section-header block mb-2">Rule</label>
                <Input
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  className="mt-1.5 rounded-xl bg-[#eeebe3] border-[#b7c6c2]/20 focus:border-green-400 focus:ring-green-400"
                  onKeyDown={(e) => e.key === 'Enter' && handleEditSave()}
                />
              </div>
              <div>
                <label className="section-header block mb-2">Category</label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat.key}
                      onClick={() => setEditCategory(cat.key)}
                      className={`px-3 py-2 rounded-xl text-sm font-medium transition-all active:scale-90 ${
                        editCategory === cat.key
                          ? 'text-white'
                          : 'bg-[#eeebe3] text-[#b7c6c2] border border-[#b7c6c2]/20'
                      }`}
                      style={
                        editCategory === cat.key
                          ? { backgroundColor: cat.color }
                          : {}
                      }
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => {
                    if (editingRule) handleDeleteRule(editingRule.id);
                    setEditingRule(null);
                  }}
                  className="flex-1 py-3 rounded-xl font-semibold text-[#ca0013] bg-[#eeebe3] hover:bg-red-50 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <X size={16} /> Delete
                </button>
                <button
                  onClick={handleEditSave}
                  disabled={!editLabel.trim()}
                  className="flex-1 py-3 rounded-xl font-semibold text-white bg-[#171e19] hover:bg-[#2a302b] disabled:bg-[#eeebe3] disabled:text-[#b7c6c2] transition-all active:scale-[0.98]"
                >
                  Save
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}

export default KitchenPage;
