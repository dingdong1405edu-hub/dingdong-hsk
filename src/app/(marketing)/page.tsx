import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Headphones, PenLine, Mic, Star, Flame, Heart, ChevronRight } from "lucide-react";

const features = [
  {
    icon: "📚",
    title: "Từ vựng & Ngữ pháp",
    desc: "HSK 1-6, gamified như Duolingo với XP, streak, hearts. Pinyin tooltip tức thì.",
    color: "bg-blue-50",
  },
  {
    icon: "✍️",
    title: "Luyện viết chữ Hán",
    desc: "Stroke order animation, quiz vẽ từng nét, grid 田字格 như vở tập viết.",
    color: "bg-purple-50",
  },
  {
    icon: "📖",
    title: "Đọc hiểu",
    desc: "Đoạn văn tiếng Trung + pinyin overlay + click-to-lookup. Câu hỏi theo format HSK.",
    color: "bg-amber-50",
  },
  {
    icon: "🎧",
    title: "Nghe hiểu",
    desc: "Audio HSK chuẩn với speed control. Transcript unlock sau khi nộp.",
    color: "bg-teal-50",
  },
  {
    icon: "🖊️",
    title: "Luyện viết luận",
    desc: "AI Claude chấm ngữ pháp, từ vựng, mạch lạc. Bản sửa lỗi chi tiết.",
    color: "bg-rose-50",
  },
  {
    icon: "🎤",
    title: "Luyện nói HSKK",
    desc: "Ghi âm → Deepgram zh-CN → AI chấm phát âm, thanh điệu, lưu loát.",
    color: "bg-indigo-50",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl">
            <span className="text-2xl">🔔</span>
            <span className="text-primary">DingDong</span>
            <span className="text-muted-foreground font-normal text-sm">HSK</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm">Đăng nhập</Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Bắt đầu miễn phí</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 px-4 text-center bg-gradient-to-b from-red-50 to-white">
        <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
          🇨🇳 HSK 1-6 + HSKK
        </Badge>
        <h1 className="text-4xl sm:text-5xl font-bold mb-4 leading-tight">
          Học tiếng Trung<br />
          <span className="text-primary">chuẩn HSK như người bản ngữ</span>
        </h1>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-8">
          Từ vựng Duolingo-style • Luyện viết chữ Hán • AI chấm điểm viết & nói •
          Đọc hiểu + Nghe hiểu theo đúng format đề thi HSK
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/register">
            <Button size="lg" className="w-full sm:w-auto">
              Bắt đầu học ngay miễn phí
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline" className="w-full sm:w-auto">
              Đăng nhập
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-center gap-8 mt-12 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Flame className="h-4 w-4 text-orange-500" />
            <span>Streak hàng ngày</span>
          </div>
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 text-yellow-500" />
            <span>Hệ thống XP</span>
          </div>
          <div className="flex items-center gap-1">
            <Heart className="h-4 w-4 text-rose-500" />
            <span>Hearts game</span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 container">
        <h2 className="text-2xl font-bold text-center mb-10">Đầy đủ mọi kỹ năng bạn cần</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f) => (
            <Card key={f.title} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4 ${f.color}`}>
                  {f.icon}
                </div>
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* HSK levels */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container text-center">
          <h2 className="text-2xl font-bold mb-6">Từ HSK 1 đến HSK 6</h2>
          <div className="flex flex-wrap gap-3 justify-center">
            {["HSK 1", "HSK 2", "HSK 3", "HSK 4", "HSK 5", "HSK 6"].map((l, i) => (
              <div
                key={l}
                className={`px-6 py-3 rounded-full font-semibold text-sm ${
                  i === 0 ? "bg-primary text-white" : "bg-background border"
                }`}
              >
                {l}
              </div>
            ))}
          </div>
          <p className="text-muted-foreground text-sm mt-6">
            Lộ trình từ 150 từ cơ bản đến 5000+ từ vựng chuyên ngành
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 text-center">
        <h2 className="text-2xl font-bold mb-4">Sẵn sàng chinh phục tiếng Trung?</h2>
        <Link href="/register">
          <Button size="lg">Đăng ký miễn phí ngay</Button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        <p>© 2025 DingDong HSK · dingdong1405edu@gmail.com</p>
      </footer>
    </div>
  );
}
