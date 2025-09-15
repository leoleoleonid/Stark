/**
 * You work for the DMV; you have a specific, sequential way of generating new license plate numbers:
 *
 * Each license plate number has 6 alphanumeric characters. The numbers always come before the letters.
 *
 * The first plate number is 000000, followed by 000001...
 * When you arrive at 999999, the next entry would be 00000A, Followed by 00001A...
 * When you arrive at 99999A, the next entry is 00000B, Followed by 00001B...
 * After following the pattern to 99999Z, the next in the sequence would be 0000AA...
 *
 * When 9999AA is reached, the next in the series would be 0000AB...0001AB
 * When 9999AB is reached, the next in the series would be 0000AC...0001AC
 * When 9999AZ is reached, the next in the series would be 0000BA...0001BA
 * When 9999ZZ is reached, the next in the series would be 000AAA...001AAA
 *
 * And so on untill the sequence completes with ZZZZZZ.
 *
 * So the pattern overview looks a bit like this:
 *
 * 000000
 * 000001
 * ...
 * 999999
 * 00000A
 * 00001A
 * ...
 * 99999A
 * 00000B
 * 00001B
 * ...
 * 99999Z
 * 0000AA
 * 0001AA
 * ...
 * 9999AA
 * 0000AB
 * 0001AB
 * ...
 * 9999AB
 * 0000AC
 * 0001AC
 * ...
 * 9999AZ
 * 0000BA
 * 0001BA
 * ...
 * 9999BZ
 * 0000CA
 * 0001CA
 * ...
 * 9999ZZ
 * 000AAA
 * 001AAA
 * ...
 * 999AAA
 * 000AAB
 * 001AAB
 * ...
 * 999AAZ
 * 000ABA
 * ...
 * ZZZZZZ
 *
 *
 * The goal is to write the most efficient function that can return the nth element in this sequence.
 * */





const C = [
    1_000_000,   // L=0: 10^6
    3_600_000,   // L=1: 10^5*26
    10_360_000,  // L=2: 10^4*26^2
    27_936_000,  // L=3: 10^3*26^3
    73_633_600,  // L=4: 10^2*26^4
    192_447_360, // L=5: 10^1*26^5
    501_363_136  // L=6: 26^6 (итого)
] as const;

const POW10 = [1, 10, 100, 1_000, 10_000, 100_000, 1_000_000] as const;

export function nthPlate(n: number): string {
    if (!Number.isInteger(n) || n < 0 || n >= C[6]) {
        throw new RangeError(`n должен быть целым в диапазоне [0, ${C[6] - 1}]`);
    }


    let L: number, base: number;
    if (n < C[0]) { L = 0; base = 0; }
    else if (n < C[1]) { L = 1; base = C[0]; }
    else if (n < C[2]) { L = 2; base = C[1]; }
    else if (n < C[3]) { L = 3; base = C[2]; }
    else if (n < C[4]) { L = 4; base = C[3]; }
    else if (n < C[5]) { L = 5; base = C[4]; }
    else { L = 6; base = C[5]; }

    const W = 6 - L;             // длина числовой части
    const off = n - base;        // смещение внутри блока
    const pow10W = POW10[W];     // 10^W
    const num = off % pow10W;    // цифры
    let suf = Math.floor(off / pow10W); // индекс суффикса (база-26)

    // Цифровая часть с ведущими нулями
    const numStr = W ? num.toString().padStart(W, "0") : "";

    // Буквенная часть: A=0..Z=25, младший разряд справа
    const letters: string[] = [];
    for (let i = 0; i < L; i++) {
        const r = suf % 26;
        letters.push(String.fromCharCode(65 + r)); // 65='A'
        suf = Math.floor(suf / 26);
    }
    letters.reverse();

    return numStr + letters.join("");
}



function main(): void {
  console.log("Hello from dmvExercise.ts!");
  console.log(nthPlate(0));
  console.log(nthPlate(999999));
  console.log(nthPlate(1000000));
  console.log(nthPlate(1000001));
  console.log(nthPlate(501363135));
}

main();