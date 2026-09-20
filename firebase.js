import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import {
  getDatabase, ref, get, set, push, onValue, remove, update
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

import { firebaseConfig } from './config.js';
import { State, emit } from './state.js';
import { toast, bumpCount } from './utils.js';

export const app  = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getDatabase(app);

/* -- AUTH ACTIONS -- */
export async function login(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}
export async function register(email, password) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await set(ref(db, `users/${cred.user.uid}`), {
    email, joinedDate: Date.now(), lastLogin: Date.now()
  });
  return cred;
}
export async function logout() {
  return signOut(auth);
}

/* -- CART ACTIONS (same DB path as before) -- */
export async function addToCart(productId) {
  if (!State.currentUser) {
    toast('Please login', 'Login to add items to your cart.', 'warn');
    emit('need-auth');
    return;
  }
  const product = State.allProducts.find(p => p.id === productId);
  if (!product) return;
  const cartRef = ref(db, `users/${State.currentUser.uid}/cart/${productId}`);
  const snap = await get(cartRef);
  const currentQty = snap.exists() ? snap.val().quantity : 0;
  await set(cartRef, { quantity: currentQty + 1 });
  toast('Added to cart', `${product.name} · Rs. ${Number(product.price || 0).toLocaleString('en-IN')}`, 'ok');
  bumpCount('#cartCount');
}
export async function updateCartQty(productId, change) {
  if (!State.currentUser) return;
  const cartRef = ref(db, `users/${State.currentUser.uid}/cart/${productId}`);
  const snap = await get(cartRef);
  if (!snap.exists()) return;
  const newQty = snap.val().quantity + change;
  if (newQty <= 0) await remove(cartRef);
  else await set(cartRef, { quantity: newQty });
}
export async function removeFromCart(productId) {
  if (!State.currentUser) return;
  await remove(ref(db, `users/${State.currentUser.uid}/cart/${productId}`));
}
export async function clearCart() {
  if (!State.currentUser) return;
  await remove(ref(db, `users/${State.currentUser.uid}/cart`));
}

/* -- WISHLIST ACTIONS -- */
export async function toggleWishlist(productId) {
  if (!State.currentUser) {
    toast('Please login', 'Login to manage your wishlist.', 'warn');
    emit('need-auth');
    return;
  }
  const wRef = ref(db, `users/${State.currentUser.uid}/wishlist/${productId}`);
  const snap = await get(wRef);
  if (snap.exists()) {
    await remove(wRef);
    toast('Removed', 'Removed from wishlist.', 'info');
  } else {
    await set(wRef, true);
    toast('Saved!', 'Added to wishlist.', 'ok');
  }
  bumpCount('#wishCount');
}
export async function clearWishlist() {
  if (!State.currentUser) return;
  await remove(ref(db, `users/${State.currentUser.uid}/wishlist`));
}

/* -- ORDER ACTIONS — writes the same shape as before -- */
export async function placeOrder({ name, phone, address }) {
  if (!State.currentUser) throw new Error('Not signed in');
  const items = Object.entries(State.cartData).map(([id, item]) => {
    const p = State.allProducts.find(x => x.id === id);
    return {
      productId: id,
      name: p ? p.name : 'Fish',
      quantity: item.quantity,
      price: p ? Number(p.price || 0) : 0
    };
  });
  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const orderRef = push(ref(db, `orders/${State.currentUser.uid}`));
  await set(orderRef, {
    orderId: orderRef.key,
    date: Date.now(),
    userEmail: State.currentUser.email,
    items, totalAmount: total,
    status: 'pending',
    shippingName: name,
    shippingMobile: phone,
    shippingAddress: address
  });
  await remove(ref(db, `users/${State.currentUser.uid}/cart`));
  return orderRef.key;
}

/* -- LISTENERS — the exact data pipeline used by your existing site -- */
export function setupListeners() {
  /* LIVE PRODUCTS from the seller panel */
  onValue(ref(db, 'pets'), (snapshot) => {
    const data = snapshot.val();
    if (!data) {
      State.allProducts = [];
      emit('products-updated');
      return;
    }
    State.allProducts = Object.entries(data)
      .filter(([, p]) => (p.status || 'approved') === 'approved')
      .map(([id, p]) => ({
        id,
        ...p,
        live: true,
        name: p.name || 'Unnamed Fish',
        price: Number(p.price) || 0,
        imageUrl: p.imageUrl || p.image || '',
        availability: p.availability !== false && p.status !== 'out_of_stock'
      }));
    emit('products-updated');
  }, (err) => console.warn('[ABI] products listener error:', err));

  /* AUTH — preserved */
  onAuthStateChanged(auth, (user) => {
    State.currentUser = user;
    if (user) {
      State.userCartRef = ref(db, `users/${user.uid}/cart`);
      State.userWishlistRef = ref(db, `users/${user.uid}/wishlist`);

      onValue(State.userCartRef, (snap) => {
        State.cartData = snap.val() || {};
        emit('cart-updated');
      });
      onValue(State.userWishlistRef, (snap) => {
        State.wishlistData = snap.val() || {};
        emit('wishlist-updated');
      });
      onValue(ref(db, `orders/${user.uid}`), (snap) => {
        const data = snap.val();
        State.ordersData = data
          ? Object.entries(data).map(([id, o]) => ({ id, ...o })).sort((a, b) => (b.date || 0) - (a.date || 0))
          : [];
        emit('orders-updated');
      });
    } else {
      State.cartData = {};
      State.wishlistData = {};
      State.ordersData = [];
      emit('cart-updated');
      emit('wishlist-updated');
      emit('orders-updated');
    }
    emit('auth-changed');
  });

  /* STORE HIGHLIGHTS — existing path preserved */
  onValue(ref(db, 'sliderImages'), (snap) => {
    const data = snap.val();
    if (!data) return;
    const items = Object.values(data).filter(x => x && (x.downloadURL || typeof x === 'string'));
    if (!items.length) return;
    emit('highlights-updated', { items });
  }, () => {});
}

