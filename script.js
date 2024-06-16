const userInput = document.querySelector(".userInput");
const wordCountDisplay = document.querySelector(".wordCountDisplay");
const theme = document.querySelector(".theme");
const deleteContent = document.querySelector(".delete");

const countWord = (text) => {
  const words = text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0);
  return words.length;
};

userInput.addEventListener("input", () => {
  const text = userInput.value;
  const wordCount = countWord(text);
  wordCountDisplay.textContent = wordCount + " ";
});

theme.addEventListener("click", function () {
  if (document.body.style.background === "whitesmoke") {
    document.body.style.background = "#333";
  } else {
    document.body.style.background = "whitesmoke";
  }
});

deleteContent.addEventListener("click", function () {
  userInput.value = "";
  wordCountDisplay.textContent = "0";
});
