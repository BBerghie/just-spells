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
  catalogs: {},
};

const GENERIC_CATALOGS = [
  { type: "armor", label: "Armor" },
  { type: "ranged-weapons", label: "Ranged Weapons" },
  { type: "melee-weapons", label: "Melee Weapons" },
  { type: "shields", label: "Shields" },
  { type: "items", label: "Items" },
];

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
  clearCardPreview("spellEditorPreview", "spellEditorPreviewCard");
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
  clearCardPreview("spellEditorPreview", "spellEditorPreviewCard");
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
  clearCardPreview("spellEditorPreview", "spellEditorPreviewCard");
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

function clearCardPreview(previewId, cardId) {
  document.getElementById(cardId).replaceChildren();
  document.getElementById(previewId).hidden = true;
}

function renderCardPreview(previewId, cardId, cardContent) {
  const preview = document.getElementById(previewId);
  const card = document.getElementById(cardId);
  card.replaceChildren(cardContent);
  preview.hidden = false;
  return card;
}

function previewSpell(form) {
  renderCardPreview(
    "spellEditorPreview",
    "spellEditorPreviewCard",
    spellCardTemplate(getSpellEditorValues(form)),
  );
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
  document.getElementById("previewSpell").addEventListener("click", () => {
    previewSpell(form);
  });
  dialog.addEventListener("close", () => {
    applicationState.spellEditorMode = null;
    applicationState.editingSpellId = null;
    clearCardPreview("spellEditorPreview", "spellEditorPreviewCard");
  });
}

async function loadSpells() {
  try {
    const rawSpells = await loadTypedDataset("spells");

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
  clearCardPreview(
    "alchemicalItemEditorPreview",
    "alchemicalItemEditorPreviewCard",
  );
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
  clearCardPreview(
    "alchemicalItemEditorPreview",
    "alchemicalItemEditorPreviewCard",
  );
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
  clearCardPreview(
    "alchemicalItemEditorPreview",
    "alchemicalItemEditorPreviewCard",
  );
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

function previewAlchemicalItem(form) {
  const card = renderCardPreview(
    "alchemicalItemEditorPreview",
    "alchemicalItemEditorPreviewCard",
    alchemicalItemCardTemplate(getAlchemicalItemEditorValues(form)),
  );
  autoSizeText(card);
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
  document.getElementById("previewAlchemicalItem")
    .addEventListener("click", () => {
      previewAlchemicalItem(form);
    });
  dialog.addEventListener("close", () => {
    applicationState.alchemicalEditorMode = null;
    applicationState.editingAlchemicalItemId = null;
    clearCardPreview(
      "alchemicalItemEditorPreview",
      "alchemicalItemEditorPreviewCard",
    );
  });
}

async function loadAlchemicalItems() {
  try {
    const rawItems = await loadTypedDataset("alchemical-items");
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

let indexedDatasetsPromise;

async function loadTypedDataset(expectedType) {
  if (!indexedDatasetsPromise) {
    indexedDatasetsPromise = fetchIndexedDatasets();
  }
  const datasets = await indexedDatasetsPromise;
  const matchingDatasets = datasets.filter(
    ({ dataset }) => dataset.type === expectedType && Array.isArray(dataset.data),
  );
  if (matchingDatasets.length === 0) {
    throw new Error(`No resource datasets found for type "${expectedType}".`);
  }
  return matchingDatasets.flatMap(({ dataset }) => dataset.data);
}

async function fetchIndexedDatasets() {
  const indexResponse = await fetch("./resources/datasets.json");
  if (!indexResponse.ok) {
    throw new Error(`Unable to load the resource dataset index (${indexResponse.status}).`);
  }

  const index = await indexResponse.json();
  if (index.type !== "dataset-index" || !Array.isArray(index.files)) {
    throw new Error("Invalid resource dataset index format.");
  }

  const fileNames = index.files.filter(
    (fileName) => typeof fileName === "string" && /^[\w-]+\.json$/.test(fileName),
  );
  const datasets = await Promise.all(fileNames.map(async (fileName) => {
    const response = await fetch(`./resources/${encodeURIComponent(fileName)}`);
    if (!response.ok) {
      throw new Error(`Unable to load resource dataset ${fileName} (${response.status}).`);
    }
    return { fileName, dataset: await response.json() };
  }));
  return datasets;
}

function setupGenericCatalogViews() {
  const tabBar = document.querySelector("header .tab");
  const main = document.querySelector("main");
  GENERIC_CATALOGS.forEach(({ type, label }) => {
    const tabName = `Catalog-${type}`;
    const tabButton = document.createElement("button");
    tabButton.className = "tablinks";
    tabButton.type = "button";
    tabButton.textContent = label;
    tabButton.addEventListener("click", (event) => openTab(event, tabName));
    tabBar.appendChild(tabButton);

    const view = document.createElement("div");
    view.id = tabName;
    view.className = "tabcontent catalog-view";
    view.style.display = "none";
    const container = document.createElement("section");
    container.className = "spellContainer";
    const sidebar = document.createElement("section");
    sidebar.className = "fixed fixedContainer no-print";
    const controls = document.createElement("section");
    controls.className = "button-row";
    const search = document.createElement("input");
    search.type = "search";
    search.id = `search-${type}`;
    search.placeholder = `Search ${label.toLowerCase()}...`;
    search.setAttribute("aria-label", `Search ${label.toLowerCase()}`);
    const searchLabel = document.createElement("label");
    searchLabel.htmlFor = search.id;
    searchLabel.textContent = "Search";
    const printButton = document.createElement("button");
    printButton.type = "button";
    printButton.className = "print-border-toggle no-print";
    const printAction = document.createElement("button");
    printAction.type = "button";
    printAction.textContent = "Print selected";
    printAction.addEventListener("click", () => window.print());
    const colorControl = document.createElement("div");
    const colorPicker = document.createElement("input");
    colorPicker.type = "color";
    colorPicker.value = "#000000";
    colorPicker.setAttribute("aria-label", "Card background color");
    colorPicker.addEventListener("input", () => {
      document.documentElement.style.setProperty("--card-background", colorPicker.value);
    });
    const colorLabel = document.createElement("label");
    colorLabel.htmlFor = `color-${type}`;
    colorPicker.id = colorLabel.htmlFor;
    colorLabel.textContent = "Card color";
    colorControl.append(colorPicker, colorLabel);
    controls.append(search, searchLabel, printButton, printAction, colorControl);

    const selectedSection = document.createElement("section");
    selectedSection.className = "selected-spells";
    const selectedHeading = document.createElement("h2");
    selectedHeading.textContent = `Selected ${label.toLowerCase()}`;
    const selectedList = document.createElement("ul");
    selectedList.className = "selected-spells selected-catalog-items no-print";
    selectedList.id = `selected-${type}`;
    selectedSection.append(selectedHeading, selectedList);
    sidebar.append(controls, selectedSection);

    const content = document.createElement("section");
    content.className = "spell-section";
    const heading = document.createElement("h2");
    heading.className = "no-print";
    heading.textContent = label;
    const pool = document.createElement("ul");
    pool.className = "spell-list catalog-list";
    pool.id = `pool-${type}`;
    content.append(heading, pool);
    container.append(sidebar, content);
    view.appendChild(container);
    main.appendChild(view);
    search.addEventListener("input", () => filterGenericCatalog(type, search.value));
  });
}

async function loadGenericCatalogs() {
  await Promise.all(GENERIC_CATALOGS.map(async ({ type }) => {
    const records = await loadTypedDataset(type);
    applicationState.catalogs[type] = records.map((record, index) => ({
      ...record,
      id: `catalog-${type}-${index}`,
    }));
    renderGenericCatalog(type);
  }));
}

function getGenericRecordTitle(record) {
  return String(record.Nombre ?? record.Escudo ?? record.title ?? record.name ?? "Unnamed item");
}

function genericItemCardTemplate(record, catalogLabel) {
  const template = document.createElement("div");
  template.className = "front";
  const body = document.createElement("div");
  body.className = "body";
  const title = document.createElement("h3");
  title.className = "name lined srname";
  title.textContent = getGenericRecordTitle(record);
  const entries = Object.entries(record).filter(([key]) => key !== "id");
  const titleEntry = entries.find(([key]) =>
    ["nombre", "escudo", "title", "name"].includes(key.toLowerCase()),
  );
  const descriptionEntries = entries.filter(([key]) => {
    const normalizedKey = key.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    return normalizedKey === "descripcion" || normalizedKey === "description";
  });
  const attributes = entries.filter(([key, value]) => {
    if (titleEntry && key === titleEntry[0]) return false;
    if (descriptionEntries.some(([descriptionKey]) => key === descriptionKey)) return false;
    return value !== null && value !== "" && value !== "—";
  }).map(([label, value]) => [
    label,
    Array.isArray(value) ? value.join(", ") : typeof value === "object" ? JSON.stringify(value) : String(value),
  ]);

  body.appendChild(title);
  for (let index = 0; index < attributes.length; index += 2) {
    const first = attributes[index];
    const second = attributes[index + 1];
    body.appendChild(spellStatusTemplate(
      first[0], first[1], second?.[0] ?? "", second?.[1] ?? "",
    ));
  }

  descriptionEntries.forEach(([label, value]) => {
    if (value === null || value === "") return;
    const paragraph = document.createElement("p");
    paragraph.className = "text";
    if (label !== "description") {
      const fieldLabel = document.createElement("b");
      fieldLabel.textContent = `${label}: `;
      paragraph.appendChild(fieldLabel);
    }
    paragraph.appendChild(document.createTextNode(String(value)));
    body.appendChild(paragraph);
  });

  const category = document.createElement("b");
  category.className = "class srclass";
  category.textContent = catalogLabel.toUpperCase();
  const level = record.Nivel ?? record.level;
  const type = document.createElement("b");
  type.className = "type srtype";
  type.textContent = level === undefined || level === null ? "" : `LEVEL ${level}`;
  template.append(body, category, type);
  return template;
}
function renderGenericCatalog(type) {
  const catalog = GENERIC_CATALOGS.find((entry) => entry.type === type);
  const pool = document.getElementById(`pool-${type}`);
  const selectedIds = new Set(
    Array.from(pool.querySelectorAll(".card.selected"), (card) => card.id),
  );
  pool.replaceChildren();
  applicationState.catalogs[type].forEach((record) => {
    const card = document.createElement("li");
    card.className = "card no-print generic-card";
    card.id = record.id;
    card.appendChild(genericItemCardTemplate(record, catalog.label));
    card.dataset.search = Object.entries(record)
      .filter(([key]) => key !== "id")
      .map(([, value]) => Array.isArray(value) ? value.join(" ") : String(value ?? ""))
      .join(" ").toLowerCase();
    if (selectedIds.has(card.id)) {
      card.classList.add("selected");
      card.classList.remove("no-print");
    }
    card.addEventListener("click", () => toggleGenericCatalogSelection(type, record, card));
    pool.appendChild(card);
  });
}

function toggleGenericCatalogSelection(type, record, card) {
  const selectedList = document.getElementById(`selected-${type}`);
  const selectedId = `selected-${record.id}`;
  if (card.classList.contains("selected")) {
    card.classList.remove("selected");
    card.classList.add("no-print");
    document.getElementById(selectedId)?.remove();
    return;
  }
  card.classList.add("selected");
  card.classList.remove("no-print");
  const listItem = document.createElement("li");
  listItem.id = selectedId;
  listItem.textContent = getGenericRecordTitle(record);
  selectedList.appendChild(listItem);
}

function filterGenericCatalog(type, query) {
  const normalizedQuery = query.trim().toLowerCase();
  document.querySelectorAll(`#pool-${type} .card`).forEach((card) => {
    card.style.display = card.dataset.search.includes(normalizedQuery) ? "" : "none";
  });
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

function setBorderlessPrint(borderless) {
  document.documentElement.classList.toggle("print-borderless", borderless);
  document.querySelectorAll(".print-border-toggle").forEach((button) => {
    button.textContent = borderless
      ? "Print with borders"
      : "Print without borders";
    button.setAttribute("aria-pressed", String(borderless));
  });
}

function setupPrintBorderControls() {
  document.querySelectorAll(".print-border-toggle").forEach((button) => {
    button.addEventListener("click", () => {
      const borderless =
        !document.documentElement.classList.contains("print-borderless");
      setBorderlessPrint(borderless);
    });
  });
  setBorderlessPrint(false);
}

document.addEventListener("DOMContentLoaded", function() {
    setupGenericCatalogViews();
    setupSpellEditor();
    setupAlchemicalItemEditor();
    setupPrintBorderControls();
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
        loadGenericCatalogs().catch((error) => {
          console.error("Unable to load equipment catalogs.", error);
        });
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

function autoSizeText(root = document) {
  const minimumFontSize = 7;
  const elements = root.querySelectorAll(".resize");

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
