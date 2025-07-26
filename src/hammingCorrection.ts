import { simulateError } from "./crc";

function hammingCode(data: string): string{
    const bits = data.trim().split('').map(ch => Number(ch));

    const n = bits.length;
    const r = Math.ceil(Math.log2(n));
    
    for(let pos =0 ; pos<=r; pos++){ //agregamos los bits de redundancia como 0 por ahora
        bits.splice(2**pos-1, 0, 0)
    }

    for (let i = 0; i <= r; i++) {
        const row = 2 ** i;
        let parityBit = 0;
        for (let bitpos = 0; bitpos < bits.length; bitpos++) {
            //nos saltamos las posiciones de los digitos de redundancia
            const pos = bitpos + 1;
            const mustCheck = pos !== row && ((pos & row) !== 0); //calculamos segun la fila y posicion del bit
            if (mustCheck) {
                parityBit ^= bits[bitpos]; //xor con el bit en esa posicion
            }
        }
        bits[row-1] = parityBit
    }
    return bits.join('');
}

// Replace the looped version with a filter-based extractor
function takeBits(data: string, {takeOnlyParity = false}): string {
  return data
    .split('')
    .filter((_, idx) =>
      takeOnlyParity
        ? isPowerOfTwo(idx + 1)
        : !isPowerOfTwo(idx + 1)
    )
    .join('');
}

// Helper to detect powers of two
function isPowerOfTwo(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0;
}

function getHammingIndex(h1: string, h2: string): number {
  let e_pos = 0;
  // cada caracter que sea igual corresponde con un bit de paridad
  for (let i = 0; i < h1.length; i++) {
    if (h1[i] !== h2[i]) { //simulamos un xor
      e_pos += 2 ** i;
    }
  }
  // si no hay diferencia, devolvemos -1
  return e_pos === 0 ? -1 : e_pos;
}

function runHammingCorrection() {
    const inputField = document.getElementById('binaryInput') as HTMLInputElement;
    const data = inputField.value;
   
    // Display the Hamming calculation table
    const tableContainer = document.getElementById('hammingTableContainer');
    if (tableContainer) {
        tableContainer.innerHTML = createHammingTable(data);
    }
    
    //calculamos y obtenemos la trama con codigo de hamming
    const codedInput = hammingCode(data);
    const errored_input = simulateError(codedInput);
    const receiver_codes = takeBits(errored_input,{takeOnlyParity:true});
    const receiver_t = takeBits(errored_input,{});
    const calculated_codes = takeBits(hammingCode(receiver_t),{takeOnlyParity:true});
    const faulty_bit_index = getHammingIndex(calculated_codes,receiver_codes);

    // helper to wrap bits
    const wrapBits = (str: string, highlightFn: (idx: number)=>string) =>
      str.split('').map((_, i) => highlightFn(i)).join('');

    const parityHighlight = (i: number) =>
      isPowerOfTwo(i+1)
        ? `<span class="parity-bit">${codedInput[i]}</span>`
        : `<span>${codedInput[i]}</span>`;

    const errorHighlight = (i: number) =>
      i+1 === faulty_bit_index
        ? `<span class="error-bit">${errored_input[i]}</span>`
        : `<span>${errored_input[i]}</span>`;

    // update UI
    const codedEl = document.getElementById('codedInput')!;
    codedEl.innerHTML = `Trama resultante: ${wrapBits(codedInput, parityHighlight)}`;
    codedEl.classList.add('fade-in');

    const erroredEl = document.getElementById('erroredInput')!;
    erroredEl.innerHTML = `Error: ${wrapBits(errored_input, errorHighlight)}`;
    erroredEl.classList.add('fade-in');

    const calcEl = document.getElementById('calculatedCodes')!;
    calcEl.textContent = `Código original: ${calculated_codes}`;
    calcEl.classList.add('fade-in');

    const recvEl = document.getElementById('receiverCodes')!;
    recvEl.textContent = `Código calculado: ${receiver_codes}`;
    recvEl.classList.add('fade-in');

    if (faulty_bit_index !== -1) {
      const errIdxEl = document.getElementById('errorIndex')!;
      errIdxEl.textContent = `Error en posición: ${faulty_bit_index}`;
      errIdxEl.classList.add('fade-in');

      // correct bit
      const corrected = errored_input.split('');
      corrected[faulty_bit_index - 1] =
        corrected[faulty_bit_index - 1] === '0' ? '1' : '0';
      // highlight parity in corrected string too
      const correctedStr = corrected.join('');
      const correctedWrap = (i: number) =>
        isPowerOfTwo(i+1)
          ? `<span class="parity-bit">${correctedStr[i]}</span>`
          : `<span>${correctedStr[i]}</span>`;
      const corrEl = document.getElementById('correctedInput')!;
      corrEl.innerHTML = `Trama corregida: ${wrapBits(correctedStr, correctedWrap)}`;
      corrEl.classList.add('fade-in');
    } else {
      const errIdxEl = document.getElementById('errorIndex')!;
      errIdxEl.textContent = 'No se ha generado errores';
      errIdxEl.classList.add('fade-in');

      const corrEl = document.getElementById('correctedInput')!;
      corrEl.textContent = '';
      corrEl.classList.remove('fade-in');
    }

    // Update Hamming table display
    const tableEl = document.getElementById('hammingTable')!;
    tableEl.innerHTML = createHammingTable(data);
    tableEl.classList.add('fade-in');
}

// Generate Hamming calculation table
function createHammingTable(data: string): string {
    const bits = data.trim().split('').map(ch => Number(ch));
    const n = bits.length;
    
    // Calculate required parity bits using iterative approach
    let r = 1;
    while (2 ** r < n + r + 1) {
        r++;
    }
    
    // Create array with parity bit positions as 0s
    const hammingBits: number[] = [];
    let dataIndex = 0;
    
    for (let pos = 1; pos <= n + r; pos++) {
        if (isPowerOfTwo(pos)) {
            hammingBits.push(0); // Parity bit placeholder
        } else {
            hammingBits.push(bits[dataIndex++]);
        }
    }
    
    let tableHTML = `
        <h3>Tabla de Cálculo de Código Hamming</h3>
        <table class="hamming-table">
            <thead>
                <tr>
                    <th>Bit de Paridad</th>`;
    
    // Header with bit positions
    for (let i = 0; i < hammingBits.length; i++) {
        const pos = i + 1;
        tableHTML += `<th class="${isPowerOfTwo(pos) ? 'parity-position' : 'data-bit'}">P${pos}</th>`;
    }
    tableHTML += `<th>Resultado</th></tr></thead><tbody>`;
    
    // Calculate each parity bit
    for (let i = 0; i <= Math.floor(Math.log2(hammingBits.length)); i++) {
        const parityPos = 2 ** i;
        if (parityPos > hammingBits.length) break;
        
        tableHTML += `<tr><td class="row-label">P${parityPos} (2^${i})</td>`;
        
        let parityValue = 0;
        
        // Show which bits are checked for this parity bit
        for (let bitIndex = 0; bitIndex < hammingBits.length; bitIndex++) {
            const pos = bitIndex + 1;
            const isChecked = pos !== parityPos && ((pos & parityPos) !== 0);
            
            if (isChecked) {
                parityValue ^= hammingBits[bitIndex];
                tableHTML += `<td class="checked-bit">${hammingBits[bitIndex]}</td>`;
            } else if (pos === parityPos) {
                tableHTML += `<td class="parity-position">P${parityPos}</td>`;
            } else {
                tableHTML += `<td>-</td>`;
            }
        }
        
        // Set the calculated parity bit
        hammingBits[parityPos - 1] = parityValue;
        tableHTML += `<td class="parity-bit">${parityValue}</td></tr>`;
    }
    
    // Final row showing the complete Hamming code
    tableHTML += `<tr><td class="row-label"><strong>Código Final</strong></td>`;
    for (let i = 0; i < hammingBits.length; i++) {
        const pos = i + 1;
        tableHTML += `<td class="${isPowerOfTwo(pos) ? 'parity-bit' : 'data-bit'}">${hammingBits[i]}</td>`;
    }
    tableHTML += `<td><strong>${hammingBits.join('')}</strong></td></tr>`;
    
    tableHTML += `</tbody></table>`;
    
    return tableHTML;
}

window.addEventListener('load', () => {
  const inputField = document.getElementById('binaryInput') as HTMLInputElement;
  const playBtn    = document.getElementById('playButton')  as HTMLButtonElement;

  playBtn?.addEventListener('click', runHammingCorrection);
  inputField?.addEventListener('keydown', e => {
    if (e.key === 'Enter') runHammingCorrection();
  });
});