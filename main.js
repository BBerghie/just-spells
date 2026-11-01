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
    traits: Array.isArray(rawSpell.traits) ? [...rawSpell.traits] : [],
    muse: rawSpell.muse ?? "",
    defense: rawSpell.defense ?? "",
  };
}

const SPELL_SESSION_STORAGE_KEY = "just-spells.session.v1";

function createEmptySpellSession() {
  return {
    editedSpells: {},
    customSpells: [],
    editedAlchemicalItems: {},
    customAlchemicalItems: [],
    editedCatalogRecords: {},
    customCatalogRecords: {},
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
    editedCatalogRecords: isRecord(value.editedCatalogRecords)
      ? Object.fromEntries(Object.entries(value.editedCatalogRecords).map(([type, edits]) => [
          type, isRecord(edits) ? Object.fromEntries(Object.entries(edits).filter(([, record]) => isRecord(record))) : {},
        ]))
      : {},
    customCatalogRecords: isRecord(value.customCatalogRecords)
      ? Object.fromEntries(Object.entries(value.customCatalogRecords).map(([type, records]) => [
          type, Array.isArray(records) ? records.filter(isRecord) : [],
        ]))
      : {},
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
  sourceCatalogs: {},
  genericEditorMode: null,
  genericEditorType: null,
  genericEditingRecordId: null,
  genericEditorTemplate: null,
  genericCatalogs: [],
  catalogDefinitions: [],
  catalogSchemas: {},
};

const SPELL_CATALOG_TYPE = "spells";
const ALCHEMICAL_CATALOG_TYPE = "alchemical-items";

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
  document.getElementById("spellEditorHeading").textContent = "Editar conjuro";
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
  document.getElementById("spellEditorHeading").textContent = "Crear conjuro";
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
    card.dataset.filterData = JSON.stringify(spell);

    // select a spell event listener
    card.addEventListener("click", () => selectSpell(spell, card.id));

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.classList.add("spell-edit-button", "no-print");
    editButton.textContent = "Editar";
    editButton.setAttribute("aria-label", `Editar ${spell.title}`);
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
      resetButton.textContent = "Restaurar";
      resetButton.setAttribute(
        "aria-label",
        `Restaurar ${spell.title} a su versión original`,
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
      deleteButton.textContent = "Eliminar";
      deleteButton.setAttribute(
        "aria-label",
        `Eliminar el conjuro personalizado ${spell.title}`,
      );
      deleteButton.addEventListener("click", (event) => {
        event.stopPropagation();
        deleteCustomSpell(spell.id);
      });
      card.appendChild(deleteButton);
    }

    spellPool.appendChild(card);
  });

  refreshFieldFilters("spells", applicationState.effectiveSpells);
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
    "Editar objeto alquímico";
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
    "Crear objeto alquímico";
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
  const indexResponse = await fetch("./resources/datasets.json", { cache: "no-cache" });
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
    const response = await fetch(`./resources/${encodeURIComponent(fileName)}`, { cache: "no-cache" });
    if (!response.ok) {
      throw new Error(`Unable to load resource dataset ${fileName} (${response.status}).`);
    }
    return { fileName, dataset: await response.json() };
  }));
  return datasets;
}

function getFieldValues(record, field) {
  const value = record[field];
  const entries = Array.isArray(value) ? value : [value];
  return entries
    .filter((entry) => entry !== undefined && entry !== null && entry !== "")
    .map((entry) => typeof entry === "object" ? JSON.stringify(entry) : String(entry));
}

function refreshFieldFilters(type, records) {
  const container = document.querySelector(
    `[data-catalog-filters="${CSS.escape(type)}"] .field-filter-controls`,
  );
  if (!container) return;
  const previousValues = new Map(
    Array.from(container.querySelectorAll("[data-filter-field]"), (control) => [
      control.dataset.filterField,
      control.value,
    ]),
  );
  container.replaceChildren();

  const filterFields = inferCatalogFilterFields(records);
  filterFields.forEach(([field, label]) => {
    const uniqueValues = [...new Set(records.flatMap((record) => getFieldValues(record, field)))];
    if (uniqueValues.length <= 1) return;
    uniqueValues.sort((first, second) => first.localeCompare(second, undefined, { numeric: true }));

    const fieldLabel = document.createElement("label");
    fieldLabel.className = "field-filter";
    fieldLabel.textContent = label;
    let control;
    if (uniqueValues.length < 20) {
      control = document.createElement("select");
      control.add(new Option("Todos", ""));
      uniqueValues.forEach((value) => control.add(new Option(value, value)));
    } else {
      control = document.createElement("input");
      control.type = "search";
      control.placeholder = `Filtrar por ${label.toLowerCase()}...`;
    }
    control.dataset.filterField = field;
    control.setAttribute("aria-label", label);
    control.value = previousValues.get(field) ?? "";
    control.addEventListener("input", () => filterCards(type));
    control.addEventListener("change", () => filterCards(type));
    fieldLabel.appendChild(control);
    container.appendChild(fieldLabel);
  });
}

function filterCards(type) {
  const pool = document.querySelector(`[data-catalog-pool="${CSS.escape(type)}"]`);
  const search = document.querySelector(`[data-catalog-search="${CSS.escape(type)}"]`);
  const container = document.querySelector(`[data-catalog-filters="${CSS.escape(type)}"]`);
  const query = search?.value.trim().toLowerCase() ?? "";
  if (!pool) return;
  const fieldFilters = Array.from(
    container?.querySelectorAll("[data-filter-field]") ?? [],
    (control) => ({ field: control.dataset.filterField, value: control.value.trim().toLowerCase() }),
  ).filter(({ value }) => value);

  pool.querySelectorAll(".card").forEach((card) => {
    const titleMatches = (card.dataset.search ?? "").includes(query);
    const record = card.catalogRecord;
    const fieldsMatch = fieldFilters.every(({ field, value }) => {
      const control = container.querySelector(`[data-filter-field="${CSS.escape(field)}"]`);
      const rawValue = control.tagName === "SELECT"
        ? getFieldValues(record, field).some((entry) => entry.toLowerCase() === value)
        : getFieldValues(record, field).join(" ").toLowerCase().includes(value);
      return rawValue;
    });
    card.style.display = titleMatches && fieldsMatch ? "" : "none";
  });
}

function setupGenericCatalogViews(catalogs) {
  const tabBar = document.querySelector("header .tab");
  const main = document.querySelector("main");
  const importControls = [...tabBar.querySelectorAll(
    "#importDatasetButton, #importDatasetFile, #importDatasetStatus",
  )];
  tabBar.replaceChildren();
  main.querySelectorAll("[data-catalog-view]").forEach((view) => view.remove());
  catalogs.forEach(({ type, label, createLabel }) => {
    const tabName = `Catalog-${type}`;
    const tabButton = document.createElement("button");
    tabButton.className = "tablinks";
    tabButton.type = "button";
    tabButton.dataset.catalogTab = type;
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
    search.dataset.catalogSearch = type;
    search.placeholder = `Buscar ${label.toLowerCase()}...`;
    search.setAttribute("aria-label", `Buscar ${label.toLowerCase()}`);
    const searchLabel = document.createElement("label");
    searchLabel.htmlFor = search.id;
    searchLabel.textContent = "Búsqueda";
    const filters = document.createElement("details");
    filters.className = "field-filters";
    filters.id = `filters-${type}`;
    filters.dataset.catalogFilters = type;
    const filtersSummary = document.createElement("summary");
    filtersSummary.textContent = "Filtros";
    const filterControls = document.createElement("div");
    filterControls.className = "field-filter-controls";
    filters.append(filtersSummary, filterControls);
    const printButton = document.createElement("button");
    printButton.type = "button";
    printButton.className = "print-border-toggle no-print";
    printButton.textContent = "Imprimir sin bordes";
    printButton.setAttribute("aria-pressed", "false");
    printButton.addEventListener("click", () => {
      setBorderlessPrint(!document.documentElement.classList.contains("print-borderless"));
    });
    const printAction = document.createElement("button");
    printAction.type = "button";
    printAction.textContent = "Imprimir seleccionados";
    printAction.addEventListener("click", () => window.print());
    const colorControl = document.createElement("div");
    const colorPicker = document.createElement("input");
    colorPicker.type = "color";
    colorPicker.value = getComputedStyle(document.documentElement).getPropertyValue("--card-background").trim() || "#000000";
    colorPicker.setAttribute("aria-label", "Color de fondo de las tarjetas");
    colorPicker.addEventListener("input", () => {
      document.documentElement.style.setProperty("--card-background", colorPicker.value);
    });
    const colorLabel = document.createElement("label");
    colorLabel.htmlFor = `color-${type}`;
    colorPicker.id = colorLabel.htmlFor;
    colorLabel.textContent = "Color de las tarjetas";
    colorControl.append(colorPicker, colorLabel);
    const createButton = document.createElement("button");
    createButton.type = "button";
    createButton.className = "no-print";
    createButton.dataset.catalogCreate = type;
    createButton.textContent = createLabel;
    createButton.addEventListener("click", () => requestGenericRecordCreate(type));
    controls.append(search, searchLabel, filters, createButton, printButton, printAction, colorControl);

    const selectedSection = document.createElement("section");
    selectedSection.className = "selected-spells";
    const selectedHeading = document.createElement("h2");
    selectedHeading.textContent = `Selección: ${label.toLowerCase()}`;
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
    pool.dataset.catalogPool = type;
    view.dataset.catalogView = type;
    content.append(heading, pool);
    container.append(sidebar, content);
    view.appendChild(container);
    main.appendChild(view);
    search.addEventListener("input", () => filterCards(type));
  });
  tabBar.append(...importControls);
  tabBar.querySelector(".tablinks")?.click();
}

async function loadCatalogDefinitions() {
  const datasets = await indexedDatasetsPromise;
  const catalogTypes = [...new Set(datasets
    .filter(({ dataset }) => Array.isArray(dataset.data))
    .map(({ dataset }) => dataset.type)
    .filter(Boolean))];
  applicationState.catalogDefinitions = catalogTypes.map((type) => {
    const dataset = datasets.find((entry) => entry.dataset.type === type)?.dataset ?? {};
    const label = dataset.label ?? `Catálogo (${type})`;
    return {
      type,
      label,
      singularLabel: dataset.singularLabel ?? "elemento",
      createLabel: dataset.createLabel ?? "Crear elemento",
    };
  });
  applicationState.genericCatalogs = applicationState.catalogDefinitions;
  applicationState.catalogSchemas = Object.fromEntries(catalogTypes.map((type) => {
    const records = datasets
      .filter(({ dataset }) => dataset.type === type && Array.isArray(dataset.data))
      .flatMap(({ dataset }) => dataset.data);
    const fields = [...new Set(records.flatMap((record) => isRecord(record) ? Object.keys(record) : []))];
    const fieldTypes = Object.fromEntries(fields.map((field) => [field, new Set(
      records.map((record) => record[field]).filter((value) => value !== null && value !== undefined)
        .map((value) => Array.isArray(value) ? "array" : typeof value),
    )]));
    return [type, { fields: new Set(fields), fieldTypes }];
  }));
  setupGenericCatalogViews(applicationState.genericCatalogs);
  applicationState.spellSession = loadSpellSession();
  await Promise.all(applicationState.genericCatalogs.map(async ({ type }) => {
    const rawRecords = datasets
      .filter(({ dataset }) => dataset.type === type && Array.isArray(dataset.data))
      .flatMap(({ dataset }) => dataset.data);
    const records = type === SPELL_CATALOG_TYPE
      ? rawRecords.map(normalizeSpell)
      : type === ALCHEMICAL_CATALOG_TYPE
        ? rawRecords.map(normalizeAlchemicalItem)
        : rawRecords.map((record, index) => ({ ...record, id: `catalog-${type}-${index}` }));
    applicationState.sourceCatalogs[type] = records;
    const edits = type === SPELL_CATALOG_TYPE
      ? applicationState.spellSession.editedSpells
      : type === ALCHEMICAL_CATALOG_TYPE
        ? applicationState.spellSession.editedAlchemicalItems
        : applicationState.spellSession.editedCatalogRecords[type] ?? {};
    const sourceRecords = records.map((record) => ({ ...record, ...(edits[record.id] ?? {}), id: record.id }));
    const customRecords = type === SPELL_CATALOG_TYPE
      ? applicationState.spellSession.customSpells
      : type === ALCHEMICAL_CATALOG_TYPE
        ? applicationState.spellSession.customAlchemicalItems
        : applicationState.spellSession.customCatalogRecords[type] ?? [];
    applicationState.catalogs[type] = [...sourceRecords, ...customRecords.map((record) => ({ ...record }))];
    renderGenericCatalog(type);
  }));
  document.getElementById("importDatasetButton").disabled = false;
}

function createImportedRecordId(type) {
  const uniquePart = globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `imported-${type}-${uniquePart}`;
}

function validateImportedDataset(dataset) {
  if (!isRecord(dataset) || typeof dataset.type !== "string") {
    throw new Error("El archivo debe tener un tipo de catálogo en el campo «type».");
  }
  const schema = applicationState.catalogSchemas[dataset.type];
  if (!schema) throw new Error(`El tipo «${dataset.type}» no existe en esta aplicación.`);
  if (!Array.isArray(dataset.data) || dataset.data.length === 0) {
    throw new Error("El campo «data» debe contener al menos un registro.");
  }

  dataset.data.forEach((record, index) => {
    if (!isRecord(record)) throw new Error(`El registro ${index + 1} no es un objeto JSON.`);
    const keys = Object.keys(record);
    const missing = [...schema.fields].filter((field) => !Object.hasOwn(record, field));
    const unexpected = keys.filter((field) => !schema.fields.has(field));
    if (missing.length || unexpected.length) {
      const details = [
        missing.length ? `faltan: ${missing.join(", ")}` : "",
        unexpected.length ? `sobran: ${unexpected.join(", ")}` : "",
      ].filter(Boolean).join("; ");
      throw new Error(`El registro ${index + 1} no coincide con los campos de «${dataset.type}» (${details}).`);
    }
    for (const [field, value] of Object.entries(record)) {
      if (value === null) continue;
      const actualType = Array.isArray(value) ? "array" : typeof value;
      if (!schema.fieldTypes[field]?.has(actualType)) {
        throw new Error(`El campo «${field}» del registro ${index + 1} tiene un tipo de valor no válido.`);
      }
    }
  });
  return dataset;
}

function importDatasetRecords(dataset) {
  const type = dataset.type;
  const importedRecords = dataset.data.map((record) => {
    const id = createImportedRecordId(type);
    if (type === SPELL_CATALOG_TYPE) return { ...normalizeSpell(record), id };
    if (type === ALCHEMICAL_CATALOG_TYPE) return { ...normalizeAlchemicalItem(record), id };
    return { ...record, id };
  });
  const sessionRecords = type === SPELL_CATALOG_TYPE
    ? applicationState.spellSession.customSpells
    : type === ALCHEMICAL_CATALOG_TYPE
      ? applicationState.spellSession.customAlchemicalItems
      : (applicationState.spellSession.customCatalogRecords[type] ??= []);
  sessionRecords.push(...importedRecords);
  if (!saveSpellSession(applicationState.spellSession)) {
    const importedIds = new Set(importedRecords.map((record) => record.id));
    if (type === SPELL_CATALOG_TYPE) {
      applicationState.spellSession.customSpells = sessionRecords.filter((record) => !importedIds.has(record.id));
    } else if (type === ALCHEMICAL_CATALOG_TYPE) {
      applicationState.spellSession.customAlchemicalItems = sessionRecords.filter((record) => !importedIds.has(record.id));
    } else {
      applicationState.spellSession.customCatalogRecords[type] = sessionRecords.filter((record) => !importedIds.has(record.id));
    }
    throw new Error("No hay espacio disponible para guardar los registros en esta sesión del navegador.");
  }
  rebuildGenericCatalogRecords(type);
  renderGenericCatalog(type);
  const tab = document.querySelector(`[data-catalog-tab="${CSS.escape(type)}"]`);
  tab?.click();
  return importedRecords.length;
}

async function handleDatasetImport(file) {
  const status = document.getElementById("importDatasetStatus");
  if (!file) return;
  status.textContent = "";
  try {
    const dataset = validateImportedDataset(JSON.parse(await file.text()));
    const count = importDatasetRecords(dataset);
    const label = getGenericCatalog(dataset.type)?.label ?? dataset.type;
    status.textContent = `Se han importado ${count} registros en ${label}.`;
  } catch (error) {
    status.textContent = error instanceof SyntaxError
      ? "El archivo no contiene JSON válido."
      : error.message || "No se pudo importar el archivo JSON.";
  }
}

function setupDatasetImport() {
  const button = document.getElementById("importDatasetButton");
  const fileInput = document.getElementById("importDatasetFile");
  button.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", () => {
    handleDatasetImport(fileInput.files?.[0]);
    fileInput.value = "";
  });
}

function updateDedicatedCatalogLabels() {
  applicationState.catalogDefinitions
    .filter(({ type }) => DEDICATED_CATALOG_TYPES.has(type))
    .forEach(({ type, label, createLabel }) => {
      const view = document.querySelector(`[data-catalog-view="${CSS.escape(type)}"]`);
      const tab = document.querySelector(`[data-catalog-tab="${CSS.escape(type)}"]`);
      const createButton = document.querySelector(`[data-catalog-create="${CSS.escape(type)}"]`);
      if (tab) tab.textContent = label;
      if (createButton) createButton.textContent = createLabel;
      const heading = view?.querySelector(".spell-section > h2");
      if (heading) heading.textContent = `Lista de ${label.toLowerCase()}`;
      const selectionHeading = view?.querySelector(".selected-spells h2, .selected-alchemical-items h2");
      if (selectionHeading) selectionHeading.textContent = `${label} seleccionados`;
    });
}

function getGenericRecordTitle(record) {
  const titleField = getGenericRecordTitleField(record);
  return String((titleField && record[titleField]) ?? "Elemento sin nombre");
}

function normalizeCatalogFieldName(field) {
  return field
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function isCatalogTitleField(field) {
  return ["nombre", "escudo", "title", "name", "english title", "en title"]
    .includes(normalizeCatalogFieldName(field));
}

function getGenericRecordTitleField(record) {
  const fields = Object.keys(record);
  const knownTitle = fields.find((field) => ["nombre", "escudo", "title", "name"].includes(normalizeCatalogFieldName(field)))
    ?? fields.find((field) => isCatalogTitleField(field) || field === "enTitle");
  return knownTitle ?? Object.keys(record).find((field) =>
    field !== "id" && typeof record[field] === "string" && record[field].trim(),
  );
}

function isCatalogDescriptionField(field) {
  return ["descripcion", "description"].includes(normalizeCatalogFieldName(field));
}

function inferCatalogFilterFields(records) {
  const fields = [...new Set(records.flatMap((record) => Object.keys(record)))];
  return fields
    .filter((field) => field !== "id" && !isCatalogTitleField(field) && !isCatalogDescriptionField(field))
    .map((field) => [field, translateCatalogField(field)]);
}

function getGenericCatalog(type) {
  return applicationState.genericCatalogs.find((catalog) => catalog.type === type);
}

function translateCatalogField(label) {
  const translations = {
    name: "Nombre",
    title: "Título",
    description: "Descripción",
    price: "Precio",
    currency: "Moneda",
    bulk: "Volumen",
    hands: "Manos",
    rarity: "Rareza",
    level: "Nivel",
    type: "Tipo",
    damage: "Daño",
    range: "Alcance",
    reload: "Recarga",
    group: "Grupo",
    traits: "Rasgos",
    hardness: "Dureza",
    "hit points": "Puntos de golpe",
    "broken threshold": "Umbral de rotura",
    "ac bonus": "Bonificador a la CA",
    "speed penalty": "Penalizador a la velocidad",
    "check penalty": "Penalizador a pruebas",
    "dex cap": "Límite de Des.",
    strength: "Fuerza",
    valor: "Precio",
    moneda: "Moneda",
    "impedimenta": "Volumen",
    "bon. ca": "Bonificador a la CA",
    "pen. velocidad": "Penalizador a la velocidad",
    "pen. pruebas": "Penalizador a pruebas",
    "tope des.": "Límite de Des.",
    "r. dist.": "Alcance",
    "rasgos de arma": "Rasgos de arma",
    "rasgos arm.": "Rasgos de armadura",
    "pg": "Puntos de golpe",
    "ur": "Umbral de rotura",
    "action type": "Tipo de acción",
    traditions: "Tradiciones",
    "cast time": "Tiempo de lanzamiento",
    objectives: "Objetivos",
    heightenings: "Potenciaciones",
    "english title": "Título en inglés",
    tags: "Rasgos",
    actions: "Acciones",
    "saving throw": "Tirada de salvación",
    onset: "Demora",
    "maximum duration": "Duración máxima",
    benefit: "Beneficio",
    drawback: "Desventaja",
    defense: "Defensa",
    muse: "Musa",
    trigger: "Desencadenante",
    "level true": "Nivel sin clasificar",
  };
  const normalizedLabel = normalizeCatalogFieldName(label);
  return translations[normalizedLabel] ?? label;
}

function genericItemCardTemplate(record, catalogLabel) {
  const template = document.createElement("div");
  template.className = "front";
  const body = document.createElement("div");
  body.className = "body";
  const title = document.createElement("h3");
  title.className = "name lined srname";
  const titleText = document.createElement("span");
  titleText.className = "card-title-text";
  titleText.textContent = getGenericRecordTitle(record);
  title.appendChild(titleText);
  const entries = Object.entries(record).filter(([key]) => key !== "id");
  const titleField = getGenericRecordTitleField(record);
  const titleEntry = entries.find(([key]) => key === titleField);
  const descriptionEntries = entries.filter(([key]) => isCatalogDescriptionField(key));
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
      translateCatalogField(first[0]), first[1],
      second ? translateCatalogField(second[0]) : "", second?.[1] ?? "",
    ));
  }

  descriptionEntries.forEach(([label, value]) => {
    if (value === null || value === "") return;
    const paragraph = document.createElement("p");
    paragraph.className = "text";
    if (label !== "description") {
      const fieldLabel = document.createElement("b");
      fieldLabel.textContent = `${translateCatalogField(label)}: `;
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
  type.textContent = level === undefined || level === null ? "" : `NIVEL ${level}`;
  template.append(body, category, type);
  return template;
}

function createCatalogCardContent(record, type, catalogLabel) {
  if (type === SPELL_CATALOG_TYPE) return spellCardTemplate(record);
  if (type === ALCHEMICAL_CATALOG_TYPE) return alchemicalItemCardTemplate(record);
  return genericItemCardTemplate(record, catalogLabel);
}

function getCardMeasurementRack() {
  let rack = document.getElementById("card-measurement-rack");
  if (!rack) {
    rack = document.createElement("ul");
    rack.id = "card-measurement-rack";
    rack.className = "spell-list no-print";
    rack.setAttribute("aria-hidden", "true");
    Object.assign(rack.style, {
      position: "fixed",
      top: "0",
      left: "-100000px",
      height: "1px",
      overflow: "visible",
      visibility: "hidden",
      pointerEvents: "none",
    });
    document.body.appendChild(rack);
  }

  const visiblePool = [...document.querySelectorAll(".catalog-view .spell-list")]
    .find((pool) => pool.clientWidth > 0);
  rack.style.width = `${visiblePool?.clientWidth || Math.max(272, window.innerWidth - 360)}px`;
  return rack;
}

function getCardTextNodes(element) {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  return nodes;
}

function truncateAfterTextNode(root, textNode) {
  let current = textNode;
  while (current !== root) {
    let sibling = current.nextSibling;
    while (sibling) {
      const nextSibling = sibling.nextSibling;
      sibling.remove();
      sibling = nextSibling;
    }
    current = current.parentNode;
  }
}

function splitCardContentBlock(block, body) {
  const textNodes = getCardTextNodes(block);
  const candidates = textNodes
    .filter((node) => node.data.trim() && !node.parentElement?.closest("strong, b, em"))
    .sort((first, second) => second.data.length - first.data.length);
  const target = candidates[0];
  if (!target) return null;

  const originalText = target.data;
  const words = originalText.match(/\S+\s*/g) ?? [];
  let prefix = "";
  let remainder = "";

  if (words.length > 1) {
    let low = 0;
    let high = words.length;
    while (low < high) {
      const middle = Math.ceil((low + high) / 2);
      target.data = words.slice(0, middle).join("");
      if (body.scrollHeight <= body.clientHeight + 1) low = middle;
      else high = middle - 1;
    }
    prefix = words.slice(0, low).join("");
    remainder = words.slice(low).join("");
  }

  if (!prefix && originalText.length > 1) {
    const characters = Array.from(originalText);
    let low = 1;
    let high = characters.length - 1;
    while (low <= high) {
      const middle = Math.ceil((low + high) / 2);
      target.data = characters.slice(0, middle).join("");
      if (body.scrollHeight <= body.clientHeight + 1) low = middle + 1;
      else high = middle - 1;
    }
    const splitIndex = Math.max(1, high);
    prefix = characters.slice(0, splitIndex).join("");
    remainder = characters.slice(splitIndex).join("");
  }

  if (!prefix || !remainder) {
    target.data = originalText;
    return null;
  }

  target.data = prefix;
  const continuation = block.cloneNode(true);
  const continuationTextNodes = getCardTextNodes(continuation);
  const targetIndex = textNodes.indexOf(target);
  const continuationTarget = continuationTextNodes[targetIndex];
  if (!continuationTarget) return null;
  continuationTarget.data = remainder;
  const continuationItem = continuationTarget.parentElement?.closest("li");
  continuationTextNodes.slice(0, targetIndex).forEach((node) => {
    const item = node.parentElement?.closest("li");
    if (item && item !== continuationItem) item.remove();
    else if (!node.parentElement?.closest("strong, b, em")) node.data = "";
  });
  truncateAfterTextNode(block, target);
  return continuation;
}

function paginateCatalogRecord(record, type, catalogLabel) {
  const template = createCatalogCardContent(record, type, catalogLabel);
  const templateBody = template.querySelector(".body");
  const title = templateBody.querySelector(".name");
  const titleText = title.querySelector(".card-title-text");
  const originalTitle = titleText?.textContent ?? getGenericRecordTitle(record);
  if (titleText) titleText.textContent = `${originalTitle} (888/888)`;

  const contentBlocks = [...templateBody.children].slice(1);
  const measurementRack = getCardMeasurementRack();
  const createPage = () => {
    const card = document.createElement("li");
    card.className = "card generic-card";
    const content = template.cloneNode(true);
    const body = content.querySelector(".body");
    const pageTitle = title.cloneNode(true);
    body.replaceChildren(pageTitle);
    card.appendChild(content);
    measurementRack.appendChild(card);
    return card;
  };
  const overflows = (body) => body.scrollHeight > body.clientHeight + 1;
  const hasBodyContent = (body) => body.children.length > 1;

  const pages = [];
  let page = createPage();
  for (const sourceBlock of contentBlocks) {
    let pendingBlock = sourceBlock.cloneNode(true);
    while (pendingBlock) {
      const body = page.querySelector(".body");
      body.appendChild(pendingBlock);
      if (!overflows(body)) break;

      body.removeChild(pendingBlock);
      const hasPriorContent = hasBodyContent(body);
      body.appendChild(pendingBlock);
      const continuation = splitCardContentBlock(pendingBlock, body);
      if (continuation) {
        pages.push(page);
        page = createPage();
        pendingBlock = continuation;
        continue;
      }

      if (hasPriorContent) {
        body.removeChild(pendingBlock);
        pages.push(page);
        page = createPage();
        continue;
      }
      break;
    }
  }
  pages.push(page);
  measurementRack.replaceChildren();

  pages.forEach((card, index) => {
    const pageTitle = card.querySelector(".card-title-text");
    if (pageTitle) {
      pageTitle.textContent = pages.length > 1
        ? `${originalTitle} (${index + 1}/${pages.length})`
        : originalTitle;
    }
  });
  return pages;
}

function renderGenericCatalog(type) {
  const catalog = getGenericCatalog(type);
  const pool = document.getElementById(`pool-${type}`);
  if (!catalog || !pool) return;
  const selectedIds = new Set(
    Array.from(pool.querySelectorAll(".card.selected"), (card) => card.dataset.catalogRecordId ?? card.id),
  );
  pool.replaceChildren();
  applicationState.catalogs[type].forEach((record) => {
    const pages = paginateCatalogRecord(record, type, catalog.label);
    pages.forEach((card, pageIndex) => {
      card.id = pageIndex === 0 ? record.id : `${record.id}-page-${pageIndex + 1}`;
      card.classList.add("no-print");
      card.dataset.catalogRecordId = record.id;
      card.dataset.pageNumber = String(pageIndex + 1);
      card.dataset.pageCount = String(pages.length);
      card.dataset.search = Object.entries(record)
        .filter(([key]) => key !== "id")
        .map(([, value]) => Array.isArray(value) ? value.join(" ") : String(value ?? ""))
        .join(" ").toLowerCase();
      card.catalogRecord = record;
      if (selectedIds.has(record.id)) {
        card.classList.add("selected");
        card.classList.remove("no-print");
      }
      card.addEventListener("click", () => toggleGenericCatalogSelection(type, record, card));
      card.appendChild(createCardActionButton("Editar", `Editar ${getGenericRecordTitle(record)}`, () =>
        requestGenericRecordEdit(type, record.id)));
      if (isCatalogRecordEdited(type, record.id)) {
        card.appendChild(createCardActionButton("Restaurar", `Restaurar ${getGenericRecordTitle(record)} a su versión original`, () =>
          resetGenericRecordEdit(type, record.id)));
      }
      if (isCatalogRecordCustom(type, record.id)) {
        card.appendChild(createCardActionButton("Eliminar", `Eliminar ${getGenericRecordTitle(record)}`, () =>
          deleteGenericRecord(type, record.id)));
      }
      pool.appendChild(card);
    });
    if (selectedIds.has(record.id)) {
      const selectedTitle = document.getElementById(`selected-${record.id}`);
      if (selectedTitle) selectedTitle.textContent = getGenericRecordTitle(record);
    }
  });
  refreshFieldFilters(type, applicationState.catalogs[type]);
  filterCards(type);
  if (type === ALCHEMICAL_CATALOG_TYPE && document.querySelector(`[data-catalog-view="${CSS.escape(type)}"]`)?.style.display !== "none") {
    autoSizeText(pool);
  }
}

function isCatalogRecordEdited(type, recordId) {
  const edits = type === SPELL_CATALOG_TYPE
    ? applicationState.spellSession.editedSpells
    : type === ALCHEMICAL_CATALOG_TYPE
      ? applicationState.spellSession.editedAlchemicalItems
      : applicationState.spellSession.editedCatalogRecords[type] ?? {};
  return Object.prototype.hasOwnProperty.call(edits, recordId);
}

function isCatalogRecordCustom(type, recordId) {
  const records = type === SPELL_CATALOG_TYPE
    ? applicationState.spellSession.customSpells
    : type === ALCHEMICAL_CATALOG_TYPE
      ? applicationState.spellSession.customAlchemicalItems
      : applicationState.spellSession.customCatalogRecords[type] ?? [];
  return records.some((record) => record.id === recordId);
}

function requestGenericRecordCreate(type) {
  const catalog = getGenericCatalog(type);
  const template = applicationState.catalogs[type]?.[0] ?? { Nombre: "" };
  openGenericRecordEditor(type, "create", null, template, `Crear ${catalog.singularLabel.toLowerCase()}`);
}

function requestGenericRecordEdit(type, recordId) {
  const record = applicationState.catalogs[type]?.find((item) => item.id === recordId);
  if (!record) return;
  const catalog = getGenericCatalog(type);
  openGenericRecordEditor(type, "edit", recordId, record, `Editar ${catalog.singularLabel.toLowerCase()}`);
}

function openGenericRecordEditor(type, mode, recordId, record, heading) {
  const form = document.getElementById("genericCatalogEditorForm");
  const fields = document.getElementById("genericCatalogEditorFields");
  applicationState.genericEditorMode = mode;
  applicationState.genericEditorType = type;
  applicationState.genericEditingRecordId = recordId;
  applicationState.genericEditorTemplate = Object.fromEntries(
    Object.entries(record).filter(([key]) => key !== "id"),
  );
  fields.replaceChildren();
  Object.entries(applicationState.genericEditorTemplate).forEach(([key, value]) => {
    const label = document.createElement("label");
    label.textContent = translateCatalogField(key);
    const isLongText = isCatalogDescriptionField(key) || ["heightenings", "trigger", "benefit", "drawback", "minor", "lesser", "moderate", "greater", "major", "level_true", "stage1", "stage2", "stage3", "stage4"].includes(key);
    const isActionField = ["actionType", "actions"].includes(key);
    const control = document.createElement(isLongText ? "textarea" : isActionField ? "select" : "input");
    control.name = key;
    if (control instanceof HTMLInputElement) control.type = "text";
    if (isActionField) {
      [["", "Ninguna"], ["one-action", "Una acción"], ["two-actions", "Dos acciones"], ["three-actions", "Tres acciones"], ["reaction", "Reacción"], ["free-action", "Acción gratuita"]]
        .forEach(([optionValue, optionLabel]) => control.add(new Option(optionLabel, optionValue)));
    }
    const separator = type === ALCHEMICAL_CATALOG_TYPE && ["minor", "lesser", "moderate", "greater", "major", "level_true"].includes(key) ? "\n" : ", ";
    control.value = mode === "create" ? "" : Array.isArray(value) ? value.join(separator) : value ?? "";
    label.appendChild(control);
    fields.appendChild(label);
  });
  document.getElementById("genericCatalogEditorHeading").textContent = heading;
  clearCatalogEditorPreview();
  document.getElementById("genericCatalogEditorDialog").showModal();
}

function getGenericEditorValues(form) {
  const values = {};
  Object.entries(applicationState.genericEditorTemplate ?? {}).forEach(([key, original]) => {
    const raw = String(new FormData(form).get(key) ?? "").trim();
    if (Array.isArray(original)) {
      const separator = applicationState.genericEditorType === ALCHEMICAL_CATALOG_TYPE && ["minor", "lesser", "moderate", "greater", "major", "level_true"].includes(key) ? /\r?\n/ : /,/;
      values[key] = raw.split(separator).map((item) => item.trim()).filter(Boolean);
    }
    else if (typeof original === "number" && raw !== "" && Number.isFinite(Number(raw))) values[key] = Number(raw);
    else values[key] = raw;
  });
  return values;
}

function saveGenericCatalogRecord(form) {
  const { genericEditorMode: mode, genericEditorType: type, genericEditingRecordId: recordId } = applicationState;
  if (!type || !mode) return;
  const values = getGenericEditorValues(form);
  if (type === SPELL_CATALOG_TYPE) {
    if (mode === "create") {
      values.id = `custom-spell-${globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`}`;
      applicationState.spellSession.customSpells.push(values);
    } else if (applicationState.spellSession.customSpells.some((record) => record.id === recordId)) {
      applicationState.spellSession.customSpells = applicationState.spellSession.customSpells.map((record) => record.id === recordId ? { id: recordId, ...values } : record);
    } else applicationState.spellSession.editedSpells[recordId] = values;
  } else if (type === ALCHEMICAL_CATALOG_TYPE) {
    if (mode === "create") {
      values.id = createCustomAlchemicalItemId();
      applicationState.spellSession.customAlchemicalItems.push(values);
    } else if (applicationState.spellSession.customAlchemicalItems.some((record) => record.id === recordId)) {
      applicationState.spellSession.customAlchemicalItems = applicationState.spellSession.customAlchemicalItems.map((record) => record.id === recordId ? { id: recordId, ...values } : record);
    } else applicationState.spellSession.editedAlchemicalItems[recordId] = values;
  } else {
  const customRecords = applicationState.spellSession.customCatalogRecords[type] ??= [];
  if (mode === "create") {
    const id = `custom-${type}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`}`;
    customRecords.push({ id, ...values });
  } else if (customRecords.some((record) => record.id === recordId)) {
    const index = customRecords.findIndex((record) => record.id === recordId);
    customRecords[index] = { id: recordId, ...values };
  } else {
    (applicationState.spellSession.editedCatalogRecords[type] ??= {})[recordId] = values;
  }
  }
  saveSpellSession(applicationState.spellSession);
  closeGenericCatalogEditor();
  rebuildGenericCatalogRecords(type);
  renderGenericCatalog(type);
}

function rebuildGenericCatalogRecords(type) {
  const source = applicationState.sourceCatalogs[type] ?? [];
  const edits = type === SPELL_CATALOG_TYPE
    ? applicationState.spellSession.editedSpells
    : type === ALCHEMICAL_CATALOG_TYPE
      ? applicationState.spellSession.editedAlchemicalItems
      : applicationState.spellSession.editedCatalogRecords[type] ?? {};
  const customRecords = type === SPELL_CATALOG_TYPE
    ? applicationState.spellSession.customSpells
    : type === ALCHEMICAL_CATALOG_TYPE
      ? applicationState.spellSession.customAlchemicalItems
      : applicationState.spellSession.customCatalogRecords[type] ?? [];
  applicationState.catalogs[type] = [
    ...source.map((record) => ({ ...record, ...(edits[record.id] ?? {}), id: record.id })),
    ...customRecords.map((record) => ({ ...record })),
  ];
}

function clearCatalogEditorPreview() {
  const preview = document.getElementById("genericCatalogEditorPreview");
  const card = document.getElementById("genericCatalogEditorPreviewCard");
  if (preview) preview.hidden = true;
  card?.replaceChildren();
}

function previewGenericCatalogRecord(form) {
  const type = applicationState.genericEditorType;
  const record = getGenericEditorValues(form);
  const definition = getGenericCatalog(type);
  const cards = paginateCatalogRecord(record, type, definition.label);
  const previewCard = document.getElementById("genericCatalogEditorPreviewCard");
  previewCard.replaceChildren(...cards);
  cards.forEach((card) => card.classList.add("selected"));
  document.getElementById("genericCatalogEditorPreview").hidden = false;
}

function closeGenericCatalogEditor() {
  const dialog = document.getElementById("genericCatalogEditorDialog");
  if (dialog.open) dialog.close();
  document.getElementById("genericCatalogEditorForm").reset();
  applicationState.genericEditorMode = null;
  applicationState.genericEditorType = null;
  applicationState.genericEditingRecordId = null;
  applicationState.genericEditorTemplate = null;
  clearCatalogEditorPreview();
}

function resetGenericRecordEdit(type, recordId) {
  if (type === SPELL_CATALOG_TYPE) {
    delete applicationState.spellSession.editedSpells[recordId];
  } else if (type === ALCHEMICAL_CATALOG_TYPE) {
    delete applicationState.spellSession.editedAlchemicalItems[recordId];
  } else {
  delete applicationState.spellSession.editedCatalogRecords[type]?.[recordId];
  }
  saveSpellSession(applicationState.spellSession);
  rebuildGenericCatalogRecords(type);
  renderGenericCatalog(type);
}

function deleteGenericRecord(type, recordId) {
  if (type === SPELL_CATALOG_TYPE) {
    applicationState.spellSession.customSpells = applicationState.spellSession.customSpells.filter((record) => record.id !== recordId);
  } else if (type === ALCHEMICAL_CATALOG_TYPE) {
    applicationState.spellSession.customAlchemicalItems = applicationState.spellSession.customAlchemicalItems.filter((record) => record.id !== recordId);
  } else {
  applicationState.spellSession.customCatalogRecords[type] =
    (applicationState.spellSession.customCatalogRecords[type] ?? []).filter((record) => record.id !== recordId);
  }
  document.getElementById(`selected-${recordId}`)?.remove();
  saveSpellSession(applicationState.spellSession);
  applicationState.catalogs[type] = applicationState.catalogs[type].filter((record) => record.id !== recordId);
  renderGenericCatalog(type);
}

function setupGenericCatalogEditor() {
  const dialog = document.getElementById("genericCatalogEditorDialog");
  const form = document.getElementById("genericCatalogEditorForm");
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    saveGenericCatalogRecord(form);
  });
  document.getElementById("cancelGenericCatalogEdit").addEventListener("click", closeGenericCatalogEditor);
  document.getElementById("previewGenericCatalogRecord").addEventListener("click", () => previewGenericCatalogRecord(form));
  dialog.addEventListener("close", () => {
    applicationState.genericEditorMode = null;
    applicationState.genericEditorType = null;
    applicationState.genericEditingRecordId = null;
    applicationState.genericEditorTemplate = null;
    clearCatalogEditorPreview();
  });
}

function toggleGenericCatalogSelection(type, record, card) {
  const selectedList = document.getElementById(`selected-${type}`);
  const selectedId = `selected-${record.id}`;
  const title = getGenericRecordTitle(record);
  const recordCards = [...card.parentElement.querySelectorAll(".card")]
    .filter((candidate) => candidate.dataset.catalogRecordId === record.id);
  if (recordCards.some((recordCard) => recordCard.classList.contains("selected"))) {
    recordCards.forEach((recordCard) => {
      recordCard.classList.remove("selected");
      recordCard.classList.add("no-print");
    });
    document.getElementById(selectedId)?.remove();
    return;
  }
  recordCards.forEach((recordCard) => {
    recordCard.classList.add("selected");
    recordCard.classList.remove("no-print");
  });
  const listItem = document.createElement("li");
  listItem.id = selectedId;
  listItem.textContent = title;
  selectedList.appendChild(listItem);
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
      card.dataset.search = `${alchemicalItem.title} ${alchemicalItem.englishTitle}`.toLowerCase();
      card.dataset.filterData = JSON.stringify(alchemicalItem);
      if (selectedIds.has(card.id)) {
        card.classList.add("selected");
        card.classList.remove("no-print");
        const selectedTitle = document.getElementById(`selected${card.id}`);
        if (selectedTitle) selectedTitle.textContent = alchemicalItem.title;
      }
      card.addEventListener("click", () => selectAlchemicalItem(alchemicalItem, card.id));
      const editButton = createCardActionButton("Editar", `Editar ${alchemicalItem.title}`, () =>
        requestAlchemicalItemEdit(alchemicalItem.id));
      card.appendChild(editButton);
      if (Object.prototype.hasOwnProperty.call(
        applicationState.spellSession.editedAlchemicalItems, alchemicalItem.id,
      )) {
        card.appendChild(createCardActionButton(
          "Restaurar", `Restaurar ${alchemicalItem.title} a su versión original`,
          () => resetAlchemicalItemEdit(alchemicalItem.id),
        ));
      }
      if (applicationState.spellSession.customAlchemicalItems.some(
        (item) => item.id === alchemicalItem.id,
      )) {
        card.appendChild(createCardActionButton(
          "Eliminar", `Eliminar el objeto alquímico personalizado ${alchemicalItem.title}`,
          () => deleteCustomAlchemicalItem(alchemicalItem.id),
        ));
      }
      pool.appendChild(card);
    });
  refreshFieldFilters("alchemical-items", applicationState.effectiveAlchemicalItems);
  filterAlchemicalItemCards();
  autoSizeText();
}

function createCardActionButton(label, ariaLabel, action) {
  const button = document.createElement("button");
  button.type = "button";
  const actionClass = label === "Restaurar"
    ? "spell-reset-button"
    : label === "Eliminar" ? "spell-delete-button" : "spell-edit-button";
  button.classList.add(actionClass, "no-print");
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
  filterCards("spells");
}
function setupAlchemicalItemSearch() {
  const searchInput = document.getElementById("searchInputAlchemy");
  searchInput.addEventListener("input", filterAlchemicalItemCards);
}
function filterAlchemicalItemCards() {
  filterCards("alchemical-items");
}

function setBorderlessPrint(borderless) {
  document.documentElement.classList.toggle("print-borderless", borderless);
  document.querySelectorAll(".print-border-toggle").forEach((button) => {
    button.textContent = borderless
      ? "Imprimir con bordes"
      : "Imprimir sin bordes";
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
    setupGenericCatalogEditor();
    setupDatasetImport();
    setupPrintBorderControls();
    applicationState.spellSession = loadSpellSession();
    indexedDatasetsPromise = fetchIndexedDatasets();
    loadCatalogDefinitions().catch((error) => {
      console.error("Unable to load indexed catalogs.", error);
    });



});


function openTab(evt, tabName) {
  document.querySelectorAll(".tabcontent").forEach((view) => {
    view.style.display = view.id === tabName ? "block" : "none";
  });
  document.querySelectorAll(".tablinks").forEach((button) => {
    button.classList.toggle("active", button === evt.currentTarget);
  });
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
