interface MockedItem {
  imgSrc: string;
  name: string;
  id: string;
  description: string;
  price: number;
  salePrice: number;
  guid: string;
  currency: string;
}

interface MockedQuery {
  keyword?: string;
  take?: number;
  skip?: number;
  sort?: string;
}

const mockedItems: MockedItem[] = [
  {
    id: "0ec305ce-5d13-5566-825f-46950523f35d",
    name: "Ergonomic Office Chair",
    imgSrc: "data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2296%22%20height%3D%2296%22%3E%3Crect%20width%3D%2296%22%20height%3D%2296%22%20rx%3D%2216%22%20fill%3D%22%234f7cff%22/%3E%3Ctext%20x%3D%2248%22%20y%3D%2258%22%20font-family%3D%22Arial%2Csans-serif%22%20font-size%3D%2232%22%20font-weight%3D%22700%22%20fill%3D%22white%22%20text-anchor%3D%22middle%22%3EEO%3C/text%3E%3C/svg%3E",
    description: "Mesh back, adjustable lumbar support",
    price: 289,
    salePrice: 249,
    guid: "0f25a6ac-744b-5c23-ad45-8e2a179128c8",
    currency: "USD",
  },
  {
    id: "7b96452e-ef90-5396-9d5e-b7b8bbf35525",
    name: "Standing Desk 160\u00d780",
    imgSrc: "data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2296%22%20height%3D%2296%22%3E%3Crect%20width%3D%2296%22%20height%3D%2296%22%20rx%3D%2216%22%20fill%3D%22%2322a06b%22/%3E%3Ctext%20x%3D%2248%22%20y%3D%2258%22%20font-family%3D%22Arial%2Csans-serif%22%20font-size%3D%2232%22%20font-weight%3D%22700%22%20fill%3D%22white%22%20text-anchor%3D%22middle%22%3ESD%3C/text%3E%3C/svg%3E",
    description: "Dual motor, memory presets",
    price: 649,
    salePrice: 589,
    guid: "a8336702-b689-5c24-b0fe-d4e6c99deac1",
    currency: "USD",
  },
  {
    id: "1fd134d3-f637-56c7-b262-8be387910c37",
    name: "Wireless Keyboard K380",
    imgSrc: "data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2296%22%20height%3D%2296%22%3E%3Crect%20width%3D%2296%22%20height%3D%2296%22%20rx%3D%2216%22%20fill%3D%22%23f5a623%22/%3E%3Ctext%20x%3D%2248%22%20y%3D%2258%22%20font-family%3D%22Arial%2Csans-serif%22%20font-size%3D%2232%22%20font-weight%3D%22700%22%20fill%3D%22white%22%20text-anchor%3D%22middle%22%3EWK%3C/text%3E%3C/svg%3E",
    description: "Multi-device, quiet keys",
    price: 49,
    salePrice: 39,
    guid: "b9e1dd29-85f9-54b1-abcd-5dbb71051795",
    currency: "USD",
  },
  {
    id: "407b3c78-3bc3-556c-8f06-b75d3f6d7b66",
    name: "27\" 4K Monitor",
    imgSrc: "data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2296%22%20height%3D%2296%22%3E%3Crect%20width%3D%2296%22%20height%3D%2296%22%20rx%3D%2216%22%20fill%3D%22%239b59b6%22/%3E%3Ctext%20x%3D%2248%22%20y%3D%2258%22%20font-family%3D%22Arial%2Csans-serif%22%20font-size%3D%2232%22%20font-weight%3D%22700%22%20fill%3D%22white%22%20text-anchor%3D%22middle%22%3E24%3C/text%3E%3C/svg%3E",
    description: "IPS panel, USB-C 65 W",
    price: 399,
    salePrice: 359,
    guid: "3ea64ff3-37ec-5ca6-9e72-e9cd64983b70",
    currency: "USD",
  },
  {
    id: "c72dd024-f4bf-50b4-83fd-4129e85fd128",
    name: "Noise-Cancelling Headset",
    imgSrc: "data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2296%22%20height%3D%2296%22%3E%3Crect%20width%3D%2296%22%20height%3D%2296%22%20rx%3D%2216%22%20fill%3D%22%23e74c3c%22/%3E%3Ctext%20x%3D%2248%22%20y%3D%2258%22%20font-family%3D%22Arial%2Csans-serif%22%20font-size%3D%2232%22%20font-weight%3D%22700%22%20fill%3D%22white%22%20text-anchor%3D%22middle%22%3ENC%3C/text%3E%3C/svg%3E",
    description: "Bluetooth 5.3, 30 h battery",
    price: 179,
    salePrice: 149,
    guid: "8b8ba993-5013-528e-a0f9-1cb7dfc0a01d",
    currency: "USD",
  },
  {
    id: "120bb4f4-6bf1-5c16-b2a3-16c2f0c33c67",
    name: "Laser Printer M404",
    imgSrc: "data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2296%22%20height%3D%2296%22%3E%3Crect%20width%3D%2296%22%20height%3D%2296%22%20rx%3D%2216%22%20fill%3D%22%2316a085%22/%3E%3Ctext%20x%3D%2248%22%20y%3D%2258%22%20font-family%3D%22Arial%2Csans-serif%22%20font-size%3D%2232%22%20font-weight%3D%22700%22%20fill%3D%22white%22%20text-anchor%3D%22middle%22%3ELP%3C/text%3E%3C/svg%3E",
    description: "Duplex, 38 ppm, network",
    price: 329,
    salePrice: 299,
    guid: "60dd5614-f966-5e97-9a40-0a3e31b27028",
    currency: "USD",
  },
  {
    id: "c30fd371-3b0b-5f99-86bd-3925356c9a7d",
    name: "Document Shredder P-4",
    imgSrc: "data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2296%22%20height%3D%2296%22%3E%3Crect%20width%3D%2296%22%20height%3D%2296%22%20rx%3D%2216%22%20fill%3D%22%2334495e%22/%3E%3Ctext%20x%3D%2248%22%20y%3D%2258%22%20font-family%3D%22Arial%2Csans-serif%22%20font-size%3D%2232%22%20font-weight%3D%22700%22%20fill%3D%22white%22%20text-anchor%3D%22middle%22%3EDS%3C/text%3E%3C/svg%3E",
    description: "Cross-cut, 20 L bin",
    price: 219,
    salePrice: 189,
    guid: "659ba4be-455c-5df0-a1d7-f40c4694ecad",
    currency: "USD",
  },
  {
    id: "18d02240-b574-501b-84f0-e55f34937b9b",
    name: "Whiteboard 120\u00d790",
    imgSrc: "data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2296%22%20height%3D%2296%22%3E%3Crect%20width%3D%2296%22%20height%3D%2296%22%20rx%3D%2216%22%20fill%3D%22%232980b9%22/%3E%3Ctext%20x%3D%2248%22%20y%3D%2258%22%20font-family%3D%22Arial%2Csans-serif%22%20font-size%3D%2232%22%20font-weight%3D%22700%22%20fill%3D%22white%22%20text-anchor%3D%22middle%22%3EW1%3C/text%3E%3C/svg%3E",
    description: "Magnetic, aluminium frame",
    price: 139,
    salePrice: 119,
    guid: "4749f94c-9a32-5e73-826b-38a7a45792d5",
    currency: "USD",
  },
  {
    id: "d39751f7-76e3-5480-ae1e-c221d927b396",
    name: "LED Desk Lamp",
    imgSrc: "data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2296%22%20height%3D%2296%22%3E%3Crect%20width%3D%2296%22%20height%3D%2296%22%20rx%3D%2216%22%20fill%3D%22%23d35400%22/%3E%3Ctext%20x%3D%2248%22%20y%3D%2258%22%20font-family%3D%22Arial%2Csans-serif%22%20font-size%3D%2232%22%20font-weight%3D%22700%22%20fill%3D%22white%22%20text-anchor%3D%22middle%22%3ELD%3C/text%3E%3C/svg%3E",
    description: "Dimmable, wireless charging base",
    price: 69,
    salePrice: 59,
    guid: "70825d2c-d3e8-5fa6-9aae-e9cbd578365f",
    currency: "USD",
  },
  {
    id: "a8af07c2-a234-573b-90f5-17c9d045a042",
    name: "Copy Paper A4 (5 reams)",
    imgSrc: "data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2296%22%20height%3D%2296%22%3E%3Crect%20width%3D%2296%22%20height%3D%2296%22%20rx%3D%2216%22%20fill%3D%22%237f8c8d%22/%3E%3Ctext%20x%3D%2248%22%20y%3D%2258%22%20font-family%3D%22Arial%2Csans-serif%22%20font-size%3D%2232%22%20font-weight%3D%22700%22%20fill%3D%22white%22%20text-anchor%3D%22middle%22%3ECP%3C/text%3E%3C/svg%3E",
    description: "80 g/m\u00b2, FSC certified",
    price: 34,
    salePrice: 29,
    guid: "a9cca151-75bf-5ad1-9674-5ca4f186bd92",
    currency: "USD",
  },
  {
    id: "141f2c78-c857-5b80-b9ca-4738692af280",
    name: "Conference Speaker",
    imgSrc: "data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2296%22%20height%3D%2296%22%3E%3Crect%20width%3D%2296%22%20height%3D%2296%22%20rx%3D%2216%22%20fill%3D%22%238e44ad%22/%3E%3Ctext%20x%3D%2248%22%20y%3D%2258%22%20font-family%3D%22Arial%2Csans-serif%22%20font-size%3D%2232%22%20font-weight%3D%22700%22%20fill%3D%22white%22%20text-anchor%3D%22middle%22%3ECS%3C/text%3E%3C/svg%3E",
    description: "360\u00b0 mics, USB and Bluetooth",
    price: 249,
    salePrice: 219,
    guid: "93681774-d64b-5527-9c25-68dfdb114cb6",
    currency: "USD",
  },
  {
    id: "42ef15b2-72fe-5fe4-aa7b-33991a484c40",
    name: "Label Printer QL-800",
    imgSrc: "data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2296%22%20height%3D%2296%22%3E%3Crect%20width%3D%2296%22%20height%3D%2296%22%20rx%3D%2216%22%20fill%3D%22%23c0392b%22/%3E%3Ctext%20x%3D%2248%22%20y%3D%2258%22%20font-family%3D%22Arial%2Csans-serif%22%20font-size%3D%2232%22%20font-weight%3D%22700%22%20fill%3D%22white%22%20text-anchor%3D%22middle%22%3ELP%3C/text%3E%3C/svg%3E",
    description: "Two-colour labels, 93 labels/min",
    price: 159,
    salePrice: 139,
    guid: "fde0d04a-c1a3-531c-a4e0-7d2e3b7e76b6",
    currency: "USD",
  },
];

const currencyOptions = [
  {
    value: "USD",
    label: "USD",
  },
  {
    value: "EUR",
    label: "EUR",
  },
  {
    value: "GBP",
    label: "GBP",
  },
];

export { mockedItems, currencyOptions };

export type { MockedItem, MockedQuery };
