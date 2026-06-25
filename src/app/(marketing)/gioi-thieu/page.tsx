import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, GraduationCap, Rocket, Sparkles } from "lucide-react";
import { auth } from "@/lib/auth";
import { BaoMascot } from "@/components/marketing/bao-mascot";
import { Logo } from "@/components/shared/logo";
import { Reveal } from "@/components/motion/reveal";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { MarketingNav } from "../_components/marketing-nav";
import { BackToTop } from "../_components/back-to-top";
import styles from "../landing.module.css";

export const metadata: Metadata = {
  title: "Giới thiệu — DingDong HSK | Nền tảng học tiếng Trung cùng AI cho người Việt",
  description:
    "Câu chuyện, thành tích và người sáng lập DingDong HSK — nền tảng học tiếng Trung HSK 1–6 & HSKK cho người Việt: 6 module kỹ năng, 5000+ từ vựng & mẫu câu, được AI Claude chấm điểm.",
  alternates: { canonical: "/gioi-thieu" },
  openGraph: {
    title: "Giới thiệu DingDong HSK — Học tiếng Trung cùng AI",
    description:
      "Sứ mệnh, thành tích và người đứng sau nền tảng học tiếng Trung HSK 1–6 & HSKK được AI chấm điểm cho người Việt.",
    type: "website",
    locale: "vi_VN",
  },
};

// Đối tượng người học
const audiences = [
  { icon: "🎓", label: "Sinh viên" },
  { icon: "💼", label: "Người đi làm" },
  { icon: "✈️", label: "Du học sinh" },
  { icon: "🀄", label: "Người mất gốc" },
  { icon: "🏆", label: "Luyện thi HSK" },
];

// Nỗi đau người học (cột trái)
const painPoints = [
  "Tài liệu rời rạc, toàn tiếng Anh hoặc tiếng Trung — khó cho người mới mất gốc.",
  "Viết luận, luyện nói mà không ai sửa; chẳng biết mình sai thanh điệu hay ngữ pháp ở đâu.",
  "Chữ Hán khó nhớ vì học vẹt, không nắm được thứ tự nét.",
  "Học vài hôm là nản, dễ bỏ vì không thấy mình tiến bộ mỗi ngày.",
];

// Giải pháp (cột phải)
const solutions = [
  "Lộ trình HSK 1–6 bằng tiếng Việt, chia nhỏ dễ tiêu hoá — học như chơi.",
  "AI Claude chấm bài viết & luyện nói, chỉ rõ lỗi ngữ pháp, từ vựng, thanh điệu kèm bản sửa.",
  "Viết chữ Hán theo từng nét trên ô 田字格, có animation thứ tự nét chuẩn.",
  "XP, streak, tim và chú bánh bao đồng hành — giữ lửa cho bạn mỗi ngày.",
];

// 4 giá trị cốt lõi — tái dùng featureCard + tint có sẵn
const values = [
  {
    icon: "🤖",
    cls: styles.iconAi,
    title: "Học Cùng AI Thật Sự",
    desc: "AI Claude không chỉ chấm đúng/sai — nó giải thích vì sao bạn sai và sửa lại cho đúng, như một gia sư kiên nhẫn luôn ở bên.",
  },
  {
    icon: "🇻🇳",
    cls: styles.iconHsk,
    title: "100% Tiếng Việt, Vì Người Việt",
    desc: "Mọi giải thích, mọi mẹo học đều bằng tiếng Việt tự nhiên, lưu ý đúng những lỗi người Việt hay mắc — như nhầm thanh 3 với thanh 4.",
  },
  {
    icon: "🥟",
    cls: styles.iconCommunity,
    title: "Nhẹ Nhàng & Vui Mỗi Ngày",
    desc: "Giao diện ấm áp như tiệm bánh bao, chú linh vật dễ thương, XP và streak biến việc học thành thói quen chứ không phải áp lực.",
  },
  {
    icon: "🎯",
    cls: styles.iconWriting,
    title: "Bám Sát Đề Thi Thật",
    desc: "Từ vựng, đọc, nghe, viết, nói đều theo đúng format HSK 1–6 & HSKK — bạn luyện đúng thứ sẽ gặp trong phòng thi.",
  },
];

// SỐ LIỆU SẢN PHẨM THẬT — đừng bịa số người dùng.
const stats = [
  { to: 6, suffix: "", label: "Cấp độ HSK 1–6" },
  { to: 5000, suffix: "+", label: "Từ vựng & mẫu câu" },
  { to: 6, suffix: "", label: "Module kỹ năng" },
  { to: 3, suffix: "", label: "Kỹ năng được AI chấm" },
];

// CỘT MỐC — MẪU: chủ DingDong tự chỉnh năm & nội dung.
const milestones = [
  {
    year: "2025",
    tag: "Khởi nguồn",
    title: "Một Ý Tưởng Nhỏ Trên Trang Giấy",
    desc: "Từ chính trải nghiệm tự học tiếng Trung của người sáng lập, ý tưởng về một nền tảng “học mà ấm áp” cho người Việt ra đời.",
    sample: true,
  },
  {
    year: "2026",
    tag: "Nền móng",
    title: "Hoàn Thiện 6 Module Kỹ Năng",
    desc: "Từ vựng, chữ Hán, đọc, nghe, viết, nói được dựng xong với lộ trình HSK 1–6 bằng tiếng Việt.",
    sample: true,
  },
  {
    year: "2026",
    tag: "Trí tuệ",
    title: "Đưa AI Vào Chấm Bài Viết & Luyện Nói",
    desc: "Tích hợp Claude AI chấm ngữ pháp, từ vựng, thanh điệu và độ lưu loát — phản hồi tức thì kèm bản sửa lỗi.",
    sample: true,
  },
  {
    year: "Mục tiêu",
    tag: "Lớn lên",
    title: "Đồng Hành Cùng 10.000+ Người Học",
    desc: "Mục tiêu của DingDong: đồng hành cùng hơn mười nghìn người Việt chinh phục tiếng Trung trong chặng tiếp theo.",
    sample: true,
    target: true,
  },
];

// ====== NỘI DUNG MẪU — DỄ CHỈNH SỬA (sửa object `founder` ở đây) ======
// Thay tên, ảnh, chức danh, câu trích và 2 đoạn tiểu sử bằng thông tin thật.
const founder = {
  initial: "A", // MẪU — khi có ảnh thật, thay khối .founderAvatar bằng <Image>/<img object-fit:cover>
  name: "Nguyễn Văn A", // MẪU
  role: "Người sáng lập & Chủ biên nội dung — DingDong HSK", // MẪU
  tags: ["🏆 HSK 6", "📚 8 năm học & dạy tiếng Trung", "💻 Mê công nghệ giáo dục"], // MẪU
  quote:
    "“Mình từng học tiếng Trung trong cô đơn và bỏ cuộc không biết bao nhiêu lần. DingDong là món quà mình gửi cho chính mình của ngày xưa — và cho bất cứ ai đang thấy tiếng Trung thật khó.”", // MẪU
  bioParas: [
    "Xin chào, mình là [Tên người sáng lập]. Mình bắt đầu học tiếng Trung từ con số 0 và hiểu rõ cảm giác choáng ngợp khi đứng trước hàng nghìn chữ Hán cùng bốn thanh điệu khó nhằn. Học chữ rồi quên, nói thì sợ sai, luyện thi HSK mà chẳng biết mình yếu ở đâu — chính những năm “tự bơi” ấy dạy mình rằng việc học cần một lộ trình tử tế và một người đồng hành kiên nhẫn.", // MẪU
    "Vì thế mình gói tất cả những gì mình ước có ngày xưa vào DingDong HSK: nội dung tiếng Việt gần gũi, AI chấm bài tận tình, và một chú bánh bao dễ thương để bạn luôn mỉm cười khi học. Cảm ơn bạn đã ghé thăm câu chuyện của DingDong — hẹn gặp bạn trong bài học đầu tiên nhé, dễ như ăn một chiếc bánh bao nóng hổi!", // MẪU
  ],
  sign: "— A, với tất cả yêu thương 🥟", // MẪU
};

const footerColsBase = [
  {
    title: "Học tập",
    links: [
      { label: "Từ vựng & Ngữ pháp", href: "/#features" },
      { label: "Viết chữ Hán", href: "/#features" },
      { label: "Đọc & Nghe hiểu", href: "/#features" },
      { label: "Viết luận & Luyện nói", href: "/#features" },
    ],
  },
  {
    title: "Khám phá",
    links: [
      { label: "Tính năng", href: "/#features" },
      { label: "Cách học", href: "/#how" },
      { label: "Lộ trình HSK", href: "/#levels" },
      { label: "Giới thiệu", href: "/gioi-thieu" },
    ],
  },
];

const anchor = { scrollMarginTop: "96px" } as const;

export default async function AboutPage() {
  const session = await auth();
  const isAuthed = !!session?.user;
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

      {/* ============ HERO GIỚI THIỆU ============ */}
      <section
        className={`${styles.hero} ${styles.heroAbout}`}
        id="gioi-thieu-hero"
        aria-labelledby="gioi-thieu-hero-title"
      >
        <div className={styles.heroBgPattern} />
        <div className={styles.heroGridBg} />
        <div className={styles.heroContainer}>
          <div className={styles.heroContent}>
            <div className={styles.heroBadge}>
              <span className={styles.dot} />
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Câu chuyện DingDong HSK
            </div>
            <h1 id="gioi-thieu-hero-title" className={styles.heroTitle}>
              Học Tiếng Trung Cho Người Việt —<br />
              Tử Tế, Thông Minh &amp;<br />
              <span className={styles.highlight}>Ấm Như Bánh Bao</span>
            </h1>
            <p className={styles.heroDesc}>
              DingDong HSK là nền tảng học tiếng Trung toàn diện, thiết kế riêng cho người Việt. Một
              nơi duy nhất để học từ vựng, ngữ pháp, viết chữ Hán và luyện đọc – nghe – viết – nói
              theo chuẩn HSK 1–6 &amp; HSKK — có AI đồng hành và chấm điểm mỗi ngày.
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
              <a href="#cau-chuyen" className={`${styles.btn} ${styles.btnSecondary}`}>
                Đọc câu chuyện của DingDong <ArrowRight className="h-[18px] w-[18px]" aria-hidden="true" />
              </a>
            </div>
            <div className={styles.aboutHeroChips}>
              <span className={styles.aboutHeroChipsLabel}>Được tạo ra cho:</span>
              {audiences.map((a) => (
                <span key={a.label} className={styles.aboutChip}>
                  <span aria-hidden>{a.icon}</span> {a.label}
                </span>
              ))}
            </div>
          </div>

          <div className={styles.heroVisual}>
            <div className={styles.heroVisualInner}>
              <BaoMascot transparent />
            </div>
          </div>
        </div>
      </section>

      {/* ============ DINGDONG LÀ GÌ (vấn đề → giải pháp) ============ */}
      <section className={styles.section} id="cau-chuyen" style={anchor} aria-labelledby="cau-chuyen-title">
        <div className={styles.container}>
          <Reveal>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionLabel}>📖 DingDong HSK là gì?</div>
              <h2 id="cau-chuyen-title" className={styles.sectionTitle}>
                Một Nền Tảng, Trọn Hành Trình Tiếng Trung
              </h2>
              <p className={styles.sectionSubtitle}>
                Không còn cảnh nhảy giữa năm app khác nhau. Tất cả những gì người Việt cần để chinh
                phục HSK, gói gọn trong một nơi ấm áp và dễ thương.
              </p>
            </div>
          </Reveal>

          <Reveal>
            <p className={`${styles.aboutProse} ${styles.aboutProseLead}`}>
              Cái tên “DingDong” là tiếng chuông lảnh lót báo một điều vui sắp đến, còn chú bánh bao
              mũm mĩm là lời nhắc rằng học tiếng Trung có thể ấm áp và “dễ như ăn bánh bao”. DingDong
              ra đời để bạn không bao giờ phải học một mình nữa.
            </p>
          </Reveal>

          <div className={styles.aboutSplit}>
            <Reveal className="h-full">
              <div className={`${styles.aboutSplitCard} ${styles.aboutSplitProblem}`}>
                <h3>Học Tiếng Trung Kiểu Cũ Thật Mệt</h3>
                <ul className={styles.aboutList}>
                  {painPoints.map((p) => (
                    <li key={p}>
                      <span aria-hidden>😮‍💨</span> {p}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
            <Reveal delay={0.1} className="h-full">
              <div className={`${styles.aboutSplitCard} ${styles.aboutSplitSolution}`}>
                <h3>Với DingDong Thì Khác</h3>
                <ul className={styles.aboutList}>
                  {solutions.map((s) => (
                    <li key={s}>
                      <span aria-hidden>✅</span> {s}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ============ GIÁ TRỊ CỐT LÕI ============ */}
      <section className={styles.sectionCream} id="gia-tri" style={anchor} aria-labelledby="gia-tri-title">
        <div className={styles.container}>
          <Reveal>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionLabel}>💛 Giá trị cốt lõi</div>
              <h2 id="gia-tri-title" className={styles.sectionTitle}>
                Điều Khiến DingDong Khác Biệt
              </h2>
              <p className={styles.sectionSubtitle}>
                Bốn nguyên tắc định hình mọi bài học, mọi dòng phản hồi và mọi nét vẽ bánh bao trên
                DingDong HSK.
              </p>
            </div>
          </Reveal>
          <div className={styles.featuresGrid}>
            {values.map((v, i) => (
              <Reveal key={v.title} delay={(i % 3) * 0.08} className="h-full">
                <article className={styles.featureCard}>
                  <div className={`${styles.featureIcon} ${v.cls}`} aria-hidden>
                    {v.icon}
                  </div>
                  <h3>{v.title}</h3>
                  <p>{v.desc}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============ THÀNH TÍCH — DẢI SỐ LIỆU THẬT ============ */}
      {/* SỐ LIỆU SẢN PHẨM THẬT — đừng bịa số người dùng. */}
      <section className={styles.statsSection} aria-label="Những con số của DingDong">
        <div className={styles.container}>
          <Reveal>
            <h2 className={styles.statsBandHeading}>Những Con Số Làm Nên DingDong HSK</h2>
          </Reveal>
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
          <Reveal>
            <p className={styles.statsBandNote}>
              Viết · Nói được Claude AI chấm chi tiết — Đọc · Nghe chấm tự động theo đề HSK thật.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ============ THÀNH TÍCH — TIMELINE CỘT MỐC (MẪU) ============ */}
      <section className={styles.section} id="thanh-tich" style={anchor} aria-labelledby="thanh-tich-title">
        <div className={styles.container}>
          <Reveal>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionLabel}>🏆 Cột mốc &amp; thành tích</div>
              <h2 id="thanh-tich-title" className={styles.sectionTitle}>
                Hành Trình DingDong HSK
              </h2>
              <p className={styles.sectionSubtitle}>
                Những dấu mốc trên chặng đường xây một nền tảng học tiếng Trung tử tế cho người Việt.
              </p>
              <p className={styles.editNote}>
                📝 Mục này gồm các cột mốc mẫu — chủ DingDong có thể chỉnh sửa năm và nội dung cho
                khớp thực tế.
              </p>
            </div>
          </Reveal>
          <div className={styles.aboutTimeline}>
            {milestones.map((m, i) => (
              <Reveal key={m.title} delay={i * 0.08}>
                <div className={styles.timelineCard}>
                  <div className={styles.timelineYear}>
                    {m.year}
                    <span>{m.tag}</span>
                  </div>
                  <div>
                    <h3>
                      {m.title}
                      {m.sample && (
                        <span className={styles.sampleBadge}>{m.target ? "Mục tiêu" : "mẫu"}</span>
                      )}
                    </h3>
                    <p>{m.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============ NGƯỜI SÁNG LẬP ============ */}
      {/* ====== NỘI DUNG MẪU — DỄ CHỈNH SỬA (sửa object `founder` ở đầu file) ====== */}
      <section
        className={styles.sectionCream}
        id="nguoi-sang-lap"
        style={anchor}
        aria-labelledby="nguoi-sang-lap-title"
      >
        <div className={styles.container}>
          <Reveal>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionLabel}>👋 Người sáng lập</div>
              <h2 id="nguoi-sang-lap-title" className={styles.sectionTitle}>
                Người Đứng Sau Chú Bánh Bao
              </h2>
              <p className={styles.sectionSubtitle}>
                Một người Việt từng tự học tiếng Trung, nay muốn con đường ấy nhẹ nhàng hơn cho những
                người đi sau.
              </p>
              <p className={styles.editNote}>
                📝 Phần này đang dùng nội dung mẫu. Chủ DingDong vui lòng thay tên, ảnh, chức danh và
                phần giới thiệu thật của mình.
              </p>
            </div>
          </Reveal>
          <Reveal>
            <div className={styles.founderCard}>
              <aside className={styles.founderAside}>
                <div className={styles.founderAvatar} aria-hidden>
                  {founder.initial}
                </div>
                <p className={styles.founderName}>{founder.name}</p>
                <p className={styles.founderRole}>{founder.role}</p>
                <div className={styles.founderTags}>
                  {founder.tags.map((t) => (
                    <span key={t} className={styles.founderTag}>
                      {t}
                    </span>
                  ))}
                </div>
              </aside>
              <div>
                <blockquote className={styles.founderQuote}>{founder.quote}</blockquote>
                <div className={styles.aboutProse}>
                  {founder.bioParas.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
                <p className={styles.founderSign}>{founder.sign}</p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ CTA ============ */}
      <section className={styles.cta} id="cta" aria-labelledby="cta-title">
        <div className={styles.container}>
          <Reveal>
            <div className={styles.ctaContent}>
              {isAuthed ? (
                <>
                  <h2 id="cta-title">Tiếp Tục Học Cùng DingDong Nhé!</h2>
                  <p>
                    Quay lại lộ trình của bạn và chinh phục bài học tiếng Trung tiếp theo cùng bạn
                    bánh bao DingDong.
                  </p>
                  <Link href="/dashboard" className={styles.btnWhite}>
                    <GraduationCap className="h-[18px] w-[18px]" aria-hidden="true" /> Vào học ngay
                  </Link>
                  <p className={styles.ctaSub}>Học mọi lúc trên điện thoại · Giữ vững chuỗi streak.</p>
                </>
              ) : (
                <>
                  <h2 id="cta-title">Cùng DingDong Bắt Đầu Hôm Nay Nhé!</h2>
                  <p>
                    Tạo tài khoản miễn phí trong 30 giây và học bài tiếng Trung đầu tiên cùng bạn bánh
                    bao DingDong.
                  </p>
                  <Link href="/register" className={styles.btnWhite}>
                    <Rocket className="h-[18px] w-[18px]" aria-hidden="true" /> Đăng ký miễn phí ngay
                  </Link>
                  <p className={styles.ctaSub}>Không cần thẻ tín dụng · Học mọi lúc trên điện thoại.</p>
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
                      {l.href.startsWith("/") && !l.href.includes("#") ? (
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
