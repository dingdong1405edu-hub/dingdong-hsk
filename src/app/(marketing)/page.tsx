import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Flame, Heart, ChevronRight, Sparkles } from "lucide-react";

const features = [
  {
    icon: "📚",
    title: "Từ vựng & Ngữ pháp",
    desc: "HSK 1–6, gamified như Duolingo với XP, streak, tim. Pinyin tooltip tức thì.",
    color: "bg-blue-50",
  },
  {
    icon: "✍️",
    title: "Luyện viết chữ Hán",
    desc: "Animation thứ tự nét bút, quiz vẽ từng nét, ô 田字格 như vở tập viết.",
    color: "bg-amber-50",
  },
  {
    icon: "📖",
    title: "Đọc hiểu",
    desc: "Đoạn văn tiếng Trung + pinyin overlay + nhấn để tra từ. Câu hỏi theo format HSK.",
    color: "bg-emerald-50",
  },
  {
    icon: "🎧",
    title: "Nghe hiểu",
    desc: "Audio HSK chuẩn với điều khiển tốc độ. Transcript mở khoá sau khi nộp.",
    color: "bg-teal-50",
  },
  {
    icon: "🖊️",
    title: "Luyện viết luận",
    desc: "AI chấm ngữ pháp, từ vựng, mạch lạc kèm bản sửa lỗi chi tiết.",
    color: "bg-rose-50",
  },
  {
    icon: "🎤",
    title: "Luyện nói HSKK",
    desc: "Ghi âm trực tiếp → AI chấm phát âm, thanh điệu và độ lưu loát.",
    color: "bg-indigo-50",
  },
];

const FLOATERS = [
  { t: "你好", p: "nǐ hǎo", cls: "left-6 top-10 rotate-[-6deg]" },
  { t: "学习", p: "xué xí", cls: "right-8 top-20 rotate-[5deg]" },
  { t: "中文", p: "zhōng wén", cls: "left-12 bottom-12 rotate-[3deg]" },
  { t: "加油", p: "jiā yóu", cls: "right-10 bottom-8 rotate-[-4deg]" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-2 text-lg font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-extrabold text-primary-foreground">
              中
            </span>
            <span className="text-primary">DingDong</span>
            <span className="text-sm font-normal text-muted-foreground">HSK</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Đăng nhập
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Bắt đầu miễn phí</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-rose-50 via-white to-white">
        <div className="container grid items-center gap-10 py-16 lg:grid-cols-2 lg:py-24">
          {/* Left */}
          <div>
            <Badge className="mb-4 border-primary/20 bg-primary/10 text-primary hover:bg-primary/15">
              <Sparkles className="mr-1 h-3.5 w-3.5" /> HSK 1–6 + HSKK · Học bằng tiếng Việt
            </Badge>
            <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl">
              Học tiếng Trung
              <br />
              <span className="text-primary">dễ như trò chuyện</span>
            </h1>
            <p className="mt-4 max-w-lg text-lg text-muted-foreground">
              Nền tảng học tiếng Trung toàn diện cho người Việt: từ vựng, ngữ pháp, chữ Hán, đọc – nghe –
              viết – nói, được AI chấm điểm và đồng hành mỗi ngày.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/register">
                <Button size="lg" className="w-full sm:w-auto">
                  Bắt đầu học ngay miễn phí <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Tôi đã có tài khoản
                </Button>
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Flame className="h-4 w-4 text-orange-500" /> Chuỗi ngày học
              </span>
              <span className="flex items-center gap-1.5">
                <Star className="h-4 w-4 text-amber-500" /> Hệ thống XP
              </span>
              <span className="flex items-center gap-1.5">
                <Heart className="h-4 w-4 text-rose-500" /> Tim như game
              </span>
            </div>
          </div>

          {/* Right — decorative Chinese panel */}
          <div className="relative">
            <div className="relative mx-auto aspect-square w-full max-w-md overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-red-700 shadow-2xl">
              <span className="absolute inset-0 flex select-none items-center justify-center font-chinese text-[260px] leading-none text-white/10">
                学
              </span>
              {FLOATERS.map((f) => (
                <div
                  key={f.t}
                  className={`absolute ${f.cls} rounded-2xl bg-white/95 px-4 py-2.5 text-center shadow-lg`}
                >
                  <div className="font-chinese text-2xl font-bold text-primary">{f.t}</div>
                  <div className="font-pinyin text-xs text-muted-foreground">{f.p}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container py-16">
        <h2 className="text-center text-2xl font-bold sm:text-3xl">Đầy đủ mọi kỹ năng bạn cần</h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-sm text-muted-foreground">
          Sáu module luyện tập bám sát đề thi HSK & HSKK, thiết kế giao diện hoàn toàn bằng tiếng Việt.
        </p>
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Card key={f.title} className="transition-shadow hover:shadow-md">
              <CardContent className="p-6">
                <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl text-2xl ${f.color}`}>
                  {f.icon}
                </div>
                <h3 className="mb-2 font-semibold">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* HSK levels */}
      <section className="bg-muted/30 py-16">
        <div className="container text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">Lộ trình từ HSK 1 đến HSK 6</h2>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {["HSK 1", "HSK 2", "HSK 3", "HSK 4", "HSK 5", "HSK 6"].map((l, i) => (
              <div
                key={l}
                className={`rounded-full px-6 py-3 text-sm font-semibold ${
                  i === 0 ? "bg-primary text-primary-foreground" : "border bg-background"
                }`}
              >
                {l}
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            Từ 150 từ cơ bản đến hơn 5000 từ vựng — đi cùng bạn suốt cả hành trình.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="container py-16 text-center">
        <div className="relative mx-auto max-w-2xl overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-red-700 p-10 text-primary-foreground">
          <span className="pointer-events-none absolute -right-4 -top-8 select-none font-chinese text-[140px] leading-none text-white/10">
            梦
          </span>
          <h2 className="relative z-10 text-2xl font-bold sm:text-3xl">Sẵn sàng chinh phục tiếng Trung?</h2>
          <p className="relative z-10 mx-auto mt-2 max-w-md text-sm text-primary-foreground/85">
            Tạo tài khoản miễn phí và bắt đầu bài học đầu tiên ngay hôm nay.
          </p>
          <Link href="/register" className="relative z-10 mt-6 inline-block">
            <Button size="lg" variant="secondary">
              Đăng ký miễn phí ngay
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        <p>© 2026 DingDong HSK · dingdong1405edu@gmail.com</p>
      </footer>
    </div>
  );
}
