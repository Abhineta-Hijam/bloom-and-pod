let verifiedDeliveryPincode = "";
let currentDeliveryCharge = null;
let currentBaseSubTotal = 0;
let currentGstTotal = 0;
let currentProductTotal = 0;
let currentHandlingCharge = 0;
let currentHandlingGstTotal = 0;
/* ==========================================
   BLOOM & POD — HANDLING CALCULATION
   ========================================== */
function calculateCheckoutHandling(cart, products, rates) {
  let handlingCharge = 0;
  let handlingGstTotal = 0;
  const items = cart.map(item => {
    const product = products.find(
      p => String(p.id) === String(item.id)
    );
    if (!product) {
      throw new Error(
        "A product could not be found for handling calculation."
      );
    }
    const quantity = Number(item.quantity);
    const handlingClass = product.handlingClass;
    if (
      !Number.isSafeInteger(quantity) ||
      quantity < 1
    ) {
      throw new Error("Invalid product quantity.");
    }
    if (
      !handlingClass ||
      !Object.prototype.hasOwnProperty.call(
        rates,
        handlingClass
      )
    ) {
      throw new Error(
        `Handling class is missing for ${product.name}.`
      );
    }
    const rate = Number(rates[handlingClass]);
    const gstRate = Number(product.gst);
    if (
      !Number.isFinite(rate) ||
      rate < 0 ||
      !Number.isFinite(gstRate) ||
      gstRate < 0 ||
      gstRate > 100
    ) {
      throw new Error(
        `Invalid handling configuration for ${product.name}.`
      );
    }
    // Class rates have a maximum of two decimal places.
    const ratePaise = Math.round(rate * 100);
    const amountPaise = ratePaise * quantity;
    if (!Number.isSafeInteger(amountPaise)) {
      throw new Error("Handling amount exceeds the supported range.");
    }
    const amount = amountPaise / 100;
    const gstPaise = Math.round(
      (amountPaise * gstRate / 100) + Number.EPSILON
    );
    const gstAmount = gstPaise / 100;
    handlingCharge += amountPaise;
    handlingGstTotal += gstPaise;
    return {
      productId: String(product.id),
      handlingClass,
      handlingRate: rate,
      handlingAmount: amount,
      handlingGstAmount: gstAmount
    };
  });
  return {
    items,
    handlingCharge: handlingCharge / 100,
    handlingGstTotal: handlingGstTotal / 100
  };
}
/* Display monetary amounts with exactly two decimals. */
function checkoutMoney(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(amount));
}
function calculateDeliveryCharge(pincode) {
  pincode = String(pincode || "").trim();
  if (!/^[0-9]{6}$/.test(pincode)) return null;
  // 795xxx → Free delivery
  if (pincode.startsWith("795")) return 0;
  const firstDigit = pincode.charAt(0);
  // 7xxxxx → ₹87
  if (firstDigit === "7") return 87;
  // 1–6, 8, 9 → ₹112
  if (["1", "2", "3", "4", "5", "6", "8", "9"].includes(firstDigit)) {
    return 112;
  }
  return null;
}
function deliveryChargeLabel(charge) {
  if (
    charge === null ||
    charge === undefined
  ) {
    return "Enter PIN";
  }
  if (Number(charge) === 0) {
    return "Free";
  }
  return currency.format(
    Number(charge)
  );
}
function updateCheckoutTotals() {
  const deliveryElement =
    document.getElementById(
      "checkout-delivery-charge"
    );
  const deliveryNote =
    document.getElementById(
      "checkout-delivery-note"
    );
  const totalElement =
    document.getElementById(
      "checkout-grand-total"
    );
  const deliveryLabel =
    deliveryChargeLabel(
      currentDeliveryCharge
    );
  if (deliveryElement) {
    deliveryElement.textContent =
      deliveryLabel;
  }
  if (deliveryNote) {
    deliveryNote.textContent =
      deliveryLabel;
  }
  if (!totalElement) return;
  if (currentDeliveryCharge === null) {
    const beforeDelivery = Number((
      currentProductTotal +
      currentHandlingCharge +
      currentHandlingGstTotal
    ).toFixed(2));
    totalElement.textContent =
      checkoutMoney(beforeDelivery) +
      " + delivery";
    return;
  }
  const finalTotal = Number((
    currentProductTotal +
    currentHandlingCharge +
    currentHandlingGstTotal +
    currentDeliveryCharge
  ).toFixed(2));
  totalElement.textContent =
    checkoutMoney(finalTotal)
}
function initDeliveryLocationLookup(form) {
  const pincodeField =
    form.elements["pincode"];
  const stateField =
    form.elements["state"];
  const status =
    document.getElementById(
      "pincode-status"
    );
  if (
    !pincodeField ||
    !stateField
  ) {
    return;
  }
  let validationTimer = null;
  let lookupSequence = 0;
  const setStatus =
    (type, message) => {
      if (!status) return;
      status.className =
        "delivery-status" +
        (type ? " " + type : "");
      status.textContent =
        message || "";
    };
  const resetDelivery = () => {
    verifiedDeliveryPincode = "";
    stateField.value = "";
    currentDeliveryCharge = null;
    updateCheckoutTotals();
  };
  const lookupPincode =
    async pincode => {
      try {
        const cleanPincode =
          String(
            pincode || ""
          ).trim();
        if (
          !/^[0-9]{6}$/.test(
            cleanPincode
          )
        ) {
          return null;
        }
        const {
          data,
          error
        } =
          await window.bpSupabase.rpc(
            "lookup_delivery_pincode",
            {
              input_pincode:
                cleanPincode
            }
          );
        if (error) {
          console.error(
            "PIN lookup failed:",
            error
          );
          return null;
        }
        const result =
          Array.isArray(data)
            ? data[0]
            : data;
        if (!result) {
          return {
            success: true,
            deliverable: false,
            state: ""
          };
        }
        return {
          success: true,
          deliverable:
            result.deliverable === true,
          state:
            String(
              result.state || ""
            ).trim()
        };
      } catch (error) {
        console.error(
          "PIN lookup failed:",
          error
        );
        return null;
      }
    };
  pincodeField.addEventListener(
    "input",
    () => {
      pincodeField.value =
        String(
          pincodeField.value || ""
        )
          .replace(
            /[^0-9]/g,
            ""
          )
          .slice(
            0,
            6
          );
      clearTimeout(
        validationTimer
      );
      lookupSequence += 1;
      const currentSequence =
        lookupSequence;
      resetDelivery();
      setStatus(
        "",
        ""
      );
      const pincode =
        pincodeField.value;
      if (
        pincode.length < 6
      ) {
        return;
      }
      setStatus(
        "checking",
        "Checking delivery availability..."
      );
      validationTimer =
        setTimeout(
          async () => {
            const result =
              await lookupPincode(
                pincode
              );
            if (
              currentSequence !==
              lookupSequence
            ) {
              return;
            }
            if (!result) {
              resetDelivery();
              setStatus(
                "error",
                "Unable to check delivery availability. Please try again."
              );
              return;
            }
            if (
              result.success !== true ||
              result.deliverable !== true ||
              !result.state
            ) {
              resetDelivery();
              setStatus(
                "error",
                "Sorry. We do not deliver to this location."
              );
              return;
            }
            stateField.value =
              String(
                result.state
              ).trim();
            verifiedDeliveryPincode =
              pincode;
            currentDeliveryCharge =
              calculateDeliveryCharge(
                pincode
              );
            if (
              currentDeliveryCharge === null
            ) {
              resetDelivery();
              setStatus(
                "error",
                "Delivery charge could not be calculated for this PIN code."
              );
              return;
            }
            updateCheckoutTotals();
            setStatus(
              "success",
              currentDeliveryCharge === 0
                ? "Delivery available · Free delivery."
                : "Delivery available · Delivery charge " +
                  currency.format(
                    currentDeliveryCharge
                  ) +
                  "."
            );
          },
          250
        );
    }
  );
}
function checkoutCart() {
  try {
    return JSON.parse(
      localStorage.getItem(
        "bloomPodCart"
      ) || "[]"
    );
  } catch {
    return [];
  }
}
async function verifyCheckoutProducts() {
  const cart = checkoutCart();
  if (!Array.isArray(cart) || cart.length === 0) {
    throw new Error("Your cart is empty.");
  }
  const ids = [...new Set(
    cart.map(item => String(item.id))
  )];
  const { data, error } = await window.bpSupabase
    .from("products")
    .select(
      "id, name, available, offline_purchase_only, is_published, " +
      "min_qty, available_units, max_quantity_allowed"
    )
    .in("id", ids);
  if (error || !Array.isArray(data)) {
    throw new Error(
      "Unable to verify product availability. Please try again."
    );
  }
  const productsById = new Map(
    data.map(p => [String(p.id), p])
  );
  for (const item of cart) {
    const product = productsById.get(String(item.id));
    if (!product) {
      throw new Error(
        "A product in your cart is no longer available. Please return to your cart."
      );
    }
    if (product.is_published === false) {
      throw new Error(
        `${product.name} is no longer available. Please remove it from your cart.`
      );
    }
    if (product.available === false) {
      throw new Error(
        `${product.name} is no longer available. Please remove it from your cart.`
      );
    }
    if (product.offline_purchase_only === true) {
      throw new Error(
        `${product.name} is available in-store only. Please remove it from your cart.`
      );
    }
    const quantity = Number(item.quantity);
    const minimum = Number(product.min_qty) || 10;
    const stock = Number(product.available_units) || 0;
    const maximum =
      product.max_quantity_allowed == null ||
      product.max_quantity_allowed === ""
        ? Infinity
        : Number(product.max_quantity_allowed) > 0
          ? Math.floor(Number(product.max_quantity_allowed))
          : Infinity;
    if (
      !Number.isSafeInteger(quantity) ||
      quantity < minimum
    ) {
      throw new Error(
        `${product.name} requires a minimum purchase of ${minimum} units. Please update your cart.`
      );
    }
    if (quantity > stock) {
      throw new Error(
        `${product.name}: only ${stock} units are available. Please update your cart.`
      );
    }
    if (quantity > maximum) {
      throw new Error(
        `${product.name}: maximum ${maximum} units allowed per cart. Please update your cart.`
      );
    }
  }
  return true;
}
async function renderCheckoutSummary() {
  await window.storeReady;
  const target =
    document.getElementById(
      "checkout-summary"
    );
  const cart =
    checkoutCart();
  if (!target) return;
  if (!cart.length) {
    target.innerHTML =
      '<h2>No items in cart</h2>' +
      '<p>Your cart is empty. Add products before checking out.</p>' +
      '<a class="btn btn-primary" href="products.html">Shop now</a>';
    const btn =
      document.querySelector(
        ".submit-order"
      );
    if (btn) {
      btn.disabled = true;
    }
    return;
  }
  try {
    await verifyCheckoutProducts();
    // Retrieve the latest handling rates from Supabase.
    const handlingRates = await window.getHandlingRates();
    // Calculate charges for the actual shopping cart.
    const handlingResult = calculateCheckoutHandling(
      cart,
      PRODUCTS,
      handlingRates
    );
    currentHandlingCharge =
      handlingResult.handlingCharge;
    currentHandlingGstTotal =
      handlingResult.handlingGstTotal;
  } catch (error) {
    const btn = document.querySelector(".submit-order");
    if (btn) {
      btn.disabled = true;
    }
    target.innerHTML = `
      <h2>Checkout unavailable</h2>
      <p class="checkout-block-reason"></p>
      <a class="btn btn-secondary" href="cart.html">
        Return to cart
      </a>
    `;
    target.querySelector(
      ".checkout-block-reason"
    ).textContent = error.message;
    const errorBox = document.getElementById(
      "checkout-error"
    );
    if (errorBox) {
      errorBox.textContent = error.message;
      errorBox.hidden = false;
    }
    return;
  }
  currentBaseSubTotal = 0;
  currentGstTotal = 0;
  currentProductTotal = 0;
  const rows =
    cart
      .map(item => {
        const p =
          PRODUCTS.find(
            x =>
              x.id === item.id
          );
        if (!p) {
          return "";
        }
        const quantity =
          Number(
            item.quantity
          ) || 0;
        const gstRate =
          Number.isFinite(
            Number(p.gst)
          )
            ? Number(p.gst)
            : 18;
        const basePrice =
          Number(
            p.price
          ) || 0;
        const baseLineTotal =
          basePrice *
          quantity;
        const gstAmount =
          baseLineTotal *
          gstRate /
          100;
        const lineTotal =
          baseLineTotal +
          gstAmount;
        currentBaseSubTotal +=
          baseLineTotal;
        currentGstTotal +=
          gstAmount;
        currentProductTotal +=
          lineTotal;
        return `
          <div class="summary-product">
            <span>
              ${escapeHtml(p.name)}
              <small>
                × ${quantity}
                · ${currency.format(basePrice)} ea.
              </small>
            </span>
            <strong>
              ${currency.format(baseLineTotal)}
            </strong>
          </div>
        `;
      })
      .join("");
  currentBaseSubTotal =
    Number(
      currentBaseSubTotal
        .toFixed(2)
    );
  currentGstTotal =
    Number(
      currentGstTotal
        .toFixed(2)
    );
  currentProductTotal =
    Number(
      currentProductTotal
        .toFixed(2)
    );
  target.innerHTML = `
  <h2>Order summary
    <a  href="cart.html"
        class="checkout-back-cart"
    >
      ← To Cart
    </a></h2>
  <div class="checkout-summary-totals">
    <div class="summary-line summary-total">
      <span>Total</span>
        <strong id="checkout-grand-total">
          ${currency.format(
            Number((
              currentProductTotal +
              currentHandlingCharge +
              currentHandlingGstTotal
            ).toFixed(2))
          )} + delivery
        </strong>
    </div>
    <div class="summary-line">
      <span>Delivery charge</span>
      <span id="checkout-delivery-charge">
        Enter PIN
      </span>
    </div>
    <div class="summary-line">
      <span>Product GST</span>
      <span>
        ${currency.format(currentGstTotal)}
      </span>
    </div>
    <div class="summary-line">
      <span>Handling charge</span>
      <span id="checkout-handling-charge">
        ${currency.format(currentHandlingCharge)}
      </span>
    </div>
    <div class="summary-line">
      <span>Handling GST</span>
      <span id="checkout-handling-gst">
        ${currency.format(currentHandlingGstTotal)}
      </span>
    </div>
    <div class="summary-line">
      <span>Subtotal</span>
      <span>
        ${currency.format(
          currentBaseSubTotal
        )}
      </span>
    </div>
  </div>
  <div class="checkout-products-box">
    ${rows}
  </div>
`;
  updateCheckoutTotals();
}
/*
 * Collect the checkout information.
 * The backend remains authoritative for final pricing.
 */
async function collectCheckoutData(form) {
  const data =
    Object.fromEntries(
      new FormData(form)
        .entries()
    );
  const cart =
    checkoutCart();
  data.country =
    "India";
  // Retrieve current Supabase handling rates.
  const handlingRates = await window.getHandlingRates();
  // Calculate handling for this checkout snapshot.
  const handlingResult = calculateCheckoutHandling(
    cart,
    PRODUCTS,
    handlingRates
  );
  data.confirmationHandlingCharge =
    handlingResult.handlingCharge;
  data.confirmationHandlingGstTotal =
    handlingResult.handlingGstTotal;
  data.confirmationSnapshot =
    cart.map(item => {
      const p =
        PRODUCTS.find(
          x =>
            x.id === item.id
        );
      const quantity =
        Number(
          item.quantity
        ) || 0;
      const basePrice =
        Number(
          p?.price
        ) || 0;
      const gst =
        Number.isFinite(
          Number(p?.gst)
        )
          ? Number(p.gst)
          : 18;
      const gstPerUnit =
        basePrice *
        gst /
        100;
      const unitPrice =
        basePrice +
        gstPerUnit;
      return {
        id:
          String(item.id),
        name:
          p?.name ||
          String(item.id),
        quantity,
        basePrice,
        gst,
        gstPerUnit,
        unitPrice,
        lineTotal:
          unitPrice * quantity,
        handlingClass:
          p?.handlingClass || "",
        handlingRate:
          handlingResult.items.find(
            h => h.productId === String(item.id)
          )?.handlingRate,
        handlingAmount:
          handlingResult.items.find(
            h => h.productId === String(item.id)
          )?.handlingAmount,
        handlingGstAmount:
          handlingResult.items.find(
            h => h.productId === String(item.id)
          )?.handlingGstAmount
      };
    });
  data.confirmationBaseSubTotal =
    Number(
      data.confirmationSnapshot
        .reduce(
          (sum, item) =>
            sum +
            (
              Number(
                item.basePrice
              ) || 0
            ) *
            (
              Number(
                item.quantity
              ) || 0
            ),
          0
        )
        .toFixed(2)
    );
  data.confirmationGstTotal =
    Number(
      data.confirmationSnapshot
        .reduce(
          (sum, item) => {
            const baseLine =
              (
                Number(
                  item.basePrice
                ) || 0
              ) *
              (
                Number(
                  item.quantity
                ) || 0
              );
            const gstRate =
              Number(
                item.gst
              ) || 0;
            return (
              sum +
              baseLine *
              gstRate /
              100
            );
          },
          0
        )
        .toFixed(2)
    );
  data.confirmationProductTotal =
    Number(
      (
        data.confirmationBaseSubTotal +
        data.confirmationGstTotal
      ).toFixed(2)
    );
  data.confirmationDeliveryCharge =
    calculateDeliveryCharge(
      data.pincode
    );
  if (
    data.confirmationDeliveryCharge ===
    null
  ) {
    throw new Error(
      "Delivery charge could not be calculated."
    );
  }
  data.confirmationTotal =
    Number(
      (
        data.confirmationProductTotal +
        data.confirmationHandlingCharge +
        data.confirmationHandlingGstTotal +
        data.confirmationDeliveryCharge
      ).toFixed(2)
    );
  data.products =
    cart.map(item => ({
      id:
        String(item.id),
      quantity:
        Number(
          item.quantity
        ) || 0
    }));
  data.submittedAt =
    new Date()
      .toISOString();
  if (
  window.crypto &&
  typeof window.crypto.randomUUID === "function"
) {
  data.idempotencyKey =
    window.crypto.randomUUID();
} else if (
  window.crypto &&
  typeof window.crypto.getRandomValues === "function"
) {
  const bytes =
    new Uint8Array(16);
  window.crypto.getRandomValues(bytes);
  data.idempotencyKey =
    "bp-" +
    Array.from(
      bytes,
      byte =>
        byte
          .toString(16)
          .padStart(2, "0")
    ).join("");
} else {
  throw new Error(
    "Your browser cannot securely create an order reference. Please use a newer browser."
  );
}
  return data;
}
function restoreCheckoutForm(form) {
  let saved = null;
  try {
    saved =
      JSON.parse(
        sessionStorage.getItem(
          "bloomPodPendingOrder"
        ) || "null"
      );
  } catch (error) {
    saved = null;
  }
  if (!saved) {
    return;
  }
  /*
   * Restore everything except:
   *
   * - pincode
   * - state
   *
   * State must be derived again after
   * the customer re-enters their PIN.
   */
  const fields = [
    "name",
    "email",
    "phone",
    "alternatePhone",
    "address1",
    "address2",
    "city",
    "landmark",
    "notes"
  ];
  fields.forEach(name => {
    const field =
      form.elements[name];
    if (!field) {
      return;
    }
    const value =
      saved[name];
    if (
      value !== undefined &&
      value !== null
    ) {
      field.value =
        String(value);
    }
  });
  /*
   * Restore checkbox.
   */
  const billingSame =
    form.elements[
      "billingSame"
    ];
  if (billingSame) {
    billingSame.checked =
      saved.billingSame ===
      undefined
        ? true
        : (
            saved.billingSame ===
              true ||
            saved.billingSame ===
              "true" ||
            saved.billingSame ===
              "on"
          );
  }
  
  /*
   * Restore only an available payment method.
   *
   * RAZORPAY INTEGRATION REMINDER:
   * Online payment must not be restored while
   * the corresponding radio button is disabled.
   *
   * Existing customers returning to checkout
   * should see Cash on Delivery selected.
   *
   * Revisit this logic when Razorpay checkout
   * is fully implemented and activated.
   */
  const payments = Array.from(
    form.querySelectorAll(
      'input[name="paymentMethod"]'
    )
  );

  const savedPayment = payments.find(
    input =>
      input.value === String(saved.paymentMethod || "") &&
      !input.disabled
  );

  const defaultPayment = payments.find(
    input =>
      input.value === "Cash on Delivery" &&
      !input.disabled
  );

  const paymentToRestore =
    savedPayment || defaultPayment;

  if (paymentToRestore) {
    paymentToRestore.checked = true;
  }

  /*
   * Always reset delivery verification.
   */
  const pincode =
    form.elements["pincode"];
  const state =
    form.elements["state"];
  if (pincode) {
    pincode.value = "";
  }
  if (state) {
    state.value = "";
  }
  verifiedDeliveryPincode =
    "";
  currentDeliveryCharge =
    null;
  updateCheckoutTotals();
  const status =
    document.getElementById(
      "pincode-status"
    );
  if (status) {
    status.textContent =
      "";
    status.className =
      "delivery-status";
  }
}
document.addEventListener(
  "DOMContentLoaded",
  async () => {
    await renderCheckoutSummary();
    const form =
      document.getElementById(
        "checkout-form"
      );
    if (!form) return;
    /*
     * Restore checkout details when the customer
     * comes back from the review page.
     *
     * Everything is restored EXCEPT the PIN code.
     */
    restoreCheckoutForm(
      form
    );
    initDeliveryLocationLookup(
      form
    );
    form.addEventListener(
      "submit",
      async e => {
        e.preventDefault();
        const enteredPincode =
          String(
            form.elements[
              "pincode"
            ]?.value || ""
          ).trim();
        const state =
          String(
            form.elements[
              "state"
            ]?.value || ""
          ).trim();
        if (
          !/^[0-9]{6}$/.test(
            enteredPincode
          )
        ) {
          alert(
            "Please enter a valid 6-digit PIN code."
          );
          form.elements[
            "pincode"
          ]?.focus();
          return;
        }
        if (
          verifiedDeliveryPincode !==
            enteredPincode ||
          !state ||
          currentDeliveryCharge ===
            null
        ) {
          alert(
            "Sorry. We do not deliver to this location."
          );
          form.elements[
            "pincode"
          ]?.focus();
          return;
        }
        const error =
          document.getElementById(
            "checkout-error"
          );
        if (error) {
          error.hidden = true;
        }
        if (
          !form.checkValidity()
        ) {
          form.reportValidity();
          return;
        }

        // Additional email local-part validation.
        const emailField = form.elements["email"];
        const emailValue = String(
          emailField?.value || ""
        ).trim();

        const emailLocalPart = emailValue.split("@")[0];

        if (
          emailLocalPart.startsWith(".") ||
          emailLocalPart.endsWith(".") ||
          emailLocalPart.includes("..")
        ) {
          alert(
            "Please enter a valid email address. " +
            "Periods cannot appear at the beginning, " +
            "at the end, or consecutively before @."
          );

          emailField.focus();
          return;
        }
        const button =
          form.querySelector(
            ".submit-order"
          );
        if (button) {
          button.disabled =
            true;
          button.textContent =
            "Preparing confirmation…";
        }
        try {
          await window.storeReady;
          await verifyCheckoutProducts();
        const data =
          await collectCheckoutData(form);
          sessionStorage.setItem(
            "bloomPodPendingOrder",
            JSON.stringify(data)
          );
          window.location.href =
            "order-confirmation.html";
        } catch (err) {
          if (error) {
            error.textContent =
              err.message ||
              "Something went wrong. Please try again.";
            error.hidden =
              false;
          }
          if (button) {
            button.disabled =
              false;
            button.textContent =
              "Review order";
          }
        }
      }
    );
  }
);