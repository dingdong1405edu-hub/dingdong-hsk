import { PrismaClient, HSKLevel, QuestionType, WritingTaskType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Admin user
  const adminHash = await bcrypt.hash("admin123456", 12);
  const admin = await prisma.user.upsert({
    where: { email: "dingdong1405edu@gmail.com" },
    update: {},
    create: {
      email: "dingdong1405edu@gmail.com",
      name: "Admin",
      passwordHash: adminHash,
      role: "ADMIN",
      xp: 0,
      hearts: 5,
    },
  });
  console.log("Admin:", admin.email);

  // Demo learner
  const learnerHash = await bcrypt.hash("demo123456", 12);
  const learner = await prisma.user.upsert({
    where: { email: "demo@dingdong.vn" },
    update: {},
    create: {
      email: "demo@dingdong.vn",
      name: "Demo User",
      passwordHash: learnerHash,
      role: "LEARNER",
      xp: 120,
      hearts: 5,
      streakDays: 3,
    },
  });
  console.log("Learner:", learner.email);

  // ===== HSK 1 Vocab Units =====
  const unit1 = await prisma.vocabUnit.upsert({
    where: { id: "unit-hsk1-1" },
    update: {},
    create: {
      id: "unit-hsk1-1",
      title: "Chào hỏi & Đại từ",
      titleZh: "问候与代词",
      hskLevel: HSKLevel.HSK1,
      order: 1,
    },
  });

  const unit2 = await prisma.vocabUnit.upsert({
    where: { id: "unit-hsk1-2" },
    update: {},
    create: {
      id: "unit-hsk1-2",
      title: "Con số & Thời gian",
      titleZh: "数字与时间",
      hskLevel: HSKLevel.HSK1,
      order: 2,
    },
  });

  const unit3 = await prisma.vocabUnit.upsert({
    where: { id: "unit-hsk1-3" },
    update: {},
    create: {
      id: "unit-hsk1-3",
      title: "Gia đình & Con người",
      titleZh: "家庭与人物",
      hskLevel: HSKLevel.HSK1,
      order: 3,
    },
  });

  // Lessons for Unit 1
  const lessons1 = [
    {
      id: "lesson-u1-1",
      unitId: unit1.id,
      order: 1,
      title: "Xin chào & Cảm ơn",
      exercises: [
        {
          type: "match",
          pairs: [
            { zh: "你好", vi: "Xin chào", pinyin: "nǐ hǎo" },
            { zh: "谢谢", vi: "Cảm ơn", pinyin: "xiè xiè" },
            { zh: "再见", vi: "Tạm biệt", pinyin: "zài jiàn" },
            { zh: "对不起", vi: "Xin lỗi", pinyin: "duì bu qǐ" },
          ],
        },
        {
          type: "toneSelect",
          word: "你好",
          pinyin: "nǐ hǎo",
          audio: null,
          question: "Từ '你好' có thanh điệu là gì?",
          options: ["Thanh 1+1", "Thanh 3+3", "Thanh 2+4", "Thanh 4+2"],
          correct: 1,
        },
        {
          type: "translate",
          direction: "vi_to_zh",
          prompt: "Tạm biệt",
          answer: "再见",
          pinyin: "zài jiàn",
          options: ["再见", "你好", "谢谢", "不客气"],
        },
        {
          type: "pinyinMatch",
          pairs: [
            { zh: "你好", pinyin: "nǐ hǎo" },
            { zh: "谢谢", pinyin: "xiè xiè" },
            { zh: "再见", pinyin: "zài jiàn" },
          ],
        },
      ],
    },
    {
      id: "lesson-u1-2",
      unitId: unit1.id,
      order: 2,
      title: "Đại từ nhân xưng",
      exercises: [
        {
          type: "match",
          pairs: [
            { zh: "我", vi: "Tôi", pinyin: "wǒ" },
            { zh: "你", vi: "Bạn", pinyin: "nǐ" },
            { zh: "他", vi: "Anh ấy", pinyin: "tā" },
            { zh: "她", vi: "Cô ấy", pinyin: "tā" },
            { zh: "我们", vi: "Chúng tôi", pinyin: "wǒ men" },
            { zh: "你们", vi: "Các bạn", pinyin: "nǐ men" },
          ],
        },
        {
          type: "translate",
          direction: "zh_to_vi",
          prompt: "他是学生。",
          answer: "Anh ấy là học sinh.",
          options: ["Anh ấy là học sinh.", "Cô ấy là giáo viên.", "Tôi là học sinh.", "Bạn là học sinh."],
        },
        {
          type: "sentenceOrder",
          words: ["是", "我", "学生"],
          answer: "我是学生",
          hint: "Tôi là học sinh",
        },
      ],
    },
  ];

  for (const lesson of lessons1) {
    await prisma.vocabLesson.upsert({
      where: { id: lesson.id },
      update: {},
      create: lesson,
    });
  }

  // Lessons for Unit 2
  const lessons2 = [
    {
      id: "lesson-u2-1",
      unitId: unit2.id,
      order: 1,
      title: "Số từ 1-10",
      exercises: [
        {
          type: "match",
          pairs: [
            { zh: "一", vi: "Một", pinyin: "yī" },
            { zh: "二", vi: "Hai", pinyin: "èr" },
            { zh: "三", vi: "Ba", pinyin: "sān" },
            { zh: "四", vi: "Bốn", pinyin: "sì" },
            { zh: "五", vi: "Năm", pinyin: "wǔ" },
            { zh: "六", vi: "Sáu", pinyin: "liù" },
          ],
        },
        {
          type: "toneSelect",
          word: "四",
          pinyin: "sì",
          question: "Từ '四' có thanh mấy?",
          options: ["Thanh 1", "Thanh 2", "Thanh 3", "Thanh 4"],
          correct: 3,
        },
      ],
    },
    {
      id: "lesson-u2-2",
      unitId: unit2.id,
      order: 2,
      title: "Ngày giờ cơ bản",
      exercises: [
        {
          type: "match",
          pairs: [
            { zh: "今天", vi: "Hôm nay", pinyin: "jīn tiān" },
            { zh: "明天", vi: "Ngày mai", pinyin: "míng tiān" },
            { zh: "昨天", vi: "Hôm qua", pinyin: "zuó tiān" },
            { zh: "现在", vi: "Bây giờ", pinyin: "xiàn zài" },
          ],
        },
        {
          type: "translate",
          direction: "vi_to_zh",
          prompt: "Hôm nay là thứ mấy?",
          answer: "今天是星期几？",
          options: ["今天是星期几？", "明天是几号？", "现在几点？", "昨天几号？"],
        },
      ],
    },
  ];

  for (const lesson of lessons2) {
    await prisma.vocabLesson.upsert({
      where: { id: lesson.id },
      update: {},
      create: lesson,
    });
  }

  // Lesson for Unit 3
  await prisma.vocabLesson.upsert({
    where: { id: "lesson-u3-1" },
    update: {},
    create: {
      id: "lesson-u3-1",
      unitId: unit3.id,
      order: 1,
      title: "Gia đình",
      exercises: [
        {
          type: "match",
          pairs: [
            { zh: "爸爸", vi: "Bố", pinyin: "bà ba" },
            { zh: "妈妈", vi: "Mẹ", pinyin: "mā ma" },
            { zh: "哥哥", vi: "Anh trai", pinyin: "gē ge" },
            { zh: "姐姐", vi: "Chị gái", pinyin: "jiě jie" },
            { zh: "弟弟", vi: "Em trai", pinyin: "dì di" },
            { zh: "妹妹", vi: "Em gái", pinyin: "mèi mei" },
          ],
        },
        {
          type: "translate",
          direction: "zh_to_vi",
          prompt: "我爸爸是老师。",
          answer: "Bố tôi là giáo viên.",
          options: ["Bố tôi là giáo viên.", "Mẹ tôi là bác sĩ.", "Anh tôi là học sinh.", "Em tôi là học sinh."],
        },
      ],
    },
  });

  // ===== HSK 1 Grammar Units =====
  const gunit1 = await prisma.grammarUnit.upsert({
    where: { id: "gunit-hsk1-1" },
    update: {},
    create: {
      id: "gunit-hsk1-1",
      title: "Câu khẳng định cơ bản",
      titleZh: "基本肯定句",
      hskLevel: HSKLevel.HSK1,
      order: 1,
    },
  });

  await prisma.grammarLesson.upsert({
    where: { id: "glesson-g1-1" },
    update: {},
    create: {
      id: "glesson-g1-1",
      unitId: gunit1.id,
      order: 1,
      title: "Câu với 是 (shì)",
      exercises: [
        {
          type: "fill_blank",
          sentence: "我___学生。",
          blank: "是",
          options: ["是", "有", "在", "叫"],
          hint: "Động từ 'là'",
        },
        {
          type: "sentence_order",
          words: ["老师", "是", "他"],
          answer: "他是老师",
          meaning: "Anh ấy là giáo viên",
        },
        {
          type: "translate",
          direction: "vi_to_zh",
          prompt: "Cô ấy là bác sĩ.",
          answer: "她是医生。",
          options: ["她是医生。", "他是老师。", "我是学生。", "你是医生。"],
        },
      ],
    },
  });

  // ===== Hanzi Characters =====
  const hanziData = [
    {
      id: "hanzi-ni",
      character: "你",
      pinyin: "nǐ",
      tone: 3,
      meaning: "Bạn, anh/chị/em (ngôi thứ hai)",
      hskLevel: HSKLevel.HSK1,
      strokeCount: 7,
      strokeOrder: { strokes: 7, notes: "phức hợp từ 人 và 尔" },
      examples: [
        { sentence: "你好", pinyin: "nǐ hǎo", meaning: "Xin chào" },
        { sentence: "你是学生吗？", pinyin: "nǐ shì xuésheng ma?", meaning: "Bạn là học sinh à?" },
      ],
    },
    {
      id: "hanzi-wo",
      character: "我",
      pinyin: "wǒ",
      tone: 3,
      meaning: "Tôi, tao (ngôi thứ nhất)",
      hskLevel: HSKLevel.HSK1,
      strokeCount: 7,
      strokeOrder: { strokes: 7, notes: "gồm 7 nét" },
      examples: [
        { sentence: "我是学生。", pinyin: "wǒ shì xuésheng", meaning: "Tôi là học sinh." },
        { sentence: "我叫李明。", pinyin: "wǒ jiào Lǐ Míng", meaning: "Tôi tên là Lý Minh." },
      ],
    },
    {
      id: "hanzi-ta-m",
      character: "他",
      pinyin: "tā",
      tone: 1,
      meaning: "Anh ấy (ngôi thứ ba nam)",
      hskLevel: HSKLevel.HSK1,
      strokeCount: 5,
      strokeOrder: { strokes: 5, notes: "bộ 人" },
      examples: [
        { sentence: "他是老师。", pinyin: "tā shì lǎoshī", meaning: "Anh ấy là giáo viên." },
      ],
    },
    {
      id: "hanzi-hao",
      character: "好",
      pinyin: "hǎo",
      tone: 3,
      meaning: "Tốt, được, hay",
      hskLevel: HSKLevel.HSK1,
      strokeCount: 6,
      strokeOrder: { strokes: 6, notes: "bộ 女 + 子" },
      examples: [
        { sentence: "你好！", pinyin: "nǐ hǎo", meaning: "Xin chào!" },
        { sentence: "很好。", pinyin: "hěn hǎo", meaning: "Rất tốt." },
      ],
    },
    {
      id: "hanzi-zhong",
      character: "中",
      pinyin: "zhōng",
      tone: 1,
      meaning: "Giữa, Trung, Trung Quốc",
      hskLevel: HSKLevel.HSK1,
      strokeCount: 4,
      strokeOrder: { strokes: 4, notes: "4 nét cơ bản" },
      examples: [
        { sentence: "中国", pinyin: "Zhōngguó", meaning: "Trung Quốc" },
        { sentence: "中文", pinyin: "Zhōngwén", meaning: "Tiếng Trung" },
      ],
    },
  ];

  for (const hanzi of hanziData) {
    await prisma.hanziCharacter.upsert({
      where: { id: hanzi.id },
      update: {},
      create: hanzi,
    });
  }

  // ===== Reading Tests =====
  const reading1 = await prisma.readingTest.upsert({
    where: { id: "reading-hsk1-1" },
    update: {},
    create: {
      id: "reading-hsk1-1",
      title: "Giới thiệu bản thân",
      titleZh: "自我介绍",
      hskLevel: HSKLevel.HSK1,
      passage: "我叫李明，我是中国人。我是学生，我在北京大学学习。我有一个哥哥和一个妹妹。我的爸爸是老师，我的妈妈是医生。我喜欢学习汉语，汉语很有意思。",
      passagePinyin: "Wǒ jiào Lǐ Míng, wǒ shì Zhōngguórén. Wǒ shì xuésheng, wǒ zài Běijīng Dàxué xuéxí. Wǒ yǒu yī gè gēgē hé yī gè mèimei. Wǒ de bàba shì lǎoshī, wǒ de māma shì yīshēng. Wǒ xǐhuān xuéxí Hànyǔ, Hànyǔ hěn yǒu yìsi.",
      timeLimit: 600,
    },
  });

  await prisma.question.createMany({
    skipDuplicates: true,
    data: [
      {
        id: "rq1-1",
        type: QuestionType.MCQ,
        prompt: "李明是哪国人？",
        promptPinyin: "Lǐ Míng shì nǎ guó rén?",
        options: [
          { text: "中国人", pinyin: "Zhōngguórén" },
          { text: "越南人", pinyin: "Yuènánrén" },
          { text: "日本人", pinyin: "Rìběnrén" },
          { text: "韩国人", pinyin: "Hánguórén" },
        ],
        correctAnswer: { index: 0, text: "中国人" },
        explanation: "文中说'我是中国人'",
        readingId: reading1.id,
        order: 1,
      },
      {
        id: "rq1-2",
        type: QuestionType.MCQ,
        prompt: "李明的爸爸是什么职业？",
        promptPinyin: "Lǐ Míng de bàba shì shénme zhíyè?",
        options: [
          { text: "医生", pinyin: "yīshēng" },
          { text: "老师", pinyin: "lǎoshī" },
          { text: "学生", pinyin: "xuésheng" },
          { text: "工人", pinyin: "gōngrén" },
        ],
        correctAnswer: { index: 1, text: "老师" },
        explanation: "文中说'我的爸爸是老师'",
        readingId: reading1.id,
        order: 2,
      },
      {
        id: "rq1-3",
        type: QuestionType.TRUE_FALSE,
        prompt: "李明喜欢学习汉语。",
        promptPinyin: "Lǐ Míng xǐhuān xuéxí Hànyǔ.",
        correctAnswer: { value: true },
        explanation: "文中说'我喜欢学习汉语'",
        readingId: reading1.id,
        order: 3,
      },
    ],
  });

  const reading2 = await prisma.readingTest.upsert({
    where: { id: "reading-hsk1-2" },
    update: {},
    create: {
      id: "reading-hsk1-2",
      title: "Một ngày của tôi",
      titleZh: "我的一天",
      hskLevel: HSKLevel.HSK1,
      passage: "我每天七点起床。我先吃早饭，然后去学校。在学校，我上汉语课和数学课。中午我在学校吃午饭。下午三点放学。我回家以后先做作业，然后看电视。晚上九点我睡觉。",
      passagePinyin: "Wǒ měitiān qī diǎn qǐchuáng. Wǒ xiān chī zǎofàn, rán hòu qù xuéxiào. Zài xuéxiào, wǒ shàng Hànyǔ kè hé shùxué kè. Zhōngwǔ wǒ zài xuéxiào chī wǔfàn. Xiàwǔ sān diǎn fàngxué. Wǒ huí jiā yǐhòu xiān zuò zuòyè, rán hòu kàn diànshì. Wǎnshang jiǔ diǎn wǒ shuìjiào.",
      timeLimit: 600,
    },
  });

  await prisma.question.createMany({
    skipDuplicates: true,
    data: [
      {
        id: "rq2-1",
        type: QuestionType.MCQ,
        prompt: "作者每天几点起床？",
        options: [
          { text: "六点", pinyin: "liù diǎn" },
          { text: "七点", pinyin: "qī diǎn" },
          { text: "八点", pinyin: "bā diǎn" },
          { text: "九点", pinyin: "jiǔ diǎn" },
        ],
        correctAnswer: { index: 1, text: "七点" },
        explanation: "文中说'每天七点起床'",
        readingId: reading2.id,
        order: 1,
      },
      {
        id: "rq2-2",
        type: QuestionType.TRUE_FALSE,
        prompt: "作者下午放学后先看电视再做作业。",
        correctAnswer: { value: false },
        explanation: "文中说'先做作业，然后看电视'，顺序相反",
        readingId: reading2.id,
        order: 2,
      },
    ],
  });

  // ===== Listening Test =====
  await prisma.listeningTest.upsert({
    where: { id: "listening-hsk1-1" },
    update: {},
    create: {
      id: "listening-hsk1-1",
      title: "Hội thoại chào hỏi",
      hskLevel: HSKLevel.HSK1,
      audioUrl: "/audio/hsk1-greeting.mp3",
      transcript: "A: 你好！你叫什么名字？\nB: 你好！我叫王芳。你呢？\nA: 我叫张明。你是哪里人？\nB: 我是北京人。你呢？\nA: 我是上海人。很高兴认识你！\nB: 我也很高兴认识你！",
      timeLimit: 300,
    },
  });

  await prisma.question.createMany({
    skipDuplicates: true,
    data: [
      {
        id: "lq1-1",
        type: QuestionType.MCQ,
        prompt: "女的叫什么名字？",
        promptPinyin: "Nǚ de jiào shénme míngzi?",
        options: [
          { text: "王芳", pinyin: "Wáng Fāng" },
          { text: "张明", pinyin: "Zhāng Míng" },
          { text: "李明", pinyin: "Lǐ Míng" },
          { text: "王明", pinyin: "Wáng Míng" },
        ],
        correctAnswer: { index: 0, text: "王芳" },
        explanation: "她说'我叫王芳'。",
        listeningId: "listening-hsk1-1",
        order: 1,
      },
      {
        id: "lq1-2",
        type: QuestionType.MCQ,
        prompt: "张明是哪里人？",
        promptPinyin: "Zhāng Míng shì nǎlǐ rén?",
        options: [
          { text: "北京人", pinyin: "Běijīngrén" },
          { text: "上海人", pinyin: "Shànghǎirén" },
          { text: "广州人", pinyin: "Guǎngzhōurén" },
          { text: "南京人", pinyin: "Nánjīngrén" },
        ],
        correctAnswer: { index: 1, text: "上海人" },
        explanation: "张明说'我是上海人'。",
        listeningId: "listening-hsk1-1",
        order: 2,
      },
      {
        id: "lq1-3",
        type: QuestionType.TRUE_FALSE,
        prompt: "王芳是北京人。",
        promptPinyin: "Wáng Fāng shì Běijīngrén.",
        correctAnswer: { value: true },
        explanation: "王芳说'我是北京人'。",
        listeningId: "listening-hsk1-1",
        order: 3,
      },
    ],
  });

  // ===== Writing Task =====
  await prisma.writingTask.upsert({
    where: { id: "writing-hsk1-1" },
    update: {},
    create: {
      id: "writing-hsk1-1",
      taskType: WritingTaskType.FREE,
      prompt: "Viết một đoạn văn ngắn giới thiệu bản thân bằng tiếng Trung. Bao gồm: tên, quốc tịch, nghề nghiệp, gia đình và sở thích.",
      promptZh: "用汉语写一段短文介绍你自己。包括：名字、国籍、职业、家庭和爱好。",
      minChars: 50,
      timeLimit: 900,
      hskLevel: HSKLevel.HSK1,
    },
  });

  // ===== Speaking Set =====
  await prisma.speakingSet.upsert({
    where: { id: "speaking-hsk1-1" },
    update: {},
    create: {
      id: "speaking-hsk1-1",
      title: "HSKK HSK 1 - Bài 1",
      hskLevel: HSKLevel.HSK1,
      part1Sentences: [
        { text: "你好，很高兴认识你。", pinyin: "Nǐ hǎo, hěn gāoxìng rènshi nǐ." },
        { text: "我叫李明，我是学生。", pinyin: "Wǒ jiào Lǐ Míng, wǒ shì xuésheng." },
        { text: "我喜欢学习汉语，汉语很有意思。", pinyin: "Wǒ xǐhuān xuéxí Hànyǔ, Hànyǔ hěn yǒu yìsi." },
      ],
      part2Passage: {
        text: "我叫王明，今年二十岁。我是大学生，在北京大学学习汉语。我的家在上海，我有爸爸、妈妈和一个妹妹。我喜欢打篮球和听音乐。",
        pinyin: "Wǒ jiào Wáng Míng, jīnnián èrshí suì. Wǒ shì dàxuéshēng, zài Běijīng Dàxué xuéxí Hànyǔ. Wǒ de jiā zài Shànghǎi, wǒ yǒu bàba, māma hé yī gè mèimei. Wǒ xǐhuān dǎ lánqiú hé tīng yīnyuè.",
      },
      part3Questions: [
        { question: "你叫什么名字？", pinyin: "Nǐ jiào shénme míngzi?" },
        { question: "你是哪国人？", pinyin: "Nǐ shì nǎ guó rén?" },
        { question: "你喜欢学习汉语吗？为什么？", pinyin: "Nǐ xǐhuān xuéxí Hànyǔ ma? Wèishénme?" },
      ],
    },
  });

  console.log("Seeding completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
