import React from 'react';

const TabBtn = ({ active, onClick, label, count }) => (
  <button
    type="button"
    onClick={onClick}
    className={[
      "flex-1 py-2 rounded-xl text-sm font-bold transition",
      active ? "bg-blue-600 text-white shadow" : "bg-white text-gray-600 border",
    ].join(' ')}
  >
    <div className="flex items-center justify-center gap-2">
      <span>{label}</span>
      <span className={active ? "bg-blue-800/50 px-2 rounded-full text-xs" : "bg-gray-100 px-2 rounded-full text-xs"}>
        {count}
      </span>
    </div>
  </button>
);

export const TabNavigatorV5 = ({ activeTab, onChange, counts }) => {
  return (
    <div className="p-3">
      <div className="bg-gray-50 border rounded-2xl p-2 flex gap-2">
        <TabBtn active={activeTab === 'vendas'} onClick={() => onChange('vendas')} label="Vendas" count={counts?.vendas ?? 0} />
        <TabBtn active={activeTab === 'pendencias'} onClick={() => onChange('pendencias')} label="Pendências" count={counts?.pendencias ?? 0} />
        <TabBtn active={activeTab === 'entregas'} onClick={() => onChange('entregas')} label="Entregas" count={counts?.entregas ?? 0} />
      </div>
    </div>
  );
};