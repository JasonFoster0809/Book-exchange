import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      nav: {
        home: "Home",
        market: "Market",
        post: "Post Item",
        chat: "Chats",
        login: "Login",
        profile: "Profile",
        admin: "Admin",
        logout: "Logout",
        login_as: "Logged in as",
        my_listings: "My Listings",
        saved: "Saved Items"
      },
      product: {
        back: "Back",
        description_title: "Description",
        no_description: "Seller hasn't provided a description.",
        safety_title: "Safety Tips",
        safety_content: "Meet in public places (H6 Hall, Library). Check item carefully before paying. No advance transfer.",
        condition: "Condition",
        trade_method: "Trade Method",
        location: "Location",
        posted_date: "Posted",
        seller_role: "SELLER",
        owner_role: "YOUR ITEM",
        verified_student: "Verified Student",
        unverified: "Unverified",
        student_id: "ID",
        edit_post: "Edit Listing",
        contact_seller: "Contact Seller",
        report_post: "Report Item",
        status: {
          available: "AVAILABLE",
          pending: "PENDING",
          sold: "SOLD"
        },
        method: {
          direct: "Direct",
          shipping: "Shipping"
        }
      },
      profile: {
        edit_profile: "Edit Profile",
        logout: "Logout",
        message: "Message",
        follow: "Follow",
        following: "Following",
        stats: {
          posts: "Listings",
          sold: "Sold",
          reviews: "reviews"
        },
        tabs: {
          inventory: "Inventory",
          reviews: "Reviews"
        },
        empty_products: "No items listed yet.",
        empty_reviews: "No reviews yet.",
        post_now: "Post Now",
        verified_badge: "Trusted Member",
        verified_desc: "Student info verified.",
        unverified_title: "Unverified Account",
        verify_now: "Verify Now",
        pending_verify: "Pending Approval...",
        modal: {
          title: "Edit Profile",
          avatar_cover: "Avatar & Cover",
          change_avatar: "Change Avatar",
          change_cover: "Change Cover",
          display_name: "Display Name",
          major: "Major",
          batch: "Cohort",
          bio: "Bio",
          cancel: "Cancel",
          save: "Save Changes",
          saving: "Saving..."
        }
      },
      chat: {
        title: "Messages",
        search_placeholder: "Search...",
        empty_list: "No messages.",
        empty_chat: "Select a conversation to start chatting",
        status: {
          online: "Active now",
          selling: "SELLING",
          trading: "TRADING",
          sold: "SOLD"
        },
        roles: {
          buyer: "Buyer",
          seller: "Seller"
        },
        actions: {
          request_buy: "Request to Buy",
          confirm_sell: "Confirm Sell",
          finish: "Finish",
          cancel: "Cancel",
          waiting_seller: "Waiting for seller confirmation...",
          completed: "Transaction Completed",
          delivered: "Delivered",
          unpin: "Unpin Item",
          view_profile: "View Profile",
          report_user: "Report User",
          delete_chat: "Delete Chat"
        },
        input_placeholder: "Type a message..."
      },
      market: {
        title: "Student Thrift Corner",
        subtitle: "Trade textbooks, pass on calculators at student prices.",
        search_placeholder: "What are you hunting for?...",
        ai_btn: "AI Find",
        hunt_btn: "Hunt Alerts",
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
        hero_title: "Old to you, New to me.",
        hero_subtitle: "Trusted student exchange platform. Pass on textbooks and gears safely within the campus community.",
        explore_btn: "Hunt Deals Now",
        sell_btn: "Pass Item Now",
        popular_cat: "Trending Categories",
        latest_items: "Freshly Listed",
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
        sell_tab: "I want to sell",
        buy_tab: "I want to buy",
        img_label: "Product Images",
        img_placeholder: "Add Image",
        img_limit: "Max 4 images. First one is cover.",
        cat_label: "Category",
        cond_label: "Condition",
        method_label: "Trade Method",
        placeholder_title: "e.g. Calculus 1 Textbook...",
        placeholder_desc: "Detail about the item...",
        submit_btn: "POST NOW",
        loading_btn: "Processing...",
        title: "Pass Your Item",
        name_label: "Item Name",
        price_label: "Pass Price (VND)",
        desc_label: "Condition Details",
        ai_write: "Let AI Write",
        success_msg: "Item posted successfully!"
      },
      common: {
        status_sold: "SOLD",
        price_free: "FREE",
        method_locker: "LOCKER",
        method_meetup: "MEETUP",
        member: "User",
        buy_tag: "Wanted"
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
        logout: "Đăng xuất",
        login_as: "Đang đăng nhập là",
        my_listings: "Tin đăng của tôi",
        saved: "Tin đã lưu"
      },
      product: {
        back: "Quay lại",
        description_title: "Mô tả chi tiết",
        no_description: "Người bán chưa nhập mô tả cho sản phẩm này.",
        safety_title: "Lưu ý an toàn",
        safety_content: "Nên giao dịch trực tiếp tại các khu vực đông người trong trường (Sảnh H6, Thư viện). Kiểm tra kỹ sản phẩm trước khi thanh toán. Không chuyển khoản trước khi nhận hàng.",
        condition: "Tình trạng",
        trade_method: "Giao dịch",
        location: "Khu vực",
        posted_date: "Ngày đăng",
        seller_role: "NGƯỜI BÁN",
        owner_role: "TIN CỦA BẠN",
        verified_student: "SV Xác Thực",
        unverified: "Chưa xác thực",
        student_id: "MSSV",
        edit_post: "Chỉnh sửa tin đăng",
        contact_seller: "Liên hệ người bán",
        report_post: "Báo cáo tin này",
        status: {
          available: "CÒN HÀNG",
          pending: "ĐANG GIAO DỊCH",
          sold: "ĐÃ BÁN"
        },
        method: {
          direct: "Trực tiếp",
          shipping: "Ship COD"
        }
      },
      profile: {
        edit_profile: "Sửa hồ sơ",
        logout: "Đăng xuất",
        message: "Nhắn tin",
        follow: "Theo dõi",
        following: "Đã theo dõi",
        stats: {
          posts: "Tin đăng",
          sold: "Đã bán",
          reviews: "đánh giá"
        },
        tabs: {
          inventory: "Kho hàng",
          reviews: "Đánh giá"
        },
        empty_products: "Chưa có sản phẩm nào được đăng bán.",
        empty_reviews: "Chưa có đánh giá nào",
        post_now: "Đăng tin ngay",
        verified_badge: "Thành viên uy tín",
        verified_desc: "Đã xác thực thông tin sinh viên.",
        unverified_title: "Tài khoản chưa xác thực",
        verify_now: "Xác thực ngay",
        pending_verify: "Đang chờ duyệt...",
        modal: {
          title: "Chỉnh sửa hồ sơ",
          avatar_cover: "Ảnh đại diện & Bìa",
          change_avatar: "Đổi Avatar",
          change_cover: "Đổi Bìa",
          display_name: "Tên hiển thị",
          major: "Ngành học",
          batch: "Khóa",
          bio: "Giới thiệu bản thân",
          cancel: "Hủy",
          save: "Lưu thay đổi",
          saving: "Đang lưu..."
        }
      },
      chat: {
        title: "Tin nhắn",
        search_placeholder: "Tìm kiếm...",
        empty_list: "Chưa có tin nhắn nào.",
        empty_chat: "Chọn một cuộc hội thoại để bắt đầu",
        status: {
          online: "Đang hoạt động",
          selling: "ĐANG BÁN",
          trading: "ĐANG GIAO DỊCH",
          sold: "ĐÃ BÁN"
        },
        roles: {
          buyer: "Người mua",
          seller: "Người bán"
        },
        actions: {
          request_buy: "Yêu cầu mua",
          confirm_sell: "Xác nhận bán",
          finish: "Hoàn tất",
          cancel: "Hủy",
          waiting_seller: "Đang chờ người bán xác nhận hoàn tất...",
          completed: "Giao dịch đã hoàn tất",
          delivered: "Đã giao xong",
          unpin: "Gỡ ghim sản phẩm",
          view_profile: "Xem trang cá nhân",
          report_user: "Báo cáo người dùng",
          delete_chat: "Xóa cuộc trò chuyện"
        },
        input_placeholder: "Nhập tin nhắn..."
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
        sell_tab: "Tôi muốn bán",
        buy_tab: "Tôi cần mua",
        img_label: "Hình ảnh sản phẩm",
        img_placeholder: "Thêm ảnh",
        img_limit: "Tối đa 4 ảnh. Ảnh đầu là ảnh bìa.",
        cat_label: "Danh mục",
        cond_label: "Tình trạng",
        method_label: "Cách giao dịch",
        placeholder_title: "VD: Giáo trình Giải tích 1...",
        placeholder_desc: "Mô tả sản phẩm của bạn...",
        submit_btn: "ĐĂNG TIN NGAY",
        loading_btn: "Đang xử lý...",
        title: "Đăng Tin Pass Đồ",
        name_label: "Tên món đồ",
        price_label: "Giá pass lại (VNĐ)",
        desc_label: "Mô tả tình trạng",
        ai_write: "Dùng AI viết",
        success_msg: "Đăng tin thành công!"
      },
      common: {
        status_sold: "ĐÃ BAY",
        price_free: "MIỄN PHÍ",
        method_locker: "LOCKER",
        method_meetup: "GẶP MẶT",
        member: "Người dùng",
        buy_tag: "Cần mua"
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
    },
    react: {
        useSuspense: false 
    }
  });

export default i18n;
