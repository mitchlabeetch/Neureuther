import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import { useApp } from '@/lib/store';

interface SplitExpense {
  id: string;
  title: string;
  amount: number;
  paidBy: string;
  date: string;
  splitUserIds: string[];
}

interface Balance {
  userId: string;
  balance: number;
}

interface EditingExpense {
  id: string;
  title: string;
  amount: string;
  paidBy: string;
  date: string;
  splitUserIds: string[];
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

function calculateBalances(expenses: SplitExpense[], userIds: string[]): Balance[] {
  const balances: Record<string, number> = {};
  for (const uid of userIds) balances[uid] = 0;

  for (const exp of expenses) {
    const perPerson = exp.amount / exp.splitUserIds.length;
    // The person who paid gets credited back their share
    balances[exp.paidBy] += exp.amount - perPerson;
    // Everyone who owes (including payer for their own share)
    for (const uid of exp.splitUserIds) {
      if (uid !== exp.paidBy) {
        balances[uid] -= perPerson;
      }
    }
  }

  return userIds.map((userId) => ({ userId, balance: Math.round(balances[userId] * 100) / 100 }));
}

function formatCurrency(amount: number): string {
  return amount < 0 
    ? `-$${Math.abs(amount).toFixed(2)}` 
    : `$${amount.toFixed(2)}`;
}

export function TogetherView({ onBack }: { onBack: () => void }) {
  const { state, getUserById } = useApp();
  const [expenses, setExpenses] = useState<SplitExpense[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newPaidBy, setNewPaidBy] = useState(state.users[0]?.id || '');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newSplitIds, setNewSplitIds] = useState<string[]>([]);

  const [editing, setEditing] = useState<EditingExpense | null>(null);

  const fetchExpenses = useCallback(async () => {
    try {
      const data = await api<SplitExpense[]>('/api/money/shared-expenses');
      setExpenses(data);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  const balances = calculateBalances(expenses, state.users.map(u => u.id));

  const handleAdd = async () => {
    if (!newTitle.trim() || !newAmount || !newPaidBy || newSplitIds.length === 0) return;
    await api('/api/money/shared-expenses', {
      method: 'POST',
      body: JSON.stringify({
        title: newTitle.trim(),
        amount: parseFloat(newAmount),
        paidBy: newPaidBy,
        date: newDate,
        splitUserIds: newSplitIds,
      }),
    });
    setNewTitle('');
    setNewAmount('');
    setNewDate(new Date().toISOString().split('T')[0]);
    setNewSplitIds([]);
    setShowAdd(false);
    fetchExpenses();
  };

  const handleDelete = async (id: string) => {
    await api(`/api/money/shared-expenses/${id}`, { method: 'DELETE' });
    fetchExpenses();
  };

  const startEdit = (exp: SplitExpense) => {
    setEditing({
      id: exp.id,
      title: exp.title,
      amount: exp.amount.toString(),
      paidBy: exp.paidBy,
      date: exp.date,
      splitUserIds: [...exp.splitUserIds],
    });
  };

  const saveEdit = async () => {
    if (!editing) return;
    await api(`/api/money/shared-expenses/${editing.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        title: editing.title,
        amount: parseFloat(editing.amount),
        paidBy: editing.paidBy,
        date: editing.date,
        splitUserIds: editing.splitUserIds,
      }),
    });
    setEditing(null);
    fetchExpenses();
  };

  const toggleSplitUser = (userId: string, isNew: boolean) => {
    if (isNew) {
      setNewSplitIds(prev =>
        prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
      );
    } else if (editing) {
      setEditing(prev => prev ? {
        ...prev,
        splitUserIds: prev.splitUserIds.includes(userId)
          ? prev.splitUserIds.filter(id => id !== userId)
          : [...prev.splitUserIds, userId],
      } : null);
    }
  };

  if (loading) {
    return (
      <div className="px-5 pt-14 pb-4">
        <button onClick={onBack} className="flex items-center gap-1 text-[#b7c6c2] text-sm font-medium mb-3">
          <ArrowLeft size={18} /> Back
        </button>
        <p className="text-[#b7c6c2] text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <div className="px-5 pt-14 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 animate-fade-in-up">
        <button onClick={onBack} className="flex items-center gap-1 text-[#b7c6c2] text-sm font-medium hover:text-[#171e19] transition-colors">
          <ArrowLeft size={18} /> Back
        </button>
        <button
          onClick={() => setShowAdd(true)}
          className="w-10 h-10 rounded-full bg-[#ca0013] text-white flex items-center justify-center shadow-[0_8px_24px_-4px_rgba(202,0,19,0.3)] active:scale-95 transition-transform"
        >
          <Plus size={20} />
        </button>
      </div>

      <h2 className="text-2xl font-semibold text-[#171e19] tracking-tight mb-4 animate-fade-in-up">Together</h2>

      {/* Balance Card */}
      <div className="bg-white rounded-[2.5rem] p-6 border border-[#b7c6c2]/20 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)] mb-5 animate-fade-in-up">
        <p className="text-xs font-extrabold text-[#b7c6c2] uppercase tracking-[0.1em] mb-4">Balance</p>
        <div className="flex flex-col gap-3">
          {balances.map(b => {
            const user = getUserById(b.userId);
            if (!user) return null;
            return (
              <div key={b.userId} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg" style={{ backgroundColor: user.color + '30' }}>
                    {user.emoji}
                  </div>
                  <span className="text-[#171e19] font-semibold">{user.name}</span>
                </div>
                <span className={`font-bold text-lg ${b.balance >= 0 ? 'text-green-600' : 'text-[#ca0013]'}`}>
                  {formatCurrency(b.balance)}
                </span>
              </div>
            );
          })}
        </div>
        {/* Settlement summary */}
        {balances.map(b => {
          if (b.balance >= 0) return null;
          const creditors = balances.filter(c => c.balance > 0 && c.userId !== b.userId).sort((a, b) => b.balance - a.balance);
          let remaining = Math.abs(b.balance);
          const settlements: { toUserId: string; amount: number }[] = [];
          for (const c of creditors) {
            if (remaining <= 0.01) break;
            const pay = Math.min(remaining, c.balance);
            settlements.push({ toUserId: c.userId, amount: Math.round(pay * 100) / 100 });
            remaining -= pay;
          }
          if (settlements.length === 0) return null;
          const debtor = getUserById(b.userId);
          return settlements.map(s => {
            const creditor = getUserById(s.toUserId);
            return (
              <p key={`${b.userId}-${s.toUserId}`} className="text-xs text-[#b7c6c2] font-medium mt-2">
                {debtor?.name} owes {creditor?.name} ${s.amount.toFixed(2)}
              </p>
            );
          });
        })}
      </div>

      {/* Expense List */}
      <div className="space-y-3 animate-fade-in-up">
        <p className="text-xs font-extrabold text-[#b7c6c2] uppercase tracking-[0.1em]">Payments</p>
        {expenses.length === 0 && (
          <p className="text-sm text-[#b7c6c2] text-center py-8">No expenses yet. Tap + to add one.</p>
        )}
        {expenses.map(exp => {
          const payer = getUserById(exp.paidBy);
          const isEditing = editing?.id === exp.id;
          return (
            <div key={exp.id} className="bg-white rounded-[1.5rem] p-4 border border-[#b7c6c2]/20 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)]">
              {isEditing ? (
                <div className="space-y-3">
                  <input
                    value={editing!.title}
                    onChange={e => setEditing(prev => prev ? { ...prev, title: e.target.value } : null)}
                    className="w-full px-3 py-2 rounded-xl border border-[#b7c6c2]/30 text-sm font-semibold text-[#171e19] bg-white outline-none focus:border-[#ca0013]"
                    placeholder="Title"
                  />
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={editing!.amount}
                      onChange={e => setEditing(prev => prev ? { ...prev, amount: e.target.value } : null)}
                      className="flex-1 px-3 py-2 rounded-xl border border-[#b7c6c2]/30 text-sm text-[#171e19] bg-white outline-none focus:border-[#ca0013]"
                      placeholder="Amount"
                    />
                    <input
                      type="date"
                      value={editing!.date}
                      onChange={e => setEditing(prev => prev ? { ...prev, date: e.target.value } : null)}
                      className="flex-1 px-3 py-2 rounded-xl border border-[#b7c6c2]/30 text-sm text-[#171e19] bg-white outline-none focus:border-[#ca0013]"
                    />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#b7c6c2] mb-1.5">Paid by</p>
                    <div className="flex flex-wrap gap-2">
                      {state.users.map(u => (
                        <button
                          key={u.id}
                          onClick={() => setEditing(prev => prev ? { ...prev, paidBy: u.id } : null)}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                            editing!.paidBy === u.id
                              ? 'bg-[#171e19] text-white'
                              : 'bg-[#eeebe3] text-[#b7c6c2]'
                          }`}
                        >
                          {u.emoji} {u.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#b7c6c2] mb-1.5">Paid for</p>
                    <div className="flex flex-wrap gap-2">
                      {state.users.map(u => (
                        <button
                          key={u.id}
                          onClick={() => toggleSplitUser(u.id, false)}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                            editing!.splitUserIds.includes(u.id)
                              ? 'bg-[#ca0013] text-white'
                              : 'bg-[#eeebe3] text-[#b7c6c2]'
                          }`}
                        >
                          {u.emoji} {u.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={saveEdit}
                      className="flex-1 py-2 rounded-full bg-[#ca0013] text-white text-sm font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
                    >
                      <Check size={16} /> Save
                    </button>
                    <button
                      onClick={() => setEditing(null)}
                      className="py-2 px-4 rounded-full bg-[#eeebe3] text-[#b7c6c2] text-sm font-semibold active:scale-95 transition-transform"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                    <span className="text-lg font-bold text-[#ca0013]">{exp.title.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[#171e19] font-semibold text-base truncate">{exp.title}</h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-sm text-[#b7c6c2]">{exp.date}</span>
                      <span className="text-sm font-bold text-[#171e19]">${exp.amount.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-xs text-[#b7c6c2]">
                        Paid by: <span className="font-semibold text-[#171e19]">{payer?.emoji} {payer?.name}</span>
                      </span>
                      <span className="text-xs text-[#b7c6c2]">·</span>
                      <span className="text-xs text-[#b7c6c2]">
                        For: {exp.splitUserIds.map(uid => {
                          const u = getUserById(uid);
                          return u?.name;
                        }).join(', ')}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => startEdit(exp)}
                      className="w-9 h-9 rounded-full bg-[#eeebe3] flex items-center justify-center hover:bg-[#b7c6c2]/30 transition-colors"
                    >
                      <Pencil size={15} className="text-[#b7c6c2]" />
                    </button>
                    <button
                      onClick={() => handleDelete(exp.id)}
                      className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center hover:bg-red-100 transition-colors"
                    >
                      <Trash2 size={15} className="text-[#ca0013]" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Expense Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowAdd(false)}>
          <div
            className="bg-white rounded-t-[2.5rem] w-full max-w-lg p-6 pb-8 animate-slide-up max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-[#171e19]">New Expense</h3>
              <button onClick={() => setShowAdd(false)} className="w-10 h-10 rounded-full bg-[#eeebe3] flex items-center justify-center">
                <X size={18} className="text-[#b7c6c2]" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#b7c6c2] block mb-1">Title</label>
                <input
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-[#b7c6c2]/30 text-[#171e19] bg-white outline-none focus:border-[#ca0013] text-base font-medium"
                  placeholder="e.g. Groceries"
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#b7c6c2] block mb-1">Amount ($)</label>
                  <input
                    type="number"
                    value={newAmount}
                    onChange={e => setNewAmount(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-[#b7c6c2]/30 text-[#171e19] bg-white outline-none focus:border-[#ca0013] text-base font-medium"
                    placeholder="0.00"
                    step="0.01"
                    min="0.01"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#b7c6c2] block mb-1">Date</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={e => setNewDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-[#b7c6c2]/30 text-[#171e19] bg-white outline-none focus:border-[#ca0013] text-base font-medium"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#b7c6c2] block mb-2">Paid by</label>
                <div className="flex flex-wrap gap-2">
                  {state.users.map(u => (
                    <button
                      key={u.id}
                      onClick={() => setNewPaidBy(u.id)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        newPaidBy === u.id
                          ? 'bg-[#171e19] text-white'
                          : 'bg-[#eeebe3] text-[#b7c6c2]'
                      }`}
                    >
                      {u.emoji} {u.name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#b7c6c2] block mb-2">Paid for (select multiple)</label>
                <div className="flex flex-wrap gap-2">
                  {state.users.map(u => (
                    <button
                      key={u.id}
                      onClick={() => toggleSplitUser(u.id, true)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        newSplitIds.includes(u.id)
                          ? 'bg-[#ca0013] text-white'
                          : 'bg-[#eeebe3] text-[#b7c6c2]'
                      }`}
                    >
                      {u.emoji} {u.name}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={handleAdd}
                disabled={!newTitle.trim() || !newAmount || !newPaidBy || newSplitIds.length === 0}
                className="w-full py-4 rounded-2xl bg-[#ca0013] text-white font-bold text-base disabled:opacity-40 active:scale-[0.98] transition-all mt-2"
              >
                Add Expense
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
