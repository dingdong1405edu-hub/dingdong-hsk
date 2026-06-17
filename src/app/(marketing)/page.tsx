import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Star, Flame, Heart, ChevronRight, Sparkles } from "lucide-react";
import { BaoMascot } from "@/components/marketing/bao-mascot";
import { Reveal } from "@/components/motion/reveal";
import { Ambient } from "@/components/motion/ambient";
import { AnimatedNumber } from "@/components/motion/animated-number";

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

const stats = [
  { to: 5000, suffix: "+", label: "Từ vựng HSK 1–6" },
  { to: 6, suffix: "", label: "Cấp độ + HSKK" },
  { to: 3, suffix: "", label: "Kỹ năng được AI chấm" },
];

const floatHanzi = [
  { c: "学", cls: "left-[6%] top-[15%] text-7xl", anim: "animate-hanzi" },
  { c: "你", cls: "right-[9%] top-[26%] text-6xl", anim: "animate-float-y" },
  { c: "好", cls: "left-[13%] bottom-[16%] text-6xl", anim: "animate-float-y2" },
  { c: "中", cls: "right-[6%] bottom-[24%] text-7xl", anim: "animate-drift" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-xl">
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
            <Link href="/login" className="hidden sm:block">
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

      {/* Hero — fully green section */}
      <section className="relative overflow-hidden text-white">
        <div className="absolute inset-0 hero-green" />
        <Ambient variant="glow" />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
        {floatHanzi.map((f) => (
          <span
            key={f.c}
            className={`pointer-events-none absolute hidden select-none font-chinese text-white/10 md:block ${f.cls} ${f.anim}`}
          >
            {f.c}
          </span>
        ))}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-background" />

        <div className="container relative grid items-center gap-10 py-14 sm:py-16 lg:grid-cols-2 lg:gap-12 lg:py-24">
          {/* Left */}
          <div className="text-center lg:text-left">
            <span
              className="animate-fade-up inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-3 py-1 text-[13px] font-semibold text-white backdrop-blur"
              style={{ animationDelay: "0s" }}
            >
              <Sparkles className="h-3.5 w-3.5" /> HSK 1–6 + HSKK · Học bằng tiếng Việt
            </span>
            <h1
              className="animate-fade-up mt-5 text-4xl font-extrabold leading-[1.08] sm:text-5xl lg:text-6xl"
              style={{ animationDelay: "0.08s" }}
            >
              Học tiếng Trung{" "}
              <span className="text-gradient-mint">dễ như trò chuyện</span>
            </h1>
            <p
              className="animate-fade-up mx-auto mt-5 max-w-lg text-base leading-relaxed text-white/85 sm:text-lg lg:mx-0"
              style={{ animationDelay: "0.16s" }}
            >
              Nền tảng học tiếng Trung toàn diện cho người Việt: từ vựng, ngữ pháp, chữ Hán, đọc – nghe –
              viết – nói, được AI chấm điểm và đồng hành mỗi ngày.
            </p>
            <div
              className="animate-fade-up mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start"
              style={{ animationDelay: "0.24s" }}
            >
              <Link href="/register" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="sheen w-full bg-white text-primary shadow-soft-lg hover:bg-white sm:w-auto"
                >
                  Bắt đầu học miễn phí <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full border-white/40 bg-white/10 text-white backdrop-blur hover:border-white/60 hover:bg-white/20 hover:text-white sm:w-auto"
                >
                  Tôi đã có tài khoản
                </Button>
              </Link>
            </div>
            <div
              className="animate-fade-up mt-9 flex flex-wrap items-center justify-center gap-2.5 lg:justify-start"
              style={{ animationDelay: "0.32s" }}
            >
              {trust.map((t) => (
                <span
                  key={t.label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3 py-1.5 text-sm font-medium text-white backdrop-blur"
                >
                  <t.icon className={`h-4 w-4 ${t.cls}`} /> {t.label}
                </span>
              ))}
            </div>
          </div>

          {/* Right — chỉ linh vật bánh bao (nền trong suốt) */}
          <div
            className="animate-fade-up relative mx-auto w-full max-w-[17rem] sm:max-w-sm lg:max-w-md"
            style={{ animationDelay: "0.2s" }}
          >
            <div className="animate-breathe absolute inset-8 -z-10 rounded-full bg-white/20 blur-3xl" />
            <BaoMascot transparent />
          </div>
        </div>
      </section>

      {/* Stats band */}
      <section className="border-y border-border/60 bg-muted/30">
        <div className="container grid grid-cols-3 gap-4 py-10 text-center">
          {stats.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.1}>
              <div className="text-3xl font-extrabold text-primary sm:text-4xl">
                <AnimatedNumber value={s.to} />
                {s.suffix}
              </div>
              <div className="mt-1 text-xs text-muted-foreground sm:text-sm">{s.label}</div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="relative overflow-hidden py-20">
        <div className="peaceful-bg absolute inset-0" />
        <div className="container relative">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-wider text-primary">Tính năng</p>
            <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">Đầy đủ mọi kỹ năng bạn cần</h2>
            <p className="mt-3 text-muted-foreground">
              Sáu module luyện tập bám sát đề thi HSK & HSKK, giao diện hoàn toàn bằng tiếng Việt.
            </p>
          </Reveal>
          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <Reveal key={f.title} delay={(i % 3) * 0.08}>
                <div className="group h-full rounded-2xl border border-border/60 bg-card/90 p-6 shadow-soft backdrop-blur transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/30 hover:shadow-soft-lg">
                  <div
                    className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl text-2xl ring-1 ring-inset transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110 ${f.chip}`}
                  >
                    {f.icon}
                  </div>
                  <h3 className="mb-1.5 text-lg font-bold transition-colors group-hover:text-primary">{f.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* HSK levels */}
      <section className="relative overflow-hidden border-y border-border/60 bg-gradient-to-b from-green-50/70 to-background py-20">
        <div className="container relative text-center">
          <Reveal>
            <h2 className="text-3xl font-extrabold sm:text-4xl">Lộ trình từ HSK 1 đến HSK 6</h2>
            <p className="mx-auto mt-3 max-w-md text-muted-foreground">
              Từ 150 từ cơ bản đến hơn 5000 từ vựng — đi cùng bạn suốt cả hành trình.
            </p>
          </Reveal>
          <div className="mt-8 flex flex-wrap justify-center gap-2.5">
            {levels.map((l, i) => (
              <Reveal key={l} delay={i * 0.06}>
                <div
                  className={`rounded-full px-6 py-2.5 text-sm font-bold transition-all duration-200 hover:-translate-y-0.5 ${
                    i === 0
                      ? "bg-primary text-primary-foreground shadow-soft-primary"
                      : "border border-border bg-background text-foreground/70 hover:border-primary/40 hover:text-primary"
                  }`}
                >
                  {l}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container py-20">
        <Reveal>
          <div className="relative mx-auto max-w-3xl overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-green-800 px-8 py-14 text-center text-primary-foreground shadow-soft-lg sm:px-12">
            <Ambient variant="calm" className="opacity-70" />
            <span className="pointer-events-none absolute -right-6 -top-10 select-none font-chinese text-[160px] leading-none text-white/10">
              梦
            </span>
            <h2 className="relative z-10 text-3xl font-extrabold sm:text-4xl">Sẵn sàng chinh phục tiếng Trung?</h2>
            <p className="relative z-10 mx-auto mt-3 max-w-md text-primary-foreground/85">
              Tạo tài khoản miễn phí và bắt đầu bài học đầu tiên ngay hôm nay.
            </p>
            <Link href="/register" className="relative z-10 mt-7 inline-block">
              <Button size="lg" variant="secondary" className="sheen shadow-lg">
                Đăng ký miễn phí ngay <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </Reveal>
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
