function cardTemplate(spell) {
  return `
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

export { cardTemplate };
