# Bulk seed content (`prisma/seed-data/*.json`)

Every `.json` file here is loaded idempotently by `prisma/seed.ts` (`loadSeedData`)
on `npm run db:seed` — which Railway runs on every deploy. Each file has a `kind`
discriminator and a payload array. All IDs are deterministic so re-running upserts
instead of duplicating. Chinese = simplified; pinyin uses tone marks (nǐ hǎo).

## Shapes

- **vocab / grammar**: `{ kind, units: [{ id, title, titleZh, hskLevel, order, lessons: [{ id, title, order, exercises: [...] }] }] }`
  - vocab exercises: `match` | `translate` | `toneSelect` | `pinyinMatch` | `sentenceOrder`
  - grammar exercises: `fill_blank` | `sentence_order` | `translate`
- **hanzi**: `{ kind, characters: [{ id, character, pinyin, tone, meaning, hskLevel, strokeCount, examples: [{ sentence, pinyin, meaning }] }] }`
- **reading**: `{ kind, tests: [{ id, title, titleZh, hskLevel, passage, passagePinyin?, timeLimit, questions: [...] }] }`
- **listening**: `{ kind, tests: [{ id, title, hskLevel, audioUrl, transcript, timeLimit, questions: [...] }] }`
  - question: `{ id, type: "MCQ"|"TRUE_FALSE"|"FILL_BLANK", prompt, promptPinyin?, options?: [{text,pinyin?}], correctAnswer, explanation?, order }`
- **writing**: `{ kind, tasks: [{ id, taskType: "FREE"|"GUIDED"|"PICTURE_DESCRIPTION", prompt, promptZh?, minChars, timeLimit, hskLevel }] }`
- **speaking**: `{ kind, sets: [{ id, title, hskLevel, part1Sentences: [{text,pinyin}], part2Passage: {text,pinyin}, part3Questions: [{question,pinyin}] }] }`
- **materials**: `{ kind, materials: [{ id, title, titleZh?, category, hskLevel, summary, readMinutes, order, tags: [], content: [block...] }] }`
  - blocks: `heading{text,zh?}` | `paragraph{text}` | `list{ordered?,items[]}` | `example{zh,pinyin?,vi?}` | `vocab{items:[{zh,pinyin,vi}]}` | `note{text}`
