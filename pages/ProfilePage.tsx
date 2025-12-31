import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
// Import useToast để dùng thông báo đẹp
import { useToast } from '../contexts/ToastContext'; 
import { ShieldCheck, LogOut, Package, MessageCircle, Star, User as UserIcon, Camera, Edit3, Save, X, ShoppingBag } from 'lucide-react';
import { Product, User, Review } from '../types';

const ProfilePage: React.FC = () => {
  const { user: currentUser, signOut } = useAuth();
  const { addToast } = useToast(); // Hook lấy hàm thông báo
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const isOwnProfile = !id || (currentUser && id === currentUser.id);
  const targetUserId = isOwnProfile ? currentUser?.id : id;

  // Data States
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [userProducts, setUserProducts] = useState<Product[]>([]);
  const [purchasedProducts, setPurchasedProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [averageRating, setAverageRating] = useState<number>(0);
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'posts' | 'bought' | 'info' | 'reviews'>('posts');
  
  // Edit Profile States
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null);
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Review Form States
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const maskStudentId = (studentId: string) => {
    if (!studentId) return 'Chưa cập nhật';
    if (isOwnProfile) return studentId;
    return studentId.length > 5 ? `${studentId.slice(0, 3)}****${studentId.slice(-2)}` : '*******';
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!targetUserId) return;
      setLoading(true);

      try {
        // 1. Fetch Profile
        const { data: profileData } = await supabase.from('profiles').select('*').eq('id', targetUserId).single();
        if (profileData) {
            setProfileUser({
                id: profileData.id,
                name: profileData.name || 'Người dùng',
                email: profileData.email,
                studentId: profileData.student_id || '',
                avatar: profileData.avatar_url || 'https://via.placeholder.com/150',
                isVerified: profileData.is_verified,
                role: profileData.role as any
            });
            setEditName(profileData.name || '');
        }

        // 2. Fetch Selling Products
        let query = supabase.from('products').select('*').eq('seller_id', targetUserId).order('posted_at', { ascending: false });
        if (!isOwnProfile) query = query.eq('is_sold', false);
        
        const { data: productsData } = await query;
        if (productsData) {
             const mapped = mapProducts(productsData);
             setUserProducts(mapped);
        }

        // 3. Fetch Purchased Products
        if (isOwnProfile) {
            const { data: boughtData } = await supabase
                .from('products')
                .select('*')
                .eq('buyer_id', targetUserId)
                .eq('is_sold', true)
                .order('posted_at', { ascending: false });
            
            if (boughtData) {
                setPurchasedProducts(mapProducts(boughtData));
            }
        }

        // 4. Fetch Reviews
        fetchReviews();

      } catch (error) {
        console.error("Lỗi tải dữ liệu:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, currentUser, targetUserId]);

  const mapProducts = (data: any[]): Product[] => {
      return data.map((item: any) => ({
        id: item.id,
        sellerId: item.seller_id,
        title: item.title,
        description: item.description,
        price: item.price,
        category: item.category,
        condition: item.condition,
        images: item.images || [],
        tradeMethod: item.trade_method,
        postedAt: item.posted_at,
        isLookingToBuy: item.is_looking_to_buy,
        isSold: item.is_sold
     }));
  };

  const fetchReviews = async () => {
      if (!targetUserId) return;
      const { data: reviewsData } = await supabase
        .from('reviews')
        .select(`*, reviewer:reviewer_id(name, avatar_url)`)
        .eq('reviewee_id', targetUserId)
        .order('created_at', { ascending: false });

      if (reviewsData) {
          const mappedReviews: Review[] = reviewsData.map((item: any) => ({
              id: item.id, reviewerId: item.reviewer_id, reviewerName: item.reviewer?.name || 'Ẩn danh',
              reviewerAvatar: item.reviewer?.avatar_url || 'https://via.placeholder.com/150',
              rating: item.rating, comment: item.comment, createdAt: item.created_at
          }));
          setReviews(mappedReviews);
          if (mappedReviews.length > 0) {
              const total = mappedReviews.reduce((sum, r) => sum + r.rating, 0);
              setAverageRating(Number((total / mappedReviews.length).toFixed(1)));
          }
      }
  };

  // --- [CHỈNH SỬA] XỬ LÝ UPDATE PROFILE VỚI TOAST ---
  const handleUpdateProfile = async () => {
      if (!currentUser) return;
      setIsSaving(true);
      try {
          let avatarUrl = profileUser?.avatar;

          if (editAvatarFile) {
              const fileExt = editAvatarFile.name.split('.').pop();
              const fileName = `${currentUser.id}/avatar_${Date.now()}.${fileExt}`;
              const { error: uploadError } = await supabase.storage.from('product-images').upload(fileName, editAvatarFile);
              if (uploadError) throw uploadError;
              
              const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
              avatarUrl = data.publicUrl;
          }

          const { error: updateError } = await supabase
              .from('profiles')
              .update({ name: editName, avatar_url: avatarUrl })
              .eq('id', currentUser.id);

          if (updateError) throw updateError;

          setProfileUser(prev => prev ? ({ ...prev, name: editName, avatar: avatarUrl! }) : null);
          setIsEditing(false);
          
          // THAY ALERT BẰNG TOAST XANH LÁ
          addToast("Cập nhật hồ sơ thành công!", "success");

      } catch (err: any) {
          console.error(err);
          // THAY ALERT BẰNG TOAST ĐỎ
          addToast("Lỗi cập nhật: " + err.message, "error");
      } finally {
          setIsSaving(false);
      }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          setEditAvatarFile(e.target.files[0]);
          setPreviewAvatar(URL.createObjectURL(e.target.files[0]));
      }
  };

  // --- REVIEW, DELETE, MARK SOLD (CŨNG DÙNG TOAST) ---
  const handleCreateReview = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!currentUser || !targetUserId) return;
      setSubmittingReview(true);
      const { error } = await supabase.from('reviews').insert({ reviewer_id: currentUser.id, reviewee_id: targetUserId, rating: newRating, comment: newComment });
      
      if (!error) { 
          setNewComment(''); setNewRating(5); fetchReviews(); 
          addToast("Đã gửi đánh giá của bạn!", "success");
      } else {
          addToast(error.message, "error");
      }
      setSubmittingReview(false);
  };

  const handleMarkAsSold = async (productId: string) => {
      if (!confirm("Xác nhận đã bán?")) return;
      await supabase.from('products').update({ is_sold: true }).eq('id', productId);
      setUserProducts(prev => prev.map(p => p.id === productId ? { ...p, isSold: true } : p));
      addToast("Đã đánh dấu là Đã bán", "success");
  };

  const handleDelete = async (productId: string) => {
      if (!confirm("Xóa tin này vĩnh viễn?")) return;
      await supabase.from('products').delete().eq('id', productId);
      setUserProducts(prev => prev.filter(p => p.id !== productId));
      addToast("Đã xóa tin đăng", "info");
  };

  const handleLogout = async () => { await signOut(); navigate('/'); };

  if (loading) return <div className="text-center py-20">Đang tải profile...</div>;
  if (!profileUser) return <div className="text-center py-20">User not found</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="bg-white shadow rounded-lg overflow-hidden mb-6 group">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 h-32 w-full"></div>
        <div className="px-6 relative flex flex-col sm:flex-row items-end sm:items-center pb-6">
           
           {/* AVATAR AREA */}
           <div className="relative -top-12">
               <img 
                 src={previewAvatar || profileUser.avatar} 
                 alt="Avatar" 
                 className="w-24 h-24 rounded-full border-4 border-white shadow-md object-cover bg-white"
               />
               {isEditing && (
                   <label className="absolute bottom-0 right-0 bg-gray-900 text-white p-1.5 rounded-full cursor-pointer hover:bg-black transition-colors shadow-sm">
                       <Camera className="w-4 h-4" />
                       <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
                   </label>
               )}
           </div>

           <div className="mt-14 sm:mt-0 sm:ml-6 flex-1 w-full text-center sm:text-left">
             {isEditing ? (
                 <div className="flex items-center gap-2 mb-2">
                     <input 
                        type="text" 
                        value={editName} 
                        onChange={e => setEditName(e.target.value)} 
                        className="text-xl font-bold border-b-2 border-indigo-500 focus:outline-none px-1 w-full sm:w-auto"
                        autoFocus
                     />
                 </div>
             ) : (
                 <h1 className="text-2xl font-bold text-gray-900 flex items-center justify-center sm:justify-start">
                   {profileUser.name}
                   {profileUser.isVerified && <ShieldCheck className="w-6 h-6 text-blue-500 ml-2" title="Đã xác thực" />}
                 </h1>
             )}
             
             <div className="flex flex-col sm:flex-row items-center mt-1 text-sm text-gray-500 gap-2 sm:gap-4">
                 <span>MSSV: <span className="font-mono text-gray-700">{maskStudentId(profileUser.studentId)}</span></span>
                 <span className="flex items-center text-yellow-500 font-bold bg-yellow-50 px-2 py-0.5 rounded-full border border-yellow-200">
                     {averageRating > 0 ? averageRating : 'New'} <Star className="w-3.5 h-3.5 ml-1 fill-current" />
                     <span className="text-gray-400 font-normal ml-1 text-xs">({reviews.length} đánh giá)</span>
                 </span>
             </div>
           </div>

           {/* ACTION BUTTONS */}
           <div className="mt-4 sm:mt-0 flex gap-3">
               {isOwnProfile ? (
                   isEditing ? (
                       <>
                           <button onClick={() => { setIsEditing(false); setPreviewAvatar(null); setEditName(profileUser.name); }} className="text-gray-600 hover:bg-gray-100 px-3 py-2 rounded-md transition"><X className="w-5 h-5"/></button>
                           <button onClick={handleUpdateProfile} disabled={isSaving} className="bg-green-600 text-white px-4 py-2 rounded-md flex items-center hover:bg-green-700 transition shadow">
                               {isSaving ? 'Đang lưu...' : <><Save className="w-4 h-4 mr-2"/> Lưu</>}
                           </button>
                       </>
                   ) : (
                       <>
                           <button onClick={() => setIsEditing(true)} className="text-indigo-600 hover:bg-indigo-50 px-4 py-2 rounded-md border border-indigo-100 transition flex items-center font-medium">
                               <Edit3 className="w-4 h-4 mr-2" /> Sửa
                           </button>
                           <button onClick={handleLogout} className="text-red-600 hover:bg-red-50 px-4 py-2 rounded-md flex items-center transition">
                               <LogOut className="w-4 h-4" />
                           </button>
                       </>
                   )
               ) : (
                   <Link to={`/chat?partnerId=${profileUser.id}`} className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 transition flex items-center shadow-sm">
                       <MessageCircle className="w-4 h-4 mr-2" /> Nhắn tin
                   </Link>
               )}
           </div>
        </div>

        {/* TABS */}
        <div className="border-t border-gray-200 px-6 flex gap-6 overflow-x-auto scrollbar-hide">
            <button onClick={() => setActiveTab('posts')} className={`py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'posts' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                Tin đăng ({userProducts.length})
            </button>
            {isOwnProfile && (
                <button onClick={() => setActiveTab('bought')} className={`py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'bought' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                    Đã mua ({purchasedProducts.length})
                </button>
            )}
            <button onClick={() => setActiveTab('reviews')} className={`py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'reviews' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                Đánh giá ({reviews.length})
            </button>
            <button onClick={() => setActiveTab('info')} className={`py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'info' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                Thông tin
            </button>
        </div>
      </div>

      {/* === TAB CONTENT === */}
      
      {/* 1. SELLING POSTS */}
      {activeTab === 'posts' && (
          <div className="bg-white shadow rounded-lg p-6 min-h-[300px]">
              {isOwnProfile && <div className="flex justify-between mb-4"><h2 className="font-bold text-gray-900">Quản lý tin bán</h2><Link to="/post" className="text-sm text-indigo-600 flex items-center hover:underline"><Package className="w-4 h-4 mr-1"/> Đăng mới</Link></div>}
              {userProducts.length === 0 ? <div className="text-center py-10 text-gray-400 border-2 border-dashed rounded-lg">Chưa có tin đăng nào.</div> : 
                  <div className="grid grid-cols-1 gap-4">
                      {userProducts.map((p) => (
                          <div key={p.id} className={`flex items-center border p-4 rounded-lg hover:shadow-sm transition ${p.isSold ? 'bg-gray-50 opacity-75' : 'bg-white'}`}>
                              <img src={p.images[0] || 'https://via.placeholder.com/100'} className="w-16 h-16 object-cover rounded bg-gray-200" />
                              <div className="flex-1 ml-4">
                                  <Link to={`/product/${p.id}`} className="font-bold text-gray-900 hover:text-indigo-600 line-clamp-1">{p.title}</Link>
                                  <div className="flex gap-2 mt-1 items-center">
                                    {p.isSold && <span className="text-[10px] bg-gray-500 text-white px-2 py-0.5 rounded uppercase font-bold">ĐÃ BÁN</span>}
                                    <span className="text-indigo-600 text-sm font-bold">{p.price.toLocaleString()} đ</span>
                                  </div>
                              </div>
                              {isOwnProfile && (
                                  <div className="flex gap-2">
                                      {!p.isSold && <button onClick={() => handleMarkAsSold(p.id)} className="text-xs bg-green-50 text-green-700 px-3 py-2 rounded hover:bg-green-100 border border-green-200">Đã bán</button>}
                                      <button onClick={() => handleDelete(p.id)} className="text-xs bg-red-50 text-red-700 px-3 py-2 rounded hover:bg-red-100 border border-red-200">Xóa</button>
                                  </div>
                              )}
                          </div>
                      ))}
                  </div>
              }
          </div>
      )}

      {/* 2. BOUGHT PRODUCTS */}
      {activeTab === 'bought' && isOwnProfile && (
          <div className="bg-white shadow rounded-lg p-6 min-h-[300px]">
              <h2 className="font-bold text-gray-900 mb-4">Lịch sử mua hàng</h2>
              {purchasedProducts.length === 0 ? <div className="text-center py-10 text-gray-400 border-2 border-dashed rounded-lg flex flex-col items-center"><ShoppingBag className="w-10 h-10 mb-2 opacity-20"/>Chưa mua món nào.</div> : 
                  <div className="grid grid-cols-1 gap-4">
                      {purchasedProducts.map((p) => (
                          <div key={p.id} className="flex items-center border p-4 rounded-lg bg-green-50/30 border-green-100">
                              <div className="relative">
                                <img src={p.images[0]} className="w-16 h-16 object-cover rounded bg-white border border-green-200" />
                                <div className="absolute -bottom-2 -right-2 bg-green-500 text-white rounded-full p-1"><ShieldCheck className="w-3 h-3"/></div>
                              </div>
                              <div className="flex-1 ml-4">
                                  <Link to={`/product/${p.id}`} className="font-bold text-gray-900 hover:text-indigo-600 line-clamp-1">{p.title}</Link>
                                  <p className="text-xs text-gray-500 mt-1">Đã mua từ: <Link to={`/profile/${p.sellerId}`} className="text-indigo-600 hover:underline">Người bán</Link></p>
                              </div>
                              <span className="font-bold text-green-700">{p.price.toLocaleString()} đ</span>
                          </div>
                      ))}
                  </div>
              }
          </div>
      )}

      {/* 3. REVIEWS */}
      {activeTab === 'reviews' && (
          <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center">Đánh giá cộng đồng ({reviews.length})</h2>
              {!isOwnProfile && currentUser && (
                  <form onSubmit={handleCreateReview} className="mb-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center mb-3">
                          <span className="text-sm mr-3 text-gray-600">Đánh giá người này:</span>
                          {[1, 2, 3, 4, 5].map(s => <button key={s} type="button" onClick={() => setNewRating(s)}><Star className={`w-6 h-6 ${s <= newRating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} /></button>)}
                      </div>
                      <textarea required className="w-full border p-2 rounded text-sm mb-2" placeholder="Nhập nhận xét..." value={newComment} onChange={e => setNewComment(e.target.value)} />
                      <div className="text-right"><button disabled={submittingReview} className="bg-indigo-600 text-white px-4 py-2 rounded text-xs font-bold hover:bg-indigo-700">Gửi đánh giá</button></div>
                  </form>
              )}
              <div className="space-y-4">
                  {reviews.map(r => (
                      <div key={r.id} className="flex gap-3 border-b pb-4 last:border-0">
                          <img src={r.reviewerAvatar} className="w-10 h-10 rounded-full bg-gray-200" />
                          <div>
                              <div className="flex items-center gap-2"><span className="font-bold text-sm">{r.reviewerName}</span><span className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleDateString('vi-VN')}</span></div>
                              <div className="flex my-1">{[...Array(5)].map((_, i) => <Star key={i} className={`w-3 h-3 ${i < r.rating ? 'text-yellow-400 fill-current' : 'text-gray-200'}`} />)}</div>
                              <p className="text-sm text-gray-800">{r.comment}</p>
                          </div>
                      </div>
                  ))}
                  {reviews.length === 0 && <p className="text-gray-500 italic text-center">Chưa có đánh giá nào.</p>}
              </div>
          </div>
      )}

      {/* 4. INFO */}
      {activeTab === 'info' && (
           <div className="bg-white shadow rounded-lg p-6">
               <h3 className="font-bold text-gray-900 mb-4 border-b pb-2">Thông tin tài khoản</h3>
               <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                   <div><dt className="text-gray-500">Tên hiển thị</dt><dd className="font-medium">{profileUser.name}</dd></div>
                   <div><dt className="text-gray-500">Trạng thái</dt><dd className={profileUser.isVerified ? "text-green-600 font-bold" : "text-gray-500"}>{profileUser.isVerified ? 'Đã xác thực MSSV' : 'Chưa xác thực'}</dd></div>
                   {isOwnProfile && <div><dt className="text-gray-500">Email</dt><dd className="font-medium">{profileUser.email}</dd></div>}
                   <div><dt className="text-gray-500">Vai trò</dt><dd className="uppercase font-bold text-xs bg-gray-100 inline-block px-2 py-1 rounded">{profileUser.role}</dd></div>
               </dl>
           </div>
      )}
    </div>
  );
};

export default ProfilePage;