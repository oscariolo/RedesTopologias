function binaryDivision(dividend: string, divisor: string): string {
    let paddedDividend = dividend + '0'.repeat(divisor.length - 1);
    let dividendBits = paddedDividend.split('').map(Number);
    let divisorBits = divisor.split('').map(Number);
    let divisorLength = divisorBits.length;
    let dividendLength = dividendBits.length;
    for (let i = 0; i <= dividendLength - divisorLength; i++) {
        if (dividendBits[i] === 1) {
            for (let j = 0; j < divisorLength; j++) {
                dividendBits[i + j] ^= divisorBits[j]; // XOR operation
            }
        }
    }
    // Return the remainder as a binary string
    return dividendBits.slice(dividendLength - divisorLength + 1).join('');
}

function simulateError(trama: string, error_p:number=0.5):string {
    // Simulate a single bit error by flipping a random bit
    //Aleatoreamente devuelve la misma trama sin error 50% de las veces
    if (Math.random() < error_p) {
        return trama; // No error
    }
    let errorIndex = Math.floor(Math.random() * trama.length);
    let errorBit = trama[errorIndex] === '0' ? '1' : '0';
    return trama.substring(0, errorIndex) + errorBit + trama.substring(errorIndex + 1);
}

function crcCheck(trama: string, generator: string): boolean {
    // Perform CRC check
    let remainder = binaryDivision(trama, generator);
    return remainder === '0'.repeat(generator.length - 1); // Check if remainder is all zeros
}


window.addEventListener('load', () => {
    const tramaInput = document.getElementById('tramaInput') as HTMLInputElement;
    
    tramaInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        // Execute your desired function here
        runCRC();
      }
    });
 });

 function runCRC() {
    const tramaInput = document.getElementById('tramaInput') as HTMLInputElement;
    const generatorInput = document.getElementById('generatorInput') as HTMLInputElement;
    let trama: string = tramaInput.value;
    let crc = binaryDivision(trama, generatorInput.value);
    let n_trama = simulateError(trama, 0.5);
    let testDiv = binaryDivision(n_trama + crc, generatorInput.value);
    
    const binaryResult = document.getElementById('binaryResult') as HTMLSpanElement;
    const residueResult = document.getElementById('residueResult') as HTMLSpanElement;
    
    // Set new values with the crc part wrapped in a span for coloring
    binaryResult.innerHTML = `Trama recibida: ${n_trama}<span class="red-text">${crc}</span>`;
    residueResult.textContent = `Residuo con crc: ${testDiv}`;
    binaryResult.classList.remove("fade-in");
    residueResult.classList.remove("fade-in");
    
    // Trigger fade-in animations in sequence
    setTimeout(() => {
         binaryResult.classList.add("fade-in");
         setTimeout(() => {
             residueResult.classList.add("fade-in");
         }, 700);
    }, 100);
 }
