let trama: string = "1101011011";
let generator: string = "1101";
let anexo: string = "0000"; // 4 bits for CRC-4


function crcDivision(trama:string, generator:string): string {
    let paddedTrama = trama + anexo;
    let generatorLength = generator.length;
    let paddedLength = paddedTrama.length;
    
    // Convert strings to arrays of bits
    let dividend = paddedTrama.split('').map(Number);
    let divisor = generator.split('').map(Number);
    
    // Perform the division
    for (let i = 0; i <= paddedLength - generatorLength; i++) {
        if (dividend[i] === 1) {
        for (let j = 0; j < generatorLength; j++) {
            dividend[i + j] ^= divisor[j]; // XOR operation
        }
        }
    }
    // The remainder is the last bits of the dividend
    return dividend.slice(paddedLength - generatorLength + 1).join('');
}

function simulateError(trama: string):string {
    // Simulate a single bit error by flipping a random bit
    let errorIndex = Math.floor(Math.random() * trama.length);
    let errorBit = trama[errorIndex] === '0' ? '1' : '0';
    return trama.substring(0, errorIndex) + errorBit + trama.substring(errorIndex + 1);
}


window.addEventListener('load', () => {
  
    const tramaInput = document.getElementById('tramaInput') as HTMLInputElement;
    tramaInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        // Execute your desired function here
        console.log('Trama input submitted:', tramaInput.value);
      }
    });


 });
