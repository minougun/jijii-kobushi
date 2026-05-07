const SLOT_COUNT = 3;
const STARTING_LIFE = 20;
const STARTING_MAX_ENERGY = 3;
const STARTING_HAND_SIZE = 5;

function mulberry32(seed) {
  return () => {
    let value = (seed += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(items, seed) {
  const random = mulberry32(seed);
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function draw(player, count = 1) {
  for (let index = 0; index < count; index += 1) {
    if (player.deck.length === 0) return;
    player.hand.push(player.deck.shift());
  }
}

function buildDeck(terms, seed) {
  return shuffle(
    terms.flatMap((term) => [term.term_id, term.term_id]),
    seed,
  );
}

function findCreature(creatures, upperTermId, lowerTermId) {
  const id = `${String(upperTermId).padStart(3, "0")}-${String(lowerTermId).padStart(3, "0")}`;
  return creatures.find((creature) => creature.creature_id === id);
}

function publicPlayer(player) {
  return {
    ...player,
    slots: player.slots.map((slot) => slot && { ...slot }),
  };
}

export function createBattleState({ terms, creatures, seed = 4057 }) {
  const players = [0, 1].map((playerIndex) => {
    const player = {
      name: playerIndex === 0 ? "先攻" : "後攻",
      life: STARTING_LIFE,
      maxEnergy: STARTING_MAX_ENERGY,
      energy: STARTING_MAX_ENERGY,
      deck: buildDeck(terms, seed + playerIndex * 101),
      hand: [],
      discard: [],
      slots: Array.from({ length: SLOT_COUNT }, () => null),
    };
    draw(player, STARTING_HAND_SIZE);
    return player;
  });
  return {
    activePlayer: 0,
    turn: 1,
    phase: "summon",
    winner: null,
    log: ["バトル開始。各プレイヤーは手札5枚、エネルギー3で開始。"],
    players,
    terms,
    creatures,
  };
}

export function getLegalSummons(state, playerIndex) {
  const player = state.players[playerIndex];
  const summons = [];
  for (let upperIndex = 0; upperIndex < player.hand.length; upperIndex += 1) {
    for (let lowerIndex = 0; lowerIndex < player.hand.length; lowerIndex += 1) {
      if (upperIndex === lowerIndex) continue;
      const creature = findCreature(state.creatures, player.hand[upperIndex], player.hand[lowerIndex]);
      if (!creature || creature.cost > player.energy) continue;
      for (let slot = 0; slot < SLOT_COUNT; slot += 1) {
        if (!player.slots[slot]) summons.push({ upperIndex, lowerIndex, slot, creature });
      }
    }
  }
  return summons;
}

export function summonCreature(state, { playerIndex = state.activePlayer, upperIndex, lowerIndex, slot }) {
  const next = clone(state);
  if (next.winner !== null) return next;
  if (playerIndex !== next.activePlayer) {
    next.log.unshift("現在のプレイヤーだけが召喚できます。");
    return next;
  }
  const player = next.players[playerIndex];
  if (player.slots[slot]) {
    next.log.unshift("そのスロットは埋まっています。");
    return next;
  }
  const upperTermId = player.hand[upperIndex];
  const lowerTermId = player.hand[lowerIndex];
  const creature = findCreature(next.creatures, upperTermId, lowerTermId);
  if (!creature) return next;
  if (creature.cost > player.energy) {
    next.log.unshift(`${creature.display_name}はコスト不足です。`);
    return next;
  }
  const handPair = [upperIndex, lowerIndex].sort((a, b) => b - a);
  for (const handIndex of handPair) player.hand.splice(handIndex, 1);
  player.energy -= creature.cost;
  player.slots[slot] = {
    ...creature,
    current_hp: creature.hp,
    exhausted: true,
  };
  next.log.unshift(`${player.name}が${creature.display_name}を${slot + 1}列に召喚。`);
  return next;
}

export function resolveAttackPhase(state) {
  const next = clone(state);
  if (next.winner !== null) return next;
  const attacker = next.players[next.activePlayer];
  const defenderIndex = next.activePlayer === 0 ? 1 : 0;
  const defender = next.players[defenderIndex];
  const attackers = attacker.slots
    .map((slot, index) => ({ slot, index }))
    .filter(({ slot }) => slot && !slot.exhausted)
    .sort((a, b) => b.slot.speed - a.slot.speed);

  if (attackers.length === 0) {
    next.log.unshift(`${attacker.name}の攻撃可能な句獣はいません。`);
  }

  for (const { slot: creature, index } of attackers) {
    const target = defender.slots[index];
    if (target) {
      target.current_hp -= creature.attack;
      next.log.unshift(`${creature.display_name}が正面の${target.display_name}へ${creature.attack}ダメージ。`);
      if (target.current_hp <= 0) {
        defender.discard.push(target.upper_term_id, target.lower_term_id);
        defender.slots[index] = null;
        next.log.unshift(`${target.display_name}は分解され捨て札へ。`);
      }
    } else {
      defender.life -= creature.attack;
      next.log.unshift(`${creature.display_name}が直接攻撃。${defender.name}ライフ-${creature.attack}。`);
      if (defender.life <= 0) {
        defender.life = 0;
        next.winner = next.activePlayer;
        next.log.unshift(`${attacker.name}の勝利。`);
        break;
      }
    }
    attacker.slots[index].exhausted = true;
  }
  return next;
}

export function endTurn(state) {
  const next = clone(state);
  if (next.winner !== null) return next;
  next.activePlayer = next.activePlayer === 0 ? 1 : 0;
  if (next.activePlayer === 0) next.turn += 1;
  const player = next.players[next.activePlayer];
  player.maxEnergy = Math.min(8, player.maxEnergy + 1);
  player.energy = player.maxEnergy;
  player.slots = player.slots.map((slot) => (slot ? { ...slot, exhausted: false } : null));
  draw(player, 1);
  next.phase = "summon";
  next.log.unshift(`${player.name}のターン。1枚ドロー、エネルギー${player.energy}。`);
  return next;
}

export function getPublicState(state) {
  return {
    ...state,
    players: state.players.map(publicPlayer),
  };
}
