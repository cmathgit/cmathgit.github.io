/* Place your JavaScript in this file */
// program to generate fibonacci series up to n terms
let f1 = 0, f2 = 1, lim = 100, nthTerm;
const terms = [];
var op01 = "The First " + lim + " Terms of the Fibonacci Series: ";
var output_string = "";

console.log(op01);
document.getElementById("op01").innerHTML=op01;
console.log(lim);

for (let i = 1; i <= lim; i++) {
    terms.push(f1);
    console.log("i: " + i);
    console.log("f1: " + f1);
    console.log("f2: " + f2);
    nthTerm = f1 + f2;
    f1 = f2;
    f2 = nthTerm;
}

for (let e = 0; e < terms.length; e++) {
    n = e + 1;
    console.log("Term " + n + " in the terms array at e = " + e + ": "+ terms[e]);
    output_string = output_string + " " + terms[e];
}

console.log(output_string);
document.getElementById("output_string").innerHTML=output_string;
