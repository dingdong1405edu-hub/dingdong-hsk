"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle } from "lucide-react";

// Auth.js redirects back to /login?error=<code> when a Google sign-in fails.
// Without showing this, a blocked user just lands back on the login page with no
// feedback — it looks like the button "does nothing". The most common cause of a
// failure that only affects SOME Google accounts is the OAuth consent screen
// still being in "Testing" mode (only whitelisted test users may sign in) →
// Auth.js surfaces that as `AccessDenied` / `OAuthCallback`.
const MESSAGES: Record<string, string> = {
  Configuration:
    "Hệ thống đăng nhập đang gặp sự cố cấu hình. Vui lòng thử lại sau ít phút.",
  AccessDenied:
    "Tài khoản Google của bạn chưa được cấp quyền truy cập. Nếu ứng dụng đang ở chế độ thử nghiệm, hãy liên hệ quản trị viên để được thêm vào danh sách, hoặc thử lại sau khi ứng dụng được phát hành công khai.",
  Verification: "Liên kết xác thực đã hết hạn. Vui lòng đăng nhập lại.",
  OAuthSignin: "Không thể bắt đầu đăng nhập với Google. Vui lòng thử lại.",
  OAuthCallback: "Đăng nhập với Google thất bại. Vui lòng thử lại.",
  OAuthCreateAccount: "Không thể tạo tài khoản. Vui lòng thử lại.",
  OAuthAccountNotLinked:
    "Email này đã được dùng để đăng nhập bằng phương thức khác.",
  Callback: "Đăng nhập thất bại. Vui lòng thử lại.",
  default: "Đã có lỗi xảy ra khi đăng nhập. Vui lòng thử lại.",
};

function AuthErrorInner() {
  const error = useSearchParams().get("error");
  if (!error) return null;
  const message = MESSAGES[error] ?? MESSAGES.default;
  return (
    <div
      role="alert"
      className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <span className="leading-relaxed">{message}</span>
    </div>
  );
}

export function AuthError() {
  // useSearchParams must sit inside a Suspense boundary so the page can still be
  // statically prerendered.
  return (
    <Suspense fallback={null}>
      <AuthErrorInner />
    </Suspense>
  );
}
