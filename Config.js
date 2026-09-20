export const firebaseConfig = {
  apiKey: "AIzaSyAgrXYL1M-cO8LYTmJeEtfwhkp-ghXfNWY",
  authDomain: "abi-fish-pets.firebaseapp.com",
  databaseURL: "https://abi-fish-pets-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "abi-fish-pets",
  storageBucket: "abi-fish-pets.firebasestorage.app",
  messagingSenderId: "644115504257",
  appId: "1:644115504257:web:278b713d235aa8938a0180",
  measurementId: "G-2T3T8RTJKE"
};

export const CARE = [
  { key: 'water', icon: 'M12 3c3.5 4 6 6.8 6 10a6 6 0 0 1-12 0c0-3.2 2.5-6 6-10z',
    title: 'Water Quality', short: 'Ammonia, nitrite, nitrate and pH — the four numbers that decide everything.',
    body: `<p>Your fish live in their own waste. Keeping that water safe is 80% of the hobby.</p>
      <ul style="margin:14px 0 0 18px;color:var(--text-2);font-size:.9rem;line-height:1.9">
        <li><b style="color:#fff">Ammonia &amp; nitrite:</b> must read 0 ppm.</li>
        <li><b style="color:#fff">Nitrate:</b> keep under 20–40 ppm with weekly 25–30% water changes.</li>
        <li><b style="color:#fff">pH:</b> stability matters more than the exact number.</li>
        <li><b style="color:#fff">Cycle first:</b> run the filter 3–6 weeks before adding fish.</li>
      </ul>` },
  { key: 'feeding', icon: 'M4 12h16M12 4v16M7 7l10 10M17 7 7 17',
    title: 'Feeding', short: 'Feed small amounts, twice daily.',
    body: `<p>Overfeeding kills more aquarium fish than underfeeding.</p>
      <ul style="margin:14px 0 0 18px;color:var(--text-2);font-size:.9rem;line-height:1.9">
        <li>Feed 2 small portions a day; each gone in ~2 minutes.</li>
        <li>Goldfish need plant matter — blanched spinach or peas weekly.</li>
        <li>Bettas: 3–4 pellets or 2–3 bloodworms per meal.</li>
        <li>One fasting day per week helps digestion.</li>
      </ul>` },
  { key: 'cleaning', icon: 'M5 12h14M6 12l1.6 7.4A2 2 0 0 0 9.6 21h4.8a2 2 0 0 0 2-1.6L18 12M9 12V6a3 3 0 0 1 6 0v6',
    title: 'Tank Cleaning', short: 'Weekly partial changes beat occasional full teardowns.',
    body: `<p>Never strip a tank completely — you'd destroy the bacteria that keep fish alive.</p>
      <ul style="margin:14px 0 0 18px;color:var(--text-2);font-size:.9rem;line-height:1.9">
        <li>Weekly: 25–30% water change with a gravel vacuum.</li>
        <li>Rinse filter media in <i>tank water</i>, never tap water.</li>
        <li>Scrub algae; leave some on rocks for grazing fish.</li>
        <li>Dechlorinate new water and match temperature within 1–2 °C.</li>
      </ul>` },
  { key: 'temperature', icon: 'M12 3v12M9 15a3 3 0 1 0 6 0V6a3 3 0 0 0-6 0z',
    title: 'Temperature', short: 'Sudden swings are more dangerous than being slightly off range.',
    body: `<p>Most tropical fish want 24–28 °C. Goldfish prefer 16–24 °C.</p>
      <ul style="margin:14px 0 0 18px;color:var(--text-2);font-size:.9rem;line-height:1.9">
        <li>Use a thermostat-controlled heater — 1 W per litre baseline.</li>
        <li>Never change more than 2 °C in a single hour.</li>
        <li>Float new bags 15–20 minutes before releasing fish.</li>
        <li>Keep tanks away from direct sun and AC vents.</li>
      </ul>` },
  { key: 'filtration', icon: 'M4 7h16v10H4zM8 7V4M16 7V4M9 12h6',
    title: 'Filtration', short: 'Turn the tank volume over 4–6 times every hour.',
    body: `<p>Filtration is mechanical (particles), biological (bacteria) and chemical (carbon). Biological matters most.</p>
      <ul style="margin:14px 0 0 18px;color:var(--text-2);font-size:.9rem;line-height:1.9">
        <li>Flow rate: 4–6× tank volume per hour.</li>
        <li>Fill media trays with ceramic rings or bio-balls.</li>
        <li>Never replace all media at once.</li>
        <li>Add an air stone for oxygen exchange.</li>
      </ul>` },
  { key: 'acclimation', icon: 'M12 3v6M9 6h6M6 12a6 6 0 1 0 12 0 6 6 0 0 0-12 0z',
    title: 'Fish Acclimation', short: 'The first 30 minutes decide whether your new fish thrives.',
    body: `<p>Temperature shock and pH shock are the two biggest risks when introducing a fish.</p>
      <ul style="margin:14px 0 0 18px;color:var(--text-2);font-size:.9rem;line-height:1.9">
        <li>Turn off the light and float the sealed bag for 15–20 minutes.</li>
        <li>Every 5 minutes add a small cup of tank water (3–4 times).</li>
        <li>Net the fish out — never pour bag water into the tank.</li>
        <li>Leave lights off a few hours; skip feeding on day one.</li>
      </ul>` }
];

export const DELIVERY = [
  { name: 'Kathmandu', x: 470, y: 168, time: 'Same day (order before 2 PM)', fee: 'Rs. 350', note: 'Valley-wide courier with insulated box. Live arrival guarantee.' },
  { name: 'Pokhara', x: 252, y: 206, time: 'Next day by 6 PM', fee: 'Rs. 650', note: 'Oxygen-packed, road courier via Prithvi Highway.' },
  { name: 'Chitwan', x: 402, y: 220, time: 'Next day afternoon', fee: 'Rs. 550', note: 'Served via Bharatpur. Thermal packing recommended in summer.' },
  { name: 'Itahari', x: 626, y: 152, time: 'Same / next day', fee: 'Rs. 300', note: 'Direct from our eastern dispatch hub.' },
  { name: 'Dharan', x: 658, y: 142, time: 'Same / next day', fee: 'Rs. 300', note: 'Local delivery within 3 hours of dispatch.' },
  { name: 'Biratnagar', x: 646, y: 176, time: 'Same / next day', fee: 'Rs. 300', note: 'Morning dispatch, evening delivery window.' },
  { name: 'Birtamod', x: 692, y: 158, time: 'Same day', fee: 'Rs. 200', note: 'Closest route to our main showroom.' },
  { name: 'Damak', x: 712, y: 144, time: 'Same day (hub city)', fee: 'Free', note: 'Our home city. Free local delivery and in-person pickup available.' }
];

export const STAGES = [
  { key: 'pending', label: 'Order Placed' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'packed', label: 'Packed' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' }
];

