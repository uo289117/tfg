document.addEventListener("DOMContentLoaded", () => { 
    // En el archivo ese se encuentran los nombres del resto de JSONs
    // que continenen datos
    fetch("JSONsGenerados/index.json")
    .then(r => r.json())
    .then(archivos => {

        const selectorArchivo = document.querySelector('[data-field="archivo"]');
        selectorArchivo.innerHTML = "";

        //llena el selector de archivos excluyendo al index.json
        archivos
            .filter(nombre => nombre.toLowerCase() !== "index.json")
            .forEach(nombre => {
                const ruta = "JSONsGenerados/" + nombre;
                const op = document.createElement("option");
                op.value = ruta;
                op.textContent = nombre;
                selectorArchivo.appendChild(op);
            });

        //saca de la ruta el archivo que se creó y lo pone predeterminado
        const params = new URLSearchParams(window.location.search);
        const archivoActual = params.get("file");
        if (archivoActual) selectorArchivo.value = archivoActual;

        //cuando se use el selector cambia el archivo que se está visualizando
        selectorArchivo.addEventListener("change", e => {
            window.location.search = "?file=" + e.target.value;
        });
    });
    
    //-------------------------------------------------

    const params = new URLSearchParams(window.location.search);
    const archivo = params.get('file');

    //carga el mapa y lo pinta
    fetch("archivos_de_interes/mapasvg.xml")
    .then(r => r.text())
    .then(svg => {
        document.querySelector('[data-role="mapa-svg"]').innerHTML = svg;

        pintarMapa();  
    });

    // carga el archivo seleccionado
    fetch(archivo)
        .then(r => r.json())
        .then(datos => {

            datosJSON = datos;
            //guardar los distintos concejos e indicadores
            const concejos = Object.keys(datosJSON);
            if (!concejos.length) return;
        
            indicadores = Object.keys(datosJSON[concejos[0]]);
            selectorIndicador.innerHTML = "";
            selectorX.innerHTML = "";
            selectorY.innerHTML = "";

            //llena los selectores de indicadores
            indicadores.forEach(ind => {

                [selectorIndicador, selectorX, selectorY].forEach(sel => {
                    if (ind.toLowerCase().includes("cluster") && sel != selectorIndicador) return;

                    const option = document.createElement("option");
                    option.value = ind;
                    option.textContent = ind;
                    sel.appendChild(option.cloneNode(true));
                });
            });

            indicadorActual = selectorIndicador.value = indicadores[0];
            document.querySelector('select[data-field="indicador-x"]').value;
            document.querySelector('select[data-field="indicador-y"]').value;

            selectorConcejo.innerHTML = "";
            concejos.forEach(c => {
                const option = document.createElement("option");
                option.value = c;
                option.textContent = c;
                selectorConcejo.appendChild(option);
            });
            concejoActual = selectorConcejo.value = concejos[0];
        
            actualizarVista();
        
        });
 })