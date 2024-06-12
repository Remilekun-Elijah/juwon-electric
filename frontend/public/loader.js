window.addEventListener("load", function () {
  setTimeout(() => {
    this.document.body.style.overflowY = "auto";
    document.querySelector("#___preloader .preloader").style.opacity = "0";
    document.querySelector("#___preloader #overlayer").style.opacity = "0";
    document.querySelector("#___preloader .preloader").style.transition =
      "all 1s";
    document.querySelector("#___preloader #overlayer").style.transition =
      "all 1s";
    document.querySelector("#root").style.opacity = "1";
    document.querySelector("#root").style.transition = "all .5s";
  }, 500);

  setTimeout(() => {
    document.querySelector("#___preloader").remove();
  }, 1000);
});
