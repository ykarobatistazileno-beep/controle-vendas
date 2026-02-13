import React from 'react';
import { AlertCircle, CheckCircle2, Clock, MoreHorizontal } from 'lucide-react';

const formatBRL = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const motivoLabel = (m) => {
  switch (m) {
    case 'aguardando_cartao': return '💳 Cartão';
    case 'pagamento_cliente': return '👤 Cliente';
    case 'parcelado': return '📅 Parcelado';
    case 'aprovacao': return '✅ Aprovação';
    case 'outro': return '🔹 Outro';
    default: return '⏳ Pendência';
  }
};

export const PendenciasTabV5 = ({ vendas, onReceberRestante, onEdit, onCancel, onDelete }) => {
  const totalPendencias = vendas?.reduce((acc, v) => acc + (Number(v.restante) || 0), 0) || 0;

  return (
    <div className="p-4 pb-32 space-y-4">
      {/* Resumo de Pendências */}
      <div className="bg-orange-600 rounded-[2rem] p-6 text-white shadow-lg shadow-orange-100 flex justify-between items-center">
        <div>
          <p className="text-orange-100 text-xs font-black uppercase tracking-widest">Total em Aberto</p>
          <h3 className="text-3xl font-black">{formatBRL(totalPendencias)}</h3>
        </div>
        <div className="bg-white/20 p-3 rounded-2xl">
          <AlertCircle size={32} />
        </div>
      </div>

      {(!vendas || vendas.length === 0) && (
        <div className="bg-white border-2 border-dashed border-gray-100 rounded-3xl p-12 text-center">
          <div className="text-green-200 mb-2 flex justify-center"><CheckCircle2 size={48} /></div>
          <p className="text-gray-400 font-bold">Tudo em dia! Nenhuma pendência.</p>
        </div>
      )}

      {vendas?.map((v) => {
        const pct = (Number.isFinite(v.valor) && v.valor > 0 && Number.isFinite(v.valorEntrada)) 
          ? Math.min(100, Math.max(0, (v.valorEntrada / v.valor) * 100)) 
          : 0;
        
        const isAtrasado = v.previsaoPagamento && new Date(v.previsaoPagamento + 'T00:00:00') < new Date().setHours(0,0,0,0);

        return (
          <div key={v.id} className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-start gap-3">
              <div className="min-w-0">
                <div className="font-black text-gray-900 text-lg truncate">{v.cliente}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${v.valorEntrada > 0 ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                    {v.valorEntrada > 0 ? 'Parcial' : 'Pendente'}
                  </span>
                  <span className="text-xs text-gray-400 font-bold">{v.data}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Faltando</div>
                <div className="font-black text-orange-600 text-xl">{formatBRL(v.restante)}</div>
              </div>
            </div>

            <div className="mt-4 bg-gray-50 rounded-2xl p-4 border border-gray-100">
              <div className="flex justify-between text-xs font-bold text-gray-500 mb-2">
                <span>Pago: {formatBRL(v.valorEntrada)}</span>
                <span>Total: {formatBRL(v.valor)}</span>
              </div>
              <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden">
                <div className="bg-green-500 h-full transition-all duration-500" style={{ width: `${pct}%` }} />
              </div>
              
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
                  <Clock size={14} className="text-orange-500" />
                  <span>{motivoLabel(v.motivoPendencia)}</span>
                  {v.previsaoPagamento && (
                    <span className={`ml-auto px-2 py-0.5 rounded-md ${isAtrasado ? 'bg-red-100 text-red-600' : 'bg-gray-200 text-gray-600'}`}>
                      {isAtrasado ? 'Atrasado: ' : 'Previsto: '}
                      {new Date(v.previsaoPagamento + 'T00:00:00').toLocaleDateString('pt-BR')}
                    </span>
                  )}
                </div>
                {v.pendingObservation && (
                  <div className="bg-white border border-gray-100 p-2 rounded-xl text-xs text-gray-600 italic font-medium">
                    "{v.pendingObservation}"
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button 
                onClick={() => onReceberRestante?.(v)} 
                className="flex-[2] bg-green-600 hover:bg-green-700 text-white py-3 rounded-2xl font-black text-sm shadow-lg shadow-green-100 transition-all active:scale-95"
              >
                Receber Agora
              </button>
              <button 
                onClick={() => onEdit?.(v)} 
                className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-600 py-3 rounded-2xl font-black text-sm border border-gray-100 transition-all"
              >
                Editar
              </button>
              <button 
                onClick={() => onCancel?.(v)} 
                className="p-3 bg-orange-50 text-orange-600 rounded-2xl border border-orange-100 hover:bg-orange-100 transition-all"
              >
                <Clock size={20} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
