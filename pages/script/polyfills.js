/* here you can find polyfills for:
Array.prototype.at
*/

// Array.prototype.at
if (!Array.prototype.at) {
    console.log("Array.prototype.at polyfill is used");
    Array.prototype.at = function (index) {
        return this.slice(index, index + 1 || undefined)[0];
    }
}