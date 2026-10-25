// Always start the Order Confirmation page at the top.
if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}
window.addEventListener("load", () => {
  window.scrollTo({
    top: 0,
    left: 0,
    behavior: "instant"
  });
});
function pendingOrder() {
  try {
    return JSON.parse(
      sessionStorage.getItem("bloomPodPendingOrder") || "null"
    );
  } catch {
    return null;
  }
}

/* ORDER CONFIRMATION — EXPANDABLE PRODUCT DETAILS */

document.getElementById("review-products")
  ?.addEventListener("click", event => {
    const button = event.target.closest(
      ".review-product-details-toggle"
    );

    if (!button) return;

    const detailsId = button.getAttribute("aria-controls");
    const details = detailsId
      ? document.getElementById(detailsId)
      : null;

    if (!details) return;

    const shouldOpen = !details.classList.contains("is-open");

    details.classList.toggle("is-open", shouldOpen);

    button.setAttribute(
      "aria-expanded",
      String(shouldOpen)
    );

    details.setAttribute(
      "aria-hidden",
      String(!shouldOpen)
    );

    const label = button.querySelector(
      ".review-product-toggle-text"
    );

    if (label) {
      label.textContent = shouldOpen
        ? "Hide details"
        : "View details";
    }
  });

function hasUncertainPendingOrder() {
  const data = pendingOrder();

  if (!data) {
    return false;
  }

  const pendingKey = String(
    data.secureOrderSubmissionPending || ""
  ).trim();

  const uncertainKey = String(
    data.secureOrderOutcomeUncertain || ""
  ).trim();

  return Boolean(pendingKey || uncertainKey);
}
function getRestorableConfirmedOrder() {
  if (!ENABLE_SECURE_CHECKOUT) {
    return null;
  }

  const data = pendingOrder();

  if (!data) {
    return null;
  }

  const idempotencyKey = String(
    data.idempotencyKey ||
    data.orderIdempotencyKey ||
    ""
  ).trim();

  const orderId = String(data.savedOrderId || "").trim();
  const orderTotal = Number(data.savedOrderTotal);

  if (
    !/^[A-Za-z0-9._:-]{12,100}$/.test(idempotencyKey) ||
    data.secureOrderSubmissionPending !== idempotencyKey ||
    Boolean(String(data.secureOrderOutcomeUncertain || "").trim()) ||
    !orderId ||
    !Number.isFinite(orderTotal) ||
    orderTotal <= 0
  ) {
    return null;
  }

  return {
    orderId,
    email: String(data.email || "").trim()
  };
}
function markSecureOrderSubmissionPending() {
  if (!ENABLE_SECURE_CHECKOUT) {
    return false;
  }

  const data = pendingOrder();

  if (!data) {
    return false;
  }

  const idempotencyKey = String(
    data.idempotencyKey ||
    data.orderIdempotencyKey ||
    ""
  ).trim();

    if (!/^[A-Za-z0-9._:-]{12,100}$/.test(idempotencyKey)) {
    return false;
  }

    // Never overwrite an existing pending or uncertain attempt,
  // even if its stored key differs from the current key.
  const existingPendingKey = String(
    data.secureOrderSubmissionPending || ""
  ).trim();

  const existingUncertainKey = String(
    data.secureOrderOutcomeUncertain || ""
  ).trim();

  if (existingPendingKey || existingUncertainKey) {
    return false;
  }

  data.secureOrderSubmissionPending = idempotencyKey;

  sessionStorage.setItem(
    "bloomPodPendingOrder",
    JSON.stringify(data)
  );

  return true;
}
function clearSecureOrderSubmissionPending() {
  if (!ENABLE_SECURE_CHECKOUT) {
    return;
  }

  const data = pendingOrder();

  if (!data) {
    return;
  }

  const idempotencyKey = String(
    data.idempotencyKey ||
    data.orderIdempotencyKey ||
    ""
  ).trim();

  if (
    !idempotencyKey ||
    data.secureOrderSubmissionPending !== idempotencyKey
  ) {
    return;
  }

    delete data.secureOrderSubmissionPending;

  try {
    sessionStorage.setItem(
      "bloomPodPendingOrder",
      JSON.stringify(data)
    );
  } catch (storageError) {
    console.error(
      "Unable to clear secure order submission marker:",
      storageError
    );
  }
}
/*
 * ============================================================
 * BLOOM & POD — LAYER 1 & 2 FRONTEND ACTIVATION CONTROL
 * ============================================================
 *
 * STATUS: SECURE CHECKOUT PREPARED — NOT ACTIVE
 *
 * false:
 *   Continue using the existing direct place_order() RPC.
 *
 * true:
 *   Submit through create-customer-order after Turnstile
 *   verification and use the protected order response.
 *
 * IMPORTANT:
 * Keep false until the backend gateway is deployed,
 * tested and explicitly activated.
 *
 * Both frontend and backend must be coordinated during
 * the final security cutover.
 *
 * Layer 3: Rate limiting postponed.
 * Layer 4: Network protection postponed until launch.
 * ============================================================
 */
const ENABLE_SECURE_CHECKOUT = true;
/*
 * ============================================================
 * BLOOM & POD — RAZORPAY ONLINE PAYMENT ACTIVATION
 * ============================================================
 *
 * This switch is independent of the existing secure COD
 * checkout and Cloudflare Turnstile integration.
 *
 * Keep FALSE until:
 * - Razorpay Test Mode payment initiation is connected.
 * - Backend payment verification is implemented.
 * - Database payment finalization is tested.
 * - Webhook and reconciliation requirements are satisfied.
 * - Explicit activation approval is given.
 *
 * Setting this switch to true alone must never authorize
 * payment, create an order, or bypass server verification.
 *
 * STATUS: DISABLED — DEVELOPMENT ONLY
 * ============================================================
 */
const ENABLE_RAZORPAY_ONLINE_CHECKOUT = false;
/*
 * BLOOM & POD — RAZORPAY HTTP TRANSPORT CONTROL
 *
 * Independent of the online checkout UI switch.
 *
 * Must remain false until the Razorpay backend,
 * database installation, security verification,
 * and recovery procedures are approved.
 *
 * Frontend switches are deployment controls,
 * not substitutes for server-side security.
 */

const ENABLE_RAZORPAY_INITIATION_TRANSPORT = false;
// Independent Razorpay callback transport gate.
// Keep false until the entire Test Mode flow is approved.
const ENABLE_RAZORPAY_VERIFICATION_TRANSPORT = false;
/*
 * ============================================================
 * BLOOM & POD — RAZORPAY TURNSTILE PREPARATION
 * ============================================================
 *
 * Separate from the existing COD Turnstile verification.
 *
 * COD action: create_order
 * Razorpay action: create_razorpay_order
 *
 * The backend independently validates the Turnstile
 * token, hostname and action.
 *
 * No widget is rendered while Razorpay is disabled.
 * ============================================================
 */

const RAZORPAY_TURNSTILE_ACTION =
  "create_razorpay_order";

let razorpayTurnstileWidgetId = null;
let razorpayTurnstileToken = null;

function clearRazorpayTurnstileToken() {
  razorpayTurnstileToken = null;
}

function handleRazorpayTurnstileSuccess(token) {
  // Never retain a payment token while Razorpay is disabled.
  if (!ENABLE_RAZORPAY_ONLINE_CHECKOUT) {
    clearRazorpayTurnstileToken();
    return;
  }

  if (
    typeof token !== "string" ||
    !token.trim() ||
    token.length > 2048
  ) {
    clearRazorpayTurnstileToken();
    return;
  }

  razorpayTurnstileToken = token.trim();
}

function handleRazorpayTurnstileExpired() {
  clearRazorpayTurnstileToken();
}

function handleRazorpayTurnstileError() {
  clearRazorpayTurnstileToken();
}
/*
 * ============================================================
 * BLOOM & POD — RAZORPAY TURNSTILE WIDGET CONFIGURATION
 * ============================================================
 *
 * Prepares configuration only.
 *
 * Does not render a widget, contact Cloudflare,
 * or start Razorpay checkout.
 *
 * Uses separate callbacks from the existing COD widget.
 *
 * STATUS: DEVELOPMENT ONLY — DISABLED
 * ============================================================
 */

function buildRazorpayTurnstileWidgetOptions(siteKey) {
  // The site key is public, but it must be configured
  // before the Razorpay widget can eventually render.
  if (
    typeof siteKey !== "string" ||
    !siteKey.trim() ||
    siteKey.length > 128 ||
    /\s/.test(siteKey)
  ) {
    throw new Error(
      "Invalid Razorpay Turnstile site key."
    );
  }

  return {
    sitekey: siteKey,
    action: RAZORPAY_TURNSTILE_ACTION,

    callback: handleRazorpayTurnstileSuccess,

    "expired-callback":
      handleRazorpayTurnstileExpired,

    "error-callback":
      handleRazorpayTurnstileError
  };
}
/*
 * ============================================================
 * BLOOM & POD — RAZORPAY TURNSTILE INITIALIZER
 * ============================================================
 *
 * Separate from the existing COD Turnstile widget.
 *
 * This function is NOT called automatically.
 *
 * While Razorpay is disabled:
 * - No widget is rendered.
 * - No Turnstile API is called.
 * - No Razorpay request is made.
 *
 * STATUS: DEVELOPMENT ONLY
 * ============================================================
 */

function initializeRazorpayTurnstileWidget(
  containerId,
  siteKey
) {
  // Gate 1: Razorpay must be explicitly enabled.
  if (!ENABLE_RAZORPAY_ONLINE_CHECKOUT) {
    return false;
  }

  // Gate 2: Prevent duplicate widget creation.
  if (razorpayTurnstileWidgetId !== null) {
    return true;
  }

  // Gate 3: Require a dedicated Razorpay container.
  const container =
    typeof containerId === "string"
      ? document.getElementById(containerId)
      : null;

  if (!container) {
    throw new Error(
      "Razorpay security verification container is unavailable."
    );
  }

  // Gate 4: Require the official Turnstile renderer.
  if (
    !window.turnstile ||
    typeof window.turnstile.render !== "function"
  ) {
    throw new Error(
      "Razorpay security verification is unavailable."
    );
  }

  // Build the separate Razorpay widget configuration.
  const options =
    buildRazorpayTurnstileWidgetOptions(siteKey);

  // Render only after all checks have passed.
  const widgetId = window.turnstile.render(
    container,
    options
  );

  if (
    typeof widgetId !== "string" &&
    typeof widgetId !== "number"
  ) {
    throw new Error(
      "Razorpay security verification could not initialize."
    );
  }

  razorpayTurnstileWidgetId = widgetId;

  return true;
}
/*
 * ============================================================
 * BLOOM & POD — RAZORPAY TURNSTILE RESET
 * ============================================================
 *
 * Separate from the existing COD Turnstile reset.
 *
 * Always clear the Razorpay verification token first.
 *
 * Never reset the COD widget or reuse its token.
 *
 * STATUS: DEVELOPMENT ONLY — RAZORPAY DISABLED
 * ============================================================
 */

function resetRazorpayTurnstileWidget() {
  // Discard any previously stored Razorpay token.
  clearRazorpayTurnstileToken();

  // There is no Razorpay widget to reset.
  if (razorpayTurnstileWidgetId === null) {
    return false;
  }

  // Only the dedicated Razorpay widget may be reset.
  if (
    !window.turnstile ||
    typeof window.turnstile.reset !== "function"
  ) {
    return false;
  }

  try {
    window.turnstile.reset(
      razorpayTurnstileWidgetId
    );

    return true;

  } catch (error) {
    console.error(
      "Razorpay security verification reset failed:",
      error
    );

    return false;
  }
}
let orderSubmissionFinished = false;
let orderSubmissionStarted = false;
let orderOutcomeUncertain =
  ENABLE_SECURE_CHECKOUT && hasUncertainPendingOrder();
let successfulOrderId = "";

function showOrderProcessingOverlay() {
  const overlay = document.getElementById(
    "order-processing-overlay"
  );

  if (!overlay) return;

  overlay.hidden = false;
  document.body.style.overflow = "hidden";
}

function hideOrderProcessingOverlay() {
  const overlay = document.getElementById(
    "order-processing-overlay"
  );

  if (!overlay) return;

  overlay.hidden = true;
  document.body.style.overflow = "";
}

/*
 * Secure checkout verification.
 * The widget remains inactive until the secure gateway
 * is ready for customer orders.
 */
let orderTurnstileWidgetId = null;
let orderTurnstileToken = null;
/*
 * ============================================================
 * BLOOM & POD — LAYER 2: SECURE CHECKOUT BUTTON STATE
 * ============================================================
 *
 * During secure checkout, the Place Order button must
 * remain disabled until Turnstile verification succeeds.
 *
 * Existing direct RPC checkout is unaffected while
 * ENABLE_SECURE_CHECKOUT remains false.
 *
 * This helper also respects ongoing and completed
 * order submissions.
 *
 * Layer 3: Rate limiting postponed.
 * ============================================================
 */
function updateSecureOrderButtonState() {
  if (!ENABLE_SECURE_CHECKOUT) {
    return;
  }

  const button = document.getElementById(
    "place-order-btn"
  );

  if (!button) {
    return;
  }

  const hasValidToken =
    typeof orderTurnstileToken === "string" &&
    orderTurnstileToken.trim().length > 0;

  const data = pendingOrder();

  const paymentAllowed =
    data &&
    !isOnlinePayment(data);

    button.disabled =
    !hasValidToken ||
    !paymentAllowed ||
    orderSubmissionStarted ||
    orderSubmissionFinished ||
    orderOutcomeUncertain ||
    hasUncertainPendingOrder();
}
function clearOrderTurnstileToken() {
  orderTurnstileToken = null;
}
/*
 * ============================================================
 * BLOOM & POD — LAYER 2: TURNSTILE SUCCESS
 * ============================================================
 *
 * Store the verified Turnstile challenge token and
 * refresh the secure Place Order button state.
 *
 * The backend must independently verify this token
 * before any order can be created.
 *
 * Existing checkout is unchanged while
 * ENABLE_SECURE_CHECKOUT remains false.
 * ============================================================
 */
function handleOrderTurnstileSuccess(token) {
  if (typeof token !== "string" || !token.trim()) {
    clearOrderTurnstileToken();
    updateSecureOrderButtonState();
    return;
  }

  orderTurnstileToken = token;
  updateSecureOrderButtonState();
}

/*
 * ============================================================
 * BLOOM & POD — LAYER 2: TURNSTILE TOKEN EXPIRATION
 * ============================================================
 *
 * Cloudflare Turnstile tokens expire and must not be
 * reused after expiration.
 *
 * Clear the stored token and immediately refresh the
 * Place Order button state.
 *
 * The existing checkout remains unaffected while
 * ENABLE_SECURE_CHECKOUT is false.
 * ============================================================
 */
function handleOrderTurnstileExpired() {
  clearOrderTurnstileToken();
  updateSecureOrderButtonState();
}

/*
 * ============================================================
 * BLOOM & POD — LAYER 2: TURNSTILE VERIFICATION ERROR
 * ============================================================
 *
 * If Turnstile reports an error, remove the existing
 * token and immediately disable secure order submission
 * until verification succeeds again.
 *
 * Existing checkout is unaffected while
 * ENABLE_SECURE_CHECKOUT remains false.
 * ============================================================
 */
function handleOrderTurnstileError() {
  clearOrderTurnstileToken();
  updateSecureOrderButtonState();
}

/*
 * ============================================================
 * BLOOM & POD — LAYER 2: TURNSTILE RESET
 * ============================================================
 *
 * Clear the single-use verification token and immediately
 * update the Place Order button before resetting the widget.
 *
 * A new successful verification is required before the
 * customer can submit another secure order attempt.
 *
 * Existing direct RPC checkout is unaffected while
 * ENABLE_SECURE_CHECKOUT remains false.
 * ============================================================
 */
function resetOrderTurnstile() {
  clearOrderTurnstileToken();
  updateSecureOrderButtonState();

  if (
    orderTurnstileWidgetId !== null &&
    window.turnstile &&
    typeof window.turnstile.reset === "function"
  ) {
    window.turnstile.reset(orderTurnstileWidgetId);
  }
}

function initializeOrderTurnstile() {
  const container = document.getElementById(
    "order-turnstile-widget"
  );

  if (
    !container ||
    !window.turnstile ||
    typeof window.turnstile.render !== "function" ||
    orderTurnstileWidgetId !== null
  ) {
    return;
  }

  orderTurnstileWidgetId = window.turnstile.render(
    container,
    {
      sitekey: "0x4AAAAAAFU6dXrwYwQ9jCMZ",
      action: "create_order",
      callback: handleOrderTurnstileSuccess,
      "expired-callback": handleOrderTurnstileExpired,
      "error-callback": handleOrderTurnstileError
    }
  );
}

let orderTurnstileScriptPromise = null;

function loadOrderTurnstileScript() {
  if (
    window.turnstile &&
    typeof window.turnstile.render === "function"
  ) {
    return Promise.resolve();
  }

  // Reuse an existing loading request.
  if (orderTurnstileScriptPromise) {
    return orderTurnstileScriptPromise;
  }

  orderTurnstileScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");

    script.src =
      "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

    script.async = true;
    script.defer = true;

    script.onload = () => {
      if (
        window.turnstile &&
        typeof window.turnstile.render === "function"
      ) {
        resolve();
      } else {
        reject(
          new Error("Security verification could not load.")
        );
      }
    };
    
    script.onerror = () => {
      script.remove();

      reject(
        new Error("Security verification could not load.")
      );
    };

    document.head.appendChild(script);
  }).catch(error => {
    // Allow another attempt if loading fails.
    orderTurnstileScriptPromise = null;
    throw error;
  });

  return orderTurnstileScriptPromise;
}

/* * Escape text before putting it into HTML. */
function esc(v) {
  return escapeHtml(String(v ?? ""));
}
/** Format money.*/
function money(v) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(v) || 0);
}
/** Render the order review.
 ** Product names/prices come from confirmationSnapshot,
 * which was saved by checkout.js before this page was opened.
 */
function renderReview(data) {
  const products =
    document.getElementById("review-products");
  
const displayProducts =
  Array.isArray(data.confirmationSnapshot)
    ? data.confirmationSnapshot.map(item => ({
        name: String(
          item.name || item.id || "Product"
        ),
        quantity: Number(item.quantity) || 0,
        basePrice: Number(item.basePrice) || 0,
        unitPrice: Number(item.unitPrice) || 0,
        lineTotal: Number(item.lineTotal) || 0,

        // Product GST
        gstRate: Number(item.gst) || 0,

        // Handling details from checkout snapshot
        handlingClass: String(
          item.handlingClass || ""
        ),
        handlingRate:
          item.handlingRate == null
            ? null
            : Number(item.handlingRate),
        handlingAmount:
          Number(item.handlingAmount) || 0,
        handlingGstAmount:
          Number(item.handlingGstAmount) || 0
      }))
    : [];

  
products.innerHTML =
  displayProducts
    .map((p, index) => {
      const productSubtotal = Number(
        (p.basePrice * p.quantity).toFixed(2)
      );

      const productGst = Number(
        (productSubtotal * p.gstRate / 100).toFixed(2)
      );

      const handlingClass =
        p.handlingClass === "ExtraHeavy"
          ? "Extra Heavy"
          : p.handlingClass || "Not recorded";

      const finalLineTotal = Number((
        productSubtotal +
        productGst +
        p.handlingAmount +
        p.handlingGstAmount
      ).toFixed(2));

      const detailId = `review-product-details-${index}`;

      return `
        <div class="review-product review-product-expandable">
          <div class="review-product-info">
            <strong>${esc(p.name)}</strong>
            <small>
              ${p.quantity} units × ${money(p.basePrice)}
            </small>
          </div>

          <div class="review-product-price-wrap">
            <strong>${money(productSubtotal)}</strong>

            <button
              type="button"
              class="review-product-details-toggle"
              aria-expanded="false"
              aria-controls="${detailId}"
            >
              <span class="review-product-toggle-text">
                View details
              </span>
              <span
                class="review-product-toggle-arrow"
                aria-hidden="true"
              >↓</span>
            </button>
          </div>

          <div
            class="review-product-details-shell"
            id="${detailId}"
            aria-hidden="true"
          >
            <div class="review-product-details-inner">
              <div class="review-product-details-panel">
                <div class="review-product-details-heading">
                  Price Breakdown
                </div>

                <div class="review-product-detail-line">
                  <span>Product Subtotal</span>
                  <span>${money(productSubtotal)}</span>
                </div>

                <div class="review-product-detail-line">
                  <span>Product GST (${p.gstRate}%)</span>
                  <span>${money(productGst)}</span>
                </div>

                <div class="review-product-detail-divider"></div>

                <div class="review-product-detail-line">
                  <span>Handling Class</span>
                  <span>${esc(handlingClass)}</span>
                </div>

                <div class="review-product-detail-line">
                  <span>Handling Rate</span>
                  <span>${
                    p.handlingRate === null
                      ? "Not recorded"
                      : `${money(p.handlingRate)} × ${p.quantity}`
                  }</span>
                </div>

                <div class="review-product-detail-line">
                  <span>Handling Charge</span>
                  <span>${money(p.handlingAmount)}</span>
                </div>

                <div class="review-product-detail-line">
                  <span>Handling GST (${p.gstRate}%)</span>
                  <span>${money(p.handlingGstAmount)}</span>
                </div>

                <div class="review-product-detail-divider"></div>

                <div class="review-product-detail-line review-product-detail-total">
                  <span>Total Including GST &amp; Handling</span>
                  <strong>${money(finalLineTotal)}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    })
    .join("") ||
  '<p class="summary-note">No products found.</p>';

  const baseSubTotal =
    Number(
      data.confirmationBaseSubTotal
    ) || 0;
  const gstTotal =
    Number(
      data.confirmationGstTotal
    ) || 0;
  const productTotal =
    Number(
      data.confirmationProductTotal
    ) ||
    (
      baseSubTotal +
      gstTotal
    );
  const handlingCharge =
    Number(data.confirmationHandlingCharge) || 0;
  const handlingGstTotal =
    Number(data.confirmationHandlingGstTotal) || 0;
  const deliveryCharge =
    Number(
      data.confirmationDeliveryCharge
    ) || 0;
  const displayTotal = Number(
    (
      productTotal +
      handlingCharge +
      handlingGstTotal +
      deliveryCharge
    ).toFixed(2)
  );
  const subtotalElement =
    document.getElementById(
      "review-subtotal"
    );
  const gstElement =
    document.getElementById(
      "review-gst"
    );
  const deliveryElement =
    document.getElementById(
      "review-delivery-charge"
    );
  const totalElement =
    document.getElementById(
      "review-total"
    );
  if (subtotalElement) {
    subtotalElement.textContent =
      money(baseSubTotal);
  }
  if (gstElement) {
    gstElement.textContent =
      money(gstTotal);
  }
  const handlingElement =
    document.getElementById("review-handling-charge");
  const handlingGstElement =
    document.getElementById("review-handling-gst");
  if (handlingElement) {
    handlingElement.textContent = money(handlingCharge);
  }
  if (handlingGstElement) {
    handlingGstElement.textContent = money(handlingGstTotal);
  }
  if (deliveryElement) {
    deliveryElement.textContent =
      deliveryCharge === 0
        ? "Free"
        : money(deliveryCharge);
  }
  if (totalElement) {
    totalElement.textContent =
      money(displayTotal);
  }
  document
    .getElementById("review-contact")
    .innerHTML = `
      <div>
        <dt>Full name</dt>
        <dd>${esc(data.name)}</dd>
      </div>
      <div>
        <dt>Email</dt>
        <dd>${esc(data.email)}</dd>
      </div>
      <div>
        <dt>Contact number</dt>
        <dd>${esc(data.phone)}</dd>
      </div>
      ${
        data.alternatePhone
          ? `
            <div>
              <dt>Alternate contact</dt>
              <dd>${esc(data.alternatePhone)}</dd>
            </div>
          `
          : ""
      }
    `;
  const address =
    [
      data.address1,
      data.address2
    ]
      .filter(Boolean)
      .map(esc)
      .join(", ");
  document
    .getElementById("review-address")
    .innerHTML = `
      <div>
        <dt>Address</dt>
        <dd>${address || "—"}</dd>
      </div>
      <div>
        <dt>City</dt>
        <dd>${esc(data.city)}</dd>
      </div>
      <div>
        <dt>State</dt>
        <dd>${esc(data.state)}</dd>
      </div>
      <div>
        <dt>PIN code</dt>
        <dd>${esc(data.pincode)}</dd>
      </div>
      <div>
        <dt>Country</dt>
        <dd>${esc(data.country || "India")}</dd>
      </div>
      ${
        data.landmark
          ? `
            <div>
              <dt>Landmark</dt>
              <dd>${esc(data.landmark)}</dd>
            </div>
          `
          : ""
      }
    `;
  document
    .getElementById("review-payment")
    .textContent =
      data.paymentMethod ||
      "Cash on Delivery";
  const notes =
    String(
      data.notes || ""
    ).trim();
  document
    .getElementById("review-notes")
    .textContent =
      notes ||
      "No special instructions.";
}
/*
 * Clear the customer's local order/cart data.
 *
 * This is called only after the order has been
 * confirmed as successfully submitted.
 */
function clearCompletedOrder() {
  sessionStorage.removeItem(
    "bloomPodPendingOrder"
  );
  localStorage.removeItem(
    "bloomPodCart"
  );
  /*
   * Update the cart badge immediately.
   */
  if (
    typeof updateCartCount === "function"
  ) {
    updateCartCount();
  }
  /*
   * Safety:
   * force all visible cart-count elements to zero
   * even if the shared cart-count function changes.
   */
  document
    .querySelectorAll(".cart-count")
    .forEach(el => {
      el.textContent = "0";
    });
}
/*
 * Show the successful-order popup.
 */

/* Mask the customer's checkout email. */
function maskOrderEmail(email) {
  const value = String(email || "").trim();
  const atIndex = value.lastIndexOf("@");

  if (atIndex <= 0) return "—";

  const local = value.slice(0, atIndex);
  const domain = value.slice(atIndex);

  if (local.length <= 2) {
    return local.slice(0, 1) + "****" + domain;
  }

  if (local.length <= 4) {
    return local.slice(0, 1) + "****" +
      local.slice(-1) + domain;
  }

  return local.slice(0, 2) + "****" +
    local.slice(-2) + domain;
}

/* Show the successful-order popup. */
function showOrderSuccessPopup(orderId, email) {
  const modal = document.getElementById(
    "order-success-modal"
  );

  if (!modal) {
    window.location.href = "index.html";
    return;
  }

  successfulOrderId = String(orderId || "").trim();

  const numberElement = document.getElementById(
    "order-success-number"
  );

  const emailElement = document.getElementById(
    "order-success-email"
  );

  const homeButton = document.getElementById(
    "order-success-home"
  );

  const trackButton = document.getElementById(
    "order-success-track"
  );

  if (numberElement) {
    numberElement.textContent = successfulOrderId || "—";
  }

  if (emailElement) {
    emailElement.textContent = maskOrderEmail(email);
  }

  if (trackButton) {
    trackButton.disabled = !successfulOrderId;
  }

  modal.hidden = false;
  modal.setAttribute("aria-hidden", "false");

  document.body.classList.add(
    "order-success-open"
  );

  if (homeButton) {
    homeButton.focus();
  }
}

/* Finish a successfully created order. */
function finishSuccessfulOrder(orderId, email) {
  if (orderSubmissionFinished) return;

  orderSubmissionFinished = true;

  const button = document.getElementById(
    "place-order-btn"
  );

  if (button) {
    button.disabled = true;
    button.textContent = "Order placed";
  }

    try {
    clearCompletedOrder();
  } catch (cleanupError) {
    if (!ENABLE_SECURE_CHECKOUT) {
      throw cleanupError;
    }

    console.error(
      "Unable to clear completed order data:",
      cleanupError
    );
  }

  hideOrderProcessingOverlay();

  showOrderSuccessPopup(orderId, email);
}
/*
 * Show an order error and restore the button.
 */
function showOrderError(message) {
  if (orderSubmissionFinished) {
    return;
  }
  
  hideOrderProcessingOverlay();

  const error =
    document.getElementById(
      "review-error"
    );
  const button =
    document.getElementById(
      "place-order-btn"
    );
if (error) {
  error.textContent =
    message ||
    "Could not place your order. Please try again.";
  error.hidden = false;
  // Make the error accessible to keyboard users.
  error.setAttribute("tabindex", "-1");
  error.setAttribute("role", "alert");
  // Scroll to the error message.
  window.scrollTo({
  top: 300,
  left: 0,
  behavior: "smooth"
});
  // Focus without changing the scroll position.
  error.focus({
    preventScroll: true
  });
}
    if (button) {
    button.disabled = false;
    button.textContent = "Place order";

    /*
     * Secure checkout must respect the current
     * Turnstile verification state after errors.
     *
     * Existing checkout remains unchanged while
     * ENABLE_SECURE_CHECKOUT is false.
     */
    updateSecureOrderButtonState();
  }
}
async function verifyReviewProducts(data) {
  const items = Array.isArray(data?.confirmationSnapshot)
    ? data.confirmationSnapshot
    : [];
  if (!items.length) {
    throw new Error(
      "No products found. Please return to checkout."
    );
  }
  const ids = [...new Set(
    items.map(item => String(item.id || "").trim())
  )];
  if (
    ids.some(id => !id) ||
    items.some(item =>
      !Number.isSafeInteger(Number(item.quantity)) ||
      Number(item.quantity) <= 0
    )
  ) {
    throw new Error(
      "Invalid cart contents. Please return to your cart."
    );
  }
  const { data: products, error } =
    await window.bpSupabase
      .from("products")
      .select(
        "id, name, available, offline_purchase_only, is_published, " +
        "min_qty, available_units, max_quantity_allowed"
      )
      .in("id", ids);
  if (error || !Array.isArray(products)) {
    throw new Error(
      "Unable to verify your products. Please try again."
    );
  }
  const productMap = new Map(
    products.map(product => [
      String(product.id),
      product
    ])
  );
  for (const item of items) {
    const product = productMap.get(String(item.id));
    if (product && product.is_published === false) {
      throw new Error(
        `${product.name} is no longer available. Please return to your cart.`
      );
    }
    if (!product || product.available === false) {
      throw new Error(
        `${product?.name || "A product"} is no longer available. Please return to your cart.`
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
        `${product.name} requires a minimum purchase of ${minimum} units. Please return to your cart.`
      );
    }
    if (quantity > stock) {
      throw new Error(
        `${product.name}: only ${stock} units are available. Please return to your cart.`
      );
    }
    if (quantity > maximum) {
      throw new Error(
        `${product.name}: maximum ${maximum} units allowed per cart. Please return to your cart.`
      );
    }
  }
  return true;
}
function isSuccessfulOrderResponse(response) {
  return (
    response?.success === true &&
    response?.verified === true &&
    response?.order_created === true &&
    typeof response?.order?.order_id === "string" &&
    response.order.order_id.trim().length > 0 &&
    typeof response.order.total === "number" &&
    Number.isFinite(response.order.total) &&   
    response.order.total > 0 &&
    typeof response.order.duplicate === "boolean"
  );
}
function createUncertainOrderError() {
  const error = new Error(
    "We couldn't confirm your order. " +
    "Please check your order status before trying again."
  );

  error.orderOutcomeUncertain = true;

  return error;
}

function extractSecureOrder(response) {
  if (!isSuccessfulOrderResponse(response)) {
    throw createUncertainOrderError();
  }

  return {
    order_id: response.order.order_id.trim(),
    total: response.order.total,
    duplicate: response.order.duplicate
  };
}
function buildSecureOrderRequest(data, turnstileToken) {
  // The secure order gateway currently supports COD only.
  // Never silently convert an Online checkout into COD.
  const paymentMethod = String(
    data?.paymentMethod || "Cash on Delivery"
  ).trim();
  if (paymentMethod !== "Cash on Delivery") {
    throw new Error(
      "Online payment is not supported by the secure order gateway yet."
    );
  }
  // Require a Turnstile token before building the request.
  if (
    typeof turnstileToken !== "string" ||
    !turnstileToken.trim() ||
    turnstileToken.length > 2048
  ) {
    throw new Error(
      "Security verification is required. Please complete the verification and try again."
    );
  }
  const items = Array.isArray(data?.confirmationSnapshot)
  ? data.confirmationSnapshot.map(item => ({
      id:
        typeof item?.id === "string" ||
        (
          typeof item?.id === "number" &&
          Number.isSafeInteger(item.id) &&
          item.id > 0
        )
          ? String(item.id || "").trim()
          : "",
      quantity:
        typeof item?.quantity === "number" ||
        typeof item?.quantity === "string"
          ? Number(item.quantity)
          : NaN
    }))
  : [];
  // Validate the cart before building the secure request.
  if (
    items.length < 1 ||
    items.length > 50 ||
    items.some(item =>
      !item.id ||
      item.id.length > 100 ||
      !Number.isSafeInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > 100000
    ) ||
    new Set(items.map(item => item.id)).size !== items.length
  ) {
    throw new Error(
      "Invalid cart contents. Please return to your cart and try again."
    );
  }
  const idempotencyKey = String(
    data?.idempotencyKey ||
    data?.orderIdempotencyKey ||
    ""
  ).trim();
  // Require a valid idempotency key for safe retries.
  if (!/^[A-Za-z0-9._:-]{12,100}$/.test(idempotencyKey)) {
    throw new Error(
      "Order reference is missing or invalid. Please return to checkout and try again."
    );
  }
  return {
    turnstile_token: turnstileToken,
    customer_name: String(data?.name || "").trim(),
    email: String(data?.email || "").trim(),
    phone: String(data?.phone || "").trim(),
    alternate_phone: String(data?.alternatePhone || "").trim(),
    address1: String(data?.address1 || "").trim(),
    address2: String(data?.address2 || "").trim(),
    city: String(data?.city || "").trim(),
    landmark: String(data?.landmark || "").trim(),
    pincode: String(data?.pincode || "").trim(),
    notes: String(data?.notes || "").trim(),
    payment_method: "Cash on Delivery",
    idempotency_key: idempotencyKey,
    items
  };
}
async function submitSecureOrderRequest(
  data,
  turnstileToken,
  invokeFunction = null
) {
    if (!window.bpSupabase && !invokeFunction) {
    clearSecureOrderSubmissionPending();

    throw new Error(
      "Order service is unavailable. Please try again."
    );
  }
  const request = buildSecureOrderRequest(
    data,
    turnstileToken
  );
  const invoke = invokeFunction ||
    ((name, options) =>
      window.bpSupabase.functions.invoke(name, options));
  let response;
  let error;
  try {
    const result = await invoke(
      "create-customer-order",
      {
        body: request
      }
    );
    response = result.data;
    error = result.error;
    } catch (networkError) {
    console.error(
      "Secure order network failure:",
      networkError
    );

    throw createUncertainOrderError();
  }
  if (error) {
    console.error("Secure order request failed:", error);
    const status = error.context?.status ?? null;
    // Recognize the gateway's explicit security hold.
    // Do not assume all HTTP 503 responses mean no order was created.
    if (
      status === 503 &&
      error.context instanceof Response
    ) {
      let errorBody = null;

      try {
        errorBody = await error.context.clone().json();
      } catch {
        // Keep the generic error if the response cannot be read.
      }

            if (
        errorBody?.success === false &&
        errorBody?.order_created === false &&
        errorBody?.error ===
          "Order security verification unavailable."
      ) {
        clearSecureOrderSubmissionPending();

        throw new Error(
          "Order placement is temporarily unavailable. No order was placed. Please try again later."
        );
      }
    }
    // A 403 response alone does not prove that no order
    // was created. Require an explicit backend confirmation.
    if (status === 403) {
      let errorBody = null;

      if (error.context instanceof Response) {
        try {
          errorBody = await error.context.clone().json();
        } catch {
          // An unreadable response has an uncertain outcome.
        }
      }

      if (
        errorBody?.success === false &&
        errorBody?.order_created === false
      ) {
        clearSecureOrderSubmissionPending();

        throw new Error(
          "Security verification failed. Please complete the verification again."
        );
      }

      throw createUncertainOrderError();
    }
        // A 400 or 413 response alone does not prove that
    // no order was created. Require explicit confirmation.
    if (status === 400 || status === 413) {
      let errorBody = null;

      if (error.context instanceof Response) {
        try {
          errorBody = await error.context.clone().json();
        } catch {
          // An unreadable response has an uncertain outcome.
        }
      }

      if (
        errorBody?.success === false &&
        errorBody?.order_created === false
      ) {
        clearSecureOrderSubmissionPending();

        throw new Error(
          "Some order details could not be accepted. Please review your information."
        );
      }

      throw createUncertainOrderError();
    }
    // Other failures may have an uncertain outcome.
    throw createUncertainOrderError();
  }
  return extractSecureOrder(response);
}
/*
 * ============================================================
 * BLOOM & POD — ORDER CONFIRMATION EMAIL
 * ============================================================
 *
 * LAYER 1: Secure checkout transition.
 *
 * This function sends the existing order confirmation
 * email after the database has confirmed an order.
 *
 * It will be shared by:
 * - Current direct RPC checkout (temporary).
 * - Secure Edge Function checkout (after cutover).
 *
 * Email failures must not change the status of an order
 * that has already been successfully created.
 *
 * SECURITY:
 * Never call this function using an unconfirmed order ID.
 *
 * Layer 3: Rate limiting postponed.
 * ============================================================
 */

async function sendOrderConfirmationEmail(
  orderId,
  idempotencyKey
) {
  try {
    const {
      data: confirmationData,
      error: confirmationError
    } = await window.bpSupabase.functions.invoke(
      "order-confirmation",
      {
        body: {
          orderId,
          idempotencyKey
        }
      }
    );

    if (confirmationError) {
      console.error(
        "Automatic confirmation email failed:",
        confirmationError
      );
    }

    if (
      confirmationData &&
      confirmationData.success === false
    ) {
      console.error(
        "Automatic confirmation email failed:",
        confirmationData.error
      );
    }

  } catch (confirmationErr) {
    console.error(
      "Automatic confirmation email failed:",
      confirmationErr
    );
  }
}
async function submitOrderToSupabase(data) {
  /*
   * BLOOM & POD — PAYMENT METHOD SAFETY
   *
   * This legacy RPC pathway supports COD only.
   * Online payments must use a separate Razorpay
   * backend with verified payment finalization.
   *
   * Never create an Online order through this RPC.
   */

  const paymentMethod = String(
    data?.paymentMethod || "Cash on Delivery"
  ).trim();

  if (paymentMethod !== "Cash on Delivery") {
    throw new Error(
      "Online payment is not available yet. Please select Cash on Delivery."
    );
  }

  await verifyReviewProducts(data);
  const items =
    Array.isArray(data.confirmationSnapshot)
      ? data.confirmationSnapshot.map(item => ({
          id: String(item.id || "").trim(),
          quantity: Number(item.quantity) || 0
        }))
      : [];
  if (!items.length) {
    throw new Error(
      "No valid products were found in this order."
    );
  }
  const idempotencyKey =
    String(
      data.idempotencyKey ||
      data.orderIdempotencyKey ||
      ""
    ).trim();
  if (!idempotencyKey) {
    throw new Error(
      "Order reference is missing. Please return to checkout and try again."
    );
  }
  const { data: result, error } =
    await window.bpSupabase.rpc(
      "place_order",
      {
        input_customer_name:
          String(data.name || "").trim(),
        input_email:
          String(data.email || "").trim(),
        input_phone:
          String(data.phone || "").trim(),
        input_alternate_phone:
          String(data.alternatePhone || "").trim(),
        input_address1:
          String(data.address1 || "").trim(),
        input_address2:
          String(data.address2 || "").trim(),
        input_city:
          String(data.city || "").trim(),
        input_landmark:
          String(data.landmark || "").trim(),
        input_pincode:
          String(data.pincode || "").trim(),
        input_notes:
          String(data.notes || "").trim(),
        input_payment_method:
          String(
            data.paymentMethod ||
            "Cash on Delivery"
          ).trim(),
        input_idempotency_key:
          idempotencyKey,
        input_items:
          items
      }
    );
if (error) {
  console.error(
    "Supabase order submission failed:",
    error
  );
  const message = String(error.message || "");
  if (message.includes("is unpublished and cannot be purchased online")) {
    throw new Error(
      "One or more products are no longer available. Please return to your cart and remove them before placing your order."
    );
  }
  if (
    message.includes(
      "available in-store only and cannot be purchased online"
    )
  ) {
    throw new Error(
      "One or more products are available in-store only. " +
      "Please return to your cart and remove them before placing your order."
    );
  }
  throw new Error(
    "Could not place your order. Please review your details and try again."
  );
}
  const order =
  Array.isArray(result)
    ? result[0]
    : result;
if (!order || !order.order_id) {
  throw new Error(
    "The order was not created correctly."
  );
}
/*
 * Send the confirmation email using the shared helper.
 * This preserves the existing checkout behaviour.
 */
await sendOrderConfirmationEmail(
  order.order_id,
  idempotencyKey
);
return order;
}
/*
 * ============================================================
 * BLOOM & POD — LAYER 1 & 2 ORDER SUBMISSION ROUTER
 * ============================================================
 *
  * STATUS: ROUTER CONNECTED — SECURE CHECKOUT NOT ACTIVE
 *
 * The Place Order button now uses submitCustomerOrder().
 * The existing direct RPC remains active because
 * ENABLE_SECURE_CHECKOUT is false.
 *
 * The secure gateway pathway must not be activated until
 * backend deployment, verification and cutover checks pass.
 *
 * ENABLE_SECURE_CHECKOUT = false:
 *   Use the existing direct database RPC.
 *
 * ENABLE_SECURE_CHECKOUT = true:
 *   Use Cloudflare Turnstile and the protected Edge Function.
 *
 * IMPORTANT:
 * Do not activate secure checkout until the backend gateway
 * is deployed, verified, and ready to create real orders.
 *
 * The same idempotency key must be preserved across retries.
 *
 * Layer 3: Rate limiting postponed.
 * Layer 4: Network protection postponed until launch.
 * ============================================================
 */

async function submitCustomerOrder(data) {
  if (!ENABLE_SECURE_CHECKOUT) {
    return await submitOrderToSupabase(data);
  }

    /*
   * Secure gateway path.
   * Do not silently fall back to the direct database RPC.
   */

  // Do not attempt another secure submission while a
  // previous attempt is still pending or uncertain.
  if (orderOutcomeUncertain || hasUncertainPendingOrder()) {
    throw new Error(
      "We couldn't confirm your previous order. " +
      "Please check your order status before trying again."
    );
  }

  await verifyReviewProducts(data);

  if (
    typeof orderTurnstileToken !== "string" ||
    !orderTurnstileToken.trim()
  ) {
    throw new Error(
      "Please complete the security verification before placing your order."
    );
  }

    const idempotencyKey = String(
    data?.idempotencyKey ||
    data?.orderIdempotencyKey ||
    ""
  ).trim();

    // Validate locally before recording a submission attempt.
  // This does not contact Supabase or create an order.
  buildSecureOrderRequest(data, orderTurnstileToken);

  // Ensure the order gateway client is available before
  // recording a potentially irreversible submission attempt.
  if (
    !window.bpSupabase ||
    typeof window.bpSupabase.functions?.invoke !== "function"
  ) {
    throw new Error(
      "Order service is unavailable. Please try again."
    );
  }

  try {
    if (!markSecureOrderSubmissionPending()) {
      throw new Error(
        "Unable to safely prepare your order. " +
        "Please refresh the page and try again."
      );
    }

        const order = await submitSecureOrderRequest(
      data,
      orderTurnstileToken
    );

        // The backend has already confirmed order creation.
    // A local storage failure must not turn success into failure.
    try {
      const confirmedPending = pendingOrder();

      if (confirmedPending) {
        confirmedPending.savedOrderId = order.order_id;
        confirmedPending.savedOrderTotal = Number(order.total || 0);

        sessionStorage.setItem(
          "bloomPodPendingOrder",
          JSON.stringify(confirmedPending)
        );
      }
    } catch (storageError) {
      console.error(
        "Unable to save confirmed order details locally:",
        storageError
      );
    }

    await sendOrderConfirmationEmail(
      order.order_id,
      idempotencyKey
    );

    return order;

    } finally {
    /*
     * Turnstile tokens are single-use.
     * Reset after each secure submission attempt.
     * A retry must obtain a new token.
     *
     * Widget reset errors must never override
     * the actual order submission result.
     */
    try {
      resetOrderTurnstile();
        } catch (resetError) {
      clearOrderTurnstileToken();

      console.error(
        "Unable to reset order security verification:",
        resetError
      );

      try {
        updateSecureOrderButtonState();
      } catch (buttonError) {
        console.error(
          "Unable to refresh secure order button state:",
          buttonError
        );
      }
    }
  }
}
/*
 * ============================================================
 * BLOOM & POD — RAZORPAY CHECKOUT REQUEST PREPARATION
 * ============================================================
 *
 * Development only. No network requests.
 *
 * The backend will independently verify products,
 * quantities, prices, GST, handling and delivery.
 *
 * Checkout token and Razorpay-specific Turnstile token
 * will be handled separately before API integration.
 * ============================================================
 */

function buildRazorpayCheckoutCustomerDraft(data) {
  if (!isOnlinePayment(data)) {
    throw new Error(
      "Razorpay checkout requires Online payment."
    );
  }

  const snapshot = data?.confirmationSnapshot;

  if (
    !Array.isArray(snapshot) ||
    snapshot.length < 1 ||
    snapshot.length > 50
  ) {
    throw new Error(
      "Invalid checkout products."
    );
  }

  const items = snapshot.map(item => {
    const id = String(item?.id ?? "").trim();
    const quantity = Number(item?.quantity);

    if (
      !id ||
      id.length > 100 ||
      !Number.isSafeInteger(quantity) ||
      quantity < 1 ||
      quantity > 100000
    ) {
      throw new Error(
        "Invalid Razorpay checkout item."
      );
    }

    return {
      id,
      quantity
    };
  });

  if (
    new Set(items.map(item => item.id)).size !==
    items.length
  ) {
    throw new Error(
      "Duplicate products in Razorpay checkout."
    );
  }

  return {
    customer_name: String(data.name || "").trim(),
    email: String(data.email || "").trim(),
    phone: String(data.phone || "").trim(),
    alternate_phone: String(
      data.alternatePhone || ""
    ).trim(),
    address1: String(data.address1 || "").trim(),
    address2: String(data.address2 || "").trim(),
    city: String(data.city || "").trim(),
    landmark: String(data.landmark || "").trim(),
    pincode: String(data.pincode || "").trim(),
    notes: String(data.notes || "").trim(),
    items
  };
}
/*
 * ============================================================
 * BLOOM & POD — RAZORPAY CHECKOUT TOKEN
 * ============================================================
 *
 * Generates 32 cryptographically random bytes, encoded as
 * a 64-character lowercase hexadecimal token.
 *
 * Preserves the token across page refreshes for safe retries.
 *
 * The backend must hash and bind this token to the actual
 * pending checkout and Razorpay order.
 *
 * This token is NOT proof of payment.
 *
 * RAZORPAY ACTIVATION: DISABLED
 * ============================================================
 */

const RAZORPAY_CHECKOUT_TOKEN_STORAGE_KEY =
  "bloomPodRazorpayCheckoutTokenV1";

function getOrCreateRazorpayCheckoutToken(data) {
  if (!isOnlinePayment(data)) {
    throw new Error(
      "Razorpay checkout requires Online payment."
    );
  }

  const idempotencyKey = String(
    data?.idempotencyKey ||
    data?.orderIdempotencyKey ||
    ""
  ).trim();

  if (!/^[A-Za-z0-9._:-]{12,100}$/.test(idempotencyKey)) {
    throw new Error(
      "Invalid checkout reference. Please return to checkout."
    );
  }

  const saved = sessionStorage.getItem(
    RAZORPAY_CHECKOUT_TOKEN_STORAGE_KEY
  );

  if (saved !== null) {
    let existing;

    try {
      existing = JSON.parse(saved);
    } catch {
      throw new Error(
        "Previous checkout reference could not be restored."
      );
    }

    if (
      existing?.idempotencyKey !== idempotencyKey ||
      typeof existing?.checkoutToken !== "string" ||
      !/^[0-9a-f]{64}$/.test(existing.checkoutToken)
    ) {
      throw new Error(
        "A previous online checkout reference needs review before retrying."
      );
    }

    return existing.checkoutToken;
  }

  if (
    !window.crypto ||
    typeof window.crypto.getRandomValues !== "function"
  ) {
    throw new Error(
      "Secure checkout token generation is unavailable."
    );
  }

  const randomBytes = new Uint8Array(32);

  window.crypto.getRandomValues(randomBytes);

  const checkoutToken = Array.from(
    randomBytes,
    byte => byte.toString(16).padStart(2, "0")
  ).join("");

  sessionStorage.setItem(
    RAZORPAY_CHECKOUT_TOKEN_STORAGE_KEY,
    JSON.stringify({
      idempotencyKey,
      checkoutToken
    })
  );

  return checkoutToken;
}
/*
 * ============================================================
 * BLOOM & POD — RAZORPAY INITIATION REQUEST BUILDER
 * ============================================================
 *
 * Development only.
 *
 * Combines:
 * - Customer and product information
 * - Stable checkout token
 * - Razorpay-specific Turnstile token
 *
 * Does NOT:
 * - Calculate or submit payment amounts
 * - Contact Supabase or Razorpay
 * - Create an order
 * - Activate online payments
 *
 * The backend must independently verify the request,
 * Turnstile token, inventory and payable amount.
 * ============================================================
 */

function buildRazorpayCheckoutInitiationRequest(
  data,
  turnstileToken
) {
    // Step 1: Validate and prepare customer information.
  const draft = buildRazorpayCheckoutCustomerDraft(data);

  // Validate customer details before generating a
  // persistent Razorpay checkout token.
  const validText = (value, maxLength, required = true) =>
    typeof value === "string" &&
    value.trim().length <= maxLength &&
    (!required || value.trim().length > 0);

  const requiredLimits = {
    customer_name: 100,
    email: 160,
    phone: 25,
    address1: 250,
    city: 100,
    pincode: 6
  };

  const optionalLimits = {
    alternate_phone: 30,
    address2: 250,
    landmark: 150,
    notes: 500
  };

  if (
    Object.entries(requiredLimits).some(
      ([field, limit]) => !validText(draft[field], limit)
    ) ||
    Object.entries(optionalLimits).some(
      ([field, limit]) =>
        !validText(draft[field], limit, false)
    ) ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      draft.email.trim()
    ) ||
    !/^[0-9+()\s-]{7,25}$/.test(
      draft.phone.trim()
    ) ||
    !/^(?:\+?91|0)?[6-9][0-9]{9}$/.test(
      draft.phone.replace(/[()\s-]/g, "")
    ) ||
    !/^[0-9]{6}$/.test(draft.pincode.trim())
  ) {
    throw new Error(
      "Invalid online checkout customer details. Please return to checkout and review your information."
    );
  }

  // Step 2: Require a Razorpay-specific security token.
  if (
    typeof turnstileToken !== "string" ||
    !turnstileToken.trim() ||
    turnstileToken.length > 2048
  ) {
    throw new Error(
      "Razorpay security verification is required."
    );
  }

  // Step 3: Retrieve the stable checkout token.
  const checkoutToken =
    getOrCreateRazorpayCheckoutToken(data);

  // Step 4: Assemble the backend request.
  return {
    ...draft,
    checkout_token: checkoutToken,
    turnstile_token: turnstileToken.trim()
  };
}
/*
 * ============================================================
 * BLOOM & POD — RAZORPAY VERIFIED REQUEST PREPARATION
 * ============================================================
 *
 * Connects the dedicated Razorpay Turnstile token to
 * the existing checkout initiation request builder.
 *
 * Never use the COD Turnstile token for Razorpay.
 *
 * This function does not contact Supabase or Razorpay.
 *
 * STATUS: DEVELOPMENT ONLY — DISABLED
 * ============================================================
 */

function prepareRazorpayCheckoutRequest(data) {

  // Gate 1: Razorpay must be explicitly enabled.
  if (!ENABLE_RAZORPAY_ONLINE_CHECKOUT) {
    clearRazorpayTurnstileToken();

    throw new Error(
      "Online payments are not available yet."
    );
  }

  // Gate 2: Require Online payment selection.
  if (!isOnlinePayment(data)) {
    throw new Error(
      "Razorpay checkout requires Online payment."
    );
  }

  // Gate 3: Require the dedicated Razorpay token.
  // Never substitute the existing COD Turnstile token.
  if (
    typeof razorpayTurnstileToken !== "string" ||
    !razorpayTurnstileToken.trim() ||
    razorpayTurnstileToken.length > 2048
  ) {
    throw new Error(
      "Please complete Razorpay security verification."
    );
  }

  // Gate 4: Build the checkout initiation request.
  // Product pricing and payment amount are NOT supplied
  // by the browser.
  return buildRazorpayCheckoutInitiationRequest(
    data,
    razorpayTurnstileToken
  );
}
function isOnlinePayment(data) {
  return String(
    data &&
    data.paymentMethod ||
    ""
  ).trim() === "Online";
}
function configurePaymentActions(data) {
  const paymentButton = document.getElementById(
    "complete-payment-btn"
  );

  const placeOrderButton = document.getElementById(
    "place-order-btn"
  );

  // Online payment is not connected yet.
  // Never trust browser-stored payment success flags.
  if (paymentButton) {
    paymentButton.hidden = true;
    paymentButton.disabled = true;
  }

  if (!placeOrderButton) return;

  if (isOnlinePayment(data)) {
    placeOrderButton.disabled = true;
  }

  // For COD, preserve the existing Turnstile button logic.
}

/*
 * ============================================================
 * BLOOM & POD — RAZORPAY PAYMENT ENTRY POINT
 * ============================================================
 *
 * Separate from the existing COD order submission.
 *
 * No payment requests are made until the dedicated
 * Razorpay backend and verification flow are connected.
 *
 * DEVELOPMENT STATUS: DISABLED
 * ============================================================
 */
/*
 * BLOOM & POD — RAZORPAY INITIALIZATION RESPONSE
 *
 * Classifies the backend's public response.
 * Does not open Razorpay, create an order, or
 * treat payment initialization as payment success.
 */

function classifyRazorpayInitializationResponse(
  httpStatus,
  body
) {
  const pending = {
    kind: "pending_review"
  };

  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body)
  ) {
    return pending;
  }

  if (
    httpStatus === 200 &&
    body.success === true &&
    body.status === "payment_ready"
  ) {
    const checkout = body.checkout;

    if (
      !checkout ||
      typeof checkout !== "object" ||
      Array.isArray(checkout)
    ) {
      return pending;
    }

    const expiry = Date.parse(
      checkout.reservation_expires_at
    );

    const valid =
      /^rzp_test_[A-Za-z0-9]+$/.test(
        checkout.key_id
      ) &&
      /^order_[A-Za-z0-9]+$/.test(
        checkout.order_id
      ) &&
      Number.isSafeInteger(
        checkout.amount_paise
      ) &&
      checkout.amount_paise >= 100 &&
      checkout.currency === "INR" &&
      checkout.name === "Bloom & Pod" &&
      Number.isFinite(expiry) &&
      expiry - Date.now() >= 60000;

    if (!valid) {
      return pending;
    }

    return {
      kind: "payment_ready",
      checkout: {
        key_id: checkout.key_id,
        order_id: checkout.order_id,
        amount_paise: checkout.amount_paise,
        currency: "INR",
        name: "Bloom & Pod",
        reservation_expires_at:
          checkout.reservation_expires_at
      }
    };
  }

  if (
    httpStatus === 202 &&
    body.success === false &&
    body.status === "payment_initialization_pending"
  ) {
    return pending;
  }

  if (
    httpStatus === 409 &&
    body.success === false &&
    body.status === "checkout_unavailable"
  ) {
    return {
      kind: "checkout_unavailable"
    };
  }

  if (
    httpStatus === 503 &&
    body.success === false &&
    body.status === "online_payment_unavailable"
  ) {
    return {
      kind: "online_payment_unavailable"
    };
  }

  // Unknown responses never authorize checkout.
  return pending;
}
/*
 * ============================================================
 * BLOOM & POD — RAZORPAY HTTP RESPONSE HANDLER
 * ============================================================
 *
 * Development only.
 *
 * Reads a received HTTP response and passes it through
 * the existing fail-closed Razorpay response classifier.
 *
 * Does NOT:
 * - Send a network request
 * - Open Razorpay Checkout
 * - Create or finalize an order
 * - Treat payment initialization as payment success
 *
 * STATUS: RAZORPAY DISABLED
 * ============================================================
 */

async function readRazorpayInitializationHttpResponse(response) {
  const pending = {
    kind: "pending_review"
  };

  // Require a real Fetch API Response object.
  if (!(response instanceof Response)) {
    return pending;
  }

  const allowedStatuses = new Set([
    200,
    202,
    409,
    503
  ]);

  if (!allowedStatuses.has(response.status)) {
    return pending;
  }

  let body;

  try {
    // Clone so the original response is not consumed.
    body = await response.clone().json();
  } catch {
    // Invalid, unreadable, or already-consumed response.
    return pending;
  }

  return classifyRazorpayInitializationResponse(
    response.status,
    body
  );
}
/*
 * ============================================================
 * BLOOM & POD — RAZORPAY SUPABASE RESPONSE ADAPTER
 * ============================================================
 *
 * Interprets the result of a Supabase Edge Function
 * invocation while preserving HTTP status information.
 *
 * Does NOT:
 * - Invoke any Edge Function
 * - Initiate payment
 * - Retry uncertain requests
 * - Finalize a customer order
 *
 * Missing or ambiguous HTTP status fails closed.
 *
 * RAZORPAY STATUS: DISABLED
 * ============================================================
 */

async function interpretRazorpaySupabaseInvokeResult(result) {
  const pending = {
    kind: "pending_review"
  };

  if (
    !result ||
    typeof result !== "object" ||
    Array.isArray(result)
  ) {
    return pending;
  }

  // A Supabase invocation error must never authorize
  // opening Razorpay Checkout.
  if (result.error) {
    const errorResponse = result.error.context;

    if (!(errorResponse instanceof Response)) {
      // Network, relay, timeout, or unknown failure.
      return pending;
    }

    // Only explicitly recognized rejection statuses
    // may be interpreted from the error response.
    if (
      errorResponse.status !== 409 &&
      errorResponse.status !== 503
    ) {
      return pending;
    }

    return await readRazorpayInitializationHttpResponse(
      errorResponse
    );
  }

  // The HTTP status must be available independently
  // of the JSON response body.
  //
  // Do not infer HTTP 200 merely because
  // Supabase returned error: null.
  const response = result.response;

  if (!(response instanceof Response)) {
    return pending;
  }

  if (
    response.status !== 200 &&
    response.status !== 202
  ) {
    return pending;
  }

  // Supabase has already parsed the JSON response.
  // Use its parsed data together with the actual
  // HTTP status rather than rereading the body.
  return classifyRazorpayInitializationResponse(
    response.status,
    result.data
  );
}
/*
 * ============================================================
 * BLOOM & POD — RAZORPAY INITIALIZATION OUTCOME
 * ============================================================
 *
 * Converts the classified backend response into a
 * safe frontend decision.
 *
 * Does not open Razorpay Checkout, retry requests,
 * capture payments, or finalize customer orders.
 *
 * STATUS: DEVELOPMENT ONLY — RAZORPAY DISABLED
 * ============================================================
 */

function resolveRazorpayInitializationOutcome(result) {

    // A payment-ready response is NOT payment success.
  if (result?.kind === "payment_ready") {

    // Recheck the checkout structure before retaining it.
    // This is format validation, NOT payment verification.
    const validated =
      classifyRazorpayInitializationResponse(
        200,
        {
          success: true,
          status: "payment_ready",
          checkout: result.checkout
        }
      );

    // Missing, invalid or expired checkout details
    // must never authorize opening Razorpay Checkout.
    if (validated.kind !== "payment_ready") {
      return {
        action: "check_existing_checkout",
        message:
          "The payment initialization details could not be confirmed. Please check the existing checkout before trying again.",
        paymentConfirmed: false,
        automaticRetryAllowed: false
      };
    }

    return {
      action: "await_checkout_activation",
      message:
        "The payment session is prepared, but online checkout is not activated.",

      // Retain only the fields approved by the classifier.
      checkout: {
        ...validated.checkout
      },

      paymentConfirmed: false,
      automaticRetryAllowed: false
    };
  }

  // A pending response may represent an operation
  // whose result has not yet been confirmed.
  if (result?.kind === "pending_review") {
    return {
      action: "check_existing_checkout",
      message:
        "We could not confirm the payment initialization. Please check the existing checkout status before trying again.",
      paymentConfirmed: false,
      automaticRetryAllowed: false
    };
  }

  if (result?.kind === "checkout_unavailable") {
    return {
      action: "return_to_checkout",
      message:
        "This checkout is unavailable. Please review your order before continuing.",
      paymentConfirmed: false,
      automaticRetryAllowed: false
    };
  }

  if (result?.kind === "online_payment_unavailable") {
    return {
      action: "service_unavailable",
      message:
        "Online payment is temporarily unavailable. Please try again later.",
      paymentConfirmed: false,
      automaticRetryAllowed: false
    };
  }

  // Unknown responses must fail closed.
  return {
    action: "check_existing_checkout",
    message:
      "The payment initialization result could not be confirmed.",
    paymentConfirmed: false,
    automaticRetryAllowed: false
  };
}
/*
 * ============================================================
 * BLOOM & POD — RAZORPAY CHECKOUT POPUP OPTIONS
 * ============================================================
 *
 * Converts validated payment initialization details
 * into Razorpay Standard Checkout configuration.
 *
 * No payment handler is attached.
 * No Razorpay popup is opened.
 * No SDK is loaded.
 *
 * This is format validation, not proof that the
 * backend authorized or completed a payment.
 *
 * STATUS: DEVELOPMENT ONLY — DISABLED
 * ============================================================
 */

function buildRazorpayCheckoutPopupOptions(outcome) {

  // Only a recognized initialization outcome is accepted.
  if (
    !outcome ||
    outcome.action !== "await_checkout_activation" ||
    outcome.paymentConfirmed !== false ||
    outcome.automaticRetryAllowed !== false
  ) {
    throw new Error(
      "Razorpay checkout initialization is not ready."
    );
  }

  // Revalidate all checkout details, including expiration.
  const validated =
    classifyRazorpayInitializationResponse(
      200,
      {
        success: true,
        status: "payment_ready",
        checkout: outcome.checkout
      }
    );

  if (validated.kind !== "payment_ready") {
    throw new Error(
      "Razorpay checkout details are invalid or expired."
    );
  }

  const checkout = validated.checkout;

  // Use only the amount supplied by the backend.
  // amount_paise maps directly to Razorpay's amount.
  return Object.freeze({
    key: checkout.key_id,
    order_id: checkout.order_id,
    amount: checkout.amount_paise,
    currency: checkout.currency,
    name: checkout.name,
    description: "Bloom & Pod online order"
  });
}
/*
 * ============================================================
 * BLOOM & POD — RAZORPAY POPUP AVAILABILITY POLICY
 * ============================================================
 *
 * Pure function for testing activation boundaries.
 *
 * The actual Razorpay popup integration is not complete.
 * Therefore, no combination of activation switches
 * may authorize opening the payment popup yet.
 *
 * Remove this hard stop only during the separately
 * approved payment-launch integration.
 * ============================================================
 */

function getRazorpayPopupAvailability(
  onlineEnabled,
  transportEnabled
) {
  if (
    onlineEnabled !== true ||
    transportEnabled !== true
  ) {
    return "disabled";
  }

  // HARD STOP:
  // Popup integration and verified payment finalization
  // are not connected yet.
  return "not_connected";
}
/*
 * ============================================================
 * BLOOM & POD — RAZORPAY CHECKOUT POPUP LAUNCHER
 * ============================================================
 *
 * Separate from the existing COD checkout.
 *
 * DEVELOPMENT STATUS: NOT CONNECTED
 *
 * This function:
 * - Checks the Razorpay activation controls.
 * - Validates the prepared checkout details.
 * - Does not load the Razorpay SDK.
 * - Does not open a payment popup.
 * - Does not create or finalize an order.
 *
 * The final launch implementation requires a separate
 * review of payment verification and finalization.
 * ============================================================
 */
/*
 * ============================================================
 * BLOOM & POD — RAZORPAY CHECKOUT SDK LOADER
 * ============================================================
 *
 * Loads the official Razorpay Standard Checkout SDK.
 *
 * This helper:
 * - Does not load anything while Razorpay is disabled.
 * - Reuses an existing successful or pending SDK load.
 * - Does not create a Razorpay order.
 * - Does not open the payment window.
 * - Does not verify or finalize payments.
 *
 * STATUS: PREPARED — NOT CONNECTED
 * ============================================================
 */

let razorpayCheckoutScriptPromise = null;

function loadRazorpayCheckoutScript() {

  // Gate 1: Respect both activation controls.
  if (
    !ENABLE_RAZORPAY_ONLINE_CHECKOUT ||
    !ENABLE_RAZORPAY_INITIATION_TRANSPORT
  ) {
    return Promise.reject(
      new Error(
        "Online payments are not available yet."
      )
    );
  }

  // Gate 2: Reuse an already-loaded SDK.
  if (typeof window.Razorpay === "function") {
    return Promise.resolve();
  }

  // Gate 3: Reuse an in-progress SDK load.
  if (razorpayCheckoutScriptPromise) {
    return razorpayCheckoutScriptPromise;
  }

  razorpayCheckoutScriptPromise = new Promise(
    (resolve, reject) => {

      const script = document.createElement("script");

      script.src =
        "https://checkout.razorpay.com/v1/checkout.js";

      script.async = true;

      script.onload = () => {

        if (typeof window.Razorpay === "function") {
          resolve();
          return;
        }

        reject(
          new Error(
            "Razorpay Checkout could not initialize."
          )
        );
      };

      script.onerror = () => {
        reject(
          new Error(
            "Unable to load Razorpay Checkout."
          )
        );
      };

      document.head.appendChild(script);
    }
  ).catch(error => {

    // Allow a later SDK-loading attempt.
    // This does NOT retry payment initialization.
    razorpayCheckoutScriptPromise = null;

    throw error;
  });

  return razorpayCheckoutScriptPromise;
}
/*
 * ============================================================
 * BLOOM & POD — RAZORPAY PAYMENT RESPONSE PREPARATION
 * ============================================================
 *
 * Validates the structure of a Razorpay Checkout callback.
 *
 * IMPORTANT:
 * - This is NOT payment verification.
 * - It does NOT verify the Razorpay signature.
 * - It does NOT mark an order Paid.
 * - It does NOT update inventory.
 * - It does NOT contact the backend.
 *
 * Only the trusted backend may verify and finalize
 * an online payment.
 *
 * STATUS: PREPARED — NOT CONNECTED
 * ============================================================
 */

function prepareRazorpayPaymentVerificationPayload(
  response,
  expectedOrderId
) {

  // Require a valid response object.
  if (
    !response ||
    typeof response !== "object" ||
    Array.isArray(response)
  ) {
    return null;
  }

  // Require the Razorpay Order ID obtained from
  // the previously validated backend initialization.
  if (
    typeof expectedOrderId !== "string" ||
    !/^order_[A-Za-z0-9]+$/.test(expectedOrderId)
  ) {
    return null;
  }

  const paymentId = response.razorpay_payment_id;
  const orderId = response.razorpay_order_id;
  const signature = response.razorpay_signature;

  // Validate callback field types and formats.
  if (
    typeof paymentId !== "string" ||
    typeof orderId !== "string" ||
    typeof signature !== "string" ||
    !/^pay_[A-Za-z0-9]+$/.test(paymentId) ||
    !/^order_[A-Za-z0-9]+$/.test(orderId) ||
    !/^[a-f0-9]{64}$/.test(signature)
  ) {
    return null;
  }

  // Reject an unexpected gateway order identity.
  if (orderId !== expectedOrderId) {
    return null;
  }

  // Prepare only the three fields required for
  // subsequent server-side payment verification.
  //
  // Returning this object DOES NOT confirm payment.
  return Object.freeze({
    razorpay_payment_id: paymentId,
    razorpay_order_id: orderId,
    razorpay_signature: signature
  });
}
/*
 * BLOOM & POD — RAZORPAY CALLBACK VERIFICATION TRANSPORT
 * Prepared only. Does not run until called after activation.
 * A browser callback is NOT proof of payment.
 */
let razorpayVerificationInFlight = false;

async function submitRazorpayPaymentVerification(
  callback,
  expectedOrderId,
  orderData
) {
  const pending = () => ({
    kind: "pending_review",
    paymentConfirmed: false,
    automaticRetryAllowed: false
  });

  if (
    !ENABLE_RAZORPAY_ONLINE_CHECKOUT ||
    !ENABLE_RAZORPAY_INITIATION_TRANSPORT ||
    !ENABLE_RAZORPAY_VERIFICATION_TRANSPORT
  ) {
    return {
      kind: "disabled",
      paymentConfirmed: false,
      automaticRetryAllowed: false
    };
  }

  if (razorpayVerificationInFlight || !isOnlinePayment(orderData)) {
    return pending();
  }

  const paymentFields =
    prepareRazorpayPaymentVerificationPayload(
      callback,
      expectedOrderId
    );

  if (!paymentFields) return pending();

  // Recover ONLY the token originally used to create this checkout.
  // Do not call getOrCreateRazorpayCheckoutToken() here: if missing,
  // creating a replacement token would not prove checkout ownership.
  const idempotencyKey = String(
    orderData?.idempotencyKey ||
    orderData?.orderIdempotencyKey ||
    ""
  ).trim();

  let savedToken;
  try {
    savedToken = JSON.parse(
      sessionStorage.getItem(RAZORPAY_CHECKOUT_TOKEN_STORAGE_KEY)
    );
  } catch {
    return pending();
  }

  if (
    !/^[A-Za-z0-9._:-]{12,100}$/.test(idempotencyKey) ||
    savedToken?.idempotencyKey !== idempotencyKey ||
    typeof savedToken?.checkoutToken !== "string" ||
    !/^[0-9a-f]{64}$/.test(savedToken.checkoutToken)
  ) {
    return pending();
  }

  const invoke = window.bpSupabase?.functions?.invoke;
  if (typeof invoke !== "function") return pending();

  razorpayVerificationInFlight = true;
  try {
    const { data, error } = await window.bpSupabase.functions.invoke(
      "verify-razorpay-payment",
      {
        body: {
          checkout_token: savedToken.checkoutToken,
          ...paymentFields
        }
      }
    );

    if (
      !error &&
      data?.success === true &&
      data?.status === "order_confirmed" &&
      typeof data.order_number === "string" &&
      /^BP-[0-9]{8}-[0-9]{6,}$/.test(data.order_number)
    ) {
      return {
        kind: "order_confirmed",
        orderNumber: data.order_number,
        paymentConfirmed: true,
        automaticRetryAllowed: false
      };
    }

    // 202 pending, non-2xx, malformed responses, and network errors
    // are all uncertain. Never advise another payment automatically.
    return pending();
  } catch {
    return pending();
  } finally {
    razorpayVerificationInFlight = false;
  }
}
/*
 * BLOOM & POD — RAZORPAY VERIFIED CALLBACK HANDLER
 *
 * A Razorpay callback is not proof of payment.
 * Only the backend can confirm payment and order creation.
 *
 * Prepared only — not connected to the popup yet.
 */

async function handleRazorpayCheckoutCallback(
  callback,
  initializationOutcome,
  orderData
) {
  const pending = {
    kind: "pending_review",
    paymentConfirmed: false,
    automaticRetryAllowed: false
  };

  // Do not process callbacks while online payment is disabled.
  if (
    !ENABLE_RAZORPAY_ONLINE_CHECKOUT ||
    !ENABLE_RAZORPAY_INITIATION_TRANSPORT ||
    !ENABLE_RAZORPAY_VERIFICATION_TRANSPORT
  ) {
    return {
      kind: "disabled",
      paymentConfirmed: false,
      automaticRetryAllowed: false
    };
  }

  // Require a recognized backend initialization result.
  if (
    !initializationOutcome ||
    initializationOutcome.action !==
      "await_checkout_activation"
  ) {
    return pending;
  }

  const expectedOrderId =
    initializationOutcome.checkout?.order_id;

  if (
    typeof expectedOrderId !== "string" ||
    !/^order_[A-Za-z0-9]+$/.test(expectedOrderId)
  ) {
    return pending;
  }

  // All payment verification happens on the backend.
  const result = await submitRazorpayPaymentVerification(
    callback,
    expectedOrderId,
    orderData
  );

  if (
    result?.kind === "order_confirmed" &&
    result.paymentConfirmed === true &&
    typeof result.orderNumber === "string"
  ) {
    return {
      kind: "order_confirmed",
      orderNumber: result.orderNumber,
      paymentConfirmed: true,
      automaticRetryAllowed: false
    };
  }

  // Do not assume a failed or uncertain request means
  // the customer has not been charged.
  return pending;
}
/*
 * BLOOM & POD — VERIFIED RAZORPAY ORDER COMPLETION
 *
 * Only an explicitly confirmed backend result may
 * trigger the existing order-success interface.
 *
 * Prepared only — not connected to the popup yet.
 */
function completeVerifiedRazorpayOrder(
  verificationResult,
  orderData
) {
  if (
    !ENABLE_RAZORPAY_ONLINE_CHECKOUT ||
    !ENABLE_RAZORPAY_INITIATION_TRANSPORT ||
    !ENABLE_RAZORPAY_VERIFICATION_TRANSPORT ||
    !isOnlinePayment(orderData)
  ) {
    return false;
  }

  if (
    verificationResult?.kind !== "order_confirmed" ||
    verificationResult.paymentConfirmed !== true ||
    verificationResult.automaticRetryAllowed !== false ||
    typeof verificationResult.orderNumber !== "string" ||
    !/^BP-[0-9]{8}-[0-9]{6,}$/.test(
      verificationResult.orderNumber
    )
  ) {
    return false;
  }

  // At this point, the trusted backend has reported
  // successful payment verification and order finalization.
  // Do not clear checkout data for pending outcomes.

  finishSuccessfulOrder(
    verificationResult.orderNumber,
    String(orderData.email || "").trim()
  );

  // Only discard this checkout's token after the
  // confirmed-order completion path has been invoked.
  const idempotencyKey = String(
    orderData.idempotencyKey ||
    orderData.orderIdempotencyKey ||
    ""
  ).trim();

  try {
    const saved = JSON.parse(
      sessionStorage.getItem(
        RAZORPAY_CHECKOUT_TOKEN_STORAGE_KEY
      ) || "null"
    );

    if (saved?.idempotencyKey === idempotencyKey) {
      sessionStorage.removeItem(
        RAZORPAY_CHECKOUT_TOKEN_STORAGE_KEY
      );
    }
  } catch (error) {
    console.error(
      "Unable to clear completed Razorpay checkout token:",
      error
    );
  }

  return true;
}
function launchRazorpayCheckoutPopup(outcome) {

    // Gate 1: Check activation and integration readiness.
  const availability = getRazorpayPopupAvailability(
    ENABLE_RAZORPAY_ONLINE_CHECKOUT,
    ENABLE_RAZORPAY_INITIATION_TRANSPORT
  );

  if (availability !== "ready") {
    return {
      kind: availability,
      popupOpened: false,
      paymentConfirmed: false
    };
  }

  // Gate 2: Only a validated payment-ready outcome
  // may be used to prepare Razorpay popup options.
  const options =
    buildRazorpayCheckoutPopupOptions(outcome);

  // The options will be used by the actual popup
  // launcher after backend verification is ready.
  //
  // Never log or persist checkout details here.
  void options;

  // Gate 3: HARD STOP.
  //
  // The Razorpay SDK, payment callbacks, and
  // server-side finalization are not connected.
  //
  // Even if both activation switches are changed,
  // this function must not open a payment popup.
  return {
    kind: "not_connected",
    popupOpened: false,
    paymentConfirmed: false
  };
}
/*
 * ============================================================
 * BLOOM & POD — RAZORPAY TRANSPORT EXECUTION
 * ============================================================
 *
 * Accepts an invocation function so failure handling
 * can be tested with synthetic responses.
 *
 * The actual Razorpay transport remains protected
 * by its separate activation switches.
 *
 * Never automatically retry an uncertain result.
 * ============================================================
 */

async function executeRazorpayInitiationRequest(
  invokeFunction,
  request
) {
  const pending = () =>
    resolveRazorpayInitializationOutcome({
      kind: "pending_review"
    });

  if (
    typeof invokeFunction !== "function" ||
    !request ||
    typeof request !== "object" ||
    Array.isArray(request)
  ) {
    return pending();
  }

  try {
    const result = await invokeFunction(
      "create-razorpay-order",
      {
        body: request
      }
    );

    const classified =
      await interpretRazorpaySupabaseInvokeResult(
        result
      );

    return resolveRazorpayInitializationOutcome(
      classified
    );

  } catch {
    // The server might have received the request
    // even if the client received an error.
    //
    // Never automatically retry or create another
    // Razorpay order after an uncertain outcome.
    return pending();
  }
}
/*
 * ============================================================
 * BLOOM & POD — RAZORPAY SINGLE-FLIGHT PROTECTION
 * ============================================================
 *
 * Prevents overlapping payment-initiation requests
 * within the current browser page.
 *
 * This is not a replacement for backend idempotency.
 *
 * No automatic retry after an uncertain outcome.
 *
 * RAZORPAY STATUS: DISABLED
 * ============================================================
 */

/*
 * ============================================================
 * BLOOM & POD — RAZORPAY INITIATION STATE PROTECTION
 * ============================================================
 *
 * Two independent protections:
 *
 * 1. In-flight lock:
 *    Prevents simultaneous requests.
 *
 * 2. Review-required lock:
 *    Prevents another initiation after an uncertain
 *    response or a prepared payment session.
 *
 * This is browser-page protection only.
 *
 * Database idempotency and server-side reconciliation
 * remain authoritative.
 *
 * RAZORPAY STATUS: DISABLED
 * ============================================================
 */

let razorpayInitiationInFlight = false;
let razorpayInitiationRequiresReview = false;
/*
 * ============================================================
 * BLOOM & POD — RAZORPAY PERSISTENT INITIATION HOLD
 * ============================================================
 *
 * Preserves a review-required state across page refreshes
 * within the current browser tab.
 *
 * An uncertain payment initiation must never be blindly
 * retried, even after refreshing the page.
 *
 * sessionStorage is a frontend safeguard only.
 * Backend database state remains authoritative.
 *
 * RAZORPAY STATUS: DISABLED
 * ============================================================
 */

const RAZORPAY_INITIATION_HOLD_KEY =
  "bloomPodRazorpayInitiationHoldV1";

function getRazorpayInitiationHoldStatus(checkoutToken) {

  // Reject missing or invalid checkout identities.
  if (
    typeof checkoutToken !== "string" ||
    !/^[0-9a-f]{64}$/.test(checkoutToken)
  ) {
    return "blocked";
  }

  try {
    const saved = sessionStorage.getItem(
      RAZORPAY_INITIATION_HOLD_KEY
    );

    // No existing initiation hold.
    if (saved === null) {
      return "clear";
    }

    const record = JSON.parse(saved);

    // Reject malformed records and mismatched tokens.
    // Never silently discard a previous review hold.
    if (
      !record ||
      record.version !== 1 ||
      record.state !== "requires_review" ||
      record.checkout_token !== checkoutToken
    ) {
      return "blocked";
    }

    return "requires_review";

  } catch {
    // Storage errors and corrupt records fail closed.
    return "blocked";
  }
}
/*
 * ============================================================
 * BLOOM & POD — LOCAL RAZORPAY RECOVERY STATE
 * ============================================================
 *
 * Read-only classification.
 *
 * Never:
 * - Clears a checkout hold.
 * - Initiates or retries a payment request.
 * - Opens Razorpay Checkout.
 * - Assumes a missing browser hold means the backend
 *   has no existing checkout.
 *
 * Backend reconciliation remains authoritative.
 * ============================================================
 */

function classifyRazorpayLocalRecoveryState(checkoutToken) {

  const status =
    getRazorpayInitiationHoldStatus(checkoutToken);

  if (status === "requires_review") {
    return {
      kind: "existing_checkout_requires_review",
      paymentConfirmed: false,
      automaticRetryAllowed: false
    };
  }

  if (status === "blocked") {
    return {
      kind: "local_state_untrusted",
      paymentConfirmed: false,
      automaticRetryAllowed: false
    };
  }

  // No local hold does NOT prove there was no
  // previous server-side initiation.
  return {
    kind: "no_local_hold",
    paymentConfirmed: false,
    automaticRetryAllowed: false
  };
}
/*
 * ============================================================
 * BLOOM & POD — RAZORPAY RECOVERY GUIDANCE
 * ============================================================
 *
 * Converts local recovery state into safe UI guidance.
 *
 * This function NEVER:
 * - Authorizes payment initiation.
 * - Clears a checkout hold.
 * - Opens Razorpay Checkout.
 * - Confirms payment.
 * - Calls Supabase or Razorpay.
 *
 * Backend recovery verification is not yet connected.
 * ============================================================
 */

function getRazorpayRecoveryGuidance(checkoutToken) {

  const localState =
    classifyRazorpayLocalRecoveryState(checkoutToken);

  let kind;
  let message;

  switch (localState.kind) {

    case "existing_checkout_requires_review":
      kind = "await_reconciliation";
      message =
        "Your existing online checkout needs verification. " +
        "Please do not start another payment attempt.";
      break;

    case "no_local_hold":
      kind = "backend_verification_required";
      message =
        "We need to verify whether an online checkout " +
        "already exists before continuing.";
      break;

    default:
      kind = "local_state_untrusted";
      message =
        "The online checkout state could not be verified. " +
        "Please do not retry payment.";
      break;
  }

  return {
    kind,
    message,

    // No browser-only recovery decision may authorize
    // payment or clear the existing checkout state.
    canInitiatePayment: false,
    canOpenPopup: false,
    canClearHold: false,
    paymentConfirmed: false
  };
}

function persistRazorpayInitiationHold(checkoutToken) {

  // A new hold may be created only when no previous
  // hold exists for this browser tab.
  if (
    getRazorpayInitiationHoldStatus(checkoutToken) !==
    "clear"
  ) {
    throw new Error(
      "An online checkout requires review before continuing."
    );
  }

  const record = {
    version: 1,
    state: "requires_review",
    checkout_token: checkoutToken
  };

  try {
    sessionStorage.setItem(
      RAZORPAY_INITIATION_HOLD_KEY,
      JSON.stringify(record)
    );

    // Verify that the hold was actually saved.
    if (
      getRazorpayInitiationHoldStatus(checkoutToken) !==
      "requires_review"
    ) {
      throw new Error("Storage verification failed.");
    }

  } catch {
    throw new Error(
      "Unable to safely preserve the online checkout state."
    );
  }
}

/*
 * ============================================================
 * BLOOM & POD — PERSISTENT RAZORPAY INITIATION GUARD
 * ============================================================
 *
 * Before contacting the backend:
 * 1. Reject overlapping initiation requests.
 * 2. Reject existing review-required states.
 * 3. Validate the checkout identity.
 * 4. Persist a checkout-specific initiation hold.
 *
 * Once a request may have been submitted, retain
 * the hold until authoritative backend reconciliation.
 *
 * sessionStorage is only a frontend safeguard.
 * Database idempotency remains authoritative.
 *
 * RAZORPAY STATUS: DISABLED
 * ============================================================
 */

async function executeRazorpayInitiationSingleFlight(
  invokeFunction,
  request
) {
  const requiresReview = () =>
    resolveRazorpayInitializationOutcome({
      kind: "pending_review"
    });

  // Gate 1: Prevent simultaneous initiation requests.
  if (razorpayInitiationInFlight) {
    return requiresReview();
  }

  // Gate 2: Respect an existing in-memory hold.
  if (razorpayInitiationRequiresReview) {
    return requiresReview();
  }

  // Gate 3: Require a valid checkout identity.
  const checkoutToken = request?.checkout_token;

  const holdStatus =
    getRazorpayInitiationHoldStatus(checkoutToken);

  // Never ignore a previously recorded hold.
  if (holdStatus !== "clear") {
    if (holdStatus === "requires_review") {
      razorpayInitiationRequiresReview = true;
    }

    return requiresReview();
  }

  // Gate 4: Acquire the single-flight lock.
  razorpayInitiationInFlight = true;

  try {
    // Gate 5: Persist the hold BEFORE invoking
    // the backend.
    //
    // If persistence fails, no request is sent.
    try {
      persistRazorpayInitiationHold(checkoutToken);
    } catch {
      return requiresReview();
    }

    // From this point onward, the checkout may
    // be associated with a backend initiation attempt.
    //
    // Do not automatically clear this flag.
    razorpayInitiationRequiresReview = true;

    // Execute exactly one initiation request.
    //
    // Network failures, timeouts and ambiguous
    // responses must never trigger automatic retries.
    return await executeRazorpayInitiationRequest(
      invokeFunction,
      request
    );

  } finally {
    // Release only the simultaneous-request lock.
    //
    // The persistent and in-memory review holds
    // remain until backend reconciliation.
    razorpayInitiationInFlight = false;
  }
}
/*
 * ============================================================
 * BLOOM & POD — RAZORPAY INITIATION HTTP TRANSPORT
 * ============================================================
 *
 * Uses the separate Razorpay Edge Function.
 *
 * No automatic retries.
 * No browser-controlled payment amounts.
 * No COD order creation.
 * No payment success assumptions.
 *
 * DEVELOPMENT STATUS: DISABLED
 * ============================================================
 */

async function invokeRazorpayInitiationTransport(request) {

  // Both activation controls must be enabled.
  if (
    !ENABLE_RAZORPAY_ONLINE_CHECKOUT ||
    !ENABLE_RAZORPAY_INITIATION_TRANSPORT
  ) {
    return resolveRazorpayInitializationOutcome({
      kind: "online_payment_unavailable"
    });
  }

  // Require a prepared request object.
  if (
    !request ||
    typeof request !== "object" ||
    Array.isArray(request)
  ) {
    return resolveRazorpayInitializationOutcome({
      kind: "pending_review"
    });
  }

  // Require the Supabase Edge Function client.
  const functionsClient =
    window.bpSupabase?.functions;

  if (
    !functionsClient ||
    typeof functionsClient.invoke !== "function"
  ) {
    return resolveRazorpayInitializationOutcome({
      kind: "pending_review"
    });
  }

    // The activation checks above must pass before
  // this function can invoke the Razorpay backend.
  //
  // No automatic retries. No payment finalization.
    // Prevent overlapping requests from this browser page.
  return await executeRazorpayInitiationSingleFlight(
    (functionName, options) =>
      functionsClient.invoke(functionName, options),
    request
  );
}
async function startRazorpayOnlineCheckout(data) {
  /*
   * BLOOM & POD — RAZORPAY PAYMENT INITIATION
   *
   * Development only.
   *
   * This function remains fail-closed until the
   * dedicated Razorpay backend is connected,
   * verified and explicitly activated.
   */

  // Gate 1: Razorpay must be enabled.
  if (!ENABLE_RAZORPAY_ONLINE_CHECKOUT) {
    throw new Error(
      "Online payments are not available yet. Please select Cash on Delivery."
    );
  }

  // Gate 2: Require Online payment selection.
  if (!isOnlinePayment(data)) {
    throw new Error(
      "Online payment was not selected for this order."
    );
  }

    // Gate 3: Require both backend transports.
  if (
    !ENABLE_RAZORPAY_INITIATION_TRANSPORT ||
    !ENABLE_RAZORPAY_VERIFICATION_TRANSPORT
  ) {
    throw new Error(
      "Online payment services are not activated yet."
    );
  }

  // Gate 4: The popup must be fully connected BEFORE
  // creating a backend checkout or reserving inventory.
  const availability = getRazorpayPopupAvailability(
    ENABLE_RAZORPAY_ONLINE_CHECKOUT,
    ENABLE_RAZORPAY_INITIATION_TRANSPORT
  );

  if (availability !== "ready") {
    throw new Error(
      "Razorpay payment interface is not connected yet."
    );
  }

  // Gate 5: Prepare trusted backend initialization.
  const request = prepareRazorpayCheckoutRequest(data);

  // Gate 6: Invoke the existing protected transport.
  const outcome = await invokeRazorpayInitiationTransport(
    request
  );

  if (outcome?.action !== "await_checkout_activation") {
    throw new Error(
      outcome?.message ||
      "Online payment initialization could not be confirmed."
    );
  }

  // Gate 7: Delegate to the controlled popup launcher.
  const launch = launchRazorpayCheckoutPopup(outcome);

  if (launch?.popupOpened !== true) {
    throw new Error(
      "Razorpay payment interface is not ready."
    );
  }

  return launch;
}

async function openOnlinePaymentModal(data) {
  try {
    await startRazorpayOnlineCheckout(data);
  } catch (error) {
    showOrderError(
      error?.message ||
      "Online payment is temporarily unavailable."
    );
  }
}
document.addEventListener(
  "DOMContentLoaded",
  () => {
    const year =
      document.getElementById(
        "year"
      );
    if (year) {
      year.textContent =
        new Date().getFullYear();
    }
    const data =
      pendingOrder();
    const error =
      document.getElementById(
        "review-error"
      );
    const button =
      document.getElementById(
        "place-order-btn"
      );
    const successModal =
      document.getElementById(
        "order-success-modal"
      );
    
    const successHome = document.getElementById(
      "order-success-home"
    );

    const successTrack = document.getElementById(
      "order-success-track"
    );

    // Return to the homepage.
    successHome?.addEventListener("click", () => {
      window.location.href = "index.html";
    });

    // Transfer the order number to the tracking page.
    successTrack?.addEventListener("click", () => {
      if (!successfulOrderId) return;

      sessionStorage.setItem(
        "bloomPodTrackOrderOnce",
        successfulOrderId
      );

      window.location.href = "customer-order.html";
    });
    /*
     * Require the confirmation snapshot.
     */
    if (
      !data ||
      !Array.isArray(
        data.confirmationSnapshot
      ) ||
      !data.confirmationSnapshot.length
    ) {
      if (error) {
        error.textContent =
          "Your checkout details are no longer available. Please return to checkout and try again.";
        error.hidden =
          false;
      }
      if (button) {
        button.disabled =
          true;
      }
      return;
    }
    /*
     * Render review page.
     */
    renderReview(data);
/*
  * Configure COD / Online payment buttons.
 */
configurePaymentActions(data);

/*
  * Explain a restored uncertain order outcome.
  * Never permit a blind retry after refresh.
*/
if (ENABLE_SECURE_CHECKOUT && orderOutcomeUncertain) {
  const restorableOrder = getRestorableConfirmedOrder();

  if (restorableOrder) {
    showOrderError(
      "Your previous checkout saved order reference " +
      restorableOrder.orderId +
      ". Please verify this order using Track Order " +
      "and your checkout email before taking further action."
    );
  } else {
    showOrderError(
      "We couldn't confirm your previous order. " +
      "Please check your order status before trying again."
    );
  }
}

/*
  * Apply Turnstile requirements to the initial
  * Place Order button state.
 *
  * No effect while ENABLE_SECURE_CHECKOUT is false.
 */
updateSecureOrderButtonState();

/*
 * ============================================================
 * BLOOM & POD — LAYER 2: TURNSTILE INITIALIZATION
 * ============================================================
 *
 * Turnstile is required only for secure checkout.
 *
 * When ENABLE_SECURE_CHECKOUT is false, the existing
 * checkout flow continues without a challenge.
 *
 * When enabled:
 * - Reveal the verification section.
 * - Load the official Cloudflare Turnstile script.
 * - Render the widget for customer verification.
 *
 * If initialization fails, secure checkout must remain
 * protected: never bypass Turnstile or fall back to
 * the direct database RPC.
 *
 * Layer 3: Rate limiting postponed.
 * ============================================================
 */
if (ENABLE_SECURE_CHECKOUT) {
  const turnstileSection = document.getElementById(
    "order-turnstile-section"
  );

  if (turnstileSection) {
    turnstileSection.hidden = false;
  }

  loadOrderTurnstileScript()
    .then(() => {
      initializeOrderTurnstile();
    })
    .catch(error => {
      console.error(
        "Order security verification failed to initialize:",
        error
      );

      clearOrderTurnstileToken();

      showOrderError(
        "Security verification could not load. Please refresh the page and try again."
      );

      // Fail closed: security verification is unavailable.
      updateSecureOrderButtonState();
    });
}
/*
 * Complete online payment.
 */
const paymentButton =
  document.getElementById(
    "complete-payment-btn"
  );
if (paymentButton) {
  paymentButton.addEventListener(
    "click",
    () => {
      if (!isOnlinePayment(data)) {
        return;
      }
      openOnlinePaymentModal(
        data
      );
    }
  );
}
/*
 * Place order.
 */
if (button) {
      button.addEventListener(
  "click",
      async () => {
    const latestData =
      pendingOrder() ||
      data;
    // Online payment is not activated. A browser-stored success
    // flag must never authorize order placement.
    if (isOnlinePayment(latestData)) {
      showOrderError(
        "Online payments are not available yet. Please select Cash on Delivery."
      );
      return;
    }
    /*
     * Prevent accidental double-click/order submission.
     */
        if (
  orderSubmissionStarted ||
  orderSubmissionFinished ||
  (
    ENABLE_SECURE_CHECKOUT &&
    (
      orderOutcomeUncertain ||
      hasUncertainPendingOrder()
    )
  )
) {
  return;
}
    orderSubmissionStarted = true;
          if (error) {
            error.hidden =
              true;
          }
          button.disabled =
            true;
          button.textContent =
            "Placing order…";
          showOrderProcessingOverlay();

          try {
            /*
 * ============================================================
 * BLOOM & POD — LAYER 1 & 2 CHECKOUT ROUTING
 * ============================================================
 *
 * Route order submission through the prepared gateway
 * selection function.
 *
 * ENABLE_SECURE_CHECKOUT remains false, so the existing
 * direct RPC checkout continues to operate.
 *
 * During the final security cutover, secure checkout
 * must be enabled together with the protected backend.
 *
 * Never silently fall back to direct RPC after a
 * secure gateway error.
 *
 * Layer 3: Rate limiting postponed.
 * ============================================================
 */
const orderResult = await submitCustomerOrder(
  latestData
);
const confirmedData = pendingOrder() || latestData;

confirmedData.savedOrderId =
  orderResult.order_id;
confirmedData.savedOrderTotal =
  Number(orderResult.total || 0);

try {
  sessionStorage.setItem(
    "bloomPodPendingOrder",
    JSON.stringify(confirmedData)
  );
} catch (storageError) {
  if (!ENABLE_SECURE_CHECKOUT) {
    throw storageError;
  }

  console.error(
    "Unable to save confirmed order details locally:",
    storageError
  );
}

finishSuccessfulOrder(
          orderResult.order_id,
          latestData.email
        );
                    } catch (err) {
            console.error(
              "Order submission failed:",
              err
            );

            orderSubmissionStarted = false;

                            const restorableOrder = ENABLE_SECURE_CHECKOUT
                ? getRestorableConfirmedOrder()
                : null;

              if (
                ENABLE_SECURE_CHECKOUT &&
                (
                  err?.orderOutcomeUncertain === true ||
                  hasUncertainPendingOrder()
                )
              ) {
                orderOutcomeUncertain = true;

              const pending = pendingOrder();

              if (pending) {
                const idempotencyKey = String(
                  pending.idempotencyKey ||
                  pending.orderIdempotencyKey ||
                  ""
                ).trim();

              if (
                idempotencyKey &&
                !restorableOrder &&
                !String(
                  pending.secureOrderOutcomeUncertain || ""
                ).trim() &&
                (
                  !String(
                    pending.secureOrderSubmissionPending || ""
                  ).trim() ||
                  pending.secureOrderSubmissionPending === idempotencyKey
                )
              ) {
                pending.secureOrderOutcomeUncertain =
                  idempotencyKey;

                    try {
                    sessionStorage.setItem(
                      "bloomPodPendingOrder",
                      JSON.stringify(pending)
                    );
                  } catch (storageError) {
                    console.error(
                      "Unable to save uncertain order state:",
                      storageError
                    );
                  }
                }
              }
            }

                        showOrderError(
              restorableOrder
                ? "Your checkout saved order reference " +
                  restorableOrder.orderId +
                  ". Please verify this order using Track Order " +
                  "and your checkout email before taking further action."
                : (
                    err?.message ||
                    "Something went wrong while placing your order. Please try again."
                  )
            );
          }
        }
      );
    }
  }
);
