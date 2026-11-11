# Quản lý sản phẩm

App Expo cho web và điện thoại. API Node.js lưu sản phẩm vào MongoDB với bốn trường `name`, `price`, `soluong`, `image` và khóa `_id` do MongoDB tạo. Ảnh JPEG/PNG/WebP tối đa 500 KB được lưu dạng data URL.

## Chạy trên máy

1. Chuẩn bị MongoDB local hoặc Atlas và lấy connection string của người dùng database có quyền đọc/ghi database của app.
2. Chạy `npm install`. Sao chép `.env.server.example` thành `.env.server`, điền `MONGODB_URI`, `ADMIN_EMAIL` và `ADMIN_PASSWORD` (ít nhất 12 ký tự). Tài khoản admin được cấu hình ở đây. Giữ file này ngoài Git.
3. Chép `.env.example` thành `.env.local` nếu chưa có `EXPO_PUBLIC_API_URL`.
4. Mở hai terminal trong `my-app`. Chạy `npm run api` ở terminal đầu và `npx expo start --web -c` ở terminal còn lại. Mở http://localhost:8081 và đăng nhập bằng tài khoản đã cấu hình. Nếu dùng cổng web khác, cập nhật `WEB_ORIGIN`.

Để thử trên điện thoại cùng Wi-Fi, đặt `API_HOST=0.0.0.0` trong `.env.server`, đổi `EXPO_PUBLIC_API_URL` thành địa chỉ LAN của máy chạy API rồi khởi động lại cả hai tiến trình. Dùng mạng tin cậy khi demo local. Nếu triển khai bên ngoài, dùng HTTPS cho API.

Tab web giữ phiên khi tải lại trang. Cần đăng nhập lại khi đóng tab, hết 8 giờ hoặc khi API khởi động lại. Trên điện thoại, phiên lưu trong bộ nhớ của app.

`products.sample.json` chứa dữ liệu mẫu để nộp hoặc nhập vào collection `products`.
