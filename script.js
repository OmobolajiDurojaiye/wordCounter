"use strict";

// DOM Elements
const textInput = document.getElementById("text-input");
const wordCount = document.getElementById("word-count");
const charCount = document.getElementById("char-count");
const charNoSpaces = document.getElementById("char-no-spaces");
const sentenceCount = document.getElementById("sentence-count");
const paragraphCount = document.getElementById("paragraph-count");
const readingTime = document.getElementById("reading-time");
const speakingTime = document.getElementById("speaking-time");
const readingLevel = document.getElementById("reading-level");
const topKeywords = document.getElementById("top-keywords");
const avgSentence = document.getElementById("avg-sentence");
const clearTextBtn = document.getElementById("clear-text");
const themeToggle = document.getElementById("theme-toggle");
const themeSelect = document.getElementById("theme-select");
const fontSizeRange = document.getElementById("font-size");
const fontSizeValue = document.getElementById("font-size-value");
const toggleAdvanced = document.getElementById("toggle-advanced");
const advancedContent = document.querySelector(".advanced-content");
const settingsToggle = document.getElementById("settings-toggle");
const settingsPanel = document.getElementById("settings-panel");
const closeSettings = document.getElementById("close-settings");
const showAdvanced = document.getElementById("show-advanced");
const countHyphenated = document.getElementById("count-hyphenated");
const ignoreHtml = document.getElementById("ignore-html");
const newDocBtn = document.getElementById("new-doc");
const downloadDocBtn = document.getElementById("download-doc");
const copyDocBtn = document.getElementById("copy-doc");
const formatPlainBtn = document.getElementById("format-plain");
const formatMarkdownBtn = document.getElementById("format-markdown");
const toast = document.getElementById("toast");
const toastIcon = document.getElementById("toast-icon");
const toastMessage = document.getElementById("toast-message");

// Constants
const AVG_WORDS_PER_MINUTE_READING = 225;
const AVG_WORDS_PER_MINUTE_SPEAKING = 150;

// State
let isMarkdownMode = false;
let debounceTimer;
let cachedText = "";
let isAdvancedOpen = false;

// Initialize the app
function initApp() {
  loadSettings();
  updateMetrics(textInput.value);
  addEventListeners();
  checkSystemTheme();
}

// Add all event listeners
function addEventListeners() {
  // Text input
  textInput.addEventListener("input", debounceTextInput);

  // UI Controls
  clearTextBtn.addEventListener("click", clearText);
  themeToggle.addEventListener("click", toggleTheme);
  toggleAdvanced.addEventListener("click", toggleAdvancedMetrics);

  // Settings
  settingsToggle.addEventListener("click", toggleSettings);
  closeSettings.addEventListener("click", closeSettingsPanel);
  themeSelect.addEventListener("change", handleThemeChange);
  fontSizeRange.addEventListener("input", updateFontSize);
  showAdvanced.addEventListener("change", handleShowAdvanced);

  // Document actions
  newDocBtn.addEventListener("click", createNewDocument);
  downloadDocBtn.addEventListener("click", downloadDocument);
  copyDocBtn.addEventListener("click", copyToClipboard);

  // Format options
  formatPlainBtn.addEventListener("click", () => setFormat("plain"));
  formatMarkdownBtn.addEventListener("click", () => setFormat("markdown"));

  // Save settings when they change
  countHyphenated.addEventListener("change", saveSettings);
  ignoreHtml.addEventListener("change", saveSettings);

  // Handle click outside settings panel
  document.addEventListener("click", (e) => {
    if (
      settingsPanel.classList.contains("active") &&
      !settingsPanel.contains(e.target) &&
      e.target !== settingsToggle &&
      !settingsToggle.contains(e.target)
    ) {
      closeSettingsPanel();
    }
  });

  // System theme change detection
  if (window.matchMedia) {
    const colorSchemeQuery = window.matchMedia("(prefers-color-scheme: dark)");
    colorSchemeQuery.addEventListener("change", checkSystemTheme);
  }
}

// Debounce text input to improve performance
function debounceTextInput() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    if (cachedText !== textInput.value) {
      cachedText = textInput.value;
      updateMetrics(textInput.value);
    }
  }, 300);
}

// Count words accurately
function countWords(text) {
  if (!text.trim()) return 0;

  // Handle HTML content if option is enabled
  let processedText = text;
  if (ignoreHtml.checked) {
    processedText = text.replace(/<[^>]*>/g, " ");
  }

  // Handle hyphenated words based on user preference
  const wordSplitRegex = countHyphenated.checked
    ? /\s+|[,.;:!?()[\]{}""''""«»„"‹›—–]/
    : /[\s\-]+|[,.;:!?()[\]{}""''""«»„"‹›—–]/;

  const words = processedText
    .trim()
    .split(wordSplitRegex)
    .filter((word) => word.length > 0);

  return words.length;
}

// Count characters with and without spaces
function countCharacters(text) {
  const withSpaces = text.length;
  const withoutSpaces = text.replace(/\s+/g, "").length;
  return { withSpaces, withoutSpaces };
}

// Count sentences
function countSentences(text) {
  if (!text.trim()) return 0;

  // Match sentence-ending punctuation followed by space or end of string
  // Handle common abbreviations (Mr., Dr., etc.) to avoid false positives
  const sentences = text
    .replace(/([.?!])\s*(?=[A-Z])/g, "$1|")
    .replace(/\b(Mr|Mrs|Dr|Prof|Sr|Jr|etc|vs|e\.g|i\.e)\./gi, (match) =>
      match.replace(".", "·")
    )
    .split("|")
    .filter((sentence) => sentence.trim().length > 0);

  return sentences.length;
}

// Count paragraphs
function countParagraphs(text) {
  if (!text.trim()) return 0;
  return text.split(/\n\s*\n/).filter((p) => p.trim().length > 0).length;
}

// Calculate reading and speaking time
function calculateReadingTime(wordCount) {
  const readingMinutes = wordCount / AVG_WORDS_PER_MINUTE_READING;
  const speakingMinutes = wordCount / AVG_WORDS_PER_MINUTE_SPEAKING;

  return {
    reading: formatTime(readingMinutes),
    speaking: formatTime(speakingMinutes),
  };
}

// Format time into minutes and seconds
function formatTime(minutes) {
  if (minutes < 1) {
    return `${Math.ceil(minutes * 60)} sec`;
  }

  const mins = Math.floor(minutes);
  const secs = Math.round((minutes - mins) * 60);

  if (secs === 0) {
    return `${mins} min`;
  }

  return `${mins} min ${secs} sec`;
}

// Calculate reading level using Flesch-Kincaid Grade Level
function calculateReadingLevel(text, totalWords, totalSentences) {
  if (!text.trim() || totalWords === 0 || totalSentences === 0) return "N/A";

  // Count syllables
  function countSyllables(word) {
    word = word.toLowerCase();
    // Remove non-alphabetic characters
    word = word.replace(/[^a-z]/g, "");

    if (word.length <= 3) return 1;

    // Count vowel groups
    const vowels = word.match(/[aeiouy]+/g);
    let count = vowels ? vowels.length : 0;

    // Adjust for silent 'e' at the end
    if (word.length > 2 && word.endsWith("e") && !word.endsWith("le")) {
      count--;
    }

    // Ensure at least one syllable
    return Math.max(1, count);
  }

  // Clean text and split into words
  const cleanText = text.toLowerCase().replace(/[^\w\s]/g, " ");
  const words = cleanText.split(/\s+/).filter((word) => word.length > 0);

  // Count total syllables
  let totalSyllables = 0;
  for (const word of words) {
    totalSyllables += countSyllables(word);
  }

  // Calculate Flesch-Kincaid Grade Level
  const grade =
    0.39 * (totalWords / totalSentences) +
    11.8 * (totalSyllables / totalWords) -
    15.59;

  // Return descriptive reading level
  if (grade <= 5) return "Elementary";
  if (grade <= 8) return "Middle School";
  if (grade <= 12) return "High School";
  if (grade <= 16) return "College";
  return "Graduate";
}

// Find top keywords in the text
function findTopKeywords(text, wordCount) {
  if (!text.trim() || wordCount === 0) return "N/A";

  // Clean text and split into words
  const cleanText = text.toLowerCase().replace(/[^\w\s-]/g, " ");
  const words = cleanText.split(/\s+/).filter((word) => word.length > 2);

  // Skip if not enough content
  if (words.length < 10) return "Add more content";

  // Common words to ignore
  const stopWords = new Set([
    "the",
    "and",
    "that",
    "this",
    "but",
    "not",
    "you",
    "for",
    "with",
    "are",
    "have",
    "from",
    "was",
    "were",
    "they",
    "will",
    "would",
    "could",
    "should",
    "what",
    "when",
    "where",
    "why",
    "how",
    "all",
    "any",
    "some",
  ]);

  // Count word frequencies
  const wordFreq = {};
  for (const word of words) {
    if (!stopWords.has(word)) {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    }
  }

  // Sort by frequency
  const sortedWords = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map((entry) => entry[0]);

  return sortedWords.length > 0 ? sortedWords.join(", ") : "N/A";
}

// Update all metrics at once
function updateMetrics(text) {
  const wordVal = countWords(text);
  const charVals = countCharacters(text);
  const sentenceVal = countSentences(text);
  const paragraphVal = countParagraphs(text);
  const times = calculateReadingTime(wordVal);

  // Update basic metrics
  wordCount.textContent = wordVal;
  charCount.textContent = charVals.withSpaces;
  charNoSpaces.textContent = charVals.withoutSpaces;
  sentenceCount.textContent = sentenceVal;
  paragraphCount.textContent = paragraphVal;
  readingTime.textContent = times.reading;
  speakingTime.textContent = times.speaking;

  // Update advanced metrics
  const readingLevelVal = calculateReadingLevel(text, wordVal, sentenceVal);
  const topKeywordsVal = findTopKeywords(text, wordVal);
  const avgSentenceVal =
    sentenceVal > 0 ? Math.round(wordVal / sentenceVal) : 0;

  readingLevel.textContent = readingLevelVal;
  topKeywords.textContent = topKeywordsVal;
  avgSentence.textContent = avgSentenceVal + " words";
}

// UI Functions
function clearText() {
  textInput.value = "";
  cachedText = "";
  updateMetrics("");
  showToast("Text cleared", "fa-check-circle", "success");
}

function toggleTheme() {
  const isDark = document.body.classList.toggle("dark-theme");
  themeToggle.innerHTML = isDark
    ? '<i class="fas fa-sun"></i>'
    : '<i class="fas fa-moon"></i>';

  // Update theme select in settings
  themeSelect.value = isDark ? "dark" : "light";
  saveSettings();
}

function toggleAdvancedMetrics() {
  isAdvancedOpen = !isAdvancedOpen;
  advancedContent.classList.toggle("hidden");
  toggleAdvanced.classList.toggle("active");
  saveSettings();
}

function toggleSettings() {
  settingsPanel.classList.remove("hidden");
  // Use setTimeout to ensure the transition works
  setTimeout(() => {
    settingsPanel.classList.add("active");
  }, 10);
}

function closeSettingsPanel() {
  settingsPanel.classList.remove("active");
  // Wait for transition to finish before hiding
  setTimeout(() => {
    settingsPanel.classList.add("hidden");
  }, 300);
}

function updateFontSize() {
  const size = fontSizeRange.value;
  textInput.style.fontSize = `${size}px`;
  fontSizeValue.textContent = `${size}px`;
  saveSettings();
}

function setFormat(format) {
  isMarkdownMode = format === "markdown";

  // Update active state
  formatPlainBtn.classList.toggle("active", !isMarkdownMode);
  formatMarkdownBtn.classList.toggle("active", isMarkdownMode);

  // Add markdown styles or syntax highlighting if in markdown mode
  if (isMarkdownMode) {
    textInput.classList.add("markdown-mode");
    // For simplicity we're not adding real markdown preview/highlighting
    // in a full implementation you'd integrate a markdown library here
  } else {
    textInput.classList.remove("markdown-mode");
  }

  saveSettings();
}

function createNewDocument() {
  if (textInput.value.trim() !== "") {
    if (confirm("Create a new document? This will clear the current text.")) {
      clearText();
    }
  } else {
    clearText();
  }
}

function downloadDocument() {
  if (!textInput.value.trim()) {
    showToast("Nothing to download", "fa-exclamation-circle", "error");
    return;
  }

  const text = textInput.value;
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `wordmetrics-document-${new Date()
    .toISOString()
    .slice(0, 10)}.txt`;
  document.body.appendChild(a);
  a.click();

  // Clean up
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast("Document downloaded", "fa-check-circle", "success");
}

function copyToClipboard() {
  if (!textInput.value.trim()) {
    showToast("Nothing to copy", "fa-exclamation-circle", "error");
    return;
  }

  // Use modern clipboard API
  navigator.clipboard
    .writeText(textInput.value)
    .then(() => {
      showToast("Copied to clipboard", "fa-check-circle", "success");
    })
    .catch(() => {
      // Fallback for older browsers
      textInput.select();
      document.execCommand("copy");
      showToast("Copied to clipboard", "fa-check-circle", "success");
    });
}

function showToast(message, icon, type) {
  toast.classList.remove("hidden");
  toastIcon.className = `fas ${icon}`;
  toastIcon.classList.add(type);
  toastMessage.textContent = message;

  // Show the toast
  setTimeout(() => {
    toast.classList.add("show");
  }, 10);

  // Hide after 3 seconds
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => {
      toast.classList.add("hidden");
    }, 300);
  }, 3000);
}

// Settings functions
function handleThemeChange() {
  const theme = themeSelect.value;

  if (theme === "system") {
    checkSystemTheme();
  } else {
    const isDark = theme === "dark";
    document.body.classList.toggle("dark-theme", isDark);
    themeToggle.innerHTML = isDark
      ? '<i class="fas fa-sun"></i>'
      : '<i class="fas fa-moon"></i>';
  }

  saveSettings();
}

function handleShowAdvanced() {
  if (showAdvanced.checked) {
    advancedContent.classList.remove("hidden");
    toggleAdvanced.classList.add("active");
    isAdvancedOpen = true;
  } else {
    advancedContent.classList.add("hidden");
    toggleAdvanced.classList.remove("active");
    isAdvancedOpen = false;
  }

  saveSettings();
}

function checkSystemTheme() {
  if (themeSelect.value === "system") {
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    document.body.classList.toggle("dark-theme", prefersDark);
    themeToggle.innerHTML = prefersDark
      ? '<i class="fas fa-sun"></i>'
      : '<i class="fas fa-moon"></i>';
  }
}

// Save and load settings from localStorage
function saveSettings() {
  const settings = {
    theme: themeSelect.value,
    fontSize: fontSizeRange.value,
    showAdvanced: showAdvanced.checked,
    countHyphenated: countHyphenated.checked,
    ignoreHtml: ignoreHtml.checked,
    isAdvancedOpen: isAdvancedOpen,
    isMarkdownMode: isMarkdownMode,
  };

  localStorage.setItem("wordmetrics_settings", JSON.stringify(settings));
}

function loadSettings() {
  try {
    const settings = JSON.parse(localStorage.getItem("wordmetrics_settings"));

    if (settings) {
      // Apply theme
      themeSelect.value = settings.theme || "light";
      handleThemeChange();

      // Apply font size
      if (settings.fontSize) {
        fontSizeRange.value = settings.fontSize;
        textInput.style.fontSize = `${settings.fontSize}px`;
        fontSizeValue.textContent = `${settings.fontSize}px`;
      }

      // Apply advanced settings
      showAdvanced.checked = settings.showAdvanced || false;
      countHyphenated.checked =
        settings.countHyphenated !== undefined
          ? settings.countHyphenated
          : true;
      ignoreHtml.checked = settings.ignoreHtml || false;

      // Apply advanced panel state
      isAdvancedOpen = settings.isAdvancedOpen || false;
      if (isAdvancedOpen || showAdvanced.checked) {
        advancedContent.classList.remove("hidden");
        toggleAdvanced.classList.add("active");
      }

      // Apply format mode
      if (settings.isMarkdownMode) {
        setFormat("markdown");
      }
    }
  } catch (err) {
    console.error("Error loading settings:", err);
    // If error, use defaults
  }
}

// Text analysis helper functions
function getTextStatistics(text) {
  // This function could be expanded to include more sophisticated analysis
  // For now we use the basic metrics already calculated
  return {
    wordCount: countWords(text),
    charCount: countCharacters(text),
    sentenceCount: countSentences(text),
    paragraphCount: countParagraphs(text),
  };
}

// Auto-save functionality (could be expanded)
function autoSaveText() {
  localStorage.setItem("wordmetrics_text", textInput.value);
}

function loadSavedText() {
  const savedText = localStorage.getItem("wordmetrics_text");
  if (savedText) {
    textInput.value = savedText;
    cachedText = savedText;
    updateMetrics(savedText);
  }
}

// Initialize the app
document.addEventListener("DOMContentLoaded", () => {
  initApp();
  loadSavedText();

  // Set up auto-save every 30 seconds
  setInterval(autoSaveText, 30000);
});
