"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
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
  href, icon, title, subtitle, progress, color, available = true,
}: ModuleCardProps) {
  if (!available) {
    return (
      <Card className="opacity-50 cursor-not-allowed">
        <CardContent className="p-4 flex items-center gap-3">
          <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-2xl", color)}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold">{title}</div>
            <div className="text-xs text-muted-foreground">{subtitle}</div>
            <div className="text-xs text-muted-foreground mt-1">Chưa mở khoá</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
      <Link href={href}>
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-4 flex items-center gap-3">
            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-2xl", color)}>
              {icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold">{title}</div>
              <div className="text-xs text-muted-foreground">{subtitle}</div>
              {progress !== undefined && (
                <Progress value={progress} className="h-1.5 mt-2" />
              )}
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}
