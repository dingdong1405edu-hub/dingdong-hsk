import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, GraduationCap, Rocket, Sparkles } from "lucide-react";
import { auth } from "@/lib/auth";
import { BaoMascot } from "@/components/marketing/bao-mascot";
import { Logo } from "@/components/shared/logo";
import { Reveal } from "@/components/motion/reveal";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { MarketingNav } from "./_components/marketing-nav";
import { BackToTop } from "./_components/back-to-top";
import styles from "./landing.module.css";

export const metadata: Metadata = {
  title: "DingDong HSK — Học Tiếng Trung Cùng AI | Nền tảng học tiếng Trung cho người Việt",
  description:
    "Học tiếng Trung online cùng AI thông minh. Từ vựng, ngữ pháp, viết chữ Hán, đọc – nghe – viết – nói HSK 1–6 & HSKK, được AI chấm điểm. Lộ trình bằng tiếng Việt, bắt đầu miễn phí!",
  keywords: [
    "học tiếng Trung",
    "học tiếng Trung online",
    "app học tiếng Trung",
    "AI học tiếng Trung",
    "luyện thi HSK",
    "HSKK",
    "DingDong HSK",
  ],
  openGraph: {
    title: "DingDong HSK — Học Tiếng Trung Cùng AI Thông Minh",
    description:
      "Từ vựng, ngữ pháp, viết chữ Hán, đọc – nghe – viết – nói HSK 1–6 & HSKK, được AI chấm điểm. Bắt đầu miễn phí!",
    type: "website",
    locale: "vi_VN",
  },
};

const audiences = [
  { icon: "🎓", label: "Sinh viên" },
  { icon: "💼", label: "Người đi làm" },
  { icon: "✈️", label: "Du học sinh" },
  { icon: "🀄", label: "Người mất gốc" },
  { icon: "🏆", label: "Luyện thi HSK" },
];

const features = [
  {
    icon: "🤖",
    cls: styles.iconAi,
    title: "AI Chấm Điểm Thông Minh",
    desc: "Claude AI chấm bài viết luận & luyện nói: ngữ pháp, từ vựng, thanh điệu, độ lưu loát — kèm bản sửa lỗi chi tiết.",
  },
  {
    icon: "📚",
    cls: styles.iconVocab,
    title: "Từ Vựng & Ngữ Pháp",
    desc: "HSK 1–6 gamified như Duolingo: XP, streak, tim. Pinyin tooltip tức thì và tô màu thanh điệu trực quan.",
  },
  {
    icon: "✍️",
    cls: styles.iconWriting,
    title: "Chữ Cái, Phát Âm & Viết Chữ Hán",
    desc: "Học pinyin từ đầu bằng flashcard (thanh mẫu, vận mẫu, thanh điệu, âm dễ lẫn) cùng animation thứ tự nét bút trên ô 田字格.",
  },
  {
    icon: "🎙️",
    cls: styles.iconSpeaking,
    title: "Luyện Nói HSKK",
    desc: "Ghi âm ngay trên trình duyệt, AI phân tích phát âm, thanh điệu và độ lưu loát theo format HSKK 3 phần.",
  },
  {
    icon: "📖",
    cls: styles.iconHsk,
    title: "Đọc & Nghe Hiểu",
    desc: "Đoạn văn và audio chuẩn HSK, pinyin overlay, nhấn để tra từ, chấm tự động theo format đề thi thật.",
  },
  {
    icon: "🏆",
    cls: styles.iconCommunity,
    title: "Lộ Trình Thi HSK 1–6",
    desc: "Mở khoá bài học theo thứ tự, theo dõi tiến bộ và XP, đồng hành cùng bạn tới mục tiêu HSK mỗi ngày.",
  },
];

const stats = [
  { to: 6, suffix: "", label: "Cấp độ HSK" },
  { to: 5000, suffix: "+", label: "Từ vựng & mẫu câu" },
  { to: 6, suffix: "", label: "Module kỹ năng" },
  { to: 3, suffix: "", label: "Kỹ năng AI chấm điểm" },
];

const steps = [
  {
    n: 1,
    title: "Đăng Ký Miễn Phí",
    desc: "Tạo tài khoản trong 30 giây và chọn cấp độ HSK mục tiêu của bạn.",
  },
  {
    n: 2,
    title: "Học Theo Lộ Trình",
    desc: "Từ vựng, ngữ pháp, chữ Hán, đọc – nghe – viết – nói được sắp xếp khoa học mỗi ngày.",
  },
  {
    n: 3,
    title: "Luyện & Tiến Bộ",
    desc: "Làm bài AI chấm tự động, giữ chuỗi streak, theo dõi XP và chinh phục từng mốc HSK.",
  },
];

const levels = ["HSK 1", "HSK 2", "HSK 3", "HSK 4", "HSK 5", "HSK 6"];

const testimonials = [
  {
    text: "“Mình mất gốc tiếng Trung, nhờ lộ trình chia nhỏ và AI sửa lỗi bài viết mà sau 3 tháng đã tự tin nhắn tin với đối tác.”",
    name: "Minh Anh",
    role: "Nhân viên xuất nhập khẩu",
    initial: "M",
  },
  {
    text: "“Phần luyện nói HSKK chấm phát âm cực chi tiết, chỉ ra mình hay sai thanh 3. Giao diện dễ thương như đang chơi game vậy.”",
    name: "Hoàng Long",
    role: "Sinh viên năm 2",
    initial: "H",
  },
  {
    text: "“Tính năng viết chữ Hán theo từng nét giúp con mình nhớ mặt chữ nhanh hẳn. Cả nhà cùng học mỗi tối, vui lắm.”",
    name: "Thu Hà",
    role: "Phụ huynh",
    initial: "T",
  },
];

const footerColsBase = [
  {
    title: "Học tập",
    links: [
      { label: "Từ vựng & Ngữ pháp", href: "#features" },
      { label: "Viết chữ Hán", href: "#features" },
      { label: "Đọc & Nghe hiểu", href: "#features" },
      { label: "Viết luận & Luyện nói", href: "#features" },
    ],
  },
  {
    title: "Khám phá",
    links: [
      { label: "Tính năng", href: "#features" },
      { label: "Cách học", href: "#how" },
      { label: "Lộ trình HSK", href: "#levels" },
      { label: "Đánh giá", href: "#testimonials" },
      { label: "Giới thiệu", href: "/gioi-thieu" },
    ],
  },
];

const anchor = { scrollMarginTop: "96px" } as const;

export default async function LandingPage() {
  const session = await auth();
  const isAuthed = !!session?.user;
  const firstName = session?.user?.name?.trim().split(/\s+/).pop() ?? null;

  // CTA chính đổi đích theo trạng thái đăng nhập — đã đăng nhập thì vào thẳng
  // khu vực học, KHÔNG bắt đăng nhập lại.
  const primaryHref = isAuthed ? "/dashboard" : "/register";

  const footerCols = [
    ...footerColsBase,
    {
      title: "Tài khoản",
      links: isAuthed
        ? [
            { label: "Vào học", href: "/dashboard" },
            { label: "Hồ sơ của tôi", href: "/profile" },
            { label: "dingdong1405edu@gmail.com", href: "mailto:dingdong1405edu@gmail.com" },
          ]
        : [
            { label: "Đăng nhập", href: "/login" },
            { label: "Đăng ký miễn phí", href: "/register" },
            { label: "dingdong1405edu@gmail.com", href: "mailto:dingdong1405edu@gmail.com" },
          ],
    },
  ];

  return (
    <div className={styles.page}>
      <MarketingNav isAuthed={isAuthed} />

      {/* ============ HERO ============ */}
      <section className={styles.hero} id="hero" aria-labelledby="hero-title">
        <div className={styles.heroBgPattern} />
        <div className={styles.heroGridBg} />
        <div className={styles.heroContainer}>
          <div className={styles.heroContent}>
            <div className={styles.heroBadge}>
              <span className={styles.dot} />
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />{" "}
              {isAuthed
                ? firstName
                  ? `Chào mừng trở lại, ${firstName}!`
                  : "Chào mừng trở lại!"
                : "Học cùng AI thông minh"}
            </div>
            <h1 id="hero-title" className={styles.heroTitle}>
              Học Tiếng Trung<br />
              Cùng AI Thông Minh<br />
              <span className={styles.highlight}>Dễ Như Ăn Bánh Bao!</span>
            </h1>
            <p className={styles.heroDesc}>
              DingDong HSK — nền tảng học tiếng Trung toàn diện cho người Việt. Từ vựng, ngữ pháp, chữ
              Hán, đọc – nghe – viết – nói HSK 1–6 &amp; HSKK, được AI chấm điểm và đồng hành mỗi ngày.
            </p>
            <div className={styles.heroButtons}>
              {isAuthed ? (
                <Link href="/dashboard" className={`${styles.btn} ${styles.btnPrimary}`}>
                  <GraduationCap className="h-[18px] w-[18px]" aria-hidden="true" /> Vào học ngay
                </Link>
              ) : (
                <Link href="/register" className={`${styles.btn} ${styles.btnPrimary}`}>
                  <Rocket className="h-[18px] w-[18px]" aria-hidden="true" /> Bắt đầu miễn phí
                </Link>
              )}
              <a href="#features" className={`${styles.btn} ${styles.btnSecondary}`}>
                Khám phá tính năng <ArrowRight className="h-[18px] w-[18px]" aria-hidden="true" />
              </a>
            </div>
            <div className={styles.heroStatsRow}>
              <div className={styles.heroStatItem}>
                <div className={styles.heroStatNum}>HSK 1–6</div>
                <div className={styles.heroStatLbl}>+ HSKK</div>
              </div>
              <div className={styles.heroStatItem}>
                <div className={styles.heroStatNum}>6</div>
                <div className={styles.heroStatLbl}>Kỹ năng</div>
              </div>
              <div className={styles.heroStatItem}>
                <div className={styles.heroStatNum}>5000+</div>
                <div className={styles.heroStatLbl}>Từ vựng</div>
              </div>
            </div>
          </div>

          <div className={styles.heroVisual}>
            <div className={styles.heroVisualInner}>
              <BaoMascot transparent />
            </div>
          </div>
        </div>
      </section>

      {/* ============ AUDIENCE STRIP ============ */}
      <section className={styles.trusted} aria-label="Phù hợp với">
        <div className={styles.container}>
          <div className={styles.trustedLabel}>Phù hợp với mọi người học tiếng Trung</div>
          <div className={styles.trustedLogos}>
            {audiences.map((a) => (
              <span key={a.label} className={styles.trustedLogo}>
                <span aria-hidden>{a.icon}</span> {a.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ============ FEATURES ============ */}
      <section className={styles.section} id="features" style={anchor} aria-labelledby="features-title">
        <div className={styles.container}>
          <Reveal>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionLabel}>✨ Tính năng nổi bật</div>
              <h2 id="features-title" className={styles.sectionTitle}>
                Học Tiếng Trung Chưa Bao Giờ Dễ Đến Thế!
              </h2>
              <p className={styles.sectionSubtitle}>
                Sáu module luyện tập bám sát đề thi HSK &amp; HSKK, kết hợp AI thông minh — tất cả bằng
                tiếng Việt.
              </p>
            </div>
          </Reveal>
          <div className={styles.featuresGrid}>
            {features.map((f, i) => (
              <Reveal key={f.title} delay={(i % 3) * 0.08} className="h-full">
                <Link
                  href={primaryHref}
                  className={styles.featureCard}
                  aria-label={isAuthed ? `${f.title} — vào học` : `${f.title} — bắt đầu học miễn phí`}
                >
                  <div className={`${styles.featureIcon} ${f.cls}`} aria-hidden>
                    {f.icon}
                  </div>
                  <h3>{f.title}</h3>
                  <p>{f.desc}</p>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============ STATS BAND ============ */}
      <section className={styles.statsSection} aria-label="Thống kê">
        <div className={styles.container}>
          <div className={styles.statsGrid}>
            {stats.map((s) => (
              <Reveal key={s.label}>
                <div className={styles.statItem}>
                  <div className={styles.statNum}>
                    <AnimatedNumber value={s.to} />
                    {s.suffix}
                  </div>
                  <div className={styles.statLbl}>{s.label}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section className={styles.sectionCream} id="how" style={anchor} aria-labelledby="how-title">
        <div className={styles.container}>
          <Reveal>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionLabel}>🎯 Cách thức hoạt động</div>
              <h2 id="how-title" className={styles.sectionTitle}>
                3 Bước Đơn Giản Để Bắt Đầu
              </h2>
              <p className={styles.sectionSubtitle}>
                Lộ trình học được cá nhân hoá cho từng người, từ con số 0 đến HSK 6.
              </p>
            </div>
          </Reveal>
          <div className={styles.stepsGrid}>
            {steps.map((s, i) => (
              <Reveal key={s.n} delay={i * 0.1} className="h-full">
                <div className={styles.stepCard}>
                  <div className={styles.stepNumber}>{s.n}</div>
                  <h3>{s.title}</h3>
                  <p>{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============ LEVELS ============ */}
      <section className={styles.section} id="levels" style={anchor} aria-labelledby="levels-title">
        <div className={styles.container}>
          <Reveal>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionLabel}>📈 Lộ trình</div>
              <h2 id="levels-title" className={styles.sectionTitle}>
                Từ HSK 1 Đến HSK 6
              </h2>
              <p className={styles.sectionSubtitle}>
                Từ 150 từ cơ bản đến hơn 5000 từ vựng — DingDong đi cùng bạn suốt cả hành trình.
              </p>
            </div>
          </Reveal>
          <Reveal>
            <div className="flex flex-wrap justify-center gap-3">
              {levels.map((l, i) => (
                <span
                  key={l}
                  className="rounded-full px-7 py-3 text-[15px] font-extrabold transition-transform duration-200 hover:-translate-y-1"
                  style={
                    i === 0
                      ? { background: "var(--green)", color: "#fff", boxShadow: "0 8px 24px rgba(93,119,64,0.35)" }
                      : { background: "#fff", color: "var(--green)", border: "2px solid rgba(93,119,64,0.25)" }
                  }
                >
                  {l}
                </span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ TESTIMONIALS ============ */}
      <section
        className={styles.sectionCream}
        id="testimonials"
        style={anchor}
        aria-labelledby="testimonials-title"
      >
        <div className={styles.container}>
          <Reveal>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionLabel}>💬 Cảm nhận học viên</div>
              <h2 id="testimonials-title" className={styles.sectionTitle}>
                Người Học Nói Gì Về DingDong HSK
              </h2>
              <p className={styles.sectionSubtitle}>
                Những chia sẻ từ người học đang đồng hành cùng DingDong trên hành trình chinh phục HSK.
              </p>
            </div>
          </Reveal>
          <div className={styles.testimonialsGrid}>
            {testimonials.map((t, i) => (
              <Reveal key={t.name} delay={i * 0.1} className="h-full">
                <article className={styles.testimonialCard}>
                  <div className={styles.stars} aria-label="5 trên 5 sao">
                    ★★★★★
                  </div>
                  <p className={styles.testimonialText}>{t.text}</p>
                  <div className={styles.testimonialAuthor}>
                    <div className={styles.testimonialAvatar} aria-hidden>
                      {t.initial}
                    </div>
                    <div>
                      <div className={styles.testimonialName}>{t.name}</div>
                      <div className={styles.testimonialRole}>{t.role}</div>
                    </div>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============ CTA ============ */}
      <section className={styles.cta} id="cta" aria-labelledby="cta-title">
        <div className={styles.container}>
          <Reveal>
            <div className={styles.ctaContent}>
              {isAuthed ? (
                <>
                  <h2 id="cta-title">Tiếp Tục Hành Trình Của Bạn!</h2>
                  <p>Quay lại bài học, giữ vững chuỗi streak và chinh phục mốc HSK tiếp theo cùng DingDong.</p>
                  <Link href="/dashboard" className={styles.btnWhite}>
                    <GraduationCap className="h-[18px] w-[18px]" aria-hidden="true" /> Vào học ngay
                  </Link>
                </>
              ) : (
                <>
                  <h2 id="cta-title">Sẵn Sàng Chinh Phục Tiếng Trung?</h2>
                  <p>Tạo tài khoản miễn phí và bắt đầu bài học đầu tiên cùng DingDong ngay hôm nay.</p>
                  <Link href="/register" className={styles.btnWhite}>
                    <Rocket className="h-[18px] w-[18px]" aria-hidden="true" /> Đăng ký miễn phí ngay
                  </Link>
                </>
              )}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className={styles.footer}>
        <div className={styles.container}>
          <div className={styles.footerGrid}>
            <div className={styles.footerBrand}>
              <Link href="/" className={styles.footerLogo} aria-label="DingDong HSK — về trang chủ">
                <Logo className={styles.footerLogoIcon} />
                DingDong HSK
              </Link>
              <p>
                Nền tảng học tiếng Trung chuẩn HSK 1–6 &amp; HSKK cho người Việt, được AI chấm điểm và
                đồng hành mỗi ngày.
              </p>
            </div>
            {footerCols.map((col) => (
              <div key={col.title}>
                <h4>{col.title}</h4>
                <ul className={styles.footerLinks}>
                  {col.links.map((l) => (
                    <li key={l.label}>
                      {l.href.startsWith("/") ? (
                        <Link href={l.href}>{l.label}</Link>
                      ) : (
                        <a href={l.href}>{l.label}</a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className={styles.footerBottom}>
            © 2026 DingDong HSK · Học tiếng Trung cùng AI · dingdong1405edu@gmail.com
          </div>
        </div>
      </footer>

      <BackToTop />
    </div>
  );
}
