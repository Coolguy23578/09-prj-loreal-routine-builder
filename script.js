/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const selectedProductsList = document.getElementById("selectedProductsList");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const generateRoutineButton = document.getElementById("generateRoutine");
const clearProductsButton = document.getElementById("clearProducts");
const selectedProducts = [];
let displayedProducts = [];
const savedSelectionsKey = "lorealSelectedProductIds";

/* Keep the full conversation so the AI can answer follow-up questions */
const conversationMessages = [
  {
    role: "system",
    content:
      "You are a friendly L'Oréal skincare and beauty advisor. Create safe, practical routines using only the selected products the user provides.",
  },
];

/* Class-hosted Worker URL; no API key is needed in this browser code */
const workerUrl = "https://chatbot.kzhao-f2d.workers.dev/";

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Load product data from JSON file */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  return data.products;
}

/* Save the selected product IDs so selections survive a page reload */
function saveSelectedProducts() {
  const selectedIds = selectedProducts.map((product) => product.id);
  localStorage.setItem(savedSelectionsKey, JSON.stringify(selectedIds));
}

/* Restore full product objects when the page first loads */
async function restoreSelectedProducts() {
  let savedIds = [];

  try {
    savedIds = JSON.parse(localStorage.getItem(savedSelectionsKey)) || [];
  } catch (error) {
    localStorage.removeItem(savedSelectionsKey);
  }

  if (savedIds.length === 0) {
    displaySelectedProducts();
    return;
  }

  const products = await loadProducts();
  savedIds.forEach((savedId) => {
    const product = products.find((item) => item.id === savedId);
    if (product) selectedProducts.push(product);
  });

  displaySelectedProducts();
  saveSelectedProducts();
}

/* Create HTML for displaying product cards */
function displayProducts(products) {
  displayedProducts = products;
  productsContainer.innerHTML = products
    .map(
      (product) => `
    <div
      class="product-card ${
        selectedProducts.some((selectedProduct) => selectedProduct.id === product.id)
          ? "selected"
          : ""
      }"
      data-product-id="${product.id}"
      role="button"
      tabindex="0"
      aria-pressed="${selectedProducts.some(
        (selectedProduct) => selectedProduct.id === product.id
      )}"
    >
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.brand}</p>
        <button
          type="button"
          class="description-toggle"
          aria-expanded="false"
          aria-controls="description-${product.id}"
        >
          View details
        </button>
        <p
          id="description-${product.id}"
          class="product-description"
          hidden
        >
          ${product.description}
        </p>
      </div>
    </div>
  `
    )
    .join("");
}

/* Show the products the user has selected */
function displaySelectedProducts() {
  if (selectedProducts.length === 0) {
    selectedProductsList.innerHTML = `
      <p class="empty-selection">No products selected yet.</p>
    `;
    return;
  }

  selectedProductsList.innerHTML = selectedProducts
    .map(
      (product) => `
      <div class="selected-product">
        <span>${product.brand} ${product.name}</span>
        <button
          type="button"
          class="remove-product"
          data-product-id="${product.id}"
          aria-label="Remove ${product.name}"
        >
          <i class="fa-solid fa-xmark" aria-hidden="true"></i>
        </button>
      </div>
    `
    )
    .join("");
}

/* Add or remove a product from the selection */
function toggleProduct(product) {
  const productIndex = selectedProducts.findIndex(
    (selectedProduct) => selectedProduct.id === product.id
  );

  if (productIndex === -1) {
    selectedProducts.push(product);
  } else {
    selectedProducts.splice(productIndex, 1);
  }

  displaySelectedProducts();
  saveSelectedProducts();
  displayProducts(displayedProducts);
}

/* Handle clicks on product cards */
productsContainer.addEventListener("click", (e) => {
  /* Let the details button expand text without selecting the product */
  const descriptionButton = e.target.closest(".description-toggle");
  if (descriptionButton) {
    const card = descriptionButton.closest(".product-card");
    const description = card.querySelector(".product-description");
    const isExpanded = descriptionButton.getAttribute("aria-expanded") === "true";

    description.hidden = isExpanded;
    descriptionButton.setAttribute("aria-expanded", String(!isExpanded));
    descriptionButton.textContent = isExpanded ? "View details" : "Hide details";
    return;
  }

  const card = e.target.closest(".product-card");
  if (!card) return;

  const product = displayedProducts.find(
    (item) => item.id === Number(card.dataset.productId)
  );
  if (product) toggleProduct(product);
});

/* Allow keyboard users to select a product card */
productsContainer.addEventListener("keydown", (e) => {
  /* The details button already has its own keyboard behavior */
  if (!e.target.classList.contains("product-card")) return;
  if (e.key !== "Enter" && e.key !== " ") return;
  e.preventDefault();
  e.target.click();
});

/* Handle removing products from the selected products list */
selectedProductsList.addEventListener("click", (e) => {
  const removeButton = e.target.closest(".remove-product");
  if (!removeButton) return;

  const productIndex = selectedProducts.findIndex(
    (product) => product.id === Number(removeButton.dataset.productId)
  );
  if (productIndex !== -1) {
    selectedProducts.splice(productIndex, 1);
    displaySelectedProducts();
    saveSelectedProducts();
    displayProducts(displayedProducts);
  }
});

/* Clear every saved selection at once */
clearProductsButton.addEventListener("click", () => {
  selectedProducts.length = 0;
  localStorage.removeItem(savedSelectionsKey);
  displaySelectedProducts();
  displayProducts(displayedProducts);
});

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", async (e) => {
  const products = await loadProducts();
  const selectedCategory = e.target.value;

  /* filter() creates a new array containing only products 
     where the category matches what the user selected */
  const filteredProducts = products.filter(
    (product) => product.category === selectedCategory
  );

  displayProducts(filteredProducts);
});

restoreSelectedProducts();

/* Send messages to the Worker and return the AI's reply */
async function sendToWorker(message) {
  conversationMessages.push({ role: "user", content: message });

  const response = await fetch(workerUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: conversationMessages }),
  });

  if (!response.ok) {
    throw new Error("The routine advisor could not respond.");
  }

  const data = await response.json();
  const reply = data.choices[0].message.content;

  /* Save the assistant reply for future follow-up questions */
  conversationMessages.push({ role: "assistant", content: reply });
  return reply;
}

/* Show text in the chat window safely */
function displayChatMessage(text, className) {
  const messageElement = document.createElement("div");
  messageElement.className = className;
  messageElement.textContent = text;
  chatWindow.appendChild(messageElement);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* Generate a routine using only the selected product data */
generateRoutineButton.addEventListener("click", async () => {
  if (selectedProducts.length === 0) {
    chatWindow.innerHTML = "";
    displayChatMessage(
      "Please select at least one product before generating a routine.",
      "chat-message chat-error"
    );
    return;
  }

  /* Send only fields needed to personalize the routine */
  const selectedProductData = selectedProducts.map((product) => ({
    name: product.name,
    brand: product.brand,
    category: product.category,
    description: product.description,
  }));

  const prompt = `Create a personalized, step-by-step L'Oréal routine using only these selected products. Explain the purpose of each step and keep the instructions safe and easy to follow.\n\nSelected products:\n${JSON.stringify(
    selectedProductData,
    null,
    2
  )}`;

  chatWindow.innerHTML = "";
  displayChatMessage("Generating your personalized routine...", "chat-message chat-loading");
  generateRoutineButton.disabled = true;

  try {
    const reply = await sendToWorker(prompt);
    chatWindow.innerHTML = "";
    displayChatMessage(reply, "chat-message chat-assistant");
  } catch (error) {
    chatWindow.innerHTML = "";
    displayChatMessage(error.message, "chat-message chat-error");
  } finally {
    generateRoutineButton.disabled = false;
  }
});

/* Handle follow-up questions in the chat */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const userInput = document.getElementById("userInput");
  const message = userInput.value.trim();
  if (!message) return;

  displayChatMessage(message, "chat-message chat-user");
  userInput.value = "";

  try {
    const reply = await sendToWorker(message);
    displayChatMessage(reply, "chat-message chat-assistant");
  } catch (error) {
    displayChatMessage(error.message, "chat-message chat-error");
  }
});
