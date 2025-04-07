/*
"Here's a similar RFC4122 version 4 compliant solution that solves that issue by offsetting the first 13 hex numbers by a hex portion of the timestamp, and once depleted offsets by a hex portion of the microseconds since pageload. That way, even if Math.random is on the same seed, both clients would have to generate the UUID the exact same number of microseconds since pageload (if high-perfomance time is supported) AND at the exact same millisecond (or 10,000+ years later) to get the same UUID":

https://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid
*/

function generateUUID() { // Public Domain/MIT
    var d = new Date().getTime();//Timestamp
    var d2 = ((typeof performance !== 'undefined') && performance.now && (performance.now()*1000)) || 0;//Time in microseconds since page-load or 0 if unsupported
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16;//random number between 0 and 16
        if(d > 0){//Use timestamp until depleted
            r = (d + r)%16 | 0;
            d = Math.floor(d/16);
        } else {//Use microseconds since page-load if supported
            r = (d2 + r)%16 | 0;
            d2 = Math.floor(d2/16);
        }
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

var onClick = function(){
    document.getElementById('uuid').textContent = generateUUID();
}
onClick();