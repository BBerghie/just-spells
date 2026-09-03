function createSourceSpellId(rawSpell) {
  const identity = [
    rawSpell.title,
    rawSpell.englishTitle,
    rawSpell.type,
    rawSpell.level,
  ].join("\u001f");
  let hash = 2166136261;

  for (let i = 0; i < identity.length; i++) {
    hash ^= identity.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return `source-spell-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function normalizeSpell(rawSpell) {
  return {
    id: createSourceSpellId(rawSpell),
    title: rawSpell.title,
    enTitle: rawSpell.englishTitle,
    description: rawSpell.description,
    actionType: rawSpell.actionType,
    castTime: rawSpell.castTime,
    area: rawSpell.area,
    objectives: rawSpell.objectives,
    heightenings: rawSpell.heightenings,
    level: rawSpell.level,
    traditions: rawSpell.traditions,
    trigger: rawSpell.trigger,
    type: rawSpell.type,
    range: rawSpell.range,
    duration: rawSpell.duration,
  };
}

const SPELL_SESSION_STORAGE_KEY = "just-spells.session.v1";

function createEmptySpellSession() {
  return {
    editedSpells: {},
    customSpells: [],
    editedAlchemicalItems: {},
    customAlchemicalItems: [],
  };
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeSpellSession(value) {
  if (
    !isRecord(value) ||
    !isRecord(value.editedSpells) ||
    !Array.isArray(value.customSpells)
  ) {
    return null;
  }

  return {
    editedSpells: Object.fromEntries(
      Object.entries(value.editedSpells).filter(([, spell]) => isRecord(spell)),
    ),
    customSpells: value.customSpells.filter(isRecord),
    editedAlchemicalItems: isRecord(value.editedAlchemicalItems)
      ? Object.fromEntries(
          Object.entries(value.editedAlchemicalItems).filter(([, item]) =>
            isRecord(item),
          ),
        )
      : {},
    customAlchemicalItems: Array.isArray(value.customAlchemicalItems)
      ? value.customAlchemicalItems.filter(isRecord)
      : [],
  };
}

function loadSpellSession() {
  try {
    const storedSession = sessionStorage.getItem(SPELL_SESSION_STORAGE_KEY);

    if (storedSession === null) {
      return createEmptySpellSession();
    }

    const spellSession = normalizeSpellSession(JSON.parse(storedSession));

    if (spellSession === null) {
      console.warn("Ignoring incompatible spell session data.");
      return createEmptySpellSession();
    }

    return spellSession;
  } catch (error) {
    console.warn("Unable to load spell session data; using an empty session.", error);
    return createEmptySpellSession();
  }
}

function saveSpellSession(spellSession) {
  const normalizedSession = normalizeSpellSession(spellSession);

  if (normalizedSession === null) {
    console.warn("Spell session data was not saved because it is incompatible.");
    return false;
  }

  try {
    sessionStorage.setItem(
      SPELL_SESSION_STORAGE_KEY,
      JSON.stringify(normalizedSession),
    );
    return true;
  } catch (error) {
    console.warn("Unable to save spell session data.", error);
    return false;
  }
}

function copySpell(spell) {
  return {
    ...spell,
    traditions: Array.isArray(spell.traditions) ? [...spell.traditions] : [],
  };
}

function buildEffectiveSpells(sourceSpells, spellSession) {
  const knownIds = new Set(sourceSpells.map((spell) => spell.id));
  const effectiveSpells = sourceSpells.map((sourceSpell) => {
    const editedSpell = spellSession.editedSpells[sourceSpell.id];

    if (!isRecord(editedSpell)) {
      return copySpell(sourceSpell);
    }

    return copySpell({
      ...sourceSpell,
      ...editedSpell,
      id: sourceSpell.id,
    });
  });

  spellSession.customSpells.forEach((customSpell) => {
    if (
      typeof customSpell.id !== "string" ||
      customSpell.id.length === 0 ||
      knownIds.has(customSpell.id)
    ) {
      return;
    }

    effectiveSpells.push(copySpell(customSpell));
    knownIds.add(customSpell.id);
  });

  return effectiveSpells;
}

const applicationState = {
  sourceSpells: [],
  effectiveSpells: [],
  spellSession: createEmptySpellSession(),
  spellEditorMode: null,
  editingSpellId: null,
  sourceAlchemicalItems: [],
  effectiveAlchemicalItems: [],
  alchemicalEditorMode: null,
  editingAlchemicalItemId: null,
};

function requestSpellEdit(spellId) {
  const spell = applicationState.effectiveSpells.find(
    (candidate) => candidate.id === spellId,
  );

  if (!spell) {
    return;
  }

  applicationState.spellEditorMode = "edit";
  applicationState.editingSpellId = spellId;

  const dialog = document.getElementById("spellEditorDialog");
  const form = document.getElementById("spellEditorForm");
  document.getElementById("spellEditorHeading").textContent = "Edit spell";
  const values = {
    title: spell.title,
    enTitle: spell.enTitle,
    actionType: spell.actionType,
    type: spell.type,
    level: spell.level,
    traditions: spell.traditions.join(", "),
    castTime: spell.castTime,
    range: spell.range,
    area: spell.area,
    duration: spell.duration,
    objectives: spell.objectives,
    trigger: spell.trigger,
    description: spell.description,
    heightenings: spell.heightenings,
  };

  Object.entries(values).forEach(([name, value]) => {
    form.elements.namedItem(name).value = value ?? "";
  });

  dialog.showModal();
}

function requestSpellCreate() {
  const dialog = document.getElementById("spellEditorDialog");
  const form = document.getElementById("spellEditorForm");

  applicationState.spellEditorMode = "create";
  applicationState.editingSpellId = null;
  form.reset();
  document.getElementById("spellEditorHeading").textContent = "Create spell";
  dialog.showModal();
}

function closeSpellEditor() {
  const dialog = document.getElementById("spellEditorDialog");

  if (dialog.open) {
    dialog.close();
  }

  applicationState.spellEditorMode = null;
  applicationState.editingSpellId = null;
}

function getSpellEditorValues(form) {
  const formData = new FormData(form);

  return {
    title: String(formData.get("title") ?? "").trim(),
    enTitle: String(formData.get("enTitle") ?? "").trim(),
    actionType: String(formData.get("actionType") ?? ""),
    type: String(formData.get("type") ?? "").trim(),
    level: String(formData.get("level") ?? "").trim(),
    traditions: String(formData.get("traditions") ?? "")
      .split(",")
      .map((tradition) => tradition.trim())
      .filter(Boolean),
    castTime: String(formData.get("castTime") ?? "").trim(),
    range: String(formData.get("range") ?? "").trim(),
    area: String(formData.get("area") ?? "").trim(),
    duration: String(formData.get("duration") ?? "").trim(),
    objectives: String(formData.get("objectives") ?? "").trim(),
    trigger: String(formData.get("trigger") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    heightenings: String(formData.get("heightenings") ?? "").trim(),
  };
}

function createCustomSpellId() {
  const knownIds = new Set(
    applicationState.sourceSpells
      .map((spell) => spell.id)
      .concat(applicationState.spellSession.customSpells.map((spell) => spell.id)),
  );
  let id;

  do {
    const uniquePart = globalThis.crypto?.randomUUID
      ? globalThis.crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    id = `custom-spell-${uniquePart}`;
  } while (knownIds.has(id));

  return id;
}

function saveSpellEditor(form) {
  const values = getSpellEditorValues(form);

  if (applicationState.spellEditorMode === "create") {
    applicationState.spellSession.customSpells.push({
      id: createCustomSpellId(),
      ...values,
    });
  } else if (applicationState.spellEditorMode === "edit") {
    const spellId = applicationState.editingSpellId;
    const sourceSpell = applicationState.sourceSpells.find(
      (spell) => spell.id === spellId,
    );
    const customSpellIndex =
      applicationState.spellSession.customSpells.findIndex(
        (spell) => spell.id === spellId,
      );

    if (sourceSpell) {
      applicationState.spellSession.editedSpells[spellId] = values;
    } else if (customSpellIndex !== -1) {
      applicationState.spellSession.customSpells[customSpellIndex] = {
        id: spellId,
        ...values,
      };
    } else {
      closeSpellEditor();
      return;
    }
  } else {
    return;
  }

  saveSpellSession(applicationState.spellSession);
  applicationState.effectiveSpells = buildEffectiveSpells(
    applicationState.sourceSpells,
    applicationState.spellSession,
  );
  closeSpellEditor();
  renderSpellPool();
}

function resetSpellEdit(spellId) {
  if (
    !Object.prototype.hasOwnProperty.call(
      applicationState.spellSession.editedSpells,
      spellId,
    )
  ) {
    return;
  }

  delete applicationState.spellSession.editedSpells[spellId];
  saveSpellSession(applicationState.spellSession);
  applicationState.effectiveSpells = buildEffectiveSpells(
    applicationState.sourceSpells,
    applicationState.spellSession,
  );
  renderSpellPool();
}

function deleteCustomSpell(spellId) {
  const customSpellIndex = applicationState.spellSession.customSpells.findIndex(
    (spell) => spell.id === spellId,
  );

  if (customSpellIndex === -1) {
    return;
  }

  applicationState.spellSession.customSpells.splice(customSpellIndex, 1);
  document.getElementById(`selected${spellId}`)?.remove();
  saveSpellSession(applicationState.spellSession);
  applicationState.effectiveSpells = buildEffectiveSpells(
    applicationState.sourceSpells,
    applicationState.spellSession,
  );
  renderSpellPool();
}

function setupSpellEditor() {
  const dialog = document.getElementById("spellEditorDialog");
  const form = document.getElementById("spellEditorForm");
  const cancelButton = document.getElementById("cancelSpellEdit");

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    saveSpellEditor(form);
  });
  cancelButton.addEventListener("click", closeSpellEditor);
  dialog.addEventListener("close", () => {
    applicationState.spellEditorMode = null;
    applicationState.editingSpellId = null;
  });
}

async function loadSpells() {
  try {
    const res = await fetch("./resources/spells.json");
    const rawSpells = await res.json();

    applicationState.spellSession = loadSpellSession();
    applicationState.sourceSpells = rawSpells.map(normalizeSpell);
    applicationState.effectiveSpells = buildEffectiveSpells(
      applicationState.sourceSpells,
      applicationState.spellSession,
    );

    renderSpellPool();
  } catch (error) {
    console.error("Error cargando JSON:", error);
  }
}

function renderSpellPool() {
  const spellPool = document.getElementById("spellPool");
  const selectedSpellIds = new Set(
    Array.from(spellPool.querySelectorAll(".card.selected"), (card) => card.id),
  );
  spellPool.replaceChildren();

  applicationState.effectiveSpells.forEach((spell) => {
    const card = document.createElement("li");
    card.classList.add("card");
    card.classList.add("no-print");

    // card element template.
    card.appendChild(spellCardTemplate(spell));

    card.id = spell.id;

    if (selectedSpellIds.has(spell.id)) {
      card.classList.add("selected");
      card.classList.remove("no-print");
      const selectedTitle = document.getElementById(`selected${spell.id}`);
      if (selectedTitle) {
        selectedTitle.textContent = spell.title;
      }
    }

    // dataset to search by spTitle & enTitle
    card.dataset.search =
      `${spell.title} ${spell.enTitle}`.toLowerCase();

    // select a spell event listener
    card.addEventListener("click", () => selectSpell(spell, card.id));

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.classList.add("spell-edit-button", "no-print");
    editButton.textContent = "Edit";
    editButton.setAttribute("aria-label", `Edit ${spell.title}`);
    editButton.addEventListener("click", (event) => {
      event.stopPropagation();
      requestSpellEdit(spell.id);
    });
    card.appendChild(editButton);

    if (
      Object.prototype.hasOwnProperty.call(
        applicationState.spellSession.editedSpells,
        spell.id,
      )
    ) {
      const resetButton = document.createElement("button");
      resetButton.type = "button";
      resetButton.classList.add("spell-reset-button", "no-print");
      resetButton.textContent = "Reset";
      resetButton.setAttribute(
        "aria-label",
        `Reset ${spell.title} to its source version`,
      );
      resetButton.addEventListener("click", (event) => {
        event.stopPropagation();
        resetSpellEdit(spell.id);
      });
      card.appendChild(resetButton);
    }

    if (
      applicationState.spellSession.customSpells.some(
        (customSpell) => customSpell.id === spell.id,
      )
    ) {
      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.classList.add("spell-delete-button", "no-print");
      deleteButton.textContent = "Delete";
      deleteButton.setAttribute(
        "aria-label",
        `Delete custom spell ${spell.title}`,
      );
      deleteButton.addEventListener("click", (event) => {
        event.stopPropagation();
        deleteCustomSpell(spell.id);
      });
      card.appendChild(deleteButton);
    }

    spellPool.appendChild(card);
  });

  filterSpellCards();
}

const ALCHEMICAL_ARRAY_FIELDS = [
  "minor", "lesser", "moderate", "greater", "major", "level_true",
];
const ALCHEMICAL_EDITABLE_FIELDS = [
  "englishTitle", "title", "level", "tags", "price", "hands", "bulk",
  "actions", "action_type", "description", "benefit", "drawback",
  ...ALCHEMICAL_ARRAY_FIELDS, "saving_throw", "onset", "maximum_duration",
  "stage1", "stage2", "stage3", "stage4",
];

function createSourceAlchemicalItemId(rawItem) {
  const identity = [rawItem.title, rawItem.englishTitle, rawItem.level].join("\u001f");
  let hash = 2166136261;
  for (let i = 0; i < identity.length; i++) {
    hash ^= identity.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `source-alchemical-item-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function normalizeAlchemicalItem(rawItem) {
  const item = { id: createSourceAlchemicalItemId(rawItem) };
  ALCHEMICAL_EDITABLE_FIELDS.forEach((field) => {
    if (field === "tags" || ALCHEMICAL_ARRAY_FIELDS.includes(field)) {
      item[field] = Array.isArray(rawItem[field]) ? [...rawItem[field]] : [];
    } else {
      item[field] = rawItem[field] ?? "";
    }
  });
  return item;
}

function copyAlchemicalItem(item) {
  const copy = { ...item };
  ["tags", ...ALCHEMICAL_ARRAY_FIELDS].forEach((field) => {
    copy[field] = Array.isArray(item[field]) ? [...item[field]] : [];
  });
  return copy;
}

function buildEffectiveAlchemicalItems(sourceItems, session) {
  const knownIds = new Set(sourceItems.map((item) => item.id));
  const effectiveItems = sourceItems.map((sourceItem) =>
    copyAlchemicalItem({
      ...sourceItem,
      ...(session.editedAlchemicalItems[sourceItem.id] || {}),
      id: sourceItem.id,
    }),
  );
  session.customAlchemicalItems.forEach((item) => {
    if (typeof item.id === "string" && item.id && !knownIds.has(item.id)) {
      effectiveItems.push(copyAlchemicalItem(item));
      knownIds.add(item.id);
    }
  });
  return effectiveItems;
}

function rebuildAlchemicalItems() {
  applicationState.effectiveAlchemicalItems = buildEffectiveAlchemicalItems(
    applicationState.sourceAlchemicalItems,
    applicationState.spellSession,
  );
  renderAlchemicalItemPool();
}

function requestAlchemicalItemEdit(itemId) {
  const item = applicationState.effectiveAlchemicalItems.find(
    (candidate) => candidate.id === itemId,
  );
  if (!item) return;

  applicationState.alchemicalEditorMode = "edit";
  applicationState.editingAlchemicalItemId = itemId;
  const form = document.getElementById("alchemicalItemEditorForm");
  ALCHEMICAL_EDITABLE_FIELDS.forEach((field) => {
    const value = item[field];
    form.elements.namedItem(field).value = Array.isArray(value)
      ? value.join(field === "tags" ? ", " : "\n")
      : value ?? "";
  });
  document.getElementById("alchemicalItemEditorHeading").textContent =
    "Edit alchemical item";
  document.getElementById("alchemicalItemEditorDialog").showModal();
}

function requestAlchemicalItemCreate() {
  applicationState.alchemicalEditorMode = "create";
  applicationState.editingAlchemicalItemId = null;
  document.getElementById("alchemicalItemEditorForm").reset();
  document.getElementById("alchemicalItemEditorHeading").textContent =
    "Create alchemical item";
  document.getElementById("alchemicalItemEditorDialog").showModal();
}

function closeAlchemicalItemEditor() {
  const dialog = document.getElementById("alchemicalItemEditorDialog");
  if (dialog.open) dialog.close();
  applicationState.alchemicalEditorMode = null;
  applicationState.editingAlchemicalItemId = null;
}

function getAlchemicalItemEditorValues(form) {
  const data = new FormData(form);
  const values = {};
  ALCHEMICAL_EDITABLE_FIELDS.forEach((field) => {
    const rawValue = String(data.get(field) ?? "").trim();
    if (field === "tags") {
      values[field] = rawValue.split(",").map((value) => value.trim()).filter(Boolean);
    } else if (ALCHEMICAL_ARRAY_FIELDS.includes(field)) {
      values[field] = rawValue.split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
    } else {
      values[field] = rawValue;
    }
  });
  return values;
}

function createCustomAlchemicalItemId() {
  const knownIds = new Set(applicationState.effectiveAlchemicalItems.map((item) => item.id));
  let id;
  do {
    const uniquePart = globalThis.crypto?.randomUUID
      ? globalThis.crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    id = `custom-alchemical-item-${uniquePart}`;
  } while (knownIds.has(id));
  return id;
}

function saveAlchemicalItemEditor(form) {
  const values = getAlchemicalItemEditorValues(form);
  const itemId = applicationState.editingAlchemicalItemId;
  if (applicationState.alchemicalEditorMode === "create") {
    applicationState.spellSession.customAlchemicalItems.push({
      id: createCustomAlchemicalItemId(), ...values,
    });
  } else if (applicationState.alchemicalEditorMode === "edit") {
    const customIndex = applicationState.spellSession.customAlchemicalItems.findIndex(
      (item) => item.id === itemId,
    );
    if (applicationState.sourceAlchemicalItems.some((item) => item.id === itemId)) {
      applicationState.spellSession.editedAlchemicalItems[itemId] = values;
    } else if (customIndex !== -1) {
      applicationState.spellSession.customAlchemicalItems[customIndex] = { id: itemId, ...values };
    } else return closeAlchemicalItemEditor();
  } else return;

  saveSpellSession(applicationState.spellSession);
  closeAlchemicalItemEditor();
  rebuildAlchemicalItems();
}

function resetAlchemicalItemEdit(itemId) {
  if (!Object.prototype.hasOwnProperty.call(
    applicationState.spellSession.editedAlchemicalItems, itemId,
  )) return;
  delete applicationState.spellSession.editedAlchemicalItems[itemId];
  saveSpellSession(applicationState.spellSession);
  rebuildAlchemicalItems();
}

function deleteCustomAlchemicalItem(itemId) {
  const index = applicationState.spellSession.customAlchemicalItems.findIndex(
    (item) => item.id === itemId,
  );
  if (index === -1) return;
  applicationState.spellSession.customAlchemicalItems.splice(index, 1);
  document.getElementById(`selected${itemId}`)?.remove();
  saveSpellSession(applicationState.spellSession);
  rebuildAlchemicalItems();
}

function setupAlchemicalItemEditor() {
  const dialog = document.getElementById("alchemicalItemEditorDialog");
  const form = document.getElementById("alchemicalItemEditorForm");
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    saveAlchemicalItemEditor(form);
  });
  document.getElementById("cancelAlchemicalItemEdit")
    .addEventListener("click", closeAlchemicalItemEditor);
  dialog.addEventListener("close", () => {
    applicationState.alchemicalEditorMode = null;
    applicationState.editingAlchemicalItemId = null;
  });
}

async function loadAlchemicalItems() {
  try {
    const res = await fetch("./resources/alchemical_items.json");
    const rawItems = await res.json();
    applicationState.sourceAlchemicalItems = rawItems.map(normalizeAlchemicalItem);
    applicationState.effectiveAlchemicalItems = buildEffectiveAlchemicalItems(
      applicationState.sourceAlchemicalItems, applicationState.spellSession,
    );
    renderAlchemicalItemPool();
    console.log(`Loaded ${rawItems.length} alchemical items.`);
  } catch (error) {
    console.error("Unable to load alchemical items.", error);
  }
}

function renderAlchemicalItemPool() {
  const pool = document.getElementById("alchemicalItemPool");
  const selectedIds = new Set(
    Array.from(pool.querySelectorAll(".card.selected"), (card) => card.id),
  );
  pool.replaceChildren();
  applicationState.effectiveAlchemicalItems.forEach((alchemicalItem) => {
      const card = document.createElement("li");
      card.classList.add("card", "no-print");
      card.appendChild(alchemicalItemCardTemplate(alchemicalItem));
      card.id = alchemicalItem.id;
      if (selectedIds.has(card.id)) {
        card.classList.add("selected");
        card.classList.remove("no-print");
        const selectedTitle = document.getElementById(`selected${card.id}`);
        if (selectedTitle) selectedTitle.textContent = alchemicalItem.title;
      }
      card.addEventListener("click", () => selectAlchemicalItem(alchemicalItem, card.id));
      const editButton = createCardActionButton("Edit", `Edit ${alchemicalItem.title}`, () =>
        requestAlchemicalItemEdit(alchemicalItem.id));
      card.appendChild(editButton);
      if (Object.prototype.hasOwnProperty.call(
        applicationState.spellSession.editedAlchemicalItems, alchemicalItem.id,
      )) {
        card.appendChild(createCardActionButton(
          "Reset", `Reset ${alchemicalItem.title} to its source version`,
          () => resetAlchemicalItemEdit(alchemicalItem.id),
        ));
      }
      if (applicationState.spellSession.customAlchemicalItems.some(
        (item) => item.id === alchemicalItem.id,
      )) {
        card.appendChild(createCardActionButton(
          "Delete", `Delete custom alchemical item ${alchemicalItem.title}`,
          () => deleteCustomAlchemicalItem(alchemicalItem.id),
        ));
      }
      pool.appendChild(card);
    });
  filterAlchemicalItemCards();
  autoSizeText();
}

function createCardActionButton(label, ariaLabel, action) {
  const button = document.createElement("button");
  button.type = "button";
  button.classList.add("spell-edit-button", "no-print");
  button.textContent = label;
  button.setAttribute("aria-label", ariaLabel);
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    action();
  });
  return button;
}

function selectSpell(item, id) {
  const selectedSpells = document.getElementById("selected-spells");
  const clickedSpell = document.getElementById(id);

  const spellTitle = document.createElement("li");
  spellTitle.innerText = item.title;
  spellTitle.id = "selected" + id;

  if (clickedSpell.classList.contains("selected")) {
    clickedSpell.classList.remove("selected");
    clickedSpell.classList.add("no-print");

    selectedSpells.removeChild(document.getElementById(spellTitle.id));
  } else {
    clickedSpell.classList.add("selected");
    clickedSpell.classList.remove("no-print");
    selectedSpells.appendChild(spellTitle);
  }
}

function selectAlchemicalItem(item, id) {
  const selectedAlchemicalItems = document.getElementById("selected-alchemical-items");
  const clickedAlchemicalItem = document.getElementById(id);

  const alchemicalItemTitle = document.createElement("li");
  alchemicalItemTitle.innerText = item.title;
  alchemicalItemTitle.id = "selected" + id;

  if (clickedAlchemicalItem.classList.contains("selected")) {
    clickedAlchemicalItem.classList.remove("selected");
    clickedAlchemicalItem.classList.add("no-print");

    selectedAlchemicalItems.removeChild(document.getElementById(alchemicalItemTitle.id));
  } else {
    clickedAlchemicalItem.classList.add("selected");
    clickedAlchemicalItem.classList.remove("no-print");
    selectedAlchemicalItems.appendChild(alchemicalItemTitle);
  }
}

function setupSpellSearch() {
  const searchInput = document.getElementById("searchInputSpells");
  searchInput.addEventListener("input", filterSpellCards);
}

function filterSpellCards() {
  const searchInput = document.getElementById("searchInputSpells");
  const query = searchInput.value.toLowerCase().trim();

  // get all cards
  const cards = document.querySelectorAll("#spellPool .card");

  // iterate over all, save and print matches.
  cards.forEach((card) => {
    const title =
      card.querySelector(".srname")?.dataset.search.toLowerCase() ?? "";

    const matches = title.includes(query);
    card.style.display = matches ? "" : "none";
  });
}
function setupAlchemicalItemSearch() {
  const searchInput = document.getElementById("searchInputAlchemy");
  searchInput.addEventListener("input", filterAlchemicalItemCards);
}
function filterAlchemicalItemCards() {
  const query = document.getElementById("searchInputAlchemy").value.toLowerCase().trim();
  document.querySelectorAll("#alchemicalItemPool .card").forEach((card) => {
    const title = card.querySelector(".srname")?.dataset.search.toLowerCase() ?? "";
    card.style.display = title.includes(query) ? "" : "none";
  });
}
document.addEventListener("DOMContentLoaded", function() {
    setupSpellEditor();
    setupAlchemicalItemEditor();
    document
      .getElementById("createSpellButton")
      .addEventListener("click", requestSpellCreate);
    document
      .getElementById("createAlchemicalItemButton")
      .addEventListener("click", requestAlchemicalItemCreate);
    loadSpells().then(() => {
        setupSpellSearch();
        console.log("Spells loaded successfully.");
      loadAlchemicalItems().then(() => {
        setupAlchemicalItemSearch();
        console.log("Alchemical items loaded successfully.");
        autoSizeText();
      });
    });



});


function openTab(evt, tabName) {
  // Declare all variables
  var i, tabcontent, tablinks;

  // Get all elements with class="tabcontent" and hide them
  tabcontent = document.getElementsByClassName("tabcontent");
  for (i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
  }

  // Get all elements with class="tablinks" and remove the class "active"
  tablinks = document.getElementsByClassName("tablinks");
  for (i = 0; i < tablinks.length; i++) {
    tablinks[i].className = tablinks[i].className.replace(" active", "");
  }

  // Show the current tab, and add an "active" class to the button that opened the tab
  document.getElementById(tabName).style.display = "block";
  evt.currentTarget.className += " active";
}

function autoSizeText() {
  const minimumFontSize = 7;
  const elements = document.querySelectorAll(".resize");

  elements.forEach((element) => {
    let fontSize = Number.parseFloat(getComputedStyle(element).fontSize);

    if (!Number.isFinite(fontSize)) {
      return;
    }

    const maximumAdjustments = Math.max(
      0,
      Math.ceil(fontSize - minimumFontSize),
    );
    let adjustments = 0;

    while (
      element.scrollHeight > element.offsetHeight &&
      fontSize > minimumFontSize &&
      adjustments < maximumAdjustments
    ) {
      fontSize = Math.max(minimumFontSize, fontSize - 1);
      element.style.fontSize = `${fontSize}px`;
      adjustments += 1;
    }
  });
}
