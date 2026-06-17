"use client";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface ModuleCardProps {
  href: string;
  icon: string;
  title: string;
  subtitle: string;
  progress?: number;
  color: string;
  available?: boolean;
}

export function ModuleCard({
  href,
  icon,
  title,
  subtitle,
  progress,
  color,
  available = true,
}: ModuleCardProps) {
  if (!available) {
    return (
      <Card className="cursor-not-allowed opacity-60">
        <CardContent className="p-5">
          <div className={cn("mb-3 flex h-12 w-12 items-center justify-center rounded-2xl text-2xl", color)}>
            {icon}
          </div>
          <div className="font-semibold">{title}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">Chưa mở khoá</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Link href={href} className="group block h-full">
      <Card className="h-full transition-all duration-200 hover:-translate-y-1 hover:border-primary/30 hover:shadow-soft-lg">
        <CardContent className="flex h-full flex-col p-5">
          <div className={cn("mb-3 flex h-12 w-12 items-center justify-center rounded-2xl text-2xl", color)}>
            {icon}
          </div>
          <div className="font-semibold">{title}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">{subtitle}</div>

          {progress !== undefined ? (
            <div className="mt-4">
              <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Tiến độ</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="h-1.5" />
            </div>
          ) : (
            <div className="mt-auto pt-4">
              <span className="inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                Bắt đầu <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
