/* cpu.js - Motor del CPU de juguete (Persona 1)
   CPU de 8 bits, memoria de 16 celdas.
   Instruccion de 8 bits: [4 bits opcode][4 bits direccion]
   Opcodes: 0 HALT | 1 LOAD | 2 ADD | 3 SUB | 4 STORE | 5 JMP
   La interfaz solo debe usar: CPU.estado, CPU.paso(), CPU.reiniciar(), CPU.cargarPrograma() */

const CPU = (() => {
  const TAM_MEM = 16;
  const NOMBRES = { 0: "HALT", 1: "LOAD", 2: "ADD", 3: "SUB", 4: "STORE", 5: "JMP" };

  const estado = {
    pc: 0, ir: 0, acc: 0, mar: 0, mdr: 0,
    opcode: null, operando: null,
    mem: new Array(TAM_MEM).fill(0),
    fase: "fetch",        // siguiente fase a ejecutar: fetch | decode | execute
    detenido: false,
    ciclos: 0
  };

  let programaInicial = new Array(TAM_MEM).fill(0);

  function cargarPrograma(arreglo) {
    programaInicial = new Array(TAM_MEM).fill(0);
    arreglo.slice(0, TAM_MEM).forEach((v, i) => (programaInicial[i] = v & 255));
    reiniciar();
  }

  function reiniciar() {
    Object.assign(estado, {
      pc: 0, ir: 0, acc: 0, mar: 0, mdr: 0,
      opcode: null, operando: null,
      fase: "fetch", detenido: false, ciclos: 0
    });
    estado.mem = programaInicial.slice();
  }

  // Convierte un byte en texto, ej: 0x1D -> "LOAD 13"
  function desensamblar(byte) {
    const op = byte >> 4, dir = byte & 15;
    if (!(op in NOMBRES)) return "(dato)";
    return op === 0 ? "HALT" : NOMBRES[op] + " " + dir;
  }

  // Ejecuta UNA fase y devuelve que paso: { fase, texto, cambios: [registros modificados] }
  function paso() {
    if (estado.detenido) return { fase: "halt", texto: "El CPU esta detenido.", cambios: [] };
    const e = estado;
    let texto = "", cambios = [], fase = e.fase;

    if (fase === "fetch") {
      e.mar = e.pc;
      e.mdr = e.mem[e.mar];
      e.ir = e.mdr;
      e.pc = (e.pc + 1) & 15;
      texto = `FETCH: MAR = PC; MDR = Mem[${e.mar}] = ${e.mdr}; IR = MDR; PC = PC + 1 = ${e.pc}`;
      cambios = ["mar", "mdr", "ir", "pc"];
      e.fase = "decode";
    } else if (fase === "decode") {
      e.opcode = e.ir >> 4;
      e.operando = e.ir & 15;
      texto = `DECODE: opcode = ${e.opcode} (${NOMBRES[e.opcode] ?? "?"}), operando = ${e.operando}`;
      cambios = ["opcode", "operando"];
      e.fase = "execute";
    } else {
      switch (e.opcode) {
        case 1: // LOAD
          e.mar = e.operando; e.mdr = e.mem[e.mar]; e.acc = e.mdr;
          texto = `EXECUTE LOAD: ACC = Mem[${e.mar}] = ${e.acc}`;
          cambios = ["mar", "mdr", "acc"]; break;
        case 2: // ADD
          e.mar = e.operando; e.mdr = e.mem[e.mar]; e.acc = (e.acc + e.mdr) & 255;
          texto = `EXECUTE ADD: ACC = ACC + Mem[${e.mar}] (${e.mdr}) = ${e.acc}`;
          cambios = ["mar", "mdr", "acc"]; break;
        case 3: // SUB
          e.mar = e.operando; e.mdr = e.mem[e.mar]; e.acc = (e.acc - e.mdr) & 255;
          texto = `EXECUTE SUB: ACC = ACC - Mem[${e.mar}] (${e.mdr}) = ${e.acc}`;
          cambios = ["mar", "mdr", "acc"]; break;
        case 4: // STORE
          e.mar = e.operando; e.mdr = e.acc; e.mem[e.mar] = e.mdr;
          texto = `EXECUTE STORE: Mem[${e.mar}] = ACC = ${e.acc}`;
          cambios = ["mar", "mdr", "mem"]; break;
        case 5: // JMP
          e.pc = e.operando;
          texto = `EXECUTE JMP: PC = ${e.pc}`;
          cambios = ["pc"]; break;
        case 0: // HALT
          e.detenido = true;
          texto = "EXECUTE HALT: el CPU se detiene.";
          break;
        default:
          e.detenido = true;
          texto = `Opcode ${e.opcode} no valido: el CPU se detiene.`;
      }
      e.fase = "fetch";
      e.ciclos++;
    }
    return { fase, texto, cambios };
  }

  return { estado, paso, reiniciar, cargarPrograma, desensamblar, NOMBRES, TAM_MEM };
})();
