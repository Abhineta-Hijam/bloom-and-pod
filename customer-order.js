/* Start order tracking page at the top on every load. */
if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}

window.addEventListener("pageshow", () => {
  window.scrollTo({
    top: 0,
    left: 0,
    behavior: "instant"
  });
});
const orderInput = document.getElementById("order-id");
const emailInput = document.getElementById("order-email");
/* One-time order number prefill from the success modal. */
const prefillOrderId = sessionStorage.getItem(
  "bloomPodTrackOrderOnce"
);

// Consume immediately so refreshing won't prefill it again.
sessionStorage.removeItem("bloomPodTrackOrderOnce");

if (prefillOrderId && orderInput) {
  orderInput.value = prefillOrderId;
}
const trackButton = document.getElementById("track-order-btn");
const trackSpinner = document.getElementById("track-order-spinner");
const trackError = document.getElementById("track-order-error");
  function showTrackError(message) {
    trackError.textContent = message;
    trackError.hidden = !message;
  }

  function setTrackLoading(loading) {
    trackButton.disabled = loading;
    trackSpinner.hidden = !loading;
  }

  orderInput.addEventListener("input", () => {
    showTrackError("");
  });

  emailInput.addEventListener("input", () => {
    showTrackError("");
  });

const result = document.getElementById("order-result");
  
result.addEventListener("click", (event) => {
  const toggle = event.target.closest(
    "#customer-assistance-toggle"
  );

  if (!toggle) return;

  const menu = result.querySelector(
    "#customer-assistance-menu"
  );

  if (!menu) return;

  const isOpening = menu.hidden;

  menu.hidden = !isOpening;

  toggle.setAttribute(
    "aria-expanded",
    String(isOpening)
  );
});

  function showResult(html) {
    result.innerHTML = html;
  }
const trackerCard = document.querySelector(
  ".order-tracker-card"
);
let customerDisplayedOrder = null;
let customerVerifiedOrderEmail = null;
// Unsaved product ratings, kept while the page remains open.
const customerReviewProductRatings = new Map();
let customerReviewOrderRating = null;
let customerCancellationExpiryTimer = null;
let customerAssistanceExpiryTimer = null;

function showCustomerOrderWithTransition(order, options = {}) {
  const previousOrderId = String(
    customerDisplayedOrder?.order_id || ""
  ).trim().toLowerCase();

  const nextOrderId = String(
    order?.order_id || ""
  ).trim().toLowerCase();

  // Preserve the draft for the same order.
  // Reset it when displaying a different order.
  if (previousOrderId !== nextOrderId) {
    customerReviewProductRatings.clear();
    customerReviewOrderRating = null;

    const reviewText = document.getElementById(
      "customer-review-text"
    );

    if (reviewText) {
      reviewText.value = "";
    }
  }

  customerDisplayedOrder = order;

  const isCancelled =
    String(order.status || "")
      .trim()
      .toLowerCase() === "cancelled";
const orderHtml =
  renderCustomerOrderAction(order) +
  (isCancelled
    ? renderCustomerCancellation(order)
    : renderCustomerTimeline(order)
  ) +
  renderCustomerPaymentDetails(order) +
  renderCustomerOrderBreakdown(order);
  // Wait until the search card has faded away.
  trackerCard.classList.add("tracker-exiting");
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  window.setTimeout(() => {
    trackerCard.classList.add("tracker-hidden");
    showResult(orderHtml);
    scheduleCustomerCancellationExpiry(order);
    scheduleCustomerAssistanceExpiry(order);
    result.classList.toggle("bp-cancellation-success", Boolean(options.fromCancellation));
    result.classList.remove("results-entering");
    // Restart the entrance animation.
    void result.offsetWidth;
    result.classList.add("results-entering");
result
  .querySelectorAll(
    'img[data-customer-product-image]'
  )
  .forEach(img => {
    img.addEventListener("error", () => {
      img.outerHTML = customerProductImagePlaceholder();
    }, { once: true });
  });
    result.scrollIntoView({
      behavior: reducedMotion ? "instant" : "smooth",
      block: "start"
    });
  }, reducedMotion || trackerCard.classList.contains("tracker-hidden") ? 0 : 280);
}
  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
const customerOrderStages = [
  'New',
  'Processing',
  'Packed',
  'Shipped',
  'Delivered'
];
const customerTimelineIcons = {
  New: '<path d="M2 3h2l3 12h12l3-9H5"/><circle cx="9" cy="21" r="1"/><circle cx="19" cy="21" r="1"/>',
  Processing: '<circle cx="12" cy="12" r="3"/><path d="M10 2h4l.6 2.3 2 .9 2.1-1.1 2.8 2.8-1.1 2.1.9 2L24 11v4l-2.7.6-.9 2 1.1 2.1-2.8 2.8-2.1-1.1-2 .9L14 24h-4l-.6-2.7-2-.9-2.1 1.1-2.8-2.8 1.1-2.1-.9-2L0 15v-4l2.7-.6.9-2-1.1-2.1L5.3 3.5l2.1 1.1 2-.9z" transform="translate(2 2) scale(.82)"/>',
  Packed: '<path d="M21 8 12 3 3 8v9l9 5 9-5V8Z"/><path d="m3 8 9 5 9-5M12 13v9M7.5 5.5l9 5"/>',
  Shipped: '<path d="M10 17h4V5H2v12h3"/><path d="M14 9h4l4 4v4h-3"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="17.5" r="2.5"/>',
  Delivered: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z"/><path d="M9 21v-8h6v8"/>'
};
// Delivered-order hero illustration.
// Paste the final delivered image URL here when ready.
const CUSTOMER_DELIVERED_IMAGE_URL = "images/order-delivered.webp";
function renderCustomerDeliveredHero(order) {
  const status = String(order?.status || "").trim().toLowerCase();

  if (status !== "delivered") {
    return "";
  }

  return `
    <div class="customer-delivered-hero">
      ${
        CUSTOMER_DELIVERED_IMAGE_URL
          ? `
            <img
              src="${escapeHtml(CUSTOMER_DELIVERED_IMAGE_URL)}"
              alt="Order delivered"
              class="customer-delivered-hero-image"
              loading="lazy"
            >
          `
          : `
            <div class="customer-delivered-hero-placeholder">
              Add delivered image URL in
              <code>images/order-delivered.webp</code>
            </div>
          `
      }
    </div>
  `;
}
function formatCustomerMilestone(value, type) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const options = {
    timeZone: 'Asia/Kolkata'
  };
  if (type === 'date') {
    return date.toLocaleDateString('en-GB', {
      ...options,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }
  return date.toLocaleTimeString('en-IN', {
    ...options,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}
/* ==========================================
   CUSTOMER CANCELLATION — 4-HOUR DEADLINE
   ========================================== */
const CUSTOMER_CANCEL_WINDOW_MS = 4 * 60 * 60 * 1000;
function getCustomerCancelDeadline(order) {
  const createdAt = Date.parse(order?.created_at || "");
  if (!Number.isFinite(createdAt)) {
    return null;
  }
  return createdAt + CUSTOMER_CANCEL_WINDOW_MS;
}
function customerCancellationWindowOpen(order) {
  const deadline = getCustomerCancelDeadline(order);
  return deadline !== null && Date.now() < deadline;
}
function scheduleCustomerCancellationExpiry(order) {
  // Clear any timer belonging to a previously viewed order.
  if (customerCancellationExpiryTimer !== null) {
    clearTimeout(customerCancellationExpiryTimer);
    customerCancellationExpiryTimer = null;
  }

  if (!customerCanCancel(order)) {
    return;
  }

  const deadline = getCustomerCancelDeadline(order);
  if (deadline === null) {
    return;
  }

  const remaining = deadline - Date.now();

  if (remaining <= 0) {
    return;
  }

  customerCancellationExpiryTimer = window.setTimeout(() => {
    customerCancellationExpiryTimer = null;

    if (customerDisplayedOrder !== order) {
      return;
    }

    const actions = result.querySelector(
      ".customer-order-actions"
    );

    if (actions) {
      actions.outerHTML = renderCustomerOrderAction(order);
    }
    if (
    customerCancelOverlay &&
    !customerCancelOverlay.hidden
  ) {
    resetCustomerCancelVerification();

    showCustomerCancelError(
      "The 4-hour cancellation window has expired. This order can no longer be cancelled."
    );

    customerCancelVerify.disabled = true;
    customerCancelPhone.disabled = true;
    customerCancelReason.disabled = true;

    updateCustomerCancelButton();
  }
  }, remaining);
}
function formatCustomerCancelDeadline(order) {
  const deadline = getCustomerCancelDeadline(order);
  if (deadline === null) {
    return "Not available";
  }
  const date = new Date(deadline);
  return (
    formatCustomerMilestone(date, "date") +
    " at " +
    formatCustomerMilestone(date, "time") +
    " IST"
  );
}

const CUSTOMER_ASSISTANCE_WINDOW_MS =
  7 * 24 * 60 * 60 * 1000;

function getCustomerAssistanceDeadline(order) {
  const deliveredEntry = (
    Array.isArray(order?.timeline)
      ? order.timeline
      : []
  ).find(entry =>
    entry.status === "Delivered" &&
    entry.changed_at
  );

  if (!deliveredEntry) return null;

  const deliveredAt = Date.parse(
    deliveredEntry.changed_at
  );

  if (!Number.isFinite(deliveredAt)) {
    return null;
  }

  return deliveredAt + CUSTOMER_ASSISTANCE_WINDOW_MS;
}

function customerAssistanceWindowOpen(order) {
  if (String(order?.status || "").trim() !== "Delivered") {
    return false;
  }

  const deadline = getCustomerAssistanceDeadline(order);

  return deadline !== null && Date.now() < deadline;
}

function scheduleCustomerAssistanceExpiry(order) {
  if (customerAssistanceExpiryTimer !== null) {
    clearTimeout(customerAssistanceExpiryTimer);
    customerAssistanceExpiryTimer = null;
  }

  if (!customerAssistanceWindowOpen(order)) {
    return;
  }

  const deadline = getCustomerAssistanceDeadline(order);
  if (deadline === null) return;

  const remaining = deadline - Date.now();
  if (remaining <= 0) return;

  customerAssistanceExpiryTimer = window.setTimeout(() => {
    customerAssistanceExpiryTimer = null;

    if (customerDisplayedOrder !== order) {
      return;
    }

    const actions = result.querySelector(
      ".customer-order-actions"
    );

    if (actions) {
      actions.outerHTML = renderCustomerOrderAction(order);
    }
  }, remaining);
}


function renderCustomerOrderAction(order) { 
    const status = String(order.status || '').trim();
    const beforeShipping =
    ['New', 'Processing'].includes(status);    
    if (beforeShipping && customerCancellationWindowOpen(order)) {
      return `
        <div class="customer-order-actions">

          <button
            type="button"
            id="customer-cancel-order-btn"
            class="customer-cancel-order-btn"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="9"/>
              <path d="M9 9l6 6M15 9l-6 6"/>
            </svg>
            Cancel Order
          </button>

          <div class="customer-cancel-deadline">
            Cancellation available until
            <strong>${escapeHtml(formatCustomerCancelDeadline(order))}.</strong>
            <a
              href="cancellation-policy.html"
              class="customer-cancellation-policy-link" target="_blank" rel="noopener noreferrer"
            >View Cancellation Policy🔗</a>
          </div>

        </div>
      `;
    } 
    if (beforeShipping && !customerCancellationWindowOpen(order)) {
    return `
        <div class="customer-order-shipped-info">
        <span>
            The 4-hour cancellation window for this order
            has expired. Cancellation closed on
            <strong>${escapeHtml(formatCustomerCancelDeadline(order))}</strong>. 
            <br>You may initiate return/refund once the order is delivered.
            <br>View <strong><a href="cancellation-policy.html" target="_blank" rel="noopener noreferrer">Cancellation</a></strong> policy.
            <br>View <strong><a href="refund-return-policy.html" target="_blank" rel="noopener noreferrer">Refund &amp; Return</a></strong> policy.            
        </span>
        </div>
    `;
    }
if (status === 'Packed') {
  return `
    <div class="customer-order-shipped-info">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9"/>
        <path d="M12 11v5M12 8h.01"/>
      </svg>
      <span>
        Cancellation no longer available. You may request a return
        or refund after delivery. For more details, please
        refer to our
        <a href="refund-return-policy.html" target="_blank" rel="noopener noreferrer">
          Return &amp; Refund Policy
        </a>.
      </span>
    </div>
  `;
}
  
if (status === 'Delivered') { 
  if (!customerAssistanceWindowOpen(order)) {
    return `
      <div class="customer-order-shipped-info">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9"/>
          <path d="M12 11v5M12 8h.01"/>
        </svg>

        <span>
          <strong>Standard request window has closed.</strong>
          <br>
          The 7-day return, refund and replacement request period
          for this order has ended. For product defects,
          incorrect items, or other concerns, please contact
          <a href="#customer-support"><strong>Customer Support</strong></a>.
          <br>
          View our
          <a href="refund-return-policy.html" target="_blank"
            rel="noopener noreferrer">
            Refund &amp; Return Policy
          </a>.
        </span>
      </div>
    `;
  }

  return `
    <div class="customer-order-actions">     
      <div class="customer-order-assistance">

        <button
          type="button"
          class="customer-return-request-btn"
          id="customer-assistance-toggle"
          aria-expanded="false"
          aria-controls="customer-assistance-menu"
        >
          <svg
            class="assistance-help-icon"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M11 12h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 14"/>
            <path d="m7 18 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.75-2.91l-4.2 3.9"/>
            <path d="m2 13 6 6"/>
          </svg>

          <span>Order Assistance</span>

          <svg
            class="assistance-chevron"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="m6 9 6 6 6-6"/>
          </svg>
        </button>

        <div
          id="customer-assistance-menu"
          class="customer-assistance-menu"
          hidden
        >
          <button type="button" class="customer-assistance-option">
            Request Return
          </button>
          <button type="button" class="customer-assistance-option">
            Request Refund
          </button>
          <button type="button" class="customer-assistance-option">
            Request Replacement
          </button>
        </div>

        <div class="customer-assistance-policy">
          <a
            href="refund-return-policy.html"
            target="_blank"
            rel="noopener noreferrer"
          >
            View Return &amp; Refund Policy
          </a>
        </div>

      </div>
    </div>
  `;
}

  return '';
}
function renderCustomerTrackingCopy(order) {
  const trackingId = String(order.tracking_id || "").trim();
  if (!trackingId) return "";
  return `
    <button
      type="button"
      class="customer-tracking-copy-btn"
      data-tracking-id="${escapeHtml(trackingId)}"
      title="Copy Tracking ID"
      aria-label="Copy Tracking ID"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <rect x="8" y="8" width="12" height="12" rx="2"/>
        <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>
      </svg>
    </button>
    <span class="customer-tracking-copy-feedback"
          role="status"
          aria-live="polite"></span>
  `;
}
function renderCustomerTrackingInfo(order) {
  if (String(order.tracking_id || '').trim()) {
    return '';
  }
  return `
    <span class="customer-tracking-info">
      <button
        type="button"
        class="customer-tracking-info-btn"
        aria-label="Tracking ID information"
        aria-expanded="false"
        aria-describedby="customer-tracking-tooltip"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9"/>
          <path d="M12 11v5M12 8h.01"/>
        </svg>
      </button>
      <span
        id="customer-tracking-tooltip"
        class="customer-tracking-tooltip"
        role="tooltip"
        hidden
      >
        Your tracking ID will be available once your
        order has been shipped. We'll also send it
        to your registered email address.
      </span>
    </span>
  `;
}
function formatCustomerEta(value) {
  if (typeof value !== "string") return "";

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return "";

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const date = new Date(Date.UTC(year, month - 1, day));

  // Reject invalid calendar dates.
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return "";
  }

  const suffix =
    day >= 11 && day <= 13
      ? "th"
      : day % 10 === 1
        ? "st"
        : day % 10 === 2
          ? "nd"
          : day % 10 === 3
            ? "rd"
            : "th";

  const monthName = date.toLocaleString("en-GB", {
    month: "long",
    timeZone: "UTC"
  });

  return `${day}${suffix} ${monthName} ${year}`;
}
function renderCustomerTimeline(order) {
  const status = String(order.status || 'New');  
  const etaDate = formatCustomerEta(order.estimated_delivery_date);
  const etaHtml =
    etaDate && !['Delivered', 'Cancelled'].includes(status)
      ? `<div class="customer-estimated-delivery">
           Estimated delivery: <strong>${escapeHtml(etaDate)}</strong>
         </div>`
      : '';
  const currentIndex = customerOrderStages.indexOf(status);
    const deliveredHeroHtml =
    status === "Delivered"
      ? renderCustomerDeliveredHero(order)
      : "";
  const history = new Map();
  (Array.isArray(order.timeline) ? order.timeline : [])
    .forEach(entry => {
      if (
        customerOrderStages.includes(entry.status) &&
        entry.changed_at &&
        !history.has(entry.status)
      ) {
        history.set(entry.status, entry.changed_at);
      }
    });
  const steps = customerOrderStages.map((stage, index) => {
    const completed = currentIndex >= index;
    const timestamp = history.get(stage);
    const icon = `
      <svg viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true">
        ${customerTimelineIcons[stage]}
      </svg>
    `;
    return `
      <div class="customer-timeline-step ${completed ? 'completed' : ''}">
        <div class="customer-timeline-icon">
          ${icon}
        </div>
        <span class="customer-timeline-name">
          ${escapeHtml(stage)}
        </span>
        <span class="customer-timeline-date">
          ${formatCustomerMilestone(timestamp, 'date')}
        </span>
        ${
          timestamp
            ? `<span class="customer-timeline-time">
                ${formatCustomerMilestone(timestamp, 'time')}
              </span>`
            : ''
        }
      </div>
    `;
  }).join('');
  return `
    <div class="customer-tracking-card">
      <div class="customer-tracking-header">
        <div>
          <div class="customer-tracking-eyebrow">
            Order Tracking
          </div>
          <h2>${escapeHtml(order.order_id || '')}</h2>
<div class="customer-tracking-id">
  Tracking ID:
  <strong>
    ${
      order.tracking_id
        ? escapeHtml(order.tracking_id)
        : 'Not available yet'
    }
  </strong>
  ${renderCustomerTrackingInfo(order)}
  ${renderCustomerTrackingCopy(order)}
</div>
${renderCustomerPaymentBadges(order)}
</div>
        <span class="customer-status-badge status-${escapeHtml(status.toLowerCase())}">
          ${escapeHtml(status)}
        </span>
      </div>
      ${etaHtml}
      ${deliveredHeroHtml}
      <div class="customer-timeline customer-timeline-with-hero" style="--bp-progress: ${currentIndex < 0 ? 0 : Math.min(1, currentIndex / 4)};">
        <div class="customer-timeline-progress" aria-hidden="true"></div>
        
        ${steps}
      </div>      
        ${
          status.trim().toLowerCase() === "delivered"
            ? `
              <div class="customer-review-action">
                ${
                  order.review_submitted === true
                    ? `
                      <p class="customer-review-prompt">
                        Thank you for your review!
                      </p>
                    `
                    : `
                      <p class="customer-review-prompt">
                        How was your experience?
                      </p>

                      <button
                        type="button"
                        id="customer-rate-order-btn"
                        class="customer-rate-order-btn"
                      >
                        <span aria-hidden="true">☆</span>
                        Rate This Order
                      </button>
                    `
                }
              </div>
            `
            : ""
        }

    </div>
  `;
}

function renderCustomerShippingAddress(order) {
  const address = order.shipping_address || {};
  const addressLines = [
    address.address1,
    address.address2
  ]
    .filter(value =>
      typeof value === 'string' && value.trim()
    )
    .map(value => `
      <div class="customer-address-line">
        ${escapeHtml(value)}
      </div>
    `)
    .join('');
  const location = [
    address.city,
    address.state,
    address.pincode
  ]
    .filter(value =>
      typeof value === 'string' && value.trim()
    )
    .map(value => escapeHtml(value))
    .join(', ');
  const country = address.country
    ? `
      <div class="customer-address-line">
        ${escapeHtml(address.country)}
      </div>
    `
    : '';
  const landmark = (
    typeof address.landmark === 'string'
      ? address.landmark.trim()
      : ''
  );
  const landmarkHtml = landmark
    ? `
      <div class="customer-address-line">
        Landmark: ${escapeHtml(landmark)}
      </div>
    `
    : '';
  if (
    !addressLines &&
    !location &&
    !country &&
    !landmarkHtml
  ) {
    return `
      <div class="customer-address-empty">
        Shipping address not available.
      </div>
    `;
  }
  return `
    <div class="customer-address">
      ${addressLines}
      ${
        location
          ? `<div class="customer-address-line">${location}</div>`
          : ''
      }
      ${country}
      ${landmarkHtml}
    </div>
  `;
}
function renderCustomerPaymentBadges(order) {
  const paymentStatus =
    String(order.payment_status || 'Pending');
  const paymentMethod =
    String(order.payment_method || '—');
  const normalizedMethod =
    paymentMethod.trim().toLowerCase();
  const methodClass =
    ['cod', 'cash on delivery'].includes(normalizedMethod)
      ? 'method-cod'
      : ['online', 'online payment'].includes(normalizedMethod)
        ? 'method-online'
        : '';
const normalizedStatus = paymentStatus.trim().toLowerCase();
const isPaymentCompleted =
  ['paid', 'completed'].includes(normalizedStatus);
const statusClass = isPaymentCompleted
  ? 'payment-completed'
  : 'payment-pending';
const paymentStatusLabel = isPaymentCompleted
  ? 'Payment Completed'
  : normalizedStatus === 'pending'
    ? 'Payment Pending'
    : `Payment: ${paymentStatus}`;
  return `
    <div class="customer-payment-badges">
<span class="customer-payment-badge ${statusClass}">
  ${escapeHtml(paymentStatusLabel)}
</span>
      <span class="customer-payment-badge ${methodClass}">
        ${escapeHtml(paymentMethod)}
      </span>
    </div>
  `;
}
function renderCustomerInformation(order) {
  const info = order.customer_info || {};
  function infoRow(icon, value) {
    if (!value || !String(value).trim()) {
      return '';
    }
    return `
      <div class="customer-info-row">
        <img
          src="images/admin-icons/${icon}.png"
          class="customer-info-icon"
          alt=""
          aria-hidden="true"
        >
        <span class="customer-info-value">
          ${escapeHtml(value)}
        </span>
      </div>
    `;
  }
  return `
    <div class="customer-detail-card">
      <h3>Customer Information</h3>
      <div class="customer-info-list">
        ${infoRow('customer', info.name)}
        ${infoRow('email', info.email)}
        ${infoRow('phone', info.phone)}
        ${
          info.alternate_phone
            ? infoRow('phone', info.alternate_phone)
            : ''
        }
      </div>
    </div>
  `;
}
function renderCustomerOrderNotes(order) {
  const notes = String(order.order_notes || '').trim();
  return `
    <div class="customer-detail-card customer-notes-card">
      <h3>Order Notes</h3>
      <div class="customer-notes-content ${
        notes ? '' : 'customer-notes-empty'
      }">
        ${
          notes
            ? escapeHtml(notes)
            : 'No notes provided'
        }
      </div>
    </div>
  `;
}
function renderCustomerPaymentDetails(order) {
  return `
    <div class="customer-order-details">
      ${renderCustomerInformation(order)}
<div class="customer-detail-card">
  <h3>Shipping Information</h3>
  ${renderCustomerShippingAddress(order)}
</div>
      ${renderCustomerOrderNotes(order)}
    </div>
  `;
}
function customerMoney(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return '—';
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}
function customerProductImagePlaceholder() {
  return `
    <span
      class="customer-product-image-placeholder"
      aria-label="Product image unavailable"
    >
      <svg viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <path d="m21 15-5-5L5 21"/>
      </svg>
    </span>
  `;
}
function renderCustomerProductImage(item) {
  const imageUrl = String(item.image_url || '').trim();
  if (!imageUrl) {
    return customerProductImagePlaceholder();
  }
  // Allow local catalogue paths and HTTPS images.
  // Reject scripts, data URLs and protocol-relative URLs.
  if (
    imageUrl.startsWith('//') ||
    !(
      imageUrl.startsWith('images/') ||
      imageUrl.startsWith('/images/') ||
      /^https:\/\//i.test(imageUrl)
    )
  ) {
    return customerProductImagePlaceholder();
  }
  return `
    <img
      class="customer-product-image"
      src="${escapeHtml(imageUrl)}"
      alt="${escapeHtml(item.product_name || 'Product')}"
      loading="lazy"
      data-customer-product-image
    >
  `;
}

/* CUSTOMER REVIEW — OVERALL ORDER RATING */

function renderCustomerReviewOrderStars() {
  const container = document.getElementById(
    "customer-review-order-stars"
  );

  if (!container) return;

  container.innerHTML = [1, 2, 3, 4, 5]
    .map((value) => `
      <button
        type="button"
        class="customer-review-star ${
          value <= (customerReviewOrderRating || 0)
            ? "is-selected"
            : ""
        }"
        data-order-review-rating="${value}"
        aria-label="Rate order ${value} out of 5"
        aria-pressed="${customerReviewOrderRating === value}"
      >★</button>
    `)
    .join("");
}

const customerReviewOrderStars = document.getElementById(
  "customer-review-order-stars"
);

if (customerReviewOrderStars) {
  customerReviewOrderStars.addEventListener("click", (event) => {
    const button = event.target.closest(
      "[data-order-review-rating]"
    );

    if (!button) return;
    if (customerReviewSubmitting) return;

    const rating = Number(button.dataset.orderReviewRating);

    if (
      !Number.isInteger(rating) ||
      rating < 1 ||
      rating > 5
    ) {
      return;
    }

    customerReviewOrderRating =
      customerReviewOrderRating === rating
        ? null
        : rating;

    renderCustomerReviewOrderStars();
    updateCustomerReviewSubmitButton();
  });
}

/* CUSTOMER REVIEW — PRODUCT RATINGS */

function renderCustomerReviewProducts(order) {
  const list = document.getElementById(
    "customer-review-products-list"
  );

  if (!list) return;

  const items = Array.isArray(order?.items)
    ? order.items
    : [];

  list.innerHTML = items.map((item) => {
    const itemId = Number(item.order_item_id);

    if (!Number.isSafeInteger(itemId) || itemId <= 0) {
      return "";
    }

    const selected =
      customerReviewProductRatings.get(itemId) || 0;

    const stars = [1, 2, 3, 4, 5].map((value) => `
      <button
        type="button"
        class="customer-review-star ${value <= selected ? "is-selected" : ""}"
        data-review-item-id="${itemId}"
        data-review-rating="${value}"
        aria-label="Rate ${escapeHtml(item.product_name || "Product")} ${value} out of 5"
        aria-pressed="${selected === value}"
      >★</button>
    `).join("");

    return `
      <div class="customer-review-product-row">
        ${renderCustomerProductImage(item)}

        <div class="customer-review-product-info">
          <div class="customer-review-product-name">
            ${escapeHtml(item.product_name || "Product deleted")}
          </div>

          <div class="customer-review-product-stars">
            ${stars}
          </div>
        </div>
      </div>
    `;
  }).join("");

  if (!list.innerHTML.trim()) {
    list.innerHTML = `
      <p class="customer-review-no-products">
        No purchased products available.
      </p>
    `;
  }
}

/* CUSTOMER REVIEW — MODAL CONTROLS */

const customerReviewOverlay = document.getElementById(
  "customer-review-overlay"
);
const customerReviewText = document.getElementById(
  "customer-review-text"
);
const customerReviewSubmit = document.getElementById(
  "customer-review-submit"
);

let customerReviewPreviousFocus = null;
let customerReviewSubmitting = false;

function updateCustomerReviewSubmitButton() {
  if (!customerReviewSubmit) return;

  const hasProductRating =
    customerReviewProductRatings.size > 0;

  const hasOrderRating =
    customerReviewOrderRating !== null;

  const hasComment =
    Boolean(customerReviewText?.value.trim());

  customerReviewSubmit.disabled =
  customerReviewSubmitting ||
  !(
    hasProductRating ||
    hasOrderRating ||
    hasComment
  );
}

function openCustomerReviewModal() {
  if (
    !customerReviewOverlay ||
    !customerDisplayedOrder ||
    String(customerDisplayedOrder.status).trim() !== "Delivered" ||
    customerDisplayedOrder.review_submitted === true
  ) {
    return;
  }

  customerReviewPreviousFocus = document.activeElement;

  document.getElementById(
    "customer-review-order-id"
  ).textContent = customerDisplayedOrder.order_id || "";
  
  renderCustomerReviewProducts(customerDisplayedOrder);
  renderCustomerReviewOrderStars();
  updateCustomerReviewSubmitButton();
  showCustomerReviewError("");

  customerReviewOverlay.hidden = false;

  document.body.style.overflow = "hidden";

  document.getElementById(
    "customer-review-close"
  )?.focus();
}

function closeCustomerReviewModal() {
  if (!customerReviewOverlay || customerReviewSubmitting) return;

  customerReviewOverlay.hidden = true;
  document.body.style.overflow = "";

  customerReviewPreviousFocus?.focus();
}

document.getElementById(
  "customer-review-close"
)?.addEventListener("click", closeCustomerReviewModal);

document.getElementById(
  "customer-review-cancel"
)?.addEventListener("click", closeCustomerReviewModal);

customerReviewOverlay?.addEventListener("click", (event) => {
  if (event.target === customerReviewOverlay) {
    closeCustomerReviewModal();
  }
});


document.addEventListener("keydown", (event) => {
  if (
    !customerReviewOverlay ||
    customerReviewOverlay.hidden
  ) {
    return;
  }

  if (event.key === "Escape") {
    event.preventDefault();
    closeCustomerReviewModal();
    return;
  }

  if (event.key !== "Tab") return;

  const modal = customerReviewOverlay.querySelector(
    ".customer-review-modal"
  );

  if (!modal) return;

  const focusable = Array.from(
    modal.querySelectorAll(
      'button:not([disabled]), ' +
      'textarea:not([disabled]), ' +
      'input:not([disabled]), ' +
      'select:not([disabled]), ' +
      'a[href], [tabindex]:not([tabindex="-1"])'
    )
  ).filter(element =>
    element.getClientRects().length > 0 &&
    element.getAttribute("aria-hidden") !== "true"
  );

  if (!focusable.length) {
    event.preventDefault();
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (event.shiftKey) {
    if (
      document.activeElement === first ||
      !modal.contains(document.activeElement)
    ) {
      event.preventDefault();
      last.focus();
    }
  } else if (
    document.activeElement === last ||
    !modal.contains(document.activeElement)
  ) {
    event.preventDefault();
    first.focus();
  }
});

result.addEventListener("click", (event) => {
  if (event.target.closest("#customer-rate-order-btn")) {
    openCustomerReviewModal();
  }
});

customerReviewText?.addEventListener(
  "input",
  updateCustomerReviewSubmitButton
);

/* CUSTOMER REVIEW — SUPABASE SUBMISSION */

const customerReviewError = document.getElementById(
  "customer-review-error"
);

function showCustomerReviewError(message) {
  if (!customerReviewError) return;

  customerReviewError.textContent = message;
  customerReviewError.hidden = !message;
}

function finishCustomerReviewSubmission() {
  customerDisplayedOrder.review_submitted = true;

  const reviewAction = result.querySelector(
    ".customer-review-action"
  );

  if (reviewAction) {
    reviewAction.innerHTML = `
      <p class="customer-review-prompt">
        Thank you for your review!
      </p>
    `;
  }

  customerReviewProductRatings.clear();
  customerReviewOrderRating = null;

  if (customerReviewText) {
    customerReviewText.value = "";
  }
}

async function submitCustomerReview() {
  if (
    customerReviewSubmitting ||
    !customerDisplayedOrder ||
    customerDisplayedOrder.review_submitted === true ||
    customerReviewSubmit?.disabled
  ) {
    return;
  }

  const orderId = String(
    customerDisplayedOrder.order_id || ""
  ).trim();

  // Use the email from the successful order lookup,
  // not the current editable input or masked customer_info.email.
  const email = customerVerifiedOrderEmail || "";

  const productRatings = Array.from(
    customerReviewProductRatings.entries()
  ).map(([orderItemId, rating]) => ({
    order_item_id: orderItemId,
    rating
  }));

  if (!orderId || !email) {
    showCustomerReviewError(
      "Order verification details are unavailable."
    );
    return;
  }

  customerReviewSubmitting = true;
  showCustomerReviewError("");
  
  customerReviewSubmit.disabled = true;
  customerReviewSubmit.textContent = "Submitting...";

  if (customerReviewText) {
    customerReviewText.readOnly = true;
  }

  try {
    const { data, error } =
      await window.bpSupabase.functions.invoke(
        "customer-review-submit",
        {
          body: {
            order_id: orderId,
            email,
            rating: customerReviewOrderRating,
            review_text: customerReviewText.value.trim(),
            product_ratings: productRatings
          }
        }
      );

    let response = data;

    if (error) {
      if (error.context instanceof Response) {
        try {
          response = await error.context.clone().json();
        } catch {
          // Keep the fallback error.
        }
      }

      if (
        !response ||
        typeof response !== "object" ||
        !response.status
      ) {
        throw new Error(
          "Unable to submit your review. Please try again."
        );
      }
    }

    if (
      response?.status === "submitted" ||
      response?.status === "already_submitted"
    ) {
      finishCustomerReviewSubmission();

      // Release the busy state before closing.
      customerReviewSubmitting = false;
      closeCustomerReviewModal();
      return;
    }

    const messages = {
      invalid_order:
        "Unable to verify your order details.",
      not_eligible:
        "This order is not eligible for review.",
      invalid_feedback:
        "Please check your ratings and feedback."
    };

    throw new Error(
      messages[response?.status] ||
      "Unable to submit your review. Please try again."
    );

  } catch (error) {
    showCustomerReviewError(
      error?.message ||
      "Unable to submit your review. Please try again."
    );
  
  } finally {
    customerReviewSubmitting = false;

    if (customerReviewText) {
      customerReviewText.readOnly = false;
    }

    customerReviewSubmit.textContent = "Submit Review";
    updateCustomerReviewSubmitButton();
  }
}

customerReviewSubmit?.addEventListener(
  "click",
  submitCustomerReview
);

const customerReviewProductsList = document.getElementById(
  "customer-review-products-list"
);

if (customerReviewProductsList) {
  customerReviewProductsList.addEventListener(
    "click",
    (event) => {
      const button = event.target.closest(
        ".customer-review-star"
      );

      if (!button) return;
      if (customerReviewSubmitting) return;

      const itemId = Number(button.dataset.reviewItemId);
      const rating = Number(button.dataset.reviewRating);

      if (
        !Number.isSafeInteger(itemId) ||
        itemId <= 0 ||
        !Number.isInteger(rating) ||
        rating < 1 ||
        rating > 5
      ) {
        return;
      }

      const previous =
        customerReviewProductRatings.get(itemId) || 0;

      if (previous === rating) {
        customerReviewProductRatings.delete(itemId);
      } else {
        customerReviewProductRatings.set(itemId, rating);
      }

      renderCustomerReviewProducts(customerDisplayedOrder);
      updateCustomerReviewSubmitButton();
    }
  );

  customerReviewProductsList.addEventListener(
    "error",
    (event) => {
      const img = event.target;

      if (
        img instanceof HTMLImageElement &&
        img.matches("[data-customer-product-image]")
      ) {
        img.outerHTML = customerProductImagePlaceholder();
      }
    },
    true
  );
}

function renderCustomerOrderBreakdown(order) {
  const items = Array.isArray(order.items)
    ? order.items
    : [];
  const productsHtml = items.length
    ? items.map((item, index) => {
        const quantity = Number(item.quantity) || 0;
        const basePrice = Number(item.base_price) || 0;
        const baseLineTotal = Number(
          (basePrice * quantity).toFixed(2)
        );
        const gstRate = Number(item.gst_rate) || 0;
        const productGST = Number(item.gst_amount) || 0;
        const handlingClass =
          item.handling_class
            ? String(item.handling_class) === "ExtraHeavy"
              ? "Extra Heavy"
              : String(item.handling_class)
            : "Not recorded";
        const hasHandlingRate =
          item.handling_rate !== null &&
          item.handling_rate !== undefined;
        const handlingRate =
          hasHandlingRate
            ? Number(item.handling_rate)
            : null;
        const handlingAmount =
          Number(item.handling_amount) || 0;
        const handlingGST =
          Number(item.handling_gst_amount) || 0;
        // The saved line_total already includes product GST.
        // Handling charges are saved separately.
        const savedLineTotal = Number(item.line_total);
        const productLineTotal = Number((
          (Number.isFinite(savedLineTotal)
            ? savedLineTotal
            : baseLineTotal + productGST) +
          handlingAmount +
          handlingGST
        ).toFixed(2));
        const detailId =
          `customer-product-details-${index}`;
        return `
          <div class="customer-product-row">
            ${renderCustomerProductImage(item)}
            <div class="customer-product-info">
              <div class="customer-product-name">
                ${escapeHtml(item.product_name || "Product")}
              </div>
              <div class="customer-product-qty">
                Quantity: ${quantity}
                × ${customerMoney(basePrice)}
              </div>
            </div>
            <div class="customer-product-price-wrap">
              <div class="customer-product-price">
                ${customerMoney(baseLineTotal)}
              </div>
              <button
                type="button"
                class="customer-product-details-toggle"
                aria-expanded="false"
                aria-controls="${detailId}"
              >
                <span class="customer-product-toggle-text">
                  View details
                </span>
                <span
                  class="customer-product-toggle-arrow"
                  aria-hidden="true"
                >↓</span>
              </button>
            </div>
            <div
              class="customer-product-details-shell"
              id="${detailId}"
              aria-hidden="true"
            >
              <div class="customer-product-details-inner">
                <div class="customer-product-details-panel">
                  <div class="customer-product-details-heading">
                    Price Breakdown
                  </div>
                  <div class="customer-product-detail-line">
                    <span>Product Subtotal</span>
                    <span>${customerMoney(baseLineTotal)}</span>
                  </div>
                  <div class="customer-product-detail-line">
                    <span>Product GST (${gstRate}%)</span>
                    <span>${customerMoney(productGST)}</span>
                  </div>
                  <div class="customer-product-detail-divider"></div>
                  <div class="customer-product-detail-line">
                    <span>Handling Class</span>
                    <span>${escapeHtml(handlingClass)}</span>
                  </div>
                  <div class="customer-product-detail-line">
                    <span>Handling Rate</span>
                    <span>${
                      handlingRate === null
                        ? "Not recorded"
                        : `${customerMoney(handlingRate)} × ${quantity}`
                    }</span>
                  </div>
                  <div class="customer-product-detail-line">
                    <span>Handling Charge</span>
                    <span>${customerMoney(handlingAmount)}</span>
                  </div>
                  <div class="customer-product-detail-line">
                    <span>Handling GST (${gstRate}%)</span>
                    <span>${customerMoney(handlingGST)}</span>
                  </div>
                  <div class="customer-product-detail-divider"></div>
                  <div class="customer-product-detail-line customer-product-detail-total">
                    <span>Total Including GST & Handling</span>
                    <strong>${customerMoney(productLineTotal)}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;
      }).join("")
    : '<p>No purchased products found.</p>';
  return `
    <div class="customer-order-breakdown">
      <div class="customer-detail-card">
        <h3>Purchased Products</h3>
        <div class="customer-product-list">
          ${productsHtml}
        </div>
        <div class="customer-price-note">
          Product prices shown before GST.
        </div>
      </div>      
        <div class="customer-detail-card">
        <h3>Order Summary</h3>
        <div class="customer-summary-row">
            <span>Base Subtotal</span>
            <span>${customerMoney(order.base_subtotal)}</span>
        </div>
        <div class="customer-summary-row">
            <span>Product GST</span>
            <span>${customerMoney(order.gst_total)}</span>
        </div>
        <div class="customer-summary-row">
            <span>Handling Charge</span>
            <span>${customerMoney(order.handling_charge ?? 0)}</span>
        </div>
        <div class="customer-summary-row">
            <span>Handling GST</span>
            <span>${customerMoney(order.handling_gst_total ?? 0)}</span>
        </div>
        <div class="customer-summary-row">
            <span>Delivery Charge</span>
            <span>${customerMoney(order.delivery_charge)}</span>
        </div>
        <div class="customer-summary-row customer-summary-total">
            <span>Grand Total</span>
            <span>${customerMoney(order.total)}</span>
        </div>
        </div>
    </div>
  `;
}
function renderCustomerCancellation(order) {
  const cancelledAt = order.cancelled_at;
  const cancellationDate = cancelledAt
    ? `${formatCustomerMilestone(cancelledAt, 'date')} at ${formatCustomerMilestone(cancelledAt, 'time')} IST`
    : 'Date not available';
  const reason = String(order.cancellation_reason || '').trim();
  return `
    <div class="customer-tracking-card">
      <div class="customer-tracking-header">
        <div>
          <div class="customer-tracking-eyebrow">
            Order Tracking
          </div>
          <h2>${escapeHtml(order.order_id || '')}</h2>
<div class="customer-tracking-id">
  Tracking ID:
  <strong>
    ${
      order.tracking_id
        ? escapeHtml(order.tracking_id)
        : 'Not available yet'
    }
  </strong>
  ${renderCustomerTrackingInfo(order)}
  ${renderCustomerTrackingCopy(order)}
</div>
${renderCustomerPaymentBadges(order)}
</div>
        <span class="customer-status-badge status-cancelled">
          Cancelled
        </span>
      </div>
      <div class="customer-cancelled-panel">
        <div class="customer-cancelled-icon">
          <svg viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true">
            <path d="M21 8 12 3 3 8v9l9 5 9-5V8Z"/>
            <path d="m3 8 9 5 9-5M12 13v9"/>
            <path d="m9 14 6 6m0-6-6 6"/>
          </svg>
        </div>
        <h3 class="customer-cancelled-title">
          Order Cancelled
        </h3>
        <div class="customer-cancelled-date">
          ${escapeHtml(cancellationDate)}
        </div>
      </div>
      ${
        reason
          ? `
            <div class="customer-cancelled-reason">
              <div class="customer-cancelled-reason-label">
                Reason for cancellation
              </div>
              <div class="customer-cancelled-reason-value">
                ${escapeHtml(reason)}
              </div>
            </div>
          `
          : ''
      }
    </div>
  `;
}
  
async function trackOrder() {
  if (trackButton.disabled) return;

  const orderId = orderInput.value.trim();
  const email = emailInput.value.trim();

  showTrackError("");

  if (!orderId || !email) {
    showTrackError(
      "Please enter your Order ID and the email used for the order."
    );
    return;
  }

  setTrackLoading(true);

  try {
    const { data, error } =
      await window.bpSupabase.functions.invoke(
        "customer-order-lookup",
        {
          body: {
            order_id: orderId,
            email: email
          }
        }
      );

    if (error) {
      throw error;
    }

    const order = data?.order || null;

    if (!order) {
      showTrackError("Order not found.");
      return;
    }

    // Retain the email used for this successful lookup.
    customerVerifiedOrderEmail = email;

    showCustomerOrderWithTransition(order);

  } catch (err) {
    console.error("Order tracking failed:", err);

    let status = 0;

    if (err?.context instanceof Response) {
      status = err.context.status;
    }

    let message =
      "Unable to check your order right now. Please try again later.";

    if (status === 404) {
      message =
        "Order not found. Please check your Order ID and email.";
    } else if (status === 429) {
      message =
        "Too many attempts. Please wait a few minutes before trying again.";
    } else if (status === 400) {
      message =
        "Invalid request. Please check your details.";
    }

    showTrackError(message);

  } finally {
    setTrackLoading(false);
  }
}

/* CUSTOMER CANCELLATION MODAL — FUNCTIONAL */
const customerCancelOverlay =
  document.getElementById("customer-cancel-overlay");
const customerCancelPhone =
  document.getElementById("customer-cancel-phone");
const customerCancelReason =
  document.getElementById("customer-cancel-reason");
const customerCancelVerify =
  document.getElementById("customer-cancel-verify");
const customerCancelSpinner =
  document.getElementById("customer-cancel-spinner");
const customerCancelYes =
  document.getElementById("customer-cancel-yes");
const customerCancelStatus =
  document.getElementById(
    "customer-cancel-verification-status"
  );
const customerCancelError =
  document.getElementById("customer-cancel-error");
const customerCancelClose =
  document.getElementById("customer-cancel-close");
const customerCancelNo =
  document.getElementById("customer-cancel-no");
let customerCancelGrant = null;
let customerCancelGrantExpires = 0;
let customerCancelOrder = null;
let customerCancelBusy = false;
let customerCancelVerifying = false;
let customerCancelRequestId = 0;
const customerCancellableStatuses = [
  "New",
  "Processing",
];
function customerCanCancel(order) {
  return Boolean(
    order &&
    customerCancellableStatuses.includes(
      String(order.status || "").trim()
    ) &&
    customerCancellationWindowOpen(order)
  );
}
function showCustomerCancelError(message) {
  customerCancelError.textContent = message;
  customerCancelError.hidden = !message;
}
function setCustomerCancelStatus(type, message) {
  customerCancelStatus.className =
    "customer-cancel-verification-status";
  if (type) {
    customerCancelStatus.classList.add(type);
  }
  const symbol =
    type === "verified" ? "✓" :
    type === "not-verified" ? "✕" : "";
  customerCancelStatus.textContent =
    symbol ? symbol + " " + message : message;
}
function updateCustomerCancelButton() {
  const grantValid =
    Boolean(customerCancelGrant) &&
    Date.now() < customerCancelGrantExpires;
  customerCancelYes.disabled =
    customerCancelBusy ||
    customerCancelVerifying ||
    !grantValid ||
    !customerCancelReason.value.trim();
}
function resetCustomerCancelVerification() {
  customerCancelGrant = null;
  customerCancelGrantExpires = 0;
  setCustomerCancelStatus("", "");
  updateCustomerCancelButton();
}
function setCustomerCancelBusy(busy) {
  customerCancelBusy = busy;
  customerCancelPhone.disabled = busy;
  customerCancelReason.disabled = busy;
  customerCancelClose.disabled = busy;
  customerCancelNo.disabled = busy;
  customerCancelYes.textContent = busy
    ? "Cancelling Order..."
    : "Yes, Cancel Order";
  updateCustomerCancelButton();
}
function openCustomerCancelModal() {
  if (customerCancelBusy || customerCancelVerifying) {
    return;
  }
  if (!customerCanCancel(customerDisplayedOrder)) {
    return;
  }
  customerCancelOrder = {
    order_id: String(customerDisplayedOrder.order_id),
    email: emailInput.value.trim()
  };
  customerCancelRequestId++;
  customerCancelPhone.value = "";
  customerCancelReason.value = "";
  customerCancelPhone.readOnly = false;
  customerCancelVerify.disabled = false;
  customerCancelSpinner.hidden = true;
  showCustomerCancelError("");
  resetCustomerCancelVerification();
  customerCancelOverlay.hidden = false;
  document.body.style.overflow = "hidden";
  customerCancelPhone.focus();
}
function closeCustomerCancelModal() {
  if (customerCancelBusy || customerCancelVerifying) {
    return;
  }
  customerCancelRequestId++;
  customerCancelOverlay.hidden = true;
  document.body.style.overflow = "";
  customerCancelPhone.value = "";
  customerCancelReason.value = "";
  customerCancelPhone.readOnly = false;
  customerCancelOrder = null;
  showCustomerCancelError("");
  resetCustomerCancelVerification();
}
async function customerCancelInvoke(body) {
  const { data, error } =
    await window.bpSupabase.functions.invoke(
      "customer-order-cancel",
      { body }
    );
  if (error) {
    let serverMessage = "";
    if (error.context instanceof Response) {
      try {
        const details =
          await error.context.clone().json();
        serverMessage = String(details?.error || "");
      } catch {
        // Use the fallback message.
      }
    }
    throw new Error(
      serverMessage ||
      "Unable to complete this request. Please try again."
    );
  }
  return data;
}
async function verifyCustomerCancelPhone() {
  if (
    customerCancelBusy ||
    customerCancelVerifying ||
    !customerCancelOrder
  ) {
    return;
  }
  const phone = customerCancelPhone.value.trim();
  if (!/^\d{10}$/.test(phone)) {
    resetCustomerCancelVerification();
    setCustomerCancelStatus(
      "not-verified",
      "Not Verified"
    );
    showCustomerCancelError(
      "Enter a valid 10-digit registered phone number."
    );
    return;
  }
  const requestId = ++customerCancelRequestId;
  customerCancelVerifying = true;
  customerCancelVerify.disabled = true;
  customerCancelPhone.disabled = true;
  customerCancelSpinner.hidden = false;
  resetCustomerCancelVerification();
  showCustomerCancelError("");
  updateCustomerCancelButton();
  try {
    const data = await customerCancelInvoke({
      action: "verifyPhone",
      order_id: customerCancelOrder.order_id,
      email: customerCancelOrder.email,
      phone
    });
    if (requestId !== customerCancelRequestId) {
      return;
    }
    if (
      data?.success !== true ||
      data?.verified !== true ||
      typeof data.verification_grant !== "string" ||
      !/^[0-9a-f]{64}$/.test(data.verification_grant)
    ) {
      throw new Error("Phone verification unsuccessful.");
    }
    customerCancelGrant = data.verification_grant;
    customerCancelGrantExpires =
      Date.now() + 300 * 1000;
    const currentGrant = customerCancelGrant;
    window.setTimeout(() => {
      if (customerCancelGrant !== currentGrant) {
        return;
      }
      if (Date.now() >= customerCancelGrantExpires) {
        resetCustomerCancelVerification();
        customerCancelPhone.readOnly = false;
        customerCancelVerify.disabled = false;
        setCustomerCancelStatus(
          "not-verified",
          "Verification Expired"
        );
      }
    }, 300000);
    customerCancelPhone.readOnly = true;
    setCustomerCancelStatus(
      "verified",
      "Verified"
    );
  } catch (error) {
    if (requestId !== customerCancelRequestId) {
      return;
    }
    resetCustomerCancelVerification();
    setCustomerCancelStatus(
      "not-verified",
      "Not Verified"
    );
    showCustomerCancelError(
      error.message || "Phone verification unsuccessful."
    );
  } finally {
    if (requestId === customerCancelRequestId) {
      customerCancelVerifying = false;
      customerCancelPhone.disabled = false;
      customerCancelSpinner.hidden = true;
      customerCancelVerify.disabled =
        Boolean(customerCancelGrant);
      updateCustomerCancelButton();
    }
  }
}
async function confirmCustomerCancellation() {
  if (
    customerCancelBusy ||
    customerCancelVerifying ||
    !customerCancelOrder ||
    !customerCancelGrant
  ) {
    return;
  }
  if (
    !customerDisplayedOrder ||
    !customerCanCancel(customerDisplayedOrder)
  ) {
    showCustomerCancelError(
      "The cancellation window has expired or this order is no longer eligible for cancellation."
    );
    return;
  }
  const reason = customerCancelReason.value.trim();
if (reason.length > 200) {
  showCustomerCancelError(
    "Cancellation reason cannot exceed 200 characters."
  );
  return;
}
  if (!reason) {
    showCustomerCancelError(
      "Please provide a cancellation reason."
    );
    return;
  }
  if (Date.now() >= customerCancelGrantExpires) {
    resetCustomerCancelVerification();
    customerCancelPhone.readOnly = false;
    customerCancelVerify.disabled = false;
    showCustomerCancelError(
      "Phone verification has expired. Please verify again."
    );
    return;
  }
  const orderToCancel = { ...customerCancelOrder };
  const grant = customerCancelGrant;
  setCustomerCancelBusy(true);
  showCustomerCancelError("");
  try {
    const data = await customerCancelInvoke({
      action: "cancelOrder",
      order_id: orderToCancel.order_id,
      email: orderToCancel.email,
      verification_grant: grant,
      reason
    });
    if (
      data?.success !== true ||
      data?.status !== "Cancelled"
    ) {
      throw new Error(
        data?.error || "Unable to cancel this order."
      );
    }
    // The grant must never be reused.
    customerCancelGrant = null;
    customerCancelGrantExpires = 0;
    // Close after successful cancellation.
    setCustomerCancelBusy(false);
    closeCustomerCancelModal();
    // Fetch fresh server-side cancellation details.
    try {
      const { data: lookupData, error: lookupError } =
        await window.bpSupabase.functions.invoke(
          "customer-order-lookup",
          {
            body: {
              order_id: orderToCancel.order_id,
              email: orderToCancel.email
            }
          }
        );
      if (lookupError || !lookupData?.order) {
        throw new Error("Refresh unavailable.");
      }
      // Only transition after the server confirms cancellation and refreshes details.
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!reducedMotion) {
        result.classList.add("bp-cancellation-leaving");
        await new Promise(resolve => window.setTimeout(resolve, 180));
      }
      result.classList.remove("bp-cancellation-leaving");
      showCustomerOrderWithTransition(lookupData.order, { fromCancellation: true });
    } catch {
      // Cancellation has already succeeded.
      // Never send another cancellation request.
      customerDisplayedOrder = null;
      showResult(`
        <div class="customer-tracking-card">
          <h2>Order Cancelled</h2>
          <p>
            Your order was cancelled successfully.
            The latest tracking details could not
            be loaded automatically.
          </p>
          <p>
            Please refresh this page and track
            your order again.
          </p>
        </div>
      `);
    }
  } catch (error) {
    showCustomerCancelError(
      error.message ||
      "Unable to cancel your order. Please try again."
    );
    if (
      /expired|verify again/i.test(error.message || "")
    ) {
      resetCustomerCancelVerification();
      customerCancelPhone.readOnly = false;
      customerCancelVerify.disabled = false;
    }
  } finally {
    setCustomerCancelBusy(false);
  }
}
/* EVENT LISTENERS */
customerCancelPhone.addEventListener("input", () => {
  customerCancelPhone.value =
    customerCancelPhone.value.replace(/\D/g, "");
  resetCustomerCancelVerification();
  showCustomerCancelError("");
});
customerCancelReason.addEventListener(
  "input",
  updateCustomerCancelButton
);
customerCancelVerify.addEventListener(
  "click",
  verifyCustomerCancelPhone
);
customerCancelYes.addEventListener(
  "click",
  confirmCustomerCancellation
);
result.addEventListener("click", (event) => {
  const cancelButton = event.target.closest(
    "#customer-cancel-order-btn"
  );
  if (cancelButton) {
    openCustomerCancelModal();
  }
});

document.addEventListener("click", (event) => {
  const menu = result.querySelector(
    "#customer-assistance-menu"
  );

  const toggle = result.querySelector(
    "#customer-assistance-toggle"
  );

  if (!menu || !toggle || menu.hidden) return;

  if (
    toggle.contains(event.target) ||
    menu.contains(event.target)
  ) {
    return;
  }

  menu.hidden = true;
  toggle.setAttribute("aria-expanded", "false");
});

customerCancelClose.addEventListener(
  "click",
  closeCustomerCancelModal
);
customerCancelNo.addEventListener(
  "click",
  closeCustomerCancelModal
);
customerCancelOverlay.addEventListener("click", (event) => {
  if (event.target === customerCancelOverlay) {
    closeCustomerCancelModal();
  }
});
document.addEventListener("keydown", (event) => {
  if (
    event.key === "Escape" &&
    !customerCancelOverlay.hidden
  ) {
    closeCustomerCancelModal();
  }
});
/* TRACKING ID TOOLTIP INTERACTION */
result.addEventListener("mouseover", (event) => {
  const wrapper = event.target.closest(
    ".customer-tracking-info"
  );
  if (!wrapper) return;
  const tooltip = wrapper.querySelector(
    ".customer-tracking-tooltip"
  );
  if (tooltip) {
    tooltip.hidden = false;
    wrapper.querySelector(
      ".customer-tracking-info-btn"
    ).setAttribute("aria-expanded", "true");
  }
});
result.addEventListener("mouseout", (event) => {
  const wrapper = event.target.closest(
    ".customer-tracking-info"
  );
  if (!wrapper ||
      wrapper.contains(event.relatedTarget)) return;
  const tooltip = wrapper.querySelector(
    ".customer-tracking-tooltip"
  );
  if (tooltip) {
    tooltip.hidden = true;
    wrapper.querySelector(
      ".customer-tracking-info-btn"
    ).setAttribute("aria-expanded", "false");
  }
});
result.addEventListener("click", (event) => {
  const button = event.target.closest(
    ".customer-tracking-info-btn"
  );
  const allTooltips = result.querySelectorAll(
    ".customer-tracking-tooltip"
  );
  if (!button) {
    allTooltips.forEach(t => t.hidden = true);
    result.querySelectorAll(
      ".customer-tracking-info-btn"
    ).forEach(b => b.setAttribute("aria-expanded", "false"));
    return;
  }
  const wrapper = button.closest(
    ".customer-tracking-info"
  );
  const tooltip = wrapper.querySelector(
    ".customer-tracking-tooltip"
  );
  const shouldOpen = tooltip.hidden;
  allTooltips.forEach(t => t.hidden = true);
  result.querySelectorAll(
    ".customer-tracking-info-btn"
  ).forEach(b => b.setAttribute("aria-expanded", "false"));
  tooltip.hidden = !shouldOpen;
  button.setAttribute(
    "aria-expanded",
    String(shouldOpen)
  );
});
/* ==========================================
   CUSTOMER PRODUCT DETAILS — EXPAND/COLLAPSE
   ========================================== */
result.addEventListener("click", (event) => {
  const button = event.target.closest(
    ".customer-product-details-toggle"
  );
  if (!button || !result.contains(button)) {
    return;
  }
  const detailsId = button.getAttribute("aria-controls");
  const details = detailsId
    ? document.getElementById(detailsId)
    : null;
  if (!details) {
    return;
  }
  const shouldOpen =
    button.getAttribute("aria-expanded") !== "true";
  button.setAttribute(
    "aria-expanded",
    String(shouldOpen)
  );
  details.classList.toggle("is-open", shouldOpen);
  details.setAttribute(
    "aria-hidden",
    String(!shouldOpen)
  );
  const label = button.querySelector(
    ".customer-product-toggle-text"
  );
  if (label) {
    label.textContent =
      shouldOpen ? "Hide details" : "View details";
  }
});
/* CUSTOMER TRACKING ID — COPY TO CLIPBOARD */
result.addEventListener("click", async (event) => {
  const button = event.target.closest(
    ".customer-tracking-copy-btn"
  );
  if (!button) return;
  const trackingId = button.dataset.trackingId;
  const feedback = button.nextElementSibling;
  if (!trackingId) return;
  try {
    await navigator.clipboard.writeText(trackingId);
    feedback.textContent = "✓ Copied!";
    feedback.style.color = "#277043";
    button.setAttribute("aria-label", "Tracking ID copied");
    clearTimeout(button.copyFeedbackTimer);
    button.copyFeedbackTimer = setTimeout(() => {
      feedback.textContent = "";
      button.setAttribute("aria-label", "Copy Tracking ID");
    }, 2000);
  } catch (error) {
    feedback.textContent = "Unable to copy";
    feedback.style.color = "#a33b3b";
    console.error("Tracking ID copy failed:", error);
  }
});
  trackButton.addEventListener(
    "click",
    trackOrder
  );
  orderInput.addEventListener("keydown", function(event) { if (event.key === "Enter") trackOrder(); });
  emailInput.addEventListener("keydown", function(event) { if (event.key === "Enter") trackOrder(); });
