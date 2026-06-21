import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { RoadmapMap } from "@/components/learn/roadmap/roadmap-map";
import { slugToLevel, type RoadmapLessonDTO, type SkillKey } from "@/lib/roadmap";

interface Props {
  params: Promise<{ level: string }>;
}

export default async function CourseMapPage({ params }: Props) {
  const { level: slug } = await params;
  const level = slugToLevel(slug);
  if (!level) notFound();

  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = session.user.id;

  const course = await db.course.findUnique({
    where: { hskLevel: level },
    include: {
      lessons: {
        orderBy: { order: "asc" },
        include: {
          sections: { select: { skill: true, published: true } },
          progress: { where: { userId }, select: { completed: true, skillsDone: true } },
        },
      },
    },
  });
  if (!course || !course.published) notFound();

  const lessons: RoadmapLessonDTO[] = course.lessons.map((l) => {
    const prog = l.progress[0];
    const raw = prog?.skillsDone;
    const skillsDone = Array.isArray(raw)
      ? raw.filter((x): x is string => typeof x === "string")
      : [];
    return {
      id: l.id,
      order: l.order,
      topic: l.topic,
      topicZh: l.topicZh,
      icon: l.icon,
      description: l.description,
      chapter: l.chapter,
      chapterOrder: l.chapterOrder,
      xpReward: l.xpReward,
      completed: prog?.completed ?? false,
      skillsDone: skillsDone as SkillKey[],
      sections: l.sections.map((s) => ({ skill: s.skill as SkillKey, published: s.published })),
    };
  });

  return (
    <RoadmapMap
      level={level}
      courseTitle={course.title}
      courseTitleZh={course.titleZh}
      lessons={lessons}
    />
  );
}
