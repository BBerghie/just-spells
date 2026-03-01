import { cardTemplate } from "./js/CardTemplate.js";

function print() {
  window.print();
}

async function loadData() {
  try {
    const res = await fetch("./resources/spells.json");
    const datos = await res.json();

    const spellPool = document.getElementById("spellPool");
    let i = 0;
    datos.forEach((spellJson) => {
      const card = document.createElement("li");
      card.classList.add("card");
      card.classList.add("no-print");
      const spell = {
        title: spellJson.title,
        enTitle: spellJson.englishTitle,
        description: spellJson.description,
        actionType: spellJson.actionType,
        castTime: spellJson.castTime,
        area: spellJson.area,
        objectives: spellJson.objectives,
        heightenings: spellJson.heightenings,
        level: spellJson.level,
        traditions: spellJson.traditions,
        trigger: spellJson.trigger,
        type: spellJson.type,
        range: spellJson.range,
        duration: spellJson.duration,
      };

      // card element template.
      card.innerHTML = cardTemplate(spell);

      card.id = "spell-" + i;

      // dataset to search by spTitle & enTitle
      card.dataset.search =
        `${spellJson.title} ${spellJson.englishTitle}`.toLowerCase();

      // select a spell envent listener
      card.addEventListener("click", () => selectSpell(spell, card.id));

      spellPool.appendChild(card);
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

function setupSearch() {
  const searchInput = document.getElementById("searchInput");
  searchInput.addEventListener("input", () => {
    // users's imput
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
  });
}

loadData().then(() => {
  setupSearch();
  console.log("Datos cargados correctamente");
});
