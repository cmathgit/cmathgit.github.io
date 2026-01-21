var timeleft = 7;
var downloadTimer = setInterval(function(){
  if(timeleft <= 1){
    clearInterval(downloadTimer);
    document.getElementById("countdown").innerHTML = "Finished";
  } else {
    document.getElementById("countdown").innerHTML = timeleft + " seconds.";
  }
  timeleft -= 1;
}, 1000);