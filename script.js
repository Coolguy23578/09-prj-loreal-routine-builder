/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const selectedProductsList = document.getElementById("selectedProductsList");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const selectedProducts = [];
let displayedProducts = [];

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
    displayProducts(displayedProducts);
  }
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

displaySelectedProducts();

/* Chat form submission handler - placeholder for OpenAI integration */
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();

  chatWindow.innerHTML = "Connect to the OpenAI API for a response!";
});
