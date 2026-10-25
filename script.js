/* Bloom & Pod — dynamic storefront */
const DEFAULT_MIN_QTY = 10;
const STORE_FRONTEND_BUILD = "2026-10-04.1";
const currency = new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0});
function money(value){
  return currency.format(
    Number(value) || 0
  );
}
function getProductGST(product){
  const gst = Number(product?.gst);
  return Number.isFinite(gst) && gst >= 0
    ? gst
    : 18;
}
function getProductBasePrice(product){
  return Number(product?.price) || 0;
}
function getProductGSTAmount(product){
  const price = getProductBasePrice(product);
  const gst = getProductGST(product);
  return price * gst / 100;
}
function getProductFinalPrice(product){
  return (
    getProductBasePrice(product) +
    getProductGSTAmount(product)
  );
}
let PRODUCTS = [];
let ALL_PRODUCTS = [];
const PRODUCTS_PER_PAGE = 8;
let currentProductList = [];
let visibleProductCount = PRODUCTS_PER_PAGE;
let STORE_DATA = {
  allProducts: [],
  categories: [],
  catalogues: [],
  carousel: [],
  storySlides: [],
  settings: {}
};
let storeReadyResolve;
window.storeReady = new Promise(resolve => storeReadyResolve = resolve);
/* ==========================================
   BLOOM & POD — HANDLING CLASS RATES
   ========================================== */
let handlingRatesPromise = null;
async function getHandlingRates() {
  if (handlingRatesPromise) {
    return handlingRatesPromise;
  }
  handlingRatesPromise = (async () => {
    const { data, error } = await window.bpSupabase
      .from("handling_classes")
      .select("class, rate");
    if (error) {
      throw error;
    }
    if (!Array.isArray(data) || !data.length) {
      throw new Error(
        "No handling classes found in Supabase."
      );
    }
    const rates = {};
    for (const item of data) {
      const className = String(item.class || "").trim();
      const rate = Number(item.rate);
      if (
        !className ||
        !Number.isFinite(rate) ||
        rate < 0
      ) {
        throw new Error(
          "Invalid handling class configuration."
        );
      }
      rates[className] = rate;
    }
    return rates;
  })();
  try {
    return await handlingRatesPromise;
  } finally {
    // Fetch fresh rates on the next call.
    handlingRatesPromise = null;
  }
}
window.getHandlingRates = getHandlingRates;
function getCurrentPageName(){
  return window.location.pathname
    .split("/")
    .pop()
    .toLowerCase();
}
function getCurrentCatalogueSlug(){
  const params =
    new URLSearchParams(
      window.location.search
    );
  return String(
    params.get("catalogue") || ""
  )
    .trim()
    .toLowerCase();
}
function getCurrentCatalogue(){
  const slug =
    getCurrentCatalogueSlug();
  if(!slug){
    return null;
  }
  return (
    STORE_DATA.catalogues || []
  ).find(
    catalogue =>
      String(catalogue.slug)
        .toLowerCase() ===
      slug
  ) || null;
}
function currentCatalogueUsesModal(){
  const catalogue =
    getCurrentCatalogue();
  if(!catalogue){
    return true;
  }
  return (
    catalogue.useProductModal !==
    false
  );
}
function getProductsForCurrentPage(data){
  const page =
    getCurrentPageName();
  const allProducts =
    (Array.isArray(data.allProducts)
      ? data.allProducts
      : []).filter(product => product.isPublished !== false);
  const categories =
    Array.isArray(data.categories)
      ? data.categories
      : [];
  const catalogues =
    Array.isArray(data.catalogues)
      ? data.catalogues
      : [];
  if(
    page ===
    "catalogue.html"
  ){
    const slug =
      getCurrentCatalogueSlug();
    if(!slug){
      return [];
    }
    const catalogue =
      catalogues.find(
        item =>
          String(item.slug)
            .toLowerCase() ===
          slug
      );
    if(!catalogue){
      return [];
    }
    const categoryIds =
      new Set(
        categories
          .filter(
            category =>
              category.catalogueId ===
              catalogue.id
          )
          .map(
            category =>
              String(category.id)
          )
      );
    return allProducts.filter(
      product =>
        categoryIds.has(
          String(product.categoryId)
        )
    );
  }
  if(
    page === "cart.html" ||
    page === "checkout.html" ||
    page === "order-confirmation.html"
  ){
    return allProducts;
  }
  return allProducts;
}
function normalizeImageUrl(url) {
  const s = String(url || "").trim();
  if (!s) {
    return "";
  }
  let id = "";
  let m = s.match(
    /[?&]id=([A-Za-z0-9_-]+)/
  );
  if (!m) {
    m = s.match(
      /drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)/
    );
  }
  if (!m) {
    m = s.match(
      /drive\.google\.com\/open\?id=([A-Za-z0-9_-]+)/
    );
  }
  if (m) {
    id = m[1];
  }
  if (id) {
    return (
      "https://drive.google.com/thumbnail?id=" +
      encodeURIComponent(id) +
      "&sz=w2000"
    );
  }
  /*
   * Allow normal local/relative image paths such as:
   * images/dried-pods.png
   * images/lotus-pods.png
   * ./images/roses.jpg
   * /images/tulips.png
   */
  if (
    /^(https?:\/\/|\/|\.\/|\.\.\/)/i.test(s)
  ) {
    return s;
  }
  /*
   * Plain relative paths such as "images/foo.png"
   * are valid storefront image paths.
   */
  if (
    /^[A-Za-z0-9._\/-]+$/.test(s)
  ) {
    return "./" + s;
  }
  return "";
}
function mapSupabaseProduct(p){
  return {
  id: p.id,
  name: p.name,
  categoryId:
    p.category_id || "",
  category: "",
    price: Number(p.price || 0),
    gst: Number(p.gst || 0),
    handlingClass: p.handling_class || "",
    minQty:
      Number(p.min_qty || 0),
    availableUnits:
      Number(p.available_units || 0),
    maxQuantityAllowed:
      p.max_quantity_allowed == null
        ? null
          : Number(p.max_quantity_allowed),
    description:
      p.description || "",
    metaDescription:
      p.meta_description || "",
    bloomsIn:
      p.blooms_in || "",
    image:
      p.image_url || "",
    available:
      Boolean(p.available),
    offlinePurchaseOnly:
      p.offline_purchase_only === true,
    isPublished:
      p.is_published !== false,
    featured:
      Boolean(p.featured),
    displayOrder:
      Number(p.display_order || 9999),
    badge:
      p.badge || "",
  };
}
function mapSupabaseCategory(c){
  return {
    id: c.id,
    catalogueId:
      c.catalogue_id || "",
    name:
      c.name,
    description:
      c.description || "",
    image:
      c.image_url || "",
    active:
      Boolean(c.active),
    displayOrder:
      Number(c.display_order || 9999)
  };
}
function mapSupabaseCatalogue(c){
  return {
    id:
      c.id,
    name:
      c.name || "",
    slug:
      c.slug || "",
    eyebrow:
      c.eyebrow || "",
    description:
      c.description || "",
    image:
      c.image_url || "",
    badge:
      c.badge || "",
    useProductModal:
      c.use_product_modal !== false,
    displayOrder:
      Number(
        c.display_order || 9999
      ),
    active:
      Boolean(c.active)
  };
}
function mapSupabaseCarousel(c){
  return {
    id: c.id,
    productId:
      c.product_id || "",
    title:
      c.title || "",
    subtitle:
      c.subtitle || "",
    image:
      c.image_url || "",
    active:
      Boolean(c.active),
    displayOrder:
      Number(c.display_order || 9999),
    autoSlide:
      Number(c.auto_slide || 5000)
  };
}
function mapSupabaseStory(s){
  return {
    id: s.id,
    image:
      s.image_url || "",
    alt:
      s.alt_text || "",
    active:
      Boolean(s.active),
    displayOrder:
      Number(s.display_order || 9999)
  };
}
async function fetchStoreData(){
  const [
  productsResult,
  categoriesResult,
  cataloguesResult,
  carouselResult,
  storyResult,
  settingsResult
] = await Promise.all([
    window.bpSupabase
      .from("products")
      .select("*")
      .order("display_order")
      .order("name"),
    window.bpSupabase
      .from("categories")
      .select("*")
      .eq("active", true)
      .order("display_order")
      .order("name"),
      window.bpSupabase
  .from("catalogues")
  .select("*")
  .eq("active", true)
  .order("display_order")
  .order("name"),
    window.bpSupabase
      .from("carousel_slides")
      .select("*")
      .eq("active", true)
      .order("display_order"),
    window.bpSupabase
      .from("story_slides")
      .select("*")
      .eq("active", true)
      .order("display_order"),
    window.bpSupabase
  .from("site_settings")
  .select("*")
]);
  const storeErrors = [
  ['products', productsResult.error],
  ['categories', categoriesResult.error],
  ['catalogues', cataloguesResult.error],
  ['carousel_slides', carouselResult.error],
  ['story_slides', storyResult.error],
  ['site_settings', settingsResult.error]
].filter(
  ([, error]) => error
);
if(storeErrors.length){
  storeErrors.forEach(
    ([source, error]) => {
      console.error(
        `Store data failed: ${source}`,
        error
      );
    }
  );
  return null;
}
  const products =
    productsResult.data || [];
  const mappedCategories =
  (categoriesResult.data || [])
    .map(mapSupabaseCategory);
const categoryNameById =
  new Map(
    mappedCategories.map(
      category => [
        String(category.id),
        category.name || ""
      ]
    )
  );
const mappedProducts =
  products.map(product => {
    const mapped =
      mapSupabaseProduct(product);
    mapped.category =
      categoryNameById.get(
        String(mapped.categoryId)
      ) || "";
    return mapped;
  });
  const settings = {};
  (settingsResult.data || []).forEach(row => {
    settings[row.setting] =
      row.value;
  });
  return {
  success: true,
  /*
   * New master product collection.
   *
   * catalogue.html will use this instead of
   * relying on hard-coded catalogue names.
   */
  allProducts:
    mappedProducts,
  categories:
    mappedCategories,
  catalogues:
    (cataloguesResult.data || [])
      .map(
        mapSupabaseCatalogue
      ),
  carousel:
      (carouselResult.data || [])
        .map(mapSupabaseCarousel),
    storySlides:
      (storyResult.data || [])
        .map(mapSupabaseStory),
    settings
  };
}
async function loadStoreData(){
  let data = null;
  const delays = [
    0,
    1000,
    2500
  ];
  for(
    let attempt = 0;
    attempt < delays.length && !data;
    attempt++
  ){
    if(delays[attempt] > 0){
      await new Promise(
        resolve =>
          setTimeout(
            resolve,
            delays[attempt]
          )
      );
    }
    try{
      data =
        await fetchStoreData(25000);
    }catch(error){
      console.warn(
        "Store data attempt failed:",
        error
      );
    }
  }
  if(!data){
    STORE_DATA = {
  success: false,
  allProducts: [],
  categories: [],
  catalogues: [],
  carousel: [],
  storySlides: [],
  settings: {}
};
    PRODUCTS = [];
    ALL_PRODUCTS = [];
    window.PRODUCTS = PRODUCTS;
    window.ALL_PRODUCTS = ALL_PRODUCTS;
    storeReadyResolve(STORE_DATA);
    showStoreDataError();
    return;
}
  window.BLOOM_POD_STORE_VERSION = data.version || Date.now();
STORE_DATA = data;
/*
 * Master product collection containing
 * products from all catalogues.
 */
ALL_PRODUCTS =
  Array.isArray(data.allProducts)
    ? data.allProducts
    : [];
window.ALL_PRODUCTS =
  ALL_PRODUCTS;
/*
 * PRODUCTS contains only the products that
 * should be used on the current page.
 */
PRODUCTS = getProductsForCurrentPage(data);
window.PRODUCTS = PRODUCTS;
updateFloatingCart();
/*
 * Render the cart immediately after
 * product data becomes available.
 *
 * This prevents unrelated storefront
 * initialization from blocking cart.html.
 */
if (
  getCurrentPageName() === "cart.html"
) {
  renderCart();
}
/*
 * Store data is now ready for pages such
 * as checkout.html and order-confirmation.html.
 */
storeReadyResolve(STORE_DATA);
/*
 * The remaining storefront initializers
 * should not prevent cart data from loading.
 */
try {
  applySiteSettings(
    data.settings || {}
  );
} catch (error) {
  console.error(
    "Site settings initialization failed:",
    error
  );
}
try {
  populateCategoryFilter();
} catch (error) {
  console.error(
    "Category filter initialization failed:",
    error
  );
}
try {
  renderProducts();
} catch (error) {
  console.error(
    "Product rendering failed:",
    error
  );
}
try {
  initStorySlider(true);
} catch (error) {
  console.error(
    "Story slider initialization failed:",
    error
  );
}
try {
  initFeaturedCarousel(true);
} catch (error) {
  console.error(
    "Featured carousel initialization failed:",
    error
  );
}
}
function showStoreDataError(){
  document.querySelectorAll('[data-store-error]').forEach(el=>el.remove());
  const bar=document.createElement('div');
  bar.setAttribute('data-store-error','1');
  bar.style.cssText='position:fixed;left:16px;right:16px;bottom:16px;z-index:9999;background:#fff3cd;color:#664d03;border:1px solid #ffecb5;border-radius:12px;padding:14px 16px;font:14px/1.4 Arial,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.12)';
  bar.innerHTML =
  '<strong>Store data could not be loaded.</strong> ' +
  'There may be a temporary connection problem. ' +
  'Please check your internet connection and refresh the page.';
  document.body.appendChild(bar);
}
function getSetting(key,fallback=""){return Object.prototype.hasOwnProperty.call(STORE_DATA.settings||{},key)?STORE_DATA.settings[key]:fallback}
function safeSiteUrl(url,fallback="#"){
  const raw=String(url||fallback).trim();
  if(/^(javascript|data|vbscript):/i.test(raw)) return fallback;
  if(/^https?:\/\//i.test(raw) || /^mailto:/i.test(raw) || /^tel:/i.test(raw) || raw.startsWith("/") || raw.startsWith("./") || raw.startsWith("../") || raw.startsWith("#")) return raw;
  return fallback;
}
function applySiteSettings(s){
  const set=(id,value,html=false)=>{const el=document.getElementById(id);if(el){if(html)el.innerHTML=value;else el.textContent=value}};
  const attr=(id,name,value)=>{const el=document.getElementById(id);if(el&&value!=null)el.setAttribute(name,value)};
  document.title=getSetting("store_name","Bloom & Pod")+" | Natural Flowers & Botanical Decor";
  set("site-store-name",getSetting("store_name","Bloom & Pod"));
  set("site-footer-store-name",getSetting("store_name","Bloom & Pod"));
  set("hero-eyebrow",getSetting("hero_eyebrow","Natural • Timeless • Beautiful"));
  set("hero-title",getSetting("hero_title","Bring the beauty of nature home."));
  set("hero-text",getSetting("hero_text","Discover dried flowers, lotus pods and botanical accents selected to add warmth and character to every space."));
  set("hero-button",getSetting("hero_button_text","Shop the collection"));
  set("hero-secondary",getSetting("hero_secondary_text","Our story"));
  set("hero-badge-number",getSetting("hero_badge_number","6"));
  set("hero-badge-text",getSetting("hero_badge_text","botanical favourites"));
  attr("hero-image","src",normalizeImageUrl(getSetting("hero_image","images/pink-flowers.png")));
  attr("hero-image","alt",getSetting("hero_image_alt","Pink dried flowers"));
  attr("hero-button","href",safeSiteUrl(getSetting("hero_button_url","products.html"),"products.html"));
  attr("hero-secondary","href",safeSiteUrl(getSetting("hero_secondary_url","#about"),"#about"));
  set("featured-eyebrow",getSetting("featured_eyebrow","Featured collection"));
  set("featured-title",getSetting("featured_title","Made for beautiful arrangements"));
  set("about-eyebrow",getSetting("about_eyebrow","The Bloom & Pod difference"));
  set("about-title",getSetting("about_title","Simple botanicals. Lasting beauty."));
  set("about-text",getSetting("about_text","We believe natural textures can transform a room without trying too hard."));
  set("about-feature-1-title",getSetting("feature_1_title","Thoughtfully selected"));
  set("about-feature-1-text",getSetting("feature_1_text","Pieces chosen for colour, shape and texture."));
  set("about-feature-2-title",getSetting("feature_2_title","Easy to style"));
  set("about-feature-2-text",getSetting("feature_2_text","Perfect for vases, wreaths and creative projects."));
  set("about-feature-3-title",getSetting("feature_3_title","Packed with care"));
  set("about-feature-3-text",getSetting("feature_3_text","Orders are prepared to help your botanicals arrive safely."));
  set("cta-eyebrow",getSetting("cta_eyebrow","Ready to create?"));
  set("cta-title",getSetting("cta_title","Find your next favourite botanical."));
  set("cta-button",getSetting("cta_button","Explore products"));
  attr("cta-button","href",safeSiteUrl(getSetting("cta_url","products.html"),"products.html"));
  set("footer-tagline",getSetting("footer_tagline","Natural details for beautiful spaces."));
  set("contact-email",getSetting("contact_email","hello@bloomandpod.example"));
  attr("contact-email","href","mailto:"+getSetting("contact_email","hello@bloomandpod.example"));
  set("contact-hours",getSetting("contact_hours","Mon–Fri · 15:00–20:00"));
  const announcement =
  getSetting("announcement", "");
const enabled =
  String(
    getSetting(
      "announcement_enabled",
      "false"
    )
  ).toLowerCase() === "true";
const bar =
  document.getElementById(
    "announcement-bar"
  );
if (bar) {
  bar.hidden =
    !(enabled && announcement);
  const text =
    bar.querySelector(
      ".announcement-text"
    );
  if (text) {
    text.textContent =
      announcement;
  }
}
}
function getCart(){try{return JSON.parse(localStorage.getItem("bloomPodCart")||"[]")}catch{return[]}}
function saveCart(cart){localStorage.setItem("bloomPodCart",JSON.stringify(cart));updateCartCount();}
function updateCartCount(){
  const count =
    getCart().filter(
      item =>
        item &&
        Number(item.quantity) > 0
    ).length;
  document
    .querySelectorAll(".cart-count")
    .forEach(
      el => el.textContent = count
    );
  updateFloatingCart();
}
function showToast(message){const old=document.querySelector(".toast");if(old)old.remove();const el=document.createElement("div");el.className="toast";el.textContent=message;document.body.appendChild(el);setTimeout(()=>el.remove(),2200)}
/*
 * ==========================================================
 * FLOATING CART + CART PREVIEW MODAL
 * ==========================================================
 */
function getFloatingCartItemCount() {
  try {
    const cart =
      JSON.parse(
        localStorage.getItem("bloomPodCart") || "[]"
      );
    if (!Array.isArray(cart)) {
      return 0;
    }
    return cart.filter(
      item =>
        item &&
        Number(item.quantity) > 0
    ).length;
  } catch {
    return 0;
  }
}
function hasUnavailableCartItem() {
  const cart =
    getCart();
  if (!Array.isArray(cart)) {
    return false;
  }
  if (STORE_DATA?.success !== true) {
  return false;
}
  return cart.some(item => {
    if (
      !item ||
      Number(item.quantity) <= 0
    ) {
      return false;
    }
    const product =
      ALL_PRODUCTS.find(
        p =>
          String(p.id) ===
          String(item.id)
      );
    if (!product) {
      return true;
    }
    const quantity =
      Number(item.quantity) || 0;
    const step =
      getProductStep(product);
    const max =
      getProductMax(product);
    return (
      product.available === false ||
      product.offlinePurchaseOnly === true ||
      product.isPublished === false ||
      max < step ||
      quantity > max
    );
  });
}
/*
 * Build product details for the cart preview.
 *
 * It tries to match cart IDs with PRODUCTS.
 * If a product cannot be matched, the cart ID
 * is used as a fallback.
 */
function getFloatingCartPreviewItems() {
  const cart = getCart();
  if (!Array.isArray(cart)) {
    return [];
  }
  return cart
    .filter(
      item =>
        item &&
        Number(item.quantity) > 0
    )
    .map(item => {
      const product = ALL_PRODUCTS.find(
        p => String(p.id) === String(item.id)
      );
      if (!product) {
        return null;
      }
      const quantity =
        Number(item.quantity) || 0;
      const unitPrice =
        Number(product.price) || 0;
      const step =
  getProductStep(product);
const max =
  getProductMax(product);
const offlineOnly =
  product.offlinePurchaseOnly === true;
const unavailable =
  product.available === false ||
  product.isPublished === false ||
  max < step ||
  quantity > max;
return {
  id: product.id,
  name:
    product.name || "Product",
  image:
    normalizeImageUrl(
      product.image
    ),
  quantity,
  unitPrice,
  lineTotal:
    quantity * unitPrice,
  step,
  max,
  unavailable,
  offlineOnly
};
    })
    .filter(Boolean);
}
function closeFloatingCartModal() {
  const overlay =
    document.getElementById(
      "floating-cart-modal-overlay"
    );
  if (!overlay) {
    return;
  }
  overlay.remove();
  document.body.classList.remove(
    "floating-cart-modal-open"
  );
}
function renderFloatingCartModalContent() {
  const modal =
    document.querySelector(
      ".floating-cart-modal"
    );
  if (!modal) {
    return;
  }
  const items =
    getFloatingCartPreviewItems();
  /*
   * If cart becomes empty while modal is open,
   * close the modal completely.
   */
  if (!items.length) {
    closeFloatingCartModal();
    updateFloatingCart();
    return;
  }
  const cartTotal =
    items.reduce(
      (sum, item) =>
        sum + Number(item.lineTotal || 0),
      0
    );
  const itemsHtml =
    items
      .map(item => {
        const quantity =
          Number(item.quantity) || 0;
        const step =
          Number(item.step) || 1;
        const max =
          Number(item.max) || 0;
        const atMaximum =
          quantity >= Math.min(max, getProductCartLimit(
            ALL_PRODUCTS.find(p => String(p.id) === String(item.id))
          ));
        const unavailable =
          item.unavailable === true; 
        const offlineOnly =
          item.offlineOnly === true;
        const purchasingBlocked =
          unavailable || offlineOnly;
        return `
          <div
            class="
              floating-cart-preview-item
              ${unavailable
                ? 'floating-cart-preview-item-unavailable'
                : ''
              }
            "
            data-floating-cart-item="${escapeAttr(item.id)}"
          >
            <div class="floating-cart-preview-image-wrap">
              <img
                class="floating-cart-preview-image"
                src="${escapeAttr(item.image)}"
                alt="${escapeAttr(item.name)}"
              >
            </div>
            <div class="floating-cart-preview-details">
              <div class="floating-cart-preview-header">
                <div class="floating-cart-preview-name">
                  ${escapeHtml(item.name)}
                </div>
                <button
                  type="button"
                  class="floating-cart-preview-remove"
                  data-floating-remove="${escapeAttr(item.id)}"
                >
                  Remove Product
                </button>
              </div>
              <div class="floating-cart-preview-price-row">
                <span class="floating-cart-preview-unit-price">
                  ${money(item.unitPrice)}
                  ×
                  ${quantity}
                </span>
                <strong class="floating-cart-preview-line-total">
                  ${money(item.lineTotal)}
                </strong>
              </div>
              <div class="floating-cart-preview-bottom-row">
                <div>
                  ${
                    unavailable
  ?                   `
                        <small class="floating-cart-preview-unavailable">
                          ! Product no longer available
                        </small>
                      `
                    : offlineOnly
                    ? `
                        <small class="floating-cart-preview-unavailable">
                          Available In-Store Only
                        </small>
                      `
                    : ''
                  }
                </div>
                <div class="floating-cart-preview-controls">
                  <button
                    type="button"
                    class="floating-cart-preview-qty-btn"
                    data-floating-dec="${escapeAttr(item.id)}"
                    aria-label="${quantity <= step ? 'Remove product from cart' : 'Remove 1 unit'}"
                    ${
                      purchasingBlocked
                        ? 'disabled title="Product cannot be purchased online"'
                        : ''
                    }
                  >
                    −
                  </button>
                  <span class="floating-cart-preview-qty">
                    ${quantity}
                  </span>
                  <button
                    type="button"
                    class="floating-cart-preview-qty-btn"
                    data-floating-inc="${escapeAttr(item.id)}"
                    aria-label="Add 1 unit"
                    ${
                      purchasingBlocked
                        ? 'disabled title="Product cannot be purchased online"'
                        : atMaximum
                          ? 'disabled title="Maximum available quantity reached"'
                          : ''
                    }
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>
        `;
      })
      .join("");
  /*
   * Preserve modal heading + close button,
   * replace only the changing cart contents.
   */
  const body =
    modal.querySelector(
      ".floating-cart-modal-body"
    );
  if (!body) {
    return;
  }
  body.innerHTML = `
    <div class="floating-cart-preview-list">
      ${itemsHtml}
    </div>
    <div class="floating-cart-preview-total">
      <span>
        Total
      </span>
      <strong>
        ${money(cartTotal)}
      </strong>
    </div>
    <a
      class="btn btn-primary floating-cart-view-cart"
      href="cart.html"
    >
      View Cart
    </a>
    <button
      type="button"
      class="btn btn-primary floating-cart-continue-shopping"
      id="floating-cart-continue-shopping"
    >
      Continue Shopping
    </button>
  `;
}
function openFloatingCartModal() {
  /*
   * Prevent duplicate modal.
   */
  if (
    document.getElementById(
      "floating-cart-modal-overlay"
    )
  ) {
    return;
  }
  const items =
    getFloatingCartPreviewItems();
  /*
   * If cart became empty,
   * don't show the modal.
   */
  if (!items.length) {
    updateFloatingCart();
    return;
  }
  const overlay =
    document.createElement("div");
  overlay.id =
    "floating-cart-modal-overlay";
  overlay.className =
    "floating-cart-modal-overlay";
  overlay.innerHTML = `
    <div
      class="floating-cart-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="floating-cart-modal-title"
    >
      <button
        type="button"
        class="floating-cart-modal-close"
        id="floating-cart-modal-close"
        aria-label="Close cart preview"
      >
        ×
      </button>
      <h2 id="floating-cart-modal-title">
        Cart Preview
      </h2>
      <div
        class="floating-cart-modal-body"
      ></div>
    </div>
  `;
  document.body.appendChild(
    overlay
  );
  document.body.classList.add(
    "floating-cart-modal-open"
  );
  /*
   * Render current cart contents.
   */
  renderFloatingCartModalContent();
  /*
   * Close button.
   */
  const closeButton =
    document.getElementById(
      "floating-cart-modal-close"
    );
  if (closeButton) {
    closeButton.addEventListener(
      "click",
      closeFloatingCartModal
    );
    closeButton.focus();
  }
  const continueShopping =
  document.getElementById(
    "floating-cart-continue-shopping"
  );
if (continueShopping) {
  continueShopping.addEventListener(
    "click",
    closeFloatingCartModal
  );
}
  /*
   * Handle all modal clicks.
   */
  overlay.addEventListener(
    "click",
    event => {
      /*
       * Click outside modal.
       */
      if (event.target === overlay) {
        closeFloatingCartModal();
        return;
      }
      /*
       * Minus quantity.
       */
      const decrease =
        event.target.closest(
          "[data-floating-dec]"
        );
      if (decrease) {
        const id =
          decrease.dataset.floatingDec;
        const product =
          ALL_PRODUCTS.find(
            p =>
              String(p.id) ===
              String(id)
          );
        if (product) {
          changeQty(id, -1);
          renderFloatingCartModalContent();
        }
        return;
      }
      /*
       * Plus quantity.
       */
      const increase =
        event.target.closest(
          "[data-floating-inc]"
        );
      if (increase) {
        const id =
          increase.dataset.floatingInc;
        const product =
  ALL_PRODUCTS.find(
    p =>
      String(p.id) ===
      String(id)
  );
        if (product) {
          changeQty(id, 1);
          renderFloatingCartModalContent();
        }
        return;
      }
      /*
       * Remove product.
       */
      const remove =
        event.target.closest(
          "[data-floating-remove]"
        );
      if (remove) {
        const id =
          remove.dataset.floatingRemove;
        removeFromCart(id);
        renderFloatingCartModalContent();
        return;
      }
    }
  );
}
/*
 * Create, update or remove the floating cart.
 */
function updateFloatingCart() {
  if (document.body.classList.contains("no-floating-cart")) {
  const existingFloater = document.getElementById("floating-cart");
  const existingModal = document.getElementById("floating-cart-modal-overlay");
  if (existingFloater) existingFloater.remove();
  if (existingModal) existingModal.remove();
  return;
}
  const itemCount =
    getFloatingCartItemCount();
  let floater =
    document.getElementById(
      "floating-cart"
    );
  /*
   * Empty cart:
   * remove floater and modal.
   */
  if (itemCount <= 0) {
    if (floater) {
      floater.remove();
    }
    closeFloatingCartModal();
    return;
  }
  /*
   * Create floater if needed.
   */
  if (!floater) {
    floater =
      document.createElement("button");
    floater.id =
      "floating-cart";
    floater.className =
      "floating-cart";
    floater.type =
      "button";
    floater.setAttribute(
      "aria-label",
      "Open cart preview"
    );
    floater.innerHTML = `
      <span
        class="floating-cart-icon"
        aria-hidden="true"
      >
        <img src="images/cart.png"
        alt=""
      >
      </span>
      <span
        class="floating-cart-count"
      >
        0
      </span>
    `;
    floater.addEventListener(
      "click",
      openFloatingCartModal
    );
    document.body.appendChild(
      floater
    );
  }
  /*
   * Update badge.
   */
  const badge =
  floater.querySelector(
    ".floating-cart-count"
  );
if (badge) {
  const badgeState =
    getFloatingCartBadgeState();
  badge.classList.toggle(
    "floating-cart-count-warning",
    badgeState.type === 'warning'
  );
  badge.classList.toggle(
    "floating-cart-count-loading",
    badgeState.type === 'loading'
  );
  badge.textContent =
    badgeState.text;
}
}
/*
 * ESC closes the preview modal.
 */
document.addEventListener(
  "keydown",
  event => {
    if (event.key === "Escape") {
      closeFloatingCartModal();
    }
  }
);
/*
 * Initialize on every page.
 */
document.addEventListener(
  "DOMContentLoaded",
  () => {
    updateFloatingCart();
  }
);
function getFloatingCartBadgeState() {
  const cart =
    getCart();
  const itemCount =
    Array.isArray(cart)
      ? cart.filter(
          item =>
            item &&
            Number(item.quantity) > 0
        ).length
      : 0;
  if (itemCount <= 0) {
    return {
      type: 'empty',
      text: '0'
    };
  }
  /*
   * Product availability has not been checked yet.
   */
  if (STORE_DATA?.success !== true) {
    return {
      type: 'loading',
      text: '...'
    };
  }
  const hasUnavailable =
    cart.some(item => {
      if (
        !item ||
        Number(item.quantity) <= 0
      ) {
        return false;
      }
      const product =
        ALL_PRODUCTS.find(
          p =>
            String(p.id) ===
            String(item.id)
        );
      if (!product) {
        return true;
      }
      const quantity =
        Number(item.quantity) || 0;
      const step =
        getProductStep(product);
      const max =
        getProductMax(product);
      return (
        product.available === false ||
        product.isPublished === false ||
        product.offlinePurchaseOnly === true ||
        max < step ||
        quantity > max
      );
    });
  if (hasUnavailable) {
    return {
      type: 'warning',
      text: '!'
    };
  }
  return {
    type: 'normal',
    text: String(itemCount)
  };
}
function keepFloatersAboveFooter(){
  const floaters = [
    document.querySelector(".floating-cart"),
    document.querySelector(".catalogue-floater")
  ].filter(Boolean);
  const footer =
    document.querySelector(".site-footer");
  if(
    !floaters.length ||
    !footer
  ){
    return;
  }
  const baseBottom = 24;
  const footerRect =
    footer.getBoundingClientRect();
  const viewportHeight =
    window.innerHeight;
  /*
   * Footer is still below the screen.
   * Keep floaters in normal position.
   */
  if(
    footerRect.top >=
    viewportHeight
  ){
    floaters.forEach(
      floater => {
        floater.style.bottom =
          `${baseBottom}px`;
      }
    );
    return;
  }
  /*
   * Footer has entered the viewport.
   */
  const overlap =
    viewportHeight -
    footerRect.top;
  floaters.forEach(
    floater => {
      floater.style.bottom =
        `${
          baseBottom +
          overlap
        }px`;
    }
  );
}
function addToCart(id){
  const p = PRODUCTS.find(
    x => String(x.id) === String(id)
  );
  if(!p)return;
  if(p.isPublished === false){
    showToast("This product is no longer available and cannot be purchased.");
    return;
  }
  if(p.available === false){
    showToast("Product unavailable");
    return;
  }
  if (p.offlinePurchaseOnly === true) {
    showToast("This product is available in-store only.");
    return;
  }
  const step = getProductStep(p);
  const max = getProductMax(p);
  if(max <= 0){
    showToast("Product is out of stock");
    return;
  }
  const cartLimit =
  getProductCartLimit(p);
  const cart = getCart();
  const item = cart.find(
    i => String(i.id) === String(id)
  );
  const currentQuantity = item
    ? Number(item.quantity) || 0
    : 0;
  if(currentQuantity >= max){
    showToast(
      `${p.name}: only ${max} units available`
    );
    return;
  }
  const requestedQuantity =
  currentQuantity + step;
  if (requestedQuantity > max) {
  showToast(
    `${p.name}: not enough stock available`
  );
  return;
}
if (requestedQuantity > cartLimit) {
  showToast(
    `Maximum ${cartLimit} units allowed per cart.`
  );
  return;
}
const newQuantity =
  requestedQuantity;
  if(item){
    item.quantity = newQuantity;
  }else{
    cart.push({
      id: p.id,
      quantity: newQuantity
    });
  }
  saveCart(cart);
  refreshProductCartControl(id);
  const added =
    newQuantity - currentQuantity;
  showToast(
    `${p.name} added to cart`
  );
}
function changeQty(id, delta) {
  const cart = getCart();
  const item = cart.find(
    i => String(i.id) === String(id)
  );
  if (!item) return;
  const p = ALL_PRODUCTS.find(
    x => String(x.id) === String(id)
  );
  if (!p) return;
  if (p.isPublished === false) {
    showToast("This product is no longer available and cannot be purchased.");
    return;
  }
  if (p.offlinePurchaseOnly === true) {
    showToast("This product is available in-store only.");
    return;
  }
  const minimum = getProductStep(p);
  const stock = getProductMax(p);
  const cartLimit = getProductCartLimit(p);
  const currentQuantity = Number(item.quantity) || 0;
  const adjustment = Number(delta) || 0;
  if (adjustment === 0) return;
  const requestedQuantity = currentQuantity + adjustment;
  // Option A: decrementing at minimum removes the product.
  if (adjustment < 0 && requestedQuantity < minimum) {
    removeFromCart(id);
    return;
  }
  // Do not allow additions to unavailable products.
  if (adjustment > 0 && p.available === false) {
    showToast("Product unavailable");
    return;
  }
  // Retain existing stock validation.
  if (adjustment > 0 && requestedQuantity > stock) {
    showToast(`${p.name}: only ${stock} units available`);
    return;
  }
  // Retain existing per-cart maximum validation.
  if (adjustment > 0 && requestedQuantity > cartLimit) {
    showToast(`Maximum ${cartLimit} units allowed per cart.`);
    return;
  }
  item.quantity = requestedQuantity;
  saveCart(cart);
  refreshProductCartControl(id);
  renderCart();
}
function removeFromCart(id){
  saveCart(
    getCart().filter(
      i => String(i.id) !== String(id)
    )
  );
  refreshProductCartControl(id);
  renderCart();
}
function getProductStep(p){
  return Number(p?.minQty) || 10;
}
function getProductMax(p){
  const max = Number(p?.availableUnits);
  if(Number.isFinite(max)){
    return Math.max(0, max);
  }
  return 0;
}
function getProductCartLimit(p){
  const raw =
    p?.maxQuantityAllowed;
  if(
    raw === null ||
    raw === undefined ||
    raw === ''
  ){
    return Infinity;
  }
  const limit =
    Number(raw);
  if(
    Number.isFinite(limit) &&
    limit > 0
  ){
    return Math.floor(limit);
  }
  return Infinity;
}
function getCartQuantity(id){
  const item = getCart().find(
    x => String(x.id) === String(id)
  );
  return item
    ? Number(item.quantity) || 0
    : 0;
}
function productCartControl(p){
  const step =
    getProductStep(p);
  const quantity =
    getCartQuantity(p.id);
  const max =
    getProductMax(p);
  /*
   * Product cannot currently be purchased.
   *
   * Either:
   * - Available is FALSE
   * - Available Units is 0
   */
  if(
  p.available === false ||
  max < step
){
    return `
      <div
        class="product-out-of-stock"
        aria-label="Out of stock"
      >
        Out of stock
      </div>
    `;
  }
  if (p.offlinePurchaseOnly === true) {
    return `
      <div
        class="product-store-only"
        aria-label="Only in Stores"
      >
        Only in Stores
      </div>
    `;
  }
  /*
   * Product is available but has not yet
   * been added to the cart.
   */
  if(quantity <= 0){
    return `
      <button
        type="button"
        class="add-btn"
        data-add="${escapeAttr(p.id)}"
      >
        Add ${Math.min(step,max)} units
      </button>
    `;
  }
  const atMaximum =
    quantity >= Math.min(max, getProductCartLimit(p));
  /*
   * Product already exists in cart.
   */
  return `
    <div
      class="product-quantity-control"
      data-cart-control="${escapeAttr(p.id)}"
    >
      <button
        type="button"
        class="quantity-control-btn"
        data-product-dec="${escapeAttr(p.id)}"
        aria-label="${quantity <= step ? 'Remove product from cart' : 'Remove 1 unit'}"
      >
        −
      </button>
      <span class="product-quantity-value">
        ${quantity}
      </span>
      <button
        type="button"
        class="quantity-control-btn"
        data-product-inc="${escapeAttr(p.id)}"
        aria-label="Add 1 unit"
        ${
          atMaximum
            ? 'disabled title="Maximum available quantity reached"'
            : ''
        }
      >
        +
      </button>
    </div>
  `;
}
function refreshProductCartControl(id){
  const p =
    PRODUCTS.find(
      x =>
        String(x.id) ===
        String(id)
    );
  if(!p){
    return;
  }
  /*
   * Find the product card.
   */
  const card =
  document.querySelector(
    `[data-product-card="${CSS.escape(String(id))}"]`
  );
  if(!card){
    return;
  }
  /*
   * Find the container where either:
   *
   * Add xx units
   * - xx +
   * Out of stock
   *
   * is displayed.
   */
  const wrap =
    card.querySelector(
      ".product-cart-control-wrap"
    );
  if(!wrap){
    return;
  }
  wrap.innerHTML =
    productCartControl(p);
}
function productCard(p){
  /*
   * Treat the product as out of stock when:
   *
   * Available = FALSE
   * OR
   * Available Units = 0
   */
  const unavailable =
  p.available === false ||
  getProductMax(p) < getProductStep(p);
  const useProductModal =
  currentCatalogueUsesModal();
  return `
    <article
  class="
    product-card
    ${unavailable ? 'product-unavailable' : ''}
  "
  data-product-card="${escapeAttr(p.id)}"
>
      <div class="product-image-wrap">
        <!--
          IMPORTANT:
          This remains clickable even when the
          product is out of stock.
          Clicking it opens the product-description modal.
        -->
        ${
  useProductModal
    ? `
      <button
        type="button"
        class="product-image-button"
        data-product-view="${escapeAttr(p.id)}"
        aria-label="View details for ${escapeAttr(p.name)}"
      >
        <img
          class="product-image"
          src="${escapeAttr(
            normalizeImageUrl(p.image)
          )}"
          alt="${escapeAttr(p.name)}"
          loading="lazy"
        >
        <!-- Fullscreen indicator — modal-enabled catalogues only -->
        <span
          class="product-fullscreen-icon"
          aria-hidden="true"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M3 7V5a2 2 0 0 1 2-2h2"/>
            <path d="M17 3h2a2 2 0 0 1 2 2v2"/>
            <path d="M21 17v2a2 2 0 0 1-2 2h-2"/>
            <path d="M7 21H5a2 2 0 0 1-2-2v-2"/>
            <rect width="10" height="8" x="7" y="8" rx="1"/>
          </svg>
        </span>
      </button>
    `
    : `
      <div
        class="product-image-button product-image-static"
      >
        <img
          class="product-image"
          src="${escapeAttr(
            normalizeImageUrl(p.image)
          )}"
          alt="${escapeAttr(p.name)}"
          loading="lazy"
        >
      </div>
    `
}
        </div>
<div class="product-info">
  ${
    p.badge
      ? `
        <span class="product-badge">
          ${escapeHtml(p.badge)}
        </span>
      `
      : ''
  }
  <div class="product-category">
          ${escapeHtml(
            p.category
          )}
        </div>
        <h3 class="product-name">
          ${escapeHtml(
            p.name
          )}
        </h3>
        <p class="product-description">
          ${escapeHtml(
            p.metaDescription ??
            ''
          )}
</p>
        <div class="product-bottom">
          <div class="price">
            <div>
              ${currency.format(getProductBasePrice(p))}
              <span class="unit">
                / unit${p.offlinePurchaseOnly === true ? '*' : ''}
              </span>
            </div>
            ${
              p.offlinePurchaseOnly === true
                ? `
                  <small class="product-price-disclaimer">
                    * Prices may vary
                  </small>
                `
                : ''
            }
          </div>
          <div class="product-cart-control-wrap">
            ${productCartControl(p)}
          </div>
        </div>
      </div>
    </article>
  `;
}
/*
 * Rich-text sanitizer for storefront descriptions.
 *
 * Product and catalogue descriptions may contain a deliberately
 * limited set of HTML created by the Admin rich-text editor.
 *
 * This function:
 * - keeps only the formatting tags we support;
 * - removes script/style/iframe and other unsupported elements;
 * - removes inline styles, classes and event attributes;
 * - permits safe http/https/mailto/tel links only;
 * - makes links opened in a new tab safe.
 *
 * catalogue.html can reuse this same global function when we update
 * the catalogue description in the next step.
 */
function sanitizeRichTextHtml(value){
  const input =
    String(value || "");
  if(!input.trim()){
    return "";
  }
  const template =
    document.createElement("template");
  template.innerHTML =
    input;
  const allowedTags =
    new Set([
      "P",
      "BR",
      "STRONG",
      "B",
      "EM",
      "I",
      "U",
      "UL",
      "OL",
      "LI",
      "A"
    ]);
  const blockedTags =
    new Set([
      "SCRIPT",
      "STYLE",
      "IFRAME",
      "OBJECT",
      "EMBED",
      "SVG",
      "MATH",
      "FORM",
      "INPUT",
      "BUTTON",
      "TEXTAREA",
      "SELECT",
      "OPTION"
    ]);
  function cleanNode(node){
    if(
  node.nodeType ===
  Node.TEXT_NODE
){
  node.nodeValue =
    String(
      node.nodeValue || ''
    )
      .replace(
        /\u00A0/g,
        ' '
      )
      .replace(
        /[\u200B-\u200D\u2060\uFEFF]/g,
        ''
      )
      .replace(
        /\u00AD/g,
        ''
      );
  return;
}
    if(
      node.nodeType !==
      Node.ELEMENT_NODE
    ){
      node.remove();
      return;
    }
    const tag =
      node.tagName.toUpperCase();
    if(blockedTags.has(tag)){
      node.remove();
      return;
    }
    if(!allowedTags.has(tag)){
      const parent =
        node.parentNode;
      if(!parent){
        node.remove();
        return;
      }
      while(node.firstChild){
        parent.insertBefore(
          node.firstChild,
          node
        );
      }
      node.remove();
      return;
    }
    Array
      .from(node.attributes)
      .forEach(attribute => {
        const name =
          attribute.name
            .toLowerCase();
        /*
         * Only anchors are allowed to retain
         * a small, controlled set of attributes.
         */
        if(
          tag !== "A" ||
          ![
            "href",
            "title"
          ].includes(name)
        ){
          node.removeAttribute(
            attribute.name
          );
        }
      });
    if(tag === "A"){
      const href =
        String(
          node.getAttribute("href") ||
          ""
        ).trim();
      let safeHref = "";
      if(href){
        try{
          const parsed =
            new URL(
              href,
              window.location.href
            );
          const protocol =
            parsed.protocol
              .toLowerCase();
          if(
            [
              "http:",
              "https:",
              "mailto:",
              "tel:"
            ].includes(protocol)
          ){
            safeHref =
              href;
          }
        }catch(error){
          safeHref = "";
        }
      }
      if(safeHref){
        node.setAttribute(
          "href",
          safeHref
        );
        node.setAttribute(
          "target",
          "_blank"
        );
        node.setAttribute(
          "rel",
          "noopener noreferrer"
        );
      }else{
        node.removeAttribute(
          "href"
        );
        node.removeAttribute(
          "target"
        );
        node.removeAttribute(
          "rel"
        );
      }
    }
    Array
      .from(node.childNodes)
      .forEach(cleanNode);
  }
  Array
    .from(template.content.childNodes)
    .forEach(cleanNode);
  return template.innerHTML;
}
/* ==========================================
   PRODUCT MODAL — MULTI MODAL IMAGE STATE
   ========================================== */
let productModalImages = [];
let productModalImageIndex = 0;
let productModalRequestId = 0;
function showProductModalImage(index) {
  const image = document.getElementById(
    "product-modal-image"
  );
  const prev = document.getElementById(
    "product-modal-prev"
  );
  const next = document.getElementById(
    "product-modal-next"
  );
  if (!image) return;
  const count = productModalImages.length;
  if (!count) {
    image.removeAttribute("src");
    image.alt = "Product image unavailable";
  } else {
    productModalImageIndex =
      ((index % count) + count) % count;
    image.src =
      productModalImages[productModalImageIndex];
    image.alt =
      `${document.getElementById(
        "product-modal-name"
      )?.textContent || "Product"} - Image ${
        productModalImageIndex + 1
      } of ${count}`;
  }
  if (prev) prev.hidden = count <= 1;
  if (next) next.hidden = count <= 1;
}
async function loadProductModalImages(product, requestId) {
  const fallback = normalizeImageUrl(
    product.image
  );
  try {
    const { data, error } = await window.bpSupabase
      .from("product_multimodal_images")
      .select("slot_1_url, slot_2_url, slot_3_url")
      .eq("product_id", product.id)
      .maybeSingle();
    if (requestId !== productModalRequestId) {
      return;
    }
    if (error) throw error;
    const slot1 = normalizeImageUrl(
      data?.slot_1_url || fallback
    );
    const slot2 = normalizeImageUrl(
      data?.slot_2_url
    );
    const slot3 = normalizeImageUrl(
      data?.slot_3_url
    );
    productModalImages = [
      slot1,
      slot2,
      slot3
    ].filter(Boolean);
  } catch (error) {
    console.error(
      "Multi Modal images could not be loaded:",
      error
    );
    if (requestId !== productModalRequestId) {
      return;
    }
    productModalImages = fallback
      ? [fallback]
      : [];
  }
  showProductModalImage(0);
}
function changeProductModalImage(direction) {
  if (productModalImages.length <= 1) {
    return;
  }
  showProductModalImage(
    productModalImageIndex + direction
  );
}
function openProductModal(productId){
  const product = PRODUCTS.find(
    p => String(p.id) === String(productId)
  );
  if(!product)return;
  const modal = document.getElementById("product-modal");
  const image = document.getElementById("product-modal-image");
  const category = document.getElementById("product-modal-category");
  const name = document.getElementById("product-modal-name");
  const description = document.getElementById("product-modal-description");
  const blooms = document.getElementById("product-modal-blooms");
  if(!modal)return;
 category.textContent = product.category || "";
  name.textContent = product.name || "";
  description.innerHTML = sanitizeRichTextHtml(
    product.description || ""
  );
  blooms.textContent = product.bloomsIn || "Not specified";
  // Reset the carousel for the selected product.
  const requestId = ++productModalRequestId;
  productModalImages = [];
  const fallback = normalizeImageUrl(product.image);
  if (fallback) {
    productModalImages = [fallback];
  }
  productModalImageIndex = 0;
  showProductModalImage(0);
  // Open the modal immediately.
  modal.hidden = false;
  const modalScroll = modal.querySelector(
    ".product-modal-scroll"
  );
  if (modalScroll) {
    modalScroll.scrollTop = 0;
  }
  // Retrieve saved Multi Modal images.
  loadProductModalImages(product, requestId);
  modal.setAttribute("aria-hidden","false");
  document.body.classList.add("product-modal-open");
}
function closeProductModal() {
  const modal = document.getElementById(
    "product-modal"
  );
  if (!modal || modal.hidden) return;
  // Discard any pending image-loading response.
  productModalRequestId++;
  productModalImages = [];
  productModalImageIndex = 0;
  modal.hidden = true;
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove(
    "product-modal-open"
  );
}
function renderProducts(list=PRODUCTS,targetId="products"){
  const target=document.getElementById(targetId);
  if(!target)return;
  currentProductList=[...list];
  visibleProductCount=Math.min(PRODUCTS_PER_PAGE,currentProductList.length);
  renderVisibleProducts(targetId);
}
function renderVisibleProducts(targetId="products"){
  const target=document.getElementById(targetId);
  if(!target)return;
  const visibleProducts=currentProductList.slice(0,visibleProductCount);
  target.innerHTML=visibleProducts.map(productCard).join("");
  const count=document.getElementById("product-count");
  if(count){
    count.textContent=
      currentProductList.length > PRODUCTS_PER_PAGE
        ? `Showing ${visibleProducts.length} of ${currentProductList.length} products`
        : `${currentProductList.length} products`;
  }
  const loadMore=document.getElementById("load-more-products");
  if(loadMore){
    loadMore.hidden=visibleProductCount>=currentProductList.length;
  }
}
function renderCart() {
  const target = document.getElementById("cart-items");
  const summary = document.getElementById("cart-summary");
  if (!target || !summary) {
    return;
  }
  const cart = getCart();
  if (!cart.length) {
    target.innerHTML = `
      <div class="empty-state">
        <h2>Your cart is waiting.</h2>
        <p>Add products worth &#8377;1000 to place an order.</p>
        <a class="btn btn-primary" href="products.html">Browse products</a>
      </div>
    `;
    summary.innerHTML = "";
    return;
  }
  let subtotal = 0;
  let hasUnavailableCartItem = false;
  let hasOfflineOnlyCartItem = false;
  target.innerHTML = cart
    .map(item => {
      const quantity = Number(item.quantity) || 0;
      const p = ALL_PRODUCTS.find(
        product => String(product.id) === String(item.id)
      );
      if (!p) {
        hasUnavailableCartItem = true;
        return `
          <div class="cart-row cart-row-unavailable">
            <div class="cart-missing-product">
              <strong>Product no longer available</strong>
            </div>
            <div class="cart-price">
              <button
                class="remove"
                data-remove="${escapeAttr(item.id)}"
                type="button"
              >
                Remove
              </button>
            </div>
          </div>
        `;
      }
      const step = getProductStep(p);
      const max = getProductMax(p);
      const offlineOnly =
        p.offlinePurchaseOnly === true;
      const unpublished =
        p.isPublished === false;
      const cartItemUnavailable =
        unpublished ||
        p.available === false ||
        max < step ||
        quantity > max;
      if (offlineOnly) {
        hasOfflineOnlyCartItem = true;
      }
      if (cartItemUnavailable) {
        hasUnavailableCartItem = true;
      }
      const basePrice =
        Number(p.price) || 0;
      const line =
        basePrice * quantity;
      subtotal += line;
      return `
        <div class="cart-row ${cartItemUnavailable || offlineOnly ? "cart-row-unavailable" : ""}">
          <img
            src="${escapeAttr(normalizeImageUrl(p.image))}"
            alt="${escapeAttr(p.name)}"
          >
          <div class="cart-product-details">
            <h3 class="cart-product-name">
              <span>${escapeHtml(p.name)}</span>
              ${
                unpublished
                  ? '<sup class="cart-unavailable-sup">! Product no longer available</sup>'
                : cartItemUnavailable
                  ? '<sup class="cart-unavailable-sup">! Product no longer available</sup>'
                : offlineOnly
                  ? '<sup class="cart-unavailable-sup">Available In-Store Only</sup>'
                : ""
              }
            </h3>
            <p class="cart-unit-price">
              ${currency.format(basePrice)} per unit
            </p>
            <div class="quantity">
              <button
                type="button"
                data-dec="${escapeAttr(p.id)}"
                ${
                  cartItemUnavailable || offlineOnly
                    ? 'disabled title="Product is no longer available"'
                    : ""
                }
              >
                −
              </button>
              <span>${quantity}</span>
              <button
                type="button"
                data-inc="${escapeAttr(p.id)}"
                ${
                  cartItemUnavailable || offlineOnly
                    ? 'disabled title="Product is no longer available"'
                    : quantity >= Math.min(max, getProductCartLimit(p))
                      ? 'disabled title="Maximum available quantity reached"'
                      : ""
                }
              >
                +
              </button>
            </div>
          </div>
          <div class="cart-price">
            <div>${currency.format(line)}</div>
            <button
              class="remove"
              data-remove="${escapeAttr(p.id)}"
              type="button"
            >
              Remove
            </button>
          </div>
        </div>
      `;
    })
    .join("");
  const minimumOrderValue = 1000;
  const belowMinimum =
    subtotal < minimumOrderValue;
  summary.innerHTML = `
    <h2>Order summary</h2>
    <div class="summary-line">
      <span>Subtotal</span>
      <strong>${currency.format(subtotal)}</strong>
    </div>
    <div class="summary-line">
      <span>Delivery</span>
      <span>Calculated at checkout</span>
    </div>
    <div class="summary-line summary-total">
      <span>Total</span>
      <span>${currency.format(subtotal)}</span>
    </div>
    <button
      class="btn btn-primary checkout"
      id="checkout-btn"
      ${belowMinimum || hasUnavailableCartItem || hasOfflineOnlyCartItem ? "disabled" : ""}
    >
      Proceed to checkout
    </button>
    ${
        hasUnavailableCartItem
          ? `
            <p class="minimum-order-note">
              Remove unavailable products before checkout.
            </p>
          `
        : hasOfflineOnlyCartItem
          ? `
            <p class="minimum-order-note">
              Remove in-store-only products before checkout.
            </p>
          `
        : belowMinimum
        ? `
          <p class="minimum-order-note">
            Minimum order value is ₹1,000.
          </p>
        `
          : `
            <p style="font-size:11px;color:var(--muted);margin:12px 0 0">
              Product prices shown exclude applicable GST. GST and any delivery charges will be calculated at checkout.
            </p>
          `
    }
  `;
}
let featuredTimer=null,storyTimer=null,featuredIndex=0,storyIndex=0;
/* =========================================================
   FEATURED COLLECTION — ORIGINAL LAYERED CAROUSEL
   ========================================================= */
function getFeaturedProductUrl(product) {
  if (!product?.id) {
    return "products.html";
  }
  const category = (STORE_DATA.categories || []).find(
    c => String(c.id) === String(product.categoryId)
  );
  if (!category) {
    return "products.html";
  }
  const catalogue = (STORE_DATA.catalogues || []).find(
    c => String(c.id) === String(category.catalogueId)
  );
  if (!catalogue?.slug) {
    return "products.html";
  }
  const params = new URLSearchParams({
    catalogue: catalogue.slug,
    product: String(product.id)
  });
  return "catalogue.html?" + params.toString();
}
function initFeaturedCarousel() {
  const carousel=document.getElementById("featured-carousel");
  const viewport=document.getElementById("featured-carousel-viewport");
  const track=document.getElementById("featured-products");
  const prevButton=document.getElementById("featured-prev");
  const nextButton=document.getElementById("featured-next");
  if(!carousel||!viewport||!track)return;
  /* Backend carousel controls which products/images are shown.
     If nothing is configured, fall back to the featured products. */
    /*
   * Featured Carousel — product-linked slides only.
   *
   * Product image, name and price come directly
   * from the current product data.
   *
   * Unpublished products are hidden automatically,
   * without changing the slide's Active setting.
   */
  const configured = (STORE_DATA.carousel || [])
    .filter(slide => slide.active !== false)
    .slice()
    .sort(
      (a, b) =>
        (Number(a.displayOrder) || 0) -
        (Number(b.displayOrder) || 0)
    );
  const featuredProducts = configured
    .map(slide => {
      const linkedId =
        String(slide.productId || '').trim();
      if (!linkedId) {
        return null;
      }
      const product = ALL_PRODUCTS.find(
        p => String(p.id) === linkedId
      );
      if (!product) {
        return null;
      }
      // Unpublished products never appear publicly.
      if (product.isPublished === false) {
        return null;
      }
      // An unavailable but published product can retain
      // an existing Active carousel slide.
      return product;
    })
    .filter(Boolean);
  /*
   * No automatic fallback products.
   *
   * Only explicitly configured Active slides
   * with published, existing products are displayed.
   */
  if (!featuredProducts.length) {
    track.innerHTML = "";
    return;
  }
  let currentIndex=0;
  let autoSlideTimer=null;
  let isDragging=false;
  let startX=0;
  let currentX=0;
  let dragDistance=0;
  let carouselWasDragged=false;
  track.innerHTML=featuredProducts.map(function(product,index){
    const image = normalizeImageUrl(product.image);
    const title = product.name || "Bloom & Pod";
    return `
      <a
        class="featured-carousel-card"
        data-index="${index}"
        href="${escapeAttr(getFeaturedProductUrl(product))}"
        aria-label="View ${escapeAttr(title)} in its catalogue"
        draggable="false"
      >
        <img class="featured-carousel-card-image" src="${escapeAttr(image)}" alt="${escapeAttr(title)}" draggable="false" onerror="this.dataset.imageError='1';this.style.opacity='0.35';">
        <div class="featured-carousel-card-content">
          <h3 class="featured-carousel-card-name">${escapeHtml(title)}</h3>
          <p class="featured-carousel-card-price">${currency.format(getProductBasePrice(product))}</p>
        </div>
      </a>`;
  }).join("");
  const cards=Array.from(track.querySelectorAll(".featured-carousel-card"));
  if(!cards.length)return;
  function updateCarousel(){
    const total=cards.length;
    cards.forEach(function(card,index){
      let offset=index-currentIndex;
      if(offset>total/2)offset-=total;
      if(offset<-total/2)offset+=total;
      const absOffset=Math.abs(offset);
      let translateX=0,translateY=0,scale=1,rotateY=0,opacity=1,zIndex=10,blur=0;
      if(offset===0){
        translateX=0;translateY=0;scale=1;rotateY=0;opacity=1;zIndex=30;blur=0;
        card.classList.add("is-active");
      }else{
        card.classList.remove("is-active");
        translateX=offset*184;
        translateY=Math.min(absOffset*10,45);
        scale=Math.max(0.64,1-absOffset*0.12);
        rotateY=offset>0?-8:8;
        opacity=Math.max(0.2,1-absOffset*0.18);
        zIndex=30-Math.round(absOffset);
        blur=Math.max(0,(absOffset-2)*1.2);
      }
      card.style.transform=`translate(-50%, -50%) translate3d(${translateX}px, ${translateY}px, 0) scale(${scale}) rotateY(${rotateY}deg)`;
      card.style.opacity=opacity;
      card.style.zIndex=zIndex;
      card.style.filter=`saturate(${offset===0?1:0.82}) blur(${blur}px)`;
    });
  }
  function nextSlide(){
    currentIndex=(currentIndex+1)%cards.length;
    updateCarousel();
    restartAutoSlide();
  }
  function previousSlide(){
    currentIndex=(currentIndex-1+cards.length)%cards.length;
    updateCarousel();
    restartAutoSlide();
  }
  function stopAutoSlide(){
    if(autoSlideTimer){clearInterval(autoSlideTimer);autoSlideTimer=null;}
  }
  function startAutoSlide(){
    stopAutoSlide();
    if(cards.length<2)return;
    const delay=Number(getSetting("featured_auto_slide_ms",5000))||5000;
    autoSlideTimer=setInterval(function(){
      if(!isDragging){currentIndex=(currentIndex+1)%cards.length;updateCarousel();}
    },delay);
  }
  function restartAutoSlide(){startAutoSlide();}
  viewport.addEventListener("pointerdown",function(event){
    if(event.button!==undefined&&event.button!==0)return;
    isDragging=true;carouselWasDragged=false;startX=event.clientX;currentX=event.clientX;dragDistance=0;
    viewport.classList.add("is-dragging");stopAutoSlide();
  });
  viewport.addEventListener("pointermove", function(event) {
    if (!isDragging) return;
    currentX = event.clientX;
    dragDistance = currentX - startX;
    if (Math.abs(dragDistance) > 8 && !carouselWasDragged) {
      carouselWasDragged = true;
      // Capture only after a real drag begins.
      try {
        viewport.setPointerCapture(event.pointerId);
      } catch (error) {}
    }
  });
  function finishDrag(event){
    if(!isDragging)return;
    isDragging=false;viewport.classList.remove("is-dragging");
    try{if(event.pointerId!==undefined)viewport.releasePointerCapture(event.pointerId);}catch(error){}
    const threshold=55;
    if(dragDistance<-threshold)currentIndex=(currentIndex+1)%cards.length;
    else if(dragDistance>threshold)currentIndex=(currentIndex-1+cards.length)%cards.length;
    updateCarousel();restartAutoSlide();
  }
  viewport.addEventListener("pointerup",finishDrag);
  viewport.addEventListener("pointercancel",finishDrag);
  viewport.addEventListener("pointerleave",function(event){if(isDragging)finishDrag(event);});
  viewport.addEventListener("click", function(event) {
  if (carouselWasDragged) {
    event.preventDefault();
    carouselWasDragged = false;
  }
});
  if(nextButton)nextButton.addEventListener("click",function(event){event.preventDefault();event.stopPropagation();nextSlide();});
  if(prevButton)prevButton.addEventListener("click",function(event){event.preventDefault();event.stopPropagation();previousSlide();});
  carousel.addEventListener("mouseenter",stopAutoSlide);
  carousel.addEventListener("mouseleave",function(){if(!isDragging)startAutoSlide();});
  carousel.setAttribute("tabindex","0");
  carousel.addEventListener("keydown",function(event){
    if(event.key==="ArrowLeft"){event.preventDefault();previousSlide();}
    if(event.key==="ArrowRight"){event.preventDefault();nextSlide();}
  });
  updateCarousel();
  startAutoSlide();
}
function initStorySlider(){
  const image=document.getElementById("story-slider-image");
  const prevButton=document.querySelector(".story-slider-prev");
  const nextButton=document.querySelector(".story-slider-next");
  if(!image)return;
  const configured=(STORE_DATA.storySlides||[]).filter(x=>x.active!==false&&x.image);
  const storyImages=configured.length
    ? configured.sort((a,b)=>(Number(a.displayOrder)||0)-(Number(b.displayOrder)||0)).map(s=>({image:normalizeImageUrl(s.image),alt:s.alt||"Bloom & Pod botanical"}))
    : [];
  if(!storyImages.length)return;
  let currentIndex=0;
  function showStoryImage(index){
    currentIndex=(index+storyImages.length)%storyImages.length;
    image.src=storyImages[currentIndex].image;
    image.alt=storyImages[currentIndex].alt;
  }
  function stop(){if(storyTimer){clearInterval(storyTimer);storyTimer=null;}}
  function start(){stop();if(storyImages.length>1){storyTimer=setInterval(()=>showStoryImage(currentIndex+1),Number(getSetting("story_auto_slide_ms",5000))||5000);}}
  if(prevButton)prevButton.onclick=function(e){e.preventDefault();showStoryImage(currentIndex-1);start();};
  if(nextButton)nextButton.onclick=function(e){e.preventDefault();showStoryImage(currentIndex+1);start();};
  showStoryImage(0);start();
}
function escapeHtml(v){return String(v??"").replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function escapeAttr(v){return escapeHtml(v)}
document.addEventListener("click",e=>{
  const productView = e.target.closest("[data-product-view]");
if(productView){
  openProductModal(
    productView.dataset.productView
  );
  return;
}
  const add=e.target.closest("[data-add]");
  if(add)addToCart(add.dataset.add);
  const productInc =
  e.target.closest("[data-product-inc]");
if(productInc){
  const id = productInc.dataset.productInc;
  const p = PRODUCTS.find(
    x => String(x.id) === String(id)
  );
  if(p){
    changeQty(id, 1);
  }
  return;
}
const productDec =
  e.target.closest("[data-product-dec]");
if(productDec){
  const id = productDec.dataset.productDec;
  const p = PRODUCTS.find(
    x => String(x.id) === String(id)
  );
  if(p){
    changeQty(id, -1);
  }
  return;
}
  const inc = e.target.closest("[data-inc]");
  if (inc) {
    changeQty(inc.dataset.inc, 1);
  }
  const dec = e.target.closest("[data-dec]");
  if (dec) {
    changeQty(dec.dataset.dec, -1);
  }
  const rem=e.target.closest("[data-remove]");
  if(rem)removeFromCart(rem.dataset.remove);
  if (e.target.id === "checkout-btn") {
    if (
      STORE_DATA?.success !== true ||
      hasUnavailableCartItem()
    ) {
      showToast(
        "Remove products that cannot be purchased online before checkout."
      );
      renderCart();
      return;
    }
  window.location.href = "checkout.html";
}
  if(e.target.closest(".menu-toggle")){
    const nav=document.querySelector(".nav");
    const btn=document.querySelector(".menu-toggle");
    const open=nav.classList.toggle("open");
    btn.setAttribute("aria-expanded",open);
  }
});
/* Multi Modal carousel arrow navigation */
document.addEventListener("click", e => {
  if (e.target.closest("#product-modal-prev")) {
    e.preventDefault();
    changeProductModalImage(-1);
    return;
  }
  if (e.target.closest("#product-modal-next")) {
    e.preventDefault();
    changeProductModalImage(1);
    return;
  }
});
document.addEventListener("click",e=>{
  if(e.target.id==="product-modal-close"){
    closeProductModal();
    return;
  }
  if(e.target.id==="product-modal"){
    closeProductModal();
  }
});
document.addEventListener("keydown",e=>{
  if(e.key==="Escape"){
    closeProductModal();
  }
});
function populateCategoryFilter(){
  const select = document.getElementById("filter-category");
  if(!select) return;
  const categories = [...new Set(
    PRODUCTS
      .map(p => String(p.category || "").trim())
      .filter(Boolean)
  )].sort((a,b) => a.localeCompare(b));
  select.innerHTML = `
    <option value="all">All categories</option>
    ${categories.map(category => `
      <option value="${escapeAttr(category)}">
        ${escapeHtml(category)}
      </option>
    `).join("")}
  `;
}
function applyProductFilters(){
  const categorySelect = document.getElementById("filter-category");
  const sortSelect = document.getElementById("sort-products");
  const selectedCategory = categorySelect
    ? categorySelect.value
    : "all";
  const selectedSort = sortSelect
    ? sortSelect.value
    : "featured";
  let list = [...PRODUCTS];
  // Category filter
  if(selectedCategory !== "all"){
    list = list.filter(product =>
      String(product.category || "").trim() === selectedCategory
    );
  }
  // Sorting
if(selectedSort === "price-asc"){
  list.sort(
    (a,b) =>
      Number(a.price || 0) -
      Number(b.price || 0)
  );
}
if(selectedSort === "price-desc"){
  list.sort(
    (a,b) =>
      Number(b.price || 0) -
      Number(a.price || 0)
  );
}
if(selectedSort === "name-asc"){
  list.sort(
    (a,b) =>
      String(a.name || "")
        .localeCompare(
          String(b.name || "")
        )
  );
}
if(selectedSort === "name-desc"){
  list.sort(
    (a,b) =>
      String(b.name || "")
        .localeCompare(
          String(a.name || "")
        )
  );
}
  renderProducts(list);
}
document.addEventListener("change", e => {
  if(
    e.target.id === "filter-category" ||
    e.target.id === "sort-products"
  ){
    applyProductFilters();
  }
});
document.addEventListener("DOMContentLoaded",()=>{updateCartCount();document.querySelectorAll("#year").forEach(el=>el.textContent=new Date().getFullYear());loadStoreData()});
document.addEventListener("click",e=>{
  if(e.target.id!=="load-more-products")return;
  visibleProductCount=Math.min(
    visibleProductCount+PRODUCTS_PER_PAGE,
    currentProductList.length
  );
  renderVisibleProducts();
});
document.addEventListener(
  "DOMContentLoaded",
  () => {
    updateFloatingCart();
  }
);
window.addEventListener(
  "scroll",
  keepFloatersAboveFooter,
  {
    passive:true
  }
);
window.addEventListener(
  "resize",
  keepFloatersAboveFooter
);
window.addEventListener(
  "load",
  keepFloatersAboveFooter
);
document.addEventListener(
  "DOMContentLoaded",
  () => {
    keepFloatersAboveFooter();
    const observer =
      new ResizeObserver(
        keepFloatersAboveFooter
      );
    observer.observe(
      document.documentElement
    );
  }
);

/* ==========================================
   GLOBAL PRODUCT SEARCH — FIELD INTERACTIONS
   ========================================== */

document.addEventListener("DOMContentLoaded", () => {
  const search = document.getElementById("header-search");

  if (!search) return;

  const input = search.querySelector("#header-search-input");
  const summary = search.querySelector("summary");

  if (!input || !summary) return;

  // Focus the input after the search panel opens.
  search.addEventListener("toggle", () => {
    if (search.open) {
      input.focus({ preventScroll: true });
    }
  });

  // Close when clicking outside the search area.
  document.addEventListener("click", event => {
    if (search.open && !search.contains(event.target)) {
      search.open = false;
    }
  });

  // Escape closes the field without clearing its text.
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && search.open) {
      event.preventDefault();
      search.open = false;
      summary.focus({ preventScroll: true });
    }
  });
});


/* ==========================================
   GLOBAL PRODUCT SEARCH — LIVE SUGGESTIONS
   ========================================== */

document.addEventListener("DOMContentLoaded", () => {  
  const input = document.getElementById("header-search-input");
  const results = document.getElementById("header-search-results");

  if (!input || !results) return;

  const searchField = input.closest(".header-search-field");
  const searchArrow = searchField?.querySelector("button");

  function openSearchResults() {
    const query = input.value.trim();

    if (query.length < 2) return;

    const destination = new URL(
      "search.html",
      window.location.href
    );

    destination.searchParams.set("q", query);

    window.location.assign(destination.toString());
  }

  // Search arrow
  searchArrow?.addEventListener("click", openSearchResults);

  // Enter key
  input.addEventListener("keydown", event => {
    if (event.key !== "Enter") return;

    event.preventDefault();
    openSearchResults();
  });

  let searchTimer = null;
  let searchVersion = 0;

  function showMessage(message) {
    results.replaceChildren();

    const text = document.createElement("p");
    text.className = "search-feedback";
    text.textContent = message;

    results.appendChild(text);
    results.hidden = false;
  }

  function renderSuggestions(rows, query) {
    results.replaceChildren();

    if (!rows.length) {
      showMessage("No matching products found.");
      return;
    }

    const list = document.createElement("div");
    list.className = "search-suggestion-list";

    rows.forEach(row => {
      const product = row.product;
      if (!product) return;
      
      const item = document.createElement("a");
      item.className = "search-suggestion";

      const catalogueSlug = String(
        product.catalogueSlug || ""
      ).trim();

      const productId = String(
        product.id || ""
      ).trim();

      if (catalogueSlug && productId) {
        const destination = new URL(
          "catalogue.html",
          window.location.href
        );

        destination.searchParams.set(
          "catalogue",
          catalogueSlug
        );

        destination.searchParams.set(
          "product",
          productId
        );

        item.href = destination.toString();
      } else {
        item.removeAttribute("href");
        item.setAttribute("aria-disabled", "true");
      }

      const image = document.createElement("img");
      image.className = "search-suggestion-image";
      image.alt = "";
      image.loading = "lazy";
      image.src = product.image || "images/logo.png";
      
      const name = document.createElement("span");
      name.className = "search-suggestion-name";

      const productName = String(product.name || "");
      const searchText = query.trim();

      const lowerName = productName.toLocaleLowerCase();
      const lowerQuery = searchText.toLocaleLowerCase();

      let position = 0;
      let matchIndex = lowerName.indexOf(lowerQuery, position);

      while (matchIndex !== -1 && lowerQuery.length > 0) {
        // Add text before the matching substring.
        name.appendChild(
          document.createTextNode(
            productName.slice(position, matchIndex)
          )
        );

        // Highlight the matching substring.
        const highlight = document.createElement("mark");
        highlight.className = "search-match-highlight";
        highlight.textContent = productName.slice(
          matchIndex,
          matchIndex + searchText.length
        );

        name.appendChild(highlight);

        position = matchIndex + searchText.length;
        matchIndex = lowerName.indexOf(lowerQuery, position);
      }

      // Add the remaining product-name text.
      name.appendChild(
        document.createTextNode(productName.slice(position))
      );

      item.append(image, name);
      list.appendChild(item);
    });
    
    const footer = document.createElement("a");
    footer.className = "search-suggestion-footer";
    footer.textContent = `View all results for "${query}" →`;

    const destination = new URL(
      "search.html",
      window.location.href
    );

    destination.searchParams.set("q", query);

    footer.href = destination.toString();

    // Navigation will be connected in the next steps.
    results.append(list, footer);
    results.hidden = false;
  }

  input.addEventListener("input", () => {
    clearTimeout(searchTimer);

    const query = input.value.trim();
    const version = ++searchVersion;

    if (query.length < 2) {
      results.hidden = true;
      results.replaceChildren();
      return;
    }

    showMessage("Searching products...");

    searchTimer = setTimeout(async () => {
      try {
        const { data, error } = await window.bpSupabase
          .rpc("search_store_products", {
            search_text: query,
            page_size: 5,
            page_offset: 0
          });

        if (error) throw error;

        if (version !== searchVersion) return;

        renderSuggestions(data || [], query);
      } catch (error) {
        if (version !== searchVersion) return;

        console.error("Product search failed:", error);
        showMessage("Unable to search. Please try again.");
      }
    }, 300);
  });
});
