import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      nav: {
        home: "Home",
        market: "The Exchange", // Góc Pass Đồ
        post: "Pass Item",      // Đăng tin (Pass đồ)
        chat: "Chats",
        login: "Login",
        profile: "Profile",
        admin: "Admin",
        logout: "Logout"
      },
      market: {
        title: "Student Thrift Corner", // Góc Pass Đồ Sinh Viên
        subtitle: "Trade textbooks, pass on calculators at student prices.",
        search_placeholder: "What are you hunting for?...", // Bạn đang săn gì?
        ai_btn: "AI Find",
        hunt_btn: "Hunt Alerts", // Săn tin
        filter_btn: "Filter",
        cat_all: "All",
        cat_textbook: "Textbooks",
        cat_electronics: "Electronics",
        cat_supplies: "School Supplies",
        cat_clothing: "Uniforms",
        cat_other: "Others",
        sort_newest: "Newest Arrivals",
        sort_price_asc: "Price: Low to High",
        sort_price_desc: "Price: High to Low",
        no_product: "No matching items found.",
        loading: "Loading the stash...",
        hunt_modal_title: "Hunt Registration",
        hunt_desc: "Enter item name. We'll ping you when someone passes a matching item (>60%).",
        hunt_input_label: "Keyword to hunt",
        hunt_submit: "Turn on Alert",
        hunt_success: "Hunting mode on for",
        login_req: "Please login to hunt items!",
        error: "Error"
      },
      home: {
        hero_title: "Old to you, New to me.", // Cũ người mới ta
        hero_subtitle: "Trusted student exchange platform. Pass on textbooks and gears safely within the campus community.",
        explore_btn: "Hunt Deals Now", // Săn Đồ Ngay
        sell_btn: "Pass Item Now",     // Pass Đồ Ngay
        popular_cat: "Trending Categories",
        latest_items: "Freshly Listed", // Tin mới lên sàn
        view_all: "See all",
        no_items: "No items passed yet.",
        loading: "Loading items...",
        cat: {
          textbook: "Textbooks",
          electronics: "Electronics",
          supplies: "Supplies",
          clothing: "Uniforms",
          other: "Others"
        }
      },
      post: {
        title: "Pass Your Item", // Đăng Tin Pass Đồ
        name_label: "Item Name",
        price_label: "Pass Price (VND)", // Giá pass lại
        desc_label: "Condition Details", // Mô tả tình trạng
        ai_write: "Let AI Write",
        submit_btn: "Post to Pass",
        success_msg: "Item posted successfully!"
      },
      auth: {
        welcome: "Welcome Back",
        join: "Join UniMarket",
        email: "Student Email",
        password: "Password",
        login_btn: "Sign In",
        register_btn: "Sign Up",
        switch_register: "Create new account",
        switch_login: "Already have an account?"
      },
      footer: {
        copyright: "© 2024 UniMarket Project. Made for Students."
      }
    }
  },
  vi: {
    translation: {
      nav: {
        home: "Trang chủ",
        market: "Góc Pass Đồ",
        post: "Đăng tin",
        chat: "Tin nhắn",
        login: "Đăng nhập",
        profile: "Hồ sơ",
        admin: "Quản trị",
        logout: "Đăng xuất"
      },
      market: {
        title: "Góc Pass Đồ Sinh Viên",
        subtitle: "Trao đổi giáo trình, máy tính cũ giá hời.",
        search_placeholder: "Bạn cần tìm món gì?...",
        ai_btn: "AI Tìm",
        hunt_btn: "Săn tin",
        filter_btn: "Bộ lọc",
        cat_all: "Tất cả",
        cat_textbook: "Giáo trình",
        cat_electronics: "Đồ điện tử",
        cat_supplies: "Dụng cụ học tập",
        cat_clothing: "Đồng phục/Quần áo",
        cat_other: "Khác",
        sort_newest: "Mới nhất",
        sort_price_asc: "Giá: Thấp đến Cao",
        sort_price_desc: "Giá: Cao đến Thấp",
        no_product: "Không tìm thấy món nào phù hợp.",
        loading: "Đang tải dữ liệu...",
        hunt_modal_title: "Đăng ký Săn Tin",
        hunt_desc: "Nhập tên món đồ. Khi có người pass món trùng khớp (>60%), hệ thống sẽ báo bạn.",
        hunt_input_label: "Từ khóa cần săn",
        hunt_submit: "Bật thông báo",
        hunt_success: "Đã bật chế độ Săn Tin cho",
        login_req: "Vui lòng đăng nhập để dùng tính năng này!",
        error: "Lỗi"
      },
      home: {
        hero_title: "Cũ người mới ta - Kiến thức vươn xa",
        hero_subtitle: "Nền tảng mua bán giáo trình, dụng cụ học tập uy tín. Kết nối cộng đồng sinh viên, giao dịch an toàn và tiết kiệm tối đa.",
        explore_btn: "Săn Đồ Ngay",
        sell_btn: "Pass Đồ Ngay",
        popular_cat: "Danh mục phổ biến",
        latest_items: "Tin mới lên sàn",
        view_all: "Xem tất cả",
        no_items: "Chưa có tin đăng nào.",
        loading: "Đang tải danh sách...",
        cat: {
          textbook: "Giáo trình",
          electronics: "Đồ điện tử",
          supplies: "Dụng cụ",
          clothing: "Đồng phục",
          other: "Khác"
        }
      },
      post: {
        title: "Đăng Tin Pass Đồ",
        name_label: "Tên món đồ",
        price_label: "Giá pass lại (VNĐ)",
        desc_label: "Mô tả tình trạng",
        ai_write: "Dùng AI viết",
        submit_btn: "Đăng Tin Ngay",
        success_msg: "Đăng tin thành công!"
      },
      auth: {
        welcome: "Chào mừng trở lại",
        join: "Gia nhập UniMarket",
        email: "Email sinh viên",
        password: "Mật khẩu",
        login_btn: "Đăng Nhập",
        register_btn: "Đăng Ký",
        switch_register: "Tạo tài khoản mới",
        switch_login: "Đã có tài khoản?"
      },
      footer: {
        copyright: "© 2024 Dự án UniMarket. Dành riêng cho Sinh viên."
      }
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "vi", 
    fallbackLng: "en",
    interpolation: {
      escapeValue: false 
    }
  });

export default i18n;