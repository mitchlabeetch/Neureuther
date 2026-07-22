import { useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { PageHeader } from '@/components/PageHeader';
import { ArrowLeft, Wallet, Users, Receipt, User } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '@/lib/store';
import { TogetherView } from '@/components/money/TogetherView';
import { SubscriptionsView } from '@/components/money/SubscriptionsView';
import { PersonalView } from '@/components/money/PersonalView';

type MoneyView = 'menu' | 'together' | 'subscriptions' | 'personal';

function MoneyPage() {
  const navigate = useNavigate();
  const [view, setView] = useState<MoneyView>('menu');
  const { state } = useApp();

  if (view !== 'menu') {
    return (
      <div className="app-container min-h-screen bg-[#fdf7f2] page-content">
        {view === 'together' && <TogetherView onBack={() => setView('menu')} />}
        {view === 'subscriptions' && <SubscriptionsView onBack={() => setView('menu')} />}
        {view === 'personal' && <PersonalView onBack={() => setView('menu')} />}
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="app-container min-h-screen bg-[#fdf7f2] page-content">
      <PageHeader
        title="Money"
        subtitle="Manage payment balance"
        backTo="/"
        backLabel="Home"
        icon={<div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center"><Wallet size={24} className="text-[#ca0013]" /></div>}
      />

      <div className="px-5 flex flex-col gap-4 pb-24 animate-fade-in-up">
        <button
          onClick={() => setView('together')}
          className="group bg-white rounded-[2.5rem] p-6 text-left border border-[#b7c6c2]/20 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)] transition-all duration-300 hover:shadow-[0_24px_60px_-12px_rgba(0,0,0,0.1)] hover:-translate-y-1 active:scale-[0.98] relative overflow-hidden"
        >
          <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-[#b7c6c2]/10" />
          <div className="relative z-10 flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
              <Users size={28} className="text-[#ca0013]" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#171e19] tracking-tight mb-1">Together</h3>
              <p className="text-sm text-[#b7c6c2] font-medium">Manage and balance payments</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => setView('subscriptions')}
          className="group bg-white rounded-[2.5rem] p-6 text-left border border-[#b7c6c2]/20 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)] transition-all duration-300 hover:shadow-[0_24px_60px_-12px_rgba(0,0,0,0.1)] hover:-translate-y-1 active:scale-[0.98] relative overflow-hidden"
        >
          <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-[#b7c6c2]/10" />
          <div className="relative z-10 flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
              <Receipt size={28} className="text-purple-500" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#171e19] tracking-tight mb-1">Subscriptions</h3>
              <p className="text-sm text-[#b7c6c2] font-medium">Register, evaluate and manage subscriptions</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => setView('personal')}
          className="group bg-white rounded-[2.5rem] p-6 text-left border border-[#b7c6c2]/20 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)] transition-all duration-300 hover:shadow-[0_24px_60px_-12px_rgba(0,0,0,0.1)] hover:-translate-y-1 active:scale-[0.98] relative overflow-hidden"
        >
          <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-[#b7c6c2]/10" />
          <div className="relative z-10 flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
              <User size={28} className="text-green-500" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#171e19] tracking-tight mb-1">Personal</h3>
              <p className="text-sm text-[#b7c6c2] font-medium">Notes and registry for my own finances</p>
            </div>
          </div>
        </button>
      </div>

      <BottomNav />
    </div>
  );
}

export default MoneyPage;
