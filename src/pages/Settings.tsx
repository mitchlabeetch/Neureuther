import { useState } from 'react';
import { useApp, User } from '@/lib/store';
import { BottomNav } from '@/components/BottomNav';
import { Plus, Pencil, Trash2, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

const USER_COLORS = [
  '#FDA172', '#FF6B6B', '#A78BFA', '#69D2A6', '#FBBF24',
  '#FB7185', '#38BDF8', '#F472B6', '#818CF8', '#34D399'
];
const EMOJIS = [
  '🦊', '🐸', '🦄', '🐱', '🐶', '🐼', '🐨', '🦁', '🐰', '🐙',
  '🦉', '🦋', '🐝', '🐳', '🦭', '🐧', '🐯', '🐮', '🐷', '🐵'
];

function SettingsPage() {
  const { state, addUser, updateUser, removeUser } = useApp();
  const [showDialog, setShowDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#FDA172');
  const [newEmoji, setNewEmoji] = useState('🦊');

  const openEdit = (user: User) => {
    setEditingUser(user.id);
    setNewName(user.name);
    setNewColor(user.color);
    setNewEmoji(user.emoji);
    setShowDialog(true);
  };

  const openNew = () => {
    setEditingUser(null);
    setNewName('');
    setNewColor(USER_COLORS[state.users.length % USER_COLORS.length]);
    setNewEmoji(EMOJIS[state.users.length % EMOJIS.length]);
    setShowDialog(true);
  };

  const handleSave = () => {
    if (!newName.trim()) return;
    if (editingUser) {
      updateUser(editingUser, { name: newName.trim(), color: newColor, emoji: newEmoji });
    } else {
      addUser({ name: newName.trim(), color: newColor, emoji: newEmoji });
    }
    setShowDialog(false);
  };

  return (
    <div className="app-container min-h-screen bg-[#fdf7f2] page-content">
      <div className="px-5 pt-14 pb-4 animate-fade-in-up">
        <h1 className="text-3xl font-semibold text-[#171e19] tracking-tight">Settings</h1>
        <p className="text-sm text-[#95a5a0] font-medium mt-1">Manage your household</p>
      </div>

      <div className="px-5 mb-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="section-header flex items-center gap-2">
            <Users size={14} /> People ({state.users.length})
          </h3>
          <button
            onClick={openNew}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium text-cantaloupe bg-[#FFF1E6] hover:bg-cantaloupe hover:text-white transition-all active:scale-90"
          >
            <Plus size={14} /> Add Person
          </button>
        </div>
        <div className="space-y-2.5">
          {state.users.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-3 bg-white rounded-[1.5rem] p-4 border border-[#b7c6c2]/20 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] transition-all duration-300 hover:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 active:scale-[0.99]"
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-2xl shadow-sm transition-transform hover:scale-110"
                style={{ backgroundColor: user.color + '30' }}
              >
                {user.emoji}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-[#171e19]">{user.name}</div>
                <div
                  className="w-4 h-4 rounded-full mt-1 ring-2 ring-white"
                  style={{ backgroundColor: user.color }}
                />
              </div>
              <button
                onClick={() => openEdit(user)}
                aria-label={`Edit ${user.name}`}
                className="p-2.5 rounded-full bg-[#eeebe3] text-[#95a5a0] hover:text-cantaloupe hover:bg-[#FFF1E6] transition-all active:scale-90"
              >
                <Pencil size={16} />
              </button>
              <button
                onClick={() => removeUser(user.id)}
                aria-label={`Remove ${user.name}`}
                className="p-2.5 rounded-full bg-[#eeebe3] text-[#95a5a0] hover:text-[#ca0013] hover:bg-red-50 transition-all active:scale-90"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="px-5 mb-4">
        <div className="bg-white rounded-[1.5rem] p-5 border border-[#b7c6c2]/20 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)]">
          <h3 className="text-sm font-semibold text-[#171e19] mb-2">About Neureuther</h3>
          <p className="text-sm text-[#95a5a0] font-medium leading-relaxed">
            Your fun household companion! Manage chores, spin the wheel, earn points, and keep your home running smoothly.
          </p>
          <div className="flex items-center gap-2 mt-3 text-xs text-[#95a5a0] font-medium">
            <span className="px-2.5 py-1 bg-[#FFF1E6] rounded-full text-cantaloupe">v1.0</span>
            <span>Built with ❤️</span>
          </div>
        </div>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="rounded-[2rem] max-w-[380px] mx-auto p-0 gap-0 border-[#b7c6c2]/20">
          <DialogHeader className="px-6 pt-6 pb-3">
            <DialogTitle className="text-xl font-semibold text-[#171e19]">
              {editingUser ? 'Edit Person' : 'Add Person'}
            </DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-6 space-y-4">
            <div>
              <label className="section-header block mb-2">Name</label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Alex"
                className="mt-1.5 rounded-xl bg-[#eeebe3] border-[#b7c6c2]/20 focus:border-cantaloupe focus:ring-cantaloupe"
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              />
            </div>
            <div>
              <label className="section-header block mb-2">Emoji</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => setNewEmoji(emoji)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all active:scale-90 ${
                      newEmoji === emoji
                        ? 'bg-[#FFF1E6] ring-2 ring-cantaloupe scale-110'
                        : 'bg-[#eeebe3] hover:bg-[#b7c6c2]/20'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="section-header block mb-2">Color</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {USER_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setNewColor(color)}
                    className={`w-9 h-9 rounded-full transition-all active:scale-90 ${
                      newColor === color
                        ? 'ring-2 ring-offset-2 ring-[#171e19] scale-110'
                        : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <button
              onClick={handleSave}
              disabled={!newName.trim()}
              className="w-full py-3 rounded-xl font-semibold text-white bg-[#171e19] hover:bg-[#2a302b] disabled:bg-[#eeebe3] disabled:text-[#95a5a0] transition-all active:scale-[0.98]"
            >
              {editingUser ? 'Save Changes' : 'Add Person'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}

export default SettingsPage;
