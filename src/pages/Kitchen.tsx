import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { PageHeader } from '@/components/PageHeader';
import {
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
  ShoppingBasket,
  Croissant,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useApp, type KitchenRule } from '@/lib/store';
import { showError, showSuccess } from '@/utils/toast';

function KitchenPage() {
  const navigate = useNavigate();
  const { state, addKitchenRule, updateKitchenRule, removeKitchenRule } = useApp();
  const rules = state.kitchenRules;
  const [showDialog, setShowDialog] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newCategory, setNewCategory] = useState<KitchenRule['category']>('kitchen');
  const [editingRule, setEditingRule] = useState<KitchenRule | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editCategory, setEditCategory] = useState<KitchenRule['category']>('kitchen');

  const toggleRule = async (id: string) => {
    const rule = rules.find((r) => r.id === id);
    if (!rule) return;
    try {
      await updateKitchenRule(id, { completed: !rule.completed });
    } catch {
      showError("Couldn't update this rule. Please try again.");
    }
  };

  const handleCreate = async () => {
    if (!newLabel.trim()) return;
    try {
      await addKitchenRule({ label: newLabel.trim(), category: newCategory });
      showSuccess("Kitchen rule added");
      setNewLabel('');
      setShowDialog(false);
    } catch {
      showError("Couldn't add this rule. Please try again.");
    }
  };

  const openEdit = (rule: KitchenRule) => {
    setEditingRule(rule);
    setEditLabel(rule.label);
    setEditCategory(rule.category);
  };

  const handleEditSave = async () => {
    if (!editingRule || !editLabel.trim()) return;
    try {
      await updateKitchenRule(editingRule.id, { label: editLabel.trim(), category: editCategory });
      showSuccess("Kitchen rule saved");
      setEditingRule(null);
    } catch {
      showError("Couldn't save this rule. Please try again.");
    }
  };

  const handleDeleteRule = async (id: string) => {
    try {
      await removeKitchenRule(id);
      showSuccess("Kitchen rule deleted");
    } catch {
      showError("Couldn't delete this rule. Please try again.");
    }
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
      <PageHeader
        title="Kitchen"
        subtitle="Meals, groceries & house rules"
        backTo="/"
        backLabel="Home"
        icon={
          <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center">
            <ChefHat size={24} className="text-green-500" />
          </div>
        }
        right={
          rules.length > 0 ? (
            <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center">
              <span className="text-lg font-semibold text-green-500">
                {Math.round((doneCount / rules.length) * 100)}%
              </span>
            </div>
          ) : undefined
        }
      />
        
              {/* Kitchen hub */}
              <div className="px-5 pb-5 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      document
                        .getElementById('kitchen-rules')
                        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }
                    className="group flex flex-col items-center gap-1.5 bg-white rounded-[1.5rem] px-2 py-4 border border-[#b7c6c2]/40 transition-all duration-300 hover:border-[#171e19]/30 hover:shadow-[0_6px_20px_-8px_rgba(0,0,0,0.12)] active:scale-[0.97]"
                  >
                    <div className="w-10 h-10 rounded-xl bg-green-500/15 flex items-center justify-center transition-transform group-hover:scale-110">
                      <Sparkles size={20} className="text-green-500" />
                    </div>
                    <span className="text-xs font-semibold text-[#171e19]">Rules</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/meals')}
                    className="group flex flex-col items-center gap-1.5 bg-white rounded-[1.5rem] px-2 py-4 border border-[#b7c6c2]/40 transition-all duration-300 hover:border-[#171e19]/30 hover:shadow-[0_6px_20px_-8px_rgba(0,0,0,0.12)] active:scale-[0.97]"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#FDA172]/15 flex items-center justify-center transition-transform group-hover:scale-110">
                      <Croissant size={20} className="text-[#FDA172]" />
                    </div>
                    <span className="text-xs font-semibold text-[#171e19]">Meals</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/groceries')}
                    className="group flex flex-col items-center gap-1.5 bg-white rounded-[1.5rem] px-2 py-4 border border-[#b7c6c2]/40 transition-all duration-300 hover:border-[#171e19]/30 hover:shadow-[0_6px_20px_-8px_rgba(0,0,0,0.12)] active:scale-[0.97]"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#69D2A6]/15 flex items-center justify-center transition-transform group-hover:scale-110">
                      <ShoppingBasket size={20} className="text-[#69D2A6]" />
                    </div>
                    <span className="text-xs font-semibold text-[#171e19]">Groceries</span>
                  </button>
                </div>
              </div>
        
              {/* Kitchen Rules */}
      <div id="kitchen-rules" className="px-5 mb-2">
        <h3 className="section-header">Kitchen Rules</h3>
        <p className="text-[11px] text-[#b7c6c2] font-medium mt-0.5">
          Your everyday house rules — tap a category to jump to it.
        </p>
      </div>
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
                Keep these ticked as you keep the kitchen in shape.
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
