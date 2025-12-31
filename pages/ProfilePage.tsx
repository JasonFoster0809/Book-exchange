import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { ShieldCheck, LogOut, Package, MessageCircle, Star, User as UserIcon } from 'lucide-react';
import { Product, User, Review } from '../types';

const ProfilePage: React.FC = () => {
  const { user: currentUser, signOut } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const isOwnProfile = !id || (currentUser && id === currentUser.id);
  const targetUserId = isOwnProfile ? currentUser?.id : id;

  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [userProducts, setUserProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [averageRating, setAverageRating] = useState<number>(0);
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'posts' | 'info' | 'reviews'>('posts');
  
  // State cho form đánh giá
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // --- HÀM ẨN SỐ SINH VIÊN ---
  const maskStudentId = (studentId: string) => {
    if (!studentId) return 'Chưa cập nhật';
    if (isOwnProfile) return studentId;
    if (studentId.length > 5) {
       const start = studentId.slice(0, 3);
       const end = studentId.slice(-2);
       return `${start}****${end}`;
    }
    return '*******';
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!targetUserId) return;
      setLoading(true);

      try {
        // 1. Fetch Profile Info
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
        }

        // 2. Fetch Products
        let query = supabase.from('products').select('*').eq('seller_id', targetUserId).order('posted_at', { ascending: false });
        if (!isOwnProfile) query = query.eq('is_sold', false);
        
        const { data: productsData } = await query;
        if (productsData) {
             const mapped: Product[] = productsData.map((item: any) => ({
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
             setUserProducts(mapped);
        }

        // 3. Fetch Reviews
        fetchReviews();

      } catch (error) {
        console.error("Lỗi tải dữ liệu:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, currentUser, targetUserId]);

  const fetchReviews = async () => {
      if (!targetUserId) return;
      const { data: reviewsData } = await supabase
        .from('reviews')
        .select(`
            *,
            reviewer:reviewer_id(name, avatar_url)
        `)
        .eq('reviewee_id', targetUserId)
        .order('created_at', { ascending: false });

      if (reviewsData) {
          const mappedReviews: Review[] = reviewsData.map((item: any) => ({
              id: item.id,
              reviewerId: item.reviewer_id,
              reviewerName: item.reviewer?.name || 'Ẩn danh',
              reviewerAvatar: item.reviewer?.avatar_url || 'https://via.placeholder.com/150',
              rating: item.rating,
              comment: item.comment,
              createdAt: item.created_at
          }));
          setReviews(mappedReviews);

          // Tính điểm trung bình
          if (mappedReviews.length > 0) {
              const total = mappedReviews.reduce((sum, r) => sum + r.rating, 0);
              setAverageRating(Number((total / mappedReviews.length).toFixed(1)));
          } else {
              setAverageRating(0);
          }
      }
  };

  const handleCreateReview = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!currentUser || !targetUserId) return;

      setSubmittingReview(true);
      const { error } = await supabase.from('reviews').insert({
          reviewer_id: currentUser.id,
          reviewee_id: targetUserId,
          rating: newRating,
          comment: newComment
      });

      if (error) {
          alert("Lỗi gửi đánh giá: " + error.message);
      } else {
          setNewComment('');
          setNewRating(5);
          fetchReviews(); // Tải lại danh sách
          alert("Cảm ơn bạn đã đánh giá!");
      }
      setSubmittingReview(false);
  };

  // ... (Giữ nguyên các hàm handleMarkAsSold, handleDelete, handleLogout cũ) ...
  const handleMarkAsSold = async (productId: string) => {
    if (!confirm("Xác nhận đã bán?")) return;
    const { error } = await supabase.from('products').update({ is_sold: true }).eq('id', productId);
    if (!error) setUserProducts(prev => prev.map(p => p.id === productId ? { ...p, isSold: true } : p));
  };

  const handleDelete = async (productId: string) => {
    if (!confirm("Xóa tin này vĩnh viễn?")) return;
    const { error } = await supabase.from('products').delete().eq('id', productId);
    if (!error) setUserProducts(prev => prev.filter(p => p.id !== productId));
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  if (loading) return <div className="text-center py-20">Đang tải profile...</div>;
  if (!profileUser) return <div className="text-center py-20 text-red-500">Không tìm thấy người dùng.</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 h-32 w-full"></div>
        <div className="px-6 relative flex flex-col sm:flex-row items-end sm:items-center pb-6">
           <img 
             src={profileUser.avatar} 
             alt="Avatar" 
             className="w-24 h-24 rounded-full border-4 border-white absolute -top-12 shadow-md object-cover bg-white"
           />
           <div className="mt-14 sm:mt-0 sm:ml-28 flex-1">
             <h1 className="text-2xl font-bold text-gray-900 flex items-center">
               {profileUser.name}
               {profileUser.isVerified && <ShieldCheck className="w-6 h-6 text-blue-500 ml-2" title="Đã xác thực" />}
             </h1>
             <div className="flex items-center mt-1 text-sm text-gray-500">
                 <span className="mr-4">MSSV: <span className="font-medium text-gray-700">{maskStudentId(profileUser.studentId)}</span></span>
                 {/* HIỂN THỊ ĐIỂM UY TÍN */}
                 <span className="flex items-center text-yellow-500 font-bold bg-yellow-50 px-2 py-0.5 rounded-full border border-yellow-200">
                     {averageRating > 0 ? averageRating : 'Mới'} <Star className="w-3.5 h-3.5 ml-1 fill-current" />
                     <span className="text-gray-400 font-normal ml-1 text-xs">({reviews.length} đánh giá)</span>
                 </span>
             </div>
           </div>
           <div className="mt-4 sm:mt-0 flex gap-3">
               {isOwnProfile ? (
                   <button onClick={handleLogout} className="text-red-600 hover:bg-red-50 px-4 py-2 rounded-md text-sm font-medium border border-transparent hover:border-red-200 transition flex items-center">
                       <LogOut className="w-4 h-4 mr-2" /> Đăng xuất
                   </button>
               ) : (
                   <Link to={`/chat?partnerId=${profileUser.id}`} className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 transition flex items-center shadow-sm">
                       <MessageCircle className="w-4 h-4 mr-2" /> Nhắn tin
                   </Link>
               )}
           </div>
        </div>

        {/* Tabs */}
        <div className="border-t border-gray-200 px-6 flex gap-6 overflow-x-auto">
            <button onClick={() => setActiveTab('posts')} className={`py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'posts' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                Tin đăng ({userProducts.length})
            </button>
            <button onClick={() => setActiveTab('reviews')} className={`py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'reviews' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                Đánh giá uy tín ({reviews.length})
            </button>
            <button onClick={() => setActiveTab('info')} className={`py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'info' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                Thông tin cá nhân
            </button>
        </div>
      </div>

      {/* CONTENT: POSTS */}
      {activeTab === 'posts' && (
          <div className="bg-white shadow rounded-lg p-6 min-h-[300px]">
              {/* (Giữ nguyên phần hiển thị danh sách sản phẩm như cũ) */}
              {isOwnProfile && (
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-bold text-gray-900">Quản lý tin đăng</h2>
                    <Link to="/post" className="text-sm text-indigo-600 hover:underline flex items-center bg-indigo-50 px-3 py-1.5 rounded-full">
                        <Package className="w-4 h-4 mr-1" /> Đăng bài mới
                    </Link>
                </div>
              )}
              {userProducts.length === 0 ? (
                  <div className="text-center py-10 text-gray-400 border-2 border-dashed rounded-lg">Chưa có tin đăng nào.</div>
              ) : (
                  <div className="grid grid-cols-1 gap-4">
                      {userProducts.map((p) => (
                          <div key={p.id} className={`flex items-center border p-4 rounded-lg hover:shadow-sm transition ${p.isSold ? 'bg-gray-100 opacity-75' : 'bg-white'}`}>
                              <img src={p.images[0] || 'https://via.placeholder.com/100'} className="w-16 h-16 object-cover rounded bg-gray-200" alt="" />
                              <div className="flex-1 ml-4">
                                  <Link to={`/product/${p.id}`} className="font-bold text-gray-900 hover:text-indigo-600">{p.title}</Link>
                                  <div className="flex gap-2 mt-1">
                                    {p.isSold && <span className="text-xs bg-gray-500 text-white px-2 py-0.5 rounded">ĐÃ BÁN</span>}
                                    <span className="text-indigo-600 text-sm font-bold">{p.price.toLocaleString()} đ</span>
                                  </div>
                              </div>
                              {isOwnProfile && (
                                  <div className="flex gap-2">
                                      {!p.isSold && <button onClick={() => handleMarkAsSold(p.id)} className="text-xs bg-green-50 text-green-700 px-3 py-2 rounded hover:bg-green-100">Đã bán</button>}
                                      <button onClick={() => handleDelete(p.id)} className="text-xs bg-red-50 text-red-700 px-3 py-2 rounded hover:bg-red-100">Xóa</button>
                                  </div>
                              )}
                          </div>
                      ))}
                  </div>
              )}
          </div>
      )}

      {/* CONTENT: REVIEWS (MỚI) */}
      {activeTab === 'reviews' && (
          <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
                  Đánh giá từ cộng đồng
                  <span className="ml-3 text-sm font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                      Trung bình: {averageRating} / 5 ⭐
                  </span>
              </h2>

              {/* Form viết đánh giá (Chỉ hiện khi xem profile người khác) */}
              {!isOwnProfile && currentUser && (
                  <form onSubmit={handleCreateReview} className="mb-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <h3 className="text-sm font-bold text-gray-800 mb-3">Viết nhận xét về {profileUser.name}</h3>
                      <div className="flex items-center mb-3">
                          <span className="text-sm mr-3 text-gray-600">Bạn chấm mấy sao?</span>
                          {[1, 2, 3, 4, 5].map((star) => (
                              <button key={star} type="button" onClick={() => setNewRating(star)} className="focus:outline-none transition-transform hover:scale-110">
                                  <Star className={`w-6 h-6 ${star <= newRating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
                              </button>
                          ))}
                      </div>
                      <textarea 
                          required 
                          className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="Chia sẻ trải nghiệm giao dịch của bạn..."
                          rows={3}
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                      />
                      <div className="mt-2 flex justify-end">
                          <button type="submit" disabled={submittingReview} className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                              {submittingReview ? 'Đang gửi...' : 'Gửi đánh giá'}
                          </button>
                      </div>
                  </form>
              )}

              {/* Danh sách đánh giá */}
              <div className="space-y-6">
                  {reviews.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">Chưa có đánh giá nào. Hãy là người đầu tiên!</p>
                  ) : (
                      reviews.map((review) => (
                          <div key={review.id} className="flex gap-4 border-b border-gray-100 pb-6 last:border-0 last:pb-0">
                              <Link to={`/profile/${review.reviewerId}`}>
                                  <img src={review.reviewerAvatar} alt="" className="w-10 h-10 rounded-full object-cover border border-gray-200" />
                              </Link>
                              <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                      <Link to={`/profile/${review.reviewerId}`} className="font-bold text-gray-900 text-sm hover:underline">{review.reviewerName}</Link>
                                      <span className="text-xs text-gray-400">{new Date(review.createdAt).toLocaleDateString('vi-VN')}</span>
                                  </div>
                                  <div className="flex items-center my-1">
                                      {[...Array(5)].map((_, i) => (
                                          <Star key={i} className={`w-3 h-3 ${i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-200'}`} />
                                      ))}
                                  </div>
                                  <p className="text-sm text-gray-700 mt-1">{review.comment}</p>
                              </div>
                          </div>
                      ))
                  )}
              </div>
          </div>
      )}

      {/* CONTENT: INFO */}
      {activeTab === 'info' && (
           <div className="bg-white shadow rounded-lg p-6">
               <h3 className="text-lg font-medium text-gray-900 mb-4">Thông tin chi tiết</h3>
               {/* (Giữ nguyên phần thông tin cá nhân cũ) */}
               <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                   <div className="sm:col-span-1"><dt className="text-sm font-medium text-gray-500">Tên hiển thị</dt><dd className="mt-1 text-sm text-gray-900">{profileUser.name}</dd></div>
                   <div className="sm:col-span-1"><dt className="text-sm font-medium text-gray-500">Xác thực</dt><dd className="mt-1 text-sm text-gray-900">{profileUser.isVerified ? 'Đã xác thực' : 'Chưa xác thực'}</dd></div>
                   {isOwnProfile && <div className="sm:col-span-1"><dt className="text-sm font-medium text-gray-500">Email</dt><dd className="mt-1 text-sm text-gray-900">{profileUser.email}</dd></div>}
               </dl>
           </div>
      )}
    </div>
  );
};

export default ProfilePage;