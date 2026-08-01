const products = [
  {
    id: 1,
    name: "Laboratorio Node.js",
    description: "Práctica de backend, rutas y consumo de servicios externos.",
    price: 5.00,
    icon: "🧩"
  },
  {
    id: 2,
    name: "Guía de mensajería",
    description: "Material de publicación y consumo de eventos internos.",
    price: 3.50,
    icon: "📘"
  },
  {
    id: 3,
    name: "Plantilla de informe",
    description: "Formato académico para evidencias y capturas del laboratorio.",
    price: 2.75,
    icon: "📄"
  },
  {
    id: 4,
    name: "Soporte técnico",
    description: "Simulación de servicio adicional para el proyecto práctico.",
    price: 4.25,
    icon: "🛠️"
  }
];

let cart = [];
let paypalActions = null;

const productsGrid = document.getElementById("productsGrid");
const cartBody = document.getElementById("cartBody");
const cartCount = document.getElementById("cartCount");
const subtotal = document.getElementById("subtotal");
const total = document.getElementById("total");
const resultBox = document.getElementById("resultBox");
const btnPayphone = document.getElementById("btnPayphone");
const btnClear = document.getElementById("btnClear");

function formatMoney(value) {
  return `$${value.toFixed(2)}`;
}

function toCents(value) {
  return Math.round(value * 100);
}

function getCartTotal() {
  return cart.reduce((sum, item) => {
    return sum + item.price * item.quantity;
  }, 0);
}

function getCartPayload() {
  const cartTotal = getCartTotal();

  return {
    amount: toCents(cartTotal),
    reference: "Compra laboratorio Node",
    additionalData: cart
      .map((item) => `${item.name} x${item.quantity}`)
      .join(" | "),
    items: cart.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.price
    }))
  };
}

function updatePaypalButtonState() {
  if (!paypalActions) return;

  if (cart.length === 0) {
    paypalActions.disable();
  } else {
    paypalActions.enable();
  }
}

function renderProducts() {
  productsGrid.innerHTML = "";

  products.forEach((product) => {
    const card = document.createElement("article");
    card.className = "product-card";

    card.innerHTML = `
      <div class="product-icon">${product.icon}</div>
      <h3>${product.name}</h3>
      <p>${product.description}</p>

      <div class="product-footer">
        <span class="price">${formatMoney(product.price)}</span>
        <button onclick="addToCart(${product.id})">Agregar</button>
      </div>
    `;

    productsGrid.appendChild(card);
  });
}

function addToCart(productId) {
  const product = products.find((item) => item.id === productId);

  if (!product) return;

  const existingItem = cart.find((item) => item.id === productId);

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({
      ...product,
      quantity: 1
    });
  }

  renderCart();
  resultBox.textContent = "Producto agregado al carrito.";
}

function increaseQuantity(productId) {
  const item = cart.find((product) => product.id === productId);

  if (item) {
    item.quantity += 1;
  }

  renderCart();
}

function decreaseQuantity(productId) {
  const item = cart.find((product) => product.id === productId);

  if (!item) return;

  item.quantity -= 1;

  if (item.quantity <= 0) {
    cart = cart.filter((product) => product.id !== productId);
  }

  renderCart();
}

function removeFromCart(productId) {
  cart = cart.filter((product) => product.id !== productId);
  renderCart();
}

function renderCart() {
  cartBody.innerHTML = "";

  if (cart.length === 0) {
    cartBody.innerHTML = `
      <tr>
        <td colspan="4" class="empty">
          No existen productos seleccionados.
        </td>
      </tr>
    `;
  } else {
    cart.forEach((item) => {
      const row = document.createElement("tr");

      row.innerHTML = `
        <td>${item.name}</td>
        <td>
          <div class="qty-control">
            <button onclick="decreaseQuantity(${item.id})">-</button>
            <span>${item.quantity}</span>
            <button onclick="increaseQuantity(${item.id})">+</button>
          </div>
        </td>
        <td>${formatMoney(item.price * item.quantity)}</td>
        <td>
          <button class="remove-btn" onclick="removeFromCart(${item.id})">×</button>
        </td>
      `;

      cartBody.appendChild(row);
    });
  }

  const cartTotal = getCartTotal();
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  cartCount.textContent = `${totalItems} ítems`;
  subtotal.textContent = formatMoney(cartTotal);
  total.textContent = formatMoney(cartTotal);

  updatePaypalButtonState();
}

async function payWithPayphone() {
  try {
    if (cart.length === 0) {
      resultBox.textContent = "Debe seleccionar al menos un producto antes de pagar con PayPhone.";
      return;
    }

    const payload = getCartPayload();

    resultBox.textContent = "Generando link de pago PayPhone...";

    const response = await fetch("/api/payphone/prepare", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    resultBox.textContent = JSON.stringify(data, null, 2);

    if (!response.ok) {
      return;
    }

    if (data.paymentUrl) {
      window.open(data.paymentUrl, "_blank");
    }
  } catch (error) {
    resultBox.textContent = `Error en frontend PayPhone: ${error.message}`;
  }
}

async function loadPaypalSdk() {
  try {
    const response = await fetch("/api/paypal/config");
    const config = await response.json();

    if (!config.clientId) {
      resultBox.textContent = "No existe PAYPAL_CLIENT_ID configurado en el archivo .env.";
      return;
    }

    const existingScript = document.querySelector("script[data-paypal-sdk='true']");

    if (existingScript) {
      existingScript.remove();
    }

    const script = document.createElement("script");
    const clientId = encodeURIComponent(String(config.clientId).replace(/\s/g, ""));
    const currency = config.currency || "USD";

    script.dataset.paypalSdk = "true";
    script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=${currency}`;

    script.onload = () => {
      renderPaypalButtons();
    };

    script.onerror = () => {
      resultBox.textContent = "No se pudo cargar el SDK de PayPal. Revise el PAYPAL_CLIENT_ID en el archivo .env.";
    };

    document.body.appendChild(script);
  } catch (error) {
    resultBox.textContent = `Error cargando PayPal SDK: ${error.message}`;
  }
}

function renderPaypalButtons() {
  if (!window.paypal) {
    resultBox.textContent = "No se pudo cargar el SDK de PayPal.";
    return;
  }

  const paypalContainer = document.getElementById("paypal-button-container");

  if (!paypalContainer) {
    resultBox.textContent = "No existe el contenedor paypal-button-container en el HTML.";
    return;
  }

  paypalContainer.innerHTML = "";

  paypal.Buttons({
    style: {
      layout: "vertical",
      color: "gold",
      shape: "rect",
      label: "paypal"
    },

    onInit: (data, actions) => {
      paypalActions = actions;

      if (cart.length === 0) {
        actions.disable();
      }
    },

    onClick: (data, actions) => {
      if (cart.length === 0) {
        resultBox.textContent = "Debe agregar al menos un producto antes de pagar con PayPal.";
        return actions.reject();
      }

      return actions.resolve();
    },

    createOrder: async () => {
      try {
        const payload = getCartPayload();

        resultBox.textContent = "Creando orden PayPal Sandbox...";

        const response = await fetch("/api/paypal/create-order", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
          resultBox.textContent = JSON.stringify(data, null, 2);
          throw new Error("No se pudo crear la orden PayPal.");
        }

        resultBox.textContent = JSON.stringify(data, null, 2);

        return data.id;
      } catch (error) {
        resultBox.textContent = `Error creando orden PayPal: ${error.message}`;
        throw error;
      }
    },

    onApprove: async (data) => {
      try {
        resultBox.textContent = "Capturando pago aprobado en PayPal...";

        const response = await fetch(`/api/paypal/capture-order/${data.orderID}`, {
          method: "POST"
        });

        const result = await response.json();

        resultBox.textContent = JSON.stringify(result, null, 2);

        if (result.ok) {
          cart = [];
          renderCart();
        }
      } catch (error) {
        resultBox.textContent = `Error capturando pago PayPal: ${error.message}`;
      }
    },

    onCancel: () => {
      resultBox.textContent = "El usuario canceló el pago con PayPal.";
    },

    onError: (error) => {
      resultBox.textContent = `Error PayPal: ${error.message}`;
    }
  }).render("#paypal-button-container");
}

function clearCart() {
  cart = [];
  renderCart();
  resultBox.textContent = "Carrito vacío. Esperando operación...";
}

btnPayphone.addEventListener("click", payWithPayphone);
btnClear.addEventListener("click", clearCart);

renderProducts();
renderCart();
loadPaypalSdk();