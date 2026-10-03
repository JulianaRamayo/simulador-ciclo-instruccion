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
    `<div class="min-w-0 rounded-lg border p-3 transition-colors ${cambiados.includes(r) ? "border-[#d4a642] bg-[#fff4d5]" : "border-[#e4e9e1] bg-[#fafbf8]"}">
       <span class="block font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-[#718077]">${r.toUpperCase()}</span>
       <span class="mt-1 block font-mono text-2xl font-medium tabular-nums text-[#1e3a2f]">${e[r]}</span>
       <span class="mt-1 block font-mono text-[10px] tabular-nums text-[#8a958d]">${e[r].toString(2).padStart(8, "0")}</span>
     </div>`).join("");

  $("memoria").querySelector("tbody").innerHTML = e.mem.map((v, i) =>
    `<tr class="border-b border-[#edf0eb] transition-colors ${i === e.mar && cambiados.includes("mem") ? "bg-[#fff4d5]" : ""} ${i === ((e.fase === "fetch" && !e.detenido) ? e.pc : -1) ? "bg-[#edf5df]" : "hover:bg-[#f8faf5]"}">
       <td class="px-4 py-2.5 text-[#849087] sm:px-6">${String(i).padStart(2, "0")}</td><td class="px-4 py-2.5 font-medium text-[#30483c]">${v}</td>
       <td class="px-4 py-2.5 tabular-nums text-[#718077]">${v.toString(2).padStart(8, "0")}</td>
       <td class="px-4 py-2.5 font-medium text-[#28634f] sm:px-6">${CPU.desensamblar(v)}</td>
     </tr>`).join("");

  $("fase-actual").textContent = e.detenido ? "CPU detenido" : "Siguiente fase: " + e.fase.toUpperCase();
  $("btn-paso").disabled = e.detenido;
  $("btn-ejecutar").disabled = e.detenido;

  actualizarDidactico();
}

// Actualiza las opciones del modo didáctico
function actualizarDidactico() {
  const e = CPU.estado;
  const feedback = $("feedback-didactica");
  const contenedor = $("opciones-didactica");
  if (!feedback || !contenedor) return;

  feedback.textContent = "";

  if (e.detenido) {
    $("pregunta-didactica").textContent = "El programa ha finalizado.";
    contenedor.innerHTML = '<span class="col-span-2 text-xs text-[#52634e]">Reinicia el simulador para volver a intentar.</span>';
    return;
  }

  $("pregunta-didactica").textContent = `En la fase ${e.fase.toUpperCase()}, ¿cuál de estos registros actualizará su valor?`;
  const opciones = ["PC", "ACC", "IR", "MAR"];
  contenedor.innerHTML = opciones.map(op => `
    <button onclick="verificarPrediccion('${op.toLowerCase()}')" class="rounded-lg border border-[#c3d4b7] bg-white py-1.5 text-xs font-bold text-[#233c2f] transition hover:bg-[#dfead3] focus:outline-none focus:ring-2 focus:ring-[#34745d]/30">
      ${op}
    </button>
  `).join("");
}

// Verifica si la predicción del usuario es correcta usando CPU.vistaPrevia()
window.verificarPrediccion = function(reg) {
  const prev = CPU.vistaPrevia();
  const feedback = $("feedback-didactica");
  if (prev.cambios.includes(reg)) {
    feedback.className = "mt-2 min-h-5 text-[11px] font-bold text-[#1f6b3e]";
    feedback.textContent = `¡Correcto! ${reg.toUpperCase()} cambiará en la fase ${CPU.estado.fase.toUpperCase()}. Haz clic en "Paso" para comprobarlo.`;
  } else {
    feedback.className = "mt-2 min-h-5 text-[11px] font-bold text-[#9e3a2b]";
    feedback.textContent = `Incorrecto. En ${CPU.estado.fase.toUpperCase()} cambian: ${prev.cambios.map(c => c.toUpperCase()).join(", ")}.`;
  }
};

// Se ejecuta al presionar "Paso": avanza una fase y la anota en la bitacora
function dar_paso() {
  const r = CPU.paso();
  cambiados = r.cambios;
  const li = document.createElement("li");
  li.className = "border-b border-[#edf0eb] py-3 font-mono text-[11px] leading-5 text-[#58685e] last:border-0";
  li.textContent = r.texto;
  $("bitacora").prepend(li);
  if (CPU.estado.detenido) detener();
  dibujar();
}

// Detiene la ejecucion automatica
function detener() {
  clearInterval(temporizador);
  temporizador = null;
  $("btn-ejecutar").innerHTML = '<svg viewBox="0 0 20 20" class="size-4" fill="currentColor" aria-hidden="true"><path d="M6 4.5A1.5 1.5 0 0 1 8.25 3.2l7.2 4.2a3 3 0 0 1 0 5.2l-7.2 4.2A1.5 1.5 0 0 1 6 15.5v-11Z"/></svg> Ejecutar';
}

// Boton "Ejecutar": avanza un paso cada 600 ms; si ya corre, lo pausa
function alternarEjecucion() {
  if (temporizador) return detener();
  $("btn-ejecutar").innerHTML = '<svg viewBox="0 0 20 20" class="size-4" fill="currentColor" aria-hidden="true"><path d="M5 4.5A1.5 1.5 0 0 1 6.5 3h1A1.5 1.5 0 0 1 9 4.5v11A1.5 1.5 0 0 1 7.5 17h-1A1.5 1.5 0 0 1 5 15.5v-11Zm6 0A1.5 1.5 0 0 1 12.5 3h1A1.5 1.5 0 0 1 15 4.5v11a1.5 1.5 0 0 1-1.5 1.5h-1a1.5 1.5 0 0 1-1.5-1.5v-11Z"/></svg> Pausar';
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