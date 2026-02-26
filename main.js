//const fragment = document.getElementById("spell-template");

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
      }
      card.innerHTML = `
      		<div class="front">
     			<div class="body">
      				<h3 class="name lined srname">${spell.title} <img src="${getActionImg(spell.actionType)}" alt="${spell.actionType}"/></h3>
      				<ul class="status lined">
     					<li><em>Lanzamiento</em>${spell.castTime ? spell.castTime : "-"}</li>
     					<li class="second"><em>Rango</em>${spell.range}</li>
     					<br clear="all">
      				</ul>

      				<ul class="status lined">
     					<li><em>Área</em>${spell.area}</li>
     					<li class="second"><em>Duración</em>${spell.duration}</li>
     					<br clear="all">
      				</ul>

      				<ul class="status lined">
     					<li><em>Objetivo</em>${spell.objectives}</li>
     					<li class="second"><em>Desencadenate</em>${spell.trigger}</li>
     					<br clear="all">
      				</ul>
      				<p class="text">${spell.description}<br> <b>Elevaciones</b>: ${spell.heightenings} </p>

     			</div>
     			<b class="class srclass">${spell.traditions}</b>
     			<b class="type srtype">${spell.type} ${spell.level}</b>
      		</div>
      `;

      card.id = 'spell-' + i;
      // Evento click → llama a una función con el objeto completo
      card.addEventListener("click", () => selectSpell(spell, card.id));

      spellPool.appendChild(card);
      i++;
    });
  } catch (error) {
    console.error("Error cargando JSON:", error);
  }
}

function getActionImg(actionType) {
  let imgPath = "";
  switch (actionType) {
    case "one-action":
      imgPath = "./resources/assets/img/pf2e-action-1.png";
      break;
    case "two-actions":
      imgPath = "./resources/assets/img/pf2e-action-2.png";
      break;
    case "three-actions":
      imgPath = "./resources/assets/img/pf2e-action-3.png";
      break;
    case "reaction":
      imgPath = "./resources/assets/img/pf2e-reaction.png";
      break;
    case "free-action":
      imgPath = "./resources/assets/img/pf2e-free-action.png";
      break;
  }
  return imgPath;
}

function selectSpell(item, id) {
  const selectedSpells = document.getElementById("selected-spells");
  const clickedSpell = document.getElementById(id);

  const spellTitle = document.createElement("li");
  spellTitle.innerText = item.title;
  spellTitle.id = 'selected' + id;

  if(clickedSpell.classList.contains("selected")) {
    clickedSpell.classList.remove("selected");
    clickedSpell.classList.add("no-print");

    selectedSpells.removeChild(document.getElementById(spellTitle.id));
  } else {
    clickedSpell.classList.add("selected");
    clickedSpell.classList.remove("no-print");
    selectedSpells.appendChild(spellTitle);
  }
}

document.addEventListener("DOMContentLoaded", function(event) {
  loadData().then(() => console.log("Datos cargados correctamente"));
});
