# Simulador didáctico del ciclo de instrucción

CPU de juguete de 8 bits con 16 celdas de memoria. Proyecto de arquitectura de computadoras.

**Integrantes:**
- Ayil Monsreal José Arturo
- Ojeda Sotelo Pablo Ángel
- Ramayo Cardoso Juliana Alejandra
- Vargas Espinoza Saúl Francisco

## Instrucciones (8 bits = 4 de opcode + 4 de dirección)
 
| Opcode | Instrucción | Acción |
|---|---|---|
| 0 | HALT | Detiene el CPU |
| 1 | LOAD d | ACC = Mem[d] |
| 2 | ADD d | ACC = ACC + Mem[d] |
| 3 | SUB d | ACC = ACC - Mem[d] |
| 4 | STORE d | Mem[d] = ACC |
| 5 | JMP d | PC = d |
| 6 | JZ d | Si ACC = 0, PC = d |

## Archivos
- `cpu.js`: motor del CPU
- `index.html`, `estilos.css`, `interfaz.js`: interfaz
