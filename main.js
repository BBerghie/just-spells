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

async function loadAlchemicalItems() {
  try {
    const res = await fetch("./resources/alchemical_items.json");
    const datos = await res.json();

    const alchemicalItemPool = document.getElementById("alchemicalItemPool");
    let i = 0;
    console.log('Cargados ' + datos.length + ' items');
    datos.forEach((alchemicalItemJson) => {
      const card = document.createElement("li");
      card.classList.add("card");
      card.classList.add("no-print");
      const alchemicalItem = {
        englishTitle: alchemicalItemJson.englishTitle,
        title: alchemicalItemJson.title,
        level: alchemicalItemJson.level,
        tags: alchemicalItemJson.tags,
        price: alchemicalItemJson.price,
        hands: alchemicalItemJson.hands,
        bulk: alchemicalItemJson.bulk,
        actions: alchemicalItemJson.actions,
        action_type: alchemicalItemJson.action_type,
        description: alchemicalItemJson.description,
        benefit: alchemicalItemJson.benefit,
        drawback: alchemicalItemJson.drawback,
        minor: alchemicalItemJson.minor,
        lesser: alchemicalItemJson.lesser,
        moderate: alchemicalItemJson.moderate,
        greater: alchemicalItemJson.greater,
        major: alchemicalItemJson.major,
        level_true: alchemicalItemJson.level_true,
        saving_throw: alchemicalItemJson.saving_throw,
        onset: alchemicalItemJson.onset,
        maximum_duration: alchemicalItemJson.maximum_duration,
        stage1: alchemicalItemJson.stage1,
        stage2: alchemicalItemJson.stage2,
        stage3: alchemicalItemJson.stage3,
        stage4: alchemicalItemJson.stage4
      };

      // card element template.
      card.appendChild(alchemicalItemCardTemplate(alchemicalItem));

      card.id = "alchemical-item-" + i;

      // dataset to search by spTitle & enTitle
      card.dataset.search =
          `${alchemicalItemJson.title} ${alchemicalItemJson.englishTitle}`.toLowerCase();

      // select a spell event listener
      card.addEventListener("click", () => selectAlchemicalItem(alchemicalItem, card.id));
      alchemicalItemPool.appendChild(card);
      i++;
    });
  } catch (error) {
    console.error("Error cargando JSON:", error);
  }
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
  searchInput.addEventListener("input", () => {
    // users's input
    const query = searchInput.value.toLowerCase().trim();

    // get all cards
    const cards = document.querySelectorAll("#alchemicalItemPool .card");

    // iterate over all, save and print matches.
    cards.forEach((card) => {
      const title =
          card.querySelector(".srname")?.dataset.search.toLowerCase() ?? "";

      const matches = title.includes(query);
      card.style.display = matches ? "" : "none";
    });
  });
}
document.addEventListener("DOMContentLoaded", function() {
    setupSpellEditor();
    document
      .getElementById("createSpellButton")
      .addEventListener("click", requestSpellCreate);
    loadSpells().then(() => {
        setupSpellSearch();
        console.log("Conjuros cargados correctamente");
      loadAlchemicalItems().then(() => {
        setupAlchemicalItemSearch();
        console.log("Items alquímicos cargados correctamente");
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
