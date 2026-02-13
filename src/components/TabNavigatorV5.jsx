import React from 'react';

const TabButton = ({ active, label, count, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={[
      "flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold transition",
      active
        ? "bg-blue-600 text-white shadow-md shadow-blue-600/25 border-2 border-blue-600"
        : "bg-white text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-50"
    ].join(" ")}
  >
    <span>{label}</span>
    <span className={active ? "bg-white/20 px-2 py-0.5 rounded-full text-xs" : "bg-slate-100 px-2 py-0.5 rounded-full text-xs"}>
      {count ?? 0}
    </span>
  </button>
);

export const TabNavigatorV5 = ({ activeTab, onChange, counts }) => {
  return (
    <div className="px-4 lg:px-0">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-2">
        <div className="flex gap-2">
          <TabButton
            label="Vendas"
            count={counts?.vendas}
            active={activeTab === 'vendas'}
            onClick={() => onChange('vendas')}
          />
          <TabButton
            label="Pendências"
            count={counts?.pendencias}
            active={activeTab === 'pendencias'}
            onClick={() => onChange('pendencias')}
          />
          <TabButton
            label="Entregas"
            count={counts?.entregas}
            active={activeTab === 'entregas'}
            onClick={() => onChange('entregas')}
          />
        </div>
      </div>
    </div>
  );
};
