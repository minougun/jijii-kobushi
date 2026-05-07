import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "generated", "full-set");

const groups = [
  ["人物・職業", ["爺", "婆", "番長", "忍者", "侍", "博士", "王様", "姫", "僧侶", "商人"]],
  ["学校・生活", ["受験", "宿題", "赤点", "合格", "部活", "文化祭", "校長", "黒板", "消しゴム", "給食"]],
  ["身体・武器", ["コブシ", "牙", "角", "翼", "尻尾", "目玉", "背骨", "鎧", "鉄球", "大砲"]],
  ["自然・天体", ["火山", "雷", "嵐", "雪", "砂漠", "森", "海", "月", "太陽", "星"]],
  ["動物", ["猫", "犬", "蛙", "鴉", "鯨", "蛇", "蜘蛛", "鮫", "狐", "亀"]],
  ["感情・概念", ["怒り", "涙", "笑い", "眠り", "夢", "記憶", "勇気", "嘘", "影", "光"]],
  ["怪異・ファンタジー", ["鬼", "天狗", "河童", "幽霊", "妖精", "魔王", "勇者", "魔法", "呪い", "祈り"]],
  ["道具・食べ物", ["鍋", "団子", "饅頭", "傘", "提灯", "鏡", "時計", "磁石", "歯車", "鍵"]],
  ["場所・乗り物・SF", ["祭り", "屋台", "温泉", "畳", "路地", "地下", "電車", "ロボ", "宇宙", "時空"]],
  ["変質・特殊", ["早口", "無口", "巨大", "極小", "逆立ち", "透明", "分身", "暴走", "変身", "最終"]],
];

const profileByGroup = {
  "人物・職業": { attribute: "知", tags: ["人物"], cost: 3, attack: 3, hp: 5, speed: 3, weird: 3, mod: [0, 1, 0, 1], visual: "人物型の本体。表情、衣装、持ち物で役割が分かる。" },
  "学校・生活": { attribute: "学", tags: ["学校"], cost: 3, attack: 2, hp: 5, speed: 2, weird: 5, mod: [0, 0, -1, 2], visual: "学校や生活道具が怪物化した本体。日常の記号がはっきり見える。" },
  "身体・武器": { attribute: "武", tags: ["身体", "武器"], cost: 3, attack: 5, hp: 4, speed: 3, weird: 2, mod: [2, 0, 0, 0], visual: "身体部位や武器を主役にした戦闘的な本体。輪郭が強い。" },
  "自然・天体": { attribute: "然", tags: ["自然"], cost: 4, attack: 4, hp: 4, speed: 4, weird: 4, mod: [1, 0, 1, 1], visual: "自然現象や天体をまとった大きな本体。環境エフェクトがある。" },
  動物: { attribute: "獣", tags: ["動物", "獣"], cost: 3, attack: 4, hp: 4, speed: 5, weird: 2, mod: [1, 0, 1, 0], visual: "動物型の本体。シルエットと顔で種が分かる。" },
  "感情・概念": { attribute: "心", tags: ["概念"], cost: 4, attack: 2, hp: 4, speed: 3, weird: 7, mod: [0, 0, 0, 2], visual: "感情や概念が形を持った抽象的な本体。記号と表情で意味が伝わる。" },
  "怪異・ファンタジー": { attribute: "怪", tags: ["怪異"], cost: 5, attack: 5, hp: 5, speed: 3, weird: 6, mod: [1, 0, 0, 2], visual: "怪異やファンタジー存在の本体。和風の怪物らしい特徴がある。" },
  "道具・食べ物": { attribute: "物", tags: ["道具"], cost: 3, attack: 2, hp: 6, speed: 2, weird: 4, mod: [0, 2, -1, 1], visual: "道具や食べ物が動き出した本体。質感と用途が分かる。" },
  "場所・乗り物・SF": { attribute: "機", tags: ["場所", "機械"], cost: 4, attack: 4, hp: 5, speed: 3, weird: 5, mod: [1, 1, 0, 1], visual: "場所や乗り物やSF要素が怪物化した本体。スケール感がある。" },
  "変質・特殊": { attribute: "変", tags: ["特殊"], cost: 5, attack: 4, hp: 4, speed: 4, weird: 7, mod: [1, -1, 1, 2], visual: "変質した状態そのものが本体。普通ではない姿勢や質感が目立つ。" },
};

const overrides = {
  爺: { tags: ["人物", "老人", "知恵"], visual: "白髭、しわ、杖、丸眼鏡、猫背の老人型本体。" },
  番長: { tags: ["人物", "不良", "学校"], attribute: "武", visual: "学ラン、学帽、鋭い目、腕組みの番長型本体。" },
  受験: { tags: ["学校", "概念", "努力"], visual: "試験問題、答案用紙、机、鉛筆が一体化した本体。" },
  コブシ: { tags: ["身体", "武器", "打撃"], attribute: "武", visual: "岩のように巨大な拳、太い指、血管、衝撃波。" },
  猫: { tags: ["動物", "獣", "俊敏"], visual: "しなやかな猫型本体。大きな目、尻尾、軽い足取り。" },
  鬼: { tags: ["怪異", "鬼", "武器"], visual: "角と金棒を持つ鬼型本体。牙、虎柄、力強い体格。" },
  魔王: { tags: ["怪異", "魔王", "支配"], attribute: "闇", visual: "角、マント、王冠、玉座、黒いオーラの魔王型本体。" },
  饅頭: { tags: ["食べ物", "丸い", "甘味"], attribute: "食", visual: "大きく丸い饅頭型本体。割れ目から餡が少し見える。" },
  透明: { tags: ["特殊", "透明", "暗殺"], visual: "輪郭だけが見える透明な本体。背景のゆがみで存在が分かる。" },
  暴走: { tags: ["特殊", "暴走", "不安定"], visual: "制御を失ったエネルギーの本体。割れた装甲、赤い目、荒い動き。" },
};

const specialNames = {
  "001-001": "双爺",
  "003-003": "大番長",
  "011-011": "無限受験",
  "041-041": "猫又",
  "066-066": "大魔王",
  "100-100": "最終形態",
};

const clamp = (value, min = 1, max = 9) => Math.max(min, Math.min(max, value));
const pad = (id) => String(id).padStart(3, "0");

function buildTerms() {
  let id = 1;
  return groups.flatMap(([group, words]) =>
    words.map((word) => {
      const profile = profileByGroup[group];
      const override = overrides[word] ?? {};
      const [attackMod, hpMod, speedMod, weirdMod] = profile.mod;
      const tags = override.tags ?? profile.tags;
      const visual = override.visual ?? `${word}を主役にした本体。${profile.visual}`;
      return {
        term_id: id++,
        word,
        kana: word,
        category: group,
        attribute: override.attribute ?? profile.attribute,
        tags,
        upper_effect_name: `${word}化`,
        upper_effect_text: `${word}の性質を与える。${tags[0]}タグと相性がよい。`,
        lower_effect_name: `${word}体`,
        lower_effect_text: `${word}を本体として場に出る。`,
        base_cost: profile.cost,
        base_attack: profile.attack,
        base_hp: profile.hp,
        base_speed: profile.speed,
        base_weird: profile.weird,
        upper_attack_mod: attackMod,
        upper_hp_mod: hpMod,
        upper_speed_mod: speedMod,
        upper_weird_mod: weirdMod,
        visual_core: visual,
        visual_modifier: `${word}らしい意匠、質感、動き、雰囲気を本体へ重ねる。`,
      };
    }),
  );
}

function synergy(upper, lower) {
  const names = [];
  let attack = 0;
  let hp = 0;
  let speed = 0;
  let weird = 0;
  if (upper.tags.includes("学校") && lower.tags.includes("不良")) {
    names.push("校内抗争");
    weird += 1;
  }
  if (upper.tags.includes("老人") && lower.tags.includes("武器")) {
    names.push("熟練");
    attack += 1;
    speed -= 1;
  }
  if (upper.tags.includes("動物") && lower.tags.includes("怪異")) {
    names.push("妖獣");
    attack += 1;
    weird += 1;
  }
  if (upper.tags.includes("食べ物") && lower.tags.includes("魔王")) {
    names.push("暴食支配");
    hp += 1;
    weird += 1;
  }
  if (upper.tags.includes("特殊") && lower.tags.includes("機械")) {
    names.push("異常機構");
    attack += 1;
    weird += 1;
  }
  if (upper.tags.includes("概念") && lower.tags.includes("概念")) {
    names.push("抽象怪異");
    weird += 1;
  }
  return { names, attack, hp, speed, weird };
}

function buildCreature(upper, lower) {
  const id = `${pad(upper.term_id)}-${pad(lower.term_id)}`;
  const rawName = `${upper.word}${lower.word}`;
  const syn = synergy(upper, lower);
  const attack = clamp(lower.base_attack + upper.upper_attack_mod + syn.attack);
  const hp = clamp(lower.base_hp + upper.upper_hp_mod + syn.hp);
  const speed = clamp(lower.base_speed + upper.upper_speed_mod + syn.speed + (upper.term_id < lower.term_id ? 1 : 0));
  const weird = clamp(lower.base_weird + upper.upper_weird_mod + syn.weird + (upper.term_id > lower.term_id ? 1 : 0));
  const nonCostPower = attack * 1.2 + hp + speed * 0.8 + weird * 0.7 + 2 + syn.names.length * 0.8;
  const cost = clamp(Math.round(nonCostPower / 4), 1, 8);
  const powerScore = Number((nonCostPower - cost * 2).toFixed(2));
  return {
    creature_id: id,
    upper_term_id: upper.term_id,
    lower_term_id: lower.term_id,
    raw_name: rawName,
    display_name: specialNames[id] ?? rawName,
    body: lower.word,
    trait: upper.word,
    attribute_main: lower.attribute,
    attribute_sub: upper.attribute,
    cost,
    attack,
    hp,
    speed,
    weird,
    ability_name: syn.names[0] ? `${upper.word}${syn.names[0]}` : `${upper.word}化${lower.word}体`,
    ability_text: `${upper.upper_effect_text} / ${lower.lower_effect_text}${syn.names.length ? ` / 合成:${syn.names.join("・")}` : ""}`,
    rarity: syn.names.length ? "Rare" : "Common",
    power_score: powerScore,
    illustration_prompt: [
      "カードゲーム用のオリジナルクリーチャーイラスト。",
      `名称：${specialNames[id] ?? rawName}。`,
      `本体：${lower.visual_core}`,
      `性質：${upper.visual_modifier}`,
      "下の句の本体が主役。コミカルな和風ファンタジー。文字、ロゴ、既存キャラクター風は禁止。",
    ].join("\n"),
    image_status: "pending",
    balance_status: "auto_pass",
    qa_status: "auto_pass",
  };
}

function toCsv(rows) {
  const headers = ["creature_id", "display_name", "body", "trait", "cost", "attack", "hp", "speed", "weird", "ability_name"];
  const escape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  return [headers.join(","), ...rows.map((row) => headers.map((header) => escape(row[header])).join(","))].join("\n");
}

function buildQa(terms, creatures) {
  const ids = creatures.map((creature) => creature.creature_id);
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
  const reversePairs = creatures
    .filter((creature) => creature.upper_term_id < creature.lower_term_id)
    .map((creature) => {
      const reverseId = `${pad(creature.lower_term_id)}-${pad(creature.upper_term_id)}`;
      const reverse = creatures.find((candidate) => candidate.creature_id === reverseId);
      const statDelta =
        Math.abs(creature.attack - reverse.attack) +
        Math.abs(creature.hp - reverse.hp) +
        Math.abs(creature.speed - reverse.speed) +
        Math.abs(creature.weird - reverse.weird);
      return {
        pair: `${creature.display_name}/${reverse.display_name}`,
        pass: creature.body !== reverse.body && creature.ability_name !== reverse.ability_name && statDelta > 0,
      };
    });
  return {
    generated_at: new Date().toISOString(),
    term_count: terms.length,
    creature_count: creatures.length,
    duplicateIds,
    reverse_pair_count: reversePairs.length,
    weakReversePairs: reversePairs.filter((pair) => !pair.pass),
    pending_images: creatures.filter((creature) => creature.image_status === "pending").length,
  };
}

await mkdir(outDir, { recursive: true });
const terms = buildTerms();
const creatures = terms.flatMap((upper) => terms.map((lower) => buildCreature(upper, lower)));
const qa = buildQa(terms, creatures);

await writeFile(path.join(outDir, "terms-100.json"), `${JSON.stringify(terms, null, 2)}\n`);
await writeFile(path.join(outDir, "creatures-10000.json"), `${JSON.stringify(creatures)}\n`);
await writeFile(path.join(outDir, "creatures-10000.csv"), `${toCsv(creatures)}\n`);
await writeFile(path.join(outDir, "qa-report.json"), `${JSON.stringify(qa, null, 2)}\n`);

if (terms.length !== 100 || creatures.length !== 10000 || qa.duplicateIds.length || qa.weakReversePairs.length) {
  console.error(JSON.stringify(qa, null, 2));
  process.exitCode = 1;
} else {
  console.log(`Generated ${creatures.length} creatures from ${terms.length} terms.`);
  console.log(`Reverse pair checks: ${qa.reverse_pair_count}/${qa.reverse_pair_count} passed`);
  console.log(`Wrote ${path.relative(process.cwd(), outDir)}`);
}
