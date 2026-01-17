let selectorIndicador;
let selectorTipo;
let selectorConcejo;
let selectorX;
let selectorY;
let selectorModo;


let datosJSON = {};
let indicadorActual = null;
let indicadores = [];
let modoActual = "mapa";
let tipoGrafico = "bar";
let concejoActual = null;
let chart = null;


// Botón cerrar del cuadro de información
 const btn = document.querySelector('[data-action="cerrar"]');
  if (btn) {
    btn.onclick = (e) => {
      console.log("Pasa algo");
      e.preventDefault();
      e.stopPropagation();
      cerrarInfo();
    };
  }

function getMapaEl() {
  return document.querySelector('[data-role="mapa"]');
}

function getInfoEl() {
  return document.querySelector('aside[data-role="info"]');
}

function mostrarInfo(municipio, valor, clientX, clientY) {
  const mapa = getMapaEl();
  const info = getInfoEl();
  if (!info || !mapa) return;

  const h3 = info.querySelector('h3');
  if (h3) h3.textContent = municipio;

  const ind = info.querySelector('[data-info="indicador"]');
  if (ind) ind.textContent = indicadorActual || "";

  const val = info.querySelector('[data-info="valor"]');
  if (val) val.textContent = valor !== undefined ? valor : "n/d";

  // Mostrar primero para poder medir tamaño real
  info.classList.add("show");

  const r = mapa.getBoundingClientRect();
  const x = clientX - r.left;
  const y = clientY - r.top;

  const PADDING = 12;

  const boxW = info.offsetWidth || 260;
  const boxH = info.offsetHeight || 140;

  const left = Math.min(x + PADDING, r.width - boxW - PADDING);
  const top  = Math.min(y + PADDING, r.height - boxH - PADDING);

  info.style.left = `${Math.max(PADDING, left)}px`;
  info.style.top  = `${Math.max(PADDING, top)}px`;
}

function cerrarInfo() {
  const info = getInfoEl();
  if (!info) return;
  info.classList.remove("show");
}


document.addEventListener("keydown", (ev) => {
  if (ev.key === "Escape") cerrarInfo();
});

/**
 * Devuelve un color según en que porcentaje esté el valor entre mínimo y maximo
 * usando una paleta de 10 colores
 * @param {*} valor 
 * @param {*} min 
 * @param {*} max 
 * @returns 
 */
function colorPorRango(valor, min, max) {
    const escalaRangos = [
          "#ffffcc", 
          "#ffeda0",
          "#fed976",
          "#feb24c",
          "#fd8d3c",
          "#fc4e2a",
          "#e31a1c",
          "#bd0026",
          "#800026",
          "#4d0018"  
    ];

    if (max === min) return escalaRangos[0];

    const ratio = (valor - min) / (max - min);
    const rango = Math.min(
        escalaRangos.length - 1,
        Math.floor(ratio * escalaRangos.length)
    );

    return escalaRangos[rango];
}


function pintarMapa() {
    if (!indicadorActual || !datosJSON) return;

    // de una entrada saca un número para colorear
    function valorParaColor(entry) {
        if (entry == null) return NaN;

        if (typeof entry === "object") {
            const v = Number(entry.valor);
            return Number.isNaN(v) ? NaN : v;
        }

        // Caso antiguo: número directo
        return Number(entry);
    }

    // Sacar todos los valores numéricos del indicador para calcular min y max
    const valores = Object.values(datosJSON)
        .map(o => o && o[indicadorActual])
        .map(valorParaColor)
        .filter(v => !isNaN(v));

    if (valores.length === 0) return;

    // ------------------------------------------
    // colores para CLUSTERS
    // ------------------------------------------
    const coloresCluster = [
      "#1f77b4", 
      "#ff7f0e", 
      "#2ca02c", 
      "#d62728", 
      "#9467bd", 
      "#8c564b", 
      "#e377c2", 
      "#7f7f7f", 
      "#bcbd22", 
      "#17becf", 
      "#aec7e8", 
      "#ffbb78", 
      "#98df8a", 
      "#ff9896", 
      "#c5b0d5"  
    ];

    const esCluster = indicadorActual.toLowerCase().includes("cluster");

    const min = Math.min(...valores);
    const max = Math.max(...valores);

    //Leyenda dinámica
    clearLegend();
    const legend = getLegendContainer();

    // distintas leyendas para cluster y para el resto de indicadores
    if (esCluster) {

      // valores de cluster existentes (enteros)
      const clusterValues = new Set(
          Object.values(datosJSON)
            .map(o => o && o[indicadorActual])
            .map(entry => {
              if (typeof entry === "object" && entry !== null && "valor" in entry) return Number(entry.valor);
              return Number(entry);
            })
            .map(v => parseInt(v, 10))
            .filter(v => Number.isFinite(v))
        );
      renderLegendClusters({ legend, indicadorActual, clusterValues, coloresCluster });
    } else {
      renderLegendRangos({ legend, indicadorActual, min, max });
    }

    // pinta cada municipio del mapa
    document.querySelectorAll("svg a").forEach(a => {
        const municipio = a.getAttribute("title");
        const path = a.querySelector("path");

        const entry = datosJSON[municipio] ? datosJSON[municipio][indicadorActual] : undefined;

        if (!path || entry === undefined) {
            path.style.fill = "transparent";
            a.onclick = null;
            return;
        }

        const valorNum = valorParaColor(entry);

        if (isNaN(valorNum)) {
            path.style.fill = "transparent";
            a.onclick = null;
            return;
        }

        if (esCluster) {
            // Para clusters -> número entero 
            const idx = Math.abs(parseInt(valorNum, 10)) % coloresCluster.length;
            path.style.fill = coloresCluster[idx];
        } else {
            // Para indicadores normales, escala en función del valor 
            path.style.fill = colorPorRango(valorNum, min, max);

        }

        // Valor a mostrar en la leyenda -> el valor original 
        let valorOriginal;
        if (typeof entry === "object" && entry !== null && "valor" in entry) {
            valorOriginal = entry.valor;
        } else {
            valorOriginal = valorNum;
        }

        //muestra el infobox con la información del municipio seleccionado
        a.onclick = (ev) => {
          ev.preventDefault();
          cerrarInfo();
          mostrarInfo(municipio, valorOriginal, ev.clientX, ev.clientY);
        };
    });

    cerrarInfo();
}


function pintarGrafico() {
  cerrarInfo();

  const canvas = document.querySelector('[data-canvas="grafico"]');
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  const indicadorX = document.querySelector('select[data-field="indicador-x"]')?.value;
  const indicadorY = document.querySelector('select[data-field="indicador-y"]')?.value;

  // Construye los datos dependiendo del tipo de gráfico
  const { labels, data, meta } = buildChartData({
    tipoGrafico,
    datosJSON,
    concejoActual,
    indicadorActual,
    indicadorX,
    indicadorY
  });

  if (chart) chart.destroy();

  // Crea un nuevo Chart con la config correcta
  chart = new Chart(ctx, buildChartConfig({ tipoGrafico, labels, data, meta }));
}

/* =========================
   Helpers de datos JSON
   ========================= */

function getEntry(datosJSON, municipio, indicador) {
  // Devuelve la entrada del indicador para un municipio:
  // {valor, zscore}
  const obj = datosJSON?.[municipio];
  return obj ? obj[indicador] : undefined;
}

function toNumber(entry, mode ) {
  // Convierte una entrada a número en función del modo:
  // - mode="valor" => entry.valor
  // - mode="z"     => entry.zscore

  if (entry == null) return NaN;

  if (typeof entry === "object") {
    const raw = mode === "z" ? entry.zscore : entry.valor;
    const num = Number(raw);
    return Number.isNaN(num) ? NaN : num;
  }

  const num = Number(entry);
  return Number.isNaN(num) ? NaN : num;
}

/* =========================
   Construcción de datos
   ========================= */

function buildChartData({ tipoGrafico, datosJSON, concejoActual, indicadorActual, indicadorX, indicadorY }) {
  // Radar y polarArea muestran un concejo con todos sus indicadores
  if (tipoGrafico === "radar" || tipoGrafico === "polarArea") {
    return buildConcejoSeries({ datosJSON, concejoActual });
  }

  // Scatter usa indicadorX e indicadorY en todos los concejos
  if (tipoGrafico === "scatter") {
    return buildScatterSeries({ datosJSON, indicadorX, indicadorY });
  }

  // bar usa un indicador en todos los concejos
  return buildIndicadorSeries({ datosJSON, indicadorActual });
}

function buildConcejoSeries({ datosJSON, concejoActual }) {
  //Indicadores del concejo actual
  const indicadoresObj = datosJSON?.[concejoActual] || {};

  //Excluir los indicadores de cluster 
  const allLabels = Object.keys(indicadoresObj).filter(ind =>
    !ind.toLowerCase().includes("cluster")
  );

  // Filtramos solo los que tengan número válido
  const labels = [];
  const data = [];

  for (const ind of allLabels) {
    const v = toNumber(indicadoresObj[ind], "valor");
    if (Number.isFinite(v)) {
      labels.push(ind);
      data.push(v);
    }
  }

  return { labels, data, meta: { mode: "valor", concejo: concejoActual } };
}


function buildIndicadorSeries({ datosJSON, indicadorActual }) {
  const municipios = Object.keys(datosJSON || {});

  const labels = [];
  const data = [];

  //excluir NaN
  for (const m of municipios) {
    const v = toNumber(getEntry(datosJSON, m, indicadorActual), "z");
    if (Number.isFinite(v)) {
      labels.push(m);
      data.push(v);
    }
  }

  return { labels, data, meta: { mode: "z", indicador: indicadorActual } };
}

function buildScatterSeries({ datosJSON, indicadorX, indicadorY }) {
  const municipios = Object.keys(datosJSON || {});
  const points = [];

  //Excluir municipios con x o y NaN
  for (const m of municipios) {
    const x = toNumber(getEntry(datosJSON, m, indicadorX), "z");
    const y = toNumber(getEntry(datosJSON, m, indicadorY), "z");
    if (Number.isFinite(x) && Number.isFinite(y)) {
      points.push({ x, y, label: m });
    }
  }

  const { linePoints, slope, intercept } = regressionLine(points);

  return {
    labels: points.map(p => p.label),
    data: { points, linePoints },
    meta: { mode: "z", indicadorX, indicadorY, slope, intercept }
  };
}

/* =========================
   Regresión lineal (y = a + b x)
   ========================= */

function regressionLine(points) {
  const clean = points
    .filter(p => Number.isFinite(p.x) && Number.isFinite(p.y));

  // Si no hay suficientes puntos para calcular regresión
  if (clean.length < 2) {
    return { linePoints: [], slope: 0, intercept: 0 };
  }

  // Sumatorios para fórmula de mínimos cuadrados
  const n = clean.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

  for (const p of clean) {
    sumX += p.x;
    sumY += p.y;
    sumXY += p.x * p.y;
    sumXX += p.x * p.x;
  }

  // Pendiente y ordenada
  const denom = (n * sumXX - sumX * sumX);
  const slope = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  // Coge minX y maxX para dibujar la línea con 2 puntos
  const xs = clean.map(p => p.x);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);

  const linePoints = [
    { x: minX, y: intercept + slope * minX },
    { x: maxX, y: intercept + slope * maxX }
  ];

  return { linePoints, slope, intercept };
}

/* =========================
   Config Chart.js
   ========================= */

function buildChartConfig({ tipoGrafico, labels, data, meta }) {
  
  // Scatter requiere config especial
  if (tipoGrafico === "scatter") {
    return scatterConfig({ labels, points: data.points, linePoints: data.linePoints, meta });
  }

  return commonConfig({ tipoGrafico, labels, data, meta });
}

function scatterConfig({ labels, points, linePoints, meta }) {
  return {
    type: "scatter",
    data: {
      labels,
      datasets: [
        {
          label: `${meta.indicadorX} junto ${meta.indicadorY} (z-score)`,
          data: points,
          backgroundColor: "rgba(0, 150, 200, 0.6)"
        },
        {
          label: "Recta de ajuste",
          data: linePoints,
          type: "line",
          borderColor: "red",       
          backgroundColor: "transparent",
          parsing: false,
          pointRadius: 0,
          borderWidth: 2,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        tooltip: {
          callbacks: {
            label: ctx => {
              if (ctx.datasetIndex === 1) return "Recta de ajuste";
              const p = ctx.raw;
              // usar label del punto (no depende de labels/index)
              return `${p.label}: (Zx=${p.x.toFixed(3)}, Zy=${p.y.toFixed(3)})`;            
            }
          }
        },
        legend: {
          labels: { color: "#000", font: { size: 13 } }
        }
      },
      scales: {
        x: {
          title: { display: true, text: "Z-score de " + meta.indicadorX, color: "#000", font: { size: 14, weight: "bold" } }
        },
        y: {
          title: { display: true, text: "Z-score de " + meta.indicadorY, color: "#000", font: { size: 14, weight: "bold" } },
          beginAtZero: false
        }
      }
    }
  };
}


function commonConfig({ tipoGrafico, labels, data, meta }) {

  const isNumericArray = Array.isArray(data) && data.every(v => typeof v === "number");
  const maxData = isNumericArray ? (Math.max(...data, 0) || 1) : 1;

  return {
    type: tipoGrafico,
    data: {
      labels,
      datasets: [{
        label:
          (tipoGrafico === "radar" || tipoGrafico === "polarArea")
            ? concejoActual
            : indicadorActual,
        data,

        backgroundColor:
          tipoGrafico === "radar"
            ? "rgba(0, 150, 200, 0.2)"
            : tipoGrafico === "polarArea"
              ? data.map(v => `rgba(0, ${Math.round(100 + 155 * (v / maxData))}, 200, 0.4)`)
              : data.map(v => `rgb(0,${Math.round(100 + 155 * (v / maxData))},0)`),

        borderColor:
          (tipoGrafico === "radar" || tipoGrafico === "polarArea")
            ? "rgb(0,150,200)"
            : undefined,

        borderWidth:
          tipoGrafico === "radar" ? 2 :
          tipoGrafico === "polarArea" ? 1 : undefined,

        fill: tipoGrafico === "radar" ? true : undefined
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        tooltip: {
          callbacks: {
            label: ctx => ctx.raw
          }
        },
        legend: {
          labels: { color: "#000", font: { size: 13 } }
        }
      },
      scales:
        tipoGrafico === "bar"
          ? {
              x: { title: { display: true, text: "Municipio", color: "#000", font: { size: 14, weight: "bold" } } },
              y: { title: { display: true, text: "Z-score de " + indicadorActual, color: "#000", font: { size: 14, weight: "bold" } }, beginAtZero: false }
            }
          : tipoGrafico === "radar"
            ? { r: { beginAtZero: true, angleLines: { color: "#ccc" }, grid: { color: "#eee" } } }
            : {}
    }
  };
}

function actualizarSelectorIndicadores() {
    // vacía el selector para actualizarlo
    selectorIndicador.innerHTML = "";

    indicadores.forEach(ind => {
        const esCluster = ind.toLowerCase().includes("cluster");

        // En modo gráfico NO mostrar cluster
        if (modoActual !== "mapa" && esCluster) return;

        const option = document.createElement("option");
        option.value = ind;
        option.textContent = ind;
        selectorIndicador.appendChild(option);
    });

    // Si el indicadorActual ya no existe en las opciones, se ajusta al primero
    if (
        indicadorActual &&
        !Array.from(selectorIndicador.options).some(o => o.value === indicadorActual)
    ) {
        indicadorActual = selectorIndicador.options[0]?.value || null;
    }
}

function actualizarVista() {

    //actualiza el selector de indicadores según el modo
    actualizarSelectorIndicadores();

    //contenedores principales
    const mapa = document.querySelector('[data-role="mapa"]');
    const grafico = document.querySelector('[data-role="grafico"]');

    //bloques de controles
    const bloqueTipo = document.querySelector('[data-role="tipo-grafico"]');
    const bloqueIndicador = document.querySelector('[data-role="indicadores"]');
    const bloqueConcejo = document.querySelector('[data-role="concejo"]');
    const bloqueXY = document.querySelector('[data-role="indicadores-xy"]');

    const legendPanel = document.querySelector('[data-role="leyenda"]');

    if (modoActual === "mapa") {

        // Mostrar mapa y ocultar gráfico
        mapa.style.display = "block";
        grafico.style.display = "none";

        //solo se necesita el indicador
        bloqueIndicador.style.display = "flex";
        bloqueTipo.style.display = "none";
        bloqueConcejo.style.display = "none";
        bloqueXY.style.display = "none";

        
        // selectorIndicador.style.display = "inline-block";

        // selectorTipo.style.display = "none";

        // selectorConcejo.style.display = "none";

        // selectorX.style.display = "none";
        // selectorY.style.display = "none";

        // La leyenda debe verse en mapa
        legendPanel.hidden = false;

        pintarMapa();

    } else {

        // Ocultar mapa y mostrar gráfico
        mapa.style.display = "none";
        grafico.style.display = "block";

        // En modo gráfico: tipo siempre visible
        bloqueTipo.style.display = "flex";
        selectorTipo.style.display = "inline-block";


        // Si el tipo es bar => se elige un indicador (z-score)
        // Radar/polar usan "concejoActual" e indicadores
        // Scatter usa indicadores X/Y
        if (tipoGrafico !== "radar" && tipoGrafico !== "scatter" && tipoGrafico !== "polarArea") {
          bloqueIndicador.style.display = "flex";  
          selectorIndicador.style.display = "inline-block";
        } else {
          bloqueIndicador.style.display = "none";  
          selectorIndicador.style.display = "none";
        }

        if (tipoGrafico === "radar" || tipoGrafico === "polarArea") {
            bloqueConcejo.style.display = "flex";
            selectorConcejo.style.display = "inline-block";
        } else {
          bloqueConcejo.style.display = "none";
          selectorConcejo.style.display = "none";
        }

        // X/Y solo scatter
        if (tipoGrafico === "scatter") {
          bloqueXY.style.display = "flex";
          selectorX.style.display = "inline-block";
          selectorY.style.display = "inline-block";
        } else {
          bloqueXY.style.display = "none";
          selectorX.style.display = "none";
          selectorY.style.display = "none";
        }

        legendPanel.hidden = true;

        clearLegend();
        setTimeout(() => pintarGrafico(), 50);
    }
}

/* =========================
   Leyenda dinámica del mapa
   ========================= */

function getLegendContainer() {
  // Contenedor real dentro de la barra entre controles y mapa
  const legendHost = document.querySelector('[data-leyenda="contenido"]');

  if (!legendHost) {
    throw new Error("No existe [data-leyenda='contenido'] en el HTML");
  }
  return legendHost;
}

function clearLegend() {
  //limpiar el cntenido
  const legendHost = document.querySelector('[data-leyenda="contenido"]');
  if (legendHost) legendHost.innerHTML = "";
}

/**
 * Pinta leyenda por (rangos numéricos)
 * @param {Object} params
 * @param {HTMLElement} params.legend 
 * @param {string} params.indicadorActual
 * @param {number} params.min
 * @param {number} params.max
 */
function renderLegendRangos({ legend, indicadorActual, min, max }) {
  if (!legend) legend = getLegendContainer();

  legend.innerHTML = "";

  const title = document.createElement("div");
  title.style.fontWeight = "bold";
  title.style.marginBottom = "6px";
  title.textContent = `Leyenda (${indicadorActual})`;
  legend.appendChild(title);

  const escalaRangos = [
    "#ffffcc",
    "#ffeda0",
    "#fed976",
    "#feb24c",
    "#fd8d3c",
    "#fc4e2a",
    "#e31a1c",
    "#bd0026",
    "#800026",
    "#4d0018"
  ];

  // Evitar división por 0 / valores raros
  const minNum = Number(min);
  const maxNum = Number(max);

  // Si no hay rango válido o min==max, no puedes generar intervalos
  if (!Number.isFinite(minNum) || !Number.isFinite(maxNum) || minNum === maxNum) {
    const msg = document.createElement("div");
    msg.textContent = "No hay rango suficiente para generar la leyenda.";
    legend.appendChild(msg);
    return;
  }

  //diez intervalos 
  const step = (maxNum - minNum) / 10;

  const list = document.createElement("div");
  list.setAttribute("data-leyenda", "lista");   
  list.style.display = "grid";
  list.style.gap = "4px";

  // Generas las 10 filas
  for (let i = 0; i < 10; i++) {
    const from = minNum + step * i;
    const to = (i === 9) ? maxNum : (minNum + step * (i + 1));

    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.gap = "8px";

    const swatch = document.createElement("span");
    swatch.style.width = "14px";
    swatch.style.height = "14px";
    swatch.style.borderRadius = "3px";
    swatch.style.background = escalaRangos[i];
    swatch.style.border = "1px solid rgba(0,0,0,0.15)";

    const label = document.createElement("span");
    label.style.whiteSpace = "nowrap";
    label.textContent = `${from.toFixed(2)} – ${to.toFixed(2)}`;

    row.appendChild(swatch);
    row.appendChild(label);
    list.appendChild(row);
  }

  legend.appendChild(list);
}

/**
 * Pinta leyenda por clusters (categorías)
 * @param {Object} params
 * @param {HTMLElement} params.legend 
 * @param {string} params.indicadorActual
 * @param {Array<number|string>} params.clusterValues
 * @param {Array<string>} params.coloresCluster
 */
function renderLegendClusters({ legend, indicadorActual, clusterValues, coloresCluster }) {
  if (!legend) legend = getLegendContainer();
  legend.innerHTML = "";

  const titulo = document.createElement("div");
  titulo.style.fontWeight = "bold";
  titulo.style.marginBottom = "6px";
  titulo.textContent = `Leyenda (${indicadorActual})`;
  legend.appendChild(titulo);

  // Ordenar clusters numéricamente
  const clustersOrdenados = Array.from(clusterValues)
    .map(v => parseInt(v, 10))
    .filter(v => Number.isFinite(v))
    .sort((a, b) => a - b);

  const list = document.createElement("div");
  list.setAttribute("data-leyenda", "lista");   
  list.style.display = "grid";
  list.style.gap = "4px";
  legend.appendChild(list);

  clustersOrdenados.forEach(c => {
    const idx = Math.abs(c) % coloresCluster.length;
    const color = coloresCluster[idx];

    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.gap = "8px";

    const swatch = document.createElement("span");
    swatch.style.width = "14px";
    swatch.style.height = "14px";
    swatch.style.borderRadius = "3px";
    swatch.style.backgroundColor = color;
    swatch.style.border = "1px solid rgba(0,0,0,0.15)";
    swatch.style.display = "inline-block"; 

    const label = document.createElement("span");
    label.style.whiteSpace = "nowrap";
    label.textContent = `Cluster ${c}`;

    row.appendChild(swatch);
    row.appendChild(label);
    list.appendChild(row);
  });
}
