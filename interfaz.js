/* =====================================================================
   interfaz.js - Conecta la pagina (index.html) con el CPU (cpu.js).
   Solo se le pregunta a cpu.js que paso y se dibuja en pantalla.

   Funciones de cpu.js que usamos: CPU.estado, CPU.paso(), CPU.vistaPrevia(),
   CPU.reiniciar(), CPU.cargarPrograma(), CPU.desensamblar()
   ===================================================================== */

// Programas de ejemplo: 16 numeros = las 16 celdas de memoria.
// 0x1D significa LOAD 13 (opcode 1, direccion 13). Los datos van al final.

const PROGRAMAS = {
  "Sumar dos números (5 + 7)": [0x1D, 0x2E, 0x4F, 0x00, 0,0,0,0,0,0,0,0,0, 5, 7, 0],
  "Restar (9 - 4)":            [0x1D, 0x3E, 0x4F, 0x00, 0,0,0,0,0,0,0,0,0, 9, 4, 0],
  "Cuenta regresiva 3 a 0 (JZ)": [0x1E, 0x65, 0x3F, 0x4E, 0x50, 0x00, 0,0,0,0,0,0,0,0, 3, 1],
  "Bucle infinito (JMP)":      [0x1D, 0x2E, 0x4D, 0x50, 0,0,0,0,0,0,0,0,0, 1, 1, 0]
};

const REGISTROS = ["pc", "ir", "acc", "mar", "mdr"]; // registros que se dibujan
let temporizador = null; // guarda el "reloj" del boton Ejecutar (null = detenido)
let cambiados = [];      // registros que cambiaron en el ultimo paso (se pintan de amarillo)

// Atajo: $("registros") es lo mismo que document.getElementById("registros")
const $ = (id) => document.getElementById(id);

// Vuelve a dibujar registros, memoria y botones segun el estado actual del CPU
function dibujar() {
  const e = CPU.estado;

  $("registros").innerHTML = REGISTROS.map((r) =>
    `<div class="reg ${cambiados.includes(r) ? "cambio" : ""}">
       <span class="nombre">${r.toUpperCase()}</span>
       <span class="valor">${e[r]}</span>
       <span class="bin">${e[r].toString(2).padStart(8, "0")}</span>
     </div>`).join("");

  $("memoria").querySelector("tbody").innerHTML = e.mem.map((v, i) =>
    `<tr class="${i === e.mar && cambiados.includes("mem") ? "cambio" : ""} ${i === ((e.fase === "fetch" && !e.detenido) ? e.pc : -1) ? "actual" : ""}">
       <td>${i}</td><td>${v}</td>
       <td>${v.toString(2).padStart(8, "0")}</td>
       <td>${CPU.desensamblar(v)}</td>
     </tr>`).join("");

  $("fase-actual").textContent = e.detenido ? "CPU detenido" : "Siguiente fase: " + e.fase;
  $("btn-paso").disabled = e.detenido;
  $("btn-ejecutar").disabled = e.detenido;
}

// Se ejecuta al presionar "Paso": avanza una fase y la anota en la bitacora
function dar_paso() {
  const r = CPU.paso();
  cambiados = r.cambios;
  const li = document.createElement("li");
  li.textContent = r.texto;
  $("bitacora").prepend(li);
  if (CPU.estado.detenido) detener();
  dibujar();
}

// Detiene la ejecucion automatica
function detener() {
  clearInterval(temporizador);
  temporizador = null;
  $("btn-ejecutar").textContent = "Ejecutar";
}

// Boton "Ejecutar": avanza un paso cada 600 ms; si ya corre, lo pausa
function alternarEjecucion() {
  if (temporizador) return detener();
  $("btn-ejecutar").textContent = "Pausar";
  temporizador = setInterval(dar_paso, 600);
}

// Carga el programa elegido y deja todo limpio
function cargar(nombre) {
  detener();
  CPU.cargarPrograma(PROGRAMAS[nombre]);
  cambiados = [];
  $("bitacora").innerHTML = "";
  dibujar();
}

// ---- Conectar botones y arrancar ----
$("programa").innerHTML = Object.keys(PROGRAMAS).map((n) => `<option>${n}</option>`).join("");
$("programa").addEventListener("change", (ev) => cargar(ev.target.value));
$("btn-paso").addEventListener("click", dar_paso);
$("btn-ejecutar").addEventListener("click", alternarEjecucion);
$("btn-reiniciar").addEventListener("click", () => cargar($("programa").value));
cargar(Object.keys(PROGRAMAS)[0]);
