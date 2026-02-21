document.addEventListener("DOMContentLoaded", function (event) {
  const fragment = document.getElementById("spell-template");

  fetch("./resources/spells.json")
    .then((response) => response.json())
    .then((data) => {
      console.log(data);

      data.map((item) => {
        // Create an instance of the template content
        const instance = document.importNode(fragment.content, true);

        instance.onclick = hgagoalog;

        // Add relevant content to the template
        instance.querySelector(".title").innerHTML = item.englishTitle;
        // Append the instance ot the DOM
        document.getElementById("spells").appendChild(instance);
      });
    })
    .catch((error) => console.error("Error loading JSON file", error));

  function hgagoalog(params) {
    console.log("holis");
    //console.log(params);
  }
});
