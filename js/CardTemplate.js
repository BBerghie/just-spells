function spellCardTemplate(spell) {
  const front = document.createElement("div");
  front.className = "front";

  const body = document.createElement("div");
  body.className = "body";

  const title = document.createElement("h3");
  title.className = "name lined srname";
  title.dataset.search = `${spell.title ?? ""} ${spell.enTitle ?? ""}`;
  title.append(document.createTextNode(`${spell.title ?? ""} `));

  const actionImagePath = getActionImg(spell.actionType);
  if (actionImagePath) {
    const actionImage = document.createElement("img");
    actionImage.src = actionImagePath;
    actionImage.alt = spell.actionType ?? "";
    title.appendChild(actionImage);
  }

  body.append(
    title,
    spellStatusTemplate(
      "Lanzamiento",
      spell.castTime || "-",
      "Rango",
      spell.range,
    ),
    spellStatusTemplate("Área", spell.area, "Duración", spell.duration),
    spellStatusTemplate(
      "Objetivo",
      spell.objectives,
      "Desencadenate",
      spell.trigger,
    ),
  );

  const description = document.createElement("p");
  description.className = "text";
  description.append(
    document.createTextNode(spell.description ?? ""),
    document.createElement("br"),
    document.createTextNode(" "),
  );
  const heighteningsLabel = document.createElement("b");
  heighteningsLabel.textContent = "Elevaciones";
  description.append(
    heighteningsLabel,
    document.createTextNode(`: ${spell.heightenings ?? ""} `),
  );
  body.appendChild(description);

  const traditions = document.createElement("b");
  traditions.className = "class srclass";
  traditions.textContent = Array.isArray(spell.traditions)
    ? spell.traditions.join(", ")
    : "";

  const type = document.createElement("b");
  type.className = "type srtype";
  type.textContent = `${spell.type ?? ""} ${spell.level ?? ""}`;

  front.append(body, traditions, type);
  return front;
}

function spellStatusTemplate(firstLabel, firstValue, secondLabel, secondValue) {
  const status = document.createElement("ul");
  status.className = "status lined";
  status.append(
    spellStatusItemTemplate(firstLabel, firstValue),
    spellStatusItemTemplate(secondLabel, secondValue, "second"),
  );

  const clear = document.createElement("br");
  clear.className = "clear";
  status.appendChild(clear);
  return status;
}

function spellStatusItemTemplate(label, value, className = "") {
  const item = document.createElement("li");
  item.className = className;

  const labelElement = document.createElement("em");
  labelElement.textContent = label;
  item.append(labelElement, document.createTextNode(value ?? ""));
  return item;
}

function alchemicalItemCardTemplate(alchemicalItem) {
  const template = document.createElement("div");
  template.className = "front";
  const body = document.createElement("div");
  body.className = "body";
  const title = document.createElement("h3");
  title.className = "name lined srname";
  title.dataset.search = `${alchemicalItem.title ?? ""} ${alchemicalItem.englishTitle ?? ""}`;
  title.append(document.createTextNode(`${alchemicalItem.title ?? ""} `));
  const actionImagePath = getActionImg(alchemicalItem.actions);
  if (actionImagePath) {
    const image = document.createElement("img");
    image.src = actionImagePath;
    image.alt = alchemicalItem.actions ?? "";
    title.appendChild(image);
  }
  const attributes = document.createElement("div");
  attributes.className = "attributes";
  body.append(title, attributes);

  const sections = [
    ["text", "", alchemicalItem.description],
    ["benefit", "Beneficio: ", alchemicalItem.benefit],
    ["drawback", "Desventaja: ", alchemicalItem.drawback],
    ["minor", "Menor: ", alchemicalItem.minor],
    ["lesser", "Inferior: ", alchemicalItem.lesser],
    ["moderate", "Moderado: ", alchemicalItem.moderate],
    ["greater", "Superior: ", alchemicalItem.greater],
    ["major", "Mayor: ", alchemicalItem.major],
    ["level_true", "Beneficio: ", alchemicalItem.level_true],
    ["stage1", "Etapa 1: ", alchemicalItem.stage1],
    ["stage2", "Etapa 2: ", alchemicalItem.stage2],
    ["stage3", "Etapa 3: ", alchemicalItem.stage3],
    ["stage4", "Etapa 4: ", alchemicalItem.stage4],
  ];
  sections.forEach(([className, label, value]) => {
    const paragraph = document.createElement("p");
    paragraph.className = `${className} resize`;
    if (label) {
      const strong = document.createElement("strong");
      strong.textContent = label;
      paragraph.appendChild(strong);
    }
    paragraph.appendChild(document.createTextNode(
      Array.isArray(value) ? value.join(",") : value ?? "",
    ));
    if (!hasAlchemicalValue(value)) paragraph.classList.add("hidden");
    body.appendChild(paragraph);
  });
  const itemClass = document.createElement("b");
  itemClass.className = "class srclass";
  itemClass.textContent = getAlchemicalItemType(alchemicalItem.tags);
  const type = document.createElement("b");
  type.className = "type srtype";
  type.textContent = `ITEM ${alchemicalItem.level ?? ""}`;
  template.append(body, itemClass, type);
  let validAttributes = [];
  addIfNotEmpty(alchemicalItem.price, "Precio", validAttributes);
  addIfNotEmpty(alchemicalItem.hands, "Manos", validAttributes);
  addIfNotEmpty(alchemicalItem.action_type, "Activación", validAttributes);
  addIfNotEmpty(alchemicalItem.saving_throw, "Tirada de Salvación", validAttributes);
  addIfNotEmpty(alchemicalItem.onset, "Demora", validAttributes);
  addIfNotEmpty(alchemicalItem.maximum_duration, "Duración máxima", validAttributes);

  // Attributes
  let attributesHtml = attributes;
  let counter = 0;
  while(counter < validAttributes.length) {
    if(validAttributes.length - counter >= 2) {
      attributesHtml.appendChild(getAttributeTwoLinesHtml(validAttributes[counter], validAttributes[counter + 1]));
      counter += 2;
    } else {
      attributesHtml.appendChild(getAttributeLineHtml(validAttributes[counter]));
      counter++;
    }
  }


  return template;
}

function hasAlchemicalValue(value) {
  if (Array.isArray(value)) return value.some((entry) => String(entry).trim());
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function hideSectionIfEmpty(template, attr, selector) {
  if(attr.constructor.name === 'Array') {
    if(!notEmptyList(attr)) {
      template.querySelector(selector).classList.add('hidden');
    }
  }  else {
    if(!notEmpty(attr)) {
      template.querySelector(selector).classList.add('hidden');
    }
  }
}

function notEmpty(attr) {
  return attr !== undefined && attr !== null && attr !== '' && attr.length > 0;
}

function notEmptyList(attr) {
  if(attr !== undefined && attr !== null && attr.length <= 0) {
    return false;
  } else {
    for(let i = 0; i < attr.length; i++) {
      if(!notEmpty(attr[i])) {
        return false;
      }
    }
    return true;
  }
}

function getAlchemicalItemType(tagList) {
  let type = '';
  for (let i = 0; i < tagList.length; i++) {
    switch (tagList[i]) {
      case 'BOMBA':
      case 'ELIXIR':
      case 'MUTÁGENO':
      case 'VENENO':
        type = tagList[i];
        break;
    }
  }
  return type;
}

function addIfNotEmpty(att, name, attList) {
  if(att && att.length > 0) {
    attList.push({name : name, value : att});
  }
  return attList;
}

function getNonEmptyAttributes(spell) {
  let attributes = [];
  attributes = addIfNotEmpty(spell.castTime, 'Lanzamiento', attributes);
  attributes = addIfNotEmpty(spell.range, 'Rango', attributes);
  attributes = addIfNotEmpty(spell.area, 'Área', attributes);
  attributes = addIfNotEmpty(spell.duration, 'Duración', attributes);
  attributes = addIfNotEmpty(spell.objectives, 'Objetivo', attributes);
  attributes = addIfNotEmpty(spell.trigger, 'Desencadenate', attributes);

  return attributes;
}

function getAttributeTwoLinesHtml(att1, att2) {
  return createAttributeLine([att1, att2]);
}
function getAttributeLineHtml(att1) {
  return createAttributeLine([att1]);
}

function createAttributeLine(attributes) {
  const line = document.createElement("ul");
  line.className = "status lined";
  for (let index = 0; index < 2; index++) {
    const item = document.createElement("li");
    if (index === 1) item.className = "second";
    const attribute = attributes[index];
    if (attribute) {
      const label = document.createElement("em");
      label.textContent = attribute.name;
      item.append(label, document.createTextNode(attribute.value ?? ""));
    }
    line.appendChild(item);
  }
  const clear = document.createElement("br");
  clear.className = "clear";
  line.appendChild(clear);
  return line;
}

function getActionImg(actionType) {
  let imgPath;
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
    default:
      imgPath = "";
  }
  return imgPath;
}
