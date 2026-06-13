async function loadSpells() {
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
      card.innerHTML = spellCardTemplate(spell);

      card.id = "spell-" + i;

      // dataset to search by spTitle & enTitle
      card.dataset.search =
        `${spellJson.title} ${spellJson.enTitle}`.toLowerCase();

      // select a spell event listener
      card.addEventListener("click", () => selectSpell(spell, card.id));

      spellPool.appendChild(card);
      i++;
    });
  } catch (error) {
    console.error("Error cargando JSON:", error);
  }
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
  searchInput.addEventListener("input", () => {
    // users's input
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

document.addEventListener("DOMContentLoaded", function() {
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
  let el, elements, _i, _len, _results;
  elements = document.querySelectorAll('.resize');
  console.log(elements);
  if (elements.length < 0) {
    return;
  }
  _results = [];
  for (_i = 0, _len = elements.length; _i < _len; _i++) {
    el = elements[_i];
    _results.push((function(el) {
      let resizeText, _results1;
      resizeText = function() {
        let elNewFontSize;
        elNewFontSize = (parseInt(el.css('font-size').slice(0, -2)) - 1) + 'px';
        console.log('new font size: ' + elNewFontSize);
        return el.css('font-size', elNewFontSize);
      };
      _results1 = [];
      console.log('element: ' + el.innerHTML);
      console.log('scrollHeight: ' + el.scrollHeight);
      console.log('offsetHeight: ' + el.offsetHeight);

      while (el.scrollHeight > el.offsetHeight) {
        console.log('text too big, resizing');
        _results1.push(resizeText());
      }
      return _results1;
    })(el));
  }
  return _results;
}