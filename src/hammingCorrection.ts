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
   
    //calculamos y obtenemos la trama con codigo de hamming
    const codedInput = hammingCode(data);
    const errored_input = simulateError(codedInput);
    const receiver_codes = takeBits(errored_input,{takeOnlyParity:true});
    const receiver_t = takeBits(errored_input,{});
    const calculated_codes = takeBits(hammingCode(receiver_t),{takeOnlyParity:true});
    const faulty_bit_index = getHammingIndex(calculated_codes,receiver_codes);

    // helper to wrap bits
    const wrapBits = (str: string, highlightFn: (idx: number)=>string) =>
      str.split('').map((bit, i) => highlightFn(i)).join('');

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
    codedEl.innerHTML = `Coded: ${wrapBits(codedInput, parityHighlight)}`;
    codedEl.classList.add('fade-in');

    const erroredEl = document.getElementById('erroredInput')!;
    erroredEl.innerHTML = `Errored: ${wrapBits(errored_input, errorHighlight)}`;
    erroredEl.classList.add('fade-in');

    const calcEl = document.getElementById('calculatedCodes')!;
    calcEl.textContent = `Calculated Codes: ${calculated_codes}`;
    calcEl.classList.add('fade-in');

    const recvEl = document.getElementById('receiverCodes')!;
    recvEl.textContent = `Receiver Codes: ${receiver_codes}`;
    recvEl.classList.add('fade-in');

    if (faulty_bit_index !== -1) {
      const errIdxEl = document.getElementById('errorIndex')!;
      errIdxEl.textContent = `Error at position: ${faulty_bit_index}`;
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
      corrEl.innerHTML = `Corrected: ${wrapBits(correctedStr, correctedWrap)}`;
      corrEl.classList.add('fade-in');
    } else {
      const errIdxEl = document.getElementById('errorIndex')!;
      errIdxEl.textContent = 'No errors detected.';
      errIdxEl.classList.add('fade-in');

      const corrEl = document.getElementById('correctedInput')!;
      corrEl.textContent = '';
      corrEl.classList.remove('fade-in');
    }
}

window.addEventListener('load', () => {
  const inputField = document.getElementById('binaryInput') as HTMLInputElement;
  const playBtn    = document.getElementById('playButton')  as HTMLButtonElement;

  playBtn?.addEventListener('click', runHammingCorrection);
  inputField?.addEventListener('keydown', e => {
    if (e.key === 'Enter') runHammingCorrection();
  });
});