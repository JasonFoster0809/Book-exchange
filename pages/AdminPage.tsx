import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../services/supabase";
import { useNavigate } from "react-router-dom";
import {
  Trash2,
  ShieldCheck,
  Users,
  Package,
  Flag,
  Search,
  Ban,
  Unlock,
  Loader2,
  ShieldAlert,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  MoreHorizontal,
  Filter,
} from "lucide-react";
import { Product, DBProfile } from "../types";
import { useToast } from "../contexts/ToastContext";

// --- TYPES ---
interface AdminUserProfile extends DBProfile {
  ban_until?: string | null;
  email?: string;
  is_banned?: boolean;
}

interface ReportData {
  id: string;
  reporter_id: string;
  product_id: string;
  reason: string;
  status: "pending" | "resolved" | "dismissed";
  created_at: string;
  reporter?: DBProfile;
  product?: Product;
}

interface VerificationRequest {
  id: string;
  user_id: string;
  image_url: string; // URL ảnh thẻ sinh viên
  student_code: string; // FIX: Đổi từ student_id thành student_code cho khớp DB
  status: "pending" | "approved" | "rejected";
  created_at: string;
  profiles: {
    name: string;
    email: string;
    avatar_url: string;
  };
}

// --- STYLES ---
const GlobalStyles = () => (
  <style>{`
    :root { --primary: #00418E; --secondary: #00B0F0; }
    body { background-color: #F8FAFC; color: #0F172A; font-family: 'Inter', sans-serif; }
    
    .glass-panel { 
      background: rgba(255, 255, 255, 0.75); 
      backdrop-filter: blur(20px); 
      border: 1px solid rgba(255, 255, 255, 0.6); 
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.05); 
    }
    
    .glass-table-row:hover { background: rgba(255, 255, 255, 0.6); }
    
    /* Animations */
    @keyframes blob { 
      0% { transform: translate(0px, 0px) scale(1); } 
      33% { transform: translate(30px, -50px) scale(1.1); } 
      66% { transform: translate(-20px, 20px) scale(0.9); } 
      100% { transform: translate(0px, 0px) scale(1); } 
    }
    .animate-blob { animation: blob 10s infinite; }
    .animate-enter { animation: slideUp 0.5s ease-out forwards; }
    @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  `}</style>
);

const AnimatedBackground = () => (
  <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
    <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-400/20 rounded-full mix-blend-multiply filter blur-[100px] animate-blob"></div>
    <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-400/20 rounded-full mix-blend-multiply filter blur-[100px] animate-blob animation-delay-2000"></div>
  </div>
);

const AdminPage: React.FC = () => {
  const { user, loading, isAdmin } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  // Data State
  const [products, setProducts] = useState<Product[]>([]);
  const [usersList, setUsersList] = useState<AdminUserProfile[]>([]);
  const [reports, setReports] = useState<ReportData[]>([]);
  const [verifications, setVerifications] = useState<VerificationRequest[]>([]);

  // UI State
  const [activeTab, setActiveTab] = useState<
    "users" | "reports" | "verifications" | "products"
  >("users");
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // --- INIT ---
  useEffect(() => {
    if (!loading) {
      if (!user || !isAdmin) {
        addToast("Bạn không có quyền truy cập trang quản trị!", "error");
        navigate("/");
      } else {
        fetchData();
      }
    }
  }, [loading, user, isAdmin]);

  const fetchData = async () => {
    setIsLoadingData(true);
    try {
      const [prodRes, userRes, reportRes, verifyRes] = await Promise.all([
        supabase
          .from("products")
          .select("*, profiles:seller_id(name, email)")
          .order("created_at", { ascending: false }),
        supabase
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("reports")
          .select("*, profiles:reporter_id(*), products:product_id(*)")
          .order("created_at", { ascending: false }),
        supabase
          .from("verification_requests")
          .select("*, profiles:user_id(*)")
          .eq("status", "pending"),
      ]);

      if (prodRes.data) setProducts(prodRes.data);
      if (userRes.data) setUsersList(userRes.data);
      if (reportRes.data)
        setReports(
          reportRes.data.map((r: any) => ({
            ...r,
            reporter: r.profiles,
            product: r.products,
          })),
        );
      if (verifyRes.data) setVerifications(verifyRes.data);
    } catch (err) {
      console.error(err);
      addToast("Lỗi tải dữ liệu hệ thống", "error");
    } finally {
      setIsLoadingData(false);
    }
  };

  // --- ACTIONS ---

  // 1. Xử lý Users (Ban/Unban)
  const handleTimedBan = async (userId: string, days: number | null) => {
    const banUntil = days
      ? new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
      : null;
    const isBanned = !!days;

    if (
      !window.confirm(
        days
          ? `Cấm người dùng này ${days} ngày?`
          : "Gỡ lệnh cấm cho người dùng này?",
      )
    )
      return;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          ban_until: banUntil,
          is_banned: isBanned,
        })
        .eq("id", userId);

      if (error) throw error;

      setUsersList((prev) =>
        prev.map((u) =>
          u.id === userId
            ? { ...u, ban_until: banUntil, is_banned: isBanned }
            : u,
        ),
      );
      addToast(
        days ? `Đã cấm người dùng ${days} ngày` : "Đã gỡ lệnh cấm",
        "success",
      );
    } catch (err: any) {
      addToast("Lỗi: " + err.message, "error");
    }
  };

  // 2. Xử lý Duyệt Sinh Viên
  const handleVerification = async (
    reqId: string,
    userId: string,
    status: "approved" | "rejected",
    studentCode?: string,
  ) => {
    try {
      const { error: reqError } = await supabase
        .from("verification_requests")
        .update({ status })
        .eq("id", reqId);
      if (reqError) throw reqError;

      if (status === "approved") {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            verified_status: "verified", // FIX: Dùng cột mới
            student_code: studentCode,   // FIX: Dùng cột mới
          })
          .eq("id", userId);
        if (profileError) throw profileError;
      }

      setVerifications((prev) => prev.filter((v) => v.id !== reqId));
      addToast(
        status === "approved"
          ? "Đã xác thực sinh viên!"
          : "Đã từ chối yêu cầu.",
        status === "approved" ? "success" : "info",
      );
    } catch (err: any) {
      addToast("Lỗi xử lý: " + err.message, "error");
    }
  };

  // 3. Xử lý Sản phẩm (Xóa)
  const handleDeleteProduct = async (prodId: string) => {
    if (!window.confirm("Bạn chắc chắn muốn xóa bài đăng này?")) return;
    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", prodId);
      if (error) throw error;
      setProducts((prev) => prev.filter((p) => p.id !== prodId));
      addToast("Đã xóa bài đăng", "success");
    } catch (err) {
      addToast("Lỗi xóa bài", "error");
    }
  };

  // 4. Xử lý Báo cáo
  const handleResolveReport = async (reportId: string) => {
    try {
      const { error } = await supabase
        .from("reports")
        .update({ status: "resolved" })
        .eq("id", reportId);
      if (error) throw error;
      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, status: "resolved" } : r)),
      );
      addToast("Đã xử lý báo cáo", "success");
    } catch (err) {
      addToast("Lỗi cập nhật", "error");
    }
  };

  // Filter Users Logic (FIX: Dùng student_code)
  const filteredUsers = usersList.filter(
    (u) =>
      u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.student_code?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  if (loading || isLoadingData)
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
        <Loader2 className="h-12 w-12 animate-spin text-[#00418E]" />
      </div>
    );

  return (
    <div className="min-h-screen pt-24 pb-12 font-sans text-slate-800">
      <GlobalStyles />
      <AnimatedBackground />

      <div className="mx-auto max-w-7xl px-4">
        {/* HEADER */}
        <div className="animate-enter mb-10 flex flex-col items-center justify-between gap-6 md:flex-row">
          <div>
            <h1 className="mb-2 flex items-center gap-3 text-4xl font-black text-[#00418E]">
              <ShieldCheck className="text-[#00B0F0]" size={40} /> Admin Control
            </h1>
            <p className="font-medium text-slate-500">
              Hệ thống quản trị tập trung dành cho Bách Khoa Marketplace
            </p>
          </div>
          <div className="glass-panel flex gap-1 rounded-2xl p-1.5 shadow-sm">
            {[
              { id: "users", label: "Thành viên", icon: Users },
              {
                id: "verifications",
                label: "Duyệt SV",
                icon: CheckCircle,
                count: verifications.length,
              },
              {
                id: "reports",
                label: "Báo cáo",
                icon: Flag,
                count: reports.filter((r) => r.status === "pending").length,
              },
              { id: "products", label: "Bài đăng", icon: Package },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all ${
                  activeTab === tab.id
                    ? "bg-[#00418E] text-white shadow-md"
                    : "text-slate-500 hover:bg-white/50 hover:text-[#00418E]"
                }`}
              >
                <tab.icon size={16} /> {tab.label}
                {tab.count ? (
                  <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] text-white">
                    {tab.count}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        {/* --- CONTENT AREA --- */}
        <div className="glass-panel animate-enter min-h-[600px] overflow-hidden rounded-[2.5rem] shadow-xl">
          {/* 1. USERS TAB */}
          {activeTab === "users" && (
            <div className="p-8">
              <div className="mb-8 flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    placeholder="Tìm kiếm theo tên, email, MSSV..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-2xl border-none bg-white/60 px-4 py-4 pl-12 font-medium text-slate-800 shadow-sm outline-none transition-all focus:bg-white focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <button className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm hover:text-[#00418E]">
                  <Filter size={20} />
                </button>
              </div>

              <div className="overflow-hidden rounded-2xl border border-white/50 bg-white/40">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/50 text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="p-5 font-bold">Thành viên</th>
                      <th className="p-5 font-bold">Vai trò</th>
                      <th className="p-5 font-bold">Trạng thái</th>
                      <th className="p-5 text-right font-bold">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredUsers.map((u) => {
                      const isBanned =
                        u.is_banned ||
                        (u.ban_until && new Date(u.ban_until) > new Date());
                      return (
                        <tr
                          key={u.id}
                          className={`glass-table-row transition-colors ${isBanned ? "bg-red-50/50" : ""}`}
                        >
                          <td className="p-5">
                            <div className="flex items-center gap-3">
                              <img
                                src={
                                  u.avatar_url ||
                                  `https://ui-avatars.com/api/?name=${u.name}`
                                }
                                className="h-10 w-10 rounded-full bg-white shadow-sm"
                              />
                              <div>
                                <p className="font-bold text-slate-900">
                                  {u.name}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {u.email}
                                </p>
                                <p className="text-[10px] text-slate-400 font-bold">
                                  MSSV: {u.student_code || '---'}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="p-5">
                            <span
                              className={`rounded-lg px-2 py-1 text-xs font-bold uppercase ${u.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-600"}`}
                            >
                              {u.role}
                            </span>
                          </td>
                          <td className="p-5">
                            {isBanned ? (
                              <div className="flex items-center gap-2 font-bold text-red-600">
                                <ShieldAlert size={14} /> Bị hạn chế
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 font-bold text-green-600">
                                <CheckCircle size={14} /> Hoạt động
                              </div>
                            )}
                          </td>
                          <td className="p-5 text-right">
                            {u.role !== "admin" && (
                              <div className="flex justify-end gap-2">
                                {isBanned ? (
                                  <button
                                    onClick={() => handleTimedBan(u.id, null)}
                                    className="flex items-center gap-1 rounded-lg bg-green-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-600"
                                  >
                                    <Unlock size={12} /> Mở khóa
                                  </button>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => handleTimedBan(u.id, 3)}
                                      className="rounded-lg bg-orange-100 px-3 py-1.5 text-xs font-bold text-orange-600 hover:bg-orange-200"
                                    >
                                      3 ngày
                                    </button>
                                    <button
                                      onClick={() => handleTimedBan(u.id, 9999)}
                                      className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-200"
                                    >
                                      Vĩnh viễn
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 2. VERIFICATIONS TAB */}
          {activeTab === "verifications" && (
            <div className="p-8">
              <h3 className="mb-6 text-xl font-bold text-slate-800">
                Yêu cầu xác thực ({verifications.length})
              </h3>
              {verifications.length === 0 ? (
                <div className="py-20 text-center text-slate-400">
                  Không có yêu cầu nào đang chờ xử lý.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {verifications.map((req) => (
                    <div
                      key={req.id}
                      className="flex gap-4 rounded-3xl border border-white bg-white/60 p-4 shadow-sm backdrop-blur-sm"
                    >
                      <div className="group relative h-32 w-24 shrink-0 cursor-zoom-in overflow-hidden rounded-xl bg-slate-200">
                        <img
                          src={req.image_url}
                          className="h-full w-full object-cover transition-transform group-hover:scale-110"
                          onClick={() => window.open(req.image_url, "_blank")}
                        />
                      </div>
                      <div className="flex-1">
                        <div className="mb-2 flex items-center gap-2">
                          <img
                            src={
                              req.profiles?.avatar_url ||
                              "https://via.placeholder.com/30"
                            }
                            className="h-6 w-6 rounded-full"
                          />
                          <span className="font-bold text-slate-900">
                            {req.profiles?.name}
                          </span>
                        </div>
                        <div className="mb-4 space-y-1 text-sm text-slate-500">
                          <p>
                            Email:{" "}
                            <span className="font-medium text-slate-700">
                              {req.profiles?.email}
                            </span>
                          </p>
                          <p>
                            MSSV (Khai báo):{" "}
                            <span className="font-medium text-blue-600">
                              {req.student_code || "Chưa nhập"}
                            </span>
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              handleVerification(
                                req.id,
                                req.user_id,
                                "approved",
                                req.student_code,
                              )
                            }
                            className="flex-1 rounded-xl bg-green-500 py-2 text-xs font-bold text-white hover:bg-green-600"
                          >
                            Chấp nhận
                          </button>
                          <button
                            onClick={() =>
                              handleVerification(req.id, req.user_id, "rejected")
                            }
                            className="flex-1 rounded-xl bg-slate-200 py-2 text-xs font-bold text-slate-600 hover:bg-slate-300"
                          >
                            Từ chối
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 3. REPORTS TAB */}
          {activeTab === "reports" && (
            <div className="p-8">
              <div className="space-y-4">
                {reports.map((report) => (
                  <div
                    key={report.id}
                    className={`flex items-start gap-4 rounded-2xl border p-4 ${report.status === "resolved" ? "border-slate-100 bg-slate-50 opacity-60" : "border-red-100 bg-red-50/50"}`}
                  >
                    <div className="rounded-full bg-white p-3 text-red-500 shadow-sm">
                      <Flag size={20} />
                    </div>
                    <div className="flex-1">
                      <div className="mb-1 flex justify-between">
                        <h4 className="font-bold text-slate-900">
                          Báo cáo: {report.reason}
                        </h4>
                        <span className="text-xs text-slate-400">
                          {new Date(report.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="mb-2 text-sm text-slate-600">
                        Từ:{" "}
                        <span className="font-bold">
                          {report.reporter?.name}
                        </span>{" "}
                        • Sản phẩm:{" "}
                        <span className="font-bold text-blue-600">
                          {report.product?.title || "Sản phẩm đã xóa"}
                        </span>
                      </p>
                      {report.status === "pending" && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleResolveReport(report.id)}
                            className="text-xs font-bold text-green-600 hover:underline"
                          >
                            Đánh dấu đã xử lý
                          </button>
                          <span className="text-slate-300">|</span>
                          <button
                            onClick={() =>
                              window.open(
                                `/product/${report.product_id}`,
                                "_blank",
                              )
                            }
                            className="text-xs font-bold text-blue-600 hover:underline"
                          >
                            Xem bài đăng
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. PRODUCTS TAB (Simple View) */}
          {activeTab === "products" && (
            <div className="p-8">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {products.map((p) => (
                  <div
                    key={p.id}
                    className="flex gap-3 rounded-2xl border border-white bg-white/60 p-3 shadow-sm backdrop-blur-sm transition-all hover:bg-white"
                  >
                    <img
                      src={
                        p.images?.[0] || "https://via.placeholder.com/100"
                      }
                      className="h-20 w-20 rounded-xl object-cover bg-slate-200"
                    />
                    <div className="flex flex-1 flex-col justify-between">
                      <div>
                        <h4 className="line-clamp-1 text-sm font-bold text-slate-900">
                          {p.title}
                        </h4>
                        <p className="text-xs font-bold text-[#00418E]">
                          {p.price.toLocaleString()}đ
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {p.category}
                        </p>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => window.open(`/product/${p.id}`)}
                          className="rounded-lg bg-slate-100 p-1.5 text-slate-600 hover:bg-blue-50 hover:text-blue-600"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p.id)}
                          className="rounded-lg bg-slate-100 p-1.5 text-red-500 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
