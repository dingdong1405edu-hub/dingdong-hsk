/**
 * Backfill chương lộ trình (RoadmapChapter) từ dữ liệu cũ.
 *
 * Trước đây "chương" chỉ là 2 trường tự do trên mỗi bài: `chapter` (tên) và
 * `chapterOrder` (số). Sau khi thêm model `RoadmapChapter` + `RoadmapLesson.chapterId`,
 * script này tạo các bản ghi chương cho dữ liệu hiện có và gán `chapterId` cho từng bài.
 *
 * An toàn + idempotent: chỉ xử lý các bài CHƯA có `chapterId`; chương đã tồn tại
 * (cùng courseId + order) thì tái sử dụng. Hai trường cache `chapter`/`chapterOrder`
 * vẫn được giữ để phía học viên không phải đổi code.
 *
 * Chạy: `npm run db:backfill-chapters`  (hoặc `npx tsx prisma/backfill-chapters.ts`)
 * Nên chạy SAU `npm run db:push`.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const courses = await prisma.course.findMany({
    include: { lessons: { orderBy: { order: "asc" } } },
  });

  let chaptersCreated = 0;
  let lessonsLinked = 0;

  for (const course of courses) {
    // Chỉ những bài chưa gán chương (idempotent khi chạy lại).
    const lessons = course.lessons.filter((l) => !l.chapterId);
    if (lessons.length === 0) continue;

    // Tên gợi ý cho mỗi order = tên `chapter` đầu tiên không rỗng của order đó.
    const titleByOrder = new Map<number, string>();
    for (const l of lessons) {
      const ord = l.chapterOrder ?? 1;
      if (!titleByOrder.has(ord) && l.chapter) titleByOrder.set(ord, l.chapter);
    }

    const orders = [...new Set(lessons.map((l) => l.chapterOrder ?? 1))].sort((a, b) => a - b);

    for (const ord of orders) {
      // Tái sử dụng chương sẵn có (nếu có), nếu không thì tạo mới.
      const existing = await prisma.roadmapChapter.findUnique({
        where: { courseId_order: { courseId: course.id, order: ord } },
        select: { id: true, title: true },
      });
      const chapter =
        existing ??
        (await prisma.roadmapChapter.create({
          data: {
            courseId: course.id,
            order: ord,
            title: titleByOrder.get(ord) ?? `Chương ${ord}`,
            titleZh: "",
          },
          select: { id: true, title: true },
        }));
      if (!existing) chaptersCreated++;

      // Gán chapterId + đồng bộ cache tên chương cho các bài của order này.
      const res = await prisma.roadmapLesson.updateMany({
        where: { courseId: course.id, chapterId: null, chapterOrder: ord },
        data: { chapterId: chapter.id, chapter: chapter.title },
      });
      lessonsLinked += res.count;
    }
  }

  console.log(`Backfill chương xong: tạo ${chaptersCreated} chương, gán ${lessonsLinked} bài.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
