export const State = {
  currentUser: null,
  allProducts: [],       // filled live from Firebase Realtime Database at 'pets'
  cartData: {},          // per-user at 'users/{uid}/cart'
  wishlistData: {},      // per-user at 'users/{uid}/wishlist'
  ordersData: [],        // per-user at 'orders/{uid}'
  userCartRef: null,
  userWishlistRef: null,
  filters: { q: '', cat: 'All', care: '', size: '', max: 20000, avail: false, beg: false, sort: 'pop' },
  knownCategories: ['All'],
  showroomCat: null,
  perfMode: false
};

export const Events = new EventTarget();
export function emit(name, detail = {}) {
  Events.dispatchEvent(new CustomEvent(name, { detail }));
}
