/* =====================================================================
   cpu.js  -  Motor del CPU de juguete (Persona 1)
   ---------------------------------------------------------------------
   Este archivo solo simula el CPU:
   guarda los registros y la memoria, y sabe ejecutar instrucciones.
   La interfaz (interfaz.js) usa este archivo para saber que mostrar.

   CARACTERISTICAS DEL CPU
   - 8 bits: cada valor va de 0 a 255.
   - Memoria de 16 celdas (direcciones 0 a 15).
   - Cada instruccion mide 8 bits:  [ 4 bits opcode | 4 bits direccion ]
     Ejemplo: 0x1D = 0001 1101  ->  opcode 1 (LOAD), direccion 13.

   INSTRUCCIONES
     0 HALT   detiene el CPU
     1 LOAD d ACC = Mem[d]            (copia de memoria al acumulador)
     2 ADD d  ACC = ACC + Mem[d]
     3 SUB d  ACC = ACC - Mem[d]
     4 STORE d Mem[d] = ACC           (copia del acumulador a memoria)
     5 JMP d  PC = d                  (salta siempre)
     6 JZ d   si ACC es 0, PC = d     (salto condicional)

   FUNCIONES QUE USA LA INTERFAZ
     CPU.estado            -> los registros y la memoria actuales
     CPU.paso()            -> ejecuta UNA fase (fetch, decode o execute)
     CPU.vistaPrevia()     -> calcula que pasaria en el siguiente paso,
                              SIN cambiar nada (sirve para "predice el paso")
     CPU.reiniciar()       -> regresa todo al inicio
     CPU.cargarPrograma(a) -> carga un arreglo de 16 numeros en memoria
   ===================================================================== */

const CPU = (() => {
  const TAM_MEM = 16; // numero de celdas de memoria

  // Nombre de cada opcode, para mostrarlo con letras en vez de numeros
  const NOMBRES = { 0: "HALT", 1: "LOAD", 2: "ADD", 3: "SUB", 4: "STORE", 5: "JMP", 6: "JZ" };

  // ----- ESTADO DEL CPU -----
  // Todo lo que el CPU "recuerda" en un momento dado.
  const estado = {
    pc: 0,            // Program Counter: direccion de la SIGUIENTE instruccion
    ir: 0,            // Instruction Register: instruccion que se esta ejecutando
    acc: 0,           // Acumulador: aqui se guardan los resultados
    mar: 0,           // Memory Address Register: direccion que se quiere leer/escribir
    mdr: 0,           // Memory Data Register: dato que viene de / va a la memoria
    opcode: null,     // parte alta del IR (se llena en DECODE)
    operando: null,   // parte baja del IR (se llena en DECODE)
    mem: new Array(TAM_MEM).fill(0), // la memoria: 16 celdas con 0
    fase: "fetch",    // que fase toca ahora: "fetch", "decode" o "execute"
    detenido: false,  // true cuando se ejecuto HALT (o hubo un error)
    ciclos: 0         // cuantas instrucciones completas se han ejecutado
  };

  // Copia del programa original, para poder reiniciar sin perderlo
  let programaInicial = new Array(TAM_MEM).fill(0);

  // Carga un programa (arreglo de numeros) y reinicia el CPU
  function cargarPrograma(arreglo) {
    programaInicial = new Array(TAM_MEM).fill(0);
    // "& 255" asegura que cada valor quepa en 8 bits
    arreglo.slice(0, TAM_MEM).forEach((valor, i) => (programaInicial[i] = valor & 255));
    reiniciar();
  }

  // Regresa registros y memoria a su valor inicial
  function reiniciar() {
    Object.assign(estado, {
      pc: 0, ir: 0, acc: 0, mar: 0, mdr: 0,
      opcode: null, operando: null,
      fase: "fetch", detenido: false, ciclos: 0
    });
    estado.mem = programaInicial.slice(); // slice() hace una copia
  }

  // Convierte un numero en texto legible. Ej: 29 -> "LOAD 13"
  function desensamblar(byte) {
    const op = byte >> 4;     // ">> 4" se queda con los 4 bits de arriba
    const dir = byte & 15;    // "& 15" se queda con los 4 bits de abajo
    if (!(op in NOMBRES)) return "(dato)";
    return op === 0 ? "HALT" : NOMBRES[op] + " " + dir;
  }

  // ---------------------------------------------------------------
  // aplicarFase(e): hace el trabajo de UNA fase sobre el estado "e".
  // Recibe el estado como parametro para poder usarla tanto con el
  // estado real (paso) como con una copia (vistaPrevia).
  // Devuelve: { fase, texto, cambios }
  //   fase    = que fase se ejecuto
  //   texto   = explicacion en palabras
  //   cambios = lista de registros que se modificaron
  // ---------------------------------------------------------------
  function aplicarFase(e) {
    const fase = e.fase;
    let texto = "";
    let cambios = [];

    if (fase === "fetch") {
      // FETCH: traer la instruccion de memoria
      e.mar = e.pc;               // 1) el PC dice que direccion leer
      e.mdr = e.mem[e.mar];       // 2) la memoria entrega el dato
      e.ir = e.mdr;               // 3) se guarda en el registro de instruccion
      e.pc = (e.pc + 1) & 15;     // 4) PC apunta a la siguiente (vuelve a 0 despues de 15)
      texto = `FETCH: MAR = PC; MDR = Mem[${e.mar}] = ${e.mdr}; IR = MDR; PC = PC + 1 = ${e.pc}`;
      cambios = ["mar", "mdr", "ir", "pc"];
      e.fase = "decode";          // la siguiente fase sera decode

    } else if (fase === "decode") {
      // DECODE: separar el IR en opcode (que hacer) y operando (con que direccion)
      e.opcode = e.ir >> 4;
      e.operando = e.ir & 15;
      texto = `DECODE: opcode = ${e.opcode} (${NOMBRES[e.opcode] ?? "?"}), operando = ${e.operando}`;
      cambios = ["opcode", "operando"];
      e.fase = "execute";

    } else {
      // EXECUTE: hacer lo que dice el opcode
      switch (e.opcode) {
        case 1: // LOAD: copiar Mem[d] al acumulador
          e.mar = e.operando;
          e.mdr = e.mem[e.mar];
          e.acc = e.mdr;
          texto = `EXECUTE LOAD: ACC = Mem[${e.mar}] = ${e.acc}`;
          cambios = ["mar", "mdr", "acc"];
          break;

        case 2: // ADD: sumar. "& 255" simula el limite de 8 bits (300 -> 44)
          e.mar = e.operando;
          e.mdr = e.mem[e.mar];
          e.acc = (e.acc + e.mdr) & 255;
          texto = `EXECUTE ADD: ACC = ACC + Mem[${e.mar}] (${e.mdr}) = ${e.acc}`;
          cambios = ["mar", "mdr", "acc"];
          break;

        case 3: // SUB: restar. Si da negativo, "da la vuelta" (4 - 9 = 251)
          e.mar = e.operando;
          e.mdr = e.mem[e.mar];
          e.acc = (e.acc - e.mdr) & 255;
          texto = `EXECUTE SUB: ACC = ACC - Mem[${e.mar}] (${e.mdr}) = ${e.acc}`;
          cambios = ["mar", "mdr", "acc"];
          break;

        case 4: // STORE: guardar el acumulador en memoria
          e.mar = e.operando;
          e.mdr = e.acc;
          e.mem[e.mar] = e.mdr;
          texto = `EXECUTE STORE: Mem[${e.mar}] = ACC = ${e.acc}`;
          cambios = ["mar", "mdr", "mem"];
          break;

        case 5: // JMP: cambiar el PC, asi la siguiente instruccion viene de otro lugar
          e.pc = e.operando;
          texto = `EXECUTE JMP: PC = ${e.pc}`;
          cambios = ["pc"];
          break;

        case 6: // JZ: salta SOLO si el acumulador vale 0 (permite hacer bucles que terminan)
          if (e.acc === 0) {
            e.pc = e.operando;
            texto = `EXECUTE JZ: ACC es 0, entonces PC = ${e.pc}`;
            cambios = ["pc"];
          } else {
            texto = `EXECUTE JZ: ACC es ${e.acc} (no es 0), no salta`;
          }
          break;

        case 0: // HALT: detener el CPU
          e.detenido = true;
          texto = "EXECUTE HALT: el CPU se detiene.";
          break;

        default: // opcode desconocido: se detiene para no hacer cosas raras
          e.detenido = true;
          texto = `Opcode ${e.opcode} no valido: el CPU se detiene.`;
      }
      e.fase = "fetch"; // al terminar execute, se empieza otra instruccion
      e.ciclos++;
    }
    return { fase, texto, cambios };
  }

  // Ejecuta UNA fase en el CPU real. Es lo que llaman los botones "Paso" y "Ejecutar".
  function paso() {
    if (estado.detenido) return { fase: "halt", texto: "El CPU esta detenido.", cambios: [] };
    return aplicarFase(estado);
  }

  // Calcula que pasaria en el SIGUIENTE paso, pero sin modificar el CPU real.
  // Trabaja con una copia del estado. Devuelve lo mismo que paso() mas
  // "resultado": el estado completo como quedaria despues del paso.
  // Ejemplo de uso:  const v = CPU.vistaPrevia();  v.resultado.acc  -> valor esperado de ACC
  function vistaPrevia() {
    if (estado.detenido) return { fase: "halt", texto: "El CPU esta detenido.", cambios: [], resultado: estado };
    // JSON.parse(JSON.stringify(...)) es una forma sencilla de hacer una copia completa
    const copia = JSON.parse(JSON.stringify(estado));
    const info = aplicarFase(copia);
    return { ...info, resultado: copia };
  }

  // Lo unico que se "publica" para que otros archivos lo usen
  return { estado, paso, vistaPrevia, reiniciar, cargarPrograma, desensamblar, NOMBRES, TAM_MEM };
})();