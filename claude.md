# DingDong HSK — Nền tảng học tiếng Trung

> Full-stack web app học tiếng Trung với các module: Từ vựng & Ngữ pháp HSK (Duolingo-style), Đọc hiểu, Nghe hiểu, Viết luận, Luyện nói (HSKK) được chấm điểm bằng Claude AI.

---

## 1. Mục tiêu sản phẩm

Một nền tảng học tiếng Trung tích hợp giúp người học:
- Học **từ vựng & ngữ pháp** theo chuẩn HSK 1–6 qua bài học ngắn, gamified như Duolingo (XP, streak, hearts, lessons unlock).
- Luyện **viết chữ Hán** — nhận diện nét bút, stroke order animation.
- Luyện **Đọc hiểu** với đoạn văn tiếng Trung + câu hỏi multiple choice / fill-in-the-blank (admin upload từ trang quản trị).
- Luyện **Nghe hiểu** với audio tiếng Trung + câu hỏi (theo format đề HSK thật).
- Luyện **Viết** (HSK Writing / tự do) — AI chấm ngữ pháp, từ vựng, mạch lạc.
- Luyện **Nói** (HSKK: Phần 1 lặp câu, Phần 2 đọc đoạn văn, Phần 3 trả lời câu hỏi) — ghi âm browser → AI chấm Phát âm, Thanh điệu, Lưu loát.

Giao diện: **chuyên nghiệp, tối giản, mobile-first**, responsive cho mọi breakpoint.

---

## 2. Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | **Next.js 15** (App Router) + TypeScript |
| Styling | Tailwind CSS + **shadcn/ui** (Radix primitives) |
| Icons | lucide-react |
| Animation | framer-motion (cho Duolingo-style feedback + stroke order) |
| Database | **PostgreSQL** (Railway managed) |
| ORM | **Prisma** |
| Auth | **Auth.js (NextAuth v5)** — email/password + Google OAuth |
| AI Grading | **Groq API** (`groq-sdk`, model `llama-3.3-70b-versatile` cho writing/speaking) |
| Speech-to-Text | **Voxtral** (Mistral API, model `voxtral-mini-latest`, hỗ trợ tiếng Trung Mandarin `zh`) |
| Pinyin | `pinyin-pro` (chuyển Hán tự → pinyin với thanh điệu) |
| Stroke Order | `hanzi-writer` (animation nét bút chữ Hán) |
| File Storage | Railway volume hoặc Cloudflare R2 cho audio uploads |
| State | React Server Components + Zustand cho client UI state |
| Forms | react-hook-form + zod |
| Deployment | **Railway** (web + Postgres), **GitHub** (source + CI) |

**Lý do chọn Voxtral** (Mistral): mô hình audio hiểu ngữ cảnh, hỗ trợ tiếng Trung Mandarin (`zh`) độ chính xác cao, gọi trực tiếp qua REST `/v1/audio/transcriptions` nên không cần thêm SDK.

---

## 3. Cấu trúc thư mục

```
dingdong-hsk/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── public/
│   ├── audio/                  # Listening files
│   └── images/
├── src/
│   ├── app/
│   │   ├── (marketing)/        # Landing page
│   │   ├── (auth)/             # login, register
│   │   ├── (learn)/            # learner-facing routes
│   │   │   ├── dashboard/
│   │   │   ├── vocab/[unitId]/
│   │   │   ├── grammar/[unitId]/
│   │   │   ├── hanzi/[characterId]/   # luyện viết chữ Hán
│   │   │   ├── reading/[testId]/
│   │   │   ├── listening/[testId]/
│   │   │   ├── writing/[taskId]/
│   │   │   └── speaking/[setId]/
│   │   ├── admin/              # admin dashboard (role: ADMIN)
│   │   │   ├── reading/
│   │   │   ├── listening/
│   │   │   ├── writing/
│   │   │   ├── speaking/
│   │   │   ├── vocab/
│   │   │   ├── grammar/
│   │   │   ├── hanzi/
│   │   │   └── users/
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/
│   │   │   ├── grade/writing/route.ts
│   │   │   ├── grade/speaking/route.ts
│   │   │   ├── transcribe/route.ts    # Voxtral (Mistral) zh
│   │   │   └── admin/.../route.ts
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/                 # shadcn primitives
│   │   ├── learn/              # LessonCard, HeartBar, XPBar, StreakFlame, PinyinText
│   │   ├── hanzi/              # StrokeOrderCanvas, CharacterQuiz
│   │   ├── admin/
│   │   └── shared/
│   ├── lib/
│   │   ├── db.ts               # Prisma client singleton
│   │   ├── auth.ts             # Auth.js config
│   │   ├── groq.ts             # Groq client + grading prompts tiếng Trung
│   │   ├── voxtral.ts          # Speech-to-text zh (Voxtral / Mistral)
│   │   ├── pinyin.ts           # pinyin-pro utils
│   │   └── utils.ts
│   ├── server/
│   │   └── actions/            # Server Actions (Next.js)
│   └── types/
├── .env.example
├── next.config.ts
├── tailwind.config.ts
├── package.json
├── railway.toml
└── README.md
```

---

## 4. Database Schema (Prisma)

Các model chính (tóm tắt — đầy đủ trong `prisma/schema.prisma`):

```prisma
model User {
  id            String   @id @default(cuid())
  email         String   @unique
  name          String?
  passwordHash  String?
  role          Role     @default(LEARNER)   // LEARNER | ADMIN
  xp            Int      @default(0)
  hearts        Int      @default(5)
  streakDays    Int      @default(0)
  hskLevel      HSKLevel @default(HSK1)
  lastActiveAt  DateTime?
  createdAt     DateTime @default(now())

  vocabProgress    VocabProgress[]
  grammarProgress  GrammarProgress[]
  hanziProgress    HanziProgress[]
  attempts         Attempt[]
}

model VocabUnit {
  id          String     @id @default(cuid())
  title       String
  titleZh     String     // tên đơn vị bằng tiếng Trung
  hskLevel    HSKLevel   // HSK1 | HSK2 | HSK3 | HSK4 | HSK5 | HSK6
  order       Int
  lessons     VocabLesson[]
}

model VocabLesson {
  id        String      @id @default(cuid())
  unitId    String
  unit      VocabUnit   @relation(fields: [unitId], references: [id])
  order     Int
  exercises Json        // [{ type: "match" | "translate" | "listen" | "toneSelect" | "hanziInput", ... }]
}

model HanziCharacter {
  id          String   @id @default(cuid())
  character   String   @unique   // VD: "你"
  pinyin      String             // VD: "nǐ"
  tone        Int                // 1-4, 0 = neutral
  meaning     String             // nghĩa tiếng Việt
  hskLevel    HSKLevel
  strokeCount Int
  strokeOrder Json               // dữ liệu cho hanzi-writer
  examples    Json               // [{ sentence: "你好", pinyin: "nǐ hǎo", meaning: "Xin chào" }]

  progress    HanziProgress[]
}

model GrammarUnit { /* tương tự VocabUnit */ }
model GrammarLesson { /* tương tự VocabLesson, exercises gồm: fill-blank, sentence-order, translate */ }

model ReadingTest {
  id          String   @id @default(cuid())
  title       String
  titleZh     String
  hskLevel    HSKLevel
  passage     String   @db.Text    // đoạn văn tiếng Trung (có thể có chú thích pinyin)
  passagePinyin String? @db.Text   // bản pinyin tương ứng (optional)
  timeLimit   Int                  // seconds
  questions   Question[]
  createdAt   DateTime @default(now())
}

model ListeningTest {
  id          String   @id @default(cuid())
  title       String
  hskLevel    HSKLevel
  audioUrl    String
  transcript  String?  @db.Text   // transcript tiếng Trung
  questions   Question[]
}

model Question {
  id           String       @id @default(cuid())
  type         QuestionType // MCQ | FILL_BLANK | TRUE_FALSE | MATCHING | SHORT_ANSWER
  prompt       String       @db.Text
  promptPinyin String?      @db.Text
  options      Json?        // for MCQ / MATCHING (mỗi option có text + pinyin)
  correctAnswer Json
  readingId    String?
  listeningId  String?
}

model WritingTask {
  id          String   @id @default(cuid())
  taskType    WritingTaskType   // FREE | GUIDED | PICTURE_DESCRIPTION
  prompt      String   @db.Text
  promptZh    String?  @db.Text   // prompt bằng tiếng Trung nếu có
  imageUrl    String?
  minChars    Int                  // số ký tự tối thiểu (thay vì words)
  timeLimit   Int
  hskLevel    HSKLevel
}

model SpeakingSet {
  id           String   @id @default(cuid())
  hskLevel     HSKLevel
  part1Sentences  Json   // HSKK Part 1: câu cần lặp lại [{ text: "...", pinyin: "..." }]
  part2Passage    Json   // HSKK Part 2: đoạn văn cần đọc { text, pinyin }
  part3Questions  Json   // HSKK Part 3: câu hỏi trả lời tự do [{ question, pinyin }]
}

model Attempt {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id])
  skill         Skill    // READING | LISTENING | WRITING | SPEAKING | VOCAB | GRAMMAR | HANZI
  refId         String
  rawAnswer     Json
  score         Float?   // HSKK: 0-100; Reading/Listening: % đúng
  feedback      Json?
  durationSec   Int?
  createdAt     DateTime @default(now())
}

enum Role { LEARNER ADMIN }
enum HSKLevel { HSK1 HSK2 HSK3 HSK4 HSK5 HSK6 }
enum Skill { READING LISTENING WRITING SPEAKING VOCAB GRAMMAR HANZI }
enum QuestionType { MCQ FILL_BLANK TRUE_FALSE MATCHING SHORT_ANSWER }
enum WritingTaskType { FREE GUIDED PICTURE_DESCRIPTION }
```

---

## 5. Features chi tiết

### 5.1 Vocabulary & Grammar (Duolingo-style)
- **Unit → Lesson → Exercise** tree, unlock theo thứ tự HSK level.
- Exercise types:
  - **match**: nối từ tiếng Trung ↔ nghĩa tiếng Việt
  - **translate**: dịch câu Việt → Trung hoặc ngược lại
  - **toneSelect**: nghe audio → chọn thanh điệu đúng (1/2/3/4/nhẹ)
  - **hanziInput**: gõ chữ Hán (hỗ trợ IME tiếng Trung)
  - **sentenceOrder**: sắp xếp từ thành câu đúng
  - **pinyinMatch**: nối Hán tự ↔ pinyin
- **Hearts system**: sai 1 câu mất 1 heart.
- **XP & Streak**: mỗi lesson xong cộng XP.
- **Pinyin tooltip**: hover/tap vào Hán tự để xem pinyin + nghĩa.
- Animation feedback (correct = green pulse; wrong = red shake + hiện đáp án đúng).

### 5.2 Luyện viết chữ Hán (Hanzi)
- **Stroke order animation** dùng `hanzi-writer`: nhìn stroke order từng nét.
- **Quiz mode**: ẩn character → user vẽ từng nét → so sánh với stroke data.
- Hiển thị: ô kẻ ô vuông chuẩn (田字格) như vở tập viết.
- Gợi ý thanh điệu + nghĩa + pinyin ngay trên card.

### 5.3 Reading
- Hiển thị passage bên trái (có nút toggle pinyin), questions bên phải.
- **Pinyin overlay**: toggle hiện/ẩn pinyin trên toàn bộ văn bản.
- **Click-to-lookup**: click vào từ → popup pinyin + nghĩa + ví dụ.
- Timer đếm ngược theo format đề HSK.
- Submit → chấm tự động MCQ/Fill/T-F. Show kết quả + giải thích.

### 5.4 Listening
- Audio player với speed control (0.75x – 1.5x).
- Replay giới hạn theo level (HSK thật: 2 lần).
- Transcript toggle (ẩn mặc định, unlock sau khi submit).
- Admin upload audio + transcript + questions.

### 5.5 Writing
- **FREE**: viết tự do về chủ đề cho sẵn.
- **GUIDED**: hoàn thành đoạn văn với từ gợi ý.
- **PICTURE_DESCRIPTION**: mô tả ảnh bằng tiếng Trung.
- Editor: textarea với **ký tự counter** realtime (đếm Hán tự, không đếm space/pinyin), autosave.
- Submit → `/api/grade/writing` → Claude trả về:
  - Điểm tổng + 3 tiêu chí: **Ngữ pháp** (语法), **Từ vựng** (词汇), **Mạch lạc** (连贯性).
  - Highlight lỗi sai (sai ngữ pháp, dùng sai từ, thiếu ngữ điệu).
  - Bản sửa đúng.

### 5.6 Speaking (HSKK-style)
- **Phần 1**: Lặp câu (复述) — nghe audio câu tiếng Trung → ghi âm lặp lại.
- **Phần 2**: Đọc đoạn văn (朗读) — hiển thị text → ghi âm đọc to (có pinyin toggle).
- **Phần 3**: Trả lời câu hỏi (回答问题) — nghe câu hỏi → suy nghĩ 10s → ghi âm trả lời.
- Browser **MediaRecorder API** → upload → Voxtral (Mistral) `zh` transcribe → Groq grade.
- Output:
  - **Phát âm** (发音): độ chính xác âm đầu, âm cuối.
  - **Thanh điệu** (声调): nhận diện sai tone.
  - **Lưu loát** (流利度): tốc độ, ngắt nghỉ, filler words.
  - Gợi ý cụ thể từng lỗi.

### 5.7 Admin Dashboard
- Routes: `/admin/*` — middleware kiểm tra `role === 'ADMIN'`.
- CRUD đầy đủ: Reading tests, Listening tests, Writing tasks, Speaking sets, Vocab units/lessons, Grammar units/lessons, Hanzi characters.
- **HSK filter**: lọc/tạo content theo từng level HSK 1-6.
- Upload audio: lưu Railway volume hoặc R2.
- User management: xem list, reset hearts, ban, set HSK level mục tiêu.

---

## 6. AI Grading Prompts

Các prompt template trong [src/lib/groq.ts](src/lib/groq.ts):

**Writing prompt system**:
```
You are a certified HSK Chinese language examiner. 
Evaluate the following Chinese writing submission by a Vietnamese learner studying at HSK {level} level.
Return structured JSON only.
```

**Speaking prompt** (sau khi có transcript từ Voxtral):
```
You are a HSKK (Hanyu Shuiping Kouyu Kaoshi) examiner.
The following is a transcript of a Vietnamese learner speaking Chinese at HSK {level} level.
Evaluate pronunciation accuracy, tone correctness, and fluency.
Note: The learner's native language is Vietnamese (tonal language, but different tones from Mandarin).
Return structured JSON only.
```

- Model: `llama-3.3-70b-versatile` (Groq) cho writing/speaking. Có thể dùng `llama-3.1-8b-instant` cho vocab feedback nhẹ.
- Output ép JSON: system prompt yêu cầu "Return ONLY valid JSON" + regex trích `{…}` từ phản hồi.
- Temperature: 0.3 (chấm điểm nhất quán).

Output schema cho Writing:
```json
{
  "score": 78,
  "criteria": {
    "grammar": { "score": 75, "feedback": "...", "errors": ["..."] },
    "vocabulary": { "score": 80, "feedback": "...", "suggestions": ["..."] },
    "coherence": { "score": 80, "feedback": "..." }
  },
  "annotations": [
    { "original": "...", "issue": "...", "correction": "...", "explanation": "..." }
  ],
  "correctedVersion": "..."
}
```

Output schema cho Speaking:
```json
{
  "score": 72,
  "criteria": {
    "pronunciation": { "score": 70, "errors": [{ "word": "...", "issue": "...", "correct": "..." }] },
    "tones": { "score": 65, "errors": [{ "word": "...", "expected": "第X声", "detected": "..." }] },
    "fluency": { "score": 80, "wordsPerMinute": 120, "feedback": "..." }
  },
  "transcript": "...",
  "overallFeedback": "..."
}
```

---

## 7. UI/UX Guidelines

- **Color palette**: primary red-600 (màu Trung Quốc), gold-500 cho accent, success green-500, neutral zinc.
- **Typography**: Inter (UI latin), `Noto Sans SC` (chữ Hán giản thể — load từ Google Fonts với `font-display: swap`).
- **Pinyin font**: `Noto Serif` cho pinyin có dấu thanh rõ ràng.
- **Spacing**: Tailwind 4/8 scale.
- **Mobile-first**: test 375px width trước.
- **Pinyin hiển thị**: dùng HTML `<ruby>` tag cho Hán tự + pinyin inline.
- **Tone colors** (optional nhưng nên có): Tone 1 = đỏ, 2 = xanh lá, 3 = xanh dương, 4 = tím, nhẹ = xám.
- **Empty states**: minh hoạ + CTA rõ ràng.
- **Loading**: skeleton, không spinner toàn trang.
- **Toasts**: sonner cho feedback nhanh.

Các component bắt buộc từ shadcn/ui: Button, Card, Dialog, Input, Textarea, Select, Toast, Tabs, Progress, Badge, Sheet (mobile nav).

---

## 8. Environment Variables

File `.env.example`:

```bash
# Database
DATABASE_URL="postgresql://user:pass@host:5432/dingdong_hsk"

# Auth
AUTH_SECRET=""              # openssl rand -base64 32
AUTH_TRUST_HOST="true"
AUTH_GOOGLE_ID=""
AUTH_GOOGLE_SECRET=""

# Groq (AI grading)
GROQ_API_KEY=""

# Voxtral / Mistral (Speech-to-Text tiếng Trung)
VOXTRAL_API_KEY=""

# Storage (chọn 1)
R2_ACCOUNT_ID=""
R2_ACCESS_KEY_ID=""
R2_SECRET_ACCESS_KEY=""
R2_BUCKET=""
# hoặc Railway volume mount tại /data

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
```

---

## 9. Deployment — Railway + GitHub

### 9.1 Setup ban đầu
1. `git init` → push lên GitHub repo.
2. Trên Railway: New Project → Deploy from GitHub repo.
3. Add Postgres plugin → tự inject `DATABASE_URL`.
4. Add env vars còn lại trong Railway dashboard.
5. Railway tự detect Next.js và build.

### 9.2 `railway.toml`
```toml
[build]
builder = "NIXPACKS"
buildCommand = "npm install && npx prisma generate && npx prisma migrate deploy && npm run build"

[deploy]
startCommand = "npm start"
healthcheckPath = "/api/health"
restartPolicyType = "ON_FAILURE"
```

### 9.3 CI (GitHub Actions)
- `.github/workflows/ci.yml`: lint + typecheck + prisma validate trên mọi PR.
- Auto deploy: Railway watch nhánh `main`.

---

## 10. Development Commands

```bash
# Setup
npm install
cp .env.example .env.local      # điền giá trị
npx prisma migrate dev          # tạo DB local
npx prisma db seed              # seed HSK vocab + tests mẫu

# Dev
npm run dev                     # http://localhost:3000

# Quality
npm run typecheck
npm run lint

# Production
npm run build
npm start

# Prisma
npx prisma studio               # GUI cho DB
npx prisma migrate dev --name <change>
```

---

## 11. Roadmap thứ tự build

Khi Claude Code làm việc trên repo này, tuân theo thứ tự:

1. **Skeleton**: init Next.js + TS + Tailwind + shadcn + Prisma + Auth.js. Health route.
2. **Auth**: đăng ký/đăng nhập email + Google. Middleware bảo vệ routes.
3. **DB schema + migrations**: tất cả model ở mục 4. Seed HSK 1 vocab (150 từ), 2 reading tests, 1 listening, 1 writing task, 1 speaking set.
4. **Learner dashboard**: trang chính sau login — XP, streak, hearts, HSK level hiện tại, list modules.
5. **Vocab & Grammar Duolingo-style**: lesson flow + pinyin tooltip + tone colors + animations.
6. **Hanzi module**: stroke order animation + quiz mode.
7. **Reading module**: passage với ruby pinyin + click-to-lookup + questions + auto-grade.
8. **Listening module**: audio player + questions.
9. **Writing module + AI grading**: editor (ký tự counter) + Groq integration.
10. **Speaking module + AI grading**: recorder + Voxtral (Mistral) zh + Groq.
11. **Admin dashboard**: CRUD đầy đủ, HSK level filter.
12. **Polish**: animations, mobile QA, tone colors, empty states.
13. **Deploy**: Railway live + custom domain.

---

## 12. Coding Conventions cho Claude Code

- **TypeScript strict**: không dùng `any`, ưu tiên `unknown` + type guard.
- **Server Actions** ưu tiên hơn API routes cho mutations từ form.
- **Validation**: mọi input từ client phải qua zod schema ở boundary.
- **Error handling**: try/catch ở server actions + return `{ ok, error }`. UI dùng `toast.error()`.
- **File limits**: 1 component / file. File >300 dòng cần tách.
- **Naming**: PascalCase cho components, camelCase cho utils, kebab-case cho route folders.
- **Imports**: dùng `@/` alias (đã config trong tsconfig).
- **Encoding**: mọi file chứa chữ Hán phải lưu UTF-8. Không hardcode Hán tự trong logic — để trong data/seed.
- **Không tự ý** thêm thư viện mới — hỏi user trước nếu cần lib ngoài stack ở mục 2.
- **Không commit secrets**, kiểm tra `.gitignore` có `.env*` (trừ `.env.example`).
- **Migrations**: mỗi thay đổi schema tạo migration mới, không edit migration cũ.
- **Test trước khi báo done**: chạy `npm run typecheck && npm run build` ít nhất.

---

## 13. Đặc thù tiếng Trung — lưu ý khi code

- **Chữ Hán giản thể** (简体字) — không dùng phồn thể trừ khi user yêu cầu.
- **Pinyin với dấu thanh**: dùng `pinyin-pro` để convert, không dùng số tone (nǐ hǎo, không phải ni3 hao3).
- **Đếm từ**: tiếng Trung không có space giữa từ — dùng `Intl.Segmenter` với locale `zh` hoặc thư viện `nodejieba` để segment.
- **IME support**: input chữ Hán cần handle `compositionstart/end` events để không fire onChange trong khi đang gõ pinyin.
- **Audio tiếng Trung**: Voxtral model `voxtral-mini-latest` với `language: "zh"` (ISO 639-1) cho Mandarin, gọi qua `POST https://api.mistral.ai/v1/audio/transcriptions`.
- **Thanh điệu trong Groq prompt**: luôn ghi rõ "Vietnamese learner" để model hiểu context — người Việt dễ nhầm Tone 3 (hỏi-ngã) với Tone 4 (nặng) do ảnh hưởng tiếng mẹ đẻ.
- **ruby HTML tag**: dùng cho pinyin inline:
  ```html
  <ruby>你<rt>nǐ</rt></ruby><ruby>好<rt>hǎo</rt></ruby>
  ```

---

## 14. Khi user yêu cầu thay đổi

- Nếu là thay đổi nhỏ (style, copy): làm trực tiếp.
- Nếu là feature mới hoặc thay schema: tóm tắt plan ngắn → đợi xác nhận → làm.
- Khi sửa bug AI grading: kiểm tra prompt + log raw Groq response trước.
- Khi user paste token (Groq / Voxtral / Railway): **không** echo lại token; chỉ confirm "đã nhận" và lưu vào `.env` (hoặc `.env.local`).

---

## 15. Liên hệ & ghi chú

- Owner: dingdong1405edu@gmail.com
- Tokens cần thiết: `GROQ_API_KEY`, `VOXTRAL_API_KEY`, `RAILWAY_TOKEN`, `GITHUB_TOKEN`.
- Mọi quyết định kiến trúc lớn → hỏi user trước.

---

## 16. Chính sách giá & Phân quyền (Pricing & Entitlements)

> Nguồn cấu hình GIÁ/GÓI: [src/lib/payment-plans.ts](src/lib/payment-plans.ts).
> Suy ra quyền lợi & cấp quyền: [src/lib/entitlements.ts](src/lib/entitlements.ts).
> Hệ thống tim: [src/lib/hearts.ts](src/lib/hearts.ts).
> Sửa giá → chỉ cần sửa `payment-plans.ts` (không phải biến môi trường).

### 16.1 Bảng giá

**Gói Lộ trình (theo cấp HSK, 6 tháng/gói):**

| Gói | Giá | Thời hạn | Quyền lợi |
|-----|-----|----------|-----------|
| Lộ trình HSK 1 | 900.000đ | 6 tháng | Toàn bộ lộ trình HSK 1 |
| Lộ trình HSK 2 | 1.200.000đ | 6 tháng | Toàn bộ lộ trình HSK 2 |
| Lộ trình HSK 3 | 1.500.000đ | 6 tháng | Lộ trình HSK 3 **+ tặng Gói Tự do** |
| Lộ trình HSK 4 | 1.800.000đ | 6 tháng | Lộ trình HSK 4 **+ tặng Gói Tự do** |
| Lộ trình HSK 5 | 2.100.000đ | 6 tháng | Lộ trình HSK 5 **+ tặng Gói Tự do** |
| Lộ trình HSK 6 | 2.400.000đ | 6 tháng | Lộ trình HSK 6 **+ tặng Gói Tự do** |

**Gói Tự do** (= tất cả tính năng **ngoài** phần học theo lộ trình):

| Gói | Giá | Thời hạn | Ghi chú |
|-----|-----|----------|---------|
| Tự do · 1 tháng | 250.000đ | 30 ngày | — |
| Tự do · 3 tháng | 600.000đ | 90 ngày | Tháng đầu chỉ 100k (100k + 250k + 250k = 600k) |

### 16.2 Mô hình freemium (kiểu Duolingo)

- **Lộ trình**: người miễn phí được học **`FREE_ROADMAP_LESSONS` bài đầu mỗi cấp** (mặc định **3**, sửa trong `entitlements.ts`); các bài sau bị khoá tới khi mua gói lộ trình cấp đó.
- **Gói Tự do (tính năng ngoài lộ trình)**: miễn phí cho tới khi **hết tim (heart)**.
  - Tim tối đa `MAX_HEARTS` (5), hồi 1 tim mỗi `HEART_REGEN_MINUTES` (30 phút) — `hearts.ts`.
  - "Tặng tim": hoàn thành bài **không sai câu nào** → +1 tim (xem `completeLessonAction`).
  - Hết tim → chặn luyện tập (tính năng tự do) tới khi hồi/được tặng.
- **Mọi gói trả phí còn hạn → TIM KHÔNG GIỚI HẠN** (`unlimitedHearts`).
- **Tài khoản ADMIN → mở hết tất cả** (mọi cấp lộ trình + tim ∞) — xử lý trong `getEntitlements`.

### 16.3 Cách hoạt động (kỹ thuật)

- Mua hàng **bắt buộc đăng nhập** (quyền lợi gắn với tài khoản).
- Thanh toán qua **PayOS** → khi đơn `PAID` (webhook), `grantSubscriptionsForPayment` tạo `Subscription`
  theo `plan.grants` với hạn = `paidAt + durationDays` (idempotent theo `paymentId`).
- Một lần mua có thể tạo nhiều `Subscription` (vd HSK 3–6 tạo thêm 1 `FREESTYLE`).
- Admin có thể **cấp gói thủ công** tại `/admin/subscriptions` (`adminGrantSubscriptionAction`) —
  dùng để tặng/đối soát hoặc test trước khi PayOS hoạt động.
- Models: `Subscription` (type `ROADMAP|FREESTYLE`, `hskLevel?`, `expiresAt`), `User.heartsUpdatedAt`.

> CÒN LẠI (tuning bước sau): các luồng từ vựng (flashcard `WordFlow`) và ngữ pháp (`GrammarFlow`)
> hiện báo `heartsLost: 0` nên chưa thực sự trừ tim. Hạ tầng tim (hồi/tặng/∞/chặn) đã sẵn sàng;
> chỉ cần các luồng này báo số tim mất khi trả lời sai là kinh tế tim hoạt động đầy đủ.
