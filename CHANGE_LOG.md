# CHANGE LOG

**Ngày sửa** : 05-01-2026

## Tính năng mới 🎉

### Sửa sản phẩm 📝

- Tạo trang `pages\EditItemPage.tsx`
- Thay thế link của trang sửa sang page mới

### Thay đổi thứ tự ảnh 🌅

- Tải thư viện `react-beautiful-dnd` để có thể tạo hiệu ứng sắp xếp
- Tạo component `components\DraggableImageList.tsx` để sắp xếp ảnh

## Sửa một số bug nhỏ 🐞

### Tự động reload 🔃

- Chỉ xảy ra khi đã đăng nhập, nguyên nhân là do cơ chế **phân quyền** và các hàm liên quan đến **bảo mật** làm trang tự động gọi `useEffect` để kiểm tra lại trạng thái đăng nhập.
- **Cách sửa** thì chỉ cần chỉnh lại các phương thức kiểm tra quyền, từ kiểm tra trực tiếp trên giao diện thì sẽ làm ngầm để tránh reload lại trang liên tục

### Lỗi khi up ảnh cho sản phẩm mới 📸

- Trang tự động gọi các hàm một cách lặp đi lặp lại, dẫn đến không up được ảnh vì React bị kẹt trong vòng lặp render
- Tạo thêm tính năng nén ảnh để tránh nặng database ( khuyến nghị dùng Cloud và chỉ lưu link ảnh)

### Một số lỗi giao diện khác 📝

- Trang có khoảng trắng ở cuối do `pb-20` của thẻ `div` bao ngoài
