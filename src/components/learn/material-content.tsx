import { Lightbulb } from "lucide-react";
import type { MaterialBlock } from "@/lib/materials";

/**
 * Renders a study material's structured content blocks. Pure server component —
 * no interactivity, just typographic rendering with Chinese/pinyin styling.
 */
export function MaterialContent({ blocks }: { blocks: MaterialBlock[] }) {
  return (
    <div className="space-y-5">
      {blocks.map((block, i) => (
        <Block key={i} block={block} />
      ))}
    </div>
  );
}

function Block({ block }: { block: MaterialBlock }) {
  switch (block.type) {
    case "heading":
      return (
        <h2 className="flex flex-wrap items-baseline gap-2 border-b pb-1.5 pt-2 text-lg font-bold text-foreground">
          <span>{block.text}</span>
          {block.zh && <span className="font-chinese text-base font-semibold text-primary">{block.zh}</span>}
        </h2>
      );

    case "paragraph":
      return <p className="text-[15px] leading-relaxed text-foreground/90">{block.text}</p>;

    case "list":
      return block.ordered ? (
        <ol className="list-decimal space-y-1.5 pl-5 text-[15px] leading-relaxed text-foreground/90 marker:text-primary marker:font-semibold">
          {block.items.map((it, i) => (
            <li key={i}>{it}</li>
          ))}
        </ol>
      ) : (
        <ul className="list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-foreground/90 marker:text-primary">
          {block.items.map((it, i) => (
            <li key={i}>{it}</li>
          ))}
        </ul>
      );

    case "example":
      return (
        <div className="rounded-xl border bg-muted/30 p-4">
          <p className="font-chinese text-xl leading-snug text-foreground">{block.zh}</p>
          {block.pinyin && <p className="font-pinyin mt-1 text-sm text-primary/80">{block.pinyin}</p>}
          {block.vi && <p className="mt-1 text-sm text-muted-foreground">{block.vi}</p>}
        </div>
      );

    case "vocab":
      return (
        <div className="overflow-hidden rounded-xl border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-semibold">Hán tự</th>
                <th className="px-4 py-2 font-semibold">Pinyin</th>
                <th className="px-4 py-2 font-semibold">Nghĩa</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {block.items.map((it, i) => (
                <tr key={i} className="hover:bg-muted/20">
                  <td className="font-chinese px-4 py-2 text-base text-foreground">{it.zh}</td>
                  <td className="font-pinyin px-4 py-2 text-primary/80">{it.pinyin}</td>
                  <td className="px-4 py-2 text-muted-foreground">{it.vi}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "note":
      return (
        <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <p className="text-[15px] leading-relaxed text-amber-900">{block.text}</p>
        </div>
      );

    default:
      return null;
  }
}
