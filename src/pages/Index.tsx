import { useNavigate } from "react-router-dom";

export default function Index() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">Help-Me System</h1>
          <p className="mt-1 text-sm text-gray-500">
            Iniciando a migração para o sistema Help-Me baseado no repositório diego64/help-me.
          </p>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-600 mb-4">
            Este projeto está sendo resetado para utilizar a estrutura de chamados, técnicos e SLA do novo repositório.
          </p>
          <div className="flex gap-2">
            <button 
              onClick={() => navigate("/login")}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
            >
              Entrar no Sistema
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}