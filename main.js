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

      // select a spell envent listener.
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

loadData().then(() => console.log("Datos cargados correctamente"));
