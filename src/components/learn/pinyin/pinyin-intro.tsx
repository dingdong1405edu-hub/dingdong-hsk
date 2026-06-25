import { Languages, Type, Music } from "lucide-react";
import { SoundButton } from "./sound-button";

/**
 * Phần GIỚI THIỆU cho người mới bắt đầu: tiếng Trung, chữ Hán và pinyin là gì,
 * và cấu trúc một âm tiết (thanh mẫu + vận mẫu + thanh điệu).
 */
export function PinyinIntro() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-card p-5 leading-relaxed">
        <h3 className="mb-2 flex items-center gap-2 text-base font-bold">
          <Languages className="h-5 w-5 text-amber-600" /> Tiếng Trung, chữ Hán và pinyin
        </h3>
        <p className="text-sm text-muted-foreground">
          Tiếng Trung không có <b>bảng chữ cái</b> như tiếng Việt. Mỗi từ được viết bằng{" "}
          <b>chữ Hán</b> (汉字) — chữ tượng hình, nhìn vào không đoán ngay được cách đọc. Vì vậy người ta
          dùng <b className="text-amber-600 dark:text-amber-400">pinyin</b> (拼音) — hệ phiên âm bằng chữ
          La-tinh — để ghi lại <i>cách phát âm</i> của mỗi chữ. Học chắc pinyin trước giúp bạn đọc đúng,
          nghe rõ và tra từ điển dễ dàng. Đây chính là &quot;bảng chữ cái phát âm&quot; của tiếng Trung.
        </p>
      </div>

      <div className="rounded-2xl border bg-card p-5">
        <h3 className="mb-3 flex items-center gap-2 text-base font-bold">
          <Type className="h-5 w-5 text-amber-600" /> Một âm tiết gồm 3 phần
        </h3>
        <div className="flex flex-wrap items-center justify-center gap-2 text-center">
          <Part color="bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300" label="Thanh mẫu" sub="phụ âm đầu" big="h" />
          <Plus />
          <Part color="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" label="Vận mẫu" sub="phần vần" big="ao" />
          <Plus />
          <Part color="bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300" label="Thanh điệu" sub="dấu thanh" big="ˇ" />
          <span className="px-1 text-2xl font-bold text-muted-foreground">=</span>
          <div className="flex flex-col items-center gap-1">
            <span className="font-pinyin text-3xl font-bold text-blue-500">hǎo</span>
            <span className="font-chinese text-2xl font-bold text-blue-500">好</span>
            <span className="text-xs text-muted-foreground">tốt, khỏe</span>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3 border-t pt-4 text-sm text-muted-foreground">
          <span>
            Ví dụ:{" "}
            <ruby className="font-chinese text-xl text-blue-500">
              你<rt className="font-pinyin text-blue-500">nǐ</rt>
            </ruby>
            <ruby className="font-chinese text-xl text-blue-500">
              好<rt className="font-pinyin text-blue-500">hǎo</rt>
            </ruby>{" "}
            = &quot;xin chào&quot;
          </span>
          <SoundButton hanzi="你好" size="sm" label="Nghe" />
        </div>
      </div>

      <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-400/25 dark:bg-amber-500/10 dark:text-amber-200">
        <Music className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          <b>Thanh điệu</b> đổi nghĩa hoàn toàn: <span className="font-pinyin text-red-500">mā</span> (mẹ) ≠{" "}
          <span className="font-pinyin text-blue-500">mǎ</span> (ngựa) ≠{" "}
          <span className="font-pinyin text-purple-500">mà</span> (mắng). Vì vậy hãy luyện cả thanh điệu, không
          chỉ phụ âm và vần.
        </p>
      </div>
    </div>
  );
}

function Part({ color, label, sub, big }: { color: string; label: string; sub: string; big: string }) {
  return (
    <div className="flex w-[88px] flex-col items-center gap-1 rounded-2xl border bg-card p-2.5">
      <span className={`font-pinyin rounded-lg px-2.5 py-0.5 text-2xl font-bold ${color}`}>{big}</span>
      <span className="text-xs font-semibold">{label}</span>
      <span className="text-[10px] text-muted-foreground">{sub}</span>
    </div>
  );
}

function Plus() {
  return <span className="px-0.5 text-2xl font-bold text-muted-foreground">+</span>;
}
