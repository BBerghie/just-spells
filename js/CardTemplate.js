function spellCardTemplate(spell) {
  return `
  		<div class="front">
 			<div class="body">
  				<h3 class="name lined srname" data-search="${spell.title} ${spell.enTitle}">${spell.title} <img src="${getActionImg(spell.actionType)}" alt="${spell.actionType}"/></h3>
  				<ul class="status lined">
 					<li><em>Lanzamiento</em>${spell.castTime ? spell.castTime : "-"}</li>
 					<li class="second"><em>Rango</em>${spell.range}</li>
 					<br class="clear">
  				</ul>

  				<ul class="status lined">
 					<li><em>Área</em>${spell.area}</li>
 					<li class="second"><em>Duración</em>${spell.duration}</li>
 					<br class="clear">
  				</ul>

  				<ul class="status lined">
 					<li><em>Objetivo</em>${spell.objectives}</li>
 					<li class="second"><em>Desencadenate</em>${spell.trigger}</li>
 					<br class="clear">
  				</ul>
  				<p class="text">${spell.description}<br> <b>Elevaciones</b>: ${spell.heightenings} </p>

 			</div>
 			<b class="class srclass">${spell.traditions}</b>
 			<b class="type srtype">${spell.type} ${spell.level}</b>
  		</div>
  `;
}

function alchemicalItemCardTemplate(alchemicalItem) {
  let template = document.createElement("div");
  template.setAttribute("class", "front");
  template.innerHTML = `
  		<div class="front">
 			<div class="body">
  				<h3 class="name lined srname" data-search="${alchemicalItem.title} ${alchemicalItem.englishTitle}">${alchemicalItem.title} <img src="${getActionImg(alchemicalItem.actions)}" alt="${alchemicalItem.actions}"/></h3>
  				<div class="attributes"></div>
  				<p class="text resize">${alchemicalItem.description}</p>
  				<p class="benefit resize"><strong>Beneficio: </strong>${alchemicalItem.benefit}</p>
  				<p class="drawback resize"><strong>Desventaja: </strong>${alchemicalItem.drawback}</p>
  				<p class="minor resize"><strong>Menor: </strong>${alchemicalItem.minor}</p>
  				<p class="lesser resize"><strong>Inferior: </strong>${alchemicalItem.lesser}</p>
  				<p class="moderate resize"><strong>Moderado: </strong>${alchemicalItem.moderate}</p>
  				<p class="greater resize"><strong>Superior: </strong>${alchemicalItem.greater}</p>
  				<p class="major resize"><strong>Mayor: </strong>${alchemicalItem.major}</p>
  				<p class="level_true resize"><strong>Beneficio: </strong>${alchemicalItem.level_true}</p>
  				<p class="stage1 resize"><strong>Etapa 1: </strong>${alchemicalItem.stage1}</p>
  				<p class="stage2 resize"><strong>Etapa 2: </strong>${alchemicalItem.stage2}</p>
  				<p class="stage3 resize"><strong>Etapa 3: </strong>${alchemicalItem.stage3}</p>
  				<p class="stage4 resize"><strong>Etapa 4: </strong>${alchemicalItem.stage4}</p>
  				

 			</div>
 			<b class="class srclass">${getAlchemicalItemType(alchemicalItem.tags)}</b>
 			<b class="type srtype">ITEM ${alchemicalItem.level}</b>
  		</div>
  `;
  let validAttributes = [];
  addIfNotEmpty(alchemicalItem.price, "Precio", validAttributes);
  addIfNotEmpty(alchemicalItem.hands, "Manos", validAttributes);
  addIfNotEmpty(alchemicalItem.action_type, "Activación", validAttributes);
  addIfNotEmpty(alchemicalItem.saving_throw, "Tirada de Salvación", validAttributes);
  addIfNotEmpty(alchemicalItem.onset, "Demora", validAttributes);
  addIfNotEmpty(alchemicalItem.maximum_duration, "Duración máxima", validAttributes);

  // Attributes
  let attributesHtml = template.querySelector('.attributes');
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


  // Mutagens
  hideSectionIfEmpty(template, alchemicalItem.benefit, '.benefit');
  hideSectionIfEmpty(template, alchemicalItem.drawback, '.drawback');

  // Types
  hideSectionIfEmpty(template, alchemicalItem.minor, '.minor');
  hideSectionIfEmpty(template, alchemicalItem.lesser, '.lesser');
  hideSectionIfEmpty(template, alchemicalItem.moderate, '.moderate');
  hideSectionIfEmpty(template, alchemicalItem.greater, '.greater');
  hideSectionIfEmpty(template, alchemicalItem.major, '.major');
  hideSectionIfEmpty(template, alchemicalItem.level_true, '.level_true');

  // Stages
  hideSectionIfEmpty(template, alchemicalItem.stage1, '.stage1');
  hideSectionIfEmpty(template, alchemicalItem.stage2, '.stage2');
  hideSectionIfEmpty(template, alchemicalItem.stage3, '.stage3');
  hideSectionIfEmpty(template, alchemicalItem.stage4, '.stage4');

  return template;
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
  let el = document.createElement('ul');
  el.setAttribute('class', 'status lined');
  el.innerHTML = `
    <li><em>${att1.name}</em>${att1.value}</li>
    <li class="second"><em>${att2.name}</em>${att2.value}</li>
    <br class="clear">
`;

  return el;
}
function getAttributeLineHtml(att1) {
  let el = document.createElement('ul');
  el.setAttribute('class', 'status lined');
  el.innerHTML =  `
    <li><em>${att1.name}</em>${att1.value}</li>
    <li class="second"></li>
    <br class="clear">
`
  return el;
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
      imgPath = actionType;
  }
  return imgPath;
}
