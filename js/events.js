document.addEventListener("DOMContentLoaded", () => {

    selectorIndicador = document.querySelector('[data-field="indicador"]');
    selectorModo = document.querySelector('[data-field="modo"]');
    selectorTipo = document.querySelector('[data-field="tipo-grafico"]');
    selectorConcejo = document.querySelector('[data-field="concejo"]');
    selectorX = document.querySelector('[data-field="indicador-x"]');
    selectorY = document.querySelector('[data-field="indicador-y"]');
    selectorArchivo = document.querySelector('[data-field="archivo"]');
    
    
    // cuando se cambien los selectores, se ha de actualizar todo
    //si se cambia un selector se ha de atualizar la página
    selectorIndicador.addEventListener("change", e => {
        indicadorActual = e.target.value;
        actualizarVista();
    });

    selectorModo.addEventListener("change", e => {
        modoActual = e.target.value;

        actualizarSelectorIndicadores();
        actualizarVista();
    });

    selectorTipo.addEventListener("change", e => {
        tipoGrafico = e.target.value;
        if (modoActual === "grafico") actualizarVista();
    });

    selectorConcejo.addEventListener("change", e => {
        concejoActual = e.target.value;
        console.log("Cambio concejo a:", concejoActual, "tipoGrafico:", tipoGrafico);

        if (modoActual === "grafico") {
                actualizarVista();   
            }
    });

    selectorX.addEventListener("change", () => {
        if (tipoGrafico === "scatter") pintarGrafico();
    });

    selectorY.addEventListener("change", () => {
        if (tipoGrafico === "scatter") pintarGrafico();
    });

});