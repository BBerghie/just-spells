function cardTemplate(spell) {
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
  return `
<ul class="status lined">
    <li><em>${att1.name}</em>${att1.value}</li>
    <li class="second"><em>{att2.name}</em>${att2.value}</li>
    <br class="clear">
</ul>
`
}
function getAttributeLineHtml(att1) {
  return `
<ul class="status lined">
    <li><em>${att1.name}</em>${att1.value}</li>
    if(att2
    <br class="clear">
</ul>
`
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
