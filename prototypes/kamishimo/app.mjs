const state = {
  terms: [],
  creatures: [],
  qa: null,
  selectedId: "001-007",
  search: "",
  rarity: "",
  body: "",
};

const selectors = {
  termCount: document.querySelector("#termCount"),
  creatureCount: document.querySelector("#creatureCount"),
  qaStatus: document.querySelector("#qaStatus"),
  upperSelect: document.querySelector("#upperSelect"),
  lowerSelect: document.querySelector("#lowerSelect"),
  swapButton: document.querySelector("#swapButton"),
  creatureFocus: document.querySelector("#creatureFocus"),
  reverseFocus: document.querySelector("#reverseFocus"),
  searchInput: document.querySelector("#searchInput"),
  rarityFilter: document.querySelector("#rarityFilter"),
  bodyFilter: document.querySelector("#bodyFilter"),
  qaPanel: document.querySelector("#qaPanel"),
  resultCount: document.querySelector("#resultCount"),
  catalogGrid: document.querySelector("#catalogGrid"),
};

const padId = (id) => String(id).padStart(3, "0");
const makeId = (upperId, lowerId) => `${padId(upperId)}-${padId(lowerId)}`;

function creatureById(id) {
  return state.creatures.find((creature) => creature.creature_id === id);
}

function termById(id) {
  return state.terms.find((term) => term.term_id === Number(id));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function statBars(creature) {
  return [
    ["攻撃", creature.attack],
    ["体力", creature.hp],
    ["速度", creature.speed],
    ["奇怪", creature.weird],
  ]
    .map(
      ([label, value]) => `
        <div class="stat-row">
          <span>${label}</span>
          <meter min="1" max="9" value="${value}">${value}</meter>
          <strong>${value}</strong>
        </div>
      `,
    )
    .join("");
}

function promptPreview(creature) {
  return escapeHtml(creature.illustration_prompt.split("\n").slice(0, 5).join(" "));
}

function creatureMarkup(creature, mode = "focus") {
  const upper = termById(creature.upper_term_id);
  const lower = termById(creature.lower_term_id);
  const synergyText = creature.synergies.length ? creature.synergies.join(" / ") : "なし";
  return `
    <div class="creature-card ${mode}">
      <div class="creature-visual" aria-hidden="true">
        <span>${escapeHtml(lower.word)}</span>
      </div>
      <div class="creature-copy">
        <div class="creature-title-row">
          <div>
            <p class="id-label">${escapeHtml(creature.creature_id)}</p>
            <h2>${escapeHtml(creature.display_name)}</h2>
          </div>
          <span class="rarity ${escapeHtml(creature.rarity.replaceAll(" ", "-").toLowerCase())}">
            ${escapeHtml(creature.rarity)}
          </span>
        </div>
        <dl class="identity">
          <div><dt>性質</dt><dd>${escapeHtml(upper.word)} / ${escapeHtml(upper.upper_effect_name)}</dd></div>
          <div><dt>本体</dt><dd>${escapeHtml(lower.word)} / ${escapeHtml(lower.lower_effect_name)}</dd></div>
          <div><dt>属性</dt><dd>${escapeHtml(creature.attribute_sub)} -> ${escapeHtml(creature.attribute_main)}</dd></div>
          <div><dt>相性</dt><dd>${escapeHtml(synergyText)}</dd></div>
        </dl>
        <div class="stats">${statBars(creature)}</div>
        <div class="ability">
          <strong>${escapeHtml(creature.ability_name)}</strong>
          <p>${escapeHtml(creature.ability_text)}</p>
        </div>
        <p class="flavor">${escapeHtml(creature.flavor_text)}</p>
        <details>
          <summary>画像プロンプト</summary>
          <p>${promptPreview(creature)}</p>
        </details>
      </div>
    </div>
  `;
}

function compactCard(creature) {
  return `
    <button class="catalog-card" type="button" data-creature-id="${escapeHtml(creature.creature_id)}">
      <span class="catalog-id">${escapeHtml(creature.creature_id)}</span>
      <strong>${escapeHtml(creature.display_name)}</strong>
      <span>上:${escapeHtml(creature.trait)} 下:${escapeHtml(creature.body)}</span>
      <span class="catalog-stats">C${creature.cost} A${creature.attack} H${creature.hp} S${creature.speed} W${creature.weird}</span>
    </button>
  `;
}

function renderSelectors() {
  const options = state.terms
    .map((term) => `<option value="${term.term_id}">${padId(term.term_id)} ${escapeHtml(term.word)}</option>`)
    .join("");
  selectors.upperSelect.innerHTML = options;
  selectors.lowerSelect.innerHTML = options;
  selectors.upperSelect.value = "1";
  selectors.lowerSelect.value = "7";

  const rarities = [...new Set(state.creatures.map((creature) => creature.rarity))].sort();
  selectors.rarityFilter.insertAdjacentHTML(
    "beforeend",
    rarities.map((rarity) => `<option value="${escapeHtml(rarity)}">${escapeHtml(rarity)}</option>`).join(""),
  );

  selectors.bodyFilter.insertAdjacentHTML(
    "beforeend",
    state.terms
      .map((term) => `<option value="${escapeHtml(term.word)}">${padId(term.term_id)} ${escapeHtml(term.word)}</option>`)
      .join(""),
  );
}

function renderMetrics() {
  const qaFailures =
    state.qa.duplicateIds.length + state.qa.abilityWarnings.length + state.qa.imagePromptWarnings.length;
  selectors.termCount.textContent = String(state.terms.length);
  selectors.creatureCount.textContent = String(state.creatures.length);
  selectors.qaStatus.textContent = qaFailures === 0 ? "OK" : `${qaFailures}件`;
  selectors.qaPanel.innerHTML = `
    <h2>QA</h2>
    <dl>
      <div><dt>ID重複</dt><dd>${state.qa.duplicateIds.length}</dd></div>
      <div><dt>禁止級能力</dt><dd>${state.qa.abilityWarnings.length}</dd></div>
      <div><dt>Prompt欠落</dt><dd>${state.qa.imagePromptWarnings.length}</dd></div>
      <div><dt>逆順サンプル</dt><dd>${state.qa.samePairChecks.filter((item) => item.pass).length}/${state.qa.samePairChecks.length}</dd></div>
      <div><dt>逆順弱差</dt><dd>${state.qa.weakReversePairs?.length ?? 0}</dd></div>
      <div><dt>調整候補</dt><dd>${state.qa.outOfBandPower.length}</dd></div>
    </dl>
  `;
}

function renderFocus() {
  const selected = creatureById(state.selectedId) ?? state.creatures[0];
  const reverse = creatureById(makeId(selected.lower_term_id, selected.upper_term_id));
  selectors.upperSelect.value = String(selected.upper_term_id);
  selectors.lowerSelect.value = String(selected.lower_term_id);
  selectors.creatureFocus.innerHTML = creatureMarkup(selected);
  selectors.reverseFocus.innerHTML = `
    <div class="reverse-label">
      <span>逆順比較</span>
      <strong>${escapeHtml(reverse.display_name)}</strong>
    </div>
    ${creatureMarkup(reverse, "reverse")}
  `;
}

function filteredCreatures() {
  const query = state.search.trim().toLowerCase();
  return state.creatures.filter((creature) => {
    const haystack = [
      creature.display_name,
      creature.raw_name,
      creature.creature_id,
      creature.body,
      creature.trait,
      creature.rarity,
      creature.ability_name,
      creature.ability_text,
    ]
      .join(" ")
      .toLowerCase();
    if (query && !haystack.includes(query)) return false;
    if (state.rarity && creature.rarity !== state.rarity) return false;
    if (state.body && creature.body !== state.body) return false;
    return true;
  });
}

function renderCatalog() {
  const rows = filteredCreatures().slice(0, 80);
  selectors.resultCount.textContent = `${filteredCreatures().length}件中 ${rows.length}件表示`;
  selectors.catalogGrid.innerHTML = rows.map(compactCard).join("");
}

function selectFromControls() {
  state.selectedId = makeId(selectors.upperSelect.value, selectors.lowerSelect.value);
  renderFocus();
}

function bindEvents() {
  selectors.upperSelect.addEventListener("change", selectFromControls);
  selectors.lowerSelect.addEventListener("change", selectFromControls);
  selectors.swapButton.addEventListener("click", () => {
    const upper = selectors.upperSelect.value;
    selectors.upperSelect.value = selectors.lowerSelect.value;
    selectors.lowerSelect.value = upper;
    selectFromControls();
  });
  selectors.searchInput.addEventListener("input", (event) => {
    state.search = event.target.value;
    renderCatalog();
  });
  selectors.rarityFilter.addEventListener("change", (event) => {
    state.rarity = event.target.value;
    renderCatalog();
  });
  selectors.bodyFilter.addEventListener("change", (event) => {
    state.body = event.target.value;
    renderCatalog();
  });
  selectors.catalogGrid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-creature-id]");
    if (!button) return;
    state.selectedId = button.dataset.creatureId;
    renderFocus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

async function loadJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.json();
}

async function main() {
  const [terms, creatures, qa] = await Promise.all([
    loadJson("./data/terms-20.json"),
    loadJson("./generated/creatures-400.json"),
    loadJson("./generated/qa-report.json"),
  ]);
  state.terms = terms;
  state.creatures = creatures;
  state.qa = qa;
  renderSelectors();
  renderMetrics();
  renderFocus();
  renderCatalog();
  bindEvents();
}

main().catch((error) => {
  document.body.innerHTML = `<main class="app-shell"><p class="load-error">読み込みに失敗しました: ${escapeHtml(error.message)}</p></main>`;
});
