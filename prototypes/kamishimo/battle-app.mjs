import { createBattleState, endTurn, getLegalSummons, resolveAttackPhase, summonCreature } from "./battle-engine.mjs";

const elements = {
  status: document.querySelector("#battleStatus"),
  board: document.querySelector("#battleBoard"),
  hand: document.querySelector("#handPanel"),
  log: document.querySelector("#battleLog"),
  reset: document.querySelector("#resetButton"),
  autoSummon: document.querySelector("#autoSummonButton"),
  attack: document.querySelector("#attackButton"),
  endTurn: document.querySelector("#endTurnButton"),
};

let state;

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function loadJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.json();
}

function termName(termId) {
  return state.terms.find((term) => term.term_id === termId)?.word ?? `ID${termId}`;
}

function renderSlot(slot) {
  if (!slot) return '<div class="battle-slot empty">空き</div>';
  return `
    <div class="battle-slot">
      <strong>${escapeHtml(slot.display_name)}</strong>
      <span>C${slot.cost} A${slot.attack} HP${slot.current_hp}/${slot.hp} S${slot.speed} W${slot.weird}</span>
      <small>${slot.exhausted ? "行動済" : "攻撃可"}</small>
    </div>
  `;
}

function renderPlayer(player, index) {
  const active = state.activePlayer === index ? " active" : "";
  return `
    <article class="battle-player${active}">
      <header>
        <h2>${escapeHtml(player.name)}</h2>
        <p>ライフ ${player.life} / エネルギー ${player.energy}/${player.maxEnergy} / 山札 ${player.deck.length}</p>
      </header>
      <div class="slot-row">
        ${player.slots.map(renderSlot).join("")}
      </div>
    </article>
  `;
}

function renderHand() {
  const player = state.players[state.activePlayer];
  const legalSummons = getLegalSummons(state, state.activePlayer);
  const firstByCard = new Map();
  for (const summon of legalSummons) {
    const key = `${summon.upperIndex}-${summon.lowerIndex}`;
    if (!firstByCard.has(key)) firstByCard.set(key, summon);
  }
  const options = [...firstByCard.values()];
  elements.hand.innerHTML = `
    <header>
      <h2>${escapeHtml(player.name)}の手札</h2>
      <p>2枚を重ねて召喚。おすすめ召喚は、出せる中で高コストの句獣を優先します。</p>
    </header>
    <div class="hand-cards">
      ${player.hand
        .map(
          (termId, index) => `
            <div class="term-card">
              <span>${index + 1}</span>
              <strong>${escapeHtml(termName(termId))}</strong>
            </div>
          `,
        )
        .join("")}
    </div>
    <div class="summon-options">
      ${options
        .slice(0, 12)
        .map(
          (summon) => `
            <button type="button" data-upper="${summon.upperIndex}" data-lower="${summon.lowerIndex}" data-slot="${summon.slot}">
              ${escapeHtml(summon.creature.display_name)} / C${summon.creature.cost} / ${summon.slot + 1}列
            </button>
          `,
        )
        .join("")}
    </div>
  `;
}

function render() {
  elements.status.innerHTML = `
    <dl class="metrics">
      <div><dt>ターン</dt><dd>${state.turn}</dd></div>
      <div><dt>手番</dt><dd>${escapeHtml(state.players[state.activePlayer].name)}</dd></div>
      <div><dt>勝者</dt><dd>${state.winner === null ? "--" : escapeHtml(state.players[state.winner].name)}</dd></div>
    </dl>
  `;
  elements.board.innerHTML = state.players.map(renderPlayer).join("");
  renderHand();
  elements.log.innerHTML = state.log.slice(0, 16).map((line) => `<li>${escapeHtml(line)}</li>`).join("");
}

function autoSummon() {
  const legalSummons = getLegalSummons(state, state.activePlayer).sort((a, b) => b.creature.cost - a.creature.cost);
  if (legalSummons.length === 0) {
    state.log.unshift("召喚できる組み合わせがありません。");
  } else {
    state = summonCreature(state, legalSummons[0]);
  }
  render();
}

function bindEvents() {
  elements.reset.addEventListener("click", async () => {
    await boot();
  });
  elements.autoSummon.addEventListener("click", autoSummon);
  elements.attack.addEventListener("click", () => {
    state = resolveAttackPhase(state);
    render();
  });
  elements.endTurn.addEventListener("click", () => {
    state = endTurn(state);
    render();
  });
  elements.hand.addEventListener("click", (event) => {
    const button = event.target.closest("[data-upper]");
    if (!button) return;
    state = summonCreature(state, {
      upperIndex: Number(button.dataset.upper),
      lowerIndex: Number(button.dataset.lower),
      slot: Number(button.dataset.slot),
    });
    render();
  });
}

async function boot() {
  const [terms, creatures] = await Promise.all([
    loadJson("./data/terms-20.json"),
    loadJson("./generated/creatures-400.json"),
  ]);
  state = createBattleState({ terms, creatures });
  render();
}

bindEvents();
boot().catch((error) => {
  document.body.innerHTML = `<main class="app-shell"><p class="load-error">読み込みに失敗しました: ${escapeHtml(error.message)}</p></main>`;
});
