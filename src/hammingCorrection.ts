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
    
    //simulamos error
    const errored_input = simulateError(codedInput);  


    //simulamos que llega al receptor, el cual primero extrae y realiza su propio calculo
    const receiver_codes = takeBits(errored_input,{takeOnlyParity:true})
    const receiver_t = takeBits(errored_input,{});

    const calculated_codes = takeBits(hammingCode(receiver_t),{takeOnlyParity:true});
    
    const faulty_bit_index = getHammingIndex(calculated_codes,receiver_codes);

    






    // …update UI as needed
}

window.addEventListener('load', () => {
  const inputField = document.getElementById('binaryInput') as HTMLInputElement;
  const playBtn    = document.getElementById('playButton')  as HTMLButtonElement;

  playBtn?.addEventListener('click', runHammingCorrection);
  inputField?.addEventListener('keydown', e => {
    if (e.key === 'Enter') runHammingCorrection();
  });
});