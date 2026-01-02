import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { GraduationCap, User, CheckCircle, ArrowRight } from 'lucide-react';

const RoleSelectionModal = ({ onComplete }: { onComplete: () => void }) => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [role, setRole] = useState<'student' | 'external' | null>(null);
  const [mssv, setMssv] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!role) return;
    if (role === 'student' && !mssv.trim()) {
      addToast('Vui lòng nhập MSSV', 'warning');
      return;
    }

    setLoading(true);
    try {
      const updates = {
        role: role,
        student_id: role === 'student' ? mssv : null,
        is_verified: false, // Mặc định chưa xác thực
      };

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user?.id);

      if (error) throw error;

      addToast('Cập nhật thông tin thành công!', 'success');
      onComplete(); // Tắt modal
    } catch (error: any) {
      addToast('Lỗi: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-blue-500 p-6 text-center">
          <h2 className="text-2xl font-black text-white">Chào mừng bạn mới! 👋</h2>
          <p className="text-blue-100 text-sm mt-2">Để phục vụ bạn tốt hơn, hãy cho chúng tôi biết:</p>
        </div>

        <div className="p-8">
          <h3 className="text-lg font-bold text-gray-800 mb-4 text-center">Bạn là ai?</h3>

          {/* Lựa chọn Role */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <button
              onClick={() => setRole('student')}
              className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-3 relative ${
                role === 'student' 
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-600' 
                  : 'border-gray-200 hover:border-indigo-200 hover:bg-gray-50 text-gray-500'
              }`}
            >
              {role === 'student' && <div className="absolute top-2 right-2 text-indigo-600"><CheckCircle size={20} fill="currentColor" className="text-white"/></div>}
              <div className={`p-3 rounded-full ${role === 'student' ? 'bg-white shadow-sm' : 'bg-gray-100'}`}>
                <GraduationCap size={32} />
              </div>
              <span className="font-bold">Sinh viên</span>
            </button>

            <button
              onClick={() => setRole('external')}
              className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-3 relative ${
                role === 'external' 
                  ? 'border-orange-500 bg-orange-50 text-orange-600' 
                  : 'border-gray-200 hover:border-orange-200 hover:bg-gray-50 text-gray-500'
              }`}
            >
              {role === 'external' && <div className="absolute top-2 right-2 text-orange-600"><CheckCircle size={20} fill="currentColor" className="text-white"/></div>}
              <div className={`p-3 rounded-full ${role === 'external' ? 'bg-white shadow-sm' : 'bg-gray-100'}`}>
                <User size={32} />
              </div>
              <span className="font-bold">Người dùng ngoài</span>
            </button>
          </div>

          {/* Form nhập MSSV (Chỉ hiện khi chọn Sinh viên) */}
          {role === 'student' && (
            <div className="animate-in slide-in-from-top-2 fade-in duration-300">
              <label className="block text-sm font-bold text-gray-700 mb-2">Nhập Mã số sinh viên của bạn</label>
              <input
                type="text"
                value={mssv}
                onChange={(e) => setMssv(e.target.value)}
                placeholder="VD: 201xxxx"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none font-bold text-gray-800 tracking-wide"
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-2">
                * Chúng tôi sẽ dùng MSSV để xác thực huy hiệu "Sinh viên".
              </p>
            </div>
          )}

          {role === 'external' && (
            <div className="bg-orange-50 p-4 rounded-xl text-orange-800 text-sm animate-in slide-in-from-top-2 fade-in duration-300">
              Bạn vẫn có thể mua bán bình thường, nhưng sẽ không có huy hiệu <strong>"Đã xác thực sinh viên"</strong>.
            </div>
          )}

          {/* Nút Submit */}
          <button
            onClick={handleSubmit}
            disabled={!role || (role === 'student' && !mssv) || loading}
            className={`w-full mt-8 py-3.5 rounded-xl font-bold text-white flex items-center justify-center transition-all ${
              !role || (role === 'student' && !mssv)
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200'
            }`}
          >
            {loading ? (
              <span className="animate-pulse">Đang lưu...</span>
            ) : (
              <>Hoàn tất <ArrowRight size={20} className="ml-2" /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoleSelectionModal;