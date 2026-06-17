import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Star, Flame, Heart, ChevronRight, Sparkles } from "lucide-react";
import { BaoMascot } from "@/components/marketing/bao-mascot";

const features = [
  {
    icon: "📚",
    title: "Từ vựng & Ngữ pháp",
    desc: "HSK 1–6, gamified như Duolingo với XP, streak, tim. Pinyin tooltip tức thì.",
    chip: "bg-blue-50 ring-blue-100",
  },
  {
    icon: "✍️",
    title: "Luyện viết chữ Hán",
    desc: "Animation thứ tự nét bút, quiz vẽ từng nét, ô 田字格 như vở tập viết.",
    chip: "bg-amber-50 ring-amber-100",
  },
  {
    icon: "📖",
    title: "Đọc hiểu",
    desc: "Đoạn văn tiếng Trung + pinyin overlay + nhấn để tra từ. Câu hỏi theo format HSK.",
    chip: "bg-emerald-50 ring-emerald-100",
  },
  {
    icon: "🎧",
    title: "Nghe hiểu",
    desc: "Audio HSK chuẩn với điều khiển tốc độ. Transcript mở khoá sau khi nộp.",
    chip: "bg-teal-50 ring-teal-100",
  },
  {
    icon: "🖊️",
    title: "Luyện viết luận",
    desc: "AI chấm ngữ pháp, từ vựng, mạch lạc kèm bản sửa lỗi chi tiết.",
    chip: "bg-rose-50 ring-rose-100",
  },
  {
    icon: "🎤",
    title: "Luyện nói HSKK",
    desc: "Ghi âm trực tiếp → AI chấm phát âm, thanh điệu và độ lưu loát.",
    chip: "bg-indigo-50 ring-indigo-100",
  },
];

const trust = [
  { icon: Flame, label: "Chuỗi ngày học", cls: "text-orange-500" },
  { icon: Star, label: "Hệ thống XP", cls: "text-amber-500" },
  { icon: Heart, label: "Tim như game", cls: "text-rose-500" },
];

const levels = ["HSK 1", "HSK 2", "HSK 3", "HSK 4", "HSK 5", "HSK 6"];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary font-chinese text-base font-bold text-primary-foreground shadow-soft-primary">
              中
            </span>
            <span className="text-[17px] font-extrabold tracking-tight">
              DingDong <span className="text-primary">HSK</span>
            </span>
          </Link>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Đăng nhập
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="shadow-soft-primary">
                Bắt đầu miễn phí
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden hero-grid">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-b from-transparent to-background" />
        <div className="container relative grid items-center gap-12 py-16 lg:grid-cols-2 lg:py-24">
          {/* Left */}
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[13px] font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" /> HSK 1–6 + HSKK · Học bằng tiếng Việt
            </span>
            <h1 className="mt-5 text-[2.6rem] font-extrabold leading-[1.05] sm:text-6xl">
              Học tiếng Trung{" "}
              <span className="bg-gradient-to-r from-primary to-green-600 bg-clip-text text-transparent">
                dễ như trò chuyện
              </span>
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-muted-foreground">
              Nền tảng học tiếng Trung toàn diện cho người Việt: từ vựng, ngữ pháp, chữ Hán, đọc – nghe –
              viết – nói, được AI chấm điểm và đồng hành mỗi ngày.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/register">
                <Button size="lg" className="w-full shadow-soft-primary sm:w-auto">
                  Bắt đầu học miễn phí <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="w-full bg-background/70 sm:w-auto">
                  Tôi đã có tài khoản
                </Button>
              </Link>
            </div>
            <div className="mt-9 flex flex-wrap items-center gap-2.5">
              {trust.map((t) => (
                <span
                  key={t.label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card px-3 py-1.5 text-sm font-medium shadow-soft"
                >
                  <t.icon className={`h-4 w-4 ${t.cls}`} /> {t.label}
                </span>
              ))}
            </div>
          </div>

          {/* Right — linh vật bánh bao */}
          <div className="relative mx-auto w-full max-w-md">
            <BaoMascot />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold uppercase tracking-wider text-primary">Tính năng</p>
          <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">Đầy đủ mọi kỹ năng bạn cần</h2>
          <p className="mt-3 text-muted-foreground">
            Sáu module luyện tập bám sát đề thi HSK & HSKK, giao diện hoàn toàn bằng tiếng Việt.
          </p>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="group rounded-2xl border border-border/60 bg-card p-6 shadow-soft transition-all duration-200 hover:-translate-y-1 hover:shadow-soft-lg"
            >
              <div
                className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl text-2xl ring-1 ring-inset transition-transform duration-200 group-hover:scale-110 ${f.chip}`}
              >
                {f.icon}
              </div>
              <h3 className="mb-1.5 text-lg font-bold">{f.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HSK levels */}
      <section className="border-y border-border/60 bg-muted/40 py-20">
        <div className="container text-center">
          <h2 className="text-3xl font-extrabold sm:text-4xl">Lộ trình từ HSK 1 đến HSK 6</h2>
          <p className="mx-auto mt-3 max-w-md text-muted-foreground">
            Từ 150 từ cơ bản đến hơn 5000 từ vựng — đi cùng bạn suốt cả hành trình.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-2.5">
            {levels.map((l, i) => (
              <div
                key={l}
                className={`rounded-full px-6 py-2.5 text-sm font-bold transition-colors ${
                  i === 0
                    ? "bg-primary text-primary-foreground shadow-soft-primary"
                    : "border border-border bg-background text-foreground/70"
                }`}
              >
                {l}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container py-20">
        <div className="relative mx-auto max-w-3xl overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-green-800 px-8 py-14 text-center text-primary-foreground shadow-soft-lg sm:px-12">
          <span className="pointer-events-none absolute -right-6 -top-10 select-none font-chinese text-[160px] leading-none text-white/10">
            梦
          </span>
          <h2 className="relative z-10 text-3xl font-extrabold sm:text-4xl">Sẵn sàng chinh phục tiếng Trung?</h2>
          <p className="relative z-10 mx-auto mt-3 max-w-md text-primary-foreground/85">
            Tạo tài khoản miễn phí và bắt đầu bài học đầu tiên ngay hôm nay.
          </p>
          <Link href="/register" className="relative z-10 mt-7 inline-block">
            <Button size="lg" variant="secondary" className="shadow-lg">
              Đăng ký miễn phí ngay <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60 py-10">
        <div className="container flex flex-col items-center justify-between gap-4 text-sm text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary font-chinese text-xs font-bold text-primary-foreground">
              中
            </span>
            DingDong HSK
          </div>
          <p>© 2026 DingDong HSK · dingdong1405edu@gmail.com</p>
        </div>
      </footer>
    </div>
  );
}
