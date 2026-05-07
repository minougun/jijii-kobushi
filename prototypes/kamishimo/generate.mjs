import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "data");
const generatedDir = path.join(__dirname, "generated");

const terms = JSON.parse(await readFile(path.join(dataDir, "terms-20.json"), "utf8"));
const synergyRules = JSON.parse(await readFile(path.join(dataDir, "synergy-rules.json"), "utf8"));
const specialNames = JSON.parse(await readFile(path.join(dataDir, "special-names.json"), "utf8"));

const clamp = (value, min = 1, max = 9) => Math.max(min, Math.min(max, value));
const padId = (id) => String(id).padStart(3, "0");
const creatureId = (upper, lower) => `${padId(upper.term_id)}-${padId(lower.term_id)}`;
const hasTag = (term, tag) => term.tags.includes(tag);

function findSynergies(upper, lower) {
  return synergyRules.filter((rule) => hasTag(upper, rule.upper_tag) && hasTag(lower, rule.lower_tag));
}

function costFor(lower, upper, synergies, stats) {
  const statPower = stats.attack * 1.2 + stats.hp + stats.speed * 0.8 + stats.weird * 0.7;
  const abilityWeight = 1.5 + synergies.length * 0.8 + Math.max(0, upper.base_cost - 3) * 0.3;
  const generatedCost = Math.round((statPower + abilityWeight) / 4);
  const floor = Math.max(1, lower.base_cost - 1);
  return clamp(Math.max(floor, generatedCost), 1, 8);
}

function abilityScore(creature) {
  let score = 1.5;
  score += creature.synergies.length * 0.8;
  if (creature.ability_text.includes("カードを1枚引く")) score += 0.8;
  if (creature.ability_text.includes("攻撃+2")) score += 1.0;
  if (creature.ability_text.includes("反撃できない")) score += 0.8;
  if (creature.ability_text.includes("再合成")) score += 1.2;
  if (creature.ability_text.includes("自分に1ダメージ")) score -= 0.6;
  return Number(score.toFixed(1));
}

function powerScore(creature) {
  return Number(
    (
      creature.attack * 1.2 +
      creature.hp * 1.0 +
      creature.speed * 0.8 +
      creature.weird * 0.7 +
      creature.ability_score -
      creature.cost * 2.0
    ).toFixed(2),
  );
}

function expectedPowerBand(cost) {
  const low = cost * 2;
  return { low, high: low + 2 };
}

function balanceStatus(creature) {
  const band = expectedPowerBand(creature.cost);
  if (creature.power_score < band.low - 4 || creature.power_score > band.high + 4) return "needs_review";
  return "auto_pass";
}

function rarityFor(upper, lower, synergies, stats) {
  if (upper.term_id === lower.term_id && ["魔王", "鬼", "透明", "暴走", "呪い"].includes(upper.word)) return "Mythic";
  if (upper.word === "最終" || lower.word === "最終") return "Legendary";
  if (synergies.length >= 2 || stats.weird >= 8) return "Super Rare";
  if (synergies.length === 1 || upper.base_cost >= 5 || lower.base_cost >= 5) return "Rare";
  return "Common";
}

function buildPrompt(name, upper, lower) {
  return [
    "カードゲーム用のオリジナルクリーチャーイラスト。",
    `名称：${name}。`,
    `本体：${lower.visual_core}`,
    `性質：${upper.visual_modifier}`,
    "雰囲気：コミカルだが迫力がある、和風ファンタジー、子ども向けでも怖すぎない。",
    "構図：全身が見える、中央配置、カードイラスト向け、背景は簡潔。",
    "最重要：下の句の本体が見た目の主役として一目で分かる。",
    "禁止：文字、ロゴ、既存キャラクター風、写真風、過度な流血、性的表現。",
  ].join("\n");
}

function buildCreature(upper, lower) {
  const id = creatureId(upper, lower);
  const rawName = `${upper.word}${lower.word}`;
  const displayName = specialNames[id] ?? rawName;
  const synergies = findSynergies(upper, lower);
  const synergyStats = synergies.reduce(
    (acc, rule) => ({
      attack: acc.attack + rule.attack,
      hp: acc.hp + rule.hp,
      speed: acc.speed + rule.speed,
      weird: acc.weird + rule.weird,
    }),
    { attack: 0, hp: 0, speed: 0, weird: 0 },
  );
  const stats = {
    attack: clamp(lower.base_attack + upper.upper_attack_mod + synergyStats.attack),
    hp: clamp(lower.base_hp + upper.upper_hp_mod + synergyStats.hp),
    speed: clamp(lower.base_speed + upper.upper_speed_mod + synergyStats.speed),
    weird: clamp(lower.base_weird + upper.upper_weird_mod + synergyStats.weird),
  };
  if (upper.term_id !== lower.term_id) {
    if (upper.term_id < lower.term_id) {
      stats.speed = clamp(stats.speed + 1);
    } else {
      stats.weird = clamp(stats.weird + 1);
    }
  }
  const abilityParts = [
    `${upper.upper_effect_name}：${upper.upper_effect_text}`,
    `${lower.lower_effect_name}：${lower.lower_effect_text}`,
    ...synergies.map((rule) => `${rule.name}：${rule.bonus_text}`),
  ];
  const creature = {
    creature_id: id,
    upper_term_id: upper.term_id,
    lower_term_id: lower.term_id,
    raw_name: rawName,
    display_name: displayName,
    body: lower.word,
    trait: upper.word,
    attribute_main: lower.attribute,
    attribute_sub: upper.attribute,
    cost: 0,
    attack: stats.attack,
    hp: stats.hp,
    speed: stats.speed,
    weird: stats.weird,
    ability_name: synergies[0] ? `${upper.upper_effect_name}${synergies[0].name}` : `${upper.upper_effect_name}${lower.lower_effect_name}`,
    ability_text: abilityParts.join(" / "),
    flavor_text: `「${lower.word}を主役に、${upper.word}の性質をまとった一句の怪物。」`,
    rarity: rarityFor(upper, lower, synergies, stats),
    synergies: synergies.map((rule) => rule.name),
    illustration_prompt: buildPrompt(displayName, upper, lower),
    image_path: `creatures/${padId(upper.term_id)}_${padId(lower.term_id)}_${rawName}.png`,
    image_seed: upper.term_id * 1000 + lower.term_id,
    image_status: "pending",
    balance_status: "unchecked",
    qa_status: "auto_pass",
  };
  creature.cost = costFor(lower, upper, synergies, stats);
  creature.ability_score = abilityScore(creature);
  creature.power_score = powerScore(creature);
  creature.balance_status = balanceStatus(creature);
  return creature;
}

function toCsv(rows) {
  const headers = [
    "creature_id",
    "display_name",
    "body",
    "trait",
    "attribute_main",
    "attribute_sub",
    "cost",
    "attack",
    "hp",
    "speed",
    "weird",
    "rarity",
    "power_score",
    "ability_name",
    "ability_text",
  ];
  const escape = (value) => {
    const text = Array.isArray(value) ? value.join("/") : String(value ?? "");
    return `"${text.replaceAll('"', '""')}"`;
  };
  return [headers.join(","), ...rows.map((row) => headers.map((header) => escape(row[header])).join(","))].join("\n");
}

function buildQa(creatures) {
  const duplicateIds = creatures
    .map((creature) => creature.creature_id)
    .filter((id, index, ids) => ids.indexOf(id) !== index);
  const outOfBandPower = creatures.filter((creature) => {
    const band = expectedPowerBand(creature.cost);
    return creature.power_score < band.low - 4 || creature.power_score > band.high + 4;
  });
  const abilityWarnings = creatures.filter((creature) =>
    ["無限", "即死", "何もできない", "永続ロック"].some((word) => creature.ability_text.includes(word)),
  );
  const imagePromptWarnings = creatures.filter((creature) =>
    ["文字", "ロゴ", "既存キャラクター"].some((word) => !creature.illustration_prompt.includes(word)),
  );
  const samePairChecks = creatures
    .filter((creature) => creature.upper_term_id < creature.lower_term_id)
    .map((creature) => {
      const reverse = creatures.find(
        (candidate) =>
          candidate.upper_term_id === creature.lower_term_id && candidate.lower_term_id === creature.upper_term_id,
      );
      const statDelta =
        Math.abs(creature.attack - reverse.attack) +
        Math.abs(creature.hp - reverse.hp) +
        Math.abs(creature.speed - reverse.speed) +
        Math.abs(creature.weird - reverse.weird);
      return {
        pair: `${creature.display_name} / ${reverse.display_name}`,
        stat_delta: statDelta,
        different_body: creature.body !== reverse.body,
        different_ability: creature.ability_name !== reverse.ability_name,
        pass: statDelta > 0 && creature.body !== reverse.body && creature.ability_name !== reverse.ability_name,
      };
    });
  const weakReversePairs = samePairChecks.filter((check) => !check.pass);
  return {
    generated_at: new Date().toISOString(),
    term_count: terms.length,
    creature_count: creatures.length,
    duplicateIds,
    status_counts: {
      pending_images: creatures.filter((creature) => creature.image_status === "pending").length,
      unchecked_qa: creatures.filter((creature) => creature.qa_status === "unchecked").length,
      balance_needs_review: creatures.filter((creature) => creature.balance_status === "needs_review").length,
    },
    cost_distribution: Object.fromEntries(
      Array.from({ length: 8 }, (_, index) => {
        const cost = index + 1;
        return [cost, creatures.filter((creature) => creature.cost === cost).length];
      }),
    ),
    rarity_distribution: ["Common", "Rare", "Super Rare", "Legendary", "Mythic"].reduce((acc, rarity) => {
      acc[rarity] = creatures.filter((creature) => creature.rarity === rarity).length;
      return acc;
    }, {}),
    samePairChecks,
    weakReversePairs,
    outOfBandPower: outOfBandPower.map((creature) => ({
      creature_id: creature.creature_id,
      display_name: creature.display_name,
      cost: creature.cost,
      power_score: creature.power_score,
      expected: expectedPowerBand(creature.cost),
    })),
    abilityWarnings: abilityWarnings.map((creature) => creature.creature_id),
    imagePromptWarnings: imagePromptWarnings.map((creature) => creature.creature_id),
  };
}

function starterReference(creatures) {
  const requiredIds = [
    "001-007",
    "007-001",
    "004-002",
    "002-004",
    "014-016",
    "016-014",
    "019-017",
    "017-019",
    "010-012",
    "012-010",
    "020-009",
    "009-020",
    "018-015",
    "015-018",
    "005-006",
    "006-005",
  ];
  const picked = requiredIds.map((id) => creatures.find((creature) => creature.creature_id === id)).filter(Boolean);
  const seenIds = new Set(picked.map((creature) => creature.creature_id));
  const bodyCounts = picked.reduce((counts, creature) => {
    counts.set(creature.body, (counts.get(creature.body) ?? 0) + 1);
    return counts;
  }, new Map());
  const candidates = [...creatures].sort((a, b) => {
    const rarityScore = { Mythic: 5, Legendary: 4, "Super Rare": 3, Rare: 2, Common: 1 };
    return (
      rarityScore[b.rarity] - rarityScore[a.rarity] ||
      b.synergies.length - a.synergies.length ||
      b.weird - a.weird ||
      a.creature_id.localeCompare(b.creature_id)
    );
  });
  for (const creature of candidates) {
    if (picked.length >= 40) break;
    if (seenIds.has(creature.creature_id)) continue;
    if ((bodyCounts.get(creature.body) ?? 0) >= 2 && picked.length < 32) continue;
    picked.push(creature);
    seenIds.add(creature.creature_id);
    bodyCounts.set(creature.body, (bodyCounts.get(creature.body) ?? 0) + 1);
  }
  for (const creature of candidates) {
    if (picked.length >= 40) break;
    if (seenIds.has(creature.creature_id)) continue;
    picked.push(creature);
    seenIds.add(creature.creature_id);
  }
  const lines = [
    "# 句獣大戦 カミシモ 代表カード参照",
    "",
    "紙プレイテストで最初に参照する代表クリーチャーです。",
    "",
    "| ID | 名称 | コスト | 攻撃 | 体力 | 速度 | 奇怪 | 能力 |",
    "| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |",
    ...picked.map(
      (creature) =>
        `| ${creature.creature_id} | ${creature.display_name} | ${creature.cost} | ${creature.attack} | ${creature.hp} | ${creature.speed} | ${creature.weird} | ${creature.ability_name} |`,
    ),
    "",
    "## 画像生成優先候補",
    "",
    ...picked.map(
      (creature) =>
        `- ${creature.display_name}: 下の句「${creature.body}」が本体に見えるか、逆順との差を確認する。`,
    ),
  ];
  return `${lines.join("\n")}\n`;
}

await mkdir(generatedDir, { recursive: true });

const creatures = terms.flatMap((upper) => terms.map((lower) => buildCreature(upper, lower)));
const qa = buildQa(creatures);

await writeFile(path.join(generatedDir, "creatures-400.json"), `${JSON.stringify(creatures, null, 2)}\n`);
await writeFile(path.join(generatedDir, "creatures-400.csv"), `${toCsv(creatures)}\n`);
await writeFile(path.join(generatedDir, "qa-report.json"), `${JSON.stringify(qa, null, 2)}\n`);
await writeFile(path.join(generatedDir, "starter-reference.md"), starterReference(creatures));

if (
  qa.duplicateIds.length > 0 ||
  qa.abilityWarnings.length > 0 ||
  qa.imagePromptWarnings.length > 0 ||
  qa.weakReversePairs.length > 0
) {
  console.error(JSON.stringify(qa, null, 2));
  process.exitCode = 1;
} else {
  console.log(`Generated ${creatures.length} creatures from ${terms.length} terms.`);
  console.log(`Reverse pair checks: ${qa.samePairChecks.length - qa.weakReversePairs.length}/${qa.samePairChecks.length} passed`);
  console.log(`Out-of-band balance candidates: ${qa.outOfBandPower.length}`);
  console.log(`Wrote ${path.relative(process.cwd(), generatedDir)}`);
}
