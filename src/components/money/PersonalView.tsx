import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Plus, Pencil, Trash2, Lock, X, Check, Eye, EyeOff, Grid3X3, Receipt, BarChart3 } from 'lucide-react';
import { useApp } from '@/lib/store';

interface PersonalExpense {
  id: string;
  userId: string;
  title: string;
  amount: number;
  category: string;
  date: string;
}

interface PersonalSubscription {
  id: string;
  userId: string;
  name: string;
  paymentDate: string;
  amount: number;
  serviceType: string;
}

interface DashboardWidget {
  id: string;
  userId: string;
  widgetType: string;
  title: string;
  value: string;
  sortOrder: number;
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(res.statusText);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

const CATEGORIES = ['food', 'transport', 'shopping', 'entertainment', 'bills', 'health', 'general'] as const;
const CATEGORY_LABELS: Record<string, string> = {
  food: '🍔 Food',
  transport: '🚗 Transport',
  shopping: '🛍️ Shopping',
  entertainment: '🎮 Entertainment',
  bills: '📄 Bills',
  health: '💊 Health',
  general: '📌 General',
};

const SERVICE_TYPES = ['streaming', 'music', 'cloud', 'fitness', 'food', 'other'] as const;
const SERVICE_LABELS: Record<string, string> = {
  streaming: '🎬 Streaming',
  music: '🎵 Music',
  cloud: '☁️ Cloud',
  fitness: '🏋️ Fitness',
  food: '🍕 Food',
  other: '📦 Other',
};

type PersonalTab = 'dashboard' | 'expenses' | 'subscriptions';

export function PersonalView({ onBack }: { onBack: () => void }) {
  const { state, getUserById } = useApp();
  const [step, setStep] = useState<'selectUser' | 'pin' | 'space'>('selectUser');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [pinConfirm, setPinConfirm] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // Personal space states
  const [tab, setTab] = useState<PersonalTab>('dashboard');
  const [expenses, setExpenses] = useState<PersonalExpense[]>([]);
  const [subs, setSubs] = useState<PersonalSubscription[]>([]);
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [loading, setLoading] = useState(true);

  // Add/Edit states
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddSub, setShowAddSub] = useState(false);
  const [showAddWidget, setShowAddWidget] = useState(false);
  const [editingWidget, setEditingWidget] = useState<{ id: string; value: string; title: string } | null>(null);
  const [editingExpense, setEditingExpense] = useState<{ id: string; title: string; amount: string; category: string; date: string } | null>(null);
  const [editingSub, setEditingSub] = useState<{ id: string; name: string; paymentDate: string; amount: string; serviceType: string } | null>(null);

  const [newExpTitle, setNewExpTitle] = useState('');
  const [newExpAmount, setNewExpAmount] = useState('');
  const [newExpCategory, setNewExpCategory] = useState('general');
  const [newExpDate, setNewExpDate] = useState(new Date().toISOString().split('T')[0]);
  const [newSubName, setNewSubName] = useState('');
  const [newSubAmount, setNewSubAmount] = useState('');
  const [newSubDate, setNewSubDate] = useState(new Date().toISOString().split('T')[0]);
  const [newSubType, setNewSubType] = useState('other');
  const [newWidgetTitle, setNewWidgetTitle] = useState('');
  const [newWidgetValue, setNewWidgetValue] = useState('');
  const [newWidgetType, setNewWidgetType] = useState<'stat' | 'goal'>('stat');

  // ─── PIN Logic ───
  const handleSelectUser = async (userId: string) => {
    setSelectedUserId(userId);
    setPin('');
    setPinError('');
    setPinConfirm('');
    setIsFirstTime(false);
    setStep('pin');
    try {
      const { hasPin } = await api<{ hasPin: boolean }>('/api/check-pin', {
        method: 'POST',
        body: JSON.stringify({ userId }),
      });
      setIsFirstTime(!hasPin);
    } catch {
      setIsFirstTime(false);
    }
  };

  const handlePinSubmit = async () => {
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      setPinError('Enter a 4-digit PIN');
      return;
    }

    // If first time needs confirm
    if (isFirstTime && pinConfirm !== pin) {
      setPinError('PINs do not match');
      return;
    }

    setVerifying(true);
    try {
      const result = await api<{ action: string; valid: boolean }>('/api/money/personal/verify-pin', {
        method: 'POST',
        body: JSON.stringify({ userId: selectedUserId, pin }),
      });

      if (result.action === 'set') {
        // PIN was set successfully, enter space
        setPin('');
        setPinError('');
        setPinConfirm('');
        setIsFirstTime(false);
        setStep('space');
        loadPersonalData();
      } else if (result.valid) {
        setPin('');
        setPinError('');
        setStep('space');
        loadPersonalData();
      } else {
        setPinError('Wrong PIN. Try again.');
      }
    } catch {
      setPinError('Something went wrong');
    }
    setVerifying(false);
  };

  const loadPersonalData = async () => {
    setLoading(true);
    try {
      const [expData, subData, widData] = await Promise.all([
        api<PersonalExpense[]>(`/api/money/personal/expenses?userId=${selectedUserId}`),
        api<PersonalSubscription[]>(`/api/money/personal/subscriptions?userId=${selectedUserId}`),
        api<DashboardWidget[]>(`/api/money/personal/dashboard-widgets?userId=${selectedUserId}`),
      ]);
      setExpenses(expData);
      setSubs(subData);
      setWidgets(widData);
    } catch { /* ignore */ }
    setLoading(false);
  };

  // ─── Dashboard Widgets ───
  const handleAddWidget = async () => {
    if (!newWidgetTitle.trim()) return;
    await api('/api/money/personal/dashboard-widgets', {
      method: 'POST',
      body: JSON.stringify({ userId: selectedUserId, widgetType: newWidgetType, title: newWidgetTitle.trim(), value: newWidgetValue || '0' }),
    });
    setNewWidgetTitle('');
    setNewWidgetValue('');
    setShowAddWidget(false);
    loadPersonalData();
  };

  const saveWidget = async () => {
    if (!editingWidget) return;
    await api(`/api/money/personal/dashboard-widgets/${editingWidget.id}`, {
      method: 'PUT',
      body: JSON.stringify({ value: editingWidget.value, title: editingWidget.title }),
    });
    setEditingWidget(null);
    loadPersonalData();
  };

  const deleteWidget = async (id: string) => {
    await api(`/api/money/personal/dashboard-widgets/${id}`, { method: 'DELETE' });
    loadPersonalData();
  };

  // ─── Expenses ───
  const handleAddExpense = async () => {
    if (!newExpTitle.trim() || !newExpAmount) return;
    await api('/api/money/personal/expenses', {
      method: 'POST',
      body: JSON.stringify({
        userId: selectedUserId,
        title: newExpTitle.trim(),
        amount: parseFloat(newExpAmount),
        category: newExpCategory,
        date: newExpDate,
      }),
    });
    setNewExpTitle('');
    setNewExpAmount('');
    setNewExpDate(new Date().toISOString().split('T')[0]);
    setNewExpCategory('general');
    setShowAddExpense(false);
    loadPersonalData();
  };

  const saveExpense = async () => {
    if (!editingExpense) return;
    await api(`/api/money/personal/expenses/${editingExpense.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        title: editingExpense.title,
        amount: parseFloat(editingExpense.amount),
        category: editingExpense.category,
        date: editingExpense.date,
      }),
    });
    setEditingExpense(null);
    loadPersonalData();
  };

  const deleteExpense = async (id: string) => {
    await api(`/api/money/personal/expenses/${id}`, { method: 'DELETE' });
    loadPersonalData();
  };

  // ─── Subscriptions ───
  const handleAddSub = async () => {
    if (!newSubName.trim() || !newSubAmount) return;
    await api('/api/money/personal/subscriptions', {
      method: 'POST',
      body: JSON.stringify({
        userId: selectedUserId,
        name: newSubName.trim(),
        paymentDate: newSubDate,
        amount: parseFloat(newSubAmount),
        serviceType: newSubType,
      }),
    });
    setNewSubName('');
    setNewSubAmount('');
    setNewSubDate(new Date().toISOString().split('T')[0]);
    setNewSubType('other');
    setShowAddSub(false);
    loadPersonalData();
  };

  const saveSub = async () => {
    if (!editingSub) return;
    await api(`/api/money/personal/subscriptions/${editingSub.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: editingSub.name,
        paymentDate: editingSub.paymentDate,
        amount: parseFloat(editingSub.amount),
        serviceType: editingSub.serviceType,
      }),
    });
    setEditingSub(null);
    loadPersonalData();
  };

  const deleteSub = async (id: string) => {
    await api(`/api/money/personal/subscriptions/${id}`, { method: 'DELETE' });
    loadPersonalData();
  };

  // ─── Render ───

  // STEP: Select User
  if (step === 'selectUser') {
    return (
      <div className="px-5 pt-14 pb-24">
        <button onClick={onBack} className="flex items-center gap-1 text-[#b7c6c2] text-sm font-medium mb-3 hover:text-[#171e19]">
          <ArrowLeft size={18} /> Back
        </button>
        <h2 className="text-2xl font-semibold text-[#171e19] tracking-tight mb-1">Personal</h2>
        <p className="text-sm text-[#b7c6c2] font-medium mb-6">Choose your space</p>

        <div className="space-y-3">
          {state.users.map(u => (
            <button
              key={u.id}
              onClick={() => handleSelectUser(u.id)}
              className="w-full bg-white rounded-[1.5rem] p-5 border border-[#b7c6c2]/20 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] flex items-center gap-4 active:scale-[0.98] transition-transform hover:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.08)] hover:-translate-y-0.5"
            >
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl" style={{ backgroundColor: u.color + '30' }}>
                {u.emoji}
              </div>
              <div className="text-left">
                <h4 className="text-[#171e19] font-semibold text-lg">{u.name}</h4>
                <p className="text-sm text-[#b7c6c2]">Personal finances</p>
              </div>
            </button>
          ))}

          {state.users.length === 0 && (
            <p className="text-[#b7c6c2] text-sm text-center py-8">No users configured. Add users in Settings first.</p>
          )}
        </div>
      </div>
    );
  }

  // STEP: PIN Entry
  if (step === 'pin') {
    const user = getUserById(selectedUserId);
    const handleNumberPress = (n: string) => {
      if (isFirstTime) {
        if (pin.length < 4) {
          setPin(prev => prev + n);
          setPinError('');
        } else if (pinConfirm.length < 4) {
          setPinConfirm(prev => prev + n);
          setPinError('');
        }
      } else if (pin.length < 4) {
        setPin(prev => prev + n);
        setPinError('');
      }
    };

    const inConfirmStep = isFirstTime && pin.length === 4;

    return (
      <div className="px-5 pt-8 pb-8 flex flex-col min-h-[calc(100vh-80px)]">
        <button
          onClick={() => {
            setStep('selectUser');
            setPin('');
            setPinError('');
            setPinConfirm('');
            setIsFirstTime(false);
          }}
          className="self-start flex items-center gap-1 text-[#b7c6c2] text-sm font-medium mb-2 hover:text-[#171e19]"
        >
          <ArrowLeft size={18} /> Back
        </button>

        <div className="flex-1 flex flex-col items-center justify-center w-full">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-2xl mb-2"
            style={{ backgroundColor: (user?.color ?? '#b7c6c2') + '30' }}
          >
            {user?.emoji}
          </div>
          <h3 className="text-lg font-semibold text-[#171e19] mb-1">{user?.name}</h3>

          {isFirstTime ? (
            <p className="text-sm text-[#b7c6c2] font-medium mb-4 text-center">
              {inConfirmStep ? 'Confirm your PIN' : 'Set a 4-digit PIN'}
            </p>
          ) : (
            <p className="text-sm text-[#b7c6c2] font-medium mb-4">Enter your PIN</p>
          )}

          {/* PIN dots — show 1 row (verify) or 2 rows (first-time setup) */}
          {isFirstTime ? (
            <div className="flex flex-col items-center gap-3 mb-4">
              {/* Original PIN row: locked green once filled */}
              <div className="flex gap-2.5">
                {[0, 1, 2, 3].map(i => {
                  const filled = i < pin.length;
                  return (
                    <div
                      key={`pin-${i}`}
                      className={`w-3.5 h-3.5 rounded-full border-2 transition-all ${
                        filled
                          ? 'bg-[#69D2A6] border-[#69D2A6]'
                          : 'border-[#b7c6c2] bg-transparent'
                      }`}
                    />
                  );
                })}
              </div>
              {/* Confirm row: shows progress during confirm step */}
              <div className="flex gap-2.5">
                {[0, 1, 2, 3].map(i => {
                  const filled = inConfirmStep && i < pinConfirm.length;
                  return (
                    <div
                      key={`confirm-${i}`}
                      className={`w-3.5 h-3.5 rounded-full border-2 transition-all ${
                        filled
                          ? 'bg-[#171e19] border-[#171e19]'
                          : 'border-[#b7c6c2] bg-transparent'
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex gap-2.5 mb-4">
              {[0, 1, 2, 3].map(i => (
                <div
                  key={i}
                  className={`w-3.5 h-3.5 rounded-full border-2 transition-all ${
                    i < pin.length
                      ? 'bg-[#171e19] border-[#171e19]'
                      : 'border-[#b7c6c2] bg-transparent'
                  }`}
                />
              ))}
            </div>
          )}

          {pinError && (
            <p className="text-sm text-[#ca0013] font-medium mb-3 text-center" data-testid="pin-error">
              {pinError}
            </p>
          )}

          {/* Number pad */}
          <div className="grid grid-cols-3 gap-2 w-full max-w-[240px]">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
              <button
                key={n}
                onClick={() => handleNumberPress(String(n))}
                className="w-16 h-16 rounded-2xl bg-white border border-[#b7c6c2]/20 text-[#171e19] text-xl font-bold active:bg-[#eeebe3] active:scale-95 transition-all shadow-[0_4px_12px_-4px_rgba(0,0,0,0.04)]"
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => {
                if (isFirstTime && pinConfirm.length > 0) setPinConfirm(prev => prev.slice(0, -1));
                else if (pin.length > 0) setPin(prev => prev.slice(0, -1));
                setPinError('');
              }}
              className="w-16 h-16 rounded-2xl bg-transparent text-[#b7c6c2] text-sm font-semibold active:scale-95 transition-all"
              aria-label="Backspace"
            >
              ⌫
            </button>
            <button
              onClick={() => handleNumberPress('0')}
              className="w-16 h-16 rounded-2xl bg-white border border-[#b7c6c2]/20 text-[#171e19] text-xl font-bold active:bg-[#eeebe3] active:scale-95 transition-all shadow-[0_4px_12px_-4px_rgba(0,0,0,0.04)]"
            >
              0
            </button>
            <button
              onClick={handlePinSubmit}
              disabled={verifying || (isFirstTime ? pin.length !== 4 || pinConfirm.length !== 4 : pin.length !== 4)}
              className="w-16 h-16 rounded-2xl bg-[#ca0013] text-white font-bold text-sm disabled:opacity-40 active:scale-95 transition-all shadow-[0_4px_16px_-4px_rgba(202,0,19,0.3)]"
              aria-label="Submit PIN"
            >
              {verifying ? '...' : '✓'}
            </button>
          </div>

        </div>
      </div>
    );
  }

  // STEP: Personal Space (dashboard, expenses, subscriptions)
  const user = getUserById(selectedUserId);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalSubs = subs.reduce((sum, s) => sum + s.amount, 0);

  return (
    <div className="px-5 pt-14 pb-24">
      <div className="flex items-center justify-between mb-2 animate-fade-in-up">
        <button onClick={() => { setStep('selectUser'); setPin(''); setPinError(''); setPinConfirm(''); setIsFirstTime(false); }} className="flex items-center gap-1 text-[#b7c6c2] text-sm font-medium hover:text-[#171e19]">
          <ArrowLeft size={18} /> Back
        </button>
        <span className="text-sm text-[#b7c6c2] flex items-center gap-1.5">
          <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm" style={{ backgroundColor: user?.color + '30' }}>
            {user?.emoji}
          </span>
          {user?.name}
        </span>
      </div>

      <h2 className="text-2xl font-semibold text-[#171e19] tracking-tight mb-4 animate-fade-in-up">Personal Space</h2>

      {/* Tab Bar */}
      <div className="flex bg-[#eeebe3] rounded-full p-1 mb-5 animate-fade-in-up">
        {[
          { key: 'dashboard' as PersonalTab, icon: Grid3X3, label: 'Dashboard' },
          { key: 'expenses' as PersonalTab, icon: BarChart3, label: 'Expenses' },
          { key: 'subscriptions' as PersonalTab, icon: Receipt, label: 'Subs' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full text-sm font-medium transition-all ${
              tab === t.key ? 'bg-white text-[#171e19] shadow-sm' : 'text-[#b7c6c2]'
            }`}
          >
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-[#b7c6c2] text-sm text-center py-10">Loading...</p>
      ) : (
        <>
          {/* DASHBOARD TAB */}
          {tab === 'dashboard' && (
            <div className="space-y-4 animate-fade-in-up">
              <div className="flex items-center justify-between">
                <p className="text-xs font-extrabold text-[#b7c6c2] uppercase tracking-[0.1em]">Widgets</p>
                <button onClick={() => setShowAddWidget(true)} className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center active:scale-95 transition-transform">
                  <Plus size={16} className="text-[#ca0013]" />
                </button>
              </div>

              {/* Summary Widgets */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/80 backdrop-blur-sm rounded-[1rem] p-3 border border-[#b7c6c2]/20">
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#b7c6c2]">Total Expenses</p>
                  <p className="text-lg font-bold text-[#171e19]">${totalExpenses.toFixed(2)}</p>
                </div>
                <div className="bg-white/80 backdrop-blur-sm rounded-[1rem] p-3 border border-[#b7c6c2]/20">
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#b7c6c2]">Subscriptions</p>
                  <p className="text-lg font-bold text-[#171e19]">${totalSubs.toFixed(2)}</p>
                </div>
                <div className="bg-white/80 backdrop-blur-sm rounded-[1rem] p-3 border border-[#b7c6c2]/20">
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#b7c6c2]"># Expenses</p>
                  <p className="text-lg font-bold text-[#171e19]">{expenses.length}</p>
                </div>
                <div className="bg-white/80 backdrop-blur-sm rounded-[1rem] p-3 border border-[#b7c6c2]/20">
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#b7c6c2]"># Subs</p>
                  <p className="text-lg font-bold text-[#171e19]">{subs.length}</p>
                </div>
              </div>

              {/* Custom Widgets */}
              {widgets.length === 0 && (
                <p className="text-sm text-[#b7c6c2] text-center py-4">No custom widgets yet. Add one!</p>
              )}
              <div className="grid grid-cols-2 gap-3">
                {widgets.map(w => (
                  <div key={w.id} className="bg-white/80 backdrop-blur-sm rounded-[1rem] p-3 border border-[#b7c6c2]/20 relative group">
                    {editingWidget?.id === w.id ? (
                      <div className="space-y-2">
                        <input
                          value={editingWidget!.title}
                          onChange={e => setEditingWidget(prev => prev ? { ...prev, title: e.target.value } : null)}
                          className="w-full px-2 py-1.5 rounded-lg border border-[#b7c6c2]/30 text-xs font-bold text-[#171e19] outline-none"
                        />
                        <input
                          value={editingWidget!.value}
                          onChange={e => setEditingWidget(prev => prev ? { ...prev, value: e.target.value } : null)}
                          className="w-full px-2 py-1.5 rounded-lg border border-[#b7c6c2]/30 text-sm text-[#171e19] outline-none"
                        />
                        <div className="flex gap-1.5">
                          <button onClick={saveWidget} className="flex-1 py-1.5 rounded-lg bg-[#ca0013] text-white text-xs font-semibold active:scale-95 transition-transform">
                            Save
                          </button>
                          <button onClick={() => setEditingWidget(null)} className="py-1.5 px-3 rounded-lg bg-[#eeebe3] text-[#b7c6c2] text-xs font-semibold">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#b7c6c2]">{w.title}</p>
                        <p className="text-lg font-bold text-[#171e19]">{w.value}</p>
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setEditingWidget({ id: w.id, value: w.value, title: w.title })}
                            className="w-6 h-6 rounded-full bg-[#eeebe3] flex items-center justify-center"
                          >
                            <Pencil size={10} className="text-[#b7c6c2]" />
                          </button>
                          <button
                            onClick={() => deleteWidget(w.id)}
                            className="w-6 h-6 rounded-full bg-red-50 flex items-center justify-center"
                          >
                            <Trash2 size={10} className="text-[#ca0013]" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* EXPENSES TAB */}
          {tab === 'expenses' && (
            <div className="space-y-3 animate-fade-in-up">
              <div className="flex items-center justify-between">
                <p className="text-xs font-extrabold text-[#b7c6c2] uppercase tracking-[0.1em]">Personal Expenses</p>
                <button onClick={() => setShowAddExpense(true)} className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center active:scale-95 transition-transform">
                  <Plus size={16} className="text-[#ca0013]" />
                </button>
              </div>

              <div className="bg-white rounded-[1.5rem] p-4 border border-[#b7c6c2]/20 shadow-sm mb-2">
                <p className="text-xs text-[#b7c6c2] font-medium">Total</p>
                <p className="text-2xl font-bold text-[#171e19]">${totalExpenses.toFixed(2)}</p>
              </div>

              {expenses.length === 0 && (
                <p className="text-sm text-[#b7c6c2] text-center py-8">No expenses yet.</p>
              )}

              {expenses.map(exp => (
                <div key={exp.id} className="bg-white rounded-[1.5rem] p-4 border border-[#b7c6c2]/20 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)]">
                  {editingExpense?.id === exp.id ? (
                    <div className="space-y-3">
                      <input value={editingExpense!.title} onChange={e => setEditingExpense(prev => prev ? { ...prev, title: e.target.value } : null)}
                        className="w-full px-3 py-2 rounded-xl border border-[#b7c6c2]/30 text-sm font-semibold text-[#171e19] bg-white outline-none focus:border-[#ca0013]" />
                      <div className="flex gap-2">
                        <input type="number" value={editingExpense!.amount} onChange={e => setEditingExpense(prev => prev ? { ...prev, amount: e.target.value } : null)}
                          className="flex-1 px-3 py-2 rounded-xl border border-[#b7c6c2]/30 text-sm text-[#171e19] bg-white outline-none focus:border-[#ca0013]" />
                        <input type="date" value={editingExpense!.date} onChange={e => setEditingExpense(prev => prev ? { ...prev, date: e.target.value } : null)}
                          className="flex-1 px-3 py-2 rounded-xl border border-[#b7c6c2]/30 text-sm text-[#171e19] bg-white outline-none focus:border-[#ca0013]" />
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {CATEGORIES.map(c => (
                          <button key={c} onClick={() => setEditingExpense(prev => prev ? { ...prev, category: c } : null)}
                            className={`px-3 py-1 rounded-full text-xs font-medium ${editingExpense!.category === c ? 'bg-[#171e19] text-white' : 'bg-[#eeebe3] text-[#b7c6c2]'}`}>
                            {CATEGORY_LABELS[c]}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button onClick={saveExpense} className="flex-1 py-2 rounded-full bg-[#ca0013] text-white text-sm font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-transform">
                          <Check size={16} /> Save
                        </button>
                        <button onClick={() => setEditingExpense(null)} className="py-2 px-4 rounded-full bg-[#eeebe3] text-[#b7c6c2] text-sm font-semibold">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                        <span className="text-lg">{CATEGORY_LABELS[exp.category]?.split(' ')[0] || '📌'}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[#171e19] font-semibold text-base truncate">{exp.title}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-sm text-[#b7c6c2]">{exp.date}</span>
                          <span className="text-sm font-bold text-[#171e19]">${exp.amount.toFixed(2)}</span>
                        </div>
                        <span className="text-xs bg-[#eeebe3] px-2 py-0.5 rounded-full text-[#b7c6c2] font-medium mt-1 inline-block">
                          {CATEGORY_LABELS[exp.category]}
                        </span>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <button onClick={() => setEditingExpense({ id: exp.id, title: exp.title, amount: exp.amount.toString(), category: exp.category, date: exp.date })}
                          className="w-9 h-9 rounded-full bg-[#eeebe3] flex items-center justify-center hover:bg-[#b7c6c2]/30 transition-colors">
                          <Pencil size={15} className="text-[#b7c6c2]" />
                        </button>
                        <button onClick={() => deleteExpense(exp.id)} className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center hover:bg-red-100 transition-colors">
                          <Trash2 size={15} className="text-[#ca0013]" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* SUBSCRIPTIONS TAB */}
          {tab === 'subscriptions' && (
            <div className="space-y-3 animate-fade-in-up">
              <div className="flex items-center justify-between">
                <p className="text-xs font-extrabold text-[#b7c6c2] uppercase tracking-[0.1em]">My Subscriptions</p>
                <button onClick={() => setShowAddSub(true)} className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center active:scale-95 transition-transform">
                  <Plus size={16} className="text-[#ca0013]" />
                </button>
              </div>

              <div className="bg-white rounded-[1.5rem] p-4 border border-[#b7c6c2]/20 shadow-sm mb-2">
                <p className="text-xs text-[#b7c6c2] font-medium">Monthly Total</p>
                <p className="text-2xl font-bold text-[#171e19]">${totalSubs.toFixed(2)}</p>
              </div>

              {subs.length === 0 && (
                <p className="text-sm text-[#b7c6c2] text-center py-8">No subscriptions yet.</p>
              )}

              {subs.map(s => (
                <div key={s.id} className="bg-white rounded-[1.5rem] p-4 border border-[#b7c6c2]/20 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)]">
                  {editingSub?.id === s.id ? (
                    <div className="space-y-3">
                      <input value={editingSub!.name} onChange={e => setEditingSub(prev => prev ? { ...prev, name: e.target.value } : null)}
                        className="w-full px-3 py-2 rounded-xl border border-[#b7c6c2]/30 text-sm font-semibold text-[#171e19] bg-white outline-none focus:border-[#ca0013]" />
                      <div className="flex gap-2">
                        <input type="number" value={editingSub!.amount} onChange={e => setEditingSub(prev => prev ? { ...prev, amount: e.target.value } : null)}
                          className="flex-1 px-3 py-2 rounded-xl border border-[#b7c6c2]/30 text-sm text-[#171e19] bg-white outline-none focus:border-[#ca0013]" />
                        <input type="date" value={editingSub!.paymentDate} onChange={e => setEditingSub(prev => prev ? { ...prev, paymentDate: e.target.value } : null)}
                          className="flex-1 px-3 py-2 rounded-xl border border-[#b7c6c2]/30 text-sm text-[#171e19] bg-white outline-none focus:border-[#ca0013]" />
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {SERVICE_TYPES.map(st => (
                          <button key={st} onClick={() => setEditingSub(prev => prev ? { ...prev, serviceType: st } : null)}
                            className={`px-3 py-1 rounded-full text-xs font-medium ${editingSub!.serviceType === st ? 'bg-[#171e19] text-white' : 'bg-[#eeebe3] text-[#b7c6c2]'}`}>
                            {SERVICE_LABELS[st]}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button onClick={saveSub} className="flex-1 py-2 rounded-full bg-[#ca0013] text-white text-sm font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-transform">
                          <Check size={16} /> Save
                        </button>
                        <button onClick={() => setEditingSub(null)} className="py-2 px-4 rounded-full bg-[#eeebe3] text-[#b7c6c2] text-sm font-semibold">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center shrink-0">
                        <span className="text-lg">{SERVICE_LABELS[s.serviceType]?.split(' ')[0] || '📦'}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[#171e19] font-semibold text-base truncate">{s.name}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-sm text-[#b7c6c2]">{s.paymentDate}</span>
                          <span className="text-sm font-bold text-[#171e19]">${s.amount.toFixed(2)}</span>
                        </div>
                        <span className="text-xs bg-[#eeebe3] px-2 py-0.5 rounded-full text-[#b7c6c2] font-medium mt-1 inline-block">
                          {SERVICE_LABELS[s.serviceType]}
                        </span>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <button onClick={() => setEditingSub({ id: s.id, name: s.name, paymentDate: s.paymentDate, amount: s.amount.toString(), serviceType: s.serviceType })}
                          className="w-9 h-9 rounded-full bg-[#eeebe3] flex items-center justify-center hover:bg-[#b7c6c2]/30 transition-colors">
                          <Pencil size={15} className="text-[#b7c6c2]" />
                        </button>
                        <button onClick={() => deleteSub(s.id)} className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center hover:bg-red-100 transition-colors">
                          <Trash2 size={15} className="text-[#ca0013]" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ─── MODALS ─── */}

      {/* Add Widget Modal */}
      {showAddWidget && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowAddWidget(false)}>
          <div className="bg-white rounded-t-[2.5rem] w-full max-w-lg p-6 pb-32 animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-[#171e19]">Add Widget</h3>
              <button onClick={() => setShowAddWidget(false)} className="w-10 h-10 rounded-full bg-[#eeebe3] flex items-center justify-center">
                <X size={18} className="text-[#b7c6c2]" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#b7c6c2] block mb-2">Type</label>
                <div className="flex gap-2">
                  {[
                    { key: 'stat', label: '📊 Stat' },
                    { key: 'goal', label: '🎯 Goal' },
                  ].map(wt => (
                    <button key={wt.key} onClick={() => setNewWidgetType(wt.key as any)}
                      className={`px-4 py-2 rounded-full text-sm font-medium ${newWidgetType === wt.key ? 'bg-[#171e19] text-white' : 'bg-[#eeebe3] text-[#b7c6c2]'}`}>
                      {wt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#b7c6c2] block mb-1">Title</label>
                <input value={newWidgetTitle} onChange={e => setNewWidgetTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-[#b7c6c2]/30 text-[#171e19] bg-white outline-none focus:border-[#ca0013] text-base font-medium"
                  placeholder="e.g. Monthly Goal" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#b7c6c2] block mb-1">Value</label>
                <input value={newWidgetValue} onChange={e => setNewWidgetValue(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-[#b7c6c2]/30 text-[#171e19] bg-white outline-none focus:border-[#ca0013] text-base font-medium"
                  placeholder="e.g. $500" />
              </div>
              <button onClick={handleAddWidget} disabled={!newWidgetTitle.trim()}
                className="w-full py-4 rounded-2xl bg-[#ca0013] text-white font-bold text-base disabled:opacity-40 active:scale-[0.98] transition-all">
                Add Widget
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      {showAddExpense && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowAddExpense(false)}>
          <div className="bg-white rounded-t-[2.5rem] w-full max-w-lg p-6 pb-32 animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-[#171e19]">New Expense</h3>
              <button onClick={() => setShowAddExpense(false)} className="w-10 h-10 rounded-full bg-[#eeebe3] flex items-center justify-center">
                <X size={18} className="text-[#b7c6c2]" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#b7c6c2] block mb-1">Title</label>
                <input value={newExpTitle} onChange={e => setNewExpTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-[#b7c6c2]/30 text-[#171e19] bg-white outline-none focus:border-[#ca0013] text-base font-medium" placeholder="e.g. Lunch" />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#b7c6c2] block mb-1">Amount</label>
                  <input type="number" value={newExpAmount} onChange={e => setNewExpAmount(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-[#b7c6c2]/30 text-[#171e19] bg-white outline-none focus:border-[#ca0013] text-base font-medium" step="0.01" min="0.01" />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#b7c6c2] block mb-1">Date</label>
                  <input type="date" value={newExpDate} onChange={e => setNewExpDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-[#b7c6c2]/30 text-[#171e19] bg-white outline-none focus:border-[#ca0013] text-base font-medium" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#b7c6c2] block mb-2">Category</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(c => (
                    <button key={c} onClick={() => setNewExpCategory(c)}
                      className={`px-4 py-2 rounded-full text-sm font-medium ${newExpCategory === c ? 'bg-[#171e19] text-white' : 'bg-[#eeebe3] text-[#b7c6c2]'}`}>
                      {CATEGORY_LABELS[c]}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={handleAddExpense} disabled={!newExpTitle.trim() || !newExpAmount}
                className="w-full py-4 rounded-2xl bg-[#ca0013] text-white font-bold text-base disabled:opacity-40 active:scale-[0.98] transition-all">
                Add Expense
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Subscription Modal */}
      {showAddSub && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowAddSub(false)}>
          <div className="bg-white rounded-t-[2.5rem] w-full max-w-lg p-6 pb-32 animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-[#171e19]">New Subscription</h3>
              <button onClick={() => setShowAddSub(false)} className="w-10 h-10 rounded-full bg-[#eeebe3] flex items-center justify-center">
                <X size={18} className="text-[#b7c6c2]" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#b7c6c2] block mb-1">Name</label>
                <input value={newSubName} onChange={e => setNewSubName(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-[#b7c6c2]/30 text-[#171e19] bg-white outline-none focus:border-[#ca0013] text-base font-medium" placeholder="e.g. Spotify" />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#b7c6c2] block mb-1">Amount</label>
                  <input type="number" value={newSubAmount} onChange={e => setNewSubAmount(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-[#b7c6c2]/30 text-[#171e19] bg-white outline-none focus:border-[#ca0013] text-base font-medium" step="0.01" min="0.01" />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#b7c6c2] block mb-1">Payment Date</label>
                  <input type="date" value={newSubDate} onChange={e => setNewSubDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-[#b7c6c2]/30 text-[#171e19] bg-white outline-none focus:border-[#ca0013] text-base font-medium" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#b7c6c2] block mb-2">Type</label>
                <div className="flex flex-wrap gap-2">
                  {SERVICE_TYPES.map(st => (
                    <button key={st} onClick={() => setNewSubType(st)}
                      className={`px-4 py-2 rounded-full text-sm font-medium ${newSubType === st ? 'bg-[#171e19] text-white' : 'bg-[#eeebe3] text-[#b7c6c2]'}`}>
                      {SERVICE_LABELS[st]}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={handleAddSub} disabled={!newSubName.trim() || !newSubAmount}
                className="w-full py-4 rounded-2xl bg-[#ca0013] text-white font-bold text-base disabled:opacity-40 active:scale-[0.98] transition-all">
                Add Subscription
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
