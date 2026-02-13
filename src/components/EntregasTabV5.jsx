import React from 'react';
import { Calendar, Clock, Truck, AlertTriangle, CheckCircle2 } from 'lucide-react';

const formatBRL = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const getPredictedDate = (saleDate, days) => {
  if (!saleDate || !days) return null;
  const date = new Date(saleDate + 'T00:00:00');
  date.setDate(date.getDate() + Number(days));
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const daysDiff = (iso) => {
  if (!iso) return 0;
  const d = new Date(iso + 'T00:00:00').getTime();
  const today = new Date(); today.setHours(0,0,0,0);
  const diff = Math.round((d - today.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
};

export const EntregasTabV5 = ({ vendas, onMarcarEntregue, onEdit, onCancel, onDelete }) => {
  return (
    <div className="p-4 pb-32 space-y-4">
      {(!vendas || vendas.length === 0) && (
        <div className="bg-white border-2 border-dashed border-gray-100 rounded-3xl p-12 text-center">
          <div className="text-blue-200 mb-2 flex justify-center"><Truck size={48} /></div>
          <p className="text-gray-400 font-bold">Nenhuma entrega futura pendente.</p>
        </div>
      )}

      {vendas?.map((v) => {
        const isFutura = v.tipoEntrega === 'Futura';
        const predictedDate = isFutura ? getPredictedDate(v.data, v.deliveryDeadlineDays) : v.dataEntrega;
        const diff = predictedDate ? daysDiff(predictedDate) : null;
        const isAtrasada = diff !== null && diff < 0;

        return (
          <div key={v.id} className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-start gap-3">
              <div className="min-w-0">
                <div className="font-black text-gray-900 text-lg truncate">{v.cliente}</div>
                <div className="text-xs text-gray-500 font-bold mt-1">{v.produtos || 'Sem descrição'}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Venda</div>
                <div className="font-black text-gray-900">{new Date(v.data + 'T00:00:00').toLocaleDateString('pt-BR')}</div>
              </div>
            </div>

            <div className={`mt-4 rounded-2xl p-4 border ${isAtrasada ? 'bg-red-50 border-red-100' : 'bg-blue-50 border-blue-100'}`}>
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  {isAtrasada ? <AlertTriangle className="text-red-500" size={18} /> : <Clock className="text-blue-500" size={18} />}
                  <span className={`text-xs font-black uppercase tracking-wider ${isAtrasada ? 'text-red-700' : 'text-blue-700'}`}>
                    {isFutura ? `Prazo: ${v.deliveryDeadlineDays} dias` : 'Agendada'}
                  </span>
                </div>
                {isAtrasada && (
                  <span className="bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded-md uppercase animate-pulse">
                    Atrasada
                  </span>
                )}
              </div>

              <div className="flex justify-between items-end">
                <div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase">Previsão</div>
                  <div className={`text-lg font-black ${isAtrasada ? 'text-red-600' : 'text-blue-900'}`}>
                    {predictedDate ? new Date(predictedDate + 'T00:00:00').toLocaleDateString('pt-BR') : 'A definir'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold text-gray-400 uppercase">Faltam</div>
                  <div className={`text-lg font-black ${isAtrasada ? 'text-red-600' : 'text-blue-900'}`}>
                    {diff !== null ? (isAtrasada ? `${Math.abs(diff)}d` : `${diff}d`) : '--'}
                  </div>
                </div>
              </div>

              {(v.deliveryReason || v.motivoEntrega) && (
                <div className="mt-3 pt-3 border-t border-blue-200/30 text-xs font-medium text-blue-800 italic">
                  "{v.deliveryReason || v.motivoEntrega}"
                </div>
              )}
            </div>

            <div className="mt-4 flex gap-2">
              <button 
                onClick={() => onMarcarEntregue?.(v)} 
                className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-2xl font-black text-sm shadow-lg shadow-blue-100 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={18} /> Concluir Entrega
              </button>
              <button 
                onClick={() => onEdit?.(v)} 
                className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-600 py-3 rounded-2xl font-black text-sm border border-gray-100 transition-all"
              >
                Editar
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
