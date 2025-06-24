function hammingCorrection(data: string): string{
    // Convert the input string to an array of bits
    const bits = data.split('').map(Number);
    const n = bits.length;

    // Calculate the number of parity bits needed
    let r = 0;
    while (Math.pow(2, r) < n + r + 1) {
        r++;
    }

    // Create an array to hold the corrected bits
    const correctedBits = new Array(n + r).fill(0);

    // Fill in the data bits into the correctedBits array
    let j = 0;
    for (let i = 0; i < correctedBits.length; i++) {
        if (Math.pow(2, j) === i + 1) {
            j++; // Skip parity bit positions
        } else {
            correctedBits[i] = bits[i - j];
        }
    }

    // Calculate parity bits
    for (let i = 0; i < r; i++) {
        const parityIndex = Math.pow(2, i) - 1;
        let parityValue = 0;

        for (let j = parityIndex; j < correctedBits.length; j++) {
            if ((j + 1) & (parityIndex + 1)) { // Check if bit position includes this parity bit
                parityValue ^= correctedBits[j];
            }
        }

        correctedBits[parityIndex] = parityValue;
    }
    // Convert the corrected bits back to a string
    return correctedBits.join('');
}

const runAlgorithmBtn = document.getElementById('runHammingCorrection') as HTMLButtonElement;

runAlgorithmBtn.addEventListener('click', () => {
    const input = document.getElementById('hammingInput') as HTMLInputElement;
    const output = document.getElementById('hammingOutput') as HTMLSpanElement;
    
    if (input && output) {
        const data = input.value.trim();
        if (data) {
            const correctedData = hammingCorrection(data);
            output.textContent = `Datos corregidos: ${correctedData}`;
        } else {
            output.textContent = 'Por favor, ingrese datos válidos.';
        }
    } else {
        console.error("Input or output element not found");
    }
});