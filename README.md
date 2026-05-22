# Arco Studio — Demo E-commerce

Static e-commerce demo store. 10 prodotti, full funnel GA4-ready.

## Struttura

```
arco-store/
├── index.html          # Homepage con hero + featured products
├── plp.html            # Product Listing (filter per categoria, ?cat=)
├── pdp.html            # Product Detail (?id=1-10)
├── cart.html           # Cart (localStorage)
├── checkout.html       # Checkout form
├── thankyou.html       # Order confirmation
├── css/
│   └── style.css
└── js/
    ├── products.js     # Catalogo 10 prodotti
    └── cart.js         # Cart management + dataLayer
```

## GTM / GA4

Ogni pagina ha i placeholder per lo snippet GTM (cerca `TODO: GTM`).

### DataLayer events implementati

| Event | Dove |
|-------|------|
| `view_item_list` | Homepage (featured), PLP |
| `select_item` | Click su card prodotto |
| `view_item` | PDP |
| `add_to_cart` | PDP → Add to Cart |
| `remove_from_cart` | Cart → Remove |
| `view_cart` | Cart page |
| `begin_checkout` | Cart → Proceed to Checkout |
| `add_shipping_info` | Checkout → cambio metodo spedizione |
| `purchase` | Checkout → Place Order + TYP |

Tutti i push seguono GA4 ecommerce schema (items array con `item_id`, `item_name`, `item_category`, `price`, `quantity`).

## Deploy su Vercel

1. Push questa cartella nella root della repository GitHub
2. Collega la repo a Vercel (Import Project)
3. Framework: **Other** (nessun build step)
4. Output directory: lascia vuoto (root)
5. Deploy ✓

## Nota purchase double-push

`checkout.html` fa il push `purchase` prima del redirect.
`thankyou.html` fa un push di backup guardato da `sessionStorage`.
In GTM, configura il trigger purchase con condizione `sessionStorage key 'purchase_dl_fired'` 
oppure usa la deduplicazione nativa GA4 via `transaction_id`.
